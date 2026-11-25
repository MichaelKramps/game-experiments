// FreeCell on a task board, built on Solitaire's look (../solitaire/style.css).
// The eight columns are lists "Column 1"–"Column 8", the free cells are
// "Cell 1"–"Cell 4" and the foundations are four "Done" lists. Cards are
// tickets named like Solitaire's (eight-hearts, 8H). The rules and the
// numbered deals are in engine.js. See DESIGN.md.

(() => {
  const F = FreeCell;
  const { SUITS } = F;
  const SUIT_NAME = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
  const RANK_NAME = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king'];
  const KEY = 'freecell'; // the game; + '-stats', '-window'
  const FINISH_MS = 90; // one card goes to Done every FINISH_MS once the board is solved

  const $ = (id) => document.getElementById(id);
  const lists = $('lists');
  const win = $('board');

  const { rank, suit, red } = F;
  const cardName = (code) => `${RANK_NAME[rank(code) - 1]}-${SUIT_NAME[suit(code)]}`;
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

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
      // storage unavailable — the game lasts for this page only
    }
  }

  // ---------------------------------------------------------------------------
  // State

  let g;
  let history = []; // earlier states, for Undo (this page only)
  let pick = null; // the picked card(s), or null
  let finishing = 0; // the timer sending cards to Done once the board is solved
  let arrived = ''; // the Done list a card just went to (it pops)
  let confirm = null; // a deal waiting on "this ends your streak": its number
  let tip = ''; // why a run can't move (too long for the free space), until the next click

  const save = () => write(KEY, g);

  function load() {
    const s = read(KEY);
    g = F.valid(s) ? s : F.newGame(F.randomDeal());
  }

  // Wins, the win streak and the best time. A deal you leave after moving,
  // without winning, ends the streak.
  function stats() {
    return { won: 0, streak: 0, bestStreak: 0, best: null, ...(read(`${KEY}-stats`) || {}) };
  }
  function countWin() {
    if (g.counted) return;
    const st = stats();
    g.prevBest = st.best;
    st.won++;
    st.streak++;
    st.bestStreak = Math.max(st.bestStreak, st.streak);
    if (st.best == null || g.elapsed < st.best) {
      st.best = g.elapsed;
      g.newBest = true;
    }
    write(`${KEY}-stats`, st);
    g.counted = true;
  }
  const abandoning = () => g.moves > 0 && !g.won;
  function countLoss() {
    if (!abandoning()) return;
    const st = stats();
    st.streak = 0;
    write(`${KEY}-stats`, st);
  }

  // Start deal n (a random one if none). Leaving a game in progress ends a
  // streak, so with a streak going the message bar asks first.
  function startDeal(n = F.randomDeal(), sure = false) {
    if (!sure && abandoning() && stats().streak > 0) {
      confirm = n;
      pick = null;
      render();
      return;
    }
    countLoss();
    stopFinishing();
    confirm = null;
    g = F.newGame(n);
    history = [];
    pick = null;
    save();
    render();
  }

  // ---------------------------------------------------------------------------
  // Moves

  function snapshot() {
    history.push(JSON.stringify(g));
    if (history.length > 2000) history.shift();
  }

  function move(p, dest) {
    const before = JSON.stringify(g);
    if (!F.move(g, p, dest)) return false;
    history.push(before);
    if (history.length > 2000) history.shift();
    confirm = null;
    tip = '';
    arrived = dest.startsWith('found:') ? dest : '';
    changed();
    return true;
  }

  function changed() {
    if (g.won) countWin();
    save();
    render();
    if (F.solved(g)) startFinishing();
  }

  // Double-click: to Done if it fits, otherwise to a free Cell.
  function sendAway(p) {
    const codes = F.picked(g, p);
    if (codes.length !== 1) return false;
    if (move(p, `found:${suit(codes[0])}`)) return true;
    const free = g.cells.indexOf(null);
    return !p.loc.startsWith('cell:') && free >= 0 && move(p, `cell:${free}`);
  }

  // Once every column is in order, the cards go to Done one at a time.
  function startFinishing() {
    if (finishing) return;
    pick = null;
    snapshot();
    finishing = setInterval(() => {
      const h = F.nextHome(g);
      if (!h || g.won) {
        stopFinishing();
        render();
        return;
      }
      F.move(g, h.p, h.dest);
      arrived = h.dest;
      if (g.won) countWin();
      save();
      render();
    }, FINISH_MS);
    render();
  }
  function stopFinishing() {
    clearInterval(finishing);
    finishing = 0;
  }

  function undo() {
    if (!history.length || finishing || g.won) return; // a win is counted: no taking it back
    g = JSON.parse(history.pop());
    pick = null;
    confirm = null;
    save();
    render();
  }

  // A run longer than the free space allows: say how many cards can move.
  function roomTip(n, toEmptyCol = false) {
    const cells = g.cells.filter((c) => !c).length;
    const cols = g.cols.filter((c) => !c.length).length - (toEmptyCol ? 1 : 0);
    const plural = (k, w) => `${k === 0 ? 'no' : k} ${w}${k === 1 ? '' : 's'}`;
    const into = toEmptyCol ? ' into an empty column' : '';
    return `Moving ${n} cards${into} needs more free space. With ${plural(cells, 'empty Cell')} and ${plural(cols, toEmptyCol ? 'other empty column' : 'empty column')}, you can move ${F.maxRun(g, toEmptyCol)} at a time: each empty Cell adds a card, and each empty column doubles it.`;
  }
  // Explain a refused move when the only problem is free space.
  function explainRefusal(p, dest) {
    const codes = F.picked(g, p);
    if (codes.length < 2 || !dest?.startsWith('col:') || !F.canDrop(g, codes, dest, true)) return false;
    tip = roomTip(codes.length, !g.cols[+dest.slice(4)].length);
    return true;
  }

  // ---------------------------------------------------------------------------
  // The board

  const dims = () => (KG.os() === 'phone' ? { h: 30, gap: 3 } : { h: 34, gap: 5 });

  function cardHtml(code, { loc, idx, top, pickable, sel, cls = '' }) {
    const attrs = pickable ? ` data-loc="${loc}" data-idx="${idx}"` : '';
    return `<div class="tb-card up s-${suit(code)}${sel ? ' sel' : ''}${pickable ? ' pickable' : ''}${cls}" style="top:${top}px"${attrs} title="${cardName(code)} (${red(code) ? 'red' : 'black'})">
      <div class="tb-card-line"><b>${code}</b><span class="tb-card-name">${cardName(code)}</span></div>
    </div>`;
  }

  // Phones show the short title and empty-list text.
  const both = (full, short) => `<span class="full">${full}</span><span class="short">${short}</span>`;
  const emptyHtml = (full, short = full) => `<div class="tb-empty">${both(full, short)}</div>`;

  function listHtml(drop, [title, short], count, body, height, cls = '') {
    return `<section class="tb-list ${cls}" data-drop="${drop}">
      <header class="tb-list-head"><span>${both(title, short)}</span>${count != null ? `<span class="tb-count">${count}</span>` : ''}</header>
      <div class="tb-cards" style="height:${height}px">${body}</div>
    </section>`;
  }

  function render() {
    const d = dims();
    const busy = finishing || g.won;
    const dests = pick ? F.destinations(g, pick) : [];
    const isSel = (loc, idx) => pick && pick.loc === loc && (loc.startsWith('col:') ? idx >= pick.idx : true);
    let top = '';

    // Cells
    g.cells.forEach((c, i) => {
      const loc = `cell:${i}`;
      const body = c ? cardHtml(c, { loc, idx: 0, top: 0, pickable: !busy, sel: isSel(loc) }) : emptyHtml('Empty', '—');
      top += listHtml(loc, [`Cell ${i + 1}`, `C${i + 1}`], null, body, d.h, `tb-cell${dests.includes(loc) ? ' can' : ''}`);
    });

    // Done lists
    for (const s of SUITS) {
      const f = g.found[s];
      const loc = `found:${s}`;
      const body = f.length
        ? cardHtml(f[f.length - 1], { loc, idx: 0, top: 0, pickable: !busy, sel: isSel(loc), cls: arrived === loc ? ' arrived' : '' })
        : emptyHtml('Ace first', `A${s}`);
      top += listHtml(loc, [`Done · ${cap(SUIT_NAME[s])}`, 'Done'], f.length, body, d.h, `tb-done${dests.includes(loc) ? ' can' : ''}`);
    }
    arrived = '';

    // Columns: only the run on top of a column can be picked up
    let bottom = '';
    g.cols.forEach((col, i) => {
      const loc = `col:${i}`;
      const from = F.runStart(col);
      let body = col.map((c, idx) => cardHtml(c, { loc, idx, top: idx * (d.h + d.gap), pickable: !busy && idx >= from, sel: isSel(loc, idx) })).join('');
      if (!col.length) body = emptyHtml('Empty', '—');
      const height = col.length ? col.length * (d.h + d.gap) - d.gap : d.h;
      bottom += listHtml(loc, [`Column ${i + 1}`, `Col ${i + 1}`], col.length, body, height, dests.includes(loc) ? 'can' : '');
    });

    lists.innerHTML = `<div class="tb-row tb-top">${top}</div><div class="tb-row tb-cols">${bottom}</div>`;
    renderStats();
    renderInfo();
    $('undo').disabled = !history.length || !!finishing || g.won;
    const box = $('deal');
    if (document.activeElement !== box) box.value = String(g.deal);
  }

  const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function renderStats() {
    $('moves').textContent = `Moves ${g.moves}`;
    $('clock').textContent = clock(g.elapsed);
  }

  function renderInfo() {
    const info = $('info');
    const phone = KG.os() === 'phone';
    let html = '';
    if (tip && !g.won && !finishing) {
      html = `<span>${tip}</span>`;
    } else if (confirm != null) {
      const st = stats();
      html = `<span>Leaving game #${g.deal} ends your win streak of ${st.streak}.</span>
        <button class="kg-btn kg-primary" type="button" data-sure>Start game #${confirm}</button>
        <button class="kg-btn" type="button" data-stay>Keep playing</button>`;
    } else if (g.won) {
      const st = stats();
      let best = ` Best time ${clock(st.best)}.`;
      if (g.newBest && g.prevBest != null) best = ` New best time (was ${clock(g.prevBest)}).`;
      else if (g.newBest) best = '';
      const streak = `${st.won} ${st.won === 1 ? 'win' : 'wins'}, streak ${st.streak}${st.bestStreak > st.streak ? ` (best ${st.bestStreak})` : ''}.`;
      html = `<span><b>Game #${g.deal} cleared</b> in ${clock(g.elapsed)} and ${g.moves} moves. ${streak}${best}</span>
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>
        <button class="kg-btn" type="button" data-signup>Email me new games</button>`;
    } else if (finishing) {
      html = '<span>Every column is in order. Finishing the board…</span>';
    } else if (!g.moves) {
      const how = phone
        ? 'Tap a card, then tap where it goes.'
        : 'Click a card, then click where it goes, or drag it. Double-click sends a card to Done, or to a free Cell.';
      const known = g.deal === F.UNSOLVABLE ? ' This is the one deal that can\'t be solved.' : '';
      html = `<span>Game #${g.deal}. ${how} Each Cell holds one card, and any card can go in an empty column.${known}</span>`;
    }
    info.hidden = !html;
    if (info.innerHTML !== html) info.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Input: click to pick and click to drop, drag and drop, double-click away

  let suppressClick = false;
  // Double-clicks are spotted by hand: each click redraws the board, so the
  // browser's own dblclick doesn't see two clicks on the same element.
  let lastClick = { key: '', t: 0 };

  lists.addEventListener('click', (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    if (finishing || g.won) return;
    tip = '';
    if (!e.target.closest('.tb-card[data-loc]')) lastClick = { key: '', t: 0 };
    const list = e.target.closest('[data-drop]');
    if (!list) {
      pick = null;
      render();
      return;
    }
    if (pick && F.destinations(g, pick).includes(list.dataset.drop)) {
      const p = pick;
      pick = null;
      lastClick = { key: '', t: 0 };
      move(p, list.dataset.drop);
      return;
    }
    if (pick && list.dataset.drop !== pick.loc && explainRefusal(pick, list.dataset.drop)) {
      pick = null;
      render();
      return;
    }
    const card = e.target.closest('.tb-card[data-loc]');
    if (card) {
      const p = { loc: card.dataset.loc, idx: +card.dataset.idx };
      const key = `${p.loc}#${p.idx}`;
      const double = lastClick.key === key && e.timeStamp - lastClick.t < 400;
      lastClick = { key: double ? '' : key, t: e.timeStamp };
      if (double && !p.loc.startsWith('found:')) {
        pick = null;
        if (!sendAway(p)) render();
        return;
      }
      pick = pick && pick.loc === p.loc && pick.idx === p.idx ? null : p;
      const n = pick ? F.picked(g, pick).length : 0;
      if (n > F.maxRun(g)) tip = roomTip(n);
    } else {
      pick = null;
    }
    render();
  });

  // Dragging: the picked card (and any cards on it) follow the pointer as a
  // floating copy; dropping on a highlighted list moves them.
  let drag = null;

  lists.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || finishing || g.won) return;
    const card = e.target.closest('.tb-card[data-loc]');
    if (!card) return;
    drag = { x: e.clientX, y: e.clientY, p: { loc: card.dataset.loc, idx: +card.dataset.idx }, ghost: null };
  });

  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.ghost) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      pick = drag.p;
      const n = F.picked(g, pick).length;
      tip = n > F.maxRun(g) ? roomTip(n) : '';
      render();
      const els = [...lists.querySelectorAll(`.tb-card[data-loc="${drag.p.loc}"]`)].filter((el) => +el.dataset.idx >= drag.p.idx);
      if (!els.length) {
        drag = null;
        return;
      }
      const first = els[0].getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.className = 'tb-ghost';
      ghost.style.width = `${first.width}px`;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const copy = el.cloneNode(true);
        copy.style.top = `${r.top - first.top}px`;
        ghost.append(copy);
        el.classList.add('lifted');
      }
      document.body.append(ghost);
      drag.ghost = ghost;
      drag.dx = drag.x - first.left;
      drag.dy = drag.y - first.top;
    }
    drag.ghost.style.left = `${e.clientX - drag.dx}px`;
    drag.ghost.style.top = `${e.clientY - drag.dy}px`;
  });

  function endDrag(e) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.ghost) return; // a plain click: the click handler takes it
    d.ghost.remove();
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 0);
    const under = e.type === 'pointerup' ? document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]') : null;
    pick = null;
    tip = '';
    if (under && move(d.p, under.dataset.drop)) return;
    if (under && under.dataset.drop !== d.p.loc) explainRefusal(d.p, under.dataset.drop);
    render();
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.kg-modal:not([hidden])')) return;
    if (e.key === 'F2') {
      e.preventDefault();
      startDeal();
    } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !e.target.closest('input, textarea, select')) {
      e.preventDefault();
      undo();
    } else if (e.key === 'Escape' && (pick || confirm != null)) {
      pick = null;
      confirm = null;
      render();
    }
  });

  $('info').addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) startDeal();
    else if (e.target.closest('[data-sure]')) startDeal(confirm, true);
    else if (e.target.closest('[data-stay]')) {
      confirm = null;
      render();
    } else if (e.target.closest('[data-signup]')) KG.openSignup();
  });
  $('new').addEventListener('click', () => startDeal());
  $('undo').addEventListener('click', () => undo());

  // The deal number box: type a number and press Enter to play that deal.
  const box = $('deal');
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const n = +box.value.trim();
      if (Number.isInteger(n) && n >= 1 && n <= F.DEALS) {
        box.blur();
        if (n !== g.deal || g.moves) startDeal(n);
        else render();
      } else {
        box.setCustomValidity('Type a number from 1 to 32000.');
        box.reportValidity();
      }
    } else if (e.key === 'Escape') {
      box.value = String(g.deal);
      box.blur();
    }
  });
  box.addEventListener('input', () => {
    box.value = box.value.replace(/\D/g, '');
    box.setCustomValidity('');
  });
  box.addEventListener('blur', () => (box.value = String(g.deal)));
  box.addEventListener('focus', () => box.select());

  // ---------------------------------------------------------------------------
  // Clock: counts once you've moved, while the game is going and the page is visible.

  setInterval(() => {
    if (g.won || !g.moves || document.hidden) return;
    g.elapsed++;
    renderStats();
    if (g.elapsed % 5 === 0) save();
  }, 1000);
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => document.hidden && save());

  // ---------------------------------------------------------------------------
  // Help

  const HELP = `
    <h2>Clear the board</h2>
    <ul>
      <li>Move every card to the four <b>Done</b> lists, one per suit, from ace up to king.</li>
      <li>In <b>Column 1</b> to <b>Column 8</b>, build down in alternating colors: hearts and diamonds go on spades and clubs, and spades and clubs go on hearts and diamonds. Any card can go in an empty column.</li>
      <li><b>Cell 1</b> to <b>Cell 4</b> each hold one card while you dig for the one you need.</li>
      <li>A run of cards moves together if there's room to move it one card at a time: each empty Cell adds one card, and each empty column doubles that.</li>
      <li>Once every column runs high to low, the board finishes itself.</li>
    </ul>
    <h2>Deals</h2>
    <ul>
      <li>Deals are numbered 1 to 32000, the standard FreeCell numbering, so a number is the same deal anywhere. Type a number in <b>Game #</b> and press Enter to play it.</li>
      <li>Every deal can be solved except game 11982. New game never picks that one.</li>
      <li>Your wins, win streak and best time are kept. Leaving a game you've started without winning it ends your streak.</li>
    </ul>
    <h2>Moving cards</h2>
    <ul>
      <li>Click a card to pick it up, then click where it goes, or drag it there. Places it can go are highlighted.</li>
      <li>Double-click a card to send it to its Done list, or to a free Cell if it can't go to Done yet.</li>
      <li><b>Undo</b> (Ctrl+Z) takes back moves. F2 starts a new game.</li>
    </ul>`;

  function showHelp() {
    if (document.querySelector('.tb-help')) return;
    const boxEl = document.createElement('div');
    boxEl.className = 'kg-modal tb-help';
    boxEl.innerHTML = `<div class="window kg-dialog" role="dialog" aria-modal="true" aria-labelledby="tb-help-title">
      <div class="titlebar">
        <div class="lights"><span class="close" data-close></span><span class="min"></span><span class="max"></span></div>
        <div class="window-title" id="tb-help-title">how-to-play.txt — Notes</div>
      </div>
      <div class="notes-menu"><span>File</span><span>Edit</span><span>Format</span><span>View</span><span>Help</span></div>
      <div class="notes-page">${HELP}</div>
      <div class="notes-status"><span>Ln 1, Col 1</span><span>UTF-8</span><button class="kg-btn kg-primary" type="button" data-close>Back to the board</button></div>
    </div>`;
    const done = () => {
      boxEl.remove();
      document.removeEventListener('keydown', onKey, true);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        done();
      }
    };
    boxEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || e.target === boxEl) done();
    });
    document.addEventListener('keydown', onKey, true);
    document.body.append(boxEl);
    boxEl.querySelector('.kg-btn[data-close]').focus();
  }
  $('help').addEventListener('click', showHelp);

  // ---------------------------------------------------------------------------
  // Start

  function retitle() {
    $('board-title').textContent = KG.pick({ value: 'FreeCell - Tasks', quality: 'FreeCell', power: 'FreeCell — Tasks' });
  }

  load();
  retitle();
  render();
  if (F.solved(g)) startFinishing(); // a reload mid-finish carries on

  KG.makeWindow(win, {
    minW: 600,
    minH: 420,
    storageKey: `${KEY}-window`,
    rect: (a) => {
      const w = Math.min(1180, a.w - 40);
      const h = Math.min(760, a.h - 40);
      return { x: a.x + (a.w - w) / 2, y: a.y + (a.h - h) / 3, w, h };
    },
  });
  KG.onChange(() => {
    retitle();
    render();
  });
})();
