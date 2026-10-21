import { describe, it, expect } from 'vitest';
import { normalizeSettings, safeRedirectUrl, MESSAGE_MAX } from '../extension/lib/settings.js';
import { buildExport, exportFileName, parseImport } from '../extension/lib/transfer.js';

describe('settings', () => {
  it('only accepts absolute http(s) block pages', () => {
    expect(safeRedirectUrl('https://focus.test/x')).toBe('https://focus.test/x');
    expect(safeRedirectUrl('javascript:alert(1)')).toBeNull();
    expect(safeRedirectUrl('focus.test')).toBeNull();
    expect(safeRedirectUrl('file:///c:/x')).toBeNull();
  });

  it('normalizes stored values and drops unknown keys', () => {
    expect(normalizeSettings(undefined)).toEqual({
      language: 'auto',
      blockPage: 'default',
      blockPageUrl: '',
      blockTitle: '',
      blockMessage: '',
      showTitle: true,
      showMessage: true,
      nuclear: { enabled: false, startsAt: 0, unlockAt: 0 },
    });
    const s = normalizeSettings({
      language: 'xx',
      blockPage: 'url',
      blockPageUrl: 'nope',
      blockMessage: 'x'.repeat(500),
      tracking: true,
    });
    expect(s.language).toBe('auto');
    expect(s.blockPage).toBe('default'); // no valid URL -> default page
    expect(s.blockMessage).toHaveLength(MESSAGE_MAX);
    expect(s).not.toHaveProperty('tracking');
  });

  it('shows title and message unless turned off; drops settings of older versions', () => {
    const off = normalizeSettings({ showTitle: false, showMessage: false });
    expect([off.showTitle, off.showMessage]).toEqual([false, false]);
    expect(normalizeSettings({ showTitle: 'no' }).showTitle).toBe(true);
    const old = normalizeSettings({
      blockAccent: 'rose',
      blockImage: 'data:image/png;base64,AAAA',
    });
    expect(old).not.toHaveProperty('blockAccent');
    expect(old).not.toHaveProperty('blockImage');
  });
});

describe('export / import', () => {
  it('exports plain text, one entry per line, and reads it back', () => {
    const file = buildExport(['a.test', '*keyw', 'edge://settings/privacy']);
    expect(file).toBe('a.test\n*keyw\nedge://settings/privacy\n');
    expect(parseImport(file)).toEqual({ entries: ['a.test', '*keyw', 'edge://settings/privacy'] });
    expect(buildExport([])).toBe('');
    expect(exportFileName(new Date(0))).toBe('arys-blocklist-1970-01-01.txt');
  });

  it('still reads the JSON export of ArYS 0.3.0', () => {
    const legacy = JSON.stringify({ format: 'arys-blocklist', entries: ['a.test', '*keyw'] });
    expect(parseImport(legacy)).toEqual({ entries: ['a.test', '*keyw'] });
  });

  it('accepts a JSON array and plain text with comments', () => {
    expect(parseImport('["a.test", 1, " b.test "]')).toEqual({ entries: ['a.test', 'b.test'] });
    expect(parseImport('\uFEFF# my list\r\na.test\n\n*keyw\n')).toEqual({
      entries: ['a.test', '*keyw'],
    });
  });

  it('rejects empty and foreign files', () => {
    expect(parseImport('   ')).toEqual({ error: 'empty' });
    expect(parseImport('{"foo": 1}')).toEqual({ error: 'format' });
    expect(parseImport('{broken')).toEqual({ error: 'format' });
    expect(parseImport('# only comments')).toEqual({ error: 'empty' });
  });
});
