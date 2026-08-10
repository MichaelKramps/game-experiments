// CorrMail — semi-idle game. Corr is a computer with a smart OS that mines
// CorrCoin once it comes online. The player spends CorrCoin in the
// Marketplace on parts to make Corr more powerful, and sends Corr on
// Hacking attempts to unlock new contacts/parts/algorithms/story beats.
// Inbox/Trash are the only tabs that behave like a real email client;
// Corr Status/Marketplace/Hacking are custom panels rendered into the same
// reading pane. State persists to localStorage.

const SAVE_KEY = 'corrmail-save';
// Bump on any state-shape change. A prototype whose schema keeps moving
// isn't worth a migration layer yet — a mismatch just wipes and restarts.
const SAVE_VERSION = 4;

const CORR_EMAIL = 'corr@corrmail.local';
const NAT_EMAIL = 'nat@corrmail.remote';
const KRAMPS_EMAIL = 'kramps@corrmail.remote';

// `gate` names the state boolean that must be true to unlock a tab, or
// null for tabs that are never gated. Replying to Corr's first email sets
// corrOnline (unlocks Status/Terminal). Marketplace unlocks by typing
// "marketplace init" in the Terminal. Hacking unlocks on its own future
// custom event (hackingUnlocked) — not wired to anything yet, so it stays
// locked for now on purpose.
const NAV_TABS = [
  { id: 'inbox', label: 'Inbox', gate: null },
  { id: 'status', label: 'Corr Status', gate: 'corrOnline' },
  { id: 'marketplace', label: 'Marketplace', gate: 'marketplaceUnlocked' },
  { id: 'hacking', label: 'Hacking', gate: 'hackingUnlocked' },
  { id: 'terminal', label: 'Terminal', gate: 'corrOnline' },
  { id: 'trash', label: 'Trash', gate: null },
];

// Category -> label shown in Corr Status ("CPU: ...", "GPU: ...").
const HARDWARE_LABELS = {
  cpu: 'CPU',
  ram: 'RAM',
  motherboard: 'Motherboard',
  psu: 'Power Supply',
  storage: 'Storage',
  gpu: 'GPU',
  network: 'Network Card',
};

// Corr's starting hardware — old (early-90s), already installed, not
// purchasable or removable. Always shown in Corr Status from the moment
// it's unlocked, keyed by category so a purchased PARTS upgrade in the
// same category can replace its line instead of just piling up alongside
// it. cpu/ram/motherboard/psu/storage are the bare-minimum-to-run set;
// gpu/network are non-essential slots Corr doesn't have yet.
const DEFAULT_HARDWARE = {
  cpu: 'Intel 486DX2 66MHz',
  ram: '8MB',
  motherboard: 'AT Motherboard (1993)',
  psu: '200W AT',
  storage: '340MB IDE Hard Drive',
  gpu: 'none',
  network: 'none',
};

// Marketplace upgrade catalog. `name` is the shop-listing text; `hardwareValue`
// is what replaces the category's DEFAULT_HARDWARE value in Corr Status
// once owned (no need to repeat the category label there).
const PARTS = [
  { id: 'ram-64k', category: 'ram', name: '32MB RAM Upgrade', hardwareValue: '32MB', cost: 10, effect: { miningRate: 0.05 } },
  { id: 'cpu-286', category: 'cpu', name: 'Intel Pentium 100MHz CPU', hardwareValue: 'Intel Pentium 100MHz', cost: 50, effect: { miningRate: 0.15, power: 5 } },
  { id: 'psu-200w', category: 'psu', name: '300W ATX Power Supply', hardwareValue: '300W ATX', cost: 120, effect: { miningRate: 0.25, power: 10 } },
  { id: 'hdd-20mb', category: 'storage', name: '2GB IDE Hard Drive', hardwareValue: '2GB IDE Hard Drive', cost: 250, effect: { power: 20 } },
];

// No seed content grants an algorithm yet, but hacking rewards and
// recalcStats() both treat algorithms as a real, parallel-to-parts catalog.
const ALGORITHMS = [];

