// ── data ──────────────────────────────────────────────────────────────────────

const BOSS_DATA = [
  { name: 'Slime King',      hp: 8,  attack: 1, minions: [] },
  { name: 'Cave Troll',      hp: 12, attack: 2, minions: [
    { name: 'Cave Bat', attack: 1, health: 1 },
    { name: 'Cave Bat', attack: 1, health: 1 },
  ]},
  { name: 'Bone Witch',      hp: 15, attack: 3, minions: [
    { name: 'Skeleton', attack: 1, health: 2 },
    { name: 'Skeleton', attack: 1, health: 2 },
    { name: 'Skeleton', attack: 1, health: 2 },
    { name: 'Skeleton', attack: 1, health: 2 },
  ]},
  { name: 'Iron Golem',      hp: 18, attack: 3, minions: [] },
  { name: 'Shadow Drake',    hp: 22, attack: 4, minions: [] },
  { name: 'Lich Lord',       hp: 26, attack: 5, minions: [] },
  { name: 'Void Titan',      hp: 30, attack: 6, minions: [] },
  { name: 'The Dungeon God', hp: 36, attack: 7, minions: [] },
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

const MINION_POOL = [
  { name: 'Goblin',         attack: 1, health: 1 },
  { name: 'Skeleton',       attack: 1, health: 2 },
  { name: 'Zombie',         attack: 2, health: 1 },
  { name: 'Wolf',           attack: 2, health: 2 },
  { name: 'Ogre',           attack: 1, health: 3 },
  { name: 'Bandit',         attack: 3, health: 1 },
  { name: 'Stone Golem',    attack: 1, health: 4 },
  { name: 'Fire Imp',       attack: 3, health: 2 },
  { name: 'Thorn Beast',    attack: 2, health: 3 },
  { name: 'Dark Knight',    attack: 3, health: 3 },
  { name: 'Vampire',        attack: 2, health: 4 },
  { name: 'Wyvern',         attack: 4, health: 2 },
  { name: 'Storm Giant',    attack: 4, health: 4 },
  { name: 'Demon',          attack: 5, health: 3 },
  { name: 'Ancient Dragon', attack: 5, health: 5 },
];

const RELIC_POOL = [
  { id: 'war_horn',      name: 'War Horn',        type: 'relic', desc: 'All your minions gain +1 Attack.' },
  { id: 'iron_shield',   name: 'Iron Shield',     type: 'relic', desc: 'All your minions gain +1 Health.' },
  { id: 'fortune_coin',  name: "Fortune's Coin",  type: 'relic', desc: 'Earn 2 extra gold from boss victories.' },
  { id: 'ancient_tome',  name: 'Ancient Tome',    type: 'relic', desc: 'Shop cards cost 1 less gold (min 1).' },
  { id: 'stone_heart',   name: 'Stone Heart',     type: 'relic', desc: 'Your Hero gains +8 Max Health.' },
  { id: 'berserker_axe', name: "Berserker's Axe", type: 'relic', desc: 'Your Hero gains +2 Attack.' },
];

const REWARD_CARD_POOL = [
  { name: 'Champion',         attack: 4, health: 4 },
  { name: 'War Troll',        attack: 5, health: 3 },
  { name: 'Iron Juggernaut',  attack: 3, health: 6 },
  { name: 'Arcane Golem',     attack: 4, health: 5 },
  { name: 'Death Knight',     attack: 5, health: 5 },
  { name: 'Shadow Fiend',     attack: 6, health: 3 },
  { name: 'Titan Wraith',     attack: 3, health: 8 },
];

const EFFECT_POOL = [
  { id: 'treasure_chest',  name: 'Treasure Chest',  type: 'effect', desc: 'Gain 6 gold immediately.' },
  { id: 'call_to_arms',    name: 'Call to Arms',    type: 'effect', desc: 'Add 2 powerful minions to your deck.' },
  { id: 'arcane_surge',    name: 'Arcane Surge',    type: 'effect', desc: 'All minions in your deck gain +1/+1.' },
  { id: 'divine_blessing', name: 'Divine Blessing', type: 'effect', desc: 'Restore your Hero to full health.' },
  { id: 'soul_capture',    name: 'Soul Capture',    type: 'effect', desc: 'Add the defeated boss as a powerful minion to your deck.' },
];

// ── state ─────────────────────────────────────────────────────────────────────

let state;
let _id = 0;
function nextId() { return ++_id; }

function cardCost(attack, health) {
  return attack + health - 1;
}

function makeHero() {
  return { id: nextId(), name: 'Hero', attack: 2, health: 10, isHero: true };
}

function makeMinion(tmpl) {
  const base = tmpl || { name: 'Minion', attack: 1, health: 1 };
  return { id: nextId(), name: base.name, attack: base.attack, health: base.health };
}

function buildBossMinions(boss) {
  const slots = [null, null, null, null];
  const tmpl  = boss.minions || [];
  if (tmpl.length === 2) {
    slots[1] = makeMinion(tmpl[0]);
    slots[2] = makeMinion(tmpl[1]);
  } else if (tmpl.length === 4) {
    for (let i = 0; i < 4; i++) slots[i] = makeMinion(tmpl[i]);
  }
  return slots;
}

function generateShop() {
  const maxCost = 2 + state.bossIndex;
  const pool = MINION_POOL.filter(t => cardCost(t.attack, t.health) <= maxCost + 2);
  const source = pool.length >= 5 ? pool : MINION_POOL;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  const discount = state.relics.filter(r => r.id === 'ancient_tome').length;
  return shuffled.slice(0, 5).map(t => ({
    id: nextId(),
    name: t.name,
    attack: t.attack,
    health: t.health,
    cost: Math.max(1, cardCost(t.attack, t.health) - discount),
    sold: false,
  }));
}

function newGame() {
  state = {
    phase: 'shop',
    bossIndex: 0,
    deck: [makeHero(), makeMinion(), makeMinion(), makeMinion()],
    gold: 5,
    shopItems: [],
    relics: [],
    pendingRewards: [],
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
    if (hero) hero.health += 8;
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
    if (hero) {
      const maxHp = 10 + (state.relics.some(r => r.id === 'stone_heart') ? 8 : 0);
      hero.health = maxHp;
    }
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
  if (!item || item.sold || state.gold < item.cost) return;
  state.gold -= item.cost;
  item.sold = true;
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
    b.log.push(`Your ${attacker.name} hits ${targetName} for ${attacker.attack}.`);
    if (targetCol === 2 && b.bossHp <= 0)
      b.log.push(`${boss.name} falls!`);
    else if (targetCol !== 2 && !b.bossMinions[minionIdx(targetCol)])
      b.log.push(`${targetName} is destroyed!`);
  } else {
    const attk   = col === 2
      ? { name: boss.name, attack: boss.attack }
      : b.bossMinions[minionIdx(col)];
    const target = b.playerSlots[targetCol];
    damagePlayer(targetCol, attk.attack);
    b.log.push(`${attk.name} hits your ${target.name} for ${attk.attack}.`);
    if (!b.playerSlots[targetCol])
      b.log.push(`Your ${target.name} falls!`);
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

function damageEnemy(col, amount) {
  if (col === 2) {
    state.battle.bossHp = Math.max(0, state.battle.bossHp - amount);
  } else {
    const m = state.battle.bossMinions[minionIdx(col)];
    if (!m) return;
    m.currentHp -= amount;
    if (m.currentHp <= 0) state.battle.bossMinions[minionIdx(col)] = null;
  }
}

function damagePlayer(col, amount) {
  const c = state.battle.playerSlots[col];
  if (!c) return;
  c.currentHp -= amount;
  if (c.currentHp <= 0) state.battle.playerSlots[col] = null;
}

function isBattleOver() {
  const playerDead = state.battle.playerSlots.every(s => s === null);
  const bossDead   = state.battle.bossHp <= 0 && state.battle.bossMinions.every(m => m === null);
  return playerDead || bossDead;
}

function endBattle() {
  const b = state.battle;
  b.fighting = false;
  b.over = true;
  const bossDead = b.bossHp <= 0;

  if (bossDead) {
    const fortuneBonus = state.relics.filter(r => r.id === 'fortune_coin').length * 2;
    const reward = 3 + state.bossIndex + fortuneBonus;
    b.log.push(`Victory! You earned ${reward} gold.`);
    render();
    setTimeout(() => {
      state.gold += reward;
      state.lastDefeatedBoss = BOSS_DATA[state.bossIndex];
      state.bossIndex++;
      if (state.bossIndex >= BOSS_DATA.length) {
        state.phase = 'win';
      } else {
        state.phase = 'reward';
        state.pendingRewards = generateRewards();
      }
      render();
    }, 2500);
  } else {
    b.log.push('Defeat! Your forces have been destroyed.');
    render();
    setTimeout(() => { state.phase = 'lose'; render(); }, 2500);
  }
}

function playCard(cardId, slotIndex) {
  const handIndex = state.battle.hand.findIndex(c => c.id === cardId);
  if (handIndex === -1) return;

  const card = state.battle.hand[handIndex];
  const displaced = state.battle.playerSlots[slotIndex];

  state.battle.hand.splice(handIndex, 1);
  if (displaced) state.battle.hand.push(displaced);
  state.battle.playerSlots[slotIndex] = card;
  state.battle.selectedCard = null;

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
    bossMinions:   buildBossMinions(boss),
    playerSlots:   [null, null, null, null, null],
    hand:          drawPile.slice(0, drawCount),
    remainingDeck: drawPile.slice(drawCount),
    selectedCard:  null,
    fighting:      false,
    seqPos:        0,
    log:           [],
  };
  render();
}

// ── render ────────────────────────────────────────────────────────────────────

function render() {
  const app = document.getElementById('app');
  let screen = '';
  if      (state.phase === 'shop')   screen = shopHTML();
  else if (state.phase === 'boss')   screen = bossHTML();
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
        <h2 class="section-title">Relics</h2>
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
        <h1 class="title">Shop</h1>
        <p class="subtitle">
          Next: <span class="red">${boss.name}</span>
          &nbsp;·&nbsp; ♥ ${boss.hp} &nbsp; ⚔ ${boss.attack}
          &nbsp;·&nbsp; Boss ${bossNum} of ${BOSS_DATA.length}
        </p>
      </div>

      ${relicsSection}

      <div class="shop-section">
        <div class="section-header">
          <h2 class="section-title">For Sale</h2>
          <button class="btn-secondary"
                  onclick="rerollShop()"
                  ${state.gold < 1 ? 'disabled' : ''}>
            Reroll (1<span class="coin"></span>)
          </button>
        </div>
        <div class="card-row">
          ${state.shopItems.map(shopCardHTML).join('')}
        </div>
      </div>

      <div class="section-divider"></div>

      <div class="deck-section">
        <div class="section-header">
          <h2 class="section-title">Your Deck &mdash; ${state.deck.length} cards</h2>
        </div>
        <div class="card-row">
          ${state.deck.map(deckCardHTML).join('')}
        </div>
      </div>

      <div class="footer-actions">
        <button class="btn-proceed" onclick="proceedToBoss()">
          Face ${boss.name} →
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
  const canBuy = !item.sold && state.gold >= item.cost;
  const cls = ['card', 'shop-card',
    item.sold ? 'sold' : '',
    !item.sold && !canBuy ? 'unaffordable' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${cls}">
      <div class="card-name">${item.name}</div>
      <div class="card-stats-row">
        <span class="atk-stat">⚔ ${item.attack}</span>
        <span class="hp-stat">♥ ${item.health}</span>
      </div>
      <div class="card-cost"><span class="coin"></span> ${item.cost}</div>
      ${item.sold
        ? '<div class="sold-label">Sold</div>'
        : `<button class="btn-buy" onclick="buyCard(${item.id})" ${canBuy ? '' : 'disabled'}>Buy</button>`
      }
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
        <div class="card-ability">Always draw first in battle</div>
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
    </div>
  `;
}

// ── reward screen ─────────────────────────────────────────────────────────────

function rewardHTML() {
  const boss = state.lastDefeatedBoss;
  return `
    <div class="screen reward-screen">
      <h1 class="title">Choose Your Reward</h1>
      <p class="subtitle">${boss ? `${boss.name} has been defeated!` : 'Victory!'}</p>
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
        <div class="reward-type-badge badge-relic">Relic</div>
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
            <span class="battle-boss-num">Boss ${state.bossIndex + 1} of ${BOSS_DATA.length}</span>
          </div>

          <div class="field enemy-field">
            ${enemySlots.map((slot, i) => enemySlotHTML(slot, boss, i)).join('')}
          </div>

          <div class="battle-vs">
            ${!b.fighting && !b.over ? `
              <button class="btn-fight"
                      onclick="startFight()"
                      ${b.playerSlots.some(s => s !== null) ? '' : 'disabled'}>
                Start Fight
              </button>` : ''}
          </div>

          <div class="field player-field">
            ${b.playerSlots.map((card, i) => playerSlotHTML(card, i)).join('')}
          </div>

          <div class="hand-area">
            <div class="hand-meta">
              <span class="hand-label">Hand &mdash; ${b.hand.length} cards</span>
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
              ? `<span class="log-empty">Play cards to the field, then start the fight.</span>`
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
        <div class="card battle-card boss-card">
          <div class="card-name red">${boss.name}</div>
          <div class="card-stats-row">
            <span class="atk-stat">⚔ ${boss.attack}</span>
            <span class="hp-stat">♥ ${state.battle.bossHp}</span>
          </div>
        </div>
      </div>`;
  }
  if (slot) {
    const hp = slot.currentHp ?? slot.health;
    return `
      <div class="slot" id="es-${i}">
        <div class="card battle-card enemy-card">
          <div class="card-name">${slot.name}</div>
          <div class="card-stats-row">
            <span class="atk-stat">⚔ ${slot.attack}</span>
            <span class="hp-stat">♥ ${hp}</span>
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
       <div class="card-ability">Always draw first in battle</div>`
    : `<div class="card-name">${card.name}</div>
       <div class="card-stats-row">
         <span class="atk-stat">⚔ ${card.attack}</span>
         <span class="hp-stat">♥ ${card.health}</span>
       </div>`;
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
          <div class="card-name ${card.isHero ? 'hero-name' : ''}">${card.name}</div>
          <div class="card-stats-row">
            <span class="atk-stat">⚔ ${card.attack}</span>
            <span class="hp-stat">♥ ${hp}</span>
          </div>
          ${card.isHero ? `<div class="card-ability">Always draw first in battle</div>` : ''}
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
      <p class="subtitle">The dungeon is conquered.</p>
      <button class="btn-proceed" onclick="newGame()">Play Again</button>
    </div>
  `;
}

function loseHTML() {
  return `
    <div class="screen end-screen">
      <h1 class="title red">Defeated.</h1>
      <p class="subtitle">The dungeon claims another soul.</p>
      <button class="btn-secondary" onclick="newGame()">Try Again</button>
    </div>
  `;
}

// ── boot ──────────────────────────────────────────────────────────────────────

newGame();
