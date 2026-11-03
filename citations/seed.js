'use strict';

// ── Citations: the directory database seed ───────────────────────────────────────
// Reads every tab of the UK Citations Master List exported to data/citations/ (one CSV
// per tab, kept by hand; a new directory is a new row there, not code) and turns it
// into directory rows and place rows:
//
//   UK Core             → tier uk_core        applies to every client
//   UK Secondary        → tier uk_secondary   applies to every client
//   Trade Platforms     → tier trade_niche    applies to the niches the Eligible niches column
//                                             allows (data/citations/niche-map.json platform_niches)
//   Trades & Niche      → tier trade_niche    applies to that niche (niche-map.json niche_labels)
//   Council Schemes     → tier location       applies to the councils in Covers (councils)
//   Chambers            → tier location       applies to the counties whose Places row names it
//   Local Networks      → tier location       the pattern networks (every client, live check);
//                                             Nub News becomes one row per town site
//   Places              → citation_places     the lookup from a town or county to its council,
//                                             chamber, Nub News site and city local sites;
//                                             the City local sites column becomes location rows
//   Southampton Example → tier location       rows tied to Southampton, minus any that duplicate
//                                             a row already seeded (Brandon, 3 Nov)
//
// Header rows, blank rows and the rule and list lines in Local Networks are skipped. Rows
// are keyed by domain and name: the first tab wins and a later duplicate merges its niches
// and notes. The explicit skips (SKIP) are instructions or duplicates, not directories.
// Rated People is seeded retired (trade accounts reportedly closed Sep 2026).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Papa = require('papaparse');
const N = require('../fillout/niches');

const DATA_DIR = path.join(__dirname, '..', 'data', 'citations');
const PREFIX = 'UK Citations Master List - ';
const TABS = ['UK Core', 'UK Secondary', 'Trade Platforms', 'Trades & Niche', 'Council Schemes', 'Chambers', 'Local Networks', 'Places', 'Southampton Example'];
const TIERS = ['uk_core', 'uk_secondary', 'location', 'trade_niche'];
const COSTS = ['free', 'paid', 'membership'];
const PRIORITIES = ['P1', 'P2', 'P3'];
const VERIFICATIONS = ['email', 'code', 'phone', 'postcard', 'none', 'unknown'];
const DONE_BY = ['va', 'client', 'client_decision'];

// Rows that are instructions, duplicates of rows seeded elsewhere, or never used
const SKIP = {
  'Local Networks': {
    'Buy With Confidence (Trading Standards)': 'one row per participating council comes from the Council Schemes tab',
    'Council approved trader schemes (other)': 'an instruction, not a directory: the Council Schemes tab holds each scheme',
    'Accredited chambers of commerce': 'an instruction, not a directory: the Chambers tab holds each chamber',
    'Nub News': 'expanded to one row per town site',
    'Tourism sites (Visit <place>)': 'never for trades (the sheet)',
  },
  'Trade Platforms': {
    'Buy With Confidence': 'one row per participating council comes from the Council Schemes tab',
  },
};
const RETIRED = { 'Rated People': 'Trade accounts reportedly closed 16 Sep 2026; brand bought by Checkatrade Group (the sheet, 2 Nov 2026).' };

