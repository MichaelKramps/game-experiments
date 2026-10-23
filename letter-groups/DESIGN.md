# Letter Groups — Terminal Word Game GDD

Oct 23, 2026 · @Michael

## Overview

Letter Groups is a single-player word puzzle played in a browser page styled as a terminal. Each puzzle has 4 groups of 2 to 4 letters, so 8 to 16 letters in all. The player types words to cover every letter at least once, in as few words as possible.

Inspiration: the chaining-and-sides mechanic of NYT Letter Boxed. The square is replaced by labeled letter groups, which suit a text-only interface.

Working title: Letter Groups. It is a plain word game with a terminal look; there is no work disguise.

## Core rules

Every puzzle has exactly 4 groups. Each group holds 2, 3, or 4 distinct letters, and sizes can be mixed (e.g. 2-2-3-4), so a board has 8 to 16 letters. No letter appears in more than one group.

1. **Valid word:** at least 3 letters, in the dictionary, using only puzzle letters.
2. **Group hop:** two consecutive letters in a word can never come from the same group. This also rules out double letters (e.g. BALLOT).
3. **Reuse:** letters may be used any number of times, across and within words.
4. **Win:** the puzzle is solved when every letter has been used at least once.
5. **Score:** the number of words used; lower is better. There is no target number. The screen shows the player's best score on the current puzzle.
6. **After solving:** the player can retry the same puzzle to beat their best, or move on to a new one.

Words are entered in full; there is no letter-by-letter tracing. A rejected word costs nothing and is not added to the word list. Words can come in any order: a word doesn't have to start with the previous word's last letter (an earlier draft had that chaining rule; it was dropped on 2026-10-23).

## Terminal UI

The player only ever types words. There is no command line: every other action is a single non-letter key, listed in a footer legend. Nothing animates on its own.

### Layout

```
letter-groups · seed 7Q4KM

  [ R  O  T     ]
> [ C  L        ]
  [ N  A  W  E  ]
  [ K  S  I  U  ]

  letters used  5/13      words  1      best  4

  1. TWIRL   +5

  > TR_

  [?] hint   [!] reveal   [#] enter seed   [Backspace] undo word   [Tab Tab] new puzzle
```

In the live game, T, W, I, R and L would show green here. The player is typing a second word; the `>` marks the first group because R, the last letter typed, is in it, so the next letter can't come from there.

### Letter colors and group highlight

| Element | Look |
|---|---|
| Letter not yet used | White |
| Letter used in an accepted word | Green |
| Group of the most recent letter | Highlighted row (brighter, with a `>` marker) |
| Everything else (labels, log, legend) | Dim gray |

- The highlight follows the last letter in the input as the player types, showing which group is blocked for the next keystroke.
- Between words the input is empty, so no group is highlighted.
- Letters turn green only when a word is accepted, not while it is being typed.

### Typing filter

Every keystroke is checked as it is typed. An invalid key adds nothing to the input; instead, the groups the player is allowed to type from briefly flash (about 300 ms), so the player sees where to go next.

- A letter not on the board is rejected.
- A letter from the same group as the previous letter is rejected.
- A letter can be reused within a word, as long as it isn't directly after a letter from its own group.
- Lowercase typing is accepted and shown in uppercase.
- Backspace removes the last typed letter.

Because invalid letters can't be entered, the only errors left at submit time are a too-short word and a word not in the dictionary.

### Submitting with Enter

| Result | What happens |
|---|---|
| Valid word | Added to the numbered word list; its new letters turn green; the input clears |
| Fewer than 3 letters | `Too short: words need at least 3 letters`; the input is kept for editing |
| Not in dictionary | `Not a word: TROWLE`; the input is kept for editing |
| Last letters covered | `Solved in 3 words. New best (was 4).`, then the after-solve menu |

### Other keys

| Key | Action |
|---|---|
| `?` | Hint: prints a suggested next word and tags the attempt as assisted |
| `!` | Reveal the reference answer at any time; tags the attempt as assisted |
| `#` | Enter a seed: switches the prompt to `seed>`, accepts the 5-character code, Enter loads it, Esc cancels |
| Backspace with nothing typed | Undo the last accepted word; letters that only it used turn back to white |
| Tab, Tab | Abandon this board and generate a new one (the second press confirms) |

Reveal uses `!` mid-puzzle because D may be one of the board's letters. After solving, D also works, since no word is being typed then.

After solving, no word is being typed, so the input becomes a one-key menu:

```
  [Enter] retry   [N] new puzzle   [S/M/L] new small/standard/large   [D] show reference answer
```

