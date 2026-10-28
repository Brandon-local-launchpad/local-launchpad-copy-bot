# Blog posts in Copybot: build brief (v1, 28 Oct 2026)

Scope: add the blog page type to Copybot, from topic queue to scheduled WordPress posts, plus the daily automatic job and the Search Console batch. Work on its own branch (`blog`), shipped stage by stage, with a preview after each stage. Live client sites are off limits: fake WordPress server first, then staging only, until Brandon says otherwise.

## Read first

1. `docs/Blog_Post_Structure.pdf` (Ray's spec). It is the source of truth for sections, fields, decisions B1 to B15, validator checks B-N1 to B-N9, flags and the WordPress build.
2. `docs/Blog_Amendment_1.md`. It replaces B1's count and B10, adds B16 and the daily job. The key points are restated under "What the amendment changes" below; where the spec and the amendment disagree, the amendment wins.
3. `prompts/Blog_Post_Copywriting_Prompt_CORE (1).md`. The prompt. Its output contract is the one in spec section 8.
4. The existing v20 homepage pipeline (decisions engine, allocation, generation, validator and retries, downloads, the WordPress push with its safety checks, dry run, rollback and fake server, the PHP runner) and the service page type. Blog copies those patterns. Do not invent new ones.

Before writing code, reply with a plan: where blog slots into each existing stage, every file you will add or change, and anything in the spec that conflicts with how the codebase works now. Wait for approval.

## What the amendment changes (summary)

- Onboarding batch: 16 posts covering launch to month 6. Launch 3 (homepage cost guide, then the first two service cost guides), month 1: 2, month 2: 4, month 3: 3, month 4: 2, month 5: 1, month 6: 1. Spaced evenly within each month; seasonal topics move to the month before their window.
- Search Console batches: every 6 months from month 6, 6 posts, one a month (B16).
- Specificity (B9): 4 of 6 by default; 3 of 6 when `source` is `search_console`.
- Byline (B13): owner name and role when `owner_name` is set; else company name.
- Price ranges are collected at onboarding; cost_mode is `prices` when the service is in `price_list`.
- URL: `/guides/[slug]/` for every post.
- New Page Map columns: Batch, Source, Source query. New flags: F-HELD, F-PRICE-CHANGED, F-SC-THIN. F-QUEUE now means fewer than 16 topics.
- A daily job publishes, holds, backfills, regenerates on price change and drafts on churn (stage 8).

## Stages

Each stage ends with its test passing and a preview Brandon can look at. Don't start the next stage until the current one is approved.

### Stage 1: data

- Page Map: blog rows with every column in spec section 2 plus Batch, Source, Source query.
- Client record: `owner_name`, `owner_role`, `price_list` (map from the onboarding form fields already collected; show which services have prices), `search_console_property`, `status` (active / churned), `launch_date`.
- Niche slot additions from spec section 3 (`seasonal`, `seasonal_topics`, `safety_topics`, `blog_cta_h2`, `cost_unit`, `decision_pairs`) for Landscaper, Roofer and Pet Care first. The other niches get the business type defaults until their entries are written.
- Test: Eden's Edge, a roofer and a dog walker records load with every blog input present or reported missing in plain words.

### Stage 2: sorting includes blog

- The FAQ sorting step reserves blog topics, query stacks and FAQ IDs from the "Kept for a Cost Guide page" and "No page for these" buckets, in the same run that allocates questions to every other page.
- Extend the site wide check so no question, neighbourhood or symptom repeats across pages and posts.
- Test: run sorting for Eden's Edge. The site wide check reports zero repeats, and every blog FAQ ID is absent from every other page's allocation.

### Stage 3: decisions (`page-types/blog.js`)

- B1 to B15 exactly as the spec, with the amendment's changes. Gates G-TOPIC, G-SPECIFIC, G-PRIMARY, G-FACTS, G-INPUT.
- Phase 2 pages count as Launching for G-PRIMARY; the daily job's hold check covers the case where they aren't Live by the publish date.
- Preview screen: the queue as a table (type, H1, character counts, SEO title, primary and secondary links, switches, specificity count, gate results, publish date, flags).
- Tests:
  - Eden's Edge: 16 rows, or fewer with F-QUEUE. First three are cost guides and the first is marked Homepage cost guide. Publish dates match the schedule. Every H1 is 70 characters or fewer and every SEO title 60 or fewer. No FAQ ID is used twice.
  - Same input run twice gives identical decisions.
  - A topic with 3 of 6 specificity facts is skipped, unless its source is `search_console`.

### Stage 4: generation

- Blog CORE (1) with the same five block message as the homepage, client block cached, `prompts/_shared_copy_rules.md` appended under SHARED COPY RULES.
- Batch API with resume; intent key = client + slug, so a re-run updates instead of duplicating.
- Parse the output contract into the section 6 fields; HIDDEN handled as on the homepage.
- Test: generate the 16 Eden's Edge posts. Every post parses into its fields with nothing left over.

### Stage 5: validator

- Every shared check from Homepage section 9, plus B-N1 to B-N9, word ranges per post type, retries as for the homepage.
- Fixtures: the sample post in spec Appendix B must pass with no BLOCK. One broken copy of it per BLOCK check (a price not in the price list, "Part P", a third primary link, a reused FAQ question, a safety post with a DIY step) must each fail on the right check.
- Test: fixtures pass and fail as expected; the 16 generated posts end with no BLOCK.

### Stage 6: review

- Blog posts appear in the Pages tab under a Blog type filter, and open in the Page view (reader view, inline edit with the validator re-running, Approve, Regenerate).
- Batch review: one screen listing every post in a batch with status, flags and a link to each, plus "Approve all without BLOCK or unreviewed FLAG".

### Stage 7: push to WordPress

- ACF field group for blog posts in `wp/acf-schema.js` with the section 6 field names, location rule: post type post, category Guides, `show_in_rest` on. Regenerate the plugin.
- Push to `/wp-json/wp/v2/posts`: category Guides, slug, `status: future` with `date_gmt` (convert from Europe/London), Rank Math title and description, the blog ACF fields, BlogPosting and FAQPage data as in spec section 10. Launch posts with no launch date go up as drafts.
- The existing safety rails apply: no push with a BLOCK, nothing unreviewed, dry run first, rollback on failure.
- Test: push Eden's Edge's 16 posts to the fake server. 16 posts at `/guides/[slug]/`, 3 draft or launch-dated and 13 scheduled with the right dates, correct field values, re-push changes nothing.

### Stage 8: daily job

A Railway cron, once a day, per active client:

1. Hold: a post due within 2 days whose primary link page isn't Live moves back 7 days (WordPress and Page Map), F-HELD.
2. Publish: a post still scheduled after its date is published through REST.
3. On publish: mark Live in the Page Map; re-push the backfill (service page prices section, category page cost section, homepage FAQ Q1 for the homepage cost guide); store the URL for the GBP batch.
4. Price change: when `price_list` changes, regenerate scheduled posts that state a changed price and send them to review, F-PRICE-CHANGED. Unapproved posts are held, not published.
5. Churn: client status churned moves every unpublished scheduled post to draft. Published posts stay.

Log every action on the client page.

Test with the fake server and a clock override: simulate 190 days from launch for Eden's Edge. Posts publish in order on their dates. A post linking to a phase 2 page that goes Live on day 40 is held until then. Backfill links appear on the right pages the day each cost guide publishes. A price change on day 60 sends the affected scheduled posts to review. Marking the client churned on day 100 leaves the remaining posts as drafts.

### Stage 9: Search Console batch (B16)

- Search Console API (`searchanalytics.query`, last 90 days, country GBR) using a service account that Brandon adds as a user on each client's property. A CSV upload of a Search Console export as a second input route.
- On the client page: "Search Console batch due" from month 6, then every 6 months.
- Candidate screen: new post candidates (10+ impressions, average position worse than 10, not owned by any page or post), each with a suggested question wording to approve or edit; page improvement candidates (positions 5 to 20, 20+ impressions) listed with the page and a suggested FAQ question, list only in this version.
- Fill the six slots in the B16 order, run B2 to B15, generate, validate, review and push as stages 4 to 7. Short batch: refresh posts near their review date, F-SC-THIN. Month 12, 24 and on: also recheck published posts due for review.
- Test: upload a fixture Search Console CSV for Eden's Edge (Brandon will supply one from any live site, or build one with 40 rows mixing qualifying, owned and low impression queries). Exactly the qualifying queries appear as candidates, owned ones never do, and the batch schedules 6 posts across months 7 to 12.

## Acceptance test

The rollout test from the spec, updated:

1. Three clients: Eden's Edge (landscaper, type A, price list from the form, 0 reviews), a roofer (type A, full data, emergency niche), a dog walker (type C, no category layer).
2. Each runs the onboarding batch: 16 topics (or the expected F-QUEUE), no BLOCK after retries, flags as expected, the site wide check finds no two posts making the same point.
3. Each pushes to the fake server, and the 190 day daily job simulation passes as in stage 8.
4. Eden's Edge then pushes to staging. Brandon checks in WordPress: launch posts visible, the rest listed as scheduled with the right dates, one post opened on mobile against spec section 11's QA list.

## Don't

- Push to any live client site.
- Change any other page type's prompt, decisions or output.
- Click Generate All on a v20 client.
- Build the cost guide sections from Brandon's Cost Guide Structure tab until it arrives; cost guides run on the spec's rules until then.
