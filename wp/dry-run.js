'use strict';

// ── WordPress dry run ───────────────────────────────────────────────────────
// Reads the site's homepage, builds the payload, and compares them field by field.
// Writes nothing. Says whether a real push would be allowed, and why not.

const { buildHomepagePayload, HOMEPAGE_FIELDS } = require('./homepage-map');
const { checkRecord, checkTarget } = require('./safety');
const { findHomepage } = require('./client');
const { htmlToText } = require('./markdown');

const show = (kind, v) => {
  if (kind === 'html') return htmlToText(v);
  if (kind === 'bool') return v ? 'yes' : 'no';
  return v === undefined || v === null ? '' : String(v);
};
const same = (a, b) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();

function diffFields(current, next) {
  const changes = [];
  for (const [name, kind, subs] of HOMEPAGE_FIELDS) {
    if (kind !== 'repeater') {
      const a = show(kind, current[name]), b = show(kind, next[name]);
      changes.push({ field: name, change: same(a, b) ? 'same' : (a ? 'changed' : 'added'), current: a, next: b });
      continue;
    }
    const cur = Array.isArray(current[name]) ? current[name] : [];
    const nxt = next[name] || [];
    for (let i = 0; i < Math.max(cur.length, nxt.length); i++) {
      for (const [sub, subKind] of Object.entries(subs)) {
        const a = cur[i] ? show(subKind, cur[i][sub]) : '';
        const b = nxt[i] ? show(subKind, nxt[i][sub]) : '';
        const change = !nxt[i] ? 'removed' : same(a, b) ? 'same' : (a ? 'changed' : 'added');
        changes.push({ field: `${name}[${i + 1}].${sub}`, change, current: a, next: b });
      }
    }
  }
  return changes;
}

async function dryRun({ record, site, reviewed = false, seo = 'rankmath' }) {
  const refusals = checkRecord(record, { reviewed });
  const page = await findHomepage(site);
  refusals.push(...checkTarget(page, site));
  const payload = record.blocked ? null : buildHomepagePayload(record, { seo });
  const changes = page && payload ? [
    ...diffFields(page.acf || {}, payload.acf),
    ...Object.entries(payload.meta).map(([k, v]) => {
      const a = show('text', (page.meta || {})[k]), b = show('text', v);
      return { field: `meta.${k}`, change: same(a, b) ? 'same' : (a ? 'changed' : 'added'), current: a, next: b };
    }),
  ] : [];
  return {
    site: site.url,
    page: page ? { id: page.id, status: page.status, title: (page.title && (page.title.raw || page.title.rendered)) || '' } : null,
    pushable: refusals.length === 0,
    refusals,
    summary: ['added', 'changed', 'removed', 'same'].reduce((o, k) => (o[k] = changes.filter(c => c.change === k).length, o), {}),
    changes,
    payload,
  };
}

function formatDryRun(r, { showSame = false } = {}) {
  const L = [];
  L.push(`DRY RUN: homepage on ${r.site} (nothing was written)`);
  L.push(r.page ? `Page ${r.page.id} "${r.page.title}", status ${r.page.status}` : 'Homepage not found');
  L.push(r.pushable ? 'A real push WOULD be allowed.' : 'A real push would be REFUSED:');
  for (const x of r.refusals) L.push(`  - ${x}`);
  L.push(`Changes: ${r.summary.added || 0} added, ${r.summary.changed || 0} changed, ${r.summary.removed || 0} removed, ${r.summary.same || 0} unchanged`);
  L.push('');
  const clip = s => (s.length > 160 ? s.slice(0, 157) + '…' : s) || '(empty)';
  for (const c of r.changes) {
    if (c.change === 'same' && !showSame) continue;
    L.push(`${c.change.toUpperCase().padEnd(8)} ${c.field}`);
    if (c.change !== 'added') L.push(`         now:  ${clip(c.current)}`);
    if (c.change !== 'removed') L.push(`         push: ${clip(c.next)}`);
  }
  return L.join('\n');
}

module.exports = { dryRun, diffFields, formatDryRun };
