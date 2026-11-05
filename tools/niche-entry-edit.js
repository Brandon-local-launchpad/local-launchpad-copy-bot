'use strict';

// ── Editing a niche entry's JSON by hand's format (copy quality 6, 5 Nov 2026) ─
// The entries are kept by hand (inline arrays, blank lines between sections), so a JSON.stringify
// round trip would rewrite hundreds of lines. These edits find an object's place in the raw text
// and insert into it, leaving every other character alone.

// Every object's span in the raw text, by path ("service_page_blocks/A/problems/cards/0")
function objectSpans(raw) {
  let i = 0;
  const spans = new Map();
  const ws = () => { while (i < raw.length && ' \t\r\n'.includes(raw[i])) i++; };
  const str = () => {
    i++;
    let out = '';
    while (raw[i] !== '"') {
      if (raw[i] === '\\') { out += JSON.parse(`"${raw[i]}${raw[i + 1] === 'u' ? raw.slice(i + 1, i + 6) : raw[i + 1]}"`); i += raw[i + 1] === 'u' ? 6 : 2; }
      else out += raw[i++];
    }
    i++;
    return out;
  };
  const value = path => {
    ws();
    const c = raw[i];
    if (c === '{') {
      const start = i++;
      ws();
      while (raw[i] !== '}') {
        const k = str();
        ws(); i++; // the colon
        value(path ? `${path}/${k}` : k);
        ws();
        if (raw[i] === ',') { i++; ws(); }
      }
      i++;
      spans.set(path, { start, end: i - 1 });
    } else if (c === '[') {
      i++;
      ws();
      let n = 0;
      while (raw[i] !== ']') {
        value(path ? `${path}/${n}` : String(n));
        n++;
        ws();
        if (raw[i] === ',') { i++; ws(); }
      }
      i++;
    } else if (c === '"') str();
    else while (i < raw.length && !',}] \t\r\n'.includes(raw[i])) i++;
  };
  value('');
  return spans;
}

// Insert "key": value as the last key of the object at each path. edits: [{ path, key, value }]
function insertKeys(raw, edits) {
  const spans = objectSpans(raw);
  const nl = raw.includes('\r\n') ? '\r\n' : '\n';
  const located = edits.map(e => { const s = spans.get(e.path); if (!s) throw new Error(`no object at ${e.path}`); return { ...e, ...s }; }).sort((a, b) => b.end - a.end);
  let out = raw;
  for (const e of located) {
    let last = e.end - 1;
    while (' \t\r\n'.includes(out[last])) last--;
    const inner = out.slice(e.start, e.end);
    const multiline = inner.includes('\n');
    const empty = out[last] === '{';
    const json = JSON.stringify(e.value, null, multiline && e.block ? 2 : 0).replace(/\n/g, `${nl}  `);
    if (multiline) {
      const lineStart = out.lastIndexOf('\n', e.end) + 1;
      const indent = out.slice(lineStart, e.end).match(/^\s*/)[0] + '  ';
      out = `${out.slice(0, last + 1)}${empty ? '' : ','}${nl}${indent}"${e.key}": ${json}${out.slice(last + 1)}`;
    } else {
      const pretty = json.replace(/","/g, '", "');
      out = `${out.slice(0, last + 1)}${empty ? '' : ','} "${e.key}": ${pretty}${out.slice(last + 1)}`;
    }
  }
  JSON.parse(out); // refuses to hand back anything that no longer parses
  return out;
}

module.exports = { objectSpans, insertKeys };
