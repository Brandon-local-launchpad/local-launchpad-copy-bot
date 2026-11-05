# Existing Site Migration: Copybot Build Brief (Slice 1)

Date: 5 Nov 2026 · Owner: Brandon · Branch: `existing-site` · Status: plan first, wait for approval

## Why this exists

Some Local Launchpad customers already have a website, sometimes 10 years old. We replace it with a new Copybot built WordPress site on the same domain. The risk is losing what the old site has earned (rankings, backlinks, enquiries). The rule from the SOP: **nothing on the old site is switched off until we know what it does. Every page that matters either keeps its URL or is 301 redirected to the closest new page.**

Today Ray would do this by hand from four tools. This build makes Copybot do the data gathering and checking, and leaves the judgement calls (keep or retire, go or no go) with Ray.

The Site audit screen in Copybot is currently an empty state ("crawl and page mapping arrive with the existing-site build"). This is that build.

## Read first

- `CLAUDE.md` and the docs it points to (Master Context sections 11, 12, 15, 17; STATUS).
- The WordPress plugin and push code (`wp/client.js`, the plugin PHP, dry run and rollback). Redirects reuse the same safety model.
- Client Values: `live_domain` on the Record tab (already exists), and the Add client wizard that fills it.
- The Page Map code. Kept URLs can override Page Map slugs.

## Decisions already made (don't reopen)

