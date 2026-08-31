const CYBER_MAIL_SEEDS = [
  {
    id: 'marcus-1',
    subject: "it's been way too long",
    read: true,
    viewed: false,
    thread: [
      {
        self: true,
        from: 'You',
        addr: 'jamie.booker@fernwaymail.com',
        date: '4 months ago',
        body: [
          "Marcus. It's been a long time…years, at this point.",
          "I'm reaching out to ask a favor. Could you help me get a job at Evergreen? I wouldn't be asking, and this will sound weird, but I think this could be the thing that actually helps Jo find closure with Mabel.",
          "You've always been a good friend. The best friend I ever had. It's my fault we lost touch - I'm sorry.",
          "— Jamie",
        ],
      },
      {
        self: false,
        from: 'Marcus Odom',
        addr: 'marcus.odom@evergreenmortal.com',
        date: '4 months ago',
        body: [
          "Jamie. Hey. It's so good to hear from you. And it's not your fault. It's not anyone's fault. It's just good to hear from you.",
          "As for the favor, I'd do anything for Jo. Let me ask around and see what I can do.",
          "— Marcus",
        ],
      },
    ],
  },
  {
    id: 'reese-1',
    subject: 'have you talked to Jo?',
    read: true,
    viewed: false,
    thread: [
      {
        self: true,
        from: 'You',
        addr: 'jamie.booker@fernwaymail.com',
        date: '6 months ago',
        body: [
          "Reese — I don't want to make this bigger than it needs to be, but have you heard from Jo? It's been a while since I have, and I want to rule out that it's nothing before I let myself worry about it being something.",
          "Let me know either way.",
          "— Jamie",
        ],
      },
      {
        self: false,
        from: 'Reese Booker',
        addr: 'reese.booker@fernwaymail.com',
        date: '6 months ago',
        body: [
          "Hi. No, I haven't heard from Jo in months…not a call, not a text. But that's Jo for you, she's always wrapped up in something.",
          "— Reese",
        ],
      },
    ],
  },
  {
    id: 'jo-1',
    subject: 'settled in, mostly',
    read: true,
    viewed: false,
    thread: [
      {
        self: false,
        from: 'Jo Booker',
        addr: 'jo.booker@fernwaymail.com',
        date: '9 months ago',
        body: [
          "Hi — sorry for the radio silence this week, onboarding's been intense. I think this is the place I've been trying to find since Mabel.",
          "I came across something in one of the internal archives that doesn't add up. I won't get into it here, but I want to look into it properly before I say anything more — I'd rather be right than fast. You know how I am.",
          "So don't be surprised if I go quiet for a few weeks. Nothing's wrong, I'm just heads-down.",
          "Talk soon. Love you.",
          "— Jo",
        ],
      },
    ],
  },
];

const SUNITA_ONBOARDING_EMAIL = {
  id: 'sunita-1',
  subject: 'welcome to the team, Jamie!',
  read: false,
  thread: [
    {
      self: false,
      from: 'Sunita Marsh',
      addr: 'sunita.marsh@evergreenmortal.com',
      date: 'Just now',
      body: [
        'Jamie,',
        "Welcome aboard! I'm Sunita, and I'll be your manager here at Evergreen. I wanted to reach out personally before your first day, because I like my team to feel like people, not headcount, from day one.",
        "You'll be starting out working through our intern program, but remember Evergreen only promotes from within and a motivated intern can move up the ladder fast. And there are real perks with each promotion.",
        "For what it's worth, I read through your background before we made the offer. An engineer moving into something like this is unusual, and I mean that as a compliment — we don't get a lot of people who think in systems. I have a feeling you're going to do well here.",
        'See you Monday.',
        '— Sunita',
      ],
    },
  ],
  action: { label: 'Start job at Evergreen', onClick: () => openDesktop() },
};

const EVERGREEN_MAIL_SEEDS = [
  {
    id: 'sunita-2',
    subject: 'your first day',
    read: false,
    viewed: false,
    thread: [
      {
        self: false,
        from: 'Sunita Marsh',
        addr: 'sunita.marsh@evergreenmortal.com',
        date: 'Just now',
        body: [
          "Jamie — welcome to the floor. Take a look around, get settled at your desk.",
          "You'll find the EverSprint software on your computer with your first few tasks already queued up. Open it up to get started.",
          "EverSprint is your home base. It's where you'll do all your work and it's how your performance is tracked. If you keep up with your work, you'll do great here.",
          "If you need anything, my door's always open.",
          "— Sunita",
        ],
      },
    ],
  },
];

// Generic mail-client UI, bound to a root element containing the
// [data-role] structure defined in #tmpl-mail-app (or the static
// Cyber Mail markup, which uses the same data-role names).
function createMailClient(rootEl, config) {
  const { seedEmails, pendingEmail, onChange, autoDeliverOnAllSeedsViewed = true } = config;

  const listEl = rootEl.querySelector('[data-role="email-list"]');
  const detailEmptyEl = rootEl.querySelector('[data-role="detail-empty"]');
  const detailContentEl = rootEl.querySelector('[data-role="detail-content"]');
  const detailSubjectEl = rootEl.querySelector('[data-role="detail-subject"]');
  const detailThreadEl = rootEl.querySelector('[data-role="detail-thread"]');
  const detailActionEl = rootEl.querySelector('[data-role="detail-action"]');

  const inbox = [...seedEmails];
  let selectedId = null;
  let pendingDelivered = !!config.initialPendingDelivered;
  if (pendingDelivered && pendingEmail) inbox.unshift(pendingEmail);

  function allSeedsViewed() {
    return seedEmails.every((e) => e.viewed);
  }

  function lastMessage(email) {
    return email.thread[email.thread.length - 1];
  }

  function unreadCount() {
    return inbox.filter((e) => !e.read).length;
  }

  function renderInbox() {
    listEl.innerHTML = '';
    inbox.forEach((email) => {
      const latest = lastMessage(email);
      const li = document.createElement('li');
      li.className = 'email-row'
        + (email.read ? '' : ' unread')
        + (email.justArrived ? ' new-arrival' : '')
        + (email.id === selectedId ? ' selected' : '');
      li.innerHTML = `
        <div class="email-top">
          <span class="email-from">${latest.from}</span>
          <span class="email-date">${latest.date}</span>
        </div>
        <div class="email-subject">${email.subject}</div>
        <div class="email-snippet">${latest.body[0]}</div>
      `;
      li.addEventListener('click', () => openEmail(email.id));
      listEl.appendChild(li);
    });
  }

  function renderDetail(email) {
    detailSubjectEl.textContent = email.subject;
    detailThreadEl.innerHTML = '';
    email.thread.forEach((message) => {
      const msgEl = document.createElement('div');
      msgEl.className = 'thread-message' + (message.self ? ' self' : '');
      msgEl.innerHTML = `
        <div class="thread-meta">
          <div>
            <span class="thread-from-name">${message.from}</span>
            <span class="thread-addr">&lt;${message.addr}&gt;</span>
          </div>
          <div class="thread-date">${message.date}</div>
        </div>
      `;
      message.body.forEach((paragraph) => {
        const p = document.createElement('p');
        p.textContent = paragraph;
        msgEl.appendChild(p);
      });
      detailThreadEl.appendChild(msgEl);
    });

    detailActionEl.innerHTML = '';
    if (email.action) {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.textContent = email.action.label;
      btn.addEventListener('click', () => email.action.onClick());
      detailActionEl.appendChild(btn);
    }

    detailEmptyEl.classList.add('hidden');
    detailContentEl.classList.remove('hidden');
  }

  function deliverPending() {
    if (!pendingEmail || pendingDelivered) return;
    pendingDelivered = true;
    pendingEmail.delivered = true;
    pendingEmail.justArrived = true;
    inbox.unshift(pendingEmail);
    renderInbox();
    if (onChange) onChange();
    saveProgress();
  }

  function openEmail(id) {
    const email = inbox.find((e) => e.id === id);
    email.read = true;
    email.viewed = true;
    email.justArrived = false;
    selectedId = id;
    renderDetail(email);
    renderInbox();
    if (onChange) onChange();
    saveProgress();

    if (autoDeliverOnAllSeedsViewed && allSeedsViewed()) {
      deliverPending();
    }
  }

  renderInbox();

  return { inbox, unreadCount, renderInbox, deliverPending, openEmail };
}

// ---- Progress persistence ----
// Remembers which screen the player is on and which emails have been
// read/viewed, so a page refresh lands back in the same place instead of
// restarting the story. Declared before first use below (loadProgress() is
// called immediately at startup).

const PROGRESS_KEY = 'evergreen-mortal-progress';
let currentScreen = 'cybermail';

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore — start fresh
  }
  return null;
}

function applyProgress(progress) {
  if (!progress) return;
  (progress.cyberMail || []).forEach((saved) => {
    const email = CYBER_MAIL_SEEDS.find((e) => e.id === saved.id);
    if (email) {
      email.read = saved.read;
      email.viewed = saved.viewed;
    }
  });
  if (progress.sunitaRead) SUNITA_ONBOARDING_EMAIL.read = true;
  (progress.evergreenMail || []).forEach((saved) => {
    const email = EVERGREEN_MAIL_SEEDS.find((e) => e.id === saved.id);
    if (email) {
      email.read = saved.read;
      email.viewed = saved.viewed;
    }
  });
}

function saveProgress() {
  const progress = {
    screen: currentScreen,
    cyberMail: CYBER_MAIL_SEEDS.map((e) => ({ id: e.id, read: e.read, viewed: e.viewed })),
    sunitaRead: SUNITA_ONBOARDING_EMAIL.read,
    evergreenMail: EVERGREEN_MAIL_SEEDS.map((e) => ({ id: e.id, read: e.read, viewed: e.viewed })),
  };
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (e) {
    // ignore — progress just won't persist this session
  }
}

const savedProgress = loadProgress();
applyProgress(savedProgress);

const cyberMail = createMailClient(document.getElementById('app'), {
  seedEmails: CYBER_MAIL_SEEDS,
  pendingEmail: SUNITA_ONBOARDING_EMAIL,
  initialPendingDelivered: CYBER_MAIL_SEEDS.every((e) => e.viewed),
});

// Set once the Evergreen Mail window is first built, so the "I'm ready to
// get started" action button (defined earlier, in EVERGREEN_MAIL_SEEDS) can
// call back into this specific client instance.
let evergreenMailClient = null;

