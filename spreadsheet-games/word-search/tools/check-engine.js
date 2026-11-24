// Checks Word Search's puzzle maker and themes. Run: node spreadsheet-games/word-search/tools/check-engine.js
const assert = require('assert');
const WS = require('../engine.js');
const THEMES = require('../words.js');

// Themes: names unique, words upper case, enough short words for every level.
const names = new Set();
for (const t of THEMES) {
  assert(!names.has(t.name), `duplicate theme ${t.name}`);
  names.add(t.name);
  assert(new Set(t.words).size === t.words.length, `${t.name}: duplicate word`);
  for (const w of t.words) {
    assert(/^[A-Z][A-Z -]*[A-Z]$/.test(w), `${t.name}: bad word "${w}"`);
    assert(WS.letters(w).length <= 15, `${t.name}: "${w}" is longer than 15`);
  }
  for (const level of Object.keys(WS.LEVELS)) {
    let ok = 0;
    for (let i = 0; i < 20; i++) if (WS.pickWords(t, WS.LEVELS[level].n, Math.random)) ok++;
    assert(ok === 20, `${t.name}: can't always pick ${WS.WORDS} words for ${level}`);
  }
}

// line(): straight lines only
assert.deepStrictEqual(WS.line(10, 0, 3), [0, 1, 2, 3]);
assert.deepStrictEqual(WS.line(10, 33, 0), [33, 22, 11, 0]);
assert.deepStrictEqual(WS.line(10, 9, 90), [9, 18, 27, 36, 45, 54, 63, 72, 81, 90]);
assert.strictEqual(WS.line(10, 0, 12), null);

// Puzzles: every word placed once, along an allowed direction, no blocked words
// outside a single word, saves validate.
const dirOf = (n, cells) => [Math.sign((cells[1] % n) - (cells[0] % n)), Math.sign(Math.floor(cells[1] / n) - Math.floor(cells[0] / n))];
let made = 0;
let crossings = 0;
const dirsSeen = new Set();
const t0 = Date.now();
for (const level of Object.keys(WS.LEVELS)) {
  const L = WS.LEVELS[level];
  for (let i = 0; i < 150; i++) {
    const g = WS.generate(level, THEMES);
    made++;
    assert(WS.valid(g), 'generated puzzle is not valid');
    assert.strictEqual(g.words.length, WS.WORDS);
    for (const w of g.words) {
      const s = WS.letters(w.word);
      assert.strictEqual(w.cells.map((c) => g.grid[c]).join(''), s);
      assert.strictEqual(WS.count(g.grid, g.n, s), 1, `${s} appears more than once`);
      const [dx, dy] = dirOf(g.n, w.cells);
      assert(L.dirs.some(([a, b]) => a === dx && b === dy), `${level}: ${s} runs in a direction not allowed`);
      dirsSeen.add(`${level}:${dx},${dy}`);
      assert.deepStrictEqual(WS.line(g.n, w.cells[0], w.cells.at(-1)), w.cells);
      const k = g.words.indexOf(w);
      assert.strictEqual(WS.match(g, w.cells[0], w.cells.at(-1)), k);
      assert.strictEqual(WS.match(g, w.cells.at(-1), w.cells[0]), k);
    }
    // shared cells between words
    const use = new Map();
    for (const w of g.words) for (const c of w.cells) use.set(c, (use.get(c) || 0) + 1);
    for (const v of use.values()) if (v > 1) crossings += v - 1;
    // no two words run along the same line over each other
    for (const a of g.words) for (const b of g.words) {
      if (a === b) continue;
      const shared = a.cells.filter((c) => b.cells.includes(c));
      assert(shared.length <= 1, `${a.word} and ${b.word} overlap on a line`);
    }
    const sorted = g.words.map((w) => w.word);
    assert.deepStrictEqual(sorted, sorted.slice().sort((a, b) => a.localeCompare(b)));
  }
}
assert.strictEqual(dirsSeen.size, 24, 'every level uses all 8 directions');
const g = WS.generate('easy', THEMES);
assert(!WS.valid({ ...g, grid: g.grid.slice(1) }));
assert(!WS.valid({ ...g, level: 'hard' }));
assert(WS.generate('easy', THEMES, { avoid: g.theme }).theme !== g.theme);

console.log(`ok: ${THEMES.length} themes, ${made} puzzles in ${Date.now() - t0}ms, ${(crossings / made).toFixed(1)} crossings per puzzle`);
