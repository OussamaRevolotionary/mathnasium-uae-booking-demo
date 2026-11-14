/**
 * Deterministic, date-relative demo data for five Mathnasium Dubai centers.
 *
 * Covers the whole current month and next month (GST). Each open day has, per center,
 * one full hour (12/12), an 11/12 and a 10/12 hour, plus open hours. Lessons are mostly
 * 1 h, with some 30-min, 90-min and 2-h lessons, all respecting the 12-seat rule and
 * the 10-lessons/month rule.
 *
 * Pitch personas (Al Mansoori family, Mathnasium Motor City):
 *   Zayed  — REGULAR_10, exactly 9/10 this month, 0 next month.
 *   Maryam — REGULAR_10, exactly 10/10 this month (blocked), 0 next month.
 *   Rashid — UNLIMITED.
 */
import type { Account, Booking, Center, ISODate, LessonDuration, Parent, Student, WaitlistEntry, YearMonth } from '../types/domain.ts';
import { addMonths, hoursOf, isPast, openDaysInMonth, toYearMonth, type GstNow } from '../engine/calendar.ts';
import { MONTHLY_LIMIT } from '../engine/bookingEngine.ts';

export const CENTERS: Center[] = [
  { id: 'motor-city', name: 'Motor City', nameAr: 'موتور سيتي' },
  { id: 'al-barsha', name: 'Al Barsha', nameAr: 'البرشاء' },
  { id: 'nad-al-sheba', name: 'Nad Al Sheba', nameAr: 'ند الشبا' },
  { id: 'knowledge-village', name: 'Knowledge Village', nameAr: 'قرية المعرفة' },
  { id: 'villa-ponderosa', name: 'Villa Ponderosa', nameAr: 'فيلا بونديروزا' },
];

export const FAMILY_PARENT_ID = 'par-almansoori';
export const PERSONA = { ZAYED: 'stu-zayed', MARYAM: 'stu-maryam', RASHID: 'stu-rashid' } as const;
const FAMILY_IDS: string[] = Object.values(PERSONA);

/** Demo logins (front-end demo only). */
export const DEMO_LOGINS = {
  parent: { username: 'almansoori', password: 'Mathnasium2026' },
  staff: { username: 'director', password: 'Mathnasium2026' },
} as const;

// ───────────────────────── RNG ─────────────────────────

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(arr: T[], r: () => number) => arr[Math.floor(r() * arr.length)];

function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ───────────────────────── Names ─────────────────────────

