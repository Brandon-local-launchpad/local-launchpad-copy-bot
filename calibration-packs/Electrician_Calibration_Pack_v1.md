# Electrician Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for electrical work, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Four different customers read an electrician's site, and the copy has to know which one it is talking to.

- **The urgent customer** has lost power to half the house, a trip switch that won't stay up, or a socket that smells hot. They are worried about fire and about touching anything. Copy for them is short and calm: what not to do, what is safe to do, and what the visit sorts out.
- **The obligation customer** is a landlord, letting agent, business owner or seller who needs a report or certificate by a date. They are worried about the deadline, the tenant, the insurer or the buyer's solicitor, not the wiring. Copy for them is written around who needs what and when, not around symptoms.
- **The project customer** wants something added: an EV charger, garden lighting, a new kitchen circuit, a full rewire before moving in. Their fear is the cost growing once the floorboards are up. Copy for them talks about what happens behind the walls and how the house is put back.
- **The commercial customer** needs testing, emergency lighting and fire alarms kept in order with records to show for it.

Underneath all four is the same unease: electricity is invisible, and they cannot judge the work after the plaster goes back. The voice is an electrician explaining plainly what is in the walls, what a test shows and what the rules usually ask. Never a salesperson, and never a scare.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Electrician | A + emergency | When to call us out: power lost, a trip that won't reset, burning smells, scorched sockets; on planned pages, who needs which test and when, or the situation behind a new installation |
| Security System Supplier | A project | The situation that leads to CCTV: a drive, a side passage or a business entrance with no view of who comes and goes |

**Urgent versus planned.** The first split is register. Urgent pages and cards (emergency electrician, electrical fault finding and repairs when power is lost or something smells hot) are written as situation, why it can't wait, and what happens when they call. Everything else is planned, and splits three ways:

- **Obligation led** (write who needs it, when, and what happens to the result): EICR and electrical testing, landlord electrical certificates, PAT testing, smoke and heat alarms in lets, fire alarm systems, emergency lighting. This takes the place of schedule led in this trade. Never write these as "signs you need an EICR"; nobody sees a symptom of an overdue report. Write the trigger: a tenancy, a five year date, a sale, a change of use, an insurer's request.
- **Problem led** (write symptom, cause, consequence): electrical fault finding and repairs, sockets and switches when scorched or loose, consumer unit upgrades when an old fuse board or nuisance tripping is the complaint, rewiring when a report has found old cable, extractor fan installation where condensation is the complaint.
- **Desire led** (write the situation, never invent symptoms): EV charger installation, lighting installation, garden and outdoor lighting, smart home installation, home cinema and audio visual, data and network cabling, solar PV and battery storage, cooker and hob installation, electric shower installation, CCTV installation, intruder alarms, access control and door entry, rewiring as part of a renovation, commercial electrical work for a fit out.

Not a seasonal niche in the gardening sense, but two timings are real: outdoor circuits and garden lighting are easiest before planting and paving go in, and a rewire is far less disruptive before decorating and flooring than after.

---

## 3. Local detail that works in this trade

The local detail in this trade is mostly housing and tenure. Use it as the research gives it.

**Strong anchors** (area wide and checkable): housing era and what it was built with (homes wired before the 1970s may still have rubber or lead sheathed cable and rewireable fuses; post war estates were often wired once and extended many times since); the share of private rented homes, shared houses and student lets, which drives report and certificate work; parking (terraces with on street parking only, where an EV charger needs a driveway or a council approved route, against estates with drives); rural properties on overhead supplies, which often have their own earth rod rather than one from the network; conservation areas and listed buildings, where external lighting, cameras and chargers on a front elevation may need more thought; the mix of shops, offices and hospitality, which drives emergency lighting and fire alarm work.

**Every anchor must change the work.** A high share of lets is only worth mentioning if it then explains landlord reports and five year dates. Rural overhead supplies are only worth mentioning if they then explain why the earthing has to be tested and sometimes improved before an EV charger goes in.

**Do not:** claim homes in an area are dangerous, badly wired or overdue a rewire; say homes *have* old cable (say what they were built with, or what homes of that age may still have); invent fire statistics, landlord enforcement or council EV rules the research does not support.

---

## 4. Craft rules for this trade