- **No Screaming Frog licence.** Copybot crawls the site itself. Ray will cross check page counts against the free Screaming Frog on the first 3 real migrations, so show a clear total URL count.
- **DataForSEO for backlinks and ranking estimates.** Account already exists (used for People Also Ask). Backlinks API is now pay as you go. A Backlinks Summary call on the test site cost about $0.024.
- **Search Console is optional, not required.** Most customers are technophobic tradespeople and won't have it or can't give access. Build the no Search Console path as the default. Accept a Search Console Pages/Queries CSV upload as an optional extra source (same pattern as the blog's CSV upload). The service account API comes later.
- **No GA4 in slice 1.**
- **Redirects go into Rank Math through our own WordPress plugin**, not a file Given uploads.
- **Same domain only.** A domain change is out of scope; show a warning and stop if the new site's domain differs from the old one.
- All new builds are WordPress with Rank Math.

## Test site

`https://southamptonhomes.co.uk/` (not a customer; public site, no Search Console access). WordPress + Elementor, roughly 4 to 6 pages (Home, Garden Design Service, Inspiration, Contact). Known facts the scan should surface:

- Displayed phone `02381 550155` but the `tel:` link is `02381550183`. NAP mismatch.
- Logo links to `hh9.f77.myftpupload.com` (a GoDaddy temporary host). Links to a non live host.
- DataForSEO Backlinks Summary: 83 backlinks from 80 referring domains, but backlinks spam score 58, rank 0, mostly `.shop`/`.online`/`.fyi` domains, 1 GB referrer. Almost all junk. The spam filter must stop these making every page "matter".
- DataForSEO reported the CMS as "methode". It's WordPress. Don't trust DataForSEO's platform field; detect it from the site.

Crawl politely: identify as Copybot in the user agent, about 1 request per second, cap pages (say 2,000) with a warning if hit. Read only. Never submit forms or log in.

## Slice 1 scope

### 1. Scan old site (background job, button on Site audit)

Build one URL inventory by merging every source, recording which source(s) found each URL:

- **Crawl:** follow internal links from the homepage. Include images and PDFs that are linked. Record per URL: status code, redirect target (and chains), canonical, robots meta (noindex), title, H1, meta description, word count, internal inlinks count, and the page's main text.
- **Sitemap:** robots.txt and sitemap.xml (and sitemap indexes). Pages in the sitemap but not linked are orphans; flag them.
- **DataForSEO Labs Ranked Keywords** (domain target): every URL that ranks, with its keywords, positions and estimated traffic.
- **DataForSEO Backlinks:** per page backlinks and referring domains for the domain (check the docs for the right endpoint, likely domain pages or backlinks list). Keep per link spam score and the referring domain's rank.
- **Search Console CSV** if uploaded: clicks, impressions, top queries per page.

Also detect and record on the scan:
- **Platform** (WordPress, Wix, Squarespace, GoDaddy builder, other) from markers in the HTML, not DataForSEO.
- **JS only warning:** pages whose raw HTML has almost no text. Say the crawl may have missed pages.
- **Bot block warning:** challenge pages or 403s on the homepage.
- **Issues found:** links to non live hosts (staging/temp domains), NAP on the page (displayed phone, `tel:` links, address) that differs from Client Values, mixed http/https or www/non www.

Log DataForSEO cost per scan (same place model and API costs are logged) and show the total on the scan.

### 2. Spam filter for backlinks

Show two numbers per page: **all referring domains** and **real referring domains**. A real referring domain passes the spam rules: backlink spam score under a configurable threshold, not a known junk pattern. Propose the default threshold and rules in the plan, with the southamptonhomes data as the example. Only real referring domains count towards "matters". Ray can override a page either way.

### 3. Page that matters, and top 20

Use these definitions (settings, not hard coded):

- **Page that matters:** any Search Console clicks in the last 12 months (if CSV), or ranks in DataForSEO for a keyword with estimated traffic above 0, or at least 1 real referring domain.
- **Top 20:** the 20 URLs with the most clicks (or estimated traffic when there's no Search Console), plus any page with 3 or more real referring domains not already listed.
- Store the **top 5 searches per page** (Search Console queries if available, else DataForSEO ranked keywords). Slice 2 uses them for the content parity check.
- Show on the scan which data the benchmark came from ("Search Console" or "Estimated, no Search Console"). The estimated one is weaker; say so in plain English.

### 4. Suggested decision per URL (Ray approves or changes)

Five decisions:

| Decision | Suggest when | Outcome |
|---|---|---|
| Keep | The page matters or matches a Page Map page, and its URL can be kept as is | Same URL on the new site. No redirect |
| Reuse | The page matters but its URL can't be kept (`.html` endings, Wix `/post/...`, query strings, platform patterns), or it doesn't map one to one onto a new page | Content feeds the matching new page; 301 to it |
| Merge | Several old pages cover the same new page | All 301 to that one page |
| Retire | Doesn't matter and no match in our structure | 301 to the closest category or service page. 410 only if nothing relevant exists |
| Remove | Junk: hacked, spam, auto generated (foreign language paths the client never made, mass `/tag/` pages, injected pharma/casino pages) | 410. Never redirect |

Rules:
- A page that matters is never 410'd.
- **An old URL that matters beats the Page Map slug.** When Keep applies to a service the Page Map has at a different slug, propose changing the Page Map slug to the old URL. Ray approves; the Page Map updates, so we never have two pages for one service.
- **Without Search Console, be cautious:** never suggest 410 for anything except Remove. Retire always redirects.
- Every suggestion shows a one line reason in plain English.
- Ray can bulk approve, and edit any row.

### 5. URL map

- Every old URL gets a row: old URL, decision, new URL, redirect type (none, 301, 410).
- **Suggest the destination** by matching the old URL to Page Map pages on slug, title and H1 similarity. Ray confirms.
- Kept pages map to themselves.
- Never suggest the homepage as a destination unless the old URL was the homepage (or its variants).
- Export as CSV for the client sheet's Old Site Audit and URL map tabs.

### 6. Save old content

- Store the main text of every Keep, Reuse and Merge page against the matching new page as source material.
- Show it in the page view. Whether it's wired into generation prompts in this slice is an open decision (below).

### 7. Push redirects into Rank Math via the plugin

- New plugin endpoint to create, list and delete Rank Math redirections. Use Rank Math's own API or tables (check its code; prefer its PHP classes over raw SQL).
- Redirects are created **inactive** until launch, with a Copybot tag so we can find and roll them back.
- Same safety as copy pushes: dry run diff first, staging only, no push with a BLOCK, read back after push, rollback.
- Bump the plugin version and record its fingerprint.

### 8. Pre launch redirect validator

Run against staging (map the live domain to the staging host for testing). BLOCK vs WARN, like the existing validator:

- BLOCK: destination doesn't return 200; redirect chain or loop; a page that matters with no row; a top 20 page with no home on the new site; a Keep URL missing on staging; a destination off the domain.
- WARN: destination is the homepage; http/https or www mismatch; Retire row with a 410; image or PDF with backlinks and no row.

## Out of scope (slice 2 and later)

- Launch day: run every old URL against the live site after the switch, and again at day 7.
- DNS snapshot before launch and compare after (MX, SPF, DKIM, DMARC).
- Content parity check on staging (top 5 searches in title, H1 and body).
- 90 day monitoring against the benchmark, with red flags.
- Search Console service account API.
- Screenshots of every old page (put in the plan as optional if Playwright is cheap to run on Railway; otherwise slice 2).
- GA4.

## Tests

- Real run on southamptonhomes.co.uk. Must surface the NAP mismatch, the temp host link, and must not mark pages as mattering on junk links alone.
- Fixtures (fake sites): a Wix style site (`/post/` URLs), a hacked site with injected spam pages, an orphan page only in the sitemap, a redirect chain, a JS only page, a bot challenge homepage, a site with Search Console CSV and one without.
- Fake WordPress with Rank Math for the redirect push, read back and rollback.

## How to work

- Write a short plan first, including: endpoints and expected DataForSEO cost per scan, the proposed spam threshold, data model changes (add only, safe to run twice), and the screen layout. Wait for approval.
- Plain English on screen; no internal codes.
- Nothing ever writes to a live customer site.
- Open decisions: ask, don't pick.

## Open decisions for the plan

1. Default spam threshold and junk rules.
2. Screenshots in slice 1 or slice 2.
3. Wire saved old content into generation prompts now, or just store it.
4. Where the audit lives long term: Copybot only, or also synced to the client Google Sheet (CSV export covers slice 1).
