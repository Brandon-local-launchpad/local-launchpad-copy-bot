'use strict';

// ── Website images: the routes, and how a client's inputs are found ──────────
//   GET  /api/clients/:id/images            every page's slots, picks, choices and approvals (reads only)
//   PUT  /api/clients/:id/images/choice     { identity, slot, file_id } ('' leaves the slot empty)
//   POST /api/clients/:id/images/approve    { identity | '*', approved, by }
//   POST /api/clients/:id/images/place      { identity, confirm: true }: one approved page onto the staging site
// The photos themselves are shown through the GBP posts photo route (the service account, ?size=thumb).

const { createImages } = require('./service');
const { createDriveStore } = require('../drive/store');
const { createAutopostStore } = require('../leadsnap/autopost/store');
const { lockedFrom, groupServices } = require('../leadsnap/autopost/intake');

// pageRows(clientId), latestRecords(clientId, type) → [{ key, record }], getSite(clientId), getDrive()
function mountImagesApi(app, { pool, pageRows, latestRecords, getSite, getDrive, log = console }) {
  const driveStore = createDriveStore(pool);
  const autopost = createAutopostStore(pool);
  const images = createImages({
    pool, pageRows, getSite, getDrive,
    readDrive: clientId => driveStore.read(clientId),
    // The photo folders' names and the service pages behind each: the saved post prompts' groups, whose names
    // the folders were made from; else the same grouping worked out from the page map's service pages
    groupsFor: async clientId => {
      const saved = lockedFrom(await autopost.latest(clientId));
      if (saved) return saved;
      const services = (await pageRows(clientId)).filter(r => r.type === 'service' && r.applies !== false);
      return groupServices(services.map(r => ({ service: r.title, copyPriority: (r.info && r.info.copy_priority) || 0 })), []);
    },
    // A page's cards are the ones its written copy has: the picture goes on the card's row on the site
    cardsFor: async clientId => {
      const out = new Map();
      const path = u => String(u || '').replace(/\/+$/, '') || '/';
      for (const type of ['homepage', 'category', 'location']) {
        for (const r of await latestRecords(clientId, type)) {
          const rec = r.record || {};
          if (rec.blocked || !Array.isArray(rec.cards)) continue;
          out.set(type === 'homepage' ? '/' : r.key, rec.cards.map(c => path(c.card_url)).filter(u => u.startsWith('/')));
        }
      }
      return out;
    },
    createLog: clientId => require('../wp/db-store').createDbStore(pool, clientId),
  });
  const wrap = fn => async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[images]', err); res.status(err.status || 500).json({ error: err.message }); }
  };
  app.get('/api/clients/:id/images', wrap(req => images.view(req.params.id)));
  app.put('/api/clients/:id/images/choice', wrap(req => images.choose(req.params.id, req.body || {})));
  app.post('/api/clients/:id/images/approve', wrap(req => images.approve(req.params.id, req.body || {})));
  app.post('/api/clients/:id/images/place', wrap(req => images.placePage(req.params.id, req.body || {})));
  return images;
}

module.exports = { mountImagesApi };
