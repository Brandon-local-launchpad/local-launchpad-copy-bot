# Niche Library Entry: Garage Doors

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/garage-doors.json`; this file is the same content for people, kept in the same commit. The model never sees the slot names, only the resolved words.

Business type: **A (project trade)**. Emergency niche: **yes**, per page: the library's emergency column flags Garage door repairs (and the rows that fold into it: opener repairs, servicing), and the emergency variant switches on only when the client confirms call outs (the hand set Emergency primary, or the onboarding answer). The emergency_niche marker is kept but nothing reads it. Written 4 Nov 2026 from the Garage Doors Calibration Pack v1 (sections 1, 2, 4 and 7), the trade facts pack `trade-facts/garage-doors.md` (Tables A to G), `niche-library/garage-doors.csv` and `fillout/services/garage-doors-installs.json`, to the landscaper entry's depth.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Garage Doors / garage doors |
| trade_person / trade_person_plural | garage door fitter / garage door fitters (the pack's voice: a fitter explaining how the door works) |
| homepage_keyword | Garage doors (4 Nov 2026, Brandon: the homepage keyword is a way of saying the primary GBP category, picked on search volume; the H1 research pattern and the thin runner read it) |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | yes (a door stuck open; a broken spring or snapped cable) |
| big_ticket | yes (new garage doors, insulated sectional doors, electric garage doors) |
| schema_subtype | HomeAndConstructionBusiness (schema.org has no garage door subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| garage door, garage, drive, the opening, spring, cable, track, rollers, lock, bottom seal, motor, remote, car, house, home | property, premises, doorset, operator, counterbalance, curtain, lath, laths, aperture, U value, solutions, garage door issues, and the brands Hörmann, Hormann, Garador, Novoferm, SWS, Cardale, Birkdale, Gliderol, Henderson (words_avoid_exceptions: doorset is allowed on the Personnel and side doors and Front and entrance doors pages, where a fire or security rated door comes with its frame and doorset is the trade facts' word for it; operator is allowed where [CV: materials_methods] or a trade facts row names the motor as an operator, running text says motor; a brand only from [CV: materials_methods]) | kerb appeal, curb appeal, bespoke (the CORE banned word the pack's notes flag: the page is Made to measure garage doors), garage door solutions, door solutions, state of the art, transform your home, transform your garage, transform the front of your home, wow factor, first impressions, stylish and secure, the ultimate in security, peace of mind, no job too small (the pack's section 7 showroom language) |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| final_h2_emergency | Garage Door Stuck in [CITY]? Call [CV: phone] |
| cta_band_line | Tell us what your door is doing and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us what your door is doing and we'll get back to you. |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About Your Door**
   Brief: how to get in touch and what is useful to send first: what the door is doing (heavy, stuck, crooked, noisy) or what they want (a new door, an electric one, an insulated one), the kind of door they have now if they know it, and a photo of the door and the opening taken from the drive. Never ask the customer to look at, touch or test a spring or cable. No promise of a reply time unless [CV: response_time] is set.
2. **We Measure Up and Price the Job** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the visit and what gets measured and looked at (the Table A survey stages): the width and height of the opening, the space above it and to each side, the drive, the frame and the gear the door runs on. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
   Without the practice (`step_2_no_visit`): **We Price Your Job**
   Brief: a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video, measuring or visit). Only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **We Fit It on a Date That Suits You**
   Brief: the date agreed once the quote is accepted, to suit the customer. Whether the old door goes with us only from the confirmed practices. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

Emergency (`steps_emergency`, only when the emergency layout is on: the page is flagged emergency in the library and the client confirms call outs):
1. **Call Us.** Brief: what to say: what the door is doing (won't open, won't shut, dropped, went with a bang, hanging to one side, a cable loose), whether the car is in or out, and whether the garage has a door through to the house. What to do meanwhile, in plain words from the Table B and Table E rows: stop using the door, keep the motor off, never pull the release cord while the door is up, keep children and pets clear, and never touch a spring, a cable or the drum it winds on. The number from [CV: phone]. No promise of a reply or an arrival time unless [CV: response_time] is set.
2. **We Make the Door Safe and Tell You What's Failed.** Brief: the door secured first (Table A repairs: the fault found and isolated, the door secured before anything is replaced), then the part named in plain words (spring, cable, roller, track, motor) and the customer shown it. The price for making it safe agreed before any work starts only from the price_agreed_before_work practice and [CV: quote_method]; what the full repair costs waits until the part is known. Never restates "free". "Same day" only when [CV: same_day_available] is yes.
3. **We Fix It, or Order the Part and Come Back.** Brief: what usually happens on the visit: the compatible part fitted, the door rebalanced and tested where the part is to hand (Table A repairs); otherwise the door left shut and secure and a date agreed once the part arrives (Table A: parts availability varies). Never promise a same visit fix. Never mention the price.

The category and service page emergency variants carry their own three steps (below).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer warranty → insurance (a garage door and its motor carry the maker's warranties, by part: Table E) |
| fears (in order, one per Why choose us point; the pack's section 1) | 1. a new door made for a different opening than theirs, or one that comes out over the drive they park on; 2. a motor sold for a door whose springs were already tired, so it strains from the first day; 3. a repair that swaps the part and never asks why it failed, so they pay twice; 4. being talked into a whole new door when a spring or a cable was all that had gone |
| fears_by_type | none: there is no type B in this trade (nothing is a recurring round), so the slot is an empty object |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies and registers:** DHF (Door and Hardware Federation) Garage Door Group, TrustMark, Trading Standards Buy With Confidence.
- **Tier 2, manufacturer approvals and product marks:** Garador approved installer, SWS UK approved installer, Secured by Design (a product accreditation, named only for the door it is on), Sold Secure (a product grade, named only for the lock or door it is on).
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards. Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if something is damaged while the door is being fitted or repaired (the car on the drive, the frame, the brickwork round the opening), with an example that does not suggest carelessness. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. A manufacturer's warranty runs by part (the door, the motor and the finish carry different periods, and a service record can be a condition: Table E), so say what it covers only as [CV: manufacturer_warranty] gives it, with no number of years the client values do not give. | no | Trust |
| faq_3_none | What happens if the door plays up after the work? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what the door is doing and we'll look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. A made to measure door waits on the maker's lead time (Table A: lead times vary, no figure). If same_day_available is yes, say how a door that is stuck or unsafe is handled differently from a planned fitting, without an arrival time unless [CV: response_time] is set. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | Why has my garage door become so heavy to lift? | The springs carry the weight of the door, not the person or the motor; when one breaks or loses its tension the whole weight lands on whoever lifts it (Table B repairs: suddenly heavy, a spring has snapped; Table E springs). What to do until it is looked at, as things to avoid: using the door, running the motor, pulling the release cord with the door up. Spring work is specialist work (Table E): never a word on how to adjust, wind, release or replace a spring or cable. Then what a repair involves, from the Table A repairs stages. | no | Process |
| faq_B | Why does my garage door stop part way or go back up? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words from Table B: something in the way of the safety beam or the door's edge, so the motor does its job and reverses; a roller, track or guide binding so the door cannot run; a motor whose travel limits are set wrong, so it stops short or will not meet the floor. Then what the local housing adds, then the fix from Table A, never a word on turning the motor's force up or bypassing a sensor. | **yes** | Process |
| faq_C (fallback) | Should I repair my garage door or replace it? | The honest test, from Table A repairs and Table B: a door whose panel and its frame are still good but whose springs, cables, rollers or lock have worn is repaired, because every one of those is a replaceable part. A steel panel rusted right through along the bottom edge, timber gone soft at the foot or where the frame stays wet, or a door bent so it cannot run square in its tracks is replaced, because no part puts that right. Say which is which; never push either way. | no | Fit |
| faq_D (fallback) | Can my existing garage door be made electric? | Often, and the door is checked before the motor is chosen: a motor moves a door the springs already balance, it does not lift a heavy one, so the door's condition and balance come first (Table A electric: the door's condition and compatibility surveyed before the drive is picked). What follows from Table A and Table E: the motor matched to the door, the safety devices fitted and tested on the fitted door, a way to open it by hand in a power cut, and the paperwork handed over. Never promise that any door can take a motor; a side hinged door is not assumed to (Table G). No figure, no brand unless [CV: materials_methods] gives it. | no | Process |
| faq_planning (big ticket, only if [CV: handles_planning] confirmed) | Will a replacement garage door need planning permission? | Point at the Table C and Table E planning rows and write what usually applies, with "usually" or "in most cases": a door of similar appearance in the same opening usually needs none; an estate condition that has taken the usual rights away, a conservation area or a listed house can change that; making the opening bigger, or turning the garage into a room, is different work with its own approvals. What the customer does about it only as the row gives it (check with the council where rights are removed). Never an Act's, an order's or a direction's name, never a figure. | no | Process |

Sources for faq_A to faq_D: the pack's section 1 readers (the stuck, the replacement and the upgrade customer) and section 6 question and decision posts, reworded. Replace with real customer questions when Brandon or the client supplies them.

### Type B homepage overrides (faq_slots_by_type)

None: no category in this trade is type B, so the slot is an empty object and the shared slots above apply to every client.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Door types: sectional / roller / up and over (canopy gear) / up and over (retractable gear) / side hinged
- Door materials: steel / aluminium / timber / GRP (fibreglass)
- Insulation and seals: insulated double skinned sectional panels / insulated roller door slats / new perimeter and bottom seals
- Electric operation: motor fitted with a new door / motor fitted to an existing door / safety sensors (photocells) / battery backup / outside emergency release / smartphone control
- Repairs: springs / cables and drums / rollers and tracks / locks and handles / motors, receivers and remotes / bottom seals and weather strips
- Brands fitted: Hörmann / Garador / Novoferm / SWS / Cardale / Birkdale / Gliderol (a brand is named in copy only from this tick)
- Other: old door taken away / frame made good and finished / timber doors primed and finished after fitting / commissioning and conformity documents handed over

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

sectional door, sectional garage door, roller door, roller garage door, up and over door, up and over garage door, side hinged door, side hinged garage door, canopy door, retractable door, insulated garage door, timber garage door, steel garage door, aluminium garage door, GRP garage door, made to measure garage door, electric garage door, automatic garage door, garage door automation, garage door motor, garage door opener, garage door conversion, garage door repair, garage door repairs, garage door servicing, garage door service, spring replacement, cable replacement, roller replacement, track repair, garage door lock, bottom seal, weather seal, remote control, photocell, safety edge, personnel door, side door, front door, entrance door, composite door, roller shutter, security grille, industrial door, commercial door, loading bay door, garage door frame, garage door panel, garden gate

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| customer support | (never named) |
| garage door consultation | (never named) |
| garage door design | made to measure garage doors |
| bespoke | made to measure garage doors |
| general repairs & installation | garage door repairs and fitting |
| opener repair | garage door repairs |
| servicing | garage door servicing |
| sectional | sectional garage doors |
| up and over | up and over garage doors |
| roller garage | roller garage doors |
| side hinged | side hinged garage doors |
| timber garage | timber garage doors |
| steel garage | steel garage doors |
| aluminium garage | aluminium garage doors |
| insulated | insulated garage doors |
| automatic garage | electric garage doors |
| electric garage | electric garage doors |
| automation | electric garage doors |
| motor installation | electric garage doors |
| smart garage | electric garage doors |
| personnel door | personnel and side doors |
| entrance door | front and entrance doors |
| garden gate | garden gates |
| industrial garage | industrial and commercial doors |
| commercial garage | industrial and commercial doors |
| loading bay | industrial and commercial doors |
| roller shutter | roller shutters |
| security grille | roller shutters |
| replacement | new garage doors |
| repair | garage door repairs |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). A card never leads with a specialist service (roller shutters, loading bay doors) unless it is in jobs_wanted. JSON slot: core_services. Priority services (placed before other homepage cards when the client offers them): Garage door repairs.

- Garage door supplier: garage door repairs, new garage doors, sectional garage doors, roller garage doors, up and over garage doors, electric garage doors

Service words for the whole job rather than one service: garage doors, new garage doors, garage door replacement, garage door fitting, garage door repairs, garage door servicing. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: garage door repairs. When an FAQ question names the job as well as the problem ("Can a roller door that jams be repaired?"), it goes to the job's page, not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches). The briefs below name the practice key a line depends on (price_agreed_before_work, photos_of_faults, written_quote, site_visit_before_quote); a ticked practice counts as confirmed for the validator and the claims reviewer alike. Whether the old door is taken away has no practice key yet: the briefs say "only from the confirmed practices" and name nothing.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every garage door client for:
- a "from" price for 3 typical jobs (e.g. a sectional door fitted, an electric conversion, a spring replacement);
- a typical duration for the same 3 jobs, and the maker's lead time on a made to measure door;
- whether quotes are written, and whether the price is fixed once agreed;
- whether they take emergency call outs, their hours, and any call out or out of hours charge;
- whether the old door is taken away, and whether they are registered to carry it;
- which brands they fit, and which manufacturer warranties they pass on, by part.

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Doors Fitted to the Opening You Have**
2. Cover → **Covered If Something Goes Wrong**

## Business type notes (business_type_notes)

One GBP category (Garage door supplier) covers the trade, so every page is type A and `category_types` is empty (Garage Doors Calibration Pack v1, section 2). Urgent against planned is split by page, not by category: the library's emergency column flags Garage door repairs (and the rows that fold into it: opener repairs, servicing), and the emergency variant switches on only when the client confirms call outs; every other page gets the plain briefs. Inside the planned pages the pack's split is carried by the library's `desire_led` column and the card briefs:

- desire led (the customer's situation, never an invented symptom): Sectional, Roller, Side hinged, Timber, Insulated and Made to measure garage doors, Electric garage doors, Front and entrance doors, Personnel and side doors;
- problem led (symptom, cause in the part, consequence): Garage door repairs, Up and over garage doors (most enquiries replace one that has failed), Industrial and commercial doors and Roller shutters (symptoms in daily use, to a site manager);
- urgent against planned (repairs only, and only with the emergency layout on): urgent is a door that won't shut, a broken spring or snapped cable, a door off its track; everything else is planned.

Nothing is a recurring round, so there is no type B. Year round work: `seasonal_trade` is off and there is no seasonal swap.

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": garage door supplier → garage door ("Common Garage Door Problems", "What Affects the Cost of Garage Door Work in [CITY]"). A category with no noun reads "[CAT] Services" and is flagged. The briefs use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

4 Nov 2026, written to the landscaper entry's depth from the calibration pack (sections 1, 2, 4, 7) and the trade facts pack (Tables A to G). Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots. Type A uses the niche steps above. No seasonal swap. Placeholders: `[CAT]`, `[CAT_LOWER]`, `[WORK]`, `[WORK_LOWER]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises. Every figure or rule a brief wants is pointed at the trade facts rows, never written here.

