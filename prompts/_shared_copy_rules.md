# Shared copy rules (every v20 page type)

The GLOBAL COPY RULES block every page prompt shares, kept as one file. Code reads it in when a prompt is loaded: CORE (16) gets it in place of its GLOBAL COPY RULES section (category-generate.js loadCore16), CORE (17) gets it appended under SHARED COPY RULES (service-generate.js loadCore17). A change here is a change to both page types. Created 25 Oct 2026 from CORE (16) v16.1, word for word (Brandon, 25 Oct: both prompts read it from here).

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
