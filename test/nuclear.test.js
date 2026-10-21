/* global chrome */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatCountdown,
  isActive,
  isLocked,
  isPermanent,
  isScheduled,
  MAX_TS,
  normalizeNuclear,
  nuclearChangeProblem,
  planNuclear,
} from '../extension/lib/nuclear.js';
import { loadSettings, saveSettings, stricterNuclear } from '../extension/lib/settings.js';
import { addUserRules, planAdditions, removeUserEntries } from '../extension/lib/user-rules.js';

const NOW = 1_800_000_000_000;
const H = 3_600_000;

describe('planNuclear', () => {
  it('starts now or at a scheduled time', () => {
    expect(planNuclear({ amount: 2, unit: 'hours' }, NOW)).toEqual({
      startsAt: NOW,
      unlockAt: NOW + 2 * H,
    });
    expect(planNuclear({ amount: 1, unit: 'days', startAt: NOW + H }, NOW)).toEqual({
      startsAt: NOW + H,
      unlockAt: NOW + H + 24 * H,
    });
  });

  it('has no upper limit: huge durations are clamped to the largest valid date', () => {
    expect(planNuclear({ amount: 1e12, unit: 'days' }, NOW).unlockAt).toBe(MAX_TS);
    expect(planNuclear({ amount: 100000, unit: 'days' }, NOW).unlockAt).toBe(NOW + 100000 * 24 * H);
  });

  it.each([
    [{ amount: 0, unit: 'hours' }, 'amount'],
    [{ amount: -1, unit: 'hours' }, 'amount'],
    [{ amount: Number.NaN, unit: 'hours' }, 'amount'],
    [{ amount: Infinity, unit: 'hours' }, 'amount'],
    [{ amount: 1, unit: 'weeks' }, 'amount'],
    [{ amount: 1, unit: 'hours', startAt: NOW - 2 * H }, 'start'],
  ])('rejects %j', (form, error) => {
    expect(planNuclear(form, NOW)).toEqual({ error });
  });
});

describe('lock state', () => {
  const scheduled = { enabled: true, startsAt: NOW + H, unlockAt: NOW + 3 * H };

  it('is locked from scheduling until unlock, active only after the start', () => {
    expect(isLocked(scheduled, NOW)).toBe(true);
    expect(isScheduled(scheduled, NOW)).toBe(true);
    expect(isActive(scheduled, NOW)).toBe(false);
    expect(isActive(scheduled, NOW + 2 * H)).toBe(true);
    expect(isLocked(scheduled, NOW + 3 * H)).toBe(false);
  });

  it('only lets a lock get stricter', () => {
    const prev = scheduled;
    expect(nuclearChangeProblem(prev, { ...prev, enabled: false }, NOW)).toBe('locked-disable');
    expect(nuclearChangeProblem(prev, { ...prev, unlockAt: NOW + 2 * H }, NOW)).toBe(
      'locked-shorten',
    );
    expect(nuclearChangeProblem(prev, { ...prev, startsAt: NOW + 2 * H }, NOW)).toBe(
      'locked-postpone',
    );
    expect(nuclearChangeProblem(prev, { ...prev, unlockAt: NOW + 9 * H }, NOW)).toBeNull();
    expect(
      nuclearChangeProblem(prev, { enabled: false, startsAt: 0, unlockAt: 0 }, NOW + 4 * H),
    ).toBeNull();
  });

  it('shows very long locks as permanent', () => {
    const forever = { enabled: true, startsAt: NOW, unlockAt: MAX_TS };
    expect(isPermanent(forever, NOW)).toBe(true);
    expect(formatCountdown(MAX_TS - NOW)).toBe('∞');
    expect(formatCountdown(2 * 86_400_000 + 3 * H + 4 * 60_000 + 5_000)).toBe('2d 03:04:05');
    expect(formatCountdown(59_000)).toBe('00:00:59');
  });

  it('normalizes broken data instead of storing NaN (the 3.6e55 lesson)', () => {
    expect(normalizeNuclear({ enabled: true, startsAt: NOW, unlockAt: 3.6e55 }).unlockAt).toBe(
      MAX_TS,
    );
    expect(normalizeNuclear({ enabled: true, unlockAt: 'x' })).toEqual({
      enabled: false,
      startsAt: 0,
      unlockAt: 0,
    });
  });

  it('keeps the stricter of the local and synced copies', () => {
    const a = { enabled: true, startsAt: NOW, unlockAt: NOW + H };
    const b = { enabled: true, startsAt: NOW - H, unlockAt: NOW + 5 * H };
    expect(stricterNuclear(a, b)).toEqual({
      enabled: true,
      startsAt: NOW - H,
      unlockAt: NOW + 5 * H,
    });
    expect(stricterNuclear(undefined, a)).toEqual(a);
  });
});

// ---- settings + removal against a fake browser ---------------------------------------------------
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
      updateDynamicRules: async ({ addRules = [], removeRuleIds = [] }) => {
        rules = rules.filter((r) => !removeRuleIds.includes(r.id));
        rules.push(...structuredClone(addRules));
      },
      isRegexSupported: async () => ({ isSupported: true }),
    },
  };
});

async function add(text) {
  await addUserRules(planAdditions(text, '', []).add);
}

describe('saveSettings with Nuclear', () => {
  it('refuses to weaken an active lock, even if the local copy was wiped', async () => {
    const lock = { enabled: true, startsAt: Date.now(), unlockAt: Date.now() + H };
    await saveSettings({ nuclear: lock });
    await expect(saveSettings({ nuclear: { enabled: false } })).rejects.toThrow('locked-disable');
    delete chrome.storage.local.data.settings; // tampering with the profile
    expect((await loadSettings()).nuclear).toEqual(lock); // the synced copy still holds it
  });

  it('still allows customising the block page while locked', async () => {
    await saveSettings({
      nuclear: { enabled: true, startsAt: Date.now(), unlockAt: Date.now() + H },
    });
    await saveSettings({ blockMessage: 'Back to work', showTitle: false });
    const s = await loadSettings();
    expect([s.blockMessage, s.showTitle]).toEqual(['Back to work', false]);
  });
});

describe('removeUserEntries', () => {
  it('removes from every copy, so self-healing does not bring it back', async () => {
    await add('a.test\nb.test');
    expect(await removeUserEntries(['a.test'])).toBe(1);
    expect(chrome.storage.local.data.userEntries).toEqual(['b.test']);
    expect(chrome.storage.sync.data['arys:e0']).toEqual(['b.test']);
    expect(rules.map((r) => r.condition.urlFilter)).toEqual(['||b.test^']);
    const { reconcile } = await import('../extension/lib/user-rules.js');
    expect(await reconcile()).toEqual(['b.test']);
  });

  it('is refused while Nuclear is locked (scheduled or active)', async () => {
    await add('a.test');
    await saveSettings({
      nuclear: { enabled: true, startsAt: Date.now() + H, unlockAt: Date.now() + 2 * H },
    });
    await expect(removeUserEntries(['a.test'])).rejects.toThrow('locked');
    expect(chrome.storage.local.data.userEntries).toEqual(['a.test']);
    expect(rules).toHaveLength(1);
  });

  it('removes equivalent spellings and browser pages', async () => {
    await add('www.a.test\nedge://flags');
    expect(await removeUserEntries(['a.test', 'edge://flags/'])).toBe(2);
    expect(chrome.storage.local.data.userEntries).toEqual([]);
    expect(rules).toEqual([]);
  });
});
