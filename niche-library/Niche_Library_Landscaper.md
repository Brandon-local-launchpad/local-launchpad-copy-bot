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

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)
