# Brief for Claude Code: "Review & Referral Cards" tab in CopyBot

## What this is for

Local Launchpad makes every client a matched print kit: an A5 Google review card and an 85 × 55 mm referral card. Claude makes the cards with a skill called `/customer-revref-cards`, which takes a filled-in client brief. Today the brief is filled in by hand, and details get missed. On the last run the contact name, mobile and both referral links were all missing.

CopyBot already holds most of these details on the client record. This feature adds a new client tab called **Review & Referral Cards**. The tab:

1. builds the client brief automatically from the client record,
2. lets the VA fill any gaps and confirm the design choices,
3. shows which details are still missing before anything is copied,
4. has a **Copy brief** button. The VA pastes the result into a **new Claude chat** and gets both cards back in one run.

CopyBot does not make the cards. It only produces the brief text. Nothing is sent to Claude automatically.

## Before you start: look at the codebase

I don't know CopyBot's exact field names. Before building, find these and use the real ones:

- The client page and how its existing tabs are registered (Record, Onboarding form and set-up, etc.). Add the new tab the same way, in the same style.
- The fields on the **Record** tab. Known ones include company name, email, phone, Live domain and Primary category (GBP).
- The **Onboarding** group fed by the GHL webhook (GBP status, domain provider, Facebook, Instagram…).
- Anything that already stores a Google review link, the GBP business name, a logo, brand colours, services/page-map data or a contact first name.

For every brief line in the mapping table below, use an existing field if one exists. Only add a new field when there isn't one. **New fields belong to this tab only, stored per client.** Don't add them to the Record tab. List every field you mapped or added in your final summary so it can be checked.

## The tab: "Review & Referral Cards"

Add it to the client page's tab bar, after the existing tabs. Inside it, add two sub-tabs:

- **Brief** (opens by default): the four parts below.
- **Templates**: a gallery of the five card designs with real example images, so the VA can see which is which before choosing. See "Templates sub-tab" further down.

The Brief sub-tab has four parts, top to bottom.

### 1. Readiness bar (top of the tab)

A single status line that updates live:

- **Red: "Can't copy yet. Business name missing."** Shown only when the GBP business name is empty. This is the only thing that blocks copying, because the skill stops without it.
- **Amber: "Ready, with N placeholders"** followed by the missing items, e.g. "Contact name, Scan-to-claim link". The skill fills these with clearly marked TEST placeholders and lists them to swap before print, so copying is still allowed.
- **Green: "Ready. Everything filled."**

The items that drive amber are: contact first name, mobile, Google review link, "Scan to claim" link and "View our services" link.

### 2. Card details form

Grouped exactly like the brief's sections, so what the VA sees matches what gets pasted. Each field is **pre-filled from the client record** and shows a small grey source tag, e.g. "from Record → Phone". If the VA edits a pre-filled value, save it as a **tab-level override**. Don't write it back to the Record field. Show a "reset to record value" link next to any overridden field.

Fields to auto-fill (if blank on the record, they are editable and save on the tab):

