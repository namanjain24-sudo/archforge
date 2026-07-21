/**
 * Robust JSON extraction & repair.
 * --------------------------------
 * LLMs sometimes wrap JSON in ```json fences, add a prose preamble, or emit a
 * trailing comma. For accuracy we never trust the raw string — we extract the
 * JSON object defensively and only then hand it to schema validation.
 *
 * Order of attempts (cheapest → most aggressive):
 *   native JSON.parse → trailing-comma fix → `jsonrepair` (handles single
 *   quotes, unquoted keys, unterminated strings, comments, …).
 */
import { jsonrepair } from 'jsonrepair';

/** Strip markdown code fences if present. */
function stripFences(s) {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fence ? fence[1] : s;
}

/** Return the substring spanning the first balanced top-level {...}. */
function firstBalancedObject(s) {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return s.slice(start, i + 1); }
  }
  return null;
}

/** Remove trailing commas before } or ] (a very common model slip). */
function dropTrailingCommas(s) {
  return s.replace(/,(\s*[}\]])/g, '$1');
}

/**
 * Extract a JSON object from arbitrary model output.
 * @returns {object}
 * @throws if nothing parseable is found.
 */
export function extractJson(raw) {
  if (typeof raw !== 'string') throw new Error('provider returned non-string output');
  const candidates = [];
  const fenced = stripFences(raw).trim();
  candidates.push(fenced);
  const balanced = firstBalancedObject(fenced) || firstBalancedObject(raw);
  if (balanced) candidates.push(balanced);

  const tryParse = (s) => {
    const obj = JSON.parse(s);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
    throw new Error('not an object');
  };

  for (const c of candidates) {
    for (const attempt of [c, dropTrailingCommas(c)]) {
      try { return tryParse(attempt); } catch { /* try next */ }
    }
    // Last resort: hand the fragment to jsonrepair, then parse.
    try { return tryParse(jsonrepair(c)); } catch { /* try next candidate */ }
  }
  throw new Error('could not extract JSON from model output');
}
