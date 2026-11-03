# Tree Surgeon Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for trees, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three different customers read a tree surgeon's site, and the copy has to know which one it is talking to.

- **The worried owner** has a tree that has started to bother them: a lean that looks worse, a split in the trunk, fungus at the base, a big limb over the roof or the neighbour's car, roots near the house. They fear it coming down, and being talked into felling a tree that only needed a prune. Copy for them names what is a real warning sign and what is normal.
- **The owner who wants change** wants more light, a tree away from the gutters, a hedge brought back down, a stump gone. There is no fault; there is a situation. Copy for them talks about what the work does to the tree and how it will look next year, not just on the day.
- **The commercial and estate customer** (landlords, schools, managing agents, developers) needs surveys, reports, clearance and planned work with paperwork behind it. Copy for them is about records, permissions and timing.

The fear running through all three is the cowboy: the doorstep "tree surgeon" who tops a tree, leaves the mess and never checked whether it was protected. Climbing and chainsaw work at height is dangerous, and the copy never treats any of it as something to try yourself.

The voice is an arborist who knows how trees grow and fail, explaining it plainly to an owner. Never a woodsman romance, and never a scare.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Tree service | A project | Situations and warning signs in trees; storm damage and fallen trees only if the client confirms emergency call outs |

This matches the Tree service row in the Landscaper pack, so a site that runs both packs gets the same framing.

**Emergency work only when confirmed.** Tree surgery is type A, not A with the emergency marker. Emergency tree work (fallen trees, storm damaged limbs hanging over a roof or road) is written only when the client confirms call outs. Where they do, those cards and that page are written as situation, why it can't wait, and what happens when they call, and they must not bleed into the planned pages. Where they don't, a storm card is written as planned work after a storm: what to check, and what makes damage urgent enough to keep clear of.

**Inside type A, three kinds of service:**

- **Problem led** (write warning sign, cause, consequence): tree removal and felling where the tree is the problem, ash dieback management, tree cabling and bracing, tree surveys and reports when something has been noticed, root barriers, ivy removal where the ivy hides the trunk or adds weight, emergency tree work where confirmed.
- **Desire led** (write the situation, never invent symptoms): tree pruning and crown reduction for light or clearance, tree stump removal, tree planting, tree transplanting, hedge reduction and removal, site and vegetation clearance, woodland management, wood chipping, firewood and logs.
- **Schedule led** (write what slips and when): hedge trimming, pollarding and coppicing on a cycle, repeat crown work on trees managed to a size, surveys on a set cycle for landlords and estates.

**Seasonal niche.** Tree work is seasonal. Where code swaps a block 4 card for the time of year, write the reason in the tree or the law: nesting birds through spring and summer mean any work is checked first; most deciduous trees are easiest to assess and prune when bare; some species bleed sap if cut in late winter and spring; ash dieback shows most clearly in summer canopy. Never "autumn is a busy time".

---

## 3. Local detail that works in this trade

Trees sit in the ground, the weather and the planning system. Use local detail as the research gives it.

**Strong anchors** (area wide and checkable): conservation areas and tree preservation orders, where the research confirms them, and which council handles the notice or the application; soil type (shrinkable clay where tree roots and foundations interact; thin soil over chalk or rock where roots stay shallow and trees blow over more easily); exposure to wind on hills and coasts; housing era and plot shape (mature street trees and big gardens around Victorian and Edwardian villas, small new build gardens with young trees planted close to the house); access (terraced streets with no rear access, where everything goes through the house or over it); established woodland, ancient trees and estate land nearby; ash dieback where the research confirms it locally.

**Every anchor must change the work.** A conservation area is only worth mentioning if it then explains the six weeks' notice usually needed before work. Clay is only worth mentioning if it then explains why removing a big tree near a house needs advice first.

**Do not:** claim trees in an area are dangerous, diseased or neglected; name species the research does not support for that area; say a street or estate *has* tree preservation orders unless the research confirms it; claim storm damage or ash dieback locally without research.

---

## 4. Craft rules for this trade

