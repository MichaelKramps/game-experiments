// diff guess key: a word-guessing game in a fake terminal. Guess the 5-letter key (a common
// English word). Every guess shows which of its letters aren't in the key (in
// red). Each game starts with TOLERANCE points; a wrong guess costs one point
// per red letter, or 1 if it has none. Run out and the key is revealed.

const TOLERANCE = 15;
const KEY_LEN = 5;
const STORAGE_KEY = 'jamies-journal-game';
const LEGACY_STORAGE_KEY = 'jamies-journal-progress'; // the old journal's progress

// Shown on the rules screen, one line each ('' for a blank line).
const RULES = [
  'Guess the 5 letter word before your tolerance reaches 0.',
  '',
  'Each wrong letter in your guess costs 1 tolerance.',
  '',
  'If your letters are all correct, but the guess is wrong, you lose 1 tolerance.',
  '',
  'If your tolerance reaches 0, you lose.',
];

const statusEl = document.getElementById('status');
const viewEl = document.getElementById('view');
const hintsEl = document.getElementById('hints');
const titleEl = document.getElementById('window-title');

// The shell's look follows the site's OS setting (../os/os.js): prompts,
// paths, commands and the window title all change with it.
const USER = 'kramps';
const HOST = 'dgk';
const COMMAND = 'diff guess key';
const shell = (cmd) => `${KG.prompt(USER, HOST, '~')}${cmd}`;

// ---------------------------------------------------------------------------
// Saved state: the game in progress (so a refresh can't reset a bad run) and
// the win/streak stats.

let saved = loadSaved();
let lastKey = null; // the previous game's key, so a new game doesn't repeat it

function loadSaved() {
  let data = null;
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    data = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    // storage unavailable or corrupt: start fresh
  }
  return {
    game: data?.game ?? null,
    stats: { played: 0, wins: 0, streak: 0, best: 0, ...data?.stats },
  };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // storage unavailable — progress lasts for this session only
  }
}

// Guesses must be real words: any answer, or a word from guesses.js.
const VALID_GUESSES = new Set([...KEY_WORDS, ...EXTRA_GUESS_WORDS]);

function pickKey(avoid) {
  let key;
  do {
    key = KEY_WORDS[Math.floor(Math.random() * KEY_WORDS.length)];
  } while (key === avoid && KEY_WORDS.length > 1);
  return key;
}

function currentGame() {
  if (!saved.game) {
    saved.game = { key: pickKey(lastKey), guesses: [], marks: {} };
    save();
  }
  return saved.game;
}

// ---------------------------------------------------------------------------
// Guess scoring

// Which of the guess's letters aren't in the key (shown in red). Copies of a
// letter are matched left to right, so extra copies beyond what the key holds
// are misses. Nothing here depends on position: the game never tells you
// which letters are in the right spot.
function missMask(guess, key) {
  const counts = {};
  for (const ch of key) counts[ch] = (counts[ch] || 0) + 1;
  return [...guess].map((ch) => {
    if (counts[ch] > 0) {
      counts[ch]--;
      return false;
    }
    return true;
  });
}

// A guess costs one point per red letter. A wrong guess with no red letters
// (the key's letters in the wrong order) costs 1, so rearranging isn't free.
function guessCost(guess, key) {
  if (guess === key) return 0;
  return missMask(guess, key).filter(Boolean).length || 1;
}

// Tolerance is worked out from the saved guesses rather than stored.
function spent(game) {
  return game.guesses.reduce((sum, g) => sum + guessCost(g, game.key), 0);
}

function toleranceLeft(game) {
  return Math.max(0, TOLERANCE - spent(game));
}

