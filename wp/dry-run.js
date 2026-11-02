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
  // An old plugin on the site lacks newer fields and Client Values keys (2 Nov)
  const versionProblem = require('./plugin-version').siteVersionProblem(status.plugin);
  if (versionProblem) refusals.push(versionProblem);
  if (!status.acf_pro) refusals.push('ACF Pro is not active on the site.');
  if (status.seo !== seo) refusals.push(`The site's SEO plugin is ${status.seo}, but the push is set for ${seo}.`);
  const want = wp.groups.map(g => `group_llp_${g.name}`);
  const missing = want.filter(k => !(status.field_groups || []).includes(k));
  if (missing.length) refusals.push(`${wp.label[0].toUpperCase()}${wp.label.slice(1)} field groups missing on the site: ${missing.join(', ')}.`);
  return { status, refusals };
}

// Are the page type's ACF fields on this page? ACF only saves fields whose group's
// location matches the page; others are dropped without an error, and the REST
// response leaves them out (`acf` is [] when no group matches). 2 Nov: the Edens Edge
// test copy took the SEO meta and Client Values but none of the copy.
function fieldsAttached(page, wp, status) {
  if (!page) return [];
  const names = wp.fields.map(([name]) => name);
  const acf = page.acf && !Array.isArray(page.acf) ? page.acf : {};
  const absent = names.filter(n => !(n in acf));
  // Some fields attached: the groups match this page (an unset field can be left out); the read-back names any gap
  if (absent.length < names.length) return [];
  const where = `page ${page.id}${page.slug ? ` (/${page.slug})` : ''}`;
  if (wp.label === 'homepage' && status && status.front_page && status.front_page !== page.id) {
    return [`The homepage fields only attach to the site's front page, and ${where} isn't it (the front page is page ${status.front_page}). Set it as the homepage in Settings → Reading, or clear the homepage slug so Copybot uses the front page. Otherwise the copy would not save.`];
  }
  return [`None of the ${wp.label} fields are attached to ${where}: check the field groups' location rules. Otherwise the copy would not save.`];
}

// clientValues: the values to push, when the record doesn't carry its own
// (records made before 14 Oct; the server passes the client's current values).
async function dryRun({ record, site, reviewed = false, seo = 'rankmath', clientValues: fallbackValues = null }) {
  const wp = pageTypeOf(record).wp;
  const refusals = checkRecord(record, { reviewed });
  const recordValues = record.meta && record.meta.client_values;
  if (!recordValues && !fallbackValues && !record.blocked) {
    refusals.push('The record does not carry its client values (made before 14 Oct). Regenerate it, or push with the client\'s current values.');
  }
  const siteCheck = await checkSite(site, seo, wp);
  refusals.push(...siteCheck.refusals);
  const page = await wp.findPage(site, record);
  refusals.push(...checkTarget(page, site, wp.label));
  refusals.push(...fieldsAttached(page, wp, siteCheck.status));
  const payload = record.blocked ? null : wp.buildPayload(record, { seo });
  const changes = page && payload ? [
    ...diffFields(page.acf || {}, payload.acf, wp.fields),
    ...Object.entries(payload.meta).map(([k, v]) => {
      const a = show('text', (page.meta || {})[k]), b = show('text', v);
      return { field: `meta.${k}`, change: same(a, b) ? 'same' : (a ? 'changed' : 'added'), current: a, next: b };
    }),
  ] : [];
  // Client Values the site would hold after the push
  const clientValues = payload ? buildClientValuesPayload(recordValues ? record : { ...record, meta: { ...record.meta, client_values: fallbackValues || {} } }) : null;
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
    plugin: siteCheck.status,
    clientValues,
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
  const label = getPageType(r.pageType || 'homepage').wp.label;
  L.push(`DRY RUN: ${label} on ${r.site} (nothing was written)`);
  L.push(r.page ? `Page ${r.page.id} "${r.page.title}", status ${r.page.status}` : `The ${label} was not found`);
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

module.exports = { fieldsAttached, dryRun, diffFields, formatDryRun };
