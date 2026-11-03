# Removals Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for a move, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

People hire a removals firm once every few years, under stress, with no way to judge one firm against another before the day. The copy replaces that uncertainty with a clear picture of how the day goes.

- **The homeowner in a chain** moves on a completion day they don't control. Keys are released when the money has moved, which can be late, and everything hangs off that moment. Their fears are a van that doesn't turn up, running out of time before the keys arrive, damage, and furniture that won't fit through the new door. Copy for them talks about the order of the day and what happens when timing slips.
- **The renter or small mover** has a flat or a single item, often to a tenancy date. Copy for them is direct and doesn't treat them as an afterthought.
- **The business mover** needs the least time closed. Copy for them talks about planning, labelling, out of hours moves and IT kit.
- **The careful handling customer** has a piano, antiques or a house to clear after a death or sale. Copy for them is specific about handling and, for clearances, quietly respectful.

The voice is a removals crew lead who has done hundreds of moves, explaining plainly what the day involves. Never a logistics brand selling "seamless relocations".

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Removals Company: Local house removals, Long distance removals, International removals | D move | The stages of moving day: arrival and loading, the wait for keys, travel, unloading and placing, what is put back together |
| Removals Company: Office and commercial removals | D move | The stages of a business move: out of hours timing, crate and label system, IT and furniture, the space working by opening time |
| Removals Company: Packing services, Furniture dismantling and reassembly | D move | The pack and preparation stage: what is packed when, what is taken apart and how it goes back together |
| Removals Company: Storage | D move | The stage between homes: what goes into store, how it is protected, how it comes back out |
| Removals Company: Single item and small moves | D move | One short day: collection, protection in transit, delivery to the right room |
| Additional: Piano removals, Antique and fine art removals | D move | Handling stages for one object: route check, protection, lifting and transport, placing |
| Additional: House clearance | D move | The stages of a clearance: what is kept, what is sold, donated or recycled, what is left empty |

Steps are survey, pack, move for every row. Block 5 is price factors with no figures.

**Split by the stages of a move.** Type D has no symptoms and no faults. Every block 4 card is one stage of the move, written as what happens and why it matters:

- **Before the day** (survey and pack): the survey that sets volume, van and crew; packing, usually the day before; dismantling; booking a parking suspension.
- **At the old home** (load): protecting floors, doors and banisters; loading in an order that matches the unloading.
- **The gap** (keys, travel and storage): waiting for completion, the drive, overnight holds, items going to store.
- **At the new home** (unload and place): furniture to the right room, beds rebuilt first, boxes by room label.
- **After the day**: reassembly, unpacking if booked, items out of storage.

Choose the stage that matches the service; each card covers one.

Removals is not seasonal in the gardening sense, but demand peaks in summer, at month ends and on Fridays, when most completions are set. Mention timing only with that reason, never "we get busy in summer".

---

## 3. Local detail that works in this trade

Access is the strongest local detail in this trade.

**Strong anchors** (area wide and checkable): parking and loading (permit streets where a council parking bay suspension is usually needed; loading restrictions on main roads; narrow terraced streets where a large van blocks the road); housing stock and access (Victorian terraces with narrow stairs and tight turns, where furniture comes apart; purpose built flats with or without lifts and long carries; converted houses with shared stairs; new build estates with tight cul de sacs and parking courts); rural lanes with weight or width limits where a smaller shuttle van is used; rental turnover where the research confirms it.

**Every anchor must change the work.** A permit zone is only worth mentioning if it then explains the suspension booked in advance. Victorian terraces are only worth mentioning if they then explain narrow stairs and furniture taken apart.

**Do not:** claim streets in an area are dangerous, congested or impossible; claim parking rules or suspension lead times the research doesn't give (say "check with the council" instead); claim what anyone's home contains; describe a neighbourhood's residents as moving away or arriving.

---

## 4. Craft rules for this trade

