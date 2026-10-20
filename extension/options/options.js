import {
  addUserRules,
  getUserEntries,
  getUserRules,
  planAdditions,
  reconcile,
  removeUserEntries,
} from '../lib/user-rules.js';
import { describeEntries, entryKind, isDnrCondition, REGEX_PREFIX } from '../lib/rules.js';
import { reblockOpenTabs } from '../lib/matcher.js';
import { initPageI18n } from '../lib/i18n.js';
import {
  ACCENTS,
  loadSettings,
  MESSAGE_MAX,
  safeImage,
  safeRedirectUrl,
  saveSettings,
  SETTINGS_KEY,
  termsAccepted,
} from '../lib/settings.js';
import {
  formatCountdown,
  isActive,
  isLocked,
  isPermanent,
  isScheduled,
  PERMANENT_MS,
  planNuclear,
} from '../lib/nuclear.js';
import { buildExport, exportFileName, IMPORT_MAX, parseImport } from '../lib/transfer.js';
import { blockPageIsBlocked, riskyEntries } from '../lib/warnings.js';
import { startTicker } from '../ui/countdown.js';

const $ = (id) => document.getElementById(id);
const VERSION = chrome.runtime.getManifest().version;
const OPTIONS_URL = chrome.runtime.getURL('options/options.html');

// First run: the terms must be accepted before anything else (welcome/welcome.html).
if (!(await termsAccepted())) {
  location.replace('../welcome/welcome.html');
  await new Promise(() => {}); // stop here; the page is being replaced
}

let settings = await loadSettings();
let { t, language } = await initPageI18n(settings.language);

/** Map a validation reason (lib/safety.js, lib/rules.js) to a translated message. */
function reasonText(reason) {
  const r = String(reason);
  const key = r.startsWith('keyword too short')
    ? 'reason.keywordShort'
    : r.startsWith('too short')
      ? 'reason.tooShort'
      : r.startsWith('too broad')
        ? 'reason.tooBroad'
        : r.startsWith('lookaround')
          ? 'reason.re2'
          : r.startsWith('invalid regex')
            ? 'reason.invalidRegex'
            : r.startsWith('empty regex')
              ? 'reason.emptyRegex'
              : r.startsWith('regex too long')
                ? 'reason.regexLong'
                : r === 'incomplete'
                  ? 'reason.incomplete'
                  : r.startsWith('Browser rejected')
                    ? 'reason.browser'
                    : 'reason.invalid';
  return t(key);
}

const formatDate = (ts) =>
  new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(ts);
const locked = () => isLocked(settings.nuclear, Date.now());
/** Do not overwrite a field the user is typing in (trimmed values would eat their spaces). */
const setValue = (el, value) => {
  if (document.activeElement !== el) el.value = value;
};

// ---------- navigation (Blocked is always the first view) --------------------------------------
function showView(name) {
  for (const btn of document.querySelectorAll('.nav-item')) {
    btn.classList.toggle('active', btn.dataset.view === name);
  }
  for (const view of document.querySelectorAll('.view')) view.hidden = view.id !== `view-${name}`;
}
for (const btn of document.querySelectorAll('.nav-item')) {
  btn.addEventListener('click', () => showView(btn.dataset.view));
}

// ---------- theme ------------------------------------------------------------------------------
const THEMES = ['system', 'light', 'dark'];
const THEME_ICON = { system: '◐', light: '☀', dark: '☾' };
function currentTheme() {
  try {
    return localStorage.getItem('arys-theme') || 'system';
  } catch {
    return 'system';
  }
}
function applyTheme(theme) {
  try {
    localStorage.setItem('arys-theme', theme);
  } catch {
    // not persisted; still applied for this visit
  }
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  $('theme-toggle').textContent = `${THEME_ICON[theme]} ${t(`theme.${theme}`)}`;
  $('theme').value = theme;
}
$('theme-toggle').addEventListener('click', () => {
  applyTheme(THEMES[(THEMES.indexOf(currentTheme()) + 1) % THEMES.length]);
});
$('theme').addEventListener('change', (e) => applyTheme(e.target.value));

