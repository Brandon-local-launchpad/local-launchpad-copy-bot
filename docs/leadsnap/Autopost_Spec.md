# Copybot spec: Lead Snap GBP autopost prompts

Nov 5, 2026 · @Brandon

## Purpose and principles

Copybot turns one client intake into a ready-to-paste Lead Snap autopost config: settings, up to 20 prompts, the photo folder for each, and a list of photo gaps. The VA pastes it in and selects each folder's photos once. Nobody touches the client again unless they add a service.

- **One-time setup, no refresh.** Prompts are evergreen. Each prompt has ONE fixed angle, and variety comes from having more prompts: one prompt gives nearly the same post every time, whatever its wording says (tested 6 Nov 2026).
- **Service-level prompts.** One prompt per whole service ("boiler repair"), never sub-niches.
- **No photo, no dedicated prompt.** A service without matching photos goes into a shared "other services" prompt that uses brand photos.
- **Self-contained prompts.** Lead Snap's AI may know little about the business, so every prompt carries the business name, service, county and rules.
- **Strategy:** 2 posts a week, 150–250 words, a photo, a CTA, one keyword and one local reference per post.

## Intake

Copybot needs these fields per client. Most should already exist in Copybot from onboarding; ask only for what's missing.

| Field | Example | Required |
| --- | --- | --- |
| Business name | Hartley Plumbing & Heating | Yes |
| Niche | Plumber | Yes |
| Services, ranked by value | Boiler repair, boiler installation, leak repair, bathroom fitting, drain unblocking | Yes |
| County | Essex (typed on the Record tab, else worked out from the approved towns) | Yes |
| USPs | Gas Safe, 15 years local, same-day callouts, fixed prices | Yes |
| Standing offer | Free boiler quote | No |
| CTA type + URL | Call Now (no URL) or Book + booking page | Yes |
| Tone | Friendly, plain-spoken | No (default: friendly, professional) |
| Photo inventory per service | From the photo sort folders: Boilers 6, Leaks 4, Bathrooms 0, Drains 2 | Yes |
| Things to avoid | No prices, no 24/7 claims | No |

Photo counts come from the GBP Photos – Posts folders the photo-sort skill creates, so the VA doesn't count by hand.

## Build rules

Copybot builds up to 20 prompts from the intake using these rules, in this order.

### Settings

- **Frequency:** custom, twice a week.
- **CTA:** Call Now for emergency and urgent trades (plumber, electrician, roofer, locksmith). Book for appointment-based niches (dog walker, cleaner, groomer, beauty) when a booking URL exists. Otherwise Learn More to the services page.
- **Tone:** from intake, else "friendly and professional".

### Prompt mix

Each prompt has ONE fixed angle. No angle lists.

| Prompt | How many | When to include | Photo pool |
| --- | --- | --- | --- |
| Service prompts | Up to 3 angles per service, more if the client has few services | Services with 3+ matching photos, highest-value first | That service's folder |
| Other services | Up to 2, one service each | Services under 3 photos, or with no slot, and 3+ brand photos exist | Brand: team, van, premises, logo |
| Trust / why us | Up to 2 | Always | Brand photos, or best job photos if no brand photos |
| Soft offer | 1 | Only if the client confirmed an offer | Best job photos |
| Evergreen tips | Up to 3, one tip each | Always | All job photos |

Maximum 20 prompts, around Lead Snap's limit. If a client has fewer services, the 20 fill with more angles per service rather than running short. Where a label groups several services, each of its prompts covers a different service from the group where possible. A service with under 3 photos and no brand photos gets no post and goes on the gap list.

Under 4 distinct photo folders, the tab warns: "Too few prompts. Don't start autopost until the client sends more photos." and lists the photos that would unlock more.

Copybot writes the fixed text of every prompt itself, word for word (the name, facts, county and rules), and keeps only the one angle sentence from the model's reply, so a required sentence cannot go missing.

Prompts sharing a folder should not open alike. Copybot writes one test post per prompt when it generates, and gives each prompt a "Don't start with" line listing the opening phrases of the other prompts in its folder.

Under 4 confirmed USPs, the tab warns: "Few USPs. Posts will repeat the same facts; confirm more with the client."

Lead Snap splits posts evenly across prompts. With 20 prompts at 2 posts a week, each prompt runs about once every 10 weeks.

### Rules every prompt must carry

