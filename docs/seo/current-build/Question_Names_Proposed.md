# Proposed question_name per page target

Date: 4 Nov 2026. Source: every `niche-library/<stem>.csv` (28 libraries, the `-categories.csv` files skipped), every distinct `target` of a row whose verdict is `page`. Proposal only: nothing in the libraries has been changed.

A service page's questions name the service ("How much does [SERVICE] cost in Southampton?", "Is [SERVICE] right for your home?", "How long does [SERVICE] take?", "Do you guarantee your [SERVICE] work?"). Today `service-decisions.js singularQuestionName` fills [SERVICE] from the page name: a plain plural becomes a singular with its article ("Patios" to "a patio", "Roof repairs" to "a roof repair"); a name with "and" or "&", or one whose last word is not a plain plural, is used as it is. The library's `question_name` column overrides that wherever it is filled. This document proposes the column's value for every target where the code's rule does not already read right.

## Summary

- 477 page targets across the 28 libraries (a target that appears in two libraries, such as Patios or Composite decking, is counted once per library).
- 93 need a question_name. 384 are left blank: the code's form is already right.
- 148 targets contain "and". 69 of them need a question_name; 79 do not.
- Of the 93: 69 are "and" names, 24 are not. 8 of the 24 are filled only to keep an acronym's capitals (see the third pattern).

Patterns:

1. Names ending in an uncountable job word need nothing: cleaning, washing, fencing, flooring, roofing, tiling, training, grooming, boarding, control, treatment, removal, installation, servicing, testing, proofing, surfacing, design, care. Cleaning, Pressure washing, Window cleaning and Dog training need nothing or almost nothing. "How much does end of tenancy cleaning cost in Southampton?" is right as it is.
2. "X and Y" names split two ways. When both parts are uncountable ("Painting and decorating", "Tile and grout cleaning", "Leak detection and repair") the phrase is a single mass noun and "does" agrees with it: no question_name. When either part is a countable plural ("Curtain tracks and poles", "Sockets and switches", "Chimney repairs and repointing") the code leaves the plural and the question reads "How much does curtain tracks and poles cost": a question_name is needed, and the natural one is "a X or Y" ("a curtain track or pole") or the one part the customer is really asking about ("a chimney repair", "underpinning", "metal fencing").
3. The code lower cases the whole name before it decides, so an acronym loses its capitals in every question: "How much does pat testing cost", "a cctv drain survey", "epdm rubber roofing". Eight targets are filled only for that reason (CCTV drain surveys, EV charger installation, PAT testing, CCTV installation, LVT flooring, Commercial HVAC, EPDM rubber roofing, GRP fibreglass roofing) and six more that needed a name anyway keep their capitals in it (Laminate and LVT flooring, EICR, Solar PV, MVHR, British Standard, uPVC). If the code stopped lower casing acronyms those eight could be left blank.
4. A countable singular with no plural s gets no article from the code: "does full groom cost", "does pet taxi cost", "does wedding dog chaperone cost". Four targets.
5. A trade person as a page name ("Emergency electrician", "Emergency locksmith", "Auto locksmith", "Emergency plumber and heating engineer") is not a job: the natural question name is the call out ("an emergency electrician call out").
6. A plural whose single item is never the job ("Garden steps", "Plantation shutters", "Made to measure curtains", "Fascias and soffits", "Bargeboards", "Carpet tiles") takes "a set of", "a pair of", or the job word ("a fascia and soffit replacement").
7. Two code slips worth knowing: "Utility rooms" becomes "an utility room" (the article test is by letter, not sound) and "Tree root removal from drains" becomes "a tree root removal from drain" (the last word is singularised whatever it is). "Roof window installation (Velux)" carries its brackets and brand into the question.

Template observations, not name problems (no question_name fixes them):

- "Do you guarantee your [SERVICE] work?" reads "your a patio work" with any article form, and "your commercial building work work" with a name that already ends in work. That question (and "Are you insured for [SERVICE]?", "What does your [SERVICE] service include?") wants the plain lower case name, not the question form. Worth a separate placeholder.
- "Is [SERVICE] right for your home?" reads oddly on a problem named page ("Is a blocked toilet right for your home?", "Is a burst or leaking pipe right for your home?") whatever the name says.
- "How long does [SERVICE] take?" is odd for a thing rather than a job ("How long does a sewage pump take?", "How long does firewood take?").

Capitals: the proposed names are written as they should appear mid sentence (lower case apart from acronyms and proper names). The "Code's form today" column shows exactly what the code produces, lower case included.

## Per niche counts

| Niche | Page targets | Need a question_name |
|---|---|---|
| Blinds and curtains | 18 | 9 |
| Builder | 52 | 9 |
| Cleaning | 26 | 1 |
| Dog grooming | 9 | 2 |
| Dog training | 16 | 0 |
| Drainage | 25 | 3 |
| Driveways | 12 | 2 |
| Electrician | 25 | 10 |
| Fencing | 21 | 3 |
| Flooring | 11 | 4 |
| Garage doors | 13 | 4 |
| Guttering | 6 | 2 |
| HVAC | 13 | 2 |
| Kitchen and bathroom | 6 | 3 |
| Landscaper | 30 | 3 |
| Locksmith | 13 | 6 |
| Loft conversions | 10 | 2 |
| Painters and decorators | 13 | 3 |
| Pest control | 22 | 1 |
| Pet care | 13 | 2 |
| Plumbing and heating | 27 | 6 |
| Pressure washing | 9 | 0 |
| Removals | 11 | 3 |
| Roofer | 29 | 7 |
| Scaffolding | 19 | 2 |
| Tiling | 12 | 2 |
| Tree surgeon | 11 | 2 |
| Window cleaning | 5 | 0 |
| **All** | **477** | **93** |

