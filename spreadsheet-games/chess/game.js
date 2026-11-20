// Spreadsheet Chess: chess against the computer in a spreadsheet window. The
// board is B2:I9 on the Budget tab (file letters in row 1, rank numbers in
// column A) and the moves are logged on the Moves tab. Rules come from chess.js (lib/, BSD-2-Clause);
// the computer is Stockfish (engine/, GPLv3) running in a Web Worker.
// See DESIGN.md.

import { Chess } from './lib/chess.js';

const LEVELS = {
  // skill: Stockfish's Skill Level (0–20), with depth limiting the search.
  // elo: Stockfish's calibrated strength limit (UCI_Elo), for Hard and custom.
  easy: { name: 'Easy', skill: 0, go: 'go depth 1' },
  medium: { name: 'Medium', skill: 6, go: 'go depth 6' },
  hard: { name: 'Hard', elo: 2000, go: 'go movetime 1000' },
};
// Custom levels are 'elo-<rating>'; the engine's UCI_Elo range.
const ELO = { min: 1320, max: 3190 };
const eloOk = (n) => Number.isInteger(n) && n >= ELO.min && n <= ELO.max;
const customElo = (id) => {
  const m = /^elo-(\d+)$/.exec(id || '');
  return m && eloOk(+m[1]) ? +m[1] : null;
};
const levelOk = (id) => id in LEVELS || customElo(id) !== null;
function level(id) {
  if (id in LEVELS) return LEVELS[id];
  const elo = customElo(id);
  return { name: `Custom ${elo}`, elo, go: 'go movetime 1000' };
}
const MIN_THINK = 450; // ms: the computer never answers faster than this
const KEY = 'spreadsheet-chess'; // the game; + '-settings', '-record', '-window'

const GLYPHS = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};
// How pieces are shown, from the Pieces menu: letters (K, q…), points (piece
// values, Black's negative), or icons (chess symbols).
const PIECES = ['letters', 'points', 'icons'];
const POINTS = { p: '1', n: '3', b: '3.1', r: '5', q: '9', k: '100' };
const NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const COLOR = { w: 'White', b: 'Black' };
const FILES = 'abcdefgh';

// The Moves tab's columns
const LOG_NUM = 0; // A
const LOG_W = 1; // B
const LOG_B = 2; // C

const $ = (id) => document.getElementById(id);
const grid = $('grid');
const wrap = $('wrap');
const win = $('sheet');

// -----------------------------------------------------------------------------
// Storage (all optional: the game works without it)

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable — the game lasts for this page only
  }
}

// -----------------------------------------------------------------------------
// Settings and game state
//
// settings: { level, side, pieces, elo } — side is what the next new game uses;
// pieces is how pieces are shown (see PIECES); elo is the last custom rating.
// g: { side, level, moves: [san…], result: null | { winner: 'w'|'b'|null, reason }, counted }

const settings = { level: 'medium', side: 'w', pieces: 'letters', ...(read(`${KEY}-settings`) || {}) };
if (settings.icons === true) settings.pieces = 'icons'; // from the old on/off Icons button
delete settings.icons;
delete settings.letters; // from before letters became the default
if (!levelOk(settings.level)) settings.level = 'medium';
if (!eloOk(settings.elo)) delete settings.elo;
if (settings.side !== 'w' && settings.side !== 'b') settings.side = 'w';
if (!PIECES.includes(settings.pieces)) settings.pieces = 'letters';

let g;
let chess = new Chess();

function fresh() {
  return { side: settings.side, level: settings.level, moves: [], result: null, counted: false };
}

function load() {
  const s = read(KEY);
  g = fresh();
  chess = new Chess();
  if (!s || (s.side !== 'w' && s.side !== 'b') || !levelOk(s.level) || !Array.isArray(s.moves)) return;
  const c = new Chess();
  try {
    for (const san of s.moves) c.move(san);
  } catch {
    return; // a broken save: start over
  }
  g = { side: s.side, level: s.level, moves: c.history(), result: null, counted: !!s.counted };
  chess = c;
  g.result = resultOf();
}

