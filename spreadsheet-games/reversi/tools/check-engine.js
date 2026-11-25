// Checks Reversi's rules and computer player:
//   node spreadsheet-games/reversi/tools/check-engine.js
const R = require('../engine.js');
const assert = require('assert');
const { YOU, CPU, N } = R;
const at = (s) => (+s.slice(1) - 1) * N + (s.charCodeAt(0) - 65);

// a seeded random, so failures repeat
function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

// the start: the first player has D5 and E4, and four opening moves
{
  const g = R.newGame(YOU);
  assert.strictEqual(g.board[at('D5')], YOU);
  assert.strictEqual(g.board[at('E4')], YOU);
  assert.strictEqual(g.board[at('D4')], CPU);
  assert.strictEqual(g.board[at('E5')], CPU);
  assert.deepStrictEqual(R.legal(g).sort((a, b) => a - b), [at('D3'), at('C4'), at('F5'), at('E6')].sort((a, b) => a - b));
  assert.strictEqual(R.play(g, at('A1')), null, 'a move that flips nothing');
  assert.strictEqual(R.play(g, at('D5')), null, 'an occupied cell');
  const r = R.play(g, at('D3'));
  assert.deepStrictEqual(r.flips, [at('D4')]);
  assert.strictEqual(g.board[at('D4')], YOU);
  assert.strictEqual(g.turn, CPU);
  assert.deepStrictEqual(R.counts(g.board), { [YOU]: 4, [CPU]: 1 });
}
// flips in several directions at once, nearest first
{
  const g = R.newGame(YOU);
  g.board.fill(0);
  // X at A1, H8 and D8; O in between on the diagonal, the row and the column
  g.board[at('A1')] = YOU;
  for (const c of ['B2', 'C3', 'D4']) g.board[at(c)] = CPU;
  for (const c of ['F5', 'G5']) g.board[at(c)] = CPU;
  g.board[at('H5')] = YOU;
  g.board[at('E6')] = CPU;
  g.board[at('E7')] = YOU;
  const r = R.play(g, at('E5'));
  assert.deepStrictEqual(new Set(r.flips), new Set(['D4', 'C3', 'B2', 'F5', 'G5', 'E6'].map(at)));
  assert.deepStrictEqual(r.flips.slice(0, 3).map((k) => k).sort(), ['D4', 'F5', 'E6'].map(at).sort(), 'nearest first');
  // a line that ends in an empty cell or the edge doesn't flip
  g.board.fill(0);
  g.board[at('A1')] = CPU;
  g.board[at('B1')] = CPU;
  g.turn = YOU;
  assert.deepStrictEqual(R.flips(g.board, at('C1'), YOU), []);
}
// passing: the other player has no move, so the same player goes again
{
  const g = R.newGame(YOU);
  g.board.fill(0);
  // X: A1 and H1–H7. O: B1, A2 and the H8 corner, which O can't build from.
  for (const c of ['A1', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7']) g.board[at(c)] = YOU;
  for (const c of ['B1', 'A2', 'H8']) g.board[at(c)] = CPU;
  // X plays C1 (flips B1); O then has no move, but X still has A3
  const r = R.play(g, at('C1'));
  assert.deepStrictEqual(r.flips, [at('B1')]);
  assert.ok(r.passed, 'O passes');
  assert.strictEqual(g.turn, YOU);
  const r2 = R.play(g, at('A3'));
  assert.ok(r2.over, 'neither side can move: game over');
  assert.strictEqual(g.result, YOU);
}
// a full random game ends with the board full or nobody able to move
for (let s = 1; s <= 30; s++) {
  const r = rng(s);
  const g = R.newGame(s % 2 ? YOU : CPU);
  while (!g.result) {
    const m = R.legal(g);
    assert.ok(m.length);
    assert.ok(R.play(g, m[Math.floor(r() * m.length)]));
  }
  assert.strictEqual(R.movesFor(g.board, YOU).length + R.movesFor(g.board, CPU).length, 0);
  const c = R.counts(g.board);
  assert.strictEqual(g.result, c[YOU] > c[CPU] ? YOU : c[CPU] > c[YOU] ? CPU : 'draw');
  // replay, history and save checks agree
  const h = R.history(g.first, g.moves);
  assert.ok(h.every(Boolean));
  assert.ok(R.valid({ ...g, level: 'medium' }));
  assert.ok(!R.valid({ ...g, level: 'medium', moves: g.moves.slice(0, -1) }), 'moves and board disagree');
}
assert.ok(!R.valid(null));
assert.ok(!R.valid({ first: 3, moves: [], level: 'easy' }));
// Easy always takes a corner (Medium and Hard search instead: here they'd
// rather wipe out every X)
{
  const g = R.newGame(CPU);
  g.board.fill(0);
  g.board[at('A1')] = 0;
  g.board[at('B2')] = YOU;
  g.board[at('C3')] = CPU;
  g.board[at('E5')] = YOU;
  g.board[at('F5')] = CPU;
  g.turn = CPU;
  for (let k = 1; k <= 5; k++) assert.strictEqual(R.aiMove(g, 'easy', rng(k)), at('A1'));
}

// computer-only matches, with timings
function match(a, b, seed) {
  const r = rng(seed);
  const g = R.newGame(YOU);
  // a random first move for each side so the games differ
  for (let k = 0; k < 2; k++) {
    const m = R.legal(g);
    R.play(g, m[Math.floor(r() * m.length)]);
  }
  let slowest = 0;
  while (!g.result) {
    const t = Date.now();
    const i = R.aiMove(g, g.turn === YOU ? a : b, r);
    slowest = Math.max(slowest, Date.now() - t);
    assert.ok(R.play(g, i));
  }
  return { result: g.result, slowest };
}
for (const [a, b, n] of [['medium', 'easy', 10], ['hard', 'medium', 10]]) {
  let wa = 0;
  let wb = 0;
  let d = 0;
  let slow = 0;
  for (let k = 0; k < n; k++) {
    const m = k % 2 ? match(b, a, k + 1) : match(a, b, k + 1);
    const aWon = k % 2 ? m.result === CPU : m.result === YOU;
    const bWon = k % 2 ? m.result === YOU : m.result === CPU;
    if (aWon) wa++;
    else if (bWon) wb++;
    else d++;
    slow = Math.max(slow, m.slowest);
  }
  console.log(`${a} vs ${b}: ${wa}–${wb}–${d} (slowest move ${slow}ms)`);
}
console.log('ok');
