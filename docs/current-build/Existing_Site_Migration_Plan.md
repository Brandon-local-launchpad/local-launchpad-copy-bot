# Existing Site Migration, Slice 1: the plan

Date: 5 Nov 2026 · Brief: `Existing_Site_Migration_Build_Brief.md` · Status: approved by Brandon on 5 Nov with the changes below. Branch `existing-site`. Stages 1 and 2 built; stop and show the southamptonhomes results before stage 3.

## Brandon's changes on approval (these win over anything below)

1. **`launch_domain` is dropped. `live_domain` is the only domain field.** The domain check needs no second field. A WordPress connection not marked staging, on a domain other than `live_domain`, is a domain change and stops the scan and the push. If the Add client wizard read a different domain from `live_domain`, the tab warns but doesn't stop, because a corrected typo looks the same. What this can't catch: a client moving domain whose connection is on staging and whose `live_domain` still holds the old domain, because nothing on file yet names the new one.
2. **The staging redirect test refuses to run if the WordPress connection's host matches the client's live domain, and always switches the redirects back off, even if the check fails partway.**
3. **Pages every site ships beyond the Page Map:** homepage, `/contact`, `/about`, `/privacy-policy`, `/terms` and `/blog`. **The thank-you page is never a redirect destination.** Given will confirm the list; build on this until she does. Both are in `site-audit/defaults.json`.
4. **Plugin 0.3.0 with redirects only is fine.**

All four open decision answers in section 9 are approved. Build order: the scan and the spam filter, then stop and show the southamptonhomes results before the decisions and URL map.

## Brandon's notes after the scan results (5 Nov, these win too)

1. **"Matters" stays at estimated traffic above 0 for now.**
2. **Reuse isn't stretched.** Assumption E in section 3 is withdrawn. Instead the main text of every HTML page is saved at scan time, whatever its decision, and shown in the page view. Decisions follow the brief's rules as written. `site_old_content` is not needed: the text stays on the scan's URL row.
3. **Validator stage:** every version of the domain (http, https, www, non-www) must reach the final URL in one hop after launch.
4. **The domain move gap is fine.** It's covered by sign-off in the SOP.

Stop and show the southamptonhomes decisions and URL map before the plugin and redirect push.

## How the rules were read in stage 3 (for Brandon to overrule)

- **A page that doesn't matter and matches a Page Map page at another address is Retire, 301 to that page, with no slug proposal.** The Keep row says "matches a Page Map page, and its URL can be kept as is". The slug rule says an old URL that matters beats the Page Map, so one that doesn't, doesn't. Its URL can't be kept, because the Page Map's address stands. The other reading would move Page Map pages to URLs with no traffic or links.
- **Several old pages on one new page:** a page already at the Page Map address wins. Otherwise the one that matters most and can keep its URL wins, and the Page Map moves if a person approves. The rest are Merge. If none can be kept, all are Merge to the Page Map page.
- **A phase 2 page is never a destination,** because it wouldn't exist at launch and the validator would block it.
- **An old URL already redirecting** carries on to wherever its target now lives: Reuse if it matters, else Retire.
- **Mass tag pages** means 10 or more (`mass_page_minimum`). A lone tag page is treated like any other.
- **Declining a slug change** makes the row Reuse, 301 to the Page Map page.
- **Undo** is on the Page Map changes card, beyond the brief, because a page move is otherwise hard to reverse.

To base this on real numbers I made read only DataForSEO calls ($0.44 in total, not logged in Copybot) and crawled the test site's 4 pages. Nothing was written to the database or to any site.

## 1. DataForSEO: endpoints and cost per scan

| Data | Endpoint | Why this one | Price |
|---|---|---|---|
| Backlinks per page | `backlinks/backlinks/live`, mode `as_is`, paged by `search_after_token` | The only source of per link spam score and referring domain rank. "Real referring domains" per page must be counted from these rows | $0.024 a request + $0.000036 a row, 1,000 rows a request |
| All pages with links | `backlinks/domain_pages_summary/live` | Finds linked pages when the link list hits its cap, so they are never missed | Same |
| Ranking URLs | `dataforseo_labs/google/ranked_keywords/live`, UK, `en`, organic, highest traffic first | URL, keyword, position, estimated traffic and volume per row | $0.012 a request + $0.00012 a row, 1,000 rows a request |

