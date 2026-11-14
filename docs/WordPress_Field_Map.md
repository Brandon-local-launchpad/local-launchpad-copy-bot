# WordPress Field Map

For Given, who builds the WordPress templates. Written on 5 Nov 2026 from the code: `wp/acf-schema.js`, `wp/homepage-map.js`, `wp/push.js`, `page-types/` and the page records. Regenerate it when those change.

## Read this first

| Page type | ACF fields in the plugin | Copybot can push it | Copybot writes the copy |
|---|---|---|---|
| Homepage | Yes, 12 field groups | Yes | Yes |
| Category | Yes, 11 groups, post type `service-category` | Yes | Yes |
| Location category | Yes, the same 11, post type `category-location` | Yes | Yes |
| Service | Yes, 12 groups, post type `service` | Yes | Yes |
| Town service | Yes, the same 12, post type `location-service` | Yes | Yes |
| Location | Yes, 11 groups, post type `location` | Yes | Yes |
| Blog post | Only on the `blog` branch, 7 groups | Only on the `blog` branch | Only on the `blog` branch |

**Since plugin 0.6.0 (13 Nov 2026) the five inner page types have their ACF field groups in the plugin.** The fields are the ones in the Category, Service and Location template tables below. Copybot makes those pages on the site and pushes their copy (13 Nov 2026). See Inner pages: post types and URLs.

**Blog is built on its own branch, not on main, and is parked until Edens Edge is live.** The `blog` branch has its own spec, prompt, records, validator, 7 ACF groups, a push and a handover for Given. It is about 100 commits behind main, so none of it is live. See the Blog post section.

### How the fields behave

- **Type `wysiwyg`:** the record holds Markdown. The push converts it to HTML, including links.
- **`[CV: key]` tokens:** copy keeps tokens such as `[CV: company_name]`, and the examples below show them as stored. The plugin replaces them when the page is shown, through `acf/format_value`, and in the Rank Math or Yoast title and description. A key with no value shows nothing. The template can also use `[llp_cv key="phone"]` or `llp_cv( 'phone' )`.
- **Set by:** "Model" means the writing model wrote it. "Code" means Copybot decided it, from the named client values, the page map or the niche entry. The model never sets a code field.
- **Edits on the site:** fields Copybot writes are overwritten by the next push. Don't rename fields on a site. To change one, change `wp/acf-schema.js` and regenerate the plugin's files.
- **Examples:** they come from Edens Edge test runs, not published pages. The homepage, Paving Contractor and Patios records are from 4 Nov 2026. The town pages and the location page are from 27 Oct 2026, so their wording is older but their field names are current.

## How a push finds its page

**Homepage:** if the connection has a homepage slug, it reads `/wp/v2/pages?slug=<slug>&status=any` and takes the first result. Otherwise it reads `page_on_front` from `/wp/v2/settings` and uses that page. Set the homepage in Settings, Reading.

**Blog post, on the `blog` branch:** it looks up the post by slug in any status, `/wp/v2/posts?slug=<slug>&status=any`, and creates it if there is none.

**Category, service and location pages:** the entry whose page map URL (`_llp_path`) is the record's `page_slug`, for example `/services/patios`, in whichever of the five post types holds it. If there is none, the push is refused and says to make the pages first.

**What the push refuses, and what it never changes:**
- The plugin must be active with the expected version, ACF Pro active, the SEO plugin matching the connection, and all 12 homepage groups present.
- The ACF groups' location rule is the site's front page, so the fields attach only there. A page that isn't the front page is refused rather than losing the copy silently.
- The target page must be a draft unless the site is marked staging.
- The page's status is never changed. Each push takes a snapshot first and reads the fields back afterwards.

## Is the plugin current?

**Yes for the homepage, at version 0.2.1.** The files in `wp-plugin/llp-copybot` match the recorded fingerprint, and the generated field groups and Client Values keys match `wp/acf-schema.js` and `wp/client-values.js`. A fixture fails if they drift. The plugin's code last changed on 3 Nov 2026 and its generated files on 2 Nov 2026.

**It has no field groups for the other page types.** The `blog` branch carries its own plugin at 0.2.0 with the blog groups, split off before 0.2.1, so the two need merging into one version. I can't tell from the repo which version each client site runs. Copybot's connection test and dry run compare the site's reported version with 0.2.1 and refuse a push on a mismatch.

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
| `rank_math_focus_keyword` (`_yoast_wpseo_focuskw` on Yoast), not pushed yet | Code: the page's target keyword from the page map, blank on a hub page whose keyword another page targets. On the record since 5 Nov 2026, not pushed yet | Landscaper Southampton |

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

**In ACF since plugin 0.6.0 (the template tables further down), and pushed since 13 Nov 2026.** Paving Contractor, Southampton example.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `seo_title` | SEO meta | Page level | Code: H1, then a modifier from `out_of_hours_available`, `year_founded`, `guarantee_years`, `rating`, then `company_name`; 60 characters at most | Driveways Southampton \| Edens Edge Landscaping |
| `meta_description` | SEO meta | Page level | Code: keyword, `company_name` and the first proof that is true; 155 characters at most | Edens Edge Landscaping offers driveways in Southampton offering fixed prices with no hidden costs. Get your f... |
| `focus_keyword` | SEO meta (proposed) | Page level | Code: the page's target keyword from the page map, blank on a hub page whose keyword another page targets. On the record since 5 Nov 2026, not pushed yet | Driveways Southampton |
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

**In ACF since plugin 0.6.0 (the template tables further down), and pushed since 13 Nov 2026.** It is the same page type and template as the category page, with the record's `scope` set to `town`. Gardener, Romsey example.

What differs from the category page: the copy covers that town only, `cat_areas_links` lists its villages unlinked, and `cat_areas_also_cover` is empty.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `seo_title` | SEO meta | Page level | Code: H1, then a modifier from `out_of_hours_available`, `year_founded`, `guarantee_years`, `rating`, then `company_name`; 60 characters at most | Gardener Romsey \| Edens Edge Landscaping |
| `meta_description` | SEO meta | Page level | Code: keyword, `company_name` and the first proof that is true; 155 characters at most | Edens Edge Landscaping is a gardener in Romsey offering fixed prices with no hidden costs. Get your free quot... |
| `focus_keyword` | SEO meta (proposed) | Page level | Code: the page's target keyword from the page map, blank on a hub page whose keyword another page targets. On the record since 5 Nov 2026, not pushed yet | Gardener Romsey |
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

**In ACF since plugin 0.6.0 (the template tables further down), and pushed since 13 Nov 2026.** Patios, Southampton example.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `seo_title` | SEO meta | Page level | Code: H1, then a modifier from `out_of_hours_available`, `year_founded`, `guarantee_years`, `rating`, then `company_name`; 60 characters at most | Patios Southampton \| Edens Edge Landscaping |
| `meta_description` | SEO meta | Page level | Code: keyword, `company_name` and the first proof that is true; 155 characters at most | Edens Edge Landscaping offers patios in Southampton, fixed prices with no hidden costs. Get your free quote t... |
| `focus_keyword` | SEO meta (proposed) | Page level | Code: the page's target keyword from the page map, blank on a hub page whose keyword another page targets. On the record since 5 Nov 2026, not pushed yet | Patios Southampton |
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

**In ACF since plugin 0.6.0 (the template tables further down), and pushed since 13 Nov 2026.** It is the same page type and template as the service page, with `scope` set to `town`. Tree stump removal, Romsey example.

What differs from the service page: the copy covers that town and service only, `svc_areas_links` lists its villages unlinked, `svc_areas_also_cover` is empty, and the more services cards link to sibling town pages where they exist.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `seo_title` | SEO meta | Page level | Code: H1, then a modifier from `out_of_hours_available`, `year_founded`, `guarantee_years`, `rating`, then `company_name`; 60 characters at most | Tree Stump Removal Romsey \| Edens Edge Landscaping |
| `meta_description` | SEO meta | Page level | Code: keyword, `company_name` and the first proof that is true; 155 characters at most | Edens Edge Landscaping offers tree stump removal in Romsey, fixed prices with no hidden costs. Get your free... |
| `focus_keyword` | SEO meta (proposed) | Page level | Code: the page's target keyword from the page map, blank on a hub page whose keyword another page targets. On the record since 5 Nov 2026, not pushed yet | Tree Stump Removal Romsey |
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

