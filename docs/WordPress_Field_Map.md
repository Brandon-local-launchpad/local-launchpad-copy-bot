# WordPress Field Map

For Given, who builds the WordPress templates. Written on 5 Nov 2026 from the code: `wp/acf-schema.js`, `wp/homepage-map.js`, `wp/push.js`, `page-types/` and the page records. Regenerate it when those change.

## Read this first

| Page type | ACF fields in the plugin | Copybot can push it | Copybot writes the copy |
|---|---|---|---|
| Homepage | Yes, 12 field groups | Yes | Yes |
| Category | No | No | Yes |
| Location category | No | No | Yes |
| Service | No | No | Yes |
| Town service | No | No | Yes |
| Location | No | No | Yes |
| Blog | No | No | No: Copybot has no blog page type |

**Only the homepage is mapped to WordPress.** For the other five page types, the names below are Copybot's own, taken from its records and prompts. They are the proposed ACF names, and nothing on a site uses them yet. The types shown for them are proposed too. In the code each of those page types says: "the WordPress mapping waits for the template's field map".

**Blog has no spec and no code.** It is not in the page structure document, which lists six page types and four templates, and Copybot has no prompt, record, validator or field for it. So there is nothing to map.

### How the fields behave

- **Type `wysiwyg`:** the record holds Markdown. The push converts it to HTML, including links.
- **`[CV: key]` tokens:** copy keeps tokens such as `[CV: company_name]`, and the examples below show them as stored. The plugin replaces them when the page is shown, through `acf/format_value`, and in the Rank Math or Yoast title and description. A key with no value shows nothing. The template can also use `[llp_cv key="phone"]` or `llp_cv( 'phone' )`.
- **Set by:** "Model" means the writing model wrote it. "Code" means Copybot decided it, from the named client values, the page map or the niche entry. The model never sets a code field.
- **Edits on the site:** fields Copybot writes are overwritten by the next push. Don't rename fields on a site. To change one, change `wp/acf-schema.js` and regenerate the plugin's files.
- **Examples:** they come from Edens Edge test runs, not published pages. The homepage, Paving Contractor and Patios records are from 4 Nov 2026. The town pages and the location page are from 27 Oct 2026, so their wording is older but their field names are current.

## How a push finds its page

**Homepage:** if the connection has a homepage slug, it reads `/wp/v2/pages?slug=<slug>&status=any` and takes the first result. Otherwise it reads `page_on_front` from `/wp/v2/settings` and uses that page. Set the homepage in Settings, Reading.

**Every other page type:** there is no matching. `findPage` returns nothing and the payload builder refuses with "cannot be pushed yet". Each record does carry `page_slug` (for example `/services/patios`), which is the natural key once a mapping exists. How it should match, by slug or by a stored page ID, is still to decide.

**What the push refuses, and what it never changes:**
- The plugin must be active with the expected version, ACF Pro active, the SEO plugin matching the connection, and all 12 homepage groups present.
- The ACF groups' location rule is the site's front page, so the fields attach only there. A page that isn't the front page is refused rather than losing the copy silently.
- The target page must be a draft unless the site is marked staging.
- The page's status is never changed. Each push takes a snapshot first and reads the fields back afterwards.

## Is the plugin current?

**Yes for the homepage, at version 0.2.1.** The files in `wp-plugin/llp-copybot` match the recorded fingerprint, and the generated field groups and Client Values keys match `wp/acf-schema.js` and `wp/client-values.js`. A fixture fails if they drift. The plugin's code last changed on 3 Nov 2026 and its generated files on 2 Nov 2026.

**It has no field groups for the other page types.** I can't tell from the repo which version each client site runs. Copybot's connection test and dry run compare the site's reported version with 0.2.1 and refuse a push on a mismatch.

## Where to see a page's field names in Copybot

On a page's view, press **Show field names** above the page text. Each block is labelled with its field, blue for the model and grey for code, and fields the page text doesn't print (URLs, for example) are listed underneath. On a type with no ACF fields yet, it says those names are proposed.

The WordPress card's **Dry run** also lists every homepage field it would change, by ACF name, but it needs a connected site.

## Homepage

