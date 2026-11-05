# Niche Library Entry: Dog Groomer

Format: Homepage Structure, Layer 2, section 3 (Niche slot entry).
Every slot below is required. A slot left empty stops the run (G-NICHE).
Code reads `niche-library/dog-grooming.json`; this file is the same content for people, kept in the same commit. The model never sees the slot names, only the resolved words.

Business type is **C (pet service)** for every grooming category (Dog Grooming Calibration Pack v1, section 2): the groom is an appointment the owner books again, not a quote. Inside C most cards are **care or routine led** (the coat's needs and what happens when the routine slips: Full groom, Dog bath and blow dry, Nail clipping, Teeth cleaning, Hand stripping, Deshedding, Cat grooming); **Puppy grooming, Mobile dog grooming** and any card about a nervous, elderly or dryer shy dog are **behaviour led** (how the dog copes and the handling principle that helps, never a promise the dog will come to enjoy it). The split is written into the card briefs, not into a type. Pet Sitter is C too, but the library excludes every Pet Sitter row (Pet Care niche), so that tab makes no pages. `[QUOTE_FREE]` on a groomer means the price is given free before booking, never a free groom.

Sources: `calibration-packs/Dog_Grooming_Calibration_Pack_v1.md` (sections 1, 2, 4, 7), `trade-facts/dog-grooming.md` (Tables A to G; not yet verified), `niche-library/dog-grooming.csv`, `fillout/services/dog-grooming.json`.

---

## Trade words

| Slot | Value |
|---|---|
| trade / trade_lower | Dog Grooming / dog grooming |
| trade_person / trade_person_plural | dog groomer / dog groomers |
| homepage_keyword | Dog groomer (4 Nov 2026, Brandon: the homepage keyword is a way of saying the primary GBP category, picked on search volume; the H1 research pattern and the thin runner read it) |
| customer_type | dog owners |
| unit_of_work | grooms |
| emergency_niche | no (the library flags no emergency page) |
| big_ticket | no |
| schema_subtype | LocalBusiness (schema.org has no pet groomer subtype; do not invent one) |

## Words customers use / words to avoid

| Use | Avoid (twice on the page at most) |
|---|---|
| dog, coat, undercoat, knots, mats, nails, paws, ears, a bath, a trim, a clip, brushing, the dryer, the table, puppy, older dog, nervous dog, shedding, hair on everything, muddy walks | pamper, pampering, pooch, fur baby, fur parent, doggy, spa, spa day, luxurious, treat, stylist, sanitary trim, hygiene trim, dental care, dental clean, anal gland expression, prevents skin problems, stops infections, cures itching, breed standard finish, coat maintenance |

The avoid list is the pack's section 7 (pet spa language, teeth cleaning as dental care, anal gland expression promoted, health claims) plus the trade's own jargon.

## Buttons and headings

| Slot | Value |
|---|---|
| primary_action | Book a Groom |
| meta_cta | Book your dog's groom today. |
| process_h2 | Booking a Groom in 3 Simple Steps |
| final_h2 | Book a Groom With a Local [CATEGORY] in [CITY] |
| cta_band_line | Tell us about your dog and its coat and we'll get back to you within [CV: response_time]. |
| cta_band_line_no_response | Tell us about your dog and its coat and we'll get back to you. |
| steps_emergency / final_h2_emergency | not used (no emergency page) |

## Steps (type C: coat check, grooming plan, regular appointments)

Each step has a fixed title and a one line brief the model writes to.

1. **Tell Us About Your Dog**
   Brief: how to get in touch and what is useful to say first: the breed or coat type, the dog's age, how it copes with being handled, what they want from the groom, and a photo of the coat if they have one. No promise of a reply time unless [CV: response_time] is set.
2. **We Check the Coat and Agree the Groom** (only when the `site_visit_before_quote` practice is confirmed, which for a groomer means the coat is seen before the price is given)
   Brief: the look at the coat and the dog before anything is done (the trade facts stages: consultation and coat assessment), and what is agreed with the owner first: the trim, and a short clip where mats sit against the skin, which is agreed separately as recommended practice. Follows [CV: quote_method]; only say the price is written if quote_method says so. A consent form only when the client confirms one. Never restates "free" (FAQ 5 owns it). Never promise how the dog will behave.
   Without the practice (`step_2_no_visit`): **We Agree the Groom and the Price**
   Brief: say what the groom will cover and that the price is agreed before any work starts only when the price_agreed_before_work practice is confirmed. Describe how the price is reached only from [CV: quote_method]; when quote_method is blank, name no method at all (no photos, call, video or visit). Only say the price is written if quote_method says so. A short clip where mats sit against the skin is agreed with the owner first, as recommended practice. Never restates "free" (FAQ 5 owns it).
3. **Regular Appointments to Suit Your Dog**
   Brief: the first appointment goes in the diary on a day that suits the owner. A regular pattern following on only when the maintenance_schedule practice is confirmed or [CV: visit_frequency_options] is set; the trade facts give no single interval for every coat, so never name one otherwise. Never mention the price or changes to the groom (step 2 and Why choose us own them). Never restates the start time (FAQ 4 owns it).

## Proof and fears

| Slot | Value |
|---|---|
| cover_chain | insurance (the cover a groomer carries is for the dogs in its care; no guarantee or manufacturer warranty applies to this trade) |
| fears (in order, one per Why choose us point; the pack's section 1 readers) | 1. the dog being frightened, held down or handled roughly on the table; 2. the coat coming back shorter than expected, or mats dealt with painfully, with no word first; 3. being judged for the state of the coat; 4. not knowing what the groom will cost or how often to book |

## Logo schemes (Trusted & Rated By)

Only shown when Ray has verified the client on the register. Never padded. From the facts pack's Table D: no body licenses or accredits a groomer, and no qualification is legally required, so every tier reads as membership or a qualification achieved, never as approval.

- **Ratings (always first):** Google (needs [CV: review_count] 5+), then Trustpilot or Facebook recommendations.
- **Tier 1, trade bodies and registers:** Pet Industry Federation (PIF); British Dog Groomers' Association (BDGA, through PIF); The Groomers Spotlight (a voluntary register: Ray checks the listing).
- **Tier 2, qualifications:** City & Guilds Level 2 Dog Grooming Assistant (7863-02); City & Guilds Level 3 Dog Grooming (7863-03); iPET Network Level 3 Diploma in Dog Grooming and Salon Management; iPET Network cat grooming awards; International Professional Groomers (IPG) and ICMG; International Certified Master Cat Groomer (ICMCG); Cat Grooming School certificate (Advanced or Master).
- **Tier 3, local credibility:** pet first aid, an insurer with animals in care cover (the figure from [CV: insurance_cover] only), a rescue partner, a vet who refers, local press features, local awards. Ray's call per client. Never the RSPCA, BSAVA, CFSG or the Kennel Club as approvals: the facts pack says none accredits a groomer.

## FAQ slots

Fixed homepage questions and their doubts: Q1 cost = Price; Q6 areas = Fit.

| Slot | Question | Answer brief | Symptom based | Doubt |
|---|---|---|---|---|
| faq_2 | Are you insured to look after my dog? | The cover figure from [CV: insurance_cover] and what the cover is for: the dogs in the business's care, as the policy names it. Never what it pays or who it covers beyond that. Nothing about vehicle cover unless the client values give it. | no | Trust |
| faq_2_fallback | What happens if something goes wrong during a groom? | From [CV: complaints_process] only. Where nothing is on file, say what the owner does: tell us and we look at it, and leave it there. Never invent insurance or a guarantee. | no | Trust |
| faq_3 | Do you guarantee your grooming? | Used only when a guarantee is confirmed in [CV: guarantee_years] or [CV: guarantee_scope]. Start with yes, then the terms. No claim about the coat's regrowth, and none about the dog's behaviour at its next visit. | no | Trust |
| faq_3_none | What if my dog doesn't settle? | Used when nothing in cover_chain is confirmed. Open with what happens: the groom slows down, takes a break or stops rather than forcing the dog, and the owner is called, as the way careful groomers work, drawn from the trade facts rows (no dog left on its own, a groom halted and the dog made safe, the owner phoned). Principles, never this business's practice unless a confirmed practice says so. Then what the owner does: tell us before the appointment how the dog copes. No guarantee of a calm dog, now or at a later visit. Never sedation. | no | Trust |
| faq_4 | Do you have availability for new dogs? | From [CV: start_time] only, as given. No waiting list, no "book early", no season unless the client values say so. | no | Timing |
| faq_5_free | Can I get a price before I book? | From [QUOTE_FREE] and [CV: quote_method]: the price is given free before the booking, by the method on file. Never a free groom. What can change the price on the day (the coat as found) only from the trade facts price rows, said once. | no | Price |
| faq_5_not_free | How do you work out the price for my dog? | From [CV: quote_method] only. What can change the price on the day (the coat as found) only from the trade facts price rows, said once. | no | Price |
| faq_A | How often should my dog be groomed? | The coat decides it, and the trade facts rows give no single interval for every dog: say so. Then the coat types in plain words, each with what happens between grooms (a coat that never stops growing and mats, a double coat that drops its undercoat, a wire coat that holds its dead coat until it is pulled, a short coat that mostly needs a bath and nails). A frequency only from [CV: visit_frequency_options]; otherwise say the pattern is agreed for the dog. | no | Timing |
| faq_B | Why does my dog's coat keep matting? | Use the assigned symptom's meaning and its linked local issue. Three genuinely different causes in plain words: the coat rubbing where it moves (where ear meets head, along the collar line, under the front legs), a coat that gets wet and is not dried through to the skin, and brushing that only reaches the top of the coat. Then what the local walks add (mud, sand, long grass), then the fix: combing out where the mats are loose, and a close clip as the gentler route once they have tightened onto the skin, from the trade facts matted coat row. Never the owner's failure. | **yes** | Process |
| faq_C (fallback) | Should I have my dog shaved for the summer? | From the trade facts double coat row only: routine shaving of a double coat to cool the dog or stop shedding is advised against, because the coat shields the skin from the sun and keeps the dog's temperature steady, and it may grow back differently; taking the loose undercoat out is the usual approach. Put the reason in fresh words of your own: nothing about insulating against heat and cold. Matting or a vet's reason can change the choice. Never a promise about regrowth, never a figure. | no | Process |
| faq_D (fallback) | When can a puppy have its first groom? | From the trade facts puppy rows only: no first groom age and no set wait after vaccinations is laid down, so give none. What a first session is for instead: getting the puppy used to the table, the brush and the dryer in short sessions, with the vaccination status asked about first. Never a figure, never a vet's advice on vaccines. | no | Timing |

No faq_planning: big_ticket is no. Sources for faq_A to faq_D: the pack's section 1 and the questions owners ask (how often, shaving in summer, a puppy's first groom, mats). Replace with real customer questions when Brandon or the client supplies them.

## Materials and methods tick list (onboarding)

The model may only name what the client ticks (`[CV: materials_methods]`). For this trade the list is the products, equipment and handling practices a groomer can tick.
- Shampoos: coat specific shampoo / sensitive skin shampoo / conditioner / deshedding shampoo / flea shampoo (shop bought class only) / cat specific shampoo
- Drying: high velocity dryer / hand held dryer / towel dry only on request / drying cabinet, supervised and timed
- Tools: clippers / scissors / stripping knife / finger stripping / undercoat rake / slicker brush and comb / nail clippers / nail grinder / dog toothbrush and dog toothpaste / ultrasonic toothbrush
- Handling: one dog at a time / no cage drying / muzzle only when needed / breaks for nervous or older dogs / owner can stay for a first groom / written consent form / matted coat permission agreed first
- Mobile: fully fitted van / own water and power on board / wash water taken away
- Other: ear cleaning (outside of the ear only) / cat grooming tools / dog and cat kept apart

## Service terms (validator)

Services the validator looks for in cards and FAQ answers. Each one it finds must match one of the client's GBP services, categories or ticked materials, or it is flagged.

full groom, bath and blow dry, blow dry, hand stripping, hand strip, deshedding, de shedding, undercoat removal, clip off, clip, scissor trim, scissoring, nail clipping, nail trim, nail grinding, teeth cleaning, tooth brushing, ear cleaning, ear plucking, puppy groom, puppy introduction, mobile grooming, cat grooming, dematting, flea treatment, flea bath, tick removal, anal glands, paw trim, face trim, sanitary trim, hygiene trim, breed trim, pet trim, teddy bear trim, lamb clip, kennel cut

## Service words (validator and client block)

GBP service names are shown to the model in the words an owner uses. The first row whose text appears in the GBP name wins; with no match, the GBP name is used in lower case. Cards name 2 or 3 services in these words, never the raw GBP list. A "(never named)" row is a service the library excludes.

Old path only (21 Oct 2026): this list applies when the homepage is written from the uploaded custom values CSVs. A client with a v3 page map names every service by its page title (the services library's UK name), and this list is not used.

| GBP name contains | Say |
|---|---|
| anal gland | (never named) |
| boarding, day care, daycare, dog sitting, cat sitting, pet sitting, dog walking, dog training, self service, other pet | (never named: Pet Care or Dog Training niche, or excluded) |
| mobile cat grooming | cat grooming at your home |
| mobile dog grooming | grooming at your home |
| puppy grooming | a puppy's first grooms |
| cat bathing, cat ear, cat nail, cat grooming | cat grooming |
| hand stripping | hand stripping |
| de-shedding, deshedding | a deshedding treatment |
| de-matting, dematting, breed standard, full service grooming, full groom, grooming and styling | a full groom |
| bathing and blow dry, bath and blow dry, ear cleaning, flea and tick | a bath and blow dry |
| nail trimming, nail clipping | nail clipping |
| tooth brushing, teeth cleaning | teeth cleaning |
| dog grooming | dog grooming |

## General service words (FAQ page matching)

Core services per category (homepage cards). The services a homepage card names for each GBP category, in the words an owner uses, in the order code picks them (after the client's jobs_wanted). JSON slot: core_services.

- Pet Groomer: full grooms, bath and blow dry, nail clipping, teeth cleaning, puppy grooming, hand stripping, deshedding, mobile dog grooming, cat grooming
- Pet Sitter: cat grooming (the only row on that tab the library pages; everything else on it is the Pet Care or Dog Training niche)

Service words for the whole trade rather than one service: dog grooming, grooming, full groom, mobile dog grooming, cat grooming, puppy grooming. An FAQ question about one of these goes to the category page that carries the word, never to a narrow service page that happens to share it. JSON slot: general_service_words.

Problem words: shedding, matting. When an FAQ question names the job as well as the problem ("Does a full groom deal with matting?"), it goes to the job's page (Full groom), not the problem's. JSON slot: problem_service_words.

## Confirmed practices (onboarding)

The copy may only state a working practice the client has ticked in confirmed_practices (niche-library/practices.json, shared by all niches). The briefs in this entry lean on price_agreed_before_work, maintenance_schedule and written_quote; the handling principles (time to settle, breaks, stopping rather than forcing, the dog never left alone, the owner called) are written as what good grooming does, from the trade facts rows, and never as this business's practice unless a practice is confirmed or the client ticks it in the Handling group of the materials list.

## Onboarding questions this niche needs

The cost, "how long" and "how often" FAQs can only say what affects the answer unless the client gives figures. Ask every grooming client for:
- a "from" price for 3 typical grooms (e.g. a small dog full groom, a large double coat deshedding, a bath and blow dry);
- a typical appointment length for the same 3, and how long the dog stays with them;
- the pattern they suggest for each coat type (`visit_frequency_options`), since the trade facts give no interval;
- whether the owner can stay, drop off and collection, and whether a consent or matted coat form is used;
- which services on the intake they do not offer (anal glands, ear plucking, cats).

## Section 5 alternative titles (why_titles_alt)

Type C titles replacing track record and cover when the trust line has used that proof:
1. Track record → **Every Coat Type, Groomed Before**
2. Cover → **Covered While Your Dog Is With Us**

## Category work nouns (category_work_nouns)

The work noun every category page H2 reads in place of the category name, except the H1 and "Our [CAT] Services in [CITY]": pet groomer → dog grooming, pet sitter → pet sitting. The briefs use `[WORK]` and `[WORK_LOWER]` for it.

## Category page blocks by business type (category_page_blocks)

Used by the category page job (CORE (16)): block 4 (what we help with) and block 5 (how grooms are priced) are an H2 and four card titles with a one line brief each; the type also gives the process steps, the FAQ slots and, with `seasonal_trade` on, the one card and one FAQ that swap in. Placeholders: `[CAT]` the page keyword without the town (Pet Groomer, Dog Groomer), `[CAT_LOWER]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (16) apply to every brief: claims only from client values, no figures, no promises, nothing that reads as veterinary advice.

- `seasonal_trade`: yes (the pack's seasonal note: double coats drop their undercoat in spring and autumn, summer brings grass seeds in ears and paws, winter brings mud and road grit between the pads)
- `category_types`: none (every category is the default, C)
- A niche with no section here has its category pages refused: "no category block briefs for dog-grooming".

### Type C (pet service: Pet Groomer)

**Block 4, what we help with.** H2: What Our [WORK] Helps With

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| Knots that have reached the skin | the coat rubbing where it moves and tightening when wet | Tangles where ear meets head, along the collar line and under the front legs, pulling tighter with every wet walk. The one cause this card makes: the coat rubbing where it moves, and tightening when it gets wet and is not dried through. Care led. Say what the fix usually involves in plain words: combing through while the tangles are still loose, and a close clip to start again as the gentler route once they have tightened onto the skin, agreed with the owner first (the trade facts matted coat row). Link the Full groom page where LINKABLE PAGES has one. Never combing out tight mats written up as gentler than clipping, never the owner's failure, never a promise about regrowth. Not shedding: card 2 owns that. |
| Hair on everything | a double coat dropping its undercoat | Loose hair on clothes and furniture, a coat that feels packed, brushing that barely touches it. The one cause this card makes: a double coat dropping its undercoat in heavy spells, as the weather warms in spring and again in autumn (the pack's seasonal note). Care led. Say what gets the undercoat out, from the trade facts deshedding stages: a bath, a dryer and the combs that lift the loosened undercoat clear. Then that shaving the coat off is not the answer and does not stop the shedding (the trade facts double coat row), without lecturing. Link the Deshedding page where LINKABLE PAGES has one. Not matting: card 1 owns that. |
| Dogs who find the salon hard | too much at once for the dog | A dog that shakes from the car park, a dog that hates the dryer, an older dog that is stiff on the table, a puppy that has never been held still. The one cause this card makes: too much at once: a strange room, other dogs, the noise of the dryer, being held. Behaviour led. Say what good handling does in plain words: a pause to let the dog settle, rests part way, calling a halt instead of holding on, no dog left alone, from the trade facts rows as how careful groomers work, never as this business's practice unless a confirmed practice or [CV: materials_methods] says so. Where LINKABLE PAGES has Puppy grooming or Mobile dog grooming, link one as the route that suits such dogs. No guarantee of a calm dog, now or at a later visit. Never sedation. |
| Smelling of dog again within days | a coat not dried through to the skin | A coat that smells again soon after bath day, damp to the touch deep down, flaky or itchy underneath. The one cause this card makes: a thick coat not dried through to the skin, so damp sits at the roots. Care led. Say what washing and drying done well involves from the trade facts bath stages: the rinse, then drying done under supervision until the coat is dry at the skin, not just on top. A smell coming off the ears, the breath or a single patch of skin belongs with a vet rather than another bath: say so plainly, and never name a condition. Link the client's bath service page (its name in LINKABLE PAGES) where there is one. |

**Block 5, how grooms are priced.** H2: How We Price [WORK] in [CITY]

| Card | Brief |
|---|---|
| The size of the dog and the coat | A bigger dog, or more coat to brush, bath, dry and clip, takes longer: the first factor in the trade facts price rows. Say it plainly, coat type as the reason (a thick double coat against a short smooth one), and give no figure. |
| The coat on the day | A maintained coat is a shorter groom than a coat with mats, packed undercoat or dirt worked in, from the trade facts price rows. Say that the coat is looked at before the price is settled, from [CV: quote_method] only, and that a short clip for a matted coat is agreed with the owner first. Never a word that shames the coat. |
| Hand stripping and scissor work | Hand stripping a wiry coat patch by patch, or a long scissored trim, takes longer than a clip: the trade facts price rows for Full groom and Hand stripping. Say why in plain words (every patch worked by hand) and name the service only where the client offers it. No figure. |
| The time your dog needs | A nervous, elderly or first time dog is groomed with breaks and more handling, which takes longer: the trade facts price rows. Say it as the dog's needs, never as a surcharge for a difficult dog. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Tell Us About Your Dog**
   Brief: how to get in touch and what is useful to say first: the breed or coat type, the dog's age, how it copes with being handled, what they want from the groom, a photo of the coat if they have one. No promise of a reply time unless [CV: response_time] is set.
2. **We Check the Coat and Agree the Groom**
   Brief: the look at the coat and the dog before anything is done (the trade facts stages: consultation and coat assessment), and what is agreed with the owner first: the trim, and a short clip where mats sit against the skin, agreed separately as recommended practice. The price agreed before any work only when the price_agreed_before_work practice is confirmed. Follows [CV: quote_method]; only say the price is written if quote_method says so. Never restates "free". Never promise how the dog will behave.
3. **Regular Appointments to Suit Your Dog**
   Brief: the first appointment goes in the diary on a day that suits the owner. A regular pattern following on only when the maintenance_schedule practice is confirmed or [CV: visit_frequency_options] is set; otherwise say the pattern is agreed for the dog and name no interval. Never mention the price or changes to the groom.

**FAQ slots.** Five before the symptom question: cost, one cover question (the first whose condition holds), scope, process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the groom when that practice is confirmed. The cost cards hold the list: never repeat it or point to it (the coat on the day). | Price |
| cover | insurance | Are you insured to look after my dog? | The cover figure from [CV: insurance_cover] and what the cover is for: the dogs in the business's care, as the policy names it. Never what it pays or who it covers beyond that. | Trust |
| cover | always | What if my dog doesn't settle? | Open with what happens: the groom slows down, takes a break or stops rather than forcing the dog, and the owner is called, as the way careful groomers work, drawn from the trade facts rows (no dog left on its own, a groom halted and the dog made safe, the owner phoned). Principles, never this business's practice unless a confirmed practice says so. Then what the owner does: say before the appointment how the dog copes. No guarantee of a calm dog. Never invent insurance or a guarantee. Never sedation. | Trust |
| scope | always | Which dogs and coats do you groom? | The services on the card list said as coats and dogs: the coat that never stops growing, the double coat, the wire coat, the short coat, puppies, older dogs, and cats only where Cat grooming is on the services list. Size or breed limits only from [CV: typical_jobs]. Link one service page. What is not offered only from the services list. | Fit |
| process | always | What happens at my dog's first groom? | From the trade facts stages and the confirmed practices only: the chat about the dog and the look at the coat, what is agreed before anything is done, the groom, the handover and what the owner is told. Drop off or how long the dog stays only from the confirmed practices or [CV: access_handling]; never a duration. Never promise how the dog will behave. | Process |
| timing | always | How often should my dog be groomed? | The coat decides it, and the trade facts give no single interval for every dog: say so, then the coat types in plain words and what happens between grooms for each. A frequency only from [CV: visit_frequency_options]; otherwise say the pattern is agreed for the dog. No dates. | Timing |
| symptom | a symptom tagged with the category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual reason, found in the coat or in the dog, in plain words, what the local walks or housing add, then what the groom does about it. One figure at most. Where the answer edges towards a sore patch, something infected, a lump or discomfort, hand it to the vet: a reason to book one, never a named condition. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **What this season's walks leave in the coat** (mechanism: the season's walks leaving something in the coat): The pack's coat year, for the season the page is written in: undercoat shedding heavily as the weather warms and again as it cools, seeds caught in ears, feathering and toes through the warm months, mud and grit packed into the feet in the cold months. The one cause this card makes: the season's walks leaving something in the coat that brushing at home does not reach. Say what the groom checks and clears for that season from the trade facts stages (the brush out, the rinse, the paw check), and root that cause in the coat itself or in the dog itself, never "a busy time of year". Never a parasite, a tick outbreak or a skin condition. Not matting (card 1) and not shedding as such (card 2). FAQ: Does the time of year change what my dog needs? (Timing): Yes, through the coat: the undercoat coming away as the weather warms and again as it cools, seeds in the warm months, mud and grit in the cold ones, as the pack's seasonal note has it, each with what the groom does about it. The summer shave question from the trade facts double coat row only: routine shaving is advised against and taking the undercoat out is the usual approach. No dates, no promise of a slot.

## Service page blocks by business type (service_page_blocks)

Used by the service page job (CORE (17)): What's Included is an H2; its tick item titles are the service's own Table A stages (6 to 8, in order, from the trade facts) and the role based set below is the fallback when the pack gives fewer than 6 stages (F-ITEMS-GENERIC); block 4 (is this right for your dog) and block 5 (how the service is priced) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the process steps, the FAQ slots (fit, cost, timing, cover, scope; a sixth, the groomer's or the vet's job, only when the service has Table C rule rows) and, with `seasonal_trade` on, the one card and one FAQ that swap in (the FAQ replaces the timing slot). The service's own trade facts rows (`trade-facts/pack.js rowsForService`) are the material every brief points at, so one type C entry serves a full groom, nail clipping and cat grooming alike. Placeholders: `[SERVICE]` the page keyword without the town (Full Groom, Hand Stripping), `[SERVICE_LOWER]`, `[CAT]`, `[WORK]`, `[CITY]` the page's town, `[SYMPTOM]` the assigned symptom. The copy rules of CORE (17) and the shared rules apply to every brief: claims only from client values, no figures, no promises, no standard's number, nothing that reads as veterinary advice.

- A niche with no section here has its service pages refused: "no service block briefs for dog-grooming".
- The block 4 mechanisms differ from the category page briefs' on purpose: the service page may not make a cause its category page already made (MECHANISMS USED).
- Behaviour led pages: on Puppy grooming and Mobile dog grooming card 3 is the page's main angle; on Cat grooming it carries when a cat is better seen by a vet.

### Type C (pet service: every grooming service)

**What's Included.** H2: What's Included in a [SERVICE] Appointment. The items below are the fallback set; a service with 6 or more Table A stages uses the stages as its items.

| Item | Brief |
|---|---|
| A chat about your dog and a look at the coat | The first stage from the trade facts: the consultation and the coat check, how the dog copes, what is agreed before anything is done. A part of the appointment, not a promise about the price. |
| Brushing out and checking for knots | The brush out and detangling stage from the trade facts, where the service has one. Name only what the stages give; never scissors through a mat. |
| The bath and the rinse | The bath stage from the trade facts, where the service has one, with the shampoo named only by its type from the materials cell; a named product only from [CV: materials_methods]. |
| Drying, done under supervision | The drying stage from the trade facts: dried through, the dog watched the whole time. A drying cabinet only from [CV: materials_methods], and never unattended. |
| The main work: the clip, the strip, the comb out or the trim | The central stage from the trade facts for this service, named as the trade names it: the clip and scissor, the dead coat pulled by hand, the released undercoat combed out, nails taken back in small amounts, the teeth brushed on the surfaces the dog allows. |
| Nails, ears and the finishing checks, as agreed | The agreed extras from the trade facts stages: nails, the outside of the ears, the final check of skin and coat. Only what the rows give; never work inside the ear, never anal glands. |
| A word about anything we noticed | The handover from the trade facts: what was done and anything seen on the skin, the nails or the teeth that the owner might want a vet to look at. Observed and reported, never diagnosed. |
| The next appointment, if you want one | Only from [CV: visit_frequency_options] or the maintenance_schedule practice; when neither is set, write that the next appointment is agreed with you and name no interval. |

**Block 4, is this right for your dog.** H2: Is [SERVICE] Right for Your Dog?

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| The coats this suits | the kind of coat setting the work | Which coats and dogs this service is for, from the trade facts materials and methods cell for the service (wiry coats for hand stripping, double coats for deshedding, coats that keep growing for a full groom, smooth coats for a bath and nails; for Cat grooming, cats with long fur, and elderly cats no longer keeping themselves clean). The one cause this card makes: the kind of coat setting the work. Care led. Say which coats it is not for, with one sibling service page linked where LINKABLE PAGES has one. No breed ever written up as a local issue. |
| The signs it's time | the routine slipping between appointments | What the owner notices, from the trade facts signs row for this service, in their words (nails clicking on the floor, knots behind the ears, hair on the sofa, a wiry coat gone soft and pale). The one cause this card makes: the routine slipping between appointments. Care led. Then what it leads to if left, from the skipped row: specific, never alarming, and never implying the reader's dog has it. Never the owner's failure. |
| Puppies, older dogs and nervous dogs | a dog that needs the groom paced to it | How this service is paced for a dog that finds grooming hard: short sessions, rests part way, calling a halt instead of pressing on, no dog left alone, from the trade facts stages and rows (staged handling for a puppy, stop if the dog is distressed). The one cause this card makes: a dog that needs the groom paced to it. Behaviour led. On Puppy grooming and Mobile dog grooming this card is the page's main angle: what a first session covers (the table, the brush, the dryer, without a full trim) or what a visit at home takes away (the drive, the waiting, other dogs). On Cat grooming it says when a vet is the right place for the cat (a coat that needs clipping off; sedation is never a groomer's decision). Principles, never this business's practice unless a confirmed practice says so. No guarantee that the dog settles or ends up liking it. |
| Why a brush or a bath at home isn't the same | home tools not reaching the undercoat, the dead coat or the skin | What home tools do not reach, from the trade facts methods cell and facts rows for this service: a brush that only touches the top coat, a towel that leaves the roots damp, clippers that shorten a wiry coat yet leave the dead hair in place, a shave that does not stop shedding, nails that can only be shortened gradually. The one cause this card makes: home tools not reaching the undercoat, the dead coat or the skin. Care led. Said as the reason the service exists, never as a telling off. Never instructions for cutting mats or nails at home. Not the coat type (card 1) and not a slipped routine (card 2). |

**Block 5, how the service is priced.** H2: How We Price [SERVICE] in [CITY]

| Card | Brief |
|---|---|
| How much coat there is to work through | The size and density factor from the trade facts price row for this service: a larger dog, a denser or longer coat, more undercoat, more wire coat ready to come out. Say it plainly and give no figure. |
| The coat on the day | What the coat is like when the dog arrives, from the trade facts price row: mats, tangles, dirt worked in, a coat left since the last groom. Say the coat is looked at before the price is settled, from [CV: quote_method] only, and that a short clip for a matted coat is agreed with the owner first. Never a word that shames the coat. |
| The time your dog needs | Breaks, slower handling and familiarisation for a nervous, elderly or first time dog, from the trade facts price row. Said as the dog's needs, never as a surcharge for a difficult dog. Not the regular pattern against a one off: the category page owns that. |
| What you add to the appointment | Work added to this appointment, from the sibling service pages and the services list only (nails with a bath, teeth with a full groom, travel for a visit at home where Mobile dog grooming is offered), and that each adds to the appointment. Code adds the price line from [CV: price_list] when there is one. |

**Steps.**

1. **Tell Us About Your Dog**
   Brief: how to get in touch and what is useful to say first: the breed or coat type, the dog's age, how it copes with being handled, what they want from this service, a photo of the coat if they have one. No promise of a reply time unless [CV: response_time] is set.
2. **We Check the Coat and Agree the Groom**
   Brief: the look at the coat and the dog before anything is done (the trade facts stages: consultation and coat assessment), and what is agreed with the owner first. The price agreed before any work only when the price_agreed_before_work practice is confirmed. Follows [CV: quote_method]; only say the price is written if quote_method says so. Never restates "free". Never promise how the dog will behave.
3. **Regular Appointments to Suit Your Dog**
   Brief: the first appointment goes in the diary on a day that suits the owner. A regular pattern following on only when the maintenance_schedule practice is confirmed or [CV: visit_frequency_options] is set; otherwise say the pattern is agreed for the dog and name no interval. Never mention the price or changes to the groom.

**FAQ slots.** Five before the symptom question: fit, cost, timing, one cover question (the first whose condition holds), scope; a sixth, the groomer's or the vet's job, only when the service has Table C rule rows.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| fit | always | Is [SERVICE_LOWER] right for my dog? | The coats and dogs it suits, from the trade facts materials and methods cell for this service, in plain words, and the one case where something else suits better (a sibling service page linked where LINKABLE PAGES has one). For Cat grooming and Teeth cleaning, where the vet, not the groomer, is the answer, from the trade facts rows. Never a breed named as a problem. | Fit |
| cost | always | How much does [SERVICE_LOWER] cost in [CITY]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the groom when that practice is confirmed. The cost cards hold the list: never repeat it or point to it. | Price |
| timing | always | How long does [SERVICE_LOWER] take? | From the trade facts timing row only: the rows for this trade give no standard duration, so say what decides it (the size of the dog, the coat as found, how the dog copes, breaks) and never a figure. Nothing about when an appointment is available unless [CV: start_time] is set. This is the one place the timing is written. | Timing |
| cover | insurance | Are you insured for [SERVICE_LOWER]? | The cover figure from [CV: insurance_cover] and what the cover is for: the dogs in the business's care, as the policy names it. Never what it pays or who it covers beyond that. | Trust |
| cover | always | What if my dog doesn't settle during [SERVICE_LOWER]? | Open with what happens: the work slows down, takes a break or stops rather than forcing the dog, and the owner is called, as the way careful groomers work, drawn from the trade facts rows. Principles, never this business's practice unless a confirmed practice says so. Then what the owner does: say beforehand how the dog copes. No guarantee of a calm dog. Never invent insurance or a guarantee. Never sedation. | Trust |
| scope | always | What does [SERVICE_LOWER] include? | The What's Included items said as a sentence, in other words. What it does not cover only from the services list and the trade facts rows (teeth cleaning is brushing the surfaces, not work under the gum; nails are trimmed, a painful or embedded nail goes to the vet; the outside of the ears only; never anal glands), with one sibling service page or the category page linked. | Fit |
| rules | the service has rule rows | Is [SERVICE_LOWER] something a groomer can do, or is it a vet's job? | From the trade facts rule rows and facts rows for this service only, written as where the groomer's work usually stops and the vet's begins, with "usually" or "in most cases": brushing, not dental treatment; trimming, not a painful or embedded nail; the outside of the ear, not inside it; a cat's clip off as a vet question; sedation never a groomer's. Never a standard's number, an Act's name or legal advice. Never a licence claim: the rows say grooming alone needs none, so say nothing about licences. | Process |
| symptom | a symptom tagged with the service or its category | [SYMPTOM]: why does it happen, and what can be done? | The symptom and its linked local issue, answered as asked: the usual reason, found in the coat or in the dog, in plain words, what the local walks or housing add, then what this service does about it. One figure at most. Where the answer edges towards a sore patch, something infected, a lump or discomfort, hand it to the vet: a reason to book one, never a named condition. | Process |

**Seasonal swap** (card 4 of block 4 and the timing FAQ): **What the season leaves in the coat** (mechanism: the season's walks leaving something in the coat): What this season's walks leave in the coat for this service, from the pack's coat year: undercoat shedding heavily as the weather warms and again as it cools, seeds in ears, feathering and toes through the warm months, mud and grit packed into the feet in the cold months. The one cause this card makes: the season's walks leaving something in the coat that home brushing does not reach. Say what this service checks and clears for that season from the trade facts stages; the cause rooted in the coat itself or the dog itself, never "a busy time of year". Never a parasite, a tick outbreak or a skin condition. Not the coat type (card 1) and not a slipped routine (card 2). FAQ: When in the year does my dog need [SERVICE_LOWER] most, and how long does it take? (Timing): From the pack's coat year and the trade facts timing row only: the season this service matters for the coat and why, then what decides how long the appointment takes (the rows give no standard duration, so never a figure). No dates, no promise of a slot. This is the one place the timing is written.

## Location page blocks by business type (location_page_blocks)

Used by the location page job (CORE (18)): block 4 (what the town's dogs and owners need across the trade) and block 5 (what moves the price in this town) are an H2 and four card titles with a brief each, block 4 cards with their one mechanism; the type also gives the FAQ slots (five, one of them the town question: "How soon can you fit a dog in from [TOWN]?" when `start_time` is set, else "Do you cover [TOWN]?"). The steps are the type's category page steps. The briefs are town wide, not per category: the town profile (its walks, housing and who lives there), the allocated neighbourhoods and the assigned symptoms are the material, and every mechanism differs from the category and service briefs' on purpose (MECHANISMS USED). The pack's section 3 rule holds: every local anchor must change the work, and the copy describes the walks, never the state of anyone's dog. No seasonal swap and no symptom question on a location page. The type is the client's, never a category override. Placeholders: `[WORK]` the primary category's work noun (Dog Grooming), `[WORK_LOWER]`, `[TOWN]` the page's town, `[CITY]` the base town.

- A niche with no section here has its location pages refused: "no location block briefs for dog-grooming".

### Type C (pet service: the client's type is C)

**Block 4, what we help with in the town.** H2: What Our [WORK] Helps With in [TOWN]

| Card | Mechanism (its one cause) | Brief |
|---|---|---|
| What the local walks bring home | the ground the town's dogs are walked on | Coats caked in clay through the winter, salt and sand driven right down into a thick coat after the beach, grit between the pads from the pavements. The one cause this card makes: the ground the town's dogs are walked on; the town profile says which (farmland footpaths and bridleways, a beach, heathland, a river bank, gritted streets). Say plainly what that does to the groom: the rinse and the drying a salty or muddy coat needs, the paws checked. Describes the walks, never how well kept any particular dog is, and never a parasite or an outbreak. Not matting or shedding as such: the town's category and service pages own those. |
| Seeds and grit in paws and ears | what gets caught in feathering, ears and between the toes | A dog that chews its paws after a summer walk, a spaniel shaking its head, grit packed between the pads in winter. The one cause this card makes: what gets caught in feathering, ears and between the toes on the town's walks; the town profile gives the long grass, heath, verges or gritted pavements. Say what the groom looks for and clears (the paw check, the outside of the ears, the feathering trimmed where agreed), from the trade facts stages. A sore ear or a limp is a reason to see a vet: say so, name no condition. Not the mud and salt on the coat: card 1 owns that. |
| Nowhere at home to wash a dog | homes with no room to wash and dry a dog | A flat with no outside tap, a terraced house with a small bathroom, a big dog and a small shower. The one cause this card makes: homes with no room to wash and dry a dog properly, so a damp coat gets left; the town profile gives the housing (flats, terraces, new estates). Say what a salon or a van at the door gives such a home, in plain words, and where LINKABLE PAGES has the town's mobile grooming page or its bath service page, link one. Never that the owner has neglected the dog. Not a coat not dried to the skin: the category page owns that. |
| Dogs that don't travel well to a salon | the journey and the waiting room being harder than the groom | An older dog stiff after the car, a nervous rescue that shakes in a waiting room, a household with three dogs and one car, an owner without transport. The one cause this card makes: the journey and the waiting room being harder on the dog than the groom; the town profile may say who lives here (retired owners, young families with crossbreeds, homes out in the country a long way from any salon). Behaviour led. Say what suits such dogs from the services the client offers only (a visit at home where Mobile dog grooming is on the services list, a quiet appointment otherwise), from confirmed practices; no guarantee of a calm dog. Not too much at once in the salon: the category page owns that. |

**Block 5, what moves the price in the town.** H2: How We Price [WORK] in [TOWN]

| Card | Brief |
|---|---|
| Getting a van to your door | Only where Mobile dog grooming is on the services list: the travel, and where a van can be parked and kept running, from the trade facts price row (travel and access, parking, water and power on board). Terraced streets with no parking, flats with no bay and long rural drives each change it; the town profile says which. Never a rule about parking as the customer's homework. No figure. Where the client has no mobile service, this card is the distance from the salon only from [CV: travel_distance], else how the dog gets there is left to the owner and the card says nothing about travel cost. |
| What the walks round here do to a coat | A coat that comes in wetter, muddier or saltier takes more brushing, rinsing and drying: the trade facts price row for the bath (dense or dirty coat, longer brushing and drying). Say it plainly from the town profile where it gives the walks. No figure, and never that dogs here are dirtier than elsewhere. |
| The first groom after a long gap | A coat left since the last groom, or a dog new to grooming, is a longer first appointment than the ones that follow: the trade facts price rows (matting needing a clip off, familiarisation and breaks). Said without unkindness and never as the owner's failure; no figure; not the service pages' coat on the day card in the same words. |
| Size, coat and temperament | A bigger dog, a thicker or longer coat, and a dog that needs breaks and slower handling each take longer: the first factors in the trade facts price rows. Say it plainly as the dog's needs; no figure. Code adds the price line from [CV: price_list] when there is one. |

**Steps.** The category type C steps (Tell Us About Your Dog; We Check the Coat and Agree the Groom; Regular Appointments to Suit Your Dog), by the fallback.

**FAQ slots.** Five: cost, the town question, one cover question (the first whose condition holds), process, timing.

| Slot | When | Question | Answer brief | Doubt |
|---|---|---|---|---|
| cost | always | How much does [WORK_LOWER] cost in [TOWN]? | Prices only from [CV: price_list]; otherwise how the price is reached, from [CV: quote_method] only, and that the figure is agreed before the groom when that practice is confirmed. One factor at most (travel for a visit at home, only where Mobile dog grooming is offered), never the list again. | Price |
| town | start_time | How soon can you fit a dog in from [TOWN]? | From [CV: start_time] and [CV: response_time] only. The town is in the area covered; nothing about distance unless [CV: travel_distance] is set. | Timing |
| town | always | Do you cover [TOWN]? | Yes: the town and the villages around it (code lists them; name none). Whether that means a visit at home or a drive to the salon only from the services list and the client values. Link one page in this town. | Fit |
| cover | insurance | Are you insured to look after my dog? | The cover figure from [CV: insurance_cover] and what the cover is for: the dogs in the business's care, as the policy names it. Never what it pays or who it covers beyond that. | Trust |
| cover | always | What if my dog doesn't settle? | Open with what happens: the groom slows down, takes a break or stops rather than forcing the dog, and the owner is called, as the way careful groomers work, drawn from the trade facts rows. Principles, never this business's practice unless a confirmed practice says so. No guarantee of a calm dog. Never invent insurance or a guarantee. Never sedation. | Trust |
| process | always | How does booking a groom work in [TOWN]? | From [CV: quote_method], [CV: access_handling] and the confirmed practices only: what the owner tells us, what is agreed before the groom, where the groom happens (the salon, or at home only where Mobile dog grooming is on the services list), drop off and collection only where the practices say. No timescale unless [CV: response_time] is set. Never a duration. | Process |
| timing | always | Do you groom dogs in [TOWN] all year round? | Yes: what each season brings to the coat in plain words from the pack's coat year (the undercoat coming away as the weather warms and cools, seeds in the warm months, mud and grit in the cold ones) and what the groom does about it. No dates, no promise of a slot. A visit at home in bad weather only from the confirmed practices. | Timing |

## do_not_reuse

(empty to start; add any sentence that has gone live on a client site so it is never repeated)

## What the pack and the facts pack lacked (questions for the client or for Ray)

- Appointment lengths and how long a dog stays: the facts pack gives no duration for any service (Table G), so every timing brief says what decides it and never a figure. Ask each client for typical lengths.
- A grooming interval per coat type: the facts pack gives none, so frequency only ever comes from `[CV: visit_frequency_options]`. Ask each client what they suggest per coat.
- Drop off, collection, whether the owner can stay, consent and matted coat forms: not in the practices list, so the briefs allow them only from confirmed practices or the Handling ticks. Ray to decide whether practices.json gets grooming practices.
- Which onboarding value carries a grooming insurer's animals in care cover, and whether vehicle cover is separate for a mobile groomer (the facts pack says a grooming policy may exclude it).
- The business's handling practices (one dog at a time, no cage drying, breaks): written as the principles of good grooming from the facts rows, never as this client's practice, until the client ticks them.
- Cat only groomers: the pack says they may need their own block 4 angle; this entry carries cats inside card 1 and card 3 of the service page and the scope and rules FAQs.
- Whether a client lists anal gland expression or ear plucking as a service: the library excludes the first and the facts pack gives no rule for the second; both need a conversation with the client, not copy.

## Alternate Why title that promises a practice (why_title_practice)

"Every Coat Type, Groomed Before" stands only with a practice no tick confirms, so never by default; otherwise the point reads "Our Track Record".

## Service tags

An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as `needs`.

| Element | Needs |
|---|---|
| When can a puppy have its first groom? | Puppy grooming |
| Hair on everything | Deshedding; Full groom; Dog bath and blow dry |
| Smelling of dog again within days | Dog bath and blow dry; Full groom |
| Hand stripping and scissor work | Hand stripping; Full groom |
| Nowhere at home to wash a dog | Dog bath and blow dry; Full groom |
| Dogs that don't travel well to a salon | Mobile dog grooming |
| Getting a van to your door | Mobile dog grooming |
| What the walks round here do to a coat | Dog bath and blow dry; Full groom |

## Idea homes

- **how the price is reached and agreed before the groom** (homepage): home is the 'How do you work out the price for my dog?' FAQ. Elsewhere: the agree-price step and the price-before-booking FAQ say only that a price is agreed first, without describing the method again.
- **pacing the groom for a nervous, young or older dog** (service): home is the 'Puppies, older dogs and nervous dogs' block 4 card. Elsewhere: the settle FAQ covers only what the owner does and is told, and the time cost card names extra time without describing the handling.
- **the coat looked at and the price settled by the quote method before work** (service): home is the 'How much does [SERVICE_LOWER] cost' FAQ. Elsewhere: the coat on the day card and the check-the-coat step do not restate how the price is reached.
- **the coat looked at and the price settled by the quote method before work** (category): home is the 'How much does [WORK_LOWER] cost' FAQ. Elsewhere: the coat on the day card and the check-the-coat step do not restate how the price is reached.
- **handling a dog that finds grooming hard** (category): home is the 'Dogs who find the salon hard' block 4 card. Elsewhere: the settle FAQ covers only what happens if a groom is stopped and what the owner does, and the time cost card names extra time only.
- **undercoat shedding as the weather warms and cools** (category): home is the 'Does the time of year change what my dog needs?' FAQ. Elsewhere: the 'Hair on everything' card gives the cause without the spring and autumn timing, and the seasonal card covers seeds and mud only.
- **seeds and grit caught in paws, toes and ears** (location): home is the 'Seeds and grit in paws and ears' block 4 card. Elsewhere: the local walks card keeps to mud and salt in the coat, and the all-year FAQ names the seasons without grit between the pads.
- **grooming at home from a van** (location): home is the 'Dogs that don't travel well to a salon' block 4 card. Elsewhere: the other cards and FAQs only say where the groom happens, without making the case for a visit at home again.
