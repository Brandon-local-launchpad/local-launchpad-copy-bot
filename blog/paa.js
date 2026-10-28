'use strict';

// ── The blog question bank's related questions from Google People also ask ────────────
// (Brandon, 28 Oct, after the thin v2 run: Perplexity cannot see People also ask, and what
// it found was DIY questions from single supplier pages.) Perplexity keeps the targets (the
// BT topics, one CT target per service, one ST target per seasonal topic), the rules and the
// seasonal windows; its related questions are dropped. Each target question goes to the
// DataForSEO SERP API (Google organic, United Kingdom, English, the standard queue, People
// also ask opened two clicks deep); the People also ask questions become that block's
// related questions: the word filter first (no build it yourself, no DIY materials, no other
// trade), then the relevance judge (a model, the cheapest that does it well, against the
// block's target and service: off topic, job seeker, US only, DIY products, trivia go), then
// deduped (against the target, across blocks, within the block), each marked PAA with a doubt
// read off its words. A block under six after that gets one more search, four clicks deep.
// The bank file keeps the prompt's line format, so blog/bank.js reads it unchanged.
//
// Credentials: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD from the environment (the H1
// research's), never logged or stored. The judge's prompt is prompts/Blog_Bank_Relevance_CORE.md.

const fs = require('fs');
const path = require('path');
const { credentials, safeMessage, isBusy } = require('../h1-research/dataforseo');
const B = require('./bank');

const API = 'https://api.dataforseo.com/v3/serp/google/organic';
const UK = { location_code: 2826, language_code: 'en' };
const CLICK_DEPTH = 2;
const DEEP_CLICK_DEPTH = 4;  // the second search of a block under DEEPEN_UNDER
const DEEPEN_UNDER = 6;
const BATCH = 100;           // tasks per task_post call (the API's limit)
const MAX_PER_BLOCK = 12;    // related questions kept per block at most
const MIN_PER_BLOCK = 3;     // under this, the block is listed in GAPS (its post is held)
const RELEVANCE_MODEL = 'claude-haiku-5-5';
const RELEVANCE_PROMPT = path.join(__dirname, '..', 'prompts', 'Blog_Bank_Relevance_CORE.md');

// ── The word filter: build it yourself and DIY materials go, another trade goes; the rest stays ──
// Build it yourself verbs only (Brandon, 28 Oct): a fix, repair or "how do I stop" question is the
// homeowner's before hiring and stays
const DIY_VERBS = 'build|make|install|lay|fit|put up|put down|put in|take down|take up|cut|mix|pour|drill|attach|screw|nail|paint|stain|oil|treat|seal|dig|level|run|wire|plumb|erect|assemble|construct|lift|move|sand|varnish|weld|glue|bolt|hang|mount|plant|sow|spread|compact';
const DIY_RE = new RegExp(`^(?:how (?:do|can|could|should|would|to) (?:i|we|you)\\b.*\\b(?:${DIY_VERBS})\\b|how to\\b.*\\b(?:${DIY_VERBS})\\b|can (?:i|we) (?:just |simply |easily )?(?:${DIY_VERBS})\\b|(?:what|which) (?:size|grade|type|kind|thickness|depth|gauge) (?:of )?(?:timber|wood|screw|screws|nail|nails|sand|cement|concrete|aggregate|mortar|membrane|pipe|gravel|stone|slab|slabs|post|posts|bolt|bolts|fixings?|joist|joists|c16|c24|mm)\\b|what tools?\\b|(?:do|will) (?:i|we) need (?:a|an|to use) (?:[a-z]+ )?(?:saw|drill|mixer|spirit level|spade|wacker|plate compactor|whacker|cement mixer|jigsaw|router)\\b)`, 'i');
// A rule or permission question ("Can I put up a 10 foot fence?", "Can I level my garden without planning permission?") is the homeowner's, whatever verb it uses
const RULE_Q_RE = /\b(?:planning permission|permission|permitted|allowed|legal|legally|the law|rules?|regulations?|neighbours?|neighbors?|council|boundary|boundaries|\d+ ?(?:foot|ft|feet|metres?|m) (?:high|tall|fence|wall|hedge))\b/i;
const DIY_WORDS_RE = /\b(?:diy|myself|yourself|ourselves|by hand|on my own)\b/i;
// A materials or fixings question ("Can I use C16 timber for a decking frame?") is the DIYer's, not the hirer's
const MATERIAL_RE = /\b(?:c16|c24|\d+ ?mm|timber|joists?|screws?|nails?|postcrete|cement|mortar|hardcore|mot type ?1|sharp sand|building sand|kiln[- ]dried sand|ballast|geotextile|weed membrane|rebar|dpc|sub ?base depth|how (?:deep|thick) should)\b/i;
const MATERIAL_ASK_RE = /^(?:can|could|should|do|does|what|which|how deep|how thick|how many|is it ok to)\b/i;
const OTHER_TRADES = ['roof', 'roofer', 'roofing', 'roofs', 'gutter', 'gutters', 'guttering', 'boiler', 'boilers', 'plumber', 'plumbing', 'radiator', 'radiators', 'electrician', 'wiring', 'socket', 'sockets', 'fuse box', 'consumer unit', 'loft', 'plaster', 'plastering', 'plasterer', 'render', 'rendering', 'kitchen', 'bathroom', 'tiler', 'tiling', 'windows', 'double glazing', 'conservatory', 'extension', 'damp', 'chimney', 'carpet', 'carpets', 'laminate', 'painter', 'decorator', 'locksmith', 'solar panels', 'heat pump', 'insulation', 'scaffolding', 'removals', 'cleaner', 'cleaning', 'pest', 'wasp', 'rat', 'rats', 'mice', 'garage door', 'driveway gates', 'electric gates', 'cctv', 'alarm'];