1. **Tell the day in order.** The customer can't picture the day, and that is most of the fear. Copy that walks through what happens first, next and last, and why, beats any reassurance.
2. **Name the access, not the service.** "A second floor flat with no lift and the van parked across the road", not "flats and apartments". The access decides the crew, the van, the time and the price, and naming it shows the firm has done this before.
3. **Be honest about completion.** Keys are usually released when the money has moved between solicitors, which can be the afternoon. Good copy says the van can usually be loaded in the morning and waits for keys, and that this is normal, not a failing.
4. **Protection is the hidden layer.** Floor runners, door and banister guards, wardrobe cartons, mattress covers. Naming one specific shows care better than "we treat your belongings like our own".
5. **Describe principles, not promises.** No "we never break anything", no fixed crew sizes or arrival times. Say what careful work involves: labelled boxes, heavy items lifted by two, beds loaded last so they come off first.
6. **Insurance and liability are stated as what usually applies.** Removal firms usually carry cover for goods in transit, and that cover usually has limits for items the customer packed themselves and for high value items. Say that it's worth asking, never quote figures or name schemes the client hasn't confirmed.

---

## 5. What good looks like: one example per field type

### Homepage service card (type D, Local house removals): 40 to 55 words

```
home_services_cards:
  - card_name: Local house removals | card_text: A local move still runs on completion day timing, with keys that can arrive mid afternoon. For [local house removals](/services/local-house-removals/), that means loading in the morning, waiting for the keys, then unloading room by room, with beds and the kettle box coming off first so the first night works.
```

Why it works: opens on the real constraint of the day, then tells the day in order. It describes how a well run move goes as a principle, not as this business's promise, and carries no local detail.

### Category page service card (type D, Packing services): 40 to 55 words

```
cat_services_cards:
  - card_name: Packing services | card_text: Most breakages happen in boxes packed the night before, with plates on their sides and nothing filling the gaps. Our [packing services](/services/packing-services/) cover the stage before moving day: crockery wrapped and packed upright, wardrobe cartons for hanging clothes, and every box labelled for the room it's going to.
```

Why it works: a fact the reader hasn't thought about leads to the hidden layer (how things are packed), and it names one stage of the move clearly.

### Block 4 card, stage: loading at the old home (Removals Company): 40 to 60 words

```
cat_block4:
  - card_title: Loading the van | card_body: Loading starts with floors, doors and banisters protected, then heavy furniture goes in first against the front of the van, with boxes built round it so nothing shifts. Beds, the kettle and the first night boxes usually go on last, so they're the first things off at the new home, wherever the day ends.
```

Why it works: one stage, in order, with the reason for each step. It describes good practice as a principle without claiming this business's process.

### Block 4 card, stage: the wait for keys (Removals Company): 40 to 60 words

```
cat_block4:
  - card_title: Waiting for completion | card_body: On most chain moves the van is loaded before the keys are released, because completion happens when the money moves, and that can be afternoon. The crew waits loaded, ready to go as soon as the call comes. When completion slips to another day, the load can usually stay on the van overnight or go into store.
```

Why it works: names the stage customers worry about most, explains why it happens, and covers what happens if it goes wrong, calmly and as what usually applies.

### Block 4 card, stage: unloading and access at the new home (Removals Company): 40 to 60 words

```
cat_block4:
  - card_title: Getting furniture into the new home | card_body: A sofa that came out of one house won't always go into the next, especially up a narrow terrace staircase with a tight turn. Taking off feet and doors, or taking a wardrobe apart, usually solves it. The survey is where the new home's access gets checked, so the right tools come on the day.
```

Why it works: a fear the reader has, tied to a real access problem, with the ordinary fix and the stage where it's planned. The housing detail changes the work.

### Service page content block, paragraph 3 (Storage)

```
Belongings that go into store loosely packed, or into a damp building, are the ones that come out marked or musty months later. Furniture stored for any length of time needs wrapping that keeps dust off without trapping moisture, and boxes stacked so nothing heavy sits on anything fragile. An inventory taken going in is what makes it simple to find one box later.
```

Why it works: one concrete consequence the customer would see, with its cause, written as a reason rather than a scare. It describes good storage as principles, not this business's facilities.

### FAQ answer, rules question (Local house removals): 50 to 70 words

```
cat_faq_items:
  - faq_question: Do I need a parking permit for the removal van? | faq_answer: On permit and controlled parking streets, usually yes. Most councils run parking bay suspensions, which reserve space for the van on the day, and they usually need applying for in advance. On a street with yellow lines, loading is sometimes allowed and sometimes banned at set times, so it's worth checking the signs at both homes before the day.
```

Why it works: the answer comes first in under 15 words, the rule is written as what usually applies with no regulation named, and it covers both addresses. (Any detail comes from the trade facts pack on the day; never from this example.)

### Location page content block, paragraph 1 (town)

