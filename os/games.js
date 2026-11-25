// The games file explorer: the home page (/) and the Spreadsheet Games hub
// (/spreadsheet-games/) both show this Files window over one folder tree.
// Free Games has two kinds of folder, so a game can be in two: Kramps Games
// (the originals) and Classic Games, then one folder per app the games are
// played in (Spreadsheet, Multi-Window, Terminal, Task Board).
//
// Opening a folder never loads a page: the window switches in place and the
// address changes with the History API, so Back works and links can point
// straight at a folder. A folder with its own page (Free Games at /,
// Spreadsheet Games at /spreadsheet-games/ and Terminal Games at
// /terminal-games/, for search) gets that URL; the
// others are a hash on whichever page you're on (/#multi, /spreadsheet-games/#multi).
// Needs os.js (KG) and the #files window markup. See DESIGN.md.

const KGGames = (() => {
  const SPREADSHEET = {
    id: 'spreadsheet',
    name: 'Spreadsheet Games',
    page: '/spreadsheet-games/',
    title: 'Spreadsheet Games: Free Games That Look Like Excel',
    games: [
      { name: 'Minesweeper', href: '/spreadsheet-games/minesweeper/', kind: 'Logic puzzle', icon: 'sheet', desc: 'clear the sheet without revealing a mine' },
      { name: 'Sudoku', href: '/spreadsheet-games/sudoku/', kind: 'Logic puzzle', icon: 'sheet', desc: 'fill the sheet so every row, column and block has 1 to 9' },
      { name: '2048', href: '/spreadsheet-games/2048/', kind: 'Number puzzle', icon: 'sheet', desc: 'slide and add numbers up to 2048, then keep going' },
      { name: 'Chess', href: '/spreadsheet-games/chess/', kind: 'Board game', icon: 'sheet', desc: 'play chess against the computer, easy to hard' },
      { name: 'Four in a Row', href: '/spreadsheet-games/four-in-a-row/', kind: 'Board game', icon: 'sheet', desc: 'drop X\'s down the columns and line up four before the computer' },
      { name: 'Mancala', href: '/spreadsheet-games/mancala/', kind: 'Board game', icon: 'sheet', desc: 'sow seeds around the board and fill your store, easy to hard' },
      { name: 'Reversi', href: '/spreadsheet-games/reversi/', kind: 'Board game', icon: 'sheet', desc: 'place X\'s to flip the computer\'s O\'s, most pieces wins' },
      { name: 'Word Search', href: '/spreadsheet-games/word-search/', kind: 'Word puzzle', icon: 'sheet', desc: 'find 12 hidden words in a sheet of letters, 40 themes' },
    ],
  };
  const MULTI = {
    id: 'multi',
    name: 'Multi-Window Games',
    games: [
      { name: 'Ctrl+Alt+Deal', href: '/ctrl-alt-deal/', kind: 'Deckbuilder', icon: 'multi', desc: 'edit your deck of cards to make stronger hands and earn more money' },
      { name: 'Yacht', href: '/spreadsheet-games/yacht/', kind: 'Dice game', icon: 'multi', desc: 'roll five dice and fill the score sheet in 13 turns' },
      { name: 'Spades', href: '/spreadsheet-games/spades/', kind: 'Card game', icon: 'multi', desc: 'partner with the computer, bid, and take tricks to 500' },
    ],
  };
  const TERMINAL = {
    id: 'terminal',
    name: 'Terminal Games',
    page: '/terminal-games/',
    title: 'Terminal Games: Free Games That Look Like a Terminal',
    games: [
      { name: 'diff guess key', href: '/diff-guess-key/', kind: 'Word deduction', desc: 'guess the 5 letter key before your tolerance runs out' },
    ],
  };
  const TASKBOARD = {
    id: 'taskboard',
    name: 'Task Board Games',
    games: [
      { name: 'Solitaire', href: '/solitaire/', kind: 'Card game', icon: 'board', desc: 'Klondike solitaire on a task board, draw 3 or draw 1' },
      { name: 'FreeCell', href: '/freecell/', kind: 'Card game', icon: 'board', desc: 'FreeCell solitaire on a task board, deals numbered 1 to 32000' },
    ],
  };
  const ALL = [...SPREADSHEET.games, ...MULTI.games, ...TERMINAL.games, ...TASKBOARD.games];
  const pick = (...names) => names.map((n) => ALL.find((g) => g.name === n));
  const KRAMPS = { id: 'kramps', name: 'Kramps Games', games: pick('diff guess key', 'Ctrl+Alt+Deal') };
  const CLASSIC = {
    id: 'classic',
    name: 'Classic Games',
    games: pick('Minesweeper', 'Sudoku', '2048', 'Chess', 'Four in a Row', 'Mancala', 'Reversi', 'Word Search', 'Yacht', 'Spades', 'Solitaire', 'FreeCell'),
  };
  const FREE = { id: '', name: 'Free Games', page: '/', title: 'Kramps Games: Games That Look Like Work', folders: [KRAMPS, CLASSIC, SPREADSHEET, MULTI, TERMINAL, TASKBOARD] };
  const ROOT = { id: 'games', name: 'Games', folders: [FREE] };

  // Every folder with its path from the top: [ROOT, ..., folder].
  const PATHS = [];
  (function walk(f, path) {
    PATHS.push([...path, f]);
    for (const sub of f.folders || []) walk(sub, [...path, f]);
  })(ROOT, []);

  const FOLDER_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 7a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v1H2z" class="i-folder-back"/><rect x="2" y="9" width="20" height="11" rx="2" class="i-folder"/></svg>';
  const GAME_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3" class="i-term"/><path d="m6 9 3 3-3 3M11 15h6" class="i-term-mark"/></svg>';
  const SHEET_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" class="i-paper"/><path d="M3.5 5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2V8h-17z" class="i-sheet"/><path d="M4 13h16M4 17.5h16M9.5 8v12.5M15 8v12.5" class="i-lines"/></svg>';
  // A game's icon shows the app it's played in: a terminal (the default),
  // a spreadsheet, a file for games played in a file explorer, a task
  // board, or two stacked windows for games played across more than one app.
  const FILE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h8.5l4.5 4.5v13a1.5 1.5 0 0 1-1.5 1.5h-11.5a1.5 1.5 0 0 1-1.5-1.5v-16a1.5 1.5 0 0 1 1.5-1.5z" class="i-paper"/><path d="M14.5 2.5V7h4.5" class="i-fold"/><path d="M8 12h8M8 15.5h8M8 19h5" class="i-lines"/></svg>';
  const BOARD_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" class="i-paper"/><rect x="6" y="6.5" width="3.5" height="11" rx="1" class="i-board"/><rect x="10.25" y="6.5" width="3.5" height="7.5" rx="1" class="i-board"/><rect x="14.5" y="6.5" width="3.5" height="4.5" rx="1" class="i-board"/></svg>';
  const MULTI_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="2.5" width="13.5" height="12" rx="2" class="i-paper"/><path d="M8.5 4.5a1.5 1.5 0 0 1 1.5-1.5h9.5a1.5 1.5 0 0 1 1.5 1.5V6h-12.5z" class="i-sheet"/><rect x="2.5" y="9" width="13.5" height="12.5" rx="2" class="i-paper"/><path d="M3 11a1.5 1.5 0 0 1 1.5-1.5h9.5a1.5 1.5 0 0 1 1.5 1.5v1.5h-12.5z" class="i-board"/><path d="M5.5 15.5h7.5M5.5 18.5h5" class="i-lines"/></svg>';
  const GAME_ICONS = { sheet: SHEET_ICON, file: FILE_ICON, board: BOARD_ICON, multi: MULTI_ICON };

  const $ = (id) => document.getElementById(id);
  const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  const folderAt = (id) => PATHS.find((p) => p.at(-1).id === id)?.at(-1);
  const PAGES = PATHS.map((p) => p.at(-1)).filter((f) => f.page);

  // The page you're on: the folder whose page is the address's path.
  function pageNow() {
    const path = location.pathname.replace(/index\.html$/, '');
    return PAGES.find((f) => f.page !== '/' && path.endsWith(f.page)) || FREE;
  }

  // A folder's URL: its own page if it has one, else a hash on the page you're on.
  const hrefOf = (f) => f.page || `${pageNow().page}#${f.id}`;

  // mount() shows the explorer, opened to the folder in the address.
  function mount() {
    // The open folder's path: the hash's folder, else the page's. A folder
    // with its own page named in a hash (/#spreadsheet) moves to that page.
    function currentPath() {
      const byHash = location.hash ? folderAt(location.hash.slice(1)) : null;
      if (byHash?.page) history.replaceState(null, '', byHash.page);
      const folder = byHash || pageNow();
      return PATHS.find((p) => p.at(-1) === folder);
    }

    function go(f) {
      const url = hrefOf(f);
      if (url !== location.pathname + location.hash) history.pushState(null, '', url);
      render();
    }

    function count(f) {
      const games = (f.games || []).length;
      const folders = (f.folders || []).length;
      if (games && !folders) return `${games} ${games === 1 ? 'game' : 'games'}`;
      const items = games + folders;
      return `${items} ${items === 1 ? 'item' : 'items'}`;
    }

    function row({ href, folder, icon, name, kind, desc }) {
      const data = folder === undefined ? '' : ` data-folder="${folder}"`;
      return `<a class="file-row" href="${href}"${data}>
        <span class="file-name">${icon}<span>${esc(name)}</span></span>
        <span class="file-kind">${esc(kind)}</span>
        <span class="file-desc">${esc(desc)}</span>
      </a>`;
    }

    function render() {
      const path = currentPath();
      const folder = path.at(-1);
      const sep = KG.pick({ value: '›', quality: '›', power: '/' });

      $('files-title').textContent = folder.name;
      // The tab title and canonical are the page's you're on.
      const page = pageNow();
      document.title = page.title;
      document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://kramps.games${page.page}`);
      $('up').disabled = path.length === 1;
      $('crumbs').innerHTML = path
        .map((f, k) => (k === path.length - 1 ? `<span>${esc(f.name)}</span>` : `<a href="${hrefOf(f)}" data-folder="${f.id}">${esc(f.name)}</a>`))
        .join(`<span class="sep">${sep}</span>`);

      // Sidebar: the folders under Games, nested ones indented.
      $('side').innerHTML =
        '<h2>Games</h2>' +
        PATHS.filter((p) => p.length > 1)
          .map((p) => {
            const f = p.at(-1);
            const on = f === folder ? ' aria-current="true"' : '';
            const sub = p.length > 2 ? ' class="sub"' : '';
            return `<a${sub} href="${hrefOf(f)}" data-folder="${f.id}"${on}>${FOLDER_ICON}<span>${esc(f.name)}</span></a>`;
          })
          .join('');

      const rows = [
        ...(folder.folders || []).map((f) => row({ href: hrefOf(f), folder: f.id, icon: FOLDER_ICON, name: f.name, kind: 'Folder', desc: count(f) })),
        ...(folder.games || []).map((g) => row({ ...g, icon: GAME_ICONS[g.icon] || GAME_ICON })),
      ];
      $('list').innerHTML = `<div class="files-head"><span>Name</span><span>Type</span><span>Description</span></div>${rows.join('')}`;
      $('status').textContent = `${rows.length} ${rows.length === 1 ? 'item' : 'items'}`;
    }

    $('up').addEventListener('click', () => {
      const path = currentPath();
      if (path.length > 1) go(path.at(-2));
    });
    // Folder links switch in place (a plain click; Ctrl/Cmd-click still opens a new tab).
    $('files').addEventListener('click', (e) => {
      const a = e.target.closest('a[data-folder]');
      if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      go(folderAt(a.dataset.folder));
    });
    window.addEventListener('popstate', render);
    window.addEventListener('hashchange', render);
    KG.onChange(render);
    render();

    KG.makeWindow($('files'), {
      minW: 420,
      minH: 260,
      rect: (a) => {
        const w = Math.min(820, a.w - 60);
        const h = Math.min(460, a.h - 60);
        return { x: a.x + (a.w - w) / 2, y: a.y + (a.h - h) / 2.6, w, h };
      },
    });
  }

  return { mount };
})();
