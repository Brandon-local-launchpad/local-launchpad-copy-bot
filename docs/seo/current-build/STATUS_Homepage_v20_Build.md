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
  - Fixtures: 5 files, 103 checks, all pass. `allocation-sample.js` runs on a synthetic dossier with canned model replies.
- Docs: CLAUDE.md at repo root. The files the code reads (`prompts/`, `niche-library/`) are the only copies.

## Waiting on
- Brandon: approve `prompts/Allocation_Pass_CORE.md`. The Stage 5 commit stays unpushed until then.
- Brandon: the path to the real Southampton dossier. It wasn't in the repo, Downloads, Desktop or Documents. It replaces the synthetic sample as the parser fixture.
- Brandon: open "Preview v20 Decisions" for Edens Edge and Kestrel Ridge on the deployed app and check against the fixture previews. The real client data is only in the Railway database, so live previews can't run locally.
- Brandon: set primary_category = Landscaper for Edens Edge in Client Values (if not done yet).
- Brandon: add Locations Hub, About and Cost Guide rows to the page map template (Page Type spelled exactly as given), then re-upload the page maps for Edens Edge and Kestrel Ridge.

## Next
1. Check the live Stage 4 previews (expect 7 category cards and the final CTA H2 "Get a Free Quote From a Local Landscaper in Southampton").
2. Stage 5 finish: real dossier fixture, push, then run the allocation on Edens Edge (expect 2 large plot neighbourhoods such as Bassett and Woolston, plus a faq_B symptom) and Kestrel Ridge.
3. Stages 6 to 9: v20 generation, validator + retries, downloads, acceptance test.
4. Run Perplexity v3 for landscaper (trade only).
5. Then: FAQ question bank + sorting step stages, humanizer decision, emergency and regulated group tests, category page.

## Open decisions
- Which humanizer (tool or prompt) Brandon wants.
- Hero "doubt strip" under the buttons: yes or no.
- Separate Southampton location page: drop it (homepage is that page).
- Update the homepage structure doc with the changed rules (title keeps brand, H1 trade word allowed, area links = town names, no rating figure in logo row).
- Building regulations wording in the roofer entry: get a roofer to check.

## Don't
- Click "Generate All" on a v20 client until the other page types are migrated.