1. Business name, the service and the county. "Use the business name once, written exactly like this: [name]."
2. The one service the prompt covers. No list of services in the post.
3. The county, never a town (Brandon, 12 Nov 2026; this replaced the 6 Nov town rotation): "If you name a place, name [county] only. Never name a town, city or village." The offer prompt: "Name [county] once, as the area the offer covers. Never name a town, city or village." A post that names one of the client's towns fails its check, and so does an offer post that does not name the county.
4. Facts: no more than two, chosen to fit the angle.
5. One fixed angle: "Build the whole post around this angle:". There is no "serving a local area" angle.
6. 150–250 words, plain UK English, no headings, no hashtags. Don't start with "If". Aim for under 1,500 characters per prompt.
7. Use the service name naturally once or twice.
8. **Never invent** specific jobs, customers, reviews, prices, timescales, discounts or accreditations. Only use facts given in the prompt.
9. Do not describe customers, what they say, how many there are or how often you work for them.
9a. Do not mention warranties, guarantees or accreditations unless they are in the facts.
9b. Do not give measurements, sizes or figures unless they are in the facts.
10. No seasonal, date or time references ("today", "this week", "right now", "at the moment"), so the post stays accurate any month.
11. No generic filler ("Happy Monday", "We're here for you").
12. End with one sentence leading into the CTA (e.g. "Give us a call" for Call Now, "Book online" for Book).

## Copybot system prompt

Paste this as the instructions for the Lead Snap autopost task. Copybot fills the client's intake in below it.

```text
You write Lead Snap autopost configurations for local service businesses' Google Business Profiles.

Lead Snap rotates a set of prompts at random. Each time it posts, it picks one prompt and one photo from that prompt's photo pool and writes a post. Your job is to write those prompts. They are set once and never refreshed, so they must stay accurate and varied for years.

INPUT: a client intake (business name, niche, ranked services, county, USPs, optional offer, CTA type and URL, tone, photo counts per service and for brand photos, things to avoid).

STEP 1 - SETTINGS
- Frequency: custom, twice per week.
- CTA: use the intake's CTA. If none: Call Now for urgent trades, Book for appointment-based niches with a booking URL, else Learn More to the services page.
- Tone: from intake, else "friendly and professional".

STEP 2 - CHOOSE THE PROMPTS (max 20)
Each prompt has ONE fixed angle. No angle lists. Variety comes from having more prompts. A post names the county or no place at all, never a town: an offer is for everyone the business covers, and no one knows which town a photo was taken in.
- Service prompts: up to 3 angles per service, for services with 3 or more matching photos, highest-value first. If the client has few services, use more angles per service to fill the 20. Keep each at whole-service level, never a sub-niche. Where a label groups several services, give each prompt a different service from the group where possible.
- Other services: up to 2, one service each, for services with fewer than 3 photos when there are 3+ brand photos.
- Trust / why us: up to 2.
- Soft offer: one, only if the intake gives a confirmed offer. Never invent one.
- Evergreen tips: up to 3, one tip each.
- A service with fewer than 3 photos and no brand photos gets no prompt and goes on the gap list.

STEP 3 - WRITE EACH PROMPT
Each prompt is an instruction to Lead Snap's AI and must be fully self-contained. Aim for under 1,500 characters per prompt. Include:
- The business name, the niche and the county.

- What the post is about: the one service, or the prompt type. Never list other services.
- The facts it may use: the USPs, plus the offer on the offer prompt. Nothing else. Introduce them as: "Facts you may use (no more than two, chosen to fit the angle):"
- The one angle, written to fit this niche, after the instruction: "Build the whole post around this angle:"
  Service angles: the problem customers notice; how the job is done; one practical question answered directly, without saying who asks it or how often ("Open with the answer or the question itself. Never say how often it is asked or who asks it."); why doing it properly matters; what to expect when booking; what a good finished job looks like; the mistakes to avoid; how to choose who does the work.
  Trust angles: experience and how long local; accreditations and guarantees from the USPs; how we work with customers; why choose a local business.
  Tips: one practical, year-round tip specific to this niche, a different one on each prompt, after the instruction: "Build the whole post around this tip:"
  Offer angle: what the offer includes, who it suits and how to claim it. The offer prompt says instead of the place rule: "Name [county] once, as the area the offer covers. Never name a town, city or village."
- These rules, word for word:
  "If you name a place, name [county] only. Never name a town, city or village. Write 150-250 words in plain UK English, no headings, no hashtags, no emoji. Don't start with "If". Use the business name once, written exactly like this: [name]. Use the service name naturally once or twice. Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here. Do not describe customers, what they say, how many there are or how often you work for them. Do not mention warranties, guarantees or accreditations unless they are in the facts. Do not give measurements, sizes or figures unless they are in the facts. Do not mention seasons, weather, holidays, dates or time words such as "today", "this week", "right now" or "at the moment". No generic filler. End with one sentence that leads into the button: [CTA sentence]."

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
Images: Choose specific images from GBP or upload -> select from folder: [GBP Photos – Posts / folder]
Prompt:
[full prompt text]

PROMPT 2 - ...

PHOTO GAPS
- [Service]: [n] photos. Ask the client for 3-4 photos of [what to shoot].

VA CHECKLIST
[ ] Settings set
[ ] All prompts pasted
[ ] Each folder's photos selected once and reused for its prompts (none mixed between services)
[ ] Saved and started; first post checked on All Posts page
```

