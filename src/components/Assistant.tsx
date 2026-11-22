/**
 * Parent assistant — answers membership / booking questions.
 *
 * Runs entirely in the browser from a curated knowledge base (facts taken from
 * mathnasium.com/sa-ar and its FAQ, plus this portal's own rules) and the family's live
 * data (lessons used, next lesson). No AI service is called, so it is instant, free and
 * can never invent a price. Anything it cannot answer is handed to the center.
 */
import { LIVE } from '../lib/mode';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import type { Lang, Student } from '../types/domain.ts';
import { addMonths, dubaiNow, fmtTime, formatDate, formatMonth, isPast, toYearMonth } from '../engine/calendar.ts';
import { getMonthlyUsage, type BookingIndex } from '../engine/bookingEngine.ts';
import { centerName, childName, currentAccount, requestUpgrade, useAppState, useIndex, useT } from '../state/store.ts';
import { APlus, cx } from './ui.tsx';

interface Ctx {
  lang: Lang;
  kids: Student[];
  idx: BookingIndex;
  center: string;
}
interface Reply {
  text: string;
  chips?: string[];
  action?: { label: string; run: () => void };
}
interface Intent {
  id: string;
  keys: string[]; // lowercase EN + normalised AR keywords
  chip: [string, string];
  answer: (c: Ctx) => Reply;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[?؟!.,،]/g, ' ');

const L = (c: Ctx, en: string, ar: string) => (c.lang === 'ar' ? ar : en);

function balanceLines(c: Ctx): string {
  const ym = toYearMonth(dubaiNow().date);
  const month = formatMonth(ym, c.lang);
  return c.kids
    .map((k) => {
      const u = getMonthlyUsage(k, ym, c.idx);
      const name = childName(k, c.lang);
      if (u.limit === null) return L(c, `• ${name}: Unlimited membership — ${u.used} lessons booked in ${month}.`, `• ${name}: عضوية غير محدودة — ${u.used} حصص محجوزة في ${month}.`);
      return L(
        c,
        `• ${name}: ${u.used} of 10 used in ${month} — ${u.remaining} left${u.reached ? ' (limit reached)' : ''}.`,
        `• ${name}: تم استخدام ${u.used} من 10 في ${month} — المتبقي ${u.remaining}${u.reached ? ' (تم بلوغ الحد)' : ''}.`,
      );
    })
    .join('\n');
}

