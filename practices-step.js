'use strict';

// ── The practice tick list, a client onboarding step (Brandon, 7 Nov 2026) ───
// After the Fillout form, the client gets a link to a yes/no list of every working practice in their niche
// (niche-library/practices.json), the most common first. Their answers go straight into confirmed_practices,
// the list the copy may state. The link carries a signed token, so the page needs no login and opens only
// that client's list. A practice they leave blank is left as it was.

const crypto = require('crypto');
const { practicesFor } = require('./practices');

// Asked first, in this order, where the niche has them
const COMMON_FIRST = ['price_agreed_before_work', 'strimmer_edges', 'paths_swept_after_mowing', 'green_waste_choice', 'nesting_bird_check', 'autumn_leaf_clearance'];

function orderedPractices(niche) {
  const all = practicesFor(niche);
  const first = COMMON_FIRST.map(k => all.find(p => p.key === k)).filter(Boolean);
  return [...first, ...all.filter(p => !COMMON_FIRST.includes(p.key))];
}

const sign = (clientId, secret) => crypto.createHmac('sha256', secret).update(`practices:${clientId}`).digest('hex').slice(0, 24);
const tokenFor = (clientId, secret) => `${clientId}.${sign(clientId, secret)}`;
function clientIdOf(token, secret) {
  const [id, mac] = String(token || '').split('.');
  if (!id || !mac) return null;
  const want = Buffer.from(sign(id, secret)), got = Buffer.from(mac);
  return want.length === got.length && crypto.timingSafeEqual(want, got) ? id : null;
}

// The answers as the client values to save
function applyAnswers(cv, practices, answers, now = new Date().toISOString()) {
  const keys = new Set(practices.map(p => p.key));
  const yes = new Set((Array.isArray(cv.confirmed_practices) ? cv.confirmed_practices : []));
  const given = {};
  for (const [k, v] of Object.entries(answers || {})) {
    if (!keys.has(k) || (v !== 'yes' && v !== 'no')) continue;
    given[k] = v;
    if (v === 'yes') yes.add(k); else yes.delete(k);
  }
  return { confirmed_practices: [...yes], practices_answers: { ...(cv.practices_answers || {}), ...given }, practices_answered_at: Object.keys(given).length ? now : cv.practices_answered_at || null };
}

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function formPage({ company, practices, cv, token, saved = false }) {
  const had = cv.practices_answers || {};
  const confirmed = new Set(cv.confirmed_practices || []);
  const state = p => had[p.key] || (confirmed.has(p.key) ? 'yes' : '');
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>How you work</title>
<style>:root{--bg:#fff;--fg:#1c1c1c;--muted:#5f5f5f;--line:#ddd;--ok:#1d6b3a}@media (prefers-color-scheme:dark){:root{--bg:#161616;--fg:#eee;--muted:#aaa;--line:#3a3a3a;--ok:#6fcf97}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}main{max-width:640px;margin:0 auto;padding:24px 16px 48px}h1{font-size:1.4rem;margin:0 0 8px}p{color:var(--muted);margin:0 0 16px}
fieldset{border:0;border-top:1px solid var(--line);margin:0;padding:12px 0;display:flex;gap:16px;align-items:center;justify-content:space-between}legend{float:left;padding:0;flex:1}.opts{display:flex;gap:14px;flex:none}label{display:flex;gap:6px;align-items:center;cursor:pointer}button{margin-top:20px;padding:10px 18px;font:inherit;border:1px solid var(--fg);background:var(--fg);color:var(--bg);border-radius:6px;cursor:pointer}.saved{color:var(--ok);font-weight:600}</style></head>
<body><main><h1>How ${esc(company || 'your business')} works</h1>
${saved ? '<p class="saved">Thanks, your answers are saved. You can change them here any time.</p>' : ''}
<p>Your website only says what you tell us is true. For each line, choose Yes if you always do this, or No if you don't or only sometimes do.</p>
<form method="post" action="/practices/${esc(token)}">
${practices.map(p => `<fieldset><legend>${esc(p.label)}</legend><span class="opts"><label><input type="radio" name="${esc(p.key)}" value="yes"${state(p) === 'yes' ? ' checked' : ''}> Yes</label><label><input type="radio" name="${esc(p.key)}" value="no"${state(p) === 'no' ? ' checked' : ''}> No</label></span></fieldset>`).join('\n')}
<button type="submit">Save my answers</button></form></main></body></html>`;
}

// Mounted before the login check: the signed token is what lets a client in
function mountPracticesStep(app, { express, secret, loadClient, saveValues }) {
  const page = async (req, res, saved) => {
    const id = clientIdOf(req.params.token, secret());
    if (!id) return res.status(404).send('This link is not valid. Please ask Local Launchpad for a new one.');
    const { cv, niche } = await loadClient(id);
    if (!niche) return res.status(404).send('This list is not ready yet. Please ask Local Launchpad.');
    return { id, cv, niche, practices: orderedPractices(niche), saved };
  };
  const wrap = fn => async (req, res) => { try { await fn(req, res); } catch (e) { console.error('[practices step]', e.message); res.status(500).send('Something went wrong saving this. Please try again.'); } };
  app.get('/practices/:token', wrap(async (req, res) => {
    const p = await page(req, res, false);
    if (!p || res.headersSent) return;
    res.type('html').send(formPage({ company: p.cv.company_name, practices: p.practices, cv: p.cv, token: req.params.token }));
  }));
  app.post('/practices/:token', express.urlencoded({ extended: false }), wrap(async (req, res) => {
    const p = await page(req, res, true);
    if (!p || res.headersSent) return;
    const next = applyAnswers(p.cv, p.practices, req.body);
    await saveValues(p.id, next);
    res.type('html').send(formPage({ company: p.cv.company_name, practices: p.practices, cv: { ...p.cv, ...next }, token: req.params.token, saved: true }));
  }));
}

module.exports = { orderedPractices, tokenFor, clientIdOf, applyAnswers, formPage, mountPracticesStep, COMMON_FIRST };
