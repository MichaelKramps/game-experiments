// Checks Four in a Row's rules and computer player:
//   node spreadsheet-games/four-in-a-row/tools/check-engine.js
const F = require('../engine.js');
const assert = require('assert');

// a seeded random, so failures repeat
function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

// landing and full columns
{
  const g = F.newGame(F.YOU);
  for (let k = 0; k < 6; k++) assert.strictEqual(F.play(g, 0), (5 - k) * 7);
  assert.strictEqual(F.play(g, 0), -1, 'full column');
  assert.ok(!F.legal(g).includes(0));
}
// wins in all four directions, and a line of 5
const wins = {
  across: [0, 0, 1, 1, 2, 2, 3],
  down: [0, 1, 0, 1, 0, 1, 0],
  diagUp: [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3],
  diagDown: [6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3],
};
for (const [name, moves] of Object.entries(wins)) {
  const g = F.replay(F.YOU, moves);
  assert.ok(g, name);
  assert.strictEqual(g.result, F.YOU, name);
  assert.strictEqual(g.line.length, 4, name);
  assert.deepStrictEqual(F.legal(g), [], `${name}: no moves after a win`);
}
{
  const g = F.replay(F.YOU, [0, 0, 1, 1, 3, 3, 4, 4, 2]);
  assert.strictEqual(g.result, F.YOU);
  assert.strictEqual(g.line.length, 5, 'a line of five');
}
// undo
{
  const g = F.replay(F.YOU, wins.across);
  F.undo(g);
  assert.strictEqual(g.result, null);
  assert.strictEqual(g.turn, F.YOU);
  assert.strictEqual(g.moves.length, 6);
}
// a full board is a draw
{
  // columns filled in pairs in an order that never makes four
  const order = [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 2, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3, 2, 4, 5, 4, 5, 4, 5, 5, 4, 5, 4, 5, 4, 6, 6, 6, 6, 6, 6];
  const g = F.replay(F.YOU, order);
  assert.ok(g, 'draw replay');
  assert.strictEqual(g.result, 'draw');
}
// valid
{
  const g = F.replay(F.CPU, [3, 3, 2]);
  assert.ok(F.valid({ ...g, level: 'hard' }));
  assert.ok(!F.valid({ ...g, level: 'hard', result: F.YOU }));
  assert.ok(!F.valid({ ...g, level: 'nope' }));
  assert.ok(!F.valid(null));
}
// every level takes an immediate win and Medium/Hard block one
for (const level of ['easy', 'medium', 'hard']) {
  const g = F.replay(F.CPU, [0, 6, 0, 6, 0, 5]); // the computer (O) has three in column A
  assert.strictEqual(F.aiMove(g, level, rng(1)), 0, `${level} takes the win`);
}
for (const level of ['medium', 'hard']) {
  const g = F.replay(F.YOU, [0, 6, 0, 6, 0]); // you have three in column A
  assert.strictEqual(F.aiMove(g, level, rng(2)), 0, `${level} blocks`);
}

// computer vs computer, and timing
function match(a, b, seed) {
  const r = rng(seed);
  const g = F.newGame(F.YOU);
  // a couple of random opening moves so the games differ
  for (let k = 0; k < 2; k++) F.play(g, F.legal(g)[Math.floor(r() * F.legal(g).length)]);
  let slowest = 0;
  while (!g.result) {
    const t = Date.now();
    const x = F.aiMove(g, g.turn === F.YOU ? a : b, r);
    slowest = Math.max(slowest, Date.now() - t);
    assert.ok(F.play(g, x) >= 0);
  }
  return { result: g.result, slowest };
}
for (const [a, b, n] of [
  ['hard', 'medium', 30],
  ['medium', 'easy', 30],
  ['hard', 'easy', 20],
]) {
  let wa = 0;
  let wb = 0;
  let d = 0;
  let slow = 0;
  for (let k = 0; k < n; k++) {
    // each side goes first in half the games
    const m = k % 2 ? match(b, a, k + 1) : match(a, b, k + 1);
    const aWon = k % 2 ? m.result === F.CPU : m.result === F.YOU;
    const bWon = k % 2 ? m.result === F.YOU : m.result === F.CPU;
    if (aWon) wa++;
    else if (bWon) wb++;
    else d++;
    slow = Math.max(slow, m.slowest);
  }
  console.log(`${a} vs ${b}: ${wa}–${wb}–${d} (slowest move ${slow}ms)`);
}
console.log('ok');
