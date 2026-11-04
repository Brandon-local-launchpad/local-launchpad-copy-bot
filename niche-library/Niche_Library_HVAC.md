# Niche Library Entry: HVAC / Air Conditioning

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/hvac.json`; this file is its human copy, kept in the same commit. The model never sees the slot names, only the resolved words.

Business type: **A (project trade)** for every GBP category (HVAC Calibration Pack v1, section 2). The pack's split inside type A (schedule led, problem led, desire led) is carried in the card briefs and in the library's `desire_led` column, not in a second type. Sources: the pack (sections 1, 2, 4 and 7), `trade-facts/hvac.md` (Tables A to G, verified: no), `niche-library/hvac.csv` and `hvac-categories.csv`, `fillout/services/hvac.json`.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Air Conditioning / air conditioning |
| trade_person / trade_person_plural | air conditioning engineer / air conditioning engineers |
| customer_type | homeowners and local businesses |
| unit_of_work | jobs |
| emergency_niche | no (breakdown call outs on refrigeration, cold rooms and server rooms are written only from [CV: emergency_callouts]; no page is flagged emergency in hvac.csv) |
| big_ticket | yes (air conditioning installation, ductwork and ventilation installation, cold rooms) |
| schema_subtype | HVACBusiness |

## Priority services

Placed before other homepage cards when the client offers them: Air conditioning servicing. The pack leads the trade with the servicing schedule.

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| air conditioning, air con, unit, indoor unit, outdoor unit, filter, warm air, dripping, noise, regas, ventilation, extract fan, stuffy, condensation, server room, cold room, kitchen extract, F gas (F gas is the commercial buyer's own word for the leak check and the register; a domestic page says the refrigerant handling certificate) | comfort cooling, solutions, evaporator, condenser, fan coil unit, refrigerant charge, property, state of the art, cutting edge, bespoke, hassle free (words_avoid_exceptions: condenser: allowed on a commercial refrigeration or cold room page where the condensing unit is the customer's own word for the plant outside; property: allowed where the page speaks to a landlord or a letting agent, where property is their own word) | climate control, the perfect indoor environment, perfect indoor environment, indoor comfort systems, indoor comfort, total comfort, year round comfort, perfect temperature, eliminates allergies, prevents illness, breathe easy, signs you need air conditioning (the pack's section 7 brochure language and health claims, and the symptom H2 a desire led page must never carry) |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about the room or the building and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about the room or the building and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency pages) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About the Room or the Building**
   Brief: How to get in touch and what is useful to send first: which rooms or which part of the building, what system is there already if any, what it is doing, and a photo of the indoor unit, the outdoor unit or the label on it. No promise of a reply time unless [CV: response_time] is set. Never ask the customer to open the unit or touch the electrics.
2. **We Survey and Price the Job** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: The visit and what gets looked at: on a new system the room's heat, where the indoor and outdoor units can go, the pipe and drain route and the power; on a fault, the system running. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it). Never a sizing figure or a unit size.
   Without the practice (`step_2_no_visit`): **We Price Your Job**
   Brief: Say a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video, survey or visit). Only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it).
3. **We Fit It on a Date That Suits You**
   Brief: The date is agreed in advance, to suit the customer; for a business, round its hours only from the confirmed practices. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer_warranty → insurance (a maker's warranty counts in this trade: the manufacturer partner schemes in Table D carry extended warranties, their servicing conditions from the maker's own terms only) |
| fears (in order, one per Why choose us point; the pack's section 1 homeowner, with the regas and the price fears shared by the commercial reader) | 1. a unit that is noisy, or sized wrong for the room, so it never does what it was bought for; 2. an outdoor unit stuck on the wall where everyone sees it and the neighbours hear it; 3. a repair that tops up the gas and leaves the leak, so the system is down again within weeks; 4. a price that grows once the engineer is on site, with running costs nobody mentioned |
| fears_by_type | not used: the pack maps every category to type A, so there is no second type to key the commercial reader's fears (downtime, records, stock at risk) to. [CV: customer_types] decides which reader leads a page, and the card briefs carry the commercial framing. See "What the sources lacked". |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D.

- **Ratings (always first):** Google (needs review_count 5+), Checkatrade, Trustpilot, Which? Trusted Traders.
- **Tier 1, certification, schemes and trade bodies:** Refcom (F gas company certificate, checked on the register); Quidos F Gas Register (F gas company certificate); Bureau Veritas (F gas company certificate); BESA (Building Engineering Services Association, Competence Assessment Standard); BESCA Competent Person Scheme; NAPIT (scope checked); Certsure or NICEIC (scope checked: the brand alone proves nothing for air conditioning work); TrustMark; MCS (heat pump pages only).
- **Tier 2, manufacturer approvals:** Daikin D1+ Premium Partner; Mitsubishi Electric Business Solutions Partner; Panasonic PRO Partner; Fujitsu installer programme (its current name and criteria are unverified in the facts pack: show only what the client's certificate says).
- **Tier 3, local and general credibility:** CHAS, SafeContractor, Institute of Refrigeration and CIBSE grades, FETA, HEVAC and BRA membership, chamber of commerce, local press: Ray's call per client. An individual's ACRIB SKILLcard or City and Guilds certificate is never shown as the company's certificate.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if something is damaged during the job. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. A maker's warranty from [CV: manufacturer_warranty] only, and any servicing condition on it only as that maker's terms give it (the trade facts say the conditions differ by maker and product: never generalised). | no | Trust |
| faq_3_none | What happens if something isn't right after the job? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the 'reasonable care and skill' standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. Nothing about summer lead times. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How often should air conditioning be serviced? | What decides it rather than a number (the trade facts servicing interval row: varies, no universal legal interval): the maker's instructions for the unit, a warranty condition that asks for a service record where the client's maker has one, and on larger commercial systems the leak checks the rules set by how much gas the system holds, which are a separate duty from a service. Why a check before the hot weather: dust on the filter and the indoor coil cuts the air crossing it, so the unit works harder on the first warm days and a slow leak shows as a unit that cannot keep up. A frequency only from [CV: visit_frequency_options] or the facts rows; never 'a yearly service is required by law'. | no | Timing |
| faq_B | Why is my air conditioning blowing warm air? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words: too little air crossing the indoor coil (a filter or a coil clogged with dust), gas lost through a leak so there is less of it to carry the heat out of the room, and a control or sensor fault. Then what the local buildings or air add (a busy road loading the filters, salt air on the outdoor coil), then the fix in the order the trade facts repair stages give it: the fault found first, a leak repaired and the circuit tested before any gas goes back. A top up without finding the leak lasts weeks, never say it is a fix. | **yes** | Process |
| faq_C (fallback) | Does my air conditioning need regassing? | The refrigerant is sealed in and is not consumed, so a system short of gas has a leak somewhere (the trade facts leak found row). What the work involves from the repair stages: the leak located and repaired, the circuit tested and evacuated, then the gas put back and the repair checked again. Never regassing on its own as the answer. Sealed system work as something the trade's rules keep to engineers with the refrigerant handling certificate, as what usually applies to anyone doing it; this business's own certificate only from [CV: credentials]. | no | Process |
| faq_D (fallback) | When is the best time of year to have air conditioning fitted or serviced? | The reason in the system, never in the diary: a service before the hot weather finds a tired filter, a dirty coil, a slow drain or a slow leak before the unit is asked to work hard; a unit that heats as well as cools is in use through winter, so its service follows the maker's instructions rather than the season. The facts rows give no closed season and no duration for fitting a system, so say the timing of an install is decided by when the room or the building can spare it. Nothing about summer being busy or lead times stretching. No dates, no promise about the weather. | no | Timing |
| faq_E (fallback) | Can I clean the air conditioning filters myself? | Yes to the indoor filter, done the way the maker's leaflet for that unit says, and why it helps (the air across the coil). Then the line: the sealed circuit, the gas and the electrics are work for an engineer who holds the refrigerant handling certificate, as the trade's rule and never as this business's own certificate unless [CV: credentials] gives it. No health claim about the air. | no | Process |
| faq_planning (big_ticket AND [CV: handles_planning] confirmed) | Will the outdoor unit need planning permission? | Point at the trade facts rule rows (Table C) and write what usually applies, with "usually" or "in most cases": a unit that only cools falls outside the automatic right at a house, so a check with the council is usual; a unit that heats as well can qualify when its conditions are met; a listed home or a conservation area usually needs permission; in a flat the freeholder usually has to agree first; a business's plant has no automatic right. What the customer does only as the row gives it (apply where the conditions are not met). No volume, no count of units, no noise figure, never an Order's or an Act's name. | no | Process |

Sources for faq_A to faq_E: the pack's section 4 craft rules and the questions its blog section lists as the ones people search for (servicing intervals, warm air, regassing, permission, what an owner can do), reworded; the answer briefs point at the trade facts Table E rows (servicing interval, leak found, condensate faults, split system heating, domestic AC planning). Replace with real customer questions when Brandon or the client supplies them.

### Type overrides (faq_slots_by_type)

None: every category is type A. A commercial led client reads the same slots; its pages lead commercial through [CV: customer_types] and the card briefs.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Systems: wall mounted split / multi split / ducted system / ceiling cassette / floor standing unit / VRF system / heating and cooling (reversible) units
- Refrigerants: R32 / R290 propane / R410A on existing systems
- Condensate: gravity drain / condensate pump
- Ventilation: rigid ductwork / sheet metal ductwork / MVHR unit / kitchen extract canopy / flexible duct on final connections only
- Refrigeration: integral cabinets / remote condensing unit / insulated panel cold room / temperature alarms
- Other: refrigerant recovered and recorded / commissioning records handed over / service records kept for the customer / manufacturer approved installer / new circuits by a registered electrician / work outside opening hours for businesses

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

air conditioning installation, split system, multi split, ducted air conditioning, ceiling cassette, air conditioning servicing, air conditioning repairs, regas, regassing, leak test, leak check, pressure test, evacuation, vacuum, commissioning, decommissioning, refrigerant recovery, condensate pump, condensate drain, ductwork, ventilation, extract fan, kitchen extract, duct cleaning, MVHR, heat recovery ventilation, indoor air quality testing, air quality testing, server room cooling, close control, cold room, commercial refrigeration, chiller, VRF, air handling unit, TM44 inspection, F gas leak check, air balancing, heat pump

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list. The heating rows are never named here: they belong to the Plumbing and Heating niche.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| heating system maintenance | (never named) |
| heating system installation | (never named) |
| heating system repair | (never named) |
| portable a/c services | (never named) |
| ventilated ceiling | (never named) |
| a/c system maintenance | air conditioning servicing |
| hvac system maintenance | air conditioning servicing |
| a/c preventive maintenance | air conditioning servicing |
| a/c filter replacement | air conditioning servicing |
| f-gas leak testing | air conditioning servicing |
| f gas leak testing | air conditioning servicing |
| hvac duct and vent cleaning | duct cleaning |
| a/c system vent cleaning | duct cleaning |
| ductless heating and a/c | split system air conditioning |
| multi split | split system air conditioning |
| split system | split system air conditioning |
| hvac system repair | air conditioning repairs |
| a/c system repair | air conditioning repairs |
| hvac repair | air conditioning repairs |
| thermostat repair | air conditioning repairs |
| thermostat installation | air conditioning installation |
| ac installation | air conditioning installation |
| hvac duct and vent installation | ductwork and ventilation installation |
| hvac duct and vent repair | ductwork and ventilation installation |
| air balancing | ductwork and ventilation installation |
| a/c system dismantlement | air conditioning removal and decommissioning |
| air source heat pump | air source heat pumps |
| ground source heat pump | ground source heat pumps |
| heat recovery ventilation | heat recovery ventilation |
| mvhr | heat recovery ventilation |
| commercial hvac | commercial air conditioning and ventilation |
| chiller | commercial air conditioning and ventilation |
| vrf | commercial air conditioning and ventilation |
| refrigeration system | commercial refrigeration |
| cold room | cold rooms |
| server room cooling | server room cooling |
| indoor air quality testing | air quality testing |
| cleaning | air conditioning servicing |
| installation | (never named) |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category tab (fillout/services/hvac.json), in the words a customer uses, in the order code picks them (after the client's jobs_wanted). The Central Heating Service and Furnace Repair Service tabs carry only this niche's air conditioning services: the heating pages are the Plumbing and Heating niche's. JSON slot: core_services.

- Hvac Contractor: air conditioning servicing, air conditioning repairs, air conditioning installation, ductwork and ventilation installation, duct cleaning
- Air Conditioning Contractor: air conditioning installation, split system air conditioning, air conditioning servicing, air conditioning removal and decommissioning
- Air Conditioning Repair Shop: air conditioning repairs, air conditioning servicing
- Air Duct Cleaning Service: duct cleaning, ductwork and ventilation installation
- Central Heating Service: air conditioning servicing, air conditioning repairs, air conditioning installation
- Furnace Repair Service: air conditioning repairs, air conditioning servicing

Service words for the whole job rather than one service: air conditioning, hvac, ventilation, refrigeration, heating and cooling, commercial air conditioning. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: air conditioning repairs, regas, air quality testing. When an FAQ question names the job as well as the problem ("Why does my split system need regassing every summer?"), it goes to the job's page (repairs), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches). The briefs here name the shared keys a line depends on: site_visit_before_quote (step 2), price_agreed_before_work, written_quote, photos_of_faults, aftercare_advice, return_visit, customer_need_not_be_home, stage_updates. No HVAC only practice exists yet; the ones the briefs want are under "What the sources lacked".

## Onboarding questions this niche needs

The cost, "how long" and "how often" FAQs can only say what affects the answer unless the client gives figures. Ask every HVAC client for:
- a "from" price for 3 typical jobs (a single room split, a service visit, a repair call out);
- a typical duration for the same 3 jobs (the trade facts give none for this trade);
- whether quotes are written, and whether the price is fixed once agreed;
- whether the work is domestic, commercial or both, and which leads (customer_types);
- the company's refrigerant handling certificate (the issuer and the number) and any competent person scheme registration, for Ray to verify;
- which makers the business fits and whether it holds any of their partner approvals (manufacturer_warranty);
- whether it offers a servicing plan or maintenance contract, and whether it takes breakdown call outs on refrigeration, cold rooms and server rooms (emergency_callouts; no response time is ever written).

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Local Experience Behind Every Job**
2. Cover → **Covered If Something Goes Wrong**

## Business type notes (business_type_notes)

Every GBP category is A (HVAC Calibration Pack v1, section 2: the whole trade is mapped to type A, led by the servicing schedule), so category_types is empty. The pack's split inside type A is carried in the card briefs and the library's desire_led column, not in a type: schedule led (what slips and when, with the reason in the system) for Air conditioning servicing, Duct cleaning, MVHR servicing, Commercial HVAC maintenance, Commercial refrigeration maintenance, Server room cooling maintenance and Cold rooms maintenance; problem led (symptom, cause in the airflow, the coil, the drain or the refrigerant circuit, consequence if left) for Air conditioning repairs, Air conditioning removal and decommissioning, Indoor air quality testing and repair work on refrigeration and cold rooms; desire led (the customer's situation, never an invented symptom; the service_page_blocks.A.desire variant, switched by the library's desire_led column) for Air conditioning installation, Split system air conditioning, Ductwork and ventilation installation, MVHR heat recovery ventilation, Server room cooling and Cold rooms. Domestic and commercial readers share every type: [CV: customer_types] decides which leads a page, and the two are never in one sentence. Breakdown call outs on refrigeration, cold rooms and server rooms are written only from [CV: emergency_callouts], with no response time; no page is flagged emergency in hvac.csv, so there is no emergency variant. The Central Heating Service and Furnace Repair Service tabs carry only this niche's air conditioning services (heating pages belong to the Plumbing and Heating niche), so their nouns and core services are the air conditioning ones. Hot spells make the trade seasonal: seasonal_trade is on and the swap gives its reason in the system, never in the diary.

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": hvac contractor → air conditioning and ventilation, air conditioning contractor → air conditioning, air conditioning repair shop → air conditioning repair, air duct cleaning service → duct cleaning, central heating service → air conditioning and ventilation, furnace repair service → air conditioning and ventilation. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs (`category_page_blocks`) use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above), the FAQ slots and, with `seasonal_trade` on, the one card and one FAQ that swap in. Placeholders: `[CAT]` the page keyword without the town, `[CAT_LOWER]`, `[WORK]` the work noun, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises, no regulation or standard named.

- `seasonal_trade`: yes (hot spells; every seasonal brief gives its reason in the system, never "summer is busy")
- `category_types`: empty. Every category is A (the pack's section 2 table); the client's type is A by default.
- A niche with no section here has its category pages refused: "no category block briefs for hvac".

### Type A (project trade: every GBP category)

The pack's section 2 split inside type A: schedule led services (Air conditioning servicing, Duct cleaning, MVHR servicing, the maintenance side of Commercial HVAC, Commercial refrigeration, Server room cooling and Cold rooms) are written as what slips and when, with the reason in the system; problem led ones (Air conditioning repairs, Air conditioning removal and decommissioning, Indoor air quality testing, repair work on refrigeration and cold rooms) as symptom, cause in the airflow, the coil, the drain or the refrigerant circuit, and consequence; desire led ones (the library's `desire_led` column) as the customer's situation. Block 4 below is a mix: card 1 is schedule led, cards 2 and 3 problem led, card 4 a situation, and every brief says how it reads on an HVAC Contractor, Air Conditioning Contractor, Air Conditioning Repair Shop or Duct Cleaning page.

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Servicing that slipped a year or two | dust building on the filter and the indoor coil, so less air crosses it | Schedule led: what slips when nobody services the system, from the trade facts servicing signs row: the airflow weaker each summer, the unit running longer and cooling less, a stale smell when it starts, a drip from the indoor unit. The one cause this card makes: dust building on the filter and the indoor coil, so less air crosses it, with the drain and the pressures never looked at behind it. Time of year and the reason: a check before the hot weather, because that is when the filter and the coil are asked to pass the most air and a slow leak shows as a unit that cannot keep up; never that summer is busy. What a service does, from the servicing stages: the filters and heat exchangers cleaned, the condensate run checked, the controls, a leak check where the system's gas content asks for one, the test run and the record. No interval unless the facts rows or [CV: visit_frequency_options] give one; never 'required by law every year' (the trade facts servicing interval row). By category: Air Conditioning Contractor and HVAC Contractor read it as the service itself; Repair Shop as the repairs that trace back to a missed service; Duct Cleaning as the ducts: dust at the grilles, a kitchen canopy heavy with grease, from the duct cleaning signs row. |
| A drip from the indoor unit | a condensate drain that has blocked, so the tray overflows | Problem led: a wet patch or a run mark on the wall under the indoor unit, a stain spreading on the ceiling under a cassette, water in the tray that never clears. The one cause this card makes: the drain that carries the condensate away has blocked with the dust and the film washed off a coil nobody cleaned, or was run without a fall when the unit went in, so the tray fills and spills (the trade facts servicing and split system rows). Say what the fix usually involves, from the repair stages in plain words: the drain cleared or re run, a pump where gravity cannot do it (the materials cell), the coil cleaned so it does not block again; what it leads to if left, from the skipped row: stained finishes and water near the electrics, specific and never alarming. Never that a drip proves a gas leak (the trade facts condensate row). By category: Repair Shop and HVAC Contractor read it as the fault; Air Conditioning Contractor as the drain route on a new system; Duct Cleaning as damp at a grille where moist air sits in a duct. Not weak cooling: card 1 and the symptom FAQ own that. |
| Warm air, or a unit that never catches up | gas lost through a leak, so less heat is carried out | Problem led: air from the indoor unit no cooler than the room, the outdoor unit running with nothing changing indoors, ice on the pipes, a unit that trips. The one cause this card makes: gas lost through a leak, so there is less of it to carry the heat out of the room; the refrigerant is sealed in and not consumed, so a system short of it has a leak (the trade facts leak found row). Say the honest order of the work from the repair stages: the fault found, the leak located and repaired, the circuit tested and evacuated, and only then the gas put back; a top up on its own lasts weeks, never say it is a fix. Sealed system work as something the trade's rules keep to engineers with the refrigerant handling certificate, as what usually applies to anyone doing it; this business's own certificate only from [CV: credentials]. Not a filter or a coil clogged with dust: card 1 owns that; not a unit sized wrong for the room: card 4 owns that. By category: Repair Shop and HVAC Contractor read it as the fault; Air Conditioning Contractor as the joint that was never tested when the system went in (the done badly row); Duct Cleaning as a ducted system whose air cannot get through, from the ductwork signs row. |
| A room the house can't keep cool | the room's heat gain, and nothing sized to take it out | A situation card, not a fault: a bedroom under the roof still warm at midnight, a home office where the afternoon sun comes through the glass, a meeting room full of people, a server cupboard whose kit trips in a hot week. What decides it: where the heat comes in (the roof, the glass, the people, the equipment) and whether anything is sized to take it out; a portable unit in the doorway does not spread cool air through the room the way a fixed system does (the trade facts installation skipped row), with no performance figure (none is verified). What the work gives them: a split sized to that room from a heat gain survey (the installation stages), the indoor unit where the air reaches the whole room, the outdoor unit where the neighbours will not hear it and an engineer can reach it; a unit too big stops and starts and leaves the room clammy, one too small runs flat out and never gets there (the sizing guidance, no percentage). By category: Air Conditioning Contractor and HVAC Contractor read it as the install; Duct Cleaning as a room that is stuffy rather than hot, where the extract barely draws (the ductwork signs row), and what a proper supply and extract gives it; Repair Shop as an old unit that never kept up because it was never sized to the room. Never a lifestyle line, never a symptom invented for it; domestic and commercial never in one sentence: [CV: customer_types] decides which leads. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How many rooms or units | The number of indoor units and cooling zones moves the price more than anything else (the trade facts price rows for installation, servicing and removal): each one is a unit, a pipe run, a drain and a connection. Say it plainly and give no figure. |
| The route between indoors and out | The pipe, drain and cable run from the indoor unit to the outdoor one: its length, whether it is concealed, a pump where the drain cannot fall, height access to the outdoor unit (the price rows). Say why a long or hidden route costs more time. |
| Power and permissions | A new electrical circuit where one is needed (notifiable work in a home, said without the rule's name, from the rule rows; never 'every unit needs its own circuit', the trade facts electrical row), and planning or noise work where the outdoor unit's position asks for it. Say the business looks before it prices, from [CV: quote_method] only. |
| The state of what's already there | On a service or a repair: coils heavily soiled, drain parts that have failed, a fault that needs the circuit opened, tested and recharged, a leak check the system's size asks for; on a removal, more than one circuit and the making good (the price rows). Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (the number of units, the route, the power) and how the quote is given, from [CV: quote_method] only. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. A maker's warranty only from [CV: manufacturer_warranty], its servicing condition only as that maker's terms give it. Described, never promised. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What [WORK_LOWER] work do you take on? | The jobs themselves, named from the card list (the servicing, the repairs, the new systems, the ductwork: name the work, never 'on this page', 'listed above' or 'the card list'), whether the business works in homes, in businesses or both from [CV: customer_types], and the size of job from [CV: typical_jobs] only. Link one service page. Heating and heat pumps only where the services list has them. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends (which rooms, the unit's label, photos), what the business looks at (the room's heat, the route, the power, the drain), what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year to have [WORK_LOWER] work done? | The reason in the system, from the trade facts timing cells: a service before the hot weather, because the filter, the coil and the drain are then asked to do their most and a slow leak shows as a unit that cannot keep up; a system that heats as well is in use through winter, so its service follows the maker's instructions. Fitting a system or ductwork has no closed season in the facts rows; a changeover in a working building is planned round when the system can be off. Nothing about summer being busy or lead times. No dates, no promise about the weather. | Timing |
| symptom | a symptom tagged with the page | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked, with the cause put in the airflow, the coil, the drain or the refrigerant circuit. Say first when a sign is normal (a drip outside on a humid day, the fan running on after the unit is switched off, a smell on the first start of the year that clears in minutes) and then what is not, before anything else. Then the usual cause here in plain words, what the local buildings or air add (salt air on the outdoor coil, a busy road loading the filters, a flat where the unit's position is settled with the freeholder), and what the business does about it. Never a health claim. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **The first hot week finds every weak spot** (mechanism: a system asked for its most after months of idling): Say first what is normal when a system is switched on after months off: a stale smell for a minute, a drip outside, the outdoor fan running on. Then what is not: warm air, ice on the pipe, a unit that trips, a drip indoors. The one cause this card makes: a system asked for its most after months of idling, so whatever built up on the filter and the coil, or leaked out slowly over the winter, shows all at once. Say what a check before the hot weather looks at, from the servicing stages; what the business does only from confirmed practices. The reason in the system, never that summer is busy, never a lead time. FAQ: Can you service or fit air conditioning in winter? (Timing): What the cold months suit: a service or a repair while the system is not being relied on, a new system fitted while the room can do without it (the facts rows give no closed season for either); a unit that heats as well as cools is in use through winter, so its service follows the maker's instructions rather than the season (the trade facts split system heating row). No dates, no lead times.

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (signs you need it, or the desire variant's "is it right for you") and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above), the FAQ slots (A: cost, timing, cover, rules, scope) and, with `seasonal_trade` on, the one card and one FAQ that swap in (the FAQ replaces the timing slot). The service's own trade facts rows (`trade-facts/pack.js rowsForService`) are the material every brief points at, so one type A entry serves servicing, repairs, ductwork and cold rooms alike. Placeholders: `[SERVICE]` the page keyword without the town, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no regulation's or standard's name or number.

- A niche with no section here has its service pages refused: "no service block briefs for hvac".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type A (project trade: every page)

Three framings share this one entry, per the pack's section 2: a problem led page (Air conditioning repairs, Air conditioning removal and decommissioning, Indoor air quality testing, refrigeration and cold room repairs) uses block 4 below as written; a schedule led page (Air conditioning servicing, Duct cleaning, MVHR servicing, Commercial HVAC, the maintenance side of Commercial refrigeration, Server room cooling and Cold rooms) reads the "on a schedule led page" line in each brief, what slips and when; a desire led page (the library's `desire_led` column: Air conditioning installation, Split system air conditioning, Ductwork and ventilation installation, MVHR heat recovery ventilation, Server room cooling, Cold rooms) swaps block 4 and the seasonal card for the desire variant at the end of this section.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Finding out what you have and what it's doing | The first stage from the trade facts: the system and its history, the room's heat or the building's use, the storage duty or the IT load, as the stages name it for this service. A part of the job, not a promise about the quote. |
| Isolating the system safely | The isolation stage from the trade facts: power off, the system made safe before anything is opened. Name only what the rows give. |
| The airflow side | Filters, heat exchangers, grilles, fans and ducts: the cleaning, fitting or balancing stages as the trade names them. No figure unless the rows give one, and never a standard's number. |
| The drain and the pipework | The condensate run and the pipe and cable connections, from the stages: a gravity drain or a pump, insulated pipework, the connections made and checked. A named product only from [CV: materials_methods]. |
| The refrigerant circuit | The leak test, the evacuation, the recovery or the recharge, only where the stages for this service open the circuit. The certificate the trade needs for it said as what usually applies; this business's own only from [CV: credentials]. |
| Testing and commissioning | The test run from the stages: the pressures, the flows balanced, the temperatures held, the controls and alarms proved. What the customer sees when the job is done. |
| The record you're left with | The findings recorded, the recovery recorded, the handover instructions, as the stages give them for this service. A record only as the rows name it; never a certificate the client values do not give. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The first signs | the job left undone | The things an owner notices first, from the trade facts signs row for this service, in their words: weak airflow, a dusty filter, a stale smell, a drip, a unit that will not start, an error code, a room that stays warm, a cabinet that runs without stopping. The one cause this card makes: the job left undone. Then what it leads to if left, from the skipped row: specific, never alarming. On a schedule led page (servicing, duct cleaning, MVHR servicing, the maintenance side of commercial systems, server rooms and cold rooms) the card is what slips and when, with the reason in the system: a filter clogging so the air drops, grease building in a kitchen canopy with the hours it runs (a cleaning band only from the rule rows, read as a recommendation by use and never a law), a door seal icing, never the customer's diary. No figure. |
| Topped up, then back where it started | a leak left in the circuit while the gas was replaced | Problem led: a regas that lasted weeks, a unit cooling again for a month and then not. The one cause this card makes: a leak left in the circuit while the gas was replaced, so it went the same way. Say what the job does instead, from the trade facts repair stages and the leak found row: the leak located and repaired, the circuit tested and evacuated, the gas put back and the repair checked again; never a dig at the last engineer. On a schedule led page: the leak check as a stage of the service where the system's gas content asks for one, and the record kept of it. On a decommissioning page: the gas left in a dead unit on the wall is the job left undone, and why it is recovered before anything is disconnected (the removal stages, the recovery rule as what usually applies). |
| A fault that keeps coming back | the part dealt with, never the cause behind it | A unit that trips again, an error code that returns, a cabinet that misses its temperature again a week after a visit. The one cause this card makes: the part dealt with, never the cause behind it (the trade facts done badly rows: a part swapped without the controls retested, a drain cleared without the coil cleaned, a cabinet commissioned without the target temperature proved, a damaged fin left to choke the heat exchange). Say what doing the job properly involves, from the stages: the fault diagnosed before anything is replaced, and the system recommissioned and documented after. On a schedule led page: the point where cleaning no longer holds because what is behind it is worn or blocked, from the done badly row. Not a leak: card 2 owns that. |
| Ice, frost or water where it shouldn't be | a coil starved of air that ices and then thaws | Ice on the pipe or the indoor coil and then a flood when it thaws, frost thick on a cold room's cooler, condensation on a duct run or a panel. The one cause this card makes: a coil starved of air or of gas, so it runs colder than it should, ices over, and the melt water overflows the tray (the trade facts servicing and refrigeration rows). Say what the job does about it from the stages; never promise the room's moisture will change. On a cold room page the card reads as a door seal letting warm damp air in, from the cold rooms signs row, and what sealing and the drain route do about it. On a schedule led page: the filter, drain and seal checks of a service. Not a drain blocked on its own: the category page owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How many units, and how big the system is | The size factor from the trade facts price row: the number of indoor units or cabinets, the cooling zones, the IT load, the length of duct. Say it plainly and give no figure. |
| Getting at it | Plant that is hard to reach, height access, few access panels in a duct run, a room that cannot be shut down while the work is done, from the price row. Say why that adds time. |
| What we find when we look | On a new system, the route and whether a new circuit is needed; on a fault, how hard it is to find and whether the circuit has to be opened, tested and recharged, or a major part replaced; on a service, coils heavily soiled or drain parts that have failed, from the price row. Say the business looks before it prices, from [CV: quote_method] only. |
| The records and the making good | The post clean evidence, the recovery record, the reinstatement after a removal, the planning or noise work a position asks for, from the price row. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us About the Room or the Building; We Survey and Price the Job; We Fit It on a Date That Suits You; We Price Your Job without the site visit practice).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: the rows give no duration for any job in this trade, so say what decides it (the number of units, the route, the access, whether the circuit is opened) and, in a working building, that the changeover is planned round when the system can be off. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. A maker's warranty only from [CV: manufacturer_warranty], its servicing condition only as that maker's terms give it. Described, never promised. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Do I need permission or a certificate for [SERVICE_LOWER]? | From the trade facts rule rows only, put as the thing that usually applies, with "usually" or "in most cases": the outdoor unit's position (a unit that only cools at a house is usually checked with the council; a listed home or a conservation area; a flat where the freeholder usually has to agree); a new circuit notified through the electrical route; sealed system work done by a certified company and a qualified engineer, as the trade's rule and never this business's certificate unless [CV: credentials] gives it; on larger commercial systems the leak checks, the records and the energy inspection as duties on whoever runs the building, banded by the gas held and the output, never a figure; kitchen extract cleaning as a risk based recommendation, never a law. Never a regulation's name or number, never legal advice. Where the rows give no rule for this service, say none usually applies and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words: the survey, the filters and coils, the drain, the circuit test, the commissioning and the record, as they apply to this work. What it does not cover only from the services list (heating, heat pumps, portable units), with one sibling service page or the category page linked. Homes, businesses or both from [CV: customer_types]. | Fit |
| symptom | a symptom tagged with the page | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked, with the cause put in the airflow, the coil, the drain or the refrigerant circuit. Say first when a sign is normal (a drip outside on a humid day, the fan running on after the unit is switched off, a smell on the first start of the year that clears in minutes) and then what is not, before anything else. Then the usual cause here in plain words, what the local buildings or air add, and what this service does about it. Never a health claim. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **Asked for its most after months idle** (mechanism: dust settling and a slow leak creeping while the system idled): What shows on the first warm days after a system has sat through the cold months, from the trade facts signs row for this service. Say first what is normal (a stale smell for a minute, a drip outside, the outdoor fan running on) and then what is not (warm air, ice on the pipe, a trip, a drip indoors). The one cause this card makes: dust settling and a slow leak creeping while the system idled, now showing together. Say what gets looked at before the hot weather from confirmed practices only; otherwise what the job puts right. Not a coil icing for want of air (card 4) and not a leak left behind a top up (card 2). FAQ: When is the best time of year for [SERVICE_LOWER], and how long does it take? (Timing): From the trade facts timing row only: the season the work suits and why, in the system (a service before the cooling season as the maker's guidance has it; nothing else in the rows has a season), then what decides how long it takes, since the rows give no duration (the units, the route, the access, whether the circuit is opened). No dates, no lead times, no promise about the weather. This is the one place the timing is written.

### Type A, desire led variant (Air conditioning installation, Split system air conditioning, Ductwork and ventilation installation, MVHR heat recovery ventilation, Server room cooling, Cold rooms)

`service_page_blocks.A.desire`. Nobody has symptoms of wanting air conditioning. A page the library flags `desire_led` reads this block 4 in place of the one above: the customer's situation, what decides it (the mechanism) and what the work gives them, never a fault invented for it. The seasonal card swaps the same way. Everything else on the page (What's Included, block 5, the steps, the FAQ slots, the symptom question) is the type A entry's. Server room cooling and Cold rooms are flagged because their page rows are the new system (the pack: desire led "when new"); their servicing and repair aliases are mentioned on the same page, which card 4 covers. H2: Is [SERVICE] Right for You?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|
| A room that holds the heat | where the heat comes in, and nothing sized to take it out | The customer's situation: a bedroom under the roof still warm at midnight, an office where the afternoon sun comes through the glass, a shop floor or a meeting room full of people, a server cupboard whose kit trips in a hot week, a new build or an extension that needs its ventilation (the trade facts signs rows for installation, split systems, ductwork, MVHR, server rooms and cold rooms). What decides it: where the heat or the moisture comes from (the roof, the glass, the people, the equipment, the cooking and the showers) and the building it is in (a flat, a terrace where the pipe run is harder, a listed home, a live kitchen). What the work gives them, from the stages for this service: a system sized from a heat gain survey, the indoor unit placed to reach the whole room, the outdoor unit where it is quiet and reachable, a ventilation design that supplies the living rooms and extracts the wet ones, a cold room built to its storage duty, cooling designed to the IT load with the failover written down. Homes and businesses never in one sentence: [CV: customer_types] decides which leads. Never a fault invented for it, never a lifestyle line. |
| Sized and sited, not just fitted | the sizing and the siting, which decide noise, airflow and running | The customer's situation: they have had a quote by the brochure, or a cheap one, and want to know what the difference buys. What decides it: the heat gain calculation (a unit too big stops and starts and leaves the room clammy, one too small runs flat out: the sizing guidance, no percentage), the outdoor unit's position (noise to the neighbours, the air round it, service access, permission), the drain given a fall or a pump, the nitrogen test and the vacuum before any gas goes in (the split system stages; the done badly rows: joints that leak, moisture left in the circuit, a drain that leaks). For ductwork and MVHR: rigid runs where they can be, joints sealed, the flows measured and balanced (the done badly rows: unsealed joints, crushed flexible runs, terminals that miss their flow). What the work gives them: a system that does what it was bought for. One specific from the stages for this service; never a dig at another installer. |
| Which system suits the room | the room, the building and its use deciding the kind of system | The customer's situation: they are weighing a wall mounted split against a multi split, a ducted system above the ceiling against a cassette, a unit that heats as well as cools against one that only cools, a heat recovery unit against extract fans in a new build, an integral cabinet against remote plant, close control against a split for a server room (the trade facts materials and methods cells). What decides it: how many rooms, where the units can go, whether it must heat too (a unit that only cools is never described as heating: the trade facts split system heating row), how airtight the home is for heat recovery (the MVHR operation row), the storage duty of a cold room. What the work gives them: the option that suits their building, never the one that is best in general. A named maker or product only from [CV: materials_methods]; no running cost, lifespan or energy rating claim unless the rows or the client values give it; never that air conditioning improves the home's energy rating (the trade facts EPC row). |
| What it will ask of you once it's in | what the system needs to keep doing its job | The customer's situation: they want to know what they are taking on once the system is in. What decides it: the indoor filter they can clean themselves following the maker's instructions; a service at the interval the maker's instructions and any warranty condition set (that condition from the client's maker's terms only, never generalised: the trade facts warranty row); on a business's system the leak checks and records the rules ask for by the gas held, and the energy inspection on larger systems, said as duties banded by size with no figure; a kitchen canopy cleaned to a risk based band; a cold room's alarms and door seals; the handover information that comes with a ventilation system (the ventilation handover row). What the work gives them: an honest picture of what it saves them and what it does not. A servicing plan or a contract only where the services list has one; no response time; no health claim. |

**Seasonal swap** (desire led, card 4): **Getting it in before it's needed** (mechanism: a system fitted while the building can spare it): The customer's situation: they want it in before the hot weather, or want to know when it should be fitted. What decides it: the facts rows give no closed season for fitting, so the timing is set by the building: a room not yet relying on it, a shutdown window on a working site, a stock move planned for a cold room, a live server room changed over without losing cooling (the trade facts timing cells for installation, commercial systems, server rooms and cold rooms). What the work gives them: a system in and commissioned while the building can spare it. No dates, nothing about summer being busy or lead times stretching, no promise about the weather. FAQ: When is the best time of year for [SERVICE_LOWER], and how long does it take? (Timing): From the trade facts timing row only: the rows give no season and no duration for fitting a system, so say what sets the timing (when the room or the building can spare it, a shutdown window, a stock move) and what decides how long it takes (the units, the route, the access). No dates, no lead times, no promise about the weather. This is the one place the timing is written.

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (the problems the town's buildings have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the niche steps. The briefs are town wide, not per category: the town profile (the pack's section 3 anchors: building types, the commercial mix, exposure), the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose. No seasonal swap and no symptom question on a location page. The type is the client's (A). Placeholders: `[WORK]` the primary category's work noun, `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town.