| Brief line | Source in CopyBot (find the real field) | Notes |
|---|---|---|
| Business name (exactly as on Google Business Profile) | GBP business name; fall back to company name | **Required.** If falling back to company name, show "check this matches GBP exactly". |
| Short name for the wordmark | new tab field | Optional. Placeholder text: "e.g. BrightSpark". |
| Trade | derived from Primary category (see trade mapping) | Dropdown of the 10 skill trades + "other". If the category doesn't map, choose "other" and pre-fill the category text. |
| Sole trader or team? | new tab field, or existing if found | Radio: Sole trader (he) / Sole trader (she) / Team. Default Team. |
| Area / town | client address / service area if stored | Optional. |
| Contact first name (referral back) | contact first name on record | Amber if empty. |
| Mobile number | Record → Phone | Amber if empty. Format as `07xxx xxxxxx`. Warn (don't block) if it isn't a UK mobile starting 07. |
| Google review link | stored review link if any | Amber if empty. Warn if it doesn't look like a review link (`g.page/r/…/review` or `search.google.com/local/writereview?placeid=…`). Help text: "GBP → Ask for reviews → copy link". |
| "Scan to claim" link | new tab field | Amber if empty. Help text: "WhatsApp chat link, booking or contact page". Add a "Make WhatsApp link from mobile" button that fills `https://wa.me/44XXXXXXXXXX` (drop the leading 0). |
| "View our services" link | Live domain + services page path if the page map has one, else the Live domain | Amber if empty. |
| QR files supplied? | fixed to "no — generate from the links" | Read-only. The skill makes and test-scans the QR codes. |

Fields the VA chooses (new tab fields):

| Brief line | Control |
|---|---|
| Logo supplied? | Yes/No. If yes: file type (SVG / PNG transparent / JPG) and "works on dark backgrounds?" Yes/No. If the client record already has a logo file, default to Yes and show a thumbnail. |
| Brand colours | Three inputs: main/accent hex, dark hex, avoid (free text). Validate hex as `#RRGGBB`. Show a colour swatch next to each. |
| Template | A row of six picker tiles: 3a Midnight · 3b Paper · 3c Deep Colour · 3d Job Photo · 3e Craft Serif · Designer's choice (default). Each tile shows the review-front thumbnail from the Templates gallery and its name. Add a "Compare templates" link that opens the Templates sub-tab. |
| Feel (up to 2) | Multi-select chips: premium · friendly · bold · traditional · modern · clean. Max 2. |
| Job photo supplied? | Yes/No. Show the hint "needed for 3d Job Photo" when 3d is chosen. |
| Review example job | Text, optional. Placeholder: "e.g. fitted our new bathroom". |
| Review trade pun | Text, optional. Placeholder: "switched on." |
| Must say | Text, optional, e.g. "NICEIC Approved Contractor (small, footer)". |
| Must not say | Text, pre-filled with "Any discount or reward for leaving a review (against Google policy)". |
| Quantities | Two numbers: review, referral. |
| Printer / CMYK needed? | Text. Default: "Solopress — CMYK PDF, 3 mm bleed, crop marks on". |
| Paper & finish | Two texts: review, referral. Default review: "400gsm silk, matt lamination both sides". Default referral: "400gsm uncoated (no lamination, so biro writes on the offer box)". |
| Deadline | Date picker. |
| Test client | Checkbox, default off. When on, the brief gets the TEST CLIENT warning line. |

### 3. Brief preview + Copy

- A read-only preview of the exact text that will be copied, in a monospace box, updated live.
- **Copy brief** button. It copies the text to the clipboard and shows "Copied. Open a new Claude chat and paste." Disabled only when the readiness bar is red.
- **Download .md** button with the same text, filename `[slug]-card-brief.md`.
- Under the button, a reminder line when Logo supplied = Yes or Job photo supplied = Yes: **"Attach the logo / job photo files to the Claude chat as well. They can't be pasted as text."**
- Record "Last copied: [date time] by [user]" on the tab.

### 4. Sign-off

Checkboxes, each saving who ticked it and when:
- Proofs sent to client
- Client approved name, number, colours and QR links
- Both PDFs exported (guides off)
- Sent to printer

## Templates sub-tab

### What it shows

One card per template, in this order, using this text:

| ID | Name | Look | Best for |
|---|---|---|---|
| 3a | Midnight | Near-black with soft warm and cool glows | Default all-rounder; electricians, heating, locksmiths |
| 3b | Paper | Warm stone / off-white | Plumbers, cleaners, kitchens and bathrooms; light brands |
| 3c | Deep Colour | The client's darkest brand colour | Strong brand colour; landscapers, roofers |
| 3d | Job Photo | A photo of finished work fading to near-black | Any trade with one great photo of finished work (needs a job photo) |
| 3e | Craft Serif | Espresso / deep warm dark, serif headline | Joiners, stonemasons, high-end / heritage |

Each template card shows four example images side by side:
**Review front · Review back · Referral front · Referral back.**
The review images are portrait (A5) and the referral images landscape (85 × 55 mm), so keep each image's real proportions. Don't crop or stretch them to a common size.

- Clicking any image opens it large in a lightbox, with arrows to step through the four images of that template.
- Each card has a **Use this template** button. It sets the Template field on the Brief sub-tab, switches back to Brief and highlights the chosen tile.
- The template currently chosen for this client gets a "Selected" badge.
- A short line at the top: "Examples show demo businesses. Your client's name, colours and logo replace them."

The gallery is the same for every client. Store the images once for the whole app, not per client.

### Getting the images in (one-off, done by you, Claude Code)

I'll paste in the template PDFs: the review card lookbook and the referral card lookbook. They show the five templates with demo businesses (James Eclectic, White & Co Plumbing, Greenline Gardens, Mason & Sons Builders, Oak & Iron Joinery).

1. Render every page of each PDF to an image at 200 dpi with PyMuPDF or `pdftoppm`.
2. Work out which template and side each page (or each panel on a page) shows. Use the template name or ID printed on the page if there is one. Otherwise use the demo business name: James Eclectic = 3a, White & Co Plumbing = 3b, Greenline Gardens = 3c, Mason & Sons Builders = 3d, Oak & Iron Joinery = 3e. A page showing a card's "Thank you" or "You've been given a gift" side is the front; "Not sure what to write?" or "Ready to claim your offer?" is the back.
3. If one page shows several cards, crop each card out on its own, keeping only the card plus a small even margin. Remove any lookbook titles or captions from the crop.
4. Save as WebP (or PNG if WebP isn't supported in the stack), longest side about 1200 px, named like this:
   `templates/review/3a-midnight-front.webp`, `templates/review/3a-midnight-back.webp`,
   `templates/referral/3a-midnight-front.webp`, `templates/referral/3a-midnight-back.webp`, …and so on for 3b paper, 3c deep, 3d photo and 3e craft. That's 20 images in total.
5. Commit them as static assets in the repo. This is a one-off import, not a runtime upload feature.
6. If any of the 20 images can't be found in the PDFs, show a grey "Example not added yet" box in its place, and list the missing ones in your summary. Don't make up or redraw an example.

Also add a small script (e.g. `scripts/import-card-templates`) that repeats steps 1–4 from a PDF path, so the images can be refreshed when the templates change.

## The brief text (exact format)

The output must match this format line for line, because the skill reads it. Leave a value blank if it's empty; don't write "N/A". The first line triggers the skill when pasted into a new chat.

```markdown
/customer-revref-cards

# Customer Review & Referral Cards — Client Brief
Generated by CopyBot on {DD MMM YYYY} for {business name}.
{only if Test client: > ⚠️ **TEST CLIENT — fictional business for template testing. Not for print.**}

## 1. Business
- Business name (exactly as on Google Business Profile): {gbp name}
- Short name for the wordmark (if different): {short name}
- Trade: {trade value, or "other: {category}"}
- Sole trader or team? {Sole trader (he) | Sole trader (she) | Team}
- Area / town: {area}

## 2. Contact (referral card back)
- First name to call/text: {contact first name}
- Mobile number: {mobile}

## 3. Links & QR codes
- Google review link (review card QR): {review link}
- "Scan to claim" link (referral QR 1): {claim link}
- "View our services" link (referral QR 2): {services link}
- QR files supplied? no — generate black-on-white SVG from the links and test-scan

## 4. Brand
- Logo supplied? {yes — {type} · works on dark? {yes/no} | no — use a text wordmark}
- Brand colours (hex): main/accent {hex} · dark {hex} · avoid {text}

## 5. Style
- Template: {template or "designer's choice"}
- Feel: {feel 1} · {feel 2}
- Job photo supplied? {yes/no}

## 6. Copy tweaks
- Review example job: {example job}
- Review trade pun ("keep our standards ___."): {pun}
- Must say: {must say}
- Must not say: {must not say}

## 7. Print
- Quantities: review {n} · referral {n}
- Printer / CMYK needed? {printer text}
- Paper & finish: review {text} · referral {text}
- Deadline: {DD MMM YYYY}

## Missing details
{only if amber: one line per missing item, e.g. "- Contact first name — use TEST placeholder and flag"}
{if none: "- None"}
```

## Trade mapping (Primary category → Trade)

Match case-insensitively on the GBP primary category. First match wins.

| GBP category contains | Trade value |
|---|---|
| electric | electrician |
| plumb | plumber |
| roof | roofer |
| landscap, garden | landscaper |
| clean | cleaner |
| builder, construction, general contractor, extension | builder |
| paint, decorat | decorator |
| locksmith | locksmith |
| heating, boiler, gas engineer | heating |
| carpent, joiner, cabinet | carpenter |
| (no match) | other: {category text} |

The skill uses `carpenter` as the trade value for joiners. Keep that spelling in the brief.

## Rules

- **Never write tab edits back to the Record.** The tab reads from the record and stores its own overrides.
- **Don't put secrets or internal-only data in the brief.** No client email, logins, provider details, GHL IDs or API keys. Only what's in the format above.
- The brief reads the **current** record values each time the tab opens, except for fields the VA has overridden.
- Ray and Given (VA users) need full access to this tab.

## Acceptance tests

1. A client with every field on the record → tab opens green, and the preview shows all values with source tags. Copy, then paste into a text editor: the output matches the format exactly, with `/customer-revref-cards` as line 1.
2. Clear the client's phone on the record → the readiness bar turns amber listing "Mobile number". Copy still works, and the brief's "Missing details" lists it.
3. Clear the GBP name and the company name → the bar turns red and Copy is disabled.
4. Override the mobile on the tab → the Record → Phone value is unchanged, and the "reset to record value" link restores it.
5. A Primary category of "Roofing contractor" → Trade is `roofer`. A category of "Pressure washing service" → Trade is `other: Pressure washing service`.
6. "Make WhatsApp link from mobile" with `07700 900123` → `https://wa.me/447700900123`.
7. Tick Test client → the warning line appears in the preview under the generated line.
8. Logo supplied = Yes → the attach-files reminder shows under Copy.
9. Ticking a sign-off box saves the user and timestamp, and they survive a reload.
10. Templates sub-tab → five cards in order 3a–3e, each with four images at their real proportions. Clicking an image opens the lightbox and the arrows step through that template's four images.
11. Click **Use this template** on 3c → the Brief sub-tab opens with the 3c tile selected, and the preview shows "Template: 3c Deep Colour".
12. Delete one image file locally → its slot shows "Example not added yet" and nothing breaks.
13. End to end: copy a real client's brief, paste it into a new Claude chat, and confirm the skill builds **both** cards without asking anything (unless the business name is missing).

## When you're done

Reply with:
- where the tab sits and a screenshot of both sub-tabs,
- the 20 template images: which ones were imported, which page each came from, and any that are missing,
- every field you **mapped** (brief line → CopyBot field) and every field you **added**,
- anything in the mapping table you couldn't find on the record,
- the result of each acceptance test.
