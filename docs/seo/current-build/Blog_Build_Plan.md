# Blog posts in Copybot: the build plan (branch `blog`, 28 Oct 2026)

For Brandon's approval before any code. From `docs/Blog_Copybot_Build_Brief.md`, `docs/Blog_Post_Structure.pdf` (Ray's spec), `prompts/Blog_Post_Copywriting_Prompt_CORE (1).md`, and the codebase on `main` at 077c79b (the UI redesign merge). Amendment 1 was not in the hand-over; its points are taken from the brief's summary, and the plan says where the file itself is still needed.

## 1. Where blog slots into each existing stage

The client's pipeline today is Onboarding → Research → Page map → Pages → Push → Live (the stage rules in `ui/dashboard.js`). Blog adds to each stage; it replaces nothing.

| Stage | What blog adds | Reuses |
|---|---|---|
| Onboarding (Record tab) | `owner_role`, `launch_date`, `status` (active / churned), `search_console_property`; the price rows per service shown with "has a price / quote only / none" | the client values JSON (`client_assets` client_values), the clients table, `client_price_rows` (fillout/prices.js) |
| Research | FAQ sorting reserves the blog topics from the two held buckets (`held.costGuide`, `held.noPage` in `faq-sort.js assignQuestions`) in the same run; the site wide check covers questions, neighbourhoods and symptoms across pages and posts | `faq-sort.js`, the `faq_sort` row, the allocation record, the geo dossiers |
| Page map | blog rows (type `blog`, slug `/guides/<slug>`) written by the queue builder after sorting; a page map regeneration leaves them alone; H1 research never looks them up | `client_page_map` rows with the blog columns in `info`; the CSV export gains the blog columns |
| Pages | a fifth v20 page type, `blog`: decisions B1 to B15, generation, validation, retries, claims review, records in `client_assets` by (type `blog`, key slug); the Pages tab's Blog filter is the queue table and the batch review; the Page view opens a post | `page-types/`, `v20-store.js`, `v20-parse.js`, `v20-retry.js`, `v20-edit.js`, `validate-v20.js`, `ideas.js`, `allocation.js`, `trade-facts/pack.js`, the runner shape of `service-run.js` |
| Push | WordPress posts in the Guides category, scheduled with `date_gmt`, through the same dry run, safety rails, snapshot and rollback | `wp/dry-run.js`, `wp/push.js`, `wp/safety.js`, `wp/service.js`, `wp/acf-schema.js`, the plugin, the fake server, the PHP runner |
| Live | the daily job (hold, publish, backfill, price change, churn), logged on the client page | `wp/client.js`, the page map store, the v20 store, the model log |
| Month 6 and on | the Search Console batch (B16): API or CSV, candidates, six posts, the same stages 4 to 7 | everything above |

## 2. Stage by stage: every file added or changed

Each stage ends with its fixture green in `node tests/run-fixtures.js` and a preview on the demo server (`node tests/ui/demo-server.js --port 3995`, seeded with Edens Edge, a roofer and the dog walker).

### Stage 1: data

