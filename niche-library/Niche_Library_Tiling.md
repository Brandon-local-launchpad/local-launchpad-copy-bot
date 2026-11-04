# Niche Library Entry: Tiling

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry). Every slot is required; an empty slot stops the run (G-NICHE). Code reads `niche-library/tiling.json`; this file is the same content for people, kept in the same commit.

Business type: **A (project trade)** for the one GBP category, Tile contractor, and every page group under it (Tiling Calibration Pack v1, section 2: all five rows are A). Emergency niche: **no**; the library flags no page, so there is no emergency variant, no `steps_emergency` and no `final_h2_emergency`. Seasonal: **no** (the pack: tiling is not seasonal; the only timing that matters is frost outside and drying time for new plaster and screeds), so no seasonal swap. Desire led pages (the library's `desire_led` column, 4 Nov 2026) read the desire variant of the service page blocks.

Sources, in order of authority: `calibration-packs/Tiling_Calibration_Pack_v1.md` (sections 1, 2, 4 and 7), `trade-facts/tiling.md` (Tables A to G; the pack is not yet verified), `niche-library/tiling.csv` and `fillout/services/tiling.json`. Every figure or rule a brief wants is pointed at a trade facts row, never written here.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Tiling / tiling |
| trade_person / trade_person_plural | tiler / tilers |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | no |
| big_ticket | yes (wet rooms, whole house floor tiling, porcelain patios) |
| schema_subtype | HomeAndConstructionBusiness (schema.org has no tiler subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| tiles, tiling, grout, silicone, bathroom, shower, wet room, kitchen, splashback, floor, hallway, hall floor, patio, fireplace, hearth, the wall behind, the floor underneath, the board, the screed, the floorboards, waterproof layer, tanking | substrate, background, setting out, back buttering, debond, debonding, penetrations, changes of plane, cementitious, reaction resin, uncoupling membrane, calibrated, bespoke, luxury, non slip, anti slip, contemporary, on trend, statement (words_avoid_exceptions: substrate is allowed once where a What's Included item is the Table A stage named with it; elsewhere say what the tiles are fixed to: the board, the screed, the plaster, the floorboards; setting out is allowed once where a What's Included item is the Table A stage of that name; elsewhere say where the cuts fall) | waterproof grout, waterproof tiles, grout is waterproof, flawless, stunning, dust free, will never crack, never crack, stay white, stays white, transform your bathroom, transform your kitchen, transform your home, dream bathroom, dream kitchen, spa like, hotel style, showroom finish, designer look, wow factor (the pack's section 7: selling the visible finish, calling grout waterproof, promising what the building controls, and the "dust free" claim Table G drops) |

The words to use are the customer's words: the room, the tiles, the grout, the silicone, and the layer under the tiles said as what it is (the board, the screed, the floorboards, the waterproof layer). "Tanking" stays a word to use because the pack writes it into customer copy and a page is named with it; the copy says what it is the first time (the waterproof layer under the tiles). The words to avoid are the trade's own terms for the same things (substrate, background, setting out, back buttering, debonding, penetrations, changes of plane) and the interior design register the pack bans.

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about the room and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about the room and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no page is flagged emergency) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About the Job**
   Brief: How to get in touch and what is useful to send first (which room, roughly how much wall or floor, what is on it now, whether the tiles are chosen, photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Check the Room and Price the Job**
   Brief: The visit and what gets looked at (what the tiles will be fixed to and whether it is flat, dry and sound, whether old tiles are coming off, the shower or bath edge and what needs a waterproof layer, where the floor meets the walls, how the tiles get in). Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it).
3. **We Start on a Date That Suits You**
   Brief: The start date is agreed in advance, to suit the customer. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it). Nothing about drying or curing waits: the timing FAQ owns them.

Step 2 only when the `site_visit_before_quote` practice is confirmed. Without it (`step_2_no_visit`): **We Price Your Job**
   Brief: Say a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates 'free' (FAQ 5 owns it).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer warranty → insurance (a tanking system's warranty is the manufacturer warranty, from [CV: manufacturer_warranty] only, and is never written as the tiler's own guarantee: Table G says no TTA wide insurance backed guarantee exists) |
| fears (in order, one per Why choose us point; the pack's section 1, the one fear all three readers share first) | 1. tiles that look right on the day and crack, loosen or let water through within a year or two; 2. a shower that leaks into the wall or the ceiling below where nobody can see it; 3. a tiler who tiles over a wall or floor that was never ready for it (a floor that flexes, a wall that cannot take the weight); 4. a price that grows once the old tiles come off and what is behind them shows |
| fears_by_type | empty: every category and page group is type A, so there is no second reader to key fears by |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies and registers:** The Tile Association (TTA), TTA Master Tile Fixer (a separate assessment, not ordinary membership), TrustMark, Stone Federation Great Britain (stone clients only). None is a licence: Table E says no compulsory tiler qualification exists, so none is written as one.
- **Tier 2, manufacturer schemes:** YOU+BAL partnership profile and ARDEXacademy training, shown as a partnership or training and never as an approval (Table D: neither is a verified installer certification). "TTA Approved" and "BAL Approved Installer" are not verified schemes (Table G) and are never shown.
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards. Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if something is damaged during the job. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. A tanking system's warranty only from [CV: manufacturer_warranty], as its own thing and never as the tiler's guarantee. | no | Trust |
| faq_3_none | What happens if something isn't right after the job? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the 'reasonable care and skill' standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does tiling a bathroom or a floor take? | No number unless [CV: typical_jobs] gives one: the Table A timing cells say it varies and give no standard. Give what decides it (the size, what comes off first, what has to go on before the tiles) and the waits that sit inside the job as the Table E rows give them: new plaster or a new screed dries before tiling, a tanking layer cures before it is tiled over, the adhesive sets before grouting and before a floor is walked on. Nothing about when the job can start (FAQ 4 owns it). | no | Timing |
| faq_B | Why has a tile come loose, and will the others follow? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words: adhesive that never gripped the whole back of the tile (dabs, not a solid bed, or a dusty or painted wall), a floor or wall that moves under it (floorboards that flex, no gap left for movement), and water that got behind and softened what the tile was stuck to. Then what the local housing adds, then the fix: the cause first, the tile second. | **yes** | Process |
| faq_C (fallback) | Porcelain or ceramic: which is better for a floor? | From the Table E porcelain and ceramic row: porcelain is a ceramic tile that takes in very little water, which suits floors, wet rooms and outside, but the right tile depends on where it goes and what it has to put up with (wear, slip where it gets wet, frost outside), not on the name. Never a rating as proof (the Table E slip row), never that porcelain is always better. | no | Process |
| faq_D (fallback) | Does new plaster or a new floor need to dry before it's tiled? | Yes: from the Table E new plaster and concrete row, new plaster and a new screed are left to dry and checked before a tile goes on, the waits as the row gives them and no other figure; a heated screed is run up and cooled before tiling (the Table E UFH row). Say why: tiles fixed over a wet base let go or crack as it dries out. No dates. | no | Timing |
| faq_planning (big_ticket AND [CV: handles_planning] confirmed) | Do I need permission for tiling work? | Point at the trade facts rule rows (Table C) and write what usually applies, with "usually" or "in most cases": tiling at a home usually needs no permission; a listed home where the floor or wall is part of what is listed usually needs consent before it is altered; a hard surface at the front of the house usually needs the rain to soak away inside the garden; electrical work for a heated floor in a bathroom is notified through the electrician, never the tiler; a drain moved in a wet room goes through building control. What the customer does about it only as the row gives it. No figure, no area, never an Act's or a document's name. | no | Process |

Sources for faq_A to faq_D: the questions a tiling customer asks before booking, answered from the trade facts rows named. faq_A gives no number because Table A says every duration varies and Table G confirms no range exists. Replace with real customer questions when Brandon or the client supplies them.

### Type keyed homepage overrides (faq_slots_by_type)

Empty: the pack gives one business type. The shared slots above apply to every client of this niche.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`). The groups follow the three hidden layers the pack's section 2 names (what the tiles go on, the waterproofing, room to move) plus the tiles themselves.
- Tiles: ceramic / porcelain / natural stone (limestone, marble, slate, granite, sandstone) / mosaic / large format / Victorian geometric and encaustic reproduction tiles
- What the tiles go on: tile backer board / cement board / plasterboard / sand and cement screed / levelling compound / decoupling membrane / plywood overlay on timber floors
- Waterproofing: liquid applied tanking / sheet membrane tanking / waterproof boards / wet room former with falls built in
- Adhesive, grout and seals: cement based adhesive / flexible adhesive / epoxy adhesive and grout / cement based grout / grout colourant / sanitary silicone / edge trims / stone sealer or impregnator
- Other: old tiles removed / dust extraction on cutting tools / waste taken away / tiling over underfloor heating / asbestos test arranged before an old floor is lifted

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

wall tiling, floor tiling, bathroom tiling, shower tiling, wet room tiling, tanking, waterproofing, kitchen tiling, splashback, splashbacks, mosaic tiling, feature wall tiling, hearth tiling, fireplace tiling, natural stone tiling, limestone, marble, slate, porcelain tiling, large format tiling, outdoor tiling, porcelain paving, swimming pool tiling, Victorian floor tiling, period floor tiling, encaustic tiles, geometric tiles, tile repairs, tile replacement, regrouting, grout repair, grout cleaning, grout sealing, grout colouring, silicone sealing, resealing, stone sealing, tile removal, screeding, floor levelling, underfloor heating, tile and grout cleaning, backer boards

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| furniture assembly | (never named) |
| gutter cleaning | (never named) |
| remodelling | (never named) |
| drywall | (never named) |
| fan installation | (never named) |
| fan repair | (never named) |
| floor fitting | (never named) |
| plumbing fixture | (never named) |
| tv mounting | (never named) |
| interior decorating | (never named) |
| exterior painting | (never named) |
| flooring repair | (never named) |
| water fixture | (never named) |
| tile design | (never named) |
| tile refinishing | (never named) |
| dust-free tile removal | tile removal |
| tile removal | tile removal |
| grout cleaning | grout cleaning |
| grout repair | grout repair |
| grout sealing | grout sealing |
| grout staining | grout colouring |
| tile grouting | grouting |
| tile regrouting | regrouting |
| tile work installation | tiling |
| tile work replacement | tile replacement |
| tile replacement | tile replacement |
| bathroom tile repair | bathroom tile repairs |
| kitchen tile repair | kitchen tile repairs |
| shower tile repair | shower tile repairs |
| tile flooring repair | floor tile repairs |
| shower tile installation | shower tiling |
| tile backsplash installation | kitchen splashbacks |
| kitchen splashback | kitchen splashbacks |
| tile cleaning | tile and grout cleaning |
| tile restoration | period floor restoration |
| wall tiling | wall tiling |
| floor tiling | floor tiling |
| bathroom tiling | bathroom tiling |
| mosaic tiling | mosaic tiling |
| wet room | wet room tiling |
| underfloor heating | underfloor heating |
| underlay board | backer boards |
| screed | screeding |
| levelling | floor levelling |
| silicone | silicone sealing |
| natural stone | natural stone tiling |
| victorian | Victorian floor tiling |
| outdoor tiling | outdoor tiling |
| swimming pool | swimming pool tiling |
| hearth | hearth tiling |
| feature wall | feature wall tiling |
| edge trim | tile trims |
| tanking | tanking |
| large format | large format tiling |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). A card never leads with a specialist service (swimming pool tiling, period floor restoration) unless it is in jobs_wanted. JSON slot: core_services.

- Tile contractor: bathroom and shower tiling, floor tiling, kitchen splashbacks, wet room tiling, tile repairs, regrouting

Service words for the whole job rather than one service: tiling, wall and floor tiling, bathroom tiling, retiling, tile fitting. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: tile repairs, regrouting, leak. When an FAQ question names the job as well as the problem ("Does a new shower need tanking before it is tiled?"), it goes to the job's page (bathroom and shower tiling), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches; none is tiling only yet). The briefs here name the shared keys a line depends on: site_visit_before_quote (step 2), written_quote (step 2), price_agreed_before_work (the no visit step 2), extra_work_agreed_first (what shows once the old tiles are off), property_protected (dust sheets and floors covered), waste_removal (old tiles and rubble taken away), tidy_each_day, photos_of_faults (what was found behind the tiles), aftercare_advice (grout, silicone and stone care after the job). Practices this trade would want and does not have yet are listed under "What the sources lacked".

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every tiling client for:
- a "from" price for 3 typical jobs (e.g. a bathroom, a kitchen floor, a regrout);
- a typical duration for the same 3 jobs;
- whether quotes are written, and whether the price is fixed once agreed;
- whether they supply tiles as well as fix them, or fix the customer's own ("supply and fit" is written only from this answer);
- whether they remove old tiles and take the waste away, and whether they hold a waste carrier registration;
- which tanking system and which boards they use (the tick list), so the copy can name one;
- whether they arrange an asbestos test before an old floor covering is lifted, or ask the customer to;
- whether they tile over underfloor heating, and who does the electrical side;
- whether they take outdoor and swimming pool work (Swimming pool tiling is a confirm only page);
- team size, and who does the work on site.

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Years of Local Tiling Behind Us**
2. Cover → **Covered If Something Goes Wrong**

## Business type notes (business_type_notes)

One GBP category, Tile contractor, and every page group under it is type A (Tiling Calibration Pack v1, section 2). Tile repairs and regrouting stay problem led inside A: silicone and stone sealing recur, but nobody books a tiler on a round. No type B entry exists; a client set to B by hand falls back to the niche default.

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": tile contractor → tiling. The category page briefs (`category_page_blocks`) use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above), the FAQ slots and the symptom question. Placeholders: `[CAT]` the page keyword without the town (Tile Contractor), `[WORK]` the work noun (Tiling), `[WORK_LOWER]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises.

- `seasonal_trade`: no (the pack: tiling is not seasonal). No seasonal card or FAQ swaps in.
- `category_types`: empty. The one category, Tile contractor, takes the niche default A.
- A niche with no section here has its category pages refused: "no category block briefs for tiling".

### Type A (project trade: Tile contractor, every page group)

The pack's section 2 splits the one category by page group, and block 4 below carries the split inside its four cards: card 1 is the renovating customer's situation (new bathrooms, kitchens and floors; desire led); cards 2 and 3 are the two hidden layers that fail (the waterproof layer in wet areas, movement under floors; problem led); card 4 is the repair customer's honest answer (the pack's craft rule 5). Every brief names which Table A, B or E row it draws on and what it must not say, so the three layers are never blurred (grout is not waterproof, silicone is not grout).

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A bathroom, kitchen or floor you're redoing | whether the wall or floor is ready to carry tiles | A situation card, not a fault: the household is refitting a bathroom, a kitchen or a hall floor, the old tiles or the paint are still up, and the tiles are chosen or nearly. What decides it: what is behind or under them (plaster, plasterboard, cement board, a screed, floorboards on joists) and whether it can carry the weight of the tiles they want (the Table E plaster and plasterboard row, with no figure), whether a shower or bath edge needs a waterproof layer first, and whether anything new, plaster or a screed, still has to dry out (the Table E new plaster and concrete row, the wait as the row gives it). What the work gives them, in plain words: the right board or layer put on first, the tiles fixed so they stay put, silicone where the surfaces meet. On a page whose services are mostly repairs the card reads as the room they are patching up and whether it is worth tiling again from the wall out. Never a lifestyle pitch, never the finish sold on its own, never a fault invented for a new room. |
| Water getting behind the tiles | nothing waterproof beneath the tiles in a wet area | Problem led: grout missing or dark in one corner of the shower however often it is cleaned, a wall that feels damp, a tile near the bath that has gone loose, a mark on the ceiling of the room below (the Table B bathroom and wet room signs). The one cause this card makes: there is nothing waterproof under the tiles, so what gets through the grout reaches the board or plaster behind, which softens and lets go (the Table E rows: tiles are not tanking; plasterboard in a shower). Say what putting it right usually involves from the Table A bathroom and wet room stages: the tiles off in the wet area, soft board replaced, a tanking layer over it and its corners, then the tiles, with silicone and not grout where the wall meets the bath, the tray or the floor. New grout over the old joints is not the fix, and the card says so without alarm. Never 'waterproof grout', never a system or membrane name unless [CV: materials_methods] gives it, never that this business tanks every job unless confirmed. Not a joint that was sealed rigid: the service pages own that. |
| Cracks that run from one tile to the next | a floor that moves under tiles fixed rigid to it | Problem led: a crack through several tiles in a row, grout breaking up along one line, tiles that rock or sound hollow, a floor that feels uneven (the Table B floor tiling signs). The one cause this card makes: the floor is moving and the tiles were fixed rigid to it, so the movement comes through them: floorboards that flex, a crack or joint in the screed below, no gap left at the edges or across a large floor. Say what the fix usually involves from the Table A floor stages and the Table E movement joint rows: the floor checked for flatness and give before anything goes down, stiffened or overlaid where it flexes, a decoupling layer as one option on a timber floor, joints left where the floor needs them and filled with something that gives. Swapping only the cracked tiles sets fresh tiles on top of the same moving floor. Never a joint spacing or width figure (the rows carry them). On a page with period floors the card also reads as loose and missing pieces over a base that has shifted or gone damp; with outdoor tiling, slabs that have lifted after a winter on a base that moved. |
| One broken tile, and whether a swap will hold | whether the knock or what sits under the tile did the damage | The repair customer's situation and the honest answer to it: a floor tile cracked by something dropped, a chipped edge, a tile fallen off the splashback, grout splitting round one tile (the Table B repairs signs). What decides it: whether the knock did it, in which case one tile out and a matching one in is a fair repair (the Table A repair stages: the neighbours checked, the tile removed without harming the ones round it), or whether the cause sits behind or under it, water, movement or adhesive in dabs, in which case a new tile goes the same way (the Table B repairs row: a replacement fails if the cause is not put right). What the work gives them: a straight answer on which it is before anything is ordered, and a matching spare where one exists, never promised. Never a scare, never a dig at whoever laid it, never that every crack is a floor problem: card 3 owns the line of cracks. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How much wall and floor there is | Square metres move the price more than anything else: more tiles, more adhesive and grout, more cuts, more days. A whole bathroom against a splashback, a hall against a kitchen floor. Say it plainly and give no figure. |
| What has to come off first | Old tiles off, the adhesive left behind ground back, loose paint or plaster made good, and what shows once the wall or floor is bare (the Table F removal and preparation factors). Where an old floor covering may be the kind that needs a test before it is lifted, the test is a stage of the job and never said casually (the Table C and E asbestos rows). Say the business looks before it prices, from [CV: quote_method] only. |
| Boards, waterproofing and levelling | What has to go on before the first tile: a backer board, a levelling compound, a tanking layer in a shower or wet room, a floor stiffened where it flexes, a drain moved or falls formed in a wet room (the Table F factors by service). Say why each adds a stage and a wait; never a system name unless [CV: materials_methods] gives it. |
| The tiles, the pattern and the cuts | Large format and stone take longer to handle and fix, mosaics and small tiles mean more joints to grout, a herringbone or diagonal layout wastes more and takes longer to set out, and every socket, pipe and window reveal is a cut (the Table F factors). Name a tile type only if the trade facts or [CV: materials_methods] give it. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing. There is no seasonal swap.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for tiling (the area, what has to come off and go on first, the tiles chosen) and how the quote is given, from [CV: quote_method] only. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. A tanking system's warranty only from [CV: manufacturer_warranty], kept apart from the tiler's own guarantee. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What [WORK_LOWER] work do you take on? | The jobs themselves, named from the card list (bathrooms and showers, floors, splashbacks, repairs and regrouting, as the client has them), and the size of job taken on, from the services list and [CV: typical_jobs] only. Link one service page. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. Supplying the tiles as well as fixing them only from the client values. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at (what the tiles will go on, whether old tiles are coming off, the wet areas), what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | How long does [WORK_LOWER] take, and what has to dry first? | No duration: the Table A timing cells say it varies and give no standard, so give what decides it (the size, what comes off first, what has to go on before the tiles) and the waits the Table E rows give: new plaster and a new screed dry before tiling, a tanking layer cures before it is tiled over, the adhesive sets before grouting and before a floor is walked on, a heated screed is run up and cooled first. Figures only as those rows state them, else none. Outdoor tiling waits for weather clear of frost (the Table A outdoor timing cell). No dates, nothing about being busy. | Timing |
| symptom | a symptom tagged with the page | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. The cause behind or under the tile first, in plain words: what the tiles are fixed to, whether there is a waterproof layer beneath them, whether the floor or wall has room to move. Then what the local housing adds, from the town profile only (timber floors and lime plaster in the older terraces, plasterboard walls and chipboard floors in new builds that settle, hard water marking grout and glass), said as how the houses were built and never as the state of anyone's bathroom. Then what the business does about it, from confirmed practices only. One figure at most. | Process |

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (signs you need it, or the desire variant) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above), the FAQ slots (cost, timing, cover, rules, scope) and the symptom question. The service's own trade facts rows (`trade-facts/pack.js rowsForService`) are the material every brief points at, so one type A entry serves a wet room, a splashback and a regrout alike. Placeholders: `[SERVICE]` the page keyword without the town (Floor Tiling, Regrouting and Grout Repair), `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for tiling".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED). The category page owns the missing waterproof layer and the moving floor; the service page owns adhesive in dabs, a repair that covered the cause, and a joint sealed rigid.

