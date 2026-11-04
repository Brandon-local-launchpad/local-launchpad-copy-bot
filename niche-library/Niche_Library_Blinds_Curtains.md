# Niche Library Entry: Blinds and Curtains

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/blinds-curtains.json`; this file is the same content for people, kept in the same commit. The model never sees the slot names, only the resolved words.

Business type is **A (project trade)** for every page. The calibration pack's section 2 maps all three GBP categories (Blind Shop, Curtain Fitter, Curtain Shop) to A project, so `category_types` is empty and the client's `business_type` is A whatever the primary tab. The pack's split inside type A (desire led, window led, problem led) is carried in the library's `desire_led` column and in the card briefs, not in a type. Not a seasonal trade (the pack: a time of year only with its reason in the sun or the glass), so `seasonal_trade` is off and there is no seasonal swap. No page is flagged emergency; Awnings is confirm only. Sources, in order: `calibration-packs/Blinds_Curtains_Calibration_Pack_v1.md`, `trade-facts/blinds-curtains.md`, `niche-library/blinds-curtains.csv` with `blinds-curtains-categories.csv`, `fillout/services/blinds-and-curtains-fitters.json`.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Blinds and Curtains / blinds and curtains |
| trade_person / trade_person_plural | blind and curtain fitter / blind and curtain fitters |
| homepage_keyword | Blinds when the client's primary GBP category is Blind Shop, else the primary category as before (the slot is a map by primary category) (4 Nov 2026, Brandon: the homepage keyword is a way of saying the primary GBP category, picked on search volume; the H1 research pattern and the thin runner read it through niche-library/keyword.js) |
| customer_type | homeowners |
| unit_of_work | jobs |
| emergency_niche | no |
| big_ticket | yes (shutters through a whole house, blinds for every window of a new home, a commercial fit out); it only matters for the planning FAQ and the A2 marker, neither of which fires unless [CV: handles_planning] is confirmed |
| schema_subtype | HomeAndConstructionBusiness (the client is a fitter, not a shop; do not invent a store type) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| window, windows, blind, blinds, curtains, bay window, roof window, conservatory, recess, sill, handles, brackets, pole, track, lining, blackout, cord, chain, slats, shutters, the light, privacy, the glass | substrate, fixing ground, glazing, aperture, headrail, vanes, fenestration, soft furnishings, window furnishings, commission, commissioned, accumulation device, breakaway, specification, intu, Perfect Fit, VELUX, bead depth | transform your space, transform your home, transform your room, transform your windows, transform any room, luxurious elegance, timeless elegance, elevate your home, elevate your space, the perfect finishing touch, finishing touch, window treatment, window treatments, window dressing, window dressings, complete blackout, total blackout, totally blackout, completely blackout, pitch black, completely safe, 100% safe, will stay cool, stays cool all summer, cut your heating bills, cuts heating bills, lower your heating bills, slash your energy bills, signs your home needs new blinds, signs you need new blinds, home showroom (the pack's section 7: showroom language, promised blackout, temperature and bills, child safety as a promise, problems invented for desire led services) |

words_avoid_exceptions:
- glazing: allowed in "double glazing", the customer's own word for the windows; never "the glazing" for the glass.
- specification: allowed on the Commercial blinds page, where the building's own fire risk assessment and specification are the documents that decide the fabric and the customer calls them that.
- intu and Perfect Fit: allowed in the page name Perfect fit and intu blinds (the H1, the title and the card heading); running text says fitted frame blinds (the library's prose_name), a blind framed to the glass that clips to the beading, never the brand.
- VELUX: allowed only where [CV: materials_methods] or the client's own services name it; otherwise "roof window blinds" and "the window's make and size code".

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about your windows and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about your windows and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no page is flagged emergency) |

## Steps (type A)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About Your Windows**
   Brief: how to get in touch and what is useful to send first (which rooms, roughly how many windows, what they want the blind or curtain to do: darker, more private, cooler, warmer; photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Measure and Price the Job** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the visit and what gets measured and looked at (the recess and its depth, the handles and the sill, which way the window opens, what is behind the plaster where the brackets will go, the room and when the sun reaches it). Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it); samples brought to the house or a showroom only where [CV: quote_method] or the confirmed practices say so.
   Without the practice (`step_2_no_visit`): **We Price Your Job**
   Brief: a price is agreed before any work starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video, measurements sent in or visit). Only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **We Fit on a Date That Suits You**
   Brief: the fitting date is agreed in advance, to suit the customer, once what was ordered has been made (the making stage in the trade facts). The time between the measure and the fitting only from [CV: start_time]: the trade facts give no lead time for any blind, curtain, shutter or awning, so never a number of days or weeks. Never mention the price, the quote or changes to the order (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

There is no type B wording: every page in this niche is type A.

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | guarantee → manufacturer warranty → insurance (a maker's warranty on a motor, a mechanism or a fabric is common in this trade and is always described as the maker's) |
| fears (in order, one per Why choose us point; the pack's section 1: the home customer's fears are practical) | 1. a blind made too narrow, so light gets in at both sides however good the fabric; 2. curtains that stop short of the sill or the floor, or a track that sags under their weight; 3. a bracket that pulls out of the wall in the first week; 4. paying for a fitted job and getting the look they chose, not the darkness, privacy or warmth they wanted |
| fears_by_type | none: no type B in this niche. The pack's other readers (the awkward window customer, the family customer with corded blinds, the commercial customer) are served by the window led and problem led lines in the block briefs, not by a type. |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies:** BBSA (British Blind and Shutter Association), TrustMark, Guild of Master Craftsmen, AMUSF (Association of Master Upholsterers and Soft Furnishers).
- **Tier 2, manufacturer approvals:** Luxaflex Gallery, VELUX Partner Programme, Markilux specialist dealer. A dealer badge identifies a dealer, never an installation certificate.
- **Tier 3, local credibility:** chamber of commerce, local press features, local awards. Ray's call per client.
- Never shown: BBSA's Make It Safe campaign (a campaign, not a certification), OPSS and Trading Standards (not fitter accreditations). BBSA membership is a code bound business with a complaints process, never a certificate for the job.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure and what it means for the customer if a wall, a window, a floor or a piece of furniture is damaged during the measuring or the fitting. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your work? | Used only when a guarantee or manufacturer warranty is confirmed. Start with yes, then the terms. A maker's warranty on a motor, a mechanism or a fabric is described as the maker's, from [CV: manufacturer_warranty] only; never a fitting guarantee the client values do not give. | no | Trust |
| faq_3_none | What happens if something isn't right after the fitting? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us what isn't right and we'll look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise to come back or put it right for free. Never invent a guarantee. Never say a made to measure order has no comeback: the trade facts say a fault keeps its rights whoever measured, and say nothing about who pays for a wrong measurement. | no | Trust |
| faq_4 | How soon can you fit them? | From [CV: start_time] only, as given, as the time from the order or the measure to the fitting. The trade facts give no lead time for any blind, curtain, shutter or awning (Table G), so never a number of days or weeks that is not in the client values. Code adds "bigger projects are booked further ahead" only when that practice is confirmed. | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. A measuring visit is called free only when [QUOTE_FREE] says so. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How long does it take from measuring to fitting? | What decides it, with no number: the blind, curtain or shutter is made to the measurements after the order (the making stage in the trade facts), so the maker's time, the number of windows and whether a motor or a bent track is involved set the gap. A figure only from [CV: start_time]. The fitting itself runs all year indoors; an awning waits for suitable weather (the trade facts timing cells). | no | Timing |
| faq_B | Why is there still light coming in around my blackout blind? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words: the gap a blind inside the recess needs at each side to run, a blind made narrower than the window, light over the top of the roll or under a curtain that stops at the sill. Then what the local housing adds (a deep recess on a sash window, a shallow reveal on a uPVC window), then the fix from the trade facts fact rows: a blind on the wall across the recess reaching past the frame, side channels, a blind framed to the glass, lined curtains. Say what it reduces; never total darkness (the fact row: a blackout fabric does not decide what happens at the edges). | **yes** | Process |
| faq_C (fallback) | Will my blind sit in the recess or on the wall? | What decides it, from the trade facts stages: the depth of the recess against the handles, tiles or a sill that stands proud. A shallow recess, or a room where the dark matters, sends the blind onto the wall across the recess, covering some wall either side of the frame. A blind framed to the glass is the third choice on a uPVC window: it is held by clips at the beading, so nothing is screwed into the frame. What the brackets go into decides the fixing (plasterboard, a steel or concrete lintel, uPVC), checked for hidden cables and pipes first. Never a figure. | no | Process |
| faq_D (fallback) | What makes a blind child safe? | Calm, and as what usually applies, from the trade facts rule and fact rows: a new blind with a looped cord or chain is sold with a part that holds the loop taut or lets it separate under a pull, and the fitter screws that part to the wall high enough to be out of a small child's reach; a blind made with no cord needs none. This holds in every home, not only where children live. The fitter leaves the warning labels on and shows how the part works. An older blind can have one added. Never a standard's number, never the height as a measurement, never a scare, never blame, never "completely safe". | no | Process |
| faq_planning (big ticket, only if [CV: handles_planning] confirmed) | Will an awning or outside shutters need planning permission? | Point at the trade facts rule rows (Table C) and write what usually applies, with "usually" or "in most cases": an awning on a house is often allowed without an application but not always; a listed home, a conservation area, a flat, or an awning that reaches out over the pavement is where a consent or a licence can come in; a shop's name on the fabric can need its own consent; blinds, curtains and inside shutters need none. What the customer does about it only as the row gives it (check with the council, apply where it is needed). Never an Act's or an order's name, never a size or a height. | no | Process |

Sources for faq_A to faq_D: the pack's section 6 question posts (light round a blackout blind, in or out of the recess, corded blinds) and the trade facts fact rows, reworded. Replace with real customer questions when Brandon or the client supplies them.

### Type B homepage overrides (faq_slots_by_type.B)

None: no type B in this niche, so no homepage overrides by type.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Blinds: roller / Roman / aluminium Venetian / wooden Venetian / faux wood Venetian / vertical / pleated / cellular (honeycomb) / day and night / fitted frame (Perfect Fit)
- Controls: chain / cordless spring / wand / battery motor / mains motor / solar motor / remote control / smart home hub
- Curtains: lined / blackout lined / thermal lined / interlined / unlined / voile; eyelet, pencil pleat, pinch pleat or wave heading
- Tracks and poles: wooden pole / metal pole / uncorded track / corded track / bent bay track / ceiling fixed track / motorised track
- Shutters and awnings: full height, cafe style or tier on tier shutters; cassette, semi cassette or open awning; wind sensor / sun sensor
- Other: side channels / cassette headbox / old blinds and curtains taken away / fixing into uPVC frames / fitting on a conservatory roof

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

roller blinds, Roman blinds, Venetian blinds, wooden blinds, faux wood blinds, vertical blinds, pleated blinds, cellular blinds, honeycomb blinds, perfect fit blinds, fitted frame blinds, day and night blinds, blackout blinds, motorised blinds, electric blinds, smart blinds, conservatory blinds, conservatory roof blinds, roof window blinds, skylight blinds, child safe blinds, blind repairs, blind restringing, blind cleaning, commercial blinds, made to measure blinds, made to measure curtains, curtain making, curtain fitting, curtain alterations, curtain shortening, curtain repairs, relining, curtain tracks, curtain poles, bay window tracks, track bending, motorised curtains, motorised tracks, plantation shutters, shutters, awnings, voiles, sheers, thermal curtains, blackout curtains, pelmets, side channels

## Service words (validator and client block)

GBP service names are shown to the model in the words a homeowner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| ready-made curtains, ready made curtains | (never named: retail, not a service) |
| canopy | (never named) |
| blind measuring | measuring for blinds |
| blind fitting, blind installation | blind fitting |
| blind repair, restringing | blind repairs |
| blind cleaning | blind cleaning |
| safety device, child safe | child safe blinds |
| motorised blind, electric blind, smart blind, automation | motorised blinds |
| conservatory blind | conservatory blinds |
| roof window blind, skylight | roof window blinds |
| commercial blind | commercial blinds |
| commercial curtain | commercial curtains |
| curtain measuring | measuring for curtains |
| curtain fitting, curtain installation | curtain fitting |
| curtain alteration | curtain alterations |
| curtain shortening | curtain shortening |
| curtain repair | curtain repairs |
| track bending | bay window tracks |
| track repair | curtain track repairs |
| pole repair | curtain pole repairs |
| track replacement, curtain track | curtain tracks |
| pole replacement, curtain pole | curtain poles |
| bay window | bay window curtains |
| motorised curtain, smart curtain | motorised curtains |
| made-to-measure curtains, made to measure curtains, bespoke curtains | made to measure curtains |
| design consultation | curtain design |
| blackout curtain | blackout curtains |
| thermal curtain | thermal curtains |
| voile, sheer | voiles |
| shutter | plantation shutters |
| awning | awnings |
| made to measure blinds | made to measure blinds |
| roller blind | roller blinds |
| roman blind | Roman blinds |
| venetian blind | Venetian blinds |
| wooden blind | wooden blinds |
| vertical blind | vertical blinds |
| perfect fit | fitted frame blinds |
| day and night | day and night blinds |
| blind | blinds |
| curtain | curtains |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words a homeowner uses, in the order code picks them (after the client's jobs_wanted). A card never leads with a specialist service (commercial blinds, awnings) unless it is in jobs_wanted. JSON slot: core_services.

- Blind Shop: made to measure blinds, roller blinds, Roman blinds, Venetian and wooden blinds, vertical blinds, conservatory blinds, roof window blinds, motorised blinds, child safe blinds, blind repairs
- Curtain Fitter: curtain tracks and poles, bay window curtains and blinds, curtain alterations and repairs, made to measure curtains, motorised curtains
- Curtain Shop: made to measure curtains, curtain tracks and poles, bay window curtains and blinds, curtain alterations and repairs

Service words for the whole job rather than one service: blinds, curtains, blinds and curtains, made to measure blinds, made to measure curtains, window blinds, blind fitting, curtain fitting. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: blind repairs, curtain alterations, curtain repairs, child safe blinds. When an FAQ question names the job as well as the problem ("Can you make my existing roller blinds child safe?"), it goes to the job's page (Child safe blinds), not the product's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list and the onboarding question for each practice are in niche-library/practices.json (shared by all niches). The briefs here name the practice key a line depends on: `site_visit_before_quote` (step 2), `price_agreed_before_work`, `waste_removal` (the old blinds and curtains and the packaging leaving with the fitter; the trade facts rule row: who takes the waste away is agreed), `property_protected`, `aftercare_advice` (the demonstration and the care instructions at the end of the fitting). A free measuring visit, samples brought to the house, a showroom and a fitting guarantee are never assumed (the pack's section 7). A ticked practice counts as confirmed for the validator and the claims reviewer alike.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every blinds and curtains client for:
- a "from" price for 3 typical jobs (e.g. a roller blind in one window, a bay of made to measure curtains, shutters for a front room);
- a typical time from measuring to fitting for the same 3 jobs (the trade facts give none), and whether fitting is usually one visit;
- whether the measuring visit is free, whether quotes are written, and whether the price is fixed once agreed;
- whether they take the old blinds and curtains away, and who does the work on site;
- which systems and fabrics they fit (for [CV: materials_methods]), whether they fit motors and who does any mains wiring, and whether they fit awnings or outside shutters (for [CV: handles_planning]).

## Section 5 alternative titles (why_titles_alt)

Type A defaults from the Homepage Structure:
1. Track record → **Local Experience at Every Window**
2. Cover → **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": blind shop → blind fitting, curtain fitter → curtain fitting, curtain shop → curtain making and fitting. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs (`category_page_blocks`) use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 and block 5 are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps (A uses the niche steps above) and the FAQ slots. No seasonal swap (`seasonal_trade` is off). Placeholders: `[CAT]` the page keyword without the town (Blind Shop, Curtain Fitter), `[CAT_LOWER]`, `[WORK]` the work noun, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises.

- `seasonal_trade`: no
- `category_types`: empty (every category takes the client's type, which is A)
- A niche with no section here has its category pages refused: "no category block briefs for blinds-curtains".

### Type A (project trade: Blind Shop, Curtain Fitter and Curtain Shop, every page)

The pack's section 2 split inside type A: block 4 below is a mix. Cards 1 and 2 are situations (the desire led services: light, heat and privacy in a room); card 3 is window led (the situation the window's shape, depth or handles creates, never a fault in the house); card 4 is problem led (repairs, alterations, corded blinds: symptom, cause, consequence). Every brief says how it reads on a Blind Shop, Curtain Shop or Curtain Fitter page. The block 4 H2 is not "Common [WORK] Problems": nobody has a blinds problem until the sun comes round, so it asks what the work puts right.

**Block 4, what the work puts right.** H2: What [WORK] Puts Right

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Sun in the room at the wrong time of day | the glass, with nothing at it to check the sun or hold the warmth | A situation card, not a fault: a bedroom light long before anyone wants to wake, a child's room still bright at bedtime in June, glare across the television or a screen in the afternoon, a conservatory or a south facing room too warm to sit in while the sun is on it, and the same glass letting the warmth out on a winter night. What decides it: the glass, with nothing at it to check the sun or hold the warmth, and the hour the sun reaches that window. What the work gives them, said as what it reduces or blocks and never as a temperature or a dark room promised: a blind fitted on the wall across the recess so the light cannot get round the sides, a lined or blackout lined curtain, slats or louvres that tilt the glare away, a roof blind with a reflective backing against the summer heat, a closed blind, shutter or lined curtain that cuts the heat lost through the glass (the trade facts fact row: through the glass, never a saving on a bill, never a figure). By category: Blind Shop reads it as the blind and its fit; Curtain Shop as the lining and where the pole or track ends; Curtain Fitter as the track or pole and how much wall it covers either side of the frame. Never a lifestyle pitch, never a fault invented for it. |
| Overlooked from the street or next door | a window in full view with nothing adjustable at it | A situation card: a front room a step from the pavement, a bathroom window facing the neighbour's landing, a kitchen the whole garden looks into, a bedroom lit from inside at night. What decides it: a window in full view with nothing adjustable at it, so the choice is a bare window or a closed one, and whether the customer wants privacy by day with the daylight kept, or privacy at night with the room lit. What the work gives them, in plain words from the trade facts materials cells: slats or louvres that tilt so the room keeps its light and loses the view in (Venetian and wooden blinds, shutters, vertical blinds); a day and night roller; a voile behind the curtains for the day and lined curtains for the evening. By category: Blind Shop reads it as the tilt and the fabric; Curtain Shop as the voile and the lining; Curtain Fitter as a second track or pole so a voile and a curtain hang together. Never what is in anyone's window today, never a judgement on the street, never "complete privacy". |
| A window nothing off the shelf will fit | the window's shape, depth and handles | Window led: the situation the window causes, never a fault in the house. A bay with three or five faces, a tilt and turn window whose handle swings into the recess, a shallow reveal with no depth for a blind, a sash window with a deep recess, a roof window over a bed, a conservatory with sloping or shaped panes, a tall window on a stairwell. What decides it: the window's shape, depth and handles, which decide where anything can sit and what it can be fixed to. What the work gives them, from the trade facts stages: a blind measured for that recess with room for the handles, or fitted on the wall across it; a blind framed to the glass and clipped to the beading of a uPVC window with no drilling into the frame; a track bent to the shape of the bay so the curtains run round in one, or a blind to each face; a roof window blind chosen by the window's make and size code; shaped blinds measured pane by pane for a conservatory. By category: Blind Shop reads it as the blind and the fixing; Curtain Fitter as the bent track and its brackets; Curtain Shop as the curtains made to the bay's drop and width. Never a brand name for the system. |
| Blinds and curtains that no longer do their job | a worn part, or a fixing that was never right for the wall | Problem led: a roller that drops back down or will not raise, a snapped chain, slats that will not tilt, a pole that droops in the middle, a track pulling away from the wall, hems that drag on the carpet or stop short, a lining gone thin while the fabric is still good, a cord or chain hanging in a loop in a home that now has small children. The one cause this card makes: a worn part, or a fixing that was never right for what is behind the plaster. Say what the fix usually involves, from the trade facts stages: the part matched and replaced (parts for a known make; a blind of an unknown make may not have one), the brackets refixed into whatever is actually there (plasterboard, a steel or concrete lintel, a uPVC frame where its terms allow it), curtains shortened or relined, a device added to an older blind and its warning labels left on. Honest that a repair or an alteration is often the better answer; never a dig at who fitted it, never "past saving" as a sale. Child safety calm and as what usually applies, never a scare. By category: Blind Shop reads it as repairs and child safe blinds; Curtain Fitter as alterations, tracks and poles; Curtain Shop as relining and alterations. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How many windows, and how big | The number of windows and their size move the price more than anything else: more fabric or more slats, a wider roller or a longer track, more brackets, more time at each one (the trade facts price rows). Say it plainly and give no figure. |
| The shape of the window | A bay with its faces, a sloping or shaped pane in a conservatory, a roof window, a curved track: each takes more measuring, a track curved to the bay or a blind per face, and longer to fit than a flat window (the price rows). Say why the shape adds work, without a figure. |
| What the brackets go into, and how high | Plasterboard over a steel lintel, a concrete lintel, a uPVC frame, old plaster that crumbles: each needs its own fixing, and the wall is checked for hidden cables and pipes before anything is drilled (the trade facts stages and fact rows). A stairwell window, a conservatory roof or a roof window adds safe access and time. Say the business looks before it prices, from [CV: quote_method] only. No figure. |
| How it works and what it's made of | A chain against a motor (battery, mains or solar), side channels or a cassette on a roller, a lined, blackout lined or interlined curtain against an unlined one, wood against aluminium slats, a bent track against a straight pole, from the trade facts materials cells and price rows. Name a material or a system only if the trade facts or [CV: materials_methods] give it; a named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (type A). The checker notes "no steps (the niche steps are used)": that is the landscaper's convention too.

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise the three things that move the price for this kind of work (the number and size of the windows, their shape, how the blind or curtain is operated and lined) and how the quote is given, from [CV: quote_method] only. | Price |
| cover | guarantee | Do you guarantee your [WORK_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. A maker's warranty on a motor or a mechanism is the maker's, from [CV: manufacturer_warranty] only. Described, never promised. | Trust |
| cover | insurance | Are you insured for [WORK_LOWER] work? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the fitting? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. Never say a made to measure order has no comeback: the trade facts say a fault keeps its rights whoever measured. | Trust |
| scope | always | What does your [WORK_LOWER] work include? | The jobs themselves, named from the card list (the kinds of blind, curtain, track, shutter or repair the business does), and the size of job taken on, from the services list and [CV: typical_jobs] only. Link one service page. Never "on this page", "listed above" or "the card list" as words: the reader sees no list, so name the work. Measuring is a stage of the job in the trade facts and may be named as one; a free visit only from [QUOTE_FREE]. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business measures and looks at, what comes back. No timescale unless [CV: response_time] is set. Samples, a showroom or a home visit only where quote_method or the practices say so. | Process |
| timing | always | How long does [WORK_LOWER] take from measuring to fitting? | What decides it, from the trade facts timing cells and with no number: the order is made to the measurements before it is fitted, so the maker's time, the number of windows and anything bent, shaped or motorised set the gap; the fitting itself is usually done in one visit for a home's worth of windows only where [CV: typical_jobs] says so. A figure only from [CV: start_time]. Indoor fitting runs all year; nothing about a busy season or booking ahead. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom follows the sun or the season (a conservatory hot from late spring, low winter sun across a screen, a bedroom light at dawn in June), say first that the sun on that glass at that hour is doing what it does, then what is not usual. Then the usual cause in the window or the fitting, in plain words, what the local housing adds (how the houses were built and the windows they were built with, never the state of the reader's windows), and what the business does about it. One figure at most. | Process |

**Seasonal swap.** None: not a seasonal trade.

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (signs you need it, or the desire variant) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps (A uses the niche steps above) and the FAQ slots (cost, timing, cover, rules, scope). No seasonal swap. The service's own trade facts rows (`trade-facts/pack.js rowsForService`) are the material every brief points at, so one type A entry serves roller blinds, bay tracks and blind repairs alike. The type is the parent category's (`category_types`, empty here) else the client's. Placeholders: `[SERVICE]` the page keyword without the town (Roller Blinds, Curtain Tracks and Poles), `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number.

