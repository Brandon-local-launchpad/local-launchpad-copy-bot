# Niche Library Entry: Kitchen and Bathroom Fitter

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/kitchen-bathroom.json`; this file is the human copy of it, kept in the same commit. The model never sees the slot names, only the resolved words.

Business type is **A (project trade)** for both categories. The Kitchen & Bathroom Fitters Calibration Pack v1, section 2, assigns A to Kitchen Renovator and Bathroom Renovator; Remodeller and Construction Company (the other two tabs in `fillout/services/kitchen-bathroom-fitters.json`) are not in its table and take the client's type, A by default. There is no type B: a fitter whose work is resealing, tray swaps and resurfacing is still A and reads the problem led lines in the briefs. Big ticket is on (full kitchens, full bathrooms, wet rooms), so `[CV: handles_planning]` switches the homepage planning and building control FAQ in. No page is flagged emergency: the pack's notes keep leaks that cannot wait with Plumbing and Heating.

Sources, in the order the README gives: `calibration-packs/Kitchen_Bathroom_Calibration_Pack_v1.md` (sections 1, 2, 4 and 7), `trade-facts/kitchen-bathroom.md` (Tables A to G, unverified at 4 Nov 2026), `niche-library/kitchen-bathroom.csv` (free text intake rows only; the category tab rows live in `builder.csv` and `plumbing-heating.csv`), `fillout/services/kitchen-bathroom-fitters.json` (the four category tabs).

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Kitchen and Bathroom Fitting / kitchen and bathroom fitting |
| trade_person / trade_person_plural | kitchen and bathroom fitter / kitchen and bathroom fitters |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | no (kitchen-bathroom.csv flags no page emergency; no emergency variant, no steps_emergency, final_h2_emergency null) |
| big_ticket | yes (full kitchens, full bathrooms, wet rooms) |
| schema_subtype | HomeAndConstructionBusiness (schema.org has no kitchen or bathroom fitter subtype; do not invent one) |
| seasonal_trade | no (the pack's section 6 says the trade is not seasonal; Table A says year round for every service, with curing conditions as the only timing; Table G finds no season; no seasonal swap anywhere) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| kitchen, bathroom, en suite, cloakroom, downstairs toilet, utility room, units, cupboards, drawers, worktop, sink, hob, tap, bath, shower, shower tray, screen, toilet, basin, tiles, grout, silicone, extractor fan, the ceiling below, leak, layout, plasterboard, the boards under the floor | sanitaryware, substrate, carcass, carcasses, special location, notifiable, remodel, remodelling, bathtub, refinishing, reglazing, cabinetry, vanity, fixtures and fittings, wet area, property, premises, dwelling, the client, bespoke, specification, spec, IP rating, RCD, disabled, elderly, the elderly, mobility issues, infirm (words_avoid_exceptions: remodelling only where a Google Business Profile service name is quoted as the client's; disabled only inside an intake name the client typed, Disabled bathroom adaptations, never as a description of the person; bespoke only inside the intake name Bespoke storage solutions) | dream kitchen, dream bathroom, your dream kitchen, your dream bathroom, kitchen of your dreams, bathroom of your dreams, spa retreat, spa like, spa bathroom, sanctuary, oasis, haven, stunning, luxury, luxurious, heart of the home, transform your kitchen, transform your bathroom, transform your home, transform your space, signs you need a new kitchen, signs you need a new bathroom, fully project managed, all trades in house, one stop shop, hassle free, stress free, bring your vision to life, turn your vision into reality, no job too small (the pack's section 7: showroom language, symptoms invented for desire led services, and the trade management claims that are never confirmed) |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about the room and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about the room and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency page) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About the Room**
   Brief: how to get in touch and what is useful to send first (which room, roughly what they want changed, whether the sink, the toilet or the shower is staying where it is, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Visit and Measure Up** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the visit and what gets looked at in the room (the measurements, where the water, the waste, the soil pipe and the electrics run now, the floor and the walls behind what is coming out, how the units, the bath or a worktop get in). Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it). Nothing about design drawings unless the services list has a design page or [CV: materials_methods] gives drawings.
   Without the practice (`step_2_no_visit`): **We Price Your Job**
   Brief: a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **We Fit on Dates That Suit You**
   Brief: the start date is agreed in advance, to suit the customer, and the room is out of use between the strip out and the hand over, said as a fact of the job and never with a number of days. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it). No supplier lead time unless the client values give one.

There is no type B wording: every category is A.

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer warranty → insurance (a fitting guarantee and a maker's warranty on the units, the bath or the shower are kept apart: the trade facts Table E keeps supply and fit and fit only apart, so the copy says which this business gives only from the client values) |
| fears (in order, one per Why choose us point; the pack's section 1, the renovation customer) | 1. weeks without a working kitchen or bathroom, and no clear picture of when it comes back; 2. trades turning up in the wrong order, so the job stalls between them (a worktop that arrives a fortnight after the units, a tiler waiting on a plumber); 3. what is behind the tiles and under the units being skipped, and showing up as a leak later; 4. a price that grows once the old room is out and the walls are open |
| fears_by_type | none (no type B; the leak customer and the adaptation customer of the pack's section 1 are answered in the block 4 briefs, not in a type keyed slot) |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies:** BIFIS (British Institute of Fitted Interiors Specialists, formerly BiKBBI: an installer registration, never authority for gas or certified electrical work), TrustMark, KBSA (Kitchen Bathroom Bedroom Specialists Association: a retailers' body; its deposit scheme shown only where the client's own contract is registered under it).
- **Tier 2, registers and manufacturer networks:** The Tile Association (TTA); WaterSafe (the plumbing side, only where the client itself is listed); Gas Safe Register (the client's own registration and work categories only, never a subcontractor's); NICEIC or NAPIT (the client's own electrical registration only, for the scope it covers); Worktop Fabricators Federation (a fabricator's body; never shown as a quality mark unless the client holds that separately); Mira Pro Network (a manufacturer's installer network: checkable, never certification).
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards. Ray's call per client. A retailer's installation arrangement attaches to that retailer's own service and is never shown as the client's approval; a trade account with a kitchen supplier is no scheme at all.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if something is damaged during the job (a floor, a ceiling below, a neighbour's flat). | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. Keep the fitting guarantee and a maker's warranty on the units, the bath or the shower apart: the trade facts Table E keeps a supply and fit contract and a fit only one apart, so say which this business gives only from the client values. | no | Trust |
| faq_3_none | What happens if something isn't right after the job? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. A certificate from a registered electrician or building control is a record that the work was signed off, never a guarantee against a later fault. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. Nothing about supplier lead times unless the client values give them. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. Never a free design visit or free drawings unless the client values say so. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does a new kitchen or bathroom take? | No duration: the trade facts Table A says the time varies for every service and Table G confirms no standard range exists. Give the order of work as the reason the time is what it is: the strip out, first fix plumbing and electrics, plastering and its drying, units or the waterproofing and tiling, a worktop templated only once the units are fixed and made away from the house, second fix, then the tests and the sign offs. Then what moves it: adhesive, tanking, grout and any coating that have to cure before the room is used; a sink, a toilet or a shower moved away from the pipes it has now. A number only from the client values. | no | Timing |
| faq_B | Why does water come through the ceiling under the shower? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different routes in plain words: a seal round the tray or the bath that has let go, a waste joint under the floor, grout or a tray that flexes letting water behind the tiles. Say that the water runs along the boards and the joists before it shows, so the damp patch and the leak are seldom in the same place, and that a new bead of silicone over the old one is not the fix where the floor is already wet. Then what the local housing adds (an upstairs bathroom over a kitchen, a flat over a neighbour), then what the fitter looks at. Never a step the customer could try on electrics near the leak. | **yes** | Process |
| faq_C (fallback) | Can the toilet, the sink or the shower move to a different wall? | What decides it, from the trade facts stages and rule rows, in plain words: a waste pipe has to run downhill to the drain, so a basin or a shower moves more easily than a toilet, which usually stays close to the soil pipe; moved further, a toilet usually needs a new soil connection or a pumped unit, and a pumped unit usually depends on there being another toilet in the home that drains by gravity. New or altered drainage can bring building control in. "Usually" throughout; never a document's name; no figure. | no | Process |
| faq_D (fallback) | Who does the gas and electrical work in a new kitchen or bathroom? | The rule of the trade from the trade facts Table C and E rows, never a boast. Gas first: a hob, a cooker or a boiler is connected or moved by an engineer on the Gas Safe Register, registered for that kind of work. Then the electrics: a new circuit, a new fuse board, and wiring in or close to a bath or shower are the jobs that need a sign off. A registered electrician certifies that work themselves; otherwise building control has to be told and inspects it. A like for like swap elsewhere in the house usually needs no notice, though it is still tested. The customer keeps the paperwork. This business's own registrations only from [CV: verified_logos] and the accreditation client values; when none is on file, the rule alone and nothing about who this business uses. Never a step the customer could try. | no | Trust |
| faq_planning (big ticket, only if [CV: handles_planning] confirmed) | Will my new kitchen or bathroom need planning permission or building control? | Point at the trade facts rule rows (Table C) and write what usually applies, with "usually" or "in most cases", keeping the two approvals apart: an ordinary refit inside the house usually needs no planning permission; a listed home usually needs consent even for work inside; a conservation area on its own does not change an internal refit. Building control is a different question and comes in where the job moves or adds drainage, puts a bathroom or a toilet where there was none, alters the structure, or includes electrical work that has to be certified; a registered installer can certify some of that work themselves, otherwise an application is made. Gas work is done by an engineer on the Gas Safe Register. What the customer does about it only as the row gives it; what this business arranges only from [CV: handles_planning]. No figure; never an Act's, a document's or a part's name. | no | Process |

Sources for faq_A to faq_D: the pack's section 1 readers (the renovation customer, the leak customer) and the questions its section 6 lists as this trade's. Replace with real customer questions when Brandon or the client supplies them.

### Type keyed homepage overrides (faq_slots_by_type)

None: every category is type A.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`). No brand is ever named.
- Kitchen units: rigid (preassembled) units / flat pack units / replacement doors on existing units
- Worktops: laminate / timber / solid surface / granite / quartz (engineered stone)
- Bathroom walls and floors: tiles / wall panels / waterproof backer board / tanking membrane / floor tiles / vinyl
- Showers and baths: low profile tray / level access former / wet room floor / fixed screen / enclosure / electric shower / mixer shower / straight bath / shower bath / accessible bath
- Other: supply and fit / fit only / design drawings provided / waste taken away / gas connections by our own engineer on the Gas Safe Register / electrical work certified by our own registered electrician / extractor fan fitted and ducted outside