- `seasonal_trade`: no
- `category_types`: none (one category, type A)
- The emergency variant (below) replaces block 4, block 5, the steps and the FAQ slots when the page is flagged emergency in the library and the client confirms call outs.
- A niche with no section here has its category pages refused: "no category block briefs for garage doors".

### Type A (project trade: Garage door supplier, every planned page)

The pack's section 2 split inside type A: desire led doors are written as the customer's situation; the repairs page and a replacement where the old door has failed as symptom, cause, consequence. Block 4 below is a mix: cards 1 and 4 are situations, cards 2 and 3 symptoms, and each brief says which service page it leads to.

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A garage that's no longer just for the car | a door chosen when the garage only held a car | A situation card, not a fault: the garage is a workshop, a gym or a utility room, or there is a bedroom over it or a door from it into the house, and the door is a single skin of steel with a draught round it and daylight under it (Table B insulated: a draught, daylight at the bottom, the garage still feels cold). What decides it: whether the garage sits inside the heated part of the house and whether the opening and the floor are sound enough to seal (Table A insulated: the intended thermal boundary surveyed, perimeter and bottom seals fitted). What the work gives them, in plain words: an insulated door sealed all the way round, and the honest line that the door's insulation on its own does not turn an unheated garage into a warm room (Table E). Link the Insulated garage doors page where LINKABLE PAGES has it. Never a U value or any figure, never a heating bill claim, never a lifestyle pitch. |
| Heavy to lift, or won't stay up | a spring broken or gone slack, so the weight is on you | Problem led: the door takes real effort to raise, drops back when let go, or went suddenly heavy after a bang from the garage (Table B up and over: heavy to lift, drops back; Table B repairs: suddenly heavy, a spring has snapped, a cable hanging loose). The one cause this card makes: the springs carry the door's weight, and one has broken or gone slack, so the weight is on whoever lifts it or on the motor. What the repair involves, from the Table A repairs stages: the fault found, the door secured, a matched spring or cable fitted, the door rebalanced and tested. Spring work is specialist work (Table E): the card never tells the reader how to adjust, wind, release or replace anything, and says only what to avoid: using the door, running the motor. Link the Garage door repairs page. On a plain page this is a planned repair with no promise of speed; the urgent framing belongs to the emergency variant. |
| Rusted through, rotten or twisted | the door itself gone, not a part on it | Problem led, the replacement half of the honest repair or replace test: a steel panel rusted right through along the bottom edge, timber gone soft at the foot with the finish peeling and the wood swelling, a leaf rubbing or a panel scraping, a lock that will not line up because the door no longer sits square (Table B up and over, timber, sectional). The one cause this card makes: the door itself has failed, its panel, leaf or frame, where a repair only replaces parts. What replacing it involves from the Table A stages for the door type: the opening and its clearance surveyed, the old door out, the frame fixed, the new door hung, the gear fitted, the door balanced and tested. Say in the same breath that a sound door with worn springs, cables or rollers is repaired, not replaced (Table A repairs), and push neither. Never a judgement on the age or state of the doors in the area. |
| Nowhere to stand while the door opens | how the door moves as it opens | A situation card: a short drive that ends at the pavement, a car that has to be backed off the drive before the door will open, an opening the car only just clears, nowhere to stand when the door comes out. What decides it: how each kind of door moves, from Table E: an up and over travels outward as it opens and needs clearance in front; a sectional has no outward swing and runs back on tracks under the ceiling; a roller rolls up into a compact box over the opening and leaves the ceiling clear; a side hinged pair opens outward and lets a person in without lifting the whole door. And what the garage has above and beside the opening (Table A survey stages: headroom, guide positions, swing clearance). What the work gives them: the door type whose movement fits their drive and their garage, chosen after measuring, never the best door in general. No headroom or side room figure (Table G: none verified). Never that any door fits any garage. Link the door type page LINKABLE PAGES has. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] Work in [CITY]

