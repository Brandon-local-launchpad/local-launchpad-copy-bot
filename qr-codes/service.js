'use strict';

// ── QR codes: the subtab's storage (14 Nov 2026, Brandon) ────────────────────────────────────
// Two tables (new, nothing else changed):
//   client_qr_codes   one row per client: fields, the values typed on the QR codes subtab (the
//                     review funnel link, the Temporary URL tick, and the overrides of record
//                     values); checks, the last link check of the review funnel and the website;
//                     ticks, the Make in QR.io steps ticked, each with who and when;
//                     uploads, each slot's last uploaded code and what its check found
//   client_qr_files   the uploaded code itself, one per client and slot (the bytes as base64
//                     text: the tests' in-memory Postgres has no working BYTEA)
// view(clientId): the record is read afresh every time, so a field always carries the current
//   record value, except where a person has changed it on the tab.
// check(clientId): a GET of the review funnel and the website (links.js).
// upload(clientId, slot, file): the code is read (decode.js), then its short link is followed
//   (links.js) and judged against the slot (rules.js judge). These two are the only calls out.
// Nothing here writes to Client Values or any other part of the record.

const R = require('./rules');
const L = require('./links');
const D = require('./decode');
const crypto = require('crypto');

const str = v => (v == null ? '' : String(v)).trim();
const bad = (m, status = 400, extra = {}) => Object.assign(new Error(m), { status }, extra);
const parse = v => (v == null ? null : typeof v === 'string' ? JSON.parse(v) : v);

