# Niche Library Entry: Pressure Washing / Exterior Cleaning

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/pressure-washing.json`; this file is the human copy, kept in the same commit. The model never sees the slot names, only the resolved words.

Sources, in order of authority: `calibration-packs/Pressure_Washing_Calibration_Pack_v1.md` (sections 1, 2, 4 and 7), `trade-facts/pressure-washing.md` (Tables A to G, generated 20 Oct 2026, not yet verified), `niche-library/pressure-washing.csv` with the shared pages in `cleaning.csv`, and `fillout/services/pressure-washing-exterior-cleaning.json` (three tabs: Pressure Washing Service, Window Cleaning Service, Gutter Cleaning Service).

Business type is **A (project trade) for every category** (the pack, section 2: a job is quoted per surface, booked once and done in a visit; repeat business comes when the growth returns, not on a round). The split inside A (problem led, schedule led, the commercial pages, the one desire led situation) is written into the card briefs, not the type. A client hand set to type B (planned commercial contracts, the pack's note to Brandon) reads `fears_by_type.B` and `faq_slots_by_type.B` on the homepage and has no block briefs in this entry.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Pressure Washing / pressure washing |
| trade_person / trade_person_plural | exterior cleaner / exterior cleaners (a pressure washer is the machine) |
| homepage_keyword | Pressure washing (4 Nov 2026, Brandon: the homepage keyword is a way of saying the primary GBP category, picked on search volume; the H1 research pattern and the thin runner read it) |
| customer_type | homeowners and local businesses (the pack, section 1: the homeowner and the site manager, landlord or managing agent) |
| unit_of_work | jobs |
| emergency_niche | no (no page in the library is flagged emergency) |
| big_ticket | no (a job is a visit; cleaning is maintenance and needs no planning: the trade facts building regulations row) |
| schema_subtype | LocalBusiness (schema.org has no exterior cleaning subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| drive, driveway, patio, path, block paving, slabs, decking, render, walls, brickwork, roof, gutters, fascias, conservatory, cladding, solar panels, green, slippery, moss, algae, black spots, lichen, streaks, oil stain, rust mark, weeds in the joints, sand in the joints, sealer, jet wash, pressure washer, soft wash, treatment, wash water, drain, car park, walkways | substrate, biocide, biocidal, effluent, soiling, soil, deposits, operatives, property, premises, dwell time, hypochlorite, sodium hypochlorite, surfactant, MEWP, DOFF, TORC, detailing, restoration, showroom finish (words_avoid_exceptions: biocide is allowed where a trade facts row is quoted as what usually applies to a treatment and on the Soft washing page where the treatment is named; property on a page written for a landlord or a managing agent; premises on the car park, industrial and warehouse pages) | like new, as new, good as new, as good as new, brand new again, former glory, transform your driveway, transform your home, transform your property, kerb appeal, curb appeal, sparkling, gleaming, pristine, spotless, immaculate, guaranteed results, no damage guarantee, safe for pets, pet safe, safe for plants, safe for children, completely safe, eco friendly, before and after (the pack's section 7: permanence promises, showreel words, and "safe" claims stated without the principle of protecting plants and ponds) |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us which surfaces need cleaning and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us which surfaces need cleaning and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency pages) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us Which Surfaces Need Cleaning**
   Brief: how to get in touch and what is useful to send first (which surfaces, a rough size, a photo of the growth or the stain, whether there is an outside tap and where the water runs to). No promise of a reply time unless [CV: response_time] is set.
2. **We Look at the Surface and Price the Job** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the visit and what gets looked at: what the surface is made of and how it is finished, how much growth or staining it carries, the state of the joints or the pointing, height and access, where the wash water will go. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it). Never a pressure, a product or a dwell time as this client's method.
   Without the practice (`step_2_no_visit`): **We Price Your Job**
   Brief: a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **We Clean on a Date That Suits You**
   Brief: the date is agreed in advance, to suit the customer. The weather only as the reason a date can move, from the trade facts timing cells (wet cleaning of walls and paving is held off when frost threatens; a treatment and a sealer need a dry surface), and only when the `weather_delays_rebooked` practice is confirmed. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → insurance (no manufacturer warranty: the facts pack verifies no insurance backed or "no damage" guarantee scheme for this trade, Table G) |
| fears (in order, one per Why choose us point; the pack, section 1) | 1. a bigger machine doing the damage their hired jet wash did (stripes across the patio, sand blasted out of the joints, a scar on the render); 2. green that is back within months because the growth was knocked off the top and its roots left behind; 3. a price that grows on the day, or a job that stops at the wash and leaves the joints empty; 4. wash water and chemicals going where they should not: over the plants and the pond, into the drain that runs to the stream, onto next door's car |
| fears_by_type.B (a client hand set to B reads these instead: the commercial client with planned visits, the pack's section 1) | 1. a slippery walkway or bay between visits, and the complaint that follows it; 2. a contractor who cannot work round opening hours, deliveries and parked cars; 3. wash water sent down the wrong drain, with the site answering for it; 4. a standard that slips once the contract is signed |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders (neither visits jobs to assess the work: a listing is not proof of skill).
- **Tier 1, trade bodies and prequalification:** Federation of Window Cleaners, Water Jetting Association, CHAS, SafeContractor.
- **Tier 2, training and manufacturer approvals:** Smartseal approved installer, IPAF PAL card, PASMA Towers for Users, BASIS Professional Register (checked against the product and the task; its absence does not make ordinary biocide use unlawful).
- **Tier 3, local credibility:** Environment Agency waste carrier registration (a check, not a membership), chamber of commerce, local press features. Ray's call per client.
- **Never:** the British Cleaning Council. A cleaning firm cannot be a member (Table D), so a claimed membership is not shown.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible example for this trade (a cracked pane, a mark on a car parked too close, a plant caught by the spray) that does not suggest carelessness. Never say the cover extends to the surface being cleaned unless the client values say so. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee is confirmed. Start with yes, then the terms from [CV: guarantee_scope] and [CV: guarantee_years]. Never a promise that the growth will not return or that a stain is gone; never written as something that replaces the customer's rights (the trade facts no damage guarantee row). | no | Trust |
| faq_3_none | What happens if something isn't right after the clean? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. The weather as a reason a booking can move only from the trade facts timing cells (frost, a surface that has to be dry for a treatment or a sealer) and never as an excuse in advance. Never a same day claim unless [CV: same_day_available] is yes. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long will my drive or patio stay clean? | No promise of a time. What decides it, in plain words: how much shade and damp the surface sits in, trees and a north facing side, and whether the growth was treated or only knocked off the top (the trade facts soft washing rows: growth that a treatment did not reach stays and regrows). Say what slows the return (a treatment after the wash, joints refilled so they hold less water) as the principle of good work, never as this client's process unless [CV: materials_methods] or a practice confirms it. Nothing about an annual clean: the facts pack gives no interval. | no | Timing |
| faq_B | Why has my drive gone green again so soon after it was cleaned? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words, from the trade facts what goes wrong rows: the top of the growth was washed off and what lives down in the pores and the joints was left to grow back; a side that never dries (shade, a tree, the north side of the house) that any surface greens on; joints washed empty, which hold water and seed. Then what the local factor adds (tree cover, a damp valley, coastal air, the housing era's surfaces), then what a proper clean has to do: treat what is left, and refill the joints. Blame the method, never the customer's effort. Never promise it stays clean. | **yes** | Process |
| faq_C (fallback) | Can a jet wash harm my paving? | Yes, when the pressure and the distance are wrong for the surface, from the trade facts facts rows: there is no one safe setting for every surface; the paving maker's guidance is a moderate pressure with the lance held at an angle and back from the surface; natural stone, including sandstone, takes a low setting because a hard jet wears it; a jet run across block joints empties them, and the sand is then brushed back in; a mortar joint that is damaged is made good. Say what a careful job does first (the surface identified, a test patch) as the principle of good work. No figure, no distance, no named product unless [CV: materials_methods] gives it. | no | Process |
| faq_D (fallback) | What's the difference between a soft wash and a jet wash? | From the trade facts soft washing and render rows, in plain words: a soft wash puts a treatment on at low pressure, leaves it for the time its label gives, and then rinses it off or leaves it to weather, so the growth is killed where it lives; a jet wash takes off what it hits and nothing more. Which one a surface gets is decided by the surface: render, roof tiles, soft brick, timber and painted surfaces take the low pressure route, hard concrete and block paving can take a controlled wash, and many jobs use both. Never a dilution, a dwell time or a product; a soft wash as this business's method only from [CV: materials_methods] or where the page is the Soft washing page. | no | Process |
| faq_E (fallback; only when the client's services list carries brick and stone cleaning or graffiti removal) | Do I need permission to have my walls cleaned? | From the trade facts rule rows only, with "usually" or "in most cases": cleaning is maintenance and usually needs no building approval; a listed building is different, because consent is usually needed where the cleaning would affect what makes it special, abrasive methods most of all, and paint taken off a listed building usually needs consent first; a conservation area on its own does not stop a wall being cleaned, though controls can apply. What the customer does: the owner of a listed building asks the council before the work. Never an Act's name, never legal advice. | no | Process |
| faq_F (fallback) | Can you still clean my drive during a hosepipe ban? | From the trade facts hosepipe ban rows only: a ban can cover cleaning paths, patios and walls with a hose whoever does the work, so a paid cleaner is not automatically exempt; the water company's own notice says what is and is not allowed in the area, and cleaning done for safety reasons is treated differently. Say the business checks the notice before booking in a ban, and nothing more. No promise of a way round it; never the regulation's name. | no | Timing |

Sources for faq_A to faq_F: the pack's section 1 (what the homeowner has already tried) and the trade facts Tables B, C and E. Replace with real customer questions when Brandon or the client supplies them.

### Type B homepage overrides (faq_slots_by_type.B)

A client hand set to type B (planned commercial visits) reads these in place of the shared slot of the same name. Every other slot stays as above.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_A | How often do planned cleaning visits need to be? | What decides it, in plain words, from the trade facts rows: how fast the dirt, the growth or the oil builds on that surface, the traffic across it, how much shade and damp it sits in, and when the site can be closed for the work. No national rule sets an interval for any surface (the cleaning frequency fact). A frequency only from [CV: visit_frequency_options]; otherwise say the pattern is agreed with the site and nothing more. Never promise a schedule. | no | Timing |
| faq_D (fallback) | What does a planned visit cover? | The jobs on the card list said as one visit: the bays and the walkways, the entrance, the cladding or the panels, whichever the services list has. The site kept open or closed in sections, with the wet area barriered until it is dry (the trade facts wet surfaces row) and the wash water collected, as the principle of good work. What a visit does not cover only from the services list. Link one service page where LINKABLE PAGES has one. | no | Fit |

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`). A soft wash, a rotary cleaner, hot water, a sealer or a stain treatment is this business's method only when ticked.
- Methods: pressure washing with a rotary surface cleaner / soft washing (a low pressure treatment) / hot water or steam cleaning / hand brushing / water fed pole
- After the clean: kiln dried sand brushed into block joints / mortar joints repointed / block paving sealed / imprinted concrete sealed / oil and rust stain treatment / growth treatment after the wash
- Protection: wash water collected and taken off site / drains covered during the wash / plants, ponds and lawns protected / windows, vents and electrics covered
- Access: ladders and towers / cherry picker / roof moss removed from the ground or from supported access / gutters cleared after roof work
- Other: waste taken away / registered waste carrier / out of hours working for commercial sites / site barriered and reopened once dry

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

