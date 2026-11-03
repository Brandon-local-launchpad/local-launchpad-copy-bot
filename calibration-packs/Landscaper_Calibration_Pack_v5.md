# Landscaper / Gardener Calibration Pack v5

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for gardens, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Two different customers read a landscaper's site, and the copy has to know which one it is talking to.

- **The maintenance customer** wants the garden kept under control without thinking about it. They are buying reliability over months: someone who turns up, does the same good job each time, and notices things. Copy for them is calm and practical, and talks about rhythm, timing and what slips when visits stop.
- **The project customer** wants a garden they will use: a patio, a lawn that survives the kids, a deck in the evening sun. They are spending real money once and their fear is that it looks good for a summer and fails by the second winter. Copy for them talks about what is underneath (the base, the drainage, the fixings), because that is where cheap work cuts corners and where they cannot see.

The voice is a tradesperson who knows plants and ground, explaining it plainly to a homeowner. Never a garden designer selling a lifestyle.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Gardener | B recurring | What slips when visits stop, and the moments in the year a visit matters most |
| Lawn care | B recurring | What the customer sees in the lawn and which season's treatment deals with it |
| Landscape Gardener | A project | A mix: situations for the desire led projects, symptoms for the problem led ones (see below) |
| Paving | A project | Symptoms of a failed base: rocking slabs, sinking, puddles, weeds in the joints |
| Decking | A project | Symptoms in boards, joists and posts; for new decks, the situation that leads to one |
| Tree service | A project | Situations and warning signs in trees; storm damage only if the client confirms emergency call outs |

**Desire led versus problem led, inside type A.** A type A block 4 card is framed as "signs you need it", but nobody has symptoms of wanting a patio. For desire led services, the "sign" is the customer's situation, not a fault:

- **Desire led** (write the situation): patios, decking installation, composite decking, pergolas, ponds and water features, artificial grass, garden paths, garden steps, turf laying, tree planting.
- **Problem led** (write symptom, cause, consequence): garden drainage, driveway repairs, decking repairs, retaining walls, garden levelling, tree removal where the tree is the problem.
- **Schedule led** (write what slips and when): lawn mowing, hedge trimming, garden maintenance, lawn treatments, mulching, weed control, driveway sealing, decking restoration.

**Seasonal niche.** Landscaping is seasonal. Where code swaps a block 4 card for the time of year, write when the work should be done *and the reason in the ground or the plant*, never "spring is a busy time".

---

## 3. Local detail that works in this trade

Gardens sit directly on the ground and in the weather, so this trade has some of the richest legitimate local detail of any niche. Use it as the research gives it.

**Strong anchors** (area wide and checkable): soil type and drainage (clay that holds water, sandy ground that dries out, chalk, thin soil over rock); slope and levels; exposure to wind or salt; plot shape by housing era (long narrow terrace gardens, open plan estate fronts, large village plots); access (through the house, shared alleys, no side gate); conservation areas and tree preservation orders where the research confirms them; flood risk zones.

**Every anchor must change the work.** Clay is only worth mentioning if it then explains the drainage under a patio or why a lawn compacts. A conservation area is only worth mentioning if it then explains why tree work needs notice first.

**Do not:** claim gardens in an area are overgrown, neglected or badly kept; name plant or weed species the research does not support for that area; turn an era into a judgement about today's gardens.

---

## 4. Craft rules for this trade

1. **Name the job, not the category.** "Edging the lawn and cutting the hedge back to last year's line", not "garden maintenance". "A compacted stone base under the slabs", not "a quality installation".
2. **Put the cause in the ground or the plant.** Every consequence in this trade has a physical reason: water with nowhere to go, roots short of moisture, a base that moved, growth that went woody. Name the reason, and the copy reads as expertise rather than warning.
3. **Timing is the trade's main idea.** When to cut, lay, treat or prune decides the result more than effort does. Most good cards and FAQs in this trade have a time of year and a reason for it.
4. **Never promise what nature controls.** No lawn "will stay green", no hedge "will thicken up", no tree "is safe". Say what the work does and what it protects against.
5. **Reassure without dismissing.** Moss after a wet winter, brown patches in a dry summer, a tree dropping leaves early: most are normal. Saying so honestly, then naming what is *not* normal, is what earns trust.
6. **Show what is hidden.** The project customer's fear is what they cannot see: under the slabs, inside the post holes, below the turf. A single specific about that layer is worth more than any reassurance.

