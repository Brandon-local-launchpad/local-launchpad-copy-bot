# Niche Library Entry: Electrician

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry). Every slot is required; an empty slot stops the run (G-NICHE). Code reads `niche-library/electrician.json`; this file is the same content for people, kept in the same commit.

Business type: **A (project trade)** for both GBP categories (Electrician Calibration Pack v1, section 2: Electrician is A plus emergency, Security System Supplier is A project). Emergency niche: **yes**, per page: the library's emergency column (Emergency electrician, Electrical fault finding and repairs) switches the emergency variant on when the client confirms call outs (the hand set Emergency primary, or the onboarding answer). The emergency_niche marker is kept but nothing reads it. Desire led pages (the library's desire_led column, 4 Nov 2026) read the desire variant of the service page blocks.

Sources, in order of authority: `calibration-packs/Electrician_Calibration_Pack_v1.md` (sections 1, 2, 4 and 7), `trade-facts/electrician.md` (Tables A to G; the pack is not yet verified), `niche-library/electrician.csv` and `fillout/services/electricians.json`. Every figure or rule a brief wants is pointed at a trade facts row, never written here.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Electrical work / electrical work |
| trade_person / trade_person_plural | electrician / electricians |
| customer_type | homeowners and landlords |
| unit_of_work | jobs |
| emergency_niche | yes (call outs for faults that cannot wait; the emergency column decides the page) |
| big_ticket | yes (full rewires, solar PV and battery storage, consumer unit upgrades) |
| schema_subtype | Electrician (schema.org has an Electrician type) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| lights, sockets, switches, fuse box, fuse board, consumer unit, trip switch, wiring, power, circuit, report, certificate, landlord, tenant, charger, extractor fan, burning smell, flickering, house, home | installation, property, premises, dwelling, accessories, luminaires, energised, isolate, terminations, final circuit, board change, full safety check, pass certificate, fully compliant, up to code, the regs, 18th edition (words_avoid_exceptions: installation: allowed in a page name (EV charger installation, Lighting installation) and in link text to one; in running text say the wiring or the electrics; property: allowed on a landlord or letting page where property is the landlord's own word for the let) | death trap, could kill, kill you, ticking time bomb, accident waiting to happen, disaster waiting to happen, fire waiting to happen, silent killer, deadly, lethal, house fires every year, cowboy electrician (the pack's section 7 fear selling; never anywhere) |

The words to use are the customer's: fuse box and trip switch rather than consumer unit and MCB in running text (consumer unit stays in the list because the page name and the pack's safe action use it). The words to avoid are the trade's own terms and the pack's section 7 failures: "installation" as a noun for the wiring, "full safety check" (name what the test checks instead), "pass certificate" (an EICR records satisfactory or unsatisfactory, Table E), regulation names and editions.

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| final_h2_emergency | Need an Electrician in [CITY] Now? Call [CV: phone] |
| cta_band_line | Tell us what the electrics are doing and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us what the electrics are doing and we'll get back to you. |

## Steps

Standard (type A, every planned page):

1. **Tell Us What You Need.** Brief: How to get in touch and what is useful to send first: what the job is (a report by a date, a new circuit, a fault, a charger), roughly how old the house is if they know, a photo of the fuse board from where they stand. No promise of a reply time unless [CV: response_time] is set. Never an instruction to open a socket, a fitting or the fuse board.
2. **We Look at the Wiring and Price the Job.** (only when the `site_visit_before_quote` practice is confirmed) Brief: The visit and what gets looked at: the fuse board, the earthing and bonding, the circuits the job touches and the routes the cable would take, access under floors and in the loft (the Table A survey stages). Follows [CV: quote_method]; only say the quote is written if quote_method says so. Testing on the visit only from confirmed practices. Never restates 'free' (FAQ 5 owns it).
   Without the practice (`step_2_no_visit`): **We Price Your Job.** Brief: Say a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it).
3. **We Book a Date and Do the Work.** Brief: The start date is agreed in advance, to suit the customer. What the customer gets at the end: the work tested and the certificate for it, which the Table A rows end every job with; the building control side only where the client values confirm the business is registered to certify its own work. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

Emergency (`steps_emergency`, only when the emergency layout is on: the page is flagged emergency in the library and the client confirms call outs):

1. **Call Us.** Brief: What to say: what is happening, which rooms have lost power, whether anything smells hot or has scorch marks, whether the trip switch goes straight back off. What to do meanwhile, in plain words from the Table B emergency row and the pack's safe basics: turn that circuit off at the fuse box, or the main switch if they cannot tell which, unplug what was on it, keep away from anything scorched or wet. Nothing beyond that: never an instruction to open or touch a fitting or the board. The number from [CV: phone]. No promise of a reply or an arrival time unless [CV: response_time] is set.
2. **We Make It Safe.** Brief: What usually happens on arrival: the fault assessed, the dangerous part switched off or otherwise made safe, the immediate fault found where it can be (the Table A emergency electrician stages). An arrival time only as the business gives it on the call; no window written here unless [CV: response_time] is set. The price for the call out agreed before anyone comes out only from the price_agreed_before_work practice and [CV: quote_method]; a call out charge or an out of hours rate only from [CV: price_list]. Never restates 'free'. 'Same day' only when [CV: same_day_available] is yes; round the clock cover only when [CV: emergency_callouts] or [CV: out_of_hours_available] gives it.
3. **We Fix It, or Book the Repair.** Brief: The fault repaired on the visit where it is found and the part is to hand; otherwise the house left safe with that circuit off and the rest back on, and a date agreed for the fault finding and the permanent repair (Table A: a call out may finish with the wiring made safe rather than fully repaired; Table E: an emergency visit and a full diagnosis can be separate work). The customer told plainly what is off and why (Table B: a circuit left off without a clear handover gets switched back on). Never promise a same visit fix. Never mention the price.

