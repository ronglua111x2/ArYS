// Keep secrets, internal docs and private data out of the public repository.
//
//   node scripts/guard-git.mjs staged    pre-commit: staged files
//   node scripts/guard-git.mjs head      every file in HEAD
//   node scripts/guard-git.mjs pre-push  reads git's pre-push stdin and checks EVERY commit about
//                                        to be pushed (history too, not just the tip)
//
// Checks, for each file:
//   - only PUBLIC paths are allowed (no internal docs, no local tooling);
//   - secret paths (.env) and secret contents: token patterns and any value from .env (never printed);
//   - when run on the maintainer's machine, contents containing an entry of the maintainer's private
//     blocklist (read from the main worktree; absent in CI).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const FORBIDDEN_PATHS = [
  /(^|\/)\.env(?!\.example$)(\..+)?$/, // secrets (.env.example is allowed)
  /^stayfocusd-export\//,
  /^\.private\//,
  /^src\//,
  /^extension\/rules\//,
];

// What the public repository may contain.
const PUBLIC_PATHS = [
  /^extension\//,
  /^test\//,
  /^scripts\//,
  /^\.github\//,
  /^\.githooks\//,
  /^store\//, // store listing assets (screenshots, promo tiles)
  /^(README|LICENSE|PRIVACY|CONTRIBUTING|SECURITY|CHANGELOG|CODE_OF_CONDUCT)(\.md)?$/,
  /^(package\.json|package-lock\.json|eslint\.config\.js|vitest\.config\.js)$/,
  /^\.(gitignore|gitattributes|editorconfig|prettierrc\.json|prettierignore|env\.example)$/,
];
const PUBLIC_BRANCH = 'publish';

