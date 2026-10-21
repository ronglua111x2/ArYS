// Chuỗi giao diện tiếng Việt. Phải có đủ mọi khóa của en.js (test/i18n.test.js kiểm tra).
export default {
  'app.name': 'ArYS',
  'app.slogan': 'Are you sure?',

  'nav.blocked': 'Trang bị chặn',
  'nav.settings': 'Cài đặt',
  'nav.about': 'Giới thiệu',
  'nav.label': 'Mục',

  'theme.label': 'Giao diện',
  'theme.system': 'Theo hệ thống',
  'theme.light': 'Sáng',
  'theme.dark': 'Tối',

  'common.cancel': 'Hủy',
  'common.close': 'Đóng',
  'common.back': 'Quay lại',

  'blocked.title': 'Trang bị chặn',
  'blocked.subtitle': 'Trang web, đường dẫn và từ khóa bạn chặn.',
  'blocked.add': '+ Thêm',
  'blocked.import': 'Nhập',
  'blocked.export': 'Xuất',
  'blocked.search': 'Tìm…',
  'blocked.count': '{n} mục',
  'blocked.empty': 'Chưa chặn gì. Bấm “+ Thêm” để bắt đầu.',
  'blocked.noMatch': 'Không có kết quả.',
  'blocked.remove': 'Xóa',
  'blocked.removeLocked': 'Đang khóa bởi Nuclear',

  'filter.all': 'Tất cả',
  'filter.site': 'Trang web',
  'filter.pattern': 'Mẫu',
  'filter.system': 'Trang trình duyệt',
  'filter.regex': 'Regex',

  'kind.site': 'trang web',
  'kind.pattern': 'mẫu',
  'kind.system': 'trang trình duyệt',
  'kind.regex': 'regex',

  'entry.notEnforceable': 'Không thực thi được: {reason}',

  'reason.tooShort': 'quá ngắn – sẽ chặn gần như mọi thứ',
  'reason.keywordShort': 'từ khóa quá ngắn (tối thiểu 4 ký tự)',
  'reason.tooBroad': 'quá rộng – khớp cả các trang không liên quan',
  'reason.re2': 'không hỗ trợ lookahead và backreference',
  'reason.invalidRegex': 'biểu thức chính quy không hợp lệ',
  'reason.emptyRegex': 'biểu thức chính quy rỗng',
  'reason.regexLong': 'biểu thức chính quy quá dài',
  'reason.incomplete': 'địa chỉ trang trình duyệt chưa đầy đủ',
  'reason.invalid': 'không phải trang web, trang hay mẫu hợp lệ',
  'reason.browser': 'bị trình duyệt từ chối',

  'add.title': 'Thêm vào danh sách chặn',
  'add.importTitle': 'Nhập vào danh sách chặn',
  'add.placeholder': 'Mỗi dòng một mục (dán tối đa 500)\nsite.com\nsite.com/duong-dan\n*tukhoa',
  'add.help':
    'site.com cả trang · site.com/duong-dan theo đường dẫn · *tukhoa mọi địa chỉ chứa “tukhoa” · edge://trang trang của trình duyệt',
  'add.summaryAdd': '{n} sẽ thêm',
  'add.summarySkipped': '{n} đã chặn (bỏ qua)',
  'add.summaryRejected': '{n} bị từ chối',
  'add.tooMany': '{n} dòng – tối đa {max} mỗi lần.',
  'add.badgeSkipped': 'bỏ qua',
  'add.badgeRejected': 'từ chối',
  'warn.blockPage':
    '{entries} chặn luôn trang chặn tùy chỉnh của bạn, sẽ gây vòng lặp. ArYS sẽ hiện trang chặn mặc định thay thế.',
  'warn.extensionsPage':
    '{entries} chặn trang tiện ích của Edge, nơi quản lý và gỡ ArYS. Hãy đánh dấu trang cài đặt này trước (Ctrl+D) để luôn mở được ArYS.',
  'warn.optionsPage':
    '{entries} chặn chính trang cài đặt này. Khi đóng trang, bạn không mở lại ArYS để xóa mục đó được nữa; chỉ gỡ cài đặt ArYS mới hoàn tác.',
  'warn.copyLink': 'Sao chép liên kết cài đặt',
  'warn.linkCopied': 'Đã sao chép',
  'add.lockedNote': 'Nuclear đang bật: mục thêm lúc này không xóa được cho tới khi hết hạn.',
  'add.submit': 'Thêm {n}',
  'add.submitEmpty': 'Thêm',

  'import.errorEmpty': 'Tệp không có mục nào.',
  'import.errorFormat': 'Tệp không được hỗ trợ. Dùng tệp văn bản, mỗi dòng một mục.',

  'toast.added': 'Đã thêm {n}.',
  'toast.removed': 'Đã xóa {n}.',
  'toast.reblocked': 'Đã chặn {n} tab đang mở.',
  'toast.exported': 'Đã xuất {n} mục.',
  'toast.exportEmpty': 'Chưa có gì để xuất.',
  'toast.saved': 'Đã lưu',
  'toast.failed': 'Không lưu được. Thử lại.',

  'settings.title': 'Cài đặt',
  'settings.language': 'Ngôn ngữ',
  'settings.languageAuto': 'Theo trình duyệt',
  'settings.blockPage': 'Khi một trang bị chặn',
  'settings.blockPageDefault': 'Hiện trang chặn của ArYS',
  'settings.blockPageUrl': 'Chuyển tới trang của tôi',
  'settings.blockPageUrlPlaceholder': 'https://example.com/tap-trung',
  'settings.blockPageUrlInvalid': 'Nhập địa chỉ http(s) đầy đủ.',
  'settings.blockPageUrlBlocked':
    '⚠ Địa chỉ này nằm trong danh sách chặn nên ArYS hiện trang chặn mặc định thay thế (tránh vòng lặp).',
  'settings.blockTitle': 'Tiêu đề',
  'settings.blockTitlePlaceholder': 'Trang này đã bị chặn',
  'settings.message': 'Lời nhắn',
  'settings.messagePlaceholder': 'Để trống để dùng lời nhắn mặc định',
  'settings.messageCounter': '{n}/{max}',
  'settings.showTitle': 'Hiện tiêu đề',
  'settings.showMessage': 'Hiện lời nhắn',
  'settings.preview': 'Xem trước',
  'settings.resetBlockPage': 'Đặt lại mặc định',
  'settings.nuclear': 'Chế độ Nuclear',
  'settings.nuclearDesc': 'Khóa việc xóa mục trong khoảng thời gian bạn chọn. Không thể hủy.',

  'nuclear.duration': 'Thời lượng',
  'nuclear.minutes': 'phút',
  'nuclear.hours': 'giờ',
  'nuclear.days': 'ngày',
  'nuclear.start': 'Bắt đầu',
  'nuclear.startNow': 'Ngay',
  'nuclear.startAt': 'Lúc',
  'nuclear.startButton': 'Bật Nuclear',
  'nuclear.errorAmount': 'Nhập thời lượng lớn hơn 0.',
  'nuclear.errorStart': 'Chọn thời điểm bắt đầu không nằm trong quá khứ.',
  'nuclear.confirmTitle': 'Bật Nuclear?',
  'nuclear.confirmFrom': 'Từ {time}',
  'nuclear.confirmUntil': 'Đến {time}',
  'nuclear.forever': '∞',
  'nuclear.confirm': 'Bật',
  'nuclear.statusScheduled': 'Bắt đầu sau {time}',
  'nuclear.statusActive': 'Mở khóa sau {time}',
  'nuclear.statusUntil': 'đến {date}',
  'nuclear.chipScheduled': 'Nuclear sau {time}',
  'nuclear.chipActive': 'Nuclear · {time}',

  'about.title': 'Giới thiệu',
  'about.description':
    'Trình chặn website nhẹ. Không theo dõi, không tài khoản – mọi thứ nằm trên thiết bị của bạn.',
  'about.version': 'Phiên bản {v}',
  'about.source': 'Mã nguồn',
  'about.license': 'Giấy phép (MIT)',
  'about.privacy': 'Chính sách quyền riêng tư',
  'about.terms': 'Điều khoản sử dụng',
  'about.placeholder': 'Chỗ dành cho thương hiệu – logo, hình ảnh và ghi công sẽ đặt ở đây.',

  'welcome.title': 'Chào mừng đến với ArYS',
  'welcome.lead': 'Trình chặn nhẹ nhàng cho những trang lấy mất sự tập trung của bạn.',
  'welcome.point1': 'Thêm trang web, đường dẫn hoặc từ khóa – chúng bị chặn ngay.',
  'welcome.point2':
    'Sửa danh sách bất cứ lúc nào – hoặc bật Nuclear để khóa việc xóa mục trong khoảng thời gian bạn chọn.',
  'welcome.point3':
    'Không theo dõi, không tài khoản, không kết nối mạng. Danh sách nằm trong trình duyệt của bạn.',
  'welcome.termsIntro': 'Trước khi bắt đầu, vui lòng đọc:',
  'welcome.accept': 'Tôi đã đọc và đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư',
  'welcome.start': 'Bắt đầu',

  'legal.terms.title': 'Điều khoản sử dụng',
  'legal.terms.p1':
    'ArYS là phần mềm miễn phí, mã nguồn mở, được cung cấp “nguyên trạng”, không kèm bất kỳ bảo đảm nào, theo Giấy phép MIT.',
  'legal.terms.p2':
    'Bạn có thể thêm và xóa mục bất cứ lúc nào, trừ khi đang có khóa Nuclear do bạn bật: khi đó không xóa được mục cho tới khi hết hạn, và không thể hủy khóa. Gỡ cài đặt ArYS sẽ xóa danh sách và khóa. Hãy chọn thời lượng Nuclear cẩn thận.',
  'legal.terms.p3':
    'Bạn quyết định chặn gì, và chịu trách nhiệm về các mục mình thêm cũng như việc tuân thủ quy định áp dụng cho thiết bị bạn dùng.',
  'legal.terms.p4':
    'Nếu mục của bạn khớp với trang bạn cần dùng – kể cả trang trình duyệt bạn chọn chặn – ArYS cũng sẽ chặn chúng.',
  'legal.terms.p5':
    'Điều khoản có thể thay đổi ở các phiên bản sau. Khi đó bạn sẽ được yêu cầu đồng ý lại.',
  'legal.privacy.title': 'Chính sách quyền riêng tư',
  'legal.privacy.p1':
    'ArYS không thu thập gì. Không kết nối mạng, không tài khoản, không phân tích hay quảng cáo.',
  'legal.privacy.p2':
    'Danh sách và cài đặt được lưu trong bộ nhớ extension của trình duyệt trên thiết bị này. Nếu bật đồng bộ trình duyệt, danh sách và khóa Nuclear cũng được lưu trong bộ nhớ đồng bộ để có thể khôi phục; phần đó do trình duyệt xử lý, không phải ArYS.',
  'legal.privacy.p3':
    'Để chặn trang, trình duyệt so địa chỉ với các quy tắc của bạn. ArYS cũng kiểm tra trong bộ nhớ các lần đổi địa chỉ trong trang và trang trình duyệt để chặn chúng. Địa chỉ không bao giờ được lưu hay gửi đi.',
  'legal.privacy.p4': 'Gỡ cài đặt ArYS sẽ xóa dữ liệu của nó khỏi thiết bị này.',
  'legal.privacy.p5': 'Có câu hỏi? Mở một issue trên trang GitHub của dự án.',

  'blockedPage.title': 'Trang này đã bị chặn',
  'blockedPage.default': 'Are you sure?',
  'blockedPage.open': 'Mở ArYS',
  'blockedPage.locked': 'Nuclear đang bật – mở khóa sau {time}.',
};
