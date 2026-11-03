# Garage Doors Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (door types, springs and cables, motors and safety features, measuring, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for garage doors, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three different customers read a garage door site, and the copy has to know which one it is talking to.

- **The stuck customer** has a door that won't open, won't close, or went with a bang. The car may be trapped, or the garage stands open with a door into the house exposed. Copy for them is short, calm and specific: what has probably failed, what not to do, what happens next.
- **The replacement customer** has a tired door (rusted along the bottom, rotten at the base, heavy to lift) and is choosing between door types for the first time in decades. Their fear is a door that doesn't fit the opening, eats into the drive, or fails within a few years. Copy for them explains how each door opens and what that means for their garage and drive.
- **The upgrade customer** wants a working door made electric or insulated. Their fear is a motor fitted to a door that was never balanced for one. Copy for them talks about balance and insulation in plain words.

The voice is a fitter explaining plainly how the door actually works. Never a showroom selling "kerb appeal".

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Garage door supplier: replacement doors (all door type pages) | A project | The customer's situation for desire led doors; symptoms in the old door where replacement is the honest answer |
| Garage door supplier: Garage door repairs | A project, or A + emergency marker when the client confirms urgent call outs | Symptom, cause, consequence for planned repairs; the two urgent situations (below) when the marker is on |
| Garage door supplier: Electric garage doors | A project | Situations (lifting a heavy door, no side access, wanting to stay in the car) and the balance question behind every conversion |
| Garage door supplier: Industrial and commercial doors, Roller shutters | A project | Symptoms in daily use and what a stuck door costs a business |

**The emergency marker.** Two situations in this trade genuinely can't wait: a door stuck open (security, and often a way into the house) and a broken spring or snapped cable (the door is unsafe to move and the car may be trapped). Treat these as the emergency marker's "when this can't wait" content, but only when the client confirms urgent call outs. Without that, they appear as problem led cards with no promise of speed. Nothing else is urgent: a noisy door or a slow remote is a planned repair, and writing it as an emergency cheapens the two that are.

**The split inside type A.**

- **Desire led** (write the situation, never invent symptoms): Sectional garage doors, Roller garage doors, Side hinged garage doors, Timber garage doors, Insulated garage doors, Bespoke garage doors, Electric garage doors, Front and entrance doors, Personnel and side doors. Nobody has symptoms of wanting an insulated door; they have a garage that is now a gym, or a bedroom above.
- **Problem led** (write symptom, cause, consequence): Garage door repairs, and replacement where the old door has failed (rust through the panel, rot at the base, a twisted frame). Up and over garage doors often sit here, because most enquiries are replacing one.
- **Urgent versus planned** (repairs only, and only with the marker): urgent is a door stuck open or a broken spring or cable; everything else is planned.

---

## 3. Local detail that works in this trade

Garage doors are tied to the housing they were built with, so most local detail is about era, layout and exposure.

