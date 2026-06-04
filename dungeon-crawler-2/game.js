// ── audio ─────────────────────────────────────────────────────────────────────

const TRACK_VOL  = 0.4;

const bgMusic       = new Audio('https://opengameart.org/sites/default/files/Lost%20signal%20main%20theme%20%28WIP%29.mp3');
const shopMusic     = new Audio('https://opengameart.org/sites/default/files/ville_seppanen-1_g.mp3');
const battleMusic   = new Audio('https://opengameart.org/sites/default/files/heavens_forbid_0.ogg');
const rewardMusic   = new Audio('https://opengameart.org/sites/default/files/TremLoadingloopl.wav');
const finalBossMusic = new Audio('https://opengameart.org/sites/default/files/e.ogg');
[bgMusic, shopMusic, battleMusic, rewardMusic, finalBossMusic].forEach(t => { t.loop = true; t.volume = TRACK_VOL; });
const FADE_MS    = 1200;
const FADE_STEPS = 40;
let   fadeTimer  = null;

const hitSounds = Array.from({ length: 37 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  const a = new Audio(`sfx/hit${n}.mp3`);
  a.volume = 0.3;
  return a;
});

function playSmashSound() {
  const snd = hitSounds[Math.floor(Math.random() * hitSounds.length)];
  snd.currentTime = 0;
  snd.play().catch(() => {});
}

function playTrack(next) {
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }

  const outgoing = [bgMusic, shopMusic, battleMusic, rewardMusic, finalBossMusic]
    .filter(t => t !== next && !t.paused);

  if (next.paused) {
    next.volume = 0;
    next.play().catch(() => {});
  }

  let step = 0;
  fadeTimer = setInterval(() => {
    step++;
    const p = step / FADE_STEPS;
    outgoing.forEach(t => { t.volume = Math.max(0, TRACK_VOL * (1 - p)); });
    next.volume = Math.min(TRACK_VOL, TRACK_VOL * p);
    if (step >= FADE_STEPS) {
      clearInterval(fadeTimer);
      fadeTimer = null;
      outgoing.forEach(t => { t.pause(); t.currentTime = 0; t.volume = TRACK_VOL; });
    }
  }, FADE_MS / FADE_STEPS);
}

// ── data ──────────────────────────────────────────────────────────────────────

const BOSS_DATA = [
  { name: 'Corrupted Node',     hp: 7,  attack: 1, art: 'beams-aura',        specialAbility: 'minion_death_heal_1', minions: [
    { name: 'Volatile Drone', attack: 2, health: 1, failsafe: 'transfer_attack', art: 'missile-pod' },
    { name: 'Relay Unit',     attack: 1, health: 3, deploy: 'draw_a_card', cost: 2, art: 'aerial-signal' },
  ]},
  { name: 'Security Drone',     hp: 12, attack: 2, art: 'awareness',          specialAbility: 'minion_death_gain_attack_1', minions: [
    { name: 'Amp Unit',      attack: 1, health: 1, extract: 'share_attack',           cost: 2, art: 'beams-aura' },
    { name: 'Bulwark Unit',  attack: 2, health: 3, extract: 'give_stats_to_replacer', cost: 2, art: 'arrows-shield' },
  ]},
  { name: 'Hive Controller',    hp: 15, attack: 3, art: 'tesla-coil',         specialAbility: 'minion_death_gain_1_1', minions: [
    { name: 'Mender Unit', attack: 1, health: 4, deploy: 'hero_heal_5',         cost: 2, art: 'crowned-heart' },
    { name: 'Pulse Node',  attack: 2, health: 2, failsafe: 'heal_friendlies_2', cost: 2, art: 'tesla-coil' },
    { name: 'Surge Unit',  attack: 1, health: 1, failsafe: 'buff_all_friendlies',cost: 2, art: 'power-lightning' },
  ]},
  { name: 'Combat Mech',        hp: 18, attack: 3, art: 'bolter-gun',         specialAbility: 'on_attack_splash_2', minions: [
    { name: 'Chain Unit',  attack: 3, health: 3, deploy: 'trigger_random_failsafe', cost: 2, art: 'focused-lightning' },
    { name: 'Blast Drone', attack: 4, health: 1, failsafe: 'deal_4_damage',         cost: 2, art: 'bolter-gun' },
    { name: 'Echo Unit',   attack: 1, health: 1, react: 'failsafe', cost: 2, art: 'body-swapping' },
    { name: 'Trigger Unit',attack: 1, health: 1, react: 'deploy',   cost: 2, art: 'autogun' },
  ]},
  { name: 'Stealth Cruiser',    hp: 22, attack: 4, art: 'enlightenment',      specialAbility: 'on_attack_aoe_1', minions: [
    { name: 'Scatter Drone', attack: 1, health: 1, failsafe: 'deal_1_to_all',   cost: 2, art: 'atomic-slashes' },
    { name: 'Recon Unit',    attack: 2, health: 3, extract: 'draw_2_cards',     cost: 2, art: 'awareness' },
    { name: 'Supply Drone',  attack: 3, health: 1, react:   'on_play',           cost: 2, art: 'cog' },
    { name: 'Power Core',    attack: 1, health: 1, failsafe: 'buff_random_4_4', cost: 2, art: 'enlightenment' },
  ]},
  { name: 'Synthetic Overlord', hp: 26, attack: 5, art: 'all-for-one',        specialAbility: 'on_attack_buff_friendlies_3_3', minions: [
    { name: 'Amplifier Node',   attack: 5, health: 1, passive:  'double_deploy',     cost: 2, art: 'all-for-one' },
    { name: 'Redundancy Core',  attack: 1, health: 5, passive:  'double_failsafe',   cost: 2, art: 'backup' },
    { name: 'Harvest Grid',     attack: 3, health: 3, passive:  'double_extract',    cost: 2, art: 'recycle' },
    { name: 'Archive Node',     attack: 1, health: 2, react: 'draw_on_deploy',       cost: 2, art: 'cog-lock' },
  ]},
  { name: 'Quantum Titan', hp: 30, attack: 8, art: 'eye-shield',          specialAbility: 'double_attack', minions: [
    { name: 'Aegis Unit',    attack: 1, health: 1, passive: 'negate_damage', cost: 2, art: 'eye-shield' },
    { name: 'Twin Striker',  attack: 5, health: 2, passive: 'double_attack', cost: 2, art: 'double-shot' },
    { name: 'Scatter Array', attack: 1, health: 3, passive: 'cleave',        cost: 2, art: 'biohazard' },
    { name: 'Catalyst Node', attack: 1, health: 1, deploy:  'draw_all_cards', cost: 2, art: 'crowned-skull' },
  ]},
  { name: 'The Architect', hp: 36, attack: 7, art: 'crowned-skull',       passive: 'immune_until_minions_dead', minions: [
    { name: 'Prime Unit', attack: 10, health: 10, art: 'oppression', failsafe: 'give_architect_10_10' },
    { name: 'Prime Unit', attack: 10, health: 10, art: 'oppression', failsafe: 'give_architect_10_10' },
    { name: 'Prime Unit', attack: 10, health: 10, art: 'oppression', failsafe: 'give_architect_10_10' },
    { name: 'Prime Unit', attack: 10, health: 10, art: 'oppression', failsafe: 'give_architect_10_10' },
  ]},
];

// Attack order: P0,E0,P1,E1,P2,E2,P3,E3,P4,E4  (left-to-right alternating sides)
const ATTACK_SEQ = [
  {side:'p',col:0},{side:'e',col:0},
  {side:'p',col:1},{side:'e',col:1},
  {side:'p',col:2},{side:'e',col:2},
  {side:'p',col:3},{side:'e',col:3},
  {side:'p',col:4},{side:'e',col:4},
];
const ATTACK_MS = 250;

const DEPLOY_EFFECTS = {
  hero_attack_plus_1:       '<b>Deploy:</b> Give your Commander +1 Attack.',
  hero_health_plus_1:       '<b>Deploy:</b> Give your Commander +1 Health.',
  draw_a_card:              '<b>Deploy:</b> Draw a card.',
  hero_heal_5:              '<b>Deploy:</b> Give your Commander +5 Max Health and restore 5 health.',
  trigger_random_failsafe:  '<b>Deploy:</b> Activate the Failsafe of a random friendly unit.',
  gain_1_gold:              '<b>Deploy:</b> Gain 2 credits.',
  buff_all_4_4:             '<b>Deploy:</b> Give all friendly units +4 Attack and +4 Health.',
  draw_all_cards:           '<b>Deploy:</b> Draw all remaining cards in your deck.',
};

const EXTRACT_EFFECTS = {
  share_attack:           '<b>Extract:</b> Give this unit\'s Attack to all friendly units.',
  give_stats_to_replacer: '<b>Extract:</b> Give this unit\'s Attack and Health to the unit that replaces it.',
  draw_2_cards:           '<b>Extract:</b> Draw 2 cards.',
};

const FAILSAFE_EFFECTS = {
  transfer_attack:     '<b>Failsafe:</b> Give another random friendly unit this card\'s Attack.',
  heal_friendlies_2:   '<b>Failsafe:</b> Restore 2 health to all friendly units.',
  buff_all_friendlies: '<b>Failsafe:</b> Give all friendly units +1 Attack and +1 Health.',
  deal_4_damage:       '<b>Failsafe:</b> Deal 4 damage to a random enemy unit.',
  deal_1_to_all:       '<b>Failsafe:</b> Deal 1 damage to all opposing units.',
  buff_random_4_4:     '<b>Failsafe:</b> Give a random friendly unit +4 Attack and +4 Health.',
  spawn_salvage_bot:    '<b>Failsafe:</b> Replace this unit with a 4/1 Salvage Bot.',
  give_architect_10_10: '<b>Failsafe:</b> Give The Architect +10 Attack and +10 Health.',
};

const REACT_EFFECTS = {
  failsafe:       'When a friendly Failsafe triggers, this gains +1 Attack and +1 Health.',
  deploy:         'When a friendly Deploy triggers, this gains +1 Attack and +1 Health.',
  on_play:        'Whenever you play a card, gain 1 credit.',
  draw_on_deploy: 'When you trigger a Deploy effect, draw a card.',
};

const PASSIVE_EFFECTS = {
  double_deploy:   '<b>Passive:</b> Your Deploy effects trigger an extra time.',
  double_failsafe: '<b>Passive:</b> Your Failsafe effects trigger an extra time.',
  double_extract:  '<b>Passive:</b> Your Extract effects trigger an extra time.',
  negate_damage:   '<b>Passive:</b> Negate any damage dealt to this unit.',
  double_attack:   '<b>Passive:</b> This unit attacks twice.',
  cleave:          '<b>Passive:</b> When this unit attacks, it deals its attack damage to all enemy units.',
};

const BOSS_ABILITY_EFFECTS = {
  minion_death_heal_1:         'When a support unit dies, gain 1 health.',
  minion_death_gain_attack_1:  'When a support unit dies, gain 1 attack.',
  minion_death_gain_1_1:       'When a support unit dies, gain 1 health and 1 attack.',
  on_attack_splash_2:          'When this attacks, deal 2 damage to a random enemy unit first.',
  on_attack_aoe_1:             'Before this attacks, deal 1 damage to all enemy units.',
  on_attack_buff_friendlies_3_3: 'Before this attacks, give all support units +3 attack and +3 health.',
  double_attack:                 'Attacks twice per turn.',
};

