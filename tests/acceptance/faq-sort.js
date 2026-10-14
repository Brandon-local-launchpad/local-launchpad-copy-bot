'use strict';
// FAQ sorting, live: runs the tidy call (one Sonnet call, plus a retry when the
// checks fail) on the two manual FAQ research runs, and saves every raw reply to
// tests/fixtures/faq-sort-replies/<client>.json (replaced on each run) so tests/fixtures/faq-sort.js can replay them.
// About 3p per client. Run: node tests/acceptance/faq-sort.js [edens|kestrel]

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
for (const line of (fs.existsSync(path.join(root, '.env')) ? fs.readFileSync(path.join(root, '.env'), 'utf8') : '').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!process.env.ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY is not set.'); process.exit(1); }

const Anthropic = require('@anthropic-ai/sdk');
const R = require(path.join(root, 'faq-research.js'));
const S = require(path.join(root, 'faq-sort.js'));
const clients = require(path.join(root, 'tests/fixtures/data/faq-clients.js'));

const OUT = path.join(root, 'tests/fixtures/faq-sort-replies');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv[2];
  for (const c of clients.list) {
    if (only && !c.id.startsWith(only)) continue;
    const research = R.parseFaqResearch(fs.readFileSync(c.researchFile, 'utf8'));
    const replies = [];
    const usage = { input: 0, output: 0 };
    const callModel = async (system, message) => {
      const r = await client.messages.create({ model: S.FAQ_SORT_MODEL, max_tokens: 8000, system, messages: [{ role: 'user', content: message }] });
      usage.input += r.usage.input_tokens; usage.output += r.usage.output_tokens;
      const text = r.content.map(x => x.text || '').join('');
      replies.push(text);
      return text;
    };
    const t0 = Date.now();
    const tidy = await S.runTidy({ research, niche: c.niche, keyValueMap: c.keyValueMap, serviceParentMap: c.serviceParentMap, pages: c.pages, cv: c.cvThin, callModel });
    fs.writeFileSync(path.join(OUT, `${c.id}.json`), JSON.stringify({ run: new Date().toISOString(), model: S.FAQ_SORT_MODEL, replies }, null, 2) + '\n');
    console.log(`\n=== ${c.id}: ${tidy.attempts.length} attempt(s), ${Math.round((Date.now() - t0) / 1000)}s, ${usage.input} in / ${usage.output} out ===`);
    for (const a of tidy.attempts) console.log(`  attempt ${a.attempt}: ${a.errors.length} error(s)${a.errors.length ? '\n    ' + a.errors.join('\n    ') : ''}`);
    for (const q of tidy.questions) {
      console.log(`  ${q.id} [${q.page}${q.service ? ' / ' + q.service : ''}${q.town ? ' / ' + q.town : ''}] ${q.wording}` +
        `${q.duplicate_of ? ' DUP ' + q.duplicate_of : ''}${q.covered_by ? ' COVERED ' + q.covered_by : ''}${q.fact ? ' FACT ' + q.fact : ''}${q.new_fact ? ' NEW ' + q.new_fact : ''}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
