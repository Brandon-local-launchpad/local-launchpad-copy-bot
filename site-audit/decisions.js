'use strict';

// ── Decisions and the URL map, stored ─────────────────────────────────────────────
// One row per client and URL (site_url_decisions), so a person's work survives a rescan. The
// suggestion is rewritten every time the scan is reworked; the decision a person approved or
// edited stays. What a row means is effective(): the approved decision when there is one, else
// the suggestion. A page that matters is never 410'd: if an approved 410 comes to matter, by a
// rescan or a hand answer, the approval is lifted and the row says why.

const { suggestAll, proposalFor, neverDestination, isHomeVariant } = require('./decide');
const { createUrlTools } = require('./urls');

const DECISIONS = ['Keep', 'Reuse', 'Merge', 'Retire', 'Remove'];
const j = v => JSON.stringify(v);
const err = (status, message) => Object.assign(new Error(message), { status });

const effective = d => {
  if (!d) return { decision: '', new_url: '', redirect_type: 'none', reason: '', approved: false };
  const approved = !!d.approved_at;
  if (d.no_action && !approved) return { decision: '', new_url: '', redirect_type: 'none', reason: 'An image with no links, rankings or clicks, so no action is needed.', approved: false, no_action: true };
  return {
    decision: approved ? d.decision : d.suggested_decision,
    new_url: (approved ? d.new_url : d.suggested_new_url) || '',
    redirect_type: (approved ? d.redirect_type : d.suggested_redirect) || 'none',
    reason: d.hand_note && approved ? d.hand_note : d.suggested_reason,
    page_key: d.suggested_page_key,
    approved,
    approved_by: d.approved_by || '',
    by_hand: !!d.by_hand,
    suggested: { decision: d.suggested_decision, new_url: d.suggested_new_url || '', redirect_type: d.suggested_redirect || 'none', reason: d.suggested_reason },
    differs: approved && (d.decision !== d.suggested_decision || (d.new_url || '') !== (d.suggested_new_url || '')),
    proposal: d.proposal || null,
    proposal_declined: !!d.proposal_declined,
    needs_page: !!d.needs_page,
    check: !!d.needs_check && !d.by_hand,
    lifted: d.lifted_note || '',
  };
};

