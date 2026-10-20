/* global chrome */
import { describe, it, expect, beforeEach } from 'vitest';
import { toUrlFilter, urlFilterToEntry } from '../extension/lib/patterns.js';
import {
  chunkEntries,
  mergeEntries,
  reconcile,
  resolveInstall,
} from '../extension/lib/user-rules.js';
import { entryToCondition } from '../extension/lib/rules.js';

describe('urlFilterToEntry', () => {
  it.each(['site.test', 'site.test/path?x=1', '*keyw', 'pre*', 'site.test/a/*/b'])(
    'round-trips %s',
    (entry) => {
      const filter = toUrlFilter(entry);
      expect(toUrlFilter(urlFilterToEntry(filter))).toBe(filter);
    },
  );
});

describe('pure helpers', () => {
  it('merges by resulting rule, first spelling wins', () => {
    expect(mergeEntries(['https://www.a.test/'], ['a.test', 'b.test'], ['*keyw'])).toEqual([
      'https://www.a.test/',
      'b.test',
      '*keyw',
    ]);
  });

  it('chunks under the storage.sync item limit', () => {
    const entries = Array.from({ length: 500 }, (_, i) => `entry-number-${i}.test`);
    const chunks = chunkEntries(entries, 1000);
    expect(chunks.flat()).toEqual(entries);
    expect(chunks.every((c) => JSON.stringify(c).length <= 1000)).toBe(true);
  });

  it('resolves the install: reinstall resets, tampering does not', () => {
    expect(resolveInstall({ fresh: true, localId: null, syncId: 'old', newId: 'new' })).toEqual({
      installId: 'new',
      trustSync: false,
    });
    expect(resolveInstall({ fresh: false, localId: null, syncId: 'old', newId: 'new' })).toEqual({
      installId: 'old',
      trustSync: true,
    });
    expect(
      resolveInstall({ fresh: false, localId: 'cur', syncId: 'x', newId: 'n' }).installId,
    ).toBe('cur');
  });
});

// ---- reconcile() against a fake browser ---------------------------------------------------------
function fakeArea() {
  const data = {};
  return {
    data,
    get: async (keys) => {
      const list = typeof keys === 'string' ? [keys] : keys;
      return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]]));
    },
    set: async (obj) => Object.assign(data, structuredClone(obj)),
  };
}

let rules;
beforeEach(() => {
  rules = [];
  globalThis.chrome = {
    storage: { local: fakeArea(), sync: fakeArea() },
    declarativeNetRequest: {
      getDynamicRules: async () => structuredClone(rules),
      updateDynamicRules: async ({ addRules }) => rules.push(...structuredClone(addRules)),
      isRegexSupported: async () => ({ isSupported: true }),
    },
  };
});

const ruleFor = (entry, id) => ({ id, condition: entryToCondition(entry).condition });

describe('reconcile', () => {
  it('restores the list after the local copy and the dynamic rules were deleted', async () => {
    chrome.storage.sync.data['arys:meta'] = { installId: 'install-1', chunks: 1 };
    chrome.storage.sync.data['arys:e0'] = ['a.test', '*keyw'];
    const entries = await reconcile();
    expect(entries).toEqual(['a.test', '*keyw']);
    expect(rules.map((r) => r.condition.urlFilter)).toEqual(['||a.test^', 'keyw']);
    expect(chrome.storage.local.data).toMatchObject({
      installId: 'install-1',
      userEntries: ['a.test', '*keyw'],
    });
  });

  it('re-adds dynamic rules and restores storage from the rules alone', async () => {
    rules = [ruleFor('a.test', 1), ruleFor('*keyw', 2)];
    const entries = await reconcile();
    expect(entries).toEqual(['a.test', '*keyw']);
    expect(chrome.storage.sync.data['arys:e0']).toEqual(['a.test', '*keyw']);
  });

  it('unions all three copies and never drops an entry', async () => {
    chrome.storage.local.data.installId = 'install-1';
    chrome.storage.local.data.userEntries = ['a.test'];
    chrome.storage.sync.data['arys:meta'] = { installId: 'install-1', chunks: 1 };
    chrome.storage.sync.data['arys:e0'] = ['b.test'];
    rules = [ruleFor('c.test', 7)];
    expect(await reconcile()).toEqual(['a.test', 'b.test', 'c.test']);
    expect(rules).toHaveLength(3);
  });

  it('a fresh install (reinstall) discards the old synced list', async () => {
    chrome.storage.sync.data['arys:meta'] = { installId: 'old-install', chunks: 1 };
    chrome.storage.sync.data['arys:e0'] = ['a.test'];
    expect(await reconcile({ fresh: true })).toEqual([]);
    expect(rules).toEqual([]);
    expect(chrome.storage.sync.data['arys:meta'].installId).not.toBe('old-install');
    expect(chrome.storage.sync.data['arys:meta'].chunks).toBe(0);
    expect(chrome.storage.sync.data['arys:e0']).toEqual([]);
  });
});