**In ACF since plugin 0.6.0 (the template tables further down), and pushed since 13 Nov 2026.** Romsey example.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `seo_title` | SEO meta | Page level | Code: H1, then a modifier from `out_of_hours_available`, `year_founded`, `guarantee_years`, `rating`, then `company_name`; 60 characters at most | Gardener Services in and around Romsey \| Edens Edge Landscaping |
| `meta_description` | SEO meta | Page level | Code: keyword, `company_name` and the first proof that is true; 155 characters at most | Edens Edge Landscaping is a gardener in Romsey offering fixed prices with no hidden costs. Get your free quot... |
| `focus_keyword` | SEO meta (proposed) | Page level | Code: the page's target keyword from the page map, blank on a hub page whose keyword another page targets. On the record since 5 Nov 2026, not pushed yet | (empty on Edens Edge) |
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

## Blog post

**This is on the `blog` branch, not on main, so it isn't live, and it's parked until Edens Edge is live.** Merging it needs the plugin versions reconciled, 0.2.0 on the branch and 0.2.1 on main. The branch was last changed on 29 Oct 2026 and is about 100 commits behind main, so details could change when it merges. Its push has only been tested against Copybot's fake WordPress server.

It is a WordPress **post**, not a page, in the Guides category at `/guides/<slug>/`. The groups are `group_llp_blog_*`, attached to post type `post` in the Guides category. The branch has a fuller handover for Given, `docs/seo/current-build/Blog_WordPress_Handover.md`. The example is "When Is the Best Time for Spring Lawn Care in Southampton?", an Edens Edge test run from 28 Oct 2026.

| Field | Type | Section | Set by | Example |
|---|---|---|---|---|
| `blog_h1` | text | Header | Code: the target question from the question bank | When Is the Best Time for Spring Lawn Care in Southampton? |
| `blog_byline` | text | Header | Code: `owner_name`, `company_name` | By Ethan, owner at [CV: company_name] |
| `blog_last_checked` | text | Header | Code: the date written | 28 October 2026 |
| `blog_review_due` | text | Header, not shown | Code: a year on | 2027-10-28 |
| `blog_image` | image | Header | Not Copybot: filled on the site | (image) |
| `blog_image_alt` | text | Header | Not Copybot: filled on the site | (alt text) |
| `blog_answer` | wysiwyg | Quick answer | Model | Spring suits lawn renovation in Southampton because the grass can still recover, provided the ground isn't wa... |
| `blog_sections` | repeater | Question sections | Code: from the post type and the bank | 3 rows |
| `blog_sections[].section_h2` | text | Question sections | Code | Do We Actually Need a Lawn, or Are There Other Options? |
| `blog_sections[].section_body` | wysiwyg | Question sections | Model | Yes, if the garden has room for one and you're happy to look after it, though not every Southampton garden do... |
| `table_show` | true_false | Table | Code | false |
| `table_after` | text | Table | Code: which section it sits under | (empty on Edens Edge) |
| `table_columns` | repeater | Table | Code | (empty on Edens Edge) |
| `table_columns[].column_label` | text | Table | Code | (not on this record) |
| `table_rows` | repeater | Table | Model | (empty on Edens Edge) |
| `table_rows[].row_label` | text | Table | Model | (empty on Edens Edge) |
| `table_rows[].cell_1, cell_2, cell_3` | text | Table | Model | (empty on Edens Edge) |
| `blog_business_show` | true_false | How we handle it | Code | false |
| `blog_business_h2` | text | How we handle it | Code | (hidden on Edens Edge) |
| `blog_business` | wysiwyg | How we handle it | Model | (hidden on Edens Edge) |
| `blog_faq_h2` | text | FAQ | Code | Common Questions About Lawn Care |
| `blog_faq_items` | repeater | FAQ | Code: the questions | 3 rows |
| `blog_faq_items[].faq_question` | text | FAQ | Code: from the bank | When Can Children and Pets Use a Newly Turfed Lawn? |
| `blog_faq_items[].faq_answer` | wysiwyg | FAQ | Model | Follow the instructions for whatever was applied, and ask your operator. Any feed or treatment has to be used... |
| `blog_cta_h2` | text | Next step | Code | Talk to a Local Landscaper About Lawn Care |
| `blog_closing` | wysiwyg | Next step | Model | Thin, mossy or hard underfoot? Our [lawn care](/services/lawn-care) work covers mowing, scarifying, aerating,... |
| `blog_buttons` | repeater | Next step | Code | Get My Free Quote, Call [CV: phone] |
| `blog_buttons[].button_label` | text | Next step | Code: niche primary action, `phone` | Get My Free Quote |
| `blog_buttons[].button_url` | text | Next step | Code: `/contact/`, or `tel:[CV: phone]` | /contact/ |
| `blog_schema` | textarea | Next step | Code: JSON-LD for BlogPosting, FAQPage and BreadcrumbList; the publisher is `[CV: business_schema_id]` | (JSON, printed by the template) |

**When a field is hidden:** the template hides the table when `table_show` is false, and "How we handle it" when `blog_business_show` is false. Their other fields then arrive empty.

**Set on the post itself:** the title (the H1), the slug, the Guides category, and the status with its date. A post with a future date goes out as Scheduled for 09:00 UK time. A push never publishes one directly.

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

## Inner pages: post types and URLs

Brandon, Ray and Given agreed on 12 and 13 Nov 2026 that Copybot generates these field groups, as it does the homepage's. They are in the plugin since 0.6.0. The master copy is `wp/acf-schema.js` (`INNER_GROUPS`) and `wp/post-types.js`.

**Post types.** Each kind of page is an entry in its own post type, so its Elementor single template applies itself.

| Page | Post type | Field groups |
|---|---|---|
| Category | `service-category` | `group_llp_cat_*` |
| Location category | `category-location` | `group_llp_cat_*` |
| Service | `service` | `group_llp_svc_*` |
| Town service | `location-service` | `group_llp_svc_*` |
| Location | `location` | `group_llp_loc_*` |

- On 13 Nov 2026 the staging template site had `service`, `location` and `category-location`. The plugin registers any of the five a site doesn't have, and leaves alone one the site already has. The status route's `page_types` says which is which.
- No post type is named `category`: WordPress uses that name.
- **For Given:** each of the five post types needs an Elementor single template, with its text bound to the fields below. Nothing else is set by hand per page.

**URLs.** The page map decides every URL: `/gardener`, `/services/patios`, `/locations/romsey`, `/locations/romsey/patios`. WordPress can't build the nested town paths across post types from its settings, so the plugin does it. Each entry holds its path in the post meta `_llp_path`. The plugin makes that the entry's permalink and answers a request for the path with the entry. No URL plugin is needed and the post types' own URL bases don't matter. An entry with no path keeps its ordinary URL.

**Making the pages (plugin 0.7.0, 13 Nov 2026).** On the Pages tab, Pages on the site: Check the site lists what is missing, and Create makes every category, service and location page in the build as a draft, in its post type, at its page map URL (`wp/pages.js`; the plugin routes `GET` and `POST /llp-copybot/v1/pages`). A page is never made twice, a page the page map moved keeps its entry, and nothing is published, deleted or changed beyond its title and URL. Phase 2 towns are made when they come into the build. Staging sites only.

**Pushing the copy (13 Nov 2026).** A category, service or location page pushes like the homepage, from its page view: the dry run, the claims review, the snapshot, the write, the read-back and the rollback are the same code (`wp/push.js`). The page it writes to is the entry at the record's page map URL, found through the plugin's list and read and written through its post type's REST route (`wp/client.js findInnerPage`). The fields sent are read off the schema (`wp/inner-map.js`): everything in the template tables marked Copybot, and nothing marked The site. On the Pages tab, Check the copy lists which pages are ready, and Push the copy sends every ready page one at a time. Ready means a person approved the page, every claims finding is accepted, it has no BLOCK or stand-in, and its entry is on the site.

