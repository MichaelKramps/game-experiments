// Sanity checks for the rules in engine.js. Run: node ctrl-alt-deal/tools/check-engine.js

const assert = require('node:assert/strict');
const E = require('../engine.js');

const SUIT = { '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C' };
const RANK = { J: 11, Q: 12, K: 13, A: 14 };
const hand = (s) =>
  s.split(' ').map((t) => ({ rank: RANK[t.slice(0, -1)] || Number(t.slice(0, -1)), suit: SUIT[t.slice(-1)] }));
const scores = (s, id) => assert.equal(E.evaluate(hand(s)).id, id, s);

scores('A♠ A♠ A♠ A♠ A♠', 'five-kind');
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
matched('A♠ A♠ A♠ A♠ A♠', ['five-kind', 'four-kind', 'flush', 'three-kind', 'pair']);
matched('7♣ 7♦ 2♠ 2♥ 3♣', ['two-pair', 'pair']);
matched('7♣ 7♦ 7♠ 2♥ 3♣', ['three-kind', 'pair']);
matched('2♣ 4♦ 6♠ 8♥ 10♣', ['nothing']);
// `includes` agrees with what each best hand matches in plain (not one-suit) cards
for (const [s, id] of [['K♣ K♦ K♠ 2♥ 2♣', 'full-house'], ['K♣ K♦ K♠ K♥ 2♣', 'four-kind'], ['A♠ A♥ A♠ A♠ A♠', 'five-kind'], ['9♥ 10♥ J♥ Q♥ K♥', 'straight-flush'], ['7♣ 7♦ 7♠ 2♥ 3♣', 'three-kind'], ['7♣ 7♦ 2♠ 2♥ 3♣', 'two-pair']]) {
  assert.deepEqual(new Set(E.matches(hand(s)).map((h) => h.id)), new Set([id, ...E.HANDS.find((h) => h.id === id).includes]), s);
}
const base = E.newRun();
assert.equal(E.total(base, 'full-house'), 8 + 4 + 2 + 1);
assert.equal(E.total(base, 'pair'), 1);
assert.equal(E.total(base, 'nothing'), 0); // Nothing pays $0

// Paytable and Increase Hand Payout: each purchase adds the hand's base payout
const up = E.newRun();
up.bankroll = 100;
assert.equal(E.multiple(up, 'pair'), 1);
assert.equal(E.multiple(up, 'nothing'), 0);
E.buy(up, 'payout', 'full-house');
E.buy(up, 'payout', 'full-house');
assert.equal(E.multiple(up, 'full-house'), 24); // 8 + 8 + 8
E.buy(up, 'payout', 'four-kind');
assert.equal(E.multiple(up, 'four-kind'), 70); // $350 → $700
// Each hand has its own price: $2, ×1.5 each time it's upgraded; other hands don't change it
assert.equal(up.bankroll, 100 - 2 - 3 - 2);
assert.equal(E.payoutPrice(up, 'full-house'), 5); // 2 × 1.5² = 4.5, rounded up
assert.equal(E.payoutPrice(up, 'pair'), 2);
E.buy(up, 'payout', 'pair');
assert.deepEqual([E.payoutPrice(up, 'pair'), E.payoutPrice(up, 'full-house')], [3, 5]);
up.upgrades.pair = 3;
assert.equal(E.payoutPrice(up, 'pair'), 7); // 2 × 1.5³ = 6.75, rounded up
assert.equal(E.priceOf(up, 'payout'), 2); // no hand: the cheapest
const poor = E.newRun();
poor.bankroll = 4;
E.buy(poor, 'payout', 'pair'); // $2, leaves $2; pair now costs $3
assert.equal(E.shopBlock(poor, 'payout', 'pair'), "You can't afford it.");
assert.equal(E.shopBlock(poor, 'payout', 'flush'), null); // $2
assert.throws(() => E.buy(poor, 'payout', 'pair'));
assert.throws(() => E.buy(E.newRun(), 'payout', 'nothing'));
assert.deepEqual(E.BOSS_TARGETS.length, E.LEVELS);
assert.equal(E.bossTarget(Object.assign(E.newRun(), { level: 8 })), 25000);

