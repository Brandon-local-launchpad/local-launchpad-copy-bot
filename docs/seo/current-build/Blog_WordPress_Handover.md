# Blog posts on WordPress: what Given builds, and what Copybot needs (stage 7, 28 Oct 2026)

Copybot pushes a blog post as a WordPress **post** in one category, **Guides**, at `/guides/<slug>/`. The push is built and tested against the fake WordPress server only (`tests/fake-wp`, `tests/fixtures/blog-wp-push.js`). Nothing has been pushed to staging or to a live site, and nothing will be until Brandon says so. This page lists what the site needs before the first staging push.

## 1. What Given builds on the site

### Post type, category, permalink
- **Post type:** the standard WordPress `post`. No custom post type.
- **Category:** `Guides`, slug `guides`. Copybot creates it through the REST API if it is missing, but it is better made by hand so the archive and menu are ready.
- **Permalink:** every post must resolve at `/guides/<slug>/`. Set Settings → Permalinks → Custom Structure to `/guides/%postname%/` (all posts on this site are guides, so the structure can carry the prefix). Do not rely on the category base: `/category/guides/<slug>/` is wrong.
- **Archive:** a Guides archive page at `/guides/`, newest first (the category archive, or an Elementor archive template on the category). Navigation: Guides under About, or in the footer, until there are 5 posts (spec section 10).

### The plugin and ACF
- Install **Local Launchpad Copybot plugin 0.2.0** (`wp-plugin/llp-copybot/`). It registers the Rank Math and Yoast meta on posts as well as pages, and ships the ACF JSON for the seven blog field groups in `acf-json/` (ACF Pro syncs them: ACF → Field Groups → Sync).
- **ACF field groups** (keys `group_llp_blog_*`, location: post type `post` AND category `Guides`, all fields "Show in REST API"). Field names are fixed; the template reads them by name:

| Group | Fields |
|---|---|
| `blog_header` | `blog_h1` (text), `blog_byline` (text), `blog_last_checked` (text, shown as "Last checked 26 October 2026"), `blog_review_due` (text, not shown), `blog_image` (image, set on the site), `blog_image_alt` (text, set on the site) |
| `blog_answer` | `blog_answer` (WYSIWYG) |
| `blog_sections` | `blog_sections` repeater: `section_h2` (text), `section_body` (WYSIWYG) |
| `blog_table` | `table_show` (true/false), `table_after` (text: the 1 based number of the section the table sits under), `table_columns` repeater: `column_label`; `table_rows` repeater: `row_label`, `cell_1`, `cell_2`, `cell_3` (unused cells empty; 2 to 4 columns in all) |
| `blog_business` | `blog_business_show` (true/false), `blog_business_h2` (text), `blog_business` (WYSIWYG) |
| `blog_faq` | `blog_faq_h2` (text), `blog_faq_items` repeater: `faq_question` (text), `faq_answer` (WYSIWYG) |
| `blog_cta` | `blog_cta_h2` (text), `blog_closing` (WYSIWYG), `blog_buttons` repeater: `button_label`, `button_url`; `blog_schema` (textarea: JSON-LD) |

- **Tokens:** the copy keeps `[CV: key]` tokens (company name, phone, town). The plugin resolves them on display from the site's Client Values, as on the homepage. The blog schema's publisher is `[CV: business_schema_id]`: add that value (the LocalBusiness `@id` the site wide snippet uses) on the plugin's Client Values page. Copybot pushes it with the homepage once Brandon fills it on the Record tab.

### The single post template (Elementor), spec section 10 and 11
One Elementor single post template for the Guides category, reusing the homepage master components (header, breadcrumb trail, visible FAQ list, final CTA, the mobile sticky bar), reading the fields in this order:
1. **Post header:** `blog_h1` as the H1; then `blog_byline` and "Last checked `blog_last_checked`" on one quiet line; `blog_image` full width under it, or nothing. Never a stock image.
2. **Quick answer:** `blog_answer` in a tinted box with a thin left border, no heading.
3. **Question sections:** each `blog_sections` row as an H2 and its body, comfortable reading width (about 70 characters a line).
4. **Table:** when `table_show` is true, under the section numbered `table_after` (1 = under the first section). Header row shaded from `table_columns`; one row per `table_rows` row: `row_label`, then the cells for the remaining columns. Full width of the text column; scrolls sideways on mobile.
5. **How we handle it:** when `blog_business_show` is true, `blog_business_h2` and `blog_business` in a subtle card.
6. **FAQ:** `blog_faq_h2`, then each question as an H3 with its answer underneath, all visible, no accordion.
7. **Next step:** `blog_cta_h2`, `blog_closing`, then the buttons from `blog_buttons` (the primary action to `/contact/`, "Call …" as a `tel:` link). The homepage final CTA component, centred.
- **Schema:** print `blog_schema` inside a `<script type="application/ld+json">` in the head or the template. It holds BlogPosting (publisher = the LocalBusiness `@id`), FAQPage (from the FAQ items) and BreadcrumbList (Home → Guides → the post). If the site wide snippet already prints FAQPage or BreadcrumbList for posts, print only the BlogPosting object from it, so nothing appears twice. Never a second LocalBusiness block.
- **SEO:** the Rank Math title and description come with the push as post meta (`rank_math_title`, `rank_math_description`); nothing to set by hand.
- **Tracking:** `phone_click` and `quote_click` on the buttons, as on every page.
- **Scheduling:** the push sets the post to **Scheduled** with its publish date at 09:00 Europe/London. WordPress publishes it on the day through WP-Cron: make sure WP-Cron runs on the staging and live sites (or a real cron hits `wp-cron.php`). A post with no date, or whose date has passed before the push, goes up as a **draft**; Copybot's daily job (stage 8) publishes those through the REST API, so the push itself never publishes.

## 2. What Copybot needs from Brandon (credentials)

All of these go on the client's WordPress card in Copybot (Settings on the client), never in a message or a file:
1. **The staging site address** (`https://…`). The push refuses `http` except on localhost.
2. **A WordPress user for Copybot** with the Editor role at least (`edit_posts`, `publish_posts` for the scheduled status, `manage_categories` to make Guides) **plus** `manage_options` (Administrator) if the plugin's Client Values endpoint is to be written by the homepage push from the same user. One Administrator user named `copybot` is the simplest.
3. **An Application Password** for that user (Users → Profile → Application Passwords → name it "Copybot"). Copybot stores it encrypted with `COPYBOT_SECRET_KEY`.
4. **The plugin status** must report: ACF Pro active, the SEO plugin (Rank Math), and all seven `group_llp_blog_*` groups present. The WordPress card's "Test" button shows this; the dry run refuses a push while any group is missing.
5. **The site marked as staging** on the WordPress card while it is one. The push refuses a published post on a site not marked staging.

## 3. What the push does, and does not do
- Checks the record (no BLOCK, every FLAG read, claims accepted, approved), the site (plugin, ACF Pro, SEO plugin, the blog field groups), and the target (a post found by its slug in any status, or none).
- Dry run first: lists every field it would write; on a site with no such post it says the post would be created and with what status and date. Nothing is written.
- Push: a snapshot of what the post held (or "created"), then one write to `/wp-json/wp/v2/posts` (create or update: title = the H1, slug, the Guides category, status and `date_gmt`, the ACF fields, the SEO meta), then a read back compared field by field, then a log entry.
- Never publishes, never deletes. A rollback of a created post sets it back to a draft; a rollback of an update writes the snapshot back.
- A page's push writes the site's Client Values; a post's push does not.
