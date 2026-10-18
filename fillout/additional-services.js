'use strict';

// ── Additional services: ticks and the free-text "any other services" answer ─
// The niche's additional-services tick groups (e.g. "Window Cleaning Additional
// Services") and the typed answer, as individual services
// (fillout/services/resolver.js additionalInputs), deduped against the services
// already in the category lists ("already covered"), and each new one given a proposed
// parent category by the model (prompts/Additional_Service_Parent.md), from the
// client's existing category tabs only. A person confirms, changes or skips each
// row on the record page. Hash-gated like price extraction: the model runs only
// when the answer text changes or on request; confirmed and manual rows are never
// overwritten by a re-run; confirmed rows become "additional" rows in the resolver.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { extractJsonObject } = require('../json-extract');
const R = require('./services/resolver');

const PROMPT_PATH = path.join(__dirname, '..', 'prompts', 'Additional_Service_Parent.md');
const STATUSES = ['proposed', 'confirmed', 'rejected', 'skipped', 'covered', 'extraction_failed'];

async function ensureAdditionalTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_additional_services (
      id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id              UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service                TEXT NOT NULL,
      service_id             TEXT NOT NULL,
      proposed_category_key  TEXT,
      reason                 TEXT,
      status                 TEXT NOT NULL DEFAULT 'proposed',
      confirmed_category_key TEXT,
      source                 TEXT NOT NULL DEFAULT 'model',
      text_hash              TEXT,
      sort_order             INTEGER NOT NULL DEFAULT 0,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS client_additional_state (
      client_id    UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
      status       TEXT NOT NULL DEFAULT 'pending',
      text_hash    TEXT,
      error        TEXT,
      model        TEXT,
      proposed_at  TIMESTAMPTZ,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS primary_category_key TEXT;
  `);
}

const hashText = t => crypto.createHash('sha256').update(String(t || '').trim()).digest('hex');

function buildPrompt(services, tabs) {
  const system = fs.readFileSync(PROMPT_PATH, 'utf8');
  const message = `CLIENT'S CATEGORIES (key: name):\n${tabs.map(t => `${t.key}: ${t.name}`).join('\n')}\n\nSERVICES TO PLACE:\n${services.map(s => `- ${s}`).join('\n')}\n\nReturn the JSON object now.`;
  return { system, message };
}

// The reply, checked: one object per service, keys from the tabs or "unsure", a reason
function parseReply(text, services, tabs) {
  const obj = extractJsonObject(text);
  if (!obj || !Array.isArray(obj.services)) throw new Error('reply has no "services" array');
  const keys = new Set(tabs.map(t => t.key));
  const byService = new Map(obj.services.filter(x => x && typeof x === 'object').map(x => [R.norm(x.service), x]));
  return services.map(s => {
    const x = byService.get(R.norm(s));
    if (!x) throw new Error(`reply has no answer for "${s}"`);
    const key = x.category_key == null ? 'unsure' : String(x.category_key).trim();
    if (key !== 'unsure' && !keys.has(key)) throw new Error(`reply names a category that is not one of the client's tabs: ${key}`);
    const reason = String(x.reason || '').trim();
    if (!reason) throw new Error(`reply gives no reason for "${s}"`);
    if (/\b(category_key|service_id|proposed_category_key)\b/.test(reason)) throw new Error(`reason for "${s}" contains a field name`);
    return { service: s, categoryKey: key === 'unsure' ? null : key, reason };
  });
}

function createAdditionalServices({ pool, callModel = null, modelName = null, log = console }) {
  async function state(clientId) {
    const { rows } = await pool.query(`SELECT * FROM client_additional_state WHERE client_id = $1`, [clientId]);
    return rows[0] || null;
  }
  async function saveState(clientId, patch) {
    const cur = await state(clientId);
    const next = { status: 'pending', text_hash: null, error: null, model: null, proposed_at: null, ...(cur || {}), ...patch };
    if (cur) await pool.query(`UPDATE client_additional_state SET status=$2, text_hash=$3, error=$4, model=$5, proposed_at=$6, updated_at=NOW() WHERE client_id=$1`, [clientId, next.status, next.text_hash, next.error, next.model, next.proposed_at]);
    else await pool.query(`INSERT INTO client_additional_state (client_id, status, text_hash, error, model, proposed_at) VALUES ($1,$2,$3,$4,$5,$6)`, [clientId, next.status, next.text_hash, next.error, next.model, next.proposed_at]);
    return next;
  }
  async function rows(clientId) {
    const { rows } = await pool.query(`SELECT * FROM client_additional_services WHERE client_id = $1 ORDER BY sort_order, created_at`, [clientId]);
    return rows;
  }

  // text: the free-text answer; ticks: values ticked in the niche's additional-services tick
  // groups; tabs: the client's resolved category tabs [{key, name}]; config: the niche config.
  // Hash-gated on both; with no ticks the hash is the text's alone (as before ticks were read).
  async function propose(clientId, { text, ticks = [], tabs, config, force = false }) {
    const tickIds = [...new Set((ticks || []).map(R.norm).filter(Boolean))].sort();
    const hasText = !!String(text || '').trim();
    const hash = !hasText && !tickIds.length ? null : tickIds.length ? hashText(`${String(text || '')}
#ticked:${tickIds.join('|')}`) : hashText(text);
    const cur = await state(clientId);
    if (!hash) { await saveState(clientId, { status: 'no_text', text_hash: null }); return { skipped: 'no ticks or text' }; }
    if (!force && cur && cur.status === 'done' && cur.text_hash === hash) return { skipped: 'unchanged' };
    const parsed = R.additionalInputs(ticks, text, config);
    const existing = await rows(clientId);
    const keep = new Map(existing.filter(r => r.source === 'manual' || ['confirmed', 'rejected', 'skipped'].includes(r.status)).map(r => [r.service_id, r]));
    // Rows a person has handled stay; model rows for the current text are rebuilt
    await pool.query(`DELETE FROM client_additional_services WHERE client_id = $1 AND source = 'model' AND status IN ('proposed', 'covered', 'extraction_failed')`, [clientId]);
    const toAsk = parsed.filter(p => !p.alreadyCovered && !keep.has(p.id));
    let proposals = new Map();
    let failed = null;
    if (toAsk.length) {
      try {
        if (!callModel) throw new Error('No model available: ANTHROPIC_API_KEY is not set');
        if (!tabs.length) throw new Error('The client has no category tabs yet, so there is nothing to place services under');
        const { system, message } = buildPrompt(toAsk.map(p => p.service), tabs);
        const reply = await callModel({ system, message, maxTokens: 2048, effort: 'low' });
        for (const p of parseReply(reply.text, toAsk.map(p => p.service), tabs)) proposals.set(R.norm(p.service), p);
      } catch (err) {
        failed = err.message;
        log.error(`[fillout] additional-services proposal failed for ${clientId}:`, err.message);
      }
    }
    let i = 0;
    for (const p of parsed) {
      if (keep.has(p.id)) { await pool.query(`UPDATE client_additional_services SET sort_order = $3, text_hash = $4 WHERE client_id = $1 AND service_id = $2`, [clientId, p.id, i++, hash]); continue; }
      const prop = proposals.get(p.id);
      const status = p.alreadyCovered ? 'covered' : failed ? 'extraction_failed' : 'proposed';
      await pool.query(`INSERT INTO client_additional_services (client_id, service, service_id, proposed_category_key, reason, status, source, text_hash, sort_order) VALUES ($1,$2,$3,$4,$5,$6,'model',$7,$8)`,
        [clientId, p.service, p.id, prop ? prop.categoryKey : null, prop ? prop.reason : (p.alreadyCovered ? 'Already a service in the category lists' : failed), status, hash, i++]);
    }
    await saveState(clientId, { status: failed ? 'extraction_failed' : 'done', text_hash: hash, error: failed, model: failed ? null : modelName, proposed_at: failed ? null : new Date() });
    return failed ? { error: failed, rows: parsed.length } : { rows: parsed.length, asked: toAsk.length, covered: parsed.filter(p => p.alreadyCovered).length };
  }

  // A person's decision: confirm (optionally with a different category), reject, or skip. Never overwritten by a re-run.
  async function decide(clientId, rowId, { status, categoryKey = null, tabs = [] }) {
    if (!['confirmed', 'rejected', 'skipped', 'proposed'].includes(status)) throw Object.assign(new Error(`status must be confirmed, rejected, skipped or proposed`), { status: 400 });
    if (status === 'confirmed') {
      if (!categoryKey) throw Object.assign(new Error('confirming needs a category'), { status: 400 });
      if (tabs.length && !tabs.some(t => t.key === categoryKey)) throw Object.assign(new Error(`not one of the client's category tabs: ${categoryKey}`), { status: 400 });
    }
    const { rows } = await pool.query(
      `UPDATE client_additional_services SET status = $3, confirmed_category_key = $4, source = 'manual', updated_at = NOW() WHERE id = $1 AND client_id = $2 RETURNING *`,
      [rowId, clientId, status, status === 'confirmed' ? categoryKey : null]);
    if (!rows.length) throw Object.assign(new Error('Additional service not found'), { status: 404 });
    return rows[0];
  }

  async function view(clientId) {
    const [st, rs] = await Promise.all([state(clientId), rows(clientId)]);
    return {
      state: st ? { status: st.status, error: st.error, model: st.model, proposedAt: st.proposed_at } : { status: 'pending', error: null },
      rows: rs.map(r => ({ id: r.id, service: r.service, proposedCategoryKey: r.proposed_category_key, reason: r.reason, status: r.status, confirmedCategoryKey: r.confirmed_category_key, source: r.source })),
      confirmed: rs.filter(r => r.status === 'confirmed' && r.confirmed_category_key).map(r => ({ service: r.service, categoryKey: r.confirmed_category_key })),
    };
  }

  return { propose, decide, view, state, rows, hashText };
}

module.exports = { ensureAdditionalTables, createAdditionalServices, buildPrompt, parseReply, hashText, PROMPT_PATH, STATUSES };