function toleranceBar(left) {
  return `[${'█'.repeat(left)}${'░'.repeat(TOLERANCE - left)}] ${left}/${TOLERANCE}`;
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

function setStatus(right) {
  const left = KG.pick({ value: KG.path(`C:/Users/${USER}`), power: `${USER}@${HOST}:~` });
  statusEl.replaceChildren(el('span', '', left), el('span', '', right));
  titleEl.textContent = KG.pick({
    value: `Terminal — ${COMMAND}`,
    quality: `${COMMAND} — ${USER} — zsh`,
    power: `${USER}@${HOST}: ~`,
  });
}

// Each hint is [label, key, action], shown as "Label - Key" and clickable.
function setHints(hints) {
  hintsEl.replaceChildren(
    ...hints.map(([label, key, action]) => {
      const btn = el('button', '', `${label} - ${key}`);
      btn.addEventListener('click', () => action());
      return btn;
    }),
  );
}

function statsLine() {
  const { wins, streak, best } = saved.stats;
  return line(`wins ${wins} · streak ${streak} · best ${best}`, 'dim');
}

function guessTable(game) {
  const table = el('table', 'guess-table');
  const head = el('tr');
  ['#', 'GUESS', 'COST'].forEach((h) => head.append(el('th', '', h)));
  table.append(head);
  game.guesses.forEach((guess, n) => {
    const cost = guessCost(guess, game.key);
    const word = el('td');
    const miss = missMask(guess, game.key);
    [...guess.toUpperCase()].forEach((ch, c) => word.append(el('span', miss[c] ? 'bad' : '', ch)));
    const row = el('tr');
    row.append(el('td', 'dim', String(n + 1)), word, el('td', 'dim', cost ? `−${cost}` : '0'));
    table.append(row);
  });
  return table;
}

// ---------------------------------------------------------------------------
// Screens: 'play' ⇄ 'rules', 'play' → 'end' → 'play'

let screen = 'play';
let redraw = null; // repaints the current screen when the OS setting changes

function showRules() {
  screen = 'rules';
  redraw = showRules;
  setStatus('');
  setHints([['Play', 'Tab', showPlay]]);
  viewEl.replaceChildren(
    line(shell('diff --help'), 'dim'),
    gap(),
    ...RULES.map((text) => (text ? line(text) : gap())),
  );
}

// The default screen. Resumes the game in progress, or starts one.
function showPlay(messages = []) {
  screen = 'play';
  redraw = () => showPlay(messages);
  const game = currentGame();
  const left = toleranceLeft(game);

  setStatus(`streak ${saved.stats.streak}`);
  setHints([
    ['Submit', 'Enter', () => submitGuess(viewEl.querySelector('.prompt input')?.value ?? '')],
    ['Rules', 'Tab', showRules],
  ]);

  const nodes = [
    line(shell(COMMAND), 'dim'),
    gap(),
    line(`key: common english word, ${KEY_LEN} letters`, 'dim'),
    line(`tolerance: ${toleranceBar(left)}`, left <= KEY_LEN ? 'warn' : ''),
    gap(),
  ];
  if (game.guesses.length) nodes.push(guessTable(game));
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
      submitGuess(input.value);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      showRules();
    }
  });

  const main = el('div', 'decrypt-main');
  main.append(...nodes);
  const layout = el('div', 'decrypt-layout');
  layout.append(main, buildLetterPanel(game));
  viewEl.replaceChildren(layout);
  main.scrollTop = main.scrollHeight;
  input.focus();
}

// Scratchpad for the player: each letter cycles neutral → out (red) → in.
// Marks belong to the current game.
const MARK_CYCLE = { undefined: 'out', out: 'in', in: undefined };

function buildLetterPanel(game) {
  const panel = el('aside', 'letters');
  panel.append(el('div', 'letters-title dim', 'letters'));
  const grid = el('div', 'letters-grid');
  for (const ch of 'abcdefghijklmnopqrstuvwxyz') {
    const btn = el('button', 'letter', ch.toUpperCase());
    btn.type = 'button';
    const apply = () => {
      const mark = game.marks?.[ch];
      btn.classList.toggle('out', mark === 'out');
      btn.classList.toggle('in', mark === 'in');
    };
    apply();
    // Keep focus in the key prompt while clicking letters.
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      game.marks = game.marks || {};
      const next = MARK_CYCLE[game.marks[ch]];
      if (next) game.marks[ch] = next;
      else delete game.marks[ch];
      save();
      apply();
    });
    grid.append(btn);
  }
  panel.append(grid);
  return panel;
}

function submitGuess(raw) {
  const guess = raw.trim().toLowerCase();
  const game = currentGame();

  if (!/^[a-z]+$/.test(guess)) return showPlay([['invalid key: letters only', 'warn']]);
  if (guess.length !== KEY_LEN) return showPlay([[`invalid key: must be ${KEY_LEN} letters`, 'warn']]);
  if (!VALID_GUESSES.has(guess)) return showPlay([[`not in word list: ${guess.toUpperCase()}`, 'warn']]);
  if (game.guesses.includes(guess)) return showPlay([[`already tried ${guess.toUpperCase()}`, 'warn']]);

  game.guesses.push(guess);

  if (guess === game.key) return endGame(true);
  if (spent(game) >= TOLERANCE) return endGame(false);

  save();
  showPlay();
}

function endGame(won) {
  const game = saved.game;
  const stats = saved.stats;
  stats.played++;
  if (won) {
    stats.wins++;
    stats.streak++;
    stats.best = Math.max(stats.best, stats.streak);
  } else {
    stats.streak = 0;
  }
  lastKey = game.key;
  saved.game = null;
  save();
  showEnd(game, won);
}

function showEnd(game, won) {
  screen = 'end';
  redraw = () => showEnd(game, won);
  setStatus(won ? 'DECRYPTED' : 'LOCKED OUT');
  setHints([['Play Again', 'Enter', showPlay]]);
  const key = game.key.toUpperCase();
  viewEl.replaceChildren(
    line(shell(COMMAND), 'dim'),
    gap(),
    guessTable(game),
    gap(),
    ...(won
      ? [line('KEY ACCEPTED.'), line(`key: ${key}`), line(`tolerance left: ${toleranceLeft(game)}/${TOLERANCE}`, 'dim')]
      : [line('ACCESS DENIED — tolerance exhausted.', 'bad'), line(`the key was: ${key}`)]),
    gap(),
    statsLine(),
  );
}

// ---------------------------------------------------------------------------
// Keyboard (the play screen's input handles its own keys)

document.addEventListener('keydown', (e) => {
  if (screen === 'rules') {
    if (e.key === 'Tab') { e.preventDefault(); showPlay(); }
  } else if (screen === 'end') {
    if (e.key === 'Enter') { e.preventDefault(); showPlay(); }
  }
});

// Clicking anywhere on the play screen keeps focus in the key prompt.
viewEl.addEventListener('click', () => {
  if (screen === 'play') viewEl.querySelector('.prompt input')?.focus();
});

KG.onChange(() => redraw?.());

showPlay();
