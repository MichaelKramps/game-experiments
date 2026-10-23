# Jamie's Journal

A word-deduction game set in the Evergreen universe. The player has
gained access to the personal journal of Jamie Taylor (Evergreen's main
character) through a fake terminal. Every entry is encrypted.

## Core loop
1. **Entry list.** You scroll through the entries with ↑/↓ (or j/k, or a
   click) and open one with Enter. Titles stay scrambled until the entry is
   decrypted.
2. **Decrypt.** Each entry has a **decryption key**, a common English
   word of exactly 5 letters chosen at random from `words.js`. You get
   **10 guesses**, also 5 letters each. Each guess reports:
   - **Letters**: how many letters in the guess are also in the key.
     Duplicates count only as many times as the letter appears in the key,
     like Mastermind (e.g. a guess with two O's against a key with one O counts 1).
   - **Placed**: how many of the guess's letters are in the same position as in the key.

   (Keys were originally 5–8 letters, with a "key length" hint. On 2026-10-20 they
   were changed to 5 letters only. On load, a locked entry still holding an
   old-length key gets a new one.)
3. **Out of guesses.** The game shows ACCESS DENIED and reveals the old key, picks a new key for that entry and resets its guesses.
4. **Correct key.** The entry decrypts and types out. It then stays readable for good.

**Letter scratchpad.** A panel beside the guesses (or below them on narrow
screens) shows A–Z. Clicking a letter cycles it neutral → out (red) →
included → neutral. It's only for the player's notes, the game never fills it
in. Marks are saved per entry and cleared when the key rotates.

Guesses that aren't letters only, or aren't exactly 5 letters, or that
repeat an earlier guess are rejected and don't cost an attempt. Guesses
don't have to be real words.

## Persistence
`localStorage['jamies-journal-progress']` holds, per entry title, the
current key, the guesses made so far and whether the entry is unlocked.
Saving guesses means a refresh can't reset a bad run.

## Files
- `entries.js`: the journal content (`ENTRIES`, `{ title, body[] }`)
- `words.js`: the pool of keys (`KEY_WORDS`)
- `game.js`: the screens (list → decrypt → read, plus denied) and the scoring
- `window.js`: the terminal window: drag by the title bar, resize from any edge or corner, double-click the title bar to maximize or restore. Its position and size are saved in `localStorage['jamies-journal-window']`.
- `style.css`: the look. It should pass for ordinary work: a black-and-white terminal window on a plain desktop. On phones the window fills the screen.

## Open questions
- Journal content: it's currently placeholder, copied from Evergreen's
  journal and investigation entries. Should it be new material, or a
  different slice of Jamie's timeline?
- Should guesses have to be real words? Today any string of letters is
  accepted, so a guess like EEEEE probes for a single letter.
- Should entries unlock in order, or all be open from the start (current)?
- Story canon (glasses cut, Taylor surname, etc.) lives in Evergreen's notes
  and applies here too.
