// Usage: npm run bump -- patch|minor|major|<x.y.z>
// Updates extension/manifest.json and package.json together (they must always match).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const manifestPath = fileURLToPath(new URL('../extension/manifest.json', import.meta.url));
const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: npm run bump -- patch|minor|major|<x.y.z>');
  process.exit(1);
}

let next;
if (/^\d+\.\d+\.\d+$/.test(arg)) {
  next = arg;
} else {
  const [maj, min, pat] = manifest.version.split('.').map(Number);
  if (arg === 'major') next = `${maj + 1}.0.0`;
  else if (arg === 'minor') next = `${maj}.${min + 1}.0`;
  else if (arg === 'patch') next = `${maj}.${min}.${pat + 1}`;
  else {
    console.error(`Unknown bump "${arg}".`);
    process.exit(1);
  }
}

manifest.version = next;
pkg.version = next;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(
  `Version -> ${next}\nNext:\n  git commit -am "chore: release v${next}"\n  git tag v${next}`,
);
