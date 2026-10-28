# Blog question bank: Perplexity prompt (v1, 28 Oct 2026)

Run **once per trade**, with Deep Research, the same way as the trade question bank. The output is reused for every client in that trade, because we only take one client per trade per town. Refresh it about once a year.

Why it exists: on a real client, the page FAQs use up almost all of the trade question bank (46 of Eden's Edge's 48 questions). Each blog post needs a target question plus 6 to 10 questions around it, so 16 posts need well over 100 questions the pages don't use. This bank is the blog's own supply. Local and seasonal posts still come from the dossiers and the niche entry.

Replace the value in the first line, nothing else.

```
RUN FOR: [TRADE, e.g. landscaper]

You are researching blog topics for a UK [TRADE]. A blog topic is a question UK homeowners ask that needs a full written answer (several paragraphs), not a one-line FAQ reply: what a job costs and why, choosing between two options, whether a rule or permission applies, why a problem happens and what fixes it, how long something lasts, how a job is done. Your job is to FIND QUESTIONS, not to write answers or marketing copy.

WHERE TO LOOK
- Google "People also ask" for each topic and each main service of a [TRADE]
- Reddit (r/DIYUK, r/HousingUK, r/GardeningUK and trade-relevant UK subreddits), Mumsnet, MoneySavingExpert forums
- Which? guides and community questions; Q&A on Checkatrade, MyBuilder, Rated People and Bark
- Government, council and trade body pages for questions about rules, permissions and certificates in England
UK sources only. Ignore questions that only apply to the US, Australia or elsewhere.

WHAT TO RETURN

## 1. TOPICS
25 to 35 distinct topics. Spread them across every common service a [TRADE] offers, not just the biggest job. Include:
- one cost topic for each main service ("How much does X cost?");
- at least 6 "X or Y" choices (materials, methods, repair or replace);
- at least 4 rule or permission topics, where they exist for this trade;
- at least 6 problem topics ("Why is my X doing Y?").

For each topic, one header line in exactly this format:
### [BT-N] | "target question as a homeowner would type it" | Type: cost / decision / question | Service: which service, or General | Seen: where and roughly how often | [source URL]

Then 6 to 10 related questions people ask around that topic, one per line, in exactly this format:
- [BT-N.a] | "question as a homeowner would type it" | Doubt: Price / Trust / Fit / Process / Timing | Needs client fact: Y/N | [source URL]

Related questions must be about the same topic and the same service, and each must be different enough to need its own answer. Merge near duplicates. "Needs client fact" is Y when only the business itself can answer it (its prices, guarantee, process, what its quote includes).

Then list the 16 topics with the most search interest, in rank order, by ID only.

## 2. RULES BEHIND THE TOPICS
For every rule or permission topic, the rule as an official source states it:
- [BT-N] | what the official source says, in one sentence | [official source URL]
Official sources only (gov.uk, Planning Portal, council, trade body or scheme sites). Rules for England; note where Scotland or Wales differ. If you can't find an official source, say so rather than answering.

## 3. GAPS
Topics you looked for and couldn't find enough real questions for, or where sources disagree.

RULES
- Put the full source URL on the same line as every topic, question and rule. Never use [1] or [web:3] style markers.
- Do not write answers to any question.
- Do not invent questions. If a topic only has 4 real related questions, return 4 and say so in GAPS.
- Write every question the way a homeowner would type it, never as a heading ("The benefits of composite decking" is wrong; "Is composite decking worth it?" is right).
- Mark anything older than 2 years as (dated: month year).
- No marketing language, no intro, no summary. Start with "## 1. TOPICS" and end after section 3.
```

## How Copybot uses it

- Stored per trade, like the trade question bank, with the same approval step before any question is used.
- B1 takes cost topics, then decision and question topics from this bank, after the held buckets from the FAQ sort.
- For each topic, the H2s (B6) are the first 3 to 5 related questions in doubt order, and the FAQ questions (B7) are the next 3 to 5.
- The site wide check still runs against every page: any question a page already uses is dropped from the topic before it's used.

## How to judge a run

A good run has 25+ topics that sound like real searches, 6+ related questions under most of them, every main service covered, and a source URL on every line. A bad run has headings instead of questions, related questions that drift onto other services, or no sources. Send it over and I'll tighten the prompt.
