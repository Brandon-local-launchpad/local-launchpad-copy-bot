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

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases, 3 Nov 2026) |
|---|---|---|
| garden, back garden, front garden, lawn, patio, driveway, path, hedge, border, fence, decking | plot, site, property, grounds, hardscape, softscape, green space, curb appeal (words_avoid_exceptions: grounds is allowed where the page is about an estate or a commercial site, where grounds is the customer's own word for it) | outdoor living space, outdoor living, dream outdoor space, dream garden, garden of your dreams, oasis, sanctuary, haven, retreat, outdoor room, transform your garden, transform your outdoor space, al fresco, entertaining space (the pack's section 7 lifestyle language; never on a project page) |

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
| fears_by_type.B (a type B client reads these instead: the maintenance customer buys reliability over months) | 1. visits that get missed or stop without a word; 2. a different job each time, depending on who turns up; 3. nobody noticing what is starting to slip (a hedge past its cut, moss taking a corner of the lawn, a bed going over); 4. a round that ends up costing more than was agreed |

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
| faq_D (fallback) | What is the best time of year to landscape a garden? | When each kind of work goes in and why, in the soil or the plant, from the trade facts timing cells: paving and groundwork wait for ground that is neither frozen nor sodden, because a base cannot be firmed when it is wet; turf, seed and planting go in while the soil is warm and moist so the roots take before heat or frost. Nothing about spring being busy or booking ahead. No dates, no promise about the weather. | no | Timing |
| faq_planning (big ticket, only if [CV: handles_planning] confirmed) | Will my patio or driveway need planning permission? | Point at the trade facts rule rows (Table C) and write what usually applies, with "usually" or "in most cases": a patio in the back garden usually needs none; a new surface at the front of the house usually needs the rain to soak away inside the garden; a raised deck or a structure near a boundary is where a rule can come in. What the customer does about it only as the row gives it. No figure, no area, no height, never an Act's or an order's name. Conservation areas and listed homes add controls: say so without naming them. | no | Process |

Sources for faq_A to faq_D: reworded from common People Also Ask questions for landscapers in the UK. Replace with real customer questions when Brandon or the client supplies them.

### Type B homepage overrides (faq_slots_by_type.B)

A type B client's homepage reads these in place of the shared slot of the same name (the pack's section 1: the maintenance customer buys reliability over months, not a project). Every other slot stays as above.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_A | How often do you need to come? | What decides it, in plain words: grass and hedges grow fastest from spring to midsummer as the soil warms and slow right down in the cold months and in a dry spell, so the gap between visits follows the growth (the trade facts timing cells). A frequency only from [CV: visit_frequency_options]; otherwise say the pattern is agreed with you and nothing more. Never promise a schedule; a seasonal contract only when confirmed. | no | Timing |
| faq_D (fallback) | What does a regular visit cover? | The jobs on the card list said as one visit: the lawn and its edges, the beds, the hedge when it is in its cutting window. What a visit does not cover only from the services list. Nothing about design or projects unless the services list has them: a maintenance client's copy never implies design work. Link one service page where LINKABLE PAGES has one. | no | Fit |

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
- `category_types` (a category's type beats the client's, the pack's section 2 table): gardener → B, lawn care service → B, landscape gardener → A, paving contractor → A, deck builder → A, tree service → A. Landscape Designer and any other category take the client's type. So a type B client's paving, decking, tree and landscape gardener pages get the A briefs, and a type A client's gardener and lawn care pages get the B briefs.
- A niche with no section here has its category pages refused: "no category block briefs for landscaper".

### Type A (project trade: Landscape Gardener, Paving Contractor, Deck Builder and Tree Service always; Landscape Designer when the client's type is A)

The pack's section 2 split inside type A: desire led services (patios, decking, pergolas, ponds, artificial grass, paths, steps, turf, tree planting) are written as the customer's situation; problem led ones (drainage, driveway and decking repairs, retaining walls, levelling, tree removal) as symptom, cause, consequence; schedule led ones (sealing, restoration, mulching, weed control, treatments) as what slips and when. Block 4 below is a mix: cards 1 and 4 are situations, cards 2 and 3 symptoms, and every brief says how it reads on a Paving, Decking, Tree Service or Landscape Gardener page, so a Tree Service page is never briefed on puddles on paving.

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A garden with nowhere to sit out | no level, dry place to sit near the house | A situation card, not a fault: the household looks at the garden from the house and has nowhere flat and dry for a table and chairs, to let the children out or to stand with a coffee. What decides it: the levels and the ground by the back door (a slope, a lawn that stays wet, a step down to nothing). What the work gives them, in plain words: a patio or a deck made the size they will use, a level lawn, steps that make the lower garden reachable. By category: Paving reads it as the patio and its base; Decking as the deck, where the evening sun falls and what holds it up; Landscape Gardener as whichever fits the garden; Tree Service as the one sunny corner shaded out by a tree that has grown over it, and what lifting or thinning the crown gives back. Never a lifestyle pitch, never a fault invented for it. |
| Slabs, boards or posts that move underfoot | what holds it up was never made firm | Problem led: a slab that rocks, blocks that have dipped, a deck board that gives, a post that leans, a young tree that rocks in its stake. The one cause this card makes: what holds it up was never made firm (a sub base not compacted, a subframe on soft supports, a post set shallow, a tree staked loosely), so the ground or the frame gives under it. Say what a sound base, footing or support involves in plain words from the trade facts stages, and that the fix starts underneath, not on top. By category: Paving reads it in the base under slabs and blocks; Decking in the joists, posts and supports; Tree Service in the stake, the planting pit or a stump left under a surface; Landscape Gardener in steps, paths and walls. No depth or figure the rows do not give. |
| Rain that stays where it lands | a surface laid with no fall | Problem led: puddles that sit on paving after rain, a deck green and slippery by autumn, a corner of lawn soft for days, a planting hole that fills with water. The one cause this card makes: a surface laid with no fall, so the rain cannot run off it. Say what the fix usually involves (a fall built into the laying, a base that drains, timber kept off wet ground, a tree planted at the right level) from the trade facts stages; what the business does on site only from confirmed practices. Never promise the ground will change. By category: Paving reads it on the surface; Decking in boards and joists that never dry; Tree Service in a tree standing in ground that holds water; Landscape Gardener across the garden. Not slow draining ground on its own: the symptom FAQ may own that. |
| Planted or built for a different garden | planting and levels set for an older garden | A situation and a warning sign in one: borders now hard against the path, a drive too small for the cars that use it, a deck in the corner the sun left years ago, a tree planted close to the house that now reaches the roof. The one cause this card makes: planting and levels set years ago for a different garden. Say how looking at the whole garden before pricing one part of it works, from confirmed practices only. By category: Landscape Gardener reads it as layout and levels; Paving as the front garden and the drive; Decking as a platform in the wrong place or at the wrong height; Tree Service as the warning signs in the tree itself (branches rubbing the building, deadwood showing, a damaged limb, from the trade facts signs row) and that which answer fits depends on what the tree is, how close it stands and what the ground is, never that a tree is or is not safe. Never a judgement about the garden's age or state. |

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
| scope | always | What does your [WORK_LOWER] work include? | The jobs themselves, named from the card list, and the size of job taken on, from the services list and [CV: typical_jobs] only. Link one service page. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at, what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year for [WORK_LOWER] work? | When each kind of [WORK_LOWER] work is best done and why, in the soil or the plant, from the trade facts timing cells: paving, footings and groundwork wait for ground that is neither frozen nor sodden, because a base cannot be firmed when it is wet; turf, seed and planting go in while the soil is warm and moist so roots take before heat or frost; tree work follows the species and the nest check rather than a season. Nothing about spring being busy or booking ahead. No dates, no promises about the weather. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom is a seasonal sign (moss through winter, a brown lawn in a drought, early leaf fall), say first when it is normal and then what is not, before anything else. Then the usual cause here in plain words, what the local ground or housing adds, and what the business does about it. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **Damage that shows after a wet winter** (mechanism: frost moving what water had loosened): Say first what is normal at the end of winter: moss on shaded paving, a lawn slow to dry, timber dark with damp, all of which ease as the ground warms and dries. Then what is not: a slab that has lifted, a post that now moves, a step that rocks, a wall with a new crack. The one cause this card makes: frost moving what water had loosened over the winter. Say what gets looked at in spring, from confirmed practices only, and what putting it right involves from the trade facts stages. Nothing about spring being busy or booking ahead. FAQ: Can you do [WORK_LOWER] work in winter? (Timing): What runs in the cold months (hard landscaping in dry spells, clearance, fencing) and what waits (turf and planting while the ground is frozen), with the reason: a base cannot be firmed on frozen or sodden ground, and roots do not take in frozen soil. No dates.

### Type B (maintenance: Gardener and Lawn Care Service, whatever the client's type)

The pack's section 2: a Gardener page's block 4 is what slips when visits stop and the moments in the year a visit matters most; a Lawn care page's is what shows in the lawn, and the season whose treatment answers it. Every brief below carries a time of year with its reason in the plant or the ground, says how the card reads on a Lawn care page, and, where the sign is a seasonal one (winter moss, summer browning), says first when it is normal.

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A lawn full of moss and bare patches | shade and damp ground | Say first what is normal: moss in a lawn at the end of a wet winter is usual and thins as the grass starts growing again in spring. Then what is not: moss that holds on through summer, bare patches that never fill. The one cause this card makes: shade and damp ground. The fix is scarifying to lift the moss and overseeding the thin patches, in spring or early autumn while the grass is growing and can recover, linking the lawn care or lawn seeding page where LINKABLE PAGES has one; never mowing alone as the answer, never a promise the moss will not return. On a Lawn care page the card reads as what shows in the lawn, and the season whose treatment answers it: the autumn moss treatment and scarify, the spring feed. Not compaction, not thatch, not the cutting height: other cards and the FAQ own those. |
| Hedges that have got away | the timing and height of cuts | A hedge gone wide at the top and thin at the base, growth over the path. The one cause this card makes: cuts missed or made at the wrong time of year, so the growth went woody. Time of year and the reason: a cut before midsummer, while the season's growth is still soft, keeps the blade out of thick wood; the window differs by species (the trade facts timing cell). The nest check before any cut is a stage of the job in the trade facts; written as this business's own practice only when nesting_bird_check is confirmed. Say what bringing a hedge back involves (a cut in stages over more than one season, never one hard cut) with no promise it will thicken up or recover. On a Lawn care page the card reads as the lawn in a dry summer: grass going brown in a dry spell is normal and greens again with rain (say so first); what is not is grass scalped by a low cut or cut hard after being left, so the height and the timing of cuts are the fix. |
| Weeds that come straight back | roots left in the ground | Weeds through paving joints and across beds within weeks of clearing. The one cause this card makes: roots left in the ground. Say what dealing with the root involves, from confirmed practices only (weed_roots_out: lifted out with the root); otherwise what stops weeds in general terms, with no promise they stay away. Time of year and the reason: hoeing and lifting while weeds are small in spring, before they set seed and before the roots go deep. On a Lawn care page the card reads as weeds in the lawn that are mown off and come back because the root stays, and the spring or early summer treatment while they are growing (a product only where [CV: materials_methods] gives it). Not bare soil or mulch: the mulching card owns that. |
| Borders that dry out or get swamped | bare soil with nothing covering it | Beds bare and dry by the first warm week, or sodden all winter. The one cause this card makes: bare soil with nothing covering it. Time of year and the reason: mulch goes on in spring once the soil has warmed and is moist, or in autumn, so it holds the moisture in and keeps the light off weed seedlings; never onto frozen soil. What the round does through the year from confirmed practices only (soil_covered_after_clearance). On a Lawn care page the card reads as bare or thin patches where soil shows through the grass, and overseeding in early autumn or mid spring while the soil is warm and moist so the seed takes. No promise about how the planting or the lawn will come on. |

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
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the first visit when that practice is confirmed. The cost cards hold the list: never repeat it or point to it. | Price |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What if something gets damaged during a visit? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| scope | always | What does a [WORK_LOWER] visit include? | The jobs named from the card list (never 'on this page' or 'listed above': name the work), said as a visit: the lawn, the edges, the beds, the hedges. Link one service page. What is not included only from the services list. | Fit |
| process | always | How do regular visits work? | From the confirmed practices only: whether the customer needs to be in, keys, how the visit is agreed. A frequency only if the practice is confirmed. Never promise a schedule. | Process |
| timing | always | Do you garden all year round? | What the round does in each season in plain words (cutting through the growing season, clearing and pruning in the cold months). No dates. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom is a seasonal sign (moss through winter, a brown lawn in a drought, early leaf fall), say first when it is normal and then what is not, before anything else. Then the usual cause here in plain words and what a regular round does about it, in its season. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4; the FAQ takes the symptom question's place and the five slots stay, Brandon, 25 Oct): **Leaves and debris burying the lawn** (mechanism: light and air kept off the grass): Leaves left on the grass through autumn, a lawn pale underneath by midwinter. Say first that leaves falling in autumn is the season, not a fault. The one cause this card makes: light and air kept off the grass where the leaves lie for weeks. Time of year and the reason: clearing through autumn, before the leaves mat down in the wet. What the autumn visits do only from confirmed practices (autumn_leaf_clearance); otherwise what clearing the leaves does for the grass. FAQ: When should the first cut of the year happen? (Timing): When the grass starts growing again as the soil warms in spring, and why the first cut is a light one (the top taken off, never cut hard) so the grass is not stressed. No dates, no promise of a slot, nothing about booking ahead or agreeing the round before a rush.

## Service page blocks by business type (service_page_blocks)

Draft, 25 Oct 2026, for Brandon's read against the SOP, the service template and the calibration pack. Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC; Brandon, 25 Oct); block 4 (A: signs you need it; B: signs it's time for a visit) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above), the FAQ slots (A: cost, timing, cover, rules, scope; B: frequency, cost, cover, access, scope) and, with `seasonal_trade` on, the one card and one FAQ that swap in (on a type A page the FAQ replaces the timing slot; on a type B page it takes the symptom question's place, since insurance is always one of the five). The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type A entry serves fencing, patios and stump removal alike. The type is the parent category's (`category_types`) else the client's. Placeholders: `[SERVICE]` the page keyword without the town (Lawn Mowing, Tree Stump Removal), `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for landscaper".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type A (project trade: Landscape Gardener, Paving Contractor, Deck Builder and Tree Service always; Landscape Designer when the client's type is A)

