# Niche Library Entry: Guttering & Fascias

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry). Every slot is required; an empty slot stops the run (G-NICHE). Code reads `niche-library/guttering.json`; this file is the same content for people, kept in the same commit.

Business type: **A (project trade)** for every GBP category this trade carries (Guttering & Fascias Calibration Pack v1, section 2). A Gutter Cleaning Service is A with its cards written schedule led, not B: most customers book one visit when they see the water spilling, and few run a round. Emergency niche: **no** (no page in `guttering.csv` is flagged emergency; an overflowing gutter is urgent to the reader but is booked as a visit, not a call out). Seasonal: **yes** (the clear follows leaf fall and the winter rain; the reason is always in the trees and the weather, never a busy season). Desire led pages: the library's `desire_led` column flags the Aluminium guttering, Fascias and soffits and Cladding targets (Guttering installation is flagged in the roofer library, where that page is defined).

Sources, in order of authority: `calibration-packs/Guttering_Calibration_Pack_v1.md` (sections 1, 2, 4, 7), `trade-facts/guttering.md` (Tables A to G; header says verified: no), `niche-library/guttering.csv` and `fillout/services/guttering-and-fascias.json` (one tab, Roofing services). The shared pages (Gutter repairs, Guttering installation, Fascias and soffits, Cladding, Dry ridge and dry verge) are defined in `roofer.csv`; this entry keeps the roofer's lines on them: strip rather than cap, the 1990s uPVC roofline as an era claim only, a bracket and a lost fall behind a dripping joint.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Guttering / guttering |
| trade_person / trade_person_plural | guttering specialist / guttering specialists |
| homepage_keyword | Guttering (4 Nov 2026, Brandon: the homepage keyword is a way of saying the primary GBP category, picked on search volume; the H1 research pattern and the thin runner read it) |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | no (No page in guttering.csv is flagged emergency (4 Nov 2026): an overflowing gutter is urgent to the reader but is booked as a visit, not a call out. If a client confirms call outs the pages still get the plain briefs; an emergency variant would be a new section here, not code.) |
| big_ticket | yes (a whole roofline replaced, new guttering on the whole house, cladding) |
| schema_subtype | HomeAndConstructionBusiness (schema.org has no guttering or roofline subtype; RoofingContractor would claim a trade the client may not do, so the general one is used) |

## Priority services

None. The homepage cards follow the client's jobs_wanted, then core_services below.

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| gutters, guttering, downpipe, fascias, soffits, roofline, the wall below, damp patch, overflowing, dripping, sagging, brackets, joints, leaves and moss, house, home | rainwater goods, rainwater system, roofline system, eaves, union, outfall, catchment, substrate, overcladding, property, solutions, seamless, PVC-U, PVC-UE (words_avoid_exceptions: seamless: allowed only as the client's own service name (a Seamless guttering tab or page), and then to say what the system is, never that a run has no joints: the trade facts say aluminium lengths are jointed; eaves: allowed in 'eaves protection' where the trade facts stage names it, once; otherwise say the roof edge) | fresh new look, a fresh new look, maintenance free, zero maintenance, never clean your gutters again, no more gutter cleaning, fit and forget, subsidence, collapse, structural damage, kerb appeal, transform your home, transform your roofline, signs you need aluminium (the pack's section 7: lifestyle language on roofline work, guards sold as an end to clearing, water damage overstated into a scare, symptoms invented for an upgrade) |

## Buttons and headings

| Slot | Value |
|---|---|

| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us what your gutters are doing and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us what your gutters are doing and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no page is flagged emergency) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us What Your Gutters Are Doing**
   Brief: What to tell them: where the water spills or drips, which side of the house, how many storeys, whether a conservatory or an extension sits under the gutter, and that photos taken from the ground help. Never encourage the customer to go up a ladder or onto a flat roof to look. No promise of a reply time unless [CV: response_time] is set.
2. **We Look at the Roofline and Price the Job** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: The visit and what gets looked at: the run and its brackets, the joints, the outlets and downpipes, the boards behind the gutter, how the water leaves at the bottom and how the roofline is reached. Follows [CV: quote_method]; only say the quote is written if quote_method says so; the customer shown what was found only from the photos_of_faults practice. Never restates 'free' (FAQ 5 owns it).
   Without the practice (`step_2_no_visit`): **We Price Your Job**
   Brief: Say a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it).
