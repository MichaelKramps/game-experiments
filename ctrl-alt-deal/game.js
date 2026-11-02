// Ctrl+Alt+Deal UI: two windows on the site shell (../os/os.js).
//   Account — bankroll, bet size, progress, the paytable.
//   Cards   — a file browser where every card is a file: Deck and Hand.
//             Deal sits at the left of its toolbar. Select cards in Hand,
//             then Draw (Refresh) replaces them. Between hands the Deck
//             toolbar and right-click menu are the shop.
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
  const mult = (m) => (m < 0 ? '−' : '') + Math.abs(m) + 'x';

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
        { key: 'doubleBet', name: 'Double bet', desc: 'Once per level, bet twice as much on one hand.' },
      ],
    },
    {
      group: 'Information',
      items: [
        { key: 'deckInfo', name: 'Deck properties', desc: 'Card counts by rank and suit.' },
        { key: 'deckOdds', name: 'Deck odds', desc: 'The chance a fresh deal contains each hand.' },
        { key: 'drawOdds', name: 'Draw odds', desc: 'During a hand, the chance of drawing each rank and suit.' },
        { key: 'payoutInfo', name: 'Payout increase', desc: 'How much more each payout upgrade pays at your current bet.' },
      ],
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
  let clipboard = null; // card id copied with Ctrl+C
  let screen = 'account'; // phones show one window at a time
  let modalOpen = false;
  let fresh = new Set(); // ids drawn in the last draw, highlighted once
  let helpHidden = false; // the banner's how-to text, dismissed until the page reloads

  const HOW_TO_KEY = 'ctrl-alt-deal-how-to-seen'; // the how-to note opens by itself only on a first visit

  // -------------------------------------------------------------------------
  // Saving

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved && Array.isArray(saved.deck) && saved.bought) {
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

  // A small padlock for locked cards, in the card's own color.
  const LOCK_ICON = '<svg viewBox="0 0 10 12" width="9" height="11" aria-hidden="true"><path d="M2.5 5V3.5a2.5 2.5 0 0 1 5 0V5" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="5" width="8" height="6.5" rx="1" fill="currentColor"/></svg>';

  function cardTile(card, { extra = '' } = {}) {
    const on = isSelected(card.id);
    const cls = ['file', 'card-file'];
    if (on) cls.push('selected');
    if (fresh.has(card.id)) cls.push('fresh');
    if (extra) cls.push(extra);
    if (card.locked) cls.push('locked');
    const notes = [card.bonus && '2x: any hand with this card pays double', card.locked && "Locked: can't be deleted, duplicated or changed", card.boss && 'Added by a boss'].filter(Boolean).join(' · ');
    return `<div class="${cls.join(' ')}" data-card="${card.id}" tabindex="0" role="option" aria-selected="${on}"${notes ? ` title="${notes}"` : ''}>
      <span class="card-icon suit-${card.suit}">${E.cardLabel(card)}${card.bonus ? '<span class="card-bonus">2x</span>' : ''}${card.locked ? `<span class="card-lock" aria-label="Locked">${LOCK_ICON}</span>` : ''}</span>
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

  // The shop's card actions, in toolbar order.
  const CARD_ACTIONS = ['remove', 'duplicate', 'suit', 'rankUp', 'rankDown', 'split', 'bonus'];
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
      tone = run.last.net > 0 ? 'good' : run.last.net < 0 ? 'bad' : '';
    } else if (run.phase === 'bet') {
      help = true;
      html = 'Shop is open: select a card in Deck, then pick a card action from the toolbar. Increase Hand Payout needs no card.';
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
      beat: ` · <b>Beat the boss</b> (${r.target}x needed)`,
      lose: ` · Fell short of the boss (${r.target}x needed)`,
    };
    const verdict = r.outcome ? verdicts[r.outcome] : '';
    // Every hand matched pays, so list each one and the total.
    const list = r.matches || [{ name: r.handName, mult: r.mult }]; // runs saved before matches existed
    const sum = r.mult / (r.bonus || 1);
    let pays = list.length > 1 ? `${list.map((m) => `${esc(m.name)} ${mult(m.mult)}`).join(' + ')} = ${mult(sum)}` : mult(sum);
    // 2x cards double the whole hand, once per card.
    if (r.bonus > 1) {
      const n = Math.log2(r.bonus);
      pays += ` × ${r.bonus} (${n === 1 ? 'a 2x card' : `${n} 2x cards`}) = ${mult(r.mult)}`;
    }
    const interest = r.interest ? `<span class="interest"> · Interest +${money(r.interest)}</span>` : '';
    return `<b>${esc(r.handName)}</b> · ${pays} on ${money(r.bet)} · <b>${signed(r.net)}</b>${interest}${verdict}${bossCardsLine(r.bossCards)}`;
  }

  // The cards a boss put in your deck as its hand came up, and which are locked.
  function bossCardsLine(cards) {
    if (!cards?.length) return '';
    const n = cards.length;
    const locked = cards.filter((c) => c.locked).length;
    const lockNote = !locked ? '' : locked === n ? (n === 1 ? ". It's locked" : '. All are locked') : `. ${locked} ${locked === 1 ? 'is' : 'are'} locked`;
    const list = cards.map((c) => `<span class="suit-${c.suit}">${E.cardLabel(c)}${c.locked ? ' (locked)' : ''}</span>`).join(', ');
    return `<span class="boss-cards">The boss put ${n === 1 ? 'a random card' : `${n} random cards`} in your deck: ${list}${lockNote}.</span>`;
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

    // Shop buttons: card actions always show the price. Increase Hand Payout
    // doesn't, since each hand has its own price (shown in its menu). They
    // light up once a card is selected and you can pay without dropping to $0.
    // A purchase that would end the run stays clickable (it asks first) but
    // isn't highlighted.
    const p = E.prices(run);
    const card = folder === 'deck' && selected.size === 1 ? [...selected][0] : null;
    const phone = KG.os() === 'phone';
    const labels = {
      duplicate: phone ? 'Copy' : 'Duplicate card',
      suit: phone ? 'Suit' : 'Change suit',
      remove: phone ? 'Delete' : 'Delete card',
      rankUp: phone ? 'Rank+' : 'Rank up',
      rankDown: phone ? 'Rank−' : 'Rank down',
      split: phone ? 'Split' : 'Split card',
      bonus: phone ? '2x' : 'Add 2x',
      payout: phone ? 'Payout' : 'Increase Hand Payout',
    };
    const hasBonus = card && E.cardById(run, card)?.bonus;
    for (const action of [...CARD_ACTIONS, 'payout']) {
      const btn = $(`tool-${action}`);
      const needsCard = action !== 'payout';
      const block = E.shopBlock(run, action, needsCard ? card ?? undefined : undefined) || (action === 'bonus' && hasBonus ? 'That card already has 2x.' : null);
      btn.hidden = folder !== 'deck' || !E.hasAction(run, action); // shop tools only show when chosen for the run
      btn.disabled = (needsCard && !card) || !!block;
      const strands = !btn.disabled && E.strands(run, action);
      btn.classList.toggle('primary', !btn.disabled && !strands);
      btn.querySelector('span').innerHTML = needsCard ? `${labels[action]} <b>${price(p[action])}</b>` : labels[action];
      btn.title = block || (needsCard && !card ? 'Select a card first' : strands ? 'This would spend your last dollar and end the run' : '');
    }
  }

  // -------------------------------------------------------------------------
  // Rendering: Account window

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

    // The run's settings, and whether it can earn achievements (only Easy stops it).
    const s = E.settingsOf(run);
    const extras = TOGGLES.flatMap((g) => g.items).filter((t) => s[t.key]).map((t) => t.name);
    $('run-settings').textContent = [E.DECKS.find((d) => d.id === s.deck).name, E.DIFFICULTIES.find((d) => d.id === s.difficulty).name, `${s.handSize}-card hands`, ...extras].join(' · ');
    $('run-achievements').innerHTML = E.countsForAchievements(s) ? 'On' : '<span class="ach-off">Off (Easy mode)</span> <span class="muted">· only Beat Easy mode can be earned</span>';

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
      [count((c) => c.locked), 'locked'],
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

    // The bet is set by the level ($10, 4x each level); short of it, you bet everything.
    const bet = run.phase === 'hold' ? run.round.bet : playing ? E.nextBet(run).bet : null;
    $('bet-size').textContent = bet === null ? '—' : money(bet);
    $('deal').disabled = !playing;
    // Gone while a hand is in play; it keeps its space so the toolbar doesn't shift.
    $('deal').style.visibility = run.phase === 'hold' ? 'hidden' : '';
    $('deal').classList.toggle('boss', gate);
    $('deal').textContent = gate ? `Boss deal (${mult(E.bossTarget(run.level))})` : 'Deal';

    // Double bet: a toggle beside Deal, once per level.
    const dbl = $('double-bet');
    const used = run.doubledLevel === run.level;
    dbl.hidden = !E.settingsOf(run).doubleBet || !playing;
    dbl.disabled = !run.doubleNext && !E.canDoubleBet(run);
    dbl.setAttribute('aria-pressed', String(!!run.doubleNext));
    dbl.textContent = run.doubleNext ? 'Double bet: on' : used ? 'Double bet used' : 'Double bet';
    dbl.title = used ? 'Already used on this level' : 'Bet twice as much on the next hand (once per level)';

    let note = '';
    if (run.phase === 'hold') {
      note = E.maxDiscards(run) === 0 ? 'Press Keep hand in the Cards window to score this hand.' : 'Select the cards to replace in the Cards window, then press Draw.';
      if (KG.os() === 'phone') note += ' <button class="kg-btn mini" type="button" data-screen="cards">Go to cards</button>';
    } else if (run.phase === 'won') note = `<b>You beat level ${E.LEVELS}'s boss.</b> Run won with ${money(run.bankroll)}.`;
    else if (run.phase === 'lost') note = run.lostTo ? `<b>Run over.</b> Your hand paid less than the boss's ${run.lostTo}x.` : '<b>Run over.</b> You ran out of money.';
    else if (gate) {
      note = `Boss hand: make a hand that pays <b>${E.bossTarget(run.level)}x</b> or more to win and move on. Anything less ends the run. Hands whose total clears it are green in the paytable.${bossCardsLine(run.last?.bossCards)}`;
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
      <div class="last-result ${r.net > 0 ? 'good' : r.net < 0 ? 'bad' : ''}">${resultLine(r)}</div>`;
  }

  function renderPaytable() {
    // Every hand the last hand matched is marked, not just the best one.
    const lastIds = new Set(run.last ? (run.last.matches || [{ id: run.last.handId }]).map((m) => m.id) : []);
    const target = run.phase === 'won' ? Infinity : E.bossTarget(run.level);
    // The chance a fresh deal contains each hand (any 5 of the dealt cards make it), not that it's the best hand.
    const odds = E.settingsOf(run).deckOdds ? deckOdds().contains : null;
    const oddsCell = (h) => (odds ? `<td class="odds">${pct(odds[h.id] || 0)}</td>` : '');
    const rows = [...E.HANDS, E.NOTHING].map((h) => {
      const m = E.multiple(run, h.id);
      const t = E.total(run, h.id);
      const ups = run.upgrades?.[h.id] || 0;
      const cls = t < 0 ? 'neg' : t >= target ? 'pass' : '';
      const tag = ups ? ` <span class="ups" title="Doubled ${ups} ${ups === 1 ? 'time' : 'times'}">×${2 ** ups}</span>` : '';
      return `<tr class="${lastIds.has(h.id) ? 'last' : ''}"><th scope="row">${h.name}${tag}</th><td class="${m < 0 ? 'neg' : ''}">${mult(m)}</td><td class="${cls}">${mult(t)}</td>${oddsCell(h)}</tr>`;
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
    selected.clear();
    render();
    if (run.phase === 'won') endDialog(true);
    else if (run.phase === 'lost') endDialog(false);
  }

  // `target` is a card id, or a hand id for 'payout' (Increase Hand Payout).
  async function purchase(action, target, suit) {
    const handId = action === 'payout' ? target : undefined;
    const block = E.shopBlock(run, action, target);
    if (block) return;
    const cost = E.priceOf(run, action, handId);
    if (E.strands(run, action, handId)) {
      const ok = await ask({
        title: 'Spend your last dollar?',
        body: `This costs ${money(cost)}, everything you have. With ${money(0)} left, the run will end.`,
        ok: { remove: 'Delete anyway', duplicate: 'Duplicate anyway', suit: 'Change anyway', rankUp: 'Change anyway', rankDown: 'Change anyway', split: 'Split anyway', bonus: 'Add anyway', payout: 'Increase anyway' }[action],
        danger: true,
      });
      if (!ok) return;
    }
    const { added } = E.buy(run, action, target, suit);
    if (action !== 'payout') {
      // Select what the purchase made: the new cards, or the changed card.
      const keep = added.length ? added.map((c) => c.id) : action === 'remove' ? [] : [target];
      selected = new Set(keep.slice(0, 1));
      fresh = new Set(keep);
    }
    render();
    if (run.phase === 'lost') endDialog(false);
  }

  async function confirmRemove(cardId) {
    if (E.shopBlock(run, 'remove', cardId)) return;
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
    startRun();
  }

  // Starts a run with the saved game setup, replacing the current run.
  function startRun() {
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
      : run.lostTo
        ? `Your ${esc(run.last.handName.toLowerCase())} paid ${mult(run.last.mult)}, short of level ${run.level}'s boss target of <b>${run.lostTo}x</b>.`
        : `You ran out of money on level ${run.level}.`;
    const ok = await ask({ title: won ? 'Run won' : 'Run over', body: summary + runAchievementsNote(), ok: 'New run', cancel: 'Close' });
    if (ok) startRun();
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
      return `<p class="dlg-ach ach-off">This run didn't count toward achievements (Easy mode), except Beat Easy mode.</p>${earned}`;
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
    const warn = '<p class="setup-warn ach-off" id="setup-warn" hidden>Achievements are off on Easy mode, except Beat Easy mode.</p>';
    const intro = '<p class="setup-intro muted">Changes apply when you start a new run. The current run keeps its settings.</p>';
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
      title: 'Game setup',
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
    save();
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
    const off = E.countsForAchievements(E.settingsOf(run)) ? '' : '<p class="ach-banner ach-off">This run is on Easy mode, so it can only earn Beat Easy mode.</p>';
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
      const dupBlock = E.shopBlock(run, 'duplicate', cardId);
      const remBlock = E.shopBlock(run, 'remove', cardId);
      showMenu(
        x,
        y,
        [
          { label: `Duplicate — ${money(p.duplicate)}`, key: `${mod}C, ${mod}V`, disabled: !!dupBlock, run: () => purchase('duplicate', cardId) },
          '-',
          ...suitItems(cardId, 'Change to '),
          ...toolItems(cardId),
          '-',
          { label: `Delete permanently — ${money(p.remove)}`, key: KG.os() === 'quality' ? '⌥⌘⌫' : 'Shift+Del', disabled: !!remBlock, danger: true, run: () => purchase('remove', cardId) },
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
        label: `${names[a]} — ${money(p[a])}`,
        disabled: !!E.shopBlock(run, a, cardId) || (a === 'bonus' && card.bonus),
        run: () => purchase(a, cardId),
      }));
    return items.length ? ['-', ...items] : [];
  }

  // One menu item per suit the card isn't already, priced as Change suit.
  function suitItems(cardId, prefix = '') {
    const card = E.cardById(run, cardId);
    const cost = money(E.prices(run).suit);
    const block = E.shopBlock(run, 'suit', cardId);
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
  for (const action of ['duplicate', 'remove', 'rankUp', 'rankDown', 'split', 'bonus']) {
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
        label: `${h.name}: ${mult(E.multiple(run, h.id))} → ${mult(E.multiple(run, h.id) * 2)}${payoutGain(h.id)}`, // its own payout; totals that include it rise too
        key: money(E.payoutPrice(run, h.id)),
        disabled: !!E.shopBlock(run, 'payout', h.id),
        run: () => purchase('payout', h.id),
      })),
    );
  });

  // Payout increase: the extra money the upgrade pays when you make the hand
  // at the next bet. Doubling adds its current payout once more, and the same
  // goes for every hand that includes it.
  function payoutGain(handId) {
    if (!E.settingsOf(run).payoutInfo) return '';
    return ` · +${money(E.multiple(run, handId) * E.nextBet(run).bet)} if you make it`;
  }

  // -------------------------------------------------------------------------
  // Input: Account window

  $('deal').addEventListener('click', dealHand);
  $('double-bet').addEventListener('click', () => {
    if (!run.doubleNext && !E.canDoubleBet(run)) return;
    E.setDoubleBet(run, !run.doubleNext);
    render();
  });
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
      <li>Get through all ${E.LEVELS * E.HANDS_PER_LEVEL} hands without running out of money or losing to a boss.</li>
      <li>Each hand is a round of 5 card draw and you get paid out based on every poker hand you get
        <ul><li>if you get two pair, you get paid out for two pair and one pair</li></ul>
      </li>
      <li>Start with a normal 52 card deck and use your money to change your deck and make more powerful hands
        <ul><li>On Normal and Hard, prices go up after every hand (10% on Normal, 20% on Hard)</li></ul>
      </li>
      <li>When you reach a boss hand, you must make a hand that meets or surpasses the payout requirement, otherwise you lose
        <ul><li>Each boss puts 1 or more randomized cards into your deck</li>
          <li>Boss cards can be "locked" (you can't delete, duplicate or change them)</li></ul>
      </li>
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