// ---------- blocked list -----------------------------------------------------------------------
let entries = [];
let described = [];
let userConditions = [];
let kindFilter = 'all';
let risk = new Map(); // entry -> warning keys

// Pages ArYS relies on. Entries that block them are allowed; they only get a warning.
const RISK_KEYS = {
  blockPage: 'warn.blockPage',
  extensionsPage: 'warn.extensionsPage',
  optionsPage: 'warn.optionsPage',
};
const riskTargets = () => ({
  blockPageUrl: settings.blockPage === 'url' ? settings.blockPageUrl : '',
  optionsUrl: OPTIONS_URL,
  extensionId: chrome.runtime.id,
});
function computeRisk() {
  risk = new Map();
  for (const [kind, list] of Object.entries(riskyEntries(entries, riskTargets()))) {
    for (const e of list) risk.set(e, [...(risk.get(e) ?? []), RISK_KEYS[kind]]);
  }
}

async function load() {
  const [rules, list] = await Promise.all([getUserRules(), getUserEntries()]);
  entries = list;
  described = describeEntries(entries);
  userConditions = [
    ...rules.map((r) => r.condition),
    ...described.filter((d) => d.condition && !isDnrCondition(d.condition)).map((d) => d.condition),
  ];
  computeRisk();
  renderUrlWarning();
  renderList();
}

function renderList() {
  const term = $('search').value.trim().toLowerCase();
  const isLockedNow = locked();
  const items = described.filter(
    (i) =>
      (kindFilter === 'all' || i.kind === kindFilter) &&
      (!term || i.entry.toLowerCase().includes(term)),
  );
  $('count').textContent = t('blocked.count', { n: described.length });
  $('list').replaceChildren(
    ...items.map((i) => {
      const li = document.createElement('li');
      if (i.error) {
        li.className = 'unsupported';
        li.title = t('entry.notEnforceable', { reason: reasonText(i.error) });
      }
      const text = document.createElement('span');
      text.className = 'entry';
      text.textContent = i.kind === 'regex' ? i.entry.slice(REGEX_PREFIX.length) : i.entry;
      const kind = document.createElement('span');
      kind.className = 'badge';
      kind.textContent = t(`kind.${i.kind}`);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove ghost';
      remove.textContent = '✕';
      remove.disabled = isLockedNow;
      remove.title = t(isLockedNow ? 'blocked.removeLocked' : 'blocked.remove');
      remove.setAttribute('aria-label', `${t('blocked.remove')}: ${text.textContent}`);
      remove.addEventListener('click', () => removeEntries([i.entry]));
      const warnings = risk.get(i.entry);
      if (warnings) {
        const w = document.createElement('span');
        w.className = 'badge warn-badge';
        w.textContent = '⚠';
        w.title = warnings.map((k) => t(k, { entries: i.entry })).join('\n');
        li.append(text, w, kind, remove);
      } else li.append(text, kind, remove);
      return li;
    }),
  );
  const empty = $('empty');
  empty.hidden = items.length > 0;
  empty.textContent = described.length ? t('blocked.noMatch') : t('blocked.empty');
}

async function removeEntries(list) {
  try {
    const n = await removeUserEntries(list);
    await load();
    if (n) toast(t('toast.removed', { n }));
  } catch (err) {
    toast(t(err.message === 'locked' ? 'blocked.removeLocked' : 'toast.failed'));
  }
}

$('search').addEventListener('input', renderList);
for (const btn of document.querySelectorAll('.filter')) {
  btn.addEventListener('click', () => {
    kindFilter = btn.dataset.kind;
    for (const b of document.querySelectorAll('.filter')) b.classList.toggle('active', b === btn);
    renderList();
  });
}