3. **We Do the Work on a Date That Suits You**
   Brief: The date is agreed once the quote is accepted, to suit the customer. Never mention the price, the quote or changes to the work (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer_warranty → insurance |
| fears (in order, one per Why choose us point; the pack's section 1: the clearing customer and the replacement customer) | 1. a quick clear that does the front of the house, misses the back and leaves the mess on the drive; 2. the gutter emptied but the outlet and downpipe left blocked, so it spills again in the next downpour; 3. new boards fitted over rot that is still there behind them; 4. a new run dripping from its joints again within a couple of winters |
| fears_by_type | none: there is no type B in this niche |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D.

- **Ratings (always first):** Google (needs review_count 5+), Checkatrade, Trustpilot, Which? Trusted Traders.
- **Tier 1, trade bodies and registers:** NFRC (National Federation of Roofing Contractors), TrustMark, FMB (Federation of Master Builders). None is a legal requirement for gutter or fascia work; say membership, never a licence.
- **Tier 2, manufacturer approvals and insurance backed guarantee providers:** Swish Approved Installers, Freefoam Registered Installers, QANW (insurance backed guarantees), HomePro (insurance backed guarantees). A manufacturer's approval covers that maker's installations only; an insurance backed guarantee is a separate policy on registered work, never automatic.
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards: Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|

| faq_2 | Are you insured? | The cover figure and what it is for, with a plausible roofline example that does not suggest carelessness (a tile cracked while the fascia is changed, a conservatory pane below the work). Never what it pays or who it covers. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. A manufacturer's roofline guarantee only from [CV: manufacturer_warranty], with the maker named as the trade facts name it and never stretched into a lifespan or into workmanship cover; insurance backed only where [CV: guarantee_scope] says so. | no | Trust |
| faq_3_none | What happens if the gutter still leaks after the work? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what it is doing and we'll look at it. Then the 'reasonable care and skill' standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. Nothing about autumn being busy. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How often do gutters need clearing? | There is no rule: the makers advise at least a yearly clear, more where trees stand close or the wind brings debris (the trade facts fact row), written as the makers' advice and never as this client's schedule. Then the reason in the trees and the weather: gutters fill as the leaves come down in autumn and want emptying before the heavy rain of winter; a roof under trees that shed seed and blossom can fill a second time in spring; a shaded roof sheds moss into the gutter through the wet months. Water coming over the lip during a downpour means the run can take no more: say so. A visit pattern for this business only from [CV: visit_frequency_options]. | no | Timing |
| faq_B | Why does water pour over my gutters when it rains? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words, from the trade facts: debris that has worked along to the outlet and packed there, so the water backs up the run; a run that has dropped out of its fall where a bracket has given, so water stands and spills at the low point; a gutter too small for the roof that drains into it, or an outlet in the wrong place, so it tops over in hard rain whatever the state of it. Then what the local trees or housing add, then what is done about it: the outlet and downpipe cleared and the flow checked, the bracket and fall reset, or the run looked at for the roof it serves. Never say a wet joint always means a failed seal. | **yes** | Process |
| faq_C (fallback) | Should my gutters be repaired or replaced? | The honest test from the trade facts: one dripping joint, a loose bracket or a short length that has come away, with a matching fitting still made, is a repair; joints failing along the run, fittings nobody makes any more, or a fascia gone soft behind the brackets so nothing sound holds a repair, is where replacing the run (and the boards with it) stops being the dearer answer. Never a dig at the old run's installer; never a lifespan for any material unless the trade facts state it with the maker named. | no | Fit |
| faq_D (fallback) | Do gutter guards stop gutters blocking up? | An honest answer from the trade facts: a guard or a brush insert slows what gets into the gutter, but seed, silt and moss still gather on and under it, and a guard has to suit the gutter's profile or it sits loose. The gutters still want looking at, with the outlets kept reachable; nothing ends clearing for good. Fitted only where the services list has the page; a product only from [CV: materials_methods]. | no | Process |
| faq_planning (big_ticket AND [CV: handles_planning] confirmed) | Do I need permission to replace my fascias and gutters? | From the trade facts rule rows, as what usually applies, with "usually" or "in most cases": replacing fascias, soffits and gutters like for like on an ordinary house usually needs no planning application; a conservation area or a listed house can change that, most of all where cast iron or timber would be swapped for another material, and cladding a house in a conservation area usually does need permission. What the customer does about it only as the row gives it. Never an Act's or an order's name, never legal advice. | no | Process |
| faq_E (fallback) | Where does the water from a new gutter have to go? | From the trade facts rule rows only, in plain words: roof water has to be taken somewhere that can cope with it, into the ground where it can soak away first, a watercourse where it cannot, a sewer only after that; a downpipe may end on a surface only where that surface drains, with a shoe turning the water away from the house; a soakaway is kept away from the house and the road; a new connection to the public sewer usually means the water company is told first, and a sewer that takes only foul water is not the place for it. A like for like repair usually needs none of this. Never a distance, a notice period or a regulation's name. | no | Process |

Sources for faq_A to faq_E: the pack's section 1 readers and the trade facts fact and rule rows. Replace with real customer questions when Brandon or the client supplies them. There is no faq_slots_by_type: every category is A.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).

- Gutters: uPVC half round / uPVC square / uPVC deep flow / aluminium / cast iron / steel
- Brackets: fascia brackets / rafter brackets / rise and fall brackets
- Downpipes: round / square / uPVC / metal / to a gully or drain / to a water butt
- Roofline: uPVC fascia, full replacement / timber fascia / capping over sound timber only / solid soffit / ventilated soffit / over fascia vents / eaves protection trays / bargeboards and box ends
- Cladding: uPVC cladding / timber weatherboarding
- Gutter guards: clip in guards / brush inserts
- Access: ladders / tower / scaffold / gutter vacuum from the ground
- Other: waste taken away / photos before and after / water tested after fitting / birds and bats checked before soffit work

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

gutter cleaning, gutter clearing, gutter clearance, gutter vacuum, gutter repair, gutter repairs, gutter replacement, gutter installation, new guttering, guttering, downpipe, downpipes, rainwater pipe, aluminium guttering, seamless guttering, cast iron guttering, commercial guttering, gutter guards, leaf guards, gutter brush, fascias, soffits, fascia boards, bargeboards, box ends, roofline, roofline replacement, cladding, weatherboarding, dry verge, dry ridge, loft ventilation, soffit vents, over fascia vents, water test

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|

| gutter cleaning | gutter cleaning |
| gutter clear | gutter clearing |
| gutter vac | gutter clearing |
| gutter installation | new guttering |
| gutter replacement | new guttering |
| new gutter | new guttering |
| gutter repair | gutter repairs |
| roofline maintenance | gutter repairs |
| downpipe | downpipes |
| rainwater pipe | downpipes |
| aluminium | aluminium guttering |
| seamless | aluminium guttering |
| cast iron | cast iron guttering |
| commercial gutter | commercial guttering |
| gutter guard | gutter guards |
| leaf guard | gutter guards |
| leaf protection | gutter guards |
| hedgehog | gutter brushes |
| fascia | fascias and soffits |
| soffit | fascias and soffits |
| roofline replacement | fascias and soffits |
| roofline | fascias and soffits |
| bargeboard | bargeboards |
| cladding | cladding |
| dry verge | dry verge |
| dry ridge | dry ridge |
| loft ventilation | loft ventilation |
| attic vent | loft ventilation |
| skylight | (never named) |
| roof installation | (never named) |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). The keys are the client's category tab names in lower case (the one Fillout tab is Roofing services; the others are the GBP categories a guttering client is seen with). JSON slot: core_services.

- Roofing Services: gutter cleaning, gutter repairs, new guttering, fascias and soffits, downpipes, cladding
- Gutter Cleaning Service: gutter cleaning, downpipes, gutter guards, gutter repairs
- Guttering Service: new guttering, gutter repairs, gutter cleaning, fascias and soffits, downpipes
- Roofer: gutter repairs, new guttering, fascias and soffits, cladding
- Roofing Contractor: gutter repairs, new guttering, fascias and soffits, cladding

Service words for the whole job rather than one service: guttering, roofline, gutter cleaning, roofline replacement. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: gutter repairs. When an FAQ question names the job as well as the problem ("Can you fix the leaking joint when you fit the new fascias?"), it goes to the job's page, not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices (`niche-library/practices.json`, shared by all niches). The briefs here name the practice key a line depends on: written_quote, photos_of_faults, scaffolding_in_quote, extra_work_agreed_first, property_protected, price_agreed_before_work, waste_removal, return_visit, weather_delays_rebooked, site_visit_before_quote. The pack's section 7 names three claims that are this client's practice only when confirmed: a clearing frequency, before and after photos, waste taken away.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures (the trade facts give no duration for any roofline job). Ask every guttering client for:

- a "from" price for 3 typical jobs (a gutter clear on a two storey semi, a run of fascias and soffits, a gutter run replaced);
- a typical duration for the same 3 jobs;
- whether quotes are written, and whether the price is fixed once agreed;
- how the roofline is reached (ladders, tower, scaffold, a vacuum from the ground) and whether scaffold is in the quote;
- whether a clear covers the outlets and downpipes and the water is checked flowing (the pack's craft rule 3; the copy says it as the principle of a good job until confirmed);
- whether old boards are stripped or capped, and when capping is offered;
- which maker's roofline system is fitted, and whether its guarantee is registered for the customer;
- whether a clearing round or annual plan is sold (the pack's note to Brandon: type B may fit that client better; nothing here is written for it).

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Local Experience Behind Every Job**
2. Cover → **Covered If Something Goes Wrong**

## Business type notes (business_type_notes)

Every GBP category this trade carries is A (Guttering & Fascias Calibration Pack v1, section 2): a Gutter Cleaning Service is A with its cards written schedule led, not B, because most customers book one visit when they see the water spilling, and few run a round. So category_types is empty and there is no type B entry; a client who sells annual clearing plans is a question for Brandon (the pack's note), not a type here. The pack's split inside type A is carried in the card briefs: schedule led (what slips and when, with the reason in the trees and the weather) for gutter cleaning, downpipes, gutter guards and leaf protection and commercial gutter clearing; problem led (symptom, cause, consequence) for gutter repairs, fascias and soffits, bargeboards, dry ridge and dry verge, cast iron guttering repairs and cladding where it has failed; desire led (the customer's situation, never an invented symptom) for guttering installation as an upgrade, aluminium guttering and a whole roofline replaced to end the repainting, which the library's desire_led column flags on the Aluminium guttering, Fascias and soffits and Cladding targets (Guttering installation is flagged in the roofer library, where the page is defined). No page is flagged emergency. Seasonal: yes, the clear follows leaf fall and the winter rain.

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": roofing services → guttering, gutter cleaning service → gutter cleaning, guttering service → guttering, roofer → roofline work, roofing contractor → roofline work. A category with no noun reads "[CAT] Services" and is flagged. The briefs use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

4 Nov 2026. Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above), the FAQ slots and, with `seasonal_trade` on, the one card and one FAQ that swap in. Placeholders: `[CAT]` the page keyword without the town, `[CAT_LOWER]`, `[WORK]` the work noun, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) and the shared rules apply to every brief: claims only from client values, no figures, no promises, never a figure or a rule the trade facts do not state.

- `seasonal_trade`: yes
- `category_types`: empty (every category is A; the pack's section 2 table).
- A niche with no section here has its category pages refused: "no category block briefs for guttering".

### Type A (project trade: every category)

The pack's section 2 split inside type A is carried card by card: card 1 is schedule led (the clear: what fills a gutter and when), cards 2 and 3 are problem led (symptom, cause, consequence: the repairs and the roofline), card 4 is a situation card for the desire led services (a whole roofline or new gutters), and each brief says how it reads on a Gutter Cleaning Service page against a Roofer or Guttering Service page. Every card follows the water: where it goes and what it does to the wall below, never a scare.

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|

| Water pouring over the gutter in every downpour | an outlet packed with what the roof shed | Schedule led: the lead card on a Gutter Cleaning Service page and the clearing card on every other category. What the customer sees: a curtain of water off the gutter in rain, a plant growing out of it, a downpipe that gurgles and gives nothing at the bottom (the trade facts signs row). The one cause this card makes: an outlet packed with what the roof shed, so the water backs up the run and goes over the front. What fills a gutter and when, from the timing and fact rows: leaves in autumn, moss sliding off a shaded roof through the wet months, seed and blossom in spring under trees, all of it washing along to the outlet and settling as silt. Where the water goes next: down the wall beneath and into the brickwork, and against the footings at the bottom, said as what it does to a wall and never as a scare. What a proper clear covers, as the principle of a good job and never this business's process unless confirmed: the whole run, the outlets and the downpipes, with the water checked running away. Never a clearing frequency as this client's practice. Never tell the reader to look from a ladder. |
| Drips at the joints and a dip in the run | a bracket that has given, so water stands and works at the seals | Problem led: the Gutter repairs card, and the cast iron and aluminium repair card where the client has those pages. What the customer sees: a drip from a joint in rain, a length that has dropped between two brackets, a bracket hanging loose, water running down the back of the gutter (the trade facts signs row). The one cause this card makes: a bracket that has given, so the run has lost its fall and water stands at the low point and works at the seals. Say that the joint is not always the fault (the trade facts fact row): a packed outlet raises the water at a joint, a length fitted with no room to move pushes a seal, so the cause is checked before anything is resealed. What the fix usually involves from the stages: the bracket refixed or added, the fall reset, the seal, length or fitting replaced with a matching one, the run water tested; a section replaced rather than patched where the run is unsound. Not the board behind the bracket: card 3 owns that. Never a dig at whoever fitted it. |
| A gutter coming away from the house | the board the brackets screw into gone soft | Problem led: the Fascias and soffits and Bargeboards card. What the customer sees: a gutter pulling off the roofline, paint peeling and a board that feels soft when pressed, a gap at the soffit, the gable board open at the top (the trade facts signs rows). The one cause this card makes: the board the brackets screw into has gone soft, so nothing holds the gutter's line or its fall. Where the water goes: behind the gutter and into the board, then to the rafter ends it is fixed to. What putting it right involves from the stages: the old boards off to show the rafter ends, any soft timber repaired, fresh boards screwed to timber that is sound, the vents and eaves protection put back, the gutter rehung with its fall. Say plainly what the cheap job does: boards capped over damp or rotten timber hide the rot and keep it damp (the trade facts fact row); capping is for sound, dry timber that has been looked at, and only a look at the boards on the day says which this is. Never 'rooflines here are rotting' or any claim about the state of the houses in the town. What the business itself does only from confirmed practices. |
| Boards you keep having to paint | a roofline chosen for the house as it was built, now needing more looking after than the owner wants | A situation card, not a fault: the desire led card for Guttering installation, Aluminium guttering and a whole roofline replaced. The household repaints timber fascias and gutters every few years and the paint is flaking again a season later; or an extension or a conservatory roof was never given a gutter and water sheets off its edge; or the gutters are a patchwork of profiles from past repairs. The one cause this card makes: a roofline and gutters chosen for the house as it was built, now asking for more looking after than the owner wants to give. What the work gives them, from the trade facts stages: the boards and the gutters renewed together, each screwed to timber that is sound, a run chosen for the roof it drains with the outlets where they do most good, water tested before the job is left; uPVC, aluminium or cast iron only as [CV: materials_methods] gives them. A product guarantee only from [CV: manufacturer_warranty] with the maker named as the trade facts name it; never a lifespan, never 'maintenance free', never a lifestyle pitch. On a Gutter Cleaning Service page this card reads instead as the gutter that is full again weeks after a clear under heavy trees, and guards or brush inserts as an option that still needs the outlets kept reachable and the gutters looked at (the trade facts fact row), never as an end to clearing. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|

| How high the gutter is and how it's reached | The storeys, a conservatory or a lean to under the gutter that nobody stands on, a narrow side passage, a run over a fragile roof, from the trade facts price rows. Whether the job is done from a ladder, a tower or a scaffold is decided by the risk and the time up there, never by a rule that two storeys need scaffold (the trade facts fact row); a clear can be done from the ground with a vacuum where the run allows. Scaffolding in the quote only from the scaffolding_in_quote practice; a scaffold on the pavement usually needs the council's licence first, never the Act's name. No figure. |
| The length of the run and the number of downpipes | More metres of gutter, more corners, outlets and downpipes, more roof levels, from the trade facts price rows: more fittings, more joints and more time at height. On a clearing page it is how many runs and how many downpipes have to be cleared and checked. Say it plainly and give no figure. |
| What's behind the gutter, or packed inside it | For new gutters and roofline: rafter ends and boards gone soft, fittings nobody makes any more, a verge or edge tile that has to be lifted and put back, from the trade facts price rows. For a clear: debris compacted to silt, a downpipe blocked as well as the gutter, waste to take away. Say the business looks before it prices, from [CV: quote_method] only; extra work priced and agreed before it is done only from the extra_work_agreed_first practice. No figure. |
| What you choose to fit | uPVC against aluminium against cast iron, a full roofline replacement against capping over sound boards, a ventilated soffit against a solid one, a guard or brush insert after a clear: name a material only if the trade facts or [CV: materials_methods] give it, a product only from [CV: materials_methods]. Why one costs more than another in the fittings and the fixing, not the brand. Expected life only as the trade facts fact rows state it, with the maker named, never as a guarantee. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing (the seasonal FAQ takes the timing slot's place when the swap is on).

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|

| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (the height and how the roofline is reached, the length of the run and its downpipes, what is found behind the gutter) and how the quote is given, from [CV: quote_method] only. Never a figure from memory. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]: whether a repair is covered as well as a new run only as the scope says. Insurance backed only where [CV: guarantee_scope] says so; a maker's roofline guarantee only from [CV: manufacturer_warranty], never confused with how long the material lasts. Described, never promised. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible roofline example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if the gutter still leaks after the work? | Open with what the customer does: tell us what it is doing and we look at it. Then the reasonable care and skill standard every trade works to, as the standard the work is held to, never as a defence. A return visit only from the return_visit practice. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What [WORK_LOWER] work do you take on? | The jobs themselves, named from the card list (clearing, repairs, new gutters and downpipes, fascias and soffits, as the client has them) and the size of job taken on, from the services list and [CV: typical_jobs] only: a single dripping joint or one blocked downpipe only where typical_jobs says so; commercial runs only where the services list has the page. Link one service page. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends (where the water comes over or drips, which side of the house, photos from the ground, never from a ladder), what the business looks at (the run, the brackets and the fall, the boards behind, the outlets and where the downpipes end), what comes back (photos of what was found only from the photos_of_faults practice; a written quote only from written_quote). No timescale unless [CV: response_time] is set. | Process |
| timing | always | Can [WORK_LOWER] work be done in winter? | From the trade facts timing cells: the work runs all year when the roofline can be reached safely; wind, ice on the ladder or the roof and heavy rain stop it for the day, with no figure. A clear sits best after the leaves are down and before the winter rain, for the reason in the trees, and soffit work waits where a bird's nest is in use, whatever the month (the trade facts fact row: there is no fixed nesting season to work round). A rained off day rebooked only from the weather_delays_rebooked practice. Never 'autumn is a busy time'. No dates. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: follow the water. Where it comes from, where it goes (over the front edge onto the wall, behind the gutter into the board, down a cracked downpipe into the brickwork, onto the ground at the foot of the wall) and what it does there, in plain words and never as a scare. Where the symptom is a seasonal sign (a gutter full after leaf fall, moss in the gutter through a wet winter), say first when it is the season and then what is not. Then what the local trees or housing era add, then what the business does about it. One figure at most, and it must come out of a trade facts row. Never describe how any gutter in the area is today. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **Full again before the winter rain** (mechanism: leaves that come down in weeks and rot to silt over the winter): Schedule led, swapped in for card 4 by the time of year. Say first that gutters filling as the leaves come down is the season, not a fault. The one cause this card makes: leaves that come down in a few weeks and lie wet in the gutter, breaking down to a silt that packs the outlet by the time the heavy rain arrives. The reason in the trees and the weather, from the trade facts timing and fact rows: the clear belongs after the leaves are down and before the winter rain; a roof under trees that shed seed and blossom fills a second time in spring; a shaded roof sheds moss into the gutter through the wet months, and moss in the gutter does not on its own mean the roof needs treating. What a clear in its window gives: an empty run, open outlets and downpipes checked running when the rain comes. A visit pattern only from [CV: visit_frequency_options]; never 'autumn is a busy time' or anything about booking ahead. FAQ: When is the best time of year to have the gutters cleared? (Timing): After the leaves are down in late autumn and before the heavy rain of winter, with the reason: what lies wet in the gutter through the winter breaks down and packs the outlet. Then what changes it, from the trade facts: a second look in spring under trees that drop seed and blossom; moss washing off a shaded roof through the wet months; the makers' advice of at least a yearly clear, more near trees, written as their advice and never as this client's schedule. Water coming over the lip during a downpour means the run can take no more: say so. No dates, nothing about a busy season.

## Service page blocks by business type (service_page_blocks)

4 Nov 2026. Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (signs you need it) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (A: cost, timing, cover, rules, scope) and, with `seasonal_trade` on, the one card and one FAQ that swap in (the FAQ replaces the timing slot). Type A uses the niche steps. A page the library flags `desire_led` reads the desire led variant (below) in place of block 4 and the seasonal card. The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type A entry serves a clear, a gutter repair, a run of fascias and a dry verge alike. The pack's section 2 framing (schedule led, problem led, desire led) is named in the card briefs. Placeholders: `[SERVICE]`, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`.

- A niche with no section here has its service pages refused: "no service block briefs for guttering".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type A (project trade: every planned page)

Three framings share this one entry, per the pack's section 2: a problem led page (Gutter repairs, Bargeboards, Cast iron guttering repairs, Dry ridge and dry verge, Cladding where it has failed) uses block 4 below as written; a schedule led page (Gutter cleaning, Downpipes, Gutter guards and leaf protection, commercial clearing) reads the "schedule led" line in each brief, what slips and when, with the reason in the trees and the weather; a desire led page (the library's `desire_led` column: Aluminium guttering, Fascias and soffits, Cladding here, Guttering installation through the roofer library) swaps block 4 and the seasonal card for the desire variant at the end of this section.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|

| Looking at the whole run before anything is touched | The survey or inspection stage from the trade facts: the gutter and its fall, the brackets, the joints, the outlets, the boards behind, where the downpipes end, and how the roofline is reached. A part of the job, not a promise about the quote. |
| Safe access to the roofline | The access stage from the trade facts: a ladder, a tower, a scaffold or a vacuum worked from the ground, chosen by the job and the time up there, never by a rule that two storeys need scaffold (the trade facts fact row); a conservatory roof is never stood on. Scaffolding in the quote only from the scaffolding_in_quote practice; the drive, the glass and the garden below protected only from property_protected. |
| Taking out what has failed or filled | The removal or clearing stage from the trade facts: the leaves, silt and moss out of the run and the outlets; the failed seal, bracket or length off; the old boards stripped out so the timber behind can be seen, never capped over where it is damp or soft. |
| Putting right what the gutter fixes to | The rafter ends, the fascia, the brackets and their line, the fall to the outlet, the eaves protection dressed into the gutter, as the trade facts stages name them. No figure for the fall or the bracket spacing: the maker's instructions for the system set those, never one national rule. |
| The materials for the job | From the trade facts materials and methods cell or [CV: materials_methods]: the options a customer is offered, by their trade name (uPVC half round, square or deep flow, aluminium, cast iron; full replacement boards or capping over sound timber; solid or ventilated soffits). A named product only from [CV: materials_methods]. Aluminium is jointed like any other run: never 'seamless' as a claim. |
| Fitting and joining the new run | The central stage from the trade facts: the gutters, joints and stop ends fitted on their brackets, the downpipes with their clips and the shoe or drain connection at the bottom, the boards and vents fixed, the dry ridge or verge units mechanically fixed, named as the trade names it. |
| Checking the water runs away | The test and inspection stages from the trade facts: the run water tested or the flow checked after a clear, the outlets and downpipes seen running, the loft vents left clear, the verge or edge tiles put back where they were lifted. What the customer sees when the job is done. |
| Clearing up and the waste | The last stage from the trade facts: debris collected, old gutter and boards taken off site. Waste taken away only from the waste_removal practice and the carrier registration only if [CV: waste_carrier_registered] is yes; what the customer gets at the end (photos, a written record) only from the confirmed practices and the client values. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|

| The first signs | the job left undone | The things a homeowner notices first, from the trade facts signs row for this service, in their words: water over the edge in rain, a drip at a joint, a plant in the gutter, a downpipe that gives nothing, a board soft under the thumb, a ridge tile that rattles. The one cause this card makes: the job left undone. Then where the water goes if it is left, from the skipped row: the wall below wet after every storm, the board behind the gutter kept damp, the ground at the foot of the wall soaked, specific and never a scare. Framing by page, as business_type_notes gives it: a problem led page (repairs, fascias and soffits, bargeboards, cast iron repairs, dry ridge and dry verge, failed cladding) writes symptom, cause, consequence; a schedule led page (gutter cleaning, downpipes, gutter guards, commercial clearing) writes what slips and when, leaves after autumn, moss through the wet months, silt at the outlet by midwinter, with the reason in the trees and the weather and never in the customer's diary. A desire led page reads the desire variant instead. |
| Water running down behind the gutter | rain coming off the roof edge behind the gutter instead of into it | Problem led: a damp line on the fascia under the tiles, water tracking down the wall behind the gutter rather than over its front, a stain where the gutter meets the wall (the trade facts signs and done badly rows). The one cause this card makes: rain coming off the roof edge behind the gutter instead of into it, because the gutter hangs too low or has pulled away, or the eaves protection that should carry the water into it is missing or torn. Say what the fix usually involves from the stages: the gutter rehung at the right height to the roof edge on refixed brackets, the eaves protection dressed into it, the board behind checked. On a Downpipes page the card is water running down the wall at a joint in the pipe or a clip that has let go. Never a figure for the height or the fall. Not a board gone soft: the category page owns that. |
| Patched more than once and still leaking | the joint or the board treated when the cause was further along the run | Problem led: a joint that has been resealed twice and drips in the next rain, a bracket screwed back into the same soft wood, boards capped a few years ago that are moving again (the trade facts done badly and fact rows). The one cause this card makes: the joint or the board treated when the cause was further along the run or behind it: an outlet packed so the water stands at the joint, a length fitted with no room to move, a bracket missing two along, rot carrying on behind a capping. Say what finding the cause involves from the stages (the leak located, the brackets and the fall checked, the debris cleared, the fitting refitted with its room to move, the run water tested; the old boards off and the timber behind repaired) and that a repair holds only when it is screwed to something sound. Never a dig at whoever did the last one. Not the bracket and the fall on their own: the category page owns those. |
| Water where it lands at the bottom | rainwater let go at the foot of the wall instead of into a drain | Problem led, and the lead card on a Downpipes page: water gushing from the gutter outlet with no pipe under it, a pipe come away from its clips, a shoe pointing at the brickwork, a gully that backs up and floods the path, water lying against the wall after rain (the trade facts signs rows). The one cause this card makes: rainwater collected off the whole roof and then let go against the house instead of into a drain. Say what the fix usually involves from the stages: the pipe reconnected and clipped, a shoe turning the water onto a surface that drains, the gully cleared, the receiving drain checked, a soakaway kept away from the house as the rules give it (never the distance). Where the water goes if left, from the skipped row: the brickwork at the foot of the wall and the ground beside the footings, said plainly and never as a scare. On a clearing page: the downpipe blocked as well as the gutter, so emptying the gutter alone moves the water a few feet. Not the outlet packed with debris: the category page owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|

| Getting up to the roofline | The access factor from the trade facts price row: the storeys, a conservatory or porch under the gutter that nobody stands on, a narrow side passage, a run beside a fragile roof, a gable that needs a tower. A ladder, a tower or a scaffold is chosen by the risk and the time up there, never by a two storey rule (the trade facts fact row). Scaffolding in the quote only from the scaffolding_in_quote practice; a scaffold on the pavement usually needs the council's licence first, never the Act's name. Say why height and tight access cost more time. No figure. |
| How much run there is | The size factor from the trade facts price row: the metres of gutter or board, the corners, the outlets and downpipes, the offsets in a pipe, the box ends on a gable, the roof levels on a clear, the elevations on a cladding job. Say it plainly and give no figure. |
| What's found behind it or inside it | The hidden factor from the trade facts price row: rafter ends or bearers gone soft behind a fascia, fittings nobody makes any more, a verge tile or undercloak that has to be put back, debris packed to silt and a downpipe blocked on a clear, failed mortar to take off before a dry verge goes on. Say the business looks before it prices, from [CV: quote_method] only; extra work priced and agreed before it is done only from the extra_work_agreed_first practice. No figure. |
| The material and the finish | The material and finish options from the trade facts price row, the materials cell and [CV: materials_methods], and why one costs more than another: uPVC against aluminium against cast iron, a matched heritage profile for a period house, a full replacement against capping over sound boards, a ventilated soffit, timber weatherboarding against uPVC cladding. A named product only from [CV: materials_methods]. Expected life only as the trade facts fact rows state it, with the maker named, never as a guarantee. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us What Your Gutters Are Doing; We Look at the Roofline and Price the Job, or We Price Your Job without the site visit practice; We Do the Work on a Date That Suits You).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|

| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The cost cards hold the list: never repeat it or point to it. Never a figure from memory. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing cell only: the pack gives no standard duration for any roofline job, so say what decides it (the length of the run, the number of downpipes, how the roofline is reached, the weather on the day: wind, ice and heavy rain stop work at height). No figure. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]: whether a repair is covered as well as a new run only as the scope says. Insurance backed only where [CV: guarantee_scope] says so; a maker's roofline guarantee only from [CV: manufacturer_warranty], named as the trade facts name it and never stretched into a lifespan. Described, never promised. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible roofline example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if it still leaks after the work? | Open with what the customer does: tell us what it is doing and we look at it. Then the reasonable care and skill standard every trade works to, as the standard the work is held to, never as a defence. A return visit only from the return_visit practice. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Do I need permission for [SERVICE_LOWER]? | From the trade facts rule rows only, as what usually applies, with "usually" or "in most cases": replacing fascias, soffits and gutters like for like on an ordinary house usually needs no planning application; a conservation area or a listed house can change that, most of all where cast iron or timber would give way to another material, and cladding a house in a conservation area usually does need permission; new roof drainage has to go somewhere that can take it, into the ground where it soaks away before a watercourse or a sewer, and a new connection to the public sewer usually means the water company is told first; replacing soffits must not shut off the loft's air; a bird's nest in use or a bat roost in the soffit stops that part of the work until it can go ahead lawfully. Never a standard's number, an Act's name, a distance, a notice period or legal advice. Where the rows give no rule for the service, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words: on a clearing page that means the gutters, the outlets and the downpipes along every run, with the water checked running, as what a proper clear is. What it does not cover only from the services list, with one sibling service page or the category page linked; where the trade facts row makes a full replacement a different scope (a repair page against the installation page), say so and link it. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: follow the water from where it comes in to where it ends up and what it does there, in plain words and never as a scare. Where the symptom is a seasonal sign (a gutter full after leaf fall, moss through a wet winter), say first when it is the season and then what is not. Then what the local trees or housing era add, then what this service does about it. One figure at most, and it must come out of a trade facts row. Never describe how any gutter in the area is today. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **What autumn leaves in the run** (mechanism: what the trees drop lying wet in the run until it is silt): Swapped in for card 4 by the time of year. On a schedule led page (gutter cleaning, downpipes, gutter guards): say first that a gutter filling as the leaves come down is the season, not a fault. The one cause this card makes: what the trees drop in a few weeks lying wet in the run until it is silt at the outlet. The reason in the trees and the weather, from the trade facts timing and fact rows: the clear belongs after the leaves are down and before the winter rain; under trees that shed seed and blossom a second filling comes in spring; a shaded roof sheds moss through the wet months, and moss in the gutter does not on its own mean the roof needs treating. On a problem led page: what a wet winter did to a run that was already standing water, a seal worked loose, a bracket that gave under the weight, from the signs row. A visit pattern only from [CV: visit_frequency_options]; never 'autumn is a busy time'. FAQ: When is the best time of year for [SERVICE_LOWER], and how long does it take? (Timing): From the trade facts timing cell only: the work runs all year when the roofline can be reached safely and the weather allows; a clear sits best after the leaves are down and before the winter rain, with a second look in spring under trees that shed seed and blossom; cast iron is finished and aluminium fitted in the conditions the maker sets, with no figure; soffit work waits where a nest is in use. Then the duration: the pack gives none, so what decides it. No dates, no promise about the weather, nothing about a busy season. This is the one place the timing is written.

### Type A, desire led variant (Aluminium guttering, Fascias and soffits, Cladding; Guttering installation through the roofer library)

The library's `desire_led` column flags these page targets (the pack's section 2: guttering installation as an upgrade, aluminium guttering, a whole roofline replaced to end the repainting; nobody has symptoms of wanting aluminium). A service page so flagged reads this variant in place of block 4 ("Signs You Need [SERVICE]"): every card is the customer's situation, what decides whether the work is right for them (the mechanism), and what the work gives them. What's Included, block 5, the steps, the FAQ slots and the symptom question stay as the type A entry above. Each brief says which pages the situation leads on. Never a sagging gutter or a rotten board as the opener: those are the problem led pages' cards.

