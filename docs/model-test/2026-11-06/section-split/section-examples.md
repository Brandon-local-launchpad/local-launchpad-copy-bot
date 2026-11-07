# Section examples for the split test

Written by claude-sonnet-5-5 at high on other Edens Edge pages, through the normal checks. Only text with no BLOCK or FLAG on its field is used. These passed the checks; nobody has read and approved them by hand.

## service: included

From Hedge trimming:

```
svc_included_intro: A visit is for homeowners whose front or boundary hedge has outgrown its shape or started blocking the path. Afterwards the hedge has an even outline, the way through is open again, and the ground beneath is clear of cuttings.
svc_included_items:
  - item_title: Check for active nests | item_text: Search the hedge for nests in use
  - item_title: Assess hedge and intended line | item_text: Judge the hedge's condition and the line wanted
  - item_title: Cut sides | item_text: Cut both sides back to the line
  - item_title: Cut top | item_text: Cut the top level along its length
  - item_title: Remove arisings | item_text: Collect the trimmings and remove them
  - item_title: Clear site | item_text: Tidy the ground along the hedge base
```

From Weed control:

```
svc_included_intro: A weed control visit clears unwanted growth from the garden's beds, borders, paths and paving joints. It's for homeowners who want the weeds dealt with while the plants they chose stay exactly where they are.
svc_included_items:
  - item_title: Identify weed | item_text: Each weed identified before any work starts
  - item_title: Select physical or authorised chemical method | item_text: Hand weeding, digging, hoeing or authorised herbicide selected
  - item_title: Protect adjacent plants | item_text: Plants beside the weeds shielded from treatment
  - item_title: Remove or treat | item_text: Weeds dug out, hoed off or treated
  - item_title: Collect material as appropriate | item_text: Removed weed material collected where appropriate
  - item_title: Revisit regrowth | item_text: Return to check and deal with regrowth
```

## service: steps

From Hedge trimming:

```
svc_process_steps:
  - step_title: Tell Us What Needs Keeping On Top Of | step_body: Tell us how long and how tall the hedge is, what needs doing, and send a few photos if you have them. A call or a message both work.
  - step_title: We Price Your Job | step_body: Once we've got the details, you're given a price for the hedge, and the work only goes ahead when you've said yes to it.
  - step_title: We Start on a Date That Suits You | step_body: The first visit is booked in for a day that suits you. On the day, the hedge is cut back to its line and the cuttings are cleared away.
```

From Weed control:

```
svc_process_steps:
  - step_title: Tell Us What Needs Keeping On Top Of | step_body: Call or send a message with the rough size of the area. Say which beds, paths or paving joints need clearing, and add photos if you've got them.
  - step_title: We Price Your Job | step_body: Once we know what the job involves, we give you a price, and the work only starts when you've agreed it.
  - step_title: We Start on a Date That Suits You | step_body: Your first visit goes in the diary on a day that works for you. On the day, the weeds in your beds, paths and paving joints are dealt with.
```

## service: areas

From Hedge trimming:

```
svc_areas_intro: We're based in Southampton and travel up to [CV: travel_distance], inland and along the coast. Every hedge we cut within that distance gets the same visit, whether it's a short front hedge or a long boundary line. What changes from garden to garden is the length and the way in.
```

From Weed control:

```
svc_areas_intro: We're based in the city and travel up to [CV: travel_distance] from there, inland and along the coast. Weed control is available across all of that area. Every garden in it gets the same visits, from a city street to a village further out.
```

## service: faq

From Hedge trimming:

