'use strict';

// ── Which inner pages are ready to have their copy pushed (13 Nov 2026) ──────
// The list behind "Push the copy" on the Pages tab (Pages on the site). One row per page in
// the build (wp/pages.js wantedPages), saying where it stands:
//   ready         a person approved the page, every claims finding is accepted, it has no
//                 BLOCK or stand-in, and its entry is on the site
//   pushed        this version is already on the site (the push log)
//   anything else why not, in words, so a person can open the page and deal with it
// Nothing here writes. The screen pushes the ready pages one at a time through the same push
// as the page view (wp/service.js push), so every check that push makes still runs.
//
// Approving a page stands for the page view's "I've read it, including its FLAGs" tick: a
// page nobody approved is never pushed from here.

const { wantedPages, KIND } = require('./pages');
const { checkRecord } = require('./safety');
const { claimsRefusals } = require('./push');

const norm = s => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

// The quotes a person accepted on this version, when they cover every finding; else null
function acceptedQuotes(record) {
  const C = record.CLAIMS;
  const findings = (C && C.findings) || [];
  const accepted = new Set(((C && C.accepted) || []).map(a => norm(a.quote)));
  return findings.every(f => accepted.has(norm(f.quote))) ? findings.map(f => f.quote) : null;
}

// page: a wantedPages() row; found: { id, record } or null; onSite: Set of paths, or null when the
// site couldn't be read; pushed: Set of record ids the log shows as pushed
function stateOf(page, found, onSite, pushed) {
  if (!found) return { state: 'no copy', why: 'The page has not been written yet.' };
  const { id, record } = found;
  const refusals = checkRecord(record, { reviewed: true });
  if (refusals.length) return { state: 'not ready', why: refusals[0] };
  if (!(record.meta && record.meta.approved_at)) return { state: 'not approved', why: 'Open the page, read it and press Approve.' };
  const quotes = acceptedQuotes(record);
  const claims = claimsRefusals(record, record.CLAIMS || null, !!quotes);
  if (claims.length) return { state: 'claims', why: claims[0] };
  if (onSite && !onSite.has(page.path)) return { state: 'not on the site', why: 'Make the pages first, with Create above.' };
  if (pushed.has(id)) return { state: 'pushed', why: 'This version is on the site.' };
  return { state: 'ready', why: '', acceptedClaims: quotes };
}

// rows: the saved page map rows; records: Map "type:key" → { id, record } (the latest version of each page)
function copyPlan(rows, records, { onSite = null, pushed = new Set() } = {}) {
  const pages = wantedPages(rows).map(p => {
    const found = records.get(`${KIND[p.type][0]}:${p.path}`) || null;
    return { path: p.path, title: p.title, type: p.type, recordId: found ? found.id : null, ...stateOf(p, found, onSite, pushed) };
  });
  const counts = {};
  for (const p of pages) counts[p.state] = (counts[p.state] || 0) + 1;
  return { pages, counts: { total: pages.length, ready: 0, pushed: 0, ...counts } };
}

// getSite, pageRows as wp/pages.js; latestRecords(clientId, pageType) → [{ id, key, record }]; createLog(clientId)
function createCopyPlanService({ getSite, pageRows, latestRecords, createLog }) {
  return {
    async plan(clientId) {
      const site = await getSite(clientId);
      if (!site) throw Object.assign(new Error('This client has no WordPress site connected yet. Add it on the Pages tab.'), { status: 400 });
      const records = new Map();
      for (const type of ['category', 'service', 'location']) for (const r of await latestRecords(clientId, type)) records.set(`${type}:${r.key}`, { id: r.id, record: r.record });
      let onSite = null, siteError = null;
      try { onSite = new Set(((await require('./client').wpGet(site, '/llp-copybot/v1/pages')).items || []).map(i => i.path).filter(Boolean)); }
      catch (e) { siteError = `Couldn't read the pages on the site: ${e.message}`; }
      const log = await createLog(clientId).listLog(200);
      const pushed = new Set(log.filter(e => e.action === 'push' && e.result === 'pushed' && e.site === site.url && e.recordId).map(e => e.recordId));
      return { site: site.url, staging: !!site.staging, siteError, ...copyPlan(await pageRows(clientId), records, { onSite, pushed }) };
    },
  };
}

module.exports = { copyPlan, stateOf, acceptedQuotes, createCopyPlanService };
