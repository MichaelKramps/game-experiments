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

// Difficulty: every boss adds as many cards as its level; Easy locks none,
// Hard locks all, Normal locks each by chance
const bossCards = (difficulty) => {
  const b = E.newRun({ difficulty });
  b.level = 3;
  b.hand = 4;
  b.bankroll = 10 ** 6;
  E.deal(b, rand);
  return E.draw(b, rand).bossCards;
};
for (const d of ['easy', 'normal', 'hard']) assert.equal(bossCards(d).length, 3);
assert.equal(bossCards('normal').every((c) => c.boss), true);
assert.equal(bossCards('easy').some((c) => c.locked), false);
assert.equal(bossCards('hard').every((c) => c.locked), true);
let lockedN = 0;
for (let i = 0; i < 200; i++) lockedN += bossCards('normal').filter((c) => c.locked).length;
assert.ok(lockedN > 200 && lockedN < 400, `Normal locks about half: ${lockedN} of 600`);

// Inflation: every shop price × (1 + rate) per hand played: 0% Easy, 10% Normal, 20% Hard
for (const [difficulty, played, want] of [['easy', 10, 2], ['normal', 3, 3], ['hard', 10, 13]]) {
  const inf = E.newRun({ difficulty });
  inf.handsPlayed = played;
  assert.equal(E.prices(inf).remove, want, `${difficulty} remove`); // ceil(2 × rate^played)
  assert.equal(E.prices(inf).suit, want, `${difficulty} suit`);
  assert.equal(E.payoutPrice(inf, 'pair'), want, `${difficulty} payout`);
}
const infFree = E.newRun({ difficulty: 'hard', freeDuplicate: true });
infFree.handsPlayed = 20;
assert.equal(E.prices(infFree).duplicate, 0); // Free Duplicate stays free
const infGrow = E.newRun({ difficulty: 'normal' });
infGrow.handsPlayed = 5;
infGrow.bought.remove = 2;
assert.equal(E.prices(infGrow).remove, Math.ceil(2 * 1.5 ** 2 * 1.1 ** 5)); // stacks with the ×1.5 per purchase

// Locked cards can't be deleted, duplicated or changed
const lk = E.newRun({ rankUp: true, rankDown: true, split: true, bonus: true });
lk.bankroll = 10 ** 6;
const lockedCard = lk.deck[0];
lockedCard.locked = true;
for (const a of ['remove', 'duplicate', 'suit', 'rankUp', 'rankDown', 'split', 'bonus']) {
  assert.match(E.shopBlock(lk, a, lockedCard.id), /locked/, a);
  assert.throws(() => E.buy(lk, a, lockedCard.id, 'H'), /locked/, a);
}
assert.equal(E.shopBlock(lk, 'remove', lk.deck[1].id), null); // unlocked cards are fine
assert.equal(E.shopBlock(lk, 'remove'), null); // no card given: only the general checks
assert.equal(lk.deck.includes(lockedCard), true);
assert.equal(lk.bankroll, 10 ** 6); // nothing was bought

// Interest: 10% of the bankroll after each hand
const it = E.newRun({ interest: true });
it.bankroll = 1000;
E.deal(it, rand);
const itr = E.draw(it, rand);
assert.equal(itr.interest, Math.floor((990 + (itr.mult < 0 ? 0 : 10 + 10 * itr.mult)) * 0.1));

// Free Duplicate: costs nothing and adds a random card too
const fd = E.newRun({ freeDuplicate: true });
assert.equal(E.prices(fd).duplicate, 0);
const fdr = E.buy(fd, 'duplicate', fd.deck[0].id, null, rand);
assert.deepEqual([fdr.cost, fdr.added.length, fd.deck.length, fd.bankroll], [0, 2, 54, 25]);

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
assert.equal(bonusHand('2♣ 4♦ 6♠ 8♥ 10♣', 2).mult, -1);

// Double bet: once per level, twice the bet
const db = E.newRun({ doubleBet: true });
assert.equal(E.canDoubleBet(db), true);
E.setDoubleBet(db, true);
assert.equal(E.nextBet(db).bet, 20);
E.deal(db, rand);
assert.equal(db.round.bet, 20);
E.draw(db, rand);
assert.equal(E.canDoubleBet(db), false);
assert.throws(() => E.setDoubleBet(db, true));
assert.equal(E.canDoubleBet(E.newRun()), false);

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
const fk = finalWin('A♠ A♥ A♦ A♣ A♠', {}, { 'five-kind': 6 });
assert.equal(fk.phase, 'won');
for (const id of ['final-pair', 'final-five-kind', 'win-no-duplicate', 'win-no-delete', 'beat-normal', 'finish-run', 'keep-boss-cards', 'hand-5000', 'win-no-pair-upgrade', 'five-card-deck', 'small-deck']) {
  assert.ok(fk.achieved.includes(id), id); // five of a kind also pays a pair
}
assert.equal(fk.achieved.includes('final-flush'), false);
const sf = finalWin('9♥ 10♥ J♥ Q♥ K♥', { difficulty: 'hard' }, { straight: 14 }); // 10x × 2^14 = 163,840x;
for (const id of ['final-straight', 'final-flush', 'boss-straight', 'straight-flush', 'beat-hard', 'straight-20', 'straight-1280', 'big-bet']) assert.ok(sf.achieved.includes(id), id);
const lost = E.newRun();
lost.hand = 5;
lost.deck = hand('2♣ 4♦ 6♠ 8♥ 10♣').map((c, i) => ({ ...c, id: i + 1, copy: 0 }));
E.deal(lost, rand);
E.draw(lost, rand);
assert.deepEqual(lost.achieved.filter((id) => ['lose-boss', 'finish-run'].includes(id)), ['lose-boss', 'finish-run']);
const bd = E.newRun();
bd.bankroll = 10 ** 10;
bd.bought.duplicate = 44; // the 45th duplicate costs over $100M
E.buy(bd, 'duplicate', bd.deck[0].id);
assert.ok(bd.achieved.includes('big-duplicate'));
assert.ok(!bd.achieved.includes('billion')); // $10 billion isn't enough
bd.bankroll = 10 ** 12;
E.checkAchievements(bd);
assert.ok(bd.achieved.includes('billion'));
const boss = E.newRun();
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