**Images (13 Nov 2026).** The image fields marked "The site" in the tables below are now filled by Copybot's Images tab, once a person approves a page's pictures: the hero background, the content image and its alt text, each card's image, the gallery rows (image and alt text), and on the homepage the owner photo and its alt text. Each is an attachment ID in the media library, uploaded as WebP. Sizes, as Given set them on 14 Nov 2026: a hero background is 1920 x 1080 at most, from a photo of 1600 x 1000 or more; a content image is 1200px wide, from a photo of 800 x 600 or more; a gallery photo 1200px wide; a card and the owner photo 800px wide. Icons are still the template's. An empty slot is never written, so a picture set by hand stays. **For Given:** bind each image field in the Elementor templates like the text fields; when a page's hero field is empty the template should show the site's graphic background; and tell Brandon the shape of the owner photo box, so photos can be cropped to fit it.

**Not sent to these pages:** the rating line, the final CTA trust lines and the buttons (the template, from Client Values), the breadcrumb (Rank Math), and the focus keyword (not pushed yet).

**Not proven on a real site.** The plugin's PHP is tested under php-wasm against stand-ins for WordPress. The first install of 0.7.0 on staging should check: the 34 groups appear in ACF, a new Service entry shows the fields, Create on the Pages tab makes the drafts, and one of them opens at its page map URL when previewed.

## The inner pages' fields

These are in the plugin as of 0.6.0.

The page structure document says four templates cover every page, so the five page types need three sets of groups. A base page and its town version share one set, and only the content and link targets differ.

| Template | Page types | Field prefix | Groups |
|---|---|---|---|
| Category | Category, location category | `cat_` | 11 |
| Service | Service, town service | `svc_` | 12 |
| Location | Location | `loc_` | 11 |

### What the groups hold

- **Names:** the names in the tables above, unchanged. Group keys are `group_llp_<name>` and field keys `field_llp_<name>`, as on the homepage.
- **Settings:** the same as the homepage. Every field and group has Show in REST on, wysiwyg uses the basic toolbar with no media upload, and images return an array.
- **Hidden sections:** the push would send `false`, an empty string or an empty list, never the word `HIDDEN`. The template treats empty as hidden.
- **Tokens:** `[CV: key]` tokens stay in the copy and the plugin resolves them on display, as on the homepage.

**Fields added beyond the tables above:** the structure document and the homepage pattern call for these, and Copybot has no value for them. The site fills them, like the homepage's images.

- A hero background image.
- A content block image and its alt text.
- A card image, on cards that have copy.
- A step icon.
- A gallery repeater with an image and alt text.

**One shape I changed from the tables above:** `*_areas_also_cover` is a list in the record. I propose a plain text field holding the names separated by commas, for the template to print after "We also cover". A repeater would also work if Given prefers it.

**Left out of ACF on purpose:**

| Copybot field | Where it goes instead |
|---|---|
| `seo_title`, `meta_description`, `focus_keyword` | Rank Math or Yoast post meta |
| `page_slug` | Finds the page to write to, and is not stored on it |
| `breadcrumb` | The Rank Math trail, which the spec already uses on inner pages |
| `buttons` | The template, from Client Values `primary_action` and `phone`, as on the homepage |
| `*_hero_rating_line` | The template, from Client Value `rating_line`, as on the homepage |
| `*_final_cta_trust_lines` | The template, from `hours` and `rating_line`, as on the homepage |
| `card_target` | Nowhere: Copybot uses it for its own checks |

### What was decided

1. **Location rules.** By post type, as above.
2. **Finding the page.** Copybot will create each page as a draft and keep its ID (next piece of work).
3. **Nested town URLs.** The plugin serves the page map's path.
4. **The also cover field and the gallery.** A text field and one repeater, as proposed. Given can ask for a change.

### Category template

| Group | Field | Type | Filled by |
|---|---|---|---|
| `group_llp_cat_hero` | `cat_hero_h1` | text | Copybot |
| `group_llp_cat_hero` | `cat_hero_trust_line` | text | Copybot |
| `group_llp_cat_hero` | `cat_hero_intro` | wysiwyg | Copybot |
| `group_llp_cat_hero` | `cat_hero_background_image` | image | The site (new) |
| `group_llp_cat_services` | `cat_services_h2` | text | Copybot |
| `group_llp_cat_services` | `cat_services_intro` | wysiwyg | Copybot |
| `group_llp_cat_services` | `cat_services_cards` | repeater | Copybot |
| `group_llp_cat_services` | `cat_services_cards[].card_name` | text | Copybot |
| `group_llp_cat_services` | `cat_services_cards[].card_text` | wysiwyg | Copybot |
| `group_llp_cat_services` | `cat_services_cards[].card_image` | image | The site (new) |
| `group_llp_cat_services` | `cat_services_cards[].card_url` | text | Copybot |
| `group_llp_cat_services` | `cat_also_offered` | wysiwyg | Copybot |
| `group_llp_cat_content` | `cat_content_h2` | text | Copybot |
| `group_llp_cat_content` | `cat_content_body` | wysiwyg | Copybot |
| `group_llp_cat_content` | `cat_content_image` | image | The site (new) |
| `group_llp_cat_content` | `cat_content_image_alt` | text | The site (new) |
| `group_llp_cat_block4` | `cat_block4_h2` | text | Copybot |
| `group_llp_cat_block4` | `cat_block4` | repeater | Copybot |
| `group_llp_cat_block4` | `cat_block4[].card_title` | text | Copybot |
| `group_llp_cat_block4` | `cat_block4[].card_body` | wysiwyg | Copybot |
| `group_llp_cat_block5` | `cat_block5_h2` | text | Copybot |
| `group_llp_cat_block5` | `cat_cost_intro` | wysiwyg | Copybot |
| `group_llp_cat_block5` | `cat_block5` | repeater | Copybot |
| `group_llp_cat_block5` | `cat_block5[].card_title` | text | Copybot |
| `group_llp_cat_block5` | `cat_block5[].card_body` | wysiwyg | Copybot |
| `group_llp_cat_block5` | `cat_cost_price_line` | text | Copybot |
| `group_llp_cat_reviews` | `cat_reviews_show` | true_false | Copybot |
| `group_llp_cat_reviews` | `cat_reviews_h2` | text | Copybot |
| `group_llp_cat_reviews` | `cat_reviews` | repeater | Copybot |
| `group_llp_cat_reviews` | `cat_reviews[].review_text` | wysiwyg | Copybot |
| `group_llp_cat_reviews` | `cat_reviews[].review_name` | text | Copybot |
| `group_llp_cat_reviews` | `cat_reviews[].review_town` | text | Copybot |
| `group_llp_cat_process` | `cat_process_h2` | text | Copybot |
| `group_llp_cat_process` | `cat_process_steps` | repeater | Copybot |
| `group_llp_cat_process` | `cat_process_steps[].step_title` | text | Copybot |
| `group_llp_cat_process` | `cat_process_steps[].step_body` | wysiwyg | Copybot |
| `group_llp_cat_process` | `cat_process_steps[].step_icon` | image | The site (new) |
| `group_llp_cat_areas` | `cat_areas_h2` | text | Copybot |
| `group_llp_cat_areas` | `cat_areas_intro` | wysiwyg | Copybot |
| `group_llp_cat_areas` | `cat_areas_links` | repeater | Copybot |
| `group_llp_cat_areas` | `cat_areas_links[].area_name` | text | Copybot |
| `group_llp_cat_areas` | `cat_areas_links[].page_url` | text | Copybot |
| `group_llp_cat_areas` | `cat_areas_also_cover` | text | Copybot |
| `group_llp_cat_faq` | `cat_faq_h2` | text | Copybot |
| `group_llp_cat_faq` | `cat_faq_items` | repeater | Copybot |
| `group_llp_cat_faq` | `cat_faq_items[].faq_question` | text | Copybot |
| `group_llp_cat_faq` | `cat_faq_items[].faq_answer` | wysiwyg | Copybot |
| `group_llp_cat_final_cta` | `cat_final_cta_h2` | text | Copybot |
| `group_llp_cat_final_cta` | `cat_final_cta_body` | wysiwyg | Copybot |
| `group_llp_cat_gallery` | `cat_gallery` | repeater | The site (new) |
| `group_llp_cat_gallery` | `cat_gallery[].gallery_image` | image | The site (new) |
| `group_llp_cat_gallery` | `cat_gallery[].gallery_alt` | text | The site (new) |

