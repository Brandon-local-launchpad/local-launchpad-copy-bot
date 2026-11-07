# Legal pages in Copybot: build brief (v1, 7 Nov 2026)

Scope: make sure Copybot fills and pushes the three legal pages (Privacy Policy, Service Terms, Website Terms of Use) from the client's onboarding answers, and add four new onboarding fields that change what the Service Terms say. Work on its own branch (`legal`). Live client sites are off limits: fake WordPress server first, then staging only, until Brandon says otherwise.

## Stage 0: tell me what exists (no code)

Before changing anything, reply with:

1. Does Copybot already have a legal page type? If yes: where the templates live, how tokens and IF sections are filled, and whether the WordPress push includes these pages and sets `legal_last_updated`.
2. If no: a plan for adding it, copying the existing page type patterns (decisions, fill, validator, dry run, push with safety checks, rollback, fake server). Do not invent new patterns.
3. How the Fillout webhook maps form fields to client keys today, and where a new field gets added.
4. Anything in this brief that conflicts with how the codebase works now.

Wait for approval before Stage 1.

## The one rule for legal pages

The legal pages are fixed template text. The model never writes or rewords them. Code fills `[CV: key]` tokens and switches `(IF ...) ... (END IF)` sections on or off. Nothing else. If a token has no value and no default, the page is held, never published with a gap.

## Stage 1: new onboarding fields

Four new fields on the Fillout "Quotes and response" page. Get the field IDs from the webhook payload; the keys are:

| Key | Type | Used by |
| --- | --- | --- |
| `uses_subcontractors` | yes/no | Service Terms section 6 |
| `late_payment_interest` | yes/no | Service Terms section 5 |
| `standard_terms_confirmed` | yes/no, stored with the date and time it was received | Record of client sign-off |
| `standard_terms_exceptions` | long text, optional | Hold rule below |

- Map all four in the webhook intake, the same way existing fields are mapped.
- Store `standard_terms_confirmed` with its timestamp on the client record and never overwrite an earlier confirmation; keep a history. This is the written record if a client later disputes the terms.
- Existing clients who haven't answered: default `uses_subcontractors` and `late_payment_interest` to yes, `standard_terms_confirmed` to blank.

## Stage 2: Service Terms conditions

- Section 5, the line "If a payment is late, we may charge interest at 8% a year..." shows only if `late_payment_interest = yes`.
- Section 6, the line "We may use trusted subcontractors for parts of the work..." shows only if `uses_subcontractors = yes`.
- Section 1, "We hold public liability insurance of..." shows only if the insurance amount is filled.
- Section 8 (guarantee): if `guarantee_months` is blank, keep the heading and replace the section's text with "We do not offer a separate guarantee. Your legal rights under the Consumer Rights Act 2015 still apply." Don't remove the section, so the numbering and clause 15's references to clauses 4 and 9 stay correct.
- Section 4, third paragraph: after "you must ask us in writing (a text or email is fine)" add "and confirm you understand you will lose the right to cancel once the work is finished".

## Stage 3: hold rule (F-LEGAL)

Hold all three legal pages (do not push, or push as draft) and raise F-LEGAL with the reason when any of these is true:

- `standard_terms_exceptions` is not blank. Brandon reads it and adjusts the wording by hand, then clears the flag.
- `standard_terms_confirmed` is not yes.
- Any `[CV:` token, `(IF` or `(END IF)` text is left in the filled output.

## Stage 4: template fixes found in review

- **Token names.** The templates and the custom values sheet use different keys for the same thing. Map one to the other, or rename in the templates, so nothing publishes raw:
  - `business_name` → `company_name`
  - `registered_address` → `registered_office`
  - `company_jurisdiction` → `jurisdiction`
  - `pl_insurance_amount` → `insurance_cover`
  - `business_address` → `address`
  List any other token in the three templates that has no matching key.
- **Privacy Policy section 4**, row "Measure how the website is used": legal basis becomes the fixed text "Your consent, given through the cookie banner." Remove the `analytics_consent` condition; that key doesn't exist.
- **Privacy Policy section 7 cookie table**: the Google Ads and Meta Pixel rows show or hide as whole rows (on `google_ads` and `meta_pixel`). The IF text must not sit inside table cells.
- **Privacy Policy section 8**: website analytics retention "Up to 14 months".

## Stage 5: test

On the fake server, run three test clients and show Brandon the filled pages for each:

1. Sole trader, both new questions yes, confirmation ticked, exceptions blank: all three pages push, no residue.
2. Limited company, both questions no, no insurance, no guarantee: the four conditional lines are gone, numbering and clause references still make sense.
3. Exceptions box filled: pages held, F-LEGAL raised with the reason.

Each test also searches the output for `[CV:`, `(IF`, `(END IF)` and `Lorem`. None allowed.