**Block 4, is it right for you.** H2: Is [SERVICE] Right for Your Home?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|

| A roofline you keep having to paint | whether the timber behind the paint is still sound | The customer's situation: timber fascias, soffits and gutters that get repainted every few years and flake again a season later, or a gable and a rendered wall the owner would rather board than paint again. What decides it: the timber behind the paint and the rafter ends the boards fix to, which only a look at the boards tells (the trade facts stages: the timber surveyed, the old boards removed or a sound board assessed; the fact row: boards capped over damp or rotten timber hide the rot and feed it, so capping is for sound, dry timber only); for cladding, the wall behind, the moisture and air detail behind the boards and consent where the house is in a conservation area ('usually', never the order's name). What the work gives them: fresh boards on timber that is sound with the soffit vents kept, the gutter rehung on new brackets at the same time, so the roofline is done once; a maker's guarantee only from [CV: manufacturer_warranty], named as the trade facts name it. Leads on the Fascias and soffits, Bargeboards and Cladding pages. Never a rotten board as the opener, never a lifespan, never 'maintenance free'. |
| A roof that never had the right gutters | how much roof drains into the run and where the water can go | The customer's situation: an extension, porch or conservatory roof that was never given a gutter and sheets water off its edge, a house whose runs are a patchwork of three profiles from past repairs, or a roof that was always too much for the gutter under it. What decides it: how much roof drains into each run and where the water can go at the bottom (the trade facts stages: the roof area and the outfalls surveyed, the profile and the outlets chosen, the bracket line set, the run water tested; the fact rows: capacity comes from the profile, the fall and where the outlet sits, not from the size alone; the rule rows: roof water goes into the ground where it soaks away before a watercourse or a sewer, 'usually'). What the work gives them: a run chosen for the roof it serves, outlets where they do most good, downpipes to a drain, the whole thing water tested before it is left. Leads on the Guttering installation, Downpipes and Commercial guttering pages. Never a sagging or dripping gutter as the opener: the problem led pages own those. |
| uPVC, aluminium or cast iron for your house | the house, the roof it drains and how much looking after the owner wants | The customer's situation: they are weighing the materials: a period house whose cast iron they want kept or matched, a modern house where they want a run that will not need painting, a quote for aluminium against one for uPVC. What decides it: the house and its setting (a listed house or a conservation area can mean cast iron is matched like for like, 'usually'), the profile and capacity the roof needs, and how much looking after they want, from the trade facts materials cells and fact rows: aluminium lengths are jointed like any other, so 'seamless' is never the reason; cast iron's finish is looked after on its condition, with no repainting interval; how long any of them lasts only as the maker states it for its own system, named, never as a comparison. What the work gives them: the option that suits their house, never the one that is best in general. A named product only from [CV: materials_methods]. Leads on the Aluminium guttering, Cast iron guttering and Guttering installation pages. |
| What a new roofline still asks of you | what the new run and boards still need through the year | The customer's situation: they want to know what they are taking on once the new boards and gutters are up. What decides it: what the system still needs through the year, from the trade facts stages and fact rows: gutters fill with leaves and moss whatever they are made of, so they still want emptying and the outlets still want looking at, guards or not; uPVC boards want a wash down, cast iron its finish watched; the soffit vents must stay clear of the loft insulation or the roof space goes damp; a gap in the soffit that birds or bats use cannot simply be sealed. What the work gives them: an honest picture, fewer things to do and not none. Never 'maintenance free', never 'never clean your gutters again', never a promise about how it will look or last; a clearing visit offered only where the services list has the page. |