- A niche with no section here has its location pages refused: "no location block briefs for hvac".

### Type A (project trade: the client's type is A)

The pack's section 3 for a town: anchors are buildings, occupiers and exposure (loft rooms and top floors, flats needing the freeholder's agreement, period terraces, new estates with mechanical ventilation, restaurant streets, business parks, food retail, coastal salt air, busy roads, dense streets), and every anchor must change the work; never that a town's buildings are overheating, unhealthy or full of mould, never an invented temperature record, never a system in a named building unless research confirms it.

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Rooms under the roof that hold the heat | the town's housing: loft rooms and top floors the sun gets into | Loft rooms, top floor flats and rooms behind big glass that stay warm into the night. The one cause this card makes: the town's housing, which the town profile gives (loft conversions, top floor flats, new build estates with their mechanical ventilation, glass fronted offices). Say what the housing means for the work in plain words: where a unit can go in a loft room, what a top floor flat needs agreed before anything is fitted, what a new estate's ventilation unit needs looking after; never that the town's homes are overheating or unhealthy (the pack's local detail rule). Not the heat gain of one room: the service pages own that. |
| Nowhere obvious for the outdoor unit | buildings that limit where the outdoor unit can sit | Period terraces where the pipe run is long and the back wall is the only wall, flats where the unit must go on a balcony or the roof, streets where a unit on the front would be seen from the road. The one cause this card makes: buildings that limit where the outdoor unit can sit, from the town profile (the terraces, the flats, the conservation areas, only where the profile confirms them). What usually applies, with "usually" and never an Order's name: a flat's freeholder has to agree first; in a conservation area or at a listed home the unit's position is settled with the council before it is fitted. Say what it means for the route and the noise to the neighbours. Not the sizing: the service pages own that. |
| Salt, traffic and the outdoor coil | the town's air loading the coils and the filters | Outdoor units that corrode early near the sea, filters that clog early on a main road, units whose noise carries on a dense street. The one cause this card makes: the town's air loading the coils and the filters, from the town profile only (the coast, the busy roads, the tight streets). Every anchor changes the work: salt on the outdoor coil means it is looked at more often and the fins kept clean; a main road means the filters are checked sooner; a tight street means the outdoor unit's position is chosen for the neighbours. Not the servicing schedule itself: the servicing page owns that. Never a local temperature record. |
| Kitchens, shops and server rooms on the high street | the town's commercial mix and what each building asks of its system | Restaurant streets whose canopies fill with grease as the hours run, food shops with cold rooms holding stock, offices and business parks with a server room that must not stop. The one cause this card makes: the town's commercial mix and what each building asks of its system, from the town profile only. Say what each means for the work (the canopy cleaned to a risk based band, the cold room's temperature held and alarmed, the server room's cooling changed over without losing it), as what the work meets and never as a judgement on anyone's system. Homes and businesses never in one sentence; this card leads commercial only where [CV: customer_types] says so. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Where the outdoor unit can go | A terrace with no side access, a flat where the unit goes on a balcony or the roof, a wall only reached from height: the outdoor unit's position and the access to it move the price (the trade facts price rows). From the town profile where it gives the housing. No figure. |
| Long runs through older houses | Period houses where the pipe and drain route is long or has to be hidden, and a pump where the drain cannot fall (the price rows). From the profile where it gives the housing era. Say why a long or concealed route costs more time. |
| Permissions and the neighbours | Where the town has conservation areas, listed homes or many flats, the planning or noise work and the freeholder's agreement before a unit is fitted add time. "Usually", never the Order's or the area's official name. From the dossier rules only. |
| Working round a business's hours | Commercial premises where the changeover waits for a shutdown window, a live room kept cool while the plant is swapped, stock moved before a cold room is touched (the price rows). Only where the profile gives the commercial mix; work outside opening hours only from the confirmed practices. No figure. |

**Steps.** The niche steps (Tell Us About the Room or the Building; We Survey and Price the Job; We Fit It on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (where the outdoor unit can go, the route, permissions) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. A maker's warranty only from [CV: manufacturer_warranty]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends (which rooms, the unit's label, photos), what the business looks at (the room's heat, the route, the power, the drain), what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Is there a best time of year for [WORK_LOWER] work in [TOWN]? | The reason in the system, from the trade facts timing cells: a service before the hot weather, because the filter, the coil and the drain are then asked to do their most and a slow leak shows as a unit that cannot keep up; fitting a system has no closed season in the rows. Where the town profile gives the exposure (salt air on the coast, a main road), say what it does to how often the outdoor coil and the filters are looked at. Nothing about summer being busy or lead times. No dates, no promise about the weather. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

For the client (no client value carries these today, so the briefs say "from the client values only" or leave the claim out):
1. Which reader leads: homes, businesses or both? The pack writes the same service for each but never in one sentence; the briefs read [CV: customer_types] for it. A client who is mostly commercial still gets the type A briefs, since the pack maps the whole trade to A and there is no commercial type to key fears_by_type or faq_slots_by_type to.
2. The company's refrigerant handling certificate (issuer and number) and the engineers' individual categories. The briefs state the certificate as what usually applies to anyone doing sealed system work and point this business's own at [CV: credentials]; a field of its own, verified by Ray on the register, would be cleaner.
3. Does the business take breakdown call outs on commercial refrigeration, cold rooms and server rooms, and in what hours? Written only from [CV: emergency_callouts], never with a response time. If a client sells those call outs, the pack's own note says the A plus emergency marker may fit the site better: that would mean flagging those pages emergency in hvac.csv and writing an emergency variant, which this entry does not have.
4. Does the business offer a servicing plan or a maintenance contract, and at what interval? The briefs name a plan only where the services list has one and a frequency only from [CV: visit_frequency_options].
5. Which makers does the business fit, and does it hold a partner approval with any of them? The manufacturer warranty and its servicing condition come from that maker's own terms; the facts pack verified only two makers' wording and says the rest must not be generalised.
6. Does the business do the electrical work itself under a scheme registration, or bring in a registered electrician for a new circuit? The cost and rules briefs say only that a new circuit is notifiable work.
7. Does the business take heating mode (reversible units) and heat pumps? The pack keeps heating out of this niche; the heat pump rows in hvac.csv alias to pages defined in plumbing-heating.csv.

For Ray and the trade facts pack (Table G records most of these as not found; the briefs give no figure):
8. A duration for any job in this trade: every Table A timing cell reads "varies; no standard", so every timing and "how long" brief says only what decides it.
9. A season for anything other than a servicing check before the cooling season: Table A gives none, so the install and ductwork timing is written as when the building can spare the system.
10. A framing for Commercial HVAC installation and Commercial refrigeration installation: the pack's section 2 lists their maintenance side (schedule led) and refrigeration repairs (problem led) but says "when new" only of Server room cooling and Cold rooms, so those two page rows are not flagged desire led and read the schedule led line of the block 4 briefs. Ray or Brandon to confirm.
11. The second reader's fears as a slot: the pack's commercial and food readers (downtime, records, stock at temperature, insurers) have no business type to key `fears_by_type` to, so the homepage fears are the homeowner's with the regas and the price fears shared. A way to key fears and FAQ overrides by [CV: customer_types] rather than by type would carry them.
12. A servicing interval the copy may state: Table E says there is no universal legal interval and the maker's instructions, the warranty and the statutory leak checks (banded by the gas held) are separate things; the briefs never give a number.
13. Whether a client's ventilation work falls under a competent person scheme or the building control route: Table C names both; the rules brief says only that the work is notified through one of them.
14. The pack's header still says verified: no; the service page gate refuses a run until it is verified on the Trade facts screen.
15. The freeholder's agreement before an outdoor unit goes on a flat: the calibration pack states it as a principle (sections 3 and 4) and the briefs carry it with "usually", but the facts pack has no row for it. A Table C row would let the briefs point at it like every other rule.
