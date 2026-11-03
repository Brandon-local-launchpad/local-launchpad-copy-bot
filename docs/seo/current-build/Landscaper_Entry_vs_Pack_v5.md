# Landscaper entry against calibration pack v5 (3 Nov 2026)

A read of `niche-library/landscaper.json` and `Niche_Library_Landscaper.md` (written against pack v4, 23 to 27 Oct) against `calibration-packs/Landscaper_Calibration_Pack_v5.md`. Nothing in the entry has been changed; this is the list for Brandon to decide on. 20 contradictions, 3 json/md mismatches, 5 weaker cases.

## Business type per GBP category

1. **`category_types`** holds only gardener → B and lawn care service → B. The pack's section 2 table makes Landscape Gardener, Paving, Decking and Tree service "A project" whatever the client's type; in code any other category takes the client's type, so a B client's paving, decking, tree and landscape gardener pages get the B briefs. Change: add landscape gardener, paving contractor, deck builder and tree service → A.

## Desire led, problem led and schedule led block 4 cards

2. **`category_page_blocks.A.problems.cards`**: every card is a fault with one cause. The pack (section 2) wants a mix for Landscape Gardener: situations for desire led projects, symptoms for problem led ones; "the sign is the customer's situation, not a fault". Change: at least one situation card, like the pack's section 5 "A garden you look at but don't use".
3. **The one A card set serves every A category**: the cards are about paving with no fall, an uncompacted base, timber posts and layout; there is no tree card. The pack wants Tree service cards on "situations and warning signs in trees" and Decking on "boards, joists and posts". Change: per category card briefs, or cards neutral across categories.
4. **`service_page_blocks.A.problems`** ("Signs You Need [SERVICE]") gives failure cards to every A service, including patios, decking installation, pergolas, ponds, artificial grass, paths, steps, turf laying and tree planting. The pack: "nobody has symptoms of wanting a patio"; section 7 lists invented symptoms as a failure. Change: a desire led variant with situation cards and its own H2.
5. **Schedule led services under an A category** (driveway sealing, decking restoration, mulching, weed control) take the A fault cards. The pack: "write what slips and when". Change: the block 4 frame per service, not only per category type.
6. **`category_page_blocks.B.problems.cards[1..3]` on a Lawn care page**: hedges, weeds and borders. The pack: Lawn care is "what the customer sees in the lawn and which season's treatment deals with it". Change: a lawn led card set for lawn care service.
7. **B block 4 briefs ask for no time of year** (category cards 0 to 3, service cards 1 to 3). The pack (sections 2 and 4.3): "the moments in the year a visit matters most", "write what slips and when", "most good cards and FAQs in this trade have a time of year and a reason for it". Change: each B brief asks for the time of year and the reason in the plant.

## The readers and their fears

8. **`fears`** are four project fears, used for every type. The pack's section 1: the maintenance customer buys reliability over months; section 7 bans implying design capability for a maintenance client. Change: a type B fears list.
9. **Homepage `faq_A` and `faq_D`** ("How long does a garden landscaping project take?", "What is the best time of year to landscape a garden?") have no B variant and faq_A is the default Q7. Change: B versions (how often visits are needed, what a visit covers).

## Local detail rules

10. **`location_page_blocks.B.problems.cards[1]`** names "privet and laurel put in when the street was built". Pack section 3: never name species the research does not support. Change: a species only when the town profile gives it.
11. **The same card's mechanism** says the town's hedges are "wide at the top, bare at the base and over the pavement". Pack section 3: never claim an area's gardens are overgrown or turn an era into a judgement. Change: what the hedge's age means for the work.
12. **`location_page_blocks.B.problems.cards[2]`** anchors on who lives in the town (commuters, retired owners). Pack section 3 anchors are ground and growth. Change: a ground or growth anchor.
13. **`location_page_blocks.A.problems.cards[1]`** "Boundaries as old as the houses… now at the end of their life". Pack section 3: an era turned into a judgement. Change: tie the era to what replacing a boundary involves.
14. **Moss and summer browning treated as problems** (`category_page_blocks.B.problems.cards[0]`, `location_page_blocks.B.problems.cards[0]`, the A seasonal card, and every `faq_symptom` brief going straight from cause to the fix). Pack sections 4.5 and 7: most are normal; say so, then name what is not. Change: each brief says when the sign is normal first.

