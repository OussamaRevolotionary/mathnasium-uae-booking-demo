/**
 * Pure booking rules — no React, no I/O.
 *
 * SEATS: each center seats at most 12 students at the same time (3 pods × 4).
 *   Lessons last 30–120 min and start on the hour or half hour, so capacity is checked
 *   for every 30-min block a lesson covers. "Hourly occupancy" = the busiest half of that hour.
 * MONTHLY LIMIT: a REGULAR_10 student can hold at most 10 lessons whose date falls in a
 *   calendar month (YYYY-MM, GST). A lesson counts once whatever its length. The counter
 *   is keyed by the lesson's month, so 10/10 in November is automatically 0/10 in December.
 * CANCEL: parents may cancel up to 24 h before the start. The lesson returns to that
 *   month's balance and can only be re-used in the same month (no roll-over).
 * RESCHEDULE: moves a lesson to another free time in the SAME month; the counter is unchanged.
 */
import type {
  Booking,
  BookingCheck,
  ISODate,
  LessonDuration,
  MonthlyUsage,
  OccupancyStatus,
  Student,
  YearMonth,
} from '../types/domain.ts';
import {
  CAPACITY,
  addMonths,
  blocksOf,
  isPast,
  minutesUntil,
  openingHours,
  toYearMonth,
  type GstNow,
} from './calendar.ts';

export const MONTHLY_LIMIT = 10;
export const CANCEL_CUTOFF_HOURS = 24;
export const BOOKING_WINDOW_MONTHS = 1; // this month + next month

export const isActive = (b: Booking) => b.status === 'CONFIRMED';
export const endMin = (b: Pick<Booking, 'startMin' | 'durationMin'>) => b.startMin + b.durationMin;

export function occupancyStatus(booked: number): OccupancyStatus {
  if (booked >= CAPACITY) return 'FULL';
  if (booked >= 9) return 'FILLING_FAST';
  return 'AVAILABLE';
}

// ───────────────────────── Index ─────────────────────────

export interface BookingIndex {
  /** Students present in a 30-min block. */
  blockCount: (centerId: string, date: ISODate, blockMin: number) => number;
  /** Busiest half of the hour → the "X/12" shown on the calendar. */
  hourOccupancy: (centerId: string, date: ISODate, hour: number) => number;
  /** Active lessons overlapping an hour. */
  lessonsInHour: (centerId: string, date: ISODate, hour: number) => Booking[];
  byStudent: (studentId: string) => Booking[];
  monthlyCount: (studentId: string, ym: YearMonth) => number;
  dayLessons: (centerId: string, date: ISODate) => Booking[];
}

export function buildIndex(all: Booking[]): BookingIndex {
  const blocks = new Map<string, number>();
  const days = new Map<string, Booking[]>();
  const students = new Map<string, Booking[]>();
  const months = new Map<string, number>();
  for (const b of all) {
    if (!isActive(b)) continue;
    for (const blk of blocksOf(b.startMin, b.durationMin)) {
      const k = `${b.centerId}|${b.date}|${blk}`;
      blocks.set(k, (blocks.get(k) ?? 0) + 1);
    }
    const dk = `${b.centerId}|${b.date}`;
    (days.get(dk) ?? days.set(dk, []).get(dk)!).push(b);
    (students.get(b.studentId) ?? students.set(b.studentId, []).get(b.studentId)!).push(b);
    const mk = `${b.studentId}|${toYearMonth(b.date)}`;
    months.set(mk, (months.get(mk) ?? 0) + 1);
  }
  const blockCount = (c: string, d: ISODate, m: number) => blocks.get(`${c}|${d}|${m}`) ?? 0;
  return {
    blockCount,
    hourOccupancy: (c, d, h) => Math.max(blockCount(c, d, h * 60), blockCount(c, d, h * 60 + 30)),
    lessonsInHour: (c, d, h) => (days.get(`${c}|${d}`) ?? []).filter((b) => b.startMin < (h + 1) * 60 && endMin(b) > h * 60),
    byStudent: (id) => students.get(id) ?? [],
    monthlyCount: (id, ym) => months.get(`${id}|${ym}`) ?? 0,
    dayLessons: (c, d) => days.get(`${c}|${d}`) ?? [],
  };
}

// ───────────────────────── Queries ─────────────────────────

export function getMonthlyUsage(student: Student, ym: YearMonth, index: BookingIndex): MonthlyUsage {
  const used = index.monthlyCount(student.id, ym);
  if (student.membershipTier === 'UNLIMITED') {
    return { yearMonth: ym, tier: student.membershipTier, used, limit: null, remaining: null, reached: false };
  }
  return {
    yearMonth: ym,
    tier: student.membershipTier,
    used,
    limit: MONTHLY_LIMIT,
    remaining: Math.max(0, MONTHLY_LIMIT - used),
    reached: used >= MONTHLY_LIMIT,
  };
}

