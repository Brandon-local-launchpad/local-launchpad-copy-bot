# Kitchen & Bathroom Fitters Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for kitchens and bathrooms, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three different customers read a kitchen and bathroom fitter's site, and the copy has to know which one it is talking to.

- **The renovation customer** wants a kitchen or bathroom that works better than the one they have. Their fear is not the look but the job: weeks without a working kitchen, trades arriving in the wrong order, a worktop that comes a fortnight after the units. Copy for them explains the order of work and what sits behind the units and under the tiles, because that is where cheap work cuts corners.
- **The leak customer** has a problem, not a plan: a ceiling stain under the shower, silicone gone black, a tray that moves. They want to know where the water comes from and whether it means a repair or a new room. Copy for them is calm and diagnostic.
- **The adaptation customer** is often arranging a bathroom for a parent, a partner or themselves because getting in and out of a bath has become hard. Copy for them is practical and dignified about what the room will let someone do, never clinical, never pitying, never about age or condition.

The voice is a fitter who knows what is behind the plasterboard, explaining the job plainly. Never a showroom selling a lifestyle.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Kitchen Renovator | A project | Mostly situations: a kitchen that doesn't work for how the household cooks and lives (no worktop beside the hob, nowhere to eat). Problem cards only for water and wear: worktop joints swelling by the sink, cabinet bases damaged by a slow leak |
| Bathroom Renovator | A project | A mix: situations for new bathrooms, en suites, cloakrooms and walk in showers; symptoms for leaks and failed seals (a ceiling stain below, silicone lifting, cracked grout, a tray that flexes) |

**Desire led, problem led and need led, inside type A.** A type A block 4 card is framed as "signs you need it", but nobody has symptoms of wanting a new kitchen. This trade sorts three ways:

- **Desire led** (write the situation, never invent a symptom): kitchen design, kitchen fitting, kitchen worktops, bathroom design, bathroom fitting as a new room by choice, cloakrooms and en suites, utility rooms, media walls, fitted shelving and storage, underfloor heating as part of a new room.
- **Problem led** (write symptom, cause, consequence): leaks and failed seals. Bathroom fitting where the shower or bath leaks, walk in showers replacing a failed tray, wet rooms where the tanking has failed, worktops swollen by water. Name the route the water takes.
- **Need led** (accessible and mobility bathrooms): write what the person wants to do (shower standing or seated, get in without a step, have something solid to hold), never their diagnosis, age or condition.

**Gas and electrics.** Gas work is done by a Gas Safe registered engineer, and electrical work in a bathroom or on new kitchen circuits is usually done or signed off by a registered electrician, or notified to building control. Copy states this as the general rule, never claims the fitter does it unless the client confirms the registration, and never suggests the customer does any of it.

---

## 3. Local detail that works in this trade

Kitchens and bathrooms sit inside the house, so the legitimate local detail is about how the houses were built, what comes out of the taps, and access.

**Strong anchors** (area wide and checkable): housing era and the layouts it was built with (Victorian terraces with the kitchen in a narrow rear wing; 1930s semis built with a separate toilet and bathroom upstairs; post war houses with small kitchens; new builds with stud walls and compact en suites); water hardness from the water company's published data; flats (stairs, lifts, delivery parking, the shared soil stack, lease consent for moving a bathroom); listed buildings where the research confirms them, because internal changes usually need consent too.

**Every anchor must change the work.** Hard water is only worth mentioning if it explains limescale on screens, the choice of shower valve, or a softener. A Victorian rear wing is only worth mentioning if it explains why the layout runs along one wall. A flat is only worth mentioning if it explains why the toilet can't move far from the stack.

**Do not:** claim kitchens or bathrooms in an area are dated or due for replacement; claim what is behind the walls in a street (lead pipes, old wiring); turn an era into a judgement about anyone's home today; invent water hardness the research does not give.

---

## 4. Craft rules for this trade

1. **Name the order of work.** Strip out, first fix plumbing and electrics, plastering, units or tiling, worktops, then second fix and sign offs. Explaining why a stone worktop is templated only once the units are fixed reassures more than any promise of speed.
2. **Put the leak where it really is.** Water shows where it drips, not where it escapes. A ceiling stain can come from a seal, a waste joint, a flexing tray or cracked grout, and it often travels along a joist first. Naming the route reads as diagnosis.
3. **Silicone is the last line, not the waterproofing.** In a shower or wet room the waterproofing is the tanking membrane behind the tiles and a tray bedded solid. Copy that treats a fresh bead of sealant as the fix has not understood the job.
4. **Gas and electrics belong to registered trades.** State it as a fact the customer should check, not a boast. Never imply the fitter does gas or notifiable electrical work unless confirmed, and never give the customer a step to try.
5. **Show what is behind the tiles and units.** Solid backing for wall hung toilets, basins and grab rails; units fixed level to the wall; waste pipes with enough fall; extraction that clears the room. One specific about the hidden layer beats any reassurance.
6. **Write situations, not lifestyles.** "Nowhere to put the shopping down" and "a queue for the bathroom at half seven", not "your dream kitchen" or "a spa retreat".