// Shop prices
assert.deepEqual([...Array(10).keys()].map((n) => E.price(n)), [2, 3, 5, 7, 11, 16, 23, 35, 52, 77]);

// No bets: dealing costs nothing, and spending your last dollar doesn't end the run
const broke = E.newRun();
broke.bankroll = 2;
E.buy(broke, 'remove', broke.deck[0].id);
assert.deepEqual([broke.bankroll, broke.phase], [0, 'bet']);
E.deal(broke, Math.random);
assert.equal(broke.phase, 'hold');

// A full hand: deal, discard, draw, pay out
const r = E.newRun();
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
E.deal(r, rand);
assert.equal(r.bankroll, 0); // $0 to start, and dealing is free
assert.equal(r.round.cards.length, 5);
assert.equal(E.trash(r, r.round.cards.slice(0, 2)).length, 2);
const res = E.draw(r);
assert.equal(res.paid, res.mult * 10); // $10 per 1x
assert.equal(r.bankroll, res.paid);
assert.equal(r.hand, 2);

// Discard limit: deck size − 5
const small = E.newRun();
small.deck = small.deck.slice(0, 7);
E.deal(small, rand);
assert.equal(E.trash(small, small.round.cards).length, 2);

// Boss: after the 5th hand the bankroll must reach the threshold
const bossRun = (cards, level = 1, upgrades = {}, bankroll = 0) => {
  const g = E.newRun();
  g.level = level;
  g.hand = 5;
  g.bankroll = bankroll;
  g.upgrades = upgrades;
  g.deck = hand(cards).map((c, i) => ({ ...c, id: i + 1, copy: 0 }));
  E.deal(g, rand);
  return [g, E.draw(g, rand)];
};
let [g, gr] = bossRun('7♣ 7♦ 2♠ 2♥ 3♣', 1, {}, 10); // two pair 2x + pair 1x = $30, $10 + $30 = $40 ≥ $20
assert.deepEqual([gr.mult, gr.paid, gr.outcome, gr.bankroll], [3, 30, 'beat', 40]);
assert.deepEqual([g.level, g.hand, g.bankroll, g.phase], [2, 1, 40, 'bet']); // the whole bankroll carries into level 2
[g, gr] = bossRun('2♣ 4♦ 6♠ 8♥ 10♣', 1, {}, 19); // Nothing: $19 < $20
assert.deepEqual([gr.outcome, g.phase, g.lostTo], ['lose', 'lost', 20]);
[g, gr] = bossRun('2♣ 4♦ 6♠ 8♥ 10♣', 1, {}, 100); // Nothing pays $0, but the bankroll already clears it
assert.deepEqual([gr.paid, gr.outcome], [0, 'beat']);
[g, gr] = bossRun('7♣ 7♦ 7♠ 2♥ 2♣', 4, { pair: 2 }); // full house 8 + trips 4 + two pair 2 + pair 1×3 = 17x = $170 < $1,000
assert.deepEqual([gr.mult, gr.paid, gr.outcome], [17, 170, 'lose']);
[g, gr] = bossRun('2♣ 7♣ 9♣ J♣ K♣', 8, { flush: 208 }); // 12x × 209 = $25,080 ≥ $25,000
assert.deepEqual([g.phase, g.level, g.bankroll], ['won', 8, 25080]);

// Duplicate and remove
const s = E.newRun();
s.bankroll = 40;
const ks = s.deck.find((c) => c.rank === 13 && c.suit === 'C');
E.buy(s, 'duplicate', ks.id);
E.buy(s, 'duplicate', ks.id);
assert.equal(s.deck.length, 54);
assert.deepEqual(s.deck.slice(-2).map((c) => c.copy), [1, 2]);
assert.equal(s.bankroll, 35);
E.buy(s, 'remove', ks.id);
assert.equal(s.deck.length, 53);
assert.equal(E.prices(s).remove, 3);