## Blinds and curtains (blinds-curtains.csv): 18 page targets, 9 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Blind repairs | a blind repair |  | Plural; the code's singular reads fine |
| Motorised and smart blinds | motorised and smart blinds | a motorised or smart blind | Two kinds of blind; the singular keeps both |
| Conservatory blinds | a conservatory blind |  | A set in practice, but one blind reads fine |
| Roof window and skylight blinds | roof window and skylight blinds | a roof window blind | Skylight dropped: one plain name |
| Commercial blinds | a commercial blind |  | Plural; the code's singular reads fine |
| Curtain alterations and repairs | curtain alterations and repairs | a curtain alteration or repair | Countable plurals either side of the and |
| Curtain tracks and poles | curtain tracks and poles | a curtain track or pole |  |
| Bay window curtains and blinds | bay window curtains and blinds | a bay window blind or curtain | Unsure: curtains come as a pair; see the end |
| Made to measure curtains | a made to measure curtain | a pair of made to measure curtains | Nobody buys one curtain; the pair is the unit |
| Plantation shutters | a plantation shutter | a set of plantation shutters | One shutter is a panel; the window's set is the job. Unsure |
| Made to measure blinds | a made to measure blind |  | Plural; the code's singular reads fine |
| Roller blinds | a roller blind |  | Plural; the code's singular reads fine |
| Roman blinds | a roman blind |  | Code lowercases Roman; roman blind is common in trade copy |
| Venetian and wooden blinds | venetian and wooden blinds | a venetian or wooden blind |  |
| Vertical blinds | a vertical blind |  | Plural; the code's singular reads fine |
| Perfect fit and intu blinds | perfect fit and intu blinds | a fitted frame blind | From the prose_name (no brand names). prose_name: fitted frame blinds |
| Child safe blinds | a child safe blind |  | Plural; the code's singular reads fine |
| Awnings | an awning |  | Plural; the code's singular reads fine |

## Builder (builder.csv): 52 page targets, 9 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Property repairs and maintenance | property repairs and maintenance | a property repair | Repairs is a countable plural |
| Demolition and strip out | demolition and strip out |  | Both parts uncountable; reads a little stiff but is right |
| Foundations and underpinning | foundations and underpinning | underpinning | Foundations is plural; underpinning is the job the customer asks about |
| Property refurbishment | property refurbishment |  | Uncountable; reads as it is |
| Plastering and drylining | plastering and drylining |  | Both parts uncountable |
| Painting and decorating | painting and decorating |  | Both parts uncountable: does painting and decorating cost reads fine |
| Patios | a patio |  | Plural; the code's singular reads fine |
| Roofing | roofing |  | Uncountable; reads as it is |
| Basement conversions | a basement conversion |  | Plural; the code's singular reads fine |
| Design and build | design and build | a design and build project | Design and build alone does not take does |
| Commercial building work | commercial building work |  | Uncountable; the guarantee question reads work work |
| Brickwork and masonry | brickwork and masonry |  | Both parts uncountable |
| Kitchen door replacement and refacing | kitchen door replacement and refacing |  | Both parts uncountable |
| Kitchen fitting | kitchen fitting |  | Uncountable; reads as it is |
| Kitchen worktops | a kitchen worktop |  | Plural; the code's singular reads fine |
| Kitchen design | kitchen design |  | Uncountable; reads as it is |
| Fitted wardrobes | a fitted wardrobe |  | Plural; the code's singular reads fine |
| Bespoke carpentry and joinery | bespoke carpentry and joinery |  | Both parts uncountable |
| Second fix carpentry | second fix carpentry |  | Uncountable; reads as it is |
| First fix carpentry | first fix carpentry |  | Uncountable; reads as it is |
| Fitted shelving and storage | fitted shelving and storage |  | Both parts uncountable |
| Staircases | a staircase |  | Plural; the code's singular reads fine |
| Skirting boards and architrave | skirting boards and architrave | skirting board fitting | Unsure: see the end |
| Carpet fitting | carpet fitting |  | Uncountable; reads as it is |
| Wall and floor tiling | wall and floor tiling |  | One uncountable noun phrase |
| Polished concrete floors | a polished concrete floor |  | Plural; the code's singular reads fine |
| Resin flooring | resin flooring |  | Uncountable; reads as it is |
| Floor repairs | a floor repair |  | Plural; the code's singular reads fine |
| Laminate and LVT flooring | laminate and lvt flooring | laminate and LVT flooring | Only to keep the capitals (the code lowercases LVT) |
| Wood flooring | wood flooring |  | Uncountable; reads as it is |
| Floor sanding and restoration | floor sanding and restoration |  | Both parts uncountable |
| Bath installation and replacement | bath installation and replacement |  | Both parts uncountable |
| Bath and shower resurfacing | bath and shower resurfacing |  | One uncountable noun phrase |
| Composite decking | composite decking |  | Uncountable; reads as it is |
| Decking installation | decking installation |  | Uncountable; reads as it is |
| Decking repairs | a decking repair |  | Plural; the code's singular reads fine |
| Pergolas | a pergola |  | Plural; the code's singular reads fine |
| Porch extensions | a porch extension |  | Plural; the code's singular reads fine |
| Garage construction | garage construction |  | Uncountable; reads as it is |
| House extensions | a house extension |  | Plural; the code's singular reads fine |
| Loft conversions | a loft conversion |  | Plural; the code's singular reads fine |
| Garage conversions | a garage conversion |  | Plural; the code's singular reads fine |
| Garden rooms and outbuildings | garden rooms and outbuildings | a garden room |  |
| Conservatories and orangeries | conservatories and orangeries | a conservatory or orangery |  |
| Structural alterations and steel beams | structural alterations and steel beams | a structural alteration |  |
| Bathroom fitting | bathroom fitting |  | Uncountable; reads as it is |
| Wet rooms | a wet room |  | Plural; the code's singular reads fine |
| Shop and office fit outs | shop and office fit outs | a shop or office fit out |  |
| Listed building and heritage work | listed building and heritage work |  | Uncountable; the guarantee question reads work work (a template issue, not a name issue) |
| Insurance repair work | insurance repair work |  | Uncountable; the guarantee question reads work work |
| Disability adaptations | a disability adaptation |  | Plural; the code's singular reads fine |
| Barn conversions | a barn conversion |  | Plural; the code's singular reads fine |