**Seasonal swap** (desire led, card 4 of block 4 and the timing FAQ): **Getting it done before the leaves come down** (mechanism: the weather on the day and whether a nest is in use): The customer's situation: they want the new run or roofline up before the autumn leaves and the winter rain, or they ask when it should be done. What decides it: the weather on the day rather than the season (the trade facts timing cells: the work runs all year when the roofline can be reached safely; wind, ice and heavy rain stop work at height; cast iron is finished and aluminium fitted in the conditions the maker sets, with no figure) and whether a bird's nest is in use in the soffit, which holds that part of the work whatever the month. What the work gives them: a run in place and tested before the gutters carry most water. No dates, nothing about autumn being busy or booking ahead, no promise about the weather. FAQ: When is the best time of year for [SERVICE_LOWER], and how long does it take? (Timing): From the trade facts timing cell only: the work runs all year when the roofline can be reached safely and the weather allows; wind, ice and heavy rain stop it for the day; cast iron is finished and aluminium fitted in the conditions the maker sets, with no figure; soffit work waits where a nest is in use. Then the duration: the pack gives none, so what decides it (the run, the downpipes, the access). No dates, no promise about the weather, nothing about a busy season. This is the one place the timing is written.

## Location page blocks by business type (location_page_blocks)

4 Nov 2026. Used by the location page job (CORE (18)): block 4 (the problems the town's homes have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the niche steps. The briefs are town wide, not per category: the pack's section 3 anchors are tree cover, housing era (as what a street was built with, never what it has now), exposure to wind and driven rain, conservation areas and access; every anchor must change the work, and every mechanism differs from the category and service briefs' on purpose. No seasonal swap and no symptom question on a location page. Placeholders: `[WORK]` the primary category's work noun, `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town.

- A niche with no section here has its location pages refused: "no location block briefs for guttering".

### Type A (project trade: the client's type is A)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|

| Gutters under the town's trees | tree cover filling the gutters each autumn and keeping the roof damp | Tree lined roads, the streets round a park, mature gardens with a tree over the roof, from the town profile. The one cause this card makes: tree cover filling the gutters each autumn and keeping the roof damp, so moss builds on the shaded slope and slides into the run. Say what that does to the work and when: a clear after the leaves are down and before the winter rain, a second look in spring where the trees shed seed and blossom (the trade facts timing and fact rows); moss in the gutter does not on its own mean the roof needs treating. Never 'gutters here are blocked' or any claim about how the town's gutters are today. Not the outlet packed with debris as the fault: the town's category and clearing pages own that. |
| Rooflines built with the houses | the roofline a street was built with reaching the age where its material tells | Cast iron runs and timber boards on the Victorian and Edwardian terraces; uPVC rooflines first fitted widely in the 1990s estates, now of an age; long low runs on the bungalows and flats; written only as an era claim ('built with', 'first fitted', 'the ones not yet replaced') from the town profile. The one cause this card makes: the roofline a street was built with reaching the age where its material tells. Say what that does to the job: cast iron is heavy, its joints and its finish are looked after on their condition and a conservation area can mean it is matched like for like ('usually'); timber boards of that age are stripped and the rafter ends checked, never capped over; on the first uPVC rooflines it is the brackets and the boards that are checked. Never 'rooflines here are rotting', never 'still fitted with the original gutters', never a state claim of any kind. Not a board gone soft, not a bracket that has given: the town's category page owns those. |
| Driven rain on the open side of town | wind driving the rain at the roofline on the exposed side | Hilltops, the coast, the open edge of town, the side that takes the westerlies, from the town profile. The one cause this card makes: wind driving the rain at the roofline on the exposed side, so it is thrown over the front edge of a run that is nearly full, worked in behind a verge or a ridge whose mortar has gone, and pushed at the joints. Say what that does to the work: the bracket spacing follows the maker's instructions for the system and the roof's pitch, with no figure (the trade facts fact row); stop ends, verges and ridges are fixed mechanically rather than relied on mortar alone, never 'mortar is banned'. Nothing about past storms beyond what the dossier itself records. Not a bracket that has given: the town's category page owns that. |
| Nowhere for the water to go at the bottom | what the downpipe empties into on this ground | Terraces with no front garden where the downpipe ends on the pavement or a gully, heavy ground that will not take a soakaway, older streets on one combined drain, from the town profile. The one cause this card makes: what the downpipe empties into on this ground. Say what it means for the work in plain words, from the trade facts rule and fact rows: a downpipe ends in a drain or a gully, or on a surface that drains with a shoe turning the water away from the house; a soakaway is kept away from the house and the road and sized for the ground, never the distance; a new connection to the public sewer usually means the water company is told first. Never promise the ground will change, never a scare about foundations. Not water let go against the wall by a broken pipe: the town's service pages own that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|

| Scaffold or a tower on a terraced street | Where the house fronts the pavement the tower or scaffold stands on the public footway, which usually needs the council's licence before it goes up (never the Act's name), and a three storey townhouse is beyond a ladder from safe ground. Say why that adds time and lead in; the town profile says which streets are terraced and tall. Scaffolding in the quote only from the scaffolding_in_quote practice. No figure. |
| Conservatories and extensions under the gutter | A conservatory or a lean to under the roofline is never stood on (the trade facts rule row on fragile roofs), so the gutter above it is reached from a tower beside it or from the ground, which takes longer than a clear run of wall. From the town profile where it gives the housing (bungalows and semis with conservatories, extended terraces). No figure. |
| Conservation areas and listed houses | Where the town has conservation areas or listed buildings, the material a replacement can use may be set (cast iron matched like for like, timber kept), cladding a house usually needs permission, and there is paperwork before work can start. 'Usually', never the area's or the order's official name. From the dossier rules only; otherwise a check with the council as something that sometimes applies. |
| What the last roofline job left behind | Boards capped over timber that had already gone soft, a gutter profile nobody makes any more so no fitting matches, a downpipe into a drain that backs up, mortar verges patched again and again: what has to come off and go in the skip before the new work goes on, from the trade facts done badly rows. Older streets in the town carry more of it; say so without unkindness and without a dig at another trade. No figure. |

**Steps.** The niche steps (Tell Us What Your Gutters Are Doing; We Look at the Roofline and Price the Job; We Do the Work on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|

| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise what pushes the price up in a town like this (the height of the houses and how the roofline is reached, the length of the runs, what comes off first) and how the quote is given, from [CV: quote_method] only. Never a figure from memory. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]: whether a repair is covered as well as a new run only as the scope says. Insurance backed only where [CV: guarantee_scope] says so. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible roofline example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if the gutter still leaks after the work? | Open with what the customer does: tell us what it is doing and we look at it. Then the reasonable care and skill standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends (where the water comes over or drips, which side of the house, photos from the ground, never from a ladder), what the business looks at (the run, the brackets and the fall, the boards behind, the outlets and where the downpipes end), what comes back (photos of what was found only from the photos_of_faults practice; a written quote only from written_quote). No timescale unless [CV: response_time] is set. | Process |
| timing | always | Do you clear and fit gutters in [TOWN] through the winter? | From the trade facts timing cells: the work runs all year when the roofline can be reached safely; wind, ice and heavy rain stop it for the day, with no figure. A clear sits best after the leaves are down and before the winter rain, for the reason in the trees; where the town profile gives the tree cover or the exposure, say what it does to that window. Soffit work waits where a nest is in use, whatever the month. Never 'autumn is a busy time'. No dates. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

For the client (no client value carries these today, so the briefs say "only from the client values" or "only from the confirmed practices"):

1. Does a clear cover the outlets and downpipes along every run, with the water checked flowing? The pack's craft rule 3 is written as the principle of a good job until a practice confirms it; no practice key exists for it yet.
2. How is the roofline reached (ladders, tower, scaffold, a vacuum from the ground), and is scaffold in the quote? The briefs read scaffolding_in_quote only.
3. Are old boards stripped, and when is capping offered? The briefs say capping is for sound, dry timber that has been looked at; whether this business ever caps is a client answer.
4. Which maker's system goes on, and is its guarantee registered for the customer? The cover briefs read manufacturer_warranty and guarantee_scope; the trade facts give maker specific guarantee terms that are not lifespans.
5. Is there a clearing round or an annual plan? The pack keeps the trade at type A; a client who sells rounds may want type B briefs, which this entry does not carry (Brandon's call).
6. Before and after photos, and waste taken away: the pack's section 7 names both as claims only when confirmed; photos_of_faults and waste_removal are the practices read.
7. Does the business take small jobs (one dripping joint, one blocked downpipe)? The scope brief reads typical_jobs only.

For Brandon on the library:

8. Fascias and soffits is flagged desire led in `guttering.csv` (the pack's "replacing a whole roofline when the customer wants to stop repainting it" lands on that target through the UPVC roofline replacement alias) but problem led in `roofer.csv` and in the pack's own problem led list; Bargeboards stays problem led here. A guttering client's fascias page therefore opens on the repainting situation, not the soft board. Confirm, or clear the flag on the four fascia and soffit alias rows.
9. Cladding is flagged desire led here to match the roofer library, though the pack lists it as problem led "where it has failed"; the desire card 1 carries the boarded gable and the failed cladding reads through the problem led "first signs" card only when the flag is cleared.
10. Dry ridge and dry verge is confirm only in this library (the pack's note: roof work rather than guttering); confirm which guttering clients offer it.

For Ray and the trade facts pack (Table G records most as not found; the briefs give no figure):

11. A duration for any roofline job: the pack gives "varies; no standard" for every service, so the timing FAQs say only what decides it.
12. A universal gutter fall and bracket spacing: the pack gives one maker's figures only, so the briefs say the maker's instructions for the system set them.
13. A cast iron repainting interval and any material lifespan comparison: not verified, so the briefs allow a maker's own figure for its own system, named, and never a comparison.
14. Independent evidence on gutter guards: only manufacturer claims were found, so the guards briefs say they slow debris and still need the outlets reachable and the gutters looked at.
15. What a wet winter does to a run already standing water (ice, weight on brackets): the pack has no row for it, so the service seasonal card on a problem led page points at the signs row and nothing more.
16. The pack's header still says verified: no; the service page gate refuses a run until it is verified on the Trade facts screen.

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| Do gutter guards stop gutters blocking up? | Gutter guards and leaf protection |
| Do I need permission to replace my fascias and gutters? | Fascias and soffits |
| Water where it lands at the bottom | Downpipes |
| A roofline you keep having to paint | Fascias and soffits; Cladding |
| uPVC, aluminium or cast iron for your house | Aluminium guttering; Cast iron guttering |
| Drips at the joints and a dip in the run | Gutter repairs |
| A gutter coming away from the house | Fascias and soffits; Bargeboards |
| Boards you keep having to paint | Fascias and soffits |

## Idea homes

- **the work runs all year and only wind, ice and heavy rain stop it for the day** (service): home is the 'How long does [SERVICE_LOWER] take?' FAQ. Elsewhere: the seasonal block 4 card and the seasonal FAQ talk about the season and do not list again what stops work at height.
- **clear after the leaves are down and before the winter rain, because wet leaves break down to silt that packs the outlet** (category): home is the 'When is the best time of year to have the gutters cleared?' FAQ. Elsewhere: the winter FAQ says only that the weather stops work for the day; the seasonal card names the silt cause but gives no timing advice.

## Related services

The closest other services for each service page, closest first (`related_services`).

| Service | Related |
|---|---|
| bargeboards | Downpipes, Aluminium guttering, Cast iron guttering |
| downpipes | Aluminium guttering, Cast iron guttering, Gutter guards and leaf protection |
| commercial guttering | Aluminium guttering, Downpipes, Gutter guards and leaf protection |
| aluminium guttering | Downpipes, Cast iron guttering, Commercial guttering |
| cast iron guttering | Downpipes, Aluminium guttering, Bargeboards |
| gutter guards and leaf protection | Aluminium guttering, Downpipes, Commercial guttering |