| Card | Brief |
|---|---|
| The size of the opening | A larger or non standard opening means a made to measure door rather than a stock size (Table F sectional, roller and made to measure rows). Say it plainly and give no figure. |
| Which door, and what it's made of | Insulated or glazed sections against single skin, timber or GRP against steel, a specialist finish, extra sealing or a security specification (Table F). Name a material only if the trade facts or [CV: materials_methods] give it; a brand only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |
| Electric operation and its safety kit | A motor, the protective devices that go with it, a new electrical circuit where the garage has no supply, and an outside release where the garage has no other way in (Table F electric, sectional, roller). Say why each adds to the job; no figure, no brand unless [CV: materials_methods] gives it. |
| What has to come out or be put right first | The old door and its frame, repairs to the opening or a new frame, structural work where the opening changes (Table F); for a repair, more than one part gone, a spring or part no longer made, damage to the tracks or frame, a tight space to work in (Table F repairs). Say the business looks before it prices, from [CV: quote_method] only. Whether the old door goes with us only from the confirmed practices. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] work cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (the door type and the size of the opening, electric operation, work to the frame or the opening) and how the quote is given, from [CV: quote_method] only. Never a figure from memory. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]: whether repairs are covered as well as new doors only as the scope says. A manufacturer's warranty only from [CV: manufacturer_warranty], and said by part, because the door, the motor and the finish carry different periods and a service record can be a condition (Table E). Described, never promised; never a number of years the client values do not give. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for, with an example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if the door plays up after the work? | Open with what the customer does: tell us what the door is doing and we look at it. Then the reasonable care and skill standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What [WORK_LOWER] work do you take on? | The jobs themselves, named from the card list (the door types fitted, repairs, electric conversions) and the size of job taken on, from the services list and [CV: typical_jobs] only: a single spring or a lock only where typical_jobs says so. Commercial doors and roller shutters only where the services list has them. Link one service page. Never "on this page", "listed above" or "the card list" as words: the reader sees no list, so name the work. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends (what the door is doing or what they want, a photo of the door and the opening from the drive), what the business looks at (the Table A survey stages: the width and height of the opening, the space above it and to each side, the drive, the frame and the gear), what comes back (a written quote only from written_quote). Measuring comes before any door is chosen, written as the way the job is done, never as a boast. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Can you fit a garage door in winter? | Year round, from the Table A timing cells: fitting is not tied to a season, only to safe working conditions on the day; a timber door's priming and finishing follow the coating maker's conditions rather than a month (Table A timber, Table E timber finishing), so the finish may wait for a dry, mild spell. No season is avoided (Table G). Nothing about winter or spring being busy, nothing about booking ahead. No dates, no promise about the weather. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Name the part (spring, cable, roller, track, seal, motor, sensor, lock) and the usual cause in plain words from Table B, what the local housing adds, what to avoid until it is looked at (never a spring or cable instruction, never turning a motor's force up), and what the business does about it from Table A. One figure at most. | Process |

### Type A, emergency variant (Garage door repairs, when the client confirms call outs)

Replaces block 4, block 5, the steps and the FAQ slots; the symptom question stays as above. The reader has a door stuck open, a spring gone or a door off its track now: situation, why it can't wait, what the customer does first (from the Table B and Table E rows, never touching a spring or cable), what happens when they call. Never a response time, round the clock cover or a call out promise unless the client values confirm it. The pack's section 2: only these situations are urgent; a noisy door or a slow remote is a planned repair.

**Block 4, when this can't wait.** H2: When Your Garage Door Can't Wait

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A door that won't shut | nothing left holding the door down | The door stuck up or part open, the car and the tools in view from the road, and where the garage has a door through to the house, the house open too (Table B made to measure row: an unusable opening stays unsecured). The one cause this card makes: the gear that moves the door has failed, so nobody can bring it down and lock it. Table B names what goes: a hanging cable, a spring that has let go, a crooked door (repairs), a motor that will not stop at the floor (electric). Write the reader's situation, the reason it won't keep, and what usually happens when they call: the door brought down and secured by someone trained, never forced, then the repair planned once the part is known (Table A repairs: the fault found and isolated, the door secured). What the customer does meanwhile: stop using it, keep the motor off, keep clear. Never an arrival time, round the clock cover or a call out promise unless [CV: response_time] or [CV: emergency_callouts] confirms it. Never a break in figure. |
| A bang from the garage, and now it won't lift | a spring gone, leaving the door out of balance | A loud bang, then a door that is suddenly heavy or will not move, a gap or a broken coil visible in the spring over the door or beside the track, a motor that hums and gives up (Table B repairs: a spring has snapped, suddenly heavy; Table E springs). The one cause this card makes: a spring has gone, so the door is out of balance and its full weight is loose. Why it can't wait: a door without its balance can move on its own (Table B: a failed counterweight allows uncontrolled movement, said in those plain words) and a motor run against it strains. What the customer does first: leave the door where it is, keep the motor off, never pull the release cord with the door up, keep children and pets away (Table E: spring work is specialist work). What usually happens: the door made safe, a matched spring fitted, the door rebalanced and tested (Table A repairs). Never a how to, never a word about pairs or sizes of spring the rows do not give. |
| Hanging crooked or off its track | one side carrying the door's weight | One side higher than the other, a cable hanging loose or wound off its drum, a roller out of the track, a door jammed part way with the car inside or out (Table B repairs: a cable hanging loose, the door crooked; Table B sectional: it sticks in the tracks, one side sits lower; Table B industrial: it comes off its track). The one cause this card makes: one side of the door is carrying its weight, so every move twists it further. Why it can't wait: using it worsens the damage and a door carried on one cable can drop or jam harder (Table B repairs skipped: continuing use worsens mechanical damage). What the customer does first: stop, do not force it, keep the motor off. What usually happens: the door made safe, the cable and drum or the roller and track put right, the door rebalanced and tested (Table A repairs). Never how to re seat a roller or rewind a cable. |
| What to do while you wait | a door that can move without warning until it is made safe | What the customer can do before anyone arrives, in plain words from the Table B and Table E rows: leave the door where it is, switch the motor off at the wall or unplug it, never pull the red release cord while the door is up, keep children, pets and the car clear of the opening, and never touch the spring, the cable or the drum. Where the garage opens into the house, lock the inside door. If the car is trapped, say so on the call so the right parts come. The one cause this card makes: a door that has lost its balance can move without warning until it has been made safe. Never an instruction to prop, wedge, lift or patch the door; never a time by which anyone arrives unless [CV: response_time] is set. |

