<p align="center">
  <img src="extension/icons/icon-128.png" width="96" height="96" alt="ArYS logo" />
</p>

<h1 align="center">ArYS</h1>

<p align="center"><em>Are you sure?</em></p>

<p align="center">
  A lightweight website blocker for Microsoft Edge, with a Nuclear lock.<br />
  No tracking. No accounts. No network requests.
</p>

<p align="center">
  <a href="https://github.com/ronglua111x2/ArYS/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/ronglua111x2/ArYS/actions/workflows/ci.yml/badge.svg?branch=publish" /></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
</p>

---

## Features

- **Block sites, pages and keywords** – `site.com`, `site.com/path`, `*word`, or browser pages like `edge://settings`.
- **Nuclear option** – lock removing entries for as long as you choose, from minutes to forever, starting now or at a set time. Once started it cannot be cancelled, so a weak moment can't undo your decision.
- **Self-healing list** – your list is kept in three places in your browser and repairs itself if one copy is lost.
- **Blocks in-page navigation too** – e.g. searching inside a single-page app, not only full page loads.
- **Custom block page** – your own title and message (or just the logo), or a page of your choice.
- **Import / export** – your list as a plain text file, one entry per line.
- **English and Vietnamese**, light and dark theme.

## Privacy

ArYS collects nothing and makes no network requests. Your list and settings stay in your browser's extension storage (and your browser's own sync storage, if you turned sync on). See [PRIVACY.md](PRIVACY.md).

## Permissions

| Permission              | Why                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `declarativeNetRequest` | Let the browser block the addresses on your list.                                                     |
| `storage`               | Keep your list and settings on your device.                                                           |
| `webNavigation`         | Catch in-page address changes and browser pages, which the blocking engine cannot see.                |
| Access to all sites     | Needed for the browser to redirect a blocked page to ArYS' block page. ArYS never reads page content. |

## Install

- **Microsoft Edge Add-ons:** coming soon.
- **From source:** `npm install`, then open `edge://extensions`, turn on _Developer mode_, choose **Load unpacked** and select the `extension/` folder.

## Development

```bash
npm install        # also enables the git hooks in .githooks/
npm run check      # lint + format check + tests + extension guardrails
npm run pack       # dist/arys-<version>.zip for the store
```

Project layout:

```
extension/          the extension itself (Manifest V3, plain ES modules, no build step)
  background.js     event-only service worker (no timers, no polling)
  lib/              logic, unit-tested in test/
  i18n/             UI strings (en, vi);  _locales/ holds the store name/description
  options/ welcome/ blocked/ legal/ ui/   pages and shared styles
scripts/            guardrails (check-extension, guard-git), packaging, versioning
test/               vitest
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the rules every change must follow.

## License

[MIT](LICENSE)
