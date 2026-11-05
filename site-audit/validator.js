'use strict';

// ── The pre launch redirect validator ─────────────────────────────────────────────
// BLOCK or WARN, like the copy validator, each naming the URL and the fix. Four parts:
//   mapCheck      the approved URL map on its own, no site: chains, loops, off domain, missing rows
//   siteCheck     staging: every Keep URL and destination must answer 200 with no redirect
//   domainForms   every version of the domain (http, https, www, non www) must reach the final URL
//                 in one hop (Brandon, 5 Nov). Before launch the live domain is the old site, so a
//                 failure there is a WARN; with afterLaunch it is a BLOCK. Read only either way.
//   stagingTest   Rank Math only matches active rows, so an inactive redirect can't be tested through
//                 the site. This turns them on at the staging site, requests each old URL, compares
//                 the answer, and always turns them off again, even if the check fails part way.
//                 Refused unless the connection is staging and its host isn't the live domain.

const { fetchChain, fetchOnce } = require('./crawl');
const { neverDestination, isHomeVariant } = require('./decide');
const { stripWww } = require('./urls');

const issue = (level, text, url = '') => ({ level, text, url });
const split = list => ({ block: list.filter(i => i.level === 'BLOCK'), warn: list.filter(i => i.level === 'WARN') });
const hostOf = s => { try { return new URL(/^https?:\/\//i.test(String(s)) ? String(s) : `https://${s}`).hostname; } catch (_) { return ''; } };
const stripSlash = p => (p && p.length > 1 ? p.replace(/\/+$/, '') : p);

function mapCheck(v) {
  const out = [];
  const rows = v.urls.filter(u => !(u.plan && u.plan.no_action));
  const redirects = new Map(rows.filter(u => u.plan.redirect_type === '301' && u.plan.new_url).map(u => [stripSlash(u.path), stripSlash(u.plan.new_url)]));
  const settings = v.settings || {};
  const summary = (v.scan && v.scan.summary) || {};
  const oldHomepage = summary.old_homepage || null;
  // An audit that isn't complete can't vouch for the map: a person reads this before launch
  for (const w of (v.scan && v.scan.warnings) || []) if (w.loud) out.push(issue('WARN', `The scan may be incomplete, so this map may be too: ${w.text}`));
  for (const u of rows) {
    const p = u.plan;
    if (u.matters && !p.decision) out.push(issue('BLOCK', `${u.path} matters and has no row in the map. Give it a decision.`, u.url));
    if (u.matters && p.redirect_type === 'none' && p.decision !== 'Keep') out.push(issue('BLOCK', `${u.path} matters and goes nowhere. Keep it, or redirect it.`, u.url));
    if (u.matters && p.redirect_type === '410') out.push(issue('BLOCK', `${u.path} matters and has a 410. A page that matters is never given a 410.`, u.url));
    if (u.top20 && !(p.decision === 'Keep' || p.redirect_type === '301')) out.push(issue('BLOCK', `${u.path} is on the top list and has no home on the new site. Keep it, or redirect it to a page.`, u.url));
    if (p.redirect_type === '301') {
      const to = String(p.new_url || '');
      if (!to) out.push(issue('BLOCK', `${u.path} is a 301 with no destination. Choose a new URL.`, u.url));
      else if (/^https?:\/\//i.test(to) || !to.startsWith('/')) out.push(issue('BLOCK', `${u.path} goes to ${to}, which is off the domain. Choose a page on this site.`, u.url));
      else if (neverDestination(to, settings)) out.push(issue('BLOCK', `${u.path} goes to ${to}. A thank-you page is never a destination.`, u.url));
      else if (stripSlash(to) === stripSlash(u.path)) out.push(issue('BLOCK', `${u.path} redirects to itself. Choose Keep, or another page.`, u.url));
      else if (to === '/' && !isHomeVariant(u.path) && u.path !== oldHomepage) out.push(issue('WARN', `${u.path} goes to the homepage. A closer page is better, if there is one.`, u.url));
      // Chains and loops inside the map: a destination that is itself redirected
      const seen = new Set([stripSlash(u.path)]);
      let at = stripSlash(to), hops = 0;
      while (redirects.has(at) && !seen.has(at) && hops < 20) { seen.add(at); at = redirects.get(at); hops++; }
      if (seen.has(at) && at) out.push(issue('BLOCK', `${u.path} is part of a redirect loop through ${to}. Point them at a page that stays.`, u.url));
      else if (hops > 0) out.push(issue('BLOCK', `${u.path} goes to ${to}, which redirects again. Point it straight at ${at}.`, u.url));
    }
    if (p.decision === 'Retire' && p.redirect_type === '410') out.push(issue('WARN', `${u.path} is Retire with a 410. Check nothing relevant exists for it to go to.`, u.url));
    if (u.kind !== 'page' && u.all_rd > 0 && p.redirect_type === 'none') out.push(issue('WARN', `${u.path} is a file with links to it and no redirect. Check whether it should go somewhere.`, u.url));
  }
  // Every URL that matters must be in the map at all, including anything left out as no action
  for (const u of v.urls) if (u.plan && u.plan.no_action && u.matters) out.push(issue('BLOCK', `${u.path} matters and has no row in the map. Give it a decision.`, u.url));
  return { ...split(out), all: out };
}

// Fetch one URL on staging and describe its answer
async function answerOf(url, { fetchImpl, wait, ofSite }) {
  return fetchChain(url, { fetchImpl, wait, ofSite, maxHops: 5 });
}

// The URL map's Keep rows and destinations, on staging
async function siteCheck(v, site, { fetchImpl = (...a) => fetch(...a), wait = async () => {} } = {}) {
  const out = [];
  const origin = new URL(site.url).origin;
  const ofSite = h => stripWww(h) === stripWww(new URL(origin).hostname);
  const rows = v.urls.filter(u => !(u.plan && u.plan.no_action));
  const keep = [...new Set(rows.filter(u => u.plan.decision === 'Keep').map(u => u.path))];
  const dests = [...new Set(rows.filter(u => u.plan.redirect_type === '301' && String(u.plan.new_url).startsWith('/')).map(u => u.plan.new_url))].filter(d => !keep.includes(d));
  const results = [];
  for (const [path, what] of [...keep.map(p => [p, 'keep']), ...dests.map(p => [p, 'destination'])]) {
    const r = await answerOf(`${origin}${path}`, { fetchImpl, wait, ofSite });
    const res = { path, what, status: r.status, redirects: r.redirects, final: r.finalUrl };
    results.push(res);
    if (r.error) { out.push(issue('BLOCK', `${path} didn't answer on staging: ${r.error}.`, path)); continue; }
    const norm = u => stripSlash(new URL(u).pathname);
    const moved = r.redirects > 0 && norm(r.finalUrl) !== stripSlash(path);
    if (what === 'keep') {
      if (r.status !== 200 || moved) out.push(issue('BLOCK', `${path} is a Keep URL and is missing on staging: it answered ${moved ? `with a redirect to ${r.finalUrl}` : r.status}. Build the page at this address.`, path));
    } else if (moved) out.push(issue('BLOCK', `${path} is a destination and redirects on to ${r.finalUrl}. Every redirect to it would be a chain.`, path));
    else if (r.status !== 200) out.push(issue('BLOCK', `${path} is a destination and answers ${r.status} on staging, not 200. Build the page, or change the rows pointing at it.`, path));
    if (!moved && r.status === 200 && r.finalUrl && new URL(r.finalUrl).protocol !== new URL(origin).protocol) out.push(issue('WARN', `${path} mixes http and https on staging.`, path));
  }
  return { ...split(out), results };
}

// Every version of a domain: reaches one final URL, in one hop at most
async function domainForms(domain, { fetchImpl = (...a) => fetch(...a), wait = async () => {}, level = 'WARN', label = 'the live domain' } = {}) {
  const host = stripWww(hostOf(domain));
  const out = [];
  const forms = [];
  const ofSite = h => stripWww(h) === host;
  for (const form of [`http://${host}/`, `https://${host}/`, `http://www.${host}/`, `https://www.${host}/`]) {
    const r = await fetchChain(form, { fetchImpl, wait, ofSite, maxHops: 6 });
    forms.push(r.error ? { url: form, error: r.error } : { url: form, hops: r.redirects, final: r.finalUrl, status: r.status });
  }
  const answering = forms.filter(f => !f.error);
  const finals = new Set(answering.map(f => f.final.replace(/\/$/, '')));
  const final = answering.length ? [...finals].sort((a, b) => answering.filter(f => f.final.replace(/\/$/, '') === b).length - answering.filter(f => f.final.replace(/\/$/, '') === a).length)[0] : '';
  for (const f of forms) {
    if (f.error) { out.push(issue(level, `${f.url} doesn't answer on ${label}: ${f.error}. Every version of the domain must reach the site.`, f.url)); continue; }
    if (f.final.replace(/\/$/, '') !== final) out.push(issue(level, `${f.url} ends at ${f.final}, not ${final}. Every version of the domain must reach one final URL.`, f.url));
    else if (f.hops > 1) out.push(issue(level, `${f.url} takes ${f.hops} redirects to reach ${final}. It must be one hop: fix it in the host's redirect rules.`, f.url));
  }
  return { ...split(out), forms, final };
}

// What each old URL actually does while the redirects are on
function compareAnswer(item, origin, res) {
  const norm = u => { const x = new URL(u, origin); return `${stripSlash(x.pathname)}${x.search}`; };
  if (res.error) return issue('BLOCK', `${item.source} didn't answer on staging: ${res.error}.`, item.source);
  if (item.code === 410) return res.status === 410 ? null : issue('BLOCK', `${item.source} should answer 410 and answered ${res.status}.`, item.source);
  if (res.status !== 301) return issue('BLOCK', `${item.source} should answer 301 and answered ${res.status}. The redirect isn't firing.`, item.source);
  if (!res.location) return issue('BLOCK', `${item.source} answered 301 with nowhere to go.`, item.source);
  let there;
  try { there = new URL(res.location, origin); } catch (_) { return issue('BLOCK', `${item.source} redirects to a broken address, ${res.location}.`, item.source); }
  if (there.origin !== origin) return issue('BLOCK', `${item.source} redirects off the site, to ${res.location}.`, item.source);
  if (norm(there.href) !== norm(item.path)) return issue('BLOCK', `${item.source} goes to ${there.pathname}${there.search}, not ${item.path}.`, item.source);
  return null;
}

// The real thing, on staging. guard(): the refusals from redirects.js stagingGuard. api: wpGet and wpPost bound to the site.
async function stagingTest(site, { refusals = [], api, fetchImpl = (...a) => fetch(...a), wait = async () => {} }) {
  if (refusals.length) return { ok: false, refused: refusals, block: refusals.map(t => issue('BLOCK', t)), warn: [], results: [], left_on: 0 };
  const origin = new URL(site.url).origin;
  const before = await api.get('/llp-copybot/v1/redirects');
  const items = before.items || [];
  if (!items.length) return { ok: false, refused: ['There are no Copybot redirects on the site. Push them first.'], block: [issue('BLOCK', 'There are no Copybot redirects on the site. Push them first.')], warn: [], results: [], left_on: 0 };
  const out = [];
  const results = [];
  let finished = false;
  let leftOn = 0;
  try {
    await api.post('/llp-copybot/v1/redirects/status', { status: 'active' });
    for (const item of items) {
      await wait();
      const res = await fetchOnce(`${origin}${item.source}`, { fetchImpl });
      results.push({ source: item.source, expected: item.code === 410 ? '410' : `301 to ${item.path}`, status: res.status, location: res.location || '', error: res.error || '' });
      const bad = compareAnswer(item, origin, res);
      if (bad) out.push(bad);
    }
    finished = true;
  } catch (e) {
    out.push(issue('BLOCK', `The staging test stopped part way: ${e.message}.`));
  } finally {
    // Always off again, whatever happened above. Tried three times, and read back to prove it.
    let lastError = '';
    for (let i = 0; i < 3; i++) {
      try {
        await api.post('/llp-copybot/v1/redirects/status', { status: 'inactive' });
        const after = await api.get('/llp-copybot/v1/redirects');
        leftOn = after.active || 0;
        if (!leftOn) { lastError = ''; break; }
        lastError = `${leftOn} still on`;
      } catch (e) { lastError = e.message; leftOn = leftOn || items.length; }
    }
    if (lastError) out.push(issue('BLOCK', `The redirects could not be switched back off (${lastError}). Turn them off now under Settings, Copybot redirects on the staging site.`));
  }
  return { ok: finished && !out.some(i => i.level === 'BLOCK'), ...split(out), results, left_on: leftOn, turned_off: !leftOn };
}

module.exports = { mapCheck, siteCheck, domainForms, stagingTest, compareAnswer, split, issue };
