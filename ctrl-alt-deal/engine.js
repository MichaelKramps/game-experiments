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
  const BASE_MIN_BET = 1;
  const BASE_MAX_BET = 10;
  const BET_GROWTH = 4; // min and max bet multiply by this each level
  const PAYOUT_FLOOR = -1;
  const SHOP_BASE_PRICE = 2;
  const PAYOUT_BASE_PRICE = 10; // Increase Hand Payout
  const SHOP_PRICE_GROWTH = 1.5;
  const PAYOUT_PRICE_GROWTH = 3; // Increase Hand Payout triples each time
  const LOG_SIZE = 30;

  const SUITS = ['S', 'H', 'D', 'C'];
  const SUIT_NAMES = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
  const RANK_LABELS = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const RANK_WORDS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'jack', 12: 'queen', 13: 'king', 14: 'ace' };

  // Best first. `base` is the starting payout multiple, and also how much each
  // Increase Hand Payout adds to it.
  const HANDS = [
    { id: 'flush-five', name: 'Flush Five', base: 60 },
    { id: 'five-kind', name: 'Five of a kind', base: 40 },
    { id: 'straight-flush', name: 'Straight flush', base: 25 },
    { id: 'four-kind', name: 'Four of a kind', base: 12 },
    { id: 'full-house', name: 'Full house', base: 7 },
    { id: 'flush', name: 'Flush', base: 5 },
    { id: 'straight', name: 'Straight', base: 4 },
    { id: 'three-kind', name: 'Three of a kind', base: 3 },
    { id: 'two-pair', name: 'Two pair', base: 2 },
    { id: 'pair', name: 'Pair', base: 1 },
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

  // The highest-ranked category the 5 cards qualify for.
  function evaluate(cards) {
    const counts = {};
    for (const c of cards) counts[c.rank] = (counts[c.rank] || 0) + 1;
    const groups = Object.values(counts).sort((a, b) => b - a);
    const flush = cards.every((c) => c.suit === cards[0].suit);
    const straight = isStraight(cards.map((c) => c.rank));

    let id = 'nothing';
    if (groups[0] === 5) id = flush ? 'flush-five' : 'five-kind';
    else if (straight && flush) id = 'straight-flush';
    else if (groups[0] === 4) id = 'four-kind';
    else if (groups[0] === 3 && groups[1] === 2) id = 'full-house';
    else if (flush) id = 'flush';
    else if (straight) id = 'straight';
    else if (groups[0] === 3) id = 'three-kind';
    else if (groups[0] === 2 && groups[1] === 2) id = 'two-pair';
    else if (groups[0] === 2) id = 'pair';
    return HAND_BY_ID[id];
  }

  // The hand's payout multiple in this run: its base, doubled for each
  // Increase Hand Payout bought for it. Nothing can't be upgraded.
  function multiple(run, handId) {
    const base = HAND_BY_ID[handId].base;
    if (handId === NOTHING.id) return base;
    return base * 2 ** (run.upgrades?.[handId] || 0);
  }

  function isGateHand(hand) {
    return hand === HANDS_PER_LEVEL;
  }

  // Each level's boss (gate) hand: the payout multiple it must reach. Pay at
  // least this and you move on; anything less ends the run.
  const BOSS_TARGETS = [1, 3, 6, 10, 18, 32, 60, 120];

  function bossTarget(level) {
    return BOSS_TARGETS[level - 1];
  }

  // -------------------------------------------------------------------------
  // Betting

  function levelMinBet(level) {
    return BASE_MIN_BET * BET_GROWTH ** (level - 1);
  }

  function levelMaxBet(level) {
    return BASE_MAX_BET * BET_GROWTH ** (level - 1);
  }

  // The bet range for the run's next hand, given a bankroll (defaults to the
  // run's own; the shop passes a lower one to see whether a purchase strands it).
  function betRange(run, bankroll = run.bankroll) {
    const min = levelMinBet(run.level);
    const max = levelMaxBet(run.level);
    return { min, max: Math.min(max, bankroll), fixed: false, covered: bankroll >= min };
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
      payout: price(run.bought.payout || 0, PAYOUT_BASE_PRICE, PAYOUT_PRICE_GROWTH),
    };
  }

  // Why a purchase can't happen right now, or null if it can.
  function shopBlock(run, action) {
    if (run.phase !== 'bet') return run.phase === 'hold' ? 'The shop opens again after this hand.' : 'The run is over.';
    if (action === 'remove' && run.deck.length <= MIN_DECK_SIZE) return `Your deck is at the minimum of ${MIN_DECK_SIZE} cards.`;
    if (run.bankroll < prices(run)[action]) return "You can't afford it.";
    return null;
  }

  // True if buying this would leave the bankroll below the next minimum bet.
  function strands(run, action) {
    return !betRange(run, run.bankroll - prices(run)[action]).covered;
  }

  // `suit` is the new suit for 'suit' (Change suit); other actions ignore it.
  // 'payout' (Increase Hand Payout) takes a hand id in place of a card id.
  function buy(run, action, cardId, suit) {
    const block = shopBlock(run, action);
    if (block) throw new Error(block);
    if (action === 'payout') {
      const handId = cardId;
      if (!HAND_BY_ID[handId] || handId === NOTHING.id) throw new Error('Pick a hand.');
      const cost = prices(run).payout;
      run.bankroll -= cost;
      run.bought.payout = (run.bought.payout || 0) + 1;
      run.upgrades = { ...run.upgrades, [handId]: (run.upgrades?.[handId] || 0) + 1 };
      checkLost(run);
      return { cost, added: null };
    }
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
      lastBet: null,
    };
  }

  function maxDiscards(run) {
    return run.deck.length - HAND_SIZE;
  }

  function deal(run, bet, rand) {
    if (run.phase !== 'bet') throw new Error('Not ready to deal.');
    const range = betRange(run);
    if (!Number.isInteger(bet) || bet < range.min || bet > range.max) throw new Error(`Bet must be $${range.min}–$${range.max}.`);
    run.bankroll -= bet;
    run.lastBet = bet;
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

  // Replace each trashed card with the next one from the deck, then score,
  // pay out and move the run along.
  function draw(run) {
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
    const made = evaluate(cards);
    const mult = multiple(run, made.id);
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

    if (!r.gate) run.hand++;
    else if (outcome === 'lose') {
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
    if (run.phase === 'bet' && !betRange(run).covered) run.phase = 'lost';
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
    evaluate,
    multiple,
    isGateHand,
    BOSS_TARGETS,
    bossTarget,
    levelMinBet,
    levelMaxBet,
    betRange,
    price,
    prices,
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
