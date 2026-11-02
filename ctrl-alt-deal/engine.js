// Ctrl+Alt+Deal rules: run state, betting, hand scoring, payouts, the shop
// and achievements. No DOM here, so tools/check-engine.js can run it under node.
//
// A run is one plain object (saved to localStorage as JSON). Cards are
// { id, rank, suit, copy }: rank 2–14 (14 = ace), suit S/H/D/C, and copy is
// 0 for an original or n for the nth duplicate of that rank+suit, which is
// what the file browser uses to name it ("king-clubs - Copy.card" and so on).
// A card a boss added also has boss: true, and one with Add 2x has bonus: true.
// A locked card (locked: true) can't be deleted, duplicated or changed; only
// bosses add them.
//
// The run's settings (starting deck, hand size, difficulty, toggles) are
// chosen at New run and never change during the run.

const Engine = (() => {
  const STARTING_BANKROLL = 25;
  const LEVELS = 8;
  const HANDS_PER_LEVEL = 5; // the 5th is the gate hand
  const SCORED_CARDS = 5; // bigger hands score their best 5
  const HAND_SIZE = 5; // the default hand size
  const MAX_HAND_SIZE = 10;
  const MIN_DECK_SIZE = 5; // with 5-card hands; the minimum is always the hand size
  const BASE_BETS = [10, 12, 14, 16, 20]; // level 1's bet for hands 1–5 (the 5th is the boss)
  const BET_GROWTH = 4; // the bet multiplies by this each level
  const PAYOUT_FLOOR = -1;
  const SHOP_BASE_PRICE = 2;
  const PAYOUT_BASE_PRICE = 2; // Increase Hand Payout, each hand priced on its own
  const SHOP_PRICE_GROWTH = 1.5;
  const BONUS_PRICE_GROWTH = 4; // Add 2x doubles a whole hand, so it climbs like a payout upgrade
  const PAYOUT_OWN_GROWTH = 4; // the upgraded hand's next price goes up 4x
  const PAYOUT_OTHER_GROWTH = 1.5; // every other hand's goes up 1.5x
  const INTEREST_RATE = 0.1;
  const LOG_SIZE = 30;

  const SUITS = ['S', 'H', 'D', 'C'];
  const SUIT_NAMES = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
  const RANK_LABELS = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
  const RANK_WORDS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'jack', 12: 'queen', 13: 'king', 14: 'ace' };
  const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  // Best first. `base` is the hand's own starting payout multiple. A hand pays
  // every hand it matches, so a full house also pays three of a kind, two pair
  // and pair. `includes` lists the smaller hands it always contains; the bases
  // are set so each hand's total roughly follows how rarely it's made.
  const HANDS = [
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
  // Run settings

  const DECKS = [
    { id: 'standard', name: 'Standard deck', desc: 'The usual 52 cards.' },
    { id: 'numbers', name: 'Numbers deck', desc: '2–10 in every suit (36 cards).' },
    { id: 'face', name: 'Face deck', desc: 'J, Q, K and A in every suit (16 cards).' },
    { id: 'half', name: 'Half deck', desc: '2 of each rank in random suits (26 cards).' },
    { id: 'straight', name: 'Straight deck', desc: '1 of each rank in random suits (13 cards).' },
    { id: 'random', name: 'Random deck', desc: '52 cards, each a random rank and suit.' },
    { id: 'corrupted', name: 'Corrupted deck', desc: 'The usual 52 plus 13 random cards (65 cards).' },
    { id: 'flush-five', name: 'Flush Five deck', desc: 'Copies of one random card, as many as your hand size.' },
  ];

  // Every boss adds as many random cards as its level; difficulty sets the
  // chance each one is locked, and how much every shop price rises after
  // each hand played (inflation).
  const DIFFICULTIES = [
    { id: 'easy', name: 'Easy', desc: 'Boss cards are never locked. Prices don’t rise.', lockChance: 0, inflation: 0 },
    { id: 'normal', name: 'Normal', desc: 'Half the boss cards are locked: they can’t be deleted, duplicated or changed. Prices rise 10% after every hand.', lockChance: 0.5, inflation: 0.1 },
    { id: 'hard', name: 'Hard', desc: 'Every boss card is locked: it can’t be deleted, duplicated or changed. Prices rise 20% after every hand.', lockChance: 1, inflation: 0.2 },
  ];

  const DEFAULT_SETTINGS = {
    deck: 'standard',
    handSize: HAND_SIZE,
    difficulty: 'normal',
    // game mechanics
    extraDraw: false,
    noDraw: false,
    skipStraights: false,
    interest: false,
    freeDuplicate: false,
    // shop tools
    rankUp: false,
    rankDown: false,
    split: false,
    bonus: false,
    doubleBet: false,
    // information displays
    deckInfo: false,
    deckOdds: false,
    drawOdds: false,
    payoutInfo: false,
  };

  // The run's settings, filled in with defaults (runs saved before settings
  // existed have none) and made consistent.
  function cleanSettings(s = {}) {
    const out = { ...DEFAULT_SETTINGS, ...s };
    if (!DECKS.some((d) => d.id === out.deck)) out.deck = 'standard';
    if (!DIFFICULTIES.some((d) => d.id === out.difficulty)) out.difficulty = 'normal';
    out.handSize = Math.min(MAX_HAND_SIZE, Math.max(HAND_SIZE, Math.floor(Number(out.handSize)) || HAND_SIZE));
    if (out.extraDraw && out.noDraw) out.noDraw = false; // the two can't both be on
    for (const k of Object.keys(DEFAULT_SETTINGS)) if (typeof DEFAULT_SETTINGS[k] === 'boolean') out[k] = !!out[k];
    return out;
  }

  function settingsOf(run) {
    return cleanSettings(run.settings);
  }

  function handSize(run) {
    return settingsOf(run).handSize;
  }

  function minDeckSize(run) {
    return Math.max(MIN_DECK_SIZE, handSize(run));
  }

  // Only Easy mode stops a run from counting, and even then Beat Easy mode can be earned.
  function countsForAchievements(settings) {
    return cleanSettings(settings).difficulty !== 'easy';
  }

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

  // Ranks wrap: one above an ace is a 2, one below a 2 is an ace.
  function stepRank(rank, by) {
    return ((rank - 2 + by + 13 * 2) % 13) + 2;
  }

  // A new card for this run's deck (not added yet). It's a copy if that
  // rank+suit is already in the deck, so file names stay unique.
  function makeCard(run, rank, suit, extra = {}) {
    const key = rank + suit;
    const taken = run.deck.some((c) => c.rank === rank && c.suit === suit);
    const copy = taken ? (run.copies[key] = (run.copies[key] || 0) + 1) : 0;
    return { id: run.nextId++, rank, suit, copy, ...extra };
  }

  // After a card's rank or suit changes: an original if no other card has
  // its rank+suit, otherwise the next copy.
  function recopy(run, card) {
    const key = card.rank + card.suit;
    const taken = run.deck.some((c) => c !== card && c.rank === card.rank && c.suit === card.suit);
    card.copy = taken ? (run.copies[key] = (run.copies[key] || 0) + 1) : 0;
  }

  function randomRank(rand) {
    return RANKS[Math.floor(rand() * RANKS.length)];
  }

  function randomSuit(rand) {
    return SUITS[Math.floor(rand() * SUITS.length)];
  }

  // The starting deck's cards as [rank, suit] pairs.
  function startingCards(deck, size, rand) {
    const all = (ranks) => SUITS.flatMap((suit) => ranks.map((rank) => [rank, suit]));
    const random = (n) => Array.from({ length: n }, () => [randomRank(rand), randomSuit(rand)]);
    switch (deck) {
      case 'numbers':
        return all(RANKS.filter((r) => r <= 10));
      case 'face':
        return all(RANKS.filter((r) => r >= 11));
      case 'half':
        return RANKS.flatMap((rank) => [[rank, randomSuit(rand)], [rank, randomSuit(rand)]]);
      case 'straight':
        return RANKS.map((rank) => [rank, randomSuit(rand)]);
      case 'random':
        return random(52);
      case 'corrupted':
        return [...all(RANKS), ...random(13)];
      case 'flush-five': {
        const card = [randomRank(rand), randomSuit(rand)];
        return Array.from({ length: size }, () => card);
      }
      default:
        return all(RANKS);
    }
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

  // Five different ranks in a row; aces count high or low (the wheel) but
  // never wrap. With skip on, each step may also jump one rank (2-4-6-7-9).
  function isStraight(ranks, skip = false) {
    const distinct = [...new Set(ranks)].sort((a, b) => a - b);
    if (distinct.length !== SCORED_CARDS) return false;
    const maxGap = skip ? 2 : 1;
    const inRow = (list) => list.every((r, i) => i === 0 || r - list[i - 1] <= maxGap);
    if (inRow(distinct)) return true;
    if (!distinct.includes(14)) return false;
    return inRow([1, ...distinct.slice(0, -1)]); // the ace played low
  }

  // Every hand the 5 cards make, best first, each counted once: a full house
  // is also three of a kind, two pair and a pair. Nothing if none.
  function matches(cards, { skip = false } = {}) {
    const counts = {};
    for (const c of cards) counts[c.rank] = (counts[c.rank] || 0) + 1;
    const groups = Object.values(counts).sort((a, b) => b - a);
    const flush = cards.every((c) => c.suit === cards[0].suit);
    const straight = isStraight(cards.map((c) => c.rank), skip);
    const made = {
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

  // Every way to pick k of n things, as arrays of indexes.
  const comboCache = {};
  function combos(n, k) {
    const key = `${n},${k}`;
    if (comboCache[key]) return comboCache[key];
    const out = [];
    const pick = (start, chosen) => {
      if (chosen.length === k) return out.push([...chosen]);
      for (let i = start; i < n; i++) {
        chosen.push(i);
        pick(i + 1, chosen);
        chosen.pop();
      }
    };
    pick(0, []);
    return (comboCache[key] = out);
  }

  // The 5 of the hand's cards that pay the most in this run, and what they
  // match. Ties go to the better-ranked hand. `contains` is every hand id that
  // some 5 of the cards make (Nothing only if none make anything).
  function bestFive(run, cards) {
    const skip = settingsOf(run).skipStraights;
    if (cards.length <= SCORED_CARDS) {
      const found = matches(cards, { skip });
      return { cards, found, contains: new Set(found.map((h) => h.id)) };
    }
    let best = null;
    const contains = new Set();
    for (const idx of combos(cards.length, SCORED_CARDS)) {
      const five = idx.map((i) => cards[i]);
      const found = matches(five, { skip });
      for (const h of found) if (h !== NOTHING) contains.add(h.id);
      const sum = found.reduce((s, h) => s + multiple(run, h.id), 0);
      const rank = HANDS.indexOf(found[0]); // −1 for Nothing
      if (!best || sum > best.sum || (sum === best.sum && rank >= 0 && (best.rank < 0 || rank < best.rank))) best = { cards: five, found, sum, rank };
    }
    if (!contains.size) contains.add(NOTHING.id);
    return { ...best, contains };
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

  // How many random cards this level's boss adds: as many as its level.
  function bossCardCount(run) {
    return run.level;
  }

  // The chance each boss card is locked: 0 on Easy, half on Normal, all on Hard.
  function lockChance(run) {
    return DIFFICULTIES.find((d) => d.id === settingsOf(run).difficulty).lockChance;
  }

  // -------------------------------------------------------------------------
  // Odds (the Deck odds, Draw odds and Payout increase displays)

  // A small seeded generator, so the odds shown don't jitter between renders.
  function seeded(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // The chance a fresh deal from the current deck (no draw) is each hand
  // (`best`, by the hand's name) and contains each hand (`contains`: some 5
  // of the dealt cards make it, whatever the hand size). Simulated, with
  // fewer deals for bigger hands so it stays quick.
  function dealOdds(run, samples) {
    const size = handSize(run);
    const n = samples || Math.max(400, Math.min(3000, Math.floor(80000 / combos(size, SCORED_CARDS).length)));
    const rand = seeded(run.deck.length * 7919 + size);
    const best = {};
    const contains = {};
    for (let i = 0; i < n; i++) {
      const pool = [...run.deck];
      const cards = [];
      for (let j = 0; j < size && pool.length; j++) cards.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
      const five = bestFive(run, cards);
      best[five.found[0].id] = (best[five.found[0].id] || 0) + 1 / n;
      for (const id of five.contains) contains[id] = (contains[id] || 0) + 1 / n;
    }
    return { best, contains, samples: n };
  }

  // During a hand: each rank's and suit's share of the cards you could draw.
  function drawOdds(run) {
    const pile = run.round ? run.round.pile.map((id) => cardById(run, id)) : [];
    const ranks = {};
    const suits = {};
    for (const c of pile) {
      ranks[c.rank] = (ranks[c.rank] || 0) + 1 / pile.length;
      suits[c.suit] = (suits[c.suit] || 0) + 1 / pile.length;
    }
    return { ranks, suits, left: pile.length };
  }

  // -------------------------------------------------------------------------
  // Betting

  // The bet is set by the hand, not chosen: $10, $12, $14, $16, $20 on level 1,
  // and each hand 4x the same hand on the level before.
  function handBet(level, hand) {
    return BASE_BETS[hand - 1] * BET_GROWTH ** (level - 1);
  }

  // The next hand's bet: the hand's bet (twice it with Double bet on), or
  // everything you have if that's less.
  function nextBet(run) {
    const full = handBet(run.level, run.hand) * (run.doubleNext ? 2 : 1);
    return { bet: Math.min(full, run.bankroll), full, allIn: run.bankroll < full };
  }

  // Double bet: once per level, the next hand bets twice as much.
  function canDoubleBet(run) {
    return settingsOf(run).doubleBet && run.phase === 'bet' && run.doubledLevel !== run.level;
  }

  function setDoubleBet(run, on) {
    if (on && !canDoubleBet(run)) throw new Error('Double bet is used up for this level.');
    run.doubleNext = !!on;
  }

  // -------------------------------------------------------------------------
  // Shop

  // Shop tools a run turns on at New run; the other actions are always there.
  const TOOL_ACTIONS = ['rankUp', 'rankDown', 'split', 'bonus'];

  function price(bought, base = SHOP_BASE_PRICE, growth = SHOP_PRICE_GROWTH, factor = 1) {
    return Math.ceil(base * growth ** bought * factor);
  }

  // What every shop price is multiplied by: 1 + the difficulty's inflation,
  // once for each hand played so far (1 on Easy).
  function inflation(run) {
    const rate = DIFFICULTIES.find((d) => d.id === settingsOf(run).difficulty).inflation;
    return (1 + rate) ** (run.handsPlayed || 0);
  }

  function prices(run) {
    const b = run.bought;
    const f = inflation(run);
    return {
      remove: price(b.remove, SHOP_BASE_PRICE, SHOP_PRICE_GROWTH, f),
      duplicate: settingsOf(run).freeDuplicate ? 0 : price(b.duplicate, SHOP_BASE_PRICE, SHOP_PRICE_GROWTH, f),
      suit: price(b.suit || 0, SHOP_BASE_PRICE, SHOP_PRICE_GROWTH, f), // runs saved before Change suit existed lack it
      rankUp: price(b.rankUp || 0, SHOP_BASE_PRICE, SHOP_PRICE_GROWTH, f),
      rankDown: price(b.rankDown || 0, SHOP_BASE_PRICE, SHOP_PRICE_GROWTH, f),
      split: price(b.split || 0, SHOP_BASE_PRICE, SHOP_PRICE_GROWTH, f),
      bonus: price(b.bonus || 0, SHOP_BASE_PRICE, BONUS_PRICE_GROWTH, f),
    };
  }

  // Increase Hand Payout for one hand: $2, then 4x for each time this hand
  // was upgraded and 1.5x for each time another hand was. Worked out from the
  // counts each time, so rounding doesn't compound.
  function payoutPrice(run, handId) {
    const own = run.upgrades?.[handId] || 0;
    const others = (run.bought.payout || 0) - own;
    return Math.ceil(PAYOUT_BASE_PRICE * PAYOUT_OWN_GROWTH ** own * PAYOUT_OTHER_GROWTH ** others * inflation(run));
  }

  // What an action costs. For 'payout' with no hand, the cheapest hand.
  function priceOf(run, action, handId) {
    if (action !== 'payout') return prices(run)[action];
    if (handId) return payoutPrice(run, handId);
    return Math.min(...HANDS.map((h) => payoutPrice(run, h.id)));
  }

  // Whether this run has the action at all.
  function hasAction(run, action) {
    return !TOOL_ACTIONS.includes(action) || settingsOf(run)[action];
  }

  // Card actions a locked card refuses: all of them.
  const LOCKED_ACTIONS = ['remove', 'duplicate', 'suit', 'rankUp', 'rankDown', 'split', 'bonus'];

  // Why a purchase can't happen right now, or null if it can. `target` is the
  // hand id for 'payout', or optionally the card id for a card action.
  function shopBlock(run, action, target) {
    if (run.phase !== 'bet') return run.phase === 'hold' ? 'The shop opens again after this hand.' : 'The run is over.';
    if (!hasAction(run, action)) return 'That tool is off for this run.';
    const handId = action === 'payout' ? target : undefined;
    if (target !== undefined && action !== 'payout' && LOCKED_ACTIONS.includes(action) && cardById(run, target)?.locked) return "This card is locked: it can't be deleted, duplicated or changed.";
    const min = minDeckSize(run);
    if (action === 'remove' && run.deck.length <= min) return `Your deck is at the minimum of ${min} cards.`;
    if (run.bankroll < priceOf(run, action, handId)) return "You can't afford it.";
    return null;
  }

  // True if buying this would spend your last dollar, which ends the run.
  function strands(run, action, handId) {
    return run.bankroll - priceOf(run, action, handId) <= 0;
  }

  // `suit` is the new suit for 'suit' (Change suit); other actions ignore it.
  // 'payout' (Increase Hand Payout) takes a hand id in place of a card id.
  // Returns the cost and the cards added to the deck, if any.
  function buy(run, action, cardId, suit, rand = Math.random) {
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
      checkAchievements(run);
      return { cost, added: [] };
    }
    const block = shopBlock(run, action, cardId);
    if (block) throw new Error(block);
    const card = run.deck.find((c) => c.id === cardId);
    if (!card) throw new Error('No such card.');
    if (action === 'suit' && (!SUITS.includes(suit) || suit === card.suit)) throw new Error('Pick a different suit.');
    if (action === 'bonus' && card.bonus) throw new Error('That card already has 2x.');
    const cost = prices(run)[action];
    run.bankroll -= cost;
    run.bought[action] = (run.bought[action] || 0) + 1;
    run.stats = run.stats || {};
    const added = [];
    if (action === 'remove') {
      run.deck = run.deck.filter((c) => c !== card);
      if (card.boss) run.stats.bossDeleted = (run.stats.bossDeleted || 0) + 1;
    } else if (action === 'suit') {
      card.suit = suit;
      recopy(run, card);
    } else if (action === 'rankUp' || action === 'rankDown') {
      card.rank = stepRank(card.rank, action === 'rankUp' ? 1 : -1);
      recopy(run, card);
    } else if (action === 'split') {
      // The card becomes its two neighbouring ranks in the same suit. A boss
      // card's halves are still boss cards, and splitting isn't deleting.
      run.deck = run.deck.filter((c) => c !== card);
      for (const by of [-1, 1]) {
        const half = makeCard(run, stepRank(card.rank, by), card.suit, card.boss ? { boss: true } : {});
        run.deck.push(half);
        added.push(half);
      }
    } else if (action === 'bonus') {
      card.bonus = true;
    } else {
      // Duplicate: an exact copy, 2x included. A boss card's copy isn't a boss card.
      const copy = makeCard(run, card.rank, card.suit, card.bonus ? { bonus: true } : {});
      run.deck.push(copy);
      added.push(copy);
      if (cost >= 1e8) run.stats.bigDuplicate = true;
      // Free Duplicate also puts a random card in the deck.
      if (settingsOf(run).freeDuplicate) {
        const extra = makeCard(run, randomRank(rand), randomSuit(rand));
        run.deck.push(extra);
        added.push(extra);
      }
    }
    checkLost(run);
    checkAchievements(run);
    return { cost, added };
  }

  // -------------------------------------------------------------------------
  // A hand: deal, hold/discard, draw

  function newRun(settings, rand = Math.random) {
    const s = cleanSettings(settings);
    const run = {
      settings: s,
      bankroll: STARTING_BANKROLL,
      level: 1,
      hand: 1,
      deck: [],
      nextId: 1,
      copies: {},
      bought: { remove: 0, duplicate: 0, suit: 0, payout: 0 },
      upgrades: {}, // hand id → Increase Hand Payout purchases
      phase: 'bet', // bet → hold → bet …, ending in won or lost
      round: null, // the hand in play: { bet, gate, cards, trashed, pile, drawsLeft, drawn, replaced }
      last: null, // the most recent finished hand
      log: [],
      handsPlayed: 0,
      stats: { bossDeleted: 0, bigDuplicate: false },
      achieved: [], // achievement ids earned during this run
    };
    for (const [rank, suit] of startingCards(s.deck, s.handSize, rand)) run.deck.push(makeCard(run, rank, suit));
    checkAchievements(run);
    return run;
  }

  // How many cards can be marked to replace on this draw: what's left to
  // draw from (none with No draw), or between hands the deck beyond one hand.
  function maxDiscards(run) {
    if (run.round) return (run.round.drawsLeft ?? 1) === 0 ? 0 : run.round.pile.length;
    return run.deck.length - handSize(run);
  }

  function drawsFor(settings) {
    return settings.noDraw ? 0 : settings.extraDraw ? 2 : 1;
  }

  function deal(run, rand) {
    if (run.phase !== 'bet') throw new Error('Not ready to deal.');
    const { bet } = nextBet(run);
    if (bet <= 0) throw new Error('Nothing left to bet.');
    if (run.doubleNext) {
      run.doubledLevel = run.level;
      run.doubleNext = false;
    }
    const s = settingsOf(run);
    run.bankroll -= bet;
    const order = shuffle(run.deck.map((c) => c.id), rand);
    run.round = {
      bet,
      gate: isGateHand(run.hand),
      cards: order.slice(0, s.handSize), // ids, in deal order
      trashed: [], // ids in `cards` the player has marked to replace
      pile: order.slice(s.handSize),
      drawsLeft: drawsFor(s),
      drawn: [], // every id drawn so far this hand
      replaced: [], // every id replaced so far this hand
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

  // When a level's boss hand comes up, the boss adds random cards to your deck
  // (see bossCardCount), each locked by chance (see lockChance). One that
  // matches a card you already have becomes a copy of it, like Duplicate.
  function addBossCards(run, rand = Math.random) {
    const added = [];
    const chance = lockChance(run);
    for (let i = bossCardCount(run); i > 0; i--) {
      const extra = { boss: true };
      if (chance >= 1 || (chance > 0 && rand() < chance)) extra.locked = true;
      const card = makeCard(run, randomRank(rand), randomSuit(rand), extra);
      run.deck.push(card);
      added.push({ ...card });
    }
    return added;
  }

  // Replace each marked card with the next one from the deck. With a draw
  // still to come (Extra draw) and cards replaced, the hand stays in play and
  // this returns { partial: true }. Otherwise score, pay out and move the run along.
  function draw(run, rand = Math.random) {
    if (run.phase !== 'hold') throw new Error('No hand to draw.');
    const r = run.round;
    const drawsLeft = r.drawsLeft ?? 1;
    const drawn = [];
    const finalIds = r.cards.map((id) => {
      if (!r.trashed.includes(id)) return id;
      const next = r.pile.shift();
      drawn.push(next);
      return next;
    });
    r.drawn = [...(r.drawn || []), ...drawn];
    r.replaced = [...(r.replaced || []), ...r.trashed];
    if (r.trashed.length && drawsLeft > 1) {
      r.cards = finalIds;
      r.trashed = [];
      r.drawsLeft = drawsLeft - 1;
      return { partial: true, drawn };
    }

    const s = settingsOf(run);
    const cards = finalIds.map((id) => cardById(run, id));
    const { cards: scored, found } = bestFive(run, cards);
    const made = found[0];
    const matched = found.map((h) => ({ id: h.id, name: h.name, mult: multiple(run, h.id) }));
    const sum = matched.reduce((t, m) => t + m.mult, 0);
    // Each 2x card anywhere in the hand doubles what it pays, except on Nothing.
    const bonus = made === NOTHING ? 1 : 2 ** cards.filter((c) => c.bonus).length;
    const mult = sum * bonus;
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
      scored: scored.map((c) => c.id),
      drawn: r.drawn,
      replaced: r.replaced.map((id) => ({ ...cardById(run, id) })),
      handId: made.id,
      handName: made.name,
      matches: matched,
      bonus,
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
    // Interest: 10% of the bankroll after every hand, unless the run just ended in a loss.
    if (s.interest && run.phase !== 'lost' && run.bankroll > 0) {
      result.interest = Math.floor(run.bankroll * INTEREST_RATE);
      run.bankroll += result.interest;
    }
    checkLost(run);
    checkAchievements(run);
    return result;
  }

  function checkLost(run) {
    if (run.phase === 'bet' && run.bankroll <= 0) run.phase = 'lost';
  }

  // -------------------------------------------------------------------------
  // Achievements
  //
  // Each one unlocks one setting value for later runs (`unlock` is
  // [setting, value]). `test` looks at the run as it is now, including its
  // last hand, and runs after every draw and purchase.

  const lastPaid = (run, id) => !!run.last?.matches?.some((m) => m.id === id);
  const bossBeatWith = (run, id) => !!run.last?.passed && lastPaid(run, id);
  const won = (run) => run.phase === 'won';
  const wonWith = (run, id) => won(run) && lastPaid(run, id);

  const ACHIEVEMENTS = [
    { id: 'numbers-only', name: 'Have a deck of only number cards', unlock: ['deck', 'numbers'], test: (run) => run.deck.every((c) => c.rank <= 10) },
    { id: 'face-only', name: 'Have a deck of only face cards', unlock: ['deck', 'face'], test: (run) => run.deck.every((c) => c.rank >= 11) },
    { id: 'small-deck', name: 'Have a deck of 26 cards or fewer', unlock: ['deck', 'half'], test: (run) => run.deck.length <= 26 },
    { id: 'boss-straight', name: 'Beat any boss with a straight', unlock: ['deck', 'straight'], test: (run) => bossBeatWith(run, 'straight') },
    { id: 'win-odd-deck', name: 'Win with a non-standard deck', unlock: ['deck', 'random'], test: (run) => won(run) && settingsOf(run).deck !== 'standard' },
    { id: 'keep-boss-cards', name: 'Win without deleting any boss cards', unlock: ['deck', 'corrupted'], test: (run) => won(run) && !run.stats?.bossDeleted },
    { id: 'five-card-deck', name: 'Have a deck of only 5 cards', unlock: ['deck', 'flush-five'], test: (run) => run.deck.length === 5 },
    { id: 'final-pair', name: 'Beat the final boss with a pair', unlock: ['handSize', 6], test: (run) => wonWith(run, 'pair') },
    { id: 'final-flush', name: 'Beat the final boss with a flush', unlock: ['handSize', 7], test: (run) => wonWith(run, 'flush') },
    { id: 'final-five-kind', name: 'Beat the final boss with a five of a kind', unlock: ['handSize', 8], test: (run) => wonWith(run, 'five-kind') },
    { id: 'win-no-duplicate', name: 'Beat the final boss without duplicating a card', unlock: ['handSize', 9], test: (run) => won(run) && !run.bought.duplicate },
    { id: 'win-no-delete', name: 'Beat the final boss without deleting a card', unlock: ['handSize', 10], test: (run) => won(run) && !run.bought.remove },
    { id: 'beat-easy', name: 'Beat Easy mode', unlock: ['extraDraw', true], test: (run) => won(run) && settingsOf(run).difficulty === 'easy' },
    { id: 'beat-hard', name: 'Beat Hard mode', unlock: ['noDraw', true], test: (run) => won(run) && settingsOf(run).difficulty === 'hard' },
    { id: 'final-straight', name: 'Beat the final boss with a straight', unlock: ['skipStraights', true], test: (run) => wonWith(run, 'straight') },
    { id: 'billion', name: 'Reach $1 trillion in your bankroll', unlock: ['interest', true], test: (run) => run.bankroll >= 1e12 }, // id kept from the old $1 billion goal so saved profiles keep it
    { id: 'big-duplicate', name: 'Pay $100 million to duplicate a card', unlock: ['freeDuplicate', true], test: (run) => !!run.stats?.bigDuplicate },
    { id: 'straight-20', name: 'Increase the payout for a straight to 20x', unlock: ['rankUp', true], test: (run) => total(run, 'straight') >= 20 },
    { id: 'straight-1280', name: 'Increase the payout for a straight to 1280x', unlock: ['rankDown', true], test: (run) => total(run, 'straight') >= 1280 },
    { id: 'big-deck', name: 'Have 100 or more cards in your deck', unlock: ['split', true], test: (run) => run.deck.length >= 100 },
    { id: 'win-no-pair-upgrade', name: 'Beat the final boss without increasing the payout for a pair', unlock: ['bonus', true], test: (run) => won(run) && !run.upgrades?.pair },
    { id: 'big-bet', name: 'Make over 100,000x on a bet', unlock: ['doubleBet', true], test: (run) => (run.last?.mult || 0) > 100000 },
    { id: 'lose-boss', name: 'Lose to a boss', unlock: ['difficulty', 'easy'], test: (run) => run.phase === 'lost' && !!run.lostTo },
    { id: 'beat-normal', name: 'Beat Normal mode', unlock: ['difficulty', 'hard'], test: (run) => won(run) && settingsOf(run).difficulty === 'normal' },
    { id: 'finish-run', name: 'Finish a run (win or lose)', unlock: ['deckInfo', true], test: (run) => run.phase === 'won' || run.phase === 'lost' },
    { id: 'straight-flush', name: 'Make a straight flush', unlock: ['deckOdds', true], test: (run) => lastPaid(run, 'straight-flush') },
    { id: 'flush-five', name: 'Make a flush five', unlock: ['drawOdds', true], test: (run) => lastPaid(run, 'five-kind') && lastPaid(run, 'flush') }, // five of a kind in one suit
    { id: 'hand-5000', name: 'Get a hand type to 5000x', unlock: ['payoutInfo', true], test: (run) => HANDS.some((h) => total(run, h.id) >= 5000) },
  ];

  // Adds any achievements the run has just earned to run.achieved and
  // returns their ids. On Easy only Beat Easy mode can be earned.
  function checkAchievements(run) {
    run.achieved = run.achieved || [];
    const counts = countsForAchievements(settingsOf(run));
    const fresh = [];
    for (const a of ACHIEVEMENTS) {
      if (run.achieved.includes(a.id)) continue;
      if (!counts && a.id !== 'beat-easy') continue;
      if (a.test(run)) fresh.push(a.id);
    }
    run.achieved.push(...fresh);
    return fresh;
  }

  // The achievement that unlocks a setting's value, if any.
  function unlockedBy(key, value) {
    return ACHIEVEMENTS.find((a) => a.unlock[0] === key && a.unlock[1] === value) || null;
  }

  // Whether a setting's value is open to a player who has earned `earned`
  // (a list of achievement ids). Defaults are always open.
  function isUnlocked(earned, key, value) {
    if (DEFAULT_SETTINGS[key] === value) return true;
    const a = unlockedBy(key, value);
    return !a || earned.includes(a.id);
  }

  return {
    LEVELS,
    HANDS_PER_LEVEL,
    HAND_SIZE,
    MAX_HAND_SIZE,
    SCORED_CARDS,
    MIN_DECK_SIZE,
    STARTING_BANKROLL,
    INTEREST_RATE,
    SUITS,
    SUIT_NAMES,
    RANKS,
    HANDS,
    NOTHING,
    DECKS,
    DIFFICULTIES,
    DEFAULT_SETTINGS,
    ACHIEVEMENTS,
    cleanSettings,
    settingsOf,
    handSize,
    minDeckSize,
    countsForAchievements,
    rankLabel,
    cardLabel,
    cardSlug,
    byStrength,
    stepRank,
    isStraight,
    matches,
    evaluate,
    bestFive,
    multiple,
    total,
    isGateHand,
    BOSS_TARGETS,
    bossTarget,
    bossCardCount,
    lockChance,
    inflation,
    dealOdds,
    drawOdds,
    BASE_BETS,
    handBet,
    nextBet,
    canDoubleBet,
    setDoubleBet,
    price,
    prices,
    payoutPrice,
    priceOf,
    hasAction,
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
    checkAchievements,
    isUnlocked,
    unlockedBy,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