### Service template

| Group | Field | Type | Filled by |
|---|---|---|---|
| `group_llp_svc_hero` | `svc_hero_h1` | text | Copybot |
| `group_llp_svc_hero` | `svc_hero_trust_line` | text | Copybot |
| `group_llp_svc_hero` | `svc_hero_intro` | wysiwyg | Copybot |
| `group_llp_svc_hero` | `svc_hero_background_image` | image | The site (new) |
| `group_llp_svc_included` | `svc_included_h2` | text | Copybot |
| `group_llp_svc_included` | `svc_included_intro` | wysiwyg | Copybot |
| `group_llp_svc_included` | `svc_included_items` | repeater | Copybot |
| `group_llp_svc_included` | `svc_included_items[].item_title` | text | Copybot |
| `group_llp_svc_included` | `svc_included_items[].item_text` | text | Copybot |
| `group_llp_svc_content` | `svc_content_h2` | text | Copybot |
| `group_llp_svc_content` | `svc_content_body` | wysiwyg | Copybot |
| `group_llp_svc_content` | `svc_content_image` | image | The site (new) |
| `group_llp_svc_content` | `svc_content_image_alt` | text | The site (new) |
| `group_llp_svc_block4` | `svc_block4_h2` | text | Copybot |
| `group_llp_svc_block4` | `svc_block4` | repeater | Copybot |
| `group_llp_svc_block4` | `svc_block4[].card_title` | text | Copybot |
| `group_llp_svc_block4` | `svc_block4[].card_body` | wysiwyg | Copybot |
| `group_llp_svc_process` | `svc_process_h2` | text | Copybot |
| `group_llp_svc_process` | `svc_process_steps` | repeater | Copybot |
| `group_llp_svc_process` | `svc_process_steps[].step_title` | text | Copybot |
| `group_llp_svc_process` | `svc_process_steps[].step_body` | wysiwyg | Copybot |
| `group_llp_svc_process` | `svc_process_steps[].step_icon` | image | The site (new) |
| `group_llp_svc_block5` | `svc_block5_h2` | text | Copybot |
| `group_llp_svc_block5` | `svc_cost_intro` | wysiwyg | Copybot |
| `group_llp_svc_block5` | `svc_block5` | repeater | Copybot |
| `group_llp_svc_block5` | `svc_block5[].card_title` | text | Copybot |
| `group_llp_svc_block5` | `svc_block5[].card_body` | wysiwyg | Copybot |
| `group_llp_svc_block5` | `svc_cost_price_line` | text | Copybot |
| `group_llp_svc_reviews` | `svc_reviews_show` | true_false | Copybot |
| `group_llp_svc_reviews` | `svc_reviews_h2` | text | Copybot |
| `group_llp_svc_reviews` | `svc_reviews` | repeater | Copybot |
| `group_llp_svc_reviews` | `svc_reviews[].review_text` | wysiwyg | Copybot |
| `group_llp_svc_reviews` | `svc_reviews[].review_name` | text | Copybot |
| `group_llp_svc_reviews` | `svc_reviews[].review_town` | text | Copybot |
| `group_llp_svc_areas` | `svc_areas_h2` | text | Copybot |
| `group_llp_svc_areas` | `svc_areas_intro` | wysiwyg | Copybot |
| `group_llp_svc_areas` | `svc_areas_links` | repeater | Copybot |
| `group_llp_svc_areas` | `svc_areas_links[].area_name` | text | Copybot |
| `group_llp_svc_areas` | `svc_areas_links[].page_url` | text | Copybot |
| `group_llp_svc_areas` | `svc_areas_also_cover` | text | Copybot |
| `group_llp_svc_faq` | `svc_faq_h2` | text | Copybot |
| `group_llp_svc_faq` | `svc_faq_items` | repeater | Copybot |
| `group_llp_svc_faq` | `svc_faq_items[].faq_question` | text | Copybot |
| `group_llp_svc_faq` | `svc_faq_items[].faq_answer` | wysiwyg | Copybot |
| `group_llp_svc_more` | `svc_more_h2` | text | Copybot |
| `group_llp_svc_more` | `svc_more_intro` | wysiwyg | Copybot |
| `group_llp_svc_more` | `svc_more_cards` | repeater | Copybot |
| `group_llp_svc_more` | `svc_more_cards[].card_name` | text | Copybot |
| `group_llp_svc_more` | `svc_more_cards[].card_url` | text | Copybot |
| `group_llp_svc_final_cta` | `svc_final_cta_h2` | text | Copybot |
| `group_llp_svc_final_cta` | `svc_final_cta_body` | wysiwyg | Copybot |
| `group_llp_svc_gallery` | `svc_gallery` | repeater | The site (new) |
| `group_llp_svc_gallery` | `svc_gallery[].gallery_image` | image | The site (new) |
| `group_llp_svc_gallery` | `svc_gallery[].gallery_alt` | text | The site (new) |

### Location template

| Group | Field | Type | Filled by |
|---|---|---|---|
| `group_llp_loc_hero` | `loc_hero_h1` | text | Copybot |
| `group_llp_loc_hero` | `loc_hero_trust_line` | text | Copybot |
| `group_llp_loc_hero` | `loc_hero_intro` | wysiwyg | Copybot |
| `group_llp_loc_hero` | `loc_hero_background_image` | image | The site (new) |
| `group_llp_loc_services` | `loc_services_h2` | text | Copybot |
| `group_llp_loc_services` | `loc_services_intro` | wysiwyg | Copybot |
| `group_llp_loc_services` | `loc_services_cards` | repeater | Copybot |
| `group_llp_loc_services` | `loc_services_cards[].card_name` | text | Copybot |
| `group_llp_loc_services` | `loc_services_cards[].card_text` | wysiwyg | Copybot |
| `group_llp_loc_services` | `loc_services_cards[].card_image` | image | The site (new) |
| `group_llp_loc_services` | `loc_services_cards[].card_url` | text | Copybot |
| `group_llp_loc_content` | `loc_content_h2` | text | Copybot |
| `group_llp_loc_content` | `loc_content_body` | wysiwyg | Copybot |
| `group_llp_loc_content` | `loc_content_image` | image | The site (new) |
| `group_llp_loc_content` | `loc_content_image_alt` | text | The site (new) |
| `group_llp_loc_block4` | `loc_block4_h2` | text | Copybot |
| `group_llp_loc_block4` | `loc_block4` | repeater | Copybot |
| `group_llp_loc_block4` | `loc_block4[].card_title` | text | Copybot |
| `group_llp_loc_block4` | `loc_block4[].card_body` | wysiwyg | Copybot |
| `group_llp_loc_block5` | `loc_block5_h2` | text | Copybot |
| `group_llp_loc_block5` | `loc_cost_intro` | wysiwyg | Copybot |
| `group_llp_loc_block5` | `loc_block5` | repeater | Copybot |
| `group_llp_loc_block5` | `loc_block5[].card_title` | text | Copybot |
| `group_llp_loc_block5` | `loc_block5[].card_body` | wysiwyg | Copybot |
| `group_llp_loc_block5` | `loc_cost_price_line` | text | Copybot |
| `group_llp_loc_reviews` | `loc_reviews_show` | true_false | Copybot |
| `group_llp_loc_reviews` | `loc_reviews_h2` | text | Copybot |
| `group_llp_loc_reviews` | `loc_reviews` | repeater | Copybot |
| `group_llp_loc_reviews` | `loc_reviews[].review_text` | wysiwyg | Copybot |
| `group_llp_loc_reviews` | `loc_reviews[].review_name` | text | Copybot |
| `group_llp_loc_reviews` | `loc_reviews[].review_town` | text | Copybot |
| `group_llp_loc_process` | `loc_process_h2` | text | Copybot |
| `group_llp_loc_process` | `loc_process_steps` | repeater | Copybot |
| `group_llp_loc_process` | `loc_process_steps[].step_title` | text | Copybot |
| `group_llp_loc_process` | `loc_process_steps[].step_body` | wysiwyg | Copybot |
| `group_llp_loc_process` | `loc_process_steps[].step_icon` | image | The site (new) |
| `group_llp_loc_areas` | `loc_areas_h2` | text | Copybot |
| `group_llp_loc_areas` | `loc_areas_intro` | wysiwyg | Copybot |
| `group_llp_loc_areas` | `loc_areas_links` | repeater | Copybot |
| `group_llp_loc_areas` | `loc_areas_links[].area_name` | text | Copybot |
| `group_llp_loc_areas` | `loc_areas_links[].page_url` | text | Copybot |
| `group_llp_loc_faq` | `loc_faq_h2` | text | Copybot |
| `group_llp_loc_faq` | `loc_faq_items` | repeater | Copybot |
| `group_llp_loc_faq` | `loc_faq_items[].faq_question` | text | Copybot |
| `group_llp_loc_faq` | `loc_faq_items[].faq_answer` | wysiwyg | Copybot |
| `group_llp_loc_final_cta` | `loc_final_cta_h2` | text | Copybot |
| `group_llp_loc_final_cta` | `loc_final_cta_body` | wysiwyg | Copybot |
| `group_llp_loc_gallery` | `loc_gallery` | repeater | The site (new) |
| `group_llp_loc_gallery` | `loc_gallery[].gallery_image` | image | The site (new) |
| `group_llp_loc_gallery` | `loc_gallery[].gallery_alt` | text | The site (new) |

