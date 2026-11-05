# Niche Library Entry: Flooring

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/flooring.json`; this file is the same content for people, kept in the same commit. The model never sees the slot names, only the resolved words.

Business type is **A (project trade)** for every page. The calibration pack's section 2 has one GBP category, Flooring Contractor, mapped to A project; the client's second Fillout tab, Wood Floor Installation Service, is not in the pack's table, is a project category too and takes the default, so `category_types` is empty. The pack's split inside type A (desire led, problem led, requirement led) is carried in the library's `desire_led` column and in the card briefs, not in a type. Not a seasonal trade: the pack says heating moves wood, which is a reason in the material and never a busy time of year, so `seasonal_trade` is off and there is no seasonal swap. No page is flagged emergency. Sources, in order: `calibration-packs/Flooring_Calibration_Pack_v1.md`, `trade-facts/flooring.md`, `niche-library/flooring.csv`, `fillout/services/flooring-fitters-carpet-laminate-lvt.json`.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Flooring / flooring |
| trade_person / trade_person_plural | flooring fitter / flooring fitters |
| homepage_keyword | Flooring (4 Nov 2026, Brandon: the homepage keyword is a way of saying the primary GBP category, picked on search volume; the H1 research pattern and the thin runner read it) |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | no |
| big_ticket | yes (floors through a whole house, herringbone and parquet floors, commercial floors) |
| schema_subtype | HomeAndConstructionBusiness (schema.org has no flooring subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| floor, floorboards, boards, carpet, underlay, laminate, LVT, vinyl, wood floor, herringbone, parquet, skirting, hallway, stairs and landing, the floor underneath | substrate, resilient, textile, floor covering, telegraph, laitance, datum, tackifier, broadloom, DPM, RH, commissioned, specification (words_avoid_exceptions: commissioned is allowed once on the Screeding and floor levelling and Wood flooring pages as the trade's word for running a new underfloor heating system through its first cycle before a floor goes over it, said with what it means; specification is allowed on the Safety flooring and Commercial flooring pages, where the premises' own specification decides the floor and the customer calls it that) | luxurious underfoot, luxury underfoot, stunning finish, wow factor, showroom finish, flawless finish, seamless finish, no gaps, no trims, edge to edge, transform your home, transform your space, transform your room, dream floor, floor of your dreams, timeless elegance, elevate your home (the pack's section 7: showroom language, and the gap promises a floating or wood floor cannot keep) |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about the room and the floor you have in mind and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about the room and the floor you have in mind and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no page is flagged emergency) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About the Room and the Floor**
   Brief: how to get in touch and what is useful to send first (which rooms, roughly how big, what is down now, what they have in mind, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Check the Floor and Price the Job** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the visit and what gets looked at: what is under the floor now and whether it is flat, dry and firm, loose boards, doorways, stairs and thresholds, how the material gets in and whether the rooms are clear. A moisture check is a stage of the job in the trade facts (Table A), written as what good work does, never as this business's promise and never as free. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it).
   Without the practice (`step_2_no_visit`): **We Price Your Floor**
   Brief: a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, measurements, call, video or visit). Only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it).
3. **We Fit on a Date That Suits You**
   Brief: the fitting date is agreed in advance, to suit the customer. Where the material has to sit in the room before fitting, say it arrives ahead of the fitting day only as the product's instructions require (the trade facts acclimatisation row: some products need time in the room, some are not to be opened on site at all), with no number of days. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

No type B in this niche, so there is no type B wording.

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer warranty → insurance (a product's warranty is the maker's and never a lifespan: the trade facts product lifespan row) |
| fears (in order, one per Why choose us point) | 1. a new floor that squeaks, lifts or opens up at the joints within a year; 2. a fitter who lays the new floor straight over whatever is underneath without looking at it; 3. being sold a new floor when the old one only needed fixing down, tightening or sanding back; 4. a price that grows once the old floor comes up |
| fears_by_type | empty: no type B in this niche, so the shared fears apply to every client. The pack's third reader (the landlord, agent or business buying floors that survive tenants, footfall and cleaning) is served by the requirement led lines in the service page briefs, not by a type |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies:** NICF (National Institute of Carpet and Floorlayers), NICF Master Fitter, CFA (Contract Flooring Association), BWFA (British Wood Flooring Association), TrustMark.
- **Tier 2, schemes and cards:** Carpet Foundation (retail members), FITA floor covering NVQ (the assessed qualification, not a course certificate), CSCS Floor Laying Skills Card, CHAS, Alcumus SafeContractor.
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards. Ray's call per client.
- Note: FSC and PEFC chain of custody, the E1 mark and the Carpet Foundation Quality Mark are the supplier's or the product's claims, not the fitter's, so they stay off the strip unless the client holds the certificate itself. NICF membership is not an insurance backed guarantee and no membership here is a licence (Table D and G): the strip shows the logo, the copy claims nothing for it.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if something is damaged during the job. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. A product's warranty is the maker's, separate from the fitting, and is never a lifespan (the trade facts product lifespan row). | no | Trust |
| faq_3_none | What happens if something isn't right after the floor is fitted? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. Nothing about a wait for the material or a screed here: the how long question owns it. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does it take to fit a new floor? | The trade facts give no standard duration for any flooring job (Table A: varies, no standard), so give what decides it, not a number unless [CV: typical_jobs] gives one: how many rooms, what has to come up, how flat and dry the floor underneath is, and the pattern (blocks set out one by one take longer than boards laid in rows). Then the waits that can come before the fitting day, as the rows give them: a new screed dries until a moisture test says it is ready, a heated screed is run through its heating cycle first, a material sits in the room as its own instructions require. No number of days, no reading, never a maker's name. | no | Timing |
| faq_B | Why has my floor started to creak, lift or open up? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words: the floor underneath (boards that have come loose from their joists, a hollow or a ridge, damp rising through a solid floor), the material left no room to move (a floating floor fitted hard against the walls, wood dried out by the heating), and the fitting itself (a carpet never stretched tight onto its gripper, a thin floor laid over bumps that show through). Then what the local housing adds, said as how the houses were built (timber boards over a void in older terraces, a concrete slab in homes built after the war) and never as the state of the reader's floor, then the fix, which starts underneath. | **yes** | Process |
| faq_C (fallback) | Is it better to repair a worn floor or replace it? | Repair before replace, honestly, from the trade facts: a board that squeaks is most often fixed back to its joist; boards worn grey are often sound under the old finish and sand back to bare wood; a carpet in ripples is usually tightened again onto its gripper. Then when a repair will not hold: the floor underneath has failed (damp, a hollow, a loose base) or the material has peaked or cupped and will not sit flat again. Never a verdict on the reader's own floor; never a dig at whoever fitted it. | no | Process |
| faq_D (fallback) | Can I have a wood or LVT floor over underfloor heating? | From the trade facts fact rows only: some wood floor systems and some LVT products are made for heating under the floor and each product's own instructions decide, including the surface temperature limit it sets (named only as a limit the product gives, no figure, never a maker's name); the facts do not rule solid wood out, since a maker permits its specified solid systems. A new heated screed is run through its heating cycle before any floor goes over it and its moisture checked after. Nothing about this business's own products unless [CV: materials_methods] gives them. | no | Fit |
| faq_planning (big ticket, only if [CV: handles_planning] confirmed) | Do I need permission to change the floors in my home? | Point at the trade facts rule rows (Table C) and write what usually applies, with "usually" or "in most cases": ordinary internal flooring work needs no planning permission; a listed home is where consent can be needed before work that affects an original floor; in a flat the lease may set its own conditions on a hard floor, and a lease is checked individually, never assumed. What the customer does about it only as the row gives it. Never an Act's name, never a rule's number, never legal advice. A conservation area on its own sets no internal flooring rule: say so without naming anything. | no | Process |

Sources for faq_A to faq_D: the pack's section 1 and 6 question list (why laminate lifts, why wood gaps in winter, why a carpet ripples, whether underfloor heating works with wood or LVT, how long screed takes to dry) reworded as a homeowner asks them. Replace with real customer questions when Brandon or the client supplies them.

### Type B homepage overrides (faq_slots_by_type.B)

None: no type B in this niche, so no homepage overrides by type.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Carpet: wool / wool mix / polypropylene / stair carpet / carpet tiles
- Underlay and fixings: foam underlay / rubber underlay / felt underlay / acoustic underlay / gripper and door bars
- Laminate and vinyl: click laminate / water resistant laminate / glue down LVT / click LVT / loose lay LVT / sheet vinyl / safety flooring
- Wood: solid wood boards / engineered boards / herringbone blocks / parquet blocks / oiled finish / lacquered finish
- The floor underneath: plywood overlay / levelling compound / sand and cement screed / liquid screed / damp proof membrane / moisture testing
- Other: uplift and disposal of the old floor / furniture moved / doors trimmed / skirting and beading / products made for underfloor heating

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

carpet fitting, stair carpet, carpet tiles, carpet re stretching, carpet repairs, carpet binding, carpet whipping, underlay, gripper, laminate flooring, LVT, luxury vinyl tiles, vinyl flooring, sheet vinyl, safety flooring, rubber flooring, wood flooring, engineered wood flooring, solid wood flooring, parquet, herringbone, floor sanding, floor restoration, floor refinishing, floor repairs, screeding, floor levelling, levelling compound, subfloor preparation, damp proof membrane, moisture testing, floor survey, acoustic flooring, acoustic underlay, floor removal, floor uplift, commercial flooring

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins (so the longer names sit above the shorter ones they contain); with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| furniture assembly, gutter cleaning, remodelling, drywall, fan installation, fan repair, tv mounting, plumbing fixture, water fixture, interior decorating, exterior painting, concrete patio | (never named: not flooring) |
| cherry wood, hickory wood, maple wood, walnut wood | (never named: a species, not a service) |
| baseboard installation | skirting boards |
| carpet installation | carpet fitting |
| ceramic tile flooring | floor tiling |
| commercial floor coating, concrete epoxy floor, epoxy floor coating, garage floor epoxy | resin floors |
| concrete floor polishing, concrete staining | polished concrete floors |
| wood floor refinishing, wood floor restoration | floor sanding and restoration |
| wood floor sanding | floor sanding |
| wood floor repairs | floor repairs |
| wood floor tile installation | parquet flooring |
| wood floor installation | wood flooring |
| floor polishing, floor refinishing | floor sanding and restoration |
| floor repairs and maintenance, flooring repair | floor repairs |
| floor tile installation, floor tile restoration | floor tiling |
| marble floor | stone floor tiling |
| tile work | tiling |
| floor fitting | floor fitting |
| laminate floor installation, laminate flooring | laminate flooring |
| stair flooring, stair carpet | stair carpets |
| oak wood | oak flooring |
| engineered wood | engineered wood flooring |
| general repairs & maintenance | floor repairs |
| wood staining | floor staining |
| coating, restoration | floor sanding and restoration |
| sanding | floor sanding |
| installation | (never named on its own: meaningless) |
| lvt flooring | LVT flooring |
| vinyl sheet | vinyl flooring |
| safety flooring | safety flooring |
| rubber flooring | rubber flooring |
| parquet | parquet flooring |
| herringbone | herringbone flooring |
| carpet fitting | carpet fitting |
| carpet tile | carpet tiles |
| carpet re-stretching | carpet re stretching |
| carpet binding | carpet binding |
| carpet whipping | carpet whipping |
| carpet repairs | carpet repairs |
| carpet uplift | uplift and disposal |
| screeding | screeding |
| floor levelling | floor levelling |
| subfloor preparation | subfloor preparation |
| damp-proof membrane | damp proof membranes |
| underlay installation | new underlay |
| acoustic flooring | acoustic flooring |
| floor removal | floor removal and uplift |
| floor inspection | floor surveys |
| commercial flooring | commercial flooring |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). A card never leads with a specialist service (safety flooring, acoustic flooring) unless it is in jobs_wanted. JSON slot: core_services.

- Flooring Contractor: carpet fitting, laminate and LVT flooring, wood flooring, floor sanding and restoration, floor repairs, screeding and floor levelling
- Wood Floor Installation Service: wood flooring, parquet and herringbone flooring, floor sanding and restoration, floor repairs

Service words for the whole job rather than one service: flooring, floor fitting, new floors, floor installation, commercial flooring. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: floor repairs, floor levelling, moisture testing. When an FAQ question names the job as well as the problem ("Does the floor need levelling before LVT?"), it goes to the job's page (LVT flooring), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches). The briefs here name the practice key a line depends on: `site_visit_before_quote` (step 2), `price_agreed_before_work`, `waste_removal` (the old floor leaving with the fitter), `property_protected`, `tidy_each_day`, `aftercare_advice` (the first days after a sanded floor or a floor over heating). Moving furniture, trimming doors and taking the old floor away are services list or practice items, never assumed (the pack's section 7). A ticked practice counts as confirmed for the validator and the claims reviewer alike.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every flooring client for:
- a "from" price for 3 typical jobs (e.g. a fitted carpet in one room, LVT through a kitchen, a sanded and refinished floor);
- a typical duration for the same 3 jobs, and whether a material is brought in ahead of the fitting day;
- whether quotes are written, whether the price is fixed once agreed, and whether a moisture test is part of every survey;
- whether they take up and dispose of the old floor, move furniture and trim doors, and who does the work on site;
- which products they fit (for [CV: materials_methods]) and whether any are made for underfloor heating.

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Local Experience Behind Every Floor**
2. Cover → **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": flooring contractor → flooring, wood floor installation service → wood flooring. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs (`category_page_blocks`) use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above) and the FAQ slots. No seasonal swap (`seasonal_trade` is off). Placeholders: `[CAT]` the page keyword without the town (Flooring Contractor), `[CAT_LOWER]`, `[WORK]` the work noun, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises.

- `seasonal_trade`: no
- `category_types`: empty (every category takes the client's type, which is A)
- A niche with no section here has its category pages refused: "no category block briefs for flooring".

### Type A (project trade: Flooring Contractor and Wood Floor Installation Service, every page)

The pack's section 2: block 4 is a mix of situations for new floors (a hall that takes all the traffic, a kitchen that needs something wipeable, a room cold or noisy underfoot) and symptoms for failing ones (squeaks and bounce, joints risen or opened, rippled carpet, worn wood, damp under the floor). Card 1 is a situation, cards 2 to 4 are symptoms, and every brief says how it reads on a Flooring Contractor and a Wood Floor Installation Service page. The subfloor runs through all four (the pack's craft rule 1).

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A room where the floor has to work hard | how the room is used, and what is under the floor now | A situation card, not a fault: a hall where wet shoes, the buggy and the dog come in, a kitchen mopped most days, a bedroom cold or loud underfoot, a landing that carries everything the stairs do. What decides it: how the room is used (water, footfall, warmth, sound) and what is under the floor now (timber boards over a void, a concrete slab, a floor shared with the flat below). What the work gives them, in plain words: a floor chosen for the room, named only from the services list (carpet, laminate, LVT, vinyl, wood), with the layer underneath prepared as the trade facts stages name it (smoothed, tested for moisture, boards fixed down). By category: Flooring Contractor reads it across the materials; Wood Floor Installation Service as which wood floor and which fixing suits the room and its heating, from the trade facts materials cell. Never a texture or a look sold, never a fault invented for it. |
| A floor that squeaks or gives underfoot | floorboards no longer fixed to what holds them | Problem led: boards that squeak when walked on, a give or a bounce in one spot, a hard floor that clicks above it. The one cause this card makes: floorboards no longer held tight to the joists under them, so they move under every step (the trade facts signs row for wood flooring and the skipped row: unsecured boards keep moving under traffic). Say that the fix starts underneath, from the stages: loose sections fixed back before anything new goes down (the repair and secure stage of sanding and restoration, the substrate or fixing repair of floor repairs). Honest that a new floor laid over the top muffles the noise for a season, and that a hard floor laid over movement can open at its joints above it. By category: Wood Floor Installation Service reads it in the boards themselves; Flooring Contractor as the check under any new floor. No figure, never a dig at another trade. Not damp from below: card 4 owns that. |
| Joints that have risen or opened up | a floor fitted with nowhere to move | Problem led: laminate pushed up in a ridge where two planks meet, a floating floor lifted where a heavy unit pins it, wood boards with gaps between them. Say first what is normal: narrow, even gaps in a wood floor that come with the heating season and close again when it goes off (the pack's reason in the material: wood swells and shrinks with the moisture in the air through the year). Then what is not: ridges, a floor that has lifted, gaps that widen. The one cause this card makes: a floor that moves with heat and damp fitted with nowhere to move, hard against the walls, the doorways or the pipes (the trade facts done badly rows: laminate buckles without its expansion clearance; wood lifts from a missing movement allowance). Say what the fix involves from the stages: room left at every edge and covered by the skirting or a bead, the width the product's own instructions give (no figure unless the rows are in the prompt, never a maker's name), and the honest line that a joint which has peaked seldom goes back down. By category: Wood Floor Installation Service reads it in boards and blocks; Flooring Contractor in laminate and click floors too. Not moisture from below: card 4 owns that. |
| A floor spoiled from underneath by damp | moisture in the floor underneath with nothing to stop it | Problem led: a previous floor that bubbled, wood boards cupped up at their edges, vinyl or LVT lifting at the edges, a musty smell under a ground floor carpet, a new floor failing within months of a new screed. The one cause this card makes: moisture in a solid floor or a fresh screed with nothing stopping it reaching the floor laid on top (the trade facts fact rows: excess moisture attacks adhesive and lifts floors; a screed dries by its thickness and the room, not the calendar). Say what the fix involves from the stages: a moisture test before anything goes down, a membrane or a moisture control system where the reading asks for one and as the product sets it, a screed that waits for the test and not the date; no reading or figure unless the rows are in the prompt, never a standard's number. Testing is normal good practice, written as what the job does, never as this business's guarantee and never as free. Local detail only as how the houses were built (a concrete slab in homes built after the war), never that the reader's house is damp. By category: Wood Floor Installation Service reads it in cupped and lifted boards; Flooring Contractor across the materials. Not loose boards: card 2 owns those. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How much floor, and how many rooms | Square metres move the price more than anything else, then the number of rooms and doorways, and stairs and landings, which are cut piece by piece (the trade facts price rows: stairs, landings and complicated cuts; many thresholds). Say it plainly and give no figure. |
| What is under the floor now | An old floor to take up, loose boards, a hollow or a ridge to level, damp to test for and deal with, old adhesive on a slab (the trade facts price rows: uplift and disposal, subfloor repair, levelling, moisture treatment). Say the business looks before it prices, from [CV: quote_method] only. Taking the old floor away only where the services list or the confirmed practices have it (waste_removal); moving furniture only where they say so. |
| The pattern and the awkward bits | Blocks set out from the centre of the room against boards laid in rows, borders, a bay window, pipes, door bars and the joins between rooms (the trade facts price rows: pattern set out, borders and cuts, complex thresholds, coved edges and welded seams). Say why each adds time. Never a timescale. |
| The floor you choose | Wood finished on site against boards that arrive finished, a floor glued down against one that clicks together, sheet against tiles, the grade of underlay (the trade facts price rows and materials cells). Name a material only if the trade facts or [CV: materials_methods] give it; a named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (the area and the rooms, what is under the floor now, the material chosen) and how the quote is given, from [CV: quote_method] only. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. The fitting guarantee and a product's own warranty are two things: say which is which, and never a lifespan. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the floor is fitted? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What [WORK_LOWER] work do you take on? | The work itself, named from the card list: the floors fitted (carpet, laminate, LVT, vinyl, wood, whichever the services list has), the repair and preparation work (sanding, repairs, levelling, taking up the old floor) and the size of job taken on, from the services list and [CV: typical_jobs] only. Link one service page. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at (the rooms, what is under the floor), what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | How long does [WORK_LOWER] work take? | From the trade facts timing cells only: no flooring job has a standard duration in the rows, so what decides it (how many rooms, what has to come up, what the floor underneath needs before anything goes down), then the waits that can come before the fitting day as the rows give them: a new screed dried until a moisture test says it is ready, a heated screed run through its heating cycle first, a material sitting in the room as its own instructions require, a sanded floor's finish left to cure before the furniture goes back. No number of days or hours, no reading, never a maker's name, nothing about a busy time of year. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom is a seasonal sign (gaps in a wood floor once the heating is on, a floor that feels cold underfoot in winter), say first when it is normal and then what is not, before anything else. Then the usual cause here in plain words, in the material or in the floor underneath, what the local housing adds (how the houses were built, never the state of the reader's floor), and what the business does about it. One figure at most. | Process |

**Seasonal swap:** none (`seasonal_trade` is off).

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); every flooring row in Table A gives 6 or 7 stages, so the fallback is rarely read. Block 4 (signs you need it) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above) and the FAQ slots (cost, timing, cover, rules, scope). No seasonal swap. The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type A entry serves carpet fitting, screeding and floor sanding alike. The type is the parent category's (`category_types`) else the client's. Placeholders: `[SERVICE]` the page keyword without the town (LVT Flooring, Floor Sanding and Restoration), `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for flooring".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type A (project trade: every page)

