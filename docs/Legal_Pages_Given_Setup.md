# Legal pages: what Given sets up (7 Nov 2026)

Copybot fills three fixed legal pages from the client's details and pushes the finished text into one rich text field on each page. Staging only for now. Nothing here needs writing on a live client site.

## The field

Copybot ships this in the plugin, so **you don't create or import it**. Install the new plugin version when Copybot gives you the zip (it isn't built yet, this is the shape it will have).

| Thing | Value |
|---|---|
| Field group | `group_llp_legal` |
| Field | `legal_body` |
| Type | ACF WYSIWYG (rich text) |
| Filled by | Copybot only. Nobody edits it on the site: the next push overwrites it, and the wording is signed off by the client |

The field group has to be attached to the three pages, or ACF drops the text without an error.

## What to set up

1. **One page template for legal pages.** Suggested file `templates/legal-page.php`. Copybot's field group attaches with the rule "page template equals this file". **Tell me the exact value if yours differs, or if Elementor means this rule won't work**, because that value goes into the plugin before it is built.
2. **What the template shows:** the header and footer, the page title as the H1, then `legal_body`. No hero, CTA, reviews or map, and no other copy.
3. **Styling inside `legal_body`:** the text arrives as HTML with `h2`, `p`, `ul`, `strong` and `table` (with a header row). Privacy Policy has three tables, one of them five columns wide, so tables must scroll sideways on a phone rather than break the page.
4. **Three pages, as drafts, using that template:**

   | Title | Slug |
   |---|---|
   | Privacy Policy | `/privacy-policy` |
   | Website Terms of Use | `/terms` |
   | Service Terms | `/service-terms` |

   Keep these exact slugs: Copybot finds the pages by them. It writes to pages that exist and doesn't create them. It doesn't change a page's status, so a draft stays a draft.
5. **Footer links on every page** to all three.
6. **A "Manage cookies" link in the footer** that reopens the cookie banner. Privacy Policy section 7 tells visitors this link exists, so it has to work.
7. **The cookie banner:** Accept and Reject equally easy, nothing needing consent set before a choice, and Google Analytics behind the banner (Consent Mode). Privacy Policy section 7 says all of this.

## What to tell Copybot per site

Each site's Google Ads tag, Meta Pixel and text messaging tool (yes or no). They change what the Privacy Policy says, and they're typed in on the client's Record tab under Legal details. Tell Brandon if one is added later, because the policy has to change with it.