// Change suit: own price counter; becomes a copy if that card already exists
const cs = E.newRun();
cs.bankroll = 40;
const kc = cs.deck.find((c) => c.rank === 13 && c.suit === 'C');
E.buy(cs, 'suit', kc.id, 'H');
assert.deepEqual([kc.suit, kc.copy], ['H', 1]); // KH was already in the deck
assert.equal(cs.deck.length, 52);
assert.equal(cs.bankroll, 38);
assert.deepEqual([E.prices(cs).remove, E.prices(cs).duplicate, E.prices(cs).suit], [2, 2, 3]);
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

// Run settings: defaults fill in, Extra draw beats No draw, hand size stays 5–10
assert.deepEqual(E.settingsOf({}), E.DEFAULT_SETTINGS);
assert.equal(E.cleanSettings({ extraDraw: true, noDraw: true }).noDraw, false);
assert.equal(E.cleanSettings({ handSize: 12 }).handSize, 10);
assert.equal(E.countsForAchievements({ difficulty: 'easy' }), false);
assert.equal(E.countsForAchievements({ difficulty: 'hard', handSize: 10, interest: true }), true);

// Starting decks
const deckOf = (deck, extra = {}) => E.newRun({ deck, ...extra }, rand).deck;
assert.equal(deckOf('standard').length, 52);
assert.deepEqual([deckOf('numbers').length, deckOf('numbers').every((c) => c.rank <= 10)], [36, true]);
assert.deepEqual([deckOf('face').length, deckOf('face').every((c) => c.rank >= 11)], [16, true]);
assert.equal(deckOf('half').length, 26);
assert.deepEqual(deckOf('straight').map((c) => c.rank).sort((a, b) => a - b), E.RANKS);
assert.equal(deckOf('random').length, 52);
assert.equal(deckOf('corrupted').length, 65);
const ff = deckOf('flush-five', { handSize: 7 });
assert.equal(ff.length, 7); // as many copies as the hand size
assert.equal(new Set(ff.map(E.cardLabel)).size, 1);
assert.deepEqual(ff.map((c) => c.copy), [0, 1, 2, 3, 4, 5, 6]);
for (const d of E.DECKS) {
  const ids = deckOf(d.id).map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, d.id);
}

// Skip-rank straights: each step may jump one rank; still 5 different ranks
assert.equal(E.isStraight([2, 4, 6, 7, 9]), false);
assert.equal(E.isStraight([2, 4, 6, 7, 9], true), true);
assert.equal(E.isStraight([2, 4, 6, 7, 10], true), false); // 7 → 10 skips two
assert.equal(E.isStraight([14, 3, 5, 7, 9], true), true); // ace low
assert.equal(E.isStraight([2, 3, 4, 5, 6], true), true);

// Bigger hands score their best 5
const big = E.newRun({ handSize: 7 });
const best = E.bestFive(big, hand('2♣ 7♣ 9♣ J♣ K♣ K♦ 3♥'));
assert.equal(best.found[0].id, 'flush');
assert.equal(best.cards.length, 5);

// Hand size: deals that many, and the deck can't shrink below it
const seven = E.newRun({ handSize: 7 });
seven.bankroll = 1000;
E.deal(seven, rand);
assert.equal(seven.round.cards.length, 7);
assert.equal(E.maxDiscards(seven), 45);
assert.equal(E.draw(seven, rand).cards.length, 7);
const tight = E.newRun({ handSize: 7 });
tight.deck = tight.deck.slice(0, 7);
assert.equal(E.shopBlock(tight, 'remove'), 'Your deck is at the minimum of 7 cards.');

// No draw: nothing can be replaced. Extra draw: a second draw before scoring
const nd = E.newRun({ noDraw: true });
E.deal(nd, rand);
assert.equal(E.trash(nd, nd.round.cards).length, 0);
assert.equal(E.draw(nd, rand).partial, undefined);
assert.equal(nd.hand, 2);
const xd = E.newRun({ extraDraw: true });
E.deal(xd, rand);
E.trash(xd, xd.round.cards.slice(0, 2));
const first = E.draw(xd, rand);
assert.equal(first.partial, true);
assert.deepEqual([xd.phase, xd.round.drawsLeft, xd.round.trashed.length], ['hold', 1, 0]);
E.trash(xd, xd.round.cards.slice(0, 1));
const second = E.draw(xd, rand);
assert.equal(second.drawn.length, 3);
assert.equal(xd.phase, 'bet');
const xk = E.newRun({ extraDraw: true });
E.deal(xk, rand);
assert.equal(E.draw(xk, rand).partial, undefined); // keeping the hand scores it at once

