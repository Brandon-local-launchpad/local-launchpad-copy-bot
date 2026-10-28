'use strict';

// ── Blog post reader view (Markdown) ─────────────────────────────────────────
// The post in its order: the breadcrumb, the H1, the byline and last checked line, the quick
// answer, the sections with the table under its section, the business block, the FAQ, the
// next step. Stage 6 polishes it for the Page view; stage 3 gives the shape.

function buildBlogReaderView(record, values = {}) {
  if (!record || record.blocked) return `# (blocked)\n\n${(record && record.FLAGS || []).map(f => `- ${f.code}: ${f.msg}`).join('\n')}`;
  const L = [];
  L.push(`Home › Guides › ${record.blog_h1 || ''}`);
  L.push('');
  L.push(`# ${record.blog_h1 || ''}`);
  L.push('');
  L.push(`*${record.blog_byline || ''} · Last checked ${record.blog_last_checked_text || record.blog_last_checked || ''}*`);
  L.push('');
  L.push(`> ${record.blog_answer || ''}`);
  L.push('');
  (record.sections || []).forEach((s, i) => {
    L.push(`## ${s.h2}`);
    L.push('');
    L.push(s.body || '');
    L.push('');
    if (record.table_show && (record.table_after || 1) === i + 1 && (record.table_rows || []).length) {
      const cols = record.table_columns || [];
      L.push(`| ${cols.join(' | ')} |`);
      L.push(`| ${cols.map(() => '---').join(' | ')} |`);
      for (const r of record.table_rows) L.push(`| ${[r.row, ...(r.cells || [])].join(' | ')} |`);
      L.push('');
    }
  });
  if (record.blog_business_show && record.blog_business && record.blog_business !== 'HIDDEN') {
    L.push(`## ${record.blog_business_h2 || ''}`);
    L.push('');
    L.push(record.blog_business);
    L.push('');
  }
  if ((record.faq_items || []).length) {
    L.push(`## ${record.blog_faq_h2 || ''}`);
    L.push('');
    for (const f of record.faq_items) { L.push(`### ${f.faq_question}`); L.push(''); L.push(f.faq_answer || ''); L.push(''); }
  }
  L.push(`## ${record.blog_cta_h2 || ''}`);
  L.push('');
  L.push(record.blog_closing || '');
  L.push('');
  L.push((record.buttons || []).map(b => `[${b}]`).join(' '));
  return L.join('\n').replace(/\[CV: ([a-z0-9_]+)\]/g, (m, k) => (values && values[k] ? String(values[k]) : m));
}

module.exports = { buildBlogReaderView };