describe('update safety (ADR-013)', () => {
  it('keeps every stored spelling, even ones producing the same rule or no rule', () => {
    expect(mergeEntries(['https://www.a.test/', 'a.test', '*a'], ['a.test', 'b.test'])).toEqual([
      'https://www.a.test/',
      'a.test',
      '*a',
      'b.test',
    ]);
  });

  it('migrates the v0 format without losing anything', async () => {
    chrome.storage.local.data.userEntries = ['a.test', '*keyw'];
    chrome.storage.local.data.installId = 'install-1';
    expect(await reconcile()).toEqual(['a.test', '*keyw']);
    expect(chrome.storage.local.data.schemaVersion).toBe(1);
    expect(chrome.storage.local.data.userEntriesBackups.at(-1).entries).toEqual([
      'a.test',
      '*keyw',
    ]);
  });

  it('salvages a corrupted value and keeps the original aside', async () => {
    chrome.storage.local.data.userEntries = 'a.test\nb.test';
    expect(await reconcile()).toEqual(['a.test', 'b.test']);
    expect(chrome.storage.local.data.userEntriesCorrupt).toBe('a.test\nb.test');
  });

  it('treats an "install" event with existing data as an update, not a reset', async () => {
    chrome.storage.local.data.userEntries = ['a.test'];
    chrome.storage.sync.data['arys:meta'] = { installId: 'install-1', chunks: 1 };
    chrome.storage.sync.data['arys:e0'] = ['b.test'];
    expect(await reconcile({ fresh: true })).toEqual(['a.test', 'b.test']);
  });

  it('never rewrites data written by a newer schema, but still enforces it', async () => {
    chrome.storage.local.data.schemaVersion = 99;
    chrome.storage.local.data.userEntries = ['a.test'];
    chrome.storage.local.data.futureField = { keep: true };
    await reconcile();
    expect(chrome.storage.local.data).toEqual({
      schemaVersion: 99,
      userEntries: ['a.test'],
      futureField: { keep: true },
    });
    expect(rules.map((r) => r.condition.urlFilter)).toEqual(['||a.test^']);
  });

  it('restores from the backups if the main list was wiped', async () => {
    chrome.storage.local.data.installId = 'install-1';
    chrome.storage.local.data.schemaVersion = 1;
    chrome.storage.local.data.userEntriesBackups = [
      { at: 1, version: '0.2.0', entries: ['a.test'] },
    ];
    expect(await reconcile()).toEqual(['a.test']);
    expect(chrome.storage.local.data.userEntries).toEqual(['a.test']);
  });

  it('keeps at most 5 distinct backups', async () => {
    chrome.storage.local.data.installId = 'install-1';
    for (let i = 0; i < 8; i++) {
      chrome.storage.local.data.userEntries = [
        ...(chrome.storage.local.data.userEntries ?? []),
        `site-${i}.test`,
      ];
      await reconcile();
    }
    const backups = chrome.storage.local.data.userEntriesBackups;
    expect(backups).toHaveLength(5);
    expect(backups.at(-1).entries).toHaveLength(8);
  });
});

describe('browser-page entries', () => {
  it('are kept in storage but never turned into DNR rules', async () => {
    chrome.storage.local.data.userEntries = ['a.test', 'edge://settings/profiles'];
    expect(await reconcile()).toEqual(['a.test', 'edge://settings/profiles']);
    expect(rules.map((r) => r.condition.urlFilter)).toEqual(['||a.test^']);
    expect(chrome.storage.sync.data['arys:e0']).toEqual(['a.test', 'edge://settings/profiles']);
  });
});
