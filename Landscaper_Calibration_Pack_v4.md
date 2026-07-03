# Landscaper / Gardener Calibration Pack (UK) — All Page Types

Use this alongside the relevant CORE copywriting prompt. This pack covers all four page types: homepage, category page, service page, and location page, plus the location category page variant.

This pack contains two things: the rules that define what good copy looks like for this trade, and worked examples drawn from real bot output that show what those rules look like in practice.

The examples use `{{custom_values.X}}` placeholders exactly as the bot outputs them. The local detail in the examples — soil types, weed species, named streets, seasonal patterns — is drawn from geo research for that specific client. When writing for a different client in a different area, the same format and depth applies, but the local detail comes from the geo research for that client's area.

Do not copy the examples. Use them to understand the required length, structure, and level of specificity, then write to the same standard for the actual client.

---

## TRADE FRAMING (all page types)

Derive the trade framing from the client's onboarding form. Use the services they have confirmed, not a generic landscaping description.

Format: `"a UK landscaping and gardening business carrying out [CLIENT'S CONFIRMED SERVICES]"`

Examples of correct trade framing by specialism:
- General landscaper: `"a UK landscaping and gardening business carrying out garden maintenance, lawn care, hedge trimming, turfing, fencing, paving, and tree surgery"`
- Garden maintenance operator: `"a UK gardening business carrying out lawn mowing, hedge trimming, border maintenance, weed control, and seasonal garden clearance"`
- Landscape designer: `"a UK landscape design company carrying out bespoke garden design, hard landscaping, planting schemes, and drainage installation"`
- Hard landscaping specialist: `"a UK landscaping company specialising in patio and driveway installation, retaining walls, fencing, and garden drainage"`

Never use a trade framing line that includes services the client has not confirmed on their onboarding form.

---

## RULES — what every piece of copy in this trade must achieve

**Rule 1: Name the specific service, not the category**
Do not write "garden maintenance." Write "fortnightly lawn mowing, edging, and border weeding" or "crown reduction and deadwooding on mature garden trees" or "close board fence installation on pressure-treated posts set in concrete." The specific service is what the customer searched for.

**Rule 2: Connect every service to a local condition**
Every service card, local knowledge paragraph, and FAQ must contain a local soil type, weed species, property type, or growing condition from the geo research. Copy that contains no local detail is a failure regardless of how well it is written in other respects.

**Rule 3: Use accurate horticultural and trade terminology**
Named weed species, grass varieties, soil conditions, timing rationale, and material specifications must be accurate and relevant to the UK and to the specific region. Do not name species that do not grow in the area. Do not invent soil conditions not supported by the geo research.

**Rule 4: Explain what goes wrong when the service is skipped or done poorly**
Every service card should include one consequence of inaction or poor execution. This is not a scare tactic — it is the specific horticultural or structural reason why the service matters.

**Rule 5: No em dashes, no en dashes, no hyphenated compounds**
Write "salt laden" not "salt-laden." Write "free draining" not "free-draining." Write "in house" not "in-house." Write "low lying" not "low-lying." No exceptions. GHL will reintroduce them — the VA checks for this before publishing.

**Rule 6: Use only confirmed services and trust signals**
Never write about services the client has not confirmed. Never claim accreditations, insurance levels, years of trading, or job counts not confirmed on the onboarding form.

**Rule 7: Omit unconfirmed facts entirely — never flag them in copy**
If a fact is not confirmed in the onboarding form (a price, a guarantee duration, warranty terms, insurance details, visit frequency options), the copy does not mention it at all. Write the answer around what IS confirmed and stop there. Never place [CLIENT TO CONFIRM] or any bracketed placeholder inside copy. If it is useful to flag missing information, do it as a separate [NOTE FOR BRANDON: ...] line below the copy block, formatted like the VA notes. The copy itself must always be complete and publishable exactly as written.

**Rule 8: Never assert operational processes as fact unless the onboarding form confirms them**
Visit frequencies, whether green waste removal is included, whether the first visit is free, crew sizes, and equipment specifics vary by company. Do not present them as this company's fixed process unless the client has confirmed them. Describe the principle instead; the specifics are only true if confirmed.

---

## HOMEPAGE — WHAT GOOD LOOKS LIKE

### Category block example 1

