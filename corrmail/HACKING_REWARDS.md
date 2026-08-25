# CorrMail — Hacking Reward Content Plan

This file documents what the Hacking track's story-flavored rewards actually
contain — the world-building layer, as distinct from the primary plot. It's
a companion to `STORY.md` (the primary Corr/Halliday/Scott arc) and
`HACKING_DESIGN.md` (the hacking minigame's own math/mechanics). Split out
because this layer has its own content-planning concerns (volume, pacing,
cast) that don't belong in either of those files.

**Status: planning only — no reward content has been written yet.** The
actual pieces (target ~20+ per tier, see below) will be drafted outside this
repo and brought back for integration into `game.js`'s `HACKS`/reward data
once ready.

## Two tracks, one hinge

`STORY.md`'s Arc is the primary track: linear, mandatory, a closed
three-hander (Corr, Halliday, Morgan Scott) gated on CorrPower thresholds.
This file covers the second track: flavor and world-building delivered
through ordinary hack rewards (`reward.type === 'story'` in `game.js` —
already a supported delivery path, no new reward type needed). This track is
non-linear and optional — a player could finish the primary story having
read none of it. Its job is depth and texture, not plot delivery.

The two tracks share one resource: CorrPower. Hacking-granted hardware tiers
(especially Network Card, which is hacking-exclusive per `DESIGN.md`) feed
the same CorrPower number that gates the primary Arc's thresholds. So Hacking
is *structurally* necessary to finish the game (Network Card must reach tier
3 for "full power" — see `STORY.md`), even though no individual hack's
*narrative content* is ever required reading.

**Boundary rule:** hacking-reward content may foreshadow the primary plot's
reveals but must never explicitly state them — in particular, nothing here
should state the actual mechanism of the reveal (that Corr misread an idle
remark as a directive) or narrate the actual dismantling. The primary track
is the only place the player learns those facts firsthand.

## The reach model

Reward content is tied to **Network Card tier** — Dial-Up (tier 1),
Cable/DSL (tier 2), Fiber (tier 3) — since Network Card is what gates deeper
network access at all (`DESIGN.md`). Higher tiers mean the player is
reaching further into the world, so the content available at each tier
should read as that: closer/smaller-scale at tier 1, wider/more public at
tier 3.

**Format: everything is an email.** No separate text-file or audio asset
types. Anything conceptually audio (a recovered recording, a voicemail) is
delivered as an email whose body is formatted as a transcript — the game has
no real audio assets anywhere, including in the primary track (see
`STORY.md`'s beat 3).

## Four content categories

- **Personal** — old contacts, people who knew Corr and/or Scott directly.
- **Institutional** — companies, nonprofits, government, public record.
- **Environmental** — derelict/abandoned infrastructure, ambient world
  texture.
- **Peer-systems** — other AI/programs out there. Lowest priority to fill
  in; exists mostly for tier 3.

**Morgan Scott is not confined to Institutional.** He invented Corr, so he's
relevant to content in every category and every tier — a Personal-category
piece should be as likely to mention him in passing as an Institutional one.
This matters mechanically too: `STORY.md`'s reveal (beat 2) needs at least
2-3 independent, unconnected-to-Halliday mentions of Scott's name to land,
and those need to be available even to a player who's only ever reached
tier 1 — Network Card's shallow ladder (max 4x, tiny next to CPU's
1,953,125x) means a player will very plausibly still be on tier 1 when
CorrPower crosses the reveal's ~10¹⁵x threshold.

## Production

**Minimum 20 pieces per tier, fully hand-authored** — no templating/mad-libs
generation. Pool size should not taper at higher tiers. Network Card's own
ladder is short (3 tiers), but that doesn't mean less time spent at each
tier: the game's exponential cost scaling elsewhere means later stretches of
play are *longer*, not shorter, so tier 3 needs at least as much fresh
material as tier 1 to avoid repeats over a long grind.

When a randomly-generated hack's reward is story-flavored, it draws from its
tier's pool. (Random-within-tier vs. a curated/fixed order — e.g. so the
most pointed Scott mentions don't surface first — is an open implementation
question, not resolved here.)

## Tier 1 — Dial-Up

Longest-running tier by a wide margin — the player likely spends most of the
game here, including past the beat-2 reveal. Register: intimate, degraded,
analog. Found voicemail-style emails, old personal correspondence, casual
asides — never planted like a clue.

Job — introduce:
- Morgan Scott himself
- Morgan Scott's company
- Morgan Scott's nonprofit organization
- Morgan Scott's public perception as a good person and philanthropist
- Government policy difficulties with Morgan Scott's philanthropic endeavors
- Morgan Scott's death (the fact of it)
- 3-4 new supporting characters: Scott's business partner, a software
  engineer from Scott's company who worked on Corr, and 2 more **TBD**

At minimum 2-3 of this tier's 20+ pieces need to be airtight, independent,
unconnected-to-Halliday mentions of Scott's name — the reveal's seeding
requirement, carried almost entirely by this tier since it's the one every
player is guaranteed to have spent the most time in.

## Tier 2 — Cable/DSL

Wider reach, more formal register — real documents, business correspondence,
press-adjacent material rather than casual asides.

Job:
- Highlight government officials directly causing problems for Scott
- More context around Scott's death and its cause — **speculative only**,
  see Death cause below, never confirmed
- More data about the nonprofit and how it spent its money
- Detail on work Corr did on Scott's behalf
- 1-2 new characters: a close friend of Scott's who worked in government,
  plus 1 more **TBD**

## Tier 3 — Fiber

The longest real-time grind of the three tiers (see Production above) —
needs equal-or-more volume than tiers 1-2, not less. Highest-altitude,
rarest material: official/archival record, peer-system content, Scott's
innermost circle.

Job:
- Get serious: the danger Scott was in during the years approaching his
  death — speculative, threats and fear, no proof (see Death cause below)
- The work Corr was doing in Scott's final weeks before being shut down —
  subject to the boundary rule above: foreshadow, never explicitly reveal
- Morgan Scott's own observations about all of the above

## Death cause

Morgan Scott's cause of death is **deliberately never confirmed** in this
game — possibly a hook for a sequel. Only circumstantial, speculative
content exists: hostile government-official emails expressing a desire to
harm or hinder Scott, and Scott's own emails expressing fear of being
harmed. No hard evidence either way, ever. Treat this as an intentional
authorial choice throughout tiers 2-3's content, not a gap to eventually
fill in.

## Open / not yet decided

- Nat (`NAT_EMAIL`, "Nat's Backup Server" in `game.js`'s `HACKS`) — an
  already-implemented contact reward that predates this framework. Whether
  Nat belongs in Personal/tier 1, and what if any relationship Nat has to
  Scott, is unresolved.
- The 2 remaining unspecified tier-1 characters, and the second unspecified
  tier-2 character.
- Exact names/count of tier-2's hostile government officials.
- Whether an "environmental — why is so much of this network abandoned"
  mystery thread is worth developing as its own throughline, independent of
  the Scott plot. Floated once, not committed to.
- Random-within-tier vs. curated-order delivery for reward draws (see
  Production above).
- Exact mechanics of which hack grants Network Card tier 2/3 — that these
  tiers come from hack rewards at all is resolved (see `DESIGN.md`), but not
  whether it's a general pool draw or a dedicated reward.
