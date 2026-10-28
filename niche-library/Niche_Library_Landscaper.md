# Niche Library Entry: Landscaper / Gardener

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads this file; the model never sees the slot names, only the resolved words.

Business type defaults to **A (project trade)**. Landscaping is a split niche: set `[CV: business_type]` per client. Mostly installs → A. Mostly maintenance → B. Mixed → A with a schedule line in step 3.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Landscaping / landscaping |
| trade_person / trade_person_plural | landscaper / landscapers |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | no |
| big_ticket | yes (full garden makeovers, patios, driveways) |
| schema_subtype | HomeAndConstructionBusiness (schema.org has no landscaper subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) |
|---|---|
| garden, back garden, front garden, lawn, patio, driveway, path, hedge, border, fence, decking | plot, site, property, grounds (unless an estate), hardscape, softscape, outdoor living space, green space, curb appeal |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about your garden and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about your garden and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (emergency_niche = no) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About Your Garden**
   Brief: how to get in touch and what is useful to send first (rough size, what they want, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Visit and Price the Job** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the visit and what gets looked at on site (levels, drainage, access, what stays and what goes). Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
   Without the practice (`step_2_no_visit`): **We Price Your Job**
   Brief: a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **We Start on a Date That Suits You**
   Brief: the start date is agreed in advance, to suit the customer. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it). Mixed A/B clients add one line on ongoing maintenance visits.

Type B wording (maintenance led landscapers) uses the B defaults from the Homepage Structure, section 3.

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer warranty → insurance |
| fears (in order, one per Why choose us point) | 1. a firm that has not done this kind of garden before; 2. groundwork that fails later (patios that sink or hold water, fences that lean); 3. a price that grows once the job starts; 4. being left with a half finished garden and no idea what happens next |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies:** BALI (British Association of Landscape Industries), APL (Association of Professional Landscapers), TrustMark.
- **Tier 2, manufacturer approvals:** Marshalls Register, Bradstone Assured, Brett Approved Installer.
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards. Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if something is damaged during the job. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. | no | Trust |
| faq_3_none | What happens if something isn't right after the job? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does a garden landscaping project take? | Depends on size, groundwork and materials. Give the factors, not a number unless confirmed. Weather can move hard landscaping days. | no | Timing |
| faq_B | Why does water sit on my patio or lawn after rain? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words: ground underneath that drains slowly, a surface that falls the wrong way, no drain or soakaway to take the water. Then what the local ground adds, then the fix. | **yes** | Process |
| faq_C (fallback) | Is it better to lay turf or sow grass seed? | Turf gives a usable lawn sooner; seed costs less and suits larger areas but takes longer to establish. Timing matters for both. | no | Process |
| faq_D (fallback) | What is the best time of year to landscape a garden? | Hard landscaping runs most of the year in dry spells; planting and turfing do best in autumn and spring. Booking ahead for spring. | no | Timing |
| faq_planning (big ticket, only if [CV: handles_planning] confirmed) | Do I need planning permission for a patio or driveway? | Most back garden patios do not. Front driveways over 5 square metres need permeable paving or drainage into the garden, otherwise permission. Conservation areas add controls. | no | Process |

Sources for faq_A to faq_D: reworded from common People Also Ask questions for landscapers in the UK. Replace with real customer questions when Brandon or the client supplies them.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Paving: porcelain / natural stone / concrete slabs / block paving / resin bound / gravel
- Base: MOT Type 1 sub base / permeable base / concrete
- Lawns: rolled turf / seed / artificial grass
- Fencing: close board / panel / featherboard; posts in concrete / concrete spurs / metal posts
- Decking: softwood / hardwood / composite
- Other: green waste taken away / mini digger on site / design drawings provided

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

