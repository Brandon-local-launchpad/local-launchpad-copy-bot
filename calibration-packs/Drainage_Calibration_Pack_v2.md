# Drainage Calibration Pack v2

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for drains, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three different customers read a drainage site, and the gap between them is wider than in almost any other trade.

- **The emergency customer** has water rising in the toilet or sewage in the garden, and is reading on a phone. They want to know two things: can someone come, and is this even theirs to pay for? Copy for them is short, calm and practical. No reassurance essays, no history of clay pipes.
- **The investigating customer** has a recurring blockage, a smell, or a house purchase with an old drain under it. Their fear is being sold a reline or a dig they never needed. Copy for them is about evidence: footage they can watch and a report they can show a seller, an insurer or the water company.
- **The off mains customer** has a septic tank or treatment plant, is often new to the property, and is unsure what the rules ask. Copy for them is plain and factual, because the honest answer is usually a schedule, not a crisis.

The voice is a drainage engineer who has seen what is down there, explaining plainly what the camera shows and what follows from it. Never a salesman selling a dig.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Drainage Service | A + emergency | When to call us out: water backing up, sewage on the surface, every drain in the house slow at once. Service pages for planned work fall back to symptom, cause, consequence |
| Sewage Disposal Service | A + emergency | Urgent signs at a septic tank or pump: alarms, backing up, sewage on the ground. Routine emptying is schedule led |
| Septic Tank Service | A project | The situation that leads to a new tank or treatment plant: a failing system, a discharge that no longer meets the rules, a new build off mains |
| Plumber (Leak detection) | A project | Symptoms of a hidden leak: a meter that turns with every tap off, a damp patch, lush grass in a dry spell |

**Urgent, investigation and planned, inside A + emergency.** Drainage has three registers, and they must never blur.

