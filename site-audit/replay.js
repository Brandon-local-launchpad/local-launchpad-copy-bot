'use strict';

// Plays back a recording made by tools/site-audit-run.js --record: the same responses in the order
// they were asked for, per URL, with no network and nothing spent. For fixtures and the local demo.
const fs = require('fs');

function replayer(file) {
  const log = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byUrl = new Map();
  for (const e of log) { if (!byUrl.has(e.url)) byUrl.set(e.url, []); byUrl.get(e.url).push(e); }
  return async url => {
    const list = byUrl.get(String(url));
    if (!list || !list.length) throw Object.assign(new Error(`not in the recording: ${url}`), { cause: { code: 'ENOTFOUND' } });
    const e = list.length > 1 ? list.shift() : list[0];
    return new Response(e.status >= 300 && e.status < 400 ? null : e.body, { status: e.status, headers: e.headers });
  };
}

module.exports = { replayer };
