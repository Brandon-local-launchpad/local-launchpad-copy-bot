# HVAC / Air Conditioning Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for air conditioning and ventilation, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three customers read an HVAC contractor's site, and the copy has to know which one it is talking to.

- **The homeowner** wants a bedroom they can sleep in during a hot spell, a cooler home office, or a new build whose ventilation unit actually works. Their fears are noise, an ugly unit on the wall, running costs, and paying for the wrong size. Copy for them is plain about what the system is, where the units go and what keeps it working.
- **The commercial client** is a facilities manager or business owner buying uptime and records: staff who stop complaining about the heat, a server room that doesn't trip, a schedule they can show an insurer. Copy for them is brisk and specific about intervals, records and what a failure costs.
- **The food or refrigeration customer** runs a restaurant, shop or catering kitchen, where a failed cold room means lost stock and a food safety problem. Copy for them is about temperatures held, alarms, door seals and stock at risk.

The voice is an engineer explaining refrigeration and airflow plainly. Never a showroom selling "climate control".

**The refrigerant reality.** Work on the refrigerant circuit (installing, regassing, repairing leaks, decommissioning) usually has to be done by engineers holding a refrigerant handling certificate, and the business carrying it out usually needs company certification too. Copy treats this as a normal part of the trade: it explains why sealed system work isn't DIY and why refrigerant is recovered rather than released, without naming the regulation in examples and without claiming this client's certification unless confirmed.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| HVAC Contractor (Air conditioning servicing) | A project, schedule led | What slips when servicing stops: blocked filters, dirty coils, a blocked condensate drain, leaks found late |
| HVAC Contractor (Air conditioning repairs) | A project, problem led | Symptoms (warm air, water dripping indoors, ice on pipes, noise, smells), their cause and what they lead to |
| HVAC Contractor (Air conditioning installation, Ductwork and ventilation installation) | A project, desire led | The customer's situation: rooms that overheat, a server cupboard, an office full of complaints, a new build or extension |
| HVAC Contractor (Duct cleaning) | A project, schedule led | Grease and dust building in ductwork, and what that means for fire risk, airflow and smells |
| Air Conditioning Contractor (Air conditioning removal and decommissioning) | A project, problem led | Old, failed or leaking units, refits and building strip outs, and why refrigerant has to be recovered |

**Schedule led versus problem led versus desire led, inside type A.** This trade is led by the servicing schedule: most systems fail slowly, through filters, coils and drains nobody looked at, so many repairs trace back to a missed service. 
- **Schedule led** (write what slips and when): Air conditioning servicing, Duct cleaning, MVHR heat recovery ventilation servicing, Commercial HVAC maintenance, Commercial refrigeration maintenance, Server room cooling maintenance, Cold rooms maintenance.
- **Problem led** (write symptom, cause, consequence): Air conditioning repairs, Air conditioning removal and decommissioning, Indoor air quality testing, and repair work on Commercial refrigeration and Cold rooms.
- **Desire led** (write the customer's situation, never invent symptoms): Air conditioning installation, Split system air conditioning, Ductwork and ventilation installation, MVHR heat recovery ventilation installation, Server room cooling and Cold rooms when new.

**Domestic and commercial.** The same service can be written for both, but never in the same sentence. The client's confirmed customers decide which leads.

**Breakdowns.** Commercial refrigeration, cold rooms and server room cooling have an urgent side. Write it only if the client confirms breakdown call outs, and never state response times.

**Seasonal note.** Hot spells bring a rush of installation enquiries and lead times stretch; servicing before summer catches problems that would otherwise show on the first hot day. Where code swaps a card for the time of year, give the reason in the system or the building, never "summer is a busy time".

---

## 3. Local detail that works in this trade

Air conditioning and ventilation answer to the building and its use, so this trade's local detail is about buildings, occupiers and exposure. Use it as the research gives it.

**Strong anchors** (area wide and checkable): building types (flats needing freeholder consent for outdoor units, loft conversions and top floor rooms that overheat, glass fronted offices, new build estates with mechanical ventilation, period terraces where pipe runs are harder); conservation areas and listed buildings, only where research confirms them; the commercial mix (restaurant streets with kitchen extract, business parks with server rooms, food retail with cold rooms); exposure (coastal salt air on outdoor coils, busy roads that load filters, dense streets where unit noise reaches neighbours).

**Every anchor must change the work.** Sea air is only worth mentioning if it then explains coil corrosion. A conservation area is only worth mentioning if it explains why the outdoor unit's position is settled with the council first.

**Do not:** claim buildings in an area are overheating, unhealthy or full of mould; invent local temperature records; describe systems in particular buildings unless research confirms them.

---

## 4. Craft rules for this trade

1. **Name the system.** "A wall mounted split with the outdoor unit on the back wall", "a ducted system above the ceiling", "a heat recovery unit in the loft". Never "climate control" or "indoor comfort systems".
2. **Refrigerant isn't used up.** A system that needs regassing has a leak. Copy that says so, and says the leak has to be found and fixed before topping up, reads as honesty, because regassing alone just buys a few weeks.
3. **Put the cause in the airflow, the coil or the drain.** Warm air usually means a blocked filter, a dirty coil or low refrigerant; water dripping indoors is usually a blocked condensate drain; a musty smell is usually growth in the drain tray or on the coil. Name the reason, and the copy reads as diagnosis rather than a scare.
4. **Sizing and siting decide the result.** An oversized unit cycles on and off and leaves the room clammy; an undersized one runs flat out and never catches up. Where the outdoor unit goes decides noise for the neighbours, airflow and service access. One specific about either is worth more than any reassurance.
5. **Speak the commercial reader's language.** Downtime, records, servicing intervals, stock held at temperature, staff complaints, insurers. Keep comfort words for domestic pages.
6. **Rules as what usually applies.** Refrigerant handling certification, permission for outdoor units in protected areas, freeholder consent in flats, periodic checks on larger commercial systems: state the principle, never the regulation or a standard number.

---

## 5. What good looks like: one example per field type

### Homepage service card (type A, HVAC Contractor): 40 to 55 words

```
home_services_cards:
  - card_name: HVAC Contractor | card_text: Most air conditioning faults start as a filter, coil or drain nobody looked at for a year or two. Our [hvac contractor](/hvac-contractor/) work covers air conditioning servicing, repairs and installation, with the servicing schedule doing the quiet work that keeps systems cooling properly and stops small leaks becoming big ones.
```

Why it works: leads with the schedule, which is the trade's main idea, names three confirmed services plainly, keeps the link inside a sentence, and carries no local detail (cards don't).

