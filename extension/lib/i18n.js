// UI translations. Strings live in extension/i18n/<lang>.js (not chrome.i18n) so the language can
// be switched inside the app; _locales/ only carries the store name/description.
import en from '../i18n/en.js';
import vi from '../i18n/vi.js';

export const DICTIONARIES = { en, vi };
export const LANGUAGE_NAMES = { en: 'English', vi: 'Tiếng Việt' };

/** 'auto' follows the browser UI language; anything unsupported falls back to English. */
export function resolveLanguage(preference, uiLanguage = '') {
  if (preference in DICTIONARIES) return preference;
  return String(uiLanguage).toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

/** Translator for one language: t('key', { n: 3 }) replaces {n}. Missing keys fall back to EN. */
export function translator(language) {
  const dict = DICTIONARIES[language] ?? en;
  return (key, vars = {}) => {
    const text = dict[key] ?? en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
  };
}

/**
 * Fill every element under `root` that declares a translation key:
 *   data-i18n="key"              -> textContent
 *   data-i18n-placeholder="key"  -> placeholder
 *   data-i18n-title="key"        -> title
 *   data-i18n-aria-label="key"   -> aria-label
 */
export function applyTranslations(root, t) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  }
  for (const el of root.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of root.querySelectorAll('[data-i18n-aria-label]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  }
}

/** Resolve the user's language from settings + browser, translate the page, return t(). */
export async function initPageI18n(settingsLanguage) {
  const language = resolveLanguage(settingsLanguage, chrome.i18n?.getUILanguage?.() ?? '');
  document.documentElement.lang = language;
  const t = translator(language);
  applyTranslations(document, t);
  return { t, language };
}
