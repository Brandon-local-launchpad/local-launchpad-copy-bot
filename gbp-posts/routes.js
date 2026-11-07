'use strict';

// ── GBP Posts tab routes ─────────────────────────────────────────────────────
//   GET    /api/clients/:id/gbp-posts                       the batches, whether a new one can start, its cost
//   POST   /api/clients/:id/gbp-posts/batches               { size, start } plan a batch and start writing (spends)
//   POST   /api/clients/:id/gbp-posts/batches/:b/continue   write what a stopped run left (spends)
//   PUT    /api/clients/:id/gbp-posts/batches/:b/start      { start } move every date
//   POST   /api/clients/:id/gbp-posts/batches/:b/approve    only with nothing blocking
//   POST   /api/clients/:id/gbp-posts/batches/:b/unapprove  back to draft, for more edits
//   DELETE /api/clients/:id/gbp-posts/batches/:b            a batch not approved
//   PUT    /api/clients/:id/gbp-posts/posts/:p              { body, post_date, drive_file_id } a person's edit
//   POST   /api/clients/:id/gbp-posts/posts/:p/rewrite      write one post again (spends)
//   GET    /api/clients/:id/gbp-posts/photo/:fileId         the photo, for review, through the service account
// Writing runs in the background, a few posts at a time, saved post by post, so a restart loses
// nothing: the batch shows as stopped and Continue writes what is left. Nothing here publishes.

const { createAutopostStore } = require('../leadsnap/autopost/store');
const { createDriveStore } = require('../drive/store');
const { createDrive, parseFolderId } = require('../drive/client');
const { driveActive } = require('../drive/photos');
const { liveDomain } = require('../gbp/profile');
const { createPostStore } = require('./store');
const P = require('./plan');
const { writePost, checkPost, MODEL } = require('./write');
const { USD_TO_GBP, priceFor } = require('../ui/model-log');

const CONCURRENCY = 4;
// Measured on Lead Snap's real samples (6 Nov 2026), plus the earlier openings and a retry on one in five
const OUTPUT_TOKENS_EACH = 460, INPUT_TOKENS_EACH = 1000, RETRY_SHARE = 1.2;
const pence = usd => Math.round(usd * USD_TO_GBP * 1000) / 10;
const [IN_PER_M, OUT_PER_M] = priceFor(MODEL);
const usdFor = (input, output) => (input * IN_PER_M + output * OUT_PER_M) / 1e6;
const estimatePence = size => pence(usdFor(INPUT_TOKENS_EACH * size * RETRY_SHARE, OUTPUT_TOKENS_EACH * size * RETRY_SHARE));