type N = [string, string];
const EM_FIRST: N[] = [['Saeed', 'سعيد'], ['Hamdan', 'حمدان'], ['Shamma', 'شمّة'], ['Hessa', 'حصة'], ['Khalifa', 'خليفة'], ['Latifa', 'لطيفة'], ['Sultan', 'سلطان'], ['Mahra', 'مهرة'], ['Abdullah', 'عبدالله'], ['Noura', 'نورة'], ['Ahmed', 'أحمد'], ['Alya', 'عالية'], ['Majid', 'ماجد'], ['Fatima', 'فاطمة'], ['Hazza', 'هزاع'], ['Reem', 'ريم'], ['Mohammed', 'محمد'], ['Salama', 'سلامة'], ['Obaid', 'عبيد'], ['Meera', 'ميرة']];
const EM_LAST: N[] = [['Al Falasi', 'الفلاسي'], ['Al Ketbi', 'الكتبي'], ['Al Shamsi', 'الشامسي'], ['Al Mazrouei', 'المزروعي'], ['Al Suwaidi', 'السويدي'], ['Al Hammadi', 'الحمادي'], ['Al Muhairi', 'المهيري'], ['Al Zaabi', 'الزعابي'], ['Al Marri', 'المري'], ['Al Nuaimi', 'النعيمي'], ['Al Dhaheri', 'الظاهري'], ['Al Qubaisi', 'القبيسي'], ['Al Kaabi', 'الكعبي'], ['Al Romaithi', 'الرميثي'], ['Al Ali', 'العلي'], ['Al Blooshi', 'البلوشي']];
const EX_FIRST: N[] = [['Aarav', 'آراف'], ['Priya', 'بريا'], ['Arjun', 'أرجون'], ['Oliver', 'أوليفر'], ['Chloe', 'كلوي'], ['Sophia', 'صوفيا'], ['Lucas', 'لوكاس'], ['Amira', 'أميرة'], ['Yusuf', 'يوسف'], ['Zara', 'زارا'], ['Layla', 'ليلى'], ['Omar', 'عمر'], ['Daniel', 'دانيال'], ['Ethan', 'إيثان'], ['Isabella', 'إيزابيلا'], ['Noah', 'نوح'], ['Mei', 'مي'], ['Ivan', 'إيفان'], ['Karim', 'كريم'], ['Aisha', 'عائشة'], ['Rania', 'رانيا'], ['Leo', 'ليو'], ['Sara', 'سارة'], ['Tariq', 'طارق'], ['Maya', 'مايا'], ['Jad', 'جاد'], ['Elena', 'إيلينا'], ['Ali', 'علي'], ['Hana', 'هناء'], ['Adam', 'آدم']];
const EX_LAST: N[] = [['Sharma', 'شارما'], ['Nair', 'ناير'], ['Menon', 'مينون'], ['Bennett', 'بينيت'], ['Williams', 'ويليامز'], ['Rossi', 'روسي'], ['Moreau', 'مورو'], ['Haddad', 'حداد'], ['Khan', 'خان'], ['Ahmed', 'أحمد'], ['Mansour', 'منصور'], ['Farouk', 'فاروق'], ['Kim', 'كيم'], ['Clarke', 'كلارك'], ['Garcia', 'غارسيا'], ['Fischer', 'فيشر'], ['Lin', 'لين'], ['Petrov', 'بتروف'], ['Benali', 'بن علي'], ['Okafor', 'أوكافور'], ['Aziz', 'عزيز'], ['Khoury', 'خوري'], ['Siddiqui', 'صديقي'], ['Nasser', 'ناصر'], ['Saleh', 'صالح']];
const EM_PARENT: N[] = [['Khalfan', 'خلفان'], ['Juma', 'جمعة'], ['Hamad', 'حمد'], ['Moza', 'موزة'], ['Amna', 'آمنة'], ['Saif', 'سيف'], ['Shaikha', 'شيخة'], ['Rashed', 'راشد']];
const EX_PARENT: N[] = [['Rohan', 'روهان'], ['Sarah', 'سارة'], ['James', 'جيمس'], ['Nadine', 'نادين'], ['Imran', 'عمران'], ['Rami', 'رامي'], ['Wei', 'وي'], ['Olga', 'أولغا'], ['Hany', 'هاني'], ['Lucia', 'لوسيا']];

function topicForGrade(grade: number, r: () => number): string {
  if (grade <= 3) return pick(['NUMBER_SENSE', 'MULTIPLICATION'], r);
  if (grade <= 6) return pick(['FRACTIONS', 'DECIMALS', 'WORD_PROBLEMS'], r);
  if (grade <= 8) return pick(['PRE_ALGEBRA', 'GEOMETRY'], r);
  if (grade <= 10) return pick(['ALGEBRA_1', 'IGCSE'], r);
  return pick(['IGCSE', 'SAT'], r);
}

const STUDENTS_PER_CENTER = 140;