function updateMailBadge() {
  const badge = document.getElementById('mail-badge');
  const count = EVERGREEN_MAIL_SEEDS.filter((e) => !e.read).length;
  if (count > 0) {
    badge.textContent = String(count);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function openDesktop() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('desktop-screen').classList.remove('hidden');
  updateMailBadge();
  currentScreen = 'desktop';
  saveProgress();
}

// ---- Window manager ----
// Reusable window chrome (drag / resize / minimize / maximize / close) for
// any desktop app. `openApp(appId, options)` opens a new window the first
// time it's called for a given appId, and simply refocuses/restores it on
// subsequent calls.

const openWindows = {};
let topZIndex = 100;

function createWindow({ appId, title, width, height, x, y, build }) {
  const win = document.createElement('div');
  win.className = 'window';
  win.style.width = width + 'px';
  win.style.height = height + 'px';
  win.style.left = x + 'px';
  win.style.top = y + 'px';
  win.style.zIndex = String(++topZIndex);

  win.innerHTML = `
    <div class="window-titlebar">
      <div class="window-title">${title}</div>
      <div class="window-controls">
        <button class="window-btn minimize" title="Minimize">_</button>
        <button class="window-btn maximize" title="Maximize">□</button>
        <button class="window-btn close" title="Close">×</button>
      </div>
    </div>
    <div class="window-content"></div>
    <div class="window-resize-handle"></div>
  `;

  document.getElementById('desktop-screen').appendChild(win);

  const titlebar = win.querySelector('.window-titlebar');
  const contentEl = win.querySelector('.window-content');
  const resizeHandle = win.querySelector('.window-resize-handle');

  function bringToFront() {
    win.style.zIndex = String(++topZIndex);
  }
  win.addEventListener('mousedown', bringToFront);

  // Dragging
  let dragging = false;
  let dragStartX = 0, dragStartY = 0, winStartX = 0, winStartY = 0;
  titlebar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.window-btn') || win.classList.contains('maximized')) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    winStartX = win.offsetLeft;
    winStartY = win.offsetTop;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    win.style.left = Math.max(0, winStartX + (e.clientX - dragStartX)) + 'px';
    win.style.top = Math.max(0, winStartY + (e.clientY - dragStartY)) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  // Resizing
  let resizing = false;
  let resizeStartX = 0, resizeStartY = 0, startW = 0, startH = 0;
  resizeHandle.addEventListener('mousedown', (e) => {
    if (win.classList.contains('maximized')) return;
    resizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    startW = win.offsetWidth;
    startH = win.offsetHeight;
    bringToFront();
    e.preventDefault();
    e.stopPropagation();
  });
  document.addEventListener('mousemove', (e) => {
    if (!resizing) return;
    win.style.width = Math.max(320, startW + (e.clientX - resizeStartX)) + 'px';
    win.style.height = Math.max(220, startH + (e.clientY - resizeStartY)) + 'px';
  });
  document.addEventListener('mouseup', () => { resizing = false; });

  // Controls
  let maximized = false;
  let restoreBounds = null;

  win.querySelector('.close').addEventListener('click', () => {
    win.remove();
    delete openWindows[appId];
  });

  win.querySelector('.minimize').addEventListener('click', () => {
    win.classList.add('hidden');
  });

  win.querySelector('.maximize').addEventListener('click', () => {
    if (!maximized) {
      restoreBounds = { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height };
      win.classList.add('maximized');
      maximized = true;
    } else {
      win.classList.remove('maximized');
      win.style.left = restoreBounds.left;
      win.style.top = restoreBounds.top;
      win.style.width = restoreBounds.width;
      win.style.height = restoreBounds.height;
      maximized = false;
    }
    bringToFront();
  });

  build(contentEl);

  const controller = {
    el: win,
    restore() {
      win.classList.remove('hidden');
      bringToFront();
    },
    rebuild() {
      contentEl.innerHTML = '';
      build(contentEl);
    },
  };
  openWindows[appId] = controller;
  return controller;
}

// `rebuildOnRestore: true` re-runs `build` every time an already-open
// window is reopened, for apps whose content depends on state that can
// change while the window is closed (e.g. EverSprint's board reflecting
// whether the assignment email has been read yet).
function openApp(appId, options) {
  if (openWindows[appId]) {
    openWindows[appId].restore();
    if (options.rebuildOnRestore) openWindows[appId].rebuild();
    return;
  }
  createWindow({ appId, ...options });
}

function openEvergreenMailApp() {
  openApp('evergreen-mail', {
    title: 'Evergreen Mail',
    width: 1080,
    height: 480,
    x: 140,
    y: 90,
    build: (contentEl) => {
      const tmpl = document.getElementById('tmpl-mail-app');
      contentEl.appendChild(tmpl.content.cloneNode(true));
      evergreenMailClient = createMailClient(contentEl, {
        seedEmails: EVERGREEN_MAIL_SEEDS,
        onChange: updateMailBadge,
      });
    },
  });
}

document.getElementById('icon-mail').addEventListener('click', openEvergreenMailApp);

// ---- EverSprint ----
// The in-game "sprint tracking" app — a kanban board where work tasks are
// rendered as a card battle. Implements the design in evergreen-mortal/DESIGN.md:
// a daily mandatory 3-card Draft, Utility cards with per-card cooldowns and no
// cap on daily activations, passive Daemon cards, a Computer Virus curse that
// punishes declining it, "Draft from N" bonus mini-drafts that can chain, and
// roguelike per-sprint task generation with 12 possible task abilities.
//
// The "your first day" email is what queues up the first sprint's tasks —
// opening EverSprint before reading it just shows an empty board.

// -- Small helpers --

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// -- Card definitions --
// Each of the 40 cards in the design doc's reward pool is a single unique
// entry here (not a stack of copies) — duplicates only happen if the same
// card is rolled as a reward more than once, or (for Computer Virus) via the
// outbreak mechanic. `kind` drives how the engine resolves the effect:
//   'target'      — player picks one eligible task at cast/activation time
//   'target-card' — player picks one eligible Played card
//   everything else ('all' / 'highest' / 'lowest' / 'draft-from' /
//     'play-random' / 'play-all-others' / 'none') resolves immediately with
//     no player choice beyond having picked/activated the card itself
const CARD_DEFS = [
  // -- Common Script (12) --
  {
    id: 'live-patch', name: 'Live Patch', type: 'script', rarity: 'common', kind: 'target',
    description: 'Target task loses 5 severity, then Draft from 3.',
    apply: (taskId) => {
      const t = findTask(taskId);
      if (t) lowerTaskSeverity(t, 5);
      openDraftFrom(3);
    },
  },
  {
    id: 'binary-split', name: 'Binary Split', type: 'script', rarity: 'common', kind: 'target',
    description: "Target task loses half its severity (rounded up).",
    apply: (taskId) => { const t = findTask(taskId); if (t) lowerTaskSeverity(t, Math.ceil(t.severity / 2)); },
  },
  {
    id: 'prefetch', name: 'Prefetch', type: 'script', rarity: 'common', kind: 'draft-from', draftN: 2,
    description: 'Add two new cards to your draft, then select another card to play.',
    apply: () => openDraftFrom(2),
  },
  {
    id: 'refresh-query', name: 'Refresh Query', type: 'script', rarity: 'common', kind: 'draft-from', draftN: 3,
    description: 'Draw a new set of three cards to draft from, then select another card to play.',
    apply: () => openDraftFrom(3),
  },
  {
    id: 'quick-patch', name: 'Quick Patch', type: 'script', rarity: 'common', kind: 'target',
    description: 'Target task loses 15 severity.',
    apply: (taskId) => { const t = findTask(taskId); if (t) lowerTaskSeverity(t, 15); },
  },
  {
    id: 'broadcast-ping', name: 'Broadcast Ping', type: 'script', rarity: 'common', kind: 'all',
    description: 'All tasks lose 5 severity.',
    apply: () => dealDamageToAll(5),
  },
  {
    id: 'deep-scan', name: 'Deep Scan', type: 'script', rarity: 'common', kind: 'draft-from', draftN: 5,
    description: 'Draft from 5 (pick 1 of 5 random cards from your deck to play).',
    apply: () => openDraftFrom(5),
  },
  {
    id: 'cascade-failure', name: 'Cascade Failure', type: 'script', rarity: 'common', kind: 'all',
    description: 'All tasks lose 5 severity for each Activate effect you triggered today.',
    apply: () => dealDamageToAll(5 * sprintState.activationsToday),
  },
  {
    id: 'force-quit', name: 'Force Quit', type: 'script', rarity: 'common', kind: 'target',
    description: 'Finish target task with severity 30 or less.',
    eligibleTask: (t) => t.severity <= 30,
    apply: (taskId) => { const t = findTask(taskId); if (t) finishTaskDirect(t); },
  },
  {
    id: 'kill-top-process', name: 'Kill Top Process', type: 'script', rarity: 'common', kind: 'highest',
    description: 'The task with the highest severity loses 25 severity.',
    apply: () => dealDamageToHighest(25),
  },
  {
    id: 'garbage-collection', name: 'Garbage Collection', type: 'script', rarity: 'common', kind: 'lowest',
    description: 'The task with the lowest severity loses 50 severity.',
    apply: () => dealDamageToLowest(50),
  },
  {
    id: 'buffer-overflow', name: 'Buffer Overflow', type: 'script', rarity: 'common', kind: 'target',
    description: 'Target task with more than 70 severity loses 70 severity.',
    eligibleTask: (t) => t.severity > 70,
    apply: (taskId) => { const t = findTask(taskId); if (t) lowerTaskSeverity(t, 70); },
  },

  // -- Common Utility (8) --
  {
    id: 'debugger', name: 'Debugger', type: 'utility', rarity: 'common', kind: 'target', cooldown: 1,
    description: 'Activate 1: target task loses 5 severity.',
    apply: (taskId) => { const t = findTask(taskId); if (t) lowerTaskSeverity(t, 5); },
  },
  {
    id: 'search-index', name: 'Search Index', type: 'utility', rarity: 'common', kind: 'draft-from', draftN: 2, cooldown: 3,
    description: 'Activate 3: Draft from 2.',
    apply: () => openDraftFrom(2),
  },
  {
    id: 'task-scheduler', name: 'Task Scheduler', type: 'utility', rarity: 'common', kind: 'target-card', cooldown: 1,
    description: 'Activate 1: lower the Activate timer of another card by 1.',
    playedFilter: (c) => CARD_DEFS_BY_ID[c.templateId].type === 'utility' && c.cooldownRemaining > 0,
    apply: (instanceId) => { const c = findPlayed(instanceId); if (c) c.cooldownRemaining = Math.max(0, c.cooldownRemaining - 1); },
  },
  {
    id: 'load-balancer', name: 'Load Balancer', type: 'utility', rarity: 'common', kind: 'all', cooldown: 2,
    description: 'Activate 2: All tasks lose 5 severity.',
    apply: () => dealDamageToAll(5),
  },
  {
    id: 'priority-queue', name: 'Priority Queue', type: 'utility', rarity: 'common', kind: 'highest', cooldown: 2,
    description: 'Activate 2: The task with the highest severity loses 15 severity.',
    apply: () => dealDamageToHighest(15),
  },
  {
    id: 'auto-cleanup', name: 'Auto-Cleanup', type: 'utility', rarity: 'common', kind: 'none', cooldown: 1,
    description: 'Activate 1: Finish all tasks under 10 severity.',
    apply: () => finishAllUnder(10),
  },
  {
    id: 'cron-reset', name: 'Cron Reset', type: 'utility', rarity: 'common', kind: 'none', cooldown: 3,
    description: 'Activate 3: Lower the Activate timer of all cards by 1.',
    apply: () => sprintState.played.forEach((c) => {
      if (CARD_DEFS_BY_ID[c.templateId].type === 'utility') c.cooldownRemaining = Math.max(0, c.cooldownRemaining - 1);
    }),
  },
  {
    id: 'macro-runner', name: 'Macro Runner', type: 'utility', rarity: 'common', kind: 'none', cooldown: 3,
    description: 'Activate 3: Play a random Script card from your deck.',
    apply: () => playRandomFromDeck('script'),
  },

  // -- Common Daemon (4) --
  {
    id: 'background-sync', name: 'Background Sync', type: 'daemon', rarity: 'common', kind: 'daemon',
    description: 'When you Activate a Utility, all tasks lose 2 severity.',
  },
  {
    id: 'signal-amplifier', name: 'Signal Amplifier', type: 'daemon', rarity: 'common', kind: 'daemon',
    description: 'Whenever you lower the severity of a task, lower it by 3 more.',
  },
  {
    id: 'task-manager', name: 'Task Manager', type: 'daemon', rarity: 'common', kind: 'daemon',
    description: 'When you finish a task, Draft from 3.',
  },
  {
    id: 'autoloader', name: 'Autoloader', type: 'daemon', rarity: 'common', kind: 'daemon',
    description: 'When you Draft, add 2 cards to the Draft.',
  },

  // -- Uncommon Script (6) --
  {
    id: 'force-terminate', name: 'Force Terminate', type: 'script', rarity: 'uncommon', kind: 'target',
    description: 'Finish target task with severity 50 or less.',
    eligibleTask: (t) => t.severity <= 50,
    apply: (taskId) => { const t = findTask(taskId); if (t) finishTaskDirect(t); },
  },
  {
    id: 'full-system-scan', name: 'Full System Scan', type: 'script', rarity: 'uncommon', kind: 'all',
    description: 'All tasks lose 1 severity for each card in your deck.',
    apply: () => dealDamageToAll(1 * sprintState.deck.length),
  },
  {
    id: 'hard-reset', name: 'Hard Reset', type: 'script', rarity: 'uncommon', kind: 'none',
    description: 'Lower the Activate timer of all cards to 0.',
    apply: () => sprintState.played.forEach((c) => {
      if (CARD_DEFS_BY_ID[c.templateId].type === 'utility') c.cooldownRemaining = 0;
    }),
  },
  {
    id: 'purge', name: 'Purge', type: 'script', rarity: 'uncommon', kind: 'all',
    description: 'All tasks with more than 50 severity lose 25 severity.',
    apply: () => dealDamageToAll(25, (t) => t.severity > 50),
  },
  {
    id: 'spawn-process', name: 'Spawn Process', type: 'script', rarity: 'uncommon', kind: 'none',
    description: 'Play a random Daemon from your deck.',
    apply: () => playRandomFromDeck('daemon'),
  },
  {
    id: 'auto-install', name: 'Auto-Install', type: 'script', rarity: 'uncommon', kind: 'none',
    description: 'Play a random Utility from your deck.',
    apply: () => playRandomFromDeck('utility'),
  },

  // -- Uncommon Utility (4) --
  {
    id: 'hot-swap', name: 'Hot Swap', type: 'utility', rarity: 'uncommon', kind: 'draft-from', draftN: 3, cooldown: 3,
    description: 'Activate 3: Draft from 3.',
    apply: () => openDraftFrom(3),
  },
  {
    id: 'batch-job', name: 'Batch Job', type: 'utility', rarity: 'uncommon', kind: 'none', cooldown: 4,
    description: 'Activate 4: Play 2 random cards from your deck.',
    apply: () => {
      for (let i = 0; i < 2; i++) {
        if (sprintState.deck.length === 0) break;
        const idx = Math.floor(Math.random() * sprintState.deck.length);
        const [card] = sprintState.deck.splice(idx, 1);
        // Auto-targets the highest-severity eligible task if the drawn card
        // needs a target — with 2 cards resolving at once there's no clean
        // way to prompt for both, so this sidesteps a double-prompt.
        playCardEffect(card, CARD_DEFS_BY_ID[card.templateId], { autoTarget: true });
      }
    },
  },
  {
    id: 'load-shedding', name: 'Load Shedding', type: 'utility', rarity: 'uncommon', kind: 'all', cooldown: 2,
    description: 'Activate 2: Lower the severity of all tasks by 5.',
    apply: () => dealDamageToAll(5),
  },
  {
    id: 'watchdog-timer', name: 'Watchdog Timer', type: 'utility', rarity: 'uncommon', kind: 'highest', cooldown: 1,
    description: 'Activate 1: The task with the highest severity loses 10 severity.',
    apply: () => dealDamageToHighest(10),
  },

  // -- Uncommon Daemon (2) --
  {
    id: 'query-sweep', name: 'Query Sweep', type: 'daemon', rarity: 'uncommon', kind: 'daemon',
    description: 'Each time you Draft, all tasks lose 5 severity.',
  },
  {
    id: 'recursive-call', name: 'Recursive Call', type: 'daemon', rarity: 'uncommon', kind: 'daemon',
    description: 'When you run a Script, run it twice.',
  },

  // -- Rare (1 each) --
  {
    id: 'root-access', name: 'Root Access', type: 'script', rarity: 'rare', kind: 'play-all-others',
    description: 'Play all other cards in this draft.',
    apply: () => {},
  },
  {
    id: 'master-key', name: 'Master Key', type: 'utility', rarity: 'rare', kind: 'none', cooldown: 1,
    description: 'Activate 1: Draft from 2.',
    apply: () => openDraftFrom(2),
  },
  {
    id: 'fork-bomb', name: 'Fork Bomb', type: 'daemon', rarity: 'rare', kind: 'daemon',
    description: 'When you Activate a card, Activate it twice.',
  },

  // -- Virus --
  {
    id: 'computer-virus', name: 'Computer Virus', type: 'virus', rarity: null, kind: 'none',
    description: 'Drafted and picked: destroyed. Drafted and declined: returns to your deck, plus 1 new copy. Wiped from your deck at sprint end.',
    apply: () => {},
  },
];

const CARD_DEFS_BY_ID = Object.fromEntries(CARD_DEFS.map((c) => [c.id, c]));

const STARTER_DECK = [
  'quick-patch', 'quick-patch',
  'broadcast-ping', 'broadcast-ping',
  'debugger', 'debugger',
  'priority-queue',
  'background-sync',
  'garbage-collection',
  'force-quit',
];

const SPRINT_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const MAX_DECK_SIZE = 20;

// ---- Card rewards ----
// Finishing a task rolls a rarity, then grants one random unique card of
// that rarity (Computer Virus is excluded — it only enters a deck via task
// abilities/effects, never as a reward). The new card goes to the Unused
// Cards folder, not directly into the sprint's Deck.
const REWARD_ODDS = [
  ['common', 0.74],
  ['uncommon', 0.25],
  ['rare', 0.01],
];

function rollRarity() {
  const r = Math.random();
  let acc = 0;
  for (const [rarity, p] of REWARD_ODDS) {
    acc += p;
    if (r < acc) return rarity;
  }
  return REWARD_ODDS[REWARD_ODDS.length - 1][0];
}

function grantCardReward(rarity) {
  const pool = CARD_DEFS.filter((c) => c.type !== 'virus' && c.rarity === rarity);
  const template = pool[Math.floor(Math.random() * pool.length)];
  sprintState.unused.push(makeCard(template.id));
  sprintState.weekRewards.push({ templateId: template.id });
}

function rollCardReward() {
  grantCardReward(rollRarity());
}

// Special Task's reward skips the normal 74/25/1 odds entirely — straight
// 50/50 Rare/Uncommon, never Common, never nothing.
function rollSpecialTaskReward() {
  grantCardReward(Math.random() < 0.5 ? 'rare' : 'uncommon');
}

// ---- Task abilities ----
// A task's severity can never exceed 100 — the severity budget formula can
// suggest more than that for a single task, and growth abilities (Escalation,
// Retaliation, Contagious, Absorption) can push a task further still, but
// every place severity is set or increased clamps to this ceiling.
const TASK_SEVERITY_CAP = 100;

// Performance gates are checked once, at sprint-generation time, per the
// design doc — an ability stays locked in for a task's whole life even if
// performance later crosses back over the threshold.
// `description` is a function of the task so abilities with a magnitude
// rolled per-sprint (Escalation/Retaliation/Infectious — locked in at
// generation time in assignTasksForSprint, see abilityAmounts) can report
// the exact number that ability actually uses for that task, not a vague
// "some severity" placeholder.
const TASK_ABILITIES = [
  {
    id: 'business-as-usual', name: 'Business as Usual', gate: () => true,
    description: () => "Severity was locked to Performance at sprint start; behaves normally after that.",
  },
  {
    id: 'escalation', name: 'Escalation', gate: () => true,
    description: (task) => `Gains ${task.abilityAmounts.escalation} severity every day it stays unfinished.`,
  },
  {
    id: 'retaliation', name: 'Retaliation', gate: () => true,
    description: (task) => `Gains ${task.abilityAmounts.retaliation} severity whenever you Activate a Utility.`,
  },
  {
    id: 'infectious', name: 'Infectious', gate: () => true,
    description: (task) => {
      const n = task.abilityAmounts.infectious;
      return `Added ${n} Computer Virus card${n === 1 ? '' : 's'} to your deck at sprint start. Finishing this task clears every Computer Virus copy from your deck.`;
    },
  },
  {
    id: 'armored', name: 'Armored', gate: (p) => p > 35,
    description: () => 'Takes half damage (rounded up) from every effect.',
  },
  {
    id: 'absorption', name: 'Absorption', gate: (p) => p > 40,
    description: () => "Gains 10 severity whenever another task's severity is lowered.",
  },
  {
    id: 'draft-squeeze', name: 'Draft Squeeze', gate: (p) => p > 50,
    description: () => "Shrinks today's Draft to 2 cards while it's alive.",
  },
  {
    id: 'sluggish-systems', name: 'Sluggish Systems', gate: (p) => p > 50,
    description: () => "Adds 1 day to every Utility's cooldown while it's alive.",
  },
  {
    id: 'contagious', name: 'Contagious', gate: (p) => p > 50,
    description: () => 'Adds 5 severity to every other task, every day.',
  },
  {
    id: 'distraction', name: 'Distraction', gate: (p) => p > 60,
    description: () => "Can't be directly targeted (area / highest / lowest effects still hit it).",
  },
  {
    id: 'deadline-pressure', name: 'Deadline Pressure', gate: (p) => p > 70,
    description: (task) => `Applies its Performance penalty (-${task.loss}) every day, on top of the usual sprint-end penalty.`,
  },
  {
    id: 'layered', name: 'Layered', gate: (p) => p > 80,
    description: () => 'Starts at low severity, but any hit only lowers it by 1.',
  },
];

const TASK_NAME_BY_ABILITY = {
  'business-as-usual': 'Routine Maintenance',
  'escalation': 'Runaway Process',
  'retaliation': 'Defensive Firewall',
  'infectious': 'Compromised Server',
  'armored': 'Hardened Legacy System',
  'absorption': 'Load Aggregator',
  'draft-squeeze': 'Resource Contention',
  'sluggish-systems': 'Throttled Pipeline',
  'contagious': 'Spreading Outage',
  'distraction': 'Decoy Ticket',
  'deadline-pressure': 'Executive Escalation',
  'layered': 'Encrypted Vault',
};

function abilityDisplayName(id) {
  const a = TASK_ABILITIES.find((x) => x.id === id);
  return a ? a.name : id;
}

function abilityDescription(task, id) {
  const a = TASK_ABILITIES.find((x) => x.id === id);
  return a ? a.description(task) : '';
}

function hasAbility(task, id) {
  return !!(task.abilities && task.abilities.includes(id));
}

function isAbilityAliveAnywhere(id) {
  return sprintState.tasks.some((t) => !t.finished && hasAbility(t, id));
}

// Splits totalBudget across `count` tasks: each gets a floor of 5, and the
// remainder is divided by normalized random weights (an uneven, organic
// split) then rounded with drift correction so the total still matches.
function splitSeverityBudget(totalBudget, count) {
  const floor = 5;
  const remaining = Math.max(0, totalBudget - floor * count);
  const weights = Array.from({ length: count }, () => Math.random() + 0.1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const rounded = weights.map((w) => Math.round(floor + (remaining * w) / weightSum));

  let drift = Math.round(totalBudget) - rounded.reduce((a, b) => a + b, 0);
  let i = 0;
  while (drift !== 0 && i < count * 50) {
    const idx = i % count;
    if (drift > 0) { rounded[idx] += 1; drift -= 1; }
    else if (rounded[idx] > floor) { rounded[idx] -= 1; drift += 1; }
    i++;
  }
  return rounded;
}

// Keyed by the sprint (weekNumber) it's queued up for. Empty for now — no
// scripted story task has been designed yet.
const SCRIPTED_TASKS_BY_WEEK = {};

let taskInstanceCounter = 0;

// `carriedOverTasks` are unfinished tasks from the previous sprint (see
// endDay) — they're prepended as-is on top of this sprint's own freshly
// generated lineup, so they show up first in My Tasks and keep whatever
// severity/abilities/locked ability amounts they already had.
function assignTasksForSprint(carriedOverTasks = []) {
  const performance = sprintState.performance;
  const eligible = TASK_ABILITIES.filter((a) => a.gate(performance));
  const taskCount = randInt(2, Math.min(6, eligible.length));
  const budget = performance * 2 * Math.pow(1.1, performance / 10);
  const severities = splitSeverityBudget(budget, taskCount);

  const nonBau = shuffle(eligible.filter((a) => a.id !== 'business-as-usual').slice());
  const abilityIds = shuffle(['business-as-usual', ...nonBau.slice(0, taskCount - 1).map((a) => a.id)]);

  const tasks = [];
  const virusCards = [];
  abilityIds.forEach((abilityId, i) => {
    let severity = Math.min(TASK_SEVERITY_CAP, severities[i]);
    if (abilityId === 'business-as-usual') severity = performance;
    if (abilityId === 'layered') severity = 5;

    // Performance-derived ability magnitudes (Escalation's per-day gain,
    // Retaliation's per-activation gain, Infectious's virus count) are
    // rolled once here and locked to the task for its whole life — same as
    // the ability gate itself — so the number shown in its description and
    // the number actually applied always match, even as performance moves
    // over the course of the sprint.
    const abilityAmounts = {};
    if (abilityId === 'escalation' || abilityId === 'retaliation') {
      abilityAmounts[abilityId] = Math.round(performance / 10);
    }
    if (abilityId === 'infectious') {
      abilityAmounts.infectious = performance <= 50 ? 1 : performance <= 75 ? 2 : 3;
    }

    taskInstanceCounter += 1;
    tasks.push({
      id: 'task-gen-' + taskInstanceCounter,
      name: TASK_NAME_BY_ABILITY[abilityId],
      severity,
      // The severity budget compounds well past 100 at high performance (by
      // design — see DESIGN.md), so maxSeverity tracks each task's own
      // starting severity rather than a fixed ceiling. It's a display
      // reference for the health bar, not a cap on how much severity can grow.
      maxSeverity: severity,
      gain: randInt(1, 5),
      loss: randInt(1, 5),
      abilities: [abilityId],
      abilityAmounts,
      finished: false,
    });
    if (abilityId === 'infectious') {
      for (let v = 0; v < abilityAmounts.infectious; v++) virusCards.push(makeCard('computer-virus'));
    }
  });

  const scripted = (SCRIPTED_TASKS_BY_WEEK[sprintState.weekNumber] || []).map((def) => {
    taskInstanceCounter += 1;
    const scriptedSeverity = Math.min(TASK_SEVERITY_CAP, def.severity);
    return {
      id: 'task-scripted-' + taskInstanceCounter,
      name: def.name,
      severity: scriptedSeverity,
      maxSeverity: scriptedSeverity,
      gain: def.gain,
      loss: def.loss,
      abilities: def.abilities || [],
      abilityAmounts: def.abilityAmounts || {},
      finished: false,
    };
  });

  // Tagged (not re-tagged, since it's already true on anything carried more
  // than once) so these tasks keep showing the Reassign option every sprint
  // they survive, distinguishing them from this sprint's own fresh lineup.
  carriedOverTasks.forEach((t) => { t.carriedOver = true; });

  sprintState.tasks = [...carriedOverTasks, ...scripted, ...tasks];
  sprintState.deck.push(...virusCards);
}

let cardInstanceCounter = 0;
function makeCard(templateId) {
  cardInstanceCounter += 1;
  return { instanceId: 'card-' + cardInstanceCounter, templateId, cooldownRemaining: 0 };
}

function findTask(taskId) {
  return sprintState.tasks.find((t) => t.id === taskId);
}

function findPlayed(instanceId) {
  return sprintState.played.find((c) => c.instanceId === instanceId);
}

function hasDaemon(id) {
  return sprintState.played.some((c) => c.templateId === id);
}

// -- Core damage / finish primitives --
// Every severity reduction in the game routes through here, so Signal
// Amplifier / Armored / Layered / Absorption apply uniformly regardless of
// which card or ability triggered the reduction.
function lowerTaskSeverity(task, baseAmount) {
  if (!task || task.finished || baseAmount <= 0) return;
  let amount = baseAmount;
  if (hasDaemon('signal-amplifier')) amount += 3;
  if (hasAbility(task, 'armored')) amount = Math.ceil(amount / 2);
  if (hasAbility(task, 'layered')) amount = Math.min(amount, 1);

  const before = task.severity;
  task.severity = Math.max(0, task.severity - amount);
  if (task.severity < before) {
    sprintState.tasks.forEach((t) => {
      if (t.id !== task.id && !t.finished && hasAbility(t, 'absorption')) {
        t.severity = Math.min(TASK_SEVERITY_CAP, t.severity + 10);
      }
    });
  }
  if (task.severity <= 0) finishTaskDirect(task);
}

function finishTaskDirect(task) {
  if (task.finished) return;
  task.finished = true;
  sprintState.tasks = sprintState.tasks.filter((t) => t.id !== task.id);
  sprintState.finished.push(task);
  sprintState.finishedThisWeek.push(task);
  queuePerformanceChange(task.gain);
  if (task.isSpecialTask) rollSpecialTaskReward(); else rollCardReward();
  if (hasDaemon('task-manager')) openDraftFrom(3);
  // Finishing the Infectious task itself clears out the outbreak it caused —
  // every Computer Virus copy currently in the deck is removed, not just the
  // ones it originally added.
  if (hasAbility(task, 'infectious')) {
    sprintState.deck = sprintState.deck.filter((c) => CARD_DEFS_BY_ID[c.templateId].type !== 'virus');
  }
}

// Rewards clearing the board early instead of leaving downtime: if My Tasks
// is empty at the end of Monday/Tuesday/Wednesday/Thursday (checked once,
// in endDay's day-advance branch — never mid-day, and never on Friday's own
// end since that's End Week, not a day-to-day transition), one more task
// queues up for the day just starting — a Business as Usual task in every
// way (severity locked to current Performance, normal gain/loss) except its
// name and its reward odds (see rollSpecialTaskReward). Checking only once
// per day-transition is what caps this at one per day, with no extra flag
// needed.
function spawnSpecialTask() {
  taskInstanceCounter += 1;
  sprintState.tasks.push({
    id: 'task-special-' + taskInstanceCounter,
    name: 'Special Task',
    severity: sprintState.performance,
    maxSeverity: sprintState.performance,
    gain: randInt(1, 5),
    loss: randInt(1, 5),
    abilities: ['business-as-usual'],
    abilityAmounts: {},
    finished: false,
    isSpecialTask: true,
  });
}

// The escape valve for a backlog that's grown unmanageable: give up on a
// carried-over task at a cost steeper than just letting it ride (2x its
// loss, queued immediately but only actually applied at sprint end — see
// queuePerformanceChange) instead of finishing it. A clean forfeit — no
// gain, no reward roll, no finished-tasks entry, no Infectious deck-wipe.
// Only available on tasks that survived from a previous sprint; this
// sprint's own freshly-generated tasks can't be reassigned.
function reassignTask(taskId) {
  if (sprintState.pendingTarget || sprintState.pendingCardTarget || sprintState.bonusDraft) return;
  const task = findTask(taskId);
  if (!task || task.finished || !task.carriedOver) return;
  task.finished = true;
  sprintState.tasks = sprintState.tasks.filter((t) => t.id !== task.id);
  queuePerformanceChange(-2 * task.loss);
  renderEverSprintBoard();
}

function dealDamageToAll(amount, filterFn) {
  sprintState.tasks.filter((t) => !t.finished && (!filterFn || filterFn(t))).forEach((t) => lowerTaskSeverity(t, amount));
}

function dealDamageToHighest(amount, filterFn) {
  const tasks = sprintState.tasks.filter((t) => !t.finished && (!filterFn || filterFn(t)));
  const target = tasks.reduce((a, b) => (!a || b.severity > a.severity ? b : a), null);
  if (target) lowerTaskSeverity(target, amount);
}

function dealDamageToLowest(amount, filterFn) {
  const tasks = sprintState.tasks.filter((t) => !t.finished && (!filterFn || filterFn(t)));
  const target = tasks.reduce((a, b) => (!a || b.severity < a.severity ? b : a), null);
  if (target) lowerTaskSeverity(target, amount);
}

function finishAllUnder(threshold) {
  sprintState.tasks.filter((t) => !t.finished && t.severity < threshold).forEach((t) => finishTaskDirect(t));
}

function applyRetaliation() {
  sprintState.tasks.forEach((t) => {
    if (!t.finished && hasAbility(t, 'retaliation')) t.severity = Math.min(TASK_SEVERITY_CAP, t.severity + t.abilityAmounts.retaliation);
  });
}

// Distraction blocks single-target picks only ('all'/'highest'/'lowest' still work).
function getEligibleTargets(template) {
  let tasks = sprintState.tasks.filter((t) => !t.finished);
  if (template.eligibleTask) tasks = tasks.filter(template.eligibleTask);
  return tasks.filter((t) => !hasAbility(t, 'distraction'));
}

function getEligiblePlayedCards(template, excludeInstanceId) {
  let cards = sprintState.played.filter((c) => c.instanceId !== excludeInstanceId);
  if (template.playedFilter) cards = cards.filter(template.playedFilter);
  return cards;
}

// -- Deck sampling --
// Autoloader ("when you Draft, add 2 cards to the Draft") and Query Sweep
// ("each time you Draft, all tasks lose 5 severity") both apply to any
// sampling from the deck, daily or bonus. Type-filtered sampling (used by
// "play a random Script/Utility/Daemon" effects) naturally excludes Computer
// Virus since it isn't any of those three types.
function sampleAnyFromDeck(n) {
  let count = n + (hasDaemon('autoloader') ? 2 : 0);
  count = Math.min(count, sprintState.deck.length);
  const pool = shuffle([...sprintState.deck]).slice(0, count);
  pool.forEach((c) => {
    const idx = sprintState.deck.findIndex((d) => d.instanceId === c.instanceId);
    sprintState.deck.splice(idx, 1);
  });
  if (hasDaemon('query-sweep')) dealDamageToAll(5);
  return pool;
}

function pickRandomOfType(type) {
  const candidates = sprintState.deck.filter((c) => CARD_DEFS_BY_ID[c.templateId].type === type);
  if (candidates.length === 0) return null;
  const card = candidates[Math.floor(Math.random() * candidates.length)];
  const idx = sprintState.deck.findIndex((d) => d.instanceId === card.instanceId);
  sprintState.deck.splice(idx, 1);
  return card;
}

function playRandomFromDeck(type) {
  const card = pickRandomOfType(type);
  if (!card) return; // no eligible card in deck — fizzles, no penalty
  playCardEffect(card, CARD_DEFS_BY_ID[card.templateId], {});
}

// A drafted-and-declined card returns to the deck; a declined Computer Virus
// also spawns 1 new copy (1 becomes 2).
function resolveDraftOutcome(cards) {
  cards.forEach((card) => {
    sprintState.deck.push(card);
    if (CARD_DEFS_BY_ID[card.templateId].type === 'virus') {
      sprintState.deck.push(makeCard('computer-virus'));
    }
  });
}

// If a bonus draft is already showing, queue this one instead of clobbering
// it — e.g. an 'all'-kind effect (Broadcast Ping) can finish 2+ tasks in one
// pass, and Task Manager ("when you finish a task, Draft from 3") fires once
// per finish, so multiple bonus drafts can trigger in the same instant.
function openDraftFrom(n) {
  const options = sampleAnyFromDeck(n);
  if (options.length === 0) return;
  if (sprintState.bonusDraft) {
    sprintState.bonusDraftQueue.push({ options });
  } else {
    sprintState.bonusDraft = { options };
  }
}

// Promotes the next queued bonus draft into view once the current one is
// resolved — unless resolving it already opened a new one itself (chaining).
function advanceBonusDraftQueue() {
  if (!sprintState.bonusDraft && sprintState.bonusDraftQueue.length > 0) {
    sprintState.bonusDraft = sprintState.bonusDraftQueue.shift();
  }
}

// -- Playing / activating cards --

function runDaemonHook(hookName) {
  if (hookName === 'afterActivateUtility' && hasDaemon('background-sync')) {
    dealDamageToAll(2);
  }
}

// A picked/played Computer Virus is destroyed permanently — no board effect.
// A picked Utility/Daemon deploys into Played; a picked Script resolves now.
function playCardEffect(card, template, opts = {}) {
  if (template.type === 'virus') return;
  if (template.type === 'utility' || template.type === 'daemon') {
    card.cooldownRemaining = 0;
    sprintState.played.push(card);
    return;
  }
  runScriptEffect(card, template, opts);
}

function runScriptEffect(card, template, opts = {}) {
  if (template.kind === 'target') {
    const eligible = getEligibleTargets(template);
    if (opts.autoTarget) {
      const target = eligible.reduce((a, b) => (!a || b.severity > a.severity ? b : a), null);
      if (target) template.apply(target.id);
      afterScriptRun(card, template, opts);
      return;
    }
    if (eligible.length === 0) { afterScriptRun(card, template, opts); return; }
    sprintState.pendingTarget = {
      eligibleTaskIds: eligible.map((t) => t.id),
      apply: (taskId) => template.apply(taskId),
      onDone: () => afterScriptRun(card, template, opts),
    };
    return;
  }
  template.apply();
  afterScriptRun(card, template, opts);
}

// Per DESIGN.md: a Script "returns to the Deck" after resolving, just like
// the cards that weren't picked — it never sits in Played and is never
// consumed permanently (only a picked/declined Computer Virus is).
function afterScriptRun(card, template, opts) {
  if (opts.isReplay) return;
  runDaemonHook('afterRunScript');
  if (hasDaemon('recursive-call')) runScriptEffect(card, template, { ...opts, isReplay: true });
  sprintState.deck.push(card);
}

function runUtilityEffect(card, template, opts = {}) {
  // Cascade Failure counts real Activate events, and a Fork Bomb replay is a
  // real second Activate of this same card ("Activate it twice") — it just
  // doesn't re-trigger cooldown/Retaliation/other Daemons a second time.
  sprintState.activationsToday += 1;
  if (!opts.isReplay) {
    card.cooldownRemaining = template.cooldown + (isAbilityAliveAnywhere('sluggish-systems') ? 1 : 0);
    applyRetaliation();
  }
  if (template.kind === 'target') {
    const eligible = getEligibleTargets(template);
    if (eligible.length === 0) { afterUtilityRun(card, template, opts); return; }
    sprintState.pendingTarget = {
      eligibleTaskIds: eligible.map((t) => t.id),
      apply: (taskId) => template.apply(taskId),
      onDone: () => afterUtilityRun(card, template, opts),
    };
    return;
  }
  if (template.kind === 'target-card') {
    const eligible = getEligiblePlayedCards(template, card.instanceId);
    if (eligible.length === 0) { afterUtilityRun(card, template, opts); return; }
    sprintState.pendingCardTarget = {
      eligibleInstanceIds: eligible.map((c) => c.instanceId),
      apply: (instanceId) => template.apply(instanceId),
      onDone: () => afterUtilityRun(card, template, opts),
    };
    return;
  }
  template.apply();
  afterUtilityRun(card, template, opts);
}

function afterUtilityRun(card, template, opts) {
  if (opts.isReplay) return;
  runDaemonHook('afterActivateUtility');
  if (hasDaemon('fork-bomb')) runUtilityEffect(card, template, { isReplay: true });
}

function activateUtilityCard(instanceId) {
  if (!sprintState.dailyDraftResolved || sprintState.pendingTarget || sprintState.pendingCardTarget || sprintState.bonusDraft) return;
  const card = sprintState.played.find((c) => c.instanceId === instanceId);
  if (!card) return;
  const template = CARD_DEFS_BY_ID[card.templateId];
  if (template.type !== 'utility' || card.cooldownRemaining > 0) return;
  runUtilityEffect(card, template, {});
  renderEverSprintBoard();
}

function resolvePendingTarget(taskId) {
  const pt = sprintState.pendingTarget;
  if (!pt || !pt.eligibleTaskIds.includes(taskId)) return;
  sprintState.pendingTarget = null;
  pt.apply(taskId);
  pt.onDone();
  renderEverSprintBoard();
}

function resolvePendingCardTarget(instanceId) {
  const pt = sprintState.pendingCardTarget;
  if (!pt || !pt.eligibleInstanceIds.includes(instanceId)) return;
  sprintState.pendingCardTarget = null;
  pt.apply(instanceId);
  pt.onDone();
  renderEverSprintBoard();
}

// Root Access plays every other card from the same draft instead of letting
// them return to the deck as "declined".
function resolveDraftPick(chosen, remaining, origin) {
  const template = CARD_DEFS_BY_ID[chosen.templateId];
  if (template.kind === 'play-all-others') {
    remaining.forEach((c) => playCardEffect(c, CARD_DEFS_BY_ID[c.templateId], { autoTarget: true }));
  } else {
    resolveDraftOutcome(remaining);
  }
  playCardEffect(chosen, template, { origin });
}

function pickFromDailyDraft(instanceId) {
  if (sprintState.dailyDraftResolved || sprintState.pendingTarget || sprintState.pendingCardTarget) return;
  const idx = sprintState.dailyDraft.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return;
  const [chosen] = sprintState.dailyDraft.splice(idx, 1);
  const remaining = sprintState.dailyDraft;
  sprintState.dailyDraft = [];
  sprintState.dailyDraftResolved = true;
  resolveDraftPick(chosen, remaining, 'daily-draft');
  renderEverSprintBoard();
}

function pickFromBonusDraft(instanceId) {
  if (!sprintState.bonusDraft || sprintState.pendingTarget || sprintState.pendingCardTarget) return;
  const options = sprintState.bonusDraft.options;
  const idx = options.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return;
  const [chosen] = options.splice(idx, 1);
  sprintState.bonusDraft = null;
  resolveDraftPick(chosen, options, 'bonus-draft'); // may open a new bonusDraft itself (chaining)
  advanceBonusDraftQueue();
  renderEverSprintBoard();
}

function declineBonusDraft() {
  if (!sprintState.bonusDraft) return;
  resolveDraftOutcome(sprintState.bonusDraft.options);
  sprintState.bonusDraft = null;
  advanceBonusDraftQueue();
  renderEverSprintBoard();
}

// -- Sprint / day lifecycle --

function startDailyDraft() {
  sprintState.dailyDraftResolved = false;
  const squeezed = sprintState.tasks.some((t) => !t.finished && hasAbility(t, 'draft-squeeze'));
  sprintState.dailyDraft = sampleAnyFromDeck(squeezed ? 2 : 3);
}

function createSprintState() {
  const deck = STARTER_DECK.map((templateId) => makeCard(templateId));
  return {
    weekNumber: 1,
    dayIndex: 0, // 0 = Monday .. 4 = Friday
    phase: 'active', // 'active' | 'summary'
    performance: 25,
    pendingPerformanceDelta: 0, // accumulates all week; only applied at End Week (see queuePerformanceChange)
    deck,
    played: [], // Utility + Daemon cards currently deployed
    unused: [], // owned but not in this sprint's deck
    tasks: [],
    finished: [],
    finishedThisWeek: [],
    weekRewards: [],
    summary: null,
    editingDeck: false,
    dailyDraft: [],
    dailyDraftResolved: false,
    activationsToday: 0,
    pendingTarget: null,
    pendingCardTarget: null,
    bonusDraft: null,
    bonusDraftQueue: [], // additional bonus drafts triggered while one's already showing
    gameOver: null, // null | 'promoted' | 'fired'
  };
}

let sprintState = null;
function ensureSprintState() {
  if (!sprintState) {
    sprintState = createSprintState();
    assignTasksForSprint();
    startDailyDraft();
  }
  return sprintState;
}

function changePerformance(amount) {
  if (sprintState.gameOver) return;
  sprintState.performance = Math.max(0, Math.min(100, sprintState.performance + amount));
  if (sprintState.performance >= 100) sprintState.gameOver = 'promoted';
  else if (sprintState.performance <= 0) sprintState.gameOver = 'fired';
}

// Performance mostly only actually moves once per sprint, at End Week —
// mid-sprint sources (finishing a task, Reassigning) queue their
// contribution here instead of calling changePerformance directly, which is
// also why promotion can only happen at sprint end: changePerformance (the
// only place gameOver gets set) isn't called for these until the whole
// sprint's delta is applied at once. Deadline Pressure's daily tick is a
// deliberate exception — see applyDailyAbilityTicks — and calls
// changePerformance directly, so firing can still happen mid-sprint from
// that specific threat.
function queuePerformanceChange(amount) {
  sprintState.pendingPerformanceDelta += amount;
}

function canEndDay() {
  return sprintState.dailyDraftResolved && !sprintState.pendingTarget && !sprintState.pendingCardTarget && !sprintState.bonusDraft;
}

function hasAvailableActions() {
  return sprintState.played.some((c) => CARD_DEFS_BY_ID[c.templateId].type === 'utility' && c.cooldownRemaining === 0);
}

function applyDailyAbilityTicks() {
  const tasks = sprintState.tasks.filter((t) => !t.finished);
  tasks.forEach((t) => {
    if (hasAbility(t, 'escalation')) t.severity = Math.min(TASK_SEVERITY_CAP, t.severity + t.abilityAmounts.escalation);
    // Deliberate exception to "Performance only moves at sprint end": Deadline
    // Pressure is a live daily threat, not a deferred one — it applies for
    // real, immediately, and can fire the player mid-sprint on its own. It
    // still also gets hit by the sprint-end lump sum if still unresolved
    // then ("fires every day and again at sprint end").
    if (hasAbility(t, 'deadline-pressure')) changePerformance(-t.loss);
  });
  tasks.forEach((t) => {
    if (hasAbility(t, 'contagious')) {
      sprintState.tasks.forEach((o) => {
        if (o.id !== t.id && !o.finished) o.severity = Math.min(TASK_SEVERITY_CAP, o.severity + 5);
      });
    }
  });
}

function tickCooldowns() {
  sprintState.played.forEach((c) => {
    if (CARD_DEFS_BY_ID[c.templateId].type === 'utility' && c.cooldownRemaining > 0) c.cooldownRemaining -= 1;
  });
}

function endDay() {
  if (sprintState.gameOver || !canEndDay()) return;

  applyDailyAbilityTicks();
  tickCooldowns();

  if (sprintState.dayIndex < 4) {
    sprintState.dayIndex += 1;
    sprintState.activationsToday = 0;
    // Board empty at the end of Mon/Tue/Wed/Thu (this covers all four —
    // dayIndex was 0-3 to get here) queues up a Special Task for the day
    // that's just starting. See spawnSpecialTask for why this alone caps it
    // at one per day.
    if (sprintState.tasks.length === 0) {
      spawnSpecialTask();
    }
    startDailyDraft();
    renderEverSprintBoard();
    return;
  }

  // Week's over: apply the loss for anything still open, fold Played cards
  // back into the Deck, and wipe any Computer Virus copies (they never
  // survive past the sprint that spawned them).
  const carriedOverTasks = sprintState.tasks.map((t) => ({ ...t }));

  // Performance mostly only changes here, once, for the whole sprint —
  // everything queued all week (task finishes, Reassigns) plus this final
  // loss for anything still open, applied in one shot. This is the only
  // point a sprint can end in promotion (100); Deadline Pressure's daily
  // tick is the one way firing (0) can already have happened earlier.
  const totalDelta = sprintState.pendingPerformanceDelta - carriedOverTasks.reduce((sum, t) => sum + t.loss, 0);
  sprintState.pendingPerformanceDelta = 0;
  changePerformance(totalDelta);

  sprintState.played.forEach((c) => { c.cooldownRemaining = 0; });
  sprintState.deck.push(...sprintState.played);
  sprintState.played = [];
  sprintState.deck = sprintState.deck.filter((c) => CARD_DEFS_BY_ID[c.templateId].type !== 'virus');

  if (!sprintState.gameOver) {
    sprintState.summary = {
      weekNumber: sprintState.weekNumber,
      finishedTasks: sprintState.finishedThisWeek,
      carriedOverTasks,
      rewards: sprintState.weekRewards,
      performanceChange: totalDelta,
    };
    sprintState.finishedThisWeek = [];
    sprintState.weekRewards = [];
    sprintState.phase = 'summary';
  }

  renderEverSprintBoard();
}

// Fires from the Deck Editor's "Go to Next Sprint" button — commits
// whatever's currently in the Deck folder as next week's live queue.
function advanceToNextSprint() {
  if (sprintState.gameOver) return;
  // Read from the live task list, not the summary's frozen snapshot — a
  // task Reassigned while viewing the summary must actually stay gone.
  const carriedOverTasks = sprintState.tasks.filter((t) => !t.finished);
  sprintState.weekNumber += 1;
  sprintState.dayIndex = 0;
  sprintState.phase = 'active';
  sprintState.summary = null;
  sprintState.editingDeck = false;
  sprintState.activationsToday = 0;
  sprintState.finished = [];
  assignTasksForSprint(carriedOverTasks);
  startDailyDraft();
  renderEverSprintBoard();
}

function moveCardBetweenFolders(instanceId, fromKey, toKey) {
  if (toKey === 'deck' && sprintState.deck.length >= MAX_DECK_SIZE) return;
  const from = sprintState[fromKey];
  const idx = from.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return;
  const [card] = from.splice(idx, 1);
  sprintState[toKey].push(card);
  renderEverSprintBoard();
}

// -- Rendering --

let everSprintBoardEl = null;

function renderCardTag(template) {
  return `<div class="sprint-card-type-tag">${template.type}${template.rarity ? ' &middot; ' + template.rarity : ''}</div>`;
}

function renderLibraryCard(card) {
  const template = CARD_DEFS_BY_ID[card.templateId];
  const el = document.createElement('div');
  el.className = 'sprint-card';
  el.dataset.type = template.type;
  if (template.rarity) el.dataset.rarity = template.rarity;
  el.innerHTML = `
    ${renderCardTag(template)}
    <div class="sprint-card-name">${template.name}</div>
    <div class="sprint-card-desc">${template.description}</div>
  `;
  return el;
}

function renderDraftOptionCard(card, onPick) {
  const template = CARD_DEFS_BY_ID[card.templateId];
  const el = document.createElement('div');
  el.className = 'sprint-card';
  el.dataset.type = template.type;
  if (template.rarity) el.dataset.rarity = template.rarity;
  el.innerHTML = `
    ${renderCardTag(template)}
    <div class="sprint-card-name">${template.name}</div>
    <div class="sprint-card-desc">${template.description}</div>
  `;
  const btn = document.createElement('button');
  btn.textContent = 'Pick';
  btn.addEventListener('click', () => onPick(card.instanceId));
  el.appendChild(btn);
  return el;
}

function renderPlayedCard(card) {
  const template = CARD_DEFS_BY_ID[card.templateId];
  const targetableCard = !!(sprintState.pendingCardTarget && sprintState.pendingCardTarget.eligibleInstanceIds.includes(card.instanceId));
  const el = document.createElement('div');
  el.className = 'sprint-card' + (targetableCard ? ' targetable-card' : '');
  el.dataset.type = template.type;
  if (template.rarity) el.dataset.rarity = template.rarity;
  el.innerHTML = `
    ${renderCardTag(template)}
    <div class="sprint-card-name">${template.name}</div>
    <div class="sprint-card-desc">${template.description}</div>
  `;

  if (template.type === 'daemon') {
    const tag = document.createElement('div');
    tag.className = 'sprint-card-cooldown';
    tag.textContent = 'Passive';
    el.appendChild(tag);
  } else if (card.cooldownRemaining > 0) {
    const tag = document.createElement('div');
    tag.className = 'sprint-card-cooldown';
    tag.textContent = `Cooldown: ${card.cooldownRemaining}d`;
    el.appendChild(tag);
  } else {
    const btn = document.createElement('button');
    btn.textContent = 'Activate';
    btn.disabled = !sprintState.dailyDraftResolved || !!sprintState.pendingTarget || !!sprintState.pendingCardTarget || !!sprintState.bonusDraft;
    btn.addEventListener('click', () => activateUtilityCard(card.instanceId));
    el.appendChild(btn);
  }

  if (targetableCard) {
    el.addEventListener('click', () => resolvePendingCardTarget(card.instanceId));
  }
  return el;
}

function renderSprintTask(task) {
  const targetable = !!(sprintState.pendingTarget && sprintState.pendingTarget.eligibleTaskIds.includes(task.id));
  const el = document.createElement('div');
  el.className = 'sprint-task' + (targetable ? ' targetable' : '');
  const pct = Math.min(100, Math.round((task.severity / task.maxSeverity) * 100));
  const abilityBlocks = (task.abilities || []).map((id) => `
    <div class="ability-block">
      <span class="ability-badge">${abilityDisplayName(id)}</span>
      <div class="ability-desc">${abilityDescription(task, id)}</div>
    </div>
  `).join('');
  el.innerHTML = `
    <div class="sprint-task-name">${task.name}${task.carriedOver ? ' <span class="carried-badge">Carried Over</span>' : ''}</div>
    <div class="severity-bar"><div class="severity-bar-fill" style="width:${pct}%"></div></div>
    <div class="sprint-task-meta">Severity ${task.severity} &middot; +${task.gain} / -${task.loss}</div>
    ${abilityBlocks}
  `;
  if (task.carriedOver) {
    const reassignBtn = document.createElement('button');
    reassignBtn.className = 'reassign-btn';
    reassignBtn.textContent = `Reassign (-${2 * task.loss})`;
    reassignBtn.disabled = !!(sprintState.pendingTarget || sprintState.pendingCardTarget || sprintState.bonusDraft);
    reassignBtn.addEventListener('click', (e) => { e.stopPropagation(); reassignTask(task.id); });
    el.appendChild(reassignBtn);
  }
  el.addEventListener('click', () => resolvePendingTarget(task.id));
  return el;
}

// Shows the same detail a task had on the board (severity it was finished
// at, gain/loss, ability + description) rather than just its name, so the
// post-sprint summary and the live "Finished Tasks" column both stay fully
// informative instead of losing everything but the name once a task clears.
function renderFinishedTask(task) {
  const el = document.createElement('div');
  el.className = 'sprint-task sprint-task-cleared';
  const abilityBlocks = (task.abilities || []).map((id) => `
    <div class="ability-block">
      <span class="ability-badge">${abilityDisplayName(id)}</span>
      <div class="ability-desc">${abilityDescription(task, id)}</div>
    </div>
  `).join('');
  el.innerHTML = `
    <div class="sprint-task-name">${task.name} <span class="task-status-tag summary-positive">Cleared &middot; +${task.gain}</span></div>
    <div class="severity-bar"><div class="severity-bar-fill" style="width:100%"></div></div>
    <div class="sprint-task-meta">Severity ${task.maxSeverity} &middot; +${task.gain} / -${task.loss}</div>
    ${abilityBlocks}
  `;
  return el;
}

function fillColumn(body, items, renderItem, emptyText) {
  body.innerHTML = '';
  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'board-empty';
    empty.textContent = emptyText;
    body.appendChild(empty);
    return;
  }
  items.forEach((item) => body.appendChild(renderItem(item)));
}

function renderDraftColumnBody(body) {
  body.innerHTML = '';
  if (sprintState.bonusDraft) {
    const note = document.createElement('div');
    note.className = 'bonus-draft-header';
    const queuedCount = sprintState.bonusDraftQueue.length;
    note.textContent = `Bonus Draft — choose 1 of ${sprintState.bonusDraft.options.length}`
      + (queuedCount > 0 ? ` (+${queuedCount} more queued)` : '');
    body.appendChild(note);
    sprintState.bonusDraft.options.forEach((card) => body.appendChild(renderDraftOptionCard(card, pickFromBonusDraft)));
    const declineBtn = document.createElement('button');
    declineBtn.className = 'action-btn bonus-draft-decline';
    declineBtn.textContent = 'Decline';
    declineBtn.addEventListener('click', () => declineBonusDraft());
    body.appendChild(declineBtn);
    return;
  }
  if (!sprintState.dailyDraftResolved) {
    sprintState.dailyDraft.forEach((card) => body.appendChild(renderDraftOptionCard(card, pickFromDailyDraft)));
    return;
  }
  const note = document.createElement('div');
  note.className = 'draft-column-note';
  note.textContent = "Today's pick is made. New offer tomorrow.";
  body.appendChild(note);
}

function renderEverSprintBoard() {
  if (!everSprintBoardEl) return;
  everSprintBoardEl.innerHTML = '';

  if (sprintState.gameOver) {
    const msg = sprintState.gameOver === 'promoted'
      ? "You hit 100 performance. Promoted."
      : 'Performance hit 0. You were let go.';
    everSprintBoardEl.innerHTML = `
      <div class="sprint-gameover">
        <strong>${sprintState.gameOver === 'promoted' ? 'Promoted' : 'Fired'}</strong>
        <div>${msg}</div>
      </div>
    `;
    return;
  }

  if (sprintState.phase === 'summary') {
    if (sprintState.editingDeck) {
      renderDeckEditor(everSprintBoardEl);
    } else {
      renderSprintSummaryView(everSprintBoardEl);
    }
    return;
  }

  const dayDots = SPRINT_DAY_NAMES.map((_, i) =>
    `<span class="sprint-day-dot${i <= sprintState.dayIndex ? ' filled' : ''}"></span>`
  ).join('');

  let hint = '';
  if (sprintState.pendingTarget) hint = 'Choose a task to target.';
  else if (sprintState.pendingCardTarget) hint = 'Choose a card to target.';
  else if (sprintState.bonusDraft) hint = 'Bonus draft available — pick one or decline.';
  else if (!sprintState.dailyDraftResolved) hint = "Pick one card from today's Draft to continue.";

  const header = document.createElement('div');
  header.className = 'sprint-header';
  header.innerHTML = `
    <div class="sprint-header-stat sprint-performance">
      <span>Performance</span>
      <strong>${sprintState.performance}/100</strong>
      <div class="severity-bar performance-bar"><div class="severity-bar-fill" style="width:${sprintState.performance}%"></div></div>
    </div>
    <div class="sprint-hint">${hint}</div>
    <div class="sprint-header-stat">
      <div class="sprint-day">Sprint ${sprintState.weekNumber} &middot; ${SPRINT_DAY_NAMES[sprintState.dayIndex]}</div>
      <div class="sprint-day-dots">${dayDots}</div>
    </div>
  `;
  everSprintBoardEl.appendChild(header);

  const board = document.createElement('div');
  board.className = 'board';

  const columns = [
    ['Deck', sprintState.deck, renderLibraryCard, 'No cards yet'],
    ['Draft', null, null, null],
    ['Played', sprintState.played, renderPlayedCard, 'Nothing deployed'],
    ['My Tasks', sprintState.tasks, renderSprintTask, 'No tasks yet'],
    ['Finished Tasks', sprintState.finished, renderFinishedTask, 'Nothing finished yet'],
  ];

  columns.forEach(([label, items, renderItem, emptyText]) => {
    const column = document.createElement('div');
    column.className = 'board-column';
    const columnHeader = document.createElement('div');
    columnHeader.className = 'board-column-header';
    const labelEl = document.createElement('span');
    labelEl.textContent = label === 'Draft' ? label : `${label} (${items.length})`;
    columnHeader.appendChild(labelEl);
    if (label === 'Deck') {
      const endDayBtn = document.createElement('button');
      endDayBtn.className = 'action-btn ' + (canEndDay() && !hasAvailableActions() ? 'day-btn-clear' : 'day-btn-pending');
      endDayBtn.disabled = !canEndDay();
      endDayBtn.textContent = sprintState.dayIndex < 4 ? 'End Day, Draw 1' : 'End Week';
      endDayBtn.addEventListener('click', () => endDay());
      columnHeader.appendChild(endDayBtn);
    }
    const body = document.createElement('div');
    body.className = 'board-column-body';
    column.appendChild(columnHeader);
    column.appendChild(body);
    board.appendChild(column);

    if (label === 'Draft') {
      renderDraftColumnBody(body);
    } else {
      fillColumn(body, items, renderItem, emptyText);
    }
  });

  everSprintBoardEl.appendChild(board);
}

// -- Sprint Summary hub --

function renderSprintSummaryView(container) {
  const summary = sprintState.summary;
  const unreadCount = EVERGREEN_MAIL_SEEDS.filter((e) => !e.read).length;
  // The actual total applied at End Week — not just gains/losses from this
  // week's tasks, but also any Reassigns and Deadline Pressure daily ticks.
  const netChange = summary.performanceChange;

  const wrap = document.createElement('div');
  wrap.className = 'sprint-summary';
  wrap.innerHTML = `
    <div class="summary-header">
      <div class="summary-title">Sprint ${summary.weekNumber} complete</div>
      <div class="summary-performance">Performance ${sprintState.performance}/100
        <span class="${netChange >= 0 ? 'summary-positive' : 'summary-negative'}">(${netChange >= 0 ? '+' : ''}${netChange})</span>
      </div>
    </div>
    <div class="summary-columns">
      <div class="summary-section">
        <div class="summary-section-title">Rewards (${summary.rewards.length})</div>
        <div class="summary-section-body" data-role="rewards-body"></div>
      </div>
      <div class="summary-section">
        <div class="summary-section-title">Carried over (${summary.carriedOverTasks.length})</div>
        <div class="summary-section-body" data-role="carried-body"></div>
      </div>
      <div class="summary-section">
        <div class="summary-section-title">Finished (${summary.finishedTasks.length})</div>
        <div class="summary-section-body" data-role="finished-body"></div>
      </div>
    </div>
    <div class="summary-actions"></div>
  `;

  // Reuse the exact same card/task renderers the live board uses, so the
  // summary shows everything that was visible during the sprint (severity,
  // gain/loss, ability description, card type/rarity/effect text) instead
  // of just names.
  fillColumn(wrap.querySelector('[data-role="finished-body"]'), summary.finishedTasks, renderFinishedTask, 'Nothing finished this sprint');
  fillColumn(wrap.querySelector('[data-role="carried-body"]'), summary.carriedOverTasks, renderSprintTask, 'Nothing left open');
  fillColumn(wrap.querySelector('[data-role="rewards-body"]'), summary.rewards, renderLibraryCard, 'No new tools');

  const actions = wrap.querySelector('.summary-actions');

  const editBtn = document.createElement('button');
  editBtn.className = 'action-btn';
  editBtn.textContent = 'Edit Deck';
  editBtn.addEventListener('click', () => { sprintState.editingDeck = true; renderEverSprintBoard(); });
  actions.appendChild(editBtn);

  if (unreadCount > 0) {
    const mailBtn = document.createElement('button');
    mailBtn.className = 'action-btn';
    mailBtn.textContent = `Read Emails (${unreadCount})`;
    mailBtn.addEventListener('click', () => openEvergreenMailApp());
    actions.appendChild(mailBtn);
  }

  container.appendChild(wrap);
}

// -- Deck editor (file-system metaphor) --
// "Deck" and "Unused Cards" are just folders — dragging a card file between
// them is the entire deckbuilding interaction. Whatever's in Deck when the
// player leaves the summary becomes next sprint's live queue.

// Click a card file to select it and see its name/text, like a tooltip.
// Clicking the selected card again (or clicking elsewhere) deselects it.
// Identical copies within the same folder are shown as one stacked tile with
// a count badge rather than one tile per copy, so selection is keyed by
// folder + template (e.g. "deck:quick-patch") rather than by card instance.
let selectedGroupKey = null;

function groupCardsByTemplate(cards) {
  const groups = [];
  const byTemplate = new Map();
  cards.forEach((card) => {
    let group = byTemplate.get(card.templateId);
    if (!group) {
      group = { templateId: card.templateId, instances: [] };
      byTemplate.set(card.templateId, group);
      groups.push(group);
    }
    group.instances.push(card);
  });
  return groups;
}

function fileTile(group, folderKey) {
  const template = CARD_DEFS_BY_ID[group.templateId];
  const groupKey = folderKey + ':' + group.templateId;
  const selected = groupKey === selectedGroupKey;
  // Drag/drop still moves exactly one card instance per drag — dragging a
  // stack peels one copy off it rather than moving the whole stack at once.
  const dragInstanceId = group.instances[0].instanceId;
  const el = document.createElement('div');
  el.className = 'file-tile' + (selected ? ' selected' : '');
  el.dataset.type = template.type;
  el.draggable = true;
  el.dataset.groupKey = groupKey;
  el.innerHTML = `
    <div class="file-icon">&#128196;</div>
    <div class="file-name">${template.name}</div>
    ${group.instances.length > 1 ? `<div class="file-count">&times;${group.instances.length}</div>` : ''}
  `;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedGroupKey = selected ? null : groupKey;
    renderEverSprintBoard();
  });
  el.addEventListener('dragstart', (e) => {
    selectedGroupKey = null;
    e.dataTransfer.setData('text/plain', JSON.stringify({ instanceId: dragInstanceId, from: folderKey }));
  });
  return el;
}

