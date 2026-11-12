'use strict';
// The Review Us page as the plugin draws it, without a WordPress site: runs the plugin's own PHP
// under php-wasm (as tests/fixtures/wp-plugin-php.js does) and returns a whole page laid out like
// Given's template: the heading, the two lines of Elementor text with their [CV: key] tokens, and
// the [llp_review_funnel] star box. Used by the fake WordPress site (tests/fake-wp) at /review-us/.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const PLUGIN = path.join(root, 'wp-plugin/llp-copybot');

const INTRO = '<p class="thanks">Thanks for choosing [CV: company_name]. Your feedback really helps a local business like ours.</p><p class="owner">[CV: owner_name]</p>';

async function render({ values = {}, siteUrl }) {
  const { loadNodeRuntime } = await import('@php-wasm/node');
  const { PHP } = await import('@php-wasm/universal');
  const php = new PHP(await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 1 } }));
  const put = (rel, body) => { php.mkdir(path.posix.dirname(rel)); php.writeFile(rel, body); };
  for (const f of ['llp-copybot.php', 'redirects.php', 'review-funnel.php', 'client-value-keys.json']) put(`/plugin/${f}`, fs.readFileSync(path.join(PLUGIN, f)));
  for (const f of ['wp-stubs.php', 'review-box.php']) put(`/tests/${f}`, fs.readFileSync(path.join(__dirname, f)));
  put('/tests/review-box.json', JSON.stringify({ values, site_url: siteUrl, intro: INTRO }));
  const res = await php.run({ scriptPath: '/tests/review-box.php' });
  php.exit();
  let o;
  try { o = JSON.parse(res.text); } catch (_) { throw new Error(`The plugin's PHP did not print the star box: ${res.text.slice(0, 400)}`); }
  // The site's Elementor global colours (Given's staging template), which the box picks up
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Review Us</title>
<style>
  body{--e-global-color-primary:#0E210B;--e-global-color-secondary:#B9DC3B;--e-global-color-accent:#78AC1D;margin:0;background:#0E210B;color:#fff;font-family:Saira,"Segoe UI",sans-serif}
  main{max-width:520px;margin:0 auto;padding:48px 16px;text-align:center}
  h1{font-size:44px;text-transform:uppercase;margin:0 0 24px}
  .thanks,.owner{font-size:20px;font-weight:700;margin:0 0 14px}
</style></head><body><main><h1>How did we do?</h1>${o.intro}${o.box}</main></body></html>`;
}

module.exports = { render, INTRO };
