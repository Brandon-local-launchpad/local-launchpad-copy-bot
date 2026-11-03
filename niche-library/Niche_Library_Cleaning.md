# Niche Library Entry: Cleaning

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/cleaning.json`; this file is the same content for people, kept in the same commit. The model never sees the slot names, only the resolved words.

Sources, in order: `calibration-packs/Cleaning_Calibration_Pack_v6.md` (the readers, the type per category, the split inside type B, what fails), `trade-facts/cleaning.md` (Tables A to G; every brief points at its rows and states no figure of its own), `niche-library/cleaning.csv` and `cleaning-categories.csv` (the page targets and the hubs), `fillout/services/cleaning-companies.json` (the client's category tabs, the lookup keys).

Business type defaults to **B (recurring)** for every category (the pack, section 2). Cleaning is a split niche inside one type, and the split is written into the briefs, not the type:

- **Recurring** (what builds up between visits, what a visit covers): regular domestic cleaning, office, communal area, gym and leisure centre, medical and clinic, school, holiday let changeovers, window and gutter rounds.
- **Single job, situation led** (the customer's date or situation, never an invented symptom): end of tenancy, after builders, a deep clean ahead of moving out or selling up.
- **Single job, problem led** (symptom, cause, consequence): rug, curtain, leather, mattress, pet stain and odour, oven, tile and grout, stone floor, and the exterior pages (roof, soft washing, driveway and patio, render, cladding, fascia and soffit, conservatory).

A client hand set to type A has no briefs in this entry. No emergency variant: `cleaning.csv` flags no page.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Cleaning / cleaning |
| trade_person / trade_person_plural | cleaner / cleaners |
| customer_type | homeowners, tenants and local businesses |
| unit_of_work | visits |
| emergency_niche | no |
| big_ticket | no |
| schema_subtype | LocalBusiness (schema.org has no cleaning service subtype under HomeAndConstructionBusiness; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) |
|---|---|
| clean, cleaner, regular clean, deep clean, end of tenancy clean, oven, carpet, sofa, mattress, shower screen, limescale, grout, stain, smell, checkout, deposit, inventory, home, flat, office, windows, gutters, driveway, patio, render, moss, green growth | sparkling, spotless, immaculate, pristine, soil, soiling, sanitaryware, operatives, janitorial, housekeeping, biocide, touchpoints, property, cleaning solutions, hygiene solutions, facilities management, eco friendly |

Exceptions: `property` once on an end of tenancy page where the check in inventory is meant; `janitorial` only where the page keyword is the GBP category name itself; `biocide` where a trade facts row is quoted as what usually applies to a treatment. "Eco friendly" is a claim: products only from `[CV: materials_methods]`.

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us what needs cleaning and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us what needs cleaning and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency pages in the library) |

## Steps (homepage)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us What Needs Cleaning**
   Brief: how to get in touch and what is useful to send first (the size of the home or the premises, which rooms or which item, the date it has to be done by if there is one, a photo of the stain or the oven if they have one). No promise of a reply time unless [CV: response_time] is set.
2. **We Look Round and Agree the Price** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the look round (the home or the premises) and what gets looked at: the rooms or the item, how much has built up, access and parking, what the customer wants covered. Follows [CV: quote_method]; only say the quote is written if quote_method says so. The price agreed before the first visit only when the price_agreed_before_work practice is confirmed. Never restates "free" (FAQ 5 owns it). Never a room count, a checklist length or a timing as this client's process.
   Without the practice (`step_2_no_visit`): **We Agree What's Covered and the Price**
   Brief: what the clean covers is agreed item by item and the price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it). Never a room count, a checklist length or a timing as this client's process.
3. **We Clean on a Date That Suits You**
   Brief: the first visit or the job goes in the diary on a day that suits the customer; a regular round following on only when the maintenance_schedule practice is confirmed, with a frequency only from [CV: visit_frequency_options]. Keys and whether the customer needs to be in only from [CV: access_handling] and the customer_need_not_be_home practice. Never mention the price or changes to what is covered (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee, then insurance (cleaning has no manufacturer warranty; a re clean promise is the guarantee, described from [CV: guarantee_scope] and never as a replacement for the customer's rights) |
| fears (in order, one per Why choose us point; the pack, section 1) | 1. a stranger in the home who moves or breaks things, or a different cleaner every visit; 2. a standard that slips once the first few visits are done; 3. paying out and still losing the checkout, or a stain and a smell that return; 4. missed corners and complaints, and in a clinic or a kitchen dirt carried from one room into the next |

The in home trust barrier is answered with specifics about the work (the same standard each visit, things left where the customer keeps them, a fault noticed and mentioned), never with claims about honesty, vetting, key holding or DBS checks unless the client values confirm them.

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts pack, Table D.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies:** BICSc (British Institute of Cleaning Science), NCCA (National Carpet Cleaners Association), Domestic Cleaning Alliance, Federation of Window Cleaners.
- **Tier 2, approvals and accreditations:** WoolSafe Approved Service Provider, IICRC certified technician (the particular credential, not a general licence), CHAS, SafeContractor, Constructionline, Living Wage Foundation accredited.
- **Tier 3:** ISO 9001 or ISO 14001 only with the certificate; DBS checks only as the client values confirm (a check, not a membership); chamber of commerce, local press features. Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for, with a plausible cleaning example (an ornament knocked off a shelf, a mark on a worktop) that does not suggest carelessness. Never say the cover extends to the item being cleaned or to keys unless the client values say so (the trade facts treatment risk and keys rows). | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee is confirmed. Start with yes, then the terms from [CV: guarantee_scope] (a return visit, what it covers, how soon the customer has to say). Never written as something that replaces the customer's rights (the trade facts satisfaction guarantee row). Never a promise that a stain or a smell is gone. | no | Trust |
| faq_3_none | What happens if something isn't right after a clean? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. A single job with a date (a checkout, a handover after builders) only as start_time allows; never a same day or a next day claim unless [CV: same_day_available] is yes. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How often should a home be cleaned? | What decides it, in plain words: how many people and pets live there, how the kitchen and the bathrooms are used, what the customer wants kept on top of between visits. A frequency only from [CV: visit_frequency_options]; otherwise say the pattern is agreed with you and nothing more. Never a room count or a timing as this client's process. | no | Timing |
| faq_B | Why does a stain come back after the carpet has been cleaned? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words, from the trade facts what goes wrong rows and the calibration pack: the mark has gone down to the backing or the underlay and rises again as the carpet dries; a shop product's residue left in the pile, drawing dirt to the patch; a hired machine that wets the carpet more than it can suck back. Then what the local factor adds (pets, hard water, tenure), then what a proper clean has to reach. Blame the method, never the customer's effort. Never promise the stain is gone. | **yes** | Process |
| faq_C (fallback) | Do I need to be home while you clean? | From [CV: access_handling] and the confirmed practices only (customer_need_not_be_home): whether the customer needs to be in, keys, alarm codes. When nothing is on file, say the arrangements for getting in are agreed before the first visit and nothing more. Never a key policy, vetting or a DBS check stated as fact unless the client values confirm it. | no | Process |
| faq_D (fallback) | Do I need to provide cleaning products and equipment? | From [CV: materials_methods] and the confirmed practices only: whether the products and the equipment come with the cleaner or stay in the home. When nothing is on file, say it is agreed before the first visit. Never name a product or a brand; eco or fragrance free products only from [CV: materials_methods]. | no | Fit |
| faq_E (fallback, only when the client's services list carries the end of tenancy page) | Can my landlord insist on a professional clean? | Only from the trade facts pack's rows on tenancy end (professional cleaning at tenancy end, deposit cleaning evidence): in most tenancies in England, no; a landlord's usual entitlement is the home handed back in the state of cleanliness the check in recorded, fair wear and tear allowed, and the checkout is judged against the inventory taken at check in. Phrase it as the usual position, never the Act's name, never legal advice. Never promise the deposit back. | no | Process |

No faq_planning: big_ticket is no. Sources for faq_A to faq_D: the readers and fears in the calibration pack, section 1. Replace with real customer questions when Brandon or the client supplies them.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`). A method (hot water extraction, low moisture cleaning, soft washing) goes in copy only when ticked; otherwise the copy describes what the clean does to the fibres or the surface (the pack, section 4).
- Products: standard professional products / eco or plant based products / fragrance free products / customer's own products used
- Carpet and upholstery methods: hot water extraction / low moisture cleaning / dry compound cleaning / stain protection treatment after cleaning
- Exterior methods: pressure washing / soft washing / steam cleaning / water fed pole / re sanding block joints after cleaning / sealing after cleaning
- Equipment: colour coded cloths and mops / M or H class vacuum for builders dust / own equipment brought to every job / customer's equipment used
- Other: same cleaner each visit / key holding / uniformed staff / DBS checked staff / checkout checklist with dated photos / itemised receipted invoice for letting agents / linen and laundry handled / waste taken away

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