turfing, turf laying, artificial grass, lawn mowing, scarification, scarifying, aeration, lawn feeding, overseeding, lawn treatment, hedge trimming, hedge cutting, weeding, weed control, mulching, planting, border planting, garden clearance, seasonal clearance, crown reduction, crown lifting, pollarding, pruning, tree felling, tree removal, stump grinding, stump removal, fencing, fence installation, decking, pergola, patio laying, block paving, resin bound, driveway, retaining wall, raised bed, water feature, pond, garden design, 3D design, drainage, soakaway, levelling, irrigation, garden lighting, jet washing, pressure washing

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| desert landscaping | (never named) |
| pool landscaping | (never named) |
| bumper block | (never named) |
| general construction | (never named) |
| artificial turf | artificial grass |
| sod installation | turf laying |
| turf management | lawn care |
| lawn mowing | lawn mowing |
| grass seeding | seeding lawns |
| lawn landscaping | new lawns |
| lawn care | lawn care |
| hardscaping | paving and walling |
| brick paver | block paving |
| concrete masonry | concrete and block work |
| concrete work | concrete bases |
| stonemasonry | stone walling |
| stone landscaping | stone features |
| rock landscaping | rockeries |
| driveway or path paving | driveways and paths |
| driveway landscaping | driveways |
| driveway installation | new driveways |
| driveway replacement | driveway replacement |
| patio paving | patios |
| patio design | patio design |
| patio enclosure | covered patios |
| patio decks | patio decking |
| grading and resloping | levelling |
| excavation | groundwork and levelling |
| garden levelling | levelling |
| drainage | drainage |
| retaining wall | retaining walls |
| outdoor step | garden steps |
| water feature | water features |
| pond | pond care |
| green landscaping | planting |
| groundskeeping | garden maintenance |
| landscape management | garden maintenance |
| landscaping maintenance | garden maintenance |
| landscape installations | new gardens |
| landscape design construction | design and build |
| landscape architecture | garden design |
| custom landscape design | garden design |
| landscaping design | garden design |
| landscape design | garden design |
| garden design | garden design |
| garden decorating | garden makeovers |
| cabling and bracing | tree bracing |
| tree trimming | tree pruning |
| stump grinding | stump grinding |
| stump removal | stump removal |
| tree transplanting | moving trees |
| tree planting | tree planting |
| tree removal | tree removal |
| composite deck | composite decking |
| wood deck | timber decking |
| deck refinishing | deck restoration |
| wood staining | deck staining |
| deck remodel | deck makeovers |
| pergola | pergolas |
| fenc | fencing |
| path landscaping | paths |
| garden landscaping | landscaping |
| gardening services | gardening |
| garden work | gardening |


## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). A card never leads with a specialist service (tree bracing, artificial grass) unless it is in jobs_wanted. A service listed under one category goes in that category's card, never another card, even when GBP files it elsewhere (lawn mowing and seeding go under Lawn Care Service, not Gardener). JSON slot: core_services.

- Landscaper: garden makeovers, patios, planting
- Landscape Gardener: garden makeovers, patios, planting, new gardens, paving and walling, retaining walls, garden steps
- Landscape Designer: garden design, design and build, patio design, planting
- Gardener: garden maintenance, hedge trimming, weed control, mulching
- Lawn Care Service: lawn mowing, seeding lawns, new lawns, turf laying, lawn care
- Tree Service: tree pruning, tree removal, stump grinding, tree planting
- Paving Contractor: block paving, new driveways, driveway replacement, groundwork and levelling
- Deck Builder: timber decking, composite decking, deck installation, deck repair
- Fence Contractor: fencing, gates

Service words for the whole job rather than one service: landscaping, garden makeovers, gardening, garden maintenance, new gardens, design and build. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it (for example a garden makeover question goes to Landscape Gardener, not Garden decorating). JSON slot: general_service_words.

Problem words: drainage. When an FAQ question names the job as well as the problem ("What drainage is needed before a new driveway or patio?"), it goes to the job's page (paving), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches; some are roofer only, six are landscaper only: weeds taken out by the root, bare soil covered after a clearance, a nesting bird check before hedge cutting, autumn leaf clearance, green waste taken away or left as the customer chooses, and, for every niche, the price agreed before any work starts; added 25 Oct from the claims the first category page run left). The category page briefs name the practice key a line depends on; a ticked practice counts as confirmed for the validator and the claims reviewer alike.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every landscaping client for:
- a "from" price for 3 typical jobs (e.g. a patio, a new lawn, a regular maintenance visit);
- a typical duration for the same 3 jobs;
- whether quotes are written, and whether the price is fixed once agreed;
- team size, and who does the work on site.

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Local Experience Behind Every Job**
2. Cover → **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

