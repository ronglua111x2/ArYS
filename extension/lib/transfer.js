// Export / import of the user's list. Import only adds: entries go through the same preview and
// checks as typed ones, and nothing already on the list is ever replaced or removed.

export const EXPORT_FORMAT = 'arys-blocklist';
export const IMPORT_MAX = 5000;

/** Pure: the export file content. */
export function buildExport(entries, { version = '', now = new Date() } = {}) {
  return (
    JSON.stringify(
      {
        format: EXPORT_FORMAT,
        formatVersion: 1,
        app: 'ArYS',
        version,
        exportedAt: now.toISOString(),
        entries,
      },
      null,
      2,
    ) + '\n'
  );
}

export const exportFileName = (now = new Date()) =>
  `arys-blocklist-${now.toISOString().slice(0, 10)}.json`;

/**
 * Pure: read an imported file. Accepts an ArYS export, a plain JSON array of strings, or text with
 * one entry per line ("#" comments ignored).
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
        : data?.format === EXPORT_FORMAT
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
