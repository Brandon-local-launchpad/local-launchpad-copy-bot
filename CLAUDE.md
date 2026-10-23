# Local Launchpad Copybot

Copybot writes website copy for UK tradespeople (Local Launchpad clients) using the Core 30 local SEO method, and is moving from GoHighLevel output (`{{custom_values.X}}`, .txt downloads) to pushing copy into WordPress.

## Read before you change anything

| If the task touches... | Read first |
|---|---|
| Anything about the business, clients, onboarding or Core 30 | `docs/seo/reference/Master_Context_Document.txt` (sections 11, 12, 15, 17 matter most for code) |
| Where the build is right now, and what's next | `docs/seo/current-build/STATUS_Homepage_v20_Build.md` |
| Homepage generation (v20) | `prompts/Homepage_Copywriting_Prompt_CORE (20).md`, `niche-library/Claude_Code_Brief_Homepage_v20.md` and `docs/seo/reference/Homepage_Template_v2_Core_30_Build_Spec.txt`. Inputs: a client with a v3 page map gets its pages, categories, services (page titles, no service_words) and areas from it and the hand set-up (`v20-context-v3.js`, cards one per category page); otherwise the uploaded page map and custom values CSVs. Dry run: `node tools/homepage-inputs-dry-run.js "<client>"` |
| Niche data (trade words, steps, fears, FAQ slots) | `niche-library/Niche_Library_Landscaper.md`, `niche-library/Niche_Library_Roofer.md`. The code reads `niche-library/landscaper.json` and `roofer.json`, which are kept by hand. Any change to a niche `.md` must be made in its `.json` too, in the same commit. |
| v20 page types (homepage now, category pages next): what each type's fields, validator, reader view and WordPress mapping are | `page-types/index.js` (the registry) and `page-types/homepage.js`; records are stored by type and key in `v20-store.js` |
| Allocation pass (neighbourhoods and symptoms per page) | `prompts/Allocation_Pass_CORE.md`, `allocation.js` (checks and resolving), `geo-dossier.js` (dossier parser) |
| FAQs: choosing, assigning, answering, checking | `docs/seo/current-build/FAQ_Framework_and_Perplexity_Prompt.md`. Code: `faq-research.js` (per client research prompt and parser), `faq-sort.js` (tidy call, approval, which page each question goes to), `faq-service.js` (storage, research job, the FAQ questions card); prompts `prompts/FAQ_Research_CORE.md` and `prompts/FAQ_Sorting_CORE.md`; client facts in `niche-library/client-facts.json` and `practices.json` |
| Copy quality: what a good page is, and the review step | `docs/seo/COPY_QUALITY_RUBRIC.md`, `quality-review.js`, `tools/quality-loop.js` |
| Category/service custom values and the test client | `docs/seo/reference/Edens_Edge_Custom_Values_HOW_TO_USE.csv` |
| Fillout onboarding intake (webhook, field map, client record, inbox, audio storage) | `ONBOARDING.md`; code in `fillout/` (`field-map.json` is the config: a new niche goes there, not in code) |
| The niche services library (Brandon's verdict per Google Business Profile service name: page as the UK name, alias, fold, exclude) | `niche-library/<niche>.csv` (all 28 niches, rows keyed by name + GBP category; "Additional services" rows are free-text intake names) and `niche-library/library.js`: every library is loaded and a client's name is matched in its own library first, then the others; typed intake rows also match loosely and fuzzily; a fold whose target the client has (as a tab or through `niche-library/<niche>-categories.csv`, columns gbp_category, hub, note) beats page. A new niche is a new CSV, not code. Applied by `page-map/plan-v3.js` resolveLibrary before dedupe and fold |
| The page map (which pages exist, links, H1s, statuses) and the hand set-up for clients with no Fillout record | The spec is `docs/seo/reference/Local Service Site Page Structure.pdf` (Brandon, 19 Oct 2026; ask him for it if missing). Code: `page-map/plan-v3.js` (the services list rules: dedupe, fold, page or mention; the link planner), `page-map/generator.js` (the pages, town service pages, export columns), `page-map/store.js` (`client_page_map`, regeneration, core flags, outcomes), `page-map/routes.js`; dry run on a live client: `node tools/page-map-v3-dry-run.js "<client>"` (one call at most, writes nothing); fixture numbers via `node tools/page-map-report.js` |
| Trade facts packs (one research pack per niche for service pages: the runner, the verified flag, the service page gate, the loader) | `trade-facts/README.md`. Code: `scripts/trade-facts.js` (the Perplexity run), `trade-facts/pack.js` (header, tables, `packForService`), `trade-facts/store.js` (the flag in `trade_facts_verifications`, `serviceGate`), `trade-facts/routes.js`, page `public/trade-facts.html`. Brandon's prompt is `trade-facts/core.md`, his blocks `trade-facts/blocks/<niche>.md`; a new niche is a new block, not code |
| H1 research (DataForSEO volumes, H1s by volume or pattern, keyword groups and conflicts, the one-click page map job) | `h1-research/claims.js` (v2 rules: candidates, keyword groups, claims, hub pages, pattern fallback), `h1-research/research.js` (shared helpers: keyword form, Title Case, search terms), `h1-research/search-terms.json` (extra candidate words per niche and category, Brandon approves them), `h1-research/service.js` (tables, jobs, cache), `h1-research/dataforseo.js` (the API call; credentials from the environment only); dry run: `node tools/h1-research-dry-run.js "<client>"` |
| GBP output (the Google Business Profile description, services and products, one button on the client page) | `prompts/GBP_Description_CORE.md`, `GBP_Services_CORE.md`, `GBP_Products_CORE.md` (system prompts, JSON out) and `prompts/GBP_Validator.md` (the rules; the banned list is read from it). Code: `gbp/inputs.js` (locked services one category each, URLs, proof points, what's included from the service page copy), `gbp/validator.js`, `gbp/generate.js` (the three steps, one retry, resume), `gbp/store.js`, `gbp/routes.js` (`/clients/<slug>/gbp/<file>`). Local real run: `node tools/gbp-run.js edens-edge` |
| The old GHL delivery process | `docs/seo/reference/Website_Delivery_SOP.txt` (OUTDATED, reference only) |

The file the code reads is the only copy. Don't keep duplicates in `docs/`. On business rules, the Master Context Document (3 Oct 2026) and anything newer in `docs/seo/current-build/` win over older docs.

## Rules that are easy to break

- **Don't click or wire "Generate All" for a v20 client** until the other page types are migrated.
- CORE (19) stays pinned for the old path. CORE (20) is the v20 homepage path. Don't merge them.
- Code makes the decisions (H1, title, headings, which sections show, FAQ questions, card list, linkable pages, allocated neighbourhoods). The model only writes the prose fields listed in CORE (20). Keep that split.
- The model's output field names must match the CORE (20) OUTPUT block exactly.
- Copy rules the validator must enforce: no em or en dashes, no hyphenated compounds, the banned phrase list in CORE (20), word counts per field, links only to LINKABLE PAGES, no gendered owner pronoun unless `owner_pronoun` is set.
- Claims (free, same day, 24/7, fixed price, prices, materials, guarantees) only come from confirmed client values. Never invent them, in prompts or in fallback code.
- Test clients: Edens Edge (landscaper, Southampton) and Kestrel Ridge (roofer). Run both a thin and a rich client before calling a stage done.

## How to work

- Before a stage, write a short plan and wait for approval.
- After building, review your own work against the relevant doc above and list anything that doesn't match before saying it's done.
- When a decision is open (see STATUS "Open decisions"), ask rather than pick one.

## Copy quality: run the loop yourself

Brandon is not in the loop for copy quality (16 Oct 2026).

- The bar is `docs/seo/COPY_QUALITY_RUBRIC.md`: every item passes and the review scores 8.5 or more.
- The review step is `quality-review.js` (code checks plus a reviewer model, `prompts/Copy_Quality_Review_CORE.md`). Run it locally with `node tools/quality-loop.js <edens-edge|kestrel-rich|kestrel-thin>`; it uses the API key in `.env` and real data (Edens Edge: the real files plus `tests/live-snapshots/edens-edge.json`, taken from the live app and not committed).
- Loop: generate, review, fix the rules, prompt or code, regenerate, until Edens Edge and Kestrel Ridge both pass. Then give Brandon one merge link and the final reader view.
- Every new copy problem found (by you, the reviewer or Brandon) becomes a rubric item with a pass/fail test, and a check where code can test it.
- A missing client fact never stops the loop: the copy leaves the claim out, and the fact goes under "What I need from Brandon".
- Don't ask Brandon about anything the rubric or this file already answers.

## Decide yourself, don't ask me

- Housekeeping is yours: git, gitignore, commits, pushes, duplicate or stale files, paths, debug cleanup. Do it and tell me in one line.
- Going live is yours too (Brandon, 16 Oct 2026): when the fixtures pass, merge your branch into `main` and push it yourself (Railway deploys from `main`). Don't send merge links. Tell Brandon in one line what went live, and ask him to log in again only when you need the live app. Still ask first for anything that can't be undone (a WordPress push, deleting data).
- The file the code reads is the source of truth. Fix drift yourself, using the newest version.
- Fix bugs and mismatches with the docs without asking.
- Small dev-only tooling choices are yours: test helpers, dev dependencies, local runners (e.g. a PHP runner for the plugin tests). Say what you added in one line.
- Only stop and ask me about how the copy reads, client facts, pricing or business rules, STATUS "Open decisions", or anything that can't be undone.
- Update the STATUS doc whenever you finish a piece of work.
