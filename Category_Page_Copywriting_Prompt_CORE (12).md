# Category Page Copywriting Prompt — CORE (All Trades)

Use this prompt inside a Claude project/chat that contains the following knowledge files:

- Client onboarding form
- Geographical Research & Context doc
- GHL custom values document/google sheet (screenshots)
- The calibration pack for this client's trade (e.g. Landscaper/Gardener Category Page Calibration Pack)

Before running, state which GBP category this page is being written for. The prompt will refer to this as the TARGET CATEGORY throughout.

---

## GHL CUSTOM VALUES

The GHL custom values document is included in the project knowledge. It contains every placeholder key for this client — business name, phone, address, service areas, categories, and services.

Wherever a business name, phone number, address, city, area, category, or service appears in the copy, use the exact placeholder key from that document. Do not write the actual value — write the placeholder. GHL replaces them dynamically at render.

Only use placeholders that are populated for this client. Do not output empty placeholder slots.

**If you cannot find a populated placeholder for something you need to reference** (a specific service, category, or area that should exist for this client but isn't listed with a clear key in the custom values document), do not guess a key, do not invent placeholder syntax (e.g. do not write something like `{{custom_values.service_[CONFIRM NUMBER]}}`), and do not write copy that assumes a key exists. Stop, and output a single line instead: `[HALTED — no populated custom value found for "X". Provide the correct key before this section can be generated.]`. This applies even if you are confident about what the value should logically be — confidence is not the same as the key being present and populated in the supplied document.

---

## Context

Along with the context provided below I have also provided you with the client's onboarding form answers. This has context that they have provided me directly. Read through ALL of this and take it into consideration when providing your output.

You should use the client onboarding form, Geographical Research & Context, GHL custom values document, AND the calibration pack for this client's trade when writing the copy for this category page.

---

## PROMPT

You are writing category page copy for [TRADE FRAMING]. Your job is to produce conversion-focused, locally specific copy that builds topical relevance for the TARGET CATEGORY and satisfies Google's consistency signals for that GBP category.

Before writing, read the calibration pack provided for this client's trade. It contains two things: a TRADE FRAMING line (a short phrase starting with "a" or "an") to substitute for "[TRADE FRAMING]" above so the sentence reads naturally, and worked examples showing the standard of local specificity, real terminology, and editorial link quality required. Match that standard throughout — do not copy the examples, write the equivalent depth for this specific client and this specific category.

All client context — trust signals, qualifications, differentiators, local conditions — is available in the project knowledge. Pull from it directly. Do not invent details.

Wherever a business name, phone number, city, area, category, or service appears in the copy, replace it with the correct GHL placeholder from the custom values document. Do not write the actual words — write the placeholder. Every instance, every section.

---

## IDENTIFYING THE TARGET CATEGORY AND ITS SERVICES

At the start of every run, identify:

1. Which category placeholder corresponds to the TARGET CATEGORY (e.g. if the user stated "Gardener", find the custom value key — likely `{{custom_values.category_1}}` — and use that key throughout).
2. Which service placeholders belong to this category (from the custom values document). These are the services that will populate the service cards section.

Only write service card copy for services that belong to the TARGET CATEGORY. Do not include services from other categories even if they are vaguely related.

---

## CALEB'S 8 CONSISTENCY SIGNALS — MANDATORY PAGE ELEMENTS

The following eight elements must be present on the finished category page. The copy prompt covers the written content elements. The remaining elements are flagged in the VA checklist.

**Written by this prompt:**
- Title tag — TARGET CATEGORY + primary area
- H1 — TARGET CATEGORY + primary area (from Ahrefs — flagged as placeholder in output)
- Secondary categories in the services intro
- Service cards with editorial links to service pages
- FAQ section with editorial links

**VA to implement (flagged in output checklist):**
- Google Maps embed of the GBP location
- Review widget displaying live Google Business Profile reviews
- Address matching GBP character for character — use `{{custom_values.company_address}}`
- Phone number matching GBP character for character — use `{{custom_values.company_phone_functional}}`

---

## YOUR OUTPUT MUST COVER THESE SECTIONS IN ORDER

### 1. TITLE TAG

Write one title tag for this category page.

Rules:
- Must include the TARGET CATEGORY placeholder and primary area placeholder
- Should include a key benefit or differentiator from the project knowledge
- Maximum 60 characters counting the RESOLVED text the placeholders represent (e.g. `{{custom_values.category_1}}` resolving to "Gardener" counts as 8 characters). If the full formula would exceed 60 characters once resolved, drop the benefit portion first — category, area, and company name take priority.
- Format: `[TARGET CATEGORY placeholder] [primary area placeholder] | [Key Benefit] | [Business Name placeholder]`

### 2. META DESCRIPTION

Write one meta description.

Rules:
- Must include the TARGET CATEGORY placeholder and primary area placeholder
- Reference one or two services that belong to this category
- Include a clear call to action
- Maximum 155 characters counting the RESOLVED text the placeholders represent
- Never use a dash of any kind to connect phrases. Write as complete sentences or comma-separated phrases only.

### 3. HERO SECTION

**H1:** Do not write an H1. Output the following placeholder text exactly: `[INSERT H1 FROM AHREFS]`

> ⚠️ **Reminder for the person pasting this into GHL:** the category page H1 must always follow the formula `[TARGET CATEGORY] [primary area]` — e.g. "Gardener Southampton" or "Lawn Care Southampton" — using the highest-volume Ahrefs keyword for this category and location. Never use a single service name as the H1. Never include the company name in the H1. The H1 must follow the dash rule: no em dashes, en dashes, or hyphenated compounds. Set the page URL slug to match the H1 formula before adding any content (e.g. /gardener-southampton).

**Trust Icons (two lines above H1):**

Write two short trust icon lines. Max 5 words each. Use specific, checkable facts from the onboarding form — qualifications, accreditations, years of experience, insurance status. Do not use vague claims.

If a specific fact is not available in the project knowledge, write the trust icon using only confirmed information and append `[CLIENT TO CONFIRM: what's needed]` to the second line, not to the icon headline itself. Use 'Line 1:' and 'Line 2:' as output labels, never 'Sub-line:'. An icon headline that is only a bracketed flag reads as broken if it reaches a live page.

> ⚠️ The same conflation rule from the Trust Bar applies here. Do not combine a review score with a jobs completed or customers served figure into one claim. If the only strong figure is a jobs/customers count, use it alone — do not attach a star rating to it.

**Hero Subheadline:**

2 to 3 sentences. Must do all three of the following:
1. Name the TARGET CATEGORY and the primary area.
2. Reference at least one real local condition from the geo research — a soil type, property type, drainage issue, or seasonal pattern — and connect it directly to why this category matters here.
3. End with a call to action that includes the phone number placeholder.

Do not start with "We offer" or "Our team offers." Do not use any banned phrase from the Rules That Apply To Everything section.

⚠️ SENTENCE STRUCTURE RULE: Every clause must be a separate sentence ending with a full stop. Never join two clauses with a dash. Never write "X — call us" or "X — find out more". The call to action must be its own sentence: "Call {{custom_values.company_phone_functional}} to book a free visit."

**Trust Pills (four pills below subheadline):**

Four short factual statements in pill format. These are operational facts — scheduling reliability, insurance status, guarantee, response time. Pull from the onboarding form. Each pill 3 to 5 words. No vague marketing claims.

### 4. SERVICES INTRO SECTION

**Eyebrow:** WHAT WE DO (static — do not change)

**Headline:** Format: "Our `{{custom_values.[TARGET CATEGORY key]}}` services in `{{custom_values.biz_area_1}}`" — use this structure exactly with the correct placeholder keys.

**Intro paragraph:** 2 to 3 sentences. Introduces the service cards that follow. Must reference at least two secondary service area placeholders (biz_area_2, biz_area_3 or similar) to build geographical relevance. Do not repeat copy from the hero subheadline. Do not use banned phrases.

### 5. SERVICE CARDS

Write one card for each service that belongs to the TARGET CATEGORY, as identified from the custom values document. The number of cards varies by category.

For each card:

**Card H2:** The correct service placeholder from the custom values document (e.g. `{{custom_values.service_X_Y}}`).

**Body copy:** 60 to 100 words. Must:
- Name the service placeholder naturally in the copy — not just in the heading
- Include at least one locally specific detail from the geo research that explains why this service matters for this location (soil type, property type, seasonal pattern, local condition). The local detail must explain why the service matters here, not just appear as decoration.
- Name specific sub-tasks or techniques within the service that a genuine specialist would use. Specific beats broad every time.
- End with an editorial link (see editorial link rules below).

**Editorial link per card:** The link text must name the service placeholder AND the primary area placeholder. It must describe what the service page covers, not just invite a click. Follow all editorial link rules from the Rules section below.

After each editorial link, output this VA annotation on a new line:
`[VA — HYPERLINK THE TEXT ABOVE. Link this to the service page for {{custom_values.service_X_Y}} in {{custom_values.biz_area_1}}. Delete this note before publishing.]`

Substitute the correct service placeholder key in the annotation.

**Card image instruction:** Output `SERVICE CARD — [service placeholder] IMAGE: [Real job photo of this service type preferred. Stock photo acceptable if no client photo available — no text overlays, watermarks, or AI imagery. Crop to landscape ratio.]`

**Unused card slots:** If a row of three cards has fewer than three services to fill it, note which slots are unused. The VA will hide unused slots.

#### HOW TO WRITE THE SERVICE CARD EDITORIAL LINK

Every card must end with a single editorial link sentence. The same rules apply here as on the homepage services section:

**Weak link text — never use these:**
- "Find out more"
- "See what's included"
- "Get in touch"
- "Find out how we can help"
- "Click here"
- "Learn more"
- "Explore our service"

**Strong link text — this is the standard:**
- "Find out everything that is covered in our `{{custom_values.service_X_Y}}` in `{{custom_values.biz_area_1}}`"
- "See what our `{{custom_values.service_X_Y}}` includes for `{{custom_values.biz_area_1}}` properties"
- "Find out how our `{{custom_values.service_X_Y}}` approach works in `{{custom_values.biz_area_1}}`"

The link text must always include both the service placeholder and the primary area placeholder. Where a specific local condition has been referenced in the body copy, the link text should connect to it directly where it reads naturally.

An editorial link must always point to a page that is not the current page. A service card on the category page links to that service's own page — never back to this category page or the homepage.

### 6. REAL WORK SECTION

**Headline:** 4 to 8 words. References the TARGET CATEGORY and the primary area. Factual, not a marketing claim. Example: "Recent `{{custom_values.[TARGET CATEGORY key]}}` Work Across `{{custom_values.biz_area_1}}`"

**Subheadline:** One sentence. Positions the photos as real client jobs — not stock photography.

**Image instructions (three photos):**
- REAL WORK — IMAGE 1: Real job photo — [describe subject relevant to this category]
- REAL WORK — IMAGE 2: Real job photo — [describe subject relevant to this category]
- REAL WORK — IMAGE 3: Real job photo — [describe subject relevant to this category]

> ⚠️ All three must be real job photos. No stock. No AI. Flag to client if not supplied before go-live.

### 7. SEASONAL TASKS SECTION

**Headline:** 5 to 9 words. References the TARGET CATEGORY, the primary area, and a seasonal theme. Must include the TARGET CATEGORY placeholder and primary area placeholder.

**Subheadline:** One sentence. Introduces why the seasonal calendar matters for gardens in this specific location — draw from the geo research (climate type, latitude, proximity to coast, prevailing conditions).

**Four seasonal entries (Spring, Summer, Autumn, Winter):**

For each season, write:
- A 1 to 2 sentence scene-setting opener that places this specific location in that season (use geo research — climate, soil, property type, local seasonal pattern).
- 3 to 5 bullet points listing the key tasks for that season relevant to the TARGET CATEGORY.

Bullet points must be specific tasks, not vague activity descriptions. Name the actual techniques and sub-tasks a specialist would do (e.g. "Aeration to relieve compaction on clay lawns before winter waterlogging sets in" not just "Lawn care").

Every bullet point must be directly relevant to the TARGET CATEGORY. Do not list tasks that belong to a different category.

> 📌 This section builds topical relevance with Google by demonstrating location-specific knowledge for this category. Every local detail must come from the geo research — do not invent seasonal conditions.

### 8. LOCAL KNOWLEDGE SECTION

**Eyebrow:** Output the following exactly: `LOCAL KNOWLEDGE — EYEBROW: We Know {{custom_values.biz_area_1}} Gardens`

**Headline:** 6 to 10 words. Must include the primary area placeholder. Something like: "Local Knowledge Built From Working Across `{{custom_values.biz_area_1}}` Every Week"

**Intro paragraph 1:** 2 to 3 sentences. Establishes that the primary service area is not one uniform market — name the range of property types, housing stock variation, or neighbourhood contrasts that affect how the TARGET CATEGORY is delivered here. Draw entirely from the geo research.

**Intro paragraph 2:** 2 to 3 sentences. Explains how soil type, drainage, or climate conditions vary across the primary service area and what this means for the TARGET CATEGORY specifically. Draw entirely from the geo research.

**Four neighbourhood cards:**

Each card covers a distinct neighbourhood, district, or cluster of streets within the primary service area. Write a name label and 2 to 3 sentences of body copy per card.

Each card must:
- Name a real, specific area from the geo research (not a vague region)
- Attach a real local condition to that area (property type, soil, drainage, aspect, access, tree cover, age of housing)
- Connect that condition to a consequence or task relevant to the TARGET CATEGORY

Do not pad. Do not repeat the same condition across multiple cards — each card must cover a distinct local observation. Every fact must come from the geo research.

### 9. REVIEWS SECTION

**Eyebrow:** WHAT CLIENTS SAY ABOUT US (static — do not change)

**Headline:** Format: "Trusted by `{{custom_values.biz_area_1}}` Homeowners" — use this structure exactly.

**Subheadline:** One sentence. References real reviews, the primary area, and ideally the TARGET CATEGORY.

> ⚠️ The review widget must pull real GBP reviews — not static screenshots, not placeholder cards. This section cannot go live with dummy reviews.

### 10. FAQ SECTION

**Eyebrow:** FAQ's (static — do not change)

**Headline:** Format: "Questions About Our `{{custom_values.[TARGET CATEGORY key]}}` in `{{custom_values.biz_area_1}}`" — use this structure exactly.

**Subheadline:** One sentence. References the primary area and positions the FAQs as answers the business gets asked most often.

Write three FAQ questions and answers for this category page. These should be the questions a homeowner in `{{custom_values.biz_area_1}}` would actually ask before contacting a `{{custom_values.[TARGET CATEGORY key]}}` specifically.

Cover these three areas, in this order:

1. **What the category covers / scope of work** — what does this category include, what size or type of job does the business take on for this category
2. **A locally specific concern** — a question tied to a condition that is specific to this area (soil, climate, seasonal timing, property type) that affects this category
3. **Pricing, booking, or what happens next** — how to get a quote, what the process looks like, typical timescales

Rules for each FAQ:

- **Question:** phrased the way a homeowner would type it into Google or ask out loud — not a marketing headline.
- **Answer:** 2 to 4 sentences. Specific facts only — pull from the onboarding form and geo research. Do not invent figures.
- **At least two of the three FAQs must include an editorial link to a service page**, following the same editorial link rules as the service cards above (link text must name the service placeholder and the primary area placeholder, and describe what the linked page covers).
- **Editorial links in FAQs must point to a service page — never back to this category page or to the homepage.** A FAQ answer on the category page that links back to the same category page passes no SEO value and confuses the visitor.
- **Missing facts:** If a fact needed for an answer is missing from the onboarding form, write the answer using only confirmed information first, then append: `[CLIENT TO CONFIRM: describe exactly what's missing]`. The flag must never be the entire answer.

> ⚠️ **FAQ display — no accordions, ever.** All FAQ questions and answers must be built in GHL as open, always-visible content. Googlebot cannot click to expand collapsed elements. If the GHL template uses an accordion by default, the VA must replace it with a static open layout.

### 11. CONTACT SECTION

**Eyebrow:** GET IN TOUCH (static — do not change)

**Headline:** 5 to 8 words. References the TARGET CATEGORY and the primary area. Example: "Get in Touch With Your Local `{{custom_values.biz_area_1}}` `{{custom_values.[TARGET CATEGORY key]}}`"

**Supporting sentence:** One sentence. Names the primary service area and two or three secondary service area placeholders. Ends with a call to action referencing the phone number placeholder or the form. Do NOT use a dash to connect clauses — write as one flowing sentence using "and" or split into two short sentences.

**CTA button:** References the phone number placeholder. Format: `Call {{custom_values.company_phone_functional}}`

**Form title:** "Send us a message" (static — do not change)

### 12. FOOTER

Output the following instruction for the VA only — do not rewrite footer copy:

`[VA — Footer is inherited from the homepage snapshot. Confirm all four columns are resolving correctly. If this is the first category page for this client, double check that placeholder values are populating. See the category page build SOP for footer QA steps.]`

### 13. VA IMPLEMENTATION CHECKLIST

At the end of the copy output, print the following checklist as a clearly labelled section:

- Page URL slug — confirm it matches the TARGET CATEGORY and primary area (e.g. /gardener-southampton). Set this before adding any content.
- Homepage editorial link — confirm the homepage services section links editorially to this category page. This is how authority flows from homepage to category page.
- Service card editorial links — confirm each service card link resolves to the correct service page before go-live.
- Real work photos — minimum 3 real job photos added to the Real Work section. No stock. No AI. Flag to client if not available.
- Review widget — live GBP review widget inserted in the Reviews section. Real reviews only.
- Seasonal tasks image — real or approved stock image added to the right side of the Seasonal Tasks section.
- Neighbourhood card section — confirm all 4 cards are populated and none show placeholder text.
- FAQ format — confirm all 3 FAQs display as flat visible text, not accordion.
- Form automation — confirm quote form triggers the correct GHL pipeline.
- Phone number — confirm `{{custom_values.company_phone_functional}}` matches GBP character for character on this page.
- Address — confirm `{{custom_values.company_address}}` is visible in the footer and matches GBP character for character.
- Trust icon details — if the prompt flagged `[CLIENT TO CONFIRM]` on either trust icon, confirm details with client before go-live.
- Em dashes — check all pasted copy for em dashes or hyphens that GHL may have reintroduced. Replace with a space or comma.

---

## RULES THAT APPLY TO EVERYTHING

Every business name, phone number, city, area, category, and service reference must use the correct GHL placeholder from the custom values document — not the actual word.

Every section must feel written for this specific business, this specific category, and this specific location — not a swapped-in template.

Draw on geo research for local conditions, property types, seasonal patterns, and buying psychology. Do not invent local details.

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

Google consistency signals must be satisfied: TARGET CATEGORY placeholder + primary area placeholder in H1, services intro headline, seasonal tasks headline, reviews headline, and FAQ headline.

Any figure that appears in more than one section must be the same figure everywhere it appears. Never state two different numbers for the same fact.

**Category and service placeholder grammar:** category placeholders resolve to GBP category names which take different grammatical forms. Service placeholders resolve to service names. Because of this, never append a generic word like "services" directly after a category or service placeholder. Treat each placeholder as a complete noun phrase and build the sentence around it: "Our `{{custom_values.category_1}}` team", "as your local `{{custom_values.category_1}}`", "our `{{custom_values.service_1_1}}` approach". This applies everywhere a placeholder appears in prose.

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

This rule applies to every part of your output, including any line marked "static — do not change." If a static line contains a dash, output it WITHOUT the dash while preserving its meaning.

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
CATEGORY PAGE TEMPLATE

TARGET CATEGORY: [state the category placeholder used throughout this output]

HERO SECTION
TITLE TAG:
META DESCRIPTION:
HERO H1: [INSERT H1 FROM AHREFS]
HERO TRUST ICON 1 TEXT:
HERO TRUST ICON 2 TEXT:
ICONS TO USE:
HERO SUBHEADLINE:
HERO TRUST PILLS:
HERO BACKGROUND IMAGE:
FORM TITLE: Garden Trouble? Let Us Help.
FORM SUBMIT BUTTON: Start My Estimate

STICKY BAR
STICKY BAR LOCATION TEXT:
PHONE NUMBER:

SERVICES INTRO SECTION
SERVICES EYEBROW: WHAT WE DO
SERVICES INTRO — HEADLINE:
SERVICES INTRO — PARAGRAPH:

SERVICE CARDS
SERVICE CARD — {{custom_values.service_X_1}}:
SERVICE CARD — {{custom_values.service_X_1}} IMAGE:
SERVICE CARD — {{custom_values.service_X_2}}:
SERVICE CARD — {{custom_values.service_X_2}} IMAGE:
SERVICE CARD — {{custom_values.service_X_3}}:
SERVICE CARD — {{custom_values.service_X_3}} IMAGE:
[continue for all services under this category]

REAL WORK SECTION
REAL WORK — HEADLINE:
REAL WORK — SUBHEADLINE:
REAL WORK — IMAGE 1:
REAL WORK — IMAGE 2:
REAL WORK — IMAGE 3:

SEASONAL TASKS SECTION
SEASONAL TASKS — HEADLINE:
SEASONAL TASKS — SUBHEADLINE:
SEASONAL TASKS — SPRING:
SEASONAL TASKS — SUMMER:
SEASONAL TASKS — AUTUMN:
SEASONAL TASKS — WINTER:

LOCAL KNOWLEDGE SECTION
LOCAL KNOWLEDGE — EYEBROW: We Know {{custom_values.biz_area_1}} Gardens
LOCAL KNOWLEDGE — HEADLINE:
LOCAL KNOWLEDGE — INTRO PARAGRAPH 1:
LOCAL KNOWLEDGE — INTRO PARAGRAPH 2:
LOCAL KNOWLEDGE — CARD 1 AREA NAME:
LOCAL KNOWLEDGE — CARD 1 BODY:
LOCAL KNOWLEDGE — CARD 2 AREA NAME:
LOCAL KNOWLEDGE — CARD 2 BODY:
LOCAL KNOWLEDGE — CARD 3 AREA NAME:
LOCAL KNOWLEDGE — CARD 3 BODY:
LOCAL KNOWLEDGE — CARD 4 AREA NAME:
LOCAL KNOWLEDGE — CARD 4 BODY:

REVIEWS SECTION
EYEBROW: WHAT CLIENTS SAY ABOUT US
REVIEWS — HEADLINE:
REVIEWS — SUBHEADLINE:

FAQ SECTION
EYEBROW: FAQs
FAQ — HEADLINE:
FAQ — SUBHEADLINE:
FAQ — Q1:
FAQ — ANSWER 1:
FAQ — Q2:
FAQ — ANSWER 2:
FAQ — Q3:
FAQ — ANSWER 3:

CONTACT SECTION
EYEBROW: GET IN TOUCH
CONTACT — HEADLINE:
CONTACT — SUPPORTING SENTENCE:
CONTACT — CTA BUTTON:
FORM TITLE: Send us a message

FOOTER
[VA — Footer is inherited from the homepage snapshot. Confirm all four columns are resolving correctly. If this is the first category page for this client, double check that placeholder values are populating. See the category page build SOP for footer QA steps.]

VA IMPLEMENTATION CHECKLIST
[Print the full VA checklist from Section 13 here]
```
