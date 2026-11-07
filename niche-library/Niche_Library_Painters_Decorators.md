# Niche Library Entry: Painters and Decorators

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry). The code reads `niche-library/painters-decorators.json`; this file is the same content for people, kept in the same commit.
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads the .json; the model never sees the slot names, only the resolved words.

Business type is **A (project trade)** for both GBP categories (Painters & Decorators Calibration Pack v1, section 2: Painter and Painter and Decorator are both A). There is no type B: nothing in this trade is a round, and a landlord's or a shop's rolling programme is quoted as projects, so it is schedule led inside A. No page is flagged emergency, so there is no emergency variant.

Sources, in order of authority: `calibration-packs/Painters_Decorators_Calibration_Pack_v1.md` (sections 1, 2, 4 and 7), `trade-facts/painters-decorators.md` (Tables A to G; unverified, 20 Oct 2026), `niche-library/painters-decorators.csv` with `painters-decorators-categories.csv`, `fillout/services/painters-and-decorators.json`.

The voice is a decorator who knows most of the job happens before the first coat, explaining it to a homeowner: the surface, the preparation and the light, never a mood board. Every brief puts the failure underneath the paint (moisture behind it, a surface it could not grip, a stain never sealed, a joint that moves) and says in its own words that another coat over the same fault fails the same way.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Painting and Decorating / painting and decorating |
| trade_person / trade_person_plural | painter and decorator / painters and decorators |
| customer_type | homeowners (the pack's section 1 also has landlords, agents and businesses: they read the Commercial decorating and fire protection pages) |
| unit_of_work | jobs |
| emergency_niche | no |
| big_ticket | yes (the whole outside of a house repainted, a full interior redecoration, a hand painted kitchen) |
| schema_subtype | HousePainter (schema.org's own subtype of HomeAndConstructionBusiness) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| walls, ceilings, woodwork, skirting boards, doors, window frames, sills, gloss, emulsion, wallpaper, colour, room, hallway, stairwell, kitchen units, flaking, peeling, patchy, stain, damp, mould, filler, sanding, primer, undercoat, coats, render, textured ceiling, dust sheets | substrate, coating, coating system, film build, adhesion, abrade, application, specification, property, premises, snagging, decorative scheme, colour scheme, refurbishment, makeover, Artex (words_avoid_exceptions: specification on the Commercial decorating and Intumescent and fire protection coatings pages, where the work is done to one the customer holds; coating on the fire protection page, where the product is a coating and the page name says so, and on the Artex removal page as textured coating, the facts pack's own term; premises and property on the Commercial decorating page, the customer's own words for a landlord's or an agent's buildings; Artex in that page's name, H1, title, card heading and FAQ question, as the word customers search for, with textured ceiling in the running text) | transform your space, transform your home, transform your room, transform any room, fresh new look, new lease of life, breathe new life, bring your vision to life, sanctuary, oasis, haven, flawless finish, perfect finish, showroom finish, premium paint, premium finish, premium products, dust free, mess free, no mess, on trend, colour of the year, mood board, interior design (the pack's section 7: interior design language, a premium paint sold as the fix, trends, and clean up or dust claims stated as this client's practice) |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us what needs painting and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us what needs painting and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency page) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us What Needs Painting**
   Brief: how to get in touch and what is useful to send first: which rooms, or which side of the house; whether it is walls and ceilings, the woodwork, paper or the lot; how the surfaces look to them now (flaking, a stain, old paper, fresh plaster); photos if they have them. No promise of a reply time unless [CV: response_time] is set.
