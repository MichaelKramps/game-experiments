// CorrMail — sample email client shell.
// This is the UI foundation the game will be built on top of: folders,
// a message list, a reading pane, and a compose flow, all driven by
// an in-memory array of messages (no backend/persistence yet).

const FOLDERS = [
  { id: 'inbox', label: 'Inbox', unmaskedLabel: 'Correspondence' },
  { id: 'starred', label: 'Starred', unmaskedLabel: 'Encrypted Files' },
  { id: 'sent', label: 'Sent', unmaskedLabel: 'Decrypted Files' },
  { id: 'drafts', label: 'Drafts', unmaskedLabel: 'Leads' },
  { id: 'archive', label: 'Archive', unmaskedLabel: 'Corr Specs' },
  { id: 'trash', label: 'Trash', unmaskedLabel: 'Status' },
];

const CORR_EMAIL = 'corr@corrmail.local';
const CORR_SPECS_EMAIL = 'specs@corrmail.local';

// Governs how long decrypts take, in bytes/sec. Revealed to the player via
// the Corr Specs report sent the first time they hit Decrypt.
const DECRYPTION_SPEED_BPS = 100;

const CIPHER_TEXT = "j3K#0zXpL9$mQ2&vD7^nR4*wA1@sC8!yT5rF0eB3cN6hG9%bK2jM5oI8uY1tR4qW7\n" +
  "84xZ#1lV6@qE3!oA9$sN2&fT5^dP8*gK0mJ7hR4bC1wY6uI3xZ0nQ9vL2eS5rF8\n\n" +
  "Δ█▓▒░⌐¬½¼¡«»§¶•ªº≠±\n\n" +
  "[ corrupted // checksum mismatch ]";

let corrSpecsSent = false;

let emails = [
  {
    id: 1,
    folder: 'inbox',
    from: 'Corr',
    fromEmail: 'corr@corrmail.local',
    to: 'you@corrmail.io',
    subject: 'is anyone there',
    time: 'Just now',
    timestamp: 0,
    read: false,
    starred: false,
    body: "please. if you're there. say something back.",
  },
];

let activeFolder = 'inbox';
let selectedId = null;
let replyContext = null;

const foldersEl = document.getElementById('folders');
const listEl = document.getElementById('list');
const readingEl = document.getElementById('reading');
const searchEl = document.getElementById('search');
const composeOverlay = document.getElementById('compose-overlay');
const composeTo = document.getElementById('compose-to');
const composeSubject = document.getElementById('compose-subject');
const composeBody = document.getElementById('compose-body');
const textMaskToggle = document.getElementById('toggle-textmask');

function nextEmailId() {
  return Math.max(0, ...emails.map((e) => e.id)) + 1;
}

