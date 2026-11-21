# kramps.games — Keyword research & game build plan

Context for building new games on kramps.games (browser games disguised as work tasks, for desk-job players). Research done Nov 2026 with Google Keyword Planner (US-style ranges) plus a review of what currently ranks. Revised 2026-11-18: Snake (terminal) and the five-letter word game were dropped, along with the keywords that only served them.

## Key findings

- Search demand is concentrated on **spreadsheet/Excel-disguised games**. Outlook, coding/VS Code, Jira and Slack disguises showed no measurable volume — good for brand/novelty, not for search traffic.
- The niche's existing results are weak (old listicles, forum threads, itch.io pages), so a focused site can realistically rank.
- Keyword Planner "Competition: Low" is ad competition, not organic difficulty. Large % trend jumps at these volumes mostly reflect bucket changes (≈10 → ≈100).
- "excel games" likely mixes two intents: games that *look* like Excel (ours) and downloadable .xlsx games. The same goes for "[game] in excel" terms, which may be mostly people wanting to *build* the game in Excel (VBA tutorials). Check the live results page before building the hub around it.
- Expect modest traffic: even ranking #1 for everything below is probably a few hundred to low thousands of visits a month. Keep each game cheap (shared spreadsheet shell) and make every game page push the email signup.

## Keyword data (avg monthly searches)

| Keyword | Volume | YoY | Use |
|---|---|---|---|
| excel games | 1K–10K | +900% | Spreadsheet-games hub page |
| games that look like work | 100–1K | 0% | Homepage target |
| spreadsheet games | 100–1K | 0% | Spreadsheet-games hub page |
| minesweeper in excel | 100–1K | +900% | Game #1 |
| sudoku in excel | 10–100 | +900% | Game #2 |
| sudoku spreadsheet | 10–100 | 0% | Game #2 |
| 2048 in excel | 10–100 | 0% | Game #3 |
| chess in excel | 10–100 | +900% | Game #4 |
| boss key games | 10–100 | 0% | Homepage/about copy |
| games disguised as work | 10–100 | 0% | Homepage/about copy |
| games to play at work without getting caught | 10–100 | new | Homepage/about copy |
| terminal games | 100–1K | 0% | Possible hub for the terminal games (diff guess key, a terminal solitaire) |
| unblocked games at work | 100–1K | 0% | Homepage/about copy (careful: "unblocked" is mostly students getting past filters) |
| minesweeper spreadsheet, solitaire disguised as excel, spreadsheet solitaire | no data | — | — |

## Solitaire keywords (researched 2026-11-20)

Kramps doesn't think a spreadsheet is the best disguise for solitaire, so a wider list was checked.

| Keyword | Volume | Notes |
|---|---|---|
| free solitaire no download | 10K–100K | Huge but generic; big solitaire sites and Google's own game own it |
| simple solitaire | 1K–10K | Generic |
| solitaire no ads | 1K–10K | Generic, but "no ads" is a real differentiator for this site |
| solitaire unblocked | 1K–10K | Mostly students; +900% 3-month trend |
| spider solitaire unblocked | 1K–10K | Mostly students; Spider, not Klondike |
| klondike solitaire no ads | 100–1K | Best-matched generic term |
| hidden solitaire, secret solitaire, office solitaire, solitaire at work, play solitaire at work, minimalist solitaire | 10–100 each | The "at work" cluster: small but exactly the audience |
| terminal solitaire, text solitaire | 10–100 each | Fits a terminal disguise |
| inbox solitaire, trello solitaire | 10–100 each | Fits an inbox / task-board disguise (Trello is a trademark: descriptive copy only) |
| kanban solitaire, task board solitaire, to do list solitaire, jira solitaire, email solitaire, ascii solitaire, discreet / disguised / stealth solitaire, boss key solitaire, solitaire boss mode, solitaire that looks like work, solitaire for work, work solitaire, clean solitaire, how to play solitaire at work without getting caught | no data | — |

Takeaways:

- No disguise-specific term has real volume; the disguise should be picked for play and fit, not search. Terminal (terminal/text solitaire, plus "terminal games" at 100–1K) and inbox/task board (inbox/trello solitaire) each pick up a few searches; kanban/task board itself has none.
- Target the page at the "at work" cluster (hidden, secret, office, at work: together maybe 50–300 a month) plus "solitaire no ads" / "klondike solitaire no ads" as stretch terms, e.g. title "Solitaire at Work: Free Klondike With No Ads That Looks Like …".
- Solitaire is no longer the weakest bet: the "at work" cluster is similar in size to Sudoku/2048/Chess's keywords, and the no-ads terms are a long-shot upside.

## Build order

1. Minesweeper (spreadsheet disguise) — built 2026-11-18 at `/spreadsheet-games/minesweeper/`
2. Sudoku (spreadsheet) — built 2026-11-21 at `/spreadsheet-games/sudoku/`
3. 2048 (spreadsheet) — original is MIT-licensed; keep the license notice if reusing code
4. Chess (spreadsheet) — built 2026-11-19 at `/spreadsheet-games/chess/`, ahead of Sudoku and 2048; computer opponent is Stockfish (GPLv3) in a Web Worker
5. Solitaire / Klondike — built 2026-11-20 at `/solitaire/` as a task board (not a spreadsheet), ahead of Sudoku and 2048; see "Solitaire keywords" above

Build the spreadsheet look once as a reusable shell inside the `os/` desktop (column letters, row numbers, formula bar, sheet tabs, selected-cell box, themed per OS setting), so game #1 is "shell + Minesweeper" and later games are mostly game logic.

## Site structure / SEO requirements

- Each game gets its own URL, e.g. `/spreadsheet-games/minesweeper`, under a hub page `/spreadsheet-games` targeting "excel games" + "spreadsheet games".
- Homepage targets "games that look like work"; work in "games disguised as work", "boss key", "play at work without getting caught".
- Each page's title, meta description, H1 and descriptive text must be in the HTML the server sends, not added by JS. (Done for existing pages 2026-11-18, see "SEO baseline" below.)
- Each game page: unique title + meta description containing its target keyword, a short description of the game and how to play, links to the hub, sibling games, and at least one of the original games (diff guess key, Ctrl+Alt+Deal).
- Add every new page to `sitemap.xml`.
- Tab title: decided 2026-11-18 to use the keyword title as is ("Spreadsheet Minesweeper: Minesweeper That Looks Like Excel"), even though it shows in the tab. Revisit if it hurts the disguise; the fallback is a disguised title set after the first click (search engines don't click).
- `/spreadsheet-games/` 302-redirects to the home page's Classic Games folder (`/#classic`) until the hub page is built (once 2–3 spreadsheet games exist; switch the redirect off then).

## SEO baseline (done 2026-11-18)

- Homepage: keyword title, meta description, canonical, Open Graph tags, an H1 and intro paragraph, and the game rows written into the HTML (JS still re-renders them).
- About and the listed games: meta descriptions and canonical URLs. Game `<title>`s left unchanged because the tab is part of the disguise.
- `robots.txt` and `sitemap.xml` at the site root.
- Desktop icons link to `/` and `/about` (clean URLs) instead of `index.html` / `about.html`, which 307-redirect.
- Still to do by hand: verify the site in Google Search Console and submit the sitemap.

## Legal guardrails (not legal advice)

- Game rules/mechanics are not copyrightable; code, art, sound and names (trademarks) are protected.
- Safe: solitaire variants, Minesweeper (don't copy Microsoft's graphics/smiley), Sudoku, Snake, chess, checkers, 2048, nonograms (don't call them "Picross"), mahjong solitaire.
- Rename trademarked games: Wordle, Yahtzee, Battleship, Connect Four, Mastermind, Boggle, Scrabble, Uno.
- Avoid: Tetris (Tetris Holding v. Xio, 2012 — look and feel protected), Pac-Man, Space Invaders and other branded arcade games.
- Disguises should be generic spreadsheet/inbox styles — no Microsoft logos/icons, no pixel-perfect Excel/Outlook copies, don't name games "Excel X". Using "Excel" descriptively in page copy ("Minesweeper that looks like an Excel spreadsheet") is different from branding a game with it; keep product names generic ("Spreadsheet Minesweeper").

## Next research step

Run Keyword Planner "Discover new keywords" seeded with `excel games` and `minesweeper in excel` to find more "[game] in excel" terms with volume. (Solitaire terms were checked 2026-11-20, above.)