Not used: `backlinks/summary` (the first page of the list gives the totals) and `backlinks/referring_domains` (its `rank` was 0 on all 75 rows of the test site, while `domain_from_rank` on the link rows has real values). DataForSEO's platform field is ignored, as the brief says.

The prices above match what the account was charged on every call.

| Site | Size | Cost per scan | Basis |
|---|---|---|---|
| hampshirelandscapingservices.co.uk | Nothing known | $0.060 | Measured |
| solentlandscapes.co.uk | 47 links, no ranked keywords | $0.062 | Measured |
| **southamptonhomes.co.uk** | **82 links, 11 keywords** | **$0.064** | **Measured** |
| greenthumb.co.uk (national franchise) | 8,815 links, 3,820 keywords, 425 linked pages | $1.08 | First pages measured at $0.23, full pull worked out from the rates |

**Expect 6 to 15 cents for a local trade site, and about $1 at the very top end.** The crawl itself costs nothing.

Guards (settings): stop at $2 a scan, 20,000 link rows or 5,000 keyword rows, with a warning on screen. A page in the linked pages list whose links were cut off by a cap shows as "matters, not fully checked", the safe direction. The cost goes in `citation_api_costs` (kind `site_scan`), the table that already holds DataForSEO spend, and shows on the scan. `model_calls` only holds model spend, and a scan makes no model calls.

Time: about 1 request a second, so a 2,000 page site takes about 34 minutes. Every URL any source found gets fetched once, including URLs only DataForSEO knows about. Greenthumb's links include `/exeter` answering 404: old dead URLs with links are exactly what a crawl alone misses.

## 2. Spam threshold (open decision 1)

**Recommendation: a real referring domain has a spam score under 60 and trips none of the junk rules below.** The rules do most of the work; the score is the backstop.

Referring domains counted by registrable domain (`www.ycm.info` and `ycm.info` are one):

| Site | All | Under 50, score only | Under 60, score only | **Under 60 + junk rules** | Under 50 + junk rules | Under 30 + junk rules |
|---|---|---|---|---|---|---|
| southamptonhomes.co.uk | 75 | 3 | 12 | **3** | 3 | 3 |
| solentlandscapes.co.uk | 42 | 2 | 12 | **0** | 0 | 0 |
| greenthumb.co.uk (first 1,000 links) | 161 | 156 | 160 | **159** | 155 | 144 |

Why these rules:

- **A score cut-off alone fails.** At Solent, two junk sites score 20 and 35, and both have link pages with over 1,000 outgoing links.
- **Under 50 throws away real links.** Local newspaper directories (`leap.basingstokegazette.co.uk`, `leap.wirralglobe.co.uk`, `leap.lancashiretelegraph.co.uk`) score 50 to 55, and so does what looks like a local junior club (`tickhilljuniors.co.uk`, score 50). Under 30 also loses town sites like `southampton.co.uk` (30).
- **Referring domain rank can't rescue a link.** Junk reaches rank 324 (`bye.fyi`), so rank is stored and shown but never decides.

The junk rules, kept in `site-audit/junk-rules.json` (add a line, not code). A link is junk when any of these is true:

1. Its page has 500 or more outgoing links. Junk here usually had 3,000 or more, up to 25,001. The real links I read had 1 to 26, and this rule removed none of Greenthumb's real domains.
2. The anchor sells links: backlink, link building, dofollow, PBN, guest post, tiered, "DA 50", SEO. On the test site, 50 of 82 links carry "High Quality Dofollow Backlinks DA 50..." or "Premium Tiered Link Building...".
3. The domain or path has gambling, pharma, adult, loan or essay words, or link selling path words such as `/pbn-directory/`.
4. The domain ends in a listed junk ending: `.shop .online .cyou .site .website .party .fyi .link .xyz .top .click .icu .buzz .sbs .cfd .monster .rest .quest .lol .pw .tk .ml .ga .gq .cf`.

A link with no score counts as real unless a rule fires, and shows "not scored". Each junk link shows the rule that caught it, in plain English. Ray can override a page either way.

**Limits.** This is tested on three sites. On the test site `trustaine.com` and `localnow.net` still count as real, and both look auto generated. The homepage matters anyway, and on an inner page the error only protects a page. Check the threshold on Ray's first 3 migrations.

**The test site can't prove the main test.** All 82 of its links point at the homepage, so no inner page can be wrongly marked by junk. The hacked site fixture has to prove that.

The citations gap check (`citations/gaps.js`) drops links scoring 50 or more, so it has the same newspaper blind spot. I'd leave that alone in this build.