## Cleaning (cleaning.csv): 26 page targets, 1 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Rug cleaning | rug cleaning |  | Uncountable; reads as it is |
| Curtain cleaning | curtain cleaning |  | Uncountable; reads as it is |
| Leather cleaning | leather cleaning |  | Uncountable; reads as it is |
| Mattress cleaning | mattress cleaning |  | Uncountable; reads as it is |
| Pet stain and odour removal | pet stain and odour removal |  | One uncountable noun phrase |
| Deep cleaning | deep cleaning |  | Uncountable; reads as it is |
| Office cleaning | office cleaning |  | Uncountable; reads as it is |
| Regular domestic cleaning | regular domestic cleaning |  | Uncountable; reads as it is |
| Gym and leisure centre cleaning | gym and leisure centre cleaning |  | One uncountable noun phrase |
| Medical and clinic cleaning | medical and clinic cleaning |  | One uncountable noun phrase |
| Communal area cleaning | communal area cleaning |  | Uncountable; reads as it is |
| After builders cleaning | after builders cleaning |  | Uncountable; reads as it is |
| School cleaning | school cleaning |  | Uncountable; reads as it is |
| Roof cleaning | roof cleaning |  | Uncountable; reads as it is |
| Soft washing | soft washing |  | Uncountable; reads as it is |
| End of tenancy cleaning | end of tenancy cleaning |  | Uncountable; reads as it is |
| Holiday let and Airbnb cleaning | holiday let and airbnb cleaning | holiday let cleaning | The prose_name; drops the brand. prose_name: holiday let cleaning |
| Oven cleaning | oven cleaning |  | Uncountable; reads as it is |
| Tile and grout cleaning | tile and grout cleaning |  | One uncountable noun phrase |
| Stone floor cleaning and restoration | stone floor cleaning and restoration |  | Both parts uncountable |
| Specialist commercial cleaning | specialist commercial cleaning |  | Uncountable; reads as it is |
| Conservatory cleaning | conservatory cleaning |  | Uncountable; reads as it is |
| Fascia and soffit cleaning | fascia and soffit cleaning |  | One uncountable noun phrase |
| Cladding cleaning | cladding cleaning |  | Uncountable; reads as it is |
| Render cleaning | render cleaning |  | Uncountable; reads as it is |
| Driveway and patio cleaning | driveway and patio cleaning |  | One uncountable noun phrase |

## Dog grooming (dog-grooming.csv): 9 page targets, 2 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Cat grooming | cat grooming |  | Uncountable; reads as it is |
| Dog bath and blow dry | dog bath and blow dry | a bath and blow dry | The customer's own phrase |
| Full groom | full groom | a full groom | Countable singular with no article today: does full groom cost |
| Nail clipping | nail clipping |  | Uncountable; reads as it is |
| Puppy grooming | puppy grooming |  | Uncountable; reads as it is |
| Hand stripping | hand stripping |  | Uncountable; reads as it is |
| Deshedding | deshedding |  | Uncountable; reads as it is |
| Mobile dog grooming | mobile dog grooming |  | Uncountable; reads as it is |
| Teeth cleaning | teeth cleaning |  | Uncountable; reads as it is |

## Dog training (dog-training.csv): 16 page targets, 0 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Dog boarding | dog boarding |  | Uncountable; reads as it is |
| Residential dog training | residential dog training |  | Uncountable; reads as it is |
| Dog day care | dog day care |  | Uncountable; reads as it is |
| Puppy training | puppy training |  | Uncountable; reads as it is |
| Obedience training | obedience training |  | Uncountable; reads as it is |
| Recall training | recall training |  | Uncountable; reads as it is |
| Loose lead walking | loose lead walking |  | Uncountable; reads as it is |
| Behaviour modification | behaviour modification |  | Uncountable; reads as it is |
| Reactive dog training | reactive dog training |  | Uncountable; reads as it is |
| Nervous and anxious dog training | nervous and anxious dog training |  | One uncountable noun phrase |
| Aggressive dog rehabilitation | aggressive dog rehabilitation |  | Uncountable; reads as it is |
| Assistance dog training | assistance dog training |  | Uncountable; reads as it is |
| Scent detection training | scent detection training |  | Uncountable; reads as it is |
| Gundog training | gundog training |  | Uncountable; reads as it is |
| Protection dog training | protection dog training |  | Uncountable; reads as it is |
| Family protection dogs | a family protection dog |  | The how long question reads oddly whatever the name |

## Drainage (drainage.csv): 25 page targets, 3 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Drain unblocking | drain unblocking |  | Uncountable; reads as it is |
| CCTV drain surveys | a cctv drain survey | a CCTV drain survey | Only to keep the capitals (the code gives a cctv drain survey) |
| Drain repairs | a drain repair |  | Plural; the code's singular reads fine |
| Drain relining | drain relining |  | Uncountable; reads as it is |
| Drain jetting | drain jetting |  | Uncountable; reads as it is |
| Tree root removal from drains | a tree root removal from drain | tree root removal | The code strips the s off drains: a tree root removal from drain |
| Soakaways | a soakaway |  | Plural; the code's singular reads fine |
| Gully cleaning | gully cleaning |  | Uncountable; reads as it is |
| Manhole repairs | a manhole repair |  | Plural; the code's singular reads fine |
| Emergency drainage | emergency drainage |  | Uncountable; reads as it is |
| Septic tank emptying | septic tank emptying |  | Uncountable; reads as it is |
| Septic tank repairs | a septic tank repair |  | Plural; the code's singular reads fine |
| Sewage pumps | a sewage pump |  | How long does a sewage pump take reads a little odd; the install is implied |
| Septic tank and treatment plant installation | septic tank and treatment plant installation |  | Uncountable; long but right |
| Leak detection | leak detection |  | Uncountable; reads as it is |
| Drain excavation and replacement | drain excavation and replacement |  | Both parts uncountable |
| Pitch fibre drain repairs | a pitch fibre drain repair |  | Plural; the code's singular reads fine |
| Drain descaling | drain descaling |  | Uncountable; reads as it is |
| Drain maintenance contracts | a drain maintenance contract |  | The how long question reads oddly whatever the name |
| Home buyer drain surveys | a home buyer drain survey |  | Plural; the code's singular reads fine |
| Grease trap and interceptor cleaning | grease trap and interceptor cleaning |  | Both parts uncountable |
| Drain odour investigations | a drain odour investigation |  | Plural; the code's singular reads fine |
| Blocked toilets | a blocked toilet |  | Problem named page: the right for your home question reads oddly whatever the name. Unsure |
| Blocked sinks and showers | blocked sinks and showers | a blocked sink or shower | Problem named page: the right for your home question reads oddly whatever the name |
| Flood water pumping | flood water pumping |  | Uncountable; reads as it is |

## Driveways (driveways.csv): 12 page targets, 2 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Concrete repairs and resurfacing | concrete repairs and resurfacing | concrete resurfacing | Unsure: see the end |
| Concrete driveways | a concrete driveway |  | Plural; the code's singular reads fine |
| Imprinted concrete | imprinted concrete |  | Uncountable; reads as it is |
| Car park line marking | car park line marking |  | Uncountable; reads as it is |
| Resin bound driveways | a resin bound driveway |  | Plural; the code's singular reads fine |
| Gravel driveways | a gravel driveway |  | Plural; the code's singular reads fine |
| Tar and chip surfacing | tar and chip surfacing |  | One uncountable noun phrase |
| Kerbs and edging | kerbs and edging | kerbing and edging | Kerbs is plural; kerbing is the trade's uncountable |
| Dropped kerbs | a dropped kerb |  | Plural; the code's singular reads fine |
| Permeable paving | permeable paving |  | Uncountable; reads as it is |
| Play area and sports surfacing | play area and sports surfacing |  | One uncountable noun phrase |
| Bollards | a bollard |  | Plural; the code's singular reads fine |

