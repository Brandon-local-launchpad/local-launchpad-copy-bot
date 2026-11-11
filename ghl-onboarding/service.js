'use strict';

// ── Onboarding answers from GoHighLevel: storage and processing (11 Nov 2026) ──────────────
// Every accepted send is a row in onboarding_events (the audit trail), stored before anything
// else happens. Processing then finds the client (ghl-onboarding/rules.js pickClient), merges
// the answers into the client's onboarding state (client_onboarding), fills the four existing
// Record fields that are still empty, and tells the operator on a domain access request and
// on complete. A send with no client waits as `unmatched`: it is tried again every minute
// (the "started" send arrives before the Fillout form has made the client) and can be
// attached by hand from the Dashboard once it is 24 hours old, or at once when it is the
// `complete` send.
// Nothing here creates a client, sends anything to a client, or stores a password.
//   onboarding_events        id, received_at, stage, client_id, matched_by, status, error, payload
//   client_onboarding        client_id, state (JSON: answers, hand, contact, stage, stages, completed_at)
//   onboarding_step_ticks    client_id, kind, basis: a Tracker step a person ticked Done
//   clients.ghl_contact_id

const R = require('./rules');

const UNMATCHED_AFTER_HOURS = 24;
const str = v => (v == null ? '' : String(v)).trim();
const parse = c => { try { return typeof c === 'string' ? JSON.parse(c) : c; } catch (_) { return null; } };

async function ensureOnboardingTables(pool) {
  await pool.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ghl_contact_id TEXT`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_events (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      stage        TEXT,
      client_id    UUID,
      matched_by   TEXT,
      status       TEXT NOT NULL DEFAULT 'received',
      error        TEXT,
      processed_at TIMESTAMPTZ,
      payload      TEXT NOT NULL
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_onboarding (
      client_id  UUID PRIMARY KEY,
      state      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_step_ticks (
      client_id UUID NOT NULL,
      kind      TEXT NOT NULL,
      basis     TEXT NOT NULL,
      done_by   TEXT,
      done_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (client_id, kind)
    )`);
}

// The Tracker's facts for every client with onboarding answers: Map client_id → { answers, stage, stages, completed_at, ticks }
async function loadOnboardingFacts(pool) {
  const out = new Map();
  const states = await pool.query(`SELECT client_id, state FROM client_onboarding`);
  for (const r of states.rows) { const s = parse(r.state); if (s) out.set(r.client_id, { answers: s.answers || {}, stage: s.stage || '', stages: s.stages || {}, completed_at: s.completed_at || null, ticks: {} }); }
  if (!out.size) return out;
  const ticks = await pool.query(`SELECT client_id, kind, basis, done_by, done_at FROM onboarding_step_ticks`);
  for (const t of ticks.rows) if (out.has(t.client_id)) out.get(t.client_id).ticks[t.kind] = { basis: t.basis, by: t.done_by || '', at: t.done_at };
  return out;
}

// The email to the operator (never to the client): a domain access request to send, or onboarding complete
function operatorEmail({ to, name = '', client, stage, state, link = '' }) {
  const a = state.answers || {};
  const hello = str(name) ? `Hi ${str(name).split(/\s+/)[0]},` : 'Hello,';
  const steps = R.stepsOf({ ...state, ticks: {} }).needs;
  const head = stage === 'complete' ? 'onboarding is complete on GHL' : `the client is waiting for the ${a.domain_provider || 'domain'} access request`;
  const lines = [hello, '', `${client.name}: ${head}.`];
  if (steps.length) lines.push('', 'Waiting on you now:', '', ...steps.map(s => `- ${s.text}${s.why ? ` (${s.why})` : ''}`));
  lines.push('', `Open the client: ${link || `Copybot, Clients, ${client.name}`}`);
  return { to, subject: `${client.name}: ${head}`, text: lines.join('\n') };
}

