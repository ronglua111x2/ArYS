/**
 * Repair damage seen in real StayFocusd exports before conversion.
 * Markdown-link pasting turns "foo.com/" into "[foo.com/](https://foo.com/)"; keep the link text.
 *
 * @param {string} entry
 * @returns {string}
 */
export function sanitizeEntry(entry) {
  return String(entry ?? '')
    .trim()
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

/**
 * Convert a StayFocusd-style blocklist entry into a declarativeNetRequest `urlFilter`.
 *
 * Supported entry shapes (see STAYFOCUSD_ANALYSIS.md section 2.1):
 *   example.com                 -> whole domain incl. subdomains   (||example.com^)
 *   example.com/path?x=1        -> URL prefix                      (||example.com/path?x=1)
 *   https://example.com/a       -> scheme is dropped (http+https both match)
 *   *keyword                    -> substring anywhere in the URL   (keyword)
 *   *://example.com/*           -> trailing wildcard is implicit
 *   exam*                       -> explicit trailing wildcard, no domain-end anchor (||exam)
 *
 * Non-ASCII hosts become punycode and non-ASCII paths are percent-encoded, matching how the
 * browser canonicalizes URLs before DNR sees them.
 *
 * Returns null for entries DNR cannot express (edge://, extension://, blank, comments, or
 * characters that are special in the urlFilter syntax).
 *
 * @param {string} entry
 * @returns {string | null}
 */
export function toUrlFilter(entry) {
  let s = sanitizeEntry(entry).toLowerCase();
  if (!s || s.startsWith('#')) return null;
  if (/[|^[\]()]/.test(s) || /\s/.test(s)) return null;

  const scheme = s.match(/^([a-z][a-z0-9+.-]*|\*):\/\//);
  if (scheme) {
    if (!['http', 'https', '*'].includes(scheme[1])) return null;
    s = s.slice(scheme[0].length);
  }

  // "*keyword": substring match, no domain anchor.
  if (s.startsWith('*')) {
    const keyword = s.replace(/^\*+/, '').replace(/\*+$/, '');
    if (!keyword || /[^\x20-\x7e]/.test(keyword)) return null;
    return keyword;
  }

  const hadTrailingStar = /\*$/.test(s);
  s = s.replace(/\*+$/, '').replace(/^www\./, '');
  const bareDomain = /^[^/?#]+\/$/.test(s); // "foo.com/" or "foo.com/*" is just the domain
  if (bareDomain) s = s.slice(0, -1);
  if (!s) return null;

  s = encodeNonAscii(s);
  if (s === null) return null;

  // Anchor the domain end with ^ unless the user wrote an explicit prefix wildcard ("exam*").
  const anchorEnd = !/[/?#]/.test(s) && (bareDomain || !hadTrailingStar);
  return anchorEnd ? `||${s}^` : `||${s}`;
}

/** @param {string} s host[/path...] @returns {string | null} */
function encodeNonAscii(s) {
  if (!/[^\x20-\x7e]/.test(s)) return s;
  const cut = s.search(/[/?#]/);
  let host = cut === -1 ? s : s.slice(0, cut);
  const rest = cut === -1 ? '' : s.slice(cut);
  if (/[^\x20-\x7e]/.test(host)) {
    try {
      host = new URL(`http://${host}`).hostname;
    } catch {
      return null;
    }
  }
  return host + rest.replace(/[^\x20-\x7e]+/g, (m) => encodeURIComponent(m).toLowerCase());
}

/**
 * Inverse of toUrlFilter(): rebuild an entry from a DNR urlFilter, so the list can be recovered
 * from the browser's dynamic rules alone (see user-rules.js reconcile()).
 * @param {string} filter
 * @returns {string}
 */
export function urlFilterToEntry(filter) {
  if (!filter.startsWith('||')) return `*${filter}`; // keyword
  const body = filter.slice(2);
  if (body.endsWith('^')) return body.slice(0, -1); // whole domain
  return /[/?#]/.test(body) ? body : `${body}*`; // URL prefix, or "pre*" domain prefix
}
