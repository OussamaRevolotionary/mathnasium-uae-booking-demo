import { useState } from 'react';
import { CalendarCheck, CircleHelp, Clock, Lightbulb, Moon, Repeat, RotateCw, Sun, Users } from 'lucide-react';
import { ui, useAppState, useT } from '../state/store.ts';
import { Modal, btn, cx } from './ui.tsx';

/** Light / dark switch. */
export function ThemeToggle() {
  const { ui: u } = useAppState();
  const dark = u.theme === 'dark';
  return (
    <button
      onClick={() => ui.setTheme(dark ? 'light' : 'dark')}
      className="grid size-9 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:text-brand"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

// ───────────────────────── Mental-math puzzle ─────────────────────────

interface Puzzle {
  tag: [string, string];
  q: [string, string];
  hint: [string, string];
  answer: string;
  why: [string, string];
}

const PUZZLES: Puzzle[] = [
  {
    tag: ['Number sense', 'الحس العددي'],
    q: ['What is 16 × 25, in your head?', 'كم يساوي 16 × 25 ذهنياً؟'],
    hint: ['25 is 100 ÷ 4 — so divide 16 by 4 first.', '25 هي 100 ÷ 4 — فاقسموا 16 على 4 أولاً.'],
    answer: '400',
    why: ['16 ÷ 4 = 4, then 4 × 100 = 400.', '16 ÷ 4 = 4، ثم 4 × 100 = 400.'],
  },
  {
    tag: ['Fractions', 'الكسور'],
    q: ['What is half of three quarters?', 'كم يساوي نصف ثلاثة أرباع؟'],
    hint: ['Halving doubles the bottom number.', 'التنصيف يضاعف المقام.'],
    answer: '⅜',
    why: ['¾ ÷ 2 = 3 ÷ (4 × 2) = ⅜.', '¾ ÷ 2 = 3 ÷ (4 × 2) = ⅜.'],
  },
  {
    tag: ['Percentages', 'النسب المئوية'],
    q: ['What is 15% of 80?', 'كم تساوي 15% من 80؟'],
    hint: ['Find 10%, then add half of it.', 'أوجدوا 10% ثم أضيفوا نصفها.'],
    answer: '12',
    why: ['10% is 8, 5% is 4, and 8 + 4 = 12.', '10% تساوي 8، و5% تساوي 4، و8 + 4 = 12.'],
  },
  {
    tag: ['Quick multiply', 'الضرب السريع'],
    q: ['What is 99 × 7?', 'كم يساوي 99 × 7؟'],
    hint: ['99 is 100 − 1.', '99 هي 100 − 1.'],
    answer: '693',
    why: ['100 × 7 = 700, minus one 7 = 693.', '100 × 7 = 700، ناقص 7 = 693.'],
  },
  {
    tag: ['Pods and seats', 'المجموعات والمقاعد'],
    q: ['3 pods of 4 seats. 9 are taken. How many are free?', '3 مجموعات في كل منها 4 مقاعد. حُجز 9. كم مقعداً متاحاً؟'],
    hint: ['Multiply first, then subtract.', 'اضربوا أولاً ثم اطرحوا.'],
    answer: '3',
    why: ['3 × 4 = 12 seats, and 12 − 9 = 3.', '3 × 4 = 12 مقعداً، و12 − 9 = 3.'],
  },
];

/** A small taste of the Mathnasium Method on the parent page. */
export function MathPuzzle() {
  const t = useT();
  const ar = t.lang === 'ar';
  const [i, setI] = useState(0);
  const [stage, setStage] = useState<0 | 1 | 2>(0); // 0 question · 1 hint · 2 answer
  const p = PUZZLES[i % PUZZLES.length];
  const pick = (x: [string, string]) => x[ar ? 1 : 0];

  return (
    <section className="puzzle relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-mastery to-brand" />
      <div className="chalk pointer-events-none absolute -end-1 -bottom-3 -rotate-6 text-5xl text-brand/15 select-none" dir="ltr" aria-hidden>
        a² + b² = c²
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-mastery px-2.5 py-0.5 text-[11px] font-bold text-black">✦ {pick(p.tag)}</span>
        <button
          onClick={() => {
            setI(i + 1);
            setStage(0);
          }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand"
        >
          <RotateCw className="size-3.5" /> {ar ? 'لغز آخر' : 'Another one'}
        </button>
      </div>
      <p key={i} className="anim-fade-up relative mt-3 text-base leading-snug font-bold text-ink">
        {pick(p.q)}
      </p>
      {stage >= 1 && (
        <p className="anim-fade-up relative mt-2 flex items-start gap-1.5 text-sm text-amber-700">
          <Lightbulb className="mt-0.5 size-4 shrink-0" /> {pick(p.hint)}
        </p>
      )}
      {stage === 2 ? (
        <div className="anim-pop relative mt-3 rounded-2xl bg-emerald-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-emerald-700" dir="ltr">
              = {p.answer}
            </span>
            <span className="chalk -rotate-6 rounded-md bg-brand px-2 py-0.5 text-lg text-white">A+</span>
          </div>
          <p className="mt-1 text-sm text-emerald-900" dir={ar ? 'rtl' : 'ltr'}>
            {pick(p.why)}
          </p>
        </div>
      ) : (
        <div className="relative mt-3 flex gap-2">
          {stage === 0 && (
            <button onClick={() => setStage(1)} className={cx(btn.outline, 'flex-1 py-2')}>
              <Lightbulb className="size-4 text-amber-500" /> {ar ? 'تلميح' : 'Hint'}
            </button>
          )}
          <button onClick={() => setStage(2)} className={cx(btn.primary, 'flex-1 py-2')}>
            {ar ? 'أظهر الحل' : 'Show answer'}
          </button>
        </div>
      )}
      <p className="relative mt-3 text-[11px] text-slate-400">{ar ? 'لمحة من طريقة ماثنيزيوم™' : 'A taste of the Mathnasium Method™'}</p>
    </section>
  );
}

// ───────────────────────── How booking works ─────────────────────────

export function HowItWorks() {
  const t = useT();
  const ar = t.lang === 'ar';
  const [open, setOpen] = useState(false);
  const rows: { icon: React.ReactNode; en: [string, string]; ar: [string, string] }[] = [
    { icon: <CalendarCheck className="size-5" />, en: ['Book in three steps', 'Choose the lesson length, the day, then a time.'], ar: ['احجزوا بثلاث خطوات', 'اختاروا مدة الحصة، ثم اليوم، ثم الوقت.'] },
    { icon: <Users className="size-5" />, en: ['12 students per hour', 'Small groups, so every child gets attention. A full time can’t be booked — tap “Notify me” instead.'], ar: ['12 طالباً في الساعة', 'مجموعات صغيرة ليحصل كل طفل على الاهتمام. الوقت المكتمل لا يُحجز — اضغطوا "أبلغوني".'] },
    { icon: <Clock className="size-5" />, en: ['Opening hours', 'Monday–Thursday 14:00–19:00 · Saturday–Sunday 10:00–15:00 · Friday closed.'], ar: ['ساعات العمل', 'الاثنين–الخميس 14:00–19:00 · السبت–الأحد 10:00–15:00 · الجمعة مغلق.'] },
    { icon: <span className="text-sm font-bold">10</span>, en: ['10 lessons a month, or Unlimited', 'On the 10-lesson plan, booking closes after the 10th lesson and reopens next month.'], ar: ['10 حصص شهرياً، أو غير محدودة', 'في باقة العشر حصص يُغلق الحجز بعد الحصة العاشرة ويُفتح مجدداً في الشهر التالي.'] },
    { icon: <Repeat className="size-5" />, en: ['Change or cancel', 'Up to 24 hours before. A cancelled lesson returns to the same month.'], ar: ['التغيير أو الإلغاء', 'قبل 24 ساعة على الأقل. تعود الحصة الملغاة إلى رصيد الشهر نفسه.'] },
  ];
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20">
        <CircleHelp className="size-4 text-mastery" /> {ar ? 'كيف يعمل الحجز؟' : 'How booking works'}
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} width="max-w-lg">
          <h3 className="text-xl font-bold text-ink">{ar ? 'كيف يعمل الحجز؟' : 'How booking works'}</h3>
          <ul className="mt-4 space-y-3">
            {rows.map((r, i) => {
              const [title, body] = ar ? r.ar : r.en;
              return (
                <li key={i} className="anim-fade-up flex items-start gap-3" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">{r.icon}</span>
                  <div>
                    <div className="font-semibold text-ink">{title}</div>
                    <div className="text-sm text-slate-500">{body}</div>
                  </div>
                </li>
              );
            })}
          </ul>
          <button onClick={() => setOpen(false)} className={cx(btn.primary, 'mt-6 w-full')}>
            {ar ? 'فهمت' : 'Got it'}
          </button>
        </Modal>
      )}
    </>
  );
}
