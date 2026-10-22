// Usage: node scripts/release-notes.mjs <x.y.z>
// Prints the GitHub release text for a version: its CHANGELOG.md section plus install notes.
// Used by .github/workflows/release.yml; fails when the version has no CHANGELOG entry.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
const changelog = readFileSync(fileURLToPath(new URL('../CHANGELOG.md', import.meta.url)), 'utf8');

/** Pure: the body of the "## [version]" section, without its heading. */
export function changelogSection(text, v) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith(`## [${v}]`));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## ['));
  return lines
    .slice(start + 1, end < 0 ? undefined : end)
    .join('\n')
    .trim();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const section = changelogSection(changelog, version);
  if (!section) {
    console.error(`CHANGELOG.md has no "## [${version}]" section.`);
    process.exit(1);
  }
  console.log(`${section}

### Install

- **Microsoft Edge Add-ons:** coming soon.
- **Manually:** download \`arys-${version}.zip\` below and unzip it. Open \`edge://extensions\`, turn on _Developer mode_, choose **Load unpacked** and select the unzipped folder.

To update a manual install, replace the files in the same folder and click **Reload** on \`edge://extensions\`: your list, settings and Nuclear lock stay.
`);
}