const str = v => (v == null ? '' : String(v)).replace(/ /g, ' ').trim();
const slugify = s => str(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const normName = s => str(s).toLowerCase().replace(/&/g, ' and ').replace(/\b(the|ltd|limited)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

// The registrable domain of a URL or URL pattern, so a listing on www.yelp.co.uk is on the
// directory whose add page is biz.yelp.co.uk: "https://biz.yelp.co.uk/" → "yelp.co.uk",
// "https://<town>.nub.news/x" → "nub.news", "https://directory.<paper-domain>/" → "" (no fixed host)
const TWO_PART_TLDS = /\.(co|org|gov|ac|me|net|ltd|plc|nhs|sch|police|mod)\.uk$|\.(com|net|org|edu|gov)\.au$|\.(co|com)\.(nz|za|ie)$/;
function registrableDomain(host) {
  const h = String(host || '').toLowerCase().replace(/^ww+\./, '');
  const parts = h.split('.');
  const keep = TWO_PART_TLDS.test(h) ? 3 : 2;
  return parts.length > keep ? parts.slice(-keep).join('.') : h;
}
function domainOf(url) {
  let s = str(url).replace(/^https?:\/\//i, '').split(/[/?#]/)[0].toLowerCase();
  if (!s) return '';
  if (s.includes('<')) { const parts = s.split('.'); while (parts.length && parts[0].includes('<')) parts.shift(); if (parts.some(p => p.includes('<')) || parts.length < 2) return ''; s = parts.join('.'); }
  s = registrableDomain(s);
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s) ? s : '';
}

function costOf(text, fallback = 'paid') {
  const t = str(text).toLowerCase();
  if (!t || /^(unknown|not published|not stated|not found|n\/a|not checked)/.test(t)) return fallback;
  if (/^(free|no cost|none)/.test(t)) return 'free';
  if (/membership|member|annual fee|a year|per year|\/yr|\/year|yearly|join|registration fee|scheme fee|certification fee|application plus/.test(t)) return 'membership';
  return 'paid';
}
function priorityOf(text, fallback = 'P3') { const m = str(text).match(/P([123])/i); return m ? `P${m[1]}` : fallback; }
function verificationOf(text) {
  const t = str(text).toLowerCase();
  if (!t || /unknown/.test(t)) return 'unknown';
  if (/^none/.test(t)) return 'none';
  if (/sms|text|code/.test(t)) return 'code';
  if (/phone|call/.test(t)) return 'phone';
  if (/postcard|post\b/.test(t)) return 'postcard';
  if (/e-?mail/.test(t)) return 'email';
  return 'unknown';
}
function doneByOf(text, fallback = 'va') {
  const t = str(text).toLowerCase();
  if (/client decision/.test(t)) return 'client_decision';
  if (/^client/.test(t)) return 'client';
  if (/team|\bva\b/.test(t)) return 'va';
  return fallback;
}
const liveUnconfirmed = text => !/^confirmed/i.test(str(text));
const sabNo = text => /^no\b/i.test(str(text));
const splitList = text => str(text).split(/;|\n/).map(s => s.trim()).filter(Boolean);
const councilName = s => str(s).replace(/^the\s+/i, '').replace(/\s+(city\s+)?council$/i, '').trim();
const note = (...parts) => parts.map(str).filter(Boolean).join(' ');

function readTab(dir, tab) {
  const file = path.join(dir, `${PREFIX}${tab}.csv`);
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const parsed = Papa.parse(text, { skipEmptyLines: false });
  const [header, ...rows] = parsed.data;
  const keys = header.map(str);
  const out = [];
  for (const r of rows) {
    const filled = r.filter(c => str(c)).length;
    if (!filled) continue;
    const o = {};
    keys.forEach((k, i) => { o[k] = str(r[i]); });
    o._filled = filled;
    out.push(o);
  }
  return { file, keys, rows: out };
}

function loadNicheMap(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'niche-map.json'), 'utf8'));
}

function platformApplies(site, map) {
  const rule = (map.platform_niches || {})[site];
  const pets = map.pet_niches || [];
  if (rule === 'all') return { kind: 'all' };
  if (Array.isArray(rule)) return { kind: 'niches', niches: rule };
  // 'trades' or unlisted: every niche except the pet niches (the sheet's "pet services not confirmed")
  return { kind: 'not_niches', niches: pets };
}