const BOSS_PASSIVE_EFFECTS = {
  immune_until_minions_dead: 'Cannot be damaged until all Prime Units are destroyed.',
};

const MINION_POOL = [
  { name: 'Guard Bot',   attack: 1, health: 1, art: 'android-mask' },
  { name: 'Guard Bot',   attack: 1, health: 1, art: 'android-mask' },
  { name: 'Guard Bot',   attack: 1, health: 1, art: 'android-mask' },
  { name: 'Scout Drone', attack: 1, health: 1, deploy: 'hero_attack_plus_1', cost: 2, art: 'targeting' },
  { name: 'Scout Drone', attack: 1, health: 1, deploy: 'hero_attack_plus_1', cost: 2, art: 'targeting' },
  { name: 'Scout Drone', attack: 1, health: 1, deploy: 'hero_attack_plus_1', cost: 2, art: 'targeting' },
  { name: 'Field Medic', attack: 1, health: 2, deploy: 'hero_health_plus_1', cost: 2, art: 'bandaged' },
  { name: 'Field Medic', attack: 1, health: 2, deploy: 'hero_health_plus_1', cost: 2, art: 'bandaged' },
  { name: 'Field Medic', attack: 1, health: 2, deploy: 'hero_health_plus_1', cost: 2, art: 'bandaged' },
];

const RELIC_POOL = [
  { id: 'war_horn',      name: 'Battle Uplink',   type: 'relic', desc: 'All your units gain +1 Attack.' },
  { id: 'iron_shield',   name: 'Defense Matrix',  type: 'relic', desc: 'All your units gain +1 Health.' },
  { id: 'fortune_coin',  name: 'Data Cache',      type: 'relic', desc: 'Earn 2 extra credits from victories.' },
  { id: 'ancient_tome',  name: 'Trade Algorithm', type: 'relic', desc: 'Shop items cost 1 less credit (min 1).' },
  { id: 'stone_heart',   name: 'Reinforced Hull', type: 'relic', desc: 'Your Commander gains +8 Max Health.' },
  { id: 'berserker_axe',    name: 'Combat Implant',    type: 'relic', desc: 'Your Commander gains +2 Attack.' },
{ id: 'first_deploy',   name: 'Flashpoint Coil',   type: 'relic', desc: 'The first Deploy effect each battle triggers twice.' },
  { id: 'first_extract',  name: 'Recall Surge',      type: 'relic', desc: 'The first Extract effect each battle triggers twice.' },
  { id: 'first_failsafe', name: 'Deathswitch',       type: 'relic', desc: 'The first Failsafe effect each battle triggers twice.' },
  { id: 'tactical_uplink', name: 'Tactical Uplink',  type: 'relic', desc: 'Draw 2 additional cards at the start of each battle.' },
];


const EFFECT_POOL = [
  { id: 'treasure_chest',  name: 'Resource Cache',   type: 'effect', desc: 'Gain 6 credits immediately.' },
  { id: 'call_to_arms',    name: 'Advance Intel',    type: 'effect', desc: "Add one of the next boss's support units to your roster." },
  { id: 'arcane_surge',    name: 'Systems Upgrade',  type: 'effect', desc: 'All units in your roster gain +1/+1.' },
  { id: 'divine_blessing', name: 'Emergency Repair', type: 'effect', desc: 'Restore your Commander to full health.' },
  { id: 'soul_capture',    name: 'Power Absorption', type: 'effect', desc: 'Give your Commander bonus Attack and Health based on the defeated boss tier.' },
  { id: 'purge_low_tier',  name: 'Decommission',     type: 'effect', minBoss: 3, desc: 'Purge all Tier 1 units from the card pool (starting units and units from the first two encounters).' },
];

// ── state ─────────────────────────────────────────────────────────────────────

let state;
let _id = 0;
function nextId() { return ++_id; }

function cardCost(attack, health) {
  return attack + health - 1;
}

function makeHero() {
  return { id: nextId(), name: 'Commander', attack: 2, health: 10, maxHealth: 10, isHero: true, art: 'battle-gear' };
}

function makeMinion(tmpl) {
  const base = tmpl || { name: 'Minion', attack: 1, health: 1 };
  const card = { id: nextId(), name: base.name, attack: base.attack, health: base.health };
  if (base.deploy)   card.deploy   = base.deploy;
  if (base.failsafe) card.failsafe = base.failsafe;
  if (base.extract)  card.extract  = base.extract;
  if (base.react)    card.react    = base.react;
  if (base.passive)  card.passive  = base.passive;
  if (base.art)      card.art      = base.art;
  return card;
}

function buildBossMinions(boss) {
  const slots = [null, null, null, null];
  const tmpl  = boss.minions || [];
  if (tmpl.length === 1) {
    slots[1] = makeMinion(tmpl[0]);
  } else if (tmpl.length === 2) {
    slots[1] = makeMinion(tmpl[0]);
    slots[2] = makeMinion(tmpl[1]);
  } else if (tmpl.length === 3) {
    slots[0] = makeMinion(tmpl[0]);
    slots[1] = makeMinion(tmpl[1]);
    slots[2] = makeMinion(tmpl[2]);
  } else if (tmpl.length === 4) {
    for (let i = 0; i < 4; i++) slots[i] = makeMinion(tmpl[i]);
  }
  return slots;
}

function makePoolCard(tmpl) {
  const card = {
    id: nextId(),
    name: tmpl.name,
    attack: tmpl.attack,
    health: tmpl.health,
    baseCost: tmpl.cost !== undefined ? tmpl.cost : cardCost(tmpl.attack, tmpl.health),
  };
  if (tmpl.deploy)   card.deploy   = tmpl.deploy;
  if (tmpl.failsafe) card.failsafe = tmpl.failsafe;
  if (tmpl.extract)  card.extract  = tmpl.extract;
  if (tmpl.react)    card.react    = tmpl.react;
  if (tmpl.passive)  card.passive  = tmpl.passive;
  if (tmpl.art)      card.art      = tmpl.art;
  return card;
}

function generateShop() {
  const discount = state.relics.filter(r => r.id === 'ancient_tome').length;
  const shuffled  = [...state.pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5).map(card => ({
    ...card,
    cost: Math.max(1, card.baseCost - discount),
  }));
}

function newGame() {
  playTrack(bgMusic);
  state = {
    phase: 'title',
    bossIndex: 0,
    deck: [makeHero()],
    gold: 5,
    pool: MINION_POOL.map(makePoolCard),
    shopItems: [],
    relics: [],
    pendingRewards: [],
    pendingUnlocks: [],
    lastDefeatedBoss: null,
    removals: 0,
  };
  render();
}

function startGame() {
  playTrack(shopMusic);
  state.phase = 'shop';
  state.shopItems = generateShop();
  render();
}

// ── rewards ───────────────────────────────────────────────────────────────────

function generateRewards() {
  const pool = [];
  const heldIds = state.relics.map(r => r.id);
  RELIC_POOL.forEach(r => {
    if (!heldIds.includes(r.id)) pool.push({ type: 'relic', data: r });
  });

  const boss = state.lastDefeatedBoss;
  const x = Math.ceil(state.bossIndex / 2);
  if (boss && boss.minions) {
    const seen = new Set();
    boss.minions.forEach(minion => {
      if (seen.has(minion.name)) return;
      seen.add(minion.name);
      pool.push({ type: 'card', data: { ...minion, attack: minion.attack + x, health: minion.health + x } });
    });
  }

  EFFECT_POOL.forEach(e => {
    if (e.minBoss && state.bossIndex < e.minBoss) return;
    pool.push({ type: 'effect', data: e });
    if (e.id === 'call_to_arms') pool.push({ type: 'effect', data: e });
  });
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const result = [];
  const seen = new Set();
  for (const item of shuffled) {
    const key = item.type === 'card' ? item.data.name : item.data.id;
    if (!seen.has(key)) { seen.add(key); result.push(item); }
    if (result.length === 3) break;
  }
  return result;
}

function chooseReward(index) {
  const reward = state.pendingRewards[index];
  if (!reward) return;

  if (reward.type === 'relic') {
    state.relics.push(reward.data);
    applyRelicToAll(reward.data);
  } else if (reward.type === 'card') {
    const card = makeMinion(reward.data);
    applyRelicsToNewCard(card);
    state.deck.push(card);
  } else if (reward.type === 'effect') {
    if (applyEffect(reward.data.id)) {
      state.pendingRewards = [];
      render();
      return;
    }
  }

  state.pendingRewards = [];
  state.phase = 'shop';
  state.shopItems = generateShop();
  playTrack(shopMusic);
  render();
}


function applyRelicToAll(relic) {
  if (relic.id === 'war_horn') {
    state.deck.filter(c => !c.isHero).forEach(c => c.attack++);
  } else if (relic.id === 'iron_shield') {
    state.deck.filter(c => !c.isHero).forEach(c => c.health++);
  } else if (relic.id === 'stone_heart') {
    const hero = state.deck.find(c => c.isHero);
    if (hero) { hero.health += 8; hero.maxHealth += 8; }
  } else if (relic.id === 'berserker_axe') {
    const hero = state.deck.find(c => c.isHero);
    if (hero) hero.attack += 2;
  }
  // fortune_coin: checked in endBattle; ancient_tome: checked in generateShop
}

function applyRelicsToNewCard(card) {
  if (card.isHero) return;
  for (const relic of state.relics) {
    if (relic.id === 'war_horn') card.attack++;
    if (relic.id === 'iron_shield') card.health++;
  }
}

function applyEffect(effectId) {
  if (effectId === 'treasure_chest') {
    state.gold += 6;
  } else if (effectId === 'call_to_arms') {
    state.phase = 'recruit';
    return true;
  } else if (effectId === 'arcane_surge') {
    state.deck.filter(c => !c.isHero).forEach(c => { c.attack++; c.health++; });
  } else if (effectId === 'divine_blessing') {
    const hero = state.deck.find(c => c.isHero);
    if (hero) hero.health = hero.maxHealth;
  } else if (effectId === 'purge_low_tier') {
    const lowTierNames = new Set([
      ...MINION_POOL.map(m => m.name),
      ...BOSS_DATA[0].minions.map(m => m.name),
      ...BOSS_DATA[1].minions.map(m => m.name),
    ]);
    state.pool = state.pool.filter(c => !lowTierNames.has(c.name));
  } else if (effectId === 'soul_capture') {
    const x = state.bossIndex;
    const hero = state.deck.find(c => c.isHero);
    if (hero) {
      hero.attack += x;
      hero.health += x;
      hero.maxHealth += x;
    }
  }
}

// ── actions ───────────────────────────────────────────────────────────────────

function buyCard(id) {
  const item = state.shopItems.find(i => i.id === id);
  if (!item || state.gold < item.cost) return;
  state.gold -= item.cost;
  state.pool      = state.pool.filter(p => p.id !== id);
  state.shopItems = state.shopItems.filter(i => i.id !== id);
  const card = makeMinion(item);
  applyRelicsToNewCard(card);
  state.deck.push(card);
  render();
}

function selectCard(cardId) {
  state.battle.selectedCard = state.battle.selectedCard === cardId ? null : cardId;
  render();
}

function clickSlot(slotIndex) {
  if (state.battle.selectedCard === null) return;
  playCard(state.battle.selectedCard, slotIndex);
}

function dragCard(event, cardId) {
  event.dataTransfer.setData('text/plain', String(cardId));
  state.battle.selectedCard = null;
}

