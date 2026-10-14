'use strict';
// Fixture: v20 downloads (Stage 8). Reader view and .json from a saved real record.
const path = require('path');
const root = path.join(__dirname, '../..');
const { buildReaderView, buildJsonDownload, resolveTokens, downloadName, WATERMARK } = require(path.join(root, 'v20-reader.js'));
const G = require(path.join(root, 'v20-generate.js'));
const E = require(path.join(__dirname, 'data/edens-edge-acceptance.js'));

let pass = 0, fail = 0;
const chk = (label, ok, got, want) => {
  if (ok) { console.log('✓ ' + label); pass++; }
  else    { console.log('✗ ' + label + '\n  got:  ' + got + '\n  want: ' + want); fail++; }
};
console.log('\n=== FIXTURE: v20 reader view and downloads ===\n');

const rec = require(path.join(__dirname, 'v20-outputs/edens-edge-2026-10-14-stage7b-record.json'));
const values = G.clientValueMap({ ...E.ethanValues(), phone: '023 0000 0000' }, null);
const md = buildReaderView(rec, values);
const page = md.slice(0, md.indexOf('## Review notes'));

chk('No [CV: tokens left on the page', !/\[CV: /.test(page), (page.match(/\[CV: [a-z_]+\]/g) || []).join(','), 'none');
chk('Company name, phone and travel distance resolved', page.includes('Edens Edge Landscaping is a landscaper in Southampton') && page.includes('Call 023 0000 0000') && /20 miles inland and along the coast/.test(page), '', 'resolved');
const order = ['# Landscaper Southampton', '## Local Landscaping in Southampton', '## Our Landscaping Services', '## Why Southampton', '## Your Free Quote in 3 Simple Steps', '## Ready to talk to a local landscaper?', '## Where Our Landscapers Work Around Southampton', '## Your Landscaping Questions Answered', '## Get a Free Quote From a Local Landscaper'];
const idx = order.map(h => page.indexOf(h));
chk('Sections in page order', idx.every((v, i) => v >= 0 && (i === 0 || v >= idx[i - 1])), idx.join(','), 'ascending');
chk('Hidden sections left out (logos, reviews, owner)', !/Trusted & Rated By/.test(page) && !/Google reviews shown here/.test(page) && !/Meet Ethan/.test(page), '', 'absent');
chk('Card headings link to their pages', /### \[Gardener\]\(\/gardener\)/.test(page), '', '### [Gardener](/gardener)');
chk('Links kept as Markdown', /\[landscaping in Romsey\]\(\/locations\/romsey\/\)/.test(page), '', 'kept');
chk('Area list: Southampton plain, towns linked, New Forest plain', /\n- Southampton\n/.test(page) && /\n- \[Romsey\]\(\/locations\/romsey\)\n/.test(page) && /\n- New Forest\n/.test(page), '', 'all three');
chk('CTA band: heading, "Tell us" line, buttons', /## Ready to talk to a local landscaper\?\n\nTell us about your garden and we'll get back to you\.\n\n\[ Get My Free Quote \]  \[ Call 023 0000 0000 \]/.test(page), '', 'band');
chk('Review notes at the end with the validation result', /## Review notes \(not part of the page\)\n\nValidation after retries: \*\*0 BLOCK, 5 FLAG\*\*/.test(md), '', 'notes');
chk('No watermark without stand-ins', !md.includes(WATERMARK), '', 'none');

const { page: pg, ...restRec } = rec;
const withStandIns = { page: pg, watermark: WATERMARK, can_mark_done: false, ...restRec };
chk('Watermark on top of the reader view with stand-ins', buildReaderView(withStandIns, values).startsWith(`> **${WATERMARK}**`), '', 'first line');
chk('Watermark near the top of the .json', buildJsonDownload(withStandIns).indexOf(WATERMARK) < 80, buildJsonDownload(withStandIns).slice(0, 80), 'top');
chk('.json parses and keeps VALIDATION and FLAGS', (() => { const j = JSON.parse(buildJsonDownload(rec)); return j.VALIDATION && j.FLAGS && j.cards.length === 7; })(), '', 'ok');
chk('A token with no value stays visible and is listed', resolveTokens('Open [CV: hours].', {}) === 'Open [CV: hours].' && /Tokens with no value on file: \[CV: hours\]/.test(buildReaderView({ ...rec, home_final_cta_trust_lines: ['[CV: hours]'] }, values)), '', 'listed');
chk('File names from the company name', downloadName(values, 'md') === 'Edens_Edge_Landscaping_homepage_v20.md', downloadName(values, 'md'), 'Edens_Edge_Landscaping_homepage_v20.md');
chk('Blocked record: reader view says so', /Not generated: a gate failed/.test(buildReaderView({ blocked: true, FLAGS: [{ code: 'G-INPUT', msg: 'phone blank' }] }, values)), '', 'blocked');

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