pressure washing, jet washing, power washing, soft washing, soft wash, driveway cleaning, patio cleaning, block paving cleaning, path cleaning, decking cleaning, render cleaning, brick cleaning, stone cleaning, masonry cleaning, roof cleaning, moss removal, conservatory cleaning, fascia cleaning, soffit cleaning, cladding cleaning, solar panel cleaning, gutter cleaning, window cleaning, graffiti removal, chewing gum removal, gum removal, oil stain removal, rust stain removal, stain removal, car park cleaning, tennis court cleaning, sports surface cleaning, playground cleaning, industrial cleaning, warehouse cleaning, warehouse floor cleaning, block paving sealing, concrete sealing, imprinted concrete sealing, sealing, re sanding, repointing, steam cleaning, hot water cleaning, algae treatment, moss treatment, lichen treatment, growth treatment, water fed pole, rotary surface cleaner

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| power/pressure washing | pressure washing |
| pressure washing | pressure washing |
| power washing | pressure washing |
| jet washing | pressure washing |
| soft wash | soft washing |
| roof cleaning | roof cleaning |
| rooftop/skylight | roof cleaning |
| gutter cleaning | gutter cleaning |
| glass and mirror | window cleaning |
| interior and exterior window | window cleaning |
| window washing | window cleaning |
| driveway | driveway cleaning |
| patio | patio cleaning |
| decking | decking cleaning |
| render | render cleaning |
| brick | brick cleaning |
| stone cleaning | stone cleaning |
| cladding | cladding cleaning |
| conservatory | conservatory cleaning |
| solar panel | solar panel cleaning |
| fascia | fascia and soffit cleaning |
| graffiti | graffiti removal |
| gum removal | chewing gum removal |
| oil stain | oil stain removal |
| rust stain | rust stain removal |
| car park | car park cleaning |
| tennis court | tennis court cleaning |
| playground | playground cleaning |
| industrial | industrial cleaning |
| warehouse | warehouse floor cleaning |
| concrete sealing | concrete sealing |
| block paving sealing | block paving sealing |
| re-sanding | block paving re sanding |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). A service listed under one category goes in that category's card, never another card. JSON slot: core_services. The keys are the client's category tab names in lower case (`fillout/services/pressure-washing-exterior-cleaning.json`).

