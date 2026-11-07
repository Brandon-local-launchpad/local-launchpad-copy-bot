'use strict';
// ── Section split test (7 Nov 2026) ──────────────────────────────────────────
// Service and category pages of the live Edens Edge record. Sonnet 5.5 high writes the intro, the
// local block, the problems, the cost factors and every section the split doesn't name, in one call
// on the normal prompt. Haiku 5.5 high writes the included list, steps, areas intro and FAQs, one call
// a section, on that section's rules and two Sonnet examples from other pages. The first draft is put
// together from those calls and handed to the normal generator: same parser, checks, retry cap,
// claims review and judge. A retry goes to the model that owns the field.
//
//   node tools/model-split-test.js --examples        the example pages (Sonnet high) and the picks
//   node tools/model-split-test.js --run [--only service:S1]   the split runs, resumes
//   node tools/model-split-test.js --baseline        Sonnet high twice more on each page, resumes
//   node tools/model-split-test.js --judge           the judge and claims audit on all of them, resumes
//   node tools/model-split-test.js --report          the report and reader views
//
// Reads the live database through tools/model-test.js's read only pool. Writes only to files.

const fs = require('fs');
const path = require('path');
const M = require('./model-test');
const Anthropic = require('@anthropic-ai/sdk');
const { makeCallModel } = require('../anthropic-call');
const G = require('../v20-generate');
const CG = require('../category-generate');
const SG = require('../service-generate');
const P = require('../trade-facts/pack');
const { createV20Store } = require('../v20-store');
const { createCategoryRunner } = require('../category-run');
const { createServiceRunner } = require('../service-run');
const { pageTypeOf } = require('../page-types');

const root = path.join(__dirname, '..');
const { RAW, OUT, SONNET, HAIKU, PAGES, USD_TO_GBP, readJson, writeJson, runDir, costOf, mapLimit, money, gbp } = M;
const SPLIT_OUT = path.join(OUT, 'section-split');
const EX_DIR = path.join(RAW, 'examples');
const HAIKU_TOKENS = 16000; // anthropic-call.js gives a 5.5 model four times this: 64,000
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 20 * 60 * 1000 });

const SPLIT_SETUP = { label: 'section split: sonnet-5-5 high + haiku-5-5 high', model: SONNET, effort: 'high', block_rewrite: null };
const SPLITS = { S1: SPLIT_SETUP, S2: SPLIT_SETUP };
const BASE = { A2: { ...M.SETUPS.A, label: 'sonnet-5-5, high, rerun 1' }, A3: { ...M.SETUPS.A, label: 'sonnet-5-5, high, rerun 2' } };
Object.assign(M.ALL_SETUPS, SPLITS, BASE);
const TEST_PAGES = ['service', 'category'];
const EXAMPLE_PAGES = { service: ['/services/hedge-trimming', '/services/weed-control'], category: ['/landscape-gardener', '/tree-service'] };

