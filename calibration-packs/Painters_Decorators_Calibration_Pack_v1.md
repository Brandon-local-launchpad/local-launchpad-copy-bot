# Painters & Decorators Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for painting and decorating, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three different customers read a decorator's site, and the copy has to know which one it is talking to.

- **The homeowner refreshing a room** wants a change: a new colour, wallpaper in the hallway, a kitchen that feels new without new units. They think they are buying paint on walls; they are really buying the preparation they will never see. Their fear is a finish that shows every patch in low sunlight, paint on the carpet, or a job that overruns. Copy for them explains the preparation, because that is where cheap work cuts corners.
- **The owner with a problem surface** has paint flaking off the sills, a ceiling stain that bleeds through every coat, or an old textured ceiling they want gone. They want to know why, and whether another coat will fix it. Usually it won't, and saying so honestly earns the job.
- **The landlord, agent or business** wants rooms turned round between tenants, a shop repainted out of hours, or fire protection coatings applied to a specification. They are buying a finish that lasts until the next cycle without disrupting anyone.

The voice is a decorator who knows most of the job happens before the first coat. Never an interior designer selling a mood board.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Painter | A project | A mix: situations for interior refreshes, wallpapering and kitchen or furniture painting; symptoms for exterior and woodwork failures (flaking sills, peeling masonry paint, bare timber, stains bleeding through) |
| Painter and Decorator | A project | Situations for decorative finishes and murals: a plain room or wall that the owner wants to carry more character, and the surface it needs first |

**Desire led, problem led and schedule led, inside type A.** A type A block 4 card is framed as "signs you need it", but nobody has symptoms of wanting a new colour. This trade sorts three ways:

- **Desire led** (write the situation, never invent a symptom): interior painting and decorating as a refresh, wallpapering, decorative finishes and murals, furniture and kitchen painting, spray painting of units, coving and cornice.
- **Problem led** (write symptom, cause, consequence): exterior painting where paint is failing, woodwork and timber finishing on bare or flaking timber, sash window and timber restoration, plaster repairs and skimming, Artex removal, stain and mould problems inside.
- **Schedule led** (write what slips and when): exterior repainting on a cycle before timber goes bare, commercial decorating between tenancies or on a rolling programme, and intumescent and fire protection coatings, where the coating has to meet a specification and stay intact.

**Seasonal note.** Exterior painting is seasonal. Where code swaps a block 4 card for the time of year, write *why* the weather matters to the paint: damp timber and masonry trap moisture under the film, cold slows curing, dew settling on paint late in the day spoils the finish. Never "spring is our busy time". Interior work is not seasonal.

---

## 3. Local detail that works in this trade

Paint sits on the surface of a building, so the legitimate local detail is about what the building is made of and what weather it faces.

**Strong anchors** (area wide and checkable): housing era and what it was built with (Victorian and Edwardian homes with timber sash windows, lime plaster and older paint layers; 1930s semis with pebbledash or render; post war homes with textured ceilings; new builds with fresh plaster still drying out); exposure (coastal salt air, hilltops catching wind driven rain, south facing elevations); conservation areas and listed buildings where the research confirms them, because colours and window repairs may need approval; the commercial mix.

**Every anchor must change the work.** Sash windows are only worth mentioning if they explain why paint seals sashes shut or why bare sill timber rots first. Coastal air is only worth mentioning if it explains why exterior paint fails sooner. A new build estate is only worth mentioning if it explains why fresh plaster needs time and a mist coat.

**Do not:** claim homes in an area are shabby, peeling or overdue a repaint; claim lead paint or asbestos is present in a particular street or house (say older homes *can* have them and the right step is testing); turn an era into a judgement about anyone's home today.

---

## 4. Craft rules for this trade

1. **Preparation is the craft.** Filling, sanding, sugar soaping, knotting, priming and making good are most of the job, and they decide how the finish looks in raking light and how long it lasts. Name the preparation step that matters for the surface.
2. **Put the failure underneath.** Paint flakes because moisture is behind it, peels because it went onto a dusty or glossy surface, bleeds because a stain wasn't sealed, cracks because filler went into a moving joint. Name the cause beneath the film.
3. **Another coat is rarely the fix.** More paint over the same fault fails the same way. Saying so, and naming what has to happen first, separates a decorator from a painter in a hurry.
4. **Old surfaces need care before they are disturbed.** Older homes can have lead in earlier paint layers, so it is never dry sanded or burned off. Older textured ceiling coatings can contain asbestos, so the usual rule is testing before removal. State these as the normal first step, never as a scare or a claim about the reader's house.
5. **Timber outside is the exterior job.** Sills, frames, fascias and doors are where paint fails first and bare wood starts to rot. Exterior copy should spend most of its words on timber.
6. **Write the room, not the mood.** "Walls that show every patch when the sun comes in" and "white doors gone yellow", not "transform your space". For colour, talk about light and surfaces, never trends.