Brandon, 23 Oct. the work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": landscaper → landscaping, gardener → gardening, landscape gardener → landscape gardening, landscape designer → garden design, tree service → tree surgery, paving contractor → paving, deck builder → decking, lawn care service → lawn care. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs (`category_page_blocks`) use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Draft, 23 Oct 2026, for Brandon's read against the SOP and the calibration pack. Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above), the FAQ slots and, with `seasonal_trade` on, the one card and one FAQ that swap in. Placeholders: `[CAT]` the page keyword without the town (Gardener, Garden Landscaping), `[CAT_LOWER]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises.

- `seasonal_trade`: yes
- `category_types` (a category's type beats the client's): gardener → B, lawn care service → B
- A niche with no section here has its category pages refused: "no category block briefs for landscaper".

### Type A (project trade: Landscape Gardener, Landscape Designer, Tree Service, Paving Contractor, Deck Builder)

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Water that sits where it shouldn't | a surface laid with no fall | Puddles on paving, a soggy corner of lawn or beds that stay wet. The one cause this card makes: a surface laid with no fall, so water has nowhere to go. Say what the fix usually involves, in plain words; what the business itself does on site only from confirmed practices. Never promise the ground will change. Not slow draining ground: the symptom FAQ may own that. |
| Surfaces that sink or rock | a base never compacted | Slabs that rock, blocks that dip, a step that moves. The one cause this card makes: a base that was never compacted, so it moves under the surface. Say what a sound base involves in plain words and that the fix starts underneath, not on top. |
| Timber that fails early | timber sitting in wet ground | Fence posts that lean, boards soft at ground level, a pergola post that moves. The one cause this card makes: timber sitting in wet ground with no way for water to get away. Say what the business does differently at ground level, from confirmed practices only; otherwise what a post set properly involves. |
| A garden that has outgrown its layout | planting and levels set for an older garden | Borders too close to paths, a hedge that blocks the way, levels that send water to the house. The one cause this card makes: planting and levels set years ago for a different garden. Say how the business looks at the whole garden before it quotes one part of it, from confirmed practices only. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| The size of the area | Square metres move the price more than anything else: more digging, more base, more material, more days. Say it plainly and give no figure. |
| What is underneath | Clay, old concrete, tree roots or a base that has to come out all add to the dig and the waste. Say the business looks before it prices, from [CV: quote_method] only. |
| Getting to the garden | Rear access, a path down the side, where a skip can sit and how far materials are carried by hand. Say why a tight access costs more time. |
| The materials you choose | Natural stone against concrete, composite against softwood, a permeable base against a plain one. Name a material only if the trade facts or [CV: materials_methods] give it. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (area, ground, access) and how the quote is given, from [CV: quote_method] only. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What does your [WORK_LOWER] work include? | The jobs on the card list and the size of job taken on, from the services list and [CV: typical_jobs] only. Link one service page. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at, what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year for [WORK_LOWER] work? | Hard landscaping runs most of the year in dry spells; planting and turf do best in autumn and spring. Booking ahead for spring. No dates, no promises about the weather. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual cause here in plain words, what the local ground or housing adds, then what the business does about it. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **Damage that shows after a wet winter** (mechanism: frost moving what water had loosened): Lifted slabs, a leaning post, moss across the paving, a lawn that never dried out. The one cause this card makes: frost moving what water had loosened over the winter. Say what the business looks for in spring, from confirmed practices only. FAQ: Can you do [WORK_LOWER] work in winter? (Timing): What runs in the cold months (hard landscaping in dry spells, clearance, fencing) and what waits (turf, planting in frozen ground). No dates.