// Difficulty: on Normal and Hard every boss adds as many cards as its level;
// on Easy none. Thresholds come from the difficulty.
const bossCards = (difficulty) => {
  const b = E.newRun({ difficulty });
  b.level = 3;
  b.hand = 4;
  b.bankroll = 10 ** 6;
  E.deal(b, rand);
  return E.draw(b, rand).bossCards;
};
assert.deepEqual(['easy', 'normal', 'hard'].map((d) => bossCards(d).length), [0, 3, 3]);
assert.equal(bossCards('normal').every((c) => c.boss && !c.locked), true);
const at = (difficulty, level) => E.bossTarget(Object.assign(E.newRun({ difficulty }), { level }));
assert.deepEqual([at('easy', 4), at('normal', 4)], [1000, 1000]);
assert.deepEqual([at('hard', 1), at('hard', 8)], [25, 50000]);
// Boss cards can be deleted and changed like any other
const bk = E.newRun();
bk.bankroll = 100;
bk.deck[0].boss = true;
assert.equal(E.shopBlock(bk, 'suit', bk.deck[0].id), null);

// Interest: 10% of the bankroll after each hand
const it = E.newRun({ interest: true });
it.bankroll = 1000;
E.deal(it, rand);
const itr = E.draw(it, rand);
assert.equal(itr.interest, Math.floor((1000 + itr.paid) * 0.1));
assert.equal(it.bankroll, 1000 + itr.paid + itr.interest);

// Free Duplicate: costs nothing and adds a random card too
const fd = E.newRun({ freeDuplicate: true });
assert.equal(E.prices(fd).duplicate, 0);
const fdr = E.buy(fd, 'duplicate', fd.deck[0].id, null, rand);
assert.deepEqual([fdr.cost, fdr.added.length, fd.deck.length, fd.bankroll], [0, 2, 54, 0]); // free, so the $0 bankroll is untouched

// Shop tools are off unless chosen for the run
const plain = E.newRun();
assert.equal(E.shopBlock(plain, 'rankUp'), 'That tool is off for this run.');
const tools = E.newRun({ rankUp: true, rankDown: true, split: true, bonus: true, doubleBet: true });
tools.bankroll = 10 ** 6;
const aceS = tools.deck.find((c) => c.rank === 14 && c.suit === 'S');
E.buy(tools, 'rankUp', aceS.id); // ranks wrap: A → 2
assert.deepEqual([aceS.rank, aceS.copy], [2, 1]); // 2S was already there, so it's a copy
E.buy(tools, 'rankDown', aceS.id); // 2 → A, and no ace of spades is left
assert.deepEqual([aceS.rank, aceS.copy], [14, 0]);
const twoH = tools.deck.find((c) => c.rank === 2 && c.suit === 'H');
twoH.boss = true;
const split = E.buy(tools, 'split', twoH.id); // 2 → A and 3, same suit
assert.deepEqual(split.added.map((c) => [c.rank, c.suit, c.boss]), [[14, 'H', true], [3, 'H', true]]);
assert.equal(tools.deck.includes(twoH), false);
assert.equal(tools.stats.bossDeleted, 0); // splitting isn't deleting
assert.equal(tools.deck.length, 53);
const kingD = tools.deck.find((c) => c.rank === 13 && c.suit === 'D');
E.buy(tools, 'bonus', kingD.id);
assert.equal(kingD.bonus, true);
assert.throws(() => E.buy(tools, 'bonus', kingD.id)); // one 2x per card
assert.deepEqual([E.price(0, 2, 4), E.prices(tools).bonus], [2, 8]);

