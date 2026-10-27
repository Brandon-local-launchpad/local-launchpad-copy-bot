'use strict';

// ── The library pages (27 Oct 2026): niche library, prompts, settings ───────────
//   GET /api/niche-library            every niche: key, label, the files it has, clients on it
//   GET /api/niche-library/:key       one niche: the entry (briefs by page type and business type, work
//                                     nouns, words), the services library rows, the calibration pack, the clients
//   GET /api/prompts                  prompts/*.md with the CORE number, size, last change (git, else mtime)
//   GET /api/prompts/:name            one prompt's text, read only
//   GET /api/settings                 API keys set or not (never the value), model routing per call type,
//                                     LeadSnap (token set; the plan on request), spend this month, the users
// Read only. The niche .json is the file the code reads (CLAUDE.md), shown as it is.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const N = require('../fillout/niches');

const ROOT = path.join(__dirname, '..');
const LIB = path.join(ROOT, 'niche-library');
const PROMPTS = path.join(ROOT, 'prompts');

// Niche key → the library's file stem (niche-library/<stem>.csv, <stem>.json)
const STEM = { landscapers: 'landscaper', roofers: 'roofer', builders: 'builder', cleaning: 'cleaning', 'dog-walkers': 'pet-care', 'driveways-paving': 'driveways', electricians: 'electrician', 'loft-extensions': 'loft-conversions', 'tree-surgeons': 'tree-surgeon' };
function stemFor(key) {
  if (STEM[key]) return STEM[key];
  const files = fs.existsSync(LIB) ? fs.readdirSync(LIB) : [];
  const k = String(key || '').toLowerCase();
  const direct = files.find(f => f.endsWith('.csv') && !f.endsWith('-categories.csv') && f.replace(/\.csv$/, '') === k);
  if (direct) return direct.replace(/\.csv$/, '');
  const first = k.split('-')[0];
  const loose = files.find(f => f.endsWith('.csv') && !f.endsWith('-categories.csv') && f.replace(/\.csv$/, '').startsWith(first));
  return loose ? loose.replace(/\.csv$/, '') : k;
}
const exists = p => { try { return fs.existsSync(p); } catch (_) { return false; } };
const readJson = p => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; } };
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...rest] = rows;
  return rest.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}
function calibrationPackFor(stem, entry) {
  const names = fs.readdirSync(ROOT).filter(f => /Calibration_Pack/i.test(f) && f.endsWith('.md'));
  const want = (entry && entry.trade ? String(entry.trade) : stem).toLowerCase().replace(/[^a-z]/g, '');
  const hit = names.find(f => f.toLowerCase().replace(/[^a-z]/g, '').startsWith(want.slice(0, 6))) || names.find(f => f.toLowerCase().includes(stem.split('-')[0]));
  if (!hit) return { exists: false };
  const st = fs.statSync(path.join(ROOT, hit));
  return { exists: true, file: hit, version: (hit.match(/_v(\d+)/) || [])[1] || null, size: st.size, modified: st.mtime };
}

async function nicheList({ pool }) {
  const clients = pool ? (await pool.query(`SELECT id, name, niche_key, archived_at FROM clients WHERE archived_at IS NULL`)).rows : [];
  return N.allNiches().map(n => {
    const stem = stemFor(n.key);
    const json = exists(path.join(LIB, `${stem}.json`)), csv = exists(path.join(LIB, `${stem}.csv`)), cats = exists(path.join(LIB, `${stem}-categories.csv`));
    const entry = json ? readJson(path.join(LIB, `${stem}.json`)) : null;
    const pack = calibrationPackFor(stem, entry);
    const tfBlock = exists(path.join(ROOT, 'trade-facts', 'blocks', `${stem}.md`));
    const clientsOn = clients.filter(c => c.niche_key === n.key);
    return { key: n.key, label: n.label, stem, has: { entry: json, services: csv, categories: cats, pack: pack.exists, trade_facts_block: tfBlock }, clients: clientsOn.length, ready: json && csv && pack.exists };
  });
}