function dropCard(event, slotIndex) {
  event.preventDefault();
  const cardId = parseInt(event.dataTransfer.getData('text/plain'));
  if (!cardId) return;
  playCard(cardId, slotIndex);
}

function startFightAnimation(onComplete) {
  const b = state.battle;

  const allItems = [];
  b.playerSlots.forEach((card, i) => {
    if (!card) return;
    const slotEl = document.getElementById(`ps-${i}`);
    if (!slotEl) return;
    const cardEl = slotEl.querySelector('.card');
    if (cardEl) allItems.push({ cardEl, rect: slotEl.getBoundingClientRect() });
  });
  for (let i = 0; i < 5; i++) {
    const slotEl = document.getElementById(`es-${i}`);
    if (!slotEl) continue;
    const cardEl = slotEl.querySelector('.card');
    if (cardEl) allItems.push({ cardEl, rect: slotEl.getBoundingClientRect() });
  }

  if (allItems.length === 0) { onComplete(); return; }

  const clones = allItems.map(({ cardEl, rect }) => {
    const clone = cardEl.cloneNode(true);
    Object.assign(clone.style, {
      position: 'fixed', left: rect.left + 'px', top: rect.top + 'px',
      width: rect.width + 'px', height: rect.height + 'px',
      margin: '0', zIndex: '998', pointerEvents: 'none',
      transition: 'transform 300ms ease-out', transformOrigin: 'center center',
    });
    document.body.appendChild(clone);
    cardEl.style.opacity = '0';
    return { clone, cardEl };
  });

  // Phase 1: lift all cards
  requestAnimationFrame(() => requestAnimationFrame(() => {
    clones.forEach(({ clone }) => { clone.style.transform = 'scale(1.28)'; });
  }));

  // Pause at peak, then settle back down
  setTimeout(() => {
    setTimeout(() => {
      clones.forEach(({ clone }) => {
        clone.style.transition = 'transform 220ms ease-out';
        clone.style.transform  = '';
      });
      setTimeout(() => {
        clones.forEach(({ clone, cardEl }) => {
          if (clone.parentNode) document.body.removeChild(clone);
          cardEl.style.opacity = '';
        });
        onComplete();
      }, 220);
    }, 160); // pause at peak
  }, 300); // wait for lift
}

function startFight() {
  const b = state.battle;
  b.fighting = true;
  b.seqPos   = 0;
  b.log      = [];
  b.playerSlots.forEach(c => { if (c) c.currentHp = c.currentHp ?? c.health; });
  b.bossMinions.forEach(c => { if (c) c.currentHp = c.currentHp ?? c.health; });
  render();
  startFightAnimation(() => setTimeout(combatTick, ATTACK_MS));
}

function fireBossOnAttackAbility(callback) {
  const boss = BOSS_DATA[state.bossIndex];

  if (boss.specialAbility === 'on_attack_splash_2') {
    const targetCol = randomPlayer();
    if (targetCol !== -1) {
      const tgtEl = document.getElementById(`ps-${targetCol}`);
      if (tgtEl) {
        const tr = tgtEl.getBoundingClientRect();
        spawnImpact(tr.left + tr.width / 2, tr.top + tr.height / 2, 'e');
        playSmashSound();
      }
      const targetName = state.battle.playerSlots[targetCol]?.name;
      damagePlayer(targetCol, 2);
      state.battle.log.push(`${boss.name}'s ability triggers — deals 2 damage to your ${targetName}!`);
      render();
      applyDamageAnimations();
    }
    setTimeout(callback, ATTACK_MS);

  } else if (boss.specialAbility === 'on_attack_aoe_1') {
    let anyHit = false;
    for (let col = 0; col < 5; col++) {
      if (!state.battle.playerSlots[col]) continue;
      const tgtEl = document.getElementById(`ps-${col}`);
      if (tgtEl) {
        const tr = tgtEl.getBoundingClientRect();
        spawnImpact(tr.left + tr.width / 2, tr.top + tr.height / 2, 'e');
      }
      damagePlayer(col, 1);
      anyHit = true;
    }
    if (anyHit) {
      playSmashSound();
      state.battle.log.push(`${boss.name}'s ability triggers — deals 1 damage to all your units!`);
      render();
      applyDamageAnimations();
    }
    setTimeout(callback, ATTACK_MS);

  } else if (boss.specialAbility === 'on_attack_buff_friendlies_3_3') {
    let anyBuffed = false;
    state.battle.bossMinions.forEach(m => {
      if (!m) return;
      m.attack += 3;
      m.health += 3;
      if (m.currentHp !== undefined) m.currentHp += 3;
      state.battle.pendingStatBuffs.push({ id: m.id, stat: 'attack', side: 'enemy' });
      anyBuffed = true;
    });
    if (anyBuffed) {
      state.battle.log.push(`${boss.name}'s ability triggers — all support units gain +3/+3!`);
      render();
      applyStatBuffAnimations();
    }
    setTimeout(callback, ATTACK_MS);

  } else {
    callback();
  }
}

function combatTick() {
  if (isBattleOver()) { endBattle(); return; }

  for (let checked = 0; checked < ATTACK_SEQ.length; checked++) {
    const { side, col } = ATTACK_SEQ[state.battle.seqPos];
    state.battle.seqPos = (state.battle.seqPos + 1) % ATTACK_SEQ.length;

    const occupied = side === 'p'
      ? state.battle.playerSlots[col] !== null
      : enemyOccupied(col);

    if (occupied) {
      if (side === 'e' && col === 2) {
        const boss = BOSS_DATA[state.bossIndex];
        if (boss.specialAbility && boss.specialAbility.startsWith('on_attack_')) {
          fireBossOnAttackAbility(() => {
            if (isBattleOver()) { endBattle(); return; }
            const targetCol = randomPlayer();
            if (targetCol === -1) { setTimeout(combatTick, ATTACK_MS); return; }
            animateAttack('e', 2, targetCol, () => {
              doAttack('e', 2, targetCol);
              render();
              applyStatBuffAnimations();
              applyDamageAnimations();
              if (isBattleOver()) endBattle();
              else setTimeout(combatTick, ATTACK_MS);
            });
          });
          return;
        }
      }
      const targetCol = side === 'p' ? randomEnemy() : randomPlayer();
      if (targetCol === -1) continue;
      animateAttack(side, col, targetCol, () => {
        doAttack(side, col, targetCol);
        render();
        applyStatBuffAnimations();
        applyDamageAnimations();
        if (isBattleOver()) { endBattle(); return; }
        const attacker = side === 'p'
          ? state.battle.playerSlots[col]
          : (col !== 2 ? state.battle.bossMinions[minionIdx(col)] : null);
        const bossDoubleAttack = side === 'e' && col === 2 && BOSS_DATA[state.bossIndex].specialAbility === 'double_attack';
        if ((attacker && attacker.passive === 'double_attack') || bossDoubleAttack) {
          const secondTarget = side === 'p' ? randomEnemy() : randomPlayer();
          if (secondTarget !== -1) {
            animateAttack(side, col, secondTarget, () => {
              doAttack(side, col, secondTarget);
              render();
              applyStatBuffAnimations();
              applyDamageAnimations();
              if (isBattleOver()) endBattle();
              else setTimeout(combatTick, ATTACK_MS);
            });
            return;
          }
        }
        setTimeout(combatTick, ATTACK_MS);
      });
      return;
    }
  }
  endBattle();
}

function doAttack(side, col, targetCol) {
  const boss = BOSS_DATA[state.bossIndex];
  const b    = state.battle;

  if (side === 'p') {
    const attacker = b.playerSlots[col];
    if (attacker.passive === 'cleave') {
      b.log.push(`Your ${attacker.name} cleaves all enemies for ${attacker.attack}!`);
      for (let eCol = 0; eCol < 5; eCol++) {
        if (!enemyOccupied(eCol)) continue;
        const tName = eCol === 2 ? boss.name : b.bossMinions[minionIdx(eCol)].name;
        damageEnemy(eCol, attacker.attack);
        if (eCol === 2 && b.bossHp <= 0) b.log.push(`${boss.name} neutralized!`);
        else if (eCol !== 2 && !b.bossMinions[minionIdx(eCol)]) b.log.push(`${tName} destroyed!`);
      }
    } else {
      const targetName = targetCol === 2
        ? boss.name
        : b.bossMinions[minionIdx(targetCol)].name;
      damageEnemy(targetCol, attacker.attack);
      b.log.push(`Your ${attacker.name} attacks ${targetName} for ${attacker.attack}.`);
      if (targetCol === 2 && b.bossHp <= 0)
        b.log.push(`${boss.name} neutralized!`);
      else if (targetCol !== 2 && !b.bossMinions[minionIdx(targetCol)])
        b.log.push(`${targetName} destroyed!`);
    }
  } else {
    const attk = col === 2
      ? { name: boss.name, attack: b.bossAttack }
      : b.bossMinions[minionIdx(col)];
    if (attk.passive === 'cleave') {
      b.log.push(`${attk.name} cleaves all your units for ${attk.attack}!`);
      for (let pCol = 0; pCol < 5; pCol++) {
        if (!b.playerSlots[pCol]) continue;
        const tName = b.playerSlots[pCol].name;
        damagePlayer(pCol, attk.attack);
        if (!b.playerSlots[pCol]) b.log.push(`Your ${tName} destroyed!`);
      }
    } else {
      const target = b.playerSlots[targetCol];
      damagePlayer(targetCol, attk.attack);
      b.log.push(`${attk.name} attacks your ${target.name} for ${attk.attack}.`);
      if (!b.playerSlots[targetCol])
        b.log.push(`Your ${target.name} destroyed!`);
    }
  }
}

// ── combat helpers ────────────────────────────────────────────────────────────

function minionIdx(col) { return col < 2 ? col : col - 1; }

function enemyOccupied(col) {
  return col === 2
    ? state.battle.bossHp > 0
    : state.battle.bossMinions[minionIdx(col)] !== null;
}

function randomEnemy() {
  const cols = [0,1,2,3,4].filter(enemyOccupied);
  if (!cols.length) return -1;
  return cols[Math.floor(Math.random() * cols.length)];
}

function randomPlayer() {
  const cols = state.battle.playerSlots.map((c,i) => c ? i : -1).filter(i => i !== -1);
  if (!cols.length) return -1;
  return cols[Math.floor(Math.random() * cols.length)];
}

function spawnImpact(x, y, side) {
  const color = side === 'p' ? '#44cc66' : '#cc4444';
  const size  = 64;
  ['impact-burst', 'impact-ring'].forEach(cls => {
    const el = document.createElement('div');
    el.className = cls;
    el.style.setProperty('--impact-color', color);
    Object.assign(el.style, {
      left:   (x - size / 2) + 'px',
      top:    (y - size / 2) + 'px',
      width:  size + 'px',
      height: size + 'px',
    });
    document.body.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 420);
  });

}

