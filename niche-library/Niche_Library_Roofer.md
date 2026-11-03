# Niche Library Entry: Roofer

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry). Every slot is required; an empty slot stops the run (G-NICHE).

Business type: **A (project trade)**. Emergency niche: **yes** (storm damage and active leaks). Since 3 Nov 2026 the emergency layout switches on per page: the library's emergency column (Roof repairs, Storm damage repairs, Roof window repairs) when the client confirms call outs (the hand set Emergency primary, or the onboarding answer). The emergency_niche marker is kept but nothing reads it.

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

Emergency (only when the emergency layout is on: the page is flagged emergency in the library and the client confirms call outs):
1. **Call Us.** Brief: what to say (what is happening, where the water is coming in, when it started, whether anything is hanging loose) and what to do meanwhile, in plain words: catch the water, move what is underneath, stay off the roof. The number from [CV: phone]. No promise of a reply or an arrival time unless [CV: response_time] is set.
2. **We Give You a Price and an Arrival Time.** Brief: an arrival time only as the business gives it on the call: no window or response time written here unless [CV: response_time] is set. The price for making it safe agreed before anyone comes out only from the price_agreed_before_work practice and [CV: quote_method]; what the permanent repair costs waits until the roof has been seen. Never restates "free". "Same day" only when [CV: same_day_available] is yes.
3. **We Fix It on the Spot.** Brief: what usually happens on the visit: the area made safe, temporary weatherproofing where it is needed, the fault fixed on the same visit where the weather and the parts allow; otherwise the roof left weathertight and a date agreed for the permanent repair (the trade facts: urgent weatherproofing may precede permanent work). Never promise a same visit fix. Never mention the price.

The category and service page emergency variants carry their own three steps (below).

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

- Roofing services (the Fillout category tab): roof repairs, new roofs, flat roofs, storm damage repairs, guttering, roof windows
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

## Business type notes (business_type_notes)

One GBP category (Roofing services) covers the trade, so every category is A and `category_types` is empty. Urgent against planned is split by page, not by category: the library's emergency column (Roof repairs, Storm damage repairs, Roof window repairs) switches the emergency variant on when the client confirms call outs; every other page gets the plain briefs. Inside the planned pages the pack's split (Roofer Calibration Pack v6, section 2) is carried in the card briefs:

- problem led (symptom, cause in the material, consequence if left): roof repairs, roof replacement, flat roof replacement, felt, slate and tile roofing, dry ridge and dry verge, leadwork, chimney repairs and repointing, gutter repairs, fascias and soffits, loft ventilation, garage and conservatory roof replacement;
- desire led (the customer's situation, never an invented symptom): roof window installation, warm roof and cold roof conversion, chimney removal, guttering installation, cladding;
- schedule led (what slips and when, with the reason in the weather or the material): roof inspections, gutter cleaning, roof cleaning and moss removal, roof coatings, solar panel bird proofing.

None of those is a recurring round, so there is no type B. EPDM, GRP and commercial roofing follow the flat roof pages. Roofing is weather led, not seasonal: `seasonal_trade` is off and there is no seasonal swap.

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": roofing services → roofing, roofing contractor → roofing, roofer → roofing, chimney services → chimney work, gutter cleaning service → gutter cleaning, guttering service → guttering, waterproofing service → flat roofing, skylight contractor → roof window work. A category with no noun reads "[CAT] Services" and is flagged. The briefs use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

3 Nov 2026, written to the landscaper entry's depth from the calibration pack (sections 1, 2, 4, 7) and the trade facts pack (Tables A to G). Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots. Type A uses the niche steps above. No seasonal swap (weather led, not seasonal). Placeholders: `[CAT]`, `[CAT_LOWER]`, `[WORK]`, `[WORK_LOWER]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises. Every figure or rule a brief wants is pointed at the trade facts rows, never written here.

- `seasonal_trade`: no
- `category_types`: none (one category, type A)
- The emergency variant (below) replaces block 4, the steps and the FAQ slots when the page is flagged emergency in the library and the client confirms call outs.

### Type A (project trade: Roofing services, every planned page)

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A damp patch that isn't under the fault | water that has run along a batten or the deck first | A stain on a bedroom ceiling, a drip by the chimney breast, a mark that comes back after every downpour. The one cause this card makes: the water has run some distance along timber or decking inside the roof, so where it shows below is seldom where it got in. Say what tracing a leak involves in plain words, from the trade facts stages for roof repairs (locate the defect, expose the detail, reinstate the laps and weathering); patching above the stain is why repairs fail. Photos of what was found only from the photos_of_faults practice. Problem led framing: symptom, cause, consequence. Not a slipped tile or a cracked ridge on its own: card 2 owns those. |
| Tiles that slip and ridges that rock | the nails and mortar that held them have let go | A tile in the garden after a windy night, a slipped row, a ridge tile that rattles, verge mortar on the drive. The one cause this card makes: the nails and the mortar that held them have let go. Say what the fix usually involves from the trade facts stages (refix or replace, renew the bedding with a mechanical fixing or fit a dry fix system); a single slipped tile is a repair, not a new roof, with the underlay as the second line until it is put back. Never say mortar bedded ridges are banned and never that every tile must be clipped (Table E). Never make it sound like a collapse. |
| Puddles that stay on a flat roof | a fall that has gone, so water sits instead of running off | Puddles still there days after rain, blisters in the covering, a stain under the extension or over the garage. The one cause this card makes: the fall has gone, so water sits instead of running to the outlet, and standing water finds any weak joint. Say that the fix starts with the deck and the falls, not a new layer over the old one, from the trade facts stages for flat roof replacement; a covering laid over a wet or sagging deck ponds again. No fall figure. Not the laps of felt or the seams of a rubber roof: the service pages own those. |
| Gutters sagging and roofline going soft | fascia timber gone soft behind the brackets | A gutter pulling away from the eaves, a sag that overflows at its lowest dip, paint peeling off the fascia, a gap at the soffit. The one cause this card makes: the fascia timber behind the brackets has gone soft, so the gutter no longer holds its line. Say what putting it right involves from the trade facts stages (the old boards off and the backing timber repaired, never capped over; the gutter rehung with its fall); what the business itself does only from confirmed practices. Problem led for gutter repairs and fascias and soffits; schedule led where the page's cards include gutter cleaning (what slips once the leaves come down, explained by the season's cause rather than a busy period; never "winter is a busy time"). Not a blocked outlet: the symptom FAQ and the gutter cleaning page own that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| Getting up to the roof | Whether the job is done from a ladder, a tower or a scaffold is decided by the risk and the time up there, not by a rule that every repair needs scaffold (Table E). A two storey re-roof or most chimney work usually needs scaffold; a gutter joint or a single tile often does not. Scaffolding in the quote only from the scaffolding_in_quote practice; a scaffold on the pavement usually needs the council's licence before it goes up, never the Act's name. No figure. |
| The size and shape of the roof | More roof is more covering, more battens and more days; valleys, hips, dormers, chimneys and roof windows add cut tiles, leadwork and junctions, from the trade facts price rows. A plain gable costs less than the same area with three dormers. Say it plainly and give no figure. |
| What's found once the covering is off | Rotten battens, a wet flat roof deck, soft rafter ends behind a fascia, a chimney that needs more than pointing: what is under the covering is only known once it is lifted, from the trade facts price rows. Say the business looks before it prices, from [CV: quote_method] only; extra work priced and agreed before it is done only from the extra_work_agreed_first practice. No figure. |
| The covering you choose | Natural slate against concrete tile, a single sheet rubber roof against a built up felt system, lead against a lead alternative, an insulation upgrade with a re-cover. Name a material only if the trade facts or [CV: materials_methods] give it, and a named product only from [CV: materials_methods]. Expected life only as the Table E rows state it, with the maker named as the row names it, never as a guarantee. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for roof work (access and scaffold, the size and shape of the roof, what is found once the covering is off) and how the quote is given, from [CV: quote_method] only. Never a figure from memory. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]: whether repairs are covered as well as new roofs only as the scope says. Insurance backed only where [CV: guarantee_scope] says so; a manufacturer's system guarantee only from [CV: manufacturer_warranty], never confused with the product's expected life (Table E). Described, never promised. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible roofing example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if the roof leaks again after a repair? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to, as the standard the work is held to, never as a defence. A return visit only from the return_visit practice. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What [WORK_LOWER] work do you take on? | The jobs on the card list and the size of job taken on, from the services list and [CV: typical_jobs] only: small jobs (one slipped tile, a leaking gutter joint) only where typical_jobs says so. Link one service page. Never a service the client does not list. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends (what they have noticed and roughly where; photos from the ground help, never from a ladder), what the business looks at (the roof, and the loft where quote_method says so), what comes back (photos of every fault only from the photos_of_faults practice; a written quote only from written_quote). The pack's trust gap answered as the way a fair roofer behaves: the evidence looked at, nothing agreed on the doorstep, a second opinion welcomed; never a claim of honesty. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Can roof work be done in winter? | Weather led, not seasonal, from the Table A timing cells: most roof work runs all year when the roof is safe to stand on; wind, rain, frost and a slippery roof stop it for the day; flat roof coverings go down, and mortar sets, only in dry and mild spells, explained by the covering itself and with no figure. The roof left watertight each night only from the watertight_each_night practice; a rained off day rebooked only from weather_delays_rebooked. Never "winter is a busy time". No dates. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual cause here in plain words, with the fault named in the covering (a lap, a fixing, a fall, a junction), what the local housing era or exposure adds, then what the business does about it. One figure at most, and it must come out of a trade facts row. Never describe how any roof in the area is today. | Process |