/** Free seats for a lesson = the tightest 30-min block it covers. */
export function seatsLeft(centerId: string, date: ISODate, startMin: number, durationMin: number, index: BookingIndex, ignore?: Booking): number {
  let min = CAPACITY;
  for (const blk of blocksOf(startMin, durationMin)) {
    let n = index.blockCount(centerId, date, blk);
    if (ignore && isActive(ignore) && ignore.centerId === centerId && ignore.date === date && blk >= ignore.startMin && blk < endMin(ignore)) n--;
    min = Math.min(min, CAPACITY - n);
  }
  return Math.max(0, min);
}

export interface LessonRequest {
  centerId: string;
  date: ISODate;
  startMin: number;
  durationMin: LessonDuration;
}

/**
 * Single source of truth for "can this child take this lesson?".
 * `reschedule` = the lesson being moved: it is ignored for seats / overlaps / the monthly
 * count, and the new time must stay in the same month.
 */
export function checkBooking(student: Student, req: LessonRequest, index: BookingIndex, now: GstNow, reschedule?: Booking): BookingCheck {
  const free = seatsLeft(req.centerId, req.date, req.startMin, req.durationMin, index, reschedule);
  const deny = (reason: BookingCheck['reason']): BookingCheck => ({ allowed: false, reason, seatsLeft: free });

  const oh = openingHours(req.date);
  if (!oh) return deny('CENTER_CLOSED');
  if (req.startMin < oh.open || req.startMin + req.durationMin > oh.close || req.startMin % 30 !== 0) return deny('OUTSIDE_OPENING_HOURS');
  if (isPast(req.date, req.startMin, now)) return deny('IN_PAST');
  const ym = toYearMonth(req.date);
  if (ym > addMonths(toYearMonth(now.date), BOOKING_WINDOW_MONTHS)) return deny('BEYOND_BOOKING_WINDOW');
  if (reschedule && toYearMonth(reschedule.date) !== ym) return deny('RESCHEDULE_OTHER_MONTH');

  const overlaps = index
    .byStudent(student.id)
    .some((b) => b.id !== reschedule?.id && b.date === req.date && b.startMin < req.startMin + req.durationMin && endMin(b) > req.startMin);
  if (overlaps) return deny('OVERLAPS_OWN_LESSON');

  if (student.membershipTier === 'REGULAR_10' && !reschedule && index.monthlyCount(student.id, ym) >= MONTHLY_LIMIT) {
    return deny('MONTHLY_LIMIT_REACHED');
  }
  if (free <= 0) return deny('FULL');
  return { allowed: true, seatsLeft: free };
}

export function canParentCancel(b: Booking, now: GstNow): boolean {
  return isActive(b) && minutesUntil(b.date, b.startMin, now) >= CANCEL_CUTOFF_HOURS * 60;
}

// ───────────────────────── Atomic commands ─────────────────────────

export type Commit = { ok: true; booking: Booking; bookings: Booking[] } | { ok: false; reason: NonNullable<BookingCheck['reason']> };

/**
 * Check-and-set against the latest committed bookings — the 12-seat lock.
 * Two parents racing for the 12th seat cannot both succeed: the second sees 12/12.
 */
export function commitBooking(student: Student, req: LessonRequest, all: Booking[], now: GstNow, id: string, source: Booking['source']): Commit {
  const check = checkBooking(student, req, buildIndex(all), now);
  if (!check.allowed) return { ok: false, reason: check.reason! };
  const booking: Booking = { id, studentId: student.id, ...req, status: 'CONFIRMED', source, calendarSync: 'PENDING' };
  return { ok: true, booking, bookings: [...all, booking] };
}

export function commitReschedule(student: Student, original: Booking, req: LessonRequest, all: Booking[], now: GstNow): Commit {
  const check = checkBooking(student, req, buildIndex(all), now, original);
  if (!check.allowed) return { ok: false, reason: check.reason! };
  const booking: Booking = { ...original, ...req, calendarSync: 'PENDING' };
  return { ok: true, booking, bookings: all.map((b) => (b.id === original.id ? booking : b)) };
}

export function commitCancel(bookingId: string, all: Booking[], atIso: string) {
  let cancelled: Booking | null = null;
  const bookings = all.map((b) => {
    if (b.id !== bookingId || !isActive(b)) return b;
    cancelled = { ...b, status: 'CANCELLED' as const, cancelledAtIso: atIso, calendarSync: 'PENDING' as const };
    return cancelled;
  });
  return { cancelled: cancelled as Booking | null, bookings };
}

export const googleEventId = (b: Booking) => `mth_${b.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
