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

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches; some are roofer only).

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

Draft, 23 Oct 2026, for Brandon's read against the SOP and the calibration pack. Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above), the FAQ slots and, with `seasonal_trade` on, the one card and one FAQ that swap in. Placeholders: `[CAT]` the page keyword without the town (Gardener, Garden Landscaping), `[CAT_LOWER]`, `[WORK]` the category's work noun (Gardening), `[WORK_LOWER]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises.

- `seasonal_trade`: yes
- `category_types` (a category's type beats the client's): gardener → B, lawn care service → B
- A niche with no section here has its category pages refused: "no category block briefs for landscaper".

### Type A (project trade: Landscape Gardener, Landscape Designer, Tree Service, Paving Contractor, Deck Builder)

**Block 4, common problems.** H2: Common [CAT] Problems

| Card | Brief |
|---|---|
| Water that sits where it shouldn't | Puddles on paving, a soggy corner of lawn or beds that stay wet. The usual causes: a surface laid with no fall, a base that holds water, or ground that drains slowly. Say what the business checks first and what the fix usually involves, without promising the ground will change. |
| Surfaces that sink or rock | Slabs that rock, blocks that dip, a step that moves. Cause: a base that was never compacted, bedding that was skipped, or edges with nothing holding them. Say what a sound base involves in plain words and that the fix starts underneath, not on top. |
| Timber that fails early | Fence posts that lean, boards soft at ground level, a pergola post that moves. Cause: posts not set deep enough, timber sitting in wet ground, no gap for water to get away. Say what the business does differently at ground level. |
| A garden that has outgrown its layout | Borders too close to paths, a hedge that blocks the way, levels that send water to the house. Cause: planting and levels set years ago for a different garden. Say how the business looks at the whole garden before it quotes one part of it. |

**Block 5, cost factors.** H2: What Affects the Cost of [CAT] in [CITY]

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
| cost | always | How much does [CAT_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (area, ground, access) and how the quote is given, from [CV: quote_method] only. | Price |
| cover | guarantee | Do you guarantee your [CAT_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured for [CAT_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What does your [CAT_LOWER] work include? | The jobs on the card list and the size of job taken on, from the services list and [CV: typical_jobs] only. Link one service page. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at, what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year for [CAT_LOWER] work? | Hard landscaping runs most of the year in dry spells; planting and turf do best in autumn and spring. Booking ahead for spring. No dates, no promises about the weather. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual cause here in plain words, what the local ground or housing adds, then what the business does about it. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **Damage that shows after a wet winter**: Lifted slabs, a leaning post, moss across the paving, a lawn that never dried out. Cause: water that sat all winter in a base or against timber, and frost moving what water had loosened. Say what the business looks for in spring. FAQ: Can you do [CAT_LOWER] work in winter? (Timing): What runs in the cold months (hard landscaping in dry spells, clearance, fencing) and what waits (turf, planting in frozen ground). No dates.

### Type B (maintenance: Gardener, Lawn Care Service)

**Block 4, common problems.** H2: Common [CAT] Problems

| Card | Brief |
|---|---|
| A lawn full of moss and bare patches | Moss where the grass is thin and the ground stays damp, bare patches that never fill. Cause: shade, compacted ground, thatch, cutting too low. Say what a regular round does about each, from the trade facts. |
| Hedges that have got away | A hedge wide at the top and bare at the base, growth over the path. Cause: missed cuts, cutting at the wrong time. Say how the round brings it back over more than one cut, and that nesting birds are checked for first. |
| Weeds that come straight back | Weeds through paving joints and across beds within weeks of clearing. Cause: roots left in, bare soil with nothing covering it. Say what the round does so they stay away: roots out, soil covered. |
| Borders that dry out or get swamped | Beds bare and dry by the first warm week, or sodden all winter. Cause: no mulch, planting too close, ground that holds water. Say what the round does through the year. |

**Block 5, cost factors.** H2: What Affects the Cost of [CAT] in [CITY]

| Card | Brief |
|---|---|
| How often we visit | A regular round keeps on top of growth and costs less per visit than a catch up every few months. Visit frequency only from the confirmed practices; no promise of a schedule otherwise. |
| The size of the garden | More lawn to cut and edge, more borders to weed, more hedge to trim. Say it plainly and give no figure. |
| What each visit covers | A cut on its own against a visit that covers the lawn, the edges, the beds and the hedges. Say what is usually in a visit, from the card list. |
| Green waste | Taken away or left for the council bin or the compost heap. Waste carrier registration only if [CV: waste_carrier_registered] is yes. |

**Steps.**

1. **Tell Us About Your Garden**
   Brief: How to get in touch and what is useful to send first (the size of the garden, what needs keeping on top of, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Agree the Round and the Price**
   Brief: What a visit will cover and what it costs, agreed before the first visit. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free".
3. **We Start on a Date That Suits You**
   Brief: The first visit goes in the diary on a day that suits the customer, and the round follows from there. Never mention the price or changes to the plan.

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does a [CAT_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise what moves the price of a visit (how often, the size of the garden, what the visit covers) and how the price is agreed, from [CV: quote_method] only. | Price |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What if something gets damaged during a visit? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| scope | always | What does a [CAT_LOWER] visit include? | The jobs on the card list, said as a visit: the lawn, the edges, the beds, the hedges. Link one service page. What is not included only from the services list. | Fit |
| process | always | How do regular visits work? | From the confirmed practices only: whether the customer needs to be in, keys, how the visit is agreed. A frequency only if the practice is confirmed. Never promise a schedule. | Process |
| timing | always | Do you garden all year round? | What the round does in each season in plain words (cutting through the growing season, clearing and pruning in the cold months). No dates. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual cause here in plain words, then what a regular round does about it. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **Leaves and debris burying the lawn**: Leaves left on the grass through autumn, a lawn yellow underneath by December. Cause: no clearance after leaf fall. Say what the autumn visits do. FAQ: When should I book for spring? (Timing): Spring is the busiest time for a maintenance round, so the earlier the better. No dates, no promise of a slot.

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)
