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
const SAVE_VERSION = 5;

const CORR_EMAIL = 'corr@corrmail.local';
const NAT_EMAIL = 'nat@corrmail.remote';
const HALLIDAY_EMAIL = 'halliday@corrmail.remote';

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

// Corr's starting hardware — tier 1 of every category, pre-owned and never
// for sale in the Marketplace (see PARTS below). Always shown in Corr
// Status from the moment it's unlocked, keyed by category so a purchased
// PARTS upgrade in the same category replaces its line instead of piling
// up alongside it. cpu/ram/motherboard/psu/storage/gpu are all real
// starting hardware now — network is the one category Corr genuinely
// doesn't have yet, since getting a network card at all is a story beat
// (see "Network Card" section in DESIGN.md), not a purchase.
const DEFAULT_HARDWARE = {
  cpu: 'Intel 486DX2 66MHz',
  ram: '8MB',
  motherboard: 'AT Motherboard (1993)',
  psu: '200W AT',
  storage: '340MB IDE Hard Drive',
  gpu: 'S3 Trio64',
  network: 'none',
};

// Per-category CorrPower growth rate — each tier's multiplier is
// growth^(tier-1), so tier 1 is always 1x (power-neutral, matches
// DEFAULT_HARDWARE) and gains start at tier 2. Deliberately not uniform:
// CPU/GPU/RAM are the "exciting" upgrade categories and compound faster
// than Motherboard/PSU/Storage. Network Card has no entry here — it's
// never purchased, so it has no cost/multiplier curve to derive.
const HARDWARE_GROWTH = {
  cpu: 5,
  gpu: 4,
  ram: 3,
  motherboard: 2,
  psu: 2,
  storage: 2,
};

// Highest tier each category can reach. PARTS only ever contains tiers
// 2..max for the six purchasable categories; Network Card's cap exists
// for NETWORK_TIERS/display purposes even though it's never bought.
// Every purchasable category caps at 10 — Network Card is the only
// category with a shorter ladder, since it's a story-progression item
// rather than a normal Marketplace upgrade (see DESIGN.md).
const HARDWARE_MAX_TIER = {
  cpu: 10,
  ram: 10,
  motherboard: 10,
  gpu: 10,
  psu: 10,
  storage: 10,
  network: 3,
};

// CorrCoin price of each category's tier 2 (its first purchasable tier).
// Higher tiers scale from this via HARDWARE_COST_GROWTH — see
// hardwarePartCost() — rather than being stored per-entry.
const HARDWARE_TIER2_PRICE = {
  cpu: 75,
  gpu: 125,
  ram: 50,
  motherboard: 40,
  storage: 30,
  psu: 10,
};

// Cost growth factor, shared across every category on purpose (see
// DESIGN.md's Marketplace "Pricing" section): buying tier 2 of all six
// categories at once multiplies CorrPower by the product of
// HARDWARE_GROWTH (5×4×3×2×2×2 = 480x), and that same jump repeats every
// round since each category's per-tier growth is a fixed ratio and every
// category now shares the same 10-tier ceiling. 800 sits above that
// breakeven so each round is still a bigger grind than the last, not
// just keeping pace with the income boost it just granted.
const HARDWARE_COST_GROWTH = 800;

function hardwareMultiplier(category, tier) {
  const growth = HARDWARE_GROWTH[category];
  return growth ? Math.pow(growth, tier - 1) : 1;
}

function hardwarePartCost(category, tier) {
  return HARDWARE_TIER2_PRICE[category] * Math.pow(HARDWARE_COST_GROWTH, tier - 2);
}

