# Spades

Partnership Spades at `/spreadsheet-games/spades/`. It's listed on the home page in the **Classic Games** folder as "Spades" ("Card game", with the two-window icon). Built 2026-11-24, the second game from the "Next games" list in `SEO_PLAN.md`.

## Decisions (2026-11-24, with Kramps)

- **The players:** you (South) and a computer partner (North) play against two computer opponents (West and East).
- **Play North setting:** a toolbar toggle that lets you play your partner's hand too.
- **Game length:** first team to **500** wins.
- **Nil and Blind Nil** are both included.
- **Two windows, like Yacht:**
  - your cards are files in a **Files** window;
  - the **Scorecard** is a spreadsheet that logs each trick as a row.
- **Card names:** cards are written as rank plus suit letter, e.g. `KH` (king of hearts) and `KS` (king of spades), `10D`, `2C`. This matches Ctrl+Alt+Deal.
- **No −200 losing floor.** It was tried and dropped the same day: a failed blind nil could end the match in the second hand.

## Rules (`engine.js`)

- **Deal:** each player gets 13 cards. The dealer moves clockwise each hand.
- **Order:** play goes clockwise: You → West → North → East. Bidding and the first lead start left of the dealer.
- **Bids:** Nil, or 1–13. Partners' number bids add up to the team's contract.
- **Play:**
  - You must follow the suit led if you can. Spades are trump.
  - You can't lead a spade until spades are broken, unless you hold only spades.
  - Spades are broken by any spade played, including a lead when you hold only spades.
- **Scoring, per team:**
  - **Making the contract** scores 10 × contract, plus 1 per extra trick. Each extra trick is also a bag.
  - **Bags:** every 10 accumulated bags costs 100 points.
  - **Missing the contract** scores −10 × contract.
  - **Nil:** +100 if the bidder takes no tricks, −100 if they take any. A nil bidder's tricks still count toward the partner's contract, and as bags.
  - **Blind nil:** ±200.
  - **Both partners nil:** the contract is 0, so every trick is a bag, worth 1 point each.
- **Blind nil timing:** it's offered only when the team is behind by 100 or more, and before the player has seen their cards. Your hand stays face down until you choose **Blind nil** or **Look at the cards**. It isn't allowed if the partner has already bid nil. There is no card exchange.
- **Winning:** a team wins on reaching 500. If both reach it, the higher score wins, and a tie plays another hand.

## Computer players

- **Bidding** comes from a strength estimate:
  - spade honors and spade length;
  - side aces and kings;
  - ruffing chances from short side suits when the hand has spare spades.
