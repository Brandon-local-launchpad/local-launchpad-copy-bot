'use strict';

// ── Competitor gap check ──────────────────────────────────────────────────────────
// Which directories the client's map pack competitors are on that the client is not.
//   1. The competitors: the saved competitor run (gbp/competitors.js, the GBP tab's check,
//      "[primary category] [base town]"), else the check run now through competitorsFor.
//      Each one's Google Business Profile is read (DataForSEO business_data, the category
//      Google shows, the phone, the site) and only a business whose category is the client's
//      primary category is kept, up to three (3 Nov, Brandon: a Places type cannot tell a
//      landscaper from a builder; the GBP category can).
//   2. The directory scan, the first method: each kept competitor is searched for on every
//      directory on the client's list (name, then phone, the same search as the client's
//      scan, citations/scan.js findListing; the result's title or snippet must carry the name
//      or the number). A directory where a competitor is listed and the client is not is a
//      gap, with how many of the three have it.
//   3. The backlinks, the second method: each competitor's referring domains from
//      DataForSEO, for directories that are not in the database yet. What the client has,
//      the competitors' own sites, platforms, spam (a score of 50 or more) and retired
//      directories are dropped; a known directory counts towards the scan gaps; the rest go
//      to one cheap model call per 60 domains (prompts/Citations_Domain_Classifier_CORE.md)
//      and the UK directories among them are new domains, with their DA from one bulk rank
//      call (the referring domains call's rank is 0 for most domains, so it is not used).
//   4. A spend cap (maxUsd, 3 by default) stops the run with what it has, and says so.
// The DataForSEO spend and the model spend are kept on the run row and logged. addToDatabase
// makes a directory row from a new domain and marks it as in the database.

const fs = require('fs');
const path = require('path');
const DFS = require('./dataforseo');
const { registrableDomain } = require('./seed');
const { USD_TO_GBP, costPence } = require('../ui/model-log');
const { findListing } = require('./scan');
const { normName } = require('./nap');

const PROMPT_FILE = path.join(__dirname, '..', 'prompts', 'Citations_Domain_Classifier_CORE.md');
const CLASSIFIER_MODEL = 'claude-haiku-5-5';
const BATCH = 60;
const SPAM_SCORE = 50;
const MAX_USD = 3;
const SEARCH_USD = 0.0101; // one live SERP, from the first run (56 searches, $0.566)
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
// Does a GBP category match the client's primary category? "Landscaper" and "Landscaper" yes; "Landscape designer" no
const sameCategory = (a, b) => !!a && !!b && normName(a) === normName(b);

