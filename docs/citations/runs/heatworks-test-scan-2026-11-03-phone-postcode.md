# Heatworks test scan, 3 Nov 2026 (evening): the phone and postcode searches

The same test business as `heatworks-test-scan-2026-11-03.md` (Heatworks Heating & Plumbing, Southampton, 023 8044 5123, SO19 9GA, niche plumbing-heating), run twice more after Brandon's two query variants were added: the phone in quotes in both forms ("023 8044 5123" and "02380445123") and the business name in quotes with the postcode ("Heatworks Heating & Plumbing" SO19 9GA). A result carrying the phone number is the business even when the name differs (high confidence); a result whose title has no word of the name but whose snippet carries the phone is a list page (a category, a town search, a "check a business" page), reported as listed with the URL still to find and not read.

Run 2 ran before the list page rule, run 3 after it. Nothing is saved by this tool; the directory database is seeded on pg-mem.

## The three runs side by side

| | Run 1 (name searches only) | Run 2 (five searches) | Run 3 (five searches, list page rule) |
|---|---|---|---|
| Searches | 2 | 5 (the spaced phone search not ready in 15 minutes) | 5 (the name alone not ready in 15 minutes) |
| Listed | 6 of 38 | 7 of 38 | 8 of 38 |
| Read by content parsing | 4 | 4 | 4 |
| From a snippet | 1 (Instagram, low) | 2 (Cylex low, Gas Safe high by phone) | 3 (Cylex low, Instagram low, Trustpilot high by phone) |
| Unreadable | 1 (Checkatrade) | 2 (Checkatrade, Bizify) | 1 (Checkatrade) |
| High confidence | 1 (Fyple) | 2 (Fyple, Gas Safe) | 2 (Fyple, Trustpilot) |
| Scan cost (logged) | $0.0467 | $0.0569 | $0.0605 |
| Scan time | 11.6 min | 10.8 min | 15.5 min (the queue was slow this evening) |

## What the extra queries added

- The postcode search found the Cylex listing (ockley.cylex-uk.co.uk, "Heatworks Plumbing and Heating, Ockley") in run 2; in run 3 the same page came back on the name search. Low confidence: the snippet has neither phone nor postcode (Ockley is a different Heatworks; the NAP read would settle it, but Cylex pages cannot be read through DataForSEO).
- The digits phone search found the Gas Safe Register "Check a Business" page in run 2, with the phone in the snippet. Under run 2's rule it was listed, high, with a name mismatch ("Check a Business or Engineer" is the page title); under the list page rule it would be listed, medium, URL to find by hand. In run 3 Google did not return it.
- The phone in the snippet lifted Trustpilot to high confidence in run 3 (the snippet carries 023 8044 5123; the page itself cannot be read).
- The discovery pass of run 2 (before the list page rule) accepted five list pages on the phone alone: a Bark category page, a FreeIndex "Southampton Central Heating Companies" page, a Yell "Gas Engineers Near Me in Woolston" page, a MyBuilder Newport page and the Gas Safe pages. That is why the rule was added: a list page proves the business is on the directory, but it is not the listing, and reading it would match the phone against many names.
- Google varies between identical searches minutes apart: Gas Safe and Bark appeared in run 2's discovery and not in run 3; Trustpilot in run 3 and run 1's first pass but not run 2. Two of the five searches timed out in the queue this evening (one per run, 15 minutes); the scan went on with the rest.
- The phone searches also surfaced sites not in the database (19 in run 3): touchsouthampton.com, ukbusinessadvertiser.co.uk, plumbersworldwide.com, about.me, zoominfo.com and the rest in the list below. Candidates for the directory database or for the gap check's classifier.

## Cost per scan

A client scan is one pass: five queued searches at about $0.003 to $0.006 each, one backlinks call ($0.02), a page read per listing found ($0.0015). Run 3's scan pass was $0.0605 logged; the test tool runs the searches twice (a discovery pass for the table, then the scan), so its measured spend is higher ($0.08). A scan stays under 10 cents.

---

# Run 3 (the final code)

