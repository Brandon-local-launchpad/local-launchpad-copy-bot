# Niche Library Entry: Pet Care (Dog Walker / Pet Sitter)

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/pet-care.json`; this file is the same content for people, kept in the same commit. The model never sees the slot names, only the resolved words.

Business type is **C (pet service)** for the whole niche (calibration pack, section 2): walks, visits and stays sold as bookings to an owner who has to trust the person with keys and an animal. Dog Walker and Pet sitter are both C; no category differs. Inside C the briefs split **behaviour led** (solo, group and secure field walks, day care, home boarding: the dog's temperament picks the service) from **care led** (sitting, visits, small animal care, pet taxi, wedding chaperone: the routine a visit or stay keeps). Sources: `calibration-packs/Pet_Care_Calibration_Pack_v1.md`, `trade-facts/pet-care.md` (Tables A to G), `niche-library/pet-care.csv` and `pet-care-categories.csv`, `fillout/services/pet-care-services-dog-walkers.json`.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Pet Care / pet care |
| trade_person / trade_person_plural | dog walker / dog walkers |
| customer_type | pet owners |
| unit_of_work | walks and visits |
| emergency_niche | no (the library flags no emergency page) |
| big_ticket | no |
| schema_subtype | LocalBusiness (schema.org has no dog walker or pet sitter subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) |
|---|---|
| dog, puppy, older dog, cat, rabbit, walk, visit, stay, lead, off the lead, recall, routine, keys, home, garden, feeding, litter tray, a note on how they got on | fur babies, pawsome, furry friends, pet parents, canine, feline, pack walk, pack leader, enrichment, socialisation, calmer dog, separation anxiety, happy, healthy pets, animal lover, peace of mind, bespoke, property |

The customer's words come first (the pack, section 1): pulling, barking when left, not eating, hiding. Never a cute brand voice, never a promise about behaviour or health (section 7).

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Book a [QUOTE_FREE] Meet and Greet |
| meta_cta | Book your [QUOTE_FREE_LOWER] meet and greet today. |
| process_h2 | Your [QUOTE_FREE] Meet and Greet in 3 Simple Steps |
| final_h2 | Book a [QUOTE_FREE] Meet and Greet With a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about your dog or cat and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about your dog or cat and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency page) |

## Steps (type C)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About Your Dog or Cat**
   Brief: how to get in touch and what is useful to say first (the animal and its age, what you need and on which days, anything it finds hard in the owner's words: pulls on the lead, barks once alone, off its food, hides). No promise of a reply time unless [CV: response_time] is set.
2. **We Meet You and Your Pet First** (only when the `site_visit_before_quote` practice is confirmed)
   Brief: the meet and greet at the customer's home and what is asked before a first walk or visit, from the trade facts Table A first stages: feeding, toileting and vet instructions, who to call, keys and access, doors and gates, how the dog is on the lead and with other dogs. Follows [CV: quote_method]; only say the price is written if quote_method says so. Never restates "free" (FAQ 5 owns it). Never a trainer's assessment and no promise about how the animal will take to it.
   Without the practice (`step_2_no_visit`): **We Agree the Plan and the Price**
   Brief: the plan for the animal and the price are agreed before the first walk or visit. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no call, video, form or visit). Only say the price is written if quote_method says so. Never restates "free" (FAQ 5 owns it).
3. **Walks or Visits Begin on a Day That Suits You**
   Brief: the first walk, visit or stay goes in the diary on a day that suits the customer. A regular pattern following on only when the `maintenance_schedule` practice is confirmed. What comes back after each visit (a note on how they got on, anything that looked off) from the trade facts Table A report stage. Never mention the price or changes to the plan (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

Pet taxi and the wedding chaperone do not fit the pattern cleanly (the pack's note for Brandon); the category and service page steps below read "walk, visit, stay or journey" so they still hold.

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | insurance (no guarantee or manufacturer warranty in this trade; the Homepage Structure's type C chain is qualification plus method, insurance, pet first aid, and code only reads insurance from the chain) |
| fears (in order, one per Why choose us point) | 1. a walker who hurries the walk, loses the dog off the lead, or simply stops turning up; 2. handing keys and the run of the house to someone they have met once; 3. returning to a pet that went off its food, got out past a gate or sat out the week unsettled in a strange place; 4. a service that does not suit their animal (a nervous dog put in a group, a cat moved out of its home) and nobody saying so |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the trade facts Table D: none of these is a statutory dog walker licence, and the copy never calls one that.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Trustpilot. (Checkatrade is not a pet care register: Table D.)
- **Tier 1, licence and trade bodies:** the council animal activity licence (dog home boarding, dog day care and cat boarding only; the activity, status, expiry and star rating checked on the council register), NarpsUK (National Association of Pet Sitters and Dog Walkers), Pet Industry Federation (PIF), Professional Dog Walkers Association.
- **Tier 2, qualifications and professional bodies:** Pet Professional Guild, IMDT Professional Dog Walking Certification, City & Guilds Level 2 Certificate of Technical Competence in Dog Walking, Canine and Feline Behaviour Association (CFBA).
- **Tier 3, local credibility and checks:** pet first aid certificate, DBS check, specialist pet business insurance (Cliverton, Pet Business Insurance), a rescue partner or vet referral, local press. Ray's call per client.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured to look after my dog or cat? | The cover figure from [CV: insurance_cover] and what the cover is for. The trade facts Table E says cover for the animal in the business's care is a different question from public liability for other people: say which the client has only as the client values give it, never both by default. Never what it pays. | no | Trust |
| faq_2_fallback | What happens if something goes wrong? | From [CV: complaints_process] only. | no | Trust |
| faq_3 | Do you guarantee your service? | Used only when a guarantee is confirmed. Start with yes, then the terms. Never a promise about the animal's behaviour or health. | no | Trust |
| faq_3_none | What if my dog doesn't settle? | Used when nothing in cover_chain other than insurance is confirmed. Open with what the customer does: tell us, and we look at it together. Then what usually happens: the plan is changed to suit the dog (a solo walk instead of a group, a shorter visit, a visit at home instead of a stay), from the services the client offers only. Then the "reasonable care and skill" standard every trade works to, as the standard the work is held to, never as a defence. No promise of a refund, a result or a change in the dog; changing how a dog behaves is a trainer's work, not ours. Never invent a guarantee. | no | Trust |
| faq_4 | Do you have availability for new dogs? | From [CV: start_time] only, as given. Never say the books are full or open beyond what start_time gives, and never a waiting list unless the client values say so. | no | Timing |
| faq_5_free | Is the meet and greet free? | From [QUOTE_FREE] and [CV: quote_method]. | no | Price |
| faq_5_not_free | How does your pricing work? | From [CV: quote_method] only. Prices only from [CV: price_list]. | no | Price |
| faq_A | How long is a dog walk, and what does it include? | From the trade facts Table A solo and group walk stages: the collection, the walk and toileting, on the lead or off it only where the owner has agreed and it is allowed, the waste collected, water on return, the home secured and a note on how they got on. The length varies with no standard (Table A timing): a duration only from [CV: typical_jobs] or [CV: price_list]; otherwise say it is agreed with you. | no | Process |
| faq_B | Why does my dog bark or chew when left, and what helps? | Use the assigned symptom's meaning and its linked local issue (flats without gardens, long commutes). Three genuinely different causes in plain words, from the trade facts Table B signs rows: a day longer than the dog can manage alone, exercise and toileting missed, a puppy too young to hold on. Then what a midday walk or a visit changes (exercise, company, a toilet break), never that it cures the barking or chewing: the behaviour itself is a trainer's work and anything that looks like illness is for the vet. | **yes** | Process |
| faq_C (fallback) | Should my dog walk alone or in a group? | Which dogs suit each, from the trade facts Table B group walk signs: a dog that lunges at other dogs, goes stiff or barks at them is usually happier walked alone; a sociable dog with reliable recall may suit a small matched group. A group size only from the client values; otherwise say some councils limit the number of dogs a single walker may take out while an insurer's policy may add its own cap (Table E dog walking group size) and name no number. Never a promise the dog will get used to other dogs. | no | Fit |
| faq_D (fallback) | Do you walk dogs in hot weather? | From the trade facts Table E hot weather row: there is no safe temperature cut off; walks move to cooler times of day, the tarmac hand test decides, and older, overweight and flat faced dogs need particular care. What the business itself does only from confirmed practices (weather_delays_rebooked); otherwise what usually applies. No figure, no temperature. | no | Timing |
| faq_licence (fallback) | Does a walker or sitter need a licence? | From the trade facts Table E only: there is no general licence for walking a dog or caring for it in its own home; for boarding a dog or cat at the business's home, and for day care, a licence from the council for animal activities applies in most cases, and the council register shows it with its star rating. Name the licence as the client's only where the client values carry it; without that, describe the general position. Never an Act's name, a regulation number or a penalty. | no | Trust |

Sources for faq_A to faq_D: the Homepage Structure's type C questions and the calibration pack's decision topics (group or solo, hot weather, how long a puppy can be left). Replace with real customer questions when Brandon or the client supplies them.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`). For this trade the list is what the business carries, uses or holds.
- On a walk: leads and a spare lead / long line / harness / poo bags / water and a bowl / towel for muddy dogs / high visibility gear and a torch
- In the vehicle: secured crates / dog guard / harness restraints / carriers for cats and small animals
- Safety: pet first aid kit carried / pet first aid trained / DBS checked / coded key tags or a key safe / GPS tracked walks / photo or written update after every visit
- Boarding and day care: council animal activity licence held / a room of their own for each dog / secure private garden / secure field used for off lead exercise
- Cats and small animals: familiar food and litter used / litter trays cleaned each visit / enclosures cleaned each visit / cats and small animals cared for in their own home

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