### Type A (project trade: every planned page)

Two framings share this one entry, per the pack's section 2: a problem led page (Tile repairs and replacement, Regrouting and grout repair, Tile removal, Wet room tiling and tanking, Victorian and period floor tiling) uses block 4 below as written; a desire led page (the library's `desire_led` column: Bathroom and shower tiling, Kitchen tiling and splashbacks, Feature wall and hearth tiling, Floor tiling, Natural stone tiling, Outdoor and porcelain paving tiling, Swimming pool tiling) swaps block 4 for the desire variant at the end of this section. The pack's schedule led framing barely applies (resealing stone and renewing silicone read better as problems), so no brief carries a schedule led line.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Checking what the tiles will be fixed to | The inspection stage from the Table A row for this service: the wall or floor, whether it is flat, dry and sound, whether it can take the weight of the tiles, what has to come off. A part of the job, not a promise about the quote. |
| Taking off what's there and making good | The removal and preparation stages from the Table A row: old tiles, loose paint or plaster, adhesive left behind, the base repaired. Where an old floor covering may need a test before it is lifted, the check is named as a stage, plainly and never casually (the Table A tile removal row). Name only what the rows give. |
| Boards, levelling and waterproofing | What goes on before the first tile, as the Table A row names it for this service: a backer board, a levelling compound, a tanking layer in a shower or wet room, falls formed in a wet room. Never a system or board name unless [CV: materials_methods] gives it, and never a standard's number. |
| Working out where the cuts fall | The setting out stage from the Table A row: where the full tiles sit and where the cuts go, around sockets, the worktop, the window, the drain, so the awkward slivers are not where the eye lands (the Table B kitchen done badly row). |
| Fixing every tile on a solid bed of adhesive | The fixing stage: the adhesive spread over the whole back of the tile, not in dabs, so there is no hollow behind it (the Table E solid bed and dot and dab rows). The adhesive chosen for the tile and what it goes on, from the Table A materials cell; a named product only from [CV: materials_methods]. |
| Room to move at the corners and edges | The movement stage from the Table A and E rows: silicone where the wall meets the bath, the tray, the worktop or the floor and in the internal corners, joints left where a large floor needs them and filled with something that gives. Never a spacing or width figure: the Table E rows carry them. |
| Grouting, sealing and cleaning off | The finishing stages from the Table A row: grout once the adhesive has set, with the wait as the Table E row gives it, the tile faces cleaned, stone sealed where its row says so, trims and edges finished. What the customer sees when the job is done. |
| Clearing up and the waste | What comes off the job and what happens to it. Dust sheets and floors covered only from the property_protected practice; the rubble taken away only from the waste_removal practice; otherwise say it is cleared or left as agreed. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| What you noticed first | the job left undone | The things a homeowner notices first, from the Table B signs row for this service, in their words: grout falling out, a tile that moves underfoot, water past the bath edge, a splashback that never looks clean, pieces missing from a hall floor. The one cause this card makes: the job left undone. Then what it leads to if left, from the skipped row: specific, never alarming. On a repair, regrouting or removal page the card is symptom, cause, consequence in that order; on a wet room page after a leak it opens on the damp next door or in the room below. |
| Hollow, loose or lifting | adhesive that never held the whole back of the tile | A tile that sounds different from its neighbours when tapped, one that rocks, one that has come away whole with clean dabs of adhesive on its back. The one cause this card makes: adhesive that never held the whole tile, because it went on in spots rather than a solid bed, or onto a dusty, painted or unsound surface (the Table B done badly rows; the Table E dot and dab row). Say what the job does so the new tiles hold, from the Table A stages for this service: the surface checked and primed where its row says so, the adhesive spread over the whole back; no figure the rows do not give; never a dig at whoever did it. Not water behind the tiles and not a floor that moves: the category page owns those. |
| When a repair won't hold | a cause behind the tile that new grout or a new tile covers over | Grout that has been redone and fallen out again, a replacement tile that has cracked the same way, a corner that keeps opening up (the Table B repairs and regrouting rows). The one cause this card makes: a cause behind the tile that the last repair covered over rather than fixed: loose material left in the joint, a joint that moves filled with rigid grout, water still getting in, a floor still flexing. Say when a patch repair is still worth doing and when the job starts further back, from the Table A diagnose stage for this service; honest about which, never a scare. Not adhesive in dabs: card 2 owns that. |
| Where the sealant has given up | a joint sealed rigid, or a seal that has come away, where two surfaces meet | A gap or a dark line along the bath edge, grout cracked in the corner of the shower, water on the worktop finding its way behind the splashback, a crack where the wall meets the floor (the Table B bathroom, kitchen and regrouting rows). The one cause this card makes: a joint that moves was filled with rigid grout, or the silicone has come away, where two surfaces meet. Say what the job does about it from the Table A stages: the old sealant out, the joint cleaned and dried, silicone where the surfaces meet and grout only where they do not (the Table E corners row). Never 'waterproof grout'. Not a missing waterproof layer under the tiles: the category page owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much there is to tile | The size factor from the Table F row for this service: the area of wall or floor, the number of tiles to replace, the length of joint to regrout. Say it plainly and give no figure. |
| What's there now and what's behind it | What has to come off or be put right before the job starts, from the Table F row: old tiles, a painted or flaking wall, an uneven or damp floor, a leak behind the tiles, a floor covering that needs a test before it is lifted. Say the business looks before it prices, from [CV: quote_method] only. |
| Waterproofing, boards and drains | The layers under the tiles that the service needs, from the Table F row: how much tanking, a backer board, a levelling compound, a wet room former or a drain moved, a heated floor's joints, a stone's sealing. Say why each adds a stage and a wait. Never a system name unless [CV: materials_methods] gives it. |
| The tiles, the pattern and the cuts | Mosaics and small tiles, large format and stone, a pattern with more cuts, trims and returns, sockets and pipes to cut round, from the Table F row and [CV: materials_methods]. A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us About the Job; We Check the Room and Price the Job, or We Price Your Job without the site visit practice; We Start on a Date That Suits You).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the Table A timing cell for this service only: it says the duration varies and gives no standard, so say what decides it (the size, what comes off first, what has to go on and dry before the tiles) and the waits as the Table E rows give them (a tanking layer cured before tiling, the adhesive set before grouting and before a floor is walked on, new plaster or a screed dry first). No figure beyond those rows. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. A tanking system's warranty only from [CV: manufacturer_warranty], kept apart from the tiler's own guarantee. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Are there any rules I should know about for [SERVICE_LOWER]? | From the Table C rows for this service only, put as what usually applies, with "usually" or "in most cases": tiling at a home usually needs no permission; the exceptions are a listed home where the floor or wall is part of what is listed (consent before it is altered), a hard surface at the front of the house where rain cannot soak away inside the garden, electrical work for a heated floor in a bathroom (notified through the electrician, never the tiler), a drain moved in a wet room (building control), and an old floor covering checked for asbestos before it is lifted. What the customer does only as the row gives it. Never a standard's number, an Act's name or legal advice. Where the rows give no rule for this service, say no permission is usually needed and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words. Whether the tiles are supplied as well as fixed only from the client values. What it does not cover only from the services list, with one sibling service page or the category page linked. | Fit |
| symptom | a symptom tagged with the page | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. The cause behind or under the tile first, in plain words: what the tiles are fixed to, whether there is a waterproof layer beneath them, whether the floor or wall has room to move. Then what the local housing adds, from the town profile only, said as how the houses were built and never as the state of anyone's bathroom. Then what this service does about it. One figure at most. | Process |