function animateAttack(side, col, targetCol, callback) {
  const srcId = side === 'p' ? `ps-${col}` : `es-${col}`;
  const tgtId = side === 'p' ? `es-${targetCol}` : `ps-${targetCol}`;

  const srcEl = document.getElementById(srcId);
  const tgtEl = document.getElementById(tgtId);
  const card  = srcEl && srcEl.querySelector('.card');

  if (!card || !tgtEl) { callback(); return; }

  const sr = srcEl.getBoundingClientRect();
  const tr = tgtEl.getBoundingClientRect();
  const dx = (tr.left + tr.width  / 2) - (sr.left + sr.width  / 2);
  const dy = (tr.top  + tr.height / 2) - (sr.top  + sr.height / 2);

  const clone = card.cloneNode(true);
  Object.assign(clone.style, {
    position:        'fixed',
    left:            sr.left + 'px',
    top:             sr.top  + 'px',
    width:           sr.width  + 'px',
    height:          sr.height + 'px',
    margin:          '0',
    zIndex:          '999',
    pointerEvents:   'none',
    transition:      'transform 300ms ease-out',
    transformOrigin: 'center center',
  });
  document.body.appendChild(clone);
  card.style.opacity = '0';

  // Phase 1: lift — scale up before lunging
  requestAnimationFrame(() => requestAnimationFrame(() => {
    clone.style.transform = 'scale(1.28)';
  }));

  setTimeout(() => {
    // Brief pause at full lift before lunging
    setTimeout(() => {
    // Phase 2: lunge toward target
    clone.style.transition = 'transform 200ms ease-in';
    clone.style.transform  = `translate(${dx}px, ${dy}px) scale(1)`;

    setTimeout(() => {
      // Impact at target position
      spawnImpact(tr.left + tr.width / 2, tr.top + tr.height / 2, side);
      playSmashSound();

      // Phase 3: snap back
      clone.style.transition = 'transform 160ms ease-out';
      clone.style.transform  = '';
      setTimeout(() => {
        document.body.removeChild(clone);
        card.style.opacity = '';
        callback();
      }, 160);
    }, 200);
    }, 160); // pause at peak lift
  }, 300); // wait for lift to complete
}

function applyReactBuffs(triggerType) {
  state.battle.playerSlots.forEach(c => {
    if (!c) return;
    if (c.react === triggerType) {
      c.attack++;
      c.health++;
      if (c.currentHp !== undefined) c.currentHp++;
      if (c.maxHealth !== undefined) c.maxHealth++;
      state.battle.pendingStatBuffs.push({ id: c.id, stat: 'attack', side: 'player' });
    }
    if (c.react === 'draw_on_deploy' && triggerType === 'deploy') {
      if (state.battle.remainingDeck.length > 0) {
        const drawn = state.battle.remainingDeck.shift();
        state.battle.hand.push(drawn);
        state.battle.log.push(`${c.name}'s React triggers — drew ${drawn.name}!`);
      } else {
        state.battle.log.push(`${c.name}'s React triggers — deck is empty!`);
      }
    }
  });
}

function triggerEnemyFailsafe(card) {
  if (!card.failsafe) return;
  if (card.failsafe === 'transfer_attack') {
    const boss = BOSS_DATA[state.bossIndex];
    const otherMinions = state.battle.bossMinions.filter(m => m && m.id !== card.id);
    const targets = [...otherMinions];
    if (state.battle.bossHp > 0) targets.push('boss');
    if (targets.length === 0) return;
    const pick = targets[Math.floor(Math.random() * targets.length)];
    if (pick === 'boss') {
      state.battle.bossAttack += card.attack;
      state.battle.pendingStatBuffs.push({ id: 'boss', stat: 'attack', side: 'enemy' });
      state.battle.log.push(`${card.name}'s Failsafe triggers — ${boss.name} gains +${card.attack} Attack!`);
    } else {
      pick.attack += card.attack;
      state.battle.pendingStatBuffs.push({ id: pick.id, stat: 'attack', side: 'enemy' });
      state.battle.log.push(`${card.name}'s Failsafe triggers — ${pick.name} gains +${card.attack} Attack!`);
    }
  } else if (card.failsafe === 'heal_friendlies_2') {
    state.battle.bossMinions.forEach(m => {
      if (m && m.id !== card.id) m.currentHp = Math.min(m.health, (m.currentHp ?? m.health) + 2);
    });
    state.battle.log.push(`${card.name}'s Failsafe triggers — enemy units restore 2 health!`);
  } else if (card.failsafe === 'buff_all_friendlies') {
    state.battle.bossMinions.forEach(m => {
      if (m && m.id !== card.id) {
        m.attack++; m.health++; if (m.currentHp !== undefined) m.currentHp++;
        state.battle.pendingStatBuffs.push({ id: m.id, stat: 'attack', side: 'enemy' });
      }
    });
    if (state.battle.bossHp > 0) {
      state.battle.bossAttack++;
      state.battle.pendingStatBuffs.push({ id: 'boss', stat: 'attack', side: 'enemy' });
    }
    state.battle.log.push(`${card.name}'s Failsafe triggers — all enemy units gain +1/+1!`);
  } else if (card.failsafe === 'deal_4_damage') {
    const targetCol = randomPlayer();
    if (targetCol !== -1) {
      const targetName = state.battle.playerSlots[targetCol]?.name;
      damagePlayer(targetCol, 4);
      state.battle.log.push(`${card.name}'s Failsafe triggers — deals 4 damage to your ${targetName}!`);
    }
  } else if (card.failsafe === 'deal_1_to_all') {
    for (let col = 0; col < 5; col++) {
      if (state.battle.playerSlots[col]) damagePlayer(col, 1);
    }
    state.battle.log.push(`${card.name}'s Failsafe triggers — deals 1 damage to all your units!`);
  } else if (card.failsafe === 'buff_random_4_4') {
    const boss = BOSS_DATA[state.bossIndex];
    const otherMinions = state.battle.bossMinions.filter(m => m && m.id !== card.id);
    const targets = [...otherMinions];
    if (state.battle.bossHp > 0) targets.push('boss');
    if (targets.length > 0) {
      const pick = targets[Math.floor(Math.random() * targets.length)];
      if (pick === 'boss') {
        state.battle.bossAttack += 4; state.battle.bossHp += 4;
        state.battle.pendingStatBuffs.push({ id: 'boss', stat: 'attack', side: 'enemy' });
        state.battle.log.push(`${card.name}'s Failsafe triggers — ${boss.name} gains +4/+4!`);
      } else {
        pick.attack += 4; pick.health += 4;
        if (pick.currentHp !== undefined) pick.currentHp += 4;
        state.battle.pendingStatBuffs.push({ id: pick.id, stat: 'attack', side: 'enemy' });
        state.battle.log.push(`${card.name}'s Failsafe triggers — ${pick.name} gains +4/+4!`);
      }
    }
  } else if (card.failsafe === 'give_architect_10_10') {
    const boss = BOSS_DATA[state.bossIndex];
    if (state.battle.bossHp > 0) {
      state.battle.bossHp += 10;
      state.battle.bossAttack += 10;
      state.battle.pendingStatBuffs.push({ id: 'boss', stat: 'attack', side: 'enemy' });
      state.battle.log.push(`${card.name}'s Failsafe triggers — ${boss.name} gains +10 Attack and +10 Health!`);
    }
  }
}

function triggerBossAbilityOnMinionDeath() {
  const boss = BOSS_DATA[state.bossIndex];
  if (!boss.specialAbility) return;
  if (boss.specialAbility === 'minion_death_heal_1' && state.battle.bossHp > 0) {
    state.battle.bossHp++;
    state.battle.log.push(`${boss.name}'s ability triggers — regenerates 1 health!`);
  } else if (boss.specialAbility === 'minion_death_gain_attack_1' && state.battle.bossHp > 0) {
    state.battle.bossAttack++;
    state.battle.pendingStatBuffs.push({ id: 'boss', stat: 'attack', side: 'enemy' });
    state.battle.log.push(`${boss.name}'s ability triggers — gains 1 attack!`);
  } else if (boss.specialAbility === 'minion_death_gain_1_1' && state.battle.bossHp > 0) {
    state.battle.bossHp++;
    state.battle.bossAttack++;
    state.battle.pendingStatBuffs.push({ id: 'boss', stat: 'attack', side: 'enemy' });
    state.battle.log.push(`${boss.name}'s ability triggers — gains 1 health and 1 attack!`);
  }
}

function damageEnemy(col, amount) {
  if (col === 2) {
    const boss = BOSS_DATA[state.bossIndex];
    if (boss.passive === 'immune_until_minions_dead' && state.battle.bossMinions.some(m => m !== null)) {
      state.battle.log.push(`${boss.name} is immune — destroy all Prime Units first!`);
      return;
    }
    state.battle.bossHp = Math.max(0, state.battle.bossHp - amount);
    if (state.battle.bossHp > 0) state.battle.pendingDamageAnims.push({ id: 'boss' });
  } else {
    const m = state.battle.bossMinions[minionIdx(col)];
    if (!m) return;
    if (m.passive === 'negate_damage') return;
    if (m.currentHp === undefined) m.currentHp = m.health;
    m.currentHp -= amount;
    if (m.currentHp <= 0) {
      state.battle.bossMinions[minionIdx(col)] = null;
      triggerEnemyFailsafe(m);
      triggerBossAbilityOnMinionDeath();
    } else {
      state.battle.pendingDamageAnims.push({ id: m.id });
    }
  }
}

function triggerFailsafe(card, times = null, col = null) {
  if (!card.failsafe) return;
  if (times === null) {
    times = 1 + state.battle.playerSlots.filter(c => c && c.passive === 'double_failsafe').length;
    if (!state.battle.firstFailsafeUsed && state.relics.some(r => r.id === 'first_failsafe')) {
      state.battle.firstFailsafeUsed = true;
      times++;
    }
  }
  if (times <= 0) return;
  if (card.failsafe === 'transfer_attack') {
    const others = state.battle.playerSlots.filter(c => c && c.id !== card.id);
    if (others.length === 0) return;
    const target = others[Math.floor(Math.random() * others.length)];
    target.attack += card.attack;
    state.battle.pendingStatBuffs.push({ id: target.id, stat: 'attack', side: 'player' });
    state.battle.log.push(`${card.name}'s Failsafe triggers — ${target.name} gains +${card.attack} Attack!`);
  } else if (card.failsafe === 'heal_friendlies_2') {
    state.battle.playerSlots.forEach(c => {
      if (c) {
        const cap = c.maxHealth ?? c.health;
        c.currentHp = Math.min(cap, (c.currentHp ?? c.health) + 2);
      }
    });
    state.battle.log.push(`${card.name}'s Failsafe triggers — all friendly units restore 2 health!`);
  } else if (card.failsafe === 'buff_all_friendlies') {
    state.battle.playerSlots.forEach(c => {
      if (c) {
        c.attack++; c.health++; if (c.currentHp !== undefined) c.currentHp++;
        if (c.maxHealth !== undefined) c.maxHealth++;
        state.battle.pendingStatBuffs.push({ id: c.id, stat: 'attack', side: 'player' });
      }
    });
    state.battle.log.push(`${card.name}'s Failsafe triggers — all friendly units gain +1/+1!`);
  } else if (card.failsafe === 'deal_4_damage') {
    const targetCol = randomEnemy();
    if (targetCol !== -1) {
      const boss = BOSS_DATA[state.bossIndex];
      const targetName = targetCol === 2 ? boss.name : state.battle.bossMinions[minionIdx(targetCol)]?.name;
      damageEnemy(targetCol, 4);
      state.battle.log.push(`${card.name}'s Failsafe triggers — deals 4 damage to ${targetName}!`);
    }
  } else if (card.failsafe === 'deal_1_to_all') {
    for (let col = 0; col < 5; col++) {
      if (enemyOccupied(col)) damageEnemy(col, 1);
    }
    state.battle.log.push(`${card.name}'s Failsafe triggers — deals 1 damage to all enemies!`);
  } else if (card.failsafe === 'buff_random_4_4') {
    const others = state.battle.playerSlots.filter(c => c && c.id !== card.id);
    if (others.length > 0) {
      const target = others[Math.floor(Math.random() * others.length)];
      target.attack += 4; target.health += 4;
      if (target.currentHp !== undefined) target.currentHp += 4;
      if (target.maxHealth !== undefined) target.maxHealth += 4;
      state.battle.pendingStatBuffs.push({ id: target.id, stat: 'attack', side: 'player' });
      state.battle.log.push(`${card.name}'s Failsafe triggers — ${target.name} gains +4/+4!`);
    }
  } else if (card.failsafe === 'spawn_salvage_bot') {
    const slotIdx = col !== null ? col : state.battle.playerSlots.findIndex(c => c && c.id === card.id);
    if (slotIdx !== -1) {
      state.battle.playerSlots[slotIdx] = null;
      const bot = makeMinion({ name: 'Salvage Bot', attack: 4, health: 1, art: 'auto-repair' });
      bot.currentHp = 1;
      state.battle.playerSlots[slotIdx] = bot;
      state.battle.log.push(`${card.name}'s Failsafe triggers — a Salvage Bot takes its place!`);
    }
  }
  applyReactBuffs('failsafe');
  if (times > 1) triggerFailsafe(card, times - 1, col);
}

