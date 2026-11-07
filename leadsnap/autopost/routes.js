'use strict';

// ── Lead Snap tab routes ─────────────────────────────────────────────────────
//   GET  /api/clients/:id/lead-snap            the intake, the prompt mix, the saved config
//   PUT  /api/clients/:id/lead-snap/intake     the typed fields: photo counts, offer, booking URL
//   POST /api/clients/:id/lead-snap/generate   write the config (spends one or two model calls); takes up
//                                              the page map's names, so a folder rename needs { accept_renames: true }
//   POST /api/clients/:id/lead-snap/preview    Preview posts: each prompt 4 times, nothing goes to Lead Snap
//   GET  /clients/:slug/lead-snap/:file        autopost-config.txt, validation.json, previews.json
//   PUT  /api/clients/:id/lead-snap/drive-folder   save the Drive photo folder and read it
//   POST /api/clients/:id/lead-snap/drive-read     read the folder again (no cost, read only)
// Drive (7 Nov 2026): when the client's folder has been read, its counts stand in for the typed ones;
// the typed ones stay saved underneath, as the fallback.
//
// loadInputs(clientId) → { I, trade, answers }: the GBP inputs and the Fillout answers.

const { slugify } = require('../../page-map/slugs');
const { createAutopostStore } = require('./store');
const { buildIntake, groupServices, lockedFrom, labelChanges, carryCounts } = require('./intake');
const { decide, POSTS_ROOT } = require('./decide');
const { runAutopost, filesFor } = require('./generate');
const { estimate, runPreview } = require('./preview');
const { parseFolderId, createDrive } = require('../../drive/client');
const { countsFrom, driveActive } = require('../../drive/photos');
const { createDriveStore } = require('../../drive/store');
const { createDrivePhotos, viewFor } = require('../../drive/service');

const CONTENT_TYPES = { 'autopost-config.txt': 'text/plain; charset=utf-8', 'validation.json': 'application/json; charset=utf-8', 'previews.json': 'application/json; charset=utf-8' };
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