The two registration ticks are the client's route to saying the gas and the certified electrics are done in house: without the tick the copy states the rule of the trade and claims nothing for this business.

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

kitchen fitting, kitchen design, kitchen worktops, worktop replacement, door replacement, refacing, utility room, bathroom fitting, bathroom design, wet room, walk in shower, shower room, en suite, cloakroom, downstairs toilet, bath replacement, bath resurfacing, shower resurfacing, accessible bathroom, level access shower, media wall, fitted shelving, fitted storage, splashback, tiling, tanking, waterproofing, underfloor heating, extractor fan, plumbing, electrics, plastering

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| outdoor kitchen | (never named) |
| furniture assembly | (never named) |
| tv mounting | (never named) |
| custom kitchen cabinet | kitchen fitting |
| kitchen cabinet installation | kitchen fitting |
| kitchen island | kitchen islands |
| breakfast bar | breakfast bars |
| kitchen supply and fit | kitchen fitting |
| kitchen remodelling | kitchen fitting |
| kitchen fitting | kitchen fitting |
| kitchen cabinet design | kitchen design |
| kitchen design | kitchen design |
| kitchen cabinet door replacement | kitchen door replacement |
| kitchen cabinet refacing | kitchen door replacement and refacing |
| kitchen cabinet refinishing | kitchen door replacement and refacing |
| granite worktop | kitchen worktops |
| kitchen worktop | kitchen worktops |
| quartz worktop | kitchen worktops |
| solid surface worktop | kitchen worktops |
| laminate worktop | kitchen worktops |
| splashback | splashbacks |
| utility room | utility rooms |
| boot room | utility rooms |
| media wall | media walls |
| bespoke storage | fitted storage |
| wine rack | fitted storage |
| bathroom remodelling | bathroom fitting |
| shower room | shower rooms |
| bathroom fitting | bathroom fitting |
| bathroom design | bathroom design |
| wet room | wet rooms |
| walk-in shower | walk in showers |
| walk in shower | walk in showers |
| shower panel | shower panels |
| accessible bathroom | accessible bathrooms |
| disabled bathroom | accessible bathrooms |
| cloakroom | cloakrooms |
| en-suite | en suites |
| en suite | en suites |
| bathtub installation | bath installation |
| bathtub replacement | bath replacement |
| bathtub repair | bath repairs |
| bathtub refinishing | bath resurfacing |
| bathtub reglazing | bath resurfacing |
| bathtub resurfacing | bath resurfacing |
| shower refinishing | shower resurfacing |
| bathroom tile reglazing | bath and shower resurfacing |
| bathroom worktop resurfacing | bath and shower resurfacing |
| underfloor heating | underfloor heating |
| fan installation | extractor fans |
| tile work | tiling |
| plumbing fixture | plumbing |
| drywall | plastering |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). A card never leads with a specialist service (media walls, bath and shower resurfacing) unless it is in jobs_wanted. A service listed under one category goes in that category's card, never another card. JSON slot: core_services. The keys are the Fillout tab names in lower case.