```
TEST SCAN (nothing saved): "Heatworks Heating & Plumbing", Southampton, phone 023 8044 5123, site https://heatworksuk.com, address 39 Longmore Ave, Woolston, Southampton SO19 9GA; niche plumbing-heating
NAP: {"name":"Heatworks Heating & Plumbing","address":"39 Longmore Avenue, Woolston, Southampton SO19 9GA","service_areas":null,"phone":"02380 445123","website":"https://heatworksuk.com","website_source":"live domain","email":"","hours":""}
  UK Core: 16 rows
  UK Secondary: 11 rows
  Location: 0 rows (approve the locations first)
  Trade / niche: 11 rows

DISCOVERY in 906s, $0.0180: ""Heatworks Heating & Plumbing" Southampton" and ""Heatworks Heating & Plumbing"" and ""023 8044 5123"" and ""02380445123"" and ""Heatworks Heating & Plumbing" SO19 9GA"; errors: "Heatworks Heating & Plumbing": not ready within 15 minutes
149 distinct results. In the database: 55 (accepted 1, rejected 54); not in the database: 94

| Site | Directory | Accepted | Title | URL |
|---|---|---|---|---|
| chatteris.cylex-uk.co.uk | Cylex UK | no (title or snippet without the name, or not the business's own page) | ▷ Heatworks | Plumbers, Chatteris | AI Review Summary | https://chatteris.cylex-uk.co.uk/company/heatworks-26821878.html |
| checkatrade.com | Checkatrade | no (title or snippet without the name, or not the business's own page) | Heat Tech Mechanical & Heating | Plumber | Portsmouth | https://www.checkatrade.com/trades/southseaplumbingandheatingspecialists |
| eaton-socon.cylex-uk.co.uk | Cylex UK | no (title or snippet without the name, or not the business's own page) | Pipeworks Heating & Plumbing, Eaton Socon | https://eaton-socon.cylex-uk.co.uk/company/pipeworks-heating---plumbing-27362327.html |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heating and Cooling Services Southampton | https://www.facebook.com/fb-answers/heating-and-cooling-services-southampton/?locale=ka_GE |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heatworks UK Ltd (@heatworksukltd) | https://www.facebook.com/heatworksukltd/?locale=en_GB |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | FOR ALL YOUR HEATING NEEDS! ... | https://www.facebook.com/gasworkssouthampton/posts/-for-all-your-heating-needs-looking-to-keep-your-home-warm-cosy-running-efficien/1622179853252851/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heatworks Services (@HeatworksServices) | https://www.facebook.com/HeatworksServices/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | It's not just about the quality of our work, we really are the ... | https://www.facebook.com/swplumbingdevon/posts/its-not-just-about-the-quality-of-our-work-we-really-are-the-professional-team-y/1661288888807021/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heating Engineers in Southampton: Recommendations ... | https://www.facebook.com/fb-answers/heating-engineers-in-southampton/?locale=it_IT |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heatworks UK Ltd updated their cover photo. | https://www.facebook.com/heatworksukltd/photos/465147032292114/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heat Hampshire (@heathampshire) | https://www.facebook.com/heathampshire/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Flintstone Tyre Services | Southampton | https://www.facebook.com/FlintstoneTyreServices/?locale=en_GB |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Peartree Practice Bitterne - GP Surgery Info, Appointments ... | https://www.facebook.com/fb-answers/peartree-practice-bitterne/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Livewire Tyres | Southampton | https://www.facebook.com/Livetyres/?locale=en_GB |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heating Works (@heatingworksltd) | https://www.facebook.com/heatingworksltd/?locale=et_EE |
| fyple.co.uk | Fyple UK | no (title or snippet without the name, or not the business's own page) | pampering palms massage therapy - Southampton | https://www.fyple.co.uk/company/pampering-palms-massage-therapy-8bcdg8t/ |
| instagram.com | Instagram | yes | Heatworks Plumbing and Heating (@heatworksplumbing) | https://www.instagram.com/heatworksplumbing/ |
| instagram.com | Instagram | no (title or snippet without the name, or not the business's own page) | Heatworks sussex LTD (@heatworkssussexltd) | https://www.instagram.com/heatworkssussexltd/ |
| lb.kompass.com | Kompass UK | no (title or snippet without the name, or not the business's own page) | Heatworks • Gas, water, plumbing, heating, ventilation and air ... | https://lb.kompass.com/c/heatworks/gb99134110/ |
| maps.apple.com | Apple Business Connect | no (title or snippet without the name, or not the business's own page) | St Peter's Surgery in Southampton, England | https://maps.apple.com/place?place-id=IECA77E9EBDD0C1C9 |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of Heat-ON Plumbing & Heating in Colchester | https://www.mybuilder.com/profile/heat-on-plumbing-heating |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of Heat Net in Southampton | https://www.mybuilder.com/profile/heat-net |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of Hayward Plumbing & Heating in Southampton | https://www.mybuilder.com/profile/hayward-plumbing-heating |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of Heatworks sussex LTD in Crawley | https://www.mybuilder.com/profile/heatworks-sussex-ltd |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of Homeheat South in Southampton | https://www.mybuilder.com/profile/homeheat_south |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Heatmaster Plumbing & Heating | https://www.mybuilder.com/profile/heatmaster_plumbing_heating |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of heatbox plumbing and heating in Mablethorpe | https://www.mybuilder.com/profile/heatbox-plumbing-and-heating |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of Heatwell Heating Ltd in Chichester | https://www.mybuilder.com/profile/heatwell_heating_ltd |
| nextdoor.co.uk | Nextdoor | no (title or snippet without the name, or not the business's own page) | Heatwell Heating Ltd - Chichester | https://nextdoor.co.uk/pages/heatwell-heating-ltd/ |
| nextdoor.co.uk | Nextdoor | no (title or snippet without the name, or not the business's own page) | St Peters Surgery Dr H J Boddington & Partners | https://nextdoor.co.uk/pages/st-peters-surgery-dr-h-j-boddington-partners-southampton-england/ |
| nextdoor.co.uk | Nextdoor | no (title or snippet without the name, or not the business's own page) | Stepwise Chiropody/Podiatry (Woolston) - Southampton, ... | https://nextdoor.co.uk/pages/stepwise-chiropodypodiatry-woolston-southampton-gb-eng/ |
| nursling.cylex-uk.co.uk | Cylex UK | no (title or snippet without the name, or not the business's own page) | ▷ P a C e Electrical Services Uk Ltd Southampton Nursling | https://nursling.cylex-uk.co.uk/company/p-a-c-e-electrical-services-uk-ltd-southampton-nursling-17996582.html |
| southampton.cylex-uk.co.uk | Cylex UK | no (title or snippet without the name, or not the business's own page) | Heat Matters, Southampton - Plumbers | https://southampton.cylex-uk.co.uk/company/heat-matters-17974066.html |
| southampton.cylex-uk.co.uk | Cylex UK | no (title or snippet without the name, or not the business's own page) | ▷ Flintstone Ltd - Tyres, Southampton | AI Review Summary | https://southampton.cylex-uk.co.uk/company/flintstone-ltd---tyres-13337897.html |
| trustatrader.com | TrustATrader | no (title or snippet without the name, or not the business's own page) | Heating & Gas - Commercial in Southampton In Southampton | https://www.trustatrader.com/heating-gas---commercial-in-southampton |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Heating & Home, Southampton | Boiler Service & Repair | https://www.yell.com/biz/heating-and-home-southampton-10322094/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Central Heating Services Near Me in Southampton | https://www.yell.com/s/central+heating+services-southampton.html |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Southampton Plumbing & Heating | https://www.yell.com/biz/southampton-plumbing-and-heating-southampton-10982095/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Southern Heating Services, Southampton | https://www.yell.com/biz/southern-heating-services-southampton-7584533/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Southern Gas Works, Southampton | Boiler Service & Repair | https://www.yell.com/biz/southern-gas-works-southampton-9079253/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | HeatComp Ltd, Southampton | Plumbers | https://www.yell.com/biz/heatcomp-ltd-southampton-7872657/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | E P Heating & Mechanical Services Ltd, Southampton | https://www.yell.com/biz/e-p-heating-and-mechanical-services-ltd-southampton-8365646/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Gasworks Ltd, Southampton | Gas Appliances Retail & ... | https://www.yell.com/biz/gasworks-ltd-southampton-3965043/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Bathworks, Southampton | Bathroom Fitters | https://www.yell.com/biz/bathworks-southampton-9710131/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Heat 27 Ltd, Waltham Cross | Gas Installers | https://www.yell.com/biz/heat-27-ltd-waltham-cross-7845128/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Heatwell Heating Ltd, Chichester | Gas Engineers | https://www.yell.com/biz/heatwell-heating-ltd-chichester-9991791/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Mobile Tyre Fitting Near Me in Woolston, Southampton | https://www.yell.com/s/mobile+tyre+fitting-woolston.html |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Living Well Partnership, Southampton | Doctors (medical ... | https://www.yell.com/biz/living-well-partnership-southampton-10034361/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Care Solutions Direct Ltd, Southampton | https://www.yell.com/biz/care-solutions-direct-ltd-southampton-10495321/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Pear Tree House, Southampton | Speech Therapists | https://www.yell.com/biz/pear-tree-house-southampton-7736439/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | G P Watson Ltd, Southampton | Electricians | https://www.yell.com/biz/g-p-watson-ltd-southampton-8756518/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Waterside Pat Testing Ltd | Electrical Inspecting & Testing | https://www.yell.com/biz/waterside-pat-testing-ltd-southampton-10681045/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Livewire Tyres Ltd, Southampton | https://www.yell.com/biz/livewire-tyres-ltd-southampton-9168797/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | A&E Flooring Solutions, Southampton | Carpet Fitters | https://www.yell.com/biz/aande-flooring-solutions-southampton-9045977/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Heatworks UK Ltd, Uxbridge | Central Heating Services | https://www.yell.com/biz/heatworks-uk-ltd-uxbridge-7241691/ |
| 192.com |  |  | Peartree Avenue, Southampton, SO19 7RA | https://www.192.com/places/so/so19-7/so19-7ra/ |
| 192.com |  |  | Heating Contractors in Hampshire - Business Directory | https://www.192.com/atoz/business/hampshire/heating--contractors/ |
| allhealthandcare.co.uk |  |  | THE RIVENDALE – NHS Hospital in SOUTHAMPTON | https://allhealthandcare.co.uk/providers/SO31-7ZT/the-rivendale-RW185 |
| allhealthandcare.co.uk |  |  | WEST VIEW/HOME FARM – NHS Hospital in ... | https://allhealthandcare.co.uk/providers/SO40-2RP/west-viewhome-farm-RW1Y8 |
| allhealthandcare.co.uk |  |  | BITTERNE FAMILY POINT – NHS Hospital in Southampton | https://allhealthandcare.co.uk/providers/SO18-5EF/bitterne-family-point-C1J2N |
| allhealthandcare.co.uk |  |  | APRIL HOUSE – NHS Hospital in Southampton | https://allhealthandcare.co.uk/providers/SO19-5ES/april-house-RW1FP |
| allhealthandcare.co.uk |  |  | SURE START SWAYTHLING - NHS hospital | https://allhealthandcare.co.uk/providers/SO16-3BZ/sure-start-swaythling-B7Q9V |
| allhealthandcare.co.uk |  |  | STONEHAM PRACTICE – NHS Hospital in Southampton | https://allhealthandcare.co.uk/providers/SO16-2JA/stoneham-practice-F9A9R |
| bj.maptons.com |  |  | Heatworks Plumbing and Heating, carte de localisation | https://bj.maptons.com/p/4627024474 |
| boiler.heatworksuk.com |  |  | Privacy Policy - Heatworks Heating & Cooling | https://boiler.heatworksuk.com/privacy-policy/ |
| care-home.org.uk |  |  | Peartree House | CareHome UK | https://care-home.org.uk/care-home/peartree-house-southampton-68f529 |
| care-home.org.uk |  |  | Peartree House | Home Care in Southampton - CareHome UK | https://care-home.org.uk/HomeCareProviderDetail?id=0a1ba3c2-93b6-4708-a8d2-114963620b61 |
| companycheck.co.uk |  |  | PIPEWORKS SOUTHAMPTON LTD | Company Summary | https://companycheck.co.uk/company/09682382/PIPEWORKS-SOUTHAMPTON-LTD |
| comparepharmacies.uk |  |  | Living Well Partnership GP surgery | https://comparepharmacies.uk/gp-surgeries/living-well-partnership-j82622 |
| comparepharmacies.uk |  |  | The Peartree Practice GP surgery | https://comparepharmacies.uk/gp-surgeries/the-peartree-practice-j82101 |
| convene2dr.ouch.ai |  |  | Peartree Dental Practice — NHS Dentist in Southampton | https://convene2dr.ouch.ai/dentists/practices/south-east/southampton/peartree-dental-practice |
| dashboard-development.ouch.ai |  |  | Peartree Dental Practice — NHS Dentist in Southampton | https://dashboard-development.ouch.ai/dentists/practices/south-east/southampton/peartree-dental-practice |
| dentalchoices.org |  |  | Peartree Dental Care, Southampton - NHS Dentist | https://dentalchoices.org/nhs-dentist/peartree-dental-practice/ |
| directory.leighjournal.co.uk |  |  | Heatworks Heating & Plumbing | https://directory.leighjournal.co.uk/company/AZh7Fyf7cAWPMFD_C7fKvg |
| directory.patient.info |  |  | Care services in Southampton, South East - Patient Directory | https://directory.patient.info/single-location/south-east/southampton |
| find-and-update.company-information.service.gov.uk |  |  | heatworks services limited - Companies House - GOV.UK | https://find-and-update.company-information.service.gov.uk/company/SC125746 |
| find-and-update.company-information.service.gov.uk |  |  | heat tech plumbing & heating ltd - Companies House - GOV.UK | https://find-and-update.company-information.service.gov.uk/company/06862021 |
| find-and-update.company-information.service.gov.uk |  |  | heatmaster plumbing & heating ltd - Companies House | https://find-and-update.company-information.service.gov.uk/company/09858326/more |
| find-and-update.company-information.service.gov.uk |  |  | WATERWORKS HEATING & PLUMBING LTD filing history | https://find-and-update.company-information.service.gov.uk/company/17123957/filing-history |
| find-and-update.company-information.service.gov.uk |  |  | gatwick heating & plumbing limited - Companies House | https://find-and-update.company-information.service.gov.uk/company/06703655/more |
| find-and-update.company-information.service.gov.uk |  |  | hot works plumbing & heating limited - Companies House | https://find-and-update.company-information.service.gov.uk/company/08332687/more |
| find-and-update.company-information.service.gov.uk |  |  | water works plumbing & heating specialists limited | https://find-and-update.company-information.service.gov.uk/company/05735295/more |
| find-and-update.company-information.service.gov.uk |  |  | heatworks solutions limited - Companies House | https://find-and-update.company-information.service.gov.uk/company/10095619 |
| find-and-update.company-information.service.gov.uk |  |  | waterworks plumbing and heating ltd - Companies House | https://find-and-update.company-information.service.gov.uk/company/13267410 |
| find-and-update.company-information.service.gov.uk |  |  | heat tech plumbing & gas ltd - Companies House - GOV.UK | https://find-and-update.company-information.service.gov.uk/company/11613779 |
| find-and-update.company-information.service.gov.uk |  |  | HEATSOURCE HEATING LTD overview - Companies House | https://find-and-update.company-information.service.gov.uk/company/11853589 |
| find-and-update.company-information.service.gov.uk |  |  | HEAT WORKS GROUP LIMITED people - Companies House | https://find-and-update.company-information.service.gov.uk/company/12597927/officers |
| find-and-update.company-information.service.gov.uk |  |  | heating air pipeworks (hap) ltd - Companies House | https://find-and-update.company-information.service.gov.uk/company/15267235 |
| find-and-update.company-information.service.gov.uk |  |  | heat works group limited - Companies House - GOV.UK | https://find-and-update.company-information.service.gov.uk/company/12597927/more |
| find-and-update.company-information.service.gov.uk |  |  | HEATINGWORKS LIMITED overview - Companies House | https://find-and-update.company-information.service.gov.uk/company/07559655 |
| findacarer.app |  |  | Peartree House - FindACarer | https://findacarer.app/p/peartree-house/ |
| ftp.motcentre.info |  |  | G T & P J Winkworth Southampton | https://ftp.motcentre.info/directory/hampshire/g-t-and-p-j-winkworth/ |
| fuel-checker.com |  |  | Woolston Auto Engineering Ltd - MOT Test Centres | https://www.fuel-checker.com/mot/woolston-auto-engineering-ltd-1akv47 |
| gardenerscentral.co.uk |  |  | Neil Boulter Tree & Hedge Care in Southampton SO16 8EJ | https://www.gardenerscentral.co.uk/gardener/1110589/neil-boulter-tree-and-hedge-care |
| gasworks.wheree.com |  |  | GASWORKS - Reviews, Photos & Phone Number (2026 ... | https://gasworks.wheree.com/ |
| gpfinder.uk |  |  | Living Well Partnership - GP Ratings & Reviews - GPFinder | https://www.gpfinder.uk/practice/J82622 |
| hampshirebased.co.uk |  |  | Heat Works Services in Southampton | Contact Details | https://hampshirebased.co.uk/business/heat-works-services-southampton-9923 |
| hamuch.com |  |  | Pipeworks - Plumbing - Heating Ltd | https://www.hamuch.com/1125890/pipeworks-plumbing-heating-ltd |
| healthgps.co.uk |  |  | Forestside Medical Practice, Southampton, Hampshire | https://healthgps.co.uk/gp/14844-forestside-medical-practice/ |
| heatworks.wheree.com |  |  | HEATWORKS - Reviews, Photos & Phone Number (2026 ... | https://heatworks.wheree.com/ |
| infobel.com |  |  | Living Well Partnership, Woolston, GB | Company Information | https://www.infobel.com/en/uk/living_well_partnership/woolston/GB107324398-40085317411/businessdetails.aspx |
| is.maptons.com |  |  | Heatworks Plumbing and Heating, Stane St, leita | https://is.maptons.com/p/4627024474 |
| jobintroducer.com |  |  | Heatparts Ltd | JobIntroducer – Free UK Business Directory | https://jobintroducer.com/directory/heatparts-ltd/ |
| ls.maptons.com |  |  | Heatworks, 42 E Ridge View, location on the map | https://ls.maptons.com/p/4917653536 |
| ls.maptons.com |  |  | The Waterworks Plumbing Supplies Limited, Unit G035 ... | https://ls.maptons.com/p/4599300618 |
| m.yelp.com |  |  | TOP 10 BEST Heater Repair in Southampton, United ... | https://m.yelp.com/search?find_desc=Heater+Repair&find_loc=Southampton%2C+STH |
| mapquest.com |  |  | Dr S Young - the Peartree Practice | https://www.mapquest.com/gb/hampshire/dr-s-young-the-peartree-practice-828420344 |
| mapquest.com |  |  | Peartree Road, Southampton, England | https://www.mapquest.com/gb/england/southampton/so19-7/peartree-road-50.90297,-1.3758 |
| mapquest.com |  |  | Dr P J Gray & Partners - SO18 6BT | https://www.mapquest.com/gb/hampshire/dr-p-j-gray-partners-828410943 |
| mapquest.com |  |  | 1 Peartree Road, Southampton, England | https://www.mapquest.com/gb/england/southampton/so19-7gu/1-peartree-road-50.90227,-1.37727 |
| mapquest.com |  |  | Bitterne C of E Infant School | https://www.mapquest.com/gb/hampshire/bitterne-c-of-e-infant-school-816177140 |
| mapquest.com |  |  | Peartree Gardens, Angel Crescent, Southampton, England, ... | https://www.mapquest.com/gb/england/peartree-gardens-797690126 |
| mapquest.com |  |  | Woolston Delicatesssn - Hampshire | https://www.mapquest.com/gb/hampshire/woolston-delicatesssn-828413513 |
| mapquest.com |  |  | We Care Together Southampton | https://www.mapquest.com/gb/england/we-care-together-southampton-506616831 |
| mapquest.com |  |  | 8a Peartree Avenue, Southampton, England, SO19 7JP | https://www.mapquest.com/gb/england/peartree-house-507366014 |
| mapquest.com |  |  | 169 Peartree Avenue, Southampton, England | https://www.mapquest.com/gb/england/southampton/so19-7ra/169-peartree-avenue-50.9111,-1.36688 |
| mapquest.com |  |  | 46 Peartree Avenue, Southampton, England | https://www.mapquest.com/gb/england/southampton/so19-7jp/46-peartree-avenue-50.90705,-1.37181 |
| mapquest.com |  |  | 98a South East Road, Southampton, England | https://www.mapquest.com/gb/england/southampton/so19-8jt/98a-south-east-road-50.90151,-1.3561 |
| mapquest.com |  |  | Peartree Avenue, Southampton, England | https://www.mapquest.com/gb/england/southampton/so18-1/peartree-avenue-50.9144,-1.36239 |
| mapquest.com |  |  | Pantene Healthcare Providers - SO14 6RL | https://www.mapquest.com/gb/city-of-southampton/pantene-healthcare-providers-828384155 |
| mapquest.com |  |  | Reach Social Enterprises - SO17 2NZ | https://www.mapquest.com/gb/england/reach-social-enterprises-816170208 |
| mapquest.com |  |  | Payne Marsh Stillwell - SO15 2EY | https://www.mapquest.com/gb/hampshire/payne-marsh-stillwell-828416858 |
| mapquest.com |  |  | Peartree Dental Care | https://www.mapquest.com/gb/england/peartree-dental-care-797763430 |
| mapquest.com |  |  | Newey & Eyre, Southampton, England, GB | https://www.mapquest.com/gb/england/newey-eyre-812828968 |
| mapquest.com |  |  | Heatworks Limited - EX39 4RS | https://www.mapquest.com/gb/england/heatworks-limited-816156653 |
| mapquest.com |  |  | Gasworks Limited, 299 Shirley Road, Southampton ... | https://www.mapquest.com/gb/england/gasworks-limited-797734886 |
| mobiletyrefit.uk |  |  | Flintstone Ltd - Tyres - Mobile Tyre Fit | https://mobiletyrefit.uk/mobile-tyre-fitters/united-kingdom/hampshire/southampton-1/flintstone-ltd-tyres/ |
| motremind.me |  |  | FLINTSTONE MOT • MOT Test Centres in Southampton | https://motremind.me/find-local-mot-test-centre/Hampshire/Southampton/5068BT-FLINTSTONE-MOT |
| mt.maptons.com |  |  | The Waterworks Plumbing and Gas Services, mappa post | https://mt.maptons.com/p/4756051249 |
| nichelocal.co.uk |  |  | GASWORKS Southampton in Southampton | https://www.nichelocal.co.uk/services/Southampton/Gas-Applainces/GASWORKS-Southampton-.html |
| openwide.clinic |  |  | Peartree Dental Care - Dentist in Southampton - OpenWide | https://www.openwide.clinic/practices/peartree-dental-care |
| peartree-dental-care-oradent-group.wheree.com |  |  | PEARTREE DENTAL CARE - ORADENT GROUP - Reviews ... | https://peartree-dental-care-oradent-group.wheree.com/ |
| pg.maptons.com |  |  | The Waterworks Plumbing Supplies Limited, Unit G035 ... | https://pg.maptons.com/p/4599300618 |
| plumberlist.co.uk |  |  | Heatworks (UK) - Find Plumbers UK | https://plumberlist.co.uk/places/uxbridge/plumbers/heatworks-uk/ |
| ratedtraders.com |  |  | Gasworks, Southampton | Heating Engineers - Rated Traders | https://www.ratedtraders.com/southampton/heating-engineers/gasworks |
| sd.maptons.com |  |  | Heatworks Plumbing and Heating, Stane St, خريطة الموقع | https://sd.maptons.com/p/4627024474 |
| southampton.co.uk |  |  | Gp Practices in Woolston - Doctors in Southampton | https://www.southampton.co.uk/doctors/woolston/ |
| southampton.ukintouch.com |  |  | Peartree Gardens Car Park - Southampton SO19 7BY, UK | https://southampton.ukintouch.com/parking/peartree-gardens-car-park/ |
| tapestr.yfs.co.uk |  |  | Heatworks Heating & Plumbing Ltd in Southampton - YFS | https://www.tapestr.yfs.co.uk/Services-for-Consumers/Home-and-Garden/Plumbers/Heatworks-Heating-&-Plumbing-Ltd-23278004 |
| tapestr.yfs.co.uk |  |  | Heatworks Heating & Plumbing Ltd | Your First Search - YFS | https://www.tapestr.yfs.co.uk/contact-company?l=23278004 |
| tellows.co.uk |  |  | 02380448168 - Peartree House Rehabilitation | https://www.tellows.co.uk/num/02380448168 |
| theuksponsorlist.com |  |  | PEARTREE HOUSE REHABILITATION LTD (Southampton) | https://theuksponsorlist.com/company/peartree-house-rehabilitation-ltd-southampton/ |
| tradehand.com |  |  | Best heating engineers near me in Southampton - Tradehand | https://tradehand.com/heating-engineers/uk/southampton |
| tradehand.com |  |  | Bathworks - Bathroom fitter in Southampton - Tradehand | https://tradehand.com/bathroom-fitters/uk/southampton/bathworks |
| tyrequote.com |  |  | badminstons fawley ltd southampton - Tyrequote.com | https://www.tyrequote.com/tyres-southampton/badminstons-fawley-ltd/ |
| tyrequote.com |  |  | badminston tyres southampton - Tyrequote.com | https://www.tyrequote.com/tyres-southampton/badminston-tyres/ |
| ukpodiatrists.co.uk |  |  | Stepwise Chiropody (Woolston) - Foot Health Specialist in ... | https://ukpodiatrists.co.uk/podiatrists/england/southampton/stepwise-chiropody-woolston |
| wastebook.co.uk |  |  | Heat Works LTD. - Wastebook | https://www.wastebook.co.uk/directory/heat-works-ltd/ |
| yably.co.uk |  |  | Reviews of Peartree Dental Practice Southampton | https://yably.co.uk/reviews/southampton/peartree-dental-practice-215-peartree-avenue |

SCAN done in 927s: 38 of 38 rows, 8 listed, 14 calls, $0.0605

| Directory | Tier | Listed | NAP | Confidence | Read by | Found by | URL | Note |
|---|---|---|---|---|---|---|---|---|
| Cylex UK | UK Core | yes | needs_review | low | search snippet | the name search ("Heatworks Heating & Plumbing" Southampton) | https://ockley.cylex-uk.co.uk/company/heatworks-plumbing-and-heating-27649528.html | NAP from snippet, low confidence |
| FreeIndex | UK Core | yes | needs_review | medium | DataForSEO content parsing | a backlink to the client's site | https://www.freeindex.co.uk/profile(heatworks-heating-plumbing-ltd)_56421.htm | only the name was found on the page |
| Trustpilot | UK Core | yes | needs_review | high | search snippet | the name search ("Heatworks Heating & Plumbing" Southampton) | https://www.trustpilot.com/review/www.heatworksuk.com?page=2 | NAP from snippet, the phone number is in it |
| Yell | UK Core | yes | mismatch (address: The Forbury, Reading, Berkshire RG1 3EU vs 39 Longmore Avenue, Woolston, Southampton SO19 9GA) | medium | DataForSEO content parsing | a backlink to the client's site | https://www.yell.com/s/boiler+replacements-southampton.html | only the name was found on the page |
| Instagram | UK Core | yes | needs_review | low | search snippet | the name search ("Heatworks Heating & Plumbing" Southampton) | https://www.instagram.com/heatworksplumbing/ | NAP from snippet, low confidence |
| Bizify | UK Secondary | yes | mismatch (address: Unit 18 Riverside House, High Force Road, North Yorkshire TS2 1RH vs 39 Longmore Avenue, Woolston, Southampton SO19 9GA) | medium | DataForSEO content parsing | a backlink to the client's site | https://www.bizify.co.uk/recent-updates/business-of-the-month-heatworks-uk | only the name was found on the page |
| Fyple UK | UK Secondary | yes | match | high | DataForSEO content parsing | a backlink to the client's site | https://www.fyple.co.uk/company/heatworks-heating-and-plumbing-ltd-reux478/ |  |
| Checkatrade | Trade / niche | yes | needs_review | low | none | a backlink to the client's site | https://www.checkatrade.com/trades/heatworksheatinglimited | the listing page could not be read through DataForSEO (HTTP ?) |
Not found (30): Apple Business Connect, Bing Places, Facebook, Foursquare, Hotfrog UK, Scoot, Thomson Local, Yelp UK, HERE, LinkedIn, TomTom, Bark, Brownbook, Evening Standard Local, Nextdoor, 2FindLocal UK, City Local, Kompass UK, Opendi UK, Yalwa UK, Gas Safe Register, WaterSafe, CIPHE (Chartered Institute of Plumbing and Heating Engineering), MyBuilder, OFTEC, TrustATrader, Which? Trusted Traders, APHC (Association of Plumbing and Heating Contractors), MyJobQuote, TrustMark
Read by: {"search snippet":3,"DataForSEO content parsing":4,"none":1}
Also listed on sites not in the database (19): jobintroducer.com <https://jobintroducer.com/directory/heatworks-heating-limited-central-heating-service-southampton/>; yelp.com <https://www.yelp.com/search?cflt=hvac&find_loc=92-93+East+Street%2C+Southampton+SO14+3HP>; yfs.co.uk <https://www.tapestr.yfs.co.uk/Services-for-Consumers/Home-and-Garden/Plumbers/Heatworks-Heating-&-Plumbing-Ltd-23278004>; zoominfo.com <https://www.zoominfo.com/c/heatworks-ltd/357555070>; wastebook.co.uk <https://www.wastebook.co.uk/directory/heatworks-heating-plumbing-ltd/>; plumbercentral.co.uk <https://www.plumbercentral.co.uk/plumber/474847/heatworks-heating-and-plumbing-ltd>; wegetyoufound.co.uk <https://www.wegetyoufound.co.uk/listings/heatworks-heating-plumbing-ltd/southampton/heating-contractor>; trustindex.io <https://www.trustindex.io/reviews/heatworksuk.com>; touchsouthampton.com <https://www.touchsouthampton.com/business/heatworks-heating-and-plumbing-ltd/17175980>; b99.co.uk <https://b99.co.uk/heating-contractors/southampton/heatworks-heating-and-plumbing-ltd/>; essexlive.news <https://directory.essexlive.news/search/lymington/central-heating-installation-and-servicing>; industryoversight.co.uk <https://industryoversight.co.uk/plumbing-contractors/southampton-eng/>; misterwhat.co.uk <https://www.misterwhat.co.uk/south-east-england/hampshire/1250_southampton/plumbing>; local-quotes.co.uk <https://www.local-quotes.co.uk/boiler/west-sussex>; cybo.com <https://biashara.cybo.com/GB/southampton/inapokanzwa-ufungaji-na-kukarabati>; andoverpages.co.uk <https://directory.andoverpages.co.uk/search/lee-on-the-solent/central-heating-installation-and-servicing>; experts-exchange.com <https://www.experts-exchange.com/questions/27744109/Regular-Expression-Match-x-but-not-y-or-z.html>; houzz.com <https://www.houzz.com/professionals/plumbing-contractors/poole-dor-gb-probr0-bo~t_11817~r_100377908?fi=60>; contractorgateway.com <https://www.contractorgateway.com/england/southampton>

DataForSEO spent: $0.0803 (discovery $0.0180 + scan $0.0605 logged)
```