- A niche with no section here has its service pages refused: "no service block briefs for blinds-curtains".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type A (project trade: every page)

Three framings share this one entry, per the pack's section 2: a problem led page (Blind repairs, Curtain alterations and repairs, Child safe blinds) uses block 4 below as written; a window led page (Conservatory blinds, Roof window and skylight blinds, Bay window curtains and blinds) reads the "on a window led page" line in each brief, what the glass or the shape does to the room, never a fault in the house; a desire led page (the library's `desire_led` column: Made to measure blinds, Roller blinds, Roman blinds, Venetian and wooden blinds, Vertical blinds, Perfect fit and intu blinds, Motorised and smart blinds, Curtain tracks and poles, Made to measure curtains, Plantation shutters, Awnings, Commercial blinds) swaps block 4 for the desire variant at the end of this section.

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Measuring the window | The survey and measure stage from the trade facts: the recess and its depth, the handles, the sill and the tiles, which way the window opens, where the sun comes from. A part of the job, not a promise about the quote or a free visit. |
| Choosing the fit and the controls | In the recess or on the wall across it, which side the control hangs, chain, cordless or motor, the lining and the heading for a curtain: from the trade facts materials and methods cell or [CV: materials_methods]. A named product only from [CV: materials_methods]. |
| Checking what the brackets go into | The fixing stage from the trade facts: what is behind the plaster (plasterboard, a steel or concrete lintel, uPVC, timber), the fixings chosen for it, and the wall checked for hidden cables and pipes before any drilling. Never a drill or a fixing named as a brand. |
| Making it to your measurements | The making stage from the trade facts: the blind, curtain, shutter or awning made to the measurements taken. No lead time: the rows give none, and a figure comes only from [CV: start_time]. |
| Fitting the brackets level | The bracket stage from the trade facts: positions marked clear of the mechanism, brackets fixed and levelled, extra supports where the width or the weight asks for them. No figure. |
| Hanging and setting up | The central stage from the trade facts: the roller dropped in, the track or pole up and the curtains hung and dressed, the panels hung and aligned, the motor's travel limits set and the remote or hub paired, named as the trade names it. |
| Safety devices, and showing you how it works | The last stages from the trade facts: any cord or chain device fixed in place, the warning labels left on, the blind or curtain run through its travel and the customer shown how it works. Child safety as what usually applies, calm, never a standard's number. |
| Clearing up and the old ones | Packaging cleared and the room left as it was found. Old blinds or curtains taken away only from the confirmed practices (waste_removal); otherwise say who takes them away is agreed beforehand (the trade facts rule row). |