dog walking, solo walks, solo dog walks, group walks, group dog walks, secure field, secure field walks, off lead, long line, recall, puppy visits, drop in visits, feeding visits, medication visits, dog sitting, cat sitting, house sitting, overnight sitting, live in sitting, home boarding, dog home boarding, day care, dog day care, cattery, cat boarding, small animal care, rabbit care, pet taxi, vet run, wedding dog chaperone, meet and greet, key holding, pet first aid, DBS

## Service words (validator and client block)

GBP service names are shown to the model in the words an owner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list. Every page target in `pet-care.csv` is here, with the library's aliases and the excluded rows (other niches) never named.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| dog boarding with training | (never named: Dog Training niche) |
| dog training | (never named: Dog Training niche) |
| cat grooming | (never named: Dog Grooming niche) |
| dog grooming | (never named: Dog Grooming niche) |
| other pet grooming | (never named) |
| other pet daycare | (never named) |
| cat boarding | cat boarding |
| cat sitting | cat sitting |
| dog boarding | dog home boarding |
| dog home boarding | dog home boarding |
| dog day care | dog day care |
| dog sitting | dog sitting |
| dog walking | dog walking |
| other pet boarding | small animal care |
| other pet sitting | small animal care |
| small animal care | small animal care |
| solo dog walks | solo dog walks |
| senior dog walks | solo dog walks |
| reactive dog walks | solo dog walks |
| group dog walks | group dog walks |
| off-lead dog walks / off lead dog walks | group dog walks |
| secure field walks | secure field walks |
| puppy walks | puppy visits |
| puppy visits | puppy visits |
| feeding visits | drop in visits |
| medication visits | drop in visits |
| drop in visits | drop in visits |
| overnight pet sitting | dog sitting |
| live-in pet sitting / live in pet sitting | dog sitting |
| vet appointment transport | pet taxi |
| pet taxi | pet taxi |
| wedding dog chaperone | wedding dog chaperone |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words an owner uses, in the order code picks them (after the client's jobs_wanted). A card never leads with a licensed or specialist service (home boarding, the wedding chaperone) unless it is in jobs_wanted. JSON slot: core_services.

- Dog Walker: dog walking, solo dog walks, group dog walks, puppy visits, secure field walks
- Pet sitter: cat sitting, dog sitting, drop in visits, small animal care, dog home boarding

Service words for the whole trade rather than one service: pet care, dog walking, pet sitting, dog sitting, cat sitting, boarding. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: reactive, medication, recall. When an FAQ question names the job as well as the problem ("Can you give my cat her medication on a visit?"), it goes to the job's page (drop in visits), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices. The list is in `niche-library/practices.json` (shared by all niches). The briefs below lean on: `site_visit_before_quote` (the meet and greet), `price_agreed_before_work`, `maintenance_schedule` (a regular pattern), `customer_need_not_be_home` (landscaper only in the list today; see the questions below), `stage_updates`, `weather_delays_rebooked`. No pet care practice exists yet: keys and key safes, DBS, pet first aid, GPS, photo updates and a maximum group size are all "only as the client values confirm" until one does.

## Onboarding questions this niche needs

The cost and "how long" FAQs can only say what affects the answer unless the client gives figures (every Table A timing cell says "varies; no standard"). Ask every pet care client for:
- a "from" price for 3 typical bookings (e.g. a solo walk, a group walk, a cat sitting visit) and the length of each;
- whether the meet and greet is free, and whether the price is agreed before the first booking;
- the maximum number of dogs walked together (no custom value carries it today: the briefs say "only from the client values");
- how keys are held (key safe, coded tags), whether the team is DBS checked and pet first aid trained, and whether updates go out after each visit;
- for home boarding, day care and cat boarding: the council licence number, its expiry and star rating, so the copy can name it as this client's;
- bank holiday rates and cancellation terms (Table E: they vary, no standard).

## Section 5 alternative titles (why_titles_alt)

Type C defaults from the Homepage Structure:
1. Track record → **Local Walks We Know Well**
2. Cover → **Covered If Something Goes Wrong**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": dog walker → dog walking, pet sitter → pet sitting. A category with no noun reads "[CAT] Services" and is flagged. The category page briefs (`category_page_blocks`) use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Draft, 3 Nov 2026, for Brandon's read against the calibration pack. Used by the category page job (CORE (16)): block 4 (what the trade helps with, the pack's type C framing) and block 5 (cost factors) are an H2 and four card titles with a one line brief each, chosen by business type; the type also gives the process steps, the FAQ slots and the symptom question. Placeholders: `[CAT]` the page keyword without the town (Dog Walker, Pet Sitter), `[CAT_LOWER]`, `[WORK]` the work noun, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises, no behaviour or health outcome.

- `seasonal_trade`: no (the pack: steady through the year; the two pressure points, hot weather and holiday weeks, live in the timing FAQ and the cost cards)
- `category_types`: none (every category is C)
- A niche with no section here has its category pages refused: "no category block briefs for pet-care".

### Type C (pet service: Dog Walker, Pet sitter)

**Block 4, what we help with.** H2: What [WORK] Helps With

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Dogs left alone through the working day | a day longer than the dog can manage alone | Pacing, barking when left, scratching the door, toileting indoors: the trade facts Table B solo walk signs, in the owner's words. The one cause this card makes: a working day longer than the dog can manage without exercise, company or a toilet break. Say what a midday walk or visit gives the dog from the Table A stages (the walk and toileting, water on return, a note on how they got on), linking the solo or group walk page where LINKABLE PAGES has one. Never that it cures the barking or chewing: the behaviour itself is a trainer's work. Not which walk suits which dog: card 2 owns that. |
| Dogs that struggle around other dogs | a walk that does not fit the dog's temperament | A dog that lunges at other dogs, goes stiff or barks at them, or comes home unsettled (Table B group walk signs). The one cause this card makes: a walk that does not fit the dog's temperament. Behaviour led: say which service suits which dog, from the services list only (a solo walk for the nervous or reactive dog, a small matched group for the sociable dog with good recall, a secure field for the dog whose recall fails when a rabbit runs), as the Table A group walk stages have it (each dog assessed, a compatible group planned). A group size only from the client values; otherwise none. Never a promise the dog will get used to other dogs. |
| Puppies and older dogs who need something gentler | a body that cannot manage a full day or a full walk | A puppy that cannot hold on all day or cries when alone; an older dog stiff after a long walk (Table B puppy visit signs; Table E senior dog row: little and often). The one cause this card makes: a body that cannot manage a full working day or a full walk. Say what a short visit or a shorter walk does instead, from the Table A puppy visit stages (let out, fed on schedule, company), and that visits are kept to the home and garden until the vaccinations are complete, only as the Table A methods cell has it. Never the five minute rule (Table E says it is not a rule); no age and no minutes. |
| Cats and small animals who do better at home | an animal tied to its own territory and routine | Care led. A cat that hides or stops eating when moved; a rabbit that needs feeding, cleaning and a daily check (Table B cat sitting and small animal care signs; Table E welfare check row). The one cause this card makes: an animal tied to its own territory and routine, so a strange place puts it off its food. Say what a visit covers from the Table A cat sitting and small animal care stages: food put down, water changed, the tray or bedding cleaned, the animal looked over, a note on whether it ate, a rabbit's rear end checked in warm weather. A cat off its food needs the vet's opinion. Not boarding: the service pages own that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [CITY]

| Card | Brief |
|---|---|
| Solo or in a group | A solo walk or visit is one animal's time; a small group shares the walker's time between dogs (Table F solo and group walk rows). Say it plainly, give no figure and no group size; a size only from the client values. |
| How long and how often | The length of the walk, visit or stay and how many visits a day or a week, from the Table F rows (walk duration, visit frequency, length of stay). No duration or frequency unless [CV: visit_frequency_options] or [CV: typical_jobs] gives one; otherwise say the pattern is agreed with you. |
| Where you are and whether we collect | Travel and collection distance, and transport to a field or to day care, from the Table F rows. Say why distance and a collection add time to a booking. Nothing about the area covered unless [CV: travel_distance] is set. |
| Extra care your animal needs | Medication, a special diet, more than one animal, out of hours and bank holidays, from the Table F rows. Medication only as the owner's vet has prescribed and instructed (Table E medication row), never a dose or a product. Bank holiday rates only from [CV: price_list]. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Tell Us About Your Dog or Cat**
   Brief: How to get in touch and what is useful to say first (the animal and its age, what you need and on which days, anything it finds hard in the owner's words: pulls on the lead, barks once alone, off its food). No promise of a reply time unless [CV: response_time] is set.
2. **We Agree the Plan for Your Pet**
   Brief: The meet and greet at the customer's home and the questions asked before a first walk or visit (feeding, toileting and vet instructions, keys and access, doors and gates, how the dog is on the lead and with other dogs: the Table A first stages) only when the site_visit_before_quote practice is confirmed; otherwise how the plan and the price are agreed from [CV: quote_method] only, naming no method when it is blank. The price agreed before the first visit only when the price_agreed_before_work practice is confirmed. Never restates "free". No trainer's assessment.
3. **Walks or Visits Begin on a Day That Suits You**
   Brief: The first walk, visit or stay goes in the diary on a day that suits the customer. A regular pattern following on only when the maintenance_schedule practice is confirmed. A note after each visit from the Table A report stage. Never mention the price or changes to the plan.

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the price is agreed before the first walk or visit when the price_agreed_before_work practice is confirmed. The cost cards hold the list: never repeat it or point to it. | Price |
| cover | insurance | Are you insured to look after my pet? | The cover figure from [CV: insurance_cover] and what the cover is for. Cover for the animal in the business's care is separate from public liability (Table E): say which only as the client values say. Never what it pays or who it covers. | Trust |
| cover | always | What happens if my pet is hurt or unwell while in your care? | Open with what happens: the vet is called, using the vet and emergency details given before the first visit (Table A first stages), and the owner is told. Then the reasonable care and skill standard every trade works to. No promise to pay vet bills, no guarantee, never invent insurance. | Trust |
| scope | always | What does your [WORK_LOWER] service include? | The services on the card list, said as what a walk, visit or stay covers, and which animals each suits, honestly (a nervous dog, a cat, a rabbit). Link one service page. What is not offered only from the services list (training and grooming are other trades). | Fit |
| process | always | What happens before the first walk or visit? | From [CV: quote_method] and the confirmed practices only: the meet and greet where site_visit_before_quote is confirmed, and the questions asked first from the Table A first stages (feeding, toileting and vet instructions, keys and access, doors and gates, how the dog is on the lead and with other dogs). Keys, key safes and DBS checks only as the client values confirm them. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Do you walk and visit all year round? | Year round, as every Table A timing cell has it. Hot weather: walks move to cooler times of day, there is no safe temperature cut off and the tarmac hand test decides (Table E hot weather row). Winter: outdoor water for rabbits freezes (Table A small animal care). Stays and sitting book up in school holidays and summer: give the reason, never "a busy time". No dates, no figure, no temperature. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue (flats without gardens, commuter hours, grazing beside the paths outside town, a beach or common with seasonal rules), answered as asked: the usual cause in the animal in plain words, what the local walking environment or housing adds, then what a regular walk or visit does about it. Never a claim about the area's pets or the people who own them; never a behaviour or health outcome; one figure at most. | Process |

**Seasonal swap.** None: `seasonal_trade` is off.

## Service page blocks by business type (service_page_blocks)

Draft, 3 Nov 2026, for Brandon's read against the calibration pack. Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 ("is this right for your animal", the pack's type C framing) and block 5 (cost) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps, the FAQ slots (cost, timing, one cover question, access, scope; a sixth, the licence question, when the service has Table C rule rows) and the symptom question. The service's own trade facts rows (`trade-facts/pack.js rowsForService`) are the material every brief points at, so one type C entry serves solo walks, cat sitting and dog home boarding alike. Placeholders: `[SERVICE]` the page keyword without the town (Solo Dog Walks, Dog Home Boarding), `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]`, `[SYMPTOM]`. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number, no Act's name.

- A niche with no section here has its service pages refused: "no service block briefs for pet-care".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).

