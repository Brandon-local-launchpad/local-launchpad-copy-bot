# GBP Validator rules (v4, 23 Oct 2026)

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
- No two service names that differ only by a plural, the word order, or the words custom, bespoke, services or work (the pair is reported; two page map names that collide are a FLAG, since the page map owns them)
- No proof point in more than a quarter of the service descriptions (each proof point has a detector; opening hours are never a proof point)
- No more than a third of the service descriptions end with a sentence that starts with the service name
- A proof point is lower case except proper nouns: "Family Run" inside a sentence fails. Proper nouns are the client record's names (company name, areas, logos, materials, GBP categories, each matched as a whole phrase), acronyms, and, when the niche's trade facts pack is verified, the pack's trade bodies, accreditations, schemes and brands (`trade-facts/pack.js` packProperNouns); with the pack unverified or missing the client record alone decides and the run is flagged

## Content (FAIL)
- No phone numbers, email addresses or URLs in the description, service descriptions or product descriptions
- No prices in products unless show_prices is true (check for £ and "per")
- No hyphen, en dash or em dash anywhere in any field
- No town names in product titles
- A product description names the main town and the five nearest areas at most (six names)
- The description never opens a clause with "As [category], we" or "As a [category] we", and names one category per sentence at most
- The description names the primary category in sentence one and at most three secondary categories in all (code picks them: the categories tied to the services the client wants most, jobs_wanted order, then page map order; the others' services are named, not the categories)
- No two consecutive sentences in the description start with the same word
- The description's areas sentence (the one naming two or more of the other areas) does not repeat the main town
- No sentence in the description ends with a filler location phrase (around the garden, for your home, in the area, across the local area, on your property and the like)
- No capitals-for-emphasis words (whole word in caps, excluding acronyms in the client record)
- Banned phrases, case insensitive: look no further, whether you need, we pride ourselves, your go to, tailored to your needs, top notch, in the heart of, nestled, elevate, seamless, hassle free, peace of mind, we understand that, from start to finish, unparalleled, dedicated team, best, cheapest, number one

## Facts (FLAG)
- Any year, number of years, accreditation, membership, insurance figure or guarantee term in the output that does not appear in the client's custom values

## Build order
Description → Services → Products. Products read the Services output (categories) and the generated service page copy (what's included).

## Outputs
/clients/<slug>/gbp/description.txt, services.csv (Category, Service, Type, Description, Count, URL), products.csv (Title, Category, Description, Count, URL), validation.json