regular cleaning, domestic cleaning, house cleaning, deep clean, deep cleaning, spring clean, end of tenancy clean, end of tenancy cleaning, move out clean, after builders clean, after builders cleaning, builders clean, sparkle clean, changeover clean, holiday let cleaning, oven cleaning, carpet cleaning, upholstery cleaning, sofa cleaning, rug cleaning, mattress cleaning, curtain cleaning, leather cleaning, stain removal, odour removal, pet stain removal, hot water extraction, steam cleaning, low moisture cleaning, dry compound cleaning, stain protection, tile and grout cleaning, grout cleaning, grout sealing, stone floor cleaning, stone restoration, marble polishing, honing, polishing, sealing, office cleaning, commercial cleaning, contract cleaning, communal area cleaning, communal cleaning, gym cleaning, clinic cleaning, medical cleaning, school cleaning, specialist cleaning, window cleaning, water fed pole, reach and wash, conservatory cleaning, gutter cleaning, gutter clearing, fascia cleaning, soffit cleaning, pressure washing, jet washing, soft washing, roof cleaning, moss removal, render cleaning, cladding cleaning, driveway cleaning, patio cleaning, re sanding, algae treatment, descaling, degreasing, disinfecting, sanitising, colour coding, ironing, laundry, linen change

## Service words (validator and client block)

