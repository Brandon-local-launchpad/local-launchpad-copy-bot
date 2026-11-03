# Scaffolding Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for scaffolding, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Scaffolding is almost never the job itself. It is the access that lets someone else do the job, and two different customers read a scaffolder's site.

- **The homeowner.** They need a roof, chimney, render or windows done, and the roofer or builder has told them to "sort the scaffold". Most have never booked one. Their worries are practical: damage to the garden, drive or render; the neighbours; permission; security; and the cost if it stays up longer than planned. Copy for them explains these plainly, one at a time.
- **The other trade.** Roofers, builders, painters, renderers and loft converters. They are buying a scaffold up on the promised day, at the right heights, with a loading bay where the materials go, signed off before they climb it, and adapted or struck when they ask. Copy for them is short and talks about dates, lifts, loading and handover.

The voice is an experienced scaffolder explaining how the access will work on this building. Never a safety lecture, never a hard sell, and never vague about what goes where.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

This trade has one GBP category, so the table splits it by service group.

| Category (GBP) and service group | Type | Block 4 is about |
|---|---|---|
| Scaffolding Service: Scaffold hire, Domestic scaffolding, Chimney scaffolding, Commercial scaffolding | A project | Access problems on the building (a terrace chimney, no front garden, a conservatory in the way) and how the scaffold is planned around them |
| Scaffolding Service: Debris netting and sheeting, Temporary roofs, Edge protection | A project | What goes wrong when the work is left open: weather getting into a stripped roof, debris falling on a path, an unprotected edge |
| Scaffolding Service: Hoists and loading bays, Stair towers and temporary stairs | A project | What slows a job down: materials carried up ladders, nowhere to land a pallet of tiles |
| Scaffolding Service: Cantilever and truss out scaffolding, Birdcage scaffolding, Suspended access, Pavement and road scaffolding, Heritage and listed building scaffolding | A project | The constraint that rules out a standard scaffold, and what replaces it |
| Scaffolding Service: Scaffold inspections, Scaffold design | A project, schedule led | When a scaffold is checked or designed, and what happens if it isn't |

Emergency scaffolding is type A, problem led, only where call outs are confirmed.

**Access led, protection led and schedule led, inside type A.** A type A block 4 card is framed as "signs you need it", but nobody has symptoms of needing scaffolding. Most of this trade is the customer's situation, not a fault:

- **Access led** (write the situation and how the scaffold answers it): most of the trade, from scaffold hire, domestic, chimney and commercial scaffolding to cantilevers, birdcages, pavement scaffolds, heritage work, suspended access, hoists, stair towers and event scaffolding.
- **Protection led** (write what the weather or a fall would do, why, and what prevents it): temporary roofs, debris netting and sheeting, edge protection, emergency scaffolding after storm or fire damage.
- **Schedule led** (write what slips and when): scaffold inspections, and scaffold design where a project's programme depends on it.

Never invent symptoms for access led services ("signs you need scaffolding"). Write the building and the job instead.

---

## 3. Local detail that works in this trade

Scaffolding stands on the street and the ground and is tied to the building, so the way a town is laid out changes the job more than almost anything else. Use the local research for those things.

**Strong anchors** (area wide and checkable): which council issues pavement licences and whether busy streets need parking suspensions; terraces with front doors straight onto the pavement; narrow rear alleys; three storey Victorian houses against two storey estates and bungalows; terrace chimneys with no ground access to the stack; conservation areas and listed buildings where stonework and ties need care; slopes where the base has to be built up; exposed hilltops and coastal fronts where sheeting catches the wind.

**Every anchor must change the work.** A terrace with front doors on the pavement is only worth mentioning if it then explains the licence, the lighting and the covered walkway. An exposed hilltop is only worth mentioning if it then explains why a sheeted scaffold needs more ties.

**Do not:** claim a council's licence lead times, fees or conditions unless the research gives them; claim streets are dangerous; turn an era into a judgement about today's roofs or chimneys.

---

## 4. Craft rules for this trade

