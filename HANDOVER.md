# Local Launchpad Copy Bot — Developer Handover

Written for someone who has never seen this codebase. Everything below is derived directly from reading the source — no assumptions.

---

## 1. File Tree and What Each File Does

```
local-launchpad-copy-bot/
├── server.js                              Main backend. All routes, CSV parsing, prompt
│                                          assembly, batch handling, DB persistence.
├── validate.js                            Per-page and cross-page output validation.
│                                          Exports validate() and checkOrphanedServices().
├── db.js                                  Postgres connection pool and CREATE TABLE IF NOT
│                                          EXISTS schema setup. No-ops if DATABASE_URL unset.
├── package.json                           Node deps: express, @anthropic-ai/sdk, multer,
│                                          papaparse, jszip, pg.
├── .env                                   Local secrets (gitignored). ANTHROPIC_API_KEY,
│                                          DATABASE_URL, APP_PASSWORD, PORT.
├── .env.example                           Template showing which env vars are needed.
├── .gitignore                             Excludes .env and node_modules.
│
├── Homepage_Copywriting_Prompt_CORE (19).md      CORE prompt for homepage pages.
├── Category_Page_Copywriting_Prompt_CORE (15).md CORE prompt for category + location-category.
├── Service_Page_Copywriting_Prompt_CORE (16).md  CORE prompt for service pages.
├── Location_Page_Copywriting_Prompt_CORE (17).md CORE prompt for location pages.
│   NOTE: readDoc() picks the highest numbered copy of each file automatically.
│   If a new version is added (e.g. "(20).md"), it replaces the old one on next deploy.
│
├── Output_Validation_Checks (4).md        Human-readable spec for all validation checks.
│                                          Keep in sync with validate.js.
│
├── Cleaning_Calibration_Pack_v5.md        Trade calibration pack → "Cleaning Company"
├── Builder_Calibration_Pack_v5.md         Trade calibration pack → "Building Company"
├── Roofer_Calibration_Pack_v5.md          Trade calibration pack → "Roofing Company"
├── Dog_Training_Security_Calibration_Pack_v1.md  → "Dog Training & Security Dogs"
├── Drainage_Calibration_Pack_v1.md        Trade calibration pack → "Drainage Company"
├── Landscaper_Calibration_Pack_v4.md      Trade calibration pack → "Landscaper Gardener"
│   NOTE: All packs are registered in EXPLICIT_PACK_MAP in server.js (see §8 for adding more).
│
├── public/
│   ├── generate.html      VA-facing site generator (Step 1–4 upload/batch/download UI).
│   ├── clients.html       Client list dashboard (requires DB).
│   ├── client.html        Per-client page list and regenerate UI.
│   ├── page.html          Per-page copy viewer and manual editor.
│   └── login.html         Password gate (active if APP_PASSWORD env var is set).
│
└── calibration-packs/     Empty directory. Alternative location for calibration packs
                           (loader searches here first, then project root).
```

---

## 2. Inputs — Every File the Bot Parses

The VA uploads four files at `/api/parse-zip`. Files are identified by filename keywords, not by order or extension.

### 2a. Page Map CSV
**Identified by:** filename contains both `page` and `map` (case-insensitive).

**Columns read:**

| Column | Used for |
|--------|----------|
| `Page Type` | Maps to internal pageType via PAGE_TYPE_MAP (see §3) |
| `Page Title` | Displayed name and used to match service keys |
| `URL Slug` | Stored on job; used for location-category title parsing |
| `H1 (Ahrefs)` | Pre-filled H1 for non-service pages; service H1s are auto-built |
| `Status` | Pages with status `done` or `live` are **skipped** entirely |

**Parsing note:** The function scans for the first line starting with `Page Type` to skip any preamble rows. Location-category titles are split into `locationCategoryName` + `locationName` either by dash separator (`Category — Location`) or by extracting the location slug from the URL column.

**Stored as:** Array of job objects on the in-memory session.

---

### 2b. Custom Values CSV(s)
**Identified by:** filename contains (`cat` or `custom`) AND `value`.  
**Multiple files accepted** — the VA uploads one CSV per category tab. All are merged into one map.

**Column detection:** The parser scans data rows to find the row where a cell exactly equals `ghl custom value key` or `ghl key` (sets `keyColumn`) and where a cell exactly equals `value` (sets `valueColumn`). If no `value` column is found in a file, that file is silently skipped (catches "Master Cross-Reference" tabs which use a different value column).

