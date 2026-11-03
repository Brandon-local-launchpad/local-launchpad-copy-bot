# Flooring Fitters Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for floors, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three different customers read a flooring fitter's site, and the copy has to know which one it is talking to.

- **The homeowner choosing a new floor** has usually picked the look already: oak boards, a herringbone hallway, LVT through the kitchen. What decides whether it lasts is the layer they never see, and their fear is a floor that creaks, lifts, gaps or shows every bump within a year. Copy for them talks about the subfloor, because that is where cheap work cuts corners.
- **The owner with a failing floor** has boards that squeak, laminate peaked at the joints, a carpet rippling, or a wood floor worn grey. They want to know why, and whether it means a repair or starting again. Copy for them is diagnostic and honest.
- **The landlord, agent or business** wants floors that survive tenants, footfall and cleaning: carpet tiles in an office, safety flooring in a kitchen or care setting, acoustic flooring because a lease demands it. They are buying durability and a job done around their opening hours.

The voice is a fitter who checks the floor before quoting for what goes on it. Never a showroom selling a texture.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Flooring Contractor | A project | A mix: situations for new floors (a hallway that takes all the traffic, a kitchen that needs something wipeable, a room that is cold or noisy underfoot); symptoms for failing ones (creaks and bounce, gapping and peaking boards, rippled carpet, worn or grey wood, cracked tiles, damp under the floor) |

**Desire led and problem led, inside type A.** A type A block 4 card is framed as "signs you need it", but nobody has symptoms of wanting a herringbone floor. This trade sorts two ways, with the subfloor running through both:

- **Desire led** (write the situation, never invent a symptom): carpet fitting, laminate and LVT flooring, LVT flooring, vinyl flooring, wood flooring, parquet and herringbone flooring, carpet tiles, and floor sanding and restoration where the owner simply wants the boards back.
- **Problem led** (write symptom, cause, consequence): floor repairs, carpet repairs and re stretching, screeding and floor levelling, floor surveys and moisture testing, acoustic flooring where noise is the complaint, and floor removal and uplift where the old floor has failed.
- **Requirement led** (commercial): safety flooring and commercial flooring are driven by what the premises need (slip resistance, hygiene, footfall, sound). Write the requirement and what the floor has to do, never a claim about the client's certifications.

**Not seasonal.** Flooring is not a seasonal trade, but heating is: wood and some vinyl floors move with humidity and heating, which is why boards gap in winter and close in summer and why material is acclimatised in the room before fitting. Use that as a reason in the material, never as "a busy time of year".

---

## 3. Local detail that works in this trade

Floors sit on the structure of the house, so the legitimate local detail is about how the houses were built: what is under the floor, and how it behaves.

**Strong anchors** (area wide and checkable): housing era and the floors it was built with (Victorian and Edwardian homes with suspended timber floors over an air void; 1930s semis with suspended timber downstairs and sometimes parquet or woodblock; post war homes with solid concrete ground floors; new builds with chipboard upstairs and screeded or beam and block ground floors); flats, where leases often ask for acoustic underlay; flood risk zones where the research confirms them; listed buildings where original floors may need protecting.

**Every anchor must change the work.** Suspended timber floors are only worth mentioning if they explain draughts, clear air bricks, or why boards are screwed down before a hard floor goes over. Solid concrete is only worth mentioning if it explains moisture testing and a membrane. A block of flats is only worth mentioning if it explains acoustic underlay.

**Do not:** claim floors in an area are worn, damp, uneven or rotten; claim original parquet or boards survive in a street (say houses of that era were *built with* them); turn an era into a judgement about anyone's home today.

---

## 4. Craft rules for this trade

1. **The subfloor is the hidden layer.** Every floor is only as flat, dry and solid as what sits underneath it. Loose boards, a dip in the screed, damp concrete or old adhesive show or push through anything laid on top. Name the subfloor check, and the copy reads as craft rather than sales.
2. **Put the failure in the material or the layer below.** Laminate peaks because it had no room to expand; wood gaps because heating dried it; carpet ripples because it wasn't stretched tight; LVT shows every ridge because the floor wasn't smoothed; tiles crack because the floor flexes.
3. **Moisture is the silent problem.** New screed, a solid floor with no membrane, or a leak under the boards ruins wood, laminate and LVT from below. Testing before fitting is normal practice in good work; never state it as this business's guarantee.
4. **Movement needs room.** Floating floors and wood need an expansion gap at every wall and threshold, covered by skirting or beading. Copy that sells "edge to edge with no trims" has not understood the trade.
5. **Repair before replace, honestly.** A squeaking board usually needs screwing down; a worn wood floor can often be sanded; a rippled carpet can usually be re stretched. Saying when a repair won't hold is just as honest.
6. **Write the room and its use, not the texture.** "A hallway that takes wet boots and the dog", not "luxurious underfoot".