// ── The parse: every tab to directory rows, place rows, and what was skipped ──
function parseSeed({ dir = DATA_DIR, now = new Date() } = {}) {
  const map = loadNicheMap(dir);
  const rows = [];         // directory rows in order
  const byKey = new Map(); // dedupe: domain + normalised name → row
  const byUrl = new Map(); // exact URL → row
  const skipped = [];
  const problems = [];
  const tabsRead = [];

  const add = (row, tab) => {
    row.source_tab = tab;
    row.domain = row.domain === undefined ? domainOf(row.url) : row.domain;
    row.key = row.key || slugify(row.name);
    const dk = `${row.domain || 'nodomain'}|${normName(row.name)}`;
    const uk = str(row.url).toLowerCase().replace(/\/+$/, '');
    // The same page listed under several niches (BWCA for window and exterior cleaners) is one row;
    // the council schemes share buywithconfidence.gov.uk and stay one row per council
    const existing = byKey.get(dk) || (uk && row.tier === 'trade_niche' && byUrl.has(uk) && byUrl.get(uk).tier === 'trade_niche' ? byUrl.get(uk) : null);
    if (existing) {
      // A later duplicate merges into the first: niches union, the better priority, notes appended
      const a = existing.applies_to, b = row.applies_to;
      if (a.kind === 'niches' && b.kind === 'niches') a.niches = [...new Set([...a.niches, ...b.niches])];
      else if (a.kind === 'niches' && b.kind === 'all') existing.applies_to = { kind: 'all' };
      if (PRIORITIES.indexOf(row.priority) < PRIORITIES.indexOf(existing.priority)) existing.priority = row.priority;
      if (row.notes && !existing.notes.includes(row.notes)) existing.notes = note(existing.notes, `[${tab}] ${row.notes}`);
      existing.merged_from = [...(existing.merged_from || []), tab];
      skipped.push({ tab, name: row.name, reason: `merged into "${existing.name}" (${existing.source_tab})` });
      return existing;
    }
    // A key clash between different directories gets the tab in the key
    if (rows.some(r => r.key === row.key)) row.key = `${row.key}-${slugify(tab)}`;
    for (const [col, allowed] of [['tier', TIERS], ['cost', COSTS], ['priority', PRIORITIES], ['verification_method', VERIFICATIONS], ['done_by', DONE_BY]]) {
      if (!allowed.includes(row[col])) problems.push({ tab, name: row.name, problem: `${col} "${row[col]}" is not one of ${allowed.join(', ')}` });
    }
    row.skip_for_service_area = !!row.skip_for_service_area;
    row.needs_live_check = !!row.needs_live_check;
    row.retired_reason = row.retired_reason || RETIRED[row.name] || null;
    row.retired = !!row.retired_reason;
    row.notes = str(row.notes);
    rows.push(row);
    byKey.set(dk, row);
    if (uk) byUrl.set(uk, row);
    return row;
  };
  const skip = (tab, name, reason) => skipped.push({ tab, name, reason });

  // UK Core, UK Secondary
  for (const [tab, tier] of [['UK Core', 'uk_core'], ['UK Secondary', 'uk_secondary']]) {
    const t = readTab(dir, tab); if (!t) { problems.push({ tab, problem: 'file missing' }); continue; } tabsRead.push(tab);
    for (const r of t.rows) {
      if (!r.Site || !r.URL) { skip(tab, r.Site || '(blank)', 'no site or URL'); continue; }
      add({
        name: r.Site, url: r.URL, tier, type: r.Type, cost: costOf(r.Cost), cost_text: r.Cost, priority: priorityOf(r.Priority, 'P2'),
        verification_method: verificationOf(r.Verification), verification_text: r.Verification, done_by: doneByOf(r['Who does it']),
        applies_to: { kind: 'all' }, skip_for_service_area: sabNo(r['Works for SAB?']) || /shopfronts only/i.test(r.Priority),
        needs_live_check: liveUnconfirmed(r['Live check']), notes: note(r.Notes, r['Works for SAB?'] ? `SAB: ${r['Works for SAB?']}.` : ''), source_url: r.Source,
      }, tab);
    }
  }

  // Trade Platforms
  {
    const tab = 'Trade Platforms', t = readTab(dir, tab);
    if (!t) problems.push({ tab, problem: 'file missing' }); else {
      tabsRead.push(tab);
      for (const r of t.rows) {
        if (SKIP[tab][r.Site]) { skip(tab, r.Site, SKIP[tab][r.Site]); continue; }
        if (!r.Site || !r.URL) { skip(tab, r.Site || '(blank)', 'no site or URL'); continue; }
        add({
          name: r.Site, url: r.URL, tier: 'trade_niche', type: 'Trade platform', cost: costOf(r.Cost), cost_text: r.Cost, priority: priorityOf(r.Priority),
          verification_method: 'unknown', done_by: doneByOf(r['Who does it']), applies_to: platformApplies(r.Site, map),
          skip_for_service_area: false, needs_live_check: liveUnconfirmed(r['Live check']),
          notes: note(r.Notes, r['Eligible niches'] ? `Eligible: ${r['Eligible niches']}` : '', r['Free citation?'] ? `Free citation: ${r['Free citation?']}` : '', r.Vetting ? `Vetting: ${r.Vetting}` : ''), source_url: r.Source,
        }, tab);
      }
    }
  }

  // Trades & Niche
  {
    const tab = 'Trades & Niche', t = readTab(dir, tab);
    if (!t) problems.push({ tab, problem: 'file missing' }); else {
      tabsRead.push(tab);
      for (const r of t.rows) {
        const key = (map.niche_labels || {})[r.Niche];
        if (!key) { skip(tab, r.Site, `niche "${r.Niche}" is not in niche-map.json`); continue; }
        if (!r.Site || !r.URL) { skip(tab, r.Site || '(blank)', 'no site or URL'); continue; }
        const kind = str(r.Kind).toLowerCase();
        const memberOnly = /^yes/i.test(r['Member only']);
        const cost = /free niche directory/.test(kind) ? costOf(r.Cost, 'free') : /paid niche platform/.test(kind) ? 'paid' : memberOnly ? 'membership' : costOf(r.Cost);
        add({
          name: r.Site, url: r.URL, tier: 'trade_niche', type: r.Kind, cost, cost_text: r.Cost, priority: priorityOf(r.Priority),
          verification_method: 'unknown', done_by: doneByOf(r['Who does it'], memberOnly ? 'client' : 'va'), applies_to: { kind: 'niches', niches: [key] },
          skip_for_service_area: false, needs_live_check: liveUnconfirmed(r['Live check']),
          notes: note(r.Notes, r['How listing works'] ? `Listing: ${r['How listing works']}.` : ''), source_url: r.Source,
        }, tab);
      }
    }
  }

  // Council Schemes
  {
    const tab = 'Council Schemes', t = readTab(dir, tab);
    if (!t) problems.push({ tab, problem: 'file missing' }); else {
      tabsRead.push(tab);
      for (const r of t.rows) {
        if (!r.Scheme || !r.URL) { skip(tab, r.Scheme || '(blank)', 'no scheme or URL'); continue; }
        add({
          name: r.Scheme, url: r.URL, tier: 'location', type: 'Council trader scheme', cost: costOf(r.Cost, 'membership'), cost_text: r.Cost, priority: priorityOf(r.Priority, 'P2'),
          verification_method: 'unknown', done_by: doneByOf(r['Who does it'], 'client_decision'), applies_to: { kind: 'councils', councils: splitList(r['Covers (councils)']).map(councilName) },
          skip_for_service_area: false, needs_live_check: liveUnconfirmed(r['Live check']),
          notes: note(r.Notes, r['Run by'] ? `Run by ${r['Run by']}.` : '', r['What the listing is'] ? `Listing: ${r['What the listing is']}.` : ''), source_url: r.Source,
        }, tab);
      }
    }
  }

  // Places (the lookup) first, because the chambers and the city sites read it
  const places = [];
  const chamberCounties = new Map(); // chamber name → Set(county)
  const chamberTowns = new Map();
  const nubUrls = new Map();         // url → Set(place names)
  {
    const tab = 'Places', t = readTab(dir, tab);
    if (!t) problems.push({ tab, problem: 'file missing' }); else {
      tabsRead.push(tab);
      for (const r of t.rows) {
        if (!r.Name) continue;
        const p = {
          type: str(r.Type).toLowerCase(), name: r.Name, country: r.Country, county: r.County, councils: splitList(r['Main council']),
          population: parseInt(str(r.Population).replace(/,/g, ''), 10) || null, trading_standards: r['Trading Standards run by'],
          schemes: splitList(r['Council trader schemes']), chambers: splitList(r['Chamber of commerce']), nub_news: splitList(r['Nub News site']),
          city_sites: r['City local sites'], also_touches: splitList(r['Also touches councils']),
        };
        places.push(p);
        for (const c of p.chambers) {
          if (!chamberCounties.has(c)) { chamberCounties.set(c, new Set()); chamberTowns.set(c, new Set()); }
          if (p.county) chamberCounties.get(c).add(p.county);
          if (p.type !== 'county') chamberTowns.get(c).add(p.name);
        }
        for (const u of p.nub_news) { const k = u.toLowerCase().replace(/\/+$/, ''); if (!nubUrls.has(k)) nubUrls.set(k, new Set()); if (p.type !== 'county') nubUrls.get(k).add(p.name); }
      }
    }
  }

  // Chambers: tied to the counties (and towns) whose Places row names the chamber
  {
    const tab = 'Chambers', t = readTab(dir, tab);
    if (!t) problems.push({ tab, problem: 'file missing' }); else {
      tabsRead.push(tab);
      for (const r of t.rows) {
        if (!r.Chamber || !r.Website) { skip(tab, r.Chamber || '(blank)', 'no chamber or website'); continue; }
        const counties = [...(chamberCounties.get(r.Chamber) || [])];
        const towns = [...(chamberTowns.get(r.Chamber) || [])];
        const dirUrl = /^https?:/i.test(r['Member directory']) ? r['Member directory'] : '';
        add({
          name: r.Chamber, url: dirUrl || r.Website, tier: 'location', type: 'Chamber of commerce', cost: 'membership', cost_text: r['Entry fee'], priority: 'P2',
          verification_method: 'unknown', done_by: doneByOf(r['Who does it'], 'client_decision'),
          applies_to: { kind: 'areas', counties, towns, text: r['Covers (approximate)'] },
          skip_for_service_area: false, needs_live_check: liveUnconfirmed(r['Live check']),
          notes: note(r.Notes, `Covers ${r['Covers (approximate)']}.`, dirUrl ? `Website ${r.Website}.` : r['Member directory'] ? `Member directory: ${r['Member directory']}.` : ''), source_url: r.Source || r.Website,
        }, tab);
        if (!counties.length && !towns.length) problems.push({ tab, name: r.Chamber, problem: 'no Places row names this chamber, so it matches no client until the Places tab does' });
      }
    }
  }

  // Local Networks: the pattern networks, and Nub News as one row per town site
  {
    const tab = 'Local Networks', t = readTab(dir, tab);
    if (!t) problems.push({ tab, problem: 'file missing' }); else {
      tabsRead.push(tab);
      // The town list below the table: town, county, URL, live check (one row per site)
      const nubList = [];
      let inNubList = false;
      for (const r of t.rows) {
        const name = r.Network;
        if (/^nub news towns/i.test(name)) { inNubList = true; continue; }
        if (inNubList) {
          if (name && /^https?:/i.test(r['Areas covered'])) nubList.push({ town: name.replace(/\s+and\s+.*$/, ''), full: name, county: r['URL pattern'], url: r['Areas covered'], live: r.Cost });
          else skip(tab, name || '(blank)', 'a list line, not a directory');
          continue;
        }
        if (r._filled <= 2) { skip(tab, name || '(blank)', 'a rule line, not a directory'); continue; }
        if (SKIP[tab][name]) { skip(tab, name, SKIP[tab][name]); continue; }
        if (/never/i.test(r.Priority)) { skip(tab, name, 'never for trades'); continue; }
        add({
          name, url: r['URL pattern'], tier: 'location', type: 'Local network (pattern)', cost: costOf(r.Cost), cost_text: r.Cost, priority: priorityOf(r.Priority),
          verification_method: 'unknown', done_by: doneByOf(r['Who does it']), applies_to: { kind: 'all' }, skip_for_service_area: sabNo(r['Works for SAB?']),
          needs_live_check: true,
          notes: note(r.Notes, r['Areas covered'] ? `Areas: ${r['Areas covered']}.` : '', r['When to use it'] ? `When: ${r['When to use it']}` : ''), source_url: r.Source,
        }, tab);
      }
      // One row per Nub News site; the Places tab adds the other spellings of the town (Stoke-on-Trent for Stoke)
      for (const n of nubList) {
        const k = n.url.toLowerCase().replace(/\/+$/, '');
        const towns = [...new Set([n.town, n.full, ...(nubUrls.get(k) || [])])];
        nubUrls.delete(k);
        add({
          name: `Nub News ${n.town}`, url: `${k}/directories`, tier: 'location', type: 'Local news directory', cost: 'free', cost_text: 'Free Standard listing; Premium £35+VAT', priority: 'P2',
          verification_method: 'unknown', done_by: 'va', applies_to: { kind: 'towns', towns }, skip_for_service_area: false, needs_live_check: liveUnconfirmed(n.live),
          notes: `Free Standard listing on the ${n.town} Nub News site (the Add your business form). ${n.county}.`, source_url: 'https://nub.news/sites',
        }, tab);
      }
      for (const [url, names] of nubUrls) problems.push({ tab, name: url, problem: `a Places row (${[...names].join(', ')}) carries this Nub News URL but the town list does not, so no row was made` });
    }
  }

  // City local sites from the Places tab: name and cost in brackets, no URL (live check)
  for (const p of places) {
    const text = str(p.city_sites);
    if (!text || /^(nothing|not checked|see )/i.test(text)) continue;
    for (const part of text.split(';').map(s => s.trim()).filter(Boolean)) {
      const m = part.match(/^(.*?)\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$/);
      const name = m ? m[1].trim() : part, costText = m ? m[2].trim() : '';
      const cost = costOf(costText);
      add({
        name, url: '', domain: '', tier: 'location', type: 'City local site', cost, cost_text: costText, priority: 'P3', verification_method: 'unknown',
        done_by: cost === 'free' ? 'va' : 'client_decision', applies_to: { kind: 'towns', towns: [p.name] }, skip_for_service_area: false, needs_live_check: true,
        notes: `${p.name} city local site from the Places tab; URL to add by hand.${costText ? ` Cost: ${costText}.` : ''}`, source_url: '',
      }, 'Places');
    }
  }

  // Southampton Example: rows tied to Southampton, minus duplicates of rows already seeded
  {
    const tab = 'Southampton Example', t = readTab(dir, tab);
    if (!t) problems.push({ tab, problem: 'file missing' }); else {
      tabsRead.push(tab);
      const domains = new Set(rows.map(r => r.domain).filter(Boolean));
      for (const r of t.rows) {
        if (!r.Site || !r.URL) { skip(tab, r.Site || '(blank)', 'no site or URL'); continue; }
        const d = domainOf(r.URL);
        if (d && domains.has(d)) { const dup = rows.find(x => x.domain === d); skip(tab, r.Site, `duplicates "${dup.name}" (${dup.source_tab})`); continue; }
        add({
          name: r.Site, url: r.URL, tier: 'location', type: r.Type, cost: costOf(r.Cost), cost_text: r.Cost, priority: priorityOf(r.Priority),
          verification_method: 'unknown', done_by: doneByOf(r['Who does it']), applies_to: { kind: 'towns', towns: ['Southampton'] }, skip_for_service_area: sabNo(r['Works for SAB?']),
          needs_live_check: liveUnconfirmed(r['Live check']), notes: note(r.Notes, r['How listing works'] ? `Listing: ${r['How listing works']}.` : ''), source_url: r.Source,
        }, tab);
      }
    }
  }

  const counts = { rows: rows.length, places: places.length, skipped: skipped.length, problems: problems.length, by_tier: {} };
  for (const t of TIERS) counts.by_tier[t] = rows.filter(r => r.tier === t).length;
  counts.retired = rows.filter(r => r.retired).length;
  return { rows, places, skipped, problems, counts, tabs: tabsRead, at: now.toISOString() };
}

// A fingerprint of every seed file, so the store reseeds only when something changed
function seedVersion(dir = DATA_DIR) {
  const h = crypto.createHash('sha256');
  for (const f of fs.readdirSync(dir).filter(f => /\.(csv|json)$/i.test(f)).sort()) { h.update(f); h.update(fs.readFileSync(path.join(dir, f))); }
  return h.digest('hex').slice(0, 16);
}

module.exports = { parseSeed, seedVersion, readTab, domainOf, registrableDomain, costOf, priorityOf, verificationOf, doneByOf, normName, slugify, platformApplies, DATA_DIR, TABS, TIERS, COSTS, PRIORITIES, VERIFICATIONS, DONE_BY, SKIP, RETIRED };
