# The listings inbox: Google Cloud OAuth set-up (3 Nov 2026)

Copybot reads listings@locallaunchpad.co.uk through the Gmail API. It needs an OAuth client (a client id and secret) and one refresh token for that one user. Three values go on Railway: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`. Nothing else is stored. Scope: `gmail.modify` (read the messages, mark them read, and send; the only email Copybot sends is the review replies notice to a client's approver, `reviews/notify.js`, since 8 Nov 2026; nothing is forwarded or deleted). The same three variables on the `reviews-sync` cron service turn those emails on.

## Steps for Brandon

1. **Google Cloud project.** Sign in to https://console.cloud.google.com/ as a Workspace admin (brandon@locallaunchpad.co.uk). Top bar, project picker, **New project**: name it `Copybot listings`, organisation locallaunchpad.co.uk. Create, then select it.
2. **Turn on the Gmail API.** Left menu, **APIs & Services**, **Library**, search "Gmail API", **Enable**.
3. **The consent screen.** **APIs & Services**, **OAuth consent screen** (Google now calls it "Google Auth Platform", **Branding**). Choose **Internal** (only locallaunchpad.co.uk accounts can sign in, so no Google review). App name `Copybot listings`, support email your own, developer contact your own. Save.
4. **The scope.** On the same screen, **Data access** (or **Scopes**), **Add or remove scopes**, filter for Gmail, tick `https://www.googleapis.com/auth/gmail.modify`, **Update**, **Save**.
5. **The OAuth client.** **APIs & Services**, **Credentials**, **Create credentials**, **OAuth client ID**. Application type **Desktop app** (the token script runs on your machine and Google returns to localhost). Name `Copybot listings desktop`. **Create**. Copy the **Client ID** and **Client secret** (or download the JSON; the two values are `client_id` and `client_secret`).
6. **Put the two values in `.env`** on the machine that runs the script (never commit them):
   ```
   GMAIL_CLIENT_ID=...apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=...
   ```
7. **Get the refresh token.** In the repo:
   ```bash
   node tools/gmail-auth.js
   ```
   It prints a link. Open it in a browser (an incognito window is easiest), sign in as **listings@locallaunchpad.co.uk** (not your own account), accept the scope, and the browser returns to `http://localhost:53682/`. The terminal prints the refresh token once.
8. **Railway.** On the Copybot service, add the three variables: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`. Redeploy (Railway does it on save). The log says `[inbox] polling listings@... every minute` when it is on; the Directories page shows the last poll under "Listings inbox".
9. **Check.** Send a test email from any account to `ednes-edge-testing@listings.locallaunchpad.co.uk` (the slug of the live test client, which is named "ednes edge testing" with that spelling; a client called Edens Edge would be `edens-edge@…`; every client's address is on its Citations tab). Within a minute it appears in the inbox log on the Directories page as "ignored: unknown sender", which is right: only a directory's domain is acted on. To let a directory's emails through, put its sending domain on the directory row (Edit, "Email sender domains"), for example `mail.yell.com` for Yell, once you see what they use.

## The address form

The subdomain set-up (`<slug>@listings.locallaunchpad.co.uk`) is done and working: the secondary domain in Workspace, the MX and SPF records at GoDaddy, the catch-all routing rule with the X-Gm-Original-To header (the decisions doc, 3 Nov). Nothing more is needed for a new client: addresses are invented on the fly. Plus addressing (`listings+<slug>@locallaunchpad.co.uk`) would need none of that DNS or routing, since Gmail delivers any plus form to the mailbox, but many directory sign-up forms reject a `+` in an email address, so the subdomain stays the one to give out. Copybot matches both forms, so either reaches the right client.

## What is acted on

Only an email whose sender passed SPF or DKIM for its own domain (Gmail's Authentication-Results header; a DMARC pass counts too) is acted on. A message from a directory's domain that fails both is recorded as "not authenticated" and its links are never opened.

## What the poller does

- Every minute: the inbox and spam, messages from the last seven days, skipping any it has already recorded.
- Client: the address in To, X-Gm-Original-To or Delivered-To that ends in `@listings.locallaunchpad.co.uk`, matched to the client by slug.
- Directory: the sender's domain against the row's "Email sender domains" first, then the directory's own domain.
- Known client and directory: a plain confirmation link (confirm, verify, activate, validate; not a login page) is opened once with a GET and the row moves from awaiting email verification to awaiting approval; a code is shown on the row; a link that needs a browser is shown on the row; anything else is recorded on the row.
- Every message is recorded with what was done, then marked read. Nothing is forwarded or deleted; the poller sends nothing.

## If the token stops working

Google revokes a refresh token when the user's password changes, when the client is deleted, or after six months of no use on an app in "Testing" status (an **Internal** app is not in testing, so this last one does not apply). Run step 7 again and replace `GMAIL_REFRESH_TOKEN`.
