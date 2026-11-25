// Spreadsheet Reversi: the board is the range A1:H8 on the Board tab, you are
// X and the computer is O. Hovering an empty cell shows whether you can play
// there. Flipped pieces turn over one at a time. The Moves tab logs each move.
// The rules and the computer are in engine.js. See DESIGN.md.

(() => {
  const R = Reversi;
  const KEY = 'spreadsheet-reversi'; // the game; + '-settings', '-record', '-window'
  const MIN_THINK = 450; // the computer never answers faster than this (ms)
  const FLIP_MS = 120; // one flipped piece turns over every FLIP_MS
  const { N, YOU, CPU } = R;

  const $ = (id) => document.getElementById(id);
  const grid = $('grid');
  const wrap = $('wrap');
  const win = $('sheet');

  // ---------------------------------------------------------------------------
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
      // storage unavailable — progress lasts for this page only
    }
  }

  // ---------------------------------------------------------------------------
  // State
  //
  // g: the game from engine.js plus level and counted (the result is in the
  // record). settings: level, first ('alternate' | 'you' | 'cpu') and next
  // (who goes first in the next game when taking turns).

  const FIRSTS = ['alternate', 'you', 'cpu'];
  const s0 = read(`${KEY}-settings`) || {};
  const settings = {
    level: s0.level in R.LEVELS ? s0.level : 'medium',
    first: FIRSTS.includes(s0.first) ? s0.first : 'alternate',
    next: s0.next === CPU ? CPU : YOU,
  };

  let g;
  let last = null; // the last move's record (its cell and flips stay highlighted)
  let note = ''; // a pass to tell you about, until your next move
  let thinking = null; // a pending computer move's timer
  let anim = null; // a move being shown: { view, placed, flip, steps, timer, then }
  let hover = -1; // the board cell under the mouse
  let flash = null; // a short status-bar message: { text, timer }
  let tab = 'board';
  const sels = { board: { x: 3, y: 2 }, moves: { x: 0, y: 0 } };

  const saveSettings = () => write(`${KEY}-settings`, settings);
  const save = () => write(`${KEY}-game`, g);
  const level = () => R.LEVELS[g.level];
  const players = () => R.history(g.first, g.moves).map((r) => r.player);
  const yourMoves = () => players().filter((p) => p === YOU).length;
  const firstFor = () => (settings.first === 'you' ? YOU : settings.first === 'cpu' ? CPU : settings.next);

  function newGame() {
    stop();
    const first = firstFor();
    if (settings.first === 'alternate') settings.next = first === YOU ? CPU : YOU;
    saveSettings();
    g = { ...R.newGame(first), level: settings.level, counted: false };
    last = null;
    note = '';
    sels.board = { x: 3, y: 2 };
    save();
    render();
    schedule();
  }

  // Your record on each level: { medium: { w, l, d } }
  function record(lv) {
    const r = (read(`${KEY}-record`) || {})[lv] || {};
    return { w: r.w | 0, l: r.l | 0, d: r.d | 0 };
  }
  function count() {
    if (!g.result || g.counted) return;
    const all = read(`${KEY}-record`) || {};
    const r = record(g.level);
    if (g.result === YOU) r.w++;
    else if (g.result === CPU) r.l++;
    else r.d++;
    all[g.level] = r;
    write(`${KEY}-record`, all);
    g.counted = true;
  }

  // Play cell i for whoever's turn it is, then show it: the piece is placed
  // and the flipped pieces turn over one at a time. The game is saved first,
  // so a reload mid-animation shows the finished move.
  function move(i, then) {
    const before = g.board.slice();
    const rec = R.play(g, i);
    if (!rec) return false;
    count();
    save();
    if (tab === 'board') sels.board = { x: i % N, y: Math.floor(i / N) };
    const view = before;
    view[i] = rec.player;
    anim = { view, placed: i, flip: -1, steps: rec.flips.slice(), rec, then };
    render();
    anim.timer = setInterval(step, FLIP_MS);
    return true;
  }

  function step() {
    const k = anim.steps.shift();
    if (k === undefined) {
      finishAnim();
      return;
    }
    anim.view[k] = anim.rec.player;
    anim.flip = k;
    anim.placed = -1;
    renderSheet();
  }

  // Skip to the end of the move being shown (a click or any key does this).
  function finishAnim() {
    if (!anim) return;
    clearInterval(anim.timer);
    const { rec, then } = anim;
    anim = null;
    last = rec;
    render();
    then?.(rec);
  }

  function humanMove(i) {
    if (!myTurn()) return;
    if (!R.flips(g.board, i, YOU).length) {
      showFlash(g.board[i] ? `${cellRef(i)} is taken.` : `${cellRef(i)} doesn't flip any O's.`);
      return;
    }
    note = '';
    clearTimeout(flash?.timer);
    flash = null;
    move(i, (rec) => {
      if (rec.passed) note = 'The computer has no move that flips anything, so it passes. <b>Your turn again.</b>';
      render();
      schedule();
    });
  }

  // The computer moves after a short pause, so the move doesn't feel instant
  // and "Calculating…" shows while it thinks.
  function schedule() {
    if (g.result || g.turn !== CPU || thinking || anim) return;
    const start = Date.now();
    thinking = setTimeout(() => {
      const i = R.aiMove(g, g.level);
      thinking = setTimeout(() => {
        thinking = null;
        move(i, (rec) => {
          if (rec.passed) note = 'You have no move that flips anything, so your turn is passed.';
          render();
          schedule();
        });
      }, Math.max(0, MIN_THINK - (Date.now() - start)));
    }, 30);
    render();
  }

  function stop() {
    clearTimeout(thinking);
    thinking = null;
    if (anim) clearInterval(anim.timer);
    anim = null;
  }

  // Undo takes back your last move and everything the computer did after it.
  function undo() {
    if (g.result || !yourMoves()) return;
    stop();
    const who = players();
    const k = who.lastIndexOf(YOU);
    g = { ...R.replay(g.first, g.moves.slice(0, k)), level: g.level, counted: false };
    last = k ? R.history(g.first, g.moves).at(-1) : null;
    note = '';
    save();
    render();
  }

  function showFlash(text) {
    clearTimeout(flash?.timer);
    flash = { text, timer: setTimeout(() => {
      flash = null;
      renderStatus();
    }, 1800) };
    renderStatus();
  }

  // ---------------------------------------------------------------------------
  // The sheet

  const colName = (c) => {
    let s = '';
    for (c += 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
    return s;
  };
  const ref = (x, y) => `${colName(x)}${y + 1}`;
  const cellRef = (i) => ref(i % N, Math.floor(i / N));

  const COLS = 14;
  let rows = 40; // grows when a tab needs more (see renderSheet)
  let tds = [];
  let cells = new Map(); // "x,y" → { text, cls, f } for the current tab

  function build() {
    let html = '<thead><tr><th></th>';
    for (let x = 0; x < COLS; x++) html += `<th scope="col" data-x="${x}">${colName(x)}</th>`;
    html += '</tr></thead><tbody>';
    for (let y = 0; y < rows; y++) {
      html += `<tr><th scope="row">${y + 1}</th>`;
      for (let x = 0; x < COLS; x++) html += `<td data-x="${x}" data-y="${y}"></td>`;
      html += '</tr>';
    }
    grid.innerHTML = `${html}</tbody>`;
    tds = [...grid.querySelectorAll('td')];
    sizeCells();
  }

  // Phones size the board's columns so all eight fit the width.
  function sizeCells() {
    if (KG.os() !== 'phone') {
      win.style.removeProperty('--s-cell');
      win.style.removeProperty('--s-row');
      return;
    }
    const px = Math.max(32, Math.min(48, Math.floor((wrap.clientWidth - 42) / N)));
    win.style.setProperty('--s-cell', `${px}px`);
    win.style.setProperty('--s-row', `${px}px`);
  }

  const put = (x, y, text, cls = '', f = null) => cells.set(`${x},${y}`, { text: String(text), cls, f: f ?? String(text) });

  const myTurn = () => !g.result && g.turn === YOU && !thinking && !anim;
  const who = (p) => (p === YOU ? 'you' : 'computer');
  const mark = (p) => (p === YOU ? 'X' : 'O');

  function boardSheet() {
    const board = anim ? anim.view : g.board;
    const flipped = new Set(anim ? [] : last?.flips || []);
    const lastCell = anim ? -1 : last?.cell ?? -1;
    // hovering an empty cell on your turn: a grey X and what it would flip, or "no"
    const would = myTurn() && hover >= 0 && !board[hover] ? R.flips(board, hover, YOU) : [];
    const wouldSet = new Set(would);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const p = board[i];
        let cls = 'b';
        if (y === 0) cls += ' et';
        if (x === 0) cls += ' el';
        if (x === N - 1) cls += ' er';
        if (y === N - 1) cls += ' eb';
        if (p) cls += p === YOU ? ' x' : ' o';
        if (anim && i === anim.flip) cls += ' flip';
        if (anim && i === anim.placed) cls += ' placed last';
        if (i === lastCell) cls += ' last';
        else if (flipped.has(i)) cls += ' flipped';
        if (i === hover && myTurn() && !p) cls += would.length ? ' ghost' : ' no';
        if (wouldSet.has(i)) cls += ' would';
        const text = p ? mark(p) : i === hover && would.length ? 'X' : '';
        put(x, y, text, cls, p ? `=PIECE("${who(p)}","${cellRef(i)}")` : '');
      }
    }
    // the score, under the board
    const c = R.counts(board);
    put(0, N + 1, 'You', 'lab');
    put(1, N + 1, c[YOU], 'num c tot', '=COUNTIF(A1:H8,"X")');
    put(0, N + 2, 'CPU', 'lab o');
    put(1, N + 2, c[CPU], 'num c tot', '=COUNTIF(A1:H8,"O")');
    put(0, N + 3, 'Empty', 'lab');
    put(1, N + 3, N * N - c[YOU] - c[CPU], 'num c', '=COUNTBLANK(A1:H8)');
  }

  // Moves: Move | Player | Cell | Flipped, a "Pass" row when someone can't
  // move, then the result.
  function movesSheet() {
    ['Move', 'Player', 'Cell', 'Flipped'].forEach((h, x) => put(x, 0, h, `hd ${x === 1 ? '' : 'c'}`));
    let y = 1;
    let n = 0;
    const recs = R.history(g.first, g.moves);
    recs.forEach((r) => {
      n++;
      const name = r.player === YOU ? 'You (X)' : 'Computer (O)';
      put(0, y, n, 'log c num');
      put(1, y, name, `log${r.player === CPU ? ' o' : ''}`);
      put(2, y, cellRef(r.cell), 'log c', `=PIECE("${who(r.player)}","${cellRef(r.cell)}")`);
      put(3, y, r.flips.length, 'log c num', `=FLIPPED(${r.flips.map(cellRef).join(',')})`);
      y++;
      if (r.passed) {
        const other = r.player === YOU ? 'Computer (O)' : 'You (X)';
        put(1, y, other, `log pass${r.player === YOU ? ' o' : ''}`);
        put(2, y, 'Pass', 'log c pass');
        y++;
      }
    });
    if (g.result) {
      const c = R.counts(g.board);
      y++;
      put(0, y, 'Result', 'log result');
      put(1, y, g.result === YOU ? 'You win' : g.result === CPU ? 'Computer wins' : 'Draw', 'log result');
      put(2, y, `${c[YOU]}–${c[CPU]}`, 'log c result');
    }
  }

  function renderSheet() {
    cells = new Map();
    if (tab === 'board') boardSheet();
    else movesSheet();
    // the grid grows to fit (a long game's Moves log runs past row 40)
    const need = Math.max(0, ...[...cells.keys()].map((k) => +k.split(',')[1])) + 3;
    if (need > rows) {
      rows = Math.ceil(need / 10) * 10;
      build();
    }
    grid.classList.toggle('t-moves', tab === 'moves');
    win.classList.toggle('on-moves', tab === 'moves');
    for (const td of tds) {
      const c = cells.get(`${td.dataset.x},${td.dataset.y}`);
      td.className = c ? c.cls : '';
      if (c && tab === 'board' && c.cls.startsWith('b') && c.text) td.innerHTML = `<span>${c.text}</span>`;
      else td.textContent = c ? c.text : '';
    }
    for (const b of document.querySelectorAll('[data-tab]')) {
      b.classList.toggle('on', b.dataset.tab === tab);
      b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    }
    renderSel();
  }

  function renderSel() {
    const sel = sels[tab];
    grid.querySelector('td.sel')?.classList.remove('sel');
    for (const th of grid.querySelectorAll('th.on')) th.classList.remove('on');
    tds[sel.y * COLS + sel.x].classList.add('sel');
    grid.tHead.rows[0].cells[sel.x + 1].classList.add('on');
    grid.tBodies[0].rows[sel.y].cells[0].classList.add('on');
    $('namebox').textContent = ref(sel.x, sel.y);
    const c = cells.get(`${sel.x},${sel.y}`);
    // a ghost X isn't really in the cell
    $('formula').textContent = c && c.text !== '' && !c.cls.includes('ghost') ? c.f : '';
  }

  function renderStatus() {
    const c = R.counts(g.board);
    $('state').textContent = flash ? flash.text : anim ? 'Flipping…' : thinking ? 'Calculating…' : g.result ? 'Calculation complete' : 'Ready';
    $('who').textContent = `${level().name} · You: X`;
    $('move').textContent = `X ${c[YOU]} · O ${c[CPU]}`;
    $('undo').disabled = !!g.result || !yourMoves();
  }

  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  function renderInfo() {
    const info = $('info');
    const phone = KG.os() === 'phone';
    let html = '';
    if (g.result && !anim) {
      const r = record(g.level);
      const c = R.counts(g.board);
      const tally = `Your record on ${level().name}: ${plural(r.w, 'win')}, ${r.l} ${r.l === 1 ? 'loss' : 'losses'}, ${plural(r.d, 'draw')}.`;
      const score = `${Math.max(c[YOU], c[CPU])} to ${Math.min(c[YOU], c[CPU])}`;
      const head = g.result === YOU ? `You win, ${score}.` : g.result === CPU ? `The computer wins, ${score}.` : `Draw, ${score}.`;
      html = `<b>${head}</b> ${tally}
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>${g.result === YOU ? '\n        <button class="kg-btn" type="button" data-signup>Email me new games</button>' : ''}`;
    } else if (note) {
      html = `<span>${note}</span>`;
    } else if (firstFor() !== g.first && settings.first !== 'alternate') {
      html = `${settings.first === 'you' ? 'You\'ll go first' : 'The computer will go first'} from your next new game. <button class="kg-btn" type="button" data-new>Start it now</button>`;
    } else if (!yourMoves()) {
      const went = g.first === CPU ? ' The computer goes first this game.' : '';
      const how = phone ? 'Tap an empty cell to place an X' : 'Hover over an empty cell to see whether you can play there, and click to place an X';
      // one <span>, so the bar (a wrapping flex row) keeps the sentence together
      html = `<span>You're <b>X</b>, the computer is <b>O</b>. ${how}. Every move must trap a line of O's between your new X and another X, and they flip to X. Most pieces when neither side can move wins.${went}</span>`;
    }
    info.hidden = !html;
    if (info.innerHTML !== html) info.innerHTML = html;
  }

  function retitle() {
    $('sheet-title').textContent = KG.pick({ value: 'Reversi - Spreadsheet', quality: 'Reversi', power: 'Reversi — Spreadsheet' });
  }

  function render() {
    renderSheet();
    renderStatus();
    renderInfo();
  }

  // ---------------------------------------------------------------------------
  // Input: click (or tap) an empty cell to play there.

  const boardCell = (el) => {
    if (tab !== 'board') return -1;
    const c = el?.closest?.('td');
    if (!c) return -1;
    const x = +c.dataset.x;
    const y = +c.dataset.y;
    return x < N && y < N ? y * N + x : -1;
  };

  grid.addEventListener('click', (e) => {
    if (anim) {
      finishAnim();
      return;
    }
    const cell = e.target.closest('td');
    if (!cell) return;
    sels[tab] = { x: +cell.dataset.x, y: +cell.dataset.y };
    const i = boardCell(cell);
    if (i >= 0 && myTurn() && !g.board[i]) {
      wrap.focus({ preventScroll: true });
      humanMove(i);
      return;
    }
    renderSel();
  });
  grid.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const i = boardCell(e.target);
    if (i === hover) return;
    hover = i;
    renderSheet();
  });
  grid.addEventListener('pointerleave', () => {
    if (hover < 0) return;
    hover = -1;
    renderSheet();
  });

  for (const b of document.querySelectorAll('[data-tab]')) {
    b.addEventListener('click', () => {
      tab = b.dataset.tab;
      hover = -1;
      renderSheet();
    });
  }

  // Keyboard: arrows move; Enter or Space plays the selected cell; Ctrl+Z
  // undoes; F2 starts a new game. Any key skips a move being shown.
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.kg-modal:not([hidden])') || e.target.closest('input, textarea, select')) return;
    if (anim && !['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
      finishAnim();
      if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'F2') {
      e.preventDefault();
      newGame();
      return;
    }
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const sel = sels[tab];
    if (moves[e.key]) {
      e.preventDefault();
      sel.x = Math.max(0, Math.min(COLS - 1, sel.x + moves[e.key][0]));
      sel.y = Math.max(0, Math.min(rows - 1, sel.y + moves[e.key][1]));
      renderSel();
      tds[sel.y * COLS + sel.x].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && tab === 'board' && sel.x < N && sel.y < N) {
      e.preventDefault();
      humanMove(sel.y * N + sel.x);
    }
  });

  $('info').addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) newGame();
    else if (e.target.closest('[data-signup]')) KG.openSignup();
  });
  $('new').addEventListener('click', () => {
    newGame();
    wrap.focus({ preventScroll: true });
  });
  $('undo').addEventListener('click', () => {
    undo();
    wrap.focus({ preventScroll: true });
  });
  // A level change applies from the computer's next move.
  $('level').addEventListener('change', (e) => {
    settings.level = e.target.value;
    saveSettings();
    if (!g.result) {
      g.level = settings.level;
      save();
    }
    render();
    wrap.focus({ preventScroll: true });
  });
  // Who goes first applies to the next game, or right away if you haven't
  // moved yet (or the game is over).
  $('first').addEventListener('change', (e) => {
    settings.first = e.target.value;
    if (settings.first === 'alternate') settings.next = g.first === YOU ? CPU : YOU;
    saveSettings();
    if (settings.first !== 'alternate' && (g.result || !yourMoves()) && firstFor() !== g.first) newGame();
    else render();
    wrap.focus({ preventScroll: true });
  });

  // ---------------------------------------------------------------------------
  // Help

  const HELP = `
    <h2>Reversi</h2>
    <ul>
      <li>The board is the range A1:H8. You're <b>X</b>, the computer is <b>O</b>. It starts with two of each crossed in the middle.</li>
      <li>Place an X so a straight line of O's, across, down or diagonally, is trapped between it and another X. Those O's flip to X. A move can flip lines in several directions at once, and it must flip at least one piece.</li>
      <li><b>Hover</b> over an empty cell to see whether you can play there: a grey X shows the move and tints what it would flip; a red cell can't be played. <b>Click</b> to place your X.</li>
      <li>If you have no move, your turn is passed. The game ends when neither side can move, and whoever has more pieces wins.</li>
    </ul>
    <h2>Settings</h2>
    <ul>
      <li><b>Level</b>: Easy, Medium or Hard. A change applies from the computer's next move. Your record is kept for each level.</li>
      <li><b>First</b>: take turns going first (the default), always you, or always the computer.</li>
      <li><b>Undo</b> takes back your last move and the computer's moves after it.</li>
      <li>Every move is logged on the <b>Moves</b> sheet. Click the sheet or press any key to skip the flipping.</li>
    </ul>
    <h2>Keyboard</h2>
    <ul>
      <li>Arrows move the selected cell, and Enter or Space plays there. Ctrl+Z undoes, F2 starts a new game.</li>
    </ul>
    <p>Othello is a trademark of MegaHouse. Reversi is the traditional game and is not affiliated with MegaHouse.</p>`;

  function showHelp() {
    if (document.querySelector('.sheet-help')) return;
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

  // ---------------------------------------------------------------------------
  // Start

  build();
  retitle();
  $('level').value = settings.level;
  $('first').value = settings.first;
  const saved = read(`${KEY}-game`);
  if (R.valid(saved)) {
    g = { ...R.replay(saved.first, saved.moves), level: saved.level, counted: !!saved.counted };
    last = g.moves.length ? R.history(g.first, g.moves).at(-1) : null;
    render();
    schedule();
  } else {
    newGame();
  }

  KG.makeWindow(win, {
    minW: 400,
    minH: 420,
    storageKey: `${KEY}-window`,
    rect: (a) => {
      const w = Math.min(640, a.w - 40);
      const h = Math.min(600, a.h - 40);
      return { x: a.x + (a.w - w) / 2, y: a.y + (a.h - h) / 3, w, h };
    },
  });
  sizeCells();
  KG.onChange(() => {
    retitle();
    sizeCells();
    render();
  });
  addEventListener('resize', sizeCells);
  wrap.focus({ preventScroll: true });
})();
