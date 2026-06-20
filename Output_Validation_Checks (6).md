# Output Validation Checks — Reference for Railway

These run against the raw text output from the Anthropic API call, before any GHL paste/substitution happens — so `{{custom_values.x}}` placeholders are expected to appear literally in the output, and checks should be written with that in mind.

Each check has a classification:

- **BLOCK** — this must be resolved before the page is marked done. Surface it prominently.
- **FLAG** — surface it for a quick human look, but don't stop the run. Mostly used where false positives are possible.

Patterns are written as standard regex (case-insensitive flag `i` assumed unless noted). They're language-agnostic — adapt syntax for Python (`re`) or JS (`RegExp`) as needed.

---

## 1. Dash Rule

**Scope for checks 1a and 1b:** Run these checks ONLY against the content inside the template output block — i.e. the text between the opening ` ``` ` and closing ` ``` ` code fence markers in the copy output. Do NOT run them against the model's pre-write reasoning, classification notes, placeholder declarations, or any text outside the fenced block. The model's reasoning will often contain hyphens (e.g. "schedule-driven", "desire-driven", "pre-write") — these are internal notes, not copy, and should not trigger validation failures.

**Additional exclusion for em dashes specifically (1a):** Within the fenced block, several template structures use an em dash as a structural separator by design rather than as prose punctuation — this is not the violation the rule targets and must not be flagged. Before running 1a, strip these line types the same way Check 6a's implementation note already does:
- Section label lines matching `^[A-Z0-9 /_\-]+ — [A-Z]` (e.g. `SIGNS SECTION — EYEBROW:`, `CONTACT — EYEBROW: GET IN TOUCH`, `HOW IT WORKS — BODY:`)
- VA annotation lines beginning with `[VA` (e.g. `[VA — Real photo of ground preparation...]`), including the dash that follows `[VA`

Only after stripping these structural lines should the remaining prose be checked for em/en dashes. An em dash inside a sentence of actual generated copy (Services Section body, FAQ answers, Hero Subheadline, etc.) is the real violation this rule exists to catch — an em dash separating a template label from its field name is not.

### 1a. Em dash / en dash

**Pattern:** `[—–]`

**Classification:** BLOCK

**Action:** Any match inside the template block fails. Report the matched line with the character highlighted so it's easy to find and rewrite.

### 1b. Hyphenated compound words

**Pattern:** `\b[A-Za-z]+-[A-Za-z]+\b`

**Classification:** FLAG

**Scope:** Template block only (see above). Excludes GHL placeholder strings (`{{custom_values.x}}`), URL slugs, and VA annotation lines beginning with `[VA`.

**Notes:** This will also match things like "Mon-Fri" if they ever appear in generated prose, but opening hours come from the onboarding form as data, not AI prose, so this is unlikely to fire on legitimate content. If it ever flags a genuine non-prose data label, that's fine to dismiss — the rule exists to catch things like "well-maintained," "no-obligation," "construction-grade," "Estate-Experienced," "long-lasting," all of which were found on the live Eden's Edge page.

---

## 2. Banned Phrases

**List (case-insensitive substring match):**

```
look no further
your one-stop shop
we pride ourselves
we are passionate
competitive prices
quality service
going above and beyond
state of the art
cutting edge
second to none
bespoke
tailored
comprehensive
wide range of
full range of
professional and reliable
friendly team
no job too big or too small
```

**Classification:** BLOCK for all of the above.

### 2a. "solutions" and "needs"

**Pattern:** `\bsolutions\b`, `\bneeds\b`

**Classification:** FLAG

**Notes:** These two are split out because category/service names sometimes legitimately contain these words (e.g. a category called "Drainage Solutions"). Since the AI's raw output should contain `{{custom_values.category_x}}` as a literal placeholder rather than the resolved category name, a hit here is very likely the AI's own word choice in prose rather than a category name — but flag rather than block in case a client onboarding form or geo research excerpt was quoted verbatim and happened to contain one of these words.

### 2b. "passionate" (standalone)

**Pattern:** `\bpassionate\b`

**Classification:** BLOCK

**Notes:** Catches both "we are passionate" (already in the main list) and third-person phrasing like "genuinely passionate about the work," which is the same violation in spirit. This was found in the live Meet the Team headline.

---

## 3. Placeholder Leak Detection

### 3a. Unresolved confirmation flags presented as a complete answer

