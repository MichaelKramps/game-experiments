# Website Infrastructure Plan — Decisions

## Context

This site (`game-experiments`) is deployed as a static site to Cloudflare via `wrangler.jsonc` (`assets.directory: "."`), updated by a plain `git push` to `main`. As of writing, there is **no backend, no database, no forms, no email service, and no payment integration** anywhere in the repo.

Separately, there's an agreed (out of scope here) business process: build small 1-hour narrative games on ~2-month cycles, validate demand via streamers/itch.io/Reddit/ads, and ask players who finish a demo to either back a Kickstarter or leave their email. This plan makes the **website** capable of supporting that process across three capabilities:

1. **Now** — capture and durably store emails from a "give us your email" CTA.
2. **Later** — grant access (download/play unlock) to Kickstarter backers and buyers.
3. **Eventually** — accept payments directly on the site (~$12 base price + tiers).

**Guiding principle**: every phase adds to the same Cloudflare Worker + D1 database rather than being a separate bolt-on system. Phase 1 ships a `subscribers` table; Phase 2 adds an unrelated `access_grants` table; Phase 3 adds Stripe routes that write into the `access_grants` table Phase 2 already created. Nothing gets ripped out between phases.

A key mechanical detail: the repo currently has **no `"main"` field** in `wrangler.jsonc`, meaning it's assets-only — no Worker code runs today. Adding backend behavior means adding a `"main"` entry pointing at a small Worker script; Cloudflare matches requests against static files first and only falls through to Worker code for paths that aren't files (e.g. `/api/subscribe`).

---

## Phase 1: Email Capture

**Status: live on kramps.games since 2026-11-12.** It was tested end to end on production: signup, welcome email (SPF/DKIM/DMARC all pass, one-click unsubscribe headers present), unsubscribing and re-subscribing.

### How it works now

