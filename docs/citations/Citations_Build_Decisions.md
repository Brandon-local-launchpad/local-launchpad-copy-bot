# Citations build: decisions (updated 3 Nov 2026)

## Status
- DONE 3 Nov: listings inbox live. listings.locallaunchpad.co.uk is a verified secondary domain in Google Workspace; MX (smtp.google.com, priority 1) and SPF TXT added on locallaunchpad.co.uk in GoDaddy; user listings@locallaunchpad.co.uk created (Business Plus licence); Default routing catch-all rule (pattern match .*@listings\.locallaunchpad\.co\.uk, replace recipient, X-Gm-Original-To header added, non-recognised addresses only); Gmail filter in the listings inbox (To: @listings.locallaunchpad.co.uk, never send to spam). Test email received.
- DONE 3 Nov: 1Password Business set up (trial), browser extension installed, "Local Launchpad — Internal" vault created with the listings inbox login.
- NEXT: export master list tabs to CSV into data/citations/; send the Claude Code build prompt (plan first); onboarding agreement clause and Fillout questions; add 1Password payment details before the trial ends; Ray as second admin / recovery.

## Decided
- Build citations in-house in Copybot. No BrightLocal, and LeadSnap is dropped for citations (kept for posts, photos and reviews). LeadSnap's 46-site network is mostly US/German directories plus in-car and voice feeds; it covers only about 7 of Ray's 84 UK sites.
- Model: the WEBRIS "Directory Listing Manager" flow from the YouTube video. Automate the research (existing listings scan, NAP check, competitor gap); submissions stay with a VA, prefilled by Copybot.
- Four tiers per client: UK Core, UK Secondary, Location, Trade/Niche. Prioritised within each tier.
- Seed source: the UK Citations Master List Google Sheet (built 2 Nov; https://docs.google.com/spreadsheets/d/18JDH3fZLOBpeRhOXEHvJLPM49KsdBqx_vJu_xCc-iLo/edit). It replaces Ray's UK_Citations_Southampton sheet (7 Oct). Covers UK Core, UK Secondary, local networks, chambers, council trader schemes, city local sites and trade platforms.
- Non-trade niche rows removed (TripAdvisor, RateMDs, HappyCow, Hostelworld, etc.); trade bodies per niche instead (e.g. Gas Safe, NICEIC/NAPIT).
- Exclusivity: a client's territory is their approved town list (from the Locations step). It decides which local directories a client gets. Copybot warns when two clients in the same niche have overlapping town lists.
- Phone number on every listing stays the client's GBP number. No tracking numbers.

### Who does what
- Client: Facebook and Instagram. They send the page links only; no access needed. Copybot checks NAP on the public pages. One short tutorial video covering how to set up the pages and find the links.
- Client document at onboarding: a utility bill, insurance certificate or similar showing business name and address (for Apple Business Connect verification).
- VA (in Local Launchpad's accounts): Apple Business Connect (claimed in LL's account, verified with the client's document, transferred on exit), Yelp (email-on-client-domain option first), LinkedIn (from a real team member's profile; client added as admin on exit), Bing (import from GBP), and every free UK directory.
- Apple Business Connect: the master list research (2 Nov) found a Maps place card needs a shopfront or commercial premises; service-area businesses only get branding. So Apple is skipped for SAB clients (skip_for_service_area) and the document upload is only needed for shopfront clients. TomTom, HERE, Waze and OpenStreetMap are shopfront-only too.
- If Apple or Yelp insists on a call, the VA texts the client a heads-up. No tutorial.
- Paid or vetted trade sites (Checkatrade, TrustATrader, MyBuilder, Bark, Which?, TrustMark, Buy With Confidence, chambers, council schemes): client decision; one explainer plus a yes/no in onboarding. Note: Rated People trade accounts reportedly closed Sep 2026 (brand bought by Checkatrade).
- Onboarding form questions: Facebook link, Instagram username, "Do you have Apple Business Connect / a LinkedIn company page?" (yes: link; no: we set it up), document upload.
- Permission: one clause in the onboarding agreement authorising listing creation and management.

### Listings email
- Provider: Google Workspace; DNS at GoDaddy.
- Per-client addresses are invented on the fly: <client-slug>@listings.locallaunchpad.co.uk. No per-client setup.
- All mail lands in listings@locallaunchpad.co.uk. The original address is in the To header and the X-Gm-Original-To header.
- Copybot reads that one mailbox through the Gmail API (OAuth, read and modify scopes, limited to the listings user), checks inbox and spam, matches by recipient address and sender domain, only acts on known directory sender domains, opens plain confirm links, shows codes, and sets row status.
- On exit: forward the client's address to their own email and change login emails on key listings.

### Logins
- Password manager: 1Password Business (chosen 3 Nov for ease of use over Bitwarden). One vault per client ("Edens Edge — Listings", created with the Custom option) plus the "Local Launchpad — Internal" vault; items named "<Client> — <Directory>", one-time (TOTP) codes stored in the item. The default "Shared" vault stays empty. VAs have access to client vaults; clients don't until exit.
- Copybot stores the login email and item name only, never passwords.
- On exit: share or move the client's vault to them and remove LL access.

## UI target
The WEBRIS Directory Listing Manager look (screenshots in docs/citations/ui-reference/): client header card with Scan directories button; stat tiles (core completion, overall completion, wrong location, NAP status, needs review, waiting on client); red NAP issues banner with plain-words mismatches; filters by tier, status and done_by; one table per tier with count badge, tags, Listed?, URL, NAP OK? with Verify, status pills, action dropdown, last scanned, Scan / Edit. Their lawyer "Stakeholder" columns are replaced by Done by and the 1Password item name. Data model allows multiple locations per client later.

## Directory database columns
Verification method (email / code / phone / postcard / none / unknown), cost (free / paid / membership), who does it (VA / client / client decision), applies to (all / niche list / location / town list), skip for service-area businesses, needs live check.

## Open
- Verification method per directory: record on the Edens Edge first run.
- London test of the Locations tab before selling in dense areas.
