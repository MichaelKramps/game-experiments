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

// Every hand matched, best first, each counted once
const matched = (s, ids) => assert.deepEqual(E.matches(hand(s)).map((h) => h.id), ids, s);
matched('K♣ K♦ K♠ 2♥ 2♣', ['full-house', 'three-kind', 'two-pair', 'pair']);
matched('K♣ K♣ K♣ 2♣ 2♣', ['full-house', 'flush', 'three-kind', 'two-pair', 'pair']); // one suit adds flush
matched('K♣ K♦ K♠ K♥ 2♣', ['four-kind', 'three-kind', 'pair']);
matched('9♥ 10♥ J♥ Q♥ K♥', ['straight-flush', 'flush', 'straight']);
matched('A♠ A♠ A♠ A♠ A♠', ['flush-five', 'five-kind', 'four-kind', 'flush', 'three-kind', 'pair']);
matched('7♣ 7♦ 2♠ 2♥ 3♣', ['two-pair', 'pair']);
matched('7♣ 7♦ 7♠ 2♥ 3♣', ['three-kind', 'pair']);
matched('2♣ 4♦ 6♠ 8♥ 10♣', ['nothing']);
// `includes` agrees with what each best hand matches in plain (not one-suit) cards
for (const [s, id] of [['K♣ K♦ K♠ 2♥ 2♣', 'full-house'], ['K♣ K♦ K♠ K♥ 2♣', 'four-kind'], ['A♠ A♠ A♠ A♠ A♠', 'flush-five'], ['A♠ A♥ A♠ A♠ A♠', 'five-kind'], ['9♥ 10♥ J♥ Q♥ K♥', 'straight-flush'], ['7♣ 7♦ 7♠ 2♥ 3♣', 'three-kind'], ['7♣ 7♦ 2♠ 2♥ 3♣', 'two-pair']]) {
  assert.deepEqual(new Set(E.matches(hand(s)).map((h) => h.id)), new Set([id, ...E.HANDS.find((h) => h.id === id).includes]), s);
}
const base = E.newRun();
assert.equal(E.total(base, 'full-house'), 8 + 4 + 2 + 1);
assert.equal(E.total(base, 'pair'), 1);
assert.equal(E.total(base, 'nothing'), -1);

// Paytable and Increase Hand Payout: each purchase doubles the hand's payout
const up = E.newRun();
up.bankroll = 100;
assert.equal(E.multiple(up, 'pair'), 1);
assert.equal(E.multiple(up, 'nothing'), -1);
E.buy(up, 'payout', 'full-house');
E.buy(up, 'payout', 'full-house');
assert.equal(E.multiple(up, 'full-house'), 32);
// Each hand has its own price: $2, ×4 when it's upgraded, ×1.5 when another hand is
assert.equal(up.bankroll, 100 - 2 - 8);
assert.equal(E.payoutPrice(up, 'full-house'), 32); // 2 × 4²
assert.equal(E.payoutPrice(up, 'pair'), 5); // 2 × 1.5² = 4.5, rounded up
E.buy(up, 'payout', 'pair');
assert.equal(E.payoutPrice(up, 'pair'), 18); // 2 × 4 × 1.5² = 18
assert.equal(E.payoutPrice(up, 'full-house'), 48); // 2 × 4² × 1.5
assert.equal(E.payoutPrice(up, 'flush'), 7); // 2 × 1.5³ = 6.75, rounded up
assert.equal(E.priceOf(up, 'payout'), 7); // no hand: the cheapest
assert.equal(up.bankroll, 90 - 5);
const poor = E.newRun();
poor.bankroll = 6;
E.buy(poor, 'payout', 'pair'); // $2, leaves $4; pair now costs $8
assert.equal(E.shopBlock(poor, 'payout', 'pair'), "You can't afford it.");
assert.equal(E.shopBlock(poor, 'payout', 'flush'), null); // $3
assert.throws(() => E.buy(poor, 'payout', 'pair'));
assert.throws(() => E.buy(E.newRun(), 'payout', 'nothing'));
assert.deepEqual(E.BOSS_TARGETS.length, E.LEVELS);
assert.equal(E.bossTarget(8), 5000);

// Shop prices
assert.deepEqual([...Array(10).keys()].map((n) => E.price(n)), [2, 3, 5, 7, 11, 16, 23, 35, 52, 77]);