---

## 5. What good looks like: one example per field type

### Homepage service card (type A, Kitchen Renovator): 40 to 55 words

```
home_services_cards:
  - card_name: Kitchen Renovator | card_text: Most kitchens that don't work fail on layout, not looks: no stretch of worktop beside the hob, a fridge door that blocks the room. Our [kitchen renovator](/kitchen-renovator/) work covers kitchen design, fitting and worktops, planned around the order the trades need so the room is out of use for as little time as possible.
```

Why it works: opens on a recognisable situation, names three confirmed services, answers the real fear (time without a kitchen) as a principle rather than a promised timescale, and carries no local detail.

### Category page service card (type A, Walk in showers): 40 to 55 words

```
cat_services_cards:
  - card_name: Walk in showers | card_text: When [walk in showers](/services/walk-in-showers/) leak, the cause is more often the tray than the screen. A tray that flexes even slightly breaks its silicone seal, so the tray goes onto a solid, level bed before any tiling, and the screen is fitted last, once the tiles and sealant have set.
```

Why it works: the opening symptom leads straight to the hidden layer. It describes the principle of good work, not a claimed company process.

### Block 4 card, desire led (Kitchen Renovator): 40 to 60 words

```
cat_block4:
  - card_title: Nowhere to put anything down | card_body: If the kettle, the toaster and the chopping board are all fighting for the same short run of worktop, the problem is usually layout rather than size. Moving the sink or the hob, or turning a wall of units into an L or a run with a peninsula, often finds space the room already had.
```

Why it works: no fault is invented; the "sign" is a situation, and the fix is layout, not lifestyle.

### Block 4 card, problem led (Bathroom Renovator): 40 to 60 words

```
cat_block4:
  - card_title: A stain on the ceiling below | card_body: A mark on the ceiling under the bathroom that grows after showers usually points to a failed seal around the tray or bath, or a waste joint, not the supply pipes. Water behind the silicone travels along the floor first, so the stain is rarely under the leak, and the boards beneath are often wetter than they look.
```

Why it works: symptom, cause and consequence, with the route the water takes, correcting the assumption that the leak sits above the stain.

### Block 4 card, need led (Accessible and mobility bathrooms): 40 to 60 words

```
cat_block4:
  - card_title: Getting in and out of the bath | card_body: When stepping over the side of the bath has started to feel risky, a level access shower usually changes more than any grab rail. The shower floor is set level with the rest of the room and falls gently to the drain, and rails go onto solid backing fixed behind the tiles, not into plasterboard alone.
```

Why it works: written as what the person wants to do, never their condition, and it names the hidden backing as a principle rather than a claimed practice.

### Service page content block, paragraph 3 (Wet rooms)

```
In a wet room the whole floor is the shower tray, so any gap in the tanking lets water into the floor structure below. On a timber floor that means boards and joists soaking out of sight, and by the time a ceiling stains or tiles lift, the repair is a strip out back to the joists. That's why the membrane and the falls matter more than the tiles.
```

Why it works: one concrete consequence with its cause, written as a reason for doing the hidden work properly rather than a scare.

### FAQ answer, rules question (Bathroom fitting): 50 to 70 words

```
cat_faq_items:
  - faq_question: Can a bathroom fitter do the electrics? | faq_answer: Only if they're registered to, or the work is signed off by someone who is. Electrical work in a bathroom is usually notifiable, so it's done by a registered electrician or checked by building control, and you get a certificate at the end. Gas work has to be done by a Gas Safe registered engineer. It's worth asking who will do both before the job starts.
```

Why it works: the answer comes first in 15 words, the rule is what usually applies with no regulation named, and it claims nothing about this fitter's registrations.

### Location page content block, paragraph 1 (town)

```
Kitchen and bathroom work in [town] changes with the age of the house. In the Victorian terraces near the centre, the kitchen was built into a narrow rear wing, so layouts usually run along one wall. The 1930s semis further out were built with a separate toilet and bathroom upstairs, and joining them into one room is a common job. The water here is hard, so limescale shapes the choice of screen, taps and shower valve.
```