- Kitchen Renovator: kitchen fitting, kitchen design, kitchen worktops, kitchen door replacement and refacing, utility rooms
- Bathroom Renovator: bathroom fitting, wet rooms, walk in showers, cloakrooms and en suites, bath installation and replacement, accessible and mobility bathrooms
- Remodeller: kitchen fitting, bathroom fitting, bath and shower resurfacing
- Construction Company: kitchen fitting, bathroom fitting, utility rooms, media walls

Service words for the whole job rather than one service: kitchen fitting, bathroom fitting, new kitchens, new bathrooms, kitchen renovation, bathroom renovation, kitchen design, bathroom design. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it (a "new bathroom" question goes to Bathroom Renovator, not Bath installation and replacement). JSON slot: general_service_words.

Problem words: leak, leaking, resealing. When an FAQ question names the job as well as the problem ("Does a leaking shower mean a new tray?"), it goes to the job's page (walk in showers), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches). The briefs in this entry name the keys a line depends on: `site_visit_before_quote` (step 2), `price_agreed_before_work`, `waste_removal` (the strip out item), `same_team_throughout`, `stage_updates` and `tidy_each_day` (the desire led card on living without the room). Nothing in practices.json yet covers a temporary sink, a second bathroom kept usable or the washing machine reconnected each night: see "What the sources lacked".

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every kitchen and bathroom client for:
- a "from" price for 3 typical jobs (e.g. a bathroom refit keeping the layout, a kitchen fit only, a walk in shower replacing a bath);
- a typical duration for the same 3 jobs, said as the room out of use;
- whether they supply and fit or fit only, and whether they design (drawings) or fit to the customer's or a retailer's design;
- who does the gas and the certified electrics: their own registered engineer or electrician, or a trade they bring in, and the registration numbers for Ray to verify;
- whether quotes are written, and whether the price is fixed once agreed;
- team size, and who does the work on site.

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Local Experience Behind Every Job**
2. Cover → **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": kitchen renovator → kitchen fitting, bathroom renovator → bathroom fitting, remodeller → renovation work, construction company → building work. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs (`category_page_blocks`) use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above) and the FAQ slots. No seasonal swap: `seasonal_trade` is off. Placeholders: `[CAT]`, `[CAT_LOWER]`, `[WORK]`, `[WORK_LOWER]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises, never an Act's, a document's or a part's name, never a step the customer could try on gas or electrics.

- `seasonal_trade`: no
- `category_types`: empty. Both categories in the pack's section 2 are A, so every category takes the client's type, A by default.
- A niche with no section here has its category pages refused: "no category block briefs for kitchen-bathroom".

### Type A (project trade: Kitchen Renovator and Bathroom Renovator; Remodeller and Construction Company by default)