## Electrician (electrician.csv): 25 page targets, 10 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| EV charger installation | ev charger installation | EV charger installation | Only to keep the capitals |
| Rewiring | rewiring |  | A rewire is the customer's word (optional, see the end) |
| Electrical fault finding and repairs | electrical fault finding and repairs | electrical fault finding | Repairs is a countable plural |
| Extractor fan installation | extractor fan installation |  | Uncountable; reads as it is |
| Lighting installation | lighting installation |  | Uncountable; reads as it is |
| Garden and outdoor lighting | garden and outdoor lighting |  | One uncountable noun phrase |
| Sockets and switches | sockets and switches | a new socket or switch |  |
| Emergency electrician | emergency electrician | an emergency electrician call out | A person, not a job: does emergency electrician cost |
| Consumer unit upgrades | a consumer unit upgrade |  | Plural; the code's singular reads fine |
| EICR and electrical testing | eicr and electrical testing | an EICR | The customer's word; keeps the capitals |
| Landlord electrical certificates | a landlord electrical certificate |  | Plural; the code's singular reads fine |
| PAT testing | pat testing | PAT testing | Only to keep the capitals |
| Smoke and heat alarms | smoke and heat alarms | a smoke or heat alarm |  |
| Emergency lighting | emergency lighting |  | Uncountable; reads as it is |
| Fire alarm systems | a fire alarm system |  | Plural; the code's singular reads fine |
| CCTV installation | cctv installation | CCTV installation | Only to keep the capitals |
| Access control and door entry | access control and door entry |  | Both parts uncountable |
| Intruder alarms | an intruder alarm |  | Plural; the code's singular reads fine |
| Smart home installation | smart home installation |  | Uncountable; reads as it is |
| Home cinema and audio visual | home cinema and audio visual | a home cinema | Audio visual is not a noun on its own |
| Data and network cabling | data and network cabling |  | One uncountable noun phrase |
| Commercial electrical work | commercial electrical work |  | Uncountable; reads as it is |
| Electric shower installation | electric shower installation |  | Uncountable; reads as it is |
| Cooker and hob installation | cooker and hob installation |  | One uncountable noun phrase |
| Solar PV and battery storage | solar pv and battery storage | a solar PV and battery system | Reads as one system; keeps the capitals |

## Fencing (fencing.csv): 21 page targets, 3 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Metal fencing and railings | metal fencing and railings | metal fencing | Railings is a countable plural |
| Automatic gates | an automatic gate |  | Plural; the code's singular reads fine |
| Chain link fencing | chain link fencing |  | Uncountable; reads as it is |
| Fence repairs | a fence repair |  | Plural; the code's singular reads fine |
| Security fencing | security fencing |  | Uncountable; reads as it is |
| Timber fencing | timber fencing |  | Uncountable; reads as it is |
| Acoustic fencing | acoustic fencing |  | Uncountable; reads as it is |
| Agricultural and stock fencing | agricultural and stock fencing |  | One uncountable noun phrase |
| Equestrian fencing | equestrian fencing |  | Uncountable; reads as it is |
| Closeboard fencing | closeboard fencing |  | Uncountable; reads as it is |
| Picket fencing | picket fencing |  | Uncountable; reads as it is |
| Post and rail fencing | post and rail fencing |  | One uncountable noun phrase |
| Hit and miss fencing | hit and miss fencing |  | One uncountable noun phrase |
| Panel fencing | panel fencing |  | Uncountable; reads as it is |
| Electric fencing | electric fencing |  | Uncountable; reads as it is |
| Temporary fencing | temporary fencing |  | Uncountable; reads as it is |
| Fence staining and treatment | fence staining and treatment |  | Both parts uncountable |
| Bin and log stores | bin and log stores | a bin or log store |  |
| Garden gates | a garden gate |  | Plural; the code's singular reads fine |
| Composite fencing | composite fencing |  | Uncountable; reads as it is |
| Concrete posts and gravel boards | concrete posts and gravel boards | concrete post and gravel board fencing | Unsure: see the end |

## Flooring (flooring.csv): 11 page targets, 4 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| LVT flooring | lvt flooring | LVT flooring | Only to keep the capitals |
| Vinyl flooring | vinyl flooring |  | Uncountable; reads as it is |
| Safety flooring | safety flooring |  | Uncountable; reads as it is |
| Parquet and herringbone flooring | parquet and herringbone flooring |  | One uncountable noun phrase |
| Carpet tiles | a carpet tile | carpet tile flooring | Nobody buys one carpet tile. Unsure |
| Carpet repairs and re stretching | carpet repairs and re stretching | a carpet repair |  |
| Screeding and floor levelling | screeding and floor levelling |  | Both parts uncountable |
| Acoustic flooring | acoustic flooring |  | Uncountable; reads as it is |
| Floor removal and uplift | floor removal and uplift |  | Both parts uncountable |
| Floor surveys and moisture testing | floor surveys and moisture testing | a floor survey | Surveys is a countable plural |
| Commercial flooring | commercial flooring |  | Uncountable; reads as it is |

## Garage doors (garage-doors.csv): 13 page targets, 4 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Garage door repairs | a garage door repair |  | Plural; the code's singular reads fine |
| Sectional garage doors | a sectional garage door |  | Plural; the code's singular reads fine |
| Up and over garage doors | up and over garage doors | an up and over garage door | The and is inside the name, so the code leaves the plural |
| Roller garage doors | a roller garage door |  | Plural; the code's singular reads fine |
| Side hinged garage doors | a side hinged garage door |  | Plural; the code's singular reads fine |
| Timber garage doors | a timber garage door |  | Plural; the code's singular reads fine |
| Insulated garage doors | an insulated garage door |  | Plural; the code's singular reads fine |
| Electric garage doors | an electric garage door |  | Plural; the code's singular reads fine |
| Personnel and side doors | personnel and side doors | a personnel or side door |  |
| Front and entrance doors | front and entrance doors | a front door |  |
| Industrial and commercial doors | industrial and commercial doors | an industrial or commercial door |  |
| Roller shutters | a roller shutter |  | Plural; the code's singular reads fine |
| Made to measure garage doors | a made to measure garage door |  | Plural; the code's singular reads fine |

