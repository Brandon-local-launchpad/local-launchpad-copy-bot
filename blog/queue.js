'use strict';

// ── The blog queue: the schedule (B10 with Amendment 1) and the page map rows ──
// Takes the reserved topics (blog/topics.js) and the client's launch date and gives the
// onboarding batch its dates and its page map rows (page-map/store.js upsertBlogRows).
//
// The schedule: the first three posts (the homepage cost guide and the first two service
// cost guides) publish at launch; then 2 in month one, 4 in month two, 3 in three, 2 in
// four, 1 in five and 1 in six, spaced evenly inside each month. A seasonal topic moves to
// the month before its window (its slot's publish month) and may push a question post back;
// its GBP post publishes the same month. Under 16 topics the cadence stops at the last
// topic. With no launch date nothing is dated: the launch posts go up as drafts and the
// rest wait for the date.

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const SLOTS = [2, 4, 3, 2, 1, 1]; // months one to six after launch
const LAUNCH = 3;

const iso = d => d.toISOString().slice(0, 10);
const utc = (y, m, d) => new Date(Date.UTC(y, m, d));
const parseDate = s => { if (!s) return null; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? utc(+m[1], +m[2] - 1, +m[3]) : null; };
const monthIndex = name => { const n = String(name || '').trim().toLowerCase().slice(0, 3); const i = SHORT.indexOf(n); return i; };
const addMonths = (d, n) => utc(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate());
const daysIn = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

// The n dates of month m (1 to 6) after the launch, spaced evenly inside the month
function monthDates(launch, m, n) {
  const start = addMonths(launch, m);
  const y = start.getUTCFullYear(), mo = start.getUTCMonth();
  const days = daysIn(y, mo);
  const out = [];
  for (let i = 1; i <= n; i++) out.push(utc(y, mo, Math.max(1, Math.min(days, Math.round((days * i) / (n + 1))))));
  return out;
}

// A seasonal topic's month after the launch (1 to 6), from its slot's publish month name; null when outside the batch
function seasonalMonth(launch, topic) {
  const mi = topic.seasonal ? monthIndex(topic.seasonal.publish) : -1;
  if (mi < 0) return null;
  for (let m = 1; m <= 6; m++) { const d = addMonths(launch, m); if (d.getUTCMonth() === mi) return m; }
  return null;
}

// topics: the reserved batch in order; launchDate: 'YYYY-MM-DD' or null.
// Returns the topics with publish_date, month (0 launch, 1 to 6) and slot notes, plus the schedule flags.
// slots: the posts per month after the start (the onboarding SLOTS, or one a month for a Search
// Console batch); launchCount: the posts on the start date itself (3 at launch, 0 for a batch).
function schedule(topics, launchDate, { slots = SLOTS, launchCount = LAUNCH } = {}) {
  const launch = parseDate(launchDate);
  const flags = [];
  const out = topics.map(t => ({ ...t, publish_date: null, month: null, held_for_date: false }));
  if (!out.length) return { topics: out, flags };
  // The launch posts: the first three (the homepage cost guide and the first two service cost guides)
  const launchPosts = out.slice(0, launchCount);
  const rest = out.slice(launchCount);
  for (const t of launchPosts) { t.month = 0; t.publish_date = launch ? iso(launch) : null; if (!launch) t.held_for_date = true; }
  if (!launch) {
    for (const t of rest) t.held_for_date = true;
    flags.push({ code: 'F-DATE', msg: 'No launch date on the client: the launch posts go up as drafts and the rest are not scheduled until it is set.' });
    return { topics: out, flags };
  }
  // The months' slots: seasonal topics take their month first (the month before their window), then the rest in order
  const perMonth = slots.map((n, i) => ({ month: i + 1, n, posts: [] }));
  const queue = [];
  for (const t of rest) {
    const sm = t.seasonal ? seasonalMonth(launch, t) : null;
    if (sm) { perMonth[sm - 1].posts.push(t); t.month = sm; t.slot_note = `seasonal: the month before its window (${t.seasonal.window}), publish ${t.seasonal.publish}`; }
    else if (t.seasonal) { queue.push(t); t.slot_note = `seasonal topic whose publish month (${t.seasonal.publish || 'not set'}) is outside the six months: takes the next slot`; }
    else queue.push(t);
  }
  // A month over its count pushes question posts back to the next month with room
  for (const m of perMonth) {
    while (m.posts.length > m.n) {
      // The last question post goes first; a month of seasonal topics alone pushes its last one
      let idx = -1;
      for (let k = m.posts.length - 1; k >= 0; k--) if (!m.posts[k].seasonal) { idx = k; break; }
      if (idx < 0) idx = m.posts.length - 1;
      const [pushed] = m.posts.splice(idx, 1);
      const next = perMonth.find(x => x.month > m.month && x.posts.length < x.n);
      if (next) { next.posts.push(pushed); pushed.month = next.month; pushed.slot_note = `pushed back to month ${next.month} by a seasonal topic`; }
      else { queue.unshift(pushed); }
    }
  }
  for (const m of perMonth) while (m.posts.length < m.n && queue.length) { const t = queue.shift(); m.posts.push(t); t.month = m.month; }
  for (const m of perMonth) {
    const dates = monthDates(launch, m.month, m.posts.length);
    m.posts.forEach((t, i) => { t.publish_date = iso(dates[i]); });
  }
  if (queue.length) { for (const t of queue) { t.held_for_date = true; t.slot_note = 'beyond the six months: no date'; } flags.push({ code: 'F-QUEUE', msg: `${queue.length} topic(s) have no slot in the six months.` }); }
  if (rest.length < slots.reduce((a, b) => a + b, 0)) flags.push({ code: 'F-QUEUE', msg: `${out.length} topics: the cadence stops at the last topic.` });
  return { topics: out, flags };
}
// A Search Console batch (B16): six posts, one a month across the six months from the batch's start
const SC_SLOTS = [1, 1, 1, 1, 1, 1];
const scheduleBatch = (topics, batchStart) => schedule(topics, batchStart, { slots: SC_SLOTS, launchCount: 0 });

