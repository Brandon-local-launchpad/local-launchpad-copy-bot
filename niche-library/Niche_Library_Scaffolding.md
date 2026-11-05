# Niche Library Entry: Scaffolding

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry). Every slot is required; an empty slot stops the run (G-NICHE). Code reads `niche-library/scaffolding.json`; this file is the human copy of it, kept in the same commit.

Business type: **A (project trade)** across the site. One GBP category (Scaffolding Service), split by service group in the pack's section 2 (access led, protection led, schedule led) and carried in the card briefs, not in types. Emergency: per page through the library's emergency column (Emergency scaffolding) when the client confirms call outs. No desire led pages (the pack names none). Not seasonal. Written 4 Nov 2026 from Scaffolding Calibration Pack v1 (sections 1, 2, 4 and 7) and trade-facts/scaffolding.md (Tables A to G).

Two readers, both written into every brief (the pack's section 1): the homeowner who has been told by the roofer to sort the scaffold, and the roofer, builder, renderer or painter who is buying access on a date, at a height, with a loading bay and a handover.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Scaffolding / scaffolding |
| trade_person / trade_person_plural | scaffolder / scaffolders |
| homepage_keyword | Scaffolder (4 Nov 2026, Brandon: the homepage keyword is a way of saying the primary GBP category, picked on search volume; the H1 research pattern and the thin runner read it) |
| customer_type | homeowners and other trades |
| unit_of_work | scaffolds |
| emergency_niche | no (the old marker; nothing reads it. Emergency is per page through the library's emergency column) |
| big_ticket | yes (temporary roofs, commercial scaffolds, heritage scaffolds) |
| schema_subtype | HomeAndConstructionBusiness (schema.org has no scaffolding subtype; do not invent one) |

## Priority services

Placed before other homepage cards when the client offers them: Emergency scaffolding, Domestic scaffolding.

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| scaffold, scaffolding, roof, chimney, gable, the front of the house, the back of the house, pavement, drive, garden, neighbours, roofer, builder, platform, ladder, loading bay, temporary roof, put up, come down, hire | erection, erect, strike, lifts, standards, ledgers, transoms, couplers, duty rating, temporary works, compliance sheet, property, site, structure, solutions, difficult access (words_avoid_exceptions: lifts: allowed where the page speaks to the other trade (commercial scaffolding, scaffold hire, hoists and loading bays, stair towers), where a lift is the trade's own word for a working level; site: allowed on a commercial or event page, where the customer's own word for the place is the site; structure: allowed in 'dangerous structure' on an emergency page, where that is the council's and the customer's own phrase) | safety is our top priority, safety is our priority, your safety is our priority, safety first, fully compliant, compliant scaffolding, access solutions, scaffolding solutions, all your scaffolding needs, around the clock, round the clock, no job too big, no job too small (the pack's section 7: safety slogans, generic access talk, emergency language where call outs are not confirmed) |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| final_h2_emergency | Need Scaffolding in [CITY] Now? Call [CV: phone] |
| cta_band_line | Tell us about the building and the job and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about the building and the job and we'll get back to you. |

## Steps

Standard (type A):
1. **Tell Us About the Building and the Job.** Brief: How to get in touch and what is useful to send first: which trade needs the access and what they are doing (a roof, a chimney, render, windows), which sides of the building and how high, roughly when the trade wants to start, and photos from the street and the garden if they have them. A roofer or builder sends the same in their own words: the elevations, the heights, where the materials will land, the dates. No promise of a reply time unless [CV: response_time] is set.
2. **We Survey and Price the Scaffold.** (only when the `site_visit_before_quote` practice is confirmed) Brief: The visit and what gets looked at: what the feet will stand on (lawn, paving, a drive, a drain cover, soft ground), where the ties can go, how the lorry gets in, and whether any of it will stand on the pavement or on next door's side, which is where the council's licence or the neighbour's agreement usually comes in before the start (Table A). Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it). No erection time, hire period or price unless the client values give it.
   Without the practice (`step_2_no_visit`): **We Price Your Scaffold.** Brief: Say a price is agreed before anything goes up. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it).
3. **We Put It Up for the Date Your Trade Needs It.** Brief: The date agreed around the other trade's start, so the hire is not running while nobody is on it. The scaffold handed over and checked before anyone climbs it, as the job usually goes (Table A). Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it). Nothing about how long the build takes unless the client values give it.

Emergency (`steps_emergency`, only when the emergency layout is on: the page is flagged emergency in the library and the client confirms call outs):
1. **Call Us.** Brief: What to say: what has happened (a chimney or a parapet shifted, a roof opened by a storm or a fire, render falling, a scaffold that has moved), where it is, whether it is over a pavement, a drive, a door or a neighbour's garden, and whether people can still get past it. What to do meanwhile, from the trade facts first stage (make the area safe and keep people out of it): keep everyone from under it, including from the pavement where that can be done, keep the children and the car away from it, tell the neighbours whose side it is over, and nobody up a ladder or onto the roof. The number from [CV: phone]. No promise of a reply or an arrival time unless [CV: response_time] is set.
2. **We Make the Area Safe and Agree What Goes Up.** Brief: The first stages of an emergency job from Table A: the area under the hazard closed off and access kept off it, the hazard and what can carry a scaffold looked at, and a safe interim arrangement chosen (a protective fan, edge protection, a scaffold that holds or takes down what is loose, a temporary roof where the job will run for weeks), with drawings where nothing standard covers it, said as what usually applies. The price for making it safe agreed before any work starts only from the price_agreed_before_work practice and [CV: quote_method]; what the permanent work costs waits until it has been seen. 'Same day' only when [CV: same_day_available] is yes. Never restates 'free'.
3. **We Put Up What Holds It Until the Repair.** Brief: What usually happens: the interim scaffold built under supervision, handed over and checked before anyone uses it, then reviewed and altered or taken down once the permanent work allows (Table A). Wind, ice or a slippery roof can stop a safe build: say so, without a time. The roofer or builder who will work from it told what it is built for (Table E handover). Never promise a same visit build. Never mention the price.

The category and service page emergency variants carry their own three steps (below).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer_warranty → insurance |
| fears (in order, one per Why choose us point) | 1. a scaffold that wrecks the lawn, the drive or the render it stands against; 2. the council or the neighbours stopping the job because nobody asked first; 3. paying for weeks of hire while the roofer hasn't started; 4. a scaffold nobody has checked, with a ladder anyone could climb at night |
| fears_by_type | none: there is no type B in this niche |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. The trade bodies are from the facts pack's Table D: a membership is named at the level the client holds, never as a licence (Table E: there is no statutory scaffolding licence; the operatives' cards are the industry route).

- **Ratings (always first):** Google (needs review_count 5+), Checkatrade, Trustpilot, Which? Trusted Traders.
- **Tier 1, trade bodies:** NASC (National Access and Scaffolding Confederation; audited contractor membership, named as the level the client holds); Scaffolding Association (assessed or audited membership, named as the level the client holds); CISRS (the operatives' cards, only as the client confirms the cards held); TrustMark.
- **Tier 2, prequalification and tower or powered access schemes:** CHAS, SafeContractor, Constructionline (at the level held), PASMA (towers), IPAF (hoists and powered access).
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards: Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if the scaffold damages something while it stands or comes down. Public liability and employer's liability named only as [CV: insurance_cover] gives them; never a minimum the law sets (Table E: the statutory figure is for employer's liability, not public liability). | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. A scaffold is hired, not sold: say what the guarantee covers only as [CV: guarantee_scope] gives it. | no | Trust |
| faq_3_none | What happens if something isn't right with the scaffold? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right (a platform not where the trade needs it, a board that moves, a ladder left open) and we'll look at it; nobody uses it until it has been looked at, which is how the trade works (Table A inspect during use, Table B scaffold hire signs). Then the 'reasonable care and skill' standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or alter it for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. On the highway, the council's permission comes first and fixes the earliest start in most cases: say so with no lead time (Table E: none is national). | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does it take to put scaffolding up? | From the trade facts timing cells only, which give no standard: say what decides it (how many sides of the building, how high, a chimney platform on the roof slope, a loading bay or a temporary roof, whether a design has to be drawn first) and that a scaffold on the pavement waits for the council's licence. A duration only from the client values. Never an erection time as this business's practice. | no | Timing |
| faq_B | Why does this job need a full scaffold rather than ladders? | Use the assigned symptom's meaning and its linked local issue (a terrace stack with nothing beneath it, a three storey front onto the pavement, a conservatory under the eaves, a gable over next door). Three genuinely different reasons in plain words from Table B: nowhere guarded to stand and work for hours at a time, nowhere safe to put the materials, and people or a path below that falling tiles or mortar would reach. Then what the local housing adds, then how the scaffold is usually planned round it (Table A). | **yes** | Process |
| faq_C (fallback) | Do I need to tell my neighbours about the scaffolding? | From Table E (neighbour's land, if a neighbour refuses) and Table C only, as what usually applies: a scaffold kept inside the customer's own garden needs nothing from next door, though a word with them before the build is usual; one that stands on their side or reaches out above it needs their agreement first, best written down with how long it will be there and how their garden is protected; a party wall notice is not that agreement; where they refuse and the repair is necessary there is a slow court route, said as a last resort, never as advice. Never an Act's name. | no | Process |
| faq_D (fallback) | What happens if the roofer is delayed and the scaffold stays up longer? | From Table E (hire period and extensions) only: the hire period and what an extension costs are set in the contract and the quote, so the customer reads them there; no typical period and no weekly figure exist in the facts, so none is written. The way to keep the weeks down is to book the scaffold to the other trade's start and finish rather than early. Terms only from [CV: price_list]; adaptations as this business's practice only from the client values. | no | Price |
| faq_planning (big_ticket AND [CV: handles_planning] confirmed) | Do I need permission to put scaffolding up at my house? | Point at the trade facts rule rows (Table C) and Table E and write what usually applies, with "usually" or "in most cases": a scaffold inside your own garden usually needs no permission while it serves work that is itself allowed; anything standing on or over the highway outside wants the council's permit first, which the scaffolder applies for in most cases, with lighting at night and a way past for people on foot as the usual conditions; one on next door's land needs their agreement; fixings into a listed building can need consent. What the customer does about it only as the row gives it. No fee, no lead time, never an Act's or an order's name. Conservation areas add local controls: say so without naming them. | no | Process |

Sources for faq_A to faq_D: the questions a homeowner asks a scaffolder before booking (the pack's section 6 question posts), answered only from the trade facts rows. Replace with real customer questions when Brandon or the client supplies them. No faq_slots_by_type: there is no type B.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Scaffold type: tube and fitting / system scaffold / mobile access tower
- Access and loading: ladder access / stair tower / loading bay / hoist
- Protection: debris netting / sheeting / shrink wrap / temporary roof / edge protection / protection fan / pedestrian walkway
- Protecting the house: boards under the feet on lawns and paving / padding where tubes meet render or glass / tie holes made good on strike / bottom ladder removed or guarded overnight / scaffold alarm
- Paperwork: pavement licence applied for by us / written handover / inspection record / design drawings where needed

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

scaffold hire, domestic scaffolding, commercial scaffolding, chimney scaffolding, chimney scaffold, temporary roof, temporary roofs, access tower, access towers, mobile tower, edge protection, cantilever scaffold, cantilever scaffolding, truss out, birdcage scaffold, birdcage scaffolding, stair tower, temporary stairs, suspended access, cradle, hoist, loading bay, pavement scaffold, pavement scaffolding, road scaffold, gantry, pedestrian walkway, heritage scaffolding, event scaffolding, scaffold design, scaffold inspection, scaffold inspections, emergency scaffolding, debris netting, sheeting, shrink wrap, protection fan, handover, ties, independent scaffold, tube and fitting, system scaffold

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| personal safety equipment | (never named) |
| scaffolding delivery | (never named) |
| debris netting | debris netting and sheeting |
| scaffolding covering | debris netting and sheeting |
| ground protection | ground protection |
| material hoisting | hoists and loading bays |
| scaffolding installation | scaffolding |
| scaffolding rental | scaffold hire |
| swing stage | suspended access |
| industrial scaffolding | commercial scaffolding |
| bridge scaffolding | commercial scaffolding |
| confined space scaffolding | commercial scaffolding |
| commercial scaffolding | commercial scaffolding |
| roof access scaffolding | domestic scaffolding |
| domestic scaffolding | domestic scaffolding |
| temporary roof | temporary roofs |
| chimney scaffolding | chimney scaffolding |
| mobile scaffold tower | access towers |
| temporary access platform | access towers |
| access tower | access towers |
| cantilever | cantilever scaffolding |
| birdcage | birdcage scaffolding |
| staircase scaffolding | stair towers and temporary stairs |
| edge protection | edge protection |
| scaffold design | scaffold design |
| scaffold inspection | scaffold inspections |
| emergency scaffolding | emergency scaffolding |
| event scaffolding | event scaffolding |
| temporary walkway | pavement and road scaffolding |
| pavement scaffolding | pavement and road scaffolding |
| heritage scaffolding | heritage and listed building scaffolding |
| suspended access | suspended access |
| scaffold | scaffolding |

## General service words (FAQ page matching)

Core services per category (homepage cards), in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). JSON slot: core_services.

- Scaffolding Service: domestic scaffolding, chimney scaffolding, temporary roofs, commercial scaffolding, scaffold hire, debris netting and sheeting

Service words for the whole job rather than one service: scaffolding, scaffold hire, domestic scaffolding, commercial scaffolding, access. An FAQ question about one of these goes to the category page, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: emergency scaffolding. When an FAQ question names the job as well as the problem ("Can you put a temporary roof on after storm damage?"), it goes to the job's page, not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices (niche-library/practices.json, shared by all niches). The briefs here lean on: price_agreed_before_work, site_visit_before_quote, property_protected (boards under the feet, padding at render and glass, tie holes made good), photos_of_faults, scaffolding_in_quote (a roofer's or builder's own entry, not this trade's), weather_delays_rebooked. Who applies for the council's permit, whether alterations are free, whether the ladder comes off at night and whether an alarm goes on are not practices today: the briefs say "only from the client values" and the questions are at the end of this file.

## Onboarding questions this niche needs

The cost, hire and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every scaffolding client for:
- a "from" price for 3 typical scaffolds (a two storey front to the gutter, a chimney scaffold on a terrace, a temporary roof);
- the hire period a quote covers and what an extension costs;
- who applies for the council's permit when the scaffold stands on the pavement, and whether the fee is in the quote;
- whether alterations during the hire are charged;
- what protects the house (boards, padding, tie holes made good) and what secures the ladder at night;
- which trade bodies the business belongs to and at what level, and which cards the scaffolders hold;
- whether the business takes storm and fire call outs (the emergency layout turns on only when it does).

## Section 5 alternative titles (why_titles_alt)

1. Track record → **Built Around the Other Trade's Dates**
2. Cover → **Covered If Something Gets Damaged**

## Business type notes (business_type_notes)

One GBP category (Scaffolding Service) covers the trade, so every page is type A and category_types is empty. The pack's section 2 splits the one category by service group and the split is carried in the card briefs, not in types: access led (the building and the job, how the scaffold answers it) for scaffold hire, domestic, chimney and commercial scaffolding, cantilever and truss out, birdcage, pavement and road, heritage, suspended access, hoists and loading bays, stair towers, access towers and event scaffolding; protection led (what the weather or a fall would do, why, and what prevents it) for temporary roofs, debris netting and sheeting and edge protection; schedule led (what slips and when) for scaffold inspections and scaffold design. Emergency scaffolding is problem led through the library's emergency column: the emergency variant switches on when the client confirms call outs, and every other page gets the plain briefs. The pack calls nothing desire led (it uses access, protection and schedule led instead), so the library's desire_led column is blank and there is no desire variant: the plain type A block 4 is already written as the customer's situation, never a symptom. Nothing is a recurring round, so there is no type B. Year round and weather led, not seasonal: seasonal_trade is off. The reader is as often the roofer, builder or renderer as the homeowner: every brief carries both readings.

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": scaffolding service → scaffolding. A category with no noun reads "[CAT] Services" and is flagged. The briefs use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

4 Nov 2026, written to the landscaper entry's depth from the calibration pack (sections 1, 2, 4, 7) and the trade facts pack (Tables A to G). Used by the category page job (CORE (16)): block 4 and block 5 are an H2 and four card titles with a one line brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots. Type A uses the niche steps above. No seasonal swap (year round, weather led). Placeholders: `[CAT]`, `[CAT_LOWER]`, `[WORK]`, `[WORK_LOWER]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises. Every figure or rule a brief wants is pointed at the trade facts rows (the inspection interval, the pavement permit, the design position), never written here.

- `seasonal_trade`: no
- `category_types`: none (one category, type A)
- The emergency variant (below) replaces block 4, the steps and the FAQ slots when the page is flagged emergency in the library and the client confirms call outs.

### Type A (project trade: Scaffolding Service, every planned page)

The pack's section 2 split inside type A: access led pages (scaffold hire, domestic, chimney and commercial scaffolding, cantilever and truss out, birdcage, pavement and road, heritage, suspended access, hoists and loading bays, stair towers, access towers, event scaffolding) are written as the building and the job and how the scaffold answers it; protection led pages (temporary roofs, debris netting and sheeting, edge protection) as what the weather or a fall would do, why, and what prevents it; schedule led pages (scaffold inspections, scaffold design) as what slips and when. Nobody has symptoms of needing scaffolding: block 4 below is the customer's situation in every card, with cards 1, 2 and 4 access led and card 3 protection led, and every brief carries the homeowner's reading and the trade's.

**Block 4, the problems every job is planned around.** H2: The [WORK] Problems Every Job Is Planned Around

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Nowhere on the ground to build from | nothing under the work that can take a scaffold's feet | Access led, a situation and not a fault: the chimney sits on the ridge of a terrace with nothing under it but next door's roof, the gable is over a neighbour's extension, the back wall rises straight out of a conservatory or a lean to, the rear faces an alley a lorry cannot use. What decides it: what is directly below the work and whether it can take a scaffold's feet. What the work gives them, from Table A as what usually applies: a platform built off the slope of the roof, climbed to from an ordinary scaffold on the front or the back elevation (chimney scaffolding); a section that projects out from the building over the glass or the neighbour's side (cantilever and truss out); a bridged bay over what is in the way. Two readings in one card: the homeowner hears what will stand where and what it will touch; the roofer hears which arrangement it is and that a projecting or roof borne one is usually a drawn design rather than a standard arrangement (Table E), never the guidance's name. Never 'difficult access', never a symptom invented for it. |
| The pavement, the road or next door in the way | feet or a platform on land that isn't the customer's | Obligation led, written as normal steps and never as obstacles: the front door opens onto the pavement, the only way to the back is a shared side path, the gable is on the boundary, the flank wall is over next door's garden, the street is parked up. What decides it: whose land the feet stand on and what hangs out over it. What applies in most cases, from Table C and Table E: anything on or over the highway wants the council's permit first, which the scaffolder applies for as a rule, with lighting at night and a clear way past for people on foot as the normal conditions, and a parked bay suspended separately; on next door's land their agreement first, written down, and a party wall notice is not that agreement; the permit does not close a road. The homeowner reading: who asks whom, and that the licence date is usually the earliest the scaffold can go up. The trade reading: programme around the licence, not the other way. No fee, no lead time (Table G: none is national), never an Act's or a section's name. |
| A roof stripped with the weather coming | nothing between the weather and the timbers once the covering is off | Protection led: write what the weather or a fall would do, why, and what prevents it. The situation: a re roof or a loft conversion that leaves the roof open for weeks, a long repointing job on a face above a path or a parked car, a flat roof with an open edge. The one cause this card makes: once the covering is off, nothing stands between the rain and the timbers and ceilings but what is put over them, and on an open face old mortar and offcuts fall on whoever is below (Table B temporary roofs, debris netting). What prevents it, from Table A: a temporary roof designed for its span and the wind with its covering kept up while the job runs; netting or sheeting on the face, told to the scaffolder before it goes on because a covered face catches the wind, which means more ties in most cases (Table E sheeting and wind); guard rails and toe boards at the edge. The homeowner reading: the rooms, the car and the path underneath. The trade reading: a sheeted or roofed scaffold is usually a designed one, so say so when the job is specified. Never a promise about the weather, never the guidance's name. |
| Every tile carried up a ladder | no place on the scaffold made for materials to land | What slows a job down, from Table B hoists and loading bays and stair towers: materials carried up ladders by hand, nowhere to land a pallet of tiles, loads left on an ordinary working platform, several trades on one ladder all day. The one cause this card makes: the scaffold has no place made for materials to land and sit. What the work gives them, from Table A: a loading bay with a gate at the level the materials are used, a hoist where the loads warrant one, a stair tower where people are up and down all day. The trade reading: the loads and the trades told to the scaffolder when the job is specified, because a platform put up for one trade's work is not automatically up to another's loads (Table E handover). The homeowner reading: tiles and bags off the lawn and the drive, fewer trips past the windows. Never a load figure (the figures stay in the facts pack), never a safety lecture. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How many sides, and how high | The size factor from Table F: more elevations, a third storey, more working levels, a chimney platform up on the slope, a longer face to cover. Say it plainly and give no figure. |
| What it stands on and ties to | From Table F and Table E (bases and ground): soft ground, a drive or block paving that needs boards, a drain cover, a basement light well, a conservatory under the eaves, render or old stone that cannot take ties so another fixing or a freestanding section is used. Say the business looks before it prices, from [CV: quote_method] only. No board size or footing figure (Table G). |
| The pavement licence and the neighbours | From Table F pavement and road scaffolding: a scaffold on the highway brings the council's conditions (lighting, a way past for people on foot, signs), a parking bay suspended separately and sometimes a protective gantry; next door's land adds the time to agree it. Said as what usually applies; no fee and no lead time (Table G: none is national), never an Act's name. |
| The extras and the weeks of hire | Each addition from Table F (netting, sheeting, a temporary roof, a loading bay, a stair tower, a hoist, an alarm, drawings for anything outside a standard arrangement), and the hire: the quote covers a set period and what happens after it is in the contract (Table E hire period), so a scaffold timed to the roofer's start and finish costs less than one standing idle. Hire terms only from [CV: price_list]; adaptations as this business's practice only from the client values. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the things that move the price for this kind of work (how many sides and how high, what it stands on, the extras and the hire period) and how the quote is given, from [CV: quote_method] only. No hire period or weekly figure unless price_list gives one. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for (the scaffold standing against the house and over the pavement, the people putting it up), named only as the client value gives them. Never what it pays or who it covers; never a legal minimum (Table E). | Trust |
| cover | always | What happens if the scaffold damages something? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. What protects the house while it stands (boards under the feet, padding at render and glass, tie holes made good) said as this business's practice only from the property_protected practice or [CV: materials_methods]. No promise to put it right free; never invent a guarantee or an insurance outcome (Table G: none is automatic). | Trust |
| scope | always | What [WORK_LOWER] work do you take on? | The jobs themselves, named from the card list, in both readings: house scaffolds for roofs, chimneys, render and windows; temporary roofs and netting; commercial, hire and the rest as the services list has them; the size of job taken on from the services list and [CV: typical_jobs] only. Link one service page. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. | Fit |
| process | always | What happens between asking for a quote and the scaffold going up? | From [CV: quote_method] and the confirmed practices for the quote itself: what the customer sends, what the business looks at, what comes back. Then what usually happens next, from Table A as the job goes and never as this business's promise: the licence or the neighbour's agreement where one is needed, delivery and the build, handover and a check before anyone climbs it, further checks while it is up, once a storm has passed and whenever it is changed (Table E, no interval written), then it comes down. No timescale unless [CV: response_time] is set. | Process |
| timing | always | How long does [WORK_LOWER] take to put up, and how long can it stay? | From the trade facts timing cells only, which give no standard for either: what decides the build (the sides, the height, a chimney platform, a temporary roof, a design drawn first, the licence where it stands on the pavement) and that the hire period is whatever the quote and the contract set (Table E). Weather: wind, ice and a slippery roof stop a safe build, said without a season (Table A). A duration or a period only from the client values. Never an erection time or a hire period as this business's practice. | Timing |
| symptom | a symptom tagged with the page | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: a terrace stack with nothing below it, a three storey front onto the pavement, a conservatory under the eaves, a hilltop or a seafront where a sheeted scaffold catches the wind. Then what the local housing or street adds, in plain words and never as a judgement on the buildings, and how the scaffold is usually planned round it (Table A). What the business itself does only from confirmed practices. One figure at most. | Process |

### Type A, emergency variant (Emergency scaffolding, when the client confirms call outs)

Block 5 cost set (`cost`), H2 "What Moves the Price of an Emergency Call Out in [CITY]": what moves the price of a call out, never an arrival time, hours of cover or a call out charge unless `response_time`, `out_of_hours_available` or a call out fee is in the client values.

| Card | Brief |
|---|---|
| When you call | The time of day and the day of the week move the price: a Sunday evening against a weekday morning, a crew called back out against one already on its way to a job. A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; never say there is no charge for coming out unless [CV: quote_call_out_fee] says there is none. Whether the business comes out at those hours only from [CV: out_of_hours_available]; when it is not set, nothing about hours at all. Say it plainly and give no figure. |
| Getting there and getting it up | How far the job is from the yard and what is in the way once the lorry arrives: a scaffold that has to stand on a pavement with people kept past it, a parking bay to clear, a chimney over a neighbour's roof, a narrow lane with nowhere for the lorry to stand (Table F emergency scaffolding: restricted safe access, the public or the highway to keep clear). Distance and access move the price; say why in plain words. Never an arrival time unless [CV: response_time] is set; never hours of cover unless [CV: out_of_hours_available] says so. |
| Closing it off and holding it | What is done first on a call out, from Table A emergency scaffolding: the area under the hazard closed off and people kept out of it, the loose masonry or the open roof edge and what can carry a scaffold looked at, then an interim arrangement chosen: a protective fan, a holding scaffold, a platform to take the loose piece down from. How much of that is needed, and whether anything standard covers it or it needs an urgent design (Table F: urgent bespoke design; Table E: a temporary roof is among the structures that normally need a design), is what the first part of the price pays for. Never how it is done beyond this. |
| What's on the lorry and what has to follow | A first load of tube, boards and fittings comes with the crew; a bigger scaffold than that load, sheeting, a temporary roof or a stair tower means more brought from the yard, and a drawing where nothing standard covers it (Table A emergency scaffolding: a bespoke design where no standard configuration covers it). The hire runs under the contract from the day it goes up (Table E hire period), and the permanent scaffold for the repair, the alterations as the repair goes on and the licence where it stands on the pavement are priced as their own job (Table A: reviewed and altered or removed when the permanent work permits). Say what decides it and give no figure. Code adds the price line from [CV: price_list] when there is one. |


Replaces block 4, the steps and the FAQ slots; block 5 and the symptom question stay as above. The reader has something loose above a path, a roof open to the rain or a scaffold that has moved: the situation, why it can't wait, what the customer does first from the trade facts first stage (make the area safe and keep people out of it), and what happens when they call. Never a response time, round the clock cover or a call out promise unless the client values confirm it; never an instruction to go up anything.

**Block 4, when this can't wait.** H2: When the Scaffold Can't Wait

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Masonry loose over a path or a door | brick or stone with only its own weight holding it above the people below | The situation from Table B emergency scaffolding: a chimney cracked by a gale, a parapet or a coping that has shifted, render coming off a gable above the front door, bricks loose above the pavement. The one cause this card makes: what is loose has only its own weight holding it, so the people under it are the risk before the building is. What usually happens when they call (Table A emergency scaffolding): the area underneath closed off first and kept closed, the hazard and what can carry a scaffold looked at, an interim arrangement put up under supervision (a protective fan over the path, a scaffold that holds the piece or lets it be taken down), handed over and checked, then altered or taken down once the repair is done. Both readings: the homeowner hears what will be closed and for how long only as the business says on the call; the builder hears what the interim scaffold is built for. Never a response time, round the clock cover or a call out promise unless [CV: response_time] or [CV: emergency_callouts] confirms it. Never that the building will fall down. |
| A roof opened by a storm or a fire | the rooms below with nothing between them and the rain | Tiles gone from a slope, a roof burnt through, a tree across the ridge, a chimney down through the covering. The one cause this card makes: the rooms below have nothing between them and the rain until something is put over them, and the roofer cannot work on it without an edge to stand behind (Table B temporary roofs, edge protection). What usually happens, from Table A: edge protection and a working platform for the roofer's first cover, or a temporary roof over the whole slope where the repair will run for weeks; wind can stop a safe build and that is said without a time. The trade reading: the roofer's dates and loads told to the scaffolder, because the interim scaffold is built for what was asked (Table E handover). The homeowner reading: whether the business deals with the home insurer only from the client values; what the policy needs is the insurer's to say (Table E: policies differ on telling the insurer about scaffolding). Never a promise about the weather. |
| A scaffold that has moved or been hit | the whole scaffold shifting on a base or a tie that has given | From Table B scaffold inspections and emergency scaffolding: a scaffold (anyone's) leaning after a gale, a lorry that has clipped a standard, sheeting torn and flogging in the wind, boards gone, a tie pulled out of the wall. The one cause this card makes: a base or a tie that has given, so the whole thing can shift. What usually happens, from Table A scaffold inspections: nobody on it and access kept off it until a competent person has looked at the feet, the ties, the boards and the guard rails and recorded what was found; a check after bad weather or anything that could affect it is what usually applies (Table E, the interval stays in the facts). The trade reading: the written record of the check. The homeowner reading: who to call when it is not their scaffolder's scaffold, only as the business says. Never a dig at the firm that put it up, never 'unsafe' as a verdict from the ground. |
| What to do before we get there | people walking under what could still fall | What the customer can do from the ground, from the trade facts first stage (make the area safe and keep people out of it): keep everyone, themselves included, from under what is loose; shut the gate, move the car, keep the children in, tell the neighbours whose path or garden is under it; where it is over the pavement, keep people walking past clear of it as far as that can be done without anyone standing under it; a photo from somewhere safe is useful to whoever repairs it and to an insurer. The one cause this card makes: every person who walks under it while they wait is the risk. Never a ladder, never anyone onto the roof or the scaffold, never an instruction to prop, tie or take anything down themselves; never a time by which anyone arrives unless [CV: response_time] is set. |

**Steps.**

1. **Call Us.** Brief: What to say: what has happened (a chimney or a parapet shifted, a roof opened by a storm or a fire, render falling, a scaffold that has moved), where it is, whether it is over a pavement, a drive, a door or a neighbour's garden, and whether people can still get past it. What to do meanwhile, from the trade facts first stage (make the area safe and keep people out of it): keep everyone from under it, keep the children and the car away from it, tell the neighbours whose side it is over, and nobody up a ladder or onto the roof. The number from [CV: phone]. No promise of a reply or an arrival time unless [CV: response_time] is set.
2. **We Make the Area Safe and Agree What Goes Up.** Brief: The first stages from Table A emergency scaffolding: the area under the hazard closed off and access kept off it, the hazard and what can carry a scaffold looked at, a safe interim arrangement chosen (a protective fan, edge protection, a holding scaffold, a temporary roof where the repair will run for weeks), with drawings where nothing standard covers it, said as what usually applies. The customer shown what was found (photos only from the photos_of_faults practice). The price for making it safe agreed before any work starts only from the price_agreed_before_work practice and [CV: quote_method]; what the permanent work costs waits until it has been seen. Never restates 'free'.
3. **We Put Up What Holds It Until the Repair.** Brief: The interim scaffold built under supervision, handed over and checked before anyone uses it, then reviewed and altered or taken down once the permanent work allows (Table A). Wind, ice or a slippery roof can stop a safe build: say so, without a time. 'Same day' only when [CV: same_day_available] is yes. Never promise a same visit build. Never mention the price.

**FAQ slots.** Five before the symptom question: cost, one cover question (insurance, else the fallback), scope, process, timing (the start_time question when it is set, else the storm question).

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much is an emergency [TRADE_PERSON] call out in [CITY]? | What moves the price, from the cost cards: the time of day and the day of the week, how far the job is from the yard, the access and the pavement, what closing it off and holding it takes, and that the permanent scaffold for the repair is priced as its own job. A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; the hours the business comes out only from [CV: out_of_hours_available]; an arrival time only from [CV: response_time]. The price agreed before work starts only from the price_agreed_before_work practice. No figure. | Price |
| cover | insurance | Are you insured for emergency scaffold work? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible example (a scaffold built in a hurry against a damaged wall) that does not suggest carelessness. Never what it pays or who it covers; never a legal minimum (Table E). | Trust |
| cover | always | What if the emergency scaffold itself causes damage? | Open with what the customer does: tell us and we look at it. Then that an interim scaffold is built to hold until the repair and is checked and altered as the repair goes on (Table A), under the reasonable care and skill standard, never as a defence. What protects the house said as this business's practice only from the property_protected practice. No promise to put it right free. Never invent a guarantee or an insurance outcome (Table G). | Trust |
| scope | always | Is this an emergency, or can it wait for a normal booking? | What counts as urgent, from the card list and Table B: something loose above a path, a door or the pavement; a roof open to the rain; a scaffold that has moved, lost boards or torn its sheeting; an edge people are working at with nothing behind them. What usually waits for a planned scaffold: a repair the roofer has booked for next month, a chimney that has looked the same for years, render cracked but holding. Link the Domestic scaffolding page or the category page. Planned work is never dressed up as urgent. | Fit |
| process | always | What should we do before you arrive? | From the ground only, from the trade facts first stage: keep everyone from under it, close the gate or the path, move the car, tell the neighbours whose side it is over, keep people on the pavement clear of it as far as that can be done without anyone standing under it, take a photo from somewhere safe. Never an instruction to go up a ladder, onto the roof or the scaffold, or to prop or tie anything themselves. Whether the business deals with the home insurer only from the client values. | Process |
| timing | start_time | How quickly can you get here? | From [CV: response_time] and [CV: start_time] only, as given; a same day visit only when [CV: same_day_available] is yes; the build waits until the wind has dropped and the roof or the wall is safe to work at (Table A). Never '24/7' or 'any time' unless [CV: emergency_callouts] gives it in those words. | Timing |
| timing | always | Will you come out while the storm is still going? | What usually happens: the area closed off and the hazard looked at as soon as it is safe to be near it; the scaffold goes up once the wind has dropped enough to build safely, and until then the work is keeping people clear (Table A: weather can prevent safe erection). No response time, no out of hours promise unless [CV: emergency_callouts] or [CV: response_time] gives it. | Timing |

## Service page blocks by business type (service_page_blocks)

4 Nov 2026. Used by the service page job (CORE (17)): What's Included is an H2 whose tick item titles are the service's own Table A stages (6 to 8, in order) with the role based set below as the fallback when the pack gives fewer than 6 (F-ITEMS-GENERIC); block 4 and block 5 are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (cost, timing, cover, rules, scope) and the steps (the niche steps). The service's own trade facts rows (`trade-facts/pack.js rowsForService`) are the material every brief points at, so one type A entry serves a chimney scaffold, a temporary roof and an inspection alike. Placeholders: `[SERVICE]`, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for scaffolding".
- The block 4 mechanisms differ from the category page briefs' on purpose (MECHANISMS USED).
- No desire variant: the pack flags no page desire led, and the plain block 4 below is already the customer's situation under the H2 "When a Job Needs [SERVICE]", never "signs you need it".

### Type A (project trade: every planned page)

Three framings share this one entry, per the pack's section 2: an access led page uses block 4 below as written; a protection led page (temporary roofs, debris netting and sheeting, edge protection) reads the "on a protection led page" line in each brief; a schedule led page (scaffold inspections, scaffold design) reads the "on a schedule led page" line.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Surveying the building and the ground | The first stage from Table A for this service: the building, the ground and what the feet will stand on, where the ties can go, how the lorry gets in, what the trade needs and where. A part of the job, not a promise about the quote. |
| A standard arrangement or a drawn design | Whether the scaffold is a standard arrangement or needs drawings and calculation first, from Table A and Table E for this service (a temporary roof and a suspended platform are usually drawn; a cantilever, a loading bay or a sheeted face is drawn unless a standard arrangement covers it), said as what usually applies. Never the guidance's name or a number. |
| Licences and agreements sorted before the start | The council's licence where any of it stands on or over the pavement, the neighbour's agreement where it stands on or over their land, consent where fixings go into a listed building, from Table A and Table C for this service as what usually applies. Who applies for the licence as this business's practice only from the client values. Never a fee, a lead time or an Act's name. |
| Protecting what it stands on and touches | Boards under the feet on lawns and paving, padding where tubes meet render or glass, the contact points on old stonework protected (Table A heritage: protect contact points). As this business's practice only from the property_protected practice or [CV: materials_methods]; otherwise the stage in general terms. |
| Putting it up, boarding and guarding it | The central stages from Table A for this service: set out and built, boarded, guard rails and toe boards on, the way up fitted (a ladder bay or a stair), ties in as it rises. Named as the trade names them, no figure. |
| Handover and the first check | From Table A (handover and inspect) and Table E (handover and use by another trade): the scaffold checked and handed over before anyone climbs it, and the roofer or builder told what it is built for and what it can carry. No load figure. |
| Checks while it stands | From Table A (inspect during use) and Table E (inspection interval, written without the figure): checked on a regular cycle while it is up, again once a storm has passed and whenever it is changed, with a written record. Who inspects only from the client values. |
| Taking it down and making good | The last stage from Table A: taken down in order with the ties removed as it comes down, the materials off the ground and away. Tie holes made good and the garden left as it was only from the property_protected practice or [CV: materials_methods]; otherwise say it is cleared. |

**Block 4, when a job needs it.** H2: When a Job Needs [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The job the scaffold is for | work at a height a ladder can't serve safely or for long | Access led by default, the customer's situation and never a symptom: the roofer, renderer, painter, window fitter or builder has said they need a platform, and the signs from Table B for this service are theirs ('there's nowhere safe to put the roof materials', 'the ladder doesn't reach the chimney'). What decides it: the height, the sides, how long the trade is up there and what they carry up. What the work gives them, from Table A: a boarded, guarded platform at the level the work is done, a way up and a place for the materials. On a protection led page (temporary roofs, debris netting and sheeting, edge protection): write what the weather or a fall would do and why, from the Table B skipped row, and what prevents it. On a schedule led page (scaffold inspections, scaffold design): what slips and when: another trade shifting a tie, a board lifted out to pass materials through, a base pushed by a storm (Table B signs), a design needed before the build and again before any change outside it (Table A). Never a safety lecture, never an instruction for anyone to build or climb anything themselves. |
| No room for an ordinary scaffold | something below or in the wall that an ordinary scaffold needs and hasn't got | The situation from Table B for the pages where a standard scaffold is ruled out: the ground below cannot take legs, the platform has to reach past a conservatory or a porch, a whole ceiling has to be worked on at once, a face cannot be reached from the ground, the ties would go into old masonry. What decides it: what is below and what the wall can take. What the work gives them, from Table A for this service: the arrangement that replaces the ordinary one (a projecting section, a birdcage filling the room, a platform hung from the roof, a freestanding section that touches nothing it should not), and that it is usually a drawn design rather than a standard arrangement (Table E), said as what usually applies. The homeowner reading: where it will stand and what it will not touch. The trade reading: drawings before the build, any lead time only from the client values. On a protection led page: the face or the edge that cannot be covered the ordinary way, because a covered face catches the wind, which means more ties in most cases (Table E). On a schedule led page: the arrangement no standard sheet covers, which is what needs the design (Table B scaffold design signs). Never 'difficult access'. |
| What's underneath and alongside it | ground, paving or a neighbour's land that has to carry the feet | Both readings: the lawn and the borders, a drive or block paving, a drain cover, a basement light well, a conservatory roof, the pavement, next door's garden, a parked street. The one cause this card makes: a scaffold stands on ground, paving or a neighbour's land that has to carry it and come through unmarked (Table E bases and ground: voids, drains and soft patches can undermine the feet). What the work gives them, from Table A: the base sorted at survey, boards under the feet where the ground needs them, the licence or the agreement before the start where the feet are not on the customer's land. As this business's practice only from the property_protected practice; otherwise as the stage the trade usually does. No board size or footing figure (Table G). On a schedule led page: the base checked at each inspection (Table A inspections: foundations). Never a judgement on the garden or the street. |
| Up for longer than the job | hire running while nobody is working from it | The situation, in both readings: the trade's start slips, the scaffold went up early, the plan changed so an alteration is needed, or the job is done and the scaffold is waiting to come down (Table B scaffold hire: 'the planned work or loading has changed'). The one cause this card makes: hire running while nobody is working from it. What decides it: the start and finish the roofer or builder gave before the scaffold was booked, and what the contract says about the period and an extension (Table E hire period: the contract decides; there is no typical length). What the work gives them: a scaffold booked to the trade's start and finish and altered only on request, through the scaffolder and never by the trade (Table B scaffold hire done badly), as this business's practice only from the client values; terms only from [CV: price_list]. On a schedule led page (inspections): what a scaffold standing for weeks picks up: ties moved, boards lifted, a base shifted by weather, each a reason for a check (Table B signs). Never a weekly charge, never 'free alterations'. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much scaffold the job needs | The size factor from the Table F row for this service: more sides, more working levels, a longer projection, a bigger span, a larger deck, a taller tower. Say it plainly and give no figure. |
| Ground, ties and what's in the way | From the Table F row for this service: weak ground, limited places to tie, a supporting structure that has to be checked, an obstruction the scaffold must clear, restricted access for the lorry. Say the business looks before it prices, from [CV: quote_method] only. |
| Paperwork and the public | From the Table F row for this service: the council's conditions where it stands on the highway (lighting, a way past for people on foot, signs), a parking bay suspended, a consent on a listed building, keeping the public or an occupied building clear. Said as what usually applies; no fee or lead time, never an Act's name. |
| Additions and the hire period | From the Table F row for this service: netting or sheeting, a loading bay, a stair tower, a hoist, flame retardant sheeting where it is specified, drawings for anything outside a standard arrangement; and the hire period, which the contract sets (Table E). A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us About the Building and the Job; We Survey and Price the Scaffold, or We Price Your Scaffold without the site visit practice; We Put It Up for the Date Your Trade Needs It); the emergency variant's steps when the emergency layout is on.

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The cost cards hold the list: never repeat it or point to it. No hire period or weekly figure unless price_list gives one. | Price |
| timing | always | How long does [SERVICE_LOWER] take to put up? | From the trade facts timing row for this service only, which gives no standard: what decides it (the sides, the height, the arrangement, whether drawings come first, the licence where it stands on the pavement) and the weather that stops a safe build (wind, ice, a slippery roof). Nothing about when the job can start unless [CV: start_time] is set; a duration only from the client values. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for, named only as the client value gives it. Never what it pays or who it covers; never a legal minimum (Table E). | Trust |
| cover | always | What happens if something isn't right with the scaffold? | Open with what the customer does: tell us and we look at it, and nobody uses it until it has been looked at (Table A inspect during use). Then the reasonable care and skill standard every trade works to. No promise to come back or alter it free. Never invent a guarantee. | Trust |
| rules | always | Is a licence or permission needed for [SERVICE_LOWER]? | From the trade facts rule rows for this service only, put as the thing that usually applies, with "usually" or "in most cases": anything on or over the highway wants the council's permit first (the scaffolder applies for it as a rule, lighting at night and a way past are the normal conditions, and the permit does not close a road); on next door's land, their agreement; fixings into a listed building, consent that can be needed; a scaffold inside the customer's own garden for work that is itself allowed, usually nothing. What the customer does about it only as the row gives it. Never a standard's number, an Act's name, a fee, a lead time or legal advice. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words, in both readings (what the homeowner sees happen; what the trade gets at handover). What it does not cover only from the services list, with one sibling service page or the category page linked. Never 'on this page' or 'listed above': name the work. | Fit |
| symptom | a symptom tagged with the page | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: a terrace stack with nothing beneath it, a three storey front onto the pavement, a conservatory under the eaves, a face on an exposed hill. Then what the local housing or street adds, never as a judgement on the buildings, and what this service does about it from Table A. One figure at most. | Process |

### Type A, emergency variant (Emergency scaffolding, when the client confirms call outs)

Block 5 cost set (`cost`), H2 "What Moves the Price of an Emergency Call Out in [CITY]": what moves the price of a call out, never an arrival time, hours of cover or a call out charge unless `response_time`, `out_of_hours_available` or a call out fee is in the client values.

| Card | Brief |
|---|---|
| When you call | The time of day and the day of the week move the price: a Sunday evening against a weekday morning, a crew called back out against one already on its way to a job. A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; never say there is no charge for coming out unless [CV: quote_call_out_fee] says there is none. Whether the business comes out at those hours only from [CV: out_of_hours_available]; when it is not set, nothing about hours at all. Say it plainly and give no figure. |
| Getting there and getting it up | How far the job is from the yard and what is in the way once the lorry arrives: a scaffold that has to stand on a pavement with people kept past it, a parking bay to clear, a chimney over a neighbour's roof, a narrow lane with nowhere for the lorry to stand (Table F emergency scaffolding: restricted safe access, the public or the highway to keep clear). Distance and access move the price; say why in plain words. Never an arrival time unless [CV: response_time] is set; never hours of cover unless [CV: out_of_hours_available] says so. |
| Closing it off and holding it | What is done first on a call out, from Table A emergency scaffolding: the area under the hazard closed off and people kept out of it, the loose masonry or the open roof edge and what can carry a scaffold looked at, then an interim arrangement chosen: a protective fan, a holding scaffold, a platform to take the loose piece down from. How much of that is needed, and whether anything standard covers it or it needs an urgent design (Table F: urgent bespoke design; Table E: a temporary roof is among the structures that normally need a design), is what the first part of the price pays for. Never how it is done beyond this. |
| What's on the lorry and what has to follow | A first load of tube, boards and fittings comes with the crew; a bigger scaffold than that load, sheeting, a temporary roof or a stair tower means more brought from the yard, and a drawing where nothing standard covers it (Table A emergency scaffolding: a bespoke design where no standard configuration covers it). The hire runs under the contract from the day it goes up (Table E hire period), and the permanent scaffold for the repair, the alterations as the repair goes on and the licence where it stands on the pavement are priced as their own job (Table A: reviewed and altered or removed when the permanent work permits). Say what decides it and give no figure. Code adds the price line from [CV: price_list] when there is one. |


Replaces block 4, the steps and the FAQ slots; What's Included, block 5 and the symptom question stay as above. The emergency variant wins over any other variant.

**Block 4, when this can't wait.** H2: When [SERVICE] Can't Wait

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Something above a path that could come down | a piece of the building that no longer holds itself up | From Table B emergency scaffolding: masonry loose above a walkway, a chimney cracked in a gale, a coping or a parapet shifted, render falling off a gable over a door. The one cause this card makes: a piece of the building that no longer holds itself up, so whoever walks under it is the risk before the building is. Write the reader's situation, the reason it won't keep, and what usually happens when they call (Table A emergency scaffolding): the area underneath closed off first, the hazard and what can carry a scaffold looked at, an interim arrangement built under supervision (a protective fan, a holding scaffold, a platform to take it down from), handed over and checked, altered or removed once the repair allows. Leads on the Emergency scaffolding page. Never a response time or a call out promise unless [CV: response_time] or [CV: emergency_callouts] confirms it. Never that the building will fall down. |
| A roof or a wall open to the weather | timbers and plaster wetting with every shower until something covers them | A slope with the tiles gone, a roof burnt through, a wall opened by a vehicle, a stripped roof whose sheets have blown off. The one cause this card makes: timbers, insulation and plaster wetting with every shower until something covers them, and a roofer who cannot work at the edge without protection (Table B temporary roofs, edge protection skipped rows). What usually happens, from Table A: edge protection and a platform for the first cover, or a temporary roof over the whole job where it will run for weeks, built when the wind allows and said without a time. The trade reading: the loads and the dates told to the scaffolder, because the interim scaffold is built for what was asked (Table E handover). Whether the business deals with the home insurer only from the client values. Never a promise about the weather. |
| A scaffold nobody should be on | nobody has checked it since it moved | From Table B scaffold inspections: a tie come loose, boards moved, sheeting torn by wind, a scaffold that has changed since it was last checked, one that has been clipped by a lorry or is leaning after a gale. The one cause this card makes: nobody has checked it since it moved, so nobody knows what it will carry. What usually happens, from Table A scaffold inspections: access kept off it, a competent person looks at the feet, the ties, the boards and the guard rails, records what was found and what is to be done, and it stays closed until it is put right; a check once a storm has passed, and whenever anything on it has been changed, is what usually applies (Table E, interval unwritten). Both readings: the roofer hears that the record is the thing a main contractor wants to see; the homeowner hears that nobody goes up it, themselves included. Never a dig at whoever built it. |
| Until the permanent repair | an interim scaffold that has to be reviewed as the repair goes on | The reader's situation once the first danger is dealt with: the interim scaffold is up and the builder or roofer now needs to work from it, the insurer is involved, the street is still partly closed. The one cause this card makes: an interim scaffold built in a hurry has to be reviewed as the repair goes on and altered or taken down when the permanent work allows (Table A emergency scaffolding, last stage); the exclusion stays until the arrangement is safe to use (Table B done badly: exclusion removed too soon). What usually happens: handover to the trade with what it is built for (Table E handover), alterations through the scaffolder only, the hire running under the contract (Table E hire period), the licence kept up where it stands on the pavement. Terms only from [CV: price_list]; whether the business deals with the insurer only from the client values. Never a weekly figure, never a promise about how long the repair takes. |

**Steps.**

1. **Call Us.** Brief: What to say: what has happened, where it is, whether it is over a pavement, a drive, a door or a neighbour's garden, and whether people can still get past it. What to do meanwhile, from the trade facts first stage (make the area safe and keep people out of it): keep everyone from under it, keep the children and the car away, tell the neighbours whose side it is over, nobody up a ladder or onto the roof. The number from [CV: phone]. No promise of a reply or an arrival time unless [CV: response_time] is set.
2. **We Close It Off and Look at What's Holding.** Brief: The area under the hazard closed off and access kept off it, the hazard and what can carry a scaffold looked at, the interim arrangement chosen, with drawings where nothing standard covers it (Table A emergency scaffolding), said as what usually applies; the customer shown what was found (photos only from the photos_of_faults practice). The price for making it safe agreed before any work starts only from the price_agreed_before_work practice and [CV: quote_method]. Never restates 'free'.
3. **We Build the Interim Scaffold and Hand It Over.** Brief: The interim scaffold built under supervision when the wind allows, checked and handed over before anyone uses it with what it is built for (Table E handover), then reviewed and altered or taken down once the permanent work allows (Table A). Never promise a same visit build; 'same day' only when [CV: same_day_available] is yes. Never mention the price.

**FAQ slots.** Five before the symptom question: cost, timing (the start_time question when it is set, else the wind question), one cover question (insurance, else the fallback), process, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much is an emergency [TRADE_PERSON] call out in [CITY]? | What moves the price, from the cost cards: the time of day and the day of the week, how far the job is from the yard, the access and the pavement, what closing it off and holding it takes, and that the permanent scaffold for the repair is priced as its own job. A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; the hours the business comes out only from [CV: out_of_hours_available]; an arrival time only from [CV: response_time]. The price agreed before work starts only from the price_agreed_before_work practice. No figure. | Price |
| timing | start_time | How quickly can you get here? | From [CV: response_time] and [CV: start_time] only, as given; a same day visit only when [CV: same_day_available] is yes; the build waits until the wind has dropped and the wall or the roof is safe to work at (Table A). Never '24/7' or 'any time' unless [CV: emergency_callouts] gives it in those words. This is the one place the timing is written. | Timing |
| timing | always | Can you put it up while the wind is still up? | What usually happens: the area closed off and the hazard looked at as soon as it is safe to be near it; the scaffold goes up once the wind has dropped enough to build safely, and until then the work is keeping people clear (Table A: weather can prevent safe erection). No response time, no out of hours promise unless [CV: emergency_callouts] or [CV: response_time] gives it. This is the one place the timing is written. | Timing |
| cover | insurance | Are you insured for emergency [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible example (an interim scaffold against a damaged wall) that does not suggest carelessness. Never what it pays or who it covers; never a legal minimum (Table E). | Trust |
| cover | always | What if the interim scaffold has to change once the repair starts? | Open with what the customer does: tell us and we look at it. Then that an interim scaffold is built to hold until the repair and is reviewed and altered as the repair goes on (Table A), through the scaffolder and never by the trade; the reasonable care and skill standard, never as a defence. No promise to alter it free. Never invent a guarantee. | Trust |
| process | always | What should we do before you arrive? | From the ground only, from the trade facts first stage: keep everyone from under it, close the gate or the path, move the car, tell the neighbours whose side it is over, keep people on the pavement clear of it as far as that can be done without anyone standing under it, take a photo from somewhere safe. Never an instruction to go up a ladder, onto the roof or the scaffold, or to prop or tie anything themselves. Whether the business deals with the home insurer only from the client values. | Process |
| scope | always | Is this an emergency, or can it wait? | What counts as urgent for this service, from the card list and the Table B signs row: something loose above a path or a door, a roof or wall open to the rain, a scaffold that has moved or lost its boards or sheeting, an open edge people are working at. What usually waits for a planned scaffold, from Table B: a repair already booked for a date, a chimney that has looked the same for years, cracked render that is holding. Link the planned sibling page or the category page. Planned work is never dressed up as urgent. | Fit |

## Location page blocks by business type (location_page_blocks)

4 Nov 2026. Used by the location page job (CORE (18)): block 4 (what shapes the work across the town) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question). The steps are the niche steps. The briefs are town wide, not per service: the town profile (the pack's section 3 anchors: pavements with no front garden, terrace chimneys, three storey streets, alleys, exposure, conservation areas), the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose. No seasonal swap and no symptom question on a location page. The type is the client's. Placeholders: `[WORK]`, `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town. Every anchor must change the work, never judge the street or the roofs (the pack's section 3).

- A niche with no section here has its location pages refused: "no location block briefs for scaffolding".

### Type A (project trade: the client's type is A)

**Block 4, what shapes the work in the town.** H2: What Shapes [WORK] in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Front doors that open onto the pavement | no front garden, so the feet stand on the highway | The town profile gives the terraces and the streets with no front garden; the card says what that changes in the work, never that the streets are dangerous. The one cause this card makes: with no front garden, the scaffold's feet stand on the highway. What usually follows, from Table C and Table E as what usually applies: the council's licence before anything goes up (the scaffolder usually applies), lighting at night and a clear way past for people on foot as the usual conditions, a parking bay suspended separately where the street is parked up, and the licence date as the earliest the scaffold can go up. Which council, only where the dossier gives it; never a fee or a lead time (Table G: none is national), never an Act's or a section's name. Not next door's land, not what the feet stand on in a garden: the town's category and service pages own those. |
| Chimneys and gables with nothing below them | stacks and gables with only a neighbour's roof or garden beneath them | The profile gives the terraces and semis: stacks on a shared ridge, a gable on the boundary, a flank wall over next door's extension. The one cause this card makes: the stack or the gable has only a neighbour's roof or garden under it, so the scaffold is built off the roof slope or projected out from the building rather than up from the ground (Table A chimney scaffolding, cantilever and truss out), and where it reaches over next door's side their agreement usually comes first (Table E oversailing). Said as what the work involves, never as a judgement on the roofs. Not the stack itself, not the arrangement in detail: the Chimney scaffolding and Cantilever pages own those. |
| Three storeys against two | the height of the town's older houses | The profile gives the housing: three storey Victorian and Edwardian streets against two storey estates and bungalows. The one cause this card makes: the height of the town's older houses, which adds working levels, ties and usually a stair or a loading bay where the trade is up and down all day (Table F domestic scaffolding), while the estates add little height but have the lawns and paved drives that must come through unmarked. An era says what the scaffold involves, never what state the roofs or chimneys are in. Not materials up a ladder: the category page owns that. |
| Wind where the town stands open | a covered scaffold catching the wind on an exposed face | The profile gives the exposure: a hilltop, a seafront, an estuary, a ridge road. The one cause this card makes: a sheeted, netted or roofed scaffold on an exposed face catches the wind, so it is usually a drawn design with more ties, and the sheeting is told to the scaffolder before it goes on (Table E sheeting and wind, temporary roof). Where the town is sheltered, the card reads instead as conservatories and lean tos under the eaves of the estates, where the feet cannot go and a bridged or projecting section is used (Table B cantilever signs). Never a promise about the weather, never the guidance's name. Not a stripped roof: the category page owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| A scaffold on the pavement | Where the town's streets put the feet on the highway (the profile says which), the council's conditions (lighting, a way past, signs), a parking suspension and sometimes a protective gantry add to the job (Table F pavement and road scaffolding). No fee, no lead time, never an Act's name. |
| Tall houses and tight alleys | Three storeys mean more levels and ties; a rear reached only by an alley or through the house means the tubes and boards carried in by hand (Table F domestic scaffolding: restricted delivery or erection access). From the profile where it gives the housing and the alleys. No figure. |
| Wind on the hill or the front | A sheeted or roofed scaffold on an exposed face usually needs a design and more ties, and that is more scaffold and more time (Table F temporary roofs, debris netting and sheeting: wind exposure). From the profile where it gives the exposure. Never a promise about the weather. |
| Conservation areas and listed fronts | Where the town has them, consent can be needed before fixings go into a listed building, and old stonework may take no ties at all, so a freestanding or alternative support and padded contact points are used (Table F heritage and listed building scaffolding, Table E conservation area and listed fabric). Sheeting in a conservation area is not automatically ruled out: local controls apply. "Usually", never the Act's or the area's official name; from the dossier rules only. |

**Steps.** The niche steps (Tell Us About the Building and the Job; We Survey and Price the Scaffold; We Put It Up for the Date Your Trade Needs It).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (a scaffold on the pavement, the height of the houses, access to the back, exposure) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. Where the feet go on the highway, the council's permit fixes the earliest date in most cases: say so with no lead time. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for, named only as the client value gives it. Never what it pays or who it covers; never a legal minimum (Table E). | Trust |
| cover | always | What happens if the scaffold damages something? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to put it right free. Never invent a guarantee or an insurance outcome. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at, what comes back. Where the town's streets put the scaffold on the pavement, the licence as a usual step before the start, without a lead time. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Do you put scaffolding up all year round in [TOWN]? | Yes, from Table A: the work runs all year, and what interrupts it is wind, ice and a roof too slippery to work on rather than a season; where the profile gives the town's exposure (a hilltop, a seafront), say what it does to a sheeted scaffold. No dates, no promise about the weather, nothing about busy times or booking ahead. | Timing |

## Per page overrides (service_overrides)

Copy quality 3, 4 Nov 2026: a page whose job differs from the shared type entry gets its own briefs here, keyed by the page target in lower case. The code lays them over the type entry for that page only.

### Scaffold inspections

Cost cards, H2 "What Affects the Cost of [SERVICE] in [CITY]":

| Card | Brief |
|---|---|
| The size of what's being inspected | A single lift on a semi against a scaffold round a whole block with several separate areas: the bigger and the more complex the structure, the longer each inspection takes and the more there is to record (Table F scaffold inspections: larger or more complex structure, more separate scaffold areas). Say it plainly and give no figure. |
| How often over the hire | How many inspections the hire needs: before first use, after a storm or an alteration, and at the interval the rules set for a construction scaffold, said as what applies and written only as the pack gives it (Table A; Table E construction scaffold inspection interval). A long hire with weather and changes means more visits than a short one (Table F: additional inspections after alterations or weather). No figure. |
| A scaffold someone else built | An inspection of the business's own scaffold against one another firm put up: a stranger's scaffold means finding its design or its compliance sheet first, and a complex structure needs an inspector with the competence to match it (Table A: identify the structure and its design or compliance sheet; Table E: who inspects). Said without a dig at whoever built it; never that only the firm that built it may inspect. |
| What the inspection finds | A clean report against one that records defects and the action they need: a loose tie, moved boards or torn sheeting leads to an alteration, priced as its own job, and the scaffold stays off limits until it is done (Table A: record defects and action, restrict unsafe access; Table B). The written report is what the rules ask for; a tag on the scaffold supplements it and does not replace it (Table E). Code adds the price line from [CV: price_list] when there is one. |

Steps:

| Step | Brief |
|---|---|
| Tell Us About the Scaffold | What to say: where it is, who built it, what it is for, how many lifts and how long it is staying up, and whether there is a design or a compliance sheet for it. The number from [CV: phone], the form only from [CV: quote_method]. |
| We Agree the Interval and the Price | What usually happens: the inspections the hire needs worked out from what the scaffold is and how long it stands, from the rules as the pack gives them (Table A; Table E), and the price for the visits from [CV: quote_method] and [CV: price_list] only. Never restates 'free'. No interval as a figure here. |
| We Inspect, Record and Tag It | Each visit: the feet, the tube, the ties, the boards, the access and the guard rails looked at, what was found and what is to be done written up as the rules ask, the record left with the customer and the tag updated where one is used (Table A; Table E inspection record: the tag supplements the report). Anything unsafe kept off limits until it is put right. Never mention the price. |

### Scaffold design

Cost cards, H2 "What Affects the Cost of [SERVICE] in [CITY]":

| Card | Brief |
|---|---|
| How far from a standard arrangement | A scaffold a standard compliance sheet already covers needs no design of its own; one with an unusual shape, a temporary roof, a cantilever over something or nowhere to put standard ties has to be calculated and drawn (Table A scaffold design: check the standard scope, calculate the non standard arrangement; Table E: a temporary roof is among the structures that normally need a design). Say it plainly and give no figure; never a guide's name as a selling point. |
| What it has to carry | The loads on it: the trade's materials stacked on the platform, sheeting or netting that catches the wind, a hoist or a loading bay hung off it (Table E: sheeting and wind; the loading figure only as the pack gives it, never a class as a rule). The customer says what goes on it and the design is for that; a heavier use later means the design is looked at again (Table E handover). |
| How many drawings and how many changes | One drawing for one arrangement against several interfaces with the building, revisions as the job changes, and a check of every proposed change before it is built (Table A: check proposed changes; Table F: multiple interfaces or revisions). Say why a change mid job costs design time again. |
| The engineer's check | A design by a competent person with the calculation behind it is what the rules ask for; a check by an engineer where the client, the main contractor or the structure asks for one is a cost on top (Table E design responsibility: HSE does not say every design legally needs a chartered engineer, so never claim that it does). Said as what usually applies. Code adds the price line from [CV: price_list] when there is one. |

Steps:

| Step | Brief |
|---|---|
| Tell Us About the Job | What to say: the building and what is being done to it, the shape of the scaffold wanted, what goes on it and for how long, the ground it stands on and what it can tie to, and whether anything goes over a pavement or a neighbour's land (Table A: obtain site, use, load and ground information). The number from [CV: phone], the form only from [CV: quote_method]. |
| We Draw It and Price the Design | What usually happens: the standard sheets checked first; where nothing covers it, the arrangement calculated, the bases, the bracing, the ties, the wind and the access specified and the drawings produced (Table A). The price for the design from [CV: quote_method] and [CV: price_list] only; the build priced as its own job. Never restates 'free'. |
| We Issue the Drawings for the Build | The drawings and the instructions issued to whoever builds it, with what it is designed to carry; any change proposed on site goes back for a check before it is made (Table A: issue drawings and instructions, check proposed changes). Said without a time. Never mention the price. |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

For the client (no client value carries these today, so the briefs say "only from the client values"):
1. The hire period a quote covers and what an extension costs. Table E says only that the contract decides; the cost and hire briefs can take a figure from price_list alone.
2. Who applies for the council's permit when the scaffold stands on the pavement, and whether its fee is in the quote. Table E says the builder or the scaffolder obtains it; the briefs say "the scaffolder, in most cases" and name nobody.
3. Whether alterations during the hire are charged. The pack's section 7 bans "free adaptations" unless confirmed, and no practice or value carries it.
4. What protects the house (boards under the feet, padding at render and glass, tie holes made good) and what secures the ladder at night (removed, a guard, an alarm). property_protected is the only practice near it; Table E says ladder removal and alarms are measures, not requirements.
5. Whether the business takes storm and fire call outs, and whether there is a call out charge or an out of hours rate. The emergency layout turns on only from emergency_callouts; a figure only from price_list.
6. Which trade bodies the business belongs to and at what level (NASC audited contractor, Scaffolding Association assessed or audited), and which cards the scaffolders hold. Table D says the levels are not interchangeable; logo_tiers names them as held.
7. Who inspects the scaffold while it stands and whether the customer gets the written record. Table E says a competent person, not necessarily the firm that built it.
8. Whether the business deals with the home insurer after storm or fire damage, or only builds the interim scaffold.

For Ray and the trade facts pack (Table G records most as not found; the briefs give no figure):
9. Any erection duration for any scaffold. Tables A and G say "varies; no standard" for every service, so the homepage, category, service and location timing briefs say what decides it and nothing more.
10. A typical hire period or a weekly extension charge. Not found; the hire briefs point at the contract.
11. A council permit lead time or fee. Table E gives two councils' notice periods as examples and no national figure; the briefs say "no lead time, no fee" and leave the council to the local research.
12. A load figure a homeowner page could use. Table E gives HSE's general purpose figure; the briefs keep every load figure in the facts and say "no load figure".
13. The inspection interval. Table C and Table E give it with its height condition; the briefs say "at regular intervals" or "on a regular cycle" and point at the rows, so the figure is the facts pack's to state.
14. The pack's header says verified: no; the service page gate refuses a run until it is verified on the Trade facts screen.

## Alternate Why title that promises a practice (why_title_practice)

"Built Around the Other Trade's Dates" stands only with a practice no tick confirms, so never by default; otherwise the point reads "Local Experience Behind Every Job".

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| Nowhere on the ground to build from | Chimney scaffolding; Cantilever and truss out scaffolding |
| A roof stripped with the weather coming | Temporary roofs; Debris netting and sheeting; Edge protection |
| Every tile carried up a ladder | Hoists and loading bays; Stair towers and temporary stairs |
| A scaffold that has moved or been hit | Scaffold inspections |
| Front doors that open onto the pavement | Pavement and road scaffolding |
| Chimneys and gables with nothing below them | Chimney scaffolding; Cantilever and truss out scaffolding |
| Wind where the town stands open | Debris netting and sheeting; Temporary roofs |
| A scaffold on the pavement | Pavement and road scaffolding |
| Wind on the hill or the front | Debris netting and sheeting; Temporary roofs |
| Conservation areas and listed fronts | Heritage and listed building scaffolding |

## Idea homes

- **the council's licence before a scaffold on the pavement** (homepage): home is the 'Do I need permission to put scaffolding up at my house?' FAQ. Elsewhere: the survey step, the start FAQ and the how-long FAQ name the licence in one clause at most and never explain it.
- **the council's licence before a scaffold on the pavement** (service): home is the 'Is a licence or permission needed for [SERVICE_LOWER]?' FAQ. Elsewhere: the 'Paperwork and the public' cost card gives it only as a cost and the how-long FAQ names it in one clause.
- **waiting for the wind to drop before building** (service): home is the 'Can you put it up while the wind is still up?' FAQ. Elsewhere: step 3 and the 'How quickly can you get here?' FAQ say only 'once it is safe to build'.
- **closing off the area and looking at the hazard first** (service): home is the step 'We Close It Off and Look at What's Holding'. Elsewhere: the 'Closing it off and holding it' cost card gives it only as a cost and the wind FAQ answers only the wind.
- **the interim scaffold reviewed and altered as the repair goes on** (service): home is the 'What if the interim scaffold has to change once the repair starts?' FAQ. Elsewhere: step 3 stops at handover and the 'Until the permanent repair' card names the situation without the review.
- **what to do from the ground before the crew arrives** (category): home is the 'What should we do before you arrive?' FAQ. Elsewhere: the 'What to do before we get there' card and the Call Us step say only 'keep everyone clear' in one clause.
- **waiting for the wind to drop before building** (category): home is the 'Will you come out while the storm is still going?' FAQ. Elsewhere: step 3 and the 'How quickly can you get here?' FAQ say only 'once it is safe to build'.
- **closing off the area and looking at the hazard first** (category): home is the step 'We Make the Area Safe and Agree What Goes Up'. Elsewhere: the 'Closing it off and holding it' cost card gives it only as a cost and the storm FAQ answers only the weather.
- **the pavement licence and the council's conditions** (category): home is the block 4 card 'The pavement, the road or next door in the way'. Elsewhere: the pavement cost card gives it only as a cost, and the quote FAQ and the timing FAQ name the licence in one clause.
- **the hire period set by the quote and the contract** (category): home is the cost card 'The extras and the weeks of hire'. Elsewhere: the cost FAQ and the timing FAQ say only that the quote sets the period.
- **the town's pavement-fronted streets and the council's permit** (location): home is the block 4 card 'Front doors that open onto the pavement'. Elsewhere: the 'A scaffold on the pavement' cost card gives it only as a cost, and the soon FAQ and the quote FAQ name the permit in one clause.
- **wind on an exposed town and the sheeted scaffold** (location): home is the block 4 card 'Wind where the town stands open'. Elsewhere: the wind cost card gives it only as a cost, the cost FAQ names exposure in a word, and the all-year FAQ does not repeat the design and ties point.
- **the town's three-storey houses** (location): home is the block 4 card 'Three storeys against two'. Elsewhere: the 'Tall houses and tight alleys' cost card gives height only as a cost and the cost FAQ names it in a word.
