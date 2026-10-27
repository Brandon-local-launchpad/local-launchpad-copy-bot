'use strict';
// Fixture: the copy quality review step (quality-review.js) scores the rubric
// (docs/seo/COPY_QUALITY_RUBRIC.md). Offline: code items only, and the judge call
// with a canned reply.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const Q = require(path.join(root, 'quality-review.js'));
const G = require(path.join(root, 'v20-generate.js'));
const { computeDecisions } = require(path.join(root, 'decisions.js'));
const real = require(path.join(__dirname, 'data/edens-edge-real.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));
const landscaper = require(path.join(root, 'niche-library/landscaper.json'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: copy quality review ===\n');

// Every rubric ID in the doc is scored, and every scored ID is in the doc
const doc = fs.readFileSync(path.join(root, 'docs/seo/COPY_QUALITY_RUBRIC.md'), 'utf8');
const docIds = [...doc.matchAll(/^\| ([A-Z]\d+) \|/gm)].map(m => m[1]);
const scored = new Set([...Object.keys(Q.CODE_ITEMS), ...Object.keys(Q.CATEGORY_ITEMS), ...Object.keys(Q.SERVICE_ITEMS), ...Object.keys(Q.LOCATION_ITEMS), ...Object.keys(Q.JUDGE_ITEMS).map(id => id.replace(/j$/, ''))]);
chk('Every rubric item in the doc is scored', docIds.every(id => scored.has(id)), docIds.filter(id => !scored.has(id)).join(', '), 'all');
chk('Every scored item is in the doc', [...scored].every(id => docIds.includes(id)), [...scored].filter(id => !docIds.includes(id)).join(', '), 'all');

// The round 2 live page (the stage 7b record has the problems the reviews found)
const cv = { ...E.ethanValues(), map_embed: 'x', coastal_city: 'yes', phone: '07850 412717', team_size: '4' };
const DR = computeDecisions({ cv, niche: landscaper, pages: real.pages, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap, v20TestMode: true, allocationData: null });
const V = G.validationContextFor({ cv, niche: landscaper, decisions: DR.decisions, keyValueMap: real.keyValueMap, serviceParentMap: real.serviceParentMap });
const rec = require(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));
const { items } = Q.scoreCodeItems({ record: rec, V, D: DR.decisions, cv, niche: landscaper });
const failed = new Set(items.filter(i => !i.pass).map(i => i.id));
for (const id of ['S1', 'S3', 'C1', 'F4', 'B2']) chk(`An old page fails ${id} (${Q.CODE_ITEMS[id].title})`, failed.has(id), [...failed].join(', '), id);
chk('Today\'s decisions pass S2 (card picks) and H2 (final CTA heading)', !failed.has('S2') && !failed.has('H2'), items.filter(i => ['S2', 'H2'].includes(i.id)).map(i => i.reasons.join(' ')).join(' | '), 'pass');

// H2 catches "Local Gardener" on a landscaper's page; S2 catches a specialist lead
const dec = Q.decisionsTests({ record: { ...rec, home_final_cta_h2: 'Get a Free Quote From a Local Gardener in Southampton' }, D: DR.decisions, cv, niche: landscaper });
chk('H2: "Local Gardener" on a Landscaper page fails', !!dec.finalCta, dec.finalCta, 'fail');
const badD = { ...DR.decisions, d9: { ...DR.decisions.d9, main: DR.decisions.d9.main.map(c => c.name === 'Tree Service' ? { ...c, services: ['tree bracing', 'stump removal'] } : c.name === 'Gardener' ? { ...c, services: ['lawn mowing'] } : c) } };
const dec2 = Q.decisionsTests({ record: rec, D: badD, cv, niche: landscaper });
chk('S2: tree bracing leading and mowing under Gardener fail', /tree bracing/.test(dec2.cardPicks || '') && /lawn mowing" belongs under lawn care service/.test(dec2.cardPicks || ''), dec2.cardPicks, 'both');

// The judge reply is read, and a missing judge item fails
(async () => {
  const reply = JSON.stringify({ items: Object.keys(Q.JUDGE_ITEMS).filter(id => id !== 'Y5').map(id => ({ id, pass: true })), score: 9.1, other_problems: [] });
  const rv = await Q.reviewPage({ record: rec, V, D: DR.decisions, cv, niche: landscaper, callModel: async () => ({ text: reply }) });
  chk('Review: score read; an item the reviewer skipped fails; not done with failures', rv.score === 9.1 && rv.failed.includes('Y5') && !rv.done, `${rv.score} ${rv.failed.join(',')}`, '9.1, Y5 failed, not done');
  chk('Review prompt is CORE (3) and asks for JSON with items and score', /"score"/.test(Q.loadReviewPrompt()) && /CORE \(3\)/.test(fs.readFileSync(path.join(root, 'prompts/Copy_Quality_Review_CORE.md'), 'utf8')), '', 'prompt');
  console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
})();
