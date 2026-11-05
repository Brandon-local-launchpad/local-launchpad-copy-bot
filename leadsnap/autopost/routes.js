'use strict';

// ── Lead Snap tab routes ─────────────────────────────────────────────────────
//   GET  /api/clients/:id/lead-snap            the intake, the prompt mix, the saved config
//   PUT  /api/clients/:id/lead-snap/intake     the typed fields: photo counts, offer, booking URL
//   POST /api/clients/:id/lead-snap/generate   write the config (spends one or two model calls)
//   GET  /clients/:slug/lead-snap/:file        autopost-config.txt, validation.json
//
// loadInputs(clientId) → { I, trade, answers }: the GBP inputs and the Fillout answers.

const { slugify } = require('../../page-map/slugs');
const { createAutopostStore } = require('./store');
const { buildIntake } = require('./intake');
const { decide } = require('./decide');
const { runAutopost, filesFor } = require('./generate');

const CONTENT_TYPES = { 'autopost-config.txt': 'text/plain; charset=utf-8', 'validation.json': 'application/json; charset=utf-8' };
const CTA_TYPES = ['', 'Call Now', 'Book', 'Learn More'];

function cleanHand(body = {}, groups = []) {
  const bad = m => Object.assign(new Error(m), { status: 400 });
  const count = (v, name) => { const n = Number(v === '' || v == null ? 0 : v); if (!Number.isInteger(n) || n < 0) throw bad(`${name} must be a whole number, 0 or more.`); return n; };
  const counts = {};
  for (const g of groups) counts[g.key] = count((body.counts || {})[g.key], g.label);
  const booking = String(body.booking_url || '').trim();
  if (booking && !/^https?:\/\/\S+$/i.test(booking)) throw bad('The booking URL must start with http:// or https://.');
  const cta = String(body.cta_type || '').trim();
  if (!CTA_TYPES.includes(cta)) throw bad('The call to action must be Call Now, Book or Learn More.');
  const text = k => String(body[k] || '').trim().slice(0, 300);
  return { counts, brand: count(body.brand, 'Brand photos'), offer: text('offer'), booking_url: booking, cta_type: cta, tone: text('tone'), avoid: text('avoid') };
}

function mountLeadSnapApi(app, { pool, loadInputs, callModel, log = console }) {
  const store = createAutopostStore(pool);
  const running = new Set();
  const wrap = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[lead snap]', err); res.status(err.status || 500).json({ error: err.message }); }
  };
  const intakeFor = async clientId => {
    const { I, trade, answers } = await loadInputs(clientId);
    const hand = await store.hand(clientId);
    return { intake: buildIntake({ I, trade, answers, hand }), hand };
  };
  const view = async clientId => {
    const { rows } = await pool.query(`SELECT name FROM clients WHERE id=$1`, [clientId]);
    if (!rows.length) throw Object.assign(new Error('Client not found.'), { status: 404 });
    const slug = slugify(rows[0].name);
    const record = await store.latest(clientId);
    const files = Object.fromEntries(Object.keys(filesFor(record)).map(f => [f, `/clients/${slug}/lead-snap/${f}`]));
    let intake = null, hand = {}, plan = null, error = null;
    try { ({ intake, hand } = await intakeFor(clientId)); plan = decide(intake); } catch (e) { if (!e.status) log.error('[lead snap]', e); error = e.message; }
    return { slug, record, files, intake, hand, plan, error, running: running.has(clientId) };
  };

  app.get('/api/clients/:clientId/lead-snap', wrap(async (req, res) => res.json(await view(req.params.clientId))));

  app.put('/api/clients/:clientId/lead-snap/intake', wrap(async (req, res) => {
    const { clientId } = req.params;
    const { intake } = await intakeFor(clientId);
    await store.saveHand(clientId, cleanHand(req.body, intake.groups));
    res.json(await view(clientId));
  }));

  app.post('/api/clients/:clientId/lead-snap/generate', wrap(async (req, res) => {
    const { clientId } = req.params;
    if (running.has(clientId)) throw Object.assign(new Error('A Lead Snap run is already in progress for this client.'), { status: 409 });
    running.add(clientId);
    try {
      const { intake } = await intakeFor(clientId);
      if (!intake.ok) throw Object.assign(new Error(`Fill these in first: ${intake.missing.join('; ')}.`), { status: 400 });
      const record = await runAutopost({ intake, callModel, previous: await store.latest(clientId), log: m => log.log(m) });
      await store.save(clientId, record);
      log.log(`[lead snap] ${clientId}: ${record.failure ? 'failed the checks' : `${record.output.prompts.length} prompts`}`);
    } finally { running.delete(clientId); }
    res.json(await view(clientId));
  }));

  app.get('/clients/:slug/lead-snap/:file', wrap(async (req, res) => {
    const { slug, file } = req.params;
    if (!CONTENT_TYPES[file]) throw Object.assign(new Error(`No such file. The files are ${Object.keys(CONTENT_TYPES).join(', ')}.`), { status: 404 });
    const { rows } = await pool.query(`SELECT id, name FROM clients`);
    const client = rows.find(r => slugify(r.name) === slug);
    if (!client) throw Object.assign(new Error('No client with that slug.'), { status: 404 });
    const files = filesFor(await store.latest(client.id));
    if (!(file in files)) throw Object.assign(new Error('No Lead Snap config has been generated for this client.'), { status: 404 });
    res.set('Content-Type', CONTENT_TYPES[file]);
    res.set('Content-Disposition', `inline; filename="${file}"`);
    res.send(files[file]);
  }));

  return { store };
}

module.exports = { mountLeadSnapApi, cleanHand, CONTENT_TYPES };
