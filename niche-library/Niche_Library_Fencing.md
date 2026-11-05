# Niche Library Entry: Fencing

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/fencing.json`; this file is the same content for people, kept in the same commit. The model never sees the slot names, only the resolved words.

Business type is **A (project trade)** for every page. Fencing has one GBP category (Fence Contractor) that carries every page, so the calibration pack's section 2 splits it by service group and makes every group type A; there is no type B and `category_types` is empty. The split inside type A (problem led, desire led, specification led, schedule led) is carried in the card briefs and in the library's `desire_led` column, not in a type. Sources, in order: `calibration-packs/Fencing_Calibration_Pack_v1.md`, `trade-facts/fencing.md`, `niche-library/fencing.csv`, `fillout/services/fencing.json`.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Fencing / fencing |
| trade_person / trade_person_plural | fencer / fencers |
| homepage_keyword | Fencing (4 Nov 2026, Brandon: the homepage keyword is a way of saying the primary GBP category, picked on search volume; the H1 research pattern and the thin runner read it through niche-library/keyword.js) |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | no (no page in fencing.csv is flagged emergency; a storm repair is urgent to the customer but the pack writes it as a diagnosis, not a call out) |
| big_ticket | yes (a full run of new fencing, automatic gates, acoustic fencing) |
| schema_subtype | HomeAndConstructionBusiness (schema.org has no fencing subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| fence, fence panels, posts, gate, garden, back garden, front garden, boundary, next door, neighbour, the run, gravel board, trellis, driveway, paddock, field | means of enclosure, enclosure, perimeter, infill, pales, arris rail, straining post, specification, property, site, plot, curtilage, highway, solution, kerb appeal (words_avoid_exceptions: perimeter and site are allowed on the security fencing and temporary fencing pages, where the customer is closing a yard or a building site and calls it that) | storm proof, stormproof, wind proof, windproof, built to last a lifetime, last a lifetime, lifetime guarantee, maintenance free, zero maintenance, rot proof, rotproof, keep intruders out, deter burglars, deter criminals, crime hotspot, peace of mind, secure your property (the pack's rule 6, never promise what the weather controls, and its section 7, security sold on fear) |

The CORE list already bans bespoke and tailored, which is why the page is Made to measure fencing and the trade facts row that serves it is still named Bespoke fencing (see the last section).

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about your fence and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about your fence and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency pages) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About Your Boundary**
   Brief: how to get in touch and what is useful to send first (roughly how long the run is, what is there now, whether the boundary is shared with next door, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Measure Up and Price the Job** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the visit and what gets looked at on the boundary (the line, the levels, what comes out, where pipes and cables might run under it, how the posts and panels get in). Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
   Without the practice (`step_2_no_visit`): **We Price Your Job**
   Brief: a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **We Put It Up on a Date That Suits You**
   Brief: the date is agreed in advance, to suit the customer. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

No type B steps: there is no maintenance round in this niche.

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer warranty → insurance (a maker's guarantee on posts or panels covers that product, not the fence as put up: the trade facts fact row on guarantees) |
| fears (in order, one per Why choose us point; the pack's section 1, the storm customer and the project customer) | 1. posts that let the fence lean again a winter or two after it went up; 2. being told the whole run has to go when two new posts would have done; 3. a falling out with next door over whose fence it is and which way it faces; 4. a price that grows once the old fence is out and the digging has started |
| fears_by_type | none: no type B in this niche |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D: none of these is a licence or a guarantee of the installed fence; the strip shows the logo and the copy claims nothing for it.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies and registers:** AFI (Association of Fencing Industries), AFI Certified Contractor Scheme, TrustMark, Trading Standards Buy With Confidence.
- **Tier 2, schemes and cards:** Gate Safe Aware and the DHF Automated Gate Group (automatic gates only), CHAS, Alcumus SafeContractor, Lantra Awards fencing qualifications, FISS/CSCS fencing card.
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards. Ray's call per client.
- FSC and PEFC chain of custody are the timber supplier's claims, not the installer's (Table D), so they stay off the strip unless the client holds the certificate itself.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if something is damaged while the fence is going up, on their side of the boundary or next door's. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your fencing? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. A maker's guarantee on posts or panels covers that product and not the whole fence as put up (the trade facts fact row on guarantees), so say which is which: the business's own guarantee from [CV: guarantee_years] and [CV: guarantee_scope], the maker's from [CV: manufacturer_warranty]. | no | Trust |
| faq_3_none | What happens if something isn't right after the job? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll come and look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. Nothing about storm season or a rush after high winds. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does it take to put up a new fence? | The trade facts give no standard duration for any fencing job, so give what decides it and no number unless confirmed: the length of the run, what has to come out first (an old fence, its posts and their concrete), the ground the holes go into, how the posts and panels get to the garden, and the weather for setting posts. Weather can move the days. | no | Timing |
| faq_B | Why has my fence started to lean? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words: a post gone soft where it comes out of the soil, concrete that has worked loose in ground that shrinks in a dry summer and swells when wet, a solid run taking the whole wind on an open side. Then what the local ground or exposure adds, then the fix, which starts at the post and not the panel. | **yes** | Process |
| faq_C (fallback) | Can a storm damaged fence be repaired, or does it all need replacing? | From the trade facts fence repairs rows: a repair can keep a run whose other posts are still firm, and a new panel on a failed post leaves the fault where it was. What decides it is whether the posts either side of the damage are still firm at the ground: a few new posts with the sound panels rehung where they are, or the run replaced where the posts along it have all gone soft. Never which neighbour pays (the fact row: a blown down fence is not automatically next door's bill), never a named storm. | no | Process |
| faq_D (fallback) | Whose fence is it, mine or my neighbour's? | From the trade facts fact rows only: there is no rule that the fence on the left or the right is yours; the deeds decide; a T mark on a plan can show who looks after a boundary but does not settle it on its own; the title plan shows a general line, not where each post stands. The finished face turned outward is a custom, not a law. Where it is unclear, a word with next door before anything comes down. Never legal advice, never a guess at which side. | no | Process |
| faq_planning (big ticket, only if [CV: handles_planning] confirmed) | Do I need planning permission for a new fence? | Point at the trade facts rule rows (Table C) and write what usually applies, with "usually" or "in most cases": most back garden fences need none up to the usual height; the limit is lower where the boundary runs beside a road with traffic on it, and its pavement counts, so a front fence is usually the lower one; the height is taken from the ground and trellis on top counts towards it; a replacement can usually keep an existing greater height; a listed home, and an estate where the right has been taken away, need a check first; a conservation area does not change the heights but taking an old boundary down there can need permission. The two heights themselves only as the rows give them and only on a page whose prompt carries the rows; otherwise no height at all. What the customer does about it only as the row gives it. Never an Act's or an order's name. | no | Process |

Sources for faq_A to faq_D: the pack's section 1 (the storm customer's one question: repair or new run; the project customer's fear of a row with the neighbour) and the trade facts Tables A, B and E. Replace with real customer questions when Brandon or the client supplies them.

### Type B homepage overrides (faq_slots_by_type.B)

None. The pack's section 2 makes every group type A, so `faq_slots_by_type` is empty.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Posts: timber posts / concrete posts / metal posts / postmix / posts set in concrete
- Fence types: closeboard / lap panels / hit and miss / picket / post and rail / trellis / composite / metal railings / chain link / stock netting
- Boards and tops: timber gravel boards / concrete gravel boards / capping / trellis tops
- Treatment: pressure treated timber / stain or preserver applied after fitting
- Gates: timber gates / metal gates / automatic gate operators / safety edges and photocells
- Other: old fence taken away / pipes and cables located before digging / boundary line agreed with the customer before digging

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

fencing, fence installation, closeboard, close board, featherboard, feather edge, panel fencing, lap panels, larch lap, waney lap, hit and miss, picket fencing, post and rail, trellis, gravel boards, concrete posts, timber posts, metal posts, composite fencing, metal fencing, metal railings, railings, chain link, security fencing, palisade, mesh fencing, acoustic fencing, stock fencing, stock netting, agricultural fencing, equestrian fencing, paddock fencing, electric fencing, temporary fencing, dog proof fencing, garden gates, side gates, driveway gates, automatic gates, electric gates, gate automation, bin store, log store, fence repairs, storm damage repairs, post replacement, fence staining, fence treatment, fence painting, made to measure fencing

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| pool fence | (never named) |
| simtek | (never named) |
| automatic gate | automatic gates |
| chain link | chain link fencing |
| aluminium fence | metal fencing and railings |
| ornamental iron | metal railings |
| iron fence | metal railings |
| custom fabrication | metal fencing and railings |
| custom fence | made to measure fencing |
| fence design | made to measure fencing |
| deer fencing | stock fencing |
| stock fencing | stock fencing |
| agricultural | agricultural fencing |
| equestrian | equestrian fencing |
| dog fence | dog proof fencing |
| security fencing | security fencing |
| acoustic | acoustic fencing |
| privacy fence | closeboard fencing |
| closeboard | closeboard fencing |
| feather edge | closeboard fencing |
| trex | composite fencing |
| vinyl fence | composite fencing |
| composite fencing | composite fencing |
| wood fence | timber fencing |
| picket | picket fencing |
| post and rail | post and rail fencing |
| hit and miss | hit and miss fencing |
| larch lap | panel fencing |
| waney lap | panel fencing |
| trellis | trellis |
| electric fencing | electric fencing |
| temporary fencing | temporary fencing |
| fence painting | fence staining and treatment |
| fence staining | fence staining and treatment |
| bin store | bin stores |
| log store | log stores |
| concrete posts | concrete posts and gravel boards |
| general repairs | fence repairs |
| fence repair | fence repairs |
| fence installation | fencing |
| fencing installation | fencing |
| fence building | fencing |
| gates | garden gates |
| gate | garden gates |

## General service words (FAQ page matching)

Core services per GBP category (the homepage card picks; the fence contractor list comes from the page rows of fencing.csv, the other tabs from the same GBP categories' lists in the landscaper entry, since a fencing client's gardener or decking pages come from those libraries):
- Fence Contractor: fence repairs, timber fencing, closeboard fencing, garden gates, concrete posts and gravel boards, composite fencing, metal fencing and railings
- Deck Builder: timber decking, composite decking, deck installation, deck repair
- Gardener: garden maintenance, hedge trimming, weed control, mulching
- Landscape Gardener: garden makeovers, patios, planting, new gardens, paving and walling, retaining walls, garden steps
- Landscape Designer: garden design, design and build, patio design, planting
- Lawn Care Service: lawn mowing, seeding lawns, new lawns, turf laying, lawn care
- Tree Service: tree pruning, tree removal, stump grinding, tree planting
- Paving Contractor: block paving, new driveways, driveway replacement, groundwork and levelling

Service words for the whole job rather than one service: fencing, new fence, garden fencing, fence installation, fence repairs. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: storm damage. When an FAQ question names the job as well as the problem ("Can you replace the posts on a storm damaged fence?"), it goes to the job's page (fence repairs), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches). The briefs below name the practice key a line depends on: `waste_removal` (the old fence taken away), `photos_of_faults` and `extra_work_agreed_first` (the storm repair card), `nesting_bird_check` (a hedge along the line), `site_visit_before_quote` (step 2), `price_agreed_before_work` (the no visit step 2). A ticked practice counts as confirmed for the validator and the claims reviewer alike.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures (the trade facts give no duration for any fencing job). Ask every fencing client for:
- a "from" price for 3 typical jobs (e.g. a run of closeboard, a pair of gates, a storm repair of two posts and a panel);
- a typical duration for the same 3 jobs;
- whether quotes are written, and whether the price is fixed once agreed;
- whether they take the old fence and its concrete away (waste_removal) and whether they are a registered waste carrier (waste_carrier_registered);
- which posts they set (timber, concrete, metal) and which treatment the timber comes with, for the materials tick list;
- whether they do farm, paddock, yard or site work at all, so the rural and function led pages are only made where the work is real;
- for automatic gates: which operators they fit and who signs off the finished gate.

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **The Post Comes First on Every Job**
2. Cover → **Insured for Your Garden and Next Door's**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": fence contractor → fencing, deck builder → decking, gardener → gardening, landscape gardener → landscape gardening, landscape designer → garden design, lawn care service → lawn care, tree service → tree surgery, paving contractor → paving. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs (`category_page_blocks`) use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Written 4 Nov 2026 against the pack and the trade facts. Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above), the FAQ slots and, with `seasonal_trade` on, the one card and one FAQ that swap in. Placeholders: `[CAT]` the page keyword without the town (Fence Contractor), `[CAT_LOWER]`, `[WORK]` the work noun (Fencing), `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises.

