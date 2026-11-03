'use strict';

// ── Competitor gap check ──────────────────────────────────────────────────────────
// Which directories the client's map pack competitors are on that the client is not:
//   1. the top three competitors for "[primary category] [base town]": the latest saved
//      competitor run (gbp/competitors.js, the GBP tab's check) when there is one, else the
//      check is run now through competitorsFor
//   2. each competitor's referring domains from DataForSEO (backlinks/referring_domains/live)
//   3. the client's own referring domains, so a directory the client is on but has not
//      recorded still counts as had
//   4. the domains are filtered to UK directory and citation sites: the directory database
//      first (a known domain is a gap with its tier, cost and DA), then the rest go to a
//      cheap model call (prompts/Citations_Domain_Classifier_CORE.md) in batches; non UK,
//      spam (the model, or a DataForSEO spam score of 50 or more), platforms and the
//      competitors' own sites are dropped with the reason. Whether a domain is indexed is
//      not checked (that would be one search per domain).
//   5. the gaps are listed with how many of the three have it, the DataForSEO domain rank
//      as DA and the cost where known. addToDatabase makes a directory row from a gap
//      (tier and priority asked in the UI) and marks the gap as in the database.
// The DataForSEO spend and the model spend are kept on the run row and logged.

const fs = require('fs');
const path = require('path');
const DFS = require('./dataforseo');
const { registrableDomain } = require('./seed');
const { PRICES, USD_TO_GBP, costPence } = require('../ui/model-log');

