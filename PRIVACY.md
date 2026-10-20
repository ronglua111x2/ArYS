# ArYS – Privacy Policy

_Last updated: 2026-10-20_

ArYS is a website blocker for Microsoft Edge. In short: **it collects nothing and sends nothing anywhere.**

## What ArYS collects

Nothing. ArYS does not collect, record, transmit, sell or share personal information, browsing history, page content, visited addresses, identifiers or usage statistics. It has no accounts, no analytics and no advertising, and it makes no network requests.

## What ArYS stores on your device

- **Your blocklist and settings** (including the text and image of your custom block page), in the browser's extension storage on your device.
- **A copy of your blocklist and of the Nuclear lock in the browser's sync storage.** If you turned on browser sync, your browser (not ArYS) may sync it to your account so your list can be restored. ArYS never receives it.

Uninstalling ArYS removes its data from the device.

## How blocking works

- The browser itself matches addresses against your rules (declarativeNetRequest) and shows ArYS' block page instead.
- For in-page address changes and browser pages, which that engine cannot see, ArYS checks the address in memory against your list. Addresses are never stored or sent.
- If you set a custom block page, the browser opens that address when a site is blocked.

## Permissions

| Permission              | Purpose                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `declarativeNetRequest` | Let the browser block the addresses on your list.                                        |
| `storage`               | Keep your list and settings on your device.                                              |
| `webNavigation`         | Detect in-page address changes and browser pages so they can be blocked.                 |
| Access to all sites     | Required for the browser to redirect a blocked page to ArYS. Page content is never read. |

## Changes

Changes to this policy are published in this file with a new date. If they affect what is stored, ArYS will ask you to accept the updated terms again.

## Contact

Open an issue at <https://github.com/ronglua111x2/ArYS/issues>.