1. **Lead obligation pages with the trigger.** Who needs the test, when it falls due, and what the result is used for. Symptoms belong on fault pages, not here.
2. **Explain what the test actually checks.** "Whether every circuit disconnects fast enough under a fault", "whether the bathroom is protected by an RCD", not "a full safety check". A named check tells the reader the report is worth what it costs.
3. **Put the cause in the circuit.** A trip that keeps going has a reason: moisture in an outdoor socket, an appliance leaking to earth, a nail through a cable, a loose terminal heating up. Name the reason and the copy reads as diagnosis rather than alarm.
4. **No DIY beyond the safe basics.** Copy can say what is safe for a homeowner (switching off at the consumer unit, unplugging, not touching anything scorched or wet) and never describes opening a socket, a fitting or the consumer unit as a job for the reader. Some work, such as new circuits and a consumer unit change, usually has to be notified to building control, which a registered electrician can do through their scheme.
5. **Keep the registers apart.** Urgent copy is short and safety first. Obligation copy is dates and documents. Project copy is what happens behind the plaster.
6. **Be honest about results.** A report can come back unsatisfactory, and an old fuse board is not automatically dangerous. Say what the codes mean and what has to be fixed, and never treat a test as a route to a sale.

---

## 5. What good looks like: one example per field type

### Homepage service card (obligation led, EICR and electrical testing): 40 to 55 words

```
home_services_cards:
  - card_name: EICR and electrical testing | card_text: Landlords usually need one every five years, sellers are often asked for one, and owners are usually advised to have one about every ten. Our [EICR and electrical testing](/services/eicr-and-electrical-testing/) work checks each circuit, its protection and its earthing, and the report sets out anything that needs putting right.
```

Why it works: opens on who needs it and when, the obligation led angle, then names what the test checks in plain words. The intervals are what usually applies.

### Category page service card (problem led, Consumer unit upgrades): 40 to 55 words

```
cat_services_cards:
  - card_name: Consumer unit upgrades | card_text: An old fuse board with rewireable fuses and no RCD still works, but it gives no protection against the shocks an RCD cuts off in a fraction of a second. Good [consumer unit upgrades](/services/consumer-unit-upgrades/) start with testing every circuit, because a new board can show faults the old fuses never did.
```

Why it works: honest that the old board isn't automatically dangerous, names what is missing, and describes the principle of good work (test first) rather than claiming this business's process.

### Block 4 card, urgent (Emergency electrician): 40 to 60 words

```
cat_block4:
  - card_title: A socket that smells hot or looks scorched | card_body: A hot smell or brown marks round a socket usually mean a loose connection heating up behind the faceplate, and it can't wait because that heat builds while the circuit is in use. Switching that circuit off at the consumer unit and leaving the socket alone is the safe step until it's opened and tested.
```

Why it works: situation, cause, why it can't wait and the safe first action, in the order a worried reader needs them. It promises no arrival time.

### Block 4 card, obligation led (Landlord electrical certificates): 40 to 60 words

```
cat_block4:
  - card_title: A five year report for a let | card_body: Private landlords usually need the electrics in a let inspected and tested at least every five years, with a copy of the report for the tenants. If the report comes back unsatisfactory, the faults it lists usually have to be put right within 28 days, so a test well before the date leaves time.
```

Why it works: written around who needs it and when, with what happens to the result. No symptom, no regulation named, and the practical point (leave time) follows from the rule.

### Block 4 card, desire led (EV charger installation): 40 to 60 words

```
cat_block4:
  - card_title: An electric car and only a three pin plug | card_body: Charging from a household socket works, but it is slow and puts a long, heavy load on a circuit never meant for it. A dedicated charger on its own circuit needs off street parking, a route for the cable from the consumer unit, and an earthing check before anything is fitted.
```

Why it works: there is no fault, so the sign is the situation the reader is in. It names what decides whether the job can be done, which is what the reader needs before booking.

### Service page content block, paragraph 3 (EICR and electrical testing)

```
A report that's never done doesn't make the wiring worse, but it leaves nobody knowing what's behind the plaster. Older cable, a bathroom circuit without RCD protection or a missing earth to the pipes can sit unnoticed for years, and the first sign is a fault, a failed sale or an insurer asking for paperwork that doesn't exist.
```