### One example page per type, from Edens Edge

Each example shows what Copybot would send under these names. I worked them out from the saved records for this document, and no such push exists. The site filled fields aren't included, long text is shortened and lists stop at two rows. The first and third are from 4 Nov 2026 and the others from 27 Oct 2026, so their wording is older.

### Category: Paving Contractor, Southampton

Page `/paving-contractor`, H1 "Driveways Southampton".

<details><summary>What Copybot would send for this page</summary>

```json
{
  "target_page": "/paving-contractor",
  "acf": {
    "cat_hero_h1": "Driveways Southampton",
    "cat_hero_trust_line": "100+ Jobs Completed",
    "cat_hero_intro": "<p>[CV: company_name] lays driveways in Southampton, along with patios and paths, across the city and the surrounding Hampshire towns. We're a family run, independent fi...",
    "cat_services_h2": "Our Driveways Services in Southampton",
    "cat_services_intro": "<p>Driveways, patios and the groundwork behind them are built for homeowners across the whole area, from digging out to the finished surface. The work covers concrete ba...",
    "cat_services_cards": [
      {
        "card_name": "Concrete bases and paths",
        "card_text": "<p>A shed, a drive apron or a path to the back door all need something firm under them. Our <a href=\"/services/concrete-bases-and-paths\">concrete bases and paths</a> wor...",
        "card_url": "/services/concrete-bases-and-paths"
      },
      {
        "card_name": "Garden levelling",
        "card_text": "<p>Will the ground take a drive or a patio the way it is? A <a href=\"/services/garden-levelling\">garden levelling</a> visit evens out hollows and humps by cutting and fi...",
        "card_url": "/services/garden-levelling"
      },
      "(2 more rows)"
    ],
    "cat_also_offered": "<p>We also take on driveway landscaping, driveway or path paving and driveway replacement.</p>",
    "cat_content_h2": "Local Paving for Southampton Homeowners",
    "cat_content_body": "<p>Driveways in Southampton are built on very different ground, and that shapes the work. In Oakmount Triangle the front gardens are small and sit behind low brick walls...",
    "cat_block4_h2": "Common Paving Problems",
    "cat_block4": [
      {
        "card_title": "A garden with nowhere to sit out",
        "card_body": "<p>The garden looks fine from the kitchen window, but there's no flat, dry spot for a table. It usually comes down to the ground by the back door: a slope, a lawn that s..."
      },
      {
        "card_title": "Slabs and blocks that rock or have sunk",
        "card_body": "<p>A slab that rocks underfoot, a line of blocks dipped by the drain or a joint that has opened up all point to one cause. The base under them was too thin or too soft f..."
      },
      "(2 more rows)"
    ],
    "cat_block5_h2": "What Affects the Cost of Paving in Southampton",
    "cat_cost_intro": "<p>No two paving jobs cost the same, because every garden is different and the work takes a different number of days. The four points here show where a figure comes from...",
    "cat_block5": [
      {
        "card_title": "The size of the area",
        "card_body": "<p>Square metres move the price more than anything else. A bigger area means more digging, more stone for the base and more slabs or blocks to lay. That adds days on sit..."
      },
      {
        "card_title": "What is underneath",
        "card_body": "<p>What's under the surface sets the number of days. Topsoil, clay, an old slab base or concrete that has to come out all mean more digging before a new sub base can go..."
      },
      "(2 more rows)"
    ],
    "cat_cost_price_line": "",
    "cat_reviews_show": false,
    "cat_reviews_h2": "",
    "cat_reviews": [],
    "cat_process_h2": "Your Free Quote in 3 Simple Steps",
    "cat_process_steps": [
      {
        "step_title": "Tell Us About Your Garden",
        "step_body": "<p>Ring [CV: phone] or send a message. Tell us the rough size of the area and what you want done, and add photos of the garden as it stands.</p>"
      },
      {
        "step_title": "We Price Your Job",
        "step_body": "<p>Pricing starts from what the job involves: the size of the area, what's under it and how the stone and slabs get to the garden. Those shape the figure.</p>"
      },
      "(1 more rows)"
    ],
    "cat_areas_h2": "Where We Provide Paving Across Southampton and Nearby Towns",
    "cat_areas_intro": "<p>We're based in Southampton and travel [CV: travel_distance] from there, inland and along the coast. That takes in the Hampshire villages and towns beyond the city, an...",
    "cat_areas_links": [
      {
        "area_name": "Chandlers Ford",
        "page_url": "/locations/chandlers-ford/paving-contractor"
      },
      {
        "area_name": "Eastleigh",
        "page_url": "/locations/eastleigh/paving-contractor"
      },
      "(3 more rows)"
    ],
    "cat_areas_also_cover": "Ampfield, Awbridge, Chilworth, Kings Worthy, Lockerley, Lyndhurst, Stockbridge",
    "cat_faq_h2": "Paving Questions Answered",
    "cat_faq_items": [
      {
        "faq_question": "How much does paving cost in Southampton?",
        "faq_answer": "<p>It depends on the job, and one thing people rarely expect is drainage. At the front of a house, a new surface over 5 square metres needs planning permission unless ra..."
      },
      {
        "faq_question": "Are you insured for paving work?",
        "faq_answer": "<p>Yes, we're insured up to £[CV: insurance_cover] for the work we do. The cover is for accidents while work is under way. A buried pipe or cable struck when the ground..."
      },
      "(4 more rows)"
    ],
    "cat_final_cta_h2": "Get a Free Paving Quote in Southampton",
    "cat_final_cta_body": "<p>Send a few photos and a line on what you'd like built, and a driveway, patio or path can be priced from there.</p>"
  },
  "meta": {
    "rank_math_title": "Driveways Southampton | Edens Edge Landscaping",
    "rank_math_description": "Edens Edge Landscaping offers driveways in Southampton offering fixed prices with no hidden costs. Get your free quote today.",
    "rank_math_focus_keyword": "Driveways Southampton"
  }
}
```

</details>

### Location category: Gardener, Romsey

Page `/locations/romsey/gardener`, H1 "Gardener Romsey". The same template as the category page.

<details><summary>What Copybot would send for this page</summary>