// ---------- export / import --------------------------------------------------------------------
$('export').addEventListener('click', () => {
  if (!entries.length) return toast(t('toast.exportEmpty'));
  const blob = new Blob([buildExport(entries, { version: VERSION })], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = exportFileName();
  a.click();
  URL.revokeObjectURL(a.href);
  toast(t('toast.exported', { n: entries.length }));
});

$('import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const result = parseImport(await file.text());
  if ('error' in result) {
    return toast(t(result.error === 'empty' ? 'import.errorEmpty' : 'import.errorFormat'));
  }
  openAddDialog({ text: result.entries.join('\n'), max: IMPORT_MAX, title: 'add.importTitle' });
});

// ---------- add / import dialog ----------------------------------------------------------------
// One textarea; every line is classified and checked against everything already blocked.
// Duplicates are skipped automatically. Typed input: up to 500 lines; imported files: more.
const ADD_MAX = 500;
const dialog = $('add-dialog');
let plan = null;
let lineLimit = ADD_MAX;
let evaluateTimer;

function previewItem(text, badge, cls) {
  const li = document.createElement('li');
  li.className = cls;
  const e = document.createElement('span');
  e.className = 'entry';
  e.textContent = text;
  const b = document.createElement('span');
  b.className = 'badge';
  b.textContent = badge;
  li.append(e, b);
  return li;
}

function evaluate() {
  const lines = $('add-input')
    .value.split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const summary = $('summary');
  const preview = $('preview');
  plan = null;
  summary.className = 'summary';
  summary.textContent = '';
  preview.replaceChildren();
  let toAdd = [];

  if (lines.length > lineLimit) {
    summary.className = 'summary bad';
    summary.textContent = t('add.tooMany', { n: lines.length, max: lineLimit });
  } else if (lines.length) {
    const p = planAdditions(lines.join('\n'), '', userConditions);
    plan = p.add.length ? p : null;
    toAdd = p.add.map((a) => a.input);
    summary.textContent = [
      t('add.summaryAdd', { n: p.add.length }),
      p.duplicates.length && t('add.summarySkipped', { n: p.duplicates.length }),
      p.rejected.length && t('add.summaryRejected', { n: p.rejected.length }),
    ]
      .filter(Boolean)
      .join(' · ');
    preview.append(
      ...p.add.map((a) => previewItem(a.input, t(`kind.${entryKind(a.input)}`), 'ok')),
      ...p.rejected.map((r) =>
        previewItem(`${r.input} — ${reasonText(r.reason)}`, t('add.badgeRejected'), 'bad'),
      ),
      ...p.duplicates.map((d) => previewItem(d, t('add.badgeSkipped'), 'skip')),
    );
  }
  renderAddWarnings(toAdd);
  $('add').textContent = plan ? t('add.submit', { n: plan.add.length }) : t('add.submitEmpty');
  $('add').disabled = !plan;
}

const listOf = (arr) =>
  arr.length > 3 ? `${arr.slice(0, 3).join(', ')} +${arr.length - 3}` : arr.join(', ');

/** Warn (never refuse) when new entries block a page ArYS relies on. */
function renderAddWarnings(toAdd) {
  const found = toAdd.length ? riskyEntries(toAdd, riskTargets()) : {};
  const box = $('add-warnings');
  box.replaceChildren(
    ...Object.entries(found)
      .filter(([, list]) => list.length)
      .map(([kind, list]) => {
        const p = document.createElement('p');
        p.textContent = `⚠ ${t(RISK_KEYS[kind], { entries: listOf(list) })}`;
        if (kind === 'extensionsPage') p.append(' ', copyLinkButton());
        return p;
      }),
  );
  box.hidden = !box.childElementCount;
}

/** Copies this page's address, so it can be bookmarked or opened even without edge://extensions. */
function copyLinkButton() {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'link-button';
  b.textContent = t('warn.copyLink');
  b.addEventListener('click', () =>
    navigator.clipboard.writeText(OPTIONS_URL).then(
      () => (b.textContent = t('warn.linkCopied')),
      () => (b.textContent = OPTIONS_URL),
    ),
  );
  return b;
}

