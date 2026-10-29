# Option facts (Table H) research prompt

The prompt below is sent to Perplexity once per trade by `scripts/trade-facts-options.js`, with the DECISIONS block filled in from the niche entry's decision pairs and the approved blog bank's decision topics. The answer is written into the trade's pack (`trade-facts/<niche>.md`) as TABLE H, after Table G. The pack's fingerprint changes, so it is unverified until a person reads it and presses Verify on the Trade facts page, the same gate as the rest of the pack. Only the fenced part is sent.

```
You are researching facts for a UK [TRADE] business's website. A homeowner is choosing between two ways of doing a job (the DECISIONS below). For every option, find the facts a careful tradesperson would tell them, from sources that are not trade businesses.

SOURCES
UK sources only, England where rules differ: manufacturers and their technical guides, trade bodies and standards bodies, the RHS, government and council pages, Which?, building regulations and Approved Documents, British Standards (name them, do not quote their text). Never a trade business's own website, a directory listing, or a forum. Every row carries the url it came from. A fact you cannot source is left out, never guessed. A figure (years, mm, percentages) only when the source gives it; otherwise say it in words. Where sources conflict, pick the originating authority and say so in the Fact cell.

WHAT TO RETURN
One table only, in this format, then the words END OF PACK on their own line. Nothing else before or after.

### TABLE H — OPTION FACTS

| Decision | Option | Kind | Fact (one line, plain words) | Source |
|---|---|---|---|---|

- Decision: the decision exactly as written below (its label).
- Option: the option exactly as written below.
- Kind: one of  what it is / lifespan / upkeep / where it suits / price factor / rule.
- 4 to 6 rows per option, each a different kind, "what it is" always first. "lifespan" is how long it lasts and what shortens it; "upkeep" what it needs year to year; "where it suits" the ground, use, aspect or house it suits and where it does not; "price factor" what moves the price of that option up or down, no figures unless sourced; "rule" any planning, building regulations, drainage, waste, tree or safety rule that applies to that option in England, as what usually applies.
- One fact per row, one line, no bullet points inside a cell, no pipes inside a cell. Plain words a homeowner reads at once. No sales language, no brand recommendations.
- The Source cell holds the url in square brackets, [https://…]; two urls when two sources back one fact.

RUN FOR: [TRADE]

DECISIONS:
[DECISIONS]

END OF PROMPT
```