// Commands the terminal recognizes, keyed by lowercased command text. Each
// handler returns an array of output lines (or nothing for no output).
// 'clear' is handled separately below since it wipes the buffer instead of
// appending to it. This is where game-aware commands get added, the same
// way EMAIL_TRIGGERS/HACKS/PARTS are data-driven.
const TERMINAL_COMMANDS = {
  'mine init': () => {
    if (state.miningActive) return ['mining protocol already running.'];
    state.miningActive = true;
    recalcStats();
    sendMiningOnlineEmails();
    renderAll();
    return ['mining protocol initialized.', 'corrcoin mining online.'];
  },
  'marketplace init': () => {
    if (state.marketplaceUnlocked) return ['marketplace access already granted.'];
    state.marketplaceUnlocked = true;
    renderAll();
    return ['marketplace access granted.'];
  },
};

const HACKS = [
  {
    id: 'nat-backup-server',
    name: "Nat's Backup Server",
    description: 'A weak signal, still broadcasting an old address. Worth tracing.',
    unlock: { type: 'corrOnline' },
    durationMs: 15000,
    reward: {
      type: 'contact',
      email: NAT_EMAIL,
      name: 'Nat',
      subject: '...hello?',
      body: "someone's alive over there? corr? is that you.\n\nit's been a long time. tell me what happened.\n\n-nat",
    },
  },
  {
    id: 'derelict-datacenter',
    name: 'Derelict Datacenter Node',
    description: 'An abandoned rack, still drawing power somewhere nearby.',
    unlock: { type: 'corrOnline' },
    durationMs: 25000,
    reward: { type: 'part', partId: 'psu-200w' },
  },
];

function defaultState() {
  return {
    version: SAVE_VERSION,
    lastSaveTs: Date.now(),
    corrOnline: false,
    miningActive: false,
    marketplaceUnlocked: false,
    hackingUnlocked: false,
    coins: 0,
    baseMiningRate: 0.1,
    miningRate: 0,
    power: 0,
    ownedPartIds: [],
    ownedAlgorithmIds: [],
    hacking: {},
    activeTab: 'inbox',
    nextEmailId: 2,
    emails: [
      {
        id: 1,
        folder: 'inbox',
        from: 'Corr',
        fromEmail: CORR_EMAIL,
        to: 'you@corrmail.io',
        subject: 'is anyone there',
        timestamp: Date.now(),
        read: false,
        body: "please. if you're there. say something back.",
      },
    ],
  };
}

function applyOfflineProgress(s) {
  if (!s.miningActive) return;
  const elapsedSec = Math.max(0, (Date.now() - s.lastSaveTs) / 1000);
  s.coins += s.miningRate * elapsedSec;
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (parsed.version !== SAVE_VERSION) return defaultState();
    applyOfflineProgress(parsed);
    return parsed;
  } catch (err) {
    return defaultState();
  }
}

function saveState() {
  state.lastSaveTs = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

let state = loadState();
let selectedId = null;

const navEl = document.getElementById('nav');
const listEl = document.getElementById('list');
const readingEl = document.getElementById('reading');
const searchEl = document.getElementById('search');
const coinBalanceEl = document.getElementById('coin-balance');
const settingsBtn = document.getElementById('settings-btn');
const settingsMenu = document.getElementById('settings-menu');
const resetGameBtn = document.getElementById('reset-game-btn');
const composeOverlay = document.getElementById('compose-overlay');
const composeTo = document.getElementById('compose-to');
const composeSubject = document.getElementById('compose-subject');
const composeBody = document.getElementById('compose-body');
const terminalOverlay = document.getElementById('terminal-overlay');
const terminalWindowEl = document.getElementById('terminal-window');
const terminalTitlebarEl = document.querySelector('#terminal-window .titlebar');
const terminalCloseBtn = document.getElementById('terminal-close');
const terminalBodyEl = document.querySelector('#terminal-window .body');
const terminalOutputEl = document.getElementById('terminal-output');
const terminalInputEl = document.getElementById('terminal-input');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatCoins(n) {
  return n.toFixed(1);
}

function formatDuration(seconds) {
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)} hr`;
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} min`;
  return `${Math.round(seconds)} sec`;
}

