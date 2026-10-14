# Local Launchpad Copybot (WordPress plugin)

Installed on every client site (through MainWP). It is the WordPress half of the Copybot push.

## What it does

- **Settings → Client Values**: one value per `[CV: key]` token (company name, phone, hours, travel distance and so on), plus the primary button label, the rating line, the map embed and the Google review link. Copybot pushes these; anything changed here is overwritten by its next push.
- **Token replacement**: when a page is shown, `[CV: key]` in the ACF fields and in the Rank Math or Yoast title and description is replaced with the value. A key with no value shows nothing. The editor and the REST API still see the raw tokens.
- **`[llp_cv key="phone"]`** shortcode, and `llp_cv( 'phone' )` in PHP, for the template (buttons, rating line, footer, map).
- **Homepage ACF field groups**: the master copy, in `acf-json/`, set to show on the site's front page. They load automatically (ACF local JSON). If the site already has hand-made groups with the same field names, delete those so these are the only ones.
- **REST access** for Copybot: `GET/POST /wp-json/llp-copybot/v1/client-values`, `GET /wp-json/llp-copybot/v1/status`, and the SEO title and description on `/wp-json/wp/v2/pages`.

Needs ACF Pro. Works with Rank Math (default) or Yoast.

## Connecting Copybot

1. Install and activate the plugin and ACF Pro.
2. Set the homepage as the front page (Settings → Reading).
3. Create a WordPress user for Copybot (role: Administrator, because it writes Client Values). In that user's profile, add an Application Password named "Copybot".
4. Enter the site address, the username and the Application Password on the client's Settings screen in Copybot, then click Test connection. Never send them by email or chat.

## Don't edit on a site

`acf-json/` and `client-value-keys.json` are generated from the Copybot repo (`npm run wp:plugin-data`). To change a field, change `wp/acf-schema.js` there and regenerate.
