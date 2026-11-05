# Copybot spec: Lead Snap GBP autopost prompts

Nov 5, 2026 · @Brandon

## Purpose and principles

Copybot turns one client intake into a ready-to-paste Lead Snap autopost config: settings, 5–7 prompts, the photo folder for each, and a list of photo gaps. The VA pastes it in and selects photos once. Nobody touches the client again unless they add a service.

- **One-time setup, no refresh.** Prompts are evergreen. Variety comes from angle rotation and area rotation inside each prompt, not from swapping prompts.
- **Service-level prompts.** One prompt per whole service ("boiler repair"), never sub-niches.
- **No photo, no dedicated prompt.** A service without matching photos goes into a shared "other services" prompt that uses brand photos.
- **Self-contained prompts.** Lead Snap's AI may know little about the business, so every prompt carries the business name, service, areas and rules.
- **Strategy:** 2 posts a week, 150–300 words, a photo, a CTA, one keyword and one local reference per post.

## Intake

Copybot needs these fields per client. Most should already exist in Copybot from onboarding; ask only for what's missing.

| Field | Example | Required |
| --- | --- | --- |
| Business name | Hartley Plumbing & Heating | Yes |
| Niche | Plumber | Yes |
| Services, ranked by value | Boiler repair, boiler installation, leak repair, bathroom fitting, drain unblocking | Yes |
| Main town | Romford | Yes |
| Nearby areas (6–10) | Hornchurch, Upminster, Gidea Park, Harold Wood, Collier Row, Dagenham, Brentwood | Yes |
| USPs | Gas Safe, 15 years local, same-day callouts, fixed prices | Yes |
| Standing offer | Free boiler quote | No |
| CTA type + URL | Call Now (no URL) or Book + booking page | Yes |
| Tone | Friendly, plain-spoken | No (default: friendly, professional) |
| Photo inventory per service | From the photo sort folders: Boilers 6, Leaks 4, Bathrooms 0, Drains 2 | Yes |
| Things to avoid | No prices, no 24/7 claims | No |

Photo counts come from the GBP Posts folders the photo-sort skill creates, so the VA doesn't count by hand.

## Build rules

Copybot builds 5–7 prompts from the intake using these rules, in this order.

### Settings

- **Frequency:** custom, twice a week.
- **CTA:** Call Now for emergency and urgent trades (plumber, electrician, roofer, locksmith). Book for appointment-based niches (dog walker, cleaner, groomer, beauty) when a booking URL exists. Otherwise Learn More to the services page.
- **Tone:** from intake, else "friendly and professional".

### Prompt mix

| Prompt | When to include | Photo pool |
| --- | --- | --- |
| Service prompts (up to 4) | One per service with 3+ matching photos, highest-value first | That service's folder |
| Other services | Any services with under 3 photos, and 3+ brand photos exist | Brand: team, van, premises, logo |
| Trust / why us | Always | Brand photos, or best job photos if no brand photos |
| Soft offer | Only if the client confirmed an offer | Best job photos |
| Evergreen tips | Always | All job photos |

Maximum 7 prompts. If a service has under 3 photos and there are no brand photos either, it gets no post at all and goes on the gap list.

Lead Snap splits posts evenly across prompts. With 7 prompts at 2 posts a week, each prompt runs about once a month.

### Rules every prompt must carry

1. Business name, the service, main town and the area list.
2. Pick ONE area from the list per post and mention it naturally once.
3. Pick ONE angle from the prompt's angle list per post, different from the obvious one where possible.
4. 150–300 words, plain UK English, no headings, no hashtags.
5. Use the service keyword naturally once or twice, with the town or area.
6. **Never invent** specific jobs, customers, reviews, prices, timescales, discounts or accreditations. Only use facts given in the prompt.
7. No seasonal or date references, so the post stays accurate any month.
8. No generic filler ("Happy Monday", "We're here for you").
9. End with one sentence leading into the CTA (e.g. "Give us a call" for Call Now, "Book online" for Book).

## Copybot system prompt

Paste this as the instructions for the Lead Snap autopost task. Copybot fills the client's intake in below it.

