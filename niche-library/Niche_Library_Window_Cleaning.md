# Niche Library Entry: Window Cleaning

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/window-cleaning.json`; this file is the same content for people, kept in the same commit. The model never sees the slot names, only the resolved words.

Sources, in order: `calibration-packs/Window_Cleaning_Calibration_Pack_v1.md` (the three readers, type B across the site, the split of round work from periodic extras, the craft rules, what fails), `trade-facts/window-cleaning.md` (Tables A to G; every brief points at its rows and states no figure of its own), `niche-library/window-cleaning.csv` (the page targets: five pages of its own and the aliases to pages the Cleaning, Pressure Washing and Roofer libraries define), `fillout/services/window-cleaning.json` (the client's category tabs, the lookup keys).

Business type defaults to **B (recurring)** for every category (the pack, section 2: type B across the site). The pack splits one GBP category by service group; the Fillout form gives three tabs (Window Cleaning Service, Pressure Washing Service, Gutter Cleaning Service) and all three read the B briefs, so `category_types` is empty. The split inside B is written into the briefs, not the type:

- **Round work** (the rhythm, and what a regular visit keeps on top of): residential window cleaning, commercial window cleaning, sign and canopy cleaning, bin store cleaning, high level window cleaning on a schedule.
- **Periodic extras** (the sign the customer sees, its cause, what the visit covers; usually once or twice a year, often booked by round customers): conservatory cleaning, fascia and soffit cleaning, cladding cleaning, solar panel cleaning, gutter cleaning, driveway and patio cleaning, and the render, decking, roof and graffiti aliases.

No page is desire led (the pack's section 2 names none, so `window-cleaning.csv` carries the `desire_led` column blank on every row and there is no `desire` variant). No emergency variant: the library flags no page. Not a seasonal niche (the pack: window cleaning runs all year; pollen and sap in spring, leaves in autumn gutters are used where a brief asks for timing). A client hand set to type A reads `fears_by_type.A` and `faq_slots_by_type.A` on the homepage and has no block briefs in this entry.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Window Cleaning / window cleaning |
| trade_person / trade_person_plural | window cleaner / window cleaners |
| homepage_keyword | Window cleaner (4 Nov 2026, Brandon: the homepage keyword is a way of saying the primary GBP category, picked on search volume; the H1 research pattern and the thin runner read it) |
| customer_type | homeowners, landlords and local businesses |
| unit_of_work | visits |
| emergency_niche | no |
| big_ticket | no |
| schema_subtype | LocalBusiness (schema.org has no window cleaning subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| windows, glass, frames, sills, doors, upstairs windows, inside and out, conservatory, conservatory roof, roof windows, gutters, fascias, solar panels, shopfront, sign, streaks, spots, drips, green on the frames, cobwebs, bird marks, side gate, round, visit, pole, purified water, ladder | spotless, gleaming, pristine, soiling, soiled, elevations, glazing, facade, fenestration, operatives, property, premises, WFP, TDS, reach and wash, kerb appeal, curb appeal | sparkling, crystal clear, streak free guaranteed, guaranteed streak free, streak free guarantee, repels dirt, spotless finish, let the light in, window cleaning solutions, see the world more clearly (the pack's section 7: the words that stand in for the reason the glass dries clean, and the promises a clean cannot keep) |

Exceptions (`words_avoid_exceptions`): `glazing`: allowed as glazing bars on a conservatory page, where it is the customer's own word for the strips between the roof panels; `premises`: allowed on a commercial page where the reader is a managing agent or a site manager and premises is their own word; `property`: allowed once on a commercial page where a managing agent's block is meant.

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about your windows and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about your windows and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency pages in the library) |

## Steps (homepage, type B)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About Your Windows**
   Brief: How to get in touch and what is useful to send first (the house or the premises, how many floors, whether there is a conservatory or roof windows, whether the inside glass is wanted, anything awkward to get to, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Agree the Visit and the Price** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: What a visit will cover (the glass, the frames, the sills and the doors on a window round; a conservatory roof, gutters, fascias or solar panels only where the services list has them) and what it costs. The price agreed before the first visit only when the price_agreed_before_work practice is confirmed. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it). A frequency only from [CV: visit_frequency_options]; payment by card or app, a message the day before and the same window cleaner each visit only from the confirmed ticks, never as this client's practice otherwise.
   Without the practice (`step_2_no_visit`): **We Agree What's Covered and the Price**
   Brief: Say what the visit covers is agreed window by window where it matters (inside or out, frames and sills, a conservatory roof or gutters as extras only from the services list) and the price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it). A frequency only from [CV: visit_frequency_options].
3. **We Start on a Date That Suits You**
   Brief: The first visit goes in the diary on a day that suits the customer; a regular round following on only when the maintenance_schedule practice is confirmed, with a frequency only from [CV: visit_frequency_options]. Whether the customer needs to be in, the side gate and keys only from [CV: access_handling] and the customer_need_not_be_home practice. Say honestly that a first clean on frames that have gone a long while can take more work than the visits after it, because what is held in the frames runs on to the glass until it has been washed out. Never mention the price or changes to what is covered (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → insurance (no manufacturer warranty in this trade) |
| fears (in order, one per Why choose us point; the pack's section 1, the householder on a round) | 1. streaks, drips and spots left on the glass once the window cleaner has gone; 2. a round that fizzles out, with visits missed and no word why; 3. someone they do not know going round the back of the house, and a side gate left open; 4. ladders leant on the conservatory or the gutters, or someone stood on the roof panels |
| fears_by_type.A (a client hand set to A reads these instead: the one off customer with a conservatory roof, gutters or panels) | 1. a worker stood on the conservatory roof, or walking across the solar array, to reach the far side; 2. a blade, a stiff brush or a jet wash that scratches the glass or dulls the panels; 3. a price that grows once the van has arrived; 4. dirty water and debris left running down the walls and over the drive when the job is done |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the facts pack's Table D: none of these is a licence to clean windows (no general window cleaner licence exists in England; Scotland differs), so each reads as the evidence it is.

- **Ratings (always first):** Google (needs review_count 5+), Checkatrade, Trustpilot, Which? Trusted Traders.
- **Tier 1, trade bodies:** Federation of Window Cleaners (FWC); FWC Safety Accredited Member (SAM). FWC membership says members carry liability insurance; SAM is the safety accreditation, optional for sole traders and small teams.
- **Tier 2, training and access cards, procurement schemes:** British Window Cleaning Academy (BWCA) training; IPAF PAL Card (powered access); IRATA (rope access); PASMA Towers for Users; Ladder Association LadderCard; CHAS; Alcumus SafeContractor. A card shows training for that kit, never that the kit suits the job.
- **Tier 3:** Glass and Glazing Federation only as a reference, never as a cleaning certification; a basic DBS check only as the client values confirm it (a check, not a membership); chamber of commerce, local press features: Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible window cleaning example (a plant pot knocked over, a mark on a sill) that does not suggest carelessness. Never say a broken or cracked pane is covered unless the client values say so (the trade facts broken glass and insurance row: whether a claim pays depends on the policy's terms). | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee is confirmed. Start with yes, then the terms from [CV: guarantee_scope] (a return visit, what it covers, how soon the customer has to say). Never a promise the glass stays clean, never a streak free guarantee in those words unless guarantee_scope says exactly that. Never written as something that replaces the customer's rights. | no | Trust |
| faq_3_none | What happens if something isn't right after a visit? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the 'reasonable care and skill' standard every trade works to, as the standard the work is held to, never as a defence (the trade facts consumer services row: the standard is how the work is done, not a promise the glass never gets dirty again). No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. A one off job with a date (a conservatory before a party, a shopfront before an opening) only as start_time allows; never a same day or a next day claim unless [CV: same_day_available] is yes. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How often should windows be cleaned? | What decides it, in plain words: what settles on the glass and the frames between visits (traffic film by a main road, sap and pollen under trees in spring, salt near the coast, bird marks), how the house faces and how the household wants it kept. The trade facts round interval row found no standard gap, so no number is ever given as the usual: a frequency only from [CV: visit_frequency_options]; otherwise say the pattern is agreed with you and nothing more. Never promise a schedule. | no | Timing |
| faq_B | Why do my windows look streaky or spotty soon after they've been cleaned? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words, from the trade facts what goes wrong and facts rows: tap water drying on the glass and leaving its minerals behind as white spots; dirt held in the frames, the sills and the seals that the next shower carries down over the pane; grit rubbed across the glass by a cloth or a blade, which marks rather than cleans. Then what the local factor adds (hard water, a main road, trees, the sea), then what a proper clean does about each: water stripped of its minerals, the frames washed with the glass, nothing abrasive on the pane. Blame the method, never the customer's effort. Never promise the glass stays clean after rain (the rain after cleaning row). | **yes** | Process |
| faq_C (fallback) | Do you use ladders? | From the trade facts ladder and pole rows only: ladders are not banned in this trade and their use follows an assessment of the job; most upstairs windows are done from ground level by pole where the window can be seen and reached safely, and a ladder is kept for short jobs a pole cannot do, secured where it can be. Written as how good window cleaning is done; this client's own kit only from [CV: materials_methods]. Never a reach figure, never a time limit on a ladder, never anything that reads as the customer going up themselves, never a conservatory roof walked on. | no | Process |
| faq_D (fallback) | Can you clean the windows if I'm not in? | From [CV: access_handling] and the confirmed practices only (customer_need_not_be_home): whether the customer needs to be in, the side gate, keys for a commercial site. When nothing is on file, say the arrangements for getting in are agreed before the first visit and nothing more. A note or a message when no one was home, payment by card or app, only from the confirmed ticks. Never a key policy, vetting or a DBS check stated as fact unless the client values confirm it. | no | Process |
| faq_E (fallback) | Will you need to walk on the conservatory roof or the solar panels? | Used only when the client's services list carries the conservatory cleaning or solar panel cleaning page. No: from the trade facts conservatory roof access and walking on panels rows, a glass or polycarbonate roof is never treated as something to stand on and a panel is never walked on, because pressure on the cells can crack them. The roof or the array is reached from the ground or from assessed access, a soft brush and purified water doing the work (the stages rows), with the gentler method polycarbonate and self cleaning glass ask for. Never a figure, never a warranty claim, never a promise about what the panels will generate. | no | Trust |

Sources for faq_A to faq_E: the pack's section 1 and 6 (the questions people search for about their own windows) and the facts pack's Table E rows. Replace with real customer questions when Brandon or the client supplies them.

### Type A homepage overrides (faq_slots_by_type.A)

A client hand set to type A (one off exterior jobs) reads these in place of the shared slot of the same name. Every other slot stays as above.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_A | How long does a one off clean take? | The trade facts timing rows give no duration for any job (they say it varies), so give what decides it in plain words: how many panes or how big the roof, the array or the roofline, how heavy the build up is, how the glass is reached. Nothing about when the job can start unless [CV: start_time] is set. Never a number unless [CV: typical_jobs] gives one. | no | Timing |
| faq_D (fallback) | What happens to the dirty water and the debris? | From the trade facts stages and the pollution rows only: leaves, moss and silt out of a gutter are collected; wash water from a bin store or cladding is kept out of the surface water drains; a pure water rinse off glass is water stripped of its minerals and nothing added. Whether the debris leaves with the business only from the waste_removal practice and [CV: waste_carrier_registered]; otherwise say it is cleared or left as agreed. Never a product name, never a permit's name. | no | Process |

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`). The "Other" group carries the trust details the pack's section 7 bans as unconfirmed practice (card or app payment, a message the day before, the same window cleaner each visit, a note when nobody is home): a ticked item counts as confirmed for the validator and the claims reviewer alike.
- Methods: water fed pole with purified water / traditional mop and squeegee by hand / inside windows cleaned / frames, sills and doors washed every visit
- Water: purified water made up on the van / water treated by reverse osmosis and resin / customer's outside tap used with a protected connection
- Access: pole from the ground for upstairs windows / ladders for windows a pole cannot reach / powered access platform for high glass / rope access for high glass / gutter vacuum worked from the ground
- Extras: conservatory roofs / solar panels / gutters cleared / fascias and soffits / cladding / signs and canopies / bin stores
- Other: side gates closed and checked / a note or a message when no one is home / a message the day before a visit / card or app payment / same window cleaner each visit / DBS checked staff / uniformed staff / key holding for commercial sites / debris taken away

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

