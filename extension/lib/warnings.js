// Entries that block pages ArYS itself relies on. Adding them is always allowed; the UI only warns.
// Pure functions, unit-tested.
import { compileMatcher, matchUrl } from './matcher.js';

/** Edge's extension management pages, where ArYS is managed and removed. */
export function extensionsPages(extensionId = '') {
  const pages = ['edge://extensions/'];
  if (extensionId) pages.push(`edge://extensions/?id=${extensionId}`);
  return pages;
}

/** True when the custom block page is itself blocked: ArYS then shows its own page (no loop). */
export function blockPageIsBlocked(url, entries) {
  return Boolean(url) && matchUrl(url, compileMatcher(entries));
}

/**
 * Which of `entries` block a page ArYS relies on.
 * @param {string[]} entries
 * @param {{ blockPageUrl?: string, optionsUrl?: string, extensionId?: string }} targets
 *   blockPageUrl: the custom block page, only when it is in use.
 * @returns {{ blockPage: string[], extensionsPage: string[], optionsPage: string[] }}
 */
export function riskyEntries(entries, { blockPageUrl = '', optionsUrl = '', extensionId = '' }) {
  const targets = {
    blockPage: blockPageUrl ? [blockPageUrl] : [],
    extensionsPage: extensionsPages(extensionId),
    optionsPage: optionsUrl ? [optionsUrl] : [],
  };
  const out = { blockPage: [], extensionsPage: [], optionsPage: [] };
  const all = compileMatcher(entries);
  if (!Object.values(targets).some((urls) => urls.some((u) => matchUrl(u, all)))) return out;
  for (const entry of entries) {
    const one = compileMatcher([entry]);
    for (const [key, urls] of Object.entries(targets)) {
      if (urls.some((u) => matchUrl(u, one))) out[key].push(entry);
    }
  }
  return out;
}
