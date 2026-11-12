# SOP: Replacing a client's existing website

For Ray (the audit and the redirects), Given (the WordPress build and the domain) and Brandon (sign-off). Written 12 Nov 2026 from what Copybot does today. Steps marked **By hand for now** are the ones Copybot doesn't do yet; they move into Copybot as it's built.

## Why this exists

Some clients come to us with a website that has been live for years. It may rank on Google, have other sites linking to it, and bring in enquiries. We replace it with a new WordPress site on **the same domain**. If we just switch it over, every old address that Google or another site points to breaks, and what the old site earned is lost.

**The rule: nothing on the old site is switched off until we know what it does. Every page that matters either keeps its address or is 301 redirected to the closest new page.**

## When this SOP applies

- The client already has a website on the domain we will use. The Fillout or GHL onboarding answers say so, or Given finds it when connecting the domain.
- **The same domain only.** If the client is also changing domain, stop and tell Brandon. Copybot refuses a domain change, and this SOP doesn't cover one.
- A brand new domain with no old site doesn't need this SOP.

## Who does what

| Step | Who |
|---|---|
| 1. Set the live domain | Ray |
| 2. Scan the old site | Ray |
| 3. Read the results | Ray |
| 4. Decide every URL | Ray, Brandon for anything unclear |
| 5. Page Map changes | Ray |
| 6. Build on staging | Given |
| 7. Push redirects to staging | Ray |
| 8. Pre launch check and staging test | Ray |
| 9. Go / no go | Brandon |
| 10. Launch day | Given, then Ray |
| 11. After launch: day 1, day 7, 90 days | Ray |

## 1. Set the live domain

On the client's **Record** tab, check **Live domain** holds the client's current website address (for example `smithlandscaping.co.uk`). It is the only domain field Copybot uses for this.

- If the Add client wizard read a different domain, the Site audit tab warns. Check which is right.
- The WordPress connection on the **Pages** tab must be marked **staging**, and its address must not be the live domain. Copybot refuses to push anything otherwise.

## 2. Scan the old site

Client page, **Site audit** tab, **Scan old site**.

