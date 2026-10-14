'use strict';

// ── v20 reader view (Stage 8) ────────────────────────────────────────────────
// Turns a page record into Markdown that reads the way a visitor sees the page:
// page order, headings, hidden sections left out, [CV: key] tokens resolved to
// the client's values, links kept as Markdown links. Review notes go at the end.

const WATERMARK = 'TEST: CONTAINS STAND-IN VALUES';

function resolveTokens(text, values) {
  return String(text || '').replace(/\[CV: ([a-z0-9_]+)\]/g, (m, k) => (values[k] ? String(values[k]) : m));
}

function buildReaderView(record, values = {}) {
  const r = t => resolveTokens(t, values);
  const L = [];
  const push = (...xs) => L.push(...xs);
  const buttons = bs => (bs || []).map(b => `[ ${r(b)} ]`).join('  ');
  const shown = v => v && v !== 'HIDDEN';

  if (record.watermark) push(`> **${record.watermark}**`, '');
  push(`# ${values.company_name || 'Homepage'}: homepage (reader view)`, '');
  if (record.blocked) {
    push('Not generated: a gate failed.', '');
    for (const f of record.FLAGS || []) push(`- ${f.code}: ${f.msg}`);
    return L.join('\n') + '\n';
  }
  push(`**SEO title:** ${r(record.seo_title)}  `, `**Meta description:** ${r(record.meta_description)}`, '', '---', '');

  // Hero
  push(`# ${r(record.home_hero_h1)}`, '');
  if (record.home_hero_trust_line) push(`*${r(record.home_hero_trust_line)}*`, '');
  push(r(record.home_hero_intro), '');
  if (record.home_hero_rating_line) push(r(record.home_hero_rating_line), '');
  push(buttons(record.buttons), '');

  // Trusted & Rated By
  if (Array.isArray(record.home_trusted_logos) && record.home_trusted_logos.length) {
    push('## Trusted & Rated By', '');
    for (const l of record.home_trusted_logos) push(`- ${l.name}${l.caption ? ` (${l.caption})` : ''}`);
    push('');
  }

  // Content block
  push(`## ${r(record.home_content_block_h2)}`, '', r(record.home_content_block_body), '');

  // Services
  push(`## ${r(record.home_services_h2)}`, '', r(record.home_services_intro), '');
  for (const c of record.cards || []) {
    push(`### ${c.card_url ? `[${c.card_name}](${c.card_url})` : c.card_name}`, '', r(c.card_text), '');
  }
  if (shown(record.home_services_more_line)) push(r(record.home_services_more_line), '');

  // Why choose us
  push(`## ${r(record.home_why_h2)}`, '');
  for (const p of record.points || []) push(`### ${r(p.point_title)}`, '', r(p.point_body), '');

  // Reviews (the reviews themselves come from Google on the live page)
  if (record.home_reviews_show) push(`## ${r(record.home_reviews_h2)}`, '', '*(Google reviews shown here on the live page)*', '');

  // Process
  push(`## ${r(record.home_process_h2)}`, '');
  (record.steps || []).forEach((s, i) => push(`### ${i + 1}. ${r(s.step_title)}`, '', r(s.step_body), ''));

  // CTA band
  if (record.cta_band) push(`## ${r(record.cta_band.heading)}`, '', r(record.cta_band.line), '', buttons(record.cta_band.buttons), '');

  // Owner
  if (record.home_owner_show) push(`## ${r(record.home_owner_h2)}`, '', r(record.home_owner_body), '');

  // Areas
  push(`## ${r(record.home_areas_h2)}`, '', r(record.home_areas_intro), '');
  for (const a of record.home_areas_links || []) push(`- ${a.url ? `[${a.name}](${a.url})` : a.name}`);
  push('');

  // FAQ
  push(`## ${r(record.home_faq_h2)}`, '');
  for (const f of record.faq_items || []) push(`### ${r(f.faq_question)}`, '', r(f.faq_answer), '');

  // Final CTA
  push(`## ${r(record.home_final_cta_h2)}`, '', r(record.home_final_cta_body), '', buttons(record.buttons), '');
  for (const t of record.home_final_cta_trust_lines || []) push(`- ${r(t)}`);
  push('');

  // Review notes
  const V = record.VALIDATION || {};
  push('---', '', '## Review notes (not part of the page)', '');
  if (V.status === 'run') {
    push(`Validation ${V.source === 'hand edit' ? 'after the hand edit' : 'after retries'}: **${V.block} BLOCK, ${V.flag} FLAG**.`, '');
    for (const i of V.issues || []) push(`- ${i.type} ${i.check} · ${i.field}: ${i.message}`);
    if ((V.issues || []).length) push('');
  } else {
    push('Validation not run.', '');
  }
  const C = record.CLAIMS;
  if (C) {
    if (C.status === 'failed') push(`Claims review: failed (${C.error}). Run it again before pushing.`, '');
    else {
      if (C.source === 'hand edit') push(`Claims review after the hand edit: ${C.findings.length} found${C.findings.length ? `, ${(C.accepted || []).length} already accepted on the previous version` : ''}.`, '');
      else push(`Claims review: ${C.first_review ?? '?'} found, ${C.findings.length} left after rewrites${C.findings.length ? ' (a person must accept these before a push)' : ''}.`, '');
      for (const f of C.findings) push(`- ${f.field}: "${f.quote}" (${f.why})${f.carried ? ' [accepted on the previous version]' : ''}${f.note ? ` [${f.note}]` : ''}`);
      if (C.findings.length) push('');
    }
  }
  const flags = record.FLAGS || [];
  if (flags.length) {
    push('Flags:');
    for (const f of flags) push(`- ${f.code} (${f.source}): ${f.msg}`);
    push('');
  }
  const unresolved = [...new Set((L.join('\n').match(/\[CV: [a-z0-9_]+\]/g) || []))];
  if (unresolved.length) push(`Tokens with no value on file: ${unresolved.join(', ')}`, '');
  if (record.meta && record.meta.generated_at) push(`Generated ${record.meta.generated_at} with ${record.meta.model || ''}.`);
  for (const e of (record.meta && record.meta.edit_history) || []) push(`Edited by hand ${e.at}: ${e.fields.join(', ')}.`);
  return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

// The .json download: the record with the watermark first
function buildJsonDownload(record) {
  return JSON.stringify(record, null, 2) + '\n';
}

function downloadName(values, ext) {
  const name = (values.company_name || 'client').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return `${name}_homepage_v20.${ext}`;
}

module.exports = { buildReaderView, buildJsonDownload, resolveTokens, downloadName, WATERMARK };
