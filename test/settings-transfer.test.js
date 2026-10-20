import { describe, it, expect } from 'vitest';
import { normalizeSettings, safeRedirectUrl, MESSAGE_MAX } from '../extension/lib/settings.js';
import { buildExport, parseImport, EXPORT_FORMAT } from '../extension/lib/transfer.js';

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
      blockAccent: 'teal',
      blockImage: '',
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
    expect(normalizeSettings({ blockImage: 'https://x.test/a.png' }).blockImage).toBe('');
    expect(normalizeSettings({ blockImage: 'data:image/png;base64,AAAA' }).blockImage).toBe(
      'data:image/png;base64,AAAA',
    );
    expect(normalizeSettings({ blockAccent: '#ff0000' }).blockAccent).toBe('teal');
    expect(s).not.toHaveProperty('tracking');
  });
});

describe('export / import', () => {
  it('round-trips an export', () => {
    const file = buildExport(['a.test', '*keyw'], { version: '1.0.0', now: new Date(0) });
    expect(JSON.parse(file).format).toBe(EXPORT_FORMAT);
    expect(parseImport(file)).toEqual({ entries: ['a.test', '*keyw'] });
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
