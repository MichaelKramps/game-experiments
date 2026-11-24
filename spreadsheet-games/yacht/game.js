// Yacht UI: two windows on the site shell (../../os/os.js).
//   Dice        — a file browser where every die is a file. Roll (styled as
//                 Refresh) throws all five; after that, select the dice to
//                 roll again and Roll rerolls only those.
//   Score sheet — a spreadsheet. Empty categories show a grey preview of what
//                 the dice would score; click one to score it. Totals are
//                 formula cells. Each earlier game keeps its own column.
// Rules live in engine.js. See DESIGN.md.

(() => {
  const E = Engine;
  const KEY = 'yacht'; // + '-game', '-history', '-view', '-sheet', '-roll'

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
  // State
  //
  // history: every earlier game with at least one score, oldest first, as
  // { sheet, yachts, over }. Each gets its own column in the score sheet.

  let g;
  let history = loadHistory();
  let fresh = new Set(); // dice that were just rolled (for the fade-in)
  let justScored = null; // the category just filled (flashes once)
  let ask = null; // the message bar is asking: 'new' | 'clear'
  let screen = 'roll'; // phones show one window at a time, Dice first

  function loadHistory() {
    const h = read(`${KEY}-history`);
    if (!Array.isArray(h)) return [];
    return h.filter((x) => x && typeof x.sheet === 'object' && x.sheet && Number.isInteger(x.yachts) && Object.values(x.sheet).every((e) => e && Number.isInteger(e.s) && Array.isArray(e.d)));
  }

  const save = () => write(`${KEY}-game`, g);
  const saveHistory = () => write(`${KEY}-history`, history);
  const fmt = (n) => n.toLocaleString('en-US');
  const scored = (game) => Object.keys(game.sheet).length > 0;

  // The best finished game, past or current.
  function best() {
    const done = history.filter((h) => h.over);
    if (g.over) done.push(g);
    return done.reduce((m, h) => Math.max(m, E.totals(h).total), 0);
  }

  // The current game moves into the history (a new column) once anything is
  // scored in it; an untouched game is just replaced.
  function newGame() {
    if (g && scored(g)) {
      history.push({ sheet: g.sheet, yachts: g.yachts, over: g.over });
      saveHistory();
    }
    g = E.newGame();
    fresh = new Set();
    justScored = null;
    ask = null;
    sel = { x: CUR, y: 1 };
    save();
    render();
  }

  // A game in progress asks first (it stays on the sheet, unfinished).
  function askNewGame() {
    if (g.over || !scored(g)) return newGame();
    ask = 'new';
    renderInfo();
  }

  function askClear() {
    if (!history.length && !g.over) return;
    ask = 'clear';
    renderInfo();
  }

  // Clears every earlier game. A finished current game goes too; one in
  // progress stays.
  function clearScores() {
    history = [];
    saveHistory();
    ask = null;
    if (g.over) newGame();
    else {
      sel = { x: Math.min(sel.x, CUR), y: sel.y };
      render();
    }
  }

  function rollDice() {
    if (!E.canRoll(g)) return;
    fresh = new Set(E.roll(g));
    justScored = null;
    save();
    render();
  }

  function toggleDie(i) {
    if (!g.dice || g.roll >= E.ROLLS || g.over) return;
    E.toggle(g, i);
    fresh = new Set();
    save();
    render();
  }

  function scoreCat(id) {
    const opt = E.fill(g, id);
    if (!opt) return false;
    fresh = new Set();
    justScored = id;
    ask = null;
    save();
    if (KG.os() === 'phone' && !g.over) screen = 'roll';
    render();
    return true;
  }

  // ---------------------------------------------------------------------------
  // The score sheet: A = category, B = how it scores, C = this game, then
  // one column per earlier game, newest first.

  const ROWS_LAYOUT = [
    { head: 'Upper section' }, // row 1
    ...E.UPPER.map((c) => ({ cat: c.id })), // rows 2–7
    { total: 'upper', name: 'Subtotal' }, // row 8
    { total: 'bonus', name: 'Bonus' }, // row 9
    {}, // row 10
    { head: 'Lower section' }, // row 11
    ...E.LOWER.map((c) => ({ cat: c.id })), // rows 12–18
    { total: 'yachtBonus', name: 'Yacht bonus' }, // row 19
    { total: 'lower', name: 'Lower total' }, // row 20
    { total: 'total', name: 'Total' }, // row 21
  ];
  const rowOf = Object.fromEntries(ROWS_LAYOUT.map((r, i) => [r.cat || r.total, i]));
  const TOTAL_FORMULA = {
    upper: (c) => `=SUM(${c}${rowOf.ones + 1}:${c}${rowOf.sixes + 1})`,
    bonus: (c) => `=IF(${c}${rowOf.upper + 1}>=${E.UPPER_BONUS_AT},${E.UPPER_BONUS},0)`,
    yachtBonus: (c, game) => `=${E.YACHT_BONUS}*${game.yachts}`,
    lower: (c) => `=SUM(${c}${rowOf.threeKind + 1}:${c}${rowOf.yachtBonus + 1})`,
    total: (c) => `=${c}${rowOf.upper + 1}+${c}${rowOf.bonus + 1}+${c}${rowOf.lower + 1}`,
  };

  const colName = (c) => {
    let s = '';
    for (c += 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
    return s;
  };
  const ref = (x, y) => `${colName(x)}${y + 1}`;

  const CUR = 2; // column C: the game being played
  const ROWS = 40;
  let COLS = 0;
  let tds = [];
  let sel = { x: CUR, y: 1 };
  const td = (x, y) => tds[y * COLS + x];

  // The game shown in column x (C = current, D = the last one, ...), with its number.
  function gameAt(x) {
    if (x === CUR) return { game: g, n: history.length + 1, current: true };
    const k = history.length - 1 - (x - CUR - 1);
    return k >= 0 && k < history.length ? { game: history[k], n: k + 1, current: false } : null;
  }

  // The grid always has a few empty columns past the last game.
  function build() {
    const want = Math.max(10, CUR + 1 + history.length + 3);
    if (want === COLS) return;
    COLS = want;
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
    sel = { x: Math.min(sel.x, COLS - 1), y: sel.y };
  }

  const optionsById = () => Object.fromEntries(E.options(g).map((o) => [o.id, o]));

  // What this game's upper section still needs for the bonus, for B8.
  function upperNote(t) {
    if (t.upper >= E.UPPER_BONUS_AT) return 'Bonus earned';
    const open = E.UPPER.some((c) => !g.sheet[c.id]);
    return open ? `${E.UPPER_BONUS_AT - t.upper} more for the bonus` : 'No bonus';
  }

  // One game's column of scores.
  function renderGameCol(x, info, opts) {
    const { game, n, current } = info;
    const t = E.totals(game);
    ROWS_LAYOUT.forEach((row, y) => {
      const cell = td(x, y);
      cell.className = 'cs';
      cell.textContent = '';
      if (!current && !game.over) cell.classList.add('unfinished');
      if (row.head) {
        cell.classList.add('head');
        if (y === 0) {
          cell.textContent = `Game ${n}`;
          cell.title = current ? 'This game' : game.over ? '' : 'Unfinished';
        }
      } else if (row.cat) {
        const done = game.sheet[row.cat];
        const opt = current && opts[row.cat];
        if (done) {
          cell.textContent = fmt(done.s);
          if (current && justScored === row.cat) cell.classList.add('pop');
        } else if (opt) {
          cell.textContent = fmt(opt.score);
          cell.classList.add('can', 'preview');
          if (!opt.score) cell.classList.add('zero');
        }
      } else if (row.total) {
        cell.textContent = fmt(t[row.total]);
        cell.classList.add('tot');
        if (row.total === 'total') cell.classList.add('grand');
      }
    });
  }

  function renderSheet() {
    build();
    const opts = optionsById();
    const t = E.totals(g);
    ROWS_LAYOUT.forEach((row, y) => {
      const a = td(0, y);
      const b = td(1, y);
      a.className = 'ca';
      b.className = 'cr';
      a.textContent = b.textContent = '';
      if (row.head) {
        a.textContent = row.head;
        a.classList.add('head');
        b.classList.add('head');
        if (y === 0) b.textContent = 'How it scores';
      } else if (row.cat) {
        a.textContent = E.byId[row.cat].name;
        b.textContent = E.byId[row.cat].rule;
        if (opts[row.cat]) a.classList.add('can'), b.classList.add('can');
      } else if (row.total) {
        a.textContent = row.name;
        a.classList.add('tot');
        if (row.total === 'total') a.classList.add('grand');
        if (row.total === 'upper') b.textContent = g.over ? '' : upperNote(t);
        if (row.total === 'bonus') b.textContent = `${E.UPPER_BONUS} if Subtotal is ${E.UPPER_BONUS_AT}+`;
        if (row.total === 'yachtBonus') b.textContent = `${E.YACHT_BONUS} per extra Yacht`;
      }
    });
    for (let x = CUR; x < COLS; x++) {
      const info = gameAt(x);
      if (info) renderGameCol(x, info, opts);
      else ROWS_LAYOUT.forEach((row, y) => ((td(x, y).className = ''), (td(x, y).textContent = '')));
    }
    renderSel();
  }

  function formulaAt(x, y) {
    const row = ROWS_LAYOUT[y];
    if (!row) return '';
    if (x === 0) return row.head || row.name || (row.cat ? E.byId[row.cat].name : '');
    if (x === 1) return td(1, y).textContent;
    const info = gameAt(x);
    if (!info) return '';
    const { game, current } = info;
    if (row.head) return td(x, y).textContent + (y === 0 && !current && !game.over ? ' (unfinished)' : '');
    if (row.total) return TOTAL_FORMULA[row.total](colName(x), game);
    if (row.cat) {
      const done = game.sheet[row.cat];
      if (done) return E.formula(row.cat, done.d, done.s);
      const opt = current && optionsById()[row.cat];
      if (opt) return E.formula(row.cat, g.dice, opt.score);
    }
    return '';
  }

  function renderSel() {
    grid.querySelector('td.sel')?.classList.remove('sel');
    for (const th of grid.querySelectorAll('th.on')) th.classList.remove('on');
    td(sel.x, sel.y).classList.add('sel');
    grid.tHead.rows[0].cells[sel.x + 1].classList.add('on');
    grid.tBodies[0].rows[sel.y].cells[0].classList.add('on');
    $('namebox').textContent = ref(sel.x, sel.y);
    $('formula').textContent = formulaAt(sel.x, sel.y);
  }

  function renderStatus() {
    $('state').textContent = g.over ? 'Calculation complete' : 'Ready';
    $('turn').textContent = g.over ? `Total: ${fmt(E.totals(g).total)}` : `Turn ${g.turn} of ${E.TURNS}`;
    $('best').textContent = `Best: ${fmt(best())}`;
    $('clear').disabled = !history.length && !g.over;
  }

  function renderInfo() {
    const info = $('info');
    const phone = KG.os() === 'phone';
    const j = g.dice && E.joker(g);
    let html = '';
    if (ask === 'new') {
      html = `<b>Start a new game?</b> This one stays on the sheet, unfinished.
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>
        <button class="kg-btn" type="button" data-cancel>Keep playing</button>`;
    } else if (ask === 'clear') {
      const n = history.length + (g.over ? 1 : 0);
      html = `<b>Clear all scores?</b> ${n === 1 ? 'The 1 game' : `All ${n} games`} on the sheet will be deleted${g.over ? '' : ' (not the game you’re playing)'}. This can’t be undone.
        <button class="kg-btn kg-primary" type="button" data-clear>Clear scores</button>
        <button class="kg-btn" type="button" data-cancel>Cancel</button>`;
    } else if (g.over) {
      const total = E.totals(g).total;
      const top = best();
      const record = total >= top && total > 0 && history.some((h) => h.over);
      html = `<b>Final score ${fmt(total)}.</b> ${record ? 'Your best yet.' : total >= top ? '' : `Your best is ${fmt(top)}.`}
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>
        <button class="kg-btn" type="button" data-signup>Email me new games</button>`;
    } else if (j) {
      const where = j.forced ? `It has to go in <b>${E.byId[j.forced].name}</b>.` : 'Score it anywhere that’s highlighted, at full value.';
      html = `<b>Another Yacht!</b> ${j.bonus ? `+${E.YACHT_BONUS} bonus. ` : ''}${where}`;
    } else if (g.turn === 1 && !scored(g) && !history.length) {
      html = g.dice
        ? 'Click a grey score to keep it, or roll again first. Each category can be used once.'
        : phone
          ? 'Roll the dice in Dice, then come back and tap a grey score to keep it. Help has the rules.'
          : 'Roll the dice in the Dice window, then click a grey score here to keep it. Help has the rules.';
    }
    info.hidden = !html;
    if (info.innerHTML !== html) info.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // The dice window

  const FOLDER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v1H2z" class="i-folder-back"/><rect x="2" y="9" width="20" height="11" rx="2" class="i-folder"/></svg>';
  // Pip positions on a 3×3 grid, numbered 0–8 left to right, top to bottom.
  const PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  const pipsOf = (v) => PIPS[v].map((p) => `<i style="grid-area:${1 + Math.floor(p / 3)}/${1 + (p % 3)}"></i>`).join('');

  // The dice folder, as Large icons (default) or Details: Name (die icon +
  // file name), Value, Status. The shell's KG.fileView draws it and the switch.
  const diceView = KG.fileView($('view'), {
    switchEl: $('view-switch'),
    storageKey: `${KEY}-view`,
    columns: [
      { label: 'Value', width: '60px' },
      { label: 'Status', width: '100px' },
    ],
    onChange: () => renderRoll(),
  });

  function dieItem(v, i) {
    const out = g.roll >= E.ROLLS;
    const on = g.sel[i];
    const status = out ? '' : on ? '<span class="die-status reroll">Roll again</span>' : '<span class="die-status">Keep</span>';
    return {
      name: `${E.FACE_NAMES[v]}.die`,
      icon: `<span class="die-icon" aria-hidden="true">${pipsOf(v)}</span>`,
      cells: [String(v), status],
      attrs: { 'data-die': i },
      cls: [out && 'done', fresh.has(i) && 'fresh'],
      selected: on,
      label: `${E.FACE_NAMES[v]}${on ? ', selected to roll again' : ''}`,
    };
  }

  function renderRoll() {
    const count = g.dice ? 5 : 0;
    $('side').innerHTML = `<h2>Yacht</h2><a href="#" aria-current="true">${FOLDER_ICON}<span>Dice</span><em>${count}</em></a>`;
    $('crumbs').innerHTML = g.over ? '<span>Game over</span>' : `<span>Turn ${g.turn}</span><span class="sep">›</span><span>${g.roll ? `Roll ${g.roll} of ${E.ROLLS}` : 'Not rolled'}</span>`;

    diceView.render(g.dice ? g.dice.map(dieItem) : [], { empty: g.over ? 'This folder is empty.' : 'No dice rolled yet. Roll to throw all five.' });
    fresh = new Set(); // new dice animate once, not on every re-render

    const btn = $('roll-btn');
    btn.disabled = !E.canRoll(g);
    const left = E.ROLLS - g.roll;
    $('roll-label').textContent = g.roll === 0 ? 'Roll' : g.sel.some(Boolean) ? 'Roll selected' : 'Roll';
    btn.title = g.over ? 'Game over' : left ? `Roll (F5) · ${left} left this turn` : 'No rolls left this turn';

    const phone = KG.os() === 'phone';
    const banner = $('banner');
    const toSheet = phone ? ' <button class="kg-btn mini" type="button" data-screen="sheet">Go to score sheet</button>' : '';
    let html = '';
    if (g.over) html = `Game over. Final score <b>${fmt(E.totals(g).total)}</b>.`;
    else if (g.roll === 0) html = `Turn ${g.turn} of ${E.TURNS}. Roll to throw all five dice.`;
    else if (g.roll >= E.ROLLS) html = `No rolls left. Pick a category in the score sheet.${toSheet}`;
    else html = `Select the dice to roll again, then Roll. Or score them in the score sheet now.${toSheet}`;
    banner.innerHTML = html;

    const n = g.sel.filter(Boolean).length;
    const parts = [];
    if (g.over) parts.push(`Final score ${fmt(E.totals(g).total)}`);
    else {
      parts.push(`Turn ${g.turn} of ${E.TURNS}`);
      parts.push(g.roll ? `Roll ${g.roll} of ${E.ROLLS}` : 'Not rolled');
      if (n) parts.push(`${n} selected`);
    }
    $('status').textContent = parts.join(' · ');
  }

  // ---------------------------------------------------------------------------
  // Both windows

  function renderScreens() {
    const phone = KG.os() === 'phone';
    document.body.classList.toggle('one-screen', phone);
    $('roll').classList.toggle('on-screen', !phone || screen === 'roll');
    $('sheet').classList.toggle('on-screen', !phone || screen === 'sheet');
    for (const b of document.querySelectorAll('.screen-tabs [data-screen]')) b.setAttribute('aria-selected', String(b.dataset.screen === screen));
  }

  function render() {
    renderSheet();
    renderStatus();
    renderInfo();
    renderRoll();
    renderScreens();
    justScored = null;
  }

  function showScreen(s) {
    screen = s;
    renderScreens();
  }

  // ---------------------------------------------------------------------------
  // Input

  let active = 'roll'; // the window keys go to (the last one clicked)

  $('view').addEventListener('click', (e) => {
    const f = e.target.closest('[data-die]');
    if (f) toggleDie(+f.dataset.die);
  });
  $('roll-btn').addEventListener('click', rollDice);

  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('td');
    if (!cell) return;
    sel = { x: +cell.dataset.x, y: +cell.dataset.y };
    // Clicking anywhere in a category's row that has a grey preview scores it.
    const row = ROWS_LAYOUT[sel.y];
    if (row?.cat && sel.x <= CUR && cell.classList.contains('can') && scoreCat(row.cat)) return;
    renderSel();
  });

  $('info').addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) newGame();
    else if (e.target.closest('[data-clear]')) clearScores();
    else if (e.target.closest('[data-cancel]')) {
      ask = null;
      renderInfo();
    } else if (e.target.closest('[data-signup]')) KG.openSignup();
  });
  $('new').addEventListener('click', askNewGame);
  $('clear').addEventListener('click', askClear);

  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-screen]');
    if (s) showScreen(s.dataset.screen);
  });

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.kg-modal:not([hidden])') || e.target.closest('input, textarea, select')) return;
    const cmd = e.ctrlKey || e.metaKey;
    // F5 / Ctrl+R is Refresh, which rolls while a roll is possible.
    if ((e.key === 'F5' || (cmd && !e.shiftKey && e.key.toLowerCase() === 'r')) && E.canRoll(g)) {
      e.preventDefault();
      rollDice();
      return;
    }
    if (cmd && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'a' && active === 'roll' && g.dice && g.roll < E.ROLLS) {
      e.preventDefault();
      E.selectAll(g, !g.sel.every(Boolean));
      save();
      render();
      return;
    }
    if (cmd || e.altKey) return;
    if (e.key === 'F2') {
      e.preventDefault();
      askNewGame();
      return;
    }
    if (e.key === 'Escape') {
      if (ask) {
        ask = null;
        renderInfo();
      } else if (g.sel.some(Boolean)) {
        E.selectAll(g, false);
        save();
        render();
      }
      return;
    }
    if (/^[1-5]$/.test(e.key)) {
      e.preventDefault();
      toggleDie(+e.key - 1);
      return;
    }
    if (active === 'sheet') {
      const MOVES = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const m = MOVES[e.key];
      if (m) {
        e.preventDefault();
        sel = { x: Math.min(COLS - 1, Math.max(0, sel.x + m[0])), y: Math.min(ROWS - 1, Math.max(0, sel.y + m[1])) };
        renderSel();
        td(sel.x, sel.y).scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return;
      }
      if (e.key === 'Enter') {
        const row = ROWS_LAYOUT[sel.y];
        if (row?.cat && sel.x <= CUR) {
          e.preventDefault();
          scoreCat(row.cat);
        }
      }
    } else if (e.key === 'Enter' && E.canRoll(g) && !e.target.closest('button')) {
      e.preventDefault();
      rollDice();
    }
  });

  addEventListener('pagehide', () => g && save());

  // ---------------------------------------------------------------------------
  // Help: a Notes window with the rules

  const HELP = `
    <h2>Score the most points in 13 turns</h2>
    <ul>
      <li>Each turn, <b>Roll</b> in the Dice window to throw all five dice. Each die is a file.</li>
      <li>Select the dice you want to roll again (click them, or press 1–5) and Roll; the others stay. You get up to 3 rolls a turn.</li>
      <li>Then click a grey score in the score sheet to keep it. Every category is used once, so sometimes you have to take a 0.</li>
    </ul>
    <h2>Categories</h2>
    <ul>
      <li><b>Ones to Sixes:</b> add up the dice showing that number. Get ${E.UPPER_BONUS_AT} or more in these six for a ${E.UPPER_BONUS} bonus (that's three of each).</li>
      <li><b>Three / Four of a kind:</b> at least 3 (or 4) dice alike; scores all five dice added up.</li>
      <li><b>Full house:</b> 3 alike and 2 alike, 25. <b>Small straight:</b> 4 in a row, 30. <b>Large straight:</b> 5 in a row, 40.</li>
      <li><b>Yacht:</b> all five alike, 50. <b>Chance:</b> any dice, added up.</li>
    </ul>
    <h2>Extra Yachts</h2>
    <ul>
      <li>If you roll another Yacht after scoring 50 for one, you get ${E.YACHT_BONUS} more.</li>
      <li>Either way, an extra Yacht must go in its number (five 4s in Fours) if that's empty. If not, it can go anywhere in the lower section at full value (Full house 25, straights 30 and 40).</li>
    </ul>
    <h2>Keyboard</h2>
    <ul>
      <li>F5 rolls, 1–5 select dice, Ctrl+A selects them all, Esc clears. In the sheet, arrows move and Enter scores. F2 starts a new game.</li>
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
      <div class="notes-status"><span>Ln 1, Col 1</span><span>UTF-8</span><button class="kg-btn kg-primary" type="button" data-close>Back to work</button></div>
    </div>`;
    const done = () => {
      box.remove();
      document.removeEventListener('keydown', onKey, true);
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
  $('roll-help').addEventListener('click', showHelp);


  // ---------------------------------------------------------------------------
  // Windows

  let topZ = 20;
  function focusWindow(win) {
    win.style.zIndex = ++topZ;
    active = win.id;
    for (const w of document.querySelectorAll('.window[data-app]:not(.kg-dialog)')) w.classList.toggle('focused', w === win);
  }
  for (const win of [$('sheet'), $('roll')]) win.addEventListener('pointerdown', () => focusWindow(win), true);

  function retitle() {
    $('sheet-title').textContent = KG.pick({ value: 'Yacht - Spreadsheet', quality: 'Yacht', power: 'Yacht — Spreadsheet' });
  }

  // ---------------------------------------------------------------------------
  // Start

  retitle();
  const saved = read(`${KEY}-game`);
  if (E.valid(saved)) {
    g = saved;
    render();
  } else {
    newGame();
  }

  const sheetW = (a) => Math.min(640, Math.max(440, a.w * 0.44));
  KG.makeWindow($('sheet'), {
    minW: 380,
    minH: 320,
    storageKey: `${KEY}-sheet`,
    rect: (a) => ({ x: a.x + 16, y: a.y + 16, w: sheetW(a), h: Math.min(820, a.h - 32) }),
  });
  KG.makeWindow($('roll'), {
    minW: 380,
    minH: 260,
    storageKey: `${KEY}-roll`,
    rect: (a) => {
      const left = a.x + 16 + sheetW(a) + 16;
      const w = Math.max(380, Math.min(620, a.x + a.w - left - 16));
      return { x: left, y: a.y + 40, w, h: Math.min(380, a.h - 72) };
    },
  });
  focusWindow($('roll'));

  KG.onChange(() => {
    retitle();
    render();
  });
})();
