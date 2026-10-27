# Copybot UI redesign: the plan (27 Oct 2026, for approval)

Brief: v2 (27 Oct), pasted by Brandon. Layout and presentation only. Branch `ui-redesign`, cut from `main` at eb957e6, nothing else merged in. Deploys to the Railway environment `ui-redesign`.

## Set-up done already

- Branch `ui-redesign` exists on a git worktree (`.claude/worktrees/ui-redesign`), so the shared checkout on `gbp-output` is untouched. Pushed to origin so Railway can see it.
- Logo: Brandon's file arrived as `public/logo.png.png`; the branch has it as `public/logo.png` (1024 px, purple to blue on black). The accent colours are sampled from it: lavender `#B9A7F2` and violet `#6B5AE6` on the top stroke, blue `#3F6BFF` to sky `#8FD0FF` on the bottom. Primary buttons, active nav and the chart lines use the violet to blue gradient; links use the solid violet-blue `#5E63F0`.
- Railway (Brandon, no CLI or token here; nothing to run): Railway dashboard, project, switch to the `ui-redesign` environment, Copybot service, Settings, Source: set Branch to `ui-redesign` (and "Wait for CI" off). Then Variables: `DATABASE_URL` must read `${{Postgres.DATABASE_URL}}` where Postgres is the Postgres service inside the `ui-redesign` environment (click the variable: Railway shows which service it references). If it is a pasted string or references the production environment's Postgres, replace it with the reference to the environment's own Postgres service. Settings, Networking: Generate Domain if the duplicate has none, and send me the URL. I never point the environment at production.

## Approach

- One app shell, no build step, no framework, in the style of the code today: `public/app/index.html`, `app.css` (the tokens), `shell.js` (sidebar, header, router), one module per screen under `public/app/screens/`, shared components under `public/app/ui/`. Express serves `index.html` for the app paths (`/dashboard`, `/clients`, `/clients/:id/:tab`, `/clients/:id/pages/:type/:key`, `/add-client`, `/niches/:niche`, `/trade-facts`, `/prompts`, `/settings`); the API routes are untouched except the new ones listed below. `login.html` is restyled and lands on `/dashboard`.
- Charts are hand drawn SVG (one or two colours, label on the line, minimal gridlines), export PNG through a canvas. No chart library.
- Inter from Google Fonts with the system fallback; generated copy views at 17px, 1.6 line height.
- Every long action is polled in place and shows a bar plus "what it is doing" and "what comes next" from the run state; no spinner on a button.
- The old pages stay reachable on the branch until the last screen is in; the merge removes them.

## 1. Shell components (build first)

Tokens (colours, status colours, radius 12px, shadow, spacing, type scale) · sidebar (logo, 7 items icon plus label, collapsible, user and sign out at the bottom; a drawer at phone width) · page header (title, meta line, actions) · card (white, 1px border, soft shadow) · table (sortable columns, search, filter chips, row click, phone layout for the dashboard table) · stat tile (big number, small grey label, info dot with the explanation on hover, hover split) · status dot (green done, amber waiting on a person, red blocked, grey not started, blue running) · running state (bar, two sentences) · empty, failed (reason and Retry) and waiting (what and who) states · tabs with a status dot each · toast ("saved: 3 fields changed") · confirm dialog · buttons (primary gradient, ghost, copy button) · inline editable field (click, edit, save, result inline) · source tag (Form, Website, GBP, Dossier, Hand) · relative time.

## 2. Screens, in the brief's order

Each screen lists what it reads today and what is new. "New route" means a read-only assembly over existing data unless it says it writes.

### Dashboard (`/dashboard`, the landing page after login)
- Reads: new `GET /api/dashboard` built from `clients`, `fillout_submissions` (client created by a submission: `source = 'fillout'` and the submission's `received_at`), `client_assets` (page records, run states, dossiers, GBP output, scans, last activity = the newest asset or field change), `client_fields` through `needsAttention` (quote method, phone, primary category, practices), `trade_facts_verifications` (an unverified pack that gates the client's service pages).
  - Stage rule (first that fails, in order): Onboarding (record not reviewed, or a blocking item on the record) · Research (a launch town with no dossier) · Page map (no saved page map) · Pages (any page in the map not written and valid) · GBP (no GBP output) · Live (a WordPress push logged). Archived hidden.
  - First blocker in plain words, from the same pass: "no quote method", "no phone", "pack unverified", "3 claims to accept", "2 pages blocked", "no dossier for Romsey".
