'use strict';

// The first complete JSON object in a model reply, ignoring fences and any text
// before or after it (a reply can add a note after the JSON). Braces inside
// strings are skipped.
function extractJsonObject(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  if (start < 0) throw new Error('no JSON object in the reply');
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return JSON.parse(s.slice(start, i + 1));
  }
  throw new Error('the JSON object in the reply is not complete');
}

module.exports = { extractJsonObject };
