'use strict';
// Fixture: the FAQ service end to end (F1 to F3) on pg-mem (in-memory Postgres),
// with a fake Perplexity that returns the manual Edens Edge run and a sort model
// that replays the saved real tidy replies. Research starts by itself once, is
// saved against the client, sorting runs by itself after it, the card's view,
// approval and hand edits, the homepage questions, a refused research reply, the
// restart recovery path, and approvals carried over to a new research run.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '../..');
const { newDb, DataType } = require('pg-mem');
const { createFaqService } = require(path.join(root, 'faq-service.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const C = require(path.join(__dirname, 'data/faq-clients.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
const throwsMsg = async fn => { try { await fn(); return ''; } catch (e) { return e.message; } };
const until = async (fn, ms = 5000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await new Promise(r => setTimeout(r, 20)); } return false; };
console.log('\n=== FIXTURE: FAQ service (pg-mem, fake Perplexity, replayed tidy replies) ===\n');

(async () => {
  const mem = newDb();
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: DataType.uuid, implementation: () => crypto.randomUUID(), impure: true });
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  await pool.query(`CREATE TABLE clients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, trade TEXT NOT NULL);
    CREATE TABLE client_assets (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES clients(id), asset_type TEXT NOT NULL, filename TEXT, content TEXT NOT NULL, metadata JSONB, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
    CREATE TABLE research_jobs (id UUID PRIMARY KEY, session_id TEXT NOT NULL, client_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status TEXT NOT NULL, preset TEXT NOT NULL, locations JSONB NOT NULL);`);
  const clientId = (await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge', 'Landscaper') RETURNING id`)).rows[0].id;

  const edens = C.byId['edens-edge'];
  let cv = { ...edens.cvThin };
  const onboardingText = 'Q: Full Name\nA: Test Person\n\nQ: How quickly can you typically get started on a new job?\nA: Usually the same week';
  const loadContext = async () => ({ cv, pages: edens.pages, keyValueMap: edens.keyValueMap, serviceParentMap: edens.serviceParentMap, trade: 'Landscaper', v20TestMode: true, onboardingText });
  const loadNiche = () => ({ niche: edens.niche });

  // research_jobs as server.js keeps them
  const mapJobs = new Map();
  const jobs = {
    create: async r => { mapJobs.set(r.id, r); await pool.query(`INSERT INTO research_jobs (id, session_id, client_id, status, preset, locations) VALUES ($1,$2,$3,$4,$5,$6)`, [r.id, r.sessionId, r.clientId, r.status, r.preset, JSON.stringify(r.locations)]); },
    update: async (r, code, patch) => {
      r.locations[code] = { ...r.locations[code], ...patch };
      r.status = Object.values(r.locations).every(l => l.status === 'done') ? 'done' : Object.values(r.locations).every(l => ['done', 'failed', 'validation_failed'].includes(l.status)) ? 'failed' : 'running';
      await pool.query(`UPDATE research_jobs SET locations=$1, status=$2 WHERE id=$3`, [JSON.stringify(r.locations), r.status, r.id]);
    },
    load: async id => mapJobs.get(id) || null,
  };

  const runText = fs.readFileSync(edens.researchFile, 'utf8');
  let pxReply = { output_text: runText, usage: { input_tokens: 1000, output_tokens: 5000, cost: { total_cost: 0.42 } } };
  const prompts = [];
  const perplexity = {
    preset: 'medium', timeoutMs: 60000,
    submit: async prompt => { prompts.push(prompt); return 'px-' + prompts.length; },
    poll: async () => pxReply,
    text: r => r.output_text || '',
    resolveCitations: t => ({ text: t }),
  };
  const replies = JSON.parse(fs.readFileSync(path.join(__dirname, 'faq-sort-replies/edens-edge.json'), 'utf8')).replies;
  let sortCalls = 0;
  // The saved real replies; when the client has customers' questions, a C- answer is
  // added in front of the saved reply (only to drive the code path, not as expected output)
  const callSortModel = async (system, message) => {
    const raw = replies[(sortCalls++) % replies.length];
    const ids = [...message.matchAll(/^  (C-\d+) \| /gm)].map(m => m[1]);
    if (!ids.length) return raw;
    const reply = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    reply.questions.unshift(...ids.map(id => ({ id, doubt: 'Process', page: 'Homepage', wording: 'Will you take the old patio away?', fact: '', service: 'General' })));
    return JSON.stringify(reply);
  };
  let placed = {};
  const svc = createFaqService({
    pool, loadContext, loadNiche, perplexity, jobs, callSortModel,
    latestPageQuestions: async () => placed,
    homepageDecisions: (ctx, niche, faqResearch) => computeDecisions({ cv: ctx.cv, niche, pages: ctx.pages, keyValueMap: ctx.keyValueMap, serviceParentMap: ctx.serviceParentMap, v20TestMode: true, allocationData: null, faqResearch }),
    log: { log() {}, warn() {}, error() {} },
  });

  // ── Before anything ──
  let v = await svc.view(clientId, null);
  chk('Card before any research: no job, no research, no questions', !v.job && !v.research && !v.questions.length, JSON.stringify({ job: v.job, research: !!v.research }), 'empty');
  chk('Card before any research: says what the research will use (no dossiers yet)', v.inputs && v.inputs.dossiers.length === 0 && v.inputs.onboarding === 1 && v.inputs.facts > 0, JSON.stringify(v.inputs), '0 dossiers, 1 onboarding answer');
  // The area research saves the Southampton dossier first
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'geo_dossier', 'Southampton_dossier.md', $2, $3)`,
    [clientId, fs.readFileSync(path.join(__dirname, 'southampton-dossier.md'), 'utf8'), JSON.stringify({ location_name: 'Southampton', superseded: false })]);
  await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content, metadata) VALUES ($1, 'geo_dossier', 'Romsey_dossier.md', 'old', $2)`,
    [clientId, JSON.stringify({ location_name: 'Romsey', superseded: true })]);
  v = await svc.view(clientId, null);
  chk('Card: the saved dossier is listed; a superseded one is not', JSON.stringify(v.inputs.dossiers) === '["Southampton"]', JSON.stringify(v.inputs.dossiers), '["Southampton"]');
  let hp = await svc.homepageFaq(clientId, await loadContext(), edens.niche);
  chk('Homepage without sorted questions: niche questions, with an F-FAQ flag', !hp.faqResearch.length && hp.flags.some(f => f.code === 'F-FAQ' && /No FAQ questions sorted/.test(f.msg)), hp.flags.map(f => f.msg).join('; '), 'F-FAQ');

  // ── F1: starts by itself once (Run Research), saved against the client ──
  const started = await svc.maybeAutoResearch(clientId, null);
  chk('Run Research starts the FAQ research once', !!(started && started.jobId), JSON.stringify(started), 'a job id');
  chk('Starting again while it runs is refused', /already running/.test(await throwsMsg(() => svc.startResearch(clientId, null))), '', 'already running');
  await until(async () => !svc.isResearchRunning(clientId));
  await until(async () => !!(await svc.loadSort(clientId)));
  chk('The prompt sent has the client block (Southampton, turf laying)', /Primary city: Southampton/.test(prompts[0]) && /turf laying/.test(prompts[0]), prompts[0].slice(-300), 'client block');
  chk('The prompt has the local knowledge from the saved dossier', /=== LOCAL KNOWLEDGE FROM THE AREA RESEARCH ===\nSouthampton:\n  Local problems: Mixed geology/.test(prompts[0]) && /Conservation areas: Portswood/.test(prompts[0]), '', 'Southampton local knowledge');
  chk('The prompt has the onboarding answers, without the name', /Usually the same week/.test(prompts[0]) && !/Test Person/.test(prompts[0]), '', 'start time answer, no name');
  const research = await svc.latestResearch(clientId);
  chk('Research saved against the client (40 questions, cost kept)', research && research.parsed.questions.length === 40 && research.meta.cost === 0.42, research && research.meta.question_count, 40);
  const job = (await pool.query(`SELECT status, locations FROM research_jobs WHERE client_id=$1`, [clientId])).rows[0];
  chk('research_jobs row FAQ marked done with its asset', job.status === 'done' && job.locations.FAQ.status === 'done' && job.locations.FAQ.assetId === research.id, JSON.stringify(job.locations.FAQ).slice(0, 120), 'done');
  chk('Run Research again does not start a second FAQ research', (await svc.maybeAutoResearch(clientId, null)) === null, '', 'null');

  // ── F2: sorting ran by itself ──
  v = await svc.view(clientId, null);
  chk('Sorting ran by itself after the research (2 tidy calls)', v.sort && sortCalls === 2 && v.questions.length === 40, `${sortCalls} calls, ${v.questions.length} questions`, '2 calls, 40 questions');
  chk('Card: research ranges, rules and gaps for onboarding', v.research.ranges.length === 10 && v.research.rules.length === 12 && v.research.gaps.length === 12, '', '10, 12, 12');
  chk('Card: nothing approved, so the homepage uses no research question', v.homepageUsed && v.homepageUsed.length === 0, JSON.stringify(v.homepageUsed), '[]');
  chk('Card: the waiting list names deposit and stage payments, with its onboarding question',
    v.waitingByFact.some(w => w.fact === 'deposit_terms' && /Do you take a deposit\?/.test(w.question)), v.waitingByFact.map(w => w.label).join('; '), 'deposit_terms');
  chk('Card: page options include the homepage and Remove is handled by the screen', v.pageOptions[0].id === 'homepage:homepage' && v.pageOptions.some(o => o.id === 'service:/services/patio-paving'), v.pageOptions.length, 'homepage first');
  const q37 = v.questions.find(q => q.id === 'Q-37');
  chk('Card: Q-37 placed on the homepage', q37.placement && q37.placement.page === 'homepage:homepage', JSON.stringify(q37.placement), 'homepage');
  const q1 = v.questions.find(q => q.id === 'Q-1');
  chk('Card: Q-1 held for a Cost Guide page', q1.placement && q1.placement.held === 'costGuide', JSON.stringify(q1.placement), 'costGuide');
  hp = await svc.homepageFaq(clientId, await loadContext(), edens.niche);
  chk('F-FAQ flag: a homepage question waits for its wording to be approved', hp.flags.some(f => /1 homepage FAQ question\(s\) are waiting for their wording to be approved/.test(f.msg)), hp.flags.map(f => f.msg).join('; '), '1 waiting');

  // ── Approval and hand edits ──
  const bad = await throwsMsg(() => svc.updateQuestions(clientId, [{ id: 'Q-37', wording: 'Is my tree protected — and how do I check?' }], null));
  chk('A wording with a dash is refused, with the reason', /Q-37: it has a dash/.test(bad), bad, 'Q-37: it has a dash');
  v = await svc.view(clientId, null);
  chk('…and nothing is saved', v.questions.find(q => q.id === 'Q-37').wording === q37.wording, v.questions.find(q => q.id === 'Q-37').wording, q37.wording);
  v = await svc.updateQuestions(clientId, v.questions.filter(q => !q.wording_errors.length).map(q => ({ id: q.id, approved: true })), null);
  chk('Approve all clean wording: the homepage now uses Q-37 at Q7', v.homepageUsed.length === 1 && v.homepageUsed[0].slot === 'Q7' && v.homepageUsed[0].id === 'Q-37', JSON.stringify(v.homepageUsed), 'Q7 Q-37');
  v = await svc.updateQuestions(clientId, [{ id: 'Q-37', wording: 'Is my tree protected by a preservation order?' }], null);
  const e37 = v.questions.find(q => q.id === 'Q-37');
  chk('An edited wording is saved and needs approving again', e37.wording === 'Is my tree protected by a preservation order?' && e37.edited && !e37.approved && v.homepageUsed.length === 0, JSON.stringify({ w: e37.wording, a: e37.approved }), 'edited, not approved');
  v = await svc.updateQuestions(clientId, [{ id: 'Q-37', approved: true }], null);
  chk('Approved again: the edited wording reaches the homepage', v.homepageUsed[0] && v.homepageUsed[0].question === 'Is my tree protected by a preservation order?', JSON.stringify(v.homepageUsed), 'edited wording');
  v = await svc.updateQuestions(clientId, [{ id: 'Q-37', page_override: 'drop' }], null);
  chk('Removed by hand: off the homepage', v.homepageUsed.length === 0 && v.questions.find(q => q.id === 'Q-37').placement.held === 'dropped', JSON.stringify(v.homepageUsed), '[]');
  v = await svc.updateQuestions(clientId, [{ id: 'Q-37', page_override: null }], null);
  chk('Back to Auto: on the homepage again', v.homepageUsed.length === 1, JSON.stringify(v.homepageUsed), '1');
  chk('A move to a page the client does not have is refused', /no such page/.test(await throwsMsg(() => svc.updateQuestions(clientId, [{ id: 'Q-4', page_override: 'service:/nowhere' }], null))), '', 'refused');

  // Facts supplied on the Client Values step release the waiting questions
  cv = { ...edens.cvRich };
  hp = await svc.homepageFaq(clientId, await loadContext(), edens.niche);
  chk('Rich values: the approved homepage questions waiting on facts are released (Q-4 first)', hp.faqResearch.map(q => q.research_id).join(' ') === 'Q-4 Q-11 Q-40 Q-5 Q-12 Q-37', hp.faqResearch.map(q => q.research_id).join(' '), 'Q-4 Q-11 Q-40 Q-5 Q-12 Q-37');

  // A saved homepage keeps its questions
  placed = { 'homepage:homepage': ['Is my tree protected by a preservation order?'] };
  hp = await svc.homepageFaq(clientId, await loadContext(), edens.niche);
  chk('A question on the saved homepage comes first', hp.faqResearch[0].research_id === 'Q-37', hp.faqResearch.map(q => q.research_id).join(' '), 'Q-37 first');
  placed = {};

  // ── The customers' own questions go in first ──
  cv = { ...edens.cvRich, customer_questions: ['Will you take the old patio away?'] };
  v = await svc.view(clientId, null);
  chk("Customers' questions added on Client Values: the card says to re-run the sorting", v.sort.customersChanged === true, v.sort.customersChanged, true);
  hp = await svc.homepageFaq(clientId, await loadContext(), edens.niche);
  chk('…and so does the decisions preview (F-FAQ)', hp.flags.some(f => /customers' questions on Client Values changed/.test(f.msg)), hp.flags.map(f => f.msg).join('; '), 'F-FAQ');
  await svc.runSort(clientId, null);
  v = await svc.view(clientId, null);
  const own1 = v.questions.find(q => q.id === 'C-1');
  chk("After sorting: C-1 is the client's, first in the list, on the homepage", v.questions[0].id === 'C-1' && own1.source === 'client' && own1.placement && own1.placement.page === 'homepage:homepage' && !v.sort.customersChanged,
    JSON.stringify({ first: v.questions[0].id, src: own1 && own1.source, place: own1 && own1.placement }), 'C-1 first, homepage');
  v = await svc.updateQuestions(clientId, [{ id: 'C-1', approved: true }], null);
  hp = await svc.homepageFaq(clientId, await loadContext(), edens.niche);
  chk("Approved: the customer's question is the homepage's first research question", hp.faqResearch[0] && hp.faqResearch[0].research_id === 'C-1', hp.faqResearch.map(q => q.research_id).join(' '), 'C-1 first');
  cv = { ...edens.cvThin };

  // ── A refused research reply keeps the saved research ──
  pxReply = { output_text: 'I could not find any questions.', usage: {} };
  await svc.startResearch(clientId, null);
  await until(async () => !svc.isResearchRunning(clientId));
  v = await svc.view(clientId, null);
  chk('A reply with no questions: job validation_failed with the reason; the saved research is kept',
    v.job.status === 'validation_failed' && /No questions could be read/.test(v.job.error) && v.research.id === research.id, `${v.job.status}: ${v.job.error}`, 'validation_failed');
  const raw1 = await svc.rawReply(clientId);
  chk('The refused reply is kept as sent (text and full JSON), and the card offers it', raw1.text === 'I could not find any questions.' && raw1.row.rawOutputJson && v.job.hasRaw === true, JSON.stringify({ text: raw1.text, json: !!raw1.row.rawOutputJson, hasRaw: v.job.hasRaw }), 'kept');
  // A job from before 15 Oct kept only the reply's text; once the parser can read it, it can be read again
  // (on a second client: the service remembers this client's refused run as its latest)
  const client2 = (await pool.query(`INSERT INTO clients (name, trade) VALUES ('Edens Edge (old job)', 'Landscaper') RETURNING id`)).rows[0].id;
  const oldJob = { id: crypto.randomUUID(), sessionId: '', clientId: client2, status: 'failed', preset: 'medium', createdAt: Date.now(),
    locations: { FAQ: { name: 'FAQ questions', kind: 'faq', status: 'validation_failed', error: 'No questions could be read from the reply.', rawOutputText: runText } } };
  await jobs.create(oldJob);
  const sortsBefore = sortCalls;
  const rr = await svc.rereadResearch(client2);
  await until(async () => sortCalls >= sortsBefore + 2 && !(await svc.view(client2, null)).running.sort);
  v = await svc.view(client2, null);
  chk('Read again: the saved reply becomes the research without a new Perplexity run, and is sorted', rr.saved && v.research.id === rr.assetId && v.job.status === 'done' && prompts.length === 2 && !v.sort.stale,
    JSON.stringify({ saved: rr.saved, status: v.job.status, perplexityCalls: prompts.length }), 'saved, done, still 2 Perplexity calls');

  // ── Restart recovery path, and approvals carried over to a new run ──
  pxReply = { output_text: runText, usage: {} };
  const rec = { id: crypto.randomUUID(), sessionId: '', clientId, status: 'running', preset: 'medium', locations: { FAQ: { name: 'FAQ questions', kind: 'faq', status: 'running' } }, createdAt: Date.now() };
  await jobs.create(rec);
  const before = sortCalls;
  const done = await svc.finishResearch(rec, clientId, pxReply);
  await until(async () => sortCalls >= before + 2 && !(await svc.view(clientId, null)).running.sort);
  v = await svc.view(clientId, null);
  const all = (await pool.query(`SELECT metadata FROM client_assets WHERE client_id=$1 AND asset_type='faq_research'`, [clientId])).rows.map(r => r.metadata.superseded);
  chk('Recovery: the finished reply is saved as the new research; the older one is superseded', done.saved && v.research.id === done.assetId && all.filter(s => !s).length === 1 && all.length === 2, JSON.stringify(all), 'one current, one superseded');
  chk('New run re-sorted: not stale, edits and approvals carried over (Q-37 edited, approved)',
    !v.sort.stale && v.questions.find(q => q.id === 'Q-37').edited && v.questions.find(q => q.id === 'Q-37').approved && v.questions.find(q => q.id === 'Q-11').approved,
    JSON.stringify({ stale: v.sort.stale, q37: v.questions.find(q => q.id === 'Q-37').approved }), 'carried over');

  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
