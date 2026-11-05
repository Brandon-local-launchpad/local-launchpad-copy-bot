'use strict';

// ── Tagging the niche entries (copy quality 6, 5 Nov 2026) ───────────────────
// A block 4 or 5 card, FAQ slot or step may be true only of a firm that offers a particular service
// ("Boarded tonight" needs Burglary repairs and boarding up). This tool reads each entry, asks the
// model which elements depend on a service and which ideas are briefed to three or more slots, checks
// every name against the niche's library, and writes the result into the entry.
//
//   node tools/niche-tag-briefs.js --run [stem ...]    the model call; proposals in tests/quality-runs/niche-tags/
//   node tools/niche-tag-briefs.js --apply [stem ...]  writes "needs" and idea_homes into <stem>.json and its .md
//   node tools/niche-tag-briefs.js --report            how many elements carry a tag, per niche
//
// Spends a few pence a niche (claude-opus-5-5, key from .env). The entries stay the source of truth:
// a tag can be edited by hand there like any other value, in the .json and the .md together.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split(String.fromCharCode(10))) {
  const i = line.indexOf('=');
  if (i > 0 && !line.startsWith('#') && !process.env[line.slice(0, i).trim()]) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}
const L = require(path.join(root, 'niche-library/library.js'));
const { insertKeys } = require('./niche-entry-edit');

const MODEL = 'claude-opus-5-5';
const OUT = path.join(root, 'tests/quality-runs/niche-tags');
const dir = path.join(root, 'niche-library');
const allStems = () => fs.readdirSync(dir).filter(f => f.endsWith('.json') && !['client-facts.json', 'practices.json'].includes(f)).map(f => f.replace('.json', ''));
const readEntry = stem => JSON.parse(fs.readFileSync(path.join(dir, `${stem}.json`), 'utf8'));
const targetsOf = stem => [...new Set(L.loadLibrary(stem).rows.filter(r => r.verdict !== 'exclude' && r.target).map(r => r.target))];

// Every taggable element: its path in the entry, what it is, and the page type it serves
function elements(entry) {
  const out = [];
  const add = (p, kind, page, el, self = null) => { if (el && typeof el === 'object') out.push({ path: p, kind, page, title: el.title || el.question || el.frame || '', brief: el.brief || el.answer_brief || '', self, needs: el.needs || null }); };
  const walk = (b, p, page, self = null) => {
    if (!b || typeof b !== 'object') return;
    for (const [sec, kind] of [['problems', 'block 4 card'], ['cost', 'block 5 card']]) ((b[sec] && b[sec].cards) || []).forEach((c, i) => add(`${p}/${sec}/cards/${i}`, kind, page, c, self));
    for (const sec of ['steps', 'steps_emergency']) (Array.isArray(b[sec]) ? b[sec] : []).forEach((s, i) => add(`${p}/${sec}/${i}`, 'step', page, s, self));
    (Array.isArray(b.faq_slots) ? b.faq_slots : []).forEach((s, i) => add(`${p}/faq_slots/${i}`, 'FAQ slot', page, s, self));
    if (b.seasonal) { add(`${p}/seasonal/problem_card`, 'block 4 card', page, b.seasonal.problem_card, self); add(`${p}/seasonal/faq_slot`, 'FAQ slot', page, b.seasonal.faq_slot, self); }
    for (const v of ['emergency', 'desire', 'no_callouts']) if (b[v]) walk(b[v], `${p}/${v}`, page, self);
  };
  (entry.steps || []).forEach((s, i) => add(`steps/${i}`, 'step', 'homepage', s));
  (entry.steps_emergency || []).forEach((s, i) => add(`steps_emergency/${i}`, 'step', 'homepage', s));
  if (entry.step_2_no_visit) add('step_2_no_visit', 'step', 'homepage', entry.step_2_no_visit);
  (entry.faq_slots || []).forEach((s, i) => add(`faq_slots/${i}`, 'FAQ slot', 'homepage', s));
  for (const [key, page] of [['service_page_blocks', 'service'], ['category_page_blocks', 'category'], ['location_page_blocks', 'location']]) for (const [l, b] of Object.entries(entry[key] || {})) walk(b, `${key}/${l}`, page);
  for (const [key, page] of [['service_overrides', 'service'], ['category_overrides', 'category']]) for (const [n, b] of Object.entries(entry[key] || {})) walk(b, `${key}/${n}`, page, n);
  return out;
}