### Type B (maintenance: Gardener, Lawn Care Service)

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A lawn full of moss and bare patches | shade and damp ground | Moss where the grass is thin and the ground stays damp, bare patches that never fill. The one cause this card makes: shade and damp ground. The fix is scarifying to lift the moss and overseeding the thin patches, linking the lawn care or lawn seeding page where LINKABLE PAGES has one; never mowing alone as the answer. Not compaction, not thatch, not the cutting height: other cards and the FAQ own those. |
| Hedges that have got away | the timing of cuts | A hedge wide at the top and bare at the base, growth over the path. The one cause this card makes: cuts missed or made at the wrong time of year. Say how the round brings it back over more than one cut. A nesting bird check only when the nesting_bird_check practice is confirmed. |
| Weeds that come straight back | roots left in the ground | Weeds through paving joints and across beds within weeks of clearing. The one cause this card makes: roots left in the ground. What the round does so they stay away, from confirmed practices only (weed_roots_out); otherwise say what stops weeds in general terms. Not bare soil or mulch: the mulching card owns that. |
| Borders that dry out or get swamped | bare soil with no mulch | Beds bare and dry by the first warm week, or sodden all winter. The one cause this card makes: bare soil with nothing covering it. Say what the round does through the year, from confirmed practices only (soil_covered_after_clearance). |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How often we visit | A regular round means each visit is shorter, so the price per visit is lower than an occasional big tidy up. Give no pricing basis beyond that (nothing priced on time, no hourly rule). Visit frequency only from the confirmed practices; no promise of a schedule otherwise. |
| The size of the garden | More lawn to cut and edge, more borders to weed, more hedge to trim. Say it plainly and give no figure. |
| What each visit covers | A cut on its own against a visit that covers the lawn, the edges, the beds and the hedges. Say what is usually in a visit, from the card list. |
| Green waste | Whether the waste goes with us or stays, from confirmed practices only (green_waste_choice); otherwise say that what happens to the waste moves the price, without saying which the business does. Waste carrier registration only if [CV: waste_carrier_registered] is yes. |

**Steps.**

