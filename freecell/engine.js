// FreeCell: the deals, the rules and the "it's solved" check, with no DOM, so
// tools/check-engine.js can run it under node. See DESIGN.md.
//
// Cards are codes like Solitaire's: rank then suit, '8H', '10S', 'KC'.
// A game: { deal, cols: [[code…] × 8] (top is last), cells: [code|null × 4],
//           found: { S: [code…], H, D, C }, moves, elapsed, won, counted }
//
// Deals are numbered 1–32000 with the standard FreeCell numbering, so a
// number is the same deal players everywhere know (#11982 is the one that
// can't be solved). The numbering is a public shuffle recipe: a simple
// random-number formula seeded with the deal number.

const FreeCell = (() => {
  const SUITS = ['S', 'H', 'D', 'C']; // the order of the Done lists
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const DEALS = 32000;
  const UNSOLVABLE = 11982;

  const rank = (code) => RANKS.indexOf(code.slice(0, -1)) + 1;
  const suit = (code) => code.slice(-1);
  const red = (code) => suit(code) === 'H' || suit(code) === 'D';

  // The standard numbered deal: 52 cards, ranks in order with suits clubs,
  // diamonds, hearts, spades; shuffled by a linear congruential generator
  // seeded with the number; dealt left to right across 8 columns.
  function layout(n) {
    let seed = n;
    const rnd = () => {
      seed = (seed * 214013 + 2531011) % 2147483648;
      return Math.floor(seed / 65536);
    };
    const deck = [];
    for (let i = 0; i < 52; i++) deck.push(51 - i);
    for (let i = 0; i < 51; i++) {
      const j = 51 - (rnd() % (52 - i));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const cols = Array.from({ length: 8 }, () => []);
    deck.forEach((c, i) => cols[i % 8].push(RANKS[Math.floor(c / 4)] + 'CDHS'[c % 4]));
    return cols;
  }

  function newGame(n) {
    return { deal: n, cols: layout(n), cells: [null, null, null, null], found: { S: [], H: [], D: [], C: [] }, moves: 0, elapsed: 0, won: false, counted: false };
  }

  // A deal for New game: any number but the unsolvable one.
  function randomDeal(rand = Math.random) {
    let n;
    do n = 1 + Math.floor(rand() * DEALS);
    while (n === UNSOLVABLE);
    return n;
  }

  // ---------------------------------------------------------------------------
  // Moves. A pick is { loc, idx }: loc is 'col:3', 'cell:1' or 'found:S'; idx
  // is the first picked card's index in a column (a column pick takes the
  // cards on top of it too). A destination is 'col:3', 'cell:1' or 'found:S'.

  // Cards that can move together: each one a rank lower and the other color.
  const isRun = (codes) => codes.every((c, k) => !k || (rank(codes[k - 1]) === rank(c) + 1 && red(codes[k - 1]) !== red(c)));

  function picked(g, p) {
    if (p.loc.startsWith('cell:')) {
      const c = g.cells[+p.loc.slice(5)];
      return c ? [c] : [];
    }
    if (p.loc.startsWith('found:')) return g.found[p.loc.slice(6)].slice(-1);
    return g.cols[+p.loc.slice(4)].slice(p.idx);
  }

  // Where a column's movable run starts (the cards on top in sequence).
  function runStart(col) {
    let k = col.length - 1;
    while (k > 0 && isRun([col[k - 1], col[k]])) k--;
    return k;
  }

  // The longest run you can move at once: one card at a time through the
  // free cells and empty columns. Moving into an empty column, that column
  // doesn't count as free space.
  function maxRun(g, toEmptyCol = false) {
    const cells = g.cells.filter((c) => !c).length;
    const cols = g.cols.filter((c) => !c.length).length - (toEmptyCol ? 1 : 0);
    return (cells + 1) * 2 ** Math.max(0, cols);
  }

  // ignoreRoom: would it fit if there were enough free space? (to explain a refusal)
  function canDrop(g, codes, dest, ignoreRoom = false) {
    const first = codes[0];
    if (!first || !isRun(codes)) return false;
    if (dest.startsWith('found:')) {
      const s = dest.slice(6);
      return codes.length === 1 && suit(first) === s && rank(first) === g.found[s].length + 1;
    }
    if (dest.startsWith('cell:')) return codes.length === 1 && !g.cells[+dest.slice(5)];
    if (!dest.startsWith('col:')) return false;
    const col = g.cols[+dest.slice(4)];
    const top = col[col.length - 1];
    if (!ignoreRoom && codes.length > maxRun(g, !top)) return false;
    return !top || (rank(top) === rank(first) + 1 && red(top) !== red(first));
  }

  const allDests = (g) => [...SUITS.map((s) => `found:${s}`), ...g.cells.map((_, i) => `cell:${i}`), ...g.cols.map((_, i) => `col:${i}`)];

  function destinations(g, p) {
    const codes = picked(g, p);
    return allDests(g).filter((d) => d !== p.loc && canDrop(g, codes, d));
  }

  // Move a pick to a destination. Returns false (and changes nothing) if it
  // can't go there.
  function move(g, p, dest) {
    const codes = picked(g, p);
    if (p.loc === dest || !canDrop(g, codes, dest)) return false;
    if (p.loc.startsWith('cell:')) g.cells[+p.loc.slice(5)] = null;
    else if (p.loc.startsWith('found:')) g.found[p.loc.slice(6)].pop();
    else g.cols[+p.loc.slice(4)].splice(p.idx);
    if (dest.startsWith('found:')) g.found[dest.slice(6)].push(...codes);
    else if (dest.startsWith('cell:')) g.cells[+dest.slice(5)] = codes[0];
    else g.cols[+dest.slice(4)].push(...codes);
    g.moves++;
    if (!g.won && SUITS.every((s) => g.found[s].length === 13)) g.won = true;
    return true;
  }

  // Solved: every column runs high to low (no card has a higher one on top
  // of it), so every card left can go to Done with no choices left.
  const solved = (g) => !g.won && g.cols.every((col) => col.every((c, k) => !k || rank(col[k - 1]) >= rank(c)));

  // The next card to send to Done while finishing: the lowest one that fits.
  function nextHome(g) {
    let best = null;
    const consider = (p, code) => {
      if (code && canDrop(g, [code], `found:${suit(code)}`) && (!best || rank(code) < best.r)) best = { r: rank(code), p, dest: `found:${suit(code)}` };
    };
    g.cells.forEach((c, i) => consider({ loc: `cell:${i}`, idx: 0 }, c));
    g.cols.forEach((col, i) => consider({ loc: `col:${i}`, idx: col.length - 1 }, col[col.length - 1]));
    return best;
  }

  // A saved game: the 52 cards, once each, in valid places.
  function valid(s) {
    try {
      if (!s || !Number.isInteger(s.deal) || s.deal < 1 || s.deal > DEALS) return false;
      if (!Array.isArray(s.cols) || s.cols.length !== 8 || !Array.isArray(s.cells) || s.cells.length !== 4) return false;
      const all = [...s.cells.filter(Boolean), ...SUITS.flatMap((k) => s.found[k]), ...s.cols.flat()];
      if (all.length !== 52 || new Set(all).size !== 52 || !all.every((c) => rank(c) > 0 && SUITS.includes(suit(c)))) return false;
      return SUITS.every((k) => s.found[k].every((c, i) => suit(c) === k && rank(c) === i + 1));
    } catch {
      return false;
    }
  }

  return { SUITS, RANKS, DEALS, UNSOLVABLE, rank, suit, red, layout, newGame, randomDeal, isRun, picked, runStart, maxRun, canDrop, destinations, move, solved, nextHome, valid };
})();

if (typeof module !== 'undefined') module.exports = FreeCell;