function save() {
  write(KEY, g);
  write(`${KEY}-settings`, settings);
}

function resultOf() {
  if (chess.isCheckmate()) return { winner: chess.turn() === 'w' ? 'b' : 'w', reason: 'checkmate' };
  if (chess.isStalemate()) return { winner: null, reason: 'stalemate' };
  if (chess.isInsufficientMaterial()) return { winner: null, reason: 'insufficient material' };
  if (chess.isThreefoldRepetition()) return { winner: null, reason: 'repetition' };
  if (chess.isDrawByFiftyMoves()) return { winner: null, reason: 'the 50-move rule' };
  return null;
}

const over = () => !!g.result;
const myTurn = () => !over() && chess.turn() === g.side;

// Win/loss/draw counts per level, for finished games only.
function record(level) {
  const r = read(`${KEY}-record`) || {};
  return { w: 0, l: 0, d: 0, ...(r[level] || {}) };
}
function count() {
  if (!g.result || g.counted) return;
  const all = read(`${KEY}-record`) || {};
  const r = record(g.level);
  if (!g.result.winner) r.d++;
  else if (g.result.winner === g.side) r.w++;
  else r.l++;
  all[g.level] = r;
  write(`${KEY}-record`, all);
  g.counted = true;
}

// -----------------------------------------------------------------------------
// The computer: Stockfish in a Web Worker, spoken to in UCI.

const engine = (() => {
  let worker = null;
  let ready = false;
  let failed = false;
  let queue = []; // commands sent before the engine is ready
  let waiters = []; // one per `go`, resolved by its `bestmove`

  const fail = () => {
    failed = true;
    for (const w of waiters) w(null);
    waiters = [];
    render();
  };
  try {
    worker = new Worker('engine/stockfish.js');
    worker.onmessage = (e) => {
      const line = String(e.data);
      if (line === 'uciok') {
        ready = true;
        for (const c of queue) worker.postMessage(c);
        queue = [];
      } else if (line.startsWith('bestmove')) {
        const move = line.split(' ')[1];
        waiters.shift()?.(move && move !== '(none)' ? move : null);
      }
    };
    worker.onerror = fail;
    worker.postMessage('uci');
  } catch {
    failed = true;
  }

  const send = (c) => {
    if (failed) return;
    if (ready) worker.postMessage(c);
    else queue.push(c);
  };

  return {
    get failed() {
      return failed;
    },
    newGame() {
      send('ucinewgame');
    },
    // The engine's move for this position, as UCI text (e.g. "e7e8q"), or null.
    best(fen, level) {
      if (failed) return Promise.resolve(null);
      return new Promise((resolve) => {
        waiters.push(resolve);
        if (level.elo) {
          send('setoption name UCI_LimitStrength value true');
          send(`setoption name UCI_Elo value ${level.elo}`);
        } else {
          send('setoption name UCI_LimitStrength value false');
          send(`setoption name Skill Level value ${level.skill}`);
        }
        send(`position fen ${fen}`);
        send(level.go);
      });
    },
    stop() {
      send('stop');
    },
  };
})();

let thinking = false;
let thinkToken = 0; // bumped to ignore a search that's no longer wanted

