# Niche Library Entry: Removals

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/removals.json`; this file mirrors it for people. The model never sees the slot names, only the resolved words.

Business type is **D (a move)** for the whole niche, per the Removals Calibration Pack v1, section 2: a dated event with the customer's belongings in someone else's hands. Every GBP category (Removals Company, Removals Service, Self Storage Facility) and every page target is D, including office moves, storage, single items, pianos, antiques and house clearance. No category differs, so `category_types` is empty. The split inside D is by the stage of the move and is written into the briefs: a home move reads the stages of moving day (survey and pack, load, the wait between homes, unload and place); an office move the stages of a business move; packing and dismantling the preparation stage; storage the stage between homes; single items and pianos one short day for one piece; house clearance the stages of a clearance. Type D has no symptoms and no faults: no page is problem led or desire led. A client hand set to type A has no briefs in this entry (the hand set-up defaults to A: set D).

Sources, in order of authority: `calibration-packs/Removals_Calibration_Pack_v1.md` (sections 1, 2, 4 and 7), `trade-facts/removals.md` (Tables A to G, generated 20 Oct 2026, not yet verified), `niche-library/removals.csv` and `removals-categories.csv`, `fillout/services/removals-company.json`.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Removals / removals |
| trade_person / trade_person_plural | removals firm / removals firms |
| customer_type | homeowners, renters and local businesses |
| unit_of_work | moves |
| emergency_niche | no (the library flags no page emergency) |
| big_ticket | no |
| schema_subtype | MovingCompany (a schema.org subtype of LocalBusiness) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) | Banned (a block on first use: banned_phrases) |
|---|---|---|
| move, moving day, completion day, the keys, van, lorry, boxes, packing, unpacking, furniture, sofa, wardrobe, bed, piano, stairs, lift, parking, flat, house, old home, new home, storage, survey, quote, crew | relocation, relocate, logistics, consignment, goods, assets, household effects, effects, operatives, premises, property, residence, solutions, white glove, bespoke, end to end (words_avoid_exceptions: goods is allowed in the phrase goods in transit where [CV: insurance_cover] gives it; premises on an office and commercial removals page where no plainer word fits; property once on a house clearance page where the client's own words use it) | seamless, seamless relocation, seamless move, stress free, stress free move, hassle free, treat your belongings like our own, like our own, we never break anything, nothing will break, moving made easy, smooth move, peace of mind, take the stress out of moving, your move, our priority (the pack's section 7: logistics brand language and promises that nothing will break) |

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Get your [QUOTE_FREE_LOWER] moving quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about your move and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about your move and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency page in the library) |

## Steps (type D: survey, pack, move)

The pack's section 2: steps are survey, pack, move for every row. Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About Your Move**
   Brief: how to get in touch and what is useful to say first (where from and where to, the date if there is one, how many rooms, anything big, heavy or awkward, the stairs, lifts and parking at both ends, a video or photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Survey and Price Your Move** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the survey (at the home or by video, only as [CV: quote_method] gives it) and what it settles, from the trade facts Table A first stages: what is going and what is staying, what has to come apart, the doors, stairs, lifts and parking at both homes, whether packing is wanted. Say that the van, the crew and the day are planned off that list, never a size or a number. Follows [CV: quote_method]; only say the quote is written if quote_method says so; a price fixed before the day only when the price_agreed_before_work practice is confirmed. Never restates "free" (FAQ 5 owns it).
   Without the practice (`step_2_no_visit`): **We Price Your Move**
   Brief: a price is agreed before the day. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no video, call, form or visit). Only say the quote is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **We Pack, Load and Move You In**
   Brief: the day in order, from the trade facts Table A stages: packing beforehand where it is booked, the home protected, the van loaded, the wait for the new home to be open where the move completes that day, then unloading to the room each box is labelled for. Beds and furniture put back together only where dismantling and reassembly is in the services list or confirmed. The date is agreed in advance. Never a time of day, an arrival time, a crew size or a finish time. Never mention the price or the quote (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | insurance → guarantee (removals customers ask about cover for the load first; a work guarantee is rare in this trade) |
| fears (in order, one per Why choose us point; the pack's section 1) | 1. a van that does not turn up on the day, or turns up late with no word; 2. the keys arriving late and the day running out before everything is in; 3. a scratched table, a box of broken plates, and nobody owning up to it; 4. a sofa or a wardrobe that will not go through the new door or up the stairs |
| fears_by_type / faq_slots_by_type | not used: the whole niche is one type, so there is nothing to override |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Checkatrade, Trustpilot or Which? Trusted Traders.
- **Tier 1, trade bodies:** BAR (British Association of Removers), NGRS (National Guild of Removers and Storers), Move Assured.
- **Tier 2, specialist groups:** BAR Overseas Group, FIDI FAIM (international moves), ICEFAT (fine art transport), Self Storage Association UK.
- **Tier 3:** an operator licence or a waste carrier registration is a check, not a badge, and is named only as the client values confirm it; chamber of commerce, local press features, local awards. Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured if something gets damaged on the move? | The cover figure from [CV: insurance_cover] and what it is for (the load in transit, or public liability: only as the client values say which). From the trade facts Table E: the van's own motor insurance is not cover for what it carries, so cover for the load is a separate thing; its limits and what it leaves out (boxes the customer packed, items of high value) sit in the policy and the contract, so say it is worth asking what the terms say. Never a figure the client values do not give, never a scheme's name unless confirmed. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your service? | Used only when a guarantee is confirmed. Start with yes, then the terms from [CV: guarantee_scope]. Never a promise that nothing will break, never a fixed arrival or finish time, never a scheme's guarantee (an advance payment guarantee covers a deposit if a member firm fails, not damage: Table D) as this client's unless the client values carry it. | no | Trust |
| faq_3_none | What happens if something is damaged during the move? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us as soon as it is seen, and we look at it. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. Then what usually applies, from Table E: what the cover pays and what it leaves out sits in the policy and the contract, so it is worth reading them before the day. No promise to replace or pay out. Never invent a guarantee or a cover figure. | no | Trust |
| faq_4 | How far ahead do I need to book? | From [CV: start_time] only, as given. The reason moving dates bunch, only as the calibration pack gives it: completion days and tenancy dates fall at month ends, on Fridays and through the summer, so those dates go first. Never "we get busy", never a lead time the client values do not give. | no | Timing |
| faq_5_free | Is the survey and quote free? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | What happens if the keys are late on moving day? | Why the wait happens and what the crew does, as what usually applies: the old home can be loaded before the new one is open, and the crew waits for the call; the reason keys come late (the money moving between the solicitors) from the calibration pack's craft rules, never as a time of day or a promise. From the trade facts: a late handover changes the shape of the day (Table A timing), and unloading cannot start until the new home is open (Table B). What happens when the day slips to the next (the load held, or put into store) only where the services list has Storage or the client values confirm it; how that is charged only from [CV: price_list]. | no | Timing |
| faq_B | Will my furniture fit into the new place? | Use the assigned local situation (an access situation, not a fault: terrace stairs with a turn at the top, a flat above a shop, a third floor with no lift, a parking court the lorry cannot enter) and its linked local issue. Three genuinely different things that decide it, from the Table B signs rows: the route itself (doors, stairs, landings and the turns between them), the piece (beds and wardrobes come apart; a sofa loses its feet and doors; a piano goes on its own equipment), and where the van can stand (a long carry, or a smaller van to shuttle). Then what the survey settles about it before the day. Dismantling in the quote only as the services list has it. Never promise it will fit, never force it (Table B done badly). | **yes** | Process |
| faq_C (fallback) | Should I pack myself or have you pack? | From the Table A packing stages and Table E: what a packing service covers (the contents and what is left out agreed, materials chosen, items wrapped and packed, every box labelled for its room, an inventory where agreed), what the customer's own packing changes (Table E owner packed row: damage in boxes the customer packed can be left out of the cover under the policy's terms, so say it is worth checking, never that it is or is not covered), and that boxes and materials are included only as the quotation says. A packing service only where the services list has one; link the page where LINKABLE PAGES has it. Never a number of boxes or a packing time. | no | Fit |
| faq_D (fallback) | Do I need to arrange parking for the van? | From the Table C parking row only: whether a bay suspension or a dispensation is needed depends on the council and the street, and where one is, the application goes to the council; who applies (the customer or the firm) only from the confirmed practices or the client values. Say it is worth looking at the parking at both addresses before the day. No lead time, no fee, no council named. Never that parking in the area is impossible. | no | Process |
| faq_E (fallback, only when the services list carries the Storage page) | Can you store my things if the dates don't line up? | From the Table A storage stages and the Table E storage row: what goes into store is listed on an inventory or a receipt as agreed, wrapped and held until release; the term, what is included and whether redelivery is in the price come from the agreement, never a shortest or longest term. Link the storage page. Never a facility described as this client's (a container, a warehouse) unless [CV: materials_methods] ticks it. | no | Fit |
| faq_clearance (fallback, only when the services list carries the House clearance page) | Can you take away the things I don't want? | From the Table E waste rows: moving a customer's belongings is not the same as taking their rubbish; a business that carries other people's waste usually needs to be registered as a waste carrier, and the householder is expected to check the register before handing waste over. Registration as this client's only from [CV: waste_carrier_registered]; otherwise say the general position and that the customer can check the public register. Where it goes (reuse, donation, recycling, an authorised route for electricals) from the Table A clearance stages. Never a penalty figure, never an Act's name. | no | Trust |

Sources for faq_A to faq_D: the pack's section 1 fears and section 6 question posts (completion timing, loading before completion, parking suspensions, what removals insurance covers), reworded. Replace with real customer questions when Brandon or the client supplies them.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`).
- Packing: full packing service / fragile items only packing / unpacking service / wardrobe cartons / boxes and materials supplied / crate hire
- Protection: floor runners / door and banister guards / furniture blankets / mattress and sofa covers / export wrapping and crates
- Vehicles and lifting: removals lorry / Luton van / small van for single items and shuttles / tail lift / piano moving equipment
- Storage: containerised storage / self storage units / short term storage between homes / archive and document storage
- Other: furniture dismantling and reassembly / parking suspensions applied for on the customer's behalf / out of hours office moves / registered waste carrier for clearances / house clearance with reuse and recycling

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

