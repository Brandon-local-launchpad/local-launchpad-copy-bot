'use strict';
// Dry run from the command line.
//   npm run wp:dry-run -- <record.json> [--reviewed] [--seo rankmath|yoast] [--all]
//   Site: WP_URL, WP_USER, WP_APP_PASSWORD (env), or --fake to start the fake
//   WordPress server (tests/fake-wp) with a draft homepage.
// Writes nothing to the site.
const fs = require('fs');
const path = require('path');
const { dryRun, formatDryRun } = require('./dry-run');

(async () => {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith('--') && /\.json$/.test(a));
  if (!file) { console.error('Usage: npm run wp:dry-run -- <record.json> [--reviewed] [--seo rankmath|yoast] [--fake] [--all]'); process.exit(2); }
  const record = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const seo = args.includes('--seo') ? args[args.indexOf('--seo') + 1] : 'rankmath';

  let site, close = () => {};
  if (args.includes('--fake')) {
    const { createFakeWp, seedHomepage, listen } = require('../tests/fake-wp/fake-wp');
    const fake = createFakeWp({ pages: [seedHomepage()] });
    const { server, url } = await listen(fake.app);
    site = { url, user: 'copybot', appPassword: 'test-app-password-not-real', staging: false };
    close = () => new Promise(r => { console.log(`\n(fake site writes: ${fake.state.writes})`); server.close(r); });
  } else {
    if (!process.env.WP_URL) { console.error('Set WP_URL, WP_USER and WP_APP_PASSWORD, or use --fake.'); process.exit(2); }
    site = { url: process.env.WP_URL, user: process.env.WP_USER, appPassword: process.env.WP_APP_PASSWORD, staging: process.env.WP_STAGING === 'yes' };
  }
  try {
    const r = await dryRun({ record, site, reviewed: args.includes('--reviewed'), seo });
    console.log(formatDryRun(r, { showSame: args.includes('--all') }));
  } finally { await close(); }
})().catch(e => { console.error('Dry run failed:', e.message); process.exit(1); });
