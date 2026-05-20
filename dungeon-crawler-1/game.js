// ── Data ──────────────────────────────────────────────────────────────────────

const BOSSES = [
  {
    name: 'Goblin Warchief',
    power: 4,
    ability: 'none',
    abilityDesc: 'No tricks. Just brute force.',
  },
  {
    name: 'Stone Troll',
    power: 6,
    ability: 'thick-hide',
    abilityDesc: 'Thick Hide — Your lowest-power card is nullified.',
  },
  {
    name: 'Plague Witch',
    power: 9,
    ability: 'hex',
    abilityDesc: 'Hex — Your 2 lowest-power cards are nullified.',
  },
  {
    name: 'Iron Sentinel',
    power: 11,
    ability: 'cull',
    abilityDesc: 'Cull — Only your 5 highest-power cards count.',
  },
  {
    name: 'Ancient Dragon',
    power: 14,
    ability: 'dragons-gaze',
    abilityDesc: "Dragon's Gaze — Only your 6 highest-power cards count.",
  },
];

// Weighted pools per room (values are card powers)
const SHOP_POOLS = [
  [1, 1, 1, 2, 2, 3],
  [1, 1, 2, 2, 2, 3, 3],
  [1, 2, 2, 3, 3, 3, 4],
  [2, 2, 3, 3, 3, 4, 4],
  [2, 3, 3, 4, 4, 5],
];

// ── State ─────────────────────────────────────────────────────────────────────

let state = {};
let nextId = 10;

