// Ctrl+Alt+Deal rules: run state, betting, hand scoring, payouts and the shop.
// No DOM here, so tools/check-engine.js can run it under node.
//
// A run is one plain object (saved to localStorage as JSON). Cards are
// { id, rank, suit, copy }: rank 2–14 (14 = ace), suit S/H/D/C, and copy is
// 0 for an original or n for the nth duplicate of that rank+suit, which is
// what the file browser uses to name it ("king-clubs - Copy.card" and so on).

const Engine = (() => {
  const STARTING_BANKROLL = 25;
  const LEVELS = 8;
  const HANDS_PER_LEVEL = 5; // the 5th is the gate hand
  const HAND_SIZE = 5;
  const MIN_DECK_SIZE = 5;
  const BASE_BETS = [10, 12, 14, 16, 20]; // level 1's bet for hands 1–5 (the 5th is the boss)
  const BET_GROWTH = 4; // the bet multiplies by this each level
  const PAYOUT_FLOOR = -1;
  const SHOP_BASE_PRICE = 2;
  const PAYOUT_BASE_PRICE = 2; // Increase Hand Payout, each hand priced on its own
  const SHOP_PRICE_GROWTH = 1.5;
  const PAYOUT_OWN_GROWTH = 4; // the upgraded hand's next price goes up 4x
  const PAYOUT_OTHER_GROWTH = 1.5; // every other hand's goes up 1.5x
  const LOG_SIZE = 30;

  const SUITS = ['S', 'H', 'D', 'C'];
  const SUIT_NAMES = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
  const RANK_LABELS = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const RANK_WORDS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'jack', 12: 'queen', 13: 'king', 14: 'ace' };

  // Best first. `base` is the hand's own starting payout multiple. A hand pays
  // every hand it matches, so a full house also pays three of a kind, two pair
  // and pair. `includes` lists the smaller hands it always contains; the bases
  // are set so each hand's total roughly follows how rarely it's made.
  const HANDS = [
    { id: 'flush-five', name: 'Flush Five', base: 138, includes: ['five-kind', 'four-kind', 'flush', 'three-kind', 'pair'] },
    { id: 'five-kind', name: 'Five of a kind', base: 110, includes: ['four-kind', 'three-kind', 'pair'] },
    { id: 'straight-flush', name: 'Straight flush', base: 78, includes: ['flush', 'straight'] },
    { id: 'four-kind', name: 'Four of a kind', base: 35, includes: ['three-kind', 'pair'] },
    { id: 'full-house', name: 'Full house', base: 8, includes: ['three-kind', 'two-pair', 'pair'] },
    { id: 'flush', name: 'Flush', base: 12, includes: [] },
    { id: 'straight', name: 'Straight', base: 10, includes: [] },
    { id: 'three-kind', name: 'Three of a kind', base: 4, includes: ['pair'] },
    { id: 'two-pair', name: 'Two pair', base: 2, includes: ['pair'] },
    { id: 'pair', name: 'Pair', base: 1, includes: [] },
  ];
  const NOTHING = { id: 'nothing', name: 'Nothing', base: PAYOUT_FLOOR };
  const HAND_BY_ID = Object.fromEntries([...HANDS, NOTHING].map((h) => [h.id, h]));

  // -------------------------------------------------------------------------
  // Cards

  function rankLabel(rank) {
    return RANK_LABELS[rank] || String(rank);
  }

  // "8H", "AC": rank then suit letter. Suit symbols are never shown.
  function cardLabel(card) {
    return rankLabel(card.rank) + card.suit;
  }

  // "eight-hearts", "ace-clubs": the card's file name without extension.
  function cardSlug(card) {
    return `${RANK_WORDS[card.rank]}-${SUIT_NAMES[card.suit].toLowerCase()}`;
  }

  // Strongest first: aces on the left, 2s on the right.
  function byStrength(a, b) {
    return b.rank - a.rank || SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || a.copy - b.copy;
  }

  function standardDeck() {
    const deck = [];
    let id = 1;
    for (const suit of SUITS) for (let rank = 2; rank <= 14; rank++) deck.push({ id: id++, rank, suit, copy: 0 });
    return deck;
  }

  function shuffle(list, rand = Math.random) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Scoring

  function isStraight(ranks) {
    const distinct = [...new Set(ranks)].sort((a, b) => a - b);
    if (distinct.length !== HAND_SIZE) return false;
    if (distinct[4] - distinct[0] === 4) return true;
    return distinct.join() === '2,3,4,5,14'; // the wheel: aces count low too
  }

  // Every hand the 5 cards make, best first, each counted once: a full house
  // is also three of a kind, two pair and a pair. Nothing if none.
  function matches(cards) {
    const counts = {};
    for (const c of cards) counts[c.rank] = (counts[c.rank] || 0) + 1;
    const groups = Object.values(counts).sort((a, b) => b - a);
    const flush = cards.every((c) => c.suit === cards[0].suit);
    const straight = isStraight(cards.map((c) => c.rank));
    const made = {
      'flush-five': groups[0] === 5 && flush,
      'five-kind': groups[0] === 5,
      'straight-flush': straight && flush,
      'four-kind': groups[0] >= 4,
      'full-house': groups[0] === 3 && groups[1] === 2,
      flush,
      straight,
      'three-kind': groups[0] >= 3,
      'two-pair': groups[0] >= 2 && groups[1] >= 2,
      pair: groups[0] >= 2,
    };
    const found = HANDS.filter((h) => made[h.id]);
    return found.length ? found : [NOTHING];
  }

  // The highest-ranked hand the 5 cards make.
  function evaluate(cards) {
    return matches(cards)[0];
  }

  // The hand's payout multiple in this run: its base, doubled for each
  // Increase Hand Payout bought for it. Nothing can't be upgraded.
  function multiple(run, handId) {
    const base = HAND_BY_ID[handId].base;
    if (handId === NOTHING.id) return base;
    return base * 2 ** (run.upgrades?.[handId] || 0);
  }

  // What a hand pays in all when it's the best hand made: its own multiple
  // plus the hands it always contains. (A one-suit full house would also add
  // flush; draw scores the actual cards with matches.)
  function total(run, handId) {
    const hand = HAND_BY_ID[handId];
    return [handId, ...(hand.includes || [])].reduce((sum, id) => sum + multiple(run, id), 0);
  }

  function isGateHand(hand) {
    return hand === HANDS_PER_LEVEL;
  }

  // Each level's boss (gate) hand: the payout multiple it must reach. Pay at
  // least this and you move on; anything less ends the run.
  const BOSS_TARGETS = [2, 6, 20, 60, 175, 550, 1650, 5000];

  function bossTarget(level) {
    return BOSS_TARGETS[level - 1];
  }

  // -------------------------------------------------------------------------
  // Betting

  // The bet is set by the hand, not chosen: $10, $12, $14, $16, $20 on level 1,
  // and each hand 4x the same hand on the level before.
  function handBet(level, hand) {
    return BASE_BETS[hand - 1] * BET_GROWTH ** (level - 1);
  }

  // The next hand's bet: the hand's bet, or everything you have if that's less.
  function nextBet(run) {
    const full = handBet(run.level, run.hand);
    return { bet: Math.min(full, run.bankroll), full, allIn: run.bankroll < full };
  }

  // -------------------------------------------------------------------------
  // Shop

  function price(bought, base = SHOP_BASE_PRICE, growth = SHOP_PRICE_GROWTH) {
    return Math.ceil(base * growth ** bought);
  }

  function prices(run) {
    return {
      remove: price(run.bought.remove),
      duplicate: price(run.bought.duplicate),
      suit: price(run.bought.suit || 0), // runs saved before Change suit existed lack it
    };
  }

  // Increase Hand Payout for one hand: $2, then 4x for each time this hand
  // was upgraded and 1.5x for each time another hand was. Worked out from the
  // counts each time, so rounding doesn't compound.
  function payoutPrice(run, handId) {
    const own = run.upgrades?.[handId] || 0;
    const others = (run.bought.payout || 0) - own;
    return Math.ceil(PAYOUT_BASE_PRICE * PAYOUT_OWN_GROWTH ** own * PAYOUT_OTHER_GROWTH ** others);
  }

  // What an action costs. For 'payout' with no hand, the cheapest hand.
  function priceOf(run, action, handId) {
    if (action !== 'payout') return prices(run)[action];
    if (handId) return payoutPrice(run, handId);
    return Math.min(...HANDS.map((h) => payoutPrice(run, h.id)));
  }

  // Why a purchase can't happen right now, or null if it can.
  function shopBlock(run, action, handId) {
    if (run.phase !== 'bet') return run.phase === 'hold' ? 'The shop opens again after this hand.' : 'The run is over.';
    if (action === 'remove' && run.deck.length <= MIN_DECK_SIZE) return `Your deck is at the minimum of ${MIN_DECK_SIZE} cards.`;
    if (run.bankroll < priceOf(run, action, handId)) return "You can't afford it.";
    return null;
  }

  // True if buying this would spend your last dollar, which ends the run.
  function strands(run, action, handId) {
    return run.bankroll - priceOf(run, action, handId) <= 0;
  }

  // `suit` is the new suit for 'suit' (Change suit); other actions ignore it.
  // 'payout' (Increase Hand Payout) takes a hand id in place of a card id.
  function buy(run, action, cardId, suit) {
    if (action === 'payout') {
      const handId = cardId;
      if (!HAND_BY_ID[handId] || handId === NOTHING.id) throw new Error('Pick a hand.');
      const block = shopBlock(run, action, handId);
      if (block) throw new Error(block);
      const cost = payoutPrice(run, handId);
      run.bankroll -= cost;
      run.bought.payout = (run.bought.payout || 0) + 1;
      run.upgrades = { ...run.upgrades, [handId]: (run.upgrades?.[handId] || 0) + 1 };
      checkLost(run);
      return { cost, added: null };
    }
    const block = shopBlock(run, action);
    if (block) throw new Error(block);
    const card = run.deck.find((c) => c.id === cardId);
    if (!card) throw new Error('No such card.');
    if (action === 'suit' && (!SUITS.includes(suit) || suit === card.suit)) throw new Error('Pick a different suit.');
    const cost = prices(run)[action];
    run.bankroll -= cost;
    run.bought[action] = (run.bought[action] || 0) + 1;
    let added = null;
    if (action === 'remove') {
      run.deck = run.deck.filter((c) => c !== card);
    } else if (action === 'suit') {
      // It becomes a copy if that rank+suit is already in the deck, so file names stay unique.
      const key = card.rank + suit;
      const taken = run.deck.some((c) => c !== card && c.rank === card.rank && c.suit === suit);
      card.suit = suit;
      card.copy = taken ? (run.copies[key] = (run.copies[key] || 0) + 1) : 0;
    } else {
      const key = card.rank + card.suit;
      run.copies[key] = (run.copies[key] || 0) + 1;
      added = { id: run.nextId++, rank: card.rank, suit: card.suit, copy: run.copies[key] };
      run.deck.push(added);
    }
    checkLost(run);
    return { cost, added };
  }

  // -------------------------------------------------------------------------
  // A hand: deal, hold/discard, draw

  function newRun() {
    return {
      bankroll: STARTING_BANKROLL,
      level: 1,
      hand: 1,
      deck: standardDeck(),
      nextId: 53,
      copies: {},
      bought: { remove: 0, duplicate: 0, suit: 0, payout: 0 },
      upgrades: {}, // hand id → Increase Hand Payout purchases
      phase: 'bet', // bet → hold → bet …, ending in won or lost
      round: null, // the hand in play: { bet, gate, cards, trashed, pile }
      last: null, // the most recent finished hand
      log: [],
      handsPlayed: 0,
    };
  }

  function maxDiscards(run) {
    return run.deck.length - HAND_SIZE;
  }

  function deal(run, rand) {
    if (run.phase !== 'bet') throw new Error('Not ready to deal.');
    const { bet } = nextBet(run);
    if (bet <= 0) throw new Error('Nothing left to bet.');
    run.bankroll -= bet;
    const order = shuffle(run.deck.map((c) => c.id), rand);
    run.round = {
      bet,
      gate: isGateHand(run.hand),
      cards: order.slice(0, HAND_SIZE), // ids, in deal order
      trashed: [], // ids in `cards` the player has discarded
      pile: order.slice(HAND_SIZE),
    };
    run.phase = 'hold';
  }

  function trash(run, ids) {
    if (run.phase !== 'hold') return [];
    const moved = [];
    for (const id of ids) {
      if (!run.round.cards.includes(id) || run.round.trashed.includes(id)) continue;
      if (run.round.trashed.length >= maxDiscards(run)) break;
      run.round.trashed.push(id);
      moved.push(id);
    }
    return moved;
  }

  function restore(run, ids) {
    if (run.phase !== 'hold') return;
    run.round.trashed = run.round.trashed.filter((id) => !ids.includes(id));
  }

  function cardById(run, id) {
    return run.deck.find((c) => c.id === id);
  }

  // When a level's boss hand comes up, the boss adds as many cards as its
  // level to your deck, each a random rank and suit. One that matches a card
  // you already have becomes a copy of it, like Duplicate.
  function addBossCards(run, rand = Math.random) {
    const added = [];
    for (let i = 0; i < run.level; i++) {
      const rank = 2 + Math.floor(rand() * 13);
      const suit = SUITS[Math.floor(rand() * SUITS.length)];
      const key = rank + suit;
      const taken = run.deck.some((c) => c.rank === rank && c.suit === suit);
      const card = { id: run.nextId++, rank, suit, copy: taken ? (run.copies[key] = (run.copies[key] || 0) + 1) : 0 };
      run.deck.push(card);
      added.push({ ...card });
    }
    return added;
  }

  // Replace each trashed card with the next one from the deck, then score,
  // pay out and move the run along.
  function draw(run, rand = Math.random) {
    if (run.phase !== 'hold') throw new Error('No hand to draw.');
    const r = run.round;
    const drawn = [];
    const finalIds = r.cards.map((id) => {
      if (!r.trashed.includes(id)) return id;
      const next = r.pile.shift();
      drawn.push(next);
      return next;
    });
    const cards = finalIds.map((id) => cardById(run, id));
    const found = matches(cards);
    const made = found[0];
    const matched = found.map((h) => ({ id: h.id, name: h.name, mult: multiple(run, h.id) }));
    const mult = matched.reduce((sum, m) => sum + m.mult, 0);
    // Boss hands: pay at least the target to win and move on; anything less ends the run.
    const target = r.gate ? bossTarget(run.level) : null;
    const outcome = r.gate ? (mult >= target ? 'beat' : 'lose') : null;
    const paid = mult <= PAYOUT_FLOOR ? 0 : r.bet + r.bet * mult;
    run.bankroll += paid;
    run.handsPlayed++;

    const result = {
      level: run.level,
      hand: run.hand,
      gate: r.gate,
      cards: cards.map((c) => ({ ...c })),
      drawn,
      replaced: r.trashed.map((id) => ({ ...cardById(run, id) })),
      handId: made.id,
      handName: made.name,
      matches: matched,
      bet: r.bet,
      mult,
      net: paid - r.bet,
      target,
      outcome,
      passed: outcome === 'beat',
    };
    run.last = result;
    run.log.unshift(result);
    run.log.length = Math.min(run.log.length, LOG_SIZE);
    run.round = null;
    run.phase = 'bet';

    if (!r.gate) {
      run.hand++;
      if (isGateHand(run.hand)) result.bossCards = addBossCards(run, rand);
    } else if (outcome === 'lose') {
      run.phase = 'lost';
      run.lostTo = target;
    } else if (result.passed) {
      if (run.level === LEVELS) run.phase = 'won';
      else {
        run.level++;
        run.hand = 1;
      }
    }
    checkLost(run);
    return result;
  }

  function checkLost(run) {
    if (run.phase === 'bet' && run.bankroll <= 0) run.phase = 'lost';
  }

  return {
    LEVELS,
    HANDS_PER_LEVEL,
    HAND_SIZE,
    MIN_DECK_SIZE,
    STARTING_BANKROLL,
    SUITS,
    SUIT_NAMES,
    HANDS,
    NOTHING,
    rankLabel,
    cardLabel,
    cardSlug,
    byStrength,
    matches,
    evaluate,
    multiple,
    total,
    isGateHand,
    BOSS_TARGETS,
    bossTarget,
    BASE_BETS,
    handBet,
    nextBet,
    price,
    prices,
    payoutPrice,
    priceOf,
    shopBlock,
    strands,
    buy,
    newRun,
    maxDiscards,
    deal,
    trash,
    restore,
    cardById,
    draw,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
