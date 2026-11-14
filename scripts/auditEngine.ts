/**
 * Rule audit — run: npm run audit:engine
 * Seed invariants, the 10/10 month boundary, cancel/reschedule rules and the 12-seat lock.
 */
import { CENTERS, generateSeed, PERSONA } from '../src/data/seedData.ts';
import { buildIndex, canParentCancel, checkBooking, commitBooking, commitCancel, commitReschedule, getMonthlyUsage, MONTHLY_LIMIT } from '../src/engine/bookingEngine.ts';
import { addMonths, daysInMonth, dayOfWeek, dubaiNow, hoursOf, isPast, openDaysInMonth, startTimes, toYearMonth } from '../src/engine/calendar.ts';
import type { Booking, LessonDuration, Student } from '../src/types/domain.ts';

let fails = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) fails++;
};

const now = dubaiNow();
const seed = generateSeed(now);
const ym = toYearMonth(now.date);
const next = addMonths(ym, 1);
const st = (id: string) => seed.students.find((s) => s.id === id)!;
let idx = buildIndex(seed.bookings);
console.log(`Dubai ${now.date} ${Math.floor(now.minutes / 60)}:${String(now.minutes % 60).padStart(2, '0')} · ${seed.students.length} students · ${seed.bookings.length} lessons`);

// Seats never exceed 12 in any 30-min block; every day has full / filling / open hours
let maxBlock = 0;
let goodDays = 0;
let days = 0;
const bad: string[] = [];
for (const c of CENTERS)
  for (const m of [ym, next])
    for (const d of openDaysInMonth(m)) {
      days++;
      const occ = hoursOf(d).map((h) => idx.hourOccupancy(c.id, d, h));
      for (const h of hoursOf(d)) maxBlock = Math.max(maxBlock, idx.blockCount(c.id, d, h * 60), idx.blockCount(c.id, d, h * 60 + 30));
      if (occ.includes(12) && occ.some((o) => o >= 9 && o < 12) && occ.some((o) => o <= 8)) goodDays++;
      else bad.push(`${c.id} ${d} [${occ}]`);
    }
check(maxBlock <= 12, `no 30-min block ever exceeds 12 students (max ${maxBlock})`);
check(goodDays === days, `each center/day has a full, a filling-fast and an open hour (${goodDays}/${days})`);
if (bad.length) console.log('      ', bad.slice(0, 6).join(' · '));

let over = 0;
let atLimit = 0;
const vip: number[] = [];
for (const s of seed.students)
  for (const m of [ym, next]) {
    const n = idx.monthlyCount(s.id, m);
    if (s.membershipTier === 'REGULAR_10' && n > MONTHLY_LIMIT) over++;
    if (s.membershipTier === 'REGULAR_10' && n >= MONTHLY_LIMIT && m === ym) atLimit++;
    if (s.membershipTier === 'UNLIMITED') vip.push(n);
  }
check(over === 0, 'no REGULAR_10 student exceeds 10 lessons in a month');
console.log(`      info: ${atLimit} students at 10/10 this month · unlimited max ${Math.max(...vip)}/month`);

check(idx.monthlyCount(PERSONA.ZAYED, ym) === 9, `Zayed 9/10 in ${ym}`);
check(idx.monthlyCount(PERSONA.MARYAM, ym) === 10, `Maryam 10/10 in ${ym}`);
check(idx.monthlyCount(PERSONA.ZAYED, next) === 0 && idx.monthlyCount(PERSONA.MARYAM, next) === 0, `Zayed & Maryam 0/10 in ${next}`);

const find = (s: Student, m: string, dur: LessonDuration, pred: (occ: number) => boolean, bookings = seed.bookings) => {
  const ix = buildIndex(bookings);
  for (const d of openDaysInMonth(m))
    for (const t of startTimes(d, dur)) {
      if (t % 60) continue;
      const req = { centerId: s.centerId, date: d, startMin: t, durationMin: dur };
      if (checkBooking(s, req, ix, now).allowed && pred(ix.hourOccupancy(s.centerId, d, t / 60))) return req;
    }
  return null;
};

