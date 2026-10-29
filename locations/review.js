'use strict';

// ── Location Determiner, Stage 5: the review ─────────────────────────────────
// Brandon reviews the latest run on a screen (public/locations.html): the map, the tiers, and
// the moves he makes by hand. Nothing here touches the page map or GBP (that is Stage 6).
//
//   review state   one client_assets row of type locations_review, latest wins:
//                  { overrides: { place_id: { to, note, at } }, manual: [place rows with to],
//                    client_reply: { declined: [place_id], at, note } }
//   effective list the run's towns with the overrides applied: to = tier1 | tier2 | area_only |
//                  excluded. A town the client said they do not work in (the reply) is area only
//                  whatever its tier, with the reply as presence evidence. Manual places are
//                  judged nowhere: they carry the tier Brandon gave them.
//   approve        writes client_location_tiers (one row per place with an outcome, replacing the
//                  client's earlier approval; the name client_locations was taken by the old GHL
//                  location codes table in db.js, SOU, ROM …) with approved_at. Stage 6 reads Tier 1 and Tier 2
//                  from there. Over the 20 page town cap the approval is refused.
//   client message plain text listing every page town for the client to untick

const R = require('./rules');

const TO = ['tier1', 'tier2', 'area_only', 'excluded'];
const str = v => (v == null ? '' : String(v)).trim();

