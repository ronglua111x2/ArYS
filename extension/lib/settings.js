// The few settings ArYS keeps (minimal by design, ADR-002). Stored in chrome.storage.local only.
// The theme is kept in localStorage instead so pages can apply it before first paint.

export const SETTINGS_KEY = 'settings';
export const TERMS_KEY = 'terms';
/** Bump when the terms text changes in a way users must accept again. */
export const TERMS_VERSION = 1;
export const MESSAGE_MAX = 200;

export const DEFAULT_SETTINGS = Object.freeze({
  language: 'auto', // 'auto' | 'en' | 'vi'
  blockPage: 'default', // 'default' | 'url'
  blockPageUrl: '',
  blockMessage: '',
});

/** Only absolute http(s) URLs are accepted as a custom block page. */
export function safeRedirectUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Pure: coerce whatever is stored into valid settings (unknown keys are dropped). */
export function normalizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const language = ['auto', 'en', 'vi'].includes(r.language) ? r.language : 'auto';
  const blockPageUrl = safeRedirectUrl(r.blockPageUrl) ?? '';
  const blockPage = r.blockPage === 'url' && blockPageUrl ? 'url' : 'default';
  const blockMessage =
    typeof r.blockMessage === 'string' ? r.blockMessage.trim().slice(0, MESSAGE_MAX) : '';
  return { language, blockPage, blockPageUrl, blockMessage };
}

export async function loadSettings() {
  return normalizeSettings((await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY]);
}

export async function saveSettings(patch) {
  const next = normalizeSettings({ ...(await loadSettings()), ...patch });
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
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