---

## 5. What good looks like: one example per field type

### Homepage service card (type A, Painter): 40 to 55 words

```
home_services_cards:
  - card_name: Painter | card_text: Walls that look fine at night and show every patch when the morning sun comes in usually need preparation, not more paint. Our [painter](/painter/) work covers interior painting and decorating, exterior painting and woodwork, with filling, sanding and priming done first so the finish holds up in any light.
```

Why it works: opens on a situation the reader recognises, names three confirmed services in plain words, puts the hidden layer (preparation) in the first card the visitor sees, and carries no local detail (cards don't).

### Category page service card (type A, Exterior painting): 40 to 55 words

```
cat_services_cards:
  - card_name: Exterior painting | card_text: Paint flaking from sills and frames usually means water has got behind it through bare timber or open joints. Our [exterior painting](/services/exterior-painting/) work starts with scraping back to sound paint, treating any soft wood and sealing the joints, then primer, undercoat and topcoat in dry weather so nothing is trapped under the film.
```

Why it works: the opening symptom leads straight to the cause and the hidden preparation. The sequence named is standard practice from the trade facts, not a claimed company process, and no product is named.

### Block 4 card, desire led (Painter): 40 to 60 words

```
cat_block4:
  - card_title: Kitchen units you like but have tired of | card_body: If the units are solid and the layout works, the doors may only need a new colour. Good [furniture and kitchen painting](/services/furniture-and-kitchen-painting/) depends on the preparation: degreasing, a light key and a primer made for the surface, because paint laid straight onto a shiny or greasy door chips at the handles first.
```

Why it works: no fault is invented; the "sign" is a situation the reader recognises. It then names the hidden step that decides whether the finish lasts, as a principle rather than a promise.

### Block 4 card, problem led (Painter): 40 to 60 words

```
cat_block4:
  - card_title: A stain that comes back through the paint | card_body: A ceiling mark that shows again a few weeks after painting is usually an old water, smoke or nicotine stain bleeding through the emulsion. Another coat won't hold it back. Once the cause is dry and fixed, the stain needs sealing with a stain blocking primer before the ceiling is painted.
```

Why it works: symptom, cause and fix in plain words, and it says honestly that more paint isn't the answer. It also checks that the cause (the leak) is fixed first, which is the trade's real knowledge.

### Block 4 card, schedule led (Painter): 40 to 60 words

```
cat_block4:
  - card_title: Window sills turning grey | card_body: Paint on a south or west facing sill dulls and then cracks before it flakes. Repainting while the film is still mostly sound means a rub down, spot priming and two coats; leaving it until the timber goes grey and soft turns the same job into cutting out rot and splicing in new wood.
```

Why it works: what slips, when, and what it costs to miss the window, with the reason in the timber and the sun. It describes the principle without claiming a maintenance plan the client may not offer.

### Service page content block, paragraph 3 (Plaster repairs and skimming)

```
Painting straight over cracked or patched plaster rarely hides it. Emulsion picks up every ridge and dip once the light comes across the wall at a low angle, and filler pushed into a crack that still moves opens again within a season. That's why the wall is made good or skimmed first, and why fresh plaster is left to dry and given a thinned mist coat before the finish.
```

Why it works: one concrete consequence the customer would actually see, with its cause, written as a reason for doing the preparation rather than a scare. It does not imply the reader's walls are in poor shape.

### FAQ answer, safety question (Artex removal): 50 to 70 words

```
cat_faq_items:
  - faq_question: Is it safe to remove an Artex ceiling? | faq_answer: Usually, once it has been tested. Older textured ceiling coatings can contain asbestos, so the normal first step is a sample sent to a lab. If it's clear, the coating can be softened and scraped or skimmed over. If it isn't, it's usually left sealed or skimmed, or removed by a licensed contractor. Sanding or scraping it before the result comes back is what to avoid.
```

Why it works: the answer comes first in 7 words, the rule is written as what usually applies with no regulation named, and it tells the customer what to avoid without giving them removal instructions.

### Location page content block, paragraph 1 (town)

```
Decorating in [town] changes from street to street with the age of the houses. In the Victorian terraces near the station, timber sash windows and older layers of paint mean careful preparation, with no dry sanding where lead may be present. The 1930s semis on the edge of town were built with rendered fronts, and on the hilltop roads they take the brunt of wind driven rain, so masonry and timber outside weather faster.
```

Why it works: two town facts, each tied to what it means for the work. It describes how the houses were built and what weather they face, never the state of anyone's paintwork, and explains no single service (that is the service pages' job).

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, desire led services are written as the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog a desire led topic is written as a *decision* instead: what each option suits, and what decides between them. "Paint or wallpaper for a hallway?" not "Imagine walking into your new hallway".

