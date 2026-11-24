// Yacht rules: five dice, 13 turns, up to 3 rolls a turn, one category filled
// per turn. The scoring follows the familiar modern rules (upper bonus of 35
// at 63, Full house 25, straights 30/40, five of a kind 50, a 100 bonus for
// each extra five of a kind with the forced joker rule). No DOM here, so
// tools/check-engine.js can run it under node.
//
// A game is one plain object (saved to localStorage as JSON):
//   { v, turn (1–13), roll (rolls used this turn, 0–3), dice (5 values,
//     sorted, or null before the first roll), sel (5 booleans: dice picked
//     to reroll), sheet ({ [category]: { s: score, d: dice, j: joker } }),
//     yachts (extra Yachts that earned the 100 bonus), over }

const Engine = (() => {
  const VERSION = 1;
  const TURNS = 13;
  const ROLLS = 3;
  const UPPER_BONUS_AT = 63;
  const UPPER_BONUS = 35;
  const YACHT_BONUS = 100;

  const FACE_NAMES = ['', 'one', 'two', 'three', 'four', 'five', 'six'];

  // fixed: the score a category gives when it's made (or forced by a joker)
  const CATS = [
    { id: 'ones', name: 'Ones', face: 1, rule: 'Add up the 1s' },
    { id: 'twos', name: 'Twos', face: 2, rule: 'Add up the 2s' },
    { id: 'threes', name: 'Threes', face: 3, rule: 'Add up the 3s' },
    { id: 'fours', name: 'Fours', face: 4, rule: 'Add up the 4s' },
    { id: 'fives', name: 'Fives', face: 5, rule: 'Add up the 5s' },
    { id: 'sixes', name: 'Sixes', face: 6, rule: 'Add up the 6s' },
    { id: 'threeKind', name: 'Three of a kind', rule: '3 alike: add up all dice' },
    { id: 'fourKind', name: 'Four of a kind', rule: '4 alike: add up all dice' },
    { id: 'fullHouse', name: 'Full house', fixed: 25, rule: '3 alike + 2 alike: 25' },
    { id: 'smallStraight', name: 'Small straight', fixed: 30, rule: '4 in a row: 30' },
    { id: 'largeStraight', name: 'Large straight', fixed: 40, rule: '5 in a row: 40' },
    { id: 'yacht', name: 'Yacht', fixed: 50, rule: '5 alike: 50' },
    { id: 'chance', name: 'Chance', rule: 'Add up all dice' },
  ];
  const UPPER = CATS.filter((c) => c.face);
  const LOWER = CATS.filter((c) => !c.face);
  const byId = Object.fromEntries(CATS.map((c) => [c.id, c]));

  const sum = (dice) => dice.reduce((a, b) => a + b, 0);
  const counts = (dice) => {
    const n = [0, 0, 0, 0, 0, 0, 0];
    for (const d of dice) n[d]++;
    return n;
  };
  const isYacht = (dice) => !!dice && dice.length === 5 && dice.every((d) => d === dice[0]);
  const run = (dice) => {
    // the longest run of consecutive faces
    const has = new Set(dice);
    let best = 0;
    let len = 0;
    for (let f = 1; f <= 6; f++) {
      len = has.has(f) ? len + 1 : 0;
      best = Math.max(best, len);
    }
    return best;
  };

  // What `dice` scores in a category. With `joker`, Full house and the
  // straights score their full value whatever the dice.
  function score(id, dice, joker = false) {
    const cat = byId[id];
    const n = counts(dice);
    if (cat.face) return n[cat.face] * cat.face;
    const most = Math.max(...n);
    switch (id) {
      case 'threeKind':
        return most >= 3 ? sum(dice) : 0;
      case 'fourKind':
        return most >= 4 ? sum(dice) : 0;
      case 'fullHouse':
        return joker || (n.includes(3) && n.includes(2)) ? cat.fixed : 0;
      case 'smallStraight':
        return joker || run(dice) >= 4 ? cat.fixed : 0;
      case 'largeStraight':
        return joker || run(dice) >= 5 ? cat.fixed : 0;
      case 'yacht':
        return most === 5 ? cat.fixed : 0;
      case 'chance':
        return sum(dice);
    }
    return 0;
  }

  // The joker rule applies when the dice are a Yacht and the Yacht box is
  // already filled (with 50 or 0). Returns null when it doesn't apply, or
  // { bonus, forced } where forced is the only category allowed, if any.
  function joker(g) {
    if (!isYacht(g.dice) || !g.sheet.yacht) return null;
    const upper = UPPER.find((c) => c.face === g.dice[0]);
    return { bonus: g.sheet.yacht.s === byId.yacht.fixed, forced: g.sheet[upper.id] ? null : upper.id };
  }

  // The categories the current dice may go in, with what each would score:
  // [{ id, score, joker }]. Empty before the first roll and after the game.
  function options(g) {
    if (g.over || !g.dice) return [];
    const open = CATS.filter((c) => !g.sheet[c.id]);
    const j = joker(g);
    if (!j) return open.map((c) => ({ id: c.id, score: score(c.id, g.dice), joker: false }));
    if (j.forced) return [{ id: j.forced, score: score(j.forced, g.dice), joker: true }];
    const lower = open.filter((c) => !c.face);
    const list = lower.length ? lower : open;
    return list.map((c) => ({ id: c.id, score: score(c.id, g.dice, true), joker: true }));
  }

  function totals(g) {
    const val = (c) => (g.sheet[c.id] ? g.sheet[c.id].s : 0);
    const upper = UPPER.reduce((a, c) => a + val(c), 0);
    const bonus = upper >= UPPER_BONUS_AT ? UPPER_BONUS : 0;
    const yachtBonus = g.yachts * YACHT_BONUS;
    const lower = LOWER.reduce((a, c) => a + val(c), 0) + yachtBonus;
    return { upper, bonus, yachtBonus, lower, total: upper + bonus + lower };
  }

  function newGame() {
    return { v: VERSION, turn: 1, roll: 0, dice: null, sel: [false, false, false, false, false], sheet: {}, yachts: 0, over: false };
  }

  const canRoll = (g) => !g.over && (g.roll === 0 || (g.roll < ROLLS && g.sel.some(Boolean)));

  // Rolls every die on a turn's first roll, then only the selected ones. The
  // dice are kept sorted. Returns the positions (after sorting) of the dice
  // that were just rolled, so the UI can animate them.
  function roll(g, rand = Math.random) {
    if (!canRoll(g)) return [];
    const throwDie = () => 1 + Math.floor(rand() * 6);
    const dice = g.roll === 0 ? [0, 1, 2, 3, 4].map(() => ({ v: throwDie(), fresh: true })) : g.dice.map((v, i) => (g.sel[i] ? { v: throwDie(), fresh: true } : { v, fresh: false }));
    dice.sort((a, b) => a.v - b.v);
    g.dice = dice.map((d) => d.v);
    g.sel = [false, false, false, false, false];
    g.roll++;
    return dice.flatMap((d, i) => (d.fresh ? [i] : []));
  }

  function toggle(g, i) {
    if (g.over || !g.dice || g.roll >= ROLLS) return;
    g.sel[i] = !g.sel[i];
  }

  function selectAll(g, on = true) {
    if (g.over || !g.dice || g.roll >= ROLLS) return;
    g.sel = g.sel.map(() => on);
  }

  // Fills a category with the current dice. Returns the option used, or null
  // if that category isn't allowed now.
  function fill(g, id) {
    const opt = options(g).find((o) => o.id === id);
    if (!opt) return null;
    const j = joker(g);
    if (j && j.bonus) g.yachts++;
    g.sheet[id] = { s: opt.score, d: g.dice.slice(), j: opt.joker };
    g.dice = null;
    g.roll = 0;
    g.sel = [false, false, false, false, false];
    if (g.turn >= TURNS) g.over = true;
    else g.turn++;
    return opt;
  }

  // A loaded save is used only if it looks like a game from this version.
  function valid(g) {
    const die = (d) => Number.isInteger(d) && d >= 1 && d <= 6;
    if (!g || g.v !== VERSION || typeof g.sheet !== 'object' || !g.sheet) return false;
    if (!Number.isInteger(g.turn) || g.turn < 1 || g.turn > TURNS) return false;
    if (!Number.isInteger(g.roll) || g.roll < 0 || g.roll > ROLLS) return false;
    if (!Array.isArray(g.sel) || g.sel.length !== 5) return false;
    if (g.dice !== null && !(Array.isArray(g.dice) && g.dice.length === 5 && g.dice.every(die))) return false;
    if ((g.dice === null) !== (g.roll === 0)) return false;
    if (!Number.isInteger(g.yachts) || g.yachts < 0) return false;
    return Object.entries(g.sheet).every(([id, e]) => byId[id] && e && Number.isInteger(e.s) && Array.isArray(e.d) && e.d.length === 5 && e.d.every(die));
  }

  // How a filled score (or a preview) was made, as a formula for the formula bar.
  function formula(id, dice, s) {
    const cat = byId[id];
    if (cat.face) {
      const hits = dice.filter((d) => d === cat.face);
      return hits.length ? `=SUM(${hits.join(',')})` : '=0';
    }
    if (cat.fixed) return `=${s}`;
    return s ? `=SUM(${dice.join(',')})` : '=0';
  }

  return {
    VERSION,
    TURNS,
    ROLLS,
    UPPER_BONUS_AT,
    UPPER_BONUS,
    YACHT_BONUS,
    FACE_NAMES,
    CATS,
    UPPER,
    LOWER,
    byId,
    isYacht,
    score,
    joker,
    options,
    totals,
    newGame,
    canRoll,
    roll,
    toggle,
    selectAll,
    fill,
    valid,
    formula,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