const PROMPT_FILE = path.join(__dirname, '..', 'prompts', 'Citations_Domain_Classifier_CORE.md');
const CLASSIFIER_MODEL = 'claude-haiku-5-5';
const BATCH = 60;
const SPAM_SCORE = 50;
// Hosts that are never a citation: the client's own kind of site aside, these are platforms, tools and media
const PLATFORM_RE = /(^|\.)(google|googleapis|gstatic|youtube|facebook|instagram|twitter|x|linkedin|pinterest|tiktok|wordpress|wp|blogspot|wixsite|squarespace|godaddy|webflow|weebly|shopify|amazon|amazonaws|cloudfront|cloudflare|akamaihd|github|gitlab|microsoft|apple|adobe|canva|mailchimp|hubspot|bit|t|goo|reddit|quora|medium|tumblr|vimeo|flickr|dropbox|zoom|semrush|ahrefs|moz|similarweb|archive|wikipedia|wikimedia)\.(com|co\.uk|org|net|io|ly|gl|me)$/i;
const str = v => (v == null ? '' : String(v)).trim();
const json = v => (v == null ? null : JSON.stringify(v));
const parse = v => { if (v == null || v === '') return null; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch (_) { return null; } };
const hostOf = u => { try { return new URL(/^https?:/i.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase(); } catch (_) { return ''; } };

function readPrompt(file = PROMPT_FILE) {
  const text = fs.readFileSync(file, 'utf8');
  const i = text.indexOf('## Task');
  return i >= 0 ? text.slice(i) : text;
}

// The model's answer to a batch: [{ domain, directory, uk, spam, name, kind }]
function parseClassification(text, domains) {
  const s = String(text || '');
  const a = s.indexOf('['), b = s.lastIndexOf(']');
  let arr = null;
  try { arr = JSON.parse(a >= 0 && b > a ? s.slice(a, b + 1) : s); } catch (_) { arr = null; }
  const out = new Map();
  for (const it of Array.isArray(arr) ? arr : []) { if (it && it.domain) out.set(String(it.domain).toLowerCase().replace(/^www\./, ''), { directory: it.directory === true, uk: it.uk === true, spam: it.spam === true, name: str(it.name), kind: str(it.kind) || 'other' }); }
  for (const d of domains) if (!out.has(d)) out.set(d, { directory: false, uk: false, spam: false, name: '', kind: 'unknown', unanswered: true });
  return out;
}
const usd = (model, usage) => Math.round((costPence(model, usage) / 100 / USD_TO_GBP) * 1e4) / 1e4;

// competitorsFor(clientId) → { keyword, competitors: [{ name, website, place_id }] } (the GBP check's run shape)
function createGaps({ pool, store, clientCitations, competitorsFor, dfs = DFS, callModel = null, env = process.env, log = console, model = CLASSIFIER_MODEL, promptFile = PROMPT_FILE }) {
  async function latest(clientId) {
    const { rows } = await pool.query(`SELECT * FROM citation_gap_runs WHERE client_id = $1 ORDER BY at DESC LIMIT 1`, [clientId]);
    const r = rows[0];
    return r ? { ...r, competitors: parse(r.competitors) || [], gaps: parse(r.gaps) || [], dropped: parse(r.dropped) || [], cost_usd: Number(r.cost_usd), model_cost_usd: Number(r.model_cost_usd), calls: Number(r.calls) } : null;
  }

  async function classify(domains, { keyword = '' } = {}) {
    if (!callModel) return { verdicts: new Map(domains.map(d => [d, { directory: false, uk: false, spam: false, name: '', kind: 'unknown', unanswered: true, reason: 'no model configured' }])), cost: 0, calls: 0 };
    const system = readPrompt(promptFile);
    const verdicts = new Map();
    let cost = 0, calls = 0;
    for (let i = 0; i < domains.length; i += BATCH) {
      const chunk = domains.slice(i, i + BATCH);
      const message = `The client is a UK tradesperson${keyword ? ` searched as "${keyword}"` : ''}. Classify these ${chunk.length} domains:\n${chunk.map(d => `- ${d}`).join('\n')}`;
      const r = await callModel({ system, message, maxTokens: 4000, model, effort: 'low' });
      calls++;
      cost += usd(r.usage && r.usage.model ? r.usage.model : model, r.usage || {});
      for (const [d, v] of parseClassification(r.text, chunk)) verdicts.set(d, v);
    }
    return { verdicts, cost: Math.round(cost * 1e4) / 1e4, calls };
  }

  async function run(clientId, { now = () => new Date() } = {}) {
    if (!dfs.configured(env)) throw Object.assign(new Error('DataForSEO is not set up on this server (DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD).'), { status: 503 });
    const view = await clientCitations.view(clientId);
    const opts = { env };
    let cost = 0, calls = 0;
    const spend = r => { cost = Math.round((cost + (Number(r.cost) || 0)) * 1e4) / 1e4; calls++; };
    const comp = await competitorsFor(clientId);
    const competitors = (comp && comp.competitors || []).filter(c => hostOf(c.website)).slice(0, 3).map(c => ({ name: c.name, website: c.website, domain: registrableDomain(hostOf(c.website)), place_id: c.place_id || null }));
    if (!competitors.length) throw Object.assign(new Error('No competitor with a website: run the competitor check on the GBP tab first, or give the client a primary category and a base town.'), { status: 400 });
    const keyword = (comp && comp.keyword) || '';
    // What the client has: directories listed on the tab, and the client's own referring domains
    const has = new Set(view.tiers.flatMap(t => t.rows).filter(r => r.row.listed === 'yes').map(r => r.directory.domain).filter(Boolean));
    const clientHost = hostOf(view.nap.website);
    const clientDomain = clientHost ? registrableDomain(clientHost) : '';
    if (clientDomain) {
      try { const r = await dfs.referringDomains(clientDomain, { ...opts, limit: 1000 }); spend(r); for (const it of r.items) has.add(registrableDomain(it.domain)); }
      catch (e) { log.warn(`[citations] the client's referring domains failed: ${e.message}`); }
    }
    // The competitors' referring domains, counted per domain
    const seen = new Map(); // domain → { competitors_with, rank, backlinks, spam_score, first_seen, example }
    for (const c of competitors) {
      const r = await dfs.referringDomains(c.domain, { ...opts, limit: 1000 });
      spend(r);
      const mine = new Set();
      for (const it of r.items) {
        const d = registrableDomain(it.domain);
        if (!d || mine.has(d)) continue;
        mine.add(d);
        const cur = seen.get(d) || { domain: d, competitors_with: 0, rank: null, backlinks: 0, spam_score: null, first_seen: null, competitors: [] };
        cur.competitors_with++; cur.competitors.push(c.name);
        cur.rank = cur.rank == null ? it.rank : Math.max(cur.rank, it.rank == null ? 0 : it.rank);
        cur.backlinks += it.backlinks || 0;
        cur.spam_score = it.spam_score == null ? cur.spam_score : Math.max(cur.spam_score || 0, it.spam_score);
        if (!cur.first_seen || (it.first_seen && it.first_seen < cur.first_seen)) cur.first_seen = it.first_seen;
        seen.set(d, cur);
      }
    }
    // Filter: had, the competitors' own sites, platforms, spam, retired directories; the rest known or classified
    const gaps = [], dropped = [];
    const unknown = [];
    const compDomains = new Set(competitors.map(c => c.domain));
    for (const [d, x] of seen) {
      if (has.has(d) || [...has].some(h => d === h || d.endsWith('.' + h))) { dropped.push({ domain: d, reason: 'the client has it' }); continue; }
      if (compDomains.has(d) || d === clientDomain) { dropped.push({ domain: d, reason: 'a competitor\'s own site' }); continue; }
      if (PLATFORM_RE.test(d)) { dropped.push({ domain: d, reason: 'a platform, not a directory' }); continue; }
      if (x.spam_score != null && x.spam_score >= SPAM_SCORE) { dropped.push({ domain: d, reason: `spam score ${x.spam_score}` }); continue; }
      const known = await store.byDomain(d);
      if (known) {
        if (known.retired) { dropped.push({ domain: d, reason: `a retired directory (${known.name})` }); continue; }
        gaps.push({ domain: d, name: known.name, kind: known.type, directory_id: known.id, tier: known.tier, cost: known.cost, priority: known.priority, da: known.da != null ? known.da : x.rank, rank: x.rank, competitors_with: x.competitors_with, competitors: x.competitors, example_url: known.url && !known.url.includes('<') ? known.url : '', source: 'database' });
        continue;
      }
      unknown.push(d);
    }
    let modelCost = 0, modelCalls = 0;
    if (unknown.length) {
      const cl = await classify(unknown, { keyword });
      modelCost = cl.cost; modelCalls = cl.calls;
      for (const d of unknown) {
        const v = cl.verdicts.get(d) || {};
        const x = seen.get(d);
        if (v.unanswered) { dropped.push({ domain: d, reason: v.reason || 'the model gave no answer' }); continue; }
        if (!v.directory) { dropped.push({ domain: d, reason: `not a directory (${v.kind || 'other'})` }); continue; }
        if (!v.uk) { dropped.push({ domain: d, reason: 'not UK' }); continue; }
        if (v.spam) { dropped.push({ domain: d, reason: 'spam (the model)' }); continue; }
        gaps.push({ domain: d, name: v.name || d, kind: v.kind, directory_id: null, tier: null, cost: null, priority: null, da: x.rank, rank: x.rank, competitors_with: x.competitors_with, competitors: x.competitors, example_url: `https://${d}/`, source: 'model' });
      }
    }
    gaps.sort((a, b) => (b.competitors_with - a.competitors_with) || ((b.da || 0) - (a.da || 0)) || a.domain.localeCompare(b.domain));
    const at = now();
    const { rows } = await pool.query(`INSERT INTO citation_gap_runs (client_id, at, keyword, competitors, gaps, dropped, cost_usd, model_cost_usd, calls) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`, [clientId, at, keyword, json(competitors), json(gaps), json(dropped), cost, modelCost, calls + modelCalls]);
    await store.logCost({ kind: 'gaps', clientId, cost: cost + modelCost, calls: calls + modelCalls, detail: { run_id: rows[0].id, dataforseo: cost, model: modelCost, competitors: competitors.length, domains: seen.size, gaps: gaps.length, unknown: unknown.length } }).catch(() => {});
    return { id: rows[0].id, at: at.toISOString(), keyword, competitors, gaps, dropped, cost_usd: cost, model_cost_usd: modelCost, calls: calls + modelCalls, domains_seen: seen.size, classified: unknown.length };
  }

  // A gap becomes a directory row; the latest run's gap is marked as in the database
  async function addToDatabase(clientId, { domain, name, url, tier, priority, cost = 'free' } = {}) {
    const d = registrableDomain(hostOf(domain));
    if (!d) throw Object.assign(new Error('A domain is needed.'), { status: 400 });
    const existing = await store.byDomain(d);
    const dir = existing || await store.create({ name: str(name) || d, url: str(url) || `https://${d}/`, domain: d, tier: str(tier) || 'uk_secondary', priority: str(priority) || 'P2', cost, type: 'From the competitor gap check', applies_to: { kind: 'all' }, needs_live_check: true, notes: `Added from the competitor gap check on ${new Date().toISOString().slice(0, 10)}.` });
    const last = await latest(clientId);
    if (last) {
      const gaps = last.gaps.map(g => (g.domain === d ? { ...g, directory_id: dir.id, name: dir.name, tier: dir.tier, cost: dir.cost, priority: dir.priority, source: 'database' } : g));
      await pool.query(`UPDATE citation_gap_runs SET gaps = $2 WHERE id = $1`, [last.id, json(gaps)]);
    }
    return dir;
  }

  return { run, latest, addToDatabase, classify };
}

module.exports = { createGaps, parseClassification, readPrompt, CLASSIFIER_MODEL, BATCH, SPAM_SCORE, PLATFORM_RE, PROMPT_FILE };
