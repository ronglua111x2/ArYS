# Contributing to ArYS

Thanks for helping! ArYS is small on purpose. Please keep these principles in mind.

## Principles (non-negotiable)

1. **Nuclear means locked.** While a Nuclear lock is active, nothing may remove an entry, disable a rule or weaken the lock. Rules are changed only in `extension/lib/user-rules.js`, which checks the lock, and there are no allow rules.
2. **Lightweight.** No timers, no polling, no keep-alive. The service worker only runs for browser events.
3. **No tracking.** No network requests, no remote code, no analytics. Store only the minimum settings.
4. **Minimal permissions.** New permissions need a strong reason, and an update that adds one makes Edge disable the extension until users approve it.
5. **Never lose a user's list.** Every write goes through `commit()` in `extension/lib/user-rules.js`, which refuses to shrink the list. Storage format changes need a migration step in `migrateLocal()` plus tests with old data.

Most of this is enforced by `npm run validate` (`scripts/check-extension.mjs`) and runs in CI.

## Workflow

```bash
npm install          # enables the git hooks
npm run check        # must pass before every commit (the pre-commit hook runs it)
```

- Logic goes in `extension/lib/` with tests in `test/` (use fake domains such as `site.test`).
- New UI text: add the key to **every** file in `extension/i18n/`; `test/i18n.test.js` fails otherwise.
- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:` …).
- Open a pull request against `publish`. Describe what changed and how you tested it in Edge.

## Testing in Edge

`edge://extensions` → _Developer mode_ → **Load unpacked** → select `extension/`. After code changes, press **Reload** on the ArYS card (a browser restart does not reload an unpacked extension's service worker).

## Releasing (maintainers)

1. `npm run bump -- patch|minor|major` and update `CHANGELOG.md`.
2. Commit, tag `vX.Y.Z`, push the tag. The release workflow builds the zip and attaches it to a GitHub release.
3. Upload the zip to Partner Center (or approve the Edge publish job once it is configured).