**Block 4, signs you need it.** H2: Signs You Need [SERVICE]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| What you notice first | a part worn, or a fit that was never right for the window | The things a homeowner notices first, from the trade facts signs row, in their words: a roller that drops back down, a chain that has snapped, slats that will not tilt, a curtain that sticks on the bend of a bay, a glider missing, a hem that has dropped, a chain hanging in a loop. The one cause this card makes: a part worn, or a fit that was never right for the window. Then what it leads to if left, from the skipped row: specific, never alarming (a blind that catches on one side wears its fabric at the edge; a loop left hanging stays within reach). On a window led page (Conservatory blinds, Roof window and skylight blinds, Bay window curtains and blinds) the card is the situation the glass or the shape creates, never a fault in the house: heat under a glass roof by early afternoon, light from overhead in a bedroom, glare the sun throws across the room, gaps at the corners of a bay, with the reason in the sun or the shape. On the Child safe blinds page the card is what usually applies to a new blind, said calmly, and the older blind that can have a device added. |
| Fixings that have let go | a fixing chosen for a different wall from the one it went into | A pole that droops, a track pulling away from the wall, a bracket loose, a frame that comes away from the glass, a cord device that has pulled out of the plaster, from the trade facts signs row. The one cause this card makes: a fixing chosen for a different wall from the one it went into (a plasterboard fixing in a steel lintel, a short screw in old plaster, a loaded track on too few supports). Say what the job does underneath so it stays put, from the trade facts stages and the done badly row: find out what is behind the plaster, check for hidden cables and pipes, fix into it with the fixing made for it, add supports where the weight asks for them. No depth or screw size the rows do not give; never a dig at who fitted it. On a window led page: what holds a blind on a sloping pane or a roof window (brackets made for that window, or the make and size code that finds them), and the weight of a bay's curtains on the bends of its track. On the Child safe blinds page: the device fixed firmly and up out of a small child's reach, as what usually applies, never the measurement. |
| Gaps where the light gets through | a covering narrower, shorter or looser than the window it is on | Light at the sides of a blind, over the top of the roll or under a curtain that stops at the sill; curtains too narrow to meet; light between the sections of a bay; one shaped pane of a conservatory left bare; light round a roof window blind with no side rails, from the trade facts signs rows. The one cause this card makes: a covering narrower, shorter or looser than the window it is on. Say what the job does about it from the stages and fact rows: measured again for that window, fitted on the wall across the recess so it reaches past the frame, side channels or side rails, a lining or an interlining, curtains made to the full width with room to overlap, each face of a bay measured on its own. Say what it reduces; never total darkness (the fact row: the fabric does not decide what happens at the edges). On the Child safe blinds and Blind repairs pages the card reads as the gap a cut down or badly fitting older blind leaves, and that measuring for a new one is where the fix starts. Not a fixing that has let go: card 2 owns that. |
| Repair it, make it safer, or replace it | wear or age past the point a part can be matched | The customer's question on every problem led page: whether what they have is worth keeping. The one cause this card makes: wear or age past the point a part can be matched. From the trade facts stages and fact rows: a part is matched to the make and replaced where one exists (parts availability decides what can be done; a part of an unknown make may have no match); a fabric still good is relined, shortened or rehung rather than replaced; an older corded blind has a device added, or is replaced with one made with no cord, as what usually applies, with the warning labels left on; a repair that touches the controls refits the safety devices. Honest that a repair or an alteration is often the better answer, and plain about when it is not (a frame distorted, a fabric frayed from running unevenly, a part no longer made). Never a scare, never blame, never a standard's number, never "completely safe", never a dig at another trade. On a window led page: an old flat blind under a sloping pane, or a blind cut down for a roof window, against one made for that glass. Not a fixing (card 2) and not a gap (card 3). |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How many windows, and how wide | The size factor from the trade facts price row: the number of windows or panes, the width of the roller or the span of the track, the fabric and lining a wider or longer curtain takes. Say it plainly and give no figure. |
| The shape and the height of the window | A bay's faces, a sloping or shaped pane, a roof window, a stairwell window: the bending, the extra measuring and the safe access they need, from the trade facts price row. Say why they add time. No figure. |
| What the brackets go into | Plasterboard over a steel lintel, a concrete lintel, a uPVC frame, a heavy curtain that needs more supports, from the trade facts price row. Say the business looks at the wall before it prices, from [CV: quote_method] only. |
| How it works and how it's finished | A motor against a chain, battery against mains (new wiring is electrical work in its own right), side channels or a cassette, the lining, the heading, wood against aluminium, from the trade facts price row and [CV: materials_methods]. A named product only from [CV: materials_methods]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The niche steps above (Tell Us About Your Windows; We Measure and Price the Job, or We Price Your Job without the site visit practice; We Fit on a Date That Suits You).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), rules, scope.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: every row for this trade says the time varies and gives no standard, so never a number; a maker's minutes for one product in the rows is not the job and is never written. What decides it instead (the number of windows, the access, a motor to set up, a track to bend) and that the fitting runs all year indoors; an awning waits for suitable weather. The gap between the measure and the fitting only from [CV: start_time]. This is the one place the timing is written. | Timing |
| cover | guarantee | Do you guarantee your [SERVICE_LOWER] work? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. A maker's warranty on a motor, a mechanism or a fabric is the maker's, from [CV: manufacturer_warranty] only. Described, never promised. | Trust |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the fitting? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. Never say a made to measure order has no comeback: the trade facts say a fault keeps its rights whoever measured. | Trust |
| rules | always | Do I need permission for [SERVICE_LOWER]? | From the trade facts rule rows only, put as the thing that usually applies, with "usually" or "in most cases": fitting a blind, a curtain or an inside shutter in a home needs none; an awning or an outside shutter is where a rule can come in (a listed home, a conservation area, a flat, an awning reaching over the pavement, a shop's name on the fabric), and the customer checks with the council and applies where it is needed; a motor wired into the mains is electrical work that in some cases has to be done by a registered electrician or notified, while a plug in or battery motor is not; on the Commercial blinds page, the fabric's fire performance follows the building's own fire risk assessment, never one rule for every building. Never a standard's number, an Act's name or legal advice. Where the rows give no rule, say no permission is usually needed for this work at a home and leave it there. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words: the measuring, the making, the fixing and the setting up. What it does not cover only from the services list, with one sibling service page or the category page linked. Taking the old ones away only from the confirmed practices (waste_removal). | Fit |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked. Where the symptom follows the sun or the season (a conservatory hot from late spring, low winter sun across a screen, a bedroom light at dawn in June), say first that the sun on that glass at that hour is doing what it does, then what is not usual. Then the usual cause in the window or the fitting, in plain words, what the local housing adds (the windows the houses were built with, never the state of the reader's), and what this service does about it. One figure at most. | Process |