```json
{
  "target_page": "/locations/romsey/gardener",
  "acf": {
    "cat_hero_h1": "Gardener Romsey",
    "cat_hero_trust_line": "100+ Jobs Completed",
    "cat_hero_intro": "<p>[CV: company_name] is a local gardener in Romsey, looking after lawns, hedges and borders for homeowners across the town. Our prices are fixed, with no hidden costs a...",
    "cat_services_h2": "Our Gardener Services in Romsey",
    "cat_services_intro": "<p>Our gardener work covers the jobs that keep a Romsey garden under control: cutting lawns, trimming hedges, clearing beds and keeping weeds down. It suits homeowners w...",
    "cat_services_cards": [
      {
        "card_name": "Lawn mowing",
        "card_text": "<p>Grass that gets ahead of you ends up clumped and uneven, and a rushed cut can take too much off at once. Our <a href=\"/services/lawn-mowing\">lawn mowing</a> work sets...",
        "card_url": "/services/lawn-mowing"
      },
      {
        "card_name": "Fencing",
        "card_text": "<p>Is that fence leaning, or rattling every time the wind picks up? A <a href=\"/locations/romsey/fencing\">fencing</a> visit can mean new close board or panel runs, with...",
        "card_url": "/locations/romsey/fencing"
      },
      "(4 more rows)"
    ],
    "cat_also_offered": "",
    "cat_content_h2": "Local Gardening for Romsey Homeowners",
    "cat_content_body": "<p>Being a gardener in Romsey means working across very different gardens. Great Woodley's Radburn layout often puts the vehicle route behind the house, which changes ho...",
    "cat_block4_h2": "Common Gardening Problems",
    "cat_block4": [
      {
        "card_title": "A lawn full of moss and bare patches",
        "card_body": "<p>Moss takes hold where the grass is thin and the ground stays damp, and bare patches there never fill on their own. Shade and damp ground are behind it. We scarify to..."
      },
      {
        "card_title": "Hedges that have got away",
        "card_body": "<p>A hedge can end up wide at the top and bare at the base, with growth pushing over the path. Usually cuts were missed or made at the wrong time of year, so the top thi..."
      },
      "(2 more rows)"
    ],
    "cat_block5_h2": "What Affects the Cost of Gardening in Romsey",
    "cat_cost_intro": "<p>The price of gardening moves with how much there is to do and how often you'd like us here. You'll get a quote once we know what the garden involves.</p>",
    "cat_block5": [
      {
        "card_title": "How often we visit",
        "card_body": "<p>A regular round makes each visit shorter, so the price per visit is lower than an occasional big tidy up. How often you want us here is one of the first things that s..."
      },
      {
        "card_title": "The size of the garden",
        "card_body": "<p>Every extra square metre of grass, border and hedge adds work to each visit. A small terrace plot takes less time than a long back garden with deep beds and a boundar..."
      },
      "(2 more rows)"
    ],
    "cat_cost_price_line": "",
    "cat_reviews_show": false,
    "cat_reviews_h2": "",
    "cat_reviews": [],
    "cat_process_h2": "Your Free Quote in 3 Simple Steps",
    "cat_process_steps": [
      {
        "step_title": "Tell Us About Your Garden",
        "step_body": "<p>Call [CV: phone] or send a message with the size of the garden, what you want kept on top of, and photos if you have them.</p>"
      },
      {
        "step_title": "We Agree the Round and the Price",
        "step_body": "<p>We go through what each visit will include and what it comes to in price, so you know what the round involves before it begins.</p>"
      },
      "(1 more rows)"
    ],
    "cat_areas_h2": "Where We Provide Gardening Across Romsey",
    "cat_areas_intro": "<p>We cover all of Romsey and the villages around it, and we travel up to [CV: travel_distance] inland and along the coast. Wherever your garden sits, whether on the edg...",
    "cat_areas_links": [
      {
        "area_name": "Whitenap",
        "page_url": ""
      },
      {
        "area_name": "Halterworth",
        "page_url": ""
      },
      "(10 more rows)"
    ],
    "cat_areas_also_cover": "",
    "cat_faq_h2": "Gardening Questions Answered",
    "cat_faq_items": [
      {
        "faq_question": "How much does gardening cost in Romsey?",
        "faq_answer": "<p>There's no standard price, but the quote is free. Tell us what your Romsey garden has, such as the lawn, the borders and a front hedge. Photos help, but they aren't e..."
      },
      {
        "faq_question": "Are you insured?",
        "faq_answer": "<p>Yes, we're insured up to £[CV: insurance_cover]. That cover is in place for accidents that can happen while garden work is under way, such as a damaged fence or a bro..."
      },
      "(4 more rows)"
    ],
    "cat_final_cta_h2": "Get a Free Gardening Quote in Romsey",
    "cat_final_cta_body": "<p>Describe your garden and the work you'd like done, and we'll put together a quote for you.</p>"
  },
  "meta": {
    "rank_math_title": "Gardener Romsey | Edens Edge Landscaping",
    "rank_math_description": "Edens Edge Landscaping is a gardener in Romsey offering fixed prices with no hidden costs. Get your free quote today.",
    "rank_math_focus_keyword": "Gardener Romsey"
  }
}
```

</details>

### Service: Patios, Southampton

Page `/services/patios`, H1 "Patios Southampton".

<details><summary>What Copybot would send for this page</summary>

```json
{
  "target_page": "/services/patios",
  "acf": {
    "svc_hero_h1": "Patios Southampton",
    "svc_hero_trust_line": "100+ Jobs Completed",
    "svc_hero_intro": "<p>[CV: company_name] builds patios in Southampton and across the towns around it, inland and along the coast. Every patio we build has a fixed price with no hidden cost...",
    "svc_included_h2": "What's Included in Our Patios",
    "svc_included_intro": "<p>A patio is a firm, level area of paving at the back of the house, built for a table and chairs. You're left with a surface that's dug out, built up on a compacted bas...",
    "svc_included_items": [
      {
        "item_title": "Set out levels and falls",
        "item_text": "Mark out finished levels and the falls"
      },
      {
        "item_title": "Excavate",
        "item_text": "Dig out to the depth the paving needs"
      },
      "(5 more rows)"
    ],
    "svc_content_h2": "Local Patios for Southampton Homeowners",
    "svc_content_body": "<p>Patios in Southampton are built on very different ground, from Lordswood to Townhill Park. Lordswood is mostly detached family housing, so a patio there is often size...",
    "svc_block4_h2": "Is a patio right for your garden?",
    "svc_block4": [
      {
        "card_title": "The part of the garden you never use",
        "card_body": "<p>If one corner is somewhere nobody goes, it's often because the ground is wet, uneven or too soft to stand a chair on. What decides the answer is the ground itself, a..."
      },
      {
        "card_title": "Doing it once, properly",
        "card_body": "<p>A cheaper quote, or doing it yourself, comes down to what you can't see once it's finished. The dig and the compacted base under the slabs are where a quick job saves..."
      },
      "(2 more rows)"
    ],
    "svc_process_h2": "Your Free Quote in 3 Simple Steps",
    "svc_process_steps": [
      {
        "step_title": "Tell Us About Your Garden",
        "step_body": "<p>Call or message us with the rough size of the area and what you'd like built. A few photos of the garden help too, if you have them.</p>"
      },
      {
        "step_title": "We Price Your Job",
        "step_body": "<p>Once we know what's involved, we put a price to the job and settle it with you before the first dig.</p>"
      },
      "(1 more rows)"
    ],
    "svc_block5_h2": "What Affects the Cost of Patios in Southampton",
    "svc_cost_intro": "<p>A patio's price is set by the dig and the slabs, so it moves with the job in front of us. Quotes are free, and the four cards that follow explain what makes one patio...",
    "svc_block5": [
      {
        "card_title": "How much there is to do",
        "card_body": "<p>The area comes first: more square metres means more digging, more base and more slabs to lay. A small patio by the back door and a large one across the garden are ver..."
      },
      {
        "card_title": "What's there now",
        "card_body": "<p>Anything already there changes the starting point. An old surface has to be broken up and removed, soft ground may need digging deeper before a base will hold, and wh..."
      },
      "(2 more rows)"
    ],
    "svc_cost_price_line": "",
    "svc_reviews_show": false,
    "svc_reviews_h2": "",
    "svc_reviews": [],
    "svc_areas_h2": "Where We Provide Patios Across Southampton and Nearby Towns",
    "svc_areas_intro": "<p>We're based in Southampton and work within [CV: travel_distance] of it, inland and along the coast. Patios are part of the work everywhere in that area, whether the g...",
    "svc_areas_links": [
      {
        "area_name": "Chandlers Ford",
        "page_url": "/locations/chandlers-ford/landscape-designer"
      },
      {
        "area_name": "Eastleigh",
        "page_url": "/locations/eastleigh/landscape-designer"
      },
      "(3 more rows)"
    ],
    "svc_areas_also_cover": "Ampfield, Awbridge, Chilworth, Kings Worthy, Lockerley, Lyndhurst, Stockbridge",
    "svc_faq_h2": "Patios Questions Answered",
    "svc_faq_items": [
      {
        "faq_question": "How much does a patio cost in Southampton?",
        "faq_answer": "<p>The price depends on your garden, and it's agreed with you before any work starts. Quotes are free. One thing that surprises people is the cutting. Paving that meets..."
      },
      {
        "faq_question": "When is the best time of year for patios, and how long does it take?",
        "faq_answer": "<p>Dry, frost free weather suits a patio, because fresh bedding and joints need protecting. Frost or heavy rain on fresh work can spoil it before it has set. How long it..."
      },
      "(4 more rows)"
    ],
    "svc_more_h2": "Our Other Garden Design Services",
    "svc_more_intro": "<p>A patio is often one part of a bigger garden plan. These are the other garden design jobs we build for homeowners across the area.</p>",
    "svc_more_cards": [
      {
        "card_name": "Lawn seeding",
        "card_url": "/services/lawn-seeding"
      },
      {
        "card_name": "Artificial grass installation",
        "card_url": "/services/artificial-grass-installation"
      },
      "(10 more rows)"
    ],
    "svc_final_cta_h2": "Get a Free Patios Quote in Southampton",
    "svc_final_cta_body": "<p>Share the spot you have in mind with us, and we'll work out what a patio there would involve for your garden.</p>"
  },
  "meta": {
    "rank_math_title": "Patios Southampton | Edens Edge Landscaping",
    "rank_math_description": "Edens Edge Landscaping offers patios in Southampton, fixed prices with no hidden costs. Get your free quote today.",
    "rank_math_focus_keyword": "Patios Southampton"
  }
}
```

