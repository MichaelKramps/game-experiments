// Jamie's Journal — a fake terminal into Jamie's encrypted journal.
// Each entry is locked behind a decryption key (a common 5-letter word).
// The player gets MAX_GUESSES tries per key; every guess reports how many
// letters it shares with the key and how many of those are in the right
// position. Running out rotates the key.

const MAX_GUESSES = 10;
const KEY_LEN = 5;
const STORAGE_KEY = 'jamies-journal-progress';
const GLYPHS = '▓▒░█▚▞';

const statusEl = document.getElementById('status');
const viewEl = document.getElementById('view');
const hintsEl = document.getElementById('hints');
const titleEl = document.getElementById('window-title');

// ---------------------------------------------------------------------------
// Progress: per entry (keyed by title) the current key, guesses so far and
// whether it's been decrypted. Saved so a refresh can't reset a bad run.

let progress = loadProgress();
retireOldKeys();

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // storage unavailable — progress lasts for this session only
  }
}

// Keys used to be 5-8 letters. Any locked entry still holding a key of another
// length gets a fresh one (its guesses and marks no longer apply).
function retireOldKeys() {
  let changed = false;
  for (const state of Object.values(progress)) {
    if (!state.unlocked && state.key.length !== KEY_LEN) {
      state.key = pickKey();
      state.guesses = [];
      state.marks = {};
      changed = true;
    }
  }
  if (changed) saveProgress();
}

function pickKey(avoid) {
  let key;
  do {
    key = KEY_WORDS[Math.floor(Math.random() * KEY_WORDS.length)];
  } while (key === avoid && KEY_WORDS.length > 1);
  return key;
}

function entryState(entry) {
  if (!progress[entry.title]) {
    progress[entry.title] = { key: pickKey(), guesses: [], unlocked: false };
    saveProgress();
  }
  return progress[entry.title];
}

// ---------------------------------------------------------------------------
// Guess scoring

function scoreGuess(guess, key) {
  const counts = {};
  for (const ch of key) counts[ch] = (counts[ch] || 0) + 1;
  // Each key letter can match at most one guess letter, so duplicates in the
  // guess only count as many times as they appear in the key.
  let letters = 0;
  for (const ch of guess) {
    if (counts[ch] > 0) {
      letters++;
      counts[ch]--;
    }
  }
  let placed = 0;
  for (let i = 0; i < key.length; i++) {
    if (guess[i] === key[i]) placed++;
  }
  return { letters, placed };
}

// ---------------------------------------------------------------------------
// Rendering helpers

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function line(text, className = '') {
  return el('div', `line ${className}`.trim(), text);
}

function gap() {
  return el('div', 'gap');
}

function setStatus(left, right) {
  statusEl.replaceChildren(el('span', '', left), el('span', '', right));
  titleEl.textContent = `${left.replace('jtaylor@fernway:', '')} — jtaylor — zsh`;
}

function setHints(hints) {
  hintsEl.replaceChildren(
    ...hints.map(([label, action]) => {
      if (!action) return el('span', '', label);
      const btn = el('button', '', label);
      btn.addEventListener('click', action);
      return btn;
    }),
  );
}

function fileName(index) {
  return `entry_${String(index + 1).padStart(2, '0')}.jrn`;
}

function scrambled(length) {
  let out = '';
  for (let i = 0; i < length; i++) out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  return out;
}

function unlockedCount() {
  return ENTRIES.filter((e) => progress[e.title]?.unlocked).length;
}

// ---------------------------------------------------------------------------
// Screens: 'list' → 'decrypt' → 'read'

let screen = 'list';
let selected = 0;
let typing = null; // active typewriter, so a keypress can skip it

function stopTyping() {
  if (typing) {
    typing.finish();
    typing = null;
  }
}

