// The terminal window, after Jo's Discovery's desktop: drag it by the title
// bar, resize it from any edge or corner, double-click the title bar to
// maximize/restore. Unlike Jo's, the layout isn't remembered — this game
// saves nothing to the browser — so every load starts centered.

(() => {
  const MIN_W = 420;
  const MIN_H = 300;
  const MARGIN = 24; // how much of the title bar must stay on screen
  const narrow = window.matchMedia('(max-width: 600px)');

  const win = document.getElementById('term');
  const titlebar = document.getElementById('titlebar');

  let rect = defaultRect();
  let restoreRect = null; // set while maximized

  function defaultRect() {
    const w = Math.min(760, window.innerWidth - 80);
    const h = Math.min(560, window.innerHeight - 80);
    return { x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2.6, w, h };
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
    if (narrow.matches) {
      win.style.cssText = '';
      return;
    }
    rect = clamp(rect);
    Object.assign(win.style, {
      left: `${rect.x}px`,
      top: `${rect.y}px`,
      width: `${rect.w}px`,
      height: `${rect.h}px`,
    });
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
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
    const grip = document.createElement('div');
    grip.className = `grip ${edge}`;
    win.append(grip);
    grip.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || narrow.matches) return;
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
  }

  titlebar.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || narrow.matches) return;
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
    if (narrow.matches) return;
    if (restoreRect) {
      rect = restoreRect;
      restoreRect = null;
    } else {
      restoreRect = rect;
      rect = { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight };
    }
    apply();
  });

  window.addEventListener('resize', apply);
  narrow.addEventListener('change', apply);
  apply();
})();
