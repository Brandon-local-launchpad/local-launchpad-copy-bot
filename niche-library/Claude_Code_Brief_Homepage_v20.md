# Claude Code Brief: New Homepage Structure in Copybot

Paste this whole file into Claude Code. Add these files to the repo first:
- `prompts/Homepage_Copywriting_Prompt_CORE (20).md`
- `niche-library/Niche_Library_Landscaper.md`

---

## What we are changing, and what we are not

The homepage moves to a new structure. Code makes every yes/no decision, counts every character and builds every heading. The model only writes prose fields. Copy stays inside Copybot as a downloadable page record. There is no WordPress push yet, but field names already match the WordPress (ACF) names so the push can be added later without changes.

**Scope: homepage only.** Category, Service, Location and Category location pages keep their current prompts and output until we move them one by one. Put the new homepage path behind a per page type switch (`structure_version: 'v20'` for homepage) so the old path still works for the other page types. Do not delete the old homepage code yet.

Do not change the geo research pipeline. Read dossiers exactly as the research step saves them.

Before you write code, read `server.js`, `db.js`, `validate.js` and the generate page. Then reply with a short plan listing the files you will touch, and wait for my go ahead.

---

## 1. Inputs

The run needs six inputs. If one is missing, or a gate fails (section 3), the run stops and shows only the gate flags. Nothing is guessed in place of a missing input.

### 1a. Client values (new screen)

Add a **Client Values** step after Step 1. It shows one editable table per client, saved as `client_assets` row `asset_type = 'client_values'` (JSON). Prefill it once from the onboarding form and custom values CSV, using a small Claude call for the free text answers. A human checks and edits it. Every field can be edited. Unusable answers become blank, never text ("few years back" → blank).

| Key | Prefill from | Notes |
|---|---|---|
| company_name | custom values company_name | must match the GBP business name exactly, including capitals and apostrophes. Add a "checked against GBP" tick; G-INPUT stops the run until it is ticked. Never change its casing in code |
| phone | company_phone_functional | |
| email | company_email | |
| address | company_address, else onboarding address | |
| gbp_address_type | onboarding (display address?) | storefront / service_area |
| hours | onboarding | blank if unusable |
| primary_category | custom values category_1 | editable; for the Edens Edge test set to **Landscaper** |
| year_founded | onboarding "When did you start trading" | 4 digit year or blank |
| jobs_completed | onboarding | number only, e.g. "100" |
| rating, review_count | blank until reviews exist | |
| guarantee_years, manufacturer_warranty | onboarding | blank if "no" |
| insurance_cover | onboarding | figure without £, e.g. "5m" |
| differentiator_1, differentiator_2 | onboarding "what makes you stand out" ticks | each has a **confirmed** checkbox, off by default. Title form, e.g. "Fixed Prices With No Hidden Costs" |
| differentiator_1_sentence, differentiator_2_sentence | written by whoever fills the screen | sentence form for the meta description, e.g. "Fixed prices with no hidden costs" |
| verified_logos | empty list | Ray fills: name, tier, register URL, caption. An empty list is a valid answer |
| free_quotes | onboarding | yes / no |
| quote_method, price_list, response_time | blank (not collected yet) | |
| same_day_available, out_of_hours_available | onboarding emergency answer | |
| start_time | onboarding | short phrase, e.g. "same week" |
| owner_name, owner_name_2, owner_qualification, owner_why, owner_promise | owner first name; rest blank | |
| owner_pronoun | blank | he / she / they, or blank. Blank means the model never uses a pronoun for the owner |
| owner_photo | no | yes / no |
| business_type | A | A, B, C, D or split |
| materials_methods | onboarding tick list from the niche entry | e.g. flat roofs: EPDM / GRP / torch on felt; fascias: uPVC / timber. The model may only name ticked items |
| guarantee_scope | onboarding | what the guarantee covers (e.g. "new roofs 10 years, repairs 2 years"). The guarantee FAQ uses this wording |
| team_size | onboarding "how many people in your team" | number; the model only says "team" when above 1 |
| typical_jobs | blank (not collected yet) | up to 3 rows: job, "from" price, typical duration. Feeds the cost and "how long" FAQs once collected |
| emergency_primary, handles_planning, finance_options, complaints_process, area_wide | blank | |
| travel_distance | onboarding max distance | |
| review_themes | blank until reviews exist | 2 or 3 recurring points customers make in Google reviews ("tidied up every day", "came in on budget"). Pulled by a Claude call over the client's reviews, then approved by the client before use. Never quotes or names |
| jobs_wanted | onboarding "jobs you'd like more of" | used by D13 |
| map_embed | custom values google_map_embed | |