window cleaning, water fed pole, pure water, purified water, reach and wash, traditional window cleaning, squeegee, inside window cleaning, interior window cleaning, exterior window cleaning, residential window cleaning, commercial window cleaning, shopfront cleaning, high level window cleaning, rope access, cherry picker, powered access, conservatory cleaning, conservatory roof cleaning, fascia and soffit cleaning, fascia cleaning, soffit cleaning, gutter cleaning, gutter clearing, gutter vacuum, solar panel cleaning, cladding cleaning, render cleaning, sign cleaning, canopy cleaning, bin store cleaning, pressure washing, jet washing, soft washing, roof cleaning, moss removal, driveway cleaning, patio cleaning, decking cleaning, graffiti removal, skylight cleaning, roof window cleaning, glass cleaning, mirror cleaning, frame cleaning, sill cleaning, uPVC cleaning, builders clean, post construction window cleaning

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| glass and mirror cleaning | window cleaning |
| window washing | window cleaning |
| interior and exterior window cleaning | inside and outside window cleaning |
| residential window cleaning | residential window cleaning |
| domestic window cleaning | residential window cleaning |
| commercial window cleaning | commercial window cleaning |
| industrial window cleaning | commercial window cleaning |
| shopfront | commercial window cleaning |
| high-level access cleaning | high level window cleaning |
| high level | high level window cleaning |
| rope access | high level window cleaning |
| rooftop/skylight cleaning | roof window cleaning |
| skylight | roof window cleaning |
| conservatory cleaning | conservatory cleaning |
| conservatory roof | conservatory cleaning |
| fascia and soffit cleaning | fascia and soffit cleaning |
| fascia | fascia and soffit cleaning |
| gutter cleaning | gutter cleaning |
| gutter clearing | gutter cleaning |
| gutter vacuum | gutter cleaning |
| solar panel cleaning | solar panel cleaning |
| solar | solar panel cleaning |
| cladding cleaning | cladding cleaning |
| render cleaning | render cleaning |
| sign cleaning | sign and canopy cleaning |
| canopy cleaning | sign and canopy cleaning |
| bin store cleaning | bin store cleaning |
| power/pressure washing | pressure washing |
| pressure washing | pressure washing |
| jet washing | pressure washing |
| roof cleaning | roof cleaning |
| soft wash cleaning | soft washing |
| soft washing | soft washing |
| patio cleaning | driveway and patio cleaning |
| driveway cleaning | driveway and patio cleaning |
| decking cleaning | decking cleaning |
| graffiti removal | graffiti removal |
| blind cleaning | (never named) |
| carpet | (never named) |
| office cleaning | (never named) |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a customer uses, in the order code picks them (after the client's jobs_wanted), keyed by the client's category tab names (lower case). The pages themselves are defined across four libraries: the five window cleaning pages in `window-cleaning.csv`, the rest as aliases to `cleaning.csv`, `pressure-washing.csv` and `roofer.csv`. JSON slot: core_services.

- Window Cleaning Service: residential window cleaning, commercial window cleaning, conservatory cleaning, gutter cleaning, solar panel cleaning, fascia and soffit cleaning
- Pressure Washing Service: driveway and patio cleaning, roof cleaning, soft washing, cladding cleaning, render cleaning
- Gutter Cleaning Service: gutter cleaning, fascia and soffit cleaning, conservatory cleaning

Service words for the whole job rather than one service: window cleaning, window cleaner, regular window cleaning, window cleaning round, exterior cleaning. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: limescale, hard water spots, moss, algae, bird droppings, graffiti removal. When an FAQ question names the job as well as the problem ("Will cleaning get the limescale off my conservatory roof?"), it goes to the job's page (conservatory cleaning), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices (`niche-library/practices.json`, shared by all niches). The briefs in this entry name: price_agreed_before_work, site_visit_before_quote, maintenance_schedule, customer_need_not_be_home, waste_removal. The window cleaning specific promises (frames and sills every visit, side gates closed, a note or a message when no one is home, a message the day before, card or app payment, the same window cleaner each visit, DBS checked staff, key holding) are ticks in the materials and methods list above until practices.json carries them. Nothing in a brief states a frequency, inside cleaning, payment method, reminders, vetting or the same cleaner as fact without one of these (the pack's section 7).

