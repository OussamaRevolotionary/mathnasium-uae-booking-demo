/**
 * English (en-US) and UAE Arabic (ar-AE). `{name}` placeholders are filled by `t(key, vars)`.
 * Wording is written for parents first: short, friendly, no technical terms.
 */
import type { BookingDenialReason, Lang } from '../types/domain.ts';

const en = {
  'brand.tagline': 'We Make Math Make Sense®',
  'brand.parentPortal': 'Parent Portal',
  'brand.staffPortal': 'Center Calendar',
  'nav.logout': 'Sign out',

  'login.title': 'Welcome to Mathnasium',
  'login.subtitle': 'Book your child’s math sessions in a few taps.',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.error': 'Wrong username or password.',
  'login.noAccount': 'Accounts are created by your Mathnasium center. Need help? Message your center on WhatsApp.',
  'login.demo': 'Demo accounts',
  'login.demoParent': 'Parent · Al Mansoori family',
  'login.demoStaff': 'Center Director',
  'login.method': 'The Mathnasium Method™ · Personalized Learning Plans · In-center sessions',

  'parent.hello': 'Hello, {name}',
  'parent.pickChild': 'Who is this lesson for?',
  'child.used': '{used} of {limit} used in {month}',
  'child.unlimited': 'Unlimited · {used} in {month}',
  'child.stars': '{n} mastery stars',
  'tier.REGULAR_10': '10 sessions / month',
  'tier.UNLIMITED': 'Unlimited',
  grade: 'Grade {n}',

  'notice.limitTitle': 'Monthly limit reached — 10/10 sessions booked for {month}',
  'notice.limitBody': 'Switch to {next} to book next month’s sessions, or ask the center about an Unlimited Membership.',
  'notice.goNext': 'Book in {next}',
  'notice.askUpgrade': 'Ask about Unlimited',
  'notice.left': '{name} has {n} lessons left in {month}.',
  'notice.lastOne': '{name} has 1 lesson left in {month}.',
  'notice.unlimited': '{name} has an Unlimited Membership — book as many sessions as you like.',

  'step.length': 'Lesson length',
  'len.30': '30 min',
  'len.60': '1 hour',
  'len.90': '1 h 30',
  'len.120': '2 hours',
  'step.day': 'Choose a day',
  'month.this': 'This month',
  'month.next': 'Next month',
  'day.places': '{n} free',
  'day.full': 'Full',
  'step.time': 'Choose a time',
  'time.hideFull': 'Hide full times',
  'time.left': '{n} places left',
  'time.leftOne': '1 place left',
  'time.full': 'Full',
  'time.book': 'Book',
  'time.move': 'Move here',
  'time.notify': 'Notify me',
  'time.notified': 'On the list',
  'time.booked': 'Booked',
  'time.locked': 'Limit reached',
  'time.none': 'No times left on this day — please choose another day.',
  'time.closed': 'The center is closed on Fridays.',

  'confirm.title': 'Confirm lesson',
  'confirm.count': 'This will be lesson {n} of 10 in {month}.',
  'confirm.unlimited': 'Unlimited membership — no monthly limit.',
  'confirm.whatsapp': 'A WhatsApp confirmation will be sent to {phone}.',
  'confirm.btn': 'Confirm booking',
  'confirm.back': 'Back',
  'done.title': 'Lesson booked!',
  'done.addGoogle': 'Add to Google Calendar',
  'done.close': 'Done',

  'upcoming.title': 'Upcoming lessons',
  'upcoming.none': 'No lessons booked yet.',
  'upcoming.change': 'Change time',
  'upcoming.cancel': 'Cancel',
  'upcoming.tooLate': 'Starts in less than 24 hours — please contact the center to change it.',

  'cancel.title': 'Cancel this lesson?',
  'cancel.body': 'The lesson goes back to {name}’s {month} balance. Please rebook it before the end of {month} — unused lessons don’t carry over.',
  'cancel.bodyUnlimited': 'The place will be released for another student.',
  'cancel.confirm': 'Yes, cancel',
  'cancel.reschedule': 'Change the time instead',
  'cancel.keep': 'Keep lesson',

  'resched.banner': 'Choose a new time for {name}’s lesson ({when}). It must stay in {month}.',
  'resched.stop': 'Stop changing',
  'resched.title': 'Move this lesson?',
  'resched.from': 'From',
  'resched.to': 'To',
  'resched.btn': 'Move lesson',

  'toast.booked': 'Booked: {name} · {when}',
  'toast.cancelled': 'Lesson cancelled — {name} can rebook it in {month}.',
  'toast.moved': 'Lesson moved to {when}',
  'toast.notify': 'We’ll message you on WhatsApp if a place opens.',
  'toast.upgrade': 'Thank you! The center will contact you about Unlimited.',
  'toast.reset': 'Demo data restored',
  'toast.syncFailed': 'Calendar sync problem — see Settings',
  'toast.accountCreated': 'Account created for {name}',

  'reason.CENTER_CLOSED': 'The center is closed that day.',
  'reason.OUTSIDE_OPENING_HOURS': 'That time is outside opening hours.',
  'reason.IN_PAST': 'That time has already started.',
  'reason.BEYOND_BOOKING_WINDOW': 'You can book this month and next month only.',
  'reason.OVERLAPS_OWN_LESSON': 'Your child already has a lesson at that time.',
  'reason.MONTHLY_LIMIT_REACHED': 'All 10 lessons for this month are already booked.',
  'reason.FULL': 'Sorry — that time just filled up.',
  'reason.RESCHEDULE_OTHER_MONTH': 'A lesson can only be moved within the same month.',

  'staff.calendar': 'Calendar',
  'staff.families': 'Families',
  'staff.settings': 'Settings',
  'staff.center': 'Center',
  'cal.today': 'Today',
  'cal.day': 'Day',
  'cal.week': 'Week',
  'cal.lessons': 'Lessons',
  'cal.fullHours': 'Full hours',
  'cal.atLimit': 'Students at 10/10',
  'cal.sync': 'Google Calendar',
  'cal.synced': 'Synced',
  'cal.testMode': 'Test mode',
  'cal.syncError': 'Check settings',
  'cal.closed': 'Closed on Fridays',
  'cal.hint': 'Tap an hour to see who is coming.',
  'roster.title': 'Students',
  'roster.empty': 'Nobody booked yet.',
  'roster.pods': '3 pods × 4 students',
  'roster.parent': 'Parent',
  'roster.cancel': 'Cancel',
  'roster.waitlist': 'Waiting for a place',

  'fam.search': 'Search parent or child…',
  'fam.add': 'Add family',
  'fam.newTitle': 'New family account',
  'fam.parentName': 'Parent full name',
  'fam.phone': 'WhatsApp number',
  'fam.email': 'Email',
  'fam.username': 'Username',
  'fam.password': 'Temporary password',
  'fam.children': 'Children',
  'fam.firstName': 'First name',
  'fam.lastName': 'Family name',
  'fam.grade': 'Grade',
  'fam.tier': 'Membership',
  'fam.topic': 'Learning plan',
  'fam.addChild': 'Add another child',
  'fam.create': 'Create account',
  'fam.login': 'Login',
  'fam.count': '{n} families',

  'set.connection': 'Google Calendar & WhatsApp connection',
  'set.help': 'Every booking, change and cancellation is sent to your n8n workflow, which updates the center’s Google Calendar and sends the parent a WhatsApp message.',
  'set.url': 'n8n webhook URL',
  'set.live': 'Live',
  'set.test': 'Test mode',
  'set.testHelp': 'Test mode: nothing is sent — add a webhook URL and choose Live.',
  'set.ping': 'Send test',
  'set.cors': 'In the n8n Webhook node: method POST, and allow this site under Options → Allowed Origins (CORS).',
  'set.log': 'Recent activity',
  'set.empty': 'Nothing sent yet — book or cancel a lesson.',
  'set.copy': 'Copy',
  'set.copied': 'Copied',
  'sync.PENDING': 'Sending',
  'sync.DELIVERED': 'Delivered',
  'sync.DELIVERED_OPAQUE': 'Sent',
  'sync.SIMULATED': 'Test',
  'sync.FAILED': 'Failed',

  'pitch.title': 'Pitch demo',
  'pitch.director': 'Center Director',
  'pitch.reset': 'Reset demo',
  'pitch.hide': 'Hide (Ctrl+Shift+D)',

  'common.close': 'Close',
  'common.cancel': 'Cancel',
} as const;

