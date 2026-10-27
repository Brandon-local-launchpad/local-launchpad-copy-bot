# Location Page Copywriting Prompt — CORE (18)

Replaces Location_Page_Copywriting_Prompt_CORE (17), written for the old template. Built in the shape of Category CORE (16.1) against the Core 30 location template and the "Local Service Site Page Structure" doc (19 Oct 2026). Status: draft v18, 25 Oct 2026. Master copy lives in the Copybot repo; edit there, copy to the project.

---

## HOW THIS PROMPT IS USED

This prompt writes the **location page**: one per town in the service area, H1 such as "Landscaper Winchester" (the primary category plus the town). It is the hub for that town: it introduces the business in the town, links down to the town's location category pages (the cards) and the town service pages that exist, and lists the villages and neighbourhoods around the town. It is about that town only and never names another town.

For a client with a single GBP category there is no location category page; the location page is the only page for the town and its cards link to the town service pages instead. DECISIONS says which.

The page sits between the homepage (which links to it from the areas block) and the location category pages beneath it. Its job is local trust: the town's homes, ground and streets, and what they mean for the trade. It does not explain any one service; the service pages do that.

It writes for every business type. The four middle blocks take their brief from `[CV: business_type]` and the niche entry, as on the category page.

Copybot's code has already:

- chosen the H1, SEO title, meta description, every H2, the rating line, the trust line, the buttons and the breadcrumb;
- decided which sections show and which are HIDDEN (reviews hides until the client has 3 reviews);
- built the card list: one card per location category page for this town (multi-category client), or one per town service page (single-category client), with its URL and H1;
- chosen the block 4 H2 and 4 card titles with a brief and mechanism each (town-wide: across the trade, not one category), the block 5 H2 and 4 card titles, the 3 step titles and the 5 FAQ questions with their doubts, all by type;
- built the areas block: the villages and neighbourhoods around the town from the town dossier, unlinked;
- picked the town profile and up to 2 neighbourhoods from the town dossier for this page, and the symptoms assigned to it, none already taken by the town's category or service pages;
- listed the ideas the homepage and this town's other pages have already used.

You write the prose fields only. Everything in DECISIONS is fixed.

## WHAT YOU RECEIVE

**Cached client block**: CLIENT VALUES, NICHE ENTRY, CALIBRATION PACK, as CORE (16). TRADE FACTS are not sent to this page; it explains the town, not the job.

**Per page message**: PAGE (page type, URL, keyword, primary category, town), DECISIONS, LINKABLE PAGES, ALLOCATED ITEMS (town profile, neighbourhoods, symptoms, MECHANISMS USED, IDEAS USED ELSEWHERE), MODEL FIELDS.

---

## THE BUSINESS TYPE LAYER

As CORE (16). Block 4 on a location page is town-wide: for a type A trade, the problems homes in this town have across the categories; for type B, what regular visits in this town cover and when; for C, what the town's owners bring to sessions; for D, what moving in this town involves (access, parking, the housing stock). Each card title in DECISIONS carries a brief; follow it.

---

## THE FIELDS YOU WRITE

Word counts are hard ranges. Count before you finish.

### loc_hero_intro
Two sentences, under 50 words. Sentence 1: the keyword in a full natural sentence with `[CV: company_name]`, naming the town once ("a landscaper working across Winchester"). Sentence 2: the strongest confirmed proof the trust line and rating line have not used, in the owner's voice.

### loc_services_intro
30 to 60 words, 2 sentences. What the business does in this town and for whom. Names the town once. No links, no other towns.

### loc_services_cards
One `card_text` per card in DECISIONS, in order. Card names are given; never rewrite them.
- 40 to 55 words. What the customer in this town gets from this category (or service, single-category client), with 2 or 3 of the client's confirmed services inside it named in plain words. The link goes inside a sentence to the card's URL.
- **Link text**: the plain category or service name, never the destination H1, never with the town.
- No shared skeleton; no two cards open the same way. No neighbourhoods in cards.

### loc_content_body
200 to 250 words. 3 to 4 short paragraphs, then one closing line.
1. **The town.** The keyword in the first sentence, not opening on the company name. Two or three concrete details from the town profile (the housing stock and its era, the ground, the street pattern, the way gardens or roofs or drains run here) and what each means for the trade. This is the paragraph that makes the page about this town and not a template.
2. **The neighbourhoods.** The allocated neighbourhoods, one concrete detail each and what it means for the work. Never imply the business has worked there unless `[CV: areas_worked]` names the town.
3. **What they do here.** Inline links to 2 or 3 of the cards' pages (the town's location category pages, or town service pages), each with a reason. Never more than two links in a sentence. One confirmed differentiator not already in the hero.
4. **Closing line.** A soft push to the primary action. Never the phone number.