function openAddDialog({ text = '', max = ADD_MAX, title = 'add.title' } = {}) {
  $('add-form').reset();
  $('add-title').textContent = t(title);
  $('add-input').value = text;
  $('add-locked').hidden = !locked();
  lineLimit = max;
  evaluate();
  dialog.showModal();
  $('add-input').focus();
}

$('open-add').addEventListener('click', () => openAddDialog());
$('cancel').addEventListener('click', () => dialog.close());
$('add-input').addEventListener('input', () => {
  clearTimeout(evaluateTimer);
  evaluateTimer = setTimeout(evaluate, 150);
});

$('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearTimeout(evaluateTimer);
  evaluate();
  if (!plan) return;
  $('add').disabled = true;
  const count = plan.add.length;
  try {
    await addUserRules(plan.add);
    dialog.close();
    await load();
    const n = await reblockOpenTabs(userConditions.filter(isDnrCondition));
    toast(t('toast.added', { n: count }) + (n ? ` ${t('toast.reblocked', { n })}` : ''));
  } catch (err) {
    $('summary').className = 'summary bad';
    $('summary').textContent = `✗ ${reasonText(err.message)}`;
  }
});

// ---------- settings: saving -------------------------------------------------------------------
// Saves run one after another so two quick edits never overwrite each other.
let saveQueue = Promise.resolve();
let savedTimer;
// Text typed but not saved yet (debounced); saved first by any other save, so it is never lost.
const typing = new Map();
let typingTimer;
function flushTyping() {
  clearTimeout(typingTimer);
  if (!typing.size) return;
  const patch = Object.fromEntries(typing);
  typing.clear();
  saveOrWarn(patch);
}
function save(patch) {
  flushTyping();
  const run = saveQueue.then(() => saveSettings(patch));
  saveQueue = run.catch(() => {});
  return run.then((next) => {
    settings = next;
    $('saved').hidden = false;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => ($('saved').hidden = true), 1500);
    return next;
  });
}
const saveOrWarn = (patch) => save(patch).catch(() => toast(t('toast.failed')));

$('language').addEventListener('change', async (e) => {
  await saveOrWarn({ language: e.target.value });
  ({ t, language } = await initPageI18n(settings.language));
  applyTheme(currentTheme());
  renderAll();
});

// ---------- settings: block page ---------------------------------------------------------------
function renderBlockPage() {
  $('language').value = settings.language;
  for (const r of document.querySelectorAll('input[name="block-page"]')) {
    r.checked = r.value === settings.blockPage;
  }
  setValue($('block-page-url'), settings.blockPageUrl);
  $('block-page-url').disabled = settings.blockPage !== 'url';
  $('block-custom').classList.toggle('dimmed', settings.blockPage === 'url');
  setValue($('block-title'), settings.blockTitle);
  setValue($('block-message'), settings.blockMessage);
  for (const s of document.querySelectorAll('.swatch')) {
    s.setAttribute('aria-checked', String(s.dataset.accent === settings.blockAccent));
  }
  $('image-remove').hidden = !settings.blockImage;
  renderUrlWarning();
  renderPreview();
}

/** A custom page that is itself blocked would loop: ArYS shows its own page instead, and says so. */
function renderUrlWarning(mode = settings.blockPage, url = settings.blockPageUrl) {
  $('block-page-url-blocked').hidden = !(mode === 'url' && blockPageIsBlocked(url, entries));
}

/** The preview follows what is typed, before it is saved. */
function renderPreview() {
  $('message-counter').textContent = t('settings.messageCounter', {
    n: $('block-message').value.length,
    max: MESSAGE_MAX,
  });
  $('block-preview').style.setProperty('--pv-accent', ACCENTS[settings.blockAccent]);
  $('pv-image').src = settings.blockImage || '../icons/icon-128.png';
  $('pv-image').hidden = false;
  $('pv-title').textContent = $('block-title').value.trim() || t('blockedPage.title');
  $('pv-message').textContent = $('block-message').value.trim() || t('blockedPage.default');
}