const INTENTS: Intent[] = [
  {
    id: 'balance',
    keys: ['how many', 'left', 'remaining', 'balance', 'used', 'lessons do', 'كم حصه', 'المتبقي', 'تبقي', 'رصيد', 'كم باقي', 'استخدم'],
    chip: ['How many lessons are left?', 'كم حصة متبقية؟'],
    answer: (c) => ({ text: L(c, 'Here is this month so far:\n', 'هذا ملخص الشهر الحالي:\n') + balanceLines(c), chips: ['next', 'limit'] }),
  },
  {
    id: 'next',
    keys: ['next lesson', 'next session', 'upcoming', 'when is', 'schedule', 'الحصه القادمه', 'الموعد القادم', 'متي الحصه', 'مواعيد', 'جدول'],
    chip: ['When is the next lesson?', 'متى الحصة القادمة؟'],
    answer: (c) => {
      const now = dubaiNow();
      const lines = c.kids.map((k) => {
        const next = c.idx
          .byStudent(k.id)
          .filter((b) => !isPast(b.date, b.startMin, now))
          .sort((a, b) => (a.date + fmtTime(a.startMin)).localeCompare(b.date + fmtTime(b.startMin)))[0];
        const name = childName(k, c.lang);
        if (!next) return L(c, `• ${name}: nothing booked yet.`, `• ${name}: لا توجد حصة محجوزة.`);
        return `• ${name}: ${formatDate(next.date, c.lang, { weekday: 'long', day: 'numeric', month: 'long' })} · ${fmtTime(next.startMin)}–${fmtTime(next.startMin + next.durationMin)}`;
      });
      return { text: lines.join('\n'), chips: ['cancel', 'book'] };
    },
  },
  {
    id: 'book',
    keys: ['how do i book', 'how to book', 'book a', 'reserve', 'make a booking', 'كيف احجز', 'طريقه الحجز', 'احجز', 'حجز حصه'],
    chip: ['How do I book?', 'كيف أحجز؟'],
    answer: (c) => ({
      text: L(
        c,
        'Booking takes four taps:\n1. Choose your child.\n2. Choose the lesson length (30 min to 2 hours).\n3. Choose a day.\n4. Tap “Book” on any time that still has places.\nYou’ll get a WhatsApp confirmation, and you can add it to your Google Calendar.',
        'الحجز بأربع خطوات:\n1. اختاروا الطفل.\n2. اختاروا مدة الحصة (من 30 دقيقة إلى ساعتين).\n3. اختاروا اليوم.\n4. اضغطوا "احجز" على أي وقت فيه مقاعد.\nستصلكم رسالة تأكيد عبر واتساب، ويمكنكم إضافته إلى تقويم Google.',
      ),
      chips: ['hours', 'full'],
    }),
  },
  {
    id: 'cancel',
    keys: ['cancel', 'reschedule', 'change time', 'move', 'cant come', "can't come", 'miss', 'الغاء', 'الغي', 'تغيير الموعد', 'تاجيل', 'نقل', 'لا استطيع الحضور'],
    chip: ['Can I cancel or change a lesson?', 'هل يمكنني الإلغاء أو تغيير الموعد؟'],
    answer: (c) => ({
      text: L(
        c,
        'Yes. Under “Upcoming lessons” tap “Change time” or “Cancel”, up to 24 hours before the lesson starts.\n• A cancelled lesson goes back to that month’s balance.\n• It must be rebooked in the same month — unused lessons don’t carry over.\n• Less than 24 hours before? Please message the center.',
        'نعم. من "الحصص القادمة" اضغطوا "تغيير الموعد" أو "إلغاء" قبل 24 ساعة على الأقل من بدء الحصة.\n• تعود الحصة الملغاة إلى رصيد نفس الشهر.\n• يجب إعادة حجزها خلال نفس الشهر — الحصص غير المستخدمة لا تُرحَّل.\n• أقل من 24 ساعة؟ يرجى مراسلة المركز.',
      ),
      chips: ['balance', 'human'],
    }),
  },
  {
    id: 'limit',
    keys: ['limit', '10 lessons', 'ten lessons', '10/10', 'blocked', 'why cant i book', "can't book", 'next month', 'الحد', '10 حصص', 'عشر حصص', 'لا استطيع الحجز', 'الشهر القادم', 'محجوب'],
    chip: ['What happens after 10 lessons?', 'ماذا يحدث بعد 10 حصص؟'],
    answer: (c) => {
      const next = formatMonth(addMonths(toYearMonth(dubaiNow().date), 1), c.lang);
      return {
        text: L(
          c,
          `The standard membership includes 10 lessons per calendar month. After the 10th, booking for that month closes for that child. You can already book ${next} — the counter starts again at 0/10. If you’d like more lessons this month, ask about the Unlimited membership.`,
          `تتضمن العضوية الأساسية 10 حصص في الشهر الميلادي. بعد الحصة العاشرة يُغلق الحجز لذلك الشهر لهذا الطفل. يمكنكم من الآن حجز حصص ${next} — يبدأ العدّاد من 0/10. وإذا رغبتم بحصص أكثر هذا الشهر، اسألوا عن العضوية غير المحدودة.`,
        ),
        chips: ['plans', 'balance'],
      };
    },
  },
  {
    id: 'plans',
    keys: ['unlimited', 'upgrade', 'membership', 'subscription', 'plan', 'package', 'difference', 'غير محدود', 'ترقيه', 'عضويه', 'اشتراك', 'باقه', 'الفرق'],
    chip: ['Standard vs Unlimited?', 'الفرق بين الأساسية وغير المحدودة؟'],
    answer: (c) => {
      const kid = c.kids.find((k) => k.membershipTier === 'REGULAR_10');
      return {
        text: L(
          c,
          'There are two memberships:\n• 10 sessions / month — up to 10 lessons each calendar month.\n• Unlimited — book as many lessons as you like; only the 12-seat limit per hour applies.\nMathnasium recommends attending 2–3 times a week. The center can switch a membership at any time.',
          'هناك عضويتان:\n• 10 حصص شهرياً — حتى 10 حصص في كل شهر ميلادي.\n• غير محدودة — احجزوا ما تشاؤون من الحصص، ويُطبَّق فقط حد 12 مقعداً في الساعة.\nتوصي ماثنيزيوم بالحضور 2 إلى 3 مرات أسبوعياً. يمكن للمركز تغيير العضوية في أي وقت.',
        ),
        chips: ['price', 'often'],
        action: kid ? { label: L(c, 'Ask the center about Unlimited', 'اطلبوا معلومات عن غير المحدودة'), run: () => requestUpgrade(kid.id) } : undefined,
      };
    },
  },
  {
    id: 'price',
    keys: ['price', 'cost', 'how much', 'fee', 'fees', 'aed', 'dirham', 'pay', 'payment', 'سعر', 'تكلفه', 'كم يكلف', 'رسوم', 'درهم', 'دفع', 'بكم'],
    chip: ['How much does it cost?', 'كم التكلفة؟'],
    answer: (c) => ({
      text: L(
        c,
        'Prices depend on the programme and the center, so I can’t quote one here. Mathnasium works like a gym membership: a one-time registration fee, then a monthly membership with regular attendance. Your center will share the exact packages.',
        'تختلف الأسعار بحسب البرنامج والمركز، لذلك لا أستطيع تحديد سعر هنا. تعمل ماثنيزيوم على غرار اشتراك النادي الرياضي: رسوم تسجيل لمرة واحدة ثم اشتراك شهري مع حضور منتظم. سيزوّدكم مركزكم بتفاصيل الباقات.',
      ),
      chips: ['plans', 'human'],
    }),
  },
  {
    id: 'hours',
    keys: ['hours', 'open', 'opening', 'close', 'friday', 'weekend', 'saturday', 'sunday', 'what time', 'ساعات العمل', 'متي يفتح', 'دوام', 'الجمعه', 'السبت', 'الاحد', 'اوقات'],
    chip: ['Opening hours?', 'ما هي ساعات العمل؟'],
    answer: (c) => ({
      text: L(
        c,
        `Mathnasium ${c.center} is open:\n• Monday–Thursday: 14:00–19:00\n• Saturday–Sunday: 10:00–15:00\n• Friday: closed\nLessons start on the hour or half hour.`,
        `ماثنيزيوم ${c.center} يعمل:\n• الاثنين–الخميس: 14:00–19:00\n• السبت–الأحد: 10:00–15:00\n• الجمعة: مغلق\nتبدأ الحصص على رأس الساعة أو منتصفها.`,
      ),
      chips: ['book', 'length'],
    }),
  },
  {
    id: 'length',
    keys: ['how long', 'length', 'duration', '30 min', '2 hours', 'two hours', 'مده الحصه', 'كم مده', 'ساعتين', 'نصف ساعه'],
    chip: ['How long is a lesson?', 'كم مدة الحصة؟'],
    answer: (c) => ({
      text: L(
        c,
        'You choose: 30 minutes, 1 hour, 1 h 30 or 2 hours. Each booking counts as one lesson from the monthly 10, whatever its length.',
        'الاختيار لكم: 30 دقيقة، ساعة، ساعة ونصف أو ساعتان. كل حجز يُحتسب حصة واحدة من العشر الشهرية مهما كانت مدته.',
      ),
      chips: ['often', 'book'],
    }),
  },
  {
    id: 'full',
    keys: ['full', 'no places', 'no seats', 'waiting list', 'waitlist', 'notify', '12 students', 'مكتمل', 'لا يوجد مقاعد', 'قائمه الانتظار', 'ابلغوني', '12 طالب'],
    chip: ['What if a time is full?', 'ماذا لو كان الوقت مكتملاً؟'],
    answer: (c) => ({
      text: L(
        c,
        'Each hour welcomes at most 12 students (3 instructor pods of 4), so every child gets real attention. If a time shows “Full”, tap “Notify me” — we’ll WhatsApp you the moment a place opens. You can also turn on “Hide full times”.',
        'تستقبل كل ساعة 12 طالباً كحد أقصى (3 مجموعات من 4) ليحصل كل طفل على اهتمام حقيقي. إذا ظهر الوقت "مكتمل" اضغطوا "أبلغوني" وسنراسلكم عبر واتساب فور توفر مقعد. يمكنكم أيضاً تفعيل "إخفاء الأوقات المكتملة".',
      ),
      chips: ['book', 'hours'],
    }),
  },
  {
    id: 'often',
    keys: ['how often', 'times a week', 'per week', 'frequency', 'how many times', 'كم مره', 'في الاسبوع', 'اسبوعيا'],
    chip: ['How often should my child attend?', 'كم مرة يحضر طفلي؟'],
    answer: (c) => ({
      text: L(
        c,
        'Mathnasium recommends 2–3 sessions a week. Fewer slows results; more can tire the student. Independent studies found improved performance on standardised tests in 20 sessions or fewer.',
        'توصي ماثنيزيوم بالحضور 2 إلى 3 مرات أسبوعياً؛ فقلة الحضور تُبطئ النتائج والإفراط قد يُرهق الطالب. وقد أثبتت دراسات مستقلة تحسّن الأداء في الاختبارات المعيارية خلال 20 جلسة أو أقل.',
      ),
      chips: ['results', 'plans'],
    }),
  },
  {
    id: 'assessment',
    keys: ['assessment', 'evaluation', 'test first', 'first visit', 'start', 'enrol', 'enroll', 'register', 'تقييم', 'اول زياره', 'التسجيل', 'كيف ابدا', 'تسجيل طفل'],
    chip: ['How does a child get started?', 'كيف يبدأ الطفل؟'],
    answer: (c) => ({
      text: L(
        c,
        'Three steps:\n1. A diagnostic assessment (spoken and written) that finds strengths and gaps — it doesn’t feel like a test.\n2. A personalised learning plan built from the results.\n3. Sessions with specially trained instructors, at your child’s own pace.\nTo enrol another child, message your center.',
        'ثلاث خطوات:\n1. تقييم تشخيصي (شفهي وكتابي) يحدد نقاط القوة والفجوات — ولا يبدو كاختبار.\n2. خطة تعلّم مخصصة بناءً على النتائج.\n3. جلسات مع معلمين مدرَّبين وفق وتيرة طفلكم.\nلتسجيل طفل آخر راسلوا مركزكم.',
      ),
      chips: ['method', 'human'],
    }),
  },
  {
    id: 'method',
    keys: ['method', 'how do you teach', 'approach', 'curriculum', 'different', 'tutor', 'منهج', 'طريقه ماثنيزيوم', 'كيف تدرسون', 'يميز', 'مدرس خصوصي'],
    chip: ['What is the Mathnasium Method™?', 'ما هي طريقة ماثنيزيوم™؟'],
    answer: (c) => ({
      text: L(
        c,
        'The Mathnasium Method™ builds mastery through understanding: it starts from what your child already knows, closes gaps, then adds new concepts in sequence. Instruction is face-to-face, every plan is personalised, and instructors are trained to make math fun and build confidence.',
        'تبني طريقة ماثنيزيوم™ الإتقان عبر الفهم: تنطلق مما يعرفه طفلكم، تسدّ الفجوات، ثم تضيف المفاهيم الجديدة بالتسلسل. التعليم وجهاً لوجه، وكل خطة مخصصة، والمعلمون مدرَّبون على جعل الرياضيات ممتعة وبناء الثقة.',
      ),
      chips: ['assessment', 'results'],
    }),
  },
  {
    id: 'homework',
    keys: ['homework', 'school work', 'واجب', 'واجبات', 'الواجبات المنزليه'],
    chip: ['Do you help with homework?', 'هل تساعدون في الواجبات؟'],
    answer: (c) => ({
      text: L(
        c,
        'Yes. Part of each session is set aside for school homework, and instructors make sure your child understands the idea behind each problem. Mathnasium itself gives no extra homework.',
        'نعم. يُخصَّص جزء من كل جلسة للواجبات المدرسية، ويحرص المعلمون على فهم طفلكم للمفهوم وراء كل مسألة. ولا تعطي ماثنيزيوم واجبات إضافية.',
      ),
      chips: ['method', 'often'],
    }),
  },
  {
    id: 'results',
    keys: ['results', 'improve', 'grades', 'does it work', 'progress', 'نتائج', 'تحسن', 'درجات', 'تقدم', 'هل ينفع'],
    chip: ['What results can we expect?', 'ما النتائج المتوقعة؟'],
    answer: (c) => ({
      text: L(
        c,
        'From Mathnasium’s published results:\n• 94% of parents report improved math skills and understanding.\n• 93% see a better attitude towards math.\n• 90% of students saw their school grades improve.',
        'من النتائج المنشورة لماثنيزيوم:\n• 94% من أولياء الأمور أفادوا بتحسّن مهارات وفهم الرياضيات.\n• 93% لاحظوا تحسّن نظرة أطفالهم تجاه الرياضيات.\n• 90% من الطلاب تحسّنت درجاتهم المدرسية.',
      ),
      chips: ['often', 'method'],
    }),
  },
  {
    id: 'ages',
    keys: ['age', 'ages', 'grade', 'grades', 'kindergarten', 'how old', 'sat', 'act', 'igcse', 'advanced', 'gifted', 'عمر', 'اعمار', 'صف', 'روضه', 'متفوق', 'اختبارات'],
    chip: ['Which ages and programmes?', 'ما الأعمار والبرامج؟'],
    answer: (c) => ({
      text: L(
        c,
        'Mathnasium teaches kindergarten to grade 12: catching up, keeping up and getting ahead, plus enrichment for advanced students and preparation for tests such as SAT and ACT.',
        'تخدم ماثنيزيوم الطلاب من رياض الأطفال حتى الصف الثاني عشر: لتعويض التأخر، ومواكبة الصف، والتقدّم، إضافة إلى برامج إثرائية للمتفوقين والتحضير لاختبارات مثل SAT و ACT.',
      ),
      chips: ['assessment', 'method'],
    }),
  },
  {
    id: 'account',
    keys: ['password', 'login', 'log in', 'sign in', 'account', 'username', 'add child', 'another child', 'كلمه المرور', 'تسجيل الدخول', 'حساب', 'اسم المستخدم', 'اضافه طفل'],
    chip: ['Help with my account', 'مساعدة في حسابي'],
    answer: (c) => ({
      text: L(
        c,
        'Accounts are created by your center. To reset a password, change your WhatsApp number or add another child, message the center and they’ll update it for you.',
        'يُنشئ مركزكم الحسابات. لإعادة تعيين كلمة المرور أو تغيير رقم واتساب أو إضافة طفل آخر، راسلوا المركز وسيحدّثها لكم.',
      ),
      chips: ['human'],
    }),
  },
  {
    id: 'human',
    keys: ['human', 'person', 'staff', 'call', 'contact', 'phone', 'whatsapp', 'talk to', 'speak', 'موظف', 'اتصال', 'تواصل', 'واتساب', 'اكلم', 'رقم'],
    chip: ['Talk to the center', 'التواصل مع المركز'],
    answer: (c) => ({
      text: L(
        c,
        `Of course. The team at Mathnasium ${c.center} answers on WhatsApp during opening hours (Mon–Thu 14:00–19:00, Sat–Sun 10:00–15:00). Tell them your child’s name and they’ll help straight away.`,
        `بالتأكيد. فريق ماثنيزيوم ${c.center} يردّ عبر واتساب خلال ساعات العمل (الاثنين–الخميس 14:00–19:00، السبت–الأحد 10:00–15:00). اذكروا اسم طفلكم وسيساعدونكم فوراً.`,
      ),
    }),
  },
];

