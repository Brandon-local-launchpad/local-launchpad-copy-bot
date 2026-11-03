# Window Cleaning Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for window cleaning, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three different customers read a window cleaner's site.

- **The householder on a round.** They want clean windows without thinking about it, and are buying consistency over years: someone who turns up when expected, cleans frames as well as glass, closes the side gate, and mentions anything wrong. Their fears are small but real: streaks and drips, the cleaner who stops turning up, a stranger at the back of the house, a ladder against the conservatory. Copy for them is calm and talks about rhythm and method.
- **The householder with a single job.** A green conservatory roof, dull solar panels, overflowing gutters. Often already on a round. Copy for them names the job and what it does.
- **The commercial client.** A shop, an office, a managing agent, a school. They are buying a schedule, a frontage that looks right, and safe access for high glass. Copy for them talks about frequency, opening hours and how the high glass is reached.

The voice is a window cleaner who knows water, glass and frames, explaining it plainly. Never a sales pitch.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

This trade has one GBP category, so the table splits it by service group.

| Category (GBP) and service group | Type | Block 4 is about |
|---|---|---|
| Window Cleaning Service: Residential window cleaning | B recurring | Signs it's time for a visit (spotting, film on the glass, green on the frames), and what a regular visit covers |
| Window Cleaning Service: Commercial window cleaning, Sign and canopy cleaning | B recurring | What slips when the schedule lapses, and what a visit covers around trading hours |
| Window Cleaning Service: High level window cleaning | B recurring | How high glass is reached safely, and what builds up on glass nobody can see close up |
| Window Cleaning Service: Bin store cleaning | B recurring | Smell, flies and residue between bin collections, and why a schedule beats a one off clean |
| Shared: Conservatory cleaning, Fascia and soffit cleaning, Cladding cleaning, Solar panel cleaning, Gutter cleaning, Driveway and patio cleaning | B, one off or periodic | Signs it's time (green roof panels, dulled solar panels, overflowing gutters) and what the visit covers; the round customer adds these to their visits |

**Round work versus periodic extras, inside type B.** Everything here is recurring, but at two very different rhythms, and the copy must not blur them:

- **Round work** (write the rhythm and what a regular visit keeps on top of): residential window cleaning, commercial window cleaning, sign and canopy cleaning, bin store cleaning, high level window cleaning on a schedule.
- **Periodic extras** (write the sign the customer sees, its cause, and what the visit covers): conservatory cleaning, fascia and soffit cleaning, cladding cleaning, solar panel cleaning, gutter cleaning, driveway and patio cleaning. These are usually done once or twice a year, often booked by round customers.

Steps follow type B: book, first visit, round. The first visit often takes more work than later ones, because long neglected frames hold dirt that runs on to the glass.

**Seasonal note.** Window cleaning runs all year, so it is not a seasonal niche, though pollen and sap in spring and summer, and leaves in autumn gutters, are worth using where code asks for timing.

---

## 3. Local detail that works in this trade

Windows sit in the weather and next to whatever is around the house, so the setting changes what builds up on the glass and how the cleaner gets to it. Use the local research for those things.

**Strong anchors** (area wide and checkable): hard water areas (tap water leaves limescale spots as it dries, which is why pure water exists in this trade); coast and salt spray; main roads and traffic film; mature trees and their sap, pollen and leaves; housing type (bungalows, three storey townhouses, flats with high level glass); terraces with no side access; parking pressure, since a pure water system usually runs from a van on a hose of limited length; town centre frontages and canopies.

**Every anchor must change the work.** Hard water is only worth mentioning if it then explains why pure water leaves no spots. A main road is only worth mentioning if it then explains the traffic film that plain water rinses off frames but a quick wipe smears. Three storey townhouses are only worth mentioning if they then explain why a pole from the ground is safer and quicker than a long ladder.

**Do not:** claim homes in an area have dirty windows; claim water hardness or parking restrictions the research doesn't confirm; name estates or streets as hard to reach or unsafe.

---

## 4. Craft rules for this trade

