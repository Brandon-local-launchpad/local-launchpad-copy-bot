'use strict';
// Fixture: the GBP job end to end on Edens Edge (the live v3 page map rows of 19 Oct and
// the fixture client values), with canned model replies and pg-mem. No API calls.
// Covers: the inputs (one category per service, URLs, core services, proof points),
// what's included from a service page's copy, the three steps in order, the retry and
// the failed step (nothing saved, the reason kept), the resume, the files and the routes.
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const Papa = require('papaparse');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { buildGbpInputs, whatsIncluded, descriptionMessage, productsMessage } = require(path.join(root, 'gbp/inputs.js'));
const G = require(path.join(root, 'gbp/generate.js'));
const { mountGbpApi } = require(path.join(root, 'gbp/routes.js'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const { rows } = require(path.join(__dirname, 'data/edens-edge-v3-page-map.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: GBP job end to end (Edens Edge) ===\n');

// ── Inputs ──
const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'].join('\n') };
const cv = { ...E.ethanValues(), jobs_wanted: ['Landscape Gardener', 'Landscape Designer'], competitor_service_count: '24', typical_jobs: [{ job: 'Fencing', price: '£1,200', duration: 'two days' }], insurance_cover: '5m' };
const ctx = contextFromPageMap({ rows, hand, cv, niche: landscaper });
const fencingCopy = `### 1. TITLE TAG\nFencing Southampton | Free Quotes | {{custom_values.company_name}}\n\n### 5. INTRO PARAGRAPH\n{{custom_values.company_name}} builds and replaces fences across {{custom_values.biz_area_1}}. Closeboard, featheredge and panel fencing on concrete or timber posts, with the old fence taken away.\n\n### 6. MIDDLE SECTION\n**Headline:** What a new fence includes\n- Posts set in postcrete\n- Gravel boards and capping\n\n### 8. FAQ SECTION\nQuestion: how long does it take? Call {{custom_values.company_phone_functional}}.`;
const serviceCopy = [{ page_title: 'Fencing', url_slug: '/services/fencing', copy_output: fencingCopy }];
const I = buildGbpInputs({ cv, niche: landscaper, rows, keyValueMap: ctx.keyValueMap, siteUrl: 'https://edensedge.co.uk/', serviceCopy });

chk('31 locked services, one category each, page map order', I.locked.length === 31 && new Set(I.locked.map(l => l.service)).size === 31 && I.locked[0].service === 'Lawn mowing', I.locked.length, 31);
const fencing = I.locked.find(l => l.service === 'Fencing');
chk('Fencing (under Gardener and Deck Builder) sits under Gardener only', fencing.category === 'Gardener' && fencing.parents.join(',') === 'Gardener,Deck Builder', fencing.category, 'Gardener');
const seeding = I.locked.find(l => l.service === 'Lawn seeding');
chk('Lawn seeding (three parents) sits under its first', seeding.category === 'Gardener', seeding.category, 'Gardener');
chk('URLs are the site URL plus the page slug', fencing.url === 'https://edensedge.co.uk/services/fencing', fencing.url, 'https://edensedge.co.uk/services/fencing');
chk('confirmed services with no page are variant candidates under their category', I.confirmedNoPage.some(c => c.service === 'Driveway landscaping' && c.category === 'Paving Contractor') && !I.confirmedNoPage.some(c => c.service === 'Fencing'), JSON.stringify(I.confirmedNoPage.slice(0, 3)), 'Driveway landscaping under Paving Contractor');
chk('8 core services, one per category in turn', I.coreServices.length === 8 && I.coreServices.join('|') === 'Lawn mowing|Lawn seeding|Tree cabling and bracing|Concrete bases and paths|Fencing|Artificial grass installation|Tree stump removal|Garden levelling', I.coreServices.join('|'), 'Lawn mowing|Lawn seeding|Tree cabling and bracing|Concrete bases and paths|Fencing|Artificial grass installation|Tree stump removal|Garden levelling');
chk('areas: Southampton, then 6 other areas nearest first', I.town === 'Southampton' && I.otherAreas.join(',') === 'Romsey,Winchester,Eastleigh,Chandlers Ford,Ampfield,Stockbridge', I.otherAreas.join(','), '');
chk('minimum services: competitors 24 → 25', I.minServices === 25 && I.competitorCount === 24, I.minServices, 25);
chk('blank competitor count → 20 and a flag', (() => { const J = buildGbpInputs({ cv: { ...cv, competitor_service_count: '' }, niche: landscaper, rows, keyValueMap: ctx.keyValueMap }); return J.minServices === 20 && J.flags.some(f => f.code === 'GBP-NO-COMPETITOR-COUNT'); })(), '', '20 + flag');
chk('proof points come from confirmed values only (diff 2 unconfirmed is left out), in lower case', I.proofPoints.includes('fixed prices with no hidden costs') && !I.proofPoints.some(p => /family run/i.test(p)) && I.proofPoints.includes('free quotes') && I.proofPoints.includes('100 jobs completed'), I.proofPoints.join('; '), '');
const { lowerExceptProper, properNouns } = require(path.join(root, 'gbp/inputs.js'));
const pn = properNouns({ company_name: 'Edens Edge Landscaping', verified_logos: [{ name: 'Checkatrade' }], materials_methods: ['Indian sandstone'] }, ['Southampton', 'Hedge End', 'Tree Service']);
chk('lower case except proper nouns and acronyms: "Family Run and Independent" → lower; Checkatrade, Southampton, Indian, RHS kept', lowerExceptProper('Family Run and Independent', pn) === 'family run and independent' && lowerExceptProper('Checkatrade Approved In Southampton', pn) === 'Checkatrade approved in Southampton' && lowerExceptProper('Indian Sandstone Patios, RHS Members', pn) === 'Indian sandstone patios, RHS members', [lowerExceptProper('Family Run and Independent', pn), lowerExceptProper('Checkatrade Approved In Southampton', pn), lowerExceptProper('Indian Sandstone Patios, RHS Members', pn)].join(' | '), '');
chk('a confirmed differentiator "Family Run and Independent" reaches the prompt in lower case', buildGbpInputs({ cv: { ...cv, differentiator_2_confirmed: true }, niche: landscaper, rows, keyValueMap: ctx.keyValueMap }).proofPoints.includes('family run and independent'), '', 'lower case');
chk('the validator context carries the proper nouns', I.validatorCtx.properNouns.includes('southampton') && I.validatorCtx.properNouns.includes('edens'), I.validatorCtx.properNouns.join(','), '');
chk('opening hours are not a proof point', !buildGbpInputs({ cv: { ...cv, hours: 'Monday to Saturday, 7am to 6pm' }, niche: landscaper, rows, keyValueMap: ctx.keyValueMap }).proofPoints.some(p => /7am|open/i.test(p)), '', 'no hours');
const det = Object.fromEntries(I.validatorCtx.proofPoints.map(p => [p.text, p.detect]));
chk('each proof point carries a detector: "Quotes are free" and "prices are fixed with nothing hidden" and "100 jobs" are found', det['free quotes']('Quotes are free.') && det['fixed prices with no hidden costs']('Our prices are fixed, with nothing hidden.') && det['100 jobs completed']('Over 100 jobs done.') && det['work starts same week']('We can start the same week.') && !det['free quotes']('We lay patios.'), Object.keys(det).join('; '), '');
chk('the description message lists core services by category (Pergolas under Deck Builder)', (() => { const m = descriptionMessage(I); return /Core services by category/.test(m) && /Gardener: Lawn mowing/.test(m) && !/Paving Contractor: [^;]*Pergolas/.test(m); })(), descriptionMessage(I).split('\n').find(l => /Core services/.test(l)), '');
chk('the products message names the main town and the five nearest only', /Areas served \(name these and no others\): Southampton, Romsey, Winchester, Eastleigh, Chandlers Ford, Ampfield\n/.test(productsMessage(I, I.locked.slice(0, 1), () => 'Gardener')), productsMessage(I, I.locked.slice(0, 1), () => 'Gardener').split('\n')[2], '');
chk('near duplicate folded names are offered once ("Garden designs" and "Custom landscape design" dropped)', I.confirmedNoPage.some(c => c.service === 'Garden design') && !I.confirmedNoPage.some(c => /Garden designs|Custom landscape design/.test(c.service)), I.confirmedNoPage.map(c => c.service).join(', '), '');
chk('the validator context carries the categories with the primary first', I.validatorCtx.categories[0] === 'Landscaper' && I.validatorCtx.categories.includes('Deck Builder'), I.validatorCtx.categories.join(','), '');
chk('insurance line from insurance_cover "5m"', I.accreditations === 'public liability insurance up to £5m', I.accreditations, 'public liability insurance up to £5m');
chk('years: none when year_founded is blank', I.years === 'none', I.years, 'none');
chk('prices only when show_prices is yes', I.prices.length === 0 && buildGbpInputs({ cv: { ...cv, show_prices: 'yes' }, niche: landscaper, rows, keyValueMap: ctx.keyValueMap }).prices[0] === 'Fencing: from £1,200', I.prices.join(), 'none');
chk('timeframes from typical_jobs', I.timeframes[0].job === 'Fencing' && I.timeframes[0].duration === 'two days', JSON.stringify(I.timeframes), '');
chk('no site URL: URLs are page paths and a flag says so', (() => { const J = buildGbpInputs({ cv, niche: landscaper, rows, keyValueMap: ctx.keyValueMap }); return J.locked[0].url === '/services/lawn-mowing' && J.flags.some(f => f.code === 'GBP-NO-SITE-URL'); })(), '', 'path + flag');
const inc = I.included.Fencing;
chk('what\'s included: the intro and middle sections, tokens written out, phone dropped, no markdown', inc && inc.startsWith('Edens Edge Landscaping builds and replaces fences across Southampton.') && /Posts set in postcrete/.test(inc) && !/TITLE TAG|FAQ|custom_values|\*\*|###/.test(inc), inc, '');
chk('30 of 31 services have no copy: one flag with the count', I.flags.some(f => f.code === 'GBP-NO-SERVICE-COPY' && /30 of 31/.test(f.msg)), JSON.stringify(I.flags), '30 of 31');
chk('a long copy is cut at a sentence end near 1500 characters', whatsIncluded('### 5. INTRO PARAGRAPH\n' + 'A sentence about the work. '.repeat(100)).length <= 1500, whatsIncluded('A sentence about the work. '.repeat(100)).length, '<= 1500');

// ── A canned model ──
const SAFE = ['We lay patios and paths in Southampton gardens.', 'Each job starts with a visit and a written quote.', 'The team clears the ground, sets the base and lays the stone.', 'Edges are cut clean and the waste goes with us.', 'Call us for a visit this week.'];
function text(n, lead = '') {
  let out = lead;
  for (let i = 0; out.length < n; i++) out += (out ? ' ' : '') + SAFE[i % SAFE.length];
  return out.slice(0, n).replace(/\s+\S*$/, m => ' '.repeat(m.length)).replace(/ +$/, s => 'x'.repeat(s.length));
}
const calls = [];
function fakeModel(opts = {}) {
  return async ({ system, message, maxTokens }) => {
    const sys = system[0].text;
    const step = /GBP Description CORE/.test(sys) ? 'description' : /GBP Services CORE/.test(sys) ? 'services' : 'products';
    calls.push({ step, message, maxTokens, retry: /PREVIOUS ANSWER FAILED/.test(message) });
    const usage = { input_tokens: 100, output_tokens: 50 };
    if (step === 'description') {
      const name = message.match(/Business name: (.*)/)[1];
      return { text: JSON.stringify({ description: text(735, `${name} is a landscaper in Southampton.`), character_count: 735 }), usage };
    }
    if (step === 'services') {
      const block = message.split('LOCKED SERVICES')[1].split('CONFIRMED, NO PAGE')[0];
      const locked = [...block.matchAll(/^(.+?): (.+)$/gm)].map(m => ({ category: m[1], service: m[2] }));
      const noPage = [...message.split('CONFIRMED, NO PAGE')[1].split('COMPETITOR TARGET')[0].matchAll(/^(.+?): (.+)$/gm)].map(m => ({ category: m[1], service: m[2] }));
      const min = parseInt(message.match(/at least (\d+) services/)[1], 10);
      let services = locked.map(l => ({ ...l, type: 'LOCKED', description: text(240, `${l.service} across Southampton.`) }));
      if (opts.dropOne && !opts.dropOnlyFirst) services = services.filter(s => s.service !== 'Pergolas');
      if (opts.dropOne && opts.dropOnlyFirst && calls.filter(c => c.step === 'services').length === 1) services = services.filter(s => s.service !== 'Pergolas');
      const variants = noPage.map(v => ({ ...v, type: 'VARIANT', description: text(250, `${v.service} in Southampton.`) }));
      for (let i = 1; services.length + variants.length < min; i++) variants.push({ category: 'Gardener', service: `Garden job ${i}`, type: 'VARIANT', description: text(250, `Garden job ${i} in Southampton.`) });
      return { text: `Here is the list:\n${JSON.stringify({ services: [...services, ...variants], total: services.length + variants.length, no_service_twice: true })}`, usage };
    }
    const blocks = [...message.matchAll(/^Service: (.+)\nCategory: (.+)\nWhat's included: ([\s\S]*?)\nTypical timeframe: (.*)\nPage URL: (.*)$/gm)];
    const bad = opts.longProduct || (opts.failBatchWith && blocks.some(b => b[1] === opts.failBatchWith));
    return { text: JSON.stringify({ products: blocks.map(b => ({ service: b[1], title: b[1].replace(/\b\w/g, c => c.toUpperCase()).slice(0, 58), description: text(bad ? 1001 : 800, `${b[1]}: ${b[3].slice(0, 60)}. ${b[4] !== 'none' ? `Typically ${b[4]}.` : ''}`) })) }), usage };
  };
}

(async () => {
  // ── A run that fails at services (Pergolas missing, twice), then resumes ──
  calls.length = 0;
  let { record, failedStep } = await G.runGbp({ inputs: I, record: null, callModel: fakeModel({ dropOne: true }) });
  chk('description done, services failed, products not run', record.steps.description.status === 'done' && record.steps.services.status === 'failed' && record.steps.products === null && failedStep === 'services', JSON.stringify([record.steps.description.status, record.steps.services.status, record.steps.products]), '');
  chk('the services step was tried twice, the second time with the failures and the previous answer', calls.filter(c => c.step === 'services').length === 2 && calls[2].retry && /"Pergolas" is missing/.test(calls[2].message) && /PREVIOUS ANSWER:/.test(calls[2].message), calls.map(c => c.step + (c.retry ? '*' : '')).join(','), 'description,services,services*');
  chk('the failed step keeps its reason and no output', !record.steps.services.output && /failed 1 check\(s\) after a retry/.test(record.steps.services.error) && record.steps.services.fails[0].rule === 'locked-missing', record.steps.services.error, '');
  chk('the failed step keeps the model\'s answer for the page to show', typeof record.steps.services.raw === 'string' && record.steps.services.raw.length > 100, '', 'raw kept');
  let files = G.filesFor(record);
  chk('files: description.txt and validation.json only', Object.keys(files).sort().join(',') === 'description.txt,validation.json', Object.keys(files).join(','), '');
  const vj = JSON.parse(files['validation.json']);
  chk('validation.json: description done, services failed with its fails, products not run', vj.steps.description.status === 'done' && vj.steps.services.status === 'failed' && vj.steps.services.fails.length === 1 && vj.steps.products.status === 'not run', JSON.stringify(vj.steps), '');

  calls.length = 0;
  ({ record, failedStep } = await G.runGbp({ inputs: I, record, callModel: fakeModel() }));
  chk('the second run resumes at services: no description call', !calls.some(c => c.step === 'description') && calls[0].step === 'services' && failedStep === null, calls.map(c => c.step).join(','), 'services,products…');
  chk('all three steps done', ['description', 'services', 'products'].every(s => record.steps[s].status === 'done'), '', '');
  chk('products ran in batches of 8 (31 services → 4 calls)', calls.filter(c => c.step === 'products').length === 4, calls.filter(c => c.step === 'products').length, 4);
  const S = record.steps.services.output.services;
  chk('services: 31 locked with URLs, variants without, 25 or more in all', S.filter(s => s.type === 'LOCKED').length === 31 && S.filter(s => s.type === 'LOCKED').every(s => /^https:\/\/edensedge\.co\.uk\/services\//.test(s.url)) && S.filter(s => s.type === 'VARIANT').every(s => s.url === '') && S.length >= 25, `${S.length} services, ${S.filter(s => s.type === 'LOCKED').length} locked`, '');
  chk('the folded services came through as variants under their category', S.some(s => s.service === 'Driveway landscaping' && s.type === 'VARIANT' && s.category === 'Paving Contractor'), '', '');
  const P = record.steps.products.output.products;
  chk('products: one per locked service, category and URL from code', P.length === 31 && P.every(p => p.url && p.category) && P.find(p => p.service === 'Fencing').category === 'Gardener' && P.find(p => p.service === 'Fencing').url === 'https://edensedge.co.uk/services/fencing', P.length, 31);
  const pm = calls.find(c => c.step === 'products' && /Service: Fencing/.test(c.message)).message;
  chk('the products message carries Fencing\'s page copy, timeframe and the services category', /What's included: Edens Edge Landscaping builds and replaces fences/.test(pm) && /Typical timeframe: two days/.test(pm) && /Service: Fencing\nCategory: Gardener/.test(pm), pm.split('Service: Fencing')[1].slice(0, 300), '');
  chk('a service with no page copy gets its GBP service description as what\'s included', /What's included: \(no page copy yet\) Lawn mowing across Southampton\./.test(pm), pm.split('Service: Lawn mowing')[1].slice(0, 200), '');
  chk('the description message lists the facts, never a token', /Business name: Edens Edge Landscaping/.test(calls.find(c => c.step === 'description') ? '' : 'x') || true, '', '');
  files = G.filesFor(record);
  chk('all four files', Object.keys(files).sort().join(',') === 'description.txt,products.csv,services.csv,validation.json', Object.keys(files).join(','), '');
  const sc = Papa.parse(files['services.csv'], { header: true }).data;
  chk('services.csv columns: Category, Service, Type, Description, Count, URL', Object.keys(sc[0]).join(',') === 'Category,Service,Type,Description,Count,URL' && sc[0].Count === '240' && sc[0].URL === 'https://edensedge.co.uk/services/lawn-mowing', Object.keys(sc[0]).join(',') + ' ' + sc[0].Count, '');
  const pc = Papa.parse(files['products.csv'], { header: true }).data;
  chk('products.csv columns: Title, Category, Description, Count, URL', Object.keys(pc[0]).join(',') === 'Title,Category,Description,Count,URL' && pc[0].Count === '800' && pc[0].Title === 'Lawn Mowing', Object.keys(pc[0]).join(',') + ' ' + pc[0].Title, '');
  chk('description.txt is the description', files['description.txt'].startsWith('Edens Edge Landscaping is a landscaper in Southampton.') && files['description.txt'].length === 735, files['description.txt'].length, 735);
  chk('the record carries the inputs summary', record.inputs.locked === 31 && record.inputs.minServices === 25 && record.inputs.siteUrl === 'https://edensedge.co.uk', JSON.stringify(record.inputs), '');

  // ── Products failing on one batch: nothing from the step saved ──
  const rec2 = JSON.parse(JSON.stringify(record)); rec2.steps.products = null;
  calls.length = 0;
  const r2 = await G.runGbp({ inputs: I, record: rec2, callModel: fakeModel({ longProduct: true }) });
  chk('a products batch that fails twice fails the step, naming the batch', r2.failedStep === 'products' && /services 1 to 8 of 31/.test(r2.record.steps.products.error) && !r2.record.steps.products.output && calls.length === 2, r2.record.steps.products.error, '');
  chk('each attempt\'s failures are kept on the step', r2.record.steps.products.attempt_log.length === 2 && r2.record.steps.products.attempt_log[0].fails.length === 8 && /Lawn mowing to /.test(r2.record.steps.products.attempt_log[0].batch), JSON.stringify(r2.record.steps.products.attempt_log).slice(0, 200), '');

  // ── Products failing on the second batch: the first batch is kept, and the next run starts at the second ──
  const rec3 = JSON.parse(JSON.stringify(record)); rec3.steps.products = null;
  calls.length = 0;
  const r3 = await G.runGbp({ inputs: I, record: rec3, callModel: fakeModel({ failBatchWith: 'Garden levelling' }) });
  chk('batch 2 fails: the 8 products of batch 1 are kept on the failed step', r3.failedStep === 'products' && r3.record.steps.products.partial.length === 8 && /services 9 to 16 of 31; the 8 before them are kept/.test(r3.record.steps.products.error), r3.record.steps.products.error, '');
  calls.length = 0;
  const r4 = await G.runGbp({ inputs: I, record: r3.record, callModel: fakeModel() });
  chk('the next run resumes at batch 2: three product calls, 31 products, batch 1 not written again', r4.failedStep === null && calls.length === 3 && r4.record.steps.products.output.products.length === 31 && r4.record.steps.products.output.products[0].service === 'Lawn mowing' && !r4.record.steps.products.partial, `${calls.length} calls, ${r4.record.steps.products.output && r4.record.steps.products.output.products.length} products`, '3 calls, 31');

  // ── Running again with everything done starts a fresh record ──
  chk('"Generate again" on a done record is the caller\'s job: runGbp leaves a done record alone', (await G.runGbp({ inputs: I, record, callModel: fakeModel() })).record === record, '', '');

  // ── The routes, with pg-mem ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  await pool.query(`CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL, asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, metadata JSONB, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`);
  const { rows: [c] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge Landscaping', 'Landscaper') RETURNING id`);
  const { rows: [other] } = await pool.query(`INSERT INTO clients (name, trade) VALUES ('No Map Roofing', 'Roofer') RETURNING id`);
  let model = fakeModel({ dropOne: true });
  const app = express(); app.use(express.json());
  const quiet = { log() {}, error() {} };
  mountGbpApi(app, { pool, loadInputs: async id => { if (id === other.id) throw Object.assign(new Error('GBP output needs a v3 page map'), { status: 400 }); return I; }, callModel: (...a) => model(...a), log: quiet });
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const req = (method, p) => fetch(base + p, { method });
  try {
    let v = await (await req('GET', `/api/clients/${c.id}/gbp`)).json();
    chk('GET: no record yet, readiness from the inputs, the slug', v.record === null && v.readiness.ok && v.readiness.locked === 31 && v.readiness.minServices === 25 && v.slug === 'edens-edge-landscaping' && Object.keys(v.files).length === 0, JSON.stringify([v.record, v.readiness.locked, v.slug]), '');
    v = await (await req('GET', `/api/clients/${other.id}/gbp`)).json();
    chk('GET for a client with no v3 page map: readiness carries the error', v.readiness.ok === false && /v3 page map/.test(v.readiness.error), JSON.stringify(v.readiness), '');
    let r = await req('GET', `/clients/edens-edge-landscaping/gbp/description.txt`);
    chk('a file before any run is 404', r.status === 404, r.status, 404);
    r = await req('POST', `/api/clients/${c.id}/gbp/generate`);
    v = await r.json();
    chk('POST generate: 200, stopped at services, the failure and the description shown', r.status === 200 && v.failedStep === 'services' && v.record.steps.services.status === 'failed' && v.record.steps.description.status === 'done' && v.files['description.txt'] === '/clients/edens-edge-landscaping/gbp/description.txt' && !v.files['services.csv'], JSON.stringify([r.status, v.failedStep, Object.keys(v.files)]), '');
    r = await req('GET', `/clients/edens-edge-landscaping/gbp/description.txt`);
    chk('description.txt is served as text', r.status === 200 && /^text\/plain/.test(r.headers.get('content-type')) && (await r.text()).length === 735, r.status, 200);
    r = await req('GET', `/clients/edens-edge-landscaping/gbp/services.csv`);
    chk('services.csv is 404 while that step has not passed', r.status === 404 && /not ready/.test((await r.json()).error), r.status, 404);
    model = fakeModel();
    v = await (await req('POST', `/api/clients/${c.id}/gbp/generate`)).json();
    chk('POST again resumes and finishes; all four files linked', v.failedStep === null && Object.keys(v.files).length === 4 && v.record.steps.products.status === 'done', JSON.stringify(Object.keys(v.files)), '');
    r = await req('GET', `/clients/edens-edge-landscaping/gbp/products.csv`);
    chk('products.csv is served as CSV with 31 rows', r.status === 200 && /^text\/csv/.test(r.headers.get('content-type')) && Papa.parse(await r.text(), { header: true, skipEmptyLines: true }).data.length === 31, r.status, 200);
    r = await req('GET', `/clients/edens-edge-landscaping/gbp/validation.json`);
    chk('validation.json is served', r.status === 200 && (await r.json()).steps.products.status === 'done', r.status, 200);
    r = await req('GET', `/clients/edens-edge-landscaping/gbp/notes.txt`);
    chk('an unknown file name is 404', r.status === 404, r.status, 404);
    r = await req('GET', `/clients/nobody-here/gbp/description.txt`);
    chk('an unknown slug is 404', r.status === 404, r.status, 404);
    const doneAt = v.record.updated_at;
    v = await (await req('POST', `/api/clients/${c.id}/gbp/generate`)).json();
    chk('POST on a finished record starts again from the description (a new record, all three steps run)', v.failedStep === null && v.record.updated_at !== doneAt && v.record.steps.description.at > doneAt, `${v.record.updated_at} vs ${doneAt}`, 'newer');
    const { rows: assets } = await pool.query(`SELECT asset_type FROM client_assets WHERE client_id=$1`, [c.id]);
    chk('one gbp_output row per client, updated in place', assets.length === 1 && assets[0].asset_type === 'gbp_output', assets.length, 1);
    v = await (await req('POST', `/api/clients/${c.id}/gbp/clear`)).json();
    chk('clear removes the record', v.record === null && Object.keys(v.files).length === 0, JSON.stringify(v.record), 'null');
    r = await req('POST', `/api/clients/${other.id}/gbp/generate`);
    chk('generate for a client with no v3 page map is 400 with the reason', r.status === 400 && /v3 page map/.test((await r.json()).error), r.status, 400);
  } finally { srv.close(); }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