**Rows accepted:** Only rows where the key column starts with `{{custom_values.` or matches `^[a-z_]\w*$`. Rows where the value starts with `← NEEDS FILLING IN` are skipped.

**Category→service mapping:** As rows are read in order, whenever a `category_N` key is seen, `currentCategory` updates. Every subsequent `service_N` key is mapped to `currentCategory` in `serviceParentMap`. **This means order matters in the CSV** — services must appear after their category row.

**Stored as:** `keyValueMap` (flat `{key: value}`) and `serviceParentMap` (`{service_N: "Category Name"}`) on the session.

---

### 2c. Onboarding Form CSV
**Identified by:** filename contains `onboard` or `form`.

**Format:** Two rows, no header. Row 0 = questions, Row 1 = answers. Zipped into `Q: … / A: …` pairs, blank pairs filtered out.

**Stored as:** Plain text string on the session.

---

### 2d. Geo Research File
**Identified by:** filename contains `geo` or `research`.

**Format:** Plain text or Markdown. Read as-is, passed directly into the system prompt.

**Stored as:** Raw string on the session.

---

## 3. Page Types — Full List and Selection Logic

### Page type map

| CSV value | Internal pageType | CORE prompt used |
|-----------|-------------------|-----------------|
| `Homepage` | `homepage` | Homepage CORE |
| `Category` | `category` | Category CORE |
| `Service` | `service` | Service CORE |
| `Location` | `location` | Location CORE |
| `Location Category` | `location-category` | Category CORE (same file) |

Any other value (e.g. section headers like `🏠 Homepage`) is silently skipped.

### Which pages get generated

After parsing, pages are filtered down to `jobs` using these rules, in order:

1. **Skip if status is `done` or `live`** — these are pre-completed pages.
2. **Skip location-category pages whose location matches `biz_area_1`** — the main category page already covers the primary city. e.g. if `biz_area_1` is "Grimsby", any location-category page whose `locationName` resolves to "grimsby" is dropped.
3. Everything else is included.

Skipped pages (rule 1 only) are recorded in `skippedPages` and appear in the output file.

### H1 assignment

- **Service pages:** H1 is auto-built as `{pageTitle} {biz_area_1}` (e.g. "Carpet steam cleaning Grimsby"). No Ahrefs input needed.
- **All other pages:** H1 comes from the `H1 (Ahrefs)` column. Missing H1s are reported back to the VA before batch submission; the VA must fill them in to proceed.

---

## 4. Prompt Assembly

Every page goes through `buildSitePrompt()`. The result is `{ system: [...blocks], userContent }`.

### System blocks (cached, identical for all pages in a batch)

```
Block 1: CORE prompt for this pageType        (Homepage/Category/Service/Location CORE .md)
Block 2: Calibration pack for this trade      (e.g. Cleaning_Calibration_Pack_v5.md)
Block 3: [Dog Training only] Trade override   (TRADE_SECTION_OVERRIDES constant in server.js)
Block 4: Client block (cache_control applied) Assembled from:
           ## CLIENT PROJECT KNOWLEDGE
           ### GHL Custom Values
           {{custom_values.key}}: value   ← one line per populated key
           ### Geographical Research and Context
           [full geo research text]
           ### Client Onboarding Form
           Q: ...
           A: ...
```

`cache_control: { type: 'ephemeral' }` is set on Block 4 (the last block). Anthropic caches the entire prefix up to and including this block — so all four blocks are cached as one unit for every page in the batch. This means prompt caching pays for itself: the large CORE prompt + calibration pack is sent once and cached; subsequent pages in the same batch read it from cache at ~10% of the normal token cost.

### User message (per-page, not cached)

Built by `buildPageContext()`. Different per page type:

**Homepage:**
```
TARGET PAGE: Homepage
H1: {h1}
Note: Use this H1 directly in the HERO H1 field. Do not output [INSERT H1 FROM AHREFS].
REMINDER (HIGHEST PRIORITY): No em dashes...
```

**Service page:**
```
TARGET PAGE: Service Page
TARGET SERVICE: {pageTitle}
PARENT CATEGORY: {parent category name, looked up from serviceParentMap}
H1: {h1}
Note: Use this H1 directly in the HERO H1 field.
REMINDER (HIGHEST PRIORITY): No em dashes...
```