async function nicheDetail({ pool, key }) {
  const niche = N.nicheByKey(key);
  if (!niche) throw Object.assign(new Error('Unknown niche.'), { status: 404 });
  const stem = stemFor(key);
  const entry = exists(path.join(LIB, `${stem}.json`)) ? readJson(path.join(LIB, `${stem}.json`)) : null;
  const services = exists(path.join(LIB, `${stem}.csv`)) ? parseCsv(fs.readFileSync(path.join(LIB, `${stem}.csv`), 'utf8')) : [];
  const categories = exists(path.join(LIB, `${stem}-categories.csv`)) ? parseCsv(fs.readFileSync(path.join(LIB, `${stem}-categories.csv`), 'utf8')) : [];
  const pack = calibrationPackFor(stem, entry);
  const clients = pool ? (await pool.query(`SELECT id, name, archived_at, created_at FROM clients WHERE niche_key = $1 ORDER BY created_at DESC`, [key])).rows : [];
  const briefs = entry ? Object.fromEntries(['category_page_blocks', 'service_page_blocks', 'location_page_blocks'].map(k => [k, entry[k] ? Object.keys(entry[k]) : []])) : {};
  return { key, label: niche.label, stem, entry, briefs, services, categories, pack, clients: clients.map(c => ({ id: c.id, name: c.name, archived: !!c.archived_at })), trade_facts_block: exists(path.join(ROOT, 'trade-facts', 'blocks', `${stem}.md`)) };
}

// ── Prompts ──
function gitDate(file) {
  return new Promise(resolve => {
    execFile('git', ['log', '-1', '--format=%cI', '--', file], { cwd: ROOT, timeout: 4000 }, (err, out) => resolve(!err && out.trim() ? out.trim() : null));
  });
}
async function promptList() {
  if (!exists(PROMPTS)) return [];
  const files = fs.readdirSync(PROMPTS).filter(f => f.endsWith('.md')).sort();
  return Promise.all(files.map(async f => {
    const st = fs.statSync(path.join(PROMPTS, f));
    const text = fs.readFileSync(path.join(PROMPTS, f), 'utf8');
    const m = f.match(/CORE \((\d+)\)/);
    return { name: f, title: f.replace(/\.md$/, '').replace(/_/g, ' '), core: m ? Number(m[1]) : (/CORE/.test(f) ? 'CORE' : null), shared: f.startsWith('_'), size: st.size, words: text.split(/\s+/).filter(Boolean).length, modified: (await gitDate(path.join('prompts', f))) || st.mtime.toISOString() };
  }));
}
function promptText(name) {
  const safe = path.basename(String(name || ''));
  const p = path.join(PROMPTS, safe);
  if (!safe.endsWith('.md') || !exists(p)) throw Object.assign(new Error('No such prompt.'), { status: 404 });
  return { name: safe, text: fs.readFileSync(p, 'utf8') };
}

