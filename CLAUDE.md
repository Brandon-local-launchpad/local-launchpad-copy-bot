# Local Launchpad Copybot

Copybot writes website copy for UK tradespeople (Local Launchpad clients) using the Core 30 local SEO method, and is moving from GoHighLevel output (`{{custom_values.X}}`, .txt downloads) to pushing copy into WordPress.

## Read before you change anything

| If the task touches... | Read first |
|---|---|
| Anything about the business, clients, onboarding or Core 30 | `docs/seo/reference/Master_Context_Document.txt` (sections 11, 12, 15, 17 matter most for code) |
| Where the build is right now, and what's next | `docs/seo/current-build/STATUS_Homepage_v20_Build.md` |
| Homepage generation (v20) | `prompts/Homepage_Copywriting_Prompt_CORE (20).md`, `niche-library/Claude_Code_Brief_Homepage_v20.md` and `docs/seo/reference/Homepage_Template_v2_Core_30_Build_Spec.txt` |
| Niche data (trade words, steps, fears, FAQ slots) | `niche-library/Niche_Library_Landscaper.md`, `niche-library/Niche_Library_Roofer.md`. The code reads `niche-library/landscaper.json` and `roofer.json`, which are kept by hand. Any change to a niche `.md` must be made in its `.json` too, in the same commit. |
| Allocation pass (neighbourhoods and symptoms per page) | `prompts/Allocation_Pass_CORE.md`, `allocation.js` (checks and resolving), `geo-dossier.js` (dossier parser) |
| FAQs: choosing, assigning, answering, checking | `docs/seo/current-build/FAQ_Framework_and_Perplexity_Prompt.md` |
| Category/service custom values and the test client | `docs/seo/reference/Edens_Edge_Custom_Values_HOW_TO_USE.csv` |
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

## Decide yourself, don't ask me

- Housekeeping is yours: git, gitignore, commits, pushes, duplicate or stale files, paths, debug cleanup. Do it and tell me in one line.
- The file the code reads is the source of truth. Fix drift yourself, using the newest version.
- Fix bugs and mismatches with the docs without asking.
- Small dev-only tooling choices are yours: test helpers, dev dependencies, local runners (e.g. a PHP runner for the plugin tests). Say what you added in one line.
- Only stop and ask me about how the copy reads, client facts, pricing or business rules, STATUS "Open decisions", or anything that can't be undone.
- Update the STATUS doc whenever you finish a piece of work.