Three framings share this one entry, per the pack's section 2: a problem led page (drainage, repairs, retaining walls, levelling, tree removal) uses block 4 below as written; a schedule led page under a project category (driveway sealing, decking restoration, mulching, weed control, lawn treatments) reads the "on a schedule led page" line in each brief, what slips and when; a desire led page (the library's `desire_led` column: patios, decking installation, composite decking, pergolas, ponds and water features, artificial grass installation, garden paths, garden steps, turf laying, tree planting) swaps block 4 and the seasonal card for the desire variant at the end of this section.

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
| The first signs | the job left undone | The things a homeowner notices first, from the trade facts signs row, in their words. The one cause this card makes: the job left undone. Then what it leads to if left, from the skipped row: specific, never alarming. On a schedule led page (the sealing, restoring, mulching, weeding, treating, trimming and mowing pages under a project category) the card is what slips and when: a finish worn through by the end of a wet winter, mulch broken down by spring, weeds back as the soil warms, with the reason in the material or the plant from the timing cell, never in the customer's diary. |
| It's moved, sunk or leant | a stage skipped underneath, so the ground gives | A surface, a post, a level or a finish that has shifted or dropped, including where a job was done once and left roots, a loose base or a shallow grind behind. The one cause this card makes: a stage skipped underneath, so the ground gives. Say what the job does underneath so it stays put, from the trade facts stages and the done badly row; no depth or figure the rows do not give; never a dig at another trade. On a schedule led page: what a season's wear has moved, from the signs row (joints that have lost their sand so blocks shift, a fixing standing proud on a deck). |
| It's past patching up | wear that a repair no longer holds | Rot, cracking, moss in the joints, a lean that comes back: the signs from the trade facts that a repair no longer holds. The one cause this card makes: wear that a repair no longer holds. Say when a patch repair stops being worth it and what doing the job properly involves, from the stages. On a schedule led page: the point where cleaning and recoating no longer holds because what is under the finish is soft or loose, from the done badly row. Not settlement or a skipped stage: card 2 owns those. |
| Water in the wrong place | water held with no way out | Puddles, a soggy patch, damp at a wall or a post. The one cause this card makes: water held with no way out. Say what the job does about it from the trade facts; never promise the ground will change. On a schedule led page: a surface that once shed rain and now soaks it up unevenly, from the signs row. Not the fall of a surface or an uncompacted base: the category page owns those. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much there is to do | The size factor from the trade facts price row: the area, the length, the number, the height. Say it plainly and give no figure. |
| What's there now | What has to come out or be worked round before the job starts, from the trade facts price row: an old surface, roots, a base, waste. Say the business looks before it prices, from [CV: quote_method] only. |
| Access for materials and machines | Rear access, a path down the side, where a skip or a machine can go, what is carried by hand, from the trade facts price row. Say why tight access costs more time. |
| The finish you choose | The material and finish options from the trade facts price row and [CV: materials_methods], and why one costs more than another. A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us About Your Garden; We Visit and Price the Job, or We Price Your Job without the site visit practice; We Start on a Date That Suits You); the emergency steps when the emergency layout is on.

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The cost cards hold the list: never repeat it or point to it. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: the duration where the row gives one, else what decides it (the size, the ground, the access). Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Do I need permission for [SERVICE_LOWER]? | From the trade facts rule rows only, put as the thing that usually applies, with "usually" or "in most cases": the condition that brings a rule in (a boundary, a height, a protected tree, a listed home, a front garden) and what the customer does about it. Never a standard's number, an Act's name or legal advice. Where the rows give no rule, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words. What it does not cover only from the services list, with one sibling service page or the category page linked. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom is a seasonal sign (moss through winter, a brown lawn in a drought, early leaf fall), say first when it is normal and then what is not, before anything else. Then the usual cause here in plain words, what the local ground or housing adds, and what this service does about it. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **What a winter leaves behind** (mechanism: ground heaving and shrinking through the winter): What shows in spring after the cold months, from the trade facts signs row for this job. Say first what is normal after a winter (a green film on timber and paving, ground slow to dry, a lawn thin after the cold) and then what is not. The one cause this card makes: ground heaving and shrinking through the winter. Say what gets looked at in spring from confirmed practices only; otherwise what the job puts right. Not water sitting (card 4) and not a skipped stage (card 2). FAQ: When is the best time of year for [SERVICE_LOWER], and how long does it take? (Timing): From the trade facts timing row only: the season the job suits and why, in the soil or the plant, then the duration where the row gives one, else what decides it. No dates, no promises about the weather. This is the one place the timing is written.