- Pressure Washing Service: driveway and patio cleaning, soft washing, render cleaning, roof cleaning, decking cleaning, block paving and concrete sealing
- Window Cleaning Service: window cleaning, conservatory cleaning, fascia and soffit cleaning, solar panel cleaning
- Gutter Cleaning Service: gutter cleaning, fascia and soffit cleaning, roof cleaning

Service words for the whole job rather than one service: pressure washing, jet washing, exterior cleaning, soft washing, outside cleaning. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: moss removal, algae, lichen, black spots, oil stain, rust stain, graffiti. When an FAQ question names the surface as well as the problem ("Why is my render streaked with green?"), it goes to the surface's page (render cleaning), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches). The briefs in this entry name the keys a line depends on: `site_visit_before_quote` (step 2), `price_agreed_before_work`, `weather_delays_rebooked` (step 3 and the start FAQ), `property_protected` (what is covered before the water goes on), `waste_removal`, `maintenance_schedule` (a type B client's visits), `return_visit`. Nothing in this entry states a pressure, a product, a dwell time, a sealer interval or a "safe for pets" claim as this client's practice; the facts pack gives none that hold for every surface.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every exterior cleaning client for:
- a "from" price for 3 typical jobs (a block paved drive, a patio, a render soft wash);
- a typical duration for the same 3 jobs, and whether a treatment or a sealer means a return visit;
- which methods they run (the tick list above), and whether the wash water is collected and taken away;
- whether they take commercial sites, and whether those run as planned visits (a type B client) or one off jobs;
- whether quotes are written, and whether the price is fixed once agreed.

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **The Right Method for Every Surface**
2. Cover → **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": pressure washing service → pressure washing, window cleaning service → window cleaning, gutter cleaning service → gutter cleaning. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs (`category_page_blocks`) use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Draft, 4 Nov 2026, for Brandon's read against the calibration pack. Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above), the FAQ slots and, with `seasonal_trade` on, the one card and one FAQ that swap in. Placeholders: `[CAT]` the page keyword without the town, `[CAT_LOWER]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises.

