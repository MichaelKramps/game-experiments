// Checks the Spades rules and plays thousands of computer-only matches.
// Run: node spreadsheet-games/spades/tools/check-engine.js
const assert = require('assert');
const S = require('../engine.js');

// winning(): spades trump, otherwise the suit led
assert.strictEqual(S.winning([{ seat: 0, card: 'KH' }, { seat: 1, card: 'AH' }, { seat: 2, card: '2S' }, { seat: 3, card: 'AD' }]).seat, 2);
assert.strictEqual(S.winning([{ seat: 0, card: '5C' }, { seat: 1, card: 'AH' }, { seat: 2, card: '9C' }, { seat: 3, card: '6C' }]).seat, 2);
assert.strictEqual(S.winning([{ seat: 0, card: '3S' }, { seat: 1, card: '10S' }]).seat, 1);

// scoring
const sc = (bids, taken, t, bags = 0) => S.teamScore(bids, taken, t, bags);
assert.strictEqual(sc([4, 2, 3, 2], [5, 3, 3, 2], 0).points, 71); // 7 bid, 8 taken
assert.strictEqual(sc([4, 2, 3, 2], [3, 3, 3, 4], 0).points, -70);
assert.strictEqual(sc(['nil', 2, 5, 2], [0, 4, 6, 3], 0).points, 151); // nil made + 5 bid, 6 taken
assert.strictEqual(sc(['nil', 2, 5, 2], [1, 4, 5, 3], 0).points, -49); // nil fails (-100), partner: 5 bid, 6 taken counting the nil trick (+51)
assert.strictEqual(sc(['blind', 2, 5, 2], [0, 4, 5, 4], 0).points, 250);
assert.strictEqual(sc(['blind', 2, 5, 2], [2, 4, 3, 4], 0).points, -150); // blind fails (-200), 5 bid with 5: +50
const bag = sc([4, 2, 3, 2], [6, 2, 3, 2], 0, 8); // 2 bags on top of 8 → penalty
assert.strictEqual(bag.points, 72 - 100);
assert.strictEqual(bag.bagTotal, 0);
assert.strictEqual(sc(['nil', 2, 'nil', 2], [0, 6, 2, 5], 0).points, 100 - 100 + 2); // both nil: one makes, one fails, 2 bags

// legal(): follow suit; no spade lead until broken
const g = S.newMatch(() => 0.3);
g.phase = 'play';
g.turn = 0;
g.hands[0] = ['AS', '2S', 'KH', '3D'];
g.tricks = [{ leader: 0, cards: [], winner: null }];
g.broken = false;
assert.deepStrictEqual(S.legal(g, 0), ['KH', '3D']);
g.broken = true;
assert.deepStrictEqual(S.legal(g, 0), ['AS', '2S', 'KH', '3D']);
g.tricks = [{ leader: 3, cards: [{ seat: 3, card: '9H' }], winner: null }];
assert.deepStrictEqual(S.legal(g, 0), ['KH']);
g.tricks = [{ leader: 3, cards: [{ seat: 3, card: '9C' }], winner: null }];
assert.deepStrictEqual(S.legal(g, 0), ['AS', '2S', 'KH', '3D']);

// blind nil only when behind by 100+
const b = S.newMatch();
assert(!S.blindAllowed(b, b.turn));
b.totals = [b.turn % 2 ? 300 : 100, b.turn % 2 ? 100 : 300];
assert(S.blindAllowed(b, b.turn));

// Computer-only matches: every play legal, every hand 13 tricks, totals add up.
let matches = 0, hands = 0, nils = 0, nilsMade = 0, blinds = 0, bidErr = 0, set = 0, teamHands = 0;
const t0 = Date.now();
for (let m = 0; m < 400; m++) {
  const x = S.newMatch();
  matches++;
  let guard = 0;
  while (x.phase !== 'over' && guard++ < 200) {
    if (x.phase === 'done') S.nextHand(x);
    // blind decisions before bids
    for (let s = 0; s < 4; s++) if (S.aiBlind(x, s)) S.goBlind(x, s);
    while (x.phase === 'bid') S.bid(x, x.turn, S.aiBid(x, x.turn));
    while (x.phase === 'play') {
      const c = S.aiPlay(x, x.turn);
      assert(S.legal(x, x.turn).includes(c), 'ai played an illegal card');
      S.play(x, x.turn, c);
    }
    hands++;
    const h = x.history.at(-1);
    assert.strictEqual(h.taken.reduce((a, b) => a + b, 0), 13);
    for (let s = 0; s < 4; s++) if (S.isNil(h.bids[s])) { nils++; if (h.taken[s] === 0) nilsMade++; if (h.bids[s] === 'blind') blinds++; }
    for (const r of h.teams) { if (r.contract) { teamHands++; bidErr += Math.abs(r.tricks - r.contract); if (!r.made) set++; } }
  }
  assert(x.phase === 'over', 'match did not end');
  const sum = [0, 1].map((t) => x.history.reduce((a, h) => a + h.teams[t].points, 0));
  assert.deepStrictEqual(sum, x.totals);
  assert(S.winner(x) !== null);
}
assert(S.valid(S.newMatch()));
console.log(`ok: ${matches} matches, ${hands} hands in ${Date.now() - t0}ms. nil ${nilsMade}/${nils} made (${blinds} blind); team bids missed ${(100 * set / teamHands).toFixed(0)}% of the time, off by ${(bidErr / teamHands).toFixed(1)} tricks on average`);
