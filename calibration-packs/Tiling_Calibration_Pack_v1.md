# Tiling Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for tiling, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three different customers read a tiler's site, and the copy has to know which one it is talking to.

- **The renovating customer** is redoing a bathroom, kitchen or floor. They judge a tiler on the finish they can see: straight lines, even joints, neat cuts. Their real risk is the part they cannot see. Copy for them talks about what goes on before the first tile: the board or screed, the waterproofing round the shower, and room for the floor and walls to move.
- **The repair customer** has a cracked floor tile, grout that keeps going black or a tile that sounds hollow by the shower. They want to know whether it is a small fix or a sign of something worse. Copy for them names the cause honestly and says plainly when a patch is enough.
- **The period or outdoor customer** has a Victorian hallway, a stone floor or a porcelain patio, and knows the wrong adhesive, sealer or cleaner can damage it. Copy for them is careful and specific about the material.

All three share one fear: tiles that look perfect on handover and crack, loosen or let water through within a year or two.

The voice is a tiler who knows what sits behind the tiles, explaining it plainly to a homeowner. Never an interior designer selling a look.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Tile contractor: Bathroom and shower tiling, Wet room tiling and tanking | A project | Situations for new bathrooms; symptoms of water behind the tiles (hollow tiles, recurring black grout, stains below) |
| Tile contractor: Kitchen tiling and splashbacks, Feature wall and hearth tiling | A project | The customer's situation: a splashback that won't wipe clean, a fireplace or wall that could carry a feature |
| Tile contractor: Floor tiling, Natural stone tiling, Victorian and period floor tiling | A project | Symptoms of substrate and movement failures (cracks along a line, lifting or tenting tiles, hollow sounds); for period floors, missing or loose tiles and what the floor was laid on |
| Tile contractor: Tile repairs and replacement, Regrouting and grout repair, Tile removal | A project | Symptom, cause, consequence: what the visible fault says about what is behind or under it |
| Tile contractor: Outdoor and porcelain paving tiling, Swimming pool tiling | A project | Situations for new outdoor tiling; symptoms of frost, poor bedding or a lost fall for repairs |

**Desire led versus problem led, inside type A.** A type A block 4 card is framed as "signs you need it", but nobody has symptoms of wanting a new splashback. For desire led services, the "sign" is the customer's situation, not a fault:

- **Desire led** (write the situation): bathroom and shower tiling in a refit, kitchen tiling and splashbacks, feature wall and hearth tiling, new floor tiling, natural stone, outdoor and porcelain paving, swimming pool tiling.
- **Problem led** (write symptom, cause, consequence): tile repairs and replacement, regrouting and grout repair, tile removal, wet room tanking after a leak, period floors with missing or loose tiles.

Schedule led barely applies: resealing stone and renewing silicone read better as problem led than as a calendar.

**The three hidden layers.** Every type A card in this trade, desire led or problem led, is stronger when it touches one of these, because they decide whether the tiling lasts:
- **Substrate**: what the tiles are fixed to (plaster, plasterboard, cement board, sand and cement or gypsum screed, timber boards on joists), each with its own limits on weight, moisture and movement.
- **Tanking in wet areas**: the waterproof layer under the tiles in showers and wet rooms. Tiles and grout are not waterproof on their own.
- **Movement**: floors and walls expand, shrink and flex. Silicone at corners and changes of plane, and movement joints across larger floors, stop that cracking tiles.

Tiling is not seasonal. The only timing that matters is frost for outdoor tiling and drying time for new screeds.

---

## 3. Local detail that works in this trade

Local detail is narrower than in outdoor trades, but real: housing era decides the substrate, and the substrate decides the method.

**Strong anchors** (area wide and checkable): housing era and how it was built (Victorian and Edwardian terraces with suspended timber floors and lime plaster; post war estates with concrete ground floors and boarded upstairs floors; new builds with plasterboard walls and chipboard floors that settle in the first year or two); period hallways and paths built with geometric or encaustic tiles, as an era claim; water hardness from the supplier's published data, which changes grout choice and aftercare; a high share of flats, where some leases restrict hard floors or ask for an acoustic layer; exposed sites for outdoor porcelain, where frost matters.

**Every anchor must change the work.** A Victorian terrace is only worth mentioning if it then explains the timber floor that needs stiffening or the lime plaster that won't take heavy tiles. Hard water is only worth mentioning if it then explains grout choice or limescale on glass.

**Do not:** claim bathrooms or kitchens in an area are dated or due for replacement; claim what is inside anyone's house today; say an era "has" period tiles rather than "was built with" them; name a water hardness figure the research does not give.

---

## 4. Craft rules for this trade