### Type A, emergency variant (Roof repairs, Storm damage repairs, Roof window repairs, when the client confirms call outs)

Replaces block 4, the steps and the FAQ slots; block 5 and the symptom question stay as above. The reader has water coming in now: situation, why it can't wait, what happens when they call. Never a response time, round the clock cover or a call out promise unless the client values confirm it.

**Block 4, when this can't wait.** H2: When Your Roof Can't Wait

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Water coming through the ceiling | rain reaching the underlay and battens through a gap in the covering | A drip into a bucket, a bulge in the plaster, a mark spreading while it rains. The one cause this card makes: rain is reaching the underlay and battens through a gap in the covering, and every hour of rain adds to the wet timber and insulation (Table B). Write the reader's situation, the reason it won't keep, and what usually happens when they call: the area made safe, temporary weatherproofing where it is needed, then the permanent repair once the roof is safe to work on (Table A). Never a response time, round the clock cover or a call out promise unless [CV: response_time] or [CV: emergency_callouts] confirms it. Never a collapse. |
| Tiles missing after a gale | the next gust lifting what the storm loosened | Tiles in the garden, a gap in the ridge, underlay showing, a flashing bent back. The one cause this card makes: once one tile or a length of ridge has come away, the wind gets under its neighbours and rain reaches the underlay with nothing in the way. What usually happens: made safe, a sheet over the gap, and the repair when the wind has dropped; nobody goes on the roof until it is safe (Table A). Photographs of the damage and an itemised invoice support a claim on the home insurance; the insurer decides what is covered, never the roofer (Table E). A storm is named, or a gust measured, only if the dossier gives it. |
| A chimney or gutter that's come loose | the weight of a pot or a full gutter with nothing left holding it | A pot leaning, bricks loose at the top of the stack, a gutter length hanging off its brackets and pouring down the wall. The one cause this card makes: the weight of a pot, a stack top or a full gutter with nothing left holding it, which makes it a falling hazard before it is a leak (Table B). What usually happens: the area below kept clear, the loose piece secured or taken down, then the repair. Never tell the customer to go up and look; never make a cracked pot sound like a falling chimney. |
| The first hour, before anyone arrives | water spreading while you wait | What the customer can do from inside the house, in plain words: catch the water, move what is underneath, keep clear of a bulging ceiling, photograph what they can see from the ground for the insurer, then call. The one cause this card makes: water keeps spreading while they wait, and the quicker the roof is covered the less there is to put right. Never an instruction to go on the roof, up a ladder or to patch it themselves; never a time by which anyone arrives unless [CV: response_time] is set. |

**Steps.**

1. **Call Us.** Brief: what to say (what is happening, where the water is coming in, when it started, whether anything is hanging loose) and what to do meanwhile, in plain words: catch the water, move what is underneath, stay off the roof. The number from [CV: phone]. No promise of a reply or an arrival time unless [CV: response_time] is set.
2. **We Make It Safe and Show You What's Failed.** Brief: the area made safe, temporary weatherproofing where it is needed, and the customer shown what was found (photos only from the photos_of_faults practice). The price for making it safe agreed before any work starts only from the price_agreed_before_work practice and [CV: quote_method]. Never restates "free".
3. **We Fix It, or Book the Permanent Work.** Brief: the fault fixed on the visit where the weather and the parts allow; otherwise the roof left weathertight and a date agreed for the permanent repair (Table A: urgent weatherproofing may precede permanent work). Never promise a same visit fix; "same day" only when [CV: same_day_available] is yes. Never mention the price.