All fields below exist in ACF. Edens Edge has no reviews, verified logos or owner photo on file, so those sections are hidden on it and their examples say so. Group names are `group_llp_home_hero`, `group_llp_home_trusted` and so on, one per section.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `home_hero_h1` | text | 1 Hero | Code: the page map H1, or `h1_override` | Landscaper Southampton |
| `home_hero_trust_line` | text | 1 Hero | Code: `year_founded` at 5+ years ("Established in..."), else `jobs_completed`, else the first of `guarantee_years`, `manufacturer_warranty`, `insurance_cover` | 100+ Jobs Completed |
| `home_hero_intro` | wysiwyg | 1 Hero | Model | [CV: company_name] is a landscaper in Southampton, covering Romsey and the surrounding areas. Fixed prices wi... |
| `home_hero_background_image` | image | 1 Hero | Not Copybot: filled on the site | (image) |
| `home_trusted_show` | true_false | 2 Trusted & Rated By | Code: 5+ reviews (`review_count`) or any `verified_logos` | false |
| `home_trusted_logos` | repeater | 2 Trusted & Rated By | Code | (hidden on Edens Edge) |
| `home_trusted_logos[].logo_image` | image | 2 Trusted & Rated By | Not Copybot: filled on the site | (image) |
| `home_trusted_logos[].logo_caption` | text | 2 Trusted & Rated By | Code: `verified_logos` caption or name | (hidden on Edens Edge) |
| `home_trusted_logos[].logo_url` | text | 2 Trusted & Rated By | Code: `verified_logos` register URL | (hidden on Edens Edge) |
| `home_trusted_logos[].logo_tier` | text | 2 Trusted & Rated By | Code: `verified_logos` tier | (hidden on Edens Edge) |
| `home_content_block_h2` | text | 3 Content block | Code: niche trade word, base town, `area_wide` | Local Landscaping in Southampton and Nearby Towns |
| `home_content_block_body` | wysiwyg | 3 Content block | Model | Gardens in Southampton range from long, tree filled plots to compact town ones. Most of our work as a landsca... |
| `home_content_block_image` | image | 3 Content block | Not Copybot: filled on the site | (image) |
| `home_content_block_image_alt` | text | 3 Content block | Not Copybot: filled on the site | (alt text) |
| `home_services_h2` | text | 4 Services | Code: niche trade word, base town | Our Landscaping Services in Southampton |
| `home_services_intro` | wysiwyg | 4 Services | Model | We look after gardens, hedges and trees, and build patios, paving and decks, for homeowners in and around Sou... |
| `home_services_cards` | repeater | 4 Services | Code: one row per category page | 6 rows |
| `home_services_cards[].card_name` | text | 4 Services | Code: page map category name | Gardener |
| `home_services_cards[].card_text` | wysiwyg | 4 Services | Model | A hedge that has outgrown its line and weeds spreading through the borders soon make a garden feel out of han... |
| `home_services_cards[].card_image` | image | 4 Services | Not Copybot: filled on the site | (image) |
| `home_services_cards[].card_url` | text | 4 Services | Code: page map slug | /gardener |
| `home_services_more_line` | wysiwyg | 4 Services | Model, when services are left over after the cards | (hidden on Edens Edge) |
| `home_why_h2` | text | 5 Why choose us | Code: base town, customer word, `company_name` | Why Southampton Homeowners Choose Edens Edge Landscaping |
| `home_why_points` | repeater | 5 Why choose us | Code: 2 to 4 rows | 4 rows |
| `home_why_points[].point_title` | text | 5 Why choose us | Code: track record (`year_founded`, `jobs_completed`), cover (`guarantee_years`, `manufacturer_warranty`, `insurance_cover`), `differentiator_1`, then `review_themes` or `differentiator_2` | Local Experience Behind Every Job |
| `home_why_points[].point_body` | wysiwyg | 5 Why choose us | Model | We've completed more than [CV: jobs_completed] jobs, from hedges and fencing to patios and decking. Every one... |
| `home_why_points[].point_icon` | image | 5 Why choose us | Not Copybot: filled on the site | (image) |
| `home_reviews_show` | true_false | 6 Reviews | Code: `review_count` of 1 or more | false |
| `home_reviews_h2` | text | 6 Reviews | Code: `review_count`, base town, customer word | (hidden on Edens Edge) |
| `home_reviews_widget` | text | 6 Reviews | Not Copybot: filled on the site | (shortcode) |
| `home_reviews_gbp_link` | text | 6 Reviews | Not Copybot: filled on the site | (URL) |
| `home_process_h2` | text | 7 Process | Code: niche entry, `free_quotes` | Your Free Quote in 3 Simple Steps |
| `home_process_steps` | repeater | 7 Process | Code: 3 rows | 3 rows |
| `home_process_steps[].step_title` | text | 7 Process | Code: the niche entry, held back if it promises a practice the client has not confirmed | Tell Us About Your Garden |
| `home_process_steps[].step_body` | wysiwyg | 7 Process | Model | Call [CV: phone] or send a message with the rough size of the garden, what you'd like done and a few photos i... |
| `home_process_steps[].step_icon` | image | 7 Process | Not Copybot: filled on the site | (image) |
| `home_cta_band_heading` | text | CTA band (after Process) | Code: niche trade person | Ready to talk to a local landscaper? |
| `home_cta_band_line` | text | CTA band (after Process) | Code: niche entry, with `response_time` where it reads as a length of time | Tell us about your garden and we'll get back to you. |
| `home_owner_show` | true_false | 8 Meet the owner | Code: `owner_name`, `owner_photo` is yes, and one of `owner_qualification`, `owner_why`, `owner_promise` | false |
| `home_owner_h2` | text | 8 Meet the owner | Code: `owner_name`, `company_name` | (hidden on Edens Edge) |
| `home_owner_body` | wysiwyg | 8 Meet the owner | Model | (hidden on Edens Edge) |
| `home_owner_photo` | image | 8 Meet the owner | Not Copybot: filled on the site | (image) |
| `home_owner_photo_alt` | text | 8 Meet the owner | Not Copybot: filled on the site | (alt text) |
| `home_areas_h2` | text | 9 Service areas | Code: base town, `area_wide` | Where Our Landscapers Work Around Southampton |
| `home_areas_intro` | wysiwyg | 9 Service areas | Model | We're based in Southampton and travel up to 20 miles, inland and along the coast, for landscaping work. That... |
| `home_areas_links` | repeater | 9 Service areas | Code: base town, then towns with a page, then the rest | 13 rows |
| `home_areas_links[].area_name` | text | 9 Service areas | Code: the client's areas | Southampton |
| `home_areas_links[].link_text` | text | 9 Service areas | Code: always the same as `area_name` | Southampton |
| `home_areas_links[].page_url` | text | 9 Service areas | Code: page map slug; empty for a town with no page | /locations/chandlers-ford |
| `home_faq_h2` | text | 10 FAQ | Code: niche trade word | Your Landscaping Questions Answered |
| `home_faq_items` | repeater | 10 FAQ | Code: the questions; 5 to 9 rows | 8 rows |
| `home_faq_items[].faq_question` | text | 10 FAQ | Code: the niche entry's FAQ slot, chosen by the client values and confirmed services, or an approved research question | How much does landscaping cost in Southampton? |
| `home_faq_items[].faq_answer` | wysiwyg | 10 FAQ | Model | It depends on the job, because no two gardens need the same work. Access is the factor people least expect: m... |
| `home_final_cta_h2` | text | 11 Final CTA | Code: niche entry, `free_quotes`, category, base town | Get a Free Quote From a Local Landscaper in Southampton |
| `home_final_cta_body` | wysiwyg | 11 Final CTA | Model | Whether it's a hedge or a whole patio, we'll talk through what you want done and what it involves. |

**SEO meta, not ACF:**

| Field | Set by | Example |
|---|---|---|
| `rank_math_title` (`_yoast_wpseo_title` on Yoast) | Code: H1, then a modifier from `out_of_hours_available`, `year_founded`, `guarantee_years`, `rating`, then `company_name`; 60 characters at most | Landscaper Southampton \| Edens Edge Landscaping |
| `rank_math_description` (`_yoast_wpseo_metadesc` on Yoast) | Code: keyword, `company_name` and the first proof that is true; 155 characters at most | Edens Edge Landscaping is a landscaper in Southampton offering fixed prices with no hidden costs. Get your fr... |

### Homepage: when a field is hidden

The record marks hidden sections `HIDDEN` or `false`. The push never sends that word: it sends `false`, an empty string or an empty list.

| What arrives | When | What the template should do |
|---|---|---|
| `home_trusted_show` false, `home_trusted_logos` empty | Under 5 reviews and no verified logos | Hide section 2 |
| `home_reviews_show` false, `home_reviews_h2` empty | No reviews yet | Hide section 6 |
| `home_owner_show` false, `home_owner_h2` and `home_owner_body` empty | No owner name, no photo, or none of qualification, why or promise | Hide section 8 |
| `home_services_more_line` empty | No services left after the cards | Show nothing under the cards |
| `home_hero_trust_line` empty | No track record or cover figure | Show nothing under the H1 |
| `home_services_cards[].card_url` empty | Card with no page | Show the card with no link |
| `home_areas_links[].page_url` empty | Town with no page, and the base town | Show the name as plain text |
| Client Value `rating_line` empty | No reviews | Show no rating line |
| Client Value `hours` empty | No hours on file | Remove the hours line |

### Client Values

The push writes these to the site's Settings, Client Values. Use them for tokens in the copy and in the template (buttons, rating line, footer, map).

