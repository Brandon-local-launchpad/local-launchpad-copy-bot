# QR codes subtab in Copybot: build brief (v1, 14 Nov 2026)

Live version: https://claude.ai/artifact/Kvb9KVd8n1epR9oPECs3FQ. Manual SOP: https://claude.ai/artifact/Q6gQDZYUE2nJaXkBGKeqmf

Scope: add a **QR codes** subtab to the Review & Referral tab, next to Brief and Templates. Copybot prepares everything a person needs to make the client's three QR codes in QR.io by hand. It then checks the finished codes and passes them to the card Brief. No QR.io API and no browser automation: a person still clicks through QR.io. Build it on its own branch (`qr-codes`), staging only.

| QR code | Card | Destination |
| --- | --- | --- |
| Review Funnel | A5 review card | Review Us funnel (1–3 stars → private form, 4–5 → Google) |
| Scan to Claim | Referral card back, QR 1 | Client's WhatsApp with a pre-filled claim message |
| View Our Services | Referral card back, QR 2 | Client's website |

The tab has three steps on one screen: **1 Prepare** (Copybot), **2 Make in QR.io** (a person, following a checklist with copy buttons) and **3 Upload and check** (Copybot). When all three codes pass, they feed the Brief.

## Stage 0: tell me what exists (no code)

Before changing anything, reply with:

1. How the Brief and Templates subtabs are built. Where the Brief's "Scan-to-claim link" and "View our services link" placeholders come from. Whether the Brief passes QR image files to the card skill, or only links.
2. Which client keys exist for the trading name, mobile number, website URL, Review Us funnel URL and niche label. Name the missing ones.
3. How tracker tasks are created and closed ("Needs a person", "Waiting on Brandon"), and how a tab's status dot is set.
4. Whether a QR decoding library is already in the stack (e.g. `zxing-cpp` or `pyzbar` in Python, `jsQR` in Node). Whether the server can make outbound requests to follow redirects.
5. Anything in this brief that conflicts with how the codebase works now.

Wait for approval before Stage 1.

## Stage 1: fields

These fields show at the top of the tab, filled from the client record. As on the Brief tab, an edit here stays on this tab, and the Record tab is never changed.

| Key | Default | Rule |
| --- | --- | --- |
| `qr_niche_label` | Niche text before the first "/" (Landscapers/Gardeners → Landscapers) | Editable, plural |
| `qr_business_name` | Trading name from the record | Editable. Use the name customers know ("Eden's Edge", not the registered company name) |
| `review_funnel_url` | New key, entered by hand from Phase 6 | Must be https. Refuse a Google review link (`g.page`, `google.com`, `goo.gl`): the code must go through the funnel |
| `whatsapp_number` | The record's phone, if it's a mobile | Normalised, see Stage 2 |
| `website_url` | The record's website | A temporary URL is allowed but flagged, see Stage 2 |

## Stage 2: Prepare (code only, no model)

Each value below sits in a read-only box with a **Copy** button.

- **Folder name:** `{niche}-{business}`, with the business name exactly as written. Example: `Landscapers-Eden's Edge`.
- **QR names:** `{niche} {business} Review Funnel QR Code`, `… Scan to Claim QR Code`, `… View Our Services QR Code`. Remove apostrophes from the business name here and change nothing else. Example: `Landscapers Edens Edge Review Funnel QR Code`.
- **WhatsApp message:** fixed text. The model never writes or rewords it: "Hey {business}, I've been given one of your referral cards and I'd like to claim the offer on it. My name is " Keep the trailing space, so the customer types their name straight after it.
- **WhatsApp link:** `https://wa.me/{whatsapp_number}?text={URL-encoded message}`. Encode everything, including apostrophes and commas. Add an **Open link** button so the person can test it.

Expected output for Eden's Edge on 07700 900123:

```
https://wa.me/447700900123?text=Hey%20Eden%27s%20Edge%2C%20I%27ve%20been%20given%20one%20of%20your%20referral%20cards%20and%20I%27d%20like%20to%20claim%20the%20offer%20on%20it.%20My%20name%20is%20
```

**Number rule:**

1. Strip spaces, `+`, brackets and dashes.
2. Change a leading `0044` to `44`, and a leading `07` to `447`.
3. The number is valid only if it matches `^447\d{9}$`.
4. If it doesn't, the Scan to Claim card shows "Needs a UK mobile number with WhatsApp on it" and stays locked. Landlines never pass.