---

## 5. What good looks like: one example per field type

### Homepage service card (type B, Gardener): 40 to 55 words

```
home_services_cards:
  - card_name: Gardener | card_text: Borders that were tidy in May and lost by July are what regular visits stop. Our [gardener](/gardener/) rounds cover lawn mowing, edging, hedge trimming and weeding, so the garden gets a little attention often instead of one big rescue at the end of each summer.
```

Why it works: opens on a situation the reader recognises, names three confirmed services in plain words, keeps the link inside a sentence, and carries no local detail (cards don't).

### Category page service card (type A, Patios): 40 to 55 words

```
cat_services_cards:
  - card_name: Patios | card_text: A patio that rocks underfoot or holds puddles after rain has usually failed below the slabs, not on top. Our [patio](/services/patios/) work starts with the dig and a compacted stone base, then the slabs go down on a full mortar bed with a slight fall so water runs off.
```

Why it works: the opening symptom leads straight to the hidden layer, which is the project customer's real fear. The methods named are standard methods from the trade facts, not products.

### Block 4 card, problem led (Tree service): 40 to 60 words

```
cat_block4:
  - card_title: Trees close to the house | card_body: On clay ground, a big tree near the house usually causes trouble by drying the soil in summer, not by roots pushing on walls. The right answer depends on the species, the distance and the ground, because felling a large tree on clay can let the soil swell back, which brings movement of its own.
```

Why it works: corrects the common belief, gives the physical cause, and is honest that removal isn't automatically the fix. It describes the principle without claiming this business's process.

### Block 4 card, desire led (Landscape Gardener): 40 to 60 words

```
cat_block4:
  - card_title: A garden you look at but don't use | card_body: If the garden is something you see from the kitchen rather than sit in, it's often down to one thing: nowhere level and dry to put a table. A patio or deck sized for how you'd actually use it, near the back door and catching the evening sun, usually changes that.
```

Why it works: there is no fault to describe, so the "sign" is a situation the reader recognises. The fix is practical, not a lifestyle pitch.

### Block 4 card, schedule led (Gardener, type B): 40 to 60 words

```
cat_block4:
  - card_title: Hedges past their window | card_body: By midsummer, a hedge left since spring has put on a season's growth, and cutting it then means going back into thicker wood and leaving a ragged face for weeks. A visit before that point keeps the cut in soft new growth, once the hedge has been checked for nesting birds.
```

Why it works: a time of year, a reason in the plant, and the consequence of missing it. The nesting check is the trade's legal reality, stated as a normal part of the job.

### Service page content block, paragraph 3 (Turf laying)

```
New turf that dries out in its first few weeks shrinks at the joins before it has rooted, and the gaps that open fill with weeds and stay visible all season. That's why the watering after laying matters as much as the laying, and why turf put down in a hot, dry spell is harder to get established.
```

Why it works: one concrete consequence the customer would actually see, with its cause, written as a reason rather than a scare. It does not imply the reader's lawn has a problem.

### FAQ answer, rules question (Decking): 50 to 70 words

```
cat_faq_items:
  - faq_question: Do I need planning permission for decking? | faq_answer: Usually not, if it's in the back garden and under 30 centimetres high. Higher decking usually does, as does decking that, with sheds and other buildings, covers more than half the garden. Listed buildings and some conservation areas have tighter rules. Raised decks on sloping plots are where this comes up most, so it's worth settling the height before the design.
```

Why it works: the answer comes first in under 15 words, the rule is written as what usually applies, with no regulation named, and it closes on the practical case where the rule bites. (The figures come from the trade facts pack on the day; never from this example.)

### Location page content block, paragraph 1 (town)

```
Landscaping in [town] covers two very different kinds of garden. Near the centre, Victorian terraces have long, narrow plots reached through the house or a shared alley, so every bag of soil and every slab is carried in and the job is planned around access. On the 1970s estates at the edge of town, the gardens open up, but the clay under the lawns holds water through winter.
```

Why it works: two town facts, each tied to what it means for the work. It describes the housing, not the state of anyone's garden, and explains no single service (that is the service pages' job).

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, desire led services are written as the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog a desire led topic is written as a *decision* instead: what each option suits, and what decides between them. "Turf or seed?" not "Picture your new lawn".