// ── Settings ──
const KEYS = [['ANTHROPIC_API_KEY', 'Anthropic (the writer, the reviewer, the claims check)'], ['PERPLEXITY_API_KEY', 'Perplexity (area research, FAQ research, trade facts)'], ['DATAFORSEO_LOGIN', 'DataForSEO login (H1 search volumes)'], ['DATAFORSEO_PASSWORD', 'DataForSEO password'], ['GOOGLE_PLACES_API_KEY', 'Google Places (the GBP competitor check, the wizard)'], ['LEADSNAP_API_TOKEN', 'LeadSnap (rank scans)'], ['FILLOUT_WEBHOOK_SECRET', 'Fillout webhook secret'], ['FILLOUT_API_KEY', 'Fillout API key (the form options tool)'], ['FILLOUT_FORM_URL', 'Fillout form link (the wizard shows it)'], ['APP_PASSWORD', 'App password'], ['DATABASE_URL', 'Database']];
function modelRouting() {
  const G = require('../v20-generate');
  const read = (file, re) => { try { const m = fs.readFileSync(path.join(ROOT, file), 'utf8').match(re); return m ? m[1] : null; } catch (_) { return null; } };
  return [
    { call: 'Homepage (CORE 20)', model: G.V20_MODEL, where: 'v20-generate.js' },
    { call: 'Category pages (CORE 16)', model: read('category-generate.js', /CATEGORY_MODEL = (G\.V20_MODEL|'[^']+')/) === 'G.V20_MODEL' ? G.V20_MODEL : read('category-generate.js', /CATEGORY_MODEL = '([^']+)'/), where: 'category-generate.js' },
    { call: 'Service pages (CORE 17)', model: read('service-generate.js', /SERVICE_MODEL = (G\.V20_MODEL|'[^']+')/) === 'G.V20_MODEL' ? G.V20_MODEL : read('service-generate.js', /SERVICE_MODEL = '([^']+)'/), where: 'service-generate.js' },
    { call: 'Location pages (CORE 18)', model: read('location-generate.js', /LOCATION_MODEL = (G\.V20_MODEL|'[^']+')/) === 'G.V20_MODEL' ? G.V20_MODEL : read('location-generate.js', /LOCATION_MODEL = '([^']+)'/), where: 'location-generate.js' },
    { call: 'Field retries', model: G.V20_MODEL, where: 'v20-retry.js (the writer\'s model)' },
    { call: 'Quality review (the rubric judge)', model: read('quality-review.js', /REVIEW_MODEL = '([^']+)'/), where: 'quality-review.js' },
    { call: 'Claims review', model: read('wp/claims-review.js', /CLAIMS_MODEL = '([^']+)'/), where: 'wp/claims-review.js' },
    { call: 'Allocation pass', model: read('allocation.js', /ALLOCATION_MODEL\s*=\s*'([^']+)'/), where: 'allocation.js' },
    { call: 'FAQ sorting', model: read('faq-sort.js', /FAQ_SORT_MODEL\s*=\s*'([^']+)'/), where: 'faq-sort.js' },
    { call: 'GBP output', model: read('gbp/generate.js', /GBP_MODEL = '([^']+)'/), where: 'gbp/generate.js' },
    { call: 'Client values prefill, price extraction, the wizard\'s website read', model: 'claude-sonnet-4-6', where: 'server.js, fillout/prices.js, ui/intake.js' },
    { call: 'Area research, FAQ research, trade facts', model: `Perplexity (${process.env.PERPLEXITY_PRESET || 'medium'})`, where: 'server.js, faq-research.js, scripts/trade-facts.js' },
  ];
}
async function settings({ pool, modelLog = null }) {
  const keys = KEYS.map(([k, label]) => ({ key: k, label, set: !!process.env[k] }));
  const users = pool ? (await pool.query(`SELECT DISTINCT assigned_to AS name FROM clients WHERE assigned_to IS NOT NULL AND assigned_to <> '' ORDER BY 1`)).rows.map(r => r.name) : [];
  const spend = modelLog && pool ? await modelLog.spend().catch(e => ({ error: e.message })) : null;
  return { keys, routing: modelRouting(), leadsnap: { token: !!process.env.LEADSNAP_API_TOKEN, base: process.env.LEADSNAP_BASE_URL || null }, spend, users, fillout_form_url: process.env.FILLOUT_FORM_URL || '' };
}

function mountLibraryApi(app, { pool, modelLog = null, leadsnap = null }) {
  const wrap = fn => async (req, res) => { try { res.json(await fn(req)); } catch (err) { res.status(err.status || 500).json({ error: err.message }); } };
  app.get('/api/niche-library', wrap(() => nicheList({ pool }).then(niches => ({ niches }))));
  app.get('/api/niche-library/:key', wrap(req => nicheDetail({ pool, key: req.params.key })));
  app.get('/api/prompts', wrap(() => promptList().then(prompts => ({ prompts }))));
  app.get('/api/prompts/:name', wrap(req => promptText(req.params.name)));
  app.get('/api/settings', wrap(() => settings({ pool, modelLog })));
  // The LeadSnap plan: read only, on request (never on page load)
  app.get('/api/settings/leadsnap', wrap(async () => {
    if (!leadsnap) throw Object.assign(new Error('LeadSnap is not configured (LEADSNAP_API_TOKEN).'), { status: 503 });
    const companies = await leadsnap.listCompanies({ per_page: 50 });
    return { companies: (Array.isArray(companies) ? companies : []).map(c => ({ id: c.id, name: c.name, client_type: c.client_type, activated: c.activated })) };
  }));
}

module.exports = { mountLibraryApi, nicheList, nicheDetail, promptList, promptText, settings, modelRouting, stemFor, parseCsv };
