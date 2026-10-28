# Ctrl+Alt+Deal — game definition

Oct 26, 2026 · @Michael

## Overview

Ctrl+Alt+Deal is a solo deckbuilder built on five-card draw (video poker). Your money is both your score and your shop budget. Each hand you bet a set amount of it, draw once, and get paid by the paytable for the poker hand you make. Between hands you can spend money to remove or duplicate cards, so strong hands come up more reliably. Each level ends with a boss hand that must pay a target multiple, and the targets climb steeply, so you have to keep improving your deck and your paytable to stay ahead.

- You win by beating the boss hand of level 8.
- You lose when your bankroll reaches $0.

## Glossary

| Term | Meaning |
|---|---|
| Run | One full game, from $25 to a win or a loss |
| Bankroll | The money you have right now |
| Level | A stage of the run. There are 8, and each has 5 hands |
| Hand | One bet, deal, draw and payout |
| Boss hand | The 5th hand of each level. It must pay at least that level's target multiple to move on (called "gate hand" in the code) |
| Bet | What you stake on a hand: set by the level and hand, or everything you have if that's less |
| Payout multiple | Profit as a multiple of your bet. 2x on a $5 bet wins $10. 0x returns your bet. -1x loses it |
| Paytable | The payout multiple for each poker hand at the current level |
| Deck | Your cards. It starts as a standard 52-card deck and changes in the shop |
| Remove | Shop action that takes a card out of your deck permanently |
| Duplicate | Shop action that adds an identical copy of a card to your deck |

## Run structure

