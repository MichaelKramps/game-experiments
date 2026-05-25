// ── data ──────────────────────────────────────────────────────────────────────

const BOSS_DATA = [
  { name: 'Corrupted Node',     hp: 8,  attack: 1, minions: [
    { name: 'Volatile Drone', attack: 2, health: 1, failsafe: 'transfer_attack' },
  ]},
  { name: 'Security Drone',     hp: 12, attack: 2, minions: [
    { name: 'Patrol Drone', attack: 1, health: 1 },
    { name: 'Patrol Drone', attack: 1, health: 1 },
  ]},
  { name: 'Hive Controller',    hp: 15, attack: 3, minions: [
    { name: 'Combat Unit', attack: 1, health: 2 },
    { name: 'Combat Unit', attack: 1, health: 2 },
    { name: 'Combat Unit', attack: 1, health: 2 },
    { name: 'Combat Unit', attack: 1, health: 2 },
  ]},
  { name: 'Combat Mech',        hp: 18, attack: 3, minions: [
    { name: 'Volatile Drone', attack: 2, health: 1, failsafe: 'transfer_attack' },
    { name: 'Volatile Drone', attack: 2, health: 1, failsafe: 'transfer_attack' },
  ]},
  { name: 'Stealth Cruiser',    hp: 22, attack: 4, minions: [] },
  { name: 'Synthetic Overlord', hp: 26, attack: 5, minions: [] },
  { name: 'Quantum Titan',      hp: 30, attack: 6, minions: [] },
  { name: 'The Architect',      hp: 36, attack: 7, minions: [] },
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
  hero_attack_plus_1: '<b>Deploy:</b> Give your Commander +1 Attack.',
};

const FAILSAFE_EFFECTS = {
  transfer_attack: '<b>Failsafe:</b> Give another random friendly unit this card\'s Attack.',
};

const MINION_POOL = [
  { name: 'Guard Bot',   attack: 1, health: 1 },
  { name: 'Guard Bot',   attack: 1, health: 1 },
  { name: 'Guard Bot',   attack: 1, health: 1 },
  { name: 'Scout Drone', attack: 1, health: 1, deploy: 'hero_attack_plus_1', cost: 2 },
  { name: 'Scout Drone', attack: 1, health: 1, deploy: 'hero_attack_plus_1', cost: 2 },
  { name: 'Scout Drone', attack: 1, health: 1, deploy: 'hero_attack_plus_1', cost: 2 },
];

const RELIC_POOL = [
  { id: 'war_horn',      name: 'Battle Uplink',   type: 'relic', desc: 'All your units gain +1 Attack.' },
  { id: 'iron_shield',   name: 'Defense Matrix',  type: 'relic', desc: 'All your units gain +1 Health.' },
  { id: 'fortune_coin',  name: 'Data Cache',      type: 'relic', desc: 'Earn 2 extra credits from victories.' },
  { id: 'ancient_tome',  name: 'Trade Algorithm', type: 'relic', desc: 'Shop items cost 1 less credit (min 1).' },
  { id: 'stone_heart',   name: 'Reinforced Hull', type: 'relic', desc: 'Your Commander gains +8 Max Health.' },
  { id: 'berserker_axe', name: 'Combat Implant',  type: 'relic', desc: 'Your Commander gains +2 Attack.' },
];

const REWARD_CARD_POOL = [
  { name: 'Vanguard Unit',     attack: 4, health: 4 },
  { name: 'Siege Mech',        attack: 5, health: 3 },
  { name: 'Heavy Juggernaut',  attack: 3, health: 6 },
  { name: 'Quantum Construct', attack: 4, health: 5 },
  { name: 'Reaper Unit',       attack: 5, health: 5 },
  { name: 'Phantom Agent',     attack: 6, health: 3 },
  { name: 'Titan Walker',      attack: 3, health: 8 },
];

const EFFECT_POOL = [
  { id: 'treasure_chest',  name: 'Resource Cache',   type: 'effect', desc: 'Gain 6 credits immediately.' },
  { id: 'call_to_arms',    name: 'Deploy Protocol',  type: 'effect', desc: 'Add 2 powerful units to your roster.' },
  { id: 'arcane_surge',    name: 'Systems Upgrade',  type: 'effect', desc: 'All units in your roster gain +1/+1.' },
  { id: 'divine_blessing', name: 'Emergency Repair', type: 'effect', desc: 'Restore your Commander to full health.' },
  { id: 'soul_capture',    name: 'Unit Salvage',     type: 'effect', desc: 'Add the defeated enemy as a unit to your roster.' },
];