// competitorsFor(clientId) → { keyword, competitors: [{ name, website, address, place_id, primary_type }] } (the GBP check's run shape)
function createGaps({ pool, store, clientCitations, competitorsFor, dfs = DFS, callModel = null, env = process.env, log = console, model = CLASSIFIER_MODEL, promptFile = PROMPT_FILE, maxUsd = MAX_USD }) {
  async function latest(clientId) {
    const { rows } = await pool.query(`SELECT * FROM citation_gap_runs WHERE client_id = $1 ORDER BY at DESC LIMIT 1`, [clientId]);
    const r = rows[0];
    return r ? { ...r, competitors: parse(r.competitors) || [], gaps: parse(r.gaps) || [], dropped: parse(r.dropped) || [], new_domains: parse(r.new_domains) || [], checked: parse(r.checked) || [], notes: parse(r.notes) || [], cost_usd: Number(r.cost_usd), model_cost_usd: Number(r.model_cost_usd), calls: Number(r.calls) } : null;
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

  async function run(clientId, { now = () => new Date(), cap = maxUsd } = {}) {
    if (!dfs.configured(env)) throw Object.assign(new Error('DataForSEO is not set up on this server (DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD).'), { status: 503 });
    const view = await clientCitations.view(clientId);
    const ctx = await clientCitations.context(clientId);
    const opts = { env, retryDelays: [4000] };
    const notes = [];
    let cost = 0, calls = 0, capHit = false;
    class CapHit extends Error {}
    const spend = (c, n = 1) => { cost = Math.round((cost + (Number(c) || 0)) * 1e4) / 1e4; calls += n; };
    const room = (next = SEARCH_USD) => { if (cost + next > cap) { capHit = true; throw new CapHit(`the spend cap of $${cap} is reached at $${cost.toFixed(2)}`); } };

    // 1. The competitors, by their Google Business Profile category
    const comp = await competitorsFor(clientId);
    const keyword = (comp && comp.keyword) || '';
    const primary = str(ctx.cv.primary_category) || str(keyword.replace(new RegExp(`\\s*${ctx.baseTown.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'), '')) || '';
    const candidates = ((comp && comp.competitors) || []).filter(c => str(c.name));
    if (!candidates.length) throw Object.assign(new Error('No competitor run is saved: run the competitor check on the GBP tab first.'), { status: 400 });
    const checked = [], competitors = [];
    for (const c of candidates) {
      if (competitors.length >= 3) break;
      let info = null;
      try { room(0.006); const r = await dfs.businessInfo(`${c.name}, ${str(c.address) || ctx.baseTown}`, opts); spend(r.cost); info = r.info; }
      catch (e) { if (e instanceof CapHit) throw e; notes.push(`${c.name}: the profile could not be read (${e.message})`); }
      const category = info ? info.category : '';
      const keep = sameCategory(category, primary);
      checked.push({ name: c.name, website: c.website || (info && info.url) || '', places_type: c.primary_type || '', category: category || '(no profile found)', additional_categories: info ? info.additional_categories : [], phone: info ? info.phone : '', kept: keep, why: keep ? `category ${category} matches ${primary}` : info ? `category ${category}, not ${primary}` : 'no Google profile found for the name and address' });
      if (keep) competitors.push({ name: info.title || c.name, website: info.url || c.website || '', domain: registrableDomain(hostOf(info.url || c.website || '')), place_id: c.place_id || info.place_id || null, phone: info.phone || '', category, address: info.address || c.address || '', listed: [] });
    }
    if (!competitors.length) throw Object.assign(new Error(`None of the ${candidates.length} saved competitors has the Google category "${primary}": run the competitor check on the GBP tab again.`), { status: 400 });
    if (competitors.length < 3) notes.push(`Only ${competitors.length} of the ${candidates.length} saved competitors has the category "${primary}"; run the competitor check again for more.`);

    // 2. The directory scan per competitor, on the client's list
    const rows = view.tiers.flatMap(t => t.rows).filter(r => r.directory.domain);
    const listedBy = new Map(); // directory id → [{ name, url }]
    const failedSearches = [];
    let searches = 0;
    try {
      for (const c of competitors) {
        const cnap = { name: c.name, phone: c.phone, website: c.website };
        for (const r of rows) {
          room(SEARCH_USD);
          // The cap is checked before every search, the phone search inside findListing included. A search
          // that fails at DataForSEO (a transient "Internal SE Server Error") is tried once more after a
          // pause, then noted and skipped: one bad search never ends the run
          let found = null;
          for (let attempt = 1; ; attempt++) {
            try { found = await findListing({ dir: r.directory, row: { live_url: '' }, nap: cnap, backlinks: [], dfs, opts, spend: (cst, n) => { spend(cst, n); searches += n; room(SEARCH_USD); } }); break; }
            catch (e) {
              if (e instanceof CapHit) throw e;
              if (attempt < 2) { await new Promise(res => setTimeout(res, 5000)); continue; }
              failedSearches.push(`${c.name} on ${r.directory.name}: ${e.message}`);
              break;
            }
          }
          if (found) { if (!listedBy.has(r.directory.id)) listedBy.set(r.directory.id, []); listedBy.get(r.directory.id).push({ name: c.name, url: found.url, how: found.how }); c.listed.push(r.directory.name); }
        }
      }
    } catch (e) { if (!(e instanceof CapHit)) throw e; notes.push(`The competitor scan stopped: ${e.message}; the directories after that point were not searched.`); }
    if (failedSearches.length) notes.push(`${failedSearches.length} competitor search${failedSearches.length === 1 ? '' : 'es'} failed at DataForSEO after a retry and ${failedSearches.length === 1 ? 'was' : 'were'} skipped: ${failedSearches.slice(0, 8).join('; ')}${failedSearches.length > 8 ? '; …' : ''}`);
    const gaps = rows.filter(r => listedBy.has(r.directory.id) && r.row.listed !== 'yes').map(r => { const who = listedBy.get(r.directory.id); return { directory_id: r.directory.id, name: r.directory.name, domain: r.directory.domain, tier: r.directory.tier, cost: r.directory.cost, priority: r.directory.priority, da: r.directory.da, competitors_with: who.length, competitors: who.map(w => w.name), urls: who.map(w => w.url), client_listed: r.row.listed, source: 'scan' }; });
    const alsoHas = rows.filter(r => listedBy.has(r.directory.id) && r.row.listed === 'yes').map(r => r.directory.name);
    gaps.sort((a, b) => (b.competitors_with - a.competitors_with) || ((b.da || 0) - (a.da || 0)) || a.name.localeCompare(b.name));

    // 3. The backlinks, for directories not in the database
    const dropped = [], newDomains = [];
    let modelCost = 0, modelCalls = 0;
    if (!capHit) {
      const has = new Set(view.tiers.flatMap(t => t.rows).filter(r => r.row.listed === 'yes').map(r => r.directory.domain).filter(Boolean));
      const clientDomain = registrableDomain(hostOf(view.nap.website));
      const seen = new Map();
      try {
        if (clientDomain) { room(0.03); const r = await dfs.referringDomains(clientDomain, { ...opts, limit: 1000 }); spend(r.cost); for (const it of r.items) has.add(registrableDomain(it.domain)); }
        for (const c of competitors) {
          if (!c.domain) continue;
          room(0.03);
          let r;
          try { r = await dfs.referringDomains(c.domain, { ...opts, limit: 1000 }); }
          catch (e) { if (e instanceof CapHit) throw e; notes.push(`${c.name}: the referring domains could not be read (${e.message})`); continue; }
          spend(r.cost);
          const mine = new Set();
          for (const it of r.items) {
            const d = registrableDomain(it.domain);
            if (!d || mine.has(d)) continue;
            mine.add(d);
            const cur = seen.get(d) || { domain: d, competitors_with: 0, backlinks: 0, spam_score: null, first_seen: null, competitors: [] };
            cur.competitors_with++; cur.competitors.push(c.name);
            cur.backlinks += it.backlinks || 0;
            cur.spam_score = it.spam_score == null ? cur.spam_score : Math.max(cur.spam_score || 0, it.spam_score);
            if (!cur.first_seen || (it.first_seen && it.first_seen < cur.first_seen)) cur.first_seen = it.first_seen;
            seen.set(d, cur);
          }
        }
        const compDomains = new Set(competitors.map(c => c.domain));
        const unknown = [];
        for (const [d, x] of seen) {
          if (has.has(d) || [...has].some(h => d === h || d.endsWith('.' + h))) { dropped.push({ domain: d, reason: 'the client has it' }); continue; }
          if (compDomains.has(d) || d === clientDomain) { dropped.push({ domain: d, reason: 'a competitor\'s own site' }); continue; }
          if (PLATFORM_RE.test(d)) { dropped.push({ domain: d, reason: 'a platform, not a directory' }); continue; }
          if (x.spam_score != null && x.spam_score >= SPAM_SCORE) { dropped.push({ domain: d, reason: `spam score ${x.spam_score}` }); continue; }
          const known = await store.byDomain(d);
          if (known) {
            if (known.retired) { dropped.push({ domain: d, reason: `a retired directory (${known.name})` }); continue; }
            // A known directory the scan did not find a competitor on: the backlink says one links from there
            const g = gaps.find(y => y.directory_id === known.id);
            if (g) { g.backlink_competitors = x.competitors; } else if (!alsoHas.includes(known.name)) gaps.push({ directory_id: known.id, name: known.name, domain: d, tier: known.tier, cost: known.cost, priority: known.priority, da: known.da, competitors_with: x.competitors_with, competitors: x.competitors, urls: [], client_listed: 'unchecked', source: 'backlinks' });
            continue;
          }
          unknown.push(d);
        }
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
            newDomains.push({ domain: d, name: v.name || d, kind: v.kind, directory_id: null, tier: null, cost: null, priority: null, da: null, competitors_with: x.competitors_with, competitors: x.competitors, example_url: `https://${d}/`, source: 'backlinks' });
          }
          if (newDomains.length) {
            try { room(0.03); const br = await dfs.bulkRanks(newDomains.map(x => x.domain), opts); spend(br.cost, br.calls); for (const x of newDomains) { const rk = br.ranks.get(x.domain); x.da = rk == null ? null : Math.round(rk); } }
            catch (e) { if (e instanceof CapHit) notes.push('The DA for the new domains was not read: the spend cap.'); else notes.push(`The DA for the new domains was not read (${e.message}).`); }
          }
        }
      } catch (e) { if (!(e instanceof CapHit)) throw e; notes.push(`The backlinks method stopped: ${e.message}.`); }
      gaps.sort((a, b) => (b.competitors_with - a.competitors_with) || ((b.da || 0) - (a.da || 0)) || a.name.localeCompare(b.name));
      newDomains.sort((a, b) => (b.competitors_with - a.competitors_with) || ((b.da || 0) - (a.da || 0)) || a.domain.localeCompare(b.domain));
    } else notes.push('The backlinks method did not run: the spend cap.');

    const at = now();
    const { rows: ins } = await pool.query(`INSERT INTO citation_gap_runs (client_id, at, keyword, competitors, gaps, dropped, new_domains, checked, notes, cost_usd, model_cost_usd, calls) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`, [clientId, at, keyword, json(competitors), json(gaps), json(dropped), json(newDomains), json(checked), json(notes), cost, modelCost, calls + modelCalls]);
    await store.logCost({ kind: 'gaps', clientId, cost: cost + modelCost, calls: calls + modelCalls, detail: { run_id: ins[0].id, dataforseo: cost, model: modelCost, competitors: competitors.length, searches, gaps: gaps.length, new_domains: newDomains.length, cap_hit: capHit } }).catch(() => {});
    return { id: ins[0].id, at: at.toISOString(), keyword, primary, competitors, checked, gaps, new_domains: newDomains, dropped, notes, also_has: alsoHas, cost_usd: cost, model_cost_usd: modelCost, calls: calls + modelCalls, searches, cap_hit: capHit, directories_scanned: rows.length };
  }

  // A new domain becomes a directory row; the latest run marks it as in the database
  async function addToDatabase(clientId, { domain, name, url, tier, priority, cost = 'free' } = {}) {
    const d = registrableDomain(hostOf(domain));
    if (!d) throw Object.assign(new Error('A domain is needed.'), { status: 400 });
    const existing = await store.byDomain(d);
    const dir = existing || await store.create({ name: str(name) || d, url: str(url) || `https://${d}/`, domain: d, tier: str(tier) || 'uk_secondary', priority: str(priority) || 'P2', cost, type: 'From the competitor gap check', applies_to: { kind: 'all' }, needs_live_check: true, notes: `Added from the competitor gap check on ${new Date().toISOString().slice(0, 10)}.` });
    const last = await latest(clientId);
    if (last) {
      const mark = g => (g.domain === d ? { ...g, directory_id: dir.id, name: dir.name, tier: dir.tier, cost: dir.cost, priority: dir.priority, source: 'database' } : g);
      await pool.query(`UPDATE citation_gap_runs SET gaps = $2, new_domains = $3 WHERE id = $1`, [last.id, json(last.gaps.map(mark)), json(last.new_domains.map(mark))]);
    }
    return dir;
  }

  return { run, latest, addToDatabase, classify };
}

module.exports = { createGaps, parseClassification, readPrompt, sameCategory, CLASSIFIER_MODEL, BATCH, SPAM_SCORE, MAX_USD, SEARCH_USD, PLATFORM_RE, PROMPT_FILE };
