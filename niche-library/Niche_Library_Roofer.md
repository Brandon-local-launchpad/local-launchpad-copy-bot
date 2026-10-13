# Niche Library Entry: Roofer

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry). Every slot is required; an empty slot stops the run (G-NICHE).

Business type: **A (project trade)**. Emergency niche: **yes** (storm damage and active leaks). The emergency layout only switches on when the client's `[CV: emergency_primary]` is yes.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Roofing / roofing |
| trade_person / trade_person_plural | roofer / roofers |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | yes (storm damage) |
| big_ticket | yes (full roof replacements) |
| schema_subtype | RoofingContractor |

## Priority services

Placed before other homepage cards when the client offers them: Emergency Roof Repair, Roof Repair.

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) |
|---|---|
| roof, tiles, slates, ridge, chimney, flat roof, gutters, leak, damp patch, flashing, house, home | roofing system, building envelope, property (use house or home), structure, solutions, membrane (unless naming EPDM or a specific product), top quality |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| final_h2_emergency | Need a Roofer in [CITY] Now? Call [CV: phone] |

## Steps

Standard (type A):
1. **Tell Us What's Wrong.** Brief: what to tell them (what they've noticed, roughly where) and that ground level photos help. Never encourage the customer to go up a ladder.
2. **We Inspect and Show You the Problem.** Brief: a proper inspection, and the customer is shown what was found. Follows [CV: quote_method]. Never restates "free".
3. **We Fix It on a Date That Suits You.** Brief: date agreed once the quote is accepted; the work follows the quote. Never restates the start time.

Emergency (only when the emergency layout is on): Call Us / We Give You a Price and an Arrival Time / We Fix It on the Spot.

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer warranty → insurance |
| fears (in order) | 1. a cold caller or cowboy who invents problems; 2. a repair that doesn't stop the leak, so they pay twice; 3. scaffolding and extras added to the price; 4. a roof left open or a job left half done |

## Logo schemes

- **Ratings first:** Google (5+ reviews), Checkatrade, Trustpilot, Which? Trusted Traders.
- **Tier 1:** NFRC (National Federation of Roofing Contractors), CompetentRoofer, TrustMark.
- **Tier 2, manufacturer approvals:** Marley, Sika Liquid Plastics, Firestone (EPDM), Redland.
- **Tier 3:** local press and chambers, Ray's call.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | Cover figure and what it's for, with a plausible roofing example that doesn't suggest carelessness. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Yes, then the confirmed terms. | no | Trust |
| faq_3_none | What happens if the roof leaks again after a repair? | "Reasonable care and skill" standard; never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time]; if same_day_available is yes, say how urgent leaks are handled differently. | no | Timing |
| faq_5_free | Are the inspection and quote free? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method]. | no | Price |
| faq_A | Do I need scaffolding for a roof repair? | Not always: gutters, fascias and small tile repairs on two storey houses often from ladders or a tower; single storey flat roofs rarely; full re-roofs and most chimney work on two storeys usually do. Say access is settled at the quote. | no | Process |
| faq_B | Why are my gutters overflowing when it rains? | Use the assigned symptom and issue. Three distinct causes: blocked outlet or downpipe, a run that has dropped out of level, an opened joint. Then the local factor. | **yes** | Fit |
| faq_C | How long does a new roof last? | By material, as ranges with the reason; slate and clay outlast concrete; workmanship and underlay matter. | no | Timing |
| faq_D | Can my roof be repaired or does it need replacing? | The honest test: how widespread the faults are and the state of underlay and battens. | no | Fit |
| faq_planning | Do I need planning permission for a new roof? | Like for like on an unlisted house usually no; conservation areas and listed buildings can need consent, especially changing materials or chimneys. If an allocated neighbourhood is a conservation area, name it. | no | Process |
| faq_E (fallback) | Does a new roof need building regulations approval? | Replacing more than about a quarter of a roof's covering is normally treated as a renovation that has to meet current insulation standards and be signed off. Roofers in a competent person scheme can self certify; otherwise it goes through building control. **Have a roofer check this wording before it ships.** | no | Process |

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Pitched roof coverings: natural slate / clay tile / concrete tile / fibre cement slate
- Underlay: breathable membrane / traditional felt
- Flat roofs: EPDM rubber / GRP fibreglass / torch on felt / liquid applied coating
- Roofline: uPVC / timber / aluminium guttering / cast iron guttering
- Leadwork: dressed on site / lead alternatives
- Ridges and hips: dry fix / mortar bedded
- Other: scaffolding included in quotes / photos provided / roof left watertight each night / competent person scheme member

## Onboarding questions this niche needs

"From" prices and typical durations for 3 jobs (e.g. ridge repair, garage flat roof, full re-roof); whether the guarantee covers repairs as well as new roofs, and for how long; quote format and turnaround; same day callouts; manufacturer approvals.

## Section 5 alternative titles

1. **Local Experience Behind Every Job** 2. **Covered If Something Goes Wrong**

## do_not_reuse

(empty)
