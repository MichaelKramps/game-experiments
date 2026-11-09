// Ctrl+Alt+Deal UI: two windows on the site shell (../os/os.js).
//   Account — bankroll, what the boss needs, progress, the paytable.
//   Cards   — a file browser where every card is a file: Deck and Hand.
//             Deal sits at the left of its toolbar. Select cards in Hand,
//             then Draw (Refresh) replaces them. Between hands, selecting a
//             card in Deck opens its shop menu; the toolbar has the rest.
// New run opens a setup dialog (starting deck, hand size, difficulty and the
// unlockable toggles); achievements unlock those options for later runs.
// Rules live in engine.js. The run is saved to localStorage after every move,
// and earned achievements and the last setup in a separate profile.

(() => {
  const SAVE_KEY = 'ctrl-alt-deal-run';
  const PROFILE_KEY = 'ctrl-alt-deal-profile';
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
  const pays = (m) => money(m * E.PAYOUT_UNIT); // a payout multiple in dollars

  const pct = (p) => (!p ? '0%' : p < 0.001 ? '<0.1%' : `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`);

  // The setup dialog's toggles, in groups. Each is a key of E.DEFAULT_SETTINGS.
  const TOGGLES = [
    {
      group: 'Game mechanics',
      items: [
        { key: 'extraDraw', name: 'Extra draw', desc: 'A second draw each hand.' },
        { key: 'noDraw', name: 'No draw', desc: 'The dealt hand is final.' },
        { key: 'skipStraights', name: 'Straights may skip a rank', desc: 'Each step may jump one rank, like 2-4-6-7-9.' },
        { key: 'interest', name: 'Interest', desc: 'Earn 10% of your bankroll after each hand.' },
        { key: 'freeDuplicate', name: 'Free Duplicate', desc: 'Duplicate costs nothing, but also adds a random card.' },
      ],
    },
    {
      group: 'Shop tools',
      items: [
        { key: 'rankUp', name: 'Increase rank', desc: 'Raise a card one rank; an ace becomes a 2.' },
        { key: 'rankDown', name: 'Decrease rank', desc: 'Lower a card one rank; a 2 becomes an ace.' },
        { key: 'split', name: 'Split card', desc: 'A card becomes its two neighbouring ranks, same suit.' },
        { key: 'bonus', name: 'Add 2x to card', desc: 'Any hand with that card in it pays double.' },
        { key: 'doubleBet', name: 'Double payout', desc: 'Boss hands pay double.' },
      ],
    },
    {
      group: 'Information',
      items: [
        { key: 'deckInfo', name: 'Deck properties', desc: 'Card counts by rank and suit.' },
        { key: 'deckOdds', name: 'Deck odds', desc: 'The chance a fresh deal contains each hand.' },
        { key: 'drawOdds', name: 'Draw odds', desc: 'During a hand, the chance of drawing each rank and suit.' },
        { key: 'payoutInfo', name: 'Payout increase', desc: 'How much more each payout upgrade pays.' },
      ],
    },
    {
      group: 'Display',
      items: [{ key: 'noColor', name: 'No color', desc: 'All text is black (white in dark mode).' }],
    },
  ];
  const TOGGLE_BY_KEY = Object.fromEntries(TOGGLES.flatMap((g) => g.items).map((t) => [t.key, t]));

  // The name of what an achievement unlocks: "Numbers deck", "6-card hands", "Easy mode", "Interest".
  function unlockName([key, value]) {
    if (key === 'deck') return E.DECKS.find((d) => d.id === value).name;
    if (key === 'handSize') return `${value}-card hands`;
    if (key === 'difficulty') return `${E.DIFFICULTIES.find((d) => d.id === value).name} mode`;
    return TOGGLE_BY_KEY[key].name;
  }

  const FOLDER_ICON ='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v1H2z" class="i-folder-back"/><rect x="2" y="9" width="20" height="11" rx="2" class="i-folder"/></svg>';

  let profile = loadProfile(); // { earned: [achievement ids], setup: last settings chosen }
  let run = load();
  let folder = run.phase === 'hold' ? 'hand' : 'deck';
  let selected = new Set();
  // Whether the Deck folder has been opened since the last hand paid out: until
  // it has, Edit deck is green and Deal is plain.
  let deckVisited = folder === 'deck';
  let clipboard = null; // card id copied with Ctrl+C
  let screen = 'account'; // phones show one window at a time
  let modalOpen = false;
  let payoutMenuOpen = false;
  let fresh = new Set(); // ids drawn in the last draw, highlighted once
  let helpHidden = false; // the banner's how-to text, dismissed until the page reloads

  const HOW_TO_KEY = 'ctrl-alt-deal-how-to-seen'; // the how-to note opens by itself only on a first visit

  // -------------------------------------------------------------------------
  // Saving

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      // Runs saved under other rules (an older version) are dropped.
      if (saved && Array.isArray(saved.deck) && saved.bought && saved.version === E.RUN_VERSION) {
        E.checkAchievements(saved); // runs saved before achievements existed
        return saved;
      }
    } catch {
      // storage unavailable or corrupt — new run
    }
    return E.newRun(setupSettings());
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(run));
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // storage unavailable — the run lasts for this page only
    }
  }

  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
      if (saved && Array.isArray(saved.earned)) return { earned: saved.earned, setup: saved.setup || {} };
    } catch {
      // storage unavailable or corrupt — nothing earned yet
    }
    return { earned: [], setup: {} };
  }

  // Moves achievements the run has earned into the profile, and announces
  // the ones earned for the first time. They're remembered on the run too,
  // so the end-of-run dialog can say which were new.
  function syncAchievements() {
    for (const id of run.achieved || []) {
      if (profile.earned.includes(id)) continue;
      profile.earned.push(id);
      run.newAchievements = [...(run.newAchievements || []), id];
      toast(E.ACHIEVEMENTS.find((a) => a.id === id));
    }
  }

  function toast(a) {
    let box = $('cad-toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'cad-toasts';
      box.className = 'cad-toasts';
      box.setAttribute('aria-live', 'polite');
      document.body.append(box);
    }
    const t = document.createElement('div');
    t.className = 'cad-toast';
    t.innerHTML = `<b>Achievement: ${esc(a.name)}</b><span>Unlocked: ${esc(unlockName(a.unlock))}</span>`;
    box.append(t);
    setTimeout(() => t.remove(), 6000);
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
    const notes = [card.bonus && '2x: any hand with this card pays double', card.boss && 'Added by a boss'].filter(Boolean).join(' · ');
    return `<div class="${cls.join(' ')}" data-card="${card.id}" tabindex="0" role="option" aria-selected="${on}"${notes ? ` title="${notes}"` : ''}>
      <span class="card-icon suit-${card.suit}">${E.cardLabel(card)}${card.bonus ? '<span class="card-bonus">2x</span>' : ''}</span>
      <span class="file-label">${esc(fileName(card))}</span>
    </div>`;
  }

  // -------------------------------------------------------------------------
  // Folders

  function folderName(id) {
    if (id === 'deck') return 'Deck';
    return 'Hand';
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
      deck: run.deck.length,
      hand: handCards().length,
    };
  }

  function open(id) {
    if (id === folder) return;
    folder = id;
    if (id === 'deck') deckVisited = true;
    selected.clear();
    fresh.clear();
    render();
  }

  // -------------------------------------------------------------------------
  // Rendering: Cards window

  function renderCards() {
    const n = counts();
    $('cards-title').textContent = folderName(folder);

    const side = (id, icon, cls = '') =>
      `<a href="#" data-open="${id}" class="${cls}"${folder === id ? ' aria-current="true"' : ''}>${icon}<span>${folderName(id)}</span><em>${n[id]}</em></a>`;
    $('side').innerHTML =
      '<h2>Cards</h2>' +
      side('deck', FOLDER_ICON) +
      side('hand', FOLDER_ICON);

    let tiles;
    if (folder === 'deck') tiles = deckCards().map((c) => cardTile(c));
    else if (folder === 'hand') {
      // After a bigger hand is scored, the cards outside its best 5 are dimmed.
      const scored = run.phase !== 'hold' && run.last?.scored;
      const extra = (c) => (run.phase === 'hold' ? '' : scored && !scored.includes(c.id) ? 'done unscored' : 'done');
      tiles = handCards().map((c) => cardTile(c, { extra: extra(c) }));
    }

    const empty = {
      hand: 'No hand dealt yet.',
    };
    $('view').innerHTML = tiles.length ? tiles.join('') : `<p class="empty">${empty[folder] || 'This folder is empty.'}</p>`;
    $('view').setAttribute('role', 'listbox');
    $('view').setAttribute('aria-multiselectable', String(folder === 'hand'));
    $('view').dataset.folder = folder;
    fresh.clear(); // new cards animate once, not on every re-render

    renderBanner();
    renderDrawOdds();
    renderToolbar();

    const p = E.prices(run);
    const count = run.phase === 'hold' && folder === 'hand' ? run.round.trashed.length : selected.size;
    const sel = count ? ` · ${count} selected` : '';
    const tools = CARD_ACTIONS.filter((a) => E.hasAction(run, a)).map((a) => `${STATUS_NAMES[a]} ${price(p[a])}`);
    $('status').textContent = `${run.deck.length} cards in deck · ${tools.join(' · ')}${sel}`;
  }

  // The shop's card actions. Delete, Duplicate and Change suit are only in the
  // card menu; the optional tools are also toolbar buttons.
  const CARD_ACTIONS = ['remove', 'duplicate', 'suit', 'rankUp', 'rankDown', 'split', 'bonus'];
  const TOOLBAR_CARD_ACTIONS = ['rankUp', 'rankDown', 'split', 'bonus'];
  const STATUS_NAMES = { remove: 'Delete', duplicate: 'Duplicate', suit: 'Change suit', rankUp: 'Rank up', rankDown: 'Rank down', split: 'Split', bonus: 'Add 2x' };
  const price = (n) => (n === 0 ? 'Free' : money(n));

  // Draw odds: during a hand, each rank's and suit's share of what's left to draw.
  function renderDrawOdds() {
    const box = $('draw-odds');
    const show = E.settingsOf(run).drawOdds && run.phase === 'hold' && folder === 'hand' && E.maxDiscards(run) > 0;
    box.hidden = !show;
    if (!show) return;
    const o = E.drawOdds(run);
    const ranks = [...E.RANKS].reverse().filter((r) => o.ranks[r]).map((r) => `<span><b>${E.rankLabel(r)}</b> ${pct(o.ranks[r])}</span>`);
    const suits = E.SUITS.filter((s) => o.suits[s]).map((s) => `<span class="suit-${s}"><b>${s}</b> ${pct(o.suits[s])}</span>`);
    box.innerHTML = `<span class="muted">Each draw (${o.left} cards left):</span> ${ranks.join('')}<span class="sep"></span>${suits.join('')}`;
  }

  function renderBanner() {
    const b = $('banner');
    let html = '';
    let tone = '';
    let help = false;
    if (run.phase === 'hold') {
      help = true;
      const s = E.settingsOf(run);
      const size = run.round.cards.length;
      const max = E.maxDiscards(run);
      const used = run.round.trashed.length;
      const drawsLeft = run.round.drawsLeft ?? 1;
      const best = size > E.SCORED_CARDS ? ` Your best ${E.SCORED_CARDS} cards are scored.` : '';
      const more = drawsLeft > 1 ? ' You get one more draw after this one.' : s.extraDraw ? ' This is your last draw.' : '';
      html =
        drawsLeft === 0
          ? `No draw is on, so this hand is final. Press <b>Keep hand</b> to score it.${best}`
          : max === 0
            ? `Your deck has only ${size} cards, so no card can be replaced. Press <b>Keep hand</b> to score this hand.${best}`
            : `Select the cards you want to replace, then press <b>Draw</b>, or press <b>Keep hand</b> to keep all ${size}. Unselected cards are held.${more}${best} <span class="muted">Replacing ${used} of up to ${Math.min(max, size)}</span>`;
    } else if (run.phase === 'bet' && folder === 'hand' && run.last) {
      html = resultLine(run.last);
      tone = run.last.outcome === 'lose' || !run.last.paid ? 'bad' : 'good';
    } else if (run.phase === 'bet') {
      help = true;
      html = 'Shop is open: select a card in Deck to delete, duplicate or change it. Increase Hand Payout is in the toolbar.';
    } else {
      html = run.phase === 'won' ? 'Run won.' : 'Run over.';
    }
    if (help && helpHidden) html = '';
    else if (help) html = `<span>${html}</span><button class="banner-x" type="button" data-dismiss-help aria-label="Hide help" title="Hide help">×</button>`;
    b.className = `banner ${tone}${help ? ' help' : ''}`;
    b.innerHTML = html;
  }

  function resultLine(r) {
    const verdicts = {
      beat: ` · <b>Beat the boss</b>: earned ${money(r.earned)} of ${money(r.target)} needed`,
      lose: ` · Fell short of the boss: earned ${money(r.earned)} of ${money(r.target)} needed`,
    };
    const verdict = r.outcome ? verdicts[r.outcome] : '';
    // Every hand matched pays, so list each one and the total.
    const list = r.matches.filter((m) => m.id !== E.NOTHING.id);
    const sum = r.mult / (r.bonus || 1);
    // A single hand needs no breakdown unless something doubled it.
    let line = list.length > 1 ? `${list.map((m) => `${esc(m.name)} ${pays(m.mult)}`).join(' + ')} = ${pays(sum)}` : r.bonus > 1 ? pays(sum) : '';
    // 2x cards and Double payout double the whole hand.
    if (r.bonus > 1) {
      const cards = Math.log2(r.bonus) - (r.double ? 1 : 0);
      const why = [cards && (cards === 1 ? 'a 2x card' : `${cards} 2x cards`), r.double && 'Double payout'].filter(Boolean).join(', ');
      line += ` × ${r.bonus} (${why}) = ${pays(r.mult)}`;
    }
    const interest = r.interest ? `<span class="interest"> · Interest +${money(r.interest)}</span>` : '';
    return `<b>${esc(r.handName)}</b>${line ? ` · ${line}` : ''} · <b>${signed(r.paid)}</b>${interest}${verdict}${bossCardsLine(r.bossCards)}`;
  }

  // The cards a boss put in your deck as its hand came up.
  function bossCardsLine(cards) {
    if (!cards?.length) return '';
    const n = cards.length;
    const list = cards.map((c) => `<span class="suit-${c.suit}">${E.cardLabel(c)}</span>`).join(', ');
    return `<span class="boss-cards">The boss put ${n === 1 ? 'a random card' : `${n} random cards`} in your deck: ${list}.</span>`;
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
    draw.classList.toggle('go', edit && !!run.last && !deckVisited); // green once a hand has paid out, until Deck is opened
    draw.querySelector('svg').innerHTML = edit ? EDIT_ICON : DRAW_ICON;
    draw.querySelector('span').textContent = edit ? 'Edit deck' : n ? `Draw ${n}` : hold ? 'Keep hand' : 'Draw';

    // Shop buttons: card actions always show the price. Increase Hand Payout
    // doesn't, since each hand has its own price (shown in its menu). They
    // light up once a card is selected and you can pay.
    const p = E.prices(run);
    const card = folder === 'deck' && selected.size === 1 ? [...selected][0] : null;
    const phone = KG.os() === 'phone';
    const labels = {
      rankUp: phone ? 'Rank+' : 'Rank up',
      rankDown: phone ? 'Rank−' : 'Rank down',
      split: phone ? 'Split' : 'Split card',
      bonus: phone ? '2x' : 'Add 2x',
      payout: phone ? 'Payout' : 'Increase Hand Payout',
    };
    const hasBonus = card && E.cardById(run, card)?.bonus;
    for (const action of [...TOOLBAR_CARD_ACTIONS, 'payout']) {
      const btn = $(`tool-${action}`);
      const needsCard = action !== 'payout';
      const block = E.shopBlock(run, action, needsCard ? card ?? undefined : undefined) || (action === 'bonus' && hasBonus ? 'That card already has 2x.' : null);
      btn.hidden = folder !== 'deck' || !E.hasAction(run, action); // shop tools only show when chosen for the run
      btn.disabled = (needsCard && !card) || !!block;
      btn.classList.toggle('primary', !btn.disabled);
      btn.querySelector('span').innerHTML = needsCard ? `${labels[action]} <b>${price(p[action])}</b>` : labels[action];
      btn.title = block || (needsCard && !card ? 'Select a card first' : '');
    }
  }

  // -------------------------------------------------------------------------
  // Rendering: Account window

  function renderAccount() {
    $('account-title').textContent = KG.pick({ value: 'Account Properties', quality: 'Account', power: 'Account' });
    $('bankroll').textContent = money(run.bankroll);
    const target = E.bossTarget(run);
    $('earned').textContent = `${money(run.earned)} / ${money(target)}`;
    const gate = E.isGateHand(run.hand);
    $('stage').innerHTML = `Level ${run.level} of ${E.LEVELS} · Hand ${run.hand} of ${E.HANDS_PER_LEVEL}${gate ? ' · <b class="gate-tag">Boss</b>' : ''}`;
    const adds = E.bossCardCount(run);
    $('boss').textContent = adds ? `Adds ${adds} random card${adds === 1 ? '' : 's'}` : 'Adds no cards';

    // Only shown when the run can't earn achievements (only Easy stops it).
    const s = E.settingsOf(run);
    $('ach-row').hidden = E.countsForAchievements(s);
    $('run-achievements').innerHTML = '<span class="ach-off">Off (Easy mode)</span> <span class="muted">· only Beat Easy mode with 10-card hands can be earned</span>';

    renderBet();
    renderLast();
    renderDeckInfo();
    renderPaytable();
  }

  // Deck properties: card counts by rank and suit, plus copies, boss cards and 2x cards.
  function renderDeckInfo() {
    const on = E.settingsOf(run).deckInfo;
    $('deck-info-box').hidden = !on;
    if (!on) return;
    const count = (f) => run.deck.filter(f).length;
    const ranks = [...E.RANKS].reverse().map((r) => `<span class="${count((c) => c.rank === r) ? '' : 'none'}"><b>${E.rankLabel(r)}</b>${count((c) => c.rank === r)}</span>`);
    const suits = E.SUITS.map((s) => `<span class="suit-${s}"><b>${s}</b>${count((c) => c.suit === s)}</span>`);
    const extra = [
      [count((c) => c.copy > 0), 'copies'],
      [count((c) => c.boss), 'boss cards'],
      [count((c) => c.bonus), 'with 2x'],
    ].filter(([n]) => n).map(([n, what]) => `${n} ${what}`);
    $('deck-info').innerHTML = `<p>${run.deck.length} cards${extra.length ? ` · ${extra.join(' · ')}` : ''}</p>
      <div class="deck-counts">${ranks.join('')}</div>
      <div class="deck-counts">${suits.join('')}</div>`;
  }

  // Deck odds and Payout increase both come from simulated deals, worked out
  // again only when the deck or the paytable changes.
  let oddsCache = { key: '', odds: null };
  function deckOdds() {
    const key = JSON.stringify([run.deck.map((c) => c.rank + c.suit), run.upgrades, run.settings]);
    if (oddsCache.key !== key) oddsCache = { key, odds: E.dealOdds(run) };
    return oddsCache.odds;
  }

  function renderBet() {
    const playing = run.phase === 'bet';
    const gate = E.isGateHand(run.hand);
    const target = E.bossTarget(run);

    // How much more the level needs to earn by its last hand.
    const needed = Math.max(0, target - run.earned);
    $('deal').disabled = !playing;
    // Gone while a hand is in play; it keeps its space so the toolbar doesn't shift.
    $('deal').style.visibility = run.phase === 'hold' ? 'hidden' : '';
    $('deal').classList.toggle('boss', gate);
    // After a hand pays out, Edit deck is the suggested next step, so Deal goes plain (still enabled).
    $('deal').classList.toggle('after-hand', playing && !!run.last && !deckVisited);
    $('deal').textContent = gate ? 'Boss deal' : 'Deal';

    let note = '';
    if (run.phase === 'hold') {
      note = E.maxDiscards(run) === 0 ? 'Press Keep hand in the Cards window to score this hand.' : 'Select the cards to replace in the Cards window, then press Draw.';
      if (KG.os() === 'phone') note += ' <button class="kg-btn mini" type="button" data-screen="cards">Go to cards</button>';
    } else if (run.phase === 'won') note = `<b>You beat level ${E.LEVELS}'s boss.</b> Run won with ${money(run.bankroll)}.`;
    else if (run.phase === 'lost') note = `<b>Run over.</b> You earned ${money(run.last.earned)} this level, short of the boss's ${money(run.lostTo)}.`;
    else if (gate) {
      note = `Boss hand: this level needs to earn <b>${money(target)}</b>${needed ? `, so this hand must pay <b>${money(needed)}</b> or more` : ' (you have it already)'}. Anything less ends the run. Hands that would cover it are green in the paytable.${bossCardsLine(run.last?.bossCards)}`;
    }
    $('bet-note').innerHTML = note;
    $('note-box').hidden = !note;
    $('new-run').classList.toggle('kg-primary', run.phase === 'won' || run.phase === 'lost');
  }

  function renderLast() {
    const r = run.last;
    $('last-box').hidden = !r;
    if (!r) return;
    $('last').innerHTML = `<div class="last-cards">${[...r.cards].sort(E.byStrength).map((c) => `<span class="mini-card suit-${c.suit}${r.drawn.includes(c.id) ? ' drawn' : ''}${r.scored && !r.scored.includes(c.id) ? ' unscored' : ''}">${E.cardLabel(c)}</span>`).join('')}</div>
      <div class="last-result ${r.outcome === 'lose' || !r.paid ? 'bad' : 'good'}">${resultLine(r)}</div>`;
  }

  function renderPaytable() {
    // Every hand the last hand matched is marked, not just the best one.
    const lastIds = new Set(run.last ? run.last.matches.map((m) => m.id) : []);
    // Green: hands that would cover what the level still needs to earn for the boss, on their own.
    const need = run.phase === 'bet' || run.phase === 'hold' ? Math.max(1, E.bossTarget(run) - run.earned) : Infinity;
    // Double payout: on the boss hand every hand pays double.
    const bossDouble = E.settingsOf(run).doubleBet && E.isGateHand(run.hand) ? 2 : 1;
    // The chance a fresh deal contains each hand (any 5 of the dealt cards make it), not that it's the best hand.
    const odds = E.settingsOf(run).deckOdds ? deckOdds().contains : null;
    const oddsCell = (h) => (odds ? `<td class="odds">${pct(odds[h.id] || 0)}</td>` : '');
    const rows = [...E.HANDS, E.NOTHING].map((h) => {
      const m = E.multiple(run, h.id);
      const t = E.total(run, h.id);
      const ups = run.upgrades?.[h.id] || 0;
      const cls = t <= 0 ? 'neg' : t * E.PAYOUT_UNIT * bossDouble >= need ? 'pass' : '';
      const tag = ups ? ` <span class="ups" title="Increased ${ups} ${ups === 1 ? 'time' : 'times'}">×${1 + ups}</span>` : '';
      return `<tr class="${lastIds.has(h.id) ? 'last' : ''}"><th scope="row">${h.name}${tag}</th><td class="${m <= 0 ? 'neg' : ''}">${pays(m)}</td><td class="${cls}">${pays(t)}</td>${oddsCell(h)}</tr>`;
    });
    const oddsHead = odds ? '<th title="The chance a fresh deal from your deck contains this hand (simulated)">Odds</th>' : '';
    $('paytable').innerHTML = `<thead><tr><th>Hand</th><th>Pays</th><th title="What the hand pays in all, with the smaller hands it contains">Total</th>${oddsHead}</tr></thead><tbody>${rows.join('')}</tbody>`;
  }

  function renderScreens() {
    const phone = KG.os() === 'phone';
    document.body.classList.toggle('one-screen', phone);
    $('account').classList.toggle('on-screen', !phone || screen === 'account');
    $('cards').classList.toggle('on-screen', !phone || screen === 'cards');
    for (const b of document.querySelectorAll('.screen-tabs [data-screen]')) b.setAttribute('aria-selected', String(b.dataset.screen === screen));
  }

  function render() {
    document.body.classList.toggle('no-color', E.settingsOf(run).noColor);
    renderAccount();
    renderCards();
    renderScreens();
    syncAchievements();
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
    E.deal(run);
    fresh = new Set(run.round.cards);
    folder = 'hand';
    selected.clear();
    if (KG.os() === 'phone') screen = 'cards';
    render();
    focusWindow($('cards'));
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
    if (result.partial) {
      // Extra draw: the hand stays in play for one more draw.
      render();
      return;
    }
    folder = 'hand';
    deckVisited = false;
    selected.clear();
    render();
    if (run.phase === 'won') endDialog(true);
    else if (run.phase === 'lost') endDialog(false);
  }

  // `target` is a card id, or a hand id for 'payout' (Increase Hand Payout).
  async function purchase(action, target, suit) {
    const block = E.shopBlock(run, action, target);
    if (block) return;
    const { added } = E.buy(run, action, target, suit);
    if (action !== 'payout') {
      // Select what the purchase made: the new cards, or the changed card.
      const keep = added.length ? added.map((c) => c.id) : action === 'remove' ? [] : [target];
      selected = new Set(keep.slice(0, 1));
      fresh = new Set(keep);
    }
    render();
  }

  async function confirmRemove(cardId) {
    if (E.shopBlock(run, 'remove', cardId)) return;
    const card = E.cardById(run, cardId);
    const ok = await ask({
      title: 'Delete file',
      body: `Permanently delete <b>${esc(fileName(card))}</b> for ${E.prices(run).remove ? money(E.prices(run).remove) : 'free'}? It can't be restored.`,
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
    await startRun();
  }

  // With more than one deck unlocked, asks which to start with (the saved one
  // is picked). Returns the deck id, or null if cancelled.
  async function chooseDeck() {
    const current = setupSettings().deck;
    const decks = E.DECKS.filter((d) => E.isUnlocked(profile.earned, 'deck', d.id));
    if (decks.length <= 1) return current;
    const items = decks.map(
      (d) => `<label class="setup-toggle"><input type="radio" name="cad-deck" value="${d.id}"${d.id === current ? ' checked' : ''}><span><b>${esc(d.name)}</b><span class="muted">${esc(d.desc)}</span></span></label>`,
    );
    return ask({
      title: 'Choose a deck',
      body: `<fieldset class="setup-group"><legend>Starting deck</legend>${items.join('')}</fieldset>`,
      ok: 'Start run',
      cls: 'cad-setup',
      collect: (wrap) => wrap.querySelector('input[name="cad-deck"]:checked')?.value || current,
    });
  }

  // Starts a run with the saved game setup and the chosen deck, replacing the
  // current run. The deck choice is saved to the setup for next time.
  async function startRun() {
    const deck = await chooseDeck();
    if (!deck) return;
    profile.setup = { ...setupSettings(), deck };
    run = E.newRun(setupSettings());
    folder = 'deck';
    selected.clear();
    fresh.clear();
    screen = 'account';
    render();
  }

  async function endDialog(won) {
    const summary = won
      ? `You beat all ${E.LEVELS} bosses and finished with <b>${money(run.bankroll)}</b> in ${run.handsPlayed} hands.`
      : `You earned ${money(run.last.earned)} on level ${run.level}, short of its boss's <b>${money(run.lostTo)}</b>.`;
    const ok = await ask({ title: won ? 'Run won' : 'Run over', body: summary + runAchievementsNote(), ok: 'New run', cancel: 'Close' });
    if (ok) await startRun();
  }

  // For the end-of-run dialog: what this run earned, or why it couldn't.
  function runAchievementsNote() {
    const fresh = run.newAchievements || [];
    const list = fresh.map((id) => {
      const a = E.ACHIEVEMENTS.find((x) => x.id === id);
      return `<li>${esc(a.name)} <span class="muted">· unlocked ${esc(unlockName(a.unlock))}</span></li>`;
    });
    const earned = list.length ? `<p class="dlg-ach">New achievements this run:</p><ul class="dlg-ach-list">${list.join('')}</ul>` : '';
    if (!E.countsForAchievements(E.settingsOf(run))) {
      return `<p class="dlg-ach ach-off">This run didn't count toward achievements (Easy mode), except Beat Easy mode with 10-card hands.</p>${earned}`;
    }
    return earned || '<p class="dlg-ach muted">No new achievements this run.</p>';
  }

  // -------------------------------------------------------------------------
  // Dialog (an in-page window; browser dialogs are avoided)

  // Resolves true/false, or with `collect(wrap)`'s value when OK is pressed.
  // `cancel: null` leaves out the Cancel button; `onOpen(wrap)` wires up a form in the body.
  function ask({ title, body, ok = 'OK', cancel = 'Cancel', danger = false, cls = '', onOpen, collect }) {
    return new Promise((resolve) => {
      modalOpen = true;
      hideMenu();
      const wrap = document.createElement('div');
      wrap.className = `kg-modal cad-modal ${cls}`;
      wrap.innerHTML = `<div class="window kg-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cad-dlg-title">
        <div class="titlebar">
          <div class="lights"><span class="close" data-answer="no"></span><span class="min"></span><span class="max"></span></div>
          <div class="window-title" id="cad-dlg-title">${esc(title)}</div>
        </div>
        <div class="dlg-body">${body}</div>
        <div class="dlg-foot">
          ${cancel ? `<button class="kg-btn" type="button" data-answer="no">${esc(cancel)}</button>` : ''}
          <button class="kg-btn kg-primary${danger ? ' danger' : ''}" type="button" data-answer="yes">${esc(ok)}</button>
        </div>
      </div>`;
      const done = (answer) => {
        const value = answer && collect ? collect(wrap) : answer;
        wrap.remove();
        document.removeEventListener('keydown', onKey, true);
        modalOpen = false;
        resolve(value);
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
      onOpen?.(wrap);
      wrap.querySelector('[data-answer="yes"]').focus();
    });
  }

  // -------------------------------------------------------------------------
  // Game setup: starting deck, hand size, difficulty and the toggles, saved to
  // the profile and used by every new run. Locked options show greyed out with
  // the achievement that unlocks them.

  // The saved setup, leaving out anything still locked.
  function setupSettings() {
    const last = E.cleanSettings(profile.setup);
    const out = { ...E.DEFAULT_SETTINGS };
    for (const k of Object.keys(out)) if (E.isUnlocked(profile.earned, k, last[k])) out[k] = last[k];
    return out;
  }

  async function showSetup() {
    if (modalOpen) return;
    const open = (key, value) => E.isUnlocked(profile.earned, key, value);
    const init = setupSettings();

    const select = (key, label, options) => {
      const opts = options.map((o) => {
        const ok = open(key, o.value);
        return `<option value="${o.value}"${o.value === init[key] ? ' selected' : ''}${ok ? '' : ' disabled'}>${esc(o.label)}${ok ? '' : ' (locked)'}</option>`;
      });
      const unlocked = options.filter((o) => open(key, o.value)).length;
      const count = unlocked < options.length ? ` <span class="muted">${unlocked} of ${options.length} unlocked</span>` : '';
      return `<div class="setup-field"><label for="setup-${key}">${label}${count}</label><select id="setup-${key}" data-key="${key}">${opts.join('')}</select><p class="setup-hint" data-hint="${key}"></p></div>`;
    };
    const decks = select('deck', 'Starting deck', E.DECKS.map((d) => ({ value: d.id, label: d.name })));
    const sizes = select('handSize', 'Hand size', Array.from({ length: E.MAX_HAND_SIZE - E.HAND_SIZE + 1 }, (_, i) => ({ value: E.HAND_SIZE + i, label: `${E.HAND_SIZE + i} cards` })));
    const modes = select('difficulty', 'Difficulty', E.DIFFICULTIES.map((d) => ({ value: d.id, label: d.id === 'easy' ? `${d.name} (no achievements)` : d.name })));
    const groups = TOGGLES.map((g) => {
      const items = g.items.map((t) => {
        const ok = open(t.key, true);
        const note = ok ? esc(t.desc) : `Locked: ${esc(E.unlockedBy(t.key, true).name)}`;
        return `<label class="setup-toggle${ok ? '' : ' locked'}"><input type="checkbox" data-key="${t.key}"${init[t.key] ? ' checked' : ''}${ok ? '' : ' disabled'}><span><b>${esc(t.name)}</b><span class="muted">${note}</span></span></label>`;
      });
      return `<fieldset class="setup-group"><legend>${g.group}</legend>${items.join('')}</fieldset>`;
    });
    const warn = '<p class="setup-warn ach-off" id="setup-warn" hidden>Achievements are off on Easy mode, except Beat Easy mode with 10-card hands.</p>';
    const intro = '<p class="setup-intro muted">Information and Display options apply right away. Everything else applies when you start a new run; the current run keeps its settings.</p>';
    const body = `${intro}<div class="setup-selects">${decks}${sizes}${modes}</div>${warn}${groups.join('')}`;

    // Hints under the dropdowns, the Easy warning and the Start label follow the choices.
    const update = (wrap) => {
      const val = (key) => wrap.querySelector(`[data-key="${key}"]`).value;
      const hint = (key, html) => (wrap.querySelector(`[data-hint="${key}"]`).innerHTML = html);
      hint('deck', esc(E.DECKS.find((d) => d.id === val('deck')).desc));
      hint('handSize', Number(val('handSize')) > E.SCORED_CARDS ? `Your best ${E.SCORED_CARDS} cards are scored.` : 'Five-card draw.');
      hint('difficulty', esc(E.DIFFICULTIES.find((d) => d.id === val('difficulty')).desc));
      const easy = val('difficulty') === 'easy';
      wrap.querySelector('#setup-warn').hidden = !easy;
    };
    const settings = await ask({
      title: 'Game Settings',
      body,
      ok: 'Save',
      cls: 'cad-setup',
      onOpen: (wrap) => {
        update(wrap);
        wrap.addEventListener('change', (e) => {
          // Extra draw and No draw can't both be on.
          const other = { extraDraw: 'noDraw', noDraw: 'extraDraw' }[e.target.dataset.key];
          if (other && e.target.checked) wrap.querySelector(`[data-key="${other}"]`).checked = false;
          update(wrap);
        });
      },
      collect: (wrap) => {
        const out = { ...E.DEFAULT_SETTINGS };
        for (const el of wrap.querySelectorAll('[data-key]')) {
          const key = el.dataset.key;
          out[key] = el.type === 'checkbox' ? el.checked : key === 'handSize' ? Number(el.value) : el.value;
        }
        return E.cleanSettings(out);
      },
    });
    if (!settings) return;
    profile.setup = settings;
    // Information displays only show things, so the current run picks them up straight away.
    const info = TOGGLES.filter((g) => g.group === 'Information' || g.group === 'Display').flatMap((g) => g.items);
    run.settings = { ...run.settings, ...Object.fromEntries(info.map((t) => [t.key, settings[t.key]])) };
    render();
  }

  // -------------------------------------------------------------------------
  // Achievements: every achievement, whether it's earned, and what it unlocks.

  function showAchievements() {
    if (modalOpen) return;
    const fresh = run.newAchievements || [];
    const rows = E.ACHIEVEMENTS.map((a) => {
      const got = profile.earned.includes(a.id);
      const now = fresh.includes(a.id) ? ' · earned this run' : '';
      return `<li class="${got ? 'got' : ''}"><span class="ach-check" aria-label="${got ? 'Earned' : 'Not earned'}">${got ? '✓' : ''}</span><span><b>${esc(a.name)}</b><span class="muted">Unlocks ${esc(unlockName(a.unlock))}${now}</span></span></li>`;
    });
    const off = E.countsForAchievements(E.settingsOf(run)) ? '' : '<p class="ach-banner ach-off">This run is on Easy mode, so it can only earn Beat Easy mode with 10-card hands.</p>';
    ask({
      title: 'Achievements',
      body: `${off}<p class="ach-count">${profile.earned.length} of ${E.ACHIEVEMENTS.length} earned</p><ul class="ach-list">${rows.join('')}</ul>`,
      ok: 'Close',
      cancel: null,
      cls: 'cad-achievements',
    });
  }

  // -------------------------------------------------------------------------
  // Context menu (right-click, or long-press on touch)

  // An item with `keepOpen` leaves the menu up; its `run` redraws the menu.
  // `focusAt` is the item to focus, falling back to the first enabled one.
  function showMenu(x, y, items, hint, focusAt = 0) {
    const menu = $('ctx');
    payoutMenuOpen = false;
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
      const item = items[b.dataset.i];
      if (item.keepOpen) e.stopPropagation(); // redrawing detaches the button, so the document handler would see a click outside
      else hideMenu();
      item.run();
    };
    const r = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(4, Math.min(x, innerWidth - r.width - 4))}px`;
    menu.style.top = `${Math.max(4, Math.min(y, innerHeight - r.height - 4))}px`;
    (menu.querySelector(`button[data-i="${focusAt}"]:not([disabled])`) || menu.querySelector('button:not([disabled])'))?.focus();
  }

  function hideMenu() {
    $('ctx').hidden = true;
    payoutMenuOpen = false;
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
      const dupBlock = E.shopBlock(run, 'duplicate', cardId);
      const remBlock = E.shopBlock(run, 'remove', cardId);
      showMenu(
        x,
        y,
        [
          { label: `Duplicate — ${price(p.duplicate)}`, key: `${mod}C, ${mod}V`, disabled: !!dupBlock, run: () => purchase('duplicate', cardId) },
          '-',
          ...suitItems(cardId, 'Change to '),
          ...toolItems(cardId),
          '-',
          { label: `Delete permanently — ${price(p.remove)}`, key: KG.os() === 'quality' ? '⌥⌘⌫' : 'Shift+Del', disabled: !!remBlock, danger: true, run: () => purchase('remove', cardId) },
        ],
        dupBlock || remBlock,
      );
    }
  }

  // The run's extra shop tools, if any were chosen at New run.
  function toolItems(cardId) {
    const p = E.prices(run);
    const card = E.cardById(run, cardId);
    const names = { rankUp: 'Rank up', rankDown: 'Rank down', split: 'Split', bonus: 'Add 2x' };
    const items = ['rankUp', 'rankDown', 'split', 'bonus']
      .filter((a) => E.hasAction(run, a))
      .map((a) => ({
        label: `${names[a]} — ${price(p[a])}`,
        disabled: !!E.shopBlock(run, a, cardId) || (a === 'bonus' && card.bonus),
        run: () => purchase(a, cardId),
      }));
    return items.length ? ['-', ...items] : [];
  }

  // One menu item per suit the card isn't already, priced as Change suit.
  function suitItems(cardId, prefix = '') {
    const card = E.cardById(run, cardId);
    const block = E.shopBlock(run, 'suit', cardId);
    return E.SUITS.filter((s) => s !== card.suit).map((s) => ({
      label: `${prefix}${E.SUIT_NAMES[s]} (${E.rankLabel(card.rank)}${s}) — ${price(E.prices(run).suit)}`,
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
      // Deck selects one card at a time and opens its shop menu under it;
      // a second click unselects it and closes the menu.
      selected = selected.has(id) ? new Set() : new Set([id]);
    }
    renderCards();
    const el = view.querySelector(`[data-card="${id}"]`);
    el?.focus();
    if (selected.has(id) && el) {
      e.stopPropagation(); // the document click handler would close the menu at once
      const r = el.getBoundingClientRect();
      menuFor(id, r.left, r.bottom + 4);
    } else hideMenu();
  });

  view.addEventListener('keydown', (e) => {
    const tile = e.target.closest('[data-card]');
    if (!tile || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    tile.click();
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

  $('banner').addEventListener('click', (e) => {
    if (!e.target.closest('[data-dismiss-help]')) return;
    helpHidden = true;
    renderBanner();
  });

  // The sidebar navigates.
  $('side').addEventListener('click', (e) => {
    const a = e.target.closest('[data-open]');
    if (!a) return;
    e.preventDefault();
    open(a.dataset.open);
  });

  $('tool-draw').addEventListener('click', () => (run.phase === 'bet' ? open('deck') : drawHand()));
  for (const action of TOOLBAR_CARD_ACTIONS) {
    $(`tool-${action}`).addEventListener('click', () => selected.size === 1 && purchase(action, [...selected][0]));
  }
  $('tool-payout').addEventListener('click', (e) => {
    e.stopPropagation();
    if (payoutMenuOpen) hideMenu();
    else showPayoutMenu();
  });

  // Stays open after a purchase so you can buy several upgrades in a row, and
  // redraws with the new payouts and prices. A click outside it closes it.
  function showPayoutMenu(focusAt) {
    const r = $('tool-payout').getBoundingClientRect();
    showMenu(
      Math.min(r.left, innerWidth),
      r.bottom + 4,
      E.HANDS.map((h, i) => ({
        label: `${h.name}: ${pays(E.multiple(run, h.id))} → ${pays(E.multiple(run, h.id) + h.base)}${payoutGain(h.id)}`, // its own payout; totals that include it rise too
        key: money(E.payoutPrice(run, h.id)),
        disabled: !!E.shopBlock(run, 'payout', h.id),
        keepOpen: true,
        run: () => {
          purchase('payout', h.id);
          showPayoutMenu(i);
        },
      })),
      undefined,
      focusAt,
    );
    payoutMenuOpen = true;
  }

  // Payout increase: the extra money the upgrade pays when you make the hand.
  // Each upgrade adds the hand's base payout, and the same goes for every
  // hand that includes it.
  function payoutGain(handId) {
    if (!E.settingsOf(run).payoutInfo) return '';
    return ` · +${pays(E.HANDS.find((h) => h.id === handId).base)} if you make it`;
  }

  // -------------------------------------------------------------------------
  // Input: Account window

  $('deal').addEventListener('click', dealHand);
  $('achievements').addEventListener('click', showAchievements);
  $('game-setup').addEventListener('click', showSetup);
  $('new-run').addEventListener('click', newRun);
  $('how-to').addEventListener('click', showHowTo);

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
  // How to play: a Notes window with the rules you need to start

  const HOW_TO = `
    <h1>How to play Ctrl+Alt+Deal</h1>
    <ol>
      <li>Finish all ${E.LEVELS} levels by making enough money in each level. Each level is ${E.HANDS_PER_LEVEL} hands of 5 card draw poker.</li>
      <li>You earn money by making poker hands. You get paid for every hand you make, which can be multiple different hands (like pair and three of a kind).</li>
      <li>Spend money to change your deck and make it easier to get higher paying hands.</li>
      <li>Spend money to increase how much you make when you get a hand.</li>
      <li>The last hand in each level is a “Boss” hand. The boss will add random cards to your deck, making it harder to make your poker hands.</li>
    </ol>`;

  function showHowTo() {
    if (modalOpen) return;
    modalOpen = true;
    hideMenu();
    try {
      localStorage.setItem(HOW_TO_KEY, '1');
    } catch {
      // storage unavailable — it shows again next visit
    }
    const wrap = document.createElement('div');
    wrap.className = 'kg-modal cad-howto';
    wrap.innerHTML = `<div class="window kg-dialog" role="dialog" aria-modal="true" aria-labelledby="cad-howto-title">
      <div class="titlebar">
        <div class="lights"><span class="close" data-close></span><span class="min"></span><span class="max"></span></div>
        <div class="window-title" id="cad-howto-title">how-to-play.txt — Notes</div>
      </div>
      <div class="notes-menu"><span>File</span><span>Edit</span><span>Format</span><span>View</span><span>Help</span></div>
      <div class="notes-page">${HOW_TO}</div>
      <div class="notes-status"><span>Ln 1, Col 1</span><span>UTF-8</span><button class="kg-btn kg-primary" type="button" data-close>Start playing</button></div>
    </div>`;
    const done = () => {
      wrap.remove();
      document.removeEventListener('keydown', onKey, true);
      modalOpen = false;
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        done();
      }
    };
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || e.target === wrap) done();
    });
    document.addEventListener('keydown', onKey, true);
    document.body.append(wrap);
    wrap.querySelector('.kg-btn[data-close]').focus();
  }

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

  let seenHowTo = false;
  try {
    seenHowTo = localStorage.getItem(HOW_TO_KEY) === '1';
  } catch {
    // storage unavailable — treat it as a first visit
  }
  if (!seenHowTo) showHowTo();
})();
