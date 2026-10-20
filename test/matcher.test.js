import { describe, it, expect } from 'vitest';
import {
  compileConditions,
  compileMatcher,
  matchesAny,
  matchUrl,
} from '../extension/lib/matcher.js';
import {
  internalFilters,
  internalPrefix,
  isBlockedInternal,
  normalizeInternal,
} from '../extension/lib/internal.js';

describe('matchesAny', () => {
  const compiled = compileConditions([
    { urlFilter: '||site.test^' },
    { urlFilter: 'keyw' },
    { regexFilter: '[?&]q=cats\\b' },
  ]);

  it.each([
    'https://site.test/',
    'http://www.site.test/a?b=c',
    'https://other.test/keyword',
    'https://search.test/results?q=cats',
  ])('matches %s', (url) => expect(matchesAny(url, compiled)).toBe(true));

  it.each(['https://site.testing/', 'https://other.test/', 'edge://settings'])(
    'does not match %s',
    (url) => expect(matchesAny(url, compiled)).toBe(false),
  );
});

describe('compileMatcher / matchUrl (worker)', () => {
  const m = compileMatcher(['site.test', '*keyw', 'edge://settings/profiles', '*a', 'two words']);

  it('blocks in-page navigations to listed web addresses', () => {
    expect(matchUrl('https://site.test/watch?v=1', m)).toBe(true);
    expect(matchUrl('https://video.test/results?search=keyword', m)).toBe(true);
    expect(matchUrl('https://video.test/results?search=other', m)).toBe(false);
  });

  it('blocks listed browser pages and their sub-pages only', () => {
    expect(matchUrl('edge://settings/profiles', m)).toBe(true);
    expect(matchUrl('chrome://settings/profiles/multiProfileSettings', m)).toBe(true);
    expect(matchUrl('edge://settings/appearance', m)).toBe(false);
    expect(matchUrl('edge://newtab/', m)).toBe(false);
  });

  it('ignores invalid entries', () => {
    expect(m.web).toHaveLength(2);
    expect(m.internal).toEqual(['edge://settings/profiles']);
  });
});

describe('internal helpers', () => {
  it('normalizes aliases and trailing slashes', () => {
    expect(normalizeInternal('CHROME://Flags/')).toBe('edge://flags/');
    expect(normalizeInternal('chrome-extension://abc/x')).toBe('extension://abc/x');
    expect(internalPrefix('edge://flags/')).toBe('edge://flags');
  });

  it('matches the page and its sub-pages, not look-alikes', () => {
    const p = ['edge://flags'];
    expect(isBlockedInternal('edge://flags/#x', p)).toBe(true);
    expect(isBlockedInternal('edge://flagsfoo', p)).toBe(false);
  });

  it('builds filters for both URL spellings', () => {
    expect(internalFilters(['edge://flags'])).toEqual([
      { urlPrefix: 'edge://flags' },
      { urlPrefix: 'chrome://flags' },
    ]);
  });
});