---

## 5. What good looks like: one example per field type

### Homepage service card (type A, Flooring Contractor): 40 to 55 words

```
home_services_cards:
  - card_name: Flooring Contractor | card_text: A new floor is only as flat and solid as the one underneath it. Our [flooring contractor](/flooring-contractor/) work covers carpet fitting, laminate and LVT flooring and wood flooring, with the subfloor checked for level, loose boards and damp before anything goes down, so the finish doesn't creak, lift or show bumps later.
```

Why it works: opens on the trade's central idea in plain words, names three confirmed services, describes the principle of good preparation rather than a claimed process, and carries no local detail (cards don't).

### Category page service card (type A, Floor sanding and restoration): 40 to 55 words

```
cat_services_cards:
  - card_name: Floor sanding and restoration | card_text: Grey, worn or patchy boards are often sound underneath the old finish. Our [floor sanding and restoration](/services/floor-sanding-and-restoration/) work starts with punching nails below the surface and replacing split boards, then sanding back in stages to bare wood before the gaps are filled and the floor is sealed with oil or lacquer.
```

Why it works: the opening reassures honestly (worn often means restorable, not ruined), then names the hidden preparation. The sequence is standard practice from the trade facts, and no product is named.

### Block 4 card, desire led (Flooring Contractor): 40 to 60 words

```
cat_block4:
  - card_title: A kitchen floor that gets mopped daily | card_body: Where a floor takes spills, wet feet and a mop every day, a sealed surface usually suits it better than carpet or untreated wood. LVT and vinyl cope well with water on top, but both show every bump beneath them, so the floor underneath is usually smoothed with a levelling compound first.
```

Why it works: there is no fault to describe, so the "sign" is a situation the reader recognises. It answers the choice practically and then names the hidden layer, as a principle.

### Block 4 card, problem led (Flooring Contractor): 40 to 60 words

```
cat_block4:
  - card_title: Laminate lifting at the joints | card_body: Laminate that rises into ridges along the joins usually has nowhere to expand. A floating floor moves with temperature and humidity, so it needs a gap at every wall and doorway. Fitted tight under the skirting or pinned down by a heavy unit, it pushes up instead, and the joints that peak rarely sit flat again.
```

Why it works: symptom, cause and consequence in plain words, with the reason in the material. It is honest that the lifted boards may not recover, without scaring the reader.

### Block 4 card, problem led, subfloor (Flooring Contractor): 40 to 60 words

```
cat_block4:
  - card_title: Boards that creak and bounce | card_body: A floor that squeaks underfoot usually has boards that have worked loose from the joists, or joists that flex between their supports. Screwing the boards down often cures it. Laying a new floor over the top without fixing it first only hides the noise for a while, and a hard floor can crack or click above it.
```

Why it works: names the hidden cause in the subfloor, offers the honest cheap fix first, and explains what happens if the layer below is ignored. It describes the principle without claiming this business's process.

### Service page content block, paragraph 3 (Wood flooring)

```
Wood laid onto a damp subfloor takes up that moisture from below. The boards swell and cup, curling up at the edges, and once the floor dries out again the gaps between them open wider than they started. That's why the subfloor is tested for moisture before fitting, why a membrane goes over a solid floor, and why the boards sit in the room to acclimatise first.
```

Why it works: one concrete consequence the customer would actually see, with its cause, written as a reason for the hidden work rather than a scare. It does not imply the reader's floor is damp.

### FAQ answer, timing question (Screeding and floor levelling): 50 to 70 words

```
cat_faq_items:
  - faq_question: How long before flooring can go on new screed? | faq_answer: Longer than most people expect, and it depends on the thickness. A traditional sand and cement screed dries slowly, so it usually needs weeks rather than days before wood, laminate or LVT can go on, and longer in a cold or unheated room. A moisture test, not the calendar, is what usually decides when it's ready, because flooring laid too soon traps the water.
```

Why it works: the answer comes first in 9 words, it gives the principle without a fixed figure that might be wrong for the screed in question, and it closes on what actually decides the timing.

### Location page content block, paragraph 1 (town)

```
Flooring work in [town] starts with what's under the floor, and that changes with the age of the house. The Victorian terraces around the old town were built with suspended timber ground floors over an air void, so boards are screwed down and air bricks kept clear before anything new goes on top. The post war estates to the north were built on solid concrete, so moisture testing comes first there.
```