</details>

### Town service: Tree stump removal, Romsey

Page `/locations/romsey/tree-stump-removal`, H1 "Tree Stump Removal Romsey". The same template as the service page.

<details><summary>What Copybot would send for this page</summary>

```json
{
  "target_page": "/locations/romsey/tree-stump-removal",
  "acf": {
    "svc_hero_h1": "Tree Stump Removal Romsey",
    "svc_hero_trust_line": "100+ Jobs Completed",
    "svc_hero_intro": "<p>[CV: company_name] carries out tree stump removal in Romsey, grinding or digging out old stumps for homeowners across the town. Most jobs are booked for a [CV: start_...",
    "svc_included_h2": "What's Included in Our Tree Stump Removal",
    "svc_included_intro": "<p>Tree stump removal deals with the stump a felled tree leaves behind, for homeowners who want a lawn, path or bed where it stood. The job runs from the first look at t...",
    "svc_included_items": [
      {
        "item_title": "Inspect stump and underground hazards",
        "item_text": "Check the stump and what's buried nearby"
      },
      {
        "item_title": "Select removal method",
        "item_text": "Choose between grinding and excavation or winching"
      },
      "(4 more rows)"
    ],
    "svc_content_h2": "Local Tree Stump Removal for Romsey Homeowners",
    "svc_content_body": "<p>Romsey sits across the lower Test valley, with low streets near the river and housing climbing the valley sides, so tree stump removal in the town rarely means the sa...",
    "svc_block4_h2": "Signs You Need Tree Stump Removal",
    "svc_block4": [
      {
        "card_title": "The first signs",
        "card_body": "<p>Shoots keep sprouting from the ground nearby, or the spot where a tree came down has never quite gone back to normal. A new lawn or path can't be laid level there. Le..."
      },
      {
        "card_title": "It's moved, sunk or leant",
        "card_body": "<p>A new surface that's dipped, or a patch of ground that's dropped where a stump used to be, usually comes from a stage skipped underneath. Chippings packed in loosely..."
      },
      "(2 more rows)"
    ],
    "svc_process_h2": "Your Free Quote in 3 Simple Steps",
    "svc_process_steps": [
      {
        "step_title": "Tell Us About Your Garden",
        "step_body": "<p>Message or call with the stump's rough size, where it stands and what's going in its place. Photos of the stump and the way in help if you have them.</p>"
      },
      {
        "step_title": "We Price Your Job",
        "step_body": "<p>A price is agreed with you before any work begins, so you know exactly what the stump removal covers and what it'll cost.</p>"
      },
      "(1 more rows)"
    ],
    "svc_block5_h2": "What Affects the Cost of Tree Stump Removal in Romsey",
    "svc_cost_intro": "<p>Stump removal is priced job by job, because no two stumps sit in the same ground. You'll have the price settled before work begins, and the four things below are what...",
    "svc_block5": [
      {
        "card_title": "How much there is to do",
        "card_body": "<p>A wide stump with long roots means more to grind through, and a deeper grind adds time again. More than one stump in the garden means that much more work.</p>"
      },
      {
        "card_title": "What's there now",
        "card_body": "<p>Roots running under a path or lawn edge, old concrete or a hard layer in the ground all add cutting time. A stump with a lot of wood below the surface takes longer to..."
      },
      "(2 more rows)"
    ],
    "svc_cost_price_line": "",
    "svc_reviews_show": false,
    "svc_reviews_h2": "",
    "svc_reviews": [],
    "svc_areas_h2": "Where We Provide Tree Stump Removal Across Romsey",
    "svc_areas_intro": "<p>We're based locally and travel up to [CV: travel_distance], inland and along the coast. That takes in the whole of Romsey and the villages around it, so this work goe...",
    "svc_areas_links": [
      {
        "area_name": "Whitenap",
        "page_url": ""
      },
      {
        "area_name": "Halterworth",
        "page_url": ""
      },
      "(10 more rows)"
    ],
    "svc_areas_also_cover": "",
    "svc_faq_h2": "Tree Stump Removal Questions Answered",
    "svc_faq_items": [
      {
        "faq_question": "How much does tree stump removal cost in Romsey?",
        "faq_answer": "<p>Every stump is quoted individually, and the quote is free. How wide the stump is and how far its roots spread usually move the figure most. Send us a few details abou..."
      },
      {
        "faq_question": "When is the best time of year for tree stump removal, and how long does it take?",
        "faq_answer": "<p>There's no fixed season or standard time for stump removal. Grinding can usually be planned whenever the stump can be reached. How long it takes depends on how easily..."
      },
      "(3 more rows)"
    ],
    "svc_more_h2": "Our Other Tree Surgery Services in Romsey",
    "svc_more_intro": "<p>Stump work often sits alongside other jobs on the same trees. The cards below show the rest of our tree surgery work, each with its own page for the detail.</p>",
    "svc_more_cards": [
      {
        "card_name": "Tree cabling and bracing",
        "card_url": "/services/tree-cabling-and-bracing"
      },
      {
        "card_name": "Tree planting",
        "card_url": "/services/tree-planting"
      },
      "(3 more rows)"
    ],
    "svc_final_cta_h2": "Get a Free Tree Stump Removal Quote in Romsey",
    "svc_final_cta_body": "<p>Send us the stump's size and where it stands, and we'll price the job and agree a start date with you.</p>"
  },
  "meta": {
    "rank_math_title": "Tree Stump Removal Romsey | Edens Edge Landscaping",
    "rank_math_description": "Edens Edge Landscaping offers tree stump removal in Romsey, fixed prices with no hidden costs. Get your free quote today.",
    "rank_math_focus_keyword": "Tree Stump Removal Romsey"
  }
}
```

</details>

### Location: Romsey

Page `/locations/romsey`, H1 "Gardener Services in and around Romsey".

<details><summary>What Copybot would send for this page</summary>