- It reads the homepage, robots.txt and the sitemaps, then every page about one a second (up to 2,000), then asks DataForSEO for the rankings and backlinks. A small site takes about a minute and costs a few cents; the cap is $2 a scan (in **Settings** on the tab).
- **Search Console (optional).** If the client can give us their Search Console data, export the Pages and Queries report (Google's zip or a CSV) and press **Upload Search Console file**. It makes the results much more reliable. Most clients won't have it, and the scan works without it; the tab says "Estimated, no Search Console" when it doesn't have it.
- If the scan stops (a restart, a timeout), press **Resume**. It doesn't pay for anything twice.

**First 3 real migrations only:** run the free Screaming Frog on the old site and check its page count against Copybot's **Total URLs**. Tell Brandon if they're far apart.

## 3. Read the results

Check these before deciding anything:

- **Warnings at the top.** A bot block, a page cap hit, "JavaScript only" pages (the crawl may have missed pages) or a failed data source. If the homepage is bot blocked or JavaScript only, tell Brandon before going on.
- **Issues found.** Problems on the old site to keep off the new one: a phone number that doesn't match the tap to call link or Client Values, a wrong postcode, links to a temporary or staging host, a mix of http and www. Fix the client's record if the old site is right and the record is wrong.
- **Pages that matter.** A page matters if it gets Search Console clicks, ranks for something with estimated visits above 0, or has at least one real site linking to it. Junk links (spam score 60 or more, or a junk pattern) never count. You can mark a page as mattering, or not, by hand; that survives a rescan.
- **Top 20.** The old URLs with the most clicks or estimated visits, plus any page with 3 or more real sites linking. These are the ones that must have a home on the new site.

## 4. Decide every URL

Copybot suggests a decision for every old URL, with a one line reason and where it should go:

| Decision | Means |
|---|---|
| **Keep** | The new site uses the same address. No redirect. |
| **Reuse** | The page matters but its address can't be kept (`.html`, Wix `/post/`, a query string). Its text is kept for the new page; 301 to it. |
| **Merge** | Several old pages cover one new page. All 301 to it. |
| **Retire** | Doesn't matter and has no match. 301 to the closest category or service page; 410 only when nothing relevant exists. |
| **Remove** | Junk: hacked, spam or injected pages. 410, never a redirect. |

Rules Copybot follows, and you should too when editing a row:

- A page that matters is never a 410.
- Without Search Console, nothing but Remove is a 410.
- The homepage is never a destination, except for the homepage's own variants.
- A thank you page or a phase 2 page (one that won't exist at launch) is never a destination.
- Images with no links, rankings or clicks need no decision; they sit in one closed group ("no action needed").

Go through the list, edit any row that's wrong, then **Approve them** (all, a selection, or one row). If you aren't sure about a row, ask Brandon and leave it unapproved.

Press **Export Old Site Audit CSV** and **Export URL map CSV**, and put both into the client's Google Sheet.

## 5. Page Map changes

When an old URL that matters is at a different address from the Page Map's page for the same service, Copybot proposes moving the Page Map page to the old address (one page, no redirect). The **Page Map changes** card shows each one:

- **Move the page to [old address]**: the Page Map, its links and its records follow. **Undo** is on the card.
- **No, redirect**: the Page Map stays and the old URL is redirected to it.

Do this **before** the copy is written where you can. If copy has already been written that links to the old Page Map address, the card names the pages to regenerate.

## 6. Build on staging (Given)

Given builds the new site on the staging host as usual. Two extra things for a migration:

- The staging site must have the **Local Launchpad Copybot plugin, version 0.3.0 or later**, and **Rank Math** with its **Redirections** module on.
- Old page text: each new page's page view in Copybot shows the old site's text for every old URL that maps to it. Use it as source material, never pasted in as it is.

## 7. Push the redirects to staging

Site audit tab, **Redirects on staging**:

1. **Dry run.** It shows what would be added, changed or removed, or why it refuses (an unapproved row, a BLOCK in the map, an old plugin, Rank Math or Redirections off, or a redirect someone else made for the same address). Fix the reason and dry run again.
2. **Push, inactive.** The redirects go into Rank Math **switched off**, so visitors to staging see nothing yet. Copybot reads them back and says whether they match.
3. If anything is wrong: **Roll back the last push**.

Change a decision later? Approve it, then dry run and push again.

## 8. Pre launch check and staging test

Same card, **Pre launch check**:

1. **Run the check.** BLOCK stops a launch; WARN is for you to read.
   - BLOCKs before the build is finished are normal (destination pages not on staging yet). Run it again when Given says the site is built.
   - The live domain's versions (http, https, www) only warn before launch, because the live domain is still the old site.
2. **Test on staging.** It switches the redirects on for a moment, requests each one, and switches them all off again, even if it fails part way. Every row should answer as the map says, and it should end with "All switched back off". If a redirect doesn't fire, purge the LiteSpeed cache on staging and test again.

**Ready for launch when:** the check shows no BLOCK, the staging test passes, and every Top 20 page has a home.

## 9. Go / no go (Brandon)

Brandon signs off before launch. Send him:

- The check result (no BLOCK) and the staging test result.
- The Top 20 list with where each one goes.
- The DNS snapshot from step 10.1.
- Anything you marked by hand or weren't sure about.

**Brandon also signs off the domain itself:** Copybot can't tell if a client is quietly moving to a new domain while their record still holds the old one. Check the domain on the record is the one the new site will launch on.

## 10. Launch day

1. **Snapshot the DNS. By hand for now.** Before anything changes, record every DNS record for the domain from the registrar or DNS host: A, CNAME, **MX, SPF, DKIM, DMARC** and any other TXT. A screenshot or export into the client folder. The client's email depends on the MX and TXT records: losing them breaks their email.
2. **Given switches the domain** to the new site and sets WordPress to the live domain, keeping every MX and TXT record.
3. **Turn the redirects on.** In the new site's WordPress admin, **Settings → Copybot redirects → Turn on Copybot redirects**. The screen shows the last check's BLOCK count; don't turn on with a BLOCK. The destinations are rebuilt for the live domain as they turn on.
4. **Check the live domain.** Site audit tab, **Check the live domain after launch**. Every version of the domain (http, https, www and non-www) must reach the final address in one hop. A BLOCK here is fixed the same day (Given: the hosting or Rank Math settings).
5. **Check the email. By hand for now.** Compare the DNS against the snapshot: MX, SPF, DKIM and DMARC unchanged. Ask the client to send and receive one email.
6. **Check the old URLs. By hand for now.** Open each Top 20 URL, and a handful of the others, on the live domain in a private window. Each should land on the page the map says, in one hop, with no 404.

If something is badly wrong (the homepage is down, email has stopped): Given points the domain back to the old site, and you tell Brandon. The redirects are only on the new site, so the old site is untouched.

## 11. After launch

- **Day 7. By hand for now.** Repeat step 10.6 for every URL in the map. If the client has Search Console, check the Pages report for new "Not found (404)" errors and add a redirect for any old URL that shows up there.
- **Content check. By hand for now.** For each Top 20 page, its top searches (on the Site audit tab) should appear in the new page's title, H1 or text. If one doesn't, tell Brandon: the page may lose that search.
- **90 days. By hand for now.** Watch the monthly rank scan (Rankings, Local Falcon) and ask the client about enquiries at each check in. Tell Brandon at once if: a Top 20 page's searches drop out of sight, enquiries fall noticeably, or Search Console shows a jump in errors.

## What Copybot doesn't do yet

These are the **By hand for now** steps above. They're planned for the next build: checking every old URL against the live site on launch day and at day 7, the DNS snapshot and comparison, the content check on staging, the 90 day monitoring with red flags, the Search Console connection (instead of a file), and screenshots of the old pages.