### Category page service card (type A, Air conditioning servicing): 40 to 55 words

```
cat_services_cards:
  - card_name: Air conditioning servicing | card_text: A system that cools less each summer usually has a clogged filter, a dirty coil or a slow leak, not a worn out unit. Our [air conditioning servicing](/services/air-conditioning-servicing/) covers cleaning the filters and coils, clearing the condensate drain, and checking pressures and connections so a leak is found before the gas runs low.
```

Why it works: the opening symptom leads straight to the hidden cause, and the work named is standard servicing practice from the trade facts, not a product.

### Block 4 card, schedule led (Air conditioning servicing): 40 to 60 words

```
cat_block4:
  - card_title: Servicing missed before summer | card_body: A filter left since last year cuts the airflow over the indoor coil, so the unit runs longer, cools less and can ice up on the first hot week. A service in spring clears the filters, cleans the coils and checks the drain, which is when problems are cheapest to catch and engineers are easiest to book.
```

Why it works: a time of year, a reason in the system, and the consequence of missing it. It describes the timing principle without claiming this business's availability.

### Block 4 card, problem led (Air conditioning repairs): 40 to 60 words

```
cat_block4:
  - card_title: Water dripping from the indoor unit | card_body: Water running down the wall below an indoor unit usually means the condensate drain is blocked, often with dust and slime from a coil that hasn't been cleaned. The tray fills and overflows. Left alone, it stains walls and ceilings, can damage electrics below, and the standing water is where musty smells start.
```

Why it works: symptom, cause and what it leads to, all physical and specific. It reads as diagnosis, not a sales line.

### Block 4 card, desire led (Air conditioning installation): 40 to 60 words

```
cat_block4:
  - card_title: A bedroom too hot to sleep in | card_body: Loft conversions and top floor rooms often hold the day's heat well into the night, because the roof soaks up the sun and warm air rises to meet it. A split system sized for that room, with the outdoor unit placed where neighbours won't hear it, usually turns it back into a room you can sleep in.
```

Why it works: there is no fault to describe, so the "sign" is a situation the reader recognises, with a physical reason. Sizing and siting are the specifics, and nothing is promised beyond what the system does.

### Service page content block, paragraph 3 (Air conditioning removal and decommissioning)

```
The refrigerant inside an air conditioning unit is a greenhouse gas, so a certified engineer has to pump it out and recover it before the unit is disconnected. Cutting the pipes releases it straight into the air, which is illegal as well as harmful. That's why a unit coming out in a refit or strip out is decommissioned first, then recycled properly.
```

Why it works: one concrete consequence with its cause, the certification stated as a trade reality without naming the regulation, and no claim about this business's process.

### FAQ answer, rules question (Air conditioning installation): 50 to 70 words

