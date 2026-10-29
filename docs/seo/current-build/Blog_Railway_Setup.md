# The blog branch on Railway: a test environment, and the daily job's cron service (29 Oct 2026)

Two set-ups, both in the Railway dashboard. There is no Railway CLI or token on this machine, so these are the clicks. The app reads its variables from the environment it runs in; nothing in the repo changes between environments except the branch.

## 1. A `blog` environment, like `ui-redesign`

1. Railway dashboard, the Copybot project. Top left, the environment switcher (it says `production`). Choose **New Environment**.
2. Name it `blog`. Pick **Duplicate** from `production` (the dialog offers to duplicate an existing environment): that copies the Copybot service, the Postgres service and every variable. Create it.
3. Switch to the `blog` environment. Open the **Copybot** service, **Settings**, **Source**: set **Branch** to `blog`. Turn **Wait for CI** off if it is on. Save; Railway deploys the branch.
4. Still in the Copybot service, **Variables**: click `DATABASE_URL`. It must read `${{Postgres.DATABASE_URL}}` where Postgres is the Postgres service **inside the `blog` environment** (Railway names the service it references). If it is a pasted string, or references the production environment's Postgres, replace it with the reference to this environment's own Postgres. This keeps the test copy's data apart from the live app's.
5. The variables the blog features need, on the Copybot service in `blog` (copied by the duplicate if they are on production; check each is there):
   - `ANTHROPIC_API_KEY` (the posts, the relevance judge, the claims review)
   - `PERPLEXITY_API_KEY` (the bank's Perplexity run, optional: the file is already in the repo)
   - `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` (People also ask and the H1 research)
   - `APP_PASSWORD` and `APP_SECRET` (the login)
   - `COPYBOT_SECRET_KEY` (the WordPress Application Passwords, encrypted at rest)
   - `BLOG_JOB_SECRET` (the daily job; section 2 below)
6. **Settings**, **Networking**: **Generate Domain** if the duplicated service has none. That address is the test copy.
7. On the test copy, once it is up: log in, **Trade facts**, the landscaper row: **Load file** (the bank in the deploy, `blog-bank/landscaper.md`, saved over the row, unapproved), then **Approve** with your name. Then a client with a page map: **Pages**, the **Blog** filter, **Build the queue**.

The Postgres in the new environment starts empty: the test copy has no clients until one is added (or the demo seed runs: `SEED_DEMO_CLIENT=1` on the service seeds the demo client at start up).

## 1a. Getting the clients into the blog environment (the data)

A duplicated environment gets its own, empty Postgres: no clients. The route that never runs the blog branch against the production database is `tools/copy-database.js` (built for the ui-redesign preview, 27 Oct): it reads production's tables with SELECT only and writes them into the blog environment's Postgres. The blog branch's tables and columns are made by the app itself at start up (the `ensure…` calls in server.js), against whatever DATABASE_URL it runs with, so the order is: deploy the blog service against the blog Postgres first, copy second.

1. Section 1 done and the Copybot service in `blog` deployed once and up (its log says "DB schema ready"): the blog Postgres now has every table, the new blog ones included. Production's database has not been touched: the blog service's DATABASE_URL is the blog Postgres.
2. The two connection strings, from Railway: each Postgres service, **Variables**, `DATABASE_PUBLIC_URL` (the proxy address reachable from your machine; `DATABASE_URL` is the private one and only works inside Railway). Copy production's and the blog environment's. Neither goes in a file or a message.
3. On your machine, in the repo (either checkout), a dry run first: it lists every table with its row count and writes nothing:
   ```
   node tools/copy-database.js --from "<production DATABASE_PUBLIC_URL>" --to "<blog DATABASE_PUBLIC_URL>"
   ```
4. The same with `--yes` to copy. The blog tables are emptied and filled from production, table by table, parents first; a column production has and the blog branch has too is copied, the blog branch's new columns stay at their defaults. The tool refuses to write into the URL named as DATABASE_URL in the local .env, and refuses when the target is the source. A minute or two for the whole database.
5. The test copy then shows every client as production has it today (Edens Edge's record, research, page map, custom values, trade facts flags). It is a copy: nothing done on it reaches production. Run the copy again whenever you want it fresh (it empties and refills).

Two things to do on the test copy straight after the copy:
- The WordPress connections came with it (`wp_connections`, decrypted with the same `COPYBOT_SECRET_KEY` the duplicate copied). On the test copy, before any push, replace each client's connection with Given's staging site or clear it, so a push from the test copy can never reach a live client site.
- The landscaper bank: Trade facts, the landscaper row, **Load file** then **Approve** (the copy carries production's bank table, which may be the old one or empty).

A copy of one client alone is not built; the whole database is the copy, which is the simpler and safer route for a test environment.

## 2. The daily job's cron service

The job is one HTTP call a day to the app, which then runs every client (`scripts/blog-daily.js` calls `POST /api/blog/daily-run-all`). A Railway cron service runs that script on a schedule and exits.

1. **Generate the secret** once, on your machine (PowerShell):
   ```
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
   A 48 character string. Keep it: it goes on two services.
2. In the environment the app runs in (`blog` first; `production` later), open the **Copybot** service, **Variables**, add `BLOG_JOB_SECRET` with that string. Redeploy if Railway asks.
3. In the same environment, **+ New** (top right), **GitHub Repo**, pick this repository. A second service appears; rename it `blog-daily` (Settings, Service name).
4. `blog-daily`, **Settings**, **Source**: Branch `blog` (`main` once the blog branch is merged).
5. `blog-daily`, **Settings**, **Deploy**:
   - **Custom Start Command**: `node scripts/blog-daily.js`
   - **Cron Schedule**: `30 9 * * *` (Railway reads cron in UTC: 09:30 in winter, 10:30 in summer, after the posts' 09:00 publish time either way). Railway runs the start command on that schedule and expects it to exit, which the script does.
   - No domain is needed on this service.
6. `blog-daily`, **Variables**:
   - `COPYBOT_URL` = the Copybot service's address in this environment (`https://…up.railway.app`, no trailing slash)
   - `BLOG_JOB_SECRET` = the same string as on the Copybot service
7. Test it without waiting for the schedule: `blog-daily`, **Deployments**, the latest, **Restart** (or the Deploy button): the deploy log shows what the job did per client. For a rehearsal that changes nothing, add `DRY=1` to its variables for one run and remove it after; `BLOG_CLOCK=YYYY-MM-DD` runs it as if on another day.

What the job does each day is in `docs/seo/current-build/STATUS_Homepage_v20_Build.md` under stage 8, and on the Pages tab's Blog filter (the Daily job card shows its log, with "What would it do today?" for a dry run from the app).