**Strong anchors** (area wide and checkable): housing era and what it was usually built with (rows of single garages on 1960s and 1970s estates, often narrow by today's standards and fitted with up and over doors; integral garages on newer estates, where the door is also a wall of the house); drive length and slope (a short drive onto a pavement favours doors that open straight up); blocks of rented garages behind terraces; coastal or exposed sites where salt works on steel and tracks.

**Every anchor must change the work.** A narrow estate garage is only worth mentioning if it then explains why a door fitted behind the opening gives back width. An integral garage is only worth mentioning if it then explains why insulation and a secure lock matter more.

**Do not:** claim the doors in an area are old, failing or insecure; turn a housing era into a statement about today's doors ("the original doors still fitted"); invent crime or break in figures to sell security.

---

## 4. Craft rules for this trade

1. **The springs do the lifting.** This is the idea that explains most of the trade. A balanced door lifts easily, a motor only moves a balanced door, and a door that feels heavy has lost its balance. Say it, and repairs, conversions and safety warnings all make sense.
2. **Spring tension is never DIY.** A wound spring stores enough force to cause serious injury. Copy never tells the reader to adjust, wind, release or replace a spring or cable, and never shows how. It says what to avoid (using the door, running the motor, pulling the manual release on a raised door with a broken spring) and to call someone trained.
3. **Explain how each door opens.** Up and over swings out, sectional lifts and runs back along the ceiling, roller coils into a box above the opening, side hinged opens like a pair of gates. Most replacement questions are answered by what that movement needs: drive space, headroom, side room.
4. **Name the part, not "a fault".** Spring, cable, drum, roller, track, bottom seal, safety sensor, motor, receiver, lock. "A snapped lifting cable on one side, so the door hangs crooked" reads as a fitter. "Garage door issues" reads as a directory.
5. **Measure before you sell.** The opening's width and height, the headroom above it and the room either side decide which doors are possible. Good copy puts the measuring before the brochure.
6. **Honest repair or replace.** A sound door with tired springs, cables or rollers is worth repairing. Rust through a steel panel, rot in a timber base, or a twisted door that won't run true is not. Saying which is which earns more trust than pushing either.

---

## 5. What good looks like: one example per field type

### Homepage service card (type A, Garage door repairs): 40 to 55 words

```
home_services_cards:
  - card_name: Garage door repairs | card_text: A door that suddenly feels twice as heavy, or stops halfway and won't move, usually has a broken spring or a snapped cable. Our [garage door repairs](/services/garage-door-repairs/) cover springs, cables, rollers, locks and motors, and a good repair starts with why the part failed, because a door out of balance wears through new parts.
```

Why it works: opens on what the customer feels at the handle, names the parts, and describes the principle of good repair rather than claiming a process.

### Category page service card (type A, Sectional garage doors): 40 to 55 words

```
cat_services_cards:
  - card_name: Sectional garage doors | card_text: A sectional door lifts straight up and runs back along the ceiling, so you can park close to it on a short drive and nothing swings out over the pavement. Our [sectional garage doors](/services/sectional-garage-doors/) start with the headroom above the opening, because the tracks and springs need that space.
```

Why it works: a desire led door written as what it does for the drive, with the measuring point that decides whether it fits.

### Block 4 card, problem led (Garage door supplier): 40 to 60 words

```
cat_block4:
  - card_title: A door that drops or feels heavy | card_body: The springs do the lifting, not you or the motor, so a door that drops when let go or needs real effort to raise has usually lost spring tension. Adjusting it is never a job to try yourself: a wound spring holds enough force to cause serious injury, and the fix is a matched replacement.
```

Why it works: symptom, cause and consequence in the order the customer meets them, with the safety line stated plainly and no instructions given.

### Block 4 card, desire led (Garage door supplier): 40 to 60 words

```
cat_block4:
  - card_title: A garage used for everything but the car | card_body: Many older garages were built for smaller cars, and an up and over door narrows the opening and swings out over a short drive. A sectional or roller door fitted behind the opening usually keeps its full width, and an insulated one helps when the garage is also a workshop or a gym.
```

Why it works: there is no fault, so the "sign" is a situation the reader recognises. The era claim is about how garages were built, not the state of the reader's door.

### Block 4 card, urgent (A + emergency marker, when this can't wait): 40 to 60 words

```
cat_block4:
  - card_title: Door stuck open | card_body: A garage door that won't close leaves the car, the tools and often a door into the house open to anyone passing. It usually comes down to a snapped cable, a broken spring or a motor fault. The first priority is getting it shut and locked safely, with the full repair planned once the cause is clear.
```

Why it works: why it can't wait, the likely cause, and what good emergency work does first, written as a principle with no promise of arrival times. It only appears when the client confirms urgent call outs.

### Service page content block, paragraph 3 (Electric garage doors)

```
Running a motor on a door with a broken spring is how a small repair becomes a large one. The motor is built to move a balanced door, not lift its full weight, so it strains, strips its gears or bends the top panel. If the door feels heavy or the motor hums without moving, leave it closed and don't pull the manual release while the door is raised.
```

Why it works: one concrete consequence with its mechanical cause, and safety advice framed as what to avoid rather than how to fix it.

### FAQ answer, rules question (Garage door supplier): 50 to 70 words

```
cat_faq_items:
  - faq_question: Do I need planning permission to replace a garage door? | faq_answer: Usually not, for a straight replacement in the same opening. A listed building usually needs consent for changes to its front, and some estates and conservation areas carry conditions about the front of the house. Bricking up the door or converting the garage is different, as building regulations usually apply. Checking the planning history first avoids choosing a door you can't fit.
```

Why it works: the answer comes first in under 15 words, every rule is written as what usually applies with no regulation named, and it closes on the practical point where the rule bites.

### Location page content block, paragraph 1 (town)

```
Garage doors in [town] follow the age of the housing. The 1960s and 1970s estates were mostly built with rows of single garages and up and over doors, often narrow by today's standards, so replacing one is usually about keeping the full width of the opening. The newer streets on the edge of town were built with integral garages, where the door is also a wall of the house and insulation and security count for more.
```

Why it works: two town facts, each tied to what it means for the door choice. It describes how the housing was built, not the state of anyone's door, and explains no single service.

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, desire led doors are written as the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog a desire led topic is written as a *decision* instead: what each door type suits, and what decides between them. "Sectional or roller?" not "Imagine pulling onto your drive".

**What each post type is for in this trade:**

- **Question posts**: why the door suddenly feels heavy, went with a bang, stops halfway, reverses or hangs crooked. Answer with the part and the cause, then what to avoid until it's fixed. Never a DIY spring or cable fix.
- **Decision posts**: sectional, roller, up and over or side hinged; repair or replace; insulated or not; converting to electric or replacing; steel or timber. Say which option suits which garage, drive and use, never which one wins.
- **Cost guides**: what moves the price. The door type, the size of the opening, insulation, electric operation, finish, work to the frame or opening, and taking the old door away. For repairs: which part, and whether springs are replaced in pairs. Explain why each moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one housing or exposure condition in one named place and what it means for the door: narrow estate garages, integral garages and insulation, salt air and steel finishes.

### Blog answer (question post): 40 to 60 words

```
blog_answer: A garage door that suddenly feels heavy has usually broken a spring. The springs balance the door's weight so it lifts easily; when one fails, you are lifting the whole door yourself. A loud bang from the garage is often the moment it went. Leave the door shut, don't run the motor, and never try to adjust the spring.
```

Why it works: the first sentence answers on its own and makes a clean meta description. The cause is mechanical, and the close says what to avoid without a single DIY step.

### Blog section (decision post): 140 to 200 words

```
blog_sections:
- h2: Is it worth repairing an old up and over door? | body: Repairing an up and over door is usually worth it when the door panel and frame are sound. Springs, cables, rollers and locks are all replaceable parts, and a door that sits square in its frame and runs evenly once those are renewed can give years more use.\n\nReplacement makes more sense when the panel itself has failed. Steel doors tend to rust from the bottom edge upwards, and once the rust is through, it can't be repaired cleanly. Timber doors rot at the base and where water sits on the frame, and a twisted door won't run true however carefully it's adjusted.\n\nThe other reason to replace is the garage itself. An up and over door swings out as it opens and its frame narrows the opening, so a sectional or roller door fitted behind the opening can give back width and suit a shorter drive. Our [garage door repairs](/services/garage-door-repairs/) page explains what a repair looks at first.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (replaceable parts, how panels fail, how door types use the opening), and it is honest about when repair stops being worth it. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** anything that reads as instructions for springs, cables or tensioning; brochure posts listing colours with no reason to choose; "it depends" without naming the opening, the drive or the use; invented burglary statistics.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any garage door site in the country, with no door type, part, measurement or housing detail anywhere in the paragraph.
- Any hint that a spring or cable can be adjusted, released or replaced by the homeowner.
- Treating every fault as an emergency, or promising arrival times and same day fixes the client hasn't confirmed.
- Desire led doors sold with invented symptoms ("signs you need a sectional door").
- Suggesting any door type fits any garage, with no mention of headroom, side room or the drive.
- Selling an electric conversion without the balance point, so the reader expects a motor to fix a heavy door.
- Brand names, or "kerb appeal" language in place of how the door works.

---

## Notes for Brandon

- **Emergency marker:** I mapped the trade as type A, with the emergency marker switched on for Garage door repairs only when the client confirms urgent or same day call outs. The marker's "when this can't wait" content is limited to two situations: a door stuck open and a broken spring or snapped cable. Please check that code can apply the marker to the repairs page alone and not the replacement pages.
- **Banned word in a page name:** the page "Bespoke garage doors" uses a word the CORE banned list forbids in copy. I kept the exact name in the section 2 table only. Copy should describe it as made to measure or made to order; you may want to rename the page slug or add a niche entry note.
- **Front and entrance doors** are a different trade in practice. I placed them as desire led and kept them out of the examples; confirm whether these clients fit them.
- **Commercial doors and roller shutters** read to a site manager (downtime, security). For a purely domestic client, code should drop that row.
