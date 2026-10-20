import { describe, it, expect } from 'vitest';
import { sanitizeEntry, toUrlFilter } from '../extension/lib/patterns.js';

describe('sanitizeEntry', () => {
  it('repairs markdown-link damage', () => {
    expect(sanitizeEntry('*://[x.test/](https://x.test/)*')).toBe('*://x.test/*');
    expect(sanitizeEntry('*://*[.x.test/](https://.x.test/)*')).toBe('*://*.x.test/*');
  });
});

describe('toUrlFilter', () => {
  it.each([
    ['site.test', '||site.test^'],
    ['WWW.Site.test', '||site.test^'],
    ['localhost:3000', '||localhost:3000^'],
    ['*keyword', 'keyword'],
    ['*.site.test', '.site.test'],
    ['https://site.test/a/b', '||site.test/a/b'],
    ['*://site.test/*', '||site.test^'],
    ['site.test/', '||site.test^'],
    ['pre*', '||pre'],
    ['site.test/browse*', '||site.test/browse'],
    ['site.test/page.php?type=x', '||site.test/page.php?type=x'],
    ['site.test/*/download', '||site.test/*/download'],
    ['*://[x.test/](https://x.test/)*', '||x.test^'],
    ['café.test', '||xn--caf-dma.test^'],
    ['site.test/a-–-b', '||site.test/a-%e2%80%93-b'],
  ])('%s -> %s', (entry, expected) => {
    expect(toUrlFilter(entry)).toBe(expected);
  });

  it.each([
    '',
    '   ',
    '# comment',
    'edge://extensions',
    'chrome://settings',
    'extension://abc/options.html',
    'a|b',
    'a^b',
    '*',
    '*café',
    'two words',
  ])('returns null for %j', (entry) => {
    expect(toUrlFilter(entry)).toBeNull();
  });
});
