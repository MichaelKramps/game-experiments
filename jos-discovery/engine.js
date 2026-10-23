// Jo's Discovery — rules engine. Pure functions only: no DOM, no storage.
// simulateHack() takes both decks and the starting state and returns every
// event in order; the UI just plays them back. The batch simulator in
// debug.js uses the same functions.

// ---------------------------------------------------------------------------
// Seeded randomness: every countermeasure deck and reward offer is derived
// from the operation seed, so any hack can be replayed exactly.

function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFor(...parts) {
  return mulberry32(hashSeed(parts.join(':')));
}

function shuffle(arr, rng) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickDistinct(pool, n, rng) {
  return shuffle(pool, rng).slice(0, Math.min(n, pool.length));
}

// ---------------------------------------------------------------------------
// Operation structure

function hackInfo(n) {
  const program = PROGRAMS[Math.floor((n - 1) / HACKS_PER_PROGRAM)];
  const slot = (n - 1) % HACKS_PER_PROGRAM; // 0-3 Extraction, 4 Decode
  const isDecode = slot === HACKS_PER_PROGRAM - 1;
  return {
    n,
    program,
    slot,
    isDecode,
    integrity: program.integrity[slot],
    label: isDecode ? `${program.id} Cipher` : `${program.id} / Extraction ${slot + 1}`,
    target: isDecode ? `${program.id}/cipher` : `${program.id}/extraction-0${slot + 1}`,
  };
}

// The shared card pool as of hack n (see CARD_UNLOCK in data.js).
function cardPool(n) {
  return CARD_POOL.filter((id) => (CARD_UNLOCK[id] ?? 1) <= n);
}

// Hack n: the base cards plus n − 1 uniform random cards, shuffled once.
function makeCountermeasures(opSeed, n) {
  const rng = rngFor(opSeed, 'countermeasures', n);
  const pool = cardPool(n);
  const deck = [...BASE_COUNTERMEASURES];
  for (let i = 0; i < n - 1; i++) deck.push(pool[Math.floor(rng() * pool.length)]);
  return shuffle(deck, rng);
}

// Offers after winning hack n, in order. Hack 25 gives none (the ending plays).
function rewardsFor(n) {
  if (n >= TOTAL_HACKS) return [];
  const queue = ['compile'];
  if (n % 2 === 0) queue.push('compile');
  if (n % 3 === 0) queue.push('maintenance');
  if (n % HACKS_PER_PROGRAM === 0) queue.push('tool');
  return queue;
}

// The files in one offer. `index` is the offer's position in the queue so
// two Compiles after the same hack roll differently. Compiles draw from the
// pool of the next hack, the one the card will first be used in.
function offerItems(opSeed, n, index, kind, ownedTools) {
  if (kind === 'compile') return pickDistinct(cardPool(n + 1), 3, rngFor(opSeed, 'compile', n, index));
  if (kind === 'maintenance') return Object.keys(MAINTENANCE);
  if (kind === 'tool') {
    const remaining = Object.keys(TOOLS).filter((t) => !ownedTools.includes(t));
    return pickDistinct(remaining, 3, rngFor(opSeed, 'tool', n, index));
  }
  return [];
}

// A script must keep MIN_PERMANENT non-Temporary cards (Refactor checks this).
function permanentCount(script) {
  return script.filter((id) => !CARDS[id].temporary).length;
}

function applyMaintenance(id, run) {
  if (id === 'go_dark') run.cover = Math.min(run.maxCover, run.cover + Math.ceil(run.maxCover / 3));
  if (id === 'new_alias') {
    run.maxCover += 5;
    run.cover = Math.min(run.maxCover, run.cover + 5);
  }
}

// ---------------------------------------------------------------------------
// One hack

