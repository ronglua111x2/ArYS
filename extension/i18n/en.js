// English UI strings. Keys must exist in every language file (test/i18n.test.js checks it).
// Placeholders: {name}. Keep strings short; the UI is narrow.
export default {
  'app.name': 'ArYS',
  'app.slogan': 'Are you sure?',

  'nav.blocked': 'Blocked sites',
  'nav.settings': 'Settings',
  'nav.about': 'About',
  'nav.label': 'Sections',

  'theme.label': 'Theme',
  'theme.system': 'System',
  'theme.light': 'Light',
  'theme.dark': 'Dark',

  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.back': 'Back',

  'blocked.title': 'Blocked sites',
  'blocked.subtitle': 'Sites, pages and keywords you block.',
  'blocked.add': '+ Add',
  'blocked.import': 'Import',
  'blocked.export': 'Export',
  'blocked.search': 'Search…',
  'blocked.count': '{n} entries',
  'blocked.empty': 'Nothing blocked yet. Click “+ Add” to start.',
  'blocked.noMatch': 'No matches.',
  'blocked.remove': 'Remove',
  'blocked.removeLocked': 'Locked by Nuclear',

  'filter.all': 'All',
  'filter.site': 'Sites',
  'filter.pattern': 'Patterns',
  'filter.system': 'Browser pages',
  'filter.regex': 'Regex',

  'kind.site': 'site',
  'kind.pattern': 'pattern',
  'kind.system': 'browser page',
  'kind.regex': 'regex',

  'entry.notEnforceable': 'Not enforceable: {reason}',

  'reason.tooShort': 'too short – would block almost everything',
  'reason.keywordShort': 'keyword too short (minimum 4 characters)',
  'reason.tooBroad': 'too broad – matches unrelated sites',
  'reason.re2': 'lookahead and backreferences are not supported',
  'reason.invalidRegex': 'invalid regular expression',
  'reason.emptyRegex': 'empty regular expression',
  'reason.regexLong': 'regular expression too long',
  'reason.incomplete': 'incomplete browser page address',
  'reason.invalid': 'not a valid site, page or pattern',
  'reason.browser': 'rejected by the browser',

  'add.title': 'Add to blocklist',
  'add.importTitle': 'Import to blocklist',
  'add.placeholder': 'One per line (paste up to 500)\nsite.com\nsite.com/path\n*word',
  'add.help':
    'site.com whole site · site.com/path URL prefix · *word any address containing “word” · edge://page a browser page',
  'add.summaryAdd': '{n} to add',
  'add.summarySkipped': '{n} already blocked (skipped)',
  'add.summaryRejected': '{n} rejected',
  'add.tooMany': '{n} lines – at most {max} at a time.',
  'add.badgeSkipped': 'skipped',
  'add.badgeRejected': 'rejected',
  'warn.blockPage':
    '{entries} also blocks your custom block page, which would loop. ArYS will show its own block page instead.',
  'warn.extensionsPage':
    '{entries} blocks Edge’s extensions page, where ArYS is managed and removed. Bookmark this settings page first (Ctrl+D) so you can always open ArYS.',
  'warn.optionsPage':
    '{entries} blocks this settings page. Once it is closed you can’t open ArYS to remove the entry; only uninstalling ArYS undoes it.',
  'warn.copyLink': 'Copy settings link',
  'warn.linkCopied': 'Link copied',
  'add.lockedNote': 'Nuclear is on: entries you add now can’t be removed until it ends.',
  'add.submit': 'Add {n}',
  'add.submitEmpty': 'Add',

  'import.errorEmpty': 'The file has no entries.',
  'import.errorFormat': 'Unsupported file. Use a text file with one entry per line.',

  'toast.added': 'Added {n}.',
  'toast.removed': 'Removed {n}.',
  'toast.reblocked': 'Blocked {n} open tab(s).',
  'toast.exported': 'Exported {n} entries.',
  'toast.exportEmpty': 'Nothing to export yet.',
  'toast.saved': 'Saved',
  'toast.failed': 'Could not save. Try again.',

  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.languageAuto': 'Same as browser',
  'settings.blockPage': 'When a site is blocked',
  'settings.blockPageDefault': 'Show the ArYS block page',
  'settings.blockPageUrl': 'Go to my own page',
  'settings.blockPageUrlPlaceholder': 'https://example.com/focus',
  'settings.blockPageUrlInvalid': 'Enter a full http(s) address.',
  'settings.blockPageUrlBlocked':
    '⚠ This address is on your blocklist, so ArYS shows its own block page instead (no redirect loop).',
  'settings.blockTitle': 'Title',
  'settings.blockTitlePlaceholder': 'This site is blocked',
  'settings.message': 'Message',
  'settings.messagePlaceholder': 'Leave empty for the default message',
  'settings.messageCounter': '{n}/{max}',
  'settings.showTitle': 'Show a title',
  'settings.showMessage': 'Show a message',
  'settings.preview': 'Preview',
  'settings.resetBlockPage': 'Reset to default',
  'settings.nuclear': 'Nuclear option',
  'settings.nuclearDesc': 'Locks removing entries for the time you choose. It cannot be cancelled.',

  'nuclear.duration': 'Duration',
  'nuclear.minutes': 'minutes',
  'nuclear.hours': 'hours',
  'nuclear.days': 'days',
  'nuclear.start': 'Start',
  'nuclear.startNow': 'Now',
  'nuclear.startAt': 'At',
  'nuclear.startButton': 'Start Nuclear',
  'nuclear.errorAmount': 'Enter a duration greater than 0.',
  'nuclear.errorStart': 'Pick a start time that is not in the past.',
  'nuclear.confirmTitle': 'Start Nuclear?',
  'nuclear.confirmFrom': 'From {time}',
  'nuclear.confirmUntil': 'Until {time}',
  'nuclear.forever': '∞',
  'nuclear.confirm': 'Start',
  'nuclear.statusScheduled': 'Starts in {time}',
  'nuclear.statusActive': 'Unlocks in {time}',
  'nuclear.statusUntil': 'until {date}',
  'nuclear.chipScheduled': 'Nuclear in {time}',
  'nuclear.chipActive': 'Nuclear · {time}',

  'about.title': 'About',
  'about.description':
    'A lightweight website blocker. No tracking, no accounts – everything stays on your device.',
  'about.version': 'Version {v}',
  'about.source': 'Source code',
  'about.license': 'License (MIT)',
  'about.privacy': 'Privacy policy',
  'about.terms': 'Terms of use',

  'welcome.title': 'Welcome to ArYS',
  'welcome.lead': 'A calm, lightweight blocker for the sites that steal your focus.',
  'welcome.point1': 'Add sites, pages or keywords – they are blocked right away.',
  'welcome.point2':
    'Change your list any time – or start Nuclear to lock removing entries for as long as you choose.',
  'welcome.point3':
    'No tracking, no accounts, no network requests. Your list stays in your browser.',
  'welcome.termsIntro': 'Before you start, please read:',
  'welcome.accept': 'I have read and accept the Terms of use and the Privacy policy',
  'welcome.start': 'Get started',

  'legal.terms.title': 'Terms of use',
  'legal.terms.p1':
    'ArYS is free, open-source software provided “as is”, without warranty of any kind, under the MIT License.',
  'legal.terms.p2':
    'You can add and remove entries at any time, except while a Nuclear lock you started is active: then entries cannot be removed until it ends, and the lock cannot be cancelled. Uninstalling ArYS removes the list and the lock. Choose a Nuclear duration with care.',
  'legal.terms.p3':
    'You decide what is blocked and are responsible for the entries you add and for following the rules that apply to the devices you use.',
  'legal.terms.p4':
    'If your entries match pages you rely on – including browser pages you choose to block – ArYS will block them too.',
  'legal.terms.p5':
    'These terms may change in future versions. If they do, you will be asked to accept them again.',
  'legal.privacy.title': 'Privacy policy',
  'legal.privacy.p1':
    'ArYS collects nothing. It makes no network requests and has no accounts, analytics or advertising.',
  'legal.privacy.p2':
    'Your list and settings are kept in your browser’s extension storage on this device. If browser sync is on, the list and the Nuclear lock are also kept in the browser’s sync storage so it can be restored; that is handled by your browser, not by ArYS.',
  'legal.privacy.p3':
    'To block pages, the browser matches addresses against your rules. ArYS also checks in-page navigations and browser pages in memory to block them. Addresses are never stored or sent.',
  'legal.privacy.p4': 'Uninstalling ArYS removes its data from this device.',
  'legal.privacy.p5': 'Questions? Open an issue on the project’s GitHub page.',

  'blockedPage.title': 'This site is blocked',
  'blockedPage.default': 'Are you sure?',
  'blockedPage.open': 'Open ArYS',
  'blockedPage.locked': 'Nuclear is on – unlocks in {time}.',
};
