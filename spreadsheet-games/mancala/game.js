// Spreadsheet Mancala: the board is A1:H2 on the Board tab and the seeds are
// numbers in the cells. Moves are sown one seed at a time (SOW_MS apart) so
// you can follow them; a click or key skips to the end. The Moves tab logs
// each move. Rules and the computer are in engine.js. See DESIGN.md.

(() => {
  const M = Mancala;
  const KEY = 'spreadsheet-mancala'; // the game; + '-settings', '-record', '-window'
  const SOW_MS = 500; // per seed, about the pace of sowing by hand
  const MIN_THINK = 450; // the computer never answers faster than this (ms)
  const { YOU, CPU } = M;

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
  // record). settings: level, seeds, first ('alternate' | 'you' | 'cpu') and
  // next (who goes first in the next game when taking turns).

  const FIRSTS = ['alternate', 'you', 'cpu'];
  const s0 = read(`${KEY}-settings`) || {};
  const settings = {
    level: s0.level in M.LEVELS ? s0.level : 'medium',
    seeds: Number.isInteger(s0.seeds) && s0.seeds >= M.SEEDS.min && s0.seeds <= M.SEEDS.max ? s0.seeds : M.SEEDS.standard,
    first: FIRSTS.includes(s0.first) ? s0.first : 'alternate',
    next: s0.next === CPU ? CPU : YOU,
  };

  let g;
  let thinking = null; // a pending computer move's timer
  let anim = null; // a move being sown: { view, steps, k, timer, flash, done }
  let lastRec = null; // what the last move did (for the message bar)
  let tab = 'board';
  const sels = { board: { x: 7, y: 0 }, moves: { x: 0, y: 0 } };

  const saveSettings = () => write(`${KEY}-settings`, settings);
  const save = () => write(`${KEY}-game`, g);
  const level = () => M.LEVELS[g.level];
  const yourMoves = () => g.moves.filter((k) => M.owner(k) === YOU).length;
  const firstFor = () => (settings.first === 'you' ? YOU : settings.first === 'cpu' ? CPU : settings.next);
  const busy = () => !!anim || !!thinking;

  function newGame() {
    cancelThinking();
    finishAnim(false);
    const first = firstFor();
    if (settings.first === 'alternate') settings.next = first === YOU ? CPU : YOU;
    saveSettings();
    g = { ...M.newGame(settings.seeds, first), level: settings.level, counted: false };
    lastRec = null;
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

  // Play pit i for whoever's turn it is, then sow it on screen.
  function move(i) {
    const before = g.pits.slice();
    const rec = M.play(g, i);
    if (!rec) return;
    lastRec = rec;
    count();
    save();
    animate(before, rec);
  }

  function humanPlay(i) {
    if (busy() || g.result || g.turn !== YOU || M.owner(i) !== YOU || !g.pits[i]) return;
    sels.board = cellOf(i);
    move(i);
  }

  // The computer thinks for at least MIN_THINK, then moves (and again after
  // an extra turn).
  function schedule() {
    if (g.result || g.turn !== CPU || busy()) return;
    const start = Date.now();
    thinking = setTimeout(() => {
      const k = M.aiMove(g, g.level);
      thinking = setTimeout(() => {
        thinking = null;
        move(k);
      }, Math.max(0, MIN_THINK - (Date.now() - start)));
    }, 30);
    render();
  }

  function cancelThinking() {
    clearTimeout(thinking);
    thinking = null;
  }

  // Undo takes back your last move and everything the computer did after it.
  function undo() {
    if (g.result || !yourMoves()) return;
    cancelThinking();
    finishAnim(false);
    let k = g.moves.length - 1;
    while (M.owner(g.moves[k]) !== YOU) k--;
    const r = M.replay(g.seeds, g.first, g.moves.slice(0, k));
    g = { ...r, level: g.level, counted: false };
    lastRec = null;
    save();
    render();
  }

  // ---------------------------------------------------------------------------
  // Sowing on screen: pick up the pit, drop one seed per step, then show a
  // capture and the end-of-game sweep. g already holds the result.

  function animate(before, rec) {
    const view = before.slice();
    const steps = [];
    steps.push(() => {
      view[rec.pit] = 0;
      return { pick: [rec.pit] };
    });
    for (const s of rec.path) {
      steps.push(() => {
        view[s]++;
        return { sow: [s] };
      });
    }
    if (rec.capture) {
      steps.push(() => {
        const { pit, opp, n } = rec.capture;
        view[pit] = 0;
        view[opp] = 0;
        view[M.store(rec.player)] += n;
        return { cap: [pit, opp], sow: [M.store(rec.player)] };
      });
    }
    if (rec.sweep && rec.sweep.some(Boolean)) {
      steps.push(() => {
        for (let k = 0; k < 14; k++) view[k] = g.pits[k];
        return { sow: [6, 13] };
      });
    }
    anim = { view, steps, k: 0, timer: null, flash: {} };
    step();
  }

  function step() {
    if (!anim) return;
    if (anim.k >= anim.steps.length) return finishAnim(true);
    anim.flash = anim.steps[anim.k++]();
    render();
    anim.timer = setTimeout(step, SOW_MS);
  }

  // Jump to the end of the move being sown. then: carry on (the computer's turn).
  function finishAnim(then) {
    if (!anim) return;
    clearTimeout(anim.timer);
    anim = null;
    render();
    if (then) schedule();
  }

  // ---------------------------------------------------------------------------
  // The sheet

  const colName = (c) => {
    let s = '';
    for (c += 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
    return s;
  };
  const ref = (x, y) => `${colName(x)}${y + 1}`;

  // slot → cell: your pits B2:G2, your store H1 (merged to H2), the
  // computer's pits G1 back to B1, its store A1 (merged to A2).
  function cellOf(i) {
    if (i < 6) return { x: i + 1, y: 1 };
    if (i === 6) return { x: 7, y: 0 };
    if (i < 13) return { x: 13 - i, y: 0 };
    return { x: 0, y: 0 };
  }
  const slotAt = new Map();
  for (let i = 0; i < 14; i++) slotAt.set(`${cellOf(i).x},${cellOf(i).y}`, i);
  slotAt.set('0,1', 13);
  slotAt.set('7,1', 6);
  const slotRef = (i) => ref(cellOf(i).x, cellOf(i).y);

  const COLS = 14;
  let rows = 40; // grows when a tab needs more (see renderSheet)
  let cellAt = new Map(); // "x,y" → td (merged cells map both spots)
  let cells = new Map(); // "x,y" → { text, cls, f } for the current tab

  // The Board tab merges the stores (A1:A2, H1:H2); the Moves tab doesn't.
  let built = null;
  function build() {
    const merged = tab === 'board';
    built = tab;
    let html = '<thead><tr><th></th>';
    for (let x = 0; x < COLS; x++) html += `<th scope="col">${colName(x)}</th>`;
    html += '</tr></thead><tbody>';
    for (let y = 0; y < rows; y++) {
      html += `<tr><th scope="row">${y + 1}</th>`;
      for (let x = 0; x < COLS; x++) {
        if (merged && y === 1 && (x === 0 || x === 7)) continue; // covered by the merged store
        const span = merged && y === 0 && (x === 0 || x === 7) ? ' rowspan="2"' : '';
        html += `<td data-x="${x}" data-y="${y}"${span}></td>`;
      }
      html += '</tr>';
    }
    grid.innerHTML = `${html}</tbody>`;
    cellAt = new Map();
    for (const td of grid.querySelectorAll('td')) {
      const x = +td.dataset.x;
      const y = +td.dataset.y;
      for (let k = 0; k < (td.rowSpan || 1); k++) cellAt.set(`${x},${y + k}`, td);
    }
    sizeCells();
  }
  const td = (x, y) => cellAt.get(`${x},${y}`);

  // Phones size the pit columns so the whole board fits the width.
  function sizeCells() {
    if (KG.os() !== 'phone') {
      win.style.removeProperty('--s-cell');
      return;
    }
    const px = Math.max(32, Math.min(50, Math.floor((wrap.clientWidth - 42 - 112 - 8) / 6)));
    win.style.setProperty('--s-cell', `${px}px`);
  }

  const put = (x, y, text, cls = '', f = null) => cells.set(`${x},${y}`, { text: String(text), cls, f: f ?? String(text) });

  const myTurn = () => !g.result && g.turn === YOU && !busy();
  const phoneLabel = (long, short) => (KG.os() === 'phone' ? short : long);

  function boardSheet() {
    const view = anim ? anim.view : g.pits;
    const fl = anim ? anim.flash : {};
    const has = (key, i) => (fl[key] || []).includes(i);
    const last = !anim && lastRec ? lastRec.last : -1;
    for (let i = 0; i < 14; i++) {
      const { x, y } = cellOf(i);
      const isStore = i === 6 || i === 13;
      let cls = isStore ? 'store' : 'pit';
      if (M.owner(i) === CPU || i === 13) cls += ' cpu';
      if (!view[i] && !isStore) cls += ' zero';
      if (y === 0) cls += ' et';
      if (x === 0) cls += ' el eb';
      if (x === 7) cls += ' er eb';
      if (y === 1) cls += ' eb';
      if (has('sow', i)) cls += ' sow';
      else if (has('pick', i)) cls += ' pick';
      else if (has('cap', i)) cls += ' cap';
      else if (i === last) cls += ' last';
      if (myTurn() && M.owner(i) === YOU && view[i]) cls += ' can';
      const f = isStore ? `=STORE("${i === 6 ? 'you' : 'computer'}")` : String(view[i]);
      put(x, y, view[i], cls, f);
    }
    // totals under the board
    const y0 = 3;
    ['', 'Store', 'Pits', 'Total'].forEach((h, x) => put(x, y0, h, `hd ${x ? 'c' : ''}`));
    [
      [YOU, 'You', 2, 'H1'],
      [CPU, phoneLabel('Computer', 'CPU'), 1, 'A1'],
    ].forEach(([p, name, row, storeRef], k) => {
      const y = y0 + 1 + k;
      const st = view[M.store(p)];
      const pits = M.pitsOf(p).reduce((a, i) => a + view[i], 0);
      put(0, y, name, `lab${p === CPU ? ' cpu' : ''}`);
      put(1, y, st, 'c num', `=${storeRef}`);
      put(2, y, pits, 'c num', `=SUM(B${row}:G${row})`);
      put(3, y, st + pits, 'c num tot', `=B${y + 1}+C${y + 1}`);
    });
  }

  // Moves: Move | Player | Pit | Seeds | Result
  function movesSheet() {
    ['Move', 'Player', 'Pit', 'Seeds', 'Result'].forEach((h, x) => put(x, 0, h, `hd ${x === 1 || x === 4 ? '' : 'c'}`));
    M.history(g.seeds, g.first, g.moves).forEach((r, k) => {
      const y = k + 1;
      const cpu = r.player === CPU;
      const notes = [];
      if (r.capture) notes.push(`Captured ${r.capture.n}`);
      if (r.extra && !r.over) notes.push('Extra turn');
      if (r.sweep) notes.push('Game over');
      put(0, y, k + 1, 'log c num');
      put(1, y, cpu ? 'Computer' : 'You', `log${cpu ? ' cpu' : ''}`);
      put(2, y, slotRef(r.pit), 'log c');
      put(3, y, r.seeds, 'log c num');
      put(4, y, notes.join(' · '), 'log');
    });
    if (g.result) {
      const y = g.moves.length + 2;
      put(0, y, 'Result', 'log result');
      put(1, y, g.result === YOU ? 'You win' : g.result === CPU ? 'Computer wins' : 'Draw', 'log result');
      put(2, y, `${g.pits[6]}–${g.pits[13]}`, 'log c result', `=H1&"–"&A1`);
    }
  }

  function renderSheet() {
    if (built !== tab) build();
    cells = new Map();
    if (tab === 'board') boardSheet();
    else movesSheet();
    // the grid grows to fit (a long game's Moves log runs past row 40)
    const need = Math.max(0, ...[...cells.keys()].map((k) => +k.split(',')[1])) + 3;
    if (need > rows) {
      rows = Math.ceil(need / 10) * 10;
      build();
    }
    grid.classList.toggle('t-board', tab === 'board');
    grid.classList.toggle('t-moves', tab === 'moves');
    win.classList.toggle('on-moves', tab === 'moves');
    for (const c of grid.querySelectorAll('td')) {
      const v = cells.get(`${c.dataset.x},${c.dataset.y}`);
      c.className = v ? v.cls : '';
      if (v && v.cls.includes('sow')) c.innerHTML = `<span>${v.text}</span>`;
      else c.textContent = v ? v.text : '';
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
    const c = td(sel.x, sel.y);
    c?.classList.add('sel');
    const x = +c.dataset.x;
    const y = +c.dataset.y;
    grid.tHead.rows[0].cells[x + 1].classList.add('on');
    for (let k = 0; k < (c.rowSpan || 1); k++) grid.tBodies[0].rows[y + k].cells[0].classList.add('on');
    $('namebox').textContent = c.rowSpan > 1 ? `${ref(x, y)}:${ref(x, y + 1)}` : ref(x, y);
    const v = cells.get(`${x},${y}`);
    $('formula').textContent = v && v.text !== '' ? v.f : '';
  }

  function renderStatus() {
    $('state').textContent = anim ? 'Sowing…' : thinking ? 'Calculating…' : g.result ? 'Calculation complete' : 'Ready';
    $('who').textContent = `${level().name} · ${g.seeds} ${g.seeds === 1 ? 'seed' : 'seeds'} per pit`;
    $('move').textContent = `Move ${g.moves.length + (g.result ? 0 : 1)}`;
    $('undo').disabled = !!g.result || !yourMoves();
  }

  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  // What the last move did, once it has been sown.
  function event() {
    if (!lastRec || anim || g.result) return '';
    const you = lastRec.player === YOU;
    const bits = [];
    if (lastRec.capture) bits.push(you ? `You captured ${lastRec.capture.n}.` : `The computer captured ${lastRec.capture.n}.`);
    if (lastRec.extra) bits.push(you ? '<b>Extra turn:</b> go again.' : 'The computer landed in its store and goes again.');
    return bits.join(' ');
  }

  function renderInfo() {
    const info = $('info');
    const click = KG.os() === 'phone' ? 'Tap' : 'Click';
    let html = '';
    if (g.result && !anim) {
      const r = record(g.level);
      const tally = `Your record on ${level().name}: ${plural(r.w, 'win')}, ${r.l} ${r.l === 1 ? 'loss' : 'losses'}, ${plural(r.d, 'draw')}.`;
      const score = `${g.pits[6]} to ${g.pits[13]}`;
      const head = g.result === YOU ? `You win, ${score}.` : g.result === CPU ? `The computer wins, ${score}.` : `Draw, ${score}.`;
      html = `<b>${head}</b> ${tally}
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>${g.result === YOU ? '\n        <button class="kg-btn" type="button" data-signup>Email me new games</button>' : ''}`;
    } else if (!g.result) {
      const notes = [];
      if (settings.first !== 'alternate' && firstFor() !== g.first) notes.push(settings.first === 'you' ? "you'll go first" : 'the computer will go first');
      if (settings.seeds !== g.seeds) notes.push(`${plural(settings.seeds, 'seed')} per pit`);
      if (notes.length) {
        html = `From your next new game, ${notes.join(' and ')}. <button class="kg-btn" type="button" data-new>Start it now</button>`;
      } else {
        const intro = yourMoves()
          ? ''
          : `Your pits are row 2 and your store is column H. ${click} one of your pits to sow its seeds counter-clockwise. Land the last seed in your store to go again, or in an empty pit of yours to capture the pit across.${g.first === CPU && !g.moves.length ? ' The computer goes first this game.' : ''}`;
        const text = [event(), intro].filter(Boolean).join(' ');
        // one <span>, so the bar (a wrapping flex row) keeps the sentences together
        html = text && `<span>${text}</span>`;
      }
    }
    info.hidden = !html;
    if (info.innerHTML !== html) info.innerHTML = html;
  }

  function retitle() {
    $('sheet-title').textContent = KG.pick({ value: 'Mancala - Spreadsheet', quality: 'Mancala', power: 'Mancala — Spreadsheet' });
  }

  function render() {
    renderSheet();
    renderStatus();
    renderInfo();
  }

  // ---------------------------------------------------------------------------
  // Input: click (or tap) one of your pits. During sowing, any click on the
  // sheet or any key skips to the end of the move.

  grid.addEventListener('click', (e) => {
    const c = e.target.closest('td');
    if (!c) return;
    if (anim) return finishAnim(true);
    sels[tab] = { x: +c.dataset.x, y: +c.dataset.y };
    if (tab === 'board') {
      const i = slotAt.get(`${c.dataset.x},${c.dataset.y}`);
      if (i !== undefined && M.owner(i) === YOU && myTurn()) {
        wrap.focus({ preventScroll: true });
        return humanPlay(i);
      }
    }
    renderSel();
  });

  for (const b of document.querySelectorAll('[data-tab]')) {
    b.addEventListener('click', () => {
      tab = b.dataset.tab;
      renderSheet();
    });
  }

  // Keyboard: 1–6 play your pits B2–G2; arrows move; Enter or Space plays the
  // selected pit; Ctrl+Z undoes; F2 starts a new game.
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.kg-modal:not([hidden])') || e.target.closest('input, textarea, select')) return;
    if (anim && !['Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) {
      e.preventDefault();
      finishAnim(true);
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
    if (/^[1-6]$/.test(e.key) && tab === 'board') {
      e.preventDefault();
      humanPlay(+e.key - 1);
      return;
    }
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const sel = sels[tab];
    if (moves[e.key]) {
      e.preventDefault();
      const c = td(sel.x, sel.y);
      // step out of a merged store downward
      const y = moves[e.key][1] > 0 && c.rowSpan > 1 ? +c.dataset.y + c.rowSpan : sel.y + moves[e.key][1];
      sel.x = Math.max(0, Math.min(COLS - 1, sel.x + moves[e.key][0]));
      sel.y = Math.max(0, Math.min(rows - 1, y));
      const t = td(sel.x, sel.y);
      sel.y = +t.dataset.y;
      renderSel();
      t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && tab === 'board') {
      const i = slotAt.get(`${sel.x},${sel.y}`);
      if (i !== undefined) {
        e.preventDefault();
        humanPlay(i);
      }
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
  // Seeds and who goes first apply to the next game, or right away if you
  // haven't moved yet (or the game is over).
  const fresh = () => !anim && (g.result || !yourMoves());
  $('seeds').addEventListener('change', (e) => {
    settings.seeds = +e.target.value;
    saveSettings();
    if (fresh()) newGame();
    else render();
    wrap.focus({ preventScroll: true });
  });
  $('first').addEventListener('change', (e) => {
    settings.first = e.target.value;
    if (settings.first === 'alternate') settings.next = g.first === YOU ? CPU : YOU;
    saveSettings();
    if (settings.first !== 'alternate' && fresh() && firstFor() !== g.first) newGame();
    else render();
    wrap.focus({ preventScroll: true });
  });

  // ---------------------------------------------------------------------------
  // Help

  const HELP = `
    <h2>The board</h2>
    <ul>
      <li>Your six pits are <b>B2:G2</b> and your store is <b>column H</b>. The computer's pits are <b>B1:G1</b> (in blue) and its store is <b>column A</b>.</li>
      <li>The numbers are seeds. Each pit starts with 4, or whatever <b>Seeds</b> is set to (1–10).</li>
    </ul>
    <h2>A turn</h2>
    <ul>
      <li><b>Click</b> one of your pits. Its seeds are sown one at a time, counter-clockwise: along row 2 to your store, then right to left along row 1. The computer's store is skipped.</li>
      <li><b>Extra turn:</b> if the last seed lands in your store, you go again.</li>
      <li><b>Capture:</b> if the last seed lands in an empty pit of yours and the pit across has seeds, both go into your store.</li>
      <li>When one side has no seeds left, each player keeps what's on their side. The bigger store wins.</li>
      <li>Sowing takes half a second per seed. Click the sheet or press any key to skip to the end of a move.</li>
    </ul>
    <h2>Settings</h2>
    <ul>
      <li><b>Level</b>: Easy, Medium or Hard, from the computer's next move. Your record is kept for each level.</li>
      <li><b>Seeds</b> and <b>First</b> (take turns, you, or the computer) apply to the next game, or right away if you haven't moved yet.</li>
      <li><b>Undo</b> takes back your last move and the computer's moves after it. Every move is logged on the <b>Moves</b> sheet.</li>
    </ul>
    <h2>Keyboard</h2>
    <ul>
      <li>1–6 play your pits B2–G2. Arrows move the selected cell, and Enter or Space plays it. Ctrl+Z undoes, F2 starts a new game.</li>
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

  build();
  retitle();
  $('level').value = settings.level;
  $('seeds').value = String(settings.seeds);
  $('first').value = settings.first;
  const saved = read(`${KEY}-game`);
  if (M.valid(saved)) {
    g = { ...M.replay(saved.seeds, saved.first, saved.moves), level: saved.level, counted: !!saved.counted };
    render();
    schedule();
  } else {
    newGame();
  }

  KG.makeWindow(win, {
    minW: 420,
    minH: 360,
    storageKey: `${KEY}-window`,
    rect: (a) => {
      const w = Math.min(720, a.w - 40);
      const h = Math.min(520, a.h - 40);
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