The pack's section 2 sorts this trade three ways inside type A: desire led services (kitchen design, fitting and worktops, bathroom design and fitting as a new room, cloakrooms and en suites, utility rooms, media walls, fitted shelving, underfloor heating as part of a new room) are written as the customer's situation; problem led ones (leaks and failed seals, a walk in shower replacing a failed tray, a wet room whose tanking has failed, worktops swollen by water) as symptom, cause, consequence, naming the route the water takes; need led ones (accessible and mobility bathrooms) as what the person wants to do, never their diagnosis, age or condition. Block 4 below is a mix: cards 1 and 4 are situations (card 4 carries the need led split), cards 2 and 3 symptoms, and every brief says how it reads on a Kitchen Renovator and a Bathroom Renovator page, so a kitchen page is never briefed on a shower tray.

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A room laid out for someone else | a layout set for a different household | A situation card, not a fault: in a kitchen, nowhere beside the hob to set a pan down, a fridge door that swings across the only way through, a table nobody can get round, one person cooking while the rest stand in the doorway; in a bathroom, a queue at breakfast for the one bathroom in the house, a bath nobody uses on the wall a shower could have, no toilet downstairs. The one cause this card makes: a layout set for a different household. What decides it is the layout, not the size: where the sink, the hob and the fridge sit and the worktop between them; in a bathroom, where the soil pipe and the waste run, which fixes how far the toilet can move (the trade facts design and survey stages). What the work gives them, in plain words: the room planned round how they use it (worktop either side of the hob, a straight run reshaped into an L, a bath swapped for a walk in shower, an en suite or a cloakroom where the drainage allows it). By category: Kitchen Renovator reads it in the kitchen; Bathroom Renovator as the bathroom, the en suite or the cloakroom; Remodeller and Construction Company as whichever room the client's services cover. Never a lifestyle pitch, never a fault invented for it, never a judgement on the room they have now. |
| Water showing up where it should not | a seal or a joint at the surface that has let water through | Problem led, from the trade facts signs rows: in a kitchen, a worktop joint that has lifted or an edge by the sink gone swollen, the cupboard under the sink soft at the base; in a bathroom, silicone gone black and lifting, cracked grout, water on the floor outside the shower, a damp patch on the ceiling of the room below. The one cause this card makes: a seal or a joint at the surface that has let water through, so the board, the floor or the ceiling behind it is wetter than it looks. Say the route the water takes in plain words (along the top of the board and into its cut edge, down behind the tiles, along the floorboards and the joists before it shows) and that the fix starts with finding where it gets in, never with a new bead of silicone run over the old one; what putting it right usually involves from the done badly rows (a sink cut out sealed, a tray bedded solid, a joint remade). What the business does only from confirmed practices. Never alarming, never a promise that the leak is small. Not the tanking behind the tiles: the service pages own that. |
| Things that move when they should not | fixed to something that was never made solid and level | Problem led: doors that rub and gaps that widen, a worktop joint that has opened, a shower tray that gives underfoot, tiles that sound hollow, a basin or a rail that shifts when leant on. The one cause this card makes: whatever it was fixed to was never made solid and level (units not levelled before the worktop went on, a tray on nothing solid, tiles on a wall that flexes, a rail into plasterboard with nothing behind it), so every use works the joint or the fixing loose (the trade facts done badly rows). Say what the fix usually involves in plain words from the stages: units set level and fixed to the wall before a worktop is templated, a tray on a solid and level bed before anything is tiled, timber or board fixed inside the wall before it is tiled wherever anything heavy hangs or is held. By category: Kitchen Renovator reads it in the units and the worktop; Bathroom Renovator in the tray, the tiles, a wall hung basin or toilet and the rails. No figure (no tile weight, no board thickness), never a dig at another trade. |
| A room that has become hard to use | the room asking more of the person than it used to | A situation and the pack's need led split in one: a bath side that has become a climb, a shower with a step up onto the tray, nothing solid to hold, a toilet too low or too far from a wall; in a kitchen, an oven at floor level, cupboards out of reach, a corner nobody can get into. The one cause this card makes: the room asking more of the person than it used to (the step, the reach, the grip, the room to turn). What decides the answer is the room and its drainage, from the trade facts stages: a shower with no step needs the floor formed with a fall to the drain and waterproofed as a wet room floor; a rail needs a fixing into something solid behind the tiles; a toilet raised or moved within reach of the soil pipe; an oven raised, drawers in place of low cupboards, a worktop at a height that suits. What the work gives them is written as what the person will be able to do (shower standing or seated, get in without a step, hold something that takes their weight, reach what they use), never their age, their diagnosis or their condition. A council grant towards adaptations only as something that may be available after the council's own assessment and can be means tested, never promised, no figure. By category: Bathroom Renovator reads it in the bathroom; Kitchen Renovator as reach and working height. Never clinical, never pitying. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| Whether the sink, the toilet or the shower moves | Moving anything away from the water, the waste and the soil pipe it has now means new pipe runs, a new connection or the floor up; a layout that keeps them where they are costs less (the trade facts price rows: moving sanitary fittings, service relocation). Say it plainly and give no figure. |
| What the strip out finds | Walls out of level and floors out of true under the old room, a floor softened by an old leak, plaster that has to be made good before units or tiles go on, and in an older home old materials that have to be checked before they are disturbed (no year). Say the business looks before it prices, from [CV: quote_method] only. No figure. |
| Gas, electrics and the sign offs | A new circuit, electrics in and around a bath or shower, a hob moved: each brings a registered trade and a certificate into the job, from the trade facts price rows and rule rows. Said as what the job needs, never as a service this business supplies unless [CV: verified_logos] or the accreditation client values give the registration. No figure. |
| Units, worktops and tiles | Rigid against flat pack units, laminate against stone that is templated and cut away from the house, the area of tiling and the waterproofing behind it, tiles against panels. Name a material only if the trade facts materials cells or [CV: materials_methods] give it; never a product or a brand. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (whether the services move, what the strip out finds, the materials) and how the quote is given, from [CV: quote_method] only. Supply and fit against fit only from the client values. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. The fitting guarantee kept apart from a maker's warranty on the units or the shower. Described, never promised. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. A certificate for the electrics or from building control is a record of a sign off, never a guarantee. | Trust |
| scope | always | What does your [WORK_LOWER] work include? | The jobs themselves, named from the card list (kitchen design, fitting, worktops, doors; bathroom fitting, en suites, cloakrooms), and the size of job taken on, from the services list and [CV: typical_jobs] only. Supply and fit or fit only from the client values. Design only where the services list has a design page; fitting only where it has a fitting page (the pack's section 7). Link one service page. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at in the room (the measurements, where the water, the waste and the electrics run, the floor and walls behind what comes out), what comes back. Drawings only where the services list has a design page or [CV: materials_methods] gives them. No timescale unless [CV: response_time] is set. | Process |
| timing | always | How long does [WORK_LOWER] take? | No duration: the trade facts give none for any service (Table A, Table G). The order of work as the reason, in plain words: the strip out, first fix plumbing and electrics, plastering and its drying, units or the waterproofing and tiling, a worktop templated once the units are fixed and made away from the house, second fix, the tests and the sign offs. Then what moves it: adhesive, tanking, grout or a coating that have to cure before the room is used, a sink or a toilet moved away from its pipes, a stone top made off site. A number only from the client values. Nothing about when the job can start unless [CV: start_time] is set. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Say where the water or the fault comes from in plain words and the route it takes before it shows (water shows where it drips, not where it gets in), then what the local housing or water adds (hard water on screens and valves, an upstairs bathroom over the kitchen, a flat's shared soil stack, the layout an era built with), then what the business does about it. One figure at most. Never a step the customer could try on gas or electrics; never a bead of silicone as the fix for a wet floor. | Process |

**Seasonal swap:** none (`seasonal_trade` is off).

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (signs you need it) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above) and the FAQ slots (cost, timing, cover, rules, scope). No seasonal swap. The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type A entry serves a wet room, a worktop and a media wall alike. Placeholders: `[SERVICE]`, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number, no document's name or part letter, never a step the customer could try on gas or electrics.

- A niche with no section here has its service pages refused: "no service block briefs for kitchen-bathroom".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED). The category page's water card is the seal or the joint at the surface; the service page's is the waterproofing behind the finish.

