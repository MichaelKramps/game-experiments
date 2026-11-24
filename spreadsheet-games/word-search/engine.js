// Word Search's puzzle maker, with no DOM so tools/check-engine.js can run it
// under node. A puzzle is an n×n grid of letters (a string, row by row) and
// 12 words, each with the cells it sits in. See DESIGN.md.

const WordSearch = (() => {
  const WORDS = 12;
  // Every level runs words in all 8 directions; levels differ by grid size.
  const ALL_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  const LEVELS = {
    easy: { name: 'Easy', n: 10, dirs: ALL_DIRS },
    medium: { name: 'Medium', n: 12, dirs: ALL_DIRS },
    hard: { name: 'Hard', n: 15, dirs: ALL_DIRS },
  };

  // Filler letters, weighted by how often they show up in English.
  const FREQ = 'EEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOOIIIIIIINNNNNNNSSSSSSRRRRRRHHHHHLLLLDDDDCCCUUUMMMFFPPGGWWYYBVKXJQZ';

  // Words the filler letters must never spell (ROT13 so the source reads clean).
  const rot13 = (s) => s.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 52) % 26) + 65));
  const BLOCK = 'SHPX FUVG PHAG PBPX QVPX GJNG CVFF FYHG JUBER SNT AVTTRE AVTTN ENCR OVGPU CHFFL CRAVF OBBO GVGF XVXR FCVP PUVAX QLXR PHZ WVMM NANY CBEA ANMV XXX'.split(' ').map(rot13);

  const letters = (word) => word.toUpperCase().replace(/[^A-Z]/g, '');
  const reverse = (s) => [...s].reverse().join('');

  function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 12 words from a theme that fit the grid. None may sit inside another one,
  // forwards or backwards (PEN in PENCIL would be found twice), and no
  // palindromes (they'd match both ways).
  function pickWords(theme, n, rand) {
    const out = [];
    for (const word of shuffle(theme.words, rand)) {
      const w = letters(word);
      if (w.length < 3 || w.length > n || w === reverse(w)) continue;
      const clash = out.some((o) => {
        const ow = letters(o);
        return ow.includes(w) || w.includes(ow) || ow.includes(reverse(w)) || w.includes(reverse(ow));
      });
      if (clash) continue;
      out.push(word);
      if (out.length === WORDS) break;
    }
    return out.length === WORDS ? out : null;
  }

  // Every straight run of cells through the grid, in all 8 directions, as
  // [string, cells] — used to check what the finished grid spells.
  function* runs(grid, n, len) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        for (const [dx, dy] of ALL_DIRS) {
          const ex = x + dx * (len - 1);
          const ey = y + dy * (len - 1);
          if (ex < 0 || ey < 0 || ex >= n || ey >= n) continue;
          let s = '';
          const cells = [];
          for (let k = 0; k < len; k++) {
            const i = (y + dy * k) * n + (x + dx * k);
            s += grid[i];
            cells.push(i);
          }
          yield [s, cells];
        }
      }
    }
  }

  function count(grid, n, w) {
    let c = 0;
    for (const [s] of runs(grid, n, w.length)) if (s === w) c++;
    return c;
  }

  // Lay the words in the grid, longest first. Words cross wherever their
  // letters match, as often as they can: most of the time a word goes where
  // it crosses at least one word already down (more crossings, more likely).
  // Words never run along each other on the same line (that reads as one
  // long word). Returns the placed words or null.
  const CROSS = 0.8; // chance a word is put on a crossing when one exists

  function place(words, n, dirs, rand) {
    const cells = Array(n * n).fill('');
    const lineOf = Array(n * n).fill(null); // cell → directions of words through it
    const placed = [];
    const order = words.slice().sort((a, b) => letters(b).length - letters(a).length);
    for (const word of order) {
      const w = letters(word);
      const all = [];
      const crossing = [];
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          for (const [dx, dy] of dirs) {
            const ex = x + dx * (w.length - 1);
            const ey = y + dy * (w.length - 1);
            if (ex < 0 || ey < 0 || ex >= n || ey >= n) continue;
            const at = [];
            let hits = 0;
            let ok = true;
            for (let k = 0; k < w.length && ok; k++) {
              const i = (y + dy * k) * n + (x + dx * k);
              if (cells[i]) {
                if (cells[i] !== w[k]) ok = false;
                else if (lineOf[i].some(([ldx, ldy]) => (ldx === dx && ldy === dy) || (ldx === -dx && ldy === -dy))) ok = false;
                else hits++;
              }
              at.push(i);
            }
            if (!ok) continue;
            const spot = { at, hits, dir: [dx, dy] };
            all.push(spot);
            if (hits) crossing.push(spot);
          }
        }
      }
      if (!all.length) return null;
      let spot;
      if (crossing.length && rand() < CROSS) {
        // weighted by crossings: a spot crossing 2 words is twice as likely
        const total = crossing.reduce((t, c) => t + c.hits, 0);
        let r = rand() * total;
        spot = crossing.find((c) => (r -= c.hits) < 0) || crossing[crossing.length - 1];
      } else {
        spot = all[Math.floor(rand() * all.length)];
      }
      spot.at.forEach((i, k) => {
        cells[i] = w[k];
        (lineOf[i] ||= []).push(spot.dir);
      });
      placed.push({ word, cells: spot.at });
    }
    return { cells, placed };
  }

  // Fill the empty cells. Half the filler letters come from the puzzle's own
  // words, so there are near misses to trip over.
  function fill(cells, words, rand) {
    const pool = words.map(letters).join('');
    return cells
      .map((c) => {
        if (c) return c;
        const from = rand() < 0.5 ? pool : FREQ;
        return from[Math.floor(rand() * from.length)];
      })
      .join('');
  }

  // The grid is good when each word is in it exactly once and nothing on the
  // block list shows up outside a single placed word.
  function good(grid, n, placed) {
    for (const p of placed) if (count(grid, n, letters(p.word)) !== 1) return false;
    for (const bad of BLOCK) {
      for (const [s, cells] of runs(grid, n, bad.length)) {
        if (s !== bad && s !== reverse(bad)) continue;
        const inside = placed.some((p) => cells.every((i) => p.cells.includes(i)));
        if (!inside) return false;
      }
    }
    return true;
  }

  // A new puzzle. `avoid` is a theme name not to pick (the last one played).
  function generate(level, themes, { rand = Math.random, avoid = null } = {}) {
    const L = LEVELS[level];
    const pickFrom = themes.filter((t) => t.name !== avoid);
    for (let tries = 0; tries < 200; tries++) {
      const theme = pickFrom[Math.floor(rand() * pickFrom.length)];
      const words = pickWords(theme, L.n, rand);
      if (!words) continue;
      const laid = place(words, L.n, L.dirs, rand);
      if (!laid) continue;
      for (let f = 0; f < 30; f++) {
        const grid = fill(laid.cells, words, rand);
        if (!good(grid, L.n, laid.placed)) continue;
        // The list is shown in alphabetical order, like a sorted column.
        const list = laid.placed.slice().sort((a, b) => a.word.localeCompare(b.word)).map((p) => ({ word: p.word, cells: p.cells, found: false }));
        return { level, theme: theme.name, n: L.n, grid, words: list };
      }
    }
    throw new Error('word search: could not make a puzzle');
  }

  // The cells from a to b (indexes) if they're in a straight line across,
  // down or diagonal, else null.
  function line(n, a, b) {
    const ax = a % n;
    const ay = Math.floor(a / n);
    const bx = b % n;
    const by = Math.floor(b / n);
    const dx = bx - ax;
    const dy = by - ay;
    if (dx && dy && Math.abs(dx) !== Math.abs(dy)) return null;
    const len = Math.max(Math.abs(dx), Math.abs(dy));
    const sx = Math.sign(dx);
    const sy = Math.sign(dy);
    const out = [];
    for (let k = 0; k <= len; k++) out.push((ay + sy * k) * n + (ax + sx * k));
    return out;
  }

  // The word (index in g.words) that runs from a to b, either way, if any.
  function match(g, a, b) {
    return g.words.findIndex((w) => {
      const first = w.cells[0];
      const last = w.cells[w.cells.length - 1];
      return (first === a && last === b) || (first === b && last === a);
    });
  }

  // A saved game is usable if its shape is right.
  function valid(g) {
    const L = g && LEVELS[g.level];
    if (!L || g.n !== L.n || typeof g.grid !== 'string' || g.grid.length !== L.n * L.n || !/^[A-Z]+$/.test(g.grid)) return false;
    if (!Array.isArray(g.words) || g.words.length !== WORDS) return false;
    return g.words.every((w) => typeof w.word === 'string' && Array.isArray(w.cells) && w.cells.length === letters(w.word).length && w.cells.every((i, k) => Number.isInteger(i) && g.grid[i] === letters(w.word)[k]));
  }

  return { WORDS, LEVELS, BLOCK, letters, generate, line, match, valid, count, pickWords };
})();

if (typeof module !== 'undefined') module.exports = WordSearch;
