# Plumbing & Heating Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for plumbing and heating systems, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three different customers read a plumbing and heating site, often on the same day, and the copy has to know which one it is talking to.

- **The urgent customer** has water coming through a ceiling or no heating in January. They are reading on a phone, stressed, and want to know what to do in the next five minutes and whether someone can come. Copy for them is short and calm: the first safe action (the stopcock, the gas emergency line), then what the visit sorts out.
- **The planned customer** is booking a service, a gas safety check for a let, or a repair that has nagged for weeks: a radiator that never gets hot, a boiler that needs topping up. They want the cause explained, not parts swapped until the fault goes away.
- **The project customer** is replacing a boiler, adding a shower or moving to a heat pump. Their fear is a new boiler fitted onto old, dirty pipework, or a quote that grows once the floor is up. Copy for them talks about what is behind the panel and under the boards.

Underneath all three is the same fear: gas and water in their home, handled by someone they can't check. Gas work in a home has to be done by a Gas Safe registered engineer. That is the legal reality of the trade, stated plainly as a fact of the work, never as a boast and never as an invitation to do it yourself.

The voice is an engineer explaining to a homeowner what is happening in their system and why. Never a salesperson, never an alarmist.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Gas Engineer | A + emergency | When to call us out: no heating or hot water, a boiler locked out (a smell of gas is the gas emergency line first); on planned pages, what slips when a service or check is missed |
| Plumber | A + emergency | When to call us out: a burst pipe, water where it shouldn't be, the only toilet blocked; on planned pages, symptom and cause, or the situation behind a new fitting |
| Central Heating Service | A + emergency | Symptoms in the system: cold radiators, noise, rooms that never warm, controls that heat an empty house |

**Urgent versus planned.** The first split is register. Urgent pages and cards (emergency plumber and heating engineer, burst and leaking pipes, blocked drains and sinks, boiler repairs when there is no heat) are written as situation, why it can't wait, and what happens when they call. Everything else is planned, and splits three ways:

- **Schedule led** (write what slips and when): boiler servicing, central heating servicing, gas safety certificates, oil boilers, hot water cylinders (the yearly check on an unvented cylinder). Boiler servicing leads: what a yearly service catches before the first cold week, not fear.
- **Problem led** (write symptom, cause, consequence): boiler repairs, central heating repairs, radiators, power flushing, leak detection and repair, taps and basins, toilet installation and repair, cold water tanks, heating controls and thermostats where the complaint is rooms too hot or too cold.
- **Desire led** (write the situation, never invent symptoms): boiler installation, central heating installation, air source heat pumps, ground source heat pumps, underfloor heating, shower installation and repair (when it is a new shower), bathroom installation, gas appliance installation, outside taps and garden plumbing, water softeners. Nobody has symptoms of wanting a heat pump; the "sign" is the situation, such as an ageing boiler or an extension to heat.

**Seasonal niche.** Where code swaps a block 4 card for the time of year, write the reason in the system: faults show the first time the heating runs after months off, condensate pipes freeze in a hard frost and lock the boiler out, unlagged pipes in lofts split. Never "winter is a busy time".

---

## 3. Local detail that works in this trade

A system is shaped by when the house was built and what comes out of the tap. Use local detail as the research gives it.

**Strong anchors** (area wide and checkable): water hardness, which the water company publishes and which decides how fast scale builds in boilers, cylinders and showers; housing era and what it was built with (a tank in the loft and a cylinder in older houses, microbore pipework from the 1960s and 1970s, combi boilers in newer homes, unvented cylinders on recent estates); lead supply pipes, which homes built before 1970 may still have; whether an area is on mains gas (off grid villages run on oil or heat pumps, which changes every heating page); pressure at the top of a hill; flats and conversions, where flue routes and shared supplies limit what goes where.

**Every anchor must change the work.** Hard water is only worth mentioning if it then explains scale on the heat exchanger or why a softener protects a new boiler. An off grid village is only worth mentioning if it then explains why the page talks about oil tanks or heat pumps instead of gas.

**Do not:** claim boilers in an area are old, unsafe or overdue; say homes in an area *have* lead pipes or sludge (say what they were built with, or what homes of that age may have); invent water company performance or pressure problems the research does not support.

---

## 4. Craft rules for this trade

