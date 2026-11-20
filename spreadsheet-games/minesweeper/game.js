// Spreadsheet Minesweeper: Minesweeper in a spreadsheet window. The board is
// the shaded range starting at A1; the rest of the sheet is ordinary empty
// cells. See DESIGN.md.

(() => {
  const LEVELS = {
    beginner: { name: 'Beginner', w: 9, h: 9, m: 10 },
    intermediate: { name: 'Intermediate', w: 16, h: 16, m: 40 },
    expert: { name: 'Expert', w: 30, h: 16, m: 99 },
  };
  // Custom sizes use the classic limits (width 9–30, height 9–24, at least 10
  // mines). The most mines is w*h - 9, so the first click's 3×3 always fits.
  const CUSTOM = { minW: 9, maxW: 30, minH: 9, maxH: 24, minM: 10 };
  const maxMines = (w, h) => w * h - 9;
  const KEY = 'spreadsheet-minesweeper'; // + '-level', '-best', '-<level>', '-custom-size', '-shade'
  const LONG_PRESS = 450;

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
  // g.mines: null until the first reveal (so the first click is always safe),
  // then a 0/1 array. g.open / g.flag: 0/1 arrays. g.state: ready | playing |
  // won | lost. g.boom: the mine that ended the game.

  let g;
  let counts = [];
  // The default look is the better disguise: hidden cells are plain and show
  // "-", and revealed cells with no mines around them show "0". Shading turns
  // on the original look: hidden cells shaded, zeros blank.
  let shade = read(`${KEY}-shade`) === true;

  const whole = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  const customOk = (s) => s && whole(s.w, CUSTOM.minW, CUSTOM.maxW) && whole(s.h, CUSTOM.minH, CUSTOM.maxH) && whole(s.m, CUSTOM.minM, maxMines(s.w, s.h));

  // The last custom size, or null if none has been set.
  function customSize() {
    const s = read(`${KEY}-custom-size`);
    return customOk(s) ? { w: s.w, h: s.h, m: s.m } : null;
  }

  function size(level) {
    if (level === 'custom') return { name: 'Custom', ...(customSize() || { w: 20, h: 16, m: 64 }) };
    return LEVELS[level];
  }

  function fresh(level) {
    const L = size(level);
    const n = L.w * L.h;
    return { level, w: L.w, h: L.h, m: L.m, mines: null, open: Array(n).fill(0), flag: Array(n).fill(0), state: 'ready', elapsed: 0, boom: -1 };
  }

  function valid(s, level) {
    const L = size(level);
    const n = L.w * L.h;
    return s && s.level === level && s.w === L.w && s.h === L.h && s.m === L.m && Array.isArray(s.open) && s.open.length === n && Array.isArray(s.flag) && s.flag.length === n && (s.mines === null || (Array.isArray(s.mines) && s.mines.length === n));
  }

  function load(level) {
    const s = read(`${KEY}-${level}`);
    g = valid(s, level) ? s : fresh(level);
    computeCounts();
  }

  function save() {
    write(`${KEY}-${g.level}`, g);
    write(`${KEY}-level`, g.level);
  }

  function neighbors(i) {
    const x = i % g.w;
    const y = (i - x) / g.w;
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h) out.push(ny * g.w + nx);
      }
    }
    return out;
  }

  function computeCounts() {
    counts = g.mines ? g.mines.map((_, i) => neighbors(i).reduce((s, j) => s + g.mines[j], 0)) : [];
  }

  // Mines go anywhere except the first cell and its neighbors.
  function placeMines(first) {
    const keep = new Set([first, ...neighbors(first)]);
    const spots = [];
    for (let i = 0; i < g.w * g.h; i++) if (!keep.has(i)) spots.push(i);
    for (let k = spots.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      [spots[k], spots[r]] = [spots[r], spots[k]];
    }
    g.mines = Array(g.w * g.h).fill(0);
    for (const i of spots.slice(0, g.m)) g.mines[i] = 1;
    computeCounts();
  }

  function over() {
    return g.state === 'won' || g.state === 'lost';
  }

  function reveal(i) {
    if (g.state === 'ready') {
      placeMines(i);
      g.state = 'playing';
    }
    if (g.mines[i]) {
      g.state = 'lost';
      g.boom = i;
      return;
    }
    const todo = [i];
    while (todo.length) {
      const j = todo.pop();
      if (g.open[j] || g.flag[j]) continue;
      g.open[j] = 1;
      if (counts[j] === 0) for (const k of neighbors(j)) if (!g.open[k] && !g.flag[k]) todo.push(k);
    }
  }

  // A click on a cell: reveal a hidden one, or on a number whose flags are
  // all placed, reveal its other neighbors.
  function act(i) {
    if (over() || g.flag[i]) return;
    if (!g.open[i]) {
      reveal(i);
    } else {
      const around = neighbors(i);
      if (!counts[i] || around.filter((j) => g.flag[j]).length !== counts[i]) return;
      for (const j of around) if (!g.open[j] && !g.flag[j] && !over()) reveal(j);
    }
    checkWin();
    save();
    render();
  }

  function toggleFlag(i) {
    if (over() || g.open[i]) return;
    g.flag[i] = g.flag[i] ? 0 : 1;
    save();
    render();
  }

  function checkWin() {
    if (g.state !== 'playing') return;
    const opened = g.open.reduce((s, v) => s + v, 0);
    if (opened !== g.w * g.h - g.m) return;
    g.state = 'won';
    g.flag = g.mines.slice();
    if (g.level === 'custom') return; // no best times for custom sizes, as in the classic game
    const best = read(`${KEY}-best`) || {};
    g.best = best[g.level];
    if (!(best[g.level] <= g.elapsed)) {
      best[g.level] = g.elapsed;
      write(`${KEY}-best`, best);
      g.newBest = true;
    }
  }

  function newGame(level = g.level) {
    g = fresh(level);
    counts = [];
    syncLevels();
    save();
    build();
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

  let cols = 0;
  let rows = 0;
  let tds = []; // every td, row by row: tds[y * cols + x]
  let sel = { x: 0, y: 0 };

  function build() {
    cols = Math.max(g.w + 4, 52); // A–AZ: enough to fill a maximized window
    rows = Math.max(g.h + 12, 60);
    let html = '<thead><tr><th></th>';
    for (let x = 0; x < cols; x++) html += `<th scope="col">${colName(x)}</th>`;
    html += '</tr></thead><tbody>';
    for (let y = 0; y < rows; y++) {
      html += `<tr><th scope="row">${y + 1}</th>`;
      for (let x = 0; x < cols; x++) html += `<td data-x="${x}" data-y="${y}"></td>`;
      html += '</tr>';
    }
    grid.innerHTML = `${html}</tbody>`;
    tds = [...grid.querySelectorAll('td')];
    sel = { x: Math.min(sel.x, cols - 1), y: Math.min(sel.y, rows - 1) };
  }

  const inBoard = (x, y) => x < g.w && y < g.h;

  function cellView(i) {
    const lost = g.state === 'lost';
    if (g.open[i]) return { cls: `n${counts[i]}`, text: counts[i] || !shade ? String(counts[i]) : '' };
    if (lost && g.mines[i] && !g.flag[i]) return { cls: `mine${i === g.boom ? ' boom' : ''}`, text: '#REF!' };
    if (lost && g.flag[i] && !g.mines[i]) return { cls: 'wrong', text: '#N/A' };
    return { cls: g.flag[i] ? 'h f' : 'h', text: shade ? '' : '-' };
  }

  function render() {
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const i = y * g.w + x;
        const { cls, text } = cellView(i);
        const td = tds[y * cols + x];
        let edge = '';
        if (y === 0) edge += ' et';
        if (x === 0) edge += ' el';
        if (x === g.w - 1) edge += ' er';
        if (y === g.h - 1) edge += ' eb';
        td.className = cls + edge;
        if (td.textContent !== text) td.textContent = text;
      }
    }
    renderSel();
    renderStatus();
    renderInfo();
    document.querySelector('.sheet-win').classList.toggle('playing', !over());
    document.querySelector('.sheet-win').classList.toggle('shaded', shade);
  }

  function renderSel() {
    grid.querySelector('td.sel')?.classList.remove('sel');
    for (const th of grid.querySelectorAll('th.on')) th.classList.remove('on');
    tds[sel.y * cols + sel.x].classList.add('sel');
    grid.tHead.rows[0].cells[sel.x + 1].classList.add('on');
    grid.tBodies[0].rows[sel.y].cells[0].classList.add('on');
    const r = ref(sel.x, sel.y);
    $('namebox').textContent = r;
    let f = '';
    if (inBoard(sel.x, sel.y)) {
      const i = sel.y * g.w + sel.x;
      const v = cellView(i);
      if (g.open[i]) f = `=NEIGHBORS(${r})`;
      else if (g.flag[i] && g.state !== 'lost') f = '=FLAG()';
      else if (v.text) f = v.text;
    }
    $('formula').textContent = f;
  }

  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function renderStatus() {
    $('state').textContent = { ready: 'Ready', playing: 'Ready', won: 'Cleared', lost: 'Error' }[g.state];
    const flags = g.flag.reduce((s, v) => s + v, 0);
    $('left').textContent = `Mines left: ${g.m - flags}`;
    $('clock').textContent = `Time: ${clock(g.elapsed)}`;
  }

  function renderInfo() {
    const info = $('info');
    const phone = KG.os() === 'phone';
    if (g.state === 'playing') {
      info.hidden = true;
      return;
    }
    info.hidden = false;
    if (g.state === 'ready') {
      info.innerHTML = phone
        ? `Tap a ${shade ? 'shaded' : 'hidden (-)'} cell to start. Long-press a cell, or turn on Flag, to flag a mine.`
        : `Click a ${shade ? 'shaded' : 'hidden (-)'} cell to start. Right-click to flag a mine. Help has the rules.`;
    } else if (g.state === 'won') {
      const name = size(g.level).name;
      let best = '';
      if (g.newBest && g.best != null) best = ` New best on ${name} (was ${clock(g.best)}).`;
      else if (g.newBest) best = ` Your best on ${name}.`;
      else if (g.best != null) best = ` Best on ${name}: ${clock(g.best)}.`;
      info.innerHTML = `<b>Sheet cleared</b> in ${clock(g.elapsed)}.${best}
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>
        <button class="kg-btn" type="button" data-signup>Email me new games</button>`;
    } else {
      info.innerHTML = '<b>#REF!</b> That cell was a mine. <button class="kg-btn kg-primary" type="button" data-new>New game</button>';
    }
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

  // ---------------------------------------------------------------------------
  // Input

  let flagMode = false;
  let pressTimer = 0;
  let pressStart = null;
  let suppressUntil = 0; // ignore the click that ends a long press

  const cellOf = (e) => {
    const td = e.target.closest('td');
    return td ? { x: +td.dataset.x, y: +td.dataset.y } : null;
  };

  grid.addEventListener('click', (e) => {
    const c = cellOf(e);
    if (!c) return;
    if (Date.now() < suppressUntil) return;
    select(c.x, c.y);
    if (!inBoard(c.x, c.y)) return;
    const i = c.y * g.w + c.x;
    if (flagMode && !g.open[i]) toggleFlag(i);
    else act(i);
  });

  grid.addEventListener('contextmenu', (e) => {
    const c = cellOf(e);
    if (!c) return;
    e.preventDefault();
    if (Date.now() < suppressUntil + 600) return; // the long press already flagged it
    select(c.x, c.y);
    if (inBoard(c.x, c.y)) toggleFlag(c.y * g.w + c.x);
  });

  grid.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const c = cellOf(e);
    if (!c || !inBoard(c.x, c.y)) return;
    pressStart = { x: e.clientX, y: e.clientY };
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      pressTimer = 0;
      suppressUntil = Date.now() + 1e9; // until the finger lifts
      select(c.x, c.y);
      toggleFlag(c.y * g.w + c.x);
      navigator.vibrate?.(15);
    }, LONG_PRESS);
  });
  const endPress = () => {
    clearTimeout(pressTimer);
    pressTimer = 0;
    if (suppressUntil > Date.now() + 1e8) suppressUntil = Date.now() + 400;
  };
  grid.addEventListener('pointerup', endPress);
  grid.addEventListener('pointercancel', endPress);
  grid.addEventListener('pointermove', (e) => {
    if (pressTimer && pressStart && Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 8) {
      clearTimeout(pressTimer);
      pressTimer = 0;
    }
  });

  wrap.addEventListener('keydown', (e) => {
    const moves = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (moves[e.key]) {
      e.preventDefault();
      selectAndShow(sel.x + moves[e.key][0], sel.y + moves[e.key][1]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (inBoard(sel.x, sel.y)) act(sel.y * g.w + sel.x);
    } else if (e.key === 'f' || e.key === 'F') {
      if (inBoard(sel.x, sel.y)) toggleFlag(sel.y * g.w + sel.x);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F2' && !document.querySelector('.kg-modal')) {
      e.preventDefault();
      newGame();
    }
  });

  $('info').addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) newGame();
    else if (e.target.closest('[data-signup]')) KG.openSignup();
  });
  $('new').addEventListener('click', () => newGame());
  $('level').addEventListener('change', (e) => {
    if (e.target.value === 'custom-new') {
      showCustom();
      return;
    }
    load(e.target.value);
    save();
    build();
    render();
  });

  // The Size menu: the three standard sizes, the last custom size (once one
  // is set) and "Custom size…", which opens the dialog.
  function syncLevels() {
    const menu = $('level');
    // Without storage the size isn't saved, so fall back to the game itself.
    const c = customSize() || (g.level === 'custom' ? g : null);
    let opt = menu.querySelector('option[value="custom"]');
    if (c) {
      if (!opt) {
        opt = new Option('', 'custom');
        menu.insertBefore(opt, menu.querySelector('option[value="custom-new"]'));
      }
      opt.textContent = `Custom · ${c.w}×${c.h} · ${c.m}`;
    } else {
      opt?.remove();
    }
    menu.value = g.level;
  }

  // ---------------------------------------------------------------------------
  // Custom size dialog

  function showCustom() {
    if (document.querySelector('.ms-custom')) return;
    const start = customSize() || (g.level === 'custom' ? g : { w: 20, h: 16, m: 64 });
    const box = document.createElement('div');
    box.className = 'kg-modal ms-custom';
    box.innerHTML = `<form class="window kg-dialog" role="dialog" aria-modal="true" aria-labelledby="ms-custom-title">
      <div class="titlebar">
        <div class="lights"><span class="close" data-cancel></span><span class="min"></span><span class="max"></span></div>
        <div class="window-title" id="ms-custom-title">Custom size</div>
      </div>
      <div class="ms-custom-body">
        <label>Width <span>columns, ${CUSTOM.minW}–${CUSTOM.maxW}</span><input name="w" type="number" inputmode="numeric" min="${CUSTOM.minW}" max="${CUSTOM.maxW}" value="${start.w}" required></label>
        <label>Height <span>rows, ${CUSTOM.minH}–${CUSTOM.maxH}</span><input name="h" type="number" inputmode="numeric" min="${CUSTOM.minH}" max="${CUSTOM.maxH}" value="${start.h}" required></label>
        <label>Mines <span id="ms-mines-range"></span><input name="m" type="number" inputmode="numeric" min="${CUSTOM.minM}" value="${start.m}" required></label>
        <p class="ms-custom-range" id="ms-custom-range"></p>
      </div>
      <div class="ms-custom-foot">
        <button class="kg-btn" type="button" data-cancel>Cancel</button>
        <button class="kg-btn kg-primary" type="submit">Start</button>
      </div>
    </form>`;
    const form = box.querySelector('form');
    const num = (name) => Math.round(Number(form.elements[name].value));
    const clampTo = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
    // Read the fields, fit each into its allowed range, and show the result.
    const values = () => {
      const w = clampTo(num('w'), CUSTOM.minW, CUSTOM.maxW);
      const h = clampTo(num('h'), CUSTOM.minH, CUSTOM.maxH);
      const m = clampTo(num('m'), CUSTOM.minM, maxMines(w, h));
      return { w, h, m };
    };
    const update = () => {
      const { w, h, m } = values();
      form.elements.m.max = maxMines(w, h);
      box.querySelector('#ms-mines-range').textContent = `${CUSTOM.minM}–${maxMines(w, h)}`;
      box.querySelector('#ms-custom-range').textContent = `Range A1:${ref(w - 1, h - 1)} · ${w}×${h} with ${m} mines`;
    };
    const done = () => {
      box.remove();
      document.removeEventListener('keydown', onKey, true);
      syncLevels(); // puts the menu back on the current game if cancelled
      wrap.focus();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        done();
      }
    };
    form.addEventListener('input', update);
    // Leaving a field snaps every field to what will actually be used.
    form.addEventListener('change', () => {
      const v = values();
      for (const k of ['w', 'h', 'm']) form.elements[k].value = v[k];
      update();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      write(`${KEY}-custom-size`, values());
      done();
      newGame('custom');
    });
    box.addEventListener('click', (e) => {
      if (e.target.closest('[data-cancel]') || e.target === box) done();
    });
    document.addEventListener('keydown', onKey, true);
    update();
    document.body.append(box);
    form.elements.w.select();
  }
  $('shade').setAttribute('aria-pressed', String(shade));
  $('shade').addEventListener('click', (e) => {
    shade = !shade;
    e.currentTarget.setAttribute('aria-pressed', String(shade));
    write(`${KEY}-shade`, shade);
    render();
  });
  $('flag-mode').addEventListener('click', (e) => {
    flagMode = !flagMode;
    e.currentTarget.setAttribute('aria-pressed', String(flagMode));
  });

  // ---------------------------------------------------------------------------
  // Clock: counts while a game is going and the page is visible.

  setInterval(() => {
    if (g.state !== 'playing' || document.hidden) return;
    g.elapsed++;
    renderStatus();
    if (g.elapsed % 5 === 0) save();
  }, 1000);
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => document.hidden && save());

  // ---------------------------------------------------------------------------
  // Help

  const HELP = `
    <h2>Clear the sheet</h2>
    <ul>
      <li>Hidden cells show a dash (-). Click one to reveal it. Your first click is always safe.</li>
      <li>A number counts the mines in the 8 cells around it. A 0 has none, and opens its neighbors for you.</li>
      <li>Reveal every cell that isn't a mine to win. Reveal a mine and it's over.</li>
    </ul>
    <h2>Flags</h2>
    <ul>
      <li>Right-click a hidden cell to flag it as a mine (a red corner marker). On a phone, long-press it, or turn on <b>Flag</b> in the toolbar.</li>
      <li>Click a number that already has that many flags around it to reveal the rest of its neighbors.</li>
    </ul>
    <h2>Shading</h2>
    <ul>
      <li>Turn on <b>Shading</b> in the toolbar for an easier-to-read board: hidden cells are shaded and zeros are left blank.</li>
    </ul>
    <h2>Keyboard</h2>
    <ul>
      <li>Arrow keys move, Enter or Space reveals, F flags, F2 starts a new game.</li>
    </ul>
    <h2>Sizes</h2>
    <ul>
      <li>Beginner 9×9 with 10 mines, Intermediate 16×16 with 40, Expert 30×16 with 99. <b>Custom size…</b> in the Size menu lets you pick your own, up to 30×24.</li>
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
    $('sheet-title').textContent = KG.pick({ value: 'Minesweeper - Spreadsheet', quality: 'Minesweeper', power: 'Minesweeper — Spreadsheet' });
  }

  const savedLevel = read(`${KEY}-level`);
  const level = savedLevel in LEVELS || (savedLevel === 'custom' && customSize()) ? savedLevel : 'beginner';
  load(level);
  syncLevels();
  build();
  retitle();
  render();

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