```
svc_faq_items:
  - faq_question: How much does a hedge trimming visit cost in Southampton? | faq_answer: It depends on the hedge, and height usually matters most. A tall hedge that needs steps or extra reach takes longer and costs more than one cut from the ground. Ask for a free quote and share pictures showing the hedge and the way to it, so the figure reflects what's actually there.
  - faq_question: Are you insured for hedge trimming? | faq_answer: Yes, we're insured for hedge trimming up to £[CV: insurance_cover]. The insurance is in place for the hedge work itself: the cutting, the removal of the trimmings and the clearing up on the day. If you'd like more detail on the policy, just ask when you enquire.
  - faq_question: Do I need to be home for a hedge trimming visit? | faq_answer: It comes down to how we get to the hedge. A front hedge is usually simple to reach. One behind a side gate or at the back may need a key or someone to let us through. We sort out how to get in ahead of the first visit.
  - faq_question: What does a hedge trimming visit include? | faq_answer: A visit covers cutting the hedge and clearing up afterwards. It starts with sizing up the growth and settling the outline. Both faces and the top are then cut, the trimmings carried off and the ground along the base cleared. Work on the beds underneath, such as [weed control](/services/weed-control), is separate, and so are lawns and fences.
  - faq_question: Are there rules or standards for hedge trimming? | faq_answer: Yes, and the main one covers birds' nests. A nest in use is usually left alone, so that section waits until the birds have finished. Countryside hedgerow rules usually don't apply to a garden hedge. Council high hedge rules in most cases cover only tall evergreen rows, and a complaint usually comes after neighbours have tried to sort it out.
  - faq_question: When should hedge trimming start for the year? | faq_answer: Once the hedge has started growing in spring. A cut made much earlier tends to need repeating when the real growth arrives. Hedges don't all start at once, so the first visit of the year follows the hedge rather than the calendar.
```

From Weed control:

```
svc_faq_items:
  - faq_question: How often should weed control be done? | faq_answer: It's set by how fast your weeds grow, and we agree the pattern with you. The work runs through the growing season, because hand weeding and hoeing only follow growth that's there. Herbicide goes on only when the weather and the product's label allow. Fast annual weeds and slower perennials grow at different rates, so one rhythm rarely suits every bed.
  - faq_question: How much does a weed control visit cost in Southampton? | faq_answer: It depends mainly on how far the weeds have spread. A few isolated weeds cost much less to clear than beds full of established growth. To get a figure, ask for a quote, which is free. Send photos of the beds and paths involved, so the size of the job is clear.
  - faq_question: Are you insured for weed control? | faq_answer: Yes, we're insured up to £[CV: insurance_cover]. The cover is in place for weed control work, whether that's hand weeding a border, hoeing a bed or treating the joints in a path.
  - faq_question: What does a weed control visit include? | faq_answer: It runs from working out what the weeds are to checking for regrowth. A method is then picked to suit, with the plants nearby shielded. The weeds are taken out or treated and cleared away where that makes sense. Cutting the lawn isn't part of it, but [lawn mowing](/services/lawn-mowing) can sit alongside it.
  - faq_question: Are there rules or standards for weed control? | faq_answer: Yes, mainly for herbicides and for waste from certain invasive plants. Anyone using a professional herbicide usually needs a certificate, or must be training under supervision, and follows the product label. Waste from plants like Japanese knotweed usually can't go in ordinary soil or be sold as topsoil. It goes by an authorised route with a registered carrier, so tell us if you suspect any.
  - faq_question: When should weed control start for the year? | faq_answer: As soon as the weeds start growing again in spring. Young weeds have small root systems and come out easily, while ones left until they've flowered have had time to set seed. Clearing the beds before they fill out leaves clean soil. That's easier to mulch than ground still covered in growth.
```

## category: steps

From Landscape Gardener:

```
cat_process_steps:
  - step_title: Tell Us About Your Garden | step_body: Call [CV: phone] or send a message with the rough size of the area, what you want done and any photos you have.
  - step_title: We Price Your Job | step_body: Once we know what the job involves, we give you a price, and the work only goes ahead when you've said yes to it.
  - step_title: We Start on a Date That Suits You | step_body: We agree the start date with you in advance. That gives you time to clear the way in and plan around the first day in the garden.
```

From Tree Service:

```
cat_process_steps:
  - step_title: Tell Us About Your Garden | step_body: Call [CV: phone] or use the quote button, and tell us the tree's rough size, what you want done and send photos if you have them.
  - step_title: We Price Your Job | step_body: Once the tree and the job are clear, you get a price to agree, and the work only goes ahead when you're happy with it.
  - step_title: We Start on a Date That Suits You | step_body: We agree the date with you in advance, so it fits around your week. Before the day, move any cars and clear the ground round the tree.
```

## category: areas

