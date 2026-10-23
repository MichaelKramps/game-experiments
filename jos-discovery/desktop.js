// The desktop: three windows (terminal, files, notepad). Drag a window by its
// title bar, resize from any edge or corner, double-click the title bar to
// maximize/restore, click anywhere in it to bring it to the front. Positions
// and sizes are remembered per browser. Windows stay inside the site shell's
// work area (../os/os.js); on phones they stack in a column instead.

const Desktop = (() => {
  const LAYOUT_KEY = 'jos-discovery-windows';
  const MIN_W = 320;
  const MIN_H = 180;
  const MARGIN = 24; // how much of the title bar must stay on screen
  const narrow = { get matches() { return KG.os() === 'phone'; } };

  const wins = {};
  let saved = load();
  let topZ = 10;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(LAYOUT_KEY)) || {};
    } catch {
      return {};
    }
  }

  function persist() {
    const out = {};
    for (const [id, w] of Object.entries(wins)) out[id] = w.restoreRect || w.rect;
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(out));
    } catch {
      // storage unavailable — layout resets next visit
    }
  }

  function defaultRects() {
    const a = KG.workArea();
    const pad = 16;
    const topH = Math.round(a.h * 0.6);
    const termW = Math.round(Math.min(780, a.w * 0.54));
    const filesX = a.x + pad + termW + 14;
    return {
      terminal: { x: a.x + pad, y: a.y + pad, w: termW, h: topH },
      files: { x: filesX, y: a.y + pad + 28, w: Math.max(MIN_W, a.x + a.w - filesX - pad), h: topH },
      notepad: {
        x: a.x + pad + 40,
        y: a.y + pad + topH + 14,
        w: Math.round(Math.min(620, a.w * 0.45)),
        h: Math.max(MIN_H, a.h - topH - pad * 2 - 14),
      },
    };
  }

  function clamp(r) {
    const a = KG.workArea();
    const w = Math.max(MIN_W, Math.min(r.w, a.w));
    const h = Math.max(MIN_H, Math.min(r.h, a.h));
    const x = Math.max(a.x, Math.min(r.x, a.x + a.w - w)); // never over the desktop icons
    const y = Math.min(Math.max(r.y, a.y), a.y + a.h - MARGIN);
    return { x, y, w, h };
  }

  function apply(w) {
    if (narrow.matches) {
      w.el.style.cssText = '';
      return;
    }
    if (w.restoreRect) w.rect = { ...KG.workArea() };
    w.rect = clamp(w.rect);
    Object.assign(w.el.style, {
      left: `${w.rect.x}px`,
      top: `${w.rect.y}px`,
      width: `${w.rect.w}px`,
      height: `${w.rect.h}px`,
      zIndex: w.z,
    });
  }

  function focus(id) {
    const w = wins[id];
    if (!w) return;
    w.z = ++topZ;
    w.el.style.zIndex = w.z;
    for (const other of Object.values(wins)) other.el.classList.toggle('focused', other === w);
  }

  // Shared pointer-drag plumbing for moving and resizing.
  function track(e, w, onMove) {
    e.preventDefault();
    const start = { px: e.clientX, py: e.clientY, ...w.rect };
    document.body.classList.add('dragging');
    const move = (ev) => {
      onMove(ev.clientX - start.px, ev.clientY - start.py, start);
      apply(w);
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.body.classList.remove('dragging');
      persist();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  function register(id) {
    const el = document.querySelector(`.window[data-win="${id}"]`);
    const titlebar = el.querySelector('.titlebar');
    const w = { id, el, rect: saved[id] || defaultRects()[id], restoreRect: null, z: ++topZ };
    wins[id] = w;

    for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      const grip = document.createElement('div');
      grip.className = `grip ${edge}`;
      el.append(grip);
      grip.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || narrow.matches) return;
        w.restoreRect = null;
        track(e, w, (dx, dy, s) => {
          let { x, y, w: width, h } = s;
          if (edge.includes('e')) width = Math.max(MIN_W, s.w + dx);
          if (edge.includes('s')) h = Math.max(MIN_H, s.h + dy);
          if (edge.includes('w')) {
            width = Math.max(MIN_W, s.w - dx);
            x = s.x + s.w - width;
          }
          if (edge.includes('n')) {
            h = Math.max(MIN_H, s.h - dy);
            y = s.y + s.h - h;
          }
          w.rect = { x, y, w: width, h };
        });
      });
    }

    el.addEventListener('pointerdown', () => focus(id), true);

    titlebar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || narrow.matches || e.target.closest('.lights')) return;
      track(e, w, (dx, dy, s) => {
        if (w.restoreRect) {
          // Dragging a maximized window restores it under the cursor.
          const frac = (s.px - s.x) / s.w;
          w.rect = { ...w.restoreRect, x: s.px + dx - w.restoreRect.w * frac, y: s.y + dy };
          s.x = w.rect.x - dx;
          s.w = w.restoreRect.w;
          w.restoreRect = null;
          return;
        }
        w.rect = { ...w.rect, x: s.x + dx, y: s.y + dy };
      });
    });

    const toggleMax = () => {
      if (narrow.matches) return;
      if (w.restoreRect) {
        w.rect = w.restoreRect;
        w.restoreRect = null;
      } else {
        w.restoreRect = w.rect;
      }
      apply(w);
      persist();
    };
    titlebar.addEventListener('dblclick', (e) => !e.target.closest('.lights') && toggleMax());
    titlebar.querySelector('.lights .max').addEventListener('click', toggleMax);

    apply(w);
  }

  function setTitle(id, text) {
    wins[id].el.querySelector('.window-title').textContent = text;
  }

  function close(id) {
    wins[id].el.classList.add('closed');
  }

  function open(id) {
    wins[id].el.classList.remove('closed');
    focus(id);
  }

  function resetLayout() {
    saved = {};
    const rects = defaultRects();
    for (const w of Object.values(wins)) {
      w.rect = rects[w.id];
      w.restoreRect = null;
      apply(w);
    }
    persist();
  }

  window.addEventListener('resize', () => Object.values(wins).forEach(apply));
  KG.onChange(() => Object.values(wins).forEach(apply));

  return { register, focus, setTitle, close, open, resetLayout };
})();