## Guttering (guttering.csv): 6 page targets, 2 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Bargeboards | a bargeboard | bargeboard replacement | One bargeboard is never the job. Unsure |
| Downpipes | a downpipe |  | A downpipe is a single item; reads fine |
| Commercial guttering | commercial guttering |  | Uncountable; reads as it is |
| Aluminium guttering | aluminium guttering |  | Uncountable; reads as it is |
| Cast iron guttering | cast iron guttering |  | Uncountable; reads as it is |
| Gutter guards and leaf protection | gutter guards and leaf protection | gutter protection | Guards is plural; protection covers both |

## HVAC (hvac.csv): 13 page targets, 2 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Air conditioning servicing | air conditioning servicing |  | Uncountable; reads as it is |
| Duct cleaning | duct cleaning |  | Uncountable; reads as it is |
| Air conditioning installation | air conditioning installation |  | Uncountable; reads as it is |
| Ductwork and ventilation installation | ductwork and ventilation installation |  | One uncountable noun phrase |
| Air conditioning repairs | an air conditioning repair |  | Plural; the code's singular reads fine |
| Air conditioning removal and decommissioning | air conditioning removal and decommissioning |  | Both parts uncountable |
| MVHR heat recovery ventilation | mvhr heat recovery ventilation | an MVHR system | Keeps the capitals; the system is what the customer buys |
| Commercial HVAC | commercial hvac | commercial HVAC | Only to keep the capitals |
| Commercial refrigeration | commercial refrigeration |  | Uncountable; reads as it is |
| Cold rooms | a cold room |  | Plural; the code's singular reads fine |
| Indoor air quality testing | indoor air quality testing |  | Uncountable; reads as it is |
| Split system air conditioning | split system air conditioning |  | Uncountable; reads as it is |
| Server room cooling | server room cooling |  | Uncountable; reads as it is |

## Kitchen and bathroom (kitchen-bathroom.csv): 6 page targets, 3 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Walk in showers | a walk in shower |  | Plural; the code's singular reads fine |
| Accessible and mobility bathrooms | accessible and mobility bathrooms | an accessible bathroom |  |
| Cloakrooms and en suites | cloakrooms and en suites | a cloakroom or en suite |  |
| Utility rooms | an utility room | a utility room | The code gives an utility room (vowel letter, consonant sound) |
| Media walls | a media wall |  | Plural; the code's singular reads fine |
| Bathroom design | bathroom design |  | Uncountable; reads as it is |

## Landscaper (landscaper.csv): 30 page targets, 3 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Lawn mowing | lawn mowing |  | Uncountable; reads as it is |
| Fencing | fencing |  | Uncountable; reads as it is |
| Lawn seeding | lawn seeding |  | Uncountable; reads as it is |
| Hedge trimming | hedge trimming |  | Uncountable; reads as it is |
| Mulching | mulching |  | Uncountable; reads as it is |
| Weed control | weed control |  | Uncountable; reads as it is |
| Artificial grass installation | artificial grass installation |  | Uncountable; reads as it is |
| Lawn care | lawn care |  | Uncountable; reads as it is |
| Garden steps | a garden step | a set of garden steps | One step is never the job |
| Retaining walls | a retaining wall |  | Plural; the code's singular reads fine |
| Garden walls and stonework | garden walls and stonework | a garden wall |  |
| Garden paths | a garden path |  | Plural; the code's singular reads fine |
| Garden drainage | garden drainage |  | Uncountable; reads as it is |
| Garden levelling | garden levelling |  | Uncountable; reads as it is |
| Garden irrigation | garden irrigation |  | Uncountable; reads as it is |
| Tree cabling and bracing | tree cabling and bracing |  | Both parts uncountable |
| Tree stump removal | tree stump removal |  | Uncountable; reads as it is |
| Tree planting | tree planting |  | Uncountable; reads as it is |
| Tree removal and felling | tree removal and felling |  | Both parts uncountable |
| Tree transplanting | tree transplanting |  | Uncountable; reads as it is |
| Tree pruning and crown reduction | tree pruning and crown reduction |  | Both parts uncountable |
| Concrete bases and paths | concrete bases and paths | a concrete base or path |  |
| Driveway repairs | a driveway repair |  | Plural; the code's singular reads fine |
| Driveway sealing | driveway sealing |  | Uncountable; reads as it is |
| Car park surfacing | car park surfacing |  | Uncountable; reads as it is |
| Patios | a patio |  | Plural; the code's singular reads fine |
| Composite decking | composite decking |  | Uncountable; reads as it is |
| Decking installation | decking installation |  | Uncountable; reads as it is |
| Decking repairs | a decking repair |  | Plural; the code's singular reads fine |
| Pergolas | a pergola |  | Plural; the code's singular reads fine |

## Locksmith (locksmith.csv): 13 page targets, 6 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Lockouts and gaining entry | lockouts and gaining entry | a lockout call out | Brandon's example |
| Auto locksmith | auto locksmith | an auto locksmith call out | A person, not a job |
| Key cutting | key cutting |  | Uncountable; reads as it is |
| Lock repairs | a lock repair |  | Plural; the code's singular reads fine |
| Lock fitting and replacement | lock fitting and replacement |  | Both parts uncountable; a lock change is the customer's word (optional, see the end) |
| Safes | a safe |  | A safe reads fine; the page covers supply and opening. Unsure |
| British Standard and insurance approved locks | british standard and insurance approved locks | a British Standard lock | Keeps the capitals |
| Window locks | a window lock |  | Plural; the code's singular reads fine |
| Emergency locksmith | emergency locksmith | an emergency locksmith call out | A person, not a job |
| uPVC door and window lock repairs | upvc door and window lock repairs | a uPVC lock repair | Repairs is plural; keeps the uPVC spelling |
| Smart locks | a smart lock |  | Plural; the code's singular reads fine |
| Master key systems | a master key system |  | Plural; the code's singular reads fine |
| Burglary repairs and boarding up | burglary repairs and boarding up | a burglary repair |  |

