# Ctrl+Alt+Deal — game definition

Oct 26, 2026 · @Michael

## Overview

Ctrl+Alt+Deal is a solo deckbuilder built on five-card draw (video poker). Your money is both your score and your shop budget. Each hand you bet some of it, draw once, and get paid by the paytable for the poker hand you make. Between hands you can spend money to remove or duplicate cards, so strong hands come up more reliably. Each level ends with a boss hand that must pay a target multiple, and the targets climb steeply, so you have to keep improving your deck and your paytable to stay ahead.

- You win by beating the boss hand of level 8.
- You lose when you can no longer cover the minimum bet.

## Glossary

| Term | Meaning |
|---|---|
| Run | One full game, from $25 to a win or a loss |
| Bankroll | The money you have right now |
| Level | A stage of the run. There are 8, and each has 5 hands |
| Hand | One bet, deal, draw and payout |
| Boss hand | The 5th hand of each level. It must pay at least that level's target multiple to move on (called "gate hand" in the code) |
| Bet | What you stake on a hand, between the minimum and maximum bet |
| Payout multiple | Profit as a multiple of your bet. 2x on a $5 bet wins $10. 0x returns your bet. -1x loses it |
| Paytable | The payout multiple for each poker hand at the current level |
| Deck | Your cards. It starts as a standard 52-card deck and changes in the shop |
| Remove | Shop action that takes a card out of your deck permanently |
| Duplicate | Shop action that adds an identical copy of a card to your deck |

## Run structure

