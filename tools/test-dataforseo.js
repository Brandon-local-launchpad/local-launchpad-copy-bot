'use strict';
// One DataForSEO call to check keyword volumes: Google Ads search volume (live), United
// Kingdom, English. Read-only: writes nothing to the database or any file. Prints each
// keyword's monthly volume and CPC, whether the volume is null or zero, the cost DataForSEO
// reports, and what the response says about location targeting. A failed call prints its
// status code and message only (never the credentials or headers).
//
//   node tools/test-dataforseo.js ["keyword one" "keyword two" ...]
//
// Needs DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env or the environment.

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
try { fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).forEach(l => { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, ''); }); } catch (_) {}

const ENDPOINT = 'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live';
const UK = { location_code: 2826, language_code: 'en' }; // United Kingdom, English
const DEFAULT_KEYWORDS = ['gardener southampton', 'gardeners in southampton', 'gardening services southampton', 'landscape gardener romsey', 'tree surgeon winchester', 'tree surgeon chandlers ford', 'patio cleaning stockbridge'];

async function searchVolume(keywords, { login, password, target = UK } = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'), 'Content-Type': 'application/json' },
    body: JSON.stringify([{ keywords, ...target }]),
  });
  let body = null;
  try { body = await res.json(); } catch (_) {}
  // DataForSEO reports errors in status_code/status_message (20000 = ok), at the top and per task
  const task = body && Array.isArray(body.tasks) ? body.tasks[0] : null;
  const fail = !res.ok ? { status: res.status, message: (body && body.status_message) || res.statusText }
    : body && body.status_code !== 20000 ? { status: body.status_code, message: body.status_message }
    : task && task.status_code !== 20000 ? { status: task.status_code, message: task.status_message } : null;
  if (fail) { const e = new Error(String(fail.message || 'request failed').slice(0, 300)); e.status = fail.status; throw e; }
  return { body, task };
}

async function main() {
  const login = process.env.DATAFORSEO_LOGIN, password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) { console.log('DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD must be set in .env'); return 1; }
  const keywords = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_KEYWORDS;
  let out;
  try { out = await searchVolume(keywords, { login, password }); }
  catch (e) { console.log(`DataForSEO call failed: status ${e.status || 'none'}, message: ${e.message}`); return 1; }
  const { body, task } = out;
  const rows = (task && task.result) || [];
  console.log(`Google Ads search volume, live · location_code ${UK.location_code} (United Kingdom) · language ${UK.language_code} · ${keywords.length} keywords\n`);
  console.log('| Keyword | Monthly volume | CPC (GBP?) | Null or zero |');
  console.log('|---|---|---|---|');
  for (const k of keywords) {
    const r = rows.find(x => x && String(x.keyword).toLowerCase() === k.toLowerCase());
    const vol = r ? r.search_volume : undefined;
    const flag = !r ? 'not returned' : vol == null ? 'null' : vol === 0 ? 'zero' : '';
    console.log(`| ${k} | ${r && vol != null ? vol : '—'} | ${r && r.cpc != null ? r.cpc : '—'} | ${flag} |`);
  }
  console.log(`\nCost reported by DataForSEO: ${body.cost} (task: ${task.cost}) · ${body.tasks_count} task(s), ${body.tasks_error} error(s)`);
  // Location targeting: what the request accepted and what each result says
  const data = task.data || {};
  const locKeys = Object.keys(data).filter(k => /location|language/.test(k));
  const resultLoc = [...new Set(rows.map(r => JSON.stringify({ location_code: r.location_code, language_code: r.language_code })))];
  console.log(`Location in the request echo (task.data): ${locKeys.map(k => `${k}=${JSON.stringify(data[k])}`).join(', ') || 'none'}`);
  console.log(`Location on each result: ${resultLoc.join(' ')}`);
  console.log(`Result fields: ${rows[0] ? Object.keys(rows[0]).join(', ') : 'none'}`);
  return 0;
}

module.exports = { searchVolume, DEFAULT_KEYWORDS };
// exitCode, not process.exit(): exiting while fetch's socket is still closing trips a libuv
// assertion on Windows (src\win\async.c)
if (require.main === module) main().then(code => { process.exitCode = code; }).catch(e => { console.log(`Failed: ${e.message}`); process.exitCode = 1; });