async function ensureQrTables(pool) {
  // Already there: nothing to do (the tests' in-memory Postgres refuses a second CREATE TABLE IF NOT EXISTS)
  try { await pool.query(`SELECT 1 FROM client_qr_codes LIMIT 1`); return; } catch (_) { /* not made yet */ }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_qr_codes (
      client_id  UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      fields     JSONB NOT NULL,
      checks     JSONB,
      ticks      JSONB,
      uploads    JSONB,
      updated_at TIMESTAMPTZ NOT NULL
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_qr_files (
      client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      slot        TEXT NOT NULL,
      name        TEXT NOT NULL,
      kind        TEXT NOT NULL,
      data        TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (client_id, slot)
    )`);
}

// loadValues: clientId → Client Values (unconfirmed form values already blanked)
// nicheLabel: clientId → the client's niche as the onboarding form names it, or ''
// follow:     url → where it lands and what it answers (links.js follow; the tests pass their own)
// decode:     an uploaded file → the text in its code, or null (decode.js)
function createQrCodes({ pool, loadValues, nicheLabel = async () => '', follow = L.follow, decode = D.decode, now = () => new Date(), log = console }) {
  let ready = null;
  const q = async (sql, params) => {
    if (!ready) ready = ensureQrTables(pool).catch(err => { ready = null; throw err; });
    await ready;
    return pool.query(sql, params);
  };

  async function clientOf(clientId) {
    const { rows } = await q(`SELECT id, name FROM clients WHERE id = $1`, [clientId]);
    if (!rows.length) throw bad('Client not found.', 404);
    return rows[0];
  }
  async function rowOf(clientId) {
    const { rows } = await q(`SELECT fields, checks, ticks, uploads FROM client_qr_codes WHERE client_id = $1`, [clientId]);
    return rows.length ? { fields: parse(rows[0].fields) || {}, checks: parse(rows[0].checks) || {}, ticks: parse(rows[0].ticks) || {}, uploads: parse(rows[0].uploads) || {} } : { fields: {}, checks: {}, ticks: {}, uploads: {} };
  }
  async function write(clientId, patch) {
    const next = { ...(await rowOf(clientId)), ...patch };
    const params = [clientId, JSON.stringify(next.fields), JSON.stringify(next.checks), JSON.stringify(next.ticks), JSON.stringify(next.uploads), now().toISOString()];
    const { rows } = await q(`SELECT 1 FROM client_qr_codes WHERE client_id = $1`, [clientId]);
    if (rows.length) await q(`UPDATE client_qr_codes SET fields = $2, checks = $3, ticks = $4, uploads = $5, updated_at = $6 WHERE client_id = $1`, params);
    else await q(`INSERT INTO client_qr_codes (client_id, fields, checks, ticks, uploads, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`, params);
  }

  // What the record gives today. The niche that cannot be read is left blank, never a failure of the tab.
  async function recordOf(client) {
    const cv = (await loadValues(client.id)) || {};
    let label = '';
    try { label = await nicheLabel(client.id); } catch (err) { log.error(`[qr-codes] the niche could not be read (${client.name}):`, err.message); }
    return R.recordValues({ cv, clientName: client.name, nicheLabel: label });
  }

  async function view(clientId) {
    const client = await clientOf(clientId);
    const row = await rowOf(clientId);
    const built = R.build({ record: await recordOf(client), saved: row.fields });
    const prepare = R.prepare({ fields: built.fields, temporary: built.website_temporary, checks: row.checks });
    return { client: { id: client.id, name: client.name }, ...built, prepare, make: R.make({ prepare, ticks: row.ticks }), upload: R.uploads({ prepare, saved: row.uploads }) };
  }

  // set: { key: value } typed on the tab; reset: [key] back to the record's value.
  // A refused value saves nothing, and the error names its field.
  async function save(clientId, { set = {}, reset = [] } = {}) {
    const client = await clientOf(clientId);
    const record = await recordOf(client);
    const fields = { ...(await rowOf(clientId)).fields };
    for (const [key, value] of Object.entries(set && typeof set === 'object' ? set : {})) {
      const c = R.clean(key, value);
      if (!c) throw bad(`"${key}" is not a field on the QR codes tab.`);
      if (c.error) throw bad(c.error, 400, { field: key });
      // Typed back to what the record says: no override, so a later change on the record shows here
      if (R.AUTO.includes(key) && c.value === ((record[key] || {}).value || '')) delete fields[key];
      else if (key === 'website_temporary' && c.value === false) delete fields[key];
      else fields[key] = c.value;
    }
    for (const key of Array.isArray(reset) ? reset : []) if (R.AUTO.includes(str(key))) delete fields[str(key)];
    await write(clientId, { fields });
    return view(clientId);
  }

  // The link checks: a GET of the review funnel and the website, redirects followed. keys: which
  // of them (default both); all: check again a link that already has an answer. A code whose
  // field still has a problem is not fetched.
  async function check(clientId, { keys = R.CHECKED, all = false } = {}) {
    const v = await view(clientId);
    const want = v.prepare.codes.filter(c => R.CHECKED.includes(c.key) && (Array.isArray(keys) ? keys : R.CHECKED).includes(c.key) && c.state !== 'locked' && (all || c.state === 'unchecked'));
    if (!want.length) return v;
    const results = await Promise.all(want.map(async c => {
      let r;
      try { r = await follow(c.destination); } catch (err) { log.error(`[qr-codes] the ${c.name} link check failed (${v.client.name}):`, err.message); r = { status: null, finalUrl: c.destination, error: err.message }; }
      const verdict = R.linkResult(c.key, r);
      return [c.key, { url: c.destination, ok: verdict.ok, message: verdict.message, status: r.status || null, final_url: r.finalUrl || '', at: now().toISOString() }];
    }));
    // Read again before writing: a field saved while the links were being fetched is kept
    await write(clientId, { checks: { ...(await rowOf(clientId)).checks, ...Object.fromEntries(results) } });
    return view(clientId);
  }

  // A link Copybot could not fetch (a bot block, a consent page) that a person has opened and
  // seen working. Only for a failed check, and it lasts only while the link stays the same.
  async function checkedByHand(clientId, { key, by = '' } = {}) {
    const v = await view(clientId);
    const c = v.prepare.codes.find(x => x.key === key && R.CHECKED.includes(x.key));
    if (!c) throw bad('That is not a link Copybot checks.');
    if (c.state !== 'failed') throw bad('Only a link that failed its check can be marked as checked by hand.', 409);
    if (c.key === 'review' && R.isGoogleLink(c.check.final_url)) throw bad('This link forwards straight to Google, so it cannot be passed by hand.', 409);
    await write(clientId, { checks: { ...(await rowOf(clientId)).checks, [key]: { url: c.destination, ok: true, hand: true, by: str(by).slice(0, 120), message: '', status: c.check.status, final_url: c.check.final_url, at: now().toISOString() } } });
    return view(clientId);
  }

  // A Make in QR.io step ticked or unticked, with who and when. A step of a list that is still
  // locked cannot be ticked; a tick can always be taken off.
  async function tick(clientId, { id, ticked, by = '' } = {}) {
    const v = await view(clientId);
    const group = [v.make.folder, ...v.make.codes].find(g => g.steps.some(s => s.id === id));
    if (!group) throw bad('That is not a step on the QR codes tab.');
    const ticks = { ...(await rowOf(clientId)).ticks };
    if (ticked === true) {
      if (!group.unlocked) throw bad(group.message || 'These steps are locked.', 409);
      ticks[id] = { at: now().toISOString(), by: str(by).slice(0, 120) };
    } else delete ticks[id];
    await write(clientId, { ticks });
    return view(clientId);
  }

  // ── Upload and check ──
  const slotOf = (v, slot) => {
    const s = v.upload.slots.find(x => x.key === slot);
    if (!s) throw bad('That is not a QR code slot.');
    if (!s.unlocked) throw bad(s.locked_message || 'This slot is locked.', 409);
    return s;
  };
  async function keepFile(clientId, slot, { name, kind, buffer }) {
    const params = [clientId, slot, name, kind, buffer.toString('base64'), now().toISOString()];
    const { rows } = await q(`SELECT 1 FROM client_qr_files WHERE client_id = $1 AND slot = $2`, [clientId, slot]);
    if (rows.length) await q(`UPDATE client_qr_files SET name = $3, kind = $4, data = $5, uploaded_at = $6 WHERE client_id = $1 AND slot = $2`, params);
    else await q(`INSERT INTO client_qr_files (client_id, slot, name, kind, data, uploaded_at) VALUES ($1, $2, $3, $4, $5, $6)`, params);
  }
  const dropFile = (clientId, slot) => q(`DELETE FROM client_qr_files WHERE client_id = $1 AND slot = $2`, [clientId, slot]);
  // Steps 3 and 4: follow the code's link and judge where it lands against the slot
  async function judged(v, slot, decoded) {
    const first = R.judge({ slot, decoded, prepare: v.prepare });   // text, or a static code: nothing to follow
    if (first.state !== 'failed' || !first.short_url) return first;
    let chain;
    try { chain = await follow(decoded); } catch (err) { log.error(`[qr-codes] a code's link could not be followed (${v.client.name}):`, err.message); chain = { hops: [], finalUrl: decoded, status: null, error: err.message }; }
    return R.judge({ slot, decoded, chain, prepare: v.prepare });
  }
  const saveSlot = async (clientId, slot, record) => write(clientId, { uploads: { ...(await rowOf(clientId)).uploads, [slot]: record } });

  // One uploaded code for one slot: read it, refuse a duplicate, follow its link, judge it. What
  // was found is kept on the slot whatever it was; only a code that could be read keeps its file.
  async function upload(clientId, slot, { buffer, name = '', by = '' } = {}) {
    const v = await view(clientId);
    const s = slotOf(v, slot);
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw bad('No file was sent.');
    if (buffer.length > D.MAX_BYTES) throw bad('That file is over 5 MB. A QR code from QR.io is far smaller: download it again.', 413);
    const kind = D.kindOf(buffer);
    const at = now().toISOString();
    const record = { name: str(name).replace(/[\u0000-\u001f\u007f/\\]+/g, ' ').trim().slice(0, 200) || `${slot}-qr`, kind: kind || '', size: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex'), decoded: '', expected: s.expects, uploaded_at: at, checked_at: at, by: str(by).slice(0, 120), kept: false };
    const fail = message => ({ ...record, state: 'failed', level: 'red', message, short_url: '', final_url: '' });
    const saved = (await rowOf(clientId)).uploads;
    let result;
    const decoded = kind ? await decode(buffer) : null;
    if (!decoded) result = fail(R.UNREADABLE);
    else {
      record.decoded = decoded;
      const dup = R.duplicateOf({ slot, sha256: record.sha256, decoded, saved });
      result = dup ? fail(dup.message) : { ...record, ...(await judged(v, slot, decoded)) };
    }
    if (decoded) { await keepFile(clientId, slot, { name: record.name, kind, buffer }); result.kept = true; }
    else await dropFile(clientId, slot);
    await saveSlot(clientId, slot, result);
    return view(clientId);
  }

  // Steps 3 and 4 again on the code already in the slot, for instance after the destination changed
  async function recheck(clientId, slot) {
    const v = await view(clientId);
    const s = slotOf(v, slot);
    const cur = (await rowOf(clientId)).uploads[slot];
    if (!cur || !s.can_recheck) throw bad('There is no readable code in this slot to check again. Upload it first.', 409);
    const dup = R.duplicateOf({ slot, sha256: cur.sha256, decoded: cur.decoded, saved: (await rowOf(clientId)).uploads });
    const verdict = dup ? { state: 'failed', level: 'red', message: dup.message, short_url: '', final_url: '' } : await judged(v, slot, cur.decoded);
    await saveSlot(clientId, slot, { ...cur, ...verdict, expected: s.expects, checked_at: now().toISOString() });
    return view(clientId);
  }

  // The slot emptied: its result and its file both go
  async function removeUpload(clientId, slot) {
    await clientOf(clientId);
    if (!R.CODES.some(c => c.key === slot)) throw bad('That is not a QR code slot.');
    const uploads = { ...(await rowOf(clientId)).uploads };
    delete uploads[slot];
    await dropFile(clientId, slot);
    await write(clientId, { uploads });
    return view(clientId);
  }

  // The uploaded code as a file: { name, kind, buffer }
  async function file(clientId, slot) {
    await clientOf(clientId);
    const { rows } = await q(`SELECT name, kind, data FROM client_qr_files WHERE client_id = $1 AND slot = $2`, [clientId, str(slot)]);
    if (!rows.length) throw bad('There is no code in this slot.', 404);
    return { name: rows[0].name, kind: rows[0].kind, buffer: Buffer.from(rows[0].data, 'base64') };
  }

  return { view, save, check, checkedByHand, tick, upload, recheck, removeUpload, file };
}

// Behind the login, like every client tab:
//   GET  /api/clients/:id/qr-codes                        the subtab: every field with its notes, and Prepare
//   PUT  /api/clients/:id/qr-codes  { set, reset }        save values typed on the tab; reset puts a line back to the record's value
//   POST /api/clients/:id/qr-codes/check  { keys, all }   fetch the review funnel and the website links
//   POST /api/clients/:id/qr-codes/checked-by-hand { key, by }
//   POST /api/clients/:id/qr-codes/tick { id, ticked, by }   a Make in QR.io step
//   POST   /api/clients/:id/qr-codes/upload/:slot           multipart, field "file" (PNG or SVG), and "by"
//   POST   /api/clients/:id/qr-codes/upload/:slot/recheck   follow and judge the slot's code again
//   DELETE /api/clients/:id/qr-codes/upload/:slot           empty the slot
//   GET    /api/clients/:id/qr-codes/file/:slot             the uploaded code (?download=1 saves it)
function mount(app, svc, { log = console } = {}) {
  const wrap = fn => async (req, res) => {
    try { res.json(await fn(req)); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[qr-codes]', err.message); res.status(err.status || 500).json({ error: err.message, ...(err.field ? { field: err.field } : {}) }); }
  };
  const body = req => (req.body && typeof req.body === 'object' ? req.body : {});
  app.get('/api/clients/:id/qr-codes', wrap(req => svc.view(req.params.id)));
  app.put('/api/clients/:id/qr-codes', wrap(req => svc.save(req.params.id, { set: body(req).set, reset: body(req).reset })));
  app.post('/api/clients/:id/qr-codes/check', wrap(req => svc.check(req.params.id, { keys: body(req).keys, all: body(req).all === true })));
  const multer = require('multer');
  const one = multer({ storage: multer.memoryStorage(), limits: { fileSize: D.MAX_BYTES, files: 1 } }).single('file');
  app.post('/api/clients/:id/qr-codes/upload/:slot', (req, res, next) => one(req, res, err => {
    if (err) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'That file is over 5 MB. A QR code from QR.io is far smaller: download it again.' : 'The file could not be read from the upload.' });
    next();
  }), wrap(req => svc.upload(req.params.id, req.params.slot, { buffer: req.file && req.file.buffer, name: req.file && req.file.originalname, by: body(req).by || '' })));
  app.post('/api/clients/:id/qr-codes/upload/:slot/recheck', wrap(req => svc.recheck(req.params.id, req.params.slot)));
  app.delete('/api/clients/:id/qr-codes/upload/:slot', wrap(req => svc.removeUpload(req.params.id, req.params.slot)));
  // The file is shown as a picture only. An SVG is never opened as a page: no scripts, nothing loaded from elsewhere.
  app.get('/api/clients/:id/qr-codes/file/:slot', async (req, res) => {
    try {
      const f = await svc.file(req.params.id, req.params.slot);
      res.set({ 'Content-Type': f.kind === 'svg' ? 'image/svg+xml' : 'image/png', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox", 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store' });
      if (req.query.download) res.attachment(f.name);
      res.send(f.buffer);
    } catch (err) { if (!err.status || err.status >= 500) log.error('[qr-codes]', err.message); res.status(err.status || 500).json({ error: err.message }); }
  });
  app.post('/api/clients/:id/qr-codes/tick', wrap(req => svc.tick(req.params.id, { id: body(req).id, ticked: body(req).ticked === true, by: body(req).by || '' })));
  app.post('/api/clients/:id/qr-codes/checked-by-hand', wrap(req => svc.checkedByHand(req.params.id, { key: body(req).key, by: body(req).by || '' })));
}

module.exports = { createQrCodes, ensureQrTables, mount };
