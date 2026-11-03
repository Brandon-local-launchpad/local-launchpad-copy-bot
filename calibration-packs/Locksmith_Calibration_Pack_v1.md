# Locksmith Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for doors and locks, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three different customers read a locksmith's site, and each arrives with a different worry.

- **The locked out customer** is standing outside, often at night, often with a phone on low battery. They want to know someone can come and what it will cost before they arrive. Their fear is twofold: a damaged door, and a price that triples on the doorstep. Copy for them is short and calm, and its trust signal is the principle of entry without damage wherever the lock allows it.
- **The security customer** has just moved in, lost a set of keys, had a break in, or been told by an insurer that their locks don't meet the policy. They want the right lock, not the most expensive one. Copy for them names what insurers usually ask for and what each lock does, plainly.
- **The landlord and business customer** wants locks changed between tenants, master key systems, or safes. They are buying control over who holds keys. Copy for them is about keys and access, not fear.

The voice is a locksmith explaining plainly what a lock does and why it fails. Never a security salesman selling fear, and never anyone explaining how to get past a lock.

**The hard line for this trade.** Copy never explains how a lock is opened, bypassed, picked, snapped or defeated, on any page or in any blog post. It says that a weakness exists and what lock resists it, never how the weakness is exploited.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Locksmith | A + emergency | When to call us out: locked out, keys lost or stolen, a lock that won't turn, a door left insecure after a break in. Service pages for planned work fall back to the situation or the symptom |

Auto locksmith work appears only if the client offers it; when it does, it sits in the urgent group.

**Urgent versus planned, inside A + emergency.** Write each group the right way:

- **Urgent** (situation, why it can't wait, what happens when they call): lockouts and gaining entry, emergency locksmith, burglary repairs and boarding up, a lock jammed shut or broken in the locked position, auto locksmith if offered.
- **Planned, problem led** (symptom, cause, consequence): lock repairs, uPVC door and window lock repairs. A stiff handle, a key that catches, a door that has to be lifted to lock are early symptoms of a mechanism that will eventually fail locked or open.
- **Planned, situation led** (write the situation, never invent a symptom): lock fitting and replacement after moving house or losing keys, British Standard and insurance approved locks when a policy asks for them, window locks, smart locks, master key systems, safes, key cutting.

**Insurer requirements are the planned anchor.** Many home insurance policies set out the locks they expect on final exit doors and accessible windows, and some limit burglary cover where they aren't fitted. Write the requirement as what usually applies, with no standard number: "the lock standard most insurers ask for".

---

## 3. Local detail that works in this trade

A locksmith's local detail is about the doors on the streets and who lives behind them. Use it as the research gives it.

**Strong anchors** (area wide and checkable): housing era, because it predicts the door and the lock (older terraces with timber front doors, a nightlatch and often a mortice lock; estates from the 1980s onwards with uPVC or composite doors on multipoint locks and cylinders); flats and blocks with communal doors and door entry; tenure (high rental areas where landlords change locks between tenancies, student areas with term time changeovers); town centres with shops and offices needing master key systems; rural properties with outbuildings and long distances, where travel time changes the call out.

**Every anchor must change the work.** uPVC estates are only worth mentioning if they then explain multipoint gearbox repairs or cylinder upgrades. A rental area is only worth mentioning if it explains lock changes between tenants.

**Do not:** claim crime or burglary rates for an area unless the research gives them from a named source; describe a neighbourhood as unsafe; name streets or estates as targets; claim the locks in an area are weak or below standard; turn an era into a judgement about today's doors.

---

## 4. Craft rules for this trade

1. **Damage is the fear, so state the principle.** Most lockouts on a door that was only pulled shut can be opened without harming the door or the lock, and drilling is a last resort. Describe that principle of good work; never claim it as this business's guarantee, and never describe how entry is made.
2. **Name what insurers usually ask for.** Final exit doors to the lock standard most insurers ask for, key operated locks on accessible windows, cylinders that resist forced attack on uPVC doors. Written as what usually applies and with "check your policy wording", this is useful and honest.
3. **Put the cause in the mechanism.** A floppy or stiff uPVC handle is usually a worn gearbox or a door that has dropped on its hinges. A key that catches is often wear in the cylinder or the key itself. Naming the cause reads as knowledge and moves the customer to fix it before it fails locked.
4. **Say who might hold keys.** After moving in, losing keys with the address on them, or a tenant leaving, the honest point is that someone else may have a key. Changing a cylinder is usually all that is needed, not a whole lock.
5. **Price honesty is the trust gap.** The trade's known problem is national call centres posing as local firms and quotes that rise on the doorstep. Copy can say that a fair price is usually agreed before the locksmith sets off, as a principle, without claiming fixed prices for this client.
6. **Never teach the weakness.** Say a cylinder type is vulnerable and what resists it. Never say how the attack is done, on the website or the blog.

---

## 5. What good looks like: one example per field type

### Homepage service card (type A + emergency, Locksmith): 40 to 55 words

```
home_services_cards:
  - card_name: Locksmith | card_text: Most lockouts on a door that was only pulled shut can be opened without damaging the lock. Our [locksmith](/locksmith/) work covers gaining entry, lock fitting and replacement, uPVC door repairs and window locks, from the night you're stuck outside to fitting the locks your insurer asks for.
```

Why it works: opens on the customer's main fear and answers it as a principle, not a promise, names confirmed services plainly, and spans urgent and planned in one line.

### Category page service card (urgent, Lockouts and gaining entry): 40 to 55 words

```
cat_services_cards:
  - card_name: Lockouts and gaining entry | card_text: A door pulled shut on a latch is a different job from one locked with a key, and the difference decides whether entry leaves any mark. Good [lockouts and gaining entry](/services/lockouts-and-gaining-entry/) work starts with the least damaging option the lock allows, and drilling comes last.
```

Why it works: it sets the customer's expectation honestly, states the non destructive principle as good practice rather than this business's claim, and explains nothing about how entry is made.

### Block 4 card, urgent (Locksmith, when to call us out): 40 to 60 words

```
cat_block4:
  - card_title: Keys lost with your address on them | card_body: If keys go missing with something that links them to your home, such as a bag with post or a fob on the ring, the door is only as secure as whoever has them. A call that day usually means a new cylinder fitted, so the old keys no longer turn the lock.
```

Why it works: situation, why it can't wait, and what happens when they call. The fix is the proportionate one (a cylinder, not a whole lock), with no arrival time promised.

### Block 4 card, planned problem led (uPVC door and window lock repairs): 40 to 60 words

```
cat_block4:
  - card_title: A uPVC handle that has gone stiff or floppy | card_body: A handle that needs forcing up to lock, or flops down with no resistance, usually means the multipoint gearbox inside the door is wearing, or the door has dropped and the bolts no longer meet their keeps. Left alone, the mechanism can fail in the locked position, with the door shut.
```

Why it works: symptom, cause in the mechanism, and what it leads to. It names the consequence the customer would most want to avoid without exaggerating it.

### Block 4 card, planned situation led (British Standard and insurance approved locks): 40 to 60 words

```
cat_block4:
  - card_title: Your insurer has asked about your locks | card_body: Many home insurance policies set out the locks they expect on final exit doors and windows, and some limit burglary cover where they aren't fitted. The policy wording says what's needed. Fitting the lock standard most insurers ask for usually means changing the lock body or cylinder, not the whole door.
```

Why it works: there is no fault, so the "sign" is the customer's situation. The rule is what usually applies, with no standard number, and the fix is proportionate.

### Service page content block, paragraph 3 (Lock fitting and replacement)

```
Moving into a home means not knowing who else holds a key. Previous owners, tenants, cleaners and builders may all have had one, and none of those keys stop working when the sale completes. That's why changing the cylinders is usually the first job after moving in, and why it rarely needs a new lock, only a new cylinder and keys.
```

Why it works: one consequence the customer hadn't considered, with its cause, written as a reason rather than a scare. It keeps the fix proportionate and says nothing about how locks are defeated.

### FAQ answer, rules question (Locksmith): 50 to 70 words

```
cat_faq_items:
  - faq_question: Do my locks have to meet my insurance requirements? | faq_answer: Usually yes, if your policy says so, and many do. Policies usually name the lock standard most insurers ask for on final exit doors, often with key operated locks on ground floor windows. Some reduce or refuse a burglary claim where those locks weren't fitted and used. Your policy wording is the place to check, before a claim rather than after.
```

Why it works: the answer comes first in 10 words, the rule is what usually applies with no standard number named, and it closes on the moment the rule bites.

### Location page content block, paragraph 1 (town)

```
Locksmith work in [town] follows the doors. In the terraced streets around the centre, many front doors are timber, usually with a nightlatch and often a mortice lock, so lockouts there come down to which one was locked. On the estates built from the 1980s onwards, most doors are uPVC or composite on multipoint locks, where worn gearboxes and cylinder upgrades make up much of the work.
```

Why it works: two town facts, each tied to the work. It describes the doors by era, not their condition, makes no crime claim, and explains no single service.

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with two important differences.

**No situations on the blog.** On the website pages, urgent services open on the customer's situation. The blog prompt bans scenarios and imagined customers, so on the blog an urgent topic is written as a *question*: what to do and what to expect. "What should I do if I'm locked out?" not "Picture yourself on the doorstep at midnight".

**No method on the blog.** Questions such as "how do locksmiths open doors" are answered with what to expect (time, damage, proof of residence, price agreed first), never with technique. A post that would teach entry or bypass is not written.

**What each post type is for in this trade:**

- **Question posts**: what to do when locked out, whether to change locks after moving, what locks an insurer requires, why a uPVC handle is stiff, what to do after a break in. Answer with the reason, then what fixes it.
- **Decision posts**: change the cylinder or the whole lock, repair or replace a uPVC mechanism, smart lock or key lock, a safe bolted down or freestanding. Say which suits which door, never which is "the one to choose".
- **Cost guides**: what moves the price. The time of day, the type of lock and door, whether entry is possible without damage, parts needed (cylinder, lock body, gearbox), and travel. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one housing or tenure condition in one named place and what it means for locks: term time changeovers in a student area, uPVC doors on a large estate, darker evenings and checking that doors are locked, not only shut.

### Blog answer (question post): 40 to 60 words

```
blog_answer: You should change the locks after moving house, because you can't know who else holds a key. Previous owners, tenants and tradespeople may all have had copies. On most modern doors, swapping the cylinder is enough and is quicker than fitting a new lock, and it's a good moment to check the locks meet your insurance policy.
```

Why it works: the first sentence answers on its own and makes a clean meta description, the reason is concrete, and the fix is proportionate.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: What locks does home insurance usually require? | body: Home insurance policies usually name the lock standard most insurers ask for on final exit doors, and key operated locks on accessible windows. A final exit door is the one you leave by and lock from outside, and on a timber door that usually means a mortice deadlock built to that standard.\n\nuPVC and composite doors work differently. Their multipoint locks are operated by a cylinder, and insurers increasingly look for cylinders that resist forced attack, often shown by a rating mark on the cylinder face. The mark matters more than the door's age.\n\nThe requirement is set in each policy, not in law, so the wording is what counts. Some policies reduce or refuse a burglary claim where the required locks weren't fitted, or were fitted but not locked. Checking before renewing is easier than finding out after a claim. Our [lock fitting and replacement](/services/lock-fitting-and-replacement/) page explains what changing to compliant locks usually involves.
```

Why it works: it opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (final exit doors, cylinders on multipoint locks, the policy as the source of the rule), and it names no standard number and no method of attack.

**What fails on the blog in this trade:** anything that explains how a lock is picked, bumped, snapped, bypassed or opened; generic home security lists any national site could give; "it depends" without naming what it depends on; crime statistics with no named source; DIY instructions for removing cylinders, forcing doors or repairing multipoint gearboxes (say what to avoid and to call a qualified locksmith).

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- Any sentence that explains how a lock is opened, bypassed or attacked, on any page.
- A sentence that could sit on any locksmith's site in the country, with no door, lock, mechanism or reason in the paragraph.
- Fear selling: burglary statistics, "is your home at risk?", or a neighbourhood described as unsafe.
- Response times, 24 hour cover, fixed call out prices, no call out fee or guarantees stated as this client's practice when not confirmed.
- "Never damages your door" or any absolute promise about entry; some locks can't be opened without drilling.
- Standard numbers, kitemark names or brand names instead of "the lock standard most insurers ask for".
- Recommending a whole new lock where a cylinder change does the job.
- Trade body membership, police vetting or background checks claimed when the client hasn't confirmed them.
- Auto locksmith work written for a client who doesn't offer it.

---

## Notes for Brandon

- **One GBP category, type A + emergency,** with planned services split into problem led (repairs, uPVC mechanisms) and situation led (moving house, insurer requirements, smart locks, master keys, safes). Check the split matches how code briefs planned service pages on an emergency site.
- **The bypass line is written into section 1, the blog section and the fail list.** It goes further than the CORE no DIY rule: questions about how doors are opened are answered with what to expect, never technique, and posts that would teach entry are not written. Consider adding it to the Locksmith niche entry too.
- **The British Standard page name.** Examples use "the lock standard most insurers ask for" and avoid the page name as link text, linking lock fitting and replacement instead. Decide whether Copybot may use the page name as link text.
- **Locksmiths are not licensed in England.** The pack does not say so in examples; it bans unconfirmed trade body, vetting and background check claims. If you want this said on sites, it belongs in the trade facts pack.