// Marketplace upgrade catalog — tiers 2 and up only, for the six
// categories that are ever purchasable. Tier 1 of every category is
// DEFAULT_HARDWARE: pre-owned, never for sale. Buying a tier replaces
// whatever tier is currently owned in that category (state.hardwareTiers)
// rather than stacking. `name` is the shop-listing text; `hardwareValue`
// is what replaces the category's line in Corr Status once owned.
const PARTS = [
  { category: 'cpu', tier: 2, name: 'Intel Pentium 100MHz CPU', hardwareValue: 'Intel Pentium 100MHz' },
  { category: 'cpu', tier: 3, name: 'Intel Pentium II 300MHz CPU', hardwareValue: 'Pentium II 300MHz' },
  { category: 'cpu', tier: 4, name: 'Intel Pentium III 600MHz CPU', hardwareValue: 'Pentium III 600MHz' },
  { category: 'cpu', tier: 5, name: 'AMD Athlon 1.2GHz CPU', hardwareValue: 'AMD Athlon 1.2GHz' },
  { category: 'cpu', tier: 6, name: 'Intel Pentium 4 2.4GHz CPU', hardwareValue: 'Pentium 4 2.4GHz' },
  { category: 'cpu', tier: 7, name: 'Intel Core 2 Duo E6600 CPU', hardwareValue: 'Core 2 Duo E6600' },
  { category: 'cpu', tier: 8, name: 'Intel Core i7-2600K CPU', hardwareValue: 'Core i7-2600K' },
  { category: 'cpu', tier: 9, name: 'AMD Ryzen 9 5950X CPU', hardwareValue: 'Ryzen 9 5950X' },
  { category: 'cpu', tier: 10, name: 'Prototype Neuromorphic Processor', hardwareValue: 'Prototype Neuromorphic Processor' },

  { category: 'ram', tier: 2, name: '32MB RAM Upgrade', hardwareValue: '32MB' },
  { category: 'ram', tier: 3, name: '128MB RAM Upgrade', hardwareValue: '128MB' },
  { category: 'ram', tier: 4, name: '512MB RAM Upgrade', hardwareValue: '512MB' },
  { category: 'ram', tier: 5, name: '2GB RAM Upgrade', hardwareValue: '2GB' },
  { category: 'ram', tier: 6, name: '8GB RAM Upgrade', hardwareValue: '8GB' },
  { category: 'ram', tier: 7, name: '16GB RAM Upgrade', hardwareValue: '16GB' },
  { category: 'ram', tier: 8, name: '32GB ECC RAM Upgrade', hardwareValue: '32GB ECC' },
  { category: 'ram', tier: 9, name: '1TB Distributed Memory Cluster', hardwareValue: '1TB Distributed Memory Cluster' },
  { category: 'ram', tier: 10, name: 'Experimental Photonic Memory', hardwareValue: 'Experimental Photonic Memory' },

  { category: 'motherboard', tier: 2, name: 'ATX Motherboard (1997)', hardwareValue: 'ATX Motherboard (1997)' },
  { category: 'motherboard', tier: 3, name: 'Socket 370 Motherboard (1999)', hardwareValue: 'Socket 370 (1999)' },
  { category: 'motherboard', tier: 4, name: 'Socket 478 Motherboard (2002)', hardwareValue: 'Socket 478 (2002)' },
  { category: 'motherboard', tier: 5, name: 'LGA775 Motherboard (2005)', hardwareValue: 'LGA775 (2005)' },
  { category: 'motherboard', tier: 6, name: 'LGA1156 Motherboard (2009)', hardwareValue: 'LGA1156 (2009)' },
  { category: 'motherboard', tier: 7, name: 'AM4 Motherboard (2017)', hardwareValue: 'AM4 (2017)' },
  { category: 'motherboard', tier: 8, name: 'LGA1700 Motherboard (2021)', hardwareValue: 'LGA1700 (2021)' },
  { category: 'motherboard', tier: 9, name: 'Custom Server Backplane', hardwareValue: 'Custom Server Backplane' },
  { category: 'motherboard', tier: 10, name: 'Fabricated Prototype Board', hardwareValue: 'Fabricated Prototype Board — No Manufacturer Listed' },

  { category: 'gpu', tier: 2, name: '3dfx Voodoo2 GPU', hardwareValue: 'Voodoo2' },
  { category: 'gpu', tier: 3, name: 'NVIDIA GeForce 256 GPU', hardwareValue: 'GeForce 256' },
  { category: 'gpu', tier: 4, name: 'NVIDIA GeForce FX 5900 GPU', hardwareValue: 'GeForce FX 5900' },
  { category: 'gpu', tier: 5, name: 'NVIDIA GeForce 8800 GTX GPU', hardwareValue: 'GeForce 8800 GTX' },
  { category: 'gpu', tier: 6, name: 'NVIDIA GeForce GTX 580 GPU', hardwareValue: 'GeForce GTX 580' },
  { category: 'gpu', tier: 7, name: 'NVIDIA GTX 1080 Ti GPU', hardwareValue: 'GTX 1080 Ti' },
  { category: 'gpu', tier: 8, name: 'NVIDIA RTX 3090 GPU', hardwareValue: 'RTX 3090' },
  { category: 'gpu', tier: 9, name: 'Distributed Mining Rig (12x cards)', hardwareValue: 'Distributed Mining Rig (12x)' },
  { category: 'gpu', tier: 10, name: 'Custom ASIC Cluster', hardwareValue: 'Custom ASIC Cluster' },

  { category: 'psu', tier: 2, name: '300W ATX Power Supply', hardwareValue: '300W ATX' },
  { category: 'psu', tier: 3, name: '550W ATX Power Supply', hardwareValue: '550W ATX' },
  { category: 'psu', tier: 4, name: '850W Modular Power Supply', hardwareValue: '850W Modular' },
  { category: 'psu', tier: 5, name: '1200W Server Power Supply', hardwareValue: '1200W Server' },
  { category: 'psu', tier: 6, name: '1600W Titanium Power Supply', hardwareValue: '1600W Titanium' },
  { category: 'psu', tier: 7, name: 'Dual 2000W Redundant Power Supply', hardwareValue: 'Dual 2000W Redundant' },
  { category: 'psu', tier: 8, name: 'Liquid-Cooled 3000W Power Supply', hardwareValue: 'Liquid-Cooled 3000W' },
  { category: 'psu', tier: 9, name: 'Experimental Zero-Point Power Tap', hardwareValue: 'Zero-Point Power Tap' },
  { category: 'psu', tier: 10, name: 'Fusion-Cell Power Cell', hardwareValue: 'Fusion-Cell Power Cell' },

  { category: 'storage', tier: 2, name: '2GB IDE Hard Drive', hardwareValue: '2GB IDE Hard Drive' },
  { category: 'storage', tier: 3, name: '40GB IDE Hard Drive', hardwareValue: '40GB IDE' },
  { category: 'storage', tier: 4, name: '500GB SATA Hard Drive', hardwareValue: '500GB SATA' },
  { category: 'storage', tier: 5, name: '2TB SSD Array', hardwareValue: '2TB SSD Array' },
  { category: 'storage', tier: 6, name: '8TB NVMe Array', hardwareValue: '8TB NVMe Array' },
  { category: 'storage', tier: 7, name: '100TB Distributed Storage Cluster', hardwareValue: '100TB Distributed Cluster' },
  { category: 'storage', tier: 8, name: '1PB Holographic Storage', hardwareValue: '1PB Holographic Storage' },
  { category: 'storage', tier: 9, name: 'Quantum Dot Storage Matrix', hardwareValue: 'Quantum Dot Matrix' },
  { category: 'storage', tier: 10, name: 'Exabyte Crystal Storage Lattice', hardwareValue: 'Exabyte Crystal Storage Lattice' },
];

