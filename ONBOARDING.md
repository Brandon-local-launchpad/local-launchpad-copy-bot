# Onboarding: Copybot for developers

Start here. Then read `CLAUDE.md` (rules for working in this repo) and `docs/seo/current-build/STATUS_Homepage_v20_Build.md` (where the build is up to, and what's next). `HANDOVER.md` is outdated; it describes the old path only.

## What Copybot does

Copybot writes website copy for UK tradespeople (Local Launchpad clients) using the Core 30 local SEO structure: homepage, category, service, location and location + category pages. It reads a client's facts (client values, GBP categories and services, page map, local geo research) and writes each page with Claude.

There are two paths:

- **The old path** (GoHighLevel): every page type, written with the CORE (15) to (19) prompts in the repo root, delivered as `.txt` files with `{{custom_values.X}}` placeholders. Still live for clients not on v20.
- **The v20 path** (WordPress): the homepage now, category pages next (they're being migrated). Code makes every decision; the model writes only the prose; the copy is validated, checked for unsupported claims, reviewed by a person, and pushed into WordPress (ACF fields and the SEO plugin's title and description).

It runs on Railway: a Node/Express app with Postgres. **`main` deploys live**, so work on a branch and open a pull request into `main`.

## Run it locally

Needs Node (we develop on Node 24) and `npm install`.

**Quickest: the demo.** No database, no API key, no real site:

```bash
npm run demo:wp
```

It starts the app on an in-memory Postgres (pg-mem) with a demo client (Edens Edge) and a v20 homepage, plus a fake WordPress site, and prints the URLs to open: the client screen, client settings, the page screen and the generate screen. The fake site's test login is printed too. The claims review is a canned reply unless you set `DEMO_REAL_MODEL=1` (then it needs `ANTHROPIC_API_KEY`). Set `DEMO_PORT` to change the port (default 3991).

**The real app.** Copy `.env.example` to `.env`, fill it in, then:

```bash
npm run dev
```

| Variable | What for |
|---|---|
| `ANTHROPIC_API_KEY` | Every model call (generation, retries, claims review, allocation) |
| `DATABASE_URL` | Postgres. Without it the app runs, but clients, v20 pages and the WordPress push are off. The schema is created on start (`db.js`, `wp/db-store.js`). |
| `COPYBOT_SECRET_KEY` | Encrypts each site's Application Password (64 hex characters). Without it, connections can't be saved. Changing it means re-entering every site's password. |
| `APP_PASSWORD`, `APP_SECRET` | The app's login. No password means open access (fine locally). |
| `PERPLEXITY_API_KEY` (and `PERPLEXITY_PRESET`, `PERPLEXITY_TIMEOUT_MS`, `RESEARCH_CONCURRENCY`) | Geo research |
| `PORT` | Defaults to 3000 |

Never put real credentials in commits, chat or tickets.

## How the v20 pipeline fits together

One page, start to finish (the homepage today):

1. **Inputs**: client values (`public/generate.html`, Client Values step), the page map and custom values CSVs (`client-files.js`), the niche library (`niche-library/*.json`, `practices.json`), and the geo research dossier (`geo-dossier.js`).
2. **Allocation pass** (`allocation.js`, `prompts/Allocation_Pass_CORE.md`): picks which neighbourhoods and local problems each page uses, so pages don't repeat each other.
3. **Code decisions** (`decisions.js`): H1, title, headings, which sections show, the card list, FAQ questions, steps, linkable pages. The model never decides these.
4. **Generation** (`v20-generate.js`, `prompts/Homepage_Copywriting_Prompt_CORE (20).md`): one model call writes the prose fields. `v20-parse.js` reads the reply, and `v20-record.js` builds the page record.
5. **Validation and retries** (`validate-v20.js`, `v20-retry.js`, `prompts/Field_Retry_CORE.md`): BLOCK and FLAG checks (dashes, banned phrases, word counts, claims not on file, links). Failing fields are rewritten one at a time, at most twice.
6. **Claims review** (`wp/claims-review.js`, `prompts/Claims_Review_CORE.md`): a model reads the copy against the facts on file and lists unsupported statements. They go back through the retries; a person accepts whatever is left.
7. **Storage** (`v20-store.js`): every version of every page is a row, by page type and key. Hand edits (`v20-edit.js`) make a new version and are validated and reviewed again.
8. **Screens**: the client's page list (`public/client.html`) opens the page screen (`public/v20-page.html`, `public/js/v20-page.js`): reader view, field editor, claims, dry run, push, push log, rollback. The WordPress connection is on the client settings screen (`public/client-settings.html`).
9. **WordPress push** (`wp/`): `service.js` is what the screens call. `dry-run.js` re-validates with today's rules and diffs every field; `push.js` snapshots, writes, reads back and logs; rollback restores a snapshot. Drafts and staging sites only for now (`wp/safety.js`).

**Page types** (`page-types/`): each page type (homepage now, category next) describes its own fields, word ranges, validator, reader view and WordPress mapping. The shared steps above follow the record's type.

Copy is written with `[CV: key]` tokens (company name, phone and so on), never literal values. The WordPress plugin replaces them when the page is shown.

## The WordPress plugin

`wp-plugin/llp-copybot/`. Its README covers install and setup. In short:

- Settings → Client Values on each site, filled by Copybot's push.
- Replaces `[CV: key]` tokens in ACF fields and the Rank Math/Yoast title and description on display; the editor and REST API see the raw tokens. Also a `[llp_cv]` shortcode and `llp_cv()` for templates.
- REST routes `llp-copybot/v1/client-values` and `/status`, and the SEO meta exposed on `/wp/v2/pages`.
- **The ACF field groups in `acf-json/` are the master copy.** They're generated from `wp/acf-schema.js` (and the token keys from `wp/client-values.js`) with `npm run wp:plugin-data`. Change the source, regenerate, commit both; a test fails if they drift. Don't edit the JSON by hand or on a site.
- Needs ACF Pro. Copybot connects with an Application Password over https (localhost aside).

## Tests

```bash
npm run test:fixtures
```

Runs every file in `tests/fixtures/` (about 18 files, 450+ checks, no API calls). They cover the decisions, allocation, generation parsing, validator, retries, claims, reader view, hand edits, page types, and the WordPress side: payload and dry run, the push and rollback against a fake WordPress (`tests/fake-wp/`), the plugin's PHP run in php-wasm (`tests/php/`), and the push service on an in-memory Postgres. All must pass before a pull request.

```bash
npm run test:acceptance
```

The Edens Edge acceptance run. It calls the real model (costs money, needs `ANTHROPIC_API_KEY`), so run it when generation changes, not every time.

Command-line WordPress tools, for checking a site without the screens: `npm run wp:dry-run -- <record.json>` and `npm run wp:push -- <record.json>`. The site comes from `WP_URL`, `WP_USER` and `WP_APP_PASSWORD`, or add `--fake` to run against the fake site. A record is the `.json` download from the page screen.