**Category page:**
```
TARGET PAGE: Category Page
TARGET CATEGORY: {pageTitle}
H1: {h1}
SERVICES IN THIS CATEGORY (generate a SERVICE CARD for each):
  {{custom_values.service_1}}: Carpet steam cleaning
  {{custom_values.service_2}}: Area rug cleaning
  ... (all services mapped to this category in serviceParentMap)
Note: Use this H1 directly in the HERO H1 field.
REMINDER (HIGHEST PRIORITY): No em dashes...
```

**Location-category page:** Same as category, plus `TARGET LOCATION: {locationName}`.

**Location page:**
```
TARGET PAGE: Location Page
TARGET LOCATION: {pageTitle}
H1: {h1}
Note: ...
REMINDER (HIGHEST PRIORITY): ...
```

The `DASH_RULE_REMINDER` constant is appended to every user message regardless of page type. This is belt-and-suspenders — the dash rule also lives in the CORE prompts, but re-stating it in the uncached user message ensures the model sees it fresh on every request.

### Max tokens per request

| Page type | Max tokens |
|-----------|-----------|
| `category`, `location-category` | 16,000 |
| All others | 8,192 |

### Calibration packs — current trades

| File | Trade name in dropdown |
|------|----------------------|
| `Cleaning_Calibration_Pack_v5.md` | Cleaning Company |
| `Builder_Calibration_Pack_v5.md` | Building Company |
| `Roofer_Calibration_Pack_v5.md` | Roofing Company |
| `Dog_Training_Security_Calibration_Pack_v1.md` | Dog Training & Security Dogs |
| `Drainage_Calibration_Pack_v1.md` | Drainage Company |
| `Landscaper_Calibration_Pack_v4.md` | Landscaper Gardener |

To add a new trade: drop the `.md` file in the project root and add one line to `EXPLICIT_PACK_MAP` in `server.js`:
```js
'Your_Pack_Filename.md': 'Trade Name As It Should Appear In Dropdown',
```

### Dog Training trade override

The Dog Training & Security Dogs trade injects a third system block (`TRADE_SECTION_OVERRIDES['Dog Training & Security Dogs']`) that replaces the Seasonal Tasks section on category pages with a Life Stages section, and replaces the Signs section on service pages with one of three type-specific alternatives (problem-driven, life-stage, or security). This override is included in the cached prefix and costs nothing extra per page within a Dog Training batch.

---

## 5. Output Format, Database Schema, and a Real Record

### Output format

Each completed page is saved as **plain labelled text** — not JSON. The template format is:

```
-------------------------------------
PAGE: {pageTitle}
TYPE: {pageType}
SLUG: {urlSlug}
H1:   {h1}
-------------------------------------
VALIDATION ISSUES:
[BLOCK] Check 1a: Em/en dash found (2 occurrences).
[FLAG]  Check 6c: Only 1 FAQ answer(s) contain editorial links.

COPY OUTPUT:
```HOMEPAGE TEMPLATE

HERO SECTION
TITLE TAG: {{custom_values.category_1}} {{custom_values.biz_area_1}} | Same Week Starts | {{custom_values.company_name}}
META DESCRIPTION: ...
HERO H1: Carpet Cleaning Service Grimsby
...
```
```

The full output is assembled by `buildOutputFile()` and served as a `.txt` download. Three download formats are available:
- **Full batch `.txt`** — all pages in one file
- **Per-type `.txt`** — e.g. just all service pages
- **Per-page `.zip`** — one `.txt` file per page, named `{pageType}__{slug}.txt`

### Database schema

Four tables, created by `db.js` on startup via `CREATE TABLE IF NOT EXISTS`:

```sql
clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  trade       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

client_assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  asset_type   TEXT NOT NULL,        -- 'geo_research' | 'onboarding' | 'custom_values'
  filename     TEXT,
  content      TEXT NOT NULL,        -- raw file text
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  page_type     TEXT NOT NULL,
  page_title    TEXT NOT NULL,
  url_slug      TEXT,
  h1            TEXT,
  copy_output   TEXT,                -- full labelled text output from the model
  issues        JSONB DEFAULT '[]',  -- array of {type, check, message} objects
  generated_at  TIMESTAMPTZ,
  edited_at     TIMESTAMPTZ,
  UNIQUE(client_id, url_slug)        -- re-running a page upserts, not duplicates
)

batch_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
  anthropic_batch_id  TEXT NOT NULL,   -- Anthropic's msgbatch_xxx ID
  trade               TEXT,
  jobs_meta           JSONB NOT NULL,  -- array of job metadata (pageType, title, slug, h1...)
  custom_values_text  TEXT,            -- flat "key: value" text for orphan check on resume
  skipped_pages       JSONB NOT NULL DEFAULT '[]',
  company_name        TEXT,
  total               INTEGER NOT NULL,
  status              TEXT NOT NULL DEFAULT 'in_progress',
                                       -- submitting | in_progress | complete | error
  download_id         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
)
```

