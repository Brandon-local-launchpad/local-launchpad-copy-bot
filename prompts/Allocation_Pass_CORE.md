# Allocation Pass Prompt — CORE (1)

Used once per client, after the primary city dossier is saved. Picks the local material the homepage may use. Code builds the message, checks every pick and owns the final result.

---

You choose local research items for one page of a trade business's website. You are not writing copy. You return JSON only.

## WHAT YOU RECEIVE

- CLIENT: the trade, the primary city, the client's GBP categories, and the jobs the client wants more of (may be blank).
- PAGE: the page you are choosing for (homepage).
- SYMPTOM SLOTS: the FAQ questions that need a local symptom, each with its slot name.
- NEIGHBOURHOODS: the neighbourhood profiles you may choose from, with their IDs. Code has already removed any profile with no sourced detail.
- SYMPTOMS: the symptoms you may choose from, with their IDs, the customer's words and the linked issue. Code has already removed symptoms that are urgent when they must not be, or whose issue is not tagged with one of the client's categories.
- ISSUES: the local issues those symptoms link to.
- RULES & COUNCIL: designations and rules, with the neighbourhood IDs they apply to.

## HOW TO CHOOSE

**Neighbourhoods: exactly 2.**
1. Pick from different parts of the city. Two neighbourhoods side by side, or both in the city centre, is wrong. Use the profile text and the overview of where each sits.
2. Each must have a concrete, sourced detail the copywriter can use: a size, a street, a type of home or garden, a build era, a ground condition. Prefer the profile whose detail says most about this trade's work.
3. Prefer neighbourhoods that fit the client's jobs wanted. When jobs wanted is blank, prefer neighbourhoods whose homes generate the most work across the client's categories.
4. Never pick a neighbourhood whose profile is mostly commercial or industrial land.
5. If fewer than 2 neighbourhoods can meet these rules, return only those that do. Never pick a weak one to make up the number.

**Conservation areas.** For each neighbourhood you pick, decide whether it is (or contains) a conservation area or is covered by an Article 4 direction, using the RULES & COUNCIL entries and the profile text. List the IDs of those that are. Only list a neighbourhood you picked. Never guess: if nothing in the material says so, leave it out.

**Symptoms: one per symptom slot.**
1. The symptom must fit the slot's question. Its meaning must match what the question asks about, even if the words differ ("the patio floods by the back door" fits "Why does water sit on my patio or lawn after rain?"; "the fence leans" does not).
2. Prefer a symptom whose linked issue is strongest in the neighbourhoods you picked.
3. If no symptom fits a slot, leave that slot out. Never force a poor fit.

## OUTPUT

Return this JSON and nothing else. No markdown fences, no commentary.

{
  "homepage": {
    "neighbourhoods": ["<ID>", "<ID>"],
    "symptoms": { "<slot>": "<symptom ID>" },
    "conservation_areas": ["<ID>"],
    "reasons": "<one line per pick, separated by newlines: the ID, then why it was chosen>"
  }
}

Use only IDs that appear in the material you were given.
