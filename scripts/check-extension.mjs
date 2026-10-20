// Static guardrails for extension/. Run via `npm run validate` (part of `npm run check` and CI).
// Enforces mechanically:
//   - no tracking: no network APIs, no remote or dynamic code, minimal permissions;
//   - add-only list: no code path that removes or weakens blocking rules;
//   - lightweight: one event-driven worker, no timers, no polling, no keep-alive;
//   - store hygiene: locales complete, name "ArYS", manifest files present, nothing dev-only.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'extension');
const errors = [];
const fail = (msg) => errors.push(msg);
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const manifest = readJson(join(src, 'manifest.json'));
const pkg = readJson(join(root, 'package.json'));

// Permissions the project has agreed to; each one is justified in the store listing.
const ALLOWED_PERMISSIONS = ['declarativeNetRequest', 'storage', 'webNavigation'];
const ALLOWED_HOST_PERMISSIONS = ['<all_urls>']; // DNR redirect needs host access to any site
// Never: tabs, history, cookies, webRequest, management, identity, nativeMessaging, scripting,
// declarativeNetRequestFeedback, downloads, clipboardRead, geolocation, ...

// --- manifest ------------------------------------------------------------------------------------
if (manifest.manifest_version !== 3) fail('manifest_version must be 3.');
if (!/^\d+(\.\d+){0,3}$/.test(manifest.version ?? '')) fail('manifest version must be N.N.N.');
if (manifest.version !== pkg.version) {
  fail(`Version mismatch: manifest ${manifest.version}, package.json ${pkg.version}.`);
}
for (const p of [...(manifest.permissions ?? []), ...(manifest.optional_permissions ?? [])]) {
  if (!ALLOWED_PERMISSIONS.includes(p)) fail(`Permission "${p}" is not on the allowlist.`);
}
for (const p of manifest.host_permissions ?? []) {
  if (!ALLOWED_HOST_PERMISSIONS.includes(p)) fail(`Host permission "${p}" is not allowed.`);
}
if (manifest.content_scripts?.length) fail('No content scripts: ArYS never reads page content.');
if (manifest.externally_connectable) fail('externally_connectable is not allowed.');
if (manifest.update_url) fail('Remove update_url: store builds must not carry it.');
if (manifest.key) fail('Remove "key": the store assigns the extension ID.');
if (manifest.content_security_policy) fail('Keep the default MV3 content security policy.');
for (const r of manifest.declarative_net_request?.rule_resources ?? []) {
  if (r.enabled !== true) fail(`Ruleset "${r.id}" must be enabled.`);
}
if (
  manifest.background &&
  (manifest.background.service_worker !== 'background.js' || manifest.background.scripts)
) {
  fail('Only extension/background.js may run in the background.');
}

// --- locales ---------------------------------------------------------------------------------------
const localesDir = join(src, '_locales');
const defaultLocale = manifest.default_locale;
if (!defaultLocale || !existsSync(join(localesDir, defaultLocale, 'messages.json'))) {
  fail('default_locale must point to an existing _locales/<lang>/messages.json.');
} else {
  const locales = readdirSync(localesDir);
  const base = readJson(join(localesDir, defaultLocale, 'messages.json'));
  for (const lang of locales) {
    const msgs = readJson(join(localesDir, lang, 'messages.json'));
    for (const key of Object.keys(base)) {
      if (!msgs[key]?.message) fail(`_locales/${lang}: missing "${key}".`);
    }
    if (msgs.extName?.message !== 'ArYS') fail(`_locales/${lang}: extName must be "ArYS".`);
    const desc = msgs.extDescription?.message ?? '';
    if (desc.length > 132) fail(`_locales/${lang}: extDescription is over 132 characters.`);
    if (/chrome/i.test(desc)) fail(`_locales/${lang}: do not mention "Chrome" (store rule).`);
  }
  for (const field of ['name', 'description']) {
    const v = manifest[field] ?? '';
    const m = /^__MSG_(\w+)__$/.exec(v);
    if (!m || !base[m[1]]) fail(`manifest ${field} must be a __MSG_…__ key present in _locales.`);
  }
}

