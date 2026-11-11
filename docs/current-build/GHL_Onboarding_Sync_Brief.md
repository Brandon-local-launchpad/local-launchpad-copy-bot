# Brief for Claude Code: receive onboarding answers from GoHighLevel

## What this is for

New Local Launchpad clients go through a 6-step onboarding funnel hosted on GoHighLevel (GHL). As they go, each step sends their answers to a GHL workflow called "Onboarding: Sync answers". We want that workflow to forward every send to Copybot, so the answers land on the client's record and turn into Tracker steps for the team, with nobody retyping anything.

Build a webhook endpoint in Copybot that receives these sends, matches them to the right client, saves the answers, and creates or updates Tracker steps.

Before writing code, read the existing codebase: how clients are stored, how the Record tab fields work (including the "Hand" marker for human-entered values and the "Source tags" line), how the "Onboarding form and set-up" tab gets its Fillout submission, and how Tracker "Needs a person" steps are created. Follow those existing patterns rather than inventing new ones.

## The endpoint

- `POST /api/webhooks/ghl-onboarding` (or whatever fits the existing route naming).
- Authentication: GHL will send a shared secret in a header, `X-LL-Secret`. Store the secret in an environment variable. Reject anything without the correct secret with 401. Compare in constant time.
- Always return 200 quickly once the payload is accepted and stored, even if matching fails, so GHL doesn't retry and create duplicates. Do the matching and processing after storing the raw payload.
- Log every raw payload to a table (for example `onboarding_events`) with received time, stage, matched client id (nullable) and the full JSON. This is the audit trail.

## The payload GHL will send

JSON. All values are strings; any can be empty.

```json
{
  "ghl_contact_id": "aB3xK9pQ2...",
  "email": "john@johnselectrical.co.uk",
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+447700900123",
  "company_name": "Johns Electrical",
  "stage": "complete",
  "gbp_status": "Created a new one",
  "gbp_category": "Electrician",
  "domain_provider": "GoDaddy",
  "domain": "johnselectrical.co.uk",
  "provider_login_email": "john@johnselectrical.co.uk",
  "domain_name_ideas": "",
  "facebook_page": "Existing page: facebook.com/johnselectrical",
  "instagram_account": "New account: johnselectrical",
  "summary": "Stage: complete | GBP: Created a new one (Electrician) | Domain: GoDaddy, johnselectrical.co.uk, login email john@johnselectrical.co.uk | Facebook: Existing page: facebook.com/johnselectrical | Instagram: New account: johnselectrical"
}
```

Possible values:

- `stage`: `started`, `gbp`, `domain-access-request`, `domain`, `citations`, `complete`. A client sends several of these, in roughly that order. Every send carries everything answered so far, so a later send is a superset of an earlier one, but a field can still arrive empty if the client switched devices partway through. **Never overwrite a saved value with an empty one.**
- `gbp_status`: `Already had one`, `Created a new one`, `Started creating, not finished`, or empty.
- `domain_provider`: `123 Reg`, `IONOS`, `GoDaddy`, `Squarespace`, `Fasthosts`, `Namecheap`, `Wix`, `Wix (not connected to a website)`, `Hostinger`, `Cloudflare`, `Other provider`, `No domain yet`, or empty.
- `provider_login_email`: only filled for GoDaddy and IONOS (we send those clients an access request to that address).
- `domain_name_ideas`: only filled when `domain_provider` is `No domain yet`.
- Passwords are never sent. Do not add anything that would store one.

## Matching the payload to a client

In this order:

1. A client whose stored GHL contact id equals `ghl_contact_id`.
2. A client whose email matches `email`, case-insensitive and trimmed.
3. No match: do not create a client automatically. Put the event in an "Unmatched onboarding" list visible in Copybot (a small section on the Dashboard is enough), showing the summary, email and company name, with a way to attach it to an existing client. Attaching it processes the event as normal.

When a match is made by email and the client has no GHL contact id yet, save `ghl_contact_id` on the client so later sends match on step 1.

## Saving the answers

Add these to the client record where they don't already exist, in the most sensible place on the Record tab (an "Onboarding" group is fine):

- Onboarding stage, plus the time of the latest send for each stage
- GBP status
- Domain provider
- Provider login email
- Domain name ideas
- Facebook page
- Instagram account

Map onto existing fields where they already exist:

- `domain` → **Live domain**, but only if Live domain is empty. If Live domain already has a different value, don't overwrite it; flag the difference on the record instead.
- `gbp_category` → **Primary category** suggestion only. Do not overwrite a Primary category marked "Hand".
- `email`, `phone`, `company_name` → only fill these Contact and Business fields if they are empty.

General rules:

- Never overwrite a value marked "Hand".
- Never replace a saved value with an empty one.
- Record the source of each value as "Onboarding (GHL)" using the existing source-tag mechanism.

## Tracker steps ("Needs a person")

Create or update these from the latest saved answers. Make them idempotent: one step per kind per client, updated in place, never duplicated by repeated sends. Close a step automatically if a later send makes it no longer apply (for example, the client changes provider).

| When | Step to create | Detail to show |
|---|---|---|
| Domain provider is GoDaddy | Send the GoDaddy access request | Login email and domain. Done in The Hub by GoDaddy Pro: Manage Sites → Add Site → add new client with "Client account access: Yes" |
| Domain provider is IONOS | Send the IONOS access request | Login email and domain |
| Squarespace, Namecheap, Wix, Hostinger or Cloudflare | Accept the domain invite from [provider] | Domain |
| 123 Reg or Fasthosts | Log in with the details sent on WhatsApp | Domain. Reminder: delete the WhatsApp message after logging in |
| Wix (not connected to a website) | Message the client about their Wix domain | Domain |
| Other provider | Check what access the client set up | Domain |
| No domain yet | Choose and buy the domain (domain-buying SOP) | Name ideas |
| GBP status is "Already had one" or "Created a new one" | Accept the Google Business Profile manager invite | Category if given |
| GBP status is "Started creating, not finished" | Help the client finish their Google Business Profile | |
| Facebook or Instagram contains "not sent yet", or is empty once stage is `complete` | Chase the client for their [Facebook page / Instagram username] | |

For `domain-access-request` with GoDaddy or IONOS, mark the step as urgent if the Tracker supports it, because the client is waiting for that email.

## When stage is `complete`

- Mark the client's onboarding as complete, with the time.
- Show it on the client page, near the "Onboarding form and set-up" tab, as a short read-only summary of the answers above.
- Add a "Done by Copybot" Tracker line such as "Onboarding answers received from GHL".

## Optional, only if Copybot already sends notifications

When a `domain-access-request` or `complete` event is processed, notify the people assigned to the client through whatever channel Copybot already uses. Don't add a new notification channel just for this.

## Testing

- Unit tests for matching (by contact id, by email, unmatched), for the "never overwrite Hand or with empty" rules, and for Tracker step idempotency (send the same payload three times: still one step).
- A test that a payload with the wrong or missing `X-LL-Secret` is rejected and not stored.
- A small script or documented curl command that posts the example payload above to a local or staging instance, so the GHL side can be tested before going live.

## When you're done

Tell me:

1. The live endpoint URL.
2. The name of the environment variable holding the secret, and confirm it's set in production. Don't paste the secret itself into chat.
3. Any Record fields you added or mapped differently from this brief.