## 3. Where the brief needs a ruling

I found these while reading the code and the data. Each has the assumption I'll build on unless you say otherwise.

**A. Inactive redirects can't be tested through the site.** Rank Math only matches active rows (`DB::match_redirections`), so on staging an old URL answers 404 until the redirect is turned on.
Assumption: the validator has two parts. The map check needs no site: chains, loops, off domain, missing rows, and fetching every destination and Keep URL on staging. A second button, staging only, turns the redirects on, requests each old URL, compares the answer, and always turns them off again, even if the check fails partway. It refuses to run if the connection's host matches the live domain (Brandon's change 2).

**B. Contact and About aren't in the Page Map.** The generator makes homepage, category, service, location, location category and town service rows only. By the brief's rule, an unimportant `/about` would 301 to a service page.
Decided: a settings list of site pages that count as Keep and as destinations. See Brandon's change 3 at the top.

**C. "Estimated traffic above 0" is almost any ranking.** On the test site `/contact` matters because of position 26 and 0.003 estimated visits a month. All 11 of its keyword rows have estimated traffic above 0, so in practice the rule means "ranks at all".
Assumption: keep your definition, as it's the safe direction, with the number as a setting. On the test site, `/` and `/contact` matter; `/inspiration` and `/garden-design-service` don't.

**D. A hacked page that ranks.** "A page that matters is never 410'd" collides with Remove when an injected pharma page ranks or has links.
Assumption: junk is checked first, and a junk page's own keywords and links don't count towards mattering. If it matters on clean signals, it isn't suggested as Remove.

**E. A page that doesn't matter but matches a Page Map page at another URL.** The table doesn't cover it. Garden Design Service here has 1,215 words and no rankings or links.
Assumption: suggest Reuse, so the content is saved and the old URL 301s to the match.

**F. Nothing relevant and no Search Console.** Retire must redirect and must not use the homepage.
Assumption: the primary category page, with the reason saying nothing closer was found so Ray should check it.

**G. Images and PDFs.** Every URL gets a row, but thousands of 301s for images is noise, and an image redirected to a page isn't useful.
Assumption: with real links, a 301 to where the page it sat on now lives. With none, Retire with no redirect.

**H. The same domain check.** On staging the connection is always a different host, so it proves nothing. See Brandon's change 1 at the top: `live_domain` is the only field.

**I. Search Console's normal exports have no query per page.** Pages.csv has page clicks and Queries.csv has site wide queries, as separate files.
Assumption: clicks per page from the Pages file. Top 5 per page from a file only when it has both columns, otherwise from DataForSEO, and the screen says which. A zip upload also reads the date range from its `Filters.csv`, with a warning if it isn't 12 months. The parser (`search-console/csv.js`) exists only on the parked `blog` branch, so I'd copy that one file and nothing else.

**J. The WordPress hold.** STATUS says "Nothing else on WordPress until Given has answered the proposal" and that the plugin versions need reconciling. The redirect endpoints touch no ACF groups, so I read the hold as not covering them. Any plugin bump makes Copybot refuse pushes to a site until it is updated, and STATUS last recorded Edens Edge staging as behind, on 0.2.0.
**Question for you: is a plugin 0.3.0 with redirects only OK now?** The rest of the build doesn't depend on the answer.

## 4. Page Map slug override

Page records, allocations and links are all keyed by the slug itself (`page_key` is `type:slug`, and `v20_page_record` and allocation keys use the slug). Editing the slug would orphan the page's copy, and the next regeneration would retire the row and add a new one, losing H1 and status.

So on Ray's approval:

1. The override is stored against a stable identity (service id, category key, town), not the slug.
2. The generator's path functions (`svcPath`, `catPath` and so on) read the override, so links and LINKABLE PAGES all follow it.
3. In one transaction, the existing row, its record versions and its allocation keys are renamed, so regeneration sees no change.

A dry run lists every row that would change before Ray approves, and a slug collision is refused using the generator's own check. A page already pushed to staging shows a warning, because the site page must move too.

## 5. Redirect push

New plugin routes under `llp-copybot/v1` (`manage_options`): `GET /redirects`, `POST /redirects` (batches of 200), `POST /redirects/delete`, `POST /redirects/status`. `/status` also reports whether Rank Math's Redirections module is on.

Checked in Rank Math's source, which shapes the design:

- **Its PHP classes are used, not raw SQL:** `Redirection::from()`, `set_status('inactive')`, `save()`, `DB::delete`, `DB::change_status`.
- **It has no tag column.** The "Copybot tag" is the plugin's own option listing each Rank Math id, old URL and destination path. A redirect not on that list is never edited or deleted.
- **Duplicates.** `update_iff` looks for an existing row among active rows only, so pushing an inactive redirect twice would add a duplicate. The plugin always passes its saved id. An existing redirect for the same URL that isn't ours is shown in the dry run as a conflict and refuses the push.
- **Staging host in destinations.** `add_destination` turns a relative URL into the current site's address, so redirects made on staging hold the staging host. The plugin keeps the path and rebuilds the destination when redirects are turned on.
- **Turning on at launch.** Copybot never writes to a live site, so slice 1 adds a "Turn on Copybot redirects" button on the plugin's WordPress settings page, for Ray on launch day.
- **To prove on real Rank Math:** whether a `?id=5` URL matches correctly. Its main lookup ignores the query string and only tries the full address as a fallback.

Safety, same model as copy pushes: dry run diff first; the connection must be marked staging and its host must differ from `live_domain`; no push with a map BLOCK or a suggestion Ray hasn't approved; read back after push; snapshot and rollback in the existing `wp_snapshots` and `wp_push_log`; plugin version recorded by `npm run wp:plugin-version`.

## 6. Data model

Add only, created at start-up with `CREATE TABLE IF NOT EXISTS`, safe to run twice.

| Table | Holds |
|---|---|
| `site_scans` | One per run: status (including interrupted), platform and its evidence, warnings, issues, counts per source, benchmark source, cost, calls, caps hit, settings used |
| `site_scan_urls` | One per URL per scan: sources, status, redirect target and chain, canonical, noindex, title, H1, meta description, word count, inlinks, orphan, low text, main text, clicks, impressions, estimated traffic, all and real referring domains, matters and why, top 20, top 5 searches |
| `site_scan_backlinks` | One per link: URL, referring domain, linking page, anchor, spam score, domain rank, outgoing links, real or junk and why |
| `site_scan_keywords` | One per keyword per URL: position, traffic, volume, source |
| `site_url_decisions` | One per client per URL, so **Ray's work survives a rescan**: suggestion and reason, decision, new URL, Page Map row, redirect type, matters override and note, who approved and when |
| `site_old_content` | The saved main text per Keep, Reuse or Merge URL, against the Page Map row |
| `client_page_url_overrides` | Stable identity, kept path, old URL, approved at |
| `site_redirect_checks` | Each validator run: site, BLOCK and WARN counts, issues, the answer per URL |
| `site_audit_settings` | Per client overrides of `site-audit/defaults.json`: threshold, outgoing link limit, top 20 size, 3+ domain rule, traffic minimum, caps, site pages |

No columns change on existing tables, and no new Client Values. A Search Console upload is kept in one more table, `site_search_console`. A restart marks a running scan interrupted, and Resume carries on from the saved queue without paying DataForSEO again.

## 7. Screen layout

The Site audit tab (`public/app/tabs/audit.js`), top to bottom, with its dot on the client page: none, waiting for approval, or approved. All on screen wording is plain English.

```
Site audit                                   [Scan old site]  Last scan 5 Nov, $0.06
https://southamptonhomes.co.uk  ·  WordPress
! Warnings: bot block · pages with almost no text · page cap reached · new domain differs
┌ Total URLs ┐┌ Matter ┐┌ Top 20 ┐┌ Sites linking: real / all ┐┌ Approved ┐
│     4      ││   2    ││   2    ││          3 / 75           ││  0 of 4  │
└────────────┘└────────┘└────────┘└───────────────────────────┘└──────────┘
Benchmark: Estimated, no Search Console. These are DataForSEO's guesses and are
weaker than Google's own numbers.                  [Upload Search Console file]

Issues found
  Phone shown as 02381 550155, but the tap to call link dials 02381550183 (4 pages)
  Logo links to hh9.f77.myftpupload.com, a temporary host, not the live site (4 pages)
  http://www takes two hops to reach the live homepage

URL map  [All] [Matters] [Top 20] [Orphans] [Images & PDFs] [Not approved]
  [Approve selected] [Approve all suggestions] [Export audit CSV] [Export URL map CSV]
  Old URL | Found by | Status | Real/all sites | Traffic | Decision ▾ | New URL ▾ | Redirect | Why
  Click a row: top 5 searches, each link with real or junk and why, title, H1,
  word count, the saved text, "this page matters" override

Page Map changes   Keep /garden-design at its old URL (Page Map has /services/...)  [Approve] [No]
Redirects on staging   [Dry run] → the diff, conflicts, refusals → [Push, inactive] → read back, [Roll back], log
Pre launch check   [Run check] [Test on staging]   BLOCK and WARN lists, each naming the URL and the fix
Settings (closed by default)
```

