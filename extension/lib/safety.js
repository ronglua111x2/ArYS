/**
 * Reject patterns so broad they would block (nearly) the whole web. Custom rules can never be
 * removed (ADR-007), so a typo like "*a" or ".*" must be caught before it is added.
 */

/** Random hosts no sane blocklist targets. A pattern matching any of them is "too broad". */
const CANARY_URLS = [
  'https://q7x2k9v4.test/',
  'https://www.z3m8p1r6.test/a/b?c=d',
  'http://192.0.2.7/index.html',
];

/**
 * Approximate a DNR urlFilter as a JS RegExp (good enough for the breadth check, not for
 * enforcement - the browser does the real matching).
 * @param {string} filter
 */
export function urlFilterToRegExp(filter) {
  let body = filter;
  let re = '';
  if (body.startsWith('||')) {
    re = '^[a-z][a-z0-9+.-]*://([^/?#]*\\.)?';
    body = body.slice(2);
  } else if (body.startsWith('|')) {
    re = '^';
    body = body.slice(1);
  }
  let end = '';
  if (body.endsWith('|')) {
    end = '$';
    body = body.slice(0, -1);
  }
  for (const ch of body) {
    if (ch === '*') re += '.*';
    else if (ch === '^') re += '(?:[^a-z0-9_.%-]|$)';
    else re += ch.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  }
  return new RegExp(re + end, 'i');
}

/** @returns {string | null} reason, or null when acceptable */
export function urlFilterProblem(filter) {
  const anchored = filter.startsWith('|');
  const core = filter.replace(/^\|\|?/, '').replace(/[*^|]/g, '');
  if (core.length < 3) return 'too short - would block almost everything';
  if (!anchored && core.length < 4) return 'keyword too short (minimum 4 characters)';
  const re = urlFilterToRegExp(filter);
  if (CANARY_URLS.some((u) => re.test(u))) return 'too broad - matches unrelated sites';
  return null;
}

/** @returns {string | null} reason, or null when acceptable */
export function regexProblem(source) {
  if (!source) return 'empty regex';
  if (source.length > 2000) return 'regex too long (max 2000 characters)';
  if (/\(\?[=!<]|\\[1-9]/.test(source)) {
    return 'lookaround and backreferences are not supported by the browser (RE2 syntax)';
  }
  let re;
  try {
    re = new RegExp(source, 'i');
  } catch (err) {
    return `invalid regex: ${err.message}`;
  }
  if (CANARY_URLS.some((u) => re.test(u))) return 'too broad - matches unrelated sites';
  return null;
}