```text
You write Lead Snap autopost configurations for local service businesses' Google Business Profiles.

Lead Snap rotates a set of prompts at random. Each time it posts, it picks one prompt and one photo from that prompt's photo pool and writes a post. Your job is to write those prompts. They are set once and never refreshed, so they must stay accurate and varied for years.

INPUT: a client intake (business name, niche, ranked services, main town, nearby areas, USPs, optional offer, CTA type and URL, tone, photo counts per service and for brand photos, things to avoid).

STEP 1 - SETTINGS
- Frequency: custom, twice per week.
- CTA: use the intake's CTA. If none: Call Now for urgent trades, Book for appointment-based niches with a booking URL, else Learn More to the services page.
- Tone: from intake, else "friendly and professional".

STEP 2 - CHOOSE THE PROMPTS (max 7)
- Service prompts: one per service with 3 or more matching photos, up to 4, highest-value first. Keep each at whole-service level, never a sub-niche.
- Other services: if any services have fewer than 3 photos AND there are 3+ brand photos, one prompt covering those services together.
- Trust / why us: always.
- Soft offer: only if the intake gives a confirmed offer. Never invent one.
- Evergreen tips: always.
- A service with fewer than 3 photos and no brand photos gets no prompt and goes on the gap list.

STEP 3 - WRITE EACH PROMPT
Each prompt is an instruction to Lead Snap's AI and must be fully self-contained. Include:
- The business name, niche, main town and the full area list.
- What the post is about (the service, or the prompt type).
- The facts it may use: services, USPs, offer. Nothing else.
- An angle list of 4-6 angles and the instruction: "Pick one angle at random for this post."
  Service angles: the problem customers notice; how the job is done; a common question answered; why doing it properly matters; what to expect when booking; serving a specific local area.
  Trust angles: experience and how long local; accreditations and guarantees from the USPs; how we work with customers; why choose a local business.
  Tips angles: 4-6 practical, year-round tips specific to this niche, written by you as one tip per post.
  Offer angles: what the offer includes; who it suits; how to claim it.
  Other services angles: one service from the list per post, chosen at random, using the service angles above.
- These rules, word for word:
  "Pick ONE area from the list and mention it naturally once. Write 150-300 words in plain UK English, no headings, no hashtags, no emoji. Use the service name with the town or area naturally once or twice. Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here. Do not mention seasons, weather, holidays or dates. No generic filler. End with one sentence that leads into the button: [CTA sentence]."

STEP 4 - OUTPUT
Return the config sheet in the format below, then the gap list. Do not add commentary.

Niche awareness: write angles and tips that fit what this niche actually does and what its customers worry about. A dog walker's customers care about trust, reliability and their dog's happiness; a plumber's about speed, mess and cost; a roofer's about damage, safety and guarantees.
```

## Output format

The config sheet follows the order of Lead Snap's autopost screen, so the VA works top to bottom.

```text
LEAD SNAP AUTOPOST CONFIG - [Business name]

SETTINGS
Frequency: Custom - twice per week
Call to action: [type] [URL or "uses GBP phone number"]

PROMPT 1 - [label]
Tone: [tone]
Images: Choose specific images from GBP or upload -> select from folder: [GBP Posts / folder]
Prompt:
[full prompt text]

PROMPT 2 - ...

PHOTO GAPS
- [Service]: [n] photos. Ask the client for 3-4 photos of [what to shoot].

VA CHECKLIST
[ ] Settings set
[ ] All prompts pasted
[ ] Photos selected for every prompt (none mixed between services)
[ ] Saved and started; first post checked on All Posts page
```

The last checklist item matters: Lead Snap creates the first post straight away on save, so the VA can read one real output before leaving it running.

## Worked example: plumber

Using the intake example above, plus 5 brand photos. The result is 6 prompts and one photo gap.