```
SERVICES {{custom_values.category_1}}:
H2: {{custom_values.category_1}}

{{custom_values.company_name}} covers everything from regular lawn mowing and edging to hedge trimming, weed control, mulching and seasonal border clearance for homes across {{custom_values.biz_area_1}}. Sandy soils near the seafront dry out quickly in summer and need regular mulching to hold moisture at root level. Properties a little further inland on heavier loamy ground build up weed pressure fast. Bindweed and dock move into disturbed beds quickly in these conditions. Staying on top of them needs consistent, regular visits rather than one off clearances.

Find out everything that is covered in our {{custom_values.category_1}} service in {{custom_values.biz_area_1}}.

IMAGE: Photo of garden maintenance work in progress. Lawn mowing, hedge trimming, or border clearance preferred.
```

**Why this works:**
- Opens with a list of specific sub-services rather than a generic description of the category
- Names two distinct local soil types and the specific consequence each creates — not just "local conditions vary"
- Names actual weed species (bindweed, dock) that are real problems in this area
- Explains why regular visits matter more than one-off clearances — a consequence of inaction
- Editorial link names the category and the primary location

### Category block example 2

```
SERVICES {{custom_values.category_5}}:
H2: {{custom_values.category_5}}

{{custom_values.company_name}} carries out tree pruning, removal, stump grinding, stump removal, planting, transplanting, cabling and bracing across {{custom_values.biz_area_1}} and the Lincolnshire coast. The team are fully qualified tree surgeons. Trees in {{custom_values.biz_area_1}} face repeated wind stress from North Sea gales, which causes crown dieback, leaning trunks and branch failure in exposed gardens and caravan parks. Storm damage callouts after winter gales are common along the seafront and open stretches of the coast. Planned reduction and crown thinning before the winter months reduces risk and the likelihood of emergency work.

Find out everything covered in our {{custom_values.category_5}} service in {{custom_values.biz_area_1}}.

IMAGE: Photo of tree surgery, stump removal, or tree work in progress.
```

**Why this works:**
- Lists specific sub-services within the category at the start
- States the trust signal (fully qualified tree surgeons) as a fact, not a claim
- Names the specific local wind stress condition and its three consequences: crown dieback, leaning trunks, branch failure
- Distinguishes between reactive callouts and planned preventative work — two distinct demand types
- The consequence of poor timing (emergency work) is the logical conclusion of the local condition described

---

## CATEGORY PAGE — WHAT GOOD LOOKS LIKE

### Service card example 1

```
SERVICE CARD — {{custom_values.service_83}}:

{{custom_values.service_83}} is one of the most practical choices for {{custom_values.biz_area_1}} gardens. Timber boards split, fade and require regular retreatment under the salt air and UV exposure that comes with a coastal Lincolnshire location. Composite boards do not absorb moisture the same way, resist fading and hold their surface finish year on year without annual oiling or staining. {{custom_values.company_name}} supplies and installs composite decking boards, sets the frame level on sandy ground, and handles all edging and finishing work. Find out everything covered in our {{custom_values.service_83}} service in {{custom_values.biz_area_1}}.

[VA — HYPERLINK THE TEXT ABOVE. Link this to the service page for {{custom_values.service_83}} in {{custom_values.biz_area_1}}. Delete this note before publishing.]
```

**Why this works:**
- Opens with a local condition (salt air and UV exposure specific to coastal Lincolnshire) that drives the material choice
- Explains the failure mode of the alternative material (timber splitting, fading, requiring retreatment) before stating why composite is better
- Names what the company actually does in practical terms: supplies boards, sets the frame on sandy ground, handles edging
- The sandy ground reference is a local condition — different for a different client area
- 95 words — correct length for a service card

### Service card example 2

```
SERVICE CARD — {{custom_values.service_93}}:

Boundary fencing in {{custom_values.biz_area_1}} fails faster than in most UK locations. Coastal wind puts direct pressure on panels, posts loosen in sandy ground after repeated wet and dry cycles, and salt in the air degrades timber finish year on year. {{custom_values.company_name}} carries out {{custom_values.service_93}} from post setting to panel fitting, using pressure treated timber and concrete spurs where ground conditions require them to keep posts solid for the long term. Close board, featherboard and panel systems are all within scope. Find out how our {{custom_values.service_93}} approach works in {{custom_values.biz_area_1}}.

[VA — HYPERLINK THE TEXT ABOVE. Link this to the service page for {{custom_values.service_93}} in {{custom_values.biz_area_1}}. Delete this note before publishing.]
```