```
cat_faq_items:
  - faq_question: Do I need planning permission for air conditioning? | faq_answer: It depends mostly on the outdoor unit and the building. Listed buildings and conservation areas usually need permission, and many councils also treat a unit on a front wall or close to neighbours as needing it. In a flat, the freeholder's consent is usually needed as well. Where the outdoor unit goes is the first decision, so it's worth checking with the council before anything is fitted.
```

Why it works: the answer comes first in under 15 words, the rules are written as what usually applies with no regulation named, and it closes on the practical point where the rule bites.

### Location page content block, paragraph 1 (town)

```
Air conditioning in [town] covers two very different kinds of building. In the town centre, restaurants and takeaways run kitchen extract that loads the ductwork with grease, and offices above the shops need indoor units fitted around tight ceiling voids. Along the seafront, salt air reaches the outdoor units, so coils corrode faster and get checked more often than they would inland.
```

Why it works: two town facts, each tied to what it means for the work. It describes the buildings and exposure, not the state of anyone's system, and explains no single service.

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, desire led services are written as the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog a desire led topic is written as a *decision* instead: what each option suits, and what decides between them. "Split system or portable unit?" not "Picture a cool bedroom in July".

**What each post type is for in this trade:**

- **Question posts**: the problems people search for. Warm air, water dripping from the unit, musty smells, servicing intervals, regassing. Answer with the cause in the airflow, the coil, the drain or the refrigerant circuit, then what fixes it.
- **Decision posts**: split system or portable unit, single split or multi split, repair or replace an older system, whether air conditioning needs planning permission, mechanical ventilation in a new build or an extension. Say which option suits which building, never which one wins.
- **Cost guides**: what moves the price in this trade. The number of indoor units, the pipe run length, where the outdoor unit can go, electrical work for a new circuit, making good, and for commercial work the system size and servicing interval. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one building type, exposure or time of year in one named place, such as salt air on the coast or servicing before summer.

### Blog answer (question post): 40 to 60 words

```
blog_answer: Air conditioning that blows warm air usually has a blocked filter, a dirty coil or low refrigerant. A filter or coil choked with dust stops air passing over the cold surface, so the room barely cools. Low refrigerant always means a leak, because the gas isn't used up, and that needs a certified engineer to find it.
```

Why it works: the first sentence answers on its own and makes a clean meta description. The causes are physical, and it steers sealed system work to a certified engineer without naming any regulation.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: How often does air conditioning need servicing? | body: Most domestic air conditioning needs a service once a year, and commercial systems usually more often. A yearly service cleans the filters and coils, clears the condensate drain, and checks the pressures and connections on the refrigerant circuit, which is when slow leaks are usually found.\n\nSystems that run hard need shorter intervals. Server rooms that cool all year, kitchens where grease reaches the indoor units, and units near busy roads that pull in more dust all clog faster. Larger commercial systems also usually need regular leak checks and records kept, so the schedule is partly a matter of rules, not just good practice.\n\nIn between services, cleaning or swapping the indoor filters is the one job most owners can safely do, following the instructions for the unit. Anything on the refrigerant side or the electrics is a job for a certified engineer. Our [air conditioning servicing](/services/air-conditioning-servicing/) page explains what a visit covers.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (what a service covers, why some systems need shorter intervals, what owners can and can't do), and it draws the safety line clearly. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** generic energy saving tips; DIY regassing or opening the electrics, where the right answer is what to avoid and to call a certified engineer; "it depends" without naming what it depends on; heat pump content that belongs on the Plumbing and Heating pages.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any HVAC site, with no system, building, schedule or exposure detail in the paragraph.
- Brochure language ("climate control", "the perfect indoor environment") instead of the system, where the units go and what keeps it working.
- Regassing sold as a fix without finding the leak.
- Domestic comfort language on commercial pages, or contract and compliance language on domestic ones.
- Symptoms invented for desire led services ("signs you need air conditioning").
- Certifications, accreditations, response times, warranties or maintenance contracts stated as this client's when not confirmed.
- Regulations or standard numbers named in examples instead of the principle.
- Health claims about air quality testing or ventilation ("eliminates allergies", "prevents illness").
- Local detail used as scenery, with nothing about what it does to the system.

---

## Notes for Brandon

- I mapped everything to type A and treated servicing as the lead split, with repairs and decommissioning as problem led and installation as desire led. Commercial refrigeration, cold rooms and server room cooling have a genuine urgent side; if a client sells breakdown call outs for those, the A plus emergency marker may fit their site better than plain type A.
- Refrigerant handling is written as "a refrigerant handling certificate" and "a certified engineer" in examples, with the regulation unnamed. The trade calls it F gas certification, and the niche entry may want that term in "words customers use" for commercial buyers.
- Split air conditioning in heating mode is technically an air to air heat pump. I kept heating mode out of the examples so the pack doesn't overlap with the Plumbing and Heating heat pump pages.
