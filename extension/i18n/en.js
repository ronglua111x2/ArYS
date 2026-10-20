// English UI strings. Keys must exist in every language file (test/i18n.test.js checks it).
// Placeholders: {name}. Keep strings short; the UI is narrow.
export default {
  'app.name': 'ArYS',
  'app.slogan': 'Stay on what matters.',

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
  'blocked.subtitle': 'Add-only: entries can never be edited or removed.',
  'blocked.add': '+ Add',
  'blocked.import': 'Import',
  'blocked.export': 'Export',
  'blocked.search': 'Search…',
  'blocked.count': '{n} entries',
  'blocked.empty': 'Nothing blocked yet. Click “+ Add” to start.',
  'blocked.noMatch': 'No matches.',

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
  'add.confirm': 'Permanent – I can’t remove these later',
  'add.submit': 'Add {n}',
  'add.submitEmpty': 'Add',

  'import.errorEmpty': 'The file has no entries.',
  'import.errorFormat':
    'Unsupported file. Use an ArYS export (.json) or a text file with one entry per line.',

  'toast.added': 'Added {n}.',
  'toast.reblocked': 'Blocked {n} open tab(s).',
  'toast.exported': 'Exported {n} entries.',
  'toast.exportEmpty': 'Nothing to export yet.',
  'toast.saved': 'Saved',

  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.languageAuto': 'Same as browser',
  'settings.theme': 'Theme',
  'settings.blockPage': 'When a site is blocked',
  'settings.blockPageDefault': 'Show the ArYS block page',
  'settings.blockPageUrl': 'Go to my own page',
  'settings.blockPageUrlPlaceholder': 'https://example.com/focus',
  'settings.blockPageUrlInvalid': 'Enter a full http(s) address.',
  'settings.message': 'Message on the block page',
  'settings.messagePlaceholder': 'Leave empty for the default message',
  'settings.messageCounter': '{n}/{max}',
  'settings.nuclear': 'Nuclear option',
  'settings.nuclearDesc':
    'Block your list – or everything – for a set time, with no way to cancel it. Coming in a future version.',
  'settings.nuclearSoon': 'Coming soon',

  'about.title': 'About',
  'about.description':
    'A lightweight website blocker. No tracking, no accounts – everything stays on your device.',
  'about.version': 'Version {v}',
  'about.source': 'Source code',
  'about.license': 'License (MIT)',
  'about.privacy': 'Privacy policy',
  'about.terms': 'Terms of use',
  'about.placeholder': 'Branding placeholder – logo, artwork and credits will go here.',

  'welcome.title': 'Welcome to ArYS',
  'welcome.lead': 'A calm, lightweight blocker for the sites that steal your focus.',
  'welcome.point1': 'Add sites, pages or keywords – they are blocked right away.',
  'welcome.point2':
    'Add-only: once added, an entry cannot be edited or removed. Uninstalling is the only reset.',
  'welcome.point3':
    'No tracking, no accounts, no network requests. Your list stays in your browser.',
  'welcome.termsIntro': 'Before you start, please read:',
  'welcome.accept': 'I have read and accept the Terms of use and the Privacy policy',
  'welcome.start': 'Get started',

  'legal.terms.title': 'Terms of use',
  'legal.terms.p1':
    'ArYS is free, open-source software provided “as is”, without warranty of any kind, under the MIT License.',
  'legal.terms.p2':
    'ArYS is add-only by design: entries you add cannot be edited or removed from inside the extension. The only way to reset the list is to uninstall ArYS. Check each entry before adding it.',
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
    'Your list and settings are kept in your browser’s extension storage on this device. If browser sync is on, the list is also kept in the browser’s sync storage so it can be restored; that is handled by your browser, not by ArYS.',
  'legal.privacy.p3':
    'To block pages, the browser matches addresses against your rules. ArYS also checks in-page navigations and browser pages in memory to block them. Addresses are never stored or sent.',
  'legal.privacy.p4': 'Uninstalling ArYS removes its data from this device.',
  'legal.privacy.p5': 'Questions? Open an issue on the project’s GitHub page.',

  'blockedPage.title': 'This site is blocked',
  'blockedPage.default':
    'You chose to stay away from this site. Take a breath and get back to what matters.',
  'blockedPage.open': 'Open ArYS',
};
