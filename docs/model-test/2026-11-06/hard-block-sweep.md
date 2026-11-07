# Hard BLOCK sweep over the old pages

The new checks run over the 18 main test pages and the 6 Haiku high repeats, as they were written. Nothing was rewritten. A cell is the number of fields that fail; a blank passes.

## Service page: Lawn Mowing Southampton

| Setup | LABEL-LEAK | TRUNCATED | EMPTY-SECTION | LINK-MAP | RAW-VALUE | SECTION-REF | ANCHOR-FORCED | Cut calls in the log | Result |
|---|---|---|---|---|---|---|---|---|---|
| A: sonnet-5-5, high |  |  |  |  |  |  |  |  | pass |
| B: sonnet-5-5, medium |  |  |  |  | 2 |  |  |  | FAIL |
| C: sonnet-5-5, low |  |  |  |  |  |  |  |  | pass |
| D: haiku-5-5, medium | 3 |  |  |  |  |  | 1 |  | FAIL |
| E: haiku-5-5, high | 2 |  |  |  |  |  |  | 1 | FAIL |
| F: hybrid: haiku-5-5 medium, BLOCKs sonnet-5-5 medium | 7 |  |  |  |  | 2 |  |  | FAIL |
| E2: haiku-5-5, high, repeat 1 | 5 |  |  |  |  |  | 1 | 1 | FAIL |
| E3: haiku-5-5, high, repeat 2 | 4 |  |  |  |  |  | 1 |  | FAIL |

## Category page: Gardener Southampton

| Setup | LABEL-LEAK | TRUNCATED | EMPTY-SECTION | LINK-MAP | RAW-VALUE | SECTION-REF | ANCHOR-FORCED | Cut calls in the log | Result |
|---|---|---|---|---|---|---|---|---|---|
| A: sonnet-5-5, high | 1 |  |  |  |  |  |  |  | FAIL |
| B: sonnet-5-5, medium |  |  |  |  |  |  |  |  | pass |
| C: sonnet-5-5, low |  |  |  |  |  |  |  |  | pass |
| D: haiku-5-5, medium | 5 |  |  |  |  |  | 1 |  | FAIL |
| E: haiku-5-5, high |  |  |  |  |  | 2 |  |  | FAIL |
| F: hybrid: haiku-5-5 medium, BLOCKs sonnet-5-5 medium | 6 |  |  |  |  |  |  |  | FAIL |
| E2: haiku-5-5, high, repeat 1 | 3 |  |  |  |  |  |  |  | FAIL |
| E3: haiku-5-5, high, repeat 2 |  |  |  |  |  |  |  |  | pass |

## Homepage

| Setup | LABEL-LEAK | TRUNCATED | EMPTY-SECTION | LINK-MAP | RAW-VALUE | SECTION-REF | ANCHOR-FORCED | Cut calls in the log | Result |
|---|---|---|---|---|---|---|---|---|---|
| A: sonnet-5-5, high | 1 |  |  |  |  |  |  |  | FAIL |
| B: sonnet-5-5, medium |  |  |  |  |  |  |  |  | pass |
| C: sonnet-5-5, low |  |  |  |  |  |  |  |  | pass |
| D: haiku-5-5, medium | 2 |  |  |  |  |  |  |  | FAIL |
| E: haiku-5-5, high |  |  |  |  |  |  | 1 |  | FAIL |
| F: hybrid: haiku-5-5 medium, BLOCKs sonnet-5-5 medium | 5 | 1 | 14 |  |  |  |  | 1 | FAIL |
| E2: haiku-5-5, high, repeat 1 | 2 | 1 |  |  |  |  | 1 | 1 | FAIL |
| E3: haiku-5-5, high, repeat 2 |  | 1 | 9 |  |  |  | 1 | 1 | FAIL |

## Every failure

**service-lawn-mowing, B**

- RAW-VALUE · step_body (We Start on a Date That Suits You): [CV: start_time] reads as "same week", which needs "the" before it. Write "the [CV: start_time]" or reword the sentence.
- RAW-VALUE · svc_final_cta_body: "going by [CV: start_time]" doesn't read. Say it in a full phrase, such as "we can usually start the same week".

**service-lawn-mowing, D**