## Loft conversions (loft-conversions.csv): 10 page targets, 2 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Dormer loft conversions | a dormer loft conversion |  | Plural; the code's singular reads fine |
| Hip to gable loft conversions | a hip to gable loft conversion |  | Plural; the code's singular reads fine |
| Mansard loft conversions | a mansard loft conversion |  | Plural; the code's singular reads fine |
| Velux loft conversions | a velux loft conversion | a roof light loft conversion | From the prose_name (no brand); the code gives a velux loft conversion. prose_name: roof light loft conversions |
| Double storey extensions | a double storey extension |  | Plural; the code's singular reads fine |
| Single storey extensions | a single storey extension |  | Plural; the code's singular reads fine |
| Side return extensions | a side return extension |  | Plural; the code's singular reads fine |
| Wraparound extensions | a wraparound extension |  | Plural; the code's singular reads fine |
| Annexes and granny flats | annexes and granny flats | an annexe | UK singular is annexe |
| Loft boarding and insulation | loft boarding and insulation |  | Both parts uncountable |

## Painters and decorators (painters-decorators.csv): 13 page targets, 3 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Exterior painting | exterior painting |  | Uncountable; reads as it is |
| Furniture and kitchen painting | furniture and kitchen painting |  | One uncountable noun phrase |
| Interior painting and decorating | interior painting and decorating |  | One uncountable noun phrase |
| Spray painting | spray painting |  | Uncountable; reads as it is |
| Wallpapering | wallpapering |  | Uncountable; reads as it is |
| Woodwork and timber finishing | woodwork and timber finishing |  | One uncountable noun phrase |
| Decorative finishes and murals | decorative finishes and murals | a decorative finish or mural |  |
| Coving and cornice | coving and cornice |  | Both parts uncountable |
| Plaster repairs and skimming | plaster repairs and skimming | a plaster repair | Unsure: see the end |
| Artex removal | artex removal |  | Uncountable; reads as it is |
| Sash window and timber restoration | sash window and timber restoration |  | One uncountable noun phrase |
| Commercial decorating | commercial decorating |  | Uncountable; reads as it is |
| Intumescent and fire protection coatings | intumescent and fire protection coatings | a fire protection coating | Plain words for intumescent |

## Pest control (pest-control.csv): 22 page targets, 1 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Ant control | ant control |  | Uncountable; reads as it is |
| Bed bug treatment | bed bug treatment |  | Uncountable; reads as it is |
| Bee removal and relocation | bee removal and relocation |  | Both parts uncountable |
| Cockroach control | cockroach control |  | Uncountable; reads as it is |
| Flea treatment | flea treatment |  | Uncountable; reads as it is |
| Wasp nest removal | wasp nest removal |  | Uncountable; reads as it is |
| Pest surveys and inspections | pest surveys and inspections | a pest survey | Surveys is a countable plural |
| Rat and mouse control | rat and mouse control |  | One uncountable noun phrase |
| Bird control and proofing | bird control and proofing |  | Both parts uncountable |
| Solar panel bird proofing | solar panel bird proofing |  | Uncountable; reads as it is |
| Mole control | mole control |  | Uncountable; reads as it is |
| Rabbit control | rabbit control |  | Uncountable; reads as it is |
| Fox and wildlife control | fox and wildlife control |  | One uncountable noun phrase |
| Squirrel control | squirrel control |  | Uncountable; reads as it is |
| Moth and textile pest control | moth and textile pest control |  | One uncountable noun phrase |
| Woodworm treatment | woodworm treatment |  | Uncountable; reads as it is |
| Fumigation and heat treatment | fumigation and heat treatment |  | Both parts uncountable |
| Pest proofing | pest proofing |  | Uncountable; reads as it is |
| Dead animal removal | dead animal removal |  | Uncountable; reads as it is |
| Loft clearance and decontamination | loft clearance and decontamination |  | Both parts uncountable |
| Commercial pest control | commercial pest control |  | Uncountable; reads as it is |
| Insect control | insect control |  | Uncountable; reads as it is |

## Pet care (pet-care.csv): 13 page targets, 2 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Cat boarding | cat boarding |  | Uncountable; reads as it is |
| Cat sitting | cat sitting |  | Uncountable; reads as it is |
| Dog home boarding | dog home boarding |  | Uncountable; reads as it is |
| Dog day care | dog day care |  | Uncountable; reads as it is |
| Dog sitting | dog sitting |  | Uncountable; reads as it is |
| Solo dog walks | a solo dog walk |  | Plural; the code's singular reads fine |
| Group dog walks | a group dog walk |  | Plural; the code's singular reads fine |
| Secure field walks | a secure field walk |  | Plural; the code's singular reads fine |
| Pet taxi | pet taxi | a pet taxi trip | Countable with no article today: does pet taxi cost |
| Wedding dog chaperone | wedding dog chaperone | a wedding dog chaperone | Countable with no article today |
| Puppy visits | a puppy visit |  | Plural; the code's singular reads fine |
| Drop in visits | a drop in visit |  | Plural; the code's singular reads fine |
| Small animal care | small animal care |  | Uncountable; reads as it is |

## Plumbing and heating (plumbing-heating.csv): 27 page targets, 6 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Heating controls and thermostats | heating controls and thermostats | a new thermostat | Unsure: see the end |
| Leak detection and repair | leak detection and repair |  | Both parts uncountable |
| Taps and basins | taps and basins | a new tap or basin |  |
| Shower installation and repair | shower installation and repair |  | Both parts uncountable |
| Toilet installation and repair | toilet installation and repair |  | Both parts uncountable |
| Outside taps and garden plumbing | outside taps and garden plumbing | an outside tap |  |
| Burst and leaking pipes | burst and leaking pipes | a burst or leaking pipe | Problem named page: the right for your home question reads oddly whatever the name |
| Blocked drains and sinks | blocked drains and sinks | a blocked drain or sink | Problem named page, as above |
| Cold water tanks | a cold water tank |  | Plural; the code's singular reads fine |
| Boiler installation | boiler installation |  | A new boiler is the customer's word (optional, see the end) |
| Boiler servicing | boiler servicing |  | A boiler service is the customer's word (optional, see the end) |
| Boiler repairs | a boiler repair |  | Plural; the code's singular reads fine |
| Emergency plumber and heating engineer | emergency plumber and heating engineer | an emergency plumber call out | A person, not a job |
| Central heating installation | central heating installation |  | Uncountable; reads as it is |
| Central heating repairs | a central heating repair |  | Plural; the code's singular reads fine |
| Central heating servicing | central heating servicing |  | Uncountable; reads as it is |
| Radiators | a radiator |  | Plural; the code's singular reads fine |
| Power flushing | power flushing |  | A power flush is the customer's word (optional, see the end) |
| Gas safety certificates | a gas safety certificate |  | Plural; the code's singular reads fine |
| Gas appliance installation | gas appliance installation |  | Uncountable; reads as it is |
| Air source heat pumps | an air source heat pump |  | Plural; the code's singular reads fine |
| Ground source heat pumps | a ground source heat pump |  | Plural; the code's singular reads fine |
| Underfloor heating | underfloor heating |  | Uncountable; reads as it is |
| Hot water cylinders | a hot water cylinder |  | Plural; the code's singular reads fine |
| Bathroom installation | bathroom installation |  | Uncountable; reads as it is |
| Oil boilers | an oil boiler |  | Plural; the code's singular reads fine |
| Water softeners | a water softener |  | Plural; the code's singular reads fine |