- `seasonal_trade`: yes (the pack, section 2: a treatment needs a dry spell, a sealer a dry surface, growth returns fastest through the damp months, and water left on paving before a frost is slippery)
- `category_types`: empty. Every category takes the default, A (the pack's section 2 table maps the whole trade to A). The Window Cleaning Service and Gutter Cleaning Service tabs are not in the pack's table and take the default too; see the questions at the end.
- A niche with no section here has its category pages refused: "no category block briefs for pressure-washing".

### Type A (project trade: every category)

The pack's section 2 split inside type A, written into the briefs: problem led pages (most of the trade) read the cards as symptom, cause and consequence; the commercial reading (car parks, courts, warehouses) is the symptom in use and what it costs the site; the one desire led situation (a clean before a sale or an event) is a line in card 1, written as the situation and never a symptom. Every card says how it reads on a Window Cleaning or a Gutter Cleaning page, so a window cleaning page is never briefed on block paving.

**Block 4, common problems.** H2: Common Problems [WORK] Puts Right

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Green and slippery by the end of winter | a surface that stays damp in the shade | Problem led: the drive or the patio green by February, slippery when wet, a path by the back door nobody trusts in the rain, from the trade facts signs rows in the customer's words. The one cause this card makes: a surface that stays damp in the shade, where algae and moss can live in the pores and the joints. Say what the fix usually involves from the trade facts stages (the loose growth cleared, a test patch, a controlled wash, a treatment for what the wash leaves, and on block paving the joints refilled where the sand has gone), and that a wash on its own takes the top off and leaves the roots, so the treatment is the part that matters (the soft washing what goes wrong row). On a window cleaning page the card reads as green on the frames, the sills and the conservatory roof; on a gutter cleaning page as the green line below an overflowing gutter. On a commercial reading: a slippery walkway or bay and what it costs the site, never a slip figure. Where the reader is cleaning before a sale or an event, the card reads as the situation (the date, and the surfaces that show from the road), never a symptom invented for it. Never promise the growth will not return; never a pressure or a product. |
| Black spots and streaks a brush won't shift | growth rooted into the surface, not resting on top of it | Problem led: dark spots across a patio or a wall, black runs down render under the sills and below a gutter joint, from the trade facts signs rows. The one cause this card makes: growth rooted into the surface, not resting on top of it (lichen on slabs and stone, black growth on a sheltered wall). Say honestly what a clean does from the facts rows: a treatment is put on and left to work, and lichen spots then shrink and weather away over the months that follow rather than coming off on the day; a jet hard enough to take them off marks the stone first (the driveway and patio done badly row). Never name the growth from its colour alone (the render growth colours fact). On a window cleaning page the card reads as the black run down a conservatory frame and the film on the roof panels; on a gutter cleaning page as the streak under a leaking joint. Never a dwell time, never a product unless [CV: materials_methods] gives it, never a promise the spots are gone. Not the surface staying damp: card 1 owns that. |
| Moss on the roof and in the gutters | moss shed from the tiles, choking the gutters | Problem led, and kept in proportion: clumps of moss on the tiles, moss and silt in the gutters, water backing up at an outlet, drips down the fascia, from the trade facts roof cleaning signs row. The one cause this card makes: moss shed from the tiles and lying in the gutters where the water should run. Say first what the facts rows say: a mossy roof is rarely a problem in itself; it matters once the gutters and their downpipe openings are choked. Then the principle of good work from the roof cleaning stages: the roof looked at first to decide whether removal is needed at all, removal from the ground or from supported access rather than by walking the tiles, a treatment afterwards only where it suits the roof, the gutters cleared of what comes down. The damage the wrong method does, from the done badly row: a jet drives water into the roof and lifts the tile surface, a foot cracks a tile. On a gutter cleaning page the card leads with the gutter; on a window cleaning page it reads as the conservatory roof and its gutter. Never treat moss as an emergency; never a pressure or a product; the business's own access and method only from [CV: materials_methods]. |
| Marks left by the last clean | pressure and distance set for the machine, not the surface | The customer's real fear: stripes and arcs across a patio, joints with no sand in them and weeds coming through, a scarred patch on render that no longer matches the wall, decking gone furry, mortar raked out of a brick wall, from the trade facts done badly rows. The one cause this card makes: pressure and distance set for the machine, not for the surface. Say what the facts rows give, in plain words and with no figure: there is no one safe setting for every surface; paving makers ask for a moderate pressure with the lance angled and held back; natural stone takes a low setting because a hard jet wears it; render and roof tiles are not jetted at all. Then what a careful job does first (the surface identified, a test patch) as the principle of good work, and what is put back afterwards (joint sand brushed in, a damaged mortar joint made good). Never a dig at another trade, never that the customer did it wrong. Not the growth returning: cards 1 and 2 own that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How much surface there is | Square metres of paving, the number of walls, the length of the roofline: more surface is more time and more water, from the trade facts price rows (a larger or divided surface, several elevations). Say it plainly and give no figure. |
| How much has built up | Light green against thick moss, a fresh mark against oil that has soaked in for years, from the trade facts price rows: heavy growth or a stain that has gone in needs a treatment, sometimes a repeat, and more time. Say the business looks before it prices, from [CV: quote_method] only. |
| Height and getting to it | A ground floor wall against a gable, a rear patio reached through the house, a roof that needs a tower or a lift, from the trade facts price rows (height and access equipment, restricted access). Say why height and a tight access add time; never a height. |
| What happens after the wash | Joints refilled with kiln dried sand, a mortar joint repointed, a sealer applied once the surface is dry, a stain treated, the wash water collected where it cannot go to the drain, from the trade facts price rows. Each is part of finishing the job and each adds to it; the business's own practice only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this work (the size of the surface, how much has built up, height and access) and how the quote is given, from [CV: quote_method] only. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised; never a promise the growth will not return. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the clean? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What does your [WORK_LOWER] work cover? | The surfaces themselves, named from the card list (drives and patios, render and walls, roofs, decking, whichever the client has), and the size of job taken on, from the services list and [CV: typical_jobs] only. Link one service page. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends (which surfaces, a photo), what the business looks at (the surface, the growth, access, where the water goes), what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year for [WORK_LOWER]? | From the trade facts timing cells, with the reason in the weather or the surface: most cleaning runs through the year; wet cleaning of walls and paving is held off when frost threatens, because water left in the surface freezes; a treatment needs its time to work and a sealer needs a surface that has dried, so both wait for a dry spell. Growth comes back fastest on a surface that stays damp, so a clean before the wet months is a clean that lasts into them. Nothing about spring being busy or booking ahead. No dates, no promise about the weather. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom is a seasonal sign (a green film on the shaded side after a wet winter, moss in the gutters after autumn), say first when it is normal and then what is not, before anything else. Then the usual cause here in plain words, what the local shade, damp or housing adds (tree cover, a north facing side, a damp valley, coastal air, the surfaces the town's houses were built with), and what the business does about it. Never a claim that the town's drives or walls are dirty. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **Surfaces that never dry out in the wet months** (mechanism: the damp months, when nothing dries between showers): Say first what is normal from autumn to spring: a green film on the shaded side of a drive, a patio slippery after a week of rain, moss showing in the gutters once the leaves are down, all of which any surface does when it stays damp. Then what is not: a path that is slippery all year, growth that has gone black, water backing up at an outlet. The one cause this card makes: the damp months, when nothing dries between showers and growth gets ahead. Say what gets looked at and what waits, from the trade facts timing cells: wet cleaning of walls and paving is held off when frost threatens, a treatment and a sealer wait for a dry spell. Nothing about spring being busy or booking ahead. FAQ: Can you clean my drive or walls in winter? (Timing): What runs in the cold months and what waits, from the trade facts timing cells with the reason: a wash on hard paving runs when it is above freezing; wet cleaning of walls, brick and stone stops when frost threatens, because water left in the surface freezes and damages it; a treatment needs its time to work and a sealer a surface that has dried, so both wait for a dry spell. No dates, no temperature, no promise about the weather.