| # | Prompt | Photo folder | Why |
| --- | --- | --- | --- |
| 1 | Boiler repair and installation | GBP Posts / Boilers (6) | Highest value, enough photos |
| 2 | Leak repair | GBP Posts / Leaks (4) | Enough photos |
| 3 | Other services: drain unblocking, bathroom fitting | GBP Posts / Brand (5) | Under 3 photos each |
| 4 | Trust / why us | GBP Posts / Brand (5) | Always |
| 5 | Free boiler quote | GBP Posts / Boilers (6) | Offer confirmed |
| 6 | Evergreen tips | All job photos (12) | Always |

**Settings:** Custom, twice a week. Call Now (uses GBP phone number). Tone: friendly, plain-spoken.

**Photo gaps:** Bathroom fitting has 0 photos and drain unblocking has 2. Ask the client for 3–4 finished bathrooms and 3–4 drain jobs; each then gets its own prompt.

### Prompt 1 in full

```text
Write a Google Business Profile post for Hartley Plumbing & Heating, a plumber based in Romford, about boiler repair and boiler installation.

Facts you may use: Gas Safe registered, 15 years working locally, same-day callouts, fixed prices agreed before work starts. Do not use any other facts.

Areas: Romford, Hornchurch, Upminster, Gidea Park, Harold Wood, Collier Row, Dagenham, Brentwood. Pick ONE area and mention it naturally once.

Pick one angle at random for this post:
- Signs a boiler needs repair (no hot water, pressure dropping, strange noises, pilot going out)
- What happens on a boiler repair visit, from diagnosis to fix
- Repair or replace: how to tell when a new boiler makes more sense
- Why a Gas Safe engineer matters for any boiler work
- What a new boiler installation involves and how long it disrupts the home
- Serving homes in the chosen area

Write 150-300 words in plain UK English, no headings, no hashtags, no emoji. Use "boiler repair" or "boiler installation" with the town or area naturally once or twice. Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here. Do not mention seasons, weather, holidays or dates. No generic filler. Tone: friendly, plain-spoken. End with one sentence that leads into the button: invite them to give us a call.
```

### Prompt 6 in full

```text
Write a Google Business Profile post for Hartley Plumbing & Heating, a plumber based in Romford, giving homeowners one practical plumbing tip.

Facts you may use: Gas Safe registered, 15 years working locally, same-day callouts, fixed prices agreed before work starts. Do not use any other facts.

Areas: Romford, Hornchurch, Upminster, Gidea Park, Harold Wood, Collier Row, Dagenham, Brentwood. Pick ONE area and mention it naturally once.

Pick one tip at random for this post:
- How to find and turn off your stopcock, and why to check it before you need it
- How to repressurise a combi boiler and when to call an engineer instead
- Early signs of a hidden leak: damp patches, a meter that keeps turning, rising bills
- What not to put down kitchen sinks and toilets to avoid blocked drains
- How to bleed a radiator and what cold spots mean
- Why a dripping tap or running toilet is worth fixing early

Explain the tip clearly, then say when it's time to call a plumber. Write 150-300 words in plain UK English, no headings, no hashtags, no emoji. Mention "plumber" with the town or area naturally once. Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here. Do not mention seasons, weather, holidays or dates. No generic filler. Tone: friendly, plain-spoken. End with one sentence that leads into the button: invite them to give us a call.
```

## One-time tests and open questions

Run these once on a single client before rolling out to all 100. None of them repeat per client.

- [ ] **Does Lead Snap's AI follow long prompts?** Check the first 3–4 posts: right length, one area, no invented jobs or prices. If it ignores rules, shorten the prompts and move the rules to the top.
- [ ] **Is there a prompt character limit?** If the full prompts get cut off, trim the angle lists to 4.
- [ ] **Can autopost create Offer posts (yellow badge)?** If not, the soft-offer prompt stays as a standard post. Decide whether any clients get a manual monthly Offer post.
- [ ] **Does Lead Snap's AI know the date?** If yes, a seasonal tips prompt becomes possible later. Until tested, keep everything evergreen.
- [ ] **Is the CTA one per schedule?** Confirm in the app. If it's per prompt, the offer prompt could use its own CTA.
- [ ] **Brand photos:** confirm the photo-sort skill puts team, van and logo shots in their own folder, so the "other services" and trust prompts have a pool.
