// Jo's Discovery — tunable game data. Rules live in engine.js; everything
// a designer might want to change without touching code lives here.

const START_COVER = 30;
const IDLE_PENALTY = 2;
const MAX_PLAYS = 1000; // engineering safeguard; idle timeout should make it unreachable
const HACKS_PER_PROGRAM = 5;
const TOTAL_HACKS = 25;

// Open question in DESIGN.md: does the Archive survive being Traced?
// Suggested default is yes. Flip to false to wipe records on a new operation.
const ARCHIVE_PERSISTS_ON_TRACE = true;

// Cards are data with an effect function. `fx` is the engine's API for the
// side playing the card (see fx() in engine.js): attack, defend, boost,
// firewall, counter, overflow, doubleStrength, doubleDefense, lowerOpp,
// tarpit, isLast. Each call emits its own event, so a card with two effects
// prints two lines. `temporary: true` removes the card for the rest of the
// hack after it resolves.
const CARDS = {
  attack: {
    name: 'Attack',
    text: 'Deal 3 damage.',
    effect: (fx) => fx.attack(3),
  },
  defend: {
    name: 'Defend',
    text: 'Gain 3 defense.',
    effect: (fx) => fx.defend(3),
  },
  boost_attack: {
    name: 'Boost Attack',
    text: '+1 to your attacks for the rest of this hack.',
    effect: (fx) => fx.boost('atk'),
  },
  boost_defense: {
    name: 'Boost Defense',
    text: '+1 to your defense for the rest of this hack.',
    effect: (fx) => fx.boost('def'),
  },
  overflow: {
    name: 'Overflow',
    text: 'Deal damage equal to your defense. Attack strength does not apply.',
    effect: (fx) => fx.overflow(),
  },
  payload: {
    name: 'Payload',
    text: 'Deal 1 damage. If this is the last card in your script, deal 1 damage again.',
    effect: (fx) => {
      fx.attack(1);
      if (fx.isLast()) fx.attack(1);
    },
  },
  throttle: {
    name: 'Throttle',
    text: "Lower the opponent's attack strength by 1.",
    effect: (fx) => fx.lowerOpp('atk'),
  },
  corrupt: {
    name: 'Corrupt',
    text: "Lower the opponent's defense strength by 1.",
    effect: (fx) => fx.lowerOpp('def'),
  },
  tarpit: {
    name: 'Tarpit',
    text: "Double the opponent's idle timeout cost.",
    effect: (fx) => fx.tarpit(),
  },
  siphon: {
    name: 'Siphon',
    text: 'Deal 1 damage. If it lowers health, gain 1 defense.',
    effect: (fx) => {
      if (fx.attack(1).through > 0) fx.defend(1);
    },
  },
  echo: {
    name: 'Echo',
    text: 'Copy the effect of your previous card that wasn\'t Echo. If that card is Temporary, so is this one.',
    effect: null, // resolved by the engine, which knows the previous card
  },
  mirror: {
    name: 'Mirror',
    text: 'Double your defense.',
    effect: (fx) => fx.doubleDefense(),
  },
  lockdown: {
    name: 'Lockdown',
    text: 'Gain 20 defense. Temporary.',
    temporary: true,
    effect: (fx) => fx.defend(20),
  },
  zero_day: {
    name: 'Zero-Day',
    text: 'Deal 1 damage, then deal 5 damage. Temporary.',
    temporary: true,
    effect: (fx) => {
      fx.attack(1);
      fx.attack(5);
    },
  },
  overclock: {
    name: 'Overclock',
    text: 'Double your attack strength. Temporary.',
    temporary: true,
    effect: (fx) => fx.doubleStrength('atk'),
  },
  harden: {
    name: 'Harden',
    text: 'Double your defense strength. Temporary.',
    temporary: true,
    effect: (fx) => fx.doubleStrength('def'),
  },
  tripwire: {
    name: 'Tripwire',
    text: 'Gain 5 Counter. Temporary.',
    temporary: true,
    effect: (fx) => fx.counter(5),
  },
  watchdog: {
    name: 'Watchdog',
    text: 'Gain 2 Counter.',
    effect: (fx) => fx.counter(2),
  },
  ping: {
    name: 'Ping',
    text: 'Deal 1 damage. Gain 1 Counter.',
    effect: (fx) => {
      fx.attack(1);
      fx.counter(1);
    },
  },
  quarantine: {
    name: 'Quarantine',
    text: 'Gain 5 Firewall. Temporary.',
    temporary: true,
    effect: (fx) => fx.firewall(5),
  },
  filter: {
    name: 'Filter',
    text: 'Gain 2 Firewall.',
    effect: (fx) => fx.firewall(2),
  },
  sandbox: {
    name: 'Sandbox',
    text: 'Gain 1 defense. Gain 1 Firewall.',
    effect: (fx) => {
      fx.defend(1);
      fx.firewall(1);
    },
  },
};

