# GBP Validator rules (v1 draft, 23 Oct 2026)

Copybot runs these after each GBP step (`gbp/validator.js`). A FAIL blocks the save and shows the reason. A FLAG saves but marks the field for Brandon to check. Code reads the banned phrase list from this file; a locked service name that itself has a hyphen (the site's own page title) is exempt from the dash rule, since the name may not change. A step that fails runs once more with its failures before it fails.

## Lengths (FAIL)
- Description: 720–750 characters including spaces
- Service descriptions: 200–300
- Product titles: ≤ 58
- Product descriptions: 600–1,000

## Services (FAIL)
- Every locked service from the page map is present, name unchanged
- No service name appears under more than one category
- Total services ≥ max(20, competitor_service_count + 1)
- Every VARIANT shares a category with a LOCKED parent

## Content (FAIL)
- No phone numbers, email addresses or URLs in the description, service descriptions or product descriptions
- No prices in products unless show_prices is true (check for £ and "per")
- No hyphen, en dash or em dash anywhere in any field
- No town names in product titles
- No capitals-for-emphasis words (whole word in caps, excluding acronyms in the client record)
- Banned phrases, case insensitive: look no further, whether you need, we pride ourselves, your go to, tailored to your needs, top notch, in the heart of, nestled, elevate, seamless, hassle free, peace of mind, we understand that, from start to finish, unparalleled, dedicated team, best, cheapest, number one

## Facts (FLAG)
- Any year, number of years, accreditation, membership, insurance figure or guarantee term in the output that does not appear in the client's custom values

## Build order
Description → Services → Products. Products read the Services output (categories) and the generated service page copy (what's included).

## Outputs
/clients/<slug>/gbp/description.txt, services.csv (Category, Service, Type, Description, Count, URL), products.csv (Title, Category, Description, Count, URL), validation.json
