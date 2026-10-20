import { toUrlFilter, urlFilterToEntry } from './patterns.js';
import { regexProblem, urlFilterProblem } from './safety.js';
import { internalPrefix, isInternalEntry } from './internal.js';

/** Extension page shown instead of a blocked site. Must be listed in web_accessible_resources. */
export const BLOCK_PAGE = '/blocked/blocked.html';

/** Entries starting with this prefix are regular expressions (DNR regexFilter, RE2 syntax). */
export const REGEX_PREFIX = 'regex:';

const COMMON = { isUrlFilterCaseSensitive: false, resourceTypes: ['main_frame'] };

/**
 * Turn one blocklist entry into the condition that enforces it:
 *   { urlFilter } / { regexFilter }  a declarativeNetRequest condition (web pages);
 *   { internal }                     a browser page (edge://, extension://) that DNR cannot see,
 *                                    enforced by background.js instead.
 * @param {string} entry
 * @returns {{ condition: object } | { error: string }}
 */
export function entryToCondition(entry) {
  const raw = String(entry ?? '').trim();
  if (isInternalEntry(raw)) {
    const internal = internalPrefix(raw);
    if (!/^[a-z-]+:\/\/[^/]+/.test(internal)) return { error: 'incomplete' };
    return { condition: { internal } };
  }
  if (raw.toLowerCase().startsWith(REGEX_PREFIX)) {
    const source = raw.slice(REGEX_PREFIX.length).trim();
    const problem = regexProblem(source);
    if (problem) return { error: problem };
    return { condition: { regexFilter: source, ...COMMON } };
  }
  const urlFilter = toUrlFilter(raw);
  if (!urlFilter) return { error: 'invalid' };
  const problem = urlFilterProblem(urlFilter);
  if (problem) return { error: problem };
  return { condition: { urlFilter, ...COMMON } };
}

/** True when the condition is enforced by declarativeNetRequest (not by the worker). */
export const isDnrCondition = (c) => Boolean(c && (c.urlFilter || c.regexFilter));

/** Entry text for a DNR condition (inverse of entryToCondition, up to equivalent spellings). */
export const conditionToEntry = (c) =>
  c.regexFilter ? REGEX_PREFIX + c.regexFilter : urlFilterToEntry(c.urlFilter ?? '');

/** Identity of a condition, for de-duplication. */
export const conditionKey = (c) =>
  c.internal ? `in:${c.internal}` : c.regexFilter ? `re:${c.regexFilter}` : `uf:${c.urlFilter}`;

/** Block-only by design: there are no allow rules anywhere (ADR-007). */
export function makeRule(id, condition) {
  return {
    id,
    priority: 1,
    action: { type: 'redirect', redirect: { extensionPath: BLOCK_PAGE } },
    condition,
  };
}

/**
 * How an entry is written:
 *   'regex'   "regex:<RE2>", a full regular expression (advanced, not advertised in the UI)
 *   'pattern' wildcard syntax ("*keyword", "site.com/*", "pre*")
 *   'site'    a plain domain or URL prefix
 *   'system'  a browser page (edge://, extension://), blocked by background.js
 */
export function entryKind(entry) {
  const raw = String(entry ?? '').trim();
  if (isInternalEntry(raw)) return 'system';
  if (raw.toLowerCase().startsWith(REGEX_PREFIX)) return 'regex';
  return raw.includes('*') ? 'pattern' : 'site';
}

/**
 * Display data for the options page list: one item per entry with its condition, or the reason
 * it is not enforceable. Entries producing the same condition as an earlier one are dropped.
 * @param {string[]} entries
 */
export function describeEntries(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    if (!String(entry ?? '').trim()) continue;
    const result = entryToCondition(entry);
    const item = { entry, kind: entryKind(entry) };
    if ('error' in result) {
      item.error = result.error;
    } else {
      const key = conditionKey(result.condition);
      if (seen.has(key)) continue;
      seen.add(key);
      item.condition = result.condition;
    }
    out.push(item);
  }
  return out;
}