1. **Tell Us About Your Garden**
   Brief: How to get in touch and what is useful to send first (the size of the garden, what needs keeping on top of, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Agree the Round and the Price**
   Brief: What a visit will cover and what it costs. The price agreed before the first visit only when the price_agreed_before_work practice is confirmed. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free".
3. **We Start on a Date That Suits You**
   Brief: The first visit goes in the diary on a day that suits the customer. A regular round following on only when the maintenance_schedule practice is confirmed. Never mention the price or changes to the plan.

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the first visit when that practice is confirmed. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What if something gets damaged during a visit? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| scope | always | What does a [WORK_LOWER] visit include? | The jobs on the card list, said as a visit: the lawn, the edges, the beds, the hedges. Link one service page. What is not included only from the services list. | Fit |
| process | always | How do regular visits work? | From the confirmed practices only: whether the customer needs to be in, keys, how the visit is agreed. A frequency only if the practice is confirmed. Never promise a schedule. | Process |
| timing | always | Do you garden all year round? | What the round does in each season in plain words (cutting through the growing season, clearing and pruning in the cold months). No dates. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual cause here in plain words, then what a regular round does about it. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4; the FAQ takes the symptom question's place and the five slots stay, Brandon, 25 Oct): **Leaves and debris burying the lawn** (mechanism: light and air kept off the grass): Leaves left on the grass through autumn, a lawn pale underneath by midwinter. The one cause this card makes: light and air kept off the grass. What the autumn visits do only from confirmed practices (autumn_leaf_clearance); otherwise what clearing the leaves does for the grass. FAQ: When should I book for spring? (Timing): The first cut of the year is the one to book ahead for. No dates, no promise of a slot, nothing about agreeing the round before a rush.

## Service page blocks by business type (service_page_blocks)

Draft, 25 Oct 2026, for Brandon's read against the SOP, the service template and the calibration pack. Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC; Brandon, 25 Oct); block 4 (A: signs you need it; B: signs it's time for a visit) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above), the FAQ slots (A: cost, timing, cover, rules, scope; B: frequency, cost, cover, access, scope) and, with `seasonal_trade` on, the one card and one FAQ that swap in (on a type A page the FAQ replaces the timing slot; on a type B page it takes the symptom question's place, since insurance is always one of the five). The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type A entry serves fencing, patios and stump removal alike. The type is the parent category's (`category_types`) else the client's. Placeholders: `[SERVICE]` the page keyword without the town (Lawn Mowing, Tree Stump Removal), `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for landscaper".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type A (project trade: Landscape Gardener, Landscape Designer, Tree Service, Paving Contractor, Deck Builder)

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Checking the ground and what's already there | The inspection stage from the trade facts: the ground, what has to come out, where the services run, how the materials get in. A part of the job, not a promise about the quote. |
| Clearing and preparing the area | The removal and preparation stages from the trade facts: the old surface or fence out, the dig, the levels. Name only what the rows give. |
| The groundwork underneath | The base, the post holes, the drainage or the depth, as the trade facts stages name them. No figure unless the rows give one, and never a standard's number. |
| The materials for the job | From the trade facts materials and methods cell or [CV: materials_methods]: the options a customer is offered, by their trade name. A named product only from [CV: materials_methods]. |
| The main build or installation | The central stage of the job from the trade facts: the laying, the setting, the grinding, the planting, named as the trade names it. |
| Finishing and tidying up | The finishing stages from the trade facts: joints, edges, backfill, a final level. What the customer sees when the job is done. |
| Clearing the arisings | What comes off the job and what happens to it, from the trade facts stages (remove or redistribute arisings). Whether it leaves with us only from the confirmed practices (green_waste_choice); otherwise say it is cleared or kept as agreed. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The first signs | the job left undone | The things a homeowner notices first, from the trade facts signs row, in their words. The one cause this card makes: the job left undone. Then what it leads to if left, from the skipped row: specific, never alarming. |
| It's moved, sunk or leant | a stage skipped underneath, so the ground gives | A surface, a post, a level or a finish that has shifted or dropped, including where a job was done once and left roots, a loose base or a shallow grind behind. The one cause this card makes: a stage skipped underneath, so the ground gives. Say what the job does underneath so it stays put, from the trade facts stages and the done badly row; no depth or figure the rows do not give; never a dig at another trade. |
| It's past patching up | wear that a repair no longer holds | Rot, cracking, moss in the joints, a lean that comes back: the signs from the trade facts that a repair no longer holds. The one cause this card makes: wear that a repair no longer holds. Say when a patch repair stops being worth it and what doing the job properly involves, from the stages. Not settlement or a skipped stage: card 2 owns those. |
| Water in the wrong place | water with nowhere to go | Puddles, a soggy patch, damp at a wall or a post. The one cause this card makes: water with nowhere to go. Say what the job does about it from the trade facts; never promise the ground will change. Not the fall of a surface or an uncompacted base: the category page owns those. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much there is to do | The size factor from the trade facts price row: the area, the length, the number, the height. Say it plainly and give no figure. |
| What's there now | What has to come out or be worked round before the job starts, from the trade facts price row: an old surface, roots, a base, waste. Say the business looks before it prices, from [CV: quote_method] only. |
| Access for materials and machines | Rear access, a path down the side, where a skip or a machine can go, what is carried by hand, from the trade facts price row. Say why tight access costs more time. |
| The finish you choose | The material and finish options from the trade facts price row and [CV: materials_methods], and why one costs more than another. A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us About Your Garden, We Price Your Job or We Visit and Price Your Job, We Start on a Date That Suits You); the emergency steps when the emergency layout is on.

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: the duration where the row gives one, else what decides it (the size, the ground, the access). Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Do I need permission for [SERVICE_LOWER]? | From the trade facts rule rows only, as what usually applies, with "usually" or "in most cases": the condition that brings a rule in (a boundary, a height, a protected tree, a listed home, a front garden) and what the customer does about it. Never a standard's number, an Act's name or legal advice. Where the rows give no rule, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words. What it does not cover only from the services list, with one sibling service page or the category page linked. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual cause here in plain words, what the local ground or housing adds, then what this service does about it. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **What a winter leaves behind** (mechanism: ground heaving and shrinking through the winter): What shows in spring after the cold months: the signs from the trade facts for this job. The one cause this card makes: ground heaving and shrinking through the winter. Say what the business looks for in spring from confirmed practices only; otherwise what the job puts right. Not water sitting (card 4) and not a skipped stage (card 2). FAQ: When is the best time of year for [SERVICE_LOWER], and how long does it take? (Timing): From the trade facts timing row only: the season the job suits and why, then the duration where the row gives one, else what decides it. No dates, no promises about the weather. This is the one place the timing is written.

### Type B (maintenance: Gardener, Lawn Care Service)

**What's Included.** H2: What's Included in a [SERVICE] Visit. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Looking over the area first | The first stage of a visit from the trade facts: debris, growth, hazards, what has changed since last time. A part of the visit, not a promise. |
| Setting the height, line or method | The cutting height, the line of the hedge, the treatment chosen: from the trade facts methods cell. A named product only from [CV: materials_methods]. |
| The main work of the visit | The central stage from the trade facts: the mow, the cut, the clearance, the treatment, named as the trade names it. |
| Edges, sides and the awkward bits | The edging, strimming, the sides and top, the corners a machine cannot reach: from the trade facts stages. |
| Collecting what comes off | Clippings, arisings, what the visit takes off. Collected or left only from the confirmed practices (clippings_collected, green_waste_choice); otherwise say it is collected or spread as agreed. |
| Paths and surfaces cleared before we leave | The last stage from the trade facts: paths swept, surfaces cleared, the area left usable. |
| The visit pattern you choose | Only from [CV: visit_frequency_options]; when it is blank, write that visits follow the pattern agreed with you and name no frequency. |

