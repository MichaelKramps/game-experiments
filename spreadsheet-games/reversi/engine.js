// Reversi: the rules and the computer player, with no DOM, so
// tools/check-engine.js can run it under node. See DESIGN.md.
//
// The board is 64 cells, index y*8+x (A1 is 0, H8 is 63). You are X (1) and
// the computer is O (2). Whoever goes first starts on D5 and E4, the other
// on D4 and E5. A move must flip at least one piece; a player with no move
// passes, and the game ends when neither can move.

const Reversi = (() => {
  const N = 8;
  const YOU = 1;
  const CPU = 2;

  const LEVELS = {
    easy: { name: 'Easy' },
    medium: { name: 'Medium', depth: 2 },
    hard: { name: 'Hard', depth: 4, solve: 8 },
  };

  const DIRS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

  function newGame(first = YOU) {
    const board = Array(N * N).fill(0);
    const other = 3 - first;
    board[3 * N + 3] = other; // D4
    board[4 * N + 4] = other; // E5
    board[4 * N + 3] = first; // D5
    board[3 * N + 4] = first; // E4
    return { board, first, turn: first, moves: [], result: null };
  }

  // The pieces a move at i by p would flip, nearest first along each line.
  function flips(board, i, p) {
    if (board[i]) return [];
    const x0 = i % N;
    const y0 = (i - x0) / N;
    const out = [];
    for (const [dx, dy] of DIRS) {
      const line = [];
      let x = x0 + dx;
      let y = y0 + dy;
      while (x >= 0 && x < N && y >= 0 && y < N && board[y * N + x] === 3 - p) {
        line.push(y * N + x);
        x += dx;
        y += dy;
      }
      if (line.length && x >= 0 && x < N && y >= 0 && y < N && board[y * N + x] === p) out.push(...line);
    }
    return out;
  }

  function movesFor(board, p) {
    const out = [];
    for (let i = 0; i < N * N; i++) if (!board[i] && flips(board, i, p).length) out.push(i);
    return out;
  }

  const legal = (g) => (g.result ? [] : movesFor(g.board, g.turn));
  const counts = (board) => {
    let x = 0;
    let o = 0;
    for (const v of board) if (v === YOU) x++;
    else if (v === CPU) o++;
    return { [YOU]: x, [CPU]: o };
  };

  // Play cell i for whoever's turn it is. Returns a record, or null:
  //   cell, player, flips (nearest first by distance), passed (the other
  //   player has no move, so this player goes again), over.
  function play(g, i) {
    if (g.result || !Number.isInteger(i) || i < 0 || i >= N * N) return null;
    const p = g.turn;
    const f = flips(g.board, i, p);
    if (!f.length) return null;
    g.board[i] = p;
    for (const k of f) g.board[k] = p;
    g.moves.push(i);
    const dist = (k) => Math.max(Math.abs((k % N) - (i % N)), Math.abs(Math.floor(k / N) - Math.floor(i / N)));
    const rec = { cell: i, player: p, flips: f.slice().sort((a, b) => dist(a) - dist(b)), passed: false, over: false };
    if (movesFor(g.board, 3 - p).length) g.turn = 3 - p;
    else if (movesFor(g.board, p).length) rec.passed = true;
    else {
      rec.over = true;
      const c = counts(g.board);
      g.result = c[YOU] > c[CPU] ? YOU : c[CPU] > c[YOU] ? CPU : 'draw';
    }
    return rec;
  }

  // Rebuild a game from who went first and its moves. Null if one is illegal.
  function replay(first, moves) {
    const g = newGame(first);
    for (const i of moves) if (!play(g, i)) return null;
    return g;
  }

  // Each move's record, for the Moves log.
  function history(first, moves) {
    const g = newGame(first);
    return moves.map((i) => play(g, i));
  }

  // ---------------------------------------------------------------------------
  // The computer: negamax with alpha-beta. A position is scored by square
  // weights (corners good, the squares next to an empty corner bad) and by
  // how many moves each side has. Hard plays the last 8 empty squares out
  // exactly, by final piece count.

  const WEIGHTS = [
    100, -20, 10, 5, 5, 10, -20, 100,
    -20, -50, -2, -2, -2, -2, -50, -20,
    10, -2, 1, 1, 1, 1, -2, 10,
    5, -2, 1, 0, 0, 1, -2, 5,
    5, -2, 1, 0, 0, 1, -2, 5,
    10, -2, 1, 1, 1, 1, -2, 10,
    -20, -50, -2, -2, -2, -2, -50, -20,
    100, -20, 10, 5, 5, 10, -20, 100,
  ];
  const CORNERS = [0, 7, 56, 63];
  // Squares next to each corner: their weight only counts while the corner is empty.
  const NEAR = { 0: [1, 8, 9], 7: [6, 14, 15], 56: [48, 49, 57], 63: [54, 55, 62] };

  function evaluate(board, p) {
    let s = 0;
    for (let i = 0; i < N * N; i++) {
      if (board[i] === p) s += WEIGHTS[i];
      else if (board[i]) s -= WEIGHTS[i];
    }
    for (const c of CORNERS) {
      if (!board[c]) continue;
      for (const k of NEAR[c]) {
        if (board[k] === p) s -= WEIGHTS[k];
        else if (board[k]) s += WEIGHTS[k];
      }
    }
    const mine = movesFor(board, p).length;
    const theirs = movesFor(board, 3 - p).length;
    s += 5 * (mine - theirs);
    return s;
  }

  const final = (board, p) => {
    const c = counts(board);
    return 10000 * Math.sign(c[p] - c[3 - p]) + (c[p] - c[3 - p]);
  };

  function apply(board, i, p) {
    const next = board.slice();
    next[i] = p;
    for (const k of flips(board, i, p)) next[k] = p;
    return next;
  }

  // Try likely-good moves first so alpha-beta cuts sooner.
  const ordered = (moves) => moves.slice().sort((a, b) => WEIGHTS[b] - WEIGHTS[a]);

  function negamax(board, p, depth, alpha, beta, exact) {
    const moves = movesFor(board, p);
    if (!moves.length) {
      if (!movesFor(board, 3 - p).length) return final(board, p);
      return -negamax(board, 3 - p, depth, -beta, -alpha, exact); // pass
    }
    if (depth === 0 && !exact) return evaluate(board, p);
    let best = -Infinity;
    for (const i of ordered(moves)) {
      const v = -negamax(apply(board, i, p), 3 - p, depth - 1, -beta, -alpha, exact);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  function scores(g, depth, exact = false) {
    const out = new Map();
    for (const i of legal(g)) {
      const next = apply(g.board, i, g.turn);
      out.set(i, -negamax(next, 3 - g.turn, depth - 1, -Infinity, Infinity, exact));
    }
    return out;
  }

  // The computer's cell. Easy takes a corner when it can and otherwise plays
  // at random. Medium and Hard search 3 and 5 moves ahead (Hard plays the
  // end out exactly) and pick randomly among the best.
  function aiMove(g, level = 'medium', rand = Math.random) {
    const moves = legal(g);
    if (!moves.length) return -1;
    if (level === 'easy') {
      const corners = moves.filter((i) => CORNERS.includes(i));
      if (corners.length) return corners[Math.floor(rand() * corners.length)];
      return moves[Math.floor(rand() * moves.length)];
    }
    const lv = LEVELS[level] || LEVELS.medium;
    const empty = g.board.filter((v) => !v).length;
    const s = lv.solve && empty <= lv.solve ? scores(g, 64, true) : scores(g, lv.depth);
    const top = Math.max(...s.values());
    const best = [...s].filter(([, v]) => v === top).map(([i]) => i);
    return best[Math.floor(rand() * best.length)];
  }

  // A saved game: rebuild it from its moves and check it matches.
  function valid(s) {
    if (!s || typeof s !== 'object') return false;
    if (s.first !== YOU && s.first !== CPU) return false;
    if (!(s.level in LEVELS)) return false;
    if (!Array.isArray(s.moves) || s.moves.length > N * N) return false;
    const g = replay(s.first, s.moves);
    return !!g && g.board.every((v, i) => v === s.board?.[i]) && g.result === s.result && g.turn === s.turn;
  }

  return { N, YOU, CPU, LEVELS, newGame, flips, movesFor, legal, counts, play, replay, history, evaluate, scores, aiMove, valid };
})();

if (typeof module !== 'undefined') module.exports = Reversi;
