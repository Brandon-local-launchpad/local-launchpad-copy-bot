'use strict';

// ── What still needs a person's attention on a client record ─────────────────
// Pure: takes the record as GET /api/clients/:id/record returns it (fields with
// panel, status, applicable, optional, group; prices with state, rows, flags;
// audio per field; nicheKnown; submissions) and returns a list of items, each
// pointing at a panel (and a field where there is one). Empty list = "Ready to
// build". Reviewing stays a separate, human action.

function needsAttention(rec) {
  const items = [];
  const fields = (rec.sections || []).flatMap(s => s.fields || []);
  const panelLabel = key => ((rec.panels || []).find(p => p.key === key) || {}).label || key;

  if (rec.niche && rec.nicheKnown === false) {
    items.push({ code: 'no_field_map', severity: 'warn', panel: 'services', msg: `No field map for the niche "${rec.niche}": only the universal fields were read.` });
  }
  for (const s of rec.submissions || []) {
    if (s.status === 'error') items.push({ code: 'submission_error', severity: 'bad', panel: 'overview', msg: `Submission ${s.submissionId} failed to process; re-run it from the inbox.`, submissionId: s.submissionId });
  }

  // Blank expected fields, grouped by panel. A unit (voice + typed pair, the accreditations)
  // is one item, named after its first field; optional and not-applicable fields are skipped.
  const seenUnit = new Set();
  const byPanel = new Map();
  for (const f of fields) {
    if (f.optional || f.applicable === false) continue;
    if (f.group) {
      const unitFields = fields.filter(x => x.group === f.group);
      if (unitFields.some(x => x.status === 'filled')) continue;
      if (seenUnit.has(f.group)) continue;
      seenUnit.add(f.group);
    } else if (f.status === 'filled') continue;
    const panel = f.panel || 'overview';
    if (!byPanel.has(panel)) byPanel.set(panel, []);
    byPanel.get(panel).push(f);
  }
  for (const [panel, fs] of byPanel) {
    items.push({ code: 'blank_expected', severity: 'bad', panel, msg: `${fs.length} expected answer${fs.length === 1 ? '' : 's'} missing in ${panelLabel(panel)}`,
      fields: fs.map(f => ({ key: f.key, label: f.group ? f.label.replace(/\s*\((voice|typed)\)\s*$/, '') : f.label })) });
  }

  // Prices
  const p = rec.prices || null;
  if (p) {
    const st = p.state || {};
    const rows = (p.rows || []).filter(r => !r.deleted);
    if (st.status === 'extraction_failed') items.push({ code: 'extraction_failed', severity: 'bad', panel: 'prices', msg: `Price extraction failed: ${st.error || 'unknown error'}`, action: 'retry' });
    else if (st.status === 'done' && !rows.length) items.push({ code: 'no_prices', severity: 'warn', panel: 'prices', msg: 'No prices given in the recording.' });
    else if (rows.length) {
      const mostWanted = fields.filter(f => /most_wanted/.test(f.key) && f.status === 'filled' && typeof f.value === 'string');
      for (const mw of mostWanted) {
        if (!rows.some(r => r.matched_to && r.matched_to.key === mw.key)) items.push({ code: 'most_wanted_no_price', severity: 'warn', panel: 'prices', field: mw.key, msg: `Most-wanted job has no price: ${mw.value}` });
      }
    }
    const inferred = rows.filter(r => r.inferred).length;
    const unverified = rows.filter(r => r.unverified).length;
    if (inferred) items.push({ code: 'inferred_prices', severity: 'warn', panel: 'prices', msg: `${inferred} price row${inferred === 1 ? '' : 's'} with an inferred figure to check.` });
    if (unverified) items.push({ code: 'unverified_prices', severity: 'bad', panel: 'prices', msg: `${unverified} price row${unverified === 1 ? '' : 's'} with a figure not found in the transcript.` });
  }

  // Audio copies that failed to download
  for (const f of fields) {
    if (f.audio && f.audio.downloadStatus === 'failed') items.push({ code: 'audio_failed', severity: 'warn', panel: f.panel || 'overview', field: f.key, msg: `Audio copy failed for "${f.label}"; re-run the submission to retry.` });
  }

  const order = { bad: 0, warn: 1 };
  items.sort((a, b) => order[a.severity] - order[b.severity]);
  return items;
}

module.exports = { needsAttention };