// Betting: $10–$20 across level 1's hands, 4x per level; short of that you bet everything; $0 loses
assert.deepEqual([1, 2, 3, 4, 5].map((h) => E.handBet(1, h)), [10, 12, 14, 16, 20]);
assert.deepEqual([1, 2, 3, 4, 5].map((h) => E.handBet(2, h)), [40, 48, 56, 64, 80]);
assert.deepEqual([1, 2, 3, 4, 5].map((h) => E.handBet(3, h)), [160, 192, 224, 256, 320]);
const run = E.newRun();
assert.deepEqual(E.nextBet(run), { bet: 10, full: 10, allIn: false });
run.level = 3;
run.hand = 2;
run.bankroll = 1000;
assert.deepEqual(E.nextBet(run), { bet: 192, full: 192, allIn: false });
run.bankroll = 100;
assert.deepEqual(E.nextBet(run), { bet: 100, full: 192, allIn: true });
run.deck = hand('2♣ 4♦ 6♠ 8♥ 10♣').map((c, i) => ({ ...c, id: i + 1, copy: 0 }));
E.deal(run, Math.random);
assert.equal(run.bankroll, 0); // all in
E.draw(run); // nothing: the bet is lost, and with $0 the run is over
assert.equal(run.phase, 'lost');
const broke = E.newRun();
broke.bankroll = 2;
assert.equal(E.strands(broke, 'remove'), true); // spending your last $2 ends the run

// A full hand: deal, discard, draw, pay out
const r = E.newRun();
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
E.deal(r, rand);
assert.equal(r.bankroll, 15);
assert.equal(r.round.cards.length, 5);
assert.equal(E.trash(r, r.round.cards.slice(0, 2)).length, 2);
const res = E.draw(r);
assert.equal(r.bankroll, 15 + (res.mult < 0 ? 0 : 10 + 10 * res.mult));
assert.equal(r.hand, 2);

// Discard limit: deck size − 5
const small = E.newRun();
small.deck = small.deck.slice(0, 7);
E.deal(small, rand);
assert.equal(E.trash(small, small.round.cards).length, 2);

// Boss hands: pay at least the target to move on, anything less ends the run
const bossRun = (cards, level = 1, upgrades = {}) => {
  const g = E.newRun();
  g.level = level;
  g.hand = 5;
  g.bankroll = 10 ** 6;
  g.upgrades = upgrades;
  g.deck = hand(cards).map((c, i) => ({ ...c, id: i + 1, copy: 0 }));
  E.deal(g, rand);
  return [g, E.draw(g)];
};
let [g, gr] = bossRun('2♣ 2♦ 7♠ 4♥ 3♣', 1, { pair: 1 }); // pair doubled to 2x, boss 1 needs 2x
assert.equal(gr.outcome, 'beat');
assert.deepEqual([g.level, g.hand, g.phase], [2, 1, 'bet']);
assert.equal(g.bankroll, 10 ** 6 + 20 * 2); // the boss bets $20 on level 1
[g, gr] = bossRun('7♣ 7♦ 4♠ 2♥ 3♣'); // pair 1x < 2x
assert.equal(gr.outcome, 'lose');
assert.equal(g.phase, 'lost');
assert.equal(g.lostTo, 2);
[g, gr] = bossRun('7♣ 7♦ 2♠ 2♥ 3♣'); // two pair 2x + pair 1x = 3x
assert.equal(gr.mult, 3);
assert.equal(gr.outcome, 'beat');
assert.deepEqual(gr.matches.map((m) => [m.id, m.mult]), [['two-pair', 2], ['pair', 1]]);
[g, gr] = bossRun('7♣ 7♦ 7♠ 2♥ 2♣', 4, { pair: 2 }); // full house 8 + trips 4 + two pair 2 + pair 1×4 = 18x
assert.equal(gr.mult, 18);
assert.equal(g.bankroll, 10 ** 6 + 1280 * 18);
[g, gr] = bossRun('2♣ 7♣ 9♣ J♣ K♣', 8, { flush: 9 }); // 12x × 2^9 = 6,144x
assert.equal(gr.mult, 6144);
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
assert.deepEqual(E.prices(cs), { remove: 2, duplicate: 2, suit: 3 });
const kh = cs.deck.find((c) => c.rank === 13 && c.suit === 'H' && c.copy === 0);
E.buy(cs, 'remove', kh.id);
E.buy(cs, 'suit', kc.id, 'C'); // back to clubs, where no king is left
assert.deepEqual([kc.suit, kc.copy], ['C', 0]);
assert.throws(() => E.buy(cs, 'suit', kc.id, 'C'));

// Boss cards: when the boss hand comes up, the boss adds as many random cards as its level
const bc = E.newRun();
bc.level = 3;
bc.hand = 4;
bc.bankroll = 10 ** 6;
E.deal(bc, rand);
const before = bc.deck.length;
const hand4 = E.draw(bc, rand);
assert.equal(bc.hand, 5);
assert.equal(hand4.bossCards.length, 3);
assert.equal(bc.deck.length, before + 3);
assert.deepEqual(bc.deck.slice(-3).map((c) => c.id), hand4.bossCards.map((c) => c.id));
assert.equal(new Set(bc.deck.map((c) => c.id)).size, bc.deck.length); // ids stay unique
for (const c of hand4.bossCards) assert.equal(c.copy > 0, true); // a full deck already has every card, so each is a copy
const early = E.newRun();
early.bankroll = 10 ** 6;
E.deal(early, rand);
assert.equal(E.draw(early, rand).bossCards, undefined); // hand 1 → 2: no boss yet

console.log('engine ok');