removals, house removals, home removals, local removals, long distance removals, international removals, office removals, commercial removals, business removals, packing, packing service, unpacking, export packing, crate hire, furniture dismantling, furniture reassembly, furniture assembly, storage, containerised storage, self storage, archive storage, document storage, single item removals, small moves, man and van, piano removals, antique removals, fine art removals, safe removals, house clearance, end of tenancy clearance, office clearance, student removals, pre move survey, video survey, inventory, parking suspension, goods in transit

## Service words (validator and client block)

GBP service names are shown to the model in the words a customer uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| furniture assembly, furniture disassembly | furniture dismantling and reassembly |
| furniture storage, moving-related storage, warehouse storage services, self storage, archive storage, document storage, container storage | storage |
| in-county moving, local moving, student removals | local house removals |
| inter-county moving, long-distance moving | long distance removals |
| international moving, export packing | international removals |
| business and corporate-related moving, it equipment relocation | office and commercial removals |
| object-related moving assistance, oversized item moving, shared moving services, small furniture moving, safe removals, man and van | single item and small moves |
| moving-related packing, packing & moving supplies, unpacking service, crate hire | packing services |
| moving-related waste removal, end of tenancy clearance, house clearance, office clearance | house clearance |
| piano removals | piano removals |
| antique removals, fine art removals | antique and fine art removals |
| senior moving, vehicle transport, alarm monitoring, carry-in service, climate controlling, dollies, forklift rental, move-in trucks, online payments, package placement | (never named) |