1. **Name the cut, not the category.** "Reducing the crown by a few metres back to growth points", "lifting the canopy so you can walk under it", "grinding the stump below the surface", not "tree work". A named cut tells the reader this is someone who knows how a tree responds.
2. **Put the cause in the tree.** Every warning sign has a biological or physical reason: decay where a limb was torn off, a weak fork with bark trapped between two stems, roots damaged by digging, fungus feeding on dead wood inside. Name the reason and the copy reads as knowledge rather than fear.
3. **Never promise a tree is safe.** No tree "will last for years" or "is now safe". Say what the inspection found and what the work reduces. Honest arborists talk about risk, not guarantees.
4. **Felling is not the default.** Most trees that worry owners need pruning, reduction or simply a look, not removal. Say when removal is the right answer, and say honestly when it isn't. Topping (cutting every branch back to stumps) is bad practice, and copy never offers it.
5. **Permissions are part of the job.** Tree preservation orders and conservation areas usually mean the council has to be told or asked before work. Nesting birds are protected, and active nests are usually left alone until the young have gone. Bats can roost in old trees and are protected too. State these as normal parts of planning the work, written as what usually applies.
6. **Work at height is never DIY.** Copy can say what an owner can safely notice (a new lean, cracks in the ground at the base, fungus, dead wood in the crown) and never describes climbing, a ladder against a tree, or chainsaw work as a job for the reader.

---

## 5. What good looks like: one example per field type

### Homepage service card (desire led, Tree pruning and crown reduction): 40 to 55 words

```
home_services_cards:
  - card_name: Tree pruning and crown reduction | card_text: A tree that has grown to shade the whole garden or reach the gutters usually needs shaping, not felling. Our [tree pruning and crown reduction](/services/tree-pruning-and-crown-reduction/) work cuts back to natural growth points so the tree keeps its shape, lets more light through and regrows evenly rather than in a mass of shoots.
```

Why it works: opens on the situation, not a fault, steers away from felling honestly, and names the cut in terms of how the tree will respond next year.

### Category page service card (problem led, Tree removal and felling): 40 to 55 words

```
cat_services_cards:
  - card_name: Tree removal and felling | card_text: Removal is the right answer when a tree is dead, badly decayed, or simply in the wrong place for its size. Careful [tree removal and felling](/services/tree-removal-and-felling/) usually means taking it down in sections from the top, so nothing heavy falls near the house, and checking for protection orders and nesting birds first.
```

Why it works: says when removal is right, describes the principle of good work (sectional dismantling, permissions first) rather than claiming this business's process, and doesn't make felling sound like the default.

### Block 4 card, problem led (Tree surveys and reports): 40 to 60 words

```
cat_block4:
  - card_title: Fungus at the base of a tree | card_body: Brackets or mushrooms at the base of a tree usually mean a fungus is feeding on wood inside, often in the roots or the lower trunk. Some are harmless and some weaken the tree a great deal. Which one it is, and how much sound wood is left, decides whether the tree needs work at all.
```

Why it works: a warning sign the reader can see, its cause inside the tree, and an honest "it depends" that names exactly what it depends on. No scare and no promise.

### Block 4 card, desire led (Tree stump removal): 40 to 60 words

```
cat_block4:
  - card_title: A stump where you want lawn or a bed | card_body: A stump left after felling takes years to rot down and often throws up new shoots from the roots. Grinding it out below the surface leaves chippings and soil that can be cleared, so the area can be levelled and turfed or planted, while the larger roots break down slowly underground.
```

Why it works: the sign is the owner's situation, not a fault. It says honestly what grinding does and doesn't remove, which is what the reader needs to plan the space.

### Block 4 card, urgent, only if call outs are confirmed (Emergency tree work): 40 to 60 words

```
cat_block4:
  - card_title: A limb hanging after a storm | card_body: A broken limb caught in the crown can't wait, because the next gust can bring it down without warning onto whatever is below. Keeping people and cars clear of the area is the first step. After that, the job is to lower it under control and check what the break has left behind.
```

Why it works: situation, why it can't wait, the safe first step, and what the visit does, with no arrival time promised. Used only when the client confirms emergency call outs.

### Service page content block, paragraph 3 (Tree cabling and bracing)

```
A weak fork rarely fails on a still day. It splits in a storm, when the two stems pull apart under the wind and the narrow joint between them, often with bark trapped inside, can't hold. When that happens, one half of the tree usually comes down, and the half left standing is often too unbalanced to keep.
```

Why it works: one consequence the reader can picture, with its physical cause, written as a reason rather than a threat. It does not imply the reader's tree is about to fail.

### FAQ answer, rules question (Tree removal and felling): 50 to 70 words

```
cat_faq_items:
  - faq_question: Do I need permission to cut down a tree? | faq_answer: Usually not, unless the tree is protected or in a conservation area. Trees with a preservation order usually need the council's consent first, and in a conservation area six weeks' notice is usually needed for most work. Felling a lot of timber can need a licence too. Nesting birds are protected whatever the tree's status, so timing matters.
```

Why it works: the answer comes first in under 15 words, the rules are written as what usually applies with no regulation named, and it closes on the rule that applies to every tree. (Thresholds come from the trade facts pack on the day; never from this example.)