async function computerMove() {
  if (over() || myTurn() || thinking) return;
  thinking = true;
  const token = ++thinkToken;
  render();
  const started = Date.now();
  const uci = await engine.best(chess.fen(), level(g.level));
  const wait = MIN_THINK - (Date.now() - started);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  if (token !== thinkToken) return; // undone or a new game meanwhile
  thinking = false;
  if (!uci) {
    render();
    return;
  }
  play({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}

function cancelThinking() {
  if (!thinking) return;
  thinking = false;
  thinkToken++;
  engine.stop();
}

// -----------------------------------------------------------------------------
// Moves

let picked = null; // the square of the player's picked piece
let targets = []; // its legal moves (chess.js verbose moves)
let last = null; // { from, to } of the last move

function play(move) {
  let m;
  try {
    m = chess.move(move);
  } catch {
    return;
  }
  g.moves.push(m.san);
  last = { from: m.from, to: m.to };
  picked = null;
  targets = [];
  g.result = resultOf();
  count();
  save();
  ensureRows();
  render();
  if (!over() && !myTurn()) computerMove();
}

function pick(square) {
  picked = square;
  targets = chess.moves({ square, verbose: true });
}

function unpick() {
  picked = null;
  targets = [];
}

// A click (or Enter) on a board square.
function act(square) {
  closePromo();
  if (!myTurn() || thinking) return;
  const piece = chess.get(square);
  if (picked) {
    const options = targets.filter((m) => m.to === square);
    if (options.length) {
      if (options.length > 1) showPromo(square, options); // a pawn reaching the far rank
      else play({ from: picked, to: square });
      return;
    }
  }
  if (piece && piece.color === g.side && square !== picked) pick(square);
  else unpick();
  render();
}

// Has the player made a move yet? (As Black, the computer's first move doesn't count.)
const playerMoved = () => chess.history().length > (g.side === 'b' ? 1 : 0);

function undo() {
  if (!playerMoved()) return;
  closePromo();
  cancelThinking();
  // Take back the computer's reply (if any) and your move before it.
  do chess.undo();
  while (chess.history().length && chess.turn() !== g.side);
  g.moves = chess.history();
  g.result = null;
  g.counted = false;
  const h = chess.history({ verbose: true });
  last = h.length ? { from: h[h.length - 1].from, to: h[h.length - 1].to } : null;
  unpick();
  save();
  render();
  if (!myTurn()) computerMove(); // you're Black and undid your first move
}

function newGame() {
  closePromo();
  cancelThinking();
  g = fresh();
  chess = new Chess();
  last = null;
  unpick();
  engine.newGame();
  save();
  build();
  render();
  if (!myTurn()) computerMove();
}

// -----------------------------------------------------------------------------
// The sheet

const colName = (c) => {
  let s = '';
  for (c += 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
  return s;
};
const ref = (x, y) => `${colName(x)}${y + 1}`;

let cols = 0;
let rows = 0;
let tds = []; // tds[y * cols + x]
let tab = 'board'; // board | moves
const sels = { board: { x: 5, y: 7 }, moves: { x: 0, y: 0 } }; // each tab keeps its own selection
let sel = sels.board;

const logRows = () => Math.ceil(g.moves.length / 2) + (g.result ? 1 : 0);
const neededRows = () => Math.max(60, tab === 'moves' ? logRows() + 14 : 0);
const wideCol = (x) => tab === 'moves' && (x === LOG_W || x === LOG_B);

function build() {
  cols = 40;
  rows = neededRows();
  let html = '<thead><tr><th></th>';
  for (let x = 0; x < cols; x++) html += `<th scope="col"${wideCol(x) ? ' class="wide"' : ''}>${colName(x)}</th>`;
  html += '</tr></thead><tbody>';
  for (let y = 0; y < rows; y++) {
    html += `<tr><th scope="row">${y + 1}</th>`;
    for (let x = 0; x < cols; x++) html += `<td data-x="${x}" data-y="${y}"${wideCol(x) ? ' class="wide"' : ''}></td>`;
    html += '</tr>';
  }
  grid.innerHTML = `${html}</tbody>`;
  tds = [...grid.querySelectorAll('td')];
  sel = { x: Math.min(sel.x, cols - 1), y: Math.min(sel.y, rows - 1) };
  for (const b of document.querySelectorAll('[data-tab]')) {
    b.classList.toggle('on', b.dataset.tab === tab);
    b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  }
  wrap.setAttribute('aria-label', tab === 'board' ? 'Chess board' : 'Move list');
}

function showTab(name) {
  if (name === tab) return;
  closePromo();
  sels[tab] = sel;
  tab = name;
  sel = sels[tab];
  wrap.scrollTop = 0;
  wrap.scrollLeft = 0;
  build();
  render();
  wrap.focus({ preventScroll: true });
}

function ensureRows() {
  if (neededRows() > rows) build();
}

const onBoard = (x, y) => tab === 'board' && x >= 1 && x <= 8 && y >= 1 && y <= 8;

// Board cell <-> square. White sees rank 8 at the top; Black sees it flipped.
function squareAt(x, y) {
  return g.side === 'w' ? `${FILES[x - 1]}${9 - y}` : `${FILES[8 - x]}${y}`;
}
function cellOfSquare(sq) {
  const f = FILES.indexOf(sq[0]);
  const r = Number(sq[1]);
  return g.side === 'w' ? { x: f + 1, y: 9 - r } : { x: 8 - f, y: r };
}

// In dark mode both sides use the filled symbols (an outlined symbol in a light
// color looks filled); CSS colors White's light and Black's dark with an outline.
const dark = () => document.documentElement.dataset.theme === 'dark';
function glyph(p) {
  if (settings.pieces === 'letters') return p.color === 'w' ? p.type.toUpperCase() : p.type;
  if (settings.pieces === 'points') return p.color === 'w' ? POINTS[p.type] : `-${POINTS[p.type]}`;
  return `${GLYPHS[dark() ? 'b' : p.color][p.type]}\uFE0E`;
}

function checkSquare() {
  if (!chess.inCheck()) return null;
  const turn = chess.turn();
  for (const row of chess.board()) for (const p of row) if (p && p.type === 'k' && p.color === turn) return p.square;
  return null;
}

function setCell(x, y, cls, text) {
  const td = tds[y * cols + x];
  const wide = wideCol(x) ? ' wide' : '';
  td.className = cls + wide;
  if (td.textContent !== text) td.textContent = text;
}

function render() {
  document.body.classList.toggle('letters', settings.pieces !== 'icons'); // text pieces
  document.body.dataset.pieces = settings.pieces;
  win.classList.toggle('playing', myTurn() && !thinking);
  const check = checkSquare();
  const to = new Map(targets.map((m) => [m.to, m]));

  if (tab === 'board') renderBoard(check, to);
  else renderMoves();
  renderSel();
  renderStatus();
  renderInfo();
}

function renderBoard(check, to) {
  // Labels
  for (let i = 1; i <= 8; i++) {
    setCell(i, 0, 'lab', g.side === 'w' ? FILES[i - 1] : FILES[8 - i]);
    setCell(0, i, 'lab', String(g.side === 'w' ? 9 - i : i));
  }
  setCell(0, 0, '', '');

  // Board
  for (let y = 1; y <= 8; y++) {
    for (let x = 1; x <= 8; x++) {
      const sq = squareAt(x, y);
      const p = chess.get(sq);
      const f = FILES.indexOf(sq[0]);
      const r = Number(sq[1]) - 1;
      let cls = 'sq';
      if ((f + r) % 2 === 0) cls += ' dk'; // a1 is a dark square
      if (y === 1) cls += ' et';
      if (x === 1) cls += ' el';
      if (x === 8) cls += ' er';
      if (y === 8) cls += ' eb';
      if (last && (sq === last.from || sq === last.to)) cls += ' last';
      if (sq === check) cls += ' check';
      if (sq === picked) cls += ' pick';
      if (p) cls += ` pc ${p.color}`;
      if (p && p.color === g.side) cls += ' mine';
      if (to.has(sq)) cls += to.get(sq).captured ? ' to cap' : ' to';
      setCell(x, y, cls, p ? glyph(p) : '');
    }
  }

}

function renderMoves() {
  setCell(LOG_NUM, 0, 'loghead num', 'Move');
  setCell(LOG_W, 0, 'loghead', 'White');
  setCell(LOG_B, 0, 'loghead', 'Black');
  const n = Math.ceil(g.moves.length / 2);
  for (let y = 1; y < rows; y++) {
    const i = y - 1;
    if (i < n) {
      setCell(LOG_NUM, y, 'log num', String(i + 1));
      setCell(LOG_W, y, 'log', g.moves[i * 2] || '');
      setCell(LOG_B, y, 'log', g.moves[i * 2 + 1] || '');
    } else if (i === n && g.result) {
      const score = g.result.winner === 'w' ? '1–0' : g.result.winner === 'b' ? '0–1' : '½–½';
      setCell(LOG_NUM, y, 'log num', '');
      setCell(LOG_W, y, 'log result', score);
      setCell(LOG_B, y, 'log', '');
    } else {
      for (const x of [LOG_NUM, LOG_W, LOG_B]) setCell(x, y, '', '');
    }
  }
}

// What the formula bar shows for a cell.
function formulaAt(x, y) {
  if (onBoard(x, y)) {
    const sq = squareAt(x, y);
    const p = chess.get(sq);
    return p ? `=PIECE("${COLOR[p.color].toLowerCase()} ${NAMES[p.type]}", "${sq}")` : '';
  }
  return tds[y * cols + x].textContent;
}

function renderSel() {
  grid.querySelector('td.sel')?.classList.remove('sel');
  for (const th of grid.querySelectorAll('th.on')) th.classList.remove('on');
  tds[sel.y * cols + sel.x].classList.add('sel');
  grid.tHead.rows[0].cells[sel.x + 1].classList.add('on');
  grid.tBodies[0].rows[sel.y].cells[0].classList.add('on');
  $('namebox').textContent = ref(sel.x, sel.y);
  $('formula').textContent = formulaAt(sel.x, sel.y);
}

function renderStatus() {
  let state;
  if (engine.failed && !over() && !myTurn()) state = 'Error';
  else if (g.result) state = g.result.reason === 'checkmate' ? 'Checkmate' : 'Draw';
  else if (thinking) state = 'Calculating…';
  else if (chess.inCheck()) state = 'Check';
  else state = 'Ready';
  $('state').textContent = state;
  $('who').textContent = `${COLOR[g.side]} · ${level(g.level).name}`;
  $('movenum').textContent = `Move ${Math.floor(g.moves.length / 2) + 1}`;
  $('undo').disabled = !playerMoved();
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function renderInfo() {
  const info = $('info');
  const phone = KG.os() === 'phone';
  const click = phone ? 'Tap' : 'Click';
  let html = '';
  if (engine.failed && !over()) {
    html = "<b>#N/A</b> The computer opponent couldn't start in this browser. Try updating it or using another one.";
  } else if (g.result) {
    const r = record(g.level);
    const tally = `Your record on ${level(g.level).name}: ${plural(r.w, 'win')}, ${r.l} ${r.l === 1 ? 'loss' : 'losses'}, ${plural(r.d, 'draw')}.`;
    if (g.result.winner === g.side) {
      html = `<b>Checkmate.</b> You win. ${tally}
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>
        <button class="kg-btn" type="button" data-signup>Email me new games</button>`;
    } else if (g.result.winner) {
      html = `<b>Checkmate.</b> The computer wins. ${tally} <button class="kg-btn kg-primary" type="button" data-new>New game</button>`;
    } else {
      html = `<b>Draw</b> by ${g.result.reason}. ${tally} <button class="kg-btn kg-primary" type="button" data-new>New game</button>`;
    }
  } else if (settings.side !== g.side) {
    html = `You'll play ${COLOR[settings.side]} from your next new game. <button class="kg-btn" type="button" data-new>Start it now</button>`;
  } else if (!g.moves.length && g.side === 'w') {
    html = `${click} one of your pieces, then ${click.toLowerCase()} where it goes. You're White against the computer on ${level(g.level).name}. Help has the rules.`;
  } else if (g.moves.length <= 1 && g.side === 'b') {
    html = `You're Black, so the computer moves first. ${click} one of your pieces, then ${click.toLowerCase()} where it goes.`;
  }
  info.hidden = !html;
  if (info.innerHTML !== html) info.innerHTML = html;
}

function select(x, y) {
  sel = { x: Math.max(0, Math.min(cols - 1, x)), y: Math.max(0, Math.min(rows - 1, y)) };
  renderSel();
}

function selectAndShow(x, y) {
  select(x, y);
  const td = tds[sel.y * cols + sel.x];
  // Keep the cell clear of the sticky headers when scrolling to it.
  const head = grid.tHead.offsetHeight;
  const side = grid.tBodies[0].rows[0].cells[0].offsetWidth;
  if (td.offsetTop - head < wrap.scrollTop) wrap.scrollTop = td.offsetTop - head;
  else if (td.offsetTop + td.offsetHeight > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = td.offsetTop + td.offsetHeight - wrap.clientHeight;
  if (td.offsetLeft - side < wrap.scrollLeft) wrap.scrollLeft = td.offsetLeft - side;
  else if (td.offsetLeft + td.offsetWidth > wrap.scrollLeft + wrap.clientWidth) wrap.scrollLeft = td.offsetLeft + td.offsetWidth - wrap.clientWidth;
}

// -----------------------------------------------------------------------------
// Promotion: a dropdown under the cell, like a data-validation list.

let promo = null;

function closePromo() {
  if (!promo) return;
  promo.remove();
  promo = null;
  document.removeEventListener('keydown', promoKey, true);
  wrap.focus({ preventScroll: true });
}

function promoKey(e) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    closePromo();
  }
}

function showPromo(square, options) {
  closePromo();
  const { x, y } = cellOfSquare(square);
  const rect = tds[y * cols + x].getBoundingClientRect();
  promo = document.createElement('div');
  promo.className = 'ch-promo';
  promo.setAttribute('role', 'menu');
  promo.setAttribute('aria-label', 'Promote to');
  for (const type of ['q', 'r', 'b', 'n']) {
    if (!options.some((m) => m.promotion === type)) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'menuitem');
    b.innerHTML = `<span class="g">${glyph({ color: g.side, type })}</span>${NAMES[type][0].toUpperCase()}${NAMES[type].slice(1)}`;
    b.addEventListener('click', () => {
      const from = picked;
      closePromo();
      play({ from, to: square, promotion: type });
    });
    promo.append(b);
  }
  document.body.append(promo);
  const h = promo.offsetHeight;
  const top = rect.bottom + h > innerHeight - 8 ? rect.top - h : rect.bottom;
  promo.style.top = `${Math.max(8, top)}px`;
  promo.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - promo.offsetWidth - 8))}px`;
  document.addEventListener('keydown', promoKey, true);
  promo.querySelector('button').focus();
}

document.addEventListener('pointerdown', (e) => {
  if (promo && !promo.contains(e.target)) closePromo();
});
wrap.addEventListener('scroll', closePromo);

// -----------------------------------------------------------------------------
// Input

grid.addEventListener('click', (e) => {
  const td = e.target.closest('td');
  if (!td) return;
  const x = +td.dataset.x;
  const y = +td.dataset.y;
  select(x, y);
  if (onBoard(x, y)) act(squareAt(x, y));
});

wrap.addEventListener('keydown', (e) => {
  const moves = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  if (moves[e.key]) {
    e.preventDefault();
    selectAndShow(sel.x + moves[e.key][0], sel.y + moves[e.key][1]);
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (onBoard(sel.x, sel.y)) act(squareAt(sel.x, sel.y));
  } else if (e.key === 'Escape' && picked) {
    unpick();
    render();
  }
});

document.addEventListener('keydown', (e) => {
  if (document.querySelector('.kg-modal')) return;
  if (e.key === 'F2') {
    e.preventDefault();
    newGame();
  } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !e.target.closest('input, textarea, select')) {
    e.preventDefault();
    undo();
  }
});

$('info').addEventListener('click', (e) => {
  if (e.target.closest('[data-new]')) newGame();
  else if (e.target.closest('[data-signup]')) KG.openSignup();
});
$('new').addEventListener('click', () => newGame());
$('undo').addEventListener('click', () => undo());

$('level').addEventListener('change', (e) => {
  if (e.target.value === 'custom-new') showCustom();
  else setLevel(e.target.value);
});

// Applies from the computer's next move.
function setLevel(id) {
  settings.level = id;
  if (!over()) g.level = id;
  syncLevels();
  save();
  render();
}

// The Level menu: Easy, Medium, Hard, the last custom rating (once one is
// set) and "Custom rating…", which opens the dialog.
function syncLevels() {
  const menu = $('level');
  const elo = settings.elo || customElo(settings.level);
  let opt = menu.querySelector('option[data-custom]');
  if (elo) {
    if (!opt) {
      opt = new Option('', '');
      opt.dataset.custom = '';
      menu.insertBefore(opt, menu.querySelector('option[value="custom-new"]'));
    }
    opt.value = `elo-${elo}`;
    opt.textContent = `Custom · ${elo}`;
  } else {
    opt?.remove();
  }
  menu.value = settings.level;
}

// -----------------------------------------------------------------------------
// Custom rating dialog

function showCustom() {
  if (document.querySelector('.ch-custom')) return;
  closePromo();
  const start = settings.elo || customElo(g.level) || 1500;
  const box = document.createElement('div');
  box.className = 'kg-modal ch-custom';
  box.innerHTML = `<form class="window kg-dialog" role="dialog" aria-modal="true" aria-labelledby="ch-custom-title">
    <div class="titlebar">
      <div class="lights"><span class="close" data-cancel></span><span class="min"></span><span class="max"></span></div>
      <div class="window-title" id="ch-custom-title">Custom rating</div>
    </div>
    <div class="ch-custom-body">
      <label>Computer's rating <span>${ELO.min}–${ELO.max}</span><input name="elo" type="number" inputmode="numeric" min="${ELO.min}" max="${ELO.max}" step="1" value="${start}" required></label>
      <p class="ch-custom-note">For reference: Hard is 2000. Casual players are often around 800–1200, club players 1400–1800, masters 2200 and up. ${ELO.min} is the lowest the engine can play at a calibrated strength; Easy and Medium are weaker.</p>
    </div>
    <div class="ch-custom-foot">
      <button class="kg-btn" type="button" data-cancel>Cancel</button>
      <button class="kg-btn kg-primary" type="submit">Set level</button>
    </div>
  </form>`;
  const form = box.querySelector('form');
  const value = () => {
    const n = Math.round(Number(form.elements.elo.value));
    return Math.min(ELO.max, Math.max(ELO.min, Number.isFinite(n) ? n : 1500));
  };
  const done = () => {
    box.remove();
    document.removeEventListener('keydown', onKey, true);
    syncLevels(); // puts the menu back on the current level if cancelled
    wrap.focus();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      done();
    }
  };
  // Leaving the field snaps it to what will actually be used.
  form.addEventListener('change', () => {
    form.elements.elo.value = value();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    settings.elo = value();
    done();
    setLevel(`elo-${settings.elo}`);
  });
  box.addEventListener('click', (e) => {
    if (e.target.closest('[data-cancel]') || e.target === box) done();
  });
  document.addEventListener('keydown', onKey, true);
  document.body.append(box);
  form.elements.elo.select();
}

$('side').addEventListener('change', (e) => {
  settings.side = e.target.value;
  // Switch right away unless that would throw away a game in progress.
  if (over() || chess.history().length <= 1) newGame();
  else {
    save();
    render();
  }
});

$('pieces').addEventListener('change', (e) => {
  settings.pieces = e.target.value;
  save();
  render();
});

// -----------------------------------------------------------------------------
// Help

const HELP = `
  <h2>Play the computer</h2>
  <ul>
    <li>Click one of your pieces, then click where it goes. Dots show its legal moves; a box marks a capture.</li>
    <li>Pick the computer's <b>Level</b>: Easy, Medium or Hard (rated about 2000). <b>Custom rating…</b> lets you set its rating yourself, from 1320 to 3190.</li>
    <li>Choose whether you <b>Play as</b> White or Black.</li>
    <li><b>Undo</b> takes back your last move and the computer's reply.</li>
  </ul>
  <h2>Rules</h2>
  <ul>
    <li>Standard chess. Castle by moving your king two squares. A pawn reaching the far row turns into the piece you choose.</li>
    <li>The game is a draw by stalemate, threefold repetition, the 50-move rule or insufficient material.</li>
  </ul>
  <h2>The sheet</h2>
  <ul>
    <li>The board is B2:I9 on the <b>Budget</b> tab, with files in row 1 and ranks in column A. The <b>Moves</b> tab logs every move.</li>
    <li>The <b>Pieces</b> menu picks how pieces are shown:
      <b>Letters</b> (K king, Q queen, R rook, B bishop, N knight, P pawn; White's capitals, Black's lowercase and blue),
      <b>Points</b> (each piece's value: pawn 1, knight 3, bishop 3.1, rook 5, queen 9, king 100; Black's are negative and red),
      or <b>Icons</b> (chess symbols).</li>
  </ul>
  <h2>Keyboard</h2>
  <ul>
    <li>Arrow keys move, Enter or Space picks a piece and moves it, Esc lets go, Ctrl+Z undoes, F2 starts a new game.</li>
  </ul>
  <p class="credits">The computer is <a href="engine/README.txt" target="_blank" rel="noopener">Stockfish</a> (GPLv3, source linked there). Rules by <a href="lib/LICENSE.txt" target="_blank" rel="noopener">chess.js</a> (BSD).</p>`;

function showHelp() {
  if (document.querySelector('.sheet-help')) return;
  closePromo();
  const box = document.createElement('div');
  box.className = 'kg-modal sheet-help';
  box.innerHTML = `<div class="window kg-dialog" role="dialog" aria-modal="true" aria-labelledby="sheet-help-title">
    <div class="titlebar">
      <div class="lights"><span class="close" data-close></span><span class="min"></span><span class="max"></span></div>
      <div class="window-title" id="sheet-help-title">how-to-play.txt — Notes</div>
    </div>
    <div class="notes-menu"><span>File</span><span>Edit</span><span>Format</span><span>View</span><span>Help</span></div>
    <div class="notes-page">${HELP}</div>
    <div class="notes-status"><span>Ln 1, Col 1</span><span>UTF-8</span><button class="kg-btn kg-primary" type="button" data-close>Back to the sheet</button></div>
  </div>`;
  const done = () => {
    box.remove();
    document.removeEventListener('keydown', onKey, true);
    wrap.focus();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      done();
    }
  };
  box.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === box) done();
  });
  document.addEventListener('keydown', onKey, true);
  document.body.append(box);
  box.querySelector('.kg-btn[data-close]').focus();
}
$('help').addEventListener('click', showHelp);
document.querySelector('.sheet-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (b) showTab(b.dataset.tab);
});

// -----------------------------------------------------------------------------
// Start

function retitle() {
  $('sheet-title').textContent = KG.pick({ value: 'Chess - Spreadsheet', quality: 'Chess', power: 'Chess — Spreadsheet' });
}

load();
const h = chess.history({ verbose: true });
if (h.length) last = { from: h[h.length - 1].from, to: h[h.length - 1].to };
syncLevels();
$('side').value = settings.side;
$('pieces').value = settings.pieces;
build();
retitle();
render();

KG.makeWindow(win, {
  minW: 420,
  minH: 360,
  storageKey: `${KEY}-window`,
  rect: (a) => {
    const w = Math.min(1100, a.w - 40);
    const h = Math.min(720, a.h - 40);
    return { x: a.x + (a.w - w) / 2, y: a.y + (a.h - h) / 3, w, h };
  },
});
KG.onChange(() => {
  retitle();
  render();
});
wrap.focus({ preventScroll: true });
if (!myTurn()) computerMove();