## Service page blocks by business type (service_page_blocks)

Draft, 4 Nov 2026. Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts; every row in this pack gives 7 or 8, so the fallback set below is rarely used) and the role based set is the fallback when the pack gives fewer than 6 (F-ITEMS-GENERIC); block 4 (signs you need it) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above), the FAQ slots (cost, timing, cover, rules, scope) and, with `seasonal_trade` on, the one card and one FAQ that swap in (the FAQ replaces the timing slot). The service's own trade facts rows (`trade-facts/pack.js rowsForService`) are the material every brief points at, so one type A entry serves a render soft wash, a block paving seal and a car park alike. Placeholders: `[SERVICE]` the page keyword without the town, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for pressure-washing".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).
- No desire variant: no page target in the library is desire led (the pack's only desire case, a clean before a sale or an event, is a situation line in card 1). No emergency variant: no page is flagged.

### Type A (project trade: every category)

Three framings share this one entry, per the pack's section 2: a problem led page (soft washing, roof, render, cladding, driveway and patio, brick and stone, decking, oil and rust stains, graffiti, fascia and soffit, conservatory) uses block 4 below as written; a schedule led page (block paving and concrete sealing, solar panel cleaning, and commercial cleaning where the client confirms planned visits) reads the "on a schedule led page" line in each brief, what slips and when; a commercial page (car park, tennis court and sports surface, industrial and warehouse) reads the "on a commercial page" line, the symptom in use and what it costs the site.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Checking what the surface is and how it's finished | The first stage from the trade facts: the surface and its finish identified (the paving and its joints, the render and its defects, the coating on the cladding or the decking, the tiles, the panel maker's instructions), and what must not be touched. A part of the job, not a promise about the quote. |
| Protecting what's around it | The protection stage from the trade facts: openings, vents, electrics, planting, ponds, cars and the neighbour's side covered or moved before any water goes on. Name only what the rows give for this service. |
| A test patch first | The trial stage from the trade facts: the least forceful method tried on a small patch and the result checked before the whole surface is done. Say why, from the done badly rows; no figure. |
| Keeping the wash water where it should be | The run off stage from the trade facts: drains covered or isolated, the wash water held back or collected where it carries a treatment, oil or paint, because only clean water belongs in a surface water drain (the facts row). Written as the principle of good work; the business's own practice only from [CV: materials_methods]. |
| The clean itself | The central stage from the trade facts, named as the trade names it for this service: a brush or a controlled wash, a treatment put on at low pressure and left for its labelled time, a hand clean, a scrub. A named method (a soft wash, a rotary cleaner, hot water) only from [CV: materials_methods]; never a pressure, a dilution or a dwell time. |
| Treating what the wash leaves | The treatment stage from the trade facts: growth or a stain that is still there after the wash treated rather than jetted harder, and left to work. Honest about what fades over weeks rather than vanishing (lichen spots, oil that has gone in, a rust shadow). A product only from [CV: materials_methods]. |
| Putting the joints and the finish back | The reinstatement stage from the trade facts for this service: kiln dried sand brushed into block joints where the wash moved it, a mortar joint made good, the exposed edges of render looked at, the connectors on a panel left dry, the seals on a conservatory checked. Name only what the rows give. |
| Checking it over before we go | The last stage from the trade facts: the surface inspected, the collected debris cleared, the gutters cleared of what came down, a commercial area reopened only once it is dry. What the customer sees when the job is done. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| What you've started to notice | dirt and growth the surface has held onto | The things a homeowner notices first, from the trade facts signs row for this service, in their words: green slippery patches, black spots, weeds in the joints, tyre marks, dark patches on the decking, streaks on the fascias, a film on the roof panels, moss in the gutters. The one cause this card makes: dirt and growth the surface has held onto. Then what it leads to if left, from the skipped row (growth stays on the surface people walk on, oil goes further in, moss sits over the outlets): specific, never alarming, never a slip figure. On a schedule led page (block paving and concrete sealing, solar panel cleaning, commercial cleaning with planned visits) the card is what slips and when: a seal thinning on the turning spots and the low spots where water lies, so stains soak in again and the joints lose their sand; a film on the panels as the dirt builds, at the pace the roof's position sets; bays greasy again between visits. The reason in the surface or the weather, never in the customer's diary. On a commercial page: the symptom in use (slippery bays, moss on a court, grime on the cladding) and what it costs the site in complaints and closed areas. Where the reader is cleaning before a sale or an event, the card is the situation (the date, the surfaces that show first), never a symptom invented for it. |
| It came back within months of the last clean | growth knocked off the top with its roots left in the pores | Green back on the drive, black patches back on the wall, within months of a wash. The one cause this card makes: growth knocked off the top with its roots left in the pores and the joints. From the trade facts soft washing rows: growth a treatment did not reach stays and regrows, and a treatment that was not left for its labelled time does the same. Say what this service does differently as the principle of good work: a treatment after the wash, left to work, so what lives in the surface is dealt with; honest that lichen spots shrink over the months rather than coming off on the day. On a schedule led page: a seal put on over an old coating that was never tested, so it did not bond and wore through early (the sealing done badly row); the old coating identified and tested first. Blame the method, never the customer's effort. Never promise it will not return; never a product unless [CV: materials_methods] gives it. Not the surface staying damp in the shade: the category page owns that. |
| A stain that's soaked in | a spill or a mark that went into the surface before it was dealt with | An oil patch dark in the middle of the drive, an orange rust mark under a planter or a gate, paint caught in the pores of brick, a tyre mark that a wash did not lift, from the trade facts signs rows. The one cause this card makes: a spill or a mark that went into the surface before it was dealt with. From the facts rows: oil soaks into paving, a fresh spill is soaked up rather than wiped (wiping spreads it), oil that has gone deep may lighten rather than vanish and a badly contaminated block is sometimes replaced; a rust shadow can stay; paint gets harder to shift the longer it sits. Say what the service does in plain words (the stain identified, the source stopped, a stain treatment tried on a patch, left to work, the contaminated water collected) and be honest about the result. On a growth page the card is the black lichen spot that is treated and left to fade rather than jetted. On a schedule led sealing page: stains soaking into an unsealed surface, which is what the seal is for. Never a product unless [CV: materials_methods] gives it; never promise the mark is gone. |
| Weeds and water in the joints | joints left open, so weeds root in them and water gets in | Weeds up through the block joints, sand gone from between the blocks so they rock, moss along the gaps between decking boards, dirt packed into the joints of cladding panels, debris at the conservatory gutter, from the trade facts signs rows. The one cause this card makes: joints left open, so weeds root in them and water gets in. From the facts rows: a wash across block joints takes the sand out, and kiln dried sand is brushed back into them so the blocks lock again; a damaged mortar joint is made good rather than re sanded; on render, cracks and loose patches show once the growth is off and need their own repair rather than being hidden; on cladding, dirt in the joints can hide a joint that is failing. Say what the service does at the joints as the principle of good work; the business's own practice only from [CV: materials_methods]. On a commercial page: debris at the gullies and water standing on a court. Not the pressure that emptied them: the category page owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much surface there is | The size factor from the trade facts price row for this service: the square metres, the number of walls, the length of the roofline, the number of panels, the layout of the car park. Say it plainly and give no figure. |
| How much has built up | Light growth against thick moss, a fresh spill against oil that has been there for years, several layers of paint, from the trade facts price row: heavier growth or an older stain needs a treatment, sometimes a repeat, and more time. Say the business looks before it prices, from [CV: quote_method] only. |
| Height and getting to it | A ground floor wall against a gable, a rear patio reached through the house, a roof or a solar array that needs a tower or a lift, a site that can only be done out of hours, from the trade facts price row. Say why height, a tight access and a short window add time; never a height. |
| What comes after the wash | Joints refilled, a mortar joint repointed, a sealer applied in its coats once the surface is dry, a stain treated, the wash water collected and taken away where it cannot go to the drain, from the trade facts price row. Each is part of finishing the job and each adds to it; the business's own practice only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us Which Surfaces Need Cleaning; We Look at the Surface and Price the Job, or We Price Your Job without the site visit practice; We Clean on a Date That Suits You).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The cost cards hold the list: never repeat it or point to it. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: the pack gives no standard duration for any of this trade's jobs, so say what decides it (the size of the surface, how much has built up, height and access) and where the waiting is (a treatment left for the time its label gives, a sealer that goes on only once the surface has dried and then needs keeping off while it cures). No figure. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised; never a promise the growth will not return or the stain is gone. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the clean? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Do I need permission for [SERVICE_LOWER]? | From the trade facts rule rows only, put as the thing that usually applies, with "usually" or "in most cases": cleaning is maintenance and usually needs no building approval; a listed building is where consent usually comes in, where the cleaning would affect what makes it special (abrasive methods most of all, and paint taken off a listed wall); a conservation area on its own does not stop the work; on a commercial site, wash water to the sewer is the site's consent to arrange, and anything taken off site goes with a registered waste carrier. During a hosepipe ban the water company's notice decides what can be done. What the customer does only as the row gives it. Never a standard's number, an Act's name or legal advice. Where the rows give no rule for this service, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words, naming the work itself (the surface checked, protected and test patched, the clean, the treatment, the joints put back, the wash water dealt with). What it does not cover only from the services list, with one sibling service page or the category page linked. Never 'on this page' or 'listed above'. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom is a seasonal sign (a green film on the shaded side after a wet winter, moss in the gutters after autumn), say first when it is normal and then what is not, before anything else. Then the usual cause here in plain words, what the local shade, damp or housing adds, and what this service does about it. Never a claim that the town's surfaces are dirty. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **What the wet months leave behind** (mechanism: water left on the surface through the cold months): What shows in spring after the cold months, from the trade facts signs row for this service. Say first what is normal after a wet winter (a green film across the shaded side of the paving, a slippery patch by the back door, the gutters full after autumn, boards dark with damp) and then what is not (growth gone black and rooted in, a joint washed empty, water backing up at an outlet). The one cause this card makes: water left on the surface through the cold months with nothing to dry it. Say what gets looked at in spring from confirmed practices only; otherwise what the job puts right, and why it waits for a dry spell (a treatment needs its time to work, a sealer a dry surface, from the timing cells). Not the roots left behind (card 2) and not the joints (card 4). FAQ: When is the best time of year for [SERVICE_LOWER], and how long does it take? (Timing): From the trade facts timing row only: the weather the job needs and why (a dry spell for a treatment to work and a sealer to go on; no wet cleaning of walls and paving when frost threatens), then what decides how long it takes, since the row gives no standard duration. No dates, no figures, no promise about the weather. This is the one place the timing is written.

## Location page blocks by business type (location_page_blocks)

Draft, 4 Nov 2026. Used by the location page job (CORE (18)): block 4 (the problems the town's surfaces have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the niche steps. The briefs are town wide, not per category: the town profile, the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED). The pack's section 3 rules hold: growth follows shade and damp, surfaces follow the housing, every anchor must change the method, and nothing says the town's drives or walls are dirty. No seasonal swap and no symptom question on a location page. The type is the client's, never a category override. Placeholders: `[WORK]` the primary category's work noun, `[WORK_LOWER]`, `[TOWN]`, `[CITY]`.

- A niche with no section here has its location pages refused: "no location block briefs for pressure-washing".

### Type A (project trade: the client's type is A)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The shaded side that never dries | the town's tree cover and the sides it keeps in shade | A drive green on one side and clean on the other, a patio under a tree slippery by the end of winter, render streaked on the side the sun never reaches. The one cause this card makes: the town's tree cover and the sides of its houses that sit in shade; the town profile and a symptom say which (mature trees along the older roads, a north facing slope, a wooded edge). Say what it means for the work in plain words: a shaded surface greens over faster, so what slows the return matters more there, and the anchor is only worth naming where it explains that. Never a claim that the town's drives are dirty; never a promise the growth stays away. Not the roots left behind or the joints: the town's service pages own those. |
| Surfaces that go with the houses | what the town's houses were built and surfaced with | Block paved drives on the estates of one era, render and cladding on the newer homes, soft old brick and lime pointing on the terraces, local stone where the research confirms it. The one cause this card makes: what the town's houses were built and surfaced with, which the town profile dates. Tie the era to the method, never to the state of anyone's house: an older brick face wears under a hard jet and is cleaned gently; render takes a low pressure treatment, not a jet; block paving takes a controlled wash and then its joints refilled (the trade facts facts rows). A material only where the profile or the research gives it. Not the damage a wrong setting does: the town's category page owns that. |
| Damp air off the river or the sea | damp air from the town's river, low ground or coast | Walls that stay dark for days after rain, decking that never quite dries, green on every north facing fence and shed. The one cause this card makes: damp air from the town's river valley, its low ground or the coast, which the town profile gives; coastal air also leaves salt on glass, frames and panels. Say what it does to the work in plain words: a surface that is damp more of the year greens faster and needs the growth treated, not only washed, and a treatment waits for a dry spell to work. Only where the profile gives the water or the coast; otherwise the card takes the town's low lying or sheltered streets. Never a judgement about the town's homes. Not shade: card 1 owns that. |
| Drains that run straight to the stream | surface water drains that run to the town's river or stream | A gully in the drive that comes out in the brook at the bottom of the road, a soakaway under the front garden, a pond or a border right beside the patio. The one cause this card makes: surface water drains that run to the town's river or stream, so what goes down them matters more here; the town profile gives the river, the stream or the flood setting. Say the principle of good work from the trade facts rows, not this business's process: only clean water belongs in a surface water drain or a soakaway; water carrying a treatment, oil or paint is held back, collected or taken away; plants and ponds beside the work are covered. Never the regulation's name; the business's own practice only from [CV: materials_methods]. Not the joints or the growth: other pages own those. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Getting water and a machine to the back | Where the back patio can be got to only through the house or by a shared side path, the hose and the machine come through and the van stays on the road. Say why that adds time (never "the only way": a superlative); the town profile says which streets are terraced. No figure. |
| Height on the town's houses | Three storey terraces, tall rendered gables, roofs and solar arrays that need a tower or a lift rather than a ladder, from the profile where it gives the housing. Say why height adds time and equipment, from the trade facts price rows. No figure, never a height. |
| Conservation areas and listed buildings | Where the town has conservation areas or listed buildings, the checks before a wall is cleaned add time, trials come before the clean, and some methods cannot be used at all. "Usually", never the Act's or the area's official name. From the dossier rules only; otherwise a gentle method and a test patch as what sometimes applies. |
| Where the wash water has to go | A drive beside a stream, a site on a soakaway, a car park with an oil trap: wash water that cannot go to the drain is held back, collected and taken away, and that adds time and kit (the trade facts price rows: drain isolation and water recovery). From the profile where it gives the river or the ground; the business's own practice only from [CV: materials_methods]. No figure. |

**Steps.** The niche steps (Tell Us Which Surfaces Need Cleaning; We Look at the Surface and Price the Job; We Clean on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (access through the house, height, where the wash water goes) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised; never a promise the growth will not return. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the clean? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends (which surfaces, a photo), what the business looks at (the surface, the growth, access, where the water goes), what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year for [WORK_LOWER] in [TOWN]? | From the trade facts timing cells, with the reason in the weather or the surface: most cleaning runs through the year; wet cleaning of walls and paving is held off when frost threatens; a treatment needs its time to work and a sealer a surface that has dried, so both wait for a dry spell. Where the town profile gives the shade or the damp (a wooded side of town, a river valley, the coast), say what it does to how fast growth returns there. Nothing about spring being busy or booking ahead. No dates, no promise about the weather. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

- **The Window Cleaning Service and Gutter Cleaning Service tabs.** The pack's section 2 table covers Pressure Washing Service only, so both take the default, A. A window round is a round; if a client of this niche runs one, the Cleaning entry's type B briefs are the nearer fit, and Brandon should say whether those tabs point at B here (a `category_types` line and three B block entries) or stay A.
- **No desire led page.** The pack names one desire case (a clean before a house sale or an event) and no page target carries it, so no library row is flagged and there is no desire variant. If Brandon wants a "pre sale exterior clean" page, it is a new library row with `desire_led` set and a desire variant in `service_page_blocks.A`.
- **The trade facts pack is unverified** (generated 20 Oct 2026, `verified: no`). The service page gate refuses a run until it is checked. Nothing in this entry depends on a figure from it, but the roof moss, lichen, jointing sand and runoff rows carry the briefs and should be read first.
- **No job durations.** Table A gives "varies; no standard" for every service, so every timing brief says what decides the time and never a figure. Ask the client for a typical duration for three jobs.
- **No sealer interval, no cleaning interval.** The only figures are one maker's product claims (Tables E and G), so the sealing and "how long will it stay clean" briefs give the reasons and no interval. Ask the client whether they state one.
- **Pressures and distances.** Table E gives one maker's lance distance and qualitative settings, and no universal damaging figure. Every brief says "no figure"; the copy names the surface and the method, never a pressure.
- **Biocide, dwell time, dilution.** Product specific throughout (Weber, Ronseal, Smartseal rows), so the briefs say "left for the time its label gives" and name no product; a soft wash as this client's method only from the tick list.
- **"Safe for pets and plants".** Banned as a phrase. The facts pack (bleach rows, runoff rows) supports only the principle of protecting plants, ponds and drains; a client who wants a safety claim needs the product label and Ray's call.
- **Walking the roof.** The roof cleaning rows say removal from the ground or supported access and no pressure washing of tiles. If a client's method is to walk the roof or jet it, the Roof cleaning page cannot say so without contradicting the facts; ask before the page runs.
- **Hosepipe bans.** The facts give the rule (a paid cleaner is not automatically exempt; the water company's notice governs). Ask the client what they do in a ban, so faq_F can say it.
- **Commercial sites.** Trade effluent consent and oil traps are the site's to arrange (Table C). Ask a commercial client whether they collect wash water and hold a waste carrier registration, so the car park, industrial and sealing pages can say so.
- **Trade bodies.** The Soft Washing Association, the Pressure Washing Association (UK) and Resiblock approved installers could not be verified (Table G) and are not in the logo tiers; a client who claims one needs the certificate for Ray.

## Alternate Why title that promises a practice (why_title_practice)

"The Right Method for Every Surface" stands only with a practice no tick confirms, so never by default; otherwise the point reads "Our Track Record".

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| How long will my drive or patio stay clean? | Driveway and patio cleaning |
| Why has my drive gone green again so soon after it was cleaned? | Driveway and patio cleaning |
| Can a jet wash harm my paving? | Driveway and patio cleaning |
| Do I need permission to have my walls cleaned? | Brick and stone cleaning; Graffiti removal |
| A stain that's soaked in | Oil and rust stain removal; Graffiti removal |
| Conservation areas and listed buildings | Brick and stone cleaning; Render cleaning; Graffiti removal |

## Idea homes

- **growth regrows when the clean only knocked off the top and left the roots in the pores and joints** (homepage): home is the 'Why has my drive gone green again so soon after it was cleaned?' FAQ. Elsewhere: the 'How long will my drive or patio stay clean?' FAQ names only what slows the return and does not explain roots left behind; the soft wash FAQ sticks to how the two methods differ.
- **how the price is reached (visit, photos, call)** (homepage): home is the 'How do your quotes work?' FAQ. Elsewhere: the pricing step says only that a price is agreed before work starts; the 'free and no obligation' FAQ answers only the free question.
- **how the quote is given and that the business looks before it prices** (category): home is the 'What happens when I ask for a quote?' FAQ. Elsewhere: the 'How much has built up' cost card and the cost FAQ do not describe the quoting method.
- **wash water kept out of drains that run to the local stream, then collected and taken away** (location): home is the 'Where the wash water has to go' cost card. Elsewhere: the 'Drains that run straight to the stream' card names the drain and the stream but does not describe collecting the water; the cost FAQ names the water only as one price factor in a few words.
