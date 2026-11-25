# FreeCell (task board)

FreeCell solitaire on a task board, at `/freecell/`. It's listed on the home page in the **Classic Games** and **Task Board Games** folders as "FreeCell" ("Card game", task board icon). Built 2026-11-25, from the "Next games" list in `SEO_PLAN.md`.

## Decisions (2026-11-25, with Kramps)

- **Look:** the same as Solitaire (`../solitaire/DESIGN.md`).
  - It uses the same task board window and Settings › Task board looks, with card tickets like `eight-hearts` / `8H` in two suit colors.
  - The page links `../solitaire/style.css`. Its own `style.css` only overrides what differs: 8 lists per row, and one-line tickets 34px tall (30px on phones), since every card is face up and columns get long.
- **List names are plain:** Cell 1–Cell 4 (C1–C4 on phones), Done · Spades / Hearts / Diamonds / Clubs, and Column 1–Column 8. The board name is "Sprint Backlog" (for show).
- **Nothing goes to Done by itself** until the board is totally solved, meaning every column runs from high to low. Then the cards go to Done one at a time, every 90ms, with no button to press. Until then you move every card yourself.
- **Numbered deals 1–32000:** the standard FreeCell numbering, so "Game #617" is the same deal people know from elsewhere.
  - The message bar shows the number, and a **Game #** box in the header plays any number when you press Enter.
  - **New game** picks a random number but never #11982, the one unsolvable deal.
  - On the legal side: the numbering is a public shuffle recipe. Don't name the company whose version made it famous (see `SEO_PLAN.md` › Legal guardrails).
- **Stats:** wins, the current win streak with the best streak, and the best time.

## Rules (`engine.js`)

- **The deal:** all 52 cards face up in 8 columns (7, 7, 7, 7, 6, 6, 6, 6). `layout(n)` is the standard numbered deal:
  1. the deck is ordered by rank, with suits in the order clubs, diamonds, hearts, spades;
  2. it's shuffled with the linear congruential generator `seed = seed × 214013 + 2531011 (mod 2³¹)`, using `seed >> 16`;
  3. the cards are dealt left to right.
  - `tools/check-engine.js` checks the result against the published layouts of #1 and #617.
- **Columns:** build down in alternating colors, and any card can go in an empty column.
- **Cells:** each holds one card.
- **Done:** builds up by suit from the ace. Cards can be taken back off a Done list.
- **Runs:** a run in sequence moves together if it's no longer than (empty cells + 1) × 2^(empty columns). When the destination is an empty column, that column doesn't count. Only the run on top of a column can be picked up.
- **Solved:** every column runs from high to low, so no card has a higher one on top of it. Then every remaining card can go to Done without any choices. `nextHome()` always picks the lowest card that fits.

## Controls

- **Moving cards:** the same as Solitaire. Click a card to pick it up and click a highlighted list to drop it, or drag it. Esc lets go.
- **Runs too long for the free space:** you can still pick up or drag them, but no list lights up. As soon as you pick one up, the message bar explains: "Moving 5 cards needs more free space. With 2 empty Cells and no empty columns, you can move 3 at a time…". Dropping it on a column it would otherwise fit shows the same message. Added 2026-11-25 after Kramps took a silent refusal for a bug. The rule itself is standard.
- **Double-click** sends a card to its Done list, or to a free Cell if it can't go to Done yet.
- **Undo** (Ctrl+Z): any number of moves, for this page visit. It's off while the board finishes itself and once the game is won, because the win has already been counted.
- **Leaving a game:** New game (F2) or a different Game # ends your streak if you've moved and haven't won. If you have a streak going, the message bar asks first ("Leaving game #617 ends your win streak of 3"), with **Start game #n** / **Keep playing**.
- **The clock** starts with the first move and runs only while the page is visible. The move count includes the cards sent to Done at the finish.

## Message bar

- Before your first move: "Game #617.", how to move cards, and a note when it's #11982.
- "Every column is in order. Finishing the board…" while it finishes.
- **On a win:** "Game #617 cleared in m:ss and N moves.", then wins, streak (with the best streak if it's higher) and the best time (or "New best time"), plus **New game** and **Email me new games**.

## Saving

localStorage, all optional:
- `freecell`: the game, which is checked on load. A reload while the board is finishing picks up where it was.
- `-stats`: `{ won, streak, bestStreak, best }`.
- `-window`: the window rect.

## Code

- `engine.js` holds the deals, rules, run length, the solved check and save validation, with no DOM.
- `game.js` runs the board, input, finishing, stats and the Game # box. It's adapted from `solitaire/game.js`, with the same click, drag and double-click handling.
- `tools/check-engine.js` checks:
  - the deals #1 and #617, and that New game never picks #11982;
  - runs and how long a run free space allows;
  - cells and Done;
  - that a solved board always finishes and wins;
  - 40 random-play games, checking that no card is ever lost or duplicated.
- Run it with `node freecell/tools/check-engine.js`. The folder's `package.json` sets `"type": "commonjs"`.

## SEO

- The page has the title "FreeCell at Work: Free FreeCell Solitaire, No Ads, Looks Like a Task Board", a meta description, a canonical URL, Open Graph tags, and a hidden header with the H1, how to play, and links to Solitaire, the spreadsheet hub and the originals.
- The page is in `sitemap.xml`.
- The keywords haven't been checked yet ("freecell at work", "freecell no ads").