function createDecisions({ pool, getSettings, loadPages, pageMap = null, rework }) {
  async function rowsFor(clientId) {
    const { rows } = await pool.query(`SELECT * FROM site_url_decisions WHERE client_id = $1`, [clientId]);
    return new Map(rows.map(r => [r.url, r]));
  }

  async function upsert(clientId, url, existing, fields) {
    const keys = Object.keys(fields);
    if (existing) {
      await pool.query(`UPDATE site_url_decisions SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')}, updated_at = NOW() WHERE id = $1`, [existing.id, ...keys.map(k => fields[k])]);
    } else {
      await pool.query(`INSERT INTO site_url_decisions (client_id, url, ${keys.join(', ')}) VALUES ($1, $2, ${keys.map((_, i) => `$${i + 3}`).join(', ')})`, [clientId, url, ...keys.map(k => fields[k])]);
    }
  }

  // After every rework: the suggestion for every URL in the scan, and the rule check on what was approved
  async function refresh(clientId, scanId, { hasSearchConsole, origin, oldHomepage = null, rootStatus = null }) {
    const settings = await getSettings(clientId);
    const { rows: pages, baseTown } = await loadPages(clientId);
    if (!pages.length) return { ready: false, counts: null };
    const { rows: urls } = await pool.query(`SELECT id, url, path, kind, fetch_state, status_code, redirect_target, title, h1, links_out, clicks, est_traffic, real_rd, all_rd, keywords_count, matters, matters_why, injected FROM site_scan_urls WHERE scan_id = $1`, [scanId]);
    const existing = await rowsFor(clientId);
    const declined = new Set([...existing.values()].filter(r => r.proposal_declined).map(r => r.url));
    const { suggestions } = suggestAll({ urls, pages, settings, baseTown, hasSearchConsole, declined, keyOf: createUrlTools(origin).key, oldHomepage, rootStatus });
    for (const u of urls) {
      const s = suggestions.get(u.url);
      if (!s) continue;
      const was = existing.get(u.url);
      // An image nothing depends on leaves the map. A decision a person set by hand stays.
      if (s.no_action) {
        const kept = was && was.approved_at && was.by_hand;
        const clear = { no_action: !kept, suggested_decision: null, suggested_reason: null, suggested_new_url: null, suggested_redirect: null, suggested_page_key: null, proposal: j(null), needs_page: false, needs_check: false };
        if (!kept) Object.assign(clear, { approved_at: null, approved_by: null, by_hand: false, decision: null, new_url: null, redirect_type: null, hand_note: null, lifted_note: null });
        await upsert(clientId, u.url, was, clear);
        continue;
      }
      const fields = { no_action: false, suggested_decision: s.decision, suggested_reason: s.reason, suggested_new_url: s.new_url, suggested_redirect: s.redirect_type, suggested_page_key: s.page_key, proposal: j(s.proposal), needs_page: s.needs_page, needs_check: s.check };
      if (was && was.approved_at) {
        // A person set Keep by hand: the page they mean may be at another slug
        if (was.decision === 'Keep' && was.by_hand && u.path !== '/') { const p = proposalFor(u, pages, settings, baseTown); fields.proposal = j(was.proposal_declined ? null : p); fields.needs_page = !p && !pages.some(x => x.slug === u.path) && !(settings.site_pages || []).includes(u.path); }
        // The rule that can't bend
        if (u.matters && was.redirect_type === '410') Object.assign(fields, { approved_at: null, approved_by: null, by_hand: false, decision: null, new_url: null, redirect_type: null, hand_note: null, lifted_note: 'This page now matters, and a page that matters is never given a 410, so the approval was lifted.' });
      }
      await upsert(clientId, u.url, was, fields);
    }
    return { ready: true };
  }

  async function rowOf(clientId, urlId) {
    const { rows } = await pool.query(`SELECT id, scan_id, url, path, kind, matters FROM site_scan_urls WHERE id = $1 AND client_id = $2`, [urlId, clientId]);
    if (!rows.length) throw err(404, 'That URL is not in the scan.');
    return rows[0];
  }

  // The destination a person typed: a path or a full address, on this site. Returns the path.
  function cleanTarget(raw, origin, settings) {
    const s = String(raw || '').trim();
    if (!s) return '';
    const tools = createUrlTools(origin);
    const u = tools.parse(s.startsWith('/') || /^https?:\/\//i.test(s) ? s : `/${s}`);
    if (!u) throw err(400, `"${s}" isn't an address.`);
    if (!tools.sameSite(u.hostname)) throw err(400, `${u.hostname} is another site. A redirect must stay on the domain.`);
    const path = tools.pathOf(tools.key(u.href));
    if (neverDestination(path, settings)) throw err(400, 'A thank-you page is never a redirect destination.');
    return path;
  }

  // A person's edit: approved as they set it, once it passes the rules that can't bend
  async function setDecision(clientId, urlId, input = {}, { origin, who = '' } = {}) {
    const row = await rowOf(clientId, urlId);
    const settings = await getSettings(clientId);
    const existing = (await rowsFor(clientId)).get(row.url);
    if (input.reset) {
      if (existing) await upsert(clientId, row.url, existing, { approved_at: null, approved_by: null, by_hand: false, decision: null, new_url: null, redirect_type: null, hand_note: null, lifted_note: null, proposal_declined: false });
      return;
    }
    const decision = String(input.decision || '');
    if (!DECISIONS.includes(decision)) throw err(400, `The decision must be one of: ${DECISIONS.join(', ')}.`);
    let newUrl = cleanTarget(input.new_url, origin, settings);
    let redirect = String(input.redirect_type || '');
    if (decision === 'Keep') { newUrl = row.path; redirect = 'none'; }
    else if (decision === 'Remove') { newUrl = ''; redirect = '410'; }
    else if (decision === 'Retire') {
      if (!redirect) redirect = newUrl ? '301' : 'none';
      if (!['301', '410', 'none'].includes(redirect)) throw err(400, 'A Retire row is a 301, a 410 or no redirect.');
      if (redirect !== '301') newUrl = '';
    } else redirect = '301';
    if (redirect === '301' && !newUrl) throw err(400, `${decision} needs a new URL to redirect to.`);
    if (redirect === '301' && newUrl === row.path) throw err(400, "A URL can't redirect to itself. Choose Keep if it stays.");
    if (row.matters && redirect === '410') throw err(400, 'This page matters, and a page that matters is never given a 410.');
    await upsert(clientId, row.url, existing, { decision, new_url: newUrl, redirect_type: redirect, approved_at: new Date(), approved_by: String(who || ''), by_hand: true, hand_note: `Set by hand${input.note ? `: ${String(input.note).slice(0, 200)}` : '.'}`, lifted_note: null });
  }

  // Approve what's suggested: the rows named, or every row. A Keep waiting on a Page Map change
  // isn't approved here: approving it is approving the change, which is its own button.
  async function approve(clientId, { url_ids: ids = null, all = false, scanId, who = '' } = {}) {
    if (!all && !(Array.isArray(ids) && ids.length)) throw err(400, 'Choose some rows to approve.');
    const { rows: urls } = await pool.query(`SELECT id, url FROM site_scan_urls WHERE scan_id = $1`, [scanId]);
    const wanted = all ? null : new Set(ids.map(String));
    const existing = await rowsFor(clientId);
    let approved = 0, waiting = 0;
    const now = new Date();
    for (const u of urls) {
      if (wanted && !wanted.has(String(u.id))) continue;
      const d = existing.get(u.url);
      if (!d || d.approved_at || !d.suggested_decision) continue;
      if (d.proposal && !d.proposal_declined) { waiting++; continue; }
      await upsert(clientId, u.url, d, { decision: d.suggested_decision, new_url: d.suggested_new_url || '', redirect_type: d.suggested_redirect || 'none', approved_at: now, approved_by: String(who || ''), by_hand: false, lifted_note: null });
      approved++;
    }
    return { approved, waiting };
  }

  // The slug proposal: yes moves the Page Map page to the old URL, so there is one page for the
  // service; no leaves the Page Map alone and the old URL redirects to it.
  async function proposalYes(clientId, urlId, { who = '' } = {}) {
    if (!pageMap) throw err(503, "The Page Map isn't available here, so it can't be changed.");
    const row = await rowOf(clientId, urlId);
    const d = (await rowsFor(clientId)).get(row.url);
    if (!d || !d.proposal) throw err(404, 'There is no Page Map change waiting on this URL.');
    const result = await pageMap.applyUrlOverride(clientId, { page_key: d.proposal.page_key, path: d.proposal.to, old_url: row.url, who });
    // Anything approved to redirect at the old slug follows the page
    const all = await rowsFor(clientId);
    for (const r of all.values()) if (r.approved_at && r.new_url === d.proposal.from) await upsert(clientId, r.url, r, { new_url: d.proposal.to });
    await upsert(clientId, row.url, all.get(row.url), { decision: 'Keep', new_url: row.path, redirect_type: 'none', approved_at: new Date(), approved_by: String(who || ''), by_hand: false, proposal: j(null), lifted_note: null });
    await rework(row.scan_id);
    return result;
  }
  async function proposalNo(clientId, urlId, { who = '' } = {}) {
    const row = await rowOf(clientId, urlId);
    const d = (await rowsFor(clientId)).get(row.url);
    if (!d || !d.proposal) throw err(404, 'There is no Page Map change waiting on this URL.');
    await upsert(clientId, row.url, d, { proposal_declined: true, approved_at: null, approved_by: String(who || ''), by_hand: false, decision: null, new_url: null, redirect_type: null, hand_note: null });
    await rework(row.scan_id);
  }

  // Undo a Page Map change: the page goes back to its planned address, and the old URL back to a suggestion
  async function proposalUndo(clientId, identity, { scanId }) {
    if (!pageMap) throw err(503, "The Page Map isn't available here, so it can't be changed.");
    const listed = (await pageMap.listUrlOverrides(clientId)).find(o => o.identity === identity);
    if (!listed) throw err(404, 'That change is not on file.');
    const result = await pageMap.clearUrlOverride(clientId, identity);
    const all = await rowsFor(clientId);
    for (const r of all.values()) {
      if (r.url === listed.old_url) await upsert(clientId, r.url, r, { approved_at: null, approved_by: null, by_hand: false, decision: null, new_url: null, redirect_type: null, hand_note: null, lifted_note: null, proposal_declined: false });
      else if (r.approved_at && r.new_url === listed.path && result.to) await upsert(clientId, r.url, r, { new_url: result.to });
    }
    if (scanId) await rework(scanId);
    return result;
  }

  // The old text the page view shows: every old URL whose new home is this page, whatever its decision
  async function pageContent(clientId, scanId, path) {
    if (!scanId) return [];
    const existing = await rowsFor(clientId);
    const { rows } = await pool.query(`SELECT url, path, title, word_count, main_text, matters, top_searches FROM site_scan_urls WHERE scan_id = $1 AND main_text IS NOT NULL`, [scanId]);
    const out = [];
    for (const r of rows) {
      const e = effective(existing.get(r.url));
      if (!r.main_text || e.new_url !== path) continue; // the saved text is all there; the page view shows what lands here
      out.push({ url: r.url, path: r.path, title: r.title, word_count: r.word_count, main_text: r.main_text, matters: r.matters, top_searches: r.top_searches || [], decision: e.decision, approved: e.approved });
    }
    return out.sort((a, b) => Number(b.matters) - Number(a.matters) || (b.word_count || 0) - (a.word_count || 0));
  }

  return { rowsFor, refresh, setDecision, approve, proposalYes, proposalNo, proposalUndo, pageContent, effective };
}

module.exports = { createDecisions, effective, DECISIONS, isHomeVariant };