### Location page content block, paragraph 1 (town)

```
Tree work in [town] depends on which side of town the tree is in. The older streets around the centre sit inside a conservation area, so most work there starts with notice to the council, and the gardens behind the terraces can only be reached through the house. On the newer estates, trees are younger, but the clay under them means planting near the house needs thought.
```

Why it works: two town facts, each tied to what it means for the work. It describes planning status, access and ground, not the state of anyone's trees, and explains no single service.

---

## 6. Blog posts and cost guides

The voice and local detail rules above still apply on the blog, with one difference.

**No situations on the blog.** On the website pages, desire led services are written as the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog a desire led topic is written as a *decision* instead: what each option suits, and what decides between them. "Crown reduction or felling?" not "Picture your garden full of light".

**What each post type is for in this trade:**

- **Question posts**: is a leaning tree dangerous, what fungus at the base means, whether roots can damage a house, whether a tree is protected. Answer with the cause in the tree or the rule as it usually applies, and say plainly that climbing and chainsaw work are for a qualified arborist.
- **Decision posts**: prune or fell; grind or remove a stump; reduce or remove a hedge; pollard or reduce; replant or leave. Say which option suits which tree and garden, never which is "the one to choose".
- **Cost guides**: the size and position of the tree, access (through the house, over a roof, near power lines), whether it can be felled whole or comes down in sections, the timber and chippings, stump work, and any survey or permission first. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one ground, weather or planning condition in one named place and what it means for trees at that time of year. Conservation area notice in a named town, clay and big trees near houses, an exposed edge of town after winter storms, ash dieback where the research confirms it.

### Blog answer (question post): 40 to 60 words

```
blog_answer: A leaning tree is not usually dangerous if it has grown that way over many years. Trees that lean towards light often root themselves to match. A lean that is new or getting worse is different, especially with cracked or lifted soil on the opposite side, because that usually means the roots are failing.
```

Why it works: the first sentence answers on its own and reassures honestly, then names exactly what is not normal and why. It is a clean meta description.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: Can tree roots damage a house? | body: They can, but usually by drying the ground rather than pushing on the walls. On shrinkable clay, a large tree draws water from the soil through the summer, and the clay shrinks as it dries. If the foundations are shallow, the house can move with it, and cracks that open in late summer and close in winter are the usual sign.\n\nOn sand, gravel or chalk, the ground barely shrinks, so the same tree at the same distance is far less of a concern. Roots can still lift paths, block old clay drains through cracked joints, or crack light walls nearby.\n\nFelling a big tree on clay isn't always the answer, because the soil can swell back as it rewets, which brings movement of its own. Reducing the crown to cut how much water the tree takes up, or a root barrier, can be the better choice, and that decision is worth a survey first. Our [tree surveys and reports](/services/tree-surveys-and-reports/) page explains what one covers.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (clay shrinkage and seasonal cracking, why other soils differ, heave after felling), and it is honest that removal is not automatically the fix, consistent with the Landscaper pack. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** DIY instructions for anything needing a ladder, a rope or a chainsaw; "it depends" without naming what it depends on; posts that make felling the answer to every question; species lists and tree identification any national site could give; seasonal posts that name a month with no reason in the tree or the law.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any tree surgeon's site in the country, with no tree, cut, ground, access or permission detail anywhere in the paragraph.
- Fear selling: "a tree could fall at any moment", or treating every lean, fungus or dropped branch as a reason to fell.
- Topping offered or described as a normal service.
- Promises that a tree is safe or will recover.
- Protection orders, conservation areas or nesting birds left out of work they apply to, or claimed for an area without research.
- Emergency or storm call outs written for a client who hasn't confirmed them.
- Symptoms invented for desire led services ("signs you need stump grinding").
- Woodsman romance or lifestyle language ("bringing nature back into balance") instead of what is cut and why.
- Insurance cover, qualifications, waste removal, free quotes or logs left for the client stated as this client's practice when not confirmed.
- Species or diseases the research doesn't support for that area.

---

## Notes for Brandon

- Mapped to plain type A, with emergency storm work written only when the client confirms call outs, matching the Tree service row in the Landscaper pack. If a client does confirm call outs, it may be worth letting code set the emergency marker for that site so the steps brief changes to call, arrive, fix.
- Hedge trimming is shared with the Landscaper pack, where it is schedule led. I kept it schedule led here so the two agree.
- The FAQ example uses the six weeks' notice for conservation areas and mentions a felling licence without the volume threshold. Worth confirming the trade facts pack carries the same rules.
