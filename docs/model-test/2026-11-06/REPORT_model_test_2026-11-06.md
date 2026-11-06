# Model and effort test: Edens Edge, 2026-11-06

Live record "ednes edge testing", read only; nothing pushed to WordPress and no live page record written. One run per page and setup, so read small gaps as noise. Judge: claude-sonnet-5-5, effort high, two readings per run, averaged. Total spent on the 18 runs and their judging: $17.240 (£13.447).

Cost is the writer, the retries and the claims review, with a writer that read another setup's cache priced as a cold start; the judge and the audit are not in it. £ at 0.78 to the dollar. Time is the page's wall clock with six setups running at once, without the judge.

## Service page: Lawn Mowing Southampton

| Setup | Cost | £ | Time | Retry rounds (calls) | BLOCKs before → after | Flags before → after | Judge score (readings) | Verdict |
|---|---|---|---|---|---|---|---|---|
| A: sonnet-5-5, high | $1.064 | £0.830 | 386s | 6 (28) | 10 → 1 | 23 → 1 | 7.65 (7.6, 7.7) | Has a BLOCK |
| B: sonnet-5-5, medium | $1.173 | £0.915 | 275s | 9 (63) | 16 → 1 | 21 → 5 | 6.80 (6.8, 6.8) | Has a BLOCK |
| C: sonnet-5-5, low | $1.247 | £0.973 | 193s | 9 (69) | 16 → 2 | 20 → 5 | 6.65 (6.8, 6.5) | Has a BLOCK |
| D: haiku-5-5, medium | $0.113 | £0.088 | 378s | 6 (52) | 19 → 1 | 34 → 4 | 6.85 (6.7, 7.0) | Has a BLOCK |
| E: haiku-5-5, high | $0.209 | £0.163 | 953s | 9 (63) | 19 → 1 | 47 → 3 | 6.75 (6.6, 6.9) | Has a BLOCK |
| F: hybrid: haiku-5-5 medium, BLOCKs sonnet-5-5 medium | $0.375 | £0.293 | 475s | 9 (68, 21 by Sonnet) | 18 → 1 | 31 → 9 | 6.60 (6.6, 6.6) | Has a BLOCK |

| Setup | Input | Output | Thinking | Cache read | Cache write | Largest prompt | Claims left (own review / fixed audit) | Billed |
|---|---|---|---|---|---|---|---|---|
| A | 117,673 | 71,480 | 64,231 | 770,476 | 14,649 | 30,863 | 0 / 3 | $1.064 |
| B | 266,143 | 43,074 | 29,026 | 1,733,571 | 14,649 | 31,335 | 3 / 9 | $1.173 |
| C | 310,857 | 27,520 | 13,508 | 1,847,201 | 66,121 | 31,068 | 5 / 3 | $1.247 |
| D | 209,639 | 140,697 | 130,549 | 1,379,412 | 66,121 | 31,085 | 6 / 7 | $0.113 |
| E | 315,611 | 314,240 | 302,121 | 1,803,254 | 14,649 | 31,175 | 2 / 5 | $0.209 |
| F | 307,010 | 149,974 | 135,488 | 1,871,156 | 14,649 | 31,058 | 2 / 6 | $0.375 |

E: a writer call at high thought through all 48,000 tokens and wrote nothing ($0.027, in the cost); a retry call at high thought through all 16,000 tokens and wrote nothing ($0.009, in the cost); a retry call at high thought through all 16,000 tokens and wrote nothing ($0.009, in the cost). anthropic-call.js then repeats that call at low, so the first draft on this page was written at low, not at the setup's effort.

BLOCKs left: A: PRACTICE; B: PRACTICE; C: PRACTICE, CB-PARA; D: PRACTICE; E: PRACTICE; F: PRACTICE.

## Category page: Gardener Southampton

| Setup | Cost | £ | Time | Retry rounds (calls) | BLOCKs before → after | Flags before → after | Judge score (readings) | Verdict |
|---|---|---|---|---|---|---|---|---|
| A: sonnet-5-5, high | $1.585 | £1.236 | 423s | 6 (34) | 8 → 0 | 24 → 0 | 7.50 (7.4, 7.6) | Ready to edit |
| B: sonnet-5-5, medium | $1.578 | £1.231 | 269s | 9 (61) | 11 → 0 | 28 → 2 | 7.60 (7.6, 7.6) | Needs another run |
| C: sonnet-5-5, low | $1.754 | £1.368 | 153s | 9 (82) | 9 → 0 | 24 → 9 | 6.75 (6.5, 7.0) | Needs another run |
| D: haiku-5-5, medium | $0.161 | £0.125 | 434s | 6 (62) | 16 → 0 | 26 → 4 | 5.80 (5.4, 6.2) | Needs another run |
| E: haiku-5-5, high | $0.197 | £0.154 | 865s | 9 (45) | 7 → 0 | 26 → 6 | 7.25 (7.3, 7.2) | Needs another run |
| F: hybrid: haiku-5-5 medium, BLOCKs sonnet-5-5 medium | $0.476 | £0.371 | 553s | 8 (68, 17 by Sonnet) | 10 → 1 | 35 → 9 | 6.00 (5.4, 6.6) | Has a BLOCK |