**What each post type is for in this trade:**

- **Question posts**: why paint peels off a ceiling, why a stain comes back through emulsion, why mould returns to a bedroom wall, how long new plaster needs before painting, whether an old textured ceiling is safe, why a sash has stuck shut. Answer with the cause under the paint, then the fix.
- **Decision posts**: paint or wallpaper, spray or brush for kitchen units, painting or replacing kitchen doors, skimming or lining paper, repairing or replacing sash windows, oil or water based paint on woodwork. Say which option suits which surface, never which one wins.
- **Cost guides**: the state of the surfaces and the preparation needed; ceiling height and stairwells; the amount and condition of woodwork; furniture and floors to protect; testing or careful handling for older coatings; coats needed for a big colour change; exterior access and scaffold. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one building or weather condition in one named place: salt air on a seafront, sash windows in a conservation area, why exterior work in an exposed area waits for a settled spell.

### Blog answer (question post): 40 to 60 words

```
blog_answer: Ceiling paint usually peels because it has lost its grip on the surface underneath, not because the paint was poor. Distemper left from decades ago, dust that wasn't cleaned off, or damp from a bathroom or roof all stop new paint bonding. Painting over it again peels the same way unless the loose layers come off first.
```

Why it works: the first sentence answers on its own and makes a clean meta description. The cause is physical and specific, and the closing line sets up the honest answer that another coat won't do it.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: How long should new plaster dry before painting? | body: New plaster usually needs several weeks to dry before it is painted, and longer in a cold or damp room. It changes from a dark pink to an even pale colour as it dries, and patches that stay darker are still holding water. Painting too early traps that moisture, so the paint blisters or flakes and mould can grow behind it.\n\nThe first coat on bare plaster is a mist coat: emulsion thinned with water so it soaks into the surface and gives the next coats something to grip. Unthinned paint sits on top of fresh plaster and can peel away in sheets. Vinyl and wipeable paints are usually avoided for this first coat, because they seal the surface before it has finished drying.\n\nAny cracks that appear while the plaster dries are filled after the mist coat, when they are easy to see. Our [plaster repairs and skimming](/services/plaster-repairs-and-skimming/) page explains how walls are prepared.
```

Why it works: the section opens by answering its H2 without a fixed number of days, and each paragraph carries one fact that would come from the trade facts rows (how drying shows, the mist coat, filling after it). The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** colour trend posts any national site could write; "it depends" without naming what it depends on; DIY instructions for stripping old paint, removing textured ceilings or working at height (say what to avoid and when to call a qualified person); fixed drying times regardless of room and weather; paint brand comparisons.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- Interior design language ("transform your space", "a fresh new look", "a calming sanctuary") instead of surfaces, preparation and light.
- A sentence that could sit on any decorator's site in the country, with no surface, preparation, weather or timber detail anywhere in the paragraph.
- Promising that another coat, or a "premium" paint, will fix a surface failing from moisture or poor adhesion underneath.
- Symptoms invented for desire led services ("signs you need wallpaper").
- Lead paint or asbestos claimed for a street or a house, or brushed aside; equally, any wording that reads as removal instructions.
- Exterior copy that only talks about walls and says nothing about sills, frames and doors.
- Dust sheets, furniture moving, clean up, number of coats, guarantees or working hours stated as this client's practice when not confirmed.
- Local detail that judges homes ("the tired paintwork around here").
- Naming paint manufacturers or product ranges.
- Intumescent coatings written as decoration, or with a fire rating promised that the specification and the product certification haven't confirmed.

---

## Notes for Brandon

- Both categories mapped to type A. Commercial decorating on a rolling programme sits closer to type B, but it is quoted as projects, so it is schedule led inside type A.
- Exterior painting is treated as seasonal and interior work as not. Please check that matches how code swaps block 4 cards for this niche.
- "Artex" appears in the FAQ question because it is in the page name and is how customers search; the answer says "textured ceiling coating". It is a trade mark gone generic; please confirm it is acceptable under the no brands rule.
- Lead paint and asbestos are written as principles with no dates, because the cut off years are easy to get wrong and belong in the trade facts pack.
