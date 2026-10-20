import {
  addUserRules,
  getUserEntries,
  getUserRules,
  planAdditions,
  reconcile,
} from '../lib/user-rules.js';
import { describeEntries, entryKind, isDnrCondition, REGEX_PREFIX } from '../lib/rules.js';
import { reblockOpenTabs } from '../lib/matcher.js';
import { initPageI18n } from '../lib/i18n.js';
import {
  loadSettings,
  MESSAGE_MAX,
  safeRedirectUrl,
  saveSettings,
  termsAccepted,
} from '../lib/settings.js';
import { buildExport, exportFileName, IMPORT_MAX, parseImport } from '../lib/transfer.js';

const $ = (id) => document.getElementById(id);
const VERSION = chrome.runtime.getManifest().version;

// First run: the terms must be accepted before anything else (welcome/welcome.html).
if (!(await termsAccepted())) {
  location.replace('../welcome/welcome.html');
  await new Promise(() => {}); // stop here; the page is being replaced
}

let settings = await loadSettings();
let { t } = await initPageI18n(settings.language);

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

async function load() {
  const [rules, list] = await Promise.all([getUserRules(), getUserEntries()]);
  entries = list;
  described = describeEntries(entries);
  userConditions = [
    ...rules.map((r) => r.condition),
    ...described.filter((d) => d.condition && !isDnrCondition(d.condition)).map((d) => d.condition),
  ];
  renderList();
}

function renderList() {
  const term = $('search').value.trim().toLowerCase();
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
      li.append(text, kind);
      return li;
    }),
  );
  const empty = $('empty');
  empty.hidden = items.length > 0;
  empty.textContent = described.length ? t('blocked.noMatch') : t('blocked.empty');
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

  if (lines.length > lineLimit) {
    summary.className = 'summary bad';
    summary.textContent = t('add.tooMany', { n: lines.length, max: lineLimit });
  } else if (lines.length) {
    const p = planAdditions(lines.join('\n'), '', userConditions);
    plan = p.add.length ? p : null;
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
  $('add').textContent = plan ? t('add.submit', { n: plan.add.length }) : t('add.submitEmpty');
  $('add').disabled = !(plan && $('confirm').checked);
}

function openAddDialog({ text = '', max = ADD_MAX, title = 'add.title' } = {}) {
  $('add-form').reset();
  $('add-title').textContent = t(title);
  $('add-input').value = text;
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
$('confirm').addEventListener('change', evaluate);

$('add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearTimeout(evaluateTimer);
  evaluate();
  if (!plan || !$('confirm').checked) return;
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

// ---------- settings ---------------------------------------------------------------------------
let savedTimer;
function flashSaved() {
  $('saved').hidden = false;
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => ($('saved').hidden = true), 1500);
}

function renderSettings() {
  $('language').value = settings.language;
  for (const r of document.querySelectorAll('input[name="block-page"]')) {
    r.checked = r.value === settings.blockPage;
  }
  $('block-page-url').value = settings.blockPageUrl;
  $('block-page-url').disabled = settings.blockPage !== 'url';
  $('block-message').value = settings.blockMessage;
  updateCounter();
}

function updateCounter() {
  $('message-counter').textContent = t('settings.messageCounter', {
    n: $('block-message').value.length,
    max: MESSAGE_MAX,
  });
}

async function save(patch) {
  settings = await saveSettings(patch);
  flashSaved();
}

$('language').addEventListener('change', async (e) => {
  await save({ language: e.target.value });
  ({ t } = await initPageI18n(settings.language));
  applyTheme(currentTheme());
  renderAll();
});

function onBlockPageChange() {
  const mode = document.querySelector('input[name="block-page"]:checked')?.value ?? 'default';
  const urlInput = $('block-page-url');
  urlInput.disabled = mode !== 'url';
  const url = safeRedirectUrl(urlInput.value);
  const invalid = mode === 'url' && !url;
  $('block-page-url-error').hidden = !invalid || !urlInput.value;
  if (!invalid) save({ blockPage: mode, blockPageUrl: url ?? settings.blockPageUrl });
  else if (mode === 'default') save({ blockPage: 'default' });
}
for (const r of document.querySelectorAll('input[name="block-page"]')) {
  r.addEventListener('change', onBlockPageChange);
}
$('block-page-url').addEventListener('change', onBlockPageChange);

let messageTimer;
$('block-message').addEventListener('input', () => {
  updateCounter();
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => save({ blockMessage: $('block-message').value }), 400);
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
  renderSettings();
  renderList();
}

applyTheme(currentTheme());
showView('blocked');
await reconcile().catch(() => {}); // repair the list from its three copies before showing it
await load();
renderAll();
// Tabs opened before a rule existed keep showing the page until reloaded; block them now.
const reblocked = await reblockOpenTabs(userConditions.filter(isDnrCondition));
if (reblocked) toast(t('toast.reblocked', { n: reblocked }));