| Setup | Input | Output | Thinking | Cache read | Cache write | Largest prompt | Claims left (own review / fixed audit) | Billed |
|---|---|---|---|---|---|---|---|---|
| A | 257,323 | 80,481 | 73,379 | 1,728,152 | 36,927 | 54,223 | 0 / 3 | $1.585 |
| B | 391,340 | 39,280 | 26,627 | 3,100,508 | 36,927 | 54,416 | 2 / 4 | $1.578 |
| C | 449,622 | 21,204 | 4,510 | 4,112,292 | 92,531 | 54,313 | 4 / 3 | $1.754 |
| D | 296,862 | 176,804 | 165,040 | 3,095,732 | 92,531 | 54,271 | 3 / 8 | $0.161 |
| E | 343,838 | 270,479 | 259,506 | 2,324,187 | 36,927 | 54,157 | 2 / 6 | $0.197 |
| F | 337,787 | 175,527 | 162,354 | 3,493,231 | 36,927 | 54,388 | 0 / 4 | $0.476 |

E: a writer call at high thought through all 48,000 tokens and wrote nothing ($0.030, in the cost). anthropic-call.js then repeats that call at low, so the first draft on this page was written at low, not at the setup's effort.

F: a writer call at medium thought through all 48,000 tokens and wrote nothing ($0.030, in the cost). anthropic-call.js then repeats that call at low, so the first draft on this page was written at low, not at the setup's effort.

BLOCKs left: F: CB-LINKS.

## Homepage

| Setup | Cost | £ | Time | Retry rounds (calls) | BLOCKs before → after | Flags before → after | Judge score (readings) | Verdict |
|---|---|---|---|---|---|---|---|---|
| A: sonnet-5-5, high | $0.710 | £0.554 | 272s | 5 (17) | 3 → 0 | 10 → 0 | 7.80 (7.8, 7.8) | Ready to edit |
| B: sonnet-5-5, medium | $0.747 | £0.582 | 178s | 9 (42) | 4 → 0 | 14 → 1 | 7.00 (7.0, 7.0) | Needs another run |
| C: sonnet-5-5, low | $0.731 | £0.570 | 124s | 9 (47) | 2 → 0 | 14 → 6 | 7.10 (7.0, 7.2) | Needs another run |
| D: haiku-5-5, medium | $0.106 | £0.083 | 553s | 9 (38) | 2 → 0 | 13 → 3 | 7.30 (7.3, 7.3) | Needs another run |
| E: haiku-5-5, high | $0.142 | £0.111 | 805s | 9 (30) | 5 → 0 | 13 → 1 | 7.20 (7.2, 7.2) | Ready to edit |
| F: hybrid: haiku-5-5 medium, BLOCKs sonnet-5-5 medium | $0.346 | £0.270 | 597s | 9 (78, 37 by Sonnet) | 37 → 1 | 10 → 4 | 5.25 (5.5, 5.0) | Has a BLOCK |

| Setup | Input | Output | Thinking | Cache read | Cache write | Largest prompt | Claims left (own review / fixed audit) | Billed |
|---|---|---|---|---|---|---|---|---|
| A | 94,129 | 44,473 | 39,748 | 375,955 | 15,692 | 24,841 | 0 / 1 | $0.710 |
| B | 182,349 | 24,979 | 12,577 | 928,830 | 15,692 | 25,271 | 6 / 4 | $0.747 |
| C | 174,853 | 17,666 | 6,424 | 1,013,713 | 41,384 | 24,967 | 3 / 7 | $0.731 |
| D | 170,039 | 157,654 | 147,402 | 856,062 | 15,692 | 25,126 | 3 / 8 | $0.106 |
| E | 154,035 | 229,506 | 220,784 | 697,680 | 41,384 | 25,116 | 2 / 4 | $0.142 |
| F | 229,161 | 179,901 | 169,646 | 1,740,662 | 15,692 | 25,158 | 4 / 7 | $0.346 |