A differentiator only counts when its **confirmed** box is ticked.

### 1b. Niche slot entry

Convert both `niche-library/Niche_Library_Landscaper.md` and `niche-library/Niche_Library_Roofer.md` into JSON (`landscaper.json`, `roofer.json`) using the same slot names, including the words to use and avoid, the materials list and the priority services. The trade picked in Step 1 selects the file. If any required slot is empty, gate G-NICHE stops the run. Other niches have no file yet; they fail G-NICHE, which is correct.

### 1c. GBP data

Primary category comes from client values `primary_category`. Secondary categories and their services come from the category CSVs, with exact spelling.

### 1d. Page Map

Read these columns when present: Page Type, Page Title, URL Slug, H1 (Ahrefs), Status, plus the new optional columns **Link status** (Live / Launching / Not built), **Assigned neighbourhoods**, **Assigned symptoms**, **Homepage cost guide URL**, **Entity Test result**.

Until the new columns exist:
- Link status = **Live** if Status is Live, otherwise **Launching**. Exception: any Location row whose dossier was flagged as an admin area (New Forest District) = **Not built**.
- The Locations hub, About page and cost guide count as linkable only if they have their own Page Map row.
- Homepage H1 = the homepage row's H1 (Ahrefs). For the Edens Edge test, override it to **Landscaper Southampton** (the current cell holds the old "Gardener Southampton | Edens Edge" format).

### 1e. Geo research

Use the active dossier for the primary city only.

### 1f. Onboarding answers

Used only to prefill client values (1a). The model never sees the raw form.

---

## 2. Allocation pass (homepage part)

Add one Claude call per client, run once research is complete and re-runnable with a button. It reads the primary city dossier (neighbourhood profiles, issues, symptoms), the client's `jobs_wanted` and the niche FAQ slots marked symptom based. It returns JSON:

```json
{
  "homepage": {
    "neighbourhoods": ["SOU-N07", "SOU-N14"],
    "symptoms": { "faq_B": "SOU-S02" },
    "conservation_areas": ["SOU-N10"],
    "reasons": "one line per pick"
  }
}
```

Rules for the call:
- Mark any allocated neighbourhood that is a conservation area. Dossiers don't have a field for this, so the call infers it from the profile text and the RULES & COUNCIL section (e.g. a conservation area appraisal or Article 4 direction that applies to it). Code passes it to the planning FAQ, which must name it.
- Exactly 2 neighbourhoods, from different parts of the city, each with a concrete sourced detail in its profile. Prefer neighbourhoods that fit the client's `jobs_wanted`.
- Never pick a neighbourhood whose profile is mostly commercial or industrial land.
- One symptom per symptom based FAQ slot. It must be non urgent unless the niche is an emergency niche, and its linked issue must be tagged with a category this client actually has.
- Fewer than 2 usable neighbourhoods: return what exists and flag F-ALLOC.

Save the result to the DB. Show it on the Geo Research step as two dropdowns plus symptom dropdowns, so a human can swap a pick without re-running. If the Page Map's Assigned columns are filled, they win over the allocation pass.