The category and service page emergency variants carry their own three steps (below).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer_warranty → insurance (a maker's warranty on a charger, an alarm or a fitting sits in the middle) |
| fears (in order, one per Why choose us point; the pack's section 1) | 1. a fault they cannot see, heating up behind a socket or in a wall; 2. the price growing once the floorboards are up and the plaster is off; 3. a report or certificate that is not ready by the date the tenant, the buyer or the insurer needs it; 4. work they cannot judge once the walls are made good, and no paperwork to show it was tested |
| fears_by_type | none: every category is type A, so the shared fears apply (the slot is present and empty) |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the current register (Table D). Never padded.

- **Ratings (always first):** Google (needs review_count 5+), Checkatrade, Trustpilot, Which? Trusted Traders.
- **Tier 1, scheme registers and trade bodies:** NICEIC, NAPIT, Registered Competent Person Electrical, TrustMark, ECA (Electrical Contractors' Association).
- **Tier 2, work specific certification:** MCS (solar PV and battery storage), OZEV authorised installer (EV chargers), NSI, SSAIB, BAFE SP203-1 (fire alarms), FIA (Fire Industry Association), CEDIA (smart home and AV).
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards: Ray's call per client. Table D: a scheme logo goes up only after Ray has checked the business and its scope on the current register; an old ELECSA or Stroma logo is not proof of present registration, and a Checkatrade or Which? listing is not proof of scheme registration.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if something is damaged during the job, with a plausible electrical example that does not suggest carelessness (a ceiling opened for a cable run, a floorboard lifted). | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. A maker's warranty on a charger, an alarm or a fitting only from [CV: manufacturer_warranty]; a scheme's work guarantee (Table D: some schemes offer a conditional one) only from the client values, described, never promised. | no | Trust |
| faq_3_none | What happens if something isn't right after the job? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the 'reasonable care and skill' standard every trade works to (the Table C consumer rights row), as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. Urgent faults handled differently only when [CV: same_day_available] or [CV: emergency_callouts] says so. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. A fault finding visit is work, not a quote: say so only where the client values separate the two. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does electrical work take? | No standard duration exists (Table G): give what decides it, in plain words, from the Table A timing cells and the Table F rows: how many circuits, how far the cable has to travel and through what, whether rooms are lived in while the work goes on, and the making good afterwards. A figure only from [CV: typical_jobs]. Say which jobs need the power off for a spell (a board change: the Table A consumer unit timing cell) without a length of time. | no | Timing |
| faq_B | Why does my trip switch keep going off? | Use the assigned symptom's meaning and its linked local issue. Say first that the switch going off is the protection working. Then three genuinely different causes in plain words, from the Table B fault finding row and the pack's cause in the circuit: an appliance that is leaking current to earth, water that has got into a garden socket or an outside light, a screw driven into a cable or a connection that has worked loose and is heating. Then what the local housing adds, then the fix: the circuit tested piece by piece to find it (Table A fault finding). Never tell the reader to hold the switch on or to change the device; never a step that opens the board. | **yes** | Process |
| faq_C (fallback) | Do I need a new fuse box? | Honest first: an older board is not dangerous by its age alone (Table E metal consumer units and rewire scope rows). Then what a newer board adds, in plain words from the Table C RCD row with "usually": protection that cuts the power the instant current leaks where it should not, which old rewireable fuses do not give. Then that a change begins by testing each circuit first, since a new board may reveal faults the old fuses let pass (Table A consumer unit stages, Table E what a change includes). Never a fire statistic, never a test as a route to a sale, never a regulation's name or year. | no | Process |
| faq_D (fallback) | How often should a house have its wiring tested? | Organised by who the home belongs to, from the Table E rows: a rented home on the interval the landlord rules give, or sooner where the last report says so; an owner's home on the interval the owner occupier row recommends, as advice rather than law; a sale, a new tenancy or a change of use as common points to test. The intervals only as the rows state them, never a regulation name. What the report is (a condition report with an overall outcome, not a pass certificate: Table E outcome row). Nothing about this business doing the test unless the services list has the page. | no | Timing |
| faq_planning (big_ticket AND [CV: handles_planning] confirmed) | Does my electrical work need building control sign off? | Point at the Table C building control notification rows and the Table E notification rows and write what usually applies, with "usually" or "in most cases": a new circuit, a new fuse board, or work close to a bath or shower is usually notifiable; a like for like swap or an extra socket on an existing circuit elsewhere usually is not, though it is still tested and certificated. Then the routes: an electrician registered with a scheme certifies their own work and the paperwork follows; otherwise building control is told before the work starts. Which route this business uses only from [CV: materials_methods] (registered to certify its own work) or the client values. Never a regulation's name or number, never a measurement, never scheme membership as this business's practice unless confirmed. | no | Process |

Sources for faq_A to faq_D: the pack's section 1 readers and common People Also Ask questions for electricians in the UK, answered from the trade facts rows. Replace with real customer questions when Brandon or the client supplies them.

### Type B homepage overrides (faq_slots_by_type)

None: no electrical category is type B (nothing is a recurring round; commercial testing and maintenance contracts are written as obligation led type A pages). The slot is present and empty.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`). The Paperwork group carries the scheme tick: "registered to certify our own work" is the only place the copy may say the business notifies building control itself.
- Consumer units: metal consumer unit / RCBOs on every circuit / dual RCD board / surge protection (SPD) / arc fault detection (AFDD)
- Cable routes: chased in and plastered over / surface trunking or conduit / under floors and through voids / making good after cable runs
- Lighting: LED downlights / surface fittings / dimmers / occupancy sensors / photocell or timer controls outdoors
- EV and solar: tethered charger / untethered charger / load management / open PEN protection device / earth rod (TT earthing) / roof mounted solar PV / battery storage
- Alarms and security: mains powered interlinked alarms / radio interlinked alarms / heat alarms / CO alarms / wired intruder alarm / wireless intruder alarm / monitored alarm / wired CCTV / wireless CCTV
- Paperwork: EICR / electrical installation certificate (EIC) / minor works certificate / PAT register and labels / registered to certify our own work (competent person scheme)
- Other: old boards and cable taken away / dust sheets and floors covered

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

rewiring, rewire, partial rewire, consumer unit, fuse board, fuse box, RCD, RCBO, EICR, EIC, minor works certificate, electrical testing, PAT testing, Part P, earthing, bonding, first fix, second fix, downlights, LED lighting, extractor fan, EV charger, solar PV, battery storage, smoke alarm, heat alarm, CO alarm, fire alarm, emergency lighting, intruder alarm, burglar alarm, CCTV, door entry, access control, data cabling, network cabling, smart home, home cinema, electric shower, cooker circuit, outdoor sockets, garden lighting, fault finding, trip switch, surge protection, three phase, landlord certificate, landlord electrical safety certificate, commercial electrical work, emergency electrician

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. The bare words (installation, general repairs) sit last so a specific row wins first.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used. The first row whose text appears in the GBP name wins, so the bare words (installation, repairs) sit last.

| GBP name contains | Say |
|---|---|
| general construction | (never named) |
| electrical parts assembly | (never named) |
| remodelling | (never named) |
| heat resistor | (never named) |
| ground wire | (never named) |
| technical support | (never named) |
| general alarm installation | intruder alarms |
| security system installation | intruder alarms |
| intruder alarm | intruder alarms |
| electric car charger | EV charger installation |
| electric vehicle | EV charger installation |
| electrical fixture installation | lighting installation |
| light fixture installation | lighting installation |
| light fixture repair | lighting repairs |
| led lighting | LED lighting upgrades |
| smart lighting | smart home installation |
| electrical wiring installation | rewiring |
| partial rewire | rewiring |
| electrical wiring repair | electrical fault finding and repairs |
| fuse changing | consumer unit upgrades |
| electrical panel | consumer unit upgrades |
| consumer unit | consumer unit upgrades |
| landlord | landlord electrical certificates |
| electrical inspections | EICR and electrical testing |
| eicr | EICR and electrical testing |
| pat testing | PAT testing |
| fan installation | extractor fan installation |
| fan repair | extractor fan repairs |
| outdoor lighting | garden and outdoor lighting |
| garden power | garden and outdoor lighting |
| outdoor socket | garden and outdoor lighting |
| socket and switch | sockets and switches |
| power restoration | emergency electrician |
| security cameras | CCTV installation |
| cctv | CCTV installation |
| smoke alarm | smoke and heat alarms |
| heat alarm | smoke and heat alarms |
| emergency lighting | emergency lighting |
| fire alarm | fire alarm systems |
| access control | access control and door entry |
| door entry | access control and door entry |
| smart home | smart home installation |
| home automation | smart home installation |
| smart heating | smart home installation |
| home cinema | home cinema and audio visual |
| audio visual | home cinema and audio visual |
| multi-room audio | home cinema and audio visual |
| data cabling | data and network cabling |
| network cabling | data and network cabling |
| wi-fi | data and network cabling |
| commercial electrical | commercial electrical work |
| three-phase | commercial electrical work |
| temporary site | commercial electrical work |
| electric shower | electric shower installation |
| cooker | cooker and hob installation |
| hob | cooker and hob installation |
| solar | solar PV and battery storage |
| battery storage | solar PV and battery storage |
| general repairs | electrical repairs |
| installation | (never named) |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). JSON slot: core_services.

- Electrician: electrical fault finding and repairs, consumer unit upgrades, rewiring, EICR and electrical testing, lighting installation, sockets and switches
- Security System Supplier: CCTV installation, intruder alarms, access control and door entry

Service words for the whole trade rather than one service: electrical work, electrics, electrical repairs, electrical testing, electrician, electrical installation. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: fault finding, emergency electrician, electrical repairs. When an FAQ question names the job as well as the problem ("Does a new fuse board stop the trips?"), it goes to the job's page (consumer unit upgrades), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches; none is electrician only yet). The briefs here name the shared keys a line depends on: price_agreed_before_work (the call out price and the quote), extra_work_agreed_first (what the testing finds), property_protected (dust sheets and floors), waste_removal (old boards and cable taken away), site_visit_before_quote (step 2). Practices this trade would want and does not have yet are listed under "What the sources lacked".

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures (Table G: no standard durations exist). Ask every electrical client for:
- a "from" price for 3 typical jobs (a condition report on a three bed house, a fuse board change, an EV charger) and any call out charge or out of hours rate (price_list);
- a typical duration for the same 3 jobs (typical_jobs);
- whether quotes are written, and whether the price is fixed once agreed;
- which scheme the business is registered with, and whether it certifies its own work (a materials tick today; Ray checks the register before a logo goes up);
- whether they take emergency call outs, at what hours, and whether a same day visit is realistic (emergency_callouts, out_of_hours_available, same_day_available).

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Tested and Certificated, Every Job**
2. Cover → **Covered If Something Goes Wrong**

## Business type notes (business_type_notes)

Both GBP categories are A (Electrician Calibration Pack v1, section 2: Electrician is A plus emergency, Security System Supplier is A project), so category_types is empty. Urgent against planned is split by page, not by category: the library's emergency column (Emergency electrician, Electrical fault finding and repairs) switches the emergency variant on when the client confirms call outs; every other page gets the plain briefs. Inside the planned pages the pack's three way split is carried in the card briefs: obligation led (who the work is for, what date brings it, what the result is used for; never a symptom) for EICR and electrical testing, Landlord electrical certificates, PAT testing, Smoke and heat alarms, Fire alarm systems and Emergency lighting; problem led (symptom, cause in the circuit, consequence) for Sockets and switches, Consumer unit upgrades, Rewiring and Extractor fan installation; desire led (the customer's situation, never an invented symptom; the library's desire_led column) for EV charger installation, Lighting installation, Garden and outdoor lighting, Smart home installation, Home cinema and audio visual, Data and network cabling, Solar PV and battery storage, Cooker and hob installation, Electric shower installation, CCTV installation, Intruder alarms, Access control and door entry and Commercial electrical work. Rewiring stays problem led (the pack lists it there first; the renovation reading is a line in card 3). Obligation led takes schedule led's place and is written into the type A briefs, not a type of its own. None of the work is a recurring round, so there is no type B. Not a seasonal trade: seasonal_trade is off; the two real timings (outdoor circuits before paving and planting, a rewire before decorating) sit in the desire cards and the timing briefs.

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": electrician → electrical work, security system supplier → security systems. A category with no noun reads "[CAT] Services" and is flagged. The briefs use `[WORK]` and `[WORK_LOWER]` for it. The block 4 H2s are written so the noun reads on both categories ("When to Call Us About Electrical Work", "When to Call Us About Security Systems").

## Category page blocks by business type (category_page_blocks)

4 Nov 2026, written to the landscaper entry's depth from the calibration pack (sections 1, 2, 4, 7) and the trade facts pack (Tables A to G). Used by the category page job (CORE (16)): block 4 and block 5 are an H2 and four card titles with a one line brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots. Type A uses the niche steps above. No seasonal swap (not a seasonal trade). Placeholders: `[CAT]`, `[CAT_LOWER]`, `[WORK]`, `[WORK_LOWER]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises, no regulation names.

- `seasonal_trade`: no
- `category_types`: none (both categories are type A)
- The emergency variant (below) replaces block 4, block 5, the steps and the FAQ slots when the page's cards lead to a page flagged emergency in the library and the client confirms call outs.

### Type A (project trade: Electrician and Security System Supplier, every planned page)

The pack's section 2 split inside type A is carried in the cards: card 1 and card 3 are problem led (symptom, cause in the circuit, consequence), card 2 is obligation led (who the work is for, what date brings it, what the result is used for; never a symptom), card 4 is a situation (the new load, or on a Security System Supplier page the drive or doorway nobody can see). Every brief says how it reads on the other category, so a security page is never briefed on a hot socket.

**Block 4, when to call.** H2: When to Call Us About [WORK]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A trip switch that keeps going off | current leaking to earth from one appliance, fitting or cable | Problem led: the power goes and the switch at the fuse box is down again, once a week or every time the kettle goes on. Say first that the switch going off is the protection doing what it is for. The one cause this card makes: current leaking to earth from one appliance, one fitting or one damaged cable on that circuit (the Table B fault finding row, the pack's cause in the circuit). Say what finding it involves in plain words: the circuit tested piece by piece until the leak shows (Table A fault finding: establish the symptoms and the circuit, inspect and test to locate, repair, retest). What the customer can safely do: leave the switch off and unplug what was on that circuit; never hold it on, never change the device, never open the board. On a Security System Supplier page the card reads as an alarm that goes off for no reason or a camera that keeps dropping out, with the cause in the sensor's position or the set up (Table B intruder alarms and CCTV). Never a fire statistic. |
| A report or certificate you need by a date | a date set by a tenancy, a sale or an insurer, not by the wiring | Obligation led, never a symptom: a landlord with a let coming up for its inspection, a seller whose buyer's solicitor has asked for a report, a business whose insurer wants the alarm and the emergency lights tested with the records to show. The one cause this card makes: a date set by a tenancy, a sale or an insurer, not by the state of the wiring. Say who the test is for and what the result is used for, from the Table C and Table E rows only: the landlord's interval and the time allowed to put faults right as the rows give them, the copies that go to the tenant, the owner's interval as advice; an EICR comes back satisfactory or unsatisfactory and what each code means only as the Table C codes row states it. Then the practical point: a test booked well ahead of the date leaves room for anything it finds. On a Security System Supplier page: the standard a monitoring company or an insurer asks for, from the Table C intruder alarm and Table D rows only; otherwise the card reads as the Electrician's. Never a regulation's name, edition or number; never a test written as the first step to a sale. |
| Scorch marks or a hot smell at a socket or switch | a connection that has worked loose and heats in use | Problem led: a socket warm to the hand, brown marks round a faceplate, a crackle when a switch is used, a plug that sits loose (the Table B sockets and switches row). The one cause this card makes: a connection that has worked loose, so the current heats it every time the circuit is used. Say why it matters without alarm: the heat builds while it is in use, so the sensible step is to turn that circuit off at the fuse box and stop using the socket until it has been opened and tested; nothing beyond that for the reader to do (the pack's safe basics). What the fix usually involves from Table A: the circuit made safe, the connection or the fitting replaced, the circuit tested before it goes back on. On a Security System Supplier page the card reads as the wired side of a system: a power supply or a connection that has worked loose, so a camera drops offline or a door release fails (Table B access control, CCTV). Never 'death trap', never a fire statistic. |
| Adding something the house was never wired for | a new load on a supply and a board sized for the old house | A situation card, not a fault: an electric car on the drive, a gas hob going and an induction one coming in, an electric shower, power to a garden office or a workshop, a loft room with no sockets. The one cause this card makes: a new load or a new circuit asked of a supply, a fuse board and an earth sized for the house as it was. What decides it, from the Table A survey stages and the Table E bonding row: how much the supply has in hand, whether the board has room for another circuit, whether the earthing and bonding are sound before anything is added, and the route the cable takes. What the work gives them in plain words: a circuit of its own with its own protection, tested and certificated. For a charger the network operator is told as the Table C row has it, said without the acronym where the copy can. On a Security System Supplier page the card is the situation that leads to cameras or an alarm: a side gate nobody can see from the kitchen, a drive that delivery vans use, a shop door after closing (Table A CCTV: the views and the positions surveyed first). Never a symptom invented for it, never a charging speed, a grant or a saving unless the client values give it. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How many circuits are involved | More circuits, more sockets, more fittings, more detectors or more cameras move the price more than anything else (the Table F rows for rewiring, consumer units, testing, alarms and CCTV). Say it plainly and give no figure. |
| Getting the cable where it needs to go | A route chased into the wall and plastered over against one run on the surface, floors up and lofts crawled, rooms that are lived in while the work goes on, a trench across the garden (Table F: concealed routes needing opening and making good, occupied rooms, trenching and reinstatement). Say why a hidden route costs more time; name a method only from [CV: materials_methods]. |
| What the testing turns up | Faults already on the circuits, earthing or bonding that has to be brought up to standard before the new work can be certificated, a board whose circuits nobody can identify (Table F consumer units, sockets and shower rows; Table E: changing a board can expose faults already there). Say the business looks before it prices, from [CV: quote_method] only, and that what a test finds is priced as it is found, never as a surprise on the invoice; the extra_work_agreed_first practice only when confirmed. |
| The fittings and protection you choose | A board with a device on every circuit against a shared one, surge protection, a tethered charger against a socket, LED downlights against surface fittings, a monitored alarm against a bell on the wall (the Table A materials cells). Name an option only if the trade facts or [CV: materials_methods] give it. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing (not seasonal: the power interruption).

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (the number of circuits, the cable route, what the testing finds) and how the quote is given, from [CV: quote_method] only. A call out charge only from price_list. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. A maker's warranty on a charger, a board or an alarm only from [CV: manufacturer_warranty]. Described, never promised. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible electrical example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to (Table C). No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What [WORK_LOWER] do you take on? | The jobs themselves, named from the card list (the fault finding, the board changes, the rewires, the reports, the new circuits), and the size of job taken on, from the services list and [CV: typical_jobs] only. Link one service page. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. Commercial or landlord work only where the services list has it. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at (the fuse board, the earthing, the routes: the Table A survey stages), what comes back. No timescale unless [CV: response_time] is set. Never testing on the visit as this business's practice unless confirmed. | Process |
| timing | always | Will the power be off while you work? | From the Table A timing cells only: a fuse board change needs the power off for the job, arranged in advance; an electric shower needs the water and the power off while it is connected; a new circuit or a repair usually means only that circuit off while it is worked on; a condition report needs each circuit reachable and the interruptions agreed first. No length of time (Table G: none is established). Nothing about when the job can start unless [CV: start_time] is set. | Timing |

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| symptom | a symptom tagged with the page | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Put the cause in the circuit, in plain words (a connection heating, current leaking to earth, water in a fitting, a cable damaged, protection the house was built without), from the Table B rows. Then what the local housing adds, said as what homes of that era were built with and may still have, never that they are dangerous (Table E: age alone does not decide a rewire). Then what the business does about it: test to find it, then repair (Table A). What the reader can safely do stops at switching off and unplugging. One figure at most, and only one the facts rows state. | Process |

### Type A, emergency variant (Emergency electrician, Electrical fault finding and repairs, when the client confirms call outs)

Replaces block 4, block 5 (the call out cost set), the steps and the FAQ slots; the symptom question stays as above. The reader has a burning smell, a board that will not reset, a wet fitting or half the house off: the situation, what they do first (the pack's safe basics: switch off, unplug, touch nothing; never a step that opens anything), why it cannot wait, and what happens when they call (Table A emergency electrician). Never a response time, round the clock cover or a call out promise unless the client values confirm it.

**Block 4, when this can't wait.** H2: When the Electrics Can't Wait

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A burning smell or scorch marks you can't place | a connection overheating out of sight | A hot plastic smell with nothing cooking, brown marks spreading round a socket or a switch, a crackle or a spark when something is plugged in, smoke from the fuse board (the Table B emergency row). The one cause this card makes: a connection overheating out of sight, which gets hotter the longer the circuit stays on. What the customer does first, from the pack's safe basics: turn that circuit off at the fuse box, or the main switch if they cannot tell which, unplug what was on it, touch nothing that is scorched, then call. Why it cannot wait: the heat keeps building for as long as the circuit is used. What usually happens when they call, from the Table A emergency stages: the fault assessed, the dangerous part switched off or made safe, the immediate cause found where it can be, the circuit tested before it goes back on. Never an arrival time unless [CV: response_time] is set; round the clock cover only when [CV: emergency_callouts] gives it; never a fire statistic; nothing about smart homes or new work on this card. |
| A trip switch that won't stay on | a fault still live on the circuit the switch is refusing to feed | The power goes, the switch at the fuse box is pushed back up and drops straight down again, or holds for a minute and goes (Table B emergency: sudden loss of power with a tripping breaker). The one cause this card makes: a fault still live on that circuit, which the switch is refusing to feed. What the customer does first: leave it off, unplug everything on that circuit, and if it then holds the fault is in something that was plugged in; if it still will not hold, the fault is in the wiring and the circuit stays off. Never hold it on, never swap the device, never open the board (Table B: putting the power back before the hazard is found puts the hazard back). What usually happens: the circuit tested to find the fault, repaired where it can be, or left off safely with the rest of the house back on and a date for the repair (Table A). Never promise the power back that visit. |
| Water where the electrics are | water bridging live parts inside a fitting | A leak from the bathroom coming through a ceiling light, rain inside an outside light, a flooded garden socket, a splash into a switch (Table B garden lighting: water visible inside a fitting, an outdoor light that trips again and again). The one cause this card makes: water bridging live parts inside a fitting. What the customer does first: turn that circuit off at the fuse box, touch neither the fitting nor its switch while anything is wet, keep the room's lights off until it has been looked at. Why it cannot wait: a wet fitting stays dangerous until it has been dried, opened and tested, and a trip switch that has not gone does not mean it is safe. What usually happens: made safe, the fitting opened and tested once dry, replaced where water has got into it, the route resealed outdoors (Table A fault finding: repair or replace the defective part; Table B: poor sealing admits water). Never a step that opens the fitting for the reader. |
| Power gone in part of the house | one circuit lost while the rest carry on | The lights downstairs are fine and the kitchen sockets are dead, or one floor is dark and nothing at the fuse box looks any different. The one cause this card makes: one circuit lost to a fault, a connection that has failed or a blown fuse on an older board, while the rest carry on. What the customer does first: look whether the lights next door are off too, which points away from the house's own wiring; look at the fuse box without opening it, note which switch is down, and leave it down; unplug what was on that circuit. What usually happens when they call: the affected circuit found and tested (Table A: establish the symptoms and the circuit), the fault repaired on the visit where the part is to hand, or that circuit left off safely with the rest restored and a date agreed (Table A: a call out may end with the wiring made safe rather than fully repaired; Table E emergency versus fault find). Never promise the power back that visit; never a fridge or a freezer promise. |

**Block 5, what moves the price of a call out.** Every card says what moves the price; an arrival time, hours of cover or a call out charge only from the client values named in its brief. H2: What Moves the Price of an Emergency Call Out in [CITY]

| Card | Brief |
|---|---|
| The time and the day you call | The time of day and the day of the week move the price: a weekday afternoon against a late night or a Sunday (Table F: out of hours attendance). Say that plainly and give no figure. A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; never say there is no charge for coming out unless [CV: quote_call_out_fee] says there is none. Whether the business comes out at those hours only from [CV: out_of_hours_available]; when it is blank the card says what the hour does to the price and nothing about which hours are covered. |
| How far we come and how we reach the fault | How far the address is from the base and how easy the job is to reach move the price: a house on a main road with room outside against a flat above a shop, a locked gate, a fuse board in a locked cupboard, wiring reached through a loft, nowhere to park the van (Table F: unsafe access). Say why each adds time and give no figure. Never an arrival time unless [CV: response_time] is set, and then only as given; never hours of cover unless [CV: out_of_hours_available] says so. How far the business travels only from [CV: travel_distance]. |
| Making it safe first | What is done first on this call out and what that takes, from the Table A emergency electrician and fault finding rows: the reported hazard assessed, the dangerous part isolated or otherwise made safe, the immediate fault located where that can be done, the circuit tested. What moves the price: a fault safely found in one place that can be reached against extensive make safe work, several circuits affected or wiring that cannot be reached (the Table F emergency electrician and fault finding rows). Say plainly that a call out may finish with the house made safe rather than fully repaired (Table E: emergency call out versus fault find). Never an instruction to open or touch a fitting or the board. No figure. |
| What's on the van, and what has to be ordered | What is usually on the van against what has to be ordered (the Table F emergency electrician and fault finding rows): a socket, a switch or a protective device replaced on the day where that is practical against a replacement part that has to be ordered or damaged equipment. What follows as a second visit, priced as its own job: the fuller diagnosis and the permanent repair, with the faulty circuit left off and the rest back on meanwhile (Table F: separate later diagnosis and repair). Never promise a same visit fix. Said as what usually happens, never as what this business keeps in stock unless [CV: materials_methods] says so. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Call Us.** Brief: What to say: what is happening, which rooms have lost power, whether anything smells hot or has scorch marks, whether the trip switch goes straight back off. What to do meanwhile, in plain words: turn that circuit off at the fuse box, or the main switch if they cannot tell which, unplug what was on it, keep away from anything scorched or wet. Never an instruction to open or touch a fitting or the board. The number from [CV: phone]. No promise of a reply or an arrival time unless [CV: response_time] is set.
2. **We Make It Safe and Find the Fault.** Brief: The fault assessed, the dangerous part switched off or otherwise made safe, the immediate cause found where it can be (Table A emergency electrician); the customer shown what was found, in plain words. The price for the call out agreed before anyone comes out only from the price_agreed_before_work practice and [CV: quote_method]; a call out charge only from [CV: price_list]. Never restates 'free'.
3. **We Fix It, or Book the Repair.** Brief: The fault repaired on the visit where it is found and the part is to hand; otherwise the house left safe with that circuit off and the rest back on, and a date agreed for the fault finding and the permanent repair (Table A; Table E: an emergency visit and a full diagnosis can be separate work). The customer told what is off and why. Never promise a same visit fix; 'same day' only when [CV: same_day_available] is yes. Never mention the price.

**FAQ slots.** Five before the symptom question: cost, one cover question (insurance, else the fallback), scope, process, timing (the start_time question when it is set, else the out of hours question).

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much is an emergency [TRADE_PERSON] call out in [CITY]? | Open with what moves the price: the time of day and the day, how far the address is from the base, how easy the fault is to reach, and the parts on the day. A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; never say there is no charge for coming out unless [CV: quote_call_out_fee] says there is none. Hours only from [CV: out_of_hours_available]; an arrival time only from [CV: response_time]. How the price is reached only from [CV: quote_method]: making it safe comes first, and the permanent repair is priced once the fault has been found (Table F emergency electrician: separate later diagnosis and repair). The price agreed before work starts only from the price_agreed_before_work practice. No figure beyond what those client values hold. | Price |
| cover | insurance | Are you insured for emergency electrical work? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible electrical example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What if the fault comes back after an emergency visit? | Open with what the customer does: tell us and we look at it. Then that making it safe and finding the fault can be two pieces of work (Table E emergency call out versus fault find): the permanent repair is what the work is held to, under the reasonable care and skill standard, never as a defence. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | Is this an emergency, or can it wait? | What counts as urgent, from the card list and the Table B emergency row: a burning smell, scorching, sparks or smoke, a trip switch that will not stay on, water in a fitting, power lost to part of the house. What usually waits for a planned visit: one light that flickers, a socket that has stopped working with nothing hot about it, a report that is due, an extra socket wanted (Table B rows). Link one service page. Planned work is never dressed up as urgent. | Fit |
| process | always | What should I do before you arrive? | The safe basics only, from the pack and the Table B emergency row: turn the affected circuit off at the fuse box, or the main switch if unsure, unplug what was on it, keep away from anything scorched or wet, keep children and pets out of the room. Never an instruction to open a socket, a fitting or the board, to hold a switch on or to test anything. Nothing about the insurer unless the client values give it. | Process |
| timing | start_time | How quickly can you get to me? | From [CV: response_time] and [CV: start_time] only, as given; a same day visit only when [CV: same_day_available] is yes. Never 'round the clock' or 'any time' unless [CV: emergency_callouts] or [CV: out_of_hours_available] gives it in those words. | Timing |
| timing | out_of_hours | Do you come out at night or at the weekend? | Only from [CV: emergency_callouts] and [CV: out_of_hours_available], as given; where neither is set, say what happens when they call during working hours and nothing more. An out of hours rate only from [CV: price_list]. Never a response time unless [CV: response_time] is set. | Timing |

## Service page blocks by business type (service_page_blocks)

4 Nov 2026. Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order) and the role based set below is the fallback when the pack gives fewer than 6 (F-ITEMS-GENERIC); block 4 and block 5 are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (A: cost, timing, cover, rules, scope). The service's own trade facts rows (`trade-facts/pack.js rowsForService`) are the material every brief points at. The type is the parent category's else the client's. Placeholders: `[SERVICE]`, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`. No seasonal swap.

- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).
- The block 4 H2 is "When to Book [SERVICE]" rather than "Signs You Need [SERVICE]", because the obligation led pages (EICR and electrical testing, Landlord electrical certificates, PAT testing, Smoke and heat alarms, Fire alarm systems, Emergency lighting) read this same entry and the pack forbids writing a test as a symptom.

### Type A (project trade: every planned page)

Three framings share this one entry, per the pack's section 2: a problem led page (Sockets and switches, Consumer unit upgrades, Rewiring, Extractor fan installation) uses block 4 as written; an obligation led page reads the "on an obligation led page" line in each brief (the trigger, the date, what the result is used for) and leads on card 2; a desire led page (the library's `desire_led` column) swaps block 4 for the desire variant below.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Finding out what's there first | The survey stage from the trade facts: the existing circuits, the fuse board, the earthing and bonding, the route the cable or the duct will take. A part of the job, not a promise about the quote. |
| Switching the power off safely | The isolation stage from the Table A rows, said as a stage of the job the electrician does, never as a how to for the reader. Which circuits go off and for how long only as the timing cell gives it. |
| Running the cable and fixing the boxes | The first fix stage from the trade facts: cable run or extended, back boxes set, containment fixed, as the rows for this service name it. Chased in or on the surface only from [CV: materials_methods]. |
| Fitting the sockets, switches, lights or board | The second fix or the main installation stage from the trade facts: the accessories, the fittings, the devices, the board, the fan, the charger, named as the row for this service names them. A named product only from [CV: materials_methods]. |
| Making good where the cable went | The make good stage where the Table A row has one (rewiring, concealed routes): chases filled, boards back down, holes made good. Decorating only where the client values say so; otherwise say it is left ready for decoration. |
| Testing every circuit we've touched | The inspect and test stage every Table A row ends with: each circuit tested before it goes back into use. What the test checks in plain words, from the pack's craft rule: that each circuit disconnects quickly enough when there is a fault and that the protection does what it should. Never a standard's number. |
| The certificate for the work | The last Table A stage: the certificate issued for the work, which one only as the Table E certificate row gives it (a new circuit or a board change gets one kind, a smaller alteration another; a condition report is a report, not a certificate). The building control side only where [CV: materials_methods] or the client values confirm the business certifies its own work. |
| Clearing up and taking the old parts away | Dust sheets down and floors covered only from the property_protected practice; the old board, cable and fittings taken away only from the waste_removal practice (Table C waste duty of care: carrier registration only if [CV: waste_carrier_registered] is yes); otherwise say the work area is left tidy and the old parts dealt with as agreed. |

**Block 4, when to book it.** H2: When to Book [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Something's tripping, flickering or smelling hot | a fault on one circuit that testing has not yet found | Problem led: the signs from the Table B row for this service, in the customer's words (a switch that keeps going, a light that flickers, a socket warm to the hand, a crackle, a hot smell). The one cause this card makes: a fault on one circuit that testing has not yet found. Then what it leads to if left, from the skipped row: specific, never alarming. On an obligation led page (EICR and electrical testing, Landlord electrical certificates, PAT testing, Smoke and heat alarms, Fire alarm systems, Emergency lighting) the card is the thing that brings a test forward rather than a symptom to sell on: a tenant reporting a hot or damaged fitting, an alarm that does not sound when its button is pressed, an exit light that stays dark on test, a frayed flex on an office kettle (the Table B rows for those services), and what the test then records. Never a fire statistic; what the reader does stops at switching off and unplugging. |
| A date you have to meet | a date set by a tenancy, a sale, an insurer or the last report | Obligation led, never a symptom: write who the work is for, what brings the date and what the result is used for, from the Table C and Table E rows only. EICR and electrical testing: a let on the landlord's interval, a sale where the buyer asks, an owner on the recommended interval as advice. Landlord electrical certificates: the copies that go to the tenant and when, the time allowed to put faults right, the written confirmation afterwards, all as the rows state them. PAT testing: no fixed interval; what the equipment is and how it is used decides it (Table C and E PAT rows). Smoke and heat alarms: the landlord's duty by storey and the check at the start of a tenancy; mains linked alarms where building work requires them, never as a blanket rule (Table C rows). Fire alarm systems and Emergency lighting: what the premises' own fire risk assessment calls for and the testing routines, with the records to show (Table C rows). On a problem led page the card is the report that found it: a code on a condition report that has to be put right in the time the row gives, a survey before a sale, an insurer's request. Never a regulation's name, edition or number; never a figure the rows do not state; never a test as a route to a sale. |
| A board or wiring from another era | protection and cable that predate what the circuits carry now | Problem led, said honestly: rewireable fuses and no trip switches, cable with a rubber or lead sheath, old braided flex, a board nobody can read, the signs from the Table B rewiring and consumer unit rows. Say first that an older board or older cable is not dangerous by its age alone (Table E metal consumer units, RCDs in existing houses and rewire scope rows; Table G: no rewire age exists). The one cause this card makes: protection and cable that predate what the circuits are asked to carry now. Then what a newer board adds, from the Table C RCD row with 'usually', and why a change begins by testing each circuit first (Table A consumer unit: test before change; Table E: a new board may reveal faults the old fuses let pass). Consumer unit upgrades reads it as the board; Rewiring as the cable, and on a renovation as the situation (the floors up and the plaster off, the one time a rewire costs least in disruption: the pack's timing) rather than a fault; Sockets and switches as the fittings. Never 'death trap', never a fire statistic, never a regulation's year. |
| Damp, steam or rain getting to the electrics | moisture reaching a fitting, duct or connection never made for it | Problem led: a bathroom mirror that stays steamed up and black mould in the corners, a fan that runs but moves little air, an outside light that trips after rain, water inside a garden fitting, a shower isolator that feels hot (the Table B extractor fan, garden lighting and electric shower rows). The one cause this card makes: moisture reaching a fitting, a duct or a connection that was never made for it. Say what the job does about it from the Table A rows: a fan and duct chosen for the room and the airflow checked when it is finished (Table B done badly: a long or kinked duct and an uninsulated duct through a cold loft are the usual faults), outdoor rated fittings on a protected route, a bathroom circuit with the protection the location needs. Extractor fan installation leads on this card; Sockets and switches and Rewiring read it as the wet rooms. On an obligation led page damp is what the report records, not a reason to sell work. Never a flow rate or a zone measurement (Table C gives them; the copy does not). |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much there is to do | The size factor from the Table F row for this service: the number of circuits, points, fittings, detectors, cameras or items to test. Say it plainly and give no figure. |
| Where the cable has to go | The route from the Table F row: chased in and made good against on the surface, floors and lofts, a trench outdoors, an occupied home against an empty one, historic plaster that cannot be cut (Table C listed building row, with 'usually'). Say why a hidden route costs more time. |
| What the testing turns up | Faults already on the circuits, earthing or bonding that has to be put right first, a board whose circuits cannot be identified, missing paperwork from the last job (the Table F rows; Table E: changing a board can expose faults already present). Say the business looks before it prices, from [CV: quote_method] only; extra work agreed before it is done only from the extra_work_agreed_first practice. |
| The kit you choose | The options from the Table A materials cell for this service and [CV: materials_methods], and why one costs more than another: a device per circuit, surge protection, a tethered charger, recessed against surface fittings, a monitored alarm, wired against wireless cameras. A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us What You Need; We Look at the Wiring and Price the Job, or We Price Your Job without the site visit practice; We Book a Date and Do the Work); the emergency steps when the emergency layout is on.

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The cost cards hold the list: never repeat it or point to it. | Price |
| timing | always | How long does [SERVICE_LOWER] take, and will the power be off? | From the Table A timing cell for this service only: no standard duration exists (Table G), so give what decides it (the number of circuits, the route, access, rooms in use) and whether the power, or the water as well, has to go off and that it is arranged first, as the cell says. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. A maker's warranty on the charger, the board, the fan or the alarm only from [CV: manufacturer_warranty]. Described, never promised. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to (Table C). No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Does [SERVICE_LOWER] need to be notified or signed off? | From the Table C and Table E rule rows for this service only, put as what usually applies, with 'usually' or 'in most cases': a new circuit, a new fuse board or work close to a bath or shower is usually notifiable and a like for like swap usually is not, though it is still tested and certificated; a registered electrician certifies their own work, otherwise building control is told before the work starts; which route this business uses only from the client values. On an EV charger, solar or outdoor page the row is the planning one (usually permitted, with conditions; a listed home or a conservation area is different) and the network operator being told; on a camera page the data protection row (cameras that take in the street or next door bring duties for the owner); on an alarm or emergency lighting page the fire risk assessment row. On a testing page: what the report is and who gets a copy (Table E rows), never 'pass certificate'. Never a regulation's name, number or year, never a measurement, never legal advice. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words, naming the work itself. What it does not cover only from the services list (a report is not a repair; making safe is not the permanent fix: Table E), with one sibling service page or the category page linked. | Fit |

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| symptom | a symptom tagged with the page | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Put the cause in the circuit, in plain words, from the Table B row for this service. Then what the local housing adds, said as what homes of that era were built with, never that they are dangerous. Then what this service does about it (Table A). What the reader can safely do stops at switching off and unplugging. One figure at most, and only one the facts rows state. | Process |

### Type A, desire led variant (EV charger installation, Lighting installation, Garden and outdoor lighting, Smart home installation, Home cinema and audio visual, Data and network cabling, Solar PV and battery storage, Cooker and hob installation, Electric shower installation, CCTV installation, Intruder alarms, Access control and door entry, Commercial electrical work)

The library's `desire_led` column flags these thirteen page targets (4 Nov 2026); a service page so flagged reads this variant in place of block 4. Nobody has symptoms of wanting an EV charger: every card is the customer's situation, what decides whether the work is right for them (the mechanism), and what the work gives them. What's Included, block 5, the steps and the FAQ slots stay as the type A entry above (the rules brief says how a charger, solar or camera page reads it). An emergency page is problem led, so the emergency variant wins over this one. Each brief says which pages the situation leads on.

**Block 4, is it right for you.** H2: Is [SERVICE] Right for You?

| Card (the situation) | What decides it (mechanism) | Brief |
|---|---|---|
| A new load the house was never wired for | whether the supply, the board and the earthing can take another circuit | The customer's situation: an electric car charged from an extension lead, a gas hob going and an induction one coming, an electric shower where there was a mixer, a garden office that needs power, or a roof that could be making the house its own electricity. What decides it, from the Table A survey stages: how much the supply has in hand, whether the fuse board has room for another circuit, whether the earthing is sound for the job (outdoors and for a charger the earthing is checked and sometimes improved, as the Table C EV row has it, said without the terms), the route the cable takes to where it is needed, and for a charger or solar whether the network operator is told before or after, as the Table C rows state. What the work gives them: a circuit of its own, with its own protection, tested and certificated, so the charger, the shower or the hob is not sharing with the kettle. Leads on EV charger installation, Electric shower installation, Cooker and hob installation and Solar PV and battery storage; garden power on Garden and outdoor lighting. Never a fault invented for it; never a charging speed, a grant, a saving or a payback unless the client values or the Table E rows give it; where a battery sits only as a system specific decision (Table E battery row). |
| Light where you need it, switched where you stand | where the fittings and the switching go, and what the ceiling or the ground allows | The customer's situation: a kitchen worktop in its own shadow, a landing with one switch at the bottom of the stairs, a back door that opens onto a dark path, a drive with no light at the gate, a workshop lit by one bulb. What decides it, from the Table A lighting and garden lighting rows: whether the existing circuit can take the extra fittings, whether the ceiling can be got into for recessed lights, where the switches and sensors should go, outdoors the route for the cable and a safe way to run it, the controls (a sensor, a timer, a dusk switch), and the state of the decoration, since lighting work and ceilings go together (the Table A timing cell). The pack's timing: outdoor circuits go in most easily before paving and planting. What the work gives them: light placed for the job, switched from where they stand, fittings made for outside where they are outside. Leads on Lighting installation and Garden and outdoor lighting. Never a flickering light as the opener (the fault pages own it), never an energy figure, never a product name unless [CV: materials_methods] gives it. |
| Knowing who's at the door and what's happening while you're out | what the cameras and sensors need to see, and where the signal goes | The customer's situation: a side gate that cannot be seen from the kitchen, a drive the delivery vans use, a front door an older parent would like to answer from a phone, a shop or a yard after closing, a building where the keys keep going missing. What decides it, from the Table A CCTV, intruder alarm and access control rows: what the cameras or sensors need to see and from where, what the camera would take in beyond the boundary (the Table C data protection row: cameras that cover the street or next door bring duties for the owner, said plainly), wired or wireless, whether anybody is meant to respond (a bell on the wall against a monitored system; a police response only on the route the Table C intruder row gives, never promised), and for door entry the door's own hardware and the fire escape it must not block. What the work gives them: a picture they can read at night, a recording that is kept, an alarm set up so it does not cry wolf, a door they can answer from wherever they are. Leads on CCTV installation, Intruder alarms and Access control and door entry; a camera or a lock on a phone also on Smart home installation. Never 'deters burglars', never a crime figure, never a police response as a promise. |
| Wiring for the way you live and work now | the routes the cable can take while the walls and floors are open | The customer's situation: a home office at the far end of the house where the Wi-Fi fades, a television going on a wall with nowhere for the leads, speakers wanted in more than one room, lights and heating they would like to run from one place, a shop or office being fitted out, a renovation with the plaster off. What decides it, from the Table A data cabling, home cinema, smart home and commercial rows: the routes the cable can take and whether they are open now (concealed routes need doing before decoration: the pack's timing, a rewire or a cable run costs least in disruption before the decorating and the flooring go in), what the equipment needs where it sits, how the new system talks to what is already there, and on a commercial job the shutdown windows and the hours the place is in use. What the work gives them: outlets where the devices are, links tested and labelled, controls that still work by hand when the network drops (Table B smart home: controlled functions fail when communications fail), and a hand over of how it all works. Leads on Data and network cabling, Home cinema and audio visual, Smart home installation and Commercial electrical work as a fit out. Never a dropped connection as the opener, never a speed or a figure, never a product name unless [CV: materials_methods] gives it. |

### Type A, emergency variant (Emergency electrician, Electrical fault finding and repairs, when the client confirms call outs)

Replaces block 4, block 5 (the call out cost set), the steps and the FAQ slots; What's Included and the symptom question stay as above. The mechanisms differ from the category page's emergency cards on purpose. Each card says which urgent page it leads on.

**Block 4, when this can't wait.** H2: When [SERVICE] Can't Wait

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A socket or switch that's hot to the touch | a loose terminal arcing under load | A faceplate warm under the hand, a plug that comes out brown, a crackle when the switch goes on, a smell of hot plastic nobody can place (the Table B sockets and switches and emergency rows). The one cause this card makes: a loose terminal arcing under load, which burns a little more each time the circuit is used. What the customer does first: turn that circuit off at the fuse box, unplug whatever was in it, touch nothing scorched, then call. Why it cannot wait: the damage grows while the power is on (Table B: continued use of the faulty circuit can cause shock or fire, said once and plainly). What usually happens on the visit: made safe, the connection or the fitting replaced, the circuit tested before it goes back on (Table A fault finding). Leads on the fault finding page; Emergency electrician reads it as the fuse board itself warm or smelling. Never an arrival time unless [CV: response_time] is set; never a fire statistic. |
| A fuse board that trips again as soon as it's reset | the protection refusing to feed a fault it has found | The main switch or one trip drops the moment it is pushed up, or every time one thing is switched on (Table B: sudden loss of power with a tripping breaker). The one cause this card makes: the protection doing exactly what it is for, refusing to feed a fault it has found. What the customer does first: leave the switch down, unplug everything on that circuit, try it once more; if it holds, the fault was in something plugged in and that thing stays unplugged; if it drops again, the circuit stays off and they call. Never hold it on, never change the device for a bigger one, never open the board (Table B: restoring supply before the hazard is identified puts the hazard back). What usually happens: the circuit tested to find the fault, repaired where it can be, otherwise left off with the rest of the house running and a date for the repair (Table A). Leads on both urgent pages. Never promise the power back that visit. |
| A light fitting or outside socket that's got wet | moisture tracking across the terminals | Water dripping from a ceiling rose after a bath overflowed, rain inside a porch light, a garden socket under a puddle, a fitting that trips every time it rains (the Table B garden lighting row: water visible inside the fitting, an outdoor light that keeps tripping). The one cause this card makes: moisture tracking across the terminals, which a trip switch may or may not catch. What the customer does first: turn that circuit off at the fuse box, leave the fitting and its switch alone while anything is wet, and keep the room's lights off until it has been looked at. Why it cannot wait: the fitting stays dangerous until it has dried, been opened and tested. What usually happens: made safe, the fitting opened and tested once dry, replaced where water has got in, the seal or the route put right outdoors so it does not happen again (Table A; Table B done badly: poor sealing admits water). Leads on both urgent pages. Never a step that opens the fitting for the reader. |
| Made safe tonight, fixed on a date | a repair that needs a part or a floor up | The honest card: what a call out can and cannot finish. The one cause this card makes: a repair that needs a part that is not on the van, or a cable under a floor that cannot be reached tonight. What usually happens, from the Table A emergency row and the Table E emergency versus fault find row: the danger removed and the faulty circuit switched off, the rest of the house back on where it safely can be, the customer told exactly what is off and why (Table B: a circuit left off without a clear handover gets switched back on), and the fault finding and the permanent repair booked for a date; where the fault is found and the part is to hand, fixed there and then. Leads on Emergency electrician; the fault finding page reads it as the visit that follows the call out. Never promise a same visit fix; 'same day' only when [CV: same_day_available] is yes; what the follow up costs only from [CV: price_list] or [CV: quote_method]. |

**Block 5, what moves the price of a call out.** Every card says what moves the price; an arrival time, hours of cover or a call out charge only from the client values named in its brief. H2: What Moves the Price of an Emergency Call Out in [CITY]

| Card | Brief |
|---|---|
| The time and the day you call | The time of day and the day of the week move the price: a weekday afternoon against a late night or a Sunday (Table F: out of hours attendance). Say that plainly and give no figure. A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; never say there is no charge for coming out unless [CV: quote_call_out_fee] says there is none. Whether the business comes out at those hours only from [CV: out_of_hours_available]; when it is blank the card says what the hour does to the price and nothing about which hours are covered. |
| How far we come and how we reach the fault | How far the address is from the base and how easy the job is to reach move the price: a house on a main road with room outside against a flat above a shop, a locked gate, a fuse board in a locked cupboard, wiring reached through a loft, nowhere to park the van (Table F: unsafe access). Say why each adds time and give no figure. Never an arrival time unless [CV: response_time] is set, and then only as given; never hours of cover unless [CV: out_of_hours_available] says so. How far the business travels only from [CV: travel_distance]. |
| Making it safe first | What is done first on this call out and what that takes, from the Table A row for this page: the reported hazard assessed, the dangerous part isolated or otherwise made safe, the immediate fault located where that can be done, the circuit tested. What moves the price: a fault safely found in one place that can be reached against extensive make safe work, several circuits affected or wiring that cannot be reached (Table F for this service). Say plainly that a call out may finish with the house made safe rather than fully repaired (Table E: emergency call out versus fault find). Never an instruction to open or touch a fitting or the board. No figure. |
| What's on the van, and what has to be ordered | What is usually on the van against what has to be ordered (Table F for this service): a socket, a switch or a protective device replaced on the day where that is practical against a replacement part that has to be ordered or damaged equipment. What follows as a second visit, priced as its own job: the fuller diagnosis and the permanent repair, with the faulty circuit left off and the rest back on meanwhile (Table F: separate later diagnosis and repair). Never promise a same visit fix. Said as what usually happens, never as what this business keeps in stock unless [CV: materials_methods] says so. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Call Us.** Brief: What to say: what is happening, which rooms have lost power, whether anything smells hot or has scorch marks, whether the trip switch goes straight back off. What to do meanwhile, in plain words: turn that circuit off at the fuse box, or the main switch if they cannot tell which, unplug what was on it, keep away from anything scorched or wet. Never an instruction to open or touch a fitting or the board. The number from [CV: phone]. No promise of a reply or an arrival time unless [CV: response_time] is set.
2. **We Make It Safe and Find the Fault.** Brief: The fault assessed, the dangerous part switched off or otherwise made safe, the immediate cause found where it can be, the circuit tested (Table A emergency electrician and fault finding); the customer shown what was found, in plain words. The price for the call out agreed before anyone comes out only from the price_agreed_before_work practice and [CV: quote_method]; a call out charge only from [CV: price_list]. Never restates 'free'.
3. **We Repair It, or Book the Repair.** Brief: The fault repaired on the visit where it is found and the part is to hand; otherwise the house left safe with that circuit off and the rest back on, and a date agreed for the permanent repair (Table A; Table E: an emergency visit and a full diagnosis can be separate work). Never promise a same visit fix; 'same day' only when [CV: same_day_available] is yes. Never mention the price.

**FAQ slots.** Five before the symptom question: cost, timing (the start_time question when it is set, else the out of hours question), one cover question (insurance, else the fallback), process, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much is an emergency [TRADE_PERSON] call out in [CITY]? | Open with what moves the price: the time of day and the day, how far the address is from the base, how easy the fault is to reach, and the parts on the day. A call out charge or an out of hours rate only from [CV: quote_call_out_fee] and [CV: price_list]; never say there is no charge for coming out unless [CV: quote_call_out_fee] says there is none. Hours only from [CV: out_of_hours_available]; an arrival time only from [CV: response_time]. How the price is reached only from [CV: quote_method]: making it safe comes first, and the permanent repair is priced once the fault has been found (Table F for this service). The price agreed before work starts only from the price_agreed_before_work practice. No figure beyond what those client values hold. | Price |
| timing | start_time | How quickly can you get here? | From [CV: response_time] and [CV: start_time] only, as given; a same day visit only when [CV: same_day_available] is yes. Never 'round the clock' or 'any time' unless [CV: emergency_callouts] or [CV: out_of_hours_available] gives it in those words. This is the one place the timing is written. | Timing |
| timing | out_of_hours | Do you come out at night or at the weekend? | Only from [CV: emergency_callouts] and [CV: out_of_hours_available], as given; where neither is set, say what happens when they call during working hours and nothing more. An out of hours rate only from [CV: price_list]. This is the one place the timing is written. | Timing |
| cover | insurance | Are you insured for emergency [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible electrical example that does not suggest carelessness. Never what it pays or who it covers. | Trust |
| cover | always | What if the fault comes back after the visit? | Open with what the customer does: tell us and we look at it. Then that making it safe and finding the fault can be two pieces of work (Table E): the permanent repair is what the work is held to, under the reasonable care and skill standard, never as a defence. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What should I do before you arrive? | The safe basics only: turn the affected circuit off at the fuse box, or the main switch if unsure, unplug what was on it, keep away from anything scorched or wet, keep children and pets out of the room, have the fuse box reachable (not a cupboard full of coats). Never an instruction to open a socket, a fitting or the board, to hold a switch on or to test anything. | Process |
| scope | always | Is this an emergency, or can it wait? | What counts as urgent for this service, from the card list and the Table B emergency row: a burning smell, scorching, sparks or smoke, a trip that will not stay on, water in a fitting, power lost to part of the house. What usually waits for a planned visit, from the Table B rows: a single light that flickers, a dead socket with nothing hot about it, a report that is due. Link the planned sibling page or the category page. Planned work is never dressed up as urgent. | Fit |

### Type A, flagged pages with no confirmed call outs (no_callouts)

Copy quality 3, 4 Nov 2026: a page flagged emergency whose client has not confirmed call outs is booked work on the same fault, so block 5 is this set instead of the planned cards. The emergency variant wins when call outs are confirmed.

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How hard the fault is to find | A clear defect in one accessory against a fault that comes and goes, or one that touches several circuits (the Table F fault finding row). Say why an intermittent fault takes longer to trace, and give no figure. |
| Reaching the wiring | A socket or a board you can get straight to against cable under a floor or behind a finished wall (Table F: inaccessible wiring). Say the business looks before it prices, from [CV: quote_method] only. |
| Testing, then the repair | The testing that finds the fault and the repair that follows it are two pieces of work, and what the testing shows decides the second (Table F: testing and subsequent repair). Never a repair promised before the fault is found. |
| What has been damaged | An accessory or a length of cable against equipment the fault has damaged, and whether the part has to be ordered (Table F: damaged equipment). A named make only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

## Location page blocks by business type (location_page_blocks)

4 Nov 2026. Used by the location page job (CORE (18)): block 4 (what the town's homes bring across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question). The steps are the niche steps. The briefs are town wide, not per category: the pack's section 3 anchors are housing era and tenure (what homes of that age were built with, the share of lets, parking, overhead supplies, conservation areas), each tied to what it changes in the work, never to the state of anyone's wiring. No seasonal swap and no symptom question. The type is the client's, never a category override. Placeholders: `[WORK]` the primary category's work noun, `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town.

- A niche with no section here has its location pages refused: "no location block briefs for electrician".

### Type A (project trade: the client's type is A)

**Block 4, what the town brings.** H2: What We Get Called to Most in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Homes wired for a different decade | wiring and boards put in with the houses and added to in pieces since | Rewireable fuses in the hall cupboard, two pin sockets behind the wardrobe, one socket a room with an extension lead doing the rest. The one cause this card makes: wiring and boards put in when the houses were built and added to in pieces ever since; the town profile dates the housing. Say what homes of that era were built with and what they may still have (the pack's anchor: cable with a rubber or a lead sheath and rewireable fuses in the older stock, estates wired once and extended since), never that they have it or that they are dangerous or overdue a rewire (Table E: age alone does not decide it). Tie the era to the work: testing before anything is added (Table E bonding row), a board change that starts with every circuit tested (Table A). Not a hot socket, not a tripping switch: the town's category and service pages own those. |
| Lets, shared houses and the inspection cycle | a tenancy calendar that sets the test dates | A landlord with several houses in the same streets, a letting agent with a list of dates, a shared student house with a licence to renew. The one cause this card makes: a tenancy calendar that sets the test dates, not the state of the wiring; the town profile gives the share of rented and shared homes. What it means for the work: condition reports on the interval the Table C landlord row gives, the time allowed to put faults right, the copies to tenants, all only as the rows state them; a licence condition only as the dossier gives it (Table G: licence conditions vary by council, never a national checklist). Never that the town's landlords are behind, never a regulation's name. Not the report itself: the testing pages own what it checks. |
| Terraces with nowhere to park a charger | the gap between the house's supply and where the car stands | An electric car and a front door that opens onto the pavement, a cable across the path, a charger wanted where the only parking is on the street. The one cause this card makes: the gap between the house's supply and where the car actually stands; the town profile gives the street pattern (terraces on street parking, estates with drives). What it means for the work: a drive makes a charger straightforward (Table A EV: supply assessed, the network operator told, the earthing designed), while a charger across a public pavement is not covered by the home permission (Table C permitted development row) and depends on whatever the council allows, said only as the dossier gives it; never a council rule invented. Not the earthing itself: the next card and the EV page own that. |
| Supplies that come in on poles | a supply that arrives on poles and earths at the house | A farmhouse, a cottage at the end of a lane, a row of houses fed from a pole in the field: the town profile says where the supply arrives overhead. The one cause this card makes: a supply that arrives on poles and takes its earth at the house rather than from the network's cable (the pack's anchor). What it means for the work: the earthing tested, and sometimes improved, before a charger, an outdoor circuit or a new board goes in (Table C EV earthing row, Table E bonding row), said in plain words without the terms. Where the town has no rural fringe the card reads as its conservation areas and listed homes instead: a charger, a camera or a light on the front of a listed house needs more thought and sometimes consent (Table C listed building row, 'usually', never the Act's name). Never a judgement on the supply's safety. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Getting cable through an older house | Solid walls that have to be chased and made good, floors that come up in short boards, lofts with no boards at all, plaster that cannot be cut in a listed house (Table F rewiring: concealed routes, making good, protected fabric). Say why that adds time; the town profile says which streets are which. No figure. |
| Flats, shared houses and tenants' diaries | Access arranged round several tenants, a report that needs every circuit reachable and the interruptions agreed first, work in rooms that are lived in (Table F landlord certificates: difficult tenant access; Table A EICR timing cell). Say it plainly, from the profile where it gives the tenure. No figure. |
| The supply the street was given | An older street's supply with less in hand for a charger, a shower or a battery, a long cable run to the board, the network operator's process where the supply has to be looked at first (Table F EV and solar rows: supply upgrade, long run, the application). Said as what the work meets, never as a judgement on the street. No figure. |
| Conservation areas and listed homes | Where the town has conservation areas or listed buildings, a charger, a panel, a camera or a light on a front wall and a new cable route through old plaster can need consent, and some things cannot be done at all (Table C listed building and permitted development rows, 'usually', never the Act's or the area's official name). From the dossier rules only; otherwise consent as something that sometimes applies. No figure. |

**Steps.** The niche steps (Tell Us What You Need; We Look at the Wiring and Price the Job; We Book a Date and Do the Work).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (the age of the house and its cable routes, access in a let, the supply) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. Urgent faults handled differently only when [CV: same_day_available] or [CV: emergency_callouts] says so. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at (the fuse board, the earthing, the routes), what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Will the power be off while you work in my home? | From the Table A timing cells only: a fuse board change needs the power off for the job, arranged in advance; a new circuit or a repair usually means only that circuit off while it is worked on; a condition report needs the circuits reachable and the interruptions agreed first. Where the town profile gives the housing (flats on a shared supply, lets), say what it does to the arrangements. No length of time. Nothing about when the job can start unless [CV: start_time] is set. | Timing |

## Per page overrides (service_overrides)

Copy quality 3, 4 Nov 2026: a page whose job differs from the shared type entry gets its own briefs here, keyed by the page target in lower case. The code lays them over the type entry (and its emergency or desire variant) for that page only. Override steps replace the niche steps whole, so the no visit swap of step 2 does not apply to them: their step 2 briefs take any visit from the site_visit_before_quote practice.

### EICR and electrical testing

**Block 5, cost.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How many circuits and boards | A small house on one board against more circuits or a second distribution board (Table F EICR). Say it plainly and give no figure. |
| What the report finds | The report records what it finds and rates the installation satisfactory or unsatisfactory; it is not a pass certificate (Table E). What the codes mean only as Table E has them, in plain words. Remedial work and any further investigation are priced after the report, as their own job, never inside it (Table F: necessary fault investigation). The report is not a fault find (Table B). Extra work agreed before it is done only from the extra_work_agreed_first practice. |
| Getting to the board and the accessories | Equipment that can be reached against a board behind stored things or accessories behind furniture, an occupied home where the power going off has to be agreed (Table F: inaccessible equipment; Table A timing cell). Say why each adds time and give no figure. |
| The records and the paperwork | A clear circuit schedule and the last report to hand against limited records and circuits that have to be identified first (Table F). The report itself comes with the visit, an EICR and not an installation certificate (Table A). Code adds the price line from [CV: price_list] when there is one. |

### Landlord electrical certificates

**Block 5, cost.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How many circuits in the property | A small flat against a larger let with more circuits (Table F landlord electrical certificates). Say it plainly and give no figure. |
| What the report finds | The report is an EICR, satisfactory or unsatisfactory, not a pass certificate (Table E). A finding that needs remedial work or investigation is priced after the report, as its own job, never inside it (Table F: required investigation or remedial work). The deadlines for that work only from Table C and Table E, as the landlord's duty, never a threat. Extra work agreed before it is done only from the extra_work_agreed_first practice. |
| Getting in to an occupied let | An empty flat against a let with a tenant whose visit has to be arranged, and a board and accessories that can be reached against ones that cannot (Table F: difficult tenant access). Say why it adds time and give no figure. Who arranges access is the landlord (Table C). |
| The certificate and the paperwork | The last report to hand against missing documents (Table F). What the landlord gets: the report and, after remedial work, the certificate for that work and the written confirmation it was done (Table A landlord row). Who has to receive copies only from Table C. Code adds the price line from [CV: price_list] when there is one. |

### PAT testing

**Block 5, cost.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How many items | A handful of appliances against a building full of them, and a list that exists against one that has to be made (Table F PAT testing: more items, incomplete inventory). Say it plainly and give no figure. |
| What the test finds | A cracked plug, a frayed flex or a damaged casing is recorded (Table B). Any repair or replacement is priced after the test, as its own job, never inside it (Table F: damaged items needing follow up). Extra work agreed before it is done only from the extra_work_agreed_first practice. |
| Items spread across a building | Everything in one room against items spread across floors or sites, and equipment that is hard to reach (Table F: dispersed equipment, difficult access). Say why it adds time and give no figure. |
| The register and the paperwork | What the visit leaves behind: an equipment register and a test record (Table A). How often items are tested goes by the risk and the equipment, never that the law asks for every item each year (Table E PAT legal status). Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Tell Us What You Need.** Brief: How to get in touch and what is useful to send first: what kind of premises, roughly how many appliances and where they are, any list from a last test, and any date a licence or a policy asks for (Table G: those conditions vary, so check the particular one). No promise of a reply time unless [CV: response_time] is set.
2. **We Count the Appliances and Price the Visit.** Brief: How the items are counted and the price reached, from [CV: quote_method] only: a list they already have, or a walk round where the site_visit_before_quote practice says so. What moves it (Table F: more items, dispersed equipment). Only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it).
3. **We Book a Date and Do the Work.** Brief: The date is agreed in advance, to suit the customer. What usually happens, from the Table A PAT testing row: the equipment listed, each item inspected, the right test chosen for it, the results recorded and anything faulty pointed out. What the customer gets at the end: the equipment record. Never mention the price, the quote or changes to the plan. Never restates the start time (FAQ 4 owns it).

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

For the client (no client value carries these today, so the briefs say "only from the client values"):
1. Which scheme is the business registered with, and does it certify and notify its own work? The only place this lives is a materials tick ("registered to certify our own work"); a field of its own would let the rules FAQ and the certificate tick item say it plainly. Ray checks the register and the scope before a logo goes up (Table D).
2. Is there a call out charge and an out of hours rate for emergency work, and what hours are covered? The cost and timing briefs can only take a figure from price_list and the hours from emergency_callouts and out_of_hours_available.
3. Does the business test every circuit before quoting a fuse board change, and does it show the customer what it found? Two practices this trade would want (test before quoting, findings shown) that practices.json does not have yet; the briefs say "only from confirmed practices" and nothing more.
4. Does the business do the remedial work its own condition reports find, and does it take the landlord paperwork through (tenant copies, written confirmation)? The scope and obligation briefs read the services list only.
5. Does the business decorate after a chase, or leave it ready for decoration? The make good tick item says "ready for decoration" unless the client values say otherwise.
6. For EV chargers and solar: does the business handle the network operator's notification or application, and any grant claim? The briefs say the operator is told "as the Table C row has it" and name nobody.

For Ray and the trade facts pack (Table G records most as not found; the briefs give no figure):
7. A duration for any electrical job (Table G: none established), so every timing brief gives what decides it.
8. The safe zones for cables in walls and a burial depth for garden cable (Table G: not verified), so the garden lighting and rewiring briefs say "a protected route" and nothing more.
9. The emergency lighting test routine and duration (Table G: the monthly and annual routines exist, the figures were not verified), so the obligation brief says "the testing routines" without them.
10. The AFDD socket circuit list (Table G: omitted from Table C), so arc fault detection is a tick and never a rule.
11. A word on power cuts from the network side (the pack and the facts cover the house's wiring only), so the "power gone in part of the house" card says only that lights off next door point away from the house.
12. The pack's header still says verified: no; the service page gate refuses a run until it is verified on the Trade facts screen.

## Alternate Why title that promises a practice (why_title_practice)

"Tested and Certificated, Every Job" stands only with a practice no tick confirms, so never by default; otherwise the point reads "Our Track Record".

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| Call Us | Emergency electrician |
| We Make It Safe | Emergency electrician |
| We Fix It, or Book the Repair | Emergency electrician |
| A date you have to meet | EICR and electrical testing; Landlord electrical certificates; PAT testing; Fire alarm systems; Emergency lighting |
| A board or wiring from another era | Rewiring; Consumer unit upgrades |
| Damp, steam or rain getting to the electrics | Extractor fan installation; Garden and outdoor lighting; Electric shower installation |
| A new load the house was never wired for | EV charger installation; Cooker and hob installation; Electric shower installation; Solar PV and battery storage |
| Light where you need it, switched where you stand | Lighting installation; Garden and outdoor lighting |
| Knowing who's at the door and what's happening while you're out | CCTV installation; Intruder alarms; Access control and door entry |
| Wiring for the way you live and work now | Data and network cabling; Home cinema and audio visual; Smart home installation; Commercial electrical work |
| A report or certificate you need by a date | EICR and electrical testing; Landlord electrical certificates; PAT testing; Fire alarm systems; Emergency lighting |
| Adding something the house was never wired for | EV charger installation; Cooker and hob installation; Electric shower installation; Solar PV and battery storage |
| Homes wired for a different decade | Rewiring; Consumer unit upgrades |
| Lets, shared houses and the inspection cycle | Landlord electrical certificates; EICR and electrical testing |
| Terraces with nowhere to park a charger | EV charger installation |
| Flats, shared houses and tenants' diaries | Landlord electrical certificates; EICR and electrical testing |
| The supply the street was given | EV charger installation; Solar PV and battery storage; Electric shower installation |

## Idea homes

- **making safe on the call-out and the permanent repair being separate pieces of work** (service): home is the 'Made safe tonight, fixed on a date' block 4 card. Elsewhere: the steps, the cost cards and the 'What if the fault comes back' FAQ state their own part without re-explaining the two-visit split.
- **what to do before the electrician arrives (circuit off, unplug, keep away)** (service): home is the 'What should I do before you arrive?' FAQ. Elsewhere: the Call Us step covers only what to say on the call, and the problem cards do not list the safe basics.
- **making safe on the call-out and the permanent repair being separate pieces of work** (category): home is the 'We Fix It, or Book the Repair' step. Elsewhere: the cost cards and the 'What if the fault comes back after an emergency visit?' FAQ do not re-explain the two-visit split.
- **what to do before the electrician arrives (circuit off, unplug, keep away)** (category): home is the 'What should I do before you arrive?' FAQ. Elsewhere: the Call Us step covers only what to say on the call, and the problem cards do not list the safe basics.
