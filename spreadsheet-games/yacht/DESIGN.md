# Yacht

The five-dice scoring game, at `/spreadsheet-games/yacht/`. It's listed on the home page in the **Classic Games** folder as "Yacht" ("Dice game", spreadsheet icon). Built 2026-11-23.

## Decisions (2026-11-23)

- **Name: Yacht**, the public-domain dice game that Yahtzee (a Hasbro trademark) came from. "Yahtzee" never appears as the name, in the `<title>`/H1 or in the game. It appears only descriptively in the meta description and the hidden SEO header ("a Yahtzee-style dice game"), with a not-affiliated line. See `SEO_PLAN.md` › Legal guardrails.
- **Rules: Yahtzee's** (rules aren't protected), not traditional Yacht's. The five-of-a-kind category is called "Yacht".
- **Two windows, like Ctrl+Alt+Deal:**
  - the dice are files in a **Files** window, where you select the ones to roll again, like choosing cards to replace;
  - the score card is a **Spreadsheet**.
- **Keywords:** not researched yet (see `SEO_PLAN.md` › Build order).

## Rules

- 13 turns. Each turn has up to 3 rolls, and one empty category must be filled per turn.
- **Upper section:** Ones–Sixes score the sum of that face. The upper bonus is 35 for 63 or more.
- **Lower section:**
  - Three/Four of a kind: the sum of all dice.
  - Full house (exactly 3 + 2): 25.
  - Small straight (4 in a row): 30.
  - Large straight (5 in a row): 40.
  - Yacht: 50.
  - Chance: the sum of all dice.
  - Five alike isn't a Full house unless the joker applies.
- **Extra Yachts (forced joker):**
  - When the dice are five alike and the Yacht box is already filled:
    - +100 if the box holds 50 (none if it holds 0);
    - the dice must go in the matching upper box if it's empty;
    - otherwise they go in any empty lower box at full value (Full house 25, straights 30/40);
    - if no lower box is free, they go in an empty upper box for 0.
  - The message bar says which case applies.
- There's no undo, because rolls are random.

## Look

**Dice window** (`data-app="Files"`, titled "Dice"). It uses the shared Files chrome from `os/site.css`.
- **Path bar:** "Turn n › Roll n of 3" (or "Not rolled").
- **Toolbar:** the Large icons / Details switch, **Help**, and **Roll**, styled as Refresh. The Roll label changes to "Roll selected" once dice are selected.
- **Sidebar:** a single Dice folder with a count.
- **The dice:** each die is a file named in words (`four.die`) with a white die icon showing its pips. The dice are kept sorted after each roll, and new dice spin in (off with reduced motion). There are two views, switched with two icon buttons in the toolbar (the choice is saved). Both are drawn by the shell's `KG.fileView` (see the root `DESIGN.md`), like Ctrl+Alt+Deal's:
  - **Large icons** (the default): big die thumbnails with the file name under them. Selected dice get the file-selection highlight.
  - **Details**, a list (added 2026-11-23 at Kramps's request): Name (small die icon + file name), Value and Status. Status reads "Keep", or "Roll again" in the accent color for a selected die, and is blank once the rolls are used up. Selected rows are highlighted, and Quality stripes alternate rows.
- **Before a turn's first roll:** the folder is empty ("No dice rolled yet").
- **Banner:** what to do next. On phones it adds **Go to score sheet**.
- **Status bar:** "Turn n of 13 · Roll n of 3 · n selected".

**Score sheet** (`data-app="Spreadsheet"`, titled "Yacht"; "Yacht - Spreadsheet" on Value, "Yacht — Spreadsheet" on Power). The chrome comes from `../sheet.css`.
- **Columns** (one column per game, added 2026-11-23 at Kramps's request):
  - A is the category (150px) and B "How it scores" (180px, muted text);
  - C is the game being played, headed "Game n";
  - D onward are earlier games, newest first, in muted text. One that was left unfinished is italic, and its header's formula bar says "(unfinished)".
  - The live game is always next to the labels, so it never scrolls out of view. The grid keeps a few empty columns past the last game.
- **Rows:**
  - 1: Upper section, How it scores, Game n…
  - 2–7: Ones–Sixes
  - 8: Subtotal (B says how many more points this game needs for the bonus)
  - 9: Bonus
  - 11: Lower section
  - 12–18: the lower categories
  - 19: Yacht bonus
  - 20: Lower total
  - 21: Total (double underline)
  - The total rows are bold on a grey fill.
- **Previews:** each empty category the dice can go in shows a grey italic preview in column C (zeros fainter). Hovering a row highlights it, and clicking A, B or C of that row scores it. A new score flashes green.
- **Formula bar:**
  - scores show how they were made (`=SUM(4,4,4)`, `=25`, `=0`);
  - totals are formulas in each game's own column, e.g. `=SUM(C2:C7)`, `=IF(C8>=63,35,0)`, `=100*n`, `=SUM(C12:C19)`, `=C8+C9+C20`.
- **Toolbar:**
  - **New** (F2): the current game moves into the history as a new column if anything is scored in it (an untouched game is just replaced). A game in progress asks first in the message bar ("This one stays on the sheet, unfinished").
  - **Clear scores**: asks in the message bar ("This can't be undone"), then deletes every earlier game. A finished current game goes too; one in progress stays. Disabled when there's nothing to clear.
  - then the formatting buttons for show.
- **Message bar:**
  - how to play on the first turn;
  - the joker rule when it applies;
  - "Start a new game?" (New game / Keep playing) and "Clear all scores?" (Clear scores / Cancel);
  - at the end: "Final score n" with "Your best yet." (only when it beats an earlier finished game) or the best score, then **New game** and **Email me new games**.
- **Status bar:** Ready / Calculation complete, "Turn n of 13" (or "Total: n"), and "Best: n", the best finished game on the sheet (so Clear scores resets it). The sheet tabs are Scores / Forecast / Notes, for show.

**Help:** a Notes dialog with the rules, opened from the sheet's Help menu or the Dice toolbar.

**Phones:** the two windows are two full-screen views with Dice / Score sheet tabs along the top. Dice comes first, and scoring flips back to Dice.

## Controls

- **Dice:** F5 (or Ctrl+R) rolls. Clicking a die, or pressing 1–5, selects it. Ctrl+A selects or clears all (in the Dice window). Esc clears the selection. Enter rolls in the Dice window.
- **Sheet:** arrows move the selected cell, and Enter scores the selected category row.

## Saving

localStorage, all optional:
- `yacht-game`: the game, including the dice, rolls used and selection, so a reload can't reroll;
- `yacht-history`: the earlier games, oldest first, as `{ sheet, yachts, over }`;
- `yacht-view`: the Dice window's view (`tiles` or `list`);
- `yacht-sheet` and `yacht-roll`: the window rects.

## Code

- `engine.js` holds the rules, with no DOM.
- `game.js` runs both windows.
- `tools/check-engine.js` checks the scoring edge cases and the joker cases. Run it with `node spreadsheet-games/yacht/tools/check-engine.js`.
- The folder has a `package.json` with `"type": "commonjs"` so that the check can `require` the engine (the repo root is `"type": "module"`).

## SEO

Keyword `<title>`, meta description, canonical, Open Graph tags, and a visually hidden header with the H1, how to play, the trademark line and links to the sibling games. In `sitemap.xml`.