Why it works: the consequence is honest (the wiring doesn't change, the knowledge gap does), names three things a test finds, and ends on the obligations that make the gap matter.

### FAQ answer, rules question (EICR and electrical testing): 50 to 70 words

```
cat_faq_items:
  - faq_question: How often does a home need an EICR? | faq_answer: Usually every five years for a rented home, and about every ten for owners. Rented homes are the legal requirement; for owners it's advice, but a report is often asked for when a house is sold. A new tenancy, a change of use or major work are also common points to test, and the last report sets the next date.
```

Why it works: the answer comes first in under 15 words, the rule is written as what usually applies with no regulation named, and it is organised around who needs it and when.

### Location page content block, paragraph 1 (town)

```
Electrical work in [town] splits along the age of the housing. The Victorian terraces near the centre were wired long after they were built, often more than once, and many are now let, so landlord reports are a large part of the work. On the newer estates at the edge of town, drives make EV chargers straightforward, while terraces with street parking need a different answer.
```

Why it works: two town facts, each tied to what it means for the work. It describes housing and tenure, not the state of anyone's wiring, and explains no single service.

---

## 6. Blog posts and cost guides

The voice and local detail rules above still apply on the blog, with one difference.

**No situations on the blog.** On the website pages, desire led services are written as the customer's situation and urgent ones as the moment it goes wrong. The blog prompt bans scenarios and imagined customers, so on the blog a desire led topic is written as a *decision* (what each option suits, and what decides between them) and an obligation topic as the rule and its timing. "Does a landlord need an EICR before every tenancy?" not "Picture a new tenant moving in".

**What each post type is for in this trade:**

- **Question posts**: what people search for about their own electrics and obligations. A trip switch that keeps going, lights flickering, what EICR codes mean, whether an old fuse board needs replacing, what a landlord has to provide. Answer with the cause in the circuit or the rule as it usually applies, and say plainly where the reader stops and calls a registered electrician.
- **Decision posts**: rewire or partial rewire; replace the consumer unit or not; tethered or untethered EV charger; wired or wireless alarms and cameras. Say which option suits which home and why.
- **Cost guides**: what moves the price in this trade. The size of the property and number of circuits, access under floors and in lofts, whether the earthing needs improving, the condition the testing reveals, and the making good after cable runs. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one housing or tenure condition in one named place and what it means for the electrics. A town with many lets and the five year cycle, terraced streets and EV charging without a drive, rural overhead supplies and earthing.

### Blog answer (question post): 40 to 60 words

```
blog_answer: An RCD that keeps tripping is usually doing its job by detecting current leaking to earth. The usual causes are a faulty appliance, moisture in an outdoor socket or light, or damaged cable on one circuit. Holding the switch up or swapping the RCD doesn't fix any of these, and the fault needs finding by testing.
```

Why it works: the first sentence answers on its own and reassures honestly (the device is working). The causes are physical, and it names what not to do without giving a DIY method.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: Is it an appliance or the wiring? | body: It's more often an appliance than the wiring, and the pattern of the trips usually shows which. A trip that happens when one thing switches on, such as a kettle, a washing machine heating up or an immersion heater, points at that appliance's element or its lead.\n\nTrips after heavy rain point outside. Garden sockets, outdoor lights and cables to outbuildings are where water gets in most, and a fitting that isn't sealed for outdoor use can let moisture reach the terminals.\n\nTrips with no pattern at all are the ones most likely to be in the wiring itself: a cable damaged by a nail or a screw, a junction box under the floor, or insulation breaking down on older cable. Finding those means testing each circuit's insulation, which needs the right instrument and a registered electrician, not guesswork with the fuse board. Our [electrical fault finding and repairs](/services/electrical-fault-finding-and-repairs/) page explains what that testing involves.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (element faults, water ingress outdoors, insulation faults in fixed wiring), and it marks where the reader stops. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** any step that opens a socket, a fitting or the consumer unit; "it depends" without naming what it depends on; obligation posts that cite a regulation by name or number instead of saying what usually applies; fire statistics used to frighten; EV and solar posts that promise savings or payback.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any electrician's site in the country, with no circuit, test, housing or tenure detail anywhere in the paragraph.
- Testing and certificates written as symptoms ("signs you need an EICR") instead of who needs them and when.
- Any DIY instruction beyond switching off and leaving it alone.
- Fear selling: fire statistics, "your wiring could kill you", an old fuse board described as a death trap.
- A test written as the first step to a rewire, or an unsatisfactory report used to sell work.
- Urgent and planned copy blurred: a burning smell card that talks about smart homes.
- Symptoms invented for desire led services ("signs you need garden lighting").
- Scheme membership, notification, arrival times, certificates on the day or guarantees stated as this client's practice when not confirmed.
- Regulation names, edition numbers or code references in customer copy.

---

## Notes for Brandon

- I added an "obligation led" split in place of schedule led, because testing work is driven by dates and documents, not by what slips. Code's type A brief for block 4 says "signs you need it"; section 2 tells the model to write the trigger instead. Worth checking the CORE prompts don't fight it.
- Security System Supplier is mapped to plain type A (desire led), not emergency, since CCTV is never a call out. Intruder alarms and access control sit with it as desire led.
- PAT testing is framed as obligation led but with no fixed legal interval; the model should say frequency depends on the equipment and how it's used.
