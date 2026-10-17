'use strict';

// ── What still needs a person's attention on a client record ─────────────────
// Pure: takes the record as GET /api/clients/:id/record returns it (fields with
// panel, tier, status, applicable, group; prices with state, rows; audio per
// field; nicheKnown; submissions) and returns a list of items, each with a
// group: "blocks" (stops a correct page being built) or "chase" (the copy is
// better with it). Optional blanks are never listed. Empty list = "Ready to
// build". Reviewing stays a separate, human action.

const TIER_RANK = { needed: 0, chase: 1, optional: 2 };
const tierOf = f => (f.tier in TIER_RANK ? f.tier : f.optional ? 'optional' : 'chase');

function needsAttention(rec) {
  const items = [];
  const fields = (rec.sections || []).flatMap(s => s.fields || []);
  const panelLabel = key => ((rec.panels || []).find(p => p.key === key) || {}).label || key;
  const blocks = (code, panel, msg, extra = {}) => items.push({ code, group: 'blocks', severity: 'bad', panel, msg, ...extra });
  const chase = (code, panel, msg, extra = {}) => items.push({ code, group: 'chase', severity: 'warn', panel, msg, ...extra });

  if (rec.niche && rec.nicheKnown === false) blocks('no_field_map', 'services', `No field map for the niche "${rec.niche}": only the universal fields were read.`);
  for (const s of rec.submissions || []) {
    if (s.status === 'error') blocks('submission_error', 'overview', `Submission ${s.submissionId} failed to process; re-run it from the inbox.`, { submissionId: s.submissionId });
  }

  // Blank needed and chase units, grouped by panel. A unit (voice + typed pair, the
  // accreditations, a niche's ticks) is one item with the strongest tier of its fields.
  const units = new Map();
  for (const f of fields) {
    if (f.applicable === false) continue;
    const id = f.group || `field:${f.key}`;
    const u = units.get(id) || { tier: 'optional', filled: false, first: f, panel: f.panel || 'overview' };
    const t = tierOf(f);
    if (TIER_RANK[t] < TIER_RANK[u.tier]) { u.tier = t; u.first = f; }
    if (f.status === 'filled') u.filled = true;
    units.set(id, u);
  }
  const byPanel = { needed: new Map(), chase: new Map() };
  for (const u of units.values()) {
    if (u.filled || u.tier === 'optional') continue;
    const m = byPanel[u.tier];
    if (!m.has(u.panel)) m.set(u.panel, []);
    m.get(u.panel).push({ key: u.first.key, label: u.first.group && u.first.group !== 'services' ? u.first.label.replace(/\s*\((voice|typed)\)\s*$/, '') : u.first.group === 'services' ? 'Service ticks' : u.first.label });
  }
  for (const [panel, fs] of byPanel.needed) blocks('blank_needed', panel, `${fs.length} needed answer${fs.length === 1 ? '' : 's'} missing in ${panelLabel(panel)}`, { fields: fs });
  for (const [panel, fs] of byPanel.chase) chase('blank_chase', panel, `${fs.length} answer${fs.length === 1 ? '' : 's'} worth chasing in ${panelLabel(panel)}`, { fields: fs });

  // Prices: rows (or not applicable) are needed; the rest is worth chasing
  const p = rec.prices || null;
  if (p) {
    const st = p.state || {};
    const rows = (p.rows || []).filter(r => !r.deleted);
    if (st.status === 'extraction_failed') blocks('extraction_failed', 'prices', `Price extraction failed: ${st.error || 'unknown error'}`, { action: 'retry' });
    else if (st.status === 'done' && !rows.length) blocks('no_prices', 'prices', 'No prices given in the recording.');
    else if (rows.length) {
      const mostWanted = fields.filter(f => /most_wanted/.test(f.key) && f.status === 'filled' && typeof f.value === 'string');
      for (const mw of mostWanted) {
        if (!rows.some(r => r.matched_to && r.matched_to.key === mw.key)) chase('most_wanted_no_price', 'prices', `Most-wanted job has no price: ${mw.value}`, { field: mw.key });
      }
    }
    const inferred = rows.filter(r => r.inferred).length;
    const unverified = rows.filter(r => r.unverified).length;
    if (unverified) chase('unverified_prices', 'prices', `${unverified} price row${unverified === 1 ? '' : 's'} with a figure not found in the transcript.`);
    if (inferred) chase('inferred_prices', 'prices', `${inferred} price row${inferred === 1 ? '' : 's'} with an inferred figure to check.`);
  }

  for (const f of fields) {
    if (f.audio && f.audio.downloadStatus === 'failed') chase('audio_failed', f.panel || 'overview', `Audio copy failed for "${f.label}"; re-run the submission to retry.`, { field: f.key });
  }

  const order = { blocks: 0, chase: 1 };
  items.sort((a, b) => order[a.group] - order[b.group]);
  return items;
}

module.exports = { needsAttention };
