# Copy Quality Rubric (v20 homepage)

Every copy problem found on the Edens Edge homepage reviews of 15 and 16 Oct 2026 (Brandon's reviews, round 2 "7.5/10" and round 3 "8/10", and the problems found while fixing them), written as a pass/fail test.

The review step (`quality-review.js`) scores a generated page against this rubric. Items marked **code** are scored from the validator and the decisions; items marked **judge** are scored by a reviewer model that reads the page against the test. A page is done when **every item passes and the overall score is 8.5 or more**.

The overall score is the reviewer's 0 to 10 rating of the page as a homeowner and as Brandon would read it. Anchors: the round 2 page (services listed in the content block, cards listing 5 or 6 services, "our deck builder team", the fixed price four times, "Yes" opening the areas answer, "we don't hand jobs off") was a 7.5. The round 3 page (card picks from GBP order like tree bracing and artificial grass, three cards sharing "We also handle", "the full list is in the areas section below", "won't crack" and "stays green", "large rural properties") was an 8. A page with none of those problems, natural sentences and every section doing its own job is 9 or more.

Where a test needs a client fact that isn't on file, the page passes by leaving the claim out. It never passes by inventing the fact.

---

## H. Headings, title and meta

| ID | Test (pass when…) | Scored by | Found |
|---|---|---|---|
| H1 | The H1 is the keyword ("Landscaper Southampton"): city and trade word, no company name, no dash or hyphen, 60 characters or fewer. | code: 4a 4b 4c 4d | standing rule |
| H2 | The final CTA heading names the client's primary category or trade ("a Local Landscaper"), never another category ("Local Gardener" when the client is a landscaper). | code: decisions | round 2, item 1 |
| H3 | The meta description is one or two natural sentences: no "[keyword] from [company]" opener, only confirmed proofs, 155 characters or fewer. | code: 8, meta | 15 Oct review |
| H4 | The SEO title modifier repeats no keyword or trade word. | code: N3 | standing rule |

## E. Hero

| ID | Test | Scored by | Found |
|---|---|---|---|
| E1 | Hero sentence 1 has the keyword as a phrase ("a landscaper in Southampton"), the company token, and the hero town as a place it works ("covering Romsey and the surrounding areas"), never "Southampton, Romsey" and never "based in Romsey". | code: HERO | 14 Oct; loop 1 |
| E2 | Hero sentence 2 leads with the strongest confirmed proof the trust line hasn't used. | judge | standing rule |

## B. Content block

| ID | Test | Scored by | Found |
|---|---|---|---|
| B1 | The services paragraph links each category with a reason and lists no services ("garden makeovers, new lawns and retaining walls" fails). | code: CB-SERVICES; judge | 15 Oct review |
| B2 | Every paragraph has 4 sentences or fewer. | code: CB-PARA | round 2, item 8 |
| B3 | 200 to 250 words (300 when it expands). | code: N7 range | standing rule |
| B4 | The jobs figure stays out when it is the hero trust line. | code: TRUST-REPEAT | 14 Oct |
| B5 | Allocated neighbourhoods are facts about the area, never places the business claims to have worked. | code: WORKED | 14 Oct |
| B6 | No neighbourhood comes up in two paragraphs. | code: REPEAT-IN | 14 Oct |

## S. Service cards and "We also offer"

| ID | Test | Scored by | Found |
|---|---|---|---|
| S1 | Each card names only the services code picked for it, and never more than 3. | code: CARD-COUNT, CARD-PICK | round 2, items 2 and 9 |
| S2 | Code's picks come from the niche's core services for the category after jobs_wanted; no card leads with a specialist service (tree bracing, artificial grass) unless it is wanted; mowing and seeding sit under Lawn Care, not Gardener; no service is in two cards. | code: decisions | round 3, item 1 |
| S3 | No two cards share a sentence pattern ("Our [category] work covers…", "We also handle…"), and "We also handle" appears once on the page at most. | code: CARD-PATTERN, N13 | round 3, item 2 |
| S4 | No card calls a category a team ("our deck builder team"). | code: CAT-TEAM | round 2, item 5 |
| S5 | The city appears in two cards at most. | code: CARD-FILLER | 15 Oct review |
| S6 | "We also offer" names only services no card names, or is hidden. | code: MORE-REPEAT | 15 Oct review |
| S7 | Services in homeowner words, never the raw GBP name ("Composite decks", "Lawn mowing and maintenance"). | code: RAW-GBP | 14 Oct |
| S8 | Each linked card links its own page inside a sentence, and the link text holds the category's words. | code: CARD-LINK, LINK-TEXT | 14 Oct |
| S9 | No neighbourhoods or local conditions in cards. | code: CARD-LOCAL | 14 Oct |
| S10 | Each card says what the customer gets, in a sentence that reads naturally (no retry artefacts like "We also handle our tree service work for…"). | judge | round 3 regen |

## C. Claims and promises

| ID | Test | Scored by | Found |
|---|---|---|---|
| C1 | No working practice the client hasn't ticked: no subcontractors, "we don't hand jobs off", "every job gets our full attention", "the people who quote are the ones who do the work", "you speak to someone who knows your garden", visit schedules. | code: PRACTICE | round 2 item 7, round 3 item 5 |
| C2 | No outcome promises about the finished work ("won't crack", "stays green", "won't settle", "built to last") unless confirmed. | code: OUTCOME | round 3, item 4 |
| C3 | No experience with kinds of property or job ("large rural properties", "conservation area gardens") unless the client values say so. | code: EXPERIENCE; judge | round 3, item 5 |
| C4 | Insurance is described (what the cover is for), never an outcome ("pays out", "covers you", "the cover applies"). | code: N11 | 15 Oct review |
| C5 | Free, same day, 24/7, fixed price, deposits, waste carrier, numbers and timescales only from client values. | code: N5, NUM | standing rule |
| C6 | Never send the reader to other businesses ("get two or three quotes"). | code: RIVALS | 15 Oct |
| C7 | Step 2 names no quote method (photos, a call, a visit) when none is confirmed. | code: QUOTE-METHOD | 15 Oct review |
| C8 | Claim words ("trusted", "expert", "reliable") only with proof. | code: N5 | standing rule |
| C9 | The claims review leaves no statement about the business that the facts don't support. | judge: claims review | every run |

## P. Proofs and repetition

| ID | Test | Scored by | Found |
|---|---|---|---|
| P1 | The fixed price appears 3 times at most, counting the meta and its Why point, and never in a step. | code: PROOF-FIXED | round 2, item 3 |
| P2 | Other proofs (jobs, insurance figure) 3 times at most. | code: PROOF-REPEAT, N4 | standing rule |
| P3 | No phrase in more than two fields ("before any work begins"). | code: REPEAT-PAGE | round 2, item 4 |
| P4 | No five word run shared by two fields. | code: N21 | 14 Oct |
| P5 | Stock phrases once, words to avoid twice at most, no back to back sentence openers. | code: N23, N14, N18 | standing rule |
| P7 | "A price agreed before work starts" is step 2's point, said once more elsewhere at most. | code: PRICE-FIRST | loop 1 |
| P6 | Each idea has one home: the same point (the base under paving, a clear price before work) isn't made in several sections. | judge | 15 Oct review |

## F. FAQ

| ID | Test | Scored by | Found |
|---|---|---|---|
| F1 | The first sentence answers the question in 15 words or fewer. | code: N24 | standing rule |
| F2 | An answer to a which, what, how or why question never opens "Yes" or "No". | code: FAQ-YES | round 2, item 6 |
| F3 | Answers are 30 to 70 words. | code: N7 range | standing rule |
| F4 | No answer (and no other field) points at another part of the page ("the full list is in the areas section") or sends the reader to another page in words ("visit our paving contractor page"). | code: SELF-REF | round 3, item 3; loop 1 |
| F5 | Each answer answers the question as asked and the doubt behind it. | judge | 15 Oct review |

## A. Areas

| ID | Test | Scored by | Found |
|---|---|---|---|
| A1 | A coastal city's travel distance reads "inland and along the coast"; no compass directions. | code: COAST, COAST-DIR | 15 Oct review |
| A2 | No council areas (Test Valley, New Forest District) in the areas intro, the areas answer or the area list. | code: AREA-ADMIN, 9 | 15 Oct, round 3 |

## T. Steps and CTAs

| ID | Test | Scored by | Found |
|---|---|---|---|
| T1 | The final CTA body is one normal sentence with "we" or the customer as subject, no phone number, not opening like the CTA band or the content block closing line. | code: FINAL-CTA, N14 | 15 Oct review |
| T2 | Step bodies follow their titles and never restate the free quote, the fixed price promise or the start time. Step 2 saying a price is agreed before work starts is the step itself, not a restatement. | code: PROOF-FIXED; judge | round 2 |

## Y. Style

| ID | Test | Scored by | Found |
|---|---|---|---|
| Y1 | No em or en dashes, no hyphenated compounds, no banned phrases, client values as tokens. | code: 1a 1b 2 3a 3b 3c CVLIT TOKEN-UNIT | standing rule |
| Y2 | No sentence over 30 words; field word counts within their ranges. | code: N7 | standing rule |
| Y3 | No research wording ("investigated sites", "records show"). | code: RESEARCH-LANG | 14 Oct |
| Y4 | No gendered owner pronoun unless set; "team" only with a team size above 1. | code: N15, N12 | standing rule |
| Y6 | No padding (a sentence that could sit on any website: "there's a service here for you", "we bring that experience to every job") and no pasted research ("gardens that date mostly from 1908 to 1930", "the geology varies widely"). | judge | loop 1 |
| C10 | Memberships and logos only when verified (the page's trusted logos); manufacturer warranties only when confirmed. | code: N5 | loop 1 |
| Y7 | No field label ("card_text (Lawn Care Service):") and no talk about the data ("Because yes is confirmed", "on file") on the page. | code: LEAK | loop 8 |
| Y5 | Every sentence reads naturally to a homeowner: grammatical, no padding, no contradiction, nothing a reader would stumble on. | judge | every review |

---

## How the review step uses this

- Code items: an item fails when the validator reports any issue for its checks on the final page (BLOCK or FLAG), or when the decisions break it. Y2 fails only on sentences over 30 words or a field outside its range (the validator's 25 word soft cap is advice, not a fail).
- Judge items and the overall score come from one reviewer model call that sees this rubric, the page as a visitor reads it and the facts on file, and quotes the words behind every fail.
- C9 passes when the generation's claims review has no findings left.
