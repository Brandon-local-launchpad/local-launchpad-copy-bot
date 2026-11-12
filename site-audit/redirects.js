'use strict';

// ── The redirect push ─────────────────────────────────────────────────────────────
// The approved URL map into Rank Math, through the plugin (wp-plugin/llp-copybot/redirects.php).
// The same safety as a copy push: a dry run diff first, staging only, no push with a BLOCK in the map,
// a read back after, a snapshot and a rollback. Redirects always arrive inactive and nothing here can
// turn them on outside the staging test in validator.js. Writing to a live customer site is refused
// twice over: the connection must be marked staging, and its host must not be the live domain.

const { wpGet, wpPost } = require('../wp/client');
const { siteVersionProblem } = require('../wp/plugin-version');
const { mapCheck, siteCheck, domainForms, stagingTest, issue } = require('./validator');
const { stripWww } = require('./urls');

const BATCH = 200;
const hostOf = s => { try { return new URL(/^https?:\/\//i.test(String(s)) ? String(s) : `https://${s}`).hostname; } catch (_) { return ''; } };
const err = (status, message) => Object.assign(new Error(message), { status });

// Why this site can't be written to. Empty means it can. A pure check, so it can be tested on its own.
function stagingGuard(site, liveDomain) {
  const out = [];
  if (!site || !site.url) return ['This client has no WordPress site connected.'];
  if (!site.staging) out.push(`${site.url} isn't marked as staging. Redirects go to staging sites only.`);
  const live = stripWww(hostOf(liveDomain));
  if (live && stripWww(hostOf(site.url)) === live) out.push(`The WordPress connection is on the live domain, ${live}. Nothing is ever written to a live customer site.`);
  return out;
}

// What the map wants on the site: every approved row that redirects
const wanted = urls => urls.filter(u => u.plan && u.plan.approved && ['301', '410'].includes(u.plan.redirect_type)).map(u => ({ source: u.path, path: u.plan.redirect_type === '301' ? u.plan.new_url : '', code: Number(u.plan.redirect_type) }));

// Map against site: what a push would do. items: the plugin's own rows.
function diffRedirects(want, items, other = []) {
  const mine = new Map(items.map(i => [i.source, i]));
  const theirs = new Map(other.map(o => [o.source, o]));
  const add = [], change = [], same = [], conflicts = [];
  for (const w of want) {
    if (theirs.has(w.source)) { conflicts.push({ ...w, id: theirs.get(w.source).id, status: theirs.get(w.source).status }); continue; }
    const m = mine.get(w.source);
    if (!m || m.status === 'missing') add.push(w);
    else if (Number(m.code) !== Number(w.code) || (m.path || '') !== (w.path || '')) change.push({ ...w, was: { path: m.path, code: m.code } });
    else same.push(w);
  }
  const keep = new Set(want.map(w => w.source));
  const remove = items.filter(i => !keep.has(i.source));
  return { add, change, same, remove, conflicts };
}

// The read back: every row there, inactive, as sent, and nothing else of ours
function readBack(want, view) {
  const problems = [];
  const items = view.items || [];
  const by = new Map(items.map(i => [i.source, i]));
  for (const w of want) {
    const m = by.get(w.source);
    if (!m) { problems.push(`${w.source} isn't on the site.`); continue; }
    if (m.status !== 'inactive') problems.push(`${w.source} is ${m.status}, not inactive.`);
    if (m.stored !== w.source) problems.push(`${w.source} was stored by Rank Math as ${m.stored || 'nothing'}.`);
    if (Number(m.code) !== Number(w.code)) problems.push(`${w.source} is a ${m.code}, not a ${w.code}.`);
    if ((m.path || '') !== (w.path || '')) problems.push(`${w.source} goes to ${m.path || 'nothing'}, not ${w.path || 'nothing'}.`);
  }
  const keep = new Set(want.map(w => w.source));
  for (const i of items) if (!keep.has(i.source)) problems.push(`${i.source} shouldn't be on the site.`);
  return problems;
}

async function sendAll(site, want, remove) {
  const totals = { created: 0, updated: 0, deleted: 0, conflicts: [], errors: [] };
  if (remove.length) totals.deleted = (await wpPost(site, '/llp-copybot/v1/redirects/delete', { ids: remove.map(r => r.id) })).deleted;
  for (let i = 0; i < want.length; i += BATCH) {
    const r = await wpPost(site, '/llp-copybot/v1/redirects', { items: want.slice(i, i + BATCH) });
    totals.created += r.created || 0;
    totals.updated += r.updated || 0;
    totals.conflicts.push(...(r.conflicts || []));
    totals.errors.push(...(r.errors || []));
  }
  return totals;
}

// view(clientId): the audit's view. getSite(clientId): the connection with its password, or null.
function createRedirects({ view, getSite, loadValues, createLog, pool }) {
  async function siteOf(clientId) {
    const site = await getSite(clientId);
    if (!site) throw err(400, 'This client has no WordPress site connected. Add it on the Pages tab.');
    return site;
  }
  async function pluginView(site) {
    let status;
    try { status = await wpGet(site, '/llp-copybot/v1/status'); }
    catch (e) {
      if (/→ 404/.test(e.message)) return { problems: ['The Local Launchpad Copybot plugin is not active on the site.'] };
      throw e;
    }
    const problems = [];
    const version = siteVersionProblem(status.plugin);
    if (version) problems.push(version);
    const rm = status.redirects;
    if (!rm) problems.push('The plugin on the site is too old to take redirects. Install the latest.');
    else if (!rm.rank_math) problems.push('Rank Math is not active on the site.');
    else if (!rm.ready) problems.push("Rank Math's Redirections module is off. Turn it on under Rank Math, Dashboard, Modules.");
    return { status, problems };
  }

  async function dryRun(clientId) {
    const v = await view(clientId);
    const cv = await loadValues(clientId);
    const site = await siteOf(clientId);
    const refusals = stagingGuard(site, cv.live_domain);
    const main = v.urls.filter(u => !u.plan.no_action);
    const waiting = main.filter(u => !u.plan.approved);
    if (!v.page_map_ready) refusals.push('The decisions wait for the Page Map.');
    if (waiting.length) refusals.push(`${waiting.length} ${waiting.length === 1 ? 'decision isn\'t' : 'decisions aren\'t'} approved yet.`);
    const map = mapCheck(v);
    if (map.block.length) refusals.push(`The URL map has ${map.block.length} BLOCK ${map.block.length === 1 ? 'issue' : 'issues'}: ${map.block[0].text}`);
    const want = wanted(v.urls);
    const plugin = await pluginView(site);
    refusals.push(...plugin.problems);
    let diff = { add: want, change: [], same: [], remove: [], conflicts: [] };
    let onSite = { items: [], other: [], active: 0 };
    if (!plugin.problems.length) {
      onSite = await wpGet(site, '/llp-copybot/v1/redirects');
      diff = diffRedirects(want, onSite.items || [], onSite.other || []);
      if (onSite.active > 0) refusals.push(`${onSite.active} Copybot ${onSite.active === 1 ? 'redirect is' : 'redirects are'} switched on at the site. Turn them off first.`);
      for (const c of diff.conflicts) refusals.push(`Rank Math already has a redirect for ${c.source} that isn't Copybot's. Remove it there, or change this row.`);
    }
    if (!want.length && !(onSite.items || []).length) refusals.push('The approved map has no redirects to push.');
    return { site: site.url, staging: !!site.staging, plugin: plugin.status || null, pushable: refusals.length === 0, refusals, want: want.length, ...diff, on_site: (onSite.items || []).length, map };
  }

  async function push(clientId, { confirm = false, who = '' } = {}) {
    if (confirm !== true) throw err(400, 'A push needs confirming.');
    const dry = await dryRun(clientId);
    const site = await siteOf(clientId);
    const log = createLog(clientId);
    const base = { action: 'redirects_push', site: site.url, who };
    if (!dry.pushable) {
      await log.appendLog({ ...base, result: 'refused', refusals: dry.refusals });
      return { ok: false, refusals: dry.refusals, dry };
    }
    const before = await wpGet(site, '/llp-copybot/v1/redirects');
    const snapshotId = await log.saveSnapshot({ kind: 'redirects', site: site.url, items: (before.items || []).map(i => ({ source: i.source, path: i.path, code: i.code })) });
    const v = await view(clientId);
    const want = wanted(v.urls);
    let sent;
    try {
      sent = await sendAll(site, want, dry.remove);
    } catch (e) {
      await log.appendLog({ ...base, result: 'failed', error: e.message, snapshotId });
      return { ok: false, error: e.message, snapshotId, refusals: [], dry };
    }
    const after = await wpGet(site, '/llp-copybot/v1/redirects');
    const problems = readBack(want, after);
    for (const c of sent.conflicts) problems.push(`${c.source} clashes with a redirect that isn't Copybot's.`);
    for (const x of sent.errors) problems.push(`${x.source}: ${x.error}`);
    const result = problems.length ? 'written, read back differs' : 'pushed';
    await log.appendLog({ ...base, result, snapshotId, sent: { created: sent.created, updated: sent.updated, deleted: sent.deleted }, count: want.length, problems });
    return { ok: !problems.length, result, snapshotId, sent, problems, count: want.length, dry, read_back: after.items || [] };
  }

  // Back to what the site held before that push. The first push's snapshot is empty, so this removes them all.
  async function rollback(clientId, { snapshotId, confirm = false, who = '' } = {}) {
    if (confirm !== true) throw err(400, 'A rollback needs confirming.');
    const site = await siteOf(clientId);
    const cv = await loadValues(clientId);
    const refusals = stagingGuard(site, cv.live_domain);
    if (refusals.length) return { ok: false, refusals };
    const log = createLog(clientId);
    const snap = await log.getSnapshot(snapshotId);
    if (!snap || snap.kind !== 'redirects') return { ok: false, error: `No redirect snapshot ${snapshotId}.` };
    if (snap.site !== site.url) return { ok: false, error: `That snapshot is for ${snap.site}, not ${site.url}.` };
    const now = await wpGet(site, '/llp-copybot/v1/redirects');
    const keep = new Set(snap.items.map(i => i.source));
    const remove = (now.items || []).filter(i => !keep.has(i.source));
    // Anything left on is turned off first: a rollback never leaves a redirect live
    if (now.active > 0) await wpPost(site, '/llp-copybot/v1/redirects/status', { status: 'inactive' });
    const sent = await sendAll(site, snap.items, remove);
    const after = await wpGet(site, '/llp-copybot/v1/redirects');
    const problems = readBack(snap.items, after);
    await log.appendLog({ action: 'redirects_rollback', site: site.url, snapshotId, who, result: problems.length ? 'restored, read back differs' : 'restored', removed: sent.deleted, restored: snap.items.length, problems });
    return { ok: !problems.length, problems, removed: sent.deleted, restored: snap.items.length, left: (after.items || []).length };
  }

  // ── The pre launch check ──
  const saveCheck = async (clientId, kind, siteUrl, result) => {
    if (pool) await pool.query(`INSERT INTO site_redirect_checks (client_id, kind, site, block, warn, result) VALUES ($1, $2, $3, $4, $5, $6)`, [clientId, kind, siteUrl, result.block.length, result.warn.length, JSON.stringify(result)]);
    return result;
  };
  const merge = (...parts) => ({ block: parts.flatMap(p => p.block || []), warn: parts.flatMap(p => p.warn || []) });

  // The map, then staging if there is one, then the live domain's forms as they stand today
  async function validate(clientId, { fetchImpl = (...a) => fetch(...a), wait = async () => {} } = {}) {
    const v = await view(clientId);
    const cv = await loadValues(clientId);
    const map = mapCheck(v);
    const site = await getSite(clientId);
    const guard = site ? stagingGuard(site, cv.live_domain) : ['This client has no WordPress site connected.'];
    const onStaging = guard.length ? { block: guard.map(t => issue('BLOCK', t)), warn: [], results: [] } : await siteCheck(v, site, { fetchImpl, wait });
    // The top list pages' top searches on their new pages (slice 2): WARNs only, staging only
    const content = guard.length ? { block: [], warn: [], results: [] } : await require('./launch').contentCheck(v, site.url, { fetchImpl, wait });
    const forms = cv.live_domain ? await domainForms(cv.live_domain, { fetchImpl, wait, level: 'WARN', label: 'the live domain' }) : { block: [], warn: [], forms: [] };
    const result = { ...merge(map, onStaging, content, forms), staging: onStaging.results, content: content.results, forms: forms.forms, final: forms.final || '', at: new Date().toISOString() };
    await saveCheck(clientId, 'pre_launch', site && site.url, result);
    // The launch day switch on the site shows this result. Staging only, and a failure here isn't the check's failure.
    if (site && !guard.length) {
      try { await wpPost(site, '/llp-copybot/v1/redirects/check', { block: result.block.length, warn: result.warn.length, at: result.at }); }
      catch (e) { result.warn.push(issue('WARN', `The result couldn't be saved on the staging site: ${e.message}.`)); }
    }
    return result;
  }

  // The one hop rule after launch: read only, so it may look at the live site
  async function afterLaunch(clientId, { fetchImpl = (...a) => fetch(...a), wait = async () => {} } = {}) {
    const cv = await loadValues(clientId);
    if (!cv.live_domain) throw err(400, 'Add the live domain on the Record tab first.');
    const forms = await domainForms(cv.live_domain, { fetchImpl, wait, level: 'BLOCK', label: 'the live domain' });
    return saveCheck(clientId, 'after_launch', cv.live_domain, { block: forms.block, warn: forms.warn, forms: forms.forms, final: forms.final, at: new Date().toISOString() });
  }

  // Turn on at staging, test, always turn off
  async function testOnStaging(clientId, { confirm = false, who = '', fetchImpl = (...a) => fetch(...a), wait = async () => {} } = {}) {
    if (confirm !== true) throw err(400, 'The test needs confirming.');
    const site = await siteOf(clientId);
    const cv = await loadValues(clientId);
    const refusals = stagingGuard(site, cv.live_domain);
    const plugin = refusals.length ? { problems: [] } : await pluginView(site);
    const result = await stagingTest(site, { refusals: [...refusals, ...plugin.problems], api: { get: p => wpGet(site, p), post: (p, b) => wpPost(site, p, b) }, fetchImpl, wait });
    result.at = new Date().toISOString();
    await createLog(clientId).appendLog({ action: 'redirects_test', site: site.url, who, result: result.ok ? 'passed' : 'failed', block: result.block.length, turned_off: result.turned_off !== false, refused: result.refused || null });
    return saveCheck(clientId, 'staging_test', site.url, result);
  }

  async function latestChecks(clientId) {
    if (!pool) return {};
    const { rows } = await pool.query(`SELECT kind, block, warn, result, created_at FROM site_redirect_checks WHERE client_id = $1 ORDER BY created_at`, [clientId]);
    const out = {};
    for (const r of rows) out[r.kind] = { block: r.block, warn: r.warn, result: r.result, at: r.created_at };
    return out;
  }

  async function log(clientId) {
    const rows = await createLog(clientId).listLog(50);
    return rows.filter(r => /^redirects_|^redirect_/.test(r.action || ''));
  }

  async function latestSnapshot(clientId) {
    const rows = await log(clientId);
    const p = rows.find(r => r.action === 'redirects_push' && r.snapshotId);
    return p ? p.snapshotId : null;
  }

  return { dryRun, push, rollback, log, latestSnapshot, siteOf, pluginView, validate, afterLaunch, testOnStaging, latestChecks };
}

module.exports = { createRedirects, stagingGuard, wanted, diffRedirects, readBack, hostOf };
