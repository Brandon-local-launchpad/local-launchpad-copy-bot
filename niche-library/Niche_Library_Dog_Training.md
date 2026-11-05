# Niche Library Entry: Dog Trainer

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/dog-training.json`; this file is the same content for people, kept in the same commit. The model never sees the slot names, only the resolved words.

Business type is **C (pet service)** for every GBP category, from the calibration pack section 2 (`calibration-packs/Dog_Training_Calibration_Pack_v2.md`). The split the pack makes inside C (behaviour led, care or routine led, skill led, and the protection market only when the client offers it) is written into the card briefs, not into types. The one Fillout category tab is Dog Trainer (`fillout/services/dog-training.json`), so `category_types` is empty.

This entry covers ordinary dog trainers and their owner customers. Security and protection dog work appears only as conditional lines inside briefs ("where the services list includes protection or security dog work"), never as the default framing of a card, a step or a FAQ. Owner pages never carry protection language; protection pages never borrow the owner voice.

Sources: the calibration pack (readers and fears, the sort into blocks, what fails), `trade-facts/dog-training.md` (Tables A to G; every brief points at its rows and no figure or rule is written here that the pack does not state), `niche-library/dog-training.csv` (page targets). The facts pack says the English shock collar ban was never made; copy never states the legal position on shock collars either way.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Dog Training / dog training |
| trade_person / trade_person_plural | dog trainer / dog trainers |
| customer_type | dog owners |
| unit_of_work | sessions |
| emergency_niche | no (the library flags no emergency page) |
| big_ticket | no (the pack names nothing as big ticket) |
| schema_subtype | LocalBusiness (schema.org has no dog trainer or pet service subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) |
|---|---|
| dog, puppy, your dog, owner, walk, walks, lead, the park, other dogs, pulls, comes back, barks, jumps up, left alone, treats, practice, at home | counter conditioning, desensitisation, reinforcement, threshold, protocol, stimulus, pack leader, alpha, dominance, dominant, submissive, correction, corrections, balanced training, e-collar, shock collar, prong collar, choke chain, stubborn, naughty, disobedient, cured, canine, K9, pet parent, fur baby, handler |

Exception: handler is allowed on gundog, scent, assistance, protection and security dog pages, where it is the trade's own word for the person.

The owner's words come first (pack section 4): "pulls on the lead", "goes mad at other dogs", "won't come back at the park", "cries when I leave". The trainer term follows only to explain the approach. Reward based methods only: training is teaching the dog what to do and making it worth doing. No aversive tool or dominance idea is ever presented as positive or as an option.

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Get My [QUOTE_FREE] Quote |
| meta_cta | Tell us about your dog and get your [QUOTE_FREE_LOWER] quote today. |
| process_h2 | Your [QUOTE_FREE] Quote in 3 Simple Steps |
| final_h2 | Get a [QUOTE_FREE] Quote From a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about your dog and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about your dog and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency page) |

## Steps (type C)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About Your Dog**
   Brief: how to get in touch and what is useful to send first (the dog's age and breed, what it does and where it happens, what they have tried, a short video if they have one). No promise of a reply time unless [CV: response_time] is set. Never a hint that the owner caused it.
2. **We Meet Your Dog and Price the Sessions** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the first meeting and what gets looked at (the dog where the behaviour happens, what sets it off, what the owner has tried, whether a vet check should come first). Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never a number of sessions, a timeline or an outcome. Never restates "free" (FAQ 5 owns it).
   Without the practice (`step_2_no_visit`): **We Price Your Sessions**
   Brief: a price is agreed before any training starts. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no call, form, video or visit). Only say the quote is written if quote_method says so. Never a number of sessions or an outcome. Never restates "free" (FAQ 5 owns it).
3. **We Start on a Date That Suits You**
   Brief: the first session goes in the diary on a day that suits the owner. One line that progress comes from short practice between sessions, which the owner does at home. Where sessions happen only from the confirmed practices and the client values. Never mention the price, the quote or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | insurance only. A dog trainer never warrants an outcome (pack section 4: no "guaranteed"), and there is no manufacturer warranty in this trade. A confirmed guarantee still reaches the homepage through faq_3, described as what the business does about a session the owner is unhappy with, never as a behaviour outcome. |
| fears (in order, one per Why choose us point) | 1. being judged for the dog's behaviour, or told there is something wrong with the dog that cannot be changed; 2. a trainer whose methods frighten or hurt the dog; 3. paying for sessions that stop working once the trainer has gone; 4. not knowing how the dog is handled when they are not there |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the facts pack Table D: a course certificate is not membership; show the assessed membership only. Checkatrade is not a dog training credential and is never shown.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Trustpilot.
- **Tier 1, trade bodies and registers:** ABTC (Animal Behaviour and Training Council) register, by the role held (Animal Training Instructor or Clinical Animal Behaviourist); APDT UK (Association of Pet Dog Trainers) full membership; IMDT (Institute of Modern Dog Trainers) full membership; PACT (Professional Association of Canine Trainers); TCBTS (The Canine Behaviour and Training Society); CCAB Certification (clinical behaviourists).
- **Tier 2, schemes and memberships:** Royal Kennel Club Accredited Instructor (the areas shown for that instructor); Royal Kennel Club Approved Training Club; Royal Kennel Club Good Citizen Dog Training scheme; Pet Professional Guild; IAABC (a credential, not membership alone); Guild of Dog Trainers; BIPDT (British Institute of Professional Dog Trainers); ADUK or ADI (assistance dog programmes only); NASDU (security dog clients only).
- **Tier 3, local credibility:** the council animal activity licence and its star rating (boarding, day care and residential stays only), local press features, local awards. Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit. No faq_planning: big_ticket is no, so Q9 never shows.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for (the dog, the owner and other people during a session). Never which policy a trainer must hold: the trade facts Table G says no universal requirement is verified. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your training? | Used only when a guarantee is confirmed in the client values. Start with yes, then the terms exactly as given, as what the business does about a session the owner is not happy with. Never a behaviour outcome, a timeline or the word cured. | no | Trust |
| faq_3_none | What if the training isn't working for my dog? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the owner does: tell us, and the plan is looked at again. Then that progress happens between sessions and depends on the practice at home, and that a behaviour which changed suddenly, or an older dog that is not shifting, means a vet check first (Table A: behaviour modification). Then the reasonable care and skill standard every service works to, as the standard the work is held to, never as a defence. No promise of an outcome, no promise to come back or put it right for free. Never invent a guarantee. | no | Trust |
| faq_4 | How soon can you start? | From [CV: start_time] only, as given. Nothing about how long the training takes (Table A: duration varies, no standard). | no | Timing |
| faq_5_free | Is the quote free and no obligation? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How do your quotes work? | From [CV: quote_method] only. | no | Price |
| faq_A | How many sessions will my dog need? | No number: Table A gives no standard duration for any training service and Table E says no set number of sessions establishes reliable recall. Give what decides it (the behaviour, how long it has been practised, the dog's age, how often the owner practises between sessions) and that the plan is reviewed as you go. Never a timeline or an outcome. | no | Timing |
| faq_B | Why does my dog listen at home but not on walks? | Use the assigned symptom's meaning and its linked local issue (the walking environment: busy pavements, other dogs passing close by, livestock on the footpaths). Three genuinely different causes in plain words: the behaviour was learned in a quiet room and never rebuilt outside; the outdoors pulls the dog's focus off its owner (traffic, scents, another dog passing); every pull or outburst that works is rehearsed and gets stronger. Then what the local walks add, then how training builds it up in stages. Never blame the owner. | **yes** | Process |
| faq_C (fallback) | Will my dog only work for treats? | Food is the easiest reward to time well; play, a sniff and getting to move on count too. Say what a reward does in plain words (Table E: a behaviour followed by something the dog values happens more often) and that rewards are used less often as the behaviour holds. Never a tool or method the words to avoid list names. | no | Process |
| faq_D (fallback) | When should puppy training start? | From Table E only: the early socialisation window, safe experiences at home before the vaccination course is finished, and classes that usually accept healthy puppies after their first vaccination, subject to the vet's advice. No age in weeks and no promise. Never that the owner should wait for every vaccination before any new experience. | no | Timing |

Sources for faq_A to faq_D: the calibration pack's owner questions (sections 1, 4 and 6) checked against the facts pack. Replace with real customer questions when Brandon or the client supplies them.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`). Reward based methods and equipment only; no aversive tool is offered to tick.
- Rewards: food rewards / toys and play / a marker word or clicker / life rewards (a sniff, a greeting, moving on)
- Equipment: flat collar and lead / harness / long line / treat pouch / settle mat or crate / muzzle training where a dog needs it
- Session formats: one to one at your home / one to one on your usual walk / small group classes at a venue / video or online sessions
- Working with you: a written plan after each session / video of the exercises for home practice / vet referral for behaviour cases / progress reviews between sessions
- Specialist: scent kit and target odours / gundog dummies and whistle / assistance task training / protection work (security dog clients only)

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