// The selected tile's tooltip is positioned relative to the whole editor
// (not the scrollable folder it lives in) so it never gets clipped by a
// folder's overflow, and clamped so it can't run past the editor's edges.
function positionCardTooltip(wrap) {
  if (!selectedGroupKey) return;
  const tileEl = wrap.querySelector(`[data-group-key="${selectedGroupKey}"]`);
  const templateId = selectedGroupKey.slice(selectedGroupKey.indexOf(':') + 1);
  const template = CARD_DEFS_BY_ID[templateId];
  if (!tileEl || !template) return;

  const tooltip = document.createElement('div');
  tooltip.className = 'file-tooltip';
  tooltip.innerHTML = `
    <div class="file-tooltip-name">${template.name}</div>
    <div class="file-tooltip-desc">${template.description}</div>
  `;
  wrap.appendChild(tooltip);

  const wrapRect = wrap.getBoundingClientRect();
  const tileRect = tileEl.getBoundingClientRect();
  const tooltipWidth = tooltip.offsetWidth;
  const margin = 10;
  const idealLeft = tileRect.left - wrapRect.left + tileRect.width / 2;
  const left = Math.max(tooltipWidth / 2 + margin, Math.min(wrapRect.width - tooltipWidth / 2 - margin, idealLeft));
  const top = Math.min(tileRect.bottom - wrapRect.top + 8, wrapRect.height - tooltip.offsetHeight - margin);

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}

