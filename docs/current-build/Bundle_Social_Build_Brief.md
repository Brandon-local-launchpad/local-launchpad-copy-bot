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

**Stage 4, Review replies.** Replaced by Brandon's own brief, `docs/current-build/Review_Replies_Bundle_Social_Build_Brief.md` (8 Nov 2026), which wins where the two differ: 4 and 5 star replies may post automatically once a client is switched on, and reviews from before the go-live date are backlog rather than the last 90 days. The text below is the original plan, kept for the record. Import reviews per client. Draft each reply: short, in the client's tone, the reviewer's first name only, thanks, the service if the review names it. No invented facts, offers or promises. 3 stars or below: a calm, non defensive draft inviting them to get in touch, always flagged for a person. Nothing is posted without a VA approving it.

## What the docs changed (Stage 0)

- Photos can't be scheduled: `POST /misc/google-business/media` publishes at once, so the job adds each photo on its due date.
- An Offer post can't have a button: `callToActionType` is rejected. It needs a start date and one of coupon, redeem link or terms.
- `DELETE /post/{id}` only cancels a scheduled post. A published one needs `DELETE /misc/google-business/post`.
- There is no webhook for reviews, so the daily job runs the import.
- Limits for a post image: 1 image, 5 MB, 250 x 250 minimum, JPG, PNG or GIF. Text 1,500 characters.

## bundle.social support's answers (7 Nov 2026)

1. The daily limit is per location: each team with its own location gets its own 20 posts a day. Copybot counts it per client.
2. A photo added to the profile is not a post and does not count towards the limit.
3. Each copy has its own token, so disconnecting the source team does not affect the copies. They do share the Google authorisation of the login they came from: if that Google login loses access, every client copied from it stops. The location check before each run catches it and stops that client with the reason; reconnect it in the source team.
4. Offer posts: send `eventTitle`. Copybot already does.
5. An upload is kept while a draft or scheduled post uses it, and removed 14 days after the last post using it is published, fails or is deleted. So a Retry more than 13 days after a post's date cancels the old post and sends it again with a new upload, and a Photo Drip photo always gets a fresh upload.

## First real test (8 Nov 2026, `tools/bundle-social-test.js`, a "Copybot test" team on the Local Launchpad location)

- Both source teams found. Each login sees its own locations; the same Google location shows under each login with a different `accounts/<id>/` prefix, so a channel id belongs to one login.
- `externalId` on the Google account holds the selected location, `accounts/<id>/locations/<id>`: proven, and what `checkAccount` reads.
- A team with no Google account answers 400 "Team does not have a Google Business account", not 404. Fixed in `accountFor`; Connect would have stopped there.
- A copy arrives on the source team's own selected location, and set-channel refuses while a location is selected ("Please disconnect it first"). Connect now unsets the channel first (`/social-account/unset-channel`, which keeps the authorisation) and sets the chosen one; proven both ways on the test team. Without this every real Connect would have failed.
- A scheduled post is found by its reference key, cancels to DELETED, and its reference key then answers 404.
- Not yet tested, each needing Brandon's yes as it goes public: a real post, an Offer post, an AT_WORK photo, and Delete taking each off Google.

## Brandon's decisions (7 Nov 2026)

- Each Offer post runs 28 days, so one ends as the next begins.
- When Photo Drip runs out: stop and tell the VA. A photo is never reused.
- Review replies: new reviews, plus unreplied ones from the last 90 days.
- Source teams: there are two, "Local Launchpad" (brandon@) and "Agency – team" (team@). Connect checks both.
- Edens Edge does visit before quoting. A visit in a post is checked against `site_visit_before_quote` in the client's confirmed practices.

## Stage 3 answers (Brandon, 7 Nov 2026)

- Test location: our own Local Launchpad profile, the location in the "Local Launchpad" team. Ask Brandon before each test post goes public.
- Photo Drip category: `AT_WORK` for all, for now.
- Stage 3 is built against a fake server only and merged with publishing off (Brandon, 7 Nov). Support's answers are in. Next is the first real test on the Local Launchpad profile, with Brandon's yes before each post goes public, and then `GBP_PUBLISHING_ENABLED=1` with Brandon.

## Connect, with two source teams

A team holds one Google Business account, so a client's team cannot hold both logins. Connect reads the locations from each source team without creating anything: refresh channels on each, then one list with the source beside each location, and a location reachable through both shown once. Only when the VA picks one does it create the client's team, copy from the source that holds that location, set the channel and read it back. A location in neither list means that login has not been given access on Google yet.

## Added by the build, not in the brief

- A per client publisher setting (Lead Snap or bundle.social) in Stage 3, so a client can't post through both.
- The location read back after it is set, with publishing blocked until it matches, because `resetChannel` doesn't cover Google Business.

### Edens Edge Offer draft (8 Nov 2026, later)

- **bundle.social allows 3 teams ("social sets") on the current plan.** Creating a fourth answered 403 "Social sets limit reached. Limit is 3 sets." The account has Local Launchpad, Agency – team and Copybot test, so the one team per client design needs a higher plan (or the limit raised) before any client is connected. Ask bundle.social what the limit is per plan. Later on 8 Nov Brandon upgraded to the $100 a month plan, and a fourth team, "Copybot test Edens Edge", was created and put on Edens Edge's location; the Offer draft ran again on it (kept as sent, deleted).
- **An Offer post needs a coupon code, a redeem link or terms** (400 "OFFER requires at least one offer field"). Copybot already holds an Offer post back from approval without a redeem link (gbp-posts/plan.js), so real posts are covered.
- An Offer post for Edens Edge (a free, no-obligation quote, from his confirmed values) was created as a bundle.social DRAFT on his location, read back with every Offer field kept as sent, and deleted (status DELETED). Drafts never publish: nothing reached his Google profile. The test team was then switched back to Local Launchpad's location, where the step 4 post stays up (Brandon, 8 Nov). Tool: `node tools/bundle-social-test.js offer-draft <file>`.