**Block 5, what moves the price of a call out.** H2: What Moves the Price of an Emergency Call Out in [CITY]

Every emergency page reads these cards in place of the type A cost cards. They say what moves the price (the time of day, the distance, the access), never an arrival time, hours of cover or a call out charge unless `response_time`, `out_of_hours_available` or `quote_call_out_fee` holds it (the validator's EMERG-PROMISE).

| Card | Brief |
|---|---|
| When you call | The time of day and the day of the week move the price: a door stuck open on a Saturday night against a weekday morning with a car trapped inside (Table A garage door repairs: urgent safety faults arise all year). A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; never say there is no charge for coming out unless [CV: quote_call_out_fee] says there is none. Whether the business comes out at those hours only from [CV: out_of_hours_available]; when it is not set, nothing about hours at all. Say it plainly and give no figure. |
| Getting to the door | How far the garage is from the base, and what it takes to get a van and a ladder to it: a garage down a shared drive, a block of garages behind the houses, a car parked tight against the door, a rural lane (Table F garage door repairs: restricted access). Distance and access move the price; say why in plain words. Never an arrival time unless [CV: response_time] is set; never hours of cover unless [CV: out_of_hours_available] says so. |
| Making the door safe | What is done first on a call out, from Table A garage door repairs: the fault found and isolated, the door and its gear inspected, then the door propped and secured so it cannot drop. What that takes moves the price: a door hanging on one side, a door that has come off its track, a spring under tension, a powered door with a safety fault (Table F garage door repairs: damage to tracks or frame, powered door safety faults; Table E: spring work is specialist). Never how it is done, and never anything for the customer to try on a spring or a cable. Say what decides it and give no figure. |
| The part on the day | What has gone sets the rest: a spring, a cable, a roller or the gear against the motor, and whether more than one part has gone (Table F garage door repairs: multiple damaged components, specialist springs or obsolete parts). Common parts may be on the van, but a part has to suit that door (Table A: replacement parts must suit the specific door; parts availability varies), so whether it is still made matters. When the part has to be ordered the door is left secure, and the fitting follows as a second visit priced as its own job. On a door so old the part no longer exists, say so plainly; a new door is its own quote. A brand only from [CV: materials_methods]. Give no figure. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Call Us.** Brief: what to say: what the door is doing (won't open, won't shut, dropped, went with a bang, hanging to one side, a cable loose), whether the car is in or out, whether the garage has a door through to the house. What to do meanwhile: stop using the door, keep the motor off, never pull the release cord while the door is up, keep clear of it. The number from [CV: phone]. No promise of a reply or an arrival time unless [CV: response_time] is set.
2. **We Make the Door Safe and Show You What's Failed.** Brief: the door secured first (Table A repairs: the fault found and isolated, the door secured), the failed part named in plain words and the customer shown it (photos only from the photos_of_faults practice). The price for making it safe agreed before any work starts only from the price_agreed_before_work practice and [CV: quote_method]. Never restates "free".
3. **We Fix It, or Order the Part and Come Back.** Brief: the compatible part fitted and the door rebalanced and tested on the visit where the part is to hand (Table A repairs); otherwise the door left shut and secure and a date agreed once the part arrives (Table A: parts availability varies). Never promise a same visit fix; "same day" only when [CV: same_day_available] is yes. Never mention the price.

**FAQ slots.** Five before the symptom question: cost, one cover question (insurance, else the fallback), scope, process, timing (the start_time question when it is set, else the first visit question).

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much is an emergency [TRADE_PERSON] call out in [CITY]? | What moves the price, from the cost cards: the time of day and the day of the week, how far the garage is from the base, the access to the door, what making the door safe takes, and that a part that has to be ordered means a second visit priced as its own job (Table A repairs: parts availability varies). A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; the hours the business comes out only from [CV: out_of_hours_available]; an arrival time only from [CV: response_time]. How the price is reached only from [CV: quote_method]; the price agreed before work starts only from the price_agreed_before_work practice. No figure beyond what those values give. | Price |
| cover | insurance | Are you insured for emergency garage door work? | The cover figure from [CV: insurance_cover] and what the cover is for, with an example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What if the door fails again after an emergency repair? | Open with what the customer does: tell us and we look at it. Then that making a door safe is making it safe: the repair that follows is what the work is held to, under the reasonable care and skill standard, never as a defence. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | Is my garage door an emergency, or can it wait? | What counts as urgent, from the card list: a door that will not shut, a snapped spring or cable, a door off its track or hanging to one side, a car trapped in or out. What usually waits for a planned repair, from the Table B rows: a noisy door, a remote that works some of the time, a worn bottom seal, a door that is slow but still runs true. Link one service page. Planned work is never dressed up as urgent. | Fit |
| process | always | What should I do before you arrive? | Leave the door where it is, switch the motor off at the wall or unplug it, never pull the release cord with the door up, keep children, pets and the car clear of the opening, never touch a spring, cable or drum, and lock the door from the garage into the house where there is one (Table B, Table E springs). Never an instruction to prop, wedge, lift or patch the door. Whether the business deals with an insurer only from the client values. | Process |
| timing | start_time | How quickly can you get to me? | From [CV: response_time] and [CV: start_time] only, as given; a same day visit only when [CV: same_day_available] is yes. Never "24/7" or "any time" unless [CV: emergency_callouts] gives it in those words. | Timing |
| timing | always | Can you get a stuck door shut on the first visit? | What usually happens: the door brought down and secured on the visit where that can be done safely, and the repair done there and then where the compatible part is to hand; where it is not, the door is left shut and secure and the part ordered (Table A repairs: parts availability varies). Never promise a same visit fix. No response time, no out of hours promise unless [CV: emergency_callouts] or [CV: response_time] gives it. | Timing |

## Service page blocks by business type (service_page_blocks)

4 Nov 2026. Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (signs you need it) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (A: cost, timing, cover, rules, scope). Type A uses the niche steps; the emergency variant carries its own. A page the library flags `desire_led` reads the desire led variant (below) in place of block 4. The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type A entry serves a sectional door, a roller shutter and a spring repair alike. The pack's section 2 framing (problem led, desire led, urgent) is named in the card briefs. Placeholders: `[SERVICE]`, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for garage doors".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type A (project trade: every planned page)

Three framings share this one entry, per the pack's section 2: a problem led page (Garage door repairs, Up and over garage doors, Industrial and commercial doors, Roller shutters) uses block 4 below as written, each brief saying how it reads on a commercial page; a desire led page (the library's `desire_led` column: Sectional, Roller, Side hinged, Timber, Insulated and Made to measure garage doors, Electric garage doors, Front and entrance doors, Personnel and side doors) swaps block 4 for the desire variant below; the emergency variant wins on the repairs page when the layout is on.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Measuring the opening and what's around it | The survey stage from the trade facts: the width and height of the opening, the space above it and to each side, the swing room on the drive, the guide positions, the state of the frame; on a repair page, the fault found and isolated first. A part of the job, not a promise about the quote. |
| Choosing the door and how it will run | The specifying stage from the trade facts: the door and its track arrangement, canopy or retractable gear, the leaf layout, manual or motor driven; the options from the Table A materials and methods cell or [CV: materials_methods], by their trade name. A brand or named product only from [CV: materials_methods]. |
| Taking the old door out | The removal stage from the trade facts: the old door, its frame and gear out of the opening. Where it goes only from the confirmed practices; otherwise say it is taken away or left as agreed. |
| Fixing the frame, tracks or guides | The fixing stage from the trade facts: the frame fixed to the opening, the tracks, guides, barrel or hood fitted, named as the Table A row for this door names them. No figure unless the rows give one, and never a standard's number. |
| Hanging the door and fitting the gear | The central stage from the trade facts: the sections assembled and hung, the panel hung and its gear fitted, the leaves hung and aligned, the springs, cables and seals fitted, named as the trade names it. On a repair page: the compatible part fitted. |
| Setting it up and testing it | The balancing and testing stage from the trade facts: the door balanced, the travel limits and safety devices set, the operation and the release tested; on an electric page the safety performance tested on the fitted door (Table E: tested after fitting, not in a catalogue). Never a force figure or a test name. |
| Handing over and tidying up | The last stage from the trade facts: the door shown working, instructions and the conformity or commissioning documents handed over where the row gives them, the opening and the drive left clear. What the customer sees when the job is done. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Sticking, scraping or stopping short | rollers, tracks or guides worn or out of line | The things a homeowner notices first, from the Table B signs row for this service, in their words: it sticks in the tracks, the panel scrapes, the slats are bent, it stops before the floor, the leaves catch at the bottom. The one cause this card makes: the running gear (rollers, tracks, guides, hinges) worn or knocked out of line, so the door binds. Then what it leads to if left, from the skipped row: worn running parts impair travel, damaged guides stop it closing. What the job does about it from the Table A repairs stages: inspected, the compatible part fitted, realigned, tested. On an Industrial and commercial doors or Roller shutters page the card is the symptom in daily use (it drops or jerks, a safety edge is damaged, it does not stop when something is in the way, it comes off its track: Table B) and what a door out of use costs the business in plain words, no figure; the duty to keep a workplace door maintained said as what usually applies, never the regulation's name. Not a broken spring: the category page owns that. |
| Daylight, draughts and water under the door | seals and the fit to the floor and frame gone | A draught round the door, daylight at the bottom, a torn seal, the garage colder than it should be, water coming in at a joint (Table B insulated, sectional, timber). The one cause this card makes: the seals and the fit to the floor and frame have gone, so air and rain get past a door that is otherwise sound. What the job does from Table A: new perimeter and bottom seals, the floor and frame fit put right (Table B done badly: a poor floor or frame fit leaves gaps). On a Timber garage doors page the card reads as the finish peeling and the wood swelling, and the priming and finish coats the door's maker asks for after fitting (Table E timber finishing), never a product name the client values do not give. Never a U value, never a promise the garage will be warm (Table E: insulation on its own does not make it so). |
| The motor works but the door doesn't | a safety device, a limit or an unbalanced door stopping the motor | The remote lights up and nothing moves, the door reverses for no reason, it will not meet the floor, it cannot be opened in a power cut (Table B electric, roller). The one cause this card makes: something is stopping the motor, either its own safety devices doing their job (a beam broken, force met on the way down), travel limits set wrong, or a door that has lost its balance, which the motor was never built to lift. What the job does from Table A electric: the door's condition and balance checked, the limits set, the safety performance and the release tested on the fitted door. A power cut: the manual release, and an outside release where the garage has no other way in (Table E manual release). Never tell the reader to turn the force up, bypass a sensor or run the motor against a heavy door; never a spring instruction. Not the spring itself: the category page owns that. |
| A lock that won't line up | a door no longer hanging true in its frame | The lock misses, the bolt will not engage, the latch misses its keep, a leaf blows shut, the closer no longer shuts the door (Table B up and over, side hinged, personnel). The one cause this card makes: the door no longer hangs true in its frame (hinges dropped, stays failed, a frame moved), so the lock cannot meet. Then what it leads to if left, from the skipped row: a door that will not lock, or one that moves in the wind. What the job does from Table A: the door realigned, stays, hinges or closer adjusted, a new lock where the old one has gone. On a Personnel and side doors page where the door is the one between the garage and the house, say that a door that shuts itself and holds back fire usually applies there (Table C), with "usually" and never the rating or the document's name. Never a security rating or grade for the door (Table E: the door type alone proves none). |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| The size of the opening | The size factor from the trade facts price row: a larger, unusual or non standard opening means a made to measure door; a large or heavily used opening on a commercial page. Say it plainly and give no figure. |
| The door's specification | Insulated or glazed sections, timber or GRP against steel, a specialist finish, extra sealing, a security or fire rated specification where the page is a shutter or a personnel door (the trade facts price row for this service). A material only from the rows or [CV: materials_methods]; a brand only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |
| Electric operation and its safety devices | A motor and the protective devices that go with it, a new electrical circuit where the garage has no supply, an outside release where the garage has no other door, more involved controls (the trade facts price row). Say why each adds to the job; no figure, no brand unless [CV: materials_methods] gives it. |
| Work to the opening, and what has to come out | Repairs to the opening, a new frame, structural work where the opening changes, a low ceiling that needs a particular arrangement, a tight space to work in; on a repair page, more than one part gone, a part no longer made, damage to the tracks or frame (the trade facts price row). Say the business looks before it prices, from [CV: quote_method] only. |