2. **We Look at the Surfaces and Price the Job** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the visit and what gets looked at: what is on each surface now and what it will need before any paint goes on (filling, old paper off, loose paint back to a sound edge, a stain sealed, a damp patch whose cause has to be found first), the woodwork, how high the ceilings and stairwells are, what has to be moved or covered, and outside how the walls and the timber are reached. Follows [CV: quote_method]; only say the quote is written if quote_method says so; the quote setting out the surfaces, the preparation and the coats only when written_quote or itemised_quote is confirmed. Never restates "free" (FAQ 5 owns it).
   Without the practice (`step_2_no_visit`): **We Price Your Job**
   Brief: a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **We Start on a Date That Suits You**
   Brief: the start date is agreed in advance, to suit the customer, room by room where the house stays lived in. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it). Floors and furniture covered only when property_protected is confirmed; the room left tidy each evening only when tidy_each_day is confirmed; an outside job moved by the weather and rebooked only when weather_delays_rebooked is confirmed.

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer warranty → insurance |
| fears (in order, one per Why choose us point; the pack's section 1) | 1. a finish that shows every patch, ridge and brush mark when low sun falls along the wall; 2. paint on the carpet, the furniture or the glass, and a house left in a state between days; 3. a job that overruns, with rooms out of use for longer than was said; 4. another coat put over a problem (flaking, a stain, damp) that comes straight back through |
| fears_by_type | none: there is no type B client in this trade (the slot is an empty object) |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the facts pack's Table D.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies:** PDA (Painting and Decorating Association), TrustMark, Guild of Master Craftsmen.
- **Tier 2, assessed schemes:** Dulux Select Decorators (the one manufacturer assessed scheme the facts pack verifies; a Crown or Farrow and Ball badge is not one), CHAS, Alcumus SafeContractor (commercial clients).
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards. A PASMA or Ladder Association card is training, not approval, and is never shown as a scheme. Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if something is damaged during the job (a carpet, a worktop, a window). | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. A scheme's workmanship guarantee only when the client is verified on that scheme (Dulux Select, Table D). | no | Trust |
| faq_3_none | What happens if something isn't right after the job? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. Outside work waiting on the weather only when weather_delays_rebooked is confirmed. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does it take to decorate a room? | The facts pack gives no standard duration for any decorating job, so give what decides it and no number unless [CV: typical_jobs] confirms one: the state of the surfaces and the preparation they need before paint (filling, stripping, sealing), how much woodwork there is, and the drying between coats, which follows the paint's own instructions and the warmth and air in the room rather than the clock. A big change of colour can take more coats. Nothing about this business's own speed. | no | Timing |
| faq_B | Why does paint keep peeling off my walls or woodwork? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words, from the trade facts done badly rows: moisture behind the paint (a damp wall or wet timber painted over, so the film lifts); a surface the paint could never hold to (dust, loose old paint, grease or a shiny finish under it, with no key or primer); a stain or an old loose layer that was never sealed or taken off, so each new coat comes away with it. Then what the local housing adds (older layers of paint, pebbledash and render, fresh plaster on a new estate), then the fix: the cause dealt with, the loose paint off, the bare areas primed, before any finish. Never that another coat will hold it. | **yes** | Process |
| faq_C (fallback) | Is it better to paint over wallpaper or strip it? | From the trade facts painting over wallpaper row: sound, well stuck paper can be painted after the seams are checked and the right preparation is used, and some papers bubble or lift under a water based primer, so it is not always the better answer; paper that is lifting, bubbled or layered is stripped. What decides it is the state of the paper and the wall under it, never a general rule. No product named. | no | Process |
| faq_D (fallback) | How long does new plaster need before it can be painted? | From the trade facts plaster drying and new plaster first coat rows: plaster has to be properly dry before ordinary paint goes on, and how long that takes depends on the wall, the plaster and how warm and aired the room is, so give no number of days or weeks; it shows as the colour evening out and the darker patches going. On bare plaster the paint goes on thinned for its first coat where the paint's instructions call for it, so it goes into the surface rather than sitting on it; painting too soon traps the water and the paint flakes or blisters. No product named. | no | Timing |
| faq_planning (big ticket, only if [CV: handles_planning] confirmed) | Do I need permission to repaint the outside of my house? | Point at the trade facts rule rows (Table C) and write what usually applies, with "usually" or "in most cases": repainting a house in its existing colour usually needs no application; a listed home can need consent where the change touches what makes it special (a new colour, painting brick or stone that was never painted, taking off old plaster inside), and in some conservation areas a local restriction can take away the right to change the colour of the front. What the customer does about it only as the row gives it (check with the council before the work; whether the business handles that only from [CV: handles_planning]). Never an Act's, an order's or a direction's name, no figure. | no | Process |

Sources for faq_A to faq_D: reworded from common People Also Ask questions for decorators in the UK, answered from the facts pack's Table E rows. Replace with real customer questions when Brandon or the client supplies them.

### Type keyed homepage overrides (faq_slots_by_type)

None: every client in this trade is type A, so the slot is an empty object and the shared slots above apply.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`). Never a manufacturer or a product range (the pack's section 7).
- Interior paints: matt emulsion / silk emulsion / durable or washable emulsion / water based gloss / water based satin / water based eggshell / solvent based gloss
- Woodwork and timber: stain / varnish / knotting and primer on bare timber / hand painted finish / sprayed finish
- Wallpaper: paste the wall paper / paste the paper / lining paper / wallpaper stripping
- Exterior: masonry paint / breathable finish or limewash for older solid walls / exterior wood paint / fascias and soffits painted / render repairs
- Preparation and repairs: filling and sanding / skimming / stain sealing primer / mould treatment / textured ceiling testing arranged / lead safe stripping methods
- Access: ladders / tower / scaffold arranged
- Other: dust sheets and floor protection / furniture moved and covered / waste taken away / HVLP spraying / airless spraying

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

emulsion, gloss, satinwood, satin, eggshell, undercoat, primer, mist coat, lining paper, wallpaper stripping, wallpaper hanging, wallpapering, skimming, plastering, plaster repairs, filling, caulking, sanding, knotting, stain block, stain sealing, masonry paint, limewash, render repairs, fascias and soffits, sash windows, sash cords, draught proofing, putty, spraying, HVLP, airless spraying, hand painted kitchen, kitchen cabinet painting, cabinet painting, furniture painting, coving, cornice, Artex removal, textured ceiling, intumescent paint, fire protection coatings, commercial decorating, office decorating, wood staining, varnishing, paint stripping, murals, decorative finishes

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| custom painting | (never named) |
| roof painting | (never named) |
| waterproofing | (never named) |
| exterior painting | exterior painting |
| siding painting | painting cladding and render |
| deck painting | painting decking |
| furniture painting | furniture and kitchen painting |
| cabinet painting | kitchen cabinet painting |
| interior painting | interior painting and decorating |
| drywall painting | painting walls and ceilings |
| door painting | door painting |
| metal painting | painting metalwork |
| speciality design painting | decorative finishes |
| faux finishes | decorative finishes |
| mural painting | murals |
| drywall repair | plaster repairs |
| water-damage repair | plaster repairs after a leak |
| spray painting | spray painting |
| wood staining | wood staining |
| wood varnishing | varnishing |
| wood painting | painting woodwork |
| wallpaper hanging | wallpapering |
| wallpaper removal | wallpaper stripping |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted), from the library's page rows. JSON slot: core_services.

- Painter: interior painting and decorating, exterior painting, woodwork and timber finishing, wallpapering, furniture and kitchen painting, spray painting
- Painter and Decorator: decorative finishes and murals, interior painting and decorating, wallpapering, exterior painting, furniture and kitchen painting

Service words for the whole job rather than one service: painting and decorating, decorating, painting, interior decorating, redecoration, house painting. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: plaster repairs, stains, mould, damp. When an FAQ question names the job as well as the problem ("Will a stain come back through new wallpaper?"), it goes to the job's page (wallpapering), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches). The briefs here lean on: property_protected (floors, furniture and fittings covered), tidy_each_day, waste_removal, weather_delays_rebooked (an outside job moved by the weather), written_quote and itemised_quote (the quote setting out the surfaces, the preparation and the coats), aftercare_advice, return_visit, price_agreed_before_work. The pack's section 7: dust sheets, furniture moving, clean up, the number of coats, guarantees and working hours are never stated as this client's practice unless confirmed.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every decorating client for:
- a "from" price for 3 typical jobs (e.g. a bedroom, walls and woodwork; a hall, stairs and landing; the outside of a semi);
- a typical duration for the same 3 jobs;
- whether quotes are written and itemised (surfaces, preparation, coats, exclusions), and whether the price is fixed once agreed;
- what they do about older paintwork and textured ceilings (testing arranged, lead safe methods), so the copy can say it is their own practice;
- whether they spray, and where (on site or in a workshop);
- team size, and who does the work in the house.

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Local Experience Behind Every Finish**
2. Cover → **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": painter → painting, painter and decorator → decorating. Both hub to Decorating in `painters-decorators-categories.csv`. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs (`category_page_blocks`) use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 (common problems) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above) and the FAQ slots. Placeholders: `[CAT]` the page keyword without the town (Painter, Painter and Decorator), `[CAT_LOWER]`, `[WORK]` the work noun (Painting, Decorating), `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises, no product or manufacturer named.

- `seasonal_trade`: no. The pack calls exterior painting seasonal and interior work not, and the code's seasonal swap is niche wide (every type A page would get the weather card, wallpapering included), so no `seasonal` block is written. The exterior weather lives in card 2 and the timing FAQs: damp timber and masonry hold moisture under the paint, cold slows the drying, dew late in the day spoils the finish; the limits are the chosen paint's own, never a season or a temperature (the facts pack's exterior temperature and weather rows: no trade wide minimum).
- `category_types`: empty. Both GBP categories are type A (the pack's section 2), so every category page reads the A briefs whatever the client's type.
- A niche with no section here has its category pages refused: "no category block briefs for painters-decorators".

### Type A (project trade: every category)

The pack's section 2 split inside type A: desire led services (interior painting and decorating as a refresh, wallpapering, decorative finishes and murals, furniture and kitchen painting, spray painting of units, coving and cornice) are written as the customer's situation; problem led ones (exterior painting where paint is failing, woodwork on bare or flaking timber, sash window and timber restoration, plaster repairs and skimming, Artex removal, stains and mould inside) as symptom, cause under the paint, consequence; schedule led ones (exterior repainting on a cycle, commercial decorating between tenancies, fire protection coatings) as what slips and when. Block 4 below is a mix, as the pack's table has it for Painter: cards 1 and 4 are situations, cards 2 and 3 symptoms, and every brief says how it reads on a Painter page and on a Painter and Decorator page (whose block 4 is about decorative finishes and murals: the plain wall the owner wants to carry more, and the surface it needs first).

**Block 4, common problems.** H2: Common [WORK] Problems

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| A room that's ready for a new colour | what is on the surface now, which sets the preparation | A situation card, not a fault: the household wants a change (a colour on the walls, paper in the hall, the woodwork back to white, a kitchen that feels new without new units). What decides it: what is on the surfaces now (filled holes, old gloss, a wall papered twice, a textured ceiling, fresh plaster), because that sets the preparation and how the finish reads when the light comes across it. What the work gives them, in plain words from the trade facts stages: the surface cleaned, made good, sanded and sealed where it is bare or stained, then the finish coats, then the colour. On a Painter page the card reads as the interior refresh, the wallpaper or the units; on a Painter and Decorator page as the plain wall the owner wants to carry a painted effect or a mural, and the sound, primed base it needs first. Light and surfaces, never trends; never a lifestyle pitch, never a fault invented for it. |
| Paint lifting off sills, frames and doors | the paint film opened by the weather, letting water under it | Problem led: paint flaking from sills, window frames, doors and fascias, bare wood showing through, a sill that gives under a thumb, putty falling out (the trade facts signs rows for exterior painting, woodwork and sash windows). The one cause this card makes: the paint film opened by the weather on the sunny, rain facing sides of the house, so water gets under it and the timber starts to take it in. Say what the fix usually involves from the stages: the loose paint off back to a firm edge, soft wood repaired, bare areas primed, undercoat and finish, in dry weather, because damp timber holds moisture under new paint. Exterior copy spends its words on the timber, not the walls. On older paintwork the layers are assessed before they are stripped, as the normal first step, never a claim about the reader's house. Never that another coat will cure it; not the walls (card 3 owns them). |
| Walls where paint blisters, flakes or stains come back | paint put onto dust, loose paint, damp or a stain it could not hold to | Problem led: inside, a mark on a ceiling back within weeks of being painted over, paint coming off in sheets, a patch that reads darker or duller than the rest; outside, masonry paint blistering, green growth back within a season, white salts showing through (the trade facts signs and done badly rows). The one cause this card makes: paint put onto a surface it could not hold to, or that was still carrying moisture or a stain (dust, loose old paint, an unsealed repair, a damp wall). More paint over the same fault fails the same way, in the brief's own words. Say what the fix usually involves from the stages: the cause of any damp found and dealt with first, the loose material off, the stain sealed with a primer that stops it, repairs sealed so they do not drink the paint, then the finish; an old solid wall given a finish that lets it breathe where the facts row has it. Never a promise the stain or the growth will not return where the cause is still live. Not timber (card 2 owns it). |
| Units, doors and stairs you want kept, not replaced | a shiny or greasy finish that new paint will not grip without a key | A situation card: the kitchen carcasses are sound and the room works as it is, the doors, the staircase or a wardrobe just look tired, chipped at the handles or gone yellow. What decides it: the finish that is on them now (old gloss, lacquer, grease by the handles, worn varnish), which a new coat will not hold to unless it is cleaned, rubbed back to a key and primed with a primer that grips, from the trade facts furniture and woodwork stages (degrease, take off the loose finish and dull the shiny one, repair, primer, finish coats, left to dry before the doors go back on). What the work gives them: the piece kept and the finish renewed, by brush or sprayed; spray and brush are two methods, not a ranking (the trade facts). On a Painter and Decorator page the same, or a painted effect on a piece. White gloss gone yellow is the old solvent based finish ageing, most away from daylight (the trade facts), never a fault in the house. No claim about how long a painted kitchen lasts. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How many rooms and how much wall | The number of rooms, the ceiling heights, a stairwell, the outside of a house against one wall: more surface is more preparation, more paint and more days. Say it plainly and give no figure. |
| The state of the surfaces | Filling and sanding, old paper to strip, flaking paint to take back, a stain to seal, loose plaster, growth or failed render outside: the preparation is most of the job and moves the price most (the trade facts price rows). Say the business looks before it prices, from [CV: quote_method] only. |
| Woodwork, high ceilings and getting up to it | Doors, skirting, spindles, sash windows and coving take longer than flat wall; a tall stairwell or an outside wall needs a tower or scaffold, and an occupied building needs the work phased round the people in it (the trade facts price rows). Say why they add time; access only from the client values, never a scaffold promised. |
| Colour changes, coats and the finish you choose | A big change of colour takes more coats than a freshen up in the same shade (the trade facts coat count row); a durable or washable finish against a plain matt, water based against solvent based, brush against spray, a patterned paper to match against a plain one. Name a finish only if the trade facts or [CV: materials_methods] give it; a product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A).

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (the state of the surfaces and the preparation they need, how much wall and woodwork there is, the coats a change of colour takes) and how the quote is given, from [CV: quote_method] only. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What does your [WORK_LOWER] work include? | The jobs themselves, named from the card list (walls and ceilings, the woodwork, paper, the outside of the house, the units), and the size of job taken on, from the services list and [CV: typical_jobs] only. Link one service page. Never 'on this page', 'listed above' or 'the card list' as words: the reader sees no list, so name the work. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at (the surfaces and what they need before paint), what comes back. The quote setting out the surfaces, the preparation, the coats and what is left out (the trade facts quote scope row) only where written_quote or itemised_quote is confirmed. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year for [WORK_LOWER] work? | Inside, any time of year, with the reason the drying slows in a cold, damp room with no air moving (the trade facts timing cells). Outside, a dry, settled spell, and why from the paint's side: damp timber and masonry hold moisture under a new film, cold slows the drying and the hardening, dew settling late in the day spoils the finish, and rain, fog or heavy air stop the work whatever the thermometer says; the limits are the chosen paint's own, not a season, so winter work outside depends on the paint and the week's weather (the trade facts exterior temperature and weather rows). No temperature, no month, nothing about spring being busy or booking ahead, no promise about the weather. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Then the usual cause under the paint in plain words (moisture behind it, a surface it could not grip, a stain never sealed, a joint that moves, old layers coming away), what the local housing adds (sash windows and older paint layers, pebbledash and render, textured ceilings, fresh plaster on a new estate) and what the business does about it. Lead or asbestos only as something older homes can have, with testing as the normal step, never as a claim about the reader's street or house, and never as removal instructions. One figure at most. | Process |

**Seasonal swap.** None (seasonal_trade is off; see above).

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts; every row in this pack gives 7) and the role based set below is the fallback when the pack gives fewer than 6 (F-ITEMS-GENERIC); block 4 (signs you need it) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above) and the FAQ slots (A: cost, timing, cover, rules, scope). The service's own trade facts rows (`trade-facts/pack.js rowsForService`) are the material every brief points at, so one type A entry serves exterior painting, sash windows, Artex removal and fire protection coatings alike. The type is the parent category's (`category_types`) else the client's: A throughout. Placeholders: `[SERVICE]` the page keyword without the town (Exterior Painting, Plaster Repairs and Skimming), `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number, no product or manufacturer named.