## Pressure washing (pressure-washing.csv): 9 page targets, 0 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Decking cleaning | decking cleaning |  | Uncountable; reads as it is |
| Brick and stone cleaning | brick and stone cleaning |  | One uncountable noun phrase |
| Solar panel cleaning | solar panel cleaning |  | Uncountable; reads as it is |
| Graffiti removal | graffiti removal |  | Uncountable; reads as it is |
| Oil and rust stain removal | oil and rust stain removal |  | One uncountable noun phrase |
| Car park cleaning | car park cleaning |  | Uncountable; reads as it is |
| Tennis court and sports surface cleaning | tennis court and sports surface cleaning |  | One uncountable noun phrase |
| Industrial and warehouse cleaning | industrial and warehouse cleaning |  | One uncountable noun phrase |
| Block paving and concrete sealing | block paving and concrete sealing |  | One uncountable noun phrase |

## Removals (removals.csv): 11 page targets, 3 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Furniture dismantling and reassembly | furniture dismantling and reassembly |  | Both parts uncountable |
| Storage | storage |  | Uncountable; reads as it is |
| International removals | an international removal |  | An international move is the customer's word (optional, see the end) |
| Local house removals | a local house removal |  | A local house move is the customer's word (optional, see the end) |
| Office and commercial removals | office and commercial removals | an office move | Move is the customer's word |
| Long distance removals | a long distance removal |  | A long distance move is the customer's word (optional, see the end) |
| Packing services | a packing service |  | Plural; the code's singular reads fine |
| Single item and small moves | single item and small moves | a single item or small move |  |
| Piano removals | a piano removal |  | Plural; the code's singular reads fine |
| Antique and fine art removals | antique and fine art removals | an antique or fine art move |  |
| House clearance | house clearance |  | Uncountable; reads as it is |

## Roofer (roofer.csv): 29 page targets, 7 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Loft ventilation | loft ventilation |  | Uncountable; reads as it is |
| Gutter cleaning | gutter cleaning |  | Uncountable; reads as it is |
| Guttering installation | guttering installation |  | Uncountable; reads as it is |
| Gutter repairs | a gutter repair |  | Plural; the code's singular reads fine |
| Roof inspections | a roof inspection |  | Plural; the code's singular reads fine |
| Roof replacement | roof replacement |  | A new roof is the customer's word (optional, see the end) |
| Roof repairs | a roof repair |  | Plural; the code's singular reads fine |
| Roof window installation (Velux) | roof window installation (velux) | roof window installation | The brackets and the brand would land in the question |
| Roof window repairs | a roof window repair |  | Plural; the code's singular reads fine |
| Storm damage repairs | a storm damage repair |  | Plural; the code's singular reads fine |
| Flat roof replacement | flat roof replacement |  | Uncountable; reads as it is |
| EPDM rubber roofing | epdm rubber roofing | EPDM rubber roofing | Only to keep the capitals |
| GRP fibreglass roofing | grp fibreglass roofing | GRP fibreglass roofing | Only to keep the capitals |
| Felt roofing | felt roofing |  | Uncountable; reads as it is |
| Slate roofing | slate roofing |  | Uncountable; reads as it is |
| Tile roofing | tile roofing |  | Uncountable; reads as it is |
| Warm roof and cold roof conversion | warm roof and cold roof conversion | a warm roof conversion | The warm roof is what the customer is buying |
| Fascias and soffits | fascias and soffits | a fascia and soffit replacement | Both plural; the replacement is the job |
| Cladding | cladding |  | Uncountable; reads as it is |
| Dry ridge and dry verge | dry ridge and dry verge | a dry ridge or dry verge system |  |
| Leadwork | leadwork |  | Uncountable; reads as it is |
| Chimney repairs and repointing | chimney repairs and repointing | a chimney repair |  |
| Chimney removal | chimney removal |  | Uncountable; reads as it is |
| Roof cleaning and moss removal | roof cleaning and moss removal |  | Both parts uncountable |
| Solar panel bird proofing | solar panel bird proofing |  | Uncountable; reads as it is |
| Commercial roofing | commercial roofing |  | Uncountable; reads as it is |
| Garage roof replacement | garage roof replacement |  | Uncountable; reads as it is |
| Conservatory roof replacement | conservatory roof replacement |  | Uncountable; reads as it is |
| Roof coatings | a roof coating |  | Plural; the code's singular reads fine |

## Scaffolding (scaffolding.csv): 19 page targets, 2 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Debris netting and sheeting | debris netting and sheeting |  | Both parts uncountable |
| Hoists and loading bays | hoists and loading bays | a hoist or loading bay |  |
| Scaffold hire | scaffold hire |  | Uncountable; reads as it is |
| Domestic scaffolding | domestic scaffolding |  | Uncountable; reads as it is |
| Commercial scaffolding | commercial scaffolding |  | Uncountable; reads as it is |
| Temporary roofs | a temporary roof |  | Plural; the code's singular reads fine |
| Chimney scaffolding | chimney scaffolding |  | Uncountable; reads as it is |
| Access towers | an access tower |  | Plural; the code's singular reads fine |
| Cantilever and truss out scaffolding | cantilever and truss out scaffolding |  | One uncountable noun phrase |
| Birdcage scaffolding | birdcage scaffolding |  | Uncountable; reads as it is |
| Stair towers and temporary stairs | stair towers and temporary stairs | a stair tower |  |
| Edge protection | edge protection |  | Uncountable; reads as it is |
| Scaffold design | scaffold design |  | Uncountable; reads as it is |
| Scaffold inspections | a scaffold inspection |  | Plural; the code's singular reads fine |
| Emergency scaffolding | emergency scaffolding |  | Uncountable; reads as it is |
| Event scaffolding | event scaffolding |  | Uncountable; reads as it is |
| Heritage and listed building scaffolding | heritage and listed building scaffolding |  | One uncountable noun phrase |
| Pavement and road scaffolding | pavement and road scaffolding |  | One uncountable noun phrase |
| Suspended access | suspended access |  | Uncountable; reads as it is |