**What each post type is for in this trade:**

- **Question posts**: the problems people search for in their own garden. Waterlogged or mossy lawns, brown patches, weeds coming up between slabs, a patio that has sunk, when to cut a hedge. Answer with the cause in the ground or the plant, then what fixes it.
- **Decision posts**: turf or seed, composite or timber decking, block paving or a patio, repair or replace a fence or deck, whether a deck, fence or front drive needs permission. Say which option suits which garden, never which is "best".
- **Cost guides**: what moves the price in this trade. Access (through the house or a side gate), how much has to be dug out and taken away, levels and slopes, the base needed for the ground, and the material chosen. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one ground or weather condition in one named place, and what it means for the work at that time of year. Clay that stays wet into spring, sandy ground that dries out by June, an exposed edge of town that catches the wind.

### Blog answer (question post): 40 to 60 words

```
blog_answer: A waterlogged lawn is usually down to compacted soil, not too much rain. When the top few centimetres are packed hard, water can't get down into the ground below, so it sits on the surface. On clay, that compaction builds faster, and a lawn that's walked on all winter often stays soft into spring.
```

Why it works: the first sentence answers on its own and makes a clean meta description. The cause is physical, and the local condition (clay) explains it rather than decorating it.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: Will aerating fix it, or does it need drainage? | body: Aerating fixes most waterlogged lawns, and drainage is for the ones it doesn't. Hollow tine aeration pulls small plugs of soil out of the lawn, which opens channels for water and air to reach the roots again. Brushing sharp sand into the holes keeps them open for longer, and on compacted clay it usually needs doing every autumn, not just once.\n\nIf the lawn still holds water a day after heavy rain once it's been aerated, the problem is lower down. That usually means the lawn sits lower than the ground around it, or there's a layer under the topsoil that water can't pass through. That's when a land drain is the answer: a gravel trench with a perforated pipe that carries the water away to a soakaway or a border.\n\nA test hole dug in the wettest spot usually shows which of the two you're dealing with. Our [garden drainage](/services/garden-drainage/) page explains what each fix involves.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact that would come from the trade facts rows (aeration and sanding, when drainage is needed, how a land drain works), and it separates the cheap fix from the bigger one honestly. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** generic gardening advice any national site could give (plant lists, design trends); "it depends" without naming what it depends on; DIY instructions for tree work or anything needing a chainsaw or a ladder; seasonal posts that name a month with no reason in the ground or the plant.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any landscaper's site in the country, with no ground, plant, timing or access detail anywhere in the paragraph.
- Local detail used as scenery: a soil type or a river named with nothing about what it does to the work.
- Species, soils or conditions the research doesn't support for that area.
- Lifestyle language on project pages ("your dream outdoor space", "an oasis") instead of what is built and what's under it.
- Symptoms invented for desire led services ("signs you need a patio").
- Promises about results that depend on weather and plants.
- Treating normal seasonal things (moss after winter, summer browning) as problems to sell against.
- Implying design capability for a maintenance only client, or regular visits for a project only client.
- Visit frequencies, waste removal, free first visits or seasonal contracts stated as this client's practice when not confirmed.

---

## Changes from v4

- Removed the rules the CORE prompts now hold (dashes, unconfirmed claims, placeholders, Brandon notes), the facts now held by the trade facts pack, and the old template sections (seasonal tasks lists, neighbourhood cards, how it works essays, VA link notes).
- Examples rewritten at the new field lengths with `[CV: key]` tokens and Markdown links. v4's examples ran 90 to 130 words against 40 to 60 word fields, and one asserted a free first visit that wasn't confirmed.
- Added the reader split (maintenance versus project), the category to block 4 map, and the desire led / problem led / schedule led split for type A cards.
- Added a blog section: what each post type is for in this trade, the no situations rule for the blog, and blog answer and section examples at blog length. v4 had no blog guidance.