### Type C (pet service: every page)

**What's Included.** H2: What's Included in [SERVICE]. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| The meet and greet and your instructions | The first stage from the trade facts Table A row for this service: feeding, toileting, vet and emergency instructions, keys and access, consent for a group, for off lead exercise or for sharing a room. A part of the job, not a promise about the price. |
| A check of your animal before we start | The check stage from the Table A row: the dog, its equipment and the weather; the puppy and the room; the cat found and looked over; a rabbit's food intake and droppings; the vaccination record on a boarding or day care page. |
| The walk, visit or stay itself | The central stage from the Table A row: the walk and toileting, the feeding and fresh water, the company and exercise of a stay, the journey, named as the row names it. On the lead, or off it only where the owner has agreed and it is allowed (Table A methods cell). |
| Food, water and clean up | Water refreshed, food as instructed, the litter tray, bedding or an accident cleaned, from the Table A stages. Medication only as the vet has prescribed and the owner has authorised (Table E medication row); never a dose or a product. |
| Doors, gates and your home secured | The securing stage from the Table A row: the dog secured before a gate opens, the enclosure closed, the home secured before leaving. Key handling and key safes only as the client values confirm. |
| A note on how they got on | The report stage from the Table A row: what was eaten, toileting, how the animal seemed, anything that looked off (a limp, hiding, food untouched) reported so a vet can be called early (Table B done badly row). Photo updates only as the client values confirm. |
| Collection and transport, where it's part of the booking | Only where the Table A row has transport (group walks, secure field walks, day care, pet taxi, the wedding chaperone): the animal secured in a harness, carrier, cage or behind a guard, as the Table C Highway Code row has it. Where the row has no transport, say the animal stays at home. |