const SYSTEM = `You prepare a UK trade's copywriting briefs for use across many firms. Each firm ticks only some of the trade's services. You return JSON only.

PART 1: SERVICE TAGS
Some brief elements (a block 4 card, a block 5 cost card, a FAQ slot, a process step) are true only of a firm that offers a particular service. On a firm without that service the page would describe work it doesn't do. Tag those elements with the service targets they depend on, using the exact names under SERVICE TARGETS. A list means any one of them is enough.

Examples from the owner (locksmith):
- "Boarded tonight, repaired properly after" needs Burglary repairs and boarding up.
- "Keys for a let, a shop or a block" needs Master key systems.
- "Your insurer has asked" needs British Standard and insurance approved locks.

Rules:
- Tag only when the element names or assumes work that a firm in this trade might well not offer. Most elements need no tag. When a firm without the service could still say it truthfully, leave it untagged.
- Never tag for a material, a part, a tool, a method or a piece of trade vocabulary alone.
- Never tag an element for the trade's core work that every firm in the trade does.
- An element under service_overrides/<name> or category_overrides/<name> is on that page already: never tag it with that page's own target.
- Only the exact target names are allowed. If no target fits, leave the element untagged.

PART 2: IDEAS BRIEFED TO THREE OR MORE SLOTS
Within one page type (homepage, category, service, location) and the same business type letter, find any specific idea this trade's briefs ask for in three or more elements, so the page would make the same point three times (a locksmith's ID check, entry that leaves the least damage). For each, name its single home on the page and where else it must not go.
- Leave out these four, which the code already gives a home on every page: what to send with an enquiry, the cost factors, the insurer, the hidden layer behind the finish.
- The home must be one place a writer can find: a named FAQ question ("the 'what should I have ready' FAQ"), "paragraph 2 of the content block", a named block 4 card, a named step.
- List only ideas that really appear in three or more of the listed elements.

OUTPUT
{"tags": [{"id": "e12", "needs": ["Exact target"], "why": "a few words"}], "ideas": [{"topic": "the ID check at the door", "home": "the 'what should I have ready' FAQ", "elsewhere": "no card or step asks for proof of address", "pages": ["service"], "elements": ["e3", "e17", "e40"]}]}`;

function buildMessage(stem, entry) {
  const els = elements(entry);
  const groups = new Map();
  for (const e of els) {
    const k = `${e.page}|${e.title}|${e.brief}`;
    if (!groups.has(k)) groups.set(k, { id: `e${groups.size + 1}`, ...e, paths: [] });
    groups.get(k).paths.push(e.path);
  }
  const lines = [...groups.values()].map(g => `${g.id} [${g.page} ${g.kind}; ${g.paths.slice(0, 2).join(', ')}${g.paths.length > 2 ? ` +${g.paths.length - 2}` : ''}] ${g.title}: ${String(g.brief).slice(0, 320)}`);
  const message = [`TRADE: ${entry.trade || stem}`, '', 'SERVICE TARGETS:', ...targetsOf(stem).map(t => `- ${t}`), '', `ELEMENTS (${groups.size}):`, ...lines].join('\n');
  return { message, groups: [...groups.values()], total: els.length };
}