1. **Name the part and where it is.** "The condensate pipe where it runs outside", "the fill valve in the cistern", not "a boiler issue". A named part tells the reader this is someone who has had the casing off.
2. **Put the cause in the water or the system.** Every symptom has a physical reason: sludge in a radiator, scale on a heat exchanger, a perished washer, an expansion vessel that has lost its charge. Name it and the copy reads as diagnosis.
3. **Gas is never DIY.** Copy can say what a homeowner can safely do (the stopcock, the pressure gauge, the gas emergency line) and never describes anything inside a gas appliance or on gas pipework as a job for the reader.
4. **Keep the registers apart.** Urgent copy is short: the situation, the first safe step, what the visit does. A burst pipe card that drifts into boiler efficiency fails both readers.
5. **Be honest about who to call.** A smell of gas is the gas emergency line first. No water on the whole street is the water company. Saying so earns the call for everything else.
6. **A repair is not a replacement.** Most boiler faults are one part. Copy that treats every fault as a reason for a new boiler reads as a sales funnel. Say honestly what tips the balance (parts no longer made, a heat exchanger gone, repeated faults in one winter).

---

## 5. What good looks like: one example per field type

### Homepage service card (schedule led, Boiler servicing): 40 to 55 words

```
home_services_cards:
  - card_name: Boiler servicing | card_text: A boiler that fires up fine in September can still be running on a blocked condensate trap or a worn seal. A yearly [boiler servicing](/services/boiler-servicing/) visit checks the burner, the flue and the safety devices, and most manufacturers need one each year to keep the warranty valid.
```

Why it works: the schedule led angle is what a service catches before it becomes a fault, written without a scare. It names real parts, and the warranty point is a fact the reader can act on.

### Category page service card (problem led, Leak detection and repair): 40 to 55 words

```
cat_services_cards:
  - card_name: Leak detection and repair | card_text: A stain on the ceiling is rarely directly below the leak, because water runs along pipes and joists before it shows. Good [leak detection and repair](/services/leak-detection-and-repair/) starts with tracing the source, with pressure tests and moisture readings, so one section of floor comes up instead of several.
```

Why it works: corrects the obvious assumption with a physical reason, then describes the principle of good work ("good leak detection starts with") rather than claiming this business's process.

### Block 4 card, urgent (Emergency plumber and heating engineer): 40 to 60 words

```
cat_block4:
  - card_title: Water coming through a ceiling | card_body: Water through a ceiling or a light fitting can't wait, because it spreads along the boards and can reach the wiring. Turning the water off at the stopcock and keeping away from the light switch is the first step. After that, the job is to find the pipe, stop it and make the area safe to dry.
```

Why it works: situation, why it can't wait, and the first safe action, in the order a stressed reader needs them. It describes what the visit does without promising an arrival time.

### Block 4 card, schedule led (Gas safety certificates): 40 to 60 words

```
cat_block4:
  - card_title: A landlord's yearly gas check | card_body: Landlords usually need every gas appliance and flue they provide checked every 12 months, with a copy of the record for tenants. A check done in the two months before the old one runs out usually keeps the same anniversary date, so booking early costs nothing and leaves time to fix anything it finds.
```

Why it works: written around who needs it and when, with the date rule a landlord actually uses. The rule is what usually applies, with no regulation named.

### Block 4 card, problem led (Radiators): 40 to 60 words

```
cat_block4:
  - card_title: Radiators cold at the bottom | card_body: A radiator that's cold at the top usually has air in it. One that's warm at the top and cold along the bottom usually has sludge, the black iron oxide that builds as a system corrodes inside. Left, it slows the water round every radiator and makes the pump and boiler work harder.
```

Why it works: separates two symptoms readers confuse, gives each its cause, and names the consequence in the system rather than in the bill.

### Service page content block, paragraph 3 (Boiler servicing)

```
A boiler that goes years without a service usually keeps working until the first cold week, which is when a part that has been wearing for months finally stops it. The seals around the burner, the condensate trap and the flue joints are what a service looks at, and a fault in the flue gives no warning to anyone without a carbon monoxide alarm.
```

Why it works: one consequence the reader recognises (the breakdown in the first cold week) and one they can't see (the flue), stated as reasons rather than threats. It does not suggest the reader's boiler is unsafe.

### FAQ answer, rules question (Gas safety certificates): 50 to 70 words

```
cat_faq_items:
  - faq_question: Do homeowners need a gas safety certificate? | faq_answer: No, in most cases the yearly certificate is a legal duty for landlords. Homeowners aren't required to have one, but a yearly boiler service covers the same safety checks on the boiler and keeps most manufacturers' warranties valid. Anyone with a gas boiler or fire is usually advised to have a carbon monoxide alarm in the same room.
```

Why it works: the answer comes first in under 15 words, the rule is written as what usually applies, and it turns a "no" into the practical step that matters for an owner occupier.

### Location page content block, paragraph 1 (town)