**FAQ slots.** Five before the symptom question: cost, one cover question (insurance, else the fallback), scope, process, timing (the start_time question when it is set, else the storm question).

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | What does an emergency roof repair cost in [CITY]? | Prices and any call out charge only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only: making it safe is priced before the permanent repair, which is priced once the roof has been seen. The price agreed before work starts only from the price_agreed_before_work practice. No out of hours figure unless price_list gives one. | Price |
| cover | insurance | Are you insured for emergency roof work? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible roofing example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if the leak comes back after an emergency repair? | Open with what the customer does: tell us and we look at it. Then that a temporary cover is a temporary cover: the permanent repair is what the work is held to, under the reasonable care and skill standard, never as a defence. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | Is this an emergency, or can it wait? | What counts as urgent, from the card list: water coming in, a tile or a ridge length missing, a chimney or gutter hanging loose, a roof window letting rain in. What usually waits for a planned repair: a single slipped tile with nothing coming in, a damp patch that is dry today, moss (Table B, Table E). Link one service page. Planned work is never dressed up as urgent. | Fit |
| process | always | What should I do before you arrive? | From inside the house only: catch the water, move what is underneath, keep clear of a bulging ceiling, photograph what can be seen from the ground and keep the itemised invoice for the insurer (Table E storm claim evidence); the roofer documents and repairs, the insurer decides cover. Never an instruction to go on the roof, up a ladder or patch it themselves. Whether the business deals with the insurer only from the client values. | Process |
| timing | start_time | How quickly can you get to me? | From [CV: response_time] and [CV: start_time] only, as given; a same day visit only when [CV: same_day_available] is yes; roof access waits until the wind has dropped and the roof is safe (Table A). Never "24/7" or "any time" unless [CV: emergency_callouts] gives it in those words. | Timing |
| timing | always | Will you come out while the storm is still going? | What usually happens: the house made safe and the damage covered as soon as the roof is safe to work on; while the wind is up the work is from inside and from the ground (Table A). No response time, no out of hours promise unless [CV: emergency_callouts] or [CV: response_time] gives it. | Timing |

## Service page blocks by business type (service_page_blocks)

3 Nov 2026. Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (signs you need it) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (A: cost, timing, cover, rules, scope). Type A uses the niche steps; the emergency variant carries its own. The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type A entry serves a re-roof, a gutter repair and a roof window alike. The pack's section 2 framing (problem led, desire led, schedule led, urgent) is named in the card briefs. Placeholders: `[SERVICE]`, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`.

- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type A (project trade: every planned page)

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Looking at the roof before anything is touched | The survey or inspection stage from the trade facts: the covering, the falls, the deck, the junctions, the loft where the row names it. A part of the job, not a promise about the quote. |
| Safe access and protecting the house | The access stage from the trade facts: a ladder, a tower or a scaffold chosen by the job, never a rule that every repair needs scaffold (Table E). Scaffolding in the quote only from the scaffolding_in_quote practice; the drive, paths and garden protected only from property_protected. |
| Stripping what has failed | The removal stage from the trade facts: the old covering, the failed fittings, the rotten boards, as the row names them. The old is stripped, never capped over: the hidden layer is the job. |
| Putting right what's underneath | The deck, the battens, the rafter ends, the underlay, the falls, as the trade facts stages name them. No figure unless the row gives one, and never a standard's number. |
| The materials for the job | From the trade facts materials and methods cell or [CV: materials_methods]: the options a customer is offered, by their trade name (natural or fibre cement slate, concrete or clay tile, EPDM, GRP, a built up felt system, rolled lead). A named product only from [CV: materials_methods]; "roof window", never the brand. |
| Laying and fixing the new covering | The central stage from the trade facts: laid and mechanically fixed, the seams and upstands formed, the lead dressed, the boards fitted, named as the trade names it. |
| Finishing the edges and junctions | The finishing stages from the trade facts: ridges, verges, hips, flashings, upstands, outlets, the water test where the row gives one. What the customer sees when the job is done. |
| Clearing up and the final check | The last stages from the trade facts: debris cleared, outlets checked, the work inspected. Waste taken away only from the waste_removal practice; what the customer gets at the end (photos, a written record, a compliance certificate) only from the confirmed practices and the client values. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The first signs | the job left undone | The things a homeowner notices first, from the trade facts signs row, in their words: a fresh stain, tiles on the ground, a drip by the chimney, water on the inside of a roof window frame. The one cause this card makes: the job left undone. Then the consequence of leaving it, from the skipped row: specific, never alarming. Framing by page, with business_type_notes saying which pages are which: a problem led page writes symptom, cause, consequence. A desire led page writes the reason the customer wants the work (a dark landing, a cold loft room, a stack no longer used) and invents nothing. A schedule led page writes the maintenance that has been missed and the point in the year it shows, with the cause in the weather or the covering. |
| A repair that didn't hold | the visible mark treated instead of where the water gets in | A patch over the stain that leaked again, a gutter joint resealed that drips in the next rain, a new seal on a roof window whose flashing was the fault. The one cause this card makes: the visible mark was treated instead of where the water gets in (the trade facts done badly rows). Say what tracing the entry point involves from the trade facts stages (locate, expose, reinstate the laps and weathering); never a dig at another trade. On a desire led page, the situation instead: an existing window, gutter or roof that was patched and still fails. |
| The layer you can't see has gone | the underlay, battens, deck or backing timber failing out of sight | Daylight in the loft, damp roof timbers, a flat roof that feels soft underfoot, a gutter bracket that pulls out of the fascia by hand: the signs from the trade facts that what's underneath has gone. The one cause this card makes: the underlay, battens, deck or backing timber failing out of sight. Say when a patch stops being worth it and what doing the job properly involves, from the stages (strip, repair the deck or timber, then re-cover; never a covering over a wet deck or fresh boards fixed over rotten ones). The honest test from the pack: a roof that is sound apart from one local fault is a repair; faults turning up all over the roof mean replacing. Not the fixings and mortar: the category page owns those. |
| Weather getting in at a junction | a lap, seam, flashing or upstand that has opened | Damp around the chimney breast, a split in the lead, a lifting seam on a flat roof, a crack by a trim, a leak at an upstand or an outlet: the junction signs from the trade facts. The one cause this card makes: a lap, a seam, a flashing or an upstand that has opened, so concentrated runoff gets in where the covering meets something else. Say what reforming the junction involves from the stages (the detail exposed, the lap or flashing reformed, the joint weathered); the material named as the row names it. Not a fall that has gone: the category page owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| Getting to the work | The access factor from the trade facts price row: the height, a steep pitch, a tall exposed stack, a tower or a scaffold, a restricted side return. Scaffolding in the quote only from the scaffolding_in_quote practice; a scaffold on the pavement usually needs the council's licence first, never the Act's name. Say why height and restricted access cost more time. No figure. |
| How much there is to do | The size factor from the trade facts price row: the area of roof, the length of ridge, verge or gutter, the number of valleys, chimneys, windows, penetrations, corners and outlets. Say it plainly and give no figure. |
| What's found once it's opened up | The hidden factor from the trade facts price row: a wet or failed deck, damaged battens, rotten rafter ends, unsound masonry, a suspected asbestos cement garage roof (assessed and handled by trained people with the right controls, Table C; never that any roofer can break it up). Say the business looks before it prices, from [CV: quote_method] only; extra work priced and agreed before it is done only from the extra_work_agreed_first practice. |
| The materials and the finish | The material and finish options from the trade facts price row, the Table A materials cell and [CV: materials_methods], and why one costs more than another: slate against concrete, a warm roof build up with insulation against a straight re-cover, matched heritage slates, lead against an alternative. A named product only from [CV: materials_methods]. Expected life only as the Table E rows state it, with the maker named, never as a guarantee. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us What's Wrong; We Inspect and Show You the Problem or We Price Your Job; We Fix It on a Date That Suits You); the emergency variant's steps when the emergency layout is on.

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The four cost cards above already give what moves the price: name one factor at most, never the list again. Never a figure from memory. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing cell only: the pack gives no standard duration for roof work, so say what decides it (the size of the roof, the access, the weather window of the covering: flat roof coverings go down, and mortar sets, only in dry and mild spells, with no figure unless the row gives one for a named product, named as the row names it). A manufacturer's figure only where the row gives it (roof window installation), as the manufacturer states it. The roof left watertight each night only from the watertight_each_night practice. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]: whether repairs are covered as well as new roofs only as the scope says. Insurance backed only where [CV: guarantee_scope] says so; a manufacturer's system guarantee only from [CV: manufacturer_warranty], never confused with the product's expected life (Table E). Described, never promised. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible roofing example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if it leaks again after the work? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to, as the standard the work is held to, never as a defence. A return visit only from the return_visit practice. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Do I need permission for [SERVICE_LOWER]? | From the trade facts rule rows only, as what usually applies, with "usually" or "in most cases": a like for like re-cover on an unlisted house usually needs no planning application; building control comes in for a full re-cover, a heavier covering, a structural change or an internal chimney removal, and a roofer in a competent person scheme can notify qualifying re-covering work (scheme membership only from the [CV: materials_methods] tick); listed buildings, conservation areas and a shared chimney stack bring their own checks; nesting birds and bats as something that sometimes delays the work. Never a standard's number, an Act's name, a percentage, a measurement or legal advice. Where the rows give no rule for the service, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words. What it does not cover only from the services list, with one sibling service page or the category page linked; where the trade facts row says a full replacement is a different scope (roof window repairs), say so and link it. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual cause here in plain words, with the fault named in the covering, what the local housing era or exposure adds, then what this service does about it. One figure at most, and it must come out of a trade facts row. Never describe how any roof in the area is today. | Process |

