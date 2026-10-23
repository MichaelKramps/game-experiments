// The site shell: every page (and every listed game) pretends to be a desktop
// computer. Load this file in <head>, before any stylesheet that depends on
// it, so the OS and theme are stamped on <html> before the first paint:
//
//   <html data-os="value|quality|power|phone" data-theme="light|dark">
//
// Settings (OS + theme) live in localStorage and apply site-wide. On phones
// the OS is always "phone" — a generic layout — and only the theme applies.
//
// Once the DOM is ready the shell adds the desktop icons (Home, Games, About,
// Settings), the OS's bar (taskbar / menu bar / top bar), a launcher menu and
// the Settings window. Pages describe their open windows with
// <div class="window" data-app="Terminal|Files|Notes"> so the bars can list them.
//
// Games use window.KG:
//   KG.os()            effective OS ('phone' on narrow screens)
//   KG.pick({...})     per-OS value; phone falls back to `power`
//   KG.workArea()      viewport rect windows may use (excludes bars + icons)
//   KG.onChange(fn)    called after the OS/theme or phone layout changes
//   KG.makeWindow(el, opts)  drag/resize/maximize within the work area
//   KG.prompt(user, host, dir)  a shell prompt in the current OS's style
//   KG.path(p)         a path written with the current OS's separators
//
// It also loads Google Analytics, so every page that includes it is tracked.

