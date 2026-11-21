# Spreadsheet 2048

The 2048 sliding number puzzle in a spreadsheet window, at `/spreadsheet-games/2048/`. Listed on the home page in the **Classic Games** folder as "2048". Built 2026-11-21; target keyword ("2048 in excel") and SEO rules are in `SEO_PLAN.md`. Written from scratch from the rules; no code from the original (which is MIT-licensed).

## Look

- One **Spreadsheet** window, titled "2048" ("2048 - Spreadsheet" on Value, "2048 — Spreadsheet" on Power). The chrome comes from `../sheet.css`.
- The board is the range **A1:D4** with a thin outer border. Tiles are plain numbers in cells, with empty cells blank. 2048 and up are bold. Columns are 72px wide, rows 40px (60px on phones).
- **Color scale** (toolbar toggle, saved, off by default): shades numbers green (2) through yellow to red (2048 and up), like a spreadsheet's color-scale conditional formatting. Easier to read, less like a plain sheet.
- A new tile fades in; a merged tile gets a brief green outline, like a recalculated cell. Both are off with reduced motion. There's no sliding animation.
- Formula bar: a tile shows its number, or the sum that made it if it just merged (`=1024+1024`).
- Toolbar: **New** (F2), **Undo (1)** (Ctrl+Z, one per game; the count drops to "Undo (0)" once used), **Color scale**, then the formatting buttons for show (hidden on phones).
- Message bar: at the start, how to move. On reaching 2048: "2,048 reached with a score of n" with **Continue**, **New game** and **Email me new games**; moves are paused until one is picked. On no moves left: "No moves left. Score n, top tile n." with **New game**, **Undo last move** if the undo is unused, and the email button if 2048 was reached.
- Status bar: Ready / Calculation complete (game over), "Score: n", "Best: n". Sheet tabs Budget / Forecast / Notes are for show.

## Rules

- Standard 4×4 2048: every move slides all tiles as far as they go; two equal tiles that meet merge once per move; the merge's value adds to the score. A move that changes nothing doesn't count and adds no tile.
- After each move a new tile appears in a random empty cell: 2 (90%) or 4 (10%). The game starts with two.
- Reaching 2048 asks once. **Continue** keeps playing the same board and never asks again for that game (`kept`); there's no further goal, just the score and the biggest tile.
- Game over when the board is full and no neighbors match.
- **One undo per game** (added 2026-11-21 at Kramps's request): restores the board and score from before the last move, so that move's new tile goes too. It works after a game over (the game resumes) but not while the 2048 prompt is up. Continue doesn't give a new one. The undo count and the previous board are saved with the game, so reloading doesn't reset it. Best score isn't rolled back.

## Controls

- Arrow keys or W A S D; Ctrl+Z undo; F2 new game. Clicking a cell just selects it (name box and formula bar).
- Phones: swipe anywhere on the sheet (24px minimum); the sheet doesn't scroll on phones so swipes aren't eaten.

## Saving

localStorage, all optional: `spreadsheet-2048-game` (the board, score, state), `-best` (best score), `-scale` (Color scale on), `-window` (window rect).

## SEO

Keyword `<title>`, meta description, canonical, Open Graph tags, and a visually hidden header with the H1, how to play and links to the Classic Games folder, the sibling games, the two original games and the home page. In `sitemap.xml`.