**Why this works:**
- Three distinct failure causes named immediately: wind pressure, sandy ground, salt degradation
- Material specifications stated: pressure treated timber, concrete spurs — not generic "quality materials"
- Names specific fence types within scope: close board, featherboard, panel
- The "long term" framing connects the installation method to the consequence of getting it wrong
- 100 words — correct length for a service card

### Service card example 3 (reactive/repair service)

```
SERVICE CARD — {{custom_values.service_91}}:

Deck faults in {{custom_values.biz_area_1}} are often weather driven. Boards split along the grain after cycles of coastal drying and wet weather. Joists rot at the bearing points where moisture sits. Posts shift on ground that has moved through a wet winter. {{custom_values.company_name}} carries out {{custom_values.service_91}} covering boards, joists, bearers and posts, identifying the root cause before replacing damaged sections so the same fault does not reappear. Individual board replacements, joist sistering and post resetting are all part of the repair scope. Find out everything covered in our {{custom_values.service_91}} service in {{custom_values.biz_area_1}}.

[VA — HYPERLINK THE TEXT ABOVE. Link this to the service page for {{custom_values.service_91}} in {{custom_values.biz_area_1}}. Delete this note before publishing.]
```

**Why this works:**
- Opens by naming three specific weather-driven fault types, each with a different mechanism
- States the correct diagnostic approach: identify root cause before replacing sections
- Names specific repair types the customer may not know to ask for: joist sistering, post resetting
- The "so the same fault does not reappear" line addresses the customer's real fear with repair services
- 103 words — correct length

### Seasonal tasks example

```
SEASONAL TASKS — SPRING:

March to May in {{custom_values.biz_area_7}} brings the first dry spells after winter, when decks and timber structures that have been sitting in cold, wet conditions start to dry out and show what the season has done to them. This is the right window to inspect, repair and treat before outdoor use begins.

Key tasks this season:
• Full deck inspection after winter, checking board movement, fixings, and post bases for moisture damage
• Replacement of boards that have split, cupped or softened through repeated freezing and thawing
• Pressure washing and drying of deck surfaces before any treatment or stain is applied
• Post base checks on fences and pergolas, particularly on lower-lying plots in central {{custom_values.biz_area_7}} where soil stays wet longest
• New deck and pergola installation booked and started before the main summer outdoor season
• Wood staining and treatment on decks that are structurally sound but showing surface greying from the winter
```

**Why this works:**
- The intro paragraph explains what spring means for this specific material in this specific location — not a generic "spring is a busy time"
- Tasks are specific enough that a homeowner reading them understands the reason, not just the action
- The post base check task names a specific local sub-area condition (lower-lying plots where soil stays wet longest)
- Tasks are from the client's actual confirmed service list — no invented services
- Each task is one sentence, specific and actionable

### Neighbourhood card example

```
LOCAL KNOWLEDGE — CARD: Seafront and Promenade Streets

Properties within a few streets of the seafront face the harshest conditions for outdoor timber anywhere in {{custom_values.biz_area_1}}. Salt carried on sea air works into timber finish, fixing points and joints throughout the year. Timber decks in this zone need more frequent staining and inspection than those further inland, and composite materials are often the more practical choice for new builds here because they resist salt penetration and do not need annual retreatment. Post and railing fixings should always be stainless steel or fully galvanised on seafront plots.
```

**Why this works:**
- The named area is genuinely distinct from other sub-areas in the town — not just a different postcode
- The specific condition (salt in sea air) is named with three specific consequences: timber finish, fixing points, joints
- A practical recommendation follows from the condition: composite over timber, stainless or galvanised fixings
- The buying psychology implication is clear: clients in this zone need to invest in better materials and more frequent maintenance
- 88 words — correct length for a neighbourhood card

### FAQ example (category page)

```
FAQ — Q: Does the coastal weather in {{custom_values.biz_area_1}} really make that much difference to which decking material I should choose?

FAQ — A: Yes, and it is one of the most important decisions for a {{custom_values.biz_area_1}} deck. Salt air from the North Sea works into timber finish throughout the year, stripping sealant and opening the grain to moisture far faster than in an inland garden. Timber decks in {{custom_values.biz_area_1}} typically need staining or oiling every one to two years to stay in good condition, and boards facing west or directly into the prevailing wind tend to degrade first. Composite boards avoid most of these problems because they do not absorb moisture the same way and hold their surface without annual retreatment. Find out everything covered in our {{custom_values.service_83}} service in {{custom_values.biz_area_1}} to see how composite installation works and what the material costs against timber over a five year period.

[VA — HYPERLINK THE EDITORIAL LINK TEXT ABOVE. Link this to the service page for {{custom_values.service_83}} in {{custom_values.biz_area_1}}. Delete this note before publishing.]
```

