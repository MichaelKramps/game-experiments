// Spades rules and computer players, with no DOM so tools/check-engine.js can
// run it under node. See DESIGN.md for the rules as played here.
//
// Seats go clockwise in play order: 0 You (South), 1 West, 2 North (your
// partner), 3 East. Teams: 0 = You + North, 1 = West + East. Cards are
// labels: rank then suit letter, "KH" (king of hearts), "10S", "2C".

const Spades = (() => {
  const SEATS = ['You', 'West', 'North', 'East'];
  const SUITS = ['S', 'H', 'C', 'D']; // hand order: black/red alternate
  const SUIT_NAMES = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const RANK_WORDS = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'jack', 12: 'queen', 13: 'king', 14: 'ace' };
  const TARGET = 500; // first team to 500 wins
  const NIL = 100;
  const BLIND = 200;
  const BAGS = 10; // every 10 bags costs 100
  const BLIND_BEHIND = 100; // blind nil only for a team behind by 100+

  const team = (seat) => seat % 2;
  const partner = (seat) => (seat + 2) % 4;
  const next = (seat) => (seat + 1) % 4;
  const suit = (c) => c.slice(-1);
  const rank = (c) => RANKS.indexOf(c.slice(0, -1)) + 2; // 2..14
  const isNil = (b) => b === 'nil' || b === 'blind';
  const word = (c) => `${RANK_WORDS[rank(c)]}-${SUIT_NAMES[suit(c)].toLowerCase()}`;

  // Strongest first within a suit; suits in SUITS order.
  const byHand = (a, b) => SUITS.indexOf(suit(a)) - SUITS.indexOf(suit(b)) || rank(b) - rank(a);

  function deck() {
    return SUITS.flatMap((s) => RANKS.map((r) => r + s));
  }

  function shuffle(list, rand) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------------------------------------------------------------------------
  // A match: hands are dealt until a team reaches 500 (or falls to -200).
  //
  // g.phase: 'bid' | 'play' | 'done' (hand scored, waiting for Next hand) |
  // 'over'. g.turn: the seat to act. g.tricks: this hand's tricks, the last
  // one possibly unfinished: { leader, cards: [{ seat, card }], winner }.
  // g.blind[seat]: committed to blind nil before looking at the cards.
  // g.history: every scored hand (see scoreHand).

  function newMatch(rand = Math.random) {
    const g = { v: 1, hand: 0, dealer: Math.floor(rand() * 4), history: [], totals: [0, 0], bags: [0, 0] };
    deal(g, rand);
    return g;
  }

  function deal(g, rand = Math.random) {
    g.hand++;
    g.dealer = g.hand === 1 ? g.dealer : next(g.dealer);
    const cards = shuffle(deck(), rand);
    g.hands = [0, 1, 2, 3].map((s) => cards.slice(s * 13, s * 13 + 13).sort(byHand));
    g.bids = [null, null, null, null];
    g.blind = [false, false, false, false];
    g.taken = [0, 0, 0, 0];
    g.tricks = [];
    g.broken = false;
    g.phase = 'bid';
    g.turn = next(g.dealer);
    return g;
  }

  // Blind nil: allowed while a team is behind by 100 or more, before the
  // player bids, and not when the partner already bid nil.
  function blindAllowed(g, seat) {
    if (g.phase !== 'bid' || g.bids[seat] !== null) return false;
    if (isNil(g.bids[partner(seat)]) || g.blind[partner(seat)]) return false;
    const t = team(seat);
    return g.totals[1 - t] - g.totals[t] >= BLIND_BEHIND;
  }

  function goBlind(g, seat) {
    if (!blindAllowed(g, seat)) throw new Error('Blind nil is not allowed now.');
    g.blind[seat] = true;
  }

  // Bids: 'nil', 'blind', or 1–13.
  function bid(g, seat, value) {
    if (g.phase !== 'bid' || g.turn !== seat) throw new Error('Not your turn to bid.');
    if (g.blind[seat]) value = 'blind';
    else if (value === 'blind') throw new Error('Blind nil has to be chosen before looking at the cards.');
    if (!(value === 'nil' || value === 'blind' || (Number.isInteger(value) && value >= 1 && value <= 13))) throw new Error('Bad bid.');
    g.bids[seat] = value;
    g.turn = next(seat);
    if (g.bids.every((b) => b !== null)) {
      g.phase = 'play';
      g.turn = next(g.dealer);
      g.tricks.push({ leader: g.turn, cards: [], winner: null });
    }
  }

  const current = (g) => g.tricks[g.tricks.length - 1];

  // The cards `seat` may play now.
  function legal(g, seat) {
    const hand = g.hands[seat];
    const t = current(g);
    if (!t || !t.cards.length) {
      if (g.broken) return hand.slice();
      const side = hand.filter((c) => suit(c) !== 'S');
      return side.length ? side : hand.slice();
    }
    const led = suit(t.cards[0].card);
    const follow = hand.filter((c) => suit(c) === led);
    return follow.length ? follow : hand.slice();
  }

  // Who's winning a trick so far: the highest spade, else the highest card of
  // the suit led. Returns the entry { seat, card }.
  function winning(cards) {
    let best = cards[0];
    for (const e of cards.slice(1)) {
      const bs = suit(best.card);
      const es = suit(e.card);
      if (es === bs ? rank(e.card) > rank(best.card) : es === 'S') best = e;
    }
    return best;
  }

  function play(g, seat, card) {
    if (g.phase !== 'play' || g.turn !== seat) throw new Error('Not your turn.');
    if (!legal(g, seat).includes(card)) throw new Error(`${card} can't be played now.`);
    const t = current(g);
    g.hands[seat] = g.hands[seat].filter((c) => c !== card);
    t.cards.push({ seat, card });
    if (suit(card) === 'S') g.broken = true;
    if (t.cards.length < 4) {
      g.turn = next(seat);
      return null;
    }
    t.winner = winning(t.cards).seat;
    g.taken[t.winner]++;
    if (g.tricks.length === 13) {
      scoreHand(g);
      return t.winner;
    }
    g.turn = t.winner;
    g.tricks.push({ leader: t.winner, cards: [], winner: null });
    return t.winner;
  }

  // ---------------------------------------------------------------------------
  // Scoring a hand, per team:
  //   contract = the non-nil bids added up; tricks = all the team's tricks
  //   (a nil bidder's tricks count toward the partner's bid)
  //   made: 10 × contract + 1 per extra trick, and each extra trick is a bag;
  //   every 10 bags costs 100. Missed: −10 × contract.
  //   Each nil: +100 if the bidder took no tricks, −100 if any. Blind: ±200.
  //   A team where both bid nil has contract 0, so every trick is a bag.

  function teamScore(bids, taken, t, bagsBefore) {
    const seats = [t, t + 2];
    const contract = seats.reduce((n, s) => n + (isNil(bids[s]) ? 0 : bids[s]), 0);
    const tricks = taken[t] + taken[t + 2];
    let points = 0;
    let bags = 0;
    if (contract > 0) {
      if (tricks >= contract) {
        bags = tricks - contract;
        points += 10 * contract + bags;
      } else points -= 10 * contract;
    } else {
      bags = tricks;
      points += bags;
    }
    const nils = [];
    for (const s of seats) {
      if (!isNil(bids[s])) continue;
      const worth = bids[s] === 'blind' ? BLIND : NIL;
      const ok = taken[s] === 0;
      points += ok ? worth : -worth;
      nils.push({ seat: s, blind: bids[s] === 'blind', ok, worth });
    }
    let bagTotal = bagsBefore + bags;
    let penalty = 0;
    while (bagTotal >= BAGS) {
      bagTotal -= BAGS;
      penalty += 100;
    }
    points -= penalty;
    return { contract, tricks, points, bags, bagTotal, penalty, nils, made: contract === 0 || tricks >= contract };
  }

  function scoreHand(g) {
    const teams = [0, 1].map((t) => teamScore(g.bids, g.taken, t, g.bags[t]));
    teams.forEach((r, t) => {
      g.totals[t] += r.points;
      g.bags[t] = r.bagTotal;
      r.total = g.totals[t];
    });
    g.history.push({ hand: g.hand, dealer: g.dealer, bids: g.bids.slice(), taken: g.taken.slice(), teams });
    g.phase = winner(g) === null ? 'done' : 'over';
  }

  // The winning team once the match is decided, else null. Reaching 500 wins
  // (the higher score if both do; a tie plays on).
  function winner(g) {
    const [a, b] = g.totals;
    if (a >= TARGET || b >= TARGET) return a === b ? null : a > b ? 0 : 1;
    return null;
  }

  function nextHand(g, rand = Math.random) {
    if (g.phase !== 'done') throw new Error('The hand is not over.');
    deal(g, rand);
  }

  // ---------------------------------------------------------------------------
  // Computer players

  // About how many tricks a hand takes.
  function estimate(hand) {
    const by = (s) => hand.filter((c) => suit(c) === s);
    const spades = by('S');
    const sr = spades.map(rank);
    let n = 0;
    if (sr.includes(14)) n += 1;
    if (sr.includes(13)) n += spades.length >= 2 ? 1 : 0.4;
    if (sr.includes(12)) n += spades.length >= 3 ? 0.8 : 0.2;
    if (sr.includes(11)) n += spades.length >= 4 ? 0.5 : 0;
    n += Math.max(0, spades.length - 3) * 0.9; // long spades win late
    for (const s of ['H', 'C', 'D']) {
      const cards = by(s);
      const r = cards.map(rank);
      if (r.includes(14)) n += cards.length >= 7 ? 0.5 : 1;
      if (r.includes(13)) n += cards.length >= 2 && cards.length <= 5 ? 0.75 : 0.2;
      if (r.includes(12) && cards.length >= 3 && cards.length <= 4) n += 0.25;
      // short side suits can be trumped once spades are spare
      const spare = spades.length - 2;
      if (spare > 0) {
        if (cards.length === 0) n += Math.min(spare, 2) * 0.6;
        else if (cards.length === 1) n += 0.4;
      }
    }
    return n;
  }

  // Could this hand go nil? No high spades, few spades, no side aces, and
  // high side cards only when guarded by length.
  function nilSafe(hand) {
    const spades = hand.filter((c) => suit(c) === 'S');
    if (spades.length > 3 || spades.some((c) => rank(c) >= 11)) return false;
    for (const s of ['H', 'C', 'D']) {
      const cards = hand.filter((c) => suit(c) === s);
      const top = Math.max(0, ...cards.map(rank));
      if (top === 14) return false;
      if (top >= 12 && cards.length < 4) return false;
    }
    return estimate(hand) < 1.2;
  }

  function aiBlind(g, seat, rand = Math.random) {
    const t = team(seat);
    return blindAllowed(g, seat) && g.totals[1 - t] - g.totals[t] >= 200 && rand() < 0.35;
  }

  function aiBid(g, seat) {
    if (g.blind[seat]) return 'blind';
    const hand = g.hands[seat];
    const pb = g.bids[partner(seat)];
    if (!isNil(pb) && nilSafe(hand)) return 'nil';
    let n = Math.round(estimate(hand));
    // covering a nil partner takes strength: bid a bit more boldly
    if (isNil(pb)) n = Math.round(estimate(hand) + 0.4);
    // the last bidder keeps the table total sane
    const others = g.bids.filter((b) => b !== null && !isNil(b)).reduce((a, b) => a + b, 0);
    if (g.bids.filter((b) => b === null).length === 1 && others + n > 14) n = Math.max(1, 14 - others);
    return Math.max(1, Math.min(13, n));
  }

  // Cards already played this hand (for knowing which cards are top).
  function played(g) {
    return new Set(g.tricks.flatMap((t) => t.cards.map((e) => e.card)));
  }

  // The card is the highest left in its suit (counting cards in `own`).
  function isBoss(card, gone, own) {
    for (let r = rank(card) + 1; r <= 14; r++) {
      const c = RANKS[r - 2] + suit(card);
      if (!gone.has(c) && !own.includes(c)) return false;
    }
    return true;
  }

  const lowest = (cards) => cards.reduce((a, b) => (rank(b) < rank(a) || (rank(b) === rank(a) && suit(a) === 'S' && suit(b) !== 'S') ? b : a));
  const highest = (cards) => cards.reduce((a, b) => (rank(b) > rank(a) ? b : a));
  // prefer non-spades when dumping
  const sideFirst = (cards) => {
    const side = cards.filter((c) => suit(c) !== 'S');
    return side.length ? side : cards;
  };

  function beats(card, entry, led) {
    const s = suit(card);
    const es = suit(entry.card);
    if (s === es) return rank(card) > rank(entry.card);
    return s === 'S' || (s === led && es !== 'S' && es !== led);
  }

  function aiPlay(g, seat) {
    const options = legal(g, seat);
    if (options.length === 1) return options[0];
    const t = current(g);
    const hand = g.hands[seat];
    const gone = played(g);
    const me = g.bids[seat];
    const p = partner(seat);
    const nilMe = isNil(me) && g.taken[seat] === 0;
    const nilPartner = isNil(g.bids[p]) && g.taken[p] === 0;
    const opps = [next(seat), (seat + 3) % 4];
    const nilOpp = opps.filter((o) => isNil(g.bids[o]) && g.taken[o] === 0);
    const tm = team(seat);
    const contract = [tm, tm + 2].reduce((n, s) => n + (isNil(g.bids[s]) ? 0 : g.bids[s]), 0);
    const need = contract - (g.taken[tm] + g.taken[tm + 2]);

    // Leading
    if (!t.cards.length) {
      if (nilMe) return lowest(sideFirst(options));
      if (nilPartner || need > 0) {
        const boss = options.filter((c) => isBoss(c, gone, hand));
        const bossSide = boss.filter((c) => suit(c) !== 'S');
        if (bossSide.length) return highest(bossSide);
        if (boss.length && (nilPartner || need > 1)) return highest(boss);
        // lead a short side suit to try ruffing later
        const side = options.filter((c) => suit(c) !== 'S');
        if (side.length) {
          const count = (s) => hand.filter((c) => suit(c) === s).length;
          const short = side.reduce((a, b) => (count(suit(b)) < count(suit(a)) ? b : a));
          return nilPartner ? highest(side.filter((c) => suit(c) === suit(short))) : lowest(side.filter((c) => suit(c) === suit(short)));
        }
        return lowest(options);
      }
      // contract safe (or set): lead low, toward an opponent's nil if any
      return lowest(sideFirst(options));
    }

    const led = suit(t.cards[0].card);
    const top = winning(t.cards);
    const winners = options.filter((c) => beats(c, top, led));
    const losers = options.filter((c) => !beats(c, top, led));
    const lastToPlay = t.cards.length === 3;

    // I bid nil: stay under, and dump high cards when I can't follow.
    if (nilMe) {
      if (losers.length) {
        const following = losers.filter((c) => suit(c) === led);
        if (following.length) return highest(following);
        return highest(sideFirst(losers));
      }
      return lowest(options); // forced to win: as cheaply as possible
    }

    // Partner bid nil: take the trick over them if they're winning it or
    // still to play.
    if (nilPartner) {
      const partnerPlayed = t.cards.some((e) => e.seat === p);
      if ((top.seat === p || !partnerPlayed) && winners.length) return partnerPlayed && lastToPlay ? lowest(winners) : highest(winners);
      return losers.length ? lowest(sideFirst(losers)) : lowest(options);
    }

    // An opponent's nil is still alive: duck under them when they're winning.
    if (nilOpp.includes(top.seat) && losers.length) {
      const following = losers.filter((c) => suit(c) === led);
      return following.length ? highest(following) : highest(sideFirst(losers));
    }

    const partnerWinning = top.seat === p;
    if (need > 0) {
      // partner already has it with a top card, or it's last to play: stay low
      if (partnerWinning && (lastToPlay || isBoss(top.card, gone, hand))) return lowest(sideFirst(losers.length ? losers : options));
      if (winners.length) {
        // win as cheaply as possible; only spend a spade when needed
        const sideWin = winners.filter((c) => suit(c) !== 'S');
        if (sideWin.length) return lastToPlay ? lowest(sideWin) : isBoss(highest(sideWin), gone, hand) ? highest(sideWin) : lowest(sideWin);
        return lowest(winners);
      }
      return lowest(sideFirst(options));
    }

    // Contract made: avoid bags. Lose with the highest card that still loses.
    if (losers.length) {
      const following = losers.filter((c) => suit(c) === led);
      if (following.length) return highest(following);
      return highest(sideFirst(losers));
    }
    return lowest(options);
  }

  // ---------------------------------------------------------------------------
  // Saves

  function valid(g) {
    if (!g || g.v !== 1 || !['bid', 'play', 'done', 'over'].includes(g.phase)) return false;
    if (!Array.isArray(g.hands) || g.hands.length !== 4 || !Array.isArray(g.tricks) || !Array.isArray(g.history)) return false;
    const seen = new Set();
    for (const h of g.hands) for (const c of h) seen.add(c);
    for (const t of g.tricks) for (const e of t.cards) seen.add(e.card);
    if (seen.size !== 52 || ![...seen].every((c) => rank(c) >= 2 && SUITS.includes(suit(c)))) return false;
    return Number.isInteger(g.turn) && g.turn >= 0 && g.turn < 4 && Array.isArray(g.totals) && Array.isArray(g.bags) && Array.isArray(g.bids);
  }

  return {
    SEATS, SUITS, SUIT_NAMES, RANKS, TARGET, NIL, BLIND, BAGS, BLIND_BEHIND,
    team, partner, next, suit, rank, word, isNil, byHand,
    newMatch, deal, blindAllowed, goBlind, bid, legal, play, winning, current,
    teamScore, winner, nextHand, estimate, nilSafe, aiBlind, aiBid, aiPlay, valid,
  };
})();

if (typeof module !== 'undefined') module.exports = Spades;
