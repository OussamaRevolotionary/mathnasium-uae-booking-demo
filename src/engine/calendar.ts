/**
 * Calendar & time utilities — always Gulf Standard Time (Asia/Dubai, UTC+4, no DST),
 * whatever the viewer's browser timezone. Dates travel as `YYYY-MM-DD` strings.
 *
 * Opening hours (Mathnasium UAE):
 *   Mon–Thu 14:00–19:00 · Sat–Sun 10:00–15:00 · Friday closed.
 */
import type { ISODate, YearMonth } from '../types/domain.ts';

export const DUBAI_TZ = 'Asia/Dubai';
export const GST_OFFSET = '+04:00';
export const CAPACITY = 12; // 3 instructor pods × 4 students
export const BLOCK_MIN = 30; // lessons start on the hour or half hour

export const pad2 = (n: number) => String(n).padStart(2, '0');

export interface GstNow {
  date: ISODate;
  minutes: number; // minutes since midnight, GST
}

export function dubaiNow(override?: Date): GstNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DUBAI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(override ?? new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}

const toUtc = (date: ISODate) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fromUtc = (dt: Date): ISODate => `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;

/** 0 = Sunday … 6 = Saturday */
export const dayOfWeek = (date: ISODate) => toUtc(date).getUTCDay();

export function addDays(date: ISODate, n: number): ISODate {
  const dt = toUtc(date);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUtc(dt);
}

export const toYearMonth = (date: ISODate): YearMonth => date.slice(0, 7);

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const [y, m] = ym.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}`;
}

export function daysInMonth(ym: YearMonth): ISODate[] {
  const [y, m] = ym.split('-').map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${ym}-${pad2(i + 1)}`);
}

export const lastDayOfMonth = (ym: YearMonth) => daysInMonth(ym).at(-1)!;

/** Opening window in minutes, or null when the center is closed. */
export function openingHours(date: ISODate): { open: number; close: number } | null {
  const dow = dayOfWeek(date);
  if (dow >= 1 && dow <= 4) return { open: 14 * 60, close: 19 * 60 }; // Mon–Thu
  if (dow === 6 || dow === 0) return { open: 10 * 60, close: 15 * 60 }; // Sat–Sun
  return null; // Friday
}

export const isOpenDay = (date: ISODate) => openingHours(date) !== null;
export const openDaysInMonth = (ym: YearMonth) => daysInMonth(ym).filter(isOpenDay);

/** The hours shown on the center calendar, e.g. [14,15,16,17,18]. */
export function hoursOf(date: ISODate): number[] {
  const oh = openingHours(date);
  if (!oh) return [];
  const out: number[] = [];
  for (let m = oh.open; m < oh.close; m += 60) out.push(m / 60);
  return out;
}

/** Every 30-min block start a lesson covers. */
export function blocksOf(startMin: number, durationMin: number): number[] {
  const out: number[] = [];
  for (let m = startMin; m < startMin + durationMin; m += BLOCK_MIN) out.push(m);
  return out;
}

/** Possible start times for a lesson of `durationMin` on `date`. */
export function startTimes(date: ISODate, durationMin: number): number[] {
  const oh = openingHours(date);
  if (!oh) return [];
  const out: number[] = [];
  for (let m = oh.open; m + durationMin <= oh.close; m += BLOCK_MIN) out.push(m);
  return out;
}

export const isPast = (date: ISODate, startMin: number, now: GstNow) =>
  date < now.date || (date === now.date && startMin <= now.minutes);

/** Minutes from `now` until a lesson starts (can be negative). */
export function minutesUntil(date: ISODate, startMin: number, now: GstNow): number {
  const days = Math.round((toUtc(date).getTime() - toUtc(now.date).getTime()) / 86_400_000);
  return days * 1440 + startMin - now.minutes;
}

export const fmtTime = (min: number) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
export const isoGST = (date: ISODate, min: number) => `${date}T${fmtTime(min)}:00${GST_OFFSET}`;

const locales = { en: 'en-GB', ar: 'ar-AE-u-nu-latn' } as const;

export function formatDate(date: ISODate, lang: 'en' | 'ar', opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locales[lang], { ...opts, timeZone: 'UTC' }).format(toUtc(date));
}

export function formatMonth(ym: YearMonth, lang: 'en' | 'ar', withYear = false): string {
  return formatDate(`${ym}-01`, lang, withYear ? { month: 'long', year: 'numeric' } : { month: 'long' });
}

/** First open day on/after `from` that still has a start time in the future. */
export function firstBookableDay(from: ISODate, now: GstNow): ISODate {
  let d = from;
  for (let i = 0; i < 40; i++) {
    if (startTimes(d, 30).some((m) => !isPast(d, m, now))) return d;
    d = addDays(d, 1);
  }
  return from;
}

export function startOfWeek(date: ISODate): ISODate {
  const dow = dayOfWeek(date);
  return addDays(date, dow === 0 ? -6 : 1 - dow); // Monday
}