### Type A, emergency variant (Roof repairs, Storm damage repairs, Roof window repairs, when the client confirms call outs)

Replaces block 4, the steps and the FAQ slots; What's Included, block 5 and the symptom question stay as above. Each card says which urgent page it leads on; on the other urgent pages it is written for the page's own fault.

**Block 4, when this can't wait.** H2: When [SERVICE] Can't Wait

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A leak that won't wait for a dry day | an active leak with nothing slowing it | Water into a bucket, a ceiling that is bulging, a light fitting that is wet. The one cause this card makes: an active leak with nothing slowing it, so the timber and insulation above get wetter with every shower (Table B). Write the reader's situation, the reason it won't keep, and what usually happens when they call: the water stopped temporarily, then the entry point traced and repaired once the roof is safe (Table A roof repairs: urgent weatherproofing may precede the permanent work). Leads on the Roof repairs page. Never a response time or a call out promise unless [CV: response_time] or [CV: emergency_callouts] confirms it. |
| A temporary patch that's become the repair | a temporary cover left as the repair | A tarpaulin from the last storm still tied over the ridge, tape over a split in the felt, a bucket that has become furniture. The one cause this card makes: a temporary cover left as the repair, which fails in the next wind and leaves the weathering defective (Table B storm damage done badly). What usually happens: the cover checked, the permanent scope agreed, the repair done when it is safe to work. Leads on the Storm damage repairs page; on the other urgent pages write it for the page's own fault. Never a dig at whoever put the patch on. |
| Damage the insurer will ask about | evidence lost once the roof is tidied | Tiles already swept up, a ridge section put in the bin, a stain painted over before anyone photographed it. The one cause this card makes: evidence lost once the roof is tidied, which weakens a claim (Table B). What usually happens: the damage photographed and recorded before it is cleared, safe temporary repairs discussed, an itemised invoice kept (Table E); the roofer documents and repairs, the insurer decides cover, never the other way round. Leads on the Storm damage repairs page. Whether the business deals with the insurer only from the client values; never "insurance approved". |
| Rain or wind coming in at a roof window | a flashing lifted or a sash that won't close | Water on the inside of the frame, a draught at the sash, a window that will not shut after a gale. The one cause this card makes: a flashing lifted or a sash that will not close, so rain and air get in at the opening (Table B roof window repairs). What usually happens: the opening covered, the flashing, seal or hardware replaced with compatible parts, the covering around it reinstated; a seal alone when the flashing is the fault leaves the cause. Leads on the Roof window repairs page. Say "roof window", never the brand. |

**Steps.**

1. **Call Us.** Brief: as the category variant's step 1.
2. **We Make It Safe and Find Where the Water Gets In.** Brief: the area made safe, temporary weatherproofing where it is needed, then the entry point traced rather than the stain (Table A roof repairs); the customer shown what was found, photos only from the photos_of_faults practice. The price agreed before any work starts only from the price_agreed_before_work practice and [CV: quote_method]. Never restates "free".
3. **We Agree the Repair and Do It Once It's Safe.** Brief: the permanent repair agreed and done on the visit where the weather and the parts allow; otherwise the roof left weathertight and a date agreed. Never promise a same visit fix; "same day" only when [CV: same_day_available] is yes. Never mention the price.