const SECRET_PATTERNS = [
  [/github_pat_[A-Za-z0-9_]{20,}/, 'GitHub fine-grained token'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
];

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const lines = (s) => s.split(/\r?\n/).filter(Boolean);

// This checkout may be a worktree of the maintainer's private repository, whose main worktree holds
// the private list and .env. They are read from there when present (never in CI).
function mainWorktree() {
  try {
    return dirname(git('rev-parse', '--path-format=absolute', '--git-common-dir').trim());
  } catch {
    return '.';
  }
}
const MAIN = mainWorktree();

function privateEntries() {
  const out = [];
  const history = join(MAIN, '.private', 'blocklist-history.json');
  if (existsSync(history)) {
    try {
      out.push(...(JSON.parse(readFileSync(history, 'utf8')).entries ?? []));
    } catch {
      // unreadable history: the export below still covers it
    }
  }
  const exportDir = join(MAIN, 'stayfocusd-export');
  if (existsSync(exportDir)) {
    for (const f of readdirSync(exportDir).filter((n) => n.endsWith('.txt'))) {
      out.push(...lines(readFileSync(join(exportDir, f), 'utf8')).map((l) => l.trim()));
    }
  }
  return out.filter((e) => e && !e.startsWith('#'));
}

/** Every value in .env (KEY=VALUE, 8+ chars) is a secret that must not appear in any file. */
function envValues() {
  return [...new Set(['.env', join(MAIN, '.env')])]
    .filter((f) => existsSync(f))
    .flatMap((f) => lines(readFileSync(f, 'utf8')))
    .map((l) =>
      l
        .replace(/^[^=#]*=/, '')
        .trim()
        .replace(/^['"]|['"]$/g, ''),
    )
    .filter((v) => v.length >= 8);
}

/**
 * Blocklist entries as searchable needles. Short or wildcard-containing pieces are skipped to avoid
 * false positives on ordinary words; everything else must appear as a whole token. Browser pages
 * (edge://extensions) are not private and would match common words, so they are skipped.
 */
function needles(entries) {
  const out = new Set();
  for (const e of entries) {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(e) && !/^https?:\/\//i.test(e)) continue;
    if (/^regex:/i.test(e)) continue;
    const n = e
      .toLowerCase()
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^[a-z*]+:\/\//, '')
      .replace(/^\*+/, '')
      .replace(/\*+$/, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
    if (n.length >= 6 && !n.includes('*')) out.add(n);
  }
  return [...out].map((n) => ({
    n,
    re: new RegExp(`(?<![a-z0-9-])${n.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![a-z0-9-])`, 'i'),
  }));
}

const secrets = envValues();
const known = needles(privateEntries());
const problems = [];

function checkFile(where, path, read, pub) {
  if (FORBIDDEN_PATHS.some((re) => re.test(path))) {
    problems.push(`${where}${path}: secret/private path must not be in git`);
    return;
  }
  if (pub && !PUBLIC_PATHS.some((re) => re.test(path))) {
    problems.push(`${where}${path}: not a public file (internal docs stay out of the public repo)`);
  }
  let text;
  try {
    text = read();
  } catch {
    return;
  }
  if (text.includes('\0')) return; // binary
  for (const [re, label] of SECRET_PATTERNS) {
    if (re.test(text)) problems.push(`${where}${path}: contains a ${label}`);
  }
  if (secrets.some((s) => text.includes(s))) {
    problems.push(`${where}${path}: contains a value from .env`);
  }
  const hit = known.find(({ re }) => re.test(text));
  if (hit) problems.push(`${where}${path}: contains a private blocklist entry`);
}

const currentBranch = () => {
  try {
    return git('symbolic-ref', '--short', 'HEAD').trim();
  } catch {
    return '';
  }
};

const mode = process.argv[2];
if (mode === 'staged') {
  const pub = process.env.ARYS_PUBLIC === '1' || currentBranch() === PUBLIC_BRANCH;
  for (const f of lines(git('diff', '--cached', '--name-only', '--diff-filter=ACMR'))) {
    checkFile('', f, () => git('show', `:${f}`), pub);
  }
} else if (mode === 'head') {
  try {
    git('rev-parse', '--verify', 'HEAD');
  } catch {
    process.exit(0); // no commits yet
  }
  const pub = process.env.ARYS_PUBLIC === '1' || currentBranch() === PUBLIC_BRANCH;
  for (const f of lines(git('ls-tree', '-r', '--name-only', 'HEAD'))) {
    checkFile('', f, () => git('show', `HEAD:${f}`), pub);
  }
} else if (mode === 'pre-push') {
  // stdin: "<local ref> <local sha> <remote ref> <remote sha>" per ref being pushed.
  const ZERO = /^0+$/;
  for (const line of lines(readFileSync(0, 'utf8'))) {
    const [, localSha, remoteRef, remoteSha] = line.split(' ');
    if (ZERO.test(localSha)) continue; // deleting a remote ref
    if (!/^refs\/(heads\/publish|tags\/v)/.test(remoteRef)) {
      problems.push(`${remoteRef}: only the "publish" branch and v* tags may be pushed`);
      continue;
    }
    const range = ZERO.test(remoteSha) ? [localSha] : [`${remoteSha}..${localSha}`];
    for (const commit of lines(git('rev-list', ...range))) {
      const changed = git(
        'diff-tree',
        '--no-commit-id',
        '--name-only',
        '-r',
        '--root',
        '--diff-filter=ACMR',
        commit,
      );
      for (const f of lines(changed)) {
        checkFile(`[${commit.slice(0, 8)}] `, f, () => git('show', `${commit}:${f}`), true);
      }
    }
  }
} else {
  console.error('Usage: node scripts/guard-git.mjs staged|head|pre-push');
  process.exit(2);
}

if (problems.length) {
  console.error(
    'Git guard FAILED:\n' +
      [...new Set(problems)].map((p) => `  - ${p}`).join('\n') +
      '\nFix the file, or rewrite the commit that introduced it (never push it).',
  );
  process.exit(1);
}