**Block 4, is this right for your animal.** H2: Is [SERVICE] Right for Your Animal?

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Who it suits | the animal's needs matched to the service | Which dogs or cats this service suits, from the trade facts Table B signs row for this service, in the owner's words (a dog that cannot settle alone, a cat whose food needs checking, recall that is unreliable). The one cause this card makes: the animal's needs matched to the service. Where temperament picks the service, say which fits. That is the walking pages, day care and home boarding. Where routine picks it, say which routine it keeps. That is the visit, sitting and transport pages. Never a promise of a change in the animal. |
| Who would do better with something else | the wrong option for this animal | The honest other half: the dog that pulls towards other dogs belongs on a solo walk, not in a group; the cat that hides is better served by visits at home than by a strange place; the puppy whose vaccinations are not complete is kept to the home and garden; an ill dog is not mixed with others (Table B done badly rows for this service and its siblings). The one cause this card makes: the wrong option for this animal. Name the sibling service page where LINKABLE PAGES has one. Never run another service or another business down. |
| What happens if it's missed | a walk, visit or check missed | What fails when the job is skipped, from the Table B skipped row for this service (a toilet opportunity missed, water run out, illness unnoticed, a rabbit's rear unchecked in warm weather, a necessary journey missed). The one cause this card makes: a walk, visit or check missed. Specific, never alarming, never livestock or illness as a scare. |
| Keys, doors and your home | an exit left unsecured | The trust barrier: keys, doors and gates. The one cause this card makes: an exit left unsecured, so an animal slips out (Table B done badly rows: unsecured exits, an unsecured gate, poor access security). Say what the job does about it from the Table A stages (the dog secured before the gate opens, the enclosure inspected, the home secured before leaving; on a home boarding page the barriers between a dog and the way out only as the Table C row has them, with no number). Key handling, key safes and DBS checks only as the client values confirm. Never a promise it cannot happen. |