GBP service names are shown to the model in the words a customer uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list. Every page target in `cleaning.csv` is here; "holiday let cleaning" is the `prose_name` the library gives the Holiday let and Airbnb page.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name or page target contains | Say |
|---|---|
| regular domestic cleaning, standard cleaning, general housekeeping | regular cleaning |
| deep cleaning, deep clean | deep cleaning |
| end of tenancy cleaning, moving-related cleaning, move-out cleaning | end of tenancy cleaning |
| holiday let and airbnb cleaning, holiday let | holiday let cleaning |
| after builders cleaning, post-construction cleaning | after builders cleaning |
| oven cleaning | oven cleaning |
| rug cleaning, area rug cleaning | rug cleaning |
| curtain cleaning, drapes and curtain cleaning | curtain cleaning |
| leather cleaning | leather cleaning |
| mattress cleaning | mattress cleaning |
| pet stain and odour removal | pet stain and odour removal |
| carpet steam cleaning, general carpet cleaning | carpet cleaning |
| upholstery cleaning | sofa and upholstery cleaning |
| tile and grout cleaning | tile and grout cleaning |
| stone floor cleaning and restoration, marble polishing | stone floor cleaning |
| office cleaning, office and workplace cleaning | office cleaning |
| communal area cleaning, multi-tenant cleaning | communal area cleaning |
| gym and leisure centre cleaning, fitness centre | gym cleaning |
| medical and clinic cleaning, medical institution cleaning | clinic cleaning |
| school cleaning, school & campus cleaning | school cleaning |
| specialist commercial cleaning, laboratory cleaning, cinema cleaning, stadium cleaning, post-event cleaning, emergency & specialist commercial cleaning | specialist commercial cleaning |
| roof cleaning, rooftop/skylight cleaning | roof cleaning |
| soft washing, soft wash cleaning | soft washing |
| conservatory cleaning | conservatory cleaning |
| fascia and soffit cleaning, fascia & soffit cleaning | fascia and soffit cleaning |
| cladding cleaning | cladding cleaning |
| render cleaning | render cleaning |
| driveway and patio cleaning, driveway cleaning, patio cleaning | driveway and patio cleaning |
| power/pressure washing | pressure washing |
| gutter cleaning | gutter cleaning |
| window washing, interior and exterior window cleaning, glass and mirror cleaning | window cleaning |
| a/c, hvac, ductless heating, heating system, thermostat, blast cleaning | (never named: the Air Duct rows are excluded as the HVAC niche; Blast Cleaning has no library rows) |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category tab, in the words a customer uses, in the order code picks them (after the client's jobs_wanted). The keys are the client's category tab names in lower case. JSON slot: core_services.

- House Cleaning Service: regular domestic cleaning, deep cleaning, end of tenancy cleaning, office cleaning
- Cleaners: regular domestic cleaning, deep cleaning, end of tenancy cleaning, office cleaning
- Janitorial Service: office cleaning, communal area cleaning, after builders cleaning, medical and clinic cleaning, school cleaning, gym and leisure centre cleaning, specialist commercial cleaning
- Carpet Cleaning Service: carpet cleaning, rug cleaning, pet stain and odour removal, mattress cleaning, curtain cleaning, leather cleaning
- Upholstery Cleaning Service: upholstery cleaning, leather cleaning, rug cleaning, curtain cleaning, pet stain and odour removal
- Pressure Washing Service: driveway and patio cleaning, roof cleaning, soft washing, render cleaning, cladding cleaning
- Gutter Cleaning Service: gutter cleaning, fascia and soffit cleaning, roof cleaning
- Window Cleaning Service: window cleaning, conservatory cleaning, fascia and soffit cleaning
- Air Duct Cleaning Service: none (every row is excluded as the HVAC niche; the card falls back to the client's services)
- Blast Cleaning Service: none (no library rows yet)

Service words for the whole job rather than one service: cleaning, house cleaning, domestic cleaning, regular cleaning, commercial cleaning, contract cleaning, exterior cleaning. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: stain removal, odour removal, limescale, mould, moss, algae. When an FAQ question names the job as well as the problem ("Will a deep clean shift the limescale on the shower screen?"), it goes to the job's page (deep cleaning), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices (`niche-library/practices.json`, shared by all niches). The briefs in this entry name: price_agreed_before_work, site_visit_before_quote, maintenance_schedule, customer_need_not_be_home. The cleaning specific promises (same cleaner each visit, key holding, DBS checked staff, photos at the end of an end of tenancy clean, an itemised receipted invoice) are ticks in the materials and methods list above until practices.json carries them; a ticked item counts as confirmed for the validator and the claims reviewer alike. Nothing in a brief states vetting, insurance, key holding, the same cleaner or eco products as fact without one of these.

## Onboarding questions this niche needs

The cost, "how often" and "when" FAQs can only say what affects the answer unless the client gives figures. Ask every cleaning client for:
- a "from" price for 3 typical jobs (e.g. a regular visit on a three bed home, an end of tenancy clean on a one bed flat, a carpet clean per room);
- the visit patterns offered ([CV: visit_frequency_options]) and whether a round is agreed before the first visit;
- how keys and access are handled ([CV: access_handling]) and whether the customer needs to be in;
- whether the same cleaner comes each visit, whether staff are DBS checked and at what level, whether products and equipment are brought;
- for commercial work, whether out of hours visits are offered;
- for end of tenancy work, whether an itemised receipted invoice and dated photographs are given.

## Section 5 alternative titles (why_titles_alt)

Type B:
1. Consistency → **The Same Clean Every Visit**
2. Cover → **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]", keyed by the client's category tab names (lower case): house cleaning service → house cleaning, cleaners → house cleaning, janitorial service → commercial cleaning (the hub in `cleaning-categories.csv` is Commercial Cleaning), carpet cleaning service → carpet cleaning, upholstery cleaning service → upholstery cleaning, pressure washing service → exterior cleaning (hub: Exterior Cleaning), gutter cleaning service → gutter cleaning, window cleaning service → window cleaning, air duct cleaning service → duct cleaning, blast cleaning service → blast cleaning. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps, the FAQ slots and, with `seasonal_trade` on, the one card and one FAQ that swap in. Placeholders: `[CAT]` the page keyword without the town, `[CAT_LOWER]`, `[WORK]` the work noun, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises.

- `seasonal_trade`: no (the pack: timing, not seasons; demand timing lives in the timing FAQ)
- `category_types`: empty (every category is B, the niche default)
- A niche with no section here has its category pages refused: "no category block briefs for cleaning".

Every cleaning category is B. One entry serves the rounds (House Cleaning, Janitorial, Window, Gutter), the problem led categories (Carpet, Upholstery, Pressure Washing) and the situation led pages inside House Cleaning and Janitorial: each brief says which framing which services follow.

### Type B (every category)

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| What builds up between cleans | visits spaced further apart than the build up | Recurring pages (regular domestic, office, communal, school, gym, clinic, window and gutter rounds): the things that show by midweek or between visits, from the trade facts signs rows in the customer's words (dust on the surfaces they reach, crumbs on the floor, marks on the sink and the taps, the bins, marks on the lift buttons). The one cause this card makes: visits spaced further apart than the build up. Say what a visit covers, from the card list; a frequency only from [CV: visit_frequency_options]. On a carpet, upholstery or exterior category the card is the build up the customer has lived with (the darkened traffic lane, the green side of the wall, the dark grout line), same cause. Never say the home or the premises is dirty. Not the items an inspection fails: card 2 owns those. |
| What an inspection marks down | the places a routine clean does not reach | Situation led pages (end of tenancy, a deep clean ahead of moving out or selling up, after builders, holiday let changeovers, a clinic audit): the inside of the oven, the extractor filter, the silicone round the bath, scale on the glass of the shower, fine dust on the sills, used linen left, from the trade facts signs rows. The one cause this card makes: the places a routine clean does not reach. Name the yardstick the clean is judged by (the check in inventory, the changeover checklist, the agreed scope, the audit) from the facts pack rows, and that comparable before and after records matter more than an invoice (the deposit evidence row). Never promise a deposit back. On a carpet, upholstery or exterior category the card is the item the customer's own attempt did not shift; the cause stays the same. Never a checklist length or a room count. |
| A stain or a mark that came back | the cause left underneath, only the surface cleaned | Problem led pages (rug, curtain, leather, mattress, pet stain, oven, tile and grout, stone floor, and the exterior pages): the mark that fades and reappears, the smell that stays, the grout that darkens again within weeks, the green that returns on the shaded wall. The one cause this card makes: the cause left underneath, only the surface cleaned (urine through to the backing that wicks back up as the carpet dries, a shop product left in the fibres pulling dirt back in, growth left in the render). From the trade facts what goes wrong rows and the calibration pack: explain what defeated the customer's own go at it, without blaming them, and what a proper clean has to reach. A method named only from [CV: materials_methods]. Never promise that the mark is gone or the smell has left. On a recurring category the card is the mark the regular clean keeps covering up (limescale, the grout line). |
| The wrong method for the surface | a method chosen for speed, not for the surface | Every page: the damage a clean does when the method suits the cleaner, not the surface or the room, from the trade facts done badly rows: high pressure on roof tiles, render or block joints; too much water in a carpet; bleach on wool; soap and water on absorbent leather; oven cleaner on a catalytic lining; the same cloth or mop carried from the washroom to the desk or the worktop (the commercial and clinic version of this card, and every home that has both a kitchen and bathrooms). The one cause this card makes: a method chosen for speed, not for the surface. Give the usual principle (a test patch first, cloths and mops colour coded by area, a treatment after the dirt is off, not instead of it) as general practice, never as this client's process unless a tick or a practice confirms it. Never a pressure, a temperature or a dwell time: the rows give none that apply to every surface. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How much there is and how often | More rooms, more panels, more floor area, more cavities or faces, from the trade facts price rows. A regular round means each visit is shorter, so the price per visit is lower than one long catch up; a single job is priced as a job. Give no pricing basis beyond that (nothing priced on time, no hourly rule). A frequency only from [CV: visit_frequency_options]. No figure. |
| How much has built up | Heavier dirt, ingrained grease, scale, baked on deposits, aged stains, how far the growth has spread, from the trade facts price rows. A first visit on a home or an office left a while is a bigger job than the visits that follow. Say the business looks before it prices, from [CV: quote_method] only. No figure. |
| What's included in the clean | The oven, the inside of the windows, the carpets, the linen, the appliances, sealing after a grout clean, re sanding the joints after a paving wash: the added tasks the trade facts price rows name. From the card list and the services list only; a sibling service page linked where LINKABLE PAGES has one. Never a checklist length. |
| Access, parking and hours | Difficult access, height and the equipment it needs, nowhere to park, out of hours and operating hours for commercial work, a short changeover window, from the trade facts price rows. Say why each adds time. Nothing about urgency pricing unless [CV: price_list] gives it. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Tell Us What Needs Cleaning**
   Brief: How to get in touch and what is useful to send first (the size of the home or the premises, which rooms or which item, a date if there is one, a photo of the stain or the oven if they have one). No promise of a reply time unless [CV: response_time] is set.
2. **We Agree What's Covered and the Price**
   Brief: What the visit or the job will cover, item by item, and what it costs. The price agreed before the first visit only when the price_agreed_before_work practice is confirmed. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free". Never a room count, a checklist length or a timing as this client's process.
3. **We Clean on a Date That Suits You**
   Brief: The first visit or the job goes in the diary on a day that suits the customer. A regular round following on only when the maintenance_schedule practice is confirmed. Keys and whether the customer needs to be in only from [CV: access_handling] and the customer_need_not_be_home practice. Never mention the price or changes to what is covered.

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the first visit when that practice is confirmed. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER]? | Start with yes, then the terms from [CV: guarantee_scope] (a return visit, what it covers, how soon the customer has to say). Described, never promised, and never as something that replaces the customer's rights (the trade facts satisfaction guarantee row). Never a promise that a stain or a smell is gone. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers, and never that it covers the item being cleaned or keys unless the client values say so (the trade facts treatment risk and keys rows). | Trust |
| cover | always | What if something gets damaged during a clean? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| scope | always | What does your [WORK_LOWER] include? | The jobs on the card list, said as what a visit or a job covers: the rooms, the items, the surfaces. Link one service page. What is not included only from the services list. Never a room count or a checklist length. | Fit |
| process | always | What happens when I book? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what is agreed before the first visit, whether they need to be in (customer_need_not_be_home), keys only from [CV: access_handling]. A regular pattern only when the maintenance_schedule practice is confirmed; a frequency only from [CV: visit_frequency_options]. Never promise a schedule, a same cleaner or a key policy. | Process |
| timing | always | When is the best time to book [WORK_LOWER]? | Demand timing, not seasons, from the trade facts timing rows and the calibration pack: an end of tenancy clean once the home is empty and before the checkout, an after builders clean once the dusty work has finished, changeovers between bookings, exterior washing when the weather lets the wash and the runoff be controlled, gutters after leaf fall. Say why the timing changes the job; never fall back on "our busy season". No dates, no promise of a slot. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue (hard water, tenure and turnover, shade from trees, coastal salt), answered as asked: the usual cause here in plain words, what the local factor adds, then what the clean does about it. One figure at most. Never a claim about what is inside the town's homes. | Process |