Why it works: two town facts, each tied to what it means for the work. It describes how the houses were built, never the state of anyone's floor today, and explains no single service (that is the service pages' job).

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, desire led services are written as the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog a desire led topic is written as a *decision* instead: what each option suits, and what decides between them. "LVT or laminate for a kitchen?" not "Imagine your new kitchen floor".

**What each post type is for in this trade:**

- **Question posts**: why laminate lifts, why wood floors gap in winter, why a carpet ripples, why boards squeak, whether underfloor heating works with wood or LVT, how long screed takes to dry. Answer with the cause in the material or the subfloor, then the fix.
- **Decision posts**: LVT or laminate, engineered or solid wood, carpet or hard floor upstairs, herringbone or straight boards, sand or replace, floating or glued down. Say which option suits which room and subfloor, never which one wins.
- **Cost guides**: the subfloor and how much levelling or repair it needs; uplift and disposal of the old floor; moisture testing and a membrane; the pattern (herringbone takes far longer than straight boards); doorways, thresholds and stairs; furniture to move; the material. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one building or ground condition in one named place: suspended timber floors in a Victorian area, solid floors on a post war estate, acoustic rules in a block. Seasonal posts only where heating explains movement in wood.

### Blog answer (question post): 40 to 60 words

```
blog_answer: Wood floors usually gap in winter because the heating dries the air and the boards shrink. Timber takes in and gives off moisture all year, so boards that were tight in summer open slightly once the radiators are on. Small, even gaps that close again in spring are normal; wide or growing gaps usually point to something else.
```

Why it works: the first sentence answers on its own and makes a clean meta description. The cause is physical, it reassures honestly that most gapping is normal, and it names what is not normal.

### Blog section (decision post): 140 to 200 words

```
blog_sections:
- h2: Is LVT or laminate better for a kitchen? | body: For a kitchen, LVT usually copes better than laminate, because water doesn't harm it. Laminate has a fibreboard core, and water that gets into the joints from a spill or a leaking dishwasher makes the edges swell and lift. LVT is vinyl all the way through, so a spill sits on top until it is wiped up.\n\nLVT is thinner and softer, though, and it shows the floor beneath it. Any ridge, nail head or dip in the subfloor shows through as a bump or a line, so it usually needs a smooth, level base, often a plywood overlay on timber or a levelling compound on concrete. Laminate is more forgiving of small bumps because it floats on an underlay.\n\nBoth need the subfloor dry, and both can usually go over underfloor heating if the product allows it. Our [LVT flooring](/services/lvt-flooring/) page explains how the base is prepared.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact that would come from the trade facts rows (the cores and water, LVT telegraphing the subfloor, dry base and heating), and it is honest about each option's weakness. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** design trend posts any national site could write; "it depends" without naming what it depends on; fixed drying or acclimatising times stated as rules regardless of the screed, the room and the season; advice to lift or sand floors that may sit over old adhesive or tiles from an earlier era without saying older floor coverings and adhesives can contain asbestos and need testing first; brand comparisons of floors or underlays.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- Showroom language ("luxurious underfoot", "stunning finish", "the wow factor") instead of the subfloor, the material and how the room is used.
- A sentence that could sit on any flooring site in the country, with no subfloor, moisture, movement or room detail anywhere in the paragraph.
- Fitting described as the whole job, with nothing about levelling, moisture or loose boards underneath.
- Symptoms invented for desire led services ("signs you need herringbone").
- "No gaps", "no trims" or "edge to edge" promised for floating or wood floors without the expansion gap explained.
- Recommending a new floor where a screw down, a re stretch or a sand would do, or claiming a repair will hold when the subfloor has failed.
- Free surveys, moisture testing, furniture moving, uplift and disposal or guarantees stated as this client's practice when not confirmed.
- Local detail that judges homes ("the worn floors in these houses") or claims surviving original floors in a street.
- Naming flooring manufacturers, ranges or underlay brands.
- Slip ratings, fire ratings or acoustic performance promised for safety, commercial or acoustic flooring without the specification and product data confirming them.

---

## Notes for Brandon

- One GBP category (Flooring Contractor, shared with Builder), mapped to type A. I added a "requirement led" split for safety and commercial flooring, where the driver is what the premises need. Please check it sits well with how code briefs block 4.
- Laminate and LVT flooring and LVT flooring are both pages; Copybot may need a steer to keep them distinct on a live site.
- Asbestos appears only on the blog fail list, for uplifting older floor tiles and adhesive, as a principle with no dates.
- Wall and floor tiling sits under Flooring Contractor in the Builder library but is left to the Tiling pack.
