import { initPageI18n } from '../lib/i18n.js';
import { acceptTerms, loadSettings, saveSettings } from '../lib/settings.js';

const $ = (id) => document.getElementById(id);
let settings = await loadSettings();
await initPageI18n(settings.language);
$('language').value = settings.language;

$('language').addEventListener('change', async (e) => {
  settings = await saveSettings({ language: e.target.value });
  await initPageI18n(settings.language);
});
$('accept').addEventListener('change', (e) => ($('start').disabled = !e.target.checked));
$('start').addEventListener('click', async () => {
  if (!$('accept').checked) return;
  await acceptTerms();
  location.replace('../options/options.html');
});