**Pattern:** `\[CLIENT TO CONFIRM`

**Classification:** BLOCK if this pattern appears and there is no other substantive text in the same field before it (i.e. the flag IS the answer). FLAG (expected, informational) if it appears appended after at least one full sentence of real content — this is the correct pattern per the FAQ and Trust Bar rules.

**Implementation note:** a simple heuristic — split the field on `[CLIENT TO CONFIRM`, and check whether the text before it contains at least one sentence (a `.` followed by a space or end of string, with more than ~15 characters before the `[`). If not, BLOCK. The live Eden's Edge insurance FAQ — where `[CLIENT TO CONFIRM — Ethan did not complete...]` was the entire answer — is the case this is designed to catch.

### 3b. Generic AI/template leftovers

**Pattern:** `(Put your image|Lorem ipsum|\[INSERT|Client copy goes here|\[TODO)`

**Classification:** BLOCK

**Whitelist exception:** The string `[INSERT H1 FROM SOP INSTRUCTIONS]` is a valid intentional placeholder instructed by the service page and location page prompts — it is NOT an unresolved leftover. Before running the `\[INSERT` pattern, strip this exact string from the text being checked.

### 3c. Unknown or unpopulated custom value placeholders

**Scope:** this check applies ONLY to placeholders appearing in freely-generated prose sections — Title Tag, Meta Description, Hero Subheadline, Services Section body copy, FAQ answers, Meet the Team body, and the Schema business description. It does NOT apply to placeholders that are part of fixed template lines (the Map section, VA Implementation Checklist, Footer structure, Schema notes) — these reference keys like `google_map_embed` and `company_address` that are expected by the template regardless of whether they're populated yet for this client. Checking those would produce constant false positives on every client until those fields are filled in during the build, which is a separate step from copy generation.

**Implementation note — this is currently misfiring, fix before relying on it:** a recent run BLOCKed on `google_map_embed` inside the Map section, which this scope rule explicitly says should never happen. Before extracting placeholders to check, the script must first isolate only the named in-scope sections above by their field labels (e.g. everything under `TITLE TAG:`, `META DESCRIPTION:`, `HERO SUBHEADLINE:`, the Services Section body paragraphs, `FAQ — ANSWER N:`, `MEET THE TEAM` body, `SCHEMA` business description) and discard everything else in the block — including the Map section, VA Implementation Checklist, Footer, and Schema notes block — before running the placeholder-key comparison. If the current implementation is instead scanning the entire fenced block for `{{custom_values.X}}` occurrences and only excluding a few specific keys by name, that approach will keep breaking every time a new fixed-template key is introduced. Scope to the named sections, not an exclusion list of keys.

**Logic (not a single regex):**

1. Extract every `{{custom_values.X}}` occurrence from the in-scope sections only.
2. Compare the set of `X` keys found against the list of populated keys from this client's custom values sheet.
3. Any key used that is NOT in the populated list → BLOCK (either a typo'd placeholder name, or the model referenced a category/area/service slot that isn't populated for this client — both need fixing).

---

## 4. H1 Checks

These run on the H1 value supplied as input data for this page (from Ahrefs research), not on AI-generated output — but they're the same dash/length/content checks, just applied earlier in the pipeline.

### 4a. Dash check

Reuse 1a and 1b against the H1 string. **Classification:** BLOCK (1a), FLAG (1b).

### 4b. Length check

**Logic:** `H1.length > 45` → FLAG, with message "longer than the [category] [area] formula — consider moving extra positioning (tagline, benefit, company name) into the subheadline instead."

**Notes:** "Gardener Southampton" is 20 characters. "Edens Edge landscaping Gardening Services in Southampton – built & maintained" (the live H1) is 78. 45 gives reasonable headroom for slightly longer category names (e.g. "Landscape Gardener Chandlers Ford" is 34) without letting a full sentence through.

### 4c. Contains category and area

**Logic:** `H1.toLowerCase()` should contain both (a) the plain-text name of this page's own subject category/service and (b) the plain-text name of this page's own subject area, as substrings. **Classification:** FLAG if either is missing.

**Which values to check against — this is page-type dependent, not always the primary category/area:**

| Page type | Category/service value to check | Area value to check |
|---|---|---|
| Homepage | Primary category | Primary area |
| Category page | This page's TARGET CATEGORY | Primary area (unless the category page is also location-specific, see location-category row) |
| Service page | This page's TARGET SERVICE | Primary area |
| Location page | Primary category | This page's TARGET LOCATION |
| Location-category page | This page's TARGET CATEGORY | This page's TARGET LOCATION |