Three framings share this one entry, per the pack's section 2: a problem led page (Floor repairs, Carpet repairs and re stretching, Screeding and floor levelling, Floor surveys and moisture testing, Acoustic flooring, Floor removal and uplift) uses block 4 below as written; a requirement led page (Safety flooring, Commercial flooring) reads the "on a requirement led page" line in card 1, what the premises need the floor to do, never a rating or a certificate; a desire led page (the library's `desire_led` column: Carpet fitting, Laminate and LVT flooring, LVT flooring, Vinyl flooring, Wood flooring, Parquet and herringbone flooring, Carpet tiles, Floor sanding and restoration) swaps block 4 for the desire variant at the end of this section.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Checking what is under the floor | The survey stage from the trade facts: what is down now, what has to come up, whether the floor underneath is flat, dry and firm, loose boards, any heating in the floor. A part of the job, not a promise about the quote. |
| Taking up what is there now | The uplift stage, only where the service's stages or the services list have it: the old floor, its gripper, underlay or adhesive. Old vinyl tiles and the black adhesive under them are checked before they are disturbed (the trade facts rule row), said as a check, never an age or a date. What happens to the waste only from the confirmed practices (waste_removal). |
| Getting the floor underneath flat and dry | The preparation stages from the trade facts: smoothing or levelling, the moisture test, a membrane or moisture control where the test asks for it, boards fixed down, a plywood overlay. No reading or figure unless the rows give one, and never a standard's number. |
| The materials for the job | From the trade facts materials and methods cell or [CV: materials_methods]: the options a customer is offered, by their trade name, and whether the material sits in the room first as its own instructions require (no number of days). A named product only from [CV: materials_methods]. |
| Setting out and fitting the floor | The central stages from the trade facts: the set out from the centre or the datum, the cutting, the laying, stretching, gluing or clicking together, the blocks bonded, the sheet welded, named as the trade names it. |
| Edges, doorways and thresholds | The finishing stages from the trade facts: the room left at every edge and covered by skirting or a bead, door bars, coved edges and welded seams where the rows give them, trims. What the customer sees when the job is done. |
| Clearing up and handing the room back | The last stage: dust extracted, offcuts away, doors rehung where they were trimmed, what the customer is told about the first days (a finish curing, a floor over heating warmed up gently) only as the rows give it. Whether the waste leaves with us only from the confirmed practices (waste_removal); otherwise say it is cleared as agreed. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The first signs | the job left undone | The things a homeowner notices first, from the trade facts signs row for this service, in their words: a seam opening, an edge off the gripper, a cracked tile, the same patch failing again, a floor that slopes or dips, footsteps that carry to the flat below, several old floors layered on top of each other. The one cause this card makes: the job left undone. Then what it leads to if left, from the skipped row: specific, never alarming. On a requirement led page (Safety flooring, Commercial flooring: the pack's split for premises) the card is what the premises need the floor to do (grip when it is wet, cleaning, footfall, trolleys, sound) and where the present floor falls short, written as the requirement and never as a rating, a class or a certificate (the pack's section 7). |
| A repair that keeps coming back | the cause under the floor never dealt with, only what showed | Ripples back within weeks of a stretch, the same board loose again, a patch of LVT lifting a second time, a mended seam opening. The one cause this card makes: what is under the floor (damp, a hollow, a loose base, old adhesive, a gripper that has let go) never dealt with, only what showed on top (the trade facts done badly rows: repeated failure when the underlying defect is not repaired; ripples return if the fixing or the cause is left; the fact row: a rippled carpet needs its tension, gripper, seam, underlay and base looked at). Say what the job does first, from the diagnosis stage of the stages, and the honest line that where the floor underneath has failed a repair will not hold. On the Acoustic flooring page the card is noise that came back or got worse after a floor was changed, because the soft layer was bridged or left out (the done badly row), and the honest line that an underlay on its own does not make a whole floor quiet enough for a lease or a rule: no figure, no rating. Never a dig at another trade. Not a material left no room to move: the category page owns that. |
| Ridges, bumps and lines showing through | a thin floor copying whatever is under it | Old tile lines showing through a vinyl floor, bumps under LVT, a hollow felt through a carpet, a crack that has come through a new floor. The one cause this card makes: a thin floor copying whatever is under it, every nail head, old tile edge and hollow (the trade facts skipped rows: an uneven base shows through a thin covering; thin coverings reproduce the base's irregularities). Say what the job does about it from the stages: the base smoothed or levelled first, an old vinyl floor taken up rather than covered (the rule row: new resilient floors are not laid over old sheet or tiles; remove and prepare), old adhesive dealt with by a suitable method. No depth or figure the rows do not give, never a standard's number, never a dig at another trade. Not loose boards: the category page owns those. |
| A floor that went down too soon | a floor laid before the base was ready for it | Bubbles under a new vinyl floor, LVT edges lifting, a new wood floor cupping within months, laminate joints opening in a new build, a powdery or cracked screed under a failed floor. The one cause this card makes: a floor laid before the floor beneath it was dry, warm through and settled (the trade facts done badly rows: a screed covered before it meets the floor system's moisture requirement; the fact rows: a heated screed run through its heating cycle before a floor is laid, a material given the time in the room its instructions require, a screening meter mistaken for a proper test). Say what the job does about it from the stages: the test done with a method that suits the base, the heating cycle, the wait the product sets; no number of days, no reading, never a maker's name. On the Floor surveys and moisture testing page this is the card that explains why the survey exists. Not moisture with nothing to stop it: the category page owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much floor there is | The size factor from the trade facts price row: the area, the number of rooms, stairs and landings, the size of the repair. Say it plainly and give no figure. |
| What has to come up or be put right first | What has to be taken up or dealt with before the job starts, from the trade facts price row: an old floor and its adhesive, loose boards, a hollow to level, damp to treat, more than one layer of old floor, a hidden fault. Say the business looks before it prices, from [CV: quote_method] only. Where old floor tiles or the black adhesive under them are suspected, the check changes the method and the price (the price row: suspected hazardous material), said as a check, never an age or a date. |
| Doorways, stairs and the awkward cuts | Door bars and the joins between rooms, stairs, a bay window, pipes, borders and a pattern set out from the centre, coved edges and welded seams, from the trade facts price row. Furniture to move and rooms that have to stay in use only where the services list or the confirmed practices say the business does it. Say why each adds time. |
| The floor and finish you choose | The material and finish options from the trade facts price row and [CV: materials_methods], and why one costs more than another: wood finished on site against prefinished boards, glued down against clicked together, sheet against tiles, the grade of underlay, a stain or more than one coat on a sanded floor. A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us About the Room and the Floor; We Check the Floor and Price the Job, or We Price Your Floor without the site visit practice; We Fit on a Date That Suits You).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The cost cards hold the list: never repeat it or point to it. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: no flooring job has a standard duration in the rows, so what decides it (the rooms, what comes up, the preparation underneath), then the waits that come before or after the fitting day where the rows give them for this service (a screed dried until the test says so, the heating cycle run first, the material's time in the room as its instructions require, a finish curing before the furniture goes back). A figure only where the row gives one and only as the row gives it (a cited lacquer's times are one product's, never every finish's). Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. The fitting guarantee and the product's own warranty are two things; never a lifespan. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the floor is fitted? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Do I need permission for [SERVICE_LOWER]? | From the trade facts rule rows only, put as the thing that usually applies, with "usually" or "in most cases": ordinary internal flooring work needs no permission; a listed home is where consent can come in before work that affects an original floor; a flat's lease may set its own conditions on a hard floor and is checked individually; where the floor is part of wider building work (a new separating floor in a conversion, a floor structure rebuilt) building control comes in through that work, not through the covering. Never a standard's number, an Act's name or legal advice. Where the rows give no rule, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words: the check underneath, the preparation, the fitting, the edges. What it does not cover only from the services list (taking up the old floor, moving furniture, trimming doors only where the list or the confirmed practices have them), with one sibling service page or the category page linked. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom is a seasonal sign (gaps in a wood floor once the heating is on, a cold floor in winter), say first when it is normal and then what is not, before anything else. Then the usual cause here in plain words, in the material or in the floor underneath, what the local housing adds (how the houses were built, never the state of the reader's floor), and what this service does about it. One figure at most. | Process |

**Seasonal swap:** none (`seasonal_trade` is off).

**Desire led variant** (`service_page_blocks.A.desire`). Nobody has symptoms of wanting a herringbone floor. A page the library flags `desire_led` (flooring.csv: Carpet fitting, Laminate and LVT flooring, LVT flooring, Vinyl flooring, Wood flooring, Parquet and herringbone flooring, Carpet tiles, Floor sanding and restoration, the pages the pack's section 2 lists as desire led) reads this block 4 in place of the one above: the customer's situation, what decides it (the mechanism) and what the work gives them, never a fault invented for it. Everything else on the page (What's Included, block 5, the steps, the FAQ slots, the symptom question) is the type A entry's. No flooring page is flagged emergency, so nothing wins over it. H2: Is [SERVICE] Right for Your Home?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|
| The room, and what it puts a floor through | how the room is used, and what is under the floor now | The customer's situation: a hall where wet shoes, the buggy and the dog come in, a kitchen that gets mopped, a bathroom, a bedroom they want warm and quiet, a child's room, a flat with a neighbour below. What decides it: water and spills, footfall, warmth and sound underfoot, pets, and what is under the floor now (timber boards over a void, a concrete slab, a floor shared with the flat below). What the work gives them: the floor that suits that room, from the trade facts materials cell for this service, with the layer underneath prepared as the stages name it; where a material does not suit the room, say so honestly (a laminate where water stands only where the product is one made for it and its sealing instructions are followed; a soft floor or an acoustic layer where the lease asks for it, the lease checked and never assumed, from the fact rows). Never a texture or a look sold, never a fault invented for it: the room and its use, not the dream. |
| Doing it once, with the floor underneath done first | the layer under the floor, which decides how it wears | The customer's situation: they have had a cheaper quote or thought about laying it themselves, and want to know what the difference buys. What decides it: the layer they will never see once the floor is down (loose boards fixed, a hollow smoothed, damp tested for and stopped, old adhesive dealt with, room left at the edges for the floor to move), which is where a quick job cuts corners and where it shows a season or two later as squeaks, bumps, peaks and gaps. What the work gives them: that layer done as the trade facts stages name it for this service, so the floor stays flat and quiet. One specific from the stages for this service; no reading or figure the rows do not give; never a dig at another trade. |
| Which floor suits your home | the room, the floor underneath and the upkeep deciding the option | The customer's situation: they are weighing two or three ways of doing it (laminate against LVT, engineered against solid wood, clicked together against glued down, wool against a synthetic carpet, sheet vinyl against tiles, herringbone against straight boards, oil against lacquer on a sanded floor, sanding the old boards against a new floor over them). What decides it: water, heating under the floor, footfall, what is under the floor now and how much looking after they want, from the trade facts materials cell and fact rows for this service (a laminate's core and water; LVT showing the base beneath it; some wood systems over heating within their maker's limits, solid wood not ruled out; whether old blocks can be lifted and relaid depends on the floor itself). What the work gives them: the option that suits their home, never the one that is best in general. A named product only from [CV: materials_methods]. No lifespan, no 'waterproof' for the whole floor, no warranty length unless the rows or the client values give it (the fact rows: a product's waterproof claim does not cover the joints or the floor beneath; a warranty is not a lifespan). |
| What it will need from you, before and after | what the floor needs to settle in, and then to keep | The customer's situation: they want to know what they are taking on. What decides it: before the fitting day, the time a material may need in the room as its own instructions require and a new screed's drying until a test says it is ready (no number of days); afterwards, what the floor needs to settle and then to keep, from the trade facts stages and fact rows for this service (a finish left to cure before rugs and furniture go back, as the product's times give it; wood that moves a little with the heating season; an LVT or vinyl floor cleaned as its maker says; a carpet's underlay doing the wearing; a floor over heating warmed up gently within its product's limits). What the work gives them: an honest picture of what it saves them and what it does not. Never a promise about how it will look or last; a recoat or a repair visit offered only where the services list has the page. |

**Desire led seasonal swap:** none (`seasonal_trade` is off).

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (the problems the town's homes have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the type's category page steps (A: the niche steps). The briefs are town wide, not per category: the pack's section 3 says the legitimate local detail for floors is how the houses were built (what is under the floor and how it behaves), flats and their leases, flood risk where the research confirms it, listed buildings; every anchor must change the work, and never judge a home or claim original floors survive in a street. Every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED). No seasonal swap and no symptom question on a location page. The type is the client's (`business_type`), never a category override. Placeholders: `[WORK]` the primary category's work noun (Flooring), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town. The copy rules of CORE (18) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's or rule's name.

- A niche with no section here has its location pages refused: "no location block briefs for flooring".

### Type A (project trade: every client)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Floors built the way the houses were | the floor structure the town's houses were built with | Draughts between the boards, a floor that dips towards one wall, a cold slab under the carpet. The one cause this card makes: the floor structure the town's houses were built with, which the town profile dates. Say what each era means for the work and nothing about its state: older terraces built with timber boards over a void (air bricks kept clear, boards fixed down before a hard floor goes over them); homes from after the war that stand on a concrete slab (a moisture test and a membrane come first); newer estates with chipboard decks upstairs and a screed downstairs (flatness and drying before anything goes down). Said as how the houses were built, never as the state of anyone's floor today, never that original boards or parquet survive in a street (the pack's section 3). Not loose boards or damp as faults: the town's category and service pages own those. |
| Flats, and the floor shared with the neighbour below | a floor that is also someone else's ceiling | Footsteps that carry downstairs, a lease that asks for a soft floor or a layer under a hard one, a hard floor fitted tight to the walls that sends every step through. The one cause this card makes: a floor that is also someone else's ceiling. Where the town profile gives the flats (houses converted into flats, purpose built blocks), say what it means for the work: the lease read before a hard floor is chosen (checked individually, never assumed, from the trade facts fact row), an acoustic layer as part of the whole floor build up and never an underlay claim on its own, the edges kept clear of the walls (the trade facts stages). No figure, no rating, never a rule's name. Not the noise as a symptom: the Acoustic flooring page owns that. |
| Old floors with more than one layer | floors covered over rather than taken up | Vinyl tiles under a carpet, hardboard nailed over boards, a woodblock floor under a later covering, black adhesive left on the slab, in homes of the eras the town profile gives. The one cause this card makes: floors covered over, decade after decade, rather than taken up. What it means for the work: the layers surveyed before anything is priced, old vinyl tiles and the adhesive under them checked before they are disturbed (the trade facts rule row, said as a check, never an age or a date), the base left ready after the uplift (the trade facts stages). Never a judgement on the homes. Not ridges showing through a new floor: the service pages own that. |
| Ground floors on the town's wet ground | ground that holds water under the town's older slabs | A ground floor carpet that never feels dry, a musty smell in a downstairs room, a previous floor that lifted. The one cause this card makes: ground that holds water under floors built before a membrane was usual; the town profile and a symptom say which ground (clay, a river valley, a flood setting the research confirms, a high water table). Say what it means for any floor that goes down on a ground floor slab: a moisture test first, a membrane or moisture control where the reading asks, as the product sets it, written as what good work does and never as this business's promise; never that the town's floors are damp, never promise the ground will change. Not a floor laid too soon, not moisture with nothing to stop it: the town's service and category pages own those. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Getting the floor in on a terraced street | Where rolls of carpet, packs of boards and the old floor coming out have to be carried from the road, with nowhere to park and the stairs in a flat, the job takes longer. Say why that adds time (never 'the only way'); the town profile says which streets are terraced and where the flats are. No figure. |
| What the house was built on | Timber boards over a void, a concrete slab and a new screed each bring different work before a floor goes down: boards fixed, a membrane, levelling, drying. From the town profile's housing eras only, said as the work the era usually brings and never as a judgement on the homes. No figure. |
| Listed homes and original floors | Where the town profile gives listed buildings or a conservation area: a listed home is where consent can be needed before work that affects an original floor, and the checks add time; a conservation area alone sets no internal flooring rule (the trade facts rule rows). 'Usually', never the Act's or the area's official name. Where the profile gives none, the checks that sometimes apply. Keeping and sanding an old floor against covering it only where the services list has the page. No figure. |
| What the last owner left on the floor | Old coverings layered up, adhesive on the slab, hardboard over boards, a carpet glued down: what comes up before anything new goes down and what the check for old vinyl tiles and their adhesive changes about the method (the trade facts rule and price rows). Said as what the work meets and never as a judgement on the homes. How it is taken away only from confirmed practices (waste_removal). No figure. |

**Steps.** The niche steps (Tell Us About the Room and the Floor; We Check the Floor and Price the Job; We Fit on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (access, what the houses were built on, what has to come up) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the floor is fitted? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at (the rooms, what is under the floor), what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | How long does [WORK_LOWER] work take in [TOWN]? | From the trade facts timing cells only: no flooring job has a standard duration in the rows, so what decides it (the rooms, what comes up, what the floor underneath needs first). Where the town profile gives the housing (timber boards over a void on the older streets, a slab on the estates built after the war), say what it does to the preparation. The waits before the fitting day only as the rows give them (a screed dried until the test says so, the material's time in the room as its instructions require). No number of days, nothing about a busy time of year. | Timing |

## Per page overrides (service_overrides)

Brandon, 4 Nov 2026 (copy quality 3): a page whose job differs from the shared type A entry gets its own briefs here, keyed by the page target in lower case. The code lays them over the type entry for that page only (service-blocks.js blocksFor).

### Floor surveys and moisture testing

A survey, not a fitting: block 5 is the area and the rooms, the kind of test, what is written down and the access; the steps end with the reading in writing, not a fitting day.

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much floor and how many rooms | The area, the number of rooms and the number of places tested in each, more where the floor changes from boards to concrete between rooms (the trade facts price row: additional test locations, more than one kind of base). Say it plainly and give no figure. |
| The kind of test | A reading taken off the surface against one taken from inside the slab, a hygrometer left in place until it has settled against a quick meter reading, the test some screeds call for that a meter cannot give (the trade facts materials cell: surface hygrometer, a probe in the slab, electronic screening, the carbide test; the fact row: a method that suits the base and the floor going on it, and a screening reading is not the specified test). Say why one kind takes a second visit (the price row: a return visit for suitable conditions). No percentage, no number of days, never a standard's number. |
| What's written down | A reading given over the phone against a written report with the readings, where they were taken, what the floor is made of and what has to happen before a covering goes down, for a builder, an insurer or the flooring maker's guarantee conditions (the trade facts stages: record readings and locations, specify preparation or further investigation; the fact row: the test method and any heating system need recording). Say what the report is for. A guarantee only as the maker's condition, never this business's. |
| Getting at the floor | Rooms cleared or furniture moved, a covering lifted to reach the base, underfloor heating run through its cycle or switched off before a reading means anything (the trade facts price row: hidden defects, underfloor heating investigation; the fact row on heating before a covering). Furniture moved only where confirmed practices say the business does it. Code adds the price line from [CV: price_list] when there is one. |

Steps:

| Step | Brief |
|---|---|
| Tell Us About the Floor | How to get in touch and what is useful to send first (which rooms, what the floor is made of if they know, concrete, a new screed or boards, what they want to lay on it, what went wrong before, whether there is underfloor heating). No promise of a reply time unless [CV: response_time] is set. |
| We Test on a Day That Suits You | The visit and what happens: the floor looked over for flatness and faults, the test chosen to suit the base and the floor going on it, left to settle as the method requires (the trade facts stages). A second visit when the room is not yet in a state for a reading that means anything (the trade facts timing cell), with no number of days. The price settled as [CV: quote_method] says and no other way. Never restates 'free' (FAQ 5 owns it). |
| You Get the Reading in Writing | What comes back: the readings and where they were taken, what the floor needs before a covering goes down, whether anything needs looking into further (the trade facts stages: record readings and locations, specify preparation or further investigation). The form it takes (a report, an email) only from confirmed practices. Never a pass mark or a figure. Never mention the price or the quote. |

### Floor removal and uplift

Taking up, not laying: block 5 is what is down and how it was fixed, the layers, the check on old tiles and black adhesive, and the waste; the steps end with the base left ready.

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| What's down now and how it was fixed | Carpet on gripper, vinyl or tiles glued down, boards nailed, a floating floor clicked together: each comes up a different way and the glued ones take longest (the trade facts stages: lift the covering and its fixings; the price row: adhesive that will not let go). Say it plainly and give no figure. |
| Layers on top of each other | A floor laid over a floor, sometimes more than once, with old adhesive under each one and the base hidden until the last comes up (the trade facts signs row: several coverings layered, the substrate hidden; the price row: multiple floor layers). Say the business looks before it prices, from [CV: quote_method] only. |
| Old tiles and black adhesive | Where old floor tiles or a black adhesive under them are suspected, they are checked before anything disturbs them, and the result changes the method and who does the work (the trade facts stages: check suspected hazardous materials; the fact row on old vinyl tiles and adhesive; the price row: suspected hazardous material). Said as a check, never an age or a date, never a guess by eye. What the business does from there only from the services list and confirmed practices. |
| The waste and what's left behind | How much comes out and down the stairs, how it has to be separated, a skip or the van, and the base left clean and ready for the next floor or a survey (the trade facts stages: segregate the waste, leave the base ready for assessment; the price row: difficult waste separation, restricted access). The waste taken away only from confirmed practices (waste_removal). Code adds the price line from [CV: price_list] when there is one. |

Steps:

| Step | Brief |
|---|---|
| Tell Us What's Down Now | How to get in touch and what is useful to send first (which rooms, what the floor is, carpet, vinyl, tiles, boards or laminate, whether they know of anything under it, photos if they have them). No promise of a reply time unless [CV: response_time] is set. |
| We Look and Price the Job | The visit and what gets looked at: a corner lifted to see the layers and how each is fixed, anything that needs checking before it is touched, how the waste gets out. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it). |
| We Clear It and Leave the Floor Ready | The date is agreed in advance, to suit the customer. The room closed off while the old floor comes up where the method asks for it, the adhesive dealt with by a method that suits it, the waste out, the base left ready for the next floor or a survey (the trade facts stages). Never a promise about what is found under it. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it). |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

Things a brief wanted that neither the calibration pack nor the trade facts pack gives. Each brief says "from the trade facts rows only" or leaves the point out until one of these is answered.

1. **Desire led pages.** The pack's section 2 lists eight: Carpet fitting, Laminate and LVT flooring, LVT flooring, Vinyl flooring, Wood flooring, Parquet and herringbone flooring, Carpet tiles and Floor sanding and restoration ("where the owner simply wants the boards back"). flooring.csv now flags every row whose target is one of them (16 rows), so the desire variant above is read on those pages; the other eight pages keep the problem led block 4. Floor sanding and restoration is flagged whole: the pack qualifies it, but a flag is per page, so a sanding page that answers a worn floor (a symptom) loses the symptom framing. Brandon to say if that page should stay problem led instead.
2. **Wood Floor Installation Service has no row in the pack.** The pack's section 2 names one category (Flooring Contractor) and its note to Brandon says so, but the client's Fillout form has a second tab, Wood Floor Installation Service, whose library rows alias to Wood flooring, Floor sanding and restoration and Floor repairs. The entry gives it the default type A, a work noun (wood flooring) and core services, and every category brief says how it reads there. If Brandon wants it treated differently (folded into Flooring Contractor, or no category page), that is a library or pack change, not this entry.
3. **No duration for any job.** Table A says "varies; no standard" for all 16 services and Table G confirms it. Every timing brief gives the factors and the waits, and no number. The onboarding questions ask the client for a typical duration for three jobs.
4. **No figures the copy can safely write.** Table E gives moisture readings, acclimatisation days, expansion gap widths, heating surface temperatures, flatness tolerances and finish curing times only as one product's or one maker's instructions, never as a trade wide rule, and Table G lists each as unverified or conflicting. Every brief says "as the product's instructions give it" or "the width the rows give", with no figure and never a maker's name; the pack's own answer to screed drying ("weeks rather than days") is not in the rows either, so the briefs say the test decides, not the calendar. If Ray wants a figure on a page it has to come from the client's own product and [CV: materials_methods].
5. **Who does what around the fitting.** The pack's section 7 bans free surveys, moisture testing, furniture moving, uplift and disposal and guarantees as this client's practice unless confirmed, but practices.json has no flooring keys for them: the briefs lean on `waste_removal`, `site_visit_before_quote`, `price_agreed_before_work` and the services list, and say "only where the services list or the confirmed practices have it" for furniture and doors. A flooring block in practices.json (moisture test on every survey, furniture moved, doors trimmed, old floor taken away) would let the copy say what the client actually does.
6. **Laminate and LVT flooring against LVT flooring.** The pack's note to Brandon says the two pages will need a steer to stay distinct. Both read the same type A briefs and the same desire variant; what separates them is their own Table A, B and F rows (the first row covers laminate's floating click planks and the three LVT systems, the second LVT alone with its smoothing and adhesive). Nothing in this entry keeps the pages apart beyond that; Brandon may want the first page renamed Laminate flooring in the library.
7. **Asbestos in old floors.** Table C and E say old vinyl tiles and bitumen adhesive can contain it and that the task decides the controls, but give no age or date. The uplift, repair and location briefs say "checked before they are disturbed" and nothing more. The pack keeps asbestos to the blog fail list; the briefs here keep it to a check, never an alarm.
8. **Leases in flats.** Table E says a lease may restrict hard floors and must be checked individually, and that the acoustic rule is a performance figure for the whole floor construction, never an underlay. The briefs say "the lease checked, never assumed" and "never an underlay claim on its own", with no figure. A client who fits in blocks often will know the usual lease wording; it goes in client facts, not here.
9. **Safety and commercial flooring.** The pack's requirement led split is written into card 1 of the service block 4 and into the words_avoid exception for "specification". Table C and E say slip, fire and acoustic performance come from the product data and the premises' own assessment, so no brief names a rating, a class or a scheme. A client who does this work should confirm it in jobs_wanted before those pages are made.
10. **The pack's homepage voice.** Section 1 names three readers but gives no fears list as such; the four fears above are drawn from its first reader's paragraph and its section 7 (a floor laid over whatever is underneath, a new floor sold where a repair would do). Brandon to confirm they are the right four.

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| Is it better to repair a worn floor or replace it? | Floor repairs; Floor sanding and restoration; Carpet repairs and re stretching |
| Can I have a wood or LVT floor over underfloor heating? | Wood flooring; LVT flooring; Laminate and LVT flooring; Parquet and herringbone flooring |
| What the last owner left on the floor | Floor removal and uplift |

## Idea homes

- **a new screed left to dry until a moisture test says it is ready** (service): home is the 'how long does [SERVICE_LOWER] take' FAQ. Elsewhere: the 'A floor that went down too soon' card names the cause without the drying wait or the test; the 'What it will need from you' card leaves out the screed wait.
- **damp in a solid floor or new screed tested for before a floor goes down** (category): home is the 'A floor spoiled from underneath by damp' card. Elsewhere: the 'What is under the floor now' cost card names damp only as a price item; the how long FAQ gives the wait only, not the cause.
- **the town's housing eras: timber boards over a void against a slab** (location): home is the 'Floors built the way the houses were' card. Elsewhere: the 'What the house was built on' cost card gives only the work it adds; the cost FAQ names it in a phrase; the how long FAQ gives only the effect on time.
- **old floors layered on top of each other** (location): home is the 'Old floors with more than one layer' card. Elsewhere: the 'What the last owner left on the floor' cost card gives only what it adds to the work; the cost FAQ names it in a phrase.
