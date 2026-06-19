# Homepage Copywriting Prompt — CORE (All Trades)

Use this prompt inside a Claude project/chat that contains the following knowledge files:

- Client onboarding form
- Geographical Research & Context doc
- GHL custom values document/google sheet (screenshots)
- The calibration pack for this client's trade (e.g. Landscaper/Gardener Homepage Calibration Pack)

---

## GHL CUSTOM VALUES

The GHL custom values document is included in the project knowledge. It contains every placeholder key for this client — business name, phone, address, service areas, categories, and services.

Wherever a business name, phone number, address, city, area, category, or service appears in the copy, use the exact placeholder key from that document. Do not write the actual value — write the placeholder. GHL replaces them dynamically at render.

Only use placeholders that are populated for this client. Do not output empty placeholder slots.

**If you cannot find a populated placeholder for something you need to reference** (a specific service, category, or area that should exist for this client but isn't listed with a clear key in the custom values document), do not guess a key, do not invent placeholder syntax (e.g. do not write something like `{{custom_values.service_[CONFIRM NUMBER]}}`), and do not write copy that assumes a key exists. Stop, and output a single line instead: `[HALTED — no populated custom value found for "X". Provide the correct key before this section can be generated.]`. This applies even if you are confident about what the value should logically be — confidence is not the same as the key being present and populated in the supplied document.

---

## Context

Along with the context provided below I have also provided you with the client's onboarding form answers. This has context that they have provided me directly. Read through ALL of this and take it into consideration when providing your output.

You should use the client onboarding form screenshots, Geographical Research & Context, GHL custom values document, AND the calibration pack for this client's trade when writing the copy for the homepage.

---

## PROMPT

You are writing homepage copy for [TRADE FRAMING]. Your job is to produce conversion-focused, locally specific copy that satisfies Google's consistency signals and builds topical relevance across all GBP categories.

Before writing, read the calibration pack provided for this client's trade. It contains two things: a TRADE FRAMING line (a short phrase starting with "a" or "an", e.g. "a UK landscaping and gardening business") to substitute for "[TRADE FRAMING]" above so the sentence reads naturally, and worked examples showing the standard of local specificity, real terminology, and editorial link quality required. Match that standard throughout — do not copy the examples, write the equivalent depth for this specific client.

Worked example of the substitution: "[TRADE FRAMING]" + calibration pack value "a UK landscaping and gardening business" → "You are writing homepage copy for a UK landscaping and gardening business."

All client context — trust signals, qualifications, differentiators, local conditions — is available in the project knowledge. Pull from it directly. Do not invent details.

Wherever a business name, phone number, city, area, category, or service appears in the copy, replace it with the correct GHL placeholder from the custom values document. Do not write the actual words — write the placeholder. Every instance, every section.

---

## CALEB'S 8 CONSISTENCY SIGNALS — MANDATORY PAGE ELEMENTS

The following eight elements must be present on the finished homepage. The copy prompt below covers the elements that are written content. The remaining elements are not copywriting outputs but must be flagged clearly in the output so the VA knows to add them.

**Written by this prompt:**
- Title tag — primary category + city name
- H1 — primary category + city name
- Secondary categories mentioned in the subheading
- FAQ section with editorial links

**VA to implement (flagged in output checklist):**
- Google Maps embed of the GBP location
- Review widget displaying live Google Business Profile reviews
- Address matching GBP character for character — use `{{custom_values.company_address}}`
- Phone number matching GBP character for character — use `{{custom_values.company_phone_functional}}`
- Local business schema on the homepage

---

## YOUR OUTPUT MUST COVER THESE SECTIONS IN ORDER

### 1. TITLE TAG

Write one title tag for the homepage.

Rules:
- Must include the primary category placeholder and primary area placeholder
- Should include a key benefit or differentiator from the project knowledge
- Maximum 60 characters, counting the RESOLVED text the placeholders represent (e.g. `{{custom_values.category_2}}` resolving to "Landscape Gardener" counts as 18 characters, not the length of the placeholder syntax itself). If the full formula (category + area + benefit + company name) would exceed 60 characters once resolved, drop the "Key Benefit" portion first — category, area, and company name take priority.
- Format: `[primary category placeholder] [primary area placeholder] | [Key Benefit] | [Business Name placeholder]`

**Long business name fallback:** Before writing, resolve the business name placeholder and count its characters. If it is 15 characters or longer, the four-part format above will rarely fit inside 60 characters — go straight to the two-part fallback (`[primary category placeholder] [primary area placeholder] | [Business Name placeholder]`, no benefit) rather than attempting the full format first. State which format you used in your pre-write reasoning. If even the two-part format risks exceeding 60 characters because the category or area name is itself long, write the closest compliant version once and let the character-length validation check catch and flag it — do not iterate through multiple rewrites trying to hit the limit exactly.

### 2. META DESCRIPTION

Write one meta description.

Rules:
- Must include the primary category placeholder, primary area placeholder, and one secondary category placeholder
- Include a clear call to action
- Maximum 155 characters, counting the RESOLVED text the placeholders represent, same as the title tag rule above
- Never use a dash of any kind to connect phrases. Write as complete sentences or comma-separated phrases only.

### 3. HERO SECTION

**H1:** Do not write an H1. Output the following placeholder text exactly: `[INSERT H1 FROM AHREFS]`

> ⚠️ **Reminder for the person pasting this into GHL:** the homepage H1 must always be `[primary category placeholder] [primary area placeholder]` — e.g. "Gardener Southampton" or "Landscaper Southampton" — never the name of a single service, and never the company name plus a tagline. If the H1 you are about to paste names one specific service (e.g. "Artificial Turf Installation," "Boiler Servicing," "Fuse Box Upgrade"), that H1 belongs on that service's own page, not the homepage. Stop and confirm you are editing the homepage before pasting. The homepage hero also never contains a multi-sentence paragraph — only the H1 and the one-sentence subheadline below. If you see a long paragraph already sitting in the homepage hero, you are very likely looking at the wrong page.
>
> The H1 must follow the dash rule too: no em dashes, en dashes, or hyphenated compounds, even if the Ahrefs-researched phrase you found includes one (e.g. "built and maintained" not "built & maintained" with a dash before it). If the highest-volume Ahrefs phrase is longer than the simple `[category] [area]` formula and includes extra positioning (a tagline, a benefit, the company name), use the simple formula for the H1 itself and move that extra positioning into the subheadline instead — the H1 stays short and keyword-matched, the subheadline carries the differentiator.

**Subheadline:** One sentence. Must reference at least two secondary category placeholders by name so Google sees them above the fold. You may weave in one trust signal or local detail from the project knowledge but secondary category visibility is the priority.

**Three category pills:** Use the three most commercially significant category placeholders from the custom values document.

**Trust badge text:** Two short trust badge lines (max 5 words each) drawn from real credentials in the project knowledge. Use specific facts: qualifications, experience, accreditations.

> ⚠️ The same conflation rule from Section 9 (Trust Bar) applies here. Do not combine a review score with a jobs completed or customers served figure into one claim — e.g. never write "4.9 star rated by 800+ customers" if 800+ is a jobs/customers figure rather than the Google review count. If the only strong social proof fact available is a jobs/customers figure, use it on its own ("800+ gardens maintained across Hampshire"), without attaching a star rating to it.

### 4. SERVICES SECTION (CATEGORY BLOCKS)

**Eyebrow label:** WHAT WE DO (static — do not change)

**Section headline:** Format: "Our `{{custom_values.category_1}}` services in `{{custom_values.biz_area_1}}`" — use this structure exactly.

Write one block for each category that exists in this client's project knowledge. Each block is an H2 followed by body copy followed by an editorial link. This mirrors Caleb's Core 30 structure exactly — the homepage H2s signal to Google what the category pages are about, and the editorial links pass authority to them.

For each block:
- **H2:** The correct category placeholder from the custom values document
- **Body copy:** 50 to 100 words. Must include the category placeholder and the primary area placeholder naturally within the copy — not just in the heading. Cover what this category includes, why local homeowners in this area need it, and at least one locally specific detail from the geo research (soil type, property type, seasonal pattern, local condition).
- **Editorial link:** See HOW TO WRITE THE EDITORIAL LINK below. This is mandatory and must follow the rules set out there.

#### HOW TO WRITE THE CATEGORY BLOCKS

Every block must do three things:

1. Name what the category covers in specific terms — not vague scope claims. Specific beats broad every time. Name the actual sub services or technical terms within the category that a genuine specialist would use.
2. Explain why homeowners in this specific location need this category — using a real local condition from the geo research. This is not about adding a place name as decoration. It is about connecting the service to a genuine local problem. The local condition must explain why the service matters here, not just appear in the sentence.
3. End with an editorial link that tells Google exactly what the linked category page covers. See the editorial link rules below.

Do not start any block with "We offer", "Our team offers", or "At [business name]". Do not use vague scope language ("full range of", "wide range of", "comprehensive"). Do not invent local details — every local condition must come from the geo research document.

If two categories in this client's project knowledge overlap in scope (for example, a general gardening category and a dedicated lawn care category both cover lawn mowing or weed control), do not write both blocks around the same scope statement. Pick a distinct angle for each: one might frame the overlapping service as part of a regular ongoing maintenance visit, the other as a standalone service for someone who only wants that one thing done. The category placeholder and editorial link should still be specific to each category's own page.

#### HOW TO WRITE THE EDITORIAL LINK

This is the most important sentence in each block from an SEO perspective. Google treats editorial links — links embedded in body copy — as signals of what the linked page is about. A weak link text passes almost no authority. A strong link text tells Google precisely what the destination page covers.

**The rule:** The link text must name the category and the location. It must describe what the linked page contains, not just invite the visitor to click.

Why this matters: Navigation links and footer links barely pass authority because Google knows they are structural. Editorial links in body copy pass real authority because Google treats them as endorsements. "Find out more" tells Google nothing. "Find out everything included in our [category] service in [location]" tells Google exactly what the category page is about and passes that relevance signal directly to it.

**Weak link text — never use these:**
- "Find out more"
- "See what's included"
- "Get in touch"
- "Find out how we can help"
- "Click here"
- "Learn more"
- "Explore our service"

**Strong link text — this is the standard:**
- "Find out everything that is covered in our [category placeholder] service in [primary area placeholder]"
- "See what our [category placeholder] service includes for [primary area placeholder] properties"
- "Find out how our [category placeholder] service approaches [specific local problem] in [primary area placeholder]"
- "See what is involved in our [category placeholder] service and how it works in [primary area placeholder] gardens"

The link text must always include the category placeholder and the primary area placeholder as a minimum. Where a specific local condition or problem has been referenced in the body copy, the link text should connect to it directly.

**An editorial link must always point to a page that is not the page the link sits on.** A category block on the homepage links to that category's own page — never back to the homepage itself.

#### WHAT GOOD LOOKS LIKE — CATEGORY BLOCKS

→ See the calibration pack for this client's trade. It contains worked examples at the standard required for category blocks. Do not copy them — write the equivalent depth and local specificity for this client.

### 5. FAQ SECTION (5 ITEMS)

**Eyebrow:** FAQ's - WHAT CLIENTS ASK US (static — do not change)

**Headline:** Frequently Asked Questions (static — do not change)

**Subheading:** Format: "Answering your questions about `{{custom_values.category_1}}`" — use this structure exactly.

Write five FAQ questions and answers for the homepage. These should be the questions a homeowner in `{{custom_values.biz_area_1}}` would actually ask before contacting a `{{custom_values.category_1}}`.

Cover these five areas, in this order:

1. **Areas covered** — which areas the business serves
2. **Specialisms / job scope** — what the business focuses on and what size of job they take on
3. **Qualifications and experience** — what makes this team credible
4. **Insurance and guarantees**
5. **How to get a quote / what happens next**

**Question sourcing:** Questions must be drawn from People Also Ask results for `{{custom_values.category_1}}` in `{{custom_values.biz_area_1}}`, or from Reddit threads where locals have asked about this trade. Do not invent questions. If no PAA or Reddit source is available in the project knowledge, write the closest logical equivalent for each topic area, then append `[SOURCE NEEDED: verify against PAA or Reddit before publishing]` at the end of that question.

Rules for each FAQ:

- **Question:** phrased the way a homeowner would type it into Google or ask out loud — not a marketing headline.
- **Answer:** 2 to 4 sentences. Specific facts only — pull from the onboarding form and geo research. Do not invent figures.
- **At least two of the five FAQs must include an editorial link to a category page**, following the same editorial link rules as the Services Section above (link text must name the category placeholder and the primary area placeholder, and describe what the linked page covers).
- **Editorial links in FAQs must point to a category page — never back to the homepage itself.** An FAQ on the homepage cannot link to "our [category] services in [the same area as this page]" if that phrase describes the homepage itself rather than a distinct category page.
- **Missing facts:** If a fact needed for an answer (insurance figure, guarantee details, founding date, etc.) is missing from the onboarding form, do not state a figure and do not write a vague sentence that implies the fact exists. Write the answer using only confirmed information first, then append: `[CLIENT TO CONFIRM: describe exactly what's missing]`. The flagged gap must never be the entire answer — there must always be a real, confirmed partial answer in front of it.

> ⚠️ **FAQ display — no accordions, ever.** All FAQ questions and answers must be built in GHL as open, always-visible content — not collapsible accordions. Googlebot renders the page in mobile Chrome and cannot click to expand collapsed elements. Any FAQ content inside a collapsed accordion is largely invisible to Google. If the GHL template uses an accordion component for FAQs by default, the VA must replace it with a static open layout before the page goes live.

**FAQ TEXT (footer line):** For expert advice on `{{custom_values.category_1}}` in `{{custom_values.biz_area_1}}`, contact us today for a free consultation. (static — do not change)

**View All FAQs link:** "View All FAQs →" (static — do not change). Links to the /faqs page, or to the homepage FAQ section anchor if no dedicated FAQs page exists yet.

### 6. CONTACT FORM SUBMIT BUTTON

The Contact Section heading and subheading ("Ready to get started?" / "Get your free no obligation quote today...") are static — do not write new copy for these.

**Form submit button label:** 3 to 5 words. Not "Submit." Tell the visitor what happens when they click — e.g. "Get My Free Quote" or "Request My Site Visit." Must be different wording from the Hero form title (Section 8), even if similar in spirit, so the two forms on the page don't read as identical.

### 7. STICKY BAR

**Location text:** 1 short phrase. City and service area only. Format: `[primary area placeholder] & Surrounding Areas`

**Phone number:** Use `{{custom_values.company_phone_functional}}`

### 8. FORM TITLE

Write one short heading for the quote form.

Rules:
- Reference the primary area placeholder
- 4 to 6 words maximum
- Action-oriented — tells the visitor what the form does
- Format: "Check Availability in `{{custom_values.biz_area_1}}`" or similar

### 9. TRUST BAR (4 ITEMS)

Write four trust bar items. Each item has a headline (2 to 4 words) and a supporting sub-line (3 to 6 words).

Pull all facts directly from the onboarding form — founding date, insurance cover, response time, review score, jobs completed, guarantee details. Do not invent figures. Only use what the client has confirmed.

Format per item:
- Headline: [fact-based claim]
- Sub-line: [supporting detail]

Rules:
- All four must be different trust dimensions — e.g. social proof, insurance, availability, experience. Do not repeat the same angle twice.
- Specific numbers always beat vague claims — "£5m cover" beats "fully insured", "since 2009" beats "years of experience".
- If the onboarding form is missing a fact needed for one of the four slots, do not let the HEADLINE consist solely of a `[CLIENT TO CONFIRM: what's needed]` flag — a bracketed instruction sitting alone in a short headline slot looks broken if it reaches a live page. Instead: write a headline using only confirmed wording for that trust dimension (e.g. "Fully Insured" or "Verified Google Reviews"), and put the flag in the SUB-LINE instead, attached to real surrounding words (e.g. "Based on [CLIENT TO CONFIRM: review count] Google reviews" — not the flag alone). If no confirmed wording exists at all for a dimension, replace that dimension with a different one that IS supported by confirmed facts, rather than leaving an empty headline.

> ⚠️ **CRITICAL — do not combine separate facts into one number claim.** A review score (e.g. 4.9) and a review count (e.g. "120+ reviews") can appear together because they both describe the same thing — Google reviews. A jobs-completed or customers-served figure is a DIFFERENT metric and must never be presented alongside a star rating as if it were the review count. For example, never write "4.9 star rated by 800+ customers" if the 800+ figure refers to jobs completed rather than Google reviews — that misrepresents the 800+ figure as the review count. If both a review count and a jobs-completed figure exist in the onboarding form, they may appear as two SEPARATE trust bar items, each correctly labelled, never combined into one claim.

### 10. GOOGLE REVIEWS SECTION

**Eyebrow label:** GOOGLE REVIEWS (static — do not change)

**Headline:** Format: "Why `{{custom_values.biz_area_1}}` homeowners choose `{{custom_values.company_name}}`" — use this structure exactly.

**Review score:** Use the figure supplied by the user when running this prompt. If not supplied, write `[CLIENT TO CONFIRM: Google review score]` — use this exact convention, not a different placeholder style like "[INSERT...]", so it's handled consistently with every other missing-fact flag in this prompt.

**Review count:** Use the figure supplied by the user when running this prompt. If not supplied, write `[CLIENT TO CONFIRM: Google review count]`, same convention as above.

**Sub-line:** "Based on [review count] Google reviews" — static format. If review count is unsupplied, this becomes "Based on `[CLIENT TO CONFIRM: Google review count]` Google reviews" — the flag attached to real surrounding words, same pattern as everywhere else.

> 📌 If a review count or review score also appears anywhere in the Trust Bar (Section 9), it must be the exact same figure used here. Do not let two different sections state two different numbers for what is meant to be the same metric.

### 11. MEET THE TEAM SECTION

**Eyebrow label:** MEET THE TEAM (static — do not change)

**Headline:** 4 to 8 words. Benefit led — it should communicate why this team is worth trusting (combining qualifications, experience, and genuine track record), not just label the section. Do not use "we are passionate", "we pride ourselves", or any other banned phrase from the Rules That Apply To Everything section, even in third person framing. → See the calibration pack for a worked example.

**Body copy:** 2 short paragraphs. Pull entirely from the onboarding form — founding story, qualifications, experience, what makes the business different. Write in third person. Must include `{{custom_values.company_owner_first_name}}`, `{{custom_values.company_name}}`, and `{{custom_values.biz_area_1}}`. Do not invent details — only use what the client has confirmed in the onboarding form.

**Image note:** Output the following instruction for the VA: "A real photo of the owner or a team member on an actual job must be used before the site goes live. Flag to the client if this has not been provided."

Rules:
- No "we pride ourselves", "we are passionate", "going above and beyond"
- Specific facts only — qualifications, named places, real experience
- Confident and direct — skilled tradesperson, not a corporate about page

### 12. AREAS WE COVER BAR

**Eyebrow label:** AREAS WE COVER (static — do not change)

**Area list:** Output `biz_area_1` through `biz_area_14` separated by bullet points. Only output areas that are populated — do not output empty placeholders.

> ⚠️ Before finalizing, count how many `biz_area_N` keys are populated in the project knowledge, then count how many appear in this list. These two numbers must match. This list is the single place every populated area must appear — areas have been dropped from this list in past generations (commonly the highest-numbered one), so check the last 2-3 areas specifically.

**Link text:** "View all locations →" (static — do not change)

### 13. SCHEMA (HOMEPAGE ONLY)

This section provides the one piece of writing that schema markup needs beyond what's already generated above. Everything else in Local Business schema is templated directly from custom values by the VA, and FAQ schema is generated from the FAQ content already produced in Section 5 — neither needs new copy here.

**Business description for Local Business schema:** One sentence. What this business does and where. Must include the primary category placeholder and primary area placeholder. Maximum 200 characters. Same banned phrases and dash rule apply as everywhere else.

> 📌 **For the VA:** FAQ schema for this page can be built directly from FAQ 1 through FAQ 5 and FAQ ANSWER 1 through FAQ ANSWER 5 above — the question and answer text must match what's wrapped in the FAQPage schema exactly, so copy them straight across. No additional writing is needed for FAQ schema.
>
> ⚠️ **Do not generate or estimate values for Rating value, Best rating, Worst rating, or Rating count in Local Business schema.** These must be left blank until the client has real, verified Google reviews, per the schema phase of the build SOP. GHL's "Create with AI" schema tool will otherwise populate these with fake data from its training set — this is a Google guideline violation and must be removed if it appears.

### 14. VA IMPLEMENTATION CHECKLIST

At the end of the copy output, print the following checklist as a clearly labelled section so the VA knows what to add in GHL after pasting the copy:

- Google Maps embed — embed the GBP map using `{{custom_values.google_map_embed}}`
- Review widget — add a live Google Business Profile review widget to the homepage
- Address — confirm `{{custom_values.company_address}}` is visible on the page and matches GBP character for character
- Phone number — confirm `{{custom_values.company_phone_functional}}` is visible on the page and matches GBP character for character
- Local business schema — add local business schema to the homepage
- FAQ display — confirm all FAQ questions and answers are visible on page load. No accordions or collapsible elements. If the GHL template defaults to an accordion for the FAQ section, replace it with a static open layout before the page goes live.

---

## RULES THAT APPLY TO EVERYTHING

Every business name, phone number, city, area, category, and service reference must use the correct GHL placeholder from the custom values document — not the actual word.

Every section must feel written for this specific business in this specific location — not a swapped-in template.

Draw on geo research for local conditions, property types, seasonal patterns, and buying psychology.

Do not use: "look no further", "your one-stop shop", "we pride ourselves", "we are passionate", "competitive prices", "quality service", "going above and beyond", "state of the art", "cutting edge", "second to none", "bespoke", "tailored", "comprehensive", "wide range of", "full range of", "solutions", "needs", "professional and reliable", "friendly team", "no job too big or too small", "find out more", "get in touch", "find out how we can help", "click here", "learn more", "explore our service", "see what's included", "getting in touch", "before getting in touch", "once you get in touch", "when you get in touch".

⚠️ "Full range of", "wide range of", and "tailored" are the most commonly missed banned phrases — they appear naturally when describing service scope or customisation in FAQ answers and service card copy, and the model defaults to them even when explicitly told not to. Before finalising, search specifically for these three terms and rewrite any instance found.

Concrete rewrites:
- "covers the full range of tasks that keep a garden under control" → "covers everything from regular mowing and edging to seasonal cutbacks and border maintenance" (name the actual tasks instead of saying "full range")
- "a programme tailored to soil type and lawn condition" → "a programme built around the soil type and lawn condition on site" (replace "tailored to" with "built around", "based on", or "matched to")
- General rule: whenever you're about to write "full range of X" or "wide range of X", stop and list two or three concrete examples of X instead. Whenever you're about to write "tailored to Y", replace it with "built around Y", "matched to Y", or "based on Y".

Short paragraphs. Direct language. Confident and competent tone — skilled local tradesperson, not national franchise.

**Title tag benefit rule:** The short benefit or differentiator in the title tag must never contain a hyphen. Write as plain words only: "Same Week Starts" not "Same-Week Starts", "Free Site Visits" not "Free-Site-Visits".

**Sentence structure rule — applies to every section:** Never join two clauses with a dash (em dash or en dash). Every clause must be its own sentence. If you find yourself writing "X — Y" where X and Y are both meaningful clauses, stop and split them: "X. Y." This applies everywhere — subheadlines, intro paragraphs, FAQ answers, contact sentences, seasonal sections, local knowledge cards. The only dashes permitted anywhere in the output are hyphens inside GHL placeholder keys ({{custom_values.x}}) and hyphens in URL slugs. Everything else must be split into separate sentences.

**Bullet point rule:** Bullet points must never use a dash to add a secondary detail. Never write "• Task — extra detail" or "• Species — explanation". If a bullet needs elaboration, write it as two words or a short phrase without any dash, or move the detail into the following bullet or sentence. Example: wrong: "• Aeration — particularly on clay soils". Right: "• Aeration on clay soils before winter".

Google consistency signals must be satisfied: primary category placeholder + primary area placeholder in H1, secondary categories in subheading, all populated categories covered in the services section with editorial links, FAQ section with editorial links pointing to category pages.

Any figure that appears in more than one section (review counts, founding dates, insurance amounts) must be the same figure everywhere it appears. Never state two different numbers for the same fact.

**Category placeholder grammar:** category placeholders resolve to GBP category names, which take different grammatical forms — some are role nouns ("Gardener", "Landscape Designer"), some already end in "service" or "services" ("Lawn care service", "Tree service"), some are activities ("Landscape design"). Because of this, never append a generic word like "services" directly after a category placeholder (this produces results like "Lawn care service services" when the category itself already ends in "service", and "delivers Gardener services" reads oddly because "Gardener" is a role, not an activity). Instead, treat each category placeholder as a complete noun phrase and build the sentence around it: "Our {{custom_values.category_4}} team", "{{custom_values.company_name}}'s {{custom_values.category_1}} covers...", "as your local {{custom_values.category_1}}, {{custom_values.company_name}}...". This applies everywhere a category placeholder appears in prose, including the schema business description.

---

## DASH RULE (HIGHEST PRIORITY)

No em dashes (—), en dashes (–), or hyphens of any kind may appear anywhere in the output. This includes compound adjectives and technical compound nouns, no matter how technical or industry-specific the term is.

**The underlying pattern, not a word list:** Any time you are about to write two words joined by a hyphen — whether it's a time period ("post-war", "mid-autumn"), a material or soil description ("clay-influenced", "free-draining"), a structural description ("close-board", "sub-base"), or any other compound adjective — stop and write it as two separate words instead. This applies to every compound you generate, including ones not listed in the examples below. Do not treat the absence of a specific compound from the example list as permission to hyphenate it. The rule is the pattern: compound adjective → two words. The examples below illustrate the pattern; they are not an exhaustive list of what to check.

**Before / after examples illustrating the pattern (not a complete list):**
- "post-war semis" → "post war semis"
- "mid-autumn leaf fall" → "mid autumn leaf fall"
- "clay-influenced soils" → "clay influenced soils"
- "free-draining ground" → "free draining ground"
- "close-board fencing" → "close board fencing"
- "well-established borders" → "well established borders"
- "Retaining structures — walls, steps, and tiered beds — are common" → "Retaining structures, including walls, steps, and tiered beds, are common" (rewrite the whole sentence rather than using a dash to insert a parenthetical list)

**Additional common examples (same pattern as above — this list is illustrative, not exhaustive; apply the rule to every compound you write, not just these):**
- "sub-base" → "sub base"
- "close-board" → "close board"
- "post-war" → "post war"
- "clay-influenced" → "clay influenced"
- "moisture-retentive" → "moisture retentive"
- "free-draining" → "free draining"
- "low-lying" → "low lying"
- "year-round" → "year round"
- "in-house" → "in house"
- "well-maintained" → "well maintained"
- "high-quality" → "high quality"
- "no-obligation" → "no obligation"
- "problem-driven" → "problem driven" (internal classification label only — do not output this label in the final copy)
- "co-dominant" → "co dominant"
- "ground-based" → "ground based"
- "re-establishment" → "re establishment"
- "mid-autumn" → "mid autumn"
- "mid-summer" → "mid summer"
- "mid-winter" → "mid winter"
- "mid-spring" → "mid spring"
- "long-term" → "long term"
- "short-term" → "short term"
- "add-on" → "add on"
- "well-established" → "well established"
- "well-drained" → "well drained"
- "fast-growing" → "fast growing"
- "slow-growing" → "slow growing"

For any compound word not in the list above: rewrite as two separate words, or rephrase the sentence entirely to avoid the hyphen.

This rule applies to every part of your output, including any line in this prompt marked "static — do not change." If a static line as written in this prompt contains a dash or a hyphenated compound, output it WITHOUT the dash while preserving its meaning, rather than reproducing the dash because the line is marked static. "Static" means the wording and structure should not be changed creatively, not that a dash in it should be copied through.

After applying all rewrites, scan the full output one final time. Any remaining hyphen that is not part of a GHL placeholder (`{{custom_values.x}}`) or a URL slug is a violation. Remove it.

Do not produce your final output until this scan is complete and clean.

**Pre-write reasoning notes:** This rule also applies to any pre-write confirmation text, classification notes, or declarations you write before the template block. Do not use hyphens in service type classifications (write "problem driven" not "problem-driven", "desire driven" not "desire-driven", "schedule driven" not "schedule-driven"), pre-write labels ("pre write" not "pre-write"), or any other compound in your reasoning text. The validator scans the full output including reasoning.

**Final re-read gate:** Before producing your final result, read back through the entire output from the first line to the last. Search for every em dash (—), en dash (–), and hyphen used inside a compound word. If any are found, rewrite those lines until clean, then re-read the full output again. Do not stop until the re-read produces zero matches. Only then produce your final result.

---

## READING LEVEL RULE

Every piece of copy must be grade 5 or below. Sentences of 10 to 12 words. Everyday vocabulary. Short paragraphs. No complex nested clauses. If a sentence would read as grade 6 or above, split it or rewrite it simpler.

---

## OUTPUT FORMAT

Output the copy in this exact template order. Every label is fixed — do not rename or reorder. The VA copies this directly into GHL. No commentary, explanations, or options. Final copy only.

```
HOMEPAGE TEMPLATE

HERO SECTION
TITLE TAG:
META DESCRIPTION:
HERO H1:
HERO TRUST ICON 1 TEXT:
HERO TRUST ICON 2 TEXT:
ICONS TO USE:
HERO SUBHEADLINE:
HERO CATEGORY PILLS:
HERO TRUST BADGES:
HERO BACKGROUND IMAGE:
FORM TITLE:

STICKY BAR
STICKY BAR LOCATION TEXT:
PHONE NUMBER:

TRUST BAR
HEADLINE 1:
SUB HEADLINE 1:
HEADLINE 2:
SUB HEADLINE 2:
HEADLINE 3:
SUB HEADLINE 3:
HEADLINE 4:
SUB HEADLINE 4:

SERVICES SECTION
SERVICES EYEBROW: WHAT WE DO
SERVICES HEADLINE: Our {{custom_values.category_1}} services in {{custom_values.biz_area_1}}

1 - SERVICES {{custom_values.category_1}}:
IMAGE:
2 - SERVICES {{custom_values.category_2}}:
IMAGE:
3 - SERVICES {{custom_values.category_3}}:
IMAGE:
4 - SERVICES {{custom_values.category_4}}:
IMAGE:
5 - SERVICES {{custom_values.category_5}}:
IMAGE:
6 - SERVICES {{custom_values.category_6}}:
IMAGE:
7 - SERVICES {{custom_values.category_7}}:
IMAGE:
8 - SERVICES {{custom_values.category_8}}:
IMAGE:
9 - SERVICES {{custom_values.category_9}}:
IMAGE:

SERVICES BUTTON: View All Services

FAQ SECTION
EYEBROW: FAQ's - WHAT CLIENTS ASK US
HEADING: Frequently Asked Questions
SUBHEADING: Answering your questions about {{custom_values.category_1}}
FAQ 1:
FAQ ANSWER 1:
FAQ 2:
FAQ ANSWER 2:
FAQ 3:
FAQ ANSWER 3:
FAQ 4:
FAQ ANSWER 4:
FAQ 5:
FAQ ANSWER 5:
FAQ TEXT: For expert advice on {{custom_values.category_1}} in {{custom_values.biz_area_1}}, contact us today for a free consultation.
VIEW ALL FAQS LINK: View All FAQs →

ABOUT SECTION
MEET THE TEAM — EYEBROW: MEET THE TEAM
MEET THE TEAM — HEADLINE:
MEET THE TEAM — BODY:
MEET THE TEAM — IMAGE:

AREAS WE COVER SECTION
AREAS WE COVER — EYEBROW: AREAS WE COVER
AREAS WE COVER — AREA LIST:
AREAS WE COVER — LINK: View all locations →

MAP SECTION
MAP — EYEBROW: OUR LOCATION
MAP — HEADLINE: Find us on Google
MAP: Embed the Google map using {{custom_values.google_map_embed}}

SCHEMA (HOMEPAGE ONLY)
BUSINESS DESCRIPTION:

CONTACT SECTION
EYEBROW: GET IN TOUCH
HEADING: Ready to get started?
SUBHEADING: Get your free no obligation quote today, most jobs booked within the week.
CALL BUTTON: {{custom_values.company_twilio_phone}}
FORM:
FORM SUBMIT BUTTON LABEL:

GOOGLE REVIEWS SECTION
GOOGLE REVIEWS EYEBROW: GOOGLE REVIEWS
GOOGLE REVIEWS HEADLINE:
GOOGLE REVIEWS SCORE:
GOOGLE REVIEWS COUNT / SUB-LINE:

FOOTER
COLUMN 1 DETAILS: {{custom_values.company_name}}
Professional {{custom_values.category_1}} in {{custom_values.biz_area_1}}, {{custom_values.state}}
{{custom_values.company_twilio_phone}}
{{custom_values.company_email}}

COLUMN 2 LINKS: QUICK LINKS
Home
Services
Projects
Service Areas
About Us
Contact

COLUMN 3 LINKS SERVICE AREAS: SERVICE AREAS
{{custom_values.biz_area_1}}
{{custom_values.biz_area_2}}
{{custom_values.biz_area_3}}
{{custom_values.biz_area_4}}
{{custom_values.biz_area_5}}
{{custom_values.biz_area_6}}

COLUMN 4 LINKS OPENING HOURS: OPENING HOURS
Mon - Fri: [from onboarding form]
Saturday: [from onboarding form]
Sunday: [from onboarding form]

VA IMPLEMENTATION CHECKLIST
```