// Network Card tiers — name-only lookup, not a PARTS-style catalog, since
// Network Card is never bought with CorrCoin (see DESIGN.md). Tier 1
// unlocks Hacking and has to arrive via a story/terminal trigger, not a
// hack reward (Hacking isn't unlocked yet to grant one from); where tiers
// 2-3 come from isn't decided yet.
const NETWORK_TIERS = {
  1: '56k Dial-Up Modem',
  2: 'Cable Modem / DSL Router',
  3: 'Fiber Uplink — Dedicated Line',
};

// Hacking rewards/purchases only ever grant algorithms, never contribute
// to CorrPower directly — per HACKING_DESIGN.md, algorithms are consumed
// as actions during a hack attempt (basePower/actionCost), not a passive
// stat bonus like hardware. No seed content grants one yet.
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
    reward: { type: 'part', category: 'psu', tier: 2 },
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
    corrPower: 1,
    hardwareTiers: { cpu: 1, ram: 1, motherboard: 1, gpu: 1, psu: 1, storage: 1, network: 0 },
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

// Hardware costs and CorrPower reach into the septillions by late tiers
// (see DESIGN.md's Marketplace "Pricing" section) — plain toFixed() would
// print 20+ digit strings, so anything ≥1000 gets a short-scale suffix
// instead.
const NUMBER_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qd', 'Qn', 'Sx', 'Sp', 'Oc', 'No'];