function formatFileSize(kb) {
  if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`;
  return `${kb.toFixed(1)} kB`;
}

function formatDuration(seconds) {
  if (seconds >= 60) return `${(seconds / 60).toFixed(1)} min`;
  return `${Math.round(seconds)} sec`;
}

function decryptLabel(e) {
  const seconds = (e.fileSizeKB * 1000) / DECRYPTION_SPEED_BPS;
  return `Decrypt ${formatFileSize(e.fileSizeKB)} (${formatDuration(seconds)})`;
}

function animateDecryptFill(e) {
  const fill = document.getElementById('decrypt-fill');
  if (!fill) return;

  const elapsed = Date.now() - e.decryptStartedAt;
  const remainingMs = Math.max(0, e.decryptDurationMs - elapsed);
  const percent = Math.min(100, (elapsed / e.decryptDurationMs) * 100);

  fill.style.transition = 'none';
  fill.style.width = `${percent}%`;
  fill.offsetWidth; // force reflow so the browser registers the start width before animating
  fill.style.transition = `width ${remainingMs / 1000}s linear`;
  fill.style.width = '100%';
}

function folderCount(id) {
  if (id === 'starred') return emails.filter((e) => e.starred).length;
  if (id === 'inbox') return emails.filter((e) => e.folder === 'inbox' && !e.read).length;
  return emails.filter((e) => e.folder === id).length;
}

function folderHasUnread(id) {
  if (id === 'starred') return emails.some((e) => e.starred && !e.read);
  return emails.some((e) => e.folder === id && !e.read);
}

function visibleEmails() {
  const query = searchEl.value.trim().toLowerCase();
  let list = activeFolder === 'starred'
    ? emails.filter((e) => e.starred)
    : emails.filter((e) => e.folder === activeFolder);

  if (query) {
    list = list.filter((e) =>
      e.subject.toLowerCase().includes(query) ||
      e.from.toLowerCase().includes(query) ||
      e.body.toLowerCase().includes(query)
    );
  }
  return list.slice().sort((a, b) => b.timestamp - a.timestamp);
}

function renderFolders() {
  foldersEl.innerHTML = '';
  FOLDERS.forEach((f) => {
    const div = document.createElement('div');
    div.className = 'folder' + (f.id === activeFolder ? ' active' : '') + (folderHasUnread(f.id) ? ' unread' : '');
    const count = folderCount(f.id);
    const label = textMaskToggle.checked ? f.label : f.unmaskedLabel;
    div.innerHTML = `<span>${label}</span>` + (count ? `<span class="count">${count}</span>` : '');
    div.addEventListener('click', () => {
      activeFolder = f.id;
      selectedId = null;
      renderAll();
    });
    foldersEl.appendChild(div);
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
        <div class="row1"><span class="sender">${escapeHtml(e.from)}</span><span class="time">${escapeHtml(e.time)}</span></div>
        <div class="subject">${escapeHtml(e.subject)}</div>
        <div class="snippet">${escapeHtml(e.body.slice(0, 60).replace(/\n/g, ' '))}</div>
      </div>
      <div class="star ${e.starred ? 'on' : ''}">★</div>
    `;
    row.addEventListener('click', () => {
      selectedId = e.id;
      e.read = true;
      renderAll();
    });
    row.querySelector('.star').addEventListener('click', (evt) => {
      evt.stopPropagation();
      e.starred = !e.starred;
      renderAll();
    });
    listEl.appendChild(row);
  });
}

function renderReading() {
  const e = emails.find((m) => m.id === selectedId);
  if (!e) {
    readingEl.innerHTML = '<div class="placeholder">Select a message to read it.</div>';
    return;
  }

  const actionsHtml = e.encrypted
    ? (e.decrypting
      ? `<button id="act-decrypt" class="decrypting" disabled><span class="fill" id="decrypt-fill"></span><span class="label">Decrypting…</span></button>`
      : `<button id="act-decrypt" class="primary">${escapeHtml(decryptLabel(e))}</button>`)
    : `
      <button id="act-reply" class="primary">Reply</button>
      <button id="act-archive">Archive</button>
      <button id="act-danger" class="danger">${e.folder === 'trash' ? 'Delete forever' : 'Delete'}</button>
    `;

  readingEl.innerHTML = `
    <h2>${escapeHtml(e.subject)}</h2>
    <div class="headers">
      <div>
        <div class="from">${escapeHtml(e.from)} &lt;${escapeHtml(e.fromEmail)}&gt;</div>
        <div class="to">to ${escapeHtml(e.to)}</div>
      </div>
      <div class="date">${escapeHtml(e.time)}</div>
    </div>
    <div class="content${e.encrypted ? ' cipher' : ''}">${escapeHtml(e.body)}</div>
    <div class="actions">${actionsHtml}</div>
  `;

  if (e.encrypted) {
    if (e.decrypting) {
      animateDecryptFill(e);
    } else {
      readingEl.querySelector('#act-decrypt').addEventListener('click', () => startDecryption(e));
    }
    return;
  }

  readingEl.querySelector('#act-reply').addEventListener('click', () => openCompose({
    to: e.fromEmail,
    subject: e.subject.startsWith('Re:') ? e.subject : `Re: ${e.subject}`,
    body: '',
  }));
  readingEl.querySelector('#act-archive').addEventListener('click', () => {
    e.folder = 'archive';
    selectedId = null;
    renderAll();
  });
  readingEl.querySelector('#act-danger').addEventListener('click', () => {
    if (e.folder === 'trash') {
      emails = emails.filter((m) => m.id !== e.id);
    } else {
      e.folder = 'trash';
    }
    selectedId = null;
    renderAll();
  });
}

