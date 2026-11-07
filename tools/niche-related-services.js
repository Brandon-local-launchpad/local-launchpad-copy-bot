'use strict';
// ── related_services in the niche entries (7 Nov 2026) ───────────────────────
// For each service page a niche can have, the three closest other services, used where a page names related
// work. The model proposes them, every name is checked against the niche's library, and the result is written
// into <stem>.json and its .md. The entries stay the source of truth, editable by hand.
//   node tools/niche-related-services.js --run [stem ...]     proposals in tests/quality-runs/niche-related/
//   node tools/niche-related-services.js --apply [stem ...]   writes them into the entries

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const line of fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const Anthropic = require('@anthropic-ai/sdk');
const { makeCallModel } = require('../anthropic-call');
const { extractJsonObject } = require('../json-extract');
const { parseCsv } = require('../niche-library/library');

const DIR = path.join(root, 'niche-library');
const OUT = path.join(root, 'tests/quality-runs/niche-related');
// Brandon's own picks win over the model's
const HAND = { landscaper: { 'lawn mowing': ['Hedge trimming', 'Weed control', 'Lawn seeding'] } };
const stems = () => fs.readdirSync(DIR).filter(f => f.endsWith('.json') && fs.existsSync(path.join(DIR, f.replace(/\.json$/, '.csv')))).map(f => f.slice(0, -5));

function servicesOf(stem) {
  const rows = parseCsv(fs.readFileSync(path.join(DIR, `${stem}.csv`), 'utf8'));
  const head = rows[0].map(h => h.trim().toLowerCase());
  const list = rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] || ''])));
  const names = new Map();
  for (const r of list) {
    const verdict = String(r.verdict || '').toLowerCase();
    const target = String(r.target || r.gbp_name || '').trim();
    if (verdict === 'page' && target && !names.has(target.toLowerCase())) names.set(target.toLowerCase(), target);
  }
  return [...names.values()];
}

async function propose(stem, call) {
  const services = servicesOf(stem);
  const message = `A UK ${stem.replace(/-/g, ' ')} business's website has one page per service. For each service below, name the three other services from this list a customer reading that page is most likely to want as well: the same kind of work, or work done at the same time on the same job. Closest first. Use only names from the list, spelled exactly.\n\nSERVICES:\n${services.map(s => `- ${s}`).join('\n')}\n\nReply with JSON only: {"<service>": ["<related>", "<related>", "<related>"], ...}, one key per service.`;
  const ask = () => call({ system: 'You sort a trade business\'s services by how closely they relate. JSON only.', message, maxTokens: 8000, effort: 'medium' });
  let got;
  try { got = extractJsonObject((await ask()).text); } catch (_) { got = extractJsonObject((await ask()).text); }
  const byLower = new Map(services.map(s => [s.toLowerCase(), s]));
  const out = {};
  for (const s of services) {
    const raw = got[s] || got[s.toLowerCase()] || [];
    const clean = [...new Set(raw.map(x => byLower.get(String(x).toLowerCase())).filter(x => x && x.toLowerCase() !== s.toLowerCase()))].slice(0, 3);
    if (clean.length) out[s.toLowerCase()] = clean;
  }
  Object.assign(out, HAND[stem] || {});
  return { services: services.length, related: out, missing: services.filter(s => !out[s.toLowerCase()]) };
}

function apply(stem) {
  const p = JSON.parse(fs.readFileSync(path.join(OUT, `${stem}.json`), 'utf8'));
  const related = { ...p.related, ...(HAND[stem] || {}) };
  const jsonFile = path.join(DIR, `${stem}.json`);
  let raw = fs.readFileSync(jsonFile, 'utf8');
  if (/"related_services"\s*:/.test(raw)) throw new Error(`${stem}.json already has related_services.`);
  const block = `  "related_services": {\n${Object.entries(related).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n  }`;
  const end = raw.lastIndexOf('}');
  raw = `${raw.slice(0, end).replace(/\s+$/, '')},\n${block}\n${raw.slice(end)}`;
  JSON.parse(raw);
  fs.writeFileSync(jsonFile, raw);
  const md = path.join(DIR, `Niche_Library_${stem.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('_')}.md`);
  const mdFile = fs.existsSync(md) ? md : fs.readdirSync(DIR).filter(f => /^Niche_Library_.*\.md$/.test(f)).map(f => path.join(DIR, f)).find(f => path.basename(f).toLowerCase().replace(/[_-]/g, '').includes(stem.replace(/-/g, '')));
  if (!mdFile) { console.log(`  no .md found for ${stem}`); return; }
  fs.appendFileSync(mdFile, `\n## Related services\n\nThe closest other services for each service page, closest first (\`related_services\`).\n\n| Service | Related |\n|---|---|\n${Object.entries(related).map(([k, v]) => `| ${k} | ${v.join(', ')} |`).join('\n')}\n`);
}

(async () => {
  const pick = process.argv.slice(3);
  const list = pick.length ? pick : stems();
  if (process.argv[2] === '--run') {
    fs.mkdirSync(OUT, { recursive: true });
    const call = makeCallModel(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }), 'claude-sonnet-5-5', { defaultEffort: 'medium' });
    let i = 0;
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (i < list.length) {
        const stem = list[i++];
        const f = path.join(OUT, `${stem}.json`);
        if (fs.existsSync(f)) continue;
        try { const p = await propose(stem, call); fs.writeFileSync(f, JSON.stringify(p, null, 2)); console.log(`${stem}: ${p.services} services, ${p.missing.length} with no match`); }
        catch (e) { console.log(`${stem}: FAILED ${e.message}`); }
      }
    }));
    return;
  }
  if (process.argv[2] === '--apply') { for (const stem of list) { apply(stem); console.log(`applied ${stem}`); } return; }
  console.log('Pass --run or --apply.');
})().catch(e => { console.error(e); process.exit(1); });