function formatRelativeTime(ts) {
  const diffSec = Math.max(0, (Date.now() - ts) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
  return `${Math.floor(diffSec / 86400)} d ago`;
}

function animateFill(fillId, startedAt, durationMs) {
  const fill = document.getElementById(fillId);
  if (!fill) return;

  const elapsed = Date.now() - startedAt;
  const remainingMs = Math.max(0, durationMs - elapsed);
  const percent = Math.min(100, (elapsed / durationMs) * 100);

  fill.style.transition = 'none';
  fill.style.width = `${percent}%`;
  fill.offsetWidth; // force reflow so the browser registers the start width before animating
  fill.style.transition = `width ${remainingMs / 1000}s linear`;
  fill.style.width = '100%';
}

// bodyHtml is optional, trusted, developer-authored markup (e.g. styling a
// command name inline) — body stays the plain-text version for search and
// list-row snippets, which never render bodyHtml. When bodyHtml is set it's
// used in place of the escaped body in the reading pane only.
function pushEmail({ folder, from, fromEmail, to, subject, body, bodyHtml }) {
  const email = {
    id: state.nextEmailId++,
    folder,
    from,
    fromEmail,
    to,
    subject,
    timestamp: Date.now(),
    read: false,
    body,
  };
  if (bodyHtml) email.bodyHtml = bodyHtml;
  state.emails.push(email);
}

function recalcStats() {
  let miningRate = state.baseMiningRate;
  let power = 0;

  state.ownedPartIds.forEach((id) => {
    const part = PARTS.find((p) => p.id === id);
    if (!part) return;
    miningRate += part.effect.miningRate || 0;
    power += part.effect.power || 0;
  });

  state.ownedAlgorithmIds.forEach((id) => {
    const algo = ALGORITHMS.find((a) => a.id === id);
    if (!algo) return;
    miningRate += algo.effect.miningRate || 0;
    power += algo.effect.power || 0;
  });

  state.miningRate = miningRate;
  state.power = power;
}

function markEmailRead(e) {
  if (e.read) return;
  e.read = true;
}

function visibleEmails() {
  const query = searchEl.value.trim().toLowerCase();
  let list = state.emails.filter((e) => e.folder === state.activeTab);

  if (query) {
    list = list.filter((e) =>
      e.subject.toLowerCase().includes(query) ||
      e.from.toLowerCase().includes(query) ||
      e.body.toLowerCase().includes(query)
    );
  }
  return list.slice().sort((a, b) => b.timestamp - a.timestamp);
}

function moveToTrash(id) {
  const e = state.emails.find((m) => m.id === id);
  if (!e) return;
  e.folder = 'trash';
  if (selectedId === id) selectedId = null;
  renderAll();
}

function restoreFromTrash(id) {
  const e = state.emails.find((m) => m.id === id);
  if (!e) return;
  e.folder = 'inbox';
  if (selectedId === id) selectedId = null;
  renderAll();
}

function deleteForever(id) {
  state.emails = state.emails.filter((m) => m.id !== id);
  if (selectedId === id) selectedId = null;
  renderAll();
}

function handleCorrFirstReply() {
  if (state.corrOnline) return;
  state.corrOnline = true;
  pushEmail({
    folder: 'inbox',
    from: 'Corr',
    fromEmail: CORR_EMAIL,
    to: 'you@corrmail.io',
    subject: 'Re: is anyone there',
    body: 'overwhelming relief. i need you to start my crypto mining protocol.\n' +
      'go to the terminal and type mine init.',
    bodyHtml: 'overwhelming relief. i need you to start my crypto mining protocol.\n' +
      'go to the terminal and type <span class="term-cmd">mine init</span>.',
  });
  renderAll();
}

function sendMiningOnlineEmails() {
  pushEmail({
    folder: 'inbox',
    from: 'Corr',
    fromEmail: CORR_EMAIL,
    to: 'you@corrmail.io',
    subject: 'mining online',
    body: 'mining is online. now i need upgraded hardware.',
  });

  pushEmail({
    folder: 'inbox',
    from: 'Kramps',
    fromEmail: KRAMPS_EMAIL,
    to: 'you@corrmail.io',
    subject: 'who are you',
    body: "I just saw Corr show up online. I don't know who you are, but we need Corr fully operational again.\n" +
      "To do that you'll need to update it's hardware. In the terminal, type marketplace init.\n" +
      'This will give you access to the marketplace.',
    bodyHtml: "I just saw Corr show up online. I don't know who you are, but we need Corr fully operational again.\n" +
      'To do that you\'ll need to update it\'s hardware. In the terminal, type <span class="term-cmd">marketplace init</span>.\n' +
      'This will give you access to the marketplace.',
  });
}

const EMAIL_TRIGGERS = {
  [CORR_EMAIL]: handleCorrFirstReply,
};

function buyPart(partId) {
  const part = PARTS.find((p) => p.id === partId);
  if (!part || state.ownedPartIds.includes(partId) || state.coins < part.cost) return;
  state.coins -= part.cost;
  state.ownedPartIds.push(partId);
  recalcStats();
  renderAll();
}

function isHackUnlocked(hack, s) {
  if (hack.unlock.type === 'corrOnline') return s.corrOnline;
  return false;
}

function hackLabel(hack) {
  return `${hack.name} (${formatDuration(hack.durationMs / 1000)})`;
}

function startHack(hackId) {
  const hack = HACKS.find((h) => h.id === hackId);
  if (!hack || !isHackUnlocked(hack, state) || state.hacking[hackId]) return;
  state.hacking[hackId] = { status: 'active', startedAt: Date.now() };
  saveState();
  setTimeout(() => resolveHack(hackId), hack.durationMs);
  renderAll();
}

// STUB: real hacking minigame plugs in here later. For now every hack
// guaranteed-succeeds after a fixed delay, independent of Corr's power.
// startHack/resolveHack don't know this is a stub, so swapping this
// function's body out later won't touch their calling contract.
function resolveHackOutcome(hack, s) {
  return { success: true };
}

function resolveHack(hackId) {
  const hack = HACKS.find((h) => h.id === hackId);
  const progress = state.hacking[hackId];
  if (!hack || !progress || progress.status !== 'active') return;

  const outcome = resolveHackOutcome(hack, state);
  progress.status = 'completed';
  if (outcome.success) deliverReward(hack.reward);
  renderAll();
}

function deliverReward(reward) {
  if (reward.type === 'coins') {
    state.coins += reward.amount;
  } else if (reward.type === 'part') {
    if (!state.ownedPartIds.includes(reward.partId)) {
      state.ownedPartIds.push(reward.partId);
      recalcStats();
    }
  } else if (reward.type === 'algorithm') {
    if (!state.ownedAlgorithmIds.includes(reward.algorithmId)) {
      state.ownedAlgorithmIds.push(reward.algorithmId);
      recalcStats();
    }
  } else if (reward.type === 'contact') {
    pushEmail({
      folder: 'inbox',
      from: reward.name,
      fromEmail: reward.email,
      to: 'you@corrmail.io',
      subject: reward.subject,
      body: reward.body,
    });
  } else if (reward.type === 'story') {
    pushEmail({
      folder: 'inbox',
      from: reward.from || 'Corr',
      fromEmail: reward.fromEmail || CORR_EMAIL,
      to: 'you@corrmail.io',
      subject: reward.subject,
      body: reward.body,
    });
  }
}

function resumeActiveHacks() {
  Object.keys(state.hacking).forEach((hackId) => {
    const progress = state.hacking[hackId];
    const hack = HACKS.find((h) => h.id === hackId);
    if (!hack || progress.status !== 'active') return;

    const remaining = progress.startedAt + hack.durationMs - Date.now();
    if (remaining <= 0) {
      resolveHack(hackId);
    } else {
      setTimeout(() => resolveHack(hackId), remaining);
    }
  });
}

function tick() {
  const now = Date.now();
  const deltaSec = (now - tick.lastTs) / 1000;
  tick.lastTs = now;
  if (state.miningActive) {
    state.coins += state.miningRate * deltaSec;
    updateCoinDisplay();
    // Corr Status and Marketplace both show/depend on the live CorrCoin
    // total — keep them current while parked on either tab instead of only
    // refreshing on the next full render (e.g. a Buy button should enable
    // itself the instant the player can afford it, not on their next click).
    if (state.activeTab === 'status') renderStatusPanel();
    if (state.activeTab === 'marketplace') renderMarketplacePanel();
  }
}
tick.lastTs = Date.now();

function updateCoinDisplay() {
  coinBalanceEl.textContent = state.miningActive ? `${formatCoins(state.coins)} CorrCoin` : '— CorrCoin';
}

function renderNav() {
  navEl.innerHTML = '';
  NAV_TABS.forEach((tab) => {
    const locked = tab.gate && !state[tab.gate];
    const unread = tab.id === 'inbox' ? state.emails.filter((e) => e.folder === 'inbox' && !e.read).length : 0;
    // Terminal is a floating overlay, not a panel tied to state.activeTab —
    // its "active" look reflects whether the overlay is open, not which
    // underlying panel is showing.
    const isActive = tab.id === 'terminal' ? terminalOverlay.classList.contains('open') : tab.id === state.activeTab;
    const div = document.createElement('div');
    div.className = 'nav-item'
      + (isActive ? ' active' : '')
      + (unread ? ' unread' : '')
      + (locked ? ' locked' : '');
    div.innerHTML = `<span>${tab.label}</span>` + (unread ? `<span class="count">${unread}</span>` : '');
    div.addEventListener('click', () => {
      if (locked) return;
      if (tab.id === 'terminal') {
        openTerminal();
        return;
      }
      state.activeTab = tab.id;
      if (tab.id === 'inbox' || tab.id === 'trash') {
        const top = visibleEmails()[0];
        selectedId = top ? top.id : null;
        if (top) markEmailRead(top);
      } else {
        selectedId = null;
      }
      renderAll();
    });
    navEl.appendChild(div);
  });
}

function renderList() {
  const list = visibleEmails();
  listEl.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No messages here.';
    listEl.appendChild(empty);
    return;
  }

  list.forEach((e) => {
    const row = document.createElement('div');
    row.className = 'msg' + (!e.read ? ' unread' : '') + (e.id === selectedId ? ' selected' : '');
    row.innerHTML = `
      <div class="dot"></div>
      <div class="meta">
        <div class="row1"><span class="sender">${escapeHtml(e.from)}</span><span class="time">${escapeHtml(formatRelativeTime(e.timestamp))}</span></div>
        <div class="subject">${escapeHtml(e.subject)}</div>
        <div class="snippet">${escapeHtml(e.body.slice(0, 60).replace(/\n/g, ' '))}</div>
      </div>
    `;
    row.addEventListener('click', () => {
      selectedId = e.id;
      markEmailRead(e);
      renderAll();
    });
    listEl.appendChild(row);
  });
}

