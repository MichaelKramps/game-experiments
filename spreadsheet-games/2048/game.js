// Spreadsheet 2048: the sliding number puzzle in a spreadsheet window. The
// board is the range A1:D4; tiles are plain numbers in cells. Written from
// scratch (the rules only, no code from the original). See DESIGN.md.

(() => {
  const N = 4;
  const GOAL = 2048;
  const KEY = 'spreadsheet-2048'; // + '-game', '-best', '-scale', '-window'

  const $ = (id) => document.getElementById(id);
  const grid = $('grid');
  const wrap = $('wrap');

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
  // Game state
  //
  // g.cells: 16 numbers, 0 for empty, row by row. g.score. g.state: playing |
  // reached (hit 2048, waiting for New game or Continue) | over. g.kept: the
  // player chose Continue, so 2048 isn't announced again. g.prev: the board
  // and score before the last move. g.undos: undos left this game (1).

  let g;
  let best = read(`${KEY}-best`) || 0;
  let scale = read(`${KEY}-scale`) === true; // the color scale look
  let fresh = new Set(); // cells that just got a new tile (for the fade-in)
  let merged = new Set(); // cells that just merged

  function spawn() {
    const empty = [];
    g.cells.forEach((v, i) => !v && empty.push(i));
    if (!empty.length) return;
    const i = empty[Math.floor(Math.random() * empty.length)];
    g.cells[i] = Math.random() < 0.9 ? 2 : 4;
    fresh.add(i);
  }

  function newGame() {
    g = { cells: Array(N * N).fill(0), score: 0, state: 'playing', kept: false, prev: null, undos: 1 };
    fresh = new Set();
    merged = new Set();
    spawn();
    spawn();
    save();
    render();
  }

  const okState = (s) => s && Array.isArray(s.cells) && s.cells.length === N * N && s.cells.every((v) => Number.isInteger(v) && v >= 0) && Number.isInteger(s.score) && ['playing', 'reached', 'over'].includes(s.state);

  function save() {
    write(`${KEY}-game`, g);
  }

  // The 4 cells of each line, in the order tiles slide toward (first = the
  // edge they slide to).
  function lines(dir) {
    const out = [];
    for (let k = 0; k < N; k++) {
      const line = [];
      for (let m = 0; m < N; m++) {
        if (dir === 'left') line.push(k * N + m);
        else if (dir === 'right') line.push(k * N + (N - 1 - m));
        else if (dir === 'up') line.push(m * N + k);
        else line.push((N - 1 - m) * N + k);
      }
      out.push(line);
    }
    return out;
  }

  // Slide every line toward `dir`. Each tile merges at most once per move.
  // Returns whether anything moved.
  function slide(dir, cells, onMerge) {
    let moved = false;
    for (const line of lines(dir)) {
      const vals = line.map((i) => cells[i]).filter(Boolean);
      const out = [];
      for (let k = 0; k < vals.length; k++) {
        if (vals[k] === vals[k + 1]) {
          out.push(vals[k] * 2);
          onMerge?.(line[out.length - 1], vals[k] * 2);
          k++;
        } else {
          out.push(vals[k]);
        }
      }
      line.forEach((i, k) => {
        const v = out[k] || 0;
        if (cells[i] !== v) moved = true;
        cells[i] = v;
      });
    }
    return moved;
  }

  const canMove = () => ['left', 'right', 'up', 'down'].some((d) => slide(d, g.cells.slice()));

  function move(dir) {
    if (g.state !== 'playing') return;
    fresh = new Set();
    merged = new Set();
    const prev = { cells: g.cells.slice(), score: g.score };
    const moved = slide(dir, g.cells, (i, v) => {
      merged.add(i);
      g.score += v;
    });
    if (!moved) return;
    g.prev = prev;
    spawn();
    if (g.score > best) {
      best = g.score;
      write(`${KEY}-best`, best);
    }
    if (!g.kept && g.cells.some((v) => v >= GOAL)) g.state = 'reached';
    else if (!canMove()) g.state = 'over';
    save();
    render();
  }

  // One undo per game: back to the board before the last move (that move's
  // new tile goes too). Works after a game over as well.
  const canUndo = () => g.undos > 0 && !!g.prev && g.state !== 'reached';

  function undo() {
    if (!canUndo()) return;
    g.cells = g.prev.cells;
    g.score = g.prev.score;
    g.prev = null;
    g.undos--;
    g.state = 'playing';
    fresh = new Set();
    merged = new Set();
    save();
    render();
    wrap.focus({ preventScroll: true });
  }

  // After reaching 2048: keep going on the same board.
  function keepGoing() {
    g.kept = true;
    g.state = canMove() ? 'playing' : 'over';
    save();
    render();
    wrap.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------------------
  // The sheet

  const colName = (c) => {
    let s = '';
    for (c += 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
    return s;
  };
  const ref = (x, y) => `${colName(x)}${y + 1}`;

  const COLS = 30;
  const ROWS = 50;
  let tds = [];
  let sel = { x: 0, y: 0 };

  function build() {
    let html = '<thead><tr><th></th>';
    for (let x = 0; x < COLS; x++) html += `<th scope="col">${colName(x)}</th>`;
    html += '</tr></thead><tbody>';
    for (let y = 0; y < ROWS; y++) {
      html += `<tr><th scope="row">${y + 1}</th>`;
      for (let x = 0; x < COLS; x++) html += `<td data-x="${x}" data-y="${y}"></td>`;
      html += '</tr>';
    }
    grid.innerHTML = `${html}</tbody>`;
    tds = [...grid.querySelectorAll('td')];
  }

  function render() {
    for (let i = 0; i < N * N; i++) {
      const x = i % N;
      const y = Math.floor(i / N);
      const td = tds[y * COLS + x];
      const v = g.cells[i];
      let cls = 'b';
      if (y === 0) cls += ' et';
      if (x === 0) cls += ' el';
      if (x === N - 1) cls += ' er';
      if (y === N - 1) cls += ' eb';
      if (v) cls += v >= GOAL ? ' v big' : ' v';
      if (fresh.has(i)) cls += ' new';
      if (merged.has(i)) cls += ' pop';
      if (sel.x === x && sel.y === y) cls += ' sel';
      td.className = cls;
      td.textContent = v ? String(v) : '';
      td.style.setProperty('--lv', v ? Math.log2(v) : 0);
    }
    renderSel();
    renderStatus();
    renderInfo();
    $('undo').disabled = !canUndo();
    $('undo-label').textContent = `Undo (${g.undos})`;
    $('undo').title = g.undos > 0 ? 'Undo your last move (1 per game, Ctrl+Z)' : 'Undo already used this game';
    document.querySelector('.sheet-win').classList.toggle('scaled', scale);
  }

  function renderSel() {
    grid.querySelector('td.sel')?.classList.remove('sel');
    for (const th of grid.querySelectorAll('th.on')) th.classList.remove('on');
    tds[sel.y * COLS + sel.x].classList.add('sel');
    grid.tHead.rows[0].cells[sel.x + 1].classList.add('on');
    grid.tBodies[0].rows[sel.y].cells[0].classList.add('on');
    $('namebox').textContent = ref(sel.x, sel.y);
    let f = '';
    if (sel.x < N && sel.y < N) {
      const i = sel.y * N + sel.x;
      const v = g.cells[i];
      // A tile that just merged shows the sum that made it.
      if (v && merged.has(i)) f = `=${v / 2}+${v / 2}`;
      else if (v) f = String(v);
    }
    $('formula').textContent = f;
  }

  function renderStatus() {
    $('state').textContent = { playing: 'Ready', reached: 'Ready', over: 'Calculation complete' }[g.state];
    $('score').textContent = `Score: ${g.score.toLocaleString('en-US')}`;
    $('best').textContent = `Best: ${best.toLocaleString('en-US')}`;
  }

  function renderInfo() {
    const info = $('info');
    const phone = KG.os() === 'phone';
    const top = Math.max(...g.cells);
    let html = '';
    if (g.state === 'reached') {
      html = `<b>${GOAL.toLocaleString('en-US')} reached</b> with a score of ${g.score.toLocaleString('en-US')}.
        <button class="kg-btn kg-primary" type="button" data-continue>Continue</button>
        <button class="kg-btn" type="button" data-new>New game</button>
        <button class="kg-btn" type="button" data-signup>Email me new games</button>`;
    } else if (g.state === 'over') {
      html = `<b>No moves left.</b> Score ${g.score.toLocaleString('en-US')}, top tile ${top.toLocaleString('en-US')}.
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>`;
      if (canUndo()) html += ' <button class="kg-btn" type="button" data-undo>Undo last move</button>';
      if (top >= GOAL) html += ' <button class="kg-btn" type="button" data-signup>Email me new games</button>';
    } else if (!g.score && g.cells.filter(Boolean).length <= 2) {
      html = phone
        ? 'Swipe to slide every number. Two equal numbers that meet add up into one. Make 2048.'
        : 'Use the arrow keys to slide every number. Two equal numbers that meet add up into one. Make 2048. Help has the rules.';
    }
    info.hidden = !html;
    if (info.innerHTML !== html) info.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Input: arrow keys or WASD, swipes on touch screens

  const DIRS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.kg-modal:not([hidden])') || e.target.closest('input, textarea, select')) return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') {
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
    const dir = DIRS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!dir) return;
    e.preventDefault();
    move(dir);
  });

  grid.addEventListener('click', (e) => {
    const td = e.target.closest('td');
    if (!td) return;
    sel = { x: +td.dataset.x, y: +td.dataset.y };
    renderSel();
  });

  let touch = null;
  wrap.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    touch = { x: e.clientX, y: e.clientY };
  });
  wrap.addEventListener('pointerup', (e) => {
    if (!touch) return;
    const dx = e.clientX - touch.x;
    const dy = e.clientY - touch.y;
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; // a tap, not a swipe
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
    else move(dy > 0 ? 'down' : 'up');
  });
  wrap.addEventListener('pointercancel', () => (touch = null));

  $('info').addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) newGame();
    else if (e.target.closest('[data-continue]')) keepGoing();
    else if (e.target.closest('[data-undo]')) undo();
    else if (e.target.closest('[data-signup]')) KG.openSignup();
  });
  $('new').addEventListener('click', () => {
    newGame();
    wrap.focus({ preventScroll: true });
  });
  $('undo').addEventListener('click', undo);
  $('scale').setAttribute('aria-pressed', String(scale));
  $('scale').addEventListener('click', (e) => {
    scale = !scale;
    e.currentTarget.setAttribute('aria-pressed', String(scale));
    write(`${KEY}-scale`, scale);
    render();
    wrap.focus({ preventScroll: true });
  });

  addEventListener('pagehide', () => g && save());

  // ---------------------------------------------------------------------------
  // Help

  const HELP = `
    <h2>Make 2048</h2>
    <ul>
      <li>The board is the range <b>A1:D4</b>. Each move slides every number as far as it goes: arrow keys (or W A S D) on a keyboard, swipes on a phone.</li>
      <li>Two equal numbers that slide into each other add up into one cell: 2 and 2 make 4, 4 and 4 make 8, and so on. A new 2 (sometimes a 4) appears after every move.</li>
      <li>Every sum you make adds to your score (shown in the status bar, with your best).</li>
      <li>Reach 2048 to win. Then pick <b>Continue</b> to keep building on the same board, or <b>New game</b>.</li>
      <li>The game ends when the board is full and no two neighbors match.</li>
      <li>You get one <b>Undo</b> per game (Ctrl+Z). It takes back your last move and the number that appeared after it, even after the game ends.</li>
    </ul>
    <h2>Color scale</h2>
    <ul>
      <li>Turn on <b>Color scale</b> in the toolbar to shade the numbers from green to red by size, like conditional formatting. It's easier to read but less like a plain sheet.</li>
    </ul>
    <h2>Keyboard</h2>
    <ul>
      <li>Arrow keys or W A S D move, Ctrl+Z undoes (once per game), F2 starts a new game.</li>
    </ul>`;

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

  function retitle() {
    $('sheet-title').textContent = KG.pick({ value: '2048 - Spreadsheet', quality: '2048', power: '2048 — Spreadsheet' });
  }

  build();
  retitle();
  const saved = read(`${KEY}-game`);
  if (okState(saved)) {
    g = saved;
    // Games saved before undo existed get their one undo.
    if (!Number.isInteger(g.undos)) g.undos = 1;
    if (!g.prev || !Array.isArray(g.prev.cells) || g.prev.cells.length !== N * N) g.prev = null;
    render();
  } else {
    newGame();
  }

  KG.makeWindow($('sheet'), {
    minW: 420,
    minH: 320,
    storageKey: `${KEY}-window`,
    rect: (a) => {
      const w = Math.min(1100, a.w - 40);
      const h = Math.min(680, a.h - 40);
      return { x: a.x + (a.w - w) / 2, y: a.y + (a.h - h) / 3, w, h };
    },
  });
  KG.onChange(() => {
    retitle();
    renderInfo();
  });
  wrap.focus({ preventScroll: true });
})();