## Onboarding questions this niche needs

The cost, "how often" and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every window cleaning client for:
- a "from" price for 3 typical jobs (e.g. a regular visit on a three bed semi, a conservatory roof clean, a gutter clear on a two storey house);
- the visit patterns offered ([CV: visit_frequency_options]) and whether the round is agreed before the first visit;
- how access is handled ([CV: access_handling]): side gates, keys for commercial sites, whether the customer needs to be in, what happens when a gate is locked;
- the methods and kit ([CV: materials_methods]): water fed pole or traditional, inside glass, how high the pole reaches in storeys, ladders, gutter vacuum, a platform or rope access for commercial work, whether frames and sills are done every visit;
- how customers pay (card, app, cash) and whether a message goes out the day before; whether the same window cleaner comes each time;
- for commercial work, whether visits run outside opening hours ([CV: out_of_hours_available]);
- whether debris from gutters and bin stores is taken away ([CV: waste_carrier_registered]).

## Section 5 alternative titles (why_titles_alt)

Type B:
1. Consistency → **Regular Visits, Not One Big Clean**
2. Cover → **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]", keyed by the client's category tab names (lower case): window cleaning service → window cleaning, pressure washing service → exterior cleaning, gutter cleaning service → gutter cleaning. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps, the FAQ slots and, with `seasonal_trade` on, the one card and one FAQ that swap in. Placeholders: `[CAT]` the page keyword without the town, `[CAT_LOWER]`, `[WORK]` the work noun, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises.

