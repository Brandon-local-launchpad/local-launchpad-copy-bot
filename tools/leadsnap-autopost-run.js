'use strict';
// ── Lead Snap autopost, local real run (5 Nov) ───────────────────────────────
// Writes the config with the real model on a fixture client, as the live app does, and saves the
// sheet and record to tests/quality-runs/leadsnap/<client>/<time>/. No database is opened.
//
//   node tools/leadsnap-autopost-run.js plumber        the spec's worked example
//   node tools/leadsnap-autopost-run.js edens-edge     the Edens Edge page map (31 service pages)
//   node tools/leadsnap-autopost-run.js dog-walker     Book, with a booking URL
//   node tools/leadsnap-autopost-run.js kestrel-thin   no USPs, no brand photos, few photos
//   node tools/leadsnap-autopost-run.js --live-record "<client>"   the intake saved in a live client's config: READ ONLY,
//     one read only transaction on the .env database, and the results stay on this machine
//   add --preview to run Preview posts on the result: up to about 40p more, saved as previews.json
//
// Needs ANTHROPIC_API_KEY in the environment or .env. A run costs a few pence.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && ['ANTHROPIC_API_KEY', 'DATABASE_URL'].includes(m[1]) && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY is not set.'); process.exit(1); }

const Anthropic = require('@anthropic-ai/sdk');
const { makeCallModel } = require(path.join(root, 'anthropic-call.js'));
const { buildIntake, groupServices } = require(path.join(root, 'leadsnap/autopost/intake.js'));
const { decide } = require(path.join(root, 'leadsnap/autopost/decide.js'));
const G = require(path.join(root, 'leadsnap/autopost/generate.js'));
const { runPreview, estimate, checkSample } = require(path.join(root, 'leadsnap/autopost/preview.js'));

const simple = ({ name, primary, town, areas, services, proofPoints = [], accreditations = 'none', years_trading = '', site = '', phone = '' }) => ({
  name, primary, town, areas: [town, ...areas], serviceAreasPageMap: [town, ...areas], serviceAreasFrom: 'the page map', siteUrl: site, primarySlug: `/${primary.toLowerCase().replace(/\s+/g, '-')}`,
  locked: services.map(([service, copyPriority = 0]) => ({ service, copyPriority })), accreditations, proofPoints,
  validatorCtx: { cv: { company_name: name, phone, live_domain: site, years_trading } },
});

function client(name) {
  if (name === 'plumber') {
    const I = simple({ name: 'Hartley Plumbing & Heating', primary: 'Plumber', town: 'Romford', areas: ['Hornchurch', 'Upminster', 'Gidea Park', 'Harold Wood', 'Collier Row', 'Dagenham', 'Brentwood'], services: [['Boiler repair', 900], ['Boiler installation', 800], ['Leak repair', 300], ['Bathroom fitting', 200], ['Drain unblocking', 100]], years_trading: '15', accreditations: 'Gas Safe registered', proofPoints: ['same day callouts', 'fixed prices agreed before work starts'], phone: '01708 123456' });
    return { I, trade: 'Plumbing & Heating', answers: { tone: 'Friendly, plain-spoken', words_to_avoid: '' }, hand: { counts: { boilers: 6, 'leak-repair': 4, 'bathroom-fitting': 0, 'drain-unblocking': 2 }, brand: 5, offer: 'Free boiler quote' } };
  }
  if (name === 'dog-walker') {
    const I = simple({ name: 'Happy Tails', primary: 'Dog Walker', town: 'Bath', areas: ['Keynsham', 'Saltford', 'Bathford', 'Batheaston', 'Combe Down', 'Odd Down', 'Weston'], services: [['Dog walking', 50], ['Puppy visits', 20], ['Pet sitting', 10]], proofPoints: ['insured and DBS checked', 'small groups only', 'photo updates after every walk'], site: 'https://happytails.example' });
    return { I, trade: 'Pet Care Services (Dog Walkers)', answers: {}, hand: { counts: { 'dog-walking': 8, 'puppy-visits': 4, 'pet-sitting': 1 }, brand: 3, booking_url: 'https://happytails.example/book' } };
  }
  if (name === 'kestrel-thin') {
    // A thin client: no USPs, few photos, no brand photos, no site
    const I = simple({ name: 'Kestrel Ridge Roofing', primary: 'Roofer', town: 'Exeter', areas: ['Topsham', 'Exmouth', 'Crediton'], services: [['Roof repairs', 90], ['Flat roofing', 40], ['Guttering', 20]], phone: '01392 000000' });
    return { I, trade: 'Roofers', answers: {}, hand: { counts: { roofs: 4, guttering: 1 }, brand: 0 } };
  }
  if (name === 'edens-edge') {
    const { buildGbpInputs } = require(path.join(root, 'gbp/inputs.js'));
    const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));
    const E = require(path.join(root, 'tests/fixtures/data/edens-edge-acceptance.js'));
    const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
    const { rows } = require(path.join(root, 'tests/fixtures/data/edens-edge-v3-page-map.json'));
    const hand = { baseTown: 'Southampton', otherTowns: ['Romsey', 'Winchester', 'Eastleigh', 'Chandlers Ford', 'Ampfield', 'Stockbridge', 'Awbridge', 'Chilworth', 'Hedge End', 'Lyndhurst', 'New Forest District', 'Lockerley', 'Kings Worthy'], categories: ['Gardener', 'Landscape Gardener', 'Landscape Designer', 'Tree Service', 'Paving Contractor', 'Deck Builder'] };
    const cv = { ...E.ethanValues(), jobs_wanted: ['Landscape Gardener', 'Patios'], live_domain: 'edensedge-landscaping.co.uk' };
    const ctx = contextFromPageMap({ rows, hand, cv, niche: landscaper });
    const I = buildGbpInputs({ cv, niche: landscaper, rows, keyValueMap: ctx.keyValueMap, siteUrl: '' });
    // Made up photo counts: the top few have photos, one is short, the rest have none
    const groups = groupServices(I.locked, cv.jobs_wanted);
    const counts = Object.fromEntries(groups.map((g, i) => [g.key, i < 3 ? 8 - i : i === 3 ? 2 : 0]));
    return { I, trade: 'Landscapers/Gardeners', answers: {}, hand: { counts, brand: 4 } };
  }
  throw new Error(`Unknown client "${name}". Use plumber, edens-edge or dog-walker.`);
}

