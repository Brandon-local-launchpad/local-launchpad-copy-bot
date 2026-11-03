'use strict';
// Fixture: the trade facts gate stays in production (3 Nov 2026). A service page on an
// unverified pack is refused by trade-facts/store.js serviceGate, by the service decisions
// (G-FACTS) and by the service runner; the only bypass is the local tools' --trust-pack flag
// (tools/niche-thin-run.js, tools/service-run.js, tools/category-run.js), which the server,
// the runner, the generator and the decisions never read.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { ensureTradeFactsTables, createTradeFactsService } = require(path.join(root, 'trade-facts/store.js'));
const P = require(path.join(root, 'trade-facts/pack.js'));
const { computeServiceDecisions } = require(path.join(root, 'service-decisions.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const { rows } = require(path.join(__dirname, 'data/edens-edge-v3-page-map.json'));
const { contextFromPageMap } = require(path.join(root, 'v20-context-v3.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: the trade facts gate stays in production ===\n');

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const pool = new (mem.adapters.createPg().Pool)();
  await ensureTradeFactsTables(pool);
  const svc = createTradeFactsService({ pool });

  // The real packs, with no verification row: every gate refuses
  const packs = fs.readdirSync(path.join(root, 'trade-facts')).filter(f => f.endsWith('.md') && !['README.md', 'core.md'].includes(f)).map(f => f.replace(/\.md$/, ''));
  const gates = await Promise.all(packs.map(async n => ({ n, g: await svc.serviceGate(n) })));
  chk(`serviceGate refuses every unverified pack (${packs.length} packs on disk, no verification rows)`, gates.every(x => x.g.ok === false && x.g.reason === 'unverified' && /not been verified/.test(x.g.message)), JSON.stringify(gates.filter(x => x.g.ok || x.g.reason !== 'unverified').map(x => [x.n, x.g.reason])), 'all refused as unverified');
  chk('serviceGate refuses a niche with no pack as missing, and a blank niche as no-niche', (await svc.serviceGate('no-such-niche')).reason === 'missing' && (await svc.serviceGate('')).reason === 'no-niche', '', 'missing / no-niche');

  // Verified, then the pack changes: stale, refused again
  const pack = P.readPack('landscaper');
  await svc.verify('landscaper', 'Ray');
  chk('a verified pack passes the gate', (await svc.serviceGate('landscaper')).ok === true, JSON.stringify(await svc.serviceGate('landscaper')), 'ok');
  await pool.query(`UPDATE trade_facts_verifications SET fingerprint = 'old' WHERE niche = 'landscaper'`);
  chk('a pack generated again after its verification is stale and refused', (await svc.serviceGate('landscaper')).reason === 'stale', (await svc.serviceGate('landscaper')).reason, 'stale');
  chk('the gate answers by the pack fingerprint, which the file on disk carries', !!pack.fingerprint, '', 'fingerprint');

  // The service decisions refuse an unverified pack whatever the caller passes
  const cv = { ...E.ethanValues(), jobs_wanted: [], h1_override: 'Landscaper Southampton', coastal_city: 'yes', insurance_cover: '5m' };
  const niche = { ...landscaper, service_words: [] };
  const ctx = contextFromPageMap({ rows, hand: { baseTown: 'Southampton', otherTowns: 'Romsey' }, cv, niche });
  const page = rows.find(r => r.slug === '/services/lawn-mowing');
  const un = computeServiceDecisions({ cv, niche, keyValueMap: ctx.keyValueMap, rows, page, tradeFacts: { niche: 'landscaper', file: 'trade-facts/landscaper.md', verified: false, message: 'Service pages are blocked: not verified.' } });
  const none = computeServiceDecisions({ cv, niche, keyValueMap: ctx.keyValueMap, rows, page, tradeFacts: null });
  chk('computeServiceDecisions gates G-FACTS on an unverified pack and on no pack', un.gates.some(g => g.code === 'G-FACTS' && /not verified/.test(g.msg)) && none.gates.some(g => g.code === 'G-FACTS'), JSON.stringify([un.gates, none.gates]), 'G-FACTS both');

  // The bypass is a local tools flag only: nothing in production reads it
  const prod = ['server.js', 'service-run.js', 'service-generate.js', 'service-decisions.js', 'category-run.js', 'category-generate.js', 'trade-facts/store.js', 'trade-facts/pack.js', 'trade-facts/routes.js'];
  const hits = prod.filter(f => /trust-pack|trustPack|TRUST_PACK|skipGate|bypass/i.test(fs.readFileSync(path.join(root, f), 'utf8')));
  chk('no production file reads the local --trust-pack bypass (tools only)', !hits.length, hits.join(', '), 'none');
  const tool = fs.readFileSync(path.join(root, 'tools/niche-thin-run.js'), 'utf8');
  chk('tools/niche-thin-run.js only trusts a pack behind --trust-pack and says so', /flag\('--trust-pack'\)/.test(tool) && /trust \? \{ niche:/.test(tool) && /not verified for this local run/.test(tool), '', 'flag gated');
  // The server's service page route takes the gate's answer, never a flag
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  chk('server.js asks tradeFacts.serviceGate before a service run', /tradeFacts\.serviceGate\(/.test(server), '', 'serviceGate in server.js');

  await pool.end();
  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
