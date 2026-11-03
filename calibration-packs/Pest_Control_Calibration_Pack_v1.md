# Pest Control Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for pest work, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three different customers read a pest controller's site, and the copy has to know which one it is talking to.

- **The householder with a problem now.** They have heard scratching in the ceiling, found droppings behind the cooker, or seen wasps under the eaves. They are anxious, often embarrassed, and want to know what it is, whether it is dangerous, and how it stops. Copy for them names the pest, the sign and what happens next.
- **The householder who wants it not to come back.** Often the same person a month later, really buying the proofing: finding the way in and sealing it. Copy for them talks about gaps at the roof line, broken air bricks, pipe entries and drains, where a cheap treatment stops short.
- **The commercial client.** A food business, a managing agent, a school, a warehouse. They are buying a routine and a paper trail: visits on schedule, monitoring points checked, and a written record that stands up when an environmental health officer or auditor asks. Copy for them is businesslike and talks about what slips when visits lapse.

What all three fear: poison near children and pets, a smell inside a wall, being judged as dirty, and an unneeded contract.

The voice is a technician who understands animal behaviour, explaining it plainly to someone worried. Never alarmist, never a hard sell.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

This trade has one GBP category, so the table splits it by service group.

| Category (GBP) and service group | Type | Block 4 is about |
|---|---|---|
| Pest control service: Wasp nest removal, Rat and mouse control (where call outs are confirmed) | A + emergency marker | When to call us out: a wasp nest by a door or where children play, someone in the house who reacts badly to stings, rats inside the living space or a kitchen |
| Pest control service: Bed bug treatment, Ant control, Cockroach control, Flea treatment, Fox and wildlife control, Pest surveys and inspections | A project | Common problems: the sign the customer sees, the pest behind it, and what stops it for good |
| Pest control service: Bee removal and relocation | A project | Which bee it is, and why honey bees are moved rather than destroyed |
| Commercial pest control | A project, schedule led | What slips when routine visits stop, and what an inspector expects to see on paper |

**Urgent versus planned, then problem led and schedule led inside the planned work.**