function damagePlayer(col, amount) {
  const c = state.battle.playerSlots[col];
  if (!c) return;
  if (c.passive === 'negate_damage') return;
  c.currentHp -= amount;
  if (c.currentHp <= 0) {
    state.battle.playerSlots[col] = null;
    if (c.isHero) state.battle.heroSlain = true;
    triggerFailsafe(c, null, col);
  } else {
    state.battle.pendingDamageAnims.push({ id: c.id });
  }
}

function unlockBossMinions(boss) {
  state.pendingUnlocks = [];
  const seen = new Set();
  for (const tmpl of boss.minions) {
    if (!seen.has(tmpl.name)) {
      seen.add(tmpl.name);
      for (let i = 0; i < 3; i++) {
        const card = makePoolCard(tmpl);
        state.pool.push(card);
        state.pendingUnlocks.push(card);
      }
    }
  }
}

function isBattleOver() {
  const playerDead = state.battle.playerSlots.every(s => s === null);
  const bossDead   = state.battle.bossHp <= 0;
  return playerDead || bossDead || state.battle.heroSlain;
}

function showBattleModal(html, onDone) {
  const el = document.createElement('div');
  el.id = 'battle-modal';
  el.innerHTML = html;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'modal-fade-out 0.4s ease-in forwards';
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); onDone(); }, 400);
  }, 3000);
}

function showVictoryModal(onDone) {
  const isFinal = state.bossIndex === BOSS_DATA.length - 1;
  const sub = isFinal ? 'Mission Complete' : 'Move deeper into the Research Wing';
  showBattleModal(`
    <div class="battle-modal-inner">
      <div class="battle-modal-title victory-title">Victory!</div>
      <div class="battle-modal-sub">${sub}</div>
    </div>`, onDone);
}

function showDefeatModal(onDone) {
  showBattleModal(`
    <div class="battle-modal-inner">
      <div class="battle-modal-title defeat-title">Defeat!</div>
      <div class="battle-modal-sub">Mission Failed</div>
    </div>`, onDone);
}

function endBattle() {
  const b = state.battle;
  b.fighting = false;
  b.over = true;
  const bossDead = b.bossHp <= 0 && !b.heroSlain;

  if (bossDead) {
    const fortuneBonus = state.relics.filter(r => r.id === 'fortune_coin').length * 2;
    const reward = 3 + state.bossIndex + fortuneBonus;
    b.log.push(`Mission complete! Salvaged ${reward} credits.`);
    render();
    showVictoryModal(() => {
      playTrack(rewardMusic);
      const heroOnField = b.playerSlots.find(c => c && c.isHero);
      if (heroOnField) {
        const deckHero = state.deck.find(c => c.isHero);
        if (deckHero) {
          deckHero.health = heroOnField.currentHp;
          deckHero.attack = heroOnField.attack;
        }
      }
      state.gold += reward;
      state.lastDefeatedBoss = BOSS_DATA[state.bossIndex];
      unlockBossMinions(state.lastDefeatedBoss);
      state.bossIndex++;
      if (state.bossIndex >= BOSS_DATA.length) {
        state.phase = 'win';
      } else if (state.pendingUnlocks.length > 0) {
        state.phase = 'unlock';
      } else {
        state.phase = 'reward';
        state.pendingRewards = generateRewards();
      }
      render();
    });
  } else {
    b.log.push(b.heroSlain
      ? 'Commander down! Mission failed.'
      : 'Defeat! All units lost.');
    render();
    showDefeatModal(() => { playTrack(shopMusic); state.phase = 'lose'; render(); });
  }
}

function triggerDeploy(card, times = null) {
  if (!card.deploy) return;
  if (times === null) {
    times = 1 + state.battle.playerSlots.filter(c => c && c.passive === 'double_deploy').length;
    if (!state.battle.firstDeployUsed && state.relics.some(r => r.id === 'first_deploy')) {
      state.battle.firstDeployUsed = true;
      times++;
    }
  }
  if (times <= 0) return;
  if (card.deploy === 'hero_health_plus_1') {
    const heroOnField = state.battle.playerSlots.find(c => c && c.isHero);
    if (heroOnField) {
      heroOnField.currentHp = (heroOnField.currentHp ?? heroOnField.health) + 1;
      heroOnField.health++;
      state.battle.pendingStatBuffs.push({ id: heroOnField.id, stat: 'health', side: 'player' });
      const deckHero = state.deck.find(c => c.isHero);
      if (deckHero) { deckHero.health++; deckHero.maxHealth++; }
    }
  } else if (card.deploy === 'draw_a_card') {
    if (state.battle.remainingDeck.length > 0) {
      const drawn = state.battle.remainingDeck.shift();
      state.battle.hand.push(drawn);
      state.battle.log.push(`${card.name}'s Deploy triggers — drew ${drawn.name}!`);
    } else {
      state.battle.log.push(`${card.name}'s Deploy triggers — deck is empty!`);
    }
  } else if (card.deploy === 'hero_heal_5') {
    const heroOnField = state.battle.playerSlots.find(c => c && c.isHero);
    if (heroOnField) {
      heroOnField.currentHp = (heroOnField.currentHp ?? heroOnField.health) + 5;
      heroOnField.health += 5;
      if (heroOnField.maxHealth !== undefined) heroOnField.maxHealth += 5;
      state.battle.pendingStatBuffs.push({ id: heroOnField.id, stat: 'health', side: 'player' });
      const deckHero = state.deck.find(c => c.isHero);
      if (deckHero) { deckHero.health += 5; deckHero.maxHealth += 5; }
    }
  } else if (card.deploy === 'hero_attack_plus_1') {
    const heroOnField = state.battle.playerSlots.find(c => c && c.isHero);
    if (heroOnField) {
      heroOnField.attack++;
      state.battle.pendingStatBuffs.push({ id: heroOnField.id, stat: 'attack', side: 'player' });
      const deckHero = state.deck.find(c => c.isHero);
      if (deckHero) deckHero.attack++;
    }
  } else if (card.deploy === 'gain_1_gold') {
    state.gold += 2;
    state.battle.log.push(`${card.name}'s Deploy triggers — gained 2 credits!`);
  } else if (card.deploy === 'trigger_random_failsafe') {
    const eligible = state.battle.playerSlots.filter(c => c && c.failsafe && c.id !== card.id);
    if (eligible.length > 0) {
      const target = eligible[Math.floor(Math.random() * eligible.length)];
      triggerFailsafe(target);
      state.battle.log.push(`${card.name}'s Deploy triggers — ${target.name}'s Failsafe activates!`);
    }
  } else if (card.deploy === 'buff_all_4_4') {
    state.battle.playerSlots.forEach(c => {
      if (c && c.id !== card.id) {
        c.attack += 4; c.health += 4;
        if (c.currentHp !== undefined) c.currentHp += 4;
        if (c.maxHealth !== undefined) c.maxHealth += 4;
        state.battle.pendingStatBuffs.push({ id: c.id, stat: 'attack', side: 'player' });
      }
    });
    state.battle.log.push(`${card.name}'s Deploy triggers — all friendly units gain +4/+4!`);
  } else if (card.deploy === 'draw_all_cards') {
    const count = state.battle.remainingDeck.length;
    state.battle.hand.push(...state.battle.remainingDeck.splice(0));
    state.battle.log.push(count > 0
      ? `${card.name}'s Deploy triggers — drew ${count} card${count === 1 ? '' : 's'}!`
      : `${card.name}'s Deploy triggers — deck is empty!`);
  }
  applyReactBuffs('deploy');
  if (times > 1) triggerDeploy(card, times - 1);
}

function triggerExtract(displaced, replacer, times = null) {
  if (!displaced.extract) return;
  if (times === null) {
    times = 1 + state.battle.playerSlots.filter(c => c && c.passive === 'double_extract').length;
    if (!state.battle.firstExtractUsed && state.relics.some(r => r.id === 'first_extract')) {
      state.battle.firstExtractUsed = true;
      times++;
    }
  }
  if (times <= 0) return;
  if (displaced.extract === 'share_attack') {
    state.battle.playerSlots.forEach(c => {
      if (c && c.id !== displaced.id) {
        c.attack += displaced.attack;
        state.battle.pendingStatBuffs.push({ id: c.id, stat: 'attack', side: 'player' });
      }
    });
    state.battle.log.push(`${displaced.name}'s Extract triggers — all friendly units gain +${displaced.attack} Attack!`);
  }
  if (displaced.extract === 'draw_2_cards') {
    let drawn = 0;
    for (let i = 0; i < 2; i++) {
      if (state.battle.remainingDeck.length > 0) {
        state.battle.hand.push(state.battle.remainingDeck.shift());
        drawn++;
      }
    }
    state.battle.log.push(drawn > 0
      ? `${displaced.name}'s Extract triggers — drew ${drawn} card${drawn === 1 ? '' : 's'}!`
      : `${displaced.name}'s Extract triggers — deck is empty!`);
  }
  if (displaced.extract === 'give_stats_to_replacer' && replacer) {
    replacer.attack += displaced.attack;
    replacer.health += displaced.health;
    replacer.currentHp = (replacer.currentHp ?? replacer.health - displaced.health) + displaced.health;
    if (replacer.isHero) {
      if (replacer.maxHealth !== undefined) replacer.maxHealth += displaced.health;
      const deckHero = state.deck.find(c => c.isHero);
      if (deckHero) deckHero.maxHealth += displaced.health;
    }
    state.battle.pendingStatBuffs.push({ id: replacer.id, stat: 'attack', side: 'player' });
    state.battle.pendingStatBuffs.push({ id: replacer.id, stat: 'health', side: 'player' });
    state.battle.log.push(`${displaced.name}'s Extract triggers — ${replacer.name} gains +${displaced.attack} Attack and +${displaced.health} Health!`);
  }
  if (times > 1) triggerExtract(displaced, replacer, times - 1);
}

