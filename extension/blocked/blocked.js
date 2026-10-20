import { initPageI18n } from '../lib/i18n.js';
import { loadSettings } from '../lib/settings.js';
import { compileMatcher, matchUrl } from '../lib/matcher.js';
import { getUserEntries } from '../lib/user-rules.js';

const settings = await loadSettings();

// Custom block page, unless it is itself blocked (that would loop back here forever).
if (settings.blockPage === 'url' && settings.blockPageUrl) {
  const matcher = compileMatcher(await getUserEntries());
  if (!matchUrl(settings.blockPageUrl, matcher)) {
    location.replace(settings.blockPageUrl);
    await new Promise(() => {}); // stop here; the page is being replaced
  }
}

const { t } = await initPageI18n(settings.language);
document.title = `ArYS – ${t('blockedPage.title')}`;
document.getElementById('message').textContent = settings.blockMessage || t('blockedPage.default');
document.body.classList.remove('pending');
