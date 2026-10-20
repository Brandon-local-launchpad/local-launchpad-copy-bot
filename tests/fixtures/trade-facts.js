'use strict';
// Fixture: trade facts packs. The runner (scripts/trade-facts.js) with a stubbed Perplexity:
// core + block as one message, the pack header, skipping packs that exist unless --force,
// a failed niche reported and leaving no file, concurrency, cost from usage, a missing core
// prompt, the real Agent API call shape with a fake fetch (429 backoff, background poll, the
// key in the header and never in a log or error). The loader (trade-facts/pack.js) against
// the roofer pack: the service's rows from A, B and F, C, D and E in full, missing rows noted,
// names matched loosely, a missing pack refused. The verified flag and the service page gate
// (trade-facts/store.js) with pg-mem and the routes over HTTP: unverified, verified by whom and
// when, a re-run making it unverified again, a missing pack, the niche mapping.
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const express = require('express');
const root = path.join(__dirname, '../..');

// A temp copy of the trade-facts folder, so nothing here touches the real packs
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'copybot-trade-facts-'));
fs.mkdirSync(path.join(dir, 'blocks'));
fs.copyFileSync(path.join(root, 'trade-facts/core.md'), path.join(dir, 'core.md'));
fs.copyFileSync(path.join(root, 'trade-facts/blocks/builder.md'), path.join(dir, 'blocks/builder.md'));
fs.copyFileSync(path.join(root, 'trade-facts/blocks/roofer.md'), path.join(dir, 'blocks/roofer.md'));
fs.copyFileSync(path.join(root, 'trade-facts/blocks/landscaper.md'), path.join(dir, 'blocks/landscaper.md'));
fs.copyFileSync(path.join(root, 'tests/fixtures/data/trade-facts-roofer.md'), path.join(dir, 'roofer.md'));
process.env.TRADE_FACTS_DIR = dir;

const P = require(path.join(root, 'trade-facts/pack.js'));
const R = require(path.join(root, 'scripts/trade-facts.js'));
const { ensureTradeFactsTables, createTradeFactsService } = require(path.join(root, 'trade-facts/store.js'));
const { mountTradeFactsApi } = require(path.join(root, 'trade-facts/routes.js'));
const { newDb } = require('pg-mem');

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: trade facts packs (stubbed Perplexity) ===\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const KEY = 'pplx-TEST-SECRET-0000';
const read = n => fs.readFileSync(path.join(dir, `${n}.md`), 'utf8');
const exists = n => fs.existsSync(path.join(dir, `${n}.md`));