**Desire led variant** (`service_page_blocks.A.desire`, 3 Nov 2026). Nobody has symptoms of wanting a patio. A page the library flags `desire_led` reads this block 4 in place of the one above: the customer's situation, what decides it (the mechanism) and what the work gives them, never a fault invented for it. The seasonal card swaps the same way. Everything else on the page (What's Included, block 5, the steps, the FAQ slots, the symptom question) is the type A entry's. The emergency variant wins over it (no landscaper page is flagged emergency). H2: Is [SERVICE] Right for Your Garden?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|
| The part of the garden you never use | ground that is not level, dry or firm enough to use | The customer's situation: a corner, a slope or a stretch of lawn nobody goes to because it is wet, uneven, shaded or bare. What decides it: the ground there (a slope, soil that holds water, a worn patch, a change of level) and how the household wants to use it. What the work gives them, from the trade facts stages for this service: a patio or deck to sit on, a path or steps that make it reachable, a lawn or artificial grass that takes the children, a pond, a pergola or a tree that gives a reason to go down there. Never a fault invented for it, never a lifestyle pitch: the ground and the use, not the dream. |
| Doing it once, properly | the layer underneath, which decides how long it lasts | The customer's situation: they have had a cheap quote or thought about doing it themselves, and want to know what the difference buys. What decides it: the layer they will never see once it is finished (the sub base, the subframe and its supports, the footings, the liner, the soil preparation, the planting pit), which is where a quick job cuts corners and where it gives way a winter or two later. What the work gives them: that layer done as the trade facts stages name it, so the surface stays put. One specific from the stages for this service; no depth or figure the rows do not give; never a dig at another trade. |
| Which option suits your garden | the ground, the shade and the use deciding the option | The customer's situation: they are weighing two or three ways of doing it (turf against seed, timber against composite, a patio against a deck, a liner against a preformed pond, natural against artificial grass, a bare root tree against a container grown one). What decides it: the garden's ground, shade, slope and use, and how much looking after they want, from the trade facts materials and methods cell for this service. What the work gives them: the option that suits their garden, never the one that is best in general. A named product only from [CV: materials_methods]. No claim about lifespan or cost unless the rows or the client values give it. |
| What it will need from you afterwards | what the new surface or plant needs to settle in | The customer's situation: they want to know what they are taking on once the job is done. What decides it: what the new surface or plant needs to settle in and then through the year, from the trade facts stages and timing cell for this service (new turf watered and kept off until it has rooted, a young tree watered through its first summers and its stake checked, artificial grass brushed, a pond's pump looked at, timber recoated, paving joints topped up). What the work gives them: an honest picture of what it saves them and what it does not. Never a promise about how it will look or last; a maintenance visit offered only where the services list has one. |

**Desire led seasonal swap** (card 4): **Getting it in at the right time of year** (mechanism: the window the soil or the plant gives): The customer's situation: they want it ready for the summer, or want to know when it should go in. What decides it: the window the soil or the plant gives, from the trade facts timing cell for this service (turf and seed while the soil is warm and moist; bare root planting in the dormant months; paving and footings when the ground is neither frozen nor sodden; pond planting as the water warms; composite boards at the maker's temperatures). What the work gives them: a job done in its window so it takes. No dates, nothing about spring being busy or booking ahead, no promise about the weather. FAQ: When is the best time of year for [SERVICE_LOWER], and how long does it take? (Timing): From the trade facts timing row only: the season the job suits and why, in the soil or the plant, then the duration where the row gives one, else what decides it. No dates, no promises about the weather. This is the one place the timing is written.

### Type B (maintenance: Gardener and Lawn Care Service, whatever the client's type)

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
| Growth has got ahead of you | a visit missed in the growing season | The signs from the trade facts signs row: long grass, a hedge over the path, beds overrun. The one cause this card makes: a visit missed in the growing season. Time of year and the reason: from spring to midsummer, once the soil has warmed, growth is at its fastest and a missed visit shows within a fortnight. Then what the visit does, from the stages; what skipping leads to from the skipped row (long grass cut hard is scalped, and the clumps shade what is under them). |
| It looks untidy from the house | edge growth creeping over paths and beds | The things that show from a window or the door: grass over the edge of the path, a ragged line against the bed, clumps left on the grass. The one cause this card makes: edge growth creeping over paths and beds between cuts, fastest in late spring when the lawn is growing hardest. Say what the visit puts right (the edge cut back to its line, the clippings collected or spread as agreed) from the stages; no promise it stays that way. |
| It keeps coming back | the cause never dealt with, only what shows | Weeds, moss or growth that returns within weeks of a tidy up. Say first when the return is normal (moss at the end of a wet winter where the ground stays damp, a flush of growth after warm rain) and then when it is not (a weed back within weeks of a treatment in the growing season). The one cause this card makes: the cause never dealt with, only what shows. Say what the visit does about the cause, from the trade facts, and the season it is done in (treatments while the plant is growing, in spring or autumn); never a product the client values do not give, never a promise it will not return. Not roots left in the ground, not shade and damp: the category page owns those. |
| Every cut is a bigger job than the last | growth that thickens and hardens the longer it is left | The customer's side: a job that takes longer every time it is done. The one cause this card makes: growth that thickens and hardens the longer it is left (grass left long is harder to cut evenly and clumps, hedge growth goes woody by midsummer so a late cut goes into thicker wood, weeds left to seed come back in numbers). Time of year: late spring to midsummer, when growth is fastest. Say what a regular visit changes (a cut kept in soft growth), without a frequency unless [CV: visit_frequency_options] is set, and no promise about the result. |

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
| cost | always | How much does a [SERVICE_LOWER] visit cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the first visit when that practice is confirmed. The cost cards hold the list: never repeat it or point to it. | Price |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What if something gets damaged during a visit? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to put it right free. Never invent a guarantee or insurance. | Trust |
| access | always | Do I need to be home for a [SERVICE_LOWER] visit? | From [CV: access_handling] and the confirmed practices only: whether the customer needs to be in, side gates, keys. When nothing is on file, say the arrangements for getting in are agreed before the first visit and nothing more. | Process |
| scope | always | What does a [SERVICE_LOWER] visit include? | The What's Included items said as a sentence, in other words. What a visit does not cover only from the services list, with one sibling service page linked. | Fit |
| rules | the service has rule rows | Are there rules or standards for [SERVICE_LOWER]? | From the trade facts rule rows only, written as the way the work is usually done, never as something the customer must comply with: a grounds maintenance standard reads as how the job is done, not as homework for the reader. Plain words with "usually" or "in most cases"; what the customer does only where the row says so. Never a standard's number, an Act's name or legal advice. This slot is used only when the service has rule rows. | Process |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom is a seasonal sign (moss through winter, a brown lawn in a drought, early leaf fall), say first when it is normal and then what is not, before anything else. Then the usual cause here in plain words and what a regular visit does about it, in its season. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4; on a type B page the FAQ takes the symptom question's place, the five slots stay): **What the season is about to throw at it** (mechanism: growth that comes all at once in spring): The growth or the fall that comes all at once: spring growth as the soil warms, autumn leaves, as the trade facts timing row has it for this work. Say first that the flush is the season doing what it does, not a fault. The one cause this card makes: growth that comes all at once in spring. Say what getting ahead of it looks like, from the stages; no frequency unless [CV: visit_frequency_options] is set; no promise about the result. FAQ, in the symptom question's place: When should [SERVICE_LOWER] start for the year? (Timing): When the first visit of the year should happen and the reason in the plant or the ground, from the trade facts timing cell: mowing and hedge work once growth has started as the soil warms; feeds, seeding and renovation while the soil is warm and moist; mulching before the beds have filled out. No dates, no promise of a slot, nothing about booking ahead or a rush. The frequency question owns the season the work runs: do not repeat it.

