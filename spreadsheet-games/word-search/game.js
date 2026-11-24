// Spreadsheet Word Search: the letters fill the range A1 onward and the 12
// words to find are a column beside them (under them on phones). Puzzles come
// from engine.js, themes from words.js. See DESIGN.md.

(() => {
  const WS = WordSearch;
  const KEY = 'spreadsheet-word-search'; // + '-<level>', '-level', '-best', '-theme', '-window'
  const COLORS = 8; // found-word fills, like conditional formatting

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
  // Game state
  //
  // g: the puzzle from WS.generate plus elapsed (seconds), won, and on each
  // word found + color (its fill). One saved puzzle per level, like Sudoku.

  let g;
  let anchor = null; // a first letter clicked, waiting for the last one
  let drag = null; // { start, end, moved } while the pointer is down
  let flash = new Set(); // cells of the word just found

  const found = () => g.words.filter((w) => w.found).length;

  function fresh(level, avoid) {
    const p = WS.generate(level, WORD_THEMES, { avoid });
    write(`${KEY}-theme`, p.theme);
    return { ...p, elapsed: 0, won: false };
  }

  function load(level) {
    const s = read(`${KEY}-${level}`);
    g = WS.valid(s) && s.level === level ? s : fresh(level, read(`${KEY}-theme`));
    if (!Number.isInteger(g.elapsed) || g.elapsed < 0) g.elapsed = 0;
    g.won = found() === WS.WORDS;
    anchor = null;
    flash = new Set();
  }

  function save() {
    write(`${KEY}-${g.level}`, g);
    write(`${KEY}-level`, g.level);
  }

  function newGame(level = g.level) {
    g = fresh(level, g?.theme);
    anchor = null;
    flash = new Set();
    $('level').value = level;
    save();
    render();
  }

  // Check a selection from cell a to cell b against the list.
  function submit(a, b) {
    const k = WS.match(g, a, b);
    if (k < 0 || g.words[k].found) return false;
    const w = g.words[k];
    w.found = true;
    w.color = (found() - 1) % COLORS;
    flash = new Set(w.cells);
    if (found() === WS.WORDS) win_();
    save();
    return true;
  }

  function win_() {
    g.won = true;
    const best = read(`${KEY}-best`) || {};
    g.best = best[g.level];
    g.newBest = !(best[g.level] <= g.elapsed);
    if (g.newBest) {
      best[g.level] = g.elapsed;
      write(`${KEY}-best`, best);
    }
  }

  // ---------------------------------------------------------------------------
  // The sheet. Desktop: the grid, a blank column, then Words and Found. Phone:
  // the grid fills the width and the list sits under it, two words a row, each
  // word cell merged across a few columns.

  const colName = (c) => {
    let s = '';
    for (c += 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
    return s;
  };
  const ref = (x, y) => `${colName(x)}${y + 1}`;

  const COLS = 26;
  const ROWS = 40;
  let L = null; // the layout: { phone, n, slots: [{ x, y, span, fx }], head }
  let cellAt = new Map(); // "x,y" → td (merged cells map every covered spot)
  let sel = { x: 0, y: 0 };

  function layout() {
    const phone = KG.os() === 'phone';
    const n = g.n;
    const slots = [];
    if (phone) {
      const half = Math.floor(n / 2);
      for (let k = 0; k < WS.WORDS; k++) {
        const x = (k % 2) * half;
        slots.push({ x, y: n + 1 + Math.floor(k / 2), span: half - 1, fx: x + half - 1 });
      }
    } else {
      for (let k = 0; k < WS.WORDS; k++) slots.push({ x: n + 1, y: k + 1, span: 1, fx: n + 2 });
    }
    return { phone, n, slots, head: !phone };
  }

  function build() {
    L = layout();
    const spans = new Map(L.slots.map((s, k) => [`${s.x},${s.y}`, { span: s.span, k }]));
    let html = '<thead><tr><th></th>';
    for (let x = 0; x < COLS; x++) {
      const cls = !L.phone && x === L.n + 1 ? ' class="wcol"' : !L.phone && x === L.n + 2 ? ' class="fcol"' : '';
      html += `<th scope="col"${cls}>${colName(x)}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (let y = 0; y < ROWS; y++) {
      html += `<tr><th scope="row">${y + 1}</th>`;
      for (let x = 0; x < COLS; x++) {
        const s = spans.get(`${x},${y}`);
        if (s && s.span > 1) {
          html += `<td data-x="${x}" data-y="${y}" colspan="${s.span}"></td>`;
          x += s.span - 1;
        } else {
          html += `<td data-x="${x}" data-y="${y}"></td>`;
        }
      }
      html += '</tr>';
    }
    grid.innerHTML = `${html}</tbody>`;
    cellAt = new Map();
    for (const td of grid.querySelectorAll('td')) {
      const x = +td.dataset.x;
      const y = +td.dataset.y;
      for (let k = 0; k < (td.colSpan || 1); k++) cellAt.set(`${x + k},${y}`, td);
    }
    sizeCells();
  }

  // Phones size the cells so the whole grid fits the width, square.
  function sizeCells() {
    if (!L.phone) {
      win.style.removeProperty('--s-cell');
      win.style.removeProperty('--s-row');
      return;
    }
    const w = Math.floor((wrap.clientWidth - 42) / L.n);
    const px = Math.max(22, Math.min(36, w));
    win.style.setProperty('--s-cell', `${px}px`);
    win.style.setProperty('--s-row', `${px}px`);
  }

  // Rebuild only when the layout changes (level size or phone vs desktop).
  function ensureLayout() {
    const phone = KG.os() === 'phone';
    if (!L || L.phone !== phone || L.n !== g.n) build();
  }

  const td = (x, y) => cellAt.get(`${x},${y}`);
  const idxOf = (x, y) => y * g.n + x;
  const inGrid = (x, y) => x >= 0 && y >= 0 && x < g.n && y < g.n;

  // The cells being selected right now: a drag, or the clicked first letter.
  function picking() {
    if (drag) return WS.line(g.n, drag.start, drag.end) || [drag.start];
    if (anchor != null) return [anchor];
    return [];
  }

  function render() {
    ensureLayout();
    const n = g.n;
    const fill = new Map(); // cell → color of the last word found through it
    for (const w of g.words) if (w.found) for (const i of w.cells) fill.set(i, w.color);
    const pick = new Set(picking());

    for (const cell of grid.querySelectorAll('td')) {
      cell.className = '';
      cell.textContent = '';
      delete cell.dataset.f;
    }
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = idxOf(x, y);
        const c = td(x, y);
        let cls = 'L';
        if (y === 0) cls += ' et';
        if (x === 0) cls += ' el';
        if (x === n - 1) cls += ' er';
        if (y === n - 1) cls += ' eb';
        if (pick.has(i)) cls += ' pick';
        if (flash.has(i)) cls += ' pop';
        c.className = cls;
        c.textContent = g.grid[i];
        if (fill.has(i)) c.dataset.f = fill.get(i);
      }
    }
    if (L.head) {
      const h = td(L.n + 1, 0);
      h.className = 'hd w';
      h.textContent = 'Words';
      const f = td(L.n + 2, 0);
      f.className = 'hd ok';
      f.textContent = 'Found';
    }
    g.words.forEach((w, k) => {
      const s = L.slots[k];
      const c = td(s.x, s.y);
      c.className = w.found ? 'w done' : 'w';
      c.textContent = w.word;
      if (w.found) c.dataset.f = w.color;
      const f = td(s.fx, s.y);
      f.className = 'ok';
      f.textContent = w.found ? '✓' : '';
    });
    renderSel();
    renderStatus();
    renderInfo();
    retitle();
  }

  function renderSel() {
    grid.querySelector('td.sel')?.classList.remove('sel');
    for (const th of grid.querySelectorAll('th.on')) th.classList.remove('on');
    const c = td(sel.x, sel.y);
    c?.classList.add('sel');
    const x0 = c ? +c.dataset.x : sel.x;
    for (let k = 0; k < (c?.colSpan || 1); k++) grid.tHead.rows[0].cells[x0 + k + 1]?.classList.add('on');
    grid.tBodies[0].rows[sel.y].cells[0].classList.add('on');

    // While selecting letters, the name box shows the range and the formula
    // bar the letters in it.
    const p = picking();
    if (p.length > 1) {
      const a = p[0];
      const b = p[p.length - 1];
      $('namebox').textContent = `${ref(a % g.n, Math.floor(a / g.n))}:${ref(b % g.n, Math.floor(b / g.n))}`;
      $('formula').textContent = p.map((i) => g.grid[i]).join('');
      return;
    }
    $('namebox').textContent = ref(x0, sel.y);
    $('formula').textContent = c ? c.textContent : '';
  }

  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function renderStatus() {
    $('state').textContent = g.won ? 'Calculation complete' : 'Ready';
    $('found').textContent = `Found: ${found()} of ${WS.WORDS}`;
    $('clock').textContent = `Time: ${clock(g.elapsed)}`;
  }

  function renderInfo() {
    const info = $('info');
    const phone = KG.os() === 'phone';
    let html = '';
    if (g.won) {
      const name = WS.LEVELS[g.level].name;
      let best = '';
      if (g.newBest && g.best != null) best = ` New best on ${name} (was ${clock(g.best)}).`;
      else if (g.newBest) best = ` Your best on ${name}.`;
      else if (g.best != null) best = ` Best on ${name}: ${clock(g.best)}.`;
      html = `<b>All ${WS.WORDS} found</b> in ${clock(g.elapsed)}.${best}
        <button class="kg-btn kg-primary" type="button" data-new>New puzzle</button>
        <button class="kg-btn" type="button" data-signup>Email me new games</button>`;
    } else if (!found()) {
      const where = phone ? 'listed under the letters' : `listed in column ${colName(g.n + 1)}`;
      const how = phone ? 'tap its first and last letters' : 'click its first and last letters';
      html = `Find the ${WS.WORDS} words ${where}. They run in any direction, backwards too, and cross each other. Drag across a word, or ${how}.`;
    }
    info.hidden = !html;
    if (info.innerHTML !== html) info.innerHTML = html;
  }

  function retitle() {
    $('sheet-title').textContent = KG.pick({ value: `${g.theme} - Spreadsheet`, quality: g.theme, power: `${g.theme} — Spreadsheet` });
    $('tab').textContent = g.theme;
  }

  // ---------------------------------------------------------------------------
  // Selecting words: drag from the first letter to the last (snapped to the
  // nearest straight line), or click the first letter and then the last.

  // The cell the pointer is over, measured from the drag's first cell so a
  // drag past the grid's edge still works.
  function cellFromPoint(start, e) {
    const c = td(start % g.n, Math.floor(start / g.n));
    const r = c.getBoundingClientRect();
    return {
      dx: Math.round((e.clientX - (r.left + r.width / 2)) / r.width),
      dy: Math.round((e.clientY - (r.top + r.height / 2)) / r.height),
    };
  }

  // Snap a drag of (dx, dy) cells from `start` to the nearest of the 8
  // directions, kept inside the grid.
  function snap(start, dx, dy) {
    if (!dx && !dy) return start;
    const k = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const ux = Math.round(Math.cos((k * Math.PI) / 4));
    const uy = Math.round(Math.sin((k * Math.PI) / 4));
    let len = ux && uy ? Math.round((dx * ux + dy * uy) / 2) : dx * ux + dy * uy;
    const sx = start % g.n;
    const sy = Math.floor(start / g.n);
    while (len > 0 && !inGrid(sx + ux * len, sy + uy * len)) len--;
    return idxOf(sx + ux * len, sy + uy * len);
  }

  // A click or tap on one letter: the first or last letter of a word.
  function tap(i) {
    if (anchor == null) anchor = i;
    else if (anchor === i) anchor = null;
    else if (WS.line(g.n, anchor, i)) {
      submit(anchor, i);
      anchor = null;
    } else anchor = i;
  }

  function letterIdx(el) {
    const c = el?.closest?.('td.L');
    return c ? idxOf(+c.dataset.x, +c.dataset.y) : -1;
  }

  grid.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const c = e.target.closest('td');
    if (!c) return;
    sel = { x: +c.dataset.x, y: +c.dataset.y };
    const i = letterIdx(c);
    if (i < 0 || g.won) {
      renderSel();
      return;
    }
    e.preventDefault();
    wrap.focus({ preventScroll: true });
    drag = { start: i, end: i, id: e.pointerId };
    flash = new Set();
    try {
      grid.setPointerCapture(e.pointerId);
    } catch {}
    render();
  });

  grid.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { dx, dy } = cellFromPoint(drag.start, e);
    const end = snap(drag.start, dx, dy);
    if (end === drag.end) return;
    drag.end = end;
    render();
  });

  function endDrag(e, cancel) {
    if (!drag || e.pointerId !== drag.id) return;
    const { start, end } = drag;
    drag = null;
    if (!cancel) {
      if (end !== start) {
        anchor = null;
        submit(start, end);
      } else {
        tap(start);
      }
    }
    render();
  }
  grid.addEventListener('pointerup', (e) => endDrag(e, false));
  grid.addEventListener('pointercancel', (e) => endDrag(e, true));

  // ---------------------------------------------------------------------------
  // Keyboard: arrows move, Enter or Space picks the first/last letter, Esc
  // drops it, F2 starts a new puzzle.

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.kg-modal:not([hidden])') || e.target.closest('input, textarea, select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'F2') {
      e.preventDefault();
      newGame();
      return;
    }
    if (e.key === 'Escape' && anchor != null) {
      anchor = null;
      render();
      return;
    }
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      const c = td(sel.x, sel.y);
      // step over merged cells
      let x = dx > 0 && c ? +c.dataset.x + c.colSpan : (c ? +c.dataset.x : sel.x) + dx;
      if (dx === 0) x = sel.x;
      const y = Math.max(0, Math.min(ROWS - 1, sel.y + dy));
      x = Math.max(0, Math.min(COLS - 1, x));
      const t = td(x, y);
      sel = { x: t ? +t.dataset.x : x, y };
      renderSel();
      td(sel.x, sel.y)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && inGrid(sel.x, sel.y) && !g.won) {
      e.preventDefault();
      flash = new Set();
      tap(idxOf(sel.x, sel.y));
      render();
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
  $('level').addEventListener('change', (e) => {
    save();
    load(e.target.value);
    save();
    render();
    wrap.focus({ preventScroll: true });
  });

  // ---------------------------------------------------------------------------
  // Clock: counts while a puzzle is going and the page is visible.

  setInterval(() => {
    if (g.won || document.hidden) return;
    g.elapsed++;
    renderStatus();
    if (g.elapsed % 5 === 0) save();
  }, 1000);
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => document.hidden && save());

  // ---------------------------------------------------------------------------
  // Help

  const HELP = `
    <h2>Find the words</h2>
    <ul>
      <li>Each puzzle hides ${WS.WORDS} words from one theme. The theme is the sheet's name, and the words are listed beside the letters (under them on a phone).</li>
      <li><b>Drag</b> from a word's first letter to its last, or <b>click</b> the first letter and then the last. A word you find is filled with a color and checked off the list.</li>
      <li>Find all ${WS.WORDS} to finish. Your best time on each level is saved.</li>
    </ul>
    <h2>Levels</h2>
    <ul>
      <li>On every level, words run in any of 8 directions: across, down, diagonally, and backwards along any of those. They often cross, sharing a letter.</li>
      <li><b>Easy</b> is 10×10, <b>Medium</b> 12×12 and <b>Hard</b> 15×15.</li>
      <li>Each level keeps its own puzzle, so switching level and back picks up where you were.</li>
    </ul>
    <h2>Keyboard</h2>
    <ul>
      <li>Arrows move the selected cell. Enter or Space marks a first or last letter, Esc drops it. F2 starts a new puzzle.</li>
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

  const savedLevel = read(`${KEY}-level`);
  const level = savedLevel in WS.LEVELS ? savedLevel : 'medium';
  load(level);
  $('level').value = level;
  save();
  render();

  KG.makeWindow(win, {
    minW: 420,
    minH: 360,
    storageKey: `${KEY}-window`,
    rect: (a) => {
      const w = Math.min(900, a.w - 40);
      const h = Math.min(680, a.h - 40);
      return { x: a.x + (a.w - w) / 2, y: a.y + (a.h - h) / 3, w, h };
    },
  });
  if (L.phone) sizeCells();
  KG.onChange(() => {
    L = null;
    render();
  });
  addEventListener('resize', () => {
    if (L?.phone) sizeCells();
  });
  wrap.focus({ preventScroll: true });
})();
