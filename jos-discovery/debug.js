// Jo's Discovery — debug panel. Toggle with the backtick key (`), or open the
// page with ?debug. Jump to any hack, set Cover, grant Tools, decode every
// record, and batch-simulate whole operations for balancing.

// ---------------------------------------------------------------------------
// Batch simulator: plays full operations with a simple heuristic.

// Setup cards go first (in this rank order), then defense and offense
// alternate, Echo follows the strongest card, Payload goes last.
const SIM_SETUP = {
  boost_attack: 0, boost_defense: 0, overclock: 1, harden: 1,
  throttle: 2, corrupt: 2, tarpit: 2,
  watchdog: 3, tripwire: 3, filter: 3, quarantine: 3, sandbox: 3,
};
const SIM_DEFENSE = ['defend', 'lockdown', 'mirror'];
// Compile preference, best first. Crude on purpose: a baseline, not a solver.
const SIM_PICKS = [
  'zero_day', 'overclock', 'boost_attack', 'quarantine', 'filter', 'tripwire', 'watchdog',
  'attack', 'ping', 'siphon', 'lockdown', 'sandbox', 'throttle', 'boost_defense', 'defend',
  'harden', 'echo', 'mirror', 'overflow', 'payload', 'corrupt', 'tarpit',
];

const Sim = {
  order(script) {
    const setup = script.filter((c) => c in SIM_SETUP).sort((a, b) => SIM_SETUP[a] - SIM_SETUP[b]);
    const def = script.filter((c) => SIM_DEFENSE.includes(c)).sort((a, b) => SIM_DEFENSE.indexOf(a) - SIM_DEFENSE.indexOf(b));
    const atk = script.filter((c) => !(c in SIM_SETUP) && !SIM_DEFENSE.includes(c) && c !== 'echo' && c !== 'payload');
    const out = [...setup];
    while (def.length || atk.length) {
      if (def.length) out.push(def.shift());
      if (atk.length) out.push(atk.shift());
    }
    for (const echo of script.filter((c) => c === 'echo')) {
      const best = ['zero_day', 'overclock', 'boost_attack', 'attack'].find((c) => out.includes(c));
      out.splice(best ? out.indexOf(best) + 1 : out.length, 0, echo);
    }
    return [...out, ...script.filter((c) => c === 'payload')];
  },
  compile(items) {
    return SIM_PICKS.find((p) => items.includes(p)) ?? items[0];
  },
  maintenance(run) {
    return run.cover / run.maxCover < 0.6 ? 'go_dark' : 'new_alias';
  },
  tool(items) {
    return ['rootkit', 'scrubber', 'autopatch', 'air_gap', 'honeypot', 'feedback', 'skimmer', 'redundancy', 'replay'].find((t) => items.includes(t));
  },

  // Returns the last hack reached and whether the operation was won.
  operation(opSeed) {
    const run = { script: [...STARTING_SCRIPT], cover: START_COVER, maxCover: START_COVER, tools: [] };
    const covers = [];
    for (let n = 1; n <= TOTAL_HACKS; n++) {
      run.script = Sim.order(run.script);
      const result = simulateHack(hackInput(opSeed, n, run));
      if (!result.won) return { reached: n, won: false, covers };
      run.cover = result.cover;
      covers[n] = run.cover;
      rewardsFor(n).forEach((kind, i) => {
        const items = offerItems(opSeed, n, i, kind, run.tools);
        if (!items.length) return;
        if (kind === 'compile') run.script.push(Sim.compile(items, run.script));
        if (kind === 'tool') run.tools.push(Sim.tool(items));
        if (kind === 'maintenance') applyMaintenance(Sim.maintenance(run), run);
      });
    }
    return { reached: TOTAL_HACKS, won: true, covers };
  },

  batch(count) {
    const reached = new Array(TOTAL_HACKS + 2).fill(0);
    const won = new Array(TOTAL_HACKS + 2).fill(0);
    const coverSum = new Array(TOTAL_HACKS + 2).fill(0);
    let complete = 0;
    for (let i = 0; i < count; i++) {
      const r = Sim.operation(`sim-${i}-${count}`);
      for (let n = 1; n <= r.reached; n++) {
        reached[n]++;
        if (n < r.reached || r.won) {
          won[n]++;
          coverSum[n] += r.covers[n];
        }
      }
      if (r.won) complete++;
    }
    const lines = [`${count} operations · ${((100 * complete) / count).toFixed(1)}% complete`, '', 'hack  target                   reached   win%   avg cover'];
    for (let n = 1; n <= TOTAL_HACKS; n++) {
      if (!reached[n]) break;
      const pct = ((100 * won[n]) / reached[n]).toFixed(1).padStart(5);
      const avg = won[n] ? (coverSum[n] / won[n]).toFixed(1) : '-';
      lines.push(`${String(n).padStart(4)}  ${hackInfo(n).label.padEnd(24)} ${String(reached[n]).padStart(7)}  ${pct}   ${avg.padStart(9)}`);
    }
    return lines.join('\n');
  },
};

// ---------------------------------------------------------------------------
// Panel

(() => {
  const panel = document.createElement('div');
  panel.id = 'debug';
  panel.innerHTML = `
    <div class="dbg-head">debug <button type="button" data-act="hide">×</button></div>
    <div class="dbg-row">hack <input id="dbg-hack" type="number" min="1" max="${TOTAL_HACKS}" value="1"> <button type="button" data-act="jump">jump</button></div>
    <div class="dbg-row">cover <input id="dbg-cover" type="number" min="1" value="30"> <button type="button" data-act="cover">set</button></div>
    <div class="dbg-row">tool <select id="dbg-tool">${Object.entries(TOOLS).map(([id, t]) => `<option value="${id}">${t.name}</option>`).join('')}</select> <button type="button" data-act="tool">grant</button></div>
    <div class="dbg-row"><button type="button" data-act="decode">decode all records</button> <button type="button" data-act="layout">reset windows</button></div>
    <div class="dbg-row"><button type="button" data-act="reset">reset save</button></div>
    <div class="dbg-row">simulate <input id="dbg-ops" type="number" min="1" value="500"> ops <button type="button" data-act="sim">run</button></div>
    <pre id="dbg-out"></pre>`;
  document.body.append(panel);

  const show = (on) => panel.classList.toggle('on', on);
  if (new URLSearchParams(location.search).has('debug')) show(true);

  document.addEventListener('keydown', (e) => {
    if (e.key === '`' && !e.target.closest?.('input, select, textarea')) show(!panel.classList.contains('on'));
  });

  const val = (id) => document.getElementById(id).value;
  const out = document.getElementById('dbg-out');

  panel.addEventListener('click', (e) => {
    const act = e.target.dataset?.act;
    if (!act) return;
    if (act === 'hide') show(false);
    if (act === 'jump') Game.jumpTo(Number(val('dbg-hack')));
    if (act === 'cover') Game.setCover(Number(val('dbg-cover')));
    if (act === 'tool') Game.grantTool(val('dbg-tool'));
    if (act === 'decode') Game.decodeAll();
    if (act === 'layout') Game.resetLayout();
    if (act === 'reset') Game.resetAll();
    if (act === 'sim') {
      out.textContent = 'running…';
      setTimeout(() => {
        const t = performance.now();
        out.textContent = `${Sim.batch(Math.max(1, Number(val('dbg-ops'))))}\n\n${Math.round(performance.now() - t)} ms`;
      }, 20);
    }
  });
})();