function playCard(cardId, slotIndex) {
  const handIndex = state.battle.hand.findIndex(c => c.id === cardId);
  if (handIndex === -1) return;

  const card = state.battle.hand[handIndex];
  const displaced = state.battle.playerSlots[slotIndex];

  if (displaced && displaced.isHero) return;

  state.battle.hand.splice(handIndex, 1);
  if (displaced) {
    triggerExtract(displaced, card);
    if (displaced.extract !== 'give_stats_to_replacer') {
      card.attack += displaced.attack;
      state.battle.pendingStatBuffs.push({ id: card.id, stat: 'attack', side: 'player' });
    }
    state.battle.remainingDeck.push(displaced);
  }
  state.battle.playerSlots[slotIndex] = card;
  state.battle.selectedCard = null;

  triggerDeploy(card);
  state.battle.playerSlots.forEach(c => {
    if (c && c.react === 'on_play') {
      state.gold++;
      state.battle.log.push(`${c.name}'s React triggers — gained 1 credit!`);
    }
  });
  render();
  applyStatBuffAnimations();
}

function toggleBattleLog() {
  state.battle.showLog = !state.battle.showLog;
  render();
}

function healCommander() {
  const hero = state.deck.find(c => c.isHero);
  if (!hero || state.gold < 1) return;
  state.gold -= 1;
  hero.health = Math.min(hero.maxHealth, hero.health + 3);
  render();
}

function removeCard(id) {
  const cost = 2 + state.removals;
  if (state.gold < cost) return;
  state.gold -= cost;
  state.removals++;
  state.deck = state.deck.filter(c => c.id !== id);
  render();
}

function recruitUnit(minionName) {
  const boss = BOSS_DATA[state.bossIndex];
  const tmpl = boss.minions.find(m => m.name === minionName);
  if (!tmpl) return;
  const card = makeMinion(tmpl);
  applyRelicsToNewCard(card);
  state.deck.push(card);
  state.pendingRewards = [];
  state.phase = 'shop';
  state.shopItems = generateShop();
  playTrack(shopMusic);
  render();
}

function rerollShop() {
  if (state.gold < 1) return;
  state.gold--;
  state.shopItems = generateShop();
  render();
}

function proceedToBoss() {
  const bossTrack = state.bossIndex < 7 ? battleMusic : finalBossMusic;
  if (bossTrack === finalBossMusic) finalBossMusic.currentTime = 4;
  playTrack(bossTrack);
  const boss = BOSS_DATA[state.bossIndex];

  const hero = state.deck.find(c => c.isHero);
  const rest = state.deck.filter(c => !c.isHero).sort(() => Math.random() - 0.5);
  const drawPile = [hero, ...rest].map(c => ({ ...c }));

  const extraDraw = state.relics.some(r => r.id === 'tactical_uplink') ? 2 : 0;
  const drawCount = Math.min(drawPile.length, 5 + extraDraw);

  state.phase = 'boss';
  state.battle = {
    bossHp:        boss.hp,
    bossAttack:    boss.attack,
    bossMinions:   buildBossMinions(boss),
    playerSlots:   [null, null, null, null, null],
    hand:          drawPile.slice(0, drawCount),
    remainingDeck: drawPile.slice(drawCount),
    selectedCard:  null,
    fighting:      false,
    seqPos:        0,
    log:           [],
    heroSlain:        false,
    pendingStatBuffs:  [],
    pendingDamageAnims: [],
    firstDeployUsed:   false,
    firstExtractUsed:  false,
    firstFailsafeUsed: false,
    showLog:           false,
  };
  render();
}

// ── render ────────────────────────────────────────────────────────────────────

function applyStatBuffAnimations() {
  const buffs = state.battle?.pendingStatBuffs;
  if (!buffs || buffs.length === 0) return;
  state.battle.pendingStatBuffs = [];

  const enemySlots = [
    state.battle.bossMinions[0],
    state.battle.bossMinions[1],
    'boss',
    state.battle.bossMinions[2],
    state.battle.bossMinions[3],
  ];

  buffs.forEach(({ id, stat }) => {
    let slotEl = null;

    if (id === 'boss') {
      slotEl = document.getElementById('es-2');
    } else {
      state.battle.playerSlots.forEach((card, i) => {
        if (card && card.id === id) slotEl = document.getElementById(`ps-${i}`);
      });
      if (!slotEl) {
        enemySlots.forEach((card, i) => {
          if (card && card !== 'boss' && card.id === id) slotEl = document.getElementById(`es-${i}`);
        });
      }
    }

    if (!slotEl) return;
    const statEl = slotEl.querySelector(stat === 'attack' ? '.battle-atk' : '.battle-hp');
    if (!statEl) return;
    statEl.classList.remove('stat-buff-anim');
    void statEl.offsetWidth;
    statEl.classList.add('stat-buff-anim');
  });
}

function applyDamageAnimations() {
  const anims = state.battle?.pendingDamageAnims;
  if (!anims || anims.length === 0) return;
  state.battle.pendingDamageAnims = [];

  const enemySlots = [
    state.battle.bossMinions[0],
    state.battle.bossMinions[1],
    'boss',
    state.battle.bossMinions[2],
    state.battle.bossMinions[3],
  ];

  anims.forEach(({ id }) => {
    let slotEl = null;
    if (id === 'boss') {
      slotEl = document.getElementById('es-2');
    } else {
      state.battle.playerSlots.forEach((card, i) => {
        if (card && card.id === id) slotEl = document.getElementById(`ps-${i}`);
      });
      if (!slotEl) {
        enemySlots.forEach((card, i) => {
          if (card && card !== 'boss' && card.id === id) slotEl = document.getElementById(`es-${i}`);
        });
      }
    }
    if (!slotEl) return;
    const hpEl = slotEl.querySelector('.battle-hp');
    if (!hpEl) return;
    hpEl.classList.remove('hp-damage-anim');
    void hpEl.offsetWidth;
    hpEl.classList.add('hp-damage-anim');
  });
}

function keywordTooltipHTML(card) {
  const lines = [];
  if (card.deploy)   lines.push('<b>Deploy</b> — Triggers when this unit is played onto the field.');
  if (card.failsafe) lines.push('<b>Failsafe</b> — Triggers when this unit is destroyed in combat.');
  if (card.extract)  lines.push('<b>Extract</b> — Triggers when this unit is displaced by another unit.');
  if (card.react)    lines.push('<b>React</b> — Triggers when a friendly ability of the matching type activates.');
  if (card.passive)  lines.push('<b>Passive</b> — A constant effect that is always active.');
  if (!lines.length) return '';
  return `<div class="card-tooltip">${lines.join('<br><br>')}</div>`;
}

function slotTooltipHTML(card) {
  const parts = [`<span class="tooltip-name">${card.name}</span>`];
  if (card.deploy)   parts.push(`<span class="tooltip-effect">${DEPLOY_EFFECTS[card.deploy]}</span>`);
  if (card.failsafe) parts.push(`<span class="tooltip-effect">${FAILSAFE_EFFECTS[card.failsafe]}</span>`);
  if (card.extract)  parts.push(`<span class="tooltip-effect">${EXTRACT_EFFECTS[card.extract]}</span>`);
  if (card.react)    parts.push(`<span class="tooltip-effect">${REACT_EFFECTS[card.react]}</span>`);
  if (card.passive)  parts.push(`<span class="tooltip-effect">${PASSIVE_EFFECTS[card.passive]}</span>`);
  return `<div class="card-tooltip">${parts.join('<br>')}</div>`;
}

const ART_CACHE = new Map();

function artImgHTML(art) {
  if (!art) return '';
  const svg = ART_CACHE.get(art);
  if (svg) return `<div class="card-art">${svg}</div>`;
  return `<img class="card-art" src="art/${art}.svg" alt="" decoding="sync">`;
}

async function preloadArt() {
  const arts = new Set(['battle-gear', 'auto-repair']);
  BOSS_DATA.forEach(b => {
    if (b.art) arts.add(b.art);
    (b.minions || []).forEach(m => { if (m.art) arts.add(m.art); });
  });
  MINION_POOL.forEach(m => { if (m.art) arts.add(m.art); });

  await Promise.all([...arts].map(async art => {
    try {
      const res = await fetch(`art/${art}.svg`);
      if (res.ok) ART_CACHE.set(art, await res.text());
    } catch(_) {}
  }));
}

function titleHTML() {
  return `
    <div class="screen title-screen">
      <div class="facility-id">Classified — Sector Zero Research Facility</div>
      <h1 class="game-title">OMEGA<br>WING</h1>
      <p class="title-lore">All contact with Research Wing Ω has been lost.<br>Dispatching Commander with autonomous combat team.</p>
      <button class="btn-start" onclick="startGame()">Initialize Mission</button>
      <p class="title-credit">Music: "Lost Signal" by YoMikeyD — CC-BY 3.0</p>
    </div>
  `;
}

function render() {
  const battlePhases = ['boss', 'reward', 'unlock', 'recruit'];
  if (state.phase === 'shop') {
    document.body.classList.add('bg-shop');
    document.body.classList.remove('bg-battle');
  } else if (battlePhases.includes(state.phase)) {
    document.body.classList.add('bg-battle');
    document.body.classList.remove('bg-shop');
  } else {
    document.body.classList.remove('bg-shop', 'bg-battle');
  }

  const app = document.getElementById('app');
  let screen = '';
  if      (state.phase === 'title')   screen = titleHTML();
  else if (state.phase === 'shop')    screen = shopHTML();
  else if (state.phase === 'boss')    screen = bossHTML();
  else if (state.phase === 'unlock')  screen = unlockHTML();
  else if (state.phase === 'reward')  screen = rewardHTML();
  else if (state.phase === 'recruit') screen = recruitHTML();
  else if (state.phase === 'win')     screen = winHTML();
  else if (state.phase === 'lose')    screen = loseHTML();
  app.innerHTML = (state.phase === 'title' ? '' : hudHTML()) + screen;
}

function hudHTML() {
  return `
    <div class="hud">
      <span class="hud-resource" title="Gold"><span class="coin"></span> ${state.gold}</span>
    </div>
  `;
}

// ── shop ──────────────────────────────────────────────────────────────────────

function shopBossCardHTML() {
  const boss = BOSS_DATA[state.bossIndex];
  const abilityLine = [
    boss.specialAbility ? `<div class="card-ability" style="font-size:0.65rem;color:#cc6666;border-top-color:#2a1010;">${BOSS_ABILITY_EFFECTS[boss.specialAbility]}</div>` : '',
    boss.passive        ? `<div class="card-ability" style="font-size:0.65rem;color:#cc6666;border-top-color:#2a1010;">${BOSS_PASSIVE_EFFECTS[boss.passive]}</div>`        : '',
  ].join('');
  return `
    <div class="card boss-card boss-art-${state.bossIndex}" style="pointer-events:none;">
      ${artImgHTML(boss.art)}
      <div class="card-content">
        <div class="boss-card-name">${boss.name}</div>
        ${abilityLine}
        <div class="battle-stats">
          <span class="battle-atk">${boss.attack}</span>
          <span class="battle-hp">${boss.hp}</span>
        </div>
      </div>
    </div>
  `;
}