**Steps.** The niche steps above (Tell Us About Your Door; We Measure Up and Price the Job, or We Price Your Job without the site visit practice; We Fit It on a Date That Suits You); the emergency variant's steps when the emergency layout is on.

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The cost cards hold the list: never repeat it or point to it. Never a figure from memory. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing cell only: the pack gives no standard duration for any door job (Table G), so say what decides it: whether the door is a stock size or made to measure (the maker's lead time, Table A), work to the opening or the frame, electric operation and its testing; on a repair page, whether the compatible part is to hand (Table A: parts availability varies). No figure. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]: whether repairs are covered as well as new doors only as the scope says. A manufacturer's warranty only from [CV: manufacturer_warranty], said by part because the door, the motor and the finish carry different periods and a service record can be a condition (Table E). Described, never promised; never a number of years the client values do not give. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for, with an example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if the door plays up after the work? | Open with what the customer does: tell us what the door is doing and we look at it. Then the reasonable care and skill standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Do I need permission for [SERVICE_LOWER]? | From the trade facts rule rows only, put as what usually applies, with "usually" or "in most cases". A door of similar appearance in the same opening usually needs no planning application; a listed house, a protected part of town or a condition on the estate that removed the usual rights can change that. Making the opening bigger is structural work the council usually wants to know about. A motor wired to a supply already in the garage is usually not notifiable; a new circuit from the fuse board usually is, or is done by a registered electrician. The door between the garage and the house usually has to shut itself and hold back fire. A front or entrance door is fitted by a registered installer or signed off by the council's inspectors. Never a standard's number, an Act's or a document's name, a figure or legal advice. Where the rows give no rule for the service, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words: the measuring, the door and its gear, the old door out, the fitting, the setting up and testing, the handover. What it does not cover only from the services list, with one sibling service page or the category page linked; where the trade facts row says a repair and a replacement are different scopes, say so and link the other. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Name the part and the usual cause in plain words from Table B, what the local housing adds, what to avoid until it is looked at (never a spring or cable instruction, never turning a motor's force up), and what this service does about it from Table A. One figure at most. | Process |

### Type A, desire led variant (Sectional, Roller, Side hinged, Timber, Insulated and Made to measure garage doors, Electric garage doors, Front and entrance doors, Personnel and side doors)

The library's `desire_led` column flags these page targets (4 Nov 2026); a service page so flagged reads this variant in place of block 4 ("Signs You Need [SERVICE]"). Nobody has symptoms of wanting an insulated door: every card is the customer's situation, what decides whether the work is right for them (the mechanism), and what the work gives them. What's Included, block 5, the steps and the FAQ slots stay as the type A entry above. An emergency page is problem led, so the emergency variant wins over this one. Each brief says which pages the situation leads on. H2: Is [SERVICE] Right for Your Garage?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|
| A short drive, or a tight opening | how much room the door needs to move | The customer's situation: the car has to be backed off the drive before the door will open, the drive ends at the pavement, the opening is one the car only just clears, or the ceiling is low. What decides it: how this door moves and what room that movement needs, from Table E and the Table A survey stages: a sectional rises and runs back on tracks under the ceiling with nothing coming out in front; a roller rolls up into a box over the opening and leaves the ceiling clear; a made to measure door suits an opening no stock size fits. What the work gives them: a door set back behind the brickwork so the opening stays as wide as it was built, and a car parked right up to it. Leads on the Sectional, Roller and Made to measure garage doors pages. No headroom or side room figure (Table G: none verified), never that any door fits any garage, never a fault invented for the old door. |
| A garage you use as a room | whether the garage sits inside the heated house | The customer's situation: the garage is a gym, a workshop, a utility room or an office, there is a bedroom over it, or a door from it leads into the house. What decides it: whether the garage sits inside the heated part of the house, and whether the opening and the floor are sound enough to seal all the way round (Table A insulated: the intended thermal boundary surveyed, perimeter and bottom seals fitted). What the work gives them: an insulated door with its seals, and the honest line that the insulation in the door does not on its own make an unheated garage warm or airtight (Table E). Leads on the Insulated garage doors page, and on the Sectional and Roller pages where the insulated version is the one being chosen. Never a U value or a figure, never a heating bill claim, never a draught invented as the opener. |
| Lifting the door by hand has had its day | whether the door is balanced enough for a motor | The customer's situation: getting out of the car in the rain to open the door, a door that is heavy to lift, no side door into the garage, wanting to open it from the car or the phone. What decides it: whether the door they have is balanced and sound, because a motor moves a door the springs already carry and does not lift a heavy one (Table A electric: the door's condition and compatibility surveyed before the drive is chosen); the power supply (a motor on an existing supply against a new circuit, Table C, with "usually" and no name); a second way in, because a garage with no other door usually needs a release that works from outside (Table E manual release). What the work gives them: a door that opens from the car, with the safety devices fitted and tested on the fitted door (Table E) and the paperwork handed over (Table A). Leads on the Electric garage doors page. Never promise any door can take a motor; a side hinged door is not assumed to (Table G); no brand unless [CV: materials_methods] gives it. |
| A door you walk through, not just drive through | the shape of the opening and what the material asks of you | The customer's situation: bikes, bins and the mower going in and out daily without lifting the whole door, a period house or a street where the doors match, a front door and a garage door the owner wants to go together. What decides it: the shape and size of the opening (Table A made to measure row: the dimensions and the structural opening surveyed first), what the material asks of the owner afterwards (a timber door primed and finished after fitting and refinished in time: Table E timber finishing, Table F), and for a front or entrance door the approvals that come with it (a registered installer or building control, Table C, with "usually" and no name). What the work gives them: a pair of side hinged leaves that open outward so one leaf lets a person in (Table E), a personnel door beside the main door, a timber or made to measure door made for that opening, a front door fitted to the rules that apply, with an honest picture of the finishing a timber door needs. Leads on the Side hinged, Timber and Made to measure garage doors pages, the Personnel and side doors page and the Front and entrance doors page. Never a security rating or grade, never a brand, never a word about the look that the door's movement or material does not earn. |

### Type A, emergency variant (Garage door repairs, when the client confirms call outs)

Replaces block 4, block 5, the steps and the FAQ slots; What's Included and the symptom question stay as above. Every card is one of the urgent situations the pack's section 2 allows (a door stuck open with the car in or out, a snapped spring or cable, a door off its track) with what the customer does first from the Table B and Table E rows, never touching a spring or cable.

**Block 4, when this can't wait.** H2: When [SERVICE] Can't Wait

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The door's up and won't come down | a cable off its drum or a motor stopped mid travel | The door stopped part way or stuck fully open, the car and the tools on show, and where the garage opens into the house, that door exposed too (Table B made to measure row: an unusable opening stays unsecured). The one cause this card makes: a cable come off its drum or a motor stopped mid travel, so the door is held where it stopped and nothing brings it down safely (Table B repairs, electric). Write the reader's situation, the reason it won't keep, and what usually happens when they call: the door brought down by hand by someone trained and secured, never forced, then the part replaced (Table A repairs: the fault isolated, the door secured, the compatible part fitted). What the customer does meanwhile: stop using it, keep the motor off, lock the inside door. Never an arrival time or a call out promise unless [CV: response_time] or [CV: emergency_callouts] confirms it. Never a break in figure. |
| A car trapped behind a door that won't lift | the door's full weight with nothing left to lift it | The door went with a bang and now will not move, or is suddenly far heavier than it was, with the car on the wrong side of it (Table B repairs: a spring has snapped, suddenly heavy; Table E springs). The one cause this card makes: the spring that carried the door has gone, so the door is dead weight with nothing to lift it. Why it can't wait: the weight is now on whoever tries, and a motor run against it strains and can damage the top panel. What the customer does first, from the rows: leave the door where it is, keep the motor off, never pull the release cord with the door up, never touch the spring or the cable, and say on the call that the car is inside so the right parts come. What usually happens: the door made safe, a matched spring fitted, the door rebalanced and tested (Table A repairs). Spring work is specialist work (Table E): never a how to. |
| Off its track, or hanging on one side | a roller out of its track or a cable wound off | One side higher than the other, a roller out of the track, a cable hanging loose, the door jammed at an angle (Table B repairs: a cable hanging loose, the door crooked; Table B sectional: one side sits lower; Table B industrial: it comes off its track). The one cause this card makes: a roller out of its track or a cable wound off, so the door is no longer carried evenly and every move twists it further. Why it can't wait: continuing to use it worsens the damage (Table B repairs skipped). What the customer does first: stop, do not force it, keep the motor off, keep clear. What usually happens: the door made safe, the roller and track or the cable and drum put right, the door rebalanced and tested (Table A repairs). Never how to re seat a roller or rewind a cable. |
| A motor that hums but nothing moves | the motor straining against a door it can't lift | The motor runs or hums, the chain or belt moves, the door stays where it is or lifts a little and drops back (Table B roller: the remote operates but it does not move; Table B electric). The one cause this card makes: the motor is straining against a door it was never built to lift, because the door's balance has gone or something is jammed in its path. Why it can't wait: every press wears the motor's gearing and can push the top panel out of shape, and a door without its balance can move on its own (Table B: a failed counterweight allows uncontrolled movement, said plainly). What the customer does first: stop pressing the button, switch the motor off at the wall or unplug it, never pull the release cord with the door up, keep clear. What usually happens: the door made safe, the cause found in the door before the motor is blamed, the part fitted, the door rebalanced, the motor's limits and safety devices tested (Table A repairs, Table A electric). Never a spring instruction, never a fix for the motor's settings. |

**Block 5, what moves the price of a call out.** H2: What Moves the Price of an Emergency Call Out in [CITY]

Every emergency page reads these cards in place of the type A cost cards. They say what moves the price (the time of day, the distance, the access), never an arrival time, hours of cover or a call out charge unless `response_time`, `out_of_hours_available` or `quote_call_out_fee` holds it (the validator's EMERG-PROMISE).

| Card | Brief |
|---|---|
| When you call | The time of day and the day of the week move the price: a door stuck open on a Saturday night against a weekday morning with a car trapped inside (Table A garage door repairs: urgent safety faults arise all year). A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; never say there is no charge for coming out unless [CV: quote_call_out_fee] says there is none. Whether the business comes out at those hours only from [CV: out_of_hours_available]; when it is not set, nothing about hours at all. Say it plainly and give no figure. |
| Getting to the door | How far the garage is from the base, and what it takes to get a van and a ladder to it: a garage down a shared drive, a block of garages behind the houses, a car parked tight against the door, a rural lane (Table F garage door repairs: restricted access). Distance and access move the price; say why in plain words. Never an arrival time unless [CV: response_time] is set; never hours of cover unless [CV: out_of_hours_available] says so. |
| Making the door safe | What is done first on a call out, from Table A garage door repairs: the fault found and isolated, the door and its gear inspected, then the door propped and secured so it cannot drop. What that takes moves the price: a door hanging on one side, a door that has come off its track, a spring under tension, a powered door with a safety fault (Table F garage door repairs: damage to tracks or frame, powered door safety faults; Table E: spring work is specialist). Never how it is done, and never anything for the customer to try on a spring or a cable. Say what decides it and give no figure. |
| The part on the day | What has gone sets the rest: a spring, a cable, a roller or the gear against the motor, and whether more than one part has gone (Table F garage door repairs: multiple damaged components, specialist springs or obsolete parts). Common parts may be on the van, but a part has to suit that door (Table A: replacement parts must suit the specific door; parts availability varies), so whether it is still made matters. When the part has to be ordered the door is left secure, and the fitting follows as a second visit priced as its own job. On a door so old the part no longer exists, say so plainly; a new door is its own quote. A brand only from [CV: materials_methods]. Give no figure. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Call Us.** Brief: what to say: what the door is doing (won't open, won't shut, dropped, went with a bang, hanging to one side, a cable loose), whether the car is in or out, whether the garage has a door through to the house. What to do meanwhile: stop using the door, keep the motor off, never pull the release cord while the door is up, never touch a spring or cable, keep clear. The number from [CV: phone]. No promise of a reply or an arrival time unless [CV: response_time] is set.
2. **We Make the Door Safe and Find What's Gone.** Brief: the door secured first, then the fault found in the door before the motor is blamed (Table A repairs: the fault found and isolated, the door and its gear inspected); the customer shown what was found, photos only from the photos_of_faults practice. The price for making it safe agreed before any work starts only from the price_agreed_before_work practice and [CV: quote_method]. Never restates "free".
3. **We Agree the Repair and Do It Once It's Safe.** Brief: the repair agreed and done on the visit where the compatible part is to hand, the door rebalanced and tested (Table A repairs); otherwise the door left shut and secure and a date agreed once the part arrives (Table A: parts availability varies). Never promise a same visit fix; "same day" only when [CV: same_day_available] is yes. Never mention the price.

**FAQ slots.** Five before the symptom question: cost, timing (the start_time question when it is set, else the first visit question), one cover question (insurance, else the fallback), process, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much is an emergency [TRADE_PERSON] call out in [CITY]? | What moves the price, from the cost cards: the time of day and the day of the week, how far the garage is from the base, the access to the door, what making the door safe takes, and that a part that has to be ordered means a second visit priced as its own job (Table A repairs: parts availability varies). A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; the hours the business comes out only from [CV: out_of_hours_available]; an arrival time only from [CV: response_time]. How the price is reached only from [CV: quote_method]; the price agreed before work starts only from the price_agreed_before_work practice. No figure beyond what those values give. | Price |
| timing | start_time | How quickly can you get here? | From [CV: response_time] and [CV: start_time] only, as given; a same day visit only when [CV: same_day_available] is yes. Never "24/7" or "any time" unless [CV: emergency_callouts] gives it in those words. This is the one place the timing is written. | Timing |
| timing | always | Can you get my door shut and secure on the first visit? | What usually happens: the door brought down and secured on the visit where that can be done safely, and the repair done there and then where the compatible part is to hand; otherwise the door left shut and secure and the part ordered (Table A repairs: parts availability varies). Never promise a same visit fix. No response time, no out of hours promise unless [CV: emergency_callouts] or [CV: response_time] gives it. This is the one place the timing is written. | Timing |
| cover | insurance | Are you insured for emergency [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for, with an example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What if the door fails again after an emergency repair? | Open with what the customer does: tell us and we look at it. Then that making a door safe is making it safe: the repair that follows is what the work is held to, under the reasonable care and skill standard, never as a defence. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What should I do before you arrive? | Leave the door where it is, switch the motor off at the wall or unplug it, never pull the release cord with the door up, keep children, pets and the car clear of the opening, never touch a spring, cable or drum, lock the door from the garage into the house where there is one, and say on the call whether the car is trapped (Table B, Table E springs). Never an instruction to prop, wedge, lift or patch the door. Whether the business deals with an insurer only from the client values. | Process |
| scope | always | Is this an emergency, or can it wait until a planned visit? | What counts as urgent for this service, from the card list and the Table B signs row: a door that will not shut, a snapped spring or cable, a door off its track or hanging to one side, a motor straining against a door that will not move, a car trapped. What usually waits for a planned repair, from the Table B rows: a noisy door, a remote that works some of the time, a worn bottom seal, a door that is slow but still runs true. Link the planned sibling page or the category page. Planned work is never dressed up as urgent. | Fit |

### Type A, flagged pages with no confirmed call outs (no_callouts)

Copy quality 3, 4 Nov 2026: a page flagged emergency whose client has not confirmed call outs is booked work on the same fault, so block 5 is this set instead of the planned cards. The emergency variant wins when call outs are confirmed.

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| What has failed | One identifiable fault on an otherwise sound door against several damaged components (Table F garage door repairs). Say it plainly and give no figure. |
| Whether the part is still made | A compatible part that is readily available against a specialist spring or a part for a door so old it is no longer made (Table F: specialist springs or obsolete parts). Say when a repair stops being the sensible answer, and never a lifespan. |
| The tracks and the frame | A fault in the moving parts against damage to the tracks or the frame the door runs in (Table F: damage to tracks or frame). Say why that is a bigger job, in plain words. |
| Electric doors and getting to it | A safety fault on a powered door, which has to be put right before it runs again, and a door with restricted access round it (Table F: powered door safety faults, restricted access). Say the business looks before it prices, from [CV: quote_method] only. Code adds the price line from [CV: price_list] when there is one. |

## Location page blocks by business type (location_page_blocks)

4 Nov 2026. Used by the location page job (CORE (18)): block 4 (the problems the town's garages have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the niche steps (no entry of its own). The briefs are town wide, not per category: the pack's section 3 anchors (housing era and what it was built with, drive length and slope, integral garages, lock up blocks behind terraces, coastal or exposed sites) from the town profile, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED). Every anchor must change the work; none may say the town's doors are old, failing or insecure, and no break in figure is ever invented. No seasonal swap and no symptom question on a location page. The type is the client's (`business_type`), never a category override. Placeholders: `[WORK]` the primary category's work noun (Garage Door), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town.

- A niche with no section here has its location pages refused: "no location block briefs for garage doors".

### Type A (project trade: the client's type is A)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Garages built for the cars of their day | openings sized for smaller cars than today's | Rows of single garages on the estates the town profile dates, with openings cut for the cars of the time and up and over doors on most of them. The one cause this card makes: openings sized for smaller cars than people drive now, so today's car only just clears the frame. Tie the era to what the work involves, never to the state of anyone's door: the opening measured before a door is chosen (Table A survey stages), a door set back behind the brickwork so the full width is kept, a made to measure size where no stock door fits (Table F). Never "the original doors are still fitted", never a judgement on the town's doors, never a figure for the opening. |
| Integral garages under the bedrooms | a garage that is part of the heated house | The newer streets the profile gives, built with the garage inside the house, a bedroom over it and a door from it into the hall. The one cause this card makes: a garage that is part of the heated house, so its door is part of the house's outer skin. What that means for the work, in plain words: insulation and seals all the way round count for more (Table A insulated), the lock counts for more, and the door from the garage into the house usually has to shut itself and hold back fire (Table C, "usually", never the rating or the document's name). Never a security rating or grade, never an invented break in figure, never that the door's insulation alone makes the garage warm (Table E). |
| Short drives onto the pavement | the length and fall of the drive | Drives the length of a car, or less, that end at the footpath, and drives that slope down to the garage, where the profile gives the street layout. The one cause this card makes: the length and fall of the drive, which decides how a door may move and how its bottom seal meets the floor. What it means for the work: a short drive favours a door that goes straight up or rolls up, because an up and over travels outward as it opens (Table E); a floor that is not level needs more sealing work at the bottom of the door (Table F insulated: a level floor costs less). Never a figure, never that any door fits any drive. Not the door type choice itself: the service pages own that. |
| Salt air and exposed sites | weather getting at steel, tracks and finishes | Only where the town profile gives the coast, an estuary or open high ground: salt and wind working on steel, tracks and finishes, a door that grinds or sticks sooner than it would inland (Table B: it makes a grinding noise, it sticks in the tracks). The one cause this card makes: weather getting at steel, tracks and finishes. What it means for the work: the finish and material chosen with the exposure in mind, only from the Table A materials cells and [CV: materials_methods], and a timber door's finishing kept up as its maker asks (Table E timber finishing). Where the profile gives no exposure, the card reads instead as the lock up garages in blocks behind the terraces, where the garage is away from the house and the door is left unattended, and what that means for the lock and for getting the old door away. Never a lifespan figure (Table G), never a brand. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] Work in [TOWN]

| Card | Brief |
|---|---|
| Getting to the garage | A garage down a lane behind the terraces, in a block of lock ups, up a shared drive or where there is nowhere to park a van: the door and the old one out are carried further and the work takes longer (Table F: restricted access). The profile says which streets. No figure. |
| Openings that aren't a standard size | Where the housing era the profile gives left openings off today's stock sizes, the door is made to measure and the maker's lead time applies (Table F, and the Table A made to measure row). Say it plainly; no figure; never a judgement on the garages. |
| Conservation areas and listed houses | Where the town has conservation areas, listed houses or an estate whose usual rights have been taken away, a check with the council before anything on the house that faces the street changes adds time (Table C planning, "usually", never the order's or the area's official name). From the dossier rules only; otherwise a planning check as something that sometimes applies. |
| A power supply for an electric door | Where the garage has no power yet, a new circuit from the fuse board is work the council's building control usually has to hear about or a registered electrician signs off (Table C, "usually", never the document's name); a motor wired to a supply already in the garage usually is not. Say why that adds to the job; no figure. |

**Steps.** The niche steps (Tell Us About Your Door; We Measure Up and Price the Job; We Fit It on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] work cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (access, a non standard opening, the power supply for a motor) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. Emergency call outs in the town only when [CV: emergency_callouts] is yes. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]: whether repairs are covered as well as new doors only as the scope says. A manufacturer's warranty only from [CV: manufacturer_warranty], by part (Table E). Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for, with an example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if the door plays up after the work? | Open with what the customer does: tell us what the door is doing and we look at it. Then the reasonable care and skill standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends (what the door is doing or what they want, a photo of the door and the opening from the drive), what the business looks at (the opening measured, the drive, the frame and the gear: the Table A survey stages), what comes back (a written quote only from written_quote). No timescale unless [CV: response_time] is set. | Process |
| timing | always | Do you fit garage doors in [TOWN] through the winter? | Year round, from the Table A timing cells: fitting is not tied to a season, only to safe working on the day; a timber door's finishing follows the coating maker's conditions and may wait for a dry, mild spell (Table A timber, Table E). Where the town profile gives the exposure (a coast, high ground), say what wind does to a fitting day without a promise. Nothing about busy periods or booking ahead. No dates. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