// ── state ─────────────────────────────────────────────────────────────────────

let state;
let _id = 0;
function nextId() { return ++_id; }

function cardCost(attack, health) {
  return attack + health - 1;
}

function makeHero() {
  return { id: nextId(), name: 'Commander', attack: 2, health: 10, maxHealth: 10, isHero: true };
}

function makeMinion(tmpl) {
  const base = tmpl || { name: 'Minion', attack: 1, health: 1 };
  const card = { id: nextId(), name: base.name, attack: base.attack, health: base.health };
  if (base.deploy) card.deploy = base.deploy;
  if (base.failsafe) card.failsafe = base.failsafe;
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
  state = {
    phase: 'shop',
    bossIndex: 0,
    deck: [makeHero()],
    gold: 5,
    pool: MINION_POOL.map(makePoolCard),
    shopItems: [],
    relics: [],
    pendingRewards: [],
    pendingUnlocks: [],
    lastDefeatedBoss: null,
  };
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
  REWARD_CARD_POOL.forEach(c => pool.push({ type: 'card', data: c }));
  EFFECT_POOL.forEach(e => pool.push({ type: 'effect', data: e }));
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
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
    applyEffect(reward.data.id);
  }

  state.pendingRewards = [];
  state.phase = 'shop';
  state.shopItems = generateShop();
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
    const shuffled = [...REWARD_CARD_POOL].sort(() => Math.random() - 0.5);
    shuffled.slice(0, 2).forEach(tmpl => {
      const card = makeMinion(tmpl);
      applyRelicsToNewCard(card);
      state.deck.push(card);
    });
  } else if (effectId === 'arcane_surge') {
    state.deck.filter(c => !c.isHero).forEach(c => { c.attack++; c.health++; });
  } else if (effectId === 'divine_blessing') {
    const hero = state.deck.find(c => c.isHero);
    if (hero) hero.health = hero.maxHealth;
  } else if (effectId === 'soul_capture') {
    const boss = state.lastDefeatedBoss;
    if (boss) {
      const card = makeMinion({
        name: boss.name,
        attack: boss.attack,
        health: Math.max(3, Math.round(boss.hp / 3)),
      });
      state.deck.push(card);
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

function startFight() {
  const b = state.battle;
  b.fighting = true;
  b.seqPos   = 0;
  b.log      = [];
  b.playerSlots.forEach(c => { if (c) c.currentHp = c.health; });
  b.bossMinions.forEach(c => { if (c) c.currentHp = c.health; });
  render();
  setTimeout(combatTick, ATTACK_MS);
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
      const targetCol = side === 'p' ? randomEnemy() : randomPlayer();
      if (targetCol === -1) continue;
      animateAttack(side, col, targetCol, () => {
        doAttack(side, col, targetCol);
        render();
        if (isBattleOver()) endBattle();
        else setTimeout(combatTick, ATTACK_MS);
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
    const attacker   = b.playerSlots[col];
    const targetName = targetCol === 2
      ? boss.name
      : b.bossMinions[minionIdx(targetCol)].name;
    damageEnemy(targetCol, attacker.attack);
    b.log.push(`Your ${attacker.name} attacks ${targetName} for ${attacker.attack}.`);
    if (targetCol === 2 && b.bossHp <= 0)
      b.log.push(`${boss.name} neutralized!`);
    else if (targetCol !== 2 && !b.bossMinions[minionIdx(targetCol)])
      b.log.push(`${targetName} destroyed!`);
  } else {
    const attk   = col === 2
      ? { name: boss.name, attack: b.bossAttack }
      : b.bossMinions[minionIdx(col)];
    const target = b.playerSlots[targetCol];
    damagePlayer(targetCol, attk.attack);
    b.log.push(`${attk.name} attacks your ${target.name} for ${attk.attack}.`);
    if (!b.playerSlots[targetCol])
      b.log.push(`Your ${target.name} destroyed!`);
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
    position:      'fixed',
    left:          sr.left + 'px',
    top:           sr.top  + 'px',
    width:         sr.width  + 'px',
    height:        sr.height + 'px',
    margin:        '0',
    zIndex:        '999',
    pointerEvents: 'none',
    transition:    'transform 200ms ease-in',
  });
  document.body.appendChild(clone);
  card.style.opacity = '0';

  requestAnimationFrame(() => requestAnimationFrame(() => {
    clone.style.transform = `translate(${dx}px, ${dy}px)`;
  }));

  setTimeout(() => {
    clone.style.transition = 'transform 160ms ease-out';
    clone.style.transform  = '';
    setTimeout(() => {
      document.body.removeChild(clone);
      card.style.opacity = '';
      callback();
    }, 160);
  }, 200);
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
      state.battle.log.push(`${card.name}'s Failsafe triggers — ${boss.name} gains +${card.attack} Attack!`);
    } else {
      pick.attack += card.attack;
      state.battle.log.push(`${card.name}'s Failsafe triggers — ${pick.name} gains +${card.attack} Attack!`);
    }
  }
}