| Key | Used for | Example |
|---|---|---|
| `company_name` | Token in copy, or template | Edens Edge Landscaping |
| `phone` | Token in copy, or template | 07580 412717 |
| `email` | Token in copy, or template | (empty on Edens Edge) |
| `address` | Token in copy, or template | (empty on Edens Edge) |
| `gbp_address_type` | Token in copy, or template | (empty on Edens Edge) |
| `hours` | Token in copy, or template | Monday to Saturday, 7am to 6pm |
| `primary_category` | Token in copy, or template | Landscaper |
| `year_founded` | Token in copy, or template | (empty on Edens Edge) |
| `years_trading` | Token in copy, or template | (empty on Edens Edge) |
| `jobs_completed` | Token in copy, or template | 100 |
| `rating` | Token in copy, or template | (empty on Edens Edge) |
| `review_count` | Token in copy, or template | (empty on Edens Edge) |
| `guarantee_years` | Token in copy, or template | (empty on Edens Edge) |
| `guarantee_scope` | Token in copy, or template | (empty on Edens Edge) |
| `manufacturer_warranty` | Token in copy, or template | (empty on Edens Edge) |
| `insurance_cover` | Token in copy, or template | 5m |
| `differentiator_1` | Token in copy, or template | Fixed Prices With No Hidden Costs |
| `differentiator_1_sentence` | Token in copy, or template | Fixed prices with no hidden costs |
| `differentiator_2` | Token in copy, or template | Family Run and Independent |
| `differentiator_2_sentence` | Token in copy, or template | Family Run and Independent |
| `free_quotes` | Token in copy, or template | yes |
| `free_inspection` | Token in copy, or template | (empty on Edens Edge) |
| `quote_method` | Token in copy, or template | (empty on Edens Edge) |
| `quote_includes` | Token in copy, or template | (empty on Edens Edge) |
| `deposit_terms` | Token in copy, or template | (empty on Edens Edge) |
| `price_list` | Token in copy, or template | (empty on Edens Edge) |
| `response_time` | Token in copy, or template | (empty on Edens Edge) |
| `same_day_available` | Token in copy, or template | (empty on Edens Edge) |
| `out_of_hours_available` | Token in copy, or template | (empty on Edens Edge) |
| `start_time` | Token in copy, or template | same week |
| `visit_frequency_options` | Token in copy, or template | (empty on Edens Edge) |
| `access_handling` | Token in copy, or template | (empty on Edens Edge) |
| `if_not_happy` | Token in copy, or template | (empty on Edens Edge) |
| `clippings_collected` | Token in copy, or template | (empty on Edens Edge) |
| `areas_worked` | Token in copy, or template | (empty on Edens Edge) |
| `owner_name` | Token in copy, or template | Ethan |
| `owner_name_2` | Token in copy, or template | (empty on Edens Edge) |
| `owner_qualification` | Token in copy, or template | (empty on Edens Edge) |
| `owner_why` | Token in copy, or template | (empty on Edens Edge) |
| `owner_promise` | Token in copy, or template | (empty on Edens Edge) |
| `owner_pronoun` | Token in copy, or template | (empty on Edens Edge) |
| `business_type` | Token in copy, or template | A |
| `materials_methods` | Token in copy, or template | (empty on Edens Edge) |
| `team_size` | Token in copy, or template | 4 |
| `typical_jobs` | Token in copy, or template | (empty on Edens Edge) |
| `emergency_primary` | Token in copy, or template | (empty on Edens Edge) |
| `handles_planning` | Token in copy, or template | (empty on Edens Edge) |
| `finance_options` | Token in copy, or template | (empty on Edens Edge) |
| `complaints_process` | Token in copy, or template | (empty on Edens Edge) |
| `area_wide` | Token in copy, or template | (empty on Edens Edge) |
| `travel_distance` | Token in copy, or template | 20 miles |
| `review_themes` | Token in copy, or template | (empty on Edens Edge) |
| `jobs_wanted` | Token in copy, or template | Landscape Gardener, Landscape Designer |
| `waste_carrier_registered` | Token in copy, or template | (empty on Edens Edge) |
| `map_embed` | Template only | (empty on Edens Edge) |
| `review_url` | Template only | (empty on Edens Edge) |
| `primary_action` | Template only | Get My Free Quote |
| `rating_line` | Template only | (empty on Edens Edge) |

## Category page

