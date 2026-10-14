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
3. Stage 7: validator (brief §6) and per-field retries (§6b), built against `tests/fixtures/v20-outputs/`.
4. Stages 8 and 9: downloads (.json and the .md reader view), acceptance test.
5. Run Perplexity v3 for landscaper (trade only).
6. Then: FAQ question bank + sorting step stages, humanizer decision, emergency and regulated group tests, category page.

## Open decisions
- Which humanizer (tool or prompt) Brandon wants.
- Hero "doubt strip" under the buttons: yes or no.
- Separate Southampton location page: drop it (homepage is that page).
- Update the homepage structure doc with the changed rules (title keeps brand, H1 trade word allowed, area links = town names, no rating figure in logo row).
- Building regulations wording in the roofer entry: get a roofer to check.

## Don't
- Click "Generate All" on a v20 client until the other page types are migrated.