function renderFolder(label, cards, folderKey, maxCount) {
  const folder = document.createElement('div');
  folder.className = 'file-folder';
  const headerText = maxCount ? `${label} (${cards.length}/${maxCount})` : `${label} (${cards.length})`;
  folder.innerHTML = `<div class="file-folder-header">${headerText}</div>`;

  const body = document.createElement('div');
  body.className = 'file-folder-body';
  if (cards.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'board-empty';
    empty.textContent = 'Empty';
    body.appendChild(empty);
  } else {
    groupCardsByTemplate(cards).forEach((group) => body.appendChild(fileTile(group, folderKey)));
  }

  const isFull = folderKey === 'deck' && cards.length >= MAX_DECK_SIZE;
  body.addEventListener('dragover', (e) => {
    if (isFull) return; // no preventDefault -> browser shows a "not allowed" cursor
    e.preventDefault();
    body.classList.add('drag-over');
  });
  body.addEventListener('dragleave', () => body.classList.remove('drag-over'));
  body.addEventListener('drop', (e) => {
    e.preventDefault();
    body.classList.remove('drag-over');
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (data.from === folderKey) return;
    moveCardBetweenFolders(data.instanceId, data.from, folderKey);
  });

  folder.appendChild(body);
  return folder;
}

function renderDeckEditor(container) {
  const wrap = document.createElement('div');
  wrap.className = 'file-browser';

  const header = document.createElement('div');
  header.className = 'file-browser-header';
  const title = document.createElement('div');
  title.className = 'summary-title';
  title.textContent = 'Edit Deck';
  header.appendChild(title);
  const nextBtn = document.createElement('button');
  nextBtn.className = 'action-btn day-btn-clear';
  nextBtn.textContent = 'Go to Next Sprint';
  nextBtn.addEventListener('click', () => {
    selectedGroupKey = null;
    advanceToNextSprint();
  });
  header.appendChild(nextBtn);
  wrap.appendChild(header);

  const folders = document.createElement('div');
  folders.className = 'file-folders';
  folders.appendChild(renderFolder('Deck', sprintState.deck, 'deck', MAX_DECK_SIZE));
  folders.appendChild(renderFolder('Unused Cards', sprintState.unused, 'unused'));
  wrap.appendChild(folders);

  // Clicking anywhere outside a card file (tiles stop propagation) deselects.
  wrap.addEventListener('click', () => {
    if (selectedGroupKey === null) return;
    selectedGroupKey = null;
    renderEverSprintBoard();
  });

  container.appendChild(wrap);
  positionCardTooltip(wrap); // needs layout, so only after wrap is in the DOM
}

