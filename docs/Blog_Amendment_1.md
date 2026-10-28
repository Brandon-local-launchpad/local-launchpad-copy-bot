# Blog Post Structure: Amendment 1

28 October 2026 · Brandon

## What changed and why

Blog posts are now written in six month batches, so nobody works on a client's blog in between. Copybot writes and schedules months one to six at onboarding. From month six, a Search Console batch every six months writes the next six posts from the searches the site already appears for.

Everything in the Blog Post Structure stays as written unless this amendment replaces it. The sections below replace B1 and B10, add B16, close four open items and add one automatic job to the build spec.

## Cadence and batches (replaces B10)

The onboarding batch is 16 posts covering months one to six. Each later batch is 6 posts, one a month, written at the start of the six months it covers.

| Batch | Written | Covers | Posts | Topics from |
| --- | --- | --- | --- | --- |
| Onboarding | At onboarding, before launch | Launch to month 6 | 16 | FAQ research, dossiers, seasonal topics (B1) |
| Search Console 1 | Month 6 | Months 7 to 12 | 6 | Search Console, then the rest of the queue (B16) |
| Search Console 2 | Month 12 | Months 13 to 18 | 6 | As above, plus the yearly fact recheck |
| Each one after | Every 6 months | The next 6 months | 6 | As above |

Onboarding batch schedule:

| When | Posts |
| --- | --- |
| Launch | 3: the homepage cost guide and the first two service cost guides |
| Month 1 | 2 (5 including launch) |
| Month 2 | 4 |
| Month 3 | 3 |
| Month 4 | 2 |
| Month 5 | 1 |
| Month 6 | 1 |

Posts after launch are spaced evenly within their month. A seasonal topic still moves to the month before its window and may push a question post back.

Each batch is generated, validated and reviewed in one sitting, then pushed to WordPress as scheduled posts. Launch posts publish with the site: if the launch date isn't set at push time, they go up as drafts and publish when the site goes live.

## Topic queue (changes to B1)

B1 now builds 16 topics for the onboarding batch instead of about 15. The order is unchanged: cost guides first, then customer question posts (decision and question), then local and seasonal posts.

- **Short queue:** under 16 topics after B1, local posts fill the gap as before. Still short, the batch runs with what it has, flags F-QUEUE, and the Search Console batch picks up from month six rather than padding.
- **Reservation:** the blog topics, query stacks and FAQ IDs are reserved in the same sorting step that hands questions to every other page. Blog questions are taken before service pages are generated, so no page can use a question a post needs.
- **Leftovers:** approved questions not used in the onboarding batch stay in the queue for the Search Console batches.

## B16. Search Console batch (new)

In month six, and every six months after, Copybot builds the next six posts from the client's Search Console data. The client page shows "Search Console batch due" from the batch date until it is run; one person runs and reviews it in one sitting.

**Input.** The site's Search Console queries for the last 90 days, UK, pulled through the Search Console API. A CSV export can be uploaded instead, for testing or when the API connection fails.

**New post candidates.** A query qualifies when all of these hold:

- 10 or more impressions in the 90 days;
- average position worse than 10 (off page one);
- no page or post on the site already owns it (its target query, H1, an H2 or an FAQ question);
- it is a question, or reads as one ("pergola planning permission southampton" becomes Does a Pergola Need Planning Permission?).

**Order for the six slots.**

1. A seasonal topic whose publish month falls in the batch.
2. Qualifying Search Console queries, most impressions first.
3. Approved FAQ research questions left over from B1.
4. Unused dossier conditions (local posts).

Each Search Console query is rewritten into approved question wording, and a person approves the wording in the batch review, as with FAQ research questions. The query itself is stored with the post as its source. Then B2 to B15 run as for any post.

**Page improvements.** Queries where an existing page sits at positions 5 to 20 with 20 or more impressions are listed for the same review, each with the page it belongs to and a suggested FAQ question or section brief. Version 1 only lists them; the reviewer decides which to add on the page's next regeneration. Automatic regeneration comes later.