1. Start the run with a bankroll of $25 and a standard 52-card deck.
2. Each level has 5 hands. Hands 1 to 4 are ordinary hands: win or lose, you move on to the next hand.
3. Hand 5 is the boss hand. Each level's boss has a target payout multiple (see Bosses). The boss hand uses the same paytable and betting range as every other hand. As soon as the boss hand comes up (right after hand 4 is paid), the boss puts as many random cards into your deck as its level (see Bosses).
   - **Pay the target or more:** you're paid your winnings and move to the next level.
   - **Pay less than the target:** the run is lost (you're still paid what the hand made).
4. Beating level 8's boss wins the run.
5. At any point, if your bankroll reaches $0, the run is lost.
6. The shop is open between every hand.

## A hand, step by step

1. **Shop** (optional). Remove, duplicate or change the suit of cards, or increase a hand's payout.
2. **Bet.** The hand's bet is taken from your bankroll; if you have less than that, you bet everything you have. You don't choose the amount.
3. **Shuffle.** Shuffle your entire deck. The deck is always reshuffled before every hand.
4. **Deal.** Deal 5 cards from the top of the deck.
5. **Hold.** Choose which cards to keep. You can discard at most (deck size − 5) cards, so the deck always has enough cards to refill your hand. With a 5-card deck you can't discard anything.
6. **Draw.** Replace each discarded card with the next card from the deck. There is only one draw per hand.
7. **Score.** Find every hand the final 5 cards make and add up their payout multiples (see Paytable). Anything below a pair is -1x.
8. **Pay out.** Return the bet plus bet × payout multiple to the bankroll. At -1x nothing comes back.

Cards used in a hand go back into the deck, so the next hand starts with the full deck again.

## Hand rankings

Duplicated cards mean a hand can hold identical cards, so some hands are possible here that aren't with a normal deck. A hand pays for every category it qualifies for (see Paytable); the highest-ranked one names it. The ranking order never changes between levels.

| Rank | Hand | Definition |
|---|---|---|
| 1 (best) | Flush Five | 5 cards of the same rank and the same suit, such as five A♠ |
| 2 | Five of a kind | 5 cards of the same rank, not all one suit |
| 3 | Straight flush | 5 consecutive ranks, all one suit |
| 4 | Four of a kind | 4 cards of the same rank |
| 5 | Full house | 3 of one rank and 2 of another |
| 6 | Flush | 5 cards of the same suit |
| 7 | Straight | 5 consecutive ranks |
| 8 | Three of a kind | 3 cards of the same rank |
| 9 | Two pair | 2 of one rank and 2 of another |
| 10 | Pair | 2 cards of the same rank. Any pair counts; there's no "jacks or better" rule |
| — | Nothing | Anything else. Always -1x |

- **Straights:** aces count high or low, so A-2-3-4-5 and 10-J-Q-K-A both count. Straights don't wrap around, so Q-K-A-2-3 isn't one.
- **Overlaps:** a hand that qualifies for several categories is paid for all of them, each once. A full house is also three of a kind, two pair and a pair; a full house in one suit is a flush as well. Four of a kind is also three of a kind and a pair (not two pair). Two pair pays Pair once, not twice. (Changed 2026-10-28; before, only the highest category paid.)

## Paytable

A hand pays every category it matches, added together. Each hand starts at its base multiple, and **Increase Hand Payout** doubles that hand's own payout, so Pair goes 1x → 2x → 4x and Full house 8x → 16x → 32x. Because Pair is part of every rank hand, doubling Pair also raises Two pair, Three of a kind, Full house and so on. Nothing is always −1x and can't be increased. (Changed 2026-10-27; earlier versions lowered payouts at every boss, then each upgrade added the hand's base again.)

The bases (changed 2026-10-28) are set so each hand's **total** roughly follows how rarely a standard deck makes it, compressed for the rare hands so they don't run into the thousands. Odds are from a 400,000-hand simulation with a sensible hold strategy (keep pairs and better, else 4 to a flush, else 4 to an open straight, else redraw all).

| Hand | Own payout | Also pays | Total | Chance (standard deck) |
|---|---|---|---|---|
| Flush Five | 138x | Five of a kind, Four of a kind, Flush, Three of a kind, Pair | 300x | — |
| Five of a kind | 110x | Four of a kind, Three of a kind, Pair | 150x | — |
| Straight flush | 78x | Flush, Straight | 100x | 0.01% |
| Four of a kind | 35x | Three of a kind, Pair | 40x | 0.24% |
| Full house | 8x | Three of a kind, Two pair, Pair | 15x | 1.2% |
| Flush | 12x | — | 12x | 1.1% |
| Straight | 10x | — | 10x | 1.1% |
| Three of a kind | 4x | Pair | 5x | 7.4% |
| Two pair | 2x | Pair | 3x | 13% |
| Pair | 1x | — | 1x | 50% |
| Nothing | -1x | — | -1x | 27% |

Totals in the table assume a hand in more than one suit; a one-suit full house or four of a kind adds Flush too. With these bases a standard deck returns about +1.5x the bet per hand on average, up from about +0.9x with the old table, and the boss targets haven't been retuned for it yet.

## Bosses

The boss hand must pay at least the level's target multiple. Any hand type can do it once its payout is high enough, so every build has a route to the end. (Changed 2026-10-27; the previous version named a poker hand to beat.)

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Target | 2x | 6x | 20x | 60x | 175x | 550x | 1,650x | 5,000x |
| Cards added | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |

**Boss cards** (added 2026-10-28). When a level's boss hand comes up, right after hand 4 is paid, the boss adds as many cards to your deck as its level: 1 on level 1, up to 8 on level 8, 36 over a full run. Each card's rank and suit are picked at random, independently, so a card can match one you already own; it's then a copy (named like a Duplicate). They're permanent deck cards like any other. Because they arrive before the shop opens for the boss hand, you can see them and pay to delete them before dealing. The hand 4 result and the boss note in the Account window list them ("The boss put 3 random cards in your deck: 7H, KS, 2C").

2x and 5,000x were set by @Michael; the levels between follow a steady ×3.06 curve (rounded). With no increases, two pair clears level 1 (a lone pair doesn't), a straight or better level 2, and four of a kind level 3. (Changed 2026-10-28: first from 1, 3, 6, 10, 18, 32, 60, 120x to 1, 2, 5, 12, 25, 60, 130, 300x, then to these.) For scale at level 8: a flush clears 5,000x after 9 increases (12x × 512), four of a kind after 8 (35x × 256 + 5x), five of a kind after 6 (110x × 64 + 40x).

## Betting

**Every hand.** The bet is fixed by the hand: $10, $12, $14, $16 and $20 for level 1's five hands (the $20 is the boss), and each hand bets 4x the same hand on the level before. There is no bet input.

| Level | Hand 1 | Hand 2 | Hand 3 | Hand 4 | Boss |
|---|---|---|---|---|---|
| 1 | $10 | $12 | $14 | $16 | $20 |
| 2 | $40 | $48 | $56 | $64 | $80 |
| 3 | $160 | $192 | $224 | $256 | $320 |
| 4 | $640 | $768 | $896 | $1,024 | $1,280 |
| 5 | $2,560 | $3,072 | $3,584 | $4,096 | $5,120 |
| 6 | $10,240 | $12,288 | $14,336 | $16,384 | $20,480 |
| 7 | $40,960 | $49,152 | $57,344 | $65,536 | $81,920 |
| 8 | $163,840 | $196,608 | $229,376 | $262,144 | $327,680 |

(Changed 2026-10-27: briefly one bet per level, $10 ×4.)

**All in.** If your bankroll is less than the hand's bet, you bet everything you have.

**Losing.** If your bankroll reaches $0, the run ends. Spending in the shop counts too, so the shop asks before a purchase that would spend your last dollar.

(Changed 2026-10-27: earlier versions let you pick a bet between a minimum and maximum, $1–$10 growing 4x per level, and ended the run when you couldn't cover the minimum.)

## Shop

Open between every hand, with as many purchases per visit as you can afford.

- **Remove:** take any one card out of your deck permanently. Not available at 5 cards, the minimum deck size.
- **Duplicate:** add an exact copy (same rank and suit) of any card in your deck. Copies of copies are allowed. No maximum deck size.
- **Change suit:** change any one card to a suit of your choice; its rank stays. (Added 2026-10-27.)
- **Increase Hand Payout:** pick any hand type except Nothing and double its payout (see Paytable). The paytable tags upgraded hands with the total factor (×2, ×4, …). Needs no card. The button has no price on it; it opens a list of hands showing each one's payout before and after and its own price (e.g. "Full house: 8x → 16x   $8"). Hands you can't afford are greyed out. (Added 2026-10-27; per-hand prices 2026-10-28.)

**Pricing.** Every action starts at $2. Each Remove, Duplicate or Change suit purchase raises that action's next price by 50%: `price(n) = ceil(2 × 1.5^(n − 1))`, where n counts this purchase.

Increase Hand Payout has a separate price for each hand, all starting at $2. Upgrading a hand multiplies that hand's next price by 4 and every other hand's by 1.5: `price = ceil(2 × 4^own × 1.5^others)`, where own is how many times this hand has been upgraded and others is how many upgrades went to other hands. So stacking one hand gets expensive fast ($2, $8, $32, $128, …), and every upgrade makes the rest a little dearer too. (Changed 2026-10-28; before, one price shared by all hands went up 2.5x per purchase.)

All prices are computed from the unrounded formula each time, so rounding doesn't compound.

| Purchase # | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Price | $2 | $3 | $5 | $7 | $11 | $16 | $23 | $35 | $52 | $77 |

## UI: a file system

Two windows on the site shell (`KG.makeWindow`), in all three OS looks and both themes.

**Cards window (file browser).** Every card is a file, and card actions are normal file operations.

- Folders: **Deck** (every card you own, in one folder, sorted by suit then rank), **Hand** (the 5 cards dealt this hand). There is no Trash folder; replaced cards aren't shown anywhere after the draw. (Trash removed 2026-10-27.)
- **Deal:** the Deal button sits at the left of the Cards toolbar, where a file browser's up arrow and path would be (there are none; the sidebar is the only navigation). It's enabled between hands. (Moved from the Account window 2026-10-27.)
- Card files are named with words, like `eight-hearts.card` or `ace-clubs.card`. A duplicate gets the OS look's usual copy name. The file icon shows only the rank and suit letter (`8H`, `AC`, `10S`); no suit symbols appear anywhere in the game. Labels use a four-color deck: spades black, hearts red, diamonds blue, clubs green.
- **Replace:** click cards in Hand to select the ones you want to replace (click again to unselect). Unselected cards are held. There is no Delete step. (Changed 2026-10-27; the first version discarded with Delete or drag-to-Trash.)
- **Draw:** a toolbar button styled as Refresh replaces the selected cards. After that the hand is final. Once the hand is paid out (and before the first deal) the same button reads "Edit deck" and opens the Deck folder; it's greyed out only after the run ends.
- **Remove:** right-click a card in Deck → "Delete permanently — $X".
- **Duplicate:** right-click a card in Deck → "Duplicate — $X" (or copy and paste it).
- **Change suit:** select a card in Deck, press "Change suit $X" and pick one of the other three suits (also in the right-click menu). The file is renamed, e.g. `king-clubs.card` → `king-hearts.card`; if that card already exists it becomes a copy (`king-hearts - Copy.card`).
- Status bar: the deck's card count and the Delete, Duplicate and Change suit prices.

**Account window (game state).** Styled as a Properties panel: bankroll; bet size on the line under it (the current or next hand's bet, which is your whole bankroll when you're short); level and hand ("Level 3 of 8 · Hand 5 of 5 · Boss"); a row of five boxes for this level's hands, filled as you play, where the fifth is gold and shows the boss target ("10x") instead of "5"; this level's boss target ("Win 10x or more on hand 5"); a note box that appears only when there's something to say (during a hand, on boss hands, at the end of a run); the paytable, with each hand's own payout and its total, every hand the last hand matched marked, and totals that clear this level's boss in green. The result line lists every match and the sum, e.g. "Full house · Full house 8x + Three of a kind 4x + Two pair 2x + Pair 1x = 15x on $20". (A recent-hands log, a "N more hands, then the boss" note and a paytable footnote were removed 2026-10-27.)

**Phones** (≤ 760px): each window is full-screen, so the two windows are two screens, with the Account screen first. Selecting is a tap; Remove and Duplicate come from a long-press menu.

## Constants

| Constant | Value |
|---|---|
| STARTING_BANKROLL | $25 |
| STARTING_DECK | Standard 52 cards |
| LEVELS | 8 |
| HANDS_PER_LEVEL | 5 (the 5th is the boss hand) |
| HAND_SIZE | 5 |
| DRAWS_PER_HAND | 1 |
| MIN_DECK_SIZE | 5 |
| BASE_BETS | $10, $12, $14, $16, $20 for hands 1–5, ×4 each level (BET_GROWTH) |
| BOSS_TARGETS | 2x, 6x, 20x, 60x, 175x, 550x, 1,650x, 5,000x |
| PAYOUT_BASE_PRICE | $2 (Increase Hand Payout, each hand) |
| PAYOUT_FLOOR | -1x |
| SHOP_BASE_PRICE | $2 each for Remove, Duplicate, Change suit |
| SHOP_PRICE_GROWTH | ×1.5 per purchase, separate for each action |
| PAYOUT_OWN_GROWTH | ×4 to a hand's upgrade price when it's upgraded |
| PAYOUT_OTHER_GROWTH | ×1.5 to every other hand's upgrade price |
| Base payouts | Pair 1x, Two pair 2x, Three of a kind 4x, Straight 10x, Flush 12x, Full house 8x, Four of a kind 35x, Straight flush 78x, Five of a kind 110x, Flush Five 138x (each paid alongside the hands it contains) |

## Assumptions to confirm

1. The base payouts follow simulated standard-deck odds but haven't been playtested. Deck shaping changes the odds a lot (Change suit makes flushes easy), so late-game balance still depends on shop prices.
2. Boss targets for levels 2–7 (see Bosses) were filled in during the build.
3. A boss hand that falls short still pays what it made before the run ends (it doesn't matter for the score, but the log shows it).
4. Increase Hand Payout prices each hand separately (×4 for the hand upgraded, ×1.5 for the rest), so stacking one hand costs much more than spreading upgrades.
5. All money is in whole dollars. Shop prices round up.
6. You can discard at most (deck size − 5) cards, so the hand can always be refilled.

## Open questions

- **Balance.** Boss targets, the per-hand payout prices ($2, ×4 own / ×1.5 others) and 4x bet growth all interact. A simulation of a few strategies (stack one hand, spread upgrades, upgrade plus duplicate) would show whether each can win before tuning by feel.
- **Onboarding.** Probably a short first-run walkthrough of one hand and one shop purchase. Not built; content to be agreed first.

## Implementation (first build, 2026-10-26)

Files: `engine.js` (rules, no DOM; runs under node), `game.js` (both windows), `style.css`, `tools/check-engine.js` (`node ctrl-alt-deal/tools/check-engine.js`).

Decisions made while building, beyond the definition above:

- **Saving:** the run is saved to localStorage (`ctrl-alt-deal-run`) after every action, including mid-hand with the shuffled draw order, so reloading can't reshuffle a bad deal. Window positions are saved too.
- **All in:** with less than the hand's bet, the hand bets your whole bankroll; the Bet size line just shows that amount.
- **Copy names:** Value `king-clubs - Copy`, `king-clubs - Copy (2)`; Quality `king-clubs copy`, `king-clubs copy 2`; Power and phone `king-clubs (2)`, `king-clubs (3)`. Numbering is per rank+suit, so a copy of a copy is just the next number.
- **Folders:** just Deck and Hand, switched from the sidebar. There is no parent "Cards" folder, up arrow or path.
- **One Deck folder:** the definition's per-suit subfolders were dropped on 2026-10-27; every card sits directly in Deck.
- **Hand selection:** in Hand a click toggles whether a card will be replaced; the Draw button shows the count ("Draw 2"), and reads "Keep hand" when nothing is selected. The marks are saved with the run. In Deck a click selects one card (click again to unselect).
- **Shop buttons:** in Deck the toolbar shows, left to right, "Delete card $X", "Duplicate card $X", "Change suit $X" and "Increase Hand Payout" (the card actions always show the current price; Increase Hand Payout shows prices per hand in its list; phones shorten them to Delete, Copy, Suit, Payout) in place of Draw. They light up only when a card is selected and you can pay for the action without dropping to $0. A purchase that would spend your last dollar stays clickable, unhighlighted, and asks before ending the run. The right-click / long-press menu still works too.
- **Help banner:** the how-to text at the top of the Cards window (the shop hint, and the replace instructions during a hand) has an × that hides it until the page is reloaded. Hand results and run over still show. Not saved, so a fresh visit shows the help again.
- **Money format:** amounts under $1M show in full ($163,840); from $1M up they're shortened to three significant digits with M, B, T or Q ($1.23M, $48.3B), rounded down so the bankroll never looks bigger than it is.
- **Hand order:** Hand and the Account window's last hand are shown strongest first (aces left, 2s right), not in deal order.
- **After the draw** Hand keeps showing the final 5 cards (drawn ones animate in) with the result in a banner, until the next Deal.
- **Keyboard:** Ctrl/⌘+A in Hand selects every card to replace. Delete/Backspace in Deck asks to permanently delete (Shift+Delete skips the question). Ctrl/⌘+C then Ctrl/⌘+V duplicates. F5 or Ctrl/⌘+R draws while a hand is in play.
- **Phones:** the shell's bottom bar holds the site nav, so the game adds an Account / Cards tab strip along the top to switch screens. Deal is in the Cards toolbar, so a whole hand plays out on the Cards screen. The sidebar becomes a scrolling row of folders.
- **Bar icon:** `os/os.js` gained an `Account` icon for the taskbar.
- **Win/loss** show a dialog with a New run button; New run in the Account window asks first if a run is in progress.