**Why this works:**
- Answers "yes" immediately — no hedging
- Names the mechanism (salt air stripping sealant, opening grain) not just the outcome
- Gives a specific maintenance frequency: every one to two years — not "regular maintenance"
- Names the specific boards most at risk: those facing west or into the prevailing wind
- Editorial link names a specific service and sets up a practical next step (comparison over five years)
- 130 words — correct length for a FAQ with technical detail

---

## SERVICE PAGE — WHAT GOOD LOOKS LIKE

### Maintenance section example (schedule-driven services)

Services that are schedule driven rather than problem driven — lawn mowing, hedge trimming, regular garden maintenance — use a maintenance section instead of a signs section. The maintenance section explains what happens when the schedule slips, not symptoms of an existing problem.

```
MAINTENANCE SECTION — HEADLINE: Miss the Window and the Work Gets Harder

MAINTENANCE SECTION — BODY:

The most important trim of the year in {{custom_values.biz_area_1}} is the one that happens in late spring, once nesting season risk has been assessed and before summer growth takes hold. Hedges on the Lincolnshire coast respond quickly to longer days and the mild maritime climate. Privet, laurel, and leylandii in particular can put on significant new growth between May and July. Leave that growth unchecked and you are no longer trimming a hedge. You are cutting back into woody material, which takes longer, creates more waste, and puts the overall shape at risk. Getting in during the right window keeps the hedge manageable and means each visit builds on clean, consistent growth rather than fighting against it.

The second critical point is early autumn, before the first strong gales come in off the North Sea. Skegness and the surrounding coastal strip are exposed to some of the most direct wind in Lincolnshire, and an overgrown, top heavy hedge behaves differently in a storm than a well trimmed one. Excess growth at the top increases wind resistance. Posts, root zones, and the hedge base take more strain. The worst outcomes include whole sections leaning or sections of a mixed native hedge losing structural integrity along a fence line after a gale. A trim in September or early October reduces that load and takes the hedge into winter in the best possible condition. Clients around caravan parks and open seafront streets in {{custom_values.biz_area_1}} see this difference most clearly, because their hedges face wind from the most exposed angle.

Through winter, {{custom_values.biz_area_1}} hedges need little cutting but still need watching. Sandy coastal soils dry out faster than inland clay, which means root zones can become shallow over time without regular feeding and mulching, and this can affect how well a hedge responds come spring. Leylandii in particular, common along boundary lines in the post war housing on the outskirts of Skegness and in caravan park settings, can look fine through December but show brown patches on the windward face come February, where salt spray has burned the foliage. That is not a cutting issue. It is an exposure and soil health issue that a knowledgeable trimming visit can identify and flag before it becomes a replacement job.
```

**Why this works:**
- Three paragraphs, three genuinely distinct timing windows: late spring, early autumn, winter
- Each paragraph names a specific local consequence of missing the window — not generic advice
- Named hedge species (privet, laurel, leylandii) are accurate for the region
- The winter paragraph names a problem that looks like a cutting issue but is not — showing genuine expertise
- Named local sub-areas where each consequence is most relevant: caravan parks, seafront streets, post war housing
- No paragraph could appear on a landscaping website in a different part of the UK without changing multiple specific details

### How it works section example