```json
{
  "target_page": "/locations/romsey",
  "acf": {
    "loc_hero_h1": "Gardener Services in and around Romsey",
    "loc_hero_trust_line": "100+ Jobs Completed",
    "loc_hero_intro": "<p>[CV: company_name] is a gardener in Romsey, taking on everything from a simple tidy up to a full makeover with groundwork, patios and decking. Every price we give is...",
    "loc_services_h2": "Our Landscaping Services in Romsey",
    "loc_services_intro": "<p>Romsey gardens run from deep lawns by the river to small terrace yards. Homeowners here look for lawn care, groundwork, patios, decking and tree work, and the cards b...",
    "loc_services_cards": [
      {
        "card_name": "Gardening",
        "card_text": "<p>Borders lost under weeds and grass that's got ahead of you make a garden feel neglected fast. Our <a href=\"/locations/romsey/gardener\">gardening</a> work is the upkee...",
        "card_url": "/locations/romsey/gardener"
      },
      {
        "card_name": "Landscape Gardening",
        "card_text": "<p>Is the garden awkward to use, with a slope that makes every trip down it a chore? The <a href=\"/locations/romsey/landscape-gardener\">landscape gardening</a> we do res...",
        "card_url": "/locations/romsey/landscape-gardener"
      },
      "(4 more rows)"
    ],
    "loc_content_h2": "Local Landscaping for Romsey Homeowners",
    "loc_content_body": "<p>Romsey sits low beside the River Test, and that shapes the work of any gardener in Romsey. Housing climbs to flatter ground to the east, away from the water. Gardens...",
    "loc_block4_h2": "Common Landscaping Problems in Romsey",
    "loc_block4": [
      {
        "card_title": "Ground that holds the rain",
        "card_body": "<p>A lawn beside a stream that stays soggy for days after rain is common here. Some gardens sit near the Test and others near the Tadburn. The fields to the west hold fl..."
      },
      {
        "card_title": "Boundaries as old as the houses",
        "card_body": "<p>Panels that lean, posts soft at the base and a garden wall with a bow in it usually belong to the original boundary. Romsey's post war estates and older streets were..."
      },
      "(2 more rows)"
    ],
    "loc_block5_h2": "What Affects the Cost of Landscaping in Romsey",
    "loc_cost_intro": "<p>What a landscaping job costs in Romsey comes down to the hours of work and what has to be carried or cleared. The four points below are the ones that usually add or s...",
    "loc_block5": [
      {
        "card_title": "Getting in on a terraced street",
        "card_body": "<p>On terraced streets such as those around Riverside Gardens and Rivermead Close, there's no vehicle access outside the front door. Materials are carried in by hand and..."
      },
      {
        "card_title": "Gardens on a slope",
        "card_body": "<p>A garden that falls or rises from the house needs its levels taken, steps or a retaining edge, and more digging than a flat one. Streets east of the river rise up the..."
      },
      "(2 more rows)"
    ],
    "loc_cost_price_line": "",
    "loc_reviews_show": false,
    "loc_reviews_h2": "",
    "loc_reviews": [],
    "loc_process_h2": "Your Free Quote in 3 Simple Steps",
    "loc_process_steps": [
      {
        "step_title": "Tell Us About Your Garden",
        "step_body": "<p>Call us on [CV: phone] (we're open [CV: hours]) and tell us the rough size, what you'd like done, and send photos if you have them.</p>"
      },
      {
        "step_title": "We Price Your Job",
        "step_body": "<p>Once we know what you want done, a price is agreed with you before any work starts, so you know exactly what the job covers.</p>"
      },
      "(1 more rows)"
    ],
    "loc_areas_h2": "Where We Provide Landscaping Around Romsey",
    "loc_areas_intro": "<p>We cover Romsey and the villages and neighbourhoods around it, and we travel up to [CV: travel_distance] to reach them. That takes in the older streets by the river a...",
    "loc_areas_links": [
      {
        "area_name": "Whitenap",
        "page_url": ""
      },
      {
        "area_name": "Halterworth",
        "page_url": ""
      },
      "(10 more rows)"
    ],
    "loc_faq_h2": "Landscaping Questions Answered",
    "loc_faq_items": [
      {
        "faq_question": "How much does landscaping cost in Romsey?",
        "faq_answer": "<p>Price follows the size of the job, the ground and the way in. A patio with steps and a retaining wall takes longer than a short path, and a garden reached only throug..."
      },
      {
        "faq_question": "How soon can you get to Romsey?",
        "faq_answer": "<p>Our usual start is the [CV: start_time], and that holds across the whole town. A full garden makeover or a patio with steps needs more planning than a quick tidy. Fro..."
      },
      "(3 more rows)"
    ],
    "loc_final_cta_h2": "Get a Free Landscaping Quote in Romsey",
    "loc_final_cta_body": "<p>Ring or message with a photo of the garden and the job you have in mind, and your project gets its place in our diary.</p>"
  },
  "meta": {
    "rank_math_title": "Gardener Services in and around Romsey | Edens Edge Landscaping",
    "rank_math_description": "Edens Edge Landscaping is a gardener in Romsey offering fixed prices with no hidden costs. Get your free quote today.",
    "rank_math_focus_keyword": ""
  }
}
```

</details>

## The focus keyword

The focus keyword is the page's target keyword from the page map, not its H1. Every homepage, category, service and location record now carries it as `focus_keyword`, including their town versions.

**Where it comes from:** the page map's `h1_keyword`, which the H1 research sets. On most pages that matches the H1. A typed H1 override on the homepage is used as the keyword.

**No two pages share a focus keyword.** A hub page has a pattern for its H1, such as "Gardener Services in and around Romsey". If the keyword behind the pattern, "Gardener Romsey", is already another page's target, the hub page's focus keyword is blank. If no other page targets it, the hub page keeps it. A fixture fails if any page map in the repo gives two pages the same one.

**What the template or site should do with a blank:** nothing. Copybot would send an empty value, and Rank Math then has no focus keyword for that page.

| Page type | Example from Edens Edge |
|---|---|
| Homepage | Landscaper Southampton |
| Category | Driveways Southampton |
| Location category | Gardener Romsey |
| Service | Patios Southampton |
| Town service | Tree Stump Removal Romsey |
| Location | Blank: its H1 is "Gardener Services in and around Romsey", and "Gardener Romsey" is the target of its Gardener location category page |
| Blog post | Not added: that record is on the `blog` branch, which is parked |

**It is not sent to WordPress yet.** The plugin only lets Copybot write the meta keys it registers, and the focus keyword isn't one of them. Sending it now would be dropped by the site, and the push's read back would report a mismatch. So it waits with the plugin change:

1. Add `rank_math_focus_keyword` and `_yoast_wpseo_focuskw` to the plugin's registered meta, and bump its version.
2. Add the key to the push's SEO adapters in `wp/homepage-map.js`.

## business_schema_id

**Decided: the LocalBusiness `@id` on every site is `https://<site>/#localbusiness`.** Copybot derives it from the site's URL. It is never blank and nobody types it in, so the spec's step of copying the `@id` from validator.schema.org by hand goes away. For example, a site at `https://www.example.co.uk` has `https://www.example.co.uk/#localbusiness`.

**What Given needs to do:**

1. **Give the one LocalBusiness block exactly this `@id`.** Copybot doesn't write schema for pages: the spec says the "master kit" does. It needs the subtype, which Copybot holds per niche as `schema_subtype`, and the name, address and phone exactly as on the Google profile, with no street address for a hidden address business.
2. **Refer to it from every other template.** Print `llp_cv( 'business_schema_id' )` in the schema, and never add a second LocalBusiness block. The spec then checks one inner page shows the same `@id`.

**The value follows the site's address.** On a staging site it holds the staging address, and the push to the live site corrects it. A site that moves address changes its `@id` at the next push.

**What is left on the Copybot side, with the plugin change:** the function that derives it is on main (`businessSchemaId` in `wp/client-values.js`), but nothing sends it yet, because the plugin only keeps the Client Values keys it knows. Until the plugin has this key, `llp_cv( 'business_schema_id' )` returns nothing. Adding the key regenerates `client-value-keys.json` and bumps the plugin version, then the push sends the value on every page push. No field is needed on the Record tab.

## Gaps

### In the template spec, with no Copybot field

**Homepage** (`Homepage_Template_v2_Core_30_Build_Spec`):

| Spec item | Today |
|---|---|
| Rank Math focus keyword | On every record, not pushed yet. See The focus keyword |
| `[CV: business_schema_id]` for the LocalBusiness `@id` | Decided, not sent yet. See business_schema_id |
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
