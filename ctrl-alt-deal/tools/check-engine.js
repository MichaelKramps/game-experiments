// Sanity checks for the rules in engine.js. Run: node ctrl-alt-deal/tools/check-engine.js

const assert = require('node:assert/strict');
const E = require('../engine.js');

const SUIT = { '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C' };
const RANK = { J: 11, Q: 12, K: 13, A: 14 };
const hand = (s) =>
  s.split(' ').map((t) => ({ rank: RANK[t.slice(0, -1)] || Number(t.slice(0, -1)), suit: SUIT[t.slice(-1)] }));
const scores = (s, id) => assert.equal(E.evaluate(hand(s)).id, id, s);

scores('A♠ A♠ A♠ A♠ A♠', 'flush-five');
scores('A♠ A♥ A♠ A♠ A♠', 'five-kind');
scores('9♥ 10♥ J♥ Q♥ K♥', 'straight-flush');
scores('A♦ 2♦ 3♦ 4♦ 5♦', 'straight-flush');
scores('K♣ K♣ K♣ K♣ 2♥', 'four-kind');
scores('K♣ K♣ K♣ 2♣ 2♣', 'full-house'); // one suit, still a full house
scores('2♠ 7♠ 9♠ J♠ K♠', 'flush');
scores('10♣ J♦ Q♠ K♥ A♣', 'straight');
scores('A♣ 2♦ 3♠ 4♥ 5♣', 'straight');
scores('Q♣ K♦ A♠ 2♥ 3♣', 'nothing'); // no wrapping
scores('7♣ 7♦ 7♠ 2♥ 3♣', 'three-kind');
scores('7♣ 7♦ 2♠ 2♥ 3♣', 'two-pair');
scores('2♣ 2♦ 5♠ 9♥ J♣', 'pair');
scores('2♣ 4♦ 6♠ 8♥ 10♣', 'nothing');

// Paytable and Increase Hand Payout: each purchase doubles the hand's payout
const up = E.newRun();
up.bankroll = 100;
assert.equal(E.multiple(up, 'pair'), 1);
assert.equal(E.multiple(up, 'nothing'), -1);
E.buy(up, 'payout', 'full-house');
E.buy(up, 'payout', 'full-house');
assert.equal(E.multiple(up, 'full-house'), 28);
assert.equal(up.bankroll, 100 - 10 - 30);
assert.equal(E.prices(up).payout, 90);
assert.throws(() => E.buy(E.newRun(), 'payout', 'nothing'));
assert.deepEqual(E.BOSS_TARGETS.length, E.LEVELS);
assert.equal(E.bossTarget(8), 120);

// Shop prices
assert.deepEqual([...Array(10).keys()].map((n) => E.price(n)), [2, 3, 5, 7, 11, 16, 23, 35, 52, 77]);

// Betting: limits grow 4x per level, and boss hands use the same range
const run = E.newRun();
assert.deepEqual(E.betRange(run), { min: 1, max: 10, fixed: false, covered: true });
run.level = 3;
run.hand = 5;
run.bankroll = 1000;
assert.deepEqual(E.betRange(run), { min: 16, max: 160, fixed: false, covered: true });
run.bankroll = 100;
assert.equal(E.betRange(run).max, 100);
run.bankroll = 15;
assert.equal(E.betRange(run).covered, false);

// A full hand: deal, discard, draw, pay out
const r = E.newRun();
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
E.deal(r, 5, rand);
assert.equal(r.bankroll, 20);
assert.equal(r.round.cards.length, 5);
assert.equal(E.trash(r, r.round.cards.slice(0, 2)).length, 2);
const res = E.draw(r);
assert.equal(r.bankroll, 20 + (res.mult < 0 ? 0 : 5 + 5 * res.mult));
assert.equal(r.hand, 2);

// Discard limit: deck size − 5
const small = E.newRun();
small.deck = small.deck.slice(0, 7);
E.deal(small, 1, rand);
assert.equal(E.trash(small, small.round.cards).length, 2);

// Boss hands: pay at least the target to move on, anything less ends the run
const bossRun = (cards, level = 1, upgrades = {}) => {
  const g = E.newRun();
  g.level = level;
  g.hand = 5;
  g.bankroll = 10 ** 6;
  g.upgrades = upgrades;
  g.deck = hand(cards).map((c, i) => ({ ...c, id: i + 1, copy: 0 }));
  E.deal(g, E.betRange(g).min, rand);
  return [g, E.draw(g)];
};
let [g, gr] = bossRun('2♣ 2♦ 7♠ 4♥ 3♣'); // pair pays 1x, boss 1 needs 1x
assert.equal(gr.outcome, 'beat');
assert.deepEqual([g.level, g.hand, g.phase], [2, 1, 'bet']);
assert.equal(g.bankroll, 10 ** 6 + 1);
[g, gr] = bossRun('7♣ 7♦ 2♠ 2♥ 3♣', 2); // two pair 2x < 3x
assert.equal(gr.outcome, 'lose');
assert.equal(g.phase, 'lost');
assert.equal(g.lostTo, 3);
[g, gr] = bossRun('7♣ 7♦ 2♠ 2♥ 3♣', 2, { 'two-pair': 1 }); // doubled to 4x
assert.equal(gr.outcome, 'beat');
[g, gr] = bossRun('2♣ 7♣ 9♣ J♣ K♣', 8, { flush: 5 }); // 5x × 2^5 = 160x
assert.equal(gr.mult, 160);
assert.equal(g.phase, 'won');

// Duplicate and remove
const s = E.newRun();
const ks = s.deck.find((c) => c.rank === 13 && c.suit === 'C');
E.buy(s, 'duplicate', ks.id);
E.buy(s, 'duplicate', ks.id);
assert.equal(s.deck.length, 54);
assert.deepEqual(s.deck.slice(-2).map((c) => c.copy), [1, 2]);
assert.equal(s.bankroll, 20);
E.buy(s, 'remove', ks.id);
assert.equal(s.deck.length, 53);
assert.equal(E.prices(s).remove, 3);

// Change suit: own price counter; becomes a copy if that card already exists
const cs = E.newRun();
const kc = cs.deck.find((c) => c.rank === 13 && c.suit === 'C');
E.buy(cs, 'suit', kc.id, 'H');
assert.deepEqual([kc.suit, kc.copy], ['H', 1]); // KH was already in the deck
assert.equal(cs.deck.length, 52);
assert.equal(cs.bankroll, 23);
assert.deepEqual(E.prices(cs), { remove: 2, duplicate: 2, suit: 3, payout: 10 });
const kh = cs.deck.find((c) => c.rank === 13 && c.suit === 'H' && c.copy === 0);
E.buy(cs, 'remove', kh.id);
E.buy(cs, 'suit', kc.id, 'C'); // back to clubs, where no king is left
assert.deepEqual([kc.suit, kc.copy], ['C', 0]);
assert.throws(() => E.buy(cs, 'suit', kc.id, 'C'));

console.log('engine ok');
