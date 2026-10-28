'use strict';
// A stub model for blog posts (stage 4, 28 Oct 2026): it reads the MODEL FIELDS list at the
// end of the post's message (blog/decisions.js formatBlogBlock) and writes every field it asks
// for, at the post type's length, so a post parses into its fields with nothing left over.
// The prose is filler (one sentence cycled), so the validator's N7 and REPEAT flags are
// expected on it. Used by tests/fixtures/blog-generation.js and the demo server's fake SDK.
const WORDS = 'the ground under a patio decides how long it lasts and a base laid on soft soil moves within a year so the first job is to dig out the top layer and check what sits below then a compacted sub base goes in before any slab is laid and the joints are pointed once the slabs have settled which keeps water out of the base and stops weeds taking hold'.split(' ');
const words = (n, seed = 0) => { const out = []; for (let i = 0; i < n; i++) out.push(WORDS[(i + seed) % WORDS.length]); let s = out.join(' '); s = s.charAt(0).toUpperCase() + s.slice(1); return s.endsWith('.') ? s : s + '.'; };
const BODY = { cost_guide: 180, decision: 160, question: 160, local: 150 };

function stubReply(message) {
  const type = (message.match(/^POST: post_type (\w+)/m) || [])[1] || 'question';
  const primary = (message.match(/^  \[primary\] (\S+) /m) || [])[1] || '/';
  const mf = message.slice(message.indexOf('MODEL FIELDS:'));
  const L = ['=== MODEL OUTPUT: blog ==='];
  const lines = mf.split('\n').slice(1);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^  blog_answer$/.test(l)) {
      // A cost guide in prices mode states the PRICE row's range first (B-PRICE)
      const range = (message.match(/\[PRICE-1\][^\n]*?(£[\d,]+ to £[\d,]+(?: per \w+)?)/) || [])[1];
      // A seasonal post gives the timing in its first sentence (B-TIMING)
      const seasonal = /^Timing: a seasonal post/m.test(message);
      L.push(`blog_answer: ${type === 'cost_guide' && range ? `It usually costs ${range} in Southampton, and the size moves it most. ${words(30, 9)}` : seasonal ? `Spring, from March to April, is the time for this work in Southampton. ${words(35, 9)}` : `${words(12, 3)} ${words(33, 9)}`}`);
    }
    else if (/^  blog_sections$/.test(l)) {
      L.push('blog_sections:');
      let k = 0;
      while (lines[i + 1] && /^    - h2: /.test(lines[i + 1])) {
        const h2 = lines[++i].replace(/^    - h2: /, '').replace(/ \| body$/, '');
        const n = BODY[type];
        const link = k === 0 ? ` See [the work we do](${primary}) for more.` : '';
        L.push(`- h2: ${h2} | body: ${words(20, k)}${link}\\n\\n${words(Math.floor(n / 2) - 25, k + 7)}\\n\\n${words(n - Math.floor(n / 2) - 5, k + 13)}`);
        k++;
      }
    }
    else if (/^  blog_table \(HIDDEN\)$/.test(l)) L.push('blog_table: HIDDEN');
    else if (/^  blog_table$/.test(l)) {
      L.push('blog_table:');
      while (lines[i + 1] && /^    - row: /.test(lines[i + 1])) {
        const row = lines[++i];
        const label = row.replace(/^    - row: /, '').replace(/ \| cells:.*$/, '');
        const cols = (row.match(/<[^>]+>/g) || []).length;
        L.push(`- row: ${label} | cells: ${Array.from({ length: cols }, (_, c) => words(4, c + 20).replace(/\.$/, '')).join(' ; ')}`);
      }
    }
    else if (/^  blog_business \(HIDDEN\)$/.test(l)) L.push('blog_business: HIDDEN');
    else if (/^  blog_business$/.test(l)) L.push(`blog_business: ${words(60, 5)}`);
    else if (/^  blog_faq_items$/.test(l)) {
      L.push('blog_faq_items:');
      while (lines[i + 1] && /^    - faq_question: /.test(lines[i + 1])) {
        const q = lines[++i].replace(/^    - faq_question: /, '').replace(/ \| faq_answer$/, '');
        L.push(`- faq_question: ${q} | faq_answer: ${words(10, 2)} ${words(42, 11)}`);
      }
    }
    else if (/^  blog_closing$/.test(l)) L.push(`blog_closing: ${words(14, 4).replace(/\.$/, '')}, so [book a visit](${primary}) when you are ready. ${words(8, 6)}`);
    else if (/^  MODEL_FLAGS$/.test(l)) L.push('MODEL_FLAGS: none');
  }
  return L.join('\n');
}

// Is this request a blog post's? (the system prompt is CORE (1))
const isBlogRequest = params => (Array.isArray(params.system) ? params.system.map(s => s.text || '').join('\n') : String(params.system || '')).includes('Blog Post Copywriting Prompt');
const lastMessageText = params => { const m = (params.messages || []).slice(-1)[0]; if (!m) return ''; return Array.isArray(m.content) ? m.content.map(c => c.text || '').join('\n') : String(m.content || ''); };

// The text with the post's MODEL FIELDS block in a blog request: the message (the first call)
// or the system (a retry carries the block there), else null (another prompt's call)
const blogBlockOf = params => { if (!isBlogRequest(params)) return null; const m = lastMessageText(params); if (m.includes('MODEL FIELDS:')) return m; const sys = Array.isArray(params.system) ? params.system.map(s => s.text || '').join('\n') : String(params.system || ''); return sys.includes('MODEL FIELDS:') ? sys : null; };

module.exports = { stubReply, words, isBlogRequest, lastMessageText, blogBlockOf };
