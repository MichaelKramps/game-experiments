// Ctrl+Alt+Deal UI: two windows on the site shell (../os/os.js).
//   Account — bankroll, progress, the bet and Deal, paytable, recent hands.
//   Cards   — a file browser where every card is a file: Deck and
//             Hand. Select cards in Hand, then Draw (Refresh) replaces
//             them. And
//             between hands the right-click menu duplicates or permanently
//             deletes cards from Deck.
// Rules live in engine.js. The run is saved to localStorage after every move.

(() => {
  const SAVE_KEY = 'ctrl-alt-deal-run';
  const LONG_PRESS_MS = 500;
  const E = Engine;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  // From $1M up, amounts are shortened to three significant digits ($1.25M,
  // $48.3B). They round down, so a bankroll never looks bigger than it is.
  const UNITS = [[1e15, 'Q'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M']];
  const amount = (n) => {
    const unit = UNITS.find(([u]) => n >= u);
    if (!unit) return n.toLocaleString();
    const v = n / unit[0];
    const places = v < 10 ? 2 : v < 100 ? 1 : 0;
    return Number((Math.floor(v * 10 ** places + 1e-9) / 10 ** places).toFixed(places)) + unit[1];
  };
  const money = (n) => (n < 0 ? '−$' : '$') + amount(Math.abs(n));
  const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + '$' + amount(Math.abs(n));
  const mult = (m) => (m < 0 ? '−' : '') + Math.abs(m) + 'x';

  const FOLDER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v1H2z" class="i-folder-back"/><rect x="2" y="9" width="20" height="11" rx="2" class="i-folder"/></svg>';

  let run = load();
  let folder = run.phase === 'hold' ? 'hand' : 'deck';
  let selected = new Set();
  let clipboard = null; // card id copied with Ctrl+C
  let betValue = null;
  let screen = 'account'; // phones show one window at a time
  let modalOpen = false;
  let fresh = new Set(); // ids drawn in the last draw, highlighted once

  // -------------------------------------------------------------------------
  // Saving

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved && Array.isArray(saved.deck) && saved.bought) return saved;
    } catch {
      // storage unavailable or corrupt — new run
    }
    return E.newRun();
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(run));
    } catch {
      // storage unavailable — the run lasts for this page only
    }
  }

  // -------------------------------------------------------------------------
  // Card files

  // The OS's usual name for a copy: "king-clubs - Copy", "king-clubs copy 2", "king-clubs (2)".
  function fileName(card) {
    const base = E.cardSlug(card);
    const n = card.copy;
    if (!n) return `${base}.card`;
    const copy = KG.pick({
      value: n === 1 ? ' - Copy' : ` - Copy (${n})`,
      quality: n === 1 ? ' copy' : ` copy ${n}`,
      power: ` (${n + 1})`,
    });
    return `${base}${copy}.card`;
  }

  function byRank(a, b) {
    return b.rank - a.rank || a.copy - b.copy;
  }

  function isSelected(id) {
    return folder === 'hand' && run.phase === 'hold' ? run.round.trashed.includes(id) : selected.has(id);
  }

  function cardTile(card, { extra = '' } = {}) {
    const on = isSelected(card.id);
    const cls = ['file', 'card-file'];
    if (on) cls.push('selected');
    if (fresh.has(card.id)) cls.push('fresh');
    if (extra) cls.push(extra);
    return `<div class="${cls.join(' ')}" data-card="${card.id}" tabindex="0" role="option" aria-selected="${on}">
      <span class="card-icon suit-${card.suit}">${E.cardLabel(card)}</span>
      <span class="file-label">${esc(fileName(card))}</span>
    </div>`;
  }

  function folderTile(id, name, count) {
    return `<div class="file folder-file" data-open="${id}" tabindex="0" role="option">
      <span class="folder-icon">${FOLDER_ICON}</span>
      <span class="file-label">${esc(name)}</span>
      <span class="file-sub">${count} ${count === 1 ? 'item' : 'items'}</span>
    </div>`;
  }

  // -------------------------------------------------------------------------
  // Folders

  function folderName(id) {
    if (id === 'root') return 'Cards';
    if (id === 'deck') return 'Deck';
    return 'Hand';
  }

  function parentOf(id) {
    if (id === 'root') return null;
    return 'root';
  }

  function handCards() {
    const cards =
      run.phase === 'hold'
        ? run.round.cards.map((id) => E.cardById(run, id))
        : run.last
          ? run.last.cards
          : [];
    return [...cards].sort(E.byStrength);
  }

  // Deck is one folder, sorted by suit and then rank so each suit stays together.
  function deckCards() {
    return [...run.deck].sort((a, b) => E.SUITS.indexOf(a.suit) - E.SUITS.indexOf(b.suit) || byRank(a, b));
  }

  function counts() {
    return {
      root: 2,
      deck: run.deck.length,
      hand: handCards().length,
    };
  }

  function open(id) {
    if (id === folder) return;
    folder = id;
    selected.clear();
    fresh.clear();
    render();
  }

  // -------------------------------------------------------------------------
  // Rendering: Cards window

  function renderCards() {
    const n = counts();
    const sep = KG.pick({ value: '›', quality: '›', power: '/' });
    $('cards-title').textContent = folderName(folder);
    $('up').disabled = folder === 'root';

    const trail = [];
    for (let f = folder; f; f = parentOf(f)) trail.unshift(f);
    $('crumbs').innerHTML = trail
      .map((f, i) => (i === trail.length - 1 ? `<span>${folderName(f)}</span>` : `<a href="#" data-open="${f}">${folderName(f)}</a>`))
      .join(`<span class="sep">${sep}</span>`);

    const side = (id, icon, cls = '') =>
      `<a href="#" data-open="${id}" class="${cls}"${folder === id ? ' aria-current="true"' : ''}>${icon}<span>${folderName(id)}</span><em>${n[id]}</em></a>`;
    $('side').innerHTML =
      '<h2>Cards</h2>' +
      side('deck', FOLDER_ICON) +
      side('hand', FOLDER_ICON);

    let tiles;
    if (folder === 'root') tiles = ['deck', 'hand'].map((f) => folderTile(f, folderName(f), n[f]));
    else if (folder === 'deck') tiles = deckCards().map((c) => cardTile(c));
    else if (folder === 'hand') tiles = handCards().map((c) => cardTile(c, { extra: run.phase === 'hold' ? '' : 'done' }));

    const empty = {
      hand: 'No hand dealt yet.',
    };
    $('view').innerHTML = tiles.length ? tiles.join('') : `<p class="empty">${empty[folder] || 'This folder is empty.'}</p>`;
    $('view').setAttribute('role', 'listbox');
    $('view').setAttribute('aria-multiselectable', String(folder === 'hand'));
    $('view').dataset.folder = folder;
    fresh.clear(); // new cards animate once, not on every re-render

    renderBanner();
    renderToolbar();

    const p = E.prices(run);
    const count = run.phase === 'hold' && folder === 'hand' ? run.round.trashed.length : selected.size;
    const sel = count ? ` · ${count} selected` : '';
    $('status').textContent = `${run.deck.length} cards in deck · Delete ${money(p.remove)} · Duplicate ${money(p.duplicate)} · Change suit ${money(p.suit)} · Payout ${money(p.payout)}${sel}`;
  }

  function renderBanner() {
    const b = $('banner');
    let html = '';
    let tone = '';
    if (run.phase === 'hold') {
      const max = E.maxDiscards(run);
      const used = run.round.trashed.length;
      html =
        max === 0
          ? 'Your deck has only 5 cards, so no card can be replaced. Press <b>Keep hand</b> to score this hand.'
          : `Select the cards you want to replace, then press <b>Draw</b>, or press <b>Keep hand</b> to keep all five. Unselected cards are held. <span class="muted">Replacing ${used} of up to ${Math.min(max, 5)}</span>`;
    } else if (run.phase === 'bet' && folder === 'hand' && run.last) {
      html = resultLine(run.last);
      tone = run.last.net > 0 ? 'good' : run.last.net < 0 ? 'bad' : '';
      if (KG.os() === 'phone') html += ' <button class="kg-btn mini" type="button" data-screen="account">Next hand</button>';
    } else if (run.phase === 'bet') {
      html = 'Shop is open: select a card in Deck, then Delete card, Duplicate card or Change suit. Increase Hand Payout needs no card.';
    } else {
      html = run.phase === 'won' ? 'Run won.' : 'Run over.';
    }
    b.className = `banner ${tone}`;
    b.innerHTML = html;
  }

  function resultLine(r) {
    const verdicts = {
      beat: ` · <b>Beat the boss</b> (${r.target}x needed)`,
      lose: ` · Fell short of the boss (${r.target}x needed)`,
    };
    const verdict = r.outcome ? verdicts[r.outcome] : '';
    return `<b>${esc(r.handName)}</b> · ${mult(r.mult)} on ${money(r.bet)} · <b>${signed(r.net)}</b>${verdict}`;
  }

  const DRAW_ICON = '<path d="M16 10a6 6 0 1 1-1.8-4.3M16 3v4h-4"/>';
  const EDIT_ICON = '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H8l1.5 1.5h6A1.5 1.5 0 0 1 17 8v6.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5z"/>';

  function renderToolbar() {
    // Draw while a hand is in play; once it's paid out the same button opens
    // the Deck folder so you can shop before the next deal.
    const hold = run.phase === 'hold';
    const edit = run.phase === 'bet';
    const n = hold ? run.round.trashed.length : 0;
    const draw = $('tool-draw');
    draw.hidden = folder === 'deck' && !hold;
    draw.disabled = !hold && !edit;
    draw.title = edit ? 'Open the Deck folder' : 'Draw (F5)';
    draw.querySelector('svg').innerHTML = edit ? EDIT_ICON : DRAW_ICON;
    draw.querySelector('span').textContent = edit ? 'Edit deck' : n ? `Draw ${n}` : hold ? 'Keep hand' : 'Draw';

    // Shop buttons: always show the price. They light up once a card is
    // selected and you can pay for it and still cover the next minimum bet.
    // A purchase that would end the run stays clickable (it asks first) but
    // isn't highlighted.
    const p = E.prices(run);
    const card = folder === 'deck' && selected.size === 1 ? [...selected][0] : null;
    const phone = KG.os() === 'phone';
    const labels = {
      duplicate: phone ? 'Copy' : 'Duplicate card',
      suit: phone ? 'Suit' : 'Change suit',
      remove: phone ? 'Delete' : 'Delete card',
      payout: phone ? 'Payout' : 'Increase Hand Payout',
    };
    for (const action of ['remove', 'duplicate', 'suit', 'payout']) {
      const btn = $(`tool-${action}`);
      const block = E.shopBlock(run, action);
      const needsCard = action !== 'payout';
      btn.hidden = folder !== 'deck';
      btn.disabled = (needsCard && !card) || !!block;
      const strands = !btn.disabled && E.strands(run, action);
      btn.classList.toggle('primary', !btn.disabled && !strands);
      btn.querySelector('span').innerHTML = `${labels[action]} <b>${money(p[action])}</b>`;
      btn.title = block || (needsCard && !card ? 'Select a card first' : strands ? "You couldn't cover the next minimum bet after this" : '');
    }
  }

  // -------------------------------------------------------------------------
  // Rendering: Account window

  function clampBet(range) {
    if (range.fixed) return range.min;
    const want = betValue ?? run.lastBet ?? range.min;
    return Math.min(Math.max(want, range.min), range.max);
  }

  function renderAccount() {
    $('account-title').textContent = KG.pick({ value: 'Account Properties', quality: 'Account', power: 'Account' });
    $('bankroll').textContent = money(run.bankroll);
    const gate = E.isGateHand(run.hand);
    $('stage').innerHTML = `Level ${run.level} of ${E.LEVELS} · Hand ${run.hand} of ${E.HANDS_PER_LEVEL}${gate ? ' · <b class="gate-tag">Boss</b>' : ''}`;
    $('boss').innerHTML = `Win <b>${E.bossTarget(run.level)}x</b> or more${gate ? ' <span class="gate-tag">this hand</span>' : ` <span class="muted">on hand ${E.HANDS_PER_LEVEL}</span>`}`;
    // One box per hand in this level; the last is the boss, labeled with its target.
    $('pips').innerHTML = Array.from({ length: E.HANDS_PER_LEVEL }, (_, i) => {
      const h = i + 1;
      const boss = E.isGateHand(h);
      const state = h < run.hand || run.phase === 'won' ? 'done' : h === run.hand ? 'now' : '';
      const title = boss ? `Boss: win ${E.bossTarget(run.level)}x or more` : `Hand ${h}`;
      return `<span class="pip ${state}${boss ? ' boss' : ''}" title="${title}">${boss ? `${E.bossTarget(run.level)}x` : h}</span>`;
    }).join('');

    renderBet();
    renderLast();
    renderPaytable();
    renderLog();
  }

  function renderBet() {
    const range = E.betRange(run);
    const playing = run.phase === 'bet';
    const gate = E.isGateHand(run.hand);

    $('range').innerHTML = playing || run.phase === 'hold'
      ? `Min <b>${money(range.min)}</b> · Max <b>${money(range.max)}</b>`
      : '';

    if (playing) betValue = clampBet(range);
    const input = $('bet');
    input.value = run.phase === 'hold' ? run.round.bet : betValue ?? '';
    input.min = range.min;
    input.max = range.max;
    const lock = !playing || range.fixed;
    for (const id of ['bet', 'bet-down', 'bet-up', 'bet-min', 'bet-max']) $(id).disabled = lock;
    $('deal').disabled = !playing;
    $('deal').textContent = run.phase === 'hold' ? 'Hand in play' : 'Deal';

    let note = '';
    if (run.phase === 'hold') {
      note = 'Select the cards to replace in the Cards window, then press Draw.';
      if (KG.os() === 'phone') note += ' <button class="kg-btn mini" type="button" data-screen="cards">Go to cards</button>';
    } else if (run.phase === 'won') note = `<b>You beat level ${E.LEVELS}'s boss.</b> Run won with ${money(run.bankroll)}.`;
    else if (run.phase === 'lost') note = run.lostTo ? `<b>Run over.</b> Your hand paid less than the boss's ${run.lostTo}x.` : `<b>Run over.</b> You can't cover the ${money(range.min)} minimum bet.`;
    else if (gate) {
      note = `Boss hand: make a hand that pays <b>${E.bossTarget(run.level)}x</b> or more to win and move on. Anything less ends the run. Hands that clear it are green in the paytable.`;
      if (range.fixed) note += ` The bet is fixed at ${money(range.min)}.`;
    } else {
      const left = E.HANDS_PER_LEVEL - run.hand;
      note = `${left} more ${left === 1 ? 'hand' : 'hands'}, then the boss.`;
    }
    $('bet-note').innerHTML = note;
    $('new-run').classList.toggle('kg-primary', run.phase === 'won' || run.phase === 'lost');
  }

  function renderLast() {
    const r = run.last;
    $('last-box').hidden = !r;
    if (!r) return;
    $('last').innerHTML = `<div class="last-cards">${[...r.cards].sort(E.byStrength).map((c) => `<span class="mini-card suit-${c.suit}${r.drawn.includes(c.id) ? ' drawn' : ''}">${E.cardLabel(c)}</span>`).join('')}</div>
      <div class="last-result ${r.net > 0 ? 'good' : r.net < 0 ? 'bad' : ''}">${resultLine(r)}</div>`;
  }

  function renderPaytable() {
    const lastId = run.last?.handId;
    const target = run.phase === 'won' ? Infinity : E.bossTarget(run.level);
    const rows = [...E.HANDS, E.NOTHING].map((h) => {
      const m = E.multiple(run, h.id);
      const ups = run.upgrades?.[h.id] || 0;
      const cls = m < 0 ? 'neg' : m >= target ? 'pass' : '';
      const tag = ups ? ` <span class="ups" title="Doubled ${ups} ${ups === 1 ? 'time' : 'times'}">×${2 ** ups}</span>` : '';
      return `<tr class="${h.id === lastId ? 'last' : ''}"><th scope="row">${h.name}${tag}</th><td class="${cls}">${mult(m)}</td></tr>`;
    });
    $('paytable').innerHTML = `<thead><tr><th>Hand</th><th>Pays</th></tr></thead><tbody>${rows.join('')}</tbody>`;
  }

  function renderLog() {
    $('log').innerHTML = run.log.length
      ? run.log
          .slice(0, 12)
          .map(
            (r) => `<li class="${r.net > 0 ? 'good' : r.net < 0 ? 'bad' : ''}">
              <span class="log-where">L${r.level}·${r.gate ? 'Boss' : `H${r.hand}`}</span>
              <span class="log-hand">${esc(r.handName)}</span>
              <span class="log-bet">${money(r.bet)}</span>
              <span class="log-net">${signed(r.net)}</span>
            </li>`,
          )
          .join('')
      : '<li class="muted">No hands yet.</li>';
  }

  function renderScreens() {
    const phone = KG.os() === 'phone';
    document.body.classList.toggle('one-screen', phone);
    $('account').classList.toggle('on-screen', !phone || screen === 'account');
    $('cards').classList.toggle('on-screen', !phone || screen === 'cards');
    for (const b of document.querySelectorAll('.screen-tabs [data-screen]')) b.setAttribute('aria-selected', String(b.dataset.screen === screen));
  }

  function render() {
    renderAccount();
    renderCards();
    renderScreens();
    save();
  }

  // -------------------------------------------------------------------------
  // Actions

  function showScreen(s) {
    screen = s;
    renderScreens();
  }

  function dealHand() {
    if (run.phase !== 'bet') return;
    const range = E.betRange(run);
    const bet = range.fixed ? range.min : Math.round(Number($('bet').value));
    if (!(bet >= range.min && bet <= range.max)) {
      flashNote(`Bet must be ${money(range.min)}–${money(range.max)}.`);
      return;
    }
    betValue = bet;
    E.deal(run, bet);
    fresh = new Set(run.round.cards);
    folder = 'hand';
    selected.clear();
    if (KG.os() === 'phone') screen = 'cards';
    render();
    focusWindow($('cards'));
  }

  function flashNote(text) {
    $('bet-note').innerHTML = `<span class="warn">${esc(text)}</span>`;
  }

  // During a hand, selecting a card in Hand marks it to be replaced on Draw.
  // The marks live in the run (round.trashed), so they survive a reload.
  function toggleReplace(id) {
    if (run.round.trashed.includes(id)) E.restore(run, [id]);
    else if (!E.trash(run, [id]).length) {
      const max = E.maxDiscards(run);
      const b = $('banner');
      b.className = 'banner bad';
      b.innerHTML = `You can replace at most ${max} ${max === 1 ? 'card' : 'cards'}, so the hand can always be refilled from your deck.`;
      return;
    }
    render();
  }

  function drawHand() {
    if (run.phase !== 'hold') return;
    const result = E.draw(run);
    fresh = new Set(result.drawn);
    folder = 'hand';
    selected.clear();
    betValue = null;
    render();
    if (run.phase === 'won') endDialog(true);
    else if (run.phase === 'lost') endDialog(false);
  }

  // `target` is a card id, or a hand id for 'payout' (Increase Hand Payout).
  async function purchase(action, target, suit) {
    const block = E.shopBlock(run, action);
    if (block) return;
    const cost = E.prices(run)[action];
    if (E.strands(run, action)) {
      const after = run.bankroll - cost;
      const ok = await ask({
        title: 'Not enough left to bet',
        body: `This costs ${money(cost)} and leaves you ${money(after)}, below the ${money(E.betRange(run, after).min)} minimum bet for the next hand. The run will end.`,
        ok: { remove: 'Delete anyway', duplicate: 'Duplicate anyway', suit: 'Change anyway', payout: 'Increase anyway' }[action],
        danger: true,
      });
      if (!ok) return;
    }
    const { added } = E.buy(run, action, target, suit);
    if (action !== 'payout') {
      const keep = added ? added.id : action === 'suit' ? target : null;
      selected = new Set(keep ? [keep] : []);
      fresh = new Set(keep ? [keep] : []);
    }
    render();
    if (run.phase === 'lost') endDialog(false);
  }

  async function confirmRemove(cardId) {
    if (E.shopBlock(run, 'remove')) return;
    const card = E.cardById(run, cardId);
    const ok = await ask({
      title: 'Delete file',
      body: `Permanently delete <b>${esc(fileName(card))}</b> for ${money(E.prices(run).remove)}? It can't be restored.`,
      ok: 'Delete permanently',
      danger: true,
    });
    if (ok) purchase('remove', cardId);
  }

  async function newRun() {
    if (run.phase === 'bet' || run.phase === 'hold') {
      if (run.handsPlayed > 0 || run.phase === 'hold') {
        const ok = await ask({ title: 'Start a new run?', body: 'Your current run will be lost.', ok: 'New run', danger: true });
        if (!ok) return;
      }
    }
    run = E.newRun();
    folder = 'deck';
    selected.clear();
    fresh.clear();
    betValue = null;
    screen = 'account';
    render();
  }

  async function endDialog(won) {
    const ok = await ask({
      title: won ? 'Run won' : 'Run over',
      body: won
        ? `You beat all ${E.LEVELS} bosses and finished with <b>${money(run.bankroll)}</b> in ${run.handsPlayed} hands.`
        : run.lostTo
          ? `Your ${esc(run.last.handName.toLowerCase())} paid ${mult(run.last.mult)}, short of level ${run.level}'s boss target of <b>${run.lostTo}x</b>.`
          : `You have ${money(run.bankroll)}, below the ${money(E.betRange(run).min)} minimum bet. You reached level ${run.level}.`,
      ok: 'New run',
      cancel: 'Close',
    });
    if (ok) {
      run = E.newRun();
      folder = 'deck';
      selected.clear();
      fresh.clear();
      betValue = null;
      screen = 'account';
      render();
    }
  }

  // -------------------------------------------------------------------------
  // Dialog (an in-page window; browser dialogs are avoided)

  function ask({ title, body, ok = 'OK', cancel = 'Cancel', danger = false }) {
    return new Promise((resolve) => {
      modalOpen = true;
      hideMenu();
      const wrap = document.createElement('div');
      wrap.className = 'kg-modal cad-modal';
      wrap.innerHTML = `<div class="window kg-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cad-dlg-title">
        <div class="titlebar">
          <div class="lights"><span class="close" data-answer="no"></span><span class="min"></span><span class="max"></span></div>
          <div class="window-title" id="cad-dlg-title">${esc(title)}</div>
        </div>
        <div class="dlg-body">${body}</div>
        <div class="dlg-foot">
          <button class="kg-btn" type="button" data-answer="no">${esc(cancel)}</button>
          <button class="kg-btn kg-primary${danger ? ' danger' : ''}" type="button" data-answer="yes">${esc(ok)}</button>
        </div>
      </div>`;
      const done = (answer) => {
        wrap.remove();
        document.removeEventListener('keydown', onKey, true);
        modalOpen = false;
        resolve(answer);
      };
      const onKey = (e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          done(false);
        }
      };
      wrap.addEventListener('click', (e) => {
        const a = e.target.closest('[data-answer]');
        if (a) done(a.dataset.answer === 'yes');
        else if (e.target === wrap) done(false);
      });
      document.addEventListener('keydown', onKey, true);
      document.body.append(wrap);
      wrap.querySelector('[data-answer="yes"]').focus();
    });
  }

  // -------------------------------------------------------------------------
  // Context menu (right-click, or long-press on touch)

  function showMenu(x, y, items, hint) {
    const menu = $('ctx');
    menu.innerHTML =
      items
        .map((it, i) =>
          it === '-'
            ? '<hr>'
            : `<button type="button" role="menuitem" data-i="${i}"${it.disabled ? ' disabled' : ''}${it.danger ? ' class="danger"' : ''}><span>${esc(it.label)}</span>${it.key ? `<kbd>${esc(it.key)}</kbd>` : ''}</button>`,
        )
        .join('') + (hint ? `<p class="ctx-hint">${esc(hint)}</p>` : '');
    menu.hidden = false;
    menu.onclick = (e) => {
      const b = e.target.closest('button[data-i]');
      if (!b || b.disabled) return;
      hideMenu();
      items[b.dataset.i].run();
    };
    const r = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(4, Math.min(x, innerWidth - r.width - 4))}px`;
    menu.style.top = `${Math.max(4, Math.min(y, innerHeight - r.height - 4))}px`;
    menu.querySelector('button:not([disabled])')?.focus();
  }

  function hideMenu() {
    $('ctx').hidden = true;
  }

  const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

  function menuFor(cardId, x, y) {
    if (folder !== 'deck') return;
    if (!selected.has(cardId)) {
      selected = new Set([cardId]);
      renderCards();
    }
    if (folder === 'deck') {
      const p = E.prices(run);
      const dupBlock = E.shopBlock(run, 'duplicate');
      const remBlock = E.shopBlock(run, 'remove');
      showMenu(
        x,
        y,
        [
          { label: `Duplicate — ${money(p.duplicate)}`, key: `${mod}C, ${mod}V`, disabled: !!dupBlock, run: () => purchase('duplicate', cardId) },
          '-',
          ...suitItems(cardId, 'Change to '),
          '-',
          { label: `Delete permanently — ${money(p.remove)}`, key: KG.os() === 'quality' ? '⌥⌘⌫' : 'Shift+Del', disabled: !!remBlock, danger: true, run: () => purchase('remove', cardId) },
        ],
        dupBlock || remBlock,
      );
    }
  }

  // One menu item per suit the card isn't already, priced as Change suit.
  function suitItems(cardId, prefix = '') {
    const card = E.cardById(run, cardId);
    const cost = money(E.prices(run).suit);
    const block = E.shopBlock(run, 'suit');
    return E.SUITS.filter((s) => s !== card.suit).map((s) => ({
      label: `${prefix}${E.SUIT_NAMES[s]} (${E.rankLabel(card.rank)}${s})`,
      disabled: !!block,
      run: () => purchase('suit', cardId, s),
    }));
  }

  // -------------------------------------------------------------------------
  // Input: Cards window

  const view = $('view');
  let suppressClick = false;

  view.addEventListener('click', (e) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const opener = e.target.closest('[data-open]');
    if (opener) {
      // folders open on double-click on desktop, a tap on phones
      if (KG.os() === 'phone' || e.detail >= 2) open(opener.dataset.open);
      return;
    }
    const tile = e.target.closest('[data-card]');
    if (!tile) {
      selected.clear();
      renderCards();
      return;
    }
    const id = Number(tile.dataset.card);
    if (folder === 'hand') {
      // In Hand a click toggles whether the card gets replaced.
      if (run.phase === 'hold') toggleReplace(id);
      return;
    } else {
      // Deck selects one card at a time; a second click unselects it.
      selected = selected.has(id) ? new Set() : new Set([id]);
    }
    renderCards();
    view.querySelector(`[data-card="${id}"]`)?.focus();
  });

  view.addEventListener('keydown', (e) => {
    const tile = e.target.closest('[data-open], [data-card]');
    if (!tile || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    if (tile.dataset.open) open(tile.dataset.open);
    else tile.click();
  });

  view.addEventListener('contextmenu', (e) => {
    const tile = e.target.closest('[data-card]');
    e.preventDefault();
    if (tile) menuFor(Number(tile.dataset.card), e.clientX, e.clientY);
  });

  // Long-press opens the same menu on touch screens.
  let press = null;
  view.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const tile = e.target.closest('[data-card]');
    if (!tile) return;
    const start = { x: e.clientX, y: e.clientY };
    press = {
      start,
      timer: setTimeout(() => {
        suppressClick = true;
        press = null;
        menuFor(Number(tile.dataset.card), start.x, start.y);
      }, LONG_PRESS_MS),
    };
  });
  const cancelPress = (e) => {
    if (!press) return;
    if (e.type === 'pointermove' && Math.hypot(e.clientX - press.start.x, e.clientY - press.start.y) < 10) return;
    clearTimeout(press.timer);
    press = null;
  };
  for (const t of ['pointermove', 'pointerup', 'pointercancel']) view.addEventListener(t, cancelPress);

  // Sidebar and breadcrumbs navigate.
  for (const nav of [$('side'), $('crumbs')]) {
    nav.addEventListener('click', (e) => {
      const a = e.target.closest('[data-open]');
      if (!a) return;
      e.preventDefault();
      open(a.dataset.open);
    });
  }

  $('up').addEventListener('click', () => parentOf(folder) && open(parentOf(folder)));
  $('tool-draw').addEventListener('click', () => (run.phase === 'bet' ? open('deck') : drawHand()));
  for (const action of ['duplicate', 'remove']) {
    $(`tool-${action}`).addEventListener('click', () => selected.size === 1 && purchase(action, [...selected][0]));
  }
  $('tool-suit').addEventListener('click', (e) => {
    if (selected.size !== 1) return;
    e.stopPropagation(); // the document click handler would close the menu at once
    const r = $('tool-suit').getBoundingClientRect();
    showMenu(r.left, r.bottom + 4, suitItems([...selected][0], 'To '));
  });
  $('tool-payout').addEventListener('click', (e) => {
    e.stopPropagation();
    const r = $('tool-payout').getBoundingClientRect();
    showMenu(
      Math.min(r.left, innerWidth),
      r.bottom + 4,
      E.HANDS.map((h) => ({
        label: `${h.name}: ${mult(E.multiple(run, h.id))} → ${mult(E.multiple(run, h.id) * 2)}`,
        run: () => purchase('payout', h.id),
      })),
    );
  });

  // -------------------------------------------------------------------------
  // Input: Account window

  function nudgeBet(delta) {
    const range = E.betRange(run);
    betValue = Math.min(Math.max((Number($('bet').value) || range.min) + delta, range.min), range.max);
    renderBet();
  }

  $('bet-down').addEventListener('click', () => nudgeBet(-1));
  $('bet-up').addEventListener('click', () => nudgeBet(1));
  $('bet-min').addEventListener('click', () => nudgeBet(-Infinity));
  $('bet-max').addEventListener('click', () => nudgeBet(Infinity));
  $('bet').addEventListener('change', () => nudgeBet(0));
  $('bet').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    dealHand();
  });
  $('deal').addEventListener('click', dealHand);
  $('new-run').addEventListener('click', newRun);

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#ctx')) hideMenu();
    const s = e.target.closest('[data-screen]');
    if (s) showScreen(s.dataset.screen);
  });

  // -------------------------------------------------------------------------
  // Keyboard

  document.addEventListener('keydown', (e) => {
    if (modalOpen) return;
    if (e.key === 'Escape') return hideMenu();
    const typing = e.target.closest('input, textarea');
    const cmd = e.ctrlKey || e.metaKey;

    // F5 / Ctrl+R is Refresh, which is Draw while a hand is in play.
    if ((e.key === 'F5' || (cmd && e.key.toLowerCase() === 'r')) && run.phase === 'hold') {
      e.preventDefault();
      drawHand();
      return;
    }
    if (typing) return;
    const inCards = e.target.closest('#cards') || e.target === document.body;
    if (!inCards) return;

    const ids = [...selected];
    const permanent = e.shiftKey || (e.metaKey && e.altKey);
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (folder === 'deck' && ids.length === 1) {
        if (permanent) purchase('remove', ids[0]);
        else confirmRemove(ids[0]);
      }
    } else if (cmd && e.key.toLowerCase() === 'c' && folder === 'deck' && ids.length === 1) {
      clipboard = ids[0];
    } else if (cmd && e.key.toLowerCase() === 'v' && folder === 'deck' && clipboard && E.cardById(run, clipboard)) {
      e.preventDefault();
      purchase('duplicate', clipboard);
    } else if (cmd && e.key.toLowerCase() === 'a' && folder === 'hand' && run.phase === 'hold') {
      e.preventDefault();
      E.trash(run, handCards().map((c) => c.id));
      render();
    } else if (e.key === 'Enter' && run.phase === 'hold' && folder === 'hand' && e.target === document.body) {
      drawHand();
    }
  });

  // -------------------------------------------------------------------------
  // Windows

  let topZ = 20;
  function focusWindow(win) {
    win.style.zIndex = ++topZ;
    for (const w of document.querySelectorAll('.window[data-app]:not(.kg-dialog)')) w.classList.toggle('focused', w === win);
  }

  for (const win of [$('account'), $('cards')]) win.addEventListener('pointerdown', () => focusWindow(win), true);

  KG.makeWindow($('account'), {
    minW: 300,
    minH: 320,
    storageKey: 'ctrl-alt-deal-account',
    rect: (a) => {
      const w = Math.min(380, Math.max(300, a.w * 0.34));
      return { x: a.x + 16, y: a.y + 16, w, h: Math.min(720, a.h - 32) };
    },
  });
  KG.makeWindow($('cards'), {
    minW: 380,
    minH: 300,
    storageKey: 'ctrl-alt-deal-cards',
    rect: (a) => {
      const left = a.x + 16 + Math.min(380, Math.max(300, a.w * 0.34)) + 16;
      const w = Math.max(380, Math.min(780, a.x + a.w - left - 16));
      return { x: left, y: a.y + 40, w, h: Math.min(560, a.h - 72) };
    },
  });
  focusWindow($('cards'));

  KG.onChange(render);
  render();
})();