**Link checks.** Each code's checklist unlocks only when its destination passes. Run a server-side GET, follow redirects, 10s timeout:

- Review funnel: returns 200 and isn't a Google link.
- Website: returns 200. If the person ticks "Temporary URL", it shows amber and opens a tracker task (Stage 5).
- WhatsApp: the number passes the rule above.

## Stage 3: Make in QR.io (person, guided)

Show the steps as a tick list. Each value appears inline with its own Copy button, so the person never retypes anything. Save the ticks per client, with who ticked and when. The step text is fixed.

**Once per client:**

1. Open [qr.io/dashboard](https://qr.io/dashboard/) (new tab).
2. Folders → **New Folder** → paste `[folder name]` → **Save**.
3. Open the new folder.

**Per code** (one card each, in the order Review Funnel, Scan to Claim, View Our Services):

1. **Create QR Code** → **Website URL**.
2. Paste `[destination]` → **Continue**.
3. Leave the design on default: no frame, no phrase, black → **Continue**.
4. Click the pencil next to "Untitled" → paste `[QR name]`.
5. Three dots → **Move to folder** → `[folder name]` → **Save**.
6. Download the QR as PNG or SVG and upload it below.

## Stage 4: Upload and check

Each code gets one upload slot (PNG or SVG). On upload, Copybot:

1. **Decodes it.** If it fails: "Can't read this QR. Download it again from QR.io."
2. **Checks it's dynamic.** A QR.io code should decode to a QR.io short link. If it decodes straight to the destination, show amber: "This is a static code. Its link can't be changed after printing. Recreate it in QR.io as a Website URL code."
3. **Follows the redirects** server-side (GET, at most 10 hops, 10s timeout). It then compares where the code lands with what that slot expects:
    - Review funnel and website: same host and path, ignoring the trailing slash and query string.
    - WhatsApp: `wa.me` forwards to `api.whatsapp.com/send`. Compare the `phone` and the decoded `text` with the expected values.
4. **Checks the slot.** If a code lands on a different code's destination, say which: "This code goes to the review funnel, not WhatsApp. Move it to the Review Funnel slot."
5. **Rejects duplicates.** The same file or short link can't go in two slots.

Result per slot: green "Checked: goes to {destination}", or red with the reason. Store `qr_{review|claim|services}_file` and `qr_{review|claim|services}_short_url` on the client, with the date checked. A **Re-check** button runs steps 3–4 again, e.g. after the destination changes.

## Stage 5: hand-off, tracker and status

**Hand-off to the Brief.** When all three slots are green:

- The Brief's Scan-to-claim and View our services fields take the destination links, and the placeholder banner clears.
- The Brief marks "QR files supplied: yes" and attaches the three files.
- The card skill must place these files and never generate its own QR from a link. A code generated from the link is static and bypasses QR.io: it can't be redirected later, and its scans aren't tracked.
- The review card QR is the Review Funnel file. The current card brief says "Google review link (review card QR)". Change that to the funnel, so 1–3 star customers don't go straight to Google.

**Tracker tasks:**

- "Make the 3 QR codes in QR.io": Needs a person, default assignee Brandon. It opens when Prepare passes and closes itself when all three slots are green.
- "Update the View Our Services QR destination once the domain is live": opens only if "Temporary URL" was ticked. Closed by hand.

**Tab status dot:** grey not started, amber waiting on a person, red a failed check, green all three checked.

## Not in this brief

No QR.io API calls, no QR.io login stored in Copybot, no browser automation. No change to the card design, the card templates or the Review Us funnel pages.

## Stage 6: test

On staging, run these and show Brandon the result of each:

1. **Eden's Edge, mobile 07700 900123.** Folder, names and WhatsApp link exactly match the examples above. Upload three real QR.io codes: all green, and the Brief's banner clears.
2. **Landline 023 8000 0000.** Scan to Claim is locked with the mobile message; the other two codes carry on.
3. **Google review link pasted as the funnel URL.** Refused.
4. **Bad uploads.** Try a code in the wrong slot, a static QR made straight from the link, an unreadable image, and the same file twice. Each gives its own message.
5. **Business name "Smith & Son's".** Folder `Builders-Smith & Son's`, QR names `Builders Smith & Sons …`, and the message encodes `&` as `%26`.
