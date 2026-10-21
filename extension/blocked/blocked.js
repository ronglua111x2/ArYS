import { initPageI18n } from '../lib/i18n.js';
import { loadSettings } from '../lib/settings.js';
import { blockPageIsBlocked } from '../lib/warnings.js';
import { getUserEntries } from '../lib/user-rules.js';
import { formatCountdown, isActive, isLocked, isPermanent } from '../lib/nuclear.js';
import { startTicker } from '../ui/countdown.js';

const $ = (id) => document.getElementById(id);
const settings = await loadSettings();

// Custom block page, unless it is itself blocked (that would loop back here forever).
if (settings.blockPage === 'url' && settings.blockPageUrl) {
  if (!blockPageIsBlocked(settings.blockPageUrl, await getUserEntries())) {
    location.replace(settings.blockPageUrl);
    await new Promise(() => {}); // stop here; the page is being replaced
  }
}

const { t } = await initPageI18n(settings.language);
const title = settings.blockTitle || t('blockedPage.title');
document.title = `ArYS – ${title}`;
// Title and message can each be turned off; with both off only the logo is shown.
$('title').textContent = title;
$('title').hidden = !settings.showTitle;
$('message').textContent = settings.blockMessage || t('blockedPage.default');
$('message').hidden = !settings.showMessage;

// While Nuclear runs, say when it ends (ticks only while this tab is visible).
const { nuclear } = settings;
if (isActive(nuclear, Date.now())) {
  let stop = null;
  stop = startTicker((now) => {
    $('locked').hidden = !isLocked(nuclear, now);
    if (!isLocked(nuclear, now)) return stop?.();
    const time = isPermanent(nuclear, now) ? '∞' : formatCountdown(nuclear.unlockAt - now);
    $('locked').textContent = t('blockedPage.locked', { time });
  });
}
document.body.classList.remove('pending');
