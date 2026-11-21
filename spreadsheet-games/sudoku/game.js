// Spreadsheet Sudoku: Sudoku in a spreadsheet window. The puzzle is the range
// A1:I9, with unlabeled row and column sums beside and below it. See DESIGN.md.

(() => {
  const LEVELS = {
    easy: { name: 'Easy', clues: 38, singles: true },
    medium: { name: 'Medium', clues: 31, singles: true },
    hard: { name: 'Hard', clues: 26, singles: false },
    expert: { name: 'Expert', clues: 0, singles: false, hardOnly: true },
  };
  const KEY = 'spreadsheet-sudoku'; // + '-level', '-best', '-<level>', '-window'
  // The puzzle's top-left cell is A1; the sums are column J and row 10.
  const X0 = 0;
  const Y0 = 0;
  const TOT_X = X0 + 9;
  const TOT_Y = Y0 + 9;

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
  // Puzzles
  //
  // A board is an array of 81 numbers, 0 for empty. Candidates are 9-bit masks
  // (bit d-1 set means d is allowed).

  const ROW = (i) => Math.floor(i / 9);
  const COL = (i) => i % 9;
  const BOX = (i) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);
  const PEERS = [];
  const UNITS = []; // 27 lists of 9 cells: rows, columns, boxes
  for (let u = 0; u < 9; u++) {
    UNITS.push([...Array(9)].map((_, k) => u * 9 + k));
    UNITS.push([...Array(9)].map((_, k) => k * 9 + u));
    const r = Math.floor(u / 3) * 3;
    const c = (u % 3) * 3;
    UNITS.push([...Array(9)].map((_, k) => (r + Math.floor(k / 3)) * 9 + c + (k % 3)));
  }
  for (let i = 0; i < 81; i++) {
    const s = new Set();
    for (let j = 0; j < 81; j++) if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) s.add(j);
    PEERS.push([...s]);
  }
  const ALL = 0x1ff;
  const bits = (m) => {
    let n = 0;
    for (; m; m &= m - 1) n++;
    return n;
  };
  const digitOf = (m) => 31 - Math.clz32(m) + 1; // the digit of a single-bit mask

  function candidates(b, i) {
    let m = ALL;
    for (const j of PEERS[i]) if (b[j]) m &= ~(1 << (b[j] - 1));
    return m;
  }

  // Count solutions, stopping at `limit`. With `fill`, fills b with the first
  // solution found, trying digits in random order.
  function solve(b, limit = 2, fill = false) {
    let count = 0;
    const work = b.slice();
    const go = () => {
      let best = -1;
      let bestM = 0;
      let bestN = 10;
      for (let i = 0; i < 81; i++) {
        if (work[i]) continue;
        const m = candidates(work, i);
        const n = bits(m);
        if (!n) return false;
        if (n < bestN) {
          best = i;
          bestM = m;
          bestN = n;
          if (n === 1) break;
        }
      }
      if (best < 0) {
        count++;
        if (fill) for (let i = 0; i < 81; i++) b[i] = work[i];
        return count >= limit;
      }
      const ds = [];
      for (let d = 1; d <= 9; d++) if (bestM & (1 << (d - 1))) ds.push(d);
      if (fill) shuffle(ds);
      for (const d of ds) {
        work[best] = d;
        if (go()) return true;
      }
      work[best] = 0;
      return false;
    };
    go();
    return count;
  }

  // Can the puzzle be finished with only naked and hidden singles (no
  // guessing or harder logic)? That's what makes Easy and Medium approachable.
  function singlesSolvable(start) {
    const b = start.slice();
    for (let progress = true; progress; ) {
      progress = false;
      for (let i = 0; i < 81; i++) {
        if (b[i]) continue;
        const m = candidates(b, i);
        if (!m) return false;
        if (bits(m) === 1) {
          b[i] = digitOf(m);
          progress = true;
        }
      }
      for (const unit of UNITS) {
        for (let d = 1; d <= 9; d++) {
          const bit = 1 << (d - 1);
          if (unit.some((i) => b[i] === d)) continue;
          const spots = unit.filter((i) => !b[i] && candidates(b, i) & bit);
          if (spots.length === 1) {
            b[spots[0]] = d;
            progress = true;
          }
        }
      }
    }
    return b.every(Boolean);
  }

  function shuffle(a) {
    for (let k = a.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      [a[k], a[r]] = [a[r], a[k]];
    }
    return a;
  }

  // Make a puzzle with one solution: fill a grid, then empty cells while the
  // solution stays unique (and, for Easy and Medium, while singles alone can
  // solve it), down to the level's clue count. Cells go in symmetric pairs
  // first, like printed puzzles, then one at a time to get below that.
  function makeOne(L) {
    const solution = Array(81).fill(0);
    solve(solution, 1, true);
    const puzzle = solution.slice();
    let clues = 81;
    const tryEmpty = (cells) => {
      if (clues - cells.length < L.clues || cells.some((j) => !puzzle[j])) return;
      const keep = cells.map((j) => puzzle[j]);
      for (const j of cells) puzzle[j] = 0;
      if (solve(puzzle) !== 1 || (L.singles && !singlesSolvable(puzzle))) cells.forEach((j, k) => (puzzle[j] = keep[k]));
      else clues -= cells.length;
    };
    for (const i of shuffle([...Array(41)].map((_, k) => k))) tryEmpty(i === 40 ? [40] : [i, 80 - i]);
    for (const i of shuffle([...Array(81)].map((_, k) => k))) tryEmpty([i]);
    return { puzzle, solution };
  }

  function generate(level) {
    const L = LEVELS[level];
    let made = makeOne(L);
    // Expert: as few clues as it will go, and not solvable by singles alone.
    for (let tries = 0; L.hardOnly && tries < 30 && singlesSolvable(made.puzzle); tries++) made = makeOne(L);
    return made;
  }

  // ---------------------------------------------------------------------------
  // Game state
  //
  // g.puzzle: the givens (0 = blank). g.solution. g.vals: what's in each cell
  // now (givens included). g.notes: a candidate mask per cell. g.won.

  let g;
  let history = []; // undo snapshots of { i, v, n } lists, newest last
  let notesMode = false;

  function fresh(level) {
    const { puzzle, solution } = generate(level);
    return { level, puzzle, solution, vals: puzzle.slice(), notes: Array(81).fill(0), elapsed: 0, won: false };
  }

  const okBoard = (a) => Array.isArray(a) && a.length === 81 && a.every((v) => Number.isInteger(v) && v >= 0 && v <= 9);
  function valid(s, level) {
    return s && s.level === level && okBoard(s.puzzle) && okBoard(s.solution) && okBoard(s.vals) && Array.isArray(s.notes) && s.notes.length === 81;
  }

  function load(level) {
    const s = read(`${KEY}-${level}`);
    g = valid(s, level) ? s : fresh(level);
    history = [];
  }

  function save() {
    write(`${KEY}-${g.level}`, g);
    write(`${KEY}-level`, g.level);
  }

  const given = (i) => g.puzzle[i] !== 0;

  // Cells whose digit repeats in a row, column or box.
  function conflicts() {
    const bad = new Set();
    for (let i = 0; i < 81; i++) if (g.vals[i] && PEERS[i].some((j) => g.vals[j] === g.vals[i])) bad.add(i);
    return bad;
  }

  // Apply a change to some cells, keeping an undo snapshot.
  function change(cells) {
    if (g.won || !cells.length) return;
    history.push(cells.map(({ i }) => ({ i, v: g.vals[i], n: g.notes[i] })));
    if (history.length > 500) history.shift();
    for (const { i, v, n } of cells) {
      g.vals[i] = v;
      g.notes[i] = n;
    }
    checkWin();
    save();
    render();
  }

  function enter(i, d) {
    if (given(i) || g.won) return;
    if (notesMode) {
      if (g.vals[i]) return;
      change([{ i, v: 0, n: g.notes[i] ^ (1 << (d - 1)) }]);
      return;
    }
    if (g.vals[i] === d) return;
    // Placing a digit clears this cell's notes and that digit from its peers' notes.
    const bit = 1 << (d - 1);
    const cells = [{ i, v: d, n: 0 }];
    for (const j of PEERS[i]) if (g.notes[j] & bit) cells.push({ i: j, v: g.vals[j], n: g.notes[j] & ~bit });
    change(cells);
  }

  function erase(i) {
    if (given(i) || g.won || (!g.vals[i] && !g.notes[i])) return;
    change([{ i, v: 0, n: g.vals[i] ? g.notes[i] : 0 }]);
  }

  function undo() {
    if (g.won || !history.length) return;
    for (const { i, v, n } of history.pop()) {
      g.vals[i] = v;
      g.notes[i] = n;
    }
    save();
    render();
  }

  function checkWin() {
    if (!g.vals.every((v, i) => v === g.solution[i])) return;
    g.won = true;
    const best = read(`${KEY}-best`) || {};
    g.best = best[g.level];
    g.newBest = !(best[g.level] <= g.elapsed);
    if (g.newBest) {
      best[g.level] = g.elapsed;
      write(`${KEY}-best`, best);
    }
  }

  function newGame(level = g.level) {
    g = fresh(level);
    history = [];
    $('level').value = level;
    save();
    render();
    select(X0, Y0);
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
  let tds = []; // every td, row by row: tds[y * COLS + x]
  let sel = { x: X0, y: Y0 };

  // The puzzle cell at sheet position (x, y), or -1.
  const cellAt = (x, y) => (x >= X0 && x < X0 + 9 && y >= Y0 && y < Y0 + 9 ? (y - Y0) * 9 + (x - X0) : -1);

  function build() {
    let html = '<thead><tr><th></th>';
    for (let x = 0; x < COLS; x++) html += `<th scope="col">${colName(x)}</th>`;
    html += '</tr></thead><tbody>';
    for (let y = 0; y < ROWS; y++) {
      html += `<tr><th scope="row">${y + 1}</th>`;
      for (let x = 0; x < COLS; x++) {
        let cls = '';
        const i = cellAt(x, y);
        if (i >= 0) {
          const r = ROW(i);
          const c = COL(i);
          if (r === 0) cls += ' et';
          if (c === 0) cls += ' el';
          if (c % 3 === 2) cls += ' er';
          if (r % 3 === 2) cls += ' eb';
        } else if ((x === TOT_X && y >= Y0 && y <= TOT_Y) || (y === TOT_Y && x >= X0 && x < TOT_X)) {
          cls = 'tot';
        }
        html += `<td data-x="${x}" data-y="${y}" class="${cls.trim()}"></td>`;
      }
      html += '</tr>';
    }
    grid.innerHTML = `${html}</tbody>`;
    tds = [...grid.querySelectorAll('td')];
  }

  const noteText = (m) => {
    const ds = [];
    for (let d = 1; d <= 9; d++) if (m & (1 << (d - 1))) ds.push(d);
    return ds.join('');
  };

  function render() {
    const bad = conflicts();
    const selI = cellAt(sel.x, sel.y);
    const selD = selI >= 0 ? g.vals[selI] : 0;
    for (let i = 0; i < 81; i++) {
      const td = tds[(Y0 + ROW(i)) * COLS + X0 + COL(i)];
      const v = g.vals[i];
      let text = '';
      let cls = given(i) ? 'gv' : 'in';
      if (v) {
        text = String(v);
        if (bad.has(i) && !g.won) cls += ' bad';
        if (selD && v === selD) cls += ' same';
      } else if (g.notes[i]) {
        text = noteText(g.notes[i]);
        cls += ' nt';
      }
      for (const e of ['et', 'el', 'er', 'eb']) if (td.classList.contains(e)) cls += ` ${e}`;
      if (td.className !== cls) td.className = cls;
      if (td.textContent !== text) td.textContent = text;
    }
    // Totals: the sum of what's filled in each row and column.
    let all = 0;
    for (let k = 0; k < 9; k++) {
      let r = 0;
      let c = 0;
      for (let m = 0; m < 9; m++) {
        r += g.vals[k * 9 + m];
        c += g.vals[m * 9 + k];
      }
      all += r;
      tds[(Y0 + k) * COLS + TOT_X].textContent = String(r);
      tds[TOT_Y * COLS + X0 + k].textContent = String(c);
    }
    tds[TOT_Y * COLS + TOT_X].textContent = String(all);
    renderPad();
    renderSel();
    renderStatus();
    renderInfo();
    $('undo').disabled = g.won || !history.length;
    document.querySelector('.sheet-win').classList.toggle('won', g.won);
  }

  // The keypad (phones): digits that are all placed are dimmed.
  function renderPad() {
    const counts = Array(10).fill(0);
    for (const v of g.vals) counts[v]++;
    for (const b of document.querySelectorAll('#pad [data-d]')) b.classList.toggle('done', counts[+b.dataset.d] >= 9);
  }

  function renderSel() {
    grid.querySelector('td.sel')?.classList.remove('sel');
    for (const th of grid.querySelectorAll('th.on')) th.classList.remove('on');
    tds[sel.y * COLS + sel.x].classList.add('sel');
    grid.tHead.rows[0].cells[sel.x + 1].classList.add('on');
    grid.tBodies[0].rows[sel.y].cells[0].classList.add('on');
    const r = ref(sel.x, sel.y);
    $('namebox').textContent = r;
    let f = tds[sel.y * COLS + sel.x].textContent;
    const i = cellAt(sel.x, sel.y);
    if (i >= 0 && !g.vals[i] && g.notes[i]) f = `=NOTES(${noteText(g.notes[i]).split('').join(',')})`;
    else if (sel.x === TOT_X && sel.y >= Y0 && sel.y <= TOT_Y) f = `=SUM(${ref(X0, sel.y)}:${ref(TOT_X - 1, sel.y)})`;
    else if (sel.y === TOT_Y && sel.x >= X0 && sel.x < TOT_X) f = `=SUM(${ref(sel.x, Y0)}:${ref(sel.x, TOT_Y - 1)})`;
    $('formula').textContent = f;
  }

  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function renderStatus() {
    const bad = g.won ? 0 : conflicts().size;
    $('state').textContent = g.won ? 'Balanced' : bad ? 'Check values' : 'Ready';
    const left = g.vals.filter((v) => !v).length;
    $('left').textContent = `Blank: ${left}`;
    $('clock').textContent = `Time: ${clock(g.elapsed)}`;
  }

  function renderInfo() {
    const info = $('info');
    const phone = KG.os() === 'phone';
    let html = '';
    if (g.won) {
      const name = LEVELS[g.level].name;
      let best = '';
      if (g.newBest && g.best != null) best = ` New best on ${name} (was ${clock(g.best)}).`;
      else if (g.newBest) best = ` Your best on ${name}.`;
      else if (g.best != null) best = ` Best on ${name}: ${clock(g.best)}.`;
      html = `<b>Sheet balanced</b> in ${clock(g.elapsed)}.${best}
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>
        <button class="kg-btn" type="button" data-signup>Email me new games</button>`;
    } else if (!history.length && g.vals.every((v, i) => v === g.puzzle[i])) {
      html = phone
        ? 'Fill A1:I9 so every row, column and 3×3 block has 1 to 9 once. Tap a cell, then a number below.'
        : 'Fill A1:I9 so every row, column and 3×3 block has 1 to 9 once. Click a cell and type a number. Help has the rules.';
    }
    info.hidden = !html;
    if (info.innerHTML !== html) info.innerHTML = html;
  }

  function select(x, y) {
    sel = { x: Math.max(0, Math.min(COLS - 1, x)), y: Math.max(0, Math.min(ROWS - 1, y)) };
    render();
  }

  function selectAndShow(x, y) {
    select(x, y);
    const td = tds[sel.y * COLS + sel.x];
    const head = grid.tHead.offsetHeight;
    const side = grid.tBodies[0].rows[0].cells[0].offsetWidth;
    if (td.offsetTop - head < wrap.scrollTop) wrap.scrollTop = td.offsetTop - head;
    else if (td.offsetTop + td.offsetHeight > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = td.offsetTop + td.offsetHeight - wrap.clientHeight;
    if (td.offsetLeft - side < wrap.scrollLeft) wrap.scrollLeft = td.offsetLeft - side;
    else if (td.offsetLeft + td.offsetWidth > wrap.scrollLeft + wrap.clientWidth) wrap.scrollLeft = td.offsetLeft + td.offsetWidth - wrap.clientWidth;
  }

  // ---------------------------------------------------------------------------
  // Input

  grid.addEventListener('click', (e) => {
    const td = e.target.closest('td');
    if (td) select(+td.dataset.x, +td.dataset.y);
  });

  function setNotesMode(on) {
    notesMode = on;
    $('notes').setAttribute('aria-pressed', String(on));
  }

  wrap.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const moves = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const i = cellAt(sel.x, sel.y);
    const digit = /^Digit[1-9]$/.test(e.code) ? +e.code.slice(5) : /^Numpad[1-9]$/.test(e.code) ? +e.code.slice(6) : 0;
    if (moves[e.key]) {
      e.preventDefault();
      selectAndShow(sel.x + moves[e.key][0], sel.y + moves[e.key][1]);
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      // Like a spreadsheet: Tab moves right, Enter moves down, within the puzzle.
      if (i < 0) return;
      e.preventDefault();
      const back = e.shiftKey ? -1 : 1;
      if (e.key === 'Tab') selectAndShow(X0 + ((COL(i) + back + 9) % 9), sel.y);
      else selectAndShow(sel.x, Y0 + ((ROW(i) + back + 9) % 9));
    } else if (digit) {
      e.preventDefault();
      if (i < 0) return;
      // Shift+digit writes a note whatever the mode.
      if (e.shiftKey && !notesMode) {
        setNotesMode(true);
        enter(i, digit);
        setNotesMode(false);
      } else {
        enter(i, digit);
      }
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      e.preventDefault();
      if (i >= 0) erase(i);
    } else if (e.key === 'n' || e.key === 'N') {
      setNotesMode(!notesMode);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.kg-modal:not([hidden])')) return;
    if (e.key === 'F2') {
      e.preventDefault();
      newGame();
    } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !e.target.closest('input, textarea, select')) {
      e.preventDefault();
      undo();
    }
  });

  $('pad').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    const i = cellAt(sel.x, sel.y);
    if (!b || i < 0) return;
    if (b.dataset.d) enter(i, +b.dataset.d);
    else erase(i);
  });
  $('info').addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) newGame();
    else if (e.target.closest('[data-signup]')) KG.openSignup();
  });
  $('new').addEventListener('click', () => newGame());
  $('undo').addEventListener('click', () => {
    undo();
    wrap.focus({ preventScroll: true });
  });
  $('notes').addEventListener('click', () => {
    setNotesMode(!notesMode);
    wrap.focus({ preventScroll: true });
  });
  $('level').addEventListener('change', (e) => {
    load(e.target.value);
    save();
    render();
    wrap.focus({ preventScroll: true });
  });

  // ---------------------------------------------------------------------------
  // Clock: counts while a game is going and the page is visible.

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
    <h2>Balance the sheet</h2>
    <ul>
      <li>The puzzle is the range <b>A1:I9</b>. Fill every blank cell so each row, each column and each 3×3 block (marked by the darker borders) has the numbers 1 to 9 once.</li>
      <li>Black numbers are given. Yours are blue, like input cells in a model. A number that repeats in a row, column or block turns red.</li>
      <li>Column J and row 10 add up what's filled in each row and column. A finished row or column totals 45.</li>
    </ul>
    <h2>Entering numbers</h2>
    <ul>
      <li>Click a cell and type 1 to 9. Backspace, Delete or 0 clears it. On a phone, tap a cell, then a number in the bar under the sheet.</li>
      <li><b>Notes</b> (or N) switches to pencil marks: numbers you type are noted in small grey type instead. Shift+number adds a note anytime. Placing a number removes it from the notes around it.</li>
      <li>Undo (Ctrl+Z) takes back your last change.</li>
    </ul>
    <h2>Keyboard</h2>
    <ul>
      <li>Arrow keys move. Tab and Enter move right and down within the puzzle, like a spreadsheet. F2 starts a new game.</li>
    </ul>
    <h2>Levels</h2>
    <ul>
      <li>Every puzzle has exactly one answer. Easy and Medium can be solved by finding the one place a number can go. Hard has fewer clues, and Expert has as few as possible and needs more advanced logic.</li>
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
    $('sheet-title').textContent = KG.pick({ value: 'Sudoku - Spreadsheet', quality: 'Sudoku', power: 'Sudoku — Spreadsheet' });
  }

  const savedLevel = read(`${KEY}-level`);
  const level = savedLevel in LEVELS ? savedLevel : 'easy';
  load(level);
  $('level').value = level;
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
