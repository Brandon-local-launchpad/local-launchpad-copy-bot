'use strict';

// ── Category page reader view (23 Oct 2026) ──────────────────────────────────
// The page as a visitor reads it, in Markdown: page order, headings, hidden sections
// left out, [CV: key] tokens resolved, links kept. Review notes at the end, as on the
// homepage (v20-reader.js).

const { resolveTokens } = require('./v20-reader');
const { LABELS } = require('./page-types/category');

function buildCategoryReaderView(record, values = {}) {
  const r = t => resolveTokens(t, values);
  const L = [];
  const push = (...xs) => L.push(...xs);
  const buttons = bs => (bs || []).map(b => `[ ${r(b)} ]`).join('  ');
  const shown = v => v && v !== 'HIDDEN';
  const label = record.scope === 'town' ? 'location category page' : 'category page';

  if (record.watermark) push(`> **${record.watermark}**`, '');
  push(`# ${values.company_name || 'Client'}: ${record.category || ''} ${record.scope === 'town' ? record.town : ''} (${label}, reader view)`, '');
  if (record.blocked) {
    push('Not generated: a gate failed.', '');
    for (const f of record.FLAGS || []) push(`- ${f.code}: ${f.msg}`);
    return L.join('\n') + '\n';
  }
  push(`**SEO title:** ${r(record.seo_title)}  `, `**Meta description:** ${r(record.meta_description)}`, '');
  if (Array.isArray(record.breadcrumb)) push(`*${record.breadcrumb.map(b => (b.url ? `[${b.name}](${b.url})` : b.name)).join(' › ')}*`, '');
  push('---', '');

  // Hero
  push(`# ${r(record.cat_hero_h1)}`, '');
  if (record.cat_hero_trust_line) push(`*${r(record.cat_hero_trust_line)}*`, '');
  push(r(record[LABELS.hero]), '');
  if (record.cat_hero_rating_line) push(r(record.cat_hero_rating_line), '');
  push(buttons(record.buttons), '');

  // Services
  push(`## ${r(record.cat_services_h2)}`, '', r(record[LABELS.servicesIntro]), '');
  for (const c of record.cards || []) push(`### ${c.card_url ? `[${c.card_name}](${c.card_url})` : c.card_name}`, '', r(c.card_text), '');
  if (shown(record[LABELS.alsoOffered])) push(r(record[LABELS.alsoOffered]), '');

  // Content block
  push(`## ${r(record.cat_content_h2)}`, '', r(record[LABELS.content]), '');

  // Block 4
  push(`## ${r(record.cat_block4_h2)}`, '');
  for (const p of record.block4 || []) push(`### ${r(p.card_title)}`, '', r(p.card_body), '');

  // Block 5
  push(`## ${r(record.cat_block5_h2)}`, '', r(record[LABELS.costIntro]), '');
  for (const p of record.block5 || []) push(`### ${r(p.card_title)}`, '', r(p.card_body), '');
  if (record.cat_cost_price_line) push(`*Price list: ${r(record.cat_cost_price_line)}*`, '');

  // Reviews
  if (record.cat_reviews_show) {
    push(`## ${r(record.cat_reviews_h2)}`, '');
    for (const rv of record.reviews || []) push(`> ${rv.text}`, `> — ${[rv.name, rv.town].filter(Boolean).join(', ') || 'Google review'}`, '');
  }

  // Process
  push(`## ${r(record.cat_process_h2)}`, '');
  (record.steps || []).forEach((s, i) => push(`### ${i + 1}. ${r(s.step_title)}`, '', r(s.step_body), ''));

  // Areas
  push(`## ${r(record.cat_areas_h2)}`, '', r(record[LABELS.areasIntro]), '');
  for (const a of record.cat_areas_links || []) push(`- ${a.url ? `[${a.name}](${a.url})` : a.name}`);
  push('');
  const also = record.cat_areas_also_cover || [];
  if (also.length) push(`We also cover ${also.length > 1 ? `${also.slice(0, -1).join(', ')} and ${also[also.length - 1]}` : also[0]}.`, '');

  // FAQ
  push(`## ${r(record.cat_faq_h2)}`, '');
  for (const f of record.faq_items || []) push(`### ${r(f.faq_question)}`, '', r(f.faq_answer), '');

  // Final CTA
  push(`## ${r(record.cat_final_cta_h2)}`, '', r(record[LABELS.finalCta]), '', buttons(record.buttons), '');
  for (const t of record.cat_final_cta_trust_lines || []) push(`- ${r(t)}`);
  push('');

  // Review notes
  const V = record.VALIDATION || {};
  push('---', '', '## Review notes (not part of the page)', '');
  if (V.status === 'run') {
    push(`Validation ${V.source === 'hand edit' ? 'after the hand edit' : 'after retries'}: **${V.block} BLOCK, ${V.flag} FLAG**.`, '');
    for (const i of V.issues || []) push(`- ${i.type} ${i.check} · ${i.field}: ${i.message}`);
    if ((V.issues || []).length) push('');
  } else push('Validation not run.', '');
  const C = record.CLAIMS;
  if (C) {
    if (C.status === 'failed') push(`Claims review: failed (${C.error}). Run it again before pushing.`, '');
    else {
      push(`Claims review: ${C.first_review ?? '?'} found, ${(C.findings || []).length} left after rewrites${(C.findings || []).length ? ' (a person must accept these before a push)' : ''}.`, '');
      for (const f of C.findings || []) push(`- ${f.field}: "${f.quote}" (${f.why})`);
      if ((C.findings || []).length) push('');
    }
  }
  // The rubric review (docs/seo/COPY_QUALITY_RUBRIC.md): every failed item with the sentence it failed on
  const Qr = record.QUALITY;
  if (Qr) {
    if (Qr.status === 'failed') push(`Quality review: failed (${Qr.error}).`, '');
    else {
      push(`Quality review: **${Qr.score === null || Qr.score === undefined ? 'n/a' : Qr.score.toFixed(1)} / 10**${(Qr.rounds || []).length ? ` (rounds ${Qr.rounds.map(r => r.score).join(', ')})` : ''}, ${(Qr.failed || []).length ? `failing ${Qr.failed.join(', ')}` : 'every rubric item passes'}.`, '');
      for (const i of Qr.failures || []) {
        push(`- **${i.id} ${i.title}** (${i.by})`);
        for (const reason of i.reasons || []) push(`  - ${reason}`);
      }
      if ((Qr.failures || []).length) push('');
      if ((Qr.other_problems || []).length) {
        push('Other problems the reviewer noticed:');
        for (const p of Qr.other_problems) push(`- "${p.quote}": ${p.why}`);
        push('');
      }
      if ((Qr.missing_facts || []).length) {
        push('Client facts that would let the page say more:');
        for (const m of Qr.missing_facts) push(`- ${m.fact}: ${m.why}`);
        push('');
      }
    }
  }
  const flags = record.FLAGS || [];
  if (flags.length) { push('Flags:'); for (const f of flags) push(`- ${f.code} (${f.source}): ${f.msg}`); push(''); }
  const unresolved = [...new Set((L.join('\n').match(/\[CV: [a-z0-9_]+\]/g) || []))];
  if (unresolved.length) push(`Tokens with no value on file: ${unresolved.join(', ')}`, '');
  if (record.meta && record.meta.generated_at) push(`Generated ${record.meta.generated_at} with ${record.meta.model || ''}.`);
  for (const e of (record.meta && record.meta.edit_history) || []) push(`Edited by hand ${e.at}: ${e.fields.join(', ')}.`);
  return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

module.exports = { buildCategoryReaderView };
