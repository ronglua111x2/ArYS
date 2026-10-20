import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DICTIONARIES, resolveLanguage, translator } from '../extension/lib/i18n.js';

const keysOf = (o) => Object.keys(o).sort();
const placeholders = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

describe('translations', () => {
  const en = DICTIONARIES.en;

  it.each(Object.keys(DICTIONARIES))('%s has exactly the English keys', (lang) => {
    expect(keysOf(DICTIONARIES[lang])).toEqual(keysOf(en));
  });

  it.each(Object.keys(DICTIONARIES))('%s keeps the same {placeholders}', (lang) => {
    for (const key of Object.keys(en)) {
      expect(placeholders(DICTIONARIES[lang][key]), key).toBe(placeholders(en[key]));
    }
  });

  it('every data-i18n key used in the HTML exists', () => {
    const root = join(import.meta.dirname, '..', 'extension');
    const html = [];
    (function walk(dir) {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.html')) html.push(readFileSync(p, 'utf8'));
      }
    })(root);
    const used = [...html.join('\n').matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(used.length).toBeGreaterThan(20);
    for (const key of used) expect(en, key).toHaveProperty([key]);
  });

  it('resolves the language and substitutes values', () => {
    expect(resolveLanguage('auto', 'vi-VN')).toBe('vi');
    expect(resolveLanguage('auto', 'fr')).toBe('en');
    expect(resolveLanguage('en', 'vi')).toBe('en');
    expect(translator('vi')('blocked.count', { n: 3 })).toBe('3 mục');
    expect(translator('en')('missing.key')).toBe('missing.key');
  });
});