## Location page blocks by business type (location_page_blocks)

Draft, 27 Oct 2026, for Brandon's read before the first live run. Used by the location page job (CORE (18)): block 4 (the problems the town's homes have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the type's category page steps (A: the niche steps) unless an entry carries its own. The briefs are town wide, not per category: the town profile, the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED carries the town's other pages' causes). No seasonal swap and no symptom question on a location page: the town's category pages carry those. The type is the client's (`business_type`), never a category override. Placeholders: `[WORK]` the primary category's work noun (Landscaping, Gardening), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town. The copy rules of CORE (18) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's or order's name, no how it's done sentence.

- A niche with no section here has its location pages refused: "no location block briefs for landscaper".

### Type A (project trade: the client's type is A)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Ground that holds the rain | the ground under the town's gardens holding water | Lawns soft for days, beds that sit wet, water lying at the bottom of a slope. The one cause this card makes: the ground under the town's gardens holding water; the town profile and a symptom say which ground (clay, a high water table, a river valley, a flood setting). Say what it means for any job that goes into the ground, in plain words; never promise the ground will change. Not a surface laid with no fall, not a base left loose, not water the surface failed to shed: the town's category and service pages own those. |
| Boundaries as old as the houses | fences and walls put up when the houses were built | Panels that lean, posts soft at the base, a garden wall with a bow in it. The one cause this card makes: fences and walls put up when the houses were built, which the town profile dates. Tie the era to what replacing a boundary involves, never to a judgement on its state: a run of that age comes out with its posts and their concrete and new holes are dug (the trade facts stages); an old wall's footing was built for that wall and not a higher one; where the boundary is shared, the neighbour usually has to be told first ("usually", never an Act's name). What the business does only from confirmed practices. Not timber in wet ground, not a repair that no longer holds: other pages own those. |
| Trees that have outgrown the garden | trees planted for a bigger garden than there is now | Roots lifting a path, a canopy over the whole lawn, leaves in every gutter. The one cause this card makes: trees planted when the garden was bigger, or the house further away, than it is now (never the word plot: it is on the words to avoid list); the town profile gives the mature trees, the conservation areas, the tree protection. What usually applies before a protected tree is touched, with "usually" and never an order's name. Not shade on a lawn: the Gardener pages own that. |
| Front gardens turned over to parking | rain running off a paved front | A paved front that sends rain to the road or next door, a dropped kerb with nothing to soak the water. The one cause this card makes: rain running off a paved front with nowhere to soak in. What usually applies to a new hard surface at the front (a permeable surface, or a drain inside the garden), in plain words, never the rule's name; where the town profile gives the street pattern (terraces with no drive), say what it means. Not water on a patio: the service pages own that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Getting in on a terraced street | Where the back garden can be got to only through the house or by a shared side path, materials come in by hand and deliveries and waste wait on the road. Say why that adds time (never "the only way": a superlative); the town profile says which streets are terraced. No figure. |
| Gardens on a slope | A garden that falls or rises from the house needs levels taken, steps or a retaining edge, and more digging than a flat garden. Say it plainly, from the town profile where it gives the slope. No figure. |
| Conservation areas and protected trees | Where the town has conservation areas or tree protection, the checks and the paperwork before work can start add time, and some things cannot be done at all. "Usually", never the order's or the area's official name. From the dossier rules only; otherwise a tree survey as something that sometimes applies. |
| What the last owner left behind | Old concrete, a shed base, buried rubble, an overgrown hedge: what has to come out and be taken away before anything new goes in. What the town's housing era usually left in the ground, from the profile only (an old path under the lawn, a coal bunker base), said as what the work meets and never as a judgement on the gardens. How it is taken away only from confirmed practices. No figure. |