function formatCoins(n) {
  if (n < 1000) return n.toFixed(1);
  const tier = Math.min(Math.floor(Math.log10(n) / 3), NUMBER_SUFFIXES.length - 1);
  return `${(n / Math.pow(1000, tier)).toFixed(2)}${NUMBER_SUFFIXES[tier]}`;
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

// CorrPower is the product of every purchasable category's current
// multiplier (Network Card excluded — it's never purchased, so it never
// factors into CorrPower). It scales CorrCoin mining speed directly; see
// HACKING_DESIGN.md for its other job (hacking effectiveness, not yet
// wired up).
function recalcStats() {
  let corrPower = 1;
  Object.keys(HARDWARE_GROWTH).forEach((category) => {
    const tier = state.hardwareTiers[category] || 1;
    corrPower *= hardwareMultiplier(category, tier);
  });

  state.corrPower = corrPower;
  state.miningRate = state.baseMiningRate * corrPower;
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
    from: 'Halliday',
    fromEmail: HALLIDAY_EMAIL,
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

function buyPart(category) {
  const maxTier = HARDWARE_MAX_TIER[category];
  const nextTier = (state.hardwareTiers[category] || 1) + 1;
  if (!maxTier || nextTier > maxTier) return;
  const cost = hardwarePartCost(category, nextTier);
  if (state.coins < cost) return;
  state.coins -= cost;
  state.hardwareTiers[category] = nextTier;
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
    const current = state.hardwareTiers[reward.category] || 1;
    if (reward.tier > current) {
      state.hardwareTiers[reward.category] = reward.tier;
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
    // #reading itself (its HTML) only gets rebuilt on a nav click or a
    // state-changing action (buy, hack start/resolve, etc.), not on every
    // 100ms tick — rebuilding it continuously was what raced with clicks
    // (see game history). updateMarketplaceAffordability() is the
    // exception: it only flips `disabled` on buttons that already exist,
    // never replaces them, so it's safe to run every tick.
    updateMarketplaceAffordability();
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

// Box count is per-category (HARDWARE_MAX_TIER) rather than a hardcoded
// 10 — every purchasable category is 10 tiers now, but Network Card
// caps at 3, so this still needs to size itself per category rather
// than assume 10. Filling by the literal tier number means tier 1 is
// always "1 filled box," full stop, regardless of category.
function powerSquaresHtml(filledCount, totalCount) {
  const squares = Array.from({ length: totalCount }, (_, i) =>
    `<span class="power-square${i < filledCount ? ' filled' : ''}"></span>`
  ).join('');
  return `<span class="power-squares">${squares}</span>`;
}

// Tier 1 of every purchasable category is DEFAULT_HARDWARE — the
// tier>=2 case only applies to categories with real PARTS entries.
// Network Card (no PARTS entries, tier can be 0 meaning no card yet)
// looks itself up in NETWORK_TIERS instead.
function hardwareDisplayName(category, tier) {
  if (category === 'network') return tier > 0 ? NETWORK_TIERS[tier] : 'none';
  if (tier <= 1) return DEFAULT_HARDWARE[category];
  const part = PARTS.find((p) => p.category === category && p.tier === tier);
  return part ? part.hardwareValue : DEFAULT_HARDWARE[category];
}

function renderStatusPanel() {
  const ownedAlgorithms = state.ownedAlgorithmIds.map((id) => ALGORITHMS.find((a) => a.id === id)).filter(Boolean);

  const partsHtml = Object.keys(HARDWARE_LABELS)
    .map((category) => {
      const tier = state.hardwareTiers[category] || 0;
      const value = hardwareDisplayName(category, tier);
      const multiplier = hardwareMultiplier(category, tier);
      const maxTier = HARDWARE_MAX_TIER[category];
      return `<div class="stat-row">` +
        `<span>${escapeHtml(HARDWARE_LABELS[category])}: ${escapeHtml(value)}</span>` +
        `<span class="power-meter">${powerSquaresHtml(tier, maxTier)}<span class="power-score">${formatCoins(multiplier)}x</span></span>` +
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
      <div class="stat-row"><span>CorrCoin mining rate</span><span>${formatCoins(state.miningRate)}/sec</span></div>
      <div class="stat-row"><span>CorrPower</span><span>${formatCoins(state.corrPower)}x</span></div>
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

// One row per purchasable category (Network Card excluded — never sold
// here), showing what's currently installed and a Buy button for the
// next tier, rather than one row per PARTS entry — buying replaces the
// category's tier, it isn't a checklist of individual items.
function renderMarketplacePanel() {
  const rowsHtml = Object.keys(HARDWARE_GROWTH).map((category) => {
    const currentTier = state.hardwareTiers[category] || 1;
    const maxTier = HARDWARE_MAX_TIER[category];
    const currentName = hardwareDisplayName(category, currentTier);
    const currentMultiplier = hardwareMultiplier(category, currentTier);

    let buttonHtml;
    if (currentTier >= maxTier) {
      buttonHtml = `<button disabled>Maxed</button>`;
    } else {
      const nextTier = currentTier + 1;
      const cost = hardwarePartCost(category, nextTier);
      const canAfford = state.coins >= cost;
      buttonHtml = `<button class="primary" data-category="${category}"${canAfford ? '' : ' disabled'}>` +
        `Buy (${formatCoins(cost)}) — ${hardwareMultiplier(category, nextTier)}x</button>`;
    }

    return `
      <div class="market-row">
        <div>
          <div class="market-name">${escapeHtml(HARDWARE_LABELS[category])}: ${escapeHtml(currentName)}</div>
          <div class="market-effect">${formatCoins(currentMultiplier)}x CorrPower</div>
        </div>
        ${buttonHtml}
      </div>
    `;
  }).join('');

  readingEl.innerHTML = `
    <h2>Marketplace</h2>
    <div class="panel-section">${rowsHtml}</div>
  `;

  readingEl.querySelectorAll('[data-category]').forEach((btn) => {
    btn.addEventListener('click', () => buyPart(btn.dataset.category));
  });
}

// Toggles each existing Buy button's `disabled` state as CorrCoin accrues,
// without rebuilding the DOM — a full renderMarketplacePanel() every tick
// was tried first, but replacing the buttons out from under an in-flight
// click was the cause of a real bug (see game history), so this only ever
// flips a boolean on nodes that already exist. "Maxed" buttons have no
// data-category and are skipped, same as buyPart() ignores that category.
function updateMarketplaceAffordability() {
  if (state.activeTab !== 'marketplace') return;
  readingEl.querySelectorAll('[data-category]').forEach((btn) => {
    const category = btn.dataset.category;
    const nextTier = (state.hardwareTiers[category] || 1) + 1;
    btn.disabled = state.coins < hardwarePartCost(category, nextTier);
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
