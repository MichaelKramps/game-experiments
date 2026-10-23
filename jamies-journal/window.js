// The terminal window: drag it by the title bar, resize it from any edge or
// corner, double-click the title bar to maximize/restore. Position and size
// are remembered per browser.

(() => {
  const WINDOW_KEY = 'jamies-journal-window';
  const MIN_W = 420;
  const MIN_H = 280;
  const MARGIN = 24; // how much of the title bar must stay on screen

  const win = document.getElementById('term');
  const titlebar = document.getElementById('titlebar');

  let rect = loadRect() || defaultRect();
  let restoreRect = null; // set while maximized

  function defaultRect() {
    const w = Math.min(860, window.innerWidth - 80);
    const h = Math.min(560, window.innerHeight - 80);
    return { x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2.4, w, h };
  }

  function loadRect() {
    try {
      const saved = JSON.parse(localStorage.getItem(WINDOW_KEY));
      return saved && typeof saved.w === 'number' ? saved : null;
    } catch {
      return null;
    }
  }

  function saveRect() {
    try {
      localStorage.setItem(WINDOW_KEY, JSON.stringify(restoreRect || rect));
    } catch {
      // storage unavailable — window just won't remember its spot
    }
  }

  // Keep the window usable: not smaller than the minimum, not bigger than the
  // viewport, and with enough title bar on screen to grab it again.
  function clamp(r) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.max(MIN_W, Math.min(r.w, vw));
    const h = Math.max(MIN_H, Math.min(r.h, vh));
    const x = Math.min(Math.max(r.x, MARGIN - w), vw - MARGIN * 3);
    const y = Math.min(Math.max(r.y, 0), vh - MARGIN);
    return { x, y, w, h };
  }

  function apply() {
    rect = clamp(rect);
    win.style.left = `${rect.x}px`;
    win.style.top = `${rect.y}px`;
    win.style.width = `${rect.w}px`;
    win.style.height = `${rect.h}px`;
  }

  // Shared pointer-drag plumbing for moving and resizing.
  function track(e, onMove) {
    e.preventDefault();
    const start = { px: e.clientX, py: e.clientY, ...rect };
    document.body.classList.add('dragging');
    const move = (ev) => {
      onMove(ev.clientX - start.px, ev.clientY - start.py, start);
      apply();
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.body.classList.remove('dragging');
      saveRect();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  titlebar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    track(e, (dx, dy, s) => {
      if (restoreRect) {
        // Dragging a maximized window restores it under the cursor.
        const frac = (s.px - s.x) / s.w;
        rect = { ...restoreRect, x: s.px + dx - restoreRect.w * frac, y: s.y + dy };
        s.x = rect.x - dx;
        s.w = restoreRect.w;
        restoreRect = null;
        return;
      }
      rect = { ...rect, x: s.x + dx, y: s.y + dy };
    });
  });

  titlebar.addEventListener('dblclick', () => {
    if (restoreRect) {
      rect = restoreRect;
      restoreRect = null;
    } else {
      restoreRect = rect;
      rect = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    }
    apply();
    saveRect();
  });

  document.querySelectorAll('.grip').forEach((grip) => {
    const edge = grip.dataset.edge;
    grip.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      restoreRect = null;
      track(e, (dx, dy, s) => {
        let { x, y, w, h } = s;
        if (edge.includes('e')) w = Math.max(MIN_W, s.w + dx);
        if (edge.includes('s')) h = Math.max(MIN_H, s.h + dy);
        if (edge.includes('w')) {
          w = Math.max(MIN_W, s.w - dx);
          x = s.x + s.w - w;
        }
        if (edge.includes('n')) {
          h = Math.max(MIN_H, s.h - dy);
          y = s.y + s.h - h;
        }
        rect = { x, y, w, h };
      });
    });
  });

  window.addEventListener('resize', apply);
  apply();
})();