// Input: { script, cover, maxCover, tools, integrity, countermeasures }
// Output: { events, won, cover, plays }
// Every event carries `state`: both sides' numbers right after it happened.
function simulateHack({ script, cover, maxCover, tools = [], integrity, countermeasures }) {
  const owned = new Set(tools);
  const events = [];
  const side = (name, hp, deck) => ({
    name, hp, deck: [...deck], pos: 0, lowered: false, last: null,
    def: 0, atk: 0, dstr: 0, firewall: 0, counter: 0, idle: IDLE_PENALTY,
  });
  const jo = side('jo', cover, script);
  const sys = side('sys', integrity, countermeasures);
  jo.opp = sys;
  sys.opp = jo;
  const ended = () => jo.hp <= 0 || sys.hp <= 0;
  const stats = (s) => ({
    hp: s.hp, def: s.def, atk: s.atk, dstr: s.dstr,
    firewall: s.firewall, counter: s.counter, idle: s.idle, cards: s.deck.length,
  });
  const snap = () => ({ jo: stats(jo), sys: stats(sys) });

  // Tools apply after the per-hack resets.
  if (owned.has('rootkit')) {
    jo.atk = 1;
    events.push({ type: 'tool', tool: 'rootkit', text: 'attack strength 1', state: snap() });
  }
  if (owned.has('air_gap')) {
    jo.dstr = 1;
    events.push({ type: 'tool', tool: 'air_gap', text: 'defense strength 1', state: snap() });
  }
  // The card being resolved; each of its effects becomes one event (line).
  let cur = null;
  const emit = (detail) => {
    events.push({ type: 'card', ...cur, cont: cur.lines++ > 0, detail, state: snap() });
  };

  // One hit of `dmg` from src to dst. Firewall blocks it outright and leaves
  // defense alone; otherwise defense absorbs and any hit clears it. 0 damage
  // is not a hit: it touches nothing and sets off no Counter.
  function hit(src, dst, dmg) {
    const from = dst.hp;
    const base = { kind: 'hit', target: dst.name, dmg, from };
    if (dmg <= 0) return { ...base, zero: true, absorbed: 0, through: 0, to: dst.hp };
    if (dst.firewall > 0) {
      dst.firewall--;
      return { ...base, firewall: dst.firewall, blocked: true, absorbed: 0, through: 0, to: dst.hp };
    }
    const hadDef = dst.def;
    const absorbed = Math.min(hadDef, dmg);
    // A hit always clears defense, however much it absorbed. Redundancy: at
    // 20+ defense, Jo loses only as much defense as the hit's damage.
    const redundancy = dst === jo && owned.has('redundancy') && hadDef >= 20;
    dst.def = redundancy ? hadDef - absorbed : 0;
    const through = dmg - absorbed;
    if (through > 0) {
      dst.hp -= through;
      src.lowered = true;
    }
    let honeypot = false;
    if (dst === jo && owned.has('honeypot') && hadDef > 0 && through === 0 && !redundancy) {
      jo.def += 1;
      honeypot = true;
    }
    let autopatch = 0;
    if (dst === jo && owned.has('autopatch') && through > 0) {
      autopatch = Math.max(0, 1 + jo.dstr); // defense strength applies to anything that gives defense
      jo.def += autopatch;
    }
    return { ...base, absorbed, through, to: dst.hp, honeypot, redundancy, autopatch, def: dst.def };
  }

  // A hit plus any Counter it sets off. Counter damage is itself a hit, so
  // it can set off the other side's Counter in turn; stacks run out.
  function strike(src, dst, dmg, report) {
    const d = hit(src, dst, dmg);
    report(d);
    if (!d.zero && !ended() && dst.counter > 0) {
      dst.counter--;
      strike(dst, src, Math.max(0, 1 + dst.atk), (back) => {
        events.push({ type: 'counter', cycle: cur?.cycle ?? 0, side: dst.name, left: dst.counter, detail: back, state: snap() });
      });
    }
    return d;
  }

  // Jo restores Cover (Scrubber, Skimmer). Feedback answers any real gain
  // with 1 damage, which behaves like Counter damage (attack strength applies).
  function gainCover(tool, amount) {
    const from = jo.hp;
    jo.hp = Math.min(maxCover, jo.hp + amount);
    events.push({ type: 'tool', tool, from, to: jo.hp, state: snap() });
    if (jo.hp > from && owned.has('feedback') && !ended()) {
      strike(jo, sys, Math.max(0, 1 + jo.atk), (d) => {
        events.push({ type: 'tool', tool: 'feedback', detail: d, state: snap() });
      });
    }
  }

  if (owned.has('scrubber')) gainCover('scrubber', 3);

  // The card API for whichever side is playing. Effects stop once the hack ends.
  const NONE = { through: 0 };
  function fx(self) {
    const opp = self.opp;
    const live = (f) => (...args) => (ended() ? NONE : f(...args));
    return {
      attack: live((base) => strike(self, opp, Math.max(0, base + self.atk), emit)),
      overflow: live(() => strike(self, opp, self.def, emit)),
      defend: live((base) => {
        const gain = Math.max(0, base + self.dstr);
        self.def += gain;
        emit({ kind: 'defend', gain, def: self.def });
      }),
      boost: live((stat) => {
        if (stat === 'atk') self.atk += 1;
        else self.dstr += 1;
        emit({ kind: 'strength', stat, value: stat === 'atk' ? self.atk : self.dstr });
      }),
      doubleStrength: live((stat) => {
        if (stat === 'atk') self.atk *= 2;
        else self.dstr *= 2;
        emit({ kind: 'strength', stat, value: stat === 'atk' ? self.atk : self.dstr });
      }),
      lowerOpp: live((stat) => {
        if (stat === 'atk') opp.atk -= 1;
        else opp.dstr -= 1;
        emit({ kind: 'strength', stat, target: opp.name, value: stat === 'atk' ? opp.atk : opp.dstr });
      }),
      doubleDefense: live(() => {
        self.def *= 2;
        emit({ kind: 'defend', def: self.def });
      }),
      firewall: live((n) => {
        self.firewall += n;
        emit({ kind: 'firewall', value: self.firewall });
      }),
      counter: live((n) => {
        self.counter += n;
        emit({ kind: 'counter', value: self.counter });
      }),
      tarpit: live(() => {
        opp.idle *= 2;
        emit({ kind: 'tarpit', target: opp.name, value: opp.idle });
      }),
      isLast: () => self.pos === self.deck.length - 1,
    };
  }

  let plays = 0;
  let joOpened = false;

  function playCard(self, cycle) {
    const idx = self.pos;
    const isLast = idx === self.deck.length - 1;
    if (idx === 0) self.lowered = false;
    const id = self.deck[idx];
    plays++;

    // Echo copies the most recent non-Echo card; with nothing to copy it does nothing.
    const effectId = id === 'echo' ? self.last : id;
    if (id !== 'echo') self.last = id;
    const temporary = !!(effectId && CARDS[effectId].temporary);

    // Replay: Jo's opening card resolves twice but is still one card.
    let times = 1;
    if (self === jo && !joOpened) {
      joOpened = true;
      if (owned.has('replay')) times = 2;
    }
    for (let r = 0; r < times; r++) {
      cur = { cycle, side: self.name, card: id, copied: id === 'echo' ? effectId : null, replay: r > 0, temporary, lines: 0 };
      if (effectId) CARDS[effectId].effect(fx(self));
      else emit({ kind: 'nothing' });
      if (ended()) return;
    }

    if (isLast && !self.lowered) {
      const from = self.hp;
      self.hp -= self.idle; // ignores and keeps defense; Firewall doesn't block it
      events.push({ type: 'timeout', cycle, side: self.name, cost: self.idle, from, to: self.hp, state: snap() });
      if (self === sys && owned.has('skimmer') && !ended()) gainCover('skimmer', self.idle);
      if (ended()) return;
    }

    // Temporary: gone for the rest of the hack. A script never empties.
    if (temporary && self.deck.length > 1) {
      self.deck.splice(idx, 1);
      self.pos = idx < self.deck.length ? idx : 0;
    } else self.pos = (idx + 1) % self.deck.length;
  }

  // Snake order: Jo 1, system 2, Jo 2, system 2, ...
  let cycle = 0;
  let safeguard = false;
  outer: while (true) {
    cycle++;
    const self = cycle % 2 === 1 ? jo : sys;
    const count = cycle === 1 ? 1 : 2;
    for (let i = 0; i < count; i++) {
      if (plays >= MAX_PLAYS) {
        safeguard = true;
        events.push({ type: 'safeguard', cycle });
        break outer;
      }
      playCard(self, cycle);
      if (ended()) break outer;
    }
  }

  const won = !safeguard && sys.hp <= 0;
  return { events, won, cover: Math.max(0, jo.hp), plays };
}

// Builds a hack's full input from operation state.
function hackInput(opSeed, n, { script, cover, maxCover, tools }) {
  return {
    script,
    cover,
    maxCover,
    tools,
    integrity: hackInfo(n).integrity,
    countermeasures: makeCountermeasures(opSeed, n),
  };
}
