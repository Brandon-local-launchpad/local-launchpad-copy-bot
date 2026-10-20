'use strict';

// ── Trade facts: the verified flag and the service page gate ─────────────────
// The flag lives in the database, not the pack file: a row per niche holding who
// verified it, when, and the fingerprint of the pack text at that moment. A pack is
// verified only while its current fingerprint matches, so a re-run of the script
// (new text, new fingerprint) makes it unverified again without touching the row.
//
// serviceGate(nicheOrTrade) is the check Copybot runs before writing a service page:
// ok when the niche's pack exists and is verified, else a message naming the pack.

const P = require('./pack');

async function ensureTradeFactsTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trade_facts_verifications (
      niche        TEXT PRIMARY KEY,
      fingerprint  TEXT NOT NULL,
      generated    TEXT,
      model        TEXT,
      verified_by  TEXT NOT NULL,
      verified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function createTradeFactsService({ pool }) {
  async function rowFor(niche) {
    if (!pool) return null;
    const { rows } = await pool.query(`SELECT niche, fingerprint, generated, model, verified_by, verified_at FROM trade_facts_verifications WHERE niche = $1`, [niche]);
    return rows[0] || null;
  }

  // One pack's state: the file (header, fingerprint) and the flag against it
  async function status(niche) {
    const pack = P.readPack(niche);
    const row = await rowFor(niche);
    const verified = !!(pack.exists && row && row.fingerprint === pack.fingerprint);
    return {
      niche, file: pack.file, hasBlock: P.hasBlock(niche), exists: pack.exists,
      generated: pack.header ? pack.header.generated : null,
      model: pack.header ? pack.header.model : null,
      headerOk: !!pack.header,
      verified,
      // a verification that the file has moved on from (re-run after verifying)
      stale: !!(row && pack.exists && row.fingerprint !== pack.fingerprint),
      verifiedBy: verified ? row.verified_by : null,
      verifiedAt: verified ? row.verified_at : null,
      lastVerifiedBy: row ? row.verified_by : null,
      lastVerifiedAt: row ? row.verified_at : null,
      lastVerifiedGenerated: row ? row.generated : null,
    };
  }

  async function list() {
    const out = [];
    for (const niche of P.listNiches()) out.push(await status(niche));
    return out;
  }

  // Sets the flag on the pack as it is now. who is required.
  async function verify(niche, who) {
    const name = String(who || '').trim();
    if (!name) throw Object.assign(new Error('Say who is verifying the pack.'), { status: 400 });
    if (!pool) throw Object.assign(new Error('Database not configured.'), { status: 503 });
    const pack = P.readPack(niche);
    if (!pack.exists) throw Object.assign(new Error(`There is no pack to verify: ${pack.file} is missing.`), { status: 404 });
    const generated = pack.header ? pack.header.generated : null;
    const model = pack.header ? pack.header.model : null;
    const { rows } = await pool.query(`SELECT niche FROM trade_facts_verifications WHERE niche = $1`, [niche]);
    if (rows.length) {
      await pool.query(`UPDATE trade_facts_verifications SET fingerprint = $2, generated = $3, model = $4, verified_by = $5, verified_at = NOW() WHERE niche = $1`, [niche, pack.fingerprint, generated, model, name]);
    } else {
      await pool.query(`INSERT INTO trade_facts_verifications (niche, fingerprint, generated, model, verified_by) VALUES ($1, $2, $3, $4, $5)`, [niche, pack.fingerprint, generated, model, name]);
    }
    return status(niche);
  }

  // Clears the flag (the Trade facts page's "Unverify")
  async function unverify(niche) {
    if (!pool) throw Object.assign(new Error('Database not configured.'), { status: 503 });
    await pool.query(`DELETE FROM trade_facts_verifications WHERE niche = $1`, [niche]);
    return status(niche);
  }

  // { ok: true, niche, file } or { ok: false, niche, file, reason, message }
  async function serviceGate(nicheOrTrade) {
    const niche = P.packNameFor(nicheOrTrade);
    const label = String(nicheOrTrade || '').trim() || '(no niche)';
    if (!niche) {
      return { ok: false, niche: null, file: null, reason: 'no-niche', message: `Service pages are blocked: the client has no niche, so there is no trade facts pack to check. Set the client's niche first.` };
    }
    const s = await status(niche);
    if (!s.exists) {
      return { ok: false, niche, file: s.file, reason: 'missing', message: `Service pages are blocked: the trade facts pack for "${label}" is missing (${s.file}). Generate it with node scripts/trade-facts.js${s.hasBlock ? '' : ` (it needs a block at trade-facts/blocks/${niche}.md)`}, then verify it on the Trade facts page.` };
    }
    if (!s.verified) {
      const when = s.generated ? ` (generated ${s.generated})` : '';
      const why = s.stale ? `was generated again${when} after it was verified` : `has not been verified${when}`;
      return { ok: false, niche, file: s.file, reason: s.stale ? 'stale' : 'unverified', message: `Service pages are blocked: the trade facts pack ${s.file} ${why}. Verify it on the Trade facts page.` };
    }
    return { ok: true, niche, file: s.file };
  }

  return { status, list, verify, unverify, serviceGate };
}

module.exports = { ensureTradeFactsTables, createTradeFactsService };