function damageEnemy(col, amount) {
  if (col === 2) {
    state.battle.bossHp = Math.max(0, state.battle.bossHp - amount);
  } else {
    const m = state.battle.bossMinions[minionIdx(col)];
    if (!m) return;
    m.currentHp -= amount;
    if (m.currentHp <= 0) {
      triggerEnemyFailsafe(m);
      state.battle.bossMinions[minionIdx(col)] = null;
    }
  }
}

function triggerFailsafe(card) {
  if (!card.failsafe) return;
  if (card.failsafe === 'transfer_attack') {
    const others = state.battle.playerSlots.filter(c => c && c.id !== card.id);
    if (others.length === 0) return;
    const target = others[Math.floor(Math.random() * others.length)];
    target.attack += card.attack;
    state.battle.log.push(`${card.name}'s Failsafe triggers — ${target.name} gains +${card.attack} Attack!`);
  }
}

function damagePlayer(col, amount) {
  const c = state.battle.playerSlots[col];
  if (!c) return;
  c.currentHp -= amount;
  if (c.currentHp <= 0) {
    triggerFailsafe(c);
    state.battle.playerSlots[col] = null;
    if (c.isHero) state.battle.heroSlain = true;
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
    setTimeout(() => {
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
    }, 2500);
  } else {
    b.log.push(b.heroSlain
      ? 'Commander down! Mission failed.'
      : 'Defeat! All units lost.');
    render();
    setTimeout(() => { state.phase = 'lose'; render(); }, 2500);
  }
}

function triggerDeploy(card) {
  if (!card.deploy) return;
  if (card.deploy === 'hero_attack_plus_1') {
    [...state.battle.playerSlots, ...state.battle.hand].forEach(c => {
      if (c && c.isHero) c.attack++;
    });
    const deckHero = state.deck.find(c => c.isHero);
    if (deckHero) deckHero.attack++;
  }
}

function playCard(cardId, slotIndex) {
  const handIndex = state.battle.hand.findIndex(c => c.id === cardId);
  if (handIndex === -1) return;

  const card = state.battle.hand[handIndex];
  const displaced = state.battle.playerSlots[slotIndex];

  state.battle.hand.splice(handIndex, 1);
  if (displaced) {
    card.attack += displaced.attack;
    state.battle.remainingDeck.push(displaced);
  }
  state.battle.playerSlots[slotIndex] = card;
  state.battle.selectedCard = null;

  triggerDeploy(card);
  render();
}

function rerollShop() {
  if (state.gold < 1) return;
  state.gold--;
  state.shopItems = generateShop();
  render();
}

function proceedToBoss() {
  const boss = BOSS_DATA[state.bossIndex];

  const hero = state.deck.find(c => c.isHero);
  const rest = state.deck.filter(c => !c.isHero).sort(() => Math.random() - 0.5);
  const drawPile = [hero, ...rest].map(c => ({ ...c }));

  const drawCount = Math.min(drawPile.length, 5);

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
    heroSlain:     false,
  };
  render();
}

// ── render ────────────────────────────────────────────────────────────────────

function render() {
  const app = document.getElementById('app');
  let screen = '';
  if      (state.phase === 'shop')   screen = shopHTML();
  else if (state.phase === 'boss')   screen = bossHTML();
  else if (state.phase === 'unlock') screen = unlockHTML();
  else if (state.phase === 'reward') screen = rewardHTML();
  else if (state.phase === 'win')    screen = winHTML();
  else if (state.phase === 'lose')   screen = loseHTML();
  app.innerHTML = hudHTML() + screen;
}