// Reads one client's saved config and samples. Nothing is written: the transaction is read only.
async function liveRecord(name) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const c = await pool.connect();
  try {
    await c.query('BEGIN READ ONLY');
    const { rows } = await c.query(`SELECT cl.name, a.asset_type, a.content FROM client_assets a JOIN clients cl ON cl.id = a.client_id WHERE cl.name ILIKE $1 AND a.asset_type IN ('leadsnap_autopost', 'leadsnap_previews') ORDER BY a.uploaded_at DESC`, [`%${name}%`]);
    await c.query('ROLLBACK');
    const get = t => { const r = rows.find(x => x.asset_type === t); return r ? { client: r.name, data: typeof r.content === 'string' ? JSON.parse(r.content) : r.content } : null; };
    return { record: get('leadsnap_autopost'), previews: get('leadsnap_previews') };
  } finally { c.release(); await pool.end(); }
}

(async () => {
  const liveAt = process.argv.indexOf('--live-record');
  const name = liveAt >= 0 ? 'live' : (process.argv[2] || 'plumber');
  let intake, livePreviews = null;
  if (liveAt >= 0) {
    const live = await liveRecord(process.argv[liveAt + 1]);
    if (!live.record) throw new Error('No saved Lead Snap config found for that client.');
    const R0 = live.record.data.intake;
    intake = { ...R0, warnings: [], missing: [], ok: true, mainTown: R0.mainTown || R0.areas[0], nearby: R0.areas.slice(1), allAreas: R0.allAreas || R0.areas, offerSource: R0.offerSource || '' };
    livePreviews = live.previews ? { ...live.previews.data, record: live.record.data } : null;
    console.log(`Live config read for "${live.record.client}", generated ${live.record.data.generated_at}. Nothing written.`);
    if (livePreviews) {
      const old = livePreviews.prompts.flatMap(p => p.samples.filter(s => !s.error).map(s => ({ p: p.n, n: s.n, text: s.text })));
      const hits = old.map(s => ({ ...s, c: checkSample(s.text, {}, R0).checks.find(k => k.id === 'claims') })).filter(s => s.c.level === 'fail');
      console.log(`Your saved live samples under the new claims check: ${hits.length} of ${old.length} FAIL`);
      for (const h of hits) console.log(`  P${h.p}.${h.n}: ${h.c.detail}`.slice(0, 170));
    }
  } else {
    const { I, trade, answers, hand } = client(name);
    intake = buildIntake({ I, trade, answers, hand });
  }
  const D = decide(intake);
  console.log(`${intake.groups.length} whole services`);
  console.log(intake.groups.map(g => `  ${g.key}: ${g.label} (${g.photos} photos): ${g.services.join(', ')}`).join('\n'));
  console.log(`USPs: ${intake.usps.join('; ')}\nAreas: ${intake.areasWhy}\n${intake.areas.join(', ')}\nCTA: ${intake.cta.line}\nWarnings: ${intake.warnings.join(' | ') || 'none'}\nNotes: ${D.notes.join(' | ') || 'none'}`);
  console.log(D.prompts.map(p => `  ${p.n}. ${p.label} | ${p.folder} (${p.photos}) | ${p.why}`).join('\n'));
  const callModel = makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), G.MODEL, {});
  const rec = await G.runAutopost({ intake, callModel, log: m => console.log(m) });
  const dir = path.join(root, 'tests/quality-runs/leadsnap', name, new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'record.json'), JSON.stringify(rec, null, 2));
  if (rec.failure) { console.log(`\nFAILED: ${rec.failure.error}\n${rec.failure.fails.map(f => `- ${f.message}`).join('\n')}\nSaved to ${dir}`); process.exit(1); }
  fs.writeFileSync(path.join(dir, 'autopost-config.txt'), rec.sheet);
  console.log(`\nPassed in ${rec.attempts} attempt(s). Flags: ${rec.flags.map(f => f.message).join(' | ') || 'none'}. Longest prompt ${Math.max(...rec.output.prompts.map(p => p.chars))} characters.\nSaved to ${dir}\n\n${rec.sheet}`);
  if (process.argv.includes('--preview')) {
    console.log(`\nPreview: ${estimate(rec.output.prompts).samples} samples, about ${estimate(rec.output.prompts).pence}p`);
    const pv = await runPreview({ record: rec, callModel: args => callModel(args), log: m => console.log(m) });
    fs.writeFileSync(path.join(dir, 'previews.json'), JSON.stringify(pv, null, 2));
    console.log(`PREVIEW ${pv.summary.clean} of ${pv.summary.samples} clean, ${pv.summary.warned} warned, ${pv.summary.claim_failed} with an unconfirmed claim, ${pv.summary.failed} failed, ${pv.summary.opening_pairs} of ${pv.summary.compared} cross prompt pairs share an opening, cost ${pv.pence}p (${pv.usage.input_tokens} in, ${pv.usage.output_tokens} out)`);
    for (const p of pv.prompts) {
      console.log(`\n## ${p.n}. ${p.label}`);
      for (const s of p.samples) console.log(`  sample ${s.n}: ${s.words} words | ${s.error || s.checks.filter(c => c.level === 'warn').map(c => `${c.id}: ${c.detail}`).join(' | ') || 'clean'} | opens: ${s.text.split(/\s+/).slice(0, 9).join(' ')}`);
    }
    console.log(`\nAREAS: ${pv.areas.on_area} of ${pv.areas.samples} samples name their own area`);
    for (const [t, n] of Object.entries(pv.areas.assigned)) console.log(`  ${t}: ${n} prompts, named in ${pv.areas.named[t] || 0} samples`);
    console.log(`  Other towns named: ${Object.entries(pv.areas.named).filter(([t, n]) => n && !(t in pv.areas.assigned)).map(([t, n]) => `${t} ${n}`).join(', ') || 'none'}`);
    const claimFails = pv.prompts.flatMap(p => p.samples.filter(s => s.fails).map(s => `  P${p.n}.${s.n}: ${s.checks.find(k => k.id === 'claims').detail}`));
    console.log(`\nCLAIM FAILS: ${claimFails.length}`);
    claimFails.forEach(l => console.log(l.slice(0, 200)));
    console.log('\nACROSS PROMPTS SHARING A FOLDER');
    for (const f of pv.folders) {
      console.log(`\n${f.folder}: prompts ${f.prompts.join(', ')}. ${f.compared} sample pairs compared: ${f.opening_pairs} share an opening, ${f.phrase_pairs} share 8+ words in a row, longest ${f.longest}`);
      for (const w of f.warnings) console.log(`  WARN ${w.message}`.slice(0, 260));
      for (const x of f.phrases) console.log(`  info ${x.refs.join(' and ')} share ${x.words} words: ${x.text}`.slice(0, 240));
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