- LABEL-LEAK · svc_hero_intro: The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- ANCHOR-FORCED · svc_content_body: "in [lawn mowing in Hedge End]" doesn't read as English. Link the town name alone ("in [Hedge End](/locations/hedge-end/gardener)"), or write the sentence so "lawn mowing in Hedge End" reads naturally.
- LABEL-LEAK · step_body (We Price Your Job): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · faq_answer (When should lawn mowing start for the year?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.

**service-lawn-mowing, E**

- LABEL-LEAK · svc_content_body: The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · faq_answer (How much does a lawn mowing visit cost in Southampton?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.

**service-lawn-mowing, F**

- LABEL-LEAK · svc_content_body: The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · block4 card_body (Growth has got ahead of you): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · block4 card_body (It keeps coming back): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · svc_cost_intro: The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · block5 card_body (How much is in the way): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- SECTION-REF · block5 card_body (Extras you add to the visit): "sibling pages" is an internal word or points at another part of the page. Say the point itself, in the customer's words.
- SECTION-REF · faq_answer (How much does a lawn mowing visit cost in Southampton?): This names another section by its heading ("How We Price Lawn Mowing Visits in Southampton"). Say the point itself; never point at another part of the page.
- LABEL-LEAK · faq_answer (Are you insured for lawn mowing?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · faq_answer (Do I need to be home for a lawn mowing visit?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.

**service-lawn-mowing, E2**

- LABEL-LEAK · svc_included_intro: The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- ANCHOR-FORCED · svc_content_body: "in [lawn mowing in Hedge End]" doesn't read as English. Link the town name alone ("in [Hedge End](/locations/hedge-end/gardener)"), or write the sentence so "lawn mowing in Hedge End" reads naturally.
- LABEL-LEAK · block5 card_body (How much is in the way): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · block5 card_body (The first visit): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · svc_areas_intro: The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · faq_answer (Do I need to be home for a lawn mowing visit?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.

**service-lawn-mowing, E3**

- ANCHOR-FORCED · svc_content_body: "in [lawn mowing in Hedge End]" doesn't read as English. Link the town name alone ("in [Hedge End](/locations/hedge-end/gardener)"), or write the sentence so "lawn mowing in Hedge End" reads naturally.
- LABEL-LEAK · step_body (We Price Your Job): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · svc_cost_intro: The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · svc_areas_intro: The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · faq_answer (Are you insured for lawn mowing?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.

**category-gardener, A**

- LABEL-LEAK · block4 card_body (Leaves and debris burying the lawn): The copy contains the prompt label "block4". Return only the words a reader sees.

**category-gardener, D**

- LABEL-LEAK · card_text (Lawn mowing): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- ANCHOR-FORCED · cat_content_body: "in [gardener in Winchester]" doesn't read as English. Link the town name alone ("in [Winchester](/locations/winchester/gardener)"), or write the sentence so "gardener in Winchester" reads naturally.
- LABEL-LEAK · block4 card_body (Hedges that have got away): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · block4 card_body (Weeds that come straight back): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · block5 card_body (Green waste): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · faq_answer (Do you garden all year round?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.

**category-gardener, E**

- SECTION-REF · faq_answer (How much does gardening cost in Southampton?): This names another section by its heading ("What Affects the Cost of Gardening in Southampton"). Say the point itself; never point at another part of the page.
- SECTION-REF · faq_answer (How much does gardening cost in Southampton?): "explains the rest" is an internal word or points at another part of the page. Say the point itself, in the customer's words.

**category-gardener, F**

- LABEL-LEAK · card_text (Fencing): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · block4 card_body (Hedges that have got away): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · block5 card_body (How often we visit): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · step_body (We Start on a Date That Suits You): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · faq_answer (What does a gardening visit include?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · faq_answer (How do regular visits work?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.

**category-gardener, E2**

- LABEL-LEAK · card_text (Lawn mowing): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · step_body (Tell Us About Your Garden): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · step_body (We Start on a Date That Suits You): The copy contains the prompt label "RETURN:". Return only the words a reader sees.

**homepage, A**

- LABEL-LEAK · card_text (Paving Contractor): The copy contains the prompt label "card:". Return only the words a reader sees.

**homepage, D**

- LABEL-LEAK · faq_answer (How much does landscaping cost in Southampton?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · faq_answer (Are you insured?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.

**homepage, E**

- ANCHOR-FORCED · home_content_block_body: "in [landscaping in Romsey]" doesn't read as English. Link the town name alone ("in [Romsey](/locations/romsey)"), or write the sentence so "landscaping in Romsey" reads naturally.

**homepage, F**

- LABEL-LEAK · card_text (Landscape Gardener): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · card_text (Landscape Designer): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · point_body (Insured up to £5m): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · faq_answer (What happens if something isn't right after the job?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- LABEL-LEAK · faq_answer (Is the quote free and no obligation?): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- EMPTY-SECTION · page: A section came back with nothing in it: home_services_intro is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_services_more_line is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_owner_body is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_areas_intro is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_final_cta_body is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_services_cards is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_services_cards: expected 6 item(s), got 0.
- EMPTY-SECTION · page: A section came back with nothing in it: home_why_points is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_why_points: expected 4 item(s), got 0.
- EMPTY-SECTION · page: A section came back with nothing in it: home_process_steps is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_process_steps: expected 3 item(s), got 0.
- EMPTY-SECTION · page: A section came back with nothing in it: home_faq_items is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_faq_items: expected 8 item(s), got 0.
- EMPTY-SECTION · page: A section came back with nothing in it: MODEL_FLAGS is missing from the output.
- TRUNCATED · page: The first draft hit the output limit, so the last fields may be cut off.

**homepage, E2**

- TRUNCATED · home_content_block_body: This stops without finishing its sentence ("…eeds attention, call [CV: phone] and we'"). End on a complete sentence.
- LABEL-LEAK · step_body (We Price Your Job): The copy contains the prompt label "RETURN:". Return only the words a reader sees.
- ANCHOR-FORCED · faq_answer (Which areas do you cover?): "in [landscaping in Winchester]" doesn't read as English. Link the town name alone ("in [Winchester](/locations/winchester/)"), or write the sentence so "landscaping in Winchester" reads naturally.
- LABEL-LEAK · home_final_cta_body: The copy contains the prompt label "RETURN:". Return only the words a reader sees.

**homepage, E3**

- ANCHOR-FORCED · home_content_block_body: "in [landscaping in Romsey]" doesn't read as English. Link the town name alone ("in [Romsey](/locations/romsey)"), or write the sentence so "landscaping in Romsey" reads naturally.
- EMPTY-SECTION · page: A section came back with nothing in it: home_owner_body is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_areas_intro is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_final_cta_body is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_why_points item 4 (Family Run and Independent) has no point_body.
- EMPTY-SECTION · page: A section came back with nothing in it: home_process_steps is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_process_steps: expected 3 item(s), got 0.
- EMPTY-SECTION · page: A section came back with nothing in it: home_faq_items is missing from the output.
- EMPTY-SECTION · page: A section came back with nothing in it: home_faq_items: expected 8 item(s), got 0.
- EMPTY-SECTION · page: A section came back with nothing in it: MODEL_FLAGS is missing from the output.
- TRUNCATED · page: The first draft hit the output limit, so the last fields may be cut off.
