'use strict';

// ── Making the inner pages on a client's site (13 Nov 2026) ──────────────────
// Every page map row that is in the build (it applies, and it is in phase 1) becomes an entry
// in its post type on the site (wp/post-types.js), as a draft, at the page map's path. The
// plugin does the writing (wp-plugin/llp-copybot/page-types.php, /llp-copybot/v1/pages):
// Copybot reads what the site holds, works out what is missing or out of line, and sends that.
//
// What can't happen: a page made twice (an entry is found by the id Copybot kept, else by its
// path), a page published or deleted, an entry's content or status touched. A page the page
// map moved keeps its entry and gets the new path. Staging sites only for now, as the pushes.
//
// planPages() is pure. createPagesService() is what the routes call: preview (reads only) and
// run (needs confirm: true).

const { postTypeFor } = require('./post-types');
const { identityOf } = require('../page-map/generator');
const { wpGet, wpPost } = require('./client');
const { siteVersionProblem } = require('./plugin-version');

// Page map row type → page type and scope
const KIND = {
  category: ['category', 'base'], location_category: ['category', 'town'],
  service: ['service', 'base'], town_service: ['service', 'town'],
  location: ['location', 'town'],
};
// The same rule the page runs use (category-run.js, service-run.js, location-run.js)
const live = r => r && r.applies !== false && ((r.info && r.info.phase) || 1) === 1;

// The pages the site should have, from the saved page map rows
function wantedPages(rows) {
  return (rows || []).filter(r => KIND[r.type] && live(r)).map(r => ({
    identity: identityOf(r), page_key: r.page_key, type: r.type, title: String(r.title || '').trim(), path: r.slug,
    post_type: postTypeFor(...KIND[r.type]),
  }));
}

// wanted: wantedPages(); onSite: the plugin's list [{ id, post_type, status, title, path }];
// kept: Map identity → the entry id Copybot made or found last time
function planPages(wanted, onSite, kept = new Map()) {
  const byId = new Map(onSite.map(e => [e.id, e]));
  const byPath = new Map(onSite.filter(e => e.path).map(e => [e.path, e]));
  const used = new Set();
  const pages = wanted.map(p => {
    const mine = byId.get(kept.get(p.identity));
    const there = byPath.get(p.path);
    const entry = mine || there;
    const out = { ...p, id: entry ? entry.id : null, status: entry ? entry.status : null };
    if (!p.title || !p.path) return { ...out, action: 'conflict', why: 'The page map row has no title or no URL.' };
    if (!entry) return { ...out, action: 'create' };
    used.add(entry.id);
    if (mine && there && there.id !== mine.id) return { ...out, action: 'conflict', why: `Another entry on the site (${there.id}, "${there.title}") is already at ${p.path}.` };
    if (entry.post_type !== p.post_type) return { ...out, action: 'conflict', why: `The entry at ${entry.path || p.path} is in the post type ${entry.post_type}; this page belongs in ${p.post_type}.` };
    const changes = [];
    if (entry.path !== p.path) changes.push(`URL ${entry.path || '(none)'} → ${p.path}`);
    if (entry.title !== p.title) changes.push(`title "${entry.title}" → "${p.title}"`);
    return changes.length ? { ...out, action: 'update', changes } : { ...out, action: 'same' };
  });
  // On the site, in these post types, and not a page in the build: listed, never touched
  const extras = onSite.filter(e => !used.has(e.id)).map(e => ({ id: e.id, post_type: e.post_type, status: e.status, title: e.title, path: e.path || '' }));
  const count = a => pages.filter(p => p.action === a).length;
  return { pages, extras, counts: { total: pages.length, create: count('create'), update: count('update'), same: count('same'), conflict: count('conflict'), extras: extras.length } };
}