function parseJson(text) {
  const t = String(text || '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  return JSON.parse(t.slice(a, b + 1));
}

async function runOne(stem, client) {
  const entry = readEntry(stem);
  const { message, groups, total } = buildMessage(stem, entry);
  const targets = targetsOf(stem);
  const byLc = new Map(targets.map(t => [t.toLowerCase(), t]));
  const byId = new Map(groups.map(g => [g.id, g]));
  const r = await client.messages.create({ model: MODEL, max_tokens: 12000, system: SYSTEM, messages: [{ role: 'user', content: message }] });
  const j = parseJson(r.content.map(c => c.text || '').join(''));
  const rejected = [];
  const tags = {};
  for (const t of j.tags || []) {
    const g = byId.get(t.id);
    if (!g) { rejected.push(`unknown element ${t.id}`); continue; }
    const needs = (t.needs || []).map(n => byLc.get(String(n).toLowerCase())).filter(Boolean);
    if (needs.length !== (t.needs || []).length) rejected.push(`${t.id} names a service not in the library: ${(t.needs || []).join(', ')}`);
    for (const p of g.paths) {
      const self = g.self ? String(g.self).toLowerCase() : null;
      const mine = needs.filter(n => n.toLowerCase() !== self);
      if (mine.length) tags[p] = { needs: mine, title: g.title, why: t.why || '' };
    }
  }
  const ideas = [];
  for (const i of j.ideas || []) {
    const n = (i.elements || []).filter(e => byId.has(e)).length;
    if (n < 3) { rejected.push(`idea "${i.topic}" has ${n} real elements`); continue; }
    ideas.push({ topic: i.topic, home: i.home, elsewhere: i.elsewhere, pages: i.pages, slots: n });
  }
  const out = { stem, model: MODEL, total, groups: groups.length, tags, ideas, rejected, usage: r.usage };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${stem}.json`), JSON.stringify(out, null, 2));
  return out;
}

const mdFileOf = stem => {
  const key = stem.replace(/-/g, '_').toLowerCase();
  const hit = fs.readdirSync(dir).find(f => /^Niche_Library_.*\.md$/.test(f) && f.replace(/^Niche_Library_/, '').replace(/\.md$/, '').replace(/-/g, '_').toLowerCase() === key);
  return hit ? path.join(dir, hit) : null;
};

function applyOne(stem) {
  const p = path.join(OUT, `${stem}.json`);
  if (!fs.existsSync(p)) throw new Error(`no proposals for ${stem}: run --run first`);
  const prop = JSON.parse(fs.readFileSync(p, 'utf8'));
  const file = path.join(dir, `${stem}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  const entry = JSON.parse(raw);
  if (elements(entry).some(e => e.needs)) throw new Error(`${stem} already carries tags`);
  const edits = Object.entries(prop.tags).map(([pth, t]) => ({ path: pth, key: 'needs', value: t.needs }));
  if (prop.ideas.length) edits.push({ path: '', key: 'idea_homes', block: true, value: prop.ideas.map(i => ({ topic: i.topic, home: i.home, elsewhere: i.elsewhere, pages: i.pages })) });
  fs.writeFileSync(file, insertKeys(raw, edits));
  const md = mdFileOf(stem);
  if (md) {
    let s = fs.readFileSync(md, 'utf8');
    const nl = s.includes('\r\n') ? '\r\n' : '\n';
    const seen = new Map();
    for (const t of Object.values(prop.tags)) { const k = `${t.title}|${t.needs.join('; ')}`; seen.set(k, { title: t.title, needs: t.needs }); }
    const rows = [...seen.values()].map(t => `| ${t.title} | ${t.needs.join('; ')} |`);
    s = s.replace(/\s*$/, '') + `${nl}${nl}## Service tags${nl}${nl}An element is dropped, and the next eligible one used, when the client has confirmed none of these services. The paths are in the .json as \`needs\`.${nl}${nl}| Element | Needs |${nl}|---|---|${nl}${rows.join(nl) || '| (none) | |'}${nl}`;
    if (prop.ideas.length) s += `${nl}## Idea homes${nl}${nl}${prop.ideas.map(i => `- **${i.topic}** (${(i.pages || []).join(', ')}): home is ${i.home}. Elsewhere: ${i.elsewhere}.`).join(nl)}${nl}`;
    fs.writeFileSync(md, s);
  }
  return { stem, elements: Object.keys(prop.tags).length, ideas: prop.ideas.length };
}

function report() {
  const rows = allStems().map(stem => {
    const entry = readEntry(stem);
    const els = elements(entry);
    const tagged = els.filter(e => e.needs && e.needs.length);
    return { stem, total: els.length, tagged: tagged.length, unique: new Set(tagged.map(e => e.title)).size, ideas: (entry.idea_homes || []).length };
  });
  return rows;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const stems = args.filter(a => !a.startsWith('--'));
  (async () => {
    if (args.includes('--report')) {
      const rows = report();
      for (const r of rows) console.log(`${r.stem}\t${r.total} elements\t${r.tagged} tagged (${r.unique} different)\t${r.ideas} idea homes`);
      console.log(`Total ${rows.reduce((s, r) => s + r.total, 0)} elements, ${rows.reduce((s, r) => s + r.tagged, 0)} tagged`);
      return;
    }
    if (args.includes('--apply')) { for (const s of stems.length ? stems : allStems()) console.log(JSON.stringify(applyOne(s))); return; }
    if (!args.includes('--run')) { console.error('Use --run, --apply or --report'); process.exit(2); }
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const queue = [...(stems.length ? stems : allStems())];
    let input = 0, output = 0;
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (queue.length) {
        const s = queue.shift();
        try {
          const o = await runOne(s, client);
          input += o.usage.input_tokens; output += o.usage.output_tokens;
          console.log(`${s}: ${Object.keys(o.tags).length} paths tagged of ${o.total}, ${o.ideas.length} ideas${o.rejected.length ? `, rejected: ${o.rejected.join(' | ')}` : ''}`);
        } catch (e) { console.log(`${s}: FAILED ${e.message}`); }
      }
    }));
    console.log(`Tokens in ${input}, out ${output}, about $${((input * 4 + output * 20) / 1e6).toFixed(2)}`);
  })().catch(e => { console.error(e); process.exit(1); });
}

module.exports = { elements, report, targetsOf };
