// Solitaire: Klondike on a task board. The seven tableau piles are lists
// "Column 1"–"Column 7"; the stock and waste are "Deck" and "Draw pile"; the
// foundations are four "Done" lists, one per suit. Cards are tickets named
// like Ctrl+Alt+Deal's card files (eight-hearts, 8H) with no suit symbols,
// colored by suit. The board's look comes from Settings › Task board (the
// --tb-* tokens in os/os.css). See DESIGN.md.

(() => {
  const SUITS = ['S', 'H', 'D', 'C']; // the order of the Done lists
  const SUIT_NAME = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const RANK_NAME = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king'];
  const KEY = 'solitaire'; // the game; + '-settings', '-stats', '-window'

  const $ = (id) => document.getElementById(id);
  const lists = $('lists');
  const win = $('board');

  const rank = (code) => RANKS.indexOf(code.slice(0, -1)) + 1;
  const suit = (code) => code.slice(-1);
  const red = (code) => suit(code) === 'H' || suit(code) === 'D';
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
  // Game state
  //
  // g: { draw: 3|1, stock: [code…] (top is last), waste: [code…] (top is last),
  //      found: { S: [code…], … }, cols: [[{ c: code, up: bool }…] × 7],
  //      moves, elapsed (seconds), won, counted }

  const settings = { draw: 3, ...(read(`${KEY}-settings`) || {}) };
  if (settings.draw !== 1 && settings.draw !== 3) settings.draw = 3;

  let g;
  let history = []; // earlier states, for Undo (this page only)

  function deal(draw) {
    const deck = [];
    for (const s of SUITS) for (const r of RANKS) deck.push(r + s);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const cols = [];
    for (let i = 0; i < 7; i++) {
      cols.push([]);
      for (let j = 0; j <= i; j++) cols[i].push({ c: deck.pop(), up: j === i });
    }
    return { draw, stock: deck, waste: [], found: { S: [], H: [], D: [], C: [] }, cols, moves: 0, elapsed: 0, won: false, counted: false };
  }

  function valid(s) {
    try {
      if (!s || (s.draw !== 1 && s.draw !== 3) || s.cols.length !== 7) return false;
      const all = [...s.stock, ...s.waste, ...SUITS.flatMap((k) => s.found[k]), ...s.cols.flatMap((c) => c.map((x) => x.c))];
      return all.length === 52 && new Set(all).size === 52 && all.every((c) => rank(c) > 0 && SUIT_NAME[suit(c)]);
    } catch {
      return false;
    }
  }

  function load() {
    const s = read(KEY);
    g = valid(s) ? s : deal(settings.draw);
  }

  function save() {
    write(KEY, g);
    write(`${KEY}-settings`, settings);
  }

  // ---------------------------------------------------------------------------
  // Rules
  //
  // A pick is { loc, idx }: loc is 'waste', 'found:S' or 'col:3'; idx is the
  // first picked card's index in a column (a column pick takes the cards on
  // top of it too). A destination is 'found:S' or 'col:3'.

  function picked(p) {
    if (p.loc === 'waste') return g.waste.slice(-1);
    if (p.loc.startsWith('found:')) return g.found[p.loc.slice(6)].slice(-1);
    return g.cols[+p.loc.slice(4)].slice(p.idx).map((x) => x.c);
  }

  function canDrop(codes, dest) {
    const first = codes[0];
    if (!first) return false;
    if (dest.startsWith('found:')) {
      const s = dest.slice(6);
      return codes.length === 1 && suit(first) === s && rank(first) === g.found[s].length + 1;
    }
    if (!dest.startsWith('col:')) return false; // the Deck and Draw pile take no drops
    const col = g.cols[+dest.slice(4)];
    const top = col[col.length - 1];
    if (!top) return rank(first) === 13; // only a king goes in an empty column
    return top.up && rank(top.c) === rank(first) + 1 && red(top.c) !== red(first);
  }

  function destinations(p) {
    const codes = picked(p);
    const all = [...SUITS.map((s) => `found:${s}`), ...g.cols.map((_, i) => `col:${i}`)];
    return all.filter((d) => d !== p.loc && canDrop(codes, d));
  }

  function snapshot() {
    history.push(JSON.stringify(g));
    if (history.length > 1000) history.shift();
  }

  // Turn over a column's top card when it's face down (after a move off it).
  function flipTops() {
    for (const col of g.cols) if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true;
  }

  function move(p, dest) {
    const codes = picked(p);
    if (!canDrop(codes, dest)) return false;
    snapshot();
    if (p.loc === 'waste') g.waste.pop();
    else if (p.loc.startsWith('found:')) g.found[p.loc.slice(6)].pop();
    else g.cols[+p.loc.slice(4)].splice(p.idx);
    if (dest.startsWith('found:')) g.found[dest.slice(6)].push(...codes);
    else g.cols[+dest.slice(4)].push(...codes.map((c) => ({ c, up: true })));
    flipTops();
    g.moves++;
    changed();
    return true;
  }

  // Click on the Deck: turn over 1 or 3 cards, or start the Deck over.
  function drawCards() {
    if (!g.stock.length && !g.waste.length) return;
    snapshot();
    if (!g.stock.length) {
      g.stock = g.waste.reverse();
      g.waste = [];
    } else {
      for (let k = 0; k < g.draw && g.stock.length; k++) g.waste.push(g.stock.pop());
    }
    g.moves++;
    changed();
  }

  // Double-click: send a card to its Done list if it fits.
  function toDone(p) {
    const codes = picked(p);
    if (codes.length !== 1) return false;
    return move(p, `found:${suit(codes[0])}`);
  }

  const allUp = () => !g.stock.length && !g.waste.length && g.cols.every((c) => c.every((x) => x.up));
  const canFinish = () => !g.won && allUp();

  let finishing = 0;
  function finish() {
    if (finishing || !canFinish()) return;
    finishing = setInterval(() => {
      // the lowest card that can go to Done next
      let best = null;
      g.cols.forEach((col, i) => {
        const top = col[col.length - 1];
        if (top && canDrop([top.c], `found:${suit(top.c)}`) && (!best || rank(top.c) < best.r)) best = { r: rank(top.c), i, idx: col.length - 1 };
      });
      if (!best || g.won) {
        clearInterval(finishing);
        finishing = 0;
        render();
        return;
      }
      move({ loc: `col:${best.i}`, idx: best.idx }, `found:${suit(g.cols[best.i][best.idx].c)}`);
    }, 70);
  }

  function changed() {
    if (!g.won && SUITS.every((s) => g.found[s].length === 13)) {
      g.won = true;
      count();
    }
    save();
    render();
  }

  // Wins and best times per draw mode.
  function stats(draw) {
    const all = read(`${KEY}-stats`) || {};
    return { won: 0, best: null, ...(all[draw] || {}) };
  }
  function count() {
    if (g.counted) return;
    const all = read(`${KEY}-stats`) || {};
    const st = stats(g.draw);
    g.prevBest = st.best;
    st.won++;
    if (st.best == null || g.elapsed < st.best) {
      st.best = g.elapsed;
      g.newBest = true;
    }
    all[g.draw] = st;
    write(`${KEY}-stats`, all);
    g.counted = true;
  }

  function undo() {
    if (!history.length || finishing) return;
    g = JSON.parse(history.pop());
    pick = null;
    save();
    render();
  }

  function newGame() {
    clearInterval(finishing);
    finishing = 0;
    g = deal(settings.draw);
    history = [];
    pick = null;
    save();
    render();
  }

  // ---------------------------------------------------------------------------
  // The board

  let pick = null; // the picked card(s), or null

  // Every ticket is fully visible, like a real task board: face-up cards are
  // full tickets, face-down cards are slim collapsed ones, with a gap between.
  const dims = () => (KG.os() === 'phone' ? { h: 44, down: 16, gap: 4 } : { h: 58, down: 22, gap: 6 });

  function cardHtml(code, { loc, idx, top, pickable, sel }) {
    const attrs = pickable ? ` data-loc="${loc}" data-idx="${idx}"` : '';
    return `<div class="tb-card up s-${suit(code)}${sel ? ' sel' : ''}${pickable ? ' pickable' : ''}" style="top:${top}px"${attrs}>
      <div class="tb-card-line"><b>${code}</b><span class="tb-card-name">${cardName(code)}</span></div>
      <div class="tb-card-meta"><span class="tb-label">${red(code) ? 'Red' : 'Black'}</span></div>
    </div>`;
  }
  const backHtml = (top, extra = '', height) => `<div class="tb-card down${height ? ' slim' : ''}" style="top:${top}px${height ? `;height:${height}px` : ''}">${extra}</div>`;

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
    const dests = pick ? destinations(pick) : [];
    const isSel = (loc, idx) => pick && pick.loc === loc && (loc.startsWith('col:') ? idx >= pick.idx : true);
    let top = '';

    // Deck
    let deck;
    if (g.stock.length) deck = backHtml(0, `<span class="tb-deck-text">${g.stock.length} cards<br><small>Draw ${g.draw}</small></span>`);
    else if (g.waste.length) deck = '<div class="tb-empty tb-deck-again">Start over</div>';
    else deck = emptyHtml('Empty');
    top += listHtml('stock', ['Deck', 'Deck'], null, deck, d.h, 'tb-stock');

    // Draw pile: the top 1 or 3 cards, one under another; only the last one moves
    const shown = g.waste.slice(-g.draw);
    const wasteBody = shown.length
      ? shown.map((c, k) => cardHtml(c, { loc: 'waste', idx: 0, top: k * (d.h + d.gap), pickable: k === shown.length - 1, sel: k === shown.length - 1 && isSel('waste') })).join('')
      : emptyHtml('Empty');
    top += listHtml('waste', ['Draw pile', 'Draw'], g.waste.length, wasteBody, Math.max(1, shown.length) * (d.h + d.gap) - d.gap, 'tb-waste');
    top += '<div class="tb-gap" aria-hidden="true"></div>';

    // Done lists
    for (const s of SUITS) {
      const f = g.found[s];
      const body = f.length
        ? cardHtml(f[f.length - 1], { loc: `found:${s}`, idx: 0, top: 0, pickable: !g.won, sel: isSel(`found:${s}`) })
        : emptyHtml(`Starts with ace-${SUIT_NAME[s]}`, `A${s}`);
      top += listHtml(`found:${s}`, [`Done · ${cap(SUIT_NAME[s])}`, 'Done'], f.length, body, d.h, `tb-done${dests.includes(`found:${s}`) ? ' can' : ''}`);
    }

    // Columns
    let bottom = '';
    g.cols.forEach((col, i) => {
      let y = 0;
      let body = '';
      col.forEach((x, idx) => {
        body += x.up ? cardHtml(x.c, { loc: `col:${i}`, idx, top: y, pickable: true, sel: isSel(`col:${i}`, idx) }) : backHtml(y, '', d.down);
        y += (x.up ? d.h : d.down) + d.gap;
      });
      if (!col.length) body = emptyHtml('Kings only', 'K');
      bottom += listHtml(`col:${i}`, [`Column ${i + 1}`, `Col ${i + 1}`], col.length, body, col.length ? y - d.gap : d.h, dests.includes(`col:${i}`) ? 'can' : '');
    });

    lists.innerHTML = `<div class="tb-row tb-top">${top}</div><div class="tb-row tb-cols">${bottom}</div>`;
    renderStats();
    renderInfo();
    $('undo').disabled = !history.length;
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
    if (g.won) {
      const st = stats(g.draw);
      let best = '';
      if (g.newBest && g.prevBest != null) best = ` New best for Draw ${g.draw} (was ${clock(g.prevBest)}).`;
      else if (st.best != null && !g.newBest) best = ` Best for Draw ${g.draw}: ${clock(st.best)}.`;
      html = `<b>Board cleared</b> in ${clock(g.elapsed)} and ${g.moves} moves.${best}
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>
        <button class="kg-btn" type="button" data-signup>Email me new games</button>`;
    } else if (canFinish() && !finishing) {
      html = 'Every card is face up. <button class="kg-btn kg-primary" type="button" data-finish>Finish</button>';
    } else if (settings.draw !== g.draw) {
      html = `Draw ${settings.draw} starts with your next new game. <button class="kg-btn" type="button" data-new>Start it now</button>`;
    } else if (!g.moves) {
      html = phone
        ? 'Tap a card, then tap where it goes. Tap the Deck to turn over cards. Help has the rules.'
        : 'Click a card, then click where it goes, or drag it. Double-click sends a card to Done. Click the Deck to turn over cards.';
    }
    info.hidden = !html;
    if (info.innerHTML !== html) info.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Input: click to pick and click to drop, drag and drop, double-click to Done

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
    // Only two clicks in a row on the same card make a double-click.
    if (!e.target.closest('.tb-card[data-loc]')) lastClick = { key: '', t: 0 };
    const list = e.target.closest('[data-drop]');
    if (!list) {
      pick = null;
      render();
      return;
    }
    if (list.dataset.drop === 'stock') {
      pick = null;
      drawCards();
      return;
    }
    if (pick && destinations(pick).includes(list.dataset.drop)) {
      const p = pick;
      pick = null;
      lastClick = { key: '', t: 0 };
      move(p, list.dataset.drop);
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
        if (!toDone(p)) render();
        return;
      }
      pick = pick && pick.loc === p.loc && pick.idx === p.idx ? null : p;
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
    if (!under || !move(d.p, under.dataset.drop)) render();
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.kg-modal:not([hidden])')) return;
    if (e.key === 'F2') {
      e.preventDefault();
      newGame();
    } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !e.target.closest('input, textarea, select')) {
      e.preventDefault();
      undo();
    } else if (e.key === 'Escape' && pick) {
      pick = null;
      render();
    }
  });

  $('info').addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) newGame();
    else if (e.target.closest('[data-finish]')) finish();
    else if (e.target.closest('[data-signup]')) KG.openSignup();
  });
  $('new').addEventListener('click', () => newGame());
  $('undo').addEventListener('click', () => undo());
  $('draw').addEventListener('change', (e) => {
    settings.draw = +e.target.value;
    // Switch right away unless that would throw away a game in progress.
    if (!g.moves || g.won) newGame();
    else {
      save();
      render();
    }
  });

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
      <li>In <b>Column 1</b> to <b>Column 7</b>, build down in alternating colors: hearts and diamonds go on spades and clubs, and spades and clubs go on hearts and diamonds. A run of cards moves together.</li>
      <li>Only a king can go in an empty column.</li>
      <li>Click the <b>Deck</b> to turn over 3 cards (or 1, with Draw 1 cards) onto the <b>Draw pile</b>. Its top card can be played. When the Deck runs out, click it to start it over.</li>
    </ul>
    <h2>Moving cards</h2>
    <ul>
      <li>Click a card to pick it up, then click where it goes, or drag it there. Places it can go are highlighted.</li>
      <li>Double-click a card to send it straight to its Done list.</li>
      <li><b>Undo</b> (Ctrl+Z) takes back moves. F2 starts a new game.</li>
    </ul>
    <h2>Reading the cards</h2>
    <ul>
      <li>Each card is a ticket named for its card, like <b>eight-hearts</b> (8H), with no suit symbols.</li>
      <li>Hearts and diamonds are red; spades and clubs are black.</li>
    </ul>`;

  function showHelp() {
    if (document.querySelector('.tb-help')) return;
    const box = document.createElement('div');
    box.className = 'kg-modal tb-help';
    box.innerHTML = `<div class="window kg-dialog" role="dialog" aria-modal="true" aria-labelledby="tb-help-title">
      <div class="titlebar">
        <div class="lights"><span class="close" data-close></span><span class="min"></span><span class="max"></span></div>
        <div class="window-title" id="tb-help-title">how-to-play.txt — Notes</div>
      </div>
      <div class="notes-menu"><span>File</span><span>Edit</span><span>Format</span><span>View</span><span>Help</span></div>
      <div class="notes-page">${HELP}</div>
      <div class="notes-status"><span>Ln 1, Col 1</span><span>UTF-8</span><button class="kg-btn kg-primary" type="button" data-close>Back to the board</button></div>
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

  // ---------------------------------------------------------------------------
  // Start

  function retitle() {
    $('board-title').textContent = KG.pick({ value: 'Solitaire - Tasks', quality: 'Solitaire', power: 'Solitaire — Tasks' });
  }

  load();
  $('draw').value = String(settings.draw);
  retitle();
  render();

  KG.makeWindow(win, {
    minW: 560,
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
