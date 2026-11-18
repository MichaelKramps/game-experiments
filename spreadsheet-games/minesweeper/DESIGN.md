# Spreadsheet Minesweeper

Minesweeper in a spreadsheet window, at `/spreadsheet-games/minesweeper/`. Listed on the home page in the **Classic Games** folder as "Minesweeper". Built 2026-11-18; target keywords and SEO rules are in `SEO_PLAN.md`.

## Look

- One **Spreadsheet** window, titled "Minesweeper" ("Minesweeper - Spreadsheet" on Value, "Minesweeper — Spreadsheet" on Power). The chrome comes from `../sheet.css`, shared with future spreadsheet games.
- Menu row: File, Home, Insert, Formulas, Data, View are for show; **Help** opens a Notes-style how-to-play dialog.
- Toolbar: **New** (F2), **Size** (Beginner 9×9/10, Intermediate 16×16/40, Expert 30×16/99 — the standard sizes; then the last custom size once one is set, e.g. "Custom · 30×12 · 50", and **Custom size…**), **Flag** mode toggle, then bold/italic/underline/$/%/.00/Σ for show (hidden on phones).
- Formula bar: the name box shows the selected cell (e.g. `E5`). The formula shows `=NEIGHBORS(E5)` for a revealed cell, `=FLAG()` for a flag, `#REF!` / `#N/A` after a loss, and nothing for a hidden cell.
- The board is the range starting at A1 with a thin outer border. **Hidden cells are shaded** (a light fill, like a highlighted range); revealed cells are plain and show their number (blank for 0). The sheet runs on to column AZ and row 60+ with ordinary empty cells.
- **Flag** = a red comment marker in the cell's top-right corner.
- Loss: every unflagged mine shows `#REF!` in red; the one that was clicked gets a red fill; wrong flags show `#N/A`.
- Message bar (the yellow notice under the formula bar): before the first click it says how to start; on a win "Sheet cleared in m:ss" with the best time, **New game** and **Email me new games** (opens the email signup); on a loss "#REF! That cell was a mine." with **New game**. Hidden while playing.
- Status bar: Ready / Cleared / Error, "Mines left: n", "Time: m:ss". Sheet tabs Budget / Forecast / Notes are for show.

## Custom size

- **Custom size…** opens a small dialog: Width (columns, 9–30), Height (rows, 9–24), Mines (10 to width×height − 9). Width and height limits are the classic game's; the mine limit is lower than the classic game's so the first click's safe 3×3 always fits. A line under the fields shows the range it will cover (e.g. "Range A1:AD12 · 30×12 with 351 mines").
- Out-of-range numbers snap to the nearest allowed value when you leave the field. **Start** saves the size and starts a new custom game; Cancel / Escape / the close button leave the current game alone.
- Custom games have no best times (like the classic game), since the size can be anything.

## Rules and controls

- First click is always safe: mines are placed after it, never on that cell or its 8 neighbors.
- Click reveals; a 0 opens its neighbors. Right-click flags. Clicking a revealed number whose flag count matches reveals its other neighbors (chording).
- Phones: tap reveals, long-press (450 ms) flags, or turn on Flag mode so taps flag. Cells are 36px there.
- Keyboard: arrows move the selection, Enter/Space reveals, F flags, F2 new game.
- The clock runs only while a game is going and the tab is visible.

## Saving

localStorage, all optional: `spreadsheet-minesweeper-<level>` (the game in progress for each size, `custom` included, so switching size resumes that size's game), `-custom-size` (the last custom width/height/mines), `-level` (last size), `-best` (best time per size), `-window` (window rect).

## SEO

Keyword `<title>`, meta description, canonical, Open Graph tags, and a visually hidden header with the H1, how to play and links to the Classic Games folder, the two original games and the home page. In `sitemap.xml`.