async function ensurePagesTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wp_pages (
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      site        TEXT NOT NULL,
      identity    TEXT NOT NULL,
      wp_id       INTEGER NOT NULL,
      post_type   TEXT NOT NULL,
      path        TEXT NOT NULL,
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (client_id, site, identity)
    );
  `);
}

const CHUNK = 100;

// getSite(clientId) → { url, user, appPassword, staging } or null; pageRows(clientId) → the saved
// page map rows; createLog(clientId) → { appendLog }
function createPagesService({ pool, getSite, pageRows, createLog }) {
  async function kept(clientId, siteUrl) {
    const { rows } = await pool.query(`SELECT identity, wp_id FROM wp_pages WHERE client_id = $1 AND site = $2`, [clientId, siteUrl]);
    return new Map(rows.map(r => [r.identity, Number(r.wp_id)]));
  }
  async function keep(clientId, siteUrl, p, id) {
    // pg-mem and Postgres both: update, then insert when there was nothing to update
    const u = await pool.query(`UPDATE wp_pages SET wp_id = $4, post_type = $5, path = $6, updated_at = NOW() WHERE client_id = $1 AND site = $2 AND identity = $3`, [clientId, siteUrl, p.identity, id, p.post_type, p.path]);
    if (!u.rowCount) await pool.query(`INSERT INTO wp_pages (client_id, site, identity, wp_id, post_type, path) VALUES ($1, $2, $3, $4, $5, $6)`, [clientId, siteUrl, p.identity, id, p.post_type, p.path]);
  }

  // What the site is missing. Reads only.
  async function look(clientId) {
    const site = await getSite(clientId);
    if (!site) throw Object.assign(new Error('This client has no WordPress site connected yet. Add it on the Pages tab.'), { status: 400 });
    const wanted = wantedPages(await pageRows(clientId));
    const refusals = [];
    if (!wanted.length) refusals.push('The page map has no category, service or location pages yet. Generate the page map first.');
    if (!site.staging) refusals.push(`${site.url} is not marked as a staging site. Pages are made on staging sites only for now.`);
    let onSite = [];
    const status = await wpGet(site, '/llp-copybot/v1/status').catch(e => ({ error: e.message }));
    if (status.error) refusals.push(`Can't reach the Copybot plugin on the site: ${status.error}`);
    else {
      const old = siteVersionProblem(status.plugin);
      if (old) refusals.push(old);
      const missing = Object.entries(status.page_types || {}).filter(([, v]) => v === 'missing').map(([k]) => k);
      if (!old && !status.page_types) refusals.push('The site did not report its post types.');
      if (missing.length) refusals.push(`The site has no post type ${missing.join(', ')}.`);
      if (!old) {
        try { onSite = (await wpGet(site, '/llp-copybot/v1/pages')).items || []; }
        catch (e) { refusals.push(`Couldn't read the pages on the site: ${e.message}`); }
      }
    }
    const plan = planPages(wanted, onSite, await kept(clientId, site.url));
    return { site, wanted, plan, refusals };
  }

  return {
    async preview(clientId) {
      const { site, plan, refusals } = await look(clientId);
      return { site: site.url, staging: !!site.staging, refusals, ...plan };
    },

    async run(clientId, { confirm = false } = {}) {
      if (confirm !== true) throw Object.assign(new Error('Making the pages needs confirming.'), { status: 400 });
      const { site, wanted, plan, refusals } = await look(clientId);
      const log = createLog(clientId);
      const base = { action: 'make pages', site: site.url };
      if (refusals.length) {
        await log.appendLog({ ...base, result: 'refused', refusals });
        return { ok: false, site: site.url, refusals, ...plan };
      }
      // Entries that are already right: remember them, so a later move finds them by id
      for (const p of plan.pages.filter(x => x.action === 'same')) await keep(clientId, site.url, p, p.id);

      const send = plan.pages.filter(p => p.action === 'create' || p.action === 'update');
      const errors = [];
      let created = 0, updated = 0;
      try {
        for (let i = 0; i < send.length; i += CHUNK) {
          const part = send.slice(i, i + CHUNK);
          const res = await wpPost(site, '/llp-copybot/v1/pages', { items: part.map(p => ({ post_type: p.post_type, title: p.title, path: p.path, ...(p.id ? { id: p.id } : {}) })) });
          const items = (res && res.items) || [];
          for (let j = 0; j < part.length; j++) {
            const r = items[j] || { result: 'error', message: 'The site gave no answer for this page.' };
            if (r.result === 'error' || !r.id) { errors.push({ path: part[j].path, title: part[j].title, message: r.message || 'The site did not make this page.' }); continue; }
            if (r.result === 'created') created++;
            if (r.result === 'updated') updated++;
            await keep(clientId, site.url, part[j], Number(r.id));
          }
        }
      } catch (e) {
        await log.appendLog({ ...base, result: 'failed', error: e.message, created, updated });
        return { ok: false, site: site.url, error: e.message, created, updated, refusals: [], ...plan, errors };
      }

      // Read back: every page in the build is on the site, in its post type, at its path
      const after = planPages(wanted, (await wpGet(site, '/llp-copybot/v1/pages')).items || [], await kept(clientId, site.url));
      const notRight = after.pages.filter(p => p.action !== 'same').map(p => ({ path: p.path, title: p.title, action: p.action, why: p.why || (p.changes || []).join('; ') || 'not on the site' }));
      const ok = !errors.length && !notRight.length;
      const result = ok ? 'made' : 'made, with problems';
      await log.appendLog({ ...base, result, created, updated, same: plan.counts.same, conflicts: plan.counts.conflict, errors, notRight });
      return { ok, result, site: site.url, created, updated, same: plan.counts.same, errors, notRight, refusals: [], ...after };
    },
  };
}

module.exports = { wantedPages, planPages, ensurePagesTable, createPagesService, KIND };
