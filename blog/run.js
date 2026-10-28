'use strict';

// ── The blog posts job (stage 4) ─────────────────────────────────────────────
// Writes every post in the queue, in the queue's order (the batch order: cost guides, the
// seasonal topics in their window, the local posts, the question and decision posts), one
// post per model call, as the service pages job does (service-run.js). The ideas and
// symptoms of the pages and posts written so far ride along as IDEAS USED ELSEWHERE. A post
// whose gate fails (G-TOPIC, G-SPECIFIC, G-PRIMARY, G-FACTS, G-INPUT) is recorded blocked
// with the gate and the run carries on; a post that fails is recorded with its error; a
// resume writes only the posts with no good record, so a rerun updates a post instead of
// making a second one (the store's type and key are the intent key). The run's state lives
// in one client_assets row (asset_type blog_run).
//
// createBlogRunner({ pool, v20Store, queue, generate, calibrationPack }) where
//   queue          blog/queue-service.js (inputsFor, decide)
//   generate(args) → the record (blog/generate.js generateBlogPost), stubbed in tests
//   calibrationPack(inputs) → { text, name } for the client, or null

const { ideasFromRecords } = require('../ideas');

const ASSET = 'blog_run';
const lc = s => String(s || '').toLowerCase().trim();
const isGood = rec => !!rec && !rec.blocked && !rec.error && rec.VALIDATION && rec.VALIDATION.status === 'run' && rec.VALIDATION.block === 0;