puppy training, puppy classes, socialisation, obedience training, recall training, recall, loose lead walking, lead walking, behaviour modification, behaviour consultation, reactive dog training, reactivity, separation anxiety, nervous dog training, anxious dog training, aggression, aggressive dog rehabilitation, assistance dog training, therapy dog training, scent work, scent detection training, gundog training, residential dog training, board and train, dog boarding, home boarding, dog day care, day care, protection dog training, family protection dogs, personal protection dogs, guard dog training, one to one training, group classes, online training, settle training, crate training, toilet training, house training, muzzle training, long line, clicker training, trick training, agility, hoopers, mantrailing, canicross

## Service words (validator and client block)

GBP service names are shown to the model in the words an owner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Every page target in `dog-training.csv` is here, with its intake aliases.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| police dog | (never named) |
| cat boarding | (never named) |
| cat grooming | (never named) |
| cat sitting | (never named) |
| dog grooming | (never named) |
| dog sitting | (never named) |
| dog walking | (never named) |
| other pet | (never named) |
| dog boarding with training | residential dog training |
| residential dog training | residential dog training |
| board and train | residential dog training |
| dog boarding | dog boarding |
| dog day care | dog day care |
| puppy training | puppy training |
| obedience training | obedience training |
| recall | recall training |
| loose lead walking | loose lead walking |
| behaviour modification | behaviour modification |
| reactive dog training | reactive dog training |
| nervous and anxious dog training | nervous and anxious dog training |
| aggressive dog rehabilitation | aggressive dog rehabilitation |
| therapy dog | assistance dog training |
| assistance dog training | assistance dog training |
| scent detection training | scent detection training |
| gundog training | gundog training |
| family protection dogs | family protection dogs |
| personal protection | family protection dogs |
| guard dog | protection dog training |
| protection dog training | protection dog training |
| dog training | dog training |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the owner's words, in the order code picks them (after the client's jobs_wanted). A card never leads with a care service (boarding, day care, residential) or a protection service unless it is in jobs_wanted. JSON slot: core_services.