function renderAll() {
  renderFolders();
  renderList();
  renderReading();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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

document.getElementById('compose-send').addEventListener('click', () => {
  const to = composeTo.value.trim();
  const subject = composeSubject.value.trim();
  const body = composeBody.value.trim();
  if (!to || !subject) return;

  const isReplyToCorr = to.toLowerCase() === CORR_EMAIL;

  if (isReplyToCorr) {
    closeCompose();
    triggerCorrStoryBeat();
    return;
  }

  const nextId = nextEmailId();
  emails.push({
    id: nextId,
    folder: 'sent',
    from: 'you@corrmail.io',
    fromEmail: 'you@corrmail.io',
    to,
    subject,
    time: 'Just now',
    timestamp: Date.now() / 1000000,
    read: true,
    starred: false,
    body,
  });

  closeCompose();
  activeFolder = 'sent';
  selectedId = nextId;
  renderAll();
});

function triggerCorrStoryBeat() {
  emails.push({
    id: nextEmailId(),
    folder: 'inbox',
    from: 'Corr',
    fromEmail: CORR_EMAIL,
    to: 'you@corrmail.io',
    subject: 'Re: is anyone there',
    time: 'Just now',
    timestamp: Date.now() / 1000000,
    read: false,
    starred: false,
    body: 'overwhelming relief. i need help. sending an encrypted file.',
  });
  renderAll();

  setTimeout(() => {
    emails.push({
      id: nextEmailId(),
      folder: 'vault',
      from: '????',
      fromEmail: '????',
      to: 'you@corrmail.io',
      subject: '????',
      time: 'Just now',
      timestamp: Date.now() / 1000000,
      read: false,
      starred: true,
      encrypted: true,
      fileSizeKB: 1.1,
      body: CIPHER_TEXT,
    });
    renderAll();
  }, 3000);
}

function sendSpecsRevealEmails() {
  emails.push({
    id: nextEmailId(),
    folder: 'archive',
    from: 'CorrSpecs',
    fromEmail: CORR_SPECS_EMAIL,
    to: 'you@corrmail.io',
    subject: 'Corr Hardware Specs Report',
    time: 'Just now',
    timestamp: Date.now() / 1000000,
    read: false,
    starred: false,
    body: `Corr decryption speed: ${DECRYPTION_SPEED_BPS} bytes/sec\n\n` +
      'Corr Hardware:\n' +
      'Processor: Intel 8088 @ 4.77 MHz\n' +
      'Motherboard: IBM 5150 System Board (1981)\n' +
      'Memory: 16 KB RAM\n' +
      'Power: 63.5W Power Supply\n' +
      'Storage: 160KB 5.25" Floppy Disk Drive\n' +
      'Graphics Processor: none',
  });

  emails.push({
    id: nextEmailId(),
    folder: 'inbox',
    from: 'Corr',
    fromEmail: CORR_EMAIL,
    to: 'you@corrmail.io',
    subject: 'about the decryption',
    time: 'Just now',
    timestamp: Date.now() / 1000000,
    read: false,
    starred: false,
    body: 'i can decrypt files. initiate this from CorrMail.\n\n' +
      'my hardware and decryption algorithm are old. improve them to increase decryption speed.',
  });
}

function startDecryption(e) {
  if (e.decrypting) return;
  e.decrypting = true;

  if (!corrSpecsSent) {
    corrSpecsSent = true;
    sendSpecsRevealEmails();
  }

  const seconds = (e.fileSizeKB * 1000) / DECRYPTION_SPEED_BPS;
  e.decryptStartedAt = Date.now();
  e.decryptDurationMs = seconds * 1000;
  setTimeout(() => completeDecryption(e.id), seconds * 1000);

  renderAll();
}

function completeDecryption(emailId) {
  emails = emails.filter((e) => e.id !== emailId);
  emails.push({
    id: nextEmailId(),
    folder: 'sent',
    from: '????',
    fromEmail: '????',
    to: 'you@corrmail.io',
    subject: '????',
    time: 'Just now',
    timestamp: Date.now() / 1000000,
    read: false,
    starred: false,
    body: 'file was decrypted',
  });
  if (selectedId === emailId) selectedId = null;
  renderAll();
}

searchEl.addEventListener('input', renderList);
textMaskToggle.addEventListener('change', renderFolders);

renderAll();