// niche: the niche entry, whose service terms are never "another trade" (fencing is a landscaper's)
function classify(question, { niche = null } = {}) {
  const q = String(question || '').trim();
  if (!q) return { keep: false, why: 'empty' };
  const lower = q.toLowerCase();
  if (RULE_Q_RE.test(lower)) return { keep: true, why: '' };
  if (DIY_RE.test(lower) || DIY_WORDS_RE.test(lower)) return { keep: false, why: 'DIY how to' };
  if (MATERIAL_RE.test(lower) && MATERIAL_ASK_RE.test(lower) && !/\b(?:cost|price|quote|charge|worth)\b/.test(lower)) return { keep: false, why: 'DIY materials' };
  const own = new Set(((niche && niche.service_terms) || []).map(s => String(s).toLowerCase()));
  const ownWords = new Set([...own].flatMap(s => s.split(/\s+/)));
  for (const w of OTHER_TRADES) {
    if (own.has(w) || ownWords.has(w)) continue;
    if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(lower)) return { keep: false, why: `another trade (${w})` };
  }
  return { keep: true, why: '' };
}

// ── Two People also ask questions that are one question ──
// (blog/same-question.js is tuned to the FAQ wordings, with synonyms and a "shorter fully inside"
// rule too loose here: "What is tree cabling and bracing?" is not "Can a split tree be saved with
// cabling and bracing?"). The stems: every word but the question words, articles and pronouns,
// lightly stemmed (causes and cause, turning and turn, decking and deck are one).
const PAA_STOP = new Set('a an the and or of to in on at for by with from into onto over under about as is are was were be been being do does did can could should would will shall may might must i we you he she it they me us them my our your his her its their this that these those what which who whom whose when where why how there here than then if so not no yes any some all every each much many more most very really actually just still ever also too uk england britain british'.split(' '));
const paaStem = w => { let x = w; if (x.length <= 3) return x; x = x.replace(/ies$/, 'y'); if (!/(?:ss|us|is)$/.test(x)) x = x.replace(/(?:ches|shes|xes|ses)$/, m => m.slice(0, -2)).replace(/s$/, ''); x = x.replace(/(?:ing|ed)$/, ''); if (x.length > 4) x = x.replace(/e$/, ''); return x; };
const paaStems = q => new Set(String(q || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(w => w && !PAA_STOP.has(w)).map(paaStem).filter(w => w.length >= 2));
const GENERIC_STEMS = new Set(['caus', 'reason', 'happen', 'way', 'best', 'good', 'bad', 'better', 'wors', 'need', 'want', 'get', 'mak', 'thing', 'typ', 'kind', 'usual', 'common', 'normal', 'possibl', 'ok', 'okay', 'fine', 'new', 'old', 'own', 'garden', 'hous', 'hom', 'properti']);
function samePaa(a, b) {
  const A = paaStems(a), Bs = paaStems(b);
  if (!A.size || !Bs.size) return false;
  let both = 0; for (const w of A) if (Bs.has(w)) both++;
  if (both < 2) return false;
  const j = both / (A.size + Bs.size - both);
  if (j >= 0.75) return true;
  // At six in ten the two differ on a word: one question when what differs on one side is a
  // generic ("what causes a pond to turn green" is "why is my garden pond turning green"), two
  // when each side has its own subject ("…permission for a garden shed" is not "…for decking")
  const onlyA = [...A].filter(w => !Bs.has(w)), onlyB = [...Bs].filter(w => !A.has(w));
  const generic = ws => ws.every(w => GENERIC_STEMS.has(w));
  return j >= 0.6 && (generic(onlyA) || generic(onlyB));
}
// In a cost block, the cost question in other words ("How much does a 25m2 deck cost?", "What is the
// average price of decking?") is not a related question (the prompt's rule); a question with an
// angle (what a quote includes, what is extra, labour, per hour, cheaper, worth it) stays
const COST_AGAIN_RE = /^(?:how much (?:does|do|is|are|should|would|will|to)|what(?:'s| is| are) the (?:average |typical |going |usual )?(?:cost|price|rate)s?\b|what does .* cost\??$|how expensive)/i;
const COST_ANGLE_RE = /\b(?:include|included|includes|extra|quote|quotes|labour|labor|per hour|per day|day rate|hourly|deposit|vat|cheaper|cheapest|save|saving|worth|maintain|maintenance|upkeep|supply|fit only|remove|removal|waste|more|less|add|adds|increase|reduce|why|without|yourself|myself|diy|small|large|big|vs|versus|or|compared)\b/i;
const costAgain = q => COST_AGAIN_RE.test(String(q).trim()) && !COST_ANGLE_RE.test(q);

// The doubt a question carries, read off its words (the prompt's five)
function doubtOf(question) {
  const q = String(question || '').toLowerCase();
  if (/\b(?:cost|costs|price|prices|£|cheap|cheaper|expensive|charge|charges|pay|paid|worth|afford|quote|quotes|budget|per (?:square )?met|per hour|per day|rate)\b/.test(q)) return 'Price';
  if (/\b(?:insur|guarantee|warranty|review|reviews|trust|qualified|reliable|licen|certif|scam|cowboy|reputable|accredit|registered)\w*/.test(q)) return 'Trust';
  if (/^(?:how (?:is|are|does|do they|do you|will)|what happens|what is the process|what does .* involve|what (?:do|does|should) .* include)\b|\b(?:process|steps|prepare|preparation|involve|included)\b/.test(q)) return 'Process';
  if (/^(?:when|how long|how soon|how often|how early|how late)\b|\b(?:time of year|best time|season|month|months|winter|spring|summer|autumn|how many (?:days|weeks))\b/.test(q)) return 'Timing';
  return 'Fit';
}

// ── The relevance judge: a model on each block's questions, keep or drop with a reason ──
function relevancePrompt(trade) {
  const md = fs.readFileSync(RELEVANCE_PROMPT, 'utf8').replace(/\r\n/g, '\n');
  const m = md.match(/```\n([\s\S]*?)\n```/);
  if (!m) throw new Error('The relevance prompt has no fenced block to send.');
  return m[1].split('[TRADE]').join(trade || 'tradesperson');
}
// callModel({ system, message, maxTokens, model, effort }) → { text, usage } (anthropic-call.js).
// Returns { verdicts: [{ question, keep, why }] in the order given, usage }; a call that fails or
// answers badly keeps every question with why "not judged: …", so a model outage never empties a block.
async function judgeRelevance({ trade, block, questions, callModel, model = RELEVANCE_MODEL }) {
  if (!questions.length) return { verdicts: [], usage: null };
  const system = relevancePrompt(trade);
  const message = [`TRADE: ${trade || 'tradesperson'}`, `TARGET QUESTION: ${block.question}`, `SERVICE: ${block.service || 'General'}`, '', 'QUESTIONS:', ...questions.map((q, i) => `${i + 1}. ${q}`)].join('\n');
  let text = '', usage = null;
  try { const r = await callModel({ system, message, maxTokens: 1500, model, effort: 'low' }); text = r.text || ''; usage = r.usage || null; } catch (e) { return { verdicts: questions.map(q => ({ question: q, keep: true, why: `not judged: ${e.message}` })), usage: null }; }
  let list = null;
  try { const m = text.match(/\[[\s\S]*\]/); list = m ? JSON.parse(m[0]) : null; } catch (_) { list = null; }
  if (!Array.isArray(list)) return { verdicts: questions.map(q => ({ question: q, keep: true, why: 'not judged: no JSON in the reply' })), usage };
  const byN = new Map(list.filter(x => x && typeof x === 'object').map(x => [Number(x.n), x]));
  return { verdicts: questions.map((q, i) => { const v = byN.get(i + 1); if (!v) return { question: q, keep: true, why: 'not judged: missing from the reply' }; return { question: q, keep: v.keep !== false, why: v.keep === false ? String(v.why || 'relevance').trim() : '' }; }), usage };
}

// ── DataForSEO: the People also ask questions for each target, through the standard queue ──
const auth = creds => 'Basic ' + Buffer.from(`${creds.login}:${creds.password}`).toString('base64');
async function call(url, { creds, fetchImpl, body = null, timeoutMs = 60000 }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { method: body ? 'POST' : 'GET', headers: { Authorization: auth(creds), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    if (!res.ok || !json) throw Object.assign(new Error(safeMessage((json && json.status_message) || res.statusText || 'no reply', creds)), { status: res.status });
    if (json.status_code !== 20000) throw Object.assign(new Error(safeMessage(json.status_message, creds)), { status: json.status_code });
    return json;
  } catch (e) {
    if (e.status) throw e;
    throw Object.assign(new Error(safeMessage(e.name === 'AbortError' ? 'DataForSEO did not answer' : e.message, creds)), { status: e.name === 'AbortError' ? 'timeout' : 'network' });
  } finally { clearTimeout(timer); }
}

// Every People also ask question in a SERP result, the opened ones included (any depth)
function paaQuestionsIn(result) {
  const out = [];
  const walk = node => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'people_also_ask_element' && node.title) out.push(String(node.title).trim());
    for (const k of ['items', 'expanded_element', 'elements']) if (node[k]) walk(node[k]);
  };
  walk(result);
  return [...new Set(out)];
}

// targets: [{ id, question }]. Returns { byId: Map id → { questions, cost, status, error }, cost, calls }
// onStatus(text): progress. A busy reply is retried after a wait; anything else fails that target.
// timeoutMs: how long to wait on the standard queue; a search still pending then goes through live
// mode (liveFallback), which answers at once for a little more.
async function fetchPaa(targets, { env = process.env, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), onStatus = () => {}, pollMs = 10000, timeoutMs = 300000, retryDelays = [10000, 30000, 60000], now = () => Date.now(), depth = CLICK_DEPTH, liveFallback = true } = {}) {
  const creds = credentials(env);
  const byId = new Map(targets.map(t => [t.id, { questions: [], cost: 0, status: 'pending', error: null, taskId: null }]));
  let cost = 0, calls = 0;
  // 1. Post the tasks, 100 a call
  const posted = new Map(); // taskId → target id
  for (let i = 0; i < targets.length; i += BATCH) {
    const chunk = targets.slice(i, i + BATCH);
    const body = chunk.map(t => ({ keyword: String(t.question).slice(0, 700), ...UK, device: 'desktop', os: 'windows', people_also_ask_click_depth: depth, tag: t.id }));
    let json = null;
    for (let attempt = 0; ; attempt++) {
      try { calls++; json = await call(`${API}/task_post`, { creds, fetchImpl, body }); break; } catch (e) {
        if (!isBusy(e.status) || attempt >= retryDelays.length) throw e;
        onStatus(`DataForSEO busy (${e.message}); waiting ${Math.round(retryDelays[attempt] / 1000)}s`);
        await sleep(retryDelays[attempt]);
      }
    }
    for (const task of json.tasks || []) {
      const id = task.data && task.data.tag;
      const entry = id ? byId.get(id) : null;
      if (!entry) continue;
      cost += Number(task.cost) || 0;
      entry.cost = Number(task.cost) || 0;
      if (task.status_code === 20100 || task.status_code === 20000) { entry.taskId = task.id; entry.status = 'posted'; posted.set(task.id, id); }
      else { entry.status = 'failed'; entry.error = safeMessage(task.status_message, creds); }
    }
  }
  onStatus(`${posted.size} of ${targets.length} searches queued${depth !== CLICK_DEPTH ? ` (${depth} clicks deep)` : ''}`);
  // 2. Collect the results as they come ready
  const started = now();
  const pending = new Set(posted.keys());
  while (pending.size) {
    if (now() - started > timeoutMs) {
      // A search still in the queue after the wait: once more through live mode (an answer at once,
      // a fraction of a penny; Brandon, 28 Oct), else failed
      for (const tid of pending) {
        const id = posted.get(tid), e = byId.get(id);
        const t = targets.find(x => x.id === id);
        if (!liveFallback || !t) { e.status = 'failed'; e.error = 'not ready in time'; continue; }
        onStatus(`${id} still in the queue after ${Math.round(timeoutMs / 1000)}s: live mode`);
        try {
          calls++;
          const got = await call(`${API}/live/advanced`, { creds, fetchImpl, body: [{ keyword: String(t.question).slice(0, 700), ...UK, device: 'desktop', os: 'windows', people_also_ask_click_depth: depth }], timeoutMs: 120000 });
          const task = (got.tasks || [])[0];
          cost += Number(task && task.cost) || 0; e.cost = Math.round((e.cost + (Number(task && task.cost) || 0)) * 10000) / 10000;
          if (!task || task.status_code !== 20000) { e.status = 'failed'; e.error = `live mode: ${safeMessage(task ? task.status_message : 'no task', creds)}`; }
          else { e.questions = paaQuestionsIn(task.result); e.status = 'done'; e.live = true; }
        } catch (err) { e.status = 'failed'; e.error = `live mode: ${err.message}`; }
      }
      break;
    }
    calls++;
    let ready = null;
    try { ready = await call(`${API}/tasks_ready`, { creds, fetchImpl }); } catch (e) { if (!isBusy(e.status)) throw e; }
    const readyIds = ready ? (ready.tasks || []).flatMap(t => (t.result || []).map(r => r.id)).filter(id => pending.has(id)) : [];
    for (const tid of readyIds) {
      calls++;
      const entry = byId.get(posted.get(tid));
      try {
        const got = await call(`${API}/task_get/advanced/${tid}`, { creds, fetchImpl });
        const task = (got.tasks || [])[0];
        if (!task || task.status_code !== 20000) { entry.status = 'failed'; entry.error = safeMessage(task ? task.status_message : 'no task', creds); }
        else { entry.questions = paaQuestionsIn(task.result); entry.status = 'done'; }
      } catch (e) { entry.status = 'failed'; entry.error = e.message; }
      pending.delete(tid);
    }
    onStatus(`${posted.size - pending.size} of ${posted.size} searches back`);
    if (pending.size) await sleep(pollMs);
  }
  return { byId, cost: Math.round(cost * 10000) / 10000, calls };
}

// ── The bank rebuilt: the targets kept, the related questions replaced by People also ask ──
const letters = n => { let s = ''; n += 1; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(97 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
const RELATED_LINE_RE = /^\s*(?:[-*•]\s*)?\[?\s*(?:BT|CT|ST)\s*-?\s*\d+\s*\.\s*[a-z]+\s*\]?\s*\|/i;
const HEADER_LINE_RE = /^\s*(?:#{1,6}\s*)?(?:\*\*)?\[?\s*((?:BT|CT|ST)\s*-?\s*\d+)\s*\]?(?:\*\*)?\s*\|/i;

// text: the bank as Perplexity wrote it (the line format; a table bank is rewritten in the line
// format). paaByTarget: Map target id → [questions]. judge: async ({ block, questions }) →
// [{ question, keep, why }] (the relevance judge; null skips it). judged: Map "blockId\nquestion"
// → { keep, why } of verdicts already given (a rebuild from the raw file judges only new
// questions); filled in place. Returns { text, report }.
async function rebuildBank(text, paaByTarget, { niche = null, date = new Date().toISOString().slice(0, 10), fetched = null, judge = null, judged = new Map(), deepened = null } = {}) {
  const parsed = B.parseBank(text);
  const all = B.allTopics(parsed);
  const blocks = [];
  const linesFor = new Map();
  // 1. Per block: the word filter, then the relevance judge on what passed it
  const pre = new Map(); // block id → [{ question, keep, why, stage, note }]
  for (const t of all) {
    const raw = [...new Set((paaByTarget.get(t.id) || []).map(q => String(q).trim()).filter(Boolean))];
    const rows = raw.map(q => { const c = classify(q, { niche }); return { question: q, keep: c.keep, why: c.keep ? '' : c.why, stage: c.keep ? 'words' : 'filter', note: '' }; });
    const toJudge = rows.filter(r => r.keep && !judged.has(`${t.id}\n${r.question}`)).map(r => r.question);
    if (judge && toJudge.length) {
      const out = await judge({ block: t, questions: toJudge });
      const verdicts = Array.isArray(out) ? out : (out && out.verdicts) || [];
      for (const v of verdicts) judged.set(`${t.id}\n${v.question}`, { keep: v.keep !== false, why: v.why || '' });
    }
    for (const r of rows) {
      if (!r.keep) continue;
      const v = judged.get(`${t.id}\n${r.question}`);
      if (v && !v.keep) { r.keep = false; r.why = `relevance: ${v.why || 'off topic'}`; r.stage = 'relevance'; }
      else if (v && /^not judged/.test(v.why || '')) r.note = v.why;
    }
    pre.set(t.id, rows);
  }
  // 2. A question Google shows on several targets' SERPs (the decking questions on every decking
  // search) goes to the one block whose target it shares most stems with (a tie: the block with
  // fewer so far, then the first), so no block is starved by the one before it
  const overlap = (q, target) => { const A = paaStems(q), Bs = paaStems(target); let n = 0; for (const w of A) if (Bs.has(w)) n++; return n; };
  const owner = new Map(); // cluster key → block id
  const clusterKey = new Map();
  const keyOf = q => { for (const [k] of clusterKey) if (k === q || samePaa(k, q)) return k; clusterKey.set(q, q); return q; };
  const seen = new Map();
  for (const t of all) for (const r of pre.get(t.id)) { if (!r.keep) continue; const k = keyOf(r.question); if (!seen.has(k)) seen.set(k, []); seen.get(k).push({ block: t.id, q: r.question }); }
  const counts = new Map(all.map(t => [t.id, 0]));
  for (const [k, list] of seen) {
    const byBlock = [...new Set(list.map(x => x.block))];
    if (byBlock.length === 1) { owner.set(k, byBlock[0]); continue; }
    const best = byBlock.map(id => ({ id, n: overlap(k, all.find(t => t.id === id).question), c: counts.get(id) })).sort((a, b) => b.n - a.n || a.c - b.c)[0];
    owner.set(k, best.id); counts.set(best.id, counts.get(best.id) + 1);
  }
  // 3. Per block: the target in other words, the cost question again, the owner, repeats, the cap
  for (const t of all) {
    const rows = pre.get(t.id);
    const kept = [], dropped = [];
    for (const r of rows) {
      const q = r.question;
      if (!r.keep) { dropped.push({ question: q, why: r.why }); continue; }
      if (samePaa(q, t.question)) { dropped.push({ question: q, why: 'the target question in other words' }); continue; }
      if (t.block === 'CT' && costAgain(q)) { dropped.push({ question: q, why: 'the cost question again' }); continue; }
      const k = keyOf(q);
      if (owner.get(k) && owner.get(k) !== t.id) { dropped.push({ question: q, why: `kept in ${owner.get(k)} (closer to its target)` }); continue; }
      if (kept.some(x => samePaa(x, q))) { dropped.push({ question: q, why: 'a question already kept in this block' }); continue; }
      if (kept.length >= MAX_PER_BLOCK) { dropped.push({ question: q, why: `over ${MAX_PER_BLOCK} for the block` }); continue; }
      kept.push(q);
    }
    const f = fetched && fetched.get ? fetched.get(t.id) : null;
    const d = deepened && deepened.get ? deepened.get(t.id) : null;
    blocks.push({ id: t.id, block: t.block, question: t.question, service: t.service, found: rows.length, after_words: rows.filter(r => r.stage !== 'filter').length, after_relevance: rows.filter(r => r.keep).length, kept: kept.length, dropped, not_judged: rows.filter(r => r.note).length, status: f ? f.status : (rows.length ? 'done' : 'none'), error: f ? f.error : null, cost: f ? f.cost : 0, live: !!(f && f.live), deepened: d ? { found: d.found, added: d.added, status: d.status, error: d.error || null } : null });
    linesFor.set(t.id, kept.map((q, i) => `- [${t.id}.${letters(i)}] | "${q.replace(/"/g, '”')}" | Doubt: ${doubtOf(q)} | Needs client fact: N | PAA`));
  }
  // The text: every old related line dropped, the PAA lines under each block's header; a table
  // bank (the first runs came back in tables) gets its blocks written in the line format
  const src = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let section = null, inTable = false, headerDone = new Set();
  const sectionOf = line => { const m = line.match(/^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?[ \t]*(?:section[ \t]*)?([1-6])[ \t]*[.):][ \t]*(?:\*\*)?[ \t]*(COST[ \t]+TOPICS|SEASONAL[ \t]+TOPICS|TOPICS|RANKED|RULES|GAPS)/i); return m ? m[2].toUpperCase().replace(/\s+/g, ' ') : null; };
  const headerLine = t => `### [${t.id}] | "${t.question.replace(/"/g, '”')}" | ${t.block === 'BT' ? `Type: ${t.type || 'question'} | ` : ''}Service: ${t.service || 'General'} | ${t.block === 'ST' ? `Window: ${t.window || 'no window stated'}` : `Seen: ${t.seen || ''}`} | ${t.url ? `[${t.url}]` : ''}`.replace(/\s+\|\s*$/, '');
  for (const line of src) {
    const sec = sectionOf(line);
    if (sec) { section = sec; inTable = false; out.push(line); continue; }
    const topicSection = section === 'TOPICS' || section === 'COST TOPICS' || section === 'SEASONAL TOPICS';
    if (!topicSection) { out.push(line); continue; }
    if (RELATED_LINE_RE.test(line)) continue; // a related question (Perplexity's, or an earlier pass's), dropped
    const { cells, table, separator, head } = cellsOfLine(line);
    if (table) {
      if (separator || head) { inTable = true; continue; }
      const id = idOfCell(cells[0]);
      if (!id) continue;
      if (id.sub) continue;
      const t = all.find(x => x.id === id.topic);
      if (!t || headerDone.has(t.id)) continue;
      headerDone.add(t.id);
      if (out.length && out[out.length - 1].trim()) out.push('');
      out.push(headerLine(t), ...(linesFor.get(t.id) || []));
      continue;
    }
    if (/^#{1,6}\s/.test(line) && !HEADER_LINE_RE.test(line)) { inTable = false; continue; } // "### Related questions" sub heading
    const hm = line.match(HEADER_LINE_RE);
    if (hm) {
      const id = hm[1].toUpperCase().replace(/\s+/g, '').replace(/^(BT|CT|ST)-?/, '$1-');
      const t = all.find(x => x.id === id);
      out.push(line);
      if (t && !headerDone.has(t.id)) { headerDone.add(t.id); out.push(...(linesFor.get(t.id) || [])); }
      continue;
    }
    if (inTable && !line.trim()) { inTable = false; }
    out.push(line);
  }
  // The GAPS section: the thin blocks, so a reader sees which posts will be held (an earlier pass's line replaced)
  const thin = blocks.filter(b => b.kept < MIN_PER_BLOCK);
  let textOut = out.join('\n').replace(/^- People also ask \(DataForSEO, [^\n]*\n?/m, '').replace(/\n{3,}/g, '\n\n');
  const gapLines = [`- People also ask (DataForSEO, ${date}): ${thin.length ? `${thin.length} block${thin.length === 1 ? '' : 's'} under ${MIN_PER_BLOCK} related questions: ${thin.map(b => `${b.id} (${b.kept})`).join(', ')}` : `every block has ${MIN_PER_BLOCK} or more related questions`}.`];
  if (/^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?[ \t]*(?:section[ \t]*)?[1-6][ \t]*[.):][ \t]*(?:\*\*)?[ \t]*GAPS/im.test(textOut)) textOut = textOut.replace(/\s*$/, '\n' + gapLines.join('\n') + '\n');
  else textOut = textOut.replace(/\s*$/, '\n\n## 6. GAPS\n' + gapLines.join('\n') + '\n');
  // The header line: the related questions' source on the model
  const head = B.parseHeader(textOut);
  if (head) {
    const model = head.model.replace(/,? related questions from People also ask \(DataForSEO[^)]*\)/i, '') + `, related questions from People also ask (DataForSEO, ${date})`;
    textOut = textOut.replace(/^[^\n]*/, B.header({ generated: head.generated, model }));
  }
  const sum = k => blocks.reduce((n, b) => n + (b[k] || 0), 0);
  const totals = { blocks: blocks.length, found: sum('found'), after_words: sum('after_words'), after_relevance: sum('after_relevance'), kept: sum('kept'), dropped: blocks.reduce((n, b) => n + b.dropped.length, 0), relevance_dropped: blocks.reduce((n, b) => n + b.dropped.filter(d => /^relevance:/.test(d.why)).length, 0), not_judged: sum('not_judged'), thin: thin.length, failed: blocks.filter(b => b.status === 'failed').length, deepened: blocks.filter(b => b.deepened).length };
  return { text: textOut, report: { date, totals, blocks } };
}
// The cells of a line, as blog/bank.js reads them (kept private there)
function cellsOfLine(line) {
  const s = String(line || '').replace(/\*\*|__/g, '').replace(/^\s*[-*•]\s+/, '').trim();
  const table = /^\|.*\|\s*$/.test(s);
  const parts = (table ? s.replace(/^\|/, '').replace(/\|\s*$/, '') : s).split('|').map(c => c.trim());
  return { cells: parts, table, separator: table && parts.every(c => /^:?-{2,}:?$/.test(c) || !c), head: table && !idOfCell(parts[0]) && /^(id|topic|question|target)/i.test(parts[0] || '') };
}
function idOfCell(s) {
  const m = String(s || '').match(/\[?\s*((?:BT|CT|ST)\s*-?\s*\d+)\s*(?:\.\s*([a-z]+))?\s*\]?/i);
  if (!m) return null;
  return { topic: m[1].toUpperCase().replace(/\s+/g, '').replace(/^(BT|CT|ST)-?/, '$1-'), sub: m[2] ? m[2].toLowerCase() : null };
}

// The report as text: per block the questions found, after the word filter, after the relevance
// judge, kept (the second search's count when there was one), every dropped question with its
// reason, the costs (DataForSEO in dollars, the judge in pence)
function formatReport(report, { trade = '', cost = null, calls = null, modelPence = null, modelCalls = null } = {}) {
  const L = [];
  const T = report.totals;
  L.push(`PEOPLE ALSO ASK REPORT: ${trade} (${report.date})`);
  L.push(`${T.blocks} target(s) searched, ${T.found} questions found, ${T.after_words} after the word filter, ${T.after_relevance} after the relevance judge (${T.relevance_dropped} dropped by it${T.not_judged ? `, ${T.not_judged} not judged` : ''}), ${T.kept} kept, ${T.dropped} dropped in all; ${T.thin} block(s) under ${MIN_PER_BLOCK}${T.deepened ? `; ${T.deepened} block(s) searched again ${DEEP_CLICK_DEPTH} clicks deep` : ''}${T.failed ? `; ${T.failed} search(es) failed` : ''}`);
  L.push(`Cost: DataForSEO ${cost == null ? 'not reported' : `$${Number(cost).toFixed(4)}`}${calls != null ? ` over ${calls} API call(s)` : ''} (SERP, standard queue, UK, People also ask ${CLICK_DEPTH} clicks deep; ${DEEP_CLICK_DEPTH} on the second search)${modelPence != null ? `; the relevance judge ${modelPence}p over ${modelCalls || 0} call(s) (${RELEVANCE_MODEL})` : '; the relevance judge did not run'}`);
  L.push('');
  for (const b of report.blocks) {
    L.push(`${b.id.padEnd(6)} found ${String(b.found).padStart(2)}, words ${String(b.after_words).padStart(2)}, relevant ${String(b.after_relevance).padStart(2)}, kept ${String(b.kept).padStart(2)}${b.deepened ? `  (searched again: ${b.deepened.found} found, ${b.deepened.added} new${b.deepened.status === 'failed' ? `, FAILED: ${b.deepened.error}` : ''})` : ''}${b.status === 'failed' ? `  FAILED: ${b.error}` : b.live ? '  (live mode)' : ''}  ${b.service ? `[${b.service}] ` : ''}${b.question}`);
    for (const d of b.dropped) L.push(`         dropped (${d.why}): ${d.question}`);
  }
  return L.join('\n');
}

// ── The whole pass: fetch (or the raw of an earlier run), judge, rebuild, deepen the thin blocks, rebuild ──
// raw: a previous pass's raw result ({ byId, cost, calls, judged }), to rebuild without another run
// callModel: the relevance judge's model call (null: not judged). deepen: a block under
// DEEPEN_UNDER after the judge gets one more search, DEEP_CLICK_DEPTH clicks deep (false: never).
async function paaPass(text, { niche = null, trade = '', env = process.env, fetchImpl = fetch, onStatus = () => {}, date = new Date().toISOString().slice(0, 10), raw = null, callModel = null, deepen = true, model = RELEVANCE_MODEL, ...rest } = {}) {
  const parsed = B.parseBank(text);
  const targets = B.allTopics(parsed).filter(t => t.question).map(t => ({ id: t.id, question: t.question }));
  if (!targets.length) throw new Error('The bank has no target questions to search for.');
  const tradeName = trade || (niche && (niche.trade_lower || niche.trade)) || '';
  let got;
  if (raw) { got = { byId: new Map(Object.entries(raw.byId || {}).map(([id, e]) => [id, { questions: e.questions || [], cost: e.cost || 0, status: e.status || 'done', error: e.error || null }])), cost: raw.cost || 0, calls: raw.calls || 0 }; onStatus(`${got.byId.size} targets from the saved run`); }
  else { onStatus(`${targets.length} target questions to search`); got = await fetchPaa(targets, { env, fetchImpl, onStatus, ...rest }); }
  const judged = new Map(Object.entries((raw && raw.judged) || {}));
  const usages = [];
  const judge = callModel ? async ({ block, questions }) => { onStatus(`judging ${block.id} (${questions.length})`); const r = await judgeRelevance({ trade: tradeName, block, questions, callModel, model }); if (r.usage) usages.push(r.usage); return r.verdicts; } : null;
  const byTarget = () => new Map([...got.byId].map(([id, e]) => [id, e.questions]));
  let r = await rebuildBank(text, byTarget(), { niche, date, fetched: got.byId, judge, judged });
  // The second search for the blocks still thin (a rebuild from the raw keeps the earlier pass's)
  const deepenedMap = new Map(Object.entries((raw && raw.deepened) || {}));
  if (deepenedMap.size) r = await rebuildBank(text, byTarget(), { niche, date, fetched: got.byId, judge, judged, deepened: deepenedMap });
  const thin = deepen ? r.report.blocks.filter(b => b.kept < DEEPEN_UNDER && b.status !== 'failed') : [];
  if (thin.length) {
    onStatus(`${thin.length} block(s) under ${DEEPEN_UNDER}: one more search each, ${DEEP_CLICK_DEPTH} clicks deep`);
    const again = await fetchPaa(thin.map(b => ({ id: b.id, question: b.question })), { env, fetchImpl, onStatus, timeoutMs: 180000, ...rest, depth: DEEP_CLICK_DEPTH });
    got.cost = Math.round((got.cost + again.cost) * 10000) / 10000; got.calls += again.calls;
    for (const [id, e] of again.byId) {
      const cur = got.byId.get(id);
      const before = new Set(cur.questions);
      const added = e.questions.filter(q => !before.has(q));
      cur.questions = [...cur.questions, ...added];
      cur.cost = Math.round((cur.cost + e.cost) * 10000) / 10000;
      deepenedMap.set(id, { found: e.questions.length, added: added.length, status: e.status, error: e.error });
    }
    r = await rebuildBank(text, byTarget(), { niche, date, fetched: got.byId, judge, judged, deepened: deepenedMap });
  }
  // The judge's cost over every pass on these questions (a rebuild from the raw judges only the new ones)
  const thisPence = usages.reduce((n, u) => n + require('../ui/model-log').costPence(model, u), 0);
  const modelPence = usages.length || (raw && raw.modelPence) ? Math.round(((raw && raw.modelPence) || 0) * 100 + thisPence * 100) / 100 : null;
  const modelCalls = ((raw && raw.modelCalls) || 0) + usages.length;
  const rawOut = { date, cost: got.cost, calls: got.calls, modelPence, modelCalls, deepened: Object.fromEntries(deepenedMap), byId: Object.fromEntries([...got.byId].map(([id, e]) => [id, { questions: e.questions, cost: e.cost, status: e.status, error: e.error, live: !!e.live }])), judged: Object.fromEntries(judged) };
  return { text: r.text, report: r.report, cost: got.cost, calls: got.calls, modelPence, modelCalls, reportText: formatReport(r.report, { trade: tradeName, cost: got.cost, calls: got.calls, modelPence, modelCalls }), raw: rawOut };
}

module.exports = { classify, doubtOf, samePaa, costAgain, paaQuestionsIn, fetchPaa, judgeRelevance, relevancePrompt, rebuildBank, formatReport, paaPass, API, UK, CLICK_DEPTH, DEEP_CLICK_DEPTH, DEEPEN_UNDER, MAX_PER_BLOCK, MIN_PER_BLOCK, RELEVANCE_MODEL, OTHER_TRADES };