- Running now: new `GET /api/dashboard/running` from the runners' in-memory `running` maps (category, service, location, homepage), `research_jobs` in progress, `h1_research_jobs` active, GBP generation in progress, scans pending. Polled every 5 seconds while something runs.
- Rankings: new `GET /api/dashboard/rankings`: Top 3% per client per month over the last 6 months from the stored `gbp_scan` rows (`monthlyTable` in `gbp/scans.js`); nothing calls LeadSnap. One line per client, name on the line, export PNG.
- Clients table: client, niche, stage, first blocker, last activity, assigned to; search, "Needs a person" filter, archived hidden by default; row click opens the client.
- New field: `clients.assigned_to`.

### Clients (`/clients`)
- The dashboard table full page, the niche tabs from `GET /api/clients` (`tabs`, `niches`), the archive toggle (`POST archive` / `unarchive` as today), Move to niche as today.

### Add client (`/add-client`, the wizard)
- Replaces the "Is this client a X?" step. The unallocated clients list (Fillout submissions not yet allocated) stays as a card at the top of Clients with the same Allocate action.
- (1) Website address or "no website"; multi-location tick. (2) Reading the website: new `POST /api/intake/read-website` fetches the page server side and one Sonnet call (through `anthropic-call.js`, logged) pulls name, location, phone, logo URL, social links; running state while it works. (3) Google profile: new `GET /api/intake/places?q=` over the existing `gbp/places.js` text search (the key from `GOOGLE_PLACES_API_KEY`); "Use this listing", a pasted Maps link (place id read from it), or continue without. (4) Organising: new `POST /api/intake/merge` merges website, GBP and a Fillout submission matched on email or phone, each value tagged with its source. (5) Confirm: name, address or service area, phone, email, primary category, niche, business type (A, B, C, D, emergency, A2), existing site or new build. (6) Done: `POST /api/clients` (extended to take the seeded values and sources; writes `client_fields` with `source` and the client values JSON with `_sources`), the Fillout link (`FILLOUT_FORM_URL` from the environment, with the email prefilled where Fillout supports it), the client at Onboarding.
- Fillout arrival: `fillout/service.js` already matches a submission to an existing client on the normalised email and marks it `duplicate_of`. The brief asks that such a submission merges into that record and never creates a second client, matching on email or phone. That is a change inside the intake service (match on phone too, attach to the matched client, fill blank fields only). It is the one behaviour change outside presentation the brief names; I will keep it to those lines and cover it in the intake fixture. Say if you would rather it stayed as today.

