# Site Design

The pitch of the site is **"games that look like work"**, and the site itself should look like work too: every page is a desktop computer.

Status: first version built (2026-10-23). Expect iteration on the look and layout.

## Implementation

- `os/os.js` + `os/os.css`: the shared shell. Every site page and listed game loads both (os.js in `<head>`, before stylesheets). It stamps `<html data-os data-theme>`, adds the desktop icons, the OS bar, a launcher menu and the Settings window, and exposes `window.KG` for games (`os`, `pick`, `prompt`, `path`, `workArea`, `makeWindow`, `onChange`). The comments at the top of each file document the API and color tokens.
- `os/site.css`: contents of the site's own windows (Files, Notes).
- Games keep only content styles and build on the shell's `--w-*` / `--t-*` color tokens. Window chrome comes from the shell.
- Phone layout = any phone or tablet (a touchscreen is the main input: `(pointer: coarse) and (hover: none)`), either way up, plus any window ≤ 760px wide. Touchscreen laptops keep the desktop look. In the phone layout the OS is always `phone`, and in-game text uses the Power (unix) style.
- The phone tab bar's height is the `--tabbar-h` CSS variable (64px; 44px on short landscape screens, ≤ 500px tall). Games should use it, not a fixed 64px.

## Navigation

Every site page **and** every listed game shows the same desktop icons:

| Icon | Behavior |
|---|---|
| **Games** | Link to `index.html`, the home page (the games list) |
| **About** | Link to `about.html` |
| **New Games** | Not a link. Opens the email signup modal (see Email list) |
| **Settings** | Not a link. Opens a settings modal |

- Icons sit in a column on the desktop (right side on Quality). Windows are kept out of that column so the icons stay reachable.
- The OS bar's launcher (Start / mark / Activities) opens a menu with the same four items.
- Phone: the icons become a bottom tab bar.

## Pages

- **Home page (`index.html`)**: the games list. One file-explorer window. Games sit directly in it as files, and a game series gets a folder with its games inside.
  - diff guess key (`diff-guess-key/`): listed under this name, with the same name in the browser tab. Since 2026-11-11 it's a plain word-guessing game with no journal (it was Kramps' Journal before that). The folder was `jamies-journal/` until 2026-11-12; the old URL 301-redirects to `/diff-guess-key/`.
  - Ctrl+Alt+Deal (`ctrl-alt-deal/`)
  - No folders for now (the code still supports them).
  - (Changed 2026-11-10: the Word Games, Deckbuilding Games and World of Evergreen folders were removed. Letter Groups and Jo's Discovery are now unlisted, and Jamie's Journal was renamed Kramps' Journal on the list.)
- (Changed 2026-11-12: the Games page became the home page. The old home page's "Welcome" window and the Home desktop icon were removed; the Games icon now links to `/`. `games.html` was deleted and 301-redirected to `/`. A game, one folder down, highlights Games.)
- **About (`about.html`)**: a desktop with a notepad window open holding the about text. Keep the current text minus the full-games/Google-login part (not built yet).
- **`games.html`, `free-games.html`, `full-games.html`**: deleted, and 301-redirected to `/` via `_redirects` (Cloudflare static assets).
- **`experiments.html`**: unlinked, keeps its current look. It and the games it links to will probably be removed eventually.
- **Unlisted games** (everything not on the home page's list, including Evergreen, which is in progress): still reachable by direct URL, not linked anywhere new.

## Settings

The modal holds the visitor's choices, saved in browser storage (`localStorage`) and applied on every page and every listed game, including future visits.

| Setting | Options | Default |
|---|---|---|
| OS | **Value** (Windows-like), **Quality** (Mac-like), **Power** (Linux-like, GNOME/Ubuntu style) | Value |
| Theme | Light, Dark | Light |

- Each OS look should read as the real OS at a glance, but **never use real trademarks**: no real OS or product names (Windows, macOS, Linux, PowerShell, Finder, Terminal.app…) and no real logos, in labels, window titles or game text.
- The OS setting carries into the listed games: window chrome, terminal styling (Value's terminal looks like PowerShell, etc.), and in-game text such as prompts and commands may change to match.
- The theme setting also carries into the games, including their content, not just the frame.
- Built-in apps use generic names on every OS: **Terminal**, **Files**, **Notes**.

## Looks

All modern-era. The desktop is a solid color for now.

| | Value (Windows-like) | Quality (Mac-like) | Power (Linux-like, GNOME/Ubuntu) |
|---|---|---|---|
| Bar | centered bottom taskbar: launcher, search, running apps, tray clock | top menu bar: launcher mark, app name, menus, clock | black top bar: Activities, centered clock, status icons |
| Window buttons | minimize/maximize/close on the right, title left | traffic lights on the left, centered title | single round close button, bold centered title |
| Desktop icons | left column | right column | left column |
| Dark terminal | classic blue shell | dark gray | aubergine |
| In-game shell | `PS C:\Users\jo>`, `dir`, `type`, backslash paths | zsh `jo@host ~ %` | bash `jo@host:~$` |

- **Phone** (phones and tablets): a generic layout for every OS: windows fill the screen, and Games/About/New Games/Settings sit in a bottom tab bar (slimmer in landscape on phones). The Settings window shows only the theme option.

## Email list

Live since 2026-11-12. This section covers the visitor-facing side. **How it works, how to query the list, and the plan for sending emails to it are all in `WEBSITE_INFRA_PLAN.md` → Phase 1.**

- The **New Games** icon (envelope) opens a modal built into `os/os.js`: "Get an email when a new game is released, plus occasional updates on games still in the works." Games can open it with `KG.openSignup()`, e.g. from an end screen (none do yet).
- The New Games window and the unsubscribe page's window are draggable and resizable like other windows (`KG.makeWindow`; minimum 340×300 for the signup so its text always fits). On phones they keep the fixed phone layout.
- The email is checked in the browser and again on the server. A Cloudflare Turnstile check runs invisibly unless it needs the visitor to click. After signing up, the modal shows "You're on the list!" on later visits (localStorage flag).
- Signups go to `POST /api/subscribe` in the site's Worker (`src/`), which saves them to the D1 `subscribers` table with the page they signed up from (`source`) and sends a welcome email through Resend (subject "You're on the kramps.games email list"; text in `src/email.js`). The modal's wording and the email's wording differ on purpose; Kramps chose to keep the modal as is.
- `unsubscribe.html` (linked from every email, not from the site) unsubscribes after one click on a button.

## Analytics

- Google Analytics (GA4, `G-Z9KTWQCDD0`) is loaded by `os/os.js`, so it covers every page that loads the shell: site pages and the listed games. The unlinked experiments aren't tracked. Skipped on localhost and `file:`.
- Still open: whether a cookie consent banner is needed.