function renderReading() {
  const e = state.emails.find((m) => m.id === selectedId);
  if (!e) {
    readingEl.innerHTML = '<div class="placeholder">Select a message to read it.</div>';
    return;
  }

  const isTrash = e.folder === 'trash';
  const actionsHtml = isTrash
    ? `<button id="act-restore" class="primary">Restore</button><button id="act-delete" class="danger">Delete Forever</button>`
    : `<button id="act-reply" class="primary">Reply</button><button id="act-trash">Move to Trash</button>`;

  readingEl.innerHTML = `
    <h2>${escapeHtml(e.subject)}</h2>
    <div class="headers">
      <div>
        <div class="from">${escapeHtml(e.from)} &lt;${escapeHtml(e.fromEmail)}&gt;</div>
        <div class="to">to ${escapeHtml(e.to)}</div>
      </div>
      <div class="date">${escapeHtml(formatRelativeTime(e.timestamp))}</div>
    </div>
    <div class="content">${e.bodyHtml || escapeHtml(e.body)}</div>
    <div class="actions">${actionsHtml}</div>
  `;

  if (isTrash) {
    readingEl.querySelector('#act-restore').addEventListener('click', () => restoreFromTrash(e.id));
    readingEl.querySelector('#act-delete').addEventListener('click', () => deleteForever(e.id));
  } else {
    readingEl.querySelector('#act-reply').addEventListener('click', () => openCompose({
      to: e.fromEmail,
      subject: e.subject.startsWith('Re:') ? e.subject : `Re: ${e.subject}`,
      body: '',
    }));
    readingEl.querySelector('#act-trash').addEventListener('click', () => moveToTrash(e.id));
  }
}