**Seasonal swap:** none (`seasonal_trade` is no).

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 and block 5 are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps, the FAQ slots (B: frequency, cost, cover, access, scope, and rules only when the service has rule rows) and the symptom question. The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type B entry serves a regular domestic round, an end of tenancy clean and a render wash alike. The type is the parent category's (`category_types`) else the client's. Placeholders: `[SERVICE]` the page keyword without the town, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for cleaning".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).
- The H2s are written to read on a round and on a single job alike ("When It's Time to Book [SERVICE]", "How We Price [SERVICE] in [CITY]"); the frequency question is "When should I book [SERVICE_LOWER]?" for the same reason, and its brief says how a round and a single job each answer it.

### Type B (every category)

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Agreeing what the clean covers | The first stage from the trade facts: the task schedule, the agreed scope, the zones, the starting condition recorded (dated photographs on an end of tenancy clean). A part of the job, not a promise about the quote. |
| Checking the surface, the item or the room first | The inspection and test stage from the trade facts: the fibre and the dyes, the leather finish, the oven lining, the render finish, the paving and its joints, safe access. Say why a test comes before the clean, from the done badly rows; no figure. |
| Loose dirt and debris out first | The remove loose dirt or debris stage from the trade facts: the dry dirt vacuumed, the debris swept, the used linen and the bins out; on an after builders clean the fine dust taken out with suitable extraction, never dry swept (the trade facts rows). Name only what the rows give. |
| The main clean | The central stage from the trade facts, named as the trade names it: degrease and descale, the kitchen and the bathrooms, the agitation of the grout, the treatment of the spot, the wash of the panel. A named method (extraction, low moisture or soft wash) only from [CV: materials_methods]; otherwise describe the effect on the surface or the fibres. |
| Rinse, extract or wipe down | The recover, rinse or extract stage from the trade facts: residue out so it does not pull dirt back in, the product wiped off as its instructions require, a treatment left for its labelled time where one is used (no figure: the rows give none that applies to every product). |
| Floors, edges and the things people touch | The floors last, the edges, the door handles, the taps, the light switches, the lift buttons, from the trade facts stages. What the customer sees when the job is done. |
| A check against what was agreed | The inspect, check or record stage from the trade facts: against the scope, the checklist, the check in inventory, the audit. Photographs or an itemised receipted invoice only from the confirmed ticks; otherwise say the job is checked against what was agreed. |
| Drying and what happens next | From the trade facts timing and stages: full drying before use, a mattress not remade damp, sealing only on a clean dry surface, the block joints re sanded, the linen and supplies replaced where contracted. A drying time only from the trade facts facts rows, as method dependent, never as a promise. |