- **Urgent** (write the situation, why it can't wait, what happens when they call): wasp nests near doors, bins, windows and play areas; rats or mice inside the living space; rodents in a food business. Only where the client confirms call outs.
- **Problem led** (write symptom, cause, consequence): most of the planned work, from rodents outside call outs, bed bugs, cockroaches, ants and fleas to squirrels, birds, moles, rabbits, moths, woodworm, pest proofing, dead animal removal and loft decontamination.
- **Schedule led** (write what slips and when): commercial pest control, routine monitoring contracts, and pest surveys and inspections for businesses.

**Seasonal niche.** Pest work follows the animal's year: wasp nests peak in late summer; rodents move indoors as the weather cools and, near farmland, after harvest; fleas build up in warm months and when the heating goes on. Where code swaps a block 4 card for the time of year, write when the work matters *and the reason in the animal's life cycle*, never "summer is a busy time".

---

## 3. Local detail that works in this trade

Pests follow food, water and shelter, and the way a town is built decides how they get in. Use the local research for those things, never for judgements about people or homes.

**Strong anchors** (area wide and checkable): housing era and construction (Victorian terraces with connected roof spaces and suspended floors that let mice travel between houses; older jointed clay drains); rivers and canals; farmland on the edge of town; woodland close to houses; roofs where gulls nest; a high street dense with food businesses; tenure, where it explains who arranges the work.

**Every anchor must change the work.** Connected terraces are only worth mentioning if they then explain why proofing one house rarely holds while next door has activity. A canal is only worth mentioning if it then explains why rat activity in nearby gardens carries on all year.

**Do not:** say an area has a rat problem or dirty streets; link pests to particular streets, tenures or residents; claim anything about the council's pest service or local infestation figures the research does not give; name pests that don't occur in England (there are no termites in the UK).

---

## 4. Craft rules for this trade

1. **Name the pest and the sign, not the "infestation".** "Droppings along the skirting behind the fridge", not "a pest issue". The sign is what the customer has seen, and naming it tells them they are in the right place.
2. **Treatment clears; proofing stops the return.** Any card about rodents, squirrels or birds should reach the way in: the gap under the eaves, the broken air brick, the pipe entry, the cracked drain. Copy that only talks about treatment sells a job that comes back.
3. **Let the life cycle set the timing.** Wasp colonies die off in autumn and the nest isn't reused, so a nest found in winter usually needs nothing. Flea pupae sit out a treatment and hatch for weeks afterwards. Bed bug eggs are why treatment takes more than one visit. These facts explain timings honestly and stop customers thinking a treatment failed.
4. **State the legal and humane limits as a normal part of the job.** Bats are protected and never removed or exterminated; a roost means advice. Honey bees are relocated, not destroyed. Nesting birds are protected. Caught grey squirrels can't legally be released. Foxes are deterred and proofed out, not poisoned. Said plainly, these limits read as competence.
5. **Never give poison advice; explain why the shop attempt failed.** A spray at a nest entrance makes wasps defensive without reaching the colony. Foggers scatter bed bugs deeper into the room. Spraying some ant trails splits the colony into new nests. Bait laid in a loft can leave a smell from inside a wall. Say what to avoid and why, then that a qualified technician should handle it. Never how to use any product.
6. **Calm, never a scare story.** Rodents can carry disease and stings can cause serious reactions; say that once, accurately, and move on. No shame, no suggestion that pests mean a dirty home.

---

## 5. What good looks like: one example per field type

### Homepage service card (type A + emergency, Rat and mouse control): 40 to 55 words

```
home_services_cards:
  - card_name: Rat and mouse control | card_text: Scratching above the ceiling at night, droppings behind the cooker or a gnawed food packet usually mean rodents have found a way in. Good [rat and mouse control](/services/rat-and-mouse-control/) starts by finding that gap, because clearing the rats or mice inside without sealing it only makes room for the next ones.
```

Why it works: opens on three signs the reader recognises, links the confirmed service inside a sentence, and makes the proofing point as a principle of good work rather than a claim about this business's process.

### Category page service card (type A + emergency, Wasp nest removal): 40 to 55 words

```
cat_services_cards:
  - card_name: Wasp nest removal | card_text: Wasps going in and out of one spot under the eaves or a gap in the brickwork usually mark a hidden nest. The usual [wasp nest removal](/services/wasp-nest-removal/) treatment goes in at that entrance, so the colony dies off inside within a day or so, with no need to open up the roof or wall.
```

Why it works: the sign tells the reader where the nest is, and the method answers the fear they haven't voiced (does the roof come apart?). It describes the standard method without naming a product.

### Block 4 card, urgent (Wasp nest removal, when to call us out): 40 to 60 words

```
cat_block4:
  - card_title: A nest by a door or where children play | card_body: A wasp nest next to a door, a bin store or a play area can't wait for autumn, because the colony defends its entrance and grows more defensive through late summer. It matters most where someone in the house has reacted badly to a sting. Until it's treated, keeping people away from the entrance is the main precaution.
```

Why it works: the situation, why it can't wait (with the reason in the colony's growth) and a safe holding step, with no DIY treatment and no promised response time.

### Block 4 card, problem led (Squirrel control): 40 to 60 words

```
cat_block4:
  - card_title: Noises in the loft | card_body: Scratching and scurrying above the ceiling after dark usually points to mice or rats; heavier running in the early morning points more often to grey squirrels. Either way there is a gap, often at the roof line or a broken air brick, and waiting means chewed cables, soiled insulation and young being born in the loft.
```

Why it works: helps the reader identify the pest from what they hear, puts the cause in the building, and makes the consequence concrete without scaring.

### Block 4 card, schedule led (Commercial pest control): 40 to 60 words

```
cat_block4:
  - card_title: Visits that have quietly lapsed | card_body: In a food business, the gap between routine visits is when activity builds unnoticed. Monitoring points go unchecked, a new gap under a delivery door goes unsealed, and the record of visits stops. An inspector usually asks to see that record, so a lapsed contract tends to show up on paper before it shows up as droppings.
```

Why it works: says what slips and when, in the commercial reader's terms (records, inspection), and states the inspection reality as what usually happens, with no regulation named.

### Service page content block, paragraph 3 (Bed bug treatment)

```
Bed bugs left alone spread from the bed into skirting boards, sockets and the joints of furniture, and from one room into the next. Shop sprays and foggers often speed that up, because they drive the bugs deeper into the room without killing the eggs. That's why treatment usually takes more than one visit, timed around the eggs hatching, and why acting early keeps it to one room.
```

Why it works: one consequence the customer would see, with its cause, and an honest explanation of why the shop attempt makes it worse, without telling anyone how to treat it themselves.

### FAQ answer, rules question (Bee removal and relocation): 50 to 70 words

```
cat_faq_items:
  - faq_question: Can you get rid of the bees in my wall? | faq_answer: Honey bees are usually relocated, not destroyed. A swarm that has just arrived can often be collected by a beekeeper, and an established colony in a wall needs careful removal of the comb as well as the bees. Bumblebee nests are usually left alone, because the colony dies off naturally by late summer. Bees are often mistaken for wasps, so a photo is a sensible first step.
```

