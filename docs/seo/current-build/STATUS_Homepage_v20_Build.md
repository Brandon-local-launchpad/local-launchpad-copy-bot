# Homepage v20 build: where things stand (13 Oct 2026)

## Done
- Homepage CORE (20) prompt, Landscaper and Roofer niche entries, Claude Code brief: final, tested on paper (Edens Edge thin, Edens Edge with reviews, Kestrel Ridge roofer rich and thin).
- FAQ framework + Perplexity trade question bank prompt (v3). Roofer runs done twice.
- Claude Code: Stage 1 (niche JSON, CORE 19 pinned for old path), Stage 2 (client values storage), Stage 3 (Client Values screen), Stage 4 (decisions engine) built.

## Waiting on
- Claude Code: Stage 4 fixes (primary category services count, linkable pages list trimmed, model field names matching CORE 20 output format, Q5 brief wording, warning on Generate All). Then show Edens Edge + roofer previews.
- Brandon: set primary_category = Landscaper for Edens Edge in Client Values. Send Claude Code the latest Niche_Library_Roofer.md if not already done.

## Next
1. Check Stage 4 previews (expect 7 category cards, final CTA "Local Landscaper in Southampton").
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