```
HOW IT WORKS — PARAGRAPH 1:

Every visit starts with a check of the hedge before any cutting begins. In {{custom_values.biz_area_1}}, where salt laden air from the North Sea is a constant factor, the windward face of a hedge often shows different growth and condition from the sheltered side. A laurel hedge facing the sea may have thicker, tougher foliage on the exposed side and thinner, more vulnerable growth behind it. A leylandii screen along a caravan park boundary may have wind burn on one face that affects how far back it is safe to cut without exposing dead brown material underneath. Taking a minute to read the hedge before cutting means the trim is matched to the actual condition, not just the silhouette.

HOW IT WORKS — PARAGRAPH 2:

Cutting follows a consistent method that keeps the hedge healthy rather than just tidy. The top is cut first, then the sides, working downward so clippings fall clear of sections already trimmed. For hedges that have been left longer between visits, or that have been allowed to widen significantly, the cut is taken back in stages rather than all at once. Hard cutting a hedge that has been starved of attention can stress the root system, particularly in the sandy soils common near the {{custom_values.biz_area_1}} seafront, where roots are already working harder to find moisture. A measured approach protects the hedge while still achieving a clean, defined shape. For species like privet and native mixed hedges, which respond well to harder work, the approach can be more direct. For laurel and leylandii, which do not regenerate from bare brown wood, the cut stays within the green growth at all times.

HOW IT WORKS — PARAGRAPH 3:

All cuttings are cleared and removed as part of the service. This matters more than it might seem. Leaving a heavy volume of clippings at the base of a hedge, particularly one sitting on the sandy, low organic matter soils found in coastal {{custom_values.biz_area_1}} gardens, creates a moisture trap that encourages fungal growth at the stem base. It also creates a habitat for slugs and other pests that can work back into the hedge base and affect regrowth. {{custom_values.company_name}} removes all green waste from site so the hedge base is left clean and the garden is ready to use immediately after the visit.

HOW IT WORKS — PARAGRAPH 4:

Frequency is set based on species, location, and how the hedge is used. A fast growing leylandii screen along an exposed boundary in {{custom_values.biz_area_1}} will need at least two cuts a year to stay manageable and structurally sound as a windbreak. A slower growing native hedge or a well established privet on a sheltered domestic boundary may be fine with a single cut in late summer. {{custom_values.company_name}} advises on the right frequency for each hedge at the first visit, so clients are not paying for more visits than the hedge needs or finding themselves with overgrowth between appointments.
```

**Why this works:**
- Four paragraphs, four genuinely distinct aspects of the job: assessment, cutting method, clearance, frequency
- Each paragraph contains a local condition that shapes the approach described in that paragraph
- Named species appear in the correct context: laurel and leylandii need different treatment to privet and native hedges — accurate
- The clearance paragraph explains WHY clearance matters (fungal growth, slugs, moisture trap) not just that it is done
- The frequency paragraph gives specific numbers: two cuts a year for leylandii, possibly one for slower species
- Each paragraph ends with a consequence: misread hedge leads to exposed dead material; wrong cutting method stresses roots; clippings left create pest habitat; wrong frequency leads to overgrowth or overspend

---

## LOCATION PAGE — WHAT GOOD LOOKS LIKE

### Hero subheadline example

```
HERO SUBHEADLINE:

Boston gardens sit on heavy fenland soil that holds water long after the rain stops. Lawns on low lying plots near the River Witham stay soft well into spring, and poorly drained beds can sit saturated from November through to March. Left unmanaged, that kind of ground compacts hard underfoot and becomes difficult to work without causing real damage to the root zone. Call {{custom_values.company_phone_functional}} to book a free site visit.
```

**Why this works:**
- Opens with the specific soil condition in this location — not a company claim
- Names a local landmark (River Witham) with a specific consequence rather than just mentioning it
- Gives a specific timeline: November through to March — not "winter months"
- The consequence of leaving the problem (ground compacts hard, difficult to work without causing damage) is horticultural and specific
- Ends with a direct call to action — no preamble
- 68 words — correct length

### Services intro example

```
SERVICES INTRO — PARAGRAPH:

Boston gardens are not the same as gardens further up the coast. The fenland around the town sits low and flat, and the soil holds moisture in a way that most people underestimate until they have had a lawn churned up in February or borders that stay waterlogged from one wet week to the next. {{custom_values.company_name}} works across {{custom_values.biz_area_2}} and out into the surrounding villages and fenland parishes. The approach here always starts with understanding what the ground is actually doing before any work begins.
```

**Why this works:**
- Opens by distinguishing this location from the surrounding area — not generic "we cover this area"
- The fenland moisture observation is specific and locally accurate
- Two concrete consequences named: lawn churned up in February, borders waterlogged from one wet week
- Ends with a positioning statement about the client's approach that is grounded in the local condition just described
- 85 words — correct length

### Service category card example (location page)