- `seasonal_trade`: no (the pack: the work runs all year; no seasonal swap).
- `category_types`: empty. Every category (Window Cleaning Service, Pressure Washing Service, Gutter Cleaning Service) reads the B briefs, and each brief says how it reads on the Window cleaning, the Exterior cleaning and the Gutter cleaning category.
- A niche with no section here has its category pages refused: "no category block briefs for window-cleaning".

### Type B (every category)

The pack's section 2 inside type B: round pages are the rhythm and what a regular visit keeps on top of; periodic extras are the sign, its cause and what the visit covers; a commercial page is what slips when the schedule lapses and what a visit takes in around trading hours; a high level page is how the glass is reached and what builds up where nobody looks closely. The four cards below cover the four, and every brief says which pages read it which way. The craft rules the briefs lean on: the cause goes in the water, the glass or the frames; the method is named with what it does and never as better; ground first, height only when it is needed and never as this client's kit; a clean cannot fix misting, scratches or etching.

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Spots back on the glass after the first shower | dirt held in the frames and sills washing down the glass | Round pages (the Window cleaning category: residential, commercial, sign and canopy): what the customer sees, from the trade facts signs rows in their words (water spots, bird marks, grit on the panes, dirty frames), glass that looks fine for a few days and then marks up in the rain. The one cause this card makes: dirt held in the frames, the sills and the seals, which every shower carries down over the pane (the rain after cleaning row: rinse water stripped of its minerals dries without marks, but later rain still brings down whatever sits above the glass). What a regular visit does about it: the frames and the sills washed with the glass each time, so there is less to run, written as how good window cleaning is done and as this client's practice only where the frames and sills tick is confirmed. On the Exterior cleaning (Pressure Washing Service) or Gutter cleaning category the card reads as what the rain carries down the wall: streaks under a gutter that spills, dark runs down render or cladding (the fascia and cladding signs rows), the same cause, dirt held above washing down. Not tap water drying white: the symptom FAQ owns that. Never a promise the glass stays clean, never a lifestyle line about the view. |
| Green creeping over the roof, the frames and the sills | algae and moss settling where a surface stays damp and shaded | Periodic extras: roof panels gone green or cloudy, grime along the glazing bars, green patches on the roofline, a green film on cladding, the shaded side of a patio dark and slippery, from the conservatory, fascia and cladding signs rows. The one cause this card makes: algae and moss settling wherever a surface stays damp and shaded (under trees, the north side, a roof at a shallow pitch, a sill the sun never reaches). What the visit covers, from the trade facts stages: loose debris comes off first. Then the frames, the roof and the bars are washed by pole, a soft brush and purified water doing the work. Nobody stands on the roof (the conservatory roof access row). Polycarbonate and self cleaning glass get the gentler method their maker asks for (the polycarbonate and self cleaning glass rows), and a pressure wash only where the surface and the job allow it. Say why these are booked once or twice a year rather than on the round: the growth comes back slowly, so round customers add them to a visit when the sign shows. On a round page the card reads as the frames and sills going green on the shaded side between visits, the same cause. No pressure figure, no interval as this client's offer (only from [CV: visit_frequency_options]). Never promise it will not come back. |
| Upstairs glass nobody gets close to | windows out of easy reach cleaned less often, or never | Round, high level and commercial pages: upper panes noticeably dirtier than the ground floor, marks left above where a pole reached before, staining round glass nobody can get near, dusty upper windows on an office or a shop (the high level and commercial signs rows). The one cause this card makes: windows out of easy reach are cleaned less often, or never, so what lands on them stays and bonds, and bonded grit needs a more careful clean later (the skipped rows). How good work reaches them, from the trade facts stages and facts rows: from the ground with a pole wherever the window can be seen and reached safely, a ladder kept for short jobs a pole cannot do and secured where it can be, and on a commercial building an assessed platform, cradle or rope access chosen by the assessment and never by a set height. Written as how the trade works, never as this client's kit unless [CV: materials_methods] confirms it. Never a reach figure, never a time limit on a ladder, never a line that reads as the customer going up themselves, never a conservatory roof or a flat roof walked on. On the Exterior cleaning or Gutter cleaning category the card reads as the roofline and the gutters out of reach, with a gutter vacuum worked from the ground where the gutter suits it, the same cause. |
| A schedule that lapsed | the gap between visits longer than the build up | Commercial, sign and bin store pages: the shopfront marked by opening time, fingerprints on the door glass, a sign dulled, a bin store that smells and draws flies between collections (the commercial, sign and bin store signs rows). The one cause this card makes: the gap between visits longer than the build up, so every clean has become a catch up. What a regular visit takes in around trading hours (the front glass, the door, the frames, the sign, with the upper floors on a longer cycle) as what usually happens; visits outside opening hours only from [CV: out_of_hours_available]. A bin store washed and disinfected after the products have been assessed, with the wash water kept out of the surface drains (the bin store stages and the contaminated wash water row), never a product name. On a residential round page the card reads as the first visit after a long gap: a bigger job, because the frames hold what has built up and it runs on to the glass over the first clean or two (say so honestly), and then each visit is shorter. On the Gutter cleaning category the card reads as a gutter overflowing in a downpour, weeds sprouting from it, a downpipe that no longer drains (the gutter signs row). Same cause: the gap since the last clear was longer than the leaves and moss took to fill it. The consequence from the skipped row: a wet wall, soaked brickwork, damp indoors. The manufacturer's guidance (a clear at least once a year, more often under trees) is given as guidance and never as a rule. A frequency as this client's offer only from [CV: visit_frequency_options]. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How many windows, and how high | More panes and more sides of the house, a second or third floor, roof windows, a conservatory, a long roofline or a big array, from the trade facts price rows (more panes or elevations, a larger glazed area, several roof levels). Say it plainly and give no figure, never a height. |
| How often we come | A regular round means each visit is shorter, so the price per visit is lower than an occasional big clean; the first visit on frames and glass left a long while is the bigger job, and after that each visit is priced as a visit. Give no pricing basis beyond that (nothing priced on time, no hourly rule). A frequency only from [CV: visit_frequency_options]; no promise of a schedule otherwise. |
| Getting to the glass | No side gate, so the back is reached through the house or a rear alley; the van parked some way off on the end of a long hose; high glass that needs a platform, a cradle or rope access; a busy pavement outside a shop where people have to be kept clear of hoses and poles, from the trade facts price rows (obstructed access, occupied pedestrian routes, specialist access, restricted hours). Say why each adds time. No figure, never a height. |
| What's added to the visit | The inside glass, the frames and sills, a conservatory roof, the gutters and fascias, solar panels, a bin store: the extras the trade facts price rows name (frames included, roof glazing and bars, blocked downpipes, disinfection). From the card list and the services list only; a sibling service page linked where LINKABLE PAGES has one. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Tell Us About Your Windows**
   Brief: How to get in touch and what is useful to send first (the house or the premises, how many floors, a conservatory or roof windows, whether the inside glass is wanted, anything awkward to reach, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Agree the Visit and the Price**
   Brief: What a visit will cover and what it costs. The price agreed before the first visit only when the price_agreed_before_work practice is confirmed. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free". A frequency only from [CV: visit_frequency_options]; card or app payment, a message the day before and the same window cleaner each visit only from the confirmed ticks.
3. **We Start on a Date That Suits You**
   Brief: The first visit goes in the diary on a day that suits the customer. A regular round following on only when the maintenance_schedule practice is confirmed. Whether the customer needs to be in, the side gate and keys only from [CV: access_handling] and the customer_need_not_be_home practice. Never mention the price or changes to what is covered.

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the first visit when that practice is confirmed. The cost cards hold the list: never repeat it or point to it. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER]? | Start with yes, then the terms from [CV: guarantee_scope] (a return visit, what it covers, how soon the customer has to say). Described, never promised, and never as something that replaces the customer's rights. Never a promise the glass stays clean or a streak free guarantee in those words unless guarantee_scope says exactly that. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers, and never that a broken or cracked pane is covered unless the client values say so (the trade facts broken glass and insurance row). | Trust |
| cover | always | What if something gets damaged during a visit? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| scope | always | What does a [WORK_LOWER] visit include? | The jobs named from the card list, said as a visit: the glass, the frames, the sills and the doors on a window round; the roof, the gutters, the fascias or the panels on an extra. Name the work itself, never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list. The inside glass only from the services list or the confirmed ticks. Link one service page. What is not included only from the services list. | Fit |
| process | always | How do regular visits work? | From the confirmed practices only: whether the customer needs to be in (customer_need_not_be_home), the side gate and keys from [CV: access_handling], how the visit is agreed. A message the day before, a note when no one was home, card or app payment and the same window cleaner each visit only from the confirmed ticks. A frequency only from [CV: visit_frequency_options]. Never promise a schedule. | Process |
| timing | always | Can you clean windows in the rain, or in winter? | From the trade facts timing cells only: the work runs all year, and a visit stops for high wind, lightning and the days the rinse water would freeze on the paths. Rain on its own does not spoil a purified water clean, because the rinse dries without leaving minerals behind; what marks glass after rain is dirt from the air and the frames, said without a promise (the rain after cleaning row). Where the page carries the extras, the seasons that bring them on: sap and pollen on the glass in spring, leaves in the gutters once they have come down in autumn, a conservatory roof green by the end of a wet winter. No dates, no promise of a slot, never 'our busy season'. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue (hard water, a main road, mature trees, salt off the sea, housing with high or awkward glass), answered as asked: the cause in the water, the glass or the frames in plain words, what the local factor adds, then what a regular visit does about it. One figure at most. Never a claim that the town's homes have dirty windows, never a water hardness the research does not confirm. | Process |