// 2x cards: each one in the hand doubles the payout, even if it isn't scored; not on Nothing
const bonusHand = (s, bonuses) => {
  const g = E.newRun();
  g.bankroll = 1000;
  g.deck = hand(s).map((c, i) => ({ ...c, id: i + 1, copy: 0, bonus: i < bonuses }));
  E.deal(g, rand);
  return E.draw(g, rand);
};
assert.equal(bonusHand('3♦ 7♣ 7♦ 2♠ 2♥', 1).mult, 6); // two pair 3x, 3♦ isn't in a pair but still counts
assert.equal(bonusHand('3♦ 7♣ 7♦ 2♠ 2♥', 2).mult, 12);
assert.equal(bonusHand('2♣ 4♦ 6♠ 8♥ 10♣', 2).mult, 0);

// Double payout: boss hands pay double, other hands don't
const dbHand = (hand5, settings) => {
  const g = E.newRun(settings);
  g.hand = hand5 ? 5 : 1;
  g.bankroll = 1000;
  g.deck = hand('7♣ 7♦ 2♠ 2♥ 3♣').map((c, i) => ({ ...c, id: i + 1, copy: 0 }));
  E.deal(g, rand);
  return E.draw(g, rand);
};
assert.deepEqual([dbHand(true, { doubleBet: true }).paid, dbHand(false, { doubleBet: true }).paid, dbHand(true, {}).paid], [60, 30, 30]); // two pair $30

// Achievements
const ach = (run) => run.achieved;
assert.deepEqual(ach(E.newRun({ deck: 'numbers' })), ['numbers-only']);
assert.deepEqual(ach(E.newRun({ deck: 'half' })), ['small-deck']);
assert.ok(['small-deck', 'five-card-deck'].every((id) => ach(E.newRun({ deck: 'flush-five' })).includes(id)));
assert.deepEqual(ach(E.newRun({ deck: 'flush-five', difficulty: 'easy' })), []); // Easy earns nothing…
const easyWin = E.newRun({ difficulty: 'easy' });
easyWin.phase = 'won';
assert.deepEqual(E.checkAchievements(easyWin), ['beat-easy']); // …except Beat Easy mode
const finalWin = (cards, settings = {}, upgrades = {}) => {
  const g = E.newRun(settings);
  g.level = 8;
  g.hand = 5;
  g.bankroll = 10 ** 6;
  g.upgrades = upgrades;
  g.deck = hand(cards).map((c, i) => ({ ...c, id: i + 1, copy: 0 }));
  E.deal(g, rand);
  E.draw(g, rand);
  return g;
};
// (a $1M bankroll clears the last boss whatever the hand)
const fk = finalWin('A♠ A♥ A♦ A♣ A♠', {}, { 'five-kind': 8 }); // 110x × 9 + 40x = 1,030x = $10,300
assert.equal(fk.phase, 'won');
for (const id of ['final-pair', 'final-five-kind', 'win-no-duplicate', 'win-no-delete', 'beat-normal', 'finish-run', 'keep-boss-cards', 'hand-5000', 'win-no-pair-upgrade', 'five-card-deck', 'small-deck']) {
  assert.ok(fk.achieved.includes(id), id); // five of a kind also pays a pair
}
assert.equal(fk.achieved.includes('final-flush'), false);
const sf = finalWin('9♥ 10♥ J♥ Q♥ K♥', { difficulty: 'hard' }, { straight: 1500 }); // 10x × 1,501 × $10 = $150,100 on one hand
for (const id of ['final-straight', 'final-flush', 'boss-straight', 'straight-flush', 'beat-hard', 'straight-20', 'straight-1280', 'big-bet']) assert.ok(sf.achieved.includes(id), id);
// Just short: straight $400 and $900, a $9,200 hand type, $14,990 on one hand
const near = E.newRun();
near.upgrades = { straight: 3, 'five-kind': 7 }; // five of a kind 110x × 8 + 40x = 920x
E.checkAchievements(near);
assert.equal(['straight-20', 'straight-1280', 'hand-5000'].some((id) => near.achieved.includes(id)), false);
near.upgrades.straight = 4;
E.checkAchievements(near);
assert.deepEqual(['straight-20', 'straight-1280'].map((id) => near.achieved.includes(id)), [true, false]);
near.upgrades.straight = 9;
E.checkAchievements(near);
assert.equal(near.achieved.includes('straight-1280'), true); // $1,000
near.last = { paid: 14990, matches: [] };
E.checkAchievements(near);
assert.equal(near.achieved.includes('big-bet'), false);
near.last = { paid: 15000, matches: [] };
E.checkAchievements(near);
assert.equal(near.achieved.includes('big-bet'), true);
const lost = E.newRun();
lost.hand = 5;
lost.bankroll = 0; // and Nothing pays $0, short of $20
lost.deck = hand('2♣ 4♦ 6♠ 8♥ 10♣').map((c, i) => ({ ...c, id: i + 1, copy: 0 }));
E.deal(lost, rand);
E.draw(lost, rand);
assert.deepEqual(lost.achieved.filter((id) => ['lose-boss', 'finish-run'].includes(id)), ['lose-boss', 'finish-run']);
const bd = E.newRun();
bd.bankroll = 99000;
bd.bought.duplicate = 16; // the 17th duplicate costs $1,314 (the 16th $876)
E.buy(bd, 'duplicate', bd.deck[0].id);
assert.ok(bd.achieved.includes('big-duplicate'));
assert.ok(!bd.achieved.includes('billion')); // under $100,000 isn't enough
bd.bankroll = 100000;
E.checkAchievements(bd);
assert.ok(bd.achieved.includes('billion'));
const boss = E.newRun();
boss.bankroll = 40;
boss.deck[0].boss = true;
E.buy(boss, 'remove', boss.deck[0].id);
assert.equal(boss.stats.bossDeleted, 1);
assert.equal(E.isUnlocked([], 'deck', 'standard'), true);
assert.equal(E.isUnlocked([], 'deck', 'numbers'), false);
assert.equal(E.isUnlocked(['numbers-only'], 'deck', 'numbers'), true);
assert.equal(E.isUnlocked([], 'handSize', 5), true);
assert.equal(E.isUnlocked(['final-pair'], 'handSize', 6), true);
// every option besides the defaults has exactly one achievement
const unlocks = E.ACHIEVEMENTS.map((a) => a.unlock.join('='));
assert.equal(new Set(unlocks).size, E.ACHIEVEMENTS.length);
assert.equal(E.ACHIEVEMENTS.length, 28);