### Type A (project trade: every category)

Three framings share this one entry, per the pack's section 2: a problem led page (Wet rooms, Walk in showers, Bath installation and replacement where the old bath leaks, Bath and shower resurfacing, Kitchen door replacement and refacing where it is read as repair) uses block 4 below as written; a need led page (Accessible and mobility bathrooms) reads the "on the Accessible and mobility bathrooms page" line in each brief, what the person wants to be able to do and never a symptom; a desire led page (the library's `desire_led` column in `kitchen-bathroom.csv`, 10 targets: Kitchen fitting, Kitchen design, Kitchen worktops, Bathroom fitting, Bathroom design, Cloakrooms and en suites, Utility rooms, Media walls, Fitted shelving and storage, Underfloor heating; `builder.csv` and `plumbing-heating.csv` carry their own flags for the pages they define) swaps block 4 for the desire variant at the end of this section.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Measuring up and checking the services | The survey and measure stage from the trade facts: the room, where the water, the waste, the soil pipe and the electrics run, the floor and the walls, how the units, the bath or a worktop get in. A part of the job, not a promise about the quote. |
| Isolating the water and stripping out | The isolate and strip out stages from the trade facts: the water off, the old units, bath or tiles out, and in an older home old materials checked before they are disturbed (no year). Name only what the rows give. Whether the waste leaves with us only from confirmed practices (waste_removal). |
| First fix: pipes, wires and the extractor | The first fix water, drainage, electrics and ventilation stages from the trade facts: the pipe runs and the wastes with their fall, the cables, the duct for the extractor. Who does the gas and the certified electrics as the rule of the trade (an engineer on the Gas Safe Register; a registered electrician or building control); this business's own registration only from [CV: verified_logos]. |
| Preparing the walls and floor, and the waterproofing | The prepare and waterproof stages from the trade facts: walls and floor made level and sound, and in a wet area the tanking behind the tiles with its joints and the places pipes pass through, the tray or the former on a solid and level bed with its fall to the drain. No figure, never a standard's number. |
| Fitting the units, the bath or the shower | The central stage from the trade facts: units installed and levelled and fixed to the wall, the bath supported and connected, the shower, the toilet and the basin fitted, named as the trade names it. |
| Worktops, tiling and the finishes | The template or fit worktops stage (a stone top templated once the units are fixed and made away from the house, a laminate top cut and sealed on site) and the tiling, panelling and sealing stages. A named product only from [CV: materials_methods]. |
| Second fix, testing and handing over | The connect, test and hand over stages from the trade facts: appliances connected, the water, the wastes and any overflow tested, the certificates for the electrics and gas handed to the customer, the room cleared. What the customer sees when the job is done. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| What you notice first | the job left undone | The things a homeowner notices first, from the trade facts signs row for this service, in their words: water outside the shower, a tray that moves, silicone lifting, a bath that flexes, a coating peeling, tiles that sound hollow, a toilet that drains slowly, a room that stays steamy. The one cause this card makes: the job left undone. Then what it leads to if left, from the skipped row: water into the floor and the ceiling below, boards softening, mould where the steam never clears, a trap that lets drain smells back in. Specific, never alarming. On the Accessible and mobility bathrooms page (the pack's need led split) there is no sign and no fault: the card is what the person wants to be able to do (step in without climbing over a bath side, shower seated, hold something that takes their weight), never their age, diagnosis or condition. |
| Water that has found a way through | waterproofing behind the finish that was missing or stopped short | A damp patch on the ceiling below, a floor soft beside the shower, a wall damp next to the tray, a smell of damp in the cupboard under the sink. The one cause this card makes: water past the finish at a joint, a corner, a waste or where a pipe passes through, because the waterproofing behind the finish was missing or stopped short (the trade facts done badly rows: a membrane broken at the corners, joints and wastes; tiles with no tanking behind them let water past). Say that it travels along the floorboards and the joists before it shows, so where it shows is not where it gets in, and what the job does about it from the stages: the walls and the floor of a wet area tanked including the joints and the pipe penetrations, the tray or the former bedded solid, the falls to the drain, the waste trapped so it keeps its seal. Never that a new bead of silicone is the fix where the floor is already wet. On an accessible bathroom page the same route read as a shower with no step that leaks because its floor was never built as a wet room floor. Not the silicone or the grout at the surface: the category page owns that. |
| It moves, flexes or sounds hollow | no solid support under or behind it | A tray that gives underfoot, a bath that rocks, tiles that sound hollow, a rail that shifts when held, a worktop joint that has opened, doors that no longer line up. The one cause this card makes: no solid support under or behind it, so every use works the seal or the fixing loose (the trade facts done badly rows: a tray without support moves and breaks its seals; a rail fixed without support pulls away; units out of level give misaligned doors and open joints). Say what the job does about it from the stages: the tray or the bath on a solid and level bed with its supports checked, timber or board fixed in the wall where anything hangs or is held, units levelled and fixed to the wall before the worktop goes on. Never a figure, never a dig at another trade. Not the route of the water: card 2 owns that. |
| Past the point of patching | wear or damp that a surface repair no longer holds | Silicone that goes black again within months of being redone, a coating that peels where it was touched up, grout recut that cracks again, chips in a bath that keep coming back, an extractor that never clears the room. The one cause this card makes: wear or damp that a surface repair no longer holds, because what is behind or under the finish is soft, wet or moving (the trade facts skipped and done badly rows). Say when a patch stops being worth it and what doing the job properly involves, from the stages: resurfacing only where the surface underneath is sound, with the coating left to cure before the bath is used; a new tray or bath where the support has gone; a strip back to the boards where the floor is wet; an extractor ducted outside where the room never dries. Never a cure time as a figure, never a lifespan. Not movement (card 3) or the water's route (card 2). |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much of the room is changing | The size factor from the trade facts price row: more units and appliances, a larger tiled area, more joints and cut outs in a worktop, partitions for a new en suite. Say it plainly and give no figure. |
| Where the pipes and wires run now | Moving the sink, the toilet, the shower or the hob away from the water, the waste, the soil pipe and the circuits it has now, from the trade facts price row: a new waste route, a new soil connection, a new circuit. Say the business looks before it prices, from [CV: quote_method] only. |
| What is under the old room | Floor and wall repairs, a floor softened by an old leak, walls out of level under the units, and in an older home old materials assessed before they are disturbed (no year), from the trade facts price row. Say why it is only known once the old room is out. |
| The finish you choose and who fits it | The material and finish options from the trade facts price row and [CV: materials_methods] (laminate against stone templated and cut away from the house, tiles against panels, rigid against flat pack) and why one costs more than another; and the registered trades a choice brings in (a gas hob, an electric shower on its own circuit). A named product only from [CV: materials_methods]; never a brand. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us About the Room; We Visit and Measure Up, or We Price Your Job without the site visit practice; We Fit on Dates That Suit You).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only, and supply and fit against fit only from the client values. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | No duration: the trade facts timing row says it varies for this service and Table G confirms no standard. The stages for this service in order as the reason, from the trade facts: what is stripped out, first fix, the waterproofing or the units, the finishes, the tests. Then what moves it: tanking, adhesive, grout or a coating that has to cure before the room is used; a worktop templated once the units are in and made off site; a sink or a toilet moved from its pipes. A number only from the client values. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. The fitting guarantee kept apart from a maker's warranty on what was fitted. Described, never promised. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Does [SERVICE_LOWER] need building control or permission? | From the trade facts rule rows for this service only, put as what usually applies, with "usually" or "in most cases", and the approvals kept apart. Planning: work inside the house usually needs none; a listed home usually needs consent even inside. Building control: it comes in where drains are moved or added, where a bathroom or a toilet goes where there was none, where the structure changes, and for electrical work that has to be certified (a new circuit, work in and around a bath or shower), which a registered electrician certifies themselves, otherwise building control is told. Gas by an engineer on the Gas Safe Register. Where the rows give them: an unusually large bath usually has to be notified to the water company before it goes in, and a pumped toilet usually depends on another toilet in the home draining by gravity. What the customer does only as the row gives it; what this business arranges only from [CV: handles_planning]. Never a figure, a document's name or a part letter; never a step the customer could try. Where the rows give no rule, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words: the measuring, the strip out, first fix, the waterproofing or the units, the finishes, the tests. Supply and fit or fit only from the client values. What it does not cover (the gas connection, the certified electrics where this business holds no registration) only from the services list and [CV: verified_logos], with one sibling service page or the category page linked. Never 'on this page' or 'listed above': name the work. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Say where the water or the fault comes from in plain words and the route it takes before it shows, then what the local housing or water adds (hard water on screens and valves, an upstairs bathroom over the kitchen, a flat's shared stack, the layout an era built with), then what this service does about it. One figure at most. Never a step the customer could try on gas or electrics; never a bead of silicone as the fix for a wet floor. | Process |

**Seasonal swap:** none.

**Desire led variant** (`service_page_blocks.A.desire`, 4 Nov 2026). Nobody has symptoms of wanting a new kitchen. A page the library flags `desire_led` reads this block 4 in place of the one above: the customer's situation, what decides it (the mechanism) and what the work gives them, never a fault invented for it. Everything else on the page (What's Included, block 5, the steps, the FAQ slots, the symptom question) is the type A entry's. There is no emergency variant to win over it. H2: Is [SERVICE] Right for Your Home?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|
| The room that gets in the way of the day | a layout that does not fit how the household uses the room | The customer's situation: cooking with nowhere to set a pan down, a fridge door that swings across the only way through, washing dried on the radiators because there is nowhere for a machine, a queue for the one bathroom at breakfast, a guest sent upstairs because there is no toilet down, a television on a stand with its cables across the floor, an alcove no cupboard fits. What decides it: the layout and what the room already has to give (where the water, the waste and the soil pipe run and how far they can move, the length of worktop between the sink and the hob, an alcove or the space under the stairs with the depth for a toilet or a run of shelves, a wall that will carry the weight and the wiring of a media wall), from the trade facts survey and design stages for this service. What the work gives them: the room planned round the way they use it, named from the stages for this service. Never a fault invented for it, never a lifestyle pitch, never a judgement on the room they have. |
| Which way to do it | the room's services and its use deciding the option | The customer's situation: they are weighing two or three ways of doing it (a bath against a walk in shower, tiles against panels, laminate against stone, rigid against flat pack units, new doors against new units, an en suite shower against a cloakroom with a basin, electric against water fed heating under a new floor, a recessed against a surface mounted media wall). What decides it: the room (where the drains fall, what the floor is made of, the water pressure and the hot water system a shower will run on, what the wall is made of where anything heavy hangs), how the household uses it and how much looking after they want, from the trade facts materials and methods cell for this service. What the work gives them: the option that suits their room, never the one that is best in general. A named product only from [CV: materials_methods]; never a brand. No claim about cost, lifespan or value unless the rows or the client values give it. |
| The part you will never see again | the layer behind the finish deciding how long it lasts | The customer's situation: they have a cheaper quote, or a plan to do it themselves, and want to know what the difference buys. What decides it: the layer hidden once the room is finished (units set level and fixed to the wall before the worktop is templated, the tanking behind the tiles and round every joint and pipe, the tray or the former on a solid and level bed with its fall to the drain, wastes with enough fall and a trap that keeps its seal, timber or board in the wall for anything that hangs or is held, the extractor ducted outside, a new circuit certified and a hob connected by an engineer on the Gas Safe Register), which is where a quick job cuts corners and shows a year or two later as a swollen edge, a black bead or a damp patch on the ceiling below (the trade facts done badly rows). What the work gives them: that layer done as the stages name it, with the certificates for the parts that need them. One specific from the stages for this service; no figure, no standard's number; never a dig at another trade. |
| Living without the room while it is done | the order of work deciding how long the room is out of use | The customer's situation: they want to know how long they will be without a kitchen or a bathroom and what happens in which order. What decides it: the order of work from the trade facts stages for this service (the strip out; first fix plumbing and electrics; plastering and its drying; units, or the waterproofing and the tiling; a worktop templated only once the units are fixed and made away from the house; second fix; the tests and the sign offs; the cure of tanking, adhesive, grout or a coating before the room is used). What the work gives them: an honest picture of which stages take the room out of use, which wait on something made elsewhere, and what can be kept running. What this business does about it (a temporary sink, the other bathroom kept usable, the washing machine reconnected each night, the same team start to finish) only from confirmed practices (same_team_throughout, stage_updates, tidy_each_day). Never a duration, a date or a day by day plan: the trade facts give none; never a claim to manage every trade unless the client values give it. |

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (the problems the town's homes have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the niche steps. The briefs are town wide, not per category: the town profile, the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED). No seasonal swap and no symptom question on a location page. The pack's section 3: the anchors are the housing era and the layouts it was built with, the water hardness from the water company's published data, flats (stairs, the shared soil stack, the lease), and listed buildings where the research confirms them; every anchor has to change the work; never the state of anyone's kitchen or bathroom, never what is behind the walls of a street, never an invented water hardness. Placeholders: `[WORK]`, `[WORK_LOWER]`, `[TOWN]`, `[CITY]`.

- A niche with no section here has its location pages refused: "no location block briefs for kitchen-bathroom".

### Type A (project trade: the client's type is A)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Kitchens and bathrooms where the house put them | the houses built with the kitchen and the bathroom where their decade put them | The town profile's housing era and what it was built with: a terrace with the kitchen in a narrow wing at the back, so the units run along one wall; a semi built with the toilet and the bathroom as two small rooms upstairs, often knocked into one; a post war house with a small kitchen and a larder beside it; a new build with stud walls and a compact en suite. The one cause this card makes: the houses built with the kitchen and the bathroom where their decade put them. Say what that means for the work (a long single run, a wall taken down between two small rooms, a soil pipe on the outside wall deciding where the toilet can go), from the profile only; where it gives no era, the general point and nothing about this town's houses. Never the state of anyone's room today, never that the kitchens or bathrooms here are dated. |
| Limescale on everything the water touches | the hardness of the town's water | Screens that fog within weeks, taps crusted at the spout, a shower that loses its flow. Say first that scale in a hard water area is the water, not a fault. The one cause this card makes: the hardness of the town's water, from the profile or the water company's published data only, never invented. What it changes in the work: the shower valve and the screen chosen for it, the sealant round the screen, a softener only where the client's services list has one and never by brand. Where the research gives no hardness, say nothing about the water and read the card instead as the steam of a bathroom with no outside wall or a small window, and the extractor it needs ducted outside. Never a health claim, never a promise the scale will not return. |
| Flats, stairs and the shared stack | a bathroom or a kitchen tied to a soil stack shared with the flats above and below | A toilet that cannot move far, a leak that shows in the flat below, units carried up three flights, nowhere to park a van or sit a skip. The one cause this card makes: the shared soil stack and the shared floors of a flat. What it means for the work: the layout kept close to the stack, the floor treated as the neighbour's ceiling (the waterproofing and the water tests done before the floor is closed), the freeholder or the lease usually having to agree before a bathroom moves ('usually', never an Act's name), deliveries and waste planned round the stairs. From the profile where it gives the flats; otherwise read as the house's own upstairs bathroom and the room beneath it. Never a judgement on the flats. |
| Older homes and what the strip out meets | what an older house was built with, met once the room is out | A listed home where even work inside usually needs consent (the trade facts rule rows), an older house where materials are checked before anything is cut into (no year), walls out of plumb and floors out of level under the old units. The one cause this card makes: what an older house was built with, met once the room is out. Say it as what the work meets and allows for, never as a claim about what is behind the walls of any street (no pipework, no wiring claimed in advance: the pack's section 3): 'often' and 'can', never 'will'. What the business does about it (a survey before suspect material is disturbed, levelling and packing, making good in the quote) only from confirmed practices and the stages. Never a judgement on the houses. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Carrying it up and getting it in | Terraced streets with no parking outside, flats with stairs and no lift, a kitchen at the back reached through the house: units, a bath and a stone worktop carried by hand, deliveries timed to the street. Say why that adds time, from the profile where it gives the housing. No figure. |
| Moving the room away from the stack | In a flat, or an older house with the soil pipe on the back wall, moving the toilet means a new connection or a pumped unit with its own conditions; a layout that keeps it near costs less. 'Usually'; never a document's name. No figure. |
| Listed homes and the lease | Consent before work inside a listed home, a lease that usually has to agree before a bathroom moves: the paperwork adds time and some things are not allowed. From the dossier rules only; never the law's name. No figure. |
| What the old room was built on | Floors out of level, walls that need plastering before units go on, an old leak under the floor, older materials checked before they are disturbed (no year): what has to be put right before anything new goes in. Said as what the work meets, never as a judgement on the homes. No figure. |

**Steps.** The niche steps (Tell Us About the Room; We Visit and Measure Up; We Fit on Dates That Suit You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (getting it in, moving the room from the stack, what the old room was built on) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at in the room (the measurements, where the services run, the floor and the walls, how things get in), what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | How long does [WORK_LOWER] take in [TOWN]? | No duration: the trade facts give none. The order of work as the reason (the strip out, first fix, plastering and its drying, units or the waterproofing and tiling, a worktop templated once the units are in, second fix, the tests and sign offs, the cure before the room is used), and where the town profile gives the housing (flats and their stairs, a terrace reached through the house, a listed home and its consent) what it does to that order. A number only from the client values. Nothing about when the job can start unless [CV: start_time] is set. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

Things a brief wanted that neither the calibration pack nor the trade facts pack gives. Each brief says "from the trade facts rows only" or leaves the point out until one of these is answered.

1. **No duration for any job.** Table A says "varies; no standard" for all fourteen services and Table G confirms no range exists. Every timing brief gives the order of work and what moves it (templating, curing, a moved toilet), and no number. The onboarding questions ask the client for a typical time the room is out of use for three jobs.
2. **The trade facts pack is unverified.** `trade-facts/kitchen-bathroom.md` says "verified: no". The service page gate (`trade-facts/store.js serviceGate`) refuses the service run until it is verified; the briefs point at the rows regardless.
3. **Who does the gas and the certified electrics.** The pack's section 2 and 4 say the fitter never claims to do either unless the client confirms the registration. No onboarding field asks it directly: the entry hangs the claim on `[CV: verified_logos]` and the accreditation client values, and adds two ticks to the materials list ("gas connections by our own engineer on the Gas Safe Register", "electrical work certified by our own registered electrician") so a client can confirm it in house. Without a tick the copy states the rule of the trade and nothing about this business. Ray decides whether those ticks or an accreditation entry are the better route.
4. **The figures the facts pack gives and the NUM rule.** Table C and E give extract rates, the bathroom zones, the socket distance, the fuse ratings, the bath volume that triggers water company notice, the tile weights plasterboard carries, the coating cure days and the grant maximum. `validate-v20.js` NUM blocks any digit not in the client values or the allocated research, and the pack's section 4 wants the rule as what usually applies with nothing named. Every brief here is written without a figure, a document's name or a part letter. If Ray wants a figure on a page it has to come through the verified pack and a decision on NUM.
5. **Supply and fit against fit only.** Table E keeps the two contracts apart (who answers for a faulty item, who removes the waste under a fit only contract) and the pack's section 7 bans implying design for a fit only client. No client value says which this business is. The briefs say "supply and fit or fit only from the client values" and name nothing; the onboarding questions ask it. A `supply_and_fit` tick is in the materials list as a stopgap.
6. **What the business does for the household during the job.** A temporary sink, the other bathroom kept usable, the washing machine reconnected each night: none is in `practices.json`. The desire led card on living without the room points at `same_team_throughout`, `stage_updates` and `tidy_each_day` and names nothing else. If Ray wants these on the page, they need practice keys.
7. **The desire led flags and the pages other libraries define.** `kitchen-bathroom.csv` holds only the free text intake rows; the page rows for Kitchen fitting, Bathroom fitting, Wet rooms, Kitchen worktops, Kitchen design and Fitted shelving and storage live in `builder.csv`, and Underfloor heating in `plumbing-heating.csv`, each with its own `desire_led` flag. This library flags the ten targets the pack's section 2 lists as desire led (Kitchen fitting, Kitchen design, Kitchen worktops, Bathroom fitting, Bathroom design, Cloakrooms and en suites, Utility rooms, Media walls, Fitted shelving and storage, Underfloor heating). It leaves Wet rooms, Walk in showers and Accessible and mobility bathrooms blank, because the pack lists the first two as problem led and the third as need led. `builder.csv` flags Wet rooms desire led, so a client whose wet room page is matched through that library reads the desire variant: Ray decides which library should win for a kitchen and bathroom client.
8. **Accessible and mobility bathrooms has no slot of its own.** The pack's need led split (what the person wants to do, never a symptom) has no schema slot, so the problem led block 4 carries an "on the Accessible and mobility bathrooms page" line in each brief and the category card 4 is written need led. The H2 of that page still reads "Signs You Need Accessible and Mobility Bathrooms", which the pack's section 7 would count as clinical. If Ray prefers, flagging the page `desire_led` in `kitchen-bathroom.csv` gives it the "Is this right for your home" H2 and the situation cards without a code change; the entry was written so either reads.
9. **Bathroom fitting is both.** The pack lists bathroom fitting as desire led "as a new room by choice" and problem led "where the shower or bath leaks". The page is flagged desire led (the builder library agrees); the leak customer is answered by the Bathroom Renovator category page's water and movement cards and by the symptom FAQ, not by the Bathroom fitting service page.
10. **Remodeller and Construction Company.** Neither tab is in the pack's section 2 table. Both take A and the briefs above; their work nouns ("renovation work", "building work") and core services are this entry's guess. If a client arrives on either tab as their primary category, check the briefs read sensibly for them before the first run.
11. **The council grant and VAT relief for adaptations.** Table C and E give the grant's maximum, its means test and the VAT zero rating conditions. The pack's section 7 wants a grant "described as possible and usually means tested", never promised. The need led briefs say exactly that and name neither the grant nor the relief; VAT is not mentioned at all (a figure, dated, and the trader's decision). If an adaptations client wants either on the page it needs a client value.
12. **Asbestos in older rooms.** Table C and E give the year before which a home's materials cannot be assumed clear. The briefs say "an older home" and no year, because a year on a town page reads as a claim about the houses. The client's own practice (whether they commission the survey) decides what the copy says.
13. **Water hardness.** The pack's section 3 makes hard water a strong anchor only from the water company's published data. The location brief says so and gives a fallback (steam and extraction) where the research has no hardness; nothing in the dossier parser is checked here to confirm the research carries it.
14. **The leak customer's fears.** The pack's section 1 gives three readers; `fears` carries the renovation customer's four. The leak customer and the adaptation customer have no type keyed slot since every category is A. Their fears are answered in the block 4 briefs instead. Brandon decides whether a repairs only fitter needs anything more.