function shopHTML() {
  const boss = BOSS_DATA[state.bossIndex];

  const relicsSection = state.relics.length > 0 ? `
    <div class="shop-section">
      <div class="section-header">
        <h2 class="section-title">Modules</h2>
      </div>
      <div class="card-row">
        ${state.relics.map(relicDisplayHTML).join('')}
      </div>
    </div>
    <div class="section-divider"></div>
  ` : '';

  return `
    <div class="shop-layout">
    <div class="screen shop-screen">
      <div class="shop-header">
        <h1 class="title">Supply Depot</h1>
      </div>

      ${relicsSection}

      <div class="shop-section">
        <div class="section-header">
          <h2 class="section-title">Available Units</h2>
          <button class="btn-secondary"
                  onclick="rerollShop()"
                  ${state.gold < 1 ? 'disabled' : ''}>
            Reroll (1<span class="coin"></span>)
          </button>
          <div class="pool-debug">
            Pool (${state.pool.length})
            <div class="pool-tooltip">
              ${(() => {
                const seen = new Map();
                for (const c of state.pool) {
                  if (seen.has(c.name)) seen.get(c.name).count++;
                  else seen.set(c.name, { c, count: 1 });
                }
                return [...seen.values()].map(({ c, count }) => `
                  <div class="pool-tooltip-row">
                    <span>${count > 1 ? `${count}x ` : ''}${c.name}</span>
                    <span class="pool-tooltip-stats">⚔${c.attack} ♥${c.health}</span>
                    ${c.deploy   ? `<span class="pool-tooltip-kw">Deploy</span>`   : ''}
                    ${c.failsafe ? `<span class="pool-tooltip-kw">Failsafe</span>` : ''}
                    ${c.extract  ? `<span class="pool-tooltip-kw">Extract</span>`  : ''}
                    ${c.react    ? `<span class="pool-tooltip-kw">React</span>`    : ''}
                    ${c.passive  ? `<span class="pool-tooltip-kw">Passive</span>`  : ''}
                  </div>
                `).join('');
              })()}
            </div>
          </div>
        </div>
        <div class="card-row">
          ${state.shopItems.map(shopCardHTML).join('')}
        </div>
      </div>

      <div class="section-divider"></div>

      <div class="deck-section">
        <div class="section-header">
          <h2 class="section-title">Your Roster &mdash; ${state.deck.length} units</h2>
        </div>
        <div class="card-row roster-row">
          ${(() => {
            const count = state.deck.length;
            const cardWidth = 155;
            const maxWidth = 900;
            const gap = 14;
            const totalWithGap = count * cardWidth + (count - 1) * gap;
            const marginRight = totalWithGap <= maxWidth
              ? gap
              : count > 1 ? -((count * cardWidth - maxWidth) / (count - 1)) : 0;
            return state.deck.map((card, i) =>
              `<div class="roster-slot" style="margin-right:${i < count - 1 ? marginRight : 0}px;z-index:${i + 1}">${deckCardHTML(card)}</div>`
            ).join('');
          })()}
        </div>
      </div>

      <p class="title-credit">Music: "Space Ambient" by Ville Seppänen — CC-BY 3.0</p>
    </div>

    <div class="shop-boss-panel">
      ${shopBossCardHTML()}
      <button class="btn-proceed" onclick="proceedToBoss()">
        Engage ${boss.name} →
      </button>
    </div>
    </div>
  `;
}

function relicDisplayHTML(relic) {
  return `
    <div class="card relic-card">
      <div class="relic-glyph">◈</div>
      <div class="card-name relic-name">${relic.name}</div>
      <div class="card-ability relic-ability">${relic.desc}</div>
    </div>
  `;
}

function shopCardHTML(item) {
  const canBuy = state.gold >= item.cost;
  const cls = ['card', 'shop-card', !canBuy ? 'unaffordable' : ''].filter(Boolean).join(' ');

  return `
    <div class="${cls}">
      ${artImgHTML(item.art)}
      <div class="card-content">
        <div class="card-name">${item.name}</div>
        <div class="card-stats-row">
          <span class="atk-stat">⚔ ${item.attack}</span>
          <span class="hp-stat">♥ ${item.health}</span>
        </div>
        ${item.deploy   ? `<div class="card-ability">${DEPLOY_EFFECTS[item.deploy]}</div>`     : ''}
        ${item.failsafe ? `<div class="card-ability">${FAILSAFE_EFFECTS[item.failsafe]}</div>` : ''}
        ${item.extract  ? `<div class="card-ability">${EXTRACT_EFFECTS[item.extract]}</div>`   : ''}
        ${item.react    ? `<div class="card-ability">${REACT_EFFECTS[item.react]}</div>`       : ''}
        ${item.passive  ? `<div class="card-ability">${PASSIVE_EFFECTS[item.passive]}</div>`  : ''}
        <button class="btn-buy" onclick="buyCard(${item.id})" ${canBuy ? '' : 'disabled'}>Buy <span class="coin"></span> ${item.cost}</button>
      </div>
      ${keywordTooltipHTML(item)}
    </div>
  `;
}

function deckCardHTML(card) {
  if (card.isHero) {
    return `
      <div class="card deck-card hero-card">
        ${artImgHTML(card.art)}
        <div class="card-content">
          <div class="card-name hero-name">${card.name}</div>
          <div class="card-stats-row">
            <span class="atk-stat">⚔ ${card.attack}</span>
            <span class="hp-stat">♥ ${card.health}/${card.maxHealth}</span>
          </div>
          <div class="card-ability">Always drawn first</div>
          <div class="card-ability">Keeps all enhancements gained in battle</div>
          <button class="btn-heal" onclick="healCommander()"
            ${state.gold < 1 || card.health >= card.maxHealth ? 'disabled' : ''}>
            Heal <span class="hp-stat">♥ 3</span> <span class="coin"></span> 1
          </button>
        </div>
      </div>
    `;
  }
  const removeCost = 2 + state.removals;
  const canRemove  = state.gold >= removeCost;
  return `
    <div class="card deck-card">
      ${artImgHTML(card.art)}
      <div class="card-content">
        <div class="card-name">${card.name}</div>
        <div class="card-stats-row">
          <span class="atk-stat">⚔ ${card.attack}</span>
          <span class="hp-stat">♥ ${card.health}</span>
        </div>
        ${card.deploy   ? `<div class="card-ability">${DEPLOY_EFFECTS[card.deploy]}</div>`     : ''}
        ${card.failsafe ? `<div class="card-ability">${FAILSAFE_EFFECTS[card.failsafe]}</div>` : ''}
        ${card.extract  ? `<div class="card-ability">${EXTRACT_EFFECTS[card.extract]}</div>`   : ''}
        ${card.react    ? `<div class="card-ability">${REACT_EFFECTS[card.react]}</div>`       : ''}
        ${card.passive  ? `<div class="card-ability">${PASSIVE_EFFECTS[card.passive]}</div>`  : ''}
        <button class="btn-remove" onclick="removeCard(${card.id})" ${canRemove ? '' : 'disabled'}>
          Remove <span class="coin"></span>${removeCost}
        </button>
      </div>
    </div>
  `;
}

// ── reward screen ─────────────────────────────────────────────────────────────

function proceedToRewards() {
  state.pendingUnlocks = [];
  state.pendingRewards = generateRewards();
  state.phase = 'reward';
  render();
}

