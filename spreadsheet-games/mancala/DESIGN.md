# Spreadsheet Mancala

Mancala against the computer in a spreadsheet window, at `/spreadsheet-games/mancala/`. It's listed on the home page in the **Classic Games** folder as "Mancala" ("Board game", spreadsheet icon). Built 2026-11-24, the fourth game from the "Next games" list in `SEO_PLAN.md`.

## Decisions (2026-11-24, with Kramps)

- **Rules:** the common 6-pit rules (see below).
- **Name:** "Mancala" is a generic name for the whole family of games. Don't use "Kalah" anywhere, as `SEO_PLAN.md` says.
- **Seeds per pit:** **4** by default. The **Seeds** setting allows any number from 1 to 10.
- **Captures** happen only when the opposite pit has seeds.
- **Sowing** is animated at **500ms per seed**, about the pace of a person playing by hand. A click on the sheet or any key skips to the end of a move.
- **Computer:** Easy, Medium and Hard, with Hard strong but beatable. Same pattern as Four in a Row, including the **First** setting (Take turns / You / Computer). One player only.

## Rules (`engine.js`)

- **The board:** 6 pits per side and a store at each end. Every pit starts with the chosen number of seeds.
- **A turn:** pick one of your non-empty pits. Its seeds are sown one per slot, counter-clockwise: into your following pits, your store, then the computer's pits. The opponent's store is skipped. A big pit laps the board and sows into its own pit too.
- **Extra turn:** if the last seed lands in your own store, you go again.
- **Capture:** if the last seed lands in an empty pit on your side and the pit across has seeds, both go to your store. If the pit across is empty, the seed just stays.
- **End:** when either side has no seeds left after a move, each player's remaining seeds go to their own store. The bigger store wins, and equal stores are a draw.
- **Slots:** 0–5 are your pits, 6 your store, 7–12 the computer's pits and 13 its store. Pit i faces pit 12 − i.

## The computer (`engine.js`)

- **Easy:** 60% of the time it takes an extra turn or capture if one is available. Otherwise it picks a random pit.
- **Medium:** a 4-move minimax search with alpha-beta.
- **Hard:** a 6-move search. Extra turns keep the same player in the search, and they're tried first.
- **Scoring:** the search scores a position by the store difference, and a finished game counts 100 times as much.
- **Ties:** among equally good pits it picks at random.
- **Hard's depth** was 9 at first, but it beat Medium 18–1, so it was lowered to 6. Hard now beats Medium about 13–6.
- **Timing:** every move takes about 1–20ms, and the computer always waits at least 450ms ("Calculating…").

## Look

- **The window:** one spreadsheet window titled "Mancala" ("Mancala - Spreadsheet" on Value, "Mancala — Spreadsheet" on Power), using `../sheet.css`.
- **Board tab:** the board is **A1:H2**, with a border around it.
  - The computer's store is **A1:A2** (merged) and its pits are **B1:G1**, in blue.
  - Your pits are **B2:G2** and your store is **H1:H2** (merged).
  - Seeds are plain numbers. Stores are bigger and bold on a faint tint, and empty pits are grey.
  - On your turn, your playable pits are bold and show a pointer.
- **Widths:** columns A and H are 72px (56px on phones). Pit columns are 50px, and on phones they're sized so the board fits the width.
- **Merged stores:** the column widths are set on the header row only, because the merged stores shift `nth-child` in row 2. The grid is rebuilt without merged cells on the Moves tab.
- **Totals** in A4:D6 (Store / Pits / Total for You and for the Computer, "CPU" on phones), with formulas `=H1`, `=SUM(B2:G2)` and `=B5+C5`.
- **Formula bar:** a pit shows its number and a store shows `=STORE("you")`. The name box shows `H1:H2` for a merged store.
- **Sowing, one step every 500ms:**
  1. the chosen pit empties (orange);
  2. each seed lands in turn (green, with a little pop);
  3. a capture shows both pits in red as the store fills;
  4. the end-of-game sweep fills both stores.
  - Afterwards, the cell where the last seed landed stays light yellow.
  - The status bar shows "Sowing…", and a click on the sheet or any key skips to the end.
- **Moves tab:** `Move | Player | Pit | Seeds | Result`, where Result is "Extra turn", "Captured n" or "Game over". A final Result row gives the winner and the score.
- **Toolbar:**
  - **New** (F2) and **Undo** (Ctrl+Z). Undo takes back your last move and all of the computer's moves after it, and is disabled after the game ends.
  - **Level**, which applies from the computer's next move.
  - **Seeds** (1–10) and **First**: these start a new game right away if you haven't moved yet or the game is over. Otherwise the message bar says "From your next new game, …" with **Start it now**.
- **Message bar:**
  - how to play until your first move;
  - after a move, "You captured n." / "**Extra turn:** go again." / the computer's version;
  - at the end, "You win, 27 to 21.", your record on that level, **New game**, and **Email me new games** after a win.
- **Status bar:** Ready / Sowing… / Calculating… / Calculation complete, then "Medium · 4 seeds per pit" (hidden on phones) and "Move n".
- **Input:** click or tap one of your pits; keys 1–6 play B2–G2; the arrows move and Enter or Space plays the selected pit.

## Saving

localStorage, all optional:
- `spreadsheet-mancala-game`: seeds, who went first, the moves, the pits, the turn, the result and the level. It's replayed and checked on load. The game is saved before a move is sown, so a reload mid-animation shows the finished move.
- `-settings`: level, seeds, First, and who goes next when taking turns.
- `-record`: wins, losses and draws per level.
- `-window`: the window rect.

## Code

- `engine.js` holds the rules and the computer player, with no DOM.
- `game.js` runs the sheet, the sowing animation, input and turns.
- `tools/check-engine.js` checks:
  - extra turns, passing the turn, captures and no capture across an empty pit;
  - laps that skip the opponent's store;
  - the end-of-game sweep;
  - that seeds are conserved for every seed count from 1 to 10;
  - save validation, and that the computer takes a capture.
- It then plays computer-only matches with timings. Run it with `node spreadsheet-games/mancala/tools/check-engine.js`. The folder's `package.json` sets `"type": "commonjs"`.

## SEO

- The page has a keyword `<title>` ("Spreadsheet Mancala: Free Mancala Game That Looks Like Excel"), a meta description, a canonical URL, Open Graph tags, and a hidden header with the H1, how to play and links to the sibling games.
- The page is in `sitemap.xml`.
- The keywords haven't been checked yet ("mancala in excel", "mancala at work", "mancala no ads").