(() => {
  const KEY = 'kramps-os-settings';
  const OSES = { value: 'Value', quality: 'Quality', power: 'Power' };
  const THEMES = { light: 'Light', dark: 'Dark' };
  const DEFAULTS = { os: 'value', theme: 'light' };
  const PHONE = window.matchMedia('(max-width: 760px)');
  const ICON_COLUMN = 104;
  const BARS = {
    value: { top: 0, bottom: 48 },
    quality: { top: 26, bottom: 0 },
    power: { top: 32, bottom: 0 },
    phone: { top: 0, bottom: 64 },
  };

  const root = document.documentElement;
  const siteRoot = new URL('../', document.currentScript.src);
  const listeners = [];
  let settings = load();

  function load() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      // storage unavailable or corrupt — defaults
    }
    return {
      os: saved.os in OSES ? saved.os : DEFAULTS.os,
      theme: saved.theme in THEMES ? saved.theme : DEFAULTS.theme,
    };
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // storage unavailable — settings last for this page only
    }
  }

  function os() {
    return PHONE.matches ? 'phone' : settings.os;
  }

  function stamp() {
    root.dataset.os = os();
    root.dataset.theme = settings.theme;
    if (os() === 'power') loadFonts();
  }

  // Power's look leans on the Ubuntu typeface, which most visitors don't have.
  let fontsLoaded = false;
  function loadFonts() {
    if (fontsLoaded) return;
    fontsLoaded = true;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&family=Ubuntu+Mono&display=swap';
    document.head.append(link);
  }

  // Google Analytics (GA4), skipped for local testing.
  function analytics() {
    const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (local) return;
    const id = 'G-Z9KTWQCDD0';
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.append(tag);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', id);
  }

  function changed() {
    stamp();
    if (document.body) renderShell();
    for (const fn of listeners) fn();
  }

  function set(patch) {
    settings = { ...settings, ...patch };
    save();
    changed();
  }

  stamp();
  analytics();
  PHONE.addEventListener('change', changed);
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    settings = load();
    changed();
  });

  // -------------------------------------------------------------------------
  // Helpers for games

  function pick(map) {
    return map[os()] ?? map.power;
  }

  function workArea() {
    const o = os();
    const bar = BARS[o];
    let x = 0;
    let w = window.innerWidth;
    if (o !== 'phone') {
      w -= ICON_COLUMN;
      if (o !== 'quality') x = ICON_COLUMN; // Quality keeps its icons on the right
    }
    return { x, y: bar.top, w, h: window.innerHeight - bar.top - bar.bottom };
  }

  // `dir` is written unix-style relative to home: '~', '~/journal'.
  function prompt(user, host, dir = '~') {
    return pick({
      value: `PS ${winPath(user, dir)}> `,
      quality: `${user}@${host} ${dir === '~' ? '~' : dir.split('/').pop()} % `,
      power: `${user}@${host}:${dir}$ `,
    });
  }

  function winPath(user, p) {
    return p.replace(/^~/, `C:\\Users\\${user}`).replace(/\//g, '\\');
  }

  function path(p) {
    return os() === 'value' ? p.replace(/\//g, '\\') : p;
  }

  // -------------------------------------------------------------------------
  // Draggable, resizable windows confined to the work area. Double-click the
  // title bar to maximize/restore. On phones the window is left to CSS.
  // opts: { minW, minH, rect: (area) => rect, storageKey }

  function makeWindow(win, opts = {}) {
    const MIN_W = opts.minW || 320;
    const MIN_H = opts.minH || 200;
    const MARGIN = 24; // how much of the title bar must stay on screen
    const titlebar = win.querySelector('.titlebar');
    const defaultRect = () => {
      const a = workArea();
      if (opts.rect) return opts.rect(a);
      const w = Math.min(760, a.w - 60);
      const h = Math.min(540, a.h - 60);
      return { x: a.x + (a.w - w) / 2, y: a.y + (a.h - h) / 2.6, w, h };
    };

    let rect = loadRect() || defaultRect();
    let restoreRect = null; // set while maximized

    function loadRect() {
      if (!opts.storageKey) return null;
      try {
        const saved = JSON.parse(localStorage.getItem(opts.storageKey));
        return saved && typeof saved.w === 'number' ? saved : null;
      } catch {
        return null;
      }
    }

    function saveRect() {
      if (!opts.storageKey) return;
      try {
        localStorage.setItem(opts.storageKey, JSON.stringify(restoreRect || rect));
      } catch {
        // storage unavailable — the window just won't remember its spot
      }
    }

    // Keep the window usable: not smaller than the minimum, not bigger than
    // the work area, never over the desktop icons, and with enough title bar
    // inside it to grab again.
    function clamp(r) {
      const a = workArea();
      const w = Math.max(MIN_W, Math.min(r.w, a.w));
      const h = Math.max(MIN_H, Math.min(r.h, a.h));
      const x = Math.max(a.x, Math.min(r.x, a.x + a.w - w));
      const y = Math.min(Math.max(r.y, a.y), a.y + a.h - MARGIN);
      return { x, y, w, h };
    }

    function apply() {
      if (os() === 'phone') {
        win.style.cssText = '';
        return;
      }
      if (restoreRect) rect = { ...workArea() };
      rect = clamp(rect);
      Object.assign(win.style, {
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.w}px`,
        height: `${rect.h}px`,
      });
    }

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

    for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      const grip = document.createElement('div');
      grip.className = `grip ${edge}`;
      win.append(grip);
      grip.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || os() === 'phone') return;
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
      if (e.button !== 0 || os() === 'phone' || e.target.closest('.lights')) return;
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

    function toggleMax() {
      if (os() === 'phone') return;
      if (restoreRect) {
        rect = restoreRect;
        restoreRect = null;
      } else {
        restoreRect = rect;
      }
      apply();
      saveRect();
    }

    titlebar.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.lights')) toggleMax();
    });
    win.querySelector('.lights .max')?.addEventListener('click', toggleMax);

    window.addEventListener('resize', apply);
    listeners.push(apply);
    apply();
    return { apply, toggleMax };
  }

  // -------------------------------------------------------------------------
  // Shell UI

  const ICONS = {
    home: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="8" width="38" height="26" rx="3" class="i-frame"/><rect x="8" y="11" width="32" height="20" rx="1.5" class="i-screen"/><path d="M20 34h8l1 5H19z" class="i-stand"/><rect x="14" y="39" width="20" height="3" rx="1.5" class="i-stand"/></svg>`,
    games: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 12a3 3 0 0 1 3-3h11l4 4h19a3 3 0 0 1 3 3v4H4z" class="i-folder-back"/><rect x="4" y="16" width="40" height="25" rx="3" class="i-folder"/><path d="M17 26h6m-3-3v6" class="i-folder-mark"/><circle cx="29" cy="25" r="1.6" class="i-folder-dot"/><circle cx="32" cy="29" r="1.6" class="i-folder-dot"/></svg>`,
    about: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11 4.5h18l9.5 9.5v28a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z" class="i-paper"/><path d="M29 4.5V12a2 2 0 0 0 2 2h7.5" class="i-fold"/><path d="M15 21h18M15 26h18M15 31h18M15 36h11" class="i-lines"/></svg>`,
    settings: `<svg viewBox="0 0 48 48" aria-hidden="true"><g class="i-gear">${[0, 45, 90, 135, 180, 225, 270, 315]
      .map((a) => `<rect x="20.5" y="5" width="7" height="10" rx="1.5" transform="rotate(${a} 24 24)"/>`)
      .join('')}<circle cx="24" cy="24" r="13"/></g><circle cx="24" cy="24" r="5.5" class="i-hub"/></svg>`,
    launcher: `<svg viewBox="0 0 20 20" aria-hidden="true">${[3, 10, 17]
      .flatMap((y) => [3, 10, 17].map((x) => `<circle cx="${x}" cy="${y}" r="2"/>`))
      .join('')}</svg>`,
    mark: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2 18 10 10 18 2 10z"/></svg>`,
    search: `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4.5 4.5"/></svg>`,
    wifi: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 8a12 12 0 0 1 16 0M5 11a8 8 0 0 1 10 0M8 14a4 4 0 0 1 4 0"/><circle cx="10" cy="16.5" r="1"/></svg>`,
    volume: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8h3l4-3.5v11L6 12H3z"/><path d="M13 7.5a3.5 3.5 0 0 1 0 5M15 5a7 7 0 0 1 0 10"/></svg>`,
    battery: `<svg viewBox="0 0 24 20" aria-hidden="true"><rect x="2" y="6" width="18" height="9" rx="2.5"/><path d="M22 9v3"/><rect x="4" y="8" width="11" height="5" rx="1" class="i-fill"/></svg>`,
    power: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3v6M6 5.5a6 6 0 1 0 8 0"/></svg>`,
    Terminal: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3" class="i-term"/><path d="m6 9 3 3-3 3M11 15h6" class="i-term-mark"/></svg>`,
    Files: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v1H2z" class="i-folder-back"/><rect x="2" y="9" width="20" height="11" rx="2" class="i-folder"/></svg>`,
    Notes: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="2.5" width="16" height="19" rx="2.5" class="i-paper"/><path d="M8 8h8M8 12h8M8 16h5" class="i-lines"/></svg>`,
    Welcome: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3" class="i-welcome"/><path d="M12 9v.01M12 12v4" class="i-welcome-mark"/></svg>`,
  };

  const NAV = [
    { id: 'home', label: 'Home', href: 'index.html' },
    { id: 'games', label: 'Games', href: 'games.html' },
    { id: 'about', label: 'About', href: 'about.html' },
    { id: 'settings', label: 'Settings' },
  ];

  const els = {};

  function h(tag, attrs = {}, html = '') {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    node.innerHTML = html;
    return node;
  }

  function currentPage() {
    const file = location.pathname.split('/').pop() || 'index.html';
    const here = new URL('.', location.href).href;
    if (here !== siteRoot.href) return 'games'; // a game, one folder down
    return { 'index.html': 'home', index: 'home', 'games.html': 'games', games: 'games', 'about.html': 'about', about: 'about' }[file];
  }

  function navItem(item, cls) {
    const inner = `<span class="kg-icon-art">${ICONS[item.id]}</span><span class="kg-icon-label">${item.label}</span>`;
    const node = item.href
      ? h('a', { class: cls, href: new URL(item.href, siteRoot).href }, inner)
      : h('button', { class: cls, type: 'button', 'data-kg-open': 'settings' }, inner);
    if (item.id === currentPage()) node.setAttribute('aria-current', 'page');
    return node;
  }

  function apps() {
    const names = [...document.querySelectorAll('.window[data-app]:not(.kg-dialog)')].map((w) => w.dataset.app);
    return [...new Set(names)];
  }

  function buildIcons() {
    const nav = h('nav', { class: 'kg-icons', 'aria-label': 'Site' });
    for (const item of NAV) nav.append(navItem(item, 'kg-icon'));
    return nav;
  }

  function buildBar() {
    const o = os();
    const running = apps();
    if (o === 'value') {
      return h(
        'div',
        { class: 'kg-bar kg-taskbar' },
        `<div class="kg-task-center">
          <button class="kg-task-btn kg-start" type="button" data-kg-open="menu" aria-label="Start">${ICONS.launcher}</button>
          <div class="kg-search">${ICONS.search}<span>Search</span></div>
          ${running.map((a) => `<span class="kg-task-btn kg-running" title="${a}">${ICONS[a] || ''}</span>`).join('')}
        </div>
        <div class="kg-tray">${ICONS.wifi}${ICONS.volume}<span class="kg-clock" data-fmt="value"></span></div>`,
      );
    }
    if (o === 'quality') {
      const app = running[0] || 'Files';
      return h(
        'div',
        { class: 'kg-bar kg-menubar' },
        `<button class="kg-mark" type="button" data-kg-open="menu" aria-label="Menu">${ICONS.mark}</button>
        <b>${app}</b>
        ${['File', 'Edit', 'View', 'Window', 'Help'].map((m) => `<span>${m}</span>`).join('')}
        <span class="kg-spacer"></span>
        ${ICONS.battery}${ICONS.wifi}<span class="kg-clock" data-fmt="quality"></span>`,
      );
    }
    if (o === 'power') {
      return h(
        'div',
        { class: 'kg-bar kg-topbar' },
        `<button class="kg-activities" type="button" data-kg-open="menu">Activities</button>
        <span class="kg-clock" data-fmt="power"></span>
        <span class="kg-status">${ICONS.wifi}${ICONS.volume}${ICONS.power}</span>`,
      );
    }
    return null;
  }

  function buildMenu() {
    const menu = h('div', { class: 'kg-menu', hidden: '' });
    menu.append(h('div', { class: 'kg-menu-head' }, 'Kramps Games'));
    for (const item of NAV) menu.append(navItem(item, 'kg-menu-item'));
    return menu;
  }

  function buildSettings() {
    const choice = (name, value, label, extra = '') =>
      `<label class="kg-choice"><input type="radio" name="${name}" value="${value}">${extra}<span>${label}</span></label>`;
    const preview = (o) => `<span class="kg-preview" data-preview="${o}"><i></i><b></b></span>`;
    const modal = h(
      'div',
      { class: 'kg-modal', hidden: '' },
      `<div class="window kg-dialog" data-app="Settings" role="dialog" aria-modal="true" aria-labelledby="kg-settings-title">
        <div class="titlebar">
          <div class="lights"><span class="close" data-kg-close title="Close"></span><span class="min"></span><span class="max"></span></div>
          <div class="window-title" id="kg-settings-title">Settings</div>
        </div>
        <div class="kg-settings-body">
          <fieldset class="kg-field kg-os-field">
            <legend>Operating system</legend>
            <div class="kg-choices">${Object.entries(OSES).map(([v, l]) => choice('kg-os', v, l, preview(v))).join('')}</div>
            <p class="kg-hint">Changes every window on the site, games included.</p>
          </fieldset>
          <fieldset class="kg-field">
            <legend>Theme</legend>
            <div class="kg-choices kg-themes">${Object.entries(THEMES).map(([v, l]) => choice('kg-theme', v, l, `<span class="kg-swatch" data-swatch="${v}"></span>`)).join('')}</div>
          </fieldset>
        </div>
        <div class="kg-settings-foot"><button class="kg-btn kg-primary" type="button" data-kg-close>Done</button></div>
      </div>`,
    );
    modal.addEventListener('change', (e) => {
      if (e.target.name === 'kg-os') set({ os: e.target.value });
      if (e.target.name === 'kg-theme') set({ theme: e.target.value });
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-kg-close]')) closeSettings();
    });
    return modal;
  }

  function syncSettings() {
    for (const input of els.settings.querySelectorAll('input')) {
      input.checked = input.value === settings[input.name === 'kg-os' ? 'os' : 'theme'];
    }
  }

  let lastFocus = null;
  function openSettings() {
    closeMenu();
    lastFocus = document.activeElement;
    syncSettings();
    els.settings.hidden = false;
    els.settings.querySelector('input:checked:not([disabled])')?.focus();
  }

  function closeSettings() {
    if (els.settings.hidden) return;
    els.settings.hidden = true;
    lastFocus?.focus?.();
  }

  function toggleMenu() {
    els.menu.hidden = !els.menu.hidden;
  }

  function closeMenu() {
    if (els.menu) els.menu.hidden = true;
  }

  function tick() {
    const now = new Date();
    const time = (opts) => now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', ...opts });
    const fmt = {
      value: `<span>${time()}</span><span>${now.toLocaleDateString()}</span>`,
      quality: `${now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}&nbsp;&nbsp;${time()}`,
      power: `${now.toLocaleDateString([], { month: 'short', day: 'numeric' })}&nbsp;&nbsp;${time({ hour: '2-digit', hour12: false })}`,
    };
    for (const c of document.querySelectorAll('.kg-clock')) c.innerHTML = fmt[c.dataset.fmt];
  }

  // Rebuilt whenever the OS changes; the Settings window is kept so it stays
  // open while the visitor tries each look.
  function renderShell() {
    for (const k of ['icons', 'bar', 'menu']) els[k]?.remove();
    els.icons = buildIcons();
    els.bar = buildBar();
    els.menu = buildMenu();
    document.body.prepend(els.icons);
    if (els.bar) document.body.append(els.bar);
    document.body.append(els.menu);
    if (!els.settings) {
      els.settings = buildSettings();
      document.body.append(els.settings);
    }
    els.settings.querySelector('.kg-os-field').hidden = os() === 'phone';
    syncSettings();
    tick();
  }

  function init() {
    renderShell();
    setInterval(tick, 15000);
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-kg-open]');
      if (opener?.dataset.kgOpen === 'settings') return openSettings();
      if (opener?.dataset.kgOpen === 'menu') return toggleMenu();
      if (!e.target.closest('.kg-menu')) closeMenu();
    });
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Escape') return;
        if (!els.settings.hidden) {
          e.stopImmediatePropagation();
          closeSettings();
        } else closeMenu();
      },
      true,
    );
    // Games listen for keys on the document; keep them out of the Settings window.
    for (const type of ['keydown', 'keypress']) {
      els.settings.addEventListener(type, (e) => e.key !== 'Escape' && e.stopPropagation());
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.KG = {
    os,
    pick,
    workArea,
    prompt,
    path,
    makeWindow,
    settings: () => ({ ...settings }),
    set,
    openSettings,
    onChange: (fn) => listeners.push(fn),
  };
})();