---

# Run 2 (before the list page rule)

```
TEST SCAN (nothing saved): "Heatworks Heating & Plumbing", Southampton, phone 023 8044 5123, site https://heatworksuk.com, address 39 Longmore Ave, Woolston, Southampton SO19 9GA; niche plumbing-heating
NAP: {"name":"Heatworks Heating & Plumbing","address":"39 Longmore Avenue, Woolston, Southampton SO19 9GA","service_areas":null,"phone":"02380 445123","website":"https://heatworksuk.com","website_source":"live domain","email":"","hours":""}
  UK Core: 16 rows
  UK Secondary: 11 rows
  Location: 0 rows (approve the locations first)
  Trade / niche: 11 rows

DISCOVERY in 908s, $0.0174: ""Heatworks Heating & Plumbing" Southampton" and ""Heatworks Heating & Plumbing"" and ""023 8044 5123"" and ""02380445123"" and ""Heatworks Heating & Plumbing" SO19 9GA"; errors: "023 8044 5123": not ready within 15 minutes
105 distinct results. In the database: 49 (accepted 7, rejected 42); not in the database: 56

| Site | Directory | Accepted | Title | URL |
|---|---|---|---|---|
| bark.com | Bark | yes | Find a Boiler Engineer in Southampton | https://www.bark.com/en/gb/boiler-installation/hampshire/southampton/ |
| chatteris.cylex-uk.co.uk | Cylex UK | no (title or snippet without the name, or not the business's own page) | ▷ Heatworks | Plumbers, Chatteris | AI Review Summary | https://chatteris.cylex-uk.co.uk/company/heatworks-26821878.html |
| checkatrade.com | Checkatrade | no (title or snippet without the name, or not the business's own page) | Heat Tech Mechanical & Heating | Plumber | Portsmouth | https://www.checkatrade.com/trades/southseaplumbingandheatingspecialists |
| eaton-socon.cylex-uk.co.uk | Cylex UK | no (title or snippet without the name, or not the business's own page) | Pipeworks Heating & Plumbing, Eaton Socon | https://eaton-socon.cylex-uk.co.uk/company/pipeworks-heating---plumbing-27362327.html |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heating and Cooling Services Southampton | https://www.facebook.com/fb-answers/heating-and-cooling-services-southampton/?locale=ka_GE |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | FOR ALL YOUR HEATING NEEDS! ... | https://www.facebook.com/gasworkssouthampton/posts/-for-all-your-heating-needs-looking-to-keep-your-home-warm-cosy-running-efficien/1622179853252851/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heatworks UK Ltd (@heatworksukltd) | https://www.facebook.com/heatworksukltd/?locale=en_GB |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heatworks Services (@HeatworksServices) | https://www.facebook.com/HeatworksServices/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | It's not just about the quality of our work, we really are the ... | https://www.facebook.com/swplumbingdevon/posts/its-not-just-about-the-quality-of-our-work-we-really-are-the-professional-team-y/1661288888807021/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heating Engineers in Southampton: Recommendations ... | https://www.facebook.com/fb-answers/heating-engineers-in-southampton/?locale=it_IT |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heatworks UK Ltd updated their cover photo. | https://www.facebook.com/heatworksukltd/photos/465147032292114/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heat Hampshire (@heathampshire) | https://www.facebook.com/heathampshire/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | KEEPING SOUTHAMPTON WARM FOR OVER 50 YEARS ... | https://www.facebook.com/gasworkssouthampton/posts/-keeping-southampton-warm-for-over-50-years-is-your-boiler-due-a-service-when-it/1644150494389120/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heat My Home is your local plumbing and heating experts ... | https://www.facebook.com/tadleyroundabout/posts/heat-my-home-is-your-local-plumbing-and-heating-experts-providing-top-quality-pl/908384624662943/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Topheatworks LTD: Plumbing & Heating (@topheatworksltd) | https://www.facebook.com/topheatworksltd/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Plumbing and heating services continue during UK heatwave | https://www.facebook.com/groups/1564286387069899/posts/3631734060325111/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heatworks - Home | https://www.facebook.com/1585390731752564/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | HVAC Companies in Southampton | https://www.facebook.com/fb-answers/hvac-companies-in-southampton/ |
| facebook.com | Facebook | no (title or snippet without the name, or not the business's own page) | Heating Works (@heatingworksltd) | https://www.facebook.com/heatingworksltd/?locale=et_EE |
| freeindex.co.uk | FreeIndex | yes | Southampton Central Heating Companies | 280 Reviews | https://www.freeindex.co.uk/southampton-central_heating_services.htm |
| gassaferegister.co.uk | Gas Safe Register | yes | Check a Business or Engineer | https://www.gassaferegister.co.uk/CheckBusiness?bid=Gn%252flOD9HQz3WZbGIbyq7KQ%253d%253d&cp=D81uIcdcww4vwX5FJR7%252bw%252fsOf17e4l7wa7mXhigYUw8%253d |
| gassaferegister.co.uk | Gas Safe Register | yes | Find & Check Gas Safe Engineers | https://www.gassaferegister.co.uk/findbusinessresults?ep=1xPOGK1AdTeDy4hfLti5PzdUibxO%252bY1Sgiuj9JKmP5W3obreSDyuXiOj9U4foO3vwY8TlRsnQslkD7ylqP8LYPac%252fZE0oLL%252bXfgWcT0FGN21qUK2YDabo%252f73G74%252bZNVxV3HC%252b5m%252bGOIZ69zybP%252baMg%253d%253d&Page=3 |
| instagram.com | Instagram | yes | Heatworks Plumbing and Heating (@heatworksplumbing) | https://www.instagram.com/heatworksplumbing/ |
| instagram.com | Instagram | no (title or snippet without the name, or not the business's own page) | Heatworks sussex LTD (@heatworkssussexltd) | https://www.instagram.com/heatworkssussexltd/ |
| instagram.com | Instagram | no (title or snippet without the name, or not the business's own page) | A typical day for a Heatworks Heating engineer starts early ... | https://www.instagram.com/reel/De9NwIRDHhu/ |
| lb.kompass.com | Kompass UK | no (title or snippet without the name, or not the business's own page) | Heatworks • Gas, water, plumbing, heating, ventilation and air ... | https://lb.kompass.com/c/heatworks/gb99134110/ |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of Heat-ON Plumbing & Heating in Colchester | https://www.mybuilder.com/profile/heat-on-plumbing-heating |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of Heat Net in Southampton | https://www.mybuilder.com/profile/heat-net |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of Hayward Plumbing & Heating in Southampton | https://www.mybuilder.com/profile/hayward-plumbing-heating |
| mybuilder.com | MyBuilder | yes | Plumbers in Newport, Isle Of Wight | https://www.mybuilder.com/plumbing/plumber-tradespeople/newport-isle-of-wight?page=11 |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Heatmaster Plumbing & Heating | https://www.mybuilder.com/profile/heatmaster_plumbing_heating |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of heatbox plumbing and heating in Mablethorpe | https://www.mybuilder.com/profile/heatbox-plumbing-and-heating |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of Heatwell Heating Ltd in Chichester | https://www.mybuilder.com/profile/heatwell_heating_ltd |
| mybuilder.com | MyBuilder | no (title or snippet without the name, or not the business's own page) | Profile of Heatworks sussex LTD in Crawley | https://www.mybuilder.com/profile/heatworks-sussex-ltd |
| nextdoor.co.uk | Nextdoor | no (title or snippet without the name, or not the business's own page) | Heatwell Heating Ltd - Chichester | https://nextdoor.co.uk/pages/heatwell-heating-ltd/ |
| southampton.cylex-uk.co.uk | Cylex UK | no (title or snippet without the name, or not the business's own page) | Heat Matters, Southampton - Plumbers | https://southampton.cylex-uk.co.uk/company/heat-matters-17974066.html |
| trustatrader.com | TrustATrader | no (title or snippet without the name, or not the business's own page) | Find the most trusted local Heating Engineers in Hampshire | https://www.trustatrader.com/heating-engineer-in-hampshire |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Heating Engineers Near Me in Southampton | https://www.yell.com/s/heating+engineers-southampton.html |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Central Heating Services Near Me in Southampton | https://www.yell.com/s/central+heating+services-southampton.html |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Southampton Plumbing & Heating | https://www.yell.com/biz/southampton-plumbing-and-heating-southampton-10982095/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Southern Heating Services, Southampton | https://www.yell.com/biz/southern-heating-services-southampton-7584533/ |
| yell.com | Yell | yes | Gas Engineers Near Me in Woolston, Southampton | https://www.yell.com/s/gas+engineers-woolston.html |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Bathworks, Southampton | Bathroom Fitters | https://www.yell.com/biz/bathworks-southampton-9710131/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Heat 27 Ltd, Waltham Cross | Gas Installers | https://www.yell.com/biz/heat-27-ltd-waltham-cross-7845128/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Heatwell Heating Ltd, Chichester | Gas Engineers | https://www.yell.com/biz/heatwell-heating-ltd-chichester-9991791/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | HeatComp Ltd, Southampton | Plumbers | https://www.yell.com/biz/heatcomp-ltd-southampton-7872657/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Heatworks UK Ltd, Uxbridge | Central Heating Services | https://www.yell.com/biz/heatworks-uk-ltd-uxbridge-7241691/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Southern Gas Works, Southampton | Boiler Service & Repair | https://www.yell.com/biz/southern-gas-works-southampton-9079253/ |
| yell.com | Yell | no (title or snippet without the name, or not the business's own page) | Gasworks Ltd, Southampton | Gas Appliances Retail & ... | https://www.yell.com/biz/gasworks-ltd-southampton-3965043/ |
| 192.com |  |  | Heating Contractors in Hampshire - Business Directory | https://www.192.com/atoz/business/hampshire/heating--contractors/ |
| about.me |  |  | Heatworks Heating & Plumbing Ltd | https://about.me/heatworksuk |
| bj.maptons.com |  |  | Heatworks Plumbing and Heating, carte de localisation | https://bj.maptons.com/p/4627024474 |
| boiler.heatworksuk.com |  |  | Privacy Policy - Heatworks Heating & Cooling | https://boiler.heatworksuk.com/privacy-policy/ |
| citiservi.co.uk |  |  | Engineering Services in Southampton (Hampshire) | https://www.citiservi.co.uk/info/engineering-services-in-southampton |
| companycheck.co.uk |  |  | PIPEWORKS SOUTHAMPTON LTD | Company Summary | https://companycheck.co.uk/company/09682382/PIPEWORKS-SOUTHAMPTON-LTD |
| d1tk2nu1pewcyb.cloudfront.net |  |  | (+39-032047590###), Outbound Call Center Agent - Naples | https://d1tk2nu1pewcyb.cloudfront.net/?228395 |
| d2yfntmfgleiip.cloudfront.net |  |  | Untitled | https://d2yfntmfgleiip.cloudfront.net/efficient-campbell-urban-planning-core/ |
| directory.essexlive.news |  |  | Central Heating Installation And Servicing in Lymington | https://directory.essexlive.news/search/lymington/central-heating-installation-and-servicing |
| directory.gloucestershirelive.co.uk |  |  | Plumbing And Heating Merchants in Basingstoke | https://directory.gloucestershirelive.co.uk/search/basingstoke/plumbing-and-heating-merchants |
| directory.leighjournal.co.uk |  |  | Heatworks Heating & Plumbing | https://directory.leighjournal.co.uk/company/AZh7Fyf7cAWPMFD_C7fKvg |
| experts-exchange.com |  |  | Solved: Regular Expression (Match x, but not y or z) | https://www.experts-exchange.com/questions/27744109/Regular-Expression-Match-x-but-not-y-or-z.html |
| find-and-update.company-information.service.gov.uk |  |  | heatworks services limited - Companies House - GOV.UK | https://find-and-update.company-information.service.gov.uk/company/SC125746 |
| find-and-update.company-information.service.gov.uk |  |  | heat tech plumbing & heating ltd - Companies House - GOV.UK | https://find-and-update.company-information.service.gov.uk/company/06862021 |
| find-and-update.company-information.service.gov.uk |  |  | heatmaster plumbing & heating ltd - Companies House | https://find-and-update.company-information.service.gov.uk/company/09858326/more |
| find-and-update.company-information.service.gov.uk |  |  | hot works plumbing & heating limited - Companies House | https://find-and-update.company-information.service.gov.uk/company/08332687/more |
| find-and-update.company-information.service.gov.uk |  |  | gatwick heating & plumbing limited - Companies House | https://find-and-update.company-information.service.gov.uk/company/06703655/more |
| find-and-update.company-information.service.gov.uk |  |  | water works plumbing & heating specialists limited | https://find-and-update.company-information.service.gov.uk/company/05735295/more |
| find-and-update.company-information.service.gov.uk |  |  | waterworks plumbing and heating ltd - Companies House | https://find-and-update.company-information.service.gov.uk/company/13267410 |
| find-and-update.company-information.service.gov.uk |  |  | HEATSOURCE HEATING LTD overview - Companies House | https://find-and-update.company-information.service.gov.uk/company/11853589 |
| find-and-update.company-information.service.gov.uk |  |  | pipeworks heating and plumbing ltd - Companies House | https://find-and-update.company-information.service.gov.uk/company/08256359/more |
| find-and-update.company-information.service.gov.uk |  |  | heating air pipeworks (hap) ltd - Companies House | https://find-and-update.company-information.service.gov.uk/company/15267235 |
| find-and-update.company-information.service.gov.uk |  |  | HEAT SOURCE HEATING & PLUMBING LTD filing history | https://find-and-update.company-information.service.gov.uk/company/11504332/filing-history |
| find-and-update.company-information.service.gov.uk |  |  | WATERWORKS HEATING & PLUMBING LTD filing history | https://find-and-update.company-information.service.gov.uk/company/17123957/filing-history |
| find-and-update.company-information.service.gov.uk |  |  | heatworks solutions limited - Companies House | https://find-and-update.company-information.service.gov.uk/company/10095619 |
| find-and-update.company-information.service.gov.uk |  |  | heat tech plumbing & gas ltd - Companies House - GOV.UK | https://find-and-update.company-information.service.gov.uk/company/11613779 |
| find-and-update.company-information.service.gov.uk |  |  | HEAT WORKS GROUP LIMITED people - Companies House | https://find-and-update.company-information.service.gov.uk/company/12597927/officers |
| find-and-update.company-information.service.gov.uk |  |  | heat works group limited - Companies House - GOV.UK | https://find-and-update.company-information.service.gov.uk/company/12597927/more |
| find-and-update.company-information.service.gov.uk |  |  | HEATINGWORKS LIMITED overview - Companies House | https://find-and-update.company-information.service.gov.uk/company/07559655 |
| gasworks.wheree.com |  |  | GASWORKS - Reviews, Photos & Phone Number (2026 ... | https://gasworks.wheree.com/ |
| hampshirebased.co.uk |  |  | Heat Works Services in Southampton | Contact Details | https://hampshirebased.co.uk/business/heat-works-services-southampton-9923 |
| hamuch.com |  |  | Pipeworks - Plumbing - Heating Ltd | https://www.hamuch.com/1125890/pipeworks-plumbing-heating-ltd |
| heatworks.wheree.com |  |  | HEATWORKS - Reviews, Photos & Phone Number (2026 ... | https://heatworks.wheree.com/ |
| is.maptons.com |  |  | Heatworks Plumbing and Heating, Stane St, leita | https://is.maptons.com/p/4627024474 |
| jobintroducer.com |  |  | Central Heating Service Southampton - JobIntroducer | https://jobintroducer.com/directory/heatworks-heating-limited-central-heating-service-southampton/ |
| jobintroducer.com |  |  | Heatparts Ltd | JobIntroducer – Free UK Business Directory | https://jobintroducer.com/directory/heatparts-ltd/ |
| ls.maptons.com |  |  | The Waterworks Plumbing Supplies Limited, Unit G035 ... | https://ls.maptons.com/p/4599300618 |
| m.yelp.com |  |  | TOP 10 BEST Heater Repair in Southampton, United ... | https://m.yelp.com/search?find_desc=Heater+Repair&find_loc=Southampton%2C+STH |
| mapquest.com |  |  | Heatworks Limited - EX39 4RS | https://www.mapquest.com/gb/england/heatworks-limited-816156653 |
| mapquest.com |  |  | Gasworks Limited, 299 Shirley Road, Southampton ... | https://www.mapquest.com/gb/england/gasworks-limited-797734886 |
| mt.maptons.com |  |  | The Waterworks Plumbing and Gas Services, mappa post | https://mt.maptons.com/p/4756051249 |
| nichelocal.co.uk |  |  | GASWORKS Southampton in Southampton | https://www.nichelocal.co.uk/services/Southampton/Gas-Applainces/GASWORKS-Southampton-.html |
| pg.maptons.com |  |  | The Waterworks Plumbing Supplies Limited, Unit G035 ... | https://pg.maptons.com/p/4599300618 |
| plumbercentral.co.uk |  |  | McManus Ltd in Southampton SO19 8LX | https://www.plumbercentral.co.uk/plumber/204301/mcmanus-ltd |
| plumberlist.co.uk |  |  | Heatworks (UK) - Find Plumbers UK | https://plumberlist.co.uk/places/uxbridge/plumbers/heatworks-uk/ |
| plumbersworldwide.com |  |  | Heatworks Heating & Plumbing Ltd - Plumbers Southampton in ... | https://www.plumbersworldwide.com/company/81840-heatworks-heating-plumbing-ltd-plumbers-southampton |
| pmpplumbing.co.uk |  |  | heatworks london ltd | Greater London, England | https://pmpplumbing.co.uk/company/heatworks-london-ltd/ |
| ratedtraders.com |  |  | Gasworks, Southampton | Heating Engineers - Rated Traders | https://www.ratedtraders.com/southampton/heating-engineers/gasworks |
| sd.maptons.com |  |  | Heatworks Plumbing and Heating, Stane St, خريطة الموقع | https://sd.maptons.com/p/4627024474 |
| tapestr.yfs.co.uk |  |  | Heatworks Heating & Plumbing Ltd | Your First Search - YFS | https://www.tapestr.yfs.co.uk/contact-company?l=23278004 |
| tapestr.yfs.co.uk |  |  | Heatworks Heating & Plumbing Ltd in Southampton - YFS | https://www.tapestr.yfs.co.uk/Services-for-Consumers/Home-and-Garden/Plumbers/Heatworks-Heating-&-Plumbing-Ltd-23278004 |
| touchsouthampton.com |  |  | Heatworks Heating & Plumbing Ltd, Plumbers Merchants In ... | https://www.touchsouthampton.com/business/heatworks-heating-and-plumbing-ltd/17175980 |
| tradehand.com |  |  | Best heating engineers near me in Southampton - Tradehand | https://tradehand.com/heating-engineers/uk/southampton |
| tradehand.com |  |  | Bathworks - Bathroom fitter in Southampton - Tradehand | https://tradehand.com/bathroom-fitters/uk/southampton/bathworks |
| ukbusinessadvertiser.co.uk |  |  | Contact Heatworks Heating & Plumbing Ltd ... | https://ukbusinessadvertiser.co.uk/england/southampton/business/heatworks-heating-plumbing-ltd/connect |
| wastebook.co.uk |  |  | Heat Works LTD. - Wastebook | https://www.wastebook.co.uk/directory/heat-works-ltd/ |

SCAN done in 647s: 38 of 38 rows, 7 listed, 14 calls, $0.0569

| Directory | Tier | Listed | NAP | Confidence | Read by | Found by | URL | Note |
|---|---|---|---|---|---|---|---|---|
| Cylex UK | UK Core | yes | needs_review | low | search snippet | the name search ("Heatworks Heating & Plumbing" SO19 9GA) | https://ockley.cylex-uk.co.uk/company/heatworks-plumbing-and-heating-27649528.html | NAP from snippet, low confidence |
| FreeIndex | UK Core | yes | needs_review | medium | DataForSEO content parsing | a backlink to the client's site | https://www.freeindex.co.uk/profile(heatworks-heating-plumbing-ltd)_56421.htm | only the name was found on the page |
| Yell | UK Core | yes | mismatch (address: The Forbury, Reading, Berkshire RG1 3EU vs 39 Longmore Avenue, Woolston, Southampton SO19 9GA) | medium | DataForSEO content parsing | a backlink to the client's site | https://www.yell.com/s/boiler+replacements-southampton.html | only the name was found on the page |
| Instagram | UK Core | unchecked | needs_review | low | DataForSEO content parsing | the name search ("Heatworks Heating & Plumbing" Southampton) | https://www.instagram.com/heatworksplumbing/ | neither the name nor the phone is on the page: check by hand |
| Bizify | UK Secondary | yes | needs_review | low | none | a backlink to the client's site | https://www.bizify.co.uk/recent-updates/business-of-the-month-heatworks-uk | the listing page could not be read through DataForSEO (HTTP ?) |
| Fyple UK | UK Secondary | yes | match | high | DataForSEO content parsing | a backlink to the client's site | https://www.fyple.co.uk/company/heatworks-heating-and-plumbing-ltd-reux478/ |  |
| Checkatrade | Trade / niche | yes | needs_review | low | none | a backlink to the client's site | https://www.checkatrade.com/trades/heatworksheatinglimited | the listing page could not be read through DataForSEO (HTTP ?) |
| Gas Safe Register | Trade / niche | yes | mismatch (name: Check a Business or Engineer vs Heatworks Heating & Plumbing) | high | search snippet | the name search ("02380445123") | https://www.gassaferegister.co.uk/CheckBusiness?bid=Gn%252flOD9HQz3WZbGIbyq7KQ%253d%253d&cp=D81uIcdcww4vwX5FJR7%252bw%252fsOf17e4l7wa7mXhigYUw8%253d | NAP from snippet, the phone number is in it |
Not found (30): Apple Business Connect, Bing Places, Facebook, Foursquare, Hotfrog UK, Scoot, Thomson Local, Trustpilot, Yelp UK, HERE, LinkedIn, TomTom, Bark, Brownbook, Evening Standard Local, Nextdoor, 2FindLocal UK, City Local, Kompass UK, Opendi UK, Yalwa UK, WaterSafe, CIPHE (Chartered Institute of Plumbing and Heating Engineering), MyBuilder, OFTEC, TrustATrader, Which? Trusted Traders, APHC (Association of Plumbing and Heating Contractors), MyJobQuote, TrustMark
Read by: {"search snippet":2,"DataForSEO content parsing":4,"none":2}
Also listed on sites not in the database (8): yfs.co.uk <https://www.tapestr.yfs.co.uk/Services-for-Consumers/Home-and-Garden/Plumbers/Heatworks-Heating-&-Plumbing-Ltd-23278004>; yelp.com <https://m.yelp.com/search?find_desc=Heater+Repair&find_loc=Southampton%2C+STH>; leighjournal.co.uk <https://directory.leighjournal.co.uk/company/AZh7Fyf7cAWPMFD_C7fKvg>; touchsouthampton.com <https://www.touchsouthampton.com/business/heatworks-heating-and-plumbing-ltd/17175980>; citiservi.co.uk <https://www.citiservi.co.uk/info/engineering-services-in-southampton>; experts-exchange.com <https://www.experts-exchange.com/questions/27744109/Regular-Expression-Match-x-but-not-y-or-z.html>; cloudfront.net <https://d2yfntmfgleiip.cloudfront.net/efficient-campbell-urban-planning-core/>; cybo.com <https://tr.cybo.com/GB/southampton/is%C4%B1tma-montaj%C4%B1-ve-tamiri>

DataForSEO spent: $0.1293 (discovery $0.0174 + scan $0.0569 logged)
```
