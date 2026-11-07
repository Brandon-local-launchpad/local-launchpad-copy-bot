# Every retry on the Sonnet high test pages, by rule

Pages: service-lawn-mowing A, category-gardener A, homepage A, service-lawn-mowing A2, service-lawn-mowing A3, category-gardener A2, category-gardener A3. One retry can carry several rules, so the rule counts add up to more than the retry calls. "Kept" is how many of those rewrites were accepted.

| Page | Run | Retry calls | Kept | Retry cost |
|---|---|---|---|---|
| service-lawn-mowing | A | 28 | 19 | $0.558 |
| category-gardener | A | 34 | 28 | $0.707 |
| homepage | A | 17 | 14 | $0.248 |
| service-lawn-mowing | A2 | 28 | 18 | $0.501 |
| service-lawn-mowing | A3 | 32 | 22 | $0.590 |
| category-gardener | A2 | 37 | 27 | $0.741 |
| category-gardener | A3 | 69 | 37 | $1.432 |

| Rule | Type | Retries | Kept | Runs it hit (of 7) | Where it came from | Today |
|---|---|---|---|---|---|---|
| N7 | FLAG | 123 | 83 | 7 | field round 105, flags 16, targeted 2 | retry list, flag pass |
| N6 | BLOCK | 34 | 20 | 1 | field round 31, targeted 3 | retries |
| PRACTICE | BLOCK | 33 | 24 | 7 | field round 32, targeted 1 | retries |
| N18 | FLAG | 27 | 15 | 7 | field round 23, flags 3, targeted 1 | retry list, flag pass |
| N21 | FLAG | 25 | 17 | 7 | field round 22, flags 2, targeted 1 | retry list, flag pass |
| NUM | BLOCK | 13 | 13 | 6 | field round 13 | retries |
| REPEAT-PAGE | FLAG | 10 | 6 | 6 | field round 10 | retry list, flag pass |
| PAD-OPENER | FLAG | 9 | 5 | 5 | field round 8, flags 1 | retry list, flag pass |
| IDEAS | BLOCK | 6 | 5 | 3 | field round 6 | retries |
| CB-PARA | BLOCK | 4 | 4 | 4 | field round 4 | retries |
| claims review | claims | 4 | 4 | 2 | claims 4 | retries |
| N19 | FLAG | 3 | 1 | 1 | field round 3 | retry list |
| PRICE-FIRST | FLAG | 3 | 3 | 3 | field round 3 | retry list |
| PROMISE | BLOCK | 3 | 1 | 1 | field round 3 | retries |
| N11 | BLOCK | 2 | 2 | 2 | field round 2 | retries |
| N5 | BLOCK | 2 | 2 | 2 | field round 2 | retries |
| CARD-PATTERN | FLAG | 2 | 1 | 1 | field round 2 | retry list |
| LEAK | BLOCK | 1 | 1 | 1 | field round 1 | retries |
| 2 | BLOCK | 1 | 1 | 1 | field round 1 | retries |
| N24 | FLAG | 1 | 1 | 1 | field round 1 | retry list, flag pass |
| OUTCOME | FLAG | 1 | 1 | 1 | field round 1 | retry list, flag pass |
| META-TALK | BLOCK | 1 | 1 | 1 | field round 1 | retries |
| COAST | FLAG | 1 | 1 | 1 | field round 1 | retry list |
| SCENERY | FLAG | 1 | 1 | 1 | field round 1 | retry list, flag pass |
| CARD-LINK | BLOCK | 1 | 1 | 1 | field round 1 | retries |