- `seasonal_trade`: yes. The pack's seasonal note: repair demand peaks after the autumn and winter gales, and staining needs a dry spell and dry timber. The swap gives its reason in the timber or the weather, never in the season being busy.
- `category_types`: empty. One GBP category carries every page and the pack makes every group type A; the other Fillout tabs a fencing client can tick (Deck Builder, Gardener, Landscape Gardener, Landscape Designer, Lawn Care Service, Tree Service, Paving Contractor) have no row in the pack's section 2 and take the default A.
- A niche with no section here has its category pages refused: "no category block briefs for fencing".

### Type A (project trade: Fence Contractor, every page)

The pack's section 2 split inside type A, carried in the briefs: problem led (symptom, cause in the wind, the ground or the timber, consequence) for fence repairs with storm damage as the anchor, concrete posts and gravel boards, dog proof, security and acoustic fencing; desire led (the customer's situation, never an invented symptom) for the new domestic fence types, made to measure fencing, garden gates, automatic gates and bin and log stores; specification led (what the animal or the site does to a fence) for agricultural and stock, equestrian, post and rail, electric, chain link and temporary fencing; schedule led (what slips and when) for fence staining and treatment. Block 4 below carries one card per framing: card 1 the storm repair, card 2 the situation, card 3 the function and specification pages together, card 4 the upkeep page.

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A fence down or leaning after the wind | a post gone soft where it comes out of the ground | Problem led, the storm anchor: a panel out, a post snapped at the ground, a run leaning after a gale (the trade facts signs row for fence repairs). Write the diagnosis, never the drama. The one cause this card makes: a post gone soft where it comes out of the ground, so the wind pushed it over; a panel lifted out of its slot on an otherwise firm run is a different, smaller job, and the card says so. What it says about the rest of the run: posts put in together, in the same ground, tend to go soft at the same time, so the posts on each side of the damage get looked at before one is replaced (the done badly row: a new panel on a failed post leaves the fault in place). What the fix usually involves, from the fence repairs stages: the failed part found, the section made safe, the posts replaced or refixed and the sound panels rehung, or the run replaced where every post has gone. What the business does on site only from confirmed practices (photos_of_faults, extra_work_agreed_first). Never a named storm, never which neighbour pays (the fact row: a blown down fence is not automatically next door's bill), never storm proof. |
| Overlooked, open to the road, or both | a boundary set for how the house was once used | A situation card, desire led, never a fault invented for it: next door's upstairs windows look onto where the household sits, the front garden has nothing between the lawn and the pavement, a low chain link run from when the estate was built, a side gate that never closed properly. The one cause this card makes: a boundary set for how the house was once used, not for how this household uses it. What decides the answer: what the fence has to do (cover where they sit, mark the front, keep a dog or a toddler in), how much wind the run takes (a solid fence takes the whole of it; boards fixed alternately on the two faces let the wind pass between them, from the hit and miss row; prefabricated panels do not suit the most exposed runs, from the fact row on exposed locations, no figure), and the height that usually applies (lower where the boundary runs beside a road with traffic on it, its pavement included; higher elsewhere), from the trade facts rule rows with usually, never the order's name and no figure the rows do not give. What the work gives them, in plain words: closeboard built board by board on site, panels between posts, hit and miss, picket, metal railings, a gate, whichever does that job, named only where the services list has the page. Never a lifestyle pitch, never security sold on fear. |
| When the fence has one job to do | pressure the fence was never built to take | Function and specification led in one card: the fence is bought for what it must hold in or keep out. The one cause this card makes: pressure the fence was never built to take, from the animal, the people or the noise on the other side of it. Say what each does to a fence and what answers it, from the trade facts rows for that service, and name only the services the client has: a dog that digs under or pushes through finds the gap under the gate, the hole beside a post, the loose bottom edge (the dog proof rows: close mesh or a solid face, the bottom edge secured, the gate detail made for that dog; no universal height or gap, because the facts verify none); a horse leans on a rail, rubs along it and chews it, so post and rail is fixed so that a pushing horse presses the rails against the posts, and anything projecting is a hazard (the equestrian rows); sheep and cattle put their weight on netting, so stock fencing stands or falls on its end posts and the tension in the wires (the agricultural rows); a yard or a building site that must stay shut gets a tested system with its own matching gates, because an untested part put into a certified run undoes it (the security rows), sold on what the fence does and never on fear, crime figures or invented break ins; road noise is cut by a barrier with no gaps, its joints sealed and the boards close fitting (the acoustic rows), with no figure for how much quieter the garden will be (the fact row: a laboratory figure is not a garden figure). The customer's words throughout: the dog, the horses, the sheep, the yard, the road; never perimeter or specification. |
| Timber going grey, green or soft | timber left bare to the weather | Schedule led, the upkeep group (fence staining and treatment): what slips and when. What the customer sees, from the trade facts signs row: a coating peeling, bare patches, timber that looks wet long after the rain has gone, boards going green on the shaded face. Say first what is normal: new timber silvering in its first year is the sun, not a fault. The one cause this card makes: timber left bare to the weather once the coating has worn through, so the rain gets into the surface and the cut ends (the skipped row). When treatment is due, in the timber and the weather, never in the diary: when the timber is dry through and the maker's conditions for the product hold (the staining stages: the timber dried as the product requires, the coats applied in the maker's weather), never a fixed interval, because the facts verify none. A coat put on damp timber fails early (the done badly row). A brush on treatment never replaces the pressure treatment a post needs where it goes into the ground (the done badly and fact rows), so a soft post at the ground is card 1's job, not this card's. A product only from [CV: materials_methods]; a return visit for recoating only where the services list has it. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How long and how high the run is | The length of the run and its height move the price more than anything else: more posts, more holes, more panels or boards, more days (the trade facts price rows: a longer run, more bays, more boards). Say it plainly and give no figure. |
| What comes out first | An old fence, its posts and the concrete they were set in, rubble under the line, a hedge in the way: what has to come out and go away before a post goes in (the trade facts price rows: removal and disposal of old fencing, buried post removal, old foundations). Whether the waste goes with the business only from confirmed practices (waste_removal); waste carrier registration only if [CV: waste_carrier_registered] is yes. Say the business looks before it prices, from [CV: quote_method] only. |
| Slopes, corners and getting in | Every change of level or direction is a post set differently and a bay cut to fit; a run reached through the house or along a shared side passage means each post, every panel and the bags of concrete carried by hand; pipes and cables under the line slow the digging (the trade facts price rows: changes of level or direction, difficult access or buried services). Say why each adds time. No figure. |
| Posts, panels and gates you choose | Concrete posts against timber, closeboard built on site against panels, a gate in the run, a higher treatment on the timber, railings made to the opening (the trade facts price rows: post type, treatment, gate openings, fabrication and finish). Why one costs more than another, in plain words; a named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (the length and height of the run, what comes out first, the access) and how the quote is given, from [CV: quote_method] only. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. A maker's guarantee on posts or panels covers that product and not the fence as put up (the trade facts fact row on guarantees): keep the two apart. Described, never promised. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we come and look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What [WORK_LOWER] work do you take on? | The work itself, named from the card list as kinds of fence, gates and repairs (closeboard and panel fencing, garden gates, storm damage repairs), and the size of job taken on, from the services list and [CV: typical_jobs] only; farm, paddock and yard work only where the services list has the page. Link one service page. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. | Fit |
| process | always | How do I get a quote for a new fence? | From [CV: quote_method] and the confirmed practices only: what the customer sends (roughly how long the run is, photos, which boundary), what the business looks at (the line, the levels, what comes out, how the materials get in), what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Can you put up a fence at any time of year? | From the trade facts timing cells: fencing goes in all year where the ground allows it. What the weather changes, with the reason in the ground, the concrete or the timber: post concrete sets more slowly in the cold (the concrete posts row: the initial set depends on temperature); staining and treatment wait for timber that is dry through and the maker's conditions; a hedge along the line is checked for nests before it is cut back (a stage of the job in the rows, written as this business's own practice only when nesting_bird_check is confirmed); a countryside hedge has its own cutting season, said as usually and without the rule's name. Nothing about autumn being busy or booking ahead. No dates, no promise about the weather. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom (a leaning run, posts rotting at the ground, panels blowing out, a gate that drags) and its linked local issue, answered as asked. Say first when it is normal (new timber silvering, a panel that rattles in a gale and is back in its slot by morning) and then what is not. Then the usual cause here in the wind, the ground or the timber, in plain words; what the local exposure or soil adds (an open edge of town, clay that shrinks in a dry summer, low ground where holes fill with water) only from the research; and what the business does about it, starting at the post. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **What the autumn gales leave behind** (mechanism: the wind finding the weakest point in the run): After the autumn and winter gales. Say first what is normal: a panel lifted out of its slot and dropped back in, boards rattling in the wind, timber dark with the wet; then what is not: a post snapped at the ground, a run that leans a little more each windy day, a gate that no longer meets its post (the trade facts signs rows for fence repairs and panel fencing). The one cause this card makes: the wind finding the weakest point in the run, a post already soft at the ground or a solid panel on a run too exposed for it (the fact row on exposed locations, no figure). The reason in the timber and the weather, never in the season being busy: wet ground through the winter softens what was already going. What getting it looked at involves, from the fence repairs stages (the failed part found, the section made safe, posts replaced or refixed, sound panels rehung); what the business does only from confirmed practices. Never a named storm, never which neighbour pays, never storm proof. FAQ: Is winter a bad time to have a fence put up? (Timing): From the trade facts timing cells: fencing goes in through the winter where the ground allows it. What waits and why, in the ground, the concrete or the timber: post concrete sets more slowly in the cold; staining and treatment wait for timber that is dry through and the maker's conditions; a composite system goes up only within its maker's conditions. Nothing about the diary. No dates, no promise about the weather.

