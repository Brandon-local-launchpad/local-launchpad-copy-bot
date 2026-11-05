'use strict';
// Fixture: the page view's field names and the map embed on a push (5 Nov 2026). No API calls, no site.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const { fieldNames } = require(path.join(root, 'wp/field-names.js'));
const { GROUPS } = require(path.join(root, 'wp/acf-schema.js'));
const { HOMEPAGE_FIELDS } = require(path.join(root, 'wp/homepage-map.js'));
const { buildClientValuesPayload } = require(path.join(root, 'wp/client-values.js'));
const { clientValueMap } = require(path.join(root, 'v20-generate.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: WordPress field names ===\n');

const rec = JSON.parse(fs.readFileSync(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-record.json'), 'utf8'));
const home = fieldNames(rec);
const names = home.fields.map(f => f.name);
chk('Homepage: the names are the site\'s, and it says so', home.onSite === true, home.onSite, true);
const base = n => n.split('[')[0];
const pushed = new Set(HOMEPAGE_FIELDS.map(([n]) => n));
const acf = new Set(GROUPS.flatMap(g => g.fields.map(f => f.name)));
const stray = [...new Set(names.map(base))].filter(n => !acf.has(n) && !['seo_title', 'meta_description', 'focus_keyword', 'home_hero_rating_line', 'home_final_cta_trust_lines'].includes(n));
chk('Homepage: every name listed is an ACF field, or one of the four the push sends elsewhere', !stray.length, stray.join(), 'none');
chk('Homepage: the fields the push writes that carry text are all listed', ['home_hero_h1', 'home_hero_intro', 'home_services_cards', 'home_why_points', 'home_process_steps', 'home_cta_band_heading', 'home_areas_links', 'home_faq_items', 'home_final_cta_h2'].every(n => names.some(x => base(x) === n) && (pushed.has(n))), names.slice(0, 8).join(), 'all');
const of = n => home.fields.find(f => f.name === n) || {};
chk('Homepage: a repeater row names its sub field', names.includes('home_services_cards[1].card_text') && names.includes('home_faq_items[1].faq_question'), names.slice(0, 12).join(), 'the rows');
chk('Homepage: the model\'s fields and code\'s are told apart', of('home_hero_intro').source === 'model' && of('home_hero_h1').source === 'code' && of('home_services_cards[1].card_text').source === 'model' && of('home_services_cards[1].card_name').source === 'code', JSON.stringify([of('home_hero_intro').source, of('home_hero_h1').source]), 'model, code');
chk('A hidden field is not listed', !fieldNames({ ...rec, home_owner_h2: 'HIDDEN', home_owner_body: 'HIDDEN' }).fields.some(f => /^home_owner/.test(f.name)), '', 'none');
chk('A blocked record has no fields', fieldNames({ blocked: true }).fields.length === 0, '', '0');

const service = { meta: { page_type: 'service' }, seo_title: 'T', svc_hero_h1: 'Fencing Southampton', svc_hero_intro: 'Intro', included: [{ item_title: 'A', item_text: 'B' }], block4: [{ card_title: 'C', card_body: 'D' }], steps: [], faq_items: [], more_cards: [{ card_name: 'E', card_url: '/e' }], svc_more_h2: 'HIDDEN', svc_areas_links: [{ name: 'Romsey', url: '/r' }], reviews: [] };
const svc = fieldNames(service);
chk('Service page: not on the site yet, and it says so', svc.onSite === false, svc.onSite, false);
chk('Service page: the names follow the OUTPUT block', ['svc_hero_h1', 'svc_hero_intro', 'svc_included_items[1].item_text', 'svc_block4[1].card_body', 'svc_more_cards[1].card_name', 'svc_areas_links[1].area_name'].every(n => svc.fields.some(f => f.name === n)), svc.fields.map(f => f.name).join(), 'all');
chk('Service page: the hero intro is the model\'s', svc.fields.find(f => f.name === 'svc_hero_intro').source === 'model' && svc.fields.find(f => f.name === 'svc_hero_h1').source === 'code', '', 'model, code');

const page = fs.readFileSync(path.join(root, 'public/app/screens/page.js'), 'utf8');
chk('Page view: the toggle is there, in both directions', page.includes('Show field names') && page.includes('Hide field names') && page.includes("act === 'field-names'"), '', 'present');
chk('Page view: it says when a page type has no ACF fields yet', page.includes('has no ACF fields on the site yet'), '', 'present');
chk('The fields route gives the names', fs.readFileSync(path.join(root, 'server.js'), 'utf8').includes("require('./wp/field-names').fieldNames(found.record)"), '', 'present');

// The focus keyword
const stub = { d2_h1: 'Fencing Southampton', d3_title: 'T', d4_meta: 'M' };
chk('Focus keyword: an older record reads its H1', of('focus_keyword').text === rec.home_hero_h1, of('focus_keyword').text, rec.home_hero_h1);
chk('Focus keyword: on a service page, the record\'s own wins, else the H1', fieldNames({ ...service, focus_keyword: 'Own' }).fields.find(f => f.name === 'focus_keyword').text === 'Own' && svc.fields.find(f => f.name === 'focus_keyword').text === 'Fencing Southampton', '', 'both');
for (const f of ['v20-record.js', 'category-record.js', 'service-record.js', 'location-record.js']) chk('Focus keyword: ' + f + ' sets it from the H1', /focus_keyword:\s+D\.d2_h1/.test(fs.readFileSync(path.join(root, f), 'utf8')), '', 'set');
const mapSrc = fs.readFileSync(path.join(root, 'wp/homepage-map.js'), 'utf8');
const phpSrc = fs.readFileSync(path.join(root, 'wp-plugin/llp-copybot/llp-copybot.php'), 'utf8');
chk('Focus keyword: nothing pushes it until the plugin registers the meta, and the plugin does not yet', !mapSrc.includes('focus') && !phpSrc.includes('focus_keyword'), '', 'held');

// The map embed
chk('Client values: the map embed is on the record\'s values', clientValueMap({ map_embed: 'https://maps.example/embed' }, null).map_embed === 'https://maps.example/embed', '', 'kept');
chk('Push: the map embed on the record is sent', buildClientValuesPayload({ meta: { client_values: { map_embed: 'https://maps.example/embed' } } }).map_embed === 'https://maps.example/embed', '', 'sent');
chk('Push: a record with no map embed does not clear the site\'s', !('map_embed' in buildClientValuesPayload({ meta: { client_values: {} } })), '', 'not sent');
chk('Push: other empty values are still sent, so a removed value clears', buildClientValuesPayload({ meta: { client_values: {} } }).company_name === '', '', 'sent empty');

console.log('\n=== field names: ' + pass + ' passed, ' + fail + ' failed ===\n');
if (fail) process.exitCode = 1;
