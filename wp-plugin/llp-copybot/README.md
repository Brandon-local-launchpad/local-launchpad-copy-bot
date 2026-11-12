# Local Launchpad Copybot (WordPress plugin)

Installed on every client site (through MainWP). It is the WordPress half of the Copybot push.

## What it does

- **Settings → Client Values**: one value per `[CV: key]` token (company name, phone, hours, travel distance and so on), plus the primary button label, the rating line, the map embed and the Google review link. Copybot pushes these; anything changed here is overwritten by its next push.
- **Token replacement**: when a page is shown, `[CV: key]` in the ACF fields and in the Rank Math or Yoast title and description is replaced with the value. A key with no value shows nothing. The editor and the REST API still see the raw tokens.
- **`[llp_cv key="phone"]`** shortcode, and `llp_cv( 'phone' )` in PHP, for the template (buttons, rating line, footer, map).
- **Homepage ACF field groups**: the master copy, in `acf-json/`, set to show on the site's front page. They load automatically (ACF local JSON). If the site already has hand-made groups with the same field names, delete those so these are the only ones.
- **REST access** for Copybot: `GET/POST /wp-json/llp-copybot/v1/client-values`, `GET /wp-json/llp-copybot/v1/status`, and the SEO title and description on `/wp-json/wp/v2/pages`.
- **Copybot redirects** (`redirects.php`): the old site redirects, into Rank Math through its own classes. Copybot pushes them switched off and tags them on this plugin's own list, since Rank Math has no tag column. They go live on launch day with the button on **Settings → Copybot redirects**, which rebuilds each destination from this site's address. `GET/POST /wp-json/llp-copybot/v1/redirects`, `/redirects/delete`, `/redirects/status`, `/redirects/check`. Rank Math's Redirections module must be on.
- **The Review Us page** (`review-funnel.php`, from 0.5.0):
  - `[llp_review_funnel]` draws the star box. Put it on the Review Us page in an Elementor **Shortcode** widget, in place of the old HTML block. It takes its colours from the site's Elementor global colours (accent, primary, secondary), so nothing is set per client.
  - 4 or 5 stars sends the customer to the client's Google review page (Client Values, `review_url`). With no link saved they get a thank you and no Google button.
  - 1 to 3 stars opens a private form (what went wrong, name, phone, email; a name, the feedback and a phone or an email are needed). The form posts to `POST /wp-json/llp-copybot/v1/review-feedback`, which passes it to Copybot; Copybot emails the client with a copy to the team. If Copybot can't be reached the site emails both itself, and if that fails too the customer is told it did not send. Nothing a customer types is stored on the site. Five sends an hour from one address.
  - Copybot sets where feedback goes with `GET/POST /wp-json/llp-copybot/v1/review-funnel` (the Send to the site button on the client's Reviews tab), which also sends the company name, the owner name and the Google review link.
  - `[CV: key]` tokens typed into Elementor text or ordinary page text are now filled when the page is shown, so "Thanks for choosing [CV: company_name]" works as typed.

Needs ACF Pro. Works with Rank Math (default) or Yoast.

## Connecting Copybot

1. Install and activate the plugin and ACF Pro.
2. Set the homepage as the front page (Settings → Reading).
3. Create a WordPress user for Copybot (role: Administrator, because it writes Client Values). In that user's profile, add an Application Password named "Copybot".
4. Enter the site address, the username and the Application Password in Copybot. Never send them by email or chat.

## Don't edit on a site

`acf-json/` and `client-value-keys.json` are generated from the Copybot repo (`npm run wp:plugin-data`). To change a field, change `wp/acf-schema.js` there and regenerate.
