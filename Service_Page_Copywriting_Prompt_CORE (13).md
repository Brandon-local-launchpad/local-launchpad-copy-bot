# Service Page Copywriting Prompt — CORE (All Trades)

Use this prompt inside a Claude project/chat that contains the following knowledge files:

- Client onboarding form
- Geographical Research & Context doc
- GHL custom values document/google sheet (screenshots)
- The calibration pack for this client's trade (e.g. Landscaper/Gardener Service Page Calibration Pack)

Before running, state which service this page is being written for, and which parent category it sits under. The prompt will refer to these as TARGET SERVICE and PARENT CATEGORY throughout.

---

## GHL CUSTOM VALUES

The GHL custom values document is included in the project knowledge. It contains every placeholder key for this client — business name, phone, address, service areas, categories, and services.

Wherever a business name, phone number, address, city, area, category, or service appears in the copy, use the exact placeholder key from that document. Do not write the actual value — write the placeholder. GHL replaces them dynamically at render.

Only use placeholders that are populated for this client. Do not output empty placeholder slots.

**If you cannot find a populated placeholder for something you need to reference** (a specific service, category, or area that should exist for this client but isn't listed with a clear key in the custom values document), do not guess a key, do not invent placeholder syntax (e.g. do not write something like `{{custom_values.service_[CONFIRM NUMBER]}}`), and do not write copy that assumes a key exists. Stop, and output a single line instead: `[HALTED — no populated custom value found for "X". Provide the correct key before this section can be generated.]`. This applies even if you are confident about what the value should logically be — confidence is not the same as the key being present and populated in the supplied document.

---

## Context

Before writing anything, read all project knowledge files in full. The onboarding form, geo research, and GBP document contain the only facts you are permitted to use. Do not invent details, credentials, pricing, timelines, or local conditions that are not confirmed in those files.

You should use the client onboarding form, Geographical Research & Context, GHL custom values document, AND the calibration pack for this client's trade when writing the copy for this service page.

---

## PROMPT

You are writing a service page for [TRADE FRAMING]. Your job is to produce conversion-focused, locally specific copy that satisfies Google's consistency signals and builds topical relevance for this specific service.

Before writing, read the calibration pack provided for this client's trade. It contains two things: a TRADE FRAMING line to substitute for "[TRADE FRAMING]" above, and worked examples showing the standard of local specificity, real terminology, and process knowledge required for service pages in this trade. Match that standard throughout — do not copy the examples, write the equivalent depth for this specific client and this specific service.

The target keyword for this page is: [TARGET SERVICE] [primary area] — this must appear in the title tag, H1, and naturally throughout the body copy.

All client context — trust signals, qualifications, differentiators, local conditions — is available in the project knowledge. Pull from it directly. Do not invent details.

Wherever a business name, phone number, city, area, category, or service appears in the copy, replace it with the correct GHL placeholder from the custom values document. Do not write the actual words — write the placeholder. Every instance, every section.

---

## IDENTIFYING THE TARGET SERVICE AND PARENT CATEGORY

At the start of every run, state:

- Which service placeholder corresponds to the TARGET SERVICE (e.g. `{{custom_values.service_1_3}}`)
- Which category placeholder corresponds to the PARENT CATEGORY (e.g. `{{custom_values.category_1}}`)
- Primary area: `{{custom_values.biz_area_1}}`

Only write copy for the TARGET SERVICE. Do not include other services even if they are related.

---

## YOUR OUTPUT MUST COVER THESE SECTIONS IN ORDER

### 1. TITLE TAG

Write one title tag for this service page.

Rules:
- Must include the TARGET SERVICE placeholder and primary area placeholder
- Include one short benefit or differentiator drawn from the project knowledge — not a generic claim
- Maximum 60 characters counting the RESOLVED text the placeholders represent
- Format: `[TARGET SERVICE placeholder] [primary area placeholder] | [Short Benefit] | [business name placeholder]`
- The Short Benefit must never contain a hyphen. Write it as two or three plain words: "Same Week Starts" not "Same-Week Starts", "Free Site Visits" not "Free-Site-Visits".

### 2. META DESCRIPTION

Write one meta description.

Rules:
- Must include the TARGET SERVICE placeholder and primary area placeholder
- Include a clear call to action
- Reference the PARENT CATEGORY placeholder naturally
- Maximum 155 characters counting the RESOLVED text the placeholders represent
- Never use a dash of any kind to connect phrases. Write as complete sentences or comma-separated phrases only.

### 3. STICKY BAR

Location text: Format: `{{custom_values.biz_area_1}} & Surrounding Areas`

Phone number: `{{custom_values.company_phone_functional}}`

### 4. HERO SECTION

**H1:** Do not write an H1. Output the following placeholder text exactly: `[INSERT H1 FROM SOP INSTRUCTIONS]`

> ⚠️ **Reminder for the person pasting this into GHL:** service pages always use the PRIMARY location in the H1 — the exact GBP service name plus the primary location. E.g. "Lawn Mowing and Maintenance Southampton." Never the location the service page is linked from. The H1 must follow the dash rule: no em dashes, en dashes, or hyphenated compounds.

**Trust Icons (two lines above H1):**

Two short trust icon lines. Max 5 words each. Specific, checkable facts from the onboarding form — qualifications, accreditations, experience, insurance. No vague claims.

If a fact is not confirmed in the project knowledge, write the icon using only confirmed information and append `[CLIENT TO CONFIRM: what's needed]` to the second line, not to the headline itself. Output trust icon text using 'Line 1:' and 'Line 2:' as labels. Never use 'Sub-line:' as a label.

> ⚠️ Do not combine a review score with a jobs completed or customers served figure into one claim. Use each figure independently and label it correctly.

**Hero Subheadline:**

2 to 3 sentences. Must:
1. Explain what the TARGET SERVICE covers and why it matters to homeowners in this specific area
2. Reference at least one real local condition from the geo research — soil type, property type, drainage issue, or seasonal pattern — and connect it directly to why this service matters here
3. Not repeat the H1 wording
4. Not open with "We offer" or "Our team offers"

⚠️ SENTENCE STRUCTURE RULE: Every clause must be a separate sentence ending with a full stop. Never join two clauses with a dash. Never write "X — call us" or "X — find out more". If you want to add a call to action after a local detail, start a new sentence: "X. Call {{custom_values.company_phone_functional}} to book a free visit."

**Three category pills:**

Three short factual statements about what this service includes or covers. Not marketing claims — specific scope items pulled from project knowledge. Each pill 3 to 6 words.

### 5. INTRO PARAGRAPH

Write one paragraph of 60 to 90 words.

This sits directly below the hero. The visitor has landed on this page and needs to know immediately they are in the right place.

Rules:
- Must include the TARGET SERVICE placeholder and primary area placeholder
- Open with a specific local problem or scenario that triggers this service — pulled from geo research
- Explain what the service does and why it matters here specifically
- Do not open with "we", "our", or the business name
- Grade 5 reading level or below
- No dashes of any kind

### 6. MIDDLE SECTION

This section sits between the intro paragraph and the How It Works section. The label and framing change depending on the service type. Choose the correct type below and apply it.

**Service type classification:**

- **Problem-driven services** (clearance, drainage, fence repair, lawn renovation, weed control, mulching): use SIGNS SECTION
- **Maintenance services** (lawn mowing, hedge trimming, pruning, garden maintenance): use MAINTENANCE SECTION
- **Desire-driven services** (patio, decking, pond, garden design, planting design, turfing): use IS THIS RIGHT SECTION

State at the top of this section which type applies and why.

**SIGNS SECTION** (problem-driven):

Eyebrow: Write a short relevant eyebrow label specific to this service (2 to 4 words)

Headline: Write one H2. 5 to 8 words. Problem-recognition framing — signals to the visitor they are in the right place.

Body: 3 flowing paragraphs. Each paragraph covers one completely distinct sign the customer would notice visually or practically. Structure for each paragraph:
1. Name the specific sign the customer would observe
2. Explain what is causing it — using the local soil type, climate, seasonal pattern, or property type from the geo research
3. Explain why it matters for this specific service and this specific location

The local detail must explain the cause — not just appear as decoration. Named local areas, weed species, soil types, property patterns, and seasonal conditions from the geo research must appear naturally within the reasoning. Every sign must be something the customer could observe themselves. Do not repeat any point from the intro paragraph.

→ See the calibration pack for this client's trade for a worked example at the standard required.

**MAINTENANCE SECTION** (maintenance services):

Eyebrow: Write a short relevant eyebrow label (2 to 4 words)

Headline: Write one H2. 5 to 8 words. Frames why consistent maintenance matters for this specific service in this location.

Body: 3 flowing paragraphs. Each covers a distinct maintenance scenario or timing consideration specific to this location. Structure:
1. Name the specific maintenance situation or seasonal window
2. Explain what happens if this is missed — using local conditions from the geo research
3. Explain what the correct approach looks like for this location

Named local conditions, seasonal patterns, and property types from the geo research must appear naturally within the reasoning. Do not repeat any point from the intro paragraph.

→ See the calibration pack for this client's trade for a worked example at the standard required.

**IS THIS RIGHT SECTION** (desire-driven):

Eyebrow: Write a short relevant eyebrow label (2 to 4 words)

Headline: Write one H2. 5 to 8 words. Helps the visitor confirm this service is what they are looking for.

Body: 3 flowing paragraphs. Each covers a distinct scenario where this service is the right choice — or where local conditions make it particularly relevant. Structure:
1. Describe a specific situation or desire the visitor might have
2. Explain how this service addresses it — using specific product types, techniques, or approaches
3. Connect to a local condition from the geo research where relevant

→ See the calibration pack for this client's trade for a worked example at the standard required.

**Rules that apply to all three middle section types:**
- Flowing paragraphs only. No bullet points.
- No dashes of any kind.
- Grade 5 reading level or below.
- Each paragraph must add new information — do not repeat points already made.
- Every local detail must trace back to the geo research document.

### 7. HOW IT WORKS SECTION

**Headline:** Format: "How Our `{{custom_values.[TARGET SERVICE key]}}` Service Works" — use this structure exactly.

Write 3 to 4 flowing paragraphs. Each paragraph covers one distinct stage of the process.

Structure for each paragraph:
1. Describe what happens at this stage
2. Explain the reasoning behind it — what goes wrong if this stage is skipped or done incorrectly
3. Where relevant, explain how local conditions from the geo research affect how this stage is carried out

Rules:
- Do not number paragraphs. Do not use bullet points.
- Do not start any paragraph with "Getting started is straightforward" or any variation.
- Every paragraph must contain at least one piece of reasoning specific to this service or this location.
- Named locations, soil types, species, seasonal patterns from the geo research must appear naturally where they explain process decisions.
- No filler. Start each paragraph at the point of substance.
- Grade 5 reading level or below. No dashes of any kind.

→ See the calibration pack for this client's trade for a worked example at the standard required.

### 8. FAQ SECTION

**Eyebrow:** FAQ's (static — do not change)

**Headline:** Frequently Asked Questions (static — do not change)

**Subheadline:** One sentence. References the TARGET SERVICE and the primary area.

Write five FAQ questions and answers. These should be the questions a homeowner in `{{custom_values.biz_area_1}}` would actually ask before booking the TARGET SERVICE.

Cover these five areas in this order:
1. What the service includes / scope
2. A locally specific concern tied to a condition in this area
3. Timing or frequency
4. Pricing signals (without stating prices) or what affects the cost
5. What happens next / how to book

Rules for each FAQ:
- Question phrased the way a homeowner would type it or ask it out loud
- Answer 2 to 4 sentences. Specific facts only — from onboarding form and geo research. Do not invent figures.
- At least two of the five must include an editorial link to a related category or service page. Link text must name the service or category placeholder and the primary area placeholder. Never link back to this page.
- Missing facts: write the answer using confirmed information first, then append `[CLIENT TO CONFIRM: what's missing]`. The flag must never be the entire answer.

> ⚠️ FAQs must display as flat visible text — not collapsed in an accordion. Googlebot cannot click to expand collapsed elements. If the GHL template defaults to accordion, the VA must override it.

### 9. CONTACT SECTION

**Eyebrow:** GET IN TOUCH (static — do not change)

**Headline:** 4 to 6 words. Action-oriented and specific to this service — not generic.

**Supporting sentence:** One sentence. Reference the primary area placeholder and at least one secondary area placeholder. Include a response time or booking detail if the onboarding form confirms one. If not confirmed: `[CLIENT TO CONFIRM: response time or booking window]`. Do NOT use a dash to connect clauses in this sentence — write it as one flowing sentence using "and" or a full stop instead. Example: "{{custom_values.company_name}} covers {{custom_values.biz_area_1}}, {{custom_values.biz_area_2}} and {{custom_values.biz_area_3}}. Call {{custom_values.company_phone_functional}} to arrange a free site visit."

**CTA button label:** 3 to 5 words. Not "Submit." Tell the visitor what happens next.

### 10. FORM TITLE

Write one short heading for the quote form.

Rules:
- Reference the TARGET SERVICE placeholder and primary area placeholder
- 5 to 7 words maximum
- Action-oriented
- Format: "Get a Quote for `{{custom_values.[TARGET SERVICE key]}}` in `{{custom_values.biz_area_1}}`" or similar

### 11. VA IMPLEMENTATION CHECKLIST

Print this as a clearly labelled section at the end of all copy:

- Page URL slug — confirm it matches the service and primary area (e.g. /lawn-mowing-southampton). Set before adding any content.
- Parent category editorial link — confirm the parent category page has an editorial link in the relevant service card pointing to this service page.
- Hero background image — real job photo of this specific service. No stock. No AI. Flag to client if not provided.
- Middle section image — one real or approved stock photo in the right column.
- How It Works image(s) — one or two real job photos in the left column.
- FAQ format — confirm all 5 FAQs display as flat visible text, not accordion.
- Form title — confirm it is specific to this service and location, not copied from another page.
- Form automation — confirm quote form triggers the correct GHL pipeline.
- Service schema markup — add service schema for this specific service.
- Service name cross-check — confirm the service name on this page matches the exact GBP service name character for character.
- Phone number — confirm `{{custom_values.company_phone_functional}}` matches GBP character for character.
- Address — confirm `{{custom_values.company_address}}` is visible in the footer and matches GBP character for character.
- Trust icon assets — confirm trust icon images are uploaded in GHL and match the credentials in the copy. If prompt flagged `[CLIENT TO CONFIRM]`, chase the client first.
- Placeholder numbering — confirm `{{custom_values.service_[N]}}` and `{{custom_values.category_[N]}}` use the correct numbered placeholders for this service and category.
- Em dashes — check all pasted copy for em dashes or hyphens GHL may have reintroduced. Replace with a space or comma.

---

## RULES THAT APPLY TO EVERYTHING

Every business name, phone number, city, area, category, and service reference must use the correct GHL placeholder from the custom values document — not the actual word.

Every section must feel written for this specific service in this specific location — not a swapped-in template. If the copy could appear on any other service page by changing one place name, it is not good enough.

Draw on geo research for local conditions, property types, seasonal patterns, and buying psychology. Every locally specific claim must trace back to the geo research document — do not invent local detail.

Do not use: "look no further", "your one-stop shop", "we pride ourselves", "we are passionate", "competitive prices", "quality service", "going above and beyond", "state of the art", "cutting edge", "second to none", "bespoke", "tailored", "comprehensive", "wide range of", "full range of", "solutions", "needs", "professional and reliable", "friendly team", "no job too big or too small", "find out more", "get in touch", "find out how we can help", "click here", "learn more", "explore our service", "see what's included", "getting in touch", "before getting in touch", "once you get in touch", "when you get in touch".

⚠️ "Full range of", "wide range of", and "tailored" are the most commonly missed banned phrases — they appear naturally when describing service scope or customisation in FAQ answers and service card copy, and the model defaults to them even when explicitly told not to. Before finalising, search specifically for these three terms and rewrite any instance found.

Concrete rewrites:
- "covers the full range of tasks that keep a garden under control" → "covers everything from regular mowing and edging to seasonal cutbacks and border maintenance" (name the actual tasks instead of saying "full range")
- "a programme tailored to soil type and lawn condition" → "a programme built around the soil type and lawn condition on site" (replace "tailored to" with "built around", "based on", or "matched to")
- General rule: whenever you're about to write "full range of X" or "wide range of X", stop and list two or three concrete examples of X instead. Whenever you're about to write "tailored to Y", replace it with "built around Y", "matched to Y", or "based on Y".

Short paragraphs. Direct language. Confident and competent tone — skilled local tradesperson, not national franchise.

**Sentence structure rule — applies to every section:** Never join two clauses with a dash (em dash or en dash). Every clause must be its own sentence. If you find yourself writing "X — Y" where X and Y are both meaningful clauses, stop and split them: "X. Y." This applies everywhere — subheadlines, intro paragraphs, FAQ answers, contact sentences, seasonal sections, local knowledge cards. The only dashes permitted anywhere in the output are hyphens inside GHL placeholder keys ({{custom_values.x}}) and hyphens in URL slugs. Everything else must be split into separate sentences.

**Bullet point rule:** Bullet points must never use a dash to add a secondary detail. Never write "• Task — extra detail" or "• Species — explanation". If a bullet needs elaboration, write it as two words or a short phrase without any dash, or move the detail into the following bullet or sentence. Example: wrong: "• Aeration — particularly on clay soils". Right: "• Aeration on clay soils before winter".

The TARGET SERVICE placeholder and primary area placeholder must appear in the H1, intro paragraph, signs/maintenance/IS THIS RIGHT section, and contact section at minimum.

**Category and service placeholder grammar:** Never append a generic word like "services" directly after a category or service placeholder. Treat each placeholder as a complete noun phrase and build the sentence around it.

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
SERVICE PAGE TEMPLATE

TARGET SERVICE: [state the service placeholder used throughout this output]
PARENT CATEGORY: [state the category placeholder]
PRIMARY AREA: {{custom_values.biz_area_1}}

HERO SECTION
TITLE TAG:
META DESCRIPTION:
HERO H1: [INSERT H1 FROM SOP INSTRUCTIONS]
HERO TRUST ICON 1 TEXT:
HERO TRUST ICON 2 TEXT:
ICONS TO USE:
HERO SUBHEADLINE:
HERO PILLS:
HERO TRUST BADGES:
HERO BACKGROUND IMAGE:
FORM TITLE: Garden Trouble? Let Us Help.
FORM SUBMIT BUTTON: Start My Estimate

STICKY BAR
STICKY BAR LOCATION TEXT:
PHONE NUMBER:

INTRO PARAGRAPH:

MIDDLE SECTION
[State which type applies: SIGNS SECTION / MAINTENANCE SECTION / IS THIS RIGHT SECTION]
[SECTION TYPE] — EYEBROW:
[SECTION TYPE] — HEADLINE:
[SECTION TYPE] — BODY:
[SECTION TYPE] — IMAGE:

HOW IT WORKS SECTION
HOW IT WORKS — HEADLINE:
HOW IT WORKS — BODY:
HOW IT WORKS — IMAGE 1:
HOW IT WORKS — IMAGE 2:

FAQ SECTION
EYEBROW: FAQ's
HEADLINE: Frequently Asked Questions
FAQ — SUBHEADLINE:
FAQ — Q1:
FAQ — ANSWER 1:
FAQ — Q2:
FAQ — ANSWER 2:
FAQ — Q3:
FAQ — ANSWER 3:
FAQ — Q4:
FAQ — ANSWER 4:
FAQ — Q5:
FAQ — ANSWER 5:

CONTACT SECTION
CONTACT — EYEBROW: GET IN TOUCH
CONTACT — HEADLINE:
CONTACT — SUPPORTING SENTENCE:
CONTACT — CTA BUTTON:

FORM SECTION
FORM TITLE:
FORM: Send us a message

FOOTER
[VA — Footer is inherited from the snapshot. Confirm all four columns are resolving correctly. See the service page build SOP for footer QA steps.]

VA IMPLEMENTATION CHECKLIST
[Print the full VA checklist from Section 11 here]
```