### Type A, desire led variant (Bathroom and shower tiling, Kitchen tiling and splashbacks, Feature wall and hearth tiling, Floor tiling, Natural stone tiling, Outdoor and porcelain paving tiling, Swimming pool tiling)

`service_page_blocks.A.desire`. Nobody has symptoms of wanting a splashback (the pack's section 2 and its section 7: symptoms invented for desire led services are a failure). A page the library flags `desire_led` reads this block 4 in place of the one above: the customer's situation, what decides it (the mechanism) and what the work gives them, never a fault invented for it. Everything else on the page (What's Included, block 5, the steps, the FAQ slots, the symptom question) is the type A entry's. There is no emergency variant to win over it. H2: Is [SERVICE] Right for Your Home?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|
| The room you're about to redo | how the room is used: wet or dry, walked on or looked at | The customer's situation: a bathroom, a shower room, a kitchen, a hall or a patio being refitted, the old finish still up, the tiles chosen or nearly. What decides it: how the room is used, from the Table A row for this service: a shower wall that is wet every day needs a waterproof layer under the tiles and silicone where it meets the tray; a kitchen wall behind the hob needs a surface that wipes clean, taken up to the units rather than stopped in a strip; a hall floor takes grit and wheels; a patio takes frost and has to shed rain; a fireplace takes heat, with the hearth done as its appliance needs; a pool shell is tested watertight before a tile goes near it (the Swimming pool page, on confirm only). What the work gives them: the layer underneath chosen for that use and the tiles fixed so they stay. Never a fault invented for a new room, never the finish sold on its own: the use, not the look. |
| What the price difference buys | the layers under the tiles that nobody sees once it is done | The customer's situation: they have a cheaper quote, or have thought about doing it themselves, and want to know what the difference pays for. What decides it: the layers they will never see once the grout is in: the board or the floor made ready, the waterproof layer in a wet area, adhesive over the whole back of every tile rather than dabs, room left to move at the corners and across a big floor (the Table A stages for this service and the Table E solid bed, tanking and movement rows). That is where a quick job cuts corners and where it shows a year or two later as hollow tiles, dark corners or a crack along a line. What the work gives them: those layers done as the rows name them, so the surface stays put. One specific from the stages for this service; no figure the rows do not give; never a dig at another trade. |
| Which tile suits the room | the room, the wear and the care deciding the tile | The customer's situation: they are weighing two or three options (porcelain against ceramic, stone against a stone look porcelain, large format against a standard size, a splashback to the underside of the units against a strip at worktop height, mosaic against a plain tile, reproduction pieces against salvaged ones on a period floor). What decides it: the room's use and wear, whether it is wet or outside, the weight the wall can carry, slip where the floor gets wet (never a rating as proof: the Table E slip row), and how much looking after they want, since some stones need sealing and the right cleaner (the Table E stone rows), from the Table A materials cell for this service. What the work gives them: the option that suits their room, never the one that is best in general. A named product only from [CV: materials_methods]. No claim about lifespan or cost unless the rows or the client values give it. |
| What it will need from you afterwards | what the tiles, the grout and the seals need through the years | The customer's situation: they want to know what they are taking on once the job is done. What decides it: what the tiles, the grout and the seals need, from the Table A and E rows for this service: grout lets a little water through and dries out between uses, so a shower is aired and the corners watched; silicone is renewed when it comes away rather than grouted over; some stones are resealed on a timetable that depends on the stone, the product and the use (never an interval: the Table E stone sealing row) and are never cleaned with anything acidic; a heated floor is brought up to temperature gradually; outside, the joints and the drainage are kept clear so water does not sit and freeze. What the work gives them: an honest picture of what it saves them and what it does not. Never a promise about how it will look or last; a return visit or aftercare only where the services list or the confirmed practices (aftercare_advice) have it. |

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (the problems the town's homes have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the niche steps. The briefs are town wide, not per category: the pack's section 3 says housing era decides the substrate and the substrate decides the method, so every card is an era or water anchor tied to what it changes in the work, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED). No seasonal swap and no symptom question on a location page. The type is the client's. Placeholders: `[WORK]` the work noun (Tiling), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town. The copy rules of CORE (18) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's or Act's name, nothing about what is inside anyone's home today.

- A niche with no section here has its location pages refused: "no location block briefs for tiling".

### Type A (project trade: the client's type is A)

The pack's section 3 rules carried into every card: an era "was built with" its floors and plaster, never "has"; every anchor changes the work or is left out; no claim that bathrooms or kitchens in a town are dated; no water hardness figure the research does not give.

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Floors that flex in the older streets | timber floors on joists from the era the older streets were built in | Tiles that crack along a line, grout that breaks up, a hall floor that bounces. The one cause this card makes: timber floors on joists and lime plaster, from the era the town's older streets were built in, which the town profile dates; 'were built with', never 'have', and never the state of anyone's bathroom today. Tie the era to what it means for the work and nothing else: a timber floor stiffened or overlaid before tiles go down, an adhesive chosen for a floor that moves, a decoupling layer as one option, and a lime plastered wall checked for the weight it can carry (the Table A floor stages and the Table E rows, with no figure). Not a floor that moves under rigid tiles as the cause: the category page owns that; here the cause is how the era built. |
| Period hallways with pieces missing | damp and salts moving up through a floor laid on the ground | Loose or missing pieces in a geometric hall floor, white salts that keep coming back, a hall that feels damp underfoot (the Table B period floor signs). The one cause this card makes: a floor laid straight on the ground in the era the town profile gives, with damp and salts moving up through it; an era claim (built with such floors), never that the hallways are in a state. What it means for the work, from the Table A and E period floor rows: sound pieces kept, lifting only where there is a reason, compatible replacements and a bedding that suits the original, and no sealer that traps the damp in. Where the home is listed, consent before the floor is altered, as 'usually' and never the Act's name. Not a tile cracked by a knock: the repair pages own that. |
| New estates settling in their first years | plasterboard walls and chipboard floors drying out and settling after the build | Hairline cracks in grout, a tile gone hollow in a bathroom a few years old, a floor tile that rocks. The one cause this card makes: the plasterboard walls and chipboard floors the newer estates were built with, which dry out and settle after the build (the town profile gives the estates). What it means for the work: the weight a plasterboard wall can carry before it needs a board over it (the Table E plaster and plasterboard row, no figure), a chipboard floor overlaid or decoupled before tiles, joints left where the floor needs them. Never a judgement on the builder or the homes. Not adhesive in dabs: the service pages own that. |
| Hard water marking the grout | limescale from the town's water settling into porous grout and on glass | Grout lines that go pale and rough, a shower screen that will not come clean, dark corners that come back. Only where the town profile gives the water hardness from the supplier's data; otherwise the card reads as flats and their leases (some leases restrict hard floors or ask for a sound deadening layer under them, from the profile only). The one cause this card makes: limescale from the water settling into grout that lets water through, and on glass. What it means for the work: the grout chosen with that in mind (a resin grout as one option from the Table A regrouting cell, never a brand), silicone kept sound, and the aftercare that goes with it. Never a hardness figure the research does not give. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Flats, stairs and the lease | Where the town profile gives a high share of flats: tiles, boards and bagged adhesive carried up by hand, a skip that has to sit on the road (the skip firm's permit, said plainly), and a lease that asks for a sound deadening layer under a hard floor. Say why each adds time or a stage; no figure. |
| What the houses were built with | Lime plaster and timber floors in the older terraces mean more preparation before a tile goes on; plasterboard in the newer homes decides what it can carry (the profile for the era; the Table A and E rows for what it means). Said as what the work meets, never as the state of the homes. No figure. |
| Old floors that need a test before they come up | In older homes an old floor covering, and the dark adhesive under it, can be the kind that is tested before it is lifted (the Table C and E asbestos rows); if the test is positive the removal follows the safe method, which adds time and cost. Said plainly and never casually; no year or figure. From the profile where it gives the housing era. |
| Patios on exposed ground | Outdoor tiling on an exposed site waits for weather clear of frost, needs a base and falls that shed water, and a tile declared for outside (the Table A and E outdoor rows). From the profile where it gives the exposure; only where the client has an outdoor page. No figure. |

**Steps.** The niche steps (Tell Us About the Job; We Check the Room and Price the Job; We Start on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (what the houses were built with, flats and access, what has to come off first) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at, what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Can tiling be done at any time of year in [TOWN]? | Indoors, yes, subject to what has to dry first (the Table A timing cells: new plaster and a new screed, a tanking layer, the adhesive before grouting, with the waits as the Table E rows give them). Outdoor tiling waits for weather clear of frost and for the base to cure; where the town profile gives the exposure, say what it means for a porcelain patio. No dates, no promise about the weather, nothing about being busy. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

Things a brief wanted that neither the calibration pack nor the trade facts pack gives. Each brief says "from the trade facts rows only" or leaves the point out until one of these is answered.

1. **No duration for any job.** Table A says "varies; no standard" for all twelve services and Table G confirms no range was found. Every timing brief gives what decides it and the waits the Table E rows carry (new plaster, new concrete, the adhesive before grouting, a heated screed's commissioning), and no number of its own. The onboarding questions ask the client for a typical duration for three jobs.
2. **The figures the facts do carry.** Table E gives the plaster and plasterboard weight limits, the movement joint spacing and width, the heated floor bay size, the solid bed tile size, the front garden area and the waits before grouting and after new plaster or concrete. None is written into a brief: `validate-v20.js` NUM blocks a digit the client values or the research do not carry, and a figure on a page reads as a rule. Every brief points at the row instead. If Ray wants a figure on a page it comes through the verified pack and a decision on NUM.
3. **The trade facts pack is unverified.** `trade-facts/tiling.md` says "verified: no". The service page gate (`trade-facts/store.js serviceGate`) refuses the service run until it is verified; the briefs point at the rows regardless. Table G also records that the universal wet room fall, the universal flexible adhesive rule, the universal stone resealing interval and the "dust free" removal claim were all dropped; no brief carries any of them.
4. **Desire led pages.** The pack's section 2 names the desire led services in its own words, and the library flags exactly those targets: Bathroom and shower tiling, Kitchen tiling and splashbacks, Feature wall and hearth tiling, Floor tiling, Natural stone tiling, Outdoor and porcelain paving tiling and Swimming pool tiling (page rows and aliases alike, since a flag belongs to its target). Wet room tiling and tanking stays problem led because the pack lists it under "wet room tanking after a leak" and not under desire led, although a wet room is as often a refit as a repair; Victorian and period floor tiling stays problem led ("missing or loose tiles"). Ray can flip either in `tiling.csv` without a code change.
5. **Who does what around the tiling.** A tiler's job touches an electrician (underfloor heating in a bathroom, Table C Part P), a plumber (the drain in a wet room, Table C Part H) and an asbestos test (Table C regulation 5). The briefs write each as a stage or a rule that usually applies and never as this client's practice. Ask each client who arranges them; `practices.json` has no key for an asbestos test arranged, a heated floor tiled over, or a drain moved, so until it does the copy says they are agreed with the customer and nothing more.
6. **Supply and fit.** Table E notes supply and fit work still carries the service rights, and the pack bans claims not confirmed. No brief says the tiles are supplied; the scope FAQs say "only from the client values". There is no client value for it yet; the onboarding question asks.
7. **Tanking systems and certificates.** The pack's section 7 bans a waterproofing system, a tanking certificate or a guarantee stated as this client's practice when not confirmed. The briefs name tanking as a stage of the work (Table A) and a system only from [CV: materials_methods]; a system's warranty only from [CV: manufacturer_warranty]. Ask each client which system they use and whether its warranty is one they can pass on.
8. **Waste.** Table C says tiling rubble taken away is business waste and the carrier needs upper tier registration; Table G says the waste is not automatically inert. The briefs say the rubble leaves only from the waste_removal practice; nothing says it is inert or how it is classified. Ask whether the client holds the registration ([CV: waste_carrier_registered]).
9. **The repair customer's cover.** The cover chain tries a guarantee, then a manufacturer warranty, then insurance. A regrout or a one tile swap rarely carries a guarantee, and the facts say grout has no fixed lifespan (Table E). The fallback cover FAQ ("what happens if something isn't right") carries those pages; Ray decides whether a repair page should show any guarantee the client holds for new work.
10. **Hard water.** The pack's section 3 says water hardness from the supplier's published data is a strong anchor and that a figure the research does not give is never named. The location card reads it only where the town profile carries the hardness, and falls back to flats and leases otherwise. The town research does not yet collect water hardness; until it does the card will usually take its fallback.
11. **Asbestos and the year.** The pack's example FAQ and Table E's asbestos row give a date before which old floor tiles and bitumen adhesive are suspect. No brief carries the year: it is a figure, and on a town page it reads as a claim about the houses. The briefs say "older homes" and "tested before it is lifted"; the service page's own Table C row supplies the rest on the day.
12. **Swimming pool tiling.** A different job from domestic tiling (the pack's notes). The library marks it confirm only; the desire variant mentions the pool shell only as the situation of a shell tested watertight (Table A). No brief says what a pool test involves: Table G says no single test or duration was established.