**FAQ slots.** Five before the symptom question: cost, timing (the start_time question when it is set, else the rain question), one cover question (insurance, else the fallback), process, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | What does an emergency [SERVICE_LOWER] call out cost in [CITY]? | Prices and any call out charge only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only: making it safe is priced before the permanent repair, which is priced once the roof has been seen. The price agreed before work starts only from the price_agreed_before_work practice. No out of hours figure unless price_list gives one. | Price |
| timing | start_time | How quickly can you get here? | From [CV: response_time] and [CV: start_time] only, as given; a same day visit only when [CV: same_day_available] is yes; roof access waits until the wind has dropped and the roof is safe (Table A). Never "24/7" or "any time" unless [CV: emergency_callouts] gives it in those words. This is the one place the timing is written. | Timing |
| timing | always | Will you come out while it's still raining? | What usually happens: the house made safe and the damage covered as soon as the roof is safe to work on; while the wind is up the work is from inside and from the ground (Table A). No response time, no out of hours promise unless [CV: emergency_callouts] or [CV: response_time] gives it. This is the one place the timing is written. | Timing |
| cover | insurance | Are you insured for emergency [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible roofing example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if the leak comes back after an emergency repair? | Open with what the customer does: tell us and we look at it. Then that a temporary cover is a temporary cover: the permanent repair is what the work is held to, under the reasonable care and skill standard, never as a defence. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What should I do before you arrive? | From inside the house only: catch the water, move what is underneath, keep clear of a bulging ceiling, photograph what can be seen from the ground and keep the itemised invoice for the insurer (Table E storm claim evidence); the roofer documents and repairs, the insurer decides cover. Never an instruction to go on the roof, up a ladder or patch it themselves. Whether the business deals with the insurer only from the client values. | Process |
| scope | always | Is this an emergency, or can it wait? | What counts as urgent for this service, from the card list and the trade facts signs row: water coming in, a gap in the covering, something hanging loose, a roof window that will not shut. What usually waits for a planned repair, from the Table B rows: a single slipped tile with nothing coming in, a mark that is dry today. Link the planned sibling page or the category page. Planned work is never dressed up as urgent. | Fit |

## Location page blocks by business type (location_page_blocks)

3 Nov 2026. Used by the location page job (CORE (18)): block 4 (the problems the town's roofs have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question). The steps are the niche steps. The briefs are town wide, not per category: the town profile, the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED). Era claims only ("built with", "originally fitted with", "the ones not yet replaced"), never the current state of any roof, never an invented storm (the pack, section 3). No seasonal swap and no symptom question on a location page. Placeholders: `[WORK]`, `[WORK_LOWER]`, `[TOWN]`, `[CITY]`.

### Type A (project trade: the client's type is A)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Roofs built with the houses | the covering a street was built with reaching the end of its life | Slate on the older terraces, concrete tile on the between the wars semis, felt flat roofs on the garages and extensions of the postwar estates. The one cause this card makes: the covering a street was built with reaching the end of its life, written only as an era claim ("built with", "originally fitted with", "the ones not yet replaced") from the town profile. Say what that does to the job: on old slate the fixing nails give out first, then the chimney lead; on felt it is the laps. Never describe how any roof is today, never "roofs here are failing" or "due for replacement", never a covering the profile does not support with the era. Not water travelling along a batten, not fixings that have let go: the town's category and service pages own those. |
| Wind on the open side of town | exposure working at the ridge, hip and verge fixings | Hilltops, the coast, the open edge of town, the side that takes the westerlies, from the town profile; sea air where the profile puts the town on the coast. The one cause this card makes: exposure working at the ridge, hip and verge fixings, which is why the fixing matters more on that exposed edge and why mortar alone is not relied on (Table C, Table E; never the standard's number, never "banned"). Nothing about past storms or gusts beyond what the dossier itself records. Not the next gust lifting what a storm loosened: the urgent pages own that. |
| Moss and leaves on the shaded side | tree cover keeping slopes damp and gutters full | Tree lined avenues, north facing slopes, a roof under a big sycamore, from the town profile. The one cause this card makes: tree cover keeping slopes damp and gutters full, so moss builds on the shaded pitch and slides into the gutters, and outlets block after leaf fall. Say what that does to the job: a small amount of moss normally does no harm, heavy growth blocks the runoff (Table E); cleared by hand, never pressure washed (Table E). Schedule led, with the reason in the weather. Not a blocked outlet as the fault, not fascia timber gone soft: the gutter pages and the category page own those. |
| Chimneys nobody uses any more | a stack left standing after the fires went out | A stack on every house in the older streets and most of them cold, from the town profile's era. The one cause this card makes: a stack left standing after the fires went out, so the mortar, the flaunching and the pots weather at the top with nobody watching, and the lead at the junction with the roof goes with them. Say what it usually means: the defective joints repointed rather than the whole stack (Table E: comprehensive repointing is rarely necessary), lime where lime was used, or removal above the roofline as an option; the checks that sometimes apply (a listed house, a conservation area, a shared stack) with "usually" and never an Act's name. Never that any chimney is unsafe today. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Scaffold on a terraced street | Where the house fronts the pavement the scaffold stands on the public footway, which usually needs the council's licence before it goes up (never the Act's name), and a tower or ladders may not reach a two or three storey roof. Say why that adds time and lead in; the town profile says which streets are terraced. Scaffolding in the quote only from the scaffolding_in_quote practice. No figure. |
| Tall houses and steep pitches | Three storey Victorian houses, steep slate pitches, dormers and a stack on every party wall take longer to reach and to work on than a bungalow or a semi; from the town profile where it gives the housing. Say it plainly. No figure. |
| Conservation areas and listed roofs | Where the town has conservation areas or listed buildings, the covering a replacement can use may be set (like for like slate, no change of material or chimney) and there is paperwork before work can start. "Usually", never the area's or the order's official name. From the dossier rules only; otherwise a check with the council as something that sometimes applies. |
| What the last re-roof left behind | Concrete tiles laid over battens meant for slate, a felt overlay over older felt, roofline capped over boards that had already gone soft, a paint coating on tiles: what has to come off and go in a skip before the new work goes on, from the trade facts done badly rows. Older streets in the town carry more of it; say so without unkindness and without a dig at another trade. No figure. |

**Steps.** The niche steps (Tell Us What's Wrong; We Inspect and Show You the Problem; We Fix It on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise what pushes the price up in a town like this (scaffold and access, the height and pitch of the houses, what comes off first) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. Emergency call outs in the town only when [CV: emergency_callouts] is yes. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]: whether repairs are covered as well as new roofs only as the scope says. Insurance backed only where [CV: guarantee_scope] says so. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible roofing example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if the roof leaks again after a repair? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends (what they have noticed and roughly where; photos from the ground, never from a ladder), what the business looks at, what comes back (photos of every fault only from the photos_of_faults practice). Nothing agreed on the doorstep and a second opinion welcomed, written as the way a fair roofer behaves. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Can you work on roofs in [TOWN] through the winter? | Weather led, not seasonal, from the Table A timing cells: most roof work runs all year when the roof is safe to stand on; wind, rain, frost and a slippery roof stop it for the day; flat roof coverings go down, and mortar sets, only in dry and mild spells, explained by the covering itself and with no figure. The roof left watertight each night only from the watertight_each_night practice. Never "winter is a busy time". No dates. | Timing |

## do_not_reuse

(empty)

## What the sources lacked (questions for the client or for Ray)

For the client (no client value carries these today, so the briefs say "only from the client values"):
1. Is there a call out charge, and an out of hours surcharge, for emergency work? The cost briefs can only take a figure from price_list.
2. Is the guarantee insurance backed, and does it cover repairs as well as new roofs? The cover briefs read guarantee_scope; a field of its own would be cleaner.
3. On a storm claim, does the business deal with the insurer, or only supply photos and an itemised invoice?
4. What does the customer get at the end: photos, a written record, a building regulations compliance certificate? "Competent person scheme member" is only a materials tick.
5. Does the business take small jobs (one slipped tile, a gutter joint)? The scope brief reads typical_jobs only.

For Ray and the trade facts pack (Table G records most as not found; the briefs give no figure):
6. A duration for any roofing job other than the manufacturer's roof window figure.
7. A universal gutter fall, minimum pitches by material, and a repointing interval.
8. The fibre cement slate lifespan.
9. Any guidance on how long a roofer's own temporary cover may stay; the "temporary patch" card says only that it fails in the next wind.
10. The pack's header still says verified: no; the service page gate refuses a run until it is verified on the Trade facts screen.
