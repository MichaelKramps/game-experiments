// Mancala (the common 6-pit, 4-seed rules): the rules and the computer player, with no DOM, so
// tools/check-engine.js can run it under node. See DESIGN.md.
//
// The board is 14 slots, sown counter-clockwise in index order:
//   0–5   your pits, left to right (B2:G2 on the sheet)
//   6     your store (H1, on the right)
//   7–12  the computer's pits, right to left (G1 back to B1)
//   13    the computer's store (A1, on the left)
// Pit i faces pit 12 − i.

const Mancala = (() => {
  const YOU = 1;
  const CPU = 2;
  const PITS = 6;
  const SEEDS = { min: 1, max: 10, standard: 4 };

  const LEVELS = {
    easy: { name: 'Easy' },
    medium: { name: 'Medium', depth: 4 },
    hard: { name: 'Hard', depth: 6 },
  };

  const store = (p) => (p === YOU ? 6 : 13);
  const pitsOf = (p) => (p === YOU ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]);
  const owner = (i) => (i < 6 ? YOU : i > 6 && i < 13 ? CPU : 0);
  const opposite = (i) => 12 - i;

  function newGame(seeds = SEEDS.standard, first = YOU) {
    const pits = Array(14).fill(seeds);
    pits[6] = 0;
    pits[13] = 0;
    return { pits, seeds, first, turn: first, moves: [], result: null };
  }

  const legal = (g) => (g.result ? [] : pitsOf(g.turn).filter((i) => g.pits[i] > 0));

  // Sow pit i for player p, changing pits. Returns what happened:
  //   path: each slot a seed went into, in order
  //   extra: the last seed landed in p's store, so p goes again
  //   capture: { pit, opp, n } seeds taken from the pit across (n includes the last seed)
  //   sweep: [yours, computer's] seeds swept into the stores when a side ran out
  //   over: the game ended
  function sow(pits, i, p, withPath = true) {
    const skip = store(3 - p);
    let n = pits[i];
    pits[i] = 0;
    const path = withPath ? [] : null;
    let at = i;
    while (n > 0) {
      at = (at + 1) % 14;
      if (at === skip) continue;
      pits[at]++;
      n--;
      if (path) path.push(at);
    }
    let capture = null;
    if (owner(at) === p && pits[at] === 1 && pits[opposite(at)] > 0) {
      const opp = opposite(at);
      capture = { pit: at, opp, n: pits[opp] + 1 };
      pits[store(p)] += capture.n;
      pits[at] = 0;
      pits[opp] = 0;
    }
    const extra = at === store(p);
    let sweep = null;
    const empty = (q) => pitsOf(q).every((k) => pits[k] === 0);
    if (empty(YOU) || empty(CPU)) {
      sweep = [0, 0];
      for (const q of [YOU, CPU]) {
        for (const k of pitsOf(q)) {
          sweep[q - 1] += pits[k];
          pits[store(q)] += pits[k];
          pits[k] = 0;
        }
      }
    }
    return { pit: i, seeds: path ? path.length : 0, path, last: at, extra, capture, sweep, over: !!sweep };
  }

  // Play pit i for the player whose turn it is. Returns the sow record, or null.
  function play(g, i) {
    if (g.result || owner(i) !== g.turn || !g.pits[i]) return null;
    const p = g.turn;
    const rec = sow(g.pits, i, p);
    rec.player = p;
    g.moves.push(i);
    if (rec.over) {
      const a = g.pits[6];
      const b = g.pits[13];
      g.result = a > b ? YOU : b > a ? CPU : 'draw';
    } else if (!rec.extra) g.turn = 3 - p;
    return rec;
  }

  // Rebuild a game from its settings and moves. Returns null if a move is illegal.
  function replay(seeds, first, moves) {
    const g = newGame(seeds, first);
    for (const i of moves) if (!play(g, i)) return null;
    return g;
  }

  // Each move's sow record, for the Moves log.
  function history(seeds, first, moves) {
    const g = newGame(seeds, first);
    return moves.map((i) => play(g, i));
  }

  // ---------------------------------------------------------------------------
  // The computer: minimax with alpha-beta on the store difference. An extra
  // turn keeps the same player, so the search follows it.

  function search(pits, p, me, depth, alpha, beta) {
    const over = pitsOf(YOU).every((k) => !pits[k]) || pitsOf(CPU).every((k) => !pits[k]);
    if (over || depth === 0) {
      let v = pits[store(me)] - pits[store(3 - me)];
      if (over) v *= 100; // a finished game outweighs any position
      return v;
    }
    const maxing = p === me;
    let best = maxing ? -Infinity : Infinity;
    // try extra-turn moves first: they're often best, so pruning works sooner
    const order = pitsOf(p)
      .filter((k) => pits[k])
      .sort((a, b) => (pits[b] === store(p) - b ? 1 : 0) - (pits[a] === store(p) - a ? 1 : 0));
    for (const k of order) {
      const next = pits.slice();
      const r = sow(next, k, p, false);
      const v = search(next, r.extra && !r.over ? p : 3 - p, me, depth - 1, alpha, beta);
      if (maxing) {
        if (v > best) best = v;
        if (v > alpha) alpha = v;
      } else {
        if (v < best) best = v;
        if (v < beta) beta = v;
      }
      if (alpha >= beta) break;
    }
    return best;
  }

  function scores(g, depth) {
    const out = new Map();
    for (const k of legal(g)) {
      const next = g.pits.slice();
      const r = sow(next, k, g.turn, false);
      out.set(k, search(next, r.extra && !r.over ? g.turn : 3 - g.turn, g.turn, depth - 1, -Infinity, Infinity));
    }
    return out;
  }

  // The computer's pit. Easy usually takes an extra turn or a capture when
  // one is there, and otherwise plays a random pit. Medium and Hard search
  // 4 and 6 moves ahead and pick randomly among the best.
  function aiMove(g, level = 'medium', rand = Math.random) {
    const moves = legal(g);
    if (!moves.length) return -1;
    if (level === 'easy') {
      if (rand() < 0.6) {
        const good = moves.filter((k) => {
          const r = sow(g.pits.slice(), k, g.turn, false);
          return r.extra || r.capture;
        });
        if (good.length) return good[Math.floor(rand() * good.length)];
      }
      return moves[Math.floor(rand() * moves.length)];
    }
    const s = scores(g, LEVELS[level]?.depth || LEVELS.medium.depth);
    const top = Math.max(...s.values());
    const best = [...s].filter(([, v]) => v === top).map(([k]) => k);
    return best[Math.floor(rand() * best.length)];
  }

  // A saved game: rebuild it from its moves and check it matches.
  function valid(s) {
    if (!s || typeof s !== 'object') return false;
    if (!Number.isInteger(s.seeds) || s.seeds < SEEDS.min || s.seeds > SEEDS.max) return false;
    if (s.first !== YOU && s.first !== CPU) return false;
    if (!(s.level in LEVELS)) return false;
    if (!Array.isArray(s.moves) || !s.moves.every((k) => Number.isInteger(k) && owner(k))) return false;
    const g = replay(s.seeds, s.first, s.moves);
    return !!g && g.pits.every((v, k) => v === s.pits?.[k]) && g.result === s.result && g.turn === s.turn;
  }

  return { YOU, CPU, PITS, SEEDS, LEVELS, store, pitsOf, owner, opposite, newGame, legal, sow, play, replay, history, scores, aiMove, valid };
})();

if (typeof module !== 'undefined') module.exports = Mancala;