1. Start the run with a bankroll of $25 and a standard 52-card deck.
2. Each level has 5 hands. Hands 1 to 4 are ordinary hands: win or lose, you move on to the next hand.
3. Hand 5 is the boss hand. Each level's boss has a target payout multiple (see Bosses). The boss hand uses the same paytable and betting range as every other hand.
   - **Pay the target or more:** you're paid your winnings and move to the next level.
   - **Pay less than the target:** the run is lost (you're still paid what the hand made).
4. Beating level 8's boss wins the run.
5. At any point, if your bankroll is below the minimum bet for the next hand, the run is lost.
6. The shop is open between every hand.

## A hand, step by step

1. **Shop** (optional). Remove, duplicate or change the suit of cards, or increase a hand's payout.
2. **Bet.** Choose a whole-dollar bet between the minimum and maximum bet. The bet is taken from your bankroll.
3. **Shuffle.** Shuffle your entire deck. The deck is always reshuffled before every hand.
4. **Deal.** Deal 5 cards from the top of the deck.
5. **Hold.** Choose which cards to keep. You can discard at most (deck size − 5) cards, so the deck always has enough cards to refill your hand. With a 5-card deck you can't discard anything.
6. **Draw.** Replace each discarded card with the next card from the deck. There is only one draw per hand.
7. **Score.** Find the highest-ranked hand the final 5 cards make and look up its payout multiple for this hand. Anything below a pair is -1x.
8. **Pay out.** Return the bet plus bet × payout multiple to the bankroll. At -1x nothing comes back.

Cards used in a hand go back into the deck, so the next hand starts with the full deck again.

## Hand rankings

Duplicated cards mean a hand can hold identical cards, so some hands are possible here that aren't with a normal deck. A hand is scored as the highest-ranked category it qualifies for. The ranking order never changes between levels.

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
- **Overlaps:** a hand that qualifies for several categories counts only as the highest. A full house in one suit is a full house, not a flush, and four copies of the same card are four of a kind.

## Paytable

Each hand starts at its base multiple. **Increase Hand Payout** doubles the hand's current payout, so Pair goes 1x → 2x → 4x, Two pair 2x → 4x → 8x, Full house 7x → 14x → 28x. Nothing is always −1x and can't be increased. (Changed 2026-10-27; earlier versions lowered payouts at every boss, then each upgrade added the hand's base again.)

| Hand | Base (and each increase) |
|---|---|
| Flush Five | 60x |
| Five of a kind | 40x |
| Straight flush | 25x |
| Four of a kind | 12x |
| Full house | 7x |
| Flush | 5x |
| Straight | 4x |
| Three of a kind | 3x |
| Two pair | 2x |
| Pair | 1x |
| Nothing | -1x |

## Bosses

The boss hand must pay at least the level's target multiple. Any hand type can do it once its payout is high enough, so every build has a route to the end. (Changed 2026-10-27; the previous version named a poker hand to beat.)

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Target | 1x | 3x | 6x | 10x | 18x | 32x | 60x | 120x |

1x and 120x were set by @Michael; the rest were filled in during the build and are a first guess to tune by playing. For scale: a flush clears 120x after 23 increases (5x × 24), four of a kind after 9 (12x × 10), five of a kind after 2 (40x × 3).

## Betting

**Every hand.** A whole-dollar bet between the level's minimum and maximum. Both start at $1 and $10 and grow 4x every level.

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Min bet | $1 | $4 | $16 | $64 | $256 | $1,024 | $4,096 | $16,384 |
| Max bet | $10 | $40 | $160 | $640 | $2,560 | $10,240 | $40,960 | $163,840 |

Both limits grow 4x per level (changed 2026-10-27 from 2x). **Boss hands use the same range**; the old "at least half your bankroll" boss minimum was dropped on 2026-10-27. The max bet is also capped at your bankroll.

**Losing.** If your bankroll is below the minimum bet for the next hand, the run ends. Spending in the shop counts too, so the shop warns you before a purchase that would leave you unable to bet.

## Shop

Open between every hand, with as many purchases per visit as you can afford.

- **Remove:** take any one card out of your deck permanently. Not available at 5 cards, the minimum deck size.
- **Duplicate:** add an exact copy (same rank and suit) of any card in your deck. Copies of copies are allowed. No maximum deck size.
- **Change suit:** change any one card to a suit of your choice; its rank stays. (Added 2026-10-27.)
- **Increase Hand Payout:** pick any hand type except Nothing and double its payout (see Paytable). The paytable tags upgraded hands with the total factor (×2, ×4, …). Needs no card. The button opens a list of hands showing each one's payout before and after (e.g. "Full house: 7x → 14x"); the price is only on the button. (Added 2026-10-27.)

**Pricing.** Each action has its own price counter for the whole run. Remove, Duplicate and Change suit start at $2; Increase Hand Payout starts at $10 and triples each time ($10, $30, $90, $270, $810, …), one counter shared by all hands. Each Remove, Duplicate or Change suit purchase raises that action's next price by 50%: `price(n) = ceil(start × growth^(n − 1))`, where n counts this purchase and growth is 1.5, or 3 for Increase Hand Payout. (Payout growth changed from 1.5 to 3 on 2026-10-27.) Computed from the unrounded formula each time, so rounding doesn't compound.

| Purchase # | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Price | $2 | $3 | $5 | $7 | $11 | $16 | $23 | $35 | $52 | $77 |

## UI: a file system

Two windows on the site shell (`KG.makeWindow`), in all three OS looks and both themes.

**Cards window (file browser).** Every card is a file, and card actions are normal file operations.

- Folders: **Deck** (every card you own, in one folder, sorted by suit then rank), **Hand** (the 5 cards dealt this hand). There is no Trash folder; replaced cards aren't shown anywhere after the draw. (Trash removed 2026-10-27.)
- Card files are named with words, like `eight-hearts.card` or `ace-clubs.card`. A duplicate gets the OS look's usual copy name. The file icon shows only the rank and suit letter (`8H`, `AC`, `10S`); no suit symbols appear anywhere in the game. Labels use a four-color deck: spades black, hearts red, diamonds blue, clubs green.
- **Replace:** click cards in Hand to select the ones you want to replace (click again to unselect). Unselected cards are held. There is no Delete step. (Changed 2026-10-27; the first version discarded with Delete or drag-to-Trash.)
- **Draw:** a toolbar button styled as Refresh replaces the selected cards. After that the hand is final. Once the hand is paid out (and before the first deal) the same button reads "Edit deck" and opens the Deck folder; it's greyed out only after the run ends.
- **Remove:** right-click a card in Deck → "Delete permanently — $X".
- **Duplicate:** right-click a card in Deck → "Duplicate — $X" (or copy and paste it).
- **Change suit:** select a card in Deck, press "Change suit $X" and pick one of the other three suits (also in the right-click menu). The file is renamed, e.g. `king-clubs.card` → `king-hearts.card`; if that card already exists it becomes a copy (`king-hearts - Copy.card`).
- Status bar: the deck's card count and both current shop prices.

**Account window (game state).** Styled as a Properties panel: bankroll; level and hand ("Level 3 of 8 · Hand 5 of 5 · Boss"); a row of five boxes for this level's hands, filled as you play, where the fifth is gold and shows the boss target ("10x") instead of "5"; this level's boss target ("Win 10x or more on hand 5"); min and max bet; bet input and Deal; the paytable; a short log of recent hands.

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
| BASE_MIN_BET | $1, ×4 each level |
| BASE_MAX_BET | $10, ×4 each level |
| BOSS_TARGETS | 1x, 3x, 6x, 10x, 18x, 32x, 60x, 120x |
| PAYOUT_BASE_PRICE | $10 (Increase Hand Payout) |
| PAYOUT_FLOOR | -1x |
| SHOP_BASE_PRICE | $2 each for Remove, Duplicate, Change suit |
| SHOP_PRICE_GROWTH | ×1.5 per purchase, separate for each action |
| PAYOUT_PRICE_GROWTH | ×3 per Increase Hand Payout purchase |
| Base payouts | Pair 1x, Two pair 2x, Three of a kind 3x, Straight 4x, Flush 5x, Full house 7x, Four of a kind 12x, Straight flush 25x, Five of a kind 40x, Flush Five 60x |

## Assumptions to confirm

1. The base payouts are a first guess and haven't been tested.
2. Boss targets for levels 2–7 (see Bosses) were filled in during the build.
3. A boss hand that falls short still pays what it made before the run ends (it doesn't matter for the score, but the log shows it).
4. Increase Hand Payout uses one price counter for all hands, so spreading upgrades costs the same as stacking them. Because each upgrade doubles, stacking one hand grows much faster than spreading.
5. All money is in whole dollars. Shop prices round up.
6. You can discard at most (deck size − 5) cards, so the hand can always be refilled.

## Open questions

- **Balance.** Boss targets, the $10 / ×3 payout price and 4x bet growth all interact. A simulation of a few strategies (stack one hand, spread upgrades, upgrade plus duplicate) would show whether each can win before tuning by feel.
- **Onboarding.** Probably a short first-run walkthrough of one hand and one shop purchase. Not built; content to be agreed first.

## Implementation (first build, 2026-10-26)

Files: `engine.js` (rules, no DOM; runs under node), `game.js` (both windows), `style.css`, `tools/check-engine.js` (`node ctrl-alt-deal/tools/check-engine.js`).

Decisions made while building, beyond the definition above:

- **Saving:** the run is saved to localStorage (`ctrl-alt-deal-run`) after every action, including mid-hand with the shuffled draw order, so reloading can't reshuffle a bad deal. Window positions are saved too.
- **Bet cap:** the maximum bet is also capped at your bankroll.
- **Copy names:** Value `king-clubs - Copy`, `king-clubs - Copy (2)`; Quality `king-clubs copy`, `king-clubs copy 2`; Power and phone `king-clubs (2)`, `king-clubs (3)`. Numbering is per rank+suit, so a copy of a copy is just the next number.
- **Folders:** the top folder is "Cards" (Deck, Hand). Folders open on double-click (a tap on phones).
- **One Deck folder:** the definition's per-suit subfolders were dropped on 2026-10-27; every card sits directly in Deck.
- **Hand selection:** in Hand a click toggles whether a card will be replaced; the Draw button shows the count ("Draw 2"), and reads "Keep hand" when nothing is selected. The marks are saved with the run. In Deck a click selects one card (click again to unselect).
- **Shop buttons:** in Deck the toolbar shows, left to right, "Delete card $X", "Duplicate card $X", "Change suit $X" and "Increase Hand Payout $X" (always with the current price; phones shorten them to Delete, Copy, Suit, Payout) in place of Draw. They light up only when a card is selected and you can pay for the action and still cover the next hand's minimum bet. A purchase that would leave you short stays clickable, unhighlighted, and asks before ending the run. The right-click / long-press menu still works too.
- **Money format:** amounts under $1M show in full ($163,840); from $1M up they're shortened to three significant digits with M, B, T or Q ($1.23M, $48.3B), rounded down so the bankroll never looks bigger than it is. The bet input still takes the full number.
- **Hand order:** Hand and the Account window's last hand are shown strongest first (aces left, 2s right), not in deal order.
- **After the draw** Hand keeps showing the final 5 cards (drawn ones animate in) with the result in a banner, until the next Deal.
- **Keyboard:** Ctrl/⌘+A in Hand selects every card to replace. Delete/Backspace in Deck asks to permanently delete (Shift+Delete skips the question). Ctrl/⌘+C then Ctrl/⌘+V duplicates. F5 or Ctrl/⌘+R draws while a hand is in play. Enter in the bet field deals.
- **Phones:** the shell's bottom bar holds the site nav, so the game adds an Account / Cards tab strip along the top to switch screens. Deal switches to Cards; the result banner has a "Next hand" button back to Account. The sidebar becomes a scrolling row of folders.
- **Bar icon:** `os/os.js` gained an `Account` icon for the taskbar.
- **Win/loss** show a dialog with a New run button; New run in the Account window asks first if a run is in progress.