// Odds displays
const odds = E.dealOdds(E.newRun(), 2000);
assert.ok(Math.abs(odds.best.pair - 0.42) < 0.05, `pair ${odds.best.pair}`);
assert.ok(odds.contains.pair > odds.best.pair);
// With bigger hands, a hand counts if any 5 of the dealt cards make it, not just the scored 5
const bigOdds = E.dealOdds(E.newRun({ handSize: 10 }), 400);
assert.ok(bigOdds.contains.pair > 0.9, `10-card pair ${bigOdds.contains.pair}`);
for (const h of E.HANDS) for (const inc of h.includes) assert.ok((bigOdds.contains[inc] || 0) >= (bigOdds.contains[h.id] || 0) - 1e-9, `${inc} ≥ ${h.id}`);
const tenHand = E.bestFive(E.newRun({ handSize: 10 }), hand('2♥ 5♥ 8♥ J♥ K♥ 3♣ 3♦ 9♠ 9♣ 9♦'));
assert.deepEqual([...tenHand.contains].sort(), ['flush', 'full-house', 'pair', 'three-kind', 'two-pair'].sort());
const dr = E.newRun();
E.deal(dr, rand);
const d = E.drawOdds(dr);
assert.equal(d.left, 47);
assert.ok(Math.abs(Object.values(d.suits).reduce((a, b) => a + b, 0) - 1) < 1e-9);


// Make a flush five: there's no Flush Five hand, so it's five of a kind that also pays Flush
for (const [s, earned] of [['A♠ A♠ A♠ A♠ A♠', true], ['A♠ A♥ A♠ A♠ A♠', false]]) {
  const g = E.newRun();
  g.deck = hand(s).map((c, i) => ({ ...c, id: i + 1, copy: 0 }));
  E.deal(g, rand);
  E.draw(g, rand);
  assert.equal(g.achieved.includes('flush-five'), earned, s);
}

console.log('engine ok');
