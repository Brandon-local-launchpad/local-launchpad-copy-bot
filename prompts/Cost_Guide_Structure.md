# Cost Guide Structure (v1, 28 Oct 2026)

Owner: Brandon. Replaces the placeholder in prompts/Cost_Guide_Structure.md. Cost guides run on the Blog Post Structure template as post_type cost_guide; this file sets their fixed H2s, table, FAQ source and limits. Everything not set here follows the Blog Post Structure and Amendment 1.

## What a cost guide is for

One cost guide owns "[service] cost [city]" (or "[trade] cost [city]" for the homepage cost guide). It answers what the job costs, what moves the price, what a quote should include, how long the job takes and how to keep the cost down. It links up to the service page that sells the job. It is the page AI answers and searchers land on for price questions, so the figures come only from the client's price rows, and in factors mode it explains how the job is priced without any figures.

## Fixed H2s

Code sets these, in this order. [SERVICE] is the UK page name from the services library (never the GBP name: "Turf Laying", not "Sod Installation"), lower case inside a sentence. [CITY] is the primary city, used in the first H2 only.

### Service cost guide, prices mode (the service has a price row)

| # | H2 | Brief (passed to the model) | Fact rows it needs |
| --- | --- | --- | --- |
| 1 | How Much Does [SERVICE] Cost in [CITY]? | The typical range from the price rows and what it covers, per the cost unit. The cost table sits under this section. | Price rows |
| 2 | What Affects the Cost of [SERVICE]? | The price factors, one per paragraph, each tied to what it does to the job. | Trade facts price factors (Table F) |
| 3 | What Should a [SERVICE] Quote Include? | What the quote covers and what is usually priced separately, so the reader can compare quotes like for like. | Client quote includes and quote method; trade facts stages and materials |
| 4 | How Long Does [SERVICE] Take? | The job's duration as the facts give it, the stages that set it, and the time of year it suits or avoids. Never a timescale the facts don't give. | Trade facts Table A timing and stages |
| 5 | How Can You Keep the Cost of [SERVICE] Down? | The factors that bring the price down (access, preparation already done, ground in good condition, combining jobs), as what usually helps, never as a promise. | Trade facts price factors that lower cost |

### Service cost guide, factors mode (no price row for the service)

H2 1 becomes **How Is [SERVICE] Priced in [CITY]?**, with the brief: how the job is priced (per job, per visit, per session or per move, from cost_unit) and that a figure follows a look at the job. No figures anywhere on the page. H2s 2 to 5 stay as above. The table runs as Job | What affects the price, with no price column.

### Homepage cost guide (trade level)

| # | H2 | Brief |
| --- | --- | --- |
| 1 | How Much Do [TRADE_PERSON]s Charge in [CITY]? | The range for each main service with a price row, one line each. The cost table sits under this section, one row per main service. |
| 2 | What Affects the Cost of [TRADE] Work? | The factors that move price across the trade's jobs: size, access, ground or materials, waste. |
| 3 | What Should a [TRADE] Quote Include? | As H2 3 above, for the trade. |
| 4 | How Can You Keep [TRADE] Costs Down? | As H2 5 above, for the trade. |

The homepage cost guide has four H2s, because the per-service detail lives in the service cost guides it links to (as secondary links, live ones only).

### Wording by cost unit

| cost_unit | Business type | H2 1 wording | H2 4 |
| --- | --- | --- | --- |
| per job | A | How Much Does [SERVICE] Cost in [CITY]? | How Long Does [SERVICE] Take? |
| per visit | B | How Much Does [SERVICE] Cost per Visit in [CITY]? | How Often Do You Need [SERVICE]? (frequency from the visit frequencies offered) |
| per session | C | How Much Does [SERVICE] Cost per Session in [CITY]? | How Long Is a [SERVICE] Session? |
| per move | D | How Much Does [SERVICE] Cost in [CITY]? | How Long Does [SERVICE] Take? |

An H2 whose fact rows are missing is dropped, not padded. Under 3 H2s left, the post is Held (G-STACK) as for any post.

## Cost table

Always on for cost guides when it has 3 or more rows.

- Prices mode columns: Job | Typical price | What affects it.
- Rows, in order: each price row for this service (and its sub jobs); then related jobs named in the trade facts for the same service, with "Ask for a quote" in the price cell.
- Factors mode: Job | What affects the price.
- A price cell holds only a figure from a price row, with its unit ("£1,500 to £4,000 per job").

## Figures

- The price range appears in blog_answer (first sentence, B-PRICE), H2 1 and the table, and nowhere else on the page. H2s 2 to 5 and the FAQ describe what moves the price within "the range" without repeating the figures.
- No other £ figure except a council fee from a FACTS ALLOWED rule row.

## FAQ

3 to 5 questions, from the bank's related questions on this cost topic first, then other bank cost topics on the same service, then the held cost questions from the FAQ sort. Never a question that repeats or rephrases an H2 above. Fewer than 3: the post is Held.

## Word ranges

blog_answer 40 to 60; each H2 body 150 to 220; FAQ answers 40 to 70; closing 20 to 40 (one or two sentences). Service cost guides land at about 1,000 to 1,400 words, the homepage cost guide at about 900 to 1,200.

## Links

Primary: the service page (the homepage for the homepage cost guide), in H2 1 or H2 2 and in the closing. Secondary on the homepage cost guide: the live service cost guides, each once, in H2 1. No link to the contact page from the body.

## What stays out

- Proof claims (years, guarantee, insurance, reviews, differentiators) outside the business block (B-PROOF).
- The client's hours, travel distance and service area: they live in the footer and on the location pages.
- "Cheap", "affordable", "competitive" and any comparison with other businesses' prices.
- Telling the reader to get other quotes.