function mountGbpPostsApi(app, { pool, callModel, log = console, getDrive = (() => { let d = null; return () => (d = d || createDrive()); })(), today = () => P.ukDate() }) {
  const store = createPostStore(pool);
  const autopost = createAutopostStore(pool);
  const driveStore = createDriveStore(pool);
  const writing = new Set();    // batch ids being written by this process
  const bad = (m, status = 400) => Object.assign(new Error(m), { status });
  const wrap = fn => async (req, res) => {
    try { await fn(req, res); }
    catch (err) { if (!err.status || err.status >= 500) log.error('[gbp posts]', err); res.status(err.status || 500).json({ error: err.message }); }
  };

  const valuesFor = async clientId => {
    const { rows } = await pool.query(`SELECT content FROM client_assets WHERE client_id=$1 AND asset_type='client_values' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    if (!rows.length) return {};
    return (typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content) || {};
  };
  // The config's intake, with what the record confirms today
  const intakeFor = async (clientId, batch) => ({ ...batch.config.intake, practices: (await valuesFor(clientId)).confirmed_practices || [] });
  const folderFor = async clientId => String((await valuesFor(clientId)).drive_photo_folder || '').trim();
  // The photos Drive last showed for this client's current folder, or null when it has not been read
  const photosFor = async clientId => {
    const read = await driveStore.read(clientId);
    return driveActive(read, parseFolderId(await folderFor(clientId))) ? read.files : null;
  };

  async function view(clientId) {
    const { rows } = await pool.query(`SELECT id FROM clients WHERE id=$1`, [clientId]);
    if (!rows.length) throw bad('Client not found.', 404);
    const record = await autopost.latest(clientId);
    const photos = await photosFor(clientId);
    const needs = [];
    if (!record || !record.sheet) needs.push('Generate the config on the Lead Snap tab: posts are written from its prompts.');
    if (!photos) needs.push('Save and read the Drive photo folder on the Lead Snap tab: every post needs a photo from it.');
    const batches = await store.batches(clientId);
    const fileIds = photos ? new Set(photos.map(f => f.file_id)) : null;
    const list = [];
    for (const b of batches) {
      const posts = await store.posts(b.id);
      const running = writing.has(b.id);
      const done = posts.filter(p => p.status === 'written').length;
      list.push({ id: b.id, size: b.size, status: b.status, start_date: b.start_date, created_at: b.created_at, approved_at: b.approved_at, approved_by: b.approved_by, notes: b.notes, running, stopped: b.status === 'writing' && !running, done, pence: pence(usdFor(b.input_tokens, b.output_tokens)), blockers: b.status === 'writing' ? [] : P.blockers(posts, { today: today(), fileIds }), posts });
    }
    const usable = (photos || []).filter(f => f.kind === 'post' && !f.problem);
    return {
      needs, ok: !needs.length, today: today(), sizes: P.SIZES.map(size => ({ size, pence: estimatePence(size), weeks: size / 2 })), offer_days: P.OFFER_DAYS,
      offer: record && record.intake ? record.intake.offer || '' : '', cta: record && record.intake && record.intake.cta ? record.intake.cta.line : '', too_few: record && record.output ? record.output.tooFew || null : null,
      photos: usable.map(f => ({ file_id: f.file_id, name: f.name, label: f.label })),
      default_start: record && record.sheet ? P.firstDay(clientId, await store.history(clientId), today()) : null,
      days: P.dayPair(clientId), batches: list,
    };
  }

  // Write what is not written, a few at a time. Each wave sees every opening so far, including the last wave's.
  async function runBatch(clientId, batchId) {
    if (writing.has(batchId)) return;
    writing.add(batchId);
    try {
      const batch = await store.batch(clientId, batchId);
      const intake = await intakeFor(clientId, batch);
      const promptOf = n => batch.config.output.prompts.find(p => p.n === n);
      const history = await store.history(clientId);
      const openings = history.map(h => h.opening).filter(Boolean);
      const todo = (await store.posts(batchId)).filter(p => p.status !== 'written');
      for (let i = 0; i < todo.length; i += CONCURRENCY) {
        const earlier = [...openings];
        await Promise.all(todo.slice(i, i + CONCURRENCY).map(async post => {
          try {
            const r = await writePost({ prompt: promptOf(post.prompt_n), intake, earlierOpenings: earlier, callModel });
            await store.saveWritten(post.id, r);
            await store.addUsage(batchId, r.usage);
            if (r.opening) openings.push(r.opening);
          } catch (e) {
            log.error(`[gbp posts] post ${post.seq}: ${e.message}`);
            await store.saveFailed(post.id, e.message);
          }
        }));
      }
      const after = await store.posts(batchId);
      await store.setStatus(batchId, after.every(p => p.status === 'written') ? 'draft' : 'writing');
      log.log(`[gbp posts] ${clientId}: ${after.filter(p => p.status === 'written').length} of ${after.length} written`);
    } catch (e) { log.error('[gbp posts]', e); }
    finally { writing.delete(batchId); }
  }

  const draftBatch = async (clientId, batchId) => {
    const b = await store.batch(clientId, batchId);
    if (!b) throw bad('No such batch.', 404);
    return b;
  };
  const editablePost = async (clientId, postId) => {
    const post = await store.post(clientId, postId);
    if (!post) throw bad('No such post.', 404);
    const batch = await store.batch(clientId, post.batch_id);
    if (batch.status === 'approved') throw bad('This batch is approved. Take the approval back to change it.', 409);
    if (writing.has(batch.id)) throw bad('This batch is still being written.', 409);
    return { post, batch };
  };
  const earlierThan = async (clientId, post) => (await store.history(clientId)).filter(h => !(h.post_date === post.post_date && h.seq === post.seq)).map(h => h.opening).filter(Boolean);

  app.get('/api/clients/:clientId/gbp-posts', wrap(async (req, res) => res.json(await view(req.params.clientId))));

  app.post('/api/clients/:clientId/gbp-posts/batches', wrap(async (req, res) => {
    const { clientId } = req.params;
    if ((await store.batches(clientId)).some(b => writing.has(b.id))) throw bad('A batch is already being written for this client.', 409);
    const record = await autopost.latest(clientId);
    const photos = await photosFor(clientId);
    if (!photos) throw bad('Save and read the Drive photo folder on the Lead Snap tab first.');
    const plan = P.planBatch({ size: Number(req.body && req.body.size), record, photos, history: await store.history(clientId), clientId, start: (req.body && req.body.start) || null, today: today(), site: liveDomain(await valuesFor(clientId)) });
    const config = { generated_at: record.generated_at, intake: record.intake, output: { prompts: record.output.prompts } };
    const id = await store.createBatch(clientId, { size: plan.posts.length, start: plan.start, config, notes: plan.notes, posts: plan.posts });
    runBatch(clientId, id);
    res.status(202).json(await view(clientId));
  }));

  app.post('/api/clients/:clientId/gbp-posts/batches/:batchId/continue', wrap(async (req, res) => {
    const { clientId, batchId } = req.params;
    const b = await draftBatch(clientId, batchId);
    if (b.status !== 'writing') throw bad('This batch has nothing left to write.', 409);
    runBatch(clientId, batchId);
    res.status(202).json(await view(clientId));
  }));

  app.put('/api/clients/:clientId/gbp-posts/batches/:batchId/start', wrap(async (req, res) => {
    const { clientId, batchId } = req.params;
    const b = await draftBatch(clientId, batchId);
    if (b.status === 'approved') throw bad('This batch is approved. Take the approval back to change it.', 409);
    const start = String((req.body && req.body.start) || '');
    if (!P.isDate(start)) throw bad('The start date must be a date.');
    if (start < today()) throw bad('The start date is in the past.');
    const posts = await store.posts(batchId);
    const updates = P.redate(posts, clientId, start);
    for (const u of updates) await store.setPostDate(u.id, u);
    await store.setStart(batchId, updates[0].post_date);
    res.json(await view(clientId));
  }));

  app.post('/api/clients/:clientId/gbp-posts/batches/:batchId/approve', wrap(async (req, res) => {
    const { clientId, batchId } = req.params;
    const b = await draftBatch(clientId, batchId);
    if (b.status !== 'draft') throw bad(b.status === 'approved' ? 'This batch is already approved.' : 'This batch is still being written.', 409);
    const photos = await photosFor(clientId);
    const stops = P.blockers(await store.posts(batchId), { today: today(), fileIds: photos ? new Set(photos.map(f => f.file_id)) : null });
    if (!photos) stops.push('Drive has not been read for this client\'s folder, so the photos cannot be checked.');
    if (stops.length) return res.status(409).json({ error: `Fix these first: ${stops.join(' ')}`, blockers: stops });
    await store.approve(batchId, String((req.body && req.body.by) || '').slice(0, 80));
    log.log(`[gbp posts] ${clientId}: batch ${batchId} approved`);
    res.json(await view(clientId));
  }));

  app.post('/api/clients/:clientId/gbp-posts/batches/:batchId/unapprove', wrap(async (req, res) => {
    const { clientId, batchId } = req.params;
    await draftBatch(clientId, batchId);
    await store.unapprove(batchId);
    res.json(await view(clientId));
  }));

  app.delete('/api/clients/:clientId/gbp-posts/batches/:batchId', wrap(async (req, res) => {
    const { clientId, batchId } = req.params;
    const b = await draftBatch(clientId, batchId);
    if (b.status === 'approved') throw bad('Take the approval back before deleting a batch.', 409);
    if (writing.has(batchId)) throw bad('This batch is still being written.', 409);
    await store.deleteBatch(batchId);
    res.json(await view(clientId));
  }));

  app.put('/api/clients/:clientId/gbp-posts/posts/:postId', wrap(async (req, res) => {
    const { clientId, postId } = req.params;
    const { post, batch } = await editablePost(clientId, postId);
    const f = req.body || {};
    const body = f.body === undefined ? post.body : String(f.body).trim();
    if (!body) throw bad('A post cannot be empty.');
    const date = f.post_date === undefined ? post.post_date : String(f.post_date);
    if (!P.isDate(date)) throw bad('The date must be a date.');
    if (date !== post.post_date && date < today()) throw bad('That date has passed.');
    let fileId = post.drive_file_id, name = post.photo_name;
    if (f.drive_file_id !== undefined && f.drive_file_id !== post.drive_file_id) {
      const photos = await photosFor(clientId);
      const photo = (photos || []).find(p => p.file_id === f.drive_file_id);
      if (!photo) throw bad('That photo is not in this client\'s Drive folders.');
      if (photo.problem) throw bad(`That photo can't be used: ${photo.problem}.`);
      fileId = photo.file_id; name = photo.name;
    }
    const prompt = batch.config.output.prompts.find(p => p.n === post.prompt_n) || {};
    const r = checkPost(body, prompt, await intakeFor(clientId, batch), await earlierThan(clientId, post));
    await store.editPost(postId, { ...r, body, edited: post.edited || body !== post.body, drive_file_id: fileId, photo_name: name, post_date: date, offer_start: post.topic === 'OFFER' ? date : '', offer_end: post.topic === 'OFFER' ? P.addDays(date, P.OFFER_DAYS) : '' });
    res.json(await view(clientId));
  }));

  app.post('/api/clients/:clientId/gbp-posts/posts/:postId/rewrite', wrap(async (req, res) => {
    const { clientId, postId } = req.params;
    const { post, batch } = await editablePost(clientId, postId);
    const prompt = batch.config.output.prompts.find(p => p.n === post.prompt_n);
    if (!prompt) throw bad('This post\'s prompt is no longer in its batch.');
    const r = await writePost({ prompt, intake: await intakeFor(clientId, batch), earlierOpenings: await earlierThan(clientId, post), callModel });
    await store.saveWritten(postId, r);
    await store.addUsage(batch.id, r.usage);
    res.json(await view(clientId));
  }));

  // Only a photo this client's folder holds, so this route can never read anything else in Drive
  app.get('/api/clients/:clientId/gbp-posts/photo/:fileId', wrap(async (req, res) => {
    const { clientId, fileId } = req.params;
    const read = await driveStore.read(clientId);
    const photo = read && read.files.find(f => f.file_id === fileId);
    if (!photo) throw bad('That photo is not in this client\'s Drive folders.', 404);
    const got = await getDrive().download(fileId);
    res.set('Content-Type', photo.mime_type || 'image/jpeg');
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(got);
  }));

  return { store, runBatch, writing };
}

module.exports = { mountGbpPostsApi, estimatePence };