```
Moving house in [town] is mostly planned around access and parking. In the terraced streets near the centre, the van usually has to park on the road, and residents' permit bays often mean booking a suspension with the council first. The older terraces were built with narrow stairs and tight turns, so large wardrobes and sofas are often taken apart before they come down.
```

Why it works: two town facts, each tied to what it means for the move. It describes the streets and how the houses were built, not the people in them, and explains no single service.

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, stages of the move can be written as what the customer will see on the day. The blog prompt bans scenarios and imagined customers, so on the blog a stage is written as facts and a decision instead: what happens, why, and what the options are. "Should you pack yourself or pay for packing?" not "Picture the night before your move".

**What each post type is for in this trade:**

- **Question posts**: what time completion usually happens, loading before completion, how far ahead to book, parking suspensions, what removals insurance covers, what movers won't carry (such as gas bottles). Answer with the reason in the move itself.
- **Decision posts**: self pack or packing service, removals firm or man and van, storage or a later move date, clear a house before sale or after. Say which option suits which move, never which is right for everyone.
- **Cost guides**: what moves the price in this trade. Volume (number of rooms and how full they are), access at both ends (stairs, lifts, long carries, parking), distance and whether the move runs over more than a day, packing and dismantling, storage time, and items such as pianos that need extra handling. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one access or timing condition in one named place, and what it means for a move. Permit parking in a town centre, narrow lanes in villages a lorry can't reach, end of month and summer peaks with the reason (completions and tenancy dates).

### Blog answer (question post): 40 to 60 words

```
blog_answer: Completion usually happens around midday or in the afternoon, once the money has passed between solicitors. Keys are normally released by the estate agent as soon as the seller's solicitor confirms the funds have arrived. Because every sale in a chain has to complete in turn, a long chain often means a later key release.
```

Why it works: the first sentence answers on its own and makes a clean meta description. The cause is the conveyancing process, explained plainly, with no promise about timing.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: Can the removal van be loaded before completion? | body: Yes, loading before completion is normal, and on most chain moves it's the only way the day works. You still own your old home until completion, so packing and loading can start in the morning while the money moves between solicitors.\n\nWhat can't happen before completion is unloading at the new home. The keys are usually released only once the seller's solicitor confirms the funds, so the loaded van waits until then. This is why a crew that loads early isn't wasting time: it means the unload can start as soon as the keys arrive.\n\nIf completion slips to the next day, the belongings usually stay on the van overnight or go into store, and it's worth asking how that's charged before booking. Some movers also advise against a Friday completion, as a delay can mean waiting until Monday. Our [storage](/services/storage/) page explains how belongings are kept safe between homes.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact that would come from the trade facts rows (ownership until completion, keys on confirmed funds, overnight holds and storage), and it is honest about what happens when the day goes wrong. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** generic moving checklists any national site could publish; "it depends" without naming the access, volume or distance; conveyancing advice beyond the plain facts of completion; instructions for disconnecting gas cookers or moving pianos, which belong to a qualified person.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any removals firm's site in the country, with no access, parking, timing or protection detail anywhere in the paragraph.
- Logistics brand language ("seamless relocation", "stress free move", "hassle free") instead of what happens on the day.
- Symptoms or problems invented for a move ("signs you need a removals company").
- Promising nothing will break, a fixed arrival time, a set crew size or a guaranteed finish time.
- Ignoring completion: copy that assumes the keys are available at eight in the morning.
- Insurance or liability cover, trade association membership, free surveys, free boxes or storage facilities stated as this client's practice when not confirmed.
- Local detail used as scenery: a town or a street type named with nothing about parking, stairs or van access.
- Claims that parking in an area is impossible, or council rules and lead times the research doesn't give.
- House clearance written without care, or without the honest note that a clearance firm usually needs to be a registered waste carrier and that unwanted items go somewhere accountable.
- International moves described with customs or visa detail the client hasn't confirmed.

---

## Notes for Brandon

- **Type mapping.** Every row is type D, including office moves, storage, single items, pianos and house clearance. House clearance is the weakest fit (there is no new home), so I wrote its block 4 as the stages of a clearance rather than moving day. If code can't brief that, it may be better as a confirm only page on Removals sites.
- **Completion timing.** Examples say completion usually happens around midday or the afternoon and keys follow confirmed funds. That is accurate for England but varies; the trade facts pack should carry the same wording.
- **Waste carrier.** The failure list says a clearance firm usually needs to be a registered waste carrier. That is accurate for England, but only state it in copy if the trade facts pack carries it and the client confirms registration.