// Lines of one "## TABLE X" section of the loader's markdown; data rows are pipe lines after the header and separator
const section = (md, letter) => {
  const parts = md.split(/\n(?=## )/);
  return parts.find(p => new RegExp(`^## TABLE ${letter}\\b`).test(p)) || '';
};
const dataRows = sec => sec.split('\n').filter(l => /^\| /.test(l)).slice(1);

(async () => {
  // ── The runner with a stub ──
  const prompts = {};
  let inFlight = 0, maxInFlight = 0;
  const stub = (opts = {}) => ({
    preset: 'high',
    async research(prompt) {
      const niche = (prompt.match(/=== NICHE BLOCK: (\w[\w /-]*) ===/) || [])[1];
      prompts[niche] = prompt;
      inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
      await sleep(opts.delay || 15);
      inFlight--;
      if (opts.fail && opts.fail.some(f => niche.startsWith(f))) throw new Error(`stub says no for ${niche}`);
      return { text: `# ${niche} pack\n\nTABLE A — HOW EACH JOB IS DONE\n| Service | Stages |\n|---|---|\n| x | y |\n\nEND OF PACK`, model: 'stub-model', cost: 1.25, usage: { cost: { total_cost: 1.25 } } };
    },
  });
  const logs = [];
  const log = s => logs.push(s);
  let r = await R.run({ api: stub({ fail: ['LANDSCAPER'] }), log, today: () => '2026-10-20' });
  const by = Object.fromEntries(r.results.map(x => [x.niche, x]));
  chk('Every block with no pack runs; the roofer (pack exists) is skipped; the failed niche is reported', by.builder.status === 'written' && by.landscaper.status === 'failed' && by.roofer.status === 'skipped' && /stub says no/.test(by.landscaper.error), JSON.stringify(r.results), '');
  const core = P.readCore();
  chk('The prompt is the core (the fenced prompt, not the note above it) then the block, as one message', prompts.BUILDER === `${core}\n\n${P.readBlock('builder')}` && core.startsWith('You are a UK trade research assistant') && /^RUN: Builder \| England \| October 2026$/m.test(prompts.BUILDER) && !/Paste three blocks/.test(prompts.BUILDER), prompts.BUILDER.slice(0, 60), '');
  chk('The pack is written with the header line "generated <date> · model <model> · verified: no", then the answer', read('builder').startsWith('generated 2026-10-20 · model perplexity agent high (stub-model) · verified: no\n\n# BUILDER pack\n'), read('builder').slice(0, 90), '');
  chk('The failed niche leaves no file; the skipped pack is untouched', !exists('landscaper') && read('roofer').startsWith('generated 2026-10-20 · model perplexity agent high (openai/gpt-5.6-luna)'), [exists('landscaper'), read('roofer').slice(0, 40)].join(' | '), '');
  chk('Per-niche status lines and the cost from usage; the key never appears', logs.some(l => /^builder: done in .* \$1\.25, wrote .*builder\.md/.test(l)) && logs.some(l => /^landscaper: failed .*stub says no/.test(l)) && logs.some(l => /^roofer: skipped, .*roofer\.md exists \(generated 2026-10-20\); use --force/.test(l)) && logs.some(l => /^Done: 1 written, 1 skipped, 1 failed\. Cost \$1\.25\./.test(l)) && !logs.join('\n').includes(KEY), logs.join('\n'), '');
  chk('Totals: cost summed over written packs', r.totalCost === 1.25, r.totalCost, 1.25);
  const h = P.parseHeader(read('builder'));
  chk('parseHeader reads the header back', h && h.generated === '2026-10-20' && h.model === 'perplexity agent high (stub-model)' && h.verifiedNote === 'no', JSON.stringify(h), '');

  r = await R.run({ api: stub(), niches: ['builder'], log: () => {} });
  chk('A second run skips the pack that now exists', r.results[0].status === 'skipped', JSON.stringify(r.results), '');
  const before = read('roofer');
  r = await R.run({ api: stub(), niches: ['roofer'], force: true, log: () => {}, today: () => '2026-10-21' });
  chk('--force re-runs a pack that exists and overwrites it (new header, new text)', r.results[0].status === 'written' && read('roofer') !== before && read('roofer').startsWith('generated 2026-10-21'), read('roofer').slice(0, 40), '');
  fs.writeFileSync(path.join(dir, 'roofer.md'), before); // the fixture pack back for the loader tests

  for (const n of ['builder']) fs.unlinkSync(path.join(dir, `${n}.md`));
  maxInFlight = 0;
  r = await R.run({ api: stub({ delay: 40 }), niches: ['builder', 'landscaper', 'roofer'], force: true, concurrency: 2, log: () => {} });
  chk('Concurrency 2 with three niches: never more than two calls in flight', maxInFlight === 2 && r.results.every(x => x.status === 'written'), maxInFlight, 2);
  maxInFlight = 0;
  await R.run({ api: stub({ delay: 40 }), niches: ['builder', 'landscaper', 'roofer'], force: true, concurrency: 3, log: () => {} });
  chk('Concurrency 3 (the default): all three at once', maxInFlight === 3, maxInFlight, 3);
  fs.writeFileSync(path.join(dir, 'roofer.md'), before);
  fs.unlinkSync(path.join(dir, 'landscaper.md'));

  const dry = [];
  r = await R.run({ api: { preset: 'high' }, niches: ['landscaper'], dryRun: true, log: s => dry.push(s) });
  chk('--dry-run plans and calls nothing', r.results[0].status === 'planned' && /^landscaper: would run, prompt \d+ chars/.test(dry[0]) && !exists('landscaper'), dry.join(' | '), '');
  let err = null;
  try { await R.run({ api: stub(), niches: ['plumber'] }); } catch (e) { err = e; }
  chk('A niche with no block is refused by name', err && /No block for "plumber": expected .*blocks\/plumber\.md/.test(err.message), err && err.message, '');
  fs.renameSync(path.join(dir, 'core.md'), path.join(dir, 'core.bak'));
  err = null;
  try { await R.run({ api: stub(), niches: ['landscaper'] }); } catch (e) { err = e; }
  chk('A missing core prompt stops the run with the path', err && /core prompt is missing: put it at .*core\.md/.test(err.message), err && err.message, '');
  fs.renameSync(path.join(dir, 'core.bak'), path.join(dir, 'core.md'));
  let a = R.parseArgs(['roofer', 'builder', '--force', '--concurrency', '2', '--preset=xhigh', '--dry-run']);
  chk('Arguments: niches, --force, --concurrency, --preset, --dry-run', a.niches.join() === 'roofer,builder' && a.force && a.concurrency === 2 && a.preset === 'xhigh' && a.dryRun, JSON.stringify(a), '');
  err = null; try { R.parseArgs(['--concurrency', '0']); } catch (e) { err = e; }
  chk('--concurrency below 1 is refused', !!err, err && err.message, '');

  // ── The real call shape with a fake fetch ──
  const calls = [];
  const reply = (status, body, headers = {}) => ({ ok: status < 400, status, headers: { get: k => headers[k] }, json: async () => body, text: async () => JSON.stringify(body) });
  const script = [
    () => reply(429, { error: 'slow down' }),
    () => reply(200, { id: 'resp_1', status: 'queued' }),
    () => reply(200, { id: 'resp_1', status: 'in_progress' }),
    () => reply(200, { id: 'resp_1', status: 'completed', model: 'openai/gpt-5.6-luna', output: [{ type: 'message', content: [{ type: 'output_text', text: 'TABLE A — HOW EACH JOB IS DONE\n| a |' }] }], usage: { input_tokens: 10, output_tokens: 20, cost: { total_cost: 2.5 } } }),
  ];
  const fetchFn = async (url, init = {}) => { calls.push({ url, method: init.method || 'GET', headers: init.headers, body: init.body }); return script.shift()(); };
  const statuses = [];
  const api = R.perplexityAgent({ apiKey: KEY, preset: 'high', fetchFn, pollMs: 1, backoffMs: [1], onStatus: s => statuses.push(s) });
  const out = await api.research('PROMPT');
  chk('Agent API: POST /v1/agent with the preset, the prompt as input and background mode; the key only in the Authorization header', calls[1].url === R.AGENT_URL && calls[1].method === 'POST' && JSON.parse(calls[1].body).preset === 'high' && JSON.parse(calls[1].body).input === 'PROMPT' && JSON.parse(calls[1].body).background === true && calls[1].headers.Authorization === `Bearer ${KEY}`, JSON.stringify(calls[1]), '');
  chk('A 429 backs off and resubmits; the job is polled by id until completed', calls.length === 4 && calls[2].url === `${R.AGENT_URL}/resp_1` && calls[2].method === 'GET' && statuses.join() === 'rate limited, waiting 0s,in_progress', JSON.stringify({ n: calls.length, statuses }), '');
  chk('The result: the answer text, the model Perplexity reports and usage.cost.total_cost', out.text === 'TABLE A — HOW EACH JOB IS DONE\n| a |' && out.model === 'openai/gpt-5.6-luna' && out.cost === 2.5, JSON.stringify(out), '');
  chk('Cost is null, never guessed, when the response has no usage.cost', R.responseCost({ usage: { input_tokens: 1 } }) === null && R.responseText({ output_text: 'x' }) === 'x', '', '');
  const script2 = [() => reply(500, { error: 'boom' })];
  const api2 = R.perplexityAgent({ apiKey: KEY, fetchFn: async () => script2.shift()(), pollMs: 1, backoffMs: [1] });
  err = null; try { await api2.research('p'); } catch (e) { err = e; }
  chk('An API error names the status and body, never the key', err && /Perplexity submit error 500: .*boom/.test(err.message) && !err.message.includes(KEY), err && err.message, '');
  err = null; try { R.perplexityAgent({ apiKey: '' }); } catch (e) { err = e; }
  chk('No key: a clear error', err && /PERPLEXITY_API_KEY is not set/.test(err.message), err && err.message, '');

  // ── The loader against the roofer pack ──
  const tables = P.parseTables(read('roofer'));
  chk('parseTables: seven tables, A to G, with their columns and rows', tables.size === 7 && [...tables.keys()].join('') === 'ABCDEFG' && tables.get('A').columns[0] === 'Service' && tables.get('A').columns.length === 5 && tables.get('A').rows.length === 5 && tables.get('E').rows.length === 4 && tables.get('A').title === 'TABLE A — Service process', JSON.stringify([...tables.values()].map(t => [t.letter, t.columns.length, t.rows.length])), '');
  let L = P.packForService('roofer', 'Storm damage repairs');
  const A = section(L.markdown, 'A'), B = section(L.markdown, 'B'), C = section(L.markdown, 'C'), D = section(L.markdown, 'D'), E = section(L.markdown, 'E'), F = section(L.markdown, 'F');
  chk('A service page gets its own row from Tables A, B and F, no other service\'s', dataRows(A).length === 1 && /^\| Storm damage repairs \| 1\. Make safe/.test(dataRows(A)[0]) && dataRows(B).length === 1 && /Tiles or slates on ground/.test(dataRows(B)[0]) && dataRows(F).length === 1 && /Emergency call-out/.test(dataRows(F)[0]) && !/Roof inspections/.test(A + B + F), [dataRows(A).length, dataRows(B).length, dataRows(F).length].join(), '1,1,1');
  chk('Tables C, D and E in full, with their headers', dataRows(C).length === 3 && dataRows(D).length === 3 && dataRows(E).length === 4 && /^\| Rule or standard \| Which services \|/m.test(C) && /Minimum tile pitch/.test(E) && /TrustMark/.test(D), [dataRows(C).length, dataRows(D).length, dataRows(E).length].join(), '3,3,4');
  chk('Table G is left out; the sections come in order A B C D E F under the pack\'s own titles; nothing missing', !/TABLE G/.test(L.markdown) && (L.markdown.match(/^## TABLE ([A-F])/gm) || []).map(s => s.slice(-1)).join('') === 'ABCDEF' && L.missing.length === 0 && /^## TABLE F — Price factors \(no figures\)$/m.test(L.markdown), L.markdown.match(/^## .*/gm).join(' | '), '');
  chk('The loader names the pack and its header', /^# Trade facts: roofer · Storm damage repairs$/m.test(L.markdown) && /generated 2026-10-20 · model perplexity agent high/.test(L.markdown) && /roofer\.md/.test(L.file), L.markdown.split('\n').slice(0, 2).join(' | '), '');
  L = P.packForService('roofer', 'Roof repairs');
  chk('A service with a row in A but none in B or F: the rows it has, a note for each it lacks, and missing lists them', dataRows(section(L.markdown, 'A')).length === 1 && /_No row for "Roof repairs" in Table B\._/.test(L.markdown) && /_No row for "Roof repairs" in Table F\._/.test(L.markdown) && L.missing.join() === 'B:Roof repairs,F:Roof repairs', JSON.stringify(L.missing), '');
  L = P.packForService('roofer', 'storm   damage REPAIRS');
  chk('Service names match loosely: case, spacing', dataRows(section(L.markdown, 'A')).length === 1, L.missing.join(), '');
  chk('A first cell naming several services matches on any of them; a different service does not', P.cellNames('Roof replacement; Roof repairs', 'roof repairs') && P.cellNames('Tile/Slate roofing', 'Slate roofing') && !P.cellNames('Roof repairs', 'Roof'), '', '');
  err = null; try { P.packForService('plumber', 'Boilers'); } catch (e) { err = e; }
  chk('A missing pack is refused by file name, status 422', err && err.status === 422 && /plumber\.md is missing/.test(err.message), err && err.message, '');
  const noTables = P.parseTables('generated x · model y · verified: no\n\nNothing here');
  chk('A pack with no tables: every table reported missing by the loader', noTables.size === 0, noTables.size, 0);

  chk('packNameFor: niche keys, Fillout labels and old trade names map to the pack', ['Roofers', 'roofers', 'Roofing Company', 'roofer'].every(x => P.packNameFor(x) === 'roofer') && ['Landscapers/Gardeners', 'landscapers', 'Landscaper Gardener'].every(x => P.packNameFor(x) === 'landscaper') && ['Builders', 'Building Company', 'builder'].every(x => P.packNameFor(x) === 'builder') && P.packNameFor('Dog Training') === 'dog-training' && P.packNameFor('') === null && P.packNameFor('Chimney Sweeps') === 'chimney-sweeps', [P.packNameFor('Roofing Company'), P.packNameFor('Landscaper Gardener'), P.packNameFor('Dog Training'), P.packNameFor('Chimney Sweeps')].join(), '');

  // ── The verified flag and the gate (pg-mem) ──
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await ensureTradeFactsTables(pool);
  const svc = createTradeFactsService({ pool });
  let s = await svc.status('roofer');
  chk('A fresh pack: exists, header read, not verified', s.exists && s.generated === '2026-10-20' && /openai\/gpt-5\.6-luna/.test(s.model) && s.verified === false && s.stale === false && s.verifiedBy === null, JSON.stringify(s), '');
  let g = await svc.serviceGate('Roofers');
  chk('Gate: an unverified pack blocks service pages with a message naming the pack and the Trade facts page', g.ok === false && g.reason === 'unverified' && /Service pages are blocked: the trade facts pack .*roofer\.md has not been verified \(generated 2026-10-20\)\. Verify it on the Trade facts page\./.test(g.message), g.message, '');
  err = null; try { await svc.verify('roofer', '  '); } catch (e) { err = e; }
  chk('Verify needs a name', err && err.status === 400, err && err.message, '');
  s = await svc.verify('roofer', 'Ray');
  chk('Verify: yes, by whom, when', s.verified === true && s.verifiedBy === 'Ray' && s.verifiedAt && s.stale === false, JSON.stringify(s), '');
  g = await svc.serviceGate('Roofing Company');
  chk('Gate: a verified pack lets service pages through (old trade name resolves to the same pack)', g.ok === true && g.niche === 'roofer', JSON.stringify(g), '');
  await R.run({ api: stub(), niches: ['roofer'], force: true, log: () => {}, today: () => '2026-10-22' });
  s = await svc.status('roofer');
  g = await svc.serviceGate('roofers');
  chk('A re-run of the script resets verified to no (the flag is keyed to the pack text, the file is never edited)', s.verified === false && s.stale === true && s.lastVerifiedBy === 'Ray' && s.generated === '2026-10-22' && g.ok === false && g.reason === 'stale' && /was generated again \(generated 2026-10-22\) after it was verified/.test(g.message) && /verified: no/.test(read('roofer').split('\n')[0]), JSON.stringify([s.verified, s.stale, g.message]), '');
  s = await svc.verify('roofer', 'Brandon');
  chk('Verifying again after the re-run: yes, by the new verifier', s.verified && s.verifiedBy === 'Brandon', JSON.stringify(s), '');
  s = await svc.unverify('roofer');
  chk('Unverify clears the flag', s.verified === false && s.stale === false && s.lastVerifiedBy === null, JSON.stringify(s), '');
  fs.writeFileSync(path.join(dir, 'roofer.md'), before);
  g = await svc.serviceGate('Landscapers/Gardeners');
  chk('Gate: a missing pack (block only) says so, names the file and the script', g.ok === false && g.reason === 'missing' && /pack for "Landscapers\/Gardeners" is missing \(.*landscaper\.md\)\. Generate it with node scripts\/trade-facts\.js, then verify it/.test(g.message), g.message, '');
  g = await svc.serviceGate('Plumbing & Heating');
  chk('Gate: a niche with no block yet says the block is needed too', g.ok === false && /needs a block at trade-facts\/blocks\/plumbing-heating\.md/.test(g.message), g.message, '');
  g = await svc.serviceGate('');
  chk('Gate: no niche at all', g.ok === false && g.reason === 'no-niche', g.message, '');
  err = null; try { await svc.verify('landscaper', 'Ray'); } catch (e) { err = e; }
  chk('Verifying a pack that does not exist is refused, 404', err && err.status === 404 && /landscaper\.md is missing/.test(err.message), err && err.message, '');
  const list = await svc.list();
  chk('The list: every block or pack, sorted, with its state', list.map(x => x.niche).join() === 'builder,landscaper,roofer' && list[1].exists === false && list[1].hasBlock === true && list[2].exists === true, JSON.stringify(list.map(x => [x.niche, x.exists, x.verified])), '');

  // ── The routes ──
  const app = express(); app.use(express.json()); mountTradeFactsApi(app, svc);
  const srv = http.createServer(app); await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const req = (method, p, body) => fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  try {
    let b = await (await req('GET', '/api/trade-facts')).json();
    chk('GET /api/trade-facts lists the packs with niche, generated, model, verified; the core prompt is present', b.packs.length === 3 && b.packs[2].niche === 'roofer' && b.packs[2].generated === '2026-10-20' && b.packs[2].verified === false && b.coreMissing === false, JSON.stringify(b), '');
    let res = await req('POST', '/api/trade-facts/roofer/verify', {});
    chk('POST verify without who: 400', res.status === 400, res.status, 400);
    b = await (await req('POST', '/api/trade-facts/roofer/verify', { who: 'Ray' })).json();
    chk('POST verify with who sets the flag', b.verified === true && b.verifiedBy === 'Ray', JSON.stringify(b), '');
    b = await (await req('GET', '/api/trade-facts/roofer')).json();
    chk('GET one pack: its state and text', b.verified === true && b.text.startsWith('generated 2026-10-20'), b.text.slice(0, 30), '');
    b = await (await req('GET', '/api/trade-facts/roofer/service/Storm%20damage%20repairs')).json();
    chk('GET the loader output for a service over HTTP', dataRows(section(b.markdown, 'A')).length === 1 && b.missing.length === 0, JSON.stringify(b.missing), '');
    res = await req('POST', '/api/trade-facts/landscaper/verify', { who: 'Ray' });
    chk('Verifying a missing pack over HTTP: 404 naming the file', res.status === 404 && /landscaper\.md/.test((await res.json()).error), res.status, 404);
    res = await req('GET', '/api/trade-facts/../etc');
    chk('A bad niche name is refused', res.status === 400 || res.status === 404, res.status, '400 or 404');
    b = await (await req('POST', '/api/trade-facts/roofer/unverify')).json();
    chk('POST unverify clears it', b.verified === false, JSON.stringify(b), '');
  } finally { await new Promise(r => srv.close(r)); }

  console.log(`\n${pass} passed, ${fail} failed`);
  fs.rmSync(dir, { recursive: true, force: true });
  process.exitCode = fail ? 1 : 0;
})().catch(err => { console.error(err); fs.rmSync(dir, { recursive: true, force: true }); process.exitCode = 1; });