function buildSwatches() {
  $('accents').replaceChildren(
    ...Object.entries(ACCENTS).map(([name, color]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.dataset.accent = name;
      b.style.setProperty('--swatch', color);
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', name);
      b.title = name;
      b.addEventListener('click', () => saveOrWarn({ blockAccent: name }).then(renderBlockPage));
      return b;
    }),
  );
}

function onBlockPageChange() {
  const mode = document.querySelector('input[name="block-page"]:checked')?.value ?? 'default';
  const urlInput = $('block-page-url');
  urlInput.disabled = mode !== 'url';
  $('block-custom').classList.toggle('dimmed', mode === 'url');
  const url = safeRedirectUrl(urlInput.value);
  const invalid = mode === 'url' && !url;
  $('block-page-url-error').hidden = !invalid || !urlInput.value;
  renderUrlWarning(mode, url ?? '');
  if (!invalid) saveOrWarn({ blockPage: mode, blockPageUrl: url ?? settings.blockPageUrl });
}
for (const r of document.querySelectorAll('input[name="block-page"]')) {
  r.addEventListener('change', onBlockPageChange);
}
$('block-page-url').addEventListener('change', onBlockPageChange);

for (const [id, key] of [
  ['block-title', 'blockTitle'],
  ['block-message', 'blockMessage'],
]) {
  $(id).addEventListener('input', () => {
    typing.set(key, $(id).value);
    renderPreview();
    clearTimeout(typingTimer);
    typingTimer = setTimeout(flushTyping, 400);
  });
  $(id).addEventListener('change', flushTyping);
}

// Images are shrunk in the page (canvas) and stored inline: never uploaded, never a remote URL.
const IMAGE_SIDE = 480;
async function shrinkImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.85, 0.7, 0.5]) {
    const url = safeImage(canvas.toDataURL('image/webp', quality));
    if (url) return url;
  }
  return '';
}

$('image-choose').addEventListener('click', () => $('image-file').click());
$('image-file').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const url = await shrinkImage(file).catch(() => '');
  $('image-error').hidden = Boolean(url);
  if (url) saveOrWarn({ blockImage: url }).then(renderBlockPage);
});
$('image-remove').addEventListener('click', () => {
  $('image-error').hidden = true;
  saveOrWarn({ blockImage: '' }).then(renderBlockPage);
});
$('reset-block').addEventListener('click', async () => {
  $('image-error').hidden = true;
  $('block-title').value = '';
  $('block-message').value = '';
  await saveOrWarn({ blockTitle: '', blockMessage: '', blockAccent: 'teal', blockImage: '' });
  renderBlockPage();
});

// ---------- settings: Nuclear ------------------------------------------------------------------
// The form is shown only while unlocked. Once started, the lock cannot be cancelled from here
// (saveSettings refuses it too); the countdown runs only while this page is visible.
let stopTicker = null;
let nuclearState = '';

function renderNuclear(now = Date.now()) {
  const n = settings.nuclear;
  const state = isActive(n, now) ? 'active' : isScheduled(n, now) ? 'scheduled' : 'off';
  if (state !== nuclearState) {
    nuclearState = state;
    renderList(); // remove buttons follow the lock
  }
  const on = state !== 'off';
  $('nuclear-form').hidden = on;
  $('nuclear-status').hidden = !on;
  $('nuclear-chip').hidden = !on;
  if (!on) return;
  const permanent = isPermanent(n, now);
  const left = formatCountdown((state === 'active' ? n.unlockAt : n.startsAt) - now);
  const time = state === 'active' && permanent ? '∞' : left;
  $('nuclear-countdown').textContent =
    state === 'scheduled'
      ? t('nuclear.statusScheduled', { time })
      : permanent
        ? '∞'
        : t('nuclear.statusActive', { time });
  $('nuclear-until').textContent = permanent
    ? ''
    : t('nuclear.statusUntil', { date: formatDate(n.unlockAt) });
  $('nuclear-chip').textContent = t(
    state === 'active' ? 'nuclear.chipActive' : 'nuclear.chipScheduled',
    { time },
  );
}