1. **Name the elevation and the job it serves.** "A scaffold to the front and one gable, to roof level, with a loading bay for the tiles", not "domestic scaffolding". "A chimney stack on a terrace roof with no ground access", not "difficult access". The specific build is what tells both readers the scaffolder has understood the job.
2. **Know which reader you are talking to.** Homeowner copy explains what happens to their house, garden and neighbours. Trade copy talks about dates, lift heights, loading bays and handover. A card aimed at both reads to neither.
3. **The paperwork is part of the job.** A pavement licence from the council before anything goes on the highway, a check before first use and at regular intervals while the scaffold is up, a handover before anyone climbs it, and the neighbour's agreement before anything stands on their land. Write these as what usually applies and as normal steps, never as obstacles.
4. **Hire time is where the cost hides.** A scaffold quote usually covers a set hire period, and each week beyond it adds to the bill. The way to keep it down is to plan the scaffold around the other trade's start date and finish date, not to put it up early. Saying this honestly is what earns the homeowner's trust.
5. **Show what protects the property.** Boards under the standards on lawns, patios and block paving; padding where tubes meet render or glass; tie holes made good when the scaffold comes down; ladders blocked off at the end of each day. One specific about protecting the house is worth more than any reassurance.
6. **Safety as the reason, never the slogan.** Guard rails, toe boards, ties and inspections explain why the scaffold is built as it is. No safety lectures, and no instructions for anyone to put up a tower themselves.

---

## 5. What good looks like: one example per field type

### Homepage service card (type A, Domestic scaffolding): 40 to 55 words

```
home_services_cards:
  - card_name: Domestic scaffolding | card_text: Most house scaffolds are booked because a roofer, renderer or painter needs safe access for a few weeks. Good [domestic scaffolding](/services/domestic-scaffolding/) is planned around that trade's dates and the house itself: which elevations, how high, where materials come up, and how the garden, drive and render are protected while it stands.
```

Why it works: opens on why homeowners actually book, names the planning decisions in plain words, and describes good work as a principle rather than a claim about this business's process.

### Category page service card (type A, Debris netting and sheeting): 40 to 55 words

```
cat_services_cards:
  - card_name: Debris netting and sheeting | card_text: Netting on the face of a scaffold catches dust, old mortar and loose tiles before they reach a path, a car or a neighbour's garden. [Debris netting and sheeting](/services/debris-netting-and-sheeting/) also changes how the scaffold behaves in wind, because a sheeted face catches it like a sail and usually needs more ties.
```

Why it works: says what the service is for in concrete terms, then adds the trade knowledge a customer wouldn't know. The link text is the service name inside a sentence.

### Block 4 card, access led (Chimney scaffolding): 40 to 60 words

```
cat_block4:
  - card_title: A chimney on a terrace roof | card_body: On a terrace, the stack often sits on the ridge with no garden or drive below it to build from. The usual answer is a scaffold on the roof slope itself, with a working platform all round the stack, reached from a scaffold at the front or back. Which one depends on the pavement, the garden and the roof.
```

Why it works: there is no fault to describe, so the card names the building's access problem and how a scaffold answers it, honestly saying what decides the approach.

### Block 4 card, protection led (Temporary roofs): 40 to 60 words

```
cat_block4:
  - card_title: A roof stripped in changeable weather | card_body: Once the tiles and felt come off, the ceilings below are protected only by whatever is over the rafters. Sheets tied down over a stripped roof can lift in a strong gust. A temporary roof built on the scaffold covers the whole job, so work carries on in rain and the house underneath stays dry.
```

Why it works: the consequence has a physical cause (wind getting under sheets), and the fix is described as what the service does, with no scare and no promise about the weather.

### Block 4 card, schedule led (Scaffold inspections): 40 to 60 words

```
cat_block4:
  - card_title: A scaffold that has been up for weeks | card_body: Ties get moved by other trades, boards get lifted to pass materials through, and a storm can shift a base. That's why a scaffold is usually checked before first use, at regular intervals while it stands, and after bad weather or any alteration. A written record of each check is what a main contractor will ask to see.
```

Why it works: says what slips over time and why, states the inspection rule as what usually applies with no regulation named, and speaks in the commercial reader's terms.

### Service page content block, paragraph 3 (Scaffold hire)

```
A scaffold that goes up before the roofer or builder is ready starts using up its hire period while nothing happens on it. If their start slips by a fortnight, those weeks are paid for with no work done, and the same happens if it waits to come down. Agreeing dates with the other trade before booking is what keeps hire time to the weeks the job needs.
```

Why it works: one concrete consequence the homeowner would actually pay for, with its cause, written as a reason to plan rather than a warning. It describes how hire usually works without asserting this client's terms.

### FAQ answer, rules question (Pavement and road scaffolding): 50 to 70 words

```
cat_faq_items:
  - faq_question: Do I need permission for scaffolding on the pavement? | faq_answer: Yes, scaffolding on a pavement or road usually needs a licence from the council. It is normally applied for by the scaffolding company, and councils usually set conditions such as lighting at night, a clear walkway and proof of insurance. Approval can take time, so the licence often sets the earliest start date. Scaffolding kept entirely within your own front garden doesn't usually need one.
```

