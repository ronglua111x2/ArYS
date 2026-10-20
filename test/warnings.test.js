import { describe, it, expect } from 'vitest';
import { blockPageIsBlocked, extensionsPages, riskyEntries } from '../extension/lib/warnings.js';

const ID = 'abcdefghijklmnopabcdefghijklmnop';
const targets = {
  blockPageUrl: 'https://focus.test/back-to-work',
  optionsUrl: `chrome-extension://${ID}/options/options.html`,
  extensionId: ID,
};

describe('risky entries', () => {
  it('finds nothing for ordinary entries', () => {
    expect(riskyEntries(['site.test', '*distract', 'edge://settings/privacy'], targets)).toEqual({
      blockPage: [],
      extensionsPage: [],
      optionsPage: [],
    });
  });

  it('flags sites, paths, patterns and regexes that match the custom block page', () => {
    const entries = [
      'focus.test',
      'focus.test/back',
      '*work',
      'regex:^https://focus\\.test/',
      'x.test',
    ];
    expect(riskyEntries(entries, targets).blockPage).toEqual(entries.slice(0, 4));
  });

  it('ignores the block page when no custom page is in use', () => {
    expect(riskyEntries(['focus.test'], { ...targets, blockPageUrl: '' }).blockPage).toEqual([]);
  });

  it('flags the extensions page in every spelling, and the ArYS details page', () => {
    const entries = [
      'edge://extensions',
      'chrome://extensions/',
      `edge://extensions/?id=${ID}`,
      'edge://extensions/shortcuts',
    ];
    expect(riskyEntries(entries, targets).extensionsPage).toEqual(entries.slice(0, 3));
  });

  it('flags entries that block the ArYS settings page', () => {
    const entries = [`extension://${ID}`, `chrome-extension://${ID}/options`, 'extension://other'];
    expect(riskyEntries(entries, targets).optionsPage).toEqual(entries.slice(0, 2));
  });

  it('lists the extensions pages to protect', () => {
    expect(extensionsPages()).toEqual(['edge://extensions/']);
    expect(extensionsPages(ID)).toContain(`edge://extensions/?id=${ID}`);
  });
});

describe('custom block page loop guard', () => {
  it('is blocked when an entry matches it', () => {
    expect(blockPageIsBlocked(targets.blockPageUrl, ['site.test', 'focus.test'])).toBe(true);
    expect(blockPageIsBlocked(targets.blockPageUrl, ['site.test'])).toBe(false);
    expect(blockPageIsBlocked('', ['focus.test'])).toBe(false);
  });
});
