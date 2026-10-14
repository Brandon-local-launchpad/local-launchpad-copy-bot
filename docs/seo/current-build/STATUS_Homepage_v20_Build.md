# Homepage v20 build: where things stand (14 Oct 2026)

## Done
- Homepage CORE (20) prompt, Landscaper and Roofer niche entries, Claude Code brief: final, tested on paper (Edens Edge thin, Edens Edge with reviews, Kestrel Ridge roofer rich and thin).
- FAQ framework + Perplexity trade question bank prompt (v3). Roofer runs done twice.
- Claude Code: Stage 1 (niche JSON, CORE 19 pinned for old path), Stage 2 (client values storage), Stage 3 (Client Values screen), Stage 4 (decisions engine) built.
- Stage 4 fixes (14 Oct), all covered by `npm run test:fixtures` (3 fixtures, 59 checks, all pass):
  - Cards: with a category layer, only primary category services become cards; secondary category services stay under their category page. Edens Edge gives 7 category cards.
  - LINKABLE PAGES trimmed: no homepage, no location category pages, no secondary category services.
  - MODEL FIELDS uses the CORE (20) OUTPUT names and list keys exactly. Blocks are sent in the brief's order: PAGE, DECISIONS, LINKABLE PAGES, ALLOCATED ITEMS, MODEL FIELDS.
  - Q5 brief written by code ("Yes: quotes are free (confirmed)...") instead of the garbled "From Free and [CV: quote_method]".
  - Generate All: warning line and a confirm box for v20 clients.
  - F-MORE-SERVICES now counts the real overflow.
