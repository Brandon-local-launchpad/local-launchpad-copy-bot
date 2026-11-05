'use strict';

// ── A suggested decision and destination for every old URL ───────────────────────
// Brandon's five decisions, as the brief writes them. Code suggests; Ray approves or changes.
//   Keep    the page matters or matches a Page Map page, and its URL can be kept. No redirect
//   Reuse   the page matters but its URL can't be kept, or it doesn't map one to one. 301
//   Merge   several old pages cover one new page. All 301 to it
//   Retire  doesn't matter and no match. 301 to the closest category or service page; 410 only
//           when nothing relevant exists and there is a Search Console file
//   Remove  junk: injected pages, mass tag pages. 410, never a redirect
// Rules that are easy to break:
//   A page that matters is never 410'd. Without Search Console, nothing but Remove is a 410.
//   The homepage is never a suggested destination, except for the homepage's own variants.
//   A thank-you page is never a destination (Brandon, 5 Nov).
//   An old URL that matters beats the Page Map slug: Keep, and a proposal to change the slug. A URL
//   that doesn't matter doesn't: the Page Map address stands and the old URL 301s to it.
//   A page the first launch doesn't build (phase 2) is not a destination: it would answer 404.

const PATTERNS = require('./url-patterns.json');

const CANT_KEEP = PATTERNS.cant_keep.map(p => ({ re: new RegExp(p.pattern), why: p.why }));
const HOME = PATTERNS.homepage_variants.map(p => new RegExp(p, 'i'));
const MASS = PATTERNS.mass_page_patterns.map(p => new RegExp(p, 'i'));
const GALLERY = PATTERNS.gallery_patterns.map(p => new RegExp(p, 'i'));

// An image with no links, rankings or clicks needs nothing (Brandon, 5 Nov): no decision and no row in
// the map, shown as one collapsed group. An image with any of those stays in the map.
const noActionNeeded = u => u.kind === 'image' && !Number(u.all_rd || 0) && !Number(u.keywords_count || 0) && !Number(u.clicks || 0);
const looksLikeGallery = u => GALLERY.some(re => re.test(u.path.replace(/\?.*$/, '')) || re.test(titleHead(u.title)));

const GENERIC = new Set(['a', 'an', 'and', 'area', 'areas', 'co', 'company', 'for', 'in', 'limited', 'location', 'locations', 'ltd', 'near', 'me', 'my', 'of', 'on', 'our', 'page', 'pages', 'service', 'services', 'the', 'to', 'uk', 'us', 'with', 'html', 'htm', 'php', 'aspx', 'asp']);
function stem(w) {
  let s = w;
  if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  if (s.length > 5 && s.endsWith('ing')) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith('er')) s = s.slice(0, -2);
  else if (s.length > 4 && s.endsWith('ed')) s = s.slice(0, -2);
  else if (s.length > 4 && s.endsWith('e')) s = s.slice(0, -1);
  return s;
}
const tokens = text => [...new Set(String(text || '').toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter(w => w && !GENERIC.has(w) && !/^\d+$/.test(w)).map(stem))];
const titleHead = t => String(t || '').split(/\s[-|–—:·]\s/)[0];
const dice = (a, b) => { if (!a.length || !b.length) return 0; const s = new Set(a); return (2 * b.filter(x => s.has(x)).length) / (a.length + b.length); };

function keepProblem(path) {
  const hit = CANT_KEEP.find(p => p.re.test(path));
  return hit ? hit.why : '';
}
const isHomeVariant = path => HOME.some(re => re.test(path));
const neverDestination = (path, settings) => (settings.never_destination_words || []).some(w => String(path || '').toLowerCase().includes(String(w).toLowerCase()));

// How well one old URL fits one page, 0 to 1: its address, title or H1 against the page's
const scoreAgainst = (mine, page) => Math.max(...mine.map(m => Math.max(dice(m, page.slugTokens), dice(m, page.titleTokens), dice(m, page.h1Tokens))));

