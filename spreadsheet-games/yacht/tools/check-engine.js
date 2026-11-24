// Sanity checks for the rules in engine.js. Run: node spreadsheet-games/yacht/tools/check-engine.js

const assert = require('node:assert/strict');
const E = require('../engine.js');

const d = (s) => s.split('').map(Number);
const sc = (id, dice, want) => assert.equal(E.score(id, d(dice)), want, `${id} ${dice}`);

// Upper section
sc('ones', '11234', 2);
sc('fours', '44426', 12);
sc('sixes', '12345', 0);

// Of a kind
sc('threeKind', '33325', 16);
sc('threeKind', '33335', 17);
sc('threeKind', '33225', 0);
sc('fourKind', '55552', 22);
sc('fourKind', '55522', 0);
sc('fourKind', '66666', 30);

// Full house: needs exactly 3 + 2 (five alike isn't one without the joker)
sc('fullHouse', '22333', 25);
sc('fullHouse', '22233', 25);
sc('fullHouse', '22223', 0);
sc('fullHouse', '44444', 0);
assert.equal(E.score('fullHouse', d('44444'), true), 25);

// Straights, including one with a pair in it
sc('smallStraight', '12344', 30);
sc('smallStraight', '13456', 30);
sc('smallStraight', '12356', 0);
sc('smallStraight', '12345', 30);
sc('largeStraight', '12345', 40);
sc('largeStraight', '23456', 40);
sc('largeStraight', '12346', 0);
sc('largeStraight', '12344', 0);
assert.equal(E.score('largeStraight', d('22222'), true), 40);

// Yacht and Chance
sc('yacht', '55555', 50);
sc('yacht', '55554', 0);
sc('chance', '12366', 18);

// A game in a given state
const game = (dice, sheet = {}, extra = {}) => ({ ...E.newGame(), roll: 1, dice: d(dice), sheet, ...extra });
const filled = (ids, s = 0) => Object.fromEntries(ids.map((id) => [id, { s, d: [1, 1, 1, 1, 1], j: false }]));
const ids = (g) => E.options(g).map((o) => o.id);

// Before rolling there's nothing to score
assert.deepEqual(E.options(E.newGame()), []);
// Normal dice may go anywhere open
assert.equal(ids(game('12345')).length, 13);
assert.equal(ids(game('12345', filled(['chance']))).length, 12);

// Upper bonus at exactly 63 and just under
const upperSheet = (vals) => Object.fromEntries(E.UPPER.map((c, i) => [c.id, { s: vals[i], d: [1, 1, 1, 1, 1], j: false }]));
assert.equal(E.totals({ sheet: upperSheet([3, 6, 9, 12, 15, 18]), yachts: 0 }).bonus, 35); // 63
assert.equal(E.totals({ sheet: upperSheet([3, 6, 9, 12, 15, 17]), yachts: 0 }).bonus, 0); // 62
assert.equal(E.totals({ sheet: upperSheet([3, 6, 9, 12, 15, 18]), yachts: 2 }).total, 63 + 35 + 200);

// First Yacht with the Yacht box open: normal scoring, no bonus
{
  const g = game('33333');
  assert.equal(E.joker(g), null);
  E.fill(g, 'yacht');
  assert.equal(g.sheet.yacht.s, 50);
  assert.equal(g.yachts, 0);
}

// Joker, Yacht box holds 50, matching upper box open: forced there, +100
{
  const g = game('44444', { yacht: { s: 50, d: d('22222'), j: false } });
  assert.deepEqual(E.options(g), [{ id: 'fours', score: 20, joker: true }]);
  assert.equal(E.fill(g, 'chance'), null); // not allowed
  E.fill(g, 'fours');
  assert.equal(g.sheet.fours.s, 20);
  assert.equal(g.yachts, 1);
}

// Joker, upper box filled: any open lower box at full value
{
  const g = game('44444', { yacht: { s: 50, d: d('22222'), j: false }, fours: { s: 12, d: d('44412'), j: false } });
  const opts = Object.fromEntries(E.options(g).map((o) => [o.id, o.score]));
  assert.deepEqual(opts, { threeKind: 20, fourKind: 20, fullHouse: 25, smallStraight: 30, largeStraight: 40, chance: 20 });
  E.fill(g, 'largeStraight');
  assert.equal(g.sheet.largeStraight.s, 40);
  assert.equal(g.yachts, 1);
}

// Joker, lower section full: a 0 in an open upper box
{
  const sheet = { ...filled(E.LOWER.map((c) => c.id), 10), fours: { s: 12, d: d('44412'), j: false } };
  sheet.yacht = { s: 50, d: d('22222'), j: false };
  const g = game('44444', sheet);
  const opts = E.options(g);
  assert.deepEqual(opts.map((o) => o.id), ['ones', 'twos', 'threes', 'fives', 'sixes']);
  assert.ok(opts.every((o) => o.score === 0));
}

// Joker with the Yacht box zeroed: the joker still applies, no bonus
{
  const g = game('66666', { yacht: { s: 0, d: d('12345'), j: false }, sixes: { s: 18, d: d('66612'), j: false } });
  assert.equal(E.joker(g).bonus, false);
  E.fill(g, 'fullHouse');
  assert.equal(g.sheet.fullHouse.s, 25);
  assert.equal(g.yachts, 0);
}

// Rolling: first roll throws all five, later rolls only the selected dice
{
  const g = E.newGame();
  assert.equal(E.canRoll(g), true);
  const seq = [0.0, 0.2, 0.4, 0.6, 0.99]; // 1 2 3 4 6
  let k = 0;
  const rolled = E.roll(g, () => seq[k++]);
  assert.deepEqual(g.dice, [1, 2, 3, 4, 6]);
  assert.deepEqual(rolled, [0, 1, 2, 3, 4]);
  assert.equal(E.canRoll(g), false); // nothing selected
  E.toggle(g, 4); // the 6
  E.toggle(g, 0); // the 1
  const r2 = E.roll(g, () => 0.7); // both become 5
  assert.deepEqual(g.dice, [2, 3, 4, 5, 5]);
  assert.deepEqual(r2, [3, 4]);
  assert.equal(g.roll, 2);
  E.selectAll(g);
  E.roll(g, () => 0.5);
  assert.equal(g.roll, 3);
  E.selectAll(g);
  assert.equal(E.canRoll(g), false); // out of rolls
  assert.ok(g.sel.every((s) => !s));
}

// A full game: 13 fills ends it
{
  const g = E.newGame();
  for (let t = 0; t < E.TURNS; t++) {
    assert.equal(g.over, false);
    E.roll(g);
    assert.ok(E.fill(g, E.options(g)[0].id));
  }
  assert.equal(g.over, true);
  assert.equal(g.turn, E.TURNS);
  assert.equal(Object.keys(g.sheet).length, 13);
  assert.equal(E.canRoll(g), false);
  assert.ok(E.valid(JSON.parse(JSON.stringify(g))));
}

assert.equal(E.valid({ v: 0 }), false);
assert.ok(E.valid(E.newGame()));

// Formula bar text
assert.equal(E.formula('fours', d('44426'), 12), '=SUM(4,4,4)');
assert.equal(E.formula('fours', d('12356'), 0), '=0');
assert.equal(E.formula('fullHouse', d('22333'), 25), '=25');
assert.equal(E.formula('chance', d('12366'), 18), '=SUM(1,2,3,6,6)');

console.log('engine checks passed');