const byId = (id: string) => INTENTS.find((i) => i.id === id)!;

/**
 * Where the real AI model is reached: an n8n workflow that holds the Gemini key and answers from fixed facts.
 * (This address is not a secret — the key never leaves n8n.) Only used with ?live=1. Override with VITE_ASSISTANT_URL, or set it to
 * "off" to use only the built-in answers. If the call fails or is slow, the built-in answer is shown instead.
 */
const N8N_ASSISTANT = 'https://oussama19.app.n8n.cloud/webhook/mathnasium-assistant';
const configuredUrl: string = import.meta.env.VITE_ASSISTANT_URL ?? N8N_ASSISTANT;
const AI_URL: string = !LIVE || configuredUrl === 'off' ? '' : configuredUrl; // sandbox by default: no fetch unless ?live=1

/** What the model is told about this family (demo data). */
function familyContext(c: Ctx): string {
  const now = dubaiNow();
  const en: Ctx = { ...c, lang: 'en' };
  return [
    `Today in Dubai: ${formatDate(now.date, 'en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${fmtTime(now.minutes)}.`,
    `Center: Mathnasium ${c.center}.`,
    'Lessons this month:',
    balanceLines(en),
    'Next lesson per child:',
    byId('next').answer(en).text,
  ].join('\n');
}

