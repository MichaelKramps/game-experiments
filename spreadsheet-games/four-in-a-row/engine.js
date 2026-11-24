// Four in a Row: the rules and the computer player, with no DOM, so
// tools/check-engine.js can run it under node. See DESIGN.md.
//
// The board is 7 columns × 6 rows, stored as 42 cells, index y * 7 + x with
// y = 0 the top row. A cell holds 0 (empty), 1 (you, X) or 2 (the computer, O).

const FourInARow = (() => {
  const W = 7;
  const H = 6;
  const YOU = 1;
  const CPU = 2;
  const ORDER = [3, 2, 4, 1, 5, 0, 6]; // center first: better moves are searched first
  const DIRS = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  const LEVELS = {
    easy: { name: 'Easy' },
    medium: { name: 'Medium', depth: 4 },
    hard: { name: 'Hard', depth: 8 },
  };

  // Every line of four cells on the board, used by the evaluation.
  const LINES = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (const [dx, dy] of DIRS) {
        const ex = x + dx * 3;
        const ey = y + dy * 3;
        if (ex < 0 || ex >= W || ey < 0 || ey >= H) continue;
        LINES.push([0, 1, 2, 3].map((k) => (y + dy * k) * W + x + dx * k));
      }
    }
  }

  // A new game. first: YOU or CPU.
  function newGame(first = YOU) {
    return { board: Array(W * H).fill(0), moves: [], first, turn: first, result: null, line: null };
  }

  // The row a disc dropped in column x lands in, or -1 if the column is full.
  function landing(board, x) {
    for (let y = H - 1; y >= 0; y--) if (!board[y * W + x]) return y;
    return -1;
  }

  const legal = (g) => (g.result ? [] : ORDER.filter((x) => landing(g.board, x) >= 0).sort((a, b) => a - b));

  // The four (or more) cells in a row through cell i, or null.
  function lineThrough(board, i) {
    const p = board[i];
    if (!p) return null;
    const x = i % W;
    const y = Math.floor(i / W);
    for (const [dx, dy] of DIRS) {
      const cells = [i];
      for (const s of [1, -1]) {
        for (let k = 1; k < 4; k++) {
          const nx = x + dx * k * s;
          const ny = y + dy * k * s;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H || board[ny * W + nx] !== p) break;
          cells.push(ny * W + nx);
        }
      }
      if (cells.length >= 4) return cells.sort((a, b) => a - b);
    }
    return null;
  }

  // Drop the current player's disc in column x. Returns the cell, or -1.
  function play(g, x) {
    if (g.result) return -1;
    const y = landing(g.board, x);
    if (y < 0) return -1;
    const i = y * W + x;
    g.board[i] = g.turn;
    g.moves.push(x);
    const line = lineThrough(g.board, i);
    if (line) {
      g.result = g.turn;
      g.line = line;
    } else if (g.moves.length === W * H) g.result = 'draw';
    g.turn = 3 - g.turn;
    return i;
  }

  // Take back the last move.
  function undo(g) {
    const x = g.moves.pop();
    if (x === undefined) return;
    const y = landing(g.board, x) + 1;
    g.board[y * W + x] = 0;
    g.turn = 3 - g.turn;
    g.result = null;
    g.line = null;
  }

  // Rebuild a game from its first player and moves (used to check a save).
  function replay(first, moves) {
    const g = newGame(first);
    for (const x of moves) if (play(g, x) < 0) return null;
    return g;
  }

  // ---------------------------------------------------------------------------
  // The computer

  const WIN = 1e6;

  // How good the board is for player p: open lines of 2 and 3, and discs in
  // the center column.
  function evaluate(board, p) {
    const q = 3 - p;
    let s = 0;
    for (let y = 0; y < H; y++) {
      const c = board[y * W + 3];
      if (c === p) s += 3;
      else if (c === q) s -= 3;
    }
    for (const L of LINES) {
      let mine = 0;
      let theirs = 0;
      for (const i of L) {
        if (board[i] === p) mine++;
        else if (board[i] === q) theirs++;
      }
      if (mine && theirs) continue;
      if (mine === 3) s += 5;
      else if (mine === 2) s += 2;
      else if (theirs === 3) s -= 4;
      else if (theirs === 2) s -= 1;
    }
    return s;
  }

  // Negamax with alpha-beta: the score of the board for p, who moves next.
  function search(board, heights, p, depth, alpha, beta, filled) {
    if (filled === W * H) return 0;
    if (depth === 0) return evaluate(board, p);
    let best = -Infinity;
    for (const x of ORDER) {
      const y = heights[x];
      if (y < 0) continue;
      const i = y * W + x;
      board[i] = p;
      heights[x]--;
      let v;
      if (lineThrough(board, i)) v = WIN + depth;
      else v = -search(board, heights, 3 - p, depth - 1, -beta, -alpha, filled + 1);
      board[i] = 0;
      heights[x]++;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  // Each legal column's score for the player to move, searched depth plies.
  function scores(g, depth) {
    const board = g.board.slice();
    const heights = Array.from({ length: W }, (_, x) => landing(board, x));
    const p = g.turn;
    const out = new Map();
    for (const x of ORDER) {
      const y = heights[x];
      if (y < 0) continue;
      const i = y * W + x;
      board[i] = p;
      heights[x]--;
      const v = lineThrough(board, i) ? WIN + depth : -search(board, heights, 3 - p, depth - 1, -Infinity, Infinity, g.moves.length + 1);
      board[i] = 0;
      heights[x]++;
      out.set(x, v);
    }
    return out;
  }

  // The column that wins right away for player p, or -1.
  function winningColumn(g, p) {
    for (const x of ORDER) {
      const y = landing(g.board, x);
      if (y < 0) continue;
      const i = y * W + x;
      g.board[i] = p;
      const won = lineThrough(g.board, i);
      g.board[i] = 0;
      if (won) return x;
    }
    return -1;
  }

  // The computer's column. Easy takes a win when it sees one, blocks yours
  // about half the time, and otherwise plays loosely toward the middle.
  // Medium and Hard search 4 and 8 moves ahead and pick randomly among the
  // best-scoring columns.
  function aiMove(g, level = 'medium', rand = Math.random) {
    const cols = legal(g);
    if (!cols.length) return -1;
    if (level === 'easy') {
      const win = winningColumn(g, g.turn);
      if (win >= 0) return win;
      const block = winningColumn(g, 3 - g.turn);
      if (block >= 0 && rand() < 0.5) return block;
      const weights = cols.map((x) => 4 - Math.abs(x - 3));
      let r = rand() * weights.reduce((a, b) => a + b, 0);
      for (let k = 0; k < cols.length; k++) if ((r -= weights[k]) < 0) return cols[k];
      return cols[cols.length - 1];
    }
    const s = scores(g, LEVELS[level]?.depth || LEVELS.medium.depth);
    const top = Math.max(...s.values());
    const best = [...s].filter(([, v]) => v === top).map(([x]) => x);
    return best[Math.floor(rand() * best.length)];
  }

  // A saved game: rebuild it from its moves and check it matches.
  function valid(s) {
    if (!s || typeof s !== 'object') return false;
    if (s.first !== YOU && s.first !== CPU) return false;
    if (!Array.isArray(s.moves) || !s.moves.every((x) => Number.isInteger(x) && x >= 0 && x < W)) return false;
    if (!(s.level in LEVELS)) return false;
    const g = replay(s.first, s.moves);
    return !!g && g.board.every((c, i) => c === s.board?.[i]) && g.result === s.result;
  }

  return { W, H, YOU, CPU, LEVELS, newGame, landing, legal, lineThrough, play, undo, replay, evaluate, scores, winningColumn, aiMove, valid };
})();

if (typeof module !== 'undefined') module.exports = FourInARow;
