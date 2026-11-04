# Niche Library Entry: Driveways and Paving

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry). The code reads `niche-library/driveways.json`; this file is the same content for people, kept in the same commit.
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads the .json; the model never sees the slot names, only the resolved words.

Business type is **A (project trade)** for every GBP category (Driveways and Paving Calibration Pack v1, section 2: Paving Contractor, Concrete Contractor and Road Construction Company are all A). There is no type B: nothing in this trade is a round, and driveway sealing and cleaning are schedule led inside A because customers book them occasionally. No page is flagged emergency, so there is no emergency variant.

Sources, in order of authority: `calibration-packs/Driveways_Calibration_Pack_v1.md` (sections 1, 2, 4 and 7), `trade-facts/driveways.md` (Tables A to G), `niche-library/driveways.csv` with `driveways-categories.csv`, `fillout/services/driveways-and-paving.json`. The paving briefs here agree with the landscaper entry on the base (compacted in layers, falls made in it), the fall (built in before the surface, never made up in the bedding) and permeable paving (a surface the rain passes through only drains when the base under it does; never this client's method unless [CV: materials_methods] gives it).

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Driveways and Paving / driveways and paving |
| trade_person / trade_person_plural | driveway contractor / driveway contractors |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | no |
| big_ticket | yes (new driveways, resin bound driveways, patios) |
| schema_subtype | HomeAndConstructionBusiness (schema.org has no paving subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| driveway, drive, front garden, parking, patio, path, steps, kerb, dropped kerb, blocks, tarmac, gravel, resin, concrete, base, stone base, edging, fall, drain, soakaway, puddles, ruts | property, site, hardscape, hardscaping, pavers, paver, formation, laying course, sub grade, aggregate, bituminous, asphalt, crossover, install, installation (words_avoid_exceptions: site on a car park or line marking page, where it is the client's own word; asphalt where [CV: materials_methods] or the trade facts name the mix; crossover once on the Dropped kerbs page as the council's word; installation in a page name the library gives) | kerb appeal, curb appeal, street appeal, transform your driveway, transform your home, transform your frontage, dream driveway, wow factor, first impressions, stunning finish, quality installation, built to last, stand the test of time, maintenance free, weed free, ready to drive on in (the pack's section 7: showroom language, lifespan promises and laying times stated as this client's practice) |

The voice is a groundworker who knows ground, water and weight, explaining it to a homeowner. Every surface is the top of a stack, and the copy names the stack (the dig, the base, the edging, the fall) rather than the finish.

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about your drive or patio and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about your drive or patio and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency page) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About Your Drive or Patio**
   Brief: how to get in touch and what is useful to send first (a rough size, the surface they have in mind, whether it is the front of the house, where the rain goes now, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Visit and Price the Job** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the visit and what gets looked at: what is under the surface there now, the levels and where the water will go, how a digger and the waste lorry get to it, and at the front the kerb and the depth of the frontage. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it). Whether the permission side is handled only from [CV: handles_planning].
   Without the practice (`step_2_no_visit`): **We Price Your Job**
   Brief: a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **We Start on a Date That Suits You**
   Brief: the start date is agreed in advance, to suit the customer. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it). A day moved by the weather and rebooked only when the weather_delays_rebooked practice is confirmed; the drive protected and the way in kept clear only when property_protected is confirmed.

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee, then manufacturer warranty, then insurance |
| fears (in order, one per Why choose us point; the pack's section 1) | 1. a drive that ruts, cracks or holds a puddle at the door inside a couple of winters; 2. the doorstep trader with leftover tarmac, and no way of telling who will turn up; 3. a price that grows once the old surface is up; 4. finding out after the drive is built that the rain or the kerb needed permission |
| fears_by_type / faq_slots_by_type | not set: there is no type B in this trade, so every client reads the shared fears and FAQ slots |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, registers and trade bodies:** TrustMark, Interlay, Trading Standards Buy With Confidence.
- **Tier 2, manufacturer installer schemes:** Marshalls Register, Brett Approved Installer, Bradstone Assured, Tobermore Registered Paving Contractor (Table D: a scheme's guarantee is the scheme's, under its terms; Tobermore does not guarantee its registered contractors' work).
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards; an insurance backed guarantee (QANW, HomePro) only when the policy is on file. Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if something is damaged during the job (a drain, a service pipe, next door's wall). | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. A manufacturer's installer scheme guarantee is the scheme's, under its terms, never the business's own promise. | no | Trust |
| faq_3_none | What happens if something isn't right after the job? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. Where a dropped kerb or a planning application comes first, say the start follows the consent, with no timescale for the council. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does a new driveway take? | The factors, not a number unless confirmed (the trade facts give no duration for any of these jobs): the size, what has to come out and be carted away, the base the ground needs, the surface chosen, and the time a surface needs before a car goes on it, which depends on the material and the weather (concrete and resin cure, tarmac cools) and is never given as this business's figure. Weather can move the laying day. | no | Timing |
| faq_B | Why does water sit on my drive after rain? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words: a fall never built into the base, so the rain has nowhere to run; ground underneath that has softened and let the surface sink into a dip; nowhere for the water to go, because there is no drain or soakaway, or a surface that was meant to let the rain through has joints full of silt. Then what the local ground adds, then the fix, which starts with finding out whether the base is still sound. | **yes** | Process |
| faq_C (fallback) | Which driveway surface suits a front garden? | What decides it, in order: whether the rain can pass through the surface or run to a border or soakaway inside the garden (a surface that does usually keeps a front garden outside a planning application; one that sends the rain to the road usually does not; no area figure), the slope, how the drive is used and what is under it now, and how it looks against the house last. Say which surfaces let the rain through from the trade facts (gravel, permeable block paving, resin bound over a base that drains) and name an option for this business only from [CV: materials_methods]. No claim about how long one lasts against another: the facts give none. | no | Process |
| faq_D (fallback) | Can a driveway be laid in winter? | Yes in principle, with the reasons the day is chosen, from the trade facts timing cells: a base cannot be compacted on frozen or saturated ground; tarmac has to be rolled before it cools, so a cold windy day is avoided; fresh concrete is protected from frost and from drying too fast while it cures; resin is laid inside its system's weather limits and kept dry while it cures. So the work runs through most of the year with days moved by the weather. No dates, no promise about the weather, nothing about this business's own timings. | no | Timing |
| faq_planning (big ticket, only if [CV: handles_planning] confirmed) | Do I need planning permission for a new driveway? | Point at the trade facts rule rows (Table C) and write what usually applies, with "usually" or "in most cases": a new surface at the front of the house usually stays outside a planning application when the rain can pass through it or runs onto a border, a lawn or a soakaway inside the garden, and usually needs one when it sends the rain to the road; a patio at the back usually needs none; the council whose road it is usually has to agree before the kerb is lowered, and a classified main road adds a planning application. What the customer does about it only as the row gives it; whether this business handles the application only from [CV: handles_planning]. No figure, no area, never an Act's or an order's name. Conservation areas and listed homes can add controls: say so without naming them. | no | Process |

Sources for faq_A to faq_D: the pack's section 1 readers and the trade facts timing cells. Replace with real customer questions when Brandon or the client supplies them.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Surfaces: block paving / permeable block paving / resin bound / resin bonded / tarmac / gravel / concrete / imprinted concrete / tar and chip / natural stone setts / porcelain slabs / natural stone slabs / concrete slabs
- Base: MOT Type 1 sub base / open graded permeable sub base / concrete base
- Drainage: channel drain / soakaway / fall to a border or lawn / gravel grid
- Edges: concrete edging / kerbs / block soldier course / natural stone kerbs
- Other: waste taken away / mini digger on site / grab lorry / dropped kerb application handled / kerb crossing built by us where the council allows / UV stable resin / sealing

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

block paving, permeable paving, permeable block paving, resin bound, resin bonded, tarmac, tarmac surfacing, asphalt, gravel driveway, gravel, concrete driveway, imprinted concrete, pattern imprinted concrete, tar and chip, surface dressing, patio, porcelain paving, setts, flags, garden path, garden steps, kerbs, kerbing, edging, dropped kerb, vehicle crossing, driveway repairs, relay, relaying, re-sanding, sealing, resealing, driveway cleaning, patio cleaning, pressure washing, jet washing, concrete repairs, concrete resurfacing, overlay, retaining wall, levelling, groundwork, bollards, car park surfacing, line marking, play surfacing, sports surfacing, soakaway, channel drain, drainage, sub base, edge restraint

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| worktop, kitchen, granite, cabinet | (never named: a copy error in the form) |
| asphalt milling, asphalt recycling | (never named) |
| asphalt resurfacing | tarmac resurfacing |
| asphalt paving | tarmac surfacing |
| brick paver, paver installation | block paving |
| paver sealing | driveway sealing |
| bumper block, general construction | (never named) |
| concrete work | concrete bases and paths |
| crack filling | driveway repairs |
| paving-related drainage | driveway drainage |
| driveway installation | new driveways |
| driveway repairs | driveway repairs |
| driveway replacement | driveway replacement |
| driveway sealing | driveway sealing |
| excavation & grading | groundwork and levelling |
| hardscaping, general paving | paving |
| hauling, line striping, car park striping, road materials, road construction, job site preparation, street maintenance | (never named) |
| car park repair, concrete car park | car park surfacing |
| patio paving, courtyard | patios |
| sealcoating | driveway sealing |
| basement waterproofing, construction cleanup, crawl space, demolition, flooring, foundation, slab foundation, structural construction, water and moisture, concrete highway | (never named) |
| concrete cutting, concrete levelling, concrete repair | concrete repairs |
| concrete resurfacing | concrete resurfacing |
| concrete driveway | concrete driveways |
| concrete footings | concrete bases |
| general repairs | driveway repairs |
| retaining wall | retaining walls |
| concrete pavement | concrete paths |
| stamped concrete, imprinted concrete | imprinted concrete |
| barrier & flagging, bridge repair, project management, project planning, road & highway, sewer construction, storm drain, structural concrete, temporary traffic, waterline | (never named) |
| road painting | car park line marking |
| resin bound | resin bound driveways |
| resin bonded | resin bonded surfacing |
| resin pathway | resin paths |
| gravel | gravel driveways |
| tar and chip | tar and chip surfacing |
| block paving restoration | block paving repairs |
| patio cleaning | patio cleaning |
| driveway cleaning | driveway cleaning |
| patio sealing | patio sealing |
| kerbing, edging | kerbs and edging |
| dropped kerb, vehicle crossover | dropped kerbs |
| permeable | permeable paving |
| steps | garden steps |
| garden path | garden paths |
| play area | play area surfacing |
| sports court | sports surfacing |
| bollard | bollards |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). A card never leads with a specialist service (bollards, play surfacing) unless it is in jobs_wanted. JSON slot: core_services.

- Paving Contractor: block paving, resin bound driveways, tarmac driveways, patios, driveway repairs
- Concrete Contractor: concrete driveways, imprinted concrete, concrete repairs, concrete bases and paths
- Road Construction Company: car park surfacing, car park line marking, tarmac surfacing (commercial only: written to a site manager, and only where the client confirms commercial work)

Service words for the whole job rather than one service: driveways, new driveways, paving, driveway replacement, groundwork, concrete work. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: drainage, repairs. When an FAQ question names the job as well as the problem ("What drainage does a new driveway need?"), it goes to the job's page, not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches). The briefs here name the practice key a line depends on: site_visit_before_quote (step 2), written_quote (the desire card on doing it once), weather_delays_rebooked and property_protected (step 3), waste_removal (the spoil item), price_agreed_before_work (step 2 without a visit). A ticked practice counts as confirmed for the validator and the claims reviewer alike.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every driveway client for:
- a "from" price for 3 typical jobs (e.g. a block paved drive, a resin bound drive, a patio);
- a typical duration for the same 3 jobs, and the time they ask customers to keep a car off each surface;
- whether quotes are written, and whether the price is fixed once agreed;
- whether they handle the dropped kerb application, and whether they build the crossing themselves where the council allows it ([CV: handles_planning] and the tick list);
- whether they take commercial work (car parks, line marking), which decides whether the Road Construction Company pages are written at all;
- team size, and who does the work on site.

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record: **Local Experience Behind Every Drive**
2. Cover: **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": paving contractor → paving, concrete contractor → concrete work, road construction company → car park surfacing. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs (`category_page_blocks`) use `[WORK]` and `[WORK_LOWER]` for it; the location page reads the primary category's noun.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above), the FAQ slots and, with `seasonal_trade` on, the one card and one FAQ that swap in. Placeholders: `[CAT]` the page keyword without the town, `[CAT_LOWER]`, `[WORK]` the work noun, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises.

- `seasonal_trade`: no. Weather sets the laying day (a base not compacted on frozen or saturated ground, tarmac rolled before it cools, concrete protected from frost, resin inside its system's limits), but the pack does not call the trade seasonal, so there is no seasonal swap; the timing FAQ carries the weather.
- `category_types`: empty. Every category is A (the pack's section 2), so a client set to B by hand has no B briefs and the pages are refused; that client is a question for Brandon.
- A niche with no section here has its category pages refused: "no category block briefs for driveways".

### Type A (project trade: every category)

The pack's section 2 split inside type A: desire led services (block paving, resin bound, gravel, tarmac, concrete and imprinted concrete drives, tar and chip, permeable paving, dropped kerbs, kerbs and edging, patios, paths, steps, concrete bases, play and sports surfacing, bollards) are written as the customer's situation; problem led ones (driveway repairs, concrete repairs and resurfacing, retaining walls, a failed car park) as symptom, cause, consequence; schedule led ones (driveway sealing, resealing imprinted concrete, cleaning, line marking) as what slips and when. Block 4 below is the pack's mix for Paving Contractor: cards 1 and 4 are situations, cards 2 and 3 symptoms of a failed base, and every brief says how it reads on a Concrete Contractor or Road Construction Company page.

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Nowhere to park off the street | a frontage with no drive to park on | A situation card, not a fault: the car lives on the road, the front garden is a lawn nobody uses or a shared drive too narrow for two cars. What decides it: the depth of the frontage (whether a car fits without hanging over the pavement), the kerb (a full height kerb means the council whose road it is usually has to agree to a crossing before anything else), and where the rain will go (a surface the rain can pass through, or a fall to a border or soakaway inside the garden, usually keeps a front garden outside a planning application; a solid surface that sends the rain to the road usually does not; no area figure, never the rule's name). What the work gives them, in plain words: a drive sized for the cars that use it, on a base built for their weight, with the kerb and the rain settled before the design. By category: Paving reads it as the surface and what is under it; Concrete Contractor as a concrete or imprinted drive, its joints and its falls; Road Construction Company as a yard or forecourt that never had enough bays, only where the services list carries a car park page. Never kerb appeal, never a promise about the council's answer, never a fault invented for it. |
| Ruts, dips and blocks that rock | a base too thin or too soft for the weight on it | Problem led: tyre tracks that have dipped, a block that rocks underfoot, blocks spreading at the edge, sand gone from the gaps with weeds rooted in the dirt that replaced it, a slab that has sunk. The one cause this card makes: what is under the surface was never built for the weight of a car (a base too thin or never compacted, soft ground left in, edging that gave so the blocks spread, joints emptied of sand so the blocks lose their grip on each other). Say what the fix involves in plain words from the trade facts stages: the failed area lifted, what supports it repaired, then the surface relaid; and the diagnosis the repair customer wants: blocks that have sunk over a base that is still sound can be lifted and relaid, a base that has failed across the drive cannot be patched for long. Weeds root in the joints from above, in the dirt that collects there, so a membrane underneath is not the answer (Table E). By category: Concrete Contractor reads it as a slab that rocks or has sunk, with cracks widening; Road Construction Company as wheel ruts and edges breaking under turning traffic. No depth or figure the rows do not give; never a dig at another trade. |
| Puddles that stay after the rain has gone | a fall never built in, and nowhere for the water to go | Problem led: water by the front door or the garage, a puddle in the tyre tracks, a drive that was meant to let the rain through now holding it because the joints are full of silt. The one cause this card makes: the fall was never built in, or there is nowhere for the water to go. Say what the fix usually involves from the trade facts stages: the falls set in the base before the surface goes down (never made up in the sand bed, Table E), a channel drain across a drive that falls towards the house, a soakaway or a border inside the garden to take it, an open stone base kept clean of fines under a permeable surface. Say what water left standing does: it works into the base below and softens it, and beside the house it sits against the wall. What the business does on site only from confirmed practices. Never promise the ground will change. By category: Concrete Contractor reads it as water pooling on a slab laid to the wrong falls; Road Construction Company as standing water across the bays. Not slow draining ground on its own: the symptom FAQ may own that. |
| A back garden you cross on wet grass | no level, dry surface where the garden is used | A situation card: the back door opens onto grass or onto an old patio of cracked slabs, the bins and the shed are reached across the lawn, a step down from the door lands on nothing. What decides it: the levels at the door and the fall away from the house, the ground there, and how the household uses the garden. What the work gives them, in plain words: a patio laid to fall away from the house, a path that is a path in every weather, steps with treads that do not rock. By category: Paving reads it as the patio, path or steps and their base; Concrete Contractor as a concrete base or path, or an imprinted patio and the sealer it will need looking after (schedule led: what slips and when, the reason in the sealer worn by feet and sun, never the diary); Road Construction Company as a footway or forecourt laid to a fall, only where the services list carries a car park page. Never a lifestyle pitch, never a fault invented for it. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| The size of the drive or patio | Square metres move the price more than anything else: more dug out, more carted away, more base, more surface, more days. Say it plainly and give no figure. |
| What comes out and what is underneath | The old surface lifted and taken away, a failed base under it, ground that holds water or moves and needs a deeper dig and a stronger base, and how the digger and the waste lorry get to it. Say the business looks before it prices, from [CV: quote_method] only. No figure, no depth. |
| Where the rain has to go | A channel drain, a soakaway, a fall built towards a border, or the open stone base a permeable drive needs to hold the water: each is work under the surface the customer never sees. Say why a front garden that has to drain inside its own boundary can add to the job. No figure, never the rule's name. |
| The surface and the edges | The finish chosen, the edging or kerbs bedded and backed in concrete, curves and cuts, and at the front a dropped kerb, which is the council's charge and never a figure here. Name a material only if the trade facts or [CV: materials_methods] give it. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (the area, what comes out and what is underneath, where the rain has to go) and how the quote is given, from [CV: quote_method] only. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. A manufacturer scheme's guarantee is the scheme's, under its terms. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What does your [WORK_LOWER] work include? | The jobs themselves, named from the card list (new drives by surface, patios and paths, repairs, kerbs), and the size of job taken on, from the services list and [CV: typical_jobs] only. Whether the business does the kerb crossing itself only from the services list and [CV: materials_methods]. Link one service page. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at (what is under the surface now, where the water will go, the access, the kerb), what comes back. Where a front garden or a dropped kerb brings a rule in, say it is settled before the design, with "usually"; whether the business handles the application only from [CV: handles_planning]. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year for [WORK_LOWER] work? | Most of the year, with the reasons a laying day is chosen from the trade facts timing cells: a base cannot be compacted on frozen or saturated ground; tarmac has to be rolled before it cools; fresh concrete is kept from frost and from drying too fast while it cures; resin and tar and chip go down on a dry surface inside the system's weather limits. Nothing about spring being busy or booking ahead. No dates, no promises about the weather, never this business's own laying or curing times. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. The usual cause here in plain words, put in the base or in the water (a base too thin for the weight, a fall never built in, nowhere for the rain to go, water that got in and froze), then what the local ground or the street adds (clay that holds water and moves, a frontage falling towards the house, a paved street with its rain running to the road), then what the business does about it. One figure at most. | Process |

**Seasonal swap.** None: `seasonal_trade` is off.

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (signs you need it) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above) and the FAQ slots (A: cost, timing, cover, rules, scope). The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type A entry serves block paving, dropped kerbs and driveway repairs alike. Placeholders: `[SERVICE]` the page keyword without the town, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for driveways".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type A (project trade: every category)

Three framings share this one entry, per the pack's section 2: a problem led page (driveway repairs, concrete repairs and resurfacing, retaining walls, a failed car park surface) uses block 4 below as written; a schedule led page (driveway sealing, resealing imprinted concrete, driveway and patio cleaning, car park line marking) reads the "on a schedule led page" line in each brief, what slips and when; a desire led page (the library's `desire_led` column: every new surface by material, permeable paving, dropped kerbs, kerbs and edging, patios, garden paths, garden steps, concrete bases and paths, play area and sports surfacing, bollards) swaps block 4 for the desire variant at the end of this section.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Checking what is under the old surface | The inspection stage from the trade facts: the ground, what is there now and whether it is sound enough to build on, where the services run, where the rain goes today, how the digger gets in. A part of the job, not a promise about the quote. |
| Breaking out and digging down | The removal and excavation stages from the trade facts: the old surface out, the dig to firm ground, the levels and the falls set out. Name only what the rows give. |
| The base, compacted in layers | The sub base formed and compacted, with the falls made in the base, as the trade facts stages name it; an open stone base under a permeable surface. No depth unless the rows give one for this surface, and never a standard's number. |
| Where the rain will go | The drainage stage from the trade facts for this service: the fall to a border, a channel drain, a soakaway, or the surface and base built to let the rain through. Said as part of the job, never as a rule's name. |
| Edging to hold it all in | The edge restraints, kerbs or edging bedded and backed in concrete before the surface goes down, from the trade facts stages; on a concrete job the formwork. |
| The surface itself | The central stage of the job from the trade facts: the blocks laid and cut on their screeded bed, the resin mixed and trowelled, the tarmac laid and rolled, the concrete placed and finished, the chippings spread and rolled, named as the trade names it. A named product only from [CV: materials_methods]. |
| Joints, finishing and curing | The finishing stages from the trade facts: joints filled and compacted, concrete joints formed, the surface protected while it cures or cools and kept clear of traffic. The time before a car goes on it only as the facts' timing cell gives it for the material, never as this business's figure. |
| Taking the spoil away | What comes off the job and what happens to it. That it leaves with us only when the waste_removal practice is confirmed; otherwise say it is cleared as agreed. Waste carrier registration only if [CV: waste_carrier_registered] is yes. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The first things you notice | the job left undone | The things a homeowner notices first, from the trade facts signs row, in their words: the same dip back again, a patch broken at its edge, chippings coming loose, the old coat peeling or gone white, paving green and slippery, bay lines faded. The one cause this card makes: the job left undone. Then what it leads to if left, from the skipped column: water gets into the break and weakens what is under it, and every car that passes makes the opening bigger; specific, never alarming. On a schedule led page (driveway sealing, resealing imprinted concrete, driveway and patio cleaning, car park line marking) the card is what slips and when, with the reason in the material and never in the customer's diary: a sealer thinned by tyres and sun so the colour fades and oil marks stay in; joints clogged with dirt that weeds root into from above; lines worn faint where the traffic turns. Ordinary block paving does not need sealing (Table E), so the sealing page never says an unsealed drive is wrong. |
| The same dip keeps coming back | support underneath never put right, only the top | A repair that has sunk again, blocks rocking round a patch, a crack reopening through a concrete repair, a pothole back through the dressing. The one cause this card makes: the surface was replaced without the support under it being put right. Say what the job does underneath so it stays put, from the trade facts stages and the done badly row: the drainage looked at first, the failed material lifted or cut out, what supports it repaired, then the surface reinstated and compacted; an overlay does not correct a base that moves, and a dressing over a pothole shows it again. Say plainly when a patch holds (a small area over a base that is still sound) and when it does not (a base that has failed across the drive), and that on resin, tarmac or concrete a repair usually shows. No depth or figure the rows do not give; never a dig at another trade. On a schedule led page: what a season's wear has moved, from the signs row (joints that have lost their sand so blocks shift; a patch of sealer worn through where the car turns). |
| Edges breaking away and blocks spreading | edging that was never set to hold the surface in | Blocks spreading at the edge, tarmac breaking away along the side, gravel spilling onto the path, a kerb leaning out, a border unit sunk. The one cause this card makes: nothing at the edge holding the surface in, because the edging was never put in, or was laid without its concrete bed and backing, so the surface unravels from the outside inwards (Table B: spreading edges from restraints that were not up to it; leaning kerbs from a foundation or backing that was not). Say what the job does about it from the trade facts stages: the trench, the concrete foundation, the units bedded and lined through, then haunched behind and left until the concrete has taken; in gravel, a grid holds the stone in place but is not a substitute for the base under it (Table E). On a schedule led page the card reads as the edges and joints of a cleaned surface, where the sand was washed out and has to be brushed back in (Table A cleaning). Not settlement across the drive: card 2 owns that. |
| Water getting in and under | water held with no way out | Water sitting in the wheel tracks or by the door, potholes that started where water got into the tarmac and froze, a resin surface holding water on top, a permeable drive with joints full of mud, runoff reaching the road. The one cause this card makes: water held with no way out. Say what the job does about it from the trade facts: the drainage diagnosed before anything is lifted, a channel drain where the drive falls to the house, a soakaway or a border inside the garden, the falls formed in the base and not made up in the bedding (Table E), the open stone layers under a permeable surface kept clean of fines so they go on draining. Never promise the ground will change. On a schedule led page: a sealer gone white where moisture was trapped under it (Table B sealing), and a clean that opens the joints and the drainage paths again. Not the fall of a new surface: the category page owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much there is to lay | The size factor from the trade facts price row: the area, the length of edge, the number of kerbs or treads. Say it plainly and give no figure. |
| What has to come out first | What is lifted, broken out or worked round before the job starts, from the trade facts price row: an old surface, a base that has failed, poor ground, the spoil taken away. Say the business looks before it prices, from [CV: quote_method] only. |
| Getting the machines in | Where the digger, the roller and the waste lorry can get to, where a skip sits, what has to be barrowed by hand, from the trade facts price row. Say why tight access costs more time. |
| The surface, the edges and the drains | The finish chosen, the curves and cuts, the edging or kerbs, a channel drain or a soakaway, from the trade facts price row and [CV: materials_methods], and why one costs more than another. A named product only from [CV: materials_methods]. A dropped kerb's charge is the council's, never a figure here. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us About Your Drive or Patio; We Visit and Price the Job, or We Price Your Job without the site visit practice; We Start on a Date That Suits You).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: the facts give no duration for these jobs, so what decides it (the size, what comes out, the base the ground needs, the weather on the day) and the time the surface needs before a car or feet go on it, which depends on the material and the weather and is given only as the facts' cell gives it, never as this business's figure. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. A manufacturer scheme's guarantee is the scheme's, under its terms. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Will I need permission for [SERVICE_LOWER]? | From the trade facts rule rows only, put as the thing that usually applies, with "usually" or "in most cases", and the practical moment it bites (settled before the design, applied for before the drive goes in). A new surface at the front of the house: usually outside a planning application when the rain can pass through it or runs onto a border, a lawn or a soakaway inside the garden; usually inside one when it sends the rain to the road; no area figure. A dropped kerb: the pavement is the council's, so it has to agree before the kerb is lowered. Where the house sits on a classified main road, a planning application is added to that. The council weighs sight lines, trees and lamp posts, and whether a parked car would hang over the pavement. Who lowers the kerb differs by council, so never say the business builds it or can obtain the consent unless the services list and [CV: handles_planning] say so. A patio or path at the back: usually none. Steps where there was level access into the house, a listed home, a conservation area with its own controls: say a rule can come in, without naming it. Never a standard's number, an Act's name or legal advice. Where the rows give no rule for this service, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words: the dig, the base, the edging, the drainage, the surface and the finish for this job. What it does not cover only from the services list (the kerb crossing where the council builds it, a different surface), with one sibling service page or the category page linked. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. The usual cause here in plain words, put in the base or in the water, then what the local ground or the street adds, then what this service does about it. One figure at most. | Process |

**Seasonal swap.** None: `seasonal_trade` is off.

**Desire led variant** (`service_page_blocks.A.desire`). Nobody has symptoms of wanting a new driveway. A page the library flags `desire_led` reads this block 4 in place of the one above: the customer's situation, what decides it (the mechanism) and what the work gives them, never a fault invented for it. Everything else on the page (What's Included, block 5, the steps, the FAQ slots, the symptom question) is the type A entry's. No driveways page is flagged emergency, so nothing wins over it. H2: Is [SERVICE] Right for Your Home?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|
| Somewhere to park, sit or walk that you don't have now | the ground and the use it has to take | The customer's situation: the car on the road with a front garden nobody uses, a shared drive with room for one car, a back door that opens onto grass, a slope to the shed with no steps. What decides it: the ground and the use it has to take (a car's weight on a front garden, feet and furniture on a patio, a wheelbarrow on a path), the depth of the frontage and whether the kerb is already dropped, and where the rain will go. What the work gives them, from the trade facts stages for this service: a drive sized for the cars they have on a base built for their weight; a patio laid to fall away from the house; a path that is dry in every weather; steps with treads bedded so they do not move; on the Dropped kerbs page, the crossing itself and what the council looks at before agreeing it; on the Bollards page, an opening that only the people they choose can drive through; on a play or sports surfacing page, a surface built and tested for the fall height or the sport it serves. Never a fault invented for it, never a lifestyle pitch: the ground and the use, not the look. |
| Getting what's underneath right first | the layers underneath, which decide how long it stays put | The customer's situation: they have had a cheap quote, or a knock at the door from someone with tarmac left over from a job nearby, and want to know what the difference buys. What decides it: the layers they will never see once it is finished (the dig to firm ground, the base compacted in layers with the falls made in it, the edging bedded and backed in concrete, the drainage), which is where a quick job cuts corners and where it gives way inside a couple of winters. What the work gives them: those layers done as the trade facts stages name them for this service, so the surface stays where it was laid; on resin bound and tar and chip, the old surface underneath checked and made sound first, because a thin new layer shows up whatever is wrong underneath; on concrete, the joints formed and the slab protected while it cures; on a dropped kerb, a crossing built to the council's own specification and inspected by it. One specific from the stages for this service; no depth or figure the rows do not give; never a dig at another trade. A written quote before any work starts only when the written_quote practice is confirmed. |
| Which surface suits your frontage | the rain, the slope and the use deciding the surface | The customer's situation: they are weighing two or three ways of doing it (blocks against resin against gravel against tarmac against concrete; porcelain against natural stone against concrete flags on a patio; a fixed, removable or retractable bollard). What decides it: whether the rain has to pass through the surface or can run to a border inside the garden, the slope (loose gravel on a slope wants a grid to hold it), how the drive is used (turning, a van, a trailer), what is under it now (resin bound and tar and chip want a sound base beneath; a failed one comes out first), how much looking after they want, and how it looks against the house last, from the trade facts materials and methods cell for this service. What the work gives them: the option that suits their frontage, never the one that is best in general. A named product only from [CV: materials_methods]. No claim about how long one lasts against another, and no price comparison, unless the rows or the client values give it (Table G: none found). On the Dropped kerbs page there is no option to weigh: the council's specification decides, so the card is what the council will and will not agree to. |
| What it needs from you afterwards | what the new surface needs to settle in and stay draining | The customer's situation: they want to know what they are taking on once the job is done. What decides it: what the new surface needs to settle and then through the year, from the trade facts stages, timing cell and Table E for this service: time kept off it before a car goes on, which depends on the material and the weather and is given only as the facts' cell gives it; joint sand brushed back in when it is lost; a permeable drive's joints kept clear of soil and leaves so the water can still get through; gravel raked back and topped up; imprinted concrete resealed as its sealer wears, an interval only as the facts' product advice gives it and never promised; ordinary block paving needing no sealer at all. What the work gives them: an honest picture of what it saves them and what it does not. Never a promise about how it will look or last; a cleaning or sealing visit offered only where the services list has one. |

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (the problems the town's homes have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the niche steps. The briefs are town wide, not per category: the town profile, the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED carries the town's other pages' causes). No seasonal swap and no symptom question on a location page. The pack's section 3 gives the anchors: ground type, slope towards the house, housing era and frontage depth, classified roads, street trees, controlled parking zones and surface water flood risk where the research confirms them, conservation areas with front garden controls; every anchor must change the work, and none is a judgement about today's drives. Placeholders: `[WORK]` the primary category's work noun (Paving), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town.

- A niche with no section here has its location pages refused: "no location block briefs for driveways".

### Type A (project trade: every client)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Ground that moves under a drive | the ground under the town's streets | Drives that have dipped in the tyre tracks, slabs that have tilted, cracks across concrete, water that stands for days. The one cause this card makes: the ground under the town's streets; the town profile and a symptom say which ground (clay that holds water and shrinks and swells with the seasons, chalk or sand that drains freely, a river valley, made ground on a new estate). Say what it means for any job that goes into the ground, in plain words: the dig, the base the ground needs, where the water can be sent; never a depth or a figure, never a promise the ground will change. Not a base too thin for the weight, not a fall never built in: the town's category and service pages own those. |
| Frontages laid out before the car | front gardens laid out for a street with no cars on it | A front too shallow for a car to sit on without hanging over the pavement, a shared drive between semis, a verge between the garden and the road. The one cause this card makes: front gardens laid out for a street with no cars on it, which the town profile dates (terraces near the centre with shallow fronts, interwar semis with room for a car in front, post war estates with shared drives and verges). Tie the era to what the work involves and never to a judgement on today's frontages: on a shallow front the question is a surface that drains and a path, not a parking space; on a deeper one a drive sized to the house's cars; on a shared drive, whose land the edge sits on. What the business does only from confirmed practices. |
| Kerbs the council has to agree to | a crossing the council has to agree to | A full height kerb outside a house with room to park, a crossing that was never agreed, a tree or a lamp post where the kerb would need to drop. The one cause this card makes: the pavement belongs to the council whose road it is, so the council has to agree before it is lowered, and a classified main road adds a planning application ("usually", never the Act's name). What the town adds, from the profile and the research only: the classified roads through the town, trees on the pavement line and lamp posts that fix where a kerb can drop, controlled parking zones where the research confirms them. Never the council's process, fees or timescales unless the research gives them, never its approved contractors, never a promise about its answer. |
| Rain with nowhere to go on a paved street | rain running off paved fronts with nowhere to soak in | A street where every front has been paved and the rain runs off them all onto the road, a gully that cannot keep up in a downpour, a front that falls towards the house. The one cause this card makes: rain running off paved fronts with nowhere to soak in; the town profile and the research say where (surface water flood risk where it is confirmed, a slope towards the houses, a low street). Say what usually applies to a new front surface (the rain passing through it, or a fall to a border or a soakaway inside the garden) and what a front that falls towards the house usually needs (a channel drain across it), in plain words and never the rule's name. Not water on one drive or one patio: the service pages own that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Getting a digger onto the frontage | On a terraced street the digger, the skip and the waste lorry all work from the road, with parking to clear and a skip that has to sit on the highway. Say why that adds time (never "the only way": a superlative); the town profile says which streets are terraced. No figure. |
| Frontages that fall towards the house | A front garden that slopes down to the door needs its falls designed, a channel drain across it and more digging at the top than a flat one. Say it plainly, from the town profile where it gives the slope. No figure. |
| Conservation areas and classified roads | Where the town has conservation areas with front garden controls, or the house sits on a classified road, the application before the work can start adds time, and some things cannot be done at all. "Usually", never the order's or the area's official name. From the dossier rules only; otherwise the council's consent for a crossing as something that usually applies. |
| What is under the old drive | Tarmac laid over old concrete, a doorstep trader's overlay over a base that had already failed, made ground on a new estate, an old path under the lawn: what has to come out and be taken away before anything new goes in. What the town's housing era usually left in the ground, from the profile only, said as what the work meets and never as a judgement on the drives. How it is taken away only from confirmed practices. No figure. |

**Steps.** The niche steps (Tell Us About Your Drive or Patio; We Visit and Price the Job; We Start on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (access from the road, a slope towards the house, what has to come out) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at, what comes back. Where the town's roads or front garden controls bring a rule in, say it is settled before the design, with "usually"; whether the business handles the application only from [CV: handles_planning]. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year for [WORK_LOWER] work? | Most of the year, with the reasons a laying day is chosen from the trade facts timing cells: a base cannot be compacted on frozen or saturated ground; tarmac has to be rolled before it cools; fresh concrete is kept from frost while it cures; resin goes down dry, inside its system's limits. Where the town profile gives the ground (clay still wet in spring, chalk dry early), say what it does to that window. Nothing about spring being busy or booking ahead. No dates, no promises about the weather, never this business's own laying or curing times. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

- **No duration for any job** (Table G). Every "how long" brief gives the factors only. Ask each client for a typical duration for three jobs and the time they ask customers to keep a car off each surface; until then the copy says it depends on the material and the weather.
- **No universal sub base depth, laying course, tarmac thickness, resin depth or concrete grade** (Tables E and G: the figures found are one maker's, for one product). No brief carries a depth; "compacted in layers" is as far as the facts go. Ask Ray whether a client's own standard build up (from [CV: materials_methods]) may be named on its pages.
- **The front garden area threshold and the rule's name** are in Table C, but the briefs never carry them (the README: what usually applies, never an Act or an area). Confirm with Ray that the copy should keep the threshold out even when a client handles planning.
- **Who builds the dropped kerb** differs by council and the facts give no national list. The briefs never say the business builds the crossing or can secure consent; the tick list asks the client, and the services list decides whether a Dropped kerbs page exists at all.
- **Commercial work** (car parks, line marking) has no client value of its own. The briefs write those pages only where the services list carries a car park page; ask Ray whether a `[CV: commercial_work]` style value should gate the Road Construction Company tab instead.
- **Resin bound against resin bonded** is explained in Table E, but the library folds resin bonded into the Resin bound driveways page; the page must explain the difference, and the client must say which they lay (tick list).
- **Sealing intervals and resanding intervals**: the facts give one maker's advice for imprinted concrete and none for blocks; the schedule led briefs give the reason in the material and no interval. Ask the client what they advise and whether it may be stated as their own practice.
- **Comparative lifespans and prices** of tarmac, blocks and resin: none verified (Table G). The desire card on choosing a surface makes no such claim; a client who wants one must give a source.
- **The Resin Bound Association** has no verified membership page (Table D); it is not in the logo tiers.
- **Garden levelling and retaining walls** are aliased into this library from the landscaper's; their briefs are the problem led type A set here, with no card of their own. Ask Ray whether a driveways client who lists them should read the landscaper entry's pages instead.
