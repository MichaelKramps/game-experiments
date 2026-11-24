// Checks Mancala's rules and computer player:
//   node spreadsheet-games/mancala/tools/check-engine.js
const M = require('../engine.js');
const assert = require('assert');

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
const total = (g) => g.pits.reduce((a, b) => a + b, 0);

// opening: pit 2 (D2) with 4 seeds ends in your store: extra turn
{
  const g = M.newGame(4, M.YOU);
  const r = M.play(g, 2);
  assert.deepStrictEqual(r.path, [3, 4, 5, 6]);
  assert.ok(r.extra);
  assert.strictEqual(g.turn, M.YOU, 'extra turn keeps the turn');
  assert.strictEqual(g.pits[6], 1);
}
// a normal move passes the turn
{
  const g = M.newGame(4, M.YOU);
  const r = M.play(g, 5);
  assert.deepStrictEqual(r.path, [6, 7, 8, 9]);
  assert.ok(!r.extra);
  assert.strictEqual(g.turn, M.CPU);
  assert.strictEqual(M.play(g, 0), null, 'not your pit now');
}
// capture: last seed in your own empty pit takes the pit across
{
  const g = M.newGame(4, M.YOU);
  g.pits = [1, 0, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 5, 0]; // pit 1 empty, opposite is 11 (4 seeds)
  const r = M.play(g, 0);
  assert.deepStrictEqual(r.capture, { pit: 1, opp: 11, n: 5 });
  assert.strictEqual(g.pits[6], 5);
  assert.strictEqual(g.pits[1], 0);
  assert.strictEqual(g.pits[11], 0);
}
// no capture when the pit across is empty
{
  const g = M.newGame(4, M.YOU);
  g.pits = [1, 0, 4, 4, 4, 4, 0, 4, 4, 4, 4, 0, 9, 0];
  const r = M.play(g, 0);
  assert.strictEqual(r.capture, null);
  assert.strictEqual(g.pits[1], 1, 'the seed stays');
}
// a lap skips the computer's store and drops into the pit it started from
{
  const g = M.newGame(4, M.YOU);
  g.pits = [14, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0];
  const r = M.play(g, 0);
  assert.ok(!r.path.includes(13), 'skips the computer store');
  assert.strictEqual(r.path.length, 14);
  assert.ok(r.path.includes(0), 'sows into the starting pit on a lap');
}
// the computer skips your store
{
  const g = M.newGame(4, M.CPU);
  g.pits[12] = 10;
  const r = M.play(g, 12);
  assert.ok(!r.path.includes(6));
}
// a side running out ends the game and sweeps the rest
{
  const g = M.newGame(4, M.YOU);
  g.pits = [0, 0, 0, 0, 0, 1, 20, 2, 0, 3, 0, 0, 0, 10];
  const r = M.play(g, 5);
  assert.ok(r.over && r.extra);
  assert.deepStrictEqual(r.sweep, [0, 5]);
  assert.strictEqual(g.pits[6], 21);
  assert.strictEqual(g.pits[13], 15);
  assert.strictEqual(g.result, M.YOU);
  assert.deepStrictEqual(M.legal(g), []);
}
// every seed count works and seeds are conserved
for (let s = M.SEEDS.min; s <= M.SEEDS.max; s++) {
  const r = rng(s);
  const g = M.newGame(s, M.YOU);
  while (!g.result) {
    const m = M.legal(g);
    M.play(g, m[Math.floor(r() * m.length)]);
    assert.strictEqual(total(g), s * 12, `seeds conserved with ${s}`);
  }
}
// valid / replay
{
  const g = M.replay(4, M.YOU, [2, 5, 7]);
  assert.ok(g);
  assert.ok(M.valid({ ...g, level: 'medium' }));
  assert.ok(!M.valid({ ...g, level: 'medium', seeds: 11 }));
  assert.ok(!M.valid({ ...g, level: 'medium', turn: 3 - g.turn }));
  assert.strictEqual(M.replay(4, M.YOU, [7]), null, 'wrong side');
}
// the computer takes an obvious capture
for (const level of ['medium', 'hard']) {
  const g = M.newGame(4, M.CPU);
  g.pits = [9, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0]; // 11 lands in empty 12, across from pit 0 (9 seeds); 7 captures nothing
  assert.strictEqual(M.aiMove(g, level, rng(3)), 11, `${level} captures`);
}

// computer vs computer, with timing
function match(a, b, seeds, seed) {
  const r = rng(seed);
  const g = M.newGame(seeds, M.YOU);
  const m0 = M.legal(g);
  M.play(g, m0[Math.floor(r() * m0.length)]);
  let slowest = 0;
  while (!g.result) {
    const t = Date.now();
    const k = M.aiMove(g, g.turn === M.YOU ? a : b, r);
    slowest = Math.max(slowest, Date.now() - t);
    assert.ok(M.play(g, k));
  }
  return { result: g.result, slowest };
}
for (const [a, b, seeds, n] of [
  ['hard', 'medium', 4, 20],
  ['medium', 'easy', 4, 20],
  ['hard', 'medium', 10, 6],
  ['hard', 'medium', 1, 10],
]) {
  let wa = 0;
  let wb = 0;
  let d = 0;
  let slow = 0;
  for (let k = 0; k < n; k++) {
    const m = k % 2 ? match(b, a, seeds, k + 1) : match(a, b, seeds, k + 1);
    const aWon = k % 2 ? m.result === M.CPU : m.result === M.YOU;
    const bWon = k % 2 ? m.result === M.YOU : m.result === M.CPU;
    if (aWon) wa++;
    else if (bWon) wb++;
    else d++;
    slow = Math.max(slow, m.slowest);
  }
  console.log(`${a} vs ${b}, ${seeds} seeds: ${wa}–${wb}–${d} (slowest move ${slow}ms)`);
}
console.log('ok');