### Client page (`/clients/:id/:tab`)
- Header: `GET /api/clients/:id` plus the client's dashboard row (stage, blocker); "Run next step" calls the stage's existing run route (research rerun, page map generate, the page runs in order, GBP generate); assigned to (new `PUT /api/clients/:id/assigned-to`).
- Record: `GET/PUT /api/clients/:id/client-values` regrouped in the UI: Business · Contact and NAP · Quotes and timing · Proof · Practices (`practices.json` by niche) · Areas (the page map's towns, areas worked, the scan settings from `GET gbp`) · Owner · Reviews (link, count, `hand_reviews`). Source tags from `_sources` in the same JSON (old records show Hand); inferred (website, GBP, dossier, not confirmed) shows amber, Confirm marks it. "What the pages can't say yet": the union of `missing_facts` from the latest quality review on every page record plus the record's blocking items from `needsAttention`. Save puts the JSON, reloads, and the toast counts the changed keys. The Fillout onboarding record (voice answers, prices, services, by-hand set-up) keeps its own views inside this tab as sub-sections, reading `GET /api/clients/:id/record`, `/services`, `/prices` as today.
- Research: `GET geo-location-status` and `GET dossiers` give one row per town (date, counts from a new `GET /api/clients/:id/dossiers/:assetId/summary` that runs `geo-dossier.js` on the saved text: neighbourhoods with sourced detail, issues, symptoms, rules); Run per town is `POST /api/research-rerun` with the client's module; Run all missing loops it; open a dossier reads `GET dossiers/:assetId` in a reader card.
- Page map: the existing panel code moved into a module unchanged in behaviour (`page-map`, `h1-research`, `services`, `towns/:town/launch` routes): phases, excludes, link planner, volumes, H1s.
- Pages: one table over `GET category-pages`, `service-pages`, `location-pages` and `v20/homepage`; status from the run state and the record (not started, running, written, blocked, waiting on a person = claims to accept or FLAGs to read, approved, pushed = a push logged for the page), quality score from the record's review, claims to accept from `CLAIMS`, last run; type filter; Write all / resume / write one through the existing run routes (`keys`); row click opens the Page view.
- GBP: `GET gbp` and today's action routes, as cards in a two column grid with copy buttons: generate, profile fields, NAP, note, templates, competitors, duplicates, landing page, profile verification.
- Rankings: scan settings, the map (the LeadSnap heatmap embed as today, with a month selector and a before/after pair), the Top 3% monthly table, drop alerts, schedules, export PNG. No LeadSnap call on load.
- Images: the tab with its empty state ("not built yet") only.
- Site audit (existing-site clients): there is no crawl in the code today, so the tab shows its empty state with the planned columns and no action. Flagged below.

### Page view (`/clients/:id/pages/:type/:key`)
- Left: the reader view from `GET v20/pages/:type/:key?format=md`, each model field editable in place through `PUT v20/pages/:type/:key` (saves a version, the validator and claims review run as today; the field's own result shows inline, the rest in the right column). Right: validation (blocks and flags in plain words), claims with Accept / Reject (`PUT wp/claims-accepted`, `POST wp/claims-review`), the quality score with its failed items, the flags. Top bar: name, type, status, Approve (a mark on the record version: `meta.approved_at`, `approved_by`; no migration), Regenerate (the run route with `keys`), Push (enabled when approved and `GET wp/fields` has the map; dry run then push as today), previous and next page in the Pages table order.

### Niche library (`/niches/:niche`), Trade facts (`/trade-facts`), Prompts (`/prompts`), Settings (`/settings`)
- Niche library: new `GET /api/niche-library/:niche` reads `niche-library/<niche>.json` (briefs by page type and business type, work nouns), the services CSV, the calibration pack file status, and the clients on the niche from the clients list.
- Trade facts: the existing routes and the Verify gate, in the new shell.
- Prompts: new `GET /api/prompts` lists `prompts/*.md` with the CORE number from the file name and the file's last commit date (git log, falling back to mtime), read only.
- Settings: new `GET /api/settings`: each API key set or not (never the value), model routing per call type read from the code constants (homepage, category, service, location, review, GBP, allocation, FAQ sort, claims; display only, since the brief changes no pipeline), LeadSnap plan and credits from the companies endpoint (read only, no credits spent) when the token is set, spend this month from the model log, users = the distinct `assigned_to` names plus free entry.

## 3. New fields and migrations (the only data changes)

| Field | Where | Migration | Written by |
|---|---|---|---|
| `assigned_to` | `clients.assigned_to TEXT` | `ALTER TABLE clients ADD COLUMN IF NOT EXISTS assigned_to TEXT` in `db.js`, idempotent, runs at start-up like every column today | `PUT /api/clients/:id/assigned-to` |
| Source per Client Value | `_sources` (key → form, website, gbp, dossier, hand) and `_confirmed` (key → true) inside the existing client values JSON (`client_assets`, `client_values`) | none; old records read as Hand | the wizard seed, the Record tab |
| Model log | new table `model_calls` (id, at, client_id, page_type, page_key, call_type, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_pence) | `CREATE TABLE IF NOT EXISTS` in `db.js` | `anthropic-call.js` `onUsage` (one place), plus one log line in the five direct `messages.create` callers (allocation, FAQ sort, claims review, prefill, GBP); prices per model in one table in code |

All three run on production at the merge through `initDb` at start-up, add only, rewrite nothing, and are safe to run twice.

## 4. Removed at the merge

`clients.html`, `client.html`, `client-record.html`, `client-settings.html`, `page.html`, `submissions.html` (its inbox moves under Clients), `trade-facts.html`, `v20-page.html`, `js/v20-page.js`, and the old redirects (`/` and the login landing go to `/dashboard`). `generate.html` is the question below.

## 5. Fixtures

The 52 fixtures stay green at every commit. New `tests/fixtures/ui-api.js` on pg-mem: the dashboard assembly (stage and blocker rules on a thin and a rich client), `assigned_to`, the model log and its monthly spend, the niche library and settings routes, the intake merge. The intake fixture covers the Fillout match on phone.

## 6. Questions for Brandon (I will build everything else meanwhile)

1. `generate.html` is the old GoHighLevel output path (CORE (19) pinned). Remove it with the old pages at the merge, or keep it reachable at its URL, off the sidebar, until that path is retired? I recommend keeping it off the sidebar until you say the old path is dead.
2. Site audit: no crawl exists in the code, and the brief adds no integrations. I will build the tab as an empty state with the planned columns. Fine?
3. The Fillout link in the wizard's Done step: one form URL for every client (`FILLOUT_FORM_URL` on Railway)? Send me the URL.
4. "Assigned to" names: free text, or a fixed list of names?
5. The Fillout merge on an existing client (email or phone match, fill blank fields only, never a second client): go ahead as described?

## 7. Order and reporting

Shell → Dashboard → Client page tabs in the brief's order → wizard → Page view → library pages. Each screen is one or more commits on `ui-redesign`, pushed, with the preview URL reported after each. STATUS is updated as pieces land. Merge to `main` only when every screen is in and the old pages are removed.
