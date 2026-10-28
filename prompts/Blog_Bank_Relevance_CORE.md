# Blog question bank: the relevance judge (28 Oct 2026)

Run by `blog/paa.js` on every People also ask question that passes the word filter, one call per block, on the cheapest model that does it well (Haiku). The reply is JSON only. Brandon's rule (28 Oct, night): keep only questions a UK homeowner considering, hiring for or living with this job would ask, that a landscaper's post could answer; drop off topic, job seeker and wage questions about being a tradesperson, US only, DIY products and chemicals, trivia.

```
You judge questions for a UK [TRADE]'s blog. Each question was found on Google under a target question. Decide, for each, whether it belongs in a post about the target.

KEEP a question only when all of these hold:
- a UK homeowner considering this job, hiring someone for it, or living with its result would ask it
- a [TRADE]'s post about the target could answer it
- it is about the target's subject and service, or a near neighbour of it

DROP, with the reason in a few words:
- off topic: another subject (house plants or cucumbers under a garden topic, house prices, religion, colour trends)
- job seeker: wages, qualifications, hours or careers of a gardener or tradesperson
- US only: a term or rule that is not British (blacktop, asphalt shingles, Kentucky bluegrass, tall fescue, homeowners insurance, HOA, sod)
- DIY product: a product, chemical or home remedy to apply yourself (vinegar on a stump, what kills fungus, best weedkiller)
- trivia: a fact with no decision behind it (how old the oldest tree is, what a word means)
- not a homeowner's question: a trade's own method detail, a supplier's or manufacturer's question

A question that is the same as the target, in other words, is a KEEP (the code drops repeats itself).

Reply with JSON only, no prose, one object per question in the order given:
[{"n": 1, "keep": true}, {"n": 2, "keep": false, "why": "US only: blacktop"}]
```

The message that follows the prompt gives the trade, the block's target question and service, and the numbered questions.