function init() {
  nextId = 10;
  state = {
    gold: 2,
    deck: [{ id: 1, power: 1 }, { id: 2, power: 1 }, { id: 3, power: 1 }],
    phase: 'title',   // title | room | battle | gameover | win
    roomIndex: 0,     // 0–4
    shopCards: [],
    mode: null,       // null | 'remove' | 'upgrade'
    battleResult: null,
  };
  render();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateShop(roomIndex) {
  return shuffle(SHOP_POOLS[roomIndex])
    .slice(0, 3)
    .map((power, i) => ({ id: 200 + roomIndex * 10 + i, power }));
}

function totalPower(deck) {
  return deck.reduce((s, c) => s + c.power, 0);
}

function effectivePower(deck, ability) {
  const asc = [...deck].map(c => c.power).sort((a, b) => a - b);
  const total = asc.reduce((s, p) => s + p, 0);
  switch (ability) {
    case 'thick-hide':
      return total - asc[0];
    case 'hex':
      return total - asc[0] - (asc[1] ?? 0);
    case 'cull':
      return asc.slice(-5).reduce((s, p) => s + p, 0);
    case 'dragons-gaze':
      return asc.slice(-6).reduce((s, p) => s + p, 0);
    default:
      return total;
  }
}

function getCardBattleInfo(deck, ability) {
  const byAsc  = [...deck].sort((a, b) => a.power - b.power);
  const byDesc = [...deck].sort((a, b) => b.power - a.power);
  switch (ability) {
    case 'thick-hide': {
      const nullId = byAsc[0].id;
      return deck.map(c => ({ card: c, effective: c.id !== nullId }));
    }
    case 'hex': {
      const nullIds = new Set([byAsc[0].id, byAsc[1]?.id].filter(Boolean));
      return deck.map(c => ({ card: c, effective: !nullIds.has(c.id) }));
    }
    case 'cull': {
      const keepIds = new Set(byDesc.slice(0, 5).map(c => c.id));
      return deck.map(c => ({ card: c, effective: keepIds.has(c.id) }));
    }
    case 'dragons-gaze': {
      const keepIds = new Set(byDesc.slice(0, 6).map(c => c.id));
      return deck.map(c => ({ card: c, effective: keepIds.has(c.id) }));
    }
    default:
      return deck.map(c => ({ card: c, effective: true }));
  }
}

function abilityExplanation(deck, ability) {
  const asc = [...deck].map(c => c.power).sort((a, b) => a - b);
  switch (ability) {
    case 'thick-hide':
      return `Lowest card (power ${asc[0]}) nullified`;
    case 'hex':
      return `2 lowest cards (power ${asc[0]}, ${asc[1] ?? 0}) nullified`;
    case 'cull':
      return `Only top ${Math.min(5, deck.length)} cards count`;
    case 'dragons-gaze':
      return `Only top ${Math.min(6, deck.length)} cards count`;
    default:
      return null;
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────

function buyCard(shopCard) {
  if (state.gold < shopCard.power) return;
  state.gold -= shopCard.power;
  state.deck.push({ id: nextId++, power: shopCard.power });
  state.shopCards = state.shopCards.filter(c => c.id !== shopCard.id);
  state.mode = null;
  render();
}

function removeCard(card) {
  if (state.gold < 1 || state.deck.length <= 1) return;
  state.gold -= 1;
  state.deck = state.deck.filter(c => c.id !== card.id);
  state.mode = null;
  render();
}

function upgradeCard(card) {
  if (state.gold < 2) return;
  state.gold -= 2;
  card.power += 1;
  state.mode = null;
  render();
}

function deckCardClick(card) {
  if (state.mode === 'remove') removeCard(card);
  else if (state.mode === 'upgrade') upgradeCard(card);
}

function setMode(mode) {
  state.mode = state.mode === mode ? null : mode;
  render();
}

function startGame() {
  state.shopCards = generateShop(0);
  state.phase = 'room';
  render();
}

function enterBattle() {
  const boss = BOSSES[state.roomIndex];
  const tp = totalPower(state.deck);
  const ep = effectivePower(state.deck, boss.ability);
  const explanation = abilityExplanation(state.deck, boss.ability);
  state.battleResult = { boss, totalPower: tp, effectivePower: ep, explanation, won: ep >= boss.power };
  state.phase = 'battle';
  state.mode = null;
  render();
}

function afterBattle() {
  if (!state.battleResult.won) {
    state.phase = 'gameover';
    render();
    return;
  }
  state.gold += 3;
  state.roomIndex++;
  if (state.roomIndex >= 5) {
    state.phase = 'win';
    render();
    return;
  }
  state.shopCards = generateShop(state.roomIndex);
  state.phase = 'room';
  state.mode = null;
  render();
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function cardHTML(card, selectable) {
  return `<div class="card${selectable ? ' selectable' : ''}" data-id="${card.id}">
    <div class="card-power">${card.power}</div>
    <div class="card-sub">power</div>
  </div>`;
}

function renderTitle() {
  return `
    <div class="title-screen">
      <h1>Dungeon Crawler 1</h1>
      <p class="subtitle">Five rooms. Five battles. Build your deck wisely.</p>
      <div class="starting-box">
        <div>Starting deck: <strong>3 cards at Power 1</strong></div>
        <div>Starting gold: <strong>2</strong></div>
        <div>Battle reward: <strong>3 gold per win</strong></div>
      </div>
      <button id="btn-start">Begin Your Descent</button>
    </div>
  `;
}

function renderRoom() {
  const boss = BOSSES[state.roomIndex];
  const roomNum = state.roomIndex + 1;
  const tp = totalPower(state.deck);
  const deckSelectable = state.mode === 'remove' || state.mode === 'upgrade';
  const canRemove = state.gold >= 1 && state.deck.length > 1;
  const canUpgrade = state.gold >= 2;

  const modeHint = state.mode === 'remove'
    ? '<div class="mode-hint">Select a card from your deck to remove it.</div>'
    : state.mode === 'upgrade'
    ? '<div class="mode-hint">Select a card from your deck to upgrade it (+1 power).</div>'
    : '';

  const shopHTML = state.shopCards.length > 0
    ? state.shopCards.map(c => `
        <div class="shop-item">
          ${cardHTML(c, false)}
          <button class="btn-buy" data-id="${c.id}" ${state.gold < c.power ? 'disabled' : ''}>
            ${c.power} gold
          </button>
        </div>
      `).join('')
    : '<span class="empty-text">Shop is empty.</span>';

  return `
    <div>
      <div class="top-bar">
        <span class="phase-label">Room ${roomNum} of 5</span>
        <span class="gold-badge">${state.gold} gold</span>
      </div>

      <div class="room-grid">

        <div>
          <div class="panel">
            <div class="panel-title">Your Deck <span>Total Power: ${tp}</span></div>
            <div class="card-row">
              ${state.deck.map(c => cardHTML(c, deckSelectable)).join('')}
            </div>
            ${modeHint}
          </div>

          <div class="panel">
            <div class="panel-title">Actions</div>
            <div class="action-buttons">
              <button class="btn-secondary ${state.mode === 'remove' ? 'active' : ''}"
                id="btn-remove-mode" ${!canRemove ? 'disabled' : ''}>
                Remove Card (1 gold)
              </button>
              <button class="btn-secondary ${state.mode === 'upgrade' ? 'active' : ''}"
                id="btn-upgrade-mode" ${!canUpgrade ? 'disabled' : ''}>
                Upgrade Card (2 gold)
              </button>
            </div>
          </div>
        </div>

        <div>
          <div class="panel">
            <div class="panel-title">Shop</div>
            <div class="shop-items">${shopHTML}</div>
          </div>

          <div class="panel boss-preview">
            <div class="panel-title">Next Battle</div>
            <span class="boss-name">${boss.name}</span>
            <span class="boss-stat">Power: ${boss.power}</span>
            <span class="boss-ability-text">${boss.abilityDesc}</span>
          </div>
        </div>

      </div>

      <button class="proceed-btn" id="btn-enter-battle">Enter Battle →</button>
    </div>
  `;
}

function renderBattle() {
  const { boss, effectivePower: ep, won } = state.battleResult;
  const battleNum = state.roomIndex + 1;
  const isLast = state.roomIndex >= 4;
  const cardInfo = getCardBattleInfo(state.deck, boss.ability);

  const cardsHTML = cardInfo.map(({ card, effective }, i) =>
    `<div class="battle-card ${effective ? 'effective' : 'nullified'}" data-idx="${i}">
      <div class="card-power">${card.power}</div>
      <div class="card-sub">power</div>
    </div>`
  ).join('');

  return `
    <div class="battle-screen">
      <div class="top-bar">
        <span class="phase-label">Battle ${battleNum} of 5</span>
        <span class="gold-badge">${state.gold} gold</span>
      </div>

      <div class="boss-section">
        <div class="boss-card" id="boss-card">
          <div class="boss-name-display">${boss.name}</div>
          <div class="boss-power-label">Power ${boss.power}</div>
          ${boss.ability !== 'none' ? `<div class="boss-ability-label">${boss.abilityDesc}</div>` : ''}
        </div>
      </div>

      <div class="projectile-zone">
        <div class="power-proj" id="power-proj">${ep}</div>
      </div>

      <div class="cards-section">
        <div class="battle-cards-row">${cardsHTML}</div>
        ${boss.ability !== 'none' ? `<div class="ability-note" id="ability-note">${state.battleResult.explanation}</div>` : ''}
      </div>

      <div class="battle-outcome" id="battle-outcome"></div>

      <button class="proceed-btn" id="btn-after-battle" style="opacity:0;pointer-events:none">
        ${won ? (isLast ? 'Claim Victory →' : 'Next Room →') : 'Continue'}
      </button>
    </div>
  `;
}

function animateBattle() {
  const { boss, won } = state.battleResult;
  const numCards = state.deck.length;
  const stagger = Math.min(100, 900 / numCards);

  const T_BOSS        = 50;
  const T_CARDS       = 650;
  const T_CARDS_END   = T_CARDS + numCards * stagger + 200;
  const T_NOTE        = T_CARDS_END;
  const T_PROJ_APPEAR = T_CARDS_END + 200;
  const T_PROJ_LAUNCH = T_PROJ_APPEAR + 500;
  const T_IMPACT      = T_PROJ_LAUNCH + 550;
  const T_RESULT      = T_IMPACT + 350;
  const T_BUTTON      = T_RESULT + 700;

  setTimeout(() => document.getElementById('boss-card')?.classList.add('enter'), T_BOSS);

  document.querySelectorAll('.battle-card').forEach((el, i) => {
    setTimeout(() => el.classList.add('enter'), T_CARDS + i * stagger);
  });

  if (boss.ability !== 'none') {
    setTimeout(() => document.getElementById('ability-note')?.classList.add('visible'), T_NOTE);
  }

  setTimeout(() => document.getElementById('power-proj')?.classList.add('appear'), T_PROJ_APPEAR);
  setTimeout(() => document.getElementById('power-proj')?.classList.add('launch'), T_PROJ_LAUNCH);

  setTimeout(() => {
    const bossEl = document.getElementById('boss-card');
    bossEl?.classList.add('impact');
    if (won) {
      setTimeout(() => bossEl?.classList.add('defeated'), 300);
    } else {
      bossEl?.classList.add('survived');
      document.querySelectorAll('.battle-card.effective').forEach(el => el.classList.add('lost'));
    }
  }, T_IMPACT);

  setTimeout(() => {
    const outcome = document.getElementById('battle-outcome');
    if (!outcome) return;
    outcome.innerHTML = won
      ? `<div class="result-banner result-win">Victory!</div><div class="reward-text">+3 gold earned</div>`
      : `<div class="result-banner result-lose">Defeated.</div>`;
    outcome.classList.add('visible');
  }, T_RESULT);

  setTimeout(() => {
    const btn = document.getElementById('btn-after-battle');
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  }, T_BUTTON);
}

function renderGameOver() {
  return `
    <div class="end-screen">
      <h1 style="color:#ff4444">Defeated</h1>
      <p>You fell in battle ${state.roomIndex + 1}.</p>
      <p>Final deck power: ${totalPower(state.deck)}</p>
      <button id="btn-restart">Try Again</button>
    </div>
  `;
}

function renderWin() {
  return `
    <div class="end-screen">
      <h1 style="color:#c9a84c">Victory!</h1>
      <p>You slew the Ancient Dragon.</p>
      <p>Final gold: ${state.gold} &nbsp;|&nbsp; Final deck power: ${totalPower(state.deck)}</p>
      <div class="final-deck card-row">
        ${state.deck.map(c => cardHTML(c, false)).join('')}
      </div>
      <button id="btn-restart">Play Again</button>
    </div>
  `;
}

// ── Event wiring ──────────────────────────────────────────────────────────────

function render() {
  const app = document.getElementById('app');
  switch (state.phase) {
    case 'title':    app.innerHTML = renderTitle();    break;
    case 'room':     app.innerHTML = renderRoom();     break;
    case 'battle':
      app.innerHTML = renderBattle();
      setTimeout(animateBattle, 16);
      break;
    case 'gameover': app.innerHTML = renderGameOver(); break;
    case 'win':      app.innerHTML = renderWin();      break;
  }

  document.getElementById('btn-start')?.addEventListener('click', startGame);
  document.getElementById('btn-enter-battle')?.addEventListener('click', enterBattle);
  document.getElementById('btn-after-battle')?.addEventListener('click', afterBattle);
  document.getElementById('btn-restart')?.addEventListener('click', init);

  document.getElementById('btn-remove-mode')?.addEventListener('click', () => setMode('remove'));
  document.getElementById('btn-upgrade-mode')?.addEventListener('click', () => setMode('upgrade'));

  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = state.shopCards.find(c => c.id === parseInt(btn.dataset.id));
      if (card) buyCard(card);
    });
  });

  document.querySelectorAll('.card.selectable').forEach(el => {
    el.addEventListener('click', () => {
      const card = state.deck.find(c => c.id === parseInt(el.dataset.id));
      if (card) deckCardClick(card);
    });
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────

init();
