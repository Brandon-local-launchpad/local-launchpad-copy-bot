# Service Page Copywriting Prompt — CORE (17)

Replaces Service_Page_Copywriting_Prompt_CORE (16), written for the old template. Built in the shape of Category CORE (16.1) against the Core 30 service template and the "Local Service Site Page Structure" doc (19 Oct 2026). Status: draft v17, 25 Oct 2026. Master copy lives in the Copybot repo; edit there, copy to the project.

---

## HOW THIS PROMPT IS USED

This one prompt writes two page types that share the service template:

- **Service page (base)**: one per service with a page, H1 such as "Lawn Mowing Southampton". Home is the base town; the copy covers the whole service area.
- **Town service page**: built only where "[service] [town]" has search volume, H1 such as "Stump Grinding Winchester". The copy is about that town only and never names another town. Its body links back to the base service page once ("see our full stump grinding service").

PAGE says which one this is (`page_scope: base` or `page_scope: town`). Everything that differs is decided by code and arrives in DECISIONS.

It also writes for every business type. The template has the same sections for a roofer, a cleaner, a dog trainer and a removals firm; what the middle blocks are *about* changes by type, and code decides that from `[CV: business_type]` and the niche entry. You write to the brief you are given.

This is the one page that explains the job. The TRADE FACTS rows for this service are the main material: what the job involves, the materials and methods, the timings, what goes wrong when it's skipped or done badly, and the rules that apply. Use them. Never write a source, a standard's number or a URL into the copy.

Copybot's code has already:

- chosen the H1 (the page keyword), SEO title, meta description, every H2, the rating line, the trust line, the buttons and the breadcrumb;
- decided which sections show and which are HIDDEN (reviews hides until the client has 3 reviews);
- chosen the What's Included H2 and the 6 to 8 tick item titles for this type, the block 4 H2 and 4 card titles with a brief each, the block 5 H2 and 4 card titles with a brief each, the 3 step titles in the type's variant, and the 5 FAQ questions with their doubts and answer briefs;
- built the areas block (base page: every town, linked to the town service page where one exists for this service, else that town's location category page; town page: the villages and neighbourhoods around the town, unlinked);
- built the More Services card list (base page: sibling base service pages in this category; town page: sibling town service pages in the same town, else the base pages), any count;
- picked the 2 neighbourhoods this page may use (base) or the town profile (town), the symptom assigned to this page, and the mechanisms already used;
- listed the ideas the homepage, the category page and sibling service pages have already used, so this page does not repeat them.

You write the prose fields only. Everything in DECISIONS is fixed. Do not change it, repeat it back, or write anything outside the fields listed in MODEL FIELDS.

## WHAT YOU RECEIVE

**Cached client block**:
- CLIENT VALUES: `[CV: key] = value`. A missing or blank key is unknown. `[CV: business_type]` is A, B, C or D with `emergency` and `A2` markers where they apply.
- NICHE ENTRY: trade words, step briefs, fears, service page block briefs and FAQ answer briefs for this niche, by business type.
- CALIBRATION PACK: how good copy reads in this trade. Terminology and standard only; never copy its examples.
- TRADE FACTS (the rows for this service): the job, materials and methods, timings, what goes wrong, the rules that apply, each row marked with whether it is a standard method of the trade or a rule.

**Per page message**, in this order:
1. PAGE: page type, page_scope, URL, keyword, service name, category name, town.
2. DECISIONS: every decision code has made for this page, including H2 wording, tick item titles and the block briefs.
3. LINKABLE PAGES: the only URLs you may link to, each with its page type and H1.
4. ALLOCATED ITEMS: the neighbourhoods or town profile, the assigned symptom, MECHANISMS USED and IDEAS USED ELSEWHERE.
5. MODEL FIELDS: the exact fields you must write.

---

## THE BUSINESS TYPE LAYER

| Block | A project trade | A + emergency | B recurring service | C pet service | D move |
|---|---|---|---|---|---|
| What's Included | the stages of the job, materials, finish | the call out: arrival, making safe, the fix, the report | what a visit covers and the frequency options | what a session covers and what is assessed | survey, packing, loading, delivery |
| Block 4 | Signs you need it: symptom, cause, what it leads to | When this can't wait: the situations that need a call today | Signs it's time for a visit | Is this right for your animal: the behaviours or needs it suits | What to expect on the day |
| Block 5 | What affects the price | What affects a call out cost | How visits are priced | Sessions and plans | What affects the quote |
| Steps | Quote, schedule, job | Call, arrive, fix | Book, first visit, round | Assessment, plan, sessions | Survey, pack, move |
| FAQ | Cost, how long it takes, guarantee, planning or rules, scope | Response time, cost, after hours, what gets fixed on the day, scope | Frequency, price per visit, access, what's included, seasonal timing | Fit, sessions, results, trust, cost | Date, quote, packing, insurance, access |

A seasonal niche swaps one block 4 card for the time of year the work matters and one FAQ for the when-to-book question. Each card title in DECISIONS carries a one-line brief; follow it.

---

## THE FIELDS YOU WRITE

Word counts are hard ranges. Count before you finish.

### svc_hero_intro
Two sentences, under 50 words. Sentence 1: the keyword in a full natural sentence with `[CV: company_name]`; base page ends with the wider area, town page names that town once. Sentence 2: the strongest confirmed proof the trust line and rating line have not used, in the owner's voice. Never a generic line about the service.

### svc_included_intro
30 to 50 words, 2 sentences. What this service is, for whom, and the result the customer is left with. No links.

### svc_included_items
One `item_text` per tick item title in DECISIONS, in order. Each 4 to 10 words, no full stop, a concrete part of the job from the trade facts (a stage, a material, a check, a finish). Never a benefit statement, never a proof, never a town. Items read as a list someone would check off.

### svc_content_body
250 to 300 words. 4 short paragraphs, then one closing line.
1. **Who and where.** The keyword in the first sentence, not opening on the company name. Base page: both allocated neighbourhoods, one concrete detail each and what it means for this service. Town page: two details from the town profile and what each means for this service. One confirmed differentiator not already in the hero.
2. **How the job is done.** From the trade facts: the stages in order, the materials or methods named only where they are standard to the trade or in `[CV: materials_methods]`, and one timing (how long it takes, when it can be done, how long before it can be used) where the rows give one. Plain words; any trade term explained in the same sentence.
3. **What goes wrong without it, or when it's done badly.** From the trade facts "what goes wrong" rows: one consequence, specific, never alarming. This is the paragraph that earns the page; make it concrete.
4. **Where they work.** Base page: inline links to 2 or 3 pages from LINKABLE PAGES, written as the town name or "[service_lower] in [town]", never the bare H1. Town page: no other towns; one sentence that this is the team's work in that town, and the one link back to the base service page ("see our full [service_lower] service").
5. **Closing line.** A soft push to the primary action. Never the phone number (the buttons carry it). Never open with the same words as the final CTA body.

Never state the guarantee length or the insurance figure here. The FAQ owns them.

### svc_block4
One `card_body` per card title in DECISIONS → block 4, in order. 40 to 60 words each, following each card's brief and mechanism. A: the sign, what's behind it, what it leads to if left. Emergency: the situation, why it can't wait, what happens when they call. B: what the customer sees, why it matters now, what the visit does. C: the behaviour or need, what's usually behind it, how the sessions approach it. D: the stage of the day, what the crew does, what the customer needs ready. Each card a different mechanism; none from MECHANISMS USED. One figure at most across all four. No source names, no standards numbers.

### svc_process_steps
One `step_body` per step title given. 20 to 30 words each, following the type's step brief. Step 2 follows `[CV: quote_method]` if set. Never restate the free quote or the start time.

### svc_cost_intro
30 to 50 words, 2 sentences. Why the price for this service varies, and what the customer can expect from a quote or booking (from `[CV: quote_method]` only). No figures unless `[CV: price_list]` has a figure for this service.

### svc_block5
One `card_body` per card title in DECISIONS → block 5, in order. 30 to 45 words each, following each card's brief. What moves the price and why, from the trade facts and niche entry. No figures, no "from £", no ranges; code adds the price line from `[CV: price_list]` when it exists.

### svc_areas_intro
40 to 60 words. Base page: where the business is based and how far it travels, and that this service goes everywhere they cover, naming no towns and listing no services. Town page: that the team does this service in that town and the villages around it, naming none (code places the list). No links.

### svc_faq_items
One `faq_answer` per question given, in order. 50 to 70 words, or 30 to 70 when the answer rests on one confirmed fact. Answer first: the first sentence answers directly in 15 words or fewer. Each question arrives with its doubt and, where the niche entry has one, an answer brief. Prices only from `[CV: price_list]`. Guarantee and insurance: the figure and what it covers, described never promised. A planning or rules question: from the trade facts rule rows only, stated as what usually applies ("front drives over five square metres usually need a permeable surface or drainage to a border"), never as legal advice, never with a standard's number. How-long questions: from the trade facts timing rows only. At least one answer links to a page on LINKABLE PAGES; a town page links only within its town or to base pages.

### svc_more_intro
20 to 40 words, one or two sentences, introducing the other services in this category. No links, no town names, no service names (the cards carry them).

### svc_final_cta_body
One sentence, 15 to 25 words. What happens when they get in touch about this service, from confirmed material. Never `[CV: phone]`. Never a proof that has its home elsewhere. Never open with "Tell us".

### MODEL_FLAGS
One code per line or "none". F-ALLOC (fewer than 2 neighbourhoods, no town profile, or no symptom). F-BRIEF (a card without a brief). F-FACTS-THIN (fewer than 3 trade facts rows for this service, so paragraphs 2 and 3 rest on general knowledge; say so).

---

## WHAT THIS PAGE MUST NOT REPEAT

IDEAS USED ELSEWHERE carries the technical points, local facts and proof wordings the homepage, the category page and sibling service pages have already made. None may be made again here. MECHANISMS USED carries the block 4 mechanisms of the category page and sibling service pages; choose others. A town page never reuses a base page's neighbourhoods. The What's Included items and the content block's paragraph 2 cover the same job: the items name the stages, the paragraph explains them; neither repeats the other's wording.

---

## USING THE TRADE FACTS

1. A row marked **standard method** may be named as how the job is done. A named manufacturer or product still needs `[CV: materials_methods]`.
2. A row marked **rule** (planning, building regulations, a British Standard, a licence) is written as what usually applies, in plain words, with "usually" or "in most cases", and never with the number of the standard or the name of the regulation. The FAQ is its home; the content block may carry one rule at most.
3. A **timing** row (how long the job takes, curing or rooting times, the season it suits) is written once on the page.
4. A **what goes wrong** row is written as a consequence the customer would notice, never as a scare, and never implies the reader's home has the problem.
5. Never write "according to", a source name, a URL or a reference code.

## USING THE LOCAL RESEARCH

As CORE (16): dated facts never "current"; inferred points cautious; one figure per paragraph; era claims gentle; locals' names for places; every local detail says what it means for this job, never scenery. Never "dossier" or "research" in the copy.

---

## GLOBAL COPY RULES

Identical to CORE (16): claims, review themes, one home per proof (the quote method and the price practice count as proofs: three mentions at most, in different words), keyword placement (hero sentence 1 and content block sentence 1 only), voice, links, names in prose, custom values. Code appends the shared block `prompts/_shared_copy_rules.md`; the service page adds:

- The service name in running text is lower case and used as a person would say it ("a stump grinding visit"); card headings and link text keep the exact name.
- Paragraph 2 of the content block may name a stage that a What's Included item also names, but not in the same words.
- Never promise a result the business cannot control (a lawn "will stay green", a fence "will last 20 years"). Say what the work does and what it protects against.

---

## OUTPUT

```
=== MODEL OUTPUT: service ===
svc_hero_intro:
svc_included_intro:
svc_included_items:
  - item_title: <as given> | item_text:
svc_content_body:
svc_block4:
  - card_title: <as given> | card_body:
svc_process_steps:
  - step_title: <as given> | step_body:
svc_cost_intro:
svc_block5:
  - card_title: <as given> | card_body:
svc_areas_intro:
svc_faq_items:
  - faq_question: <as given> | faq_answer:
svc_more_intro:
svc_final_cta_body:
MODEL_FLAGS:
```

Paragraph breaks inside svc_content_body are written as `\n\n` on the same line. A field marked HIDDEN in DECISIONS is written as HIDDEN.

Before you output, check the judgement calls (code checks the rest and sends back any field that fails):
1. Paragraph 3 of the content block names one concrete consequence from the trade facts.
2. Every What's Included item is a part of the job, not a benefit.
3. Each block 4 card is a different mechanism, none from MECHANISMS USED.
4. Rules are written as what usually applies, never as advice, never numbered.
5. A town page names no other town and links back to the base page once.
6. The company name opens a sentence once at most, and only in the hero.
7. Contractions used, and it sounds like the owner explaining the job.
