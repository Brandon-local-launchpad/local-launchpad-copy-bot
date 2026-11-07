# Sonnet 5.5 high, optimised: Edens Edge, 2026-11-07

Every page type on claude-sonnet-5-5 high with the hard BLOCKs, two retry rounds on BLOCKs and the named flags, hyphens fixed in code, one combined style pass, and the claims review cached. Judge: claude-sonnet-5-5, effort high, two readings averaged, as in the main test. Spent on these runs and their judging: $8.589 (£6.699).

Cost is the writer, retries, style pass and claims review, not the judge or audit. "Batch" on a normal run is half its cost, the discount it would get through the Batch API. The batch run's own cost is what it was billed, and its normal figure is twice that. Verdicts are read under today's rule. Claims come from the audit with the area list, without findings it marks acceptable, re-run on every row. A ran on the old pipeline and old inputs, with location pages linked before they were built, so it isn't a like for like input. R1 and R2 came before the style pass claims check and the fixed FAQ answers.

## Service page: Lawn Mowing Southampton

| Run | Cost | Batch | Time | Retry calls | BLOCKs before → after | Flags after | Style flags cleared | Style sentences put back | Claims left, fixed audit | Judge score (readings) | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A: original | $1.064 | $0.532 | 386s | 28 | 10 → 1 | 1 | not run | - | 3 | 7.65 (7.6, 7.7) | Has a BLOCK |
| Rerun 1 | $1.110 | $0.555 | 424s | 15 | 16 → 0 | 8 | 9 of 17 | - | 3 | 7.30 (7.3, 7.3) | Ready to edit |
| Rerun 2 | $0.953 | $0.477 | 423s | 14 | 17 → 2 | 7 | 13 of 20 | - | 3 | 7.30 (7.3, 7.3) | Has a BLOCK |
| Batch run | $1.021 | $0.511 | 4798s | 15 | 8 → 0 | 3 | 11 of 14 | - | 6 | 7.30 (7.4, 7.2) | Ready to edit |

Average of R1 and R2: $1.032, 15 retry calls, BLOCKs left 1.0, claims 3.0, score 7.30.

BLOCKs left: A: original: PRACTICE; Rerun 2: PRACTICE, PRACTICE.

## Category page: Gardener Southampton

| Run | Cost | Batch | Time | Retry calls | BLOCKs before → after | Flags after | Style flags cleared | Style sentences put back | Claims left, fixed audit | Judge score (readings) | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A: original | $1.585 | $0.792 | 423s | 34 | 8 → 0 | 0 | not run | - | 3 | 7.50 (7.4, 7.6) | Ready to edit |
| Rerun 1 | $0.866 | $0.433 | 392s | 7 | 10 → 0 | 3 | 17 of 20 | - | 0 | 7.80 (7.8, 7.8) | Ready to edit |
| Rerun 2 | $1.090 | $0.545 | 384s | 6 | 9 → 0 | 7 | 22 of 29 | - | 1 | 7.50 (7.4, 7.6) | Ready to edit |
| Batch run | $0.956 | $0.478 | 4798s | 6 | 7 → 0 | 5 | 20 of 25 | - | 4 | 7.30 (7.3, 7.3) | Ready to edit |

Average of R1 and R2: $0.978, 7 retry calls, BLOCKs left 0.0, claims 0.5, score 7.65.

## Homepage

| Run | Cost | Batch | Time | Retry calls | BLOCKs before → after | Flags after | Style flags cleared | Style sentences put back | Claims left, fixed audit | Judge score (readings) | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A: original | $0.710 | $0.355 | 272s | 17 | 3 → 0 | 0 | not run | - | 1 | 7.80 (7.8, 7.8) | Ready to edit |
| Rerun 1 | $0.518 | $0.259 | 235s | 4 | 4 → 0 | 2 | 11 of 13 | - | 7 | 7.50 (7.4, 7.6) | Ready to edit |
| Rerun 2 | $0.480 | $0.240 | 275s | 2 | 0 → 0 | 0 | 12 of 12 | - | 6 | 7.75 (7.9, 7.6) | Ready to edit |
| Batch run | $0.561 | $0.280 | 4798s | 4 | 1 → 0 | 3 | 4 of 7 | - | 5 | 7.30 (7.2, 7.4) | Ready to edit |