export type TranslationKey = keyof typeof en;

const ar: Record<TranslationKey, string> = {
  'brand.tagline': 'We Make Math Make Sense®',
  'brand.parentPortal': 'بوابة أولياء الأمور',
  'brand.staffPortal': 'تقويم المركز',
  'nav.logout': 'تسجيل الخروج',

  'login.title': 'أهلاً بكم في ماثنيزيوم',
  'login.subtitle': 'احجزوا حصص الرياضيات لأبنائكم بخطوات بسيطة.',
  'login.username': 'اسم المستخدم',
  'login.password': 'كلمة المرور',
  'login.submit': 'تسجيل الدخول',
  'login.error': 'اسم المستخدم أو كلمة المرور غير صحيحة.',
  'login.noAccount': 'يقوم مركز ماثنيزيوم بإنشاء الحسابات. للمساعدة راسلوا المركز عبر واتساب.',
  'login.demo': 'حسابات تجريبية',
  'login.demoParent': 'وليّ أمر · عائلة المنصوري',
  'login.demoStaff': 'مدير المركز',
  'login.method': 'منهجية ماثنيزيوم™ · خطط تعلّم مخصصة · حصص داخل المركز',

  'parent.hello': 'مرحباً، {name}',
  'parent.pickChild': 'لمن هذه الحصة؟',
  'child.used': 'تم استخدام {used} من {limit} في {month}',
  'child.unlimited': 'غير محدودة · {used} في {month}',
  'child.stars': '{n} نجوم إتقان',
  'tier.REGULAR_10': '10 حصص شهرياً',
  'tier.UNLIMITED': 'غير محدودة',
  grade: 'الصف {n}',

  'notice.limitTitle': 'تم بلوغ الحد الشهري — 10/10 حصص محجوزة في {month}',
  'notice.limitBody': 'انتقلوا إلى {next} لحجز حصص الشهر القادم، أو اسألوا المركز عن العضوية غير المحدودة.',
  'notice.goNext': 'الحجز في {next}',
  'notice.askUpgrade': 'الاستفسار عن العضوية غير المحدودة',
  'notice.left': 'تبقّى لـ {name} {n} حصص في {month}.',
  'notice.lastOne': 'تبقّت لـ {name} حصة واحدة في {month}.',
  'notice.unlimited': 'لدى {name} عضوية غير محدودة — احجزوا ما تشاؤون من الحصص.',

  'step.length': 'مدة الحصة',
  'len.30': '30 دقيقة',
  'len.60': 'ساعة',
  'len.90': 'ساعة ونصف',
  'len.120': 'ساعتان',
  'step.day': 'اختر اليوم',
  'month.this': 'هذا الشهر',
  'month.next': 'الشهر القادم',
  'day.places': '{n} متاح',
  'day.full': 'مكتمل',
  'step.time': 'اختر الوقت',
  'time.hideFull': 'إخفاء الأوقات المكتملة',
  'time.left': 'تبقّى {n} مقاعد',
  'time.leftOne': 'تبقّى مقعد واحد',
  'time.full': 'مكتمل',
  'time.book': 'احجز',
  'time.move': 'انقل هنا',
  'time.notify': 'أبلغوني',
  'time.notified': 'في القائمة',
  'time.booked': 'محجوز',
  'time.locked': 'تم بلوغ الحد',
  'time.none': 'لا توجد أوقات متبقية في هذا اليوم — اختاروا يوماً آخر.',
  'time.closed': 'المركز مغلق يوم الجمعة.',

  'confirm.title': 'تأكيد الحصة',
  'confirm.count': 'ستكون هذه الحصة رقم {n} من 10 في {month}.',
  'confirm.unlimited': 'عضوية غير محدودة — لا يوجد حد شهري.',
  'confirm.whatsapp': 'سيتم إرسال تأكيد عبر واتساب إلى {phone}.',
  'confirm.btn': 'تأكيد الحجز',
  'confirm.back': 'رجوع',
  'done.title': 'تم حجز الحصة!',
  'done.addGoogle': 'أضف إلى تقويم Google',
  'done.close': 'تم',

  'upcoming.title': 'الحصص القادمة',
  'upcoming.none': 'لا توجد حصص محجوزة بعد.',
  'upcoming.change': 'تغيير الموعد',
  'upcoming.cancel': 'إلغاء',
  'upcoming.tooLate': 'تبدأ خلال أقل من 24 ساعة — يرجى التواصل مع المركز لتغييرها.',

  'cancel.title': 'إلغاء هذه الحصة؟',
  'cancel.body': 'ستعود الحصة إلى رصيد {name} لشهر {month}. يرجى إعادة حجزها قبل نهاية {month} — الحصص غير المستخدمة لا تُرحَّل.',
  'cancel.bodyUnlimited': 'سيتم تحرير المقعد لطالب آخر.',
  'cancel.confirm': 'نعم، ألغِ الحصة',
  'cancel.reschedule': 'تغيير الموعد بدلاً من ذلك',
  'cancel.keep': 'الإبقاء على الحصة',

  'resched.banner': 'اختاروا موعداً جديداً لحصة {name} ({when}). يجب أن يبقى ضمن شهر {month}.',
  'resched.stop': 'إيقاف التغيير',
  'resched.title': 'نقل هذه الحصة؟',
  'resched.from': 'من',
  'resched.to': 'إلى',
  'resched.btn': 'نقل الحصة',

  'toast.booked': 'تم الحجز: {name} · {when}',
  'toast.cancelled': 'تم إلغاء الحصة — يمكن لـ {name} إعادة حجزها في {month}.',
  'toast.moved': 'تم نقل الحصة إلى {when}',
  'toast.notify': 'سنراسلكم عبر واتساب عند توفر مقعد.',
  'toast.upgrade': 'شكراً لكم! سيتواصل معكم المركز بخصوص العضوية غير المحدودة.',
  'toast.reset': 'تمت استعادة البيانات التجريبية',
  'toast.syncFailed': 'مشكلة في مزامنة التقويم — راجعوا الإعدادات',
  'toast.accountCreated': 'تم إنشاء حساب لـ {name}',

  'reason.CENTER_CLOSED': 'المركز مغلق في ذلك اليوم.',
  'reason.OUTSIDE_OPENING_HOURS': 'هذا الوقت خارج ساعات العمل.',
  'reason.IN_PAST': 'هذا الوقت قد بدأ بالفعل.',
  'reason.BEYOND_BOOKING_WINDOW': 'يمكن الحجز لهذا الشهر والشهر القادم فقط.',
  'reason.OVERLAPS_OWN_LESSON': 'لدى طفلكم حصة في نفس الوقت.',
  'reason.MONTHLY_LIMIT_REACHED': 'تم حجز الحصص العشر لهذا الشهر بالفعل.',
  'reason.FULL': 'عذراً — اكتمل هذا الوقت للتو.',
  'reason.RESCHEDULE_OTHER_MONTH': 'يمكن نقل الحصة داخل نفس الشهر فقط.',

  'staff.calendar': 'التقويم',
  'staff.families': 'العائلات',
  'staff.settings': 'الإعدادات',
  'staff.center': 'المركز',
  'cal.today': 'اليوم',
  'cal.day': 'يومي',
  'cal.week': 'أسبوعي',
  'cal.lessons': 'الحصص',
  'cal.fullHours': 'ساعات مكتملة',
  'cal.atLimit': 'طلاب بلغوا 10/10',
  'cal.sync': 'تقويم Google',
  'cal.synced': 'متزامن',
  'cal.testMode': 'وضع الاختبار',
  'cal.syncError': 'راجعوا الإعدادات',
  'cal.closed': 'مغلق يوم الجمعة',
  'cal.hint': 'اضغطوا على أي ساعة لعرض الطلاب الحاضرين.',
  'roster.title': 'الطلاب',
  'roster.empty': 'لا يوجد حجز بعد.',
  'roster.pods': '3 مجموعات × 4 طلاب',
  'roster.parent': 'وليّ الأمر',
  'roster.cancel': 'إلغاء',
  'roster.waitlist': 'بانتظار مقعد',

  'fam.search': 'ابحث عن وليّ أمر أو طالب…',
  'fam.add': 'إضافة عائلة',
  'fam.newTitle': 'حساب عائلة جديد',
  'fam.parentName': 'الاسم الكامل لوليّ الأمر',
  'fam.phone': 'رقم واتساب',
  'fam.email': 'البريد الإلكتروني',
  'fam.username': 'اسم المستخدم',
  'fam.password': 'كلمة مرور مؤقتة',
  'fam.children': 'الأبناء',
  'fam.firstName': 'الاسم الأول',
  'fam.lastName': 'اسم العائلة',
  'fam.grade': 'الصف',
  'fam.tier': 'العضوية',
  'fam.topic': 'خطة التعلّم',
  'fam.addChild': 'إضافة طفل آخر',
  'fam.create': 'إنشاء الحساب',
  'fam.login': 'الدخول',
  'fam.count': '{n} عائلة',

  'set.connection': 'الربط مع تقويم Google وواتساب',
  'set.help': 'يتم إرسال كل حجز وتعديل وإلغاء إلى سير عمل n8n الذي يحدّث تقويم Google الخاص بالمركز ويرسل رسالة واتساب لوليّ الأمر.',
  'set.url': 'رابط n8n Webhook',
  'set.live': 'مباشر',
  'set.test': 'وضع الاختبار',
  'set.testHelp': 'وضع الاختبار: لا يتم إرسال أي شيء — أضيفوا رابط Webhook واختاروا "مباشر".',
  'set.ping': 'إرسال تجربة',
  'set.cors': 'في عقدة Webhook في n8n: الطريقة POST، واسمحوا بهذا الموقع من Options ← Allowed Origins (CORS).',
  'set.log': 'آخر النشاطات',
  'set.empty': 'لم يُرسل شيء بعد — احجزوا أو ألغوا حصة.',
  'set.copy': 'نسخ',
  'set.copied': 'تم النسخ',
  'sync.PENDING': 'جارٍ الإرسال',
  'sync.DELIVERED': 'تم التسليم',
  'sync.DELIVERED_OPAQUE': 'تم الإرسال',
  'sync.SIMULATED': 'تجربة',
  'sync.FAILED': 'فشل',

  'pitch.title': 'العرض التقديمي',
  'pitch.director': 'مدير المركز',
  'pitch.reset': 'إعادة الضبط',
  'pitch.hide': 'إخفاء (Ctrl+Shift+D)',

  'common.close': 'إغلاق',
  'common.cancel': 'إلغاء',
};