// previewCallModel: the same model, logged under its own name; callModel when not given
// saveClientValue(clientId, key, value), and getDrive for a fixture's fake Drive
function mountLeadSnapApi(app, { pool, loadInputs, callModel, previewCallModel = null, log = console, saveClientValue = null, getDrive = (() => { let d = null; return () => (d = d || createDrive()); })() }) {
  const store = createAutopostStore(pool);
  const driveStore = createDriveStore(pool);
  const drivePhotos = createDrivePhotos({ store: driveStore, getDrive, log });
  const running = new Set();
  const previewing = new Set();
  const wrap = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[lead snap]', err); res.status(err.status || 500).json({ error: err.message }); }
  };
  const cvOf = I => (I.validatorCtx && I.validatorCtx.cv) || {};
  // From the client record itself, so the Drive card works for a client with no page map yet
  const folderFor = async clientId => {
    const { rows } = await pool.query(`SELECT content FROM client_assets WHERE client_id=$1 AND asset_type='client_values' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    if (!rows.length) return '';
    const cv = typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content;
    return String((cv && cv.drive_photo_folder) || '').trim();
  };
  // The hand row with Drive's counts in place of the typed ones, when Drive has been read. A failing
  // read of the table leaves the typed counts working: the error shows on the Drive card.
  const lastRead = async clientId => {
    try { return { read: await driveStore.read(clientId), error: null }; }
    catch (e) { log.error('[lead snap] drive', e); return { read: null, error: e.message }; }
  };
  const intakeFor = async clientId => {
    const { I, trade, answers } = await loadInputs(clientId);
    const [hand, record, last, folder] = await Promise.all([store.hand(clientId), store.latest(clientId), lastRead(clientId), folderFor(clientId)]);
    const locked = lockedFrom(record);
    const groups = locked || groupServices(I.locked || [], cvOf(I).jobs_wanted);
    const active = driveActive(last.read, parseFolderId(folder));
    const used = active ? { ...hand, ...countsFrom(groups, last.read) } : hand;
    return { intake: buildIntake({ I, trade, answers, hand: used, locked }), hand, active, groups };
  };
  const view = async clientId => {
    const { rows } = await pool.query(`SELECT name FROM clients WHERE id=$1`, [clientId]);
    if (!rows.length) throw Object.assign(new Error('Client not found.'), { status: 404 });
    const slug = slugify(rows[0].name);
    const record = await store.latest(clientId);
    const previews = await store.previews(clientId);
    const files = Object.fromEntries(Object.keys(filesFor(record)).map(f => [f, `/clients/${slug}/lead-snap/${f}`]));
    if (previews) files['previews.json'] = `/clients/${slug}/lead-snap/previews.json`;
    let intake = null, hand = {}, plan = null, error = null, groups = null;
    try {
      const got = await intakeFor(clientId);
      ({ intake, hand, groups } = got); plan = decide(intake);
      // A config saved before the path changed still names the old folders
      if (record && record.sheet && /select from folder: GBP Posts \//.test(record.sheet)) intake.warnings.push(`This config still uses the old folder path, GBP Posts. Generate again to change it to ${POSTS_ROOT}.`);
    } catch (e) { if (!e.status) log.error('[lead snap]', e); error = e.message; }
    // The Drive card loads on its own: no page map, or a failed read, leaves the rest of the tab alone
    let drive = null;
    try {
      const last = await lastRead(clientId);
      drive = { ...viewFor({ read: last.read, folderText: await folderFor(clientId), groups }), ...(last.error ? { error: last.error } : {}) };
    } catch (e) { log.error('[lead snap] drive', e); drive = { error: e.message, folder: '', folders: [], drip: { found: false, files: [] }, problems: [], notes: [], total: 0, active: false, configured: false }; }
    // The samples belong to the config they were written from
    const preview = { saved: previews, stale: !!(previews && record && previews.config_at !== record.generated_at), running: previewing.has(clientId), estimate: record && record.output ? estimate(record.output.prompts) : null };
    return { slug, record, files, intake, hand, plan, error, preview, drive, running: running.has(clientId) };
  };

  app.get('/api/clients/:clientId/lead-snap', wrap(async (req, res) => res.json(await view(req.params.clientId))));

  app.put('/api/clients/:clientId/lead-snap/intake', wrap(async (req, res) => {
    const { clientId } = req.params;
    const { intake, hand, active } = await intakeFor(clientId);
    // With Drive read the tab sends no counts: the typed ones stay as they were, as the fallback
    const clean = cleanHand(req.body, intake.groups);
    if (active) { delete clean.counts; delete clean.brand; for (const k of ['counts', 'brand']) if (hand[k] !== undefined) clean[k] = hand[k]; }
    await store.saveHand(clientId, clean);
    res.json(await view(clientId));
  }));

  app.put('/api/clients/:clientId/lead-snap/drive-folder', wrap(async (req, res) => {
    const { clientId } = req.params;
    if (!saveClientValue) throw Object.assign(new Error('Saving the Drive folder is not available on this server.'), { status: 503 });
    const text = String((req.body && req.body.folder) || '').trim();
    if (text && !parseFolderId(text)) throw Object.assign(new Error('That is not a Drive folder link. Open the folder in Drive and copy the address.'), { status: 400 });
    await saveClientValue(clientId, 'drive_photo_folder', text);
    if (text) await drivePhotos.refresh(clientId, text);
    res.json(await view(clientId));
  }));

  app.post('/api/clients/:clientId/lead-snap/drive-read', wrap(async (req, res) => {
    const { clientId } = req.params;
    const text = await folderFor(clientId);
    if (!text) throw Object.assign(new Error('No Drive photo folder is saved for this client.'), { status: 400 });
    await drivePhotos.refresh(clientId, text);
    res.json(await view(clientId));
  }));

  app.post('/api/clients/:clientId/lead-snap/generate', wrap(async (req, res) => {
    const { clientId } = req.params;
    if (running.has(clientId)) throw Object.assign(new Error('A Lead Snap run is already in progress for this client.'), { status: 409 });
    running.add(clientId);
    try {
      const { I, trade, answers } = await loadInputs(clientId);
      const [hand, previous, last] = await Promise.all([store.hand(clientId), store.latest(clientId), lastRead(clientId)]);
      const driveOn = driveActive(last.read, parseFolderId(await folderFor(clientId)));
      const locked = lockedFrom(previous);
      // Pressing this is the one thing that takes up the page map's names
      const fresh = buildIntake({ I, trade, answers, hand });
      const changes = locked ? labelChanges(locked, fresh.groups) : null;
      if (changes && changes.renames.length && !(req.body && req.body.accept_renames === true)) {
        return res.status(409).json({ error: `This would rename ${changes.renames.map(r => `${r.from} to ${r.to}`).join(', ')}. Confirm the rename to go ahead.`, renames: changes.renames });
      }
      const nextHand = locked ? carryCounts(hand, locked, fresh.groups) : hand;
      // Drive's counts for the names this run takes up. A folder not yet renamed in Drive keeps its
      // old folder's count, so the prompts are not lost before the VA gets to rename it.
      let usedHand = nextHand;
      if (driveOn) {
        const carried = locked ? carryCounts({ ...hand, ...countsFrom(locked, last.read) }, locked, fresh.groups).counts : {};
        usedHand = { ...nextHand, ...countsFrom(fresh.groups, last.read, carried) };
      }
      const intake = buildIntake({ I, trade, answers, hand: usedHand });
      if (!intake.ok) throw Object.assign(new Error(`Fill these in first: ${intake.missing.join('; ')}.`), { status: 400 });
      const record = await runAutopost({ intake, callModel, previous, log: m => log.log(m) });
      // A failed run keeps the old config, so the old names and counts stand with it
      if (!record.failure) {
        record.renames = changes ? changes.renames : [];
        if (locked) await store.saveHand(clientId, nextHand);
      }
      await store.save(clientId, record);
      log.log(`[lead snap] ${clientId}: ${record.failure ? 'failed the checks' : `${record.output.prompts.length} prompts`}`);
    } finally { running.delete(clientId); }
    res.json(await view(clientId));
  }));

  app.post('/api/clients/:clientId/lead-snap/preview', wrap(async (req, res) => {
    const { clientId } = req.params;
    if (previewing.has(clientId)) throw Object.assign(new Error('A preview is already running for this client.'), { status: 409 });
    const record = await store.latest(clientId);
    if (!record || !record.output) throw Object.assign(new Error('Generate the config first: a preview tests its prompts.'), { status: 400 });
    previewing.add(clientId);
    try {
      const saved = await runPreview({ record, callModel: previewCallModel || callModel, log: m => log.log(m) });
      // Every call failing says nothing about the prompts: the last good samples stay
      if (saved.summary.failed === saved.summary.samples) {
        const first = saved.prompts.flatMap(p => p.samples).find(s => s.error);
        throw Object.assign(new Error(`The preview could not reach the model, so the last samples are kept. ${first ? first.error : ''}`.trim()), { status: 502 });
      }
      await store.savePreviews(clientId, saved);
      log.log(`[lead snap] ${clientId}: preview of ${saved.summary.samples} samples, ${saved.summary.warned} with warnings`);
    } finally { previewing.delete(clientId); }
    res.json(await view(clientId));
  }));

  app.get('/clients/:slug/lead-snap/:file', wrap(async (req, res) => {
    const { slug, file } = req.params;
    if (!CONTENT_TYPES[file]) throw Object.assign(new Error(`No such file. The files are ${Object.keys(CONTENT_TYPES).join(', ')}.`), { status: 404 });
    const { rows } = await pool.query(`SELECT id, name FROM clients`);
    const client = rows.find(r => slugify(r.name) === slug);
    if (!client) throw Object.assign(new Error('No client with that slug.'), { status: 404 });
    const files = filesFor(await store.latest(client.id));
    const previews = await store.previews(client.id);
    if (previews) files['previews.json'] = JSON.stringify(previews, null, 2);
    if (!(file in files)) throw Object.assign(new Error(file === 'previews.json' ? 'No preview has been run for this client.' : 'No Lead Snap config has been generated for this client.'), { status: 404 });
    res.set('Content-Type', CONTENT_TYPES[file]);
    res.set('Content-Disposition', `inline; filename="${file}"`);
    res.send(files[file]);
  }));

  return { store };
}

module.exports = { mountLeadSnapApi, cleanHand, CONTENT_TYPES };
