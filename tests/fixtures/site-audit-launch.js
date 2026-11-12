'use strict';
// Fixture: launch and after (site-audit/launch.js, slice 2 of the existing site migration, 12 Nov 2026).
// The old URLs on the live site, the DNS snapshot and comparison, the top searches on the new pages,
// the 90 day rankings and their red flags, the launch row on pg-mem (launched by the launch day check,
// day 7 by itself, then 30, 60 and 90 days, each once, never retried), the undo, and the red flags as
// Tell Brandon alerts. A fake web, a fake resolver and a fake DataForSEO: nothing leaves this test.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const L = require(path.join(root, 'site-audit/launch.js'));
const BR = require(path.join(root, 'brandon/rules.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got = '', want = '') => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else { console.log('✗ ' + label + '\n  got:  ' + (typeof got === 'string' ? got : JSON.stringify(got)) + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: site audit, launch and after ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };

// A fake web: url → { status, location, html }
const fakeWeb = routes => async url => {
  const r = routes[String(url)] || routes[String(url).replace(/\/$/, '')] || { status: 404, html: 'Not found' };
  const redirect = r.status >= 300 && r.status < 400;
  return new Response(redirect ? null : (r.html || ''), { status: r.status, headers: { 'content-type': 'text/html', ...(r.location ? { location: r.location } : {}) } });
};
const page = (title, h1, text) => ({ status: 200, html: `<html><head><title>${title}</title></head><body><main><h1>${h1}</h1><p>${text}</p></main></body></html>` });
const LIVE = 'https://example-trade.co.uk';

// The approved map, as view() gives it
const url = (path, plan, extra = {}) => ({ path, url: `${LIVE}${path}`, kind: 'page', matters: false, top20: false, est_traffic: 0, top_searches: [], plan, ...extra });
const v = { urls: [
  url('/', { decision: 'Keep', redirect_type: 'none' }, { matters: true, top20: true }),
  url('/garden-design.html', { decision: 'Reuse', redirect_type: '301', new_url: '/landscape-designer' }, { matters: true, top20: true, est_traffic: 40, top_searches: [{ search: 'garden designer southampton', position: 4, estimated: 30 }, { search: 'garden design ideas', position: 25 }] }),
  url('/patios', { decision: 'Retire', redirect_type: '301', new_url: '/patio-installation' }),
  url('/old-offer', { decision: 'Retire', redirect_type: '301', new_url: '/fencing' }, { matters: true }),
  url('/casino-bonus', { decision: 'Remove', redirect_type: '410' }),
  url('/tag/spam', { decision: 'Remove', redirect_type: '410' }),
  url('/image.jpg', { no_action: true }, { kind: 'image' }),
] };

(async () => {
  // ── The old URLs on the live site ──
  const live = fakeWeb({
    [`${LIVE}/`]: page('Home', 'Landscaper in Southampton', 'We build gardens.'),
    [`${LIVE}/garden-design.html`]: { status: 301, location: '/landscape-designer' },
    [`${LIVE}/landscape-designer`]: page('Garden Designer Southampton', 'Landscape Designer', 'Garden design in Southampton.'),
    [`${LIVE}/patios`]: { status: 301, location: '/patio' },
    [`${LIVE}/patio`]: { status: 301, location: '/patio-installation' },
    [`${LIVE}/patio-installation`]: page('Patios', 'Patio Installation', 'Patios.'),
    [`${LIVE}/old-offer`]: { status: 200, html: 'still here' },
    [`${LIVE}/casino-bonus`]: { status: 410 },
    [`${LIVE}/tag/spam`]: { status: 404 },
  });
  const lc = await L.liveUrlCheck(v, LIVE, { fetchImpl: live });
  chk('every row in the map is checked, the no action image is not', lc.checked === 6, lc.checked, 6);
  chk('the kept homepage and the one hop redirect are right', lc.results.find(r => r.path === '/').ok && lc.results.find(r => r.path === '/garden-design.html').ok);
  chk('a URL that matters and is not redirected is a BLOCK that says to check the switch', lc.block.some(i => i.url === '/old-offer' && /turned on/.test(i.text)), lc.block);
  chk('two hops to the right page is right, with a WARN', lc.results.find(r => r.path === '/patios').ok && lc.warn.some(i => i.url === '/patios' && /2 redirects/.test(i.text)), lc.warn);
  chk('a 410 answering 410 is right; a 404 is right with a WARN', lc.results.find(r => r.path === '/casino-bonus').ok && lc.results.find(r => r.path === '/tag/spam').ok && lc.warn.some(i => i.url === '/tag/spam'));
  const wrong = await L.liveUrlCheck({ urls: [url('/a', { decision: 'Retire', redirect_type: '301', new_url: '/b' })] }, LIVE, { fetchImpl: fakeWeb({ [`${LIVE}/a`]: { status: 301, location: '/' }, [`${LIVE}/`]: page('Home', 'Home', 'x') }) });
  chk('a redirect to the wrong page is named, a WARN when the URL does not matter', wrong.warn.some(i => /should go to \/b and goes to \//.test(i.text)) && !wrong.block.length, wrong);

  // ── DNS ──
  const zone = {
    'example-trade.co.uk': { A: ['1.2.3.4'], NS: ['ns1.host.com'], MX: [{ exchange: 'aspmx.l.google.com', priority: 1 }], TXT: [['v=spf1 include:_spf.google.com ~all'], ['google-site-verification=abc']] },
    'www.example-trade.co.uk': { CNAME: ['example-trade.co.uk'] },
    '_dmarc.example-trade.co.uk': { TXT: [['v=DMARC1; p=none']] },
    'google._domainkey.example-trade.co.uk': { TXT: [['v=DKIM1; k=rsa; p=MIIB']] },
  };
  const resolverFor = z => {
    const get = (name, type) => { const r = z[name] && z[name][type]; if (!r) throw Object.assign(new Error('nodata'), { code: 'ENODATA' }); return r; };
    return { resolve4: async n => get(n, 'A'), resolveCname: async n => get(n, 'CNAME'), resolveNs: async n => get(n, 'NS'), resolveMx: async n => get(n, 'MX'), resolveTxt: async n => get(n, 'TXT') };
  };
  const before = await L.dnsSnapshot('https://www.example-trade.co.uk', { resolver: resolverFor(zone) });
  chk('the snapshot: the domain without www, MX, SPF, DMARC, the Google DKIM key, the other TXT', before.domain === 'example-trade.co.uk' && before.mx[0].exchange === 'aspmx.l.google.com' && before.spf.length === 1 && before.dmarc.length === 1 && Object.keys(before.dkim).join() === 'google' && before.txt.length === 1 && !before.errors.length, before);
  const same = L.dnsCompare(before, { ...before, a: ['9.9.9.9'] });
  chk('a new A record alone is expected at launch: no BLOCK or WARN, named as a change', !same.block.length && !same.warn.length && same.changes.some(c => /9\.9\.9\.9/.test(c)), same);
  const lost = L.dnsCompare(before, await L.dnsSnapshot('example-trade.co.uk', { resolver: resolverFor({ ...zone, 'example-trade.co.uk': { A: ['9.9.9.9'], NS: ['ns1.newhost.com'], TXT: [] }, '_dmarc.example-trade.co.uk': {}, 'google._domainkey.example-trade.co.uk': {} }) }));
  chk('lost MX, SPF, DMARC and DKIM are each a BLOCK', ['no MX records', 'SPF record is gone', 'DMARC record is gone', 'DKIM key at google'].every(t => lost.block.some(i => i.text.includes(t))), lost.block.map(i => i.text));
  chk('a lost verification TXT and a new DNS host are WARNs', lost.warn.some(i => /google-site-verification/.test(i.text)) && lost.warn.some(i => /DNS host changed/.test(i.text)), lost.warn.map(i => i.text));
  chk('no snapshot before launch: a WARN to check by hand', L.dnsCompare(null, before).warn.some(i => /No DNS snapshot/.test(i.text)));

  // ── The top searches on the new pages (staging) ──
  chk('a search in the title', L.searchCovered('garden designer southampton', { title: 'Garden Designer in Southampton', h1: '', text: '' }).where === 'title');
  chk('plurals and stop words: "patios near me" is found in "Patio Installation"', L.searchCovered('patios near me', { title: 'Patio Installation', h1: '', text: '' }).where === 'title');
  chk('words spread over the page count as the text', L.searchCovered('pergola builder hampshire', { title: 'Pergolas', h1: 'Builder', text: 'across Hampshire' }).where === 'text');
  const miss = L.searchCovered('garden design ideas', { title: 'Landscape Designer', h1: '', text: 'garden design' });
  chk('a missing word is named', miss.where === '' && miss.missing.join() === 'idea', miss);
  const STAGE = 'https://staging.example.test';
  const cc = await L.contentCheck(v, STAGE, { fetchImpl: fakeWeb({ [`${STAGE}/`]: page('Home', 'Landscaper', 'x'), [`${STAGE}/landscape-designer`]: page('Garden Designer Southampton', 'Landscape Designer', 'We design gardens.') }) });
  chk('the content check: one WARN for the search the new page lacks, none for the one it has', cc.warn.length === 1 && /garden design ideas/.test(cc.warn[0].text) && !cc.block.length, cc.warn);

  // ── 90 days ──
  const rows = [
    { url: `${LIVE}/landscape-designer`, keyword: 'garden designer southampton', position: 31, etv: 5 },
    { url: `${LIVE}/`, keyword: 'landscaper southampton', position: 3, etv: 50 },
  ];
  const mc = L.monitorCompare(v, rows, { drop: 0.5, top: 20 });
  chk('visits down more than half at the new home is a red flag', mc.flags.some(f => /fell from 40 to 5/.test(f.text)), mc.flags);
  chk('the main search out of the top 20 is a red flag', mc.flags.some(f => /garden designer southampton.*now at 31/.test(f.text)), mc.flags);
  chk('a search that was never in the top 20 is not the main search', !mc.flags.some(f => /garden design ideas/.test(f.text)));
  chk('the homepage with no visits before has no flag', mc.pages.find(p => p.old === '/').before === 0 && !mc.flags.some(f => f.text.startsWith('/ ')));
  chk('no flags when it held up', !L.monitorCompare(v, [{ url: `${LIVE}/landscape-designer`, keyword: 'garden designer southampton', position: 5, etv: 35 }]).flags.length);

  // ── The service on pg-mem ──
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query('CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT)');
  await pool.query('CREATE TABLE site_redirect_checks (client_id UUID, kind TEXT, site TEXT, block INTEGER, warn INTEGER, result JSONB, created_at TIMESTAMPTZ DEFAULT NOW())');
  const clientId = (await pool.query("INSERT INTO clients (name) VALUES ('Example Trade') RETURNING id")).rows[0].id;
  let clock = new Date('2026-12-01T10:00:00Z');
  const saveCheck = async (id, kind, site, result) => { await pool.query('INSERT INTO site_redirect_checks (client_id, kind, site, block, warn, result) VALUES ($1,$2,$3,$4,$5,$6)', [id, kind, site, result.block.length, result.warn.length, JSON.stringify(result)]); return result; };
  // The live site after the switch: every version of the domain one hop to https, the map right
  const goodLive = fakeWeb({
    'http://example-trade.co.uk/': { status: 301, location: `${LIVE}/` }, 'http://www.example-trade.co.uk/': { status: 301, location: `${LIVE}/` }, 'https://www.example-trade.co.uk/': { status: 301, location: `${LIVE}/` },
    [`${LIVE}/`]: page('Home', 'Landscaper', 'x'),
    [`${LIVE}/garden-design.html`]: { status: 301, location: '/landscape-designer' }, [`${LIVE}/landscape-designer`]: page('Garden Designer', 'Landscape Designer', 'x'),
    [`${LIVE}/patios`]: { status: 301, location: '/patio-installation' }, [`${LIVE}/patio-installation`]: page('Patios', 'Patios', 'x'),
    [`${LIVE}/old-offer`]: { status: 301, location: '/fencing' }, [`${LIVE}/fencing`]: page('Fencing', 'Fencing', 'x'),
    [`${LIVE}/casino-bonus`]: { status: 410 }, [`${LIVE}/tag/spam`]: { status: 410 },
  });
  let web = goodLive;
  let z = zone;
  const spent = [];
  let dfsCalls = 0, dfsFails = false;
  const dfs = { configured: () => true, rankedKeywords: async (target, o) => { dfsCalls++; if (dfsFails) throw new Error('DataForSEO said no'); await o.spend(0.0132, 1, { endpoint: 'ranked_keywords' }); return { rows, total: rows.length, capped: false }; } };
  const svc = L.createLaunch({ pool, view: async () => v, loadValues: async () => ({ live_domain: 'example-trade.co.uk' }), getSettings: async () => ({ monitor_drop: 0.5, monitor_top: 20, monitor_max_usd: 0.5, keyword_row_cap: 5000 }), saveCheck, dfs, env: {}, logCost: async e => spent.push(e), polite: () => ({ fetchImpl: (...a) => web(...a), wait: async () => {} }), resolver: { ...resolverFor(z) }, now: () => clock, log: quiet });

  const snap = await svc.snapshotDns(clientId);
  chk('the DNS snapshot is saved before launch', snap.mx.length === 1 && !!(await svc.launchView(clientId)).dns_before);
  chk('nothing runs before launch', (await svc.tick()).length === 0);
  const day1 = await svc.launchCheck(clientId);
  const view1 = await svc.launchView(clientId);
  chk('the launch day check passes on a right site and marks it launched', !day1.block.length && day1.passed === 6 && !!view1.launched_at, day1.block);
  chk('the launch day check compared the DNS with the snapshot', day1.dns.compared === true);
  chk('next is the day 7 check, a week on', view1.next.what === 'the day 7 check' && view1.next.at.startsWith('2026-12-08'), view1.next);
  chk('no red flags, no alert', !view1.flags.length);
  chk('the day 7 check does not run on day 6', (clock = new Date('2026-12-07T09:00:00Z'), (await svc.tick()).length === 0));
  // Day 7: someone broke a redirect
  web = async (u, i) => (String(u) === `${LIVE}/garden-design.html` ? new Response('gone', { status: 404, headers: { 'content-type': 'text/html' } }) : goodLive(u, i));
  clock = new Date('2026-12-08T11:00:00Z');
  const t7 = await svc.tick();
  const view7 = await svc.launchView(clientId);
  chk('day 7 runs by itself, once', t7.length === 1 && t7[0].did === 'day7' && !!view7.day7_at, t7);
  chk('a broken redirect on day 7 is a red flag', view7.flags.some(f => f.urgent && /Day 7 check: \/garden-design\.html/.test(f.text)), view7.flags);
  chk('the day 7 check is not run twice', (await svc.tick()).length === 0);
  let refused = '';
  try { await svc.undoLaunch(clientId); } catch (e) { refused = e.message; }
  chk('the launch cannot be undone after day 7', /day 7/.test(refused), refused);

  // The Tell Brandon alert from the red flags
  const flags = await L.loadMigrationFlags(pool);
  const alerts = BR.detectAlerts([{ id: clientId, name: 'Example Trade', migration: flags.get(clientId) }]);
  chk('the red flag is an urgent Tell Brandon alert pointing at the Site audit tab', alerts.length === 1 && alerts[0].kind === 'migration' && alerts[0].urgent && alerts[0].tab === 'site-audit', alerts);

  // Day 30: the rankings
  clock = new Date('2026-12-31T11:00:00Z');
  const t30 = await svc.tick();
  const view30 = await svc.launchView(clientId);
  const m30 = view30.monitor.find(m => m.day === 30);
  chk('day 30 runs the rankings check by itself', t30[0] && t30[0].did === 'day30' && m30 && m30.status === 'done', t30);
  chk('its red flags are saved and joined to the alerts', m30.flags.length === 2 && view30.flags.filter(f => /^30 days after launch/.test(f.text)).length === 2, view30.flags);
  chk('its spend is logged as site_monitor', spent.length === 1 && spent[0].kind === 'site_monitor' && spent[0].clientId === clientId, spent);
  chk('day 30 is not run twice', (await svc.tick()).length === 0 && dfsCalls === 1);
  // Day 60 fails: recorded, never retried
  clock = new Date('2027-01-30T11:00:00Z');
  dfsFails = true;
  await svc.tick();
  await svc.tick();
  const view60 = await svc.launchView(clientId);
  chk('a failed rankings check is recorded and never retried', view60.monitor.find(m => m.day === 60).status === 'failed' && dfsCalls === 2, view60.monitor);
  chk('next is the 90 day check', view60.next && view60.next.what === 'the 90 day rankings check', view60.next);

  // The undo, on a second client launched by mistake
  const c2 = (await pool.query("INSERT INTO clients (name) VALUES ('Two') RETURNING id")).rows[0].id;
  await svc.launchCheck(c2);
  const undone = await svc.undoLaunch(c2);
  chk('a launch by mistake can be undone before day 7', !undone.launched_at);
  let snapRefused = '';
  await svc.launchCheck(c2);
  try { await svc.snapshotDns(c2); } catch (e) { snapRefused = e.message; }
  chk('no new DNS snapshot after launch: the one from before is kept', /before launch is kept/.test(snapRefused), snapRefused);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