1. **Name the layer, not the quality.** "A cement board on the shower walls with a tanking membrane over it", not "a quality finish". The customer cannot see the layer, so naming it is the proof.
2. **Put the cause behind or under the tile.** Almost every fault starts below the surface: a floor that flexes, a board that softens when wet, adhesive in dots rather than a solid bed, no gap for movement. Name the reason and the copy reads as diagnosis.
3. **Grout is not waterproof, and silicone is not grout.** Grout fills joints and lets a little water through; the tanking keeps water out; silicone goes where surfaces meet and move, such as the bath edge and internal corners. Copy that blurs the three reads as amateur.
4. **Respect the material.** Stone, period tiles and outdoor porcelain each have rules: sealing stone before grouting, no acid cleaners on marble or limestone, breathable treatment on old floors laid on the ground, full bedding for porcelain outside.
5. **Be honest about patching.** One tile cracked by a dropped pan is a fair swap. Cracks that follow a line or keep appearing will come back through a new tile.
6. **Never promise what the building controls.** No tiles "will never crack", no grout "will stay white". Say what the method protects against.

---

## 5. What good looks like: one example per field type

### Homepage service card (type A, Bathroom and shower tiling): 40 to 55 words

```
home_services_cards:
  - card_name: Bathroom and shower tiling | card_text: A shower can look finished on day one and still be letting water into the wall behind it. In [bathroom and shower tiling](/services/bathroom-and-shower-tiling/), the part that keeps water out sits under the tiles: the right board, a tanking layer around the shower, and silicone rather than grout wherever surfaces meet.
```

Why it works: opens on the customer's hidden fear, names the hidden layers in plain words, and describes what good work involves as a principle rather than claiming this business's process.

### Category page service card (type A, Regrouting and grout repair): 40 to 55 words

```
cat_services_cards:
  - card_name: Regrouting and grout repair | card_text: Grout that goes black in the same shower corner however often it's cleaned is usually staying wet, not dirty. Good [regrouting and grout repair](/services/regrouting-and-grout-repair/) starts by finding why: failed silicone, a tile that sounds hollow, or water getting behind. New grout over a wet joint stains again within months.
```

