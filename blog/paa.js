'use strict';

// ── The blog question bank's related questions from Google People also ask ────────────
// (Brandon, 28 Oct, after the thin v2 run: Perplexity cannot see People also ask, and what
// it found was DIY questions from single supplier pages.) Perplexity keeps the targets (the
// BT topics, one CT target per service, one ST target per seasonal topic), the rules and the
// seasonal windows; its related questions are dropped. Each target question goes to the
// DataForSEO SERP API (Google organic, United Kingdom, English, the standard queue, People
// also ask opened two clicks deep); the People also ask questions become that block's
// related questions, deduped (within the block, across blocks, and against the target),
// filtered (no DIY how to, no other trade), each marked PAA with a doubt read off its words.
// The bank file keeps the prompt's line format, so blog/bank.js reads it unchanged.
//
// Credentials: DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD from the environment (the H1
// research's), never logged or stored.

const { credentials, safeMessage, isBusy } = require('../h1-research/dataforseo');
const SQ = require('./same-question');
const B = require('./bank');

const API = 'https://api.dataforseo.com/v3/serp/google/organic';
const UK = { location_code: 2826, language_code: 'en' };
const CLICK_DEPTH = 2;
const BATCH = 100;           // tasks per task_post call (the API's limit)
const MAX_PER_BLOCK = 12;    // related questions kept per block at most
const MIN_PER_BLOCK = 3;     // under this, the block is listed in GAPS (its post is held)

// ── The filter: what a homeowner asks before or while hiring stays; DIY how to and other trades go ──
// Build it yourself verbs only (Brandon, 28 Oct): a fix, repair or "how do I stop" question is the
// homeowner's before hiring and stays
const DIY_VERBS = 'build|make|install|lay|fit|put up|put down|put in|take down|take up|cut|mix|pour|drill|attach|screw|nail|paint|stain|oil|treat|seal|dig|level|run|wire|plumb|erect|assemble|construct|lift|move|sand|varnish|weld|glue|bolt|hang|mount|plant|sow|spread|compact';
const DIY_RE = new RegExp(`^(?:how (?:do|can|could|should|would|to) (?:i|we|you)\\b.*\\b(?:${DIY_VERBS})\\b|how to\\b.*\\b(?:${DIY_VERBS})\\b|can (?:i|we) (?:just |simply |easily )?(?:${DIY_VERBS})\\b|(?:what|which) (?:size|grade|type|kind|thickness|depth|gauge) (?:of )?(?:timber|wood|screw|screws|nail|nails|sand|cement|concrete|aggregate|mortar|membrane|pipe|gravel|stone|slab|slabs|post|posts|bolt|bolts|fixings?|joist|joists|c16|c24|mm)\\b|what tools?\\b|(?:do|will) (?:i|we) need (?:a|an|to use) (?:[a-z]+ )?(?:saw|drill|mixer|spirit level|spade|wacker|plate compactor|whacker|cement mixer|jigsaw|router)\\b)`, 'i');
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
  // A rule or permission question ("Can I put up a 10 foot fence?", "Can I level my garden without planning permission?") is the homeowner's, whatever verb it uses
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