- **Urgent** (situation, why it can't wait, what happens when they call): emergency drainage, drain unblocking, blocked toilets, blocked sinks and showers, flood water pumping, sewage pumps when the alarm sounds.
- **Investigation** (what is being found out, and what the evidence is then used for): CCTV drain surveys, home buyer drain surveys, drain odour investigations, leak detection. Investigation is its own register because the customer is buying an answer, not a fix. Write what the camera finds and what decision it settles.
- **Planned, problem led** (symptom, cause, consequence): drain repairs, drain relining, pitch fibre drain repairs, drain excavation and replacement, tree root removal from drains, drain descaling, manhole repairs, soakaways.
- **Schedule led** (what slips and when): septic tank emptying, gully cleaning, grease trap and interceptor cleaning, drain maintenance contracts, drain jetting as a planned clean.
- **Desire led** (the situation): septic tank and treatment plant installation on a new build or a conversion.

**The CCTV survey links the registers.** A blockage cleared in an emergency is often the first sign of a defect. Good copy moves the reader from "it's flowing again" to "now find out why", without a sales pitch.

---

## 3. Local detail that works in this trade

Drains date from when the street was built, so era and ground predict the work better than anything else.

**Strong anchors** (area wide and checkable): housing era, because it predicts the pipework (older streets are usually on jointed clay pipes, often on shared runs between houses; some post war estates used pitch fibre; later estates are usually on plastic); ground type (clay that shrinks and swells and works joints loose, sandy ground where soakaways drain well, high water tables where they don't); tree lined roads and mature gardens, because roots find cracked joints; off mains villages and farms where the research shows them; flood history and surface water flooding only from research; the local water company, named only when the research confirms it.

**Every anchor must change the work.** Clay pipe on a Victorian street is only worth mentioning if it then explains a recurring blockage or the case for a survey before buying. A tree lined road is only worth mentioning if it explains root ingress.

**Do not:** claim drains in an area are failing, collapsed or full of roots; state an era as the current state ("the clay pipes here are cracking"); name a water company the research doesn't give; claim local flooding or sewer problems the research doesn't support.

---

## 4. Craft rules for this trade

1. **Evidence is the trust currency.** Footage the customer can watch and a report they can keep do more than any reassurance. Recommend relining, excavation or repair only off what the camera shows, and say so.
2. **Put the cause in the pipe or the ground.** Gurgling is air pulled through a trap by a restriction further down. A blockage that comes back in the same spot is a defect, not bad luck. Lush green grass along one line in a dry spell can mark a leaking drain. Name the reason and the copy reads as knowledge.
3. **Say whose problem it is.** Since 2011, shared sewers and lateral drains outside the property boundary have usually belonged to the water company, so some faults are theirs to fix at no cost to the homeowner. Honest copy says when to call them first. That honesty is the trade's strongest trust signal.
4. **Name the method and what it does.** Jetting scours the full bore of the pipe; rodding punches a hole through the blockage and leaves the rest on the walls. Relining puts a new pipe inside the old one without digging, where the pipe has kept its shape. The method is a decision, not jargon.
5. **Keep urgent and planned apart.** Emergency copy is short and practical. Survey and repair copy is measured and explains. Never put a long explanation where someone has sewage on the floor, and never put panic where someone is choosing between a repair and a reline.
6. **Off mains copy is about rules and schedules.** Septic tanks and treatment plants have rules about where they discharge, and the schedule of emptying is what keeps them working. State what usually applies, plainly, with no regulation named.

---

## 5. What good looks like: one example per field type

### Homepage service card (type A + emergency, Drainage Service): 40 to 55 words

```
home_services_cards:
  - card_name: Drainage Service | card_text: When every sink in the house drains slowly at once, the problem is usually in the main drain, not the pipes indoors. Our [drainage service](/drainage-service/) covers drain unblocking, jetting, CCTV drain surveys and repairs, from the emergency that can't wait to finding out why the same drain keeps blocking.
```

Why it works: opens on a symptom the reader can check, names confirmed services, and moves from urgent to investigation without asserting a response time.

### Category page service card (investigation, CCTV drain surveys): 40 to 55 words

```
cat_services_cards:
  - card_name: CCTV drain surveys | card_text: A drain that keeps blocking in the same place usually has a cracked joint, a root or a dip behind it. Our [CCTV drain surveys](/services/cctv-drain-surveys/) put a camera through the pipe, so you watch what's there, and the footage decides whether it needs a clean, a repair or nothing.
```

Why it works: the symptom leads to the hidden cause, the camera is evidence the customer sees, and "or nothing" shows the survey can save money.

### Block 4 card, urgent (Drainage Service, when to call us out): 40 to 60 words

```
cat_block4:
  - card_title: Water coming back up the toilet | card_body: When flushing a toilet makes water rise in the shower or a downstairs gully, the main drain is blocked further along. Stop using water in the house, because everything sent down now comes back up indoors. A call that says where the water is rising, and whether the manhole is full, helps the engineer bring the right kit.
```

Why it works: situation, why it can't wait, and what happens when they call. It gives one practical instruction and one useful thing to say, and promises no arrival time.

### Block 4 card, planned problem led (Tree root removal from drains): 40 to 60 words

```
cat_block4:
  - card_title: A blockage that keeps coming back | card_body: On older clay drains near trees, a blockage that returns every few months is usually roots growing through a joint. Clearing it brings the flow back, but the roots regrow into the same gap, often thicker. Cutting them out and then sealing the joint, usually with a patch or a liner, is what stops it.
```

Why it works: symptom, cause in the pipe and the ground, and the consequence of clearing without fixing. The fix is described as the principle of good work, not this business's process.

### Block 4 card, schedule led (Septic tank emptying): 40 to 60 words

```
cat_block4:
  - card_title: A tank left too long between empties | card_body: Solids settle in a septic tank and build up over time. Left too long, they start to pass out with the liquid and clog the drainage field, which is slow and costly to put right. Emptying on a regular schedule, set by the size of the tank and the number of people using it, prevents that.
```

Why it works: what slips, why, and when. It states the principle behind the schedule without giving an interval this business hasn't confirmed.

### Service page content block, paragraph 3 (Drain relining)

```
A cracked drain rarely stays the same size. Water escaping at the crack softens the ground around the pipe, the pipe loses its support and sags, and a defect that could have been relined from inside becomes one that has to be dug out. That's why relining is decided off the footage, while the pipe still holds its shape.
```

Why it works: one consequence with its physical cause, written as a reason rather than a scare. It ties relining to evidence, which is the trade's trust rule.

### FAQ answer, rules question (Drainage Service): 50 to 70 words

```
cat_faq_items:
  - faq_question: Is a blocked drain my responsibility or the water company's? | faq_answer: It depends on where the blockage is. The drain serving only your home, within your boundary, is usually yours. Once it joins a neighbour's drain or leaves your property, it's usually the water company's, and they clear it at no cost to you. If the blockage is in a shared manhole or the road, call them first.
```

Why it works: the answer leads in 7 words, then names exactly what it depends on. It sends the customer to the water company where that is right, with no regulation named.

### Location page content block, paragraph 1 (town)

```
Drainage work in [town] depends on when the street was built. In the terraces around the centre, houses usually drain through clay pipes laid in short sections, often on runs shared with the neighbours, and the clay ground moves those joints over time. On the newer estates to the south, the pipework is plastic, so the work there is more often soakaways and surface water.
```

Why it works: two town facts, each tied to the work. It states the era of the pipework, not its condition, and explains no single service.

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, urgent services open on the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog an urgent topic is written as a *question* instead: what the symptom means and what to do. "Why is my toilet bubbling?" not "Picture water rising in your bathroom".

**What each post type is for in this trade:**

- **Question posts**: the symptoms people search for. Gurgling plughole, bad smell outside, toilet bubbling, a drain that keeps blocking, who pays for a blocked drain. Answer with the cause in the pipe, then what fixes it, and say plainly when it's the water company's job.
- **Decision posts**: jetting or rodding, relining or excavation, repair or replace a pitch fibre drain, whether a home buyer drain survey is worth it, septic tank or treatment plant. Say which suits which drain, never which is "the one to choose".
- **Cost guides**: what moves the price. Access to the drain and the manholes, the depth of the pipe, the length of the run, what the camera finds, whether a dig goes under a drive or a garden, and whether a section is shared. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one ground or era condition in one named place and what it means for drains. Clay pipes on older streets, roots after a dry summer, soakaways that struggle on a high water table in winter.

### Blog answer (question post): 40 to 60 words

```
blog_answer: A gurgling plughole usually means something further down the drain is partly blocked. As water squeezes past the restriction, it pulls air through the nearest trap, which makes the noise. Gurgling in several plugholes at once points to the main drain, while one gurgling sink usually means a blockage in its own waste pipe.
```

Why it works: the first sentence answers on its own, the cause is physical, and the second half helps the reader locate the problem.

### Blog section (decision post): 140 to 200 words

```
blog_sections:
- h2: Is jetting better than rodding? | body: Jetting clears a drain more completely, but rodding still has a place. Rods push through a blockage and open a channel, which gets water moving, but the grease, scale or silt on the pipe walls stays where it was. That's why a drain cleared with rods often blocks again in the same spot.\n\nA jetter sends water at high pressure through a nozzle that scours the full bore of the pipe, so it removes the build up as well as the blockage. It also leaves the pipe clean enough for a camera to see the joints properly, which matters if the blockage keeps coming back.\n\nJetting isn't always the right first step. An old or badly cracked pipe can be damaged further by high pressure, and some blockages, such as a wad of wipes near a trap, clear just as well with rods. A camera survey after clearing shows which you're dealing with. Our [drain jetting](/services/drain-jetting/) page explains what a visit involves.
```

Why it works: it opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (what rods leave, how jetting scours, when pressure harms a pipe), and it is fair to both methods.

**What fails on the blog in this trade:** generic drain advice any national site could give; "it depends" without naming what it depends on; DIY instructions for chemical drain cleaners, lifting manhole covers, entering inspection chambers or pumping sewage (say what to avoid and to call a qualified person); responsibility answers that never mention the water company; seasonal posts with no reason in the ground or the pipe.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any drainage site in the country, with no pipe, ground, era or cause in the paragraph.
- Emergency copy padded with reassurance, history or method explanations the customer has no time to read.
- Relining, excavation or repairs recommended without footage, or written as the default answer to a blockage.
- Hiding the water company's responsibility for shared and lateral drains to win a job.
- Era written as current condition ("drains here are collapsing").
- Response times, 24 hour cover, fixed call out prices or no fix no fee stated as this client's practice when not confirmed.
- "Unblocks any drain" or any promise that a blockage won't return without a survey behind it.
- Septic tank copy that states emptying intervals, discharge rules or deadlines as fixed facts without the trade facts behind them.
- Investigation pages written as sales pages, when the survey's value is that it might find nothing wrong.

---

## Changes from v1

- Removed the global rules now in the CORE prompts, the facts now held by the trade facts pack (pipe materials and dates, method specifications, septic tank rules), the old template sections and VA notes.
- Kept v1's trade insight, rewritten into the new structure: era predicts pipework, clay ground and tree roots, the 2011 transfer and calling the water company first, evidence as trust, jetting versus rodding, recurring blockages as defects, gurgling, lush grass over a leak, relining only off footage, and modern estates generating soakaway work.
- Added investigation as its own register between urgent and planned, with CCTV drain surveys as its centre and the survey as the bridge from an emergency clearance to a planned fix.
- Mapped the four GBP categories to types, with septic tank installation as type A (desire led for new builds) and emptying as schedule led.
- Added the blog section, with the rule that urgent topics become questions on the blog, and new examples at the current field lengths.
