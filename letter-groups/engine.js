// Letter Groups — puzzle engine: seeds, board generation, word checks and the
// fewest-words solver used by hints. No DOM access, so it also runs in Node
// (see tools/check-engine.js).

const LetterGroups = (() => {
  const VOWELS = 'aeiou';
  const RARE = 'jqxz';
  const MIN_WORD = 3;

  // -------------------------------------------------------------------------
  // Seeds: 5-character Crockford base32 codes (no I, L, O or U).

  const SEED_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const SEED_LEN = 5;
  const SEED_SPACE = 32 ** SEED_LEN;

  function seedToCode(seed) {
    let code = '';
    for (let i = 0; i < SEED_LEN; i++) {
      code = SEED_ALPHABET[seed % 32] + code;
      seed = Math.floor(seed / 32);
    }
    return code;
  }

  // Returns the seed number, or null if the code isn't valid. Crockford's
  // look-alikes are accepted: O reads as 0, I and L as 1.
  function codeToSeed(code) {
    const clean = code.trim().toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
    if (clean.length !== SEED_LEN) return null;
    let seed = 0;
    for (const ch of clean) {
      const v = SEED_ALPHABET.indexOf(ch);
      if (v < 0) return null;
      seed = seed * 32 + v;
    }
    return seed;
  }

  function randomSeed() {
    return Math.floor(Math.random() * SEED_SPACE);
  }

  // -------------------------------------------------------------------------
  // Deterministic RNG (mulberry32)

  function makeRng(seed) {
    let a = (Math.imul(seed ^ 0x5bd1e995, 2654435761) >>> 0) || 1;
    const next = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = (n) => Math.floor(next() * n);
    const pick = (arr) => arr[int(arr.length)];
    const shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    return { next, int, pick, shuffle };
  }

  // -------------------------------------------------------------------------
  // Word index

  const code = (ch) => ch.charCodeAt(0) - 97;

  function popcount(m) {
    m -= (m >>> 1) & 0x55555555;
    m = (m & 0x33333333) + ((m >>> 2) & 0x33333333);
    return (((m + (m >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
  }

  function entry(w, answer) {
    let mask = 0;
    for (const ch of w) mask |= 1 << code(ch);
    return { w, mask, first: code(w[0]), last: code(w[w.length - 1]), distinct: popcount(mask), answer };
  }

  const answers = ANSWER_WORDS.map((w) => entry(w, true));
  const all = answers.concat(EXTRA_VALID_WORDS.map((w) => entry(w, false)));
  const validSet = new Set(all.map((e) => e.w));

  // -------------------------------------------------------------------------
  // Boards

  const SIZE_PRESETS = {
    S: { name: 'small', min: 8, max: 10 },
    M: { name: 'standard', min: 11, max: 13 },
    L: { name: 'large', min: 14, max: 16 },
  };

  function sizeName(n) {
    for (const p of Object.values(SIZE_PRESETS)) if (n >= p.min && n <= p.max) return p.name;
    return '';
  }

  // The group-size profile is the first thing drawn from a seed's RNG and is
  // never re-drawn, so a seed's board size is known without generating it.
  function drawProfile(rng) {
    return [0, 1, 2, 3].map(() => 2 + rng.int(3));
  }

  function letterCountForSeed(seed) {
    return drawProfile(makeRng(seed)).reduce((a, b) => a + b, 0);
  }

  // Seed words: 2 answer words (3 for 14+ letters) that together use exactly
  // n distinct letters. They become the reference answer.
  function pickSeedWords(rng, n) {
    const count = n >= 14 ? 3 : 2;
    for (let tries = 0; tries < 20; tries++) {
      const w1 = rng.pick(answers);
      if (w1.distinct > n - (count === 3 ? 4 : 2)) continue;
      let base = [w1];
      if (count === 3) {
        let w2 = null;
        for (let t = 0; t < 40 && !w2; t++) {
          const e = rng.pick(answers);
          const u = popcount(w1.mask | e.mask);
          if (u > w1.distinct && u <= n - 2) w2 = e;
        }
        if (!w2) continue;
        base = [w1, w2];
      }
      const m = base.reduce((acc, e) => acc | e.mask, 0);
      const options = answers.filter((e) => popcount(m | e.mask) === n);
      if (options.length) return [...base, rng.pick(options)];
    }
    return null;
  }

  // Put the seed words' letters into groups of the given sizes so that no two
  // consecutive letters of a seed word share a group, and no group holds more
  // than half the vowels. Small backtracking search.
  function assignGroups(rng, seedWords, sizes) {
    const letters = [];
    const adj = {};
    for (const { w } of seedWords) {
      for (let i = 0; i < w.length; i++) {
        if (!adj[w[i]]) {
          adj[w[i]] = new Set();
          letters.push(w[i]);
        }
        if (i > 0) {
          adj[w[i]].add(w[i - 1]);
          adj[w[i - 1]].add(w[i]);
        }
      }
    }
    const vowelCount = letters.filter((ch) => VOWELS.includes(ch)).length;
    const vowelCap = Math.floor(vowelCount / 2);
    rng.shuffle(letters);
    letters.sort((a, b) => adj[b].size - adj[a].size);

    const groups = sizes.map(() => []);
    const vowelsIn = sizes.map(() => 0);
    const order = rng.shuffle([0, 1, 2, 3]);

    function place(i) {
      if (i === letters.length) return true;
      const ch = letters[i];
      const isVowel = VOWELS.includes(ch);
      for (const g of order) {
        if (groups[g].length >= sizes[g]) continue;
        if (isVowel && vowelsIn[g] >= vowelCap) continue;
        if (groups[g].some((other) => adj[ch].has(other))) continue;
        groups[g].push(ch);
        if (isVowel) vowelsIn[g]++;
        if (place(i + 1)) return true;
        groups[g].pop();
        if (isVowel) vowelsIn[g]--;
      }
      return false;
    }

    return place(0) ? groups : null;
  }

  function letterRulesOk(letters) {
    const vowels = letters.filter((ch) => VOWELS.includes(ch)).length;
    const rare = letters.filter((ch) => RARE.includes(ch)).length;
    return vowels * 4 >= letters.length && rare <= 1;
  }

  // Board-local letter indexes: bit i of a board mask is board.letters[i].
  function makeBoard(groups) {
    const letters = groups.flat();
    const groupOf = new Int8Array(26).fill(-1);
    const index = new Int8Array(26).fill(-1);
    groups.forEach((g, gi) => g.forEach((ch) => (groupOf[code(ch)] = gi)));
    letters.forEach((ch, i) => (index[code(ch)] = i));
    let mask26 = 0;
    for (const ch of letters) mask26 |= 1 << code(ch);
    return { groups, letters, n: letters.length, full: (1 << letters.length) - 1, groupOf, index, mask26 };
  }

  // Can this word be played on the board? Returns its board mask, or -1.
  function boardMask(board, e) {
    if (e.mask & ~board.mask26) return -1;
    const w = e.w;
    let m = 0;
    let prevGroup = -1;
    for (let i = 0; i < w.length; i++) {
      const c = code(w[i]);
      const g = board.groupOf[c];
      if (g === prevGroup) return -1;
      prevGroup = g;
      m |= 1 << board.index[c];
    }
    return m;
  }

  function playableWords(board) {
    const out = [];
    for (const e of all) {
      const m = boardMask(board, e);
      if (m >= 0) out.push({ e, m, first: board.index[e.first], last: board.index[e.last] });
    }
    return out;
  }

  const MAX_TRIES = 400;

  // Build the board for a seed. Deterministic: same seed (and word lists),
  // same board.
  function generate(seed) {
    const rng = makeRng(seed);
    const sizes = drawProfile(rng);
    const n = sizes.reduce((a, b) => a + b, 0);
    for (let tries = 0; tries < MAX_TRIES; tries++) {
      const seedWords = pickSeedWords(rng, n);
      if (!seedWords) continue;
      const letterSet = [...new Set(seedWords.map((e) => e.w).join(''))];
      if (!letterRulesOk(letterSet)) continue;
      const groups = assignGroups(rng, seedWords, sizes);
      if (!groups) continue;
      for (const g of groups) rng.shuffle(g);
      rng.shuffle(groups);
      const board = makeBoard(groups);
      board.playable = playableWords(board);
      if (board.playable.some((p) => p.m === board.full)) continue; // one word solves it
      board.seed = seed;
      board.code = seedToCode(seed);
      board.reference = seedWords.map((e) => e.w);
      return board;
    }
    return null;
  }

  // Draw random seeds until one builds a board with a letter count in range.
  function generateInRange(min, max) {
    for (;;) {
      const seed = randomSeed();
      const n = letterCountForSeed(seed);
      if (n < min || n > max) continue;
      const board = generate(seed);
      if (board) return board;
    }
  }

  // -------------------------------------------------------------------------
  // Player words

  // Checks a submitted word. Typing already blocks off-board letters and
  // same-group hops; this only reports what's left.
  function checkWord(board, word) {
    if (word.length < MIN_WORD) return { ok: false, reason: 'short' };
    if (!validSet.has(word)) return { ok: false, reason: 'unknown' };
    const m = boardMask(board, entry(word, false));
    if (m < 0) return { ok: false, reason: 'unknown' };
    return { ok: true, mask: m };
  }

  // -------------------------------------------------------------------------
  // Solver: fewest words that cover every uncovered letter. Word order doesn't
  // matter, so this is a small set-cover search over covered-letter masks.
  //
  // Words are collapsed to distinct letter masks, keeping the most familiar
  // spelling of each. finish[need] holds a mask that covers `need` (filled by
  // a superset-sum pass), so the last word is an O(1) lookup. Only maximal
  // masks (not contained in another word's) are expanded, since swapping a
  // word for one that covers more never costs a word.

  function buildSolver(board, answersOnly) {
    const size = 1 << board.n;
    const word = new Array(size);
    for (const p of board.playable) {
      if (answersOnly && !p.e.answer) continue;
      if (!word[p.m] || better(p.e, word[p.m])) word[p.m] = p.e;
    }
    const finish = new Int32Array(size).fill(-1);
    for (let m = 0; m < size; m++) if (word[m]) finish[m] = m;
    for (let b = 0; b < board.n; b++) {
      const bit = 1 << b;
      for (let m = 0; m < size; m++) {
        if (m & bit || finish[m | bit] < 0) continue;
        if (finish[m] < 0 || better(word[finish[m | bit]], word[finish[m]])) finish[m] = finish[m | bit];
      }
    }
    const maximal = [];
    for (let m = 0; m < size; m++) {
      if (!word[m]) continue;
      let covered = false;
      for (let b = 0; b < board.n && !covered; b++) {
        const bit = 1 << b;
        if (!(m & bit) && finish[m | bit] >= 0) covered = true;
      }
      if (!covered) maximal.push(m);
    }
    return { word, finish, maximal };
  }

  // Familiar words first, then shorter ones.
  function better(a, b) {
    if (a.answer !== b.answer) return a.answer;
    return a.w.length < b.w.length;
  }

  // Returns the words (empty when already covered), or null if none is found
  // within maxWords.
  function solveWith(board, solver, covered, maxWords) {
    const full = board.full;
    if ((covered & full) === full) return [];
    const { word, finish, maximal } = solver;
    const parent = new Int32Array(1 << board.n).fill(-2); // -2 = unvisited
    const via = new Int32Array(1 << board.n);
    parent[covered] = -1;
    const path = (s, lastMask) => {
      const words = [word[lastMask].w];
      for (; parent[s] >= 0; s = parent[s]) words.unshift(word[via[s]].w);
      return words;
    };

    let frontier = [covered];
    for (let depth = 1; depth <= maxWords && frontier.length; depth++) {
      for (const s of frontier) {
        const f = finish[full & ~s];
        if (f >= 0) return path(s, f);
      }
      if (depth === maxWords) break;
      const next = [];
      for (const s of frontier) {
        for (const m of maximal) {
          const t = s | m;
          if (t === s || parent[t] !== -2) continue;
          parent[t] = s;
          via[t] = m;
          next.push(t);
        }
      }
      frontier = next;
    }
    return null;
  }

  const MAX_HINT_WORDS = 8;

  // Fewest words from here, preferring answer-list words when an all-familiar
  // set is just as short. Words come back longest-first, the most useful one
  // to suggest next.
  function solve(board, covered) {
    board.solvers ||= { all: buildSolver(board, false), answers: buildSolver(board, true) };
    let best = solveWith(board, board.solvers.all, covered, MAX_HINT_WORDS);
    if (best && best.length > 1) {
      best = solveWith(board, board.solvers.answers, covered, best.length) || best;
    }
    return best && best.sort((a, b) => b.length - a.length);
  }

  return {
    SEED_LEN,
    SEED_ALPHABET,
    SIZE_PRESETS,
    MIN_WORD,
    seedToCode,
    codeToSeed,
    randomSeed,
    letterCountForSeed,
    sizeName,
    generate,
    generateInRange,
    checkWord,
    solve,
  };
})();

if (typeof module !== 'undefined') module.exports = LetterGroups;