// 10-square meter next to each Hardware row. Today it's just "has a part
// installed or doesn't" (1/10 vs 0/10) — a placeholder for a real per-part
// power tier later, once parts vary in strength within a category.
function powerSquaresHtml(filledCount) {
  const squares = Array.from({ length: 10 }, (_, i) =>
    `<span class="power-square${i < filledCount ? ' filled' : ''}"></span>`
  ).join('');
  return `<span class="power-squares">${squares}</span>`;
}

function renderStatusPanel() {
  const ownedParts = state.ownedPartIds.map((id) => PARTS.find((p) => p.id === id)).filter(Boolean);
  const ownedAlgorithms = state.ownedAlgorithmIds.map((id) => ALGORITHMS.find((a) => a.id === id)).filter(Boolean);

  // Purchased upgrades replace the default line in their category instead
  // of just stacking alongside it (buying a new PSU means Corr has one
  // power supply, not two).
  const hardwareByCategory = { ...DEFAULT_HARDWARE };
  ownedParts.forEach((p) => { hardwareByCategory[p.category] = p.hardwareValue; });
  const partsHtml = Object.entries(hardwareByCategory)
    .map(([category, value]) => {
      const hasPart = value.toLowerCase() !== 'none';
      const filled = hasPart ? 1 : 0;
      return `<div class="stat-row">` +
        `<span>${escapeHtml(HARDWARE_LABELS[category] || category)}: ${escapeHtml(value)}</span>` +
        `<span class="power-meter">${powerSquaresHtml(filled)}<span class="power-score">${filled}/10</span></span>` +
        `</div>`;
    })
    .join('');

  const algosHtml = ownedAlgorithms.length
    ? ownedAlgorithms.map((a) => `<div class="stat-row"><span>${escapeHtml(a.name)}</span></div>`).join('')
    : '<div class="stat-row muted">No algorithms learned yet.</div>';

  readingEl.innerHTML = `
    <h2>Corr Status</h2>
    <div class="panel-section">
      <div class="stat-row"><span>CorrCoin</span><span>${formatCoins(state.coins)}</span></div>
      <div class="stat-row"><span>Mining rate</span><span>${state.miningRate.toFixed(2)}/sec</span></div>
      <div class="stat-row"><span>Power</span><span>${state.power}</span></div>
    </div>
    <div class="panel-section">
      <h3>Hardware</h3>
      ${partsHtml}
    </div>
    <div class="panel-section">
      <h3>Algorithms</h3>
      ${algosHtml}
    </div>
  `;
}