function unlockHTML() {
  const boss = state.lastDefeatedBoss;
  const seen = new Set();
  const unique = state.pendingUnlocks.filter(c => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
  const counts = {};
  state.pendingUnlocks.forEach(c => { counts[c.name] = (counts[c.name] || 0) + 1; });

  return `
    <div class="screen reward-screen">
      <h1 class="title">Units Unlocked</h1>
      <p class="subtitle">${boss.name} neutralized — these units can now be recruited to your team.</p>
      <div class="unlock-cards">
        ${unique.map(card => `
          <div class="unlock-card-wrap">
            <div class="card deck-card">
              ${artImgHTML(card.art)}
              <div class="card-content">
                <div class="card-name">${card.name}</div>
                <div class="card-stats-row">
                  <span class="atk-stat">⚔ ${card.attack}</span>
                  <span class="hp-stat">♥ ${card.health}</span>
                </div>
                ${card.deploy   ? `<div class="card-ability">${DEPLOY_EFFECTS[card.deploy]}</div>`     : ''}
                ${card.failsafe ? `<div class="card-ability">${FAILSAFE_EFFECTS[card.failsafe]}</div>` : ''}
                ${card.extract  ? `<div class="card-ability">${EXTRACT_EFFECTS[card.extract]}</div>`   : ''}
                ${card.react    ? `<div class="card-ability">${REACT_EFFECTS[card.react]}</div>`       : ''}
                ${card.passive  ? `<div class="card-ability">${PASSIVE_EFFECTS[card.passive]}</div>`  : ''}
              </div>
              ${keywordTooltipHTML(card)}
            </div>
            <div class="unlock-count">×${counts[card.name]} added to pool</div>
          </div>
        `).join('')}
      </div>
      <div class="footer-actions" style="justify-content:center; margin-top: 40px;">
        <button class="btn-proceed" onclick="proceedToRewards()">Continue →</button>
      </div>
    </div>
  `;
}

function recruitHTML() {
  const boss = BOSS_DATA[state.bossIndex];
  const seen = new Set();
  const unique = boss.minions.filter(m => {
    if (seen.has(m.name)) return false;
    seen.add(m.name);
    return true;
  });
  const choices = [...unique].sort(() => Math.random() - 0.5).slice(0, 3);

  return `
    <div class="screen reward-screen">
      <h1 class="title">Advance Intel</h1>
      <p class="subtitle">Choose one of <span class="red">${boss.name}</span>'s units to recruit before the battle.</p>
      <div class="reward-choices">
        ${choices.map(minion => {
          const abilityHTML = [
            minion.deploy   ? DEPLOY_EFFECTS[minion.deploy]     : '',
            minion.failsafe ? FAILSAFE_EFFECTS[minion.failsafe] : '',
            minion.extract  ? EXTRACT_EFFECTS[minion.extract]   : '',
            minion.react    ? REACT_EFFECTS[minion.react]        : '',
            minion.passive  ? PASSIVE_EFFECTS[minion.passive]   : '',
          ].filter(Boolean).map(t => `<div class="reward-desc">${t}</div>`).join('');
          return `
            <div class="reward-option card-reward" onclick="recruitUnit('${minion.name.replace(/'/g, "\\'")}')">
              <div class="reward-type-badge badge-card">Recruit</div>
              <div class="reward-name">${minion.name}</div>
              <div class="card-stats-row" style="font-size:1.1rem; margin: 4px 0;">
                <span class="atk-stat">⚔ ${minion.attack}</span>
                <span class="hp-stat">♥ ${minion.health}</span>
              </div>
              ${abilityHTML || '<div class="reward-desc">No special ability.</div>'}
              <button class="btn-choose">Recruit</button>
            </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function rewardHTML() {
  const boss = state.lastDefeatedBoss;
  return `
    <div class="screen reward-screen">
      <h1 class="title">Choose Your Reward</h1>
      <p class="subtitle">${boss ? `${boss.name} neutralized!` : 'Victory!'}</p>
      <div class="reward-choices">
        ${state.pendingRewards.map((r, i) => rewardOptionHTML(r, i)).join('')}
      </div>
    </div>
  `;
}

function rewardOptionHTML(reward, index) {
  if (reward.type === 'relic') {
    return `
      <div class="reward-option relic-reward" onclick="chooseReward(${index})">
        <div class="reward-type-badge badge-relic">Module</div>
        <div class="reward-glyph relic-color">◈</div>
        <div class="reward-name">${reward.data.name}</div>
        <div class="reward-desc">${reward.data.desc}</div>
        <button class="btn-choose">Choose</button>
      </div>
    `;
  }
  if (reward.type === 'card') {
    const c = reward.data;
    const abilityHTML = [
      c.deploy   ? DEPLOY_EFFECTS[c.deploy]     : '',
      c.failsafe ? FAILSAFE_EFFECTS[c.failsafe] : '',
      c.extract  ? EXTRACT_EFFECTS[c.extract]   : '',
      c.react    ? REACT_EFFECTS[c.react]        : '',
      c.passive  ? PASSIVE_EFFECTS[c.passive]   : '',
    ].filter(Boolean).map(t => `<div class="reward-desc">${t}</div>`).join('');
    return `
      <div class="reward-option card-reward" onclick="chooseReward(${index})">
        <div class="reward-type-badge badge-card">Card</div>
        <div class="reward-name">${c.name}</div>
        <div class="card-stats-row" style="font-size:1.1rem; margin: 4px 0;">
          <span class="atk-stat">⚔ ${c.attack}</span>
          <span class="hp-stat">♥ ${c.health}</span>
        </div>
        ${abilityHTML || '<div class="reward-desc">Add to your deck.</div>'}
        <button class="btn-choose">Choose</button>
      </div>
    `;
  }
  const desc = reward.data.id === 'soul_capture'
    ? `Give your Commander +${state.bossIndex} Attack and +${state.bossIndex} Health.`
    : reward.data.desc;
  return `
    <div class="reward-option effect-reward" onclick="chooseReward(${index})">
      <div class="reward-type-badge badge-effect">Effect</div>
      <div class="reward-glyph effect-color">✦</div>
      <div class="reward-name">${reward.data.name}</div>
      <div class="reward-desc">${desc}</div>
      <button class="btn-choose">Choose</button>
    </div>
  `;
}

function battleRelicsHTML() {
  if (state.relics.length === 0) return '';
  return `
    <div class="battle-relics">
      <div class="battle-relics-label">Modules</div>
      ${state.relics.map(r => `
        <div class="battle-relic-item">
          <div class="battle-relic-name">${r.name}</div>
          <div class="battle-relic-desc">${r.desc}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ── boss battle ───────────────────────────────────────────────────────────────

function bossHTML() {
  const boss = BOSS_DATA[state.bossIndex];
  const b    = state.battle;

  const enemySlots = [b.bossMinions[0], b.bossMinions[1], 'boss', b.bossMinions[2], b.bossMinions[3]];

  return `
    <div class="screen battle-screen">
      <div class="battle-layout">
        ${battleRelicsHTML()}
        <div class="battle-main">

          <div class="battlefield-center">
            <div class="field enemy-field">
              ${enemySlots.map((slot, i) => enemySlotHTML(slot, boss, i)).join('')}
            </div>

            <div class="battle-vs">
              <button class="btn-fight"
                      onclick="startFight()"
                      ${b.playerSlots.some(s => s && s.isHero) ? '' : 'disabled'}
                      style="${b.fighting || b.over ? 'visibility:hidden' : ''}">
                Engage
              </button>
            </div>

            <div class="field player-field">
              ${b.playerSlots.map((card, i) => playerSlotHTML(card, i)).join('')}
            </div>
          </div>

          <div class="hand-area">
            <div class="field hand-field">
              ${(() => {
                const count = b.hand.length;
                const cardWidth = 155;
                const maxWidth = 800;
                const gap = 14;
                const totalWithGap = count * cardWidth + (count - 1) * gap;
                const marginRight = totalWithGap <= maxWidth
                  ? gap
                  : count > 1 ? -((count * cardWidth - maxWidth) / (count - 1)) : 0;
                return b.hand.map((card, i) =>
                  `<div class="slot" style="margin-right:${i < count - 1 ? marginRight : 0}px;z-index:${i + 1}">${handCardHTML(card)}</div>`
                ).join('');
              })()}
            </div>
          </div>

          <button class="log-toggle-btn ${b.showLog ? 'log-active' : ''}" onclick="toggleBattleLog()">≡</button>
          ${b.showLog ? `
            <div class="battle-log-popup">
              ${b.log.length === 0
                ? `<span class="log-empty">No combat events yet.</span>`
                : [...b.log].reverse().map(msg => `<div class="log-entry">${msg}</div>`).join('')}
            </div>` : ''}
        </div>

        <div class="battle-sidebar">
          ${deckSlotHTML(b.remainingDeck)}
        </div>
      </div>
      <p class="title-credit">${state.bossIndex < 7 ? 'Music: "Gods Forbid" by Centurion_of_war — CC-BY 4.0' : 'Music: "Last Stand in Space" by brandon75689'}</p>
    </div>
  `;
}

function enemySlotHTML(slot, boss, i) {
  if (i === 2 && state.battle.bossHp <= 0) {
    return `<div class="slot empty-slot" id="es-${i}"></div>`;
  }
  if (i === 2) {
    const bossAbilityLine = [
      boss.specialAbility ? `<div class="card-ability" style="font-size:0.65rem;color:#cc6666;border-top-color:#2a1010;">${BOSS_ABILITY_EFFECTS[boss.specialAbility]}</div>` : '',
      boss.passive        ? `<div class="card-ability" style="font-size:0.65rem;color:#cc6666;border-top-color:#2a1010;">${BOSS_PASSIVE_EFFECTS[boss.passive]}</div>`        : '',
    ].join('');
    const bossTooltip = `<div class="card-tooltip"><span class="tooltip-name">${boss.name}</span>${boss.specialAbility ? `<br><span class="tooltip-effect" style="color:#cc6666;">${BOSS_ABILITY_EFFECTS[boss.specialAbility]}</span>` : ''}${boss.passive ? `<br><span class="tooltip-effect" style="color:#cc6666;">${BOSS_PASSIVE_EFFECTS[boss.passive]}</span>` : ''}</div>`;
    return `
      <div class="slot" id="es-${i}">
        <div class="card battle-card boss-card boss-art-${state.bossIndex}">
          ${artImgHTML(boss.art)}
          <div class="card-content">
            <div class="boss-card-name">${boss.name}</div>
            ${bossAbilityLine}
            <div class="battle-stats">
              <span class="battle-atk">${state.battle.bossAttack}</span>
              <span class="battle-hp">${state.battle.bossHp}</span>
            </div>
          </div>
          ${bossTooltip}
        </div>
      </div>`;
  }
  if (slot) {
    const hp = slot.currentHp ?? slot.health;
    return `
      <div class="slot" id="es-${i}">
        <div class="card battle-card enemy-card">
          ${artImgHTML(slot.art)}
          <div class="card-content">
            <div class="enemy-card-name">${slot.name}</div>
            <div class="battle-stats">
              <span class="battle-atk">${slot.attack}</span>
              ${slot.failsafe ? `<span class="battle-failsafe">💀</span>` : slot.extract ? `<span class="battle-extract">⬆</span>` : ''}
              <span class="battle-hp">${hp}</span>
            </div>
          </div>
          ${slotTooltipHTML(slot)}
        </div>
      </div>`;
  }
  return `<div class="slot empty-slot" id="es-${i}"></div>`;
}

function deckSlotHTML(deck) {
  return `
    <div class="slot">
      <div class="card deck-pile ${deck.length === 0 ? 'deck-empty' : ''}">
        <div class="deck-count">×${deck.length}</div>
      </div>
    </div>`;
}

function handCardHTML(card) {
  const fighting   = state.battle.fighting;
  const isSelected = !fighting && state.battle.selectedCard === card.id;
  const cls = ['card', card.isHero ? 'hero-card' : '', isSelected ? 'selected' : ''].filter(Boolean).join(' ');
  const interact = fighting ? '' : `draggable="true" onclick="selectCard(${card.id})" ondragstart="dragCard(event,${card.id})"`;
  const inner = card.isHero
    ? `${artImgHTML(card.art)}
       <div class="card-content">
         <div class="card-name hero-name">${card.name}</div>
         <div class="card-stats-row">
           <span class="atk-stat">⚔ ${card.attack}</span>
           <span class="hp-stat">♥ ${card.health}</span>
         </div>
         <div class="card-ability">Always drawn first</div>
       </div>`
    : `${artImgHTML(card.art)}
       <div class="card-content">
         <div class="card-name">${card.name}</div>
         <div class="card-stats-row">
           <span class="atk-stat">⚔ ${card.attack}</span>
           <span class="hp-stat">♥ ${card.health}</span>
         </div>
         ${card.deploy   ? `<div class="card-ability">${DEPLOY_EFFECTS[card.deploy]}</div>`     : ''}
         ${card.failsafe ? `<div class="card-ability">${FAILSAFE_EFFECTS[card.failsafe]}</div>` : ''}
         ${card.extract  ? `<div class="card-ability">${EXTRACT_EFFECTS[card.extract]}</div>`   : ''}
         ${card.react    ? `<div class="card-ability">${REACT_EFFECTS[card.react]}</div>`       : ''}
         ${card.passive  ? `<div class="card-ability">${PASSIVE_EFFECTS[card.passive]}</div>`  : ''}
       </div>`;
  return `<div class="${cls}" ${interact}>${inner}${keywordTooltipHTML(card)}</div>`;
}

function playerSlotHTML(card, i) {
  const fighting    = state.battle.fighting;
  const hasSelected = !fighting && state.battle.selectedCard !== null;
  const heroOccupied = card && card.isHero;
  const dropAttrs   = (fighting || heroOccupied) ? '' : `ondragover="event.preventDefault()" ondrop="dropCard(event,${i})" onclick="clickSlot(${i})"`;

  if (card) {
    const hp = card.currentHp ?? card.health;
    return `
      <div class="slot" id="ps-${i}" ${dropAttrs}>
        <div class="card battle-card ${card.isHero ? 'hero-card battle-hero' : ''}">
          ${artImgHTML(card.art)}
          <div class="card-content">
            <div class="${card.isHero ? 'boss-card-name' : 'player-card-name'}" style="${card.isHero ? 'color:#33cc66;text-shadow:0 0 8px rgba(51,204,102,0.5)' : ''}">${card.name}</div>
            <div class="battle-stats">
              <span class="battle-atk">${card.attack}</span>
              ${card.failsafe ? `<span class="battle-failsafe">💀</span>` : card.extract ? `<span class="battle-extract">⬆</span>` : ''}
              <span class="battle-hp">${hp}</span>
            </div>
          </div>
          ${slotTooltipHTML(card)}
        </div>
      </div>`;
  }
  return `<div class="slot empty-slot player-empty ${hasSelected ? 'playable' : ''}" id="ps-${i}" ${dropAttrs}></div>`;
}

// ── end screens ───────────────────────────────────────────────────────────────

function winHTML() {
  return `
    <div class="screen end-screen">
      <h1 class="title gold">Victory!</h1>
      <p class="subtitle">Sector secured. Mission complete.</p>
      <button class="btn-proceed" onclick="newGame()">Play Again</button>
    </div>
  `;
}

function loseHTML() {
  return `
    <div class="screen end-screen">
      <h1 class="title red">Defeated.</h1>
      <p class="subtitle">All units lost. Mission failed.</p>
      <button class="btn-secondary" onclick="newGame()">Try Again</button>
    </div>
  `;
}

// ── boot ──────────────────────────────────────────────────────────────────────

preloadArt().then(() => {
  newGame();
  bgMusic.play().catch(() => {
    document.addEventListener('click', () => playTrack(bgMusic), { once: true });
  });
});
