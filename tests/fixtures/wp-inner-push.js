'use strict';
// Fixture: pushing the copy into category, service and location pages (13 Nov 2026): the mapping
// from a record to the site's fields (wp/inner-map.js), the push, read-back and rollback on an
// entry in its post type (wp/push.js, wp/client.js findInnerPage), and which pages are ready
// (wp/copy-plan.js). Real Edens Edge test run records, the fake WordPress site, no API calls.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const { fieldsFor, groupsFor, buildInnerPayload } = require(path.join(root, 'wp/inner-map.js'));
const { INNER_GROUPS, KIND_TO_TYPE } = require(path.join(root, 'wp/acf-schema.js'));
const { getPageType } = require(path.join(root, 'page-types'));
const { push, rollback } = require(path.join(root, 'wp/push.js'));
const { dryRun } = require(path.join(root, 'wp/dry-run.js'));
const { createMemoryStore } = require(path.join(root, 'wp/push-store.js'));
const { copyPlan, acceptedQuotes } = require(path.join(root, 'wp/copy-plan.js'));
const { createFakeWp, seedHomepage, listen } = require(path.join(__dirname, '../fake-wp/fake-wp.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const J = JSON.stringify;
console.log('\n=== FIXTURE: pushing the copy into category, service and location pages ===\n');

const load = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'data/inner-records', f), 'utf8'));
const CAT = load('category-town.json'), SVC = load('service-town.json'), LOC = load('location.json');

