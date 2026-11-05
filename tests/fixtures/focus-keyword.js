'use strict';
// Fixture: no two pages share a focus keyword (Brandon, 5 Nov 2026). A hub page whose keyword is another page's target
// has none. Run over every client page map the repo holds and through the real page decisions. No API calls.
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '../..');
const { targetKeyword, focusKeywords, focusKeywordFor, duplicateFocusKeywords } = require(path.join(root, 'h1-research/research.js'));
const { computeLocationDecisions } = require(path.join(root, 'location-decisions.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const { fieldNames } = require(path.join(root, 'wp/field-names.js'));
const L = require(path.join(root, 'niche-library/library.js'));
const R = require(path.join(root, 'fillout/services/resolver.js'));
const PM = require(path.join(root, 'page-map/generator.js'));
const { slugify } = require(path.join(root, 'page-map/slugs.js'));
const { CLIENTS } = require(path.join(root, 'tests/fixtures/data/realistic-clients.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: focus keywords ===\n');

const hub = { type: 'location', slug: '/locations/romsey', h1: 'Gardener Services in and around Romsey', h1_keyword: 'gardener services in and around romsey' };
const owner = { type: 'location_category', slug: '/locations/romsey/gardener', h1: 'Gardener Romsey', h1_keyword: 'gardener romsey' };
const free = { type: 'location', slug: '/locations/ampfield', h1: 'Gardener Services in and around Ampfield' };

chk('A hub page whose keyword is another page\'s target has none', focusKeywords([hub, owner]).get(hub.slug) === '', focusKeywords([hub, owner]).get(hub.slug), 'blank');
chk('The page that owns it keeps it, whichever order the rows are in', focusKeywords([hub, owner]).get(owner.slug) === 'Gardener Romsey' && focusKeywords([owner, hub]).get(owner.slug) === 'Gardener Romsey', '', 'Gardener Romsey');
chk('A hub page whose keyword nobody else targets keeps it', focusKeywords([free, owner]).get(free.slug) === 'Gardener Ampfield', focusKeywords([free, owner]).get(free.slug), 'Gardener Ampfield');
chk('A page that does not apply owns nothing', focusKeywords([hub, { ...owner, applies: false }]).get(hub.slug) === 'Gardener Romsey', '', 'the hub keeps it');
chk('Case and punctuation are the same keyword', focusKeywords([{ type: 'location', slug: '/a', h1: "Gardener Services in and around Chandler's Ford" }, { type: 'location_category', slug: '/b', h1: 'gardener chandlers ford' }]).get('/a') === '', '', 'blank');
const two = focusKeywords([{ type: 'location_category', slug: '/lc', h1: 'Fencing Romsey' }, { type: 'category', slug: '/c', h1: 'Fencing Romsey' }]);
chk('Two pages that are not hubs: the document\'s order decides, and one is blank', two.get('/c') === 'Fencing Romsey' && two.get('/lc') === '', JSON.stringify([...two]), 'category keeps it');
chk('A row with no H1 has none and blocks nothing', focusKeywords([{ type: 'location', slug: '/x', h1: '' }, { type: 'location', slug: '/y', h1: '' }]).get('/x') === '', '', 'blank');
chk('focusKeywordFor: one page, among its rows', focusKeywordFor(hub, [hub, owner]) === '' && focusKeywordFor(owner, [hub, owner]) === 'Gardener Romsey', '', 'blank, kept');
chk('focusKeywordFor: the H1 code fell back to counts', focusKeywordFor({ type: 'location', slug: '/z', h1: '' }, [], 'Landscaper Totton') === 'Landscaper Totton', '', 'the fallback');

// The check itself must catch a repeat
chk('The check catches two pages sharing one, ignoring case', duplicateFocusKeywords([{ slug: '/a', focus_keyword: 'Gardener Romsey' }, { slug: '/b', focus_keyword: 'gardener romsey' }, { slug: '/c', focus_keyword: 'Other' }]).length === 1, '', 'one repeat');
chk('The check ignores blanks', duplicateFocusKeywords([{ slug: '/a', focus_keyword: '' }, { slug: '/b', focus_keyword: '' }]).length === 0, '', 'none');

// Every client's page map in the repo
const asRecords = rows => { const m = focusKeywords(rows); return [...m.entries()].map(([slug, focus_keyword]) => ({ slug, focus_keyword })); };
const maps = [];
const dataDir = path.join(__dirname, 'data');
for (const f of fs.readdirSync(dataDir).filter(x => /page-map.*\.json$/.test(x))) {
  const j = JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
  if (Array.isArray(j.rows)) maps.push([f, j.rows]);
}
const configOf = stem => fs.readdirSync(path.join(root, 'fillout/services')).filter(x => x.endsWith('.json')).map(x => JSON.parse(fs.readFileSync(path.join(root, 'fillout/services', x), 'utf8'))).find(x => String(x.nicheKey || '').replace(/_/g, '-').startsWith(stem));
for (const [key, c] of Object.entries(CLIENTS)) {
  const config = configOf(c.stem);
  const primary = config.categories.find(x => x.key === config.primaryDefault) || config.categories[0];
  const resolved = R.resolve(c.ticks, config, { additional: c.typed.map(service => ({ service, categoryKey: primary.key })) });
  const map = PM.buildPageMap({ resolved, baseTown: c.baseTown, otherTowns: c.towns.join('\n'), companyName: c.companyName, terms: { _sitewide: [] }, waiting: [] }, { volumes: new Map(), library: L.loadLibrarySet(c.stem), launchTowns: new Set(c.towns.map(slugify)), exclude: new Set(), saved: [] });
  // Stand in H1s as the thin runner does, a hub on every location page, which is what would collide
  for (const r of map.rows) if (!r.h1) r.h1 = r.type === 'location' ? primary.name + ' Services in and around ' + r.title : r.type === 'location_category' ? r.title : r.title + ' ' + c.baseTown;
  maps.push([key, map.rows]);
}
chk('At least the Edens Edge map and the four test clients are checked', maps.length >= 5, maps.map(m => m[0]).join(), '5 or more');
for (const [name, rows] of maps) {
  const repeats = duplicateFocusKeywords(asRecords(rows));
  chk(name + ': no two pages share a focus keyword (' + rows.length + ' rows)', repeats.length === 0, JSON.stringify(repeats.slice(0, 4)), 'none');
}
const edens = maps.find(m => /edens-edge-v3/.test(m[0]))[1];
const edensKw = focusKeywords(edens);
chk('Edens Edge: Romsey has no focus keyword, and its Gardener page has "Gardener Romsey"', edensKw.get('/locations/romsey') === '' && edensKw.get('/locations/romsey/gardener') === 'Gardener Romsey', JSON.stringify([edensKw.get('/locations/romsey'), edensKw.get('/locations/romsey/gardener')]), 'blank, Gardener Romsey');
chk('Edens Edge: the homepage has its keyword', edensKw.get('/') === 'Landscaper Southampton', edensKw.get('/'), 'Landscaper Southampton');
chk('Edens Edge: a location page with a keyword of its own keeps it', edensKw.get('/locations/winchester') === 'Landscaper Winchester', edensKw.get('/locations/winchester'), 'Landscaper Winchester');

// Through the real page decisions, and on to what Show field names reads
const cv = { ...E.ethanValues(), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], h1_override: 'Landscaper Southampton', coastal_city: 'yes' };
const niche = { ...landscaper, _source: 'landscaper', service_words: [] };
const live = edens.filter(r => r.applies !== false);
const hand = { baseTown: 'Southampton', otherTowns: 'Romsey\nWinchester' };
const ctx = contextFromPageMap({ rows: edens, hand, cv, niche });
const decide = slug => computeLocationDecisions({ cv, niche, keyValueMap: ctx.keyValueMap, rows: edens, page: live.find(r => r.slug === slug), allocation: null, town: { profile: '', villages: [] }, symptoms: [], ideasUsed: [], mechanismsUsed: [], tradeFacts: null });
const romsey = decide('/locations/romsey');
chk('Decisions: the Romsey location page gets a blank focus keyword', romsey.decisions && romsey.decisions.target_keyword === '', JSON.stringify(romsey.decisions ? romsey.decisions.target_keyword : romsey.gates), 'blank');
const win = decide('/locations/winchester');
chk('Decisions: the Winchester location page keeps its own', win.decisions && win.decisions.target_keyword === 'Landscaper Winchester', JSON.stringify(win.decisions ? win.decisions.target_keyword : win.gates), 'Landscaper Winchester');
for (const f of ['category-decisions.js', 'service-decisions.js', 'location-decisions.js']) chk(f + ' reads it with the whole page map', fs.readFileSync(path.join(root, f), 'utf8').includes('focusKeywordFor(page, rows, h1)'), '', 'present');

const stub = { meta: { page_type: 'location' }, loc_hero_h1: 'Gardener Services in and around Romsey', cards: [], block4: [], block5: [], steps: [], faq_items: [], reviews: [], loc_areas_links: [] };
const names = rec => fieldNames(rec).fields.filter(f => f.name === 'focus_keyword').map(f => f.text);
chk('Show field names: a blank focus keyword is not listed', names({ ...stub, focus_keyword: '' }).length === 0, '', 'none');
chk('Show field names: an older hub record stays blank rather than guess', names(stub).length === 0, names(stub).join(), 'none');
chk('Show field names: an older record with a real H1 reads it', names({ ...stub, loc_hero_h1: 'Landscaper Winchester' }).join() === 'Landscaper Winchester', '', 'the H1');
chk('targetKeyword still reads a hub pattern, for the comparison', targetKeyword({ h1: hub.h1, keyword: hub.h1_keyword }) === 'Gardener Romsey', '', 'Gardener Romsey');

console.log('\n=== focus keywords: ' + pass + ' passed, ' + fail + ' failed ===\n');
if (fail) process.exitCode = 1;
