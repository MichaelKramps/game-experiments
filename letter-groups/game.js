// Letter Groups — terminal UI. The player only ever types words; every other
// action is a single non-letter key shown in the footer legend.
//
// Nothing is saved to the browser: the board, bests and session stats live in
// memory and are gone on reload. The URL carries the seed so a board can be
// shared.

const LG = LetterGroups;
const FLASH_MS = 300;

const screenEl = document.getElementById('screen');
const kbEl = document.getElementById('kb');

// ---------------------------------------------------------------------------
// State

let board = null;
let mode = 'play'; // 'play' | 'seed' | 'solved'
let words = []; // accepted words this attempt: { w, mask, gained }
let covered = 0; // board mask of letters used so far
let input = ''; // lowercase
let seedBuf = '';
let messages = []; // [{ text, cls }]
let tabArmed = false;
let flashGroups = null;
let flashTimer = 0;

// Per puzzle: bests kept until the player moves on.
let puzzle = null;
let assisted = false; // this attempt used a hint or the reference answer

// Session stats, by board size name.
const session = { solved: 0, solves: 0, best: {} };

function newPuzzleRecord() {
  return { best: null, bestAssisted: null, solves: 0, answerSeen: false };
}

// ---------------------------------------------------------------------------
// Boards

function loadBoard(b) {
  board = b;
  puzzle = newPuzzleRecord();
  startAttempt();
  try {
    history.replaceState(null, '', `?seed=${b.code}`);
  } catch {
    // file:// pages can't rewrite the URL; the seed is still in the header
  }
}

function startAttempt() {
  mode = 'play';
  words = [];
  covered = 0;
  input = '';
  messages = [];
  tabArmed = false;
  assisted = puzzle.answerSeen;
}

function newBoard(presetKey) {
  const p = LG.SIZE_PRESETS[presetKey];
  loadBoard(p ? LG.generateInRange(p.min, p.max) : LG.generateInRange(8, 16));
}

function loadSeedCode(code) {
  const seed = LG.codeToSeed(code);
  const b = seed === null ? null : LG.generate(seed);
  if (!b) return false;
  loadBoard(b);
  return true;
}

const ch = (c) => c.charCodeAt(0) - 97;
const groupOfLetter = (c) => board.groupOf[ch(c)];
const bitOf = (c) => 1 << board.index[ch(c)];

function popcount(m) {
  let n = 0;
  for (; m; m &= m - 1) n++;
  return n;
}

// ---------------------------------------------------------------------------
// Playing

function typeLetter(c) {
  const g = groupOfLetter(c);
  const prev = input ? groupOfLetter(input[input.length - 1]) : -1;
  if (g < 0 || g === prev) {
    flash(prev);
    return;
  }
  input += c;
}

// Briefly light up the groups the player may type from.
function flash(blockedGroup) {
  flashGroups = [0, 1, 2, 3].filter((g) => g !== blockedGroup);
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    flashGroups = null;
    render();
  }, FLASH_MS);
}

function submit() {
  const word = input;
  const result = LG.checkWord(board, word);
  if (!result.ok) {
    messages = result.reason === 'short'
      ? [{ text: `Too short: words need at least ${LG.MIN_WORD} letters`, cls: 'warn' }]
      : [{ text: `Not a word: ${word.toUpperCase()}`, cls: 'warn' }];
    return;
  }
  const gained = popcount(result.mask & ~covered);
  words.push({ w: word, mask: result.mask, gained });
  covered |= result.mask;
  messages = [];
  if (covered === board.full) {
    solved();
    return;
  }
  input = '';
}

function undoWord() {
  if (!words.length) return;
  const gone = words.pop();
  covered = words.reduce((m, x) => m | x.mask, 0);
  input = '';
  messages = [{ text: `Undid ${gone.w.toUpperCase()}.` }];
}

function hint() {
  const plan = LG.solve(board, covered);
  if (!plan || !plan.length) {
    messages = [{ text: 'No solution found from here. Try undoing a word.', cls: 'warn' }];
    return;
  }
  assisted = true;
  const rest = plan.length === 1
    ? 'it finishes the puzzle'
    : `can finish in ${plan.length} words from here`;
  messages = [{ text: `Hint: ${plan[0].toUpperCase()}  (${rest})` }];
}

