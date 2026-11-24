# Spreadsheet Word Search

Word search in a spreadsheet window, at `/spreadsheet-games/word-search/`. It's listed on the home page in the **Classic Games** folder as "Word Search" ("Word puzzle", spreadsheet icon). Built 2026-11-24. It was the first game picked from the 2026-11-24 list in `SEO_PLAN.md` › Next games, where the keywords to check are also listed.

## Decisions (2026-11-24, with Kramps)

- **40 themes:** 8 office themes and 32 general ones, all lists we wrote ourselves, so there's no dictionary to license and no brand names.
- **No hints.**
- **12 words per puzzle** on every level.
- **All 8 directions on every level, and lots of crossings** (changed 2026-11-24 after Kramps's first round, where no words overlapped and Easy/Medium had only some directions). Levels now differ by grid size only.

## Look

- **One Spreadsheet window.** It is titled with the puzzle's theme: "Office Supplies" on Quality, "Office Supplies - Spreadsheet" on Value, and "Office Supplies — Spreadsheet" on Power and phones. The first sheet tab is the theme too, then "Notes". A puzzle in progress reads like a real worksheet. The chrome comes from `../sheet.css`.
- **The letters** fill the range from A1 (10×10, 12×12 or 15×15), framed by a darker border. Cells are 30×28px on desktop. On phones they are square and sized so the whole grid fits the screen width (22–36px).
- **The word list:**
  - On desktop, it sits after one blank column: a **Words** column (170px) and a **Found** column, with header row 1 and the words in rows 2–13.
  - On phones, it sits under the grid after a blank row, two words per row. Each word cell is merged across several columns, followed by its Found cell.
  - Words are listed in alphabetical order, like a sorted column, and keep their spaces ("PAPER CLIP"). The grid uses the letters only.
- **Selecting a word:**
  - The letters being selected get a range highlight.
  - Meanwhile the name box shows the range (`C3:H3`) and the formula bar shows the letters in it (`CHISEL`).
- **A found word:**
  - its letters get a light fill, cycling through 8 colors like conditional formatting, and they flash when found;
  - where words cross, the cell takes the last word's color;
  - in the list, the word gets the same fill and a strikethrough, and its Found cell shows ✓.
- **Toolbar:** **New** (F2) and **Level** (Easy, Medium, Hard), then the formatting buttons for show (hidden on phones).
- **Message bar:**
  - until the first word is found: how to play for the current level, and where the list is;
  - on a win: "All 12 found in m:ss" with the best time for the level, **New puzzle** and **Email me new games**.
- **Status bar:** Ready / Calculation complete, "Found: n of 12" and "Time: m:ss".

## Levels

| Level | Grid |
|---|---|
| Easy | 10×10 |
| Medium | 12×12 |
| Hard | 15×15 |

Words run in any of the 8 directions (across, down, both diagonals, and each backwards) on every level.

## Puzzles (`engine.js`)

Puzzles are made in the browser, in about 7ms each.
1. **Pick the theme:** at random, never the same one twice in a row.
2. **Pick the words:** 12 from the theme that fit the grid (3+ letters). A word is skipped if it is a palindrome, or if it sits inside an already-picked word, or contains one, forwards or backwards. For example PEN can't be picked with PENCIL.
3. **Lay the words:** longest first. For each word every legal spot is listed: in bounds, any of the 8 directions, letters matching wherever it crosses a word already down. 80% of the time it goes on a spot that crosses at least one word, weighted by how many it crosses, so a word can cross several. Otherwise it goes on any legal spot. Two words never share cells along the same line, since that would read as one long word. This averages about 9 crossings per 12-word puzzle.
4. **Fill the rest:** half the filler letters come from the puzzle's own words, for near misses, and half from English letter frequency.
5. **Check the grid:** every word must appear exactly once in any direction, and no word on a short block list may appear unless it lies entirely inside one placed word. The block list is ROT13-encoded in the source. If the check fails, the grid is refilled, and failing that, rebuilt.

## Controls

- **Drag:** drag from a word's first letter to its last, in either direction. The drag snaps to the nearest straight line and stays inside the grid. On touch screens, letter cells don't scroll the sheet, so dragging works there too.
- **Click or tap:** click the first letter, then the last.
  - Clicking the same letter again drops it.
  - A click that isn't in a straight line from the first letter starts over from there.
- **Keyboard:** arrows move the selected cell, Enter or Space marks the first or last letter, Esc drops it, F2 starts a new puzzle.
- **Wrong selections** just clear, with no penalty.
- **The clock** runs while the puzzle is unfinished and the tab is visible.

## Saving

localStorage, all optional:
- `spreadsheet-word-search-<level>`: the puzzle in progress for each level, so switching levels resumes it;
- `-level`: the last level played (Medium the first time);
- `-best`: the best time for each level;
- `-theme`: the last theme, so the next puzzle uses a different one;
- `-window`: the window rect.

## Code

- `words.js` holds the themes. Each theme needs at least 12 words of 10 letters or fewer.
- `engine.js` makes puzzles and matches selections, with no DOM.
- `game.js` runs the sheet.
- `tools/check-engine.js` checks the themes and 450 generated puzzles (each word appears once, every level uses all 8 directions, words cross but never overlap along a line, and the matching works). Run it with `node spreadsheet-games/word-search/tools/check-engine.js`. The folder's `package.json` sets `"type": "commonjs"` so the check can `require` the files.

## SEO

- The page has a keyword `<title>` ("Spreadsheet Word Search: Word Search That Looks Like Excel"), a meta description, a canonical URL, Open Graph tags, and a visually hidden header with the H1, how to play and links to the sibling games.
- The page is in `sitemap.xml`.
- The keywords haven't been checked yet (see `SEO_PLAN.md`).
