# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.0] - 2026-10-20

First public version.

### Added

- Blocklist: sites, URL prefixes, `*keyword` patterns and browser pages (`edge://…`); entries can be removed unless Nuclear is on.
- Nuclear option: a lock on removing entries, now or scheduled, for any duration; it cannot be cancelled or shortened.
- Self-healing list kept in three places (blocking rules, local storage, sync storage).
- Blocking of in-page (single-page app) address changes and of browser pages.
- Options page with sidebar: Blocked sites, Settings, About.
- Import and export of the list.
- Custom block page: title, message, accent colour and image, or your own address.
- Warnings (never refusals) when an entry would block the custom block page (ArYS then shows its own page, so there is no loop), Edge's extensions page or the ArYS settings page.
- Welcome page with terms of use and privacy policy on first install.
- English and Vietnamese; light, dark and system themes.