function revealReference() {
  puzzle.answerSeen = true;
  if (mode !== 'solved') assisted = true;
  messages.push({ text: `Reference answer: ${board.reference.map((w) => w.toUpperCase()).join(' + ')}` });
}

function solved() {
  mode = 'solved';
  input = '';
  const score = words.length;
  const key = assisted ? 'bestAssisted' : 'best';
  const prev = puzzle[key];
  const tag = assisted ? ' (assisted)' : '';
  let line = `Solved in ${plural(score, 'word')}${tag}.`;
  if (prev === null) {
    // first solve of this kind on this puzzle
  } else if (score < prev) {
    line += ` New ${assisted ? 'assisted ' : ''}best (was ${prev}).`;
  } else {
    line += ` ${assisted ? 'Assisted best' : 'Best'} is ${prev}.`;
  }
  if (prev === null || score < prev) puzzle[key] = score;

  if (puzzle.solves === 0) session.solved++;
  puzzle.solves++;
  session.solves++;
  const size = LG.sizeName(board.n);
  if (!assisted && (session.best[size] === undefined || score < session.best[size])) {
    session.best[size] = score;
  }

  const bests = ['small', 'standard', 'large']
    .map((s) => `${s} ${session.best[s] ?? '—'}`)
    .join(' · ');
  const avg = (session.solves / session.solved).toFixed(1).replace(/\.0$/, '');
  messages = [
    { text: line, cls: 'fg' },
    { text: `session  solved ${session.solved} · avg attempts ${avg} · best by size: ${bests}` },
  ];
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// ---------------------------------------------------------------------------
// Keys

function handleKey(key) {
  if (mode === 'seed') return seedKey(key);
  if (mode === 'solved') return solvedKey(key);

  if (key !== 'Tab') tabArmed = false;
  if (/^[a-zA-Z]$/.test(key)) {
    typeLetter(key.toLowerCase());
  } else if (key === 'Backspace') {
    if (input) input = input.slice(0, -1);
    else undoWord();
  } else if (key === 'Enter') {
    submit();
  } else if (key === '?') {
    hint();
  } else if (key === '!') {
    revealReference();
  } else if (key === '#') {
    mode = 'seed';
    seedBuf = '';
  } else if (key === 'Tab') {
    if (tabArmed) {
      newBoard();
    } else {
      tabArmed = true;
      messages = [{ text: 'Press Tab again to abandon this board for a new one.' }];
    }
  } else {
    return false;
  }
  return true;
}

function seedKey(key) {
  if (/^[a-zA-Z0-9]$/.test(key)) {
    if (seedBuf.length < LG.SEED_LEN) seedBuf += key.toUpperCase();
  } else if (key === 'Backspace') {
    seedBuf = seedBuf.slice(0, -1);
  } else if (key === 'Escape') {
    mode = 'play';
  } else if (key === 'Enter') {
    if (!loadSeedCode(seedBuf)) {
      mode = 'play';
      messages = [{ text: `Invalid seed: ${seedBuf || '(empty)'}`, cls: 'bad' }];
    }
  } else {
    return false;
  }
  return true;
}

function solvedKey(key) {
  const k = key.length === 1 ? key.toUpperCase() : key;
  if (k === 'Enter') {
    startAttempt();
  } else if (k === 'N') {
    newBoard();
  } else if (k === 'S' || k === 'M' || k === 'L') {
    newBoard(k);
  } else if (k === 'D') {
    revealReference();
  } else {
    return false;
  }
  return true;
}

kbEl.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (handleKey(e.key)) {
    e.preventDefault();
    render();
  } else if (e.key.length === 1 || e.key === 'Tab') {
    e.preventDefault();
  }
});

// Some phone keyboards send no usable key on keydown; read what they typed.
kbEl.addEventListener('input', () => {
  const typed = kbEl.value;
  kbEl.value = '';
  for (const c of typed) handleKey(c);
  render();
});

function focusKeyboard() {
  kbEl.focus({ preventScroll: true });
}

document.addEventListener('pointerup', focusKeyboard);
window.addEventListener('focus', focusKeyboard);

