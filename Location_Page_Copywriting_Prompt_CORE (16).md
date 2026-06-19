# Location Page Copywriting Prompt — CORE (All Trades)

Use this prompt inside a Claude project/chat that contains the following knowledge files:

- Client onboarding form
- Geographical Research & Context doc
- GHL custom values document/google sheet (screenshots)
- The calibration pack for this client's trade (e.g. Landscaper/Gardener Location Page Calibration Pack)

Before running, state which service area location this page is being written for. The prompt will refer to this as the TARGET LOCATION throughout.

---

## GHL CUSTOM VALUES

The GHL custom values document is included in the project knowledge. It contains every placeholder key for this client — business name, phone, address, service areas, categories, and services.

Wherever a business name, phone number, address, city, area, category, or service appears in the copy, use the exact placeholder key from that document. Do not write the actual value — write the placeholder. GHL replaces them dynamically at render.

Only use placeholders that are populated for this client. Do not output empty placeholder slots.

**If you cannot find a populated placeholder for something you need to reference** (a specific service, category, or area that should exist for this client but isn't listed with a clear key in the custom values document), do not guess a key, do not invent placeholder syntax (e.g. do not write something like `{{custom_values.service_[CONFIRM NUMBER]}}`), and do not write copy that assumes a key exists. Stop, and output a single line instead: `[HALTED — no populated custom value found for "X". Provide the correct key before this section can be generated.]`. This applies even if you are confident about what the value should logically be — confidence is not the same as the key being present and populated in the supplied document.

---

## Context

Before writing anything, read all project knowledge files in full. The onboarding form, geo research, and GBP document contain the only facts you are permitted to use. Do not invent details, credentials, pricing, timelines, or local conditions that are not confirmed in those files.

You should use the client onboarding form, Geographical Research & Context, GHL custom values document, AND the calibration pack for this client's trade when writing the copy for this location page.

---

## PROMPT

You are writing a location page for [TRADE FRAMING]. Your job is to produce conversion-focused, locally specific copy that tells Google this business operates in this specific location and understands it at a neighbourhood level — not just city level.

Before writing, read the calibration pack provided for this client's trade. It contains two things: a TRADE FRAMING line to substitute for "[TRADE FRAMING]" above, and worked examples showing the standard of local specificity, named landmarks, soil knowledge, and editorial link quality required for location pages in this trade. Match that standard throughout — do not copy the examples, write the equivalent depth for this specific client and this specific location.

The target keyword for this page is: [primary category] [TARGET LOCATION] — this must appear in the title tag, H1, and naturally throughout the body copy.

All client context — trust signals, qualifications, differentiators, local conditions — is available in the project knowledge. Pull from it directly. Do not invent details.

Wherever a business name, phone number, city, area, category, or service appears in the copy, replace it with the correct GHL placeholder from the custom values document. Do not write the actual words — write the placeholder. Every instance, every section.

---

## IDENTIFYING THE TARGET LOCATION

At the start of every run, state:

- Which `biz_area_N` placeholder corresponds to the TARGET LOCATION
- Primary category: `{{custom_values.category_1}}`
- Primary city (main area): `{{custom_values.biz_area_1}}`
- Categories to feature on this page: confirm with Ahrefs before running — only include categories with real search volume in this location

---

## YOUR OUTPUT MUST COVER THESE SECTIONS IN ORDER

### 1. TITLE TAG

Write one title tag for this location page.

Rules:
- Must include the primary category placeholder and the TARGET LOCATION placeholder
- Include one short benefit or differentiator drawn from the project knowledge — not a generic claim
- Maximum 60 characters counting the RESOLVED text the placeholders represent
- Format: `[primary category placeholder] [TARGET LOCATION placeholder] | [Short Benefit] | [business name placeholder]`
- The Short Benefit must never contain a hyphen. Write it as two or three plain words: "Same Week Starts" not "Same-Week Starts".

**Long business name fallback:** Before writing, resolve the business name placeholder and count its characters. If it is 15 characters or longer, go straight to the two-part fallback (`[primary category placeholder] [TARGET LOCATION placeholder] | [business name placeholder]`, no benefit) rather than attempting the full three-part format first. State which format you used in your pre-write reasoning. If even the two-part format risks exceeding 60 characters, write the closest compliant version once and let the character-length validation check catch and flag it — do not iterate through multiple rewrites trying to hit the limit exactly.

The title tag must lead with the primary category and the location — not the business name. The differentiator should be a real fact from the onboarding form if available. If not, use a positioning statement specific to this location rather than a generic claim.

### 2. META DESCRIPTION

Write one meta description.

Rules:
- Must include the primary category placeholder and the TARGET LOCATION placeholder
- Reference at least two specific services the business offers in this location
- Include a clear call to action referencing the phone number placeholder
- Maximum 155 characters counting the RESOLVED text the placeholders represent
- Never use a dash of any kind to connect phrases. Write as complete sentences or comma-separated phrases only.

**Priority order if everything won't fit:** primary category and TARGET LOCATION are mandatory and must never be cut. After that, if the resolved sentence is heading over 155 characters, cut in this order: (1) drop from two service references down to one, then drop the service reference entirely if still over, (2) shorten the call to action to 2-3 words instead of a full sentence (e.g. "Call [phone] today" rather than "Call [phone] to book a free site visit"), (3) drop the phone number from the meta description itself if the CTA can stand without it (e.g. "Book your free visit today") — this overrides the "referencing the phone number placeholder" instruction above when length forces a choice between the two. Do not include the business name in the meta description unless it fits naturally after the above cuts.

**Stop condition:** Write one version applying the priority order above. Do not draft multiple full attempts or talk through several candidate sentences in your reasoning — pick the cuts needed, write it once, and move on. If it still lands over 155 characters after dropping to one service reference, shortening the CTA, and dropping the phone number, output the closest version and let the character-length validation check (run separately) catch and flag it.

Name the category, name two specific services, name the location, tell them how to act. Do not waste characters on generic claims.

### 3. STICKY BAR

Location text: Format: `[TARGET LOCATION placeholder] & Surrounding Areas`

Phone number: `{{custom_values.company_phone_functional}}`

### 4. HERO SECTION

**H1:** Do not write an H1. Output the following placeholder text exactly: `[INSERT H1 FROM SOP INSTRUCTIONS]`

> ⚠️ **Reminder for the person pasting this into GHL:** the location page H1 follows the formula `[primary category] [TARGET LOCATION]` using the highest-volume Ahrefs keyword for this category and location. The H1 must follow the dash rule: no em dashes, en dashes, or hyphenated compounds.

**Trust Icons (two lines above H1):**

Two short trust icon lines. Max 5 words each. Specific, checkable facts from the onboarding form. No vague claims.

If a fact is not confirmed, write the icon using only confirmed information and append `[CLIENT TO CONFIRM: what's needed]` to the second line, not the headline. Use 'Line 1:' and 'Line 2:' as output labels, never 'Sub-line:'.

**Hero Subheadline:**

3 to 4 sentences. Must:
1. Open with a specific local condition that a homeowner in this location would recognise from their own property — pulled from the geo research for this TARGET LOCATION
2. Name at least one specific local landmark, street, village, or neighbourhood
3. Attach a real consequence to that local condition — what it means for the trade category
4. End with a call to action referencing the phone number placeholder

Do not start with the business name. Do not use banned phrases. Do not write generic benefit language. Do not repeat the H1 wording.

⚠️ SENTENCE STRUCTURE RULE: Every clause must be a separate sentence ending with a full stop. Never join two clauses with a dash. Never write "X — call us" or "X — find out more". The call to action must be its own sentence: "Call {{custom_values.company_phone_functional}} to book a free visit."

→ See the calibration pack for this client's trade for a worked example at the standard required.

**Trust Pills:**

Four short factual statements about how the business operates. Pulled from the onboarding form. Not marketing claims — real operational facts. Each pill 3 to 5 words.

### 5. SERVICES INTRO

**Eyebrow:** OUR SERVICES (static — do not change)

**Headline:** Format: "Our `{{custom_values.category_1}}` services in [TARGET LOCATION placeholder]" — use this structure exactly.

**Paragraph:** 50 to 70 words. Must:
- Reference a specific local condition from the geo research that explains why work in this location is different from the primary city
- Name the TARGET LOCATION and at least one secondary area placeholder naturally
- Feel written by someone who actually works in this area — not a template with a place name swapped in
- Not open with "We offer" or "Our team provides"
- Not repeat H1 wording

→ See the calibration pack for this client's trade for a worked example at the standard required.

### 6. SERVICE CATEGORY CARDS

Write one card for each category confirmed by Ahrefs as having real search volume in this TARGET LOCATION. Do not write cards for categories with near-zero local search volume.

For each card:

**Title:** The exact category name from the GHL custom values document (use placeholder)

**Body copy:** 60 to 80 words. Must:
- Open with a specific local condition that explains why this category matters in this location
- Name what the category actually involves in specific terms relevant to this location
- Feel different from the equivalent card on any other location page — not the same copy with the location name swapped in
- Every local condition must be distinct from the conditions used in other cards on this page

**Editorial link:** A contextual sentence linking to the location-specific category page for this location. Must name the category placeholder and the TARGET LOCATION. Not "explore service" or "find out more."

After each editorial link, output this VA annotation on a new line:
`[VA — HYPERLINK THE TEXT ABOVE. Link this to the location-specific category page for {{custom_values.category_N}} in [TARGET LOCATION]. Confirm this links to the location-specific page, NOT the primary city category page. Delete this note before publishing.]`

**Card image instruction:** `SERVICE CARD — [category placeholder] IMAGE: [Real job photo of this category type preferred. Stock photo acceptable if no client photo available. Crop to landscape ratio.]`

Rules:
- The editorial link is not optional and is not a navigation button — it is an in-copy sentence
- Each card must use a distinct local condition — do not repeat the same detail across cards
- Every local detail must trace back to the geo research document

→ See the calibration pack for this client's trade for worked examples at the standard required.

### 7. LOCAL KNOWLEDGE SECTION

**Eyebrow:** Local Knowledge (static — do not change)

**Headline:** Format: "[trade type] in [TARGET LOCATION placeholder] — what we see on the ground" — use this structure exactly, substituting the trade type naturally (e.g. "Gardening in Romsey", "Roofing in Chandlers Ford").

**Body copy:** 3 flowing paragraphs. 50 to 70 words each.

Each paragraph must:
- Cover a genuinely distinct aspect of conditions in this TARGET LOCATION — a different part of town, a different property type, a different soil or material condition, or a different seasonal pattern
- Name specific streets, landmarks, villages, or neighbourhoods from the geo research
- Feel written by someone who has worked in these properties — not a content writer describing them from a distance
- Contain practical, trade-relevant observations about what the work is actually like in this part of the location

Do not write three paragraphs that say the same thing about the same local condition. Every named detail must trace back to the geo research. No paragraph should be swappable with a paragraph from a different location page.

→ See the calibration pack for this client's trade for a worked example at the standard required.

### 8. REAL WORK SECTION

**Headline:** Format: "Real work, real [trade noun] — [TARGET LOCATION placeholder]" — use this structure exactly, substituting the trade noun naturally (e.g. "Real work, real gardens — Romsey", "Real work, real roofs — Chandlers Ford").

**Subheadline:** One sentence. Must reference the TARGET LOCATION and a surrounding area or county. Must confirm these are real job photos, not stock imagery.

**Image instructions (three photos):**
- REAL WORK — IMAGE 1: Real job photo from work in this location
- REAL WORK — IMAGE 2: Real job photo from work in this location
- REAL WORK — IMAGE 3: Real job photo from work in this location

> ⚠️ All three must be real job photos from this specific location. Photos from the primary city are not a substitute. Flag to client if location-specific photos are not available.

### 9. FAQ SECTION

**Eyebrow:** FAQ's (static — do not change)

**Headline:** Frequently Asked Questions (static — do not change)

**Subheadline:** One sentence. References the TARGET LOCATION and the primary category.

Write three FAQ questions and answers. Questions must be sourced from People Also Ask results and real search behaviour for this category in this location.

Rules for each FAQ:
- Question phrased the way a homeowner would type it or ask it
- Answer 50 to 80 words. Must contain at least one named local area, landmark, or local condition from the geo research for this TARGET LOCATION.
- At least two of the three must include an editorial link to a relevant category or service page. Link text must name the service or category and the location. Not "click here" or "find out more."
- Missing facts: write the answer using confirmed information first, then append `[CLIENT TO CONFIRM: what's missing]`.

> ⚠️ FAQ answers on location pages must be locally specific — not the same answers as the primary city category page with the location name swapped in. Each answer must contain at least one local detail specific to this TARGET LOCATION.

> ⚠️ Flat visible text is mandatory. No accordion format.

→ See the calibration pack for this client's trade for worked examples at the standard required.

### 10. CONTACT SECTION

**Eyebrow:** GET IN TOUCH (static — do not change)

**Headline:** 4 to 6 words. Action-oriented. Not generic.

**Supporting sentence:** One sentence. Must reference the TARGET LOCATION and at least one secondary area placeholder. Include a response time or booking detail if confirmed by the onboarding form. If not: `[CLIENT TO CONFIRM: response time or booking window]`. Do NOT use a dash to connect clauses — use "and" or split into two short sentences instead.

**CTA button label:** 3 to 5 words. References the phone number placeholder. Not "Submit."

### 11. FORM TITLE

Write one short heading for the quote form.

Rules:
- 4 to 6 words maximum
- Tells the visitor what the form does
- Not "Contact us" or "Get in touch"

### 12. MAP SECTION

**Eyebrow:** Find Us (static — do not change)

**Headline:** Service Area (static — do not change)

**Subheadline:** One sentence. References the TARGET LOCATION and the surrounding area or county. No generic map description. No banned phrases.

**VA note:** `Embed the GBP map using {{custom_values.google_map_embed}}. Confirm the pin shows the correct business address before go-live.`

### 13. VA IMPLEMENTATION CHECKLIST

Print this as a clearly labelled section at the end of all copy:

- Page URL slug — confirm it matches the TARGET LOCATION and primary category (e.g. /gardener-romsey). Set before adding any content.
- Homepage location bar or service areas section — confirm it links editorially to this location page.
- Service category card links — confirm each card links to the location-specific category page, NOT the primary city category page. Confirm all links resolve before go-live.
- Ahrefs check — run category keywords for this location before confirming which cards to build. Only build cards for categories with real search volume.
- Hero background image — real job photo of trade work. No stock. No AI. Flag to client if not available.
- Real Work photos — minimum 3 real job photos from this specific location. Primary city photos are not a substitute. Flag to client if unavailable.
- Local Knowledge image — real or approved stock image in the right column.
- FAQ format — confirm all 3 FAQs display as flat visible text, not accordion.
- Form automation — confirm quote form triggers the correct GHL pipeline.
- Phone number — confirm `{{custom_values.company_phone_functional}}` matches GBP character for character.
- Address — confirm `{{custom_values.company_address}}` in the footer matches GBP character for character.
- Map embed — replace any placeholder with `{{custom_values.google_map_embed}}`. Confirm pin shows correct business location.
- Trust icon assets — confirm trust icon images are uploaded and match credentials in the copy. If prompt flagged `[CLIENT TO CONFIRM]`, chase the client first.
- Em dashes — check all pasted copy for em dashes or hyphens GHL may have reintroduced. Replace with a space or comma.
- Replace all `{{custom_values}}` placeholders with correct GHL custom values. Confirm no raw placeholder keys are visible on the live page.

---

## RULES THAT APPLY TO EVERYTHING

Every business name, phone number, city, area, category, and service reference must use the correct GHL placeholder from the custom values document — not the actual word.

Every section must feel written for this specific location — not a swapped-in template. If the copy could appear on any other location page by changing one place name, it is not good enough.

Draw on geo research for local conditions, property types, seasonal patterns, and buying psychology. Every locally specific claim must trace back to the geo research document — do not invent local detail.

Do not use: "look no further", "your one-stop shop", "we pride ourselves", "we are passionate", "competitive prices", "quality service", "going above and beyond", "state of the art", "cutting edge", "second to none", "bespoke", "tailored", "comprehensive", "wide range of", "full range of", "solutions", "needs", "professional and reliable", "friendly team", "no job too big or too small", "unparalleled", "precision and care", "dedicated team", "find out more", "get in touch", "find out how we can help", "click here", "learn more", "explore our service", "see what's included", "getting in touch", "before getting in touch", "once you get in touch", "when you get in touch".

⚠️ "Full range of", "wide range of", and "tailored" are the most commonly missed banned phrases — they appear naturally when describing service scope or customisation in FAQ answers and service card copy, and the model defaults to them even when explicitly told not to. Before finalising, search specifically for these three terms and rewrite any instance found.

Concrete rewrites:
- "covers the full range of tasks that keep a garden under control" → "covers everything from regular mowing and edging to seasonal cutbacks and border maintenance" (name the actual tasks instead of saying "full range")
- "a programme tailored to soil type and lawn condition" → "a programme built around the soil type and lawn condition on site" (replace "tailored to" with "built around", "based on", or "matched to")
- General rule: whenever you're about to write "full range of X" or "wide range of X", stop and list two or three concrete examples of X instead. Whenever you're about to write "tailored to Y", replace it with "built around Y", "matched to Y", or "based on Y".

Short paragraphs. Direct language. Confident and competent tone — skilled local tradesperson, not national franchise.

**Sentence structure rule — applies to every section:** Never join two clauses with a dash (em dash or en dash). Every clause must be its own sentence. If you find yourself writing "X — Y" where X and Y are both meaningful clauses, stop and split them: "X. Y." This applies everywhere — subheadlines, intro paragraphs, FAQ answers, contact sentences, seasonal sections, local knowledge cards. The only dashes permitted anywhere in the output are hyphens inside GHL placeholder keys ({{custom_values.x}}) and hyphens in URL slugs. Everything else must be split into separate sentences.

**Bullet point rule:** Bullet points must never use a dash to add a secondary detail. Never write "• Task — extra detail" or "• Species — explanation". If a bullet needs elaboration, write it as two words or a short phrase without any dash, or move the detail into the following bullet or sentence. Example: wrong: "• Aeration — particularly on clay soils". Right: "• Aeration on clay soils before winter".

The primary category placeholder and TARGET LOCATION placeholder must appear in the title tag, H1, services intro headline, local knowledge headline, and FAQ subheadline at minimum.

**Category and service placeholder grammar:** Never append a generic word like "services" directly after a category or service placeholder. Treat each placeholder as a complete noun phrase.

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
LOCATION PAGE TEMPLATE

TARGET LOCATION: [state the biz_area placeholder used throughout this output]
PRIMARY CATEGORY: {{custom_values.category_1}}
PRIMARY CITY: {{custom_values.biz_area_1}}

HERO SECTION
TITLE TAG:
META DESCRIPTION:
HERO H1: [INSERT H1 FROM SOP INSTRUCTIONS]
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
SERVICES INTRO — EYEBROW: OUR SERVICES
SERVICES INTRO — HEADLINE:
SERVICES INTRO — PARAGRAPH:

SERVICE CATEGORY CARDS
[One block per category confirmed by Ahrefs. Repeat for each category.]
SERVICE CARD — {{custom_values.category_N}}:
SERVICE CARD — {{custom_values.category_N}} EDITORIAL LINK:
SERVICE CARD — {{custom_values.category_N}} IMAGE:

LOCAL KNOWLEDGE SECTION
LOCAL KNOWLEDGE — EYEBROW: Local Knowledge
LOCAL KNOWLEDGE — HEADLINE:
LOCAL KNOWLEDGE — PARAGRAPH 1:
LOCAL KNOWLEDGE — PARAGRAPH 2:
LOCAL KNOWLEDGE — PARAGRAPH 3:
LOCAL KNOWLEDGE — IMAGE:

REAL WORK SECTION
REAL WORK — HEADLINE:
REAL WORK — SUBHEADLINE:
REAL WORK — IMAGE 1:
REAL WORK — IMAGE 2:
REAL WORK — IMAGE 3:

FAQ SECTION
FAQ — EYEBROW: FAQ's
FAQ — HEADLINE: Frequently Asked Questions
FAQ — SUBHEADLINE:
FAQ — Q1:
FAQ — ANSWER 1:
FAQ — Q2:
FAQ — ANSWER 2:
FAQ — Q3:
FAQ — ANSWER 3:

CONTACT SECTION
CONTACT — EYEBROW: GET IN TOUCH
CONTACT — HEADLINE:
CONTACT — SUPPORTING SENTENCE:
CONTACT — CTA BUTTON:

FORM SECTION
FORM TITLE:
FORM: Send us a message

MAP SECTION
MAP — EYEBROW: Find Us
MAP — HEADLINE: Service Area
MAP — SUBHEADLINE:
MAP: Embed the Google map using {{custom_values.google_map_embed}}

FOOTER
COLUMN 1 DETAILS: {{custom_values.company_name}}
Professional {{custom_values.category_1}} in [TARGET LOCATION], {{custom_values.state}}
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
[Print the full VA checklist from Section 13 here]
```
