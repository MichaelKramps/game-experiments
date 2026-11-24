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
3. 2048 (spreadsheet) — built 2026-11-21 at `/spreadsheet-games/2048/`; written from scratch (no code from the MIT-licensed original), continues past 2048
4. Chess (spreadsheet) — built 2026-11-19 at `/spreadsheet-games/chess/`, ahead of Sudoku and 2048; computer opponent is Stockfish (GPLv3) in a Web Worker
5. Solitaire / Klondike — built 2026-11-20 at `/solitaire/` as a task board (not a spreadsheet), ahead of Sudoku and 2048; see "Solitaire keywords" above
6. Yacht (the Yahtzee-style dice game) — built 2026-11-23 at `/spreadsheet-games/yacht/`: dice as files plus a spreadsheet score sheet. Keywords not researched yet: check "yahtzee in excel", "yahtzee spreadsheet", "yacht dice game", "dice game at work" and "dice game no ads" in Keyword Planner, then revisit its `<title>` (currently "Yacht Dice Game at Work: Free, No Ads, Looks Like a Spreadsheet"). Some "yahtzee excel" searches want a printable score sheet, not a game.

### Next games (picked by Kramps 2026-11-24)

Chosen from a brainstorm of no/low lawsuit-risk classics (see Legal guardrails). Word Search, Spades and Four in a Row are built (2026-11-24); the rest aren't ordered yet. The quickest builds are Reversi, Checkers, Four in a Row, Spider and FreeCell (they reuse Chess, Solitaire or have simple computer opponents). Backgammon and The Landlord's Game are the biggest. None of the keywords have been checked yet.

| Game | Known as (descriptive SEO text only) | Disguise idea | Keywords to check |
|---|---|---|---|
| **Word Search** (built 2026-11-24 at `/spreadsheet-games/word-search/`) | — | Spreadsheet | word search in excel, word search at work, word search no ads |
| Checkers | Draughts | Spreadsheet | checkers in excel, checkers at work, checkers no ads |
| Reversi | Othello (trademark of MegaHouse) | Spreadsheet | reversi in excel, othello in excel, reversi no ads |
| **Four in a Row** (built 2026-11-24 at `/spreadsheet-games/four-in-a-row/`) | Connect Four (Hasbro) | Spreadsheet | connect four in excel, four in a row game, connect 4 at work |
| Salvo | Battleship (Hasbro) | Spreadsheet with two working sheet tabs (your fleet / their fleet) | battleship in excel, battleship spreadsheet, battleship at work |
| Backgammon | — | Dice files (from Yacht) + board | backgammon in excel, backgammon at work, backgammon no ads |
| Mancala | Kalah (avoid that name) | Spreadsheet row | mancala in excel, mancala at work, mancala no ads |
| The Landlord's Game | Monopoly (Hasbro) | Property spreadsheet + board | monopoly in excel, monopoly spreadsheet, monopoly at work |
| Hearts | — | Cards as files | hearts at work, hearts no ads, hearts card game no download |
| **Spades** (built 2026-11-24 at `/spreadsheet-games/spades/`) | — | Cards as files + spreadsheet scorecard | spades at work, spades no ads |
| Gin Rummy | — | Cards as files | gin rummy at work, gin rummy no ads |
| Cribbage | — | Cards as files + spreadsheet pegging | cribbage in excel, cribbage at work, cribbage no ads |
| Euchre | — | Cards as files | euchre at work, euchre no ads |
| Crazy Eights | Uno (Mattel) | Cards as files | crazy eights no ads, uno at work |
| Spider Solitaire | — | Task board, like Solitaire | spider solitaire at work, spider solitaire no ads (spider solitaire unblocked is 1K–10K, mostly students) |
| FreeCell | — | Task board | freecell at work, freecell no ads |

The Landlord's Game is low risk only with our own board layout and property names: no "Chance"/"Community Chest" cards, no "GO" corner, no mascot or Monopoly look. Cut from the brainstorm: Nine Men's Morris, Dots and Boxes, Go, Bulls and Cows, L'Attaque, Nonograms, Calcudoku, Kakuro, Mahjong Solitaire, Lights Out. Skipped for legal risk or size: Risk, Clue, Scrabble, Boggle.

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
- Yahtzee (decided 2026-11-23): the game is **Yacht**, the public-domain game Yahtzee came from, with Yahtzee's rules (rules aren't protected). The five-of-a-kind category is "Yacht". "Yahtzee" never appears as the game's name, in the `<title>`/H1 or in the game UI; it may appear only descriptively in the meta description and hidden SEO text ("a Yahtzee-style dice game"), next to the line "Yahtzee is a trademark of Hasbro … not affiliated with Hasbro." No Hasbro logo, branding, cup art or score-pad artwork. Avoid look-alike names (Yatzee, Yatzy) and other brand names for the game (Kniffel, Kismet).
- Connect Four (decided 2026-11-24): the game is **Four in a Row**, the traditional name. "Connect Four" stays out of the name, `<title>`, H1 and game UI; it appears only descriptively in the meta description and hidden header ("a Connect Four-style game"), next to "Connect Four is a trademark of Hasbro. Four in a Row is the traditional game and is not affiliated with Hasbro." The pieces are X and O letters, not red and yellow discs.
- Avoid: Tetris (Tetris Holding v. Xio, 2012 — look and feel protected), Pac-Man, Space Invaders and other branded arcade games.
- Disguises should be generic spreadsheet/inbox styles — no Microsoft logos/icons, no pixel-perfect Excel/Outlook copies, don't name games "Excel X". Using "Excel" descriptively in page copy ("Minesweeper that looks like an Excel spreadsheet") is different from branding a game with it; keep product names generic ("Spreadsheet Minesweeper").

## Next research step

Run Keyword Planner "Discover new keywords" seeded with `excel games` and `minesweeper in excel` to find more "[game] in excel" terms with volume. (Solitaire terms were checked 2026-11-20, above.)