**Steps.** The niche steps (Tell Us About Your Garden; We Visit and Price the Job; We Start on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (access, slope, what has to come out) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at, what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year for [WORK_LOWER] work? | When each kind of [WORK_LOWER] work is best done and why, in the soil or the plant, from the trade facts timing cells: paving, footings and groundwork wait for ground that is neither frozen nor sodden, because a base cannot be firmed when it is wet; turf, seed and planting go in while the soil is warm and moist so roots take before heat or frost. Where the town profile gives the ground (clay still wet in spring, sand dry by June), say what it does to that window. Nothing about spring being busy or booking ahead. No dates, no promises about the weather. | Timing |

### Type B (maintenance: the client's type is B)

The pack's section 3 for a town's gardens: anchors are ground and growth (soil, drainage, slope, shelter, housing era as plot shape and access), never who lives there; a species only where the town profile gives it; an era says what the work involves, never what state the gardens are in; a seasonal sign (winter moss, summer browning) is called normal first.

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Lawns that struggle on this ground | the soil under the town's lawns | Grass that goes brown in the first dry week, or stays mossy all winter. Say first what is normal (browning in a dry spell that greens again with rain, moss at the end of a wet winter that thins as growth starts) and then what is not (a lawn thin all year, moss holding on through summer). The one cause this card makes: the soil under the town's lawns (the profile: fast draining gravel, heavy clay, a river valley). What a regular round does about it in plain words and in its season (the height of cut in a dry spell, an autumn feed, scarifying or aerating in spring or autumn where it fits); anything the business itself promises only from confirmed practices; never a promise the lawn will stay green. Not shade and damp ground: the Gardener pages own that. |
| Hedges as old as the houses | hedges planted with the houses, now full of old wood | Hedges planted when the street was built, now mature. Name a species only where the town profile gives it; otherwise "the hedges". The one cause this card makes: hedges planted with the houses, now carrying a lot of old wood. What the hedge's age means for the work, never a judgement on how it looks: thick wood at the base that is cut back in stages over more than one season rather than in one hard cut, at the species' time of year, with the nest check before each cut (a stage of the job in the trade facts). No promise it will thicken or recover. Not the timing of cuts: the Gardener pages own that. |
| Gardens that run away in the growing season | the town's ground pushing growth on fast in spring | A garden tidy in April and lost by July. The one cause this card makes: the town's ground pushing growth on fast once the soil warms (the profile: rich or moist soil, a sheltered valley, heavy ground that holds water into summer). Never who lives here. What a regular round keeps on top of through late spring and summer, from the card list; a frequency only from the confirmed practices; no promise about the result. |
| A garden that came with the house | a garden inherited with the house | New owners with planting they do not know, a lawn cut the wrong way for a season, beds left to see what comes up. The one cause this card makes: a garden inherited with the house (the profile: a new estate where the lawn is turf over compacted builder's ground, or an older garden with established planting and old hedges). What a first visit sorts out and what waits a season to see what comes up; promises only from confirmed practices. Never that the owner has neglected it, never a judgement on the previous one. |

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

## Per category overrides (category_overrides)

Brandon, 4 Nov 2026 (copy quality 2, phase 2): a category whose work differs from the shared type entry gets its own briefs here, keyed by the category name in lower case. The code lays them over the type entry for that category page only.

### Paving contractor

Block 5 cost cards about slabs, blocks and the base under them: nothing about boards or posts.

Block 4 is the type A set with card 2 replaced ("Slabs, boards or posts that move underfoot" named boards and posts in its title on a paving hub):

H2: Common [WORK] Problems

| Card | Mechanism | Brief |
|---|---|---|
| A garden with nowhere to sit out | no level, dry place to sit near the house | A situation card, not a fault: the household looks at the garden from the house and has nowhere flat and dry for a table and chairs, to let the children out or to stand with a coffee. What decides it: the levels and the ground by the back door (a slope, a lawn that stays wet, a step down to nothing). What the work gives them, in plain words: a patio or a deck made the size they will use, a level lawn, steps that make the lower garden reachable. By category: Paving reads it as the patio and its base; Decking as the deck, where the evening sun falls and what holds it up; Landscape Gardener as whichever fits the garden; Tree Service as the one sunny corner shaded out by a tree that has grown over it, and what lifting or thinning the crown gives back. Never a lifestyle pitch, never a fault invented for it. |
| Slabs and blocks that rock or have sunk | a sub base too thin or too soft for what sits on it | A slab that rocks when it is stepped on, a line of blocks that has dipped by the drain, a joint that has opened: the sub base under it was never compacted or was too thin for the ground. Say the fix starts underneath (the area lifted, the base made good, the slabs or blocks relaid), from the trade facts stages; no depth, no figure, and nothing about boards or posts. |
| Rain that stays where it lands | a surface laid with no fall | Problem led: puddles that sit on paving after rain, a deck green and slippery by autumn, a corner of lawn soft for days, a planting hole that fills with water. The one cause this card makes: a surface laid with no fall, so the rain cannot run off it. Say what the fix usually involves (a fall built into the laying, a base that drains, timber kept off wet ground, a tree planted at the right level) from the trade facts stages; what the business does on site only from confirmed practices. Never promise the ground will change. By category: Paving reads it on the surface; Decking in boards and joists that never dry; Tree Service in a tree standing in ground that holds water; Landscape Gardener across the garden. Not slow draining ground on its own: the symptom FAQ may own that. |
| Planted or built for a different garden | planting and levels set for an older garden | A situation and a warning sign in one: borders now hard against the path, a drive too small for the cars that use it, a deck in the corner the sun left years ago, a tree planted close to the house that now reaches the roof. The one cause this card makes: planting and levels set years ago for a different garden. Say how looking at the whole garden before pricing one part of it works, from confirmed practices only. By category: Landscape Gardener reads it as layout and levels; Paving as the front garden and the drive; Decking as a platform in the wrong place or at the wrong height; Tree Service as the warning signs in the tree itself (branches rubbing the building, deadwood showing, a damaged limb, from the trade facts signs row) and that which answer fits depends on what the tree is, how close it stands and what the ground is, never that a tree is or is not safe. Never a judgement about the garden's age or state. |


H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| The size of the area | Square metres move the price more than anything else: more digging, more sub base, more slabs or blocks, more days. Say it plainly and give no figure. |
| What is underneath | Topsoil, clay, an old slab base or concrete that has to come out before a new sub base goes in: the dig and the waste set the number of days. Say the business looks before it prices, from [CV: quote_method] only. |
| Getting to the garden | Rear access, a path down the side, where a skip can sit and how far the sub base and the slabs are carried by hand. Say why a tight access costs more time. |
| The slabs or blocks you choose | Natural stone against concrete slabs against porcelain, block paving against slabs, and the bed and the edging each needs: a porcelain slab wants a primed full bed, blocks want a compacted laying course and a kerb to hold them. Name a material only if the trade facts or [CV: materials_methods] give it; nothing here about timber, decking or fencing. Code adds the price line from [CV: price_list] when there is one. |

### Tree service

Copy quality 3, 4 Nov 2026: the Tree service hub is type A, but the shared type A cost cards are groundworks (the area, what is underneath, slabs and timber). This set replaces block 5 on the tree hub alone with the tree surgeon's four cost factors, read for a landscaper's tree pages (removal and felling, stump removal, pruning and crown reduction, cabling and bracing, planting, transplanting). Block 4, the steps and the FAQ slots stay the type A set.

H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How big the tree is and how much comes off | The size of the tree and the extent of the work move the price more than anything else: a bigger crown, more to climb, more to take down and lower, more to chip and clear, a wider stump with more root under it, from the trade facts price rows for the tree pages (tree size; crown size and specified extent; stump diameter and roots). Say it plainly and give no figure. Nothing here about an area of ground, a base or a surface: this hub is the trees. |
| Climbing, platforms and lowering | A tree that can be felled in one into a clear space costs less than one taken down in sections over a roof, a conservatory or a neighbour's garden, with each piece lowered on a rope or a platform brought in, from the trade facts price rows (difficult rigging; aerial access). Say why that takes more people and more time, in plain words. No figure. |
| Getting to the tree | A back garden reached only through the house, a side path too narrow for the chipper or the stump grinder, nowhere for a lorry to stand, a tree close to a building, a road or an overhead line, from the trade facts price rows (access; nearby structures; restricted machine access). Say why tight access and what stands round the tree cost time. No figure. |
| Paperwork and what happens to the timber | A protected tree or a tree in a conservation area needs the council's consent or a notice before the work, and that adds time before anything starts, from the trade facts rules row written as what usually applies, never as legal advice, never the fine, never the Act's name. Then the timber, logs and chippings: left for the customer, left in the garden for a use, or taken away (timber and stump removal; arisings removal). Whether the business takes it away and is registered to carry waste only from [CV: waste_carrier_registered] and the confirmed practices. Code adds the price line from [CV: price_list] when there is one. |

## Per page overrides (service_overrides)

Copy quality 3, 4 Nov 2026: a service page whose job differs from its category's type entry gets its own briefs here, keyed by the page target in lower case (the target names are niche-library/landscaper.csv). `type` makes the page read that type's entry instead of its category's: the one off builds that sit under the round categories (Fencing and Lawn seeding under Gardener, Garden irrigation under Lawn care service) read type A. The code lays the rest (cost, problems, steps, faq_slots, included) over that entry for the page alone; what is not listed stays the entry's. The seasonal swap still replaces block 4's last card on every page of this seasonal trade.

### Fencing (type A)

Type A (a one off build under Gardener, which is a type B round category: without the override the page would read the round briefs). Block 5 from the fencing niche's four cost cards, in the landscaper's voice. Block 4, the steps, the FAQ slots and What's Included stay the type A set.

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How long and how high the run is | The size factor from the trade facts price row: the length of the boundary, the height it has to stand at, so how many posts and how many panels or boards go in, and whether a gate is part of it. Say it plainly and give no figure. Nothing about an area of ground: this page is the fence line. |
| What has to come out first | What comes out or is worked round before a post hole is dug, from the trade facts price row: the old fence and its posts set in concrete, a hedge along the line, growth over the boundary, hard or stony ground. Say the business looks before it prices, from [CV: quote_method] only; where the old fence goes only from confirmed practices (waste_removal), and whether the business is registered to carry it away only from [CV: waste_carrier_registered]. |
| Slopes, corners and access | A garden that falls away so the panels step down the slope, a boundary that turns a corner, a run reached only through the house or down a side path with every post and panel carried by hand, pipes and cables under the line that are checked for before the digging starts, from the trade facts price row and the checking stage. Say why each adds time. |
| The posts, boards and finish you choose | Close board against panels against post and rail, timber posts against concrete posts, and what each is set in, from the trade facts materials cell and [CV: materials_methods], and why one costs more than another. A named product only from [CV: materials_methods]. Nothing about slabs, a sub base or decking. Code adds the price line from [CV: price_list] when there is one. |

### Lawn seeding (type A)

Type A (a one off build under Gardener). Block 5 only; the rest is the type A set.

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| The size of the lawn | The size factor from the trade facts price row: the area to be sown, and whether it is a whole lawn from bare ground or the thin and worn patches in a lawn that is otherwise fine (new seeding against overseeding, from the materials cell). Say it plainly and give no figure. |
| What comes out first: old turf and levelling | What has to go before a seedbed can be made, from the trade facts price row (ground preparation; weed clearance; uneven soil): the old turf and the weeds cleared, a lawn that rises and dips levelled, stones and roots raked out, and how much of that there is. Say the business looks before it prices, from [CV: quote_method] only. |
| Getting the topsoil and the machinery in | Whether topsoil has to be brought in to make a level bed, and how it and the machines reach the lawn: a rear garden down a side path or through the house, where a load can be tipped, what is barrowed by hand, from the trade facts price row (imported topsoil; access). Say why each adds time. Nothing about a sub base or slabs. |
| Seed or turf, and the preparation each needs | Seed against turf, from the trade facts stages: seed goes into a prepared, firmed and raked bed and is watered until it has come through, turf is laid on prepared soil and kept off until it has rooted, and a seed mixture is chosen for the garden (the materials cell). Say why the preparation and the watering move the price more than the seed does, and which the business offers only from the services list and confirmed practices. The season is for the FAQ, not here. A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

### Garden irrigation (type A)

Type A (a one off build under Lawn care service, a type B round category). Block 5 only; the rest is the type A set.

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How many zones and how big the area is | The size factor from the trade facts price row (number of zones): how many parts of the garden are watered on their own (the lawn, the borders, the pots, the vegetable beds), how big each is and how much pipe or dripline runs through it. Say it plainly and give no figure. |
| The water supply and its pressure | Where the water comes from and what it can give, from the trade facts price row (water source changes; backflow protection) and the survey stage: an outside tap by the garden against a supply that has to be brought out or changed, the pressure and flow the system can draw on, and the fitting at the connection that stops water running back into the house supply. Say the business looks at the supply before it prices, from [CV: quote_method] only. Nothing about a hosepipe ban: the supplier's notice decides that and the copy makes no promise about it. |
| The digging, and putting the lawn and beds back | Pipe under a lawn or across a border has to be trenched in and the ground made good after, from the trade facts price row (trenching): turf lifted and relaid, a bed dug through and planted back, a path crossed. Say why a garden already planted costs more to pipe than one still being made, and that the system can go in before the planting (the trade facts timing cell). Nothing about a sub base or slabs. |
| The controller, the heads and the pipe chosen | Dripline or soaker hose in the borders against sprinklers on the lawn, a plain timer against a controller with a rain or moisture sensor, from the trade facts materials cell and [CV: materials_methods], and why one costs more than another. A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

### Tree removal and felling

Under Tree service (type A). Block 5 and block 4 from the tree surgeon's service entry, read for the felling page. Steps, FAQ slots and What's Included stay the type A set.

H2: Signs You Need [SERVICE]

| Card | Mechanism | Brief |
|---|---|---|
| Dead, split, leaning or in the way | a tree that has stopped being safe to keep, or stopped fitting the garden | The things a homeowner notices first, from the trade facts signs row: the tree is dead, a big limb has broken off, the trunk has split, it leans more since the storm, it stands where an extension or a drive with permission is going. The one cause this card makes: a tree that has stopped being safe to keep, or stopped fitting the garden. Then what it leads to if left, from the skipped row: specific, never alarming (a failed part falls in its own time; the clash with the building work stays). Never that the tree is or is not safe from a photo, never felling as the first answer where pruning would do. |
| Topped or cut back hard once, and never the same since | an old cut the tree has grown round | A tree cut back to stubs years ago and now a thick head of weak shoots on rotting stumps of branch, a trunk with a hollow where a big cut never closed, a tree felled once that keeps shooting from what was left, from the trade facts done badly rows (indiscriminate topping; roots left where the grinding was shallow). The one cause this card makes: an old cut the tree has grown round. Say honestly when such a tree is kept and worked on and when taking it down is the right answer, from the stages (inspect, assess, choose the method); never a dig at whoever did it. |
| It's getting worse, not settling down | a defect outpacing what holds the tree up | A lean the customer is sure has grown, a split that has opened wider, a crown thinner this summer than last, a limb that has dropped since the last one, from the trade facts signs row (a significant defect in the trunk; a major limb has failed). The one cause this card makes: a defect outpacing what holds the tree up. Say when watching, pruning or support stops being enough and removal becomes the answer, written as what usually applies; never that the tree is safe, never that it is doomed. Not an old cut left behind: card 2 owns that. |
| A protected tree, or one the council has written about | a tree that cannot come down without someone's say so | The customer has a letter or a worry about permission: the tree may be protected, the house is in a conservation area, a neighbour or the council has raised branches over the pavement, the planning consent for the building work names the tree. The one cause this card makes: a tree that cannot come down without someone's say so. Say what usually applies from the trade facts rules row: consent is applied for before a protected tree is cut down, a tree that looks dangerous is not a blanket exception, the work waits for the answer, and nesting birds are checked for before anything starts. Never legal advice, never the fine, never the Act's name. |

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How big the tree is | The size factor from the trade facts price row (tree size): the height and the girth of the tree, the spread of its crown, how much timber and brash comes down with it. Say it plainly and give no figure. |
| What's around it | The house, a conservatory, a shed, a road, an overhead line, a neighbour's garden under the crown, from the trade facts price row (nearby structures): what has to be lowered rather than dropped and what has to be protected. Say the business looks before it prices, from [CV: quote_method] only. |
| Felled in one or taken down in pieces | A tree with a clear space to fall into against one climbed and dismantled in sections, each piece roped down, a platform brought in where climbing is not the safe way, from the trade facts price row (difficult rigging) and the stages (felling or dismantling method). Say why coming down in pieces takes more people and more time. Nothing about the ground being dug or surfaced. |
| The timber, the brash and the stump | What happens to what comes down, from the trade facts price row (timber and stump removal): logged and left for the customer, chipped and left for the beds, or taken away; and whether the stump is left or taken out as well (the stump page for the grinding). Whether the business takes the waste away only from the confirmed practices and [CV: waste_carrier_registered]; logs left only from the client values. Code adds the price line from [CV: price_list] when there is one. |

### Tree stump removal

Under Tree service (type A). Block 5 and block 4 for the stump page: the depth is agreed to what the ground is for next, with no measurement given; the hand on to the lawn, paving and fencing pages only by LINKABLE PAGES.

H2: Signs You Need [SERVICE]

| Card | Mechanism | Brief |
|---|---|---|
| A stump that catches the mower or is in the way | the stump left in the ground after the tree came down | The things a homeowner notices first, from the trade facts signs row: the stump catches the mower, shoots keep coming up round it, a new lawn, patio or bed cannot be laid level over it. The one cause this card makes: the stump left in the ground after the tree came down. Then what it leads to if left, from the skipped row: it stays in the way, and as it rots a hollow can open under whatever is laid over it. Never a number of years for it to rot: the facts give none. |
| Ground once, and still there under the surface | a job finished at the wrong depth for what the ground was wanted for | A stump ground shallow years ago that keeps sending up shoots, roots met every time a spade goes in where a bed was planned, a dip where the grindings were left in the hole and have sunk, from the trade facts done badly rows. The one cause this card makes: a job finished at the wrong depth for what the ground was wanted for. Say what the job does differently, from the stages: the finish and the depth agreed to the intended use before the machine starts, the hole backfilled and firmed; never a dig at whoever did it. |
| Shoots that keep coming back | live roots left with the energy to shoot | Shoots coming up from the stump and from roots some way from it, a tree that keeps trying to grow back. The one cause this card makes: live roots left with the energy to shoot (the trade facts: some trees sucker from living roots). Say honestly what grinding does and does not do: it takes the stump and the main root plate, the smaller roots stay and rot in their own time, and a separate stump treatment is specified where it is wanted; never a promise that nothing grows back, never a product or a chemical the client values do not give. |
| Ground you want to use for something else | a stump in the way of what the garden is for next | The customer's situation rather than a fault: a lawn, a bed, a shed base, a drive or a fence line planned where the stump sits. The one cause this card makes: a stump in the way of what the garden is for next. Say what the job gives them, from the stages: the stump out to a depth that suits the plan, the ground backfilled and left ready to level, plant or build on, and an honest picture of what stays underneath. On a landscaper's own pages this is where the stump page hands on to the lawn, paving and fencing pages, by link only where they are LINKABLE PAGES. Never a figure. |

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How big the stump is | The size factor from the trade facts price row (stump diameter and roots): the width of the stump, how far its main roots spread, and how many stumps there are. Say it plainly and give no figure. |
| What's next to it and under it | Pipes, cables and drains near the stump that are found before anything is ground or dug, a path, a wall or a patio hard against it, from the trade facts price row (hidden services; services or hard surfaces nearby) and the inspection stage. Say the business looks before it prices, from [CV: quote_method] only. |
| Getting the grinder to it | A stump in a back garden reached only through the house or down a narrow side path, a machine that fits through the gate against one that does not, winching or digging out by hand where no machine can reach, from the trade facts price row (restricted machine access) and the methods cell. Say why tight access costs more time. |
| How deep it goes, and what happens to the grindings | What the ground is wanted for afterwards sets how far down the stump is taken: less where grass goes over it, more where something is to be planted or built, from the trade facts price row (deeper specified finish) and the rule row, with no measurement given. Then the grindings and the spoil: left to fill the hole, spread on the beds or taken away, and whether the hole is topped up and turfed. Whether the business takes the spoil away only from the confirmed practices and [CV: waste_carrier_registered]. Code adds the price line from [CV: price_list] when there is one. |

### Tree pruning and crown reduction

Under Tree service (type A). Block 5 and block 4 for the pruning page: a reduction is described by the size the tree ends up, never a percentage.

H2: Signs You Need [SERVICE]

| Card | Mechanism | Brief |
|---|---|---|
| Branches on the roof, dead wood you can see from the lawn | growth the tree has put on past where the garden can carry it | The things a homeowner notices first, from the trade facts signs row: branches rubbing the building or the gutters, deadwood showing in the crown, a limb hanging damaged after wind, the garden in shade by the afternoon. The one cause this card makes: growth the tree has put on past where the garden can carry it. Then what it leads to if left, from the skipped row: the dead branch falls in its own time, the contact keeps wearing the roof. Never a scare, never felling as the answer. |
| Topped once and never the same since | a cut the tree could not close | A tree cut back hard to stubs years ago and now a dense head of thin shoots, cuts made flush to the trunk that never healed over, from the trade facts done badly row (indiscriminate topping; decay from poor cuts). The one cause this card makes: a cut the tree could not close. Say what the job does differently, from the stages and the methods cell: each cut back to a suitable side branch so the tree keeps its shape and closes the wound, the crown reduced to a size and never topped; never a dig at whoever did it. |
| Too big for where it stands | a tree growing to its full size in a space planned for a young one | The customer's situation: the tree has outgrown the corner it was planted in, it shades the lawn and the patio, the crown reaches the house, a view or a street lamp is lost behind it. The one cause this card makes: a tree growing to its full size in a space planned for a young one. Say what each kind of work gives them, from the methods cell: a reduction brings the crown back and keeps its outline, a lift takes the lower branches for clearance over a path or a lawn, a thin lets light through without changing the size; and that which suits depends on the species, since not every tree takes a hard cut into old wood. Never a percentage, never a promise it will not grow back. |
| The right time of year for this tree | a window set by the species, not the diary | The customer wants it done before summer, or asks when it should be cut. The one cause this card makes: a window set by the species, not the diary (the trade facts timing cell: many deciduous trees suit pruning while dormant, cherry and plum are pruned in the growing season instead, and other groups have their own windows; a nest being built or in use leaves that part of the tree until it is empty). Say that the tree is looked at and the timing agreed to it, written as what usually applies; no dates, nothing about busy seasons, no blanket ban on any month. |

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How big the crown is and how much comes off | The size factor from the trade facts price row (crown size; specified extent): the size of the crown and how far it is to come back, whether it is a few low branches lifted for clearance, deadwood taken out, or the whole crown reduced. Say it plainly and give no figure. A reduction is described by how much smaller the tree ends up, never as a percentage. |
| What's around the tree | Branches over the roof, the conservatory, the neighbour's garden or the road, a lawn and borders under the crown that have to be protected, from the trade facts price row and the drop zone stage: what can be dropped and what has to be lowered. Say the business looks before it prices, from [CV: quote_method] only. |
| Climbing, a platform and the paperwork | A tree climbed against one worked from a platform, a crown over the road that needs managing, and a protected tree or a conservation area that needs the council's consent before a cut is made, from the trade facts price row (aerial access; protected tree paperwork). Say why each adds time before and during the job, written as what usually applies; never legal advice, never the fine. |
| What happens to the branches | The brash chipped and left for the borders, the bigger wood logged and left for the customer, or all of it taken away, from the trade facts price row (arisings removal). Each moves the price. Whether the business takes it away only from the confirmed practices and [CV: waste_carrier_registered]; logs left only from the client values. Code adds the price line from [CV: price_list] when there is one. |

### Tree cabling and bracing

Under Tree service (type A). Block 5 and block 4 for the bracing page: a support is support, never a cure, and never a promise the tree is safe.

H2: Signs You Need [SERVICE]

| Card | Mechanism | Brief |
|---|---|---|
| A fork that has opened, a limb that moves more than it did | a join in the tree that no longer holds its own weight | The things a homeowner notices first, from the trade facts signs row: the trunk forks tightly and a crack shows in the join, the fork has opened, a big limb swings more in wind than it used to, a cable someone fitted years ago is frayed or cutting in. The one cause this card makes: a join in the tree that no longer holds its own weight. Then what it leads to if left, from the skipped row: the weak join fails in wind, the old support fails on its own. Never a scare, never that the tree is safe or unsafe from a description. |
| Fitted once and never looked at again | a support left without the checks that go with it | A cable or a brace put in years ago and left: the anchor grown over, the cable slack or cutting into the bark, nobody sure it still does anything, from the trade facts done badly row (poorly chosen anchors; support treated as a cure). The one cause this card makes: a support left without the checks that go with it. Say what the job does differently, from the stages: the system specified for the defect, the installation recorded and an inspection arranged; never a dig at whoever fitted it. |
| Support, or something more | a weakness that may be outrunning the support | The customer wants to keep the tree and asks whether holding it together is enough. The one cause this card makes: a weakness that may be outrunning the support (the trade facts: a support limits movement, it does not mend decayed wood, and deterioration can outpace it). Say honestly, as what usually applies, when a brace is the right answer and when a reduction to take weight off the limb, or removal, is, and that the tree is assessed for it first; never that the tree is doomed, never a promise the support will hold. |
| A tree worth keeping | one weak point in a tree that is otherwise sound | The customer's situation rather than a fault: a tree they love, one that screens the road, one that is protected, with one weak join in it. The one cause this card makes: one weak point in a tree that is otherwise sound. Say what the work gives them, from the stages: the weak part held so the tree can be kept, the limb's weight managed, the paperwork for a protected tree checked first (written as what usually applies, never legal advice). Never a promise about how long it lasts. |

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much of the tree needs holding | The size factor from the trade facts price row (number and type of supports): how many weak points there are, how many supports go in and of what kind, how big the limbs being held are. Say it plainly and give no figure. |
| Working out whether the tree should be kept | The look at the tree before anything is fitted, from the trade facts stages (assess whether retention is appropriate) and price row (assessment complexity): whether the weak fork or the split is one a support can hold, or whether the honest answer is a reduction to take weight off it, or removal. Say the business looks before it prices, from [CV: quote_method] only; never that a support makes a tree safe. |
| Getting up into the crown | How high the weak point is and how hard it is to reach, a tree climbed against one worked from a platform, what stands under it that has to be protected, from the trade facts price row (difficult canopy access). Say why that takes more people and more time. |
| The hardware, the record and the checks after | A fixed cable against a rope or belt system that lets the limb move a little, from the trade facts materials cell (static or dynamic cable, rope or belt bracing), chosen for the defect; then the written record of what was fitted and the inspection arranged after, since a support is looked at again rather than fitted and forgotten (the stages: record installation; inspect periodically). A named product only from [CV: materials_methods]; no inspection interval, the facts give none. Code adds the price line from [CV: price_list] when there is one. |

### Tree planting

Under Tree service (type A), desire led in the library. Block 5 and block 4 as situation cards (the tree chosen, the hole and the ground, the stake and the aftercare, the season), never a fault invented for it.

H2: Is [SERVICE] Right for You?

| Card | Mechanism | Brief |
|---|---|---|
| A tree where there is none, or one to replace a tree that died | the tree chosen for the space it will fill when grown | A situation card, not a fault: a bare corner, a tree that came down last year, screening wanted from the road or a neighbour's window, shade wanted over the patio in time. What decides it: the tree chosen for the space it will fill when grown (the trade facts stages: select tree and position; check services and soil). What the work gives them: a tree in the right place, one that will not reach the house or the drains, planted so it settles in rather than sits. Never a promise it will take, never a growth rate, never a lifestyle pitch. |
| The hole and the ground it's going into | the roots taking hold in the ground they are given | The customer's situation: heavy clay, a spot that holds water after rain, a place by a wall or the drive, a bed full of roots from the old tree. What decides it: the roots taking hold in the ground they are given (the stages: check the soil, prepare the planting area, set the tree at the right level, backfill, firm). What the work gives them: a tree planted at the right level in ground opened up for it, rather than pushed into a hole. Never a promise that the ground will drain better. |
| The stake, the tie and the first summers | the support and the water the tree gets while its roots are still small | The customer's situation: a young tree that rocks in the wind, one that leans, leaves wilting in July despite watering, a tie that has cut into the trunk of a tree planted a few years ago (the trade facts signs row and done badly row). What decides it: the support and the water the tree gets while its roots are still small (staked only where it needs it, the stake checked and taken off in time, watered through its first seasons). What the work gives them: a tree that stands on its own roots rather than on its stake, and a plain list of what they do for it in the first summers. No watering schedule; nothing about a hosepipe ban allowance, since the supplier's notice decides it. |
| The season it goes in | the window the tree's roots give | The customer's situation: wanting the garden finished before summer, or a tree already bought and nowhere ready for it. What decides it: the window the tree's roots give (the trade facts timing cell: October to April is generally best, bare root stock goes in while dormant, a container grown tree can go in outside that but needs more watering). What the work gives them: a tree planted in its window so it settles before it has to carry leaves. No dates beyond the months the facts give, nothing about busy seasons, no promise about the weather. |

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| The tree you choose and its size | The size factor from the trade facts price row (tree stock size and form): the size of the tree bought, from a small bare root whip to a tall container grown or root balled specimen, how many go in, and how much handling a big one needs to reach the hole. Say it plainly and give no figure. Bare root, root balled and container grown only as the materials cell gives them. |
| The hole and the ground | What the ground is like where the tree is going, from the trade facts price row (poor soil; the ground prepared) and the stages: pipes and cables checked for first, compacted or poor soil opened up, the planting area prepared, topsoil brought in where the ground needs it. Say the business looks before it prices, from [CV: quote_method] only. |
| The stake, the guard and the mulch | What the tree needs to stand and to start: a stake only where the tree needs one, a guard where it needs one, mulch over the roots, from the trade facts price row (staking and guards) and the materials cell (specified stakes, guards and mulch). Say why a bigger or more exposed tree needs more of this. A named product only from [CV: materials_methods]. |
| Watering and the visits after | Getting the tree through its first seasons: who waters it, how often it is looked at, and whether the business comes back to check the stake, the ties and the mulch, from the trade facts price row (establishment visits) and the stages (arrange establishment care). Say that a tree planted and left is the one that fails, and what the aftercare covers only from the confirmed practices. The season is for the FAQ, not here. Code adds the price line from [CV: price_list] when there is one. |

### Tree transplanting

Under Tree service (type A), desire led in the library. Block 5 and block 4 as situation cards (the move, the root ball, a tree moved before, the dormant window), never a fault invented for it.

H2: Is [SERVICE] Right for You?

| Card | Mechanism | Brief |
|---|---|---|
| A tree in the way of building work | whether the tree is one that will survive the move | A situation card, not a fault: the extension, the drive or the garden room is going where the tree stands, and they would rather move it than lose it. What decides it: whether the tree is one that will survive the move (its kind, its size, its health, how long it has stood there, from the assess suitability stage); a protected tree is checked first, written as what usually applies and never as legal advice. What the work gives them: the tree kept, in a position that suits the new plan. Never a promise it will take. |
| Planted in the wrong place | the size of root ball the tree needs to come up with | The customer's situation: a tree too close to the house, one shading the vegetable beds, one across the path, a gift tree in a corner it has outgrown. What decides it: the size of root ball the tree needs to come up with (the trade facts signs row: a root ball too large to lift by hand; the done badly row: an undersized or dried root ball). What the work gives them: the tree where it should have gone, with enough root to start again. Never a measurement. |
| Moved before and struggling | the root ball kept whole and moist from lifting to replanting | The customer's situation: a tree moved last year that wilts in summer, leans, rocks in its hole, or has not put on growth since (the trade facts signs and done badly rows). What decides it: the root ball kept whole and moist from lifting to replanting (the stages: protect and lift the rootball, transport without drying, replant and secure). What the work gives them: honest advice on whether the tree can be helped where it is (support, water, mulch) or whether it is past that, with no promise either way. |
| The window for the move | the dormant window the species gives | The customer's situation: they want it done when the builders start, or before summer. What decides it: the dormant window the species gives (the trade facts timing cell: late October to mid March for a deciduous tree, October or late March for an evergreen), and that preparing the roots a season ahead can make the move possible for an established tree (the facts: putting off the preparation can make moving it less feasible). What the work gives them: a move planned to the tree's calendar rather than the builder's, so it has the best chance. No dates beyond the facts, no promise about the weather. |

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How big the tree and its root ball are | The size factor from the trade facts price row (tree size and rootball): the height and the spread of the tree and the size of the root ball that has to come out with it, from a small tree lifted by hand to one that needs a machine. Say it plainly and give no figure. |
| Getting the roots ready, and the ground it's going to | Whether the tree is prepared a season ahead so the root ball holds together, and what the new position needs: the pit dug ready, the soil opened up, topsoil brought in, from the trade facts price row (advance root preparation; a difficult new position) and the stages. Say the business looks at both places before it prices, from [CV: quote_method] only. |
| Lifting it and moving it | A tree carried across the lawn against one lifted by machine and driven across town, the kit that needs and how it gets to both ends, from the trade facts price row (lifting equipment and transport; access). Say why a big tree or a long move takes more people and more time. |
| Settling it in afterwards | The support, the mulch and the watering through the first seasons in its new place, and whether the business comes back to check on it, from the trade facts price row (aftercare) and the stages (support, mulch and water; monitor establishment); what the aftercare covers only from the confirmed practices. The season for the move is for the FAQ, not here. Code adds the price line from [CV: price_list] when there is one. |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| Why does water sit on my patio or lawn after rain? | Garden drainage; Patios; Garden levelling; Paving Contractor |
| Is it better to lay turf or sow grass seed? | Turf laying; Lawn seeding |
| Will my patio or driveway need planning permission? | Patios; Paving Contractor; Block paving; Tarmac surfacing; Driveway repairs; Decking installation; Composite decking |
| A garden with nowhere to sit out | Patios; Decking installation; Composite decking; Block paving |
| A lawn full of moss and bare patches | Lawn treatments; Lawn care; Lawn seeding |
| Hedges that have got away | Hedge trimming; Garden maintenance; Gardener |
| Weeds that come straight back | Weed control; Garden maintenance; Gardener |
| Borders that dry out or get swamped | Mulching; Garden maintenance; Gardener |
| When should the first cut of the year happen? | Lawn mowing; Lawn care; Garden maintenance; Gardener |
| Boundaries as old as the houses | Fencing; Garden walls and stonework |
| Trees that have outgrown the garden | Tree pruning and crown reduction; Tree removal and felling |
| Front gardens turned over to parking | Block paving; Paving Contractor; Tarmac surfacing; Garden drainage |
| Lawns that struggle on this ground | Lawn care; Lawn mowing; Lawn treatments; Garden maintenance; Gardener |
| Hedges as old as the houses | Hedge trimming; Garden maintenance; Gardener |
| Getting the mower round the back | Lawn mowing; Lawn care; Garden maintenance; Gardener |
| Banks and sloping lawns | Lawn mowing; Lawn care; Garden maintenance; Gardener |
| Big hedges and old trees | Hedge trimming; Garden maintenance; Gardener |
| Seed or turf, and the preparation each needs | Turf laying |
| The timber, the brash and the stump | Tree stump removal |

## Idea homes

- **the season the job suits and the reason in the soil or the plant** (service): home is the 'When is the best time of year for [SERVICE_LOWER], and how long does it take?' FAQ. Elsewhere: Timing cards name the customer's situation and point to the window in one clause, with no soil or plant reason. The 'How long does it take' FAQ gives duration only..
- **staking, ties and watering a young tree through its first seasons** (service): home is the 'The stake, the tie and the first summers' card. Elsewhere: The stake/guard/mulch and watering cost cards say only that these move the price, not why the tree needs them..
- **the size of root ball a tree must come up with** (service): home is the 'Planted in the wrong place' card. Elsewhere: The root ball cost card gives size as a price factor only. The 'Moved before and struggling' card covers keeping the ball whole and moist, not its size..
- **shoots coming back from a stump and its roots** (service): home is the 'Shoots that keep coming back' card. Elsewhere: The first-signs and shallow-grind cards name the shoots as a sign only, with no explanation of suckering roots..
- **grinding depth set by what the ground is wanted for next** (service): home is the 'Ground you want to use for something else' card. Elsewhere: The depth cost card says only that depth moves the price. The shallow-grind card gives wrong depth as its cause and does not explain choosing a depth..
- **whether a support is enough or a reduction or removal is the honest answer** (service): home is the 'Support, or something more' card. Elsewhere: The assessment cost card says only that the tree is looked at before pricing. The 'Fitted once' card stays on missed checks..
- **growth surging in spring as the soil warms** (service): home is the 'What the season is about to throw at it' card. Elsewhere: Problem cards name their signs and their own cause without the soil-warming explanation. The start-of-year FAQ says only when the first visit goes in..
- **how often the regular round visits** (category): home is the 'How do regular visits work?' FAQ. Elsewhere: The frequency cost card says only that a regular round makes each visit shorter. The start step says only that a round follows the first visit..
