# Niche Library Entry: Builder

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/builder.json`; this file is the human copy of it, kept in the same commit. The model never sees the slot names, only the resolved words.

Business type is **A (project trade)** for every category. The Builder Calibration Pack v6, section 2, assigns A to all ten categories in its table; Remodeller and Property Developer are not in the table and take the client's type, A by default. There is no type B: a builder whose work is all repairs and maintenance is still A and reads the problem led and schedule led lines in the briefs. Big ticket is on (extensions, lofts, new builds), so `[CV: handles_planning]` switches the homepage planning FAQ in.

Sources, in the order the README gives: `calibration-packs/Builder_Calibration_Pack_v6.md` (sections 1, 2, 4 and 7), `trade-facts/builder.md` (Tables A to G, unverified at 4 Nov 2026), `niche-library/builder.csv` and `builder-categories.csv`, `fillout/services/builders.json` (the twelve category tabs).

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Building / building |
| trade_person / trade_person_plural | builder / builders |
| homepage_keyword | Builder (4 Nov 2026, Brandon: the homepage keyword is a way of saying the primary GBP category, picked on search volume; the H1 research pattern and the thin runner read it) |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | no (builder.csv flags no page emergency; no emergency variant, no steps_emergency, final_h2_emergency null) |
| big_ticket | yes (house extensions, loft conversions, new build homes) |
| schema_subtype | GeneralContractor (schema.org's subtype of HomeAndConstructionBusiness; do not invent another) |
| seasonal_trade | no (the pack does not call the trade seasonal; Table A says year round, with exposed stages depending on weather; no seasonal swap anywhere) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| house, home, extension, loft, garage, kitchen, bathroom, back wall, knock through, steel beam, foundations, roof, crack, damp, plans, building control, planning permission, party wall, the neighbours, skip, scaffolding | dwelling, property, premises, fabric, envelope, substrate, formation, load path, habitable, curtilage, principal elevation, thermal element, means of escape, dutyholder, programme, remodel, remodelling, drywall, baseboard (words_avoid_exceptions: property is allowed inside a page name the library gives it, Property refurbishment and Property repairs and maintenance, and in the link text to those pages) | dream home, home of your dreams, forever home, transform your home, transform your space, bring your vision to life, turn your vision into reality, the home you've always wanted, unlock the potential, unlock your home's potential, add value to your home, increase the value of your home, no job too small, one stop shop, turnkey, signs you need an extension (the pack's section 7: lifestyle language and symptoms invented for desire led services) |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about the job and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about the job and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency page) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About the Job**
   Brief: how to get in touch and what is useful to send first (the house and what they want done, rough sizes, drawings if they already have them, photos of the room or the wall). No promise of a reply time unless [CV: response_time] is set.
2. **We Visit and Price the Job** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the visit and what gets looked at on site: the ground where it can be seen, where the drains run, how a skip and the materials get in, whether the job touches a wall the neighbour shares, and what the planning position looks like for that house (looked at on the day, never settled on the day). Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it). Never a free survey, a fixed price or a start date.
   Without the practice (`step_2_no_visit`): **We Price Your Job**
   Brief: a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **We Start on a Date That Suits You**
   Brief: the start date is agreed in advance, to suit the customer. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it). No finish date, duration or week by week plan: the trade facts give none. One line on the order of work only as a principle (the house stays closed to the weather until the new part is ready to be joined to it), never as this business's timetable.

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer warranty → insurance (a new build's structural warranty, NHBC Buildmark, LABC Warranty or Premier Guarantee, goes in [CV: manufacturer_warranty] and is written as the policy it is, never as approval of the work) |
| fears (in order, one per Why choose us point; the pack's section 1, the project customer) | 1. costs that appear once the walls are open and the job is half done; 2. a build that runs months past the date they were given; 3. a builder who disappears to another site halfway through; 4. work that fails its building control inspection, or was never signed off at all |
| fears_by_type | empty: the pack assigns no type B, so every client reads the shared fears |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies:** FMB (Federation of Master Builders), TrustMark, CIOB (Chartered Institute of Building: an individual's grade, never the firm's), NHBC registered builder (new build clients only).
- **Tier 2, specialist bodies and policies:** PCA (Property Care Association: damp and waterproofing work), BiKBBI (kitchen and bathroom installers), NICF or CFA (flooring), Guild of Master Craftsmen, LABC Warranty, Premier Guarantee or NHBC Buildmark (a new build's structural warranty, shown as the policy it is and never as approval of the work), QANW or HomePro (an insurance backed guarantee, only where the client holds one).
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards: Ray's call per client. Gas Safe, NICEIC, NAPIT, FENSA, CERTASS and HETAS belong to whoever is registered for that work; shown only when the client itself is registered for that scope, never for a subcontractor's registration.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure from [CV: insurance_cover] and what it means for the customer if something is damaged during the job. Never what it pays or who it covers. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or a warranty is confirmed. Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. A new build's structural warranty from [CV: manufacturer_warranty] as the policy it is, never as approval of the work. An insurance backed guarantee only where the client holds one. Described, never promised. | no | Trust |
| faq_3_none | What happens if something isn't right after the job? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. Where the work was inspected by building control, the completion certificate is a record that the work was signed off, never a guarantee against a later defect. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. Never a finish date. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does an extension or a conversion take? | No duration: the trade facts give none for any job (Table G). Give the stages instead, in order and as the reason the time is what it is: the approvals before anything starts, the foundations dug and looked at by building control before any concrete goes in, the shell and the roof, first fix, plaster, second fix, the final inspection. Then what moves it: the ground, steel, drains, the weather on the exposed stages, plaster drying before decoration. A number only from the client values. | no | Timing |
| faq_B | Why does a crack in my wall keep coming back? | Use the assigned symptom's meaning and its linked local issue. Say first what is normal (hairline cracks on shrinkable ground that widen in a dry spell and close up once the ground is wet again) and then what is not (a crack that widens each year, one that splits the bricks and not just the joints between them, a door that has started to bind, a floor that slopes). Three genuinely different causes in plain words: ground under the foundations that shrinks and swells, or has been softened by a leaking drain or dried by a tree; a lintel or a beam over an opening that has dropped; filler moving over a joint between old work and new. Then what the local ground adds, then what finding the cause involves (an engineer's look, monitoring where the movement is in doubt) before any repair is sold. Never underpinning as the default answer, never a verdict on whether the house is safe. | **yes** | Process |
| faq_C (fallback) | Planning permission or building regulations: which does my job need? | Two approvals, kept apart, from the trade facts rule rows. Planning asks whether a thing may be built at all: how big, how high, how it looks from the street and what it does to the neighbours. Building regulations ask whether the work is sound and safe once built: the structure, the foundations, the way out in a fire, the insulation, the drains and the ventilation, with building control looking at the stages and issuing a completion certificate at the end. An extension on one floor behind the house, a loft kept within the roof's shape and a garage converted within its own walls usually need no planning application and still need building regulations approval. Telling the neighbours about work on a shared wall is a third thing, separate from both. "Usually" throughout; never an Act's, an order's or a document's name; no figure. | no | Process |
| faq_D (fallback) | Can we stay in the house while the work is done? | The order of work as the reason, from the trade facts stages: the new structure goes up and is made weathertight first and the wall into the existing house comes down last, so the house stays closed to the weather for most of the build; a loft is reached from the scaffold outside until the stair goes in; a kitchen or a bathroom is out of use between strip out and second fix. Written as the principle, never as this business's timetable. What the business does for the household (a temporary kitchen, dust screens, a site toilet) only from confirmed practices. No duration. | no | Process |
| faq_planning (big ticket, only if [CV: handles_planning] confirmed) | Will my extension or loft need planning permission? | Point at the trade facts rule rows (Table C) and write what usually applies, with "usually" or "in most cases": an extension on one floor behind the house, a loft with a rear dormer or rooflights that keeps the roof's shape, and a garage converted within its own walls usually fall within what a house may do without an application; a second floor added on top, building out beside the house or round the corner of it, a dormer facing the road, every extension to a flat, and a home in a conservation area or on an estate where the council has taken the allowance away are more likely to need one; a certificate from the council is the usual way to confirm that a job needs none. The building regulations side is a different question: an extension or a conversion goes through building control whether or not planning was needed. What the customer does about it only as the row gives it; what this business arranges only from [CV: handles_planning]. No figure, no depth, height or volume, never an Act's or an order's name; never that a job will or will not need permission before the house has been seen. | no | Process |

Sources for faq_A to faq_D: the pack's section 1 fears and section 6 question posts (planning, what building regulations cover, whether a crack is serious, living through a build), reworded. Replace with real customer questions when Brandon or the client supplies them.

### Type B homepage overrides (faq_slots_by_type)

Empty. The pack assigns every category type A, so no client reads an override. If a maintenance only builder ever arrives, Brandon decides whether the problem led lines in the type A briefs serve or the entry needs a B section.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Walls and structure: brick and block cavity walls / timber frame / steel beams and lintels / lime mortar on older walls
- Foundations: strip foundations / trench fill / piled or engineered foundations / underpinning
- Roofs: pitched roof, tiled or slated / flat roof in fibreglass / flat roof in rubber / flat roof in felt / rooflights
- Lofts: rear dormer / hip to gable / rooflight conversion / mansard
- Damp and below ground: injected damp proof course / tanking / cavity drain membrane with a pump
- Kitchens and bathrooms: rigid units / flat pack units / laminate worktops / quartz worktops / granite worktops / timber worktops / tiled walls / wall panels / wet room tanking
- Floors: carpet / laminate / LVT / engineered wood / solid wood / resin / polished concrete / floor tiles
- Decking: softwood / hardwood / composite
- Other: drawings arranged / structural engineer arranged / building control application made for you / party wall notices handled / skip and scaffold arranged / waste carrier registered

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged. Approvals (planning permission, building control, party wall) are deliberately not in this list: they are rules the copy explains, not services the client sells.

house extension, extensions, single storey extension, two storey extension, side return, wraparound extension, loft conversion, dormer, hip to gable, garage conversion, basement conversion, barn conversion, porch, conservatory, orangery, garden room, outbuilding, new build, new build homes, design and build, refurbishment, renovation, property repairs, maintenance, listed building, heritage work, insurance repair, disability adaptations, demolition, strip out, structural alterations, steel beam, RSJ, knock through, open plan, structural repairs, underpinning, foundations, footings, groundworks, concrete base, slab, brickwork, blockwork, masonry, repointing, pointing, damp proofing, damp proof course, tanking, waterproofing, roofing, re roof, plastering, drylining, skimming, painting and decorating, tiling, patio, kitchen fitting, kitchen design, worktops, kitchen doors, refacing, bathroom fitting, wet room, bath installation, bath resurfacing, shower resurfacing, joinery, bespoke carpentry, first fix, second fix, fitted wardrobes, fitted shelving, staircase, skirting, architrave, carpet fitting, laminate flooring, LVT, wood flooring, floor sanding, floor repairs, resin flooring, polished concrete, decking, composite decking, decking repairs, decking restoration, pergola, commercial building, shop fitting, office fit out

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| crawl space, pole building, metal building, steel building, tv mounting, fan installation, fan repair, road construction, furniture assembly, gutter cleaning, appraisals, tiny home, prefabricated, commercial machinery, civil engineering, outdoor kitchen, patio enclosure, water fixture, plumbing, electrical, a/c | (never named) |
| home addition, home extension | house extensions |
| basement remodel | basement conversions |
| basement waterproofing, waterproofing, foundation drainage | damp proofing and waterproofing |
| water and moisture | damp proofing |
| custom home, home building, new building construction, new construction, country home, luxury home | new build homes |
| accessory building | garden rooms and outbuildings |
| foundation, steel pier | foundations and underpinning |
| concrete | concrete bases and groundworks |
| excavation | groundworks |
| demolition | demolition and strip out |
| structural repair | structural repairs |
| repairs and maintenance, general repairs, home repairs | property repairs and maintenance |
| remodel, renovation, refurbishment, interior finishing | property refurbishment |
| drywall | plastering and drylining |
| tile work | wall and floor tiling |
| interior decorating, exterior painting, painting | painting and decorating |
| patio | patios |
| roof | roofing |
| masonry | brickwork and masonry |
| project management, construction management, building design, architectural design, blueprint, exterior design | design and build |
| commercial projects | commercial building work |
| garage design and building, garage construction, garage design | garage construction |
| kitchen cabinet door | kitchen door replacement |
| cabinet refacing, cabinet refinishing | kitchen door replacement and refacing |
| kitchen cabinet design, kitchen design | kitchen design |
| worktop | kitchen worktops |
| kitchen cabinet, custom kitchen | kitchen fitting |
| bathtub installation | bath installation |
| bathtub replacement | bath installation and replacement |
| bathtub, shower refinishing, bathroom worktop resurfacing, tile reglazing | bath and shower resurfacing |
| wardrobe | fitted wardrobes |
| shelving | fitted shelving and storage |
| staircase | staircases |
| finish carpentry, trim carpentry | second fix carpentry |
| rough carpentry | first fix carpentry |
| cabinet, custom carpentry | bespoke carpentry and joinery |
| carpentry | carpentry |
| baseboard | skirting boards and architrave |
| carpet, stair flooring | carpet fitting |
| laminate | laminate and LVT flooring |
| epoxy, floor coating | resin flooring |
| concrete floor polishing, concrete staining | polished concrete floors |
| wood floor refinishing, wood floor sanding, wood floor restoration, floor refinishing, floor polishing | floor sanding and restoration |
| wood floor repair, floor repair | floor repairs |
| wood floor | wood flooring |
| marble floor, tile floor, ceramic tile | wall and floor tiling |
| composite deck | composite decking |
| deck repair, deck railing | decking repairs |
| deck cleaning, deck refinishing, deck painting, wood staining | decking restoration |
| deck | decking |
| pergola | pergolas |
| porch | porch extensions |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). A card never leads with a specialist service unless it is in jobs_wanted. A service listed under one category goes in that category's card, never another card. JSON slot: core_services, keyed by the Fillout tab name in lower case.

- Building Firm: house extensions, loft conversions, garage conversions, property refurbishment, property repairs and maintenance, design and build
- Construction Company: new build homes, foundations and underpinning, structural repairs, property refurbishment, demolition and strip out, concrete bases and groundworks, patios
- Contractor: basement conversions, property repairs and maintenance
- General Contractor: design and build, commercial building work, brickwork and masonry, property repairs and maintenance, property refurbishment, painting and decorating
- Remodeller: property refurbishment, bath and shower resurfacing
- Property Developer: new build homes
- Home Builder: house extensions, garage construction, new build homes, design and build, roofing, damp proofing and waterproofing
- Kitchen Renovator: kitchen fitting, kitchen design, kitchen worktops, kitchen door replacement and refacing
- Carpenter: bespoke carpentry and joinery, fitted wardrobes, fitted shelving and storage, staircases, first fix carpentry, second fix carpentry
- Flooring Contractor: wood flooring, laminate and LVT flooring, carpet fitting, wall and floor tiling, floor sanding and restoration, floor repairs, resin flooring, polished concrete floors, skirting boards and architrave
- Bathroom Renovator: bathroom fitting, wet rooms, bath installation and replacement, bath and shower resurfacing
- Deck Builder: decking installation, composite decking, decking repairs, pergolas, porch extensions

Service words for the whole job rather than one service: building work, extensions, conversions, renovations, refurbishment, new builds, design and build, general building. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: damp, subsidence, cracks. When an FAQ question names the job as well as the problem ("Do I need underpinning for these cracks?"), it goes to the job's page, not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list is in niche-library/practices.json (shared by all niches). The briefs here lean on: site_visit_before_quote, price_agreed_before_work, and [CV: handles_planning] (whether the business makes the planning and building control applications and serves party wall notices on the customer's behalf). Anything the business does for the household during a build (a temporary kitchen, dust screens, a site toilet, holding the certificates) is written only when confirmed.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every building client for:
- a "from" price for 3 typical jobs (e.g. a single storey rear extension, a garage conversion, a bathroom);
- a typical duration for the same 3 jobs (the trade facts give none);
- whether quotes are written, and whether the price is fixed once agreed;
- whether they handle planning applications, building control applications and party wall notices, or work to the customer's architect and engineer ([CV: handles_planning]);
- which structural warranty, insurance backed guarantee or trade body they hold, so the cover FAQ and the logo strip can be verified;
- team size, who is on site day to day, and which trades are subcontracted (electrics, gas, plumbing).

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Local Experience Behind Every Build**
2. Cover → **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]", keyed by the Fillout tab name in lower case: building firm → building work, construction company → construction work, contractor → building work, general contractor → building work, remodeller → renovation work, property developer → new build work, home builder → home building, kitchen renovator → kitchen fitting, bathroom renovator → bathroom fitting, carpenter → carpentry, flooring contractor → flooring, deck builder → decking. The briefs use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above) and the FAQ slots. No seasonal swap: `seasonal_trade` is off. Placeholders: `[CAT]`, `[CAT_LOWER]`, `[WORK]`, `[WORK_LOWER]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises, never an Act's, an order's or a document's name.

