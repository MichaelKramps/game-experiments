# Spreadsheet Four in a Row

Four in a Row against the computer in a spreadsheet window, at `/spreadsheet-games/four-in-a-row/`. It's listed on the home page in the **Classic Games** folder as "Four in a Row" ("Board game", spreadsheet icon). Built 2026-11-24, the third game from the "Next games" list in `SEO_PLAN.md`.

## Decisions (2026-11-24, with Kramps)

- **Name:** "Four in a Row". Connect Four is a Hasbro trademark, so it appears only descriptively in the meta description and hidden header, next to the line "Connect Four is a trademark of Hasbro. Four in a Row is the traditional game and is not affiliated with Hasbro." (also in Help). See `SEO_PLAN.md` › Legal guardrails.
- **Pieces are X and O letters:** you are X, the computer is O. There's no Pieces menu and no colored discs.
- **Levels:** Easy, Medium and Hard. Hard is strong but beatable, not a perfect solver (the game is solved: a perfect first player always wins). Same idea as Chess's Hard.
- **Who goes first:** a **First** setting with Take turns (the default), You or Computer.
- **One player only**, against the computer. No pass-and-play.

## Rules (`engine.js`)

- A 7-column × 6-row board. Players take turns dropping a piece into a column, and it lands in the lowest empty cell.
- Four in a row across, down or diagonally wins. A line of five also counts, and the whole line is highlighted.
- A full board with no four is a draw.

## The computer (`engine.js`)

- **Easy:** takes a win when it has one, blocks your win about half the time, and otherwise picks a random column weighted toward the middle.
- **Medium:** searches 4 moves ahead (negamax with alpha-beta).
- **Hard:** searches 8 moves ahead.
- **Evaluation:** open lines of 2 and 3, plus pieces in the center column. Faster wins score higher.
- **Ties:** among equally good columns it picks at random, so games vary.
- **Timing:** it always takes at least 450ms, with "Calculating…" in the status bar. Hard's slowest move is about 0.7s.
- **Tested:** `tools/check-engine.js` plays computer-only games. Hard beats Medium about 23–6, and Medium beats Easy every time.

## Look

- **The window:** one spreadsheet window titled "Four in a Row" ("Four in a Row - Spreadsheet" on Value, "Four in a Row — Spreadsheet" on Power), using the shared `../sheet.css` chrome.
- **Board tab:** the board is the bordered range **A1:G6**, so the sheet's own column letters name the columns.
  - Cells are 46×40px; on phones they're square and sized so all seven columns fit.
  - X is in the text color, O in blue.
  - The last piece dropped has a light yellow fill, and the four in a row gets a green fill.
  - A new piece drops into its cell with a short animation.
  - With a mouse, hovering over a column tints it and shows a faint X where your piece would land.
- **Formula bar:**
  - a piece: `=DISC("you","D6")` or `=DISC("computer","C5")`;
  - a cell in the winning line: `=FOUR(A5:D5)`;
  - an empty cell: nothing.
- **Moves tab:** `Move | Player | Column | Cell`, one row per drop ("You (X)" / "Computer (O)" in blue). A finished game adds a Result row with the winning range. The rows here are normal height.
- **Notes** is a sheet tab just for show.
- **Toolbar:**
  - **New** (F2);
  - **Undo** (Ctrl+Z), which takes back your last move and the computer's reply. It's disabled before your first move and after the game ends.
  - **Level**, which applies from the computer's next move;
  - **First**: changing it to You or Computer before your first move (or after the game ends) starts a new game right away. Otherwise the message bar says it applies from the next game, with **Start it now**.
  - the decorative formatting buttons, hidden on phones.
- **Message bar:**
  - how to play until your first move, plus "The computer goes first this game." when it does;
  - at the end: "Four in a row. You win." / "Four in a row. The computer wins." / "Draw: the board is full.", your record on that level, **New game**, and **Email me new games** after a win.
- **Status bar:** Ready / Calculating… / Calculation complete, "Medium · You: X" (hidden on phones so both sheet tabs fit), and "Move n".
- **Input:**
  - click or tap any cell in columns A–G of the board, or a column letter, to drop there;
  - keyboard: 1–7 drop in columns A–G; the arrows move the selected cell, and Enter or Space drops in its column.

## Saving

localStorage, all optional:
- `spreadsheet-four-in-a-row-game`: who went first, the moves, the board, the result and level. It's replayed and checked on load.
- `-settings`: the level, the First setting, and who goes next when taking turns.
- `-record`: wins, losses and draws per level.
- `-window`: the window rect.

## Code

- `engine.js` holds the rules and the computer player, with no DOM.
- `game.js` runs the sheet, input and turns.
- `tools/check-engine.js` checks landing, wins in all four directions, a line of five, undo, a draw, save validation, and that each level takes a win and Medium/Hard block one. It then plays computer-only matches with timings. Run it with `node spreadsheet-games/four-in-a-row/tools/check-engine.js`. The folder's `package.json` sets `"type": "commonjs"`.

## SEO

- The page has a keyword `<title>` ("Spreadsheet Four in a Row: Four in a Row Game That Looks Like Excel"), a meta description, a canonical URL, Open Graph tags, and a hidden header with the H1, how to play, the trademark line and links to the sibling games.
- The page is in `sitemap.xml`.
- The keywords haven't been checked yet ("connect four in excel", "four in a row game", "connect 4 at work").