**Page view:** a new "Old site content" card in the right column: old URL, decision, top 5 searches, the saved text with a copy button. Shown only when the page has saved content.

## 8. Build order, after approval

Code goes in a new `site-audit/` folder. Reused: `citations/dataforseo.js call`, `citations/nap.js`, `gbp/profile.js buildNap`, `citation_api_costs`, `wp/client.js`, `wp/db-store.js`, `wp/plugin-version.js`.

| Stage | What |
|---|---|
| 1 | Scan job: crawl, sitemap, DataForSEO, CSV, platform and warnings, issues, cost, top of the tab |
| 2 | Spam filter, matters, top 20, top 5 searches |
| 3 | Suggestions, URL map, bulk approve, CSV exports, Page Map override (built 5 Nov) |
| 4 | Saved text of every HTML page and the page view card (built 5 Nov) |
| 5 | Plugin 0.3.0, push, read back, rollback |
| 6 | Pre launch validator, including every version of the domain reaching the final URL in one hop after launch |

Things the test site already showed the crawler must handle:

- `sitemap_index.xml` is a plain URL list rather than an index, and robots.txt names two sitemaps.
- DataForSEO lists `http://` and `https://` homepages separately.
- `http://www` takes two hops.
- The generator tag doesn't say WordPress, so detection reads `wp-content`, `wp-json` and similar.
- A `myftpupload.com` link means GoDaddy hosting, not the GoDaddy builder.

**Tests.** The real run on southamptonhomes.co.uk must show the phone mismatch and the temp host link. Fixtures cover every fake site in the brief, and the fake WordPress gets Rank Math routes. The plugin's PHP runs under the existing php-wasm test with Rank Math stubs.

**What I can't test without help:** real Rank Math. That needs Ray to install 0.3.0 on the Edens Edge staging site, and I'd prove push, read back, rollback and the query string case there before calling stage 5 done.

**Added beyond the brief:** the site pages list; the staging test button; the "Turn on Copybot redirects" button; spend and row caps; Resume; a `cheerio` dependency for reading HTML properly; a list of non live hosts in `site-audit/non-live-hosts.json`.

## 9. The four open decisions

1. **Spam threshold and junk rules:** under 60 plus the four junk rules, as settings (section 2).
2. **Screenshots: slice 2.** Nothing in slice 1 reads them, the old site stays up until launch, and a browser on Railway is a real cost in memory and image size for up to 2,000 pages. They must run before the switch, so they belong with the launch work.
3. **Old content in prompts: store it now, don't wire it in.** Old copy carries prices, guarantees and "24/7" claims nobody has confirmed, which breaks the rule that claims only come from confirmed client values. Wiring it in also needs its own copy quality loop, and neither test client has an old site. In slice 1, "content feeds the new page" means Ray can read it in the page view. Wire it in later as its own stage, with claims stripped.
4. **Where the audit lives: Copybot only, with the CSV export for the client sheet.** Two editable copies will drift, and a Sheets sync adds credentials for no new ability. If the team later wants the sheet live, make it one way, from Copybot to the sheet.

## Sources

- [DataForSEO Backlinks API pricing](https://dataforseo.com/apis/backlinks-api)
- [DataForSEO Labs pricing](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api)
- [Backlinks live docs](https://docs.dataforseo.com/v3/backlinks/backlinks/live/)
- [Domain pages summary docs](https://docs.dataforseo.com/v3/backlinks/domain_pages_summary/live/)
- [Ranked keywords docs](https://docs.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live/)
- Rank Math source: [class-db.php](https://raw.githubusercontent.com/rankmath/seo-by-rank-math/master/includes/modules/redirections/class-db.php), [class-redirection.php](https://raw.githubusercontent.com/rankmath/seo-by-rank-math/master/includes/modules/redirections/class-redirection.php), [class-redirector.php](https://raw.githubusercontent.com/rankmath/seo-by-rank-math/master/includes/modules/redirections/class-redirector.php)