### Hints

Hints reuse the solver the generator already needs, so they are cheap to build. The solver finds the fewest words that cover the remaining letters and reveals one of them (the one covering the most letters), preferring words from the familiar answer list.

## Puzzle generation and dictionary

Puzzles are generated from a guaranteed solution, then checked by a solver. This avoids unsolvable or trivially easy boards.

### Two word lists

Decision: build both lists from SCOWL (Spell Checker Oriented Word Lists), so there is one source and one license to credit.

| List | Source | Why |
|---|---|---|
| Answer list (seeds and hints) | SCOWL size 35, American spelling | SCOWL's recommended small size: common words most players know |
| Validation list (player guesses) | SCOWL up to size 70, American spelling | Sizes 70 and below hold words found in most dictionaries, without obscure Scrabble-only words |

- **License:** SCOWL is assembled from public-domain and BSD-compatible sources and is offered under a permissive MIT-like license. Keep its copyright notice in an About/credits line.
- **Filtering at build time:** keep only lowercase a–z words of 3+ letters; drop proper nouns, abbreviations, and any word with a double letter (it can never be played); remove offensive words using SCOWL's small taboo-word list plus a manual pass.
- **Considered and set aside:** ENABLE (about 173,000 words, public domain) for validation. It accepts obscure Scrabble words like QAT and ZAX, which would let players shortcut boards. Swapping it in later only means replacing one file.
- **Pin the list version:** seeds only reproduce a board if the word lists are unchanged, so ship them as a fixed, versioned file.

### Generation steps

1. Pick a size profile: four group sizes, each 2 to 4 (e.g. 3-2-4-3), giving N letters in total.
2. Pick seed words from the answer list that together contain exactly N distinct letters. Use two words, or three when N is 14 or more.
3. Assign the N letters to groups matching the size profile so no seed word has two consecutive letters from the same group (a small backtracking search). If no assignment works, retry with a new seed.
4. Reject boards where vowels are under a quarter of the letters, more than one of J, Q, X, Z appears, or one group holds more than half the vowels.
5. Run the solver against the validation list and reject boards that a single word can solve.
6. Keep the seed words in memory as the reference answer shown by the after-solve menu.
7. Shuffle letter order within each group and group order on screen, so the seed words aren't visible in the layout.

Difficulty notes: bigger boards need more coverage, and a 4-letter group blocks more next-letter options than a 2-letter one. Clustering vowels in one group makes a board much harder, which is why step 4 limits it.

Every puzzle is generated in the browser when the player asks for one; nothing is stored or served. A board exists only in memory and is discarded when the player moves on or reloads the page.

### Seeds