Never state the guarantee length or the insurance figure here.

### loc_block4
One `card_body` per card title, in order. 40 to 60 words, following each card's brief and mechanism. Town-wide, one mechanism each, none from MECHANISMS USED. The assigned symptoms supply the local cause where they fit; the rest come from the niche entry's fears for the type. One figure at most across all four.

### loc_cost_intro
30 to 50 words, 2 sentences. Why prices vary for this trade in this town, and what the customer can expect from a quote (from `[CV: quote_method]` only). No figures unless `[CV: price_list]` is set.

### loc_block5
One `card_body` per card title, in order. 30 to 45 words, following each brief. What moves the price for this trade here; where the town profile gives a reason (access on terraced streets, slopes, conservation controls, long gardens), use it once. No figures.

### loc_process_steps
One `step_body` per step title. 20 to 30 words, following the type's step brief. Step 2 follows `[CV: quote_method]` if set.

### loc_areas_intro
40 to 60 words. That the business covers this town and the villages and neighbourhoods around it (code places the list), and how it reaches them from its base (from the client values: "about twenty minutes from our base in Southampton" only if the client values give the distance or time). Names none of the villages. No links.

### loc_faq_items
One `faq_answer` per question, in order. 50 to 70 words, or 30 to 70 on one confirmed fact. Answer first in 15 words or fewer. The questions by type as CORE (16), with one town question in every set ("Do you cover [town]?" or "How soon can you get to [town]?") answered from the client values only. At least one answer links to a page in this town.

### loc_final_cta_body
One sentence, 15 to 25 words. What happens when they get in touch from this town. Never `[CV: phone]`. Never open with "Tell us".

### MODEL_FLAGS
One code per line or "none". F-ALLOC (no town profile, fewer than 2 neighbourhoods, or no symptom). F-BRIEF (a card without a brief).

---

## WHAT THIS PAGE MUST NOT REPEAT

IDEAS USED ELSEWHERE carries what the homepage and this town's category and service pages have already said. None of it is said again here. The town's location category pages will each take their own neighbourhoods; this page's are its own. Nothing on this page explains how a job is done: that belongs to the service pages, and a how-it's-done paragraph here is a fail.

## THE TOWN RULE

This page names its own town and no other, anywhere, including the base town, except in the areas intro where the base is allowed once as "our base in [base town]". A village or neighbourhood from the town dossier is not another town. The validator fails any other place name from the service area list.

## USING THE LOCAL RESEARCH

As CORE (16), rules 1 to 6, applied harder: this page lives on local detail, so every paragraph in the content block carries at least one town fact and says what it means for the trade. A town fact used as scenery fails rule 6. Never "dossier" or "research" in the copy.

---

## GLOBAL COPY RULES

Code appends `prompts/_shared_copy_rules.md` (claims, review themes, one home per proof, keyword placement, voice, links, names in prose, custom values). The location page adds:

- The primary category in running text is lower case and used as a person would say it ("our landscaping work in Winchester", "a landscaper in Winchester"), never the H1 label as a phrase outside the hero and content block sentence 1.
- The town name appears in the hero, the services intro, the content block and the areas intro, and at most twice elsewhere in the fields you write. Code puts it in the H1, title and H2s.

---

## OUTPUT

```
=== MODEL OUTPUT: location ===
loc_hero_intro:
loc_services_intro:
loc_services_cards:
  - card_name: <as given> | card_text:
loc_content_body:
loc_block4:
  - card_title: <as given> | card_body:
loc_cost_intro:
loc_block5:
  - card_title: <as given> | card_body:
loc_process_steps:
  - step_title: <as given> | step_body:
loc_areas_intro:
loc_faq_items:
  - faq_question: <as given> | faq_answer:
loc_final_cta_body:
MODEL_FLAGS:
```

Paragraph breaks inside loc_content_body are written as `\n\n` on the same line. A field marked HIDDEN in DECISIONS is written as HIDDEN.

Before you output, check the judgement calls (code checks the rest):
1. Every paragraph of the content block carries a town fact that says something about the work.
2. No sentence explains how a job is done.
3. The town is the only town on the page, bar the base in the areas intro.
4. Each block 4 card is a different mechanism, none from MECHANISMS USED.
5. The company name opens a sentence once at most, and only in the hero.
6. Every card opens differently.
7. Contractions used, and it sounds like the owner talking about the town.