function showList() {
  stopTyping();
  screen = 'list';
  setStatus('jtaylor@fernway:~/journal', `${unlockedCount()}/${ENTRIES.length} decrypted`);
  setHints([
    ['[↑/↓] select', null],
    ['[enter] open', () => openEntry(selected)],
  ]);

  const list = el('ul', 'entry-list');
  ENTRIES.forEach((entry, i) => {
    const state = progress[entry.title];
    const unlocked = state?.unlocked;
    const row = el('li', `entry-row ${unlocked ? 'unlocked' : 'locked'}`);
    row.append(
      el('span', 'marker', i === selected ? '>' : ' '),
      el('span', 'num', String(i + 1).padStart(2, '0')),
      el('span', 'title', unlocked ? entry.title : scrambled(entry.title.length)),
      el('span', 'state', unlocked ? 'DECRYPTED' : state?.guesses.length ? `LOCKED ${MAX_GUESSES - state.guesses.length}/${MAX_GUESSES}` : 'LOCKED'),
    );
    if (i === selected) row.classList.add('selected');
    row.addEventListener('click', () => {
      if (selected === i) openEntry(i);
      else select(i);
    });
    list.append(row);
  });

  viewEl.replaceChildren(line('$ ls -l ~/journal', 'dim'), gap(), list);
  list.children[selected]?.scrollIntoView({ block: 'nearest' });
}

function select(i) {
  const rows = viewEl.querySelectorAll('.entry-row');
  rows[selected]?.classList.remove('selected');
  rows[selected]?.querySelector('.marker')?.replaceChildren(' ');
  selected = (i + ENTRIES.length) % ENTRIES.length;
  rows[selected]?.classList.add('selected');
  rows[selected]?.querySelector('.marker')?.replaceChildren('>');
  rows[selected]?.scrollIntoView({ block: 'nearest' });
}

function openEntry(i) {
  selected = i;
  if (entryState(ENTRIES[i]).unlocked) showRead(i, false);
  else showDecrypt(i);
}

function showDecrypt(i, messages = []) {
  stopTyping();
  screen = 'decrypt';
  const entry = ENTRIES[i];
  const state = entryState(entry);
  const left = MAX_GUESSES - state.guesses.length;

  setStatus(`jtaylor@fernway:~/journal/${fileName(i)}`, 'ENCRYPTED');
  setHints([
    ['[enter] submit key', null],
    ['[esc] back', showList],
  ]);

  const nodes = [
    line(`$ decrypt ${fileName(i)}`, 'dim'),
    gap(),
    line(`${fileName(i)} is encrypted.`),
    line(`key: common english word, ${KEY_LEN} letters`, 'dim'),
    line(`attempts remaining: ${left}/${MAX_GUESSES}`, left <= 3 ? 'warn' : ''),
    gap(),
  ];

  if (state.guesses.length) {
    const table = el('table', 'guess-table');
    const head = el('tr');
    ['#', 'GUESS', 'LETTERS', 'PLACED'].forEach((h) => head.append(el('th', '', h)));
    table.append(head);
    state.guesses.forEach((guess, n) => {
      const s = scoreGuess(guess, state.key);
      const row = el('tr');
      row.append(
        el('td', 'dim', String(n + 1)),
        el('td', '', guess.toUpperCase()),
        el('td', '', String(s.letters)),
        el('td', '', String(s.placed)),
      );
      table.append(row);
    });
    nodes.push(table);
  }

  messages.forEach(([text, cls]) => nodes.push(line(text, cls)));

  const prompt = el('label', 'prompt');
  const input = el('input');
  input.autocomplete = 'off';
  input.autocapitalize = 'off';
  input.spellcheck = false;
  input.maxLength = KEY_LEN;
  prompt.append(el('span', '', 'key>'), input);
  nodes.push(prompt);

  input.addEventListener('keydown', (e) => {
    // Stop here so the document handler doesn't also act on the next screen.
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      submitGuess(i, input.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      showList();
    }
  });

  const main = el('div', 'decrypt-main');
  main.append(...nodes);
  const layout = el('div', 'decrypt-layout');
  layout.append(main, buildLetterPanel(state));
  viewEl.replaceChildren(layout);
  main.scrollTop = main.scrollHeight;
  input.focus();
}

// Scratchpad for the player: each letter cycles neutral → out (red) → in.
// Marks belong to the current key and are cleared when the key rotates.
const MARK_CYCLE = { undefined: 'out', out: 'in', in: undefined };

function buildLetterPanel(state) {
  const panel = el('aside', 'letters');
  panel.append(el('div', 'letters-title dim', 'letters'));
  const grid = el('div', 'letters-grid');
  for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
    const btn = el('button', 'letter', ch.toUpperCase());
    btn.type = 'button';
    const apply = () => {
      const mark = state.marks?.[ch];
      btn.classList.toggle('out', mark === 'out');
      btn.classList.toggle('in', mark === 'in');
    };
    apply();
    // Keep focus in the key prompt while clicking letters.
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.marks = state.marks || {};
      const next = MARK_CYCLE[state.marks[ch]];
      if (next) state.marks[ch] = next;
      else delete state.marks[ch];
      saveProgress();
      apply();
    });
    grid.append(btn);
  }
  panel.append(grid);
  return panel;
}

