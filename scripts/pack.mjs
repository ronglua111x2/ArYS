// Build dist/arys-<version>.zip for Microsoft Edge Add-ons from extension/.
// Runs the static checks first and verifies what ends up in the zip.
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { zipSync, unzipSync, strFromU8 } from 'fflate';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'extension');
const dist = join(root, 'dist');

const check = spawnSync(process.execPath, [join(root, 'scripts', 'check-extension.mjs')], {
  stdio: 'inherit',
});
if (check.status !== 0) process.exit(check.status ?? 1);

// _metadata/ is written by the browser when a folder is loaded unpacked; the store reserves it.
const SKIP = (rel, name) =>
  rel.startsWith('_metadata/') || name.startsWith('.') || name.endsWith('.map');

/** @type {Record<string, Uint8Array>} */
const files = {};
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    const rel = relative(source, p).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (!SKIP(`${rel}/`, entry.name)) walk(p);
    } else if (!SKIP(rel, entry.name)) {
      files[rel] = readFileSync(p);
    }
  }
})(source);

const zip = zipSync(files, { level: 9 });
const packed = unzipSync(zip);
const problems = Object.keys(packed).filter((p) => /^(_metadata\/|deploy-info\.|rules\/)/.test(p));
if (!packed['manifest.json']) problems.push('manifest.json missing at the zip root');
if (problems.length) {
  console.error('Refusing to pack:\n' + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}

const manifest = JSON.parse(strFromU8(packed['manifest.json']));
mkdirSync(dist, { recursive: true });
const out = join(dist, `arys-${manifest.version}.zip`);
writeFileSync(out, zip);
console.log(`Packed ${Object.keys(files).length} files -> ${relative(root, out)}`);
