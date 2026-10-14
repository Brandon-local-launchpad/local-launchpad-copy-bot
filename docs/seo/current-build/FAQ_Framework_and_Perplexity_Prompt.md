# Local Launchpad FAQ Framework

How every FAQ on a client site is chosen, answered and checked. It is built for local SEO first (real searched questions, visible answers, FAQ schema, local detail, internal links) with three pieces borrowed from the doubt map sales framework: answer first, doubt coverage, and client-approved answers.

---

## 1. The five doubts

Every question a customer asks before booking comes from one of five doubts. Every page's FAQ set must cover all five, so it can't be eight variations on one worry.

| Doubt | What the customer is really asking | Typical questions |
|---|---|---|
| **Price** | Can I afford it, and is it worth it? | How much does it cost? What affects the price? Is the quote free? Are there extras? |
| **Trust** | Can I trust you, and what if it goes wrong? | Are you insured? Do you guarantee your work? Are you accredited? What if I'm not happy? |
| **Fit** | Can you do my job, and do you come to me? | Do you cover my area? Do you do small jobs? Is this the right service for my problem? |
| **Process** | What happens, and what does it involve for me? | What happens on the visit? Do I need to be in? Will there be mess? Do I need permission? |
| **Timing** | When, and how long? | How soon can you start? How long does it take? When's the best time of year? |

## 2. Where the questions come from (best first)

1. **The client's own customers.** Onboarding asks: "What do customers always ask you before they book?" These beat everything else.
2. **Real search questions:** Google People Also Ask and the Ahrefs questions report for the page's keyword.
3. **Perplexity question research,** split in two because we only take one client per trade per town:
   - a **trade question bank**, run once per trade with the prompt below and reused for every client in that trade, anywhere. Refreshed about once a year. In the Bournemouth roofer dry runs, 34 to 38 of 40 questions weren't local at all;
   - **local questions** per client, from the dossier's symptoms and condition questions plus a short local section in the dossier research.
4. **The niche entry's default questions,** used when nothing better exists.

Every question is written the way a customer would type or say it, never as a marketing headline.