Add
- `blog-inputs.js`: one function `blogInputsFor({ cv, clientRow, priceRows, fields, niche })` that returns every blog input with a plain-words "missing" list: owner name and role, price rows matched to the page map services (by name, through the service's GBP names), launch date, status, the Search Console property, the niche blog slots, and the trade facts pack standing.
- `blog-blocks.js`: the niche's blog slots by business type (`seasonal_topics`, `safety_topics`, `blog_cta_h2`, `cost_unit`, `decision_pairs`) with the business type defaults from spec section 3 (A and D "Talk to a Local [TRADE_PERSON] About [TOPIC]", B "Book a Local [TRADE_PERSON] for [TOPIC]", C per pet niche from `primary_action`); a niche with no entry gets the defaults and a flag, never a refusal (the brief: "the other niches get the business type defaults").
- `tests/fixtures/blog-data.js`: Edens Edge, Kestrel Ridge (roofer) and the dog walker load with every input present or reported missing in plain words.
- `tests/fixtures/data/dog-walker.js`: the third client's values, page map rows and FAQ questions. These are test data, so they come from Brandon (see section 4).

Change
- `v20-generate.js` CV_KEYS: add `owner_role` (so it is a `[CV: owner_role]` token, pushed to the site too; `npm run wp:plugin-data` regenerates `client-value-keys.json`).
- `server.js` CLIENT_VALUES_TEMPLATE: `owner_role`. The Record tab (`public/app/tabs/record.js`): the field, and when it is blank, the intake's `owner_name_title` ("first name and role") split on its first comma as the inferred value with a source tag, as the wizard seeds other values.
- `fillout/allocation.js` ensureAllocationColumns, or a new `blog/db.js`: `clients.launch_date DATE`, `clients.status TEXT NOT NULL DEFAULT 'active'`, `clients.search_console_property TEXT` (add only, idempotent, like every migration here). `ui/routes.js`: `PUT /api/clients/:id/blog-settings`. Record tab: a "Blog" card with the three fields and the price rows table ("which services have prices").
- `niche-library/landscaper.json`, `roofer.json` and their `.md` mirrors: the blog slots (same commit). `seasonal` is already there as `seasonal_trade`; the code reads that key (no duplicate slot).
- `CLAUDE.md`: a row for blog posts.

### Stage 2: sorting includes blog

Add
- `blog-topics.js`: `reserveBlogTopics({ assignment, questions, pages, cv, niche, keyValueMap, dossiers })`. From `held.costGuide` and `held.noPage` (approved wording only): the cost guides (the trade level one first, then one per main service), then the customer questions (the client's own customers' questions first, `source: 'client'`), each topic taking its query stack (3 to 5 same-service, same-town questions ordered Fit, Process, Price, Timing, Trust) and then its FAQ IDs (the next 3 to 5 in the cluster), so no ID is used twice; decision posts where the wording matches a `decision_pairs` entry or "X or Y", "repair or replace", "do I need"; local topics one per town with a dossier condition no page uses; the seasonal topics. Deterministic: the same input gives the same list.
- `site-check.js`: `siteWideCheck({ pagesQuestions, blogTopics, allocationRecord, records })` returning repeats of question wording, neighbourhoods and symptoms across pages and posts (extends `faq-sort.js siteRepeats`, which checks wording only).
- `tests/fixtures/blog-sort.js`: Edens Edge from the live research reply already in the repo (`tests/fixtures/faq-research-replies/edens-edge-live-2026-10-14.md` and `faq-sort-replies/edens-edge-live.json`): zero repeats, every blog FAQ ID absent from every page's allocation.

Change
- `faq-service.js`: `runSort` and `view` call `reserveBlogTopics` and store the topics on the `faq_sort` row (`blog` key); the FAQ card shows "n blog topics reserved" and the site wide check's result.
- `public/app/tabs/research.js`: the FAQ panel shows the reserved topics and the check.

### Stage 3: decisions

Add
- `page-types/blog.js`: id `blog`, label "Blog post", LABELS from CORE (1) OUTPUT (`blog_answer`, `blog_sections` [h2, body], `blog_table` [row, cells], `blog_business`, `blog_faq_items` [faq_question, faq_answer], `blog_closing`), OUTPUT_SPEC, modelFields (rangeKey carries the post type, e.g. `section_body:cost_guide`), RANGES per post type, replyLabels, validate, readerView, wp.
- `blog-queue.js`: B1 (the queue from the reserved topics, in the agreed order), B2 (type), B10 with the amendment (16 posts: launch 3, then 2, 4, 3, 2, 1, 1; even spacing inside each month from `launch_date`; a seasonal topic moved to the month before its window; F-QUEUE under 16 and the cadence stops at the last topic), the batch, source and source query columns; writes and refreshes the blog rows in the page map (`page-map/blog-rows.js`: upsert by page_key, never touching a person's notes or a Live status).
- `blog-decisions.js`: `computeBlogDecisions({ cv, niche, keyValueMap, rows, page, topic, priceRows, tradeFacts, dossier, allocation, symptoms, ideasUsed, written })` → `{ gates, flags, decisions, decisionsBlock }` in the service page's shape. B3 H1 (title case, question mark, city added when there is room, 70 max), B4 SEO title (own rule: "[H1 without ?] | [CV: company_name]", 60 max, drop the company, then the keyword words; never the banned openers or a year), B6 and B7 from the topic, B8 links (service page → category page → `/#services`; Live or Launching from the page map status and phase, as `v20-context-v3.js` reads them; phase 2 counts as Launching), secondary links, B9 specificity (6 facts; 4 needed, 3 when source is `search_console`), B11 table (columns by type from Layer 1 section 4; rows from the price rows, the decision pair, the dossier issues or the rule rows), B12 business block (2 or more of quote method, confirmed practices, guarantee, insurance, accreditation, years), B13 byline (`owner_name` + `owner_role`, else "owner", else the company), B14 dates, B15 safety (niche `safety_topics`, or a Table C rule row whose name or text says gas, electrical or structural). Gates G-TOPIC, G-SPECIFIC, G-PRIMARY, G-FACTS (question, decision and cost guide posts; a local post needs no pack), G-INPUT. The DECISIONS block lists FACTS ALLOWED with IDs (CV keys, PRICE-nn rows, TF-nn pack rows, the dossier IDs, the customer question in their words), LINKABLE PAGES, IDEAS USED ELSEWHERE (the homepage, the primary page, the posts in the same service or town), MODEL FIELDS.
- `tests/fixtures/blog-decisions.js`: Edens Edge 16 rows (or F-QUEUE), the first three cost guides with the first marked Homepage cost guide, the dates on the schedule, H1 ≤ 70 and title ≤ 60, no FAQ ID twice, the same input twice identical, a 3 of 6 topic skipped unless `search_console`.

Change
- `page-types/index.js`: register blog.
- `page-map/generator.js`: `TYPES` and `TYPE_LABEL` gain `blog`; `CSV_COLUMNS` gain Post type, Target query, Query stack, FAQ IDs, Primary link, Secondary links, Town, Homepage cost guide, Publish date, Link status, Last checked, Review due, Batch, Source, Source query; `diffPlan` ignores blog rows (they are not the generator's). `page-map/store.js`: INFO_KEYS gains the blog keys; `STATUSES` gains `Scheduled`.
- `h1-research/service.js`: blog rows are never researched.
- `server.js`: `GET /api/clients/:id/blog/queue` (the queue with gates and flags, no model call) and `POST .../blog/queue/build`; `V20_FACTS.blog` so a hand edit re-validates with today's facts.
- `public/app/tabs/pages.js`: the Blog filter shows the queue table (type, H1 with its character count, SEO title with its count, primary and secondary links, switches, specificity count, gate results, publish date, flags) above the posts.

### Stage 4: generation

Add
- `blog-generate.js`: CORE (1) plus `_shared_copy_rules.md` under SHARED COPY RULES as the system prompt (the same loader as `service-generate.js`), the cached client block, the FACTS ALLOWED block, the per post message; the parser (`v20-parse.js parseOutput` with the blog spec; HIDDEN as on the homepage, and a list marked HIDDEN accepted for `blog_table`), `blog-record.js` (the record in page order with the code fields: H1, byline, dates, section H2s, table columns, the business H2, the FAQ H2, the CTA H2 and buttons; B5 meta description from the first sentence of `blog_answer` plus `meta_cta`, F-LEN-META), the retries, the claims review and the rubric review as the service page runs them.
- `blog-run.js`: the runner in `service-run.js`'s shape: the queue order, one post per call, the run state in a `blog_run` asset, resume (a post with a good record is kept), a post whose gate fails is recorded and the next topic takes its slot, the ideas and symptoms of the posts written so far passed on.
- `tools/blog-run.js`: the local real run for Edens Edge (the live snapshot when there is one), saving records and reader views under `tests/quality-runs/blog/<time>/`.
- `tests/fixtures/blog-generation.js`: the 16 posts with a stub model; every post parses into its fields with nothing left over (every label consumed, no P-* flag).

Change
- `server.js`: the blog runner and routes (`GET .../blog-pages`, `POST .../blog-pages/run`, `GET .../blog-pages/preview/:key`), the model log tag "blog posts".
- `tests/ui/demo-server.js`: seeds the blog inputs.

### Stage 5: validator

Add
- `validate-blog.js`: `validateCommon` and `sharedCrossChecks` keyed on the blog fields (dashes, hyphenated compounds, banned phrases, template leftovers, unknown tokens, weak link phrases, N2 links on LINKABLE PAGES, N5 claim words, N6 HIDDEN, N7 ranges by post type), then B-N1 to B-N9: first sentence of `blog_answer` over 20 words or of a FAQ answer over 15 (FLAG); the primary link missing or more than twice (BLOCK); a £ figure not in the price rows and not a fee from a FACTS ALLOWED row (BLOCK); a standard or regulation by number or name, reusing the service page's STANDARD rule plus "Part P" (BLOCK); story markers and invented names (FLAG); the safety switch on and dismantle, rewire, cut, reconnect or repair as an instruction (BLOCK); an FAQ question used on another page or post (BLOCK, from the site's questions passed in V); a sentence remaking IDEAS USED ELSEWHERE (FLAG, `ideas.js matchIdea`); a paragraph with no fact ID behind it (FLAG, from the claims review's findings). Also: `blog_closing` never `[CV: phone]`, never opens "Tell us", never the same opening words as another closing line on the site; `blog_answer` never opens on the company name; no "this year", "in 2026", "recently".
- `tests/fixtures/data/blog-sample-appendix-b.js`: the spec's Appendix B post as a record (transcribed from the PDF, with its DECISIONS).
- `tests/fixtures/blog-validator.js`: the sample passes with no BLOCK; one broken copy per BLOCK check (a price not in the list, "Part P", a third primary link, a reused FAQ question, a safety post with a DIY step) fails on the right check; the 16 generated posts end with no BLOCK.

Change
- `validate-v20.js` RETRY_FLAGS: the blog FLAGs that a retry may fix. `docs/seo/COPY_QUALITY_RUBRIC.md`: a "G. Blog posts" section, one item per rule with a pass/fail test, so `quality-review.js` scores posts.

### Stage 6: review

Change
- `public/app/tabs/pages.js`: Blog in TYPES; the Blog filter lists the queue, then the posts grouped by batch with status, flags and a link to each, and "Approve all without BLOCK or unreviewed FLAG" (a post with FLAGs counts as reviewed once "FLAGs read" is ticked on its Page view, saved as `meta.flags_reviewed_at` through the approve route's setMeta). Blog posts are never part of "Write all" (they have their own run button).
- `public/app/screens/page.js`: LABEL blog; the "FLAGs read" tick; the WordPress card shows the publish date and what the push will do (create as draft or scheduled, or update).
- `ui/dashboard.js`: PAGE_TYPES, ROW_TYPE, DEFAULT_COST gain blog, so the summary, the page list (previous and next on the Page view) and the costs count posts.
- `blog-reader.js`: the reader view in the post's order (the breadcrumb, H1, byline, last checked, quick answer, sections with the table under its section, the business block, the FAQ, the CTA).
- `server.js`: `POST .../blog/approve-batch`.
- `tests/fixtures/blog-ui.js`: the routes on pg-mem, as `ui-dashboard.js` does.

### Stage 7: push to WordPress

Add
- `wp/blog-map.js`: BLOG_FIELDS with their kinds and `buildBlogPayload(record, { seo })`: the ACF fields of spec section 6 (`blog_h1`, `blog_byline`, `blog_last_checked`, `blog_review_due`, `blog_answer`, `blog_sections` repeater, `table_show`, `table_after`, `table_columns`, `table_rows` repeater, `blog_business_show`, `blog_business_h2`, `blog_business`, `blog_faq_h2`, `blog_faq_items` repeater, `blog_cta_h2`, `blog_closing`, the buttons; `blog_image` and its alt are `push: false`), the Rank Math or Yoast meta, and the post fields: title, slug, `categories` (Guides), `status` (`future` with `date_gmt` converted from Europe/London; `draft` for a launch post with no launch date; `publish` only through the daily job), `date_gmt`.
- `wp/posts.js`: `findPost(site, slug)` (`/wp/v2/posts?slug=&status=any&context=edit`), `createPost`, `ensureGuidesCategory` (`/wp/v2/categories?slug=guides`, created when missing).
- `tests/fake-wp/fake-wp.js`: posts (list by slug and status, get, create, update), categories; the plugin's `status` reports the blog field groups.
- `tests/fixtures/blog-wp-push.js`: Edens Edge's 16 posts to the fake server: 16 posts at `/guides/[slug]/`, 3 draft or launch dated and 13 scheduled with the right dates, the field values, a second push changes nothing; a rollback puts a created post back to draft.

Change
- `wp/acf-schema.js`: blog groups with a `location` per group (post type `post` and category Guides; the homepage groups keep `front_page`); `acfGroupJson` reads the group's location. `npm run wp:plugin-data` regenerates `wp-plugin/llp-copybot/acf-json/` (the wp-plugin fixture compares the files).
- `wp-plugin/llp-copybot/llp-copybot.php`: the SEO meta registered for `post` as well as `page` (`edit_posts`); the status route lists every group. `tests/php/plugin-tests.php` and `tests/fixtures/wp-plugin-php.js`: the post meta registration.
- `wp/dry-run.js`, `wp/push.js`, `wp/safety.js`: the page type says whether its target is a page or a post (`wp.kind`); a missing post is "would be created" in the dry run and created in the push (today a missing page is a refusal); the snapshot records `created: true` and a rollback of a created post sets it to draft, never deletes; `checkTarget` allows `future` and `draft` and refuses `publish` unless staging, as now; a post is pushed only when the record is approved and its claims accepted, as now.
- `wp/service.js`: nothing in shape; `loadRecord` already takes a type and key.

### Stage 8: daily job

Add
- `blog-daily.js`: pure steps taking `{ now, clientId, rows, records, site, priceRows, status }`: hold (due within 2 days, primary page not Live: +7 days on the site and the page map, F-HELD), publish (status `future` past its date: `status: publish` through REST, the page map row Live, the URL stored on the client as `cost_guide_urls` for the GBP batch), backfill (see section 3, point 7), price change (a hash of the price rows the post was written from is kept on its record; a change regenerates the scheduled posts that state a changed price, marks F-PRICE-CHANGED, holds them until approved), churn (status churned: every `future` post to draft on the site and the page map; published posts stay). Every action a row in `blog_job_log` (client, action, post, detail, at), shown on the Pages tab's Blog filter.
- `scripts/blog-daily.js`: the Railway cron entry (`node scripts/blog-daily.js`, every active client in turn; `BLOG_CLOCK` overrides the date for the simulation). Brandon adds a Railway cron service on the same repo with that command and a daily schedule. Also `POST /api/blog/daily-run` behind the app login, to run it by hand.
- `tests/fixtures/blog-daily.js`: 190 days from launch for Edens Edge on the fake server with the clock override: posts publish in order; a post linking a phase 2 page that goes Live on day 40 is held until then; the backfill marks land the day each cost guide publishes; a price change on day 60 sends the affected scheduled posts to review; churn on day 100 leaves the rest as drafts.

### Stage 9: Search Console batch

Add
- `search-console/client.js`: a service account JWT (RS256 with Node's crypto, no new dependency) exchanged for a token, then `searchanalytics.query` (last 90 days, country GBR, dimension query and page); credentials from `GOOGLE_SERVICE_ACCOUNT_JSON` only, as the Places key is.
- `search-console/csv.js`: a Search Console export (Query, Clicks, Impressions, CTR, Position) as the second route; upload on the client page.
- `search-console/candidates.js`: new post candidates (10 or more impressions, average position worse than 10, not owned by any page or post: a query whose words are covered by a page's keyword, a post's target query or an FAQ wording is owned), each with a suggested question wording made by code from the query (the H1 research helpers' keyword form, turned into the question shape the FAQ sorting uses) to approve or edit; page improvement candidates (positions 5 to 20, 20 or more impressions) with the page and a suggested FAQ question, list only.
- `blog-queue.js`: the B16 batch (six slots in the amendment's order, one a month from month 7; a short batch refreshes the posts nearest their review date, F-SC-THIN; from month 12 the published posts due for review are rechecked), then stages 4 to 7 as for the onboarding batch.
- `tests/fixtures/blog-search-console.js`: Brandon's fixture CSV (or 40 rows mixing qualifying, owned and low impression queries, supplied by him): exactly the qualifying queries are candidates, owned ones never, six posts scheduled across months 7 to 12.

Change
- `public/app/tabs/pages.js` and `screens/client.js`: "Search Console batch due" from month 6, then every 6 months; the candidate screen; the CSV upload.

### Acceptance test
`tests/acceptance/blog.js`: the three clients through the onboarding batch (16 topics or the expected F-QUEUE, no BLOCK after retries, the expected flags, no two posts making the same point), the fake server push, and the 190 day simulation. Then Edens Edge to Given's staging site, only when Brandon says so.

## 3. Where the spec conflicts with the codebase

1. **`price_list` is a URL today.** The client value `price_list` is a link to a price list (the plugin sanitises it as a URL; the Record tab says "URL or blank"). The prices per service are the `client_price_rows` table from the "Prices for your services" voice answer (from, up to, typical, unit, what moves the price, quote only, unverified). Plan: the blog's price list is `client_price_rows` (verified rows that are not quote only), matched to the page map service; `cost_mode` is `prices` when the post's service has such a row; the rows go in FACTS ALLOWED as PRICE-nn lines and B-N3 checks every £ figure against them. The prompt says "[CV: price_list]" in five places; that wording needs to become "the PRICE rows in FACTS ALLOWED" (a prompt change, Brandon's call).
2. **`seasonal` already exists as `seasonal_trade`.** The code reads the existing key; the spec's name is not added as a second slot.
3. **The page map is generated from the record.** `buildPageMap` is pure and `diffPlan` retires any saved row the plan does not produce. Blog rows come from the topic queue, so `diffPlan` must skip type `blog`, `INFO_KEYS` must carry the blog columns, and the status vocabulary differs: the page map has Not Started, H1 Added, Copy Generated, Pushed to WordPress, Live; the spec's Link status is Live / Launching / Scheduled / Not built. Plan: the page map keeps its statuses and gains `Scheduled`; Link status is derived as `v20-context-v3.js` already derives it (phase 1 Not Started counts as Launching, phase 2 as Not built).
4. **Batch API with resume (brief, stage 4).** The three v20 page types written since the homepage run one page per call through `makeCallModel` with a runner (order, resume, run state), and the retries and claims review need the reply at once. The Batch API is the old GHL path. Recommendation: the runner pattern; the "intent key = client + slug" is the v20 store's (type, key), and resume keeps a good record instead of writing it again.
5. **The push is page only.** `wp/push.js` finds a page (never creates one), writes `/wp/v2/pages/:id`, and never changes a status. Blog needs posts created in the Guides category with slug, `status` and `date_gmt`. Plan: the page type declares `wp.kind` (page or post); a missing post is created; the snapshot records a created post and a rollback sets it back to draft (never deletes). The homepage path is unchanged.
6. **The plugin registers the SEO meta for pages only** and the ACF group location is hard coded to the front page. Both become per group and per post type (the homepage groups keep theirs).
7. **The backfill cannot be built in full yet.** Service and category pages have no WordPress push (their `wp.buildPayload` throws "cannot be pushed yet"), and the homepage FAQ Q1 does not carry the cost guide link in `decisions.js`; the brief says not to change another page type's decisions or output. Plan for this build: on publish, mark Live in the page map and store the cost guide URLs on the client; the homepage is re-pushed only once its own decisions link Q1 to the cost guide (that is one line in `decisions.js buildFaq`, outside this brief: Brandon to approve separately), and the service and category links wait for their field maps.
8. **Schema.** Spec section 10 gives BlogPosting, FAQPage and BreadcrumbList to the template (Given), reading the ACF fields. Plan: Copybot pushes the fields the schema reads (H1, byline name, last checked, review due, FAQ items); no JSON-LD from Copybot or the plugin unless Brandon wants it in the plugin.
9. **A roofer and a dog walker need a niche entry.** Only `landscaper.json` and `roofer.json` exist (the roofer has no `category_page_blocks` or `service_page_blocks` yet, so its category and service pages are not writable either; the blog needs only the homepage slots plus the blog slots, so a roofer post can run). There is no pet care niche JSON at all, only `pet-care.csv`; a dog walker post needs the homepage slots (trade words, buttons, fears, FAQ slots) and the type C blog defaults. See section 4.
10. **G-FACTS per post, not per run.** The service pages refuse the whole run on an unverified pack. The spec says a post waits (and local posts need no pack). The blog follows the spec.
11. **The amendment file is missing.** The brief restates B1's count, B10, B9, B13, the URL, the columns, the flags and the daily job; the B16 slot order and the schedule's finer rules (how the seasonal move pushes a question post back; the review date rules for the Search Console batch) are only in the amendment. Stages 1 to 7 can be built from the brief; stage 8's rules and stage 9's order need the file.
12. **B13 byline.** The spec says `owner_qualification` or "owner"; the amendment says `owner_role`. Plan: `owner_role` (new), else "owner"; `owner_qualification` stays what it is (a qualification, not a role).

## 4. What I need from Brandon

- `docs/Blog_Amendment_1.md` (the file; it goes in with the next commit).
- The prompt change in point 1 above ("[CV: price_list]" to the PRICE rows), or a word that the price list stays a URL and cost guides run on factors only.
- A yes to the runner pattern instead of the Batch API (point 4).
- The dog walker: the client values, services, towns and FAQ questions for the third test client, since fixtures come from Brandon's paper tests, not from my assumptions; and whether a pet care niche entry (`niche-library/pet-care.json` and its `.md`) is part of this build or his.
- The roofer test client for the blog: Kestrel Ridge rich (the Bournemouth FAQ research reply is in the repo) is the plan unless he wants another.
- The Railway cron: a cron service on the same repo running `node scripts/blog-daily.js` once a day (he sets it up when stage 8 lands).
- A Search Console export CSV for stage 9, or the 40 rows.

## 5. Not in this build (the brief's Don'ts)
No push to a live client site; no change to any other page type's prompt, decisions or output (the Q1 backfill link is named above as a separate decision); no "Generate All"; cost guides on the spec's rules until the Cost Guide Structure tab arrives.
