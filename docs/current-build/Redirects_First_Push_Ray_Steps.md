# First real redirect push: Ray's steps

For Ray, on the Edens Edge staging site: https://mediumturquoise-parr-749549.hostingersite.com

**What this proves:** that Copybot's redirects work against real Rank Math, which the fixtures can't show. It writes only to the staging site, and everything is rolled back at the end. Visitors to any live site see nothing. It takes about 15 minutes.

**Why the Copybot side uses a test client:** Edens Edge has no live domain stored on its record, and a test shouldn't change its record. So the test uses the URLs of southamptonhomes.co.uk, through a client called **Site audit test (Southampton Homes)**. That client points at the Edens Edge staging site, and Edens Edge's own record isn't touched. It has been created, with the staging connection copied still encrypted, so you don't need to enter any passwords in Copybot. When the test is over, Brandon archives it.

## Part 1: on the staging site's WordPress admin

1. **Install the plugin.** Go to Plugins, then Add New, then Upload Plugin, and choose `wp-plugin/dist/llp-copybot-0.3.0.zip` from the Copybot repo.
   - Choose **Replace current with uploaded** when WordPress asks. Don't delete the old one first, because that can clear its settings.
   - Check that Plugins now shows **Local Launchpad Copybot, version 0.3.0**, and that it's active.
2. **Check Rank Math is active.** It must show as active under Plugins. If it's there but inactive, activate it. If it isn't there at all, install **Rank Math SEO** from Add New and activate it. Tell Brandon if you had to do this, because Copybot's connection for this site says Rank Math.
3. **Turn on Redirections.** Go to Rank Math, then Dashboard (Modules), and turn on the **Redirections** module.
4. **Make sure Rank Math has no redirects for these three addresses.** Go to Rank Math, then Redirections. If any of these are listed, delete them, because Copybot refuses to overwrite a redirect it didn't make:
   - `/garden-design-service`
   - `/garden-design-service?id=5`
   - `/inspiration`
5. **Check the new screen.** Go to Settings, then **Copybot redirects**. It should say **0 redirects from Copybot** and offer a Turn on button. **Don't press it.**

## Part 2: in Copybot

Open the client **Site audit test (Southampton Homes)**, on the **Site audit** tab.

6. **Scan old site.** Confirm, and wait about a minute. It spends about 6 cents on DataForSEO.
7. **Upload the test file.** Press **Upload Search Console file** and choose `docs/site-audit/test/first-push-search-console.csv` from the repo. It adds one old URL with a query string, which is the case Rank Math can't serve by itself. Wait for the list to rework.
8. **Check the map.** You should see these:

   | Old URL | Decision | Redirect |
   |---|---|---|
   | `/` | Keep | None |
   | `/contact` | Keep | None |
   | `/garden-design-service` | Merge | 301 |
   | `/garden-design-service?id=5` | Merge | 301 |
   | `/inspiration` | Retire | 410 |

   There will also be a closed group saying **50 images, no action needed**.
9. **Approve all suggestions.**
10. Under **Redirects on staging**, press **Dry run**. It should say a push would be allowed, with 3 to add. If it refuses, stop and send Brandon the message it shows.
11. Press **Push, inactive**, and confirm. It should say **Pushed 3 redirects, all inactive, and the read back matches.**
12. **Look at Rank Math, then Redirections, on staging.** The three should be there under **Inactive**. Open the staging site's old address in a private window, `/inspiration` on the staging domain. It should be an ordinary 404, because the redirects are off.
13. Under **Pre launch check**, press **Run the check**. **Expect BLOCKs**, because the destination pages haven't been built on staging. Send Brandon what it says.
14. Press **Test on staging**, and confirm. It turns the three on, requests each, and turns them off again. Each should answer as the table shows, and it should end with **All switched back off**.
15. Back in Rank Math, confirm the three are **Inactive** again. On staging, go to Settings, then Copybot redirects, and confirm it says **0 on**.
16. Under **Redirects on staging**, press **Roll back the last push**, and confirm. It should say **3 removed, 0 restored, 0 left on the site**.
17. In Rank Math, confirm the three are gone. On Settings, then Copybot redirects, it should say **0 redirects from Copybot**.

**Then stop, and send Brandon what steps 11, 13, 14 and 16 said on screen.**

## If something goes wrong

- **The redirects stay on.** On staging, go to Settings, then Copybot redirects, and press **Turn off Copybot redirects**.
- **Step 14 reports something isn't firing.** Hostinger's cache may be serving an old answer. Purge the LiteSpeed cache on staging and press Test on staging again. Tell Brandon either way, because the launch needs to allow for it.
- **Anything else.** Don't retry it. Send Brandon the message on screen.

**Don't do any of this on a live customer site.** Copybot refuses, but only a person can check the plugin isn't being installed somewhere it shouldn't be. This plugin version also affects homepage pushes: any site still on an older version has its copy pushes refused until it's updated.
