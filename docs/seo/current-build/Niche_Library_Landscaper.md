# Niche Library Entry: Landscaper / Gardener

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads this file; the model never sees the slot names, only the resolved words.

Business type defaults to **A (project trade)**. Landscaping is a split niche: set `[CV: business_type]` per client. Mostly installs → A. Mostly maintenance → B. Mixed → A with a schedule line in step 3.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Landscaping / landscaping |
| trade_person / trade_person_plural | landscaper / landscapers |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | no |
| big_ticket | yes (full garden makeovers, patios, driveways) |
| schema_subtype | HomeAndConstructionBusiness (schema.org has no landscaper subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) |
|---|---|
| garden, back garden, front garden, lawn, patio, driveway, path, hedge, border, fence, decking | plot, site, property, grounds (unless an estate), hardscape, softscape, outdoor living space, green space, curb appeal |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| steps_emergency / final_h2_emergency | not used (emergency_niche = no) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About Your Garden**
   Brief: how to get in touch and what is useful to send first (rough size, what they want, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Visit and Price the Job**
   Brief: the visit and what gets looked at on site (levels, drainage, access, what stays and what goes). Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **We Start on a Date That Suits You**
   Brief: the start date is agreed in advance and the job runs to the agreed plan. Never restates the start time (FAQ 4 owns it). Mixed A/B clients add one line on ongoing maintenance visits.

Type B wording (maintenance led landscapers) uses the B defaults from the Homepage Structure, section 3.

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer warranty → insurance |
| fears (in order, one per Why choose us point) | 1. a firm that has not done this kind of garden before; 2. groundwork that fails later (patios that sink or hold water, fences that lean); 3. a price that grows once the job starts; 4. being left with a half finished garden and no idea what happens next |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies:** BALI (British Association of Landscape Industries), APL (Association of Professional Landscapers), TrustMark.
- **Tier 2, manufacturer approvals:** Marshalls Register, Bradstone Assured, Brett Approved Installer.
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards. Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if something is damaged during the job. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. | no | Trust |
| faq_3_none | What happens if something isn't right after the job? | Used when nothing in cover_chain other than insurance is confirmed. Answer from the "reasonable care and skill" standard every trade works to, and how to raise it. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time]. Bigger projects are booked further ahead. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does a garden landscaping project take? | Depends on size, groundwork and materials. Give the factors, not a number unless confirmed. Weather can move hard landscaping days. | no | Timing |
| faq_B | Why does water sit on my patio or lawn after rain? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words: ground underneath that drains slowly, a surface that falls the wrong way, no drain or soakaway to take the water. Then what the local ground adds, then the fix. | **yes** | Process |
| faq_C (fallback) | Is it better to lay turf or sow grass seed? | Turf gives a usable lawn sooner; seed costs less and suits larger areas but takes longer to establish. Timing matters for both. | no | Process |
| faq_D (fallback) | What is the best time of year to landscape a garden? | Hard landscaping runs most of the year in dry spells; planting and turfing do best in autumn and spring. Booking ahead for spring. | no | Timing |
| faq_planning (big ticket, only if [CV: handles_planning] confirmed) | Do I need planning permission for a patio or driveway? | Most back garden patios do not. Front driveways over 5 square metres need permeable paving or drainage into the garden, otherwise permission. Conservation areas add controls. | no | Process |

Sources for faq_A to faq_D: reworded from common People Also Ask questions for landscapers in the UK. Replace with real customer questions when Brandon or the client supplies them.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Paving: porcelain / natural stone / concrete slabs / block paving / resin bound / gravel
- Base: MOT Type 1 sub base / permeable base / concrete
- Lawns: rolled turf / seed / artificial grass
- Fencing: close board / panel / featherboard; posts in concrete / concrete spurs / metal posts
- Decking: softwood / hardwood / composite
- Other: green waste taken away / mini digger on site / design drawings provided

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every landscaping client for:
- a "from" price for 3 typical jobs (e.g. a patio, a new lawn, a regular maintenance visit);
- a typical duration for the same 3 jobs;
- whether quotes are written, and whether the price is fixed once agreed;
- team size, and who does the work on site.

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Local Experience Behind Every Job**
2. Cover → **Covered If Something Goes Wrong**

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)
