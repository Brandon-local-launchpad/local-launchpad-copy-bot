'use strict';

// ── Publishing routes ────────────────────────────────────────────────────────
//   GET    /api/clients/:id/publishing                  the connection, the queue, Photo Drip
//   GET    /api/clients/:id/publishing/locations        what each source login can post to (creates nothing)
//   POST   /api/clients/:id/publishing/connect          { source_team_id, channel_id }
//   POST   /api/clients/:id/publishing/switch           { on }
//   POST   /api/clients/:id/publishing/items/:i/send    Send now, or Retry
//   DELETE /api/clients/:id/publishing/items/:i
//   POST   /api/clients/:id/publishing/drip/plan
//   POST   /api/clients/:id/publishing/drip/approve
// Anything that calls out is refused unless publishing is enabled on the server. Planning is not.

const { enabled, configured, dailyLimit, SOURCE_TEAMS } = require('./index');

function mountPublishingApi(app, { pool, publishing, store, postStore, log = console, isEnabled = () => enabled() , isConfigured = () => configured(), limit = () => dailyLimit() }) {
  const bad = (m, status = 400) => Object.assign(new Error(m), { status });
  const wrap = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[publishing]', err); res.status(err.status || 500).json({ error: err.message }); }
  };
  const needOn = () => { if (!isEnabled()) throw bad(isConfigured() ? 'Publishing is switched off on this server (GBP_PUBLISHING_ENABLED).' : 'BUNDLE_SOCIAL_API_KEY is not set on this server.', 503); };

  async function view(clientId) {
    const { rows } = await pool.query(`SELECT id FROM clients WHERE id=$1`, [clientId]);
    if (!rows.length) throw bad('Client not found.', 404);
    await publishing.syncPosts(clientId);
    const items = await store.items(clientId);
    const posts = new Map();
    for (const b of await postStore.batches(clientId)) for (const p of await postStore.posts(b.id)) posts.set(p.id, p);
    const list = items.map(i => {
      const p = i.post_id ? posts.get(i.post_id) : null;
      return { id: i.id, kind: i.kind, status: i.status, due_date: i.due_date, due_time: i.due_time, file_id: i.drive_file_id, file_name: i.file_name, category: i.category, error: i.error, link: i.link, label: p ? p.prompt_label : i.file_name, topic: p ? p.topic : '', sent: !!(i.external_id || i.media_name), posted_at: i.posted_at, attempts: i.attempts };
    });
    const counts = {};
    for (const i of list) counts[i.status] = (counts[i.status] || 0) + 1;
    const conn = await store.connection(clientId);
    return { enabled: isEnabled(), configured: isConfigured(), sources: SOURCE_TEAMS, connection: conn, items: list, counts, drip: await (async () => { const { unused, ...d } = await publishing.dripState(clientId); return d; })(), daily_limit: limit(), last_run: await store.lastRun() };
  }

  app.get('/api/clients/:clientId/publishing', wrap(async (req, res) => res.json(await view(req.params.clientId))));
  app.get('/api/clients/:clientId/publishing/locations', wrap(async (req, res) => { needOn(); res.json(await publishing.locations(req.params.clientId)); }));
  app.post('/api/clients/:clientId/publishing/connect', wrap(async (req, res) => {
    needOn();
    await publishing.connect(req.params.clientId, req.body || {});
    res.json(await view(req.params.clientId));
  }));
  app.post('/api/clients/:clientId/publishing/switch', wrap(async (req, res) => {
    needOn();
    await publishing.setPublishing(req.params.clientId, !!(req.body && req.body.on));
    res.json(await view(req.params.clientId));
  }));
  app.post('/api/clients/:clientId/publishing/items/:itemId/send', wrap(async (req, res) => {
    needOn();
    await publishing.sendNow(req.params.clientId, req.params.itemId);
    res.json(await view(req.params.clientId));
  }));
  app.delete('/api/clients/:clientId/publishing/items/:itemId', wrap(async (req, res) => {
    const item = await store.item(req.params.clientId, req.params.itemId);
    if (item && (item.external_id || item.media_name)) needOn();
    await publishing.deleteItem(req.params.clientId, req.params.itemId);
    res.json(await view(req.params.clientId));
  }));
  app.post('/api/clients/:clientId/publishing/drip/plan', wrap(async (req, res) => { await publishing.planDrip(req.params.clientId); res.json(await view(req.params.clientId)); }));
  app.post('/api/clients/:clientId/publishing/drip/approve', wrap(async (req, res) => { await publishing.approveDrip(req.params.clientId); res.json(await view(req.params.clientId)); }));
}

module.exports = { mountPublishingApi };
