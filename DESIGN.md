# Site Design

The pitch of the site is **"games that look like work"**, and the site itself should look like work too: every page is a desktop computer.

Status: first version built (2026-10-23). Expect iteration on the look and layout.

## Implementation

- `os/os.js` + `os/os.css`: the shared shell. Every site page and listed game loads both (os.js in `<head>`, before stylesheets). It stamps `<html data-os data-theme>`, adds the desktop icons, the OS bar, a launcher menu and the Settings window, and exposes `window.KG` for games (`os`, `pick`, `prompt`, `path`, `workArea`, `makeWindow`, `onChange`). The comments at the top of each file document the API and color tokens.
- `os/site.css`: contents of the site's own windows (Welcome, Files, Notes).
- Games keep only content styles and build on the shell's `--w-*` / `--t-*` color tokens. Window chrome comes from the shell.
- Phone = viewport ≤ 760px. On a phone the OS is always `phone`, and in-game text uses the Power (unix) style.

## Navigation

Every site page **and** every listed game shows the same desktop icons:

| Icon | Behavior |
|---|---|
| **Home** | Link to `index.html` |
| **Games** | Link to the Games page |
| **About** | Link to `about.html` |
| **Settings** | Not a link. Opens a settings modal |

- Icons sit in a column on the desktop (right side on Quality). Windows are kept out of that column so the icons stay reachable.
- The OS bar's launcher (Start / mark / Activities) opens a menu with the same four items.
- Phone: the icons become a bottom tab bar.

## Pages

- **Home (`index.html`)**: solid desktop color, the icons, and a small "Welcome" window explaining the site.
- **Games (`games.html`)**: one file-explorer window with a folder per category and each game as a file inside.
  - **Word Games**: Letter Groups (`letter-groups/`)
  - **World of Evergreen**: Jamie's Journal (`jamies-journal/`), Jo's Discovery (`jos-discovery/`)
- **About (`about.html`)**: a desktop with a notepad window open holding the about text. Keep the current text minus the full-games/Google-login part (not built yet).
- **`free-games.html`, `full-games.html`**: deleted, and 301-redirected to `/games` via `_redirects` (Cloudflare static assets).
- **`experiments.html`**: unlinked, keeps its current look. It and the games it links to will probably be removed eventually.
- **Unlisted games** (everything not under Games, including Evergreen, which is in progress): still reachable by direct URL, not linked anywhere new.

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

- **Phone:** a generic layout for every OS: windows fill the screen, and Home/Games/About/Settings sit in a bottom tab bar. The Settings window shows only the theme option.

## Analytics

- Google Analytics (GA4, `G-Z9KTWQCDD0`) is loaded by `os/os.js`, so it covers every page that loads the shell: site pages and the listed games. The unlinked experiments aren't tracked. Skipped on localhost and `file:`.
- Still open: whether a cookie consent banner is needed.
