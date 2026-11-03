'use strict';
// Fixture: the competitor gap check (citations/gaps.js) on pg-mem with a fake DataForSEO, a
// fake model and a saved competitor run; the directory domains passed to the GBP competitor
// check (gbp/competitors.js). The competitors checked by their Google category (a builder with
// the same Places type is dropped, the next landscaper taken), the directory scan per competitor
// on the client's list (name then phone), the gaps with how many of the three have them and who,
// what both have, the backlinks as the second source (what the client has, the competitors' own
// sites, platforms, spam and retired directories dropped; a known directory counted; the rest
// classified; the new domains with DA from the bulk ranks and "unknown" when there is none), the
// order, the run row, the costs logged, the spend cap, adding a new domain to the database, the
// classifier's answer parser, and the directory domains in the GBP check.
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const G = require(path.join(root, 'citations/gaps.js'));
const { ensureCitationTables, createCitationStore } = require(path.join(root, 'citations/store.js'));
const CL = require(path.join(root, 'citations/client.js'));
const { runCompetitorCheck, skipReason, DIRECTORY_DOMAINS } = require(path.join(root, 'gbp/competitors.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: citations competitor gap check ===\n');
const quiet = { log() {}, info() {}, warn() {}, error() {} };

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL, niche_key TEXT, archived_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await ensureCitationTables(pool);
  const store = createCitationStore(pool, { log: quiet, dfs: { configured: () => false }, env: {} });
  await store.seedDirectories({ fillDa: false });
  await store.update((await store.byKey('freeindex')).id, { da: 55 });
  const edens = (await pool.query(`INSERT INTO clients (name, trade, niche_key) VALUES ('Edens Edge Landscaping', 'Landscaper', 'landscapers') RETURNING id`)).rows[0].id;
  const C = CL.createClientCitations({ pool, store, filloutService: { record: async () => ({ sections: [{ fields: [{ key: 'primary_town', value: 'Southampton' }] }] }) }, placesStore: null, approvedTiers: null, clientValues: async () => ({ company_name: 'Edens Edge Landscaping', phone: '07850 412717', primary_category: 'Landscaper', live_domain: 'edensedge.co.uk' }), siteUrlFor: async () => '' });
  await C.saveRow(edens, (await store.byKey('yell')).id, { listed: 'yes', live_url: 'https://www.yell.com/biz/x/' });

  // The saved competitor run: five with the same Places type; Google says one is a builder
  const competitorsFor = async () => ({ keyword: 'Landscaper Southampton', competitors: [
    { name: 'Southampton Homes', website: 'https://southamptonhomes.co.uk/', address: 'Allington Ln, West End, Southampton', place_id: 'p1', primary_type: 'general_contractor' },
    { name: 'Brick and Build Ltd', website: 'https://brickandbuild.co.uk', address: 'Bitterne, Southampton', place_id: 'p2', primary_type: 'general_contractor' },
    { name: 'TM Landscapes', website: 'https://www.tmconstruct.co.uk/', address: 'Hedge End, Southampton', place_id: 'p3', primary_type: 'general_contractor' },
    { name: 'MTM Landscaping', website: 'http://mtmlandscaping.co.uk/', address: 'Primrose Rd, Southampton', place_id: 'p4', primary_type: 'general_contractor' },
    { name: 'Hambrooks', website: 'http://www.hambrooks.co.uk/', address: 'Curdridge', place_id: 'p5', primary_type: 'general_contractor' },
  ] });
  const infos = { 'Southampton Homes': { title: 'Southampton Homes', category: 'Landscaper', additional_categories: [], phone: '+442381550155', url: 'https://southamptonhomes.co.uk/', address: 'Allington Ln' }, 'Brick and Build Ltd': { title: 'Brick and Build Ltd', category: 'Builder', additional_categories: ['Bricklayer'], phone: '+442380000001', url: 'https://brickandbuild.co.uk/', address: 'Bitterne' }, 'TM Landscapes': { title: 'TM Landscapes & Garden Design', category: 'Landscaper', additional_categories: ['Deck builder'], phone: '+442381449950', url: 'https://www.tmconstruct.co.uk/', address: 'Hedge End' }, 'MTM Landscaping': { title: 'MTM Landscaping & Design Ltd', category: 'Landscaper', additional_categories: [], phone: '+442380000004', url: 'http://mtmlandscaping.co.uk/', address: 'Primrose Rd' } };
  const asked = [], serps = [];
  // Where the competitors are listed: TM on Yell, FreeIndex and Checkatrade; MTM on FreeIndex and Houzz; Southampton Homes on Yell (by phone)
  const listings = { 'yell.com|TM Landscapes & Garden Design': 'name', 'freeindex.co.uk|TM Landscapes & Garden Design': 'name', 'checkatrade.com|TM Landscapes & Garden Design': 'name', 'freeindex.co.uk|MTM Landscaping & Design Ltd': 'name', 'houzz.co.uk|MTM Landscaping & Design Ltd': 'name', 'yell.com|Southampton Homes': 'phone' };
  const refs = {
    'edensedge.co.uk': [{ domain: 'www.checkatrade.com', rank: 0, backlinks: 2, spam_score: 0 }],
    'southamptonhomes.co.uk': [{ domain: 'www.yell.com', rank: 0, backlinks: 3, spam_score: 0 }, { domain: 'hampshiretraders.co.uk', rank: 0, backlinks: 1, spam_score: 10 }, { domain: 'www.facebook.com', rank: 0, backlinks: 5, spam_score: 0 }, { domain: 'spamlinks.xyz', rank: 0, backlinks: 50, spam_score: 80 }, { domain: 'ratedpeople.com', rank: 0, backlinks: 1, spam_score: 0 }],
    'tmconstruct.co.uk': [{ domain: 'www.freeindex.co.uk', rank: 0, backlinks: 1, spam_score: 5 }, { domain: 'hampshiretraders.co.uk', rank: 0, backlinks: 2, spam_score: 10 }, { domain: 'gardeners-directory.de', rank: 0, backlinks: 1, spam_score: 0 }, { domain: 'some-blog.co.uk', rank: 0, backlinks: 1, spam_score: 0 }, { domain: 'southamptonhomes.co.uk', rank: 0, backlinks: 1, spam_score: 0 }, { domain: 'www.trustatrader.com', rank: 0, backlinks: 1, spam_score: 0 }],
    'mtmlandscaping.co.uk': [{ domain: 'hampshiretraders.co.uk', rank: 0, backlinks: 1, spam_score: 10 }, { domain: 'www.houzz.co.uk', rank: 0, backlinks: 1, spam_score: 0 }],
  };
  const dfs = {
    configured: () => true,
    businessInfo: async kw => { asked.push(kw); const name = Object.keys(infos).find(n => kw.startsWith(n)); return { info: name ? infos[name] : null, cost: 0.0054 }; },
    serp: async q => {
      serps.push(q);
      const m = q.match(/^site:(\S+) "(.+)"$/);
      const [, domain, term] = m;
      const items = [];
      for (const [key, by] of Object.entries(listings)) {
        const [d, name] = key.split('|');
        if (d !== domain) continue;
        const phone = (Object.values(infos).find(i => i.title === name) || {}).phone || '';
        if ((by === 'name' && term === name) || (by === 'phone' && term === phone)) items.push({ url: `https://www.${d}/biz/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`, domain: `www.${d}`, title: `${name} - ${d}`, description: by === 'phone' ? `Call ${phone}` : 'Listing' });
      }
      return { items, cost: 0.01, total: items.length };
    },
    referringDomains: async target => ({ items: (refs[target] || []).map(i => ({ ...i, first_seen: '2025-01-01' })), cost: 0.02, total: (refs[target] || []).length }),
    bulkRanks: async domains => ({ ranks: new Map(domains.map(d => [d, d === 'hampshiretraders.co.uk' ? 120 : null])), cost: 0.02, calls: 1 }),
  };
  const modelCalls = [];
  const callModel = async ({ system, message, model }) => {
    modelCalls.push({ system, message, model });
    const domains = [...message.matchAll(/^- (.+)$/gm)].map(m => m[1]);
    const answer = domains.map(d => ({ domain: d, directory: d === 'hampshiretraders.co.uk' || d === 'gardeners-directory.de', uk: d !== 'gardeners-directory.de', spam: false, name: d === 'hampshiretraders.co.uk' ? 'Hampshire Traders' : '', kind: d === 'hampshiretraders.co.uk' ? 'local directory' : d === 'some-blog.co.uk' ? 'blog or news' : 'general directory' }));
    return { text: 'Here you go:\n' + JSON.stringify(answer), usage: { input_tokens: 1000, output_tokens: 300, model: 'claude-haiku-5-5' } };
  };
  const gaps = G.createGaps({ pool, store, clientCitations: C, competitorsFor, dfs, callModel, env: { DATAFORSEO_LOGIN: 'x', DATAFORSEO_PASSWORD: 'y' }, log: quiet });

  const r = await gaps.run(edens);
  const gap = d => r.gaps.find(g => g.domain === d);
  const nd = d => r.new_domains.find(g => g.domain === d);
  const drop = d => (r.dropped.find(x => x.domain === d) || {}).reason;
  chk('the competitors checked by Google category: the builder dropped with the reason, the next landscaper taken, three kept, each with the phone and site Google shows', r.checked.length === 4 && r.checked[1].name === 'Brick and Build Ltd' && !r.checked[1].kept && /category Builder, not Landscaper/.test(r.checked[1].why) && r.competitors.map(c => c.name).join('|') === 'Southampton Homes|TM Landscapes & Garden Design|MTM Landscaping & Design Ltd' && r.competitors[1].phone === '+442381449950' && r.competitors[1].domain === 'tmconstruct.co.uk' && r.primary === 'Landscaper', JSON.stringify(r.checked.map(c => [c.name, c.category, c.kept])), '');
  const view = await C.view(edens);
  const rowsWithDomain = view.tiers.flatMap(t => t.rows).filter(x => x.directory.domain).length;
  chk('each competitor searched on every directory on the client\'s list (name, then phone when the name finds nothing)', r.directories_scanned === rowsWithDomain && serps.filter(q => /"TM Landscapes & Garden Design"/.test(q)).length === rowsWithDomain && serps.includes('site:yell.com "+442381550155"') && [...r.competitors[1].listed].sort().join() === 'Checkatrade,FreeIndex,Yell', JSON.stringify({ scanned: r.directories_scanned, rows: rowsWithDomain, tm: r.competitors[1].listed }), '');
  chk('the gaps from the scan: FreeIndex had by two (TM and MTM, DA 55 from the database), Checkatrade and Houzz by one; Yell is not a gap (the client has it) but listed under both', gap('freeindex.co.uk') && gap('freeindex.co.uk').competitors_with === 2 && gap('freeindex.co.uk').competitors.join() === 'TM Landscapes & Garden Design,MTM Landscaping & Design Ltd' && gap('freeindex.co.uk').da === 55 && gap('freeindex.co.uk').source === 'scan' && gap('checkatrade.com').competitors_with === 1 && gap('houzz.co.uk').competitors_with === 1 && !gap('yell.com') && r.also_has.includes('Yell'), JSON.stringify(r.gaps.map(g => [g.domain, g.competitors_with, g.source])), '');
  chk('the backlinks as the second source: TrustATrader (a known directory with a backlink, no listing found by the scan) joins the gaps found by a backlink; the client\'s own referring domain (Checkatrade) is not dropped from the scan gaps', gap('trustatrader.com') && gap('trustatrader.com').source === 'backlinks' && gap('checkatrade.com').source === 'scan', JSON.stringify(gap('trustatrader.com')), '');
  chk('the backlinks drops: a competitor\'s own site, a platform, a spam score of 80, a retired directory, the German directory and the blog from the model', /competitor/.test(drop('southamptonhomes.co.uk')) && /platform/.test(drop('facebook.com')) && /spam score 80/.test(drop('spamlinks.xyz')) && /retired directory \(Rated People\)/.test(drop('ratedpeople.com')) && drop('gardeners-directory.de') === 'not UK' && /not a directory \(blog or news\)/.test(drop('some-blog.co.uk')), [drop('southamptonhomes.co.uk'), drop('facebook.com'), drop('spamlinks.xyz'), drop('ratedpeople.com'), drop('gardeners-directory.de'), drop('some-blog.co.uk')].join(' | '), '');
  chk('a new domain from the backlinks: Hampshire Traders, had by all three, DA 120 from the bulk ranks (not the referring domains rank of 0), not in the database', nd('hampshiretraders.co.uk') && nd('hampshiretraders.co.uk').competitors_with === 3 && nd('hampshiretraders.co.uk').da === 120 && nd('hampshiretraders.co.uk').directory_id === null && nd('hampshiretraders.co.uk').name === 'Hampshire Traders', JSON.stringify(r.new_domains), '');
  chk('the unknown domains went to the model in one call, the known ones not', modelCalls.length === 1 && /hampshiretraders\.co\.uk/.test(modelCalls[0].message) && !/freeindex/.test(modelCalls[0].message), modelCalls[0] && modelCalls[0].message, '');
  chk('the order: most competitors first', r.gaps[0].domain === 'freeindex.co.uk', r.gaps.map(g => g.domain).join(), '');
  const expected = 4 * 0.0054 + serps.length * 0.01 + 4 * 0.02 + 0.02;
  chk('the costs: the profile reads, the searches, the referring domain calls and the bulk ranks summed; the model from its usage; logged', Math.abs(r.cost_usd - expected) < 1e-6 && r.model_cost_usd > 0 && r.model_cost_usd < 0.01 && !r.cap_hit && (await store.costs({ clientId: edens }))[0].kind === 'gaps' && r.searches === serps.length, JSON.stringify({ cost: r.cost_usd, expected, model: r.model_cost_usd, searches: r.searches }), '');
  const last = await gaps.latest(edens);
  chk('latest() returns the run with its lists', last && last.gaps.length === r.gaps.length && last.new_domains.length === 1 && last.checked.length === 4 && last.keyword === 'Landscaper Southampton', JSON.stringify(last && { gaps: last.gaps.length, nd: last.new_domains.length }), '');
  const dir = await gaps.addToDatabase(edens, { domain: 'www.hampshiretraders.co.uk', name: 'Hampshire Traders', url: 'https://hampshiretraders.co.uk/add', tier: 'location', priority: 'P2' });
  const after = await gaps.latest(edens);
  chk('adding a new domain makes a directory row (hand added, live check, every client) and marks it as in the database', dir.domain === 'hampshiretraders.co.uk' && dir.tier === 'location' && dir.priority === 'P2' && dir.needs_live_check && !dir.seeded && after.new_domains[0].directory_id === dir.id && after.new_domains[0].source === 'database', JSON.stringify(after.new_domains[0]), '');
  chk('adding a domain already in the database returns that row', (await gaps.addToDatabase(edens, { domain: 'freeindex.co.uk' })).key === 'freeindex', '', '');
  // The spend cap
  const capped = G.createGaps({ pool, store, clientCitations: C, competitorsFor, dfs, callModel, env: { DATAFORSEO_LOGIN: 'x', DATAFORSEO_PASSWORD: 'y' }, log: quiet, maxUsd: 0.12 });
  const rc = await capped.run(edens);
  chk('a spend cap: the scan stops at the cap with a note, the backlinks method does not run, the cost stays under the cap', rc.cap_hit && rc.cost_usd <= 0.12 && rc.notes.some(n => /spend cap of \$0\.12/.test(n)) && rc.notes.some(n => /backlinks method did not run/.test(n)) && rc.new_domains.length === 0, JSON.stringify({ cost: rc.cost_usd, notes: rc.notes }), '');
  const p = G.parseClassification('Sure:\n[{"domain":"a.co.uk","directory":true,"uk":true,"spam":false,"name":"A","kind":"general directory"}] done', ['a.co.uk', 'b.co.uk']);
  chk('parseClassification: the JSON array inside chatter, an unanswered domain marked', p.get('a.co.uk').directory === true && p.get('b.co.uk').unanswered === true, JSON.stringify([...p]), '');
  const noComp = G.createGaps({ pool, store, clientCitations: C, competitorsFor: async () => ({ keyword: 'x', competitors: [] }), dfs, callModel, env: { DATAFORSEO_LOGIN: 'x', DATAFORSEO_PASSWORD: 'y' }, log: quiet });
  const e = await noComp.run(edens).catch(err => err);
  chk('no saved competitor run: a 400 that says to run the competitor check', e instanceof Error && e.status === 400 && /competitor check/.test(e.message), e && e.message, '');
  const offCat = G.createGaps({ pool, store, clientCitations: C, competitorsFor: async () => ({ keyword: 'Landscaper Southampton', competitors: [{ name: 'Brick and Build Ltd', website: 'https://brickandbuild.co.uk', address: 'Bitterne' }] }), dfs, callModel, env: { DATAFORSEO_LOGIN: 'x', DATAFORSEO_PASSWORD: 'y' }, log: quiet });
  const e2 = await offCat.run(edens).catch(err => err);
  chk('no competitor with the client\'s category: a 400 that says to run the check again', e2 instanceof Error && e2.status === 400 && /has the Google category "Landscaper"/.test(e2.message), e2 && e2.message, '');
  chk('sameCategory: Landscaper matches landscaper, not Landscape designer', G.sameCategory('Landscaper', 'landscaper') && !G.sameCategory('Landscape designer', 'Landscaper'), '', '');

  // ── The GBP competitor check takes the directory database's domains ──
  const places = [{ place_id: 'a', name: 'Hampshire Traders', website: 'https://hampshiretraders.co.uk/listing/1', business_status: 'OPERATIONAL', address: '1 High Street, Southampton', rating: 4, review_count: 10 }, { place_id: 'b', name: 'Real Gardens', website: 'https://realgardens.co.uk', business_status: 'OPERATIONAL', address: '2 Low Road, Southampton', rating: 5, review_count: 3 }];
  const withDb = await runCompetitorCheck({ primary: 'Landscaper', town: 'Southampton', clientName: 'Edens Edge', clientPhone: '', ownPlaceId: '', search: async () => places, directoryDomains: await store.domains() });
  const withoutDb = await runCompetitorCheck({ primary: 'Landscaper', town: 'Southampton', clientName: 'Edens Edge', clientPhone: '', ownPlaceId: '', search: async () => places });
  chk('with the database\'s domains the new directory is skipped as a directory; with the built-in list alone it would count as a competitor', withDb.competitors.length === 1 && withDb.skipped.some(s => /a directory \(hampshiretraders\.co\.uk\)/.test(s.reason)) && withoutDb.competitors.length === 2 && skipReason({ website: 'https://www.yell.com/x', business_status: 'OPERATIONAL', name: 'X', address: '1 Road' }, new Set()) === 'a directory (yell.com)' && DIRECTORY_DOMAINS.includes('yell.com'), JSON.stringify(withDb.skipped), '');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