- Dog Trainer: puppy training, recall training, loose lead walking, obedience training, reactive dog training, behaviour modification

Service words for the whole job rather than one service: dog training, puppy training, obedience training, one to one training, group classes. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: behaviour modification, reactive dog training, nervous and anxious dog training, aggressive dog rehabilitation. When an FAQ question names the job as well as the problem ("Will recall training help my reactive dog?"), it goes to the job's page (recall), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list is in `niche-library/practices.json` (shared by all niches). The briefs here name the practice key a line depends on: `site_visit_before_quote` (sessions at the owner's home or on the usual walk), `price_agreed_before_work`, `maintenance_schedule` (regular sessions following on), `customer_need_not_be_home`. A ticked practice counts as confirmed for the validator and the claims reviewer alike. This niche has no practices of its own yet; ones the first runs ask for (a written plan after each session, video of the exercises, a vet referral before behaviour work, a handover after a stay) go in practices.json, not here.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures. Ask every dog training client for:
- a "from" price for 3 typical formats (a one to one session, a place in a class, a residential stay or a day of day care where offered);
- whether sessions run at the owner's home, on the walk, at a venue, or online;
- whether the price is agreed before the first session, and whether a plan is written after each one;
- which memberships and registers are held, by the exact grade (Table D: a course is not membership);
- whether the business holds a council animal activity licence (boarding, day care, residential stays only), and its star rating;
- whether protection or security dog work is offered at all (it is a second market and never blurs with the owner pages).

## Section 5 alternative titles (why_titles_alt)

1. Track record: **Local Experience With Dogs Like Yours**
2. Cover: **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": dog trainer → dog training. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 (what we help with) and block 5 (cost factors) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps, the FAQ slots and the symptom question. Placeholders: `[CAT]` the page keyword without the town (Dog Trainer), `[CAT_LOWER]`, `[WORK]` the work noun (Dog Training), `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises, never a behaviour outcome.

- `seasonal_trade`: no. The facts pack verified no training season (Table G) and the swap in code is permanent, not by the month; the dog's calendar (fireworks before Bonfire Night and New Year, puppies after Christmas and in spring, gundog work before the shooting season) is blog material (pack section 6, local and seasonal posts).
- `category_types`: empty (the one tab, Dog Trainer, is the default C).
- A niche with no section here has its category pages refused: "no category block briefs for dog-training".

### Type C (pet service: Dog Trainer)

