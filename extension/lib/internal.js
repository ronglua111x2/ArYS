// Browser-internal pages (edge://..., extension://...) are invisible to declarativeNetRequest, so
// background.js blocks them from webNavigation events instead. Pure helpers, unit-tested.

const ALIASES = [
  ['chrome-extension://', 'extension://'],
  ['chrome://', 'edge://'],
];

export const isInternalEntry = (entry) =>
  /^(edge|chrome|extension|chrome-extension):\/\//i.test(String(entry ?? '').trim());

/** Lowercase, map chrome:// -> edge:// and chrome-extension:// -> extension://. */
export function normalizeInternal(url) {
  let u = String(url ?? '')
    .trim()
    .toLowerCase();
  for (const [from, to] of ALIASES) if (u.startsWith(from)) u = to + u.slice(from.length);
  return u;
}

/** Entry -> canonical prefix ("edge://extensions/" -> "edge://extensions"). */
export function internalPrefix(entry) {
  return normalizeInternal(entry).replace(/\*+$/, '').replace(/\/+$/, '');
}

/** True if `url` is the page `prefix` or one of its sub-pages / query / fragment variants. */
export function isBlockedInternal(url, prefixes) {
  const u = normalizeInternal(url);
  return prefixes.some((p) => u === p || (u.startsWith(p) && /^[/?#]/.test(u.slice(p.length))));
}

/**
 * webNavigation event filters, so Edge wakes the worker ONLY for listed pages (both URL
 * spellings). Matching happens inside the browser; ordinary browsing never reaches the worker.
 */
export function internalFilters(prefixes) {
  const out = [];
  for (const p of prefixes) {
    out.push({ urlPrefix: p });
    if (p.startsWith('edge://')) out.push({ urlPrefix: `chrome://${p.slice(7)}` });
    if (p.startsWith('extension://')) out.push({ urlPrefix: `chrome-extension://${p.slice(12)}` });
  }
  return out;
}