// The page map rows for upsertBlogRows, from the scheduled topics
function rowsFor(scheduled, { existing = [], held = [] } = {}) {
  const byKey = new Map(existing.map(r => [r.slug, r]));
  // A held customer question (blog/topics.js held_back) is a row too, status Held, no date, not written
  return [...scheduled, ...held.map(t => ({ ...t, publish_date: null, month: null, held: true, slot_note: 'held: fewer than 3 related questions; the Search Console batch picks it up' }))].map(t => {
    const cur = byKey.get(t.key);
    const curInfo = (cur && cur.info) || {};
    // A wording a person approved or edited on the queue stays; a new topic takes the reservation's
    const wording = curInfo.wording_edited ? curInfo.wording : t.wording;
    const approved = curInfo.wording_edited ? !!curInfo.wording_approved : (!t.needs_approval && !!(t.question && t.question.approved)) || !!curInfo.wording_approved;
    return {
      slug: t.key, title: wording, h1: wording, status: t.held ? 'Held' : undefined,
      info: {
        post_type: t.post_type, target_query: t.target_query, query_stack: t.query_stack, faq_ids: t.faq_ids,
        stack: t.stack, faq: t.faq, primary_link: t.primary, secondary_links: [], town: t.town || '',
        homepage_cost_guide: !!t.homepage_cost_guide, publish_date: t.publish_date, month: t.month, link_status: curInfo.link_status || '',
        last_checked: curInfo.last_checked || '', review_due: curInfo.review_due || '', batch: t.batch || 'onboarding', source: t.source, source_query: t.source_query || '', refresh_of: t.refresh_of || '',
        service: t.service ? t.service.title : '', service_slug: t.service ? t.service.slug : '', category: t.category ? t.category.title : '', category_slug: t.category ? t.category.slug : '',
        question_id: t.question ? t.question.id : '', question_source: t.question ? t.question.source : '', wording, wording_source: t.wording_source, wording_approved: approved, wording_edited: !!curInfo.wording_edited,
        needs_approval: !!t.needs_approval, bank_topic: t.bank_topic || '', held: !!t.held, pack_service: t.pack_service || '', related_from: t.related_from || [], window_rows: t.window_rows || [], bank_window: t.bank_window || null, bank_block: t.bank_block || '', seasonal: t.seasonal || null, dossier_condition: t.dossier_condition || null, cost_unit: t.cost_unit || '', slot_note: t.slot_note || '', held_for_date: !!t.held_for_date,
      },
    };
  });
}

module.exports = { schedule, scheduleBatch, rowsFor, monthDates, seasonalMonth, parseDate, addMonths, SLOTS, SC_SLOTS, LAUNCH, MONTHS };