```
SERVICE CARD — {{custom_values.category_1}}:

Boston's fenland soils are fertile but they stay wet. In inner town streets near the historic core around St Botolph's Church, rear gardens in terraced houses can be small and access constrained, which makes proper soil management and seasonal timing more important than raw power. In outer estates and fenland villages, the ground is more open but waterlogging can be severe after winter rain. {{custom_values.company_name}} covers {{custom_values.service_1}}, {{custom_values.service_5}}, {{custom_values.service_8}}, and {{custom_values.service_3}} across {{custom_values.biz_area_2}} and the surrounding parishes. The timing and approach are matched to what the ground is actually doing on the day.

SERVICE CARD — {{custom_values.category_1}} EDITORIAL LINK: See everything covered in our {{custom_values.category_1}} service in {{custom_values.biz_area_2}}, including what to expect on a first visit.

[VA — HYPERLINK THE TEXT ABOVE. Link this to the location-specific category page for {{custom_values.category_1}} in {{custom_values.biz_area_2}}. Confirm this links to the location-specific page, NOT the primary city category page. Delete this note before publishing.]
```

**Why this works:**
- Opens with a soil observation specific to Boston (fenland, fertile, stays wet) — not copied from another location
- Distinguishes two distinct sub-areas of the town: inner terraced streets versus outer estates and fenland villages
- Names a local landmark (St Botolph's Church) to anchor the inner town reference
- Lists actual services using {{custom_values.X}} placeholders — not generic service names
- The editorial link names the specific service and location together
- The VA note confirms the link must go to the location-specific page, not the primary city page

### Local knowledge section example

```
LOCAL KNOWLEDGE — PARAGRAPH 1:

Inner Boston is dense. Streets of Victorian and Edwardian terraces close to the historic quay and near St Botolph's Church have small rear gardens that often get accessed through the house or via a narrow back passage. Heavy machinery does not go in. That changes how the work is done. Manual clearance, compact equipment and careful timing matter here more than anywhere else in the town. These gardens are also some of the most neglected, particularly in streets with high tenant turnover, where beds can go several seasons without proper attention and weed pressure builds fast in the fertile, damp soil.

LOCAL KNOWLEDGE — PARAGRAPH 2:

Move out to the post war estates on the edge of Boston and the gardens open up. Standard suburban plots with side access, mid-sized lawns and room to manoeuvre equipment properly. The ground here is still heavy and sits low. After a wet winter, lawns on these estates can stay soft into April, and working on them too early causes compaction damage that lasts through the growing season. Moss builds up quickly on poorly draining turf, and the borders can sit saturated long enough to rot root systems in shrubs that were planted in better-draining soil than this. Timing the first cuts and treatments of the year to the actual ground condition, not the calendar, is what separates a good result from one that looks fine in April and falls apart by June.

LOCAL KNOWLEDGE — PARAGRAPH 3:

Fenland villages around Boston — Fishtoft, Wyberton, Frampton, Kirton — sit on low lying agricultural land with deep, nutrient rich soil that grows things fast. Gardens in these villages tend to be larger than in town, and hedges and shelterbelts that have gone a few seasons without attention become serious work. Drainage channels and dykes run close to many of these properties, and the groundwater in summer can be surprisingly high even after a dry spell. Trees in these locations need assessing properly for root stability before any major pruning or removal, particularly where ground has been repeatedly saturated.
```

**Why this works:**
- Three paragraphs, three genuinely distinct parts of the area: inner Victorian terraces, post-war estates, fenland villages
- Each paragraph could not be swapped with a paragraph from another location page — all detail is Boston-specific
- Named streets and landmarks in the first paragraph (historic quay, St Botolph's Church)
- Named villages in the third paragraph (Fishtoft, Wyberton, Frampton, Kirton)
- Each paragraph identifies a specific gardening or landscaping challenge that follows from the property type described
- The buying psychology is implied: inner city tenanted stock is neglected and access-constrained; outer estates need timing expertise; fenland villages have larger scale work and specific structural considerations

### Location page FAQ examples

```
FAQ — Q1: How much does a gardener cost in Boston, Lincolnshire?

FAQ — A1: Costs depend on garden size, ground condition and how often visits are needed. A small terraced garden near the town centre in a street off Wide Bargate or close to the river is a different job to a larger plot in Fishtoft or Wyberton, where lawns are bigger and hedges have often had years of unchecked growth. {{custom_values.company_name}} offers a free first visit to look at the garden and give an honest quote before any work is agreed. Find out what our {{custom_values.category_1}} service covers for Boston properties and the surrounding villages.

FAQ — Q2: Do you cover villages around Boston?

FAQ — A2: {{custom_values.company_name}} covers {{custom_values.biz_area_2}} and the surrounding fenland villages including Fishtoft, Wyberton, Frampton, Kirton and Swineshead. Gardens in these villages tend to be larger, with heavier soil and higher groundwater than in town. Hedges, shelterbelts and mature trees in these areas often need more substantial work than a standard town garden, and drainage is a real consideration on many of these plots. See the areas we cover across {{custom_values.biz_area_2}} and {{custom_values.state}}.

FAQ — Q3: How often should I have my garden maintained in Boston?

FAQ — A3: Most Boston gardens need fortnightly visits from April through to September when growth is at its fastest on fertile fenland soil. Through autumn the schedule typically drops to monthly, with leaf clearance and border cutbacks taking priority. Through winter, visits become less frequent but do not stop entirely. Fenland gardens left unmanaged through the wet months can suffer significant weed re-establishment, particularly dock and creeping buttercup in borders, and lawns on heavy ground can compact badly if not monitored through the cold period. Find out how our {{custom_values.category_1}} service works across {{custom_values.biz_area_2}} and surrounding villages.
```

**Why this works:**
- Q1 names specific local streets (Wide Bargate) and specific villages (Fishtoft, Wyberton) to contrast two price scenarios
- Q2 names five specific villages and explains what makes village gardens different from town gardens in this area
- Q3 gives specific maintenance frequencies with local reasons: fortnightly through growing season because fenland soil grows fast, monthly in autumn, continued through winter because of dock and creeping buttercup
- Named weed species in Q3 (dock, creeping buttercup) are accurate for fenland conditions
- All three answers end with editorial links to a relevant service or area page
- No answer says "it depends" without explaining exactly what it depends on and why

---

## LOCATION CATEGORY PAGE — WHAT GOOD LOOKS LIKE

The location category page combines the structure of a category page with location-specific content throughout. Every service card must reference the specific location and its conditions, not the primary city.

### Service card example (location category page)

```
SERVICE CARD — {{custom_values.service_99}}:

{{custom_values.service_99}} is the core offer for homeowners in {{custom_values.biz_area_7}} who want a proper outdoor space built to last. The process covers every element: ground assessment, footings, bearer and joist frame, decking board installation, and the finishing details that make a deck functional over many years rather than just good-looking when new. {{custom_values.company_name}} works in hardwood and softwood, matching the species to the budget and the conditions on site. Decks near lower-lying, wetter ground in central {{custom_values.biz_area_7}} are built with greater clearance above soil level and closer attention to joist ventilation than those on the freer-draining Wolds edge plots further out.

See everything covered in our {{custom_values.service_99}} in {{custom_values.biz_area_7}}.

[VA — HYPERLINK THE TEXT ABOVE. Link this to the service page for {{custom_values.service_99}} in {{custom_values.biz_area_7}}. Delete this note before publishing.]
```

**Why this works:**
- The location placeholder ({{custom_values.biz_area_7}}) is used throughout — this is not a generic service card with the location name inserted at the end
- Two distinct soil conditions within the location are named: lower-lying wetter ground in central town versus freer-draining Wolds edge plots
- The structural specification changes between the two soil types: greater clearance, closer attention to joist ventilation
- Lists the process stages in practical terms: ground assessment, footings, bearer and joist frame, boards, finishing
- 125 words — correct length for a location category service card

---

## WHAT MAKES COPY FAIL IN THIS TRADE

- Any sentence that contains no local detail from the geo research — if it could appear on any landscaping website anywhere in the UK, rewrite it
- Named species or soil types not found in the geo research for this specific area
- Services not confirmed on the client's onboarding form
- Em dashes, en dashes, or hyphenated compound adjectives — these are prohibited throughout
- Signs or maintenance section paragraphs that describe the same thing three different ways instead of three genuinely distinct points
- How it works sections that describe what happens without explaining why the order and method matter
- FAQ answers that say "it depends" without specifying what it depends on
- Trust claims not confirmed on the onboarding form
- Copy that implies design capability if the client only does maintenance, or vice versa
- Price ranges without confirmed figures: omit if not confirmed, and flag as a [NOTE FOR BRANDON: ...] line below the copy block if genuinely valuable
- [CLIENT TO CONFIRM] or any bracketed placeholder inside copy
- Operational processes asserted as fact without confirmation: visit frequencies, free first visits, waste removal inclusion, or crew and equipment specifics