1. **Name the method and what it does.** The trade's main craft question is water fed pole versus traditional. A water fed pole uses purified water with nothing dissolved in it, pumped through a brush on a long pole from the ground; it cleans frames and sills as well as glass, and dries without spots because there is nothing left in the water to leave a mark. Traditional cleaning uses a mop and squeegee by hand, which suits interiors, leaded lights, sash windows and glass a pole can't reach at the right angle. Name which method suits which window, never which method is "better".
2. **Put the cause in the water and the glass.** Spots after rain are dirt from the frames and the air; limescale spots come from tap water drying; green on frames is algae in damp and shade; a dull film near a main road is traffic grime. Name the cause and the copy reads as knowledge.
3. **Rhythm is the trade's main idea.** The result comes from regular visits, not one big clean. Frames that are cleaned every visit stay easy; frames left for a year hold dirt that runs on to the glass in the first rain after a clean. Most good round cards in this trade have a "why regularly" reason.
4. **Ground first, height only when it's needed.** Working from the ground with a pole is the safer way to clean upper windows, and ladders are usually kept for jobs where a pole can't do the work. High level commercial glass is reached with powered access platforms or rope access by trained people. Write this as how good work is done, never as a claim about this client's kit.
5. **Show the small trust details.** Closing the side gate, a note if no one was home, mentioning a cracked pane, keeping off the flower beds. Describe these as what good window cleaners do, not this client's promises.
6. **Be honest about what a clean can't fix.** Misting between the panes is a failed seal, not dirt, and no clean removes it. Scratched or etched glass stays scratched. Saying so honestly, and pointing to a glazier, earns more trust than a promise of sparkling glass.

---

## 5. What good looks like: one example per field type

### Homepage service card (type B, Residential window cleaning): 40 to 55 words

```
home_services_cards:
  - card_name: Residential window cleaning | card_text: Windows that look clean for a week and then spot up after the first shower usually have dirt left in the frames. Regular [residential window cleaning](/services/residential-window-cleaning/) with a water fed pole cleans frames, sills and glass together with purified water, so nothing is left behind to dry into marks.
```

Why it works: opens on something every reader has seen, puts the cause in the frames, names the method and why it works, and keeps the link inside a sentence. It describes the method as a principle without asserting this client's kit.

### Category page service card (type B, Conservatory cleaning): 40 to 55 words

```
cat_services_cards:
  - card_name: Conservatory cleaning | card_text: A conservatory roof turns green where it sits in shade or under trees, as algae and moss settle on the panels and in the glazing bars. [Conservatory cleaning](/services/conservatory-cleaning/) clears the roof, gutters and frames from outside with soft brushes and purified water, without anyone standing on the panels.
```

Why it works: the sign and its cause first, then what the visit covers in plain words. The point about not standing on the roof answers a fear the reader hasn't voiced, stated as a principle.

### Block 4 card, signs it's time (Residential window cleaning): 40 to 60 words

```
cat_block4:
  - card_title: Spots that come back after rain | card_body: If the windows spot up every time it rains, the glass usually isn't the problem; the frames, sills and seals are. Dirt sitting there washes down the glass in each shower and dries in streaks. Cleaning the frames on every visit, not only the glass, is what stops the marks returning between cleans.
```

Why it works: a sign the customer sees, the cause behind it, and what a regular visit does about it, with no invented frequency.

### Block 4 card, what a visit covers (Commercial window cleaning): 40 to 60 words

```
cat_block4:
  - card_title: A shopfront customers walk past | card_body: Street level glass on a busy road picks up traffic film, fingerprints and rain splash faster than any glass at home. A regular visit usually covers the frontage, the door glass, frames and signs, timed before opening or after closing so the shop isn't disrupted, with upper windows done on a longer cycle.
```

Why it works: speaks the commercial reader's language (frontage, opening hours), puts the cause in the setting, and says what a visit covers as what usually happens rather than this client's practice.

### Block 4 card, periodic extra (Solar panel cleaning): 40 to 60 words

```
cat_block4:
  - card_title: Panels that look dull from the ground | card_body: Solar panels at a shallow angle, near trees or where birds perch collect grime that rain doesn't shift, and dirt sitting on the cells can reduce what they generate. Panels are usually cleaned from the ground with soft brushes and purified water, with no detergent and no one walking on the roof or the panels.
```

Why it works: the sign and its causes, a careful "can reduce" rather than an invented figure, and the method stated as the usual approach.

### Service page content block, paragraph 3 (Gutter cleaning)

```
Gutters that fill with leaves and moss stop carrying water to the downpipes, so in heavy rain it spills over the front edge and runs down the wall. Over time that soaks the brickwork, stains render and can show up as damp patches inside. Downpipes blocked at the bend do the same quietly, which is why the outlets matter as much as the gutter itself.
```

Why it works: one concrete consequence the customer would see, with its cause, written as a reason rather than a scare, and it doesn't imply the reader's gutters are blocked.

### FAQ answer, method question (Residential window cleaning): 50 to 70 words

```
cat_faq_items:
  - faq_question: Do you clean the windows with just water? | faq_answer: Yes, but it's purified water, not tap water. It has had the minerals taken out, so it dries without leaving spots and can lift dirt without detergent. A soft brush on a pole scrubs the glass and frames, and a final rinse carries the dirt away. After a long gap, a clean or two may be needed before the frames stop dripping dirt.
```