**Signup**
- A **New Games** desktop icon (envelope) on every page and listed game opens a modal built into the site shell (`os/os.js`, `buildSignup()`). Its copy: "Get an email when a new game is released, plus occasional updates on games still in the works." Kramps chose to keep this wording even though the welcome email words it differently.
- Games can open the modal with `KG.openSignup()`, e.g. from an end screen. None do yet.
- The browser checks the email format, then sends `{ email, source, token, website }` to `POST /api/subscribe`. `source` is the page path, plus `?ref=` if present.
- Bot protection:
  - Cloudflare Turnstile (the site key is in `os/os.js`; localhost uses Cloudflare's always-pass test key)
  - a hidden honeypot field (`website`)
  - a rate limit of 5 requests/min per IP (the `SUBSCRIBE_LIMITER` binding)
- After signing up, a localStorage flag (`kramps-signed-up`) makes the modal show "You're on the list!" on later visits.

**Worker** (`src/`; static files are served first, so only `/api/*` reaches it)
- `src/worker.js`: the router. Only POST is allowed on `/api/subscribe` and `/api/unsubscribe`, and everything else goes to `env.ASSETS`.
- `src/routes/subscribe.js`: rate limit → honeypot → email validation (`src/http.js` `normalizeEmail`, mirrored by `EMAIL_RE` in `os/os.js`) → Turnstile siteverify → one upsert:
  - a new address is inserted
  - an unsubscribed address is re-subscribed: `unsubscribed_at` is cleared, `source` is overwritten and the token is kept
  - an already-active address is left unchanged

  It always returns `{ ok: true }`, so the form can't reveal who is on the list. The welcome email is sent only when the address is new or re-subscribed, via `ctx.waitUntil`.
- `src/routes/unsubscribe.js`: takes the token from a JSON body (`unsubscribe.html`) or from `?token=` (Gmail/Apple one-click, RFC 8058), sets `unsubscribed_at`, and always returns ok.
- `src/email.js` `sendWelcome()`:
  - sends through the Resend HTTP API
  - subject: "You're on the kramps.games email list"
  - body: "You'll now get an email when kramps.games releases a new game, or has a major announcement about an upcoming game. — Kramps", with "kramps.games" linked
  - footer: an unsubscribe link to `/unsubscribe?token=…`
  - headers: `List-Unsubscribe` / `List-Unsubscribe-Post`
  - the site URL comes from the request's origin
  - without `RESEND_API_KEY`, or with a placeholder `MAIL_FROM`, it only logs the email

**Unsubscribe page**
- `unsubscribe.html` (Cloudflare serves it at `/unsubscribe`) needs a button click, because email scanners pre-fetch links. The page isn't linked from the site.

**Data**
- D1 database `game-experiments`, binding `DB`, region ENAM.
- Table `subscribers(id, email UNIQUE COLLATE NOCASE, source, created_at, unsubscribed_at, unsub_token UNIQUE)` (`migrations/0001_create_subscribers.sql`).
- Rows are never deleted. Unsubscribing sets `unsubscribed_at`. Active subscribers are `unsubscribed_at IS NULL`.

**Config and accounts**
- `wrangler.jsonc`: `main`, the D1 binding, the rate-limit binding, and the `MAIL_FROM` var (`Kramps Games <kramps@kramps.games>`).
- Worker secrets: `TURNSTILE_SECRET_KEY` and `RESEND_API_KEY` (`npx wrangler secret list`). Local dev reads `.dev.vars` (copy `.dev.vars.example`).
- Resend: the `kramps.games` domain is verified, region us-east-1. Its DNS records (SPF/MX on the `send` subdomain, DKIM at `resend._domainkey`) and a `_dmarc` record (`p=none`) are in Cloudflare DNS. Gmail currently files the welcome email under **Promotions**, which is normal and not spam.
- `.assetsignore` keeps `src/`, `migrations/`, `node_modules/`, `package*.json`, `.dev.vars*`, `.wrangler` and this file out of the public files. **Any new server-side folder must be added there**, because `assets.directory` is the repo root.
- No inbox exists yet for `kramps@kramps.games`, so replies to emails bounce (see checklist item 6).

**Day-to-day commands**
- Local dev: `npm install`, `cp .dev.vars.example .dev.vars`, `npm run db:migrate:local`, `npm run dev`. Changing `database_id` gives local dev a fresh, empty database, so re-run the local migration afterward.
- Deploy: push to `main`. Schema changes: add `migrations/000N_*.sql`, then run `npm run db:migrate:remote` **before** pushing code that needs it.
- Live logs: `npx wrangler tail`.
- List active subscribers: `npx wrangler d1 execute game-experiments --remote --command "select email, source, created_at from subscribers where unsubscribed_at is null"`.
- Count signups by source: `... --command "select source, count(*) from subscribers where unsubscribed_at is null group by source"`.
- Unsubscribe someone by hand (e.g. if they reply asking): `... --command "update subscribers set unsubscribed_at = CURRENT_TIMESTAMP where email = 'x@y.com'"`.

### Answering questions about the list

The live list is only in D1, with no copy in the repo and none in Resend. To answer a question about it, query the remote database. These commands are read-only and need the wrangler login already on this machine (`npx wrangler whoami` checks it).

```
npx wrangler d1 execute game-experiments --remote --json --command "<SQL>"
```
`--json` gives parseable output: `[0].results` is the row array. Pipe it through `python3 -c "import json,sys; print(json.load(sys.stdin)[0]['results'])"`. Use **`--remote`**; `--local` is the dev database with test rows.

Columns: `email`, `source` (the page path where they last signed up, e.g. `/`, `/ctrl-alt-deal/`, `/about.html`, `/unsubscribe`; a `?ref=` tag is appended if the link had one), `created_at` (first signup, UTC), `unsubscribed_at` (NULL = active; set = unsubscribed), `unsub_token` (secret, so never show it). Active = `unsubscribed_at IS NULL`.

Common questions:

| Question | SQL |
|---|---|
| How many active subscribers? | `select count(*) as active from subscribers where unsubscribed_at is null` |
| Totals: active vs. unsubscribed | `select sum(unsubscribed_at is null) as active, sum(unsubscribed_at is not null) as unsubscribed, count(*) as total from subscribers` |
| Who's on the list? | `select email, source, created_at from subscribers where unsubscribed_at is null order by created_at` |
| Where are signups coming from? | `select source, count(*) as n from subscribers where unsubscribed_at is null group by source order by n desc` |
| Signups per day / week | `select date(created_at) as day, count(*) from subscribers group by day order by day` (week: `strftime('%Y-%W', created_at)`) |
| New since a date | `select email, source, created_at from subscribers where created_at >= '2026-12-01' order by created_at` |
| Who unsubscribed, and when | `select email, created_at, unsubscribed_at from subscribers where unsubscribed_at is not null order by unsubscribed_at desc` |
| Is a given address on it? | `select email, created_at, unsubscribed_at from subscribers where email = 'x@y.com'` (case-insensitive column) |
| Email domains (gmail vs. others) | `select substr(email, instr(email,'@')+1) as domain, count(*) as n from subscribers where unsubscribed_at is null group by domain order by n desc` |

Notes for reading the results:
- **Re-subscribes:** `source` is overwritten on a re-subscribe, and `created_at` keeps the first signup date. "Signups per day" therefore counts first signups only, and there's no history of unsubscribe/re-subscribe cycles.
- **Test rows:** Kramps' own address was used for the 2026-11-12 launch test, so leave it out of "real" signup counts unless asked.
- **Welcome emails:** delivery, bounces and spam complaints for welcome emails are in the Resend dashboard (Emails/Logs), not in D1.
- **Privacy:** the list is personal data. Show addresses only to Kramps when asked, never put them in commits, docs or outside services, and prefer counts when a count answers the question.

### Sending an email to the list (not built yet)

Decided 2026-11-12. Build this when the first announcement is ready, not before.

- **Approach:** a small send script in the repo, e.g. `scripts/send-email.mjs`, run as `npm run send-email -- emails/<date>-<slug>.md`.
  - It reads active subscribers from D1 (`unsubscribed_at IS NULL`, via `wrangler d1 execute --remote --json` or the D1 HTTP API).
  - It sends each one a personal copy through Resend's batch endpoint (up to 100 per call).
  - Every copy gets that subscriber's own `unsub_token` link, plus the same `List-Unsubscribe` headers as the welcome email. Reuse or extract the footer/headers code from `src/email.js`.
  - The email lives in a file under `emails/`: subject plus a Markdown body, rendered to HTML and plain text. Committing the file keeps a record of what was sent.
  - `--test` sends only to Kramps first. The real send asks for confirmation, prints the recipient count, and logs failures without stopping.
  - Keep `emails/` and `scripts/` out of public files (`.assetsignore`), or put them in a folder that's already ignored.
  - The Resend API key for a local script goes in a local, gitignored env file. Worker secrets can't be read back.
- **Why not Resend Broadcasts:** Broadcasts only sends to contacts stored in Resend, and it tracks its own unsubscribes. That would mean syncing two lists. D1 stays the single source of truth. Revisit if Kramps wants a visual editor or open/click stats.
- **Never** send by pasting the list into Gmail BCC: there are no unsubscribe headers, and it's likely to land in spam.
- **Content rule:** subscribers agreed to new releases and major announcements about upcoming games. Keep emails to that, and include the unsubscribe link in every one (the script handles it).
- **Limits:** Resend's free plan was about 100 emails/day and 3,000/month as of 2026-11. Check current pricing before a large send.

### Launch checklist

Phase 1 went live once 1–5 were done; 6 can come later.
1. [x] Create the D1 database (`npx wrangler d1 create game-experiments`); its ID is in `wrangler.jsonc`.
2. [x] Create the live table: `npm run db:migrate:remote`.
3. [x] Turnstile: widget created, site key in `os/os.js`, secret saved with `npx wrangler secret put TURNSTILE_SECRET_KEY`.
4. [x] Resend: verify `kramps.games` (add its DNS records in Cloudflare, plus a `_dmarc` TXT `v=DMARC1; p=none;` if none exists), then `npx wrangler secret put RESEND_API_KEY`. The sender is `Kramps Games <kramps@kramps.games>` (`MAIL_FROM` in `wrangler.jsonc`).
5. [x] Push to `main`, sign up on the live site with a real inbox, and check: the welcome email arrives outside spam, Gmail's *Show original* shows SPF/DKIM/DMARC PASS, the unsubscribe link and button work, and Gmail shows its own Unsubscribe link. `npx wrangler tail` shows Worker errors live.
6. [ ] Set up an inbox for `kramps@kramps.games`. Until then, replies to the welcome email bounce (unsubscribing still works). Options:
   - **Cloudflare Email Routing** (free): kramps.games → Email → Email Routing, enable it, and forward `kramps@kramps.games` to a personal inbox. This receives mail only; replying *as* kramps@kramps.games would need extra setup.
   - **A hosted mailbox** (Google Workspace, Fastmail, Proton, …) if you want to send and receive as that address.

   Either one adds MX records on `kramps.games` itself, which doesn't conflict with Resend's records on `send.kramps.games`. No code change is needed. Afterward, send a test email to `kramps@kramps.games` and reply to a welcome email to confirm it arrives.

### Original Phase 1 design (written before building; where it differs from "How it works now" above, that section wins)

What changed in the build: a shell modal instead of `shared/signup-form.js` and `mailing-list.html`; a rate-limit binding instead of a KV counter; a random per-row unsubscribe token instead of HMAC; and a welcome email in Phase 1 (originally Phase 3).

**Decision: Cloudflare Worker + D1 (custom), not a managed ESP, to start.**

- Add `"main": "src/worker.js"` to `wrangler.jsonc`, plus a D1 binding.
- `src/worker.js` — fetch handler routing `POST /api/subscribe`; falls through to `env.ASSETS.fetch(request)` for everything else.
- `migrations/0001_create_subscribers.sql` — `subscribers(id, email UNIQUE, source, created_at, unsubscribed_at, unsub_token)`.
- `shared/signup-form.js` + `shared/signup-form.css` — vanilla-JS form + Cloudflare Turnstile widget, posts to `/api/subscribe`. Included via one `<script>` tag on any game's end screen. Establishes the repo's first `shared/` convention (Phase 2/3 UI reuses it).
- **Spam/bot protection**: Cloudflare Turnstile (verified server-side against `siteverify`, secret via `wrangler secret put TURNSTILE_SECRET_KEY`) + a hidden honeypot field + a per-IP rate limit via KV.
- `/api/unsubscribe?token=` — flips `unsubscribed_at` using an HMAC token embedded in every email footer. Should show a confirmation page and act on POST, not act immediately on GET, since email clients/scanners pre-fetch links and would otherwise trigger false unsubscribes.
- Always return the same generic response from `/api/subscribe` regardless of whether the email was new or already present, to avoid email-enumeration probing.
- All queries use D1's parameterized `.bind()` — never raw string-concatenated SQL.
- **GDPR / CAN-SPAM-lite**: one-click unsubscribe link in every email; a short consent line near the form; store only email + timestamp + source; honor unsubscribes immediately.
- **Future migration path**: once the list is large enough to justify it, port to a paid ESP (e.g. Buttondown) via CSV export from D1 (excluding rows with `unsubscribed_at` set) and bulk import — low friction since the list is cleanly single-opt-in.
- **Sending to the list** (distinct from storing it): D1 remains the source of truth; use a provider's broadcast/audience feature (e.g. Resend Broadcasts, introduced in Phase 3 anyway for transactional email) to actually send campaigns, rather than manual/BCC sending — manual sending from a personal account has a real risk of landing in spam due to missing domain authentication (SPF/DKIM/DMARC) and no List-Unsubscribe header.

---

## Phase 2: Access Granting

**Decision: email + access key (no accounts, no Google OAuth) — matches the itch.io/Humble Bundle industry pattern for one-time-purchase browser games.** Custom `access_grants` system for direct-site sales and Kickstarter backers; itch.io's native key feature for itch-originated purchases (no need to duplicate what itch already provides).

- `migrations/0002_create_access_grants.sql` — `access_grants(id, email, game_slug, access_key, granted_via ['kickstarter'|'purchase'|'manual'], created_at, redeemed_at, revoked_at)`.
- `migrations/0003_create_key_redemptions.sql` — `key_redemptions(id, access_grant_id REFERENCES access_grants(id), ip_address, redeemed_at)` — logs every redemption attempt, not just the first, so reuse of a key is visible.
- `/api/redeem` — validates the key, checks `revoked_at IS NULL`, logs a `key_redemptions` row, sets a signed httpOnly cookie scoped to that game.
- Downloads: full-game builds stored in an **R2 bucket**; the Worker issues a short-lived presigned URL only after validating the key (never a permanent public file URL).
- Play-gating: the Worker re-checks the key against D1 (including `revoked_at`) on each request to a gated game, rather than trusting a long-lived cookie blindly — this makes revocation take effect immediately.
- **Abuse detection & revocation — manual queries, no admin UI needed at this scale**:
  - Spot abuse: `SELECT access_key, COUNT(*) FROM key_redemptions WHERE date(redeemed_at) = date('now') GROUP BY access_key HAVING COUNT(*) > 5;`
  - Revoke: `UPDATE access_grants SET revoked_at = CURRENT_TIMESTAMP WHERE access_key = '...';`
  - Deliberately **not deleting rows** on revocation — deletion loses the audit trail and orphans the `key_redemptions` log that justified the decision.
- Known limitation, accepted deliberately: this does not prevent a shared key from being used by multiple people concurrently (no DRM). Matches itch.io's own model — hard concurrency limits create false-positive lockouts for legitimate buyers switching devices, which isn't worth it at this scale. Redemption logging + manual revocation is the chosen mitigation instead of automated blocking.
- **Action item**: `about.html` currently states "full games require a Google account to log in" — update this copy to describe the email+key model once this ships.

---

## Phase 3: Payments

**Decision: Stripe Checkout + a thin Worker layer** (not Gumroad) — plugs directly into the `access_grants` table from Phase 2, keeps fees near 2.9%+30¢ instead of ~10%, and keeps ownership of the customer relationship.

- `/api/create-checkout-session` — creates a Stripe Checkout session for the game's price. Stripe hosts the actual card form (never build raw card handling — PCI compliance).
- `/api/stripe-webhook` — verifies Stripe's webhook signature (critical: otherwise anyone could POST a fake "payment succeeded" event), then inserts a row into `access_grants` (`granted_via: 'purchase'`) and triggers a delivery email via **Resend** with the access key, reusing the Phase 2 redemption flow.
- The webhook, not the browser redirect back to the site, is the source of truth for "payment succeeded" — redirects can fail even when payment went through.
- **Tax decision: enable Stripe Tax's monitoring only, not active collection, at launch.** Monitoring is free and tracks sales per jurisdiction, alerting when a registration threshold is likely crossed (e.g. EU VAT's near-zero threshold for non-EU sellers, or a US state's economic nexus threshold). It does not calculate, collect, register, file, or remit tax on its own. Only once a jurisdiction is flagged should registration happen there, followed by turning on active collection for that specific jurisdiction. Stripe never escrows collected tax — it flows into the normal Stripe balance/payout along with revenue and must be manually set aside for filing.

---

## Concrete file/directory additions (cumulative across phases)

```
wrangler.jsonc                # add "main", d1_databases binding, (later) r2_buckets binding
package.json                  # new — wrangler + migration scripts
src/worker.js                 # fetch handler: routes /api/*, falls through to env.ASSETS.fetch()
src/routes/subscribe.js       # Phase 1
src/routes/unsubscribe.js     # Phase 1
src/routes/redeem.js          # Phase 2
src/routes/checkout.js        # Phase 3
src/routes/stripe-webhook.js  # Phase 3
migrations/0001_create_subscribers.sql
migrations/0002_create_access_grants.sql
migrations/0003_create_key_redemptions.sql
shared/signup-form.js         # included via <script> on game end-screens / mailing-list.html
shared/signup-form.css
mailing-list.html             # standalone landing page for Reddit/streamer/ad links
.dev.vars.example             # TURNSTILE_SECRET_KEY, STRIPE_SECRET_KEY, RESEND_API_KEY, etc.
```

Each game folder (`corrmail/`, `spellbolt/`, etc.) references `shared/signup-form.js` from its own end-screen rather than duplicating form markup.

## Critical files to touch
- `wrangler.jsonc` — add `main` + D1 binding
- `about.html` — update the "Google account" copy in Phase 2
- `free-games.html`, `full-games.html` — link `mailing-list.html` / signup CTA
- `_template/index.html` — reference for wiring `shared/signup-form.js` into future games consistently

## Verification
- **Phase 1**: deploy with `wrangler deploy`, submit the form from a real browser, confirm a row lands in D1 (`wrangler d1 execute game-experiments --command "select * from subscribers"`), confirm Turnstile blocks a scripted POST without a token, confirm the unsubscribe link flips the row.
- **Phase 2**: manually insert a test `access_grants` row, hit `/api/redeem` with the key, confirm the signed cookie is set and gates the target game's assets; confirm an invalid/reused key is rejected; confirm redemption count query and revoke query both work as expected.
- **Phase 3**: use Stripe's test-mode keys and card numbers to complete a full Checkout session against a local `wrangler dev` tunnel, confirm the webhook fires and creates the correct `access_grants` row, confirm the receipt/delivery email sends via Resend's sandbox.