Why it works: the answer comes first in eleven words, the rule is written as what usually applies with no regulation named, and it closes on the practical case where it doesn't apply. It leaves out lead times and fees, which vary by council.

### Location page content block, paragraph 1 (town)

```
Scaffolding in [town] is shaped by how close the houses sit to the street. In the Victorian terraces near the centre, front doors open straight onto the pavement, so a scaffold at the front usually needs a council licence, lighting and a covered walkway before it goes up. On the newer estates at the edge of town, front gardens and drives give room to build, but lawns and block paving need boards under every standard.
```

Why it works: two town facts, each tied to the work. It describes streets and housing, not anyone's roof, and explains no single service.

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, access led services are written as the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog an access topic is written as a question or a *decision* instead: what each option suits, and what decides between them. "Scaffold or access tower for a chimney?" not "Picture your roofer arriving on Monday".

**What each post type is for in this trade:**

- **Question posts**: what homeowners search for before booking. How long scaffolding takes to put up, whether the neighbours need to agree, what happens if the roofer is delayed, whether chimney work needs a full scaffold. Answer with how it usually works, then what decides it.
- **Decision posts**: a scaffold, an access tower or a cherry picker; a temporary roof or tarpaulins; a cantilever over a conservatory or building from the ground. Say which option suits which building and job, never which one wins.
- **Cost guides**: what moves the price in this trade. The height and number of lifts, how many elevations and how long, access, a pavement licence and lighting, sheeting, a loading bay, a temporary roof, an alarm, and the weeks of hire. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one condition in one named place. The council licence for one town's terraced streets; sheeted scaffolds on an exposed hilltop in winter.

### Blog answer (question post): 40 to 60 words

```
blog_answer: A scaffold for a typical two storey house usually goes up in a day. Three storey houses, chimneys on terrace roofs, temporary roofs and scaffolds that need a cantilever or a loading bay take longer. A pavement licence or a neighbour's permission can delay the start by more than the build itself, so those are worth settling first.
```

Why it works: the first sentence answers on its own and makes a clean meta description. It names what changes the answer and points to the real cause of delay, which is the paperwork, not the build.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: Do my neighbours have to agree to scaffolding? | body: Your neighbours only have to agree if the scaffold will stand on, or hang over, their land. A scaffold built entirely within your own boundary doesn't need their permission, though telling them before it goes up usually avoids friction about noise, parking and privacy.\n\nOn a terrace or a semi, a scaffold for a chimney, a gable or a party wall often has to go on next door's side. That needs their agreement first, and it is worth putting in writing how long it will stand, where it will go and how their garden will be protected. If a neighbour refuses access for a necessary repair, a court order is possible, but it is slow and usually a last resort.\n\nThe pavement in front of the house is a different matter. That belongs to the highway, so scaffolding there usually needs a licence from the council rather than anyone's agreement. Our [pavement and road scaffolding](/services/pavement-and-road-scaffolding/) page explains how that usually works.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (no permission within your boundary, consent and the court route for a neighbour's land, the council licence for the highway), and it separates the three cases cleanly. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** instructions for putting up a tower or scaffold yourself, or working at height; generic safety statistics; "it depends" without naming the height, elevations or access; licence fees or lead times the research doesn't support.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any scaffolder's site in the country, with no building, elevation, street or job named anywhere in the paragraph.
- Symptoms invented for access led services ("signs you need scaffolding").
- Homeowner and trade readers blurred in the same card, so neither gets the detail they came for.
- Safety slogans ("safety is our top priority") instead of the guard rail, tie or inspection that explains the build.
- Licence fees, lead times or council conditions stated without research for that council.
- Erection times, hire periods, free adaptations or alarms stated as this client's practice when not confirmed.
- Emergency language (around the clock, same day) where emergency scaffolding isn't confirmed.
- Any instruction that would help someone put up a tower or scaffold, or work at height, themselves.

---

## Notes for Brandon

- **Mapping.** Type A across the site, with one GBP category split by service group. I used access led, protection led and schedule led instead of the desire led and problem led split, because almost nothing in this trade is desired for itself and very little is a fault. Check that code's type A block 4 brief ("common problems" and "signs you need it") reads sensibly when the "problem" is the building's access.
- **Emergency scaffolding** is kept as plain type A, problem led, and only where call outs are confirmed. If many scaffolding clients offer storm and fire call outs, it may be worth an emergency marker on that page alone.
- **Pavement licences.** Examples state only the general principle (council licence, conditions such as lighting and a walkway, time to approve). Fees and lead times vary by council and are left to research or the trade facts pack.