// Two People also ask questions that are one question (blog/same-question.js is tuned to the FAQ
// wordings, with synonyms and a "shorter fully inside" rule too loose here: "What is tree cabling and
// bracing?" is not "Can a split tree be saved with cabling and bracing?")
// The stems of a People also ask question: every word but the question words, articles and
// pronouns, lightly stemmed (causes and cause, turning and turn, decking and deck are one)
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
async function fetchPaa(targets, { env = process.env, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), onStatus = () => {}, pollMs = 10000, timeoutMs = 900000, retryDelays = [10000, 30000, 60000], now = () => Date.now() } = {}) {
  const creds = credentials(env);
  const byId = new Map(targets.map(t => [t.id, { questions: [], cost: 0, status: 'pending', error: null, taskId: null }]));
  let cost = 0, calls = 0;
  // 1. Post the tasks, 100 a call
  const posted = new Map(); // taskId → target id
  for (let i = 0; i < targets.length; i += BATCH) {
    const chunk = targets.slice(i, i + BATCH);
    const body = chunk.map(t => ({ keyword: String(t.question).slice(0, 700), ...UK, device: 'desktop', os: 'windows', people_also_ask_click_depth: CLICK_DEPTH, tag: t.id }));
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
  onStatus(`${posted.size} of ${targets.length} searches queued`);
  // 2. Collect the results as they come ready
  const started = now();
  const pending = new Set(posted.keys());
  while (pending.size) {
    if (now() - started > timeoutMs) { for (const tid of pending) { const e = byId.get(posted.get(tid)); e.status = 'failed'; e.error = 'not ready in time'; } break; }
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
// format). paaByTarget: Map target id → [questions]. Returns { text, report }.
function rebuildBank(text, paaByTarget, { niche = null, date = new Date().toISOString().slice(0, 10), fetched = null } = {}) {
  const parsed = B.parseBank(text);
  const all = B.allTopics(parsed);
  const blocks = [];
  const linesFor = new Map();
  // A question Google shows on several targets' SERPs (the decking questions on every decking
  // search) goes to the one block whose target it shares most stems with (a tie: the block with
  // fewer so far, then the first), so no block is starved by the one before it
  const raws = new Map(all.map(t => [t.id, [...new Set((paaByTarget.get(t.id) || []).map(q => String(q).trim()).filter(Boolean))]]));
  const overlap = (q, target) => { const A = paaStems(q), Bs = paaStems(target); let n = 0; for (const w of A) if (Bs.has(w)) n++; return n; };
  const owner = new Map(); // normalised question → block id
  const clusterKey = new Map(); // question text → the first question of its cluster
  const keyOf = q => { for (const [k] of clusterKey) if (k === q || samePaa(k, q)) return k; clusterKey.set(q, q); return q; };
  const seen = new Map(); // cluster key → [{ block, q }]
  for (const t of all) for (const q of raws.get(t.id)) { const k = keyOf(q); if (!seen.has(k)) seen.set(k, []); seen.get(k).push({ block: t.id, q }); }
  const counts = new Map(all.map(t => [t.id, 0]));
  for (const [k, list] of seen) {
    const byBlock = [...new Set(list.map(x => x.block))];
    if (byBlock.length === 1) { owner.set(k, byBlock[0]); continue; }
    const best = byBlock.map(id => ({ id, n: overlap(k, all.find(t => t.id === id).question), c: counts.get(id) })).sort((a, b) => b.n - a.n || a.c - b.c)[0];
    owner.set(k, best.id); counts.set(best.id, counts.get(best.id) + 1);
  }
  for (const t of all) {
    const raw = raws.get(t.id);
    const kept = [], dropped = [];
    for (const q of raw) {
      const c = classify(q, { niche });
      if (!c.keep) { dropped.push({ question: q, why: c.why }); continue; }
      if (samePaa(q, t.question)) { dropped.push({ question: q, why: 'the target question in other words' }); continue; }
      if (t.block === 'CT' && costAgain(q)) { dropped.push({ question: q, why: 'the cost question again' }); continue; }
      const k = keyOf(q);
      if (owner.get(k) && owner.get(k) !== t.id) { dropped.push({ question: q, why: `kept in ${owner.get(k)} (closer to its target)` }); continue; }
      if (kept.some(x => samePaa(x, q))) { dropped.push({ question: q, why: 'a question already kept in this block' }); continue; }
      if (kept.length >= MAX_PER_BLOCK) { dropped.push({ question: q, why: `over ${MAX_PER_BLOCK} for the block` }); continue; }
      kept.push(q);
    }
    const f = fetched && fetched.get ? fetched.get(t.id) : null;
    blocks.push({ id: t.id, block: t.block, question: t.question, service: t.service, found: raw.length, kept: kept.length, dropped, status: f ? f.status : (raw.length ? 'done' : 'none'), error: f ? f.error : null, cost: f ? f.cost : 0 });
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
    if (RELATED_LINE_RE.test(line)) continue; // Perplexity's related question, dropped
    const { cells, table, separator, head } = cellsOfLine(line);
    if (table) {
      // A table row: a topic header row becomes a header line with its PAA lines; a related row goes; the head and separator go
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
  // The GAPS section: the thin blocks, so a reader sees which posts will be held
  const thin = blocks.filter(b => b.kept < MIN_PER_BLOCK);
  let textOut = out.join('\n').replace(/\n{3,}/g, '\n\n');
  const gapLines = [`- People also ask (DataForSEO, ${date}): ${thin.length ? `${thin.length} block${thin.length === 1 ? '' : 's'} under ${MIN_PER_BLOCK} related questions: ${thin.map(b => `${b.id} (${b.kept})`).join(', ')}` : `every block has ${MIN_PER_BLOCK} or more related questions`}.`];
  if (/^[ \t]*(?:#{1,6}[ \t]*)?(?:\*\*)?[ \t]*(?:section[ \t]*)?[1-6][ \t]*[.):][ \t]*(?:\*\*)?[ \t]*GAPS/im.test(textOut)) textOut = textOut.replace(/\s*$/, '\n' + gapLines.join('\n') + '\n');
  else textOut = textOut.replace(/\s*$/, '\n\n## 6. GAPS\n' + gapLines.join('\n') + '\n');
  // The header line: the related questions' source on the model
  const head = B.parseHeader(textOut);
  if (head) {
    const model = head.model.replace(/,? related questions from People also ask \(DataForSEO[^)]*\)/i, '') + `, related questions from People also ask (DataForSEO, ${date})`;
    textOut = textOut.replace(/^[^\n]*/, B.header({ generated: head.generated, model }));
  }
  const totals = { blocks: blocks.length, found: blocks.reduce((n, b) => n + b.found, 0), kept: blocks.reduce((n, b) => n + b.kept, 0), dropped: blocks.reduce((n, b) => n + b.dropped.length, 0), thin: thin.length, failed: blocks.filter(b => b.status === 'failed').length };
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

// The report as text: per block the questions found, kept after the filter, what was dropped and why, the cost
function formatReport(report, { trade = '', cost = null, calls = null } = {}) {
  const L = [];
  const T = report.totals;
  L.push(`PEOPLE ALSO ASK REPORT: ${trade} (${report.date})`);
  L.push(`${T.blocks} target(s) searched, ${T.found} questions found, ${T.kept} kept after the filter, ${T.dropped} dropped; ${T.thin} block(s) under ${MIN_PER_BLOCK}${T.failed ? `; ${T.failed} search(es) failed` : ''}`);
  L.push(`Cost: ${cost == null ? 'not reported' : `$${Number(cost).toFixed(4)}`}${calls != null ? ` over ${calls} API call(s)` : ''} (DataForSEO SERP, standard queue, UK, People also ask two clicks deep)`);
  L.push('');
  for (const b of report.blocks) {
    L.push(`${b.id.padEnd(6)} found ${String(b.found).padStart(2)}, kept ${String(b.kept).padStart(2)}${b.status === 'failed' ? `  FAILED: ${b.error}` : ''}  ${b.service ? `[${b.service}] ` : ''}${b.question}`);
    for (const d of b.dropped) L.push(`         dropped (${d.why}): ${d.question}`);
  }
  return L.join('\n');
}

// The whole pass on a bank's text: fetch, rebuild, report
// raw: a previous pass's raw result ({ byId, cost, calls }), to rebuild without another run
async function paaPass(text, { niche = null, env = process.env, fetchImpl = fetch, onStatus = () => {}, date = new Date().toISOString().slice(0, 10), raw = null, ...rest } = {}) {
  const parsed = B.parseBank(text);
  const targets = B.allTopics(parsed).filter(t => t.question).map(t => ({ id: t.id, question: t.question }));
  if (!targets.length) throw new Error('The bank has no target questions to search for.');
  onStatus(`${targets.length} target questions to search`);
  const got = raw ? { byId: new Map(Object.entries(raw.byId).map(([id, e]) => [id, { questions: e.questions || [], cost: e.cost || 0, status: e.status || 'done', error: e.error || null }])), cost: raw.cost || 0, calls: raw.calls || 0 } : await fetchPaa(targets, { env, fetchImpl, onStatus, ...rest });
  const byTarget = new Map([...got.byId].map(([id, e]) => [id, e.questions]));
  const r = rebuildBank(text, byTarget, { niche, date, fetched: got.byId });
  const rawOut = { date, cost: got.cost, calls: got.calls, byId: Object.fromEntries([...got.byId].map(([id, e]) => [id, { questions: e.questions, cost: e.cost, status: e.status, error: e.error }])) };
  return { text: r.text, report: r.report, cost: got.cost, calls: got.calls, reportText: formatReport(r.report, { cost: got.cost, calls: got.calls }), raw: rawOut };
}

module.exports = { classify, doubtOf, samePaa, costAgain, paaQuestionsIn, fetchPaa, rebuildBank, formatReport, paaPass, API, UK, CLICK_DEPTH, MAX_PER_BLOCK, MIN_PER_BLOCK, OTHER_TRADES };