function createBlogRunner({ pool, v20Store, queue, generate, calibrationPack = () => null, log = console.log }) {
  const running = new Map();

  async function loadState(clientId) {
    const { rows } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id=$1 AND asset_type='${ASSET}' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    return rows.length ? { id: rows[0].id, state: typeof rows[0].content === 'string' ? JSON.parse(rows[0].content) : rows[0].content } : null;
  }
  async function saveState(clientId, state) {
    const existing = await loadState(clientId);
    const content = JSON.stringify(state);
    if (existing) await pool.query(`UPDATE client_assets SET content=$1, uploaded_at=NOW() WHERE id=$2`, [content, existing.id]);
    else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, '${ASSET}', 'blog_run.json', $2)`, [clientId, content]);
  }
  const latest = async (clientId, key) => { const f = await v20Store.latest(clientId, { type: 'blog', key }); return f ? f.record : null; };

  // The ideas a post must avoid: the homepage's, its primary page's, and the earlier posts' about the same service or town
  async function ideasFor(clientId, row, written, decisionsPrimary) {
    const prior = [];
    const home = await v20Store.latest(clientId, { type: 'homepage', key: 'homepage' });
    if (home) prior.push({ page: 'homepage', record: home.record });
    const p = decisionsPrimary;
    if (p && p.type && p.type !== 'homepage' && p.url) {
      const f = await v20Store.latest(clientId, { type: p.type, key: p.url });
      if (f) prior.push({ page: `${p.name} page`, record: f.record });
    }
    const info = row.info || {};
    for (const w of written) {
      const same = (info.service && lc(w.service) === lc(info.service)) || (info.town && lc(w.town) === lc(info.town));
      if (same) prior.push({ page: `${w.title} post`, record: w.record });
    }
    return ideasFromRecords(prior);
  }

  // The decisions for one post, with the ideas of what is written; never throws past the gates
  async function prepare(clientId, I, row, rows, written) {
    const first = queue.decide(I, row, rows);
    const primary = first.decisions ? first.decisions.primary : null;
    const ideasUsed = await ideasFor(clientId, row, written, primary);
    const decisionsResult = ideasUsed.length ? queue.decide(I, row, rows, { ideasUsed }) : first;
    return { decisionsResult, ideasUsed };
  }

  async function writePost(clientId, I, row, rows, written, { retries = true, claimsReview = true, qualityReview = false } = {}) {
    const { decisionsResult } = await prepare(clientId, I, row, rows, written);
    const pack = calibrationPack(I) || null;
    try {
      return await generate({ cv: I.ctx.cv, niche: I.niche, keyValueMap: I.ctx.keyValueMap, serviceParentMap: I.ctx.serviceParentMap, decisionsResult, calibrationPack: pack ? pack.text : null, calibrationPackName: pack ? pack.name : null, retries, claimsReview, qualityReview });
    } catch (e) {
      const info = row.info || {};
      return { page: 'blog', error: e.message, post_type: info.post_type, page_slug: row.slug, FLAGS: [{ code: 'E-RUN', msg: e.message, source: 'run' }], VALIDATION: { status: 'not run' }, meta: { page_type: 'blog', page_key: row.slug, post_type: info.post_type, generated_at: new Date().toISOString(), decisions_block: decisionsResult.decisionsBlock || null, failed: true } };
    }
  }

  const entryFor = (row, record) => ({ key: row.slug, title: row.h1 || row.title, service: (row.info || {}).service || '', town: (row.info || {}).town || '', record });

  // The run. opts: { resume (keep the posts with a good record), keys: [slugs], retries, claimsReview, qualityReview }
  async function run(clientId, opts = {}) {
    if (running.has(clientId)) throw Object.assign(new Error('A blog posts run is already in progress for this client.'), { status: 409 });
    running.set(clientId, { startedAt: new Date().toISOString(), current: null });
    try {
      const I = await queue.inputsFor(clientId);
      const rows = (await queue.rowsFor(clientId)).filter(r => r.applies !== false && r.status !== 'Held');
      const order = rows.filter(r => !opts.keys || opts.keys.includes(r.slug));
      if (!order.length) throw Object.assign(new Error('No posts in the blog queue: build it on the Pages tab first.'), { status: 400 });
      const state = { started_at: new Date().toISOString(), finished_at: null, resume: !!opts.resume, posts: order.map(r => ({ key: r.slug, title: r.h1 || r.title, post_type: (r.info || {}).post_type, status: 'pending' })) };
      await saveState(clientId, state);
      const written = [];
      for (const r of rows) { if (order.includes(r)) continue; const rec = await latest(clientId, r.slug); if (rec && !rec.blocked && !rec.error) written.push(entryFor(r, rec)); }
      for (const r of order) {
        const st = state.posts.find(s => s.key === r.slug);
        running.get(clientId).current = r.slug;
        const existing = await latest(clientId, r.slug);
        if (opts.resume && isGood(existing)) {
          st.status = 'kept'; st.block = 0; st.flag = existing.VALIDATION.flag; st.at = existing.meta && existing.meta.generated_at;
          written.push(entryFor(r, existing));
          await saveState(clientId, state);
          continue;
        }
        st.status = 'running';
        await saveState(clientId, state);
        const record = await writePost(clientId, I, r, rows, written, opts);
        const id = await v20Store.insert(clientId, record, { type: 'blog', key: r.slug });
        st.status = record.error ? 'failed' : record.blocked ? 'blocked' : 'done';
        st.error = record.error || (record.blocked ? (record.FLAGS || []).filter(f => f.source === 'gate').map(f => f.msg).join('; ') : null);
        st.block = record.VALIDATION ? record.VALIDATION.block ?? null : null;
        st.flag = record.VALIDATION ? record.VALIDATION.flag ?? null : null;
        st.record_id = id;
        st.at = record.meta && record.meta.generated_at;
        if (!record.blocked && !record.error) written.push(entryFor(r, record));
        log(`[blog] ${st.title} for ${clientId}: ${st.status}${st.block != null ? ` (${st.block} BLOCK, ${st.flag} FLAG)` : ''}${st.error ? `: ${st.error}` : ''}`);
        await saveState(clientId, state);
      }
      state.finished_at = new Date().toISOString();
      await saveState(clientId, state);
      return state;
    } finally {
      running.delete(clientId);
    }
  }

  // The posts in queue order with their latest record's summary and the run state
  async function view(clientId) {
    const st = await loadState(clientId);
    const rows = (await queue.rowsFor(clientId)).filter(r => r.applies !== false && r.status !== 'Held');
    const posts = [];
    for (const r of rows) {
      const f = await v20Store.latest(clientId, { type: 'blog', key: r.slug });
      const rec = f && f.record;
      posts.push({ key: r.slug, title: r.h1 || r.title, post_type: (r.info || {}).post_type, publish_date: (r.info || {}).publish_date || null,
        record: rec ? { id: f.id, at: rec.meta && (rec.meta.edited_at || rec.meta.generated_at), blocked: !!rec.blocked, error: rec.error || null, block: rec.VALIDATION ? rec.VALIDATION.block ?? null : null, flag: rec.VALIDATION ? rec.VALIDATION.flag ?? null : null, claims: rec.CLAIMS && rec.CLAIMS.findings ? rec.CLAIMS.findings.length - ((rec.CLAIMS.accepted || []).length) : null, good: isGood(rec), flags: (rec.FLAGS || []).length } : null });
    }
    return { posts, run: st ? st.state : null, running: running.has(clientId) ? running.get(clientId) : null };
  }

  return { run, view, loadState, prepare, writePost, running, isGood };
}

module.exports = { createBlogRunner, isGood };
