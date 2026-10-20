// Event-only service worker. No timers, no polling, no keep-alive: Edge starts it for an event and
// stops it again when idle.
//
// declarativeNetRequest blocks ordinary page loads by itself. This worker covers what it cannot see:
//   1. in-page (single-page app) address changes, e.g. a search inside YouTube;
//   2. browser pages (edge://..., extension://...) the user chose to block.
// Both are checked in memory against the user's list; addresses are never stored or sent.
//   3. Once per extension session (install, update, browser start): repair the list from its three
//      copies (lib/user-rules.js) and re-block tabs that were already open on a blocked site.
import { compileMatcher, matchUrl, reblockOpenTabs } from './lib/matcher.js';
import { normalizeInternal } from './lib/internal.js';
import { getUserEntries, getUserRules, reconcile } from './lib/user-rules.js';

const BLOCK_PAGE = chrome.runtime.getURL('blocked/blocked.html');
// The block page itself is never blocked (that would loop). Other ArYS pages can be, if the user
// adds such an entry; the options page warns before that happens.
const SELF_BLOCK_PAGE = normalizeInternal(BLOCK_PAGE);
const WEB = { url: [{ schemes: ['http', 'https'] }] };
const BROWSER = { url: [{ schemes: ['edge', 'chrome', 'extension', 'chrome-extension'] }] };

// Built once per worker lifetime, rebuilt when the list changes.
let matcher = null;
const getMatcher = () => (matcher ??= getUserEntries().then(compileMatcher));

function check(details) {
  if (details.frameId !== 0) return;
  if (normalizeInternal(details.url).startsWith(SELF_BLOCK_PAGE)) return;
  getMatcher().then((m) => {
    if (matchUrl(details.url, m)) {
      chrome.tabs.update(details.tabId, { url: BLOCK_PAGE }).catch(() => {});
    }
  });
}

// 1. In-page address changes on web pages (real page loads are blocked by DNR).
chrome.webNavigation.onHistoryStateUpdated.addListener(check, WEB);
chrome.webNavigation.onReferenceFragmentUpdated.addListener(check, WEB);
// 2. Browser pages: DNR never sees them.
chrome.webNavigation.onCommitted.addListener(check, BROWSER);
chrome.webNavigation.onHistoryStateUpdated.addListener(check, BROWSER);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.userEntries) matcher = null;
});

// 3. Session start.
function sessionStart(fresh) {
  return chrome.storage.session.get('started').then(({ started }) => {
    if (started && !fresh) return;
    chrome.storage.session.set({ started: true });
    return reconcile({ fresh })
      .catch(() => {})
      .then(() => getUserRules())
      .then((rules) => reblockOpenTabs(rules.map((r) => r.condition)));
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  sessionStart(details.reason === 'install');
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
  }
});
chrome.runtime.onStartup.addListener(() => sessionStart(false));