(async () => {
  // ── The fields ──
  for (const [set, type] of [['cat', 'category'], ['svc', 'service'], ['loc', 'location']]) {
    const schema = groupsFor(set).flatMap(g => g.fields);
    const fields = fieldsFor(set);
    const names = fields.map(f => f[0]);
    const copybots = schema.filter(f => f.push !== false && f.type !== 'image').map(f => f.name);
    chk(`${type}: every field Copybot fills is pushed, and none of the site's own (images, alt text, the gallery)`, J(names) === J(copybots) && !names.some(n => /image|_alt$|gallery/.test(n)), J(names.filter(n => !copybots.includes(n))), 'the same list');
    const wrong = fields.filter(([n, kind, subs]) => { const f = schema.find(x => x.name === n); return f.type !== KIND_TO_TYPE[kind] || (kind === 'repeater' && Object.entries(subs).some(([s, k]) => (f.sub_fields.find(x => x.name === s) || {}).type !== KIND_TO_TYPE[k])); });
    chk(`${type}: each field's kind is its ACF type, repeater rows too, with no image or icon in a row`, !wrong.length && fields.filter(f => f[1] === 'repeater').every(f => !Object.keys(f[2]).some(s => /image|icon|gallery/.test(s))), J(wrong.map(f => f[0])), 'none');
    const wp = getPageType(type).wp;
    chk(`${type}: the page type carries the mapping (fields, groups, payload, the page finder)`, wp.fields.length === fields.length && wp.groups.length === groupsFor(set).length && typeof wp.findPage === 'function' && !!wp.notFound, `${wp.fields.length} fields, ${wp.groups.length} groups`, '');
  }
  chk('All 34 inner groups belong to a page type', groupsFor('cat').length + groupsFor('svc').length + groupsFor('loc').length === INNER_GROUPS.length, '', '34');

  // ── The payload, from real records ──
  const pc = buildInnerPayload(CAT, 'cat'), ps = buildInnerPayload(SVC, 'svc'), pl = buildInnerPayload(LOC, 'loc');
  const undef = p => Object.entries(p.acf).filter(([, v]) => v === undefined || v === null || v === 'HIDDEN' || (typeof v === 'string' && /HIDDEN/.test(v))).map(([k]) => k);
  chk('Every field has a value, and the word HIDDEN never reaches the site', !undef(pc).length && !undef(ps).length && !undef(pl).length, J([undef(pc), undef(ps), undef(pl)]), 'none');
  chk('Category: the H1 and headings as code decided them', pc.acf.cat_hero_h1 === CAT.cat_hero_h1 && pc.acf.cat_services_h2 === CAT.cat_services_h2 && pc.acf.cat_faq_h2 === CAT.cat_faq_h2, pc.acf.cat_hero_h1, CAT.cat_hero_h1);
  chk('Category: prose is HTML paragraphs, with Markdown links turned into links', /^<p>/.test(pc.acf.cat_content_body) && !/\]\(/.test(pc.acf.cat_content_body) && (!/\]\(/.test(CAT.cat_content_body) || /<a href="\//.test(pc.acf.cat_content_body)), pc.acf.cat_content_body.slice(0, 160), '<p>…');
  chk('Category: the cards, blocks, steps and questions are rows with the site\'s sub fields, and card_target stays behind',
    pc.acf.cat_services_cards.length === CAT.cards.length && J(Object.keys(pc.acf.cat_services_cards[0])) === J(['card_name', 'card_text', 'card_url']) && pc.acf.cat_block4.length === CAT.block4.length && J(Object.keys(pc.acf.cat_block4[0])) === J(['card_title', 'card_body']) && pc.acf.cat_process_steps.length === CAT.steps.length && pc.acf.cat_faq_items.length === CAT.faq_items.length && J(Object.keys(pc.acf.cat_faq_items[0])) === J(['faq_question', 'faq_answer']),
    J(Object.keys(pc.acf.cat_services_cards[0])), '');
  chk('A hidden reviews section goes as off, with no heading and no rows', pc.acf.cat_reviews_show === false && pc.acf.cat_reviews_h2 === '' && J(pc.acf.cat_reviews) === '[]', J([pc.acf.cat_reviews_show, pc.acf.cat_reviews_h2]), 'false, ""');
  const shown = buildInnerPayload({ ...CAT, cat_reviews_show: true, cat_reviews_h2: 'What Customers Say', reviews: [{ text: 'Great deck.', name: 'Sam', town: 'Romsey' }] }, 'cat');
  chk('Shown reviews: the rows carry the review, the name and the town', shown.acf.cat_reviews_show === true && J(shown.acf.cat_reviews) === J([{ review_text: '<p>Great deck.</p>', review_name: 'Sam', review_town: 'Romsey' }]), J(shown.acf.cat_reviews), '');
  chk('A town page\'s villages are a list with no link; no price line, no "also offered" and no "also cover" go as empty', pc.acf.cat_areas_links.length === CAT.cat_areas_links.length && pc.acf.cat_areas_links.every(a => a.area_name && a.page_url === '') && pc.acf.cat_cost_price_line === '' && pc.acf.cat_areas_also_cover === '', J(pc.acf.cat_areas_links.slice(0, 2)), '');
  const base = buildInnerPayload({ ...CAT, cat_areas_links: [{ name: 'Romsey', url: '/locations/romsey/deck-builder' }], cat_areas_also_cover: ['Totton', 'Eastleigh', 'Hedge End'], cat_also_offered: 'We also offer [decking repairs](/services/decking-repairs).' }, 'cat');
  chk('A base page: linked towns keep their URL, "also cover" is one line of names, "also offered" is HTML', J(base.acf.cat_areas_links) === J([{ area_name: 'Romsey', page_url: '/locations/romsey/deck-builder' }]) && base.acf.cat_areas_also_cover === 'Totton, Eastleigh, Hedge End' && base.acf.cat_also_offered === '<p>We also offer <a href="/services/decking-repairs">decking repairs</a>.</p>', J([base.acf.cat_areas_also_cover, base.acf.cat_also_offered]), '');
  chk('Service: What\'s included items are plain text rows; More Services cards carry a name and a URL', ps.acf.svc_included_items.length === SVC.included.length && J(Object.keys(ps.acf.svc_included_items[0])) === J(['item_title', 'item_text']) && !/<p>/.test(ps.acf.svc_included_items[0].item_text) && ps.acf.svc_more_cards.length === SVC.more_cards.length && (!SVC.more_cards.length || J(Object.keys(ps.acf.svc_more_cards[0])) === J(['card_name', 'card_url'])), J(ps.acf.svc_included_items[0]), '');
  const noMore = buildInnerPayload({ ...SVC, svc_more_h2: 'HIDDEN', svc_more_intro: 'HIDDEN', more_cards: [] }, 'svc');
  chk('Service: no sibling services, More Services goes as empty', noMore.acf.svc_more_h2 === '' && noMore.acf.svc_more_intro === '' && J(noMore.acf.svc_more_cards) === '[]', J([noMore.acf.svc_more_h2, noMore.acf.svc_more_intro]), '');
  chk('Service: a fixed FAQ answer goes as the whole answer', ps.acf.svc_faq_items.every((f, i) => f.faq_answer.includes(String(SVC.faq_items[i].faq_answer).split(' ').slice(0, 3).join(' ').replace(/&/g, '&amp;').slice(0, 12))), J(ps.acf.svc_faq_items[0]), '');
  chk('Location: the town\'s cards, the content block and the final CTA', pl.acf.loc_services_cards.length === LOC.cards.length && /^<p>/.test(pl.acf.loc_content_body) && pl.acf.loc_final_cta_h2 === LOC.loc_final_cta_h2 && !('loc_areas_also_cover' in pl.acf), J(Object.keys(pl.acf).slice(0, 6)), '');
  chk('What the template fills is not sent: the rating line, the trust lines, the buttons, the breadcrumb', ![pc, ps, pl].some(p => Object.keys(p.acf).some(k => /rating_line|trust_lines|buttons|breadcrumb|focus_keyword|page_slug/.test(k))), '', 'none');
  chk('The SEO title and description go to Rank Math, or Yoast when the site is on it', pc.meta.rank_math_title === CAT.seo_title && pc.meta.rank_math_description === CAT.meta_description && buildInnerPayload(CAT, 'cat', { seo: 'yoast' }).meta._yoast_wpseo_title === CAT.seo_title, J(pc.meta), '');
  chk('[CV: key] tokens stay in the copy for the site to fill', J(CAT).includes('[CV: ') ? J(pc.acf).includes('[CV: ') : true, '', 'kept');

  // ── The push, on entries in their post types ──
  const entries = () => [
    { id: 501, post_type: 'category-location', status: 'draft', title: 'Deck Builder Romsey', path: '/locations/romsey/deck-builder' },
    { id: 502, post_type: 'location-service', status: 'draft', title: 'Fencing Romsey', path: '/locations/romsey/fencing' },
    { id: 503, post_type: 'location', status: 'draft', title: 'Romsey', path: '/locations/romsey' },
  ];
  const servers = [];
  const start = async opts => { const wp = createFakeWp({ pages: [seedHomepage()], innerPages: entries(), ...opts }); const l = await listen(wp.app); servers.push(l.server); return { ...wp, site: { url: l.url, user: 'copybot', appPassword: 'test-app-password-not-real', staging: true } }; };
  const wp = await start({});
  const store = createMemoryStore();
  const at = r => r.meta.generated_at;
  const clear = r => ({ ...r, CLAIMS: { for: at(r), status: 'clear', findings: [], rounds: [] } });
  const entry = id => wp.state.innerPages.find(p => p.id === id);
  const homeBefore = J(wp.state.pages.get(7));

  const dry = await dryRun({ record: clear(CAT), site: wp.site, reviewed: true });
  chk('Dry run: finds the entry at the record\'s page map URL, in its post type, and would allow the push; nothing written', dry.pushable && dry.page.id === 501 && dry.page.status === 'draft' && dry.summary.added > 20 && wp.state.writes === 0, J([dry.refusals, dry.page, dry.summary]), '');
  const unread = await dryRun({ record: clear(CAT), site: wp.site, reviewed: false });
  chk('Dry run: FLAGs nobody has read still refuse it', unread.refusals.some(r => /FLAG issue/.test(r)), J(unread.refusals), '');

  const p1 = await push({ record: clear(CAT), recordId: 'rec-cat', site: wp.site, store, reviewed: true });
  chk('Push: the category copy is on the entry, read back as sent', p1.ok === true && p1.result === 'pushed' && !p1.mismatches.length && entry(501).acf.cat_hero_h1 === CAT.cat_hero_h1 && entry(501).acf.cat_faq_items.length === CAT.faq_items.length && entry(501).meta.rank_math_title === CAT.seo_title, J([p1.result, p1.mismatches, p1.refusals]), 'pushed');
  chk('Push: the entry is still a draft, and the homepage and the other entries are untouched', entry(501).status === 'draft' && J(wp.state.pages.get(7)) === homeBefore && !entry(502).acf && !entry(503).acf, entry(501).status, 'draft');
  chk('Push: the site\'s Client Values are brought up to date', Object.keys(wp.state.clientValues).length > 5 && wp.state.clientValues.company_name === CAT.meta.client_values.company_name, J(Object.keys(wp.state.clientValues).slice(0, 5)), '');
  const again = await dryRun({ record: clear(CAT), site: wp.site, reviewed: true });
  chk('Pushed twice, nothing would change', again.summary.added === 0 && again.summary.changed === 0 && again.summary.removed === 0, J(again.summary), '0 changes');

  const quotes = SVC.CLAIMS.findings.map(f => f.quote);
  const refusedClaims = await push({ record: SVC, recordId: 'rec-svc', site: wp.site, store, reviewed: true });
  chk('Push: claims findings nobody accepted refuse it, and nothing is written', refusedClaims.ok === false && refusedClaims.refusals.some(r => /claims review found 8/.test(r)) && !entry(502).acf, J(refusedClaims.refusals), '');
  const p2 = await push({ record: SVC, recordId: 'rec-svc', site: wp.site, store, reviewed: true, acceptClaims: true });
  chk('Push: the service copy goes to the town service entry once its claims are accepted', p2.ok === true && entry(502).acf.svc_hero_h1 === SVC.svc_hero_h1 && entry(502).acf.svc_included_items.length === SVC.included.length && !('cat_hero_h1' in entry(502).acf), J([p2.result, p2.mismatches, p2.refusals]), '');
  const p3 = await push({ record: LOC, recordId: 'rec-loc', site: wp.site, store, reviewed: true, acceptClaims: true });
  chk('Push: the location copy goes to the location entry', p3.ok === true && entry(503).acf.loc_hero_h1 === LOC.loc_hero_h1 && entry(503).acf.loc_services_cards.length === LOC.cards.length, J([p3.result, p3.mismatches, p3.refusals]), '');

  // Rollback
  const edited = { ...clear(CAT), cat_hero_h1: 'Deck Builders in Romsey', meta: { ...CAT.meta } };
  const p4 = await push({ record: edited, recordId: 'rec-cat-2', site: wp.site, store, reviewed: true });
  const rb = await rollback({ snapshotId: p4.snapshotId, site: wp.site, store });
  chk('Rollback: the entry holds what it held before that push', p4.ok && entry(501).acf.cat_hero_h1 === CAT.cat_hero_h1 && rb.ok === true, J([rb, entry(501).acf.cat_hero_h1]), CAT.cat_hero_h1);
  const rb0 = await rollback({ snapshotId: p1.snapshotId, site: wp.site, store });
  chk('Rollback of the first push: the entry is empty again', rb0.ok === true && entry(501).acf.cat_hero_h1 === '' && J(entry(501).acf.cat_faq_items) === '[]', J([rb0, entry(501).acf.cat_hero_h1]), '');
  const log = await store.listLog();
  chk('Every push, refusal and rollback is logged with its page type', log.length === 7 && log.filter(e => e.result === 'pushed').length === 4 && log.some(e => e.result === 'refused' && e.pageType === 'service') && log.filter(e => e.action === 'rollback').length === 2, J(log.map(e => [e.action, e.pageType, e.result])), '');

  // What stops a push
  const wpNone = await start({ innerPages: [] });
  const missing = await push({ record: clear(CAT), site: wpNone.site, store: createMemoryStore(), reviewed: true });
  chk('The entry is not on the site: refused, saying to make the pages first; nothing written', missing.ok === false && missing.refusals.some(r => /category page was not found on the site\. Make the pages first/.test(r)) && wpNone.state.writes === 0, J(missing.refusals), '');
  const wpDetached = await start({ noFieldsOn: ['location-service'] });
  const detached = await push({ record: SVC, site: wpDetached.site, store: createMemoryStore(), reviewed: true, acceptClaims: true });
  chk('The field groups are not attached to the post type: refused before anything is written', detached.ok === false && detached.refusals.some(r => /None of the service page fields are attached to the location-service entry 502/.test(r)) && wpDetached.state.writes === 0, J(detached.refusals), '');
  const wpLive = await start({ innerPages: entries().map(e => ({ ...e, status: 'publish' })) });
  const live = await push({ record: clear(CAT), site: { ...wpLive.site, staging: false }, store: createMemoryStore(), reviewed: true });
  chk('A published entry on a site that is not staging: refused', live.ok === false && live.refusals.some(r => /is published/.test(r)) && wpLive.state.writes === 0, J(live.refusals), '');
  const wpOld = await start({ fieldGroups: ['group_llp_home_hero'] });
  const noGroups = await push({ record: clear(CAT), site: wpOld.site, store: createMemoryStore(), reviewed: true });
  chk('The category groups are not on the site: refused, naming them', noGroups.ok === false && noGroups.refusals.some(r => /Category page field groups missing.*group_llp_cat_hero/.test(r)), J(noGroups.refusals), '');
  const wpDrop = await start({ ignoreAcf: ['cat_content_body'] });
  const dropped = await push({ record: clear(CAT), site: wpDrop.site, store: createMemoryStore(), reviewed: true });
  chk('A field the site did not save shows in the read-back', dropped.ok === false && dropped.result === 'written, read-back differs' && dropped.mismatches.some(m => /cat_content_body/.test(m)), J([dropped.result, dropped.mismatches]), '');
  const blocked = await push({ record: { ...clear(CAT), VALIDATION: { status: 'run', block: 2, flag: 0, issues: [] } }, site: wp.site, store: createMemoryStore(), reviewed: true });
  chk('A page with a BLOCK is refused', blocked.ok === false && blocked.refusals.some(r => /2 BLOCK/.test(r)), J(blocked.refusals), '');

  // ── Which pages are ready ──
  const row = (type, title, slug, info = {}) => ({ page_key: `${type}:${slug}`, type, title, slug, applies: true, info: { phase: 1, ...info } });
  const rows = [
    row('homepage', 'Home', '/'),
    row('location_category', 'Deck Builder Romsey', '/locations/romsey/deck-builder', { town: 'Romsey', category_key: 'deck' }),
    row('town_service', 'Fencing Romsey', '/locations/romsey/fencing', { town: 'Romsey', service_id: 's1' }),
    row('location', 'Romsey', '/locations/romsey', { town: 'Romsey' }),
    row('service', 'Fencing', '/services/fencing', { service_id: 's1' }),
    row('category', 'Deck Builder', '/deck-builder', { category_key: 'deck' }),
    row('location', 'Winchester', '/locations/winchester', { town: 'Winchester', phase: 2 }),
  ];
  const approved = r => ({ ...r, meta: { ...r.meta, approved_at: '2026-11-13T10:00:00.000Z' } });
  const acceptedAll = r => ({ ...r, CLAIMS: { ...r.CLAIMS, accepted: r.CLAIMS.findings.map(f => ({ field: f.field, quote: f.quote, at: 'x' })) } });
  const records = new Map([
    ['category:/locations/romsey/deck-builder', { id: 'r1', record: approved(clear(CAT)) }],
    ['service:/locations/romsey/fencing', { id: 'r2', record: approved(SVC) }],
    ['location:/locations/romsey', { id: 'r3', record: acceptedAll(LOC) }],
    ['category:/deck-builder', { id: 'r5', record: approved({ ...clear(CAT), VALIDATION: { status: 'run', block: 1, flag: 0, issues: [] } }) }],
  ]);
  const onSite = new Set(['/locations/romsey/deck-builder', '/locations/romsey/fencing', '/locations/romsey', '/deck-builder']);
  const plan = copyPlan(rows, records, { onSite });
  const st = p => plan.pages.find(x => x.path === p);
  chk('Ready: the build\'s inner pages only, one row each (no homepage, no phase 2 town)', plan.pages.length === 5 && plan.counts.total === 5, J(plan.pages.map(p => p.path)), '5');
  chk('Ready: an approved page with no claims left is ready, and carries its record', st('/locations/romsey/deck-builder').state === 'ready' && st('/locations/romsey/deck-builder').recordId === 'r1' && J(st('/locations/romsey/deck-builder').acceptedClaims) === '[]', J(st('/locations/romsey/deck-builder')), 'ready');
  chk('Ready: approved but with claims nobody accepted waits, saying so', st('/locations/romsey/fencing').state === 'claims' && /claims review found 8/.test(st('/locations/romsey/fencing').why), J(st('/locations/romsey/fencing')), 'claims');
  chk('Ready: claims accepted but the page not approved waits for Approve', st('/locations/romsey').state === 'not approved' && /Approve/.test(st('/locations/romsey').why), J(st('/locations/romsey')), 'not approved');
  chk('Ready: a page not written yet, and one with a BLOCK, say so', st('/services/fencing').state === 'no copy' && st('/deck-builder').state === 'not ready' && /1 BLOCK/.test(st('/deck-builder').why), J([st('/services/fencing'), st('/deck-builder')]), '');
  chk('Ready: the counts', plan.counts.ready === 1 && plan.counts.pushed === 0 && plan.counts.claims === 1 && plan.counts['not approved'] === 1 && plan.counts['no copy'] === 1 && plan.counts['not ready'] === 1, J(plan.counts), '');
  const both = new Map(records); both.set('service:/locations/romsey/fencing', { id: 'r2', record: approved(acceptedAll(SVC)) });
  const plan2 = copyPlan(rows, both, { onSite: new Set(['/locations/romsey/fencing']), pushed: new Set(['r2']) });
  chk('Ready: approved with every claim accepted carries the accepted quotes for the push', J(acceptedQuotes(approved(acceptedAll(SVC)))) === J(quotes) && acceptedQuotes(SVC) === null, '', 'the 8 quotes');
  chk('Ready: a version already pushed is not pushed again; an entry that is not on the site says to make the pages', plan2.pages.find(x => x.path === '/locations/romsey/fencing').state === 'pushed' && plan2.pages.find(x => x.path === '/locations/romsey/deck-builder').state === 'not on the site', J(plan2.pages.map(p => [p.path, p.state])), '');
  const noSite = copyPlan(rows, records, { onSite: null });
  chk('Ready: when the site can\'t be read, the page is still listed as ready (the push itself checks the entry)', noSite.pages.find(x => x.path === '/locations/romsey/deck-builder').state === 'ready', '', 'ready');

  // ── Wiring ──
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  chk('Server: the copy plan is a route that reads only', server.includes("app.get('/api/clients/:clientId/wp/copy-plan'") && !server.includes("app.post('/api/clients/:clientId/wp/copy-plan'"), '', '');
  const tab = fs.readFileSync(path.join(root, 'public/app/tabs/pages.js'), 'utf8');
  chk('Pages tab: Check the copy, and Push behind a confirm, through the page view\'s own push', tab.includes('data-sitepages="copy-check"') && tab.includes('data-sitepages="copy-push"') && /confirm\(\{ title: `Push the copy to/.test(tab) && tab.includes('/wp/push`, { method: \'POST\', body: { recordId: pg.recordId, reviewed: true, acceptedClaims: pg.acceptedClaims || [], confirm: true } }'), '', '');

  // The tab is an ES module: `node --check` on the .js file passes whatever it holds, so check a .mjs copy
  {
    const os = require('os'), cp = require('child_process');
    const tmp = path.join(os.tmpdir(), `copybot-pages-tab-${process.pid}.mjs`);
    fs.writeFileSync(tmp, tab);
    let err = '';
    try { cp.execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); } catch (e) { err = String(e.stderr || e.message).split('\n').slice(0, 4).join(' '); }
    fs.unlinkSync(tmp);
    chk('Pages tab: the script parses', !err, err, 'no syntax error');
  }

  for (const s of servers) s.close();
  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