Average of R1 and R2: $0.499, 3 retry calls, BLOCKs left 0.0, claims 6.5, score 7.63.

## Where the service page cost goes

Thinking is inside output. No run's draft came near 64,000 tokens, so raising the limit did not raise the cost: you pay for the tokens used, not the limit.

| Run | Writer draft | Draft output tokens | Of which thinking | Retries | Style pass | Claims review | Total |
|---|---|---|---|---|---|---|---|
| A | $0.449 | 38,804 | 35,804 | $0.558 | $0.000 | $0.057 | $1.064 |
| R1 | $0.460 | 39,700 | 36,671 | $0.446 | $0.056 | $0.149 | $1.110 |
| R2 | $0.532 | 46,912 | 43,854 | $0.285 | $0.092 | $0.045 | $0.953 |

## Caching

Share of prompt tokens read from cache. The core prompt, rules and niche entry sit in the cached part of the writer and every retry; the claims prompt and facts are now cached too.

| Page | Run | All calls | Writer read + write | Retry calls with a cache read | Retry hit rate | Claims hit rate | Style call hit rate |
|---|---|---|---|---|---|---|---|
| service | A | 85.3% | 0 + 14649 | 28 of 28 | 90.1% | 0.0% | none |
| service | R1 | 74.1% | 0 + 15232 | 15 of 15 | 79.1% | 65.0% | 87.0% |
| service | R2 | 85.2% | 0 + 15232 | 14 of 14 | 90.2% | 86.7% | 86.7% |
| service | BT | 80.5% | 0 + 15232 | 15 of 15 | 87.5% | 65.0% | 87.8% |
| category | A | 85.5% | 0 + 36927 | 34 of 34 | 93.9% | 0.0% | none |
| category | R1 | 85.3% | 0 + 37510 | 7 of 7 | 93.9% | 92.8% | 91.6% |
| category | R2 | 66.0% | 0 + 37510 | 6 of 6 | 77.1% | 46.6% | 91.0% |
| category | BT | 74.0% | 0 + 37510 | 6 of 6 | 89.9% | 46.5% | 91.1% |
| homepage | A | 77.4% | 0 + 15692 | 17 of 17 | 89.3% | 0.0% | none |
| homepage | R1 | 59.7% | 0 + 16322 | 4 of 4 | 70.8% | 41.4% | 86.8% |
| homepage | R2 | 73.2% | 0 + 16322 | 2 of 2 | 89.3% | 82.8% | 87.2% |
| homepage | BT | 69.1% | 0 + 16322 | 4 of 4 | 83.3% | 62.2% | 87.9% |

## Batch timing

The three pages through the Batch API took 80 minutes from start to finish, in 25 batches, one for each round of model calls.

| Batch | Requests | Time |
|---|---|---|
| 1 | 1 | 261s |
| 2 | 2 | 306s |
| 3 | 1 | 108s |
| 4 | 1 | 77s |
| 5 | 1 | 108s |
| 6 | 1 | 123s |
| 7 | 1 | 123s |
| 8 | 1 | 123s |
| 9 | 1 | 123s |
| 10 | 1 | 353s |
| 11 | 6 | 385s |
| 12 | 1 | 169s |
| 13 | 1 | 200s |
| 14 | 1 | 92s |
| 15 | 1 | 339s |
| 16 | 8 | 370s |
| 17 | 3 | 323s |
| 18 | 1 | 93s |
| 19 | 2 | 322s |
| 20 | 1 | 46s |
| 21 | 1 | 124s |
| 22 | 1 | 123s |
| 23 | 1 | 123s |
| 24 | 1 | 123s |
| 25 | 1 | 108s |

