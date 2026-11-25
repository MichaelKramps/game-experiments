# Solitaire (task board)

Klondike solitaire on a task board, at `/solitaire/`. Listed on the home page in the **Classic Games** folder as "Solitaire" (type "Card game", task board icon). Built 2026-11-20. Keywords are in `SEO_PLAN.md` ("Solitaire keywords"): the page targets the "solitaire at work" cluster plus "solitaire no ads".

## Decisions (2026-11-20)

- **Disguise:** a task board, not a spreadsheet or file explorer (a file explorer would look too much like Ctrl+Alt+Deal, and Klondike needs all seven piles visible at once).
- **Board look** follows Settings › Task board (Basic / Pro / Enterprise, see the root `DESIGN.md`).
- **Draw 3** by default, **Draw 1** as an option.
- **Cards follow Ctrl+Alt+Deal:** named in words (`eight-hearts`) with a short code (`8H`), no suit symbols anywhere. Picking up a card highlights every list it can go to.
- **Two suit colors** like real cards: hearts and diamonds red, spades and clubs black (changed 2026-11-20 from Ctrl+Alt+Deal's four colors, where the red/black pairing wasn't obvious).
- **List names are plain:** Column 1–Column 7, Deck, Draw pile, Done · Spades / Hearts / Diamonds / Clubs.

## Look

- One **Tasks** window titled "Solitaire" ("Solitaire - Tasks" on Value, "Solitaire — Tasks" on Power), with a Tasks taskbar icon (a board with three blue lists).
- Header: board name "Q4 Planning" (for show), **New game** (F2), **Undo** (Ctrl+Z), **Draw** (3 cards / 1 card), **Help**; moves and time on the right.
- Message bar under the header: how to play before the first move; "Draw N starts with your next new game" with **Start it now** when the Draw setting differs from the game; "Every card is face up" with **Finish**; on a win "Board cleared in m:ss and N moves", the best time for that draw mode, **New game** and **Email me new games**.
- The board: two rows of seven equal lists on the board background. Top row: Deck, Draw pile, a gap, then the four Done lists. Bottom row: Column 1–7. List headers show a count of cards (not on Done lists or phones).
- Cards are tickets: a colored left edge in the suit's color, the code in that color and the name ("8H  eight-hearts"), and a color label ("Red" or "Black"). Nothing overlaps, like a real task board: every ticket is shown in full, one under another with a small gap, and face-down cards are slim collapsed grey tickets. Long columns make the board scroll. The Draw pile lists its top 3 (or 1) cards, only the last one playable. Done lists show their top card and a count.
- Empty lists show a dashed placeholder: "Kings only", "Starts with ace-hearts", "Empty", or "Start over" on an empty Deck when the Draw pile has cards.
- Picked cards get an accent outline; lists they can go to get an accent border.
- Suit colors are lighter on dark boards (dark theme, or the Pro look).
- Phones: tickets show just the code; list names shorten (Col 1, Draw, Done) and placeholders shorten (K, AH).

## Rules and controls

- Standard Klondike: build columns down in alternating colors (hearts/diamonds red, spades/clubs black); only a king goes in an empty column; Done lists build up by suit from the ace. A face-up run moves together. A column's new top card turns over automatically. Cards can come back off a Done list.
- The Deck turns over 3 (or 1) cards; when empty, clicking it puts the Draw pile back as the Deck (unlimited passes). Each turn and each pass counts as a move.
- Click a card to pick it up (click again to drop it), then click a highlighted list; or drag the card (and the cards on it) onto a list. Double-click sends a card to its Done list (detected by hand, since each click redraws the board). Esc lets go.
- **Undo** takes back moves, any number, for this page visit (not kept across reloads).
- **Finish** appears once the Deck and Draw pile are empty and every card is face up; it moves the cards to Done one at a time.
- Changing **Draw** starts a new game right away if the current game has no moves or is won; otherwise it applies to the next new game.
- The clock starts with the first move and runs only while the page is visible.

## Shared with FreeCell

`freecell/` (built 2026-11-25) links this folder's `style.css` for the whole task board look and only overrides what differs (8 lists per row, one-line tickets). A change to `style.css` here changes FreeCell too, so check both.

## Saving

localStorage, all optional: `solitaire` (the game), `-settings` (draw mode), `-stats` (wins and best time per draw mode), `-window`.

## SEO

Title "Solitaire at Work: Free Klondike, No Ads, Looks Like a Task Board", meta description, canonical, Open Graph tags, and a visually hidden header with the H1, how to play and links to the Classic Games folder, both spreadsheet games, the two original games and the home page. In `sitemap.xml`.