- Each board comes from a seed fed to a deterministic random-number generator, so the same seed always rebuilds the same board, including its group sizes.
- Seeds are shown as 5-character codes using Crockford base32 (no I, L, O or U, so codes can't be misread). That allows about 33 million boards.
- The current seed is shown in the header (`seed 7Q4KM`).
- Players can load a seed two ways: the `#` key in game, or a URL parameter (`?seed=7Q4KM`) so a link opens straight into that board.
- Size presets (small, standard, large) draw random seeds until one produces a board in the requested size range, so the seed alone is always enough to rebuild it.
- An invalid seed prints `Invalid seed: 7Q4K` and the current board stays.
- Seeds are tied to the word-list version. If the lists change, older seeds will build different boards; accept that, or add a version character to the code later.

## Modes, scoring and progression

There is one mode: endless, freshly generated puzzles. There are no daily puzzles.

| Key | Board size | Letters |
|---|---|---|
| N after solving, or Tab Tab mid-puzzle | Random | 8–16 |
| S after solving | Small | 8–10 |
| M after solving | Standard | 11–13 |
| L after solving | Large | 14–16 |

Result per attempt: the number of words used, compared with the player's best on the current puzzle. Retries are unlimited and the lowest score is kept until the player moves on. Attempts that used a hint are tagged (assisted) and tracked separately from unassisted bests.

Stats (printed in the solve summary) cover the current session only: puzzles solved, average attempts per puzzle, and best score by board size. They live in memory and reset when the page is reloaded; nothing is saved to the browser.

## Legal and originality guardrails

The mechanic is borrowed; everything a player sees is original. Not legal advice; revisit with an IP attorney if the site ever earns money.

- Never use the name "Letter Boxed" or NYT branding, in the game or in site copy.
- No square, no lines drawn between letters, and none of the original's colors or layout.
- Write our own code; don't fork an existing clone.
- Curate our own word lists from a public-domain or permissively licensed source, and note the license.
- Describe it publicly as "a word-chaining puzzle", not as a clone of a specific game.
- Daily puzzles are generated by us, never copied from published puzzles.

---

## Implementation notes

Decisions made while building the first version (2026-10-23) where the GDD left room.

**Changes from the original GDD (2026-10-23):** the groups have no A–D labels; the `>` marker and highlight are enough. The terminal sits in a draggable, resizable window on a desktop, in the same style as Jo's Discovery: light title bar with traffic lights, slate desktop, and a dark terminal body. Drag the title bar to move it, drag any edge or corner to resize, and double-click the title bar to maximize. The window's position isn't remembered, because nothing is saved to the browser. On phones the window fills the screen. The SCOWL credit sits in the desktop's bottom-right corner.

**Files:** `index.html`, `style.css`, `window.js` (window drag/resize), `game.js` (UI and keys), `engine.js` (seeds, generator, solver; no DOM, so it also runs in Node), `words.js` (generated, do not edit), `tools/build-words.py` (rebuilds `words.js` from an unpacked SCOWL release), `tools/check-engine.js` (generates many seeds and reports timing, size spread and solver results).

**Word lists:** SCOWL 2020.12.07. Each list combines `english-words.*` and `american-words.*` up to its size. Taboo words are taken from SCOWL's `misc/offensive.1`, `offensive.2`, `profane.1` and `profane.3`, plus a manual list in the build script. That manual list comes in two tiers:
- Slurs and vulgarities are removed from both lists.
- Real words with a sexual, violent or slur double meaning (COCK, CHINK, RAPE, …) can still be typed, but never come up as a hint or a reference answer.

The result is about 30.8k answer words and 85.6k valid words, roughly 800 KB in all. `words.js` stores only the validation words that aren't already answer words. `WORDS_VERSION` in `words.js` names the list version that seeds depend on.

**Seeds:** the group-size profile is the first thing drawn from a seed and is never drawn again. If picking seed words or assigning groups fails, the generator retries with the same seed's RNG instead of moving to a new seed. That way presets can read a seed's size without building the board, and every seed still yields a board. Lowercase codes are accepted, and so are Crockford's look-alikes (O reads as 0, I and L as 1). The URL is updated to `?seed=CODE` whenever a board loads, so the address bar is always a share link.

**Vowel spread (step 4):** rather than rejecting boards afterwards, the group-assignment search refuses to put more than ⌊vowels/2⌋ vowels in one group. Y counts as a consonant.

**Solver:** with no chaining, word order doesn't matter, so it's a set-cover search: BFS over covered-letter masks. Words are collapsed into distinct letter masks. A superset table answers "can one word cover what's left?" in O(1). Only maximal masks (not contained in another word's) are expanded, since swapping a word for one that covers more never costs a word. Hints run the search twice: once over all valid words to find the fewest words, then again over answer words only, and they use the answer-only set if it is just as short. Measured cost: under 1 ms on average and about 4 ms at worst.

**Assisted tagging:** a hint or a reveal tags the current attempt. Once the reference answer has been seen, by `!` mid-puzzle or by `D` after solving, every later retry of that puzzle also counts as assisted. The status line shows the unassisted best, plus the assisted best if that is lower.

**Session stats:** "average attempts per puzzle" means completed solves divided by distinct puzzles solved. "Best by size" counts only unassisted solves.

**Input:** keys go to a hidden text field that stays focused, so phones bring up their keyboard. Every legend entry can also be clicked or tapped, which gives players with no `?`, `!` or `#` key a way to reach those actions.

## Open questions

- **First-time player onboarding.** The game has no rules text yet, so a new player has to know the rules already. What a newcomer needs to see, and where it should appear, still needs to be decided before anything is built.
- **Answer-list feel.** Size 35 includes inflections (UPHOLSTERERS, GRANDFATHERS). Many reference answers use long inflected words, which suits 2-word answers covering up to 13 letters but can read as obscure. A frequency-ranked filter could tighten it.
- **Difficulty without chaining.** Every board is built from 2 seed words (3 for 14+ letters), and with chaining gone almost every board can be solved in 2 words. In a 500-seed check, 498 boards had a 2-word solution, including 98 of the 100 three-word-seeded ones. So scores will cluster at 2. Possible levers: score by letters typed as a tiebreak, require 3+ words, or tighten what counts as a valid word.
- **Public description.** The guardrails say to describe the game as "a word-chaining puzzle". Without the chaining rule that no longer fits; it needs a new one-line description.