**Short batch.** If fewer than six topics pass the gates, the empty months are filled by refreshing a post that is past or within six months of its review date: its facts are rechecked and it is regenerated if anything changed. The batch flags F-SC-THIN.

**Yearly recheck.** The batch at month 12, 24 and so on also rechecks every published post whose review date falls before the next batch, and regenerates any whose facts changed.

**Schedule.** The six posts publish one a month across the six months the batch covers, spaced evenly, under the same seasonal rule as B10.

The thresholds above (10 impressions, position worse than 10, positions 5 to 20, 20 impressions) are starting values to check after the first real batch.

## Open items now closed

| Item | Decision | Changes |
| --- | --- | --- |
| Specificity threshold (B9) | 4 of the 6 facts for every post. 3 of 6 when the topic came from Search Console, because the search proves demand | Replaces "may drop to 3 from month four for thin niches" |
| Byline (B13) | The owner's name and role when [CV: owner_name] is set; otherwise [CV: company_name] | As drafted; the onboarding form must capture the owner's role |
| Price ranges | Yes. Collected at onboarding as the client's price rows | cost_mode is prices whenever the service has a price row |
| URL | /guides/[slug]/ for every post, cost guides included | None |

## Daily automatic job (new, build spec section 10)

Once a day, for every active client, Copybot runs one job that needs no person. It replaces "Given schedules by hand" and gives the backfill an owner.

1. **Hold check (posts due in the next 2 days).** If the post's primary link page isn't Live, the post moves back 7 days in WordPress and the Page Map, and flags F-HELD. It is checked again each day.
2. **Publish check (posts due today or earlier).** A post still marked scheduled in WordPress after its date is published through the REST API. New sites with little traffic often miss WordPress's own schedule. Given also sets a server cron on each site as a second safeguard.
3. **On publish.** The post is marked Live in the Page Map, and the backfill runs: the matching service page prices section, the category page cost section and, for the homepage cost guide, homepage FAQ Q1 link to it on an automatic re-push. The GBP batch is given the post's URL for that month's seasonal GBP post.
4. **Price change.** When a client's price rows change, any scheduled post stating a changed price is regenerated and goes to the review queue, flagged F-PRICE-CHANGED. It can't publish until approved; if its date arrives first, it is held as in step 1.
5. **Churn.** When a client is marked churned, every scheduled post that hasn't published goes back to draft in WordPress, so nothing more publishes. Drafts can be restored if the client returns. Published posts stay up.

Every action is logged on the client page, so anyone can see what the job did and why.

## Page Map, flags and rollout test

**New Page Map columns for blog rows:**

| Column | Values |
| --- | --- |
| Batch | onboarding / sc-1 / sc-2 / ... |
| Source | faq_research / search_console / seasonal / dossier / refresh |
| Source query | The Search Console query, when Source is search_console |

**New flags:**

| Code | Meaning | Effect |
| --- | --- | --- |
| F-HELD | Primary link page not Live 2 days before publish | Post moved back 7 days, checked daily |
| F-PRICE-CHANGED | A stated price changed after the post was written | Regenerated, back to review |
| F-SC-THIN | Fewer than 6 topics passed in a Search Console batch | Empty months filled with refreshes |

F-QUEUE now means fewer than 16 topics for the onboarding batch.

**Rollout test.** Run the onboarding batch of 16 topics, not 15, for the test clients (Eden's Edge and a roofer now; a dog walker once the pet care niche entry exists). It passes only when the 16 posts push to the test WordPress as scheduled posts with the right dates and URLs, and a simulated six months of the daily job publishes them in order with the backfill links in place.

## Still open

- [ ] Cost Guide Structure tab (Brandon). The three launch posts are cost guides, so this is needed before the first real batch. Until then, cost guides run on the rules in the Blog Post Structure.
- [ ] Search Console access: add Copybot's service account as a user on each client's Search Console property at launch.
- [ ] Search Console thresholds in B16: check after the first real batch.
- [ ] Owner role: confirm the onboarding form asks for it, for the byline.