## Tiling (tiling.csv): 12 page targets, 2 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Tile removal | tile removal |  | Uncountable; reads as it is |
| Regrouting and grout repair | regrouting and grout repair |  | Both parts uncountable |
| Bathroom and shower tiling | bathroom and shower tiling |  | One uncountable noun phrase |
| Kitchen tiling and splashbacks | kitchen tiling and splashbacks | kitchen tiling | Splashbacks is a countable plural |
| Tile repairs and replacement | tile repairs and replacement | a tile repair |  |
| Wet room tiling and tanking | wet room tiling and tanking |  | Both parts uncountable |
| Natural stone tiling | natural stone tiling |  | Uncountable; reads as it is |
| Victorian and period floor tiling | victorian and period floor tiling |  | One uncountable noun phrase |
| Outdoor and porcelain paving tiling | outdoor and porcelain paving tiling |  | One uncountable noun phrase |
| Swimming pool tiling | swimming pool tiling |  | Uncountable; reads as it is |
| Feature wall and hearth tiling | feature wall and hearth tiling |  | One uncountable noun phrase |
| Floor tiling | floor tiling |  | Uncountable; reads as it is |

## Tree surgeon (tree-surgeon.csv): 11 page targets, 2 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Emergency tree work | emergency tree work |  | Uncountable; the guarantee question reads work work |
| Hedge reduction and removal | hedge reduction and removal |  | Both parts uncountable |
| Pollarding and coppicing | pollarding and coppicing |  | Both parts uncountable |
| Tree surveys and reports | tree surveys and reports | a tree survey | Surveys is a countable plural |
| Ash dieback management | ash dieback management |  | Uncountable; reads as it is |
| Ivy removal | ivy removal |  | Uncountable; reads as it is |
| Site and vegetation clearance | site and vegetation clearance |  | One uncountable noun phrase |
| Woodland management | woodland management |  | Uncountable; reads as it is |
| Firewood and logs | firewood and logs | firewood | Logs is plural; the how long question reads oddly whatever the name |
| Wood chipping | wood chipping |  | Uncountable; reads as it is |
| Root barriers | a root barrier |  | Plural; the code's singular reads fine |

## Window cleaning (window-cleaning.csv): 5 page targets, 0 need a question_name

| Target | Code's form today | Proposed question_name | Note |
|---|---|---|---|
| Sign and canopy cleaning | sign and canopy cleaning |  | One uncountable noun phrase |
| Bin store cleaning | bin store cleaning |  | Uncountable; reads as it is |
| High level window cleaning | high level window cleaning |  | Uncountable; reads as it is |
| Commercial window cleaning | commercial window cleaning |  | Uncountable; reads as it is |
| Residential window cleaning | residential window cleaning |  | Uncountable; reads as it is |

## Where I was unsure

Each line gives the proposal in the table first, then the alternative.

| Target | Proposed | Alternative | Why unsure |
|---|---|---|---|
| Bay window curtains and blinds | a bay window blind or curtain | a pair of bay window curtains | Curtains come in pairs; "a bay window curtain" is one half. The blind reads naturally in the singular, the curtain does not |
| Plantation shutters | a set of plantation shutters | a plantation shutter | One shutter is a panel. "a set of" is right but longer; leave blank if the panel reading is acceptable |
| Made to measure curtains | a pair of made to measure curtains | a made to measure curtain | Same pair problem |
| Skirting boards and architrave | skirting board fitting | new skirting and architrave | The job has no single noun. "fitting" takes "does" cleanly but the guarantee question reads "your skirting board fitting work". The alternative is plural, so "does new skirting... cost" fails |
| Concrete repairs and resurfacing | concrete resurfacing | a concrete repair | The page covers both; resurfacing is the bigger job the customer prices, a repair the smaller |
| Concrete posts and gravel boards | concrete post and gravel board fencing | a concrete post and gravel board fence | Both are long. "fencing" is uncountable so every question agrees; "a fence" is shorter in the right for your home question |
| Carpet tiles | carpet tile flooring | carpet tile fitting | One tile is never the job. "flooring" reads like the other flooring pages; "fitting" names the job |
| Bargeboards | bargeboard replacement | a bargeboard | One bargeboard is never the job, but the code's singular is at least grammatical |
| Heating controls and thermostats | a new thermostat | a heating controls upgrade | A thermostat is the plain word, but the page also covers zone valves and programmers |
| Plaster repairs and skimming | a plaster repair | a plaster skim | Skimming is the common job; "a skim" is trade talk a customer may not say |
| Blocked toilets | (blank, a blocked toilet) | a blocked toilet call out | The code's form is right for cost and how long; the right for your home question is wrong either way |
| Safes | (blank, a safe) | a safe opening or fitting | The page covers supply, fitting and opening; "How much does a safe cost" prices the box, not the work |
| Motorised and smart blinds | a motorised or smart blind | a motorised blind | Smart blinds are a kind of motorised blind; the shorter name may be enough |
| Lock fitting and replacement | (blank, lock fitting and replacement) | a lock change | Both parts uncountable, so the code's form is grammatical, but "a lock change" is what the customer asks for |

## Optional: plain customer words where the code's form is grammatical

Left blank in the tables because the code's form is right; listed because the customer's own word reads better in the cost question. Brandon's call.

| Target | Code's form | Customer's word |
|---|---|---|
| Rewiring | rewiring | a rewire |
| Boiler installation | boiler installation | a new boiler |
| Boiler servicing | boiler servicing | a boiler service |
| Central heating servicing | central heating servicing | a central heating service |
| Air conditioning servicing | air conditioning servicing | an air conditioning service |
| Power flushing | power flushing | a power flush |
| Roof replacement | roof replacement | a new roof |
| Flat roof replacement | flat roof replacement | a new flat roof |
| House clearance | house clearance | a house clearance |
| Lock fitting and replacement | lock fitting and replacement | a lock change |
| International removals | an international removal | an international move |
| Local house removals | a local house removal | a local house move |
| Long distance removals | a long distance removal | a long distance move |
| Piano removals | a piano removal | a piano move |

## How to apply

Add a `question_name` column to each library CSV (the loader `niche-library/library.js` already reads it when present and the page map carries it as `info.question_name`; `service-decisions.js` prefers it over the singulariser). Fill the "Proposed question_name" cells on the row whose verdict is `page` for that target; alias rows need nothing, the flag belongs to the target (`library.js targetFlags`).
