'use strict';

// ── Website images: the routes, and how a client's inputs are found ──────────
//   GET  /api/clients/:id/images            every page's slots, picks, choices and approvals (reads only)
//   PUT  /api/clients/:id/images/choice     { identity, slot, file_id } ('' leaves the slot empty)
//   POST /api/clients/:id/images/approve    { identity | '*', approved, by }
//   POST /api/clients/:id/images/place      { identity, confirm: true }: one approved page onto the staging site
// The photos themselves are shown through the GBP posts photo route (the service account, ?size=thumb).

const express = require('express');
const { createImages } = require('./service');
const { MAX_BYTES } = require('./uploads');
const { heroChoiceOf } = require('./pick');
const { describePhoto } = require('./alt');
const { createDriveStore } = require('../drive/store');
const { createAutopostStore } = require('../leadsnap/autopost/store');
const { lockedFrom, groupServices } = require('../leadsnap/autopost/intake');

// pageRows(clientId), latestRecords(clientId, type) → [{ key, record }], getSite(clientId), getDrive()
// callModel: anthropic-call.js makeCallModel's caller on the page-models.json "images" model, or null with no API key
function mountImagesApi(app, { pool, pageRows, latestRecords, getSite, getDrive, callModel = null, log = console }) {
  const driveStore = createDriveStore(pool);
  const autopost = createAutopostStore(pool);
  const images = createImages({
    pool, pageRows, getSite, getDrive,
    // The alt text of a photo added by hand: Copybot looks at a small copy of it (images/alt.js)
    describe: callModel ? async ({ bytes, name }) => (await describePhoto({ bytes, name, callModel, ...require('../page-models').images() })).alt : null,
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
    // The client's own answer on the onboarding form decides whether heroes are their photos or the site's graphic
    heroChoiceFor: async clientId => {
      const { rows } = await pool.query(`SELECT value FROM client_fields WHERE client_id = $1 AND field_key = 'hero_image'`, [clientId]);
      return heroChoiceOf(rows.length ? rows[0].value : '');
    },
  });
  const wrap = fn => async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[images]', err); res.status(err.status || 500).json({ error: err.message }); }
  };
  app.get('/api/clients/:id/images', wrap(req => images.view(req.params.id)));
  app.put('/api/clients/:id/images/choice', wrap(req => images.choose(req.params.id, req.body || {})));
  app.post('/api/clients/:id/images/approve', wrap(req => images.approve(req.params.id, req.body || {})));
  app.post('/api/clients/:id/images/place', wrap(req => images.placePage(req.params.id, req.body || {})));
  // A photo dropped in by hand: the file is the body; its name, alt text, source and the slot it was dropped on are in the query
  app.post('/api/clients/:id/images/upload', express.raw({ type: () => true, limit: `${Math.ceil(MAX_BYTES / 1024 / 1024) + 1}mb` }), wrap(req => {
    const q = req.query || {};
    return images.upload(req.params.id, { bytes: req.body, name: String(q.name || ''), alt: String(q.alt || ''), source: String(q.source || 'stock'), by: String(q.by || ''), identity: String(q.identity || ''), slot: String(q.slot || '') });
  }));
  app.put('/api/clients/:id/images/alt', wrap(req => images.setAlt(req.params.id, req.body || {})));
  app.post('/api/clients/:id/images/alt/write', wrap(req => images.writeAlt(req.params.id, req.body || {})));
  app.put('/api/clients/:id/images/crop', wrap(req => images.crop(req.params.id, req.body || {})));
  const send = fn => async (req, res) => {
    try { const img = await fn(req); res.set('Content-Type', img.type); res.set('Cache-Control', 'private, max-age=3600'); res.send(img.bytes); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[images]', err); res.status(err.status || 500).json({ error: err.message }); }
  };
  // A photo added by hand (?size=thumb), and a slot as it will look on the site, with its crop
  app.get('/api/clients/:id/images/photo/:fileId', send(req => images.uploadImage(req.params.id, req.params.fileId, { thumb: req.query.size === 'thumb' })));
  app.get('/api/clients/:id/images/preview', send(req => images.preview(req.params.id, { identity: String(req.query.identity || ''), slot: String(req.query.slot || ''), width: req.query.width })));
  return images;
}

module.exports = { mountImagesApi };