function hudHTML() {
  return `
    <div class="hud">
      <span class="hud-resource" title="Gold"><span class="coin"></span> ${state.gold}</span>
    </div>
  `;
}

// ── shop ──────────────────────────────────────────────────────────────────────

function shopHTML() {
  const boss = BOSS_DATA[state.bossIndex];
  const bossNum = state.bossIndex + 1;

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
    <div class="screen shop-screen">
      <div class="shop-header">
        <h1 class="title">Supply Depot</h1>
        <p class="subtitle">
          Next: <span class="red">${boss.name}</span>
          &nbsp;·&nbsp; ♥ ${boss.hp} &nbsp; ⚔ ${boss.attack}
          &nbsp;·&nbsp; Threat ${bossNum} of ${BOSS_DATA.length}
        </p>
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
              ${state.pool.map(c => `
                <div class="pool-tooltip-row">
                  <span>${c.name}</span>
                  <span class="pool-tooltip-stats">⚔${c.attack} ♥${c.health}</span>
                  ${c.deploy   ? `<span class="pool-tooltip-kw">Deploy</span>`   : ''}
                  ${c.failsafe ? `<span class="pool-tooltip-kw">Failsafe</span>` : ''}
                </div>
              `).join('')}
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
        <div class="card-row">
          ${state.deck.map(deckCardHTML).join('')}
        </div>
      </div>

      <div class="footer-actions">
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
      <div class="card-name">${item.name}</div>
      <div class="card-stats-row">
        <span class="atk-stat">⚔ ${item.attack}</span>
        <span class="hp-stat">♥ ${item.health}</span>
      </div>
      ${item.deploy   ? `<div class="card-ability">${DEPLOY_EFFECTS[item.deploy]}</div>`     : ''}
      ${item.failsafe ? `<div class="card-ability">${FAILSAFE_EFFECTS[item.failsafe]}</div>` : ''}
      <button class="btn-buy" onclick="buyCard(${item.id})" ${canBuy ? '' : 'disabled'}>Buy <span class="coin"></span> ${item.cost}</button>
    </div>
  `;
}

function deckCardHTML(card) {
  if (card.isHero) {
    return `
      <div class="card deck-card hero-card">
        <div class="card-name hero-name">${card.name}</div>
        <div class="card-stats-row">
          <span class="atk-stat">⚔ ${card.attack}</span>
          <span class="hp-stat">♥ ${card.health}</span>
        </div>
        <div class="card-ability">Always drawn first</div>
        <div class="card-ability">Keeps all enhancements gained in battle</div>
      </div>
    `;
  }
  return `
    <div class="card deck-card">
      <div class="card-name">${card.name}</div>
      <div class="card-stats-row">
        <span class="atk-stat">⚔ ${card.attack}</span>
        <span class="hp-stat">♥ ${card.health}</span>
      </div>
      ${card.deploy   ? `<div class="card-ability">${DEPLOY_EFFECTS[card.deploy]}</div>`     : ''}
      ${card.failsafe ? `<div class="card-ability">${FAILSAFE_EFFECTS[card.failsafe]}</div>` : ''}
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
              <div class="card-name">${card.name}</div>
              <div class="card-stats-row">
                <span class="atk-stat">⚔ ${card.attack}</span>
                <span class="hp-stat">♥ ${card.health}</span>
              </div>
              ${card.deploy   ? `<div class="card-ability">${DEPLOY_EFFECTS[card.deploy]}</div>`     : ''}
              ${card.failsafe ? `<div class="card-ability">${FAILSAFE_EFFECTS[card.failsafe]}</div>` : ''}
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
    return `
      <div class="reward-option card-reward" onclick="chooseReward(${index})">
        <div class="reward-type-badge badge-card">Card</div>
        <div class="reward-name">${c.name}</div>
        <div class="card-stats-row" style="font-size:1.1rem; margin: 4px 0;">
          <span class="atk-stat">⚔ ${c.attack}</span>
          <span class="hp-stat">♥ ${c.health}</span>
        </div>
        <div class="reward-desc">Add to your deck.</div>
        <button class="btn-choose">Choose</button>
      </div>
    `;
  }
  return `
    <div class="reward-option effect-reward" onclick="chooseReward(${index})">
      <div class="reward-type-badge badge-effect">Effect</div>
      <div class="reward-glyph effect-color">✦</div>
      <div class="reward-name">${reward.data.name}</div>
      <div class="reward-desc">${reward.data.desc}</div>
      <button class="btn-choose">Choose</button>
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
        <div class="battle-main">
          <div class="battle-header">
            <span class="battle-boss-name red">${boss.name}</span>
            <span class="battle-boss-num">Threat ${state.bossIndex + 1} of ${BOSS_DATA.length}</span>
          </div>

          <div class="field enemy-field">
            ${enemySlots.map((slot, i) => enemySlotHTML(slot, boss, i)).join('')}
          </div>

          <div class="battle-vs">
            ${!b.fighting && !b.over ? `
              <button class="btn-fight"
                      onclick="startFight()"
                      ${b.playerSlots.some(s => s !== null) ? '' : 'disabled'}>
                Engage
              </button>` : ''}
          </div>

          <div class="field player-field">
            ${b.playerSlots.map((card, i) => playerSlotHTML(card, i)).join('')}
          </div>

          <div class="hand-area">
            <div class="hand-meta">
              <span class="hand-label">Hand &mdash; ${b.hand.length} units</span>
            </div>
            <div class="field">
              ${Array.from({length: 5}, (_, i) => {
                const card = b.hand[i];
                if (!card) return `<div class="slot"></div>`;
                return `<div class="slot">${handCardHTML(card)}</div>`;
              }).join('')}
            </div>
          </div>

          <div class="battle-log">
            ${b.log.length === 0
              ? `<span class="log-empty">Deploy units to the field, then engage.</span>`
              : b.log.slice(-6).map(msg => `<div class="log-entry">${msg}</div>`).join('')}
          </div>
        </div>

        <div class="battle-sidebar">
          ${deckSlotHTML(b.remainingDeck)}
        </div>
      </div>
    </div>
  `;
}