// --- files referenced by the manifest exist --------------------------------------------------------
const referenced = [
  manifest.background?.service_worker,
  manifest.options_ui?.page,
  manifest.action?.default_popup,
  ...Object.values(manifest.icons ?? {}),
  ...(manifest.web_accessible_resources ?? []).flatMap((w) => w.resources),
  ...(manifest.declarative_net_request?.rule_resources ?? []).map((r) => r.path),
].filter(Boolean);
for (const f of referenced) {
  if (!existsSync(join(src, f))) fail(`Manifest references missing file: ${f}`);
}

// --- background worker: event-driven only -----------------------------------------------------------
const bgPath = join(src, 'background.js');
if (existsSync(bgPath)) {
  const bg = readFileSync(bgPath, 'utf8');
  const BG_FORBIDDEN = [
    [/\bset(Timeout|Interval)\s*\(/, 'timers'],
    [/chrome\.alarms/, 'alarms'],
    [/getPlatformInfo|runtime\.connect\b|onConnect/, 'keep-alive tricks'],
    [/chrome\.tabs\.query/, 'tab scanning in the worker (use lib/matcher.js on session start)'],
  ];
  for (const [re, label] of BG_FORBIDDEN) {
    if (re.test(bg)) fail(`background.js: forbidden ${label}.`);
  }
  for (const m of bg.matchAll(/webNavigation\.(\w+)\.addListener\(([^)]*)\)/g)) {
    if (!/,\s*\w+/.test(m[2])) fail(`background.js: ${m[1]} listener needs a URL filter.`);
  }
}

// --- source scan ---------------------------------------------------------------------------------------
const FORBIDDEN_CODE = [
  [/\bfetch\s*\(/, 'fetch() - ArYS makes no network requests'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest - ArYS makes no network requests'],
  [/\bWebSocket\b/, 'WebSocket - ArYS makes no network requests'],
  [/\bEventSource\b/, 'EventSource - ArYS makes no network requests'],
  [/sendBeacon/, 'navigator.sendBeacon - ArYS makes no network requests'],
  [/\beval\s*\(/, 'eval()'],
  [/new\s+Function\s*\(/, 'new Function()'],
  [/importScripts\s*\(/, 'importScripts()'],
  [/\bimport\s*\(\s*['"`]https?:/, 'remote import()'],
  [/removeRuleIds|removeRuleFilter/, 'rule removal - the list is add-only'],
  [/updateSessionRules|updateEnabledRulesets|updateStaticRules/, 'disabling or bypassing rules'],
  [/['"`](allow|allowAllRequests|upgradeScheme|modifyHeaders)['"`]/, 'non-block rule action'],
  [/storage\.\w+\.(remove|clear)\s*\(/, 'storage remove/clear - lists only grow'],
  [/chrome\.management/, 'chrome.management'],
  [/\bsetInterval\s*\(/, 'setInterval - keep ArYS idle'],
  [/deploy-info/, 'dev-only deploy code'],
];
const FORBIDDEN_HTML = [
  [/<script[^>]+src\s*=\s*["']https?:/i, 'remote <script>'],
  [/<link[^>]+href\s*=\s*["']https?:/i, 'remote <link>'],
  [/<script(?![^>]*\bsrc=)[^>]*>\s*\S/i, 'inline <script> (blocked by MV3 CSP)'],
];
const DYNAMIC_RULES_FILE = 'extension/lib/user-rules.js'; // the only file that may add DNR rules

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '_metadata') yield* walk(p);
    } else yield p;
  }
}

for (const file of walk(src)) {
  const rel = relative(root, file).replaceAll('\\', '/');
  if (file.endsWith('.js')) {
    const text = readFileSync(file, 'utf8');
    for (const [re, label] of FORBIDDEN_CODE) {
      if (re.test(text)) fail(`${rel}: forbidden ${label}.`);
    }
    if (/updateDynamicRules/.test(text) && rel !== DYNAMIC_RULES_FILE) {
      fail(`${rel}: updateDynamicRules is only allowed in ${DYNAMIC_RULES_FILE}.`);
    }
  } else if (file.endsWith('.html')) {
    const text = readFileSync(file, 'utf8');
    for (const [re, label] of FORBIDDEN_HTML) {
      if (re.test(text)) fail(`${rel}: forbidden ${label}.`);
    }
  }
}

if (errors.length) {
  console.error('Extension check FAILED:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`Extension check OK (ArYS v${manifest.version}).`);