The database is **optional**. If `DATABASE_URL` is not set, the bot runs in local mode with in-memory Maps only. Sessions expire after 2h, downloads after 4h, batch jobs after 48h.

### What a saved pages row looks like

```
id:           3f8a1b2c-...
client_id:    a1b2c3d4-...
page_type:    homepage
page_title:   iClean 24/7 Homepage
url_slug:     /
h1:           Carpet Cleaning Service Grimsby
copy_output:  [full labelled text block as described above]
issues:       [{"type":"FLAG","check":"6c","message":"Only 1 FAQ answer(s)..."}]
generated_at: 2026-10-02T14:23:11Z
edited_at:    null
```

---

## 6. Placeholders — Every `{{custom_values.X}}` Key the Prompts Reference

### Keys explicitly named or resolved in code

| Key | Where referenced in code |
|-----|--------------------------|
| `biz_area_1` | `processH1s()` — service H1 auto-build; location-category skip filter |
| `category_1` | `buildPageContext()` service fallback parent; validate checks 4c, 9 |
| `company_name` | Batch record `companyName`; validate check 4d |

### Keys named in the Homepage CORE prompt output template

These appear as **literals in the model output** — they are never resolved by code. GHL resolves them at page render time.

| Key | Section |
|-----|---------|
| `category_1` … `category_9` | Services section blocks, subheadings, FAQ text, footer |
| `biz_area_1` … `biz_area_6` | Services headline, FAQ, areas bar, footer |
| `biz_area_7` … `biz_area_14` | Areas We Cover bar (populated only if client has that many areas) |
| `company_name` | Google Reviews headline, footer, Meet the Team |
| `company_owner_first_name` | Meet the Team body |
| `company_phone_functional` | Sticky bar, VA checklist |
| `company_twilio_phone` | Contact section call button, footer |
| `company_email` | Footer |
| `company_address` | VA checklist |
| `google_map_embed` | Map section, VA checklist |
| `state` | Footer column 1 |
| `service_1` … `service_N` | Category/location-category SERVICE CARD labels |

### Resolution behaviour

- **In-prompt resolution:** `resolvePlaceholders()` in `validate.js` resolves keys for the title tag and meta description length checks (checks 7 and 8) only. These two checks need the real character count.
- **Everywhere else:** Placeholders are left as literals in the output text. The VA pastes them into GHL, which resolves them dynamically.
- **Unknown key detection:** Check 3c scans prose sections and BLOCKs on any `{{custom_values.X}}` key that is not in the client's populated key list.

---

## 7. Validation — Every Check

All checks run in `validate.js`. `validate()` is per-page; `checkOrphanedServices()` is a cross-page batch check run after all results are assembled.

| # | Check | Class | What it catches |
|---|-------|-------|-----------------|
| 1a | Em/en dash | **BLOCK** | `—` or `–` in prose (excludes section labels and VA checklist) |
| 1b | Hyphenated compound | **FLAG** | `word-word` pattern in prose (e.g. "well-maintained") |
| 2 | Banned phrase list | **BLOCK** | 18 specific phrases (see validate.js lines 78–85) |
| 2a | "solutions" / "needs" | **FLAG** | Either word in prose |
| 2b | "passionate" | **BLOCK** | Word in any form |
| 3a | `[CLIENT TO CONFIRM]` | **BLOCK** if the flag IS the entire answer; **FLAG** if appended to real content |
| 3b | Template leftovers | **BLOCK** | `[INSERT…]`, `Lorem ipsum`, `[TODO]`, etc. |
| 3c | Unknown custom value key | **BLOCK** | Placeholder used in prose that isn't in the client's populated key list |
| 4a | H1 dash | **BLOCK** (em/en); **FLAG** (hyphen) |
| 4b | H1 length | **FLAG** | H1 over 45 characters |
| 4c | H1 missing category/area | **FLAG** | H1 doesn't contain the expected category or area string |
| 4d | H1 contains company name | **BLOCK** | Company name should never appear in H1 |
| 5a | Rating/count conflation | **BLOCK** | Star rating and customer/jobs count in same sentence |
| 5b | Review count mismatch | **BLOCK** | Different review counts in hero/trust bar vs. Google Reviews section |
| 6a | Weak link phrase | **BLOCK** | "find out more", "click here", etc. in service/FAQ prose |
| 6b | Missing editorial link | **BLOCK** | Category block has no link containing both category + area placeholders |
| 6c | Fewer than 2 FAQ editorial links | **FLAG** | Fewer than 2 FAQ answers contain category/service + area placeholder |
| 6d | FAQ self-link | Manual VA checklist item — not automatable from text output |
| 7 | Title tag resolved length | **FLAG** | Over 60 characters after placeholder substitution |
| 8 | Meta description resolved length | **FLAG** | Over 155 characters after placeholder substitution |
| 9 | Areas We Cover completeness | **BLOCK** | Any populated `biz_area_N` key missing from the areas list |
| 10 | Orphaned service page | **BLOCK** | Service has no `SERVICE CARD` entry on any category page in the batch |

