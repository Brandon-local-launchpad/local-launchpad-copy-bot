# Task board inside Copybot: the plan (14 Nov 2026)

**Stages 1 and 2 are built and live (14 Nov).** Stage 1: the People list, an owner on every Tracker step, the SOP link where one exists, and the My tasks screen. Stage 2: the steps done by hand (`team/hand-steps.json`, a first list of 11 to chop and change), each opened by the step before it and ticked Done, and one off tasks added on a client for a person, with an optional due date. Stages 3 and 4 below are not built, nor are logins. Brandon's answers of 14 Nov are in "Owners" and "Decisions".

## The idea in one paragraph

Copybot already works out, for every client, what waits on a person (the Tracker strip and the dashboard's "Needs a person" card, `ui/tracker.js`). What it does not know is **who** that person is, and it knows nothing about the work done outside Copybot (Given building the site in Elementor, a go / no go, the launch). The task board is the Tracker with three things added: an owner on every step, the steps done by hand, and a link from each step to its SOP. Because the steps come from the Tracker, most tasks open and close by themselves: nobody drags a card.

## What I found in the code

- **There are no people in Copybot.** Everyone logs in with one shared password. "Assigned to" on a client is a typed name, one per client. So the first piece is Copybot knowing who is looking at it.
- **The Tracker has about 45 steps**, each with a fixed key (`claims`, `citations_submit`, `locations_approve`...). An owner per step is one table keyed by those names.
- **Several things Copybot knows about are not on the Tracker yet**: the Images tab (picked, approved, placed), Pages on the site (created, copy pushed), the legal pages, the redirect push, the pre launch check, the launch itself, and the cards brief sign off. They need Tracker lines before they can be tasks.
- **Three SOPs are in the repo** (existing site migration, website images, rank scans). The rest are elsewhere or not written.

## What can be automatic, and what cannot

**Opens and closes by itself (already true today, about 45 steps).** Confirm form values, confirm the niche, fill in the record, confirm the Google listing, run and approve locations, research towns, page map, verify the trade facts pack, write pages, fix blocked pages, accept claims, approve pages, push, GBP output, post prompts, approve post batches, connect and switch on publishing, retry failed posts, approve review replies, Review Us page, scan directories, submit listings, finish listings waiting on an email, baseline rank scan, old site scan and URL decisions.

**Can be made automatic (Copybot holds the facts, the Tracker does not read them yet).** Create the pages on the staging site, push the inner page copy, pick and approve images, place images, legal pages held or pushed, push the redirects, pre launch check passed, launch day and day 7 checks, cards brief signed off.

**By hand only: a person ticks Done.** Copybot cannot see these:
- Given: build the staging site from the template, install the plugin, build and bind the Elementor templates, design check, DNS and go live.
- Ray: the photo sort in Claude, stock photos from Envato, pasting the GBP profile fields into Google, the GMB Everywhere competitor look.
- Brandon: go / no go, client sign off, anything agreed with the client by phone or WhatsApp.
- Anything one off ("ring Ethan about the price list").

A by hand step still opens by itself when the step before it is done. Only the closing is a tick.

## The pieces

### 1. People
A small People list on Settings: name, role (Brandon, Site build, Operations, Citations), email. The shared password stays; the first time you open Copybot in a browser you pick your name, and it is remembered. Every tick, approval and task then records who did it.

### 2. Owners
`team/owners.json`: each step → a role, by its own key, else the tab it is done on. A role → the people holding it on the People list. Brandon's split (14 Nov):

| Role | Who | Steps |
|---|---|---|
| Operations | Ray | Locations, research, page map, page writing (claims, blocked pages, approvals), GBP, GBP posts and photos, reviews, rankings, site audit |
| Citations | Ray's citations person | Every step on the Citations tab |
| Site and images | Given | Images, the push to WordPress and checking everything pushed is correct, making the review and referral cards (the print file goes to Brandon, who orders) |
| Brandon | Brandon | Everything sent with Tell Brandon; high level only |

**My guesses, to confirm:** the record and intake steps (form values, niche, Google listing, chase message, trade facts packs) are with Ray; the GHL onboarding domain step is with Given, the rest of the onboarding steps with Ray. A per client override is not built.

### 3. Steps by hand
`team/hand-steps.json`: each line is a key, the wording, the role, which step opens it, and its SOP. Ticked Done with who and when (the same way the GHL onboarding steps are ticked today). A new step is a line there, not code.

### 4. One off tasks
"Add a task" on a client: the text, who, an optional due date. Done ticks it. This is the only part that works like Asana.

### 5. SOP links
`team/sops.json`: step key → the SOP's title, link and section. Every task shows "How to do this". A step with no SOP shows "No SOP yet", and Settings lists every step without one: that is your list of SOPs still to write.

### 6. Screens
- **My tasks** (new, the first screen once you have picked your name): everything waiting on me, client by client, oldest first, each line opening the place to do it. A switch to see another person's list or everyone's.
- **Board** (new): a column per phase (Onboarding, Locations and page map, Copy, Site build, Images, GBP, Citations, Launch, Monthly), a card per client, each card showing who it is waiting on and for how long. Cards move by themselves.
- **Client page**: the Tracker strip gains the owner's name on each step, the SOP link, the by hand steps with Done, and Add a task.
- **Dashboard**: "Needs a person" gains a filter by person.

### 7. History and waiting time
A minute job records when each task opened and closed and who closed it. That gives "waiting 6 days" on every task, a per client timeline, and later the average days per phase.

### 8. Morning email (optional)
One email a day to each person with their open tasks, through the Gmail sender Copybot already uses. To the team only, never a client.

## Build order

1. **People, owners, My tasks.** No new facts: the existing Tracker steps with a name on each. Useful on its own.
2. **By hand steps, one off tasks, SOP links.**
3. **The missing Tracker lines** (images, pages on the site, inner copy push, legal, redirects, launch, cards).
4. **Board, history, waiting time, morning email.**

Each stage has its own fixture and is merged when it passes. No stage changes what any existing step does.

## What it will not do

- Approve, push, publish or scan anything: a task only points to the place a person does it.
- Message a client.
- Limit what a person can see (see the first decision below).

## Decisions I need from you

1. **Answered (14 Nov): separate logins for Brandon, Ray and the citations team, sorted after.** Stage 1 uses a name picked once per browser. Logins are their own stage; say what each login may see (the citations login: the Citations tab only?).
2. **Answered (14 Nov): the owner table above.** Two guesses in it to confirm.
3. **Ray's citations person:** on the list as "Citations team" for now; rename on Settings, or add a name each.
4. **The by hand steps:** the first list is live (photos into Drive, the photo sort, GBP onto Google, the NAP check and vault, the staging site, the Elementor templates, the staging check, go or no go, launch, making the cards, ordering the cards). Is it right, and what is missing? Given and Ray will know theirs better than I do.
5. **Answered (14 Nov): the SOPs are Google Docs.** `team/sops.json` links the Re-Launch 2026 SOP (citations X.3 to X.7, the domain, the cards) and the Website Images SOP. No SOP is linked yet for: the record, locations, research, the page map, pages, GBP, posts, reviews, rankings and the site audit (the site audit and rank scan SOPs are files in the repo, not Google Docs).
6. **Morning email:** yes or no.
7. **The board's columns:** the nine phases above, or yours.
