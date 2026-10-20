// The user's blocklist: self-healing and update-safe. This is the ONLY file allowed to change
// dynamic rules (scripts/check-extension.mjs enforces it). Entries can be removed only through
// removeUserEntries(), and never while a Nuclear lock is active (lib/nuclear.js).
//
// Every custom entry lives in three places:
//   1. the browser's dynamic DNR rules      (what is enforced for web pages)
//   2. chrome.storage.local  userEntries    (original text, for the list)
//   3. chrome.storage.sync   arys:meta/e<n> (survives local tampering; cloud copy if Edge Sync is on)
// reconcile() merges all three and writes the union back, so deleting or editing one copy in the
// Edge profile is undone at the next session start. A removal made in the UI updates all three
// copies, so it is not undone. Uninstalling resets the list: a fresh install (onInstalled reason
// "install") gets a new installId and discards the old synced copy.
//
// Update safety (ADR-013) - an extension update must never damage the user's list:
//   - writes never shrink the stored list except for entries the user explicitly removed
//     (checked right before every write; violation = no write);
//   - the last MAX_BACKUPS distinct lists are kept in storage.local and used as a merge source;
//   - stored values that are not a list of strings are salvaged and the original kept aside;
//   - storage changes go through migrateLocal(), which only adds keys and never deletes;
//   - data written by a NEWER schema is never rewritten by older code (rules are still enforced);
//   - an "install" event while data exists is treated as an update, never as a reset.
import {
  conditionKey,
  conditionToEntry,
  entryToCondition,
  isDnrCondition,
  makeRule,
  REGEX_PREFIX,
} from './rules.js';
import { loadSettings } from './settings.js';
import { isLocked } from './nuclear.js';

export const SCHEMA_VERSION = 1;
const LOCAL_ENTRIES = 'userEntries';
const LOCAL_INSTALL_ID = 'installId';
const LOCAL_SCHEMA = 'schemaVersion';
const LOCAL_BACKUPS = 'userEntriesBackups'; // [{ at, version, entries }], oldest first
const LOCAL_CORRUPT = 'userEntriesCorrupt'; // last unreadable value of userEntries, kept as-is
const MAX_BACKUPS = 5;
const SYNC_META = 'arys:meta'; // { installId, chunks }
const SYNC_CHUNK = 'arys:e'; // arys:e0, arys:e1, ... arrays of entries
const CHUNK_BYTES = 7000; // storage.sync allows 8192 bytes per item
const LOCAL_KEYS = [LOCAL_ENTRIES, LOCAL_INSTALL_ID, LOCAL_SCHEMA, LOCAL_BACKUPS];

