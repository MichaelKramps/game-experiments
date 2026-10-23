// Sanity check for engine.js: node tools/check-engine.js [count]
// Generates boards from sequential seeds and reports timing, size spread,
// failures, and the solver's fewest words against the reference answer.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({ console, Math, Int8Array, Int32Array, Uint8Array, Set, Map });
for (const f of ['words.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
}
const LG = vm.runInContext('LetterGroups', ctx);

const count = Number(process.argv[2] || 200);
const sizes = {};
const shortest = {};
let fails = 0;
let genMs = 0;
let solveMs = 0;
let worstGen = 0;
let worstSolve = 0;
for (let i = 0; i < count; i++) {
  const seed = (i * 2654435761) % 33554432;
  let t = Date.now();
  const b = LG.generate(seed);
  const g = Date.now() - t;
  genMs += g;
  worstGen = Math.max(worstGen, g);
  if (!b) { fails++; continue; }
  if (LG.codeToSeed(b.code) !== seed) throw new Error('seed round trip ' + seed);
  sizes[b.n] = (sizes[b.n] || 0) + 1;
  t = Date.now();
  const chain = LG.solve(b, 0);
  const s = Date.now() - t;
  solveMs += s;
  worstSolve = Math.max(worstSolve, s);
  const k = `${b.reference.length}->${chain ? chain.length : 'none'}`;
  shortest[k] = (shortest[k] || 0) + 1;
  if (i < 6) console.log(b.code, b.groups.map((g) => g.join('').toUpperCase()).join(' | '), 'ref', b.reference.join(' '), 'solver', chain && chain.join(' '));
}
console.log({ count, fails, sizes, shortest, avgGen: genMs / count, worstGen, avgSolve: solveMs / count, worstSolve });