## Craft rules and what makes copy fail

15. **`words_avoid`** lets "outdoor living space" appear twice (the N14 tolerance) and lacks "dream outdoor space" and "oasis". Pack section 7 bans lifestyle language outright. Change: a hard ban, plus "dream" and "oasis".
16. **Briefs that promise what nature controls**: "how the round brings it back over more than one cut" (category B card 1, location B card 1), "what the round does so they stay away" (category B card 2). Pack section 4.4: never promise what nature controls. Change: describe the cuts and treatment with no promised result.
17. **Mechanisms in the customer's diary, not the ground or plant**: service B card 1 "edges and lines left uncut", card 3 "a round that has turned into a catch up", location B card 2 "growth outpacing the time the owner has". Pack section 4.2: the cause goes in the ground or the plant. Change: a reason in growth rate, wood hardening or the ground.
18. **Homepage `faq_planning.answer_brief`** states a hard rule with a figure ("front driveways over 5 square metres need permeable paving…"). The pack: rules belong to the trade facts pack, written as what usually applies. Change: point at the trade facts rule rows with "usually", as the service page's "rules" slot does.

## The seasonal swap

19. **"Booking ahead for spring"** in category A timing, location A timing and homepage faq_D. Pack sections 2 and 4.3: write when the work should be done and the reason in the ground or plant, never "spring is a busy time". Change: drop the booking line and ask for the reason.
20. **The B seasonal FAQs** ("When should I book for spring?", "When should I book [SERVICE_LOWER] for the season?") are framed as booking with no reason. Change: when the first visit or cut should happen and why (growth starting, soil temperature).

## Weaker cases (not counted)

- `words_avoid` "plot": the pack's own model copy uses it ("sloping plots", "village plots"), and the location A card 3 brief forbids it.
- Category B card 1 asks for the nesting bird check only when the practice is confirmed; the pack's section 5 calls it the trade's legal reality, stated as a normal part of the job.
- Skips: category A cost card 2, location A cost cards 0 and 3 mention a skip with no confirmed practice guard; pack section 7 lists waste removal stated as the client's practice when not confirmed.
- Location A card 2 "Trees that have outgrown the garden" and location A cost card 3 "Older gardens in the town carry more of it" are era claims about the town (section 3).

## json/md mismatches

- **M1.** The md has "grounds (unless an estate)" under words to avoid; the json has plain "grounds" and no `words_avoid_exceptions`, so the exception never reaches the model.
- **M2.** The md's service page type A steps say "We Price Your Job or We Visit and Price Your Job"; the json and the code use "We Visit and Price the Job".
- **M3.** The md's type A headings list Landscape Gardener, Landscape Designer, Tree Service, Paving Contractor and Deck Builder as type A; the json's `category_types` fixes only gardener and lawn care service (the same gap as item 1).

## Briefs that share a five word run with pack v5 (the checker's pack copy rule, 3 Nov)

The model reproduces a brief's wording, and the validator's PACK-COPY rule blocks a sentence that shares a five word run with the pack. `node tools/niche-entry-check.js landscaper` lists eight such lines; they predate pack v5 (the pack has since taken up the entry's phrasing, or the reverse) and are left for the same decision as the list above:

- homepage `faq_slots[11].question` "Do I need planning permission for a patio or driveway?" ("do i need planning permission")
- `service_page_blocks.A.problems.cards[3]` brief and mechanism "water with nowhere to go"
- `service_page_blocks.A.faq_slots[5].answer_brief` ("as what usually applies with") and `service_page_blocks.B.faq_slots[6].answer_brief` ("written as what usually applies"): instruction wording, unlikely to reach the page
- `location_page_blocks.A.problems.cards[0].brief` "water with nowhere to go"
- `location_page_blocks.A.cost.cards[0].brief` "reached through the house or"
- `location_page_blocks.A.faq_slots[0].answer_brief` "what moves the price in"
