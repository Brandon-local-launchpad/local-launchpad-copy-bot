New feature: in-house citations module for Copybot. The full spec is in docs/citations/Citations_Build_Decisions.md; read it first. The directory seed data is in data/citations/ (one CSV per tab of the UK Citations Master List). Work on a new branch off main; open a PR into main and confirm base=main via the API.

Before writing any code, give me:
1. A status report from the code, not memory, of what this can reuse: client values / NAP panel on the GBP tab, the Locations tab's approved town list, the competitor check, the DataForSEO client, the Perplexity runner, and the UI shell and tables.
2. A staged build plan with rough effort per stage, and a list of the CSV files you found with their columns and row counts.
Don't build until I approve the plan.

Stages I expect:

1. DIRECTORY DATABASE (Directories page in the sidebar)
- Seed from every CSV in data/citations/. Skip header and section rows. Map each tab to a tier: uk_core, uk_secondary, location (tied to towns, councils or areas), trade_niche (tied to niches from the niche library).
- Columns per the decisions doc: name, url, tier, type, DA, cost (free / paid / membership), priority (P1/P2/P3), verification_method (email / code / phone / postcard / none / unknown), done_by (va / client / client_decision), applies_to, skip_for_service_area, needs_live_check, notes.
- Editable in the UI, with add / edit / retire.

2. CLIENT CITATIONS TAB (on the client page)
- Master NAP record at the top, read from client values; it must match the GBP character for character. Show the client's listings email: <client-slug>@listings.locallaunchpad.co.uk.
- One block per tier, P1 first. The location block uses the client's approved town list. The trade block uses the client's niche. Hide skip_for_service_area rows for service-area businesses.
- Per row: listed? (yes / no / unchecked), live URL, NAP ok? (match / mismatch with the differing fields / unchecked), status (not started, submitted, awaiting email verification, awaiting approval, live, wrong location, needs fixing, waiting on client, client declined), done_by, last scanned, notes, and the 1Password item name (never store passwords).
- Facebook and Instagram rows take the page links from onboarding.
- Stat tiles: core completion %, overall completion %, NAP mismatches, wrong location, needs review, waiting on client.

3. SCAN (button: Scan directories)
- For each directory in the client's list, find the listing: DataForSEO SERP on the directory domain with the business name, then the phone number as a fallback; plus DataForSEO backlinks to the client's domain matched against directory domains.
- Fetch each listing found and compare name, address, phone and website with the master NAP record. Record the mismatching fields. Low-confidence matches go to "needs review" rather than guessing.
- Log cost per scan from DataForSEO usage.

4. COMPETITOR GAP (button: Find gaps)
- Top 3 map-pack competitors for the client's primary keyword in the base town (reuse the competitor check).
- Their referring domains from DataForSEO backlinks, filtered to UK directory / citation sites: known directory domains first, then classify the rest with a cheap model call. Drop non-UK, spammy or non-indexed domains.
- Show what competitors have and the client doesn't, with how many of the 3 have it, DA and cost. One click adds a directory to the database (asking tier and priority).

5. EXCLUSIVITY CHECK
- Warn when two clients in the same niche have overlapping approved town lists.

6. LISTINGS INBOX
- Gmail API on listings@locallaunchpad.co.uk only (OAuth, read and modify scopes); store the refresh token in Railway env vars. Give me step-by-step instructions for creating the Google Cloud OAuth client when you reach this stage.
- Poll inbox and spam every minute. Match the client by the recipient address (To header or X-Gm-Original-To) and the directory by sender domain. Only act on known directory sender domains.
- Open plain confirmation links automatically; show codes and browser-bound links on the row; update the row status.

7. PREFILLED SUBMISSION PACKS
- Per directory: fields from the master NAP record and client values, cut to that site's limits, with copy buttons and logo / photo downloads.

UI REFERENCE
Screenshots of the target look are in docs/citations/ui-reference/ (dlm-client-1.png, dlm-client-2.png): the WEBRIS Directory Listing Manager. Match that layout inside Copybot's existing shell and design tokens:
- Client header card: business name, website, phone, address, all locations, and a "Scan directories" button top right.
- Stat tiles in a row: Core completion % with bar and "x of y", Overall completion %, Wrong location, NAP status ("x mismatch, y unchecked"), Low confidence / needs review, plus Waiting on client.
- A red "NAP issues" banner listing each mismatch in plain words, e.g. "Yell: phone mismatch: listing shows 023 8000 0000, expected 07580 000000".
- Filter dropdowns above the table: All directories (tier), All statuses, All actions (done_by).
- One table per tier with a count badge ("UK Core 20/20"). Directory name with small tags (tier, Free / Paid / Membership). Columns: Listed?, Listing URL (editable inline), NAP OK? (Yes / Mismatch / Unchecked, with a Verify link), Status pill (Live green, Not found orange, Wrong location red), Action dropdown, Last scanned, and Scan / Edit per row.
- Their "Stakeholder" columns are for individual lawyers' profiles; we don't need them. Use that space for "Done by" and the 1Password item name instead.
- Multi-location clients later: "x of y loc" in the Listed? column, as in their tool. Build the data model so a client can have more than one location, but one location is enough for now.

Tests: seed import, tier filtering, NAP comparison (+44 vs 0, "Ltd", address formats), the gap filter, the exclusivity check and inbox matching (use recorded sample emails). After stage 4, run a scan and gap check on Edens Edge and report the results.