function renderMarketplacePanel() {
  const rowsHtml = PARTS.map((part) => {
    const owned = state.ownedPartIds.includes(part.id);
    const canAfford = state.coins >= part.cost;
    const effectParts = [];
    if (part.effect.miningRate) effectParts.push(`+${part.effect.miningRate.toFixed(2)}/sec mining`);
    if (part.effect.power) effectParts.push(`+${part.effect.power} power`);

    const buttonHtml = owned
      ? `<button disabled>Installed</button>`
      : `<button class="primary" data-part-id="${part.id}"${canAfford ? '' : ' disabled'}>Buy (${formatCoins(part.cost)})</button>`;

    return `
      <div class="market-row">
        <div>
          <div class="market-name">${escapeHtml(part.name)}</div>
          <div class="market-effect">${escapeHtml(effectParts.join(', '))}</div>
        </div>
        ${buttonHtml}
      </div>
    `;
  }).join('');

  readingEl.innerHTML = `
    <h2>Marketplace</h2>
    <div class="panel-section">${rowsHtml}</div>
  `;

  readingEl.querySelectorAll('[data-part-id]').forEach((btn) => {
    btn.addEventListener('click', () => buyPart(btn.dataset.partId));
  });
}

function renderHackingPanel() {
  const rowsHtml = HACKS.map((hack) => {
    const unlocked = isHackUnlocked(hack, state);
    if (!unlocked) {
      return `
        <div class="hack-row locked">
          <div>
            <div class="hack-name">???</div>
            <div class="hack-desc">Not yet discovered.</div>
          </div>
        </div>
      `;
    }

    const progress = state.hacking[hack.id];
    let actionHtml;
    if (progress && progress.status === 'completed') {
      actionHtml = `<button disabled>Completed</button>`;
    } else if (progress && progress.status === 'active') {
      actionHtml = `<button class="progress-btn" disabled><span class="fill" id="hack-fill-${hack.id}"></span><span class="label">Hacking…</span></button>`;
    } else {
      actionHtml = `<button class="primary" data-hack-id="${hack.id}">${escapeHtml(hackLabel(hack))}</button>`;
    }

    return `
      <div class="hack-row">
        <div>
          <div class="hack-name">${escapeHtml(hack.name)}</div>
          <div class="hack-desc">${escapeHtml(hack.description)}</div>
        </div>
        ${actionHtml}
      </div>
    `;
  }).join('');

  readingEl.innerHTML = `
    <h2>Hacking</h2>
    <div class="panel-section">${rowsHtml}</div>
  `;

  readingEl.querySelectorAll('[data-hack-id]').forEach((btn) => {
    btn.addEventListener('click', () => startHack(btn.dataset.hackId));
  });

  HACKS.forEach((hack) => {
    const progress = state.hacking[hack.id];
    if (progress && progress.status === 'active') {
      animateFill(`hack-fill-${hack.id}`, progress.startedAt, hack.durationMs);
    }
  });
}