## General service words (FAQ page matching)

Core services per category (homepage cards), in the words a customer uses, in the order code picks them (after the client's jobs_wanted). JSON slot: core_services.

- Removals Company: local house removals, packing services, storage, office and commercial removals
- Removals Service: local house removals, long distance removals, packing services, storage
- Self Storage Facility: storage, packing services

Service words for the whole job rather than one service: removals, house removals, home removals, moving house, moving, a move. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page. JSON slot: general_service_words.

Problem words: none (type D has no problem words; a question that names access or parking goes to the page whose service it names). JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices (`niche-library/practices.json`, shared by all niches). The practices the removals briefs name: `site_visit_before_quote` (step 2 as a survey), `price_agreed_before_work` (a price fixed before the day), `property_protected` (the home protected before anything is carried), `customer_need_not_be_home` (the access FAQ), `waste_removal` (a clearance's waste taken away). Who applies for a parking suspension, whether a lift is booked with a managing agent and whether packing happens the day before are stated as this client's only from the client values or a confirmed practice; there is no practice key for them yet (see the closing section).

## Onboarding questions this niche needs

The Master Context Document (section "Per business type", Removals) asks for: BAR membership; the goods in transit cover figure; whether packing and storage are offered; access limits (floors, parking). The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every removals client for:
- a "from" price for 3 typical moves (e.g. a one bedroom flat locally, a three bedroom house locally, a packing service);
- whether the quote is written and whether the price is fixed once agreed;
- the goods in transit cover figure and whether owner packed boxes are covered under the policy;
- whether the firm applies for parking suspensions on the customer's behalf;
- whether dismantling and reassembly, and unpacking, are included or priced separately;
- for storage: whether redelivery is included;
- for house clearance: the waste carrier registration number.

## Section 5 alternative titles (why_titles_alt)

1. Track record → **Moving Days Planned in Order**
2. Cover → **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": removals company → removals, removals service → removals, self storage facility → storage. The category page briefs use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 and block 5 are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps, the FAQ slots and, with `seasonal_trade` on, the swap. Placeholders: `[CAT]` the page keyword without the town, `[CAT_LOWER]`, `[WORK]`, `[WORK_LOWER]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned local situation. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises.

- `seasonal_trade`: no. The pack: removals is not seasonal in the gardening sense; demand peaks at month ends, on Fridays and in summer because completions and tenancy dates are set then, and timing is mentioned only with that reason, never "we get busy in summer". No seasonal card and no seasonal FAQ.
- `category_types`: empty. Every category is D.
- A niche with no section here has its category pages refused: "no category block briefs for removals".

### Type D (a move: every category)

The pack's section 2: type D has no symptoms and no faults. Every block 4 card is one stage of the move, written as what happens and why it matters: before the day (survey and pack), at the old home (load), the gap (keys, travel, storage), at the new home (unload and place). Each brief says how the card reads on a Removals Company, Removals Service or Self Storage Facility page, and where a category's cards lead with office moves or clearances.

**Block 4, the stages of the move.** H2: How [WORK] Works, Stage by Stage

| Card | Mechanism (why it matters) | Brief |
|---|---|---|
| The survey that sets up the day | the list the whole day is planned from | A stage card, never a fault: the survey (at the home or by video, only as [CV: quote_method] gives it) and what it settles, from the trade facts Table A first stages: what is going and what stays, what has to come apart, anything heavy, fragile or awkward, the doors, stairs, lifts and parking at both ends, whether packing is wanted and when it happens (usually before the day, from the Table A packing stages). Why it matters, from Table B done badly: a list that misses things is where lost items and a slow unload start, so the van, the crew and the day are planned off an accurate list. By page: Removals Company and Removals Service read it as the home move's survey; Self Storage Facility as what is going into store, listed and measured; where the category's cards lead with office moves, as the site survey, the move plan and the labelling of every desk and box to where it goes. Never a crew or van size, never a fixed price or a written quote as this client's unless the client values confirm it. |
| Loading at the old home | the order things go on decides the order they come off | The load stage from the trade facts Table A: the home protected before anything is carried (floors, door frames, the banister: name one specific from the protection ticks where there is one, otherwise as what careful work involves and never this client's kit), furniture wrapped, the heavy pieces on first and boxes packed round them so nothing moves on the road, the things wanted first at the other end on last. Why it matters: what goes on first comes off last, so the loading plan is the unloading plan. Nothing lifted by a set number of people and no weight: lifting follows the piece and the route (Table C manual handling). By page: Self Storage Facility reads it as the load for the store, listed as it goes on; office moves as loading in phases by floor or department, every item labelled; single items and pianos as the protection and securing of one piece. Never "nothing will break". |
| The wait between the two homes | unloading waits on the new home being open | The gap stage: on a sale, loading goes ahead at the old home while the new one is not yet released, and the crew waits for the call. Why keys come late is the calibration pack's craft rules (the money moving between the solicitors), given as what usually happens and never as a time of day or a promise. From the trade facts: a late handover changes the shape of the day (Table A timing), and unloading cannot start until the new home is open (Table B). What happens when the day slips to the next (the load held overnight, or put into store) only where the services list has Storage or the client values confirm it; how that is charged only from [CV: price_list]. By page: a long distance move reads this as the journey and its plan, a dedicated van or a shared load as agreed (Table A); Self Storage Facility as the weeks or months in store, listed and wrapped until release, with no term named; an office move as the window between close of business and opening time. Never a promise about when completion happens. |
| Unloading and getting furniture in | the new home's doors, stairs and turns decide what comes apart | The unload and place stage from the trade facts Table A: each box to the room on its label, furniture where it is asked for, the beds first so there is somewhere to sleep that night, pieces that came apart put back together only where dismantling and reassembly is in the services list or confirmed (Table E: it has to be said in or out of the quote), then the delivery check that closes the job. The thing the customer fears most, from the Table B signs rows (the sofa that will not go through the doorway, the wardrobe too big for the route): how it is usually got in (the sofa stripped of its legs and cushions, a bed or a wardrobe broken down into its panels, a smaller van to shuttle where the lorry cannot get near) and that the route at the new address is measured at the survey, so the right kit is on the van. By page: where the category's cards lead with clearances, the card is the end of a clearance (the house left empty, what was kept handed over, the rest gone for reuse, donation or recycling, the disposal records kept: Table A clearance stages); an office move as desks and kit in place and checked against the asset list before opening. Never force a piece through a door (Table B done badly). |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| How much is going | The volume factor from the trade facts Table F: the number of rooms and how full they are, and the loft, garage and shed that get forgotten. Say it plainly and give no figure, never a van size or a number of loads. |
| Access at both ends | The access factor from Table F: stairs with no lift, a long carry from where the van can stand, parking that has to be arranged, a narrow route that means furniture comes apart. Say why each adds time, and that both addresses count. No figure. |
| Packing, dismantling and the extras | From Table F and Table E: a packing service, items that need their own handling (a piano, antiques), dismantling and reassembly, each in or out of the quote as the quotation says, and boxes and materials included only as it says. From the services list only; a sibling service page linked where LINKABLE PAGES has one. Code adds the price line from [CV: price_list] when there is one. |
| Distance, dates and a wait between homes | From Table F: the distance and whether the move runs over more than a day, a dedicated van against a shared load, a delayed delivery or storage in between. Month end, Friday and summer dates only with the completion reason from the calibration pack, never "busy". How a hold or a night on the van is charged only from [CV: price_list]. No figure. |

**Steps.**

1. **Tell Us About Your Move**
   Brief: How to get in touch and what is useful to say first (where from and where to, the date if there is one, how many rooms, anything big or awkward, the stairs, lifts and parking at both ends, a video or photos if they have them). No promise of a reply time unless [CV: response_time] is set.
2. **We Survey and Price Your Move**
   Brief: The survey (at the home or by video, only as [CV: quote_method] gives it) and what it settles: what is going and what stays, what has to come apart, the access and parking at both homes, whether packing is wanted. Follows [CV: quote_method]; only say the quote is written if quote_method says so; a price fixed before the day only when the price_agreed_before_work practice is confirmed. Never restates "free". Never a crew or van size.
3. **We Pack, Load and Move You In**
   Brief: The day in order: packing beforehand where it is booked, the home protected, the van loaded, the wait for the new home to be open where the move completes that day, then unloading to the room each box is labelled for. Reassembly only where it is in the services list or confirmed. Never a time of day, an arrival time, a crew size or a finish time. Never mention the price or changes to the plan.

**FAQ slots.** Five before the local situation question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is reached, from [CV: quote_method] only (a survey at the home or by video only as it gives it), and that the price is agreed before the day when the price_agreed_before_work practice is confirmed. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| cover | insurance | Are you insured for [WORK_LOWER]? | The cover figure from [CV: insurance_cover] and what it is for (the load in transit, or public liability: only as the client values say which). From Table E, the limits and what the cover leaves out sit in the policy and the contract, so say it is worth asking. Never what it pays or who it covers, never a figure the client values do not give, never a scheme's name unless confirmed. | Trust |
| cover | always | What happens if something is damaged on the move? | Open with what the customer does: tell us as soon as it is seen, and we look at it. Then the reasonable care and skill standard every trade works to. No promise to pay out or replace. Never invent a guarantee or insurance. | Trust |
| scope | always | What does your [WORK_LOWER] service cover? | The work itself, named from the card list (the home moves, the packing, the storage, the single items, the office moves and the clearances, only those the services list has) and the size of move taken on, from [CV: typical_jobs] only. Whether beds are taken apart and put back, and whether boxes are supplied, only from the services list and the client values (Table E). Link one service page. Never "on this page", "listed above" or "the card list" as words: the reader sees no list, so name the work. | Fit |
| process | always | What happens when I ask for a quote? | From [CV: quote_method] and the confirmed practices only: what the customer sends or shows, what the survey covers (the list, the access and parking at both ends), what comes back and whether it is written. No timescale unless [CV: response_time] is set. No fixed price claim unless the price_agreed_before_work practice is confirmed. | Process |
| timing | always | When should I book my move? | From [CV: start_time] where it is set. Otherwise the reason moving dates bunch, from the calibration pack: completion days and tenancy ends land at month ends, on Fridays and through the summer, so those dates are taken first and a date with more room is easier to get. Never "we are busy", never a lead time the client values do not give, no dates. | Timing |
| symptom | a local situation tagged with the category | [SYMPTOM]: what does it mean for a move? | The assigned local situation (a street of permit parking, terraces with narrow stairs, flats with no lift, a parking court the lorry cannot enter, a lane with a width limit) and its linked local issue, answered as asked: what it changes about the day in plain words (where the van stands, how far things are carried, what comes apart, whether a smaller van shuttles), what is checked at the survey, and what the customer does about it (a suspension applied for with the council where the street needs one: Table C, no lead time, no fee). One figure at most. Never that parking in the town is impossible or the streets dangerous; never what is inside anyone's home; never who is moving in or out. | Process |

**Seasonal swap:** none (seasonal_trade is off).

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts; every removals service has 6 or 7, so the role based set below is the fallback for a thin pack, F-ITEMS-GENERIC); block 4 (the stages of this job) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps and the FAQ slots (D: cost, timing, cover, access, scope; a sixth, rules, only when the service has Table C rule rows, which every removals service has). The service's own trade facts rows are the material every brief points at, so one type D entry serves a house move, a piano and a clearance alike. Placeholders: `[SERVICE]` the page keyword without the town, `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number, no Act's name.

- A niche with no section here has its service pages refused: "no service block briefs for removals".
- The block 4 mechanisms differ from the category page briefs' on purpose (MECHANISMS USED).
- No desire variant: the pack's section 2 lists no desire led page, and the library's `desire_led` column is blank on every row.

### Type D (a move: every service)

Seven framings share this one entry, per the pack's section 2, and each brief says how it reads for each: a home move (local, long distance, international) as the stages of moving day; an office move as the stages of a business move; packing and dismantling as the preparation stage; storage as the stage between homes; a single item as one short day; a piano or an antique as the handling of one piece; a house clearance as the stages of a clearance (authority, what is kept, what goes where, the house left empty).

**What's Included.** H2: What's Included in Our [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| Agreeing what's moving and what isn't | The survey and inventory stage from Table A for this service: the list the job is planned from, what stays, anything heavy, fragile or awkward. A part of the job, not a promise about the quote. |
| Checking the access at both ends | Doors, stairs, lifts, turns and where the van can stand, from the Table A assessment stages. Parking arranged, and who arranges it, only as the confirmed practices give it. |
| Protecting the home and the furniture | Floors, door frames and banisters covered, furniture wrapped, from the Table A protection stages. A specific from the protection ticks where there is one; otherwise what careful work involves, never this client's kit. |
| Packing, or checking what's packed | The packing stage from Table A where packing is booked; where the customer packs, the boxes checked as sealed and labelled before loading. Boxes and materials included only as the quotation says (Table E). |
| Loading in the order it comes off | The loading stage from Table A: the heavy pieces first, boxes built round them, what is wanted first at the other end on last. Never a number of people per lift or a weight (Table C manual handling). |
| The journey and any wait | The transport stage from Table A, and the wait for the new home to be open where the move completes that day. A hold or storage in between only where the services list has it. |
| Unloading, placing and the final check | Each box to the room on its label, furniture where asked, reassembly only where it is in the services list, and the delivery check that closes the job, from the Table A final stages. |

**Block 4, the stages of this job.** H2: How [SERVICE] Works, Stage by Stage

| Card | Mechanism (why it matters) | Brief |
|---|---|---|
| What gets settled before the day | the stage the rest of the job is planned off | A stage card, never a fault: the first Table A stage for this service as the customer sees it. For a home move, the survey and the move plan; for packing, what is being packed and what is left out; for storage, what is going in and for how long, listed; for an office move, the site survey, the move plan and every desk and box labelled to where it goes; for a piano or an antique, the route checked at both ends and the piece's condition noted (Table A: condition and the agreed value recorded before collection); for a clearance, who has the authority to clear the house (an executor or administrator where it is an estate: Table E probate row, said plainly, never as legal advice) and what the family keeps. Why it matters, from Table B done badly: a list that misses things is where lost items and delays start. Never a fixed price or a written quote as this client's unless the client values confirm it; never a crew or van size. |
| Protection before anything is lifted | the layer between the piece and the doorway | The protect and wrap stage from Table A for this service: furniture wrapped, floors and door frames covered, a mattress or a sofa in its cover, fragile items wrapped and packed upright, a piano or an artwork in its own protection or a crate (Table A piano and antique rows), things going into store wrapped so dust stays off (Storage). Name one specific from the confirmed ticks where there is one; otherwise what careful work involves, never this client's kit. Why it matters, from Table B done badly: scratches and breakages come from unsuitable protection and packing, not from the road. On a house clearance page the card is what is set aside first: what the family keeps, what goes for reuse or donation, electricals and upholstered furniture kept apart for their own routes (Table A clearance stages). Never "nothing will break". |
| Lifting, loading and the road | what is heavy, awkward or valuable sets the method | The move and load stages from Table A for this service: the route through the house walked first, pieces that will not go taken apart (dismantling only where it is in the services list or the quote: Table E bed dismantling row), each piece lifted and secured on the van so nothing shifts, then the journey. The number of people on a lift and the kit (a piano on its own equipment, a tail lift, a smaller van for a lane or a parking court) follow the piece and the route, never a rule (Table C manual handling: no set weight, no set number). For a long distance or international move, the journey's plan: a dedicated van or a shared load as agreed (Table A); customs paperwork for an international move only as the client confirms it handles it, never a form's name or a relief's detail. For storage, the load into the store checked against the inventory. For a clearance, the sorted contents out and the waste to an authorised route (Table A). Never force a piece through (Table B done badly). |
| Placing, rebuilding and checking | the job ends when everything is where it was asked for | The final Table A stage for this service: boxes to the room on their label, furniture where asked, beds rebuilt first where reassembly is in the scope, the delivery check against the list. For a piano, placed, with a technician's check and tune recommended after any move (Table E piano row: no interval). For antiques, unpacked and the condition checked against the record made before collection. For storage, release and redelivery as the agreement sets out (whether redelivery is in the price only from the client values: Table E). For an office move, desks and kit checked against the asset list before opening. For a clearance, the house left empty and the disposal records kept (Table A). Never a finish time; unpacking included only where the services list has it. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much there is to move | The volume factor from the Table F price row for this service: the rooms and how full they are, the loft and the garage; for packing, the contents and the fragile items; for storage, the space taken and the agreed term; for a clearance, how much is going and how many kinds of waste. Say it plainly and give no figure. |
| Stairs, lifts and where the van can stand | The access factor from the Table F price row: stairs with no lift, a long carry, a building with restricted hours or access for an office move, a tight route for a piano, parking that has to be arranged. Say why each adds time; both addresses count. No figure. |
| The handling the job needs | From the Table F price row: dismantling and reassembly, piano equipment, crating, export packing, a condition record for antiques, hazardous or specialist disposal on a clearance, IT handling on an office move. From the services list and the confirmed ticks only; a sibling service page linked where LINKABLE PAGES has one. Code adds the price line from [CV: price_list] when there is one. |
| Distance, dates and holds | From the Table F price row: the distance and a move that runs over more than a day, a dedicated van against a shared load, storage or redelivery, a wait between homes. Month end, Friday and summer dates only with the completion reason from the calibration pack, never "busy". How a hold or a night on the van is charged only from [CV: price_list]. No figure. |

**Steps.** The category type D steps above, with step 1 reading "what is going" in place of "how many rooms": How to get in touch and what is useful to say first (where from and where to, the date if there is one, what is going, anything big or awkward, the stairs, lifts and parking at both ends, a video or photos if they have them). No promise of a reply time unless [CV: response_time] is set.

**FAQ slots.** Five before the local situation question: cost, timing, one cover question (the first whose condition holds), access, scope; a sixth, rules, when the service has Table C rule rows.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is reached, from [CV: quote_method] only, and that the price is agreed before the day when the price_agreed_before_work practice is confirmed. The four cost cards above already give what moves the price: name one factor at most, never the list again. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: the rows say it varies and give no standard, so give what decides it (how much is going, the access at both ends, whether packing is in the job, the wait for the new home to be open, the distance) and the order of the day rather than its clock. Never an arrival time, a finish time or a number of hours. Nothing about when the job can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what it is for (the load in transit, or public liability: only as the client values say which). From Table E: the van's motor insurance is not cover for what it carries; the limits, and what is left out (boxes the customer packed, items of high value), sit in the policy and the contract, so say it is worth asking. On an antiques page, a value agreed before the move (Table A) only as the client values confirm the arrangement. Never what it pays or who it covers, never a figure or a scheme the client values do not give. | Trust |
| cover | always | What happens if something is damaged during [SERVICE_LOWER]? | Open with what the customer does: tell us as soon as it is seen, and we look at it. Then the reasonable care and skill standard every trade works to. No promise to pay out or replace. Never invent a guarantee or insurance. | Trust |
| access | always | Do I need to sort parking or be there on the day? | From [CV: access_handling] and the confirmed practices only: whether the customer is there at each end, keys, who applies for a bay suspension where the street needs one (Table C: it depends on the council and the street; no lead time, no fee), a lift booked in a block. When nothing is on file, say the arrangements are agreed at the survey and nothing more. Never a council rule or a lead time the research does not give. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words. What it does not cover only from the services list (packing, dismantling, storage and unpacking are each in or out as the quotation says: Table E), with one sibling service page or the category page linked. Never "on this page" or "listed above": name the work. | Fit |
| rules | the service has rule rows | Is there anything I need to arrange or check for [SERVICE_LOWER]? | From the trade facts rule rows only, put as what usually applies, in plain words. The licences, drivers' rules and vehicle rules are the firm's to hold and need nothing from the customer: say so without an Act's name, a weight or a number. What is the customer's: a parking suspension where the street needs one (apply to the council); on a clearance, checking the clearer is a registered waste carrier on the public register; on an international move, the customs paperwork the move needs, only as the client confirms it handles it; on a storage contract, what the agreement says about release and redelivery. The usual cooling off right for a service booked at a distance does not usually apply to a move booked for a set date (Table C), said as something worth knowing, never as advice. Never a standard's number, a penalty figure or legal advice. | Process |
| symptom | a local situation tagged with the service or its category | [SYMPTOM]: what does it mean for [SERVICE_LOWER]? | The assigned local situation (an access situation: permit parking, terrace stairs with a turn, a flat with no lift, a parking court, a lane with a width limit) and its linked local issue, answered as asked: what it changes about this job in plain words (where the van stands, how far things are carried, what comes apart, whether a smaller van shuttles), what is checked at the survey, and what the customer does about it (a suspension applied for with the council where the street needs one: Table C, no lead time). One figure at most. Never that parking in the town is impossible; never what is inside anyone's home; never who is moving in or out. | Process |

**Seasonal swap:** none. **Desire led variant:** none (see the closing section).

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (what the town's streets and homes do to a move) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How far ahead should I book a move in [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the type's category page steps. The briefs are town wide: the pack's section 3 says access is the strongest local detail in this trade, and every anchor must change the work (a permit zone only matters because it explains the suspension; a terrace only matters because it explains the stairs and the dismantling). Every mechanism differs from the category and service briefs' on purpose. No seasonal swap and no local situation question on a location page. The type is the client's. Placeholders: `[WORK]` the primary category's work noun (Removals, Storage), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town.

- A niche with no section here has its location pages refused: "no location block briefs for removals".
- The pack's section 3 bans: streets described as dangerous, congested or impossible; parking rules or lead times the research does not give (say "check with the council"); what anyone's home contains; a neighbourhood's residents described as moving away or arriving.

### Type D (a move: the client's type is D)

**Block 4, what shapes a move in the town.** H2: [WORK] in [TOWN]: What Shapes the Day

| Card | Mechanism (why it matters) | Brief |
|---|---|---|
| Permit streets and where the van can stand | the kerb the van can use decides how far everything is carried | The town's parking from the profile: residents' permit zones, controlled bays, loading restrictions on the main roads, terraces where a lorry blocks the road. The one thing this card makes: the kerb the van can use decides how far everything is carried. What it changes, in plain words: a bay suspension or a dispensation applied for with the council where the street needs one (Table C: it depends on the council and the street; no lead time, no fee; where the research gives nothing, say to check with the council), a smaller van shuttled where the lorry cannot stand near the door, a longer carry priced in. Never that parking in the town is impossible or the streets congested; never a lead time the research does not give; never who lives on the street. |
| Old houses, narrow stairs | the way the town's houses were built sets what has to come apart | The housing from the profile: the older terraces with narrow stairs and a turn at the top, cottages with low doors, converted houses with shared stairs. The one thing this card makes: the way the town's houses were built sets what has to come apart. What it changes: wardrobes, beds and sofas measured at the survey and taken apart or stripped of feet and doors before they come down (dismantling in the quote only as the services list has it), the banister and the door frames protected first. An era says what the work meets, never a judgement on the homes, and never what is inside them. Not the new home's doors: the service pages own that. |
| Flats, lifts and long carries | the floors between the van and the front door | The town's flats from the profile: purpose built blocks with or without a lift, flats above shops with one stair, new blocks with a lift to book and a parking court the lorry cannot enter. The one thing this card makes: the floors between the van and the front door. What it changes: a lift booked with the managing agent where there is one (as this client's practice only from the confirmed practices), a carry up the stairs that takes longer with every floor, a shuttle van from the court to the door. Never a floor count as a price, never a judgement on a block or its residents. |
| Lanes, estates and the way in | the route the lorry can take to the door | From the profile: rural lanes with width or weight limits, new estates with tight cul de sacs and parking courts, a market town's one way streets. The one thing this card makes: the route the lorry can take to the door. What it changes: a smaller van for the last stretch and the load transferred, more of the day spent on the road. A limit only as the profile gives it, never a figure. Where the town is all one kind of street, the card is the drive from the base and what it takes out of the day, from [CV: travel_distance] only and never as a time. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Parking and the carry | Where the van can stand and how far it is to the door, the suspension where the street needs one, from the town profile where it gives the streets. Say why a long carry adds time. No figure. |
| Stairs and lifts | Floors without a lift, a lift to book, narrow stairs that mean furniture comes apart, from the profile where it gives the housing. Say why each adds time. No figure. |
| Getting the lorry to the door | Lanes and limits, cul de sacs and parking courts, a shuttle van for the last stretch, from the profile where it gives them. Say it plainly. No figure, no limit as a number. |
| The date and the distance | The drive from the base only where [CV: travel_distance] gives it; month end, Friday and summer dates with the completion reason from the calibration pack, never "busy"; a wait or a night on the van charged only from [CV: price_list]. No figure. |

**Steps.** The category type D steps (Tell Us About Your Move; We Survey and Price Your Move; We Pack, Load and Move You In), by the fallback.

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the things that push the price up in a town like this (parking, stairs, the carry, the drive) and how the quote is reached, from [CV: quote_method] only. | Price |
| town | start_time | How far ahead should I book a move in [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what it is for (the load in transit, or public liability: only as the client values say which). Never what it pays or who it covers; the limits sit in the policy and the contract (Table E), so say it is worth asking. Never a scheme's name unless confirmed. | Trust |
| cover | always | What happens if something is damaged on the move? | Open with what the customer does: tell us as soon as it is seen, and we look at it. Then the reasonable care and skill standard. No promise to pay out or replace. Never invent a guarantee or insurance. | Trust |
| process | always | What happens when I ask for a quote in [TOWN]? | From [CV: quote_method] and the confirmed practices only: a survey at the home or by video only as it gives it, what gets checked at both ends (the list, the stairs, the parking), what comes back and whether it is written. No timescale unless [CV: response_time] is set. | Process |
| timing | always | When do most people move in [TOWN], and does it matter? | The reason moving dates bunch, from the calibration pack: completion days and tenancy ends fall at month ends, on Fridays and through the summer, so those dates are taken first. Where the profile confirms it, the town's own pattern (a university's year end, holiday lets changing hands) said as when moves cluster, never as who is leaving or arriving. Never "busy", no dates, no lead time the client values do not give. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

- **No desire led pages, so no desire variant.** The pack's section 2 lists no page as desire led and has no desire led heading: every row is type D, split by the stage of the move, with no symptoms and no faults. The `desire_led` column was added to `removals.csv` as the last column and left blank on every row. If Brandon wants a desire variant for a page (storage between homes is the nearest fit: nobody has symptoms of needing a store), it needs a line in section 2 first.
- **Completion timing is not in the trade facts pack.** The calibration pack's craft rule 3 and its examples say keys are usually released once the money has moved between solicitors, which can be the afternoon, and its notes for Brandon ask the trade facts pack to carry the same wording. `trade-facts/removals.md` has no such row (Table A says only that a delayed handover affects the day; Table B that unloading waits on access). The briefs for the wait card and the keys FAQ point at the calibration pack for the reason and at the facts for the consequence, and never give a time of day. A Table E row on completion and key release is wanted before the pack is verified.
- **What happens when completion slips** (the load held on the van overnight, or put into store, and how it is charged) is in the pack's examples but not in the facts pack beyond "storage in transit where agreed". The briefs allow it only where the services list has Storage or the client values confirm it, and the charge only from [CV: price_list]. Ask the client what they do and how it is priced.
- **Who applies for a parking suspension** (the firm or the customer), whether a lift is booked with a managing agent, and whether packing happens the day before are stated as this client's only from the client values or a confirmed practice, and `practices.json` has no key for any of them. Three removals practices are wanted: parking suspension applied for by the firm; lift booking handled by the firm; packing the day before the move.
- **Insurance and liability.** The facts (Table E) say the van's motor cover is not cover for the load, that goods in transit limits and exclusions depend on the policy and the contract, that owner packed boxes can be excluded under the terms, and that a per item limit is not a universal rule. The briefs say only that the limits sit in the terms and are worth asking about. The onboarding needs the goods in transit cover figure, whether it is goods in transit or public liability (or both), and whether owner packed boxes are covered under this client's policy.
- **Scheme membership.** BAR, NGRS, Move Assured, FIDI, ICEFAT and the SSA are in `logo_tiers` from Table D, shown only when Ray has verified the client on the register. The BAR code's fixed price written quotation and its advance payment guarantee are membership terms, not law, and no brief states them as this client's practice.
- **House clearance** is confirm only in the library (an exact page row of that name). The facts carry the waste carrier registration, the householder's duty to check the register, the probate authority and the routes for electricals and upholstered furniture; the briefs use them as what usually applies and name the registration as this client's only from [CV: waste_carrier_registered]. Ask a clearance client for the registration number and whether they take hazardous items or sharps (the facts say these are arranged separately).
- **Durations.** Table G: no duration range or seasonal window was found for any of the 11 services, so every timing brief gives what decides the time and the order of the day, never a number of hours, an arrival or a finish time.
- **International moves.** The facts carry customs and relief detail (ToR1 for inward moves, declarations by route). The pack's section 7 bans customs or visa detail the client has not confirmed, so the briefs allow customs paperwork only as the client confirms it handles it and never a form's name. Ask an international client what paperwork they handle.
- **The hand set-up defaults business_type to A** (`server.js`), and this entry has D briefs only, like the cleaning (B) and pet care (C) entries. A removals client set up by hand must be set to D, or its category, service and location pages are refused.