const toLines = (text) =>
  String(text ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Pure: validate typed input against the rules that already exist.
 * @param {string} sitesText one entry per line (site, pattern, browser page, or regex:<RE2>)
 * @param {string} [regexText] one bare regex per line (advanced)
 * @param {object[]} existingConditions conditions already enforced
 */
export function planAdditions(sitesText, regexText, existingConditions = []) {
  const known = new Set(existingConditions.map(conditionKey));
  const inputs = [...toLines(sitesText), ...toLines(regexText).map((r) => REGEX_PREFIX + r)];
  const add = [];
  const rejected = [];
  const duplicates = [];

  for (const input of inputs) {
    const result = entryToCondition(input);
    if ('error' in result) {
      rejected.push({ input, reason: result.error });
      continue;
    }
    const key = conditionKey(result.condition);
    if (known.has(key)) {
      duplicates.push(input);
      continue;
    }
    known.add(key);
    add.push({ input, condition: result.condition });
  }
  return { add, rejected, duplicates };
}

const entryKey = (entry) => {
  const result = entryToCondition(entry);
  return 'error' in result ? `raw:${entry.toLowerCase()}` : conditionKey(result.condition);
};

/**
 * Pure: union of entry lists. The first list is kept COMPLETELY (only exact duplicates dropped),
 * so the user's stored text never disappears; later lists only add entries that produce a rule
 * not already covered.
 */
export function mergeEntries(base, ...others) {
  const out = [];
  const texts = new Set();
  const keys = new Set();
  for (const raw of base ?? []) {
    const entry = String(raw ?? '').trim();
    if (!entry || texts.has(entry.toLowerCase())) continue;
    texts.add(entry.toLowerCase());
    keys.add(entryKey(entry));
    out.push(entry);
  }
  for (const list of others) {
    for (const raw of list ?? []) {
      const entry = String(raw ?? '').trim();
      if (!entry || texts.has(entry.toLowerCase())) continue;
      const key = entryKey(entry);
      if (keys.has(key)) continue;
      texts.add(entry.toLowerCase());
      keys.add(key);
      out.push(entry);
    }
  }
  return out;
}

/** Pure: split entries into storage.sync-sized chunks. */
export function chunkEntries(entries, maxBytes = CHUNK_BYTES) {
  const chunks = [];
  let current = [];
  let size = 2;
  for (const e of entries) {
    const bytes = new TextEncoder().encode(JSON.stringify(e)).length + 1;
    if (current.length && size + bytes > maxBytes) {
      chunks.push(current);
      current = [];
      size = 2;
    }
    current.push(e);
    size += bytes;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/** Pure: read whatever is stored as a list of entries without ever throwing. */
export function salvageEntries(value) {
  if (value === undefined || value === null) return { entries: [], corrupt: false };
  if (Array.isArray(value)) {
    const entries = value.filter((x) => typeof x === 'string' && x.trim());
    return { entries, corrupt: entries.length !== value.length };
  }
  if (typeof value === 'string') return { entries: toLines(value), corrupt: true };
  return { entries: [], corrupt: true };
}

/**
 * Pure: bring storage.local up to SCHEMA_VERSION. Every step may only ADD keys or fill defaults;
 * nothing is ever deleted or renamed away. Data from a newer schema is returned untouched.
 */
export function migrateLocal(local) {
  const out = { ...local };
  const from = Number.isInteger(out[LOCAL_SCHEMA]) ? out[LOCAL_SCHEMA] : 0;
  if (from > SCHEMA_VERSION) return out;
  // v0 -> v1: schemaVersion and backups introduced; userEntries and installId unchanged.
  if (from < 1 && !Array.isArray(out[LOCAL_BACKUPS])) out[LOCAL_BACKUPS] = [];
  out[LOCAL_SCHEMA] = SCHEMA_VERSION;
  return out;
}

/** Pure: keep the last MAX_BACKUPS distinct lists, oldest first. */
export function pushBackup(backups, entries, meta) {
  const list = Array.isArray(backups) ? backups.filter((b) => b && Array.isArray(b.entries)) : [];
  const last = list[list.length - 1];
  if (last && JSON.stringify(last.entries) === JSON.stringify(entries)) return list;
  return [...list, { ...meta, entries }].slice(-MAX_BACKUPS);
}

/**
 * Pure: which install the data belongs to after a session start.
 * - a real fresh install starts empty: new id, the previously synced list is discarded (the only
 *   reset). An "install" event while rules or a list already exist is treated as an update.
 * - local id missing without a reinstall (profile tampered): adopt the synced id and its entries.
 */
export function resolveInstall({ fresh, hasData, localId, syncId, newId }) {
  if (fresh && !hasData) return { installId: newId, trustSync: false };
  if (localId) return { installId: localId, trustSync: true };
  return { installId: syncId ?? newId, trustSync: true };
}

async function readSync() {
  try {
    const meta = (await chrome.storage.sync.get(SYNC_META))[SYNC_META];
    if (!meta || !Number.isInteger(meta.chunks)) return { installId: null, chunks: 0, entries: [] };
    const keys = Array.from({ length: meta.chunks }, (_, i) => SYNC_CHUNK + i);
    const data = await chrome.storage.sync.get(keys);
    return {
      installId: meta.installId ?? null,
      chunks: meta.chunks,
      entries: keys.flatMap((k) => salvageEntries(data[k]).entries),
    };
  } catch {
    return { installId: null, chunks: 0, entries: [] };
  }
}

/**
 * The single write path. Refuses to write anything that would drop a previously stored entry,
 * unless that entry is in `removed` (an explicit removal by the user). With removals, the sync
 * copy is written first and must succeed, so a stale synced copy can never bring them back.
 */
async function commit({
  installId,
  entries,
  previous,
  backups,
  syncChunks,
  extra = {},
  removed = [],
}) {
  const kept = new Set(entries.map((e) => e.toLowerCase()));
  const allowed = new Set(removed.map((e) => e.toLowerCase()));
  const dropped = previous.filter(
    (e) => !kept.has(e.toLowerCase()) && !allowed.has(e.toLowerCase()),
  );
  if (dropped.length) {
    throw new Error(
      `Refusing to drop ${dropped.length} stored entr${dropped.length === 1 ? 'y' : 'ies'}.`,
    );
  }
  const meta = { at: Date.now(), version: chrome.runtime?.getManifest?.().version ?? '' };
  if (removed.length) await writeSync(installId, entries, syncChunks, true);
  await chrome.storage.local.set({
    ...extra,
    [LOCAL_ENTRIES]: entries,
    [LOCAL_INSTALL_ID]: installId,
    [LOCAL_SCHEMA]: SCHEMA_VERSION,
    [LOCAL_BACKUPS]: pushBackup(backups, entries, meta),
  });
  if (!removed.length) await writeSync(installId, entries, syncChunks, false);
}

async function writeSync(installId, entries, previousChunks, strict) {
  const chunks = chunkEntries(entries);
  const payload = { [SYNC_META]: { installId, chunks: chunks.length } };
  chunks.forEach((c, i) => (payload[SYNC_CHUNK + i] = c));
  // Blank (never remove) chunks left over from a longer list.
  for (let i = chunks.length; i < previousChunks; i++) payload[SYNC_CHUNK + i] = [];
  try {
    await chrome.storage.sync.set(payload);
  } catch (err) {
    // Quota exceeded or sync storage unavailable: the local copies still hold everything.
    if (strict) throw new Error('sync', { cause: err });
  }
}

/** Add dynamic rules for entries that have none yet. Returns the number of rules added. */
async function enforce(entries) {
  const dnr = chrome.declarativeNetRequest;
  const existing = await dnr.getDynamicRules();
  const have = new Set(existing.map((r) => conditionKey(r.condition)));
  const missing = [];
  for (const entry of entries) {
    const result = entryToCondition(entry);
    if ('error' in result || !isDnrCondition(result.condition)) continue; // browser pages: worker
    if (have.has(conditionKey(result.condition))) continue;
    if (result.condition.regexFilter) {
      const r = await dnr.isRegexSupported({
        regex: result.condition.regexFilter,
        isCaseSensitive: false,
      });
      if (!r.isSupported) continue;
    }
    have.add(conditionKey(result.condition));
    missing.push(result.condition);
  }
  if (!missing.length) return 0;
  let nextId = existing.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  await dnr.updateDynamicRules({ addRules: missing.map((c) => makeRule(nextId++, c)) });
  return missing.length;
}

/** Everything known about the custom list right now, from every copy. */
async function readState() {
  const raw = await chrome.storage.local.get(LOCAL_KEYS);
  const storedSchema = Number.isInteger(raw[LOCAL_SCHEMA]) ? raw[LOCAL_SCHEMA] : 0;
  const local = migrateLocal(raw);
  const { entries: localEntries, corrupt } = salvageEntries(local[LOCAL_ENTRIES]);
  const backups = Array.isArray(local[LOCAL_BACKUPS]) ? local[LOCAL_BACKUPS] : [];
  const lastBackup = salvageEntries(backups[backups.length - 1]?.entries).entries;
  return {
    raw,
    local,
    localEntries,
    corrupt,
    backups,
    lastBackup,
    newerSchema: storedSchema > SCHEMA_VERSION,
    sync: await readSync(),
    rules: await chrome.declarativeNetRequest.getDynamicRules(),
  };
}

/**
 * Merge every copy and repair whichever is missing entries. Called once per session by the
 * background worker (fresh=true only for onInstalled "install") and whenever the options page
 * opens.
 * @returns {Promise<string[]>} the full custom list
 */
export async function reconcile({ fresh = false } = {}) {
  const s = await readState();
  const fromRules = s.rules.map((r) => conditionToEntry(r.condition));
  const { installId, trustSync } = resolveInstall({
    fresh,
    hasData: s.localEntries.length > 0 || s.lastBackup.length > 0 || s.rules.length > 0,
    localId: s.local[LOCAL_INSTALL_ID],
    syncId: s.sync.installId,
    newId: crypto.randomUUID(),
  });
  const entries = mergeEntries(
    s.localEntries,
    s.lastBackup,
    trustSync ? s.sync.entries : [],
    fromRules,
  );
  await enforce(entries);
  if (s.newerSchema) return entries; // written by a newer ArYS: enforce only, never rewrite
  await commit({
    installId,
    entries,
    previous: s.localEntries,
    backups: s.backups,
    syncChunks: s.sync.chunks,
    extra: s.corrupt ? { [LOCAL_CORRUPT]: s.raw[LOCAL_ENTRIES] } : {},
  });
  return entries;
}

/** Enforce planned additions permanently. Throws if the browser rejects a regex. */
export async function addUserRules(items) {
  const dnr = chrome.declarativeNetRequest;
  for (const { input, condition } of items) {
    if (!condition.regexFilter) continue;
    const r = await dnr.isRegexSupported({ regex: condition.regexFilter, isCaseSensitive: false });
    if (!r.isSupported) throw new Error(`Browser rejected regex (${r.reason}): ${input}`);
  }

  const web = items.filter((it) => isDnrCondition(it.condition)); // browser pages: worker only
  if (web.length) {
    const existing = await dnr.getDynamicRules();
    let nextId = existing.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    await dnr.updateDynamicRules({ addRules: web.map((it) => makeRule(nextId++, it.condition)) });
  }

  const s = await readState();
  if (s.newerSchema) return; // rules are enforced; a newer ArYS will pick them up from the rules
  const installId = s.local[LOCAL_INSTALL_ID] ?? s.sync.installId ?? crypto.randomUUID();
  const entries = mergeEntries(
    s.localEntries,
    s.lastBackup,
    s.sync.entries,
    items.map((it) => it.input),
  );
  await commit({
    installId,
    entries,
    previous: s.localEntries,
    backups: s.backups,
    syncChunks: s.sync.chunks,
    extra: s.corrupt ? { [LOCAL_CORRUPT]: s.raw[LOCAL_ENTRIES] } : {},
  });
}

/**
 * Remove entries from every copy. Refused while Nuclear is locked.
 * @param {string[]} toRemove entries as shown in the list
 * @returns {Promise<number>} how many entries were removed
 * @throws {Error} 'locked' | 'sync'
 */
export async function removeUserEntries(toRemove, now = Date.now()) {
  const { nuclear } = await loadSettings();
  if (isLocked(nuclear, now)) throw new Error('locked');
  const s = await readState();
  if (s.newerSchema) throw new Error('locked'); // never rewrite data from a newer ArYS
  const keys = new Set(toRemove.map((e) => entryKey(String(e).trim())));
  const current = mergeEntries(s.localEntries, s.lastBackup, s.sync.entries);
  const entries = current.filter((e) => !keys.has(entryKey(e)));
  const removed = [...current, ...s.localEntries].filter((e) => keys.has(entryKey(e)));
  if (!removed.length) return 0;
  await commit({
    installId: s.local[LOCAL_INSTALL_ID] ?? s.sync.installId ?? crypto.randomUUID(),
    entries,
    previous: s.localEntries,
    backups: s.backups,
    syncChunks: s.sync.chunks,
    removed,
  });
  const ruleIds = s.rules.filter((r) => keys.has(conditionKey(r.condition))).map((r) => r.id);
  if (ruleIds.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ruleIds });
  }
  return new Set(removed.map((e) => entryKey(e))).size;
}

export async function getUserRules() {
  return chrome.declarativeNetRequest.getDynamicRules();
}

export async function getUserEntries() {
  return salvageEntries((await chrome.storage.local.get(LOCAL_ENTRIES))[LOCAL_ENTRIES]).entries;
}