function prepare(pages, settings, baseTown) {
  const base = new Set(tokens(baseTown));
  const strip = list => list.filter(t => !base.has(t));
  const towns = new Set();
  for (const p of pages) if (p.info && p.info.town) for (const t of tokens(p.info.town)) if (!base.has(t)) towns.add(t);
  const isLocal = p => ['location', 'location_category', 'town_service'].includes(p.type);
  const candidates = pages
    .filter(p => p.applies !== false && p.type !== 'homepage' && ((p.info && p.info.phase) || 1) !== 2 && !neverDestination(p.slug, settings))
    .map(p => ({ ...p, slugTokens: strip(tokens(p.slug)), titleTokens: strip(tokens(p.title)), h1Tokens: strip(tokens(p.h1)), local: isLocal(p) }));
  // The gallery or projects page, once Given confirms the template has one: left empty until then
  for (const s of [...(settings.site_pages || []), settings.gallery_page].filter(Boolean)) {
    if (s === '/' || neverDestination(s, settings) || candidates.some(c => c.slug === s)) continue;
    const t = tokens(s);
    candidates.push({ type: 'site', page_key: `site:${s}`, slug: s, title: s.replace(/^\//, '').replace(/-/g, ' '), slugTokens: t, titleTokens: t, h1Tokens: t, local: false });
  }
  const primary = candidates.find(c => c.type === 'category' && c.info && c.info.primary) || candidates.find(c => c.type === 'category') || candidates.find(c => c.type === 'service') || null;
  const gallery = settings.gallery_page ? candidates.find(c => c.slug === settings.gallery_page) || null : null;
  return { candidates, primary, towns, strip, gallery };
}

// The page this old URL most looks like. A URL naming a town only matches town pages, and one
// that doesn't only matches the rest. Ties go to the page listed first in the Page Map.
function bestFor(u, world, settings) {
  const pathT = world.strip(tokens(u.path.replace(/\?.*$/, '')));
  const titleT = world.strip(tokens(titleHead(u.title)));
  const h1T = world.strip(tokens(u.h1));
  const mine = [pathT, titleT, h1T].filter(x => x.length);
  if (!mine.length) return { match: null, closest: null };
  const namesTown = mine.some(m => m.some(t => world.towns.has(t)));
  let best = null, bestScore = 0, close = null, closeScore = 0;
  for (const c of world.candidates) {
    const score = scoreAgainst(mine, c);
    if ((c.local === namesTown || c.type === 'site') && score > bestScore) { best = c; bestScore = score; }
    if ((c.type === 'category' || c.type === 'service' || c.type === 'site') && score > closeScore) { close = c; closeScore = score; }
  }
  return {
    match: bestScore >= settings.match_min ? best : null,
    closest: closeScore >= settings.closest_min ? close : null,
  };
}

const shown = p => (p.type === 'site' ? `the ${p.title} page` : `"${p.title}"`);
const redirectFor = (decision, newUrl) => (decision === 'Keep' ? 'none' : decision === 'Remove' ? '410' : newUrl ? '301' : 'none');

// urls: the scan's rows with their analysis. pages: the Page Map's rows that apply. declined: Set of
// URLs whose slug proposal a person turned down. Returns Map url → { decision, reason, new_url,
// redirect_type, page_key, proposal, needs_page, check }.
function suggestAll({ urls, pages, settings, baseTown = '', hasSearchConsole = false, declined = new Set(), keyOf = x => x, oldHomepage = null, rootStatus = null }) {
  const world = prepare(pages, settings, baseTown);
  const exactBy = new Map(world.candidates.map(c => [c.slug, c]));
  const homeRow = pages.find(p => p.type === 'homepage' && p.applies !== false);
  const out = new Map();
  const set = (u, decision, reason, target = null, extra = {}) => {
    const newUrl = decision === 'Keep' ? u.path : decision === 'Remove' ? '' : (typeof target === 'string' ? target : target ? target.slug : '');
    out.set(u.url, { decision, reason, new_url: newUrl, redirect_type: extra.redirect_type || redirectFor(decision, newUrl), page_key: target && typeof target !== 'string' ? target.page_key : null, proposal: extra.proposal || null, needs_page: !!extra.needs_page, check: !!extra.check });
  };
  const massCount = urls.filter(u => MASS.some(re => re.test(u.path))).length;
  const live = u => u.status_code >= 200 && u.status_code < 300;
  const notFetched = u => (['cap', 'blocked', 'robots'].includes(u.fetch_state) ? ' It was not fetched, so check it by hand.' : '');
  const metric = u => [Number(u.clicks || 0), Number(u.est_traffic || 0), Number(u.real_rd || 0)];
  const better = (a, b) => { const x = metric(a), y = metric(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return y[i] - x[i]; return 0; };

  // The URLs with no page of their own to think about first; the rest group by the page they match
  const groups = new Map();
  const later = []; // redirects and images: their destination depends on another URL's answer
  const leftover = [];
  for (const u of urls) {
    if (u.path === '/') { set(u, 'Keep', oldHomepage ? `The new homepage lives here. On the old site this address ${rootStatus && rootStatus >= 300 && rootStatus < 400 ? 'redirects' : `answers ${rootStatus || 'with no page'}`}, and the homepage was ${oldHomepage}.` : 'The homepage keeps its address.', homeRow || null); continue; }
    // The old site's real homepage, wherever it was: its text feeds the new homepage, and it 301s there
    if (oldHomepage && u.path === oldHomepage) { set(u, 'Reuse', "The old site's homepage, at its own address. It redirects to /, the new homepage, and its text is kept for it.", '/'); continue; }
    if (noActionNeeded(u)) { out.set(u.url, { no_action: true }); continue; }
    if (u.kind !== 'page') { later.push(u); continue; }
    if (isHomeVariant(u.path)) { set(u, 'Merge', 'Another address for the homepage, so it redirects there.', '/'); continue; }
    if (u.injected && !u.matters) { set(u, 'Remove', `${String((u.matters_why || ['Looks injected'])[0]).replace(/, so its rankings.*$/, '')}. It gets a 410 and no redirect.`); continue; }
    if (!u.matters && MASS.some(re => re.test(u.path)) && massCount >= settings.mass_page_minimum) { set(u, 'Remove', `One of ${massCount} auto generated tag pages. None of them matter, so it gets a 410 and no redirect.`); continue; }
    if (u.redirect_target && !exactBy.has(u.path)) { later.push(u); continue; }
    if (u.fetch_state === 'skipped' && !u.matters) { set(u, 'Retire', "Not a page, and nothing depends on it, so it needs no redirect.", '', { redirect_type: 'none' }); continue; }
    const exact = exactBy.get(u.path);
    if (exact) { const g = groups.get(exact.slug) || { page: exact, members: [] }; g.members.push({ u, exact: true }); groups.set(exact.slug, g); continue; }
    // Old gallery, portfolio and project pages go to the gallery page first, when the template has one
    if (world.gallery && looksLikeGallery(u)) { const g = groups.get(world.gallery.slug) || { page: world.gallery, members: [] }; g.members.push({ u, exact: false }); groups.set(world.gallery.slug, g); continue; }
    const { match, closest } = bestFor(u, world, settings);
    if (match) { const g = groups.get(match.slug) || { page: match, members: [] }; g.members.push({ u, exact: false, closest }); groups.set(match.slug, g); continue; }
    leftover.push({ u, closest });
  }

  // One new page, one or several old ones
  for (const { page, members } of groups.values()) {
    const exactMember = members.find(m => m.exact);
    const keepers = members.filter(m => !m.exact && m.u.matters && live(m.u) && !keepProblem(m.u.path) && page.type !== 'site' && !declined.has(m.u.url)).sort((a, b) => better(a.u, b.u));
    const winner = exactMember || keepers[0] || null;
    if (winner) {
      if (winner.exact) set(winner.u, 'Keep', page.type === 'site' ? `Every new site has this page at this address.${notFetched(winner.u)}` : `The same address as the Page Map page ${shown(page)}.${notFetched(winner.u)}`, page);
      else set(winner.u, 'Keep', `It matters, so its address beats the Page Map's ${page.slug} for ${shown(page)}. Approve the Page Map change.${notFetched(winner.u)}`, page, { proposal: { page_key: page.page_key, title: page.title, from: page.slug, to: winner.u.path } });
    }
    const dest = winner ? winner.u.path : page.slug;
    const others = members.filter(m => m !== winner);
    if (others.length && (winner || others.length > 1)) {
      for (const m of others) set(m.u, 'Merge', `One of ${members.length} old pages covering ${shown(page)}, so it redirects to ${dest}.${notFetched(m.u)}`, winner && !winner.exact ? dest : page);
      continue;
    }
    for (const m of others) {
      const u = m.u;
      if (u.matters) {
        const why = declined.has(u.url) ? 'the Page Map change was turned down' : keepProblem(u.path) || (live(u) ? `every new site has ${page.slug} at its own address` : 'the page no longer loads');
        set(u, 'Reuse', `It matters but its address can't be kept: ${why}. It redirects to ${shown(page)}.${notFetched(u)}`, page);
      } else {
        set(u, 'Retire', `It doesn't matter, so the Page Map address stands. It redirects to ${shown(page)}, the page it matches.${notFetched(u)}`, page);
      }
    }
  }

  // No page of its own in the new structure
  for (const { u, closest } of leftover) {
    const fallback = closest || world.primary;
    const nothingCloser = !closest;
    if (u.matters) {
      const problem = keepProblem(u.path) || (live(u) ? '' : 'the page no longer loads');
      if (!problem && !declined.has(u.url)) set(u, 'Keep', `It matters, so it keeps its address. The Page Map has no page for it, so one needs building.${notFetched(u)}`, null, { needs_page: true });
      else set(u, 'Reuse', `It matters but its address can't be kept: ${problem || 'the Page Map change was turned down'}. ${nothingCloser ? `Nothing in the Page Map is close, so it goes to ${shown(fallback)}: check this one.` : `It redirects to ${shown(fallback)}, the closest page.`}${notFetched(u)}`, fallback, { check: nothingCloser });
    } else if (closest) {
      set(u, 'Retire', `It doesn't matter and has no match. It redirects to ${shown(closest)}, the closest page.${notFetched(u)}`, closest);
    } else if (hasSearchConsole) {
      set(u, 'Retire', `It doesn't matter and nothing relevant exists on the new site, so it gets a 410. Search Console shows no clicks.${notFetched(u)}`, '', { redirect_type: '410', check: true });
    } else {
      set(u, 'Retire', `It doesn't matter and has no match. Without Search Console it still redirects, to ${world.primary ? shown(world.primary) : 'the homepage'}: nothing closer was found, so check this one.${notFetched(u)}`, world.primary || '/', { check: true });
    }
  }

  // Now the URLs that lean on another URL's answer. An old redirect keeps pointing where it pointed,
  // at wherever that page now lives; an image follows the page it sat on.
  const byUrl = new Map(urls.map(x => [x.url, x]));
  const whereNow = (raw, seen = new Set()) => {
    const url = keyOf(raw);
    if (!url || seen.has(url)) return null;
    seen.add(url);
    const answered = out.get(url);
    if (answered && answered.new_url) return answered.new_url;
    const row = byUrl.get(url);
    return row && row.redirect_target ? whereNow(row.redirect_target, seen) : null;
  };
  const sittingOn = new Map();
  for (const u of urls) for (const k of u.links_out || []) if (!sittingOn.has(k)) sittingOn.set(k, u.url);
  for (const u of later) {
    if (u.kind === 'page') {
      const to = whereNow(u.redirect_target);
      const fellBack = !to || neverDestination(to, settings);
      const dest = fellBack ? (world.primary ? world.primary.slug : '/') : to;
      if (u.matters) set(u, 'Reuse', `It matters and already redirects on the old site. ${fellBack ? `Its target has no home on the new site, so it goes to ${dest}: check this one.` : `It carries on to ${dest}.`}`, dest, { check: fellBack });
      else set(u, 'Retire', `It already redirects on the old site. ${fellBack ? `Its target has no home on the new site, so it goes to ${dest}: check this one.` : `It carries on to ${dest}.`}`, dest, { check: fellBack });
      continue;
    }
    const noun = u.kind === 'pdf' ? 'file' : 'image';
    if (!u.matters) { set(u, 'Retire', `A linked ${noun} nothing depends on, so it needs no redirect.`, '', { redirect_type: 'none' }); continue; }
    const on = sittingOn.get(u.url);
    const to = (on && whereNow(on)) || (world.primary ? world.primary.slug : '');
    set(u, 'Reuse', `A linked ${noun} that matters. It redirects to ${to}${on ? ', where the page it sat on now lives' : ''}.`, to, { check: !on });
  }
  return { suggestions: out, world };
}

// The page a kept URL would need to be, for a person who sets Keep by hand: a proposal, or none
function proposalFor(u, pages, settings, baseTown) {
  const world = prepare(pages, settings, baseTown);
  if (world.candidates.some(c => c.slug === u.path)) return null;
  const { match } = bestFor(u, world, settings);
  return match && match.type !== 'site' ? { page_key: match.page_key, title: match.title, from: match.slug, to: u.path } : null;
}

module.exports = { suggestAll, proposalFor, keepProblem, isHomeVariant, neverDestination, noActionNeeded, looksLikeGallery, tokens, dice };
