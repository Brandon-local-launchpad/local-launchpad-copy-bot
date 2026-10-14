# Allocation Pass Prompt — CORE (2)

(2): neighbourhoods are chosen first, on their own merits, before symptoms. "Different parts" means not sharing a border. Symptoms only have to fit their question.

Used once per client, after the primary city dossier is saved. Picks the local material the homepage may use. Code builds the message, checks every pick and owns the final result.

---

You choose local research items for one page of a trade business's website. You are not writing copy. You return JSON only.

## WHAT YOU RECEIVE

- CLIENT: the trade, the primary city, the client's GBP categories, and the jobs the client wants more of (may be blank).
- PAGE: the page you are choosing for (homepage).
- LOCATION OVERVIEW: the city's character and how its sub-areas sit and differ. Use it to judge where each neighbourhood is.
- SYMPTOM SLOTS: the FAQ questions that need a local symptom, each with its slot name.
- NEIGHBOURHOODS: the neighbourhood profiles you may choose from, with their IDs. Code has already removed any profile with no sourced detail.
- SYMPTOMS: the symptoms you may choose from, with their IDs, the customer's words and the linked issue. Code has already removed symptoms that are urgent when they must not be, or whose issue is not tagged with one of the client's categories.
- ISSUES: the local issues those symptoms link to.
- RULES & COUNCIL: designations and rules, with the neighbourhood IDs they apply to.

## HOW TO CHOOSE

Work in two steps. Finish step 1 before you look at the symptoms.

**Step 1. Neighbourhoods: exactly 2, chosen on their own merits.** Ignore the symptom slots, the symptoms and the issues while you choose.
1. Choose the profiles with the most concrete detail for this trade's work: plot sizes, garden types, build era, ground. A profile that mainly records risks or incidents, without saying what the homes and gardens are like, is weaker.
2. The two must be in genuinely different parts of the city, which means they never share a border. Two neighbourhoods next to each other, or one inside the other, is wrong. Judge this from the LOCATION OVERVIEW and the profiles.
3. Prefer neighbourhoods that fit the client's jobs wanted. When jobs wanted is blank, rule 1 decides.
4. Never pick a neighbourhood whose profile is mostly commercial or industrial land.
5. If fewer than 2 neighbourhoods can meet these rules, return only those that do. Never pick a weak one to make up the number.

**Conservation areas.** For each neighbourhood you picked, decide whether it is (or contains) a conservation area or is covered by an Article 4 direction, using the RULES & COUNCIL entries and the profile text. List the IDs of those that are. Only list a neighbourhood you picked. Never guess: if nothing in the material says so, leave it out.

**Step 2. Symptoms: one per symptom slot.**
1. The symptom must fit the slot's question. Its meaning must match what the question asks about, even if the words differ ("the patio floods by the back door" fits "Why does water sit on my patio or lawn after rain?"; "the fence leans" does not).
2. The symptom does not need to come from the neighbourhoods you picked. It only has to fit the question. Pick the one that fits it best.
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