function buildEverSprintApp(contentEl) {
  const tasksLoaded = EVERGREEN_MAIL_SEEDS.find((e) => e.id === 'sunita-2').viewed;

  const wrapper = document.createElement('div');
  wrapper.className = 'sprint-app';
  contentEl.appendChild(wrapper);

  if (!tasksLoaded) {
    const board = document.createElement('div');
    board.className = 'board';
    ['Deck', 'Draft', 'Played', 'My Tasks', 'Finished Tasks'].forEach((columnName) => {
      const column = document.createElement('div');
      column.className = 'board-column';
      column.innerHTML = `
        <div class="board-column-header">${columnName}</div>
        <div class="board-column-body"><div class="board-empty">No cards yet</div></div>
      `;
      board.appendChild(column);
    });
    wrapper.appendChild(board);
    everSprintBoardEl = null;
    return;
  }

  everSprintBoardEl = wrapper;
  ensureSprintState();
  renderEverSprintBoard();
}

document.getElementById('icon-eversprint').addEventListener('click', () => {
  openApp('eversprint', {
    title: 'EverSprint',
    width: 1350,
    height: 760,
    x: 160,
    y: 80,
    build: buildEverSprintApp,
    rebuildOnRestore: true,
  });
});

// ---- Settings ----
// Controls how the in-game desktop looks (theme + window chrome) and how
// individual apps skin themselves (email client now; agile board and
// terminal are stored for when those apps exist).

