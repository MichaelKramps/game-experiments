# Spreadsheet Reversi

Reversi against the computer in a spreadsheet window, at `/spreadsheet-games/reversi/`. It's listed on the home page in the **Classic Games** and **Spreadsheet Games** folders as "Reversi" ("Board game", spreadsheet icon). Built 2026-11-25, the fifth game from the "Next games" list in `SEO_PLAN.md`.

## Decisions (2026-11-25, with Kramps)

- **Name:** Reversi, the traditional name. "Othello" is a MegaHouse trademark. It appears only descriptively in the meta description and hidden header, next to the trademark line (see `SEO_PLAN.md` › Legal guardrails).
- **Pieces:** X (you) and O (the computer) letters, like Four in a Row. No black and white discs, and no green board.
- **Legal moves** aren't marked on the board. You only see whether a cell is playable while the mouse is over it.
- **Flipping:** flipped pieces turn over one at a time, **120ms** apart, nearest first. A click on the sheet or any key skips to the end of a move.
- **Board:** 8×8 only.
- **Computer:** Easy, Medium and Hard, plus **First** (Take turns / You / Computer), like Four in a Row and Mancala. One player only.

## Rules (`engine.js`)

- **The board:** A1:H8, index y*8+x.
  - Whoever goes first starts with D5 and E4, and the other side starts with D4 and E5.
  - That's the standard crossed start, with the first player in the black seat.
- **A move:**
  - It must flip at least one piece. A line of the opponent's pieces trapped between the new piece and another of yours flips, in any of the 8 directions, several at once.
  - `flips()` returns them nearest first, for the animation.
- **Passing:** a player with no move is passed automatically. `play()` marks the move that caused the pass with `passed`, and the same player goes again.
- **End:** the game ends when neither side can move. The side with more pieces wins, and equal counts are a draw. Empty squares aren't awarded.
- **Saving:** only the moves are stored, as cell indexes. `replay`, `history` and `valid` rebuild the game from them, and passes are implied.

## The computer (`engine.js`)

- **Easy:** takes a corner when it can, and otherwise plays a random legal move.
- **Medium:** a 2-move negamax search with alpha-beta.
- **Hard:** a 4-move search. With 8 or fewer empty squares left, it plays the end out exactly by final piece count.
- **Scoring:** a position is scored by square weights. Corners are worth +100. The squares next to a corner count against you, but only while that corner is empty. The score also adds 5 × (your moves − their moves). A finished game scores by its result.
- **Ties:** among equally good moves it picks at random.
- **Tuning:**
  - Hard was first a 5-move search that played the last 10 squares exactly. It beat a 3-move Medium 20–0, which seemed unbeatable for most people.
  - Reversi snowballs, so Hard still beats Medium most of the time (about 16–4 to 18–2).
  - The slowest move takes about 50ms, and the computer always waits at least 450ms ("Calculating…").

## Look

- **The window:** one spreadsheet window titled "Reversi" ("Reversi - Spreadsheet" on Value, "Reversi — Spreadsheet" on Power), using `../sheet.css`.
- **Board tab:** A1:H8 with a border, 44px cells (sized to fit the width on phones). X is in the text color and O is blue.
  - **Hover**, on your turn, with a mouse:
    - an empty cell you can play shows a grey X and tints the pieces it would flip;
    - any other empty cell turns light red with a "not allowed" cursor.
    - Nothing is marked otherwise.
  - **A cell you can't play:** clicking or tapping one shows "D3 doesn't flip any O's." in the status bar for about 2 seconds.
  - **After a move:** the piece just placed stays light yellow and the pieces it flipped stay faint green, until the next move.
  - **Score** under the board: You / CPU / Empty in A10:B12, with formulas `=COUNTIF(A1:H8,"X")`, `=COUNTIF(A1:H8,"O")` and `=COUNTBLANK(A1:H8)`.
- **Formula bar:** a piece shows `=PIECE("you","D5")`.
- **Flipping animation:**
  1. the new piece pops in;
  2. each flipped piece turns over in green, one every 120ms.
  - The status bar shows "Flipping…".
- **Moves tab:** `Move | Player | Cell | Flipped`, with `=FLIPPED(D4,…)` as the formula for the flip count.
  - A grey "Pass" row appears when a player couldn't move.
  - The final Result row gives the winner and the score.
- **Toolbar:**
  - **New** (F2) and **Undo** (Ctrl+Z). Undo takes back your last move and every computer move after it, including the ones it made while you were passed. It's disabled after the game ends.
  - **Level**, which applies from the computer's next move.
  - **First**, which starts a new game right away if you haven't moved yet or the game is over. Otherwise the message bar says "from your next new game" with **Start it now**.
- **Message bar:**
  - how to play until your first move;
  - a pass notice ("The computer has no move… Your turn again." / "You have no move… your turn is passed.") until your next move;
  - at the end, "You win, 45 to 19.", your record on that level, **New game**, and **Email me new games** after a win.
  - Sentences go in one `<span>`, because the bar is a wrapping flex row that would otherwise split them around `<b>`.
- **Status bar:** Ready / Flipping… / Calculating… / Calculation complete (or a short notice about a cell you can't play), then "Medium · You: X" (hidden on phones) and "X 12 · O 9".
- **Input:** click or tap an empty cell; the arrows move the selection, and Enter or Space plays the selected cell.

## Saving

localStorage, all optional:
- `spreadsheet-reversi-game`: who went first, the moves, the board, the turn, the result and the level. It's replayed and checked on load. It's saved before the flips animate, so a reload mid-animation shows the finished move.
- `-settings`: level, First, and who goes next when taking turns.
- `-record`: wins, losses and draws per level.
- `-window`: the window rect.

## Code

- `engine.js` holds the rules and the computer player, with no DOM.
- `game.js` runs the sheet, the hover check, the flip animation, input and turns.
- `tools/check-engine.js` checks:
  - the start and the opening moves, and cells you can't play;
  - flips in several directions at once, nearest first;
  - that lines ending in an empty cell or the edge don't flip;
  - a forced pass and the end of the game;
  - 30 random full games, with replay, history and save validation;
  - that Easy takes a corner.
- It then plays computer-only matches with timings. Run it with `node spreadsheet-games/reversi/tools/check-engine.js`. The folder's `package.json` sets `"type": "commonjs"`.

## SEO

- The page has a keyword `<title>` ("Spreadsheet Reversi: Free Reversi Game That Looks Like Excel"), a meta description, a canonical URL, Open Graph tags, and a hidden header with the H1, how to play, the trademark line and links to the hub and sibling games.
- The page is in `sitemap.xml`.
- The keywords haven't been checked yet ("reversi in excel", "othello in excel", "reversi no ads").