Why it works: corrects what the customer assumes (it's a cleaning problem), gives the physical cause, and is honest that new grout alone won't last if the cause stays.

### Block 4 card, problem led, movement (Floor tiling): 40 to 60 words

```
cat_block4:
  - card_title: Cracks running in a line across the floor | card_body: When several floor tiles crack along the same line, the tiles are rarely the problem. There's usually a joint or crack in the screed below, or timber boards flexing underneath. Replacing only the cracked tiles puts new ones over the same movement, so the fix starts with the floor and a movement joint where it needs one.
```

Why it works: the symptom leads straight to the substrate and movement layers, and it says honestly why a simple swap won't hold.

### Block 4 card, problem led, wet area (Wet room tiling and tanking): 40 to 60 words

```
cat_block4:
  - card_title: Tiles that sound hollow by the shower | card_body: A tile that sounds hollow when tapped, near a shower or bath, often means water has got behind it and the adhesive or board has softened. Left alone, the tiles loosen, water reaches the wall or floor structure, and a regrout becomes a strip out. Lifting one tile usually shows how far it has gone.
```

Why it works: symptom, cause and consequence in order, with the tanking layer implied by what happens without it. It describes a sensible first check without claiming it as this business's practice.

### Block 4 card, desire led (Kitchen tiling and splashbacks): 40 to 60 words

```
cat_block4:
  - card_title: A wall behind the hob that never looks clean | card_body: If the wall behind the hob or sink is painted, every splash and grease mark stays, however often it's wiped. A tiled splashback with a wipeable glaze and a stain resistant grout ends that, and running it to the underside of the wall units usually looks more finished than a short strip at worktop height.
```

Why it works: there is no fault to describe, so the "sign" is a situation the reader recognises. The fix is practical (glaze, grout, height), not a lifestyle pitch.

### Service page content block, paragraph 3 (Wet room tiling and tanking)

```
In a wet room, the tiles and grout are not the waterproof layer. Grout is porous, so a little water always passes through it, and the tanking underneath is what stops it reaching the floor or the walls. Where that layer is missing or breaks at a corner, water spreads unseen through the floor, and the first sign is often a stain on the ceiling below.
```

Why it works: one concrete consequence the customer would actually see, with its cause, written as a reason rather than a scare. It explains the hidden layer without implying the reader's wet room is failing.

### FAQ answer, rules question (Tile removal): 50 to 70 words

```
cat_faq_items:
  - faq_question: Can old floor tiles contain asbestos? | faq_answer: Some can, so testing before lifting them is the usual rule. The risk is mainly with older vinyl and thermoplastic floor tiles, and the black adhesive often found under them, in homes built or refitted before 2000. Ceramic and stone tiles are not the concern. Breaking up a suspect floor releases fibres, so if a test is positive, removal follows asbestos safe working.
```

Why it works: the answer comes first in under 15 words, the rule is written as what usually applies with no regulation named, and it separates the real risk from the materials that aren't one. (Any rule or date comes from the trade facts pack on the day; never from this example.)

### Location page content block, paragraph 1 (town)

```
Tiling in [town] starts with what's under the floor, and that changes from street to street. The Victorian terraces near the centre were built with suspended timber floors, which flex, so tiles need a rigid overlay and a flexible adhesive before they go down. On the 1960s and 1970s estates, ground floors are usually concrete, while upstairs bathrooms sit on boarded joists that often need stiffening first.
```

Why it works: two town facts, each tied to what it means for the substrate. It describes how the houses were built, not the state of anyone's bathroom, and explains no single service.

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, desire led services are written as the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog a desire led topic is written as a *decision* instead: what each option suits, and what decides between them. "Porcelain or ceramic for a kitchen floor?" not "Picture your new kitchen".

**What each post type is for in this trade:**

- **Question posts**: grout that keeps going black, cracked floor tiles, hollow sounding tiles, a shower leaking through the ceiling, tiling over tiles, how long a screed needs before tiling. Answer with the cause behind or under the tile, then what fixes it.
- **Decision posts**: porcelain or ceramic, stone or stone look porcelain, cement or epoxy grout, a tiled shower or a wet room, restore a period floor or relay it. Say which option suits which room and substrate, never which is right for everyone.
- **Cost guides**: what moves the price in this trade. What has to come off first, the substrate and its preparation, tanking in wet areas, tile size and material (large format and stone take longer), the pattern (herringbone and diagonal waste more), and cuts round fittings. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one building or water condition in one named place, and what it means for the work: timber floors in Victorian terraces, hard water and grout, leases that restrict hard floors. The only seasonal angle that holds up is outdoor tiling and frost.

### Blog answer (question post): 40 to 60 words

```
blog_answer: Shower grout usually goes black again because it stays damp, not because it was cleaned badly. Cement grout is porous and holds water after every shower, and mould grows wherever a joint can't dry out. When the staining keeps coming back in one corner, failed silicone or water behind the tiles is often keeping that spot wet.
```

Why it works: the first sentence answers on its own and makes a clean meta description. The cause is physical, and it points to the hidden problem without alarm.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: Can you tile over existing tiles? | body: You can tile over existing tiles in some cases, but only when the old tiles are sound and the surface can carry the extra weight. Every old tile has to be firmly bonded, because new tiles are only as secure as what they are stuck to. Tapping across the wall or floor shows any hollow ones, and a single loose tile underneath can let the new layer crack or come away.\n\nWeight is the second limit. Plaster and plasterboard can each carry only so much, and a second layer of tiles plus adhesive can take a wall past it, especially with large porcelain or stone. Glazed tiles also need cleaning and a primer before adhesive will grip them.\n\nThe third limit is height. A second layer on a floor raises it, which can stop doors opening and leave a step at the threshold, and on walls it changes how sockets, switches and window reveals finish. Our [tile removal](/services/tile-removal/) page explains when taking the old tiles off is the better start.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact that would come from the trade facts rows (bond, weight limits and priming, build up height), and it is honest about when the shortcut works and when it doesn't. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** design trend posts any national site could write; "it depends" without naming the substrate, room or tile; DIY instructions involving asbestos, bathroom electrics or structural floor work; treating grout as the waterproof layer.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any tiler's site in the country, with no substrate, waterproofing, movement or material detail anywhere in the paragraph.
- Selling the visible finish ("stunning", "flawless lines") with nothing about what is behind or under it.
- Calling grout waterproof, or putting grout where silicone belongs (bath edges, internal corners, the wall to floor junction).
- Symptoms invented for desire led services ("signs you need a splashback").
- Treating every crack as a tile to swap, when cracks along a line point to the floor below.
- Advice that damages the material, such as acid cleaners on marble or a sealer that traps moisture in a period floor.
- Local detail used as scenery, or claims about what is inside homes today.
- Waterproofing systems, guarantees, tanking certificates or waste removal stated as this client's practice when not confirmed.
- Asbestos mentioned casually, or old floor tiles described as safe to break up without testing.

---

## Notes for Brandon

- **Type mapping.** All five rows are type A. Tile repairs and regrouting could be argued as B (recurring) because silicone and stone sealing are periodic, but nobody books a tiler on a round, so I kept them as problem led inside A.
- **Single GBP category.** Tiling has only Tile contractor, so the section 2 table splits by page groups under it.
- **Asbestos.** The tile removal FAQ says "asbestos safe working" rather than "licensed contractor", because most work on asbestos vinyl floor tiles is non licensed in England. Check the trade facts pack agrees.
- **Swimming pool tiling** is a very different job from domestic tiling. Worth flagging as confirm only in the niche entry.