## Service page blocks by business type (service_page_blocks)

Written 4 Nov 2026. Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (signs you need it) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above), the FAQ slots (cost, timing, cover, rules, scope) and, with `seasonal_trade` on, the one card and one FAQ that swap in (the FAQ replaces the timing slot). The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type A entry serves closeboard, chain link and automatic gates alike. Placeholders: `[SERVICE]` the page keyword without the town (Closeboard Fencing, Garden Gates), `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for fencing".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED). The category page owns "a post gone soft where it comes out of the ground"; the service cards make other causes.

### Type A (project trade: every page)

Four framings share this one entry, per the pack's section 2: a problem led page (fence repairs, concrete posts and gravel boards, dog proof, security and acoustic fencing) uses block 4 below as written; a specification led page (agricultural and stock, equestrian, post and rail, electric, chain link and temporary fencing) reads the "on a specification led page" line in each brief, what the animal or the site does to the fence; a schedule led page (fence staining and treatment) reads the "on a schedule led page" line, what slips and when; a desire led page (the library's `desire_led` column: timber, composite, closeboard, panel, picket and hit and miss fencing, metal fencing and railings, made to measure fencing, garden gates, automatic gates, bin and log stores) swaps block 4 and the seasonal card for the desire variant at the end of this section.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items (every fencing row in Table A has 6 or more, so this set is rarely used).

| Item | Brief |
|---|---|
| Setting out the line and the levels | The first stage from the trade facts: the line of the boundary agreed with the customer, the levels taken, the bays or the posts marked out. A part of the job, not a promise about the quote. |
| Finding pipes and cables before we dig | The locate services stage every trade facts row for this trade carries: what runs under the line is found before a hole is dug. Said as a stage of the job, never as a claim about other firms. |
| Taking the old fence out | The removal stage from the trade facts, where the row has it: the old panels, posts and their concrete out of the ground. Name only what the row gives; what happens to the waste only from confirmed practices (waste_removal). |
| Digging and setting the posts | The post stage from the trade facts: holes dug, posts set, timber or concrete as the materials cell names them for this service. No depth or figure (the rows give none), and never a standard's number. |
| The rails, boards or panels | The central stage from the trade facts: rails fixed, boards or panels fitted, mesh hung and tensioned, the gate hung, named as the trade names it for this service. |
| Gravel boards, caps and finishing | The finishing stages from the trade facts: gravel boards, capping, latches and stops, the run checked for line and level. What the customer sees when the job is done. |
| Clearing up before we leave | The last stage from the trade facts (clear site): offcuts, spoil from the holes, packaging. Whether the old fence leaves with the business only from confirmed practices (waste_removal); otherwise say it is cleared or left as agreed. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The first thing you notice | a part that has worked loose or given way | The things a homeowner notices first, from the trade facts signs row for this service, in their words: a panel rattling, a board lifting, a rail hanging, a gate that drags, a post that moves when pushed. The one cause this card makes: a part that has worked loose or given way, a fixing, a rail or a post, so the rest of the bay is carrying it. Then what it leads to if left, from the skipped row: specific, never alarming. On a specification led page (agricultural and stock, equestrian, post and rail, electric, chain link and temporary fencing) the card is what the animal or the site does to the fence: netting sagging where sheep push at it, a rail broken by a leaning horse, mesh gone slack as the tension is lost, no pulse on the tester with grass against the strand, a temporary panel pushed off its foot, from that service's signs row. On a schedule led page (fence staining and treatment) the card is what slips and when: a coating peeling, bare patches, timber that looks wet after the rain has gone, with the reason in the timber and the weather from the timing cell, never in the customer's diary. |
| A lean that is getting worse | a post moving in its hole | A post or a whole run that leans a little more with every windy week. The one cause this card makes: a post moving in its hole, because the ground round it has shrunk, washed out or been worked loose, so the panels on each side twist and the lean grows. Not a post rotted through at the ground: the category page owns that cause. Say what the job does underneath so the post stays put, from the trade facts stages and the done badly row for this service (the hole dug and the post set in concrete as the materials cell names it; concrete posts where the client offers them; a gravel board keeping the panel off the soil); no depth or figure the rows do not give; never a dig at another trade. On a specification led page: an end post or a strainer leaning as the wires pull on it, so the whole line loses its tension (the stock and chain link rows). On a schedule led page the card is not about a lean: a finish worn through on the weather side first, from the signs row. |
| Patched before and gone again | the failed part left in place under a new one | A panel replaced last year that is out again, a post propped with a stake, a gate rehung twice. The one cause this card makes: the failed part left in place under a new one, so the new part fails the same way (the trade facts done badly row for fence repairs: a panel replaced without the failed post behind it). Say when a repair is worth it and when it is not, from the fence repairs row: a repair keeps a run whose other posts are firm; where the posts along the run have all gone soft, the next repair is the next weak post. On a concrete posts and gravel boards page the card is the timber post or board replaced like for like more than once, and what a concrete post or board changes (the stages and materials for that service; no lifespan figure, because the facts verify none). On a specification led page: mesh pulled tight again on a strainer that has itself moved. On a schedule led page: a coat put on over a peeling one, or on damp timber, that lifts within the season (the staining done badly row). Never a dig at another trade. |
| Trouble at the bottom of the fence | the lowest part of the fence sitting on the soil | Where the fence meets the ground: a panel's lower edge gone soft, a gap scraped under the gate, the bottom wire of the mesh lifted, a gravel board cracked (the trade facts signs rows). The one cause this card makes: the lowest part of the fence sitting on or in the soil, where it stays wet, or where an animal works at it. What the job does about it, from the stages and the fact row on gravel boards: a gravel board keeping the panel off the ground, the bottom edge of the mesh secured, the gate detail closed up for that dog. Not a post gone soft at the ground: the category page owns that. On a specification led page: the stock sized opening at the bottom of a run, the loose bottom edge a dog goes under, the bottom wire of chain link that has lost its tension. On a schedule led page: the cut ends and the lowest boards that soak up the wet first, from the signs row. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How long and how high the run is | The size factor from the trade facts price row for this service: the length, the height, the number of posts, bays, boards or pales, the number of gates. Say it plainly and give no figure. |
| What has to come out first | What comes out or is worked round before a post goes in, from the trade facts price row: the old fence, posts set in concrete, old foundations, a hedge, growth along the line. Say the business looks before it prices, from [CV: quote_method] only; where the waste goes only from confirmed practices (waste_removal). |
| Slopes, corners and access | Changes of level and direction, corners and straining points, a run reached through the house or down a side path, what is carried by hand, pipes and cables under the line, from the trade facts price row. Say why each adds time. |
| The posts, boards and finish you choose | The post type, the treatment, the board or panel pattern, the gate and its latch and hinges, the coating or the system, from the trade facts price row and [CV: materials_methods], and why one costs more than another. A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us About Your Boundary; We Measure Up and Price the Job, or We Price Your Job without the site visit practice; We Put It Up on a Date That Suits You).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The cost cards hold the list: never repeat it or point to it. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: the pack gives no standard duration for any fencing job, so give what decides it (the length of the run, what comes out first, the ground, the access, the weather for setting posts) and no number. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. A maker's guarantee on a post, a panel or a gate operator covers that product and not the job as put up (the trade facts fact row on guarantees): keep the two apart. Described, never promised. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we come and look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Do I need permission for [SERVICE_LOWER]? | From the trade facts rule rows for this service only, put as what usually applies, with "usually" or "in most cases". For a fence or a gate: the condition that brings a rule in (a boundary beside a road with traffic on it, where the lower height applies and its pavement counts; the higher height everywhere else, taken from the ground with any trellis counted in; a replacement that keeps an existing greater height; a listed home; an estate where the right has been taken away; a conservation area, where taking an old boundary down can need permission). For automatic gates: the new electrical circuit is the part that is notified, and the finished gate is tested for force and fitted with its safety devices before it is handed over. For agricultural, stock and equestrian fencing: the countryside hedge rules on taking a hedge out and on when it is cut. For temporary fencing: consent where the pavement or the road is occupied. The heights only as the rows give them and only where the rows are in the prompt. What the customer does only as the row gives it. Never a standard's number, an Act's or an order's name, or legal advice. Where the rows give no rule, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words: the work itself, named (the line set out, the posts dug and set, the boards or panels fitted, the old fence taken out where that practice is confirmed). What it does not cover only from the services list, with one sibling service page or the category page linked. Never 'on this page' or 'listed above': name the work. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom (a leaning run, posts rotting at the ground, panels blowing out, a gate that drags) and its linked local issue, answered as asked. Say first when it is normal (new timber silvering, a panel that rattles in a gale and is back in its slot by morning) and then what is not. Then the usual cause here in the wind, the ground or the timber, in plain words; what the local exposure or soil adds only from the research; and what this service does about it. One figure at most. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **What a wet winter leaves in the ground** (mechanism: wet winter ground softening round the posts): What shows in spring after the cold wet months, from the trade facts signs row for this service: a post that now rocks, a panel sitting lower in its slot, a gate that has dropped, a bottom board gone soft. Say first what is normal after a winter (timber dark and green on the shaded face, a run that creaks in the wind and settles again) and then what is not. The one cause this card makes: wet winter ground softening round the posts, so what was firm in autumn moves by spring. Not the wind finding a weak post: the category page owns that. Say what gets looked at in spring from confirmed practices only; otherwise what the job puts right, from the stages. On a schedule led page: the coat checked once the timber has dried out in spring and put on in a dry spell under the maker's conditions (the staining stages and timing cell). FAQ: When is the best time of year for [SERVICE_LOWER], and how long does it take? (Timing): From the trade facts timing row only: fencing goes in all year where the ground allows it; what the season changes, in the ground, the concrete or the timber (post concrete sets more slowly in the cold; staining waits for dry timber and the maker's weather; a hedge along the line is checked for nests before it is cut back); then the duration, which the row gives for no fencing job, so what decides it instead. No dates, no promises about the weather. This is the one place the timing is written.

**Desire led variant** (`service_page_blocks.A.desire`). Nobody has symptoms of wanting a picket fence. A page the library flags `desire_led` (fencing.csv: timber, composite, closeboard, panel, picket and hit and miss fencing, metal fencing and railings, made to measure fencing, garden gates, automatic gates, bin and log stores) reads this block 4 in place of the one above: the customer's situation, what decides it (the mechanism) and what the work gives them, never a fault invented for it. The seasonal card swaps the same way. Everything else on the page (What's Included, block 5, the steps, the FAQ slots, the symptom question) is the type A entry's. No fencing page is flagged emergency, so nothing wins over it. H2: Is [SERVICE] Right for Your Home?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|
| Who can see in, and who could get out | what the boundary has to do for this household | The customer's situation: next door's upstairs windows look onto where they sit, a toddler or a dog with a way through to the road, a front garden with nothing between the lawn and the pavement, bins stood against the house wall. What decides it: what the boundary has to do for this household (cover where they sit, keep a dog or a child in, mark the front without closing it off, hide the bins) and the height that usually applies there (lower beside a road with traffic on it, its pavement included; higher elsewhere), from the trade facts rule rows as what usually applies, never the order's name, no figure the rows do not give. What the work gives them, from the stages and materials for this service: a solid closeboard or panel run where they sit, picket or railings at the front, a gate that latches, a store with a door that shuts. Never a fault invented for it, never a lifestyle pitch, never security sold on fear. |
| An exposed run or a sheltered one | how much wind the run takes | The customer's situation: the garden is on the edge of the estate, up the hill or with an open field behind it, or tucked in among houses that break the wind. What decides it: how much wind the run takes. A solid fence takes the whole of it; boards fixed alternately on the two faces let the wind pass between them (the hit and miss row); prefabricated panels do not suit the most exposed runs (the fact row on exposed locations, no figure); closeboard is built board by board on site, so it is made to the run. What holds it up decides the rest: the posts set for the height and the exposure, the concrete or the gravel board keeping timber off the wet soil (the stages and materials for this service; no depth the rows do not give). What the work gives them: a run chosen for its exposure, not the one in the catalogue. Never storm proof, never a promise about the wind. |
| Timber, concrete, composite or metal | the look, the ground and the upkeep deciding the material | The customer's situation: they are weighing two or three ways of doing it (timber posts against concrete, closeboard against panels, timber against composite, timber against metal railings, a manual gate against an automatic one). What decides it: what it stands next to (a cottage front, a modern estate, a drive), the ground (a timber post is trimmed on the day to follow a slope; concrete ones arrive at one size; a concrete post does not rot where it meets the soil, and a slotted one takes a new panel without digging), and the upkeep they want (timber recoated as the maker says; composite only within its maker's system; metal with its coating kept whole, since rust starts where the coating is broken), from the trade facts materials cells and done badly rows for the services on the page. What the work gives them: the material that suits their boundary, never the one that is best in general. A named product only from [CV: materials_methods]. No lifespan or guarantee claim: the facts verify none for closeboard against panels or for composite, and a maker's post guarantee covers the post, not the fence. |
| Whose fence it is, and which way it faces | a boundary shared with next door | The customer's situation: the project customer's worry about a falling out with next door. What decides it: whose boundary it is and where the line runs, from the trade facts fact rows: there is no rule that the fence on the left or the right is yours; the deeds decide; a T mark on a plan can show who looks after a boundary but does not settle it on its own; the title plan shows a general line, not where each post stands; the finished face turned outward is a custom, not a law. What the work gives them: the line agreed before a hole is dug (the set out stage; on the made to measure page, the row's check of the boundary and permissions) and, as the customer's part, a word with next door before anything comes down. Never legal advice, never a guess at which side owns it, never a promise about the neighbour. |

**Desire led seasonal swap** (card 4): **Getting it up in the right weather** (mechanism: the ground and the timber the job waits for): The customer's situation: they want the garden closed in before the summer, or want to know when it should go up. What decides it: the conditions the job waits for, from the trade facts timing cells for this service (fencing goes in all year where the ground allows; post concrete sets more slowly in the cold; a coating goes on only when the timber is dry and the maker's weather holds; a composite system within its maker's conditions; a hedge along the line checked for nests before it is cut back). What the work gives them: a fence put up when the ground and the timber will take it, so the posts stay put. No dates, nothing about spring being busy or booking ahead, no promise about the weather. FAQ: When is the best time of year for [SERVICE_LOWER], and how long does it take? (Timing): From the trade facts timing row only: fencing goes in all year where the ground allows it; what the season changes, in the ground, the concrete or the timber; then the duration, which the row gives for no fencing job, so what decides it instead. No dates, no promises about the weather. This is the one place the timing is written.

## Location page blocks by business type (location_page_blocks)

Written 4 Nov 2026. Used by the location page job (CORE (18)): block 4 (the problems the town's homes have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the niche steps. The briefs are town wide, not per category: the town profile, the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED carries the town's other pages' causes). A fence stands in the ground and in the wind, so the pack's section 3 anchors are exposure, ground, housing era and the road at the front. No seasonal swap and no symptom question on a location page. The type is the client's, never a category override. Placeholders: `[WORK]` the primary category's work noun (Fencing), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town. The copy rules of CORE (18) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's or order's name, no how it's done sentence.

- A niche with no section here has its location pages refused: "no location block briefs for fencing".

### Type A (project trade: every client)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Runs that catch the wind | the town's open edges and exposed estates | Fences on the edge of town, up on the hill, along a coastal front or with open fields behind, where the town profile gives the exposure. The one cause this card makes: the town's open edges and exposed estates, where a run takes the full wind with nothing to break it. Say what it means for the work, never for anyone's fence: how the posts are set for that exposure, why a solid panel is the wrong choice on the most exposed runs and boards fixed alternately or closeboard built on site suit them (the trade facts fact row on exposed locations; no figure, no wind rating). Never a named storm the research does not give, never that the town's fences are blowing down. Not a post gone soft at the ground, not the wind finding a weak post: the town's category and service pages own those. |
| Ground that works posts loose | the ground under the town's gardens | Posts that rock after a dry summer, holes that fill with water as they are dug, digging that hits stone a spade's depth down, where the town profile gives the ground. The one cause this card makes: the ground under the town's gardens: clay that shrinks as it dries and swells when wet, so a post set in it moves; sandy ground that gives; stony ground that slows every hole; low ground where the water is close under the surface. Say what it means for setting posts, in plain words; no depth or figure (the facts verify no universal post depth); never promise the ground will change. Not a post sitting in wet soil and rotting: the service pages own that. |
| Boundaries from when the streets were built | fences put up with the houses | Chain link between the back gardens of a post war estate, a concrete post run from the eighties, a wall and railings on a Victorian street, open plan fronts with no boundary at all, where the town profile dates the housing. The one cause this card makes: fences put up with the houses, built for how the street was lived in then. Tie the era to the work, never to a judgement on the fences: a run of that age comes out with its posts and their concrete before anything new goes in (the trade facts removal stages and price rows); on an open plan estate the right to fence the front may have been taken away, said as sometimes and only where the research confirms it. Where the boundary is shared, a word with next door comes first; whose it is comes from the deeds, never from left or right. What the business does only from confirmed practices. |
| Front gardens beside the road | the lower height that usually applies beside a road | Front gardens that meet a road with traffic on it, or its pavement, where the town profile gives the street pattern. The one cause this card makes: the lower height that usually applies to a boundary beside a road, pavement included, which is why the front fences in these streets are low. What usually applies, from the trade facts rule rows, with usually and never the order's name or a figure the rows do not give: the lower limit at the front, the higher one elsewhere, a conservation area that does not change the heights but can control taking an old boundary down, a listed home that needs a check first. What people put at the front instead: picket, railings, a low wall with a hedge behind it, named only where the services list has the page. Not the overlooked back garden: the category page owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Carrying it all through the house | Where the back garden is reached only through the house or along a shared side passage, each post, every panel and the bags of concrete is carried by hand and the old fence comes out the same way; the town profile says which streets are terraced. Say why that adds time (never 'the only way': a superlative). No figure. |
| Gardens on a slope | A boundary that falls or rises with the street is stepped bay by bay, each post set to its own level and each panel or board cut to meet the next (the trade facts price rows: changes of level). From the town profile where it gives the slope. No figure. |
| What is in the ground here | Stone a spade's depth down, roots along an old hedge line, buried concrete from the last fence, pipes and cables under the line: what the digging meets in this town, from the profile only, said as what the work meets and never as a judgement on the gardens (the trade facts price rows: difficult ground, buried services, old foundations). No figure. |
| Conservation areas and estate rules | Where the town has conservation areas, listed buildings or estates where the right to fence the front has been taken away, the checks before a boundary at the front can go up add time, and some things need permission first. Usually, never the order's or the area's official name. From the dossier rules only; otherwise a check with the council as something that sometimes applies. |

**Steps.** The niche steps (type A).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (carrying everything through the house, a slope, what is in the ground) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we come and look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a fencing quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at, what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Can you put a fence up in [TOWN] at any time of year? | From the trade facts timing cells: fencing goes in all year where the ground allows it; what the season changes, with the reason in the ground, the concrete or the timber (post concrete sets more slowly in the cold, staining waits for a dry spell and dry timber, a hedge along the line is checked for nests before it is cut back). Where the town profile gives the ground (clay still wet in spring, water close under the surface), say what it does to the digging. Nothing about autumn being busy or booking ahead. No dates, no promise about the weather. | Timing |

## Per page overrides (service_overrides)

Brandon, 4 Nov 2026 (copy quality 3): a page whose job differs from the shared type A entry gets its own briefs here, keyed by the page target in lower case. The code lays them over the type entry for that page only (service-blocks.js blocksFor).

### Fence staining and treatment

A schedule led page: block 5 is about coating a fence that is already there (the length and the faces, the state of the timber, access and masking, the product), not about posts and panels, and the steps wait for dry timber and a dry spell.

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much fence there is to coat | The length of the run and whether one face or both are being done, the height, the gates and the posts counted in (the trade facts price row: access to both faces, the number of coats the product asks for). Say it plainly and give no figure. |
| The state of the timber | Bare new timber, timber gone grey, an old coating peeling that has to come off, green growth to wash off before anything goes on, timber still wet that has to dry first (the trade facts stages: clean and prepare, let the timber dry as the product requires; the price row: surface preparation, how much old coating comes off). Say the business looks before it prices, from [CV: quote_method] only. |
| Getting at both faces and what has to be covered | A fence reached from the garden only or from next door's side as well, a border planted hard against it, a patio, a shed, a wall or a brick pier the brush must keep off, what is sheeted and masked before a coat goes on (the trade facts stages: protect adjoining surfaces; the price row: access to both faces). Say why each adds time. Never a promise about what next door will allow. |
| The stain or treatment you choose | A stain, a paint or a clear preserver, and the number of coats the product asks for; brush against spray only as the trade facts give them. A named product only from [CV: materials_methods]. A coat on the surface is not the pressure treatment the posts had at the yard (the trade facts materials cell), so never say it stops a post rotting in the ground, and no wait before coating fresh timber as a rule (the facts verify none). Code adds the price line from [CV: price_list] when there is one. |

Steps:

| Step | Brief |
|---|---|
| Tell Us About the Fence | How to get in touch and what is useful to send first (roughly how long the run is, one face or both, what is on it now, a photo of the worst patch). No promise of a reply time unless [CV: response_time] is set. |
| We Look at the Timber and Price the Job | The visit and what gets looked at: how dry the timber is, what old coating has to come off, growth to wash off, which faces can be reached and what is planted or built against them. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it). |
| We Treat It in a Dry Spell That Suits You | The date is agreed in advance, to suit the customer, and it waits for dry timber and the weather the coating maker allows (the trade facts timing cell); no number of dry days, no promise about the weather. A day moved by the rain and rebooked only when the weather_delays_rebooked practice is confirmed. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it). |

### Bin and log stores

A small build with no run, no height and no posts in the ground: block 5 is what the store holds, its roof and doors, where it stands and what it fixes to, and the timber and finish.

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| What it has to hold | How many bins and which sizes, or how much wood it has to keep dry for the winter: the width, the depth and the height follow from that (the trade facts price row: custom dimensions against repeated or standard components). Say it plainly and give no figure. |
| A roof, doors and how it opens | A sloping roof that throws the rain off, a lid that lifts for the bins, doors or an open front, slatted sides so air gets through the logs (the trade facts stages: cladding, roof and doors; the price row: roof and door detailing). Say why each adds work, in plain words. |
| Where it stands and what it fixes to | On paving or a slab that is already there, or on a base that has to be made first; freestanding, or built onto the fence or a wall; how it is reached with the timber (the trade facts stages: measure the location and access, prepare the base; the price row: base preparation, site access). Say the business looks before it prices, from [CV: quote_method] only. Whether the business lays a base only from the services list or confirmed practices. |
| The timber and the finish | The timber and its treatment, the cladding pattern, a coat of stain or preserver, only from [CV: materials_methods]; what keeps the frame off the wet ground and sheds the rain, because a store stands outside all year (the trade facts done badly row: rain let in by a poor detail, decay where the timber treatment did not suit). No lifespan figure. Code adds the price line from [CV: price_list] when there is one. |

### Automatic gates

Block 5 opens on the gate and what moves it (one leaf or two, sliding or swing, the posts or piers, the motor and its safety devices, the power run) in place of the run's length and height; the other cards read as the civil works, the slope and the power, and the gate, the safety kit and the extras.

H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| The gate and what moves it | One leaf against two, sliding against swing, the posts or piers it hangs on, the motor and its safety devices, the power run to it (the trade facts stages: foundations, the gate and its operator, the protective devices; the price row: gate fabrication, the electrical supply and the civil works, the safety device design). Say it plainly and give no figure. Never a brand of motor unless [CV: materials_methods] names it. |
| What has to come out or go in the ground first | An old gate and its posts, piers that are not up to the weight of a powered gate, the foundation for new posts or for a slide track, the trench for the cable across the drive (the trade facts stages: build foundations; the price row: civil works). Say the business looks before it prices, from [CV: quote_method] only. |
| The slope, the opening and the power | A drive that rises behind the gate so a swing leaf cannot clear it, a drive too short for a leaf to swing in so it slides instead, where the power comes from and how far it has to run, pipes and cables under the line of the trench (the trade facts price row: electrical supply and civil works). Say why each adds time. Who does the electrical work only from the services list or confirmed practices. |
| The gate, the safety kit and the extras | Timber or metal leaves and their finish, an intercom or keypad, a remote for each car, from [CV: materials_methods] only; the safety devices the risk assessment calls for (edges that stop the gate when it meets something, detection so it does not close on a person, the closing force tested at the end) and the paperwork handed over, from the trade facts stages and the done badly row. Say plainly that the safety side is part of the job and never a thing to leave off, with no figure and no standard's number; never say photocells alone make a gate safe (the trade facts fact row). Code adds the price line from [CV: price_list] when there is one. |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

Things a brief wanted that neither the calibration pack nor the trade facts pack gives. Each brief says "from the trade facts rows only" or leaves the point out until one of these is answered.

1. **The made to measure page and its facts row.** fencing.csv names the page Made to measure fencing (bespoke is on the CORE banned list, as the pack's note to Brandon says). The trade facts Table A, B and F row that serves it is still named Bespoke fencing, and `rowsForService` matches rows by the page's name and its GBP aliases (Custom fence construction, Fence design), so that page gets no stages, signs or price factors until the row is renamed in `trade-facts/fencing.md` or the loader is told the alias. The pack also asks Brandon what the link text for this page should be; the entry uses the page name.
2. **The two heights and the NUM rule.** The pack's example FAQ answers the height question with the figures and says they come from the trade facts pack on the day. Table C and E give them, but `validate-v20.js` NUM blocks any digit that is not in the client values or the allocated research, and the trade facts text is not in that set, so a written "2 metres" is blocked even on a service page that carries the row. Every height brief here says "the heights only as the rows give them and only where the rows are in the prompt". Ray or Brandon to decide: write the heights in words, add the verified pack's figures to the numbers the validator allows, or keep the answer to "lower beside a road, higher elsewhere".
3. **No duration for any job.** Table A says "varies; no standard" for all 23 services and Table G confirms it. Every timing brief gives the factors and no number. The onboarding questions ask the client for a typical duration for three jobs.
4. **No post depth.** Table E says the one third buried and 600 mm rules were not verified, so no brief gives a depth; the pack's rule 1 (post depth for the height and exposure) is written as "set for the height and the exposure" with no figure. If Ray wants a depth on the page it has to come from the client's own practice.
5. **No universal gap, height or mesh for a dog.** Table G verifies no dog proof specification, so the dog proof card speaks of the gate bottom, the hole beside a post and the loose bottom edge, and names no height. The client's own usual spec (mesh size, dig guard, height) would make that page concrete.
6. **Hit and miss and the wind.** The pack and Table E say a solid panel takes the wind and hit and miss lets some through, but Table E says no percentage was verified, so the briefs say it without a figure.
7. **Which neighbour pays after a storm, and insurance.** Table G says it cannot be answered universally, so the storm cards and the repair FAQ never say who pays. A client who deals with insurers (photos, a written report for a claim) should say so in confirmed practices so the copy can.
8. **Staining intervals.** Table G verifies no wait before staining new treated timber and no recoat interval, so the upkeep card says "when the timber is dry through and the maker's conditions hold" and names no interval. The client's product and its data sheet would give one.
9. **The other Fillout tabs.** A fencing client's form can tick Deck Builder, Gardener, Landscape Gardener, Landscape Designer, Lawn Care Service, Tree Service and Paving Contractor. The pack's section 2 assigns them no type, so they take A and the fencing briefs, which do not fit a gardening round. If such a client arrives, Brandon decides whether those categories read the landscaper entry's B briefs (code change) or the client is set up as a landscaper.
10. **Automatic gate sign off.** Table C and D say the finished gate must be tested and documented and that no named scheme is a legal requirement. The briefs say "tested for force and fitted with its safety devices" and name no scheme; Gate Safe and DHF go on the logo strip only when Ray has verified the client on them.
11. **Rural work.** The pack's rural and commercial customer "is buying a function" and the specification led lines in the service cards serve those pages, but Table G verifies no stock mesh specification, no deer fence height as law, no electric fence sign spacing and no footpath crossing width, so those pages lean on the client's own practice more than most. Confirm with each client that they do that work before the pages are made.

## Alternate Why title that promises a practice (why_title_practice)

"The Post Comes First on Every Job" stands only with a practice no tick confirms, so never by default; otherwise the point reads "Local Experience Behind Every Job".

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| Can a storm damaged fence be repaired, or does it all need replacing? | Fence repairs |
| A fence down or leaning after the wind | Fence repairs |
| When the fence has one job to do | Dog proof fencing; Security fencing; Acoustic fencing; Agricultural and stock fencing; Equestrian fencing; Electric fencing |
| Timber going grey, green or soft | Fence staining and treatment |

## Idea homes

- **how the quote is reached and whether it is given in writing** (homepage): home is the 'How do your quotes work?' FAQ. Elsewhere: step 2 (either version) describes the visit or says a price is agreed before work starts, without explaining the quote method again; the 'Is the quote free' FAQ says only free and no obligation.
- **what decides how long the job takes (length of run, what comes out, ground, access, weather) with no number** (service): home is the 'How long does [SERVICE_LOWER] take?' FAQ. Elsewhere: the seasonal 'When is the best time of year' FAQ covers only what the season changes and does not list the duration factors again.
- **what the season changes: concrete setting slowly in the cold, staining waiting for dry timber, nests checked in a hedge** (service): home is the seasonal 'When is the best time of year for [SERVICE_LOWER]' FAQ. Elsewhere: the 'Getting it up in the right weather' card names the customer's wish to be closed in before summer and does not list the weather conditions.