function submitGuess(i, raw) {
  const guess = raw.trim().toLowerCase();
  const state = entryState(ENTRIES[i]);

  if (!/^[a-z]+$/.test(guess)) {
    showDecrypt(i, [['invalid key: letters only', 'warn']]);
    return;
  }
  if (guess.length !== KEY_LEN) {
    showDecrypt(i, [[`invalid key: must be ${KEY_LEN} letters`, 'warn']]);
    return;
  }
  if (state.guesses.includes(guess)) {
    showDecrypt(i, [[`already tried ${guess.toUpperCase()}`, 'warn']]);
    return;
  }

  state.guesses.push(guess);

  if (guess === state.key) {
    state.unlocked = true;
    saveProgress();
    showRead(i, true);
    return;
  }

  if (state.guesses.length >= MAX_GUESSES) {
    const oldKey = state.key;
    state.key = pickKey(oldKey);
    state.guesses = [];
    state.marks = {};
    saveProgress();
    showDenied(i, oldKey);
    return;
  }

  saveProgress();
  showDecrypt(i);
}

function showDenied(i, oldKey) {
  screen = 'denied';
  setStatus(`jtaylor@fernway:~/journal/${fileName(i)}`, 'LOCKED OUT');
  setHints([['[enter] back to journal', showList]]);
  viewEl.replaceChildren(
    line(`$ decrypt ${fileName(i)}`, 'dim'),
    gap(),
    line(`ACCESS DENIED — ${MAX_GUESSES} failed attempts.`, 'bad'),
    line(`the key was: ${oldKey.toUpperCase()}`),
    line('decryption key has been rotated.', 'dim'),
    gap(),
    line('press enter to return.', 'dim'),
  );
}

function showRead(i, fresh) {
  stopTyping();
  screen = 'read';
  const entry = ENTRIES[i];
  setStatus(`jtaylor@fernway:~/journal/${fileName(i)}`, 'DECRYPTED');
  setHints([['[esc] back', showList]]);

  const body = el('div', 'entry-body');
  const header = [line(`$ cat ${fileName(i)}`, 'dim'), gap()];
  if (fresh) header.unshift(line('KEY ACCEPTED. decrypting…'), gap());
  viewEl.replaceChildren(...header, line(`— ${entry.title} —`), gap(), body);

  const paragraphs = entry.body.map(() => body.appendChild(el('p')));
  if (!fresh) {
    entry.body.forEach((text, n) => (paragraphs[n].textContent = text));
    body.append(el('span', 'cursor'));
    return;
  }

  typewrite(entry.body, paragraphs, () => body.append(el('span', 'cursor')));
}

function typewrite(texts, nodes, done) {
  let p = 0;
  let c = 0;
  const cursor = el('span', 'cursor');
  const timer = setInterval(() => {
    if (p >= texts.length) return finish();
    c += 2;
    nodes[p].textContent = texts[p].slice(0, c);
    nodes[p].append(cursor);
    if (c >= texts[p].length) {
      nodes[p].textContent = texts[p];
      p++;
      c = 0;
    }
    viewEl.scrollTop = viewEl.scrollHeight;
  }, 18);

  function finish() {
    clearInterval(timer);
    cursor.remove();
    texts.forEach((t, n) => (nodes[n].textContent = t));
    typing = null;
    done();
  }

  typing = { finish };
}

// ---------------------------------------------------------------------------
// Keyboard (the decrypt screen's input handles its own keys)

document.addEventListener('keydown', (e) => {
  if (screen === 'list') {
    if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); select(selected - 1); }
    else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); select(selected + 1); }
    else if (e.key === 'Enter') { e.preventDefault(); openEntry(selected); }
  } else if (screen === 'read') {
    if (typing) { e.preventDefault(); stopTyping(); return; }
    if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); showList(); }
  } else if (screen === 'denied') {
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); showList(); }
  }
});

// Clicking anywhere on the decrypt screen keeps focus in the key prompt.
viewEl.addEventListener('click', () => {
  if (screen === 'decrypt') viewEl.querySelector('.prompt input')?.focus();
  else if (screen === 'read' && typing) stopTyping();
});

showList();