**Why this matters:** A service page for "Grass seeding" correctly has an H1 like "Grass seeding Southampton" — it should never be checked against the primary category name (e.g. "Gardener"), only against its own service name. Checking every page type against the primary category/area unconditionally produces a FLAG on nearly every non-homepage page, which is not a real issue — it is the check applying homepage logic everywhere. Pull "this page's own subject" from the same page-type metadata already used to populate the PAGE TYPE / TARGET SERVICE / TARGET CATEGORY / TARGET LOCATION fields at the top of each page's output block, not from the primary category/area fields used for the homepage.

### 4d. Does not contain company name

**Logic:** `H1.toLowerCase()` should NOT contain the company name as a substring. **Classification:** BLOCK — this is the exact pattern of the "Edens Edge landscaping Gardening Services in Southampton" H1, which the reminder note in the prompt explicitly says not to do.

---

## 5. Conflation Rule (review score vs. jobs/customers figure)

### 5a. Same-sentence conflation

**Pattern:** `\d\.\d[\s-]*star[^.]{0,80}(\d+\+?\s*(customers|clients|jobs|projects|gardens|homes))`

**Classification:** BLOCK

**Notes:** This catches "4.9 star rated by 800+ customers" and "4.9-star, trusted by 800+ clients" type constructions within roughly one sentence (80 chars is a loose sentence-length bound — adjust if it's too tight/loose in practice). This was the exact live bug found in the hero badges.

### 5b. Cross-section consistency

**Logic (not a regex):**

1. Extract the number from `GOOGLE REVIEWS COUNT / SUB-LINE` (e.g. "120" from "Based on 120+ Google reviews").
2. Search the Hero Trust Badges, Hero Trust Icon text, and Trust Bar fields for any number adjacent to the word "review" or "reviews" (pattern: `(\d+)\+?\s*(google )?reviews?`).
3. If any such number is found and does NOT match the number from step 1 → BLOCK, message: "Review count appears as two different figures — must be the same number everywhere."

**Notes:** This does not block a jobs/customers figure appearing on its own (e.g. "800+ gardens maintained") — only blocks when a *review count* figure is inconsistent across sections.

---

## 6. Weak Link Text

### 6a. Banned link phrases

**Scope:** Run this check ONLY against the content inside the template output block — i.e. the text between the opening ` ``` ` and closing ` ``` ` code fence markers in the copy output — specifically the Services Section body copy and FAQ answers within that block. Do NOT run against the model's pre-write reasoning, classification notes, placeholder declarations, or any text outside the fenced block. Do NOT run against section label lines, eyebrow labels, or VA annotation lines within the block.

**Notes:** The model's pre-write reasoning routinely lists out the banned phrase set as a self-check step (e.g. "After drafting, I will scan for: ... 'find out more', 'get in touch', 'click here' ..."). This is the model reciting the rule, not using the phrase in copy, and must not be matched. This is the same false-positive shape the Dash Rule (Check 1) already excludes reasoning text for — Check 6a needs the identical exclusion. If this scope restriction isn't already implemented, re-run any prior results: a single page's reasoning block can trigger 5-6 simultaneous false BLOCKs from one self-check sentence, which will dominate the BLOCK count and bury genuinely real hits elsewhere in the output.

**List (case-insensitive substring match):**

```
find out more
see what's included
get in touch
find out how we can help
click here
learn more
explore our service
```

**Classification:** BLOCK

**Implementation note:** Before running this check, remove all lines that:
- Match the pattern `^[A-Z0-9 /_\-]+:` (template label lines such as `CONTACT — EYEBROW: GET IN TOUCH`, `EYEBROW: FAQ's`, `HEADLINE:`, etc.)
- Begin with `[VA` (VA annotation lines)
- Are inside ` ``` ` fenced blocks that contain only template structure labels (not prose)

Then run the banned phrase check only against the remaining prose sentences. This ensures `CONTACT — EYEBROW: GET IN TOUCH` is never flagged, as it is a hardcoded static template label across all page types.

### 6b. Editorial link presence and specificity

**Logic:** For each Services Section category block (`1 - SERVICES {{custom_values.category_N}}` through however many are populated), check that the body copy text contains, within its last 1-2 sentences, a reference to `{{custom_values.category_N}}` (the same N as the block) AND a reference to `{{custom_values.biz_area_` (any area placeholder). **Classification:** BLOCK if either is missing — this means the block has no editorial link, or the link doesn't name both the category and the area.

### 6c. FAQ editorial link count

**Logic:** Across FAQ ANSWER 1 through FAQ ANSWER 5, count how many answers contain EITHER:
- At least one `{{custom_values.category_` reference alongside a `{{custom_values.biz_area_` reference anywhere within the full answer text, OR
- At least one `{{custom_values.service_` reference alongside a `{{custom_values.biz_area_` reference anywhere within the full answer text

The category/service reference and the area reference do NOT need to be in the same sentence — they just need to both appear somewhere within the answer block for that FAQ. An answer that says "...find out everything covered in our {{custom_values.category_1}} service in {{custom_values.biz_area_1}}" qualifies, even if those placeholders appear in the final sentence of a multi-sentence answer.

**Classification:** FLAG if the qualifying answer count is less than 2.

### 6d. FAQ self-link (manual note, not automatable here)

Whether an FAQ's editorial link points back to the page it's on depends on the actual href the VA assigns when pasting — the AI's text output doesn't specify hrefs. This can't be checked from the text alone. Keep this as a line item in the VA checklist rather than an automated check: "confirm FAQ editorial links point to a category page, not back to this page."

---

## 7. Title Tag Length

**Logic (not a regex):** Resolve every `{{custom_values.X}}` placeholder in the TITLE TAG field to its actual value from the custom values input, then measure the resolved string's character length.

**Classification:** FLAG if length > 60.

**Message:** "Title tag is N characters once resolved (limit 60) — Google will truncate this in search results. Trim the 'Key Benefit' portion first; category, area, and company name take priority."

**Notes:** this is deliberately a code-side check rather than a prompt instruction. Character counting isn't something models do reliably — the same prompt instruction has been given twice and the model produced a 76-character title tag both times. Catching this in validation, where the count is exact, is more reliable than asking the model to self-correct.

## 8. Meta Description Length

Same logic as check 7, applied to the META DESCRIPTION field. **Classification:** FLAG if resolved length > 155.

## 9. Areas We Cover Completeness

**Logic (not a regex):**

1. From the custom values input, find every populated `biz_area_N` key.
2. Check the "AREAS WE COVER — AREA LIST" output field contains a `{{custom_values.biz_area_N}}` reference for every one of those keys.
3. Any populated area missing from the list → BLOCK, message: "Area list is missing biz_area_N — every populated service area must appear here."

**Notes:** this does not apply to the Footer's service area column, which is explicitly limited to biz_area_1 through biz_area_6 by design. It also doesn't require FAQ answers to list every area — FAQ answers can legitimately say "...and surrounding areas" without enumerating all of them. This check is specifically for the Areas We Cover bar, where the prompt's own rule already requires every populated area to be listed. The highest-numbered area has been dropped from this list in both test generations so far — worth checking this one specifically.

---

## Summary table

| # | Check | Classification |
|---|---|---|
| 1a | Em/en dash | BLOCK |
| 1b | Hyphenated compound | FLAG |
| 2 | Banned phrase list | BLOCK |
| 2a | "solutions" / "needs" | FLAG |
| 2b | "passionate" | BLOCK |
| 3a | `[CLIENT TO CONFIRM` as entire answer | BLOCK (FLAG if appended to real content) |
| 3b | Generic placeholder leftovers | BLOCK |
| 3c | Unknown/unpopulated custom value key | BLOCK |
| 4a | H1 dash | BLOCK / FLAG |
| 4b | H1 length > 45 | FLAG |
| 4c | H1 missing category or area | FLAG |
| 4d | H1 contains company name | BLOCK |
| 5a | Star rating + customer count same sentence | BLOCK |
| 5b | Review count mismatch across sections | BLOCK |
| 6a | Weak link phrase | BLOCK |
| 6b | Missing/non-specific editorial link per category block | BLOCK |
| 6c | Fewer than 2 FAQ editorial links | FLAG |
| 6d | FAQ self-link | Manual VA checklist item |
| 7 | Title tag resolved length > 60 | FLAG |
| 8 | Meta description resolved length > 155 | FLAG |
| 9 | Areas We Cover missing a populated area | BLOCK |