async function askAi(lang: Lang, context: string, messages: { role: 'user' | 'assistant'; text: string }[]): Promise<string | null> {
  if (!AI_URL) return null;
  try {
    const r = await fetch(AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang, context, messages }), signal: AbortSignal.timeout(22000) });
    const j = await r.json();
    return j.ok && j.text ? (j.text as string) : null;
  } catch {
    return null;
  }
}

function reply(text: string, c: Ctx): Reply {
  const q = ` ${norm(text)} `;
  if (/\b(hi|hello|hey|thanks|thank you)\b/.test(q) || /(مرحبا|السلام|اهلا|شكرا)/.test(q)) {
    return { text: L(c, 'Happy to help! What would you like to know?', 'يسعدني مساعدتكم! ماذا تودّون أن تعرفوا؟'), chips: ['balance', 'cancel', 'plans', 'hours'] };
  }
  let best: Intent | null = null;
  let score = 0;
  for (const i of INTENTS) {
    const sc = i.keys.reduce((a, k) => a + (q.includes(norm(k)) ? k.length : 0), 0);
    if (sc > score) [best, score] = [i, sc];
  }
  if (best) return best.answer(c);
  return {
    text: L(
      c,
      'I’m not sure about that one, and I’d rather not guess. I can help with lessons left, booking, cancelling, memberships and opening hours — or the center can answer anything else.',
      'لست متأكداً من ذلك ولا أحب التخمين. أستطيع المساعدة في الحصص المتبقية والحجز والإلغاء والعضويات وساعات العمل — وأي شيء آخر يجيب عنه المركز.',
    ),
    chips: ['balance', 'plans', 'cancel', 'human'],
  };
}

