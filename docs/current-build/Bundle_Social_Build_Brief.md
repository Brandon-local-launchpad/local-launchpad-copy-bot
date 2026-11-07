# bundle.social build: Brandon's brief and the Stage 0 findings (7 Nov 2026)

Publish GBP posts, Photo Drip photos and review replies through bundle.social's API, replacing those three jobs in Lead Snap. Lead Snap stays for rank maps for now; nothing related to that is touched.

## Ground rules (Brandon)

- Additive only. Don't delete or rewrite the Lead Snap tab, its prompts, rules, checks, preview, label locks or fixtures. Reuse them. The tab keeps working until a client is switched over.
- Folder names stay exactly as the gbp-photo-sort skill creates them: "GBP Photos – Posts / [label]", "GBP Photos – Posts / Brand", "GBP Photos – Photo Drip".
- New database tables only, no destructive migrations. Don't write to the live database or connect any real client without asking first.
- Test only against the "Local Launchpad" team in bundle.social.
- Stop after each stage, show what was built and tested, and wait for the go-ahead.

## Stages (Brandon)

**Stage 1, Drive.** A "Drive photo folder" field on the client record. Read the folders and show real counts and file lists on the Lead Snap tab. Typed counts stay as the fallback when Drive isn't set.

**Stage 2, Posts.** A new "GBP Posts" tab beside the Lead Snap tab. Batches of 13, 26 or 52 finished posts at 2 a week, from the existing prompts, rules and checks. Each new post gets the client's earlier openings. Each post gets a photo from its folder (spread evenly), a date and a CTA. One post a month is an Offer post from the confirmed offer. Extra check: no phone numbers in the text. A VA reviews, edits and approves a batch; nothing publishes until then.

**Stage 3, Publishing.** A daily job takes approved items due in the next 3 days, downloads each photo from Drive, uploads it to bundle.social and schedules the post or photo. Photo Drip: 2 a week from "GBP Photos – Photo Drip", to the GBP Photos section with a category. Store bundle.social's IDs. Show queued, scheduled, posted and failed, with retry and delete. Never public Drive share links. Publishing sits behind a "publisher" interface, so Google's own API can replace it later.

**Connect to bundle.social button.** Create a team, copy the agency Google Business connection from the "Local Launchpad" team, refresh channels, and the VA picks the location from a list. Never connect clients one by one in the dashboard, and never ask clients to log in. Not run for a real client in testing.

**Stage 4, Review replies.** Import reviews per client. Draft each reply: short, in the client's tone, the reviewer's first name only, thanks, the service if the review names it. No invented facts, offers or promises. 3 stars or below: a calm, non defensive draft inviting them to get in touch, always flagged for a person. Nothing is posted without a VA approving it.

## What the docs changed (Stage 0)

- Photos can't be scheduled: `POST /misc/google-business/media` publishes at once, so the job adds each photo on its due date.
- An Offer post can't have a button: `callToActionType` is rejected. It needs a start date and one of coupon, redeem link or terms.
- `DELETE /post/{id}` only cancels a scheduled post. A published one needs `DELETE /misc/google-business/post`.
- There is no webhook for reviews, so the daily job runs the import.
- Limits for a post image: 1 image, 5 MB, 250 x 250 minimum, JPG, PNG or GIF. Text 1,500 characters.

## Open with bundle.social support

The rate limits page says daily counts are "keyed to the platform account". If every client's copy of the agency login shares one quota, Pro's 20 posts a day is about 70 clients and Business's 40 about 140. Also asked: whether photos count towards it, whether each copy has its own token, whether Offer posts need `eventTitle`, and how long uploads are kept.

## Brandon's decisions (7 Nov 2026)

- Each Offer post runs 28 days, so one ends as the next begins.
- When Photo Drip runs out: stop and tell the VA. A photo is never reused.
- Review replies: new reviews, plus unreplied ones from the last 90 days.
- Source teams: there are two, "Local Launchpad" (brandon@) and "Agency – team" (team@). Connect checks both.
- Edens Edge does visit before quoting. A visit in a post is checked against `site_visit_before_quote` in the client's confirmed practices.

## Stage 3 answers (Brandon, 7 Nov 2026)

- Test location: our own Local Launchpad profile, the location in the "Local Launchpad" team. Ask Brandon before each test post goes public.
- Photo Drip category: `AT_WORK` for all, for now.
- Stage 3 is built against a fake server only and merged with publishing off (Brandon, 7 Nov). Any real call waits for bundle.social support's answer on the daily quota, including whether the 20 a day is counted per Google login.

## Connect, with two source teams

A team holds one Google Business account, so a client's team cannot hold both logins. Connect reads the locations from each source team without creating anything: refresh channels on each, then one list with the source beside each location, and a location reachable through both shown once. Only when the VA picks one does it create the client's team, copy from the source that holds that location, set the channel and read it back. A location in neither list means that login has not been given access on Google yet.

## Added by the build, not in the brief

- A per client publisher setting (Lead Snap or bundle.social) in Stage 3, so a client can't post through both.
- The location read back after it is set, with publishing blocked until it matches, because `resetChannel` doesn't cover Google Business.