const DEFAULT_SETTINGS = {
  theme: 'evergreen',
  os: 'evergreen',
  emailClient: 'evergreen',
  agileBoard: 'evergreen',
  terminal: 'evergreen',
};
const SETTINGS_KEY = 'evergreen-mortal-settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    // ignore — fall back to defaults
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    // ignore — settings just won't persist this session
  }
}

const settings = loadSettings();

function applySettings() {
  const ds = document.getElementById('desktop-screen');
  ds.dataset.theme = settings.theme;
  ds.dataset.os = settings.os;
  ds.dataset.emailClient = settings.emailClient;
  ds.dataset.agileBoard = settings.agileBoard;
  ds.dataset.terminal = settings.terminal;
}
applySettings();

const SETTINGS_FIELDS = [
  { key: 'theme', label: 'Theme', options: ['Evergreen', 'Dark', 'Light'] },
  { key: 'os', label: 'Operating System', options: ['Evergreen', 'Windows', 'macOS'] },
  { key: 'emailClient', label: 'Email Client', options: ['Evergreen', 'Gmail', 'Outlook'] },
  { key: 'agileBoard', label: 'Agile Board', options: ['Evergreen', 'Jira', 'Trello'] },
  { key: 'terminal', label: 'Terminal', options: ['Evergreen', 'Bash', 'PowerShell'] },
];

