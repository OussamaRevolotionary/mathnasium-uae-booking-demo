/**
 * The explainer film, scene by scene — one source for both languages.
 * shot   : screenshot in ../shots/<lang>/ (null = brand card)
 * focus  : rect keys (from rects.json) the camera visits and rings, in order
 * say    : narration (ElevenLabs)        head/sub/chip: words on screen
 */
export const SCENES = [
  {
    id: '01-intro',
    kind: 'brand',
    chip: { en: 'Session booking portal', ar: 'بوابة حجز الحصص' },
    head: { en: 'Book math sessions\nin a few taps', ar: 'احجزوا حصص الرياضيات\nبخطوات بسيطة' },
    sub: { en: 'For parents · For the center', ar: 'لأولياء الأمور · وللمركز' },
    say: {
      en: 'Meet the new Mathnasium booking portal. Parents book math sessions in a few taps, and the center sees everything, live.',
      ar: 'تعرّفوا على بوابة الحجز الجديدة من ماثنيزيوم. يحجز أولياء الأمور حصص الرياضيات بخطوات بسيطة، ويتابع المركز كل شيء لحظة بلحظة.',
    },
  },
  {
    id: '02-home',
    shot: 'home',
    focus: ['kids', 'child', 'next'],
    chip: { en: 'Parents · 1', ar: 'أولياء الأمور · 1' },
    head: { en: 'Sign in.\nPick your child.', ar: 'سجّلوا الدخول.\nاختاروا طفلكم.' },
    sub: { en: 'Lessons used this month, learning plan and mastery stars — at a glance.', ar: 'الحصص المستخدمة هذا الشهر، خطة التعلّم ونجوم الإتقان — في نظرة واحدة.' },
    say: {
      en: 'A parent signs in and picks their child. Each child shows the lessons used this month, their learning plan, and their mastery stars.',
      ar: 'يسجّل وليّ الأمر الدخول ويختار طفله. تظهر لكل طفل الحصص المستخدمة هذا الشهر، وخطة التعلّم، ونجوم الإتقان.',
    },
  },
  {
    id: '03-book',
    shot: 'times',
    shot2: 'times2',
    focus: ['length', 'days'],
    focus2: ['grid', 'seat'],
    chip: { en: 'Parents · 2', ar: 'أولياء الأمور · 2' },
    head: { en: 'Length. Day. Time.', ar: 'المدة. اليوم. الوقت.' },
    sub: { en: 'Twelve students per hour at most — full times can’t be booked.', ar: 'اثنا عشر طالباً في الساعة كحد أقصى — الأوقات المكتملة لا تُحجز.' },
    say: {
      en: 'Booking takes three steps: the lesson length, the day, and the time. Every hour seats twelve students at most, so a full time simply cannot be booked.',
      ar: 'الحجز بثلاث خطوات: مدة الحصة، ثم اليوم، ثم الوقت. تستقبل كل ساعة اثني عشر طالباً كحد أقصى، لذلك لا يمكن حجز الأوقات المكتملة.',
    },
  },
  {
    id: '04-confirm',
    shot: 'confirm',
    shot2: 'done',
    focus: ['modal'],
    focus2: ['modal'],
    chip: { en: 'Parents · 3', ar: 'أولياء الأمور · 3' },
    head: { en: 'One tap to confirm', ar: 'تأكيد بضغطة واحدة' },
    sub: { en: 'WhatsApp confirmation, and straight into Google Calendar.', ar: 'تأكيد عبر واتساب، وإضافة مباشرة إلى تقويم Google.' },
    say: {
      en: 'One tap to confirm. The parent gets a WhatsApp message, and the lesson goes straight into Google Calendar.',
      ar: 'بضغطة واحدة يتم التأكيد. تصل رسالة واتساب إلى وليّ الأمر، وتُضاف الحصة مباشرة إلى تقويم جوجل.',
    },
  },
  {
    id: '05-limit',
    shot: 'limit',
    focus: ['child', 'notice'],
    chip: { en: 'The 10-lesson rule', ar: 'قاعدة العشر حصص' },
    head: { en: '10 of 10.\nThe month locks.', ar: '10 من 10.\nيُقفل الشهر.' },
    sub: { en: 'Automatic — nobody has to count.', ar: 'تلقائياً — دون أن يعدّ أحد.' },
    say: {
      en: 'Zayed is on the ten lesson plan. The moment his tenth lesson is booked, the month locks, automatically.',
      ar: 'زايد مشترك في باقة العشر حصص. وفور حجز حصته العاشرة، يُقفل الشهر تلقائياً.',
    },
  },
  {
    id: '06-next',
    shot: 'nextmonth',
    focus: ['months', 'child', 'notice'],
    chip: { en: 'The 10-lesson rule', ar: 'قاعدة العشر حصص' },
    head: { en: 'Next month\nopens at 0/10', ar: 'الشهر القادم\nيبدأ من 0/10' },
    sub: { en: 'Booking is open again, instantly.', ar: 'الحجز متاح من جديد، فوراً.' },
    say: {
      en: 'Switch to next month, and the counter starts again at zero. Booking is open.',
      ar: 'وعند الانتقال إلى الشهر القادم، يبدأ العدّاد من صفر، ويصبح الحجز متاحاً.',
    },
  },
  {
    id: '07-cancel',
    shot: 'cancel',
    focus: ['modal'],
    chip: { en: 'Parents · Changes', ar: 'أولياء الأمور · التغييرات' },
    head: { en: 'Plans change', ar: 'قد تتغيّر الخطط' },
    sub: { en: 'Move or cancel up to 24 hours before. The lesson returns to the same month.', ar: 'نقل أو إلغاء قبل 24 ساعة. وتعود الحصة إلى رصيد الشهر نفسه.' },
    say: {
      en: 'Plans change. Parents can move or cancel a lesson up to twenty four hours before, and the lesson goes back to the same month.',
      ar: 'قد تتغيّر الخطط. يمكن نقل الحصة أو إلغاؤها قبل أربع وعشرين ساعة، وتعود الحصة إلى رصيد الشهر نفسه.',
    },
  },
  {
    id: '08-assistant',
    shot: 'assistant',
    focus: ['panel'],
    chip: { en: 'Parents · Help', ar: 'أولياء الأمور · المساعدة' },
    head: { en: 'Questions?\nJust ask.', ar: 'لديكم سؤال؟\nاسألوا فقط.' },
    sub: { en: 'Instant answers about memberships — in English and Arabic.', ar: 'إجابات فورية عن العضوية — بالعربية والإنجليزية.' },
    say: {
      en: 'Questions about membership? A built-in assistant answers instantly, in English and in Arabic.',
      ar: 'لديكم أسئلة عن العضوية؟ مساعد فوري يجيب في الحال، بالعربية والإنجليزية.',
    },
  },
  {
    id: '09-dash',
    shot: 'dash',
    focus: ['kpis', 'today'],
    chip: { en: 'The center · 1', ar: 'المركز · 1' },
    head: { en: 'The whole day,\non one screen', ar: 'اليوم كاملاً\nعلى شاشة واحدة' },
    sub: { en: 'Who is in right now, every hour in pods of four, and how full the day is.', ar: 'من في المركز الآن، وكل ساعة بمجموعات من أربعة، ونسبة الإشغال.' },
    say: {
      en: 'For the center, one dashboard shows the whole day: who is in right now, every hour in pods of four seats, and how full the day is.',
      ar: 'وللمركز، لوحة واحدة تعرض اليوم كاملاً: من في المركز الآن، وكل ساعة بمجموعاتها ومقاعدها، ونسبة الإشغال.',
    },
  },
  {
    id: '10-roster',
    shot: 'roster',
    shot2: 'dash',
    focus: ['drawer'],
    focus2: ['attention'],
    chip: { en: 'The center · 2', ar: 'المركز · 2' },
    head: { en: 'Who’s coming.\nWho needs attention.', ar: 'من سيحضر.\nومن يحتاج متابعة.' },
    sub: { en: 'Children at their limit, and parents waiting for a seat.', ar: 'طلاب بلغوا حدّهم، وأولياء أمور بانتظار مقعد.' },
    say: {
      en: 'Tap any hour to see who is coming. And a clear list shows who needs attention: children at their limit, and parents waiting for a seat.',
      ar: 'اضغطوا على أي ساعة لمعرفة الحاضرين. وتُظهر قائمة واضحة من يحتاج إلى متابعة: طلاب بلغوا حدّهم، وأولياء أمور بانتظار مقعد.',
    },
  },
  {
    id: '11-centers',
    shot: 'dash2',
    shot2: 'week',
    focus: ['centers', 'charts'],
    focus2: ['grid'],
    chip: { en: 'The center · 3', ar: 'المركز · 3' },
    head: { en: 'Five centers.\nOne calendar.', ar: 'خمسة مراكز.\nتقويم واحد.' },
    sub: { en: 'Side by side, always up to date.', ar: 'جنباً إلى جنب، ومحدَّث دائماً.' },
    say: {
      en: 'Five centers, side by side. One calendar, always up to date.',
      ar: 'خمسة مراكز جنباً إلى جنب، وتقويم واحد محدَّث دائماً.',
    },
  },
  {
    id: '12-outro',
    kind: 'brand',
    outro: true,
    chip: { en: 'Demo portal', ar: 'نسخة تجريبية' },
    head: { en: 'We Make Math\nMake Sense®', ar: 'We Make Math\nMake Sense®' },
    sub: { en: 'Simple for parents. Clear for the center.', ar: 'بسيطة لأولياء الأمور. واضحة للمركز.' },
    say: {
      en: 'Mathnasium. Simple for parents. Clear for the center.',
      ar: 'ماثنيزيوم. بسيطة لأولياء الأمور، وواضحة للمركز.',
    },
  },
];