function enemySlotHTML(slot, boss, i) {
  if (i === 2 && state.battle.bossHp <= 0) {
    return `<div class="slot empty-slot" id="es-${i}"></div>`;
  }
  if (i === 2) {
    return `
      <div class="slot" id="es-${i}">
        <div class="card battle-card boss-card boss-art-${state.bossIndex}">
          <div class="battle-stats">
            <span class="battle-atk">${state.battle.bossAttack}</span>
            <span class="battle-hp">${state.battle.bossHp}</span>
          </div>
        </div>
      </div>`;
  }
  if (slot) {
    const hp = slot.currentHp ?? slot.health;
    return `
      <div class="slot" id="es-${i}">
        <div class="card battle-card enemy-card">
          <div class="battle-stats">
            <span class="battle-atk">${slot.attack}</span>
            <span class="battle-hp">${hp}</span>
          </div>
        </div>
      </div>`;
  }
  return `<div class="slot empty-slot" id="es-${i}"></div>`;
}

function deckSlotHTML(deck) {
  if (deck.length === 0) {
    return `<div class="slot deck-empty"></div>`;
  }
  return `
    <div class="slot">
      <div class="card deck-pile">
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
    ? `<div class="card-name hero-name">${card.name}</div>
       <div class="card-stats-row">
         <span class="atk-stat">⚔ ${card.attack}</span>
         <span class="hp-stat">♥ ${card.health}</span>
       </div>
       <div class="card-ability">Always drawn first</div>`
    : `<div class="card-name">${card.name}</div>
       <div class="card-stats-row">
         <span class="atk-stat">⚔ ${card.attack}</span>
         <span class="hp-stat">♥ ${card.health}</span>
       </div>
       ${card.deploy   ? `<div class="card-ability">${DEPLOY_EFFECTS[card.deploy]}</div>`     : ''}
       ${card.failsafe ? `<div class="card-ability">${FAILSAFE_EFFECTS[card.failsafe]}</div>` : ''}`;
  return `<div class="${cls}" ${interact}>${inner}</div>`;
}

function playerSlotHTML(card, i) {
  const fighting    = state.battle.fighting;
  const hasSelected = !fighting && state.battle.selectedCard !== null;
  const dropAttrs   = fighting ? '' : `ondragover="event.preventDefault()" ondrop="dropCard(event,${i})" onclick="clickSlot(${i})"`;

  if (card) {
    const hp = card.currentHp ?? card.health;
    return `
      <div class="slot" id="ps-${i}" ${dropAttrs}>
        <div class="card battle-card ${card.isHero ? 'hero-card' : ''}">
          <div class="battle-stats">
            <span class="battle-atk">${card.attack}</span>
            <span class="battle-hp">${hp}</span>
          </div>
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

newGame();