interface Msg {
  id: number;
  from: 'bot' | 'me';
  text: string;
  chips?: string[];
  action?: Reply['action'];
  done?: boolean;
  ai?: boolean;
}

export function Assistant() {
  const s = useAppState();
  const t = useT();
  const idx = useIndex();
  const acc = currentAccount(s);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState('');
  const [ai, setAi] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const kids = s.students.filter((k) => k.parentId === acc?.parentId);
  const ctx: Ctx = { lang: t.lang, kids, idx, center: centerName(kids[0]?.centerId ?? 'motor-city', t.lang) };
  const ar = t.lang === 'ar';

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, typing, open]);

  // Is a real AI model connected? (asked once the chat is opened)
  useEffect(() => {
    if (!open || !AI_URL) return;
    if (/^https?:/.test(AI_URL)) return setAi(true); // hosted endpoint: assume on; each answer falls back if it fails
    fetch(AI_URL)
      .then((r) => r.json())
      .then((j) => setAi(!!j.ok))
      .catch(() => setAi(false));
  }, [open]);

  // Fresh greeting whenever the language changes.
  useEffect(() => {
    setMsgs([
      {
        id: ++seq.current,
        from: 'bot',
        text: ar
          ? 'مرحباً! أنا مساعد ماثنيزيوم. أجيب عن أسئلة العضوية والحجز والحصص المتبقية.'
          : 'Hi! I’m the Mathnasium assistant. Ask me about memberships, booking and lessons left.',
        chips: ['balance', 'limit', 'cancel', 'plans', 'price', 'hours'],
      },
    ]);
  }, [ar]);

  if (!acc || acc.role !== 'PARENT') return null;

  const ask = (text: string) => {
    if (!text.trim() || typing) return;
    setMsgs((m) => [...m, { id: ++seq.current, from: 'me', text: text.trim() }]);
    setInput('');
    setTyping(true);
    const builtIn = reply(text, ctx); // always ready: instant answer, quick replies and actions
    const history = [...msgs.filter((m) => m.id > 1).map((m) => ({ role: m.from === 'me' ? ('user' as const) : ('assistant' as const), text: m.text })), { role: 'user' as const, text: text.trim() }];
    const started = Date.now();
    void (ai ? askAi(t.lang, familyContext(ctx), history) : Promise.resolve(null)).then((aiText) => {
      const show = () => {
        setMsgs((m) => [...m, { id: ++seq.current, from: 'bot', ...builtIn, text: aiText ?? builtIn.text, ai: !!aiText }]);
        setTyping(false);
      };
      setTimeout(show, Math.max(0, 550 - (Date.now() - started)));
    });
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="fixed end-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-brand py-2.5 ps-3 pe-4 text-sm font-semibold text-white shadow-xl shadow-brand/30 transition hover:scale-105 hover:bg-brand-dark">
          <MessageCircle className="size-5" />
          {ar ? 'اسألونا' : 'Ask us'}
        </button>
      )}
      {open && (
        <div className="anim-slide-up fixed inset-x-2 bottom-2 z-50 flex max-h-[min(620px,calc(100vh-1rem))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:end-4 sm:bottom-4 sm:w-[380px]">
          <header className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
            <span className="grid size-10 place-items-center rounded-full bg-white">
              <APlus size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{ar ? 'مساعد ماثنيزيوم' : 'Mathnasium Assistant'}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="live-dot size-1.5 rounded-full bg-emerald-400" /> {ai ? (ar ? 'مساعد ذكي · العضوية والحجز' : 'AI assistant · membership & booking') : ar ? 'ردّ آلي فوري · العضوية والحجز' : 'Instant automated answers · membership & booking'}
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white" aria-label={t('common.close')}>
              <X className="size-5" />
            </button>
          </header>

          <div className="thin-scroll flex-1 space-y-3 overflow-y-auto bg-surface px-3 py-4">
            {msgs.map((m, i) => (
              <div key={m.id} className={cx('anim-fade-up flex flex-col', m.from === 'me' ? 'items-end' : 'items-start')}>
                <div className={cx('max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line', m.from === 'me' ? 'rounded-ee-md bg-brand text-white' : 'rounded-es-md bg-white text-ink shadow-sm ring-1 ring-slate-100')}>{m.text}</div>
                {m.action && (
                  <button
                    disabled={m.done}
                    onClick={() => {
                      m.action!.run();
                      setMsgs((all) => all.map((x) => (x.id === m.id ? { ...x, done: true } : x)));
                    }}
                    className="mt-2 rounded-xl bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-ink-900 disabled:opacity-50"
                  >
                    {m.done ? '✓ ' : ''}
                    {m.action.label}
                  </button>
                )}
                {m.chips && i === msgs.length - 1 && !typing && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.chips.map((id) => {
                      const label = byId(id).chip[ar ? 1 : 0];
                      return (
                        <button key={id} onClick={() => ask(label)} className="rounded-full border border-brand/30 bg-white px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft">
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="typing w-fit rounded-2xl rounded-es-md bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-100">
                <span />
                <span />
                <span />
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={ar ? 'اكتبوا سؤالكم…' : 'Type your question…'} className="flex-1 rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/20" />
            <button type="submit" disabled={!input.trim()} className="grid size-10 place-items-center rounded-xl bg-brand text-white disabled:opacity-30" aria-label="Send">
              <Send className="size-4 rtl:-scale-x-100" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