- A niche with no section here has its service pages refused: "no service block briefs for painters-decorators".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED). The category page owns the film opened by the weather and paint put onto a surface it could not hold to; the service page owns a live source of water, bare timber taking in water, and a background broken down under the finish.

### Type A (project trade: every category)

Three framings share this one entry, per the pack's section 2: a problem led page (exterior painting, woodwork and timber finishing, sash window and timber restoration, plaster repairs and skimming, Artex removal) uses block 4 below as written; a schedule led page (exterior repainting on a cycle, commercial decorating, intumescent and fire protection coatings) reads the "on a schedule led page" line in each brief, what slips and when; a desire led page (the library's `desire_led` column: Interior painting and decorating, Wallpapering, Decorative finishes and murals, Furniture and kitchen painting, Spray painting, Coving and cornice) swaps block 4 for the desire variant at the end of this section.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Looking at what's on the surface now | The survey stage from the trade facts: the existing paint or paper, damp, stains, cracks, loose material, and on older paintwork or a textured ceiling the layers that have to be assessed before they are disturbed. A part of the job, not a promise about the quote. |
| Covering floors, furniture and fittings | The protection stage from the trade facts: floors, furniture, fittings and the surfaces next to the work covered or masked. What this business moves or covers only from the confirmed practices (property_protected); otherwise the stage as the trade does it. |
| Stripping, washing and making good | The preparation stages from the trade facts: old paper or loose paint off, the surface washed down, holes and cracks filled, render or timber repaired, the cause of any damp dealt with first. Name only what the rows give for this service. |
| Sanding and dusting off | The sanding stage from the trade facts: filled areas rubbed flat, shiny finishes dulled to a key, the dust taken off before anything goes on. On older paintwork never dry sanded or burned off until the layers are assessed (the trade facts), said as the normal method. |
| Priming and sealing bare or stained areas | The priming stage from the trade facts: bare timber, bare plaster, filled patches and stains primed or sealed so they take the finish evenly; a wall sized or lined before paper where the row has it. A named product only from [CV: materials_methods]; the thinned first coat on new plaster only where the paint's instructions call for it. |
| The finish coats | The central stage from the trade facts: the walls and ceilings cut in and rolled or brushed, the paper hung to a plumb line and the pattern matched, the woodwork undercoated and finished, or the surface sprayed, as the trade names it for this service. The number of coats from the paint's own instructions, never a universal number; more for a big change of colour. |
| Checking the finish and clearing up | The last stages from the trade facts: the finish inspected and touched up, masking off, paste cleaned away, doors and handles back on once the paint has dried. Left tidy each day only from tidy_each_day; the waste taken away only from waste_removal; otherwise say it is cleared as agreed. |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The first signs | the job left undone | The things a homeowner notices first, from the trade facts signs row for this service, in their words: the gloss peeling, hairline cracks, putty falling out, a sash that sticks, a crack that has come back, a chip in a coating on steel. The one cause this card makes: the job left undone. Then what it leads to if left, from the skipped row: specific, never alarming. On a schedule led page (exterior repainting on a cycle, commercial decorating between tenancies, fire protection coatings) the card is what slips and when: the film on the sunny sides dulls, then cracks, then lets water in and the timber greys; corridor walls scuffed through to the plaster before the next cycle; a coating chipped back to bare steel, so it is no longer what was tested; with the reason in the sun, the rain, the traffic or the steel, never in the customer's diary. |
| Damp or a stain that keeps coming back | a source of water that is still live, feeding the surface | Paint that has been redone and failed the same way: the mark back on the ceiling, blisters again on the same wall, mould back in the same corner, paint lifting again on the same stretch of render. The one cause this card makes: a source of water that is still live (a leak above, condensation, water getting in through cracked render or open joints) feeding the surface, so every new coat is painted onto a problem that has not stopped. Say what the job does first from the trade facts stages: the cause found and dealt with before any paint, the surface left to dry, loose material off, then sealed and finished; never a promise the mark or the mould stays away while the cause is live. Never a dig at the last decorator. On an Artex page: a damaged or dropping textured ceiling, with testing before anything is touched (the trade facts), never removal instructions. |
| Bare wood, soft spots and open joints | timber taking in water once nothing is left on it | Grey bare wood on a sill, a soft spot under a thumb, putty gone from the glass, a joint open at the corner of a frame, a fascia with no paint left on it (the trade facts signs rows). The one cause this card makes: timber taking in water once there is nothing left on it to keep the water out, so it swells, the joints open and the wood starts to decay. Say what the job does from the stages: decayed wood cut out and new pieced in rather than the whole window replaced, joints and putty made good, bare timber primed before any finish, the sashes painted so the paint never reaches the cords and the moving parts, and new putty left to reach the state its maker says can be painted. Older paintwork assessed before it is stripped and never burned off with a flame, as the normal method. On an interior page the card reads as the woodwork: white gloss gone yellow (the old solvent based finish ageing, most away from daylight), doors and skirting chipped through, varnish worn to the wood. Not the film opened by the weather: the category page owns that. |
| Past the point of touching up | a background that has broken down under the finish | A wall filled so often it is more filler than plaster, a ceiling crack that opens every winter, render cracked across rather than in one place, a textured ceiling patched with a mismatch, a kitchen door chipped through every layer: the signs from the trade facts that a touch up no longer holds. The one cause this card makes: a background that has broken down under the finish (loose or hollow plaster, filler in a joint that still moves, a coating with nothing sound to hold to). Say when touching up stops being worth it and what doing the job properly involves, from the stages: loose material off, the wall skimmed or the render repaired, left to dry, primed, then decorated. On a schedule led page: the point on a cycle where a wash down and a recoat no longer holds because what is under the finish is soft or loose, from the done badly row. Not a live source of water: card 2 owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much there is to paint | The size factor from the trade facts price row: the rooms, the ceilings, the drops of paper, the number of doors, sashes or units, the length of steel. Say it plainly and give no figure. |
| What's on the surface now | What has to come off or be put right before the job starts, from the trade facts price row: failed paint, old paper, grease, loose plaster, a damp source, growth or cracked render outside, an older coating that needs testing. Say the business looks before it prices, from [CV: quote_method] only. |
| Getting to it | A tall stairwell, high ceilings, an outside wall that needs a tower or scaffold, a kitchen in use, an occupied building worked round its people, masking for spraying, from the trade facts price row. Say why they add time; never a scaffold or out of hours work promised unless the client values give it. |
| The finish you choose | The options from the trade facts price row and [CV: materials_methods], and why one costs more than another: a washable finish against a plain matt, a pattern to match against a plain paper, brush against spray, a big change of colour that takes more coats. A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us What Needs Painting; We Look at the Surfaces and Price the Job, or We Price Your Job without the site visit practice; We Start on a Date That Suits You).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The cost cards hold the list: never repeat it or point to it. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: the pack gives no standard duration for any decorating job, so give what decides it (the preparation the surfaces need, the coats and the drying between them, which follows the paint and the warmth and air in the room; outside, a dry spell) and no number unless [CV: typical_jobs] confirms one. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| rules | always | Do I need permission for [SERVICE_LOWER]? | From the trade facts rule rows only, put as the thing that usually applies, with "usually" or "in most cases": decorating inside a home needs none; repainting the outside in its colour usually needs no application; a listed home, or a conservation area with a local restriction, can bring consent in for a change of colour, for painting brick or stone never painted before, or for taking off old plaster; a textured ceiling is tested, or treated as if it holds asbestos, before it is disturbed, as the way the work is done, not as homework for the reader; a fire protection coating is applied to the building's own fire specification, held by whoever is responsible for the building. What the customer does only where the row says so; whether the business handles it only from [CV: handles_planning]. Never a standard's number, an Act's name or legal advice. Where the rows give no rule, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words: the surfaces looked at, covered, prepared, primed and finished, named as the work itself. What it does not cover only from the services list, with one sibling service page or the category page linked. | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Then the usual cause under the paint in plain words (moisture behind it, a surface it could not grip, a stain never sealed, a joint that moves, old layers coming away), what the local housing adds (sash windows and older paint layers, pebbledash and render, textured ceilings, fresh plaster) and what this service does about it. Lead or asbestos only as something older homes can have, with testing as the normal step, never a claim about the reader's house and never removal instructions. One figure at most. | Process |

