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
3. **Perplexity question research, run once per client** (decision, 14 Oct 2026). One run per client with the prompt below, using the client's trade, services and towns, the same way the area research runs. It covers the general questions about hiring the trade and the local ones for the client's towns, and its questions are stored against that client only. It is not shared between clients in the same trade. The dossier's symptoms and condition questions add to it. Manual test runs: `docs/seo/current-build/faq-research/` (Edens Edge, Southampton; roofer, Bournemouth).
4. **The niche entry's default questions,** used when nothing better exists.

Every question is written the way a customer would type or say it, never as a marketing headline.

**Rank by search data.** Forum questions show what people discuss; search data shows what they type. Before questions are assigned to pages, each is checked against the Ahrefs questions report and AlsoAsked (Google's People also ask, UK) for the page keyword. Questions with search volume win the slots; forum-only questions fill gaps. Until there is an Ahrefs API (decision, 14 Oct 2026), Copybot ranks by the research's own most asked list and "seen" counts. Each one is then rewritten into search wording: short, with the service and town where it reads naturally ("Is this roofing quote reasonable?" becomes "How much does a new roof cost in Bournemouth?").

**Promote the biggest questions.** A question with real search volume (usually cost) is too valuable for the bottom of a page. It becomes a section in the page body, or its own page such as a cost guide, and the FAQ block covers the long tail.

## 3. Which page owns which questions

No question appears on two pages of the same site.

| Page | Owns | Example |
|---|---|---|
| Homepage | The general questions about the business: cost overview, insurance, guarantee, start time, quotes, areas, plus the client's researched questions in Q7 and any empty fallback slot (niche questions when it has none) | "Are you insured?" |
| Category page | Questions about that category of work | "What's the difference between EPDM and felt?" |
| Service page | Questions about that one job: what's involved, how long, signs you need it, what affects the cost | "How long does a ridge repair take?" |
| Location page | Questions about that town: local rules, local problems from the dossier, coverage | "Do I need permission for a new drive in Talbot Woods?" |

## 3b. How it runs in Copybot

1. **Research, once per client.** The first "Run Research" on the Geo Research step also starts the client's FAQ question research (Perplexity, the same agent and preset as the dossiers). It can be run again from the FAQ questions card. The prompt is `prompts/FAQ_Research_CORE.md`; code adds the client's trade, primary city, other towns, and its services by GBP category in homeowner words. The reply is stored against the client; a new run replaces the old one.
2. **Sorting, per client.** Runs by itself when new research is saved, or from the card.
   - One model call tidies the questions: merges near duplicates, marks questions the fixed homepage questions already answer, names the client fact each answer needs, picks the service and town, and rewrites each question in search wording (14 words at most, no dashes or hyphens, no banned phrases). Code checks every answer and retries once.
   - **Approval:** a person approves the wording once per client on the card before any question is used. An edited wording needs approving again.
   - **Where each question goes** is worked out by code, each time, from the client's values and page map as they are now:
     - by page type, service and town; a question about the primary city goes to the homepage;
     - a question that needs a client fact is held until the fact is on the Client Values step (a client value filled in, or a practice ticked); facts Copybot doesn't collect yet keep it waiting;
     - big cost questions ("How much does…") are held for a Cost Guide page, even though the homepage's Q1 covers cost in general;
     - a question for a page the client doesn't have moves up to that service's category page; with no category page either, it is dropped;
     - each question is used on one page only, ranked by the research's most asked list, then its "seen" count (no Ahrefs data yet);
     - a person can move or remove any question on the card; questions on a page's saved version stay on that page.
   - The questions waiting on a fact, grouped by fact with its onboarding question, are the client's onboarding list.
3. **Writing.** The homepage uses the sorted questions first: they take Q7 and any fallback slot (Q2 to Q4 when the client value is missing). The fixed homepage questions stay. Q7 prefers a doubt the fixed questions leave uncovered; a fallback slot takes a research question only with its own doubt or an uncovered one. Code writes each answer brief: from the client value's token, from the confirmed practice, or a general answer with no claims. Other page types use their questions when they are migrated.
4. **Checking.** Per page, plus a site wide check that no question or neighbourhood repeats.

Client facts an answer can rest on: `niche-library/client-facts.json` (client values) and `niche-library/practices.json` (practices). Added for every trade on 14 Oct 2026: deposit and stage payments (`deposit_terms`), what the quote includes (`quote_includes`), registered waste carrier (`waste_carrier_registered`, yes or no), and the practices for pricing extra work (`extra_work_agreed_first`), weather delays (`weather_delays_rebooked`) and protecting the house and access (`property_protected`).

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
- No question is repeated across pages of the same site (the sorting step places each question once; the site check compares the pages).
- A question's wording follows the copy rules before it can be approved (no dashes or hyphens, no banned phrases, 14 words at most).
- Deposits and waste carrier registration are only mentioned when the client values confirm them.
- Word counts, banned phrases and claims, as for all copy.

## 6b. After launch

Each month, Search Console shows the exact searches a live site appears for, including ones where it ranks poorly. Add or sharpen one or two FAQ answers based on those. It's the client's own search data, and it fits the membership: thin pages improve every month.

## 7. What Perplexity is for, and what it isn't

- **For:** finding the questions people really ask, and spotting price and time ranges.
- **Not for:** writing published answers. Its answers are generic, can blend in US or outdated rules, and its prices are national averages.
- **Price and time ranges it finds** become confirm-or-correct questions for the client at onboarding ("We see new roofs in Bournemouth quoted from £7,000 to £12,000. What's your typical starting price?"). They never go live unconfirmed.

---

# Perplexity prompt: FAQ question research (run once per client)

Run **once per client**, not once per trade: the questions are stored against that client and never reused for another. The prompt is `prompts/FAQ_Research_CORE.md` (v4), the only copy. Copybot sends it with the client's trade, services and towns, the way the area research does. v4 is the v3 trade prompt plus `Page: Location`, `Local` (both from the 14 Oct test runs in `faq-research/`), and `Service` and `Town`, chosen from the client's own lists. The dossier research has no separate local questions section: the per client run covers the towns.

## How to judge a run

A good run gives you:
- 30+ questions that sound like real people, not SEO headings;
- all five doubts represented, with Price and Trust usually the biggest;
- "Needs client fact" marked, so you know which answers to collect at onboarding;
- a source URL after every line;
- ranges labelled as UK average or regional, with dates.

A bad run gives you questions that are really headings ("The benefits of EPDM roofing"), answers instead of questions, or no sources. Copybot refuses a reply with fewer than 10 readable questions and keeps the saved research. If runs keep coming back weak, send me the output and I'll tighten the prompt.