**Rank by search data.** Forum questions show what people discuss; search data shows what they type. Before questions are assigned to pages, each is checked against the Ahrefs questions report and AlsoAsked (Google's People also ask, UK) for the page keyword. Questions with search volume win the slots; forum-only questions fill gaps. Each one is then rewritten into search wording: short, with the service and town where it reads naturally ("Is this roofing quote reasonable?" becomes "How much does a new roof cost in Bournemouth?").

**Promote the biggest questions.** A question with real search volume (usually cost) is too valuable for the bottom of a page. It becomes a section in the page body, or its own page such as a cost guide, and the FAQ block covers the long tail.

## 3. Which page owns which questions

No question appears on two pages of the same site.

| Page | Owns | Example |
|---|---|---|
| Homepage | The general questions about the business: cost overview, insurance, guarantee, start time, quotes, areas, plus 2 niche questions | "Are you insured?" |
| Category page | Questions about that category of work | "What's the difference between EPDM and felt?" |
| Service page | Questions about that one job: what's involved, how long, signs you need it, what affects the cost | "How long does a ridge repair take?" |
| Location page | Questions about that town: local rules, local problems from the dossier, coverage | "Do I need permission for a new drive in Talbot Woods?" |

## 3b. How it runs in Copybot

1. **Research:** the dossiers (per location) plus the trade question bank (once per trade), in the same click.
2. **Sorting:** one step per client hands out neighbourhoods, symptoms and FAQ questions to every page, using each question's page type, the service it matches and its doubt. A question marked "needs client fact" is only used once the client has supplied that fact. Nothing repeats across the site.
3. **Writing:** each page answers only its own questions. The answer rules live in one shared FAQ block that every page prompt loads, so a change is made once.
4. **Checking:** per page, plus a site wide check that no question or neighbourhood repeats.

## 4. How every answer is written

**Answer first.** The first sentence answers the question directly in 15 words or fewer: a yes or no, a figure, or the one thing it depends on. Google and AI answers lift this line as the snippet, and scanners stop there.

**Then the context.** Two or three sentences: why, what it depends on, a local detail if one fits, and a link to the relevant page where it helps. Where the client has given one, include a first hand detail ("on most Bournemouth semis we can do this from a tower"); answers that sound like someone who did the job are what Google rewards.

**Length.** 50 to 70 words, or 30 to 70 when the answer rests on one confirmed fact. Never padded.

Example:

> **How much does a new roof cost in Bournemouth?**
> Most full roofs on a three bed semi start from around £8,000.
> The final figure depends on access, whether scaffolding is needed and the state of the timber under the tiles, which can't be judged until it's seen. That's why we inspect before we quote.

**Rules that carry over from the copy rules:**
- Prices, timescales, guarantees and processes come only from the client's confirmed values. Never invent them.
- Anything legal or regulatory (planning, building regulations, certificates) comes from the niche entry, not a fresh search.
- "It depends" must say what it depends on and give the reader something concrete.
- One home per proof: a figure explained in Why choose us is stated in the FAQ in different words, never copied.
- Every answer is visible on the page (no accordions) and matches the FAQ schema word for word.

## 5. Client-approved answers

At onboarding, the client approves one answer to each core question: price guide, guarantee, start time, what happens if something goes wrong, how quotes work. Every page uses those approved answers, so no two pages contradict each other.

## 6. What code checks

- Every doubt is covered on the page.
- The first sentence of each answer is 15 words or fewer and answers the question.
- No question is repeated across pages of the same site.
- Word counts, banned phrases and claims, as for all copy.

## 6b. After launch

Each month, Search Console shows the exact searches a live site appears for, including ones where it ranks poorly. Add or sharpen one or two FAQ answers based on those. It's the client's own search data, and it fits the membership: thin pages improve every month.

## 7. What Perplexity is for, and what it isn't

- **For:** finding the questions people really ask, and spotting price and time ranges.
- **Not for:** writing published answers. Its answers are generic, can blend in US or outdated rules, and its prices are national averages.
- **Price and time ranges it finds** become confirm-or-correct questions for the client at onboarding ("We see new roofs in Bournemouth quoted from £7,000 to £12,000. What's your typical starting price?"). They never go live unconfirmed.

---

# Perplexity prompt: FAQ question research (v3: trade question bank, run once per trade)

Use Deep Research. Run **once per trade** (not per town); the questions are reused for every client in that trade. Replace the value in the first line, nothing else. Local questions come from the dossier research, not this prompt.

```
RUN FOR: [TRADE, e.g. roofer]

You are researching the questions UK homeowners ask before hiring a [TRADE] and while the work is being done. Cover every common service a [TRADE] offers, from small repairs to the largest jobs. Your job is to FIND QUESTIONS, not to write marketing copy or published answers.

WHERE TO LOOK
Search for questions people genuinely ask, in their own words:
- Reddit (r/DIYUK, r/HousingUK, r/UKPersonalFinance)
- Mumsnet, MoneySavingExpert forums, Which? guides and community questions
- Google "People also ask" style questions for "[TRADE]" and each main service of a [TRADE]
- Q&A sections on Checkatrade, MyBuilder, Rated People and Bark
- Government and trade body pages for questions about rules, permissions and certificates in England
Use UK sources only. Ignore questions that only apply to the US, Australia or elsewhere.

WHAT TO RETURN

## 1. QUESTIONS
30 to 50 distinct questions. Merge near duplicates into one. Spread them across the trade's services, not just the most common job. For each, one line in exactly this format:
- [Q-N] | "question as a customer would type it" | Doubt: Price / Trust / Fit / Process / Timing | Page: Homepage / Category / Service | Service: which service it's about, or General | Needs client fact: Y/N | Seen: where you saw it and roughly how often (e.g. "Reddit x4, Mumsnet") | [source URL on the same line]

"Needs client fact" is Y when only the business itself can answer it (its prices, deposit, VAT, guarantee, what its quote includes, its process).

Doubt means what the customer is really worried about:
- Price: cost, value, extras, free quotes
- Trust: insurance, guarantees, accreditation, cowboys, what if it goes wrong
- Fit: coverage area, job size, whether this is the right service for their problem
- Process: what happens, disruption, mess, permissions, what they need to do
- Timing: how soon, how long, best time of year

Page means where the question best belongs: Homepage for general questions about choosing and hiring a [TRADE]; Category for a type of work; Service for one specific job.

Then list the 15 most asked questions in rank order, by ID only.

## 2. RANGES FOUND (for the client to confirm, never to publish)
Any UK price or timescale ranges you find for common [TRADE] jobs, one line each:
- Job | price range or timescale | UK average or region | (dated: month year) | [source URL]
Keep a maximum of 15, covering the trade's main jobs.

## 3. RULES THAT CUSTOMERS ASK ABOUT
Any planning, building regulations, certification or permission questions you found, with the rule as stated on an official source:
- Question | what the official source says, in one sentence | [official source URL]
Official sources only (gov.uk, Planning Portal, trade body or scheme sites). Rules for England; note where Scotland or Wales differ. If you can't find an official source, say so rather than answering.

## 4. GAPS
Anything you looked for and couldn't find, or questions where sources disagree.

RULES
- Put the full source URL after every question, range and rule, on the same line. Never use [1] or [web:3] style markers.
- Prefer forums, Q&A sites, consumer guides and official pages as sources. Use a local competitor's website only when it is the only place a question appears, and say so in Seen.
- Do not write answers to the questions in section 1.
- Do not invent questions. If you only find 20 real ones, return 20.
- Mark anything older than 2 years as (dated: month year).
- No marketing language, no intro, no summary. Start with "## 1. QUESTIONS" and end after section 4.
```

## How to judge a dry run

A good run gives you:
- 30+ questions that sound like real people, not SEO headings;
- all five doubts represented, with Price and Trust usually the biggest;
- "Needs client fact" marked, so you know which answers to collect at onboarding;
- a source URL after every line;
- ranges labelled as UK average or regional, with dates.

A bad run gives you questions that are really headings ("The benefits of EPDM roofing"), answers instead of questions, or no sources. If that happens, send me the output and I'll tighten the prompt.

---

# Local questions: add to the dossier research

Add this section to the Geo Research CORE prompt (before GAPS), so local questions arrive with each location's dossier:

```
## LOCAL QUESTIONS
Up to 8 questions a homeowner in [LOCATION] would ask a [TRADE] that depend on something specific to [LOCATION]: council or conservation area rules, local ground or water, coastal or storm exposure, local building types, access or parking. One line each:
- [CODE-Q01] | "question as a homeowner would type it" | Doubt: Price / Trust / Fit / Process / Timing | Linked: issue or rule ID | [source URL]
Only questions you found asked, or that follow directly from a sourced local issue or rule. Don't invent questions to fill the list.
```
