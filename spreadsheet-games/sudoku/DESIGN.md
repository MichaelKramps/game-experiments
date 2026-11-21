# Spreadsheet Sudoku

Sudoku in a spreadsheet window, at `/spreadsheet-games/sudoku/`. Listed on the home page in the **Classic Games** folder as "Sudoku". Built 2026-11-21; target keywords ("sudoku in excel", "sudoku spreadsheet") and SEO rules are in `SEO_PLAN.md`.

## Look

- One **Spreadsheet** window, titled "Sudoku" ("Sudoku - Spreadsheet" on Value, "Sudoku — Spreadsheet" on Power). The chrome comes from `../sheet.css`.
- The puzzle is the range **A1:I9**, with no row or column names (a budget-table version with month and line names was tried first and dropped on 2026-11-21).
- Column J and row 10 hold unlabeled sums of what's filled in each row and column (J10 is the grand total), so a finished row reads 45 and a finished sheet 405. They give nothing away: the missing numbers in a row are known anyway.
- The 3×3 blocks are marked with darker borders, like a formatted range. No fills.
- Given numbers are black. The player's are **blue**, the financial-model convention for input cells. A number that repeats in its row, column or block turns **red** (a rule check only; it never compares with the solution). Cells with the same number as the selected cell get a faint green fill.
- **Notes** (pencil marks) show as small grey digits in the cell, e.g. `258`; phones wrap them.
- Formula bar: a number shows as itself, notes as `=NOTES(2,5,8)`, sums as `=SUM(A1:I1)`.
- Columns are 52px wide and rows 30px so notes fit (phones: the shared 36px × 36px).
- Toolbar: **New** (F2), **Undo** (Ctrl+Z), **Level** (Easy, Medium, Hard, Expert), **Notes** toggle, then the formatting buttons for show (hidden on phones).
- Phones get a number bar under the sheet: 1–9 and Clear. A number with all 9 placed is dimmed. Desktops type instead.
- Message bar: at the start it says what to fill and how; on a win "Sheet balanced in m:ss" with the best time, **New game** and **Email me new games**. Hidden otherwise.
- Status bar: Ready / Check values (a repeat on the sheet) / Balanced, "Blank: n", "Time: m:ss". Sheet tabs Budget / Forecast / Notes are for show.

## Puzzles

Made in the browser, about 30–70ms each. A random full grid is filled by backtracking, then cells are emptied while the puzzle keeps exactly one solution: in 180° symmetric pairs first, then single cells to go lower.

| Level | Clues | Rule |
|---|---|---|
| Easy | 38 | Solvable by singles only (the only place a number fits, or the only number that fits a cell) |
| Medium | 31 | Same, with fewer clues |
| Hard | 26 | Unique solution, any logic |
| Expert | as few as it will go (usually 23–25) | Must **not** be solvable by singles alone (up to 30 tries) |

Difficulty is by clue count plus the singles check, not a full technique grader.

## Controls

- Click a cell, type 1–9. Backspace, Delete or 0 clears (a number first, then notes).
- **Notes** or N toggles pencil-mark mode; Shift+number adds a note anytime. Placing a number removes it from the notes of every cell in its row, column and block.
- Arrows move. Tab / Enter move right / down within the puzzle and wrap, Shift goes back, like a spreadsheet. F2 new game.
- Undo covers every change (numbers, notes, clears), up to 500 steps, for the current page visit.
- The clock runs while the game is unsolved and the tab is visible.

## Saving

localStorage, all optional: `spreadsheet-sudoku-<level>` (the puzzle in progress for each level, so switching level resumes it), `-level` (last level), `-best` (best time per level), `-window` (window rect).

## SEO

Keyword `<title>`, meta description, canonical, Open Graph tags, and a visually hidden header with the H1, how to play and links to the Classic Games folder, the sibling games, the two original games and the home page. In `sitemap.xml`.