D: a writer call at medium thought through all 32,768 tokens and wrote nothing ($0.019, in the cost). anthropic-call.js then repeats that call at low, so the first draft on this page was written at low, not at the setup's effort.

E: a writer call at high thought through all 32,768 tokens and wrote nothing ($0.019, in the cost); a retry call at high thought through all 16,000 tokens and wrote nothing ($0.009, in the cost); a retry call at high thought through all 16,000 tokens and wrote nothing ($0.008, in the cost). anthropic-call.js then repeats that call at low, so the first draft on this page was written at low, not at the setup's effort.

F: a writer call at medium thought through all 32,768 tokens and wrote nothing ($0.019, in the cost). anthropic-call.js then repeats that call at low, so the first draft on this page was written at low, not at the setup's effort.

BLOCKs left: F: N6.

## Cheapest setup that matches A

A match is BLOCKs after retries no higher than A's and a judge score no more than 0.25 below A's. That margin is fixed in code as the larger of 0.25 and the median gap between the two readings of one page (0.15 here).

| Page type | A: cost, BLOCKs, score, verdict | Cheapest match | Its cost, BLOCKs, score, verdict | Saving on A | Also at or above A with no margin |
|---|---|---|---|---|---|
| service | $1.064, 1, 7.65, Has a BLOCK | A: sonnet-5-5, high | $1.064, 1, 7.65, Has a BLOCK | 0% | A |
| category | $1.585, 0, 7.50, Ready to edit | E: haiku-5-5, high | $0.197, 0, 7.25, Needs another run | 88% | B, A |
| homepage | $0.710, 0, 7.80, Ready to edit | A: sonnet-5-5, high | $0.710, 0, 7.80, Ready to edit | 0% | A |

## Caching

The system prompt is the core prompt then the client block, which holds the niche entry and the calibration pack, with the breakpoint at the end of the client block (and at the end of the trade facts block on category and service pages). A breakpoint caches everything before it, so a cached writer call covers the core prompt and the niche entry together.

| Page | Core + client block + facts, by count_tokens | Writer cached (write + read, by setup) | Writer uncached input | Retry calls: read, write, uncached (all setups) |
|---|---|---|---|---|
| service | 14,649 | A 14,649+0, B 14,649+0, C 14,649+0, D 14,649+0, E 0+14,649, F 14,649+0 | 12,173 to 12,173 | 9,335,387, 102,944, 1,050,878 |
| category | 36,927 | A 36,927+0, B 36,927+0, C 36,927+0, D 36,927+0, E 0+36,927, F 0+36,927 | 13,206 to 13,206 | 17,780,248, 111,208, 1,131,245 |
| homepage | 15,692 | A 15,692+0, B 15,692+0, C 15,692+0, D 0+15,692, E 0+15,692, F 0+15,692 | 5,727 to 5,727 | 5,521,596, 51,384, 627,224 |

**Prompts over 100k tokens:** none; the largest was 54,416, so Haiku stayed on its lower rate card.

## How to read this

- **A is not what runs live.** The brief calls A the current baseline, but page-models.json and the code before it run every page type at effort medium, which is B. The live setting is unchanged by this test.
- **The judge here is not the usual judge.** The code judge is claude-opus-5-5 at medium; this test used claude-sonnet-5-5 at high as the brief asks. These scores compare with each other, not with earlier rubric scores or the 8.5 bar.
- **Haiku at medium or high often did not write its draft at that effort.** See the notes under each page. D, E and F are what those settings really do under today's retry rule, not a clean reading of the effort on the label.
- **Claims.** The claims review runs on the writer's model, so a weaker writer also marks its own claims. The fixed audit is one claude-sonnet-5-5 medium reading of each finished page: it changes nothing and is the comparable figure.
- **Not in the totals:** one homepage check run on Haiku before the test (about $0.09) and the failed judge calls (not billed).
- Thinking tokens: reported by the API (output_tokens_details) and already inside Output.
- Rate limits: 0 wait(s) of 20 seconds inside the runs.
- Effort lowered by the "ran out of tokens thinking" fallback in anthropic-call.js: service E (3 calls, the first draft included), category E (1 call, the first draft included), category F (1 call, the first draft included), homepage D (1 call, the first draft included), homepage E (3 calls, the first draft included), homepage F (1 call, the first draft included).
- Answered by a fallback model after a refusal: never.
- Output cut off at max_tokens: service E, homepage F.