// Pitch flow: Zayed books his 10th lesson into an 11/12 hour
const z = st(PERSONA.ZAYED);
const tenth = find(z, ym, 60, (o) => o === 11);
check(!!tenth, 'Zayed has an upcoming 11/12 hour this month');
if (tenth) {
  const r = commitBooking(z, tenth, seed.bookings, now, 'T1', 'PARENT');
  check(r.ok, 'Zayed books lesson 10');
  if (r.ok) {
    idx = buildIndex(r.bookings);
    check(idx.hourOccupancy(z.centerId, tenth.date, tenth.startMin / 60) === 12, 'that hour becomes 12/12 full');
    check(getMonthlyUsage(z, ym, idx).reached, 'Zayed is 10/10 and blocked this month');
    check(find(z, ym, 30, () => true, r.bookings) === null, 'no time left this month for Zayed (any length)');
    check(!getMonthlyUsage(z, next, idx).reached && !!find(z, next, 60, () => true, r.bookings), `${next} is open again (0/10)`);

    const own = r.bookings.find(
      (b) => b.studentId === z.id && b.status === 'CONFIRMED' && !isPast(b.date, b.startMin, now) && toYearMonth(b.date) === ym && canParentCancel(b, now),
    ) as Booking | undefined;
    if (own) {
      const ix = buildIndex(r.bookings);
      let target: { centerId: string; date: string; startMin: number; durationMin: LessonDuration } | null = null;
      for (const d of openDaysInMonth(ym)) {
        for (const t of startTimes(d, own.durationMin)) {
          const req = { centerId: z.centerId, date: d, startMin: t, durationMin: own.durationMin };
          if (checkBooking(z, req, ix, now, own).allowed) {
            target = req;
            break;
          }
        }
        if (target) break;
      }
      check(!!target, 'a 10/10 student can still move a lesson within the month');
      if (target) {
        const mv = commitReschedule(z, own, target, r.bookings, now);
        check(mv.ok && buildIndex(mv.bookings).monthlyCount(z.id, ym) === 10, 'moving keeps the counter at 10/10');
      }
      const nextReq = { centerId: z.centerId, date: openDaysInMonth(next)[3], startMin: hoursOf(openDaysInMonth(next)[3])[0] * 60, durationMin: own.durationMin };
      check(checkBooking(z, nextReq, ix, now, own).reason === 'RESCHEDULE_OTHER_MONTH', 'moving into next month is refused');
      const c = commitCancel(own.id, r.bookings, new Date().toISOString());
      check(buildIndex(c.bookings).monthlyCount(z.id, ym) === 9 && !!find(z, ym, 60, () => true, c.bookings), 'cancelling gives the lesson back for the same month');
    } else console.log('      (cancel/move checks skipped: no Zayed lesson more than 24 h ahead)');
  }
}
check(find(st(PERSONA.MARYAM), ym, 30, () => true) === null, 'Maryam blocked for the whole month');
check(!!find(st(PERSONA.MARYAM), next, 60, () => true), `Maryam can book in ${next}`);
check(!!find(st(PERSONA.RASHID), ym, 120, () => true), 'Rashid (Unlimited) can book a 2-hour lesson');

// 12-seat race on an hour where both halves are 11/12
idx = buildIndex(seed.bookings);
let raced = false;
for (const d of openDaysInMonth(next)) {
  for (const h of hoursOf(d)) {
    if (idx.blockCount('al-barsha', d, h * 60) !== 11 || idx.blockCount('al-barsha', d, h * 60 + 30) !== 11) continue;
    const free = seed.students.filter((s) => s.centerId === 'al-barsha' && s.membershipTier === 'UNLIMITED' && !idx.dayLessons('al-barsha', d).some((b) => b.studentId === s.id));
    const req = { centerId: 'al-barsha', date: d, startMin: h * 60, durationMin: 60 as const };
    const a = commitBooking(free[0], req, seed.bookings, now, 'A', 'PARENT');
    const b = a.ok ? commitBooking(free[1], req, a.bookings, now, 'B', 'PARENT') : a;
    check(a.ok && !b.ok && b.reason === 'FULL', `12-seat lock: first parent gets seat 12, second is refused (${d} ${h}:00)`);
    raced = true;
    break;
  }
  if (raced) break;
}
check(raced, 'found an 11/12 hour to race on');

const friday = daysInMonth(next).find((d) => dayOfWeek(d) === 5)!;
check(checkBooking(st(PERSONA.RASHID), { centerId: 'motor-city', date: friday, startMin: 900, durationMin: 60 }, idx, now).reason === 'CENTER_CLOSED', 'Fridays are closed');
const sat = openDaysInMonth(next).find((d) => dayOfWeek(d) === 6)!;
check(checkBooking(st(PERSONA.RASHID), { centerId: 'motor-city', date: sat, startMin: 14 * 60 + 30, durationMin: 60 }, idx, now).reason === 'OUTSIDE_OPENING_HOURS', 'weekend lessons must end by 15:00');

console.log(fails ? `\n${fails} FAILURE(S)` : '\nAll checks passed.');
process.exit(fails ? 1 : 0);