function buildPeople() {
  const parents: Parent[] = [
    { id: FAMILY_PARENT_ID, fullName: 'Khalid Al Mansoori', fullNameAr: 'خالد المنصوري', whatsapp: '+971501234567', email: 'khalid.almansoori@example.ae', preferredLang: 'ar' },
  ];
  const students: Student[] = [
    { id: PERSONA.ZAYED, firstName: 'Zayed', lastName: 'Al Mansoori', firstNameAr: 'زايد', lastNameAr: 'المنصوري', grade: 8, membershipTier: 'REGULAR_10', parentId: FAMILY_PARENT_ID, centerId: 'motor-city', topic: 'PRE_ALGEBRA', masteryStars: 14, avatarHue: 205 },
    { id: PERSONA.MARYAM, firstName: 'Maryam', lastName: 'Al Mansoori', firstNameAr: 'مريم', lastNameAr: 'المنصوري', grade: 5, membershipTier: 'REGULAR_10', parentId: FAMILY_PARENT_ID, centerId: 'motor-city', topic: 'FRACTIONS', masteryStars: 22, avatarHue: 330 },
    { id: PERSONA.RASHID, firstName: 'Rashid', lastName: 'Al Mansoori', firstNameAr: 'راشد', lastNameAr: 'المنصوري', grade: 10, membershipTier: 'UNLIMITED', parentId: FAMILY_PARENT_ID, centerId: 'motor-city', topic: 'IGCSE', masteryStars: 31, avatarHue: 35 },
  ];
  const accounts: Account[] = [
    { id: 'acc-parent-demo', role: 'PARENT', ...DEMO_LOGINS.parent, parentId: FAMILY_PARENT_ID, displayName: 'Khalid Al Mansoori' },
    { id: 'acc-staff-demo', role: 'STAFF', ...DEMO_LOGINS.staff, displayName: 'Center Director' },
  ];

  CENTERS.forEach((c, ci) => {
    const r = rng(`people|${c.id}`);
    const used = new Set<string>();
    let n = 0;
    while (n < STUDENTS_PER_CENTER) {
      const emirati = r() < 0.4;
      const first = pick(emirati ? EM_FIRST : EX_FIRST, r);
      const last = pick(emirati ? EM_LAST : EX_LAST, r);
      const key = `${first[0]}|${last[0]}`;
      if (used.has(key)) continue;
      used.add(key);
      n++;
      const code = `${ci + 1}${String(n).padStart(3, '0')}`;
      const pFirst = pick(emirati ? EM_PARENT : EX_PARENT, r);
      const pid = `par-${code}`;
      const grade = 1 + Math.floor(r() * 12);
      parents.push({
        id: pid,
        fullName: `${pFirst[0]} ${last[0]}`,
        fullNameAr: `${pFirst[1]} ${last[1]}`,
        whatsapp: `+97150${String(1000000 + ((hash(code) % 8999999) | 0)).slice(-7)}`,
        email: `${pFirst[0]}.${last[0]}`.toLowerCase().replace(/[^a-z.]/g, '') + '@example.ae',
        preferredLang: emirati ? 'ar' : 'en',
      });
      students.push({
        id: `stu-${code}`,
        firstName: first[0],
        lastName: last[0],
        firstNameAr: first[1],
        lastNameAr: last[1],
        grade,
        membershipTier: r() < 0.4 ? 'REGULAR_10' : 'UNLIMITED',
        parentId: pid,
        centerId: c.id,
        topic: topicForGrade(grade, r),
        masteryStars: Math.floor(r() * 40),
        avatarHue: Math.floor(r() * 360),
      });
      accounts.push({
        id: `acc-${code}`,
        role: 'PARENT',
        username: `${pFirst[0]}.${last[0]}`.toLowerCase().replace(/[^a-z.]/g, '') + code.slice(-2),
        password: `Temp-${code}`,
        parentId: pid,
        displayName: `${pFirst[0]} ${last[0]}`,
      });
    }
  });
  return { parents, students, accounts };
}

// ───────────────────────── Calendar ─────────────────────────

export interface SeedData {
  generatedFor: YearMonth;
  parents: Parent[];
  students: Student[];
  accounts: Account[];
  bookings: Booking[];
  waitlist: WaitlistEntry[];
}