Why it works: three town facts, each tied to the work. It describes how the houses were built, never the state of anyone's kitchen, and explains no single service.

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, desire led and need led services are written as the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog a desire led topic is written as a *decision* instead: what each option suits, and what decides between them. "Wet room or walk in shower?" not "Imagine stepping into your new bathroom".

**What each post type is for in this trade:**

- **Question posts**: why silicone goes black, why a shower leaks through the ceiling, why worktop joints swell by the sink, whether a new bathroom needs building control, how long a kitchen fit takes (answered with the order of work, not a promised number of days). Answer with the cause, then the fix.
- **Decision posts**: wet room or walk in shower, bath or shower, tiles or wall panels, laminate, wood or stone worktops, electric or wet underfloor heating, refit or replace, moving the toilet or keeping it. Say which option suits which room, never which one wins.
- **Cost guides**: moving the sink, toilet or shower away from the existing waste and soil pipes; what the strip out finds; the worktop material; the area of tiling; gas or electrical work and its sign off; delivery access; making good afterwards. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local posts**: this trade is not seasonal, so local posts take one building or water condition in one named place: hard water and its effect on screens and valves, the layouts a named estate was built with, what a lease usually asks before a bathroom moves.

### Blog answer (question post): 40 to 60 words

```
blog_answer: Silicone in a shower usually turns black because mould has grown into the sealant itself. Once it's inside, cleaning only lightens the surface, so the marks return. Damp that never clears, poor extraction and soap left on the bead all speed it up, and the usual fix is to cut it out, dry and clean the joint, and reseal.
```

Why it works: the first sentence answers alone as a meta description, and the cause is physical.

### Blog section (decision post): 140 to 200 words

```
blog_sections:
- h2: Does a small bathroom suit a wet room or a walk in shower? | body: In a small bathroom, a wet room usually makes more of the space, but it asks more of the floor. A walk in shower keeps the water inside a tray and a screen, so the rest of the floor only needs to cope with splashes. A wet room drops the tray altogether, which frees up the floor and suits a room too narrow for an enclosure.\n\nThe difference is underneath. In a wet room the whole floor is tanked with a waterproof membrane, and it is built with a gentle fall to the drain so water never sits. On a timber floor that usually means a shaped deck set into the floor, and the joists themselves have to be stiff enough not to flex under the tiles.\n\nTowels and toilet roll also get wet in a small wet room unless a fixed glass panel shields them, so a panel is usually worth keeping. Our [wet rooms](/services/wet-rooms/) page explains how the floor is built.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (tray versus tanked floor, falls and a stiff deck, the splash panel), and the link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** trend and showroom posts any national site could write; "it depends" without naming what it depends on; any step a customer could take on gas, wiring or a boiler (say what to avoid and to call a registered engineer or electrician); fixed timescales that ignore templating and drying times; brand comparisons.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- Showroom language ("your dream kitchen", "a spa retreat", "stunning", "luxury") instead of layout, waterproofing and the order of work.
- A sentence that could sit on any fitter's site in the country, with no layout, water, fixing or sequence detail in the paragraph.
- Implying the fitter does gas or notifiable electrical work when that isn't confirmed, or wording that reads as a step the customer could try.
- Symptoms invented for desire led services ("signs you need a new kitchen").
- Treating silicone as the waterproofing, or a fresh bead of sealant as the fix for a leak that has soaked the floor.
- Fixed timescales, managing every trade, free design visits or guarantees stated as this client's practice when not confirmed.
- Local detail that judges interiors ("the dated bathrooms in this area") or claims what is behind the walls.
- Clinical, pitying or age based language on accessible bathrooms, or a council grant promised rather than described as possible and usually means tested.
- Naming manufacturers or product brands.
- Implying design capability for a fit only client, or fitting for a design only one.

---

## Notes for Brandon

- Both categories mapped to type A with no emergency marker, even though leaks feel urgent. Fitters rarely offer call outs; emergency leaks belong to Plumbing & Heating. If a client confirms emergency leak repairs, the mapping needs a second look for that client.
- Accessible and mobility bathrooms get their own "need led" split, written as what the person wants to do, never as a symptom or condition. Please check this sits well with how code briefs block 4.
- Gas Safe is named in the FAQ example. It is a register, not a regulation or standard, so I've treated it as allowed; please confirm.
- Media walls and fitted shelving are desire led; any electric fire or TV wiring in them falls to a registered electrician. Underfloor heating appears only as part of a new room; the heating pages stay with Plumbing & Heating.