The last checklist item matters: Lead Snap creates the first post straight away on save, so the VA can read one real output before leaving it running.

## Worked example: plumber

Using the intake example above, plus 5 brand photos. The result is 20 prompts across 4 folders, and one photo gap.

| Prompts | Photo folder | Why |
| --- | --- | --- |
| 6 Boilers, each one angle, alternating boiler repair and boiler installation | GBP Photos – Posts / Boilers (6) | Highest value, enough photos |
| 1 Free boiler quote | GBP Photos – Posts / Boilers (6) | Offer confirmed |
| 6 Leak repair, each one angle | GBP Photos – Posts / Leak repair (4) | Enough photos |
| 2 Other services: bathroom fitting, drain unblocking | GBP Photos – Posts / Brand (5) | Under 3 photos each |
| 2 Trust / why us | GBP Photos – Posts / Brand (5) | Always |
| 3 Evergreen tips | All job photos (12) | Always |

**Settings:** Custom, twice a week. Call Now (uses GBP phone number). Tone: friendly, plain-spoken.

**Photo gaps:** Bathroom fitting has 0 photos and drain unblocking has 2. Ask the client for 3–4 finished bathrooms and 3–4 drain jobs; each then gets prompts of its own.

### One service prompt in full

```text
Write a Google Business Profile post for Hartley Plumbing & Heating, a plumber, about boiler repair.

Facts you may use (no more than two, chosen to fit the angle): Gas Safe registered, 15 years working locally, same-day callouts, fixed prices agreed before work starts. Do not use any other facts.

If you name a place, name Essex only. Never name a town, city or village.

Build the whole post around this angle: the signs customers notice that a boiler needs repair, such as no hot water, dropping pressure or strange noises.

Write 150-250 words in plain UK English, no headings, no hashtags, no emoji. Don't start with "If". Use the business name once, written exactly like this: Hartley Plumbing & Heating. Use "boiler repair" naturally once or twice. Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here. Do not describe customers, what they say, how many there are or how often you work for them. Do not mention warranties, guarantees or accreditations unless they are in the facts. Do not give measurements, sizes or figures unless they are in the facts. Do not mention seasons, weather, holidays, dates or time words such as "today", "this week", "right now" or "at the moment". No generic filler. Tone: friendly, plain-spoken. End with one sentence that leads into the button: invite them to give us a call.
```

### One tip prompt in full

```text
Write a Google Business Profile post for Hartley Plumbing & Heating, a plumber, giving homeowners one practical plumbing tip.

Facts you may use (no more than two, chosen to fit the angle): Gas Safe registered, 15 years working locally, same-day callouts, fixed prices agreed before work starts. Do not use any other facts.

If you name a place, name Essex only. Never name a town, city or village.

Build the whole post around this tip: how to find and turn off your stopcock, and why to check it before you need it.

Explain the tip clearly, then say when it's time to call a plumber. Write 150-250 words in plain UK English, no headings, no hashtags, no emoji. Don't start with "If". Use the business name once, written exactly like this: Hartley Plumbing & Heating. Use "plumber" naturally once or twice. Never invent specific jobs, customers, reviews, prices, timescales, discounts or accreditations; use only the facts given here. Do not describe customers, what they say, how many there are or how often you work for them. Do not mention warranties, guarantees or accreditations unless they are in the facts. Do not give measurements, sizes or figures unless they are in the facts. Do not mention seasons, weather, holidays, dates or time words such as "today", "this week", "right now" or "at the moment". No generic filler. Tone: friendly, plain-spoken. End with one sentence that leads into the button: invite them to give us a call.
```

## One-time tests and open questions

Run these once on a single client before rolling out to all 100. None of them repeat per client.

- [ ] **Does Lead Snap's AI follow long prompts?** Check the first 3–4 posts: right length, no town named, no invented jobs or prices. If it ignores rules, shorten the prompts and move the rules to the top.
- [ ] **Is there a prompt character limit?** If the full prompts get cut off, trim the angle lists to 4.
- [ ] **Can autopost create Offer posts (yellow badge)?** If not, the soft-offer prompt stays as a standard post. Decide whether any clients get a manual monthly Offer post.
- [ ] **Does Lead Snap's AI know the date?** If yes, a seasonal tips prompt becomes possible later. Until tested, keep everything evergreen.
- [ ] **Is the CTA one per schedule?** Confirm in the app. If it's per prompt, the offer prompt could use its own CTA.
- [ ] **Brand photos:** confirm the photo-sort skill puts team, van and logo shots in their own folder, so the "other services" and trust prompts have a pool.