From Landscape Gardener:

```
cat_areas_intro: We're based in the city and travel up to [CV: travel_distance], inland and along the coast. A garden by the water and one out in the villages are both within that reach. The landscaping work is the same in either, from a small back garden behind a terrace to a long garden with a slope.
```

From Tree Service:

```
cat_areas_intro: We're based in Southampton and travel up to [CV: travel_distance], inland and along the coast. Tree work goes ahead anywhere within that range. The towns below are covered just as the city is, and so are the villages around them, wherever your garden is.
```

## category: faq

From Landscape Gardener:

```
cat_faq_items:
  - faq_question: How much does landscape gardening cost in Southampton? | faq_answer: It mostly comes down to how much ground is being dug, built on or laid. Quotes are free, so ask for one and send a few photos of the garden along with what you'd like done. That's the quickest way to get a real figure rather than a guess.
  - faq_question: Are you insured for landscape gardening work? | faq_answer: Yes, we're insured up to £[CV: insurance_cover]. That cover is there for the landscaping work we carry out in your garden. It applies to jobs like groundwork, walls, paths, steps and lawns. If you'd like the details, ask when you enquire.
  - faq_question: What does your landscape gardening work include? | faq_answer: It covers groundwork, lawns, paths, walls and water features. That means [lawn seeding](/services/lawn-seeding), turf laying and artificial grass, plus garden levelling and garden drainage. We also build garden steps, retaining walls, garden walls and stonework, ponds, bases and paths. Garden maintenance and lawn care keep it all in shape, and if your job is something different, just ask.
  - faq_question: What happens when I ask for a quote? | faq_answer: Asking for a quote costs you nothing and doesn't commit you to going ahead. The quote is free, and you're under no obligation to book once you've seen the figure. If it isn't what you hoped for, or you'd rather think it over, you can walk away without paying a penny.
  - faq_question: Can you do landscape gardening work in winter? | faq_answer: Yes, plenty of it carries on through the cold months. Clearance, levelling and building carry on in dry spells, but concrete, paving and mortar work wait for ground and weather that aren't frozen or sodden. [Turf laying](/services/turf-laying) and planting wait while the ground is frozen, because roots don't take in frozen soil.
  - faq_question: The lawn stays soggy for days after rain: why does it happen, and what can be done? | faq_answer: It's usually the ground, not the grass, that holds the water. Soil across the city differs from street to street, and some of it lets rain through slowly. Near the rivers and the coast, the ground can stay saturated through winter, so rain has nowhere to go. [Garden drainage](/services/garden-drainage) means either giving the water a way out or getting it somewhere the ground can take it.
```

From Tree Service:

```
cat_faq_items:
  - faq_question: How much does tree surgery cost in Southampton? | faq_answer: It mostly comes down to the size of the tree. A small tree needing a light trim costs far less than a tall one coming down, so no single figure fits every job. Quotes are free, and a few pictures of your tree with your request help us put a price on it.
  - faq_question: Are you insured for tree surgery work? | faq_answer: Yes, we're insured up to £[CV: insurance_cover]. The cover is there for the tree work we carry out, such as climbing, cutting and lowering timber close to houses, fences and cars. Tree work happens next to things that can be damaged, so it's reasonable to ask any tree firm for its figure.
  - faq_question: What does your tree surgery work include? | faq_answer: It covers six kinds of tree work, from pruning to felling. Cabling and bracing supports a weak limb, and crown reduction lightens a tree that has grown heavy over a roof or path. Stump removal follows felling, while planting and [tree transplanting](/services/tree-transplanting) cover trees going into the ground rather than coming out.
  - faq_question: What happens when I ask for a quote? | faq_answer: Asking for a quote is free. You tell us about the tree and a price comes back for the work. Once you're happy to go ahead, work can start in the same week.
  - faq_question: Can you do tree surgery work in winter? | faq_answer: Yes, most tree work carries on through winter. Many deciduous trees suit pruning while they're dormant, and with the leaves off the structure is easier to read. Felling and stump grinding carry on too. What waits is planting while the ground is frozen or sodden, because roots won't take in frozen soil. Cherry and plum are the exception, as they're pruned later in the year.
```