// deps: pool, notify({ client, stage, state }) or null (the operator's email), now(), log
function createOnboarding({ pool, notify = null, now = () => new Date(), log = console }) {
  const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

  // One at a time: two sends for a client a second apart never read the same saved state
  let chain = Promise.resolve();
  const serial = fn => { const run = chain.then(fn, fn); chain = run.catch(() => {}); return run; };

  async function receive(payload) {
    const p = R.clean(payload);
    const rows = await q(`INSERT INTO onboarding_events (stage, status, payload, received_at) VALUES ($1, 'received', $2, $3) RETURNING id`, [str(p.stage) || null, JSON.stringify(p), now()]);
    return { id: rows[0].id };
  }

  // Every unarchived client with its GHL contact id and the emails on its record
  async function candidates() {
    const clients = await q(`SELECT id, name, ghl_contact_id FROM clients WHERE archived_at IS NULL`);
    const by = new Map(clients.map(c => [c.id, { id: c.id, name: c.name, ghl_contact_id: c.ghl_contact_id || '', emails: [] }]));
    const seen = new Set();
    for (const r of await q(`SELECT client_id, content FROM client_assets WHERE asset_type = 'client_values' ORDER BY uploaded_at DESC`)) {
      if (seen.has(r.client_id) || !by.has(r.client_id)) continue;
      seen.add(r.client_id);
      const cv = parse(r.content) || {};
      if (str(cv.email)) by.get(r.client_id).emails.push(str(cv.email));
    }
    for (const r of await q(`SELECT client_id, value FROM client_fields WHERE field_key = 'business_email' AND status = 'filled'`).catch(() => [])) {
      if (!by.has(r.client_id)) continue;
      let v = r.value; if (typeof v === 'string' && /^"/.test(v)) v = parse(v) ?? v;
      if (str(v)) by.get(r.client_id).emails.push(str(v));
    }
    return [...by.values()];
  }

  const loadState = async clientId => { const r = await q(`SELECT state FROM client_onboarding WHERE client_id = $1`, [clientId]); return r.length ? parse(r[0].state) : null; };
  async function saveState(clientId, state) {
    const text = JSON.stringify(state);
    const r = await q(`UPDATE client_onboarding SET state = $2, updated_at = $3 WHERE client_id = $1 RETURNING client_id`, [clientId, text, now()]);
    if (!r.length) await q(`INSERT INTO client_onboarding (client_id, state, updated_at) VALUES ($1, $2, $3)`, [clientId, text, now()]);
  }
  const loadValues = async clientId => { const r = await q(`SELECT id, content FROM client_assets WHERE client_id = $1 AND asset_type = 'client_values' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]); return r.length ? { id: r[0].id, cv: parse(r[0].content) || {} } : { id: null, cv: {} }; };

  // The send onto the client: the state, the empty Record fields, the contact id, the operator's email
  async function apply(event, clientId, by) {
    const p = parse(event.payload) || {};
    const at = new Date(event.received_at).toISOString();
    const state = R.mergeState(await loadState(clientId), p, at);
    const client = (await q(`SELECT id, name, ghl_contact_id FROM clients WHERE id = $1`, [clientId]))[0];
    if (!client) throw new Error('Client not found.');
    if (str(p.ghl_contact_id) && !str(client.ghl_contact_id)) await q(`UPDATE clients SET ghl_contact_id = $2 WHERE id = $1`, [clientId, str(p.ghl_contact_id)]);
    const { id: cvId, cv } = await loadValues(clientId);
    const m = R.mirror(cv, state, at);
    if (m.filled.length) {
      if (cvId) await q(`UPDATE client_assets SET content = $1, uploaded_at = NOW() WHERE id = $2`, [JSON.stringify(m.cv), cvId]);
      else await q(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'client_values', 'client_values.json', $2)`, [clientId, JSON.stringify(m.cv)]);
    }
    // Told once per client per kind, and marked before sending so a failed send is never sent twice
    const stage = str(p.stage);
    const tell = (stage === 'complete' || stage === 'domain-access-request') && !state.notified[stage];
    if (tell) state.notified[stage] = at;
    await saveState(clientId, state);
    await q(`UPDATE onboarding_events SET status = 'processed', client_id = $2, matched_by = $3, error = NULL, processed_at = $4 WHERE id = $1`, [event.id, clientId, by, now()]);
    if (tell && notify) Promise.resolve().then(() => notify({ client, stage, state })).catch(err => log.error(`[ghl-onboarding] the operator's email for ${client.name} failed: ${err.message}`));
    return { status: 'processed', client_id: clientId, matched_by: by, filled: m.filled };
  }

  async function processNow(eventId, known = null) {
    const event = (await q(`SELECT id, received_at, payload, status FROM onboarding_events WHERE id = $1`, [eventId]))[0];
    if (!event) throw Object.assign(new Error('No such onboarding event.'), { status: 404 });
    if (event.status === 'processed') return { status: 'processed', already: true };
    try {
      const pick = R.pickClient(parse(event.payload) || {}, known || await candidates());
      if (!pick.client_id) {
        await q(`UPDATE onboarding_events SET status = 'unmatched', error = $2 WHERE id = $1`, [eventId, pick.why]);
        return { status: 'unmatched', why: pick.why };
      }
      return await apply(event, pick.client_id, pick.by);
    } catch (err) {
      log.error(`[ghl-onboarding] event ${eventId} failed: ${err.message}`);
      await q(`UPDATE onboarding_events SET status = 'error', error = $2 WHERE id = $1`, [eventId, String(err.message).slice(0, 500)]).catch(() => {});
      return { status: 'error', error: err.message };
    }
  }
  const process = eventId => serial(() => processNow(eventId));

  // Every send still waiting for its client (and any left at `received` by a restart), oldest first
  const rematch = () => serial(async () => {
    const waiting = await q(`SELECT id FROM onboarding_events WHERE status IN ('unmatched', 'received') ORDER BY received_at`);
    let matched = 0;
    for (const e of waiting) { const r = await processNow(e.id, await candidates()); if (r.status === 'processed') matched++; }
    return { waiting: waiting.length, matched };
  });

  // The Dashboard card: unmatched for more than 24 hours, or an unmatched `complete`
  async function unmatched() {
    const rows = await q(`SELECT id, received_at, stage, error, payload FROM onboarding_events WHERE status = 'unmatched' ORDER BY received_at`);
    const cut = now().getTime() - UNMATCHED_AFTER_HOURS * 3600000;
    return rows.filter(r => r.stage === 'complete' || new Date(r.received_at).getTime() < cut).map(r => {
      const p = parse(r.payload) || {};
      return { id: r.id, received_at: r.received_at, stage: r.stage || '', why: r.error || '', summary: str(p.summary), email: str(p.email), company_name: str(p.company_name), name: [p.first_name, p.last_name].map(str).filter(Boolean).join(' ') };
    });
  }

  // A person says which client a send belongs to; the client's other waiting sends then match by its contact id
  const attach = (eventId, clientId) => serial(async () => {
    const event = (await q(`SELECT id, received_at, payload, status FROM onboarding_events WHERE id = $1`, [eventId]))[0];
    if (!event) throw Object.assign(new Error('No such onboarding event.'), { status: 404 });
    if (event.status === 'processed') throw Object.assign(new Error('This send is already on a client.'), { status: 409 });
    if (!(await q(`SELECT id FROM clients WHERE id = $1`, [clientId])).length) throw Object.assign(new Error('Client not found.'), { status: 404 });
    const cid = str((parse(event.payload) || {}).ghl_contact_id);
    const earlier = cid ? await q(`SELECT id, received_at, payload FROM onboarding_events WHERE status = 'unmatched' ORDER BY received_at`) : [];
    let n = 0;
    for (const e of earlier.filter(e => str((parse(e.payload) || {}).ghl_contact_id) === cid && e.id !== event.id)) { await apply(e, clientId, 'attached'); n++; }
    const r = await apply(event, clientId, 'attached');
    return { ...r, also: n };
  });

  async function facts(clientId) {
    const state = await loadState(clientId);
    if (!state) return null;
    const ticks = {};
    for (const t of await q(`SELECT kind, basis, done_by, done_at FROM onboarding_step_ticks WHERE client_id = $1`, [clientId])) ticks[t.kind] = { basis: t.basis, by: t.done_by || '', at: t.done_at };
    return { answers: state.answers || {}, stage: state.stage || '', stages: state.stages || {}, completed_at: state.completed_at || null, ticks, state };
  }

  // What the Record tab shows
  async function view(clientId) {
    const f = await facts(clientId);
    if (!f) return { has: false, answers: R.ANSWERS.map(a => ({ ...a, value: '', source: '' })), stages: [] };
    const { cv } = await loadValues(clientId);
    const src = cv._sources || {};
    return {
      has: true, stage: f.stage, completed_at: f.completed_at, source_label: R.SOURCE_LABEL,
      stages: R.STAGES.filter(s => f.stages[s]).map(s => ({ stage: s, at: f.stages[s] })),
      answers: R.ANSWERS.map(a => ({ ...a, value: str(f.answers[a.key]), source: str(f.answers[a.key]) ? (f.state.hand && f.state.hand[a.key] ? 'hand' : R.SOURCE) : '' })),
      domain_difference: R.domainDifference(cv, f.state),
      primary_category: str(cv.primary_category), primary_category_hand: !!str(cv.primary_category) && (!src.primary_category || src.primary_category === 'hand'),
      steps: R.stepsOf(f),
    };
  }

  const edit = (clientId, key, value) => serial(async () => { await saveState(clientId, R.handEdit(await loadState(clientId), key, value)); return view(clientId); });

  // Done on a Tracker step: kept with the answer it was ticked against, so a changed answer opens the step again
  async function tick(clientId, kind, done, by = '') {
    await q(`DELETE FROM onboarding_step_ticks WHERE client_id = $1 AND kind = $2`, [clientId, kind]);
    if (done) {
      const f = await facts(clientId);
      const step = f && R.stepsOf({ ...f, ticks: {} }).needs.find(s => s.kind === kind);
      if (!step) throw Object.assign(new Error('This step is not open for this client.'), { status: 404 });
      await q(`INSERT INTO onboarding_step_ticks (client_id, kind, basis, done_by, done_at) VALUES ($1, $2, $3, $4, $5)`, [clientId, kind, step.basis, str(by).slice(0, 80) || null, now()]);
    }
    return { kind, done: !!done };
  }

  return { receive, process, rematch, unmatched, attach, view, edit, tick, facts };
}

module.exports = { ensureOnboardingTables, loadOnboardingFacts, createOnboarding, operatorEmail, UNMATCHED_AFTER_HOURS };
