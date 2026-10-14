'use strict';
// Fixture: WordPress push, first slice. Payload builder, safety checks, and a dry
// run against the fake WordPress server. No API calls, no real site.
const path = require('path');
const root = path.join(__dirname, '../..');
const { mdToHtml, htmlToText } = require(path.join(root, 'wp/markdown.js'));
const { buildHomepagePayload, HOMEPAGE_FIELDS } = require(path.join(root, 'wp/homepage-map.js'));
const { checkRecord, checkTarget } = require(path.join(root, 'wp/safety.js'));
const { dryRun } = require(path.join(root, 'wp/dry-run.js'));
const { createFakeWp, seedHomepage, listen } = require(path.join(__dirname, '../fake-wp/fake-wp.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: WordPress push (payload, safety, dry run) ===\n');

const clean = require(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));      // 0 BLOCK, 5 FLAG, no stand-ins
const acceptance = require(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-acceptance-record.json')); // stand-ins

// ── Markdown → HTML ──
chk('Links and paragraphs become HTML; text is escaped; tokens kept',
  mdToHtml('Our [gardener](/gardener/) work & more.\n\nCall [CV: phone].') === '<p>Our <a href="/gardener/">gardener</a> work &amp; more.</p>\n<p>Call [CV: phone].</p>',
  mdToHtml('Our [gardener](/gardener/) work & more.\n\nCall [CV: phone].'), '<p>…<a>…</p>');
chk('htmlToText reverses it for the side by side', htmlToText(mdToHtml('A [b](/c/) d.\n\nE.')) === 'A [b](/c/) d.\n\nE.', '', 'round trip');

// ── Payload ──
const payload = buildHomepagePayload(clean);
chk('Payload has exactly the mapped ACF fields', Object.keys(payload.acf).sort().join() === HOMEPAGE_FIELDS.map(f => f[0]).sort().join(), Object.keys(payload.acf).length, HOMEPAGE_FIELDS.length);
chk('Tokens are left for WordPress to resolve', /\[CV: company_name\]/.test(payload.acf.home_hero_intro) && /\[CV: phone\]/.test(payload.acf.home_content_block_body), '', 'tokens kept');
chk('Cards: 7 rows, HTML text with the link, URL kept', payload.acf.home_services_cards.length === 7 && /<a href="\/gardener\/">gardener<\/a>/.test(payload.acf.home_services_cards[0].card_text) && payload.acf.home_services_cards[0].card_url === '/gardener', JSON.stringify(payload.acf.home_services_cards[0]).slice(0, 150), 'ok');
chk('Hidden sections: owner, reviews and logos off and empty', payload.acf.home_owner_show === false && payload.acf.home_owner_body === '' && payload.acf.home_reviews_show === false && payload.acf.home_trusted_show === false && payload.acf.home_trusted_logos.length === 0, '', 'off');
chk('CTA band heading and line', payload.acf.home_cta_band_heading === 'Ready to talk to a local landscaper?' && /^Tell us/.test(payload.acf.home_cta_band_line), '', 'band');
chk('Areas: area_name, link_text, page_url', payload.acf.home_areas_links[1].area_name && payload.acf.home_areas_links[1].page_url.startsWith('/locations/') && payload.acf.home_areas_links[0].page_url === '', JSON.stringify(payload.acf.home_areas_links.slice(0, 2)), 'rows');
chk('Rank Math meta by default', payload.meta.rank_math_title === clean.seo_title && payload.meta.rank_math_description === clean.meta_description, JSON.stringify(payload.meta), 'rank_math_*');
chk('Yoast adapter on request', buildHomepagePayload(clean, { seo: 'yoast' }).meta._yoast_wpseo_title === clean.seo_title, '', '_yoast_wpseo_title');
chk('Unknown SEO plugin is an error', (() => { try { buildHomepagePayload(clean, { seo: 'aioseo' }); return false; } catch (e) { return /Unknown SEO plugin/.test(e.message); } })(), '', 'throws');
chk('No buttons, rating line or trust lines pushed (they come from Client Values)', !('buttons' in payload.acf) && !Object.keys(payload.acf).some(k => /rating|trust_lines/.test(k)), '', 'absent');

// ── Safety ──
chk('Clean record, not reviewed: refused only for the 5 FLAGs', (() => { const r = checkRecord(clean); return r.length === 1 && /5 FLAG/.test(r[0]); })(), checkRecord(clean).join(' | '), '1 refusal');
chk('Clean record, reviewed: allowed', checkRecord(clean, { reviewed: true }).length === 0, checkRecord(clean, { reviewed: true }).join(' | '), 'none');
chk('Stand-in record: refused even when reviewed', checkRecord(acceptance, { reviewed: true }).some(x => /stand-in values \(owner_why, owner_promise, owner_photo, hours\)/.test(x)), checkRecord(acceptance, { reviewed: true }).join(' | '), 'stand-ins');
chk('A BLOCK left: refused', checkRecord({ ...clean, VALIDATION: { ...clean.VALIDATION, block: 2 } }, { reviewed: true }).some(x => /2 BLOCK/.test(x)), '', 'refused');
chk('Unvalidated or gate-blocked: refused', checkRecord({ blocked: true, VALIDATION: { status: 'not run' } }).length === 2, '', '2 refusals');
chk('Published page: refused unless the site is staging', checkTarget({ status: 'publish' }, { url: 'x', staging: false }).length === 1 && checkTarget({ status: 'publish' }, { url: 'x', staging: true }).length === 0 && checkTarget({ status: 'draft' }, { url: 'x' }).length === 0, '', 'draft/staging only');

// ── Dry run against the fake WordPress ──
(async () => {
  const fake = createFakeWp({ pages: [seedHomepage()] });
  const { server, url } = await listen(fake.app);
  const site = { url, user: 'copybot', appPassword: 'test-app-password-not-real' };
  try {
    const r = await dryRun({ record: clean, site, reviewed: true });
    chk('Dry run: page found by the site\'s front page setting', r.page && r.page.id === 7 && r.page.status === 'draft', JSON.stringify(r.page), 'page 7 draft');
    chk('Dry run: reviewed clean record on a draft is pushable', r.pushable && !r.refusals.length, r.refusals.join(' | '), 'pushable');
    chk('Dry run: nothing written to the site', fake.state.writes === 0, fake.state.writes, 0);
    const c = Object.fromEntries(r.changes.map(x => [x.field, x]));
    chk('Diff: H1 changed from the old format', c.home_hero_h1.change === 'changed' && c.home_hero_h1.current === 'Gardener Southampton | Edens Edge' && c.home_hero_h1.next === 'Landscaper Southampton', JSON.stringify(c.home_hero_h1), 'changed');
    chk('Diff: card 1 changed, card 2 added', c['home_services_cards[1].card_text'].change === 'changed' && c['home_services_cards[2].card_name'].change === 'added', '', 'changed/added');
    chk('Diff: Rank Math title changed', c['meta.rank_math_title'].change === 'changed', JSON.stringify(c['meta.rank_math_title']), 'changed');

    const r2 = await dryRun({ record: clean, site });
    chk('Dry run without the review tick: refused, still nothing written', !r2.pushable && fake.state.writes === 0, r2.refusals.join(' | '), 'refused');

    fake.state.pages.get(7).status = 'publish';
    const r3 = await dryRun({ record: clean, site, reviewed: true });
    chk('Dry run on a published homepage: refused', !r3.pushable && r3.refusals.some(x => /published/.test(x)), r3.refusals.join(' | '), 'published refusal');
    fake.state.pages.get(7).status = 'draft';

    const bySlug = await dryRun({ record: clean, site: { ...site, homepageSlug: 'home' }, reviewed: true });
    chk('Dry run: homepage found by slug too', bySlug.page && bySlug.page.id === 7, '', 'page 7');

    let authErr = '';
    try { await dryRun({ record: clean, site: { ...site, appPassword: 'wrong' } }); } catch (e) { authErr = e.message; }
    chk('Wrong Application Password: clear 401 error', /401/.test(authErr), authErr, '401');
    let httpErr = '';
    try { await dryRun({ record: clean, site: { ...site, url: 'http://example.com' } }); } catch (e) { httpErr = e.message; }
    chk('Plain http to a real host is refused (https needed)', /need https/.test(httpErr), httpErr, 'https');
  } finally { server.close(); }

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