// Keyword reminders, shown when a card file is opened.
const KEYWORDS = {
  Temporary: 'After this card resolves, it is removed from your script for the rest of the hack.',
  Counter: 'When an opponent\'s card hits you, blocked or not, lose 1 Counter and deal 1 damage back (attack strength applies).',
  Firewall: 'When an opponent\'s card hits you, lose 1 Firewall and block all of that hit. Checked before defense. Does not block the idle timeout.',
};

// Cards that can appear in Compile offers and as random countermeasures.
// Jo and the system share it. A card is in the pool from hack `CARD_UNLOCK[id]`
// onward (default 1): each program's Decode unlocks four cards, first offered
// in the Compiles right after it and drawn by the system from the next hack.
const CARD_POOL = Object.keys(CARDS);
const CARD_UNLOCK = {
  // after SAPWOOD (hack 5)
  payload: 6, lockdown: 6, zero_day: 6, siphon: 6,
  // after GRAFT (hack 10)
  watchdog: 11, filter: 11, tarpit: 11, overflow: 11,
  // after ROOTSTOCK (hack 15)
  tripwire: 16, ping: 16, quarantine: 16, sandbox: 16,
  // after CANOPY (hack 20)
  overclock: 21, harden: 21, mirror: 21, echo: 21,
};

// A script must keep this many non-Temporary cards, so it can never run out.
const MIN_PERMANENT = 2;

const STARTING_SCRIPT = ['attack', 'attack', 'defend', 'defend'];

// Every hack's countermeasures start from these, plus (hack − 1) random cards.
const BASE_COUNTERMEASURES = ['attack', 'defend', 'defend'];

// Tool effects are applied by id in engine.js.
const TOOLS = {
  scrubber: { name: 'Scrubber', text: 'At the start of each hack, restore 3 Cover.' },
  replay: { name: 'Replay', text: 'Your first card each hack plays twice.' },
  honeypot: { name: 'Honeypot', text: 'When your defense blocks all damage, gain 1 defense.' },
  rootkit: { name: 'Rootkit', text: 'Start each hack with +1 to your attacks.' },
  air_gap: { name: 'Air Gap', text: 'Start each hack with +1 to your defense.' },
  redundancy: { name: 'Redundancy', text: 'While your defense is 20 or more, a hit removes only as much defense as its damage.' },
  skimmer: { name: 'Skimmer', text: 'When the opponent pays an idle timeout, restore that much Cover.' },
  feedback: { name: 'Feedback', text: 'When you restore Cover during a hack, deal 1 damage to the opponent.' },
  autopatch: { name: 'Autopatch', text: 'When a hit lowers your Cover, gain 1 defense.' },
};

const MAINTENANCE = {
  go_dark: { name: 'Go Dark', text: 'Restore Cover equal to 1/3 of max Cover, rounded up.' },
  new_alias: { name: 'New Alias', text: '+5 max Cover, then restore 5 Cover.' },
  refactor: { name: 'Refactor', text: 'Remove one file of your choice from /script.' },
};

// Offers can be skipped by deleting every file (open question; default yes).
const SKIPPABLE = { compile: true, maintenance: true, tool: true };

// Integrity per program: four Extractions then the Decode. Placeholder values.
const PROGRAMS = [
  {
    id: 'SAPWOOD',
    integrity: [5, 6, 7, 9, 12],
    line: 'That\'s my number. Those are my scores. "Continue morning refreshments."',
  },
  {
    id: 'GRAFT',
    integrity: [10, 11, 12, 14, 18],
    line: 'Uncle Marcus. Ninety-three. Years of it.',
  },
  {
    id: 'ROOTSTOCK',
    integrity: [15, 16, 17, 19, 24],
    line: 'Reese has never worked here. "Consent: not required."',
  },
  {
    id: 'CANOPY',
    integrity: [20, 21, 22, 24, 30],
    line: "Jamie. They're watching Jamie.",
  },
  {
    id: 'EVERGREEN',
    integrity: [25, 26, 27, 29, 40],
    line: null, // no reaction line: cut straight to the ending
  },
];

const STORY = {
  opening: "Three months at Evergreen. I haven't been tired once. Nobody here has. I want to know why.",
  note: 'Evergreen has patient records for Mabel Taylor, Patient ID #748210',
  closing: "She folded the page and put it at the bottom of the chest, under Mabel's stories.",
  title: "Jo's Discovery",
};