For the client (no client value carries these today, so the briefs say "only from the client values" or "only from the confirmed practices"):
1. Is there a call out charge, and an out of hours surcharge, for emergency work? The cost briefs can only take a figure from price_list.
2. Do they take emergency call outs at all, and in what hours? The emergency variant switches on only from the hand set Emergency primary or the onboarding answer.
3. Is the old door taken away, and are they registered to carry it (Table C waste duty of care)? There is no practice key for it, so the briefs name nothing.
4. Which manufacturer warranties do they pass on, and by part (door, motor, finish)? Table E shows the periods differ by maker and part, and that a service record can be a condition; the cover briefs read manufacturer_warranty as one field.
5. Which brands do they fit? A brand is named only from the materials tick; the words to avoid list carries the brands Table E and G name.
6. Do they fit front and entrance doors and personnel doors in practice (the pack's notes call these a different trade), and do they do commercial doors and shutters? Both are confirm only or services list only in the briefs.
7. Do they convert existing doors to electric, and do they decline a conversion on a door that is not balanced or sound? The desire card and faq_D say the door is checked first; whether the business refuses is a practice nobody has ticked.
8. Do they take small jobs (one spring, a lock, a bottom seal)? The scope brief reads typical_jobs only.

For Ray and the trade facts pack (Table G records most as not found; the briefs give no figure):
9. A duration for any door job, and a typical lead time on a made to measure door: Table A says every one varies.
10. Any headroom or side room figure for a sectional or roller door: Table G says none applies across makers, so the briefs name none and point at the survey.
11. Whether springs are replaced in pairs: the pack's section 6 mentions it as a cost factor, the facts pack does not, so no brief says it.
12. Door type lifespans and a basis for the salt air card: Table G has no lifespan figure and no exposure row; the location card says only that weather gets at steel, tracks and finishes, and reads from the town profile.
13. A plain words row on the manual release cord (when it is safe to pull): the briefs say only never with the door raised, from the pack's safety rule and the Table E manual release row.
14. The pack's header still says verified: no; the service page gate refuses a run until it is verified on the Trade facts screen.

## Alternate Why title that promises a practice (why_title_practice)

"Doors Fitted to the Opening You Have" stands only with a practice no tick confirms, so never by default; otherwise the point reads "Our Track Record".

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| Should I repair my garage door or replace it? | Garage door repairs |
| Can my existing garage door be made electric? | Electric garage doors |
| The motor works but the door doesn't | Electric garage doors; Garage door repairs |
| The size of the opening | Made to measure garage doors |
| Electric operation and its safety devices | Electric garage doors |
| A short drive, or a tight opening | Sectional garage doors; Roller garage doors |
| A garage you use as a room | Insulated garage doors |
| Lifting the door by hand has had its day | Electric garage doors |
| A door you walk through, not just drive through | Personnel and side doors; Side hinged garage doors; Front and entrance doors |
| What has failed | Garage door repairs |
| Whether the part is still made | Garage door repairs |
| The tracks and the frame | Garage door repairs |
| Electric doors and getting to it | Garage door repairs |
| A garage that's no longer just for the car | Insulated garage doors |
| Heavy to lift, or won't stay up | Garage door repairs |
| Nowhere to stand while the door opens | Sectional garage doors; Roller garage doors |
| Electric operation and its safety kit | Electric garage doors |
| Integral garages under the bedrooms | Insulated garage doors |
| Short drives onto the pavement | Sectional garage doors; Roller garage doors |
| Openings that aren't a standard size | Made to measure garage doors |
| A power supply for an electric door | Electric garage doors |

## Idea homes

- **what to do while waiting (leave the door, motor off, never pull the release cord, keep clear, don't touch springs)** (category): home is the 'What should I do before you arrive?' FAQ. Elsewhere: the Call Us step says only what to tell us on the call, and no block 4 card lists the safety steps.
- **a part that has to be ordered: the door is left shut and secure and a return visit is booked** (service): home is the 'We Agree the Repair and Do It Once It's Safe' step. Elsewhere: the 'The part on the day' cost card says only how the part moves the price, the call out FAQ doesn't explain the second visit, and the first visit FAQ covers only bringing the door down.
- **a part that has to be ordered: the door is left shut and secure and a return visit is booked** (category): home is the 'We Fix It, or Order the Part and Come Back' step. Elsewhere: the 'The part on the day' cost card says only how the part moves the price, the call out FAQ doesn't explain the second visit, and the first visit FAQ covers only bringing the door down.
- **the door made safe and secured before anything is replaced** (service): home is the 'We Make the Door Safe and Find What's Gone' step. Elsewhere: the 'Making the door safe' cost card says only what moves the price, and the first visit FAQ doesn't describe the securing.
- **the door made safe and secured before anything is replaced** (category): home is the 'We Make the Door Safe and Show You What's Failed' step. Elsewhere: the 'Making the door safe' cost card says only what moves the price, and the first visit FAQ doesn't describe the securing.
- **the springs carry the door, and a motor only moves a balanced door and never lifts a heavy one** (service): home is the 'Lifting the door by hand has had its day' card. Elsewhere: the snapped spring and humming motor cards name the failed part without explaining spring balance.
- **a garage with a door through to the house left exposed** (service): home is the 'What should I do before you arrive?' FAQ. Elsewhere: the Call Us step only asks whether there is such a door, and the door won't shut card doesn't dwell on the house.
- **a garage with a door through to the house left exposed** (category): home is the 'What should I do before you arrive?' FAQ. Elsewhere: the Call Us step only asks whether there is such a door, and the door won't shut card doesn't dwell on the house.

## Related services

The closest other services for each service page, closest first (`related_services`).

| Service | Related |
|---|---|
| garage door repairs | Electric garage doors, Up and over garage doors, Roller garage doors |
| sectional garage doors | Insulated garage doors, Electric garage doors, Made to measure garage doors |
| up and over garage doors | Garage door repairs, Electric garage doors, Made to measure garage doors |
| roller garage doors | Electric garage doors, Insulated garage doors, Roller shutters |
| side hinged garage doors | Timber garage doors, Made to measure garage doors, Personnel and side doors |
| timber garage doors | Side hinged garage doors, Made to measure garage doors, Up and over garage doors |
| insulated garage doors | Sectional garage doors, Roller garage doors, Electric garage doors |
| electric garage doors | Sectional garage doors, Roller garage doors, Garage door repairs |
| personnel and side doors | Front and entrance doors, Side hinged garage doors, Industrial and commercial doors |
| front and entrance doors | Personnel and side doors, Timber garage doors, Made to measure garage doors |
| industrial and commercial doors | Roller shutters, Roller garage doors, Personnel and side doors |
| roller shutters | Industrial and commercial doors, Roller garage doors, Electric garage doors |
| made to measure garage doors | Timber garage doors, Sectional garage doors, Up and over garage doors |
