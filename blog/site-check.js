'use strict';

// ── The site wide check (stage 2, 28 Oct 2026) ────────────────────────────────
// No question, neighbourhood or symptom repeats across pages and posts. Extends the FAQ
// sorting's siteRepeats (wording only) to the three kinds:
//   questions       each page's assigned questions (faq-sort.js assignQuestions) and each
//                   blog topic's target, query stack and FAQ questions, by wording
//   neighbourhoods  the allocation record's picks per page (allocation.pages[key].neighbourhoods)
//   symptoms        the allocation record's symptom picks, the symptoms the written pages took
//                   (read off their DECISIONS block, as service-run.js does) and each local
//                   post's dossier condition; a symptom counts as its issue too, so a post on
//                   the issue a page's symptom belongs to is a repeat
// Returns { ok, questions, neighbourhoods, symptoms, counts }, each list [{ item, pages }].

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// The symptoms a written page took, off its decisions block (the text in quotes after a
// "Symptom for …:" line, or a quoted line followed by "(issue: …)")
function symptomsOf(record) {
  const out = [];
  const block = (record && record.meta && record.meta.decisions_block) || '';
  for (const m of block.matchAll(/^\s*(?:Symptom for [^:\n]*|"[^"\n]+") ?(?:: "([^"\n]+)"|\(issue: ([^)\n]+)\))/gm)) if (m[1]) out.push(m[1]);
  for (const m of block.matchAll(/^\s+"([^"\n]+)" \(issue: /gm)) out.push(m[1]);
  return [...new Set(out)];
}

function repeatsOf(byPage) {
  const seen = new Map(); // item → first page
  const found = new Map(); // item → Set of pages
  for (const [page, items] of Object.entries(byPage)) {
    for (const raw of items || []) {
      const key = norm(raw);
      if (!key) continue;
      if (seen.has(key) && seen.get(key) !== page) { if (!found.has(key)) found.set(key, new Set([seen.get(key)])); found.get(key).add(page); }
      else if (!seen.has(key)) seen.set(key, page);
    }
  }
  return [...found.entries()].map(([item, pages]) => ({ item, pages: [...pages] }));
}

// pagesQuestions: { pageId: [wording] }; topics: blog/topics.js topics with the question wordings
// resolved (topicQuestions(topic, byId)); allocationRecord: { pages: { key: { neighbourhoods, symptoms } } };
// pageRecords: [{ page: 'type:key', record }]; dossiers: [{ town, parsed }] (geo-dossier.js parseDossier)
function siteWideCheck({ pagesQuestions = {}, topics = [], questionsById = new Map(), allocationRecord = null, pageRecords = [], dossiers = [] } = {}) {
  // Questions
  const q = { ...pagesQuestions };
  for (const t of topics) {
    const words = [t.wording];
    for (const id of [...(t.query_stack || []), ...(t.faq_ids || [])]) { const x = questionsById.get(id); if (x) words.push(x.wording || x.text); }
    q[`blog:${t.key}`] = words;
  }
  const questions = repeatsOf(q);

  // Neighbourhoods
  const n = {};
  for (const [key, picks] of Object.entries((allocationRecord && allocationRecord.pages) || {})) n[key] = (picks && picks.neighbourhoods) || [];
  const neighbourhoods = repeatsOf(n);

  // Symptoms: ids and texts, each page's symptom also as its issue
  const symptomText = new Map(), symptomIssue = new Map(), issueText = new Map();
  for (const d of dossiers) {
    const p = d.parsed || d;
    for (const s of p.symptoms || []) { symptomText.set(norm(s.text), s.id); symptomIssue.set(s.id, s.issueId); }
    for (const i of p.issues || []) issueText.set(i.id, i.title);
  }
  const s = {};
  const addS = (page, id) => { if (!id) return; (s[page] = s[page] || []).push(id); const issue = symptomIssue.get(id); if (issue) s[page].push(issue); };
  for (const [key, picks] of Object.entries((allocationRecord && allocationRecord.pages) || {})) for (const id of Object.values((picks && picks.symptoms) || {})) addS(key, id);
  for (const { page, record } of pageRecords) for (const text of symptomsOf(record)) addS(page, symptomText.get(norm(text)) || text);
  for (const t of topics) if (t.dossier_condition) { const page = `blog:${t.key}`; addS(page, t.dossier_condition.id); if (t.dossier_condition.symptom) addS(page, t.dossier_condition.symptom.id); }
  // A symptom id and its issue id both sit on a page: the same page never repeats itself
  const symptoms = repeatsOf(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, [...new Set(v)]]))).map(r => ({ ...r, label: issueText.get(r.item.toUpperCase()) || '' }));

  return {
    ok: !questions.length && !neighbourhoods.length && !symptoms.length,
    questions, neighbourhoods, symptoms,
    counts: { pages: Object.keys(q).length, questions: questions.length, neighbourhoods: neighbourhoods.length, symptoms: symptoms.length },
  };
}

module.exports = { siteWideCheck, symptomsOf, repeatsOf };