export const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, ar };
export type Vars = Record<string, string | number>;

export function translate(lang: Lang, key: TranslationKey, vars?: Vars): string {
  let s = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export const reasonKey = (r: BookingDenialReason) => `reason.${r}` as TranslationKey;

// ───────────────────────── Learning-plan topics ─────────────────────────

export const TOPICS: Record<string, { en: string; ar: string }> = {
  NUMBER_SENSE: { en: 'Number Sense', ar: 'الحس العددي' },
  MULTIPLICATION: { en: 'Multiplication Facts', ar: 'جدول الضرب' },
  FRACTIONS: { en: 'Fractions', ar: 'الكسور' },
  DECIMALS: { en: 'Decimals & Percentages', ar: 'الأعداد العشرية والنسب' },
  WORD_PROBLEMS: { en: 'Word Problems', ar: 'المسائل الكلامية' },
  PRE_ALGEBRA: { en: 'Pre-Algebra', ar: 'ما قبل الجبر' },
  ALGEBRA_1: { en: 'Algebra I', ar: 'الجبر 1' },
  GEOMETRY: { en: 'Geometry', ar: 'الهندسة' },
  IGCSE: { en: 'IGCSE Prep', ar: 'التحضير لـ IGCSE' },
  SAT: { en: 'SAT Math', ar: 'رياضيات SAT' },
};

export const topicLabel = (key: string, lang: Lang) => TOPICS[key]?.[lang] ?? key;

// ───────────────────────── WhatsApp messages ─────────────────────────

export type WaTemplate = 'booked' | 'cancelled' | 'rescheduled' | 'waitlist';

export function whatsappMessage(lang: Lang, tpl: WaTemplate, v: { parent: string; student: string; center: string; when: string; used: string }): string {
  if (lang === 'ar') {
    switch (tpl) {
      case 'booked':
        return `مرحباً ${v.parent}، تم تأكيد حصة ${v.student} في ماثنيزيوم ${v.center} يوم ${v.when}. الحصص هذا الشهر: ${v.used}. نراكم قريباً!`;
      case 'cancelled':
        return `مرحباً ${v.parent}، تم إلغاء حصة ${v.student} يوم ${v.when}. يمكنكم إعادة حجزها خلال نفس الشهر من البوابة.`;
      case 'rescheduled':
        return `مرحباً ${v.parent}، تم نقل حصة ${v.student} إلى ${v.when} في ماثنيزيوم ${v.center}.`;
      case 'waitlist':
        return `مرحباً ${v.parent}، ${v.student} على قائمة الانتظار ليوم ${v.when}. سنراسلكم فور توفر مقعد.`;
    }
  }
  switch (tpl) {
    case 'booked':
      return `Hi ${v.parent}, ${v.student}'s session at Mathnasium ${v.center} is confirmed for ${v.when}. Sessions this month: ${v.used}. See you soon!`;
    case 'cancelled':
      return `Hi ${v.parent}, ${v.student}'s session on ${v.when} has been cancelled. You can rebook it in the same month from the portal.`;
    case 'rescheduled':
      return `Hi ${v.parent}, ${v.student}'s session has been moved to ${v.when} at Mathnasium ${v.center}.`;
    case 'waitlist':
      return `Hi ${v.parent}, ${v.student} is on the waiting list for ${v.when}. We'll message you as soon as a seat opens.`;
  }
}