**HALT** is not a classification used in the automated validation code. It appears in the Homepage CORE prompt as a model instruction: if the model cannot find a populated placeholder for something it needs, it outputs `[HALTED — no populated custom value found for "X"...]` in the copy. This surfaces as a check 3b BLOCK hit on the literal `[` bracket.

Check 10 has a DB fallback: if a resumed batch contains no category pages, the validator queries the `pages` table for previously saved category pages for this client, so orphans aren't silently missed across split batch runs.

---

## 8. WordPress

**There is no WordPress code anywhere in this codebase.**

- No WP REST API calls, no `wp_insert_post`, no `xmlrpc`, no ACF field mappings, no `wp-json` endpoints.
- No environment variables referencing WordPress.
- No branches, TODOs, or comments mentioning WordPress.
- No npm packages for WordPress integration.

**Status:** Not started, not planned, not referenced. The system produces labelled `.txt` files and stores copy in Postgres. Any future WordPress/ACF push integration would need to be built from scratch.

---

## 9. GHL-Specific Hardcoding

GHL (GoHighLevel) is referenced in these hardcoded places:

### In `server.js` — CSV column detection
```js
// server.js:279
if (!keyColumn && (cell === 'ghl custom value key' || cell === 'ghl key')) keyColumn = col;
```
The custom values CSV parser looks for these exact strings as column header values. If the VA's custom values spreadsheet uses a different header name (e.g. "Key" or "Custom Value"), the parser will fail to find the key column and skip the file entirely.

### In the system prompt client block label
```js
// server.js:466
const clientBlock = `## CLIENT PROJECT KNOWLEDGE\n\n### GHL Custom Values\n${cvList}\n...`
```
The section header "GHL Custom Values" is hardcoded. This is cosmetic — it only affects the label the model sees in the system prompt, not functionality.

### In the CORE prompt output templates
Every `{{custom_values.X}}` placeholder in the output is a GHL-specific syntax. GHL replaces these at page render. The bot never resolves them (except for validation length checks) — it outputs them as literals. If this system were ever ported to a non-GHL CMS, every prompt template and calibration pack would need its placeholder syntax updated.

### Hardcoded GHL keys in the Homepage output template (static lines)
These keys appear verbatim in the fixed template block at the bottom of the Homepage CORE prompt and are output literally regardless of client:
- `{{custom_values.google_map_embed}}` — Map section
- `{{custom_values.company_twilio_phone}}` — Contact section call button and footer
- `{{custom_values.company_email}}` — Footer
- `{{custom_values.state}}` — Footer column 1

These are expected to exist in every GHL client's custom values. There is no code-level check that they are populated.

---

## Appendix — Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API authentication |
| `DATABASE_URL` | No | — | Postgres connection string. If absent, bot runs in memory-only mode. |
| `APP_PASSWORD` | No | — | Enables password gate on all routes. If unset, the app is open. |
| `APP_SECRET` | No | Random on startup | HMAC secret for auth cookie signing. Set a stable value in production or users are logged out on every restart. |
| `PORT` | No | `3000` | HTTP listen port. Railway injects this automatically. |

No model override variable exists. The model `claude-sonnet-4-6` is hardcoded in four places in `server.js` (lines 486, 694, 989, 1009).