- **Nil:** a computer player bids nil when the hand has no spade jack or higher, 3 or fewer spades, no side aces, and high side cards only in long suits.
- **Blind nil:** they take it 35% of the time when it's allowed and their team is behind by 200 or more.
- **Covering a nil partner:** they bid a little more boldly.
- **The last bidder** keeps the table total at 14 or under.
- **Play:**
  - **Their own nil:** they stay under the winning card and throw off high cards.
  - **Partner's nil:** they win the trick over their partner.
  - **An opponent's nil:** they duck under it.
  - **Still needing tricks:** they stay low when the partner already has the trick won, and otherwise win as cheaply as they can, saving spades.
  - **Contract already made:** they lose with the highest card that still loses, to avoid bags.
  - **Leading:** they lead top cards ("boss" cards, counting what's been played) when they need tricks, otherwise low.
- **Tested:** `tools/check-engine.js` plays 400 computer-only matches. Nil is made about 75% of the time, and team contracts are missed about 11% of the time.

## Look

**Hand window** (`data-app="Files"`, titled "Hand"). It uses the shared Files chrome and `KG.fileView`.
- **Sidebar:** "My hand" with a count. With Play North on, there's also "North's hand".
- **Path bar:** `My hand › Hand 3 › Trick 5` (or Bidding / Scored / Game over).
- **Default view: Details** (Kramps, 2026-11-24). Large icons is still on the switch, and a saved choice wins.
- **Toolbar:** the view switch, **Help**, and **Play**, which appears only during play.
- **Cards:** files named in words (`king-hearts.card`), with Ctrl+Alt+Deal's white page icon showing `KH` in the suit color.
  - On your turn, cards you can't play are dimmed, and Details shows "Playable" for the rest.
  - Details columns: Rank, Suit, Status.
  - The cards are sorted ♠ ♥ ♣ ♦, high to low.
- **Playing a card:** select it, then Play. Clicking the selected card again or double-clicking also plays it. On a keyboard, ← → select a card and Enter plays it.
- **Banner:**
  - the bids so far;
  - on your bidding turn: "Your cards look like about n tricks" with a bid picker (Nil, 1–13) preset to that estimate, and **Bid**;
  - during play: the current trick ("West **QH**, North **2H**") and what to do ("Play a heart." / "No hearts left: play any card. A spade wins it.");
  - who took the last trick, Next hand, and the blind nil offer.
- **Status bar:** cards left, the bid, tricks taken and the selected card.

**Scorecard** (`data-app="Spreadsheet"`, titled "Scorecard"; "Scorecard - Spreadsheet" on Value, "Scorecard — Spreadsheet" on Power). It has two working sheet tabs plus Notes, which is for show.
- **Tricks** sheet:
  - Row 1: `Hand n | You | West | North | East | Led | Won`.
  - Row 2: the bids. Row 3: tricks taken, with formula `=COUNTIF(G5:G17,"West")`.
  - Rows 5–17: one row per trick, with the card each seat played in the suit color.
  - The winning card is shaded. The led card is underlined in the trick being played, and that row has a grey fill.
  - The Won cell names the winner in team color (green for you and North, rust for West and East), with formula `=WINNER(B5:E5)`.
- **Scores** sheet:
  - **The match so far** on top, so it's visible even in a narrow window:
    - Rows 1–3: `Team | Score | Bags | Need`, one row each for Us and Them.
    - The score is bold, in team color. Need is how far the team is from 500.
    - Formulas point at the latest hand's row (`=F7`) and `=MAX(0,500-B2)`.
  - **From row 5, one row per hand:** Our bid / Taken / Points / Bags / Total, then the same for Their side. Bid cells read like "5 + Nil".
  - The formula bar shows formulas:
    - points: `=10*5+1-100`;
    - taken: `=3+2`;
    - bags with a penalty: `=11-10`;
    - the running total: `=F6+D7`.
  - The hand being played shows its bids in grey italics.
- **The Scorecard switches tabs by itself** (added 2026-11-24, Kramps):
  - When a hand is scored, it switches to **Scores** after the trick pause (1.3s), so the last trick can be read first. Our Score cell is selected, so the formula bar shows where it comes from.
  - When the next hand starts, it switches back to **Tricks**.
  - Clicking a tab yourself during the pause cancels the switch.
  - Reloading during a scored hand opens on Scores.
- **Toolbar:** **New** (F2), which asks in the message bar if a game is going; **Play North** (a toggle); then the formatting buttons for show.
- **Message bar:**
  - an intro on the first hand;
  - after each hand, the summary ("Us +80 (made 8 with 8) · Them −60 (set: bid 6, took 5)") and **Next hand**;
  - at the end, the winner with **New game** and **Email me new games**.
- **Status bar:** Ready / Calculation complete, and "Hand n". The scores used to be here too, but they were hard to see, so they moved to the Scores sheet.

**Pacing:** the computer players act 0.65s apart, and the next lead waits 1.3s after a trick so you can read it. The hand whose turn it is shows automatically with Play North on.

**Phones:** two full-screen views with Hand / Scorecard tabs, Hand first. When a hand is scored, the Scorecard view comes up on Scores. Next hand goes back to the Hand view. The sidebar is hidden, so with Play North on the Hand view switches to North's cards on North's turn.

## Saving

localStorage, all optional:
- `spades-game`: the whole match, including the hands, tricks and history, so a reload resumes mid-trick and the computer players carry on;
- `spades-both`: the Play North setting;
- `spades-view`: Large icons or Details;
- `spades-sheet` and `spades-hand`: the window rects.

## Code

- `engine.js` holds the rules, scoring and computer players, with no DOM.
- `game.js` runs both windows and the turn timers.
- `tools/check-engine.js` checks trick winners, scoring (nil, blind nil, bags, both partners nil), legal plays and blind nil eligibility, then plays 400 computer-only matches. Run it with `node spreadsheet-games/spades/tools/check-engine.js`. The folder's `package.json` sets `"type": "commonjs"`.
- The card icon CSS is copied from Ctrl+Alt+Deal. If a third card game comes, move it into `os/site.css` next to File views.

## SEO

- The page has a keyword `<title>` ("Spades at Work: Free Spades Card Game, No Ads, Looks Like Work"), a meta description, a canonical URL, Open Graph tags, and a hidden header with the H1, how to play and links to the sibling games.
- The page is in `sitemap.xml`.
- The keywords haven't been checked yet (see `SEO_PLAN.md`).
