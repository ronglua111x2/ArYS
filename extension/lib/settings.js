// The few settings ArYS keeps (minimal by design). Stored in chrome.storage.local; the Nuclear
// state is mirrored to chrome.storage.sync and the stricter copy wins, so deleting one copy in the
// browser profile does not lift a lock. The theme lives in localStorage so pages can apply it
// before first paint.
import { nuclearChangeProblem, normalizeNuclear } from './nuclear.js';

export const SETTINGS_KEY = 'settings';
export const TERMS_KEY = 'terms';
const SYNC_NUCLEAR = 'arys:nuclear';
/** Bump when the terms text changes in a way users must accept again. */
export const TERMS_VERSION = 1;
export const TITLE_MAX = 60;
export const MESSAGE_MAX = 280;

/** Only absolute http(s) URLs are accepted as a custom block page. */
export function safeRedirectUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Pure: coerce whatever is stored into valid settings (unknown keys are dropped). */
export function normalizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const blockPageUrl = safeRedirectUrl(r.blockPageUrl) ?? '';
  return {
    language: ['auto', 'en', 'vi'].includes(r.language) ? r.language : 'auto',
    blockPage: r.blockPage === 'url' && blockPageUrl ? 'url' : 'default',
    blockPageUrl,
    blockTitle: text(r.blockTitle, TITLE_MAX),
    blockMessage: text(r.blockMessage, MESSAGE_MAX),
    // Both off: the block page shows only the logo.
    showTitle: r.showTitle !== false,
    showMessage: r.showMessage !== false,
    nuclear: normalizeNuclear(r.nuclear),
  };
}

/** Pure: of two nuclear copies, keep the stricter one (longest lock, earliest start). */
export function stricterNuclear(a, b) {
  const x = normalizeNuclear(a);
  const y = normalizeNuclear(b);
  if (!x.enabled) return y;
  if (!y.enabled) return x;
  return {
    enabled: true,
    startsAt: Math.min(x.startsAt, y.startsAt),
    unlockAt: Math.max(x.unlockAt, y.unlockAt),
  };
}

export async function loadSettings() {
  const local = normalizeSettings((await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY]);
  let synced = null;
  try {
    synced = (await chrome.storage.sync.get(SYNC_NUCLEAR))[SYNC_NUCLEAR];
  } catch {
    // sync storage unavailable
  }
  return { ...local, nuclear: stricterNuclear(local.nuclear, synced) };
}

/**
 * The only way to write settings. Refuses any change that would weaken an active Nuclear lock.
 * @throws {Error} message = reason code ('locked-disable' | 'locked-shorten' | 'locked-postpone')
 */
export async function saveSettings(patch, now = Date.now()) {
  const prev = await loadSettings();
  const next = normalizeSettings({ ...prev, ...patch });
  const problem = nuclearChangeProblem(prev.nuclear, next.nuclear, now);
  if (problem) throw new Error(problem);
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  try {
    await chrome.storage.sync.set({ [SYNC_NUCLEAR]: next.nuclear });
  } catch {
    // the local copy still holds the lock
  }
  return next;
}

export async function termsAccepted() {
  const t = (await chrome.storage.local.get(TERMS_KEY))[TERMS_KEY];
  return Boolean(t && t.version >= TERMS_VERSION);
}

export async function acceptTerms() {
  await chrome.storage.local.set({
    [TERMS_KEY]: { version: TERMS_VERSION, acceptedAt: Date.now() },
  });
}