async function ensureReviewTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_location_tiers (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id    UUID NOT NULL,
      place_id     TEXT NOT NULL,
      name         TEXT NOT NULL,
      type         TEXT NOT NULL,
      outcome      TEXT NOT NULL,
      tier         INTEGER,
      phase        INTEGER,
      source       TEXT NOT NULL,
      lat          DOUBLE PRECISION,
      lng          DOUBLE PRECISION,
      miles        DOUBLE PRECISION,
      population   INTEGER,
      scores       TEXT,
      evidence     TEXT,
      why          TEXT,
      run_at       TIMESTAMPTZ,
      approved_at  TIMESTAMPTZ NOT NULL,
      approved_by  TEXT,
      UNIQUE (client_id, place_id)
    );
    CREATE INDEX IF NOT EXISTS client_location_tiers_client_idx ON client_location_tiers (client_id);
  `);
  // Stage 6: the location category pages that passed, as category keys (the primary always, for a page town)
  await pool.query(`ALTER TABLE client_location_tiers ADD COLUMN IF NOT EXISTS categories TEXT`);
}

function createLocationReview({ pool, places, locations, now = () => new Date(), log = console }) {
  const parse = c => { try { return typeof c === 'string' ? JSON.parse(c) : c || {}; } catch (_) { return {}; } };

  async function state(clientId) {
    const { rows } = await pool.query(`SELECT content FROM client_assets WHERE client_id = $1 AND asset_type = 'locations_review' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    const s = rows[0] ? parse(rows[0].content) : {};
    return { overrides: s.overrides || {}, manual: Array.isArray(s.manual) ? s.manual : [], client_reply: s.client_reply || null, run_at: s.run_at || null, updated_at: s.updated_at || null };
  }
  async function saveState(clientId, s) {
    s.updated_at = now().toISOString();
    await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, 'locations_review', 'locations_review.json', $2)`, [clientId, JSON.stringify(s)]);
    return s;
  }
  async function approval(clientId) {
    const { rows } = await pool.query(`SELECT * FROM client_location_tiers WHERE client_id = $1 ORDER BY tier NULLS LAST, name`, [clientId]);
    if (!rows.length) return null;
    const typed = rows.map(r => ({ ...r, scores: parse(r.scores), evidence: parse(r.evidence), categories: parse(r.categories) || [], population: r.population == null ? null : Number(r.population), miles: r.miles == null ? null : Number(r.miles) }));
    return { approved_at: rows[0].approved_at, approved_by: rows[0].approved_by || '', run_at: rows[0].run_at, rows: typed, counts: { tier1: typed.filter(r => r.tier === 1).length, tier2: typed.filter(r => r.tier === 2).length, area_only: typed.filter(r => r.outcome === 'area_only').length, excluded: typed.filter(r => r.outcome === 'excluded').length } };
  }

  // The run's towns as the review sees them: outcome and tier from the run, then the overrides, then the client's reply
  function compose(run, s) {
    const declined = new Set(((s.client_reply || {}).declined) || []);
    const fromRun = (run.tiers.towns || []).map(t => ({
      place_id: t.place_id, name: t.name, qualifier: t.qualifier || '', type: t.type, population: t.population, miles: t.miles, lat: t.lat, lng: t.lng, inside_reach: !!t.inside_reach, source: t.source || 'scored', client_asked: !!t.client_asked,
      namesakes: t.namesakes || 0, namesake_examples: t.namesake_examples || [], ambiguous: !!t.ambiguous,
      total_volume: t.total_volume, score: t.score, fallback: t.fallback, gate: t.gate, evidence: t.evidence, population_rule: !!t.population_rule,
      run_to: t.tier === 1 ? 'tier1' : t.tier === 2 ? 'tier2' : t.outcome === 'area_only' ? 'area_only' : 'excluded', run_why: t.why || '',
    }));
    const scoredIds = new Set(fromRun.map(t => t.place_id));
    // Area-only rows the run never scored (beyond reach, not typed) and the excluded candidates (shared names etc.)
    for (const c of run.candidates || []) {
      if (scoredIds.has(c.place_id) || c.is_admin_area) continue;
      if (c.status === 'excluded' && !/^name shared elsewhere|^across water|^beyond reach|^council area/.test(c.reason) && !c.client_asked) continue;
      fromRun.push({ place_id: c.place_id, name: c.name, qualifier: c.qualifier || '', type: c.type, population: c.population, miles: c.miles, lat: c.lat, lng: c.lng, inside_reach: !!c.inside_reach, source: c.source || 'scored', client_asked: !!c.client_asked, namesakes: c.namesakes || 0, namesake_examples: c.namesake_examples || [], ambiguous: !!c.ambiguous, total_volume: 0, score: 0, fallback: 0, gate: null, evidence: null, population_rule: false, run_to: c.status === 'area_only' ? 'area_only' : 'excluded', run_why: c.reason || '' });
      scoredIds.add(c.place_id);
    }
    for (const m of s.manual) {
      if (scoredIds.has(m.place_id)) continue;
      fromRun.push({ ...m, source: 'manual', run_to: null, run_why: 'added by hand', gate: null, evidence: null, total_volume: 0, score: 0, fallback: 0, namesakes: m.namesakes || 0, namesake_examples: m.namesake_examples || [], ambiguous: !!m.ambiguous, population_rule: false });
      scoredIds.add(m.place_id);
    }
    for (const t of fromRun) {
      const o = s.overrides[t.place_id] || null;
      const manualTo = t.source === 'manual' ? (s.manual.find(m => m.place_id === t.place_id) || {}).to : null;
      t.to = (o && o.to) || manualTo || t.run_to || 'area_only';
      t.moved = !!(o && o.to && o.to !== t.run_to);
      t.note = o ? o.note || '' : '';
      t.moved_at = o ? o.at || null : null;
      if (declined.has(t.place_id) && t.to !== 'excluded') { t.client_declined = true; t.to = 'area_only'; }
      t.tier = t.to === 'tier1' ? 1 : t.to === 'tier2' ? 2 : null;
      t.phase = t.tier;
      t.outcome = t.tier ? 'page' : t.to;
      t.why = t.client_declined ? `client declined: the client said they do not work in ${t.name} (reply ${((s.client_reply || {}).at || '').slice(0, 10)})` : t.moved ? `moved by hand to ${label(t.to)}${t.note ? `: ${t.note}` : ''} (was ${label(t.run_to)})` : t.run_why;
    }
    const order = { tier1: 0, tier2: 1, area_only: 2, excluded: 3 };
    fromRun.sort((a, b) => (order[a.to] - order[b.to]) || ((b.score || 0) - (a.score || 0)) || ((b.fallback || 0) - (a.fallback || 0)) || ((a.miles || 0) - (b.miles || 0)));
    return fromRun;
  }
  const label = to => ({ tier1: 'Tier 1', tier2: 'Tier 2', area_only: 'area only', excluded: 'excluded' })[to] || String(to);

  function gbpAreas(list) {
    const towns = list.filter(t => t.type === 'town');
    return [...towns.filter(t => t.to === 'tier1'), ...towns.filter(t => t.to === 'tier2'), ...towns.filter(t => t.to === 'area_only').sort((a, b) => ((b.score || 0) - (a.score || 0)) || ((b.fallback || 0) - (a.fallback || 0)))].slice(0, R.GBP_AREA_LIMIT).map(t => ({ place_id: t.place_id, name: t.name, from: t.tier ? `Tier ${t.tier}` : 'area only' }));
  }

  // The client confirmation message: every page town, for the client to untick
  function clientMessage(run, list) {
    const pages = list.filter(t => t.tier);
    const base = run.base ? run.base.name : 'your town';
    const lines = [
      `Hi, here is the list of towns and areas we plan to build pages for on the new ${run.client.name} website, around ${base}.`,
      `Please untick any you do not work in, and tell us about any town you do work in that is missing.`,
      '',
      ...pages.map(t => `[ ] ${t.name}${t.qualifier ? ` (${t.qualifier})` : ''}${t.type === 'district' ? ` (part of ${base})` : ''}`),
      '',
      `Everything ticked gets its own page. Towns you work in but did not tick are still named on the site as areas you cover.`,
    ];
    return { text: lines.join('\n'), towns: pages.map(t => ({ place_id: t.place_id, name: t.name, tier: t.tier })) };
  }

  async function view(clientId) {
    const run = await locations.latestRun(clientId);
    const s = await state(clientId);
    const app = await approval(clientId);
    if (!run || !run.ok) return { ok: false, run: run || null, state: s, approval: app, problems: [{ code: 'no_run', msg: run ? 'The latest run did not finish.' : 'No run saved yet: run the determiner first (the dry run shows the cost).' }] };
    const list = compose(run, s);
    const pageTowns = list.filter(t => t.tier);
    const warnings = [];
    if (pageTowns.length > R.PAGE_TOWN_CAP) warnings.push({ code: 'over_cap', msg: `${pageTowns.length} page towns: the cap is ${R.PAGE_TOWN_CAP}. Move some to area only before approving.` });
    const band = run.tier1_band || [0, Infinity];
    const t1 = list.filter(t => t.to === 'tier1').length;
    if (t1 < band[0] || t1 > band[1]) warnings.push({ code: 'band', msg: `Tier 1 has ${t1} towns; the band for ${run.travel.miles} miles is ${band[0]} to ${band[1]}.` });
    if (s.run_at && run.ran_at && s.run_at !== run.ran_at) warnings.push({ code: 'stale_review', msg: `These moves were made on an earlier run (${s.run_at.slice(0, 16)}). Check them against this run (${run.ran_at.slice(0, 16)}).` });
    if (app && app.run_at && run.ran_at && new Date(app.run_at).toISOString() !== run.ran_at) warnings.push({ code: 'newer_run', msg: `The approval of ${new Date(app.approved_at).toISOString().slice(0, 16)} was on an earlier run. Approve again to use this one.` });
    return {
      ok: true, client: run.client, ran_at: run.ran_at, base: run.base, point: run.point, travel: run.travel, reach_miles: run.reach_miles, outer_limit_miles: run.outer_limit_miles, tier1_band: run.tier1_band, page_town_cap: R.PAGE_TOWN_CAP, flags: run.flags || [], scan: run.scan || null, costs: run.costs || null,
      list, counts: { tier1: t1, tier2: list.filter(t => t.to === 'tier2').length, area_only: list.filter(t => t.to === 'area_only').length, excluded: list.filter(t => t.to === 'excluded').length, moved: list.filter(t => t.moved).length, manual: list.filter(t => t.source === 'manual').length, declined: list.filter(t => t.client_declined).length },
      gbp_areas: gbpAreas(list), location_categories: (run.location_categories || []).filter(c => list.some(t => t.place_id === c.place_id && t.tier)).map(c => ({ ...c, phase: (list.find(t => t.place_id === c.place_id) || {}).phase || c.phase })),
      message: clientMessage(run, list), state: s, approval: app, warnings,
    };
  }

  async function move(clientId, { place_id, to, note = '' }) {
    if (to !== 'reset' && !TO.includes(to)) throw Object.assign(new Error(`to must be one of ${TO.join(', ')} or reset`), { status: 400 });
    const run = await locations.latestRun(clientId);
    if (!run || !run.ok) throw Object.assign(new Error('No run to review.'), { status: 409 });
    const s = await state(clientId);
    const known = compose(run, s).find(t => t.place_id === place_id);
    if (!known) throw Object.assign(new Error('That place is not in this run.'), { status: 404 });
    if (to === 'reset') delete s.overrides[place_id];
    else if (known.source === 'manual') { const m = s.manual.find(x => x.place_id === place_id); if (m) m.to = to; delete s.overrides[place_id]; }
    else s.overrides[place_id] = { to, note: str(note), at: now().toISOString() };
    s.run_at = run.ran_at;
    await saveState(clientId, s);
    return view(clientId);
  }

  // Add a place by name: matched in the places table nearest the base point; a place the run already has is moved instead
  async function addPlace(clientId, { name, place_id = null, to = 'tier2' }) {
    if (!TO.includes(to)) throw Object.assign(new Error(`to must be one of ${TO.join(', ')}`), { status: 400 });
    const run = await locations.latestRun(clientId);
    if (!run || !run.ok) throw Object.assign(new Error('No run to review.'), { status: 409 });
    const point = run.point || run.base;
    let place = null;
    if (place_id) place = await places.byId(place_id);
    else {
      const matches = await places.matchName(str(name), point);
      place = matches.find(m => !m.is_admin_area) || null;
      if (!place && matches.length) throw Object.assign(new Error(`${matches[0].name} is a council area, not a town.`), { status: 400 });
      if (!place) throw Object.assign(new Error(`"${str(name)}" is not in the places table (towns, villages and suburbs of England and Wales).`), { status: 404 });
    }
    if (!place) throw Object.assign(new Error('Place not found.'), { status: 404 });
    if (place.is_admin_area) throw Object.assign(new Error(`${place.name} is a council area, not a town.`), { status: 400 });
    const s = await state(clientId);
    const known = compose(run, s).find(t => t.place_id === place.id);
    if (known) return move(clientId, { place_id: place.id, to, note: 'added by hand' });
    const km = point && place.lat != null ? require('./places').kmBetween(point, place) : null;
    const ns = places.namesakes ? (await places.namesakes([place])).get(place.id) : null;
    s.manual.push({ place_id: place.id, name: place.name, qualifier: place.qualifier || '', type: place.type, population: place.population, lat: place.lat, lng: place.lng, miles: km == null ? null : Math.round(km / R.KM_PER_MILE * 10) / 10, inside_reach: km != null && run.reach_miles != null && km / R.KM_PER_MILE <= run.reach_miles, to, added_at: now().toISOString(), namesakes: ns ? ns.count : 0, namesake_examples: ns ? ns.examples : [] });
    s.run_at = run.ran_at;
    await saveState(clientId, s);
    return view(clientId);
  }

  // Suggestions for the add box: places of that name, nearest the base first
  async function suggest(clientId, q) {
    const run = await locations.latestRun(clientId);
    const point = run && (run.point || run.base);
    const matches = await places.matchName(str(q), point || null);
    return matches.filter(m => !m.is_admin_area).slice(0, 8).map(m => ({ place_id: m.id, name: m.name, qualifier: m.qualifier || '', type: m.type, population: m.population, lad_name: m.lad_name, miles: m.km == null ? null : Math.round(m.km / R.KM_PER_MILE * 10) / 10 }));
  }

  // The client's reply: the page towns they unticked are area only, kept as presence evidence
  async function clientReply(clientId, { declined = [], note = '' }) {
    const run = await locations.latestRun(clientId);
    if (!run || !run.ok) throw Object.assign(new Error('No run to review.'), { status: 409 });
    const s = await state(clientId);
    s.client_reply = { declined: [...new Set((declined || []).map(String))], note: str(note), at: now().toISOString() };
    s.run_at = run.ran_at;
    await saveState(clientId, s);
    return view(clientId);
  }

  async function approve(clientId, { who = '' } = {}) {
    const v = await view(clientId);
    if (!v.ok) throw Object.assign(new Error(v.problems[0].msg), { status: 409 });
    if (v.warnings.some(w => w.code === 'over_cap')) throw Object.assign(new Error(v.warnings.find(w => w.code === 'over_cap').msg), { status: 409 });
    const at = now();
    const rows = v.list.filter(t => t.to !== 'excluded' || t.client_asked);
    // The category keys that passed for each page town (the primary category's page shares the location page's
    // evidence, so it is always there); a place added by hand has no evidence and gets the primary alone
    const primaryKey = ((v.location_categories || []).find(c => c.primary) || {}).category_key || null;
    const catsOf = t => { if (!t.tier) return []; const keys = (v.location_categories || []).filter(c => c.place_id === t.place_id).map(c => c.category_key); if (!keys.length && primaryKey) keys.push(primaryKey); return [...new Set(keys)]; };
    const client = await pool.query(`SELECT 1 FROM clients WHERE id = $1`, [clientId]);
    if (!client.rows.length) throw Object.assign(new Error('Client not found'), { status: 404 });
    await pool.query(`DELETE FROM client_location_tiers WHERE client_id = $1`, [clientId]);
    for (const t of rows) {
      await pool.query(`INSERT INTO client_location_tiers (client_id, place_id, name, type, outcome, tier, phase, source, lat, lng, miles, population, scores, evidence, why, run_at, approved_at, approved_by, categories) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [clientId, t.place_id, t.name, t.type, t.outcome, t.tier, t.phase, t.source, t.lat, t.lng, t.miles, t.population == null ? null : Math.round(t.population), JSON.stringify({ score: t.score, total_volume: t.total_volume, fallback: t.fallback, namesakes: t.namesakes, ambiguous: !!t.ambiguous, inside_reach: t.inside_reach, client_asked: !!t.client_asked, population_rule: t.population_rule, client_declined: !!t.client_declined, moved: t.moved, run_to: t.run_to }), JSON.stringify({ gate: t.gate, evidence: t.evidence }), t.why, v.ran_at ? new Date(v.ran_at) : null, at, str(who), JSON.stringify(catsOf(t))]);
    }
    const s = await state(clientId);
    s.approved_at = at.toISOString();
    await saveState(clientId, s);
    log.log(`[locations] ${clientId}: approved ${rows.length} places (${v.counts.tier1} Tier 1, ${v.counts.tier2} Tier 2) by ${str(who) || 'unknown'}`);
    return view(clientId);
  }

  return { ensureReviewTables, state, view, move, addPlace, suggest, clientReply, approve, approval, compose, clientMessage, gbpAreas };
}

module.exports = { ensureReviewTables, createLocationReview, TO };