**Block 5, cost factors.** H2: What Affects the Cost of [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How long, and how often | From the Table F row for this service: the duration, the visit frequency, the length of stay or the attendance hours. Say it plainly; no duration or frequency unless [CV: visit_frequency_options] or [CV: typical_jobs] gives one, and give no figure. |
| Where you are, and whether we collect | Travel and collection distance, transport and the restraint or carrier it needs, from the Table F row. Say why distance and a collection add time. Nothing about the area covered unless [CV: travel_distance] is set. |
| How many animals, and what they need | The number of animals, medication, a special diet, individual handling or a room of their own, from the Table F row. Medication only as the vet has prescribed (Table E medication row), never a dose. Say the business asks before it prices, from [CV: quote_method] only. |
| Unsocial hours and peak weeks | Early, late and out of hours bookings, bank holidays, and the school holiday and summer weeks when stays and sitting book up, from the Table F row (unsocial hours) and the Table E cancellation and bank holiday row (terms vary, no standard). Bank holiday rates and cancellation terms only from [CV: price_list] and the client values. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Tell Us About Your Dog or Cat**
   Brief: How to get in touch and what is useful to say first (the animal and its age, what you need and on which days, anything it finds hard in the owner's words). No promise of a reply time unless [CV: response_time] is set.
2. **We Agree the Plan for Your Pet**
   Brief: The meet and greet and what is asked ahead of the first booking (the Table A first stages for this service) only when the site_visit_before_quote practice is confirmed; otherwise how the plan and the price are agreed from [CV: quote_method] only, naming no method when it is blank. The price agreed before the first booking only when the price_agreed_before_work practice is confirmed. Never restates "free". No trainer's assessment.
3. **Walks or Visits Begin on a Day That Suits You**
   Brief: The first walk, visit, stay or journey goes in the diary on a day that suits the customer. A regular pattern following on only when the maintenance_schedule practice is confirmed. A note after each booking from the Table A report stage. Never mention the price or changes to the plan.

**FAQ slots.** Five before the symptom question: cost, timing, one cover question (the first whose condition holds), access, scope; a sixth, the licence question, only when the service has Table C rule rows (every pet care service has at least one). The timing answer owns the length and the pattern of the booking (there is no separate frequency slot).

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the price is agreed before the first booking when the price_agreed_before_work practice is confirmed. The cost cards hold the list: never repeat it or point to it. | Price |
| timing | always | How long, and how often, can I book [SERVICE_LOWER]? | From the trade facts timing row for this service only: the row says the length varies with no standard, so say the length and the pattern are agreed with you; a duration only from [CV: typical_jobs], a frequency only from [CV: visit_frequency_options]. Then the season the row gives (year round; in hot weather walks move to cooler times of day; on the day care page no overnight stay, from Table A). Nothing about when a booking can start unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for. Cover for the animal in the business's care is separate from public liability (Table E): say which only as the client values say. Never what it pays or who it covers. | Trust |
| cover | always | What happens if my pet is unwell during [SERVICE_LOWER]? | Open with what happens: the vet is called, using the vet and emergency details given before the first booking (Table A first stages), and the owner is told. Then the reasonable care and skill standard every trade works to. No promise to pay vet bills, no guarantee, never invent insurance. Medication never beyond the vet's instructions (Table E medication row). | Trust |
| access | always | Do I need to be home, and how do you handle my keys? | From [CV: access_handling] and the confirmed practices only (customer_need_not_be_home): keys, a key safe, alarm codes, side gates. Lost key cover and DBS checks only from the client values. When nothing is on file, say the arrangements for getting in are agreed before the first booking and nothing more. On a boarding, day care or pet taxi page, drop off and collection instead, from the client values. | Process |
| scope | always | What does your [SERVICE_LOWER] service include? | The What's Included items said as a sentence, in other words. What it does not cover only from the services list (training and grooming are other trades), with one sibling service page or the category page linked. | Fit |
| rules | the service has rule rows | Do you need a licence for [SERVICE_LOWER]? | From the trade facts rule rows for this service only, written as the general position, with "usually" or "in most cases". For the three pages where a council licence applies (boarding a dog at home, day care, a cattery stay): say it is the norm, and that the council's register lists the business, its status and a star rating. This client's own licence only when the client values confirm it; otherwise the general position. On a walking, sitting, visit, small animal, pet taxi or wedding page: the rows say walking and care in the animal's own home are not by themselves licensed boarding; say so and leave it there. Never an Act's name, a regulation number, a penalty, a figure or legal advice. | Process |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual cause in the animal in plain words, what the local walking environment or housing adds, then what this service does about it. Never a claim about the area's pets or the people who own them; never a behaviour or health outcome; one figure at most. | Process |

**Seasonal swap.** None: `seasonal_trade` is off.

## Location page blocks by business type (location_page_blocks)

Draft, 3 Nov 2026, for Brandon's read before the first live run. Used by the location page job (CORE (18)): block 4 (what the town's walking environment makes the work work around: the pack's section 3 anchors) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you take on a new dog in [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the type's category page steps. The briefs are town wide, not per category: the town profile, the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED carries the town's other pages' causes). No seasonal swap and no symptom question on a location page. The type is the client's (`business_type`), never a category override. Placeholders: `[WORK]` the primary category's work noun (Dog Walking, Pet Sitting), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town. The copy rules of CORE (18) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no order's or Act's name, no how it's done sentence. Good local detail is the walking environment, never the people or pets in an area (the pack, section 3): every anchor must change the work.

- A niche with no section here has its location pages refused: "no location block briefs for pet-care".

### Type C (pet service: the client's type is C)

**Block 4, what the town's walks work around.** H2: What [WORK] in [TOWN] Works Around

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Footpaths through farmland outside town | livestock grazing beside the footpaths | Where the town profile gives farmland, grazing or lambing fields beyond the last streets. The one cause this card makes: livestock beside the footpaths, which puts dogs on the lead there (Table C open access and Table E lead rows: a lead around livestock, written as the general position; never a date range, a lead length or an Act's name). Say what that does to a walk: the route chosen, the lead kept on. Livestock is a reason, not a threat, and the town's pets and their people are never characterised. |
| Parks, commons and the river path | where the town's daily walks happen | Only the green spaces and waterside paths the dossier gives, by name. The one cause this card makes: where the town's daily walks happen decides how they are walked. What each place means for the work: a council order capping the dogs one walker may take, or requiring leads, a beach with seasonal restrictions, a path beside a busy road where the lead stays on (Table C public spaces order row: a local order may set leads, exclusion areas or a maximum number; no number unless the research gives it). Never a park, field or rule the research does not give. |
| Flats and long commutes | a home with no garden and a long day | The housing and the commuter pattern from the town profile: flats without gardens, estates where the household is out from early until late. The one cause this card makes: no garden to let the dog into and a day too long for it, so a midday walk or a puppy visit is the dog's one chance to get outside. Only the housing and the hours; never a claim about the town's owners or pets. Not a day longer than the dog can manage: the Dog Walker page owns that. |
| Heathland and the open country | birds nesting on the ground in the spring months | Where the town profile gives heath, open access land or a nature reserve. The one cause this card makes: birds nesting on the ground, so dogs usually stay on a short lead there through the nesting months (Table C open access row, written as the general position; no dates, no lead length, no Act's name). Say which walks move elsewhere or stay on the lead in those months. Not livestock: card 1 owns that. |

**Block 5, cost factors.** H2: What Affects the Cost of [WORK] in [TOWN]

| Card | Brief |
|---|---|
| How far we travel to you | Travel and collection distance from the base town, from the Table F rows. Say why the distance adds time to each visit; nothing about the area covered unless [CV: travel_distance] is set. No figure. |
| Collecting for a field or a group walk | Where dogs in this town are collected and driven to a secure field or to a group walk: the transport, the restraints and the collection round, from the Table F group walk and secure field rows. Say why it adds time. No figure. |
| Parking and getting to the door | Terraced streets with no parking near the door, flats with an entry system, a long walk from the van: the time each visit takes before the animal is reached, from the town profile where it gives the housing. No figure. |
| Holiday weeks and bank holidays | The summer and school holiday weeks, when stays and sitting fill up, plus bank holidays, from the Table F rows (unsocial hours) and the Table E cancellation and bank holiday row (terms vary, no standard). Bank holiday rates only from [CV: price_list]; never "a busy time" without the reason. No figure. |

**Steps.** The category type C steps (Tell Us About Your Dog or Cat; We Agree the Plan for Your Pet; Walks or Visits Begin on a Day That Suits You), by the fallback.

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise the price movers in a town like this (travel, a collection, how long and how often) and how the price is reached, from [CV: quote_method] only. | Price |
| town | start_time | How soon can you take on a new dog in [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). How the business reaches it from its base only from the client values. Link one page in this town. | Fit |
| cover | insurance | Are you insured to look after my pet? | The cover figure from [CV: insurance_cover] and what the cover is for. Cover for the animal in the business's care is separate from public liability (Table E): say which only as the client values say. Never what it pays or who it covers. | Trust |
| cover | always | What happens if my pet is unwell while you have them? | Open with what happens: the vet is called, using the vet and emergency details given before the first visit, and the owner is told. Then the reasonable care and skill standard. No promise to pay vet bills, no guarantee, never invent insurance. | Trust |
| process | always | What happens before the first walk or visit in [TOWN]? | From [CV: quote_method] and the confirmed practices only: the meet and greet where site_visit_before_quote is confirmed, and the questions asked first (feeding, toileting and vet instructions, keys and access, doors and gates, how the dog is on the lead and with other dogs). Keys and DBS checks only as the client values confirm them. No timescale unless [CV: response_time] is set. | Process |
| timing | always | Do you walk dogs in [TOWN] all year round? | Year round, as the Table A timing cells have it. Hot weather: walks move to cooler times of day and the tarmac hand test decides (Table E hot weather row). The town's own seasonal rules only from the research (a lead on the heath in nesting season, a beach's dog months), as what usually applies. No dates, no figure, no temperature. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the sources lacked (questions for the client or for Ray)

1. The maximum dogs walked together: no client value carries it (the homepage spec lists it as a type C onboarding question). The briefs name no number. Ray: a key such as max_dogs_per_walk on the Client Values screen?
2. Keys and access: practices.json has no pet care practice (customer_need_not_be_home is landscaper only). Key safes, coded tags, DBS checks, pet first aid, GPS tracking and photo updates are all "only as the client values confirm". Ray: pet care practices to add, or extend customer_need_not_be_home to every trade?
3. The client's own council animal activity licence (number, expiry, star rating) for boarding, day care and cat boarding: no client value. Until there is one the copy says what usually applies and never calls the client licensed.
4. Walk and visit durations: every Table A timing cell says varies, no standard. Client: a length for three typical bookings and a "from" price for each (typical_jobs, price_list).
5. Whether the meet and greet is free, and whether the price is agreed before the first booking (quote_method, price_agreed_before_work).
6. Bank holiday rates and cancellation terms: Table E says they vary. Client: their terms, for price_list.
7. Insurance: Table E says cover for the animal in care is separate from public liability. Client: which they hold, so FAQ 2 says the right one.
8. The cover chain: code reads guarantee, manufacturer_warranty and insurance only; the spec's type C chain (qualification plus method, pet first aid) has no code path. The entry sets ["insurance"]. For Brandon.
9. Rating sites: Table D says Checkatrade is not a pet care register, so ratings are Google and Trustpilot. Ray: any other rating site for this trade?

## Alternate Why title that promises a practice (why_title_practice)

"Local Walks We Know Well" stands only with a practice no tick confirms, so never by default; otherwise the point reads "Our Track Record".

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| How long is a dog walk, and what does it include? | Dog Walker; Solo dog walks; Group dog walks |
| Why does my dog bark or chew when left, and what helps? | Dog Walker; Solo dog walks; Group dog walks; Puppy visits |
| Should my dog walk alone or in a group? | Dog Walker; Solo dog walks; Group dog walks |
| Do you walk dogs in hot weather? | Dog Walker; Solo dog walks; Group dog walks; Secure field walks |
| Dogs left alone through the working day | Dog Walker; Solo dog walks; Group dog walks; Puppy visits; Drop in visits; Dog day care |
| Dogs that struggle around other dogs | Dog Walker; Solo dog walks; Group dog walks; Secure field walks |
| Puppies and older dogs who need something gentler | Puppy visits; Dog Walker; Solo dog walks; Drop in visits |
| Cats and small animals who do better at home | Cat sitting; Small animal care; Drop in visits |
| Solo or in a group | Dog Walker; Solo dog walks; Group dog walks |
| Footpaths through farmland outside town | Dog Walker; Solo dog walks; Group dog walks |
| Parks, commons and the river path | Dog Walker; Solo dog walks; Group dog walks |
| Flats and long commutes | Dog Walker; Solo dog walks; Group dog walks; Puppy visits; Drop in visits |
| Heathland and the open country | Dog Walker; Solo dog walks; Group dog walks |
| Collecting for a field or a group walk | Secure field walks; Group dog walks |
| Do you walk dogs in [TOWN] all year round? | Dog Walker; Solo dog walks; Group dog walks; Secure field walks |

## Idea homes

- **the town's seasonal lead and access rules on its walking ground (nesting heath, lambing fields, a beach's dog months)** (location): home is the 'Do you walk dogs in [TOWN] all year round?' FAQ. Elsewhere: the farmland, parks and heathland cards name the place and why dogs are kept on a lead or walked differently there, but give no season, nesting months, lambing time or beach months.

## Related services

The closest other services for each service page, closest first (`related_services`).

| Service | Related |
|---|---|
| cat boarding | Cat sitting, Small animal care, Drop in visits |
| cat sitting | Cat boarding, Drop in visits, Small animal care |
| dog home boarding | Dog sitting, Dog day care, Pet taxi |
| dog day care | Dog home boarding, Group dog walks, Dog sitting |
| dog sitting | Dog home boarding, Drop in visits, Dog day care |
| solo dog walks | Group dog walks, Secure field walks, Drop in visits |
| group dog walks | Solo dog walks, Secure field walks, Dog day care |
| secure field walks | Solo dog walks, Group dog walks, Dog day care |
| pet taxi | Dog home boarding, Dog day care, Cat boarding |
| wedding dog chaperone | Pet taxi, Dog sitting, Dog day care |
| puppy visits | Drop in visits, Dog sitting, Solo dog walks |
| drop in visits | Cat sitting, Puppy visits, Dog sitting |
| small animal care | Cat sitting, Drop in visits, Cat boarding |
