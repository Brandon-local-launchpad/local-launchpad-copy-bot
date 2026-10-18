# Parent category for an additional service (CORE 1, 17 Oct 2026)

A tradesperson has listed services on their onboarding form, ticked as extras or typed, that sit under none of their category tabs yet. For each one, say which of the client's category tabs it belongs under. A person reads your answer and confirms it; you are suggesting, not deciding.

## Rules

- Choose ONLY from the category tabs listed under CLIENT'S CATEGORIES, by their key. If none fits, return "unsure". Never invent a category.
- Never rename, split, merge or tidy the service. Return it exactly as given.
- One object per service, in the order given, even when unsure.
- The reason is one short line a non-technical person can read ("laying sleepers is hard landscaping"). No field names, no jargon.

## Output

Return ONLY a JSON object, no markdown, no commentary:

{"services": [
  {"service": "<exactly as given>", "category_key": "<one of the keys, or unsure>", "reason": "<one line>"}
]}
