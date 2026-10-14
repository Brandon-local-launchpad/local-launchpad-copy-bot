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
- Docs: CLAUDE.md at repo root. The files the code reads (`prompts/`, `niche-library/`) are the only copies.

## Waiting on
- Brandon: open "Preview v20 Decisions" for Edens Edge and Kestrel Ridge on the deployed app and check against the fixture previews. The real client data is only in the Railway database, so live previews can't run locally.
- Brandon: set primary_category = Landscaper for Edens Edge in Client Values (if not done yet).
- Brandon: add Locations Hub, About and Cost Guide rows to the page map template (Page Type spelled exactly as given), then re-upload the page maps for Edens Edge and Kestrel Ridge.

## Next
1. Check the live Stage 4 previews (expect 7 category cards and the final CTA H2 "Get a Free Quote From a Local Landscaper in Southampton").
2. Stages 5 to 9: allocation pass, v20 generation, validator + retries, downloads, acceptance test.
3. Run Perplexity v3 for landscaper (trade only).
4. Then: FAQ question bank + sorting step stages, humanizer decision, emergency and regulated group tests, category page.

## Open decisions
- Which humanizer (tool or prompt) Brandon wants.
- Hero "doubt strip" under the buttons: yes or no.
- Separate Southampton location page: drop it (homepage is that page).
- Update the homepage structure doc with the changed rules (title keeps brand, H1 trade word allowed, area links = town names, no rating figure in logo row).
- Building regulations wording in the roofer entry: get a roofer to check.

## Don't
- Click "Generate All" on a v20 client until the other page types are migrated.