**Block 4, signs it's time for a visit.** H2: Signs It's Time for a [SERVICE] Visit

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Growth has got ahead of you | a visit missed in the growing season | The signs from the trade facts signs row: long grass, a hedge over the path, beds overrun. The one cause this card makes: a visit missed in the growing season. Then what the visit does, from the stages; what skipping leads to from the skipped row. |
| It looks untidy from the house | edges and lines left uncut | The things that show from a window or the door: ragged edges, an uneven line, clumps left on the grass. The one cause this card makes: edges and lines left uncut. Say what the visit puts right. |
| It keeps coming back | the cause never dealt with, only what shows | Weeds, moss or growth that returns within weeks of a tidy up. The one cause this card makes: the cause never dealt with, only what shows. Say what the visit does about the cause, from the trade facts; never a product the client values do not give. Not roots left in the ground, not shade and damp: the category page owns those. |
| It's taking more of your weekend than it should | a round that has turned into a catch up | The customer's side: a job that has become a catch up every time instead of a short regular one. The one cause this card makes: a round that has turned into a catch up. Say what a regular visit changes, without a frequency unless [CV: visit_frequency_options] is set. |

**Block 5, how visits are priced.** H2: How We Price [SERVICE] Visits in [CITY]

| Card | Brief |
|---|---|
| What a visit has to get through | The size and the growth, from the trade facts price row: a larger or awkward area, long or wet growth, more to cut or clear. Say it plainly and give no figure. |
| How much is in the way | Obstacles, slopes, beds to work round, access for the machine, from the trade facts price row. Say why they add time. |
| The first visit | An area left a season needs a first visit that is a bigger job; after that each visit is priced as a visit. Nothing priced on time, no hourly rule, no frequency unless [CV: visit_frequency_options] is set. Not the regular round against a tidy up: the category page owns that. |
| Extras you add to the visit | Work the visit can take on as well, from the sibling service pages and the services list only (an edge, a feed, a hedge, a treatment), and that each adds to the visit. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Tell Us What Needs Keeping On Top Of**
   Brief: How to get in touch and what is useful to send first (the size of the area, what needs doing, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Agree the Visit and the Price**
   Brief: What a visit will cover and what it costs. The price agreed before the first visit only when the price_agreed_before_work practice is confirmed. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free".
3. **We Start on a Date That Suits You**
   Brief: The first visit goes in the diary on a day that suits the customer. A regular pattern following on only when the maintenance_schedule practice is confirmed. Never mention the price or changes to the plan.

**FAQ slots.** Five before the symptom question: frequency, cost, one cover question (insurance, else the fallback; Brandon, 25 Oct: insurance is always one of the five), access, scope; a sixth, rules or standards, only when the service has Table C rule rows (Brandon, 25 Oct). The frequency answer owns the season the work runs (there is no separate timing slot).

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| frequency | always | How often should [SERVICE_LOWER] be done? | What decides it, from the trade facts timing row (the growing season, the weather, the species) in plain words, and the season the work runs. A frequency only from [CV: visit_frequency_options]; otherwise say the pattern is agreed with you and nothing more. This is the one place the timing is written. | Timing |
| cost | always | How much does a [SERVICE_LOWER] visit cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the first visit when that practice is confirmed. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What if something gets damaged during a visit? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| access | always | Do I need to be home for a [SERVICE_LOWER] visit? | From [CV: access_handling] and the confirmed practices only: whether the customer needs to be in, side gates, keys. When nothing is on file, say the arrangements for getting in are agreed before the first visit and nothing more. | Process |
| scope | always | What does a [SERVICE_LOWER] visit include? | The What's Included items said as a sentence, in other words. What a visit does not cover only from the services list, with one sibling service page linked. | Fit |
| rules | the service has rule rows | Are there rules or standards for [SERVICE_LOWER]? | From the trade facts rule rows only, written as what usually applies to the work, never as something the customer must comply with: a grounds maintenance standard reads as how the job is done, not as homework for the reader. Plain words with "usually" or "in most cases"; what the customer does only where the row says so. Never a standard's number, an Act's name or legal advice. | Process |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual cause here in plain words, then what a regular visit does about it. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4; on a type B page the FAQ takes the symptom question's place, the five slots stay): **What the season is about to throw at it** (mechanism: growth that comes all at once in spring): The growth or the fall that comes all at once: spring growth, autumn leaves, as the trade facts timing row has it for this work. The one cause this card makes: growth that comes all at once in spring. Say what getting ahead of it looks like, from the stages; no frequency unless [CV: visit_frequency_options] is set. FAQ, in the symptom question's place: When should I book [SERVICE_LOWER] for the season? (Timing): The first visit of the year is the one to book ahead for, and what the season does to the work in plain words. No dates, no promise of a slot, nothing about agreeing the visit before a rush. The frequency question owns the season the work runs: do not repeat it.

## Location page blocks by business type (location_page_blocks)

Draft, 27 Oct 2026, for Brandon's read before the first live run. Used by the location page job (CORE (18)): block 4 (the problems the town's homes have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the type's category page steps (A: the niche steps) unless an entry carries its own. The briefs are town wide, not per category: the town profile, the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED carries the town's other pages' causes). No seasonal swap and no symptom question on a location page: the town's category pages carry those. The type is the client's (`business_type`), never a category override. Placeholders: `[WORK]` the primary category's work noun (Landscaping, Gardening), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town. The copy rules of CORE (18) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's or order's name, no how it's done sentence.

- A niche with no section here has its location pages refused: "no location block briefs for landscaper".

### Type A (project trade: the client's type is A)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Ground that holds the rain | the ground under the town's gardens holding water | Lawns soft for days, beds that sit wet, water lying at the bottom of a slope. The one cause this card makes: the ground under the town's gardens holding water; the town profile and a symptom say which ground (clay, a high water table, a river valley, a flood setting). Say what it means for any job that goes into the ground, in plain words; never promise the ground will change. Not a surface laid with no fall, not a base left loose, not water with nowhere to go: the town's category and service pages own those. |
| Boundaries as old as the houses | fences and walls put up when the houses were built | Panels that lean, posts soft at the base, a garden wall with a bow in it. The one cause this card makes: fences and walls put up when the houses were built, now at the end of their life; the town profile gives the era. What replacing a boundary involves, in plain words; what the business does only from confirmed practices. Not timber in wet ground, not a repair that no longer holds: other pages own those. |
| Trees that have outgrown the garden | trees planted for a bigger garden than there is now | Roots lifting a path, a canopy over the whole lawn, leaves in every gutter. The one cause this card makes: trees planted when the garden was bigger, or the house further away, than it is now (never the word plot: it is on the words to avoid list); the town profile gives the mature trees, the conservation areas, the tree protection. What usually applies before a protected tree is touched, with "usually" and never an order's name. Not shade on a lawn: the Gardener pages own that. |
| Front gardens turned over to parking | rain running off a paved front | A paved front that sends rain to the road or next door, a dropped kerb with nothing to soak the water. The one cause this card makes: rain running off a paved front with nowhere to soak in. What usually applies to a new hard surface at the front (a permeable surface, or a drain inside the garden), in plain words, never the rule's name; where the town profile gives the street pattern (terraces with no drive), say what it means. Not water on a patio: the service pages own that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Getting in on a terraced street | Where the back garden is reached through the house or a shared side path, materials come in by hand and the skip sits on the road. Say why that adds time (never "the only way": a superlative); the town profile says which streets are terraced. No figure. |
| Gardens on a slope | A garden that falls or rises from the house needs levels taken, steps or a retaining edge, and more digging than a flat garden. Say it plainly, from the town profile where it gives the slope. No figure. |
| Conservation areas and protected trees | Where the town has conservation areas or tree protection, the checks and the paperwork before work can start add time, and some things cannot be done at all. "Usually", never the order's or the area's official name. From the dossier rules only; otherwise a tree survey as something that sometimes applies. |
| What the last owner left behind | Old concrete, a shed base, buried rubble, an overgrown hedge: what has to come out and go in a skip before anything new goes in. Older gardens in the town carry more of it; say so without unkindness. No figure. |

**Steps.** The niche steps (Tell Us About Your Garden; We Visit and Price the Job; We Start on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise what moves the price in a town like this (access, slope, what has to come out) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at, what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year for [WORK_LOWER] work? | Hard landscaping runs most of the year in dry spells; planting and turf do best in autumn and spring. Booking ahead for spring. No dates, no promises about the weather. | Timing |

### Type B (maintenance: the client's type is B)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Lawns that struggle on this ground | the soil under the town's lawns | Grass that browns in the first dry week, or stays mossy all winter. The one cause this card makes: the soil under the town's lawns (the profile: fast draining gravel, heavy clay, a river valley). What a regular round does about it in plain words (the height of cut, feeding, scarifying where it fits); anything the business itself promises only from confirmed practices. Not shade and damp ground: the Gardener pages own that. |
| Hedges as old as the houses | hedges planted with the houses and left to grow out | Privet and laurel put in when the street was built, now wide at the top, bare at the base and over the pavement. The one cause this card makes: hedges planted with the houses and left to grow out. How a round brings a hedge back over more than one cut, never one hard cut. Not the timing of cuts: the Gardener pages own that. |
| Gardens that run away in the growing season | growth outpacing the time the owner has | A garden tidy in April and lost by July. The one cause this card makes: growth outpacing the time the owner has for it (the profile may say who lives here: commuters, retired owners, big gardens). What a regular round keeps on top of, from the card list; a frequency only from the confirmed practices. |
| A garden that came with the house | a garden inherited with the house | New owners with planting they do not know, a lawn cut the wrong way for a season, beds left to see what comes up. The one cause this card makes: a garden inherited with the house (the profile: new estates, turnover, families moving in). What a first visit sorts out and what waits a season; promises only from confirmed practices. Never that the owner has neglected it. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Getting the mower round the back | Terraced streets with no side gate mean the mower and the waste go through the house. Say why that adds time to a visit, from the profile where it gives the housing. |
| A garden that has been left a while | The first visit on a garden that has had a season or two off is a bigger job than the round that follows. Say it plainly; no figure; not the service pages' first visit card in the same words. |
| Banks and sloping lawns | A lawn on a bank is cut with a different machine and takes longer; steps and terraces add edges. From the profile where the town has slopes. |
| Big hedges and old trees | A mature hedge takes longer each cut, and some trees are a tree surgeon's job, not the gardener's. Say which work moves to the tree pages only where LINKABLE PAGES has one in this town. |

**Steps.** The category type B steps (Tell Us About Your Garden; We Agree the Round and the Price; We Start on a Date That Suits You), by the fallback.

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | What does a regular [WORK_LOWER] round cost in [TOWN]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the first visit when that practice is confirmed. One factor at most, never the list again. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | insurance | Are you insured for garden work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something gets broken on a visit? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| process | always | How do regular visits work in [TOWN]? | From the confirmed practices only: whether the customer needs to be in, keys, how the visit is agreed. A frequency only from [CV: visit_frequency_options]. Never promise a schedule. | Process |
| timing | always | Do you garden through the winter in [TOWN]? | What the round does in each season in plain words (cutting through the growing season, clearing and pruning in the cold months). No dates. | Timing |

## Blog slots (blog)

Blog Post Structure (Ray, 28 Oct 2026), Layer 2 section 3. Blogs reuse the homepage slots and add these; code reads `landscaper.json` `blog` (blog/blocks.js). Each slot starts from the business type default; a slot left out takes its default. Seasonal topics are shared with the quarterly GBP post batch, so blog and GBP posts follow one calendar; they apply only while `seasonal_trade` is yes.

| Slot | Value |
|---|---|
| seasonal_topics | Lay new turf: September to October, publish August · Prepare the garden for winter: November, publish October · Spring lawn care: March to April, publish February · Hedge cutting after the nesting season: August to September, publish July |
| safety_topics (the safety switch: no DIY steps) | Electrics for garden lighting · Outdoor sockets and garden power · Retaining walls and structural garden walls · Felling a large tree near a building |
| blog_cta_h2 (the Next step heading) | A: Talk to a Local [TRADE_PERSON] About [TOPIC] · B: Book a Local [TRADE_PERSON] for [TOPIC] |
| cost_unit (how a cost guide prices the job) | A: per job · B: per visit |
| decision_pairs (common "X or Y" choices, run as decision posts) | Turf or seed · Porcelain or sandstone · Composite or timber decking · Gravel or block paving for a driveway · Fence panels or closeboard fencing · Real or artificial grass |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)
