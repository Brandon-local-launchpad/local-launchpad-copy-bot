# Fillout onboarding intake

Clients fill in the Fillout form "Local Launchpad Onboarding". Fillout posts every
submission to Copybot, which keeps the raw answers, builds a client record from the
questions we use, and shows it in the Submissions inbox. Stage 1 (17 Oct 2026) stops
there: no extraction, no page generation from these records yet.

## Setting it up

1. In Railway, set `FILLOUT_WEBHOOK_SECRET` to a long random string (the webhook
   refuses everything until it is set).
2. In Fillout, add a webhook on the form pointing at
   `https://<the app>/api/webhooks/fillout?token=<that secret>`
   (a header works too: `X-Fillout-Secret: <secret>` or `Authorization: Bearer <secret>`).
3. Submit a test form. It appears at `/submissions.html` within a second or two.

## What happens on delivery

`POST /api/webhooks/fillout` (fillout/routes.js, mounted before the login middleware)

- Wrong or missing secret: 401, nothing stored. The comparison is constant time.
- The raw JSON body is saved untouched to `fillout_submissions` and the route answers
  200 at once; processing runs afterwards, so Fillout never times out or retries.
- Same `submission.submissionId` twice: the first row is kept, the second delivery
  gets 200 with `duplicate: true` and nothing else happens.
- A body the parser refuses (bad JSON, no submissionId) is logged and kept as a
  `rejected` row with the text, so nothing is silently lost. Over 2 MB: 413 and logged.
- If processing fails, the raw row stays with `status = error` and the reason; the
  inbox has a Re-run button. Rows left at `received` by a restart are processed at
  startup.

## The client record

- `fillout/field-map.json` says which questions we keep: question id → our key,
  section (the form page), type and niche (`all` or a niche label). Only the
  universal fields and the chosen niche's block are read; every other niche's
  questions are ignored and never stored. **Adding a niche is a config change**:
  add its label under `niches` and its questions under `fields`.
- Questions are keyed by id only. Names repeat and carry suffixes like "(5)";
  the suffix is stripped for display.
- Values are kept exactly as submitted. Blank = null, "", whitespace, [] (and a
  voice answer with no link and no transcript).
- Each field has a value, a status (`filled` / `blank`) and a source (`form` /
  `transcript` / `manual`). A field typed in on the record page becomes `manual`
  and is never overwritten by a later submission or a re-run.
- Completeness counts units, not fields, and the headline is filled ÷ expected:
  - a voice answer and its typed twin (same `group` in the map) are one unit,
    filled if either is filled;
  - the five accreditation triples are one optional group;
  - optional-by-design fields (`optional: true` in the map: Town 1 to 3, "anything
    else we should know", "words to avoid", "jobs you do NOT want", "anything else
    that makes you stand out", the "areas, anything else" voice answer, the
    accreditations) are left out of the expected count and shown as "optional
    filled".
  For the sample form: 73 expected, 9 optional units, 103 fields.
- Reprocess on an inbox row rebuilds the record from the stored payload (after a
  field map change, for instance). Hand-typed fields are kept.
- A niche with no field map yet is accepted: the universal fields are stored and
  the inbox and record say "No field map for this niche".

Tables: `fillout_submissions`, `client_fields`, `client_audio`, `client_audio_blobs`,
plus `clients.source / reviewed_at / archived_at` (fillout/service.js).

## Which client a submission belongs to

- A submission is merged into an existing client only when **both** the business
  name and the business email match an earlier processed submission (case and
  whitespace ignored) and that client is not archived.
- Anything less makes a new client. If the name or the email alone matches another
  client (including one created by hand), the inbox row says "Possible duplicate of
  <client>".
- Clients created this way carry a "From Fillout, unreviewed" marker on the Clients
  list and the client page until Mark reviewed is clicked, and can be archived
  (archiving hides the client from the list; the record is kept and can be
  unarchived from the inbox).
- `clients.trade` is set to the Fillout niche label (e.g. "Plumbing & Heating"),
  which is not in the old trade catalogue. The old generation screen takes its trade
  from the uploaded files, not from the client, and the v20 path reports G-NICHE
  (no niche file) rather than failing. Stage 2 decides the niche → trade mapping.

## Audio

Every voice answer is downloaded at receipt and a copy kept, with Fillout's
transcript, link, filename and duration. If a download fails the Fillout link and
transcript are kept, the inbox shows "audio download to retry", and Re-run retries
it. The record page plays our copy from `/api/clients/:id/audio/:audioId`.

**Audio storage.** The bytes live in Postgres (`client_audio_blobs`, base64 text)
behind one interface, save / get / delete, in `fillout/audio-store.js`. Railway's
disk is wiped on deploy and there is no bucket yet, so Postgres is the first home.
About 400 KB per 20 second answer. **Move this to a Railway volume or object storage
before volume grows** (a few hundred clients): write a second store with the same
three methods and swap it in `server.js`. Nothing else needs to change; list and
record queries never touch the bytes table.

## Pages and API

- `/submissions.html`: every submission, newest first: business name, niche,
  received, status (received / processed / error / rejected), completeness, flags.
  Click a row for the record. `GET /api/fillout/submissions`,
  `POST /api/fillout/submissions/:id/reprocess`.
- `/client-record.html?id=<clientId>`: every field for the niche grouped by form
  section, "Not provided" for blanks, click to edit, transcript and player for
  voice answers, completeness at the top. `GET /api/clients/:id/record`,
  `PUT /api/clients/:id/record/:key` `{value}`, `GET /api/clients/:id/audio/:audioId`,
  `POST /api/clients/:id/archive | unarchive | reviewed`.

## Tests and demo

- `npm run test:fillout` (also part of `npm run test:fixtures`): the fixture
  `fixtures/fillout-sample.json` through the real routes with Postgres in memory
  and a local audio host. 69 checks.
- `npm run demo:fillout`: the app with Postgres in memory, the fixture delivered
  plus a resubmission, a name-only duplicate and an unknown niche. Prints the URLs.

## Known oddities in the sample form (17 Oct 2026)

- The five accreditation triples (Scheme name / Membership number / Link to your
  listing) carry scrambled suffixes; the map groups them by order on the form as
  accreditation_1 to accreditation_5.
- "Plumbing" and "Plumbing Additional Services" (no suffix) sit in the Drainage
  block, not the Plumbing & Heating one, which uses "Plumber" and "Plumbing
  Additional Services (1)".
- "Property types you mostly work on." (gbsoP3SSTnGFW5PdJ1U7zY) appears in the
  sample but was removed from the form; it is not in the map. Reprocess older
  submissions after a map change like this so their records match the map.
- The long "Additional Services. If you offer any services that weren't included…"
  question sits in the Guttering & Fascias block (that block's "any other services").
- The voice prompts with generic names ("Record your answer…") are labelled from
  their ids (sp_proud, ys_trade, ys_team, cust_reviews, qp_journey); those labels
  are guesses to correct in the field map.
- "Most wanted job 1/2/3" all say "Water softener repairs" in the sample; kept as is.