**Seasonal swap.** None: not a seasonal trade.

**Desire led variant** (`service_page_blocks.A.desire`). Nobody has symptoms of wanting Roman blinds. A page the library flags `desire_led` (blinds-curtains.csv: 33 rows whose target is Made to measure blinds, Roller blinds, Roman blinds, Venetian and wooden blinds, Vertical blinds, Perfect fit and intu blinds, Motorised and smart blinds, Curtain tracks and poles, Made to measure curtains, Plantation shutters, Awnings or Commercial blinds, the pages the pack's section 2 lists as desire led) reads this block 4 in place of the one above: the customer's situation, what decides it (the mechanism) and what the work gives them, never a fault invented for it. Everything else on the page (What's Included, block 5, the steps, the FAQ slots, the symptom question) is the type A entry's. No page is flagged emergency, so nothing wins over it. H2: Is [SERVICE] Right for Your Windows?

| Card | Mechanism (what decides it) | Brief |
|---|---|---|
| The room, and what you need the window to do | what the room is used for, and when the sun reaches it | The customer's situation: a bedroom slept in past dawn, a child's room at bedtime in summer, a living room with the television against the light, a kitchen or bathroom with steam and splashes, a home office with a screen, a north facing room that loses its warmth through the glass at night, a patio too hot to sit on at midday (Awnings), a shop or office with glare across the screens (Commercial blinds). What decides it: the light, the privacy, the heat and the damp at that window, and the hour the sun reaches it. What the work gives them, from the trade facts materials cell for this service, said as what it reduces or blocks: a blackout lined curtain or a blind on the wall across the recess for the dark, slats that tilt for privacy with daylight kept, a wipeable slat or a fabric made for a wet room, a reflective backing against the heat, a closed blind, shutter or lined curtain that cuts the heat lost through the glass (through the glass, never a bill, never a figure), an awning that shades the patio and comes in when the wind gets up. Never a temperature, never total darkness, never a look sold, never a fault invented for it: the room and its use, not the showroom. |
| The part you can't judge from the sofa | the measuring and the fixing, which decide whether it works | The customer's situation: they have priced a ready made blind or an online made to measure one and want to know what a fitter who measures adds. What decides it: the measuring and the fixing, which the customer cannot judge once the fabric is up: whether the blind sits in the recess or on the wall across it; how much wall it covers either side of the frame; the clearance the handles need to turn and the window to open; how much of the glass a raised blind or an open pair of curtains still covers; what is behind the plaster where each bracket goes, and the wall checked for hidden cables before the drill touches it, from the trade facts stages for this service. What the work gives them: those decisions made at the window by the person who will fit it, so the thing works in that room. One specific from the stages for this service; never a dig at the online seller or at another trade; no figure the rows do not give. |
| Which option suits the window | the window's shape, depth and handles deciding the option | The customer's situation: they are weighing two or three ways of doing it (a roller against a Roman, wood against aluminium slats, a blind framed to the glass against one on the wall, a chain against a cordless spring or a motor, a battery motor against a mains one, a pole against a track, a track bent round the bay against a blind to each face, shutters against blinds for a street facing room, a lined curtain against a blackout lined one, a cassette awning against an open one). What decides it: the window's shape, depth and handles, the room's use, and how much looking after they want, from the trade facts materials and methods cell for this service (a framed blind only where the beading is deep enough; a mains motor only where the wiring can be run, and new wiring as electrical work in its own right; an awning rated for the wind it will meet). What the work gives them: the option that suits their window, never the one that is best in general. A named product or brand only from [CV: materials_methods]. No claim about lifespan, lead time or cost unless the rows or the client values give it. |
| What it will need from you afterwards | what the covering needs to keep working | The customer's situation: they want to know what they are taking on once it is up. What decides it: what the covering needs to keep working, from the trade facts stages and fact rows for this service (slats and fabrics dusted or brush vacuumed and cleaned as the care instructions supplied with them say, never washed on a guess; a battery motor's power kept up as its maker says; a cord or chain device left fixed where it was put and the warning labels left on; an awning brought in when the wind gets up or the rain sets in, and never put away wet; a fabric with a fire finish cleaned only as its own instructions allow, on a commercial page). What the work gives them: an honest picture of what it saves them and what it does not. Never a promise about how it will look or last, never a lifespan; a repair visit offered only where the services list has the page. |

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (the problems the town's homes have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the niche steps. The briefs are town wide, not per category: the town profile, the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED). The pack's section 3: windows are set by the age and style of the house, so the anchors are housing era and the windows it was built with, terraces on the pavement, flats with a uniform look, roof windows where the research confirms loft conversions, a commercial mix; every anchor must change the work; never the state of anyone's windows today, never draughty or dated. No seasonal swap and no symptom question on a location page. The type is the client's, never a category override. Placeholders: `[WORK]` the primary category's work noun, `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town.

- A niche with no section here has its location pages refused: "no location block briefs for blinds-curtains".

### Type A (project trade: every client)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Windows set by when the houses were built | the windows the town's houses were built with | Bays that a straight pole will not go round, sash windows with deep recesses, uPVC windows with shallow reveals, tall windows on a landing. The one cause this card makes: the windows the town's houses were built with, which the town profile dates. Say what each era means for the work and nothing about its state. The older terraces and semis, from Victorian to interwar, have their bays: a curved track that follows the angles, or one blind to each face. Period terraces have sash windows with deep recesses: a blind inside the recess with room for the catch. Homes put up or extended in the 1980s and 1990s have uPVC frames: a blind framed to the glass that clips to the beading, so nothing is screwed into the frame. New estates have plasterboard reveals over steel lintels: the fixing chosen for what is actually there, and the wall checked for cables first. Converted mills and Georgian townhouses have tall windows: heavier curtains, more supports, safe access. Said as how the houses were built, never as the state of anyone's windows today, never that a street's windows are draughty, dated or due for replacement (the pack's section 3). Not a worn part or a loose fixing as faults: the town's category and service pages own those. |
| Front windows a step from the pavement | a front window on the pavement with nothing adjustable at it | Living rooms that passers by look straight into by day, and that light up like a stage at night. The one cause this card makes: a front window on the pavement with nothing adjustable at it; the town profile says which streets are terraced or fronted straight onto the road. What the work gives in plain words, from the trade facts materials cells: slats or louvres that tilt so the room keeps its daylight and loses the view in, a day and night roller, a voile for the day with lined curtains for the evening; where the profile gives blocks of flats whose lease asks for one look from outside, a plain backing the street sees. Where the profile gives a commercial centre and the services list has Commercial blinds, the card may add glare across the screens of offices and shops on the main street. Never what is in anyone's window today, never a judgement on the street. Not the glass and the sun: the category page owns that. |
| Rooms under the roof and glass extensions | glass overhead, which the sun reaches all day | A loft bedroom light from overhead at dawn, a conservatory nobody sits in from late spring until the sun is off it, a kitchen extension with a glass roof that is a greenhouse by midday. The one cause this card makes: glass overhead, which the sun reaches all day long with nothing in the way; the town profile says where lofts have been converted and where the estates were built with conservatories (the pack's section 3: only where the research confirms it). What the work gives, from the trade facts stages: a roof window blind chosen by the window's make and size code, with side rails where the dark matters; conservatory roof blinds measured pane by pane, with a reflective backing against the heat; the fitting planned round safe access to a roof. Said as what it reduces, never a temperature promised. Not a window a ready made blind will not fit: the category page owns that. |
| Blinds and curtains that came with the house | coverings fitted for a previous owner's use of the room | New owners with blinds cut for the last household's use of the room, a corded blind in what is now a child's room, curtains made for a different window, a track whose gliders are long gone. The one cause this card makes: coverings fitted for a previous owner's use of the room (the profile: a new estate where the builder's blinds were a stop gap, an older street where homes change hands with their curtains). What a first visit sorts out, from the trade facts stages: each window measured again rather than assumed, a device added to an older corded blind with its warning labels left on, as what usually applies, curtains relined or shortened where the fabric is good, a blind of a known make repaired where its parts exist. Never a judgement on the previous owner, never a scare about the cords, never "past saving" as a sale. Not a worn part as a fault: the Blind repairs page owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Streets of bays and sash windows | Where the town's older streets were built with bays and deep sash recesses, a bay takes a track bent to its shape or a blind to each face, and a deep recess takes more measuring than a flat uPVC window. Say why that adds time, from the town profile where it gives the housing era (the trade facts price rows: bay faces, custom bending, more units). No figure. |
| Tall windows and roof glass | A stairwell window, a conservatory roof, a roof window over a bed or a landing: the fitting is planned round safe access and takes longer than a window reached from the floor (the trade facts price rows: high access). From the profile where it gives tall period houses, converted lofts or conservatories. No figure. |
| What's behind the plaster on the newer estates | Plasterboard reveals over steel lintels, concrete lintels in post war homes, uPVC frames: each takes its own fixing, and the wall is checked for hidden cables and pipes before any drilling (the trade facts stages and fact rows). Say the business looks before it prices, from [CV: quote_method] only; the era from the profile. No figure. |
| Listed homes and conservation areas | Where the town has listed buildings or conservation areas, an awning or outside shutters can need consent before they go up, and some things cannot be done at all; a blind or curtain inside usually needs nothing. "Usually", never the order's or the area's official name. From the dossier rules only; otherwise a check with the council as something that sometimes applies. No figure. |

**Steps.** The niche steps (Tell Us About Your Windows; We Measure and Price the Job; We Fit on a Date That Suits You).

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (bays and shaped windows, height and access, what the brackets go into) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | guarantee | Do you guarantee your work in [TOWN]? | Start with yes, then the terms from [CV: guarantee_years] and [CV: guarantee_scope]. Described, never promised. | Trust |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays or who it covers. | Trust |
| cover | always | What happens if something isn't right after the fitting? | Open with what the customer does: tell us and we look at it. Then the reasonable care and skill standard every trade works to. No promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the customer sends, what the business measures and looks at, what comes back. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Do you work in [TOWN] all year round? | Yes for anything indoors: the trade facts timing cells put blind, curtain and shutter fitting in any month. An awning or anything fixed outside waits for suitable weather, and a conservatory roof or a roof window for safe access on the day. Where the town profile gives the housing (conservatories on the estates, converted lofts), say what it means for the fitting, not for the diary. Nothing about a busy season or booking ahead. No dates. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

Things a brief wanted that neither the calibration pack nor the trade facts pack gives. Each brief says "from the trade facts rows only" or leaves the point out until one of these is answered.

1. **Desire led pages.** The pack's section 2 lists them under its "Desire led" bullet: made to measure blinds and curtains, roller, Roman, Venetian, vertical, fitted frame and motorised blinds, curtain tracks and poles, plantation shutters, awnings, commercial blinds. blinds-curtains.csv now flags every row whose target is one of those twelve pages (33 rows), so the desire variant above is read on them. The three window led pages (Conservatory blinds, Roof window and skylight blinds, Bay window curtains and blinds) are not flagged: the pack keeps them out of the desire led list, so they read the problem led block 4 through its "on a window led page" lines. Brandon to say if the window led pages should be flagged desire led instead; that is a CSV change, not this entry.
2. **Curtain tracks and poles is desire led by the pack but takes repair rows.** Curtain track repairs, Curtain pole repairs, Curtain track replacement and Curtain pole replacement alias to it, so a client who ticks only the repairs still gets a desire led page. The desire card briefs cover a replacement (what decides it, which option); a pure repair reads oddly there. If that matters, the library needs a Curtain track and pole repairs page or the aliases moved, not a change here.
3. **No lead time and no duration for any job.** Table A says "varies; no standard" for every service and Table G confirms no cross trade range was verified; the one figure in the rows (a roof window maker's minutes for one of its own blinds) is a product claim, not a job. Every timing brief gives what decides the gap and no number, and the onboarding questions ask the client for a typical time from measuring to fitting.
4. **Child safety figures.** Table E carries the device position and the pull cord fitting height as figures. Per the brief, no entry text repeats them: every child safety line says the device is fixed up out of a small child's reach, as what usually applies, with the warning labels left on, and never a standard's number. If Ray wants the figure on the Child safe blinds page it has to come from the fact row on the day, not from here.
5. **Energy figures.** Table E gives the tested reductions in heat loss through one glazing assembly for a roller blind, a shutter, a honeycomb blind and a zipped roller, and says they are not bill savings. The briefs say "cuts the heat lost through the glass" and never a percentage or a bill; the pack's section 4 bans a promised temperature or a cut in bills. The figures stay in the fact rows for a blog post if ever wanted.
6. **What is in the client's hands around the fitting.** The pack's section 7 bans free measuring visits, home showrooms, fitting guarantees and lead times as this client's practice unless confirmed, and practices.json has no blinds keys for them: the briefs lean on [QUOTE_FREE], [CV: quote_method], `site_visit_before_quote`, `waste_removal` and `aftercare_advice`. A blinds block in practices.json (samples brought to the house, old blinds taken away, the demonstration at the end, mains wiring by a registered electrician) would let the copy say what the client actually does.
7. **Bay tracks: bent where?** The pack's example says a track is bent on site; Table A says manufacturer bent or factory bent. The facts win: every brief says "a track bent to the shape of the bay" and never where, until the client says what they do.
8. **Perfect fit and intu.** Table A verifies the Perfect Fit clip in system and says the intu method was not independently verified; Table G lists it as a gap. The briefs describe one system (a frame clipped to the beading with nothing screwed into the window frame) and never the brands; the page keeps its name through the words_avoid exception and reads "fitted frame blinds" in prose (the library's prose_name).
9. **Commercial fabrics.** Table C and E say the fire performance of a commercial fabric follows the premises' own fire risk assessment and that no one standard type applies to every hotel, office or care room; the rules slot and the desire cards say so and name no type, class or standard. A client who does this work should confirm it in jobs_wanted, and the words_avoid exception for "specification" is there for that page only.
10. **Awnings and the weather.** Table E gives one maker's minimum pitch for rain as that maker's figure, not a rule. The briefs say an awning is brought in when the wind gets up or the rain sets in and never put away wet, and give no angle. Awnings is confirm only in the library; the planning FAQ fires only when [CV: handles_planning] is confirmed.
11. **Motorised blinds and wiring.** Table C says a hard wired motor is electrical work with notification only for the specified cases in England, and battery, solar and plug in motors create none. The briefs say "in some cases" and name no Part, no circuit and no room; who does the wiring (the client or an electrician) is an onboarding question.
12. **The pack's homepage voice.** Section 1 names four readers and gives the home customer's fears in one line (a blind too narrow, curtains that hang short, a fitting that pulls out of the wall); the fourth fear above is drawn from its first paragraph (chooses a look but buys a result). Brandon to confirm they are the right four.