**Seasonal swap:** none (`seasonal_trade` is off).

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts; every window cleaning row gives six) and the role based set below is the fallback when the pack gives fewer than 6 (F-ITEMS-GENERIC); block 4 (B: when it's time for a visit) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps, the FAQ slots (B: frequency, cost, cover, access, scope, plus rules where the service has rule rows) and the symptom question. The service's own trade facts rows (`trade-facts/pack.js rowsForService`) are the material every brief points at, so one type B entry serves a window round, a conservatory roof and a bin store alike. Placeholders: `[SERVICE]` the page keyword without the town, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for window-cleaning".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).
- No desire variant: the library flags no page desire led. No emergency variant.

### Type B (every category)

Round pages read the cards as what shows between visits and what a regular pattern changes; periodic extras as the sign the customer has watched build and the season the extra is usually booked in; commercial pages as what a customer walking past sees and the visit around trading hours.

**What's Included.** H2: What's Included in a [SERVICE] Visit. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Checking the access and the glass first | The first stage of a visit from the trade facts: the access, the kind of glass or roof material, what is near it (electrics, a pavement, a fragile roof), what has changed since last time. A part of the visit, not a promise. |
| Setting up the water and the kit | The prepare water and equipment stage from the trade facts methods cell: purified water through a pole, or a hand mop and a squeegee, chosen for the window. A named system or how the water is made only from [CV: materials_methods]. Never a figure for the water. |
| Protecting what's around the work | The protect the working area stage from the trade facts: the path and the beds, the shop doorway kept clear, a route for passers by, the drains on a bin store or cladding job. Name only what the rows give. |
| Loose dirt and debris off first | The remove loose debris stage from the trade facts: leaves off a conservatory roof, the gutter cleared of leaves, moss and silt, loose dirt off a sign or a panel, before anything is washed. |
| The main clean | The central stage from the trade facts, named as the trade names it: the glass and the frames washed by the method chosen for the window, the roof and its bars, the panel, the fascia run, the gutter outlets. Detergent only where the method uses it (the pure water method row: a purified water rinse adds none; other methods may). |
| Rinse, and a check for marks | The rinse or squeegee stage and the check for remaining marks from the trade facts: a final rinse with purified water left to dry, or the squeegee by hand; outlets and downpipes checked on a gutter visit; the condition noted on a panel job. No promise about the result. |
| Leaving it as we found it | The last stage from the trade facts: barriers and hoses away, the path cleared, the area handed back. The side gate closed, a note or a message when no one was home, a cracked pane mentioned, only from the confirmed ticks; otherwise say the area is left as it was found. |
| The visit pattern you choose | Only from [CV: visit_frequency_options]; when it is blank, write that visits follow the pattern agreed with you and name no frequency. |

**Block 4, when it's time for a visit.** H2: When It's Time for a [SERVICE] Visit

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The first signs | the job left undone | The things a customer notices first, from the trade facts signs row for this service, in their words: water spots and bird marks, dust on the panes, a green or cloudy roof, panels that have dulled, a gutter that spills in heavy rain, a smell between bin collections. The one cause this card makes: the job left undone. Round pages: what shows between visits. Periodic extras: the sign the customer has watched build for months. Commercial pages: what a customer walking past sees. Then what it leads to if left, from the skipped row: grit that bonds so the next clean has to be gentler, water running down the wall, output that can fall on a soiled panel ('can', no figure). Specific, never alarming, never 'your windows are dirty'. |
| It got worse after a go with the hose | tap water's minerals and a tool wrong for the surface | The customer's own attempt, from the trade facts done badly and facts rows: tap water from a hose that dried into white spots, a stiff brush or a blade that scratched the glass, a solvent restorer that marked a uPVC frame, a jet wash across a polycarbonate roof. The one cause this card makes: tap water's minerals and a tool wrong for the surface. Blame the method, never the customer's effort. What the visit does differently: water stripped of its minerals, a soft brush, and the maker's own method for coated glass, polycarbonate and panels (the leaded glass, uPVC and polycarbonate rows). Never a water figure, never a product name unless [CV: materials_methods] gives it. Not frame dirt running down the glass: the category page owns that. |
| A clean that can't put it right | a failed seal, a scratch or an etch, not dirt | The honest card: misting between the panes, a scratch, etching, a frame gone chalky or yellow. The one cause this card makes: a failed seal, a scratch or an etch, which no clean removes. From the trade facts scratched glass and self cleaning glass rows: a blade or an abrasive on toughened or coated glass marks it, so nothing is scraped; a mark that does not shift is a glazier's job, and the visit tells the customer which is dirt and which is not. Say so plainly: it earns more trust than a promise. Never a promise about the result, never a dig at another trade. |
| A job you keep putting off | a job that never fits a weekend | The customer's side: the conservatory roof, the gutters, the upstairs glass, the panels, left because it means a ladder and a wet afternoon. The one cause this card makes: a job that never fits a weekend and should not be done off a householder's ladder. From the trade facts ladder and fragile roof rows: ladder work follows an assessment and a secured ladder, a conservatory roof is never walked on and a panel never stood on; say it as why the job is given to someone with the kit to do it from the ground, never as the reader climbing up. What the visit changes, from the timing cells: gutters once the leaves have come down, the conservatory before the summer it gets used, panels when the soiling and the owner's assessment call for it, the round keeping the frames clean so less runs on to the glass. A frequency only from [CV: visit_frequency_options]; no promise about the result. |

**Block 5, cost factors.** H2: How We Price [SERVICE] Visits in [CITY]

| Card | Brief |
|---|---|
| How much glass, and how high | The size factor from the trade facts price row: the number of panes and sides, the roof glazing and its bars, the size of the array, the length of the roofline, the glazed area of a frontage. Say it plainly and give no figure, never a height. |
| How heavy the build up is | From the trade facts price row: bonded dirt on glass, heavy growth on a roof, wet debris and blocked downpipes in a gutter, bird fouling and lichen on panels, heavy residue in a bin store. A first visit on something left a while is a bigger job; after that each visit is priced as a visit. Say the business looks before it prices, from [CV: quote_method] only. Nothing priced on time, no hourly rule. |
| Getting to it safely | From the trade facts price row: obstructed access, a busy pavement to keep clear, restricted hours, a platform, cradle or rope access for high glass, roof access controls on a panel job, waste taken off site. Say why each adds time. No figure, never a height. |
| What's done alongside | Work the visit can take on as well, from the sibling service pages and the services list only: the inside glass with the outside, the conservatory roof with the windows, the fascias with the gutters, the panels while the pole is out. Say that each adds to the visit. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Tell Us What Needs Cleaning**
   Brief: How to get in touch and what is useful to send first (how many windows and floors, the roof or the gutters, how long since it was last done, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Agree the Visit and the Price**
   Brief: What the visit will cover and what it costs. The price agreed before the first visit only when the price_agreed_before_work practice is confirmed. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free". A frequency only from [CV: visit_frequency_options].
3. **We Start on a Date That Suits You**
   Brief: The first visit goes in the diary on a day that suits the customer. A regular pattern following on only when the maintenance_schedule practice is confirmed. Whether the customer needs to be in, the side gate and keys only from [CV: access_handling] and the customer_need_not_be_home practice. Never mention the price or changes to what is covered.

**FAQ slots.** Five before the symptom question: frequency, cost, one cover question (the first whose condition holds), access, scope; a sixth, rules, only where the service has Table C rule rows.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| frequency | always | How often should [SERVICE_LOWER] be done? | What decides it, from the trade facts timing row, in plain words: what settles on the surface and how fast (traffic film by a road, sap and pollen under trees in spring, salt near the sea, bird fouling on a panel, leaf fall into a gutter) and the setting of the house. The facts pack found no standard gap for a window round, a manufacturer's guidance of a gutter clear at least once a year and more often under trees, and a site specific schedule for panels: give these as guidance, never as a rule or as this client's offer. A frequency as this client's offer only from [CV: visit_frequency_options]; otherwise say the pattern is agreed with you and nothing more. This is the one place the timing is written; a duration only where the row gives one (the rows say it varies). | Timing |
| cost | always | How much does a [SERVICE_LOWER] visit cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the first visit when that practice is confirmed. The cost cards hold the list: never repeat it or point to it. | Price |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers, and never that a broken or cracked pane is covered unless the client values say so (the trade facts broken glass and insurance row). | Trust |
| cover | always | What if something gets damaged during a visit? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| access | always | Do I need to be in for a [SERVICE_LOWER] visit? | From [CV: access_handling] and the confirmed practices only (customer_need_not_be_home): whether the customer needs to be in, the side gate, keys or a contact for a commercial site; visits outside opening hours only from [CV: out_of_hours_available]. When nothing is on file, say the arrangements for getting in are agreed before the first visit and nothing more. A note or a message when no one was home only from the confirmed ticks. Never a key policy, vetting or a DBS check stated as fact. | Process |
| scope | always | What does a [SERVICE_LOWER] visit include? | The What's Included items said as a sentence, in other words: name the work itself (the glass, the frames and the sills; the roof and its bars; the gutter run, the outlets and the downpipes), never 'on this page' or 'listed above'. The inside glass, the frames or an extra only as the services list and the confirmed ticks give them. What a visit does not cover only from the services list, with one sibling service page or the category page linked. | Fit |
| rules | rule_rows | Are there rules or standards for [SERVICE_LOWER]? | From the trade facts rule rows only, written as the way the work is usually done, never as homework for the reader: work at height planned so the ground is used where it can be and a ladder kept for short assessed jobs; wash water from a bin store or cladding kept out of the surface drains; a hosepipe ban checked against the water company's own notice rather than assumed either way; a listed building's consent only where cleaning would change its character, since ordinary washing usually needs none; a waste carrier registration where debris is taken away. Plain words with 'usually' or 'in most cases'; what the customer does only where the row says so. Never a standard's number, an Act's name, a cover figure or legal advice. This slot is used only when the service has rule rows. | Process |
| symptom | a symptom tagged with the service | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the cause in the water, the glass or the frames in plain words, what the local factor adds (hard water, a main road, mature trees, salt air, tall or awkward housing), then what this service does about it. One figure at most. Never a claim that the town's homes have dirty windows, never a water hardness the research does not confirm. | Process |

**Seasonal swap:** none. **Desire led variant:** none (no page flagged). **Emergency variant:** none.

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (the problems the town's windows, roofs and gutters have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question). The steps are the type's category page steps. The briefs are town wide, not per category: the town profile (hard water, trees, coast, main roads, housing height, frontages), the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose. No seasonal swap and no symptom question on a location page. The type is the client's, never a category override. Placeholders: `[WORK]`, `[WORK_LOWER]`, `[TOWN]`, `[CITY]`. The pack's section 3 rules apply to every brief: every anchor must change the work; never claim homes in an area have dirty windows; never a hardness or a parking rule the research does not confirm; never a street or an estate named as hard to reach or unsafe.

- A niche with no section here has its location pages refused: "no location block briefs for window-cleaning".

### Type B (the client's type is B)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Tap water that dries white on the glass | the minerals in the town's water left behind as it dries | Where the town profile confirms hard water: white spots after a go with the hose, scale on the outside of the panes and the sills, the marks a bucket and a cloth leave. The one cause this card makes: the minerals in the town's water left behind as it dries (the trade facts dissolved minerals row). What follows for the work: water stripped of its minerals dries without them, which is why the trade uses purified water through a pole; never a figure for the water, never a hardness the research does not confirm. Where the profile gives soft water or says nothing, the card is instead the one setting the profile does give (salt spray on the coast dulling glass and pitting frames, or traffic film from a main road), one only. Not frame dirt washing down: the category pages own that. |
| Trees over the street | what the town's trees drop on glass, roofs and gutters | Sap and pollen on the glass in spring, leaves in the gutters by late autumn, the shaded sills and the conservatory roofs green sooner, where the town profile gives tree lined roads, parks or older estates with mature trees. The one cause this card makes: what the town's trees drop on glass, roofs and gutters through the year. What follows for the work: windows that need the frames doing as well as the glass, gutters booked once the leaves are down (the gutter interval row, as guidance), a roof under a tree that greens quicker than one in the open. Never say the homes are dirty, never a frequency as this client's offer, never name a street as a problem. |
| Houses a pole suits, and houses it doesn't | how high and how reachable the town's windows are | Bungalows, three storey townhouses, flats with glass above the shops, terraces with no side access, from the town profile. The one cause this card makes: how high and how reachable the town's windows are. What follows for the work, from the trade facts pole and access rows: upstairs glass done from ground level by pole wherever the window can be seen and reached safely; the back of a terrace reached through the house or a rear alley, with the van parked some way off on the end of a long hose; high glass on a block by an assessed platform, cradle or rope access, chosen by the assessment and never by a set height. Never a reach figure, never a street or an estate named as hard to reach or unsafe, never a line that reads as the customer going up a ladder. |
| Shopfronts that have to look right by nine | the town's trading hours and the frontages they keep | The high street, the business park, the school, the managing agents' blocks, from the town profile. The one cause this card makes: the town's trading hours, with glass that has to be clean by opening time and pavements that are busy by then. What follows for the work: visits timed before the shop opens or after it closes (outside opening hours only from [CV: out_of_hours_available]), passers by kept clear of hoses and poles on the pavement (the highway row, in plain words and never the Act's name), upper glass on a longer cycle than the frontage. Where LINKABLE PAGES has no commercial page in this town, the card is the town's conservatories and extensions (the profile: estates of a certain age) and their roofs going green. Never name a business. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Parking a long way from the glass | Terraced streets with permit parking, flats above shops, a long run of hose from wherever the van could stop. Say why that adds time to a visit, from the town profile where it gives the housing and the streets. No figure. |
| Three floors and roof windows | Taller houses, dormers and roof windows, conservatories and extensions the profile gives: more panes and more reach. Say it plainly; no figure, never a height. |
| Windows that haven't been done for a while | The first visit on a home or a shop that has had a long gap is a bigger job than the visits that follow, because the frames hold what the rain then carries down the glass. Say it plainly, from the profile where it gives turnover (new estates, lets, shops changing hands); no figure; not the service pages' first visit card in the same words. |
| Working round the town's hours and pavements | A shop street done before opening, an office out of hours, a school in the holidays, a busy pavement where people have to be kept clear of the kit. Say why a fixed window and a crowded pavement add to the visit, from the profile where it gives the premises. Out of hours work only where [CV: out_of_hours_available] confirms it. No figure. |

**Steps.** The category type B steps (Tell Us About Your Windows; We Agree the Visit and the Price; We Start on a Date That Suits You), by the fallback.

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | What does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the first visit when that practice is confirmed. One factor at most, never the list again. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers, and never that a broken or cracked pane is covered unless the client values say so. | Trust |
| cover | always | What happens if something gets broken on a visit? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| process | always | How do regular visits work in [TOWN]? | From the confirmed practices only: whether the customer needs to be in (customer_need_not_be_home), the side gate and keys from [CV: access_handling], how the visit is agreed, out of hours for commercial work only from [CV: out_of_hours_available]. A message the day before, card or app payment and the same window cleaner each visit only from the confirmed ticks. A frequency only from [CV: visit_frequency_options]. Never promise a schedule. | Process |
| timing | always | Do you clean windows in [TOWN] all year round? | Yes, from the trade facts timing cells: the work runs all year and a visit stops only for high wind, lightning and the days the rinse water would freeze on the paths. Then what the town's seasons put on the glass, from the profile where it gives them: sap and pollen in spring under the trees, leaves in the gutters in autumn, salt after a winter storm on the coast. Say why the timing changes the job; never fall back on 'our busy season'. No dates, no promise of a slot. | Timing |

## What the sources lacked (questions for the client or for Ray)

Briefs that wanted a fact the pack or the facts pack does not give point at "the trade facts rows only" and name nothing. The gaps:

- No job duration for any of the ten services (Table G: "varies; no standard"), so no brief and no FAQ gives one; the "how long" question for a type A client says what decides it.
- No verified round interval (Table E and G: the four to eight week description is unverified), so the frequency, "how often" and cost briefs never give a usual gap; a frequency comes only from [CV: visit_frequency_options]. The one interval the facts give is a gutter manufacturer's "at least once a year, more often under trees", used as guidance only.
- No standard season for any service (Table G): the timing briefs use the weather limits Table A gives (high wind, lightning, rinse water freezing on paths) and the pack's section 2 note (pollen and sap in spring, leaves in autumn gutters). Nothing times a conservatory or a solar panel clean to a month.
- Hard water is the pack's strongest local anchor but the facts pack has it only as the dissolved minerals row (an equipment maker's resin change point, not a threshold); the briefs point at that row and give no figure. Does the town research confirm water hardness, and from which source?
- The pack calls sign, canopy and bin store cleaning round work for commercial and block clients and asks whether most clients offer bin stores to householders as a one off (Notes for Brandon). The briefs treat it as round work with a bin store reading; if it is a one off for most clients it should read as a periodic extra.
- The pack says there is one GBP category; the Fillout form gives three tabs (Window Cleaning Service, Pressure Washing Service, Gutter Cleaning Service). All three are B here. Does a window cleaner's Pressure Washing Service tab read this entry or the Pressure Washing one?
- Six of the page targets (conservatory, fascia and soffit, cladding, solar panel, gutter, driveway and patio cleaning) are defined in the Cleaning, Pressure Washing and Roofer libraries; the facts pack here has rows for all but driveway and patio cleaning, which has no row in this pack (Table G: the pressure washing pack was not provided as a source). Which pack does a window cleaner's driveway and patio page read?
- Nothing in either pack says whether a window cleaning business cleans frames and sills every visit, does inside glass, sends a message the day before, takes card or app payment, sends the same window cleaner, closes and checks side gates, leaves a note when no one is home, keeps keys for commercial sites or checks staff (DBS, and at what level): these are ticks and client values, never stated otherwise.
- Whether a broken or cracked pane is covered by the client's insurance depends on the policy (Table E): the cover briefs never say it is unless the client values do. Ask the client what the policy says about glass.
- No manufacturer instructions for signs, canopies or particular cladding (Table G), so those briefs name the method only as "compatible with the material" from the stages rows.

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## Alternate Why title that promises a practice (why_title_practice)

"Regular Visits, Not One Big Clean" stands only with maintenance_schedule confirmed; otherwise the point reads "Our Track Record".

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| Will you need to walk on the conservatory roof or the solar panels? | Conservatory cleaning; Solar panel cleaning |
| Green creeping over the roof, the frames and the sills | Conservatory cleaning; Fascia and soffit cleaning; Cladding cleaning; Driveway and patio cleaning |
| A schedule that lapsed | Commercial window cleaning; Sign and canopy cleaning; Bin store cleaning |
| Shopfronts that have to look right by nine | Commercial window cleaning |
| Working round the town's hours and pavements | Commercial window cleaning |

## Idea homes

- **visits timed before opening or out of hours for shops and offices** (location): home is the 'Shopfronts that have to look right by nine' block 4 card. Elsewhere: the 'Working round the town's hours and pavements' cost card says only that a fixed time slot adds to the visit, and the 'How do regular visits work in [TOWN]?' FAQ does not explain why visits are timed round opening hours.
