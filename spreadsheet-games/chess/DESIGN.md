# Spreadsheet Chess

Chess against the computer in a spreadsheet window, at `/spreadsheet-games/chess/`. Listed on the home page in the **Classic Games** folder as "Chess" (type "Board game"). Built 2026-11-19; target keyword "chess in excel", SEO rules in `SEO_PLAN.md`.

## Decisions (2026-11-19)

- **Computer only** for now. Two-player was discussed: pass-and-play on one device and "play by link" (the game encoded in a URL you send a coworker) both need no back end; live online play would need a Cloudflare Durable Object or a third-party WebRTC signaling server. Revisit if people ask.
- **Stockfish** as the opponent, self-hosted, not a web API: free, no rate limits, works offline, nothing leaves the page.
- **Pieces:** a **Pieces** menu with Letters (default; changed 2026-11-19 from symbols), Points and Icons. Points added 2026-11-20 (it replaced the on/off Icons button).
- **Move history** on its own sheet tab (changed 2026-11-19 from columns beside the board).
- **Board:** subtle banding on the dark squares, not a full checkerboard.

## Look

- One **Spreadsheet** window titled "Chess" ("Chess - Spreadsheet" on Value, "Chess — Spreadsheet" on Power), using the shared `../sheet.css` chrome. Rows are taller and columns wider than Minesweeper's: 72×32px, so the board is a wide range of cells (36×36px on phones, so the board fits).
- The board is **B2:I9** with a thin outer border: file letters in row 1, rank numbers in column A, like a table's header row and column. Dark squares get a faint fill. Playing Black flips the board (h…a across, 1…8 down).
- Pieces, chosen in the **Pieces** menu (saved):
  - **Letters** (default): K Q R B N P, White's in capitals, Black's lowercase in blue, so the board reads like data.
  - **Points**: each piece's value as a plain number: pawn 1, knight 3, bishop 3.1 (so it differs from the knight), rook 5, queen 9, king 100. White's are positive; Black's negative and red, like a budget's negative numbers. The most disguised look.
  - **Icons** shows Unicode chess symbols instead (with U+FE0E so phones don't draw emoji): in light mode outlined for White and filled for Black; in dark mode both use the filled symbols, White's light and Black's near-black with a light outline, because an outlined symbol in a light color reads as a filled one.
- Sheet tabs: **Budget** (the board) and **Moves** are real tabs; Notes is for show (hidden on phones). The Moves tab is a table in A1:C: "Move / White / Black" headers, one row per move number, in standard notation; a finished game adds a 1–0 / 0–1 / ½–½ row. Each tab keeps its own selected cell.
- Highlights: last move = light yellow fill on both squares; picked piece = green fill; legal moves = a green dot (a green box for captures); a king in check = red fill.
- Formula bar: `=PIECE("white knight", "g1")` for a piece, the text for label and log cells, nothing for an empty square.
- Promotion: a small dropdown under the target cell (like a data-validation list): Queen, Rook, Bishop, Knight. Esc or clicking away cancels.
- Toolbar: **New** (F2), **Undo** (Ctrl+Z), **Level** (Easy/Medium/Hard, the last custom rating, Custom rating…), **Play as** (White/Black), **Pieces** (Letters/Points/Icons), then the decorative formatting buttons (hidden on phones).
- Message bar: how to start (as White, or "You're Black, so the computer moves first"); on a game end "Checkmate. You win." / "Checkmate. The computer wins." / "Draw by stalemate|repetition|the 50-move rule|insufficient material", plus your record on that level and **New game** (and **Email me new games** after a win). Hidden during play. If the engine can't load: "#N/A The computer opponent couldn't start in this browser."
- Status bar: Ready / Calculating… / Check / Checkmate / Draw, "White · Medium", "Move n".

## Rules and controls

- Rules (legal moves, check, castling, en passant, promotion, all draws) come from **chess.js** (`lib/chess.js`, BSD-2-Clause, license in `lib/LICENSE.txt`).
- Click a piece, then a highlighted cell. Clicking another of your pieces switches to it; clicking elsewhere lets go. Keyboard: arrows, Enter/Space, Esc.
- **Undo** takes back your last move and the computer's reply (cancels the computer if it's still thinking). Disabled until you've moved.
- **Level** changes apply from the computer's next move. **Play as** starts a new game right away if the current one has at most one move or is over; otherwise the message bar says it applies to the next new game, with **Start it now**.

## The computer

- `engine/stockfish.js` + `engine/stockfish.wasm` are Stockfish.js 18 "lite single-threaded" (npm `stockfish@18.0.8`, ≈7MB wasm), unmodified and renamed. GPLv3: `engine/COPYING.txt` and `engine/README.txt` (source links) ship next to it, and Help links to the README. Our code only talks to it through UCI text messages in a Web Worker.
- Levels (in `game.js`): Easy = Skill Level 0, depth 1 (est. 800–1100); Medium = Skill Level 6, depth 6 (est. 1500–1800); Hard = `UCI_LimitStrength` + `UCI_Elo 2000`, 1 second per move (changed 2026-11-19 from full strength, which no human could beat). Easy and Medium's ratings are guesses, not measured.
- **Custom rating…** (last item in the Level menu) opens a dialog for the computer's rating, 1320–3190: the engine's `UCI_Elo` range, calibrated by Stockfish on its engine rating scale (anchored to CCRL), so it's approximate against human ratings. Out-of-range values snap on leaving the field. **Set level** applies from the computer's next move, like the other levels; the menu then shows "Custom · 1650" above "Custom rating…". Custom levels are stored as `elo-<rating>`, and the record is kept per rating.
- The computer always takes at least 450 ms so replies don't feel instant.
- The single-threaded build needs no cross-origin-isolation headers. Cloudflare serves `.wasm` as `application/wasm`.

## Saving

localStorage, all optional: `spreadsheet-chess` (the game: side, level, moves in notation, result), `-settings` (level, next side, pieces, last custom rating; an old `icons: true` becomes `pieces: 'icons'`), `-record` (wins/losses/draws per level, finished games only), `-window`.

## SEO

Keyword `<title>`, meta description, canonical, Open Graph tags, and a visually hidden header with the H1, how to play, a note on Stockfish, and links to the Classic Games folder, Spreadsheet Minesweeper, the two original games and the home page. In `sitemap.xml`. Minesweeper's hidden header links back here.