- Roofer niche entry: Planning Portal building regs wording for faq_E and 13 onboarding questions from the Bournemouth FAQ research. roofer.json synced.
- Roofer Q5 (14 Oct): the default is quote only, "Is the quote free and no obligation?". The new `faq_5_free_inspection` slot ("Are the inspection and quote free?") is used only when free_quotes = yes and the new `free_inspection` client value = yes. The field is on the Client Values screen under Quotes & Timing.
- Page map (14 Oct): the parser reads the Page Types "Locations Hub", "About" and "Cost Guide". They're link-only: they appear in LINKABLE PAGES when Live or Launching, but never become generation jobs and are never flagged for a missing H1.
- Fixtures: 4 files, 78 checks, all pass. `kestrel-ridge-thin-page.js` is a truly thin roofer (no reviews, no logos, no owner section). The old thin fixture is renamed `kestrel-ridge-thin-faq.js`.
- Stage 5, allocation pass (14 Oct), built and tested with fixtures. Not run against a real dossier yet:
  - `geo-dossier.js` reads saved dossiers (neighbourhoods, issues, symptoms, rules). It copes with IDs with or without brackets and with symptoms written as bullets or as table rows.
  - `allocation.js` plus `prompts/Allocation_Pass_CORE.md`: one Sonnet call. Code first removes neighbourhoods with no sourced detail, urgent symptoms (unless it's an emergency niche) and symptoms whose issue isn't tagged with one of the client's categories. Code then checks every pick, retries once with the errors, keeps only valid picks, and adds conservation areas from RULES & COUNCIL.
  - The result is saved as a `client_assets` row of type `allocation`, keyed by page. Routes: GET/POST run/PUT `/api/clients/:id/allocation`. It runs by itself the first time the primary city dossier is saved.
  - The Geo Research step has a "Homepage allocation" card with neighbourhood and symptom dropdowns, the reasons, the flags and Save.
  - Page map columns "Assigned neighbourhoods" (`SOU-N07, SOU-N14`) and "Assigned symptoms" (`faq_B=SOU-S02`) win over the pass.
  - The decisions engine sends the real ALLOCATED ITEMS block: names, full profile and issue text, no URLs or IDs. The planning FAQ names allocated conservation areas. F-ALLOC is raised only when picks are missing, the allocation is stale, or there's no dossier.
  - Prompt approved and pushed (14 Oct).
  - Real dossier (14 Oct): `tests/fixtures/southampton-dossier.md` is the Southampton dossier saved 8 Oct, and it parses cleanly (20 neighbourhoods, 7 issues, 35 symptoms, 9 rules). Fixes it led to:
    - Conservation areas are now only taken from rules *named* as a conservation area or Article 4 direction. Before this, the Bassett Neighbourhood Plan wrongly marked Bassett Heath.
    - Inline "[SOU-N07]" tags are dropped instead of being turned into a doubled name.
    - Bold markdown is stripped.
  - Allocation prompt CORE (2) (14 Oct): neighbourhoods are chosen first, on their own merits (the most concrete detail for the trade: plot sizes, garden types, build era, ground), in parts of the city that don't share a border. Symptoms come second and only have to fit their question. The model also gets the dossier's Location Overview so it can judge borders.
  - Edens Edge real runs on CORE (2), 3 runs: Bassett Heath every time, plus Portswood Residents' Gardens (2 runs) or Old Woolston (1 run). faq_B = "The lawn stays soggy for days after rain." every time. Both second picks are conservation areas. Two real replies are saved in `tests/fixtures/allocation-replies/` and replayed by the fixture. Runs locally cost about 3p each; none are saved to the app yet.
  - Fixtures: 6 files, 130 checks, all pass. `southampton-allocation.js` runs on the real dossier and the real replies. `allocation-logic.js` runs on the synthetic `parser-drift-sample.md` (format drift and the retry path).
- Stage 6, v20 generation (14 Oct), built and run once for real:
  - CTA band is code only: the heading, one fixed niche line (`cta_band_line`, or `cta_band_line_no_response` when response_time is blank), then the D15 buttons. The line is in both niche entries, `.md` and JSON. The roofer line is Claude's wording ("Tell us what's wrong with your roof…") and needs checking.
  - Final CTA trust lines: `[CV: hours]`, then the rating line. No response time, because the CTA band is its only home.
  - `v20-generate.js`: CORE (20) as the system prompt, plus a cached client block. The client block has CLIENT VALUES (confirmed and filled only, years_trading worked out, no internal fields), NICHE ENTRY (from the JSON, placeholders filled) and CALIBRATION PACK. The message is the decisions block. With a failed gate there's no call.
  - `v20-parse.js`: reads the CORE (20) OUTPUT by label. P-MISSING, P-COUNT, P-TITLE (the given title is kept), P-HIDDEN, P-EMPTY, P-FORMAT and P-TRUNCATED become flags; MODEL_FLAGS are captured.
  - `v20-record.js`: the page record in brief §5 order, with FLAGS and VALIDATION ("not run (Stage 7)") at the top and meta holding the raw output, usage, stand-ins and the decisions block.
  - Route `POST /api/clients/:id/v20/homepage/generate`. Each run is saved as a `v20_page_record` row; `GET` returns the latest and the history. There's a "Generate v20 homepage" button in the v20 Decisions Preview modal.
  - Fixtures: 7 files, 160 checks, all pass (`v20-generation.js` adds 30).
  - First real Edens Edge run (local, 14 Oct): clean parse, no model flags, 64s, about 10p (14k cached client block, 3k message, 2.8k output). The output is saved in `tests/fixtures/v20-outputs/` as test data for Stage 7.
  - Rule breaks found in that run, for Stage 7 to catch:
    - word counts over range (all 4 Why points, 2 steps, 3 FAQ answers, the final CTA at 27 words)
    - "fixed price" appears 5 times
    - the content block repeats "100 jobs", which is already the trust line
    - "we work on … roads like Saxholm Way", which implies work on those streets
    - hyphenated compounds ("four-person", "mid-job", "slower-draining")
    - a literal company name in the services intro
    - "no surprises" (a stock phrase)
    - "property" and "site" (on the avoid list)
    - "north, east and west" for a coastal city
    - few contractions
    - the hero says "landscaper in Romsey, Southampton"
- Stage 7, validator and retries (14 Oct), built and run for real:
  - `validate-v20.js` runs on the page record. It has every brief §6 check (1a, 1b, 2, 2b, 3a, 3b, 3c, 4a to 4d, 5a, 6a, 6c, 7, 8, 9, N1 to N25; N16 is a watermark), plus these additions:
    - WORKED (BLOCK): "we work on [allocated street or area]".
    - NUM (BLOCK): a number or timescale not in the client values. Allocated research figures such as build dates are allowed. Catches "3 weeks", "two-week", "a day's work" and "in weeks".
    - SERVICE (FLAG): a service not among the client's GBP services, categories or ticked materials. It checks every model field, not just cards and FAQs, and uses the new niche `service_terms` slot (Claude's draft list, needs review).
    - HERO (BLOCK if the keyword is lost or the town is listed beside the city; otherwise FLAG).
    - CVLIT (BLOCK): a client value written out instead of its token.
    - TOKEN-UNIT (BLOCK): "[CV: travel_distance] miles" when the value is "20 miles".
    - CARD-LINK (BLOCK): a linked card without its own link.
    - TRUST-REPEAT and PROOF-REPEAT (FLAG): one home per proof.
    - Banned list additions: "range of materials", "start to finish", "needs" as a noun, sentences opening "As your/a [category]", and "the form below" (the homepage has no form).
  - `v20-retry.js` + `prompts/Field_Retry_CORE.md`: one call per failing field, at most 2 retries each, best version kept, every attempt logged in VALIDATION.retries. Replies that contain other fields' labels or fall far outside the field's range are rejected. Besides the brief's list, 1b, HERO, SERVICE, TRUST-REPEAT and PROOF-REPEAT flags also get a retry.
  - The client block now lists the client's CONFIRMED SERVICES by category. CORE (20) cards need them, and the first run invented services without them.
  - The page shows the validation summary and the issues; the stand-in watermark (N16) is on the record.
  - Fixtures: 8 files, 200 checks, all pass. `tests/fixtures/data/edens-edge-acceptance.js` holds the §7 inputs and Ethan's documented values.
  - Real Edens Edge run (local, 14 Oct), with Ethan's documented values (no insurance, no hours, owner section hidden), his real page map and his 78 GBP services: the first draft had 11 BLOCK and 52 FLAG; after 40 retry calls (31 kept) it had 0 BLOCK and 7 FLAG (long sentences, two FAQ first sentences, one repeat). It took about 110s and cost about 65p (5p first call, 60p retries). The output is saved in `tests/fixtures/v20-outputs/`. The first draft varies a lot between runs (10 to 12 BLOCK).
  - What the validator can't catch, seen in the real runs: working practices Ethan never gave ("we put the full cost in writing", "we'll set a schedule", "no subcontracting"), "Edwardian" for a 1908 to 1930 estate, and "compact terraced gardens in Portswood" (not in the research).