Why it works: the answer comes first in two words and explains the method customers are most suspicious of. It closes on the honest first visit caveat, which earns trust.

### Location page content block, paragraph 1 (town)

```
Window cleaning in [town] changes with the street. In the terraces near the centre, there's no side access, so back windows are reached through a rear alley and the van is often parked a hose length away. The town also sits in a hard water area, which is why tap water dries into white spots on glass and purified water from a pole leaves none.
```

Why it works: two town facts, each tied to the work. It describes access and water, never anyone's windows, and explains no single service.

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, a sign is written as something the customer sees. The blog prompt bans scenarios and imagined customers, so on the blog a topic is written as a question about the method or a *decision* between options. "Water fed pole or traditional cleaning?" not "Picture your windows sparkling".

**What each post type is for in this trade:**

- **Question posts**: what people search for about their own windows. Why windows spot after rain, whether pure water works without soap, why windows drip after the first clean, what misting between panes means. Answer with the cause in the water, glass or frames, then what deals with it.
- **Decision posts**: water fed pole or traditional, inside as well as out, a regular round or occasional cleans, cleaning solar panels or leaving them to the rain. Say which suits which house or window, never which one wins.
- **Cost guides**: what moves the price in this trade. The number and size of windows, the height of the house, access to the back, conservatories, visit frequency, inside cleaning, and for commercial work the height and how it is reached. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one condition in one named place. Hard water in a named town; tree sap on a leafy estate in spring; gutters on tree lined streets in autumn.

### Blog answer (question post): 40 to 60 words

```
blog_answer: Windows that drip after the first clean usually have years of dirt in the frames and seals. Purified water loosens it, and it can keep running down the glass for a while after the window cleaner leaves. Once the frames have been cleaned a couple of times, there's far less left to run, and the drips stop.
```

Why it works: the first sentence answers on its own and makes a clean meta description. The cause is in the frames, and it reassures honestly without promising a result on the first visit.

### Blog section (decision post): 140 to 200 words

```
blog_sections:
- h2: Is a water fed pole better than traditional window cleaning? | body: Neither is better for every window; each suits different glass. A water fed pole uses purified water with the minerals taken out, so it dries without spots and needs no detergent. Because the brush scrubs the frames and sills as well as the glass, it suits most outside windows on a regular round.\n\nThe pole also changes how upper windows are reached. Working from the ground keeps the cleaner off ladders on most two and three storey houses, and it gets over conservatories and extensions that a ladder can't stand on.\n\nTraditional cleaning, with a mop and squeegee by hand, still has its place. It suits inside windows, leaded and stained glass, small panes in older sash windows, and glass sitting so deep in the wall that a brush can't get at it squarely. Many window cleaners use both, choosing by the window rather than the house. Our [residential window cleaning](/services/residential-window-cleaning/) page explains what a regular visit covers.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (how pure water works, ground based reach, where hand cleaning still suits), and it avoids naming a winner. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** DIY tips for upper windows from ladders or conservatory roofs; vinegar and newspaper recipes any national site could give; claims that pure water "repels dirt"; posts suggesting cleaning can fix misting between panes.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any window cleaner's site in the country, with no method, frame, water or access detail anywhere in the paragraph.
- "Sparkling", "crystal clear" or "streak free guaranteed" in place of the reason the glass dries clean.
- Water fed pole copy that never mentions frames, or traditional copy that never says where it suits.
- Promises that windows will stay clean, or that a clean removes misting, scratches or etching.
- Visit frequencies, payment by card or app, inside cleaning, text reminders or "same cleaner every time" stated as this client's practice when not confirmed.
- Ladders presented as the normal way to reach upper windows, or anything suggesting the reader climb up themselves.
- Commercial pages with nothing about trading hours, schedules or how high glass is reached.
- Periodic extras (gutters, solar panels, conservatory roofs) written as if they were weekly round work.

---

## Notes for Brandon

- **Mapping.** Type B across the site, with one GBP category split by service group. Inside B, I split round work from periodic extras, since conservatory, solar panel, gutter, fascia, cladding and patio cleaning run once or twice a year rather than on the round. Check that code's type B block 4 brief handles the periodic extras sensibly.
- **Shared pages.** The six shared pages are defined in the Cleaning, Pressure Washing and Guttering libraries. The examples here are written from the window cleaner's angle (pole and pure water from the ground); check they sit consistently with those packs, especially solar panel and conservatory cleaning.
- **Bin store cleaning** is treated as round work for commercial and block clients. If most window cleaning clients offer it only to householders as a one off, it should move to the periodic extras.
