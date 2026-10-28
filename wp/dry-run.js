'use strict';

// ── WordPress dry run ───────────────────────────────────────────────────────
// Reads the record's page on the site, builds the payload, and compares them field
// by field. Writes nothing. Says whether a real push would be allowed, and why not.
// The record's page type (page-types/) gives the fields, payload and target page.

const { pageTypeOf, getPageType } = require('../page-types');
const { checkRecord, checkTarget } = require('./safety');
const { wpGet } = require('./client');
const { buildClientValuesPayload } = require('./client-values');
const { htmlToText } = require('./markdown');

const show = (kind, v) => {
  if (kind === 'html') return htmlToText(v);
  if (kind === 'bool') return v ? 'yes' : 'no';
  return v === undefined || v === null ? '' : String(v);
};
const same = (a, b) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();

// fields: the page type's [name, kind, subs] list (the homepage's by default)
function diffFields(current, next, fields = getPageType('homepage').wp.fields) {
  const changes = [];
  for (const [name, kind, subs] of fields) {
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

// The companion plugin's report: is the site ready to take a push?
async function checkSite(site, seo, wp = getPageType('homepage').wp) {
  let status;
  try {
    status = await wpGet(site, '/llp-copybot/v1/status');
  } catch (e) {
    if (/→ 404/.test(e.message)) return { status: null, refusals: ['The Local Launchpad Copybot plugin is not active on the site.'] };
    throw e;
  }
  const refusals = [];
  if (!status.acf_pro) refusals.push('ACF Pro is not active on the site.');
  if (status.seo !== seo) refusals.push(`The site's SEO plugin is ${status.seo}, but the push is set for ${seo}.`);
  const want = wp.groups.map(g => `group_llp_${g.name}`);
  const missing = want.filter(k => !(status.field_groups || []).includes(k));
  if (missing.length) refusals.push(`${wp.label[0].toUpperCase()}${wp.label.slice(1)} field groups missing on the site: ${missing.join(', ')}.`);
  return { status, refusals };
}

// clientValues: the values to push, when the record doesn't carry its own
// (records made before 14 Oct; the server passes the client's current values).
// now: the clock a post's status is decided against (future or draft), for tests
async function dryRun({ record, site, reviewed = false, seo = 'rankmath', clientValues: fallbackValues = null, now = new Date() }) {
  const wp = pageTypeOf(record).wp;
  const kind = wp.kind || 'page';
  const refusals = checkRecord(record, { reviewed });
  const recordValues = record.meta && record.meta.client_values;
  if (!recordValues && !fallbackValues && !record.blocked) {
    refusals.push('The record does not carry its client values (made before 14 Oct). Regenerate it, or push with the client\'s current values.');
  }
  const siteCheck = await checkSite(site, seo, wp);
  refusals.push(...siteCheck.refusals);
  const page = await wp.findPage(site, record);
  refusals.push(...checkTarget(page, site, wp.label, { kind }));
  const payload = record.blocked ? null : wp.buildPayload(record, { seo, now });
  // A post the site lacks is compared with nothing: every field "added"
  const current = page || (kind === 'post' && payload ? { acf: {}, meta: {} } : null);
  const changes = current && payload ? [
    ...diffFields(current.acf || {}, payload.acf, wp.fields),
    ...Object.entries(payload.meta).map(([k, v]) => {
      const a = show('text', (current.meta || {})[k]), b = show('text', v);
      return { field: `meta.${k}`, change: same(a, b) ? 'same' : (a ? 'changed' : 'added'), current: a, next: b };
    }),
    ...(kind === 'post' && payload.post ? ['title', 'slug', 'status', 'date_gmt'].map(k => {
      const cur = k === 'title' ? (page && page.title && (page.title.raw || page.title.rendered)) : page && page[k];
      const a = show('text', cur), b = show('text', payload.post[k]);
      return { field: `post.${k}`, change: same(a, b) ? 'same' : (a ? 'changed' : 'added'), current: a, next: b };
    }) : []),
  ] : [];
  // A post the site lacks: every field it carries is added (a bool off or an empty field is the same as nothing)
  if (!page && kind === 'post') for (const c of changes) if (c.change !== 'same') { c.change = 'added'; c.current = ''; }
  // Client Values the site would hold after the push (a page's push writes them; a post's never does)
  const clientValues = payload && kind !== 'post' ? buildClientValuesPayload(recordValues ? record : { ...record, meta: { ...record.meta, client_values: fallbackValues || {} } }) : null;
  if (clientValues && siteCheck.status) {
    const current = await wpGet(site, '/llp-copybot/v1/client-values');
    for (const [k, v] of Object.entries(clientValues)) {
      const a = show('text', current[k]), b = show('text', v);
      changes.push({ field: `client_values.${k}`, change: same(a, b) ? 'same' : (a ? (b ? 'changed' : 'removed') : 'added'), current: a, next: b });
    }
  }
  return {
    site: site.url,
    pageType: pageTypeOf(record).id,
    kind,
    plugin: siteCheck.status,
    clientValues,
    page: page ? { id: page.id, status: page.status, title: (page.title && (page.title.raw || page.title.rendered)) || '', date_gmt: page.date_gmt || null, link: page.link || null } : null,
    // A post: what the push would make or set (the status, the date, the slug, the category), and whether it is new
    post: payload && payload.post ? { ...payload.post, create: !page } : null,
    pushable: refusals.length === 0,
    refusals,
    summary: ['added', 'changed', 'removed', 'same'].reduce((o, k) => (o[k] = changes.filter(c => c.change === k).length, o), {}),
    changes,
    payload,
  };
}

function formatDryRun(r, { showSame = false } = {}) {
  const L = [];
  const label = getPageType(r.pageType || 'homepage').wp.label;
  L.push(`DRY RUN: ${label} on ${r.site} (nothing was written)`);
  L.push(r.page ? `${r.kind === 'post' ? 'Post' : 'Page'} ${r.page.id} "${r.page.title}", status ${r.page.status}` : r.post ? `The ${label} is not on the site yet: the push would create it (${r.post.why}; slug ${r.post.slug}, category ${r.post.category})` : `The ${label} was not found`);
  if (r.page && r.post) L.push(`After the push: status ${r.post.status}${r.post.date_gmt ? ` (${r.post.date_gmt} UTC)` : ''}: ${r.post.why}`);
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
