'use strict';
// Fixture: the competitor gap check (citations/gaps.js) on pg-mem with a fake DataForSEO, a
// fake model and a saved competitor run; the directory domains passed to the GBP competitor
// check (gbp/competitors.js). The three competitors' referring domains counted per domain,
// what the client already has dropped (listed rows and the client's own referring domains),
// the competitors' own sites, platforms and spam dropped, known directories as gaps with
// their tier, cost and DA, the rest classified in one model call (UK directories kept, the
// rest dropped with the reason), the order, the run row, the costs logged, adding a gap to
// the database, and the classifier's answer parser.
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
  const C = CL.createClientCitations({ pool, store, filloutService: null, placesStore: null, approvedTiers: null, clientValues: async () => ({ company_name: 'Edens Edge Landscaping', phone: '07850 412717' }), siteUrlFor: async () => 'https://edensedge.co.uk/' });
  await C.saveRow(edens, (await store.byKey('yell')).id, { listed: 'yes', live_url: 'https://www.yell.com/biz/x/' });

  const asked = [];
  const refs = {
    'edensedge.co.uk': [{ domain: 'www.checkatrade.com', rank: 700, backlinks: 2, spam_score: 0 }],
    'southamptonlandscapes.co.uk': [{ domain: 'www.yell.com', rank: 650, backlinks: 3, spam_score: 0 }, { domain: 'www.freeindex.co.uk', rank: 400, backlinks: 1, spam_score: 5 }, { domain: 'www.checkatrade.com', rank: 700, backlinks: 1, spam_score: 0 }, { domain: 'hampshiretraders.co.uk', rank: 120, backlinks: 1, spam_score: 10 }, { domain: 'www.facebook.com', rank: 900, backlinks: 5, spam_score: 0 }, { domain: 'spamlinks.xyz', rank: 10, backlinks: 50, spam_score: 80 }, { domain: 'ratedpeople.com', rank: 500, backlinks: 1, spam_score: 0 }],
    'greenfingers-hants.co.uk': [{ domain: 'www.freeindex.co.uk', rank: 400, backlinks: 2, spam_score: 5 }, { domain: 'hampshiretraders.co.uk', rank: 120, backlinks: 2, spam_score: 10 }, { domain: 'gardeners-directory.de', rank: 200, backlinks: 1, spam_score: 0 }, { domain: 'some-blog.co.uk', rank: 150, backlinks: 1, spam_score: 0 }, { domain: 'southamptonlandscapes.co.uk', rank: 100, backlinks: 1, spam_score: 0 }],
    'solentgardens.co.uk': [{ domain: 'hampshiretraders.co.uk', rank: 120, backlinks: 1, spam_score: 10 }, { domain: 'www.houzz.co.uk', rank: 600, backlinks: 1, spam_score: 0 }, { domain: 'trustatrader.com', rank: 550, backlinks: 1, spam_score: 0 }],
  };
  const dfs = { configured: () => true, referringDomains: async target => { asked.push(target); return { items: (refs[target] || []).map(i => ({ ...i, first_seen: '2025-01-01' })), cost: 0.02, total: (refs[target] || []).length }; } };
  const modelCalls = [];
  const callModel = async ({ system, message, model }) => {
    modelCalls.push({ system, message, model });
    const domains = [...message.matchAll(/^- (.+)$/gm)].map(m => m[1]);
    const answer = domains.map(d => ({ domain: d, directory: d === 'hampshiretraders.co.uk' || d === 'gardeners-directory.de', uk: d !== 'gardeners-directory.de', spam: false, name: d === 'hampshiretraders.co.uk' ? 'Hampshire Traders' : '', kind: d === 'hampshiretraders.co.uk' ? 'local directory' : d === 'some-blog.co.uk' ? 'blog or news' : 'general directory' }));
    return { text: 'Here you go:\n' + JSON.stringify(answer), usage: { input_tokens: 1000, output_tokens: 300, model: 'claude-haiku-5-5' } };
  };
  const competitorsFor = async () => ({ keyword: 'landscaper southampton', competitors: [{ name: 'Southampton Landscapes', website: 'https://www.southamptonlandscapes.co.uk/', place_id: 'p1' }, { name: 'Green Fingers Hants', website: 'https://greenfingers-hants.co.uk', place_id: 'p2' }, { name: 'Solent Gardens', website: 'http://solentgardens.co.uk/', place_id: 'p3' }, { name: 'Fourth One', website: 'https://fourth.example/', place_id: 'p4' }, { name: 'No site', website: '', place_id: 'p5' }] });
  const gaps = G.createGaps({ pool, store, clientCitations: C, competitorsFor, dfs, callModel, env: { DATAFORSEO_LOGIN: 'x', DATAFORSEO_PASSWORD: 'y' }, log: quiet });

  const r = await gaps.run(edens);
  const gap = d => r.gaps.find(g => g.domain === d);
  const drop = d => (r.dropped.find(x => x.domain === d) || {}).reason;
  chk('the top three competitors with a website, by their registrable domain', r.competitors.length === 3 && r.competitors.map(c => c.domain).join() === 'southamptonlandscapes.co.uk,greenfingers-hants.co.uk,solentgardens.co.uk' && r.keyword === 'landscaper southampton', JSON.stringify(r.competitors), '');
  chk('referring domains asked for the client and each competitor', asked.join() === 'edensedge.co.uk,southamptonlandscapes.co.uk,greenfingers-hants.co.uk,solentgardens.co.uk', asked.join(), '');
  chk('a known directory is a gap with its tier, cost, priority and DA from the database, and how many of the three have it', gap('freeindex.co.uk') && gap('freeindex.co.uk').source === 'database' && gap('freeindex.co.uk').tier === 'uk_core' && gap('freeindex.co.uk').cost === 'free' && gap('freeindex.co.uk').da === 55 && gap('freeindex.co.uk').competitors_with === 2 && gap('freeindex.co.uk').competitors.join() === 'Southampton Landscapes,Green Fingers Hants', JSON.stringify(gap('freeindex.co.uk')), '');
  chk('a known directory with no DA shows the DataForSEO rank', gap('houzz.co.uk') && gap('houzz.co.uk').da === 600 && gap('trustatrader.com').competitors_with === 1, JSON.stringify(gap('houzz.co.uk')), '');
  chk('the client has Yell (listed) and Checkatrade (its own referring domains): both dropped', drop('yell.com') === 'the client has it' && drop('checkatrade.com') === 'the client has it' && !gap('yell.com'), drop('yell.com') + ' / ' + drop('checkatrade.com'), '');
  chk('a competitor\'s own site, a platform, a spam score of 80 and a retired directory are dropped with the reason', /competitor/.test(drop('southamptonlandscapes.co.uk')) && /platform/.test(drop('facebook.com')) && /spam score 80/.test(drop('spamlinks.xyz')) && /retired directory \(Rated People\)/.test(drop('ratedpeople.com')), [drop('southamptonlandscapes.co.uk'), drop('facebook.com'), drop('spamlinks.xyz'), drop('ratedpeople.com')].join(' | '), '');
  chk('the unknown domains go to the model in one call with the classifier prompt and the keyword', modelCalls.length === 1 && /JSON array/.test(modelCalls[0].system) && /hampshiretraders\.co\.uk/.test(modelCalls[0].message) && /landscaper southampton/.test(modelCalls[0].message) && modelCalls[0].model === 'claude-haiku-5-5' && !/freeindex/.test(modelCalls[0].message), modelCalls[0] && modelCalls[0].message, '');
  chk('a UK directory the model recognises is a gap from the model with its name, had by all three, first in the list', gap('hampshiretraders.co.uk') && gap('hampshiretraders.co.uk').source === 'model' && gap('hampshiretraders.co.uk').name === 'Hampshire Traders' && gap('hampshiretraders.co.uk').competitors_with === 3 && gap('hampshiretraders.co.uk').directory_id === null && r.gaps[0].domain === 'hampshiretraders.co.uk', JSON.stringify(r.gaps.map(g => [g.domain, g.competitors_with])), '');
  chk('a German directory and a blog are dropped with the model\'s reason', drop('gardeners-directory.de') === 'not UK' && /not a directory \(blog or news\)/.test(drop('some-blog.co.uk')), [drop('gardeners-directory.de'), drop('some-blog.co.uk')].join(' | '), '');
  chk('the order: most competitors first, then DA', r.gaps.map(g => g.domain).join() === 'hampshiretraders.co.uk,freeindex.co.uk,houzz.co.uk,trustatrader.com', r.gaps.map(g => g.domain).join(), '');
  chk('the costs: four DataForSEO calls at $0.02 and the model call from its usage, kept on the run and logged', Math.abs(r.cost_usd - 0.08) < 1e-9 && r.model_cost_usd > 0 && r.model_cost_usd < 0.01 && r.calls === 5 && (await store.costs({ clientId: edens }))[0].kind === 'gaps', JSON.stringify({ cost: r.cost_usd, model: r.model_cost_usd, calls: r.calls }), '');
  const last = await gaps.latest(edens);
  chk('latest() returns the run with its lists', last && last.gaps.length === 4 && last.dropped.length >= 7 && last.keyword === 'landscaper southampton', JSON.stringify(last && { gaps: last.gaps.length, dropped: last.dropped.length }), '');
  const dir = await gaps.addToDatabase(edens, { domain: 'www.hampshiretraders.co.uk', name: 'Hampshire Traders', url: 'https://hampshiretraders.co.uk/add', tier: 'location', priority: 'P2' });
  const after = await gaps.latest(edens);
  chk('adding a gap makes a directory row (hand added, live check, every client) and marks the gap as in the database', dir.domain === 'hampshiretraders.co.uk' && dir.tier === 'location' && dir.priority === 'P2' && dir.needs_live_check && !dir.seeded && after.gaps[0].directory_id === dir.id && after.gaps[0].source === 'database', JSON.stringify(after.gaps[0]), '');
  chk('adding a domain already in the database returns that row', (await gaps.addToDatabase(edens, { domain: 'freeindex.co.uk' })).key === 'freeindex', '', '');
  const p = G.parseClassification('Sure:\n[{"domain":"a.co.uk","directory":true,"uk":true,"spam":false,"name":"A","kind":"general directory"}] done', ['a.co.uk', 'b.co.uk']);
  chk('parseClassification: the JSON array inside chatter, an unanswered domain marked', p.get('a.co.uk').directory === true && p.get('b.co.uk').unanswered === true, JSON.stringify([...p]), '');
  const noComp = G.createGaps({ pool, store, clientCitations: C, competitorsFor: async () => ({ keyword: 'x', competitors: [] }), dfs, callModel, env: { DATAFORSEO_LOGIN: 'x', DATAFORSEO_PASSWORD: 'y' }, log: quiet });
  const e = await noComp.run(edens).catch(err => err);
  chk('no competitor with a website: a 400 that says to run the competitor check', e instanceof Error && e.status === 400 && /competitor check/.test(e.message), e && e.message, '');

  // ── The GBP competitor check takes the directory database's domains ──
  const places = [{ place_id: 'a', name: 'Hampshire Traders', website: 'https://hampshiretraders.co.uk/listing/1', business_status: 'OPERATIONAL', address: '1 High Street, Southampton', rating: 4, review_count: 10 }, { place_id: 'b', name: 'Real Gardens', website: 'https://realgardens.co.uk', business_status: 'OPERATIONAL', address: '2 Low Road, Southampton', rating: 5, review_count: 3 }];
  const withDb = await runCompetitorCheck({ primary: 'Landscaper', town: 'Southampton', clientName: 'Edens Edge', clientPhone: '', ownPlaceId: '', search: async () => places, directoryDomains: await store.domains() });
  const withoutDb = await runCompetitorCheck({ primary: 'Landscaper', town: 'Southampton', clientName: 'Edens Edge', clientPhone: '', ownPlaceId: '', search: async () => places });
  chk('with the database\'s domains the new directory is skipped as a directory; with the built-in list alone it would count as a competitor', withDb.competitors.length === 1 && withDb.skipped.some(s => /a directory \(hampshiretraders\.co\.uk\)/.test(s.reason)) && withoutDb.competitors.length === 2 && skipReason({ website: 'https://www.yell.com/x', business_status: 'OPERATIONAL', name: 'X', address: '1 Road' }, new Set()) === 'a directory (yell.com)' && DIRECTORY_DOMAINS.includes('yell.com'), JSON.stringify(withDb.skipped), '');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