**Block 4, what we help with.** H2: [WORK] Problems We Help With

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Angel indoors, a different dog outside | a cue taught indoors that was never taken outside | Sits and waits beautifully in the kitchen, then drags on the lead, shouts at every dog or ignores every call past the gate. The one cause this card makes: the cue was taught in a quiet room, and once outside the dog's focus is pulled off its owner by every scent, passing car and dog it meets. Say what the fix usually involves, in plain words: building it back up a step at a time, the garden first, then a quiet street, then somewhere busier (Table A rows: practise in a quiet setting, add distractions, transfer to ordinary walks). Where the business runs its sessions only from the confirmed practices. The behaviour led services on the card list (recall, loose lead walking, obedience) follow this card. Never defiance, never that the owner has failed. |
| It's getting worse, not better | every reaction rehearsed, so it grows | Barking and lunging at dogs that started as a stare, chasing that started as interest, pulling that has grown since the dog was small. The one cause this card makes: every reaction that happens is practice, so the behaviour deepens rather than fades. Say what the fix usually involves: starting far enough away that the dog clocks the other dog and will still eat, then shortening that distance slowly (Table A: reactive dog training). Aggression that appears out of nowhere, or an older dog that starts behaving differently, means the vet before the trainer (Table A: behaviour modification). The reactivity, behaviour and aggression pages on the card list follow this card. Never a step by step plan for aggression, never "cured", never a timeline. If the services list carries protection or security dog work (never otherwise): one sentence that a protection trained dog is first a dog under everyday control, and nothing more about that work on this page. |
| The puppy months and the teenage wobble | habits setting while the dog grows up | Mouthing, jumping up, crying when left, a puppy that hides from visitors; then, in adolescence, a recall that seems to vanish. The one cause this card makes: the first months and adolescence are when habits set, good or bad, so what is practised now tends to carry into adult life. Say what training usually involves at this stage: short practice, managed meetings with people, places and dogs, and keeping up the practice through the wobble (Table A: puppy training). When classes usually start, and what can begin at home before the vaccination course is finished, only from Table E, with the vet's advice first; no age or week count the rows do not give. Puppy training follows this card as a care or routine led service. Never that the training has failed when adolescence hits. |
| Home alone, and not coping | being alone never taught in small steps | Crying or barking when the door shuts, chewing, a note from a neighbour, a dog pacing by the door at the first sound of keys. The one cause this card makes: the dog was never taught, in small steps, that being alone is safe. Say what usually helps: building up time alone gradually, worked on at home because that is where it happens (Table A: the row for nervous dogs). A vet's view first where the distress is severe or new (Table A). Where the services list includes day care or boarding: a day broken up with exercise, company and quiet time (Table A: dog day care). Never promise the dog will settle, never name a diagnosis, never that the owner leaves the dog too long. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| One to one or in a group | Individual sessions cost more than a place in a small class: one trainer, one dog, the plan built round that dog (Table F rows). Say it plainly and give no figure. Which formats the business offers only from the services list and [CV: materials_methods]. |
| Where the sessions happen | Travel to your home, a local venue, or practice at several places because the behaviour only shows in some of them (Table F: travel, practice at multiple locations, access to a secure training space). Say why more places and more travel cost more time. |
| How much the behaviour has grown | A dog that reacts to other dogs as well as pulling, a behaviour practised for years, a case that needs a vet's involvement and more than one setting: slower, more careful work (Table F: case complexity, veterinary liaison, multiple settings). Say it without alarm and never as the owner's fault. For a stay or day care page the equivalent is the length of stay and the dog's individual needs. |
| The follow up you want | Reviews between sessions, a plan after each visit, video or remote check ins where they suit, a handover after a stay (Table F: follow up, reviews, owner handover). Say that each adds to the price and name only what the confirmed practices give. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Tell Us About Your Dog**
   Brief: how to get in touch and what is useful to send first (the dog's age and breed, what it does and where it happens, what they have tried, a short video if they have one). No promise of a reply time unless [CV: response_time] is set. Never a hint that the owner caused it.
2. **We Get to Know Your Dog and Agree the Price**
   Brief: what the first meeting looks at (the dog where the behaviour happens, what sets it off, what the owner has tried, whether a vet check comes first) and what it costs. Where it happens only from the confirmed practices (site_visit_before_quote: at the owner's home or on the usual walk); otherwise name no place. The price agreed before any training starts only when the price_agreed_before_work practice is confirmed. Follows [CV: quote_method]; only say the quote is written if quote_method says so. Never a number of sessions or an outcome. Never restates "free".
3. **We Start on a Date That Suits You**
   Brief: the first session goes in the diary on a day that suits the owner, and progress comes from short practice between sessions. Regular sessions following on only when the maintenance_schedule practice is confirmed. Never mention the price or changes to the plan. Never restates the start time.

**FAQ slots.** Five before the symptom question: cost, one cover question (insurance, else the fallback), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The cost cards hold the list: never repeat it or point to it. | Price |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays, who it covers or which policy a trainer must hold (Table G: no universal requirement is verified). | Trust |
| cover | always | What if the training isn't working for my dog? | Open with what the owner does: tell us, and the plan is looked at again. Then that progress happens between sessions and depends on the practice at home, and that a behaviour which changed suddenly, or an older dog that is not shifting, means a vet check first (Table A: behaviour modification). Then the reasonable care and skill standard every service works to, as the standard, never as a defence. No promise of an outcome, no promise to come back free. Never invent a guarantee. | Trust |
| scope | always | What dogs and problems do you take on? | The services on the card list, said in the owner's words (pulling, not coming back, barking at other dogs, a new puppy), and the dogs and ages taken on only from [CV: typical_jobs] and the services list. The pages about a skill (assistance, scent, gundog work) are described by what the dog is trained to do and which owner wants that, not by a problem. Protection or security dog services, where the services list includes them, named once in one plain sentence with their page linked, never in this page's owner voice. Link one service page. | Fit |
| process | always | What happens when I get in touch? | From [CV: quote_method] and the confirmed practices only: what the owner sends (the dog's age, what it does and where, what they have tried), what the business looks at, what comes back. No timescale unless [CV: response_time] is set. Never a number of sessions. | Process |
| timing | always | When is the right time to start training? | The life stages in plain words: puppyhood (classes usually accept healthy puppies after their first vaccination, with the vet's advice, from Table E only; no age in weeks), adolescence, when a dog appears to forget what it knew and that is normal, adult dogs, where change comes from building a stronger habit in place of the old one, and older dogs, where a change in behaviour means a vet check first. The reason not to wait: every reaction practised gets stronger. No dates, no timeline, no outcome. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue (the walks, the housing, the livestock, the crowds), answered as asked: the usual cause here in plain words, what the local walking adds, then what the training does about it. Never that the town's dogs are badly behaved or its owners careless. One figure at most. | Process |

**Seasonal swap:** none (seasonal_trade is no).

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (is this right for your dog) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps, the FAQ slots (cost, timing, cover, process, scope, and rules as a sixth when the service has Table C rule rows) and the symptom question. The service's own trade facts rows (`trade-facts/pack.js rowsForService`: standard method, timing, what goes wrong, rule, fact, price factor) are the material every brief points at, so one type C entry serves puppy training, reactive dog training and dog boarding alike; the briefs say which framing a behaviour led, care led, skill led or protection page follows. Placeholders: `[SERVICE]` the page keyword without the town (Recall Training, Dog Day Care), `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number, never a behaviour outcome.

- A niche with no section here has its service pages refused: "no service block briefs for dog-training".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type C (pet service: every service under Dog Trainer)

**What's Included.** H2: What's Included in [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items (every row in the current pack has 6). An item whose stage the row lacks is dropped, not invented.

| Item | Brief |
|---|---|
| Finding out about your dog first | The first stage from the trade facts stages row: the history taken, the dog's confidence or current cues assessed, what the owner has tried. For a boarding, day care or residential page the row's first stage is the dog's records checked. A part of the service, not a promise about the quote. |
| A vet check where the behaviour calls for it | Only where the trade facts stages row has it (behaviour modification, reactive, nervous and anxious, aggressive dog work: veterinary assessment or referral where appropriate). Written as a step the trainer takes, never as a legal requirement (Table E: no blanket requirement). Where the row has no such stage this item is dropped, not invented. |
| Working out what sets it off | The assessment stage from the stages row: what sets the behaviour off and the distance the dog copes at, the feared situations, the pulling and the equipment, the dog's suitability for a stay or a group. Named as the row names it, in the owner's words. |
| A plan you can keep up at home | The plan stage from the stages row: management and the behaviour plan, the cue and the reward chosen, the routine for a stay. A named product or tool only from [CV: materials_methods]. |
| Practice in small steps, where the dog can succeed | The central stage from the stages row: practice in a quiet or secure setting, at a distance where the dog stays calm, a long line where there is space, distractions added one at a time; for a stay, the training during the stay; for day care, the supervised day with rest built in. Named as the trade names it, without the trade's jargon. |
| Coaching you, not just the dog | The owner's stage from the stages row: coach the owner, demonstrate the exercises, owner practice and review. Progress happens between sessions: say so once. |
| Taking it out into real walks | The transfer stage from the stages row: ordinary walks, busier places, public settings, suitable field conditions for a gundog. Where the business does this only from the confirmed practices. |
| A review of how it's going | The last stage from the stages row: review, handover and follow up, same day collection for day care. What the owner leaves with. No number of reviews unless [CV: visit_frequency_options] or [CV: price_list] gives it. |

**Block 4, is this right for your dog.** H2: Is [SERVICE] Right for Your Dog?

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| What you've noticed | the training left undone | The things an owner notices first, from the trade facts signs row for this service, in their words (pulls me, runs off, hides from visitors, growls when touched, won't settle). The one cause this card makes: the training left undone. Then what it leads to if left, from the skipped row: specific, never alarming, never a legal threat spelled out. For a boarding or day care page the signs are instead what a particular dog needs while it is away from home: how much it runs, how much it sleeps, whether it likes a crowd (Table A and Table B rows). For a skill led page (assistance, scent, gundog work) the card is what the dog is trained to do and which owner wants that, not a problem. |
| Why what you tried didn't hold | the timing of the reward, not the owner's effort | The owner has usually tried something already: treats, a different lead or harness, a class, calling louder. The one cause this card makes: the reward or the practice came at the wrong moment or in the wrong place, never a lack of effort. Food that arrives a beat after the moment pays for the wrong thing; a new lead or harness changes how the walk feels, not the habit underneath; practice only in easy places leaves the hard walks unchanged (Table B done badly row). Say how this service rebuilds it, from the stages. Takes the shame away; never blames the owner, never names an aversive tool. Only on a protection or security dog page, where the services list includes it: the card is instead whether a dog is the right answer to the risk at all, with the honest cases where a dog is the wrong tool (a site the public walks through, a risk a camera already covers, a home that will not do the daily handling); no crime claim of any kind. |
| When to see the vet first | pain or illness behind a change in behaviour | A behaviour that changed suddenly, a growl when touched, an older dog that has stopped coping with things it used to. The one cause this card makes: pain or illness behind a change in behaviour, which training cannot reach. Say that a vet check comes first where the trade facts stages row has it (behaviour modification, reactive, nervous and anxious, aggressive dog work), as what the business does, never as a rule for the owner (Table E: no blanket requirement). For a boarding, day care or residential page the card is the health side of a stay instead: the records, the vaccination lead in and the screening before admission, from the trade facts rule rows only, with no figure. Never a diagnosis, never medical advice. |
| The right format for this dog | the setting the behaviour happens in | At home, on the usual walk, in a small class, a stay away. The one cause this card makes: a behaviour changes most reliably in the setting it happens in, so the format has to match the dog and the owner. Say which setting suits which dog from the stages row (home based work where the problem is at home; a class for a confident dog that needs practice around others; a stay only where the dog suits being away, Table A: residential dog training, assess suitability). A residential stay never replaces the owner's part: the handover and the practice at home (Table B and Table E: residential). Name only formats on the services list, with one sibling service page linked. Never that a stay fixes the dog. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| One to one or in a group | Individual sessions against a place in a group, from the trade facts price row. Say it plainly and give no figure; which the business offers only from the services list. |
| Where it happens | Travel to your home, a local venue, a secure space hired for recall, practice at several locations, transport for a stay or a day, from the trade facts price row. Say why distance and more places add time. |
| How much there is to work on | The size factor from the trade facts price row for this service: how far the behaviour has gone, reactivity alongside pulling, a vet's involvement, the length of a stay, a dog's medication or handling needs. Said without alarm and never as the owner's fault. |
| Follow up and reviews | Extra follow up, repeated reviews, continuing support, a handover after a stay, from the trade facts price row; remote reviews where the row says they suit. Each adds to the price. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The category type C steps (Tell Us About Your Dog; We Get to Know Your Dog and Agree the Price; We Start on a Date That Suits You).

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (insurance, else the fallback), process, scope; a sixth, rules, only when the service has Table C rule rows.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the quote is given, from [CV: quote_method] only. The cost cards hold the list: never repeat it or point to it. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only. The rows give no standard duration for any training service (Table G), so give what decides it (the behaviour, how long it has been practised, the dog's age, the practice between sessions) and never a number of sessions or weeks. For a day care page the row's daytime only rule; for a stay, that the length is agreed for the dog. Nothing about when sessions can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays, who it covers or which policy a trainer must hold (Table G: no universal requirement is verified). | Trust |
| cover | always | What if it isn't working for my dog? | Open with what the owner does: tell us, and the plan is looked at again. Then that progress happens between sessions and depends on the practice at home, and that a behaviour which changed suddenly, or an older dog that is not shifting, means a vet check first (Table A: behaviour modification). Then the reasonable care and skill standard every service works to, as the standard, never as a defence. No promise of an outcome, no promise to come back free. Never invent a guarantee. | Trust |
| process | always | How does [SERVICE_LOWER] start? | From the first stages of the trade facts stages row and [CV: quote_method]: what the owner sends or brings, what is looked at first, what they go home with. For a stay or day care page, the records and the settling in from the row. No timescale unless [CV: response_time] is set; never a number of sessions. | Process |
| scope | always | What does your [SERVICE_LOWER] include? | The What's Included items said as a sentence, in other words. What it does not cover only from the services list, with one sibling service page or the category page linked. On a protection or security dog page (where the services list includes it): never the owner voice, and any licence or accreditation named only from the client values. | Fit |
| rules | the service has rule rows | Are there any rules I should know about for [SERVICE_LOWER]? | From the trade facts rule rows only, written as the normal case, with "usually" or "in most cases": a lead near livestock and on open land in the season the row gives, local orders in parks and on beaches, the council licence a boarding or day care business holds (the operator applies; the owner does nothing), the vaccination lead in before a stay, a vet referral for clinical behaviour work. Never an Act's name, a standard's number, a date, a distance or legal advice. On a protection or security dog page, where the services list includes it: a dog guarding premises is kept in the handler's charge or made secure, and the entrances carry warning signs, as normal practice. Whether shock collars are lawful is never stated, whatever the rows say. | Process |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue (the walks, the housing, the livestock, the crowds), answered as asked: the usual cause here in plain words, what the local walking adds, then what this service does about it. Never that the town's dogs are badly behaved or its owners careless. One figure at most. | Process |

**Seasonal swap:** none (seasonal_trade is no).

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (the problems the town's dogs and owners have across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you get to [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the type's category page steps. The briefs are town wide: the walk is this trade's richest local detail (pack section 3), so the town profile's walking environments, livestock, housing, council dog rules and demographics are the material, and every anchor must change the work. No seasonal swap and no symptom question on a location page. The type is the client's (`business_type`, here always C). Placeholders: `[WORK]` the work noun (Dog Training), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town. Never that the town's dogs are badly behaved or its owners irresponsible; never an invented attack or livestock incident; never a breed as a local problem.

- A niche with no section here has its location pages refused: "no location block briefs for dog-training".

### Type C (pet service: the client's type is C)

**Block 4, common problems in the town.** H2: Common [WORK] Problems in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Walks that start on a busy pavement | dogs meeting nose to nose with nowhere to pass | Narrow pavements, shared stairwells, a front door that opens straight onto the street, dogs passing within a lead's length of each other. The one cause this card makes: dogs meeting nose to nose with nowhere to pass, so lead manners and a reactive dog's calm are tested on every walk; the town profile and the allocated neighbourhoods say which streets (terraces, flats, the centre). Say what it means for training in plain words (lead work and distance come before anything else here); what the business does only from confirmed practices. Not a behaviour learned indoors, not a reaction rehearsed: the town's category and service pages own those. |
| Footpaths through fields with stock in them | livestock within reach of a dog off the lead | Paths that cross grazing, a stile into a field of sheep, lambing fields at the edge of town. The one cause this card makes: livestock within reach of a dog off the lead, which is a legal matter for the owner and a danger to the dog. The normal case, with "usually" and from the trade facts rule rows only (a lead near stock, a lead on open land in the season the row gives; never the Act's name, a date or a distance). Say why a reliable recall and a stop cue are built before the dog is let off here. Never an invented incident. |
| Dogs that spend the working day alone | a household out all day and a dog with nothing to do | Commuter streets, new estates of young families, a dog that barks through the afternoon. The one cause this card makes: a household out all day and a dog with nothing to do, from the town profile where it gives who lives here. Say what it means for training (settling, short practice that fits a working week) and, where the services list includes day care or boarding, what a day with exercise, company and rest changes (Table A: dog day care). Never that the town's owners neglect their dogs. Not being alone never taught in small steps: the category page owns that. |
| Places where the lead rules change | parks and beaches with their own dog orders | A beach closed to dogs in summer, a park with a dogs on leads order, a nature reserve with ground nesting birds. The one cause this card makes: parks and beaches with their own dog orders, which change what a walk there asks of the dog; from the dossier rules only, as what usually applies, never the order's name. Say what that asks of the training (a reliable recall and a settled walk on the lead both matter here). Where the dossier gives no such rule, the card is the town's one open space and what practising there involves. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Getting to you | Sessions at the owner's home further from the base add travel (Table F rows: travel to the home). Say it plainly; nothing about distance unless [CV: travel_distance] is set. No figure. |
| Somewhere quiet to practise | A town with no quiet open ground close by means hiring a secure field or starting further out (Table F: access to secure training space, a quiet local practice area). Say why that adds time or cost, from the town profile where it gives the open spaces. No figure. |
| Walks with more going on | A dog that has to pass traffic, crowds and other dogs within a lead's length needs practice at more places than one quiet street (Table F: practice at multiple locations, distraction heavy settings). From the profile where it gives the housing and the centre. No figure. |
| A class nearby, or one to one | Where the business runs a class in or near the town, a place in it costs less than one to one sessions at home (Table F: group format). Only from the services list and the confirmed practices; otherwise say the format moves the price without saying which the business offers here. No figure. |

**Steps.** The category type C steps (Tell Us About Your Dog; We Get to Know Your Dog and Agree the Price; We Start on a Date That Suits You), by the fallback.

**FAQ slots.** Five: cost, the town question, one cover question (insurance, else the fallback), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the price movers in a town like this (travel, where there is room to practise, one to one or a class) and how the quote is given, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you get to [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | insurance | Are you insured? | The cover figure from [CV: insurance_cover] and what the cover is for. Never what it pays, who it covers or which policy a trainer must hold (Table G: no universal requirement is verified). | Trust |
| cover | always | What if the training isn't working for my dog? | Open with what the owner does: tell us, and the plan is looked at again. Then that progress happens between sessions and depends on the practice at home, and that a behaviour which changed suddenly, or an older dog that is not shifting, means a vet check first (Table A: behaviour modification). Then the reasonable care and skill standard every service works to, as the standard, never as a defence. No promise of an outcome, no promise to come back free. Never invent a guarantee. | Trust |
| process | always | What happens when I get in touch from [TOWN]? | From [CV: quote_method] and the confirmed practices only: what the owner sends (the dog's age, what it does and where, what they have tried), what the business looks at, what comes back. No timescale unless [CV: response_time] is set. Never a number of sessions. | Process |
| timing | always | When is the right time to start training? | The life stages in plain words: puppyhood (classes usually accept healthy puppies after their first vaccination, with the vet's advice, from Table E only; no age in weeks), adolescence, when a dog appears to forget what it knew and that is normal, adult dogs, where change comes from building a stronger habit in place of the old one, and older dogs, where a change in behaviour means a vet check first. The reason not to wait: every reaction practised gets stronger. No dates, no timeline, no outcome. | Timing |

## What the sources lacked (questions for the client or for Ray)

Briefs that wanted a fact the pack or the facts pack does not state point at the rows instead. The gaps:
- Typical session length and number of sessions per service (Table G: varies, no standard). Client: a typical length for a one to one session and a class, as a client value, if it is to be stated.
- Puppy class starting age in weeks (Table E gives the socialisation window and "after their first vaccination" only). Client: the age the class actually takes puppies from.
- Whether a written plan, video of the exercises, a vet referral before behaviour work and a handover after a stay are this client's practices (none is in practices.json yet). Ray: add them to practices.json when the onboarding form is updated.
- Which insurance a trainer holds (Table G: no universal requirement verified). Client: the cover figure and what it is for, as [CV: insurance_cover].
- Whether the client holds a council animal activity licence and its star rating (boarding, day care, residential stays only). Client.
- Whether protection or security dog work is offered at all, and any licence or accreditation for it (Table D: NASDU; Table E: no SIA dog handler licence exists). Client.
- Council dog rules in each town (beach restrictions, dogs on leads orders) are not in the facts pack: the location briefs take them from the dossier rules only. Ray: the geo dossier research must capture them for this niche.
- The fireworks and seasonal calendar: nothing in the facts pack, so no seasonal swap. Ray: a decision whether the blog's local and seasonal posts carry it, as the pack suggests.

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| When should puppy training start? | Puppy training |
| The puppy months and the teenage wobble | Puppy training |
| Home alone, and not coping | Behaviour modification; Nervous and anxious dog training |

## Idea homes

- **progress comes from short practice at home between sessions** (homepage, service): home is the 'We Start on a Date That Suits You' step. Elsewhere: the 'how many sessions' and 'how long does it take' FAQs name home practice only as one decider in a few words; the 'isn't working for my dog' FAQ does not explain it again.
- **a vet check first when behaviour changes suddenly or an older dog stops coping** (service): home is the 'When to see the vet first' block 4 card. Elsewhere: the 'We Get to Know Your Dog' step says only that the first meeting checks whether a vet should come first, with no reasons; the 'isn't working for my dog' FAQ gives no list of warning signs.