- `seasonal_trade`: no
- `category_types`: empty. Every Fillout tab is type A (the pack's section 2); Remodeller and Property Developer take the client's type, A by default.
- A niche with no section here has its category pages refused: "no category block briefs for builder".

### Type A (project trade: every category)

The pack's section 2 split inside type A: desire led services (extensions, conversions, new builds, design and build, garden rooms, conservatories, porches, kitchens, bathrooms, wet rooms, fitted joinery, staircases, new floors, decking, patios, adaptations) are written as the customer's situation; problem led ones (structural repairs, foundations and underpinning, damp proofing and waterproofing, property repairs, insurance repairs, floor and decking repairs, resurfacing) as symptom, cause, consequence; schedule led ones (repointing, the maintenance side of property repairs) as what slips and when. Block 4 below is a mix: cards 1 and 4 are situations, cards 2 and 3 symptoms, and every brief says how it reads on each category's page, so a Kitchen Renovator page is never briefed on foundations.

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A house the family has outgrown | rooms laid out for a smaller household | A situation card, not a fault: a kitchen made for a couple with the whole household in it and the table in the front room, a third child and two bedrooms, an office on the landing, a garage that holds everything except the car, a loft nobody can get to. What decides it: what the house already has to give (a garden to build into, a roof with the height for a room, a garage with sound walls, a cellar, an alcove) and the planning position for that house from the trade facts rule rows, said with "usually": an extension on one floor behind the house, a loft kept within the roof's shape and a garage converted within its own walls usually need no application; a second floor added on top, an addition beside the house or in front of it, a flat, or a home in a conservation area is more likely to need one; never a figure, an Act or an order. What the work gives them, in plain words: the room, the layout, the stair. By category: Building Firm and Home Builder read it as the extension, the loft and the garage; Construction Company as the refurbishment or the new build; Contractor as the cellar; Kitchen Renovator and Bathroom Renovator as a layout that does not work; Carpenter as the awkward alcove and the unused corner; Flooring Contractor as a new floor for a room that has changed its use; Deck Builder as a garden with nowhere level to sit. Never a lifestyle pitch, never a fault invented for it. |
| Cracks that keep coming back | ground or a beam still moving under the wall | Problem led: a crack that was filled and has opened again, a door that has started to stick, a step in the brickwork at a corner. Say first what is normal on shrinkable ground (hairline cracks that widen in a dry spell and close up once the ground is wet again, from the trade facts and the town profile) and then what is not: a crack that is wider at the top than at the bottom, one that splits the bricks and not just the joints between them, one that steps away from a window corner, a floor that has started to slope. The one cause this card makes: something under or over the wall still moving (a foundation on ground that shrinks, a drain leaking into it, a tree drying it, a lintel or a beam that has dropped), so a filled crack opens again. Say what finding the cause involves from the trade facts stages (an engineer's design before any repair, monitoring where the movement is in doubt) and that a patch over the crack is not a repair; never underpinning as the default answer. By category: Construction Company and General Contractor read it in foundations, structural repairs and brickwork; Flooring Contractor as a floor that slopes or bounces, read from the subfloor; Carpenter as a stair or a door frame that has moved; Kitchen Renovator and Bathroom Renovator as units or tiles cracking over a wall or a floor that moves; Home Builder and Building Firm as the wall an extension will tie into. Never a verdict on whether a house is safe. |
| Damp that comes back after it was treated | rain reaching the wall from outside, read as rising damp | Problem led: a tide mark low on a wall that was injected and replastered and has marked again, mould in a corner, a musty cellar, paint peeling at the skirting. Say first what is normal (condensation on a cold wall in winter in a room that is not aired, which clears with heat and ventilation) and then what is not (a patch that stays wet through summer, plaster that sounds hollow and blows). The one cause this card makes: rain reaching the wall from outside and being read as rising damp (pointing that has gone, a leaking gutter or downpipe, a path or a flower bed built up over the old damp course, a bridged cavity), so a chemical course does nothing for it. Say what finding the source involves from the trade facts stages (the source diagnosed first, leaks and bridging put right, then the right treatment for what is left) and that an injected course is for confirmed rising damp only; below ground, that a cellar is kept dry by a designed system with a drain or a pump that needs looking after, never by a coat of paint. By category: Construction Company, Contractor and Home Builder read it in cellars, basements and waterproofing; General Contractor in the pointing and the brickwork; Bathroom Renovator and Kitchen Renovator as a stain on the ceiling below a bathroom or a swollen worktop joint, water from a seal that has failed; Flooring Contractor as boards that cup or a floor that lifts over a wet subfloor; Carpenter as skirting or a frame that has swollen; Deck Builder as a joist soft where it sits on wet ground. Never a product by name, never a treatment sold by default. |
| Worn out, but not worth ripping out | what is underneath deciding whether a facelift holds | A situation and a decision in one: kitchen units that are sound with doors scratched and hinges that sag, a bath with a chipped surface, a floor with a worn finish over good boards, a staircase that creaks, a brick wall with its pointing gone but its bricks sound. What decides it: whether what is underneath is sound (the carcasses square and dry, the bath supported, the boards and joists firm, the stair's strings and treads, the bricks themselves), from the trade facts signs row and the done badly row. What the work gives them: new fronts on sound carcasses, a resurfaced bath, a floor sanded and refinished, a stair re fixed, a wall repointed in a mortar softer than the brick; or, where what is underneath has gone, the honest answer that a facelift will not hold (a coating peels where the old finish was not removed, new doors bind on carcasses out of square, a patch over a failed subfloor moves, hard cement pointing on an old soft brick makes the brick face flake instead). By category: Kitchen Renovator reads it as doors and worktops; Bathroom Renovator as resurfacing against replacement; Flooring Contractor as sanding against a new floor; Carpenter as the stair and the joinery; General Contractor as the brickwork; Building Firm, Construction Company, Contractor, Remodeller and Home Builder as the refurbishment that keeps the sound parts; Deck Builder as boards replaced on a sound frame, or a frame that has gone. Never a judgement on the home's state. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How much is being built or fitted | Size moves the price more than anything else: the floor area and the number of storeys of an extension, the number of rooms in a refurbishment, the length of a kitchen run, the square metres of a floor or a deck. More foundations, more wall, more roof, more days. Say it plainly and give no figure. |
| What is already there | What has to come out, be dug through or be worked round before the new work starts, from the trade facts price rows: the ground where the foundations go (clay, made ground, water, roots) and what building control asks to see before concrete goes in; drains that run where the extension will stand; an old slab; walls and floors out of true; a wet subfloor or an old coating under a new floor; an older home checked for asbestos in what will be disturbed before it is stripped; and how the skip, the scaffold and the materials get in (a terraced street, a shared side path, everything carried through the house). Say the business looks before it prices, from [CV: quote_method] only, and that what lies below the garden is only seen for certain at the dig. |
| Steel, services and sign offs | The hidden work and the people it brings in, from the trade facts price rows and rule rows: a steel beam and the opening it holds up, foundations an engineer has to design, drains moved, electrics and plumbing run by someone registered to sign them off, the building control fee and its inspections, a surveyor where a shared wall comes into it, drawings. Each adds a professional, an inspection or a wait. Which of them this business arranges only from confirmed practices and [CV: handles_planning]. By category: Kitchen Renovator and Bathroom Renovator read it as moving the services and the electrical certificate; Flooring Contractor as levelling and underfloor heating; Deck Builder as a raised deck's supports and its guarding. No figure. |
| The finish you choose | Units, worktops, tiles, flooring, glazing, doors and the roof covering: the options from the trade facts materials cells and [CV: materials_methods], and why one costs more than another (a stone worktop is templated and fitted by its own fitter, a tiled wet room is tanked under the tiles, a hardwood deck against a softwood one). A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (how much is being built, what is already there, the structure and services it needs) and how the quote is given, from [CV: quote_method] only. Say that what is found once the work is opened up is the reason a builder looks first, never a promise that the price cannot change. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. A completion certificate from building control is a record that the work was signed off, never a guarantee. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What does your [WORK_LOWER] work include? | The jobs themselves, named from the card list, and the size of job taken on, from the services list and [CV: typical_jobs] only. Link one service page. Design, drawings, structural engineering and planning applications only where [CV: handles_planning] or the confirmed practices say so; otherwise say those come from the customer's own architect or engineer and the builder works to them. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at on site (the ground where it can be seen, the drains, the access, whether a shared wall comes into it, what the planning position looks like for that house), what comes back. Approvals handled on the customer's behalf only from [CV: handles_planning]. No timescale unless [CV: response_time] is set. | Process |
| timing | always | How long does [WORK_LOWER] usually take? | No duration: the trade facts give none (Table G). The stages in order as the reason the time is what it is (approvals before a start, the foundations inspected before concrete, the shell made weathertight, first fix, plaster and its drying, second fix, the final inspection) and what moves it (the ground, steel, drains, the weather on the exposed stages). By category: Kitchen Renovator, Bathroom Renovator, Carpenter and Flooring Contractor read it as strip out, first fix, the fit, the finishes and the curing or drying the products need. A number only from the client values. Nothing about when the job can start unless [CV: start_time] is set. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom is one that can be normal (fine cracks on clay in a dry spell, condensation on a cold wall in winter, a hairline crack in new plaster as it dries), say first when it is normal and then what is not, before anything else. Then the usual cause here in plain words, what the local ground or housing adds, what finding the cause involves, and what the business does about it. Never the biggest fix by default. One figure at most. | Process |

**Seasonal swap:** none (`seasonal_trade` is off).

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (signs you need it) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above) and the FAQ slots (cost, timing, cover, rules, scope). No seasonal swap. The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type A entry serves an extension, a wet room and a staircase alike. Placeholders: `[SERVICE]`, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number, no Act's name.

- A niche with no section here has its service pages refused: "no service block briefs for builder".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type A (project trade: every page)

Three framings share this one entry, per the pack's section 2: a problem led page (structural repairs, foundations and underpinning, damp proofing and waterproofing, property repairs and maintenance, insurance repair work, floor repairs, decking repairs, bath and shower resurfacing, roofing, brickwork, plastering, decorating, tiling, structural alterations) uses block 4 below as written; a schedule led page (repointing within brickwork, the maintenance side of property repairs) reads the "on a schedule led page" line in each brief, what slips and when; a desire led page (the library's `desire_led` column, 33 targets: extensions, every conversion, garage construction, porches, conservatories, garden rooms, new build homes, design and build, property refurbishment, disability adaptations, patios, kitchens, worktops and doors, bathrooms, wet rooms, bath installation, bespoke joinery, wardrobes, shelving, staircases, carpet, laminate and LVT, wood, resin and polished concrete floors, decking installation, composite decking, pergolas) swaps block 4 for the desire variant at the end of this section.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Looking at what is there before anything starts | The survey stage from the trade facts: the structure, the ground where it can be seen, the drains and the services, what will be disturbed (an older home checked for asbestos in the parts that will be opened, from the rule rows), how the materials get in. A part of the job, not a promise about the quote. |
| The approvals the job needs | The approvals stage from the trade facts: the building control application and its inspections, the planning position for that house, a notice to the neighbours where a shared wall or their footings are involved. Which of them this business arranges only from [CV: handles_planning] and the confirmed practices; otherwise said as a stage of the job that is agreed with the customer. Never an Act's, an order's or a document's name. |
| Making safe, stripping out and protecting what stays | The strip out, the temporary props and the protection of what is kept, as the trade facts stages name them for this service: the old kitchen out, the wall propped before it is opened, the floor covered, the dust kept to the room. Name only what the rows give. |
| The structure underneath and above | The structural stages as the trade facts name them for this service: foundations dug and looked at before the concrete goes in, the beam on its padstones, the shell and the roof, the floor strengthened, the subfloor levelled and dried, the deck's supports. No figure unless the rows give one, and never a standard's number. |
| First fix: what goes inside the walls and floors | The first fix stage from the trade facts: the pipes, cables, ducts and timbers run before anything is closed up, the insulation, the membrane under a floor or behind a wall. Electrics and gas by whoever is registered to sign them off, said without a scheme's name unless the client itself is registered. |
| Plaster, second fix and the finishes | The finishing stages from the trade facts: plaster or board and skim, tiling, the second fix joinery, the units and the worktop, the flooring, decoration once the plaster is dry. What the customer sees when the job is done; a named product only from [CV: materials_methods]. |
| The final inspection, the paperwork and the clear up | The last stage from the trade facts: the final inspection where the work was regulated and the completion certificate that follows it (a record of the sign off, never a guarantee), the electrical certificate from the registered installer, the site cleared and the waste taken by a registered carrier (from the rule rows). Whether this business holds the certificates for the customer only from confirmed practices. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The first things you notice | a fault left to spread while it is small | The things a homeowner notices first, from the trade facts signs row for this service, in their words: a slipped tile, a stain on the ceiling under the bathroom, a door that binds, a board that moves, plaster that sounds hollow, a worktop joint that has swollen. The one cause this card makes: a fault left to spread while it is small. Then what it leads to if left, from the skipped row: specific, never alarming (water into the timber behind, a repair that grows each season). On a schedule led page (repointing, and the maintenance side of property repairs) the card is what slips and when: sandy pointing that takes in rain which freezes and widens the joint each winter, a flat roof's seams opening, outside paint worn through to bare timber, with the reason in the material and the weather, never in the customer's diary. |
| It has moved, dropped or opened up | the load going somewhere it was never designed to go | A lintel that sags, a crack that steps through a wall, a floor that slopes or bounces, a stair that moves, a deck frame that gives, a slab that has cracked across. The one cause this card makes: a load going where it was never designed to go (a beam on a bearing too small for it, a wall taken out without a proper beam, joists cut through for pipes, a foundation on ground that has given, a support left out of a deck). Say what the job does so it stays put, from the trade facts stages and the done badly row: an engineer's design, temporary props while the opening is formed, padstones under the beam, building control looking at the bottom of the trench before the concrete; no size or figure the rows do not give; never a dig at another trade. On a schedule led page: what a season's weather has moved, from the signs row. Not a crack on clay that comes and goes: the category page owns that. |
| Past patching up | a repair that treats the finish, not the cause | Plaster patched over a crack that opened again, a bath recoated over a chip that has lifted, paint over a damp patch, a new board on a rotten joist, new doors on carcasses out of square, cement pointing on an old soft brick: the signs from the trade facts done badly row that a repair no longer holds. The one cause this card makes: a repair that treats the finish and not the cause. Say when a patch stops being worth it and what doing it properly involves, from the stages: strip back to sound material, find and fix the cause, then reinstate. On a schedule led page: the point where cleaning and recoating no longer holds because what is under the finish is soft or loose. Not movement: card 2 owns that. |
| Water where it should not be | a path for water that nobody has closed | A stain under a bathroom, a wet patch after rain where new work meets old, a musty cellar, a swollen worktop joint, a damp garage wall, boards cupping over a wet subfloor. The one cause this card makes: a path for water that nobody has closed (a failed seal, a flashing, the junction between an extension and the old wall, a membrane left out, a bridged damp course, a blocked drain in a cellar system). Say what the job does to close it, from the trade facts stages for this service (the source found first, the system tested before it is covered up); never a product by name, never a treatment sold by default. The category page owns damp misread as rising damp, so this card is the path the water takes, not the diagnosis. On a schedule led page: a seal or a joint that once kept the rain out and now lets it through. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| The size of this job | The size factor from the trade facts price row: the floor area, the storeys, the number of rooms, the span of the opening, the length of the run, the height of the wall. Say it plainly and give no figure. |
| What we find when it is opened up | What has to come out or be worked round, from the trade facts price row: an old slab, walls out of true, services in the way, a wet or uneven subfloor, an old coating, a rotten joist behind a sound board, asbestos in an older home. Say the business looks before it prices, from [CV: quote_method] only, and that some of it is only seen for certain once the work is open. |
| Who else the job needs on it | The people and the sign offs from the trade facts price row and rule rows for this service: an engineer's design for a beam or a foundation, building control and its inspections, a surveyor where a shared wall comes into it, a registered electrician or gas engineer, a stone fitter for a worktop. Each adds a fee, an inspection or a wait. Which of them this business arranges only from confirmed practices and [CV: handles_planning]. No figure. |
| Materials, finish and access | The material and finish options from the trade facts price row and [CV: materials_methods], and why one costs more than another; then how the job is reached: a skip on the road needs the council's permit, scaffold on the pavement its licence (from the rule rows, said as what usually applies), a terraced street with everything carried through the house. A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us About the Job; We Visit and Price the Job, or We Price Your Job without the site visit practice; We Start on a Date That Suits You).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The four cost cards above already give what moves the price: name one factor at most, never the list again. Never a fixed price or a promise the price cannot change. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: the row gives no duration for any building job, so give the stages in order and what decides the time (the ground, steel, drains, the weather on exposed stages, the drying or curing a product needs from the rows). A number only from the client values. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. A completion certificate is a record of the sign off, never a guarantee. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Do I need permission for [SERVICE_LOWER]? | From the trade facts rule rows for this service only, put as what usually applies, with "usually" or "in most cases", and the two approvals kept apart: first whether planning permission is usually needed (the condition that brings it in: a second floor on top, building out beside the house or round the corner of it, a dormer facing the road, a flat, a listed home, a conservation area, an estate where the council has taken the allowance away; a certificate from the council as the way to confirm). Then whether building control has to be involved: it is, for almost any extension, conversion, new opening, new stair or new bathroom with its drains and electrics, while a small detached garden building, or a conservatory kept separate from the house, is often outside it. Then telling the people next door, in writing, where the job touches a wall they own half of or digs beside their footings. What the customer does about it only as the row gives it; what this business arranges only from [CV: handles_planning]. Never a figure, an area, a height, a volume or a distance; never an Act's, an order's or a document's name; never legal advice; never that this job will or will not need permission before the house has been seen. Where the rows give no rule for this service, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words. What it does not cover only from the services list (design, drawings, engineering and the planning application only where [CV: handles_planning] or the confirmed practices say so), with one sibling service page or the category page linked. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom is one that can be normal (fine cracks on clay in a dry spell, condensation on a cold wall in winter, a hairline crack in new plaster as it dries), say first when it is normal and then what is not, before anything else. Then the usual cause here in plain words, what the local ground or housing adds, and what this service does about it. Never the biggest fix by default. One figure at most. | Process |

**Seasonal swap:** none.

**Desire led variant** (`service_page_blocks.A.desire`, 4 Nov 2026). Nobody has symptoms of wanting an extension. A page the library flags `desire_led` reads this block 4 in place of the one above: the customer's situation, what decides it (the mechanism) and what the work gives them, never a fault invented for it. Everything else on the page (What's Included, block 5, the steps, the FAQ slots, the symptom question) is the type A entry's. There is no emergency variant to win over it. H2: Is [SERVICE] Right for Your Home?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|
| The room you have run out of | what the house already has to give | The customer's situation: a kitchen the whole household crowds into, a third child and two bedrooms, a desk on the landing, a queue for the one bathroom, a garage full of everything except the car, a loft nobody can reach, a garden with nowhere level to sit. What decides it: what the house already has to give (a garden to build into, a roof with the height for a room, a garage with sound walls and a dry slab, a cellar, an alcove, a sound subfloor) and the planning position for that house from the trade facts rule rows, said with "usually" and never a figure, an Act or an order. What the work gives them, from the trade facts stages for this service: the room, the stair, the opening, the fitted run, the floor. Never a fault invented for it, never a lifestyle pitch, never a dream: the house and the use. |
| Which way to get the space | the house, the ground and the approvals deciding the option | The customer's situation: they are weighing two or three ways of doing it (an extension against a loft, a garage conversion against a garden room, a wet room against a bathroom, new doors against a new kitchen, engineered wood against laminate, timber against composite decking, a straight flight against a turn). What decides it: the house (the roof's shape and height for a loft, the garden's depth and its ground for an extension, a garage's slab and walls, a floor's moisture and level), which approvals each needs from the trade facts rule rows, and how much upheaval the household can take. What the work gives them: the option that suits their house, never the one that is best in general. A named product only from [CV: materials_methods]. No claim about cost, value or lifespan unless the rows or the client values give it. |
| What is hidden once it is finished | the layer underneath, inspected before it is covered | The customer's situation: they have a cheaper quote, or a friend who did it themselves, and want to know what the difference buys. What decides it: the layer they will never see once it is finished (the foundations taken to firm ground and looked at before the pour, the steel on its padstones, the new damp course joined to the old one, the floor strengthened under a loft, the tanking behind the tiles of a wet room, the subfloor levelled and dried before the boards go down, the joists and posts under a deck), which is where a quick job cuts corners and where it shows a winter or two later, from the done badly row. What the work gives them: that layer done as the trade facts stages name it, inspected where building control asks to see it. One specific from the stages for this service; no depth or figure the rows do not give; never a dig at another trade. |
| Living through the build | the order of work deciding how the household lives through it | The customer's situation: they want to know what the job does to the household: whether they can stay, where they cook, how long the house is open to the weather, where the skip and the scaffold go. What decides it: the order of work, from the trade facts stages for this service (the new structure built and made weathertight before the wall into the old house comes down, so the knock through is the last big day; a loft reached from the scaffold outside until the stair goes in; a kitchen or a bathroom out of use between strip out and second fix; a floor cleared of furniture and kept off until the finish has cured). What the work gives them: an honest picture of which parts are the hard ones and what is kept running. What this business does about it (a temporary kitchen, dust screens, a site toilet) only from confirmed practices. Never a duration, a date or a week by week plan: the trade facts give none. |

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (the problems the town's homes have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the niche steps. The briefs are town wide, not per category: the town profile, the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED). No seasonal swap and no symptom question on a location page. The pack's section 3: the anchors are the council (conservation areas, removed allowances, green belt, only where the research confirms them), the housing era and its roof shape, and the ground; every anchor has to change the work; never the inside of anyone's home; never an era as a judgement on today's houses. Placeholders: `[WORK]`, `[WORK_LOWER]`, `[TOWN]`, `[CITY]`.

- A niche with no section here has its location pages refused: "no location block briefs for builder".

### Type A (project trade: every client)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Ground that moves with the seasons | the ground under the town's houses taking up water and giving it back | Hairline cracks that widen in a dry spell and close up once the ground is wet again, a path that has lifted, doors that stick in autumn. Say first what is normal on the town's ground, from the town profile and a symptom (shrinkable clay, made ground, a river valley, chalk), and then what is not (a crack that widens year on year, a step in the brickwork, a floor that slopes). The one cause this card makes: the ground under the town's houses taking up water and giving it back. What it means for any job that goes into the ground, in plain words: foundations for an extension go deeper on ground like this and building control looks at the bottom of the trench before the concrete; a tree near the house is part of the picture; a cellar or a basement meets the water in the ground. Never promise the ground will change, never a verdict on a house. Not a beam or a drain still moving one wall: the town's service pages own that. |
| Houses built the way their decade built them | the era of the houses setting what the work meets | The town profile's housing, read for what the work meets and never for a judgement on the houses or anything inside them: terraces with walls one brick thick and footings barely below the garden, semis from between the wars with a hipped roof, estates after the war where the garage is built into the house, new estates with roofs made of factory trusses. The one cause this card makes: the era of the houses setting what an extension, a loft or a conversion meets. Tie each to the work: a hipped roof points to one kind of loft conversion and a trussed roof to a different, bigger one; a wall one brick thick changes how an extension ties in, how it is insulated and how damp in it is read; a garage built into the house suits conversion and brings the fire separation with it; an older home is presumed to need a check for asbestos in what will be disturbed (from the rule rows, no year). Never the inside of anyone's home, never that the houses are tired, damp or badly wired. |
| Streets where the council has a say | a conservation area or a removed allowance changing which approval the job needs | The town profile's conservation areas, listed buildings, estates where the council has taken the usual allowance away, and green belt edges, only where the research confirms them. The one cause this card makes: a conservation area or a removed allowance changing which approval the job needs. Say what it means for the work, with "usually" throughout: an addition at the back or a new dormer that elsewhere needs no application goes through one on these streets; a listed home needs consent for work that touches its character, inside as well as out; knocking a building down in a conservation area can need permission; materials are expected to match. Building control is a separate matter and applies either way. Never the order's, the area's or the Act's name, never a figure. Where the profile gives none, say the general position and that the house has to be seen. |
| Terraces, semis and the neighbour's wall | work on or next to a shared wall | The town's terraces and semis mean most extensions, lofts and knock throughs touch a wall the neighbour owns half of, or dig close to their footings. The one cause this card makes: work on or next to a shared wall. What usually applies, from the trade facts rule rows: the neighbour is told in writing before the work starts and can agree or have a surveyor act for them; it is separate from planning and from building control; a loft's new floor and its steel beams usually sit on that shared wall at the sides. Never the Act's name, never a notice period, never a distance or a depth. What the business does about it only from confirmed practices. Not the planning position: card 3 owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Getting a skip and a scaffold onto the street | On a terraced street with no drive the skip sits on the road and usually needs the council's permit, scaffold on the pavement its licence (from the rule rows), and the materials come through the house. Say why that adds time and cost, never "the only way"; the town profile says which streets are terraced. No figure. |
| Deeper foundations on this ground | Where the town profile gives clay, soft ground or a high water table: foundations go deeper, may need an engineer's design, mean more spoil to take away, and are looked at by building control before the concrete goes in. Say it plainly from the profile; no depth, no figure. |
| Conservation areas and listed homes | Where the town has conservation areas or listed buildings, the application, the drawings and the wait before work can start add time, materials have to match, and some things cannot be done at all. "Usually", never the order's or the area's official name. From the dossier rules only; otherwise the general position as something that sometimes applies. |
| What the last builder left behind | In older homes: an earlier extension on shallow footings, a chimney breast taken out with nothing holding up what is above, a garage slab with no membrane under it, cables and pipes where no drawing says they are. What the work meets once things are opened up, said as what the era usually left and never as a judgement on the houses; from the town profile only. How it is dealt with only from confirmed practices. No figure. |

**Steps.** The niche steps (Tell Us About the Job; We Visit and Price the Job; We Start on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (access on the street, the ground under the foundations, what an older house hides) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at on site (the ground where it can be seen, the drains, the access, a shared wall, the planning position for that street), what comes back. Approvals handled on the customer's behalf only from [CV: handles_planning]. No timescale unless [CV: response_time] is set. | Process |
| timing | always | How long does [WORK_LOWER] take in [TOWN]? | No duration: the trade facts give none. The stages in order as the reason (approvals before a start, foundations inspected before concrete, the shell made weathertight, first fix, plaster and its drying, second fix, the final inspection), and where the town profile gives the ground or the planning position, what it does to that order (an application before anything can start in a conservation area, deeper footings on clay, a wait on a notice to the neighbours). A number only from the client values. Nothing about when the job can start unless [CV: start_time] is set. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

Things a brief wanted that neither the calibration pack nor the trade facts pack gives. Each brief says "from the trade facts rows only" or leaves the point out until one of these is answered.

1. **No duration for any job.** Table A says "varies; no standard" for all 57 services and Table G confirms no national range exists for an extension or a new build. Every timing brief gives the stages and what moves them, and no number. The onboarding questions ask the client for a typical duration for three jobs.
2. **The planning figures and the NUM rule.** Table C and E give the depths, heights, volumes and distances of permitted development and the party wall triggers, but `validate-v20.js` NUM blocks any digit not in the client values or the allocated research, and the pack's section 2 says to leave the limits to the trade facts rows. Every planning brief here is written without a figure ("usually", the condition that brings a rule in, the certificate that confirms it). If Ray wants a limit on a page, it has to come through the verified pack's figures and a decision on NUM, the same open point as the fencing entry's heights.
3. **The trade facts pack is unverified.** `trade-facts/builder.md` says "verified: no". The service page gate (`trade-facts/store.js serviceGate`) refuses the service run until the pack is verified; the briefs point at the rows regardless.
4. **Who handles the approvals.** The pack's section 7 bans implying design, engineering or planning drawing capability the client has not confirmed. Every brief that names an application, a notice or an engineer says "only from [CV: handles_planning] and the confirmed practices". Ask each client whether they make the planning and building control applications and serve the party wall notices, or work to the customer's architect and engineer; the entry has no other way to tell.
5. **What the business does for the household during a build.** A temporary kitchen, dust screens, a site toilet, holding the completion certificate for the customer: none is in `practices.json` for this niche. The briefs say "only from confirmed practices" and name nothing. If Ray wants these on the page, they need practice keys.
6. **Asbestos in older homes.** Table C and E give the year before which a home is presumed to contain it; the briefs say "an older home" and no year, because a year on a town page reads as a claim about the houses. The client's own practice (whether they commission the survey) decides what the copy says.
7. **The problem customer's fears.** The pack's section 1 gives concrete fears for the project customer and the briefs use them. A repairs and maintenance builder's customer (a crack, a damp wall, a leak) has different fears and the entry has no type keyed slot to give them, since every category is type A. `fears_by_type` is empty; Brandon decides whether a maintenance only builder is a type B client of this niche or something else.
8. **Borderline desire led pages.** The pack's section 2 list does not name Garage construction, Pergolas, Kitchen worktops, Kitchen door replacement and refacing, Bath installation and replacement, Fitted shelving and storage or Bespoke carpentry and joinery; they are flagged desire led on the pack's situations for their categories (a garage that holds everything but the car, sound units with tired doors, awkward alcoves and unused space, a new deck's situation). Structural alterations and steel beams is left problem led (Table B gives it movement cracks and a deflecting lintel) although a knock through is wanted rather than needed; Commercial building work and Shop and office fit outs are left problem led because the pack lists neither. Ray can flip any of these in `builder.csv` without a code change.
9. **Remodeller and Property Developer.** Neither tab is in the pack's section 2 table. Both take A and the briefs above; Remodeller's only page rows are Bath and shower resurfacing, so its card list leans on Property refurbishment. If a client arrives on either tab as their primary category, check the briefs read sensibly for them before the first run.
10. **Commercial work.** The pack writes for commercial clients (fit outs, phasing, keeping a business open) only where the client confirms commercial work. The briefs carry no commercial line; the Commercial building work and Shop and office fit outs pages lean on their Table A, B and F rows alone. Confirm with each client that they do that work before those pages are made.
11. **VAT reliefs.** Table C and E give the zero and reduced rates for new dwellings, long empty homes, qualifying conversions and energy saving work, with dates. No brief mentions VAT: it is a figure, it is dated, and the trader determines it. If a new build client wants it on the page it needs a client value.
12. **Structural warranties and insurance backed guarantees.** Table D and E keep a new home warranty, an insurance backed guarantee and building control sign off apart. The cover briefs follow that, and `[CV: manufacturer_warranty]` is the slot a new build's structural warranty goes in; the onboarding question asks which the client holds so Ray can verify it before it is shown.

## Planning and extensions: the positions this entry takes

The pack's section 2 says its extensions, planning and building regulations block is identical in the Builder and Loft Conversions packs. The Loft Conversions entry (next batch) must give the same guidance. These are the positions every planning brief in this entry takes, one line each, so the next writer can match them:

1. Two approvals, never blurred: planning decides whether a thing may be built (how big, how high, how it looks, the neighbours); building regulations decide whether it is built safely (structure, foundations, the way out in a fire, insulation, drains, ventilation); every brief that mentions one says which one it means.
2. Permitted development is written as what usually applies, never as a promise: an extension on one floor behind the house, a loft with a rear dormer or rooflights that keeps the roof's shape, and a garage converted within its own walls usually need no planning application.
3. What more often or more likely needs an application: a second floor added, building out beside the house or round the corner of it, a dormer facing the road, any extension to a flat or maisonette, a listed home, a home in a conservation area, and an estate where the council has taken the usual allowance away.
4. The certificate: a lawful development certificate is written as "a certificate from the council is the usual way to confirm that a job needs none", never by its name, never as compulsory.
5. Building control: nearly every extension, loft conversion and garage conversion needs building regulations approval whether or not planning was needed; building control inspects at stages (the bottom of the trench before concrete is the one named) and issues a completion certificate at the end, which is a record of the sign off and never a planning permission, a warranty or a guarantee.
6. The exemptions: a conservatory kept separate from the house by outside quality doors and a small detached garden building nobody sleeps in are often outside building control; open the conservatory into the house and it is treated as an extension; said as "often", with no area, height or distance.
7. Party walls: work on a shared wall, or footings dug close to a neighbour's, usually means the neighbour is told in writing before work starts and can agree or have a surveyor act for them; it is separate from both approvals; on a terrace or a semi a loft's new floor and its steel beams usually sit on that shared wall; never the Act's name, never a notice period, a distance or a depth.
8. Lofts: a rear dormer or a rooflight conversion that keeps the roof's shape usually needs no application; a dormer facing the road, a mansard, and most loft work in a conservation area usually do; every loft needs building regulations approval, including a protected way down from the new floor; no volume or projection figure.
9. Annexes and basements: an annex lived in as part of the household is usually treated differently in planning from one lived in or let on its own, which usually needs permission; converting an existing cellar usually needs none, digging a new basement usually does; no figure.
10. Never a figure, an area, a depth, a height, a volume, a distance or a notice period; never an Act's, an order's, a class's or an approved document's name; never "no permission needed" stated before the house has been seen; the planning position is looked at on the site visit and never settled there.
11. Who does it: the application, the notice and the engineer are arranged by this business only from [CV: handles_planning] and the confirmed practices; otherwise the copy says they are a stage of the job agreed with the customer, and never implies design, engineering or drawing capability.
12. Local claims: a conservation area, a removed allowance or green belt is named only where the town research confirms it, and only when it changes which approval the job needs; otherwise the general position and the site visit.
