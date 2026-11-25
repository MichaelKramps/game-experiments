// Checks FreeCell's deals and rules:
//   node freecell/tools/check-engine.js
const F = require('../engine.js');
const assert = require('assert');

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}
const empty = () => ({ deal: 1, cols: Array.from({ length: 8 }, () => []), cells: [null, null, null, null], found: { S: [], H: [], D: [], C: [] }, moves: 0, elapsed: 0, won: false, counted: false });

// the standard numbered deals: the first rows of #1 and #617 as published
const row = (cols, r) => cols.map((c) => c[r]);
assert.deepStrictEqual(row(F.layout(1), 0), ['JD', '2D', '9H', 'JC', '5D', '7H', '7C', '5H']);
assert.deepStrictEqual(row(F.layout(1), 6).slice(0, 4), ['6S', '9C', '2H', '6H']);
assert.deepStrictEqual(row(F.layout(617), 0), ['7D', 'AD', '5C', '3S', '5S', '8C', '2D', 'AH']);
assert.deepStrictEqual(row(F.layout(617), 6).slice(0, 4), ['JD', 'KS', 'KC', '4H']);
for (const n of [1, 617, 11982, 32000]) {
  const cols = F.layout(n);
  assert.deepStrictEqual(cols.map((c) => c.length), [7, 7, 7, 7, 6, 6, 6, 6]);
  assert.strictEqual(new Set(cols.flat()).size, 52);
  assert.ok(F.valid(F.newGame(n)));
}
for (let k = 0; k < 2000; k++) assert.notStrictEqual(F.randomDeal(rng(k)), F.UNSOLVABLE);

// runs and moves
{
  const g = empty();
  g.cols[0] = ['KS', '9H', '8S', '7D'];
  g.cols[1] = ['10C'];
  g.cols[2] = ['5H'];
  assert.strictEqual(F.runStart(g.cols[0]), 1);
  assert.ok(F.isRun(['9H', '8S', '7D']));
  assert.ok(!F.isRun(['9H', '8H']));
  // free space: 4 cells and 5 empty columns
  assert.strictEqual(F.maxRun(g), 5 * 2 ** 5);
  assert.ok(F.canDrop(g, ['9H', '8S', '7D'], 'col:1'), 'a run onto a black ten');
  assert.ok(!F.canDrop(g, ['9H', '8S', '7D'], 'col:2'), 'not onto a red five');
  assert.ok(F.canDrop(g, ['5H'], 'cell:0'));
  assert.ok(!F.canDrop(g, ['8S', '7D'], 'cell:0'), 'one card per cell');
  assert.ok(F.move(g, { loc: 'col:0', idx: 1 }, 'col:1'));
  assert.deepStrictEqual(g.cols[1], ['10C', '9H', '8S', '7D']);
  assert.deepStrictEqual(g.cols[0], ['KS']);
  assert.strictEqual(g.moves, 1);
  // a cell holds one card; a card out of a cell goes anywhere it fits
  assert.ok(F.move(g, { loc: 'col:2', idx: 0 }, 'cell:2'));
  assert.ok(!F.move(g, { loc: 'col:1', idx: 3 }, 'cell:2'), 'cell 3 is taken');
  assert.ok(F.move(g, { loc: 'cell:2', idx: 0 }, 'col:5'));
  assert.strictEqual(g.cells[2], null);
}
// how far free space goes: no free cells and no empty columns means one card
{
  const g = empty();
  g.cells = ['2C', '3C', '4C', '5C'];
  g.cols = [['JH', '10S', '9H'], ['QS'], ['KD'], ['AH'], ['2H'], ['3H'], ['4H'], ['5H']];
  assert.strictEqual(F.maxRun(g), 1);
  assert.ok(!F.canDrop(g, ['JH', '10S', '9H'], 'col:1'));
  g.cells[0] = null;
  assert.strictEqual(F.maxRun(g), 2);
  assert.ok(!F.canDrop(g, ['JH', '10S', '9H'], 'col:1'));
  g.cells[1] = null;
  assert.ok(F.canDrop(g, ['JH', '10S', '9H'], 'col:1'));
  // into an empty column, that column isn't free space
  g.cols[3] = [];
  assert.strictEqual(F.maxRun(g), 3 * 2);
  assert.strictEqual(F.maxRun(g, true), 3);
}
// Done builds up by suit from the ace
{
  const g = empty();
  g.cols[0] = ['2S', 'AS'];
  assert.ok(!F.canDrop(g, ['2S'], 'found:S'));
  assert.ok(!F.canDrop(g, ['AS'], 'found:H'));
  assert.ok(F.move(g, { loc: 'col:0', idx: 1 }, 'found:S'));
  assert.ok(F.move(g, { loc: 'col:0', idx: 0 }, 'found:S'));
}
// solved: every column high to low; finishing then always works and wins
{
  const g = F.newGame(1);
  assert.ok(!F.solved(g));
  const cards = g.cols.flat();
  // sort the deal into 8 high-to-low columns and a few cells
  cards.sort((a, b) => F.rank(b) - F.rank(a));
  g.cols = Array.from({ length: 8 }, () => []);
  g.cells = [cards.pop(), cards.pop(), null, null];
  cards.forEach((c, i) => g.cols[i % 8].push(c));
  assert.ok(F.valid(g));
  assert.ok(F.solved(g));
  let n = 0;
  for (let h = F.nextHome(g); h; h = F.nextHome(g)) {
    assert.ok(F.move(g, h.p, h.dest));
    n++;
  }
  assert.strictEqual(n, 52);
  assert.ok(g.won);
  assert.ok(!F.solved(g), 'nothing left to finish');
}
// random legal play never loses or duplicates a card
for (let s = 1; s <= 40; s++) {
  const r = rng(s);
  const g = F.newGame(F.randomDeal(r));
  for (let k = 0; k < 300; k++) {
    const picks = [];
    g.cols.forEach((col, i) => {
      for (let idx = F.runStart(col); idx < col.length; idx++) picks.push({ loc: `col:${i}`, idx });
    });
    g.cells.forEach((c, i) => c && picks.push({ loc: `cell:${i}`, idx: 0 }));
    const options = picks.flatMap((p) => F.destinations(g, p).map((d) => [p, d]));
    if (!options.length) break;
    const [p, d] = options[Math.floor(r() * options.length)];
    assert.ok(F.move(g, p, d));
    assert.ok(F.valid(g), `deal ${g.deal} move ${k}`);
  }
}
assert.ok(!F.valid(null));
assert.ok(!F.valid({ ...F.newGame(5), deal: 0 }));
{
  const bad = F.newGame(5);
  bad.cols[0][0] = bad.cols[1][0];
  assert.ok(!F.valid(bad), 'a duplicated card');
}
console.log('ok');