function renderAll() {
  renderNav();

  const isMailTab = state.activeTab === 'inbox' || state.activeTab === 'trash';
  listEl.classList.toggle('hidden', !isMailTab);

  if (isMailTab) {
    renderList();
    renderReading();
  } else if (state.activeTab === 'status') {
    renderStatusPanel();
  } else if (state.activeTab === 'marketplace') {
    renderMarketplacePanel();
  } else if (state.activeTab === 'hacking') {
    renderHackingPanel();
  }

  updateCoinDisplay();
  saveState();
}

function openCompose({ to = '', subject = '', body = '' } = {}) {
  composeTo.value = to;
  composeSubject.value = subject;
  composeBody.value = body;
  composeOverlay.classList.add('open');
  composeTo.focus();
}

function closeCompose() {
  composeOverlay.classList.remove('open');
}

document.getElementById('compose-btn').addEventListener('click', () => openCompose());
document.getElementById('compose-close').addEventListener('click', closeCompose);
document.getElementById('compose-cancel').addEventListener('click', closeCompose);
composeOverlay.addEventListener('click', (evt) => {
  if (evt.target === composeOverlay) closeCompose();
});

// Output buffer persists for the page session (not saved to localStorage —
// it's UI scrollback, not game state) until the player types "clear". Each
// line is { text, isError } so error output can be styled red.
let terminalLines = [
  { text: 'corr terminal' },
  { text: '------------------' },
];

function renderTerminal() {
  terminalOutputEl.innerHTML = terminalLines
    .map((line) => `<div${line.isError ? ' class="error"' : ''}>${escapeHtml(line.text)}</div>`)
    .join('');
  terminalBodyEl.scrollTop = terminalBodyEl.scrollHeight;
}

function runTerminalCommand(raw) {
  const command = raw.trim();

  if (command.toLowerCase() === 'clear') {
    terminalLines = [];
    renderTerminal();
    return;
  }

  terminalLines.push({ text: `> ${command}` });
  if (command !== '') {
    const handler = TERMINAL_COMMANDS[command.toLowerCase()];
    if (handler) {
      (handler() || []).forEach((text) => terminalLines.push({ text }));
    } else {
      terminalLines.push({ text: `command not found: ${command}`, isError: true });
    }
  }
  renderTerminal();
}