**Seasonal swap.** None (seasonal_trade is off).

**Desire led variant** (`service_page_blocks.A.desire`). Nobody has symptoms of wanting a new colour. A page the library flags `desire_led` (Interior painting and decorating, Wallpapering, Decorative finishes and murals, Furniture and kitchen painting, Spray painting, Coving and cornice) reads this block 4 in place of the one above: the customer's situation, what decides it (the mechanism) and what the work gives them, never a fault invented for it. Everything else on the page (What's Included, block 5, the steps, the FAQ slots, the symptom question) is the type A entry's. There is no emergency variant to win over it. H2: Is [SERVICE] Right for Your Home?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|
| The room you want changed, not rebuilt | the surface as it is now, which sets what has to happen first | The customer's situation: they want the room, the hall, the kitchen or a piece of furniture to look different, and the bones are fine (the plaster sound, the carcasses solid, the layout as they want it). What decides it: the surface as it is now (fresh plaster, old paper, a shiny finish, a textured ceiling, a wall with a history of filler), which sets what has to happen first and whether the result will hold. What the work gives them, from the trade facts stages for this service: on an interior painting page the colour on walls and woodwork; on a wallpapering page a papered wall or a whole hall, lined first where the wall is uneven; on a furniture and kitchen page the units kept and the doors repainted; on a spray painting page units and doors given a smooth sprayed finish where the room can be masked and aired; on a coving page a clean line where wall meets ceiling; on a decorative finishes page a plain wall carrying a painted effect or a mural on a sound, primed base. Never a fault invented for it, never a lifestyle pitch: the surface and the room, not the dream. |
| How it will look when the light comes across it | the preparation under the finish, which shows in low light | The customer's situation: they have seen patchy walls, seams that show, brush marks on doors and bubbles in paper in other houses, and want to know what stops that happening in theirs. What decides it: the preparation and the method, which they will never see once it is done: holes filled and rubbed flat, a repair sealed so it does not drink the paint, lining paper on a wall that is not flat, a key and a primer on a shiny door, a plumb line and a pattern match, the masking and the clean air that spraying needs, the adhesive set before a cove is decorated (the trade facts stages and done badly rows for this service). What the work gives them: a finish that holds up in daylight across the wall. One specific from the stages for this service; never a dig at another trade. |
| Which way of doing it suits the room | the room's use and light deciding the method | The customer's situation: they are weighing two or three ways of doing it (paint against paper, a plain matt against a washable finish, water based against solvent based on the woodwork, hand painted against sprayed units, lining paper against a skim, one cove profile against another, a painted effect against a patterned paper). What decides it: the surface, how the room is used (a hall that gets knocked, a bathroom's steam, a kitchen's grease), the light and how it will be cleaned, from the trade facts materials and methods cell for this service. What the work gives them: the option that suits that room, never the one that is best in general; spray and brush are two methods, not a ranking (the trade facts). A named product only from [CV: materials_methods]. No claim about how long a finish lasts or what it costs unless the rows or the client values give it. |
| What it will need from you afterwards | drying that follows the paint and the room, not the clock | The customer's situation: they want to know what they are taking on once the job is done: when the room can be used, when the doors go back on the units, how long before a paintable paper can be painted, how the finish is cleaned, when a touch up will show. What decides it: the drying and the hardening, which follow the paint's own instructions and the warmth and air in the room rather than the clock (the trade facts: the adhesive dry before paper is painted, the doors back on only once the finish has dried, the cove adhesive set before it is decorated), and what the finish was chosen for. What the work gives them: an honest picture of what the new surface will put up with and what it will not. Aftercare advice as this business's own only when aftercare_advice is confirmed. No times, no promise about how it will look or last. |

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (the problems the town's homes have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the niche steps (no entry of its own). The briefs are town wide, not per category: the pack's section 3 anchors (housing era and what it was built with, exposure, conservation areas and listed buildings where confirmed, the commercial mix), and every mechanism differs from the category and service briefs' on purpose. Every anchor changes the work; none judges the state of anyone's paintwork; lead and asbestos are never claimed for a street or a house. No seasonal swap and no symptom question on a location page. The type is the client's: A. Placeholders: `[WORK]` the primary category's work noun (Painting, Decorating), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town.

- A niche with no section here has its location pages refused: "no location block briefs for painters-decorators".

### Type A (project trade: every client)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Older houses with paint laid on paint | layers of paint and coatings built up over the decades | The town's housing era from the profile (Victorian and Edwardian terraces with timber sash windows and lime plaster, interwar semis with pebbledash or render, post war homes with textured ceilings). The one cause this card makes: layers of paint and coatings built up over the decades on the town's older timber, walls and ceilings. Tie the era to what it means for the work, never to a judgement on anyone's paintwork: old paint layers assessed before they are sanded or stripped, and never burned off with a flame; a textured ceiling tested, or treated as if it holds asbestos, before it is disturbed; an old solid wall given a finish that lets it breathe (the trade facts rows), said as the normal first step. Older homes can have lead in earlier layers and asbestos in older textured coatings: never that a street or a house does, never removal instructions. Not what is under one surface: the service pages own that. |
| Outside walls and timber facing the weather | the weather the town's elevations face | The town's exposure from the profile: coastal salt air, a hilltop that catches wind driven rain, fronts that face south or west, a valley that stays damp. The one cause this card makes: the weather the town's elevations face, which decides which sills, frames, doors and rendered fronts fail first and how long they stay wet. What it means for the work in plain words: the weather side needs more preparation and waits for a dry, settled spell, because damp timber and masonry hold moisture under new paint (the trade facts exterior rows); pebbledash and render that hold water blister paint sooner where their cracks are left. Never that the town's houses are peeling or overdue; never a temperature. Not the paint film opened by the weather as such: the category page owns that. |
| New builds and fresh plaster | plaster still drying out in a new or newly extended home | The profile's new estates, extensions and loft conversions. The one cause this card makes: plaster still drying out in a new or newly extended home. What it means for the work: fresh plaster has to be properly dry before ordinary paint goes on, the first coat is a thinned one where the paint's instructions call for it, and the hairline cracks that open as a new house dries are filled after that coat, when they can be seen (the trade facts plaster rows); painting too soon traps the water and the paint flakes or blisters. No number of days or weeks, no promise about a developer's finish, never a judgement on the estate. |
| Shops, offices and lets turned round between tenants | a building that has to stay in use while it is decorated | The town's commercial mix from the profile: a high street, offices, lets and HMOs, a school or a surgery. The one cause this card makes: a building that has to stay in use while it is decorated, so the work is phased round the people, the trades and the opening hours in it (the trade facts commercial row). What it means for the work: access and sequence agreed before the first day, finishes chosen for how the walls will be cleaned, a landlord's rooms redecorated between tenancies; out of hours work as an arrangement for a job, never a given, and only from the client values. Written only where the services list has a Commercial decorating page; otherwise the card reads as the town's rented homes between tenants. Never fixed hours, never a fire rating or a class promised. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Tall stairwells, bay fronts and getting up to it | Where the town's houses are tall terraces with long stairwells, or fronts with bays and no room for a tower, the work needs more access and more time; parking for the van and somewhere for a scaffold matter on a tight street. Say why that adds time; the town profile says which streets are which. No figure, never a scaffold promised. |
| The age of the surfaces | Older paint layers, lime plaster, textured ceilings and sash windows take assessment, testing or slower methods before they can be touched, and more making good after. From the profile's housing era only, said as what the work meets and never as a judgement on the houses. No figure. |
| Conservation areas and listed homes | Where the town has conservation areas or listed buildings, a change of colour outside or a window repair can need checking with the council first, which adds time before the work can start. "Usually", never the order's, the area's or the Act's name. From the dossier rules only; whether the business handles it only from [CV: handles_planning]. |
| The weather side of the house | An exposed front or a seafront elevation needs more preparation and a settled spell to paint, so an outside job there takes longer than the same wall in a sheltered street. From the profile where it gives the exposure. A day moved by the weather and rebooked only from weather_delays_rebooked. No figure. |

**Steps.** The niche steps (Tell Us What Needs Painting; We Look at the Surfaces and Price the Job; We Start on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (the age of the surfaces, tall or awkward access, an exposed front) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the job? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business looks at (the surfaces and what they need before paint), what comes back. Where the town's conservation areas or listed homes bring a check in for an outside colour change, say it is settled before the work, with "usually"; whether the business handles it only from [CV: handles_planning]. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When is the best time of year for [WORK_LOWER] work? | Inside, any time of year, with the reason the drying slows in a cold, damp room with no air moving. Outside, a dry, settled spell, and why from the paint's side: damp timber and masonry hold moisture under a new film, cold slows the drying, dew late in the day spoils the finish, and the limits are the chosen paint's own, not a season (the trade facts exterior rows). Where the town profile gives the exposure (a seafront, a hilltop, a damp valley), say what it does to that window. No temperature, no month, nothing about spring being busy or booking ahead, no promise about the weather. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

- **Seasonal is per page in this trade and niche wide in code.** The pack (section 2 and its notes for Brandon) calls exterior painting seasonal and interior work not. `seasonal_trade` swaps card 4 and the timing FAQ on every type A page, so it is off here and the exterior weather sits in the exterior briefs and the timing FAQs. If code gains a per page seasonal flag, the Exterior painting, Woodwork and timber finishing and Sash window pages should take a weather card (damp timber and masonry hold moisture under the paint, cold slows the drying, dew late in the day spoils the finish) and the interior pages none. Brandon's call.
- **No duration for any job** (Table A: every row reads "varies; no standard"; Table G). Every "how long" brief gives the factors only. Ask each client for a typical duration for three jobs; until then the copy says it depends on the surfaces, the coats and the drying.
- **No coat count, no recoat time, no drying time** that holds across products (Table E: the figures found are one maker's, for one product; plaster drying is "thoroughly dry", no days). No brief carries a number of coats or hours; "the coats the paint's own instructions call for, more for a big change of colour" is as far as the facts go. Ask Ray whether a client's own standard (from [CV: materials_methods] or [CV: typical_jobs]) may be named on its pages.
- **No exterior temperature threshold** (Table E and G: one maker's page says one figure, its specification another; the facts enter no trade wide minimum). The briefs say the limits are the chosen paint's own and name no temperature. A client who quotes a figure must give the product it comes from, and the product cannot be named.
- **The lead paint and asbestos eras** are in Table E (lead common until the 1960s; textured coatings in buildings built or refurbished before 2000), but the briefs never carry the dates (the pack: dates are easy to get wrong and belong in the facts). Confirm with Ray that the copy keeps to "older homes can have" and testing as the normal step.
- **Artex as a word.** The pack's notes ask Brandon whether a trade mark gone generic is acceptable under the no brands rule. The entry allows it in the page's name, H1, title, card heading and FAQ question only; the running text says textured ceiling. Brandon's call.
- **Who tests and who removes a textured ceiling.** Table E says most textured coating work is non licensed but needs trained people and controls, and large scale removal can be notifiable. The briefs never say this business tests, removes or arranges a licensed contractor: the tick list asks the client (textured ceiling testing arranged), and the Artex removal page should run only for a client who has said what they do.
- **Spraying on site.** Table G: no rule that kitchens must be sprayed in a workshop, and two pack isocyanate systems need controls that can make on site spraying unsuitable. The briefs say spraying needs masking and clean air and nothing more; ask each spraying client where they spray and with what kind of system, so the copy can say it as their practice.
- **Dust sheets, furniture moving, clean up and working hours** (the pack's section 7) have no client value beyond the shared practices (property_protected, tidy_each_day, waste_removal). The briefs name those keys; ask Ray whether the onboarding form should ask decorators about furniture moving and out of hours work directly.
- **Fire protection coatings** have no client value for the specification, the system or the records (Table A: film build measured and recorded, product and inspection records handed over). The briefs write that page to the building's own fire specification and promise no rating or class; a client offering it should confirm they hold the system's documentation. Ask Ray whether the page should be confirm_only in the library.
- **Commercial decorating** has no client value of its own (out of hours, phasing, a landlord's cycle). The briefs write it only where the services list has the page and only as an arrangement for a job; ask Ray whether a `[CV: commercial_work]` style value should gate it.
- **Dulux Select's workmanship guarantee** (Table D: a two year guarantee under the scheme's terms) is never written unless the client is verified on the scheme and the guarantee is in [CV: guarantee_years] and [CV: guarantee_scope]; the Crown and Farrow and Ball schemes are not verified and are never shown.
- **Fence and gate painting** are aliased from this library to the fencing library's Fence staining and treatment page; their briefs are that entry's. Ask Ray whether a decorator who lists them should read a woodwork card here instead.

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| Do I need permission to repaint the outside of my house? | Exterior painting |
| Paint lifting off sills, frames and doors | Exterior painting; Woodwork and timber finishing; Sash window and timber restoration |
| Units, doors and stairs you want kept, not replaced | Furniture and kitchen painting; Woodwork and timber finishing |
| Outside walls and timber facing the weather | Exterior painting |
| Shops, offices and lets turned round between tenants | Commercial decorating |
| Conservation areas and listed homes | Exterior painting; Sash window and timber restoration |
| The weather side of the house | Exterior painting |

## Idea homes

- **the exposed elevation and painting it in a dry, settled spell** (location): home is the 'Outside walls and timber facing the weather' card. Elsewhere: the 'weather side of the house' cost card says only that exposure adds time, and the 'best time of year' FAQ gives the season without describing the town's exposure.
- **old paint layers and older surfaces in the town's housing** (location): home is the 'Older houses with paint laid on paint' card. Elsewhere: the 'age of the surfaces' cost card says only that this adds time, and the cost FAQ names it in a phrase without explaining the layers.

## Related services

The closest other services for each service page, closest first (`related_services`).

| Service | Related |
|---|---|
| exterior painting | Woodwork and timber finishing, Sash window and timber restoration, Spray painting |
| furniture and kitchen painting | Spray painting, Woodwork and timber finishing, Interior painting and decorating |
| interior painting and decorating | Wallpapering, Plaster repairs and skimming, Woodwork and timber finishing |
| spray painting | Furniture and kitchen painting, Commercial decorating, Exterior painting |
| wallpapering | Interior painting and decorating, Plaster repairs and skimming, Decorative finishes and murals |
| woodwork and timber finishing | Sash window and timber restoration, Interior painting and decorating, Furniture and kitchen painting |
| decorative finishes and murals | Wallpapering, Interior painting and decorating, Coving and cornice |
| coving and cornice | Plaster repairs and skimming, Interior painting and decorating, Artex removal |
| plaster repairs and skimming | Artex removal, Interior painting and decorating, Coving and cornice |
| artex removal | Plaster repairs and skimming, Coving and cornice, Interior painting and decorating |
| sash window and timber restoration | Woodwork and timber finishing, Exterior painting, Interior painting and decorating |
| commercial decorating | Interior painting and decorating, Intumescent and fire protection coatings, Spray painting |
| intumescent and fire protection coatings | Commercial decorating, Spray painting, Woodwork and timber finishing |