export function generateSeed(now: GstNow): SeedData {
  const { parents, students, accounts } = buildPeople();
  const ym = toYearMonth(now.date);
  const months = [ym, addMonths(ym, 1)];
  const bookings: Booking[] = [];
  const waitlist: WaitlistEntry[] = [];
  const block = new Map<string, number>(); // center|date|minute → students present
  const dayTaken = new Set<string>(); // student|date (one lesson per child per day in seed)
  const usage = new Map<string, number>(); // student|YYYY-MM
  const byId = new Map(students.map((s) => [s.id, s]));
  let seq = 0;

  const bc = (c: string, d: ISODate, m: number) => block.get(`${c}|${d}|${m}`) ?? 0;

  const canTake = (s: Student, date: ISODate) => {
    if (dayTaken.has(`${s.id}|${date}`)) return false;
    const u = usage.get(`${s.id}|${toYearMonth(date)}`) ?? 0;
    if (s.membershipTier === 'REGULAR_10' && u >= MONTHLY_LIMIT) return false;
    if (!FAMILY_IDS.includes(s.id)) {
      // personal monthly appetite, so only a few roster students hit 10/10
      const h = hash(`${s.id}|${toYearMonth(date)}`);
      const cap = s.membershipTier === 'REGULAR_10' ? 5 + (h % 6) : 10 + (h % 13);
      if (u >= cap) return false;
    }
    return true;
  };

  const add = (s: Student, date: ISODate, startMin: number, durationMin: LessonDuration) => {
    for (let m = startMin; m < startMin + durationMin; m += 30) {
      const k = `${s.centerId}|${date}|${m}`;
      block.set(k, (block.get(k) ?? 0) + 1);
    }
    dayTaken.add(`${s.id}|${date}`);
    const uk = `${s.id}|${toYearMonth(date)}`;
    usage.set(uk, (usage.get(uk) ?? 0) + 1);
    bookings.push({
      id: `BK${(++seq).toString(36).toUpperCase().padStart(5, '0')}`,
      studentId: s.id,
      centerId: s.centerId,
      date,
      startMin,
      durationMin,
      status: 'CONFIRMED',
      source: 'SEED',
      calendarSync: 'SYNCED',
    });
  };

  // Hourly targets per center/day: one 12, one 11, one 10, two open hours.
  const target = new Map<string, number>();
  for (const c of CENTERS) {
    for (const m of months) {
      for (const d of openDaysInMonth(m)) {
        const r = rng(`target|${c.id}|${d}`);
        const pattern = shuffle([12, 11, 10, 4 + Math.floor(r() * 4), 3 + Math.floor(r() * 5)], r);
        hoursOf(d).forEach((h, i) => target.set(`${c.id}|${d}|${h}`, pattern[i]));
      }
    }
  }
  const tgt = (c: string, d: ISODate, h: number) => target.get(`${c}|${d}|${h}`) ?? 0;

  // 1) Personas first — exact counts, 1-hour lessons spread through the month.
  const spread = (id: string, m: YearMonth, count: number, offset: number) => {
    const s = byId.get(id)!;
    const days = openDaysInMonth(m);
    for (let k = 0; k < count; k++) {
      const d = days[Math.min(days.length - 1, Math.floor(((k + 0.5) * days.length) / count))];
      const hours = hoursOf(d);
      add(s, d, hours[(k * 2 + offset) % hours.length] * 60, 60);
    }
  };
  spread(PERSONA.ZAYED, ym, 9, 1);
  spread(PERSONA.MARYAM, ym, 10, 3);
  spread(PERSONA.RASHID, ym, 7, 0);
  spread(PERSONA.RASHID, months[1], 3, 2);

  // 2) Fill every hour of every center to its target.
  for (const c of CENTERS) {
    const pool = students.filter((s) => s.centerId === c.id && !FAMILY_IDS.includes(s.id));
    for (const m of months) {
      for (const d of openDaysInMonth(m)) {
        const hours = hoursOf(d);
        hours.forEach((h, hi) => {
          const T = tgt(c.id, d, h);
          const r = rng(`fill|${c.id}|${d}|${h}`);
          const candidates = shuffle(pool, r).filter((s) => canTake(s, d));
          let ci = 0;
          const next = () => {
            while (ci < candidates.length && !canTake(candidates[ci], d)) ci++;
            return candidates[ci++];
          };
          const b0 = h * 60;
          const b1 = h * 60 + 30;
          const nextH = hours[hi + 1];
          for (let guard = 0; guard < 40 && (bc(c.id, d, b0) < T || bc(c.id, d, b1) < T); guard++) {
            const s = next();
            if (!s) break;
            const both = bc(c.id, d, b0) < T && bc(c.id, d, b1) < T;
            const roomNext = nextH !== undefined && bc(c.id, d, nextH * 60) < tgt(c.id, d, nextH) && bc(c.id, d, nextH * 60 + 30) < tgt(c.id, d, nextH);
            const x = r();
            if (both && roomNext && x < 0.12) add(s, d, b0, 120);
            else if (both && roomNext && x < 0.2 && bc(c.id, d, nextH * 60) < tgt(c.id, d, nextH)) add(s, d, b0, 90);
            else if (both && x < 0.3) {
              add(s, d, b0, 30); // two 30-min students share one seat across the hour
              const s2 = next();
              if (s2) add(s2, d, b1, 30);
            } else if (both) add(s, d, b0, 60);
            else if (bc(c.id, d, b0) < T) add(s, d, b0, 30);
            else add(s, d, b1, 30);
          }
        });
      }
    }
  }

  // 3) A few parents waiting for a place in upcoming full hours.
  for (const [key, T] of target) {
    if (T < 12) continue;
    const [centerId, date, hh] = key.split('|');
    const startMin = Number(hh) * 60;
    if (isPast(date, startMin, now)) continue;
    const r = rng(`wait|${key}`);
    if (r() > 0.3) continue;
    const s = pick(students.filter((x) => x.centerId === centerId && !FAMILY_IDS.includes(x.id)), r);
    waitlist.push({ id: `WL-${key}`, studentId: s.id, centerId, date, startMin, durationMin: 60, createdAtIso: `${now.date}T08:00:00+04:00` });
  }

  return { generatedFor: ym, parents, students, accounts, bookings, waitlist };
}