**Not in ACF, not pushed: proposed names.** Paving Contractor, Southampton example.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `seo_title` | SEO meta | Page level | Code: H1, then a modifier from `out_of_hours_available`, `year_founded`, `guarantee_years`, `rating`, then `company_name`; 60 characters at most | Driveways Southampton \| Edens Edge Landscaping |
| `meta_description` | SEO meta | Page level | Code: keyword, `company_name` and the first proof that is true; 155 characters at most | Edens Edge Landscaping offers driveways in Southampton offering fixed prices with no hidden costs. Get your f... |
| `page_slug` | none: identifies the page | Page level | Code: page map slug | /paving-contractor |
| `breadcrumb` | list | Page level | Code: page map parents | Home > Paving Contractor |
| `cat_hero_h1` | text | Hero | Code: the page map H1 | Driveways Southampton |
| `cat_hero_trust_line` | text | Hero | Code: `year_founded` at 5+ years ("Established in..."), else `jobs_completed`, else the first of `guarantee_years`, `manufacturer_warranty`, `insurance_cover` | 100+ Jobs Completed |
| `cat_hero_intro` | wysiwyg | Hero | Model | [CV: company_name] lays driveways in Southampton, along with patios and paths, across the city and the surrou... |
| `cat_hero_rating_line` | text | Hero | Code: `rating`, `review_count` (shows from 1 review; stars at 4.5+) | (empty on Edens Edge) |
| `buttons` | list | Hero | Code: niche primary action, `free_quotes`, `phone`; call first in the emergency layout | Get My Free Quote, Call [CV: phone] |
| `cat_services_h2` | text | Services | Code: category or trade word, town | Our Driveways Services in Southampton |
| `cat_services_intro` | wysiwyg | Services | Model | Driveways, patios and the groundwork behind them are built for homeowners across the whole area, from digging... |
| `cat_services_cards` | repeater | Services | Code: one row per service page | 4 rows |
| `cat_services_cards[].card_name` | text | Services | Code: page map | Concrete bases and paths |
| `cat_services_cards[].card_text` | wysiwyg | Services | Model | A shed, a drive apron or a path to the back door all need something firm under them. Our [concrete bases and... |
| `cat_services_cards[].card_url` | text | Services | Code: page map slug | /services/concrete-bases-and-paths |
| `cat_services_cards[].card_target` | text | Services | Code: what the card leads to (internal, used for checks) | base |
| `cat_also_offered` | wysiwyg | Services | Model, when services have no page | We also take on driveway landscaping, driveway or path paving and driveway replacement. |
| `cat_content_h2` | text | Content block | Code: name, town, `area_wide`, customer word | Local Paving for Southampton Homeowners |
| `cat_content_body` | wysiwyg | Content block | Model | Driveways in Southampton are built on very different ground, and that shapes the work. In Oakmount Triangle t... |
| `cat_block4_h2` | text | Block 4: problems | Code: niche entry | Common Paving Problems |
| `cat_block4` | repeater | Block 4: problems | Code: up to 4 rows, filtered by the client's confirmed services | 4 rows |
| `cat_block4[].card_title` | text | Block 4: problems | Code: niche entry | A garden with nowhere to sit out |
| `cat_block4[].card_body` | wysiwyg | Block 4: problems | Model | The garden looks fine from the kitchen window, but there's no flat, dry spot for a table. It usually comes do... |
| `cat_block5_h2` | text | Block 5: cost | Code: niche entry | What Affects the Cost of Paving in Southampton |
| `cat_cost_intro` | wysiwyg | Block 5: cost | Model | No two paving jobs cost the same, because every garden is different and the work takes a different number of... |
| `cat_block5` | repeater | Block 5: cost | Code: up to 4 rows | 4 rows |
| `cat_block5[].card_title` | text | Block 5: cost | Code: niche entry | The size of the area |
| `cat_block5[].card_body` | wysiwyg | Block 5: cost | Model | Square metres move the price more than anything else. A bigger area means more digging, more stone for the ba... |
| `cat_cost_price_line` | text | Block 5: cost | Code: `price_list` token | (empty on Edens Edge) |
| `cat_reviews_show` | true_false | Reviews | Code: `review_count` and hand picked reviews | false |
| `cat_reviews_h2` | text | Reviews | Code: town, customer word | (hidden on Edens Edge) |
| `cat_reviews` | repeater | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `cat_reviews[].review_text` | wysiwyg | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `cat_reviews[].review_name` | text | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `cat_reviews[].review_town` | text | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `cat_process_h2` | text | Process | Code: niche entry, `free_quotes` | Your Free Quote in 3 Simple Steps |
| `cat_process_steps` | repeater | Process | Code: 3 rows | 3 rows |
| `cat_process_steps[].step_title` | text | Process | Code: the niche entry, held back if it promises a practice the client has not confirmed | Tell Us About Your Garden |
| `cat_process_steps[].step_body` | wysiwyg | Process | Model | Ring [CV: phone] or send a message. Tell us the rough size of the area and what you want done, and add photos... |
| `cat_areas_h2` | text | Areas | Code: name, base town, `area_wide` | Where We Provide Paving Across Southampton and Nearby Towns |
| `cat_areas_intro` | wysiwyg | Areas | Model | We're based in Southampton and travel [CV: travel_distance] from there, inland and along the coast. That take... |
| `cat_areas_links` | repeater | Areas | Code: every town with a page for this | 5 rows |
| `cat_areas_links[].area_name` | text | Areas | Code: page map, hand set up towns | Chandlers Ford |
| `cat_areas_links[].page_url` | text | Areas | Code: page map slug; empty when unlinked | /locations/chandlers-ford/paving-contractor |
| `cat_areas_also_cover` | list | Areas | Code: towns with no page, for a "We also cover" line (base pages only) | Ampfield, Awbridge, Chilworth, Kings Worthy, Lockerley, Lyndhurst, Stockbridge |
| `cat_faq_h2` | text | FAQ | Code: name | Paving Questions Answered |
| `cat_faq_items` | repeater | FAQ | Code: the questions | 6 rows |
| `cat_faq_items[].faq_question` | text | FAQ | Code: the niche entry's FAQ slot, chosen by the client values and confirmed services | How much does paving cost in Southampton? |
| `cat_faq_items[].faq_answer` | wysiwyg | FAQ | Model | It depends on the job, and one thing people rarely expect is drainage. At the front of a house, a new surface... |
| `cat_final_cta_h2` | text | Final CTA | Code: name, town, `free_quotes` | Get a Free Paving Quote in Southampton |
| `cat_final_cta_body` | wysiwyg | Final CTA | Model | Send a few photos and a line on what you'd like built, and a driveway, patio or path can be priced from there. |
| `cat_final_cta_trust_lines` | list | Final CTA | Code: `hours`, rating line | [CV: hours] |

## Location category page

**Not in ACF, not pushed: proposed names.** It is the same page type and template as the category page, with the record's `scope` set to `town`. Gardener, Romsey example.

What differs from the category page: the copy covers that town only, `cat_areas_links` lists its villages unlinked, and `cat_areas_also_cover` is empty.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `seo_title` | SEO meta | Page level | Code: H1, then a modifier from `out_of_hours_available`, `year_founded`, `guarantee_years`, `rating`, then `company_name`; 60 characters at most | Gardener Romsey \| Edens Edge Landscaping |
| `meta_description` | SEO meta | Page level | Code: keyword, `company_name` and the first proof that is true; 155 characters at most | Edens Edge Landscaping is a gardener in Romsey offering fixed prices with no hidden costs. Get your free quot... |
| `page_slug` | none: identifies the page | Page level | Code: page map slug | /locations/romsey/gardener |
| `breadcrumb` | list | Page level | Code: page map parents | Home > Romsey > Gardener |
| `cat_hero_h1` | text | Hero | Code: the page map H1 | Gardener Romsey |
| `cat_hero_trust_line` | text | Hero | Code: `year_founded` at 5+ years ("Established in..."), else `jobs_completed`, else the first of `guarantee_years`, `manufacturer_warranty`, `insurance_cover` | 100+ Jobs Completed |
| `cat_hero_intro` | wysiwyg | Hero | Model | [CV: company_name] is a local gardener in Romsey, looking after lawns, hedges and borders for homeowners acro... |
| `cat_hero_rating_line` | text | Hero | Code: `rating`, `review_count` (shows from 1 review; stars at 4.5+) | (empty on Edens Edge) |
| `buttons` | list | Hero | Code: niche primary action, `free_quotes`, `phone`; call first in the emergency layout | Get My Free Quote, Call [CV: phone] |
| `cat_services_h2` | text | Services | Code: category or trade word, town | Our Gardener Services in Romsey |
| `cat_services_intro` | wysiwyg | Services | Model | Our gardener work covers the jobs that keep a Romsey garden under control: cutting lawns, trimming hedges, cl... |
| `cat_services_cards` | repeater | Services | Code: one row per service page | 6 rows |
| `cat_services_cards[].card_name` | text | Services | Code: page map | Lawn mowing |
| `cat_services_cards[].card_text` | wysiwyg | Services | Model | Grass that gets ahead of you ends up clumped and uneven, and a rushed cut can take too much off at once. Our... |
| `cat_services_cards[].card_url` | text | Services | Code: page map slug | /services/lawn-mowing |
| `cat_services_cards[].card_target` | text | Services | Code: what the card leads to (internal, used for checks) | base |
| `cat_also_offered` | wysiwyg | Services | Model, when services have no page | (hidden on Edens Edge) |
| `cat_content_h2` | text | Content block | Code: name, town, `area_wide`, customer word | Local Gardening for Romsey Homeowners |
| `cat_content_body` | wysiwyg | Content block | Model | Being a gardener in Romsey means working across very different gardens. Great Woodley's Radburn layout often... |
| `cat_block4_h2` | text | Block 4: problems | Code: niche entry | Common Gardening Problems |
| `cat_block4` | repeater | Block 4: problems | Code: up to 4 rows, filtered by the client's confirmed services | 4 rows |
| `cat_block4[].card_title` | text | Block 4: problems | Code: niche entry | A lawn full of moss and bare patches |
| `cat_block4[].card_body` | wysiwyg | Block 4: problems | Model | Moss takes hold where the grass is thin and the ground stays damp, and bare patches there never fill on their... |
| `cat_block5_h2` | text | Block 5: cost | Code: niche entry | What Affects the Cost of Gardening in Romsey |
| `cat_cost_intro` | wysiwyg | Block 5: cost | Model | The price of gardening moves with how much there is to do and how often you'd like us here. You'll get a quot... |
| `cat_block5` | repeater | Block 5: cost | Code: up to 4 rows | 4 rows |
| `cat_block5[].card_title` | text | Block 5: cost | Code: niche entry | How often we visit |
| `cat_block5[].card_body` | wysiwyg | Block 5: cost | Model | A regular round makes each visit shorter, so the price per visit is lower than an occasional big tidy up. How... |
| `cat_cost_price_line` | text | Block 5: cost | Code: `price_list` token | (empty on Edens Edge) |
| `cat_reviews_show` | true_false | Reviews | Code: `review_count` and hand picked reviews | false |
| `cat_reviews_h2` | text | Reviews | Code: town, customer word | (hidden on Edens Edge) |
| `cat_reviews` | repeater | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `cat_reviews[].review_text` | wysiwyg | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `cat_reviews[].review_name` | text | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `cat_reviews[].review_town` | text | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `cat_process_h2` | text | Process | Code: niche entry, `free_quotes` | Your Free Quote in 3 Simple Steps |
| `cat_process_steps` | repeater | Process | Code: 3 rows | 3 rows |
| `cat_process_steps[].step_title` | text | Process | Code: the niche entry, held back if it promises a practice the client has not confirmed | Tell Us About Your Garden |
| `cat_process_steps[].step_body` | wysiwyg | Process | Model | Call [CV: phone] or send a message with the size of the garden, what you want kept on top of, and photos if y... |
| `cat_areas_h2` | text | Areas | Code: name, base town, `area_wide` | Where We Provide Gardening Across Romsey |
| `cat_areas_intro` | wysiwyg | Areas | Model | We cover all of Romsey and the villages around it, and we travel up to [CV: travel_distance] inland and along... |
| `cat_areas_links` | repeater | Areas | Code: the villages and neighbourhoods around the town, unlinked | 12 rows |
| `cat_areas_links[].area_name` | text | Areas | Code: page map, hand set up towns | Whitenap |
| `cat_areas_links[].page_url` | text | Areas | Code: page map slug; empty when unlinked | (empty on Edens Edge) |
| `cat_areas_also_cover` | list | Areas | Code: towns with no page, for a "We also cover" line (base pages only) | (empty on Edens Edge) |
| `cat_faq_h2` | text | FAQ | Code: name | Gardening Questions Answered |
| `cat_faq_items` | repeater | FAQ | Code: the questions | 6 rows |
| `cat_faq_items[].faq_question` | text | FAQ | Code: the niche entry's FAQ slot, chosen by the client values and confirmed services | How much does gardening cost in Romsey? |
| `cat_faq_items[].faq_answer` | wysiwyg | FAQ | Model | There's no standard price, but the quote is free. Tell us what your Romsey garden has, such as the lawn, the... |
| `cat_final_cta_h2` | text | Final CTA | Code: name, town, `free_quotes` | Get a Free Gardening Quote in Romsey |
| `cat_final_cta_body` | wysiwyg | Final CTA | Model | Describe your garden and the work you'd like done, and we'll put together a quote for you. |
| `cat_final_cta_trust_lines` | list | Final CTA | Code: `hours`, rating line | [CV: hours] |

## Service page

**Not in ACF, not pushed: proposed names.** Patios, Southampton example.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `seo_title` | SEO meta | Page level | Code: H1, then a modifier from `out_of_hours_available`, `year_founded`, `guarantee_years`, `rating`, then `company_name`; 60 characters at most | Patios Southampton \| Edens Edge Landscaping |
| `meta_description` | SEO meta | Page level | Code: keyword, `company_name` and the first proof that is true; 155 characters at most | Edens Edge Landscaping offers patios in Southampton, fixed prices with no hidden costs. Get your free quote t... |
| `page_slug` | none: identifies the page | Page level | Code: page map slug | /services/patios |
| `breadcrumb` | list | Page level | Code: page map parents | Home > Landscape Designer > Patios |
| `svc_hero_h1` | text | Hero | Code: the page map H1 | Patios Southampton |
| `svc_hero_trust_line` | text | Hero | Code: `year_founded` at 5+ years ("Established in..."), else `jobs_completed`, else the first of `guarantee_years`, `manufacturer_warranty`, `insurance_cover` | 100+ Jobs Completed |
| `svc_hero_intro` | wysiwyg | Hero | Model | [CV: company_name] builds patios in Southampton and across the towns around it, inland and along the coast. E... |
| `svc_hero_rating_line` | text | Hero | Code: `rating`, `review_count` (shows from 1 review; stars at 4.5+) | (empty on Edens Edge) |
| `buttons` | list | Hero | Code: niche primary action, `free_quotes`, `phone`; call first in the emergency layout | Get My Free Quote, Call [CV: phone] |
| `svc_included_h2` | text | What's included | Code: niche entry | What's Included in Our Patios |
| `svc_included_intro` | wysiwyg | What's included | Model | A patio is a firm, level area of paving at the back of the house, built for a table and chairs. You're left w... |
| `svc_included_items` | repeater | What's included | Code: 6 to 8 rows | 7 rows |
| `svc_included_items[].item_title` | text | What's included | Code: niche entry | Set out levels and falls |
| `svc_included_items[].item_text` | text | What's included | Model | Mark out finished levels and the falls |
| `svc_content_h2` | text | Content block | Code: name, town, `area_wide`, customer word | Local Patios for Southampton Homeowners |
| `svc_content_body` | wysiwyg | Content block | Model | Patios in Southampton are built on very different ground, from Lordswood to Townhill Park. Lordswood is mostl... |
| `svc_block4_h2` | text | Block 4: problems | Code: niche entry | Is a patio right for your garden? |
| `svc_block4` | repeater | Block 4: problems | Code: up to 4 rows, filtered by the client's confirmed services | 4 rows |
| `svc_block4[].card_title` | text | Block 4: problems | Code: niche entry | The part of the garden you never use |
| `svc_block4[].card_body` | wysiwyg | Block 4: problems | Model | If one corner is somewhere nobody goes, it's often because the ground is wet, uneven or too soft to stand a c... |
| `svc_process_h2` | text | Process | Code: niche entry, `free_quotes` | Your Free Quote in 3 Simple Steps |
| `svc_process_steps` | repeater | Process | Code: 3 rows | 3 rows |
| `svc_process_steps[].step_title` | text | Process | Code: the niche entry, held back if it promises a practice the client has not confirmed | Tell Us About Your Garden |
| `svc_process_steps[].step_body` | wysiwyg | Process | Model | Call or message us with the rough size of the area and what you'd like built. A few photos of the garden help... |
| `svc_block5_h2` | text | Block 5: cost | Code: niche entry | What Affects the Cost of Patios in Southampton |
| `svc_cost_intro` | wysiwyg | Block 5: cost | Model | A patio's price is set by the dig and the slabs, so it moves with the job in front of us. Quotes are free, an... |
| `svc_block5` | repeater | Block 5: cost | Code: up to 4 rows | 4 rows |
| `svc_block5[].card_title` | text | Block 5: cost | Code: niche entry | How much there is to do |
| `svc_block5[].card_body` | wysiwyg | Block 5: cost | Model | The area comes first: more square metres means more digging, more base and more slabs to lay. A small patio b... |
| `svc_cost_price_line` | text | Block 5: cost | Code: `price_list` token | (empty on Edens Edge) |
| `svc_reviews_show` | true_false | Reviews | Code: `review_count` and hand picked reviews | false |
| `svc_reviews_h2` | text | Reviews | Code: town, customer word | (hidden on Edens Edge) |
| `svc_reviews` | repeater | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `svc_reviews[].review_text` | wysiwyg | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `svc_reviews[].review_name` | text | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `svc_reviews[].review_town` | text | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `svc_areas_h2` | text | Areas | Code: name, base town, `area_wide` | Where We Provide Patios Across Southampton and Nearby Towns |
| `svc_areas_intro` | wysiwyg | Areas | Model | We're based in Southampton and work within [CV: travel_distance] of it, inland and along the coast. Patios ar... |
| `svc_areas_links` | repeater | Areas | Code: every town with a page for this | 5 rows |
| `svc_areas_links[].area_name` | text | Areas | Code: page map, hand set up towns | Chandlers Ford |
| `svc_areas_links[].page_url` | text | Areas | Code: page map slug; empty when unlinked | /locations/chandlers-ford/landscape-designer |
| `svc_areas_also_cover` | list | Areas | Code: towns with no page, for a "We also cover" line (base pages only) | Ampfield, Awbridge, Chilworth, Kings Worthy, Lockerley, Lyndhurst, Stockbridge |
| `svc_faq_h2` | text | FAQ | Code: name | Patios Questions Answered |
| `svc_faq_items` | repeater | FAQ | Code: the questions | 6 rows |
| `svc_faq_items[].faq_question` | text | FAQ | Code: the niche entry's FAQ slot, chosen by the client values and confirmed services | How much does a patio cost in Southampton? |
| `svc_faq_items[].faq_answer` | wysiwyg | FAQ | Model | The price depends on your garden, and it's agreed with you before any work starts. Quotes are free. One thing... |
| `svc_more_h2` | text | More services | Code: category word, town | Our Other Garden Design Services |
| `svc_more_intro` | wysiwyg | More services | Model | A patio is often one part of a bigger garden plan. These are the other garden design jobs we build for homeow... |
| `svc_more_cards` | repeater | More services | Code: sibling service pages | 12 rows |
| `svc_more_cards[].card_name` | text | More services | Code: page map | Lawn seeding |
| `svc_more_cards[].card_url` | text | More services | Code: page map slug | /services/lawn-seeding |
| `svc_more_cards[].card_target` | text | More services | Code: what the card leads to (internal, used for checks) | base |
| `svc_final_cta_h2` | text | Final CTA | Code: name, town, `free_quotes` | Get a Free Patios Quote in Southampton |
| `svc_final_cta_body` | wysiwyg | Final CTA | Model | Share the spot you have in mind with us, and we'll work out what a patio there would involve for your garden. |
| `svc_final_cta_trust_lines` | list | Final CTA | Code: `hours`, rating line | [CV: hours] |

## Town service page

**Not in ACF, not pushed: proposed names.** It is the same page type and template as the service page, with `scope` set to `town`. Tree stump removal, Romsey example.

What differs from the service page: the copy covers that town and service only, `svc_areas_links` lists its villages unlinked, `svc_areas_also_cover` is empty, and the more services cards link to sibling town pages where they exist.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `seo_title` | SEO meta | Page level | Code: H1, then a modifier from `out_of_hours_available`, `year_founded`, `guarantee_years`, `rating`, then `company_name`; 60 characters at most | Tree Stump Removal Romsey \| Edens Edge Landscaping |
| `meta_description` | SEO meta | Page level | Code: keyword, `company_name` and the first proof that is true; 155 characters at most | Edens Edge Landscaping offers tree stump removal in Romsey, fixed prices with no hidden costs. Get your free... |
| `page_slug` | none: identifies the page | Page level | Code: page map slug | /locations/romsey/tree-stump-removal |
| `breadcrumb` | list | Page level | Code: page map parents | Home > Romsey > Tree stump removal |
| `svc_hero_h1` | text | Hero | Code: the page map H1 | Tree Stump Removal Romsey |
| `svc_hero_trust_line` | text | Hero | Code: `year_founded` at 5+ years ("Established in..."), else `jobs_completed`, else the first of `guarantee_years`, `manufacturer_warranty`, `insurance_cover` | 100+ Jobs Completed |
| `svc_hero_intro` | wysiwyg | Hero | Model | [CV: company_name] carries out tree stump removal in Romsey, grinding or digging out old stumps for homeowner... |
| `svc_hero_rating_line` | text | Hero | Code: `rating`, `review_count` (shows from 1 review; stars at 4.5+) | (empty on Edens Edge) |
| `buttons` | list | Hero | Code: niche primary action, `free_quotes`, `phone`; call first in the emergency layout | Get My Free Quote, Call [CV: phone] |
| `svc_included_h2` | text | What's included | Code: niche entry | What's Included in Our Tree Stump Removal |
| `svc_included_intro` | wysiwyg | What's included | Model | Tree stump removal deals with the stump a felled tree leaves behind, for homeowners who want a lawn, path or... |
| `svc_included_items` | repeater | What's included | Code: 6 to 8 rows | 6 rows |
| `svc_included_items[].item_title` | text | What's included | Code: niche entry | Inspect stump and underground hazards |
| `svc_included_items[].item_text` | text | What's included | Model | Check the stump and what's buried nearby |
| `svc_content_h2` | text | Content block | Code: name, town, `area_wide`, customer word | Local Tree Stump Removal for Romsey Homeowners |
| `svc_content_body` | wysiwyg | Content block | Model | Romsey sits across the lower Test valley, with low streets near the river and housing climbing the valley sid... |
| `svc_block4_h2` | text | Block 4: problems | Code: niche entry | Signs You Need Tree Stump Removal |
| `svc_block4` | repeater | Block 4: problems | Code: up to 4 rows, filtered by the client's confirmed services | 4 rows |
| `svc_block4[].card_title` | text | Block 4: problems | Code: niche entry | The first signs |
| `svc_block4[].card_body` | wysiwyg | Block 4: problems | Model | Shoots keep sprouting from the ground nearby, or the spot where a tree came down has never quite gone back to... |
| `svc_process_h2` | text | Process | Code: niche entry, `free_quotes` | Your Free Quote in 3 Simple Steps |
| `svc_process_steps` | repeater | Process | Code: 3 rows | 3 rows |
| `svc_process_steps[].step_title` | text | Process | Code: the niche entry, held back if it promises a practice the client has not confirmed | Tell Us About Your Garden |
| `svc_process_steps[].step_body` | wysiwyg | Process | Model | Message or call with the stump's rough size, where it stands and what's going in its place. Photos of the stu... |
| `svc_block5_h2` | text | Block 5: cost | Code: niche entry | What Affects the Cost of Tree Stump Removal in Romsey |
| `svc_cost_intro` | wysiwyg | Block 5: cost | Model | Stump removal is priced job by job, because no two stumps sit in the same ground. You'll have the price settl... |
| `svc_block5` | repeater | Block 5: cost | Code: up to 4 rows | 4 rows |
| `svc_block5[].card_title` | text | Block 5: cost | Code: niche entry | How much there is to do |
| `svc_block5[].card_body` | wysiwyg | Block 5: cost | Model | A wide stump with long roots means more to grind through, and a deeper grind adds time again. More than one s... |
| `svc_cost_price_line` | text | Block 5: cost | Code: `price_list` token | (empty on Edens Edge) |
| `svc_reviews_show` | true_false | Reviews | Code: `review_count` and hand picked reviews | false |
| `svc_reviews_h2` | text | Reviews | Code: town, customer word | (hidden on Edens Edge) |
| `svc_reviews` | repeater | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `svc_reviews[].review_text` | wysiwyg | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `svc_reviews[].review_name` | text | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `svc_reviews[].review_town` | text | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `svc_areas_h2` | text | Areas | Code: name, base town, `area_wide` | Where We Provide Tree Stump Removal Across Romsey |
| `svc_areas_intro` | wysiwyg | Areas | Model | We're based locally and travel up to [CV: travel_distance], inland and along the coast. That takes in the who... |
| `svc_areas_links` | repeater | Areas | Code: the villages and neighbourhoods around the town, unlinked | 12 rows |
| `svc_areas_links[].area_name` | text | Areas | Code: page map, hand set up towns | Whitenap |
| `svc_areas_links[].page_url` | text | Areas | Code: page map slug; empty when unlinked | (empty on Edens Edge) |
| `svc_areas_also_cover` | list | Areas | Code: towns with no page, for a "We also cover" line (base pages only) | (empty on Edens Edge) |
| `svc_faq_h2` | text | FAQ | Code: name | Tree Stump Removal Questions Answered |
| `svc_faq_items` | repeater | FAQ | Code: the questions | 5 rows |
| `svc_faq_items[].faq_question` | text | FAQ | Code: the niche entry's FAQ slot, chosen by the client values and confirmed services | How much does tree stump removal cost in Romsey? |
| `svc_faq_items[].faq_answer` | wysiwyg | FAQ | Model | Every stump is quoted individually, and the quote is free. How wide the stump is and how far its roots spread... |
| `svc_more_h2` | text | More services | Code: category word, town | Our Other Tree Surgery Services in Romsey |
| `svc_more_intro` | wysiwyg | More services | Model | Stump work often sits alongside other jobs on the same trees. The cards below show the rest of our tree surge... |
| `svc_more_cards` | repeater | More services | Code: sibling service pages | 5 rows |
| `svc_more_cards[].card_name` | text | More services | Code: page map | Tree cabling and bracing |
| `svc_more_cards[].card_url` | text | More services | Code: page map slug | /services/tree-cabling-and-bracing |
| `svc_more_cards[].card_target` | text | More services | Code: what the card leads to (internal, used for checks) | base |
| `svc_final_cta_h2` | text | Final CTA | Code: name, town, `free_quotes` | Get a Free Tree Stump Removal Quote in Romsey |
| `svc_final_cta_body` | wysiwyg | Final CTA | Model | Send us the stump's size and where it stands, and we'll price the job and agree a start date with you. |
| `svc_final_cta_trust_lines` | list | Final CTA | Code: `hours`, rating line | [CV: hours] |

## Location page

**Not in ACF, not pushed: proposed names.** Romsey example.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `seo_title` | SEO meta | Page level | Code: H1, then a modifier from `out_of_hours_available`, `year_founded`, `guarantee_years`, `rating`, then `company_name`; 60 characters at most | Gardener Services in and around Romsey \| Edens Edge Landscaping |
| `meta_description` | SEO meta | Page level | Code: keyword, `company_name` and the first proof that is true; 155 characters at most | Edens Edge Landscaping is a gardener in Romsey offering fixed prices with no hidden costs. Get your free quot... |
| `page_slug` | none: identifies the page | Page level | Code: page map slug | /locations/romsey |
| `breadcrumb` | list | Page level | Code: page map parents | Home > Romsey |
| `loc_hero_h1` | text | Hero | Code: the page map H1 | Gardener Services in and around Romsey |
| `loc_hero_trust_line` | text | Hero | Code: `year_founded` at 5+ years ("Established in..."), else `jobs_completed`, else the first of `guarantee_years`, `manufacturer_warranty`, `insurance_cover` | 100+ Jobs Completed |
| `loc_hero_intro` | wysiwyg | Hero | Model | [CV: company_name] is a gardener in Romsey, taking on everything from a simple tidy up to a full makeover wit... |
| `loc_hero_rating_line` | text | Hero | Code: `rating`, `review_count` (shows from 1 review; stars at 4.5+) | (empty on Edens Edge) |
| `buttons` | list | Hero | Code: niche primary action, `free_quotes`, `phone`; call first in the emergency layout | Get My Free Quote, Call [CV: phone] |
| `loc_services_h2` | text | Services | Code: category or trade word, town | Our Landscaping Services in Romsey |
| `loc_services_intro` | wysiwyg | Services | Model | Romsey gardens run from deep lawns by the river to small terrace yards. Homeowners here look for lawn care, g... |
| `loc_services_cards` | repeater | Services | Code: the town's location category pages, or a single category client's town service pages | 6 rows |
| `loc_services_cards[].card_name` | text | Services | Code: page map | Gardening |
| `loc_services_cards[].card_text` | wysiwyg | Services | Model | Borders lost under weeds and grass that's got ahead of you make a garden feel neglected fast. Our [gardening]... |
| `loc_services_cards[].card_url` | text | Services | Code: page map slug | /locations/romsey/gardener |
| `loc_services_cards[].card_target` | text | Services | Code: what the card leads to (internal, used for checks) | location-category |
| `loc_content_h2` | text | Content block | Code: name, town, `area_wide`, customer word | Local Landscaping for Romsey Homeowners |
| `loc_content_body` | wysiwyg | Content block | Model | Romsey sits low beside the River Test, and that shapes the work of any gardener in Romsey. Housing climbs to... |
| `loc_block4_h2` | text | Block 4: problems | Code: niche entry | Common Landscaping Problems in Romsey |
| `loc_block4` | repeater | Block 4: problems | Code: up to 4 rows, filtered by the client's confirmed services | 4 rows |
| `loc_block4[].card_title` | text | Block 4: problems | Code: niche entry | Ground that holds the rain |
| `loc_block4[].card_body` | wysiwyg | Block 4: problems | Model | A lawn beside a stream that stays soggy for days after rain is common here. Some gardens sit near the Test an... |
| `loc_block5_h2` | text | Block 5: cost | Code: niche entry | What Affects the Cost of Landscaping in Romsey |
| `loc_cost_intro` | wysiwyg | Block 5: cost | Model | What a landscaping job costs in Romsey comes down to the hours of work and what has to be carried or cleared.... |
| `loc_block5` | repeater | Block 5: cost | Code: up to 4 rows | 4 rows |
| `loc_block5[].card_title` | text | Block 5: cost | Code: niche entry | Getting in on a terraced street |
| `loc_block5[].card_body` | wysiwyg | Block 5: cost | Model | On terraced streets such as those around Riverside Gardens and Rivermead Close, there's no vehicle access out... |
| `loc_cost_price_line` | text | Block 5: cost | Code: `price_list` token | (empty on Edens Edge) |
| `loc_reviews_show` | true_false | Reviews | Code: `review_count` and hand picked reviews | false |
| `loc_reviews_h2` | text | Reviews | Code: town, customer word | (hidden on Edens Edge) |
| `loc_reviews` | repeater | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `loc_reviews[].review_text` | wysiwyg | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `loc_reviews[].review_name` | text | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `loc_reviews[].review_town` | text | Reviews | Code: `hand_reviews` | (empty on Edens Edge) |
| `loc_process_h2` | text | Process | Code: niche entry, `free_quotes` | Your Free Quote in 3 Simple Steps |
| `loc_process_steps` | repeater | Process | Code: 3 rows | 3 rows |
| `loc_process_steps[].step_title` | text | Process | Code: the niche entry, held back if it promises a practice the client has not confirmed | Tell Us About Your Garden |
| `loc_process_steps[].step_body` | wysiwyg | Process | Model | Call us on [CV: phone] (we're open [CV: hours]) and tell us the rough size, what you'd like done, and send ph... |
| `loc_areas_h2` | text | Areas | Code: name, base town, `area_wide` | Where We Provide Landscaping Around Romsey |
| `loc_areas_intro` | wysiwyg | Areas | Model | We cover Romsey and the villages and neighbourhoods around it, and we travel up to [CV: travel_distance] to r... |
| `loc_areas_links` | repeater | Areas | Code: the villages and neighbourhoods around the town, unlinked | 12 rows |
| `loc_areas_links[].area_name` | text | Areas | Code: page map, hand set up towns | Whitenap |
| `loc_areas_links[].page_url` | text | Areas | Code: page map slug; empty when unlinked | (empty on Edens Edge) |
| `loc_faq_h2` | text | FAQ | Code: name | Landscaping Questions Answered |
| `loc_faq_items` | repeater | FAQ | Code: the questions | 5 rows |
| `loc_faq_items[].faq_question` | text | FAQ | Code: the niche entry's FAQ slot, chosen by the client values and confirmed services | How much does landscaping cost in Romsey? |
| `loc_faq_items[].faq_answer` | wysiwyg | FAQ | Model | Price follows the size of the job, the ground and the way in. A patio with steps and a retaining wall takes l... |
| `loc_final_cta_h2` | text | Final CTA | Code: name, town, `free_quotes` | Get a Free Landscaping Quote in Romsey |
| `loc_final_cta_body` | wysiwyg | Final CTA | Model | Ring or message with a photo of the garden and the job you have in mind, and your project gets its place in o... |
| `loc_final_cta_trust_lines` | list | Final CTA | Code: `hours`, rating line | [CV: hours] |

## Blog

Copybot has no blog page type, so there are no fields, records or prompts to list.

## Inner pages: when a field is hidden

Unlike the homepage, these records hold the literal word `HIDDEN`. There is no payload builder yet, so when one is written it must turn `HIDDEN` into empty, as the homepage's does. The template should treat empty as hidden.

| Field | When | What the template should do |
|---|---|---|
| `cat_also_offered` | No services without a page | Show no line under the cards |
| `*_reviews_show` false, `*_reviews_h2` hidden, `*_reviews` empty | Too few reviews, or none hand picked | Hide the reviews section |
| `svc_more_h2`, `svc_more_intro` hidden, `svc_more_cards` empty | No sibling services | Hide More Services |
| `*_cost_price_line` empty | No `price_list` | Show no price line |
| `*_areas_also_cover` empty | Town page, or every town has a page | Show no "We also cover" line |
| `*_areas_links[].page_url` empty | Town page's villages | Show plain text |
| `*_hero_trust_line`, `*_hero_rating_line` empty | Nothing on file | Show nothing there |

## Gaps

### In the template spec, with no Copybot field

**Homepage** (`Homepage_Template_v2_Core_30_Build_Spec`):

| Spec item | Today |
|---|---|
| Rank Math focus keyword | Not pushed. Only the title and description are |
| `[CV: business_schema_id]` for the LocalBusiness `@id` | No such Client Value |
| Button under Why choose us; "Start Step 1" under Process | No field. Build from `primary_action` and `phone` in the template |
| Footer name, address and phone; hidden address rule | No field. Client Values hold `company_name`, `address`, `phone` and `gbp_address_type` |
| Map in Service areas | No page field, as the spec says. Use `map_embed` |
| Images, alt text, reviews widget and Google profile link | In ACF, filled on the site |

**Inner pages** (`Local Service Site Page Structure`): that document asks for these, and Copybot has no field for them.

| Spec item | Today |
|---|---|
| Gallery or before and after section, with location aware alt text | No field |
| Hero and content block images, card images and icons | No field. The homepage's are in ACF, the inner pages' aren't |
| "See all" link when a grid shows only the top four | No field. Copybot sends every card |
| Map embeds | No page field. Use `map_embed` |
| Location page's "We also cover" line | No separate field. Its villages are in `loc_areas_links` |

The repo holds no section by section template spec for the inner pages like the homepage's, so I compared them against the structure document only.

### In Copybot, with no ACF field

**Homepage:** these are in the record but have no ACF field.

| Record field | Where it goes instead |
|---|---|
| `home_hero_rating_line` | Client Value `rating_line` |
| `buttons` | Client Value `primary_action`, plus `phone` |
| `cta_band.buttons` | Not pushed. Build in the template from the same values |
| `home_final_cta_trust_lines` | Not pushed. Build from `hours` and `rating_line` |

**Inner pages:** every field in the category, location category, service, town service and location tables has no ACF field.

### Where the homepage spec and the fields disagree

- **CTA band:** the spec drops it, but Copybot has `home_cta_band_heading` and `home_cta_band_line`, marked new in the schema because a later brief brought the band back. The template needs a place for it.
- **Fields new since the spec:** `home_trusted_show`, `home_reviews_show`, `home_services_more_line` and `home_final_cta_body`.
- **Trust line order:** the spec leads with quotes and reply time. The code uses years, then jobs, then cover. This doesn't change the field, only its value.