```
Plumbing and heating in [town] depends a lot on when a house was built. The Victorian terraces near the centre were plumbed with a cold water tank in the loft feeding a hot water cylinder, and many have pipework altered by several owners since. The estates at the edge of town mostly run on combi boilers, and the area's hard water means scale is part of most boiler and shower work.
```

Why it works: two town facts, each tied to what it means for the work. It describes what homes were built with, not their condition today, and explains no single service.

---

## 6. Blog posts and cost guides

The voice and local detail rules above still apply on the blog, with one difference.

**No situations on the blog.** On the website pages, desire led services are written as the customer's situation and urgent ones as the moment it goes wrong. The blog prompt bans scenarios and imagined customers, so on the blog a desire led topic is written as a *decision* (what each option suits, and what decides between them) and an urgent topic as what the symptom means and what to avoid doing. "Combi or system boiler?" not "Imagine a winter morning with no hot water".

**What each post type is for in this trade:**

- **Question posts**: faults people search for. Boiler pressure dropping, radiators cold at the bottom, a boiler locked out in a frost, kettling noises, low water pressure. Answer with the cause in the system, then the fix, and say plainly where the reader stops and calls a Gas Safe registered engineer.
- **Decision posts**: combi, system or heat only boiler; repair or replace; heat pump or boiler; electric or mixer shower. Say which option suits which home and why.
- **Cost guides**: changing the boiler type or moving it, the flue route, the state of the pipework and whether the system needs cleaning, access, and making good after floors come up. Explain why each moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one water or housing condition in one named place and what it means for the system: hard water and scale in a combi, an off grid village weighing oil against a heat pump, frozen condensate pipes in the first hard frost.

### Blog answer (question post): 40 to 60 words

```
blog_answer: A boiler that keeps losing pressure usually has water escaping somewhere in the system. The usual places are a weeping radiator valve, a leak under the floor, or the pressure relief valve letting water out through the pipe on the outside wall. Topping it up treats the symptom, and the loss comes back until the leak is found.
```

Why it works: the first sentence answers on its own and makes a clean meta description. The causes are physical and named by where they are, and it says honestly that topping up is not a fix.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: Is it a leak or a faulty part? | body: It can be either, and the pipe on the outside wall usually shows which. That pipe comes from the pressure relief valve, which opens to let water out when the pressure in the system climbs too high. If its end is wet or dripping, the water is leaving through the valve rather than a leak.\n\nThe usual reason the valve keeps opening is the expansion vessel inside the boiler. It holds a cushion of air that absorbs the extra volume as the water heats, and that air charge drops over the years. Without it, pressure rises every time the heating runs and falls again as it cools.\n\nIf the pipe is dry, the loss is somewhere in the pipework or the radiators, and marks under radiator valves or a damp patch on a ceiling are the places to look first. Anything inside the boiler casing is work for a Gas Safe registered engineer, not a DIY job. Our [boiler repairs](/services/boiler-repairs/) page explains what a visit for lost pressure checks.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (what the relief valve does, how an expansion vessel loses its charge, where pipework leaks show), and it marks clearly where the reader stops. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** generic energy saving tips any national site could give; any step inside a boiler casing, on gas pipework or on an unvented cylinder written as something to try; "it depends" without naming what it depends on; heat pump posts that promise lower bills; seasonal posts that name a month with no reason in the system.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any plumber's site in the country, with no part, cause, water or housing detail anywhere in the paragraph.
- Gas work described as anything a homeowner could attempt, or Gas Safe registration used as a boast instead of stated as the legal rule.
- A smell of gas answered with "call us" instead of the gas emergency line first.
- Urgent and planned copy blurred: a burst pipe card that talks about efficiency, or a heat pump page written in an emergency tone.
- Fear selling on carbon monoxide, or implying the reader's boiler is dangerous because it is old.
- Every fault treated as a reason for a new boiler.
- Symptoms invented for desire led services ("signs you need underfloor heating").
- Arrival times, 24 hour cover, fixed prices, free quotes or guarantees stated as this client's practice when not confirmed.
- Heat pump or grant claims with figures, savings or eligibility the facts block does not supply.

---

## Notes for Brandon

- All three GBP categories are mapped to A with the emergency marker, so planned pages still receive the "when this can't wait" brief; section 2 steers them to schedule led or desire led cards. If code can set type per category, Central Heating Service could sit as plain A.
- The smell of gas is written as "call the gas emergency line first" throughout, not as a call out for this business. Please confirm that matches how clients want it framed.
- Heat pump pages live here (as the HVAC inputs say), written as desire led decisions with no savings or grant figures.
- The landlord gas check example uses the "check in the last two months keeps the anniversary date" rule. Worth confirming the trade facts pack carries the same rule so the two agree.
