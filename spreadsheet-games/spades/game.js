// Spades UI: two windows on the site shell (../../os/os.js).
//   Hand      — a file browser where each of your cards is a file. Bid in the
//               banner; select a card and Play (or click it again).
//   Scorecard — a spreadsheet with two working sheet tabs: Tricks (a log of
//               this hand, one row per trick) and Scores (one row per hand).
// The computer players act on short timers so you can follow along. Rules
// and computer players live in engine.js. See DESIGN.md.

(() => {
  const S = Spades;
  const KEY = 'spades'; // + '-game', '-both', '-view', '-sheet', '-hand'
  const AI_DELAY = 650; // ms between computer plays
  const TRICK_PAUSE = 1300; // ms after a trick before the next lead

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
  // g: the match from engine.js, plus g.hidden: human seats whose cards stay
  // face down until they choose blind nil or look (only offered while the
  // team is behind by 100+).

  let g;
  let both = read(`${KEY}-both`) === true; // you also play North's hand
  let folder = 0; // the seat whose hand the Files window shows (0 or 2)
  let picked = null; // the selected card in that hand
  let tab = 'tricks';
  let screen = 'hand';
  let ask = null; // the message bar is asking: 'new'
  let justPlayed = null; // the card just played (flashes in the log)
  let timer = null;
  let scoresTimer = null; // shows the Scores tab once the last trick has been seen

  const humans = () => (both ? [0, 2] : [0]);
  const isHuman = (seat) => humans().includes(seat);
  const save = () => write(`${KEY}-game`, g);
  const seatName = (s) => S.SEATS[s];
  const fmt = (n) => (n < 0 ? `−${Math.abs(n)}` : String(n));
  const signed = (n) => (n > 0 ? `+${n}` : fmt(n));
  const bidText = (b) => (b === null ? '' : b === 'nil' ? 'Nil' : b === 'blind' ? 'Blind nil' : String(b));

  // Deal hook: decide the computer players' blind nils and which of your
  // hands start face down.
  function afterDeal() {
    g.hidden = [];
    for (let s = 0; s < 4; s++) {
      if (!S.blindAllowed(g, s)) continue;
      if (isHuman(s)) g.hidden.push(s);
      else if (S.aiBlind(g, s)) S.goBlind(g, s);
    }
    picked = null;
    folder = 0;
  }

  function newGame() {
    clearTimeout(timer);
    g = S.newMatch();
    afterDeal();
    ask = null;
    showTricks();
    save();
    render();
    schedule();
  }

  function askNewGame() {
    if (g.phase === 'over' || (g.hand === 1 && !g.tricks.length && g.bids.every((b) => b === null))) return newGame();
    ask = 'new';
    renderInfo();
  }

  function nextHand() {
    if (g.phase !== 'done') return;
    S.nextHand(g);
    afterDeal();
    showTricks();
    save();
    render();
    schedule();
  }

  // The Scorecard follows the hands: Tricks while a hand is played, then
  // Scores (after the trick pause, so the last trick can be read) once it's
  // scored. On phones the Scorecard screen comes up too.
  function showTricks() {
    clearTimeout(scoresTimer);
    tab = 'tricks';
    sel = { x: 0, y: 0 };
    if (screen === 'sheet') screen = 'hand';
  }

  function showScores() {
    clearTimeout(scoresTimer);
    tab = 'scores';
    sel = { x: 1, y: 1 }; // our score, so the formula bar shows where it comes from
    screen = 'sheet';
  }

  function afterPlay() {
    if (g.phase !== 'done' && g.phase !== 'over') return;
    clearTimeout(scoresTimer);
    scoresTimer = setTimeout(() => {
      showScores();
      render();
    }, TRICK_PAUSE);
  }

  // ---------------------------------------------------------------------------
  // Turns: the computer players act on timers; you act through the UI.

  function schedule() {
    clearTimeout(timer);
    if (g.phase !== 'bid' && g.phase !== 'play') return;
    if (isHuman(g.turn)) {
      // show the hand whose turn it is
      if (both && folder !== g.turn) {
        folder = g.turn;
        picked = null;
        render();
      }
      return;
    }
    const t = S.current(g);
    const fresh = g.phase === 'play' && t && !t.cards.length && g.tricks.length > 1;
    timer = setTimeout(aiAct, fresh ? TRICK_PAUSE : AI_DELAY);
  }

  function aiAct() {
    if (isHuman(g.turn)) return schedule();
    if (g.phase === 'bid') S.bid(g, g.turn, S.aiBid(g, g.turn));
    else if (g.phase === 'play') {
      const seat = g.turn;
      const card = S.aiPlay(g, seat);
      S.play(g, seat, card);
      justPlayed = card;
      afterPlay();
    }
    save();
    render();
    schedule();
  }

  function humanBid(seat, value) {
    if (g.phase !== 'bid' || g.turn !== seat || !isHuman(seat)) return;
    S.bid(g, seat, value);
    save();
    render();
    schedule();
  }

  function humanPlay(card) {
    const seat = folder;
    if (g.phase !== 'play' || g.turn !== seat || !isHuman(seat)) return;
    if (!S.legal(g, seat).includes(card)) return;
    S.play(g, seat, card);
    justPlayed = card;
    picked = null;
    afterPlay();
    save();
    render();
    schedule();
  }

  function chooseBlind(seat, blind) {
    if (!g.hidden?.includes(seat)) return;
    g.hidden = g.hidden.filter((s) => s !== seat);
    if (blind && S.blindAllowed(g, seat)) S.goBlind(g, seat);
    save();
    render();
    schedule();
  }

  // ---------------------------------------------------------------------------
  // The Scorecard

  const colName = (c) => {
    let s = '';
    for (c += 1; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
    return s;
  };
  const ref = (x, y) => `${colName(x)}${y + 1}`;

  const COLS = 14;
  const ROWS = 40;
  let tds = [];
  let sel = { x: 0, y: 0 };
  let cells = new Map(); // "x,y" → { text, cls, f } for the current tab

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

  const put = (x, y, text, cls = '', f = null) => cells.set(`${x},${y}`, { text: String(text), cls, f: f ?? String(text) });

  // Tricks: seats in columns B–E, who led in F, who won in G.
  //   1  Hand n | You | West | North | East | Led | Won
  //   2  Bid
  //   3  Taken
  //   5+ Trick 1–13
  const SEAT_COL = [1, 2, 3, 4]; // You, West, North, East
  const FIRST_TRICK = 4;

  function tricksSheet() {
    put(0, 0, `Hand ${g.hand}`, 'hd');
    S.SEATS.forEach((n, s) => put(SEAT_COL[s], 0, n, `hd c ${S.team(s) ? 'them' : 'us'}`));
    put(5, 0, 'Led', 'hd c');
    put(6, 0, 'Won', 'hd c');
    put(0, 1, 'Bid', 'lab');
    put(0, 2, 'Taken', 'lab');
    const last = FIRST_TRICK + 12;
    for (let s = 0; s < 4; s++) {
      const blindHidden = g.phase === 'bid' && g.blind[s] && g.bids[s] === null;
      put(SEAT_COL[s], 1, blindHidden ? 'Blind nil' : bidText(g.bids[s]), 'c num');
      const col = colName(6);
      put(SEAT_COL[s], 2, g.phase === 'bid' ? '' : g.taken[s], 'c num', `=COUNTIF(${col}${FIRST_TRICK + 1}:${col}${last + 1},"${S.SEATS[s]}")`);
    }
    for (let k = 0; k < 13; k++) {
      const y = FIRST_TRICK + k;
      const t = g.tricks[k];
      const cur = t && t.winner === null && g.phase === 'play';
      put(0, y, `Trick ${k + 1}`, `lab${cur ? ' cur' : ''}`);
      for (let s = 0; s < 4; s++) put(SEAT_COL[s], y, '', `c${cur ? ' cur' : ''}`);
      put(5, y, '', `c${cur ? ' cur' : ''}`);
      put(6, y, '', `c${cur ? ' cur' : ''}`);
      if (!t) continue;
      const win = t.cards.length ? S.winning(t.cards) : null;
      for (const e of t.cards) {
        let cls = `c card s-${S.suit(e.card)}${cur ? ' cur' : ''}`;
        if (win && e === win && (t.winner !== null || cur)) cls += t.winner !== null ? ' win' : ' lead';
        if (e.card === justPlayed) cls += ' pop';
        if (e === t.cards[0]) cls += ' led';
        put(SEAT_COL[e.seat], y, e.card, cls);
      }
      put(5, y, seatName(t.leader), `c${cur ? ' cur' : ''}`);
      if (t.winner !== null) {
        const range = `${colName(1)}${y + 1}:${colName(4)}${y + 1}`;
        put(6, y, seatName(t.winner), `c ${S.team(t.winner) ? 'them' : 'us'}`, `=WINNER(${range})`);
      }
    }
  }

  // Scores: one row per hand for each team, then totals.
  //   A Hand | B Our bid | C Taken | D Points | E Bags | F Total | G Their bid | ...
  function pointsFormula(r) {
    const parts = [];
    if (r.contract) parts.push(r.made ? `10*${r.contract}${r.bags ? `+${r.bags}` : ''}` : `-10*${r.contract}`);
    else if (r.bags) parts.push(String(r.bags));
    for (const n of r.nils) parts.push(`${n.ok ? '+' : '-'}${n.worth}`);
    if (r.penalty) parts.push(`-${r.penalty}`);
    let f = parts.join('');
    if (f.startsWith('+')) f = f.slice(1);
    return `=${f || '0'}`;
  }

  function teamBid(bids, t) {
    const seats = [t, t + 2];
    const nums = seats.filter((s) => typeof bids[s] === 'number').map((s) => bids[s]);
    const nils = seats.filter((s) => S.isNil(bids[s])).map((s) => (bids[s] === 'blind' ? 'Blind nil' : 'Nil'));
    if (seats.some((s) => bids[s] === null)) return nums.length || nils.length ? [...nums, ...nils].join(' + ') + ' …' : '';
    const n = nums.reduce((a, b) => a + b, 0);
    return [n ? String(n) : '', ...nils].filter(Boolean).join(' + ');
  }

  // Scores: the match so far on top (rows 1–3), then one row per hand.
  //   1  Team | Score | Bags | Need
  //   2  Us   | =F7   | =E7  | =500-B2
  //   3  Them
  //   5  Hand | Our bid | Taken | Points | Bags | Total | Their bid | …
  //   6+ Hand 1, Hand 2, …
  const TABLE = 4; // the per-hand table's header row
  function scoresSheet() {
    const last = TABLE + g.history.length + 1; // the latest scored hand's row (1-based)
    ['Team', 'Score', 'Bags', 'Need'].forEach((h, x) => put(x, 0, h, `hd ${x ? 'c' : ''}`));
    for (let t = 0; t < 2; t++) {
      const y = 1 + t;
      const team = t ? 'them' : 'us';
      const x0 = 1 + t * 5;
      put(0, y, t ? 'Them' : 'Us', `lab tot ${team}`);
      put(1, y, fmt(g.totals[t]), `c num tot ${team}${g.totals[t] < 0 ? ' neg' : ''}`, g.history.length ? `=${colName(x0 + 4)}${last}` : '=0');
      put(2, y, g.bags[t], 'c num', g.history.length ? `=${colName(x0 + 3)}${last}` : '=0');
      const need = Math.max(0, S.TARGET - g.totals[t]);
      put(3, y, need, 'c num', `=MAX(0,${S.TARGET}-B${y + 1})`);
    }

    const heads = ['Hand', 'Our bid', 'Taken', 'Points', 'Bags', 'Total', 'Their bid', 'Taken', 'Points', 'Bags', 'Total'];
    heads.forEach((h, x) => put(x, TABLE, h, `hd ${x === 0 ? '' : 'c'} ${x >= 1 && x <= 5 ? 'us' : x >= 6 ? 'them' : ''}`));
    g.history.forEach((h, k) => {
      const y = TABLE + 1 + k;
      put(0, y, `Hand ${h.hand}`, 'lab');
      h.teams.forEach((r, t) => {
        const x0 = 1 + t * 5;
        put(x0, y, teamBid(h.bids, t), 'c');
        put(x0 + 1, y, r.tricks, 'c num', `=${h.taken[t]}+${h.taken[t + 2]}`);
        put(x0 + 2, y, signed(r.points), `c num${r.points < 0 ? ' neg' : ''}`, pointsFormula(r));
        put(x0 + 3, y, r.bagTotal, 'c num', r.penalty ? `=${r.bagTotal + r.penalty / 10}-${r.penalty / 10}` : null);
        const prev = k ? `${colName(x0 + 4)}${y}+` : '';
        put(x0 + 4, y, fmt(r.total), 'c num tot', `=${prev}${colName(x0 + 2)}${y + 1}`);
      });
    });
    // the hand being played
    if (g.phase === 'bid' || g.phase === 'play') {
      const y = TABLE + 1 + g.history.length;
      put(0, y, `Hand ${g.hand}`, 'lab live');
      for (let t = 0; t < 2; t++) {
        const x0 = 1 + t * 5;
        put(x0, y, teamBid(g.bids, t), 'c live');
        put(x0 + 1, y, g.phase === 'play' ? g.taken[t] + g.taken[t + 2] : '', 'c num live');
      }
    }
  }

  function renderSheet() {
    cells = new Map();
    if (tab === 'tricks') tricksSheet();
    else scoresSheet();
    grid.classList.toggle('t-tricks', tab === 'tricks');
    grid.classList.toggle('t-scores', tab === 'scores');
    for (const td of tds) {
      const c = cells.get(`${td.dataset.x},${td.dataset.y}`);
      td.className = c ? c.cls : '';
      td.textContent = c ? c.text : '';
    }
    for (const b of document.querySelectorAll('[data-tab]')) {
      b.classList.toggle('on', b.dataset.tab === tab);
      b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    }
    renderSel();
  }

  function renderSel() {
    grid.querySelector('td.sel')?.classList.remove('sel');
    for (const th of grid.querySelectorAll('th.on')) th.classList.remove('on');
    tds[sel.y * COLS + sel.x].classList.add('sel');
    grid.tHead.rows[0].cells[sel.x + 1].classList.add('on');
    grid.tBodies[0].rows[sel.y].cells[0].classList.add('on');
    $('namebox').textContent = ref(sel.x, sel.y);
    const c = cells.get(`${sel.x},${sel.y}`);
    $('formula').textContent = c && c.text !== '' ? c.f : '';
  }

  function renderStatus() {
    $('state').textContent = g.phase === 'over' ? 'Calculation complete' : 'Ready';
    $('score').textContent = `Hand ${g.hand}`;
  }

  function handSummary() {
    const h = g.history.at(-1);
    const part = (t) => {
      const r = h.teams[t];
      const bits = [];
      if (r.contract) bits.push(r.made ? `made ${r.contract} with ${r.tricks}` : `set: bid ${r.contract}, took ${r.tricks}`);
      for (const n of r.nils) bits.push(`${seatName(n.seat)}'s ${n.blind ? 'blind nil' : 'nil'} ${n.ok ? 'made' : 'failed'}`);
      if (r.penalty) bits.push(`−${r.penalty} for ${S.BAGS} bags`);
      return `${signed(r.points)} (${bits.join(', ')})`;
    };
    return `Us ${part(0)} · Them ${part(1)}`;
  }

  function renderInfo() {
    const info = $('info');
    let html = '';
    if (ask === 'new') {
      html = `<b>Start a new game?</b> This one ends here.
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>
        <button class="kg-btn" type="button" data-cancel>Keep playing</button>`;
    } else if (g.phase === 'over') {
      const w = S.winner(g);
      html = `<b>${w === 0 ? 'You and North win' : 'West and East win'}</b>, ${fmt(g.totals[0])} to ${fmt(g.totals[1])} after ${g.hand} hands.
        <button class="kg-btn kg-primary" type="button" data-new>New game</button>
        <button class="kg-btn" type="button" data-signup>Email me new games</button>`;
    } else if (g.phase === 'done') {
      html = `<b>Hand ${g.hand} scored.</b> ${handSummary()}.
        <button class="kg-btn kg-primary" type="button" data-next>Next hand</button>`;
    } else if (g.hand === 1 && g.phase === 'bid') {
      html = `<b>Spades:</b> you and North against West and East. First team to ${S.TARGET} wins. Bid in the Hand window, then play your cards there. Every trick is logged here.`;
    }
    info.hidden = !html;
    if (info.innerHTML !== html) info.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // The Hand window

  const FOLDER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v1H2z" class="i-folder-back"/><rect x="2" y="9" width="20" height="11" rx="2" class="i-folder"/></svg>';
  const rankLabel = (c) => c.slice(0, -1);

  // Large icons (default) or Details: Name (card icon + file name), Rank,
  // Suit, Status. The shell's KG.fileView draws it and the switch.
  const cardsView = KG.fileView($('view'), {
    switchEl: $('view-switch'),
    storageKey: `${KEY}-view`,
    defaultView: 'list', // Details: 13 cards read best as a list
    columns: [
      { label: 'Rank', width: '48px', phoneWidth: '34px' },
      { label: 'Suit', width: '80px', phoneWidth: '66px' },
      { label: 'Status', width: '90px', phoneWidth: '64px' },
    ],
    onChange: () => renderHand(),
  });

  const myTurn = () => g.phase === 'play' && g.turn === folder && isHuman(folder);

  function cardItem(c, legal) {
    const turn = myTurn();
    const ok = legal.includes(c);
    return {
      name: `${S.word(c)}.card`,
      icon: `<span class="card-icon suit-${S.suit(c)}">${c}</span>`,
      cells: [rankLabel(c), `<span class="card-suit suit-${S.suit(c)}">${S.SUIT_NAMES[S.suit(c)]}</span>`, turn ? (ok ? '<span class="card-status play">Playable</span>' : '') : ''],
      attrs: { 'data-card': c },
      cls: [turn && !ok && 'dim'],
      selected: picked === c,
      label: `${c}${turn && !ok ? ', can’t be played now' : ''}`,
    };
  }

  function bidPicker(seat) {
    const est = Math.max(1, Math.min(13, Math.round(S.estimate(g.hands[seat]))));
    let opts = '<option value="nil">Nil</option>';
    for (let n = 1; n <= 13; n++) opts += `<option value="${n}"${n === est ? ' selected' : ''}>${n}</option>`;
    return { est, html: `<select id="bid-pick" aria-label="Your bid">${opts}</select> <button class="kg-btn kg-primary mini" type="button" data-bid>Bid</button>` };
  }

  function trickLine() {
    const t = S.current(g);
    if (!t || !t.cards.length) return '';
    return t.cards.map((e) => `${seatName(e.seat)} <b class="s-${S.suit(e.card)}">${e.card}</b>`).join(', ');
  }

  function renderHand() {
    const seat = folder;
    const hidden = g.hidden?.includes(seat);
    let side = `<h2>Spades</h2><a href="#" data-folder="0"${folder === 0 ? ' aria-current="true"' : ''}>${FOLDER_ICON}<span>My hand</span><em>${g.hands[0].length}</em></a>`;
    if (both) side += `<a href="#" data-folder="2"${folder === 2 ? ' aria-current="true"' : ''}>${FOLDER_ICON}<span>North's hand</span><em>${g.hands[2].length}</em></a>`;
    $('side').innerHTML = side;

    const where = g.phase === 'bid' ? 'Bidding' : g.phase === 'play' ? `Trick ${g.tricks.length}` : g.phase === 'done' ? 'Scored' : 'Game over';
    $('crumbs').innerHTML = `<span>${seat === 2 ? "North's hand" : 'My hand'}</span><span class="sep">›</span><span>Hand ${g.hand}</span><span class="sep">›</span><span>${where}</span>`;

    const legal = myTurn() ? S.legal(g, seat) : [];
    if (picked && !g.hands[seat].includes(picked)) picked = null;
    const empty = hidden ? 'Cards are face down until you decide on blind nil.' : g.phase === 'done' || g.phase === 'over' ? 'All cards played.' : 'No cards.';
    cardsView.render(hidden ? [] : g.hands[seat].map((c) => cardItem(c, legal)), { empty });

    const btn = $('play-btn');
    btn.hidden = g.phase !== 'play';
    btn.disabled = !(myTurn() && picked && legal.includes(picked));

    // Banner: what's happening and what to do
    const phone = KG.os() === 'phone';
    const toSheet = phone ? ' <button class="kg-btn mini" type="button" data-screen="sheet">Scorecard</button>' : '';
    let html = '';
    if (hidden) {
      html = `Your team is behind by ${S.BLIND_BEHIND} or more, so ${seat === 2 ? 'North' : 'you'} can bid <b>blind nil</b> (worth ${S.BLIND}, or −${S.BLIND} if ${seat === 2 ? 'North takes' : 'you take'} a trick) before looking at the cards.
        <button class="kg-btn kg-primary mini" type="button" data-blind="${seat}">Blind nil</button>
        <button class="kg-btn mini" type="button" data-look="${seat}">Look at the cards</button>`;
    } else if (g.phase === 'bid') {
      const bids = g.bids.map((b, s) => (b === null ? null : `${seatName(s)} ${bidText(b)}`)).filter(Boolean).join(' · ');
      const sofar = bids ? `Bids: ${bids}. ` : '';
      if (g.turn === seat && isHuman(seat)) {
        if (g.blind[seat]) html = `${sofar}${seat === 2 ? 'North bids' : 'You bid'} blind nil. <button class="kg-btn kg-primary mini" type="button" data-bid="blind">Confirm</button>`;
        else {
          const p = bidPicker(seat);
          html = `${sofar}${seat === 2 ? "North's" : 'Your'} cards look like about <b>${p.est}</b> trick${p.est === 1 ? '' : 's'}. ${seat === 2 ? "North's" : 'Your'} bid: ${p.html}`;
        }
      } else html = `${sofar}Waiting for ${seatName(g.turn)} to bid…`;
    } else if (g.phase === 'play') {
      const line = trickLine();
      const t = S.current(g);
      const prev = g.tricks.length > 1 && !t.cards.length ? g.tricks[g.tricks.length - 2] : null;
      const lead = prev ? `${seatName(prev.winner)} took trick ${g.tricks.length - 1}. ` : '';
      if (myTurn()) {
        const led = t.cards.length ? S.suit(t.cards[0].card) : null;
        const follow = led && g.hands[seat].some((c) => S.suit(c) === led);
        const what = !led ? `Lead a card${g.broken ? '' : ' (spades aren’t broken yet)'}.` : follow ? `Play a ${S.SUIT_NAMES[led].toLowerCase().slice(0, -1)}.` : `No ${S.SUIT_NAMES[led].toLowerCase()} left: play any card. A spade wins it.`;
        html = `${lead}${line ? `${line}. ` : ''}<b>${seat === 2 ? "North's turn" : 'Your turn'}</b>: ${what}`;
      } else html = `${lead}${line ? `${line}. ` : ''}Waiting for ${seatName(g.turn)}…`;
    } else if (g.phase === 'done') {
      html = `Hand ${g.hand} is over. <button class="kg-btn kg-primary mini" type="button" data-next>Next hand</button>${toSheet}`;
    } else {
      html = `Game over: ${S.winner(g) === 0 ? 'you and North win' : 'West and East win'}. <button class="kg-btn kg-primary mini" type="button" data-new>New game</button>`;
    }
    $('banner').innerHTML = html;

    const parts = [`${g.hands[seat].length} cards`];
    if (g.bids[seat] !== null) parts.push(`Bid ${bidText(g.bids[seat])}`);
    if (g.phase !== 'bid') parts.push(`Taken ${g.taken[seat]}`);
    if (picked) parts.push(`${picked} selected`);
    $('status').textContent = parts.join(' · ');
  }

  // ---------------------------------------------------------------------------
  // Both windows

  function renderScreens() {
    const phone = KG.os() === 'phone';
    document.body.classList.toggle('one-screen', phone);
    $('hand').classList.toggle('on-screen', !phone || screen === 'hand');
    $('sheet').classList.toggle('on-screen', !phone || screen === 'sheet');
    for (const b of document.querySelectorAll('.screen-tabs [data-screen]')) b.setAttribute('aria-selected', String(b.dataset.screen === screen));
  }

  function render() {
    renderSheet();
    renderStatus();
    renderInfo();
    renderHand();
    renderScreens();
    $('both').setAttribute('aria-pressed', String(both));
    justPlayed = null;
  }

  function showScreen(s) {
    screen = s;
    renderScreens();
  }

  // ---------------------------------------------------------------------------
  // Input

  $('view').addEventListener('click', (e) => {
    const f = e.target.closest('[data-card]');
    if (!f) return;
    const c = f.dataset.card;
    if (picked === c && myTurn()) return humanPlay(c);
    picked = picked === c ? null : c;
    renderHand();
  });
  $('view').addEventListener('dblclick', (e) => {
    const f = e.target.closest('[data-card]');
    if (f && myTurn()) humanPlay(f.dataset.card);
  });
  $('play-btn').addEventListener('click', () => picked && humanPlay(picked));

  $('side').addEventListener('click', (e) => {
    const a = e.target.closest('[data-folder]');
    if (!a) return;
    e.preventDefault();
    folder = +a.dataset.folder;
    picked = null;
    renderHand();
  });

  function onAction(e) {
    const t = e.target;
    if (t.closest('[data-screen]')) return showScreen(t.closest('[data-screen]').dataset.screen);
    if (t.closest('[data-next]')) return nextHand();
    if (t.closest('[data-new]')) return newGame();
    if (t.closest('[data-cancel]')) {
      ask = null;
      return renderInfo();
    }
    if (t.closest('[data-signup]')) return KG.openSignup();
    const blind = t.closest('[data-blind]');
    if (blind) return chooseBlind(+blind.dataset.blind, true);
    const look = t.closest('[data-look]');
    if (look) return chooseBlind(+look.dataset.look, false);
    const b = t.closest('[data-bid]');
    if (b) {
      if (b.dataset.bid === 'blind') return humanBid(folder, 'blind');
      const v = $('bid-pick').value;
      return humanBid(folder, v === 'nil' ? 'nil' : +v);
    }
  }
  $('banner').addEventListener('click', onAction);
  $('info').addEventListener('click', onAction);
  document.querySelector('.screen-tabs').addEventListener('click', onAction);

  $('new').addEventListener('click', askNewGame);
  $('both').addEventListener('click', () => {
    both = !both;
    write(`${KEY}-both`, both);
    if (!both) {
      folder = 0;
      picked = null;
      // North's face-down choice goes back to the computer
      if (g.hidden?.includes(2)) {
        g.hidden = g.hidden.filter((s) => s !== 2);
        if (S.aiBlind(g, 2)) S.goBlind(g, 2);
      }
    }
    save();
    render();
    schedule();
  });

  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('td');
    if (!cell) return;
    sel = { x: +cell.dataset.x, y: +cell.dataset.y };
    renderSel();
  });
  for (const b of document.querySelectorAll('[data-tab]')) {
    b.addEventListener('click', () => {
      clearTimeout(scoresTimer);
      tab = b.dataset.tab;
      renderSheet();
    });
  }

  let active = 'hand'; // the window keys go to (the last one clicked)

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.kg-modal:not([hidden])') || e.target.closest('input, textarea, select')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'F2') {
      e.preventDefault();
      askNewGame();
      return;
    }
    if (active === 'hand' && e.key === 'Enter' && picked && myTurn()) {
      e.preventDefault();
      humanPlay(picked);
      return;
    }
    if (active === 'hand' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !g.hidden?.includes(folder)) {
      e.preventDefault();
      const hand = g.hands[folder];
      if (!hand.length) return;
      const i = hand.indexOf(picked);
      picked = hand[(i + (e.key === 'ArrowRight' ? 1 : -1) + hand.length) % hand.length];
      renderHand();
      return;
    }
    if (active === 'sheet') {
      const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (!moves[e.key]) return;
      e.preventDefault();
      sel = { x: Math.max(0, Math.min(COLS - 1, sel.x + moves[e.key][0])), y: Math.max(0, Math.min(ROWS - 1, sel.y + moves[e.key][1])) };
      renderSel();
      tds[sel.y * COLS + sel.x].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });

  addEventListener('pagehide', () => g && save());

  // ---------------------------------------------------------------------------
  // Help

  const HELP = `
    <h2>Spades</h2>
    <ul>
      <li>You and <b>North</b> (your partner) play against <b>West</b> and <b>East</b>. Your cards are files in the Hand window; every trick is logged in the Scorecard.</li>
      <li><b>Bid</b> how many tricks you'll take. Your bid and North's add up to your team's bid. Bid <b>Nil</b> to promise no tricks at all.</li>
      <li>Play goes clockwise. <b>Follow the suit led</b> if you can; if you can't, play anything. The highest card of the suit led wins the trick, unless someone played a spade: <b>spades are trump</b>, and the highest spade wins.</li>
      <li>You can't lead a spade until spades are broken (one was played on another suit), unless you hold only spades.</li>
      <li>To play, select a card and press <b>Play</b>, or click it again, or double-click it. Cards you can't play are dimmed.</li>
    </ul>
    <h2>Scoring</h2>
    <ul>
      <li>Make your team's bid: <b>10 points per trick bid</b>, plus 1 for each extra trick. Miss it: lose 10 per trick bid.</li>
      <li>Extra tricks are <b>bags</b>. Every ${S.BAGS} bags costs 100 points.</li>
      <li><b>Nil</b>: +${S.NIL} if the bidder takes no tricks, −${S.NIL} if they take any. A nil bidder's tricks still count toward the partner's bid.</li>
      <li><b>Blind nil</b>: when your team is behind by ${S.BLIND_BEHIND} or more, you're offered it before seeing your cards. Worth +${S.BLIND} or −${S.BLIND}.</li>
      <li>First team to <b>${S.TARGET}</b> wins (the higher score if both get there; a tie plays another hand).</li>
    </ul>
    <h2>Play North</h2>
    <ul>
      <li>Turn on <b>Play North</b> in the Scorecard's toolbar to play your partner's hand as well. North's cards get their own folder, and the Hand window switches to whichever hand is up.</li>
    </ul>
    <h2>Keyboard</h2>
    <ul>
      <li>In the Hand window: ← → select a card, Enter plays it. F2 starts a new game.</li>
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
      <div class="notes-status"><span>Ln 1, Col 1</span><span>UTF-8</span><button class="kg-btn kg-primary" type="button" data-close>Back to the game</button></div>
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
  $('hand-help').addEventListener('click', showHelp);

  // ---------------------------------------------------------------------------
  // Windows

  let topZ = 20;
  function focusWindow(win) {
    win.style.zIndex = ++topZ;
    active = win.id;
    for (const w of document.querySelectorAll('.window[data-app]:not(.kg-dialog)')) w.classList.toggle('focused', w === win);
  }
  for (const win of [$('sheet'), $('hand')]) win.addEventListener('pointerdown', () => focusWindow(win), true);

  function retitle() {
    $('sheet-title').textContent = KG.pick({ value: 'Scorecard - Spreadsheet', quality: 'Scorecard', power: 'Scorecard — Spreadsheet' });
  }

  // ---------------------------------------------------------------------------
  // Start

  build();
  retitle();
  const saved = read(`${KEY}-game`);
  if (S.valid(saved)) {
    g = saved;
    if (!Array.isArray(g.hidden)) g.hidden = [];
    g.hidden = g.hidden.filter(isHuman);
    if (both && g.phase !== 'over' && isHuman(g.turn)) folder = g.turn;
    if (g.phase === 'done' || g.phase === 'over') showScores();
    render();
    schedule();
  } else {
    newGame();
  }

  const sheetW = (a) => Math.min(620, Math.max(460, a.w * 0.42));
  KG.makeWindow($('sheet'), {
    minW: 380,
    minH: 320,
    storageKey: `${KEY}-sheet`,
    rect: (a) => ({ x: a.x + 16, y: a.y + 16, w: sheetW(a), h: Math.min(640, a.h - 32) }),
  });
  KG.makeWindow($('hand'), {
    minW: 400,
    minH: 300,
    storageKey: `${KEY}-hand`,
    rect: (a) => {
      const left = a.x + 16 + sheetW(a) + 16;
      const w = Math.max(400, Math.min(700, a.x + a.w - left - 16));
      return { x: left, y: a.y + 40, w, h: Math.min(560, a.h - 72) };
    },
  });
  focusWindow($('hand'));

  KG.onChange(() => {
    retitle();
    render();
  });
})();