**Block 4, when it's time to book.** H2: When It's Time to Book [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The first signs | the job left undone | The things a customer notices first, from the trade facts signs row, in their words. The one cause this card makes: the job left undone. Recurring pages: what shows between visits. Situation led pages (a checkout, a build just finished, a deep clean ahead of moving out or selling up): the situation and the date, never an invented symptom. Problem led pages: the stain, the smell, the dark grout, the green wall. Then what it leads to if left, from the skipped row: specific, never alarming, never a health scare. |
| Your own attempt didn't shift it | a product or a machine wrong for the material | Problem led pages: the shop product, the rented machine, the stiff brush and the hose that did not work, from the trade facts done badly and facts rows (bleach on wool, soap and water on absorbent leather, shop oven cleaner against baked on carbon, a machine that puts water in and cannot pull it out, high pressure on a surface that will not take it). The one cause this card makes: a product or a machine wrong for the material. Blame the method, never the customer's effort. Recurring and commercial pages: the in house attempt that keeps the desks tidy and misses the washrooms and the things people touch. Not the cause left underneath: the category page owns that. |
| A date you can't move | a deadline fixed by someone else | Situation led pages: the checkout, the next guest's check in, the handover after the builders, the viewing, the audit, the start of term, the reopening after a refit. The one cause this card makes: a deadline fixed by someone else. Name the yardstick the clean is judged by on that day (the check in inventory, the changeover checklist, the standard the premises work to) from the facts pack rows, and that comparable before and after records matter more than an invoice. Recurring pages: the visit that has to land before guests or an inspection. Never promise a date unless [CV: start_time] is set, and never a deposit back. |
| It's taking more of your time than it should | a job that has become a catch up every time | The customer's side: a weekend lost to the catch up, an office manager fielding complaints about the washrooms, a host turning rooms between guests. The one cause this card makes: a job that has become a catch up every time instead of a short regular one. Say what a regular visit changes, without a frequency unless [CV: visit_frequency_options] is set. On a one off job's page this card is the job the customer has been putting off because it never fits in a weekend (the oven, the carpets, the driveway). |

**Block 5, how the job is priced.** H2: How We Price [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much there is to clean | The size factor from the trade facts price row: the rooms, the panels, the floor area, the cavities and accessories, the faces of a mattress, the storeys, the length of the roofline. Say it plainly and give no figure. |
| How heavy the build up is | From the trade facts price row: ingrained grease, scale, baked on deposits, aged stains, how far the growth has spread, heavy entrance dirt. A first visit on something left a while is a bigger job; after that each visit is priced as a visit. Say the business looks before it prices, from [CV: quote_method] only. Nothing priced on time, no hourly rule. |
| What the job needs on top | From the trade facts price row and the services list only: a separate specialist treatment, the linen and the replenishment, sealing, re sanding the joints, taking curtains down and rehanging them, controlled dust extraction, keeping the runoff out of the drain, the equipment to reach the height. Say that each adds to the job. A sibling service page linked where LINKABLE PAGES has one. |
| Access, hours and how soon | From the trade facts price row: difficult access, height, restricted or out of hours access, operating hours, a short changeover window. Say why each adds time. Nothing about urgency pricing unless [CV: price_list] gives it. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Tell Us What Needs Doing**
   Brief: How to get in touch and what is useful to send first (the size of the room or the item, how long it has been since it was last cleaned, a date if there is one, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Agree What's Covered and the Price**
   Brief: What the visit or the job will cover and what it costs. The price agreed before the first visit only when the price_agreed_before_work practice is confirmed. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free". Never a room count, a checklist length or a timing as this client's process.
3. **We Clean on a Date That Suits You**
   Brief: The visit or the job goes in the diary on a day that suits the customer. A regular pattern following on only when the maintenance_schedule practice is confirmed. Keys and whether the customer needs to be in only from [CV: access_handling] and the customer_need_not_be_home practice. Never mention the price or changes to what is covered.

**FAQ slots.** Five before the symptom question: frequency, cost, one cover question (insurance, else the fallback), access, scope; a sixth, rules or standards, only when the service has Table C rule rows. The frequency answer owns the timing (there is no separate timing slot).

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| frequency | always | When should I book [SERVICE_LOWER]? | From the trade facts timing row only. Recurring pages: what decides how often (how the room or the premises is used, the dirt tracked in, the use pattern) in plain words; a frequency only from [CV: visit_frequency_options], otherwise say the pattern is agreed with you and nothing more. Single job pages: when the job is booked against its date (once the home is empty and before the checkout, once the dusty work has finished, between bookings, when the weather lets the wash and the runoff be controlled). Say why the timing changes the job; never fall back on "our busy season". This is the one place the timing is written; a duration only where the row gives one (the rows say it varies). | Timing |
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the first visit when that practice is confirmed. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers, and never that it covers the item being cleaned or keys unless the client values say so (the trade facts treatment risk and keys rows). | Trust |
| cover | always | What if something gets damaged during the clean? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| access | always | Do I need to be home for [SERVICE_LOWER]? | From [CV: access_handling] and the confirmed practices only (customer_need_not_be_home): whether the customer needs to be in, keys, alarm codes; on a commercial page, out of hours access only from the client values. When nothing is on file, say the arrangements for getting in are agreed before the first visit and nothing more. Never a key policy, vetting or a DBS check stated as fact. | Process |
| scope | always | What does your [SERVICE_LOWER] include? | The What's Included items said as a sentence, in other words. What it does not cover only from the services list (a separate treatment, the linen, sealing), with one sibling service page or the category page linked. Never a room count or a checklist length. | Fit |
| rules | the service has rule rows | Are there rules or standards for [SERVICE_LOWER]? | From the trade facts rule rows only, framed as the usual position for the work, never as homework for the reader: a tenancy rule as the landlord's usual entitlement (the home handed back as the check in recorded it, fair wear and tear allowed), a chemicals, height, waste or runoff rule as how the job is done, a healthcare or food standard as what the premises work to. Plain words with "usually" or "in most cases"; what the customer does only where the row says so. Never a standard's number, an Act's name, a cover figure or legal advice. | Process |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual cause here in plain words, what the local factor adds (hard water, tenure, shade, salt air), then what this service does about it. One figure at most. Never a claim about what is inside the town's homes. | Process |

**Seasonal swap:** none (`seasonal_trade` is no).

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (the problems the town's homes and premises have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the type's category page steps unless an entry carries its own (this one does not). The briefs are town wide, not per category: the town profile, the allocated neighbourhoods and the assigned symptoms are the material (for cleaning: tenure and turnover, who lives here and when they are out, hard water, shade and salt air, the premises mix, the pack's section 3), and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED). No seasonal swap and no symptom question on a location page. The type is the client's, never a category override. Placeholders: `[WORK]` the primary category's work noun, `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town. The copy rules of CORE (18) and the shared rules apply: claims only from client values, no figures, no promises, no claim about what is inside the town's homes, no how it's done sentence.

- A niche with no section here has its location pages refused: "no location block briefs for cleaning".

### Type B (the client's type is B)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Homes that change hands every summer | tenancies in the town turning over together | Rented homes, student lets and the letting agents between them, from the town profile (tenure, turnover, where the lets cluster). The one cause this card makes: tenancies in the town turning over together, so checkouts fall in the same weeks. What follows for the job: the check in inventory the checkout is judged by, the itemised receipted invoice an agent expects, booking against a date; the receipt and the photographs only from the confirmed ticks. Never say the homes are dirty, never invent student numbers or agent names, never promise a date or a deposit back. Not the items an inspection fails: the category pages own those. |
| Nobody home when the cleaning needs doing | households with no one in during the day | Commuter households, families out all day, older residents who want the same face each time, from the town profile (who lives here, the commute, the ages). The one cause this card makes: households with no one in during the day. What it means for a round: the arrangements for getting in agreed before the first visit, from [CV: access_handling] and the customer_need_not_be_home practice only; the same cleaner each visit only from the confirmed ticks. Never a key policy, vetting or a DBS check as fact. Not the catch up that eats a weekend: the service pages own that. |
| What the water and the weather leave behind | the town's water and its weather on the surfaces people clean | Pick the one the town profile gives and vary it between towns: hard water (scale on the taps and the shower screens, the items a checkout marks down, from the trade facts signs rows), shade and damp (green growth on the north side of render, on patios and window frames), salt off the sea on the coast, leaf fall where there is tree cover (gutters and rooflines). The one cause this card makes: the town's water and its weather on the surfaces people clean. Say what follows for the job in plain words; on a client with no exterior page in LINKABLE PAGES keep to the indoor version. Never a claim about what is inside the homes. Not the cause left underneath or the wrong method: the category pages own those. |
| The places people work in round here | the mix of premises in the town | The business parks, the clinics and practices, the schools, the gyms, the managed blocks and their shared halls, from the town profile. The one cause this card makes: the mix of premises in the town, each needing something different from a visit. What a room of each kind usually asks of a visit (the things people touch covered every visit, cloths and mops kept to their area, a clinic's own schedule), given as the general practice, never as this client's process. Where LINKABLE PAGES has no commercial page, the card is the town's holiday lets and short lets (changeovers between bookings, the checklist the host works to) from the profile; where there are neither, the town's landlords and agents with more than one home who want the same standard across all of them. Never name a business. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Parking and getting the kit in | Terraced streets with permit parking, flats above shops, a block with no lift, a long walk from the van with machines and water. Say why that adds time to a visit or a job, from the town profile where it gives the housing and the streets. No figure. |
| A home or an office left a while | The first visit on a home, a let or an office that has had a long gap is a bigger job than the visits that follow. Say it plainly, from the profile where it gives turnover or empty lets; no figure; not the service pages' first visit card in the same words. |
| Working round the town's hours | Offices cleaned out of hours, schools in the holidays, changeovers that all fall on the same day of the week, a clinic's audit, a shop before it opens. Say why a fixed window adds to the job, from the profile where it gives the premises and the let pattern. Out of hours work only where the client values confirm it. No figure. |
| Height, roofs and conservatories | Two and three storey homes, extensions and conservatories, rooflines the profile gives: the equipment to reach them safely adds time to exterior work (the trade facts price rows). Where LINKABLE PAGES has no exterior page, the card is the town's taller houses and blocks: stairs, landings and the inside of upper windows add time to a visit. No figure, never a height. |

**Steps.** The category type B steps (Tell Us What Needs Cleaning; We Agree What's Covered and the Price; We Clean on a Date That Suits You), by the fallback.

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | What does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the first visit when that practice is confirmed. One factor at most, never the list again. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers, and never that it covers the item being cleaned or keys unless the client values say so. | Trust |
| cover | always | What happens if something gets broken during a clean? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| process | always | How do visits work in [TOWN]? | From the confirmed practices only: whether the customer needs to be in (customer_need_not_be_home), keys from [CV: access_handling], how the visit is agreed, out of hours for commercial work only from the client values. A frequency only from [CV: visit_frequency_options]. Never promise a schedule, a same cleaner or a key policy. | Process |
| timing | always | When is the best time to book cleaning in [TOWN]? | Demand timing from the town profile and the trade facts timing rows: lets changing hands when the academic year ends, holiday lets turned round all summer, gutters once the leaves are down, exterior washing when the weather lets the runoff be controlled. Say why the timing changes the job; never fall back on "our busy season". No dates, no promise of a slot. | Timing |

## What the sources lack (for Ray or the client)

Briefs that wanted a fact the pack or the facts pack does not give point at "the trade facts rows only" and name nothing. The gaps:

- `trade-facts/cleaning.md` has no rows for window cleaning or gutter cleaning (Table G: window cleaning is a separate pack), nor for carpet cleaning or upholstery cleaning as services (the category pages lean on the rug, curtain, leather, mattress and pet stain rows). Which pack do a cleaning client's Window Cleaning Service and Gutter Cleaning Service pages read?
- No job duration for any service (Table G: "varies; no standard"), so no brief gives one; drying times exist only as method dependent examples (Table E) and are never promised.
- Hard water is a local anchor in the calibration pack but has no facts row; the briefs point at the deep cleaning signs row (scale around taps) only.
- "Gutters after leaf fall" is in the calibration pack (section 2) only; no facts row times gutter work.
- Nothing in either pack says whether a cleaning business keeps keys, sends the same cleaner, checks staff (DBS, and at what level), brings products and equipment, works out of hours, or gives a receipted itemised invoice and dated photographs at a checkout: these are client values and ticks, never stated otherwise.

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)
