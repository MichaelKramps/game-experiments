// Spreadsheet Four in a Row: the board is the range A1:G6 on the Board tab,
// you are X and the computer is O. The Moves tab logs each drop. The rules
// and the computer are in engine.js. See DESIGN.md.

(() => {
  const F = FourInARow;
  const KEY = 'spreadsheet-four-in-a-row'; // the game; + '-settings', '-record', '-window'
  const MIN_THINK = 450; // the computer never answers faster than this (ms)
  const { W, H, YOU, CPU } = F;

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
    level: s0.level in F.LEVELS ? s0.level : 'medium',
    first: FIRSTS.includes(s0.first) ? s0.first : 'alternate',
    next: s0.next === CPU ? CPU : YOU,
  };

  let g;
  let thinking = null; // a pending computer move's timer
  let dropped = -1; // the cell a disc just landed in (animates once)
  let hoverCol = -1; // the column under the pointer (shows where X would land)
  let tab = 'board';
  const sels = { board: { x: 3, y: 0 }, moves: { x: 0, y: 0 } };

  const saveSettings = () => write(`${KEY}-settings`, settings);
  const save = () => write(`${KEY}-game`, g);
  const level = () => F.LEVELS[g.level];
  const yourMoves = () => g.moves.filter((_, k) => (k % 2 === 0) === (g.first === YOU)).length;
  const firstFor = () => (settings.first === 'you' ? YOU : settings.first === 'cpu' ? CPU : settings.next);

  function newGame() {
    cancelThinking();
    const first = firstFor();
    if (settings.first === 'alternate') settings.next = first === YOU ? CPU : YOU;
    saveSettings();
    g = { ...F.newGame(first), level: settings.level, counted: false };
    dropped = -1;
    sels.board = { x: 3, y: 0 };
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

  // Drop a disc in column x for whoever's turn it is.
  function drop(x) {
    const i = F.play(g, x);
    if (i < 0) return false;
    dropped = i;
    if (tab === 'board') sels.board = { x: i % W, y: Math.floor(i / W) };
    count();
    save();
    return true;
  }

  function humanDrop(x) {
    if (g.result || g.turn !== YOU || thinking) return;
    if (!drop(x)) return;
    render();
    schedule();
  }

  // The computer moves after a short pause, so the move doesn't feel instant
  // and "Calculating…" shows while it thinks.
  function schedule() {
    if (g.result || g.turn !== CPU || thinking) return;
    const start = Date.now();
    thinking = setTimeout(() => {
      const x = F.aiMove(g, g.level);
      thinking = setTimeout(() => {
        thinking = null;
        drop(x);
        render();
      }, Math.max(0, MIN_THINK - (Date.now() - start)));
    }, 30);
    render();
  }

  function cancelThinking() {
    clearTimeout(thinking);
    thinking = null;
  }

  // Undo takes back your last move, and the computer's reply if it made one.
  function undo() {
    if (g.result || !yourMoves()) return;
    cancelThinking();
    if (g.turn === YOU) F.undo(g); // the computer's reply
    F.undo(g); // your move
    dropped = -1;
    save();
    render();
  }

  // ---------------------------------------------------------------------------
  // The sheet

  const colName = (c) => {
    let s = '';
    for (c += 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
    return s;
  };
  const ref = (x, y) => `${colName(x)}${y + 1}`;
  const cellRef = (i) => ref(i % W, Math.floor(i / W));

  const COLS = 14;
  const ROWS = 40;
  let tds = [];
  let cells = new Map(); // "x,y" → { text, cls, f, html } for the current tab

  function build() {
    let html = '<thead><tr><th></th>';
    for (let x = 0; x < COLS; x++) html += `<th scope="col" data-x="${x}">${colName(x)}</th>`;
    html += '</tr></thead><tbody>';
    for (let y = 0; y < ROWS; y++) {
      html += `<tr><th scope="row">${y + 1}</th>`;
      for (let x = 0; x < COLS; x++) html += `<td data-x="${x}" data-y="${y}"></td>`;
      html += '</tr>';
    }
    grid.innerHTML = `${html}</tbody>`;
    tds = [...grid.querySelectorAll('td')];
    sizeCells();
  }

  // Phones size the board's columns so all seven fit the width.
  function sizeCells() {
    if (KG.os() !== 'phone') {
      win.style.removeProperty('--s-cell');
      win.style.removeProperty('--s-row');
      return;
    }
    const px = Math.max(36, Math.min(52, Math.floor((wrap.clientWidth - 42) / W)));
    win.style.setProperty('--s-cell', `${px}px`);
    win.style.setProperty('--s-row', `${px}px`);
  }

  const put = (x, y, text, cls = '', f = null) => cells.set(`${x},${y}`, { text: String(text), cls, f: f ?? String(text) });

  const myTurn = () => !g.result && g.turn === YOU && !thinking;
  const who = (p) => (p === YOU ? 'you' : 'computer');

  function boardSheet() {
    const last = g.moves.length ? lastCell() : -1;
    const winSet = new Set(g.line || []);
    const winRef = g.line ? `${cellRef(g.line[0])}:${cellRef(g.line[g.line.length - 1])}` : '';
    const ghost = myTurn() && hoverCol >= 0 ? F.landing(g.board, hoverCol) * W + hoverCol : -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const p = g.board[i];
        let cls = 'b';
        if (y === 0) cls += ' et';
        if (x === 0) cls += ' el';
        if (x === W - 1) cls += ' er';
        if (y === H - 1) cls += ' eb';
        if (p) cls += p === YOU ? ' x' : ' o';
        if (winSet.has(i)) cls += ' win';
        else if (i === last) cls += ' last';
        if (i === dropped) cls += ' drop';
        if (myTurn() && x === hoverCol) cls += ' col';
        if (i === ghost && ghost >= 0) cls += ' ghost';
        const text = p ? (p === YOU ? 'X' : 'O') : i === ghost ? 'X' : '';
        const f = !p ? '' : winSet.has(i) ? `=FOUR(${winRef})` : `=DISC("${who(p)}","${cellRef(i)}")`;
        put(x, y, text, cls, f);
      }
    }
  }

  // The cell of the last disc dropped.
  function lastCell() {
    const x = g.moves[g.moves.length - 1];
    return (F.landing(g.board, x) + 1) * W + x;
  }

  // Moves: Move | Player | Column | Cell, then the result.
  function movesSheet() {
    ['Move', 'Player', 'Column', 'Cell'].forEach((h, x) => put(x, 0, h, `hd ${x === 1 ? '' : 'c'}`));
    const b = Array(W * H).fill(0);
    g.moves.forEach((x, k) => {
      const p = (k % 2 === 0) === (g.first === YOU) ? YOU : CPU;
      let y = H - 1;
      while (b[y * W + x]) y--;
      b[y * W + x] = p;
      const name = p === YOU ? 'You (X)' : 'Computer (O)';
      put(0, k + 1, k + 1, 'log c num');
      put(1, k + 1, name, `log${p === CPU ? ' o' : ''}`);
      put(2, k + 1, colName(x), 'log c');
      put(3, k + 1, ref(x, y), 'log c', `=DISC("${who(p)}","${ref(x, y)}")`);
    });
    if (g.result) {
      const y = g.moves.length + 2;
      put(0, y, 'Result', 'log result');
      put(1, y, g.result === YOU ? 'You win' : g.result === CPU ? 'Computer wins' : 'Draw', 'log result');
      if (g.line) put(3, y, `${cellRef(g.line[0])}:${cellRef(g.line[g.line.length - 1])}`, 'log c', `=FOUR(${cellRef(g.line[0])}:${cellRef(g.line[g.line.length - 1])})`);
    }
  }

  function renderSheet() {
    cells = new Map();
    if (tab === 'board') boardSheet();
    else movesSheet();
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
    win.classList.toggle('playing', tab === 'board' && myTurn());
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
    $('state').textContent = thinking ? 'Calculating…' : g.result ? 'Calculation complete' : 'Ready';
    $('who').textContent = `${level().name} · You: X`;
    $('move').textContent = `Move ${Math.min(g.moves.length + 1, W * H)}`;
    $('undo').disabled = !!g.result || !yourMoves();
  }

  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  function renderInfo() {
    const info = $('info');
    const phone = KG.os() === 'phone';
    const click = phone ? 'Tap' : 'Click';
    let html = '';
    if (g.result) {
      const r = record(g.level);
      const tally = `Your record on ${level().name}: ${plural(r.w, 'win')}, ${r.l} ${r.l === 1 ? 'loss' : 'losses'}, ${plural(r.d, 'draw')}.`;
      const head = g.result === YOU ? 'Four in a row. You win.' : g.result === CPU ? 'Four in a row. The computer wins.' : 'Draw: the board is full.';
      html = `<b>${head}</b> ${tally}
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>${g.result === YOU ? '\n        <button class="kg-btn" type="button" data-signup>Email me new games</button>' : ''}`;
    } else if (firstFor() !== g.first && settings.first !== 'alternate') {
      html = `${settings.first === 'you' ? 'You\'ll go first' : 'The computer will go first'} from your next new game. <button class="kg-btn" type="button" data-new>Start it now</button>`;
    } else if (!yourMoves()) {
      const went = g.first === CPU ? ' The computer goes first this game.' : '';
      html = `You're <b>X</b>, the computer is <b>O</b>. ${click} a column to drop your X into its lowest empty cell. Four in a row across, down or diagonally wins.${went}`;
    }
    info.hidden = !html;
    if (info.innerHTML !== html) info.innerHTML = html;
  }

  function retitle() {
    $('sheet-title').textContent = KG.pick({ value: 'Four in a Row - Spreadsheet', quality: 'Four in a Row', power: 'Four in a Row — Spreadsheet' });
  }

  function render() {
    renderSheet();
    renderStatus();
    renderInfo();
    dropped = -1;
  }

  // ---------------------------------------------------------------------------
  // Input: click (or tap) any cell or header in a board column to drop there.

  const boardCol = (el) => {
    if (tab !== 'board') return -1;
    const c = el?.closest?.('td, thead th');
    if (!c || c.dataset.x === undefined) return -1;
    const x = +c.dataset.x;
    if (x >= W) return -1;
    if (c.tagName === 'TD' && +c.dataset.y >= H) return -1;
    return x;
  };

  grid.addEventListener('click', (e) => {
    const x = boardCol(e.target);
    if (x >= 0 && myTurn()) {
      wrap.focus({ preventScroll: true });
      humanDrop(x);
      return;
    }
    const cell = e.target.closest('td');
    if (!cell) return;
    sels[tab] = { x: +cell.dataset.x, y: +cell.dataset.y };
    renderSel();
  });
  grid.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const x = boardCol(e.target);
    if (x === hoverCol) return;
    hoverCol = x;
    renderSheet();
  });
  grid.addEventListener('pointerleave', () => {
    if (hoverCol < 0) return;
    hoverCol = -1;
    renderSheet();
  });

  for (const b of document.querySelectorAll('[data-tab]')) {
    b.addEventListener('click', () => {
      tab = b.dataset.tab;
      hoverCol = -1;
      renderSheet();
    });
  }

  // Keyboard: 1–7 drop in that column; arrows move; Enter or Space drops in
  // the selected cell's column; Ctrl+Z undoes; F2 starts a new game.
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.kg-modal:not([hidden])') || e.target.closest('input, textarea, select')) return;
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
    if (/^[1-7]$/.test(e.key) && tab === 'board') {
      e.preventDefault();
      humanDrop(+e.key - 1);
      return;
    }
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const sel = sels[tab];
    if (moves[e.key]) {
      e.preventDefault();
      sel.x = Math.max(0, Math.min(COLS - 1, sel.x + moves[e.key][0]));
      sel.y = Math.max(0, Math.min(ROWS - 1, sel.y + moves[e.key][1]));
      renderSel();
      tds[sel.y * COLS + sel.x].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && tab === 'board' && sel.x < W && sel.y < H) {
      e.preventDefault();
      humanDrop(sel.x);
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
    <h2>Four in a row</h2>
    <ul>
      <li>The board is the range A1:G6: 7 columns, 6 rows. You're <b>X</b>, the computer is <b>O</b>.</li>
      <li><b>Click</b> any cell in a column (or its column letter) to drop your X into the lowest empty cell of that column.</li>
      <li>Get four in a row across, down or diagonally to win. If the board fills up first, it's a draw.</li>
    </ul>
    <h2>Settings</h2>
    <ul>
      <li><b>Level</b>: Easy, Medium or Hard. A change applies from the computer's next move. Your record is kept for each level.</li>
      <li><b>First</b>: take turns going first (the default), always you, or always the computer.</li>
      <li><b>Undo</b> takes back your last move and the computer's reply.</li>
      <li>Every move is logged on the <b>Moves</b> sheet.</li>
    </ul>
    <h2>Keyboard</h2>
    <ul>
      <li>1–7 drop in columns A–G. Arrows move the selected cell, and Enter or Space drops in its column. Ctrl+Z undoes, F2 starts a new game.</li>
    </ul>
    <p>Connect Four is a trademark of Hasbro. Four in a Row is the traditional game and is not affiliated with Hasbro.</p>`;

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
  if (F.valid(saved)) {
    g = { ...F.replay(saved.first, saved.moves), level: saved.level, counted: !!saved.counted };
    render();
    schedule();
  } else {
    newGame();
  }

  KG.makeWindow(win, {
    minW: 400,
    minH: 400,
    storageKey: `${KEY}-window`,
    rect: (a) => {
      const w = Math.min(660, a.w - 40);
      const h = Math.min(560, a.h - 40);
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