Why it works: the answer comes first in seven words, the protection is stated as what usually applies, it separates honey bees from bumblebees accurately, and it closes on a practical step.

### Location page content block, paragraph 1 (town)

```
Pest control in [town] follows the way the town is built. In the Victorian terraces near the centre, roof spaces and floor voids run from one house to the next, so mice travel along the row and proofing has to look at the party walls as well as the house itself. Along the river and the canal towpath, rats stay active all year, and broken joints in older clay drains are a common way into a kitchen.
```

Why it works: two town facts, each tied to the work. It describes buildings and waterways, never anyone's home, and explains no single service.

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, urgent work is written as the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog a pest topic is written as a question about the animal or a decision between approaches. "How do rats get into a house?" not "Imagine hearing scratching at 3am".

**What each post type is for in this trade:**

- **Question posts**: what people search for when they find a sign. What's making the noise in the loft, why fleas appear after treatment, whether wasps reuse a nest, how mice got in. Answer with the animal's behaviour, then what deals with it.
- **Decision posts**: treatment or proofing (and why it is usually both), heat or chemical treatment for bed bugs, a single treatment or a monitoring contract for a business. Say which approach suits which situation, never which one wins.
- **Cost guides**: what moves the price in this trade. The pest, how established it is, the number of visits, access (a nest high on a gable), the proofing needed, and for businesses the site size and visit frequency. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one condition in one named place at one time of year. Rodents moving indoors in autumn on the farmland edge of town; gulls nesting on town centre roofs.

### Blog answer (question post): 40 to 60 words

```
blog_answer: Fleas seen after treatment are usually newly hatched adults, not a failed treatment. Flea pupae sit in carpets and floor gaps inside a cocoon that treatment can't get through, and they hatch when they sense warmth and movement. Vacuuming often and leaving treated floors unwashed for a while lets the treatment catch them as they emerge.
```

Why it works: the first sentence answers on its own and makes a clean meta description. The cause is in the flea's life cycle, and the aftercare is the standard advice a technician gives, with no product named.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: How do rats get into a house? | body: Most rats get into a house through the drains or a gap at ground level, not through an open door. A rat can squeeze through a hole about the width of a thumb, and a mouse through one the width of a pencil, so the way in is often smaller than people expect.\n\nBroken drains are the route most often missed. Rats live and travel in the sewer, and a cracked pipe or a failed joint under the house lets them out into the floor void or a wall cavity. A drain camera survey shows where the break is, and a one way valve fitted in the drain stops them coming back up the pipe.\n\nAbove ground, the usual entries are broken air bricks, gaps around pipes where they pass through the wall, and gaps under the eaves for rats that climb. Sealing those with materials rodents can't chew through is what stops a return once the rats inside are dealt with. Our [pest proofing](/services/pest-proofing/) page explains what that work involves.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (gap sizes, drains as the hidden route, the usual entry points), and it separates clearing rats from keeping them out. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** any instruction for using poison, bait or traps, or any product recommendation; generic "keep your kitchen clean" lists; disease scare content; advice to tackle a nest or a loft yourself; seasonal posts with no reason in the animal's life cycle.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A product, poison or brand named anywhere, or any hint of how the reader could use one.
- Treatment copy with no mention of the way in, so the job reads as something that will need doing again.
- "Exterminate", "eradicate", "pest free guaranteed" or any promise that the pest will never return.
- A protected animal treated as a pest to kill: bats removed, honey bees destroyed, active nests cleared, squirrels released, foxes poisoned.
- Pests that don't occur in England (termites) or species the trade facts don't support.
- Shame or scare: dirty homes, plague imagery, disease statistics.
- Area claims: "a rat problem in [town]", or pests tied to particular streets or residents.
- Emergency language (around the clock, same day, within the hour) where call outs aren't confirmed.
- Domestic and commercial blurred: contracts pushed on householders, or a commercial page with nothing about records and inspections.

---

## Notes for Brandon

- **Mapping.** Wasp nests and rats carry the emergency marker only where call outs are confirmed (otherwise plain type A, problem led); everything else is type A; commercial is type A, schedule led. Check whether code can apply the marker to those services only rather than the whole site.
- **Bee removal and relocation.** Kept as type A with a "which bee is it" angle. Many pest firms refer honey bees to a beekeeper rather than relocating colonies themselves, so check per client whether the page should exist and how it is worded.
- **Fox and wildlife control** is framed as deterrence and proofing only; bats are protected and never treated.