const SECTIONS = {
  service: {
    included: { labels: ['svc_included_intro', 'svc_included_items'], decisions: [/^--- WHAT'S INCLUDED/], facts: true },
    steps: { labels: ['svc_process_steps'], decisions: [/^--- PROCESS STEPS/] },
    areas: { labels: ['svc_areas_intro'], decisions: [/^--- AREA LIST/] },
    faq: { labels: ['svc_faq_items'], decisions: [/^--- FAQ QUESTIONS/, /^LINKABLE PAGES:/, /^ALLOCATED ITEMS:/], facts: true },
  },
  category: {
    steps: { labels: ['cat_process_steps'], decisions: [/^--- PROCESS STEPS/] },
    areas: { labels: ['cat_areas_intro'], decisions: [/^--- AREA LIST/] },
    faq: { labels: ['cat_faq_items'], decisions: [/^--- FAQ QUESTIONS/, /^LINKABLE PAGES:/, /^ALLOCATED ITEMS:/], facts: true },
  },
};
// A retry's FIELD label to its owner
const HAIKU_FIELDS = {
  service: /^(svc_included_intro|item_text|step_body|svc_areas_intro|faq_answer)/,
  category: /^(step_body|cat_areas_intro|faq_answer)/,
};
const KEY_OF = { svc_included_items: 'included', svc_process_steps: 'steps', svc_faq_items: 'faq_items', cat_process_steps: 'steps', cat_faq_items: 'faq_items' };
const SUB_OF = { svc_included_items: ['item_title', 'item_text'], svc_process_steps: ['step_title', 'step_body'], svc_faq_items: ['faq_question', 'faq_answer'], cat_process_steps: ['step_title', 'step_body'], cat_faq_items: ['faq_question', 'faq_answer'] };
const FIELD_LABEL = { svc_included_items: t => `item_text (${t})`, svc_process_steps: t => `step_body (${t})`, svc_faq_items: t => `faq_answer (${t})`, cat_process_steps: t => `step_body (${t})`, cat_faq_items: t => `faq_answer (${t})` };

// ── Prompt pieces ────────────────────────────────────────────────────────────
const promptText = page => fs.readFileSync(path.join(root, 'prompts', page === 'service' ? 'Service_Page_Copywriting_Prompt_CORE (17).md' : 'Category_Page_Copywriting_Prompt_CORE (16).md'), 'utf8');
function promptPart(text, heading, level = '###') {
  const start = text.indexOf(`\n${level} ${heading}`);
  if (start < 0) throw new Error(`Prompt has no ${level} ${heading}`);
  const rest = text.slice(start + 1);
  const end = rest.slice(1).search(/\n(#{2,3} |---\n)/);
  return (end < 0 ? rest : rest.slice(0, end + 1)).trim();
}
const STOP = /^(--- |LINKABLE PAGES:|ALLOCATED ITEMS:|MODEL FIELDS:)/;
function decisionPart(block, re) {
  const lines = block.split('\n');
  const i = lines.findIndex(l => re.test(l));
  if (i < 0) return '';
  let j = i + 1;
  while (j < lines.length && !STOP.test(lines[j])) j++;
  return lines.slice(i, j).join('\n').trim();
}
function modelFieldLines(block, labels) {
  const lines = block.slice(block.indexOf('MODEL FIELDS:')).split('\n');
  const out = [];
  let on = false;
  for (const l of lines.slice(1)) {
    if (/^  \S/.test(l)) on = labels.some(x => l.trim().startsWith(x));
    if (on) out.push(l);
  }
  return out.join('\n');
}
const headOf = block => block.slice(0, block.indexOf('\n--- ')).trim();

function outputFormat(labels) {
  return labels.map(l => (SUB_OF[l] ? `${l}:\n  - ${SUB_OF[l][0]}: <as given> | ${SUB_OF[l][1]}: <your text>` : `${l}: <your text>`)).join('\n');
}

// One section's request: its rules, the rules every section is held to, two examples, the client's
// values and that section's own decisions. No niche entry, no calibration pack, no other field's rules.
function sectionRequest(page, name, sec, args, examples) {
  const text = promptText(page);
  const rules = sec.labels.map(l => promptPart(text, l));
  const global = [promptPart(text, 'GLOBAL COPY RULES', '##'), CG.loadSharedRules()];
  if (sec.facts && page === 'service') rules.push(promptPart(text, 'USING THE TRADE FACTS', '##'));
  const clientBlock = args.system[1].text;
  const cut = clientBlock.indexOf('\nNICHE ENTRY');
  const factsBlock = sec.facts && args.system[2] ? args.system[2].text : '';
  const block = args.message;
  const parts = [headOf(block), ...sec.decisions.map(re => decisionPart(block, re)), decisionPart(block, /^--- PROOF HOMES/), decisionPart(block, /^--- HOW THE BUSINESS WORKS/)].filter(Boolean);
  const ex = (examples[page][name] || []).map((e, i) => `Example ${i + 1}, from the ${e.from} page:\n${e.text}`).join('\n\n');
  return {
    system: [
      { type: 'text', text: `You write one section of a ${page} page for a UK tradesperson's website. Write only this section. Client facts are written as [CV: key] tokens, as the rules say.` },
      { type: 'text', text: `THE RULES FOR THIS SECTION\n\n${rules.join('\n\n')}` },
      { type: 'text', text: `THE RULES FOR EVERY SECTION\n\n${global.join('\n\n')}` },
      { type: 'text', text: `TWO APPROVED EXAMPLES OF THIS SECTION (the standard to reach, from other pages; never reuse their wording)\n\n${ex}` },
      { type: 'text', text: `${clientBlock.slice(0, cut < 0 ? undefined : cut).trim()}${factsBlock ? `\n\n${factsBlock}` : ''}` },
    ],
    message: `${parts.join('\n\n')}\n\nWRITE THESE FIELDS:\n${modelFieldLines(block, sec.labels)}\n\nOUTPUT, exactly these labels and nothing else:\n${outputFormat(sec.labels)}`,
  };
}

// ── One split run ────────────────────────────────────────────────────────────
function splitCallModel(page, sink, examples, sectionLog) {
  const base = M.meteredCall({ model: SONNET, effort: 'high' }, sink, a => a.role || M.roleFor(a), client);
  const secs = SECTIONS[page];
  const haikuLabels = Object.values(secs).flatMap(s => s.labels);
  return async args => {
    if (M.roleFor(args) === 'writer') {
      const only = `\n\nTHIS CALL: write only these fields, in the OUTPUT format, then MODEL_FLAGS. The fields ${haikuLabels.join(', ')} are written separately: leave them out.`;
      const [sonnet, ...haiku] = await Promise.all([
        base({ ...args, message: args.message + only, role: 'writer' }),
        ...Object.entries(secs).map(async ([name, sec]) => {
          const req = sectionRequest(page, name, sec, args, examples);
          const t0 = Date.now();
          try {
            const r = await base({ ...req, model: HAIKU, effort: 'high', maxTokens: HAIKU_TOKENS, role: `section ${name}` });
            sectionLog.push({ section: name, ok: !!(r.text || '').trim(), empty: !(r.text || '').trim(), effort: r.usage.effort, lowered_from: r.usage.lowered_from, ran_out: !!r.usage.spent_attempt, ms: Date.now() - t0, stop_reason: r.usage.stop_reason });
            return r;
          } catch (e) {
            sectionLog.push({ section: name, ok: false, error: e.message, ms: Date.now() - t0 });
            return { text: '', usage: {} };
          }
        }),
      ]);
      const text = [sonnet.text, ...haiku.map(h => h.text)].join('\n');
      return { text, usage: sonnet.usage };
    }
    if (M.roleFor(args) === 'retry') {
      const field = (String(args.message).match(/^FIELD: (.+)$/m) || [])[1] || '';
      if (HAIKU_FIELDS[page].test(field)) return base({ ...args, model: HAIKU, effort: 'high', maxTokens: HAIKU_TOKENS, role: 'retry' });
    }
    return base(args);
  };
}

async function writeSplit(page, key, prep, examples) {
  const { shared } = prep;
  const P0 = prep.pages[page];
  const calls = [], sectionLog = [];
  const callModel = splitCallModel(page, calls, examples, sectionLog);
  const common = { cv: structuredClone(shared.cv), niche: structuredClone(shared.niche), keyValueMap: shared.keyValueMap, serviceParentMap: shared.serviceParentMap, decisionsResult: structuredClone(P0.decisionsResult), calibrationPack: shared.calibrationPack.text, calibrationPackName: shared.calibrationPack.name, extraFlags: structuredClone(P0.extraFlags), callModel, tradeFacts: P0.tradeFacts, modelConfig: { model: SONNET, effort: 'high', block_rewrite: null } };
  const t0 = Date.now();
  const record = page === 'service' ? await SG.generateServicePage(common) : await CG.generateCategoryPage(common);
  const dir = runDir(page, key);
  writeJson(path.join(dir, 'record.json'), record);
  writeJson(path.join(dir, 'calls.json'), calls);
  writeJson(path.join(dir, 'sections.json'), sectionLog);
  writeJson(path.join(dir, 'run.json'), { page, setup: key, wall_ms: Date.now() - t0, finished: new Date().toISOString() });
  return { ms: Date.now() - t0, calls, sectionLog };
}

// ── Examples ─────────────────────────────────────────────────────────────────
async function buildExamples(prep) {
  const exPrep = path.join(EX_DIR, 'prep.json');
  if (!fs.existsSync(exPrep)) {
    const ro = M.readOnlyPool();
    try {
      const I = await M.liveInputs(ro);
      const v20Store = createV20Store(ro);
      const base = { pool: ro, v20Store, generate: async () => { throw new Error('not used'); }, allocate: M.allocate };
      const inputs = { ctx: I.ctx, niche: I.niche, rows: I.rows, dossiers: I.dossiers, allocationRecord: I.allocationRecord, calibrationPack: I.calibrationPack, reviews: I.reviews, saveAllocation: I.saveAllocation };
      const out = {};
      const catRunner = createCategoryRunner({ ...base, loadInputs: async () => inputs });
      for (const slug of EXAMPLE_PAGES.category) {
        const row = I.rows.find(r => r.slug === slug);
        const written = await catRunner.writtenFor(M.CLIENT_ID, I.rows, slug);
        const p = await catRunner.prepare(M.CLIENT_ID, { ...inputs, tradeFacts: I.tradeFactsCategory }, row, written);
        let facts = I.tradeFactsCategory;
        if (facts) { const D = p.decisionsResult.decisions; const pack = P.packForCategory(facts.niche, D.category, D.cards.map(c => c.name)); facts = { ...facts, markdown: pack.markdown, missing: pack.missing }; }
        out[slug] = { type: 'category', title: row.title, decisionsResult: p.decisionsResult, extraFlags: p.extraFlags, tradeFacts: facts };
      }
      const svcInputs = { ...inputs, tradeFacts: I.tradeFactsService };
      const svcRunner = createServiceRunner({ ...base, loadInputs: async () => svcInputs });
      for (const slug of EXAMPLE_PAGES.service) {
        const row = I.rows.find(r => r.slug === slug);
        const written = await svcRunner.writtenFor(M.CLIENT_ID, I.rows, slug);
        const p = await svcRunner.prepare(M.CLIENT_ID, svcInputs, row, written);
        out[slug] = { type: 'service', title: row.title, decisionsResult: p.decisionsResult, extraFlags: p.extraFlags, tradeFacts: p.tradeFacts };
      }
      writeJson(exPrep, out);
    } finally { await ro.pool.end(); }
  }
  const pages = readJson(exPrep);
  const { shared } = prep;
  await Promise.all(Object.entries(pages).map(async ([slug, p]) => {
    const f = path.join(EX_DIR, `${slug.replace(/[^a-z0-9]+/g, '_')}.json`);
    if (fs.existsSync(f)) return;
    const calls = [];
    const callModel = M.meteredCall({ model: SONNET, effort: 'high' }, calls, M.roleFor, client);
    const common = { cv: structuredClone(shared.cv), niche: structuredClone(shared.niche), keyValueMap: shared.keyValueMap, serviceParentMap: shared.serviceParentMap, decisionsResult: structuredClone(p.decisionsResult), calibrationPack: shared.calibrationPack.text, calibrationPackName: shared.calibrationPack.name, extraFlags: structuredClone(p.extraFlags), callModel, tradeFacts: p.tradeFacts, modelConfig: { model: SONNET, effort: 'high', block_rewrite: null } };
    const record = p.type === 'service' ? await SG.generateServicePage(common) : await CG.generateCategoryPage(common);
    writeJson(f, { slug, title: p.title, type: p.type, record, usd: calls.reduce((s, c) => s + costOf(c.served_model, c), 0) });
    console.log(`example ${slug}: ${record.VALIDATION.block} BLOCK, ${record.VALIDATION.flag} FLAG`);
  }));
  // Only what passed the checks: a list keeps its clean items, a scalar must be clean
  const picks = { service: {}, category: {} };
  const lines = ['# Section examples for the split test', '', 'Written by claude-sonnet-5-5 at high on other Edens Edge pages, through the normal checks. Only text with no BLOCK or FLAG on its field is used. These passed the checks; nobody has read and approved them by hand.', ''];
  for (const page of TEST_PAGES) {
    for (const [name, sec] of Object.entries(SECTIONS[page])) {
      picks[page][name] = EXAMPLE_PAGES[page].map(slug => {
        const ex = readJson(path.join(EX_DIR, `${slug.replace(/[^a-z0-9]+/g, '_')}.json`));
        const bad = new Set((ex.record.VALIDATION.issues || []).map(i => i.field));
        const out = [];
        for (const l of sec.labels) {
          if (SUB_OF[l]) {
            const [a, b] = SUB_OF[l];
            const rows = (ex.record[KEY_OF[l]] || []).filter(it => !bad.has(FIELD_LABEL[l](it[a])) && it[b]);
            if (rows.length) out.push(`${l}:\n${rows.map(it => `  - ${a}: ${it[a]} | ${b}: ${it[b]}`).join('\n')}`);
          } else if (!bad.has(l) && ex.record[l]) out.push(`${l}: ${ex.record[l]}`);
        }
        return { from: ex.title, text: out.join('\n') };
      }).filter(e => e.text);
      lines.push(`## ${page}: ${name}`, '');
      for (const e of picks[page][name]) lines.push(`From ${e.from}:`, '', '```', e.text, '```', '');
      if (picks[page][name].length < 2) console.log(`WARNING ${page} ${name}: only ${picks[page][name].length} clean example(s)`);
    }
  }
  writeJson(path.join(EX_DIR, 'picks.json'), picks);
  fs.mkdirSync(SPLIT_OUT, { recursive: true });
  fs.writeFileSync(path.join(SPLIT_OUT, 'section-examples.md'), lines.join('\n'));
  const spent = Object.keys(pages).reduce((s, slug) => s + readJson(path.join(EX_DIR, `${slug.replace(/[^a-z0-9]+/g, '_')}.json`)).usd, 0);
  console.log(`Examples ready, $${spent.toFixed(2)}.`);
}

// ── Report ───────────────────────────────────────────────────────────────────
function sectionNote(page, key) {
  const f = path.join(runDir(page, key), 'sections.json');
  if (!fs.existsSync(f)) return { failed: [], ranOut: [] };
  const log = readJson(f);
  return { failed: log.filter(s => !s.ok).map(s => `${s.section}${s.error ? ' (failed)' : ' (empty)'}`), ranOut: log.filter(s => s.ran_out).map(s => s.section) };
}
function buildReport(all) {
  const L = [];
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
  const fresh = all.filter(m => m.setup !== 'A');
  const exSpend = Object.values(EXAMPLE_PAGES).flat().reduce((s, slug) => s + readJson(path.join(EX_DIR, `${slug.replace(/[^a-z0-9]+/g, '_')}.json`)).usd, 0);
  const spend = fresh.reduce((s, m) => s + m.usd_billed + m.usd_judge_and_audit, 0) + exSpend;
  L.push('# Section split test: Edens Edge, 2026-11-07', '');
  L.push(`Split: claude-sonnet-5-5 high writes the intro, local block, problems and cost factors, and every section the split doesn't name, in one call on the normal prompt. claude-haiku-5-5 high writes the rest, one call a section, with max_tokens at 64,000. Same frozen inputs, checks, retry cap and judge (${M.JUDGE.model}, effort ${M.JUDGE.effort}, two readings averaged) as the main test. Two runs per page, beside Sonnet high: the main test's run and two reruns. Spent on this test, examples and judging included: ${money(spend)} (${gbp(spend * USD_TO_GBP)}), of which the example pages were ${money(exSpend)}.`, '');
  L.push('Haiku writes: service page, the included intro and list, steps, areas intro, FAQs; category page, steps, areas intro, FAQs. Sonnet also writes the unnamed sections: final CTA and more services intro; on the category page also the services intro, cards and also offered. Cost is the writer, retries and claims review; the judge and audit are not in it, and neither are the example pages.', '');
  for (const page of TEST_PAGES) {
    const rows = all.filter(m => m.page === page);
    const name = { S1: 'Split, run 1', S2: 'Split, run 2', A: 'Sonnet high, main test', A2: 'Sonnet high, rerun 1', A3: 'Sonnet high, rerun 2' };
    const order = ['S1', 'S2', 'A', 'A2', 'A3'].map(k => rows.find(m => m.setup === k)).filter(Boolean);
    L.push(`## ${PAGES[page].label}`, '');
    L.push('| Run | Cost | £ | Haiku share of cost | Time | Retry calls | BLOCKs before → after | Flags before → after | Claims left, fixed audit | Judge score (readings) | Verdict | Failed or empty sections |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const m of order) {
      const calls = readJson(path.join(runDir(page, m.setup), 'calls.json'));
      const hk = calls.filter(c => c.served_model === HAIKU).reduce((s, c) => s + costOf(c.served_model, c), 0);
      const n = sectionNote(page, m.setup);
      const parse = m.model_flags.filter(c => /^P-(MISSING|EMPTY|COUNT|TRUNCATED)/.test(c));
      const failed = [...n.failed, ...parse];
      L.push(`| ${name[m.setup]} | ${money(m.usd)} | ${gbp(m.gbp)} | ${/^S/.test(m.setup) ? `${money(hk)}` : 'none'} | ${Math.round(m.wall_s)}s | ${m.calls.retry} | ${m.block_before} → ${m.block_after} | ${m.flag_before} → ${m.flag_after} | ${m.claims_open_audit} | ${M.score(m)} (${m.judge_readings.map(x => x.toFixed(1)).join(', ')}) | ${m.verdict} | ${failed.join(', ') || 'none'} |`);
    }
    const S = order.filter(m => /^S/.test(m.setup)), A = order.filter(m => !/^S/.test(m.setup));
    if (S.length && A.length) L.push('', `Split average: ${money(mean(S.map(m => m.usd)))}, score ${mean(S.map(m => m.judge_score)).toFixed(2)}, claims ${mean(S.map(m => m.claims_open_audit)).toFixed(1)}, BLOCKs ${mean(S.map(m => m.block_after)).toFixed(1)}. Sonnet high average over ${A.length} runs: ${money(mean(A.map(m => m.usd)))}, score ${mean(A.map(m => m.judge_score)).toFixed(2)} (from ${Math.min(...A.map(m => m.judge_score)).toFixed(2)} to ${Math.max(...A.map(m => m.judge_score)).toFixed(2)}), claims ${mean(A.map(m => m.claims_open_audit)).toFixed(1)}, BLOCKs ${mean(A.map(m => m.block_after)).toFixed(1)}.`);
    L.push('');
    const left = order.filter(m => m.block_after > 0);
    if (left.length) L.push(`BLOCKs left: ${left.map(m => `${name[m.setup]}: ${m.block_codes.join(', ')}`).join('; ')}.`, '');
    const lowered = S.filter(m => m.effort_lowered);
    if (lowered.length) L.push(`Calls that ran out at 64,000 tokens and were repeated at low: ${lowered.map(m => `${name[m.setup]}: ${m.ran_out.length}${sectionNote(page, m.setup).ranOut.length ? ` (first drafts of ${sectionNote(page, m.setup).ranOut.join(', ')})` : ''}`).join('; ')}.`, ''); else if (S.length) L.push('No Haiku call ran out of tokens or fell back to low on this page.', '');
  }
  L.push('## How to read this', '');
  L.push('- **Two runs per setup is still a small sample,** so read the range as well as the average.');
  L.push('- **What a Haiku section call saw:** the rules for its fields, the shared copy rules that apply to every field, two examples, the client values and confirmed practices, and that section\'s decisions with the proof homes and how the business works. The FAQ and included list calls also get the trade facts; the FAQ call also gets the linkable pages and allocated local items. It saw no niche entry, no calibration pack and no other field\'s rules.');
  L.push('- **Retries are not section calls:** a retry goes to the model that owns the field but on the normal retry prompt, which holds the whole core prompt, as the retry rules require. Claims reviews stay on Sonnet high.');
  L.push('- **The examples passed the checks but nobody has approved them by hand.** They are in section-examples.md.');
  L.push('- **Same judge as the main test,** so these scores compare with the main test but not with the 8.5 bar, which was set on the usual judge.');
  return L.join('\n') + '\n';
}

async function main() {
  const flag = n => process.argv.includes(n);
  const arg = n => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
  const prep = readJson(path.join(RAW, 'prep.json'));
  if (flag('--examples')) return buildExamples(prep);
  if (flag('--run')) {
    const examples = readJson(path.join(EX_DIR, 'picks.json'));
    const only = arg('--only') ? arg('--only').split(',') : null;
    const todo = [];
    for (const page of TEST_PAGES) for (const k of Object.keys(SPLITS)) if ((!only || only.includes(`${page}:${k}`)) && !fs.existsSync(path.join(runDir(page, k), 'run.json'))) todo.push([page, k]);
    await Promise.all(todo.map(async ([page, k]) => {
      try { const r = await writeSplit(page, k, prep, examples); console.log(`${page} ${k}: done in ${Math.round(r.ms / 1000)}s, ${r.calls.length} calls; sections ${r.sectionLog.map(s => `${s.section}:${s.ok ? (s.ran_out ? 'ran out' : 'ok') : 'FAILED'}`).join(' ')}`); }
      catch (e) { console.log(`${page} ${k}: FAILED ${e.status || ''} ${e.message}`); }
    }));
    return;
  }
  if (flag('--baseline')) {
    const todo = [];
    for (const page of TEST_PAGES) for (const k of Object.keys(BASE)) if (!fs.existsSync(path.join(runDir(page, k), 'run.json'))) todo.push([page, k]);
    await Promise.all(todo.map(async ([page, k]) => {
      try { const r = await M.writeOne(page, k, prep); console.log(`${page} ${k}: done in ${Math.round(r.wall_ms / 1000)}s, ${r.calls.length} calls`); }
      catch (e) { console.log(`${page} ${k}: FAILED ${e.status || ''} ${e.message}`); }
    }));
    return;
  }
  if (flag('--judge')) {
    const todo = [];
    for (const page of TEST_PAGES) for (const k of [...Object.keys(SPLITS), ...Object.keys(BASE)]) if (fs.existsSync(path.join(runDir(page, k), 'run.json'))) todo.push([page, k]);
    await mapLimit(todo, 6, async ([page, k]) => {
      try { await M.judgeOne(page, k, prep); console.log(`judged ${page} ${k}`); }
      catch (e) { console.log(`judge ${page} ${k}: FAILED ${e.status || ''} ${e.message}`); }
    });
    return;
  }
  if (flag('--report')) {
    const all = [];
    for (const page of TEST_PAGES) for (const k of ['S1', 'S2', 'A', 'A2', 'A3']) if (fs.existsSync(path.join(runDir(page, k), 'judge.json'))) all.push(await M.metricsFor(page, k));
    fs.mkdirSync(SPLIT_OUT, { recursive: true });
    writeJson(path.join(SPLIT_OUT, 'metrics.json'), all);
    fs.writeFileSync(path.join(SPLIT_OUT, 'REPORT_section_split_2026-11-07.md'), buildReport(all));
    const name = { S1: 'split_run1', S2: 'split_run2', A2: 'sonnet_high_rerun1', A3: 'sonnet_high_rerun2' };
    for (const m of all) if (name[m.setup]) fs.writeFileSync(path.join(SPLIT_OUT, `${PAGES[m.page].file}_${name[m.setup]}.md`), M.blindView(m.page, m.setup, prep));
    console.log(`Written to ${path.relative(root, SPLIT_OUT)}.`);
    return;
  }
  console.log('Pass --examples, --run, --baseline, --judge or --report.');
}
main().catch(e => { console.error(e); process.exit(1); });