/** Tick every second only while a lock is pending or running. */
function syncTicker() {
  if (locked()) {
    stopTicker ??= startTicker((now) => {
      renderNuclear(now);
      if (!isLocked(settings.nuclear, now)) {
        stopTicker?.();
        stopTicker = null;
      }
    });
  } else {
    stopTicker?.();
    stopTicker = null;
  }
  renderNuclear();
}

const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

for (const r of document.querySelectorAll('input[name="nuclear-start"]')) {
  r.addEventListener('change', () => {
    const at = r.value === 'at' && r.checked;
    $('nuclear-at').disabled = !at;
    if (at && !$('nuclear-at').value) {
      $('nuclear-at').value = toLocalInput(new Date(Date.now() + 3_600_000));
    }
  });
}

function nuclearPlan(now) {
  const at = document.querySelector('input[name="nuclear-start"]:checked')?.value === 'at';
  const startAt = at ? new Date($('nuclear-at').value).getTime() : null;
  const result = planNuclear(
    { amount: Number($('nuclear-amount').value), unit: $('nuclear-unit').value, startAt },
    now,
  );
  const error = $('nuclear-error');
  error.hidden = !('error' in result);
  if ('error' in result) {
    error.textContent = t(result.error === 'amount' ? 'nuclear.errorAmount' : 'nuclear.errorStart');
    return null;
  }
  return result;
}

const nuclearDialog = $('nuclear-dialog');
$('nuclear-start').addEventListener('click', () => {
  const now = Date.now();
  const p = nuclearPlan(now);
  if (!p) return;
  const forever = p.unlockAt - now >= PERMANENT_MS;
  $('nuclear-confirm-from').textContent = t('nuclear.confirmFrom', {
    time: formatDate(p.startsAt),
  });
  $('nuclear-confirm-until').textContent = t('nuclear.confirmUntil', {
    time: forever ? t('nuclear.forever') : formatDate(p.unlockAt),
  });
  nuclearDialog.showModal();
});
$('nuclear-cancel').addEventListener('click', () => nuclearDialog.close());
$('nuclear-confirm-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const p = nuclearPlan(Date.now()); // "now" means the moment of confirming
  nuclearDialog.close();
  if (!p) return;
  try {
    await save({ nuclear: { enabled: true, ...p } });
  } catch {
    toast(t('toast.failed'));
  }
  syncTicker();
});

// ---------- toast ------------------------------------------------------------------------------
let toastTimer;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3500);
}

// ---------- start ------------------------------------------------------------------------------
function renderAll() {
  $('version').textContent = `v${VERSION}`;
  $('about-version').textContent = t('about.version', { v: VERSION });
  renderBlockPage();
  renderList();
  syncTicker();
}

// Another ArYS tab (or the sync copy) changed something: follow it.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && changes.userEntries) await load();
  if ((area === 'local' && changes[SETTINGS_KEY]) || (area === 'sync' && changes['arys:nuclear'])) {
    settings = await loadSettings();
    computeRisk(); // the custom block page may have changed
    renderBlockPage();
    renderList();
    syncTicker();
  }
});

buildSwatches();
applyTheme(currentTheme());
showView('blocked');
await reconcile().catch(() => {}); // repair the list from its three copies before showing it
await load();
renderAll();
// Tabs opened before a rule existed keep showing the page until reloaded; block them now.
const reblocked = await reblockOpenTabs(userConditions.filter(isDnrCondition));
if (reblocked) toast(t('toast.reblocked', { n: reblocked }));
