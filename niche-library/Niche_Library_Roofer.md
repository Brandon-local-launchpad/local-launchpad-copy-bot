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
| cta_band_line | Tell us what's wrong with your roof and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us what's wrong with your roof and we'll get back to you. |
| final_h2_emergency | Need a Roofer in [CITY] Now? Call [CV: phone] |

## Steps

Standard (type A):
1. **Tell Us What's Wrong.** Brief: what to tell them (what they've noticed, roughly where) and that ground level photos help. Never encourage the customer to go up a ladder.
2. **We Inspect and Show You the Problem.** (only when the `site_visit_before_quote` practice is confirmed) Brief: a proper inspection, and the customer is shown what was found. Follows [CV: quote_method]. Never restates "free".
   Without the practice (`step_2_no_visit`): **We Price Your Job.** Brief: a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when it is blank, name no method at all (no photos, call, video, inspection or visit). Never mention going on the roof before the quote. Never restates "free".
3. **We Fix It on a Date That Suits You.** Brief: date agreed once the quote is accepted, to suit the customer. Never mention the price or changes to the work (step 2 and Why choose us own them). Never restates the start time.

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
| faq_3_none | What happens if the roof leaks again after a repair? | Open with what the customer does: tell us and we'll look at it. Then the "reasonable care and skill" standard, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given; if same_day_available is yes, say how urgent leaks are handled differently. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_free_inspection | Are the inspection and quote free? | Used instead of faq_5_free only when free_quotes = yes and free_inspection = yes. From [QUOTE_FREE], [CV: free_inspection] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method]. | no | Price |
| faq_A | Do I need scaffolding for a roof repair? | Not always: gutters, fascias and small tile repairs on two storey houses often from ladders or a tower; single storey flat roofs rarely; full re-roofs and most chimney work on two storeys usually do. Say access is settled at the quote. | no | Process |
| faq_B | Why are my gutters overflowing when it rains? | Use the assigned symptom and issue. Three distinct causes: blocked outlet or downpipe, a run that has dropped out of level, an opened joint. Then the local factor. | **yes** | Fit |
| faq_C | How long does a new roof last? | By material, as ranges with the reason; slate and clay outlast concrete; workmanship and underlay matter. | no | Timing |
| faq_D | Can my roof be repaired or does it need replacing? | The honest test: how widespread the faults are and the state of underlay and battens. | no | Fit |
| faq_planning | Do I need planning permission for a new roof? | Like for like on an unlisted house usually no; conservation areas and listed buildings can need consent, especially changing materials or chimneys. If an allocated neighbourhood is a conservation area, name it. | no | Process |
| faq_E (fallback) | Does a new roof need building regulations approval? | Usually yes for a full re-roof. The Planning Portal says an application isn't normally needed only when less than 25% of the building's whole outer envelope **and** less than 50% of the roof is affected; a change to a significantly heavier or lighter covering (around 15% or more) needs approval anyway, and re-covering should improve the insulation. A roofer in a competent person scheme (e.g. NFRC CPS) can self certify; otherwise it goes through building control. Source: planningportal.co.uk (building regulations, work to an existing roof). | no | Process |

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Pitched roof coverings: natural slate / clay tile / concrete tile / fibre cement slate
- Underlay: breathable membrane / traditional felt
- Flat roofs: EPDM rubber / GRP fibreglass / torch on felt / liquid applied coating
- Roofline: uPVC / timber / aluminium guttering / cast iron guttering
- Leadwork: dressed on site / lead alternatives
- Ridges and hips: dry fix / mortar bedded
- Other: scaffolding included in quotes / photos provided / roof left watertight each night / competent person scheme member

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

re-roofing, new roof, roof replacement, roof repair, flat roofing, flat roof, leadwork, lead flashing, chimney repointing, chimney repair, chimney removal, gutter cleaning, guttering, gutter repair, fascias, soffits, ridge repair, dry ridge, dry verge, valley repair, skylight, roof window, roof inspection, roof survey, moss removal, roof cleaning, emergency repair, storm damage, loft insulation, tile replacement, slate replacement

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| fascia | fascias and soffits |
| soffit | fascias and soffits |
| skylight | roof windows |
| gutter cleaning | gutter cleaning |
| gutter | guttering |
| roof inspection | roof checks |
| re-roofing | new roofs |
| roof replacement | new roofs |
| flat roof | flat roofs |
| emergency roof repair | emergency roof repairs |
| lead | leadwork |
| chimney | chimney repairs |
| roof coating | roof coatings |
| roofing contractor | roofing |


## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). A card never leads with a specialist service (tree bracing, artificial grass) unless it is in jobs_wanted. A service listed under one category goes in that category's card, never another card, even when GBP files it elsewhere (lawn mowing and seeding go under Lawn Care Service, not Gardener). JSON slot: core_services.

- Roofing Contractor: roof repairs, new roofs, flat roofs
- Roofer: roof repairs, new roofs, flat roofs
- Chimney Services: chimney repairs, leadwork
- Gutter Cleaning Service: gutter cleaning, guttering, fascias and soffits
- Guttering Service: guttering, gutter cleaning, fascias and soffits
- Waterproofing Service: flat roofs, roof coatings
- Skylight Contractor: roof windows

Service words for the whole job rather than one service: roofing. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it (for example a garden makeover question goes to Landscape Gardener, not Garden decorating). JSON slot: general_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches; some are roofer only).

## Onboarding questions this niche needs

From the Bournemouth FAQ research, customers most often ask about these, and the answers can only come from the client:
- Is your price a fixed quote or an estimate?
- Does the quote include VAT, scaffolding and taking away the old tiles?
- What deposit do you take, and when is the balance due?
- What happens if you find rotten battens, boards or rafters once work starts?
- What paperwork does the customer get at the end (invoice, guarantee, building regulations certificate)?
- Is the guarantee insurance backed, and does it cover repairs as well as new roofs?
- Do you charge for inspections or call outs, and is there an out of hours surcharge for emergencies?
- Do you take on small jobs (one slipped tile, a leaking gutter joint)?
- Can you match existing tiles or slates on older houses?
- Do you check inside the loft before recommending a new roof?
- Will you provide photos and an itemised report for a storm damage insurance claim?
- Who notifies building control, and does the customer get a compliance certificate?
- How do you keep the house dry and secure while the roof is open?

"From" prices and typical durations for 3 jobs (e.g. ridge repair, garage flat roof, full re-roof); whether the guarantee covers repairs as well as new roofs, and for how long; quote format and turnaround; same day callouts; manufacturer approvals.

## Section 5 alternative titles

1. **Local Experience Behind Every Job** 2. **Covered If Something Goes Wrong**

## Blog slots (blog)

Blog Post Structure (Ray, 28 Oct 2026), Layer 2 section 3. Blogs reuse the homepage slots and add these; code reads `roofer.json` `blog` (blog/blocks.js). Each slot starts from the business type default; a slot left out takes its default. Seasonal topics are shared with the quarterly GBP post batch, so blog and GBP posts follow one calendar; they apply only while `seasonal_trade` is yes.

| Slot | Value |
|---|---|
| seasonal_topics | Check the roof before winter: October to November, publish September · Storm damage repairs: December to February, publish November · Moss clearing: March to April, publish February · Gutter clearing before the leaves fall: October, publish September |
| safety_topics (the safety switch: no DIY steps) | Chimney removal or rebuild · Structural roof timbers and trusses · Going up on the roof yourself · Solar panels and electrical connections on the roof |
| blog_cta_h2 (the Next step heading) | A: Talk to a Local [TRADE_PERSON] About [TOPIC] |
| cost_unit (how a cost guide prices the job) | A: per job |
| decision_pairs (common "X or Y" choices, run as decision posts) | Repair or replace · Slate or tile · Felt or EPDM for a flat roof · Concrete or clay tiles · Fascias repaired or replaced |
| offered_by_page (the blog's "offered" check only, Brandon 29 Oct: a bank service counts as offered when it is the usual work of a page the client has; never a library fold, which would change every roofer's page map) | Flat roofing: EPDM rubber roofing · GRP fibreglass roofing · Felt roofing · Warm roof and cold roof conversion. Roof repairs or Roof replacement: Slate roofing · Tile roofing · Dry ridge and dry verge · Storm damage repairs · Roof inspections. Specialist services (cladding, solar panel bird proofing, commercial roofing, roof coatings, loft ventilation, roof cleaning and moss removal) still need to be on the client's record |

## do_not_reuse

(empty)
