// URL matching in JS, for the two cases declarativeNetRequest cannot handle on its own:
//   - in-page (SPA) URL changes and browser pages, checked by background.js;
//   - tabs already open when a rule is added, re-blocked by reloading them.
// URLs are compared in memory only; nothing is stored or sent (ADR-002).
import { urlFilterToRegExp } from './safety.js';
import { entryToCondition } from './rules.js';
import { isBlockedInternal } from './internal.js';

/** Compile DNR conditions into JS RegExps (close approximation of the browser's matcher). */
export function compileConditions(conditions) {
  const out = [];
  for (const c of conditions) {
    try {
      if (c.regexFilter) out.push(new RegExp(c.regexFilter, 'i'));
      else if (c.urlFilter) out.push(urlFilterToRegExp(c.urlFilter));
    } catch {
      // RE2-only syntax: the browser still enforces it on the next page load.
    }
  }
  return out;
}

/**
 * Build a matcher from the user's entries.
 * @param {string[]} entries
 * @returns {{ web: RegExp[], internal: string[] }}
 */
export function compileMatcher(entries) {
  const conditions = [];
  const internal = [];
  for (const entry of entries ?? []) {
    const result = entryToCondition(entry);
    if ('error' in result) continue;
    if (result.condition.internal) internal.push(result.condition.internal);
    else conditions.push(result.condition);
  }
  return { web: compileConditions(conditions), internal };
}

export function matchesAny(url, compiled) {
  return /^https?:\/\//i.test(url) && compiled.some((re) => re.test(url));
}

/** True when `url` (web page or browser page) is blocked by the matcher. */
export function matchUrl(url, matcher) {
  if (/^https?:\/\//i.test(url)) return matcher.web.some((re) => re.test(url));
  return isBlockedInternal(url, matcher.internal);
}

/**
 * Reload every open http(s) tab whose URL matches one of the conditions, so DNR redirects it.
 * Needs no extra permission: host_permissions already expose tab URLs.
 * @returns {Promise<number>} number of tabs reloaded
 */
export async function reblockOpenTabs(conditions) {
  const compiled = compileConditions(conditions);
  if (!compiled.length) return 0;
  const tabs = await chrome.tabs.query({});
  const hits = tabs.filter((t) => t.url && matchesAny(t.url, compiled));
  await Promise.all(hits.map((t) => chrome.tabs.reload(t.id).catch(() => {})));
  return hits.length;
}
