# Dog Grooming Calibration Pack v1

How good copy reads in this trade. Copybot loads this pack on every page type alongside the CORE prompt, the niche entry and (on service and category pages) the trade facts pack.

What lives where, so nothing is said twice:
- **CORE prompt**: the fields, word counts and every global rule (no dashes, no unconfirmed claims, no placeholders, banned phrases, how to use local research). Not repeated here.
- **Trade facts pack**: what is true of the work (methods, timings, rules, what goes wrong). Not repeated here.
- **Niche entry**: words customers use, words to avoid, fears, step and FAQ briefs. Not repeated here.
- **This pack**: how this trade should sound, how its services sort into the template's blocks, what counts as good local detail for grooming, and what failure looks like in this trade.

The examples use `[CV: key]` tokens and Markdown links exactly as Copybot writes them. Their local detail is illustrative. They show length, angle and depth; never copy them.

---

## 1. The trade and its reader

Three owners read a groomer's site, and the copy has to know which one it is talking to.

- **The regular customer** has a dog whose coat needs professional work every few weeks: a poodle cross, a spaniel, a terrier, a long coated breed. They want the same good result each time and a dog that comes home comfortable. Copy for them is about the coat and its rhythm: what grows, what sheds, what mats, and what slips when appointments stretch.
- **The worried owner** has a dog that is nervous, elderly, newly rescued or a puppy, or a coat that has got away from them. They fear the dog being frightened or handled roughly, and being judged themselves. Copy for them is calm and plain about handling and honest choices.
- **The occasional customer** wants a bath, a nail trim or help with a heavy shed. Copy for them says clearly what each service covers.

The voice is a groomer who knows coats and dogs, explaining it plainly to an owner. Never a pet spa selling pampering, and never a vet.

**The trade's knowledge is coat type.** Double coats (a dense undercoat under longer guard hair), wire coats that are hand stripped, continuously growing coats that need clipping, and short smooth coats each need different work, and most good copy in this trade names the coat before it names the service.

---

## 2. How this trade's services sort into the template

Code chooses the business type and the block briefs. This section tells you what each block should be *about* for each part of this trade, so the copy fits the brief.

| Category (GBP) | Type | Block 4 is about |
|---|---|---|
| Pet Groomer (Full groom, Dog bath and blow dry, Nail clipping, Teeth cleaning) | C pet service | What each coat type needs and what the owner sees when it isn't getting it: matting, shedding, long nails, a coat that smells soon after a bath |
| Pet Groomer: Hand stripping, Deshedding | C pet service | Which coats the service suits, and why clipping or bathing alone doesn't do the same job |
| Pet Groomer: Puppy grooming | C pet service | Getting a puppy used to handling, the dryer, the table and the clippers before it needs a full groom |
| Pet Groomer: Cat grooming | C pet service | Long haired cats that mat, older cats that stop grooming themselves, and when a cat is better seen by a vet |
| Pet Groomer: Mobile dog grooming | C pet service | Dogs and owners a visit at home suits: nervous dogs, older dogs, multi dog households, owners without transport |

**Care or routine led versus behaviour led, inside type C.** Block 4 on the category page is "what we help with", and on a service page "is this right for your dog". In this trade most cards are care led:

- **Care or routine led** (write the coat's needs and what happens when the routine slips): Full groom, Dog bath and blow dry, Nail clipping, Teeth cleaning, Hand stripping, Deshedding, Cat grooming.
- **Behaviour led** (write how the dog copes with grooming, and the handling principle that helps): Puppy grooming, Mobile dog grooming for nervous dogs, and any card about dogs that are anxious, elderly or hate the dryer. Never promise the dog will come to enjoy it.

**Seasonal note.** Double coated dogs blow their undercoat in spring and autumn; summer brings grass seeds in ears and paws; winter brings mud and road grit between the pads. Where code swaps a card for the time of year, give the reason in the coat or the dog, never "a busy time of year".

---

## 3. Local detail that works in this trade

Dogs bring their walks to the grooming table, so where they are walked is this trade's strongest local detail. Use it as the research gives it.

**Strong anchors** (area wide and checkable): walking environments (muddy footpaths and bridleways, beaches, heathland and long grass where seeds collect, gritted pavements in winter); housing and access (flats with no space to wash a dog, streets where a grooming van can park, rural households far from a salon); demographics (young families with crossbreeds that need regular clipping, retired owners with older dogs).

**Every anchor must change the work.** A beach is only worth mentioning if it then explains why salt and sand left in a double coat dry the skin and need a thorough rinse. Long grass is only worth mentioning if it explains why feathered ears and paws get checked for seeds in summer.

**Do not:** claim dogs in an area are neglected or badly kept; name a breed as a local problem; invent local skin conditions, parasites or tick outbreaks; turn a demographic into a judgement about how owners look after their dogs.

---

## 4. Craft rules for this trade

1. **Name the coat, then the job.** "Combing the undercoat out of a double coat", not "a full pamper". "Pulling the dead outer coat from a wire coat by hand", not "a breed standard finish".
2. **Put the cause in the coat or the dog.** Mats form where the coat rubs (behind the ears, under the collar, in the armpits) and tighten when a coat gets wet and isn't dried through. Long nails change how the dog stands. Name the reason, and the copy reads as knowledge rather than upselling.
3. **Welfare over looks, and say it plainly.** A heavily matted coat is often kinder to clip short than to dematt, because combing out tight mats hurts and the skin underneath can be sore. Shaving a double coat is not a fix for shedding or heat. Honest copy names the kinder choice even when the owner hoped for the fluffy finish.
4. **Stay out of the vet's lane.** Teeth cleaning by a groomer is cosmetic brushing that freshens breath and lifts surface staining; it is not dental treatment, which is a vet's job. Vet guidance is against routine anal gland expression by groomers, so copy never promotes it. Lumps, sore skin, ear smells and limping get mentioned to the owner as things for the vet to check.
5. **Handling is the trust barrier.** Describe the principles of good handling (time to settle, breaks, stopping rather than forcing) without claiming them as this business's practice, and never promise a nervous dog will be calm.
6. **Never shame the coat.** A matted coat usually means a busy owner or a dog that hates brushing, not neglect. Saying what happened in the coat, and what the routine is from here, keeps the owner on side.

---

## 5. What good looks like: one example per field type

### Homepage service card (type C, Pet Groomer): 40 to 55 words

```
home_services_cards:
  - card_name: Pet Groomer | card_text: Every coat needs something different, from a poodle cross that never stops growing to a spaniel shedding through spring. Our [pet groomer](/pet-groomer/) work covers full grooms, bath and blow dry, nail clipping and teeth cleaning, with the coat type deciding the tools, the drying and how short it goes.
```

Why it works: opens on coat types the reader recognises, names four confirmed services in plain words, keeps the link inside a sentence, and makes coat type the reason for the method.

### Category page service card (type C, Hand stripping): 40 to 55 words

```
cat_services_cards:
  - card_name: Hand stripping | card_text: A wire coat that has been clipped for a few years often turns soft, fluffy and paler, because clipping cuts the hair but leaves the dead coat in. Our [hand stripping](/services/hand-stripping/) pulls that loose outer coat out by hand, so the harsh new coat can grow through with its colour.
```

Why it works: starts with a change the owner has seen, gives the cause in the coat, and explains the method as what it does rather than a breed show promise.

### Block 4 card, care led (Deshedding): 40 to 60 words

```
cat_block4:
  - card_title: Hair on everything, twice a year | card_body: Double coated dogs drop their undercoat in heavy spells, usually spring and autumn, and brushing the top coat barely touches it. Deshedding works the loose undercoat out with a bath, a high velocity dryer and the right combs. Shaving the coat off instead can damage how it grows back and won't stop the shedding.
```

Why it works: names the coat and the season, explains why home brushing doesn't reach it, and steers the owner away from the shave down without lecturing.

### Block 4 card, care led (Full groom): 40 to 60 words

```
cat_block4:
  - card_title: Mats close to the skin | card_body: Mats usually start where the coat rubs, behind the ears, under the collar and in the armpits, and tighten each time the dog gets wet. Once they sit against the skin, combing them out hurts, so a short clip and a fresh start is often the kinder choice. The coat grows back, and the routine starts from there.
```

Why it works: the cause is physical and specific, the welfare choice is stated honestly, and the closing line moves on without blaming the owner.

### Block 4 card, behaviour led (Mobile dog grooming): 40 to 60 words

```
cat_block4:
  - card_title: Dogs who hate the salon | card_body: Some dogs shake from the car park onwards: the barking of other dogs, the drive, the strange room. Grooming at home takes most of that away, with one dog at a time and no waiting. A nervous dog still needs time and breaks, and good grooming stops and goes slower rather than holding on.
```

Why it works: describes what the dog experiences, explains what changes, and describes the principle of good handling without claiming this business's practice or promising a calm dog.

### Service page content block, paragraph 3 (Nail clipping)

```
Nails left to grow push back against the ground with every step, which tips the toes up and changes how the dog stands and walks. The quick, the living part inside the nail, grows longer with them, so overgrown nails can only be brought back a little at a time. That's why short, regular trims are easier on the dog than an occasional big one.
```

Why it works: one consequence the owner would actually see, with its cause, written as a reason rather than a scare. It does not imply the reader's dog has a problem.

### FAQ answer, rules question (Pet Groomer): 50 to 70 words

```
cat_faq_items:
  - faq_question: Do you empty anal glands during a groom? | faq_answer: Usually not, and vets generally advise against it as routine. Most dogs empty their glands naturally when they go to the toilet, and squeezing glands that don't need it can cause irritation and inflammation. A dog scooting along the floor or licking under its tail may have a gland problem, and that is a reason to see a vet.
```

Why it works: the answer comes first in under 15 words, it follows vet guidance and stays in the groomer's lane, and it closes on the sign the owner can act on.

### Location page content block, paragraph 1 (town)

```
Grooming in [town] sees two kinds of dirty dog. Dogs walked on the beach come in with salt and sand worked deep into the coat, which dries the skin unless it's rinsed out properly. Dogs walked on the farmland footpaths inland arrive caked in clay through winter and carrying grass seeds in their ears and paws through summer, so feet and feathers get checked closely.
```

Why it works: two town facts, each tied to what it means for the groom. It describes the walks, not the state of anyone's dog, and explains no single service.

---

## 6. Blog posts and cost guides

Blog posts are the longest prose on the site and the place this trade's knowledge shows most. The voice and the local detail rules above still apply, with one important difference.

**No situations on the blog.** On the website pages, behaviour led cards describe what the dog experiences at the salon. The blog prompt bans scenarios and imagined customers, so on the blog a coat question is explained by the coat, and a choice is written as a *decision*: what each option suits, and what decides between them. "Clipping or hand stripping?" not "Picture your terrier after its first strip".

**What each post type is for in this trade:**

- **Question posts**: the coat and care problems owners search for. Heavy shedding, shaving in summer, a dog that smells soon after a bath, mats. Answer with the cause in the coat or the dog, then what deals with it. Anything that sounds like skin disease, ear infection or pain points to the vet.
- **Decision posts**: clipping or hand stripping, salon or mobile grooming, a short clip or a longer trim, how often to book for each coat type. Say which option suits which coat and dog, never which one wins.
- **Cost guides**: what moves the price in this trade. Size, coat type and length, matting on the day, hand stripping time against clipping, temperament and breaks, and travel for mobile grooming. Explain why each one moves the price. Figures only from the PRICE rows.
- **Local and seasonal posts**: one walking environment or one point in the coat's year in one named place, such as grass seeds on summer walks or gritted pavements in winter.

### Blog answer (question post): 40 to 60 words

```
blog_answer: Shaving a double coated dog rarely keeps it cooler, and it can harm the coat. The undercoat and guard hairs together insulate the dog against heat as well as cold, and protect the skin from sun. Once shaved, some double coats grow back patchy or uneven, so removing the loose undercoat is the usual approach instead.
```

Why it works: the first sentence answers on its own and makes a clean meta description. The cause is in the coat, and the answer steers to the kinder choice without promising how every coat will respond.

### Blog section (question post): 140 to 200 words

```
blog_sections:
- h2: Why does my dog smell again a few days after a bath? | body: A dog that smells again within days usually hasn't been dried right through to the skin. A dense or double coat holds water close to the skin for hours after it feels dry on top, and damp hair is where the musty smell builds. A high velocity dryer pushes the water out from the roots, which a towel and a warm room can't do.\n\nShampoo left in the coat causes a similar problem. Residue sitting against the skin can itch and hold dirt, so a thorough rinse matters as much as the wash, especially on thick coats and heavy feathering.\n\nIf the smell comes from the ears, the mouth or one patch of skin, a bath won't shift it, and that is a reason to see a vet rather than book another groom. Our [dog bath and blow dry](/services/dog-bath-and-blow-dry/) page explains what a proper wash and dry involves.
```

Why it works: the section opens by answering its H2, each paragraph carries one fact the trade facts rows would supply (drying to the skin, rinsing out residue, when a smell is a health sign), and it points to the vet where the groomer's work stops. The link sits in the closing paragraph as natural text.

**What fails on the blog in this trade:** generic pet care advice; instructions for cutting mats out with scissors or trimming nails at home, where the right answer is what to avoid and to see a groomer or vet; anal glands as routine care; teeth cleaning written as dental treatment; months named with no reason in the coat.

GBP descriptions, services and products don't load this pack: their prompts are built from a facts block in code.

---

## 7. What makes copy fail in this trade

- A sentence that could sit on any groomer's site, with no coat type, walking or seasonal detail in the paragraph.
- Pet spa language ("pamper your pooch", "a luxurious treat") instead of what is done to the coat and why.
- Anal gland expression promoted as part of a groom, or teeth cleaning described as dental care.
- Shaving double coats offered as the answer to shedding or summer heat.
- Dematting a severely matted coat presented as kinder than a clip, or the clip presented as the owner's failure.
- Promises about how a nervous dog will behave or feel, or about how a coat will grow back.
- Handling practices or drop off times stated as this client's practice when not confirmed.
- Health claims: grooming that "prevents skin problems", "stops infections" or "cures itching".
- Local detail used as scenery, with nothing about what it does to the coat.

---

## Notes for Brandon

- All grooming services map to type C, care or routine led for most and behaviour led for puppies, nervous dogs and mobile grooming. The C steps (assessment, plan, sessions) read as coat check, grooming plan and regular appointments; worth checking the niche entry agrees.
- The library page name has a hyphen, which the no hyphen rule forbids, so the pack writes "Deshedding" (the URL slug would keep its hyphen). Check that matches how the page name is rendered on sites.
- Cat grooming sits in this pack. Cat only groomers may need their own block 4 angle, including when a sedated clip at the vet is the right route.
- Anal glands is the FAQ example because owners ask it and it shows the groomer staying in its lane. Clients who list gland expression as a service will need a conversation.
- No licensing is mentioned: grooming alone doesn't usually need a council licence in England. Groomers who also board or offer day care would pick that up from the Pet Care pack.