- Stage 7 second pass (14 Oct), after Brandon's review of the first run:
  - FAQ 4 is answered strictly from start_time. "Bigger projects are booked further ahead" appears only when the `bigger_projects_booked_ahead` practice is confirmed (niche faq_4 briefs updated).
  - `confirmed_practices` client value: a tick list on the Client Values screen, from `niche-library/practices.json` (17 practices, each with an onboarding question; 3 are roofer only). The onboarding prefill suggests ticks only where an answer clearly says yes. The client block lists the confirmed practices as the only ones the copy may state. New check PRACTICE (BLOCK).
  - Services in homeowner words: niche `service_words` maps GBP names to UK homeowner words (sod installation → turf laying, hardscaping → paving and walling, brick paver → block paving; desert and pool landscaping are never named). The model sees only these words. New checks RAW-GBP and CARD-COUNT (2 or 3 services per card).
  - Fixes: `coastal_city` client value and COAST check ("inland and along the coast"); the primary city's own location page is no longer linkable; the areas FAQ links the Locations Hub when there is one (HUB-LINK); RESEARCH-LANG ("investigated sites", "records show"…); REPEAT-IN (points repeated within a field, or a neighbourhood across content block paragraphs).
  - Gaps found on the way and fixed: INSURANCE (BLOCK: insurance mentioned with none on file; a run wrote "Public liability insurance covers…"), CARD-LOCAL (neighbourhoods in cards), LINK-TEXT (category link text must hold the category words), "the best chance" and "leading to" no longer read as claims, retries now carry every earlier problem so a later round can't bring one back, and typical_jobs prices now reach the client block (it read `from_price`; the screen saves `price`).
  - Real Edens Edge run (Ethan's values; family run and team of four left out pending Ethan): the first draft had 8 BLOCK and 64 FLAG; after 39 retries (32 kept) it had **0 BLOCK and 5 FLAG** (two cards naming 4 services, two long sentences, FAQ 4 at 27 words). About 100s and 60p. Saved as `tests/fixtures/v20-outputs/edens-edge-2026-10-14-stage7b-*`. After the run, COAST was extended to catch compass directions after the travel_distance token ("to the south and west" got through).
  - Fixtures: 9 files, 229 checks, all pass.
- Stage 8, downloads (14 Oct):
  - `v20-reader.js` builds the .md reader view: page order, headings, hidden sections left out, `[CV: key]` tokens resolved, links kept as Markdown, and review notes (validation result, flags, any token with no value) at the end.
  - The .json is the record itself. Both files start with "TEST: CONTAINS STAND-IN VALUES" when stand-ins are used.
  - Records now store `meta.client_values`, the values the tokens stood for when the page was written. Older records fall back to the client's current values.
  - Route `GET /api/clients/:id/v20/homepage/download?format=md|json[&id=]`. The two download buttons are in the v20 output view, and the Step 6 "Download all" zip adds `homepage__v20.json` and `.md` when the client has a v20 record.
  - N16: records carry `can_mark_done: false` with stand-ins. Copybot has no "Done" step yet; the WordPress push must refuse those records.
  - Fixtures: 10 files, 245 checks, all pass (`v20-reader.js` adds 16).
- Stage 9, acceptance test (14 Oct): **PASS.**
  - `npm run test:acceptance` (`tests/acceptance/edens-edge.js`) runs the brief §7 test live and end to end: allocation, decisions, generation, validation and retries, reader view. It uses the real Southampton dossier and Edens Edge's real page map and GBP sheets (`tests/fixtures/edens-edge-real/`, no personal data) with the §7 client values. It writes the DECISIONS block, raw model output, VALIDATION, reader view, record and table to `tests/acceptance/output/edens-edge/` (git-ignored).
  - Result: all 14 rows of the §7 table match. The live allocation picked Bassett Heath and Old Woolston, with faq_B "The lawn stays soggy for days after rain."; the first draft had 10 BLOCK and 60 FLAG, and after retries it had **0 BLOCK and 10 FLAG**. The record is watermarked (stand-ins). 42 calls, about 83 US cents, 140s. Saved as `tests/fixtures/v20-outputs/edens-edge-2026-10-14-acceptance-*`.
  - Two rows differ only in form: D13 lists the same four pages in GBP category order (Gardener is category 1), and the card headings use the page map's title case. Both follow the brief's own rules.
  - `tests/fixtures/edens-edge-acceptance-decisions.js` checks the same table offline (no API) on every `npm run test:fixtures`.
  - From reading the acceptance page, now caught by the validator: "neighbourhoods that keep us busy" (WORKED), "one person sees the job through" and "stays involved throughout" (PRACTICE), "a single day's work" (NUM), "slowly permeable" (RESEARCH-LANG). Not caught by any rule: FAQ 4 adding "That applies to every job" to the start time.
  - The page map and custom values parsers moved from server.js to `client-files.js` (unchanged), so tests and the WordPress push can use them.
  - Fixtures: 11 files, 263 checks, all pass.
- Stage 10, WordPress push, slice 1 (14 Oct): payload, safety checks, dry run against a fake WordPress.
  - Decisions (Brandon, 14 Oct): tokens are replaced on the WordPress side; the plugin's ACF JSON is the master copy, which Given imports; drafts and staging only until Brandon says otherwise. The plan is approved.
  - `wp/homepage-map.js`: record → ACF fields (the build spec's names) + SEO meta. Rank Math is the default; a Yoast adapter exists, and another plugin needs only a new adapter. The payload needs five fields the spec doesn't have yet: `home_trusted_show`, `home_reviews_show`, `home_services_more_line`, `home_cta_band_heading`/`_line` and `home_final_cta_body`. Not pushed: images (Given), buttons, the rating line and the final CTA trust lines (the site's Client Values). Tokens stay as `[CV: key]` for the site to resolve. `wp/markdown.js` turns links and paragraph breaks into HTML.
  - `wp/safety.js` refuses a push when:
    - a gate failed, the record isn't validated, or it has any BLOCK
    - it uses stand-in values (N16)
    - FLAGs remain without a person's "reviewed" tick
    - the homepage is published and the site isn't marked staging
  - `wp/dry-run.js` + `npm run wp:dry-run -- <record.json> [--reviewed] [--fake]`: finds the homepage (front page setting or slug), compares every field and repeater row, and says whether a push would be allowed and why not. It writes nothing. Application Passwords need https except on localhost.
  - `tests/fake-wp/fake-wp.js`: a fake site with the REST endpoints, Basic auth, ACF and meta, and a write counter. `tests/fixtures/wp-push.js` adds 29 checks; 12 fixtures pass.
  - Next slices: (2) the companion plugin: Client Values settings page, token resolver, REST access to the SEO meta, ACF JSON master including the five new fields; (3) the real push: snapshot, write, rollback, push log, and the model-judged claims review before any push; (4) Copybot screens: site address and Application Password (stored encrypted), "reviewed" tick, dry run / push / roll back buttons; (5) a first push to a staging site.
- Stage 10, slice 2, companion plugin (14 Oct): `wp-plugin/llp-copybot/` (install through MainWP; see its README).
  - It adds a Settings → Client Values page (one value per `[CV: key]`, plus map embed, Google review link, primary button label and rating line).
  - It replaces tokens in ACF fields and the Rank Math or Yoast title and description when a page is shown, but not in the editor or the REST API. A key with no value shows nothing, and years_trading is worked out from year_founded.
  - It adds the `[llp_cv key="…"]` shortcode and `llp_cv()` for the template.
  - It provides the REST routes `llp-copybot/v1/client-values` (GET/POST) and `/status`, and makes the SEO meta writable through `/wp/v2/pages`.
  - It loads the homepage ACF field groups from `acf-json/` (12 groups on the front page, REST on).
  - `wp/acf-schema.js` is the master copy of the field groups: build spec names, the five NEW fields, and template-only fields (images, reviews widget) marked as not pushed. `npm run wp:plugin-data` writes the plugin's `acf-json/` and `client-value-keys.json` from it and from `wp/client-values.js`. A fixture fails if they're out of date or don't match the payload.
  - The PHP runs under php-wasm (PHP 8.3, dev dependency `@php-wasm/node`), with minimal WordPress stand-ins (`tests/php/wp-stubs.php`). `tests/fixtures/wp-plugin-php.js` (19 checks): all 11 shared token cases match, plus the display filter (escaped in WYSIWYG, raw in the admin and REST), Rank Math and Yoast filters, the shortcode, sanitising, SEO meta and REST registration, the client-values and status routes, permissions, years_trading, and the settings page. The stand-ins are not WordPress: the first run inside real WordPress is still on Given's site.
  - The dry run now refuses when the plugin isn't active, ACF Pro is missing, the site's SEO plugin differs from the push setting, or a homepage field group is missing. It also refuses a record made before 14 Oct (no stored client values) unless current values are passed in. It now compares the Client Values too.
  - Fixtures: 13 files, 317 checks, all pass (`wp-plugin.js` adds 25).
  - Waiting on Given: a staging site, and whether she has already built homepage field groups (if so, they are deleted in favour of the plugin's). SEO plugin: Rank Math assumed until Brandon confirms.
- Stage 10, slice 3, the real push (14 Oct), against the fake WordPress:
  - `wp/push.js` runs the dry run's checks first, then requires a claims review for this exact version of the page; findings refuse the push until a person accepts them. Only then does it snapshot what the site holds (page fields, SEO meta, Client Values), write the page then the Client Values, read everything back to verify, and log the result. Refusals and failures are logged too. It never changes the page status.
  - `rollback()` writes a snapshot back exactly, clears Client Values the site didn't have before, verifies, logs, and refuses a snapshot from another site.
  - Snapshots and the log live in `wp/push-store.js` (memory for tests, files in `.wp-push/` for the command line; the database comes with the screens in slice 4).
  - `npm run wp:push -- <record.json> [--reviewed] [--accept-claims] [--fake]` and `--rollback <snapshotId>`. On `--fake` it shows the whole cycle.
  - The claims review is `wp/claims-review.js` + `prompts/Claims_Review_CORE.md` (CORE (2)), one Sonnet call at about 2p. It reads the copy against the client block (values, GBP categories, confirmed practices and services), the allocated research, and code-made decisions (headings, steps, FAQ questions with briefs, which count as given). Code keeps only findings whose quote is really in the named field and that the model didn't clear itself.
  - Real runs: Ethan's page had 3 findings ("100+ jobs across Southampton's varied gardens", "we will confirm availability when we come to look at the job", "we'll come out, take a look, and give you a price"); a second run found only the middle one, so the review varies between runs. The acceptance page had 6, including FAQ 4's "That applies to every job".
  - The client block now lists the GBP categories, so a category whose services all sit elsewhere (Ethan's lawn care) still counts as confirmed.
  - Fixtures: 15 files, 357 checks, all pass (`wp-push-write.js` adds 21).
- Site visits and claims retries (14 Oct, Brandon's decisions):
  - New practice `site_visit_before_quote` ("We visit before quoting"). Its patterns catch visits before a quote ("we'll come out, take a look and give you a price", "site visit", "visit your garden") but not maintenance visits. Step 2 is the visit step only when the practice is ticked. Without it, both niches use `step_2_no_visit`: "We Price the Job From Your Photos or a Call" (`.md` and JSON). The FAQ 5 brief says "Never describe a visit before the quote" without it.
  - Bug fixed: the roofer's emergency steps were never used; the emergency layout now uses them.
  - Claims findings now feed the per-field retries during generation: review, rewrite each field with findings (kept only if every quoted claim is gone and the field gained no BLOCK), review again, for up to 2 rounds. What's left is saved as `CLAIMS` at the top of the record (status `clear`, `needs acceptance` or `failed`). The push uses the record's own CLAIMS, so no second review is needed, and a person accepts only what's left. A failed review never loses the page, but the push refuses until it's run again. The reader view and the v20 output view show the result.
  - Bug fixed: model replies with text after the JSON broke the claims parser (and could break the allocation parser); `json-extract.js` now reads the first complete JSON object.
  - Real Edens Edge run: the first review found 4 claims and 2 were rewritten away. The 2 left are cautious calls about clay in the north of the city, which the research marks as inferred for individual gardens. The review still has false positives: it flagged "We can usually start within the same week" (the confirmed start_time) and the photo or call pricing wording. A person has the last word on anything left.
  - In the same run, 1 BLOCK survived both validation retries ("Get in touch" in the final CTA), so this page would be refused at push. Field editing in the screens, or a regenerate, is the way out.
- Docs: CLAUDE.md at repo root. The files the code reads (`prompts/`, `niche-library/`) are the only copies.

## Waiting on
- Brandon: on the deployed app, click Run allocation for Edens Edge on the Geo Research step. Expect Bassett Heath plus Portswood Residents' Gardens or Old Woolston; swap the second pick by hand if you prefer the other.
- Kestrel Ridge allocation: no Bournemouth dossier exists yet. Run geo research for Bournemouth first.
- Brandon: open "Preview v20 Decisions" for Edens Edge and Kestrel Ridge on the deployed app and check against the fixture previews. The real client data is only in the Railway database, so live previews can't run locally.
- Brandon: set primary_category = Landscaper for Edens Edge in Client Values (if not done yet).
- Brandon: add Locations Hub, About and Cost Guide rows to the page map template (Page Type spelled exactly as given), then re-upload the page maps for Edens Edge and Kestrel Ridge.

## Next
1. Check the live Stage 4 previews (expect 7 category cards and the final CTA H2 "Get a Free Quote From a Local Landscaper in Southampton").
2. Stage 5 finish: run the allocation in the app for Edens Edge; run Bournemouth geo research for Kestrel Ridge (the allocation then runs by itself).
3. WordPress push: slice 4 (Copybot screens: site connection, reviewed tick, claims review, dry run, push, roll back, push log in the database), then a staging push.
4. Run Perplexity v3 for landscaper (trade only).
5. Then: FAQ question bank + sorting step stages, humanizer decision, emergency and regulated group tests, category page.

## Open decisions
- Company name: Ethan's custom values say "Edens Edge landscaping" (lower case l); the brief's test uses "Edens Edge Landscaping". Brandon is checking the GBP.
- "Family run" (differentiator_2) and the team of four: Brandon is confirming with Ethan. Until then they're left out of his values.
- Review Claude's drafts: `niche-library/practices.json` (practices, labels and onboarding questions) and the landscaper and roofer `service_words` mappings. Add the practice questions to the onboarding form itself, which isn't in this repo.
- Which humanizer (tool or prompt) Brandon wants.
- Hero "doubt strip" under the buttons: yes or no.
- Separate Southampton location page: drop it (homepage is that page).
- Update the homepage structure doc with the changed rules (title keeps brand, H1 trade word allowed, area links = town names, no rating figure in logo row).
- Building regulations wording in the roofer entry: get a roofer to check.

## Don't
- Click "Generate All" on a v20 client until the other page types are migrated.
