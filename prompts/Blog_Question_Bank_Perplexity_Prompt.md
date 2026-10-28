# Blog question bank: Perplexity prompt (v2, 28 Oct 2026)

Run **once per trade**, with Deep Research. The output is reused for every client in that trade, because we only take one client per trade per town. Refresh it about once a year.

Why it exists: the page FAQs use up almost all of the trade question bank, and each blog post needs a target question plus 6 to 10 questions around it. v2 adds two blocks that v1 lacked, so posts never borrow questions from other topics:
- **cost topics**, one per service, so every cost guide has FAQs that aren't the cost question reworded;
- **seasonal topics**, one per seasonal topic in the niche entry, with the month window and its source.

The runner fills the three lines at the top: the trade, the services (UK page names from the services library) and the seasonal topics (from the niche entry). Nothing else changes.

```
RUN FOR: [TRADE, e.g. landscaper]
SERVICES: [one per line, e.g. Artificial Grass Installation / Fencing / Block Paving / Lawn Care / Turf Laying / Garden Drainage]
SEASONAL TOPICS: [one per line, e.g. Spring lawn care / Laying new turf / Preparing the garden for winter / Hedge cutting after the nesting season, or "none"]

You are researching blog topics for a UK [TRADE]. A blog topic is a question UK homeowners ask that needs a full written answer (several paragraphs), not a one-line FAQ reply. Your job is to FIND QUESTIONS, not to write answers or marketing copy.

WHERE TO LOOK
- Google "People also ask" for each topic, service and seasonal topic
- Reddit (r/DIYUK, r/HousingUK, r/GardeningUK and trade-relevant UK subreddits), Mumsnet, MoneySavingExpert forums
- Which? guides and community questions; Q&A on Checkatrade, MyBuilder, Rated People and Bark
- RHS, government, council and trade body pages for timings, rules, permissions and certificates in England
UK sources only. Ignore questions that only apply to the US, Australia or elsewhere.

WHAT TO RETURN

## 1. TOPICS
25 to 35 distinct topics across every service listed. Include at least 6 "X or Y" choices, at least 4 rule or permission topics where they exist for this trade, and at least 6 problem topics ("Why is my X doing Y?"). Do not include cost topics or seasonal topics here; they have their own sections below.

For each topic, a header line in exactly this format:
### [BT-N] | "target question as a homeowner would type it" | Type: decision / question | Service: one service from SERVICES, or General | Seen: where and roughly how often | [source URL]

Then 6 to 10 related questions about that same topic, one per line:
- [BT-N.a] | "question" | Doubt: Price / Trust / Fit / Process / Timing | Needs client fact: Y/N | [source URL]

## 2. COST TOPICS
One block for EVERY service in SERVICES, plus one for the trade as a whole ("How much does a [TRADE] cost?").

### [CT-N] | "How much does [service] cost?" | Service: the service | Seen: where and roughly how often | [source URL]

Then 6 to 10 related questions people ask about that service's cost and value that are NOT the cost question in other words. "How much is it per square metre?" and "What's the average price?" are the cost question again: leave them out. Good related questions cover what a quote should include, what's usually extra, what makes it cost more or less, how long it lasts, what upkeep costs, whether it's worth it, and cheaper alternatives.
- [CT-N.a] | "question" | Doubt: Price / Trust / Fit / Process / Timing | Needs client fact: Y/N | [source URL]

## 3. SEASONAL TOPICS
One block for every topic in SEASONAL TOPICS (skip this section if "none").

### [ST-N] | "the topic as a homeowner would ask it, e.g. When should I scarify my lawn?" | Service: one service from SERVICES | Window: the months it's usually done, as the source states it (e.g. "September to March"), or "no window stated" | [source URL for the window: RHS, a trade body or a manufacturer, never a forum]

Then 6 to 10 related questions about doing that job at that time of year:
- [ST-N.a] | "question" | Doubt: Price / Trust / Fit / Process / Timing | Needs client fact: Y/N | [source URL]

## 4. RANKED
The 16 topics from sections 1 to 3 with the most search interest, in rank order, by ID only.

## 5. RULES BEHIND THE TOPICS
For every rule or permission topic, the rule as an official source states it:
- [ID] | what the official source says, in one sentence | [official source URL]
Official sources only (gov.uk, Planning Portal, council, trade body or scheme sites). Rules for England; note where Scotland or Wales differ. No official source: say so.

## 6. GAPS
Any service, cost topic or seasonal topic where you found fewer than 6 real related questions, and how many you found. Any sources that disagree.

RULES
- Put the full source URL on the same line as every topic, question, window and rule. Never use [1] or [web:3] style markers.
- Do not write answers to any question.
- Do not invent questions. If a block only has 4 real related questions, return 4 and list it in GAPS.
- Related questions stay on their own topic and service. Never reuse a question in two blocks.
- Write every question the way a homeowner would type it, never as a heading ("The benefits of composite decking" is wrong; "Is composite decking worth it?" is right).
- Mark anything older than 2 years as (dated: month year).
- No marketing language, no intro, no summary. Start with "## 1. TOPICS" and end after section 6.
```

## How Copybot uses it

- Stored per trade with the same approval step as v1. A v2 run replaces the v1 bank for that trade once approved.
- Decision and question posts take their H2s and FAQs from their own BT block only.
- Cost guides take their FAQs from their service's CT block only (the H2s are fixed by the Cost Guide Structure). The trade level CT block feeds the homepage cost guide.
- Seasonal posts take their H2s and FAQs from their ST block only. The window, with its source URL, joins FACTS ALLOWED as a sourced row once the bank is approved; "no window stated" means the post uses the "How to" wording.
- No post borrows questions from another block. A post whose own block has fewer than 3 usable H2 questions and 3 FAQ questions after the site wide check is Held.

## How to judge a run

A good run has a CT block for every service and an ST block for every seasonal topic, 6+ related questions in most blocks, cost related questions that aren't the cost question reworded, windows sourced to RHS or a trade body, and a source URL on every line. Check the GAPS section: those are the blocks whose posts will be held.
