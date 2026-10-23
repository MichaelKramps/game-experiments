// Jo's Discovery — the three programs and the operation's flow.
// Terminal: recon, running a hack, results. Files: /script, /incoming,
// /tools, /records. Notes: Jo's own words. Rules live in engine.js; this
// file only plays back the events the engine returns.

const SAVE_KEY = 'jos-discovery-save';
const SETTINGS_KEY = 'jos-discovery-settings';
const OLD_PS1 = 'jo@ev-ws-4471:~$ '; // saved logs from before the OS setting baked this in
const GLYPHS = '▓▒░█▚▞▙▟';
const LINE_MS = 1520; // per line at 1x; slow enough to follow each card
const SPEEDS = [1, 2, 4, 8];
const LOG_CAP = 600;

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, onClick, className = '') {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Save state. Everything about the operation lives in S; the Archive and the
// notes ride along across operations.

let S = null;
let settings = loadJSON(SETTINGS_KEY) || { speed: 0 };

function loadJSON(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function save() {
  try {
    S.log = S.log.slice(-LOG_CAP);
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch {
    // storage unavailable — progress lasts for this session only
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function freshArchive() {
  const a = {};
  for (const p of PROGRAMS) a[p.id] = { extracted: [false, false, false, false], decoded: false, revealed: [false, false, false, false] };
  return a;
}

function newOperation(prev) {
  S = {
    v: 1,
    opSeed: Math.random().toString(36).slice(2, 10),
    opNumber: (prev?.opNumber || 0) + 1,
    hack: 1,
    cover: START_COVER,
    maxCover: START_COVER,
    script: [...STARTING_SCRIPT],
    tools: [],
    phase: 'ready', // ready | running | rewards | traced | ending | complete
    reconShown: false,
    run: null, // inputs of the hack being played, so a reload replays it exactly
    rewards: null, // { queue, index, refactor }
    archive: prev && ARCHIVE_PERSISTS_ON_TRACE ? prev.archive : freshArchive(),
    notes: prev?.notes || [],
    log: prev?.log || [],
  };
}

// ---------------------------------------------------------------------------
// Terminal

const termLog = $('term-log');
const termPrompt = $('term-prompt');
const termHints = $('term-hints');
let prompt = null; // { cmd, action }
let play = null; // active playback

// Health bars are wrapped in BAR_OPEN side BAR_MID ... BAR_CLOSE inside the
// line text, so each bar is colored by whose it is, not by whose line it's on.
const BAR_OPEN = '\x01';
const BAR_MID = '\x02';
const BAR_CLOSE = '\x03';
const BAR_RE = /\x01(jo|sys)\x02([^\x03]*)\x03/g;

// The shell follows the site's OS setting (../os/os.js). Command lines are
// logged without their prompt, and paths are translated when drawn, so the
// whole log redraws in the current OS's style.
const ps1 = () => KG.prompt('jo', 'ev-ws-4471');
const GAME_PATH = /(?<![\w.])(\.?\/)(script|incoming|tools|records)\b[^\s,)]*/g;

function osText(text, cls) {
  if (cls === 'cmd') text = ps1() + (text.startsWith(OLD_PS1) ? text.slice(OLD_PS1.length) : text);
  if (KG.os() === 'value') text = text.replace(GAME_PATH, (p) => KG.path(p));
  return text;
}

function renderLine({ text, cls }) {
  const line = el('div', `tl ${cls || ''}`.trim());
  text = osText(text, cls);
  let last = 0;
  for (const m of text.matchAll(BAR_RE)) {
    line.append(text.slice(last, m.index), el('span', `bar-${m[1]}`, m[2]));
    last = m.index + m[0].length;
  }
  line.append(text.slice(last));
  return line;
}

function appendLine(text, cls = '') {
  const entry = { text, cls };
  S.log.push(entry);
  termLog.append(renderLine(entry));
  while (termLog.childElementCount > LOG_CAP) termLog.firstChild.remove();
  scrollTerm();
}

function scrollTerm() {
  const body = termLog.parentElement;
  body.scrollTop = body.scrollHeight;
}

function renderTermLog() {
  termLog.replaceChildren(...S.log.map(renderLine));
  scrollTerm();
}

function setPrompt(cmd, action) {
  prompt = cmd ? { cmd, action } : null;
  termPrompt.replaceChildren(el('span', 'ps1', ps1()));
  if (cmd) termPrompt.append(el('span', 'cmd', osText(cmd)));
  if (cmd || S.phase !== 'ending') termPrompt.append(el('span', 'cursor'));
  scrollTerm();
}

function setHints(hints) {
  termHints.replaceChildren(
    ...hints.map(([label, action]) => (action ? button(label, action) : el('span', '', label))),
  );
}

function hintsForPhase() {
  if (play) {
    setHints([
      [play.paused ? '[space] resume' : '[space] pause', togglePause],
      [`[f] speed ${SPEEDS[settings.speed]}x`, cycleSpeed],
      ['[enter] skip to end', skipPlayback],
    ]);
  } else if (S.phase === 'ready') setHints([['[enter] run', () => prompt?.action()]]);
  else if (S.phase === 'traced') setHints([['[enter] reconnect', () => prompt?.action()]]);
  else if (S.phase === 'rewards') setHints([['waiting on /incoming', null]]);
  else setHints([]);
}

termPrompt.addEventListener('click', () => {
  if (prompt && !play) prompt.action();
});

// Playback: lines print at a steady pace; a key skips to the end.
function playback(lines, onDone) {
  play = { lines, i: 0, paused: false, timer: null, onDone };
  prompt = null;
  termPrompt.replaceChildren(); // no prompt while the script runs
  hintsForPhase();
  tick();
}

function playLine() {
  const [text, cls, state] = play.lines[play.i++];
  appendLine(text, cls);
  if (state) renderPanel(state);
}

function tick() {
  if (!play || play.paused) return;
  if (play.i >= play.lines.length) return endPlayback();
  playLine();
  play.timer = setTimeout(tick, LINE_MS / SPEEDS[settings.speed]);
}

function endPlayback() {
  const { onDone } = play;
  clearTimeout(play.timer);
  play = null;
  onDone();
}

function skipPlayback() {
  if (!play) return;
  clearTimeout(play.timer);
  while (play.i < play.lines.length) playLine();
  endPlayback();
}

function togglePause() {
  if (!play) return;
  play.paused = !play.paused;
  if (!play.paused) tick();
  else clearTimeout(play.timer);
  hintsForPhase();
}

function cycleSpeed() {
  settings.speed = (settings.speed + 1) % SPEEDS.length;
  saveSettings();
  hintsForPhase();
}

// ---------------------------------------------------------------------------
// Status panel: pinned under the battle log. Jo's Cover and defense on the
// left, the system's Integrity and defense on the right. Values that just
// changed flash briefly.

const termPanel = $('term-panel');
let panelState = null;

function barText(value, max) {
  const v = Math.max(0, value);
  let filled = Math.round((v / max) * BAR_WIDTH);
  if (v > 0 && filled === 0) filled = 1; // never look empty while alive
  return '█'.repeat(filled) + '░'.repeat(BAR_WIDTH - filled);
}

// state: { maxCover, maxIntegrity, jo: stats, sys: stats } where stats is
// the engine's per-side snapshot { hp, def, atk, dstr, firewall, counter, idle }.
const sign = (n) => (n > 0 ? `+${n}` : `${n}`);

function statusText(st) {
  const parts = [];
  if (st.firewall) parts.push(`firewall ${st.firewall}`);
  if (st.counter) parts.push(`counter ${st.counter}`);
  if (st.atk) parts.push(`atk str ${sign(st.atk)}`);
  if (st.dstr) parts.push(`def str ${sign(st.dstr)}`);
  if (st.idle !== IDLE_PENALTY) parts.push(`timeout ${st.idle}`);
  // non-breaking spaces inside an item, so a long line only wraps between items
  return parts.map((p) => p.replace(/ /g, '\u00a0')).join('  ') || '-';
}

function renderPanel(state) {
  if (!state) {
    termPanel.hidden = true;
    panelState = null;
    return;
  }
  const half = (who, label, max) => {
    const st = state[who];
    const hp = Math.max(0, st.hp);
    return {
      hp: `${barText(hp, max)} ${hp}/${max}`,
      def: st.def ? `${'▮'.repeat(Math.min(st.def, BAR_WIDTH))} ${st.def}` : '0',
      status: statusText(st),
      label,
    };
  };
  const now = { jo: half('jo', 'cover', state.maxCover), sys: half('sys', 'integrity', state.maxIntegrity) };
  const prev = panelState;
  panelState = now;
  const box = (who) => {
    const v = now[who];
    const changed = (key) => (prev && prev[who][key] !== v[key] ? ' changed' : '');
    const node = el('div', `panel-side panel-${who}`);
    node.append(
      el('span', 'panel-who', who),
      el('span', 'panel-label', v.label),
      el('span', `panel-val${changed('hp')}`, v.hp),
      el('span', ''),
      el('span', 'panel-label', 'defense'),
      el('span', `panel-val${changed('def')}`, v.def),
      el('span', ''),
      el('span', 'panel-label', 'status'),
      el('span', `panel-val panel-status${changed('status')}`, v.status),
    );
    return node;
  };
  termPanel.replaceChildren(box('jo'), box('sys'));
  termPanel.hidden = false;
}

const freshStats = (hp) => ({ hp, def: 0, atk: 0, dstr: 0, firewall: 0, counter: 0, idle: IDLE_PENALTY });

function panelPreview() {
  const integrity = hackInfo(S.hack).integrity;
  return { maxCover: S.maxCover, maxIntegrity: integrity, jo: freshStats(S.cover), sys: freshStats(integrity) };
}

// Event → terminal line. Health changes draw a text bar: the full width is
// max Cover (or the hack's starting Integrity), the filled part is current.
const hpLabel = (side) => (side === 'jo' ? 'cover' : 'integrity');
const pad2 = (n) => String(n).padStart(2, '0');
const BAR_WIDTH = 20;

function hpBar(side, from, to, maxes) {
  const max = maxes[side];
  const value = Math.max(0, to);
  const delta = value - Math.max(0, from);
  const change = delta ? `  ${delta > 0 ? '+' : ''}${delta}` : '';
  const bar = `${hpLabel(side).padEnd(9)} ${barText(value, max)} ${value}/${max}${change}`;
  return `${BAR_OPEN}${side}${BAR_MID}${bar}${BAR_CLOSE}`;
}

const NAME_W = 15;
const BLANK_HEAD = ' '.repeat(10);

function hitText(d, maxes) {
  if (d.zero) return 'no damage';
  if (d.blocked) return `firewall blocked ${d.dmg}  (${d.target} firewall ${d.firewall})`;
  const to = hpBar(d.target, d.from, d.to, maxes);
  let text;
  if (d.absorbed && !d.through) text = d.redundancy ? `${d.absorbed} absorbed` : `${d.absorbed} absorbed, ${d.target} defense 0`;
  else if (d.absorbed) text = `${to}  (${d.absorbed} absorbed)`;
  else text = to;
  if (d.honeypot) text += ', honeypot defense 1';
  if (d.redundancy) text += `, redundancy: ${d.target} defense ${d.def}`;
  if (d.autopatch) text += `, autopatch defense ${d.def}`;
  return text;
}

function detailText(d, maxes) {
  if (d.kind === 'hit') return hitText(d, maxes);
  if (d.kind === 'defend') return `defense ${d.def}`;
  if (d.kind === 'strength') {
    const what = `${d.stat === 'atk' ? 'attack' : 'defense'} strength ${d.value}`;
    return d.target ? `${d.target} ${what}` : what;
  }
  if (d.kind === 'firewall') return `firewall ${d.value}`;
  if (d.kind === 'counter') return `counter ${d.value}`;
  if (d.kind === 'tarpit') return `${d.target} idle timeout costs ${d.value}`;
  return 'nothing to copy';
}

// maxes: { jo: max Cover, sys: the hack's starting Integrity }
// A card with several effects prints one line per effect; follow-on lines
// and Counter responses are indented under the card.
function formatEvent(e, maxes) {
  if (e.type === 'tool') {
    let text = e.text;
    if (e.detail) text = hitText(e.detail, maxes);
    else if (e.from !== undefined) text = hpBar('jo', e.from, e.to, maxes);
    return [`[tool]   ${TOOLS[e.tool].name.toLowerCase().padEnd(13)} ${text}`, 'tool'];
  }
  if (e.type === 'safeguard') return [`[${pad2(e.cycle)}] session limit reached`, 'lost'];
  const head = `[${pad2(e.cycle)}] ${e.side.padEnd(4)} `;
  if (e.type === 'timeout') {
    return [`${head}${'idle timeout'.padEnd(NAME_W)}${hpBar(e.side, e.from, e.to, maxes)}`, `${e.side} timeout`];
  }
  if (e.type === 'counter') {
    return [`${BLANK_HEAD}${'↳ counter'.padEnd(NAME_W)}${detailText(e.detail, maxes)}  (${e.left} left)`, e.side];
  }
  let text = detailText(e.detail, maxes);
  if (e.cont) return [`${BLANK_HEAD}${''.padEnd(NAME_W)}${text}`, e.side];
  const name = e.copied ? `Echo→${CARDS[e.copied].name}` : CARDS[e.card].name;
  if (e.temporary) text += '  (temporary)';
  if (e.replay) text += '  (replay)';
  return [`${head}${name.padEnd(NAME_W)}${text}`, e.side];
}

// ---------------------------------------------------------------------------
// Records: encoded text keeps the program name, document ID and patient
// numbers; every other character becomes a glyph.

function record(pid, idx) {
  return RECORDS[pid][idx];
}

function keepMask(pid, rec) {
  const t = rec.text;
  const keep = new Uint8Array(t.length);
  const mark = (re) => {
    for (const m of t.matchAll(re)) keep.fill(1, m.index, m.index + m[0].length);
  };
  mark(/\b\d{6}\b/g);
  mark(new RegExp(pid, 'g'));
  mark(new RegExp(rec.docId, 'g'));
  mark(/\.{2,}/g);
  for (let i = 0; i < t.length; i++) if (/\s/.test(t[i])) keep[i] = 1;
  return keep;
}

function encoded(pid, idx) {
  const rec = record(pid, idx);
  const keep = keepMask(pid, rec);
  const rng = rngFor('glyphs', pid, idx);
  let out = '';
  for (let i = 0; i < rec.text.length; i++) out += keep[i] ? rec.text[i] : GLYPHS[Math.floor(rng() * GLYPHS.length)];
  return out;
}

function unscramble(pre, pid, idx, duration = 1700) {
  const rec = record(pid, idx);
  const t = rec.text;
  const keep = keepMask(pid, rec);
  const at = Array.from(t, (_, i) => 0.55 * (i / t.length) + 0.45 * Math.random());
  return new Promise((resolve) => {
    const start = performance.now();
    function frame(now) {
      const p = (now - start) / duration;
      if (p >= 1) {
        pre.textContent = t;
        return resolve();
      }
      let out = '';
      for (let i = 0; i < t.length; i++) {
        out += keep[i] || at[i] < p ? t[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      pre.textContent = out;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
}

// ---------------------------------------------------------------------------
// Files

const fsSide = $('fs-side');
const fsPath = $('fs-path');
const fsNote = $('fs-note');
const fsView = $('fs-view');
const fsStatus = $('fs-status');
let fs = { dir: 'script', sub: null, file: null };

const scriptName = (i) => `${pad2(i + 1)}_${S.script[i]}`;
const fileExt = { compile: 'card', maintenance: 'sh', tool: 'bin' };
const scriptLocked = () => ['running', 'ending', 'complete'].includes(S.phase);

function fsGoto(dir, sub = null, file = null) {
  fs = { dir, sub, file };
  renderFiles();
}

function fsPathText() {
  let p = `/${fs.dir}`;
  if (fs.sub) p += `/${fs.sub}`;
  if (fs.file) p += `/${fs.file.name}`;
  return p;
}

function icon(kind) {
  const i = el('span', `icon ${kind}`);
  i.setAttribute('aria-hidden', 'true');
  return i;
}

function row({ kind, name, desc, actions = [], onOpen, cls = '' }) {
  const r = el('div', `fs-row ${cls}`.trim());
  r.append(icon(kind), el('span', 'fs-name', name), el('span', 'fs-desc', desc || ''));
  const acts = el('span', 'fs-actions');
  acts.append(...actions);
  r.append(acts);
  if (onOpen) r.addEventListener('click', onOpen);
  return r;
}

function renderFiles() {
  // sidebar
  const offer = currentOffer();
  const pending = offer ? offer.items.length : 0;
  fsSide.replaceChildren(
    ...['script', 'incoming', 'tools', 'records'].map((dir) => {
      const b = button('', () => fsGoto(dir), `fs-side-item ${fs.dir === dir ? 'active' : ''}`);
      b.append(icon('folder'), el('span', '', dir));
      if (dir === 'incoming' && pending) b.append(el('span', 'badge', String(pending)));
      return b;
    }),
  );

  // path bar
  fsPath.replaceChildren();
  if (fs.file || fs.sub) {
    fsPath.append(button('‹', () => (fs.file ? fsGoto(fs.dir, fs.sub) : fsGoto(fs.dir)), 'back'));
  }
  fsPath.append(el('span', '', KG.path(fsPathText())));
  Desktop.setTitle('files', `Files — ${KG.path(fsPathText())}`);

  fsNote.textContent = '';
  fsView.classList.remove('as-file');
  if (fs.file) return renderFile();
  ({ script: renderScript, incoming: renderIncoming, tools: renderTools, records: renderRecords })[fs.dir]();
}

function cardFileText(id) {
  const card = CARDS[id];
  const notes = Object.entries(KEYWORDS)
    .filter(([word]) => card.text.includes(word))
    .map(([word, rule]) => `${word}: ${rule}`);
  return [card.name, '', card.text, ...(notes.length ? ['', ...notes] : [])].join('\n');
}

const FILE_NOTES = {
  card: 'a card in your script. ‹ goes back.',
  tool: 'an installed tool: active every hack. ‹ goes back.',
};

function renderFile() {
  fsView.classList.add('as-file');
  const f0 = fs.file;
  if (f0.type === 'record') {
    fsNote.textContent = S.archive[f0.pid].decoded
      ? 'decoded record. ‹ goes back.'
      : `encoded record: patient numbers stay readable. break the ${f0.pid} cipher to decode it.`;
  } else fsNote.textContent = FILE_NOTES[f0.type] || '';
  const pre = el('pre', 'fs-file');
  const f = fs.file;
  if (f.type === 'card') pre.textContent = cardFileText(f.id);
  if (f.type === 'tool') pre.textContent = `${TOOLS[f.id].name}\n\n${TOOLS[f.id].text}`;
  fsView.replaceChildren(pre);
  if (f.type !== 'record') {
    fsStatus.textContent = '';
    return;
  }
  const a = S.archive[f.pid];
  fsStatus.textContent = a.decoded ? 'decoded' : 'encoded';
  if (!a.decoded) pre.textContent = encoded(f.pid, f.idx);
  else if (!a.revealed[f.idx] || f.animate) {
    a.revealed[f.idx] = true;
    save();
    f.animate = false;
    f.done = unscramble(pre, f.pid, f.idx);
  } else pre.textContent = record(f.pid, f.idx).text;
}

function renderScript() {
  const refactor = S.rewards?.refactor;
  const locked = scriptLocked();
  if (refactor) fsNote.replaceChildren(el('span', '', 'refactor: delete one file from the script. '), button('cancel', cancelRefactor, 'link'));
  else if (locked) fsNote.textContent = 'your script is running — read only until the hack ends.';
  else fsNote.textContent = 'your script: runs top to bottom, then loops. drag or use ▲▼ to reorder; open a file to read the card.';

  const list = el('div', 'fs-list script-list');
  S.script.forEach((id, i) => {
    const actions = [];
    if (refactor && canRefactor(i)) actions.push(button('delete', () => refactorRemove(i), 'danger'));
    else if (!locked) {
      actions.push(button('▲', () => moveCard(i, i - 1), 'mini'), button('▼', () => moveCard(i, i + 1), 'mini'));
    }
    const r = row({ kind: 'file', name: scriptName(i), desc: CARDS[id].text, actions, cls: locked ? 'locked' : 'draggable' });
    r.dataset.idx = i;
    if (!locked && !refactor) makeDraggable(r, list);
    else r.addEventListener('click', () => fsGoto('script', null, { type: 'card', id, name: scriptName(i) }));
    list.append(r);
  });
  fsView.replaceChildren(list);
  fsStatus.textContent = `${S.script.length} files`;
}

function moveCard(from, to) {
  if (to < 0 || to >= S.script.length) return;
  const [c] = S.script.splice(from, 1);
  S.script.splice(to, 0, c);
  save();
  renderFiles();
}

// Pointer drag to reorder; a press without movement opens the file instead.
function makeDraggable(r, list) {
  r.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const startY = e.clientY;
    let dragging = false;
    // Listen on the document: moving the row in the DOM drops pointer capture.
    const move = (ev) => {
      if (!dragging && Math.abs(ev.clientY - startY) > 4) {
        dragging = true;
        r.classList.add('dragging');
        document.body.classList.add('dragging');
      }
      if (!dragging) return;
      let before = null;
      for (const other of list.children) {
        if (other === r) continue;
        const b = other.getBoundingClientRect();
        if (ev.clientY < b.top + b.height / 2) {
          before = other;
          break;
        }
      }
      list.insertBefore(r, before);
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      document.body.classList.remove('dragging');
      if (dragging) {
        const old = [...S.script];
        S.script = [...list.children].map((c) => old[Number(c.dataset.idx)]);
        save();
        renderFiles();
      } else {
        const i = Number(r.dataset.idx);
        fsGoto('script', null, { type: 'card', id: S.script[i], name: scriptName(i) });
      }
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  });
}

function renderIncoming() {
  const offer = currentOffer();
  if (!offer) {
    fsNote.textContent = 'rewards arrive here after each hack you win: new cards, maintenance, and a tool after each cipher.';
    fsView.replaceChildren(el('div', 'fs-empty', 'no files'));
    fsStatus.textContent = '0 files';
    return;
  }
  const r = S.rewards;
  const compiles = r.queue.filter((k) => k === 'compile').length;
  const label = {
    compile: `compile${compiles > 1 ? ` (${r.queue.slice(0, r.index + 1).filter((k) => k === 'compile').length} of ${compiles})` : ''}: keep one card to add it to the end of /script`,
    maintenance: 'maintenance: run one',
    tool: 'tool: install one',
  }[offer.kind];
  fsNote.replaceChildren(el('span', '', `${label}${SKIPPABLE[offer.kind] ? ', or skip' : ''}. `));
  if (SKIPPABLE[offer.kind]) fsNote.append(button('skip', skipOffer, 'note-btn'));

  const list = el('div', 'fs-list');
  for (const id of offer.items) {
    let desc;
    let verb = 'keep';
    let disabled = false;
    if (offer.kind === 'compile') desc = CARDS[id].text;
    if (offer.kind === 'tool') {
      desc = TOOLS[id].text;
      verb = 'install';
    }
    if (offer.kind === 'maintenance') {
      verb = 'run';
      desc = MAINTENANCE[id].text;
      const preview = { cover: S.cover, maxCover: S.maxCover };
      applyMaintenance(id, preview);
      if (id !== 'refactor') desc += `  (cover ${S.cover}/${S.maxCover} -> ${preview.cover}/${preview.maxCover})`;
      if (id === 'refactor' && !S.script.some((_, i) => canRefactor(i))) {
        disabled = true;
        desc = `unavailable: /script needs ${MIN_PERMANENT} non-temporary files`;
      }
    }
    const actions = [];
    if (!disabled) actions.push(button(verb, () => acceptOffer(id), 'primary'));
    list.append(row({ kind: 'file', name: `${id}.${fileExt[offer.kind]}`, desc, actions, cls: disabled ? 'disabled' : '' }));
  }
  fsView.replaceChildren(list);
  fsStatus.textContent = `offer ${r.index + 1} of ${r.queue.length}`;
}

function renderTools() {
  fsNote.textContent = 'installed tools are always active, every hack. a new one is offered after each cipher you break.';
  const list = el('div', 'fs-list');
  for (const id of S.tools) {
    list.append(row({ kind: 'bin', name: `${id}.bin`, desc: TOOLS[id].text, onOpen: () => fsGoto('tools', null, { type: 'tool', id, name: `${id}.bin` }) }));
  }
  fsView.replaceChildren(S.tools.length ? list : el('div', 'fs-empty', 'no files'));
  fsStatus.textContent = `${S.tools.length} files`;
}

function renderRecords() {
  const list = el('div', 'fs-list');
  if (!fs.sub) {
    fsNote.textContent = "each extraction recovers one encoded record. breaking a program's cipher decodes its folder.";
    for (const p of PROGRAMS) {
      const a = S.archive[p.id];
      const n = a.extracted.filter(Boolean).length;
      if (!n) continue;
      list.append(row({ kind: 'folder', name: p.id, desc: `${n} ${n === 1 ? 'record' : 'records'} · ${a.decoded ? 'decoded' : 'encoded'}`, onOpen: () => fsGoto('records', p.id) }));
    }
    fsView.replaceChildren(list.childElementCount ? list : el('div', 'fs-empty', 'no files'));
    fsStatus.textContent = `${list.childElementCount} folders`;
    return;
  }
  const a = S.archive[fs.sub];
  const found = a.extracted.filter(Boolean).length;
  fsNote.textContent = a.decoded
    ? `${fs.sub} is decoded. open a record to read it.`
    : `${found} of 4 records recovered, still encoded. break the ${fs.sub} cipher to decode them.`;
  a.extracted.forEach((has, idx) => {
    if (!has) return;
    const name = `R${pad2(idx + 1)}.rec`;
    list.append(row({ kind: 'file', name, desc: a.decoded ? record(fs.sub, idx).docId : 'encoded', onOpen: () => fsOpenRecord(fs.sub, idx) }));
  });
  fsView.replaceChildren(list);
  fsStatus.textContent = `${list.childElementCount} files`;
}

function fsOpenRecord(pid, idx, animate = false) {
  fsGoto('records', pid, { type: 'record', pid, idx, name: `R${pad2(idx + 1)}.rec`, animate });
  return fs.file.done || Promise.resolve();
}

// ---------------------------------------------------------------------------
// Notes

const npList = $('np-list');
const npPage = $('np-page');
let selectedNote = null;
let typing = false;

const fmtDate = (iso) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function renderNotepad() {
  npList.replaceChildren(
    ...S.notes.map((n) => {
      const li = el('li', n.id === selectedNote ? 'active' : '');
      li.append(el('span', 'np-date', fmtDate(n.date)), el('span', 'np-preview', n.text));
      li.addEventListener('click', () => {
        if (typing) return;
        selectedNote = n.id;
        renderNotepad();
      });
      return li;
    }),
  );
  const note = S.notes.find((n) => n.id === selectedNote);
  if (!typing) npPage.textContent = note ? note.text : '';
  Desktop.setTitle('notepad', note ? `Notes — ${fmtDate(note.date)}` : 'Notes');
}

let typeToken = 0;

// A newer typewriter cancels an older one; the older returns early.
async function typeInto(node, text, ms = 38) {
  const token = ++typeToken;
  node.textContent = '';
  const caret = el('span', 'np-caret');
  for (const ch of text) {
    node.textContent += ch;
    node.append(caret);
    await sleep(ch === '.' || ch === ',' ? ms * 6 : ms);
    caret.remove();
    if (token !== typeToken) return;
  }
  node.textContent = text;
}

// Notes open on their own and type out the first time.
async function addNote(id, text, ms) {
  Desktop.open('notepad');
  const existing = S.notes.find((n) => n.id === id);
  selectedNote = id;
  if (existing) return renderNotepad();
  S.notes.push({ id, text, date: new Date().toISOString() });
  save();
  typing = true;
  renderNotepad();
  const token = typeToken + 1;
  await typeInto(npPage, text, ms);
  if (token !== typeToken) return; // a newer note took over the page
  typing = false;
  renderNotepad();
}

// ---------------------------------------------------------------------------
// Flow: ready → running → rewards → ready ... → ending

function statusLine() {
  const tools = S.tools.length ? S.tools.map((t) => TOOLS[t].name.toLowerCase()).join(', ') : 'none';
  return `[status] cover ${S.cover}/${S.maxCover}    script ${S.script.length} files    tools: ${tools}`;
}

function enterReady() {
  const info = hackInfo(S.hack);
  if (!S.reconShown) {
    const types = CARD_POOL.filter((c) => makeCountermeasures(S.opSeed, S.hack).includes(c)).map((c) => CARDS[c].name);
    appendLine(`recon --target ${info.target}`, 'cmd');
    appendLine(`[recon]  ${info.label}    integrity ${info.integrity}`, 'recon');
    appendLine(`[recon]  countermeasures: ${types.join(', ')}    (counts unknown)`, 'recon');
    appendLine(statusLine(), 'recon');
    S.reconShown = true;
    save();
  }
  setPrompt(`run ./script --target ${info.target}`, runHack);
  panelState = null;
  renderPanel(panelPreview());
  hintsForPhase();
  renderFiles();
}

function runHack() {
  if (S.phase !== 'ready' || play) return;
  S.run = { hack: S.hack, script: [...S.script], cover: S.cover, maxCover: S.maxCover, tools: [...S.tools] };
  S.phase = 'running';
  save(); // committed: a reload replays this exact hack instead of rerolling it
  startRun(false);
}

function startRun(instant) {
  const result = simulateHack(hackInput(S.opSeed, S.run.hack, S.run));
  appendLine(`run ./script --target ${hackInfo(S.run.hack).target}`, 'cmd');
  renderFiles();
  const maxes = { jo: S.run.maxCover, sys: hackInfo(S.run.hack).integrity };
  const base = { maxCover: maxes.jo, maxIntegrity: maxes.sys };
  const lines = result.events.map((e) => {
    const state = e.state ? { ...base, ...e.state } : null;
    return [...formatEvent(e, maxes), state];
  });
  panelState = null; // a new hack: nothing flashes on its first frame
  renderPanel({ ...base, jo: freshStats(S.run.cover), sys: freshStats(maxes.sys) });
  playback(lines, () => finishHack(result));
  if (instant) skipPlayback();
}

function finishHack(result) {
  const info = hackInfo(S.hack);
  const pid = info.program.id;
  S.run = null;

  if (!result.won) {
    S.cover = 0;
    S.phase = 'traced';
    appendLine(`[result] ${hpBar('jo', 0, 0, { jo: S.maxCover })}`, 'lost');
    appendLine('Connection lost. Session terminated.', 'lost');
    save();
    setPrompt('reconnect', reconnect);
    hintsForPhase();
    renderFiles();
    return;
  }

  S.cover = result.cover;
  const a = S.archive[pid];
  if (info.isDecode) {
    a.extracted = [true, true, true, true];
    a.decoded = true;
    a.revealed = [false, false, false, false];
    appendLine(`[result] integrity 0. ${pid} Cipher broken. records decoded: /records/${pid}/`, 'result');
  } else {
    a.extracted[info.slot] = true;
    appendLine(`[result] integrity 0. record recovered: /records/${pid}/R${pad2(info.slot + 1)}.rec`, 'result');
  }
  appendLine(`[result] ${hpBar('jo', S.cover, S.cover, { jo: S.maxCover })}`, 'result');

  if (S.hack === TOTAL_HACKS) {
    S.phase = 'ending';
    save();
    runEnding();
    return;
  }

  S.phase = 'rewards';
  S.rewards = { queue: rewardsFor(S.hack), index: 0, refactor: false };
  save();
  setPrompt(null);
  hintsForPhase();
  announceOffer();

  if (info.isDecode) revealProgram(info.program);
  else fsGoto('incoming');
}

async function revealProgram(program) {
  Desktop.open('files');
  await fsOpenRecord(program.id, 3);
  await sleep(1200);
  if (program.line) await addNote(`line-${program.id}`, program.line);
}

function reconnect() {
  appendLine('reconnect', 'cmd');
  newOperation(S);
  appendLine(`[session] operation ${S.opNumber}`, 'recon');
  save();
  fsGoto('script');
  enterReady();
}

// ---------------------------------------------------------------------------
// Rewards: offers arrive one at a time in /incoming.

function currentOffer() {
  const r = S?.rewards;
  if (S?.phase !== 'rewards' || !r || r.index >= r.queue.length) return null;
  const kind = r.queue[r.index];
  return { kind, items: offerItems(S.opSeed, S.hack, r.index, kind, S.tools) };
}

function announceOffer() {
  const offer = currentOffer();
  if (!offer) return finishRewards();
  if (!offer.items.length) return advanceOffer(); // e.g. every Tool already owned
  appendLine(`[incoming] ${offer.kind}: ${offer.items.length} files in /incoming`, 'info');
  renderFiles();
}

function advanceOffer() {
  S.rewards.index++;
  S.rewards.refactor = false;
  save();
  announceOffer();
}

function acceptOffer(id) {
  const offer = currentOffer();
  if (!offer) return;
  if (offer.kind === 'compile') {
    S.script.push(id);
    appendLine(`[script] ${id}.card -> /script/${scriptName(S.script.length - 1)}`, 'info');
  } else if (offer.kind === 'tool') {
    S.tools.push(id);
    appendLine(`[tools] ${id}.bin -> /tools/${id}.bin`, 'info');
  } else if (id === 'refactor') {
    S.rewards.refactor = true;
    save();
    fsGoto('script');
    return;
  } else {
    const before = { cover: S.cover, maxCover: S.maxCover };
    applyMaintenance(id, S);
    const max = before.maxCover !== S.maxCover ? `max cover ${before.maxCover} -> ${S.maxCover}, ` : '';
    appendLine(`[maintenance] ${MAINTENANCE[id].name.toLowerCase()}: ${max}cover ${before.cover} -> ${S.cover}`, 'info');
  }
  advanceOffer();
}

function skipOffer() {
  const offer = currentOffer();
  if (!offer || !SKIPPABLE[offer.kind]) return;
  appendLine(`[incoming] ${offer.kind} skipped`, 'info');
  advanceOffer();
}

// Removing a card may not drop the script below MIN_PERMANENT non-Temporary cards.
function canRefactor(i) {
  return permanentCount(S.script.filter((_, j) => j !== i)) >= MIN_PERMANENT;
}

function refactorRemove(i) {
  if (!canRefactor(i)) return;
  const name = scriptName(i);
  S.script.splice(i, 1);
  appendLine(`[maintenance] refactor: removed /script/${name}`, 'info');
  advanceOffer();
  fsGoto(S.phase === 'rewards' ? 'incoming' : 'script');
}

function cancelRefactor() {
  S.rewards.refactor = false;
  save();
  fsGoto('incoming');
}

function finishRewards() {
  S.hack++;
  S.phase = 'ready';
  S.rewards = null;
  S.reconShown = false;
  save();
  fsGoto('script');
  enterReady();
}

// ---------------------------------------------------------------------------
// Ending: quiet, unresolved. Not skippable.

async function runEnding() {
  setPrompt(null);
  setHints([]);
  renderPanel(null);
  await sleep(1400);
  Desktop.open('files');
  await fsOpenRecord('EVERGREEN', 3, true);
  fsView.scrollTop = fsView.scrollHeight;
  await sleep(5000);

  Desktop.open('notepad');
  S.notes = S.notes.filter((n) => n.id !== 'mabel'); // a resumed ending types it again
  await addNote('mabel', STORY.note, 70);
  await sleep(2200);

  Desktop.focus('terminal');
  appendLine('print: 1 page sent.', 'info');
  await sleep(2800);

  for (const id of ['notepad', 'files', 'terminal']) {
    Desktop.close(id);
    await sleep(350);
  }
  await sleep(2600);

  document.body.classList.add('last-note');
  selectedNote = null;
  npPage.textContent = '';
  Desktop.setTitle('notepad', 'Notes');
  Desktop.open('notepad');
  await sleep(900);
  await typeInto(npPage, STORY.closing, 55);
  await sleep(5000);

  S.phase = 'complete';
  save();
  showTitleCard();
}

function showTitleCard() {
  const fade = $('fade');
  $('title-card').textContent = STORY.title;
  fade.classList.add('on');
  setTimeout(() => fade.classList.add('done'), 3500);
}

$('begin-again').addEventListener('click', () => {
  newOperation(S);
  S.log = [];
  save();
  location.reload();
});

// ---------------------------------------------------------------------------
// Keys: Enter runs the pre-filled command; during a hack, space pauses,
// f changes speed and Enter/Esc skips to the end.

document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (play) {
    if (e.key === ' ') togglePause();
    else if (e.key === 'f' || e.key === 'F') cycleSpeed();
    else if (e.key === 'Enter' || e.key === 'Escape') skipPlayback();
    else return;
    e.preventDefault();
    return;
  }
  if (e.key === 'Enter' && prompt) {
    e.preventDefault();
    prompt.action();
  }
});

// ---------------------------------------------------------------------------
// Debug hooks (used by debug.js)

const Game = {
  state: () => S,
  jumpTo(n) {
    if (play || ['ending', 'complete'].includes(S.phase)) return;
    S.hack = Math.min(TOTAL_HACKS, Math.max(1, n));
    S.phase = 'ready';
    S.rewards = null;
    S.run = null;
    S.reconShown = false;
    appendLine(`[debug] jump to hack ${S.hack}`, 'info');
    save();
    fsGoto('script');
    enterReady();
  },
  setCover(n) {
    S.cover = Math.max(1, Math.min(S.maxCover, n));
    appendLine(`[debug] ${statusLine()}`, 'info');
    save();
  },
  grantTool(id) {
    if (S.tools.includes(id)) return;
    S.tools.push(id);
    save();
    renderFiles();
  },
  decodeAll() {
    for (const p of PROGRAMS) Object.assign(S.archive[p.id], { extracted: [true, true, true, true], decoded: true });
    save();
    renderFiles();
  },
  resetAll() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
    location.reload();
  },
  resetLayout: () => Desktop.resetLayout(),
};

// ---------------------------------------------------------------------------
// Boot

function boot() {
  for (const id of ['notepad', 'files', 'terminal']) Desktop.register(id);

  const loaded = loadJSON(SAVE_KEY);
  const firstVisit = !loaded || loaded.v !== 1;
  if (firstVisit) newOperation(null);
  else S = loaded;

  renderTermLog();
  selectedNote = S.notes.at(-1)?.id || null;
  renderNotepad();
  fsGoto(S.phase === 'rewards' ? 'incoming' : 'script');
  Desktop.focus('terminal');

  if (firstVisit) {
    appendLine('ev-ws-4471 · Evergreen internal workstation', 'dim');
    appendLine('Authorized use only. Activity may be monitored.', 'dim');
  }

  switch (S.phase) {
    case 'ready':
      enterReady();
      break;
    case 'running':
      startRun(true);
      break;
    case 'rewards':
      setPrompt(null);
      hintsForPhase();
      break;
    case 'traced':
      setPrompt('reconnect', reconnect);
      hintsForPhase();
      break;
    case 'ending':
      runEnding();
      break;
    case 'complete':
      for (const id of ['notepad', 'files', 'terminal']) Desktop.close(id);
      showTitleCard();
      break;
  }

  if (firstVisit) addNote('opening', STORY.opening);
}

// Redraw everything that's written in the OS's style.
KG.onChange(() => {
  renderTermLog();
  if (termPrompt.querySelector('.ps1')) setPrompt(prompt?.cmd, prompt?.action);
  renderFiles();
});

boot();
