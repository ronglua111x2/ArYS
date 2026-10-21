// Export / import of the user's list. Import only adds: entries go through the same preview and
// checks as typed ones, and nothing already on the list is ever replaced or removed.

/** Format of the JSON export written by ArYS 0.3.0; still accepted on import. */
const LEGACY_FORMAT = 'arys-blocklist';
export const IMPORT_MAX = 5000;

/** Pure: the export file content - a plain text file, one entry per line. */
export const buildExport = (entries) => (entries.length ? `${entries.join('\n')}\n` : '');

export const exportFileName = (now = new Date()) =>
  `arys-blocklist-${now.toISOString().slice(0, 10)}.txt`;

/**
 * Pure: read an imported file: text with one entry per line ("#" comments ignored). A JSON array
 * of strings or an ArYS 0.3.0 JSON export is accepted too.
 * @returns {{ entries: string[] } | { error: 'empty' | 'format' }}
 */
export function parseImport(text) {
  const body = String(text ?? '')
    .replace(new RegExp(`^${String.fromCharCode(0xfeff)}`), '') // byte-order mark from some editors
    .trim();
  if (!body) return { error: 'empty' };
  if (body.startsWith('{') || body.startsWith('[')) {
    try {
      const data = JSON.parse(body);
      const list = Array.isArray(data)
        ? data
        : data?.format === LEGACY_FORMAT
          ? data.entries
          : null;
      if (!Array.isArray(list)) return { error: 'format' };
      const entries = list.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
      return entries.length ? { entries } : { error: 'empty' };
    } catch {
      return { error: 'format' };
    }
  }
  const entries = body
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'));
  return entries.length ? { entries } : { error: 'empty' };
}