This pass will later grow to cover category clusters (each cluster gets neighbourhoods unique within it and never the homepage's). Build the JSON so more page keys can be added.

---

## 3. Code decisions

Code works these out before the model writes, and passes the results in the DECISIONS block. Each is a rule on the inputs, so it gives the same answer every run.

Placeholders code resolves first: [KW_PHRASE] = homepage H1. [CATEGORY] = primary category. [CITY] = primary city. [TRADE], [TRADE_LOWER], [TRADE_PERSON], [TRADE_PERSON_PLURAL], [CUSTOMER_TYPE], [UNIT_OF_WORK], [PRIMARY_ACTION] = niche slots. [AREA_WIDE] = client value area_wide. [QUOTE_FREE] = "Free" if free_quotes = yes, otherwise blank (also remove the space after it). [QUOTE_FREE_LOWER] = "free" or blank.

**Gates (stop the run):** G-H1 homepage H1 blank; G-MAP map_embed blank; G-NICHE niche entry incomplete; G-DATA fewer than 2 Why choose us points can be built (D10); G-INPUT company_name or phone blank.
For the test, map_embed may be blank: add a per client "test mode" toggle that turns G-MAP into a flag instead. Off by default.

**D1 [YEARS_TRADING]:** this year minus year_founded. Blank if the year is blank.

**D2 H1:** [KW_PHRASE] exactly, nothing added. 60 characters max. Must contain the city, plus either the primary category or the niche trade_person word ("Roofer Bournemouth" passes for a "Roofing contractor" GBP). Validator check 4c changes the same way.

**D3 SEO title:** keyword first, 60 characters max. [TITLE_MODIFIER] is the first true option:
1. emergency layout on and out_of_hours_available = "24/7" → "Available 24/7"
2. years trading 5+ → "Established [year_founded]"
3. guarantee_years 5+ → "[guarantee_years] Year Guarantee"
4. rating 4.8+ and review_count 20+ → "Rated [rating]★"

With a modifier: "[KW_PHRASE] | [TITLE_MODIFIER] | [company_name]". Without one: "[KW_PHRASE] | [company_name]". The modifier never repeats a word from the keyword or the trade words. Over 60 with a modifier: **drop the modifier, keep the company name** ("[KW_PHRASE] | [company_name]"). The brand matches the GBP name and the meta already carries the proof. This changes the build doc's rule. Over 60 with no modifier: flag F-LEN-TITLE. "Local" is never used in the title.

**D4 Meta description:** "[KW_PHRASE] from [company_name]. [META_PROOF]. [meta_cta]", 155 characters max. META_PROOF is the first true option, skipping the one used in the title: "Rated [rating]★ by local [CUSTOMER_TYPE]" (4.8+ and 20+ reviews); "[guarantee_years] year workmanship guarantee"; "Established in [year_founded]"; the confirmed differentiator_1 text. None true: drop it and its full stop. Over 155: try the next option, then drop it. Still over: F-LEN-META.

**D5 Hero trust line:** first true option: "Established in [year_founded]" (5+ years); "[jobs_completed]+ [UNIT_OF_WORK] Completed" (never with a place); the first confirmed proof in the niche cover_chain. None: no trust line.

**D6 Rating line:** review_count 0 or blank → none. Rating 4.5+ → "★★★★★ [rating] from [review_count]+ Google Reviews" (stars drawn to match the rating). Below 4.5 → "[review_count]+ Google Reviews". The template also hides it under 20 reviews.

**D7 Section visibility:**
- Code placed proofs: the rating figure shows in the hero rating line, the Reviews heading and the final CTA. The Google logo in Trusted & Rated By links to the profile with the caption "Google reviews", **no figure**. The response time shows in the CTA band only, not again in the final CTA trust lines.
- 2 Trusted & Rated By: at least one logo qualifies (Google logo needs review_count 5+; other logos must be in verified_logos). If verified_logos has never been saved: hidden and flag F-LOGOS.
- 5 Why choose us: at least 1 point.
- 6 Reviews: review_count 3+.
- 8 CTA band: always on (the open decision is settled: keep it).
- 9 Meet the owner: owner_name set, owner_photo = yes, and at least two of owner_qualification, owner_why, owner_promise.

**D8 Formula headings** (with fallbacks when [AREA_WIDE] is blank):
- Content block: "Local [TRADE] Serving [CITY] & [AREA_WIDE]" / "Local [TRADE] in [CITY] and Nearby Towns"
- Services: "Our [TRADE] Services in [CITY]"
- Why: "Why [CITY] [CUSTOMER_TYPE] Choose [company_name]", adding " for [TRADE]" if the company name holds no trade word
- Reviews: 20+ → "[review_count]+ Google Reviews From [CITY] [CUSTOMER_TYPE]"; 3 to 19 → "What [CITY] [CUSTOMER_TYPE] Say About Us". No question mark.
- Process: niche process_h2. CTA band: "Ready to talk to a local [TRADE_PERSON]?"
- Owner: "Meet [owner_name], the [TRADE_PERSON] Behind [company_name]" (two owners: "Meet [owner_name] & [owner_name_2], the [TRADE_PERSON_PLURAL] Behind [company_name]"). No full stop.
- Areas: "[TRADE] Services Across [CITY] & [AREA_WIDE]" / "Where Our [TRADE_PERSON_PLURAL] Work Around [CITY]"
- FAQ: "Your [TRADE] Questions Answered". Final CTA: niche final_h2.
Capitalise [TRADE_PERSON] and [TRADE_PERSON_PLURAL] in headings.

**Card headings:** the exact GBP category name, written in title case ("Lawn Care Service", "Paving Contractor"), so every heading matches in style while keeping the GBP wording for consistency signal 4.

**D9 Service card list:** with a category layer, one card per GBP secondary category that has a category page, plus one per service in the primary category. Without a category layer, one card per GBP service. Linkable pages first, then the rest, except that services the niche entry marks as **priority** (e.g. Emergency Roof Repair for roofers) are placed before all other cards. Cards 9 and up move to the "We also offer" line. Each card is marked linked (with URL and H1) or unlinked (Entity Test Fail or Not built). The card name is the exact GBP name.

**D10 Why choose us points**, in order, each built only from confirmed values:
1. Track record: "[YEARS_TRADING]+ Years in [AREA_WIDE]" (or "[YEARS_TRADING]+ Years Trading" when area_wide is blank) when 5+ years; else "[jobs_completed]+ [UNIT_OF_WORK] Completed"; else none.
2. Cover: the first confirmed proof in the niche cover_chain, e.g. "[guarantee_years] Year Workmanship Guarantee", "Insured up to £[insurance_cover]"; else none.
3. differentiator_1 as a short promise title, if confirmed.
4. The first approved review theme that doesn't repeat points 1 to 3 (a theme like "finished on the price quoted" duplicates fixed pricing, so skip it; it can still be passed as evidence for that point). With no usable review theme, differentiator_2 if confirmed.
When point 1's or point 2's proof is already the trust line, use the niche why_titles_alt title instead.

**D11 FAQ questions.** Every fallback takes the **next unused** fallback slot in order (faq_C, then faq_D, then faq_E if the niche has one), so no question can appear twice. If none are left, that question is dropped and the FAQ runs short.

**D11 detail:** Q1 "How much does [TRADE_LOWER] cost in [CITY]?" (fixed). Q2 faq_2 if insurance_cover is set; faq_2_fallback if complaints_process is set; else the next unused fallback. Q3 faq_3 when a guarantee or manufacturer warranty is confirmed. Otherwise: type A uses the niche's faq_3_none ("What happens if something isn't right after the job?"); types B, C and D use the next unused of faq_C, faq_D, else drop Q3. Q4 faq_4 if start_time is set, else the next unused fallback. Q5 faq_5_free if [QUOTE_FREE] is filled, else faq_5_not_free. Q6 "Which areas do you cover?" (fixed). Q7 faq_A. Q8 faq_B. Q9 faq_planning only when big_ticket = yes and handles_planning is confirmed. Pass each question with its niche answer brief, its symptom flag and its **doubt tag** (Price, Trust, Fit, Process or Timing; Q1 cost is Price, Q6 areas is Fit).

**D12 Area list:** every GBP service area. Primary city first, as plain text. Then towns with a linkable Location page, linked, with the **town name** as link text (the H2 above the list already carries the trade word; repeating "Landscaper" on every link reads as keyword stuffing). Then the rest as plain text. Alphabetical within each group. Display each area by its everyday name: strip "District", "Borough", "Council" and similar admin suffixes ("New Forest District" → "New Forest"). The validator's area check (9) matches on the GBP area either way.

**D13 Content block link set:** up to 4 linkable category pages (or service pages with no category layer). Categories matching `jobs_wanted` first, then GBP order.

**D14 Hero intro town:** one town from the Page Map Location rows, preferring one with a linkable Location page. Pick the first by Page Map order that is linkable.

**D15 Button order:** emergency layout on → Call first, then [PRIMARY_ACTION]. Otherwise [PRIMARY_ACTION] first.

**D16 Thin page check:** count these: section 2 hidden; no trust line and no rating line; section 5 under 3 points; section 6 hidden; section 9 hidden. Two or more → F-THIN.

Emergency layout is on only when the niche emergency_niche = yes and emergency_primary = yes. Big ticket switch on when the niche big_ticket = yes.

---

## 4. The model call

Use the same model Copybot uses today, with `prompts/Homepage_Copywriting_Prompt_CORE (20).md` as the system prompt.

**Cached client block** (prompt cached, the same for every page of the client): CLIENT VALUES as `[CV: key] = value` lines (confirmed values only; unconfirmed differentiators left out), the NICHE ENTRY with placeholders resolved, and the CALIBRATION PACK for the trade, loaded the same way Copybot loads it today (Step 1 already shows "Calibration pack: ..."). If a trade has no pack, send none.

**Per page message**, five blocks in this order:
1. `PAGE:` homepage, slug /, keyword.
2. `DECISIONS:` every D1 to D16 result: H1, title, meta, trust line, rating line, section visibility (shown / HIDDEN), every heading, the D13 link set, the D14 town, the card list (name, linked or not, URL, H1), the Why choose us point titles with the matching niche fear, the step titles with their briefs, the FAQ questions with their briefs, whether to expand the content block, and the "We also offer" items.
3. `LINKABLE PAGES:` every page with Link status Live or Launching: page type, URL, H1.
4. `ALLOCATED ITEMS:` the 2 neighbourhoods (name plus the full profile text, including any "(inferred)" and "(dated: ...)" markers), and each assigned symptom with its quote and the full text of its linked issue. Remove the source URLs and the reference IDs from this text before sending.
5. `MODEL FIELDS:` the list of fields the model must write, with HIDDEN ones marked.

## 5. Parsing and the page record

Parse the model output by its labels (format in the prompt's OUTPUT section). List items are `key: value | key: value` lines. `\n\n` inside home_content_block_body is a paragraph break. A field written as HIDDEN is empty.

Code then merges the model fields with the CODE, NICHE and CV fields into one **page record** in this order: SEO title, meta description, then every section top to bottom, using these field names: home_hero_h1, home_hero_trust_line, home_hero_intro, home_hero_rating_line, buttons, home_trusted_logos, home_content_block_h2, home_content_block_body, home_services_h2, home_services_intro, cards (card_name, card_text, card_url), home_services_more_line, home_why_h2, points (point_title, point_body), home_reviews_h2, home_process_h2, steps (step_title, step_body), cta band lines, home_owner_show, home_owner_h2, home_owner_body, home_areas_h2, home_areas_intro, home_areas_links, home_faq_h2, faq items (faq_question, faq_answer), home_final_cta_h2, home_final_cta_body, final CTA trust lines. Hidden sections are marked false or HIDDEN.

At the top of the record: **FLAGS** (every gate, code and model flag) and **VALIDATION** (BLOCK and FLAG results).

Custom values stay as `[CV: key]` tokens in the record. Links stay as Markdown links.

**Downloads:** the record as `.json`, plus a readable `.md` "reader view" with tokens resolved to the client's values, so Brandon can read the page as a visitor would. Add both to the existing download buttons and to "Download all".

## 6. Validator changes (homepage v20 only)

Run on MODEL fields only, unless stated.

Keep: 1a dashes (BLOCK), 1b hyphenated compounds (FLAG; ignore URLs and `[CV: key]` tokens), 2 / 2a / 2b banned phrases, 4a to 4d H1 checks (4b now FLAG over 60 characters), 5a, 6a, 7 and 8 as checks on code's own title and meta output, 9 against all GBP areas, 10.
Change: 3a [CLIENT TO CONFIRM] anywhere → BLOCK. 3b also BLOCK any "[" that is not a `[CV: key]` token or a Markdown link. 3c reads `[CV: key]` tokens; BLOCK any key not populated for this client. 5b both sections use `[CV: review_count]`. 6b replaced by N1. 6c homepage: at least 1 FAQ answer with a link.
New:
- N1 BLOCK: every linkable category page (or service page with no category layer) is linked in the content block, a card, or the "We also offer" line.
- N2 BLOCK: every link URL is on LINKABLE PAGES.
- N3 BLOCK: the title modifier contains a word from the keyword or the trade words.
- N4 FLAG: a proof token (`[CV: insurance_cover]`, `[CV: jobs_completed]`, `[CV: years_trading]`, `[CV: guarantee_years]`) appears more than twice in MODEL fields.
- 2a change: flag "needs" only as a noun ("your needs", "needs of"), not the verb.
- N5 BLOCK: a claim word ("free", "same day", "24/7", "best", "#1", "leading", "trusted", "expert", "specialist", "reliable", "fully insured", "fixed price") appears without its value set or confirmed.
- N6 BLOCK: a field marked HIDDEN has content, or a shown field is empty.
- N7 FLAG: a sentence over 25 words, or a MODEL field outside its word range: hero intro under 50; content block 200 to 250 (300 when expanding); services intro 30 to 60; card text 40 to 55; point body 25 to 40; step body 20 to 30; owner body 60 to 80; areas intro 40 to 60; FAQ answer 30 to 70; final CTA body 15 to 25 and one sentence. Count words with Markdown links reduced to their link text and each `[CV: key]` as one word.
- N8 BLOCK: a sentence matches one in the niche do_not_reuse list.
- N9 FLAG: "currently", "at the moment", "right now" or "this year" anywhere in MODEL fields (dated research facts must never be presented as current).
- N11 FLAG: insurance overpromise. Any of "never by you", "fully covered", "pays for everything", "won't cost you", "nothing to pay" in MODEL fields.
- N12 FLAG: "team" or "crew" in MODEL fields when team_size is blank or 1.
- N13 FLAG: two or more service cards start with the same first three words, or "As a" followed by a category name anywhere.
- N15 FLAG: "he", "him", "himself", "she", "her" or "herself" in MODEL fields when owner_pronoun is blank.
- N16 (stand-in values; generation still runs): every client value has a **stand-in** tick for test or placeholder data. A page record built with any stand-in value is watermarked "TEST: CONTAINS STAND-IN VALUES" at the top of both downloads and cannot be marked Done. This stops made-up test details reaching a live site.
- N14 FLAG: any word from the niche's "Words to avoid" list more than twice across MODEL fields, or two closing lines or CTA bodies starting with the same two words.
- N17 FLAG: `[CV: company_name]` at the start of a sentence more than once, or anywhere outside home_hero_intro.
- N18 FLAG: back to back sentences starting with the same word, or the same connector ("also", "so", "then") in back to back sentences.
- N19 FLAG: superlatives and unprovable comparisons: "more than almost anything", "the most", "the only", "unbeatable", "like no other".
- N20 FLAG: the rating or review count restated in words in any MODEL field when the rating line shows.
- N21 FLAG: any five word sequence (ignoring case and punctuation, and ignoring `[CV: key]` tokens and link text) that appears in two different MODEL fields. Goes through the automatic retry, which rewrites the later field.
- N22 FLAG: a material, product, manufacturer or method from the niche's materials list appears in MODEL fields as something **the business does or supplies** ("we lay", "we fit", "we install", "our ... service uses") but isn't ticked in materials_methods. Don't flag materials that describe the customer's existing home or general information ("houses here still carry clay plain tiles", "swapping slate for concrete tile may need consent"). Goes through the automatic retry.
- N23 FLAG: any stock phrase from the prompt's list ("before you decide", "in between", "from the start", "no surprises", "peace of mind", "take a look") more than once across MODEL fields.
- N24 FLAG: an FAQ answer whose first sentence is over 15 words (the answer must come first, in one short line).
- N25 FLAG: the FAQ set doesn't cover all five doubts (Price, Trust, Fit, Process, Timing), judged from the doubt tags code assigned.
- N10 BLOCK: a dossier reference ID (pattern `[A-Z]{2,4}-[NISR]\d{2}`) or a URL that is not a Markdown link appears in MODEL fields.

## 6b. Automatic retry on failed fields

Models are poor at counting and at spotting their own repetition, so code is the real gate. After validation, for any field with a BLOCK, or a FLAG from N7, N13, N14, N15, N17, N18, N19, N21, N22, N23 or N24, send one follow up call that regenerates **only that field**. Pass the same five blocks, the field's current text, the other fields' text (so it doesn't create a new repeat), and the failure in plain words, e.g. "card 4 opens like card 2: rewrite the opening" or "content block is 182 words: it must be 200 to 250". Re-validate. At most 2 retries per field; after that, keep the best version and leave the flag for a human. Log each retry in the page record so we can see which rules the model keeps missing.

## 7. Acceptance test: Edens Edge

Turn on test mode for the Edens Edge test client (match the name it has in the database). Set company_name to "Edens Edge Landscaping" (check the exact GBP spelling and apostrophe before any live run) and tick "checked against GBP". Tick the stand-in box on owner_why, owner_promise, owner_photo and hours. Set these client values for the test: primary_category = Landscaper; differentiator_1 = "Fixed Prices With No Hidden Costs" (confirmed); differentiator_2 = "Family Run and Independent" (confirmed); jobs_completed = 100; insurance_cover = 5m; free_quotes = yes; start_time = same week; year_founded blank; reviews blank; verified_logos = [] (saved); owner_photo = yes; owner_why and owner_promise filled with any test text; hours = "Monday to Saturday, 7am to 6pm"; travel_distance = 20 miles; business_type = A; team_size = 4. Override the homepage H1 to "Landscaper Southampton".

Code should produce exactly these decisions:

| Decision | Expected |
|---|---|
| Title | Landscaper Southampton \| Edens Edge Landscaping (47 characters; no proof qualifies) |
| Meta | Landscaper Southampton from Edens Edge Landscaping. Fixed prices with no hidden costs. Get your free quote today. |
| Trust line | 100+ Jobs Completed |
| Rating line | none |
| Hidden | section 2 (no logos), section 6 (no reviews) |
| Content H2 | Local Landscaping in Southampton and Nearby Towns |
| D13 link set | Landscape Gardener, Landscape Designer, Gardener, Lawn care service |
| D14 town | Romsey |
| Cards | 7, all linked: Gardener, Landscape Gardener, Landscape Designer, Lawn care service, Tree service, Paving contractor, Deck builder |
| Why points | Local Experience Behind Every Job (alt title, because jobs is the trust line); Insured up to £5m; Fixed Prices With No Hidden Costs; Family Run and Independent |
| FAQ | 8 questions: cost, insured, "What happens if something isn't right after the job?" (no guarantee, so faq_3_none), start, free quote, areas, how long a project takes, why water sits on a patio or lawn (symptom based) |
| Area list | Southampton, then 12 linked town names A to Z (Ampfield ... Winchester, no trade word), then New Forest as plain text |
| Allocation | 2 primary city neighbourhoods; I'd expect Bassett Heath and Old Woolston or similar large plot areas |
| Flags | F-THIN (sections 2 and 6 hidden), F-REVIEWS, F-MAP-TEST (map gate bypassed in test mode) |

Note on the meta: the differentiator text should read naturally in a sentence. Store differentiator_1 with a sentence form too (e.g. "Fixed prices with no hidden costs") and use that in the meta.

When it runs, show me the DECISIONS block, the raw model output, the VALIDATION results and the reader view download.