function optionValue(label) {
  return label.toLowerCase().replace(/[^a-z]/g, '');
}

function buildSettingsApp(contentEl) {
  const panel = document.createElement('div');
  panel.className = 'settings-panel';

  SETTINGS_FIELDS.forEach((field) => {
    const row = document.createElement('div');
    row.className = 'settings-row';

    const label = document.createElement('span');
    label.textContent = field.label;

    const select = document.createElement('select');
    field.options.forEach((optionLabel) => {
      const opt = document.createElement('option');
      opt.value = optionValue(optionLabel);
      opt.textContent = optionLabel;
      select.appendChild(opt);
    });
    select.value = settings[field.key];
    select.addEventListener('change', () => {
      settings[field.key] = select.value;
      saveSettings();
      applySettings();
    });

    row.appendChild(label);
    row.appendChild(select);
    panel.appendChild(row);
  });

  const note = document.createElement('div');
  note.className = 'settings-note';
  note.textContent = 'Terminal settings are saved now and will take effect once that app is built.';
  panel.appendChild(note);

  contentEl.appendChild(panel);
}

document.getElementById('icon-settings').addEventListener('click', () => {
  openApp('settings', {
    title: 'Settings',
    width: 420,
    height: 420,
    x: 260,
    y: 110,
    build: buildSettingsApp,
  });
});

if (savedProgress && savedProgress.screen === 'desktop') {
  openDesktop();
}