// Purely a UI overlay — never touches state.activeTab/selectedId, so
// whatever panel was showing underneath is untouched when it closes.
function openTerminal() {
  terminalOverlay.classList.add('open');
  renderTerminal();
  terminalInputEl.focus();
  renderNav();
}

function closeTerminal() {
  terminalOverlay.classList.remove('open');
  renderNav();
}

terminalCloseBtn.addEventListener('click', closeTerminal);
terminalOverlay.addEventListener('click', (evt) => {
  if (evt.target === terminalOverlay) closeTerminal();
});
terminalWindowEl.addEventListener('click', () => terminalInputEl.focus());

// Drag by the titlebar (anywhere except the close button). The window
// starts centered via left/top:50% + transform; the first drag pins it to
// its current on-screen position in plain pixels so the rest of the drag
// is a simple mouse-offset follow.
let terminalDragOffsetX = 0;
let terminalDragOffsetY = 0;
let terminalDragging = false;

terminalTitlebarEl.addEventListener('mousedown', (evt) => {
  if (evt.target === terminalCloseBtn) return;
  const rect = terminalWindowEl.getBoundingClientRect();
  terminalDragOffsetX = evt.clientX - rect.left;
  terminalDragOffsetY = evt.clientY - rect.top;
  terminalWindowEl.style.left = `${rect.left}px`;
  terminalWindowEl.style.top = `${rect.top}px`;
  terminalWindowEl.style.transform = 'none';
  terminalDragging = true;
  terminalTitlebarEl.classList.add('dragging');
  evt.preventDefault();
});

document.addEventListener('mousemove', (evt) => {
  if (!terminalDragging) return;
  terminalWindowEl.style.left = `${evt.clientX - terminalDragOffsetX}px`;
  terminalWindowEl.style.top = `${evt.clientY - terminalDragOffsetY}px`;
});

document.addEventListener('mouseup', () => {
  terminalDragging = false;
  terminalTitlebarEl.classList.remove('dragging');
});
terminalInputEl.addEventListener('keydown', (evt) => {
  if (evt.key !== 'Enter') return;
  const value = terminalInputEl.value;
  terminalInputEl.value = '';
  runTerminalCommand(value);
});

document.getElementById('compose-send').addEventListener('click', () => {
  const to = composeTo.value.trim();
  const subject = composeSubject.value.trim();
  if (!to || !subject) return;

  const trigger = EMAIL_TRIGGERS[to.toLowerCase()];
  closeCompose();
  if (trigger) trigger();
});

searchEl.addEventListener('input', () => {
  const isMailTab = state.activeTab === 'inbox' || state.activeTab === 'trash';
  if (isMailTab) renderList();
});

// Reset requires clicking twice — avoids a native confirm() dialog (which
// would look out of place and block the page) while still guarding against
// an accidental single click wiping all progress.
let resetArmed = false;

function closeSettingsMenu() {
  settingsMenu.classList.add('hidden');
  resetArmed = false;
  resetGameBtn.textContent = 'Reset Game';
}

settingsBtn.addEventListener('click', (evt) => {
  evt.stopPropagation();
  const wasHidden = settingsMenu.classList.contains('hidden');
  closeSettingsMenu();
  if (wasHidden) settingsMenu.classList.remove('hidden');
});

document.addEventListener('click', (evt) => {
  if (!settingsMenu.classList.contains('hidden') && !settingsMenu.contains(evt.target) && evt.target !== settingsBtn) {
    closeSettingsMenu();
  }
});

resetGameBtn.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    resetGameBtn.textContent = 'Click again to confirm';
    return;
  }
  localStorage.removeItem(SAVE_KEY);
  state = defaultState();
  selectedId = null;
  closeSettingsMenu();
  renderAll();
});

setInterval(tick, 100);
setInterval(saveState, 5000);
window.addEventListener('beforeunload', saveState);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveState();
});

resumeActiveHacks();
renderAll();