// ---------------------------------------------------------------------------
// Rendering

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function render() {
  const out = [];
  const size = LG.sizeName(board.n);
  out.push(`<div>letter-groups · seed <span class="fg">${board.code}</span> · ${size}</div>`);
  out.push('<div class="gap"></div>');

  // Highlight the group of the last letter typed: the one the next keystroke
  // can't come from.
  const lastLetter = input ? input[input.length - 1] : '';
  const current = lastLetter ? groupOfLetter(lastLetter) : -1;
  board.groups.forEach((g, gi) => {
    const cells = [];
    for (let i = 0; i < 4; i++) {
      const c = g[i];
      if (!c) cells.push('   ');
      else cells.push(`<span class="l${covered & bitOf(c) ? ' used' : ''}">${c.toUpperCase()}</span>  `);
    }
    const cls = ['group'];
    if (gi === current) cls.push('current');
    if (flashGroups && flashGroups.includes(gi)) cls.push('flash');
    out.push(`<div><span class="${cls.join(' ')}">${gi === current ? '>' : ' '} [ ${cells.join('')}]</span></div>`);
  });
  out.push('<div class="gap"></div>');

  const best = [];
  if (puzzle.best !== null) best.push(`<b>${puzzle.best}</b>`);
  if (puzzle.bestAssisted !== null && (puzzle.best === null || puzzle.bestAssisted < puzzle.best)) {
    best.push(`<b>${puzzle.bestAssisted}</b> (assisted)`);
  }
  out.push(
    `<div class="stat">  letters used  <b>${popcount(covered)}/${board.n}</b>      ` +
      `words  <b>${words.length}</b>      best  ${best.length ? best.join(' · ') : '—'}</div>`,
  );
  out.push('<div class="gap"></div>');

  if (words.length) {
    const width = Math.max(...words.map((x) => x.w.length));
    words.forEach((x, i) => {
      const num = String(i + 1).padStart(String(words.length).length + 2);
      out.push(`<div>${num}. <span class="word">${x.w.toUpperCase().padEnd(width)}</span>   +${x.gained}</div>`);
    });
    out.push('<div class="gap"></div>');
  }

  for (const m of messages) out.push(`<div class="${m.cls || ''}">  ${esc(m.text)}</div>`);
  if (messages.length) out.push('<div class="gap"></div>');

  out.push(`<div class="prompt">${promptLine()}</div>`);
  out.push('<div class="gap"></div>');
  out.push(`<div class="legend">${legend()}</div>`);
  screenEl.innerHTML = out.join('');
}

function promptLine() {
  const cursor = '<span class="cursor"></span>';
  if (mode === 'seed') return `  seed> <span class="typed">${seedBuf}</span>${cursor}`;
  if (mode === 'solved') return `  > ${cursor}`;
  return `  > <span class="typed">${input.toUpperCase()}</span>${cursor}`;
}

function legend() {
  const items = {
    play: [
      ['?', '[?] hint'],
      ['!', '[!] reveal'],
      ['#', '[#] enter seed'],
      ['Backspace', '[Backspace] undo word'],
      ['Tab', '[Tab Tab] new puzzle'],
    ],
    seed: [
      ['Enter', '[Enter] load seed'],
      ['Escape', '[Esc] cancel'],
    ],
    solved: [
      ['Enter', '[Enter] retry'],
      ['N', '[N] new puzzle'],
      ['S/M/L', '[S/M/L] new small/standard/large'],
      ['D', '[D] show reference answer'],
    ],
  }[mode];
  return items.map(([key, label]) => (key === 'S/M/L' ? sizeButtons() : `<button data-key="${key}">${label}</button>`)).join('');
}

function sizeButtons() {
  const b = (key, label) => `<button data-key="${key}">${label}</button>`;
  return `<span>[S/M/L] new ${b('S', 'small')}/${b('M', 'standard')}/${b('L', 'large')}</span>`;
}

// Legend entries are clickable too, for players without a keyboard.
screenEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-key]');
  if (!btn) return;
  handleKey(btn.dataset.key);
  render();
});

// ---------------------------------------------------------------------------
// Start: a seed from the URL, or a fresh random board.

(() => {
  const code = new URLSearchParams(location.search).get('seed');
  if (!code || !loadSeedCode(code)) {
    newBoard();
    if (code) messages = [{ text: `Invalid seed: ${code}`, cls: 'bad' }];
  }
  render();
  focusKeyboard();
})();
