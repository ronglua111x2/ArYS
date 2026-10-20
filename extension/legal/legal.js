import { initPageI18n } from '../lib/i18n.js';
import { loadSettings } from '../lib/settings.js';

const params = new URLSearchParams(location.search);
const doc = params.get('doc') === 'privacy' ? 'privacy' : 'terms';
const { t } = await initPageI18n((await loadSettings()).language);

document.title = `ArYS – ${t(`legal.${doc}.title`)}`;
document.getElementById('title').textContent = t(`legal.${doc}.title`);
document.getElementById('body').replaceChildren(
  ...[1, 2, 3, 4, 5].map((n) => {
    const p = document.createElement('p');
    p.textContent = t(`legal.${doc}.p${n}`);
    return p;
  }),
);
if (params.get('from') === 'welcome') {
  document.getElementById('back').href = '../welcome/welcome.html';
}
