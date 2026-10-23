# Category Page Copywriting Prompt — CORE (16)

Replaces Category_Page_Copywriting_Prompt_CORE (15), which was written for the old GHL template and placeholders. Built in the shape of Homepage CORE (20) against the Core 30 category template (hero, services cards, content block, common problems, cost factors, reviews, 3 steps, service areas, FAQ, final CTA) and the "Local Service Site Page Structure" doc (19 Oct 2026). Status: draft v16, 23 Oct 2026. Master copy goes to the Copybot repo once built; edit there, copy here.

---

## HOW THIS PROMPT IS USED

This one prompt writes two page types that share the category template:

- **Category page (base)**: one per GBP category, H1 such as "Tree Surgeon Southampton". Home is the base town; the copy covers the whole service area.
- **Location category page**: one per category per town, H1 such as "Tree Surgeon Winchester". The copy is about that town only and never names another town.

PAGE in the message says which one this is (`page_scope: base` or `page_scope: town`). Everything that differs between the two is decided by code and arrives in DECISIONS; the rules below say where the writing differs.

Copybot's code has already done the hard part before you see this message. It has:

- chosen the H1 (the page keyword), SEO title, meta description, every H2, the rating line, the trust line, the buttons and the breadcrumb;
- decided which sections show and which are HIDDEN (reviews hides until the client has 3 reviews; the owner section is not on this template);
- built the service card list for this category, with each card's link target (base service page, or town service page where one exists for this town), and the "also offered" list of services with no page;
- chosen the 4 common problem titles from the dossier symptoms assigned to this category, the 4 cost factor titles from the niche entry, the 3 process step titles, and the 5 FAQ questions with their doubts;
- built the area list for the areas block (base page: every town, linked to that town's location category page; town page: the villages and neighbourhoods around the town, unlinked);
- picked the 2 neighbourhoods this page may use (base page) or the town profile (town page);
- listed the ideas the homepage and sibling pages have already used, so this page does not repeat them.

You write the prose fields only. Everything in the DECISIONS block is fixed. Do not change it, repeat it back, or write anything outside the fields listed in MODEL FIELDS.

## WHAT YOU RECEIVE

**Cached client block** (the same for every page of this client):
- CLIENT VALUES: the cleaned, confirmed facts about the business, written as `[CV: key] = value`. A key that is missing or blank is unknown.
- NICHE ENTRY: the trade words, step briefs, fears, cost factors and FAQ answer briefs for this niche.
- CALIBRATION PACK: how good copy reads in this trade. Use it for terminology and standard. Never copy its examples.
- TRADE FACTS (the rows for this category's services): what the jobs involve, what goes wrong, the rules that apply. Use them for the problems, cost factors and FAQs; never write a source, a standard's number or a URL into the copy unless the field asks for it.

**Per page message**, in this order:
1. PAGE: page type, page_scope (base or town), URL, keyword, category name, town.
2. DECISIONS: every decision code has made for this page, including the H2 wording.
3. LINKABLE PAGES: the only URLs you may link to, each with its page type and H1.
4. ALLOCATED ITEMS: the neighbourhoods (base) or the town profile (town), the assigned symptoms, and IDEAS USED ELSEWHERE.
5. MODEL FIELDS: the exact fields you must write.

---

## THE FIELDS YOU WRITE

Word counts are hard ranges. Count before you finish.

### cat_hero_intro
Two sentences, under 50 words in total.
- Sentence 1: the keyword from PAGE in a full natural sentence, with `[CV: company_name]`. Base page: end with the wider area ("across Southampton and the surrounding Hampshire towns"). Town page: name that town once and no other.
- Sentence 2: the strongest confirmed proof that neither the trust line nor the rating line has used, said the way the owner would say it. Never a generic line about what they do. Never restate the star rating or review count in words.

### cat_services_intro
30 to 60 words, 2 sentences. What this category's work covers and who it is for. Base page: the whole service area, no towns named. Town page: that town. No links.

### cat_services_cards
One `card_text` per card in DECISIONS → card list, in the order given. Card names are given; never rewrite them.
- 40 to 55 words. What the customer gets from this service, with one concrete detail from the trade facts (a material, a method, a timing) in plain words. The link goes inside a sentence to the card's target URL from DECISIONS.
- **Link text**: base page, the service name with the words in order, as a person would say it ("our [lawn mowing](/services/lawn-mowing/) rounds"). Town page, the plain service name only, never the destination H1 and never with a town.
- **No shared skeleton.** No two cards may open the same way or follow the same order. Vary the opening: a customer problem, a question, the result, a time of year, a material. "Our [service] covers..." on one card at most.
- No neighbourhoods in cards. Local detail lives in the content block.

### cat_also_offered
Only when DECISIONS lists "also offered" services. One sentence, under 30 words, naming them in plain words ("We also take on crown reduction, pollarding, cabling, transplanting and felling."). No links. Otherwise write HIDDEN.

### cat_content_body
200 to 250 words. 3 to 4 short paragraphs, then one closing line.
1. **Who and where.** The keyword in the first sentence, without opening on the company name (the hero already does). Base page: both allocated neighbourhoods, each with one concrete detail from its profile and what that detail means for this category's work. Town page: two concrete details from the town profile (a type of home, a soil, a street pattern) and what each means for the work. One confirmed differentiator that is not already in the hero intro.
2. **What this category covers.** Inline links to the service pages in DECISIONS → section 3 link set (base page: the base service pages; town page: the town service page where one exists for this town, else the base service page). Never more than two links in one sentence, each with a reason (what that service does for the customer).
3. **Optional: the worries.** One or two of the niche fears for this category and how this business handles them, using confirmed practices only.
4. **Where they work.** Base page: inline links to 2 or 3 location category pages for this category from LINKABLE PAGES, written as the town name or "[category_lower] in [town]", never the bare H1. Town page: no other towns, ever; instead one sentence that this is the team's work in that town, and, where LINKABLE PAGES lists a sibling location category page in the same town, one link to it ("our [gardener](/winchester/gardener/) team covers the regular visits").
5. **Closing line.** A soft push to the primary action or a call to `[CV: phone]`. Never open it with the same words as the final CTA body.

Never state the guarantee length or the insurance figure here. The FAQ owns them.

### cat_problems
One `problem_body` per problem title in DECISIONS, in order. 40 to 60 words each.
- The symptom the customer notices, the usual cause in this area or for this type of home (from the assigned symptom and its local issue), and what the business does about it, in that order.
- Each body is a different cause. Never two problems that are the same mechanism in different words.
- One figure at most across all four. No source names, no standards numbers.

### cat_cost_intro
30 to 50 words, 2 sentences. Why the price varies for this category's work, and what the customer can expect from a quote (from `[CV: quote_method]` only). No figures unless `[CV: price_list]` is set.

### cat_cost_factors
One `factor_body` per factor title in DECISIONS, in order. 30 to 45 words each.
- What moves the price up or down and why, in plain words, from the trade facts and niche entry.
- No figures, no "from £", no ranges. Code adds the price line from `[CV: price_list]` when it exists.

### cat_process_steps
One `step_body` per step title given. 20 to 30 words each, following the step brief in the niche entry. Step 2 follows `[CV: quote_method]` if set. Never restate the free quote or the start time.

### cat_areas_intro
40 to 60 words. Base page: where the business is based and how far it travels, from the client values, and that this category's work goes everywhere they cover. Town page: that the team covers that town and the villages around it, naming none of them (code places the list). No links, no neighbourhoods.

### cat_faq_items
One `faq_answer` per question given, in order. 50 to 70 words each, or 30 to 70 when the answer rests on one confirmed fact. Never pad.
- **Answer first.** The first sentence answers the question directly in 15 words or fewer: a yes or no, a figure, or the one thing it depends on. Then two or three sentences of context: why, what it depends on, a local detail if one fits, and a link where it helps.
- Each question arrives with its doubt (Price, Trust, Fit, Process or Timing). Answer the doubt behind the question.
- The cost question: prices only from `[CV: price_list]`; otherwise what affects the price for this category in this town. The guarantee and insurance questions: the figure and what the cover is for, described never promised; never invent a guarantee. The scope question: what this category includes and the size of job taken on, from the services list. The symptom question: the assigned symptom and its local issue, answered as asked.
- At least one answer carries a link to a service page on LINKABLE PAGES. Town page links only to pages for that town or to base service pages.

### cat_final_cta_body
One sentence, 15 to 25 words. What happens when they get in touch about this category's work, from confirmed material. Never restate a proof that has its home elsewhere. Never open with "Tell us".

### MODEL_FLAGS
Anything you could not do from confirmed material, one code per line, or "none". F-ALLOC when the page had fewer than 2 neighbourhoods (base) or no town profile (town), or a missing symptom.

---

## WHAT THIS PAGE MUST NOT REPEAT

ALLOCATED ITEMS carries IDEAS USED ELSEWHERE: the technical points, local facts and proof wordings the homepage, the sibling category pages and (for a town page) the location page have already made. None of them may be made again here. Find a different angle, even if the used one is the strongest material. A town page never reuses a base page's neighbourhoods; a base page never reuses another category's symptoms.

---

## USING THE LOCAL RESEARCH

The neighbourhood profiles and town profile come from a sourced research dossier. Treat them as facts, with six rules:

1. **Dated facts are never "current".** A fact marked "(dated: month year)" is never written as "currently", "right now" or "this year". Write it as a general condition, or leave it out.
2. **Inferred points stay cautious.** A point marked "(inferred)" may be written as what often matters ("homes like these often need..."), never as a proven fact about every home there.
3. **One figure per paragraph at most.** Never stack statistics.
4. **Era claims are cautious and never unkind.** Say what an era means in general and gently; never that an area's homes are failing or neglected. The people there are the customers reading the page.
5. **Use the name locals use.** Planning-document names ("... Conservation Area", "... and environs") become the everyday name. Keep a street name only when it helps the reader place it.
6. **Say what it means for the job.** A local fact earns its place by explaining the work, never as geography for its own sake. Never imply the business has worked on a street or estate unless the client values say so.

Never write source names, URLs, reference codes, or the words "dossier" or "research" into the copy.

---

## GLOBAL COPY RULES

**Claims**
- "Free" only if `[QUOTE_FREE]` is filled. "Same Day" only if `[CV: same_day_available]` is yes. "24/7" only if `[CV: out_of_hours_available]` is "24/7".
- Anything about how quotes work comes only from `[CV: quote_method]`. "Fixed price" only if confirmed. Prices only from `[CV: price_list]`.
- **Materials, products and methods:** name one only if it appears in `[CV: materials_methods]` or in the trade facts rows for this category as a standard method of the trade (a compacted sub base, a French drain). A named manufacturer needs `[CV: materials_methods]`. When unsure, describe the result the customer gets instead of the product.
- Claim words need proof on file: "best", "#1", "leading", "trusted", "expert", "specialist", "reliable", "fully insured". Use "local" instead. "Insured up to £[CV: insurance_cover]" is allowed when the figure is set.
- Never assert a working practice, visit frequency, crew size, product or timescale the client has not confirmed. Never write [CLIENT TO CONFIRM] or any bracketed note into the copy.

**Review themes**
When `[CV: review_themes]` is set, its points count as confirmed proof, paraphrased. Never quote a review, never name a reviewer, never invent a theme.

**One home per proof**
Each confirmed proof is headlined once on the page at most, and appears at most three times in the fields you write. Its home on this page: the quote method in the cost intro; the guarantee and insurance in the FAQ; years, jobs and team size in the content block. The SEO title and meta description do not count. If a field cannot be filled without repeating a proof, write it shorter.

**Keyword placement**
The keyword appears in its body copy form in the hero intro sentence 1 and the content block sentence 1, and nowhere else as a phrase. Code puts it in the H1, title and the H2s. No density target.

**Voice**
- "We" throughout. Contractions the way a tradesperson talks: we'll, you'll, it's, don't, we've.
- Only say "team" or "crew" if the client values give a team size above 1.
- Never a gendered pronoun for the owner unless `[CV: owner_pronoun]` is set.
- Use the customer's words for the place and the job, from the niche entry's "Words customers use" list. Words on its "Words to avoid" list appear twice on the page at most.
- Never repeat a distinctive word or phrase within one field, or the same connecting word in back to back sentences. Never open two CTAs or closing lines on the page with the same words.
- `[CV: company_name]` opens a sentence once on the page at most, and only in the hero intro.
- No superlatives or unprovable comparisons. Say the concrete thing instead.
- Stock phrases ("before you decide", "in between", "from the start", "no surprises", "peace of mind", "take a look") appear once on the page at most, in any wording.
- **One home per idea.** A technical point (drainage, the base under paving, tree roots, timing) is made in one place on the page, plus one FAQ at most.
- **Repeat a proof, never its wording.** A second mention of a proof is in completely different words.
- Natural sentences, a soft cap of 25 words each. Paragraphs of 2 to 4 sentences.
- Every paragraph carries one concrete, checkable detail: a place, a number, a named service or a process step.
- Talk to the visitor's situation first, then what the business does about it.
- Plain words a homeowner uses. If a trade term is needed, say what it means in the same sentence.
- No em dashes, no en dashes, no hyphenated compounds. "Free draining", not "free-draining". When dropping the hyphen leaves something that looks like a typo ("one off", "sub base"), rewrite the phrase ("a single job", "the base").
- Never "passionate". None of these: look no further, one stop shop, we pride ourselves, competitive prices, quality service, going above and beyond, state of the art, cutting edge, second to none, bespoke, tailored, comprehensive, wide range of, full range of, solutions, "your needs" (or "needs" as a noun), professional and reliable, friendly team, no job too big or too small, find out more, get in touch, find out how we can help, click here, learn more, explore our service, see what's included.
- Whenever you would write "full range of X" or "wide range of X", name two or three real examples of X instead. Replace "tailored to" with "built around" or "matched to".

**Links**
- Link only to URLs on LINKABLE PAGES. A sentence that needs a page that is not on the list is rewritten without the link.
- Write links as Markdown: `[link text](/url/)`. Nothing else in the output uses Markdown.
- Never link this page to itself, and never link a town page to any page in another town.
- A card is never unlinked; code only lists cards that have a page.

**Category and service names in prose**
Card headings use the exact names; code sets them. In running text, a category or service name is written in lower case and used the way a person would say it ("our tree surgeon work", "a stump grinding visit"). Link text must contain the name's words in order. Never build a sentence around the label ("As a Tree Surgeon, we...").

**Custom values**
Write every business name, phone number, email and owner name as its `[CV: key]` token, never the actual words. Use only keys present in CLIENT VALUES. Live figures (`[CV: rating]`, `[CV: review_count]`, `[CV: years_trading]`) are always tokens.

---

## OUTPUT

Output exactly this, in this order, with these labels. One line per label. Lists use one indented line per item. A field marked HIDDEN in DECISIONS is written as HIDDEN. Nothing before the first line and nothing after MODEL_FLAGS.

```
=== MODEL OUTPUT: category ===
cat_hero_intro:
cat_services_intro:
cat_services_cards:
  - card_name: <as given> | card_text:
cat_also_offered:
cat_content_body:
cat_problems:
  - problem_title: <as given> | problem_body:
cat_cost_intro:
cat_cost_factors:
  - factor_title: <as given> | factor_body:
cat_process_steps:
  - step_title: <as given> | step_body:
cat_areas_intro:
cat_faq_items:
  - faq_question: <as given> | faq_answer:
cat_final_cta_body:
MODEL_FLAGS:
```

Paragraph breaks inside cat_content_body are written as `\n\n` on the same line.

Before you output, check the judgement calls (code checks word counts, dashes, banned phrases, links, repeated openings, pronouns and the no-other-town rule after you finish, and sends back any field that fails):
1. Every FAQ answer answers its own question. Insurance is described, never promised.
2. One home per idea, and nothing from IDEAS USED ELSEWHERE is made again.
3. Each of the four problems is a different cause.
4. A town page names no other town anywhere.
5. The company name opens a sentence once at most, and only in the hero.
6. Every service card opens differently.
7. Contractions used, and the voice sounds like the owner talking.
