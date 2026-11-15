import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  Check,
  ChevronRight,
  Clock,
  Infinity as InfinityIcon,
  MapPin,
  MessageCircle,
  Repeat,
  Search,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import type { ISODate, LessonDuration, Student } from '../types/domain.ts';
import { CENTERS } from '../data/seedData.ts';
import {
  CAPACITY,
  addDays,
  addMonths,
  dubaiNow,
  fmtTime,
  formatDate,
  formatMonth,
  hoursOf,
  isOpenDay,
  isPast,
  openDaysInMonth,
  openingHours,
  startOfWeek,
  startTimes,
  toYearMonth,
} from '../engine/calendar.ts';
import { checkBooking, getMonthlyUsage, occupancyStatus, type BookingIndex } from '../engine/bookingEngine.ts';
import { bookLesson, childName, parentName, ui, useAppState, useIndex, useT, centerFull } from '../state/store.ts';
import { topicLabel } from '../i18n/translations.ts';
import { Roster, SyncBadge, nextOpenDay } from './StaffPages.tsx';
import { CountUp, Hero } from './MathField.tsx';
import { Avatar, Drawer, SeatPods, TierBadge, btn, cx } from './ui.tsx';

/** Seats used / available for a center on a date (seat-hours). */
function dayFill(idx: BookingIndex, center: string, date: ISODate) {
  const hours = hoursOf(date);
  const used = hours.reduce((a, h) => a + idx.hourOccupancy(center, date, h), 0);
  const total = hours.length * CAPACITY;
  return { used, total, pct: total ? Math.round((used / total) * 100) : 0, full: hours.filter((h) => idx.hourOccupancy(center, date, h) >= CAPACITY).length, hours: hours.length };
}

function useNow() {
  const [now, setNow] = useState(dubaiNow());
  useEffect(() => {
    const id = setInterval(() => setNow(dubaiNow()), 20_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <section className={cx('rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className)}>{children}</section>
);

const CardTitle = ({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) => (
  <div className="mb-4 flex items-center gap-2">
    <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-ink">{icon}</span>
    <h2 className="font-semibold text-ink">{title}</h2>
    <div className="ms-auto">{right}</div>
  </div>
);

export function StaffDashboard() {
  const s = useAppState();
  const t = useT();
  const idx = useIndex();
  const now = useNow();
  const L = (en: string, ar: string) => (t.lang === 'ar' ? ar : en);
  const center = s.ui.staffCenter;
  const [roster, setRoster] = useState<{ date: ISODate; hour: number } | null>(null);
  const [booking, setBooking] = useState<Student | 'search' | null>(null);
  const [q, setQ] = useState('');

  const today = isOpenDay(now.date) ? now.date : nextOpenDay(now.date, 1);
  const isToday = today === now.date;
  const oh = openingHours(today)!;
  const openNow = isToday && now.minutes >= oh.open && now.minutes < oh.close;
  const inCenter = openNow ? idx.blockCount(center, today, Math.floor(now.minutes / 30) * 30) : 0;
  const fill = dayFill(idx, center, today);
  const ym = toYearMonth(today);
  const kids = useMemo(() => s.students.filter((k) => k.centerId === center), [s.students, center]);

  const atLimit = kids.filter((k) => getMonthlyUsage(k, ym, idx).reached);
  const oneLeft = kids.filter((k) => getMonthlyUsage(k, ym, idx).remaining === 1);
  const waiting = s.waitlist.filter((w) => w.centerId === center && !isPast(w.date, w.startMin, now)).sort((a, b) => (a.date + a.startMin).localeCompare(b.date + b.startMin));
  const upgrades = s.upgradeRequests.map((id) => s.students.find((k) => k.id === id)).filter((k): k is Student => !!k && k.centerId === center);
  const syncFailed = s.syncLog.filter((e) => e.status === 'FAILED').length;

  const nextHour = hoursOf(today).find((h) => !isPast(today, h * 60 + 59, now));
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(today), i));
  const monthDays = openDaysInMonth(ym);
  const monthAvg = Math.round(monthDays.reduce((a, d) => a + dayFill(idx, center, d).pct, 0) / monthDays.length);

  const results = q.trim().length >= 2 ? kids.filter((k) => `${k.firstName} ${k.lastName} ${k.firstNameAr} ${k.lastNameAr}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : [];

  return (
    <div>
      <Hero>
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase">
            <span className={cx('size-2 rounded-full', openNow ? 'live-dot bg-emerald-400' : 'bg-white/30')} />
            {openNow ? L('Open now', 'مفتوح الآن') : L('Closed now', 'مغلق الآن')} · <span dir="ltr">{fmtTime(now.minutes)} GST</span>
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{centerFull(center, t.lang)}</h1>
          <p className="mt-1 text-sm text-white/60">
            {isToday ? L('Today', 'اليوم') : L('Next open day', 'يوم العمل القادم')} · {formatDate(today, t.lang, { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
            <span dir="ltr">
              {fmtTime(oh.open)}–{fmtTime(oh.close)}
            </span>
          </p>
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <SyncBadge />
          <div className="relative">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
              <Search className="size-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('Find a student…', 'ابحث عن طالب…')} className="w-40 bg-transparent py-2.5 text-sm outline-none sm:w-52" />
            </label>
            {results.length > 0 && (
              <ul className="anim-pop absolute end-0 z-30 mt-1 w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {results.map((k) => {
                  const u = getMonthlyUsage(k, ym, idx);
                  return (
                    <li key={k.id}>
                      <button
                        onClick={() => {
                          setBooking(k);
                          setQ('');
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-start hover:bg-slate-50"
                      >
                        <Avatar s={k} size={30} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{childName(k, t.lang, true)}</span>
                          <span className="block text-[11px] text-slate-500">
                            {t('grade', { n: k.grade })} · <span dir="ltr">{u.used}/{u.limit ?? '∞'}</span>
                          </span>
                        </span>
                        <CalendarPlus className="size-4 text-brand" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <button onClick={() => setBooking('search')} className={btn.primary}>
            <CalendarPlus className="size-4" /> {L('Book for a parent', 'حجز لوليّ أمر')}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi tone="emerald" icon={<Users className="size-4" />} label={L('In the center now', 'في المركز الآن')} value={openNow ? `${inCenter}/12` : '—'} sub={openNow ? L('students right now', 'طالب حالياً') : isToday && now.minutes >= oh.close ? L('closed for today', 'انتهى دوام اليوم') : L(`opens ${fmtTime(oh.open)}`, `يفتح ${fmtTime(oh.open)}`)} />
        <Kpi tone="ink" icon={<CalendarCheck className="size-4" />} label={L('Lessons today', 'حصص اليوم')} value={idx.dayLessons(center, today).length} sub={`${fill.full}/${fill.hours} ${L('hours full', 'ساعات مكتملة')}`} />
        <Kpi tone="brand" icon={<TrendingUp className="size-4" />} label={L('Seats filled today', 'نسبة الإشغال اليوم')} value={`${fill.pct}%`} sub={`${fill.used}/${fill.total} ${L('seat-hours', 'مقعد/ساعة')}`} bar={fill.pct} />
        <Kpi tone="sky" icon={<Sparkles className="size-4" />} label={L('Free seats left', 'المقاعد المتاحة')} value={fill.total - fill.used} sub={L('still bookable today', 'يمكن حجزها اليوم')} />
        <Kpi tone="amber" icon={<MessageCircle className="size-4" />} label={L('Waiting for a seat', 'بانتظار مقعد')} value={waiting.length} sub={L('parents to notify', 'أولياء أمور للتنبيه')} />
      </div>

      </Hero>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Today timeline */}
          <Card>
            <CardTitle
              icon={<Clock className="size-4" />}
              title={L('Today, hour by hour', 'اليوم ساعة بساعة')}
              right={
                <button onClick={() => (ui.setDate(today), ui.setStaffTab('CALENDAR'))} className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                  {L('Full calendar', 'التقويم الكامل')} <ChevronRight className="size-3.5 rtl:rotate-180" />
                </button>
              }
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {hoursOf(today).map((h, i) => {
                const occ = idx.hourOccupancy(center, today, h);
                const st = occupancyStatus(occ);
                const past = isToday && isPast(today, h * 60 + 59, now);
                const current = openNow && Math.floor(now.minutes / 60) === h;
                return (
                  <button
                    key={h}
                    onClick={() => setRoster({ date: today, hour: h })}
                    className={cx(
                      'anim-fade-up relative rounded-2xl border p-3 text-start transition hover:-translate-y-0.5 hover:shadow-md',
                      current ? 'now-sweep border-ink ring-2 ring-ink/10' : 'border-slate-200',
                      past && 'opacity-50',
                    )}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    {current && <span className="accent absolute -top-2 start-3 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">{L('NOW', 'الآن')}</span>}
                    {!current && h === nextHour && !openNow && <span className="absolute -top-2 start-3 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">{L('NEXT', 'التالي')}</span>}
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-ink tabular-nums" dir="ltr">
                        {fmtTime(h * 60)}
                      </span>
                      <span className={cx('text-lg font-bold tabular-nums', st === 'FULL' ? 'text-brand' : st === 'FILLING_FAST' ? 'text-amber-500' : 'text-emerald-600')} dir="ltr">
                        {occ}
                        <span className="text-xs text-slate-400">/12</span>
                      </span>
                    </div>
                    <div className="mt-2">
                      <SeatPods booked={occ} status={st} size="sm" />
                    </div>
                    <div className="mt-2 text-[11px] font-medium text-slate-500">
                      {st === 'FULL' ? L('Full — 3 pods', 'مكتمل — 3 مجموعات') : `${12 - occ} ${L('free', 'متاح')}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Week heatmap + month trend */}
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardTitle icon={<Activity className="size-4" />} title={L('This week', 'هذا الأسبوع')} />
              <div className="grid gap-1" style={{ gridTemplateColumns: '34px repeat(7, 1fr)' }}>
                <div />
                {week.map((d) => (
                  <div key={d} className={cx('text-center text-[10px] font-semibold', d === today ? 'text-brand' : 'text-slate-400')}>
                    {formatDate(d, t.lang, { weekday: 'narrow' })}
                    <div className="text-xs text-ink">{Number(d.slice(8))}</div>
                  </div>
                ))}
                {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => (
                  <HeatRow key={h} h={h} week={week} center={center} idx={idx} onOpen={setRoster} />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500">
                <Legend c="bg-emerald-100" l={L('Open', 'متاح')} />
                <Legend c="bg-emerald-300" l="5+" />
                <Legend c="bg-mastery" l="9–11" />
                <Legend c="bg-brand" l="12/12" />
              </div>
            </Card>

            <Card>
              <CardTitle icon={<TrendingUp className="size-4" />} title={`${L('Fill rate', 'نسبة الإشغال')} · ${formatMonth(ym, t.lang)}`} right={<span className="text-sm font-bold text-ink">{monthAvg}%</span>} />
              <div className="flex h-36 items-end gap-[3px]" dir="ltr">
                {monthDays.map((d, i) => {
                  const f = dayFill(idx, center, d);
                  return (
                    <div key={d} className="group relative flex h-full flex-1 items-end" title={`${formatDate(d, t.lang, { weekday: 'short', day: 'numeric' })} · ${f.pct}%`}>
                      <div
                        className={cx('bar-grow w-full rounded-t-sm', d === today ? 'bg-brand' : d < now.date ? 'bg-slate-300' : 'bg-ink/70')}
                        style={{ height: `${Math.max(4, f.pct)}%`, animationDelay: `${i * 18}ms` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-slate-400" dir="ltr">
                <span>{formatDate(monthDays[0], t.lang, { day: 'numeric', month: 'short' })}</span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-sm bg-brand" /> {L('today', 'اليوم')}
                </span>
                <span>{formatDate(monthDays.at(-1)!, t.lang, { day: 'numeric', month: 'short' })}</span>
              </div>
            </Card>
          </div>

          {/* All centers */}
          <Card>
            <CardTitle icon={<MapPin className="size-4" />} title={L('All centers today', 'جميع المراكز اليوم')} />
            <div className="space-y-2">
              {CENTERS.map((c) => {
                const f = dayFill(idx, c.id, today);
                const active = c.id === center;
                return (
                  <button key={c.id} onClick={() => ui.setStaffCenter(c.id)} className={cx('grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl border px-4 py-3 text-start transition sm:grid-cols-[180px_1fr_auto_auto]', active ? 'border-brand bg-brand-soft/50' : 'border-slate-100 hover:border-slate-300')}>
                    <span className="truncate text-sm font-semibold text-ink">{t.lang === 'ar' ? c.nameAr : c.name}</span>
                    <span className="order-3 col-span-2 h-2 overflow-hidden rounded-full bg-slate-100 sm:order-none sm:col-span-1">
                      <span className={cx('block h-full rounded-full transition-all duration-700', f.pct >= 85 ? 'bg-brand' : f.pct >= 70 ? 'bg-mastery' : 'bg-emerald-500')} style={{ width: `${f.pct}%` }} />
                    </span>
                    <span className="text-sm font-bold text-ink tabular-nums">{f.pct}%</span>
                    <span className="hidden text-xs text-slate-500 sm:block">
                      {idx.dayLessons(c.id, today).length} {L('lessons', 'حصة')} · {f.full} {L('full', 'مكتملة')}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Card>
            <CardTitle icon={<AlertTriangle className="size-4" />} title={L('Needs attention', 'يحتاج إلى متابعة')} />
            <div className="space-y-3">
              <Attention
                tone="brand"
                count={atLimit.length}
                title={L(`At 10/10 in ${formatMonth(ym, t.lang)}`, `بلغوا 10/10 في ${formatMonth(ym, t.lang)}`)}
                hint={L('Blocked until next month — offer Unlimited', 'محجوبون حتى الشهر القادم — اعرضوا العضوية غير المحدودة')}
                kids={atLimit}
                onPick={setBooking}
              />
              <Attention tone="amber" count={oneLeft.length} title={L('One lesson left', 'تبقّت حصة واحدة')} hint={L('Will hit the limit on their next booking', 'سيبلغون الحد عند الحجز القادم')} kids={oneLeft} onPick={setBooking} />
              {upgrades.length > 0 && <Attention tone="sky" count={upgrades.length} title={L('Asked about Unlimited', 'استفسروا عن العضوية غير المحدودة')} hint={L('Call the parent back', 'تواصلوا مع وليّ الأمر')} kids={upgrades} onPick={setBooking} />}
              <div className="rounded-2xl bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <MessageCircle className="size-4" /> {waiting.length} {L('waiting for a seat', 'بانتظار مقعد')}
                </div>
                <ul className="mt-2 space-y-1">
                  {waiting.slice(0, 4).map((w) => {
                    const k = s.students.find((x) => x.id === w.studentId)!;
                    const p = s.parents.find((x) => x.id === k.parentId)!;
                    return (
                      <li key={w.id} className="flex items-center gap-2 text-xs text-emerald-900">
                        <Avatar s={k} size={20} />
                        <span className="flex-1 truncate">
                          {childName(k, t.lang)} · {formatDate(w.date, t.lang, { weekday: 'short', day: 'numeric' })} <span dir="ltr">{fmtTime(w.startMin)}</span>
                        </span>
                        <a href={`https://wa.me/${p.whatsapp.replace('+', '')}`} target="_blank" rel="noreferrer" className="font-semibold text-[#128C7E] hover:underline">
                          WhatsApp
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
              {syncFailed > 0 && (
                <button onClick={() => ui.setStaffTab('SETTINGS')} className="flex w-full items-center gap-2 rounded-2xl bg-brand-soft p-3 text-start text-sm font-semibold text-brand">
                  <AlertTriangle className="size-4" /> {syncFailed} {L('calendar sync problems', 'مشاكل في مزامنة التقويم')} <ArrowUpRight className="ms-auto size-4" />
                </button>
              )}
            </div>
          </Card>

          <Card>
            <CardTitle icon={<Activity className="size-4" />} title={L('Live activity', 'النشاط المباشر')} right={<span className="live-dot size-2 rounded-full bg-emerald-500" />} />
            {s.syncLog.filter((e) => e.payload.student).length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">{L('Bookings and changes appear here the moment they happen.', 'تظهر الحجوزات والتغييرات هنا لحظة حدوثها.')}</p>
            ) : (
              <ul className="space-y-2.5">
                {s.syncLog
                  .filter((e) => e.payload.student)
                  .slice(0, 7)
                  .map((e) => {
                    const p = e.payload;
                    const meta =
                      p.eventType === 'LESSON_BOOKED'
                        ? { icon: <Check className="size-3.5" />, cls: 'bg-emerald-100 text-emerald-700', verb: L('booked', 'حجز') }
                        : p.eventType === 'LESSON_CANCELLED'
                          ? { icon: <CalendarX className="size-3.5" />, cls: 'bg-brand-soft text-brand', verb: L('cancelled', 'ألغى') }
                          : p.eventType === 'LESSON_RESCHEDULED'
                            ? { icon: <Repeat className="size-3.5" />, cls: 'bg-sky-100 text-sky-700', verb: L('moved to', 'نقل إلى') }
                            : { icon: <MessageCircle className="size-3.5" />, cls: 'bg-mastery-soft text-amber-700', verb: L('is waiting for', 'بانتظار') };
                    const d = p.slotIsoGST?.slice(0, 10) ?? '';
                    return (
                      <li key={e.id} className="anim-fade-up flex items-start gap-2.5 text-sm">
                        <span className={cx('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full', meta.cls)}>{meta.icon}</span>
                        <span className="min-w-0 flex-1 leading-snug text-slate-600">
                          <b className="font-semibold text-ink">{p.student!.fullName.split(' ')[0]}</b> {meta.verb}{' '}
                          {d && formatDate(d, t.lang, { weekday: 'short', day: 'numeric', month: 'short' })} <span dir="ltr">{p.slotIsoGST?.slice(11, 16)}</span>
                          <span className="block text-[11px] text-slate-400" dir="ltr">
                            {p.hourlyOccupancy} · {p.monthlyQuotaUsed} · {new Date(p.dispatchedAtIso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </Card>

          <button onClick={() => ui.setStaffTab('FAMILIES')} className={cx(btn.outline, 'w-full')}>
            <UserPlus className="size-4 text-brand" /> {L('Families & accounts', 'العائلات والحسابات')}
          </button>
        </div>
      </div>

      </div>

      {roster && <Roster date={roster.date} hour={roster.hour} onClose={() => setRoster(null)} />}
      {booking && <StaffBookDrawer initial={booking === 'search' ? null : booking} onClose={() => setBooking(null)} />}
    </div>
  );
}

const tones = {
  emerald: 'bg-emerald-50 text-emerald-600',
  ink: 'bg-slate-100 text-ink',
  brand: 'bg-brand-soft text-brand',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-mastery-soft text-amber-600',
} as const;

function Kpi({ icon, label, value, sub, tone, bar }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string; tone: keyof typeof tones; bar?: number }) {
  return (
    <div className="anim-fade-up lift rounded-3xl border border-white/10 bg-white p-4 shadow-xl shadow-black/20">
      <div className="flex items-center gap-2">
        <span className={cx('grid size-8 place-items-center rounded-xl', tones[tone])}>{icon}</span>
        <span className="text-xs leading-tight font-medium text-slate-500">{label}</span>
      </div>
      <div className="mt-3 text-3xl font-bold text-ink tabular-nums" dir="ltr">
        <Counted value={value} />
      </div>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${bar}%` }} />
        </div>
      )}
      <div className="mt-1.5 text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}

/** Counts up the leading number of a KPI value ("73%", "5/12", 46). */
function Counted({ value }: { value: React.ReactNode }) {
  const m = typeof value === 'number' ? [String(value), String(value), ''] : typeof value === 'string' ? value.match(/^(\d+)(.*)$/) : null;
  if (!m) return <>{value}</>;
  return (
    <>
      <CountUp value={Number(m[1])} />
      {m[2]}
    </>
  );
}

const Legend = ({ c, l }: { c: string; l: string }) => (
  <span className="inline-flex items-center gap-1">
    <span className={cx('size-2.5 rounded-sm', c)} /> {l}
  </span>
);

function HeatRow({ h, week, center, idx, onOpen }: { h: number; week: ISODate[]; center: string; idx: BookingIndex; onOpen: (x: { date: ISODate; hour: number }) => void }) {
  return (
    <>
      <div className="grid place-items-center text-[10px] text-slate-400 tabular-nums" dir="ltr">
        {h}:00
      </div>
      {week.map((d) => {
        if (!hoursOf(d).includes(h)) return <div key={d} className="h-5 rounded bg-slate-50" />;
        const n = idx.hourOccupancy(center, d, h);
        return (
          <button
            key={d}
            onClick={() => onOpen({ date: d, hour: h })}
            title={`${n}/12`}
            className={cx('h-5 rounded text-[9px] font-bold transition hover:scale-110', n >= 12 ? 'bg-brand text-white' : n >= 9 ? 'bg-mastery text-ink' : n >= 5 ? 'bg-emerald-300 text-emerald-900' : 'bg-emerald-100 text-emerald-700')}
          >
            {n}
          </button>
        );
      })}
    </>
  );
}

function Attention({ tone, count, title, hint, kids, onPick }: { tone: 'brand' | 'amber' | 'sky'; count: number; title: string; hint: string; kids: Student[]; onPick: (k: Student) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const cls = { brand: 'bg-brand text-white', amber: 'bg-mastery text-ink', sky: 'bg-sky-500 text-white' }[tone];
  return (
    <div className="rounded-2xl border border-slate-100 p-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 text-start">
        <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold', cls)}>{count}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="block text-[11px] leading-snug text-slate-500">{hint}</span>
        </span>
        <ChevronRight className={cx('size-4 text-slate-400 transition rtl:rotate-180', open && 'rotate-90 rtl:rotate-90')} />
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {kids.slice(0, 8).map((k) => (
            <li key={k.id}>
              <button onClick={() => onPick(k)} className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-start text-xs hover:bg-slate-50">
                <Avatar s={k} size={22} />
                <span className="flex-1 truncate text-ink">{childName(k, t.lang, true)}</span>
                <TierBadge tier={k.membershipTier} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Book on behalf of a parent ─────────────────────────

export function StaffBookDrawer({ initial, onClose }: { initial: Student | null; onClose: () => void }) {
  const s = useAppState();
  const t = useT();
  const idx = useIndex();
  const now = dubaiNow();
  const L = (en: string, ar: string) => (t.lang === 'ar' ? ar : en);
  const [kid, setKid] = useState<Student | null>(initial);
  const [q, setQ] = useState('');
  const [duration, setDuration] = useState<LessonDuration>(60);
  const [date, setDate] = useState<ISODate>(isOpenDay(now.date) && startTimes(now.date, 30).some((m) => !isPast(now.date, m, now)) ? now.date : nextOpenDay(now.date, 1));
  const center = s.ui.staffCenter;
  const live = kid ? s.students.find((x) => x.id === kid.id) ?? kid : null;

  const matches = q.trim().length >= 1 ? s.students.filter((k) => k.centerId === center && `${k.firstName} ${k.lastName} ${k.firstNameAr} ${k.lastNameAr}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const days = [toYearMonth(now.date), addMonths(toYearMonth(now.date), 1)].flatMap(openDaysInMonth).filter((d) => d >= now.date).slice(0, 14);

  return (
    <Drawer onClose={onClose} title={<div className="text-lg font-bold text-ink">{L('Book for a parent', 'حجز لوليّ أمر')}</div>}>
      {!live ? (
        <>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search className="size-4 text-slate-400" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={L('Type a student name…', 'اكتب اسم الطالب…')} className="w-full bg-transparent py-3 text-sm outline-none" />
          </label>
          <ul className="mt-3 space-y-1">
            {matches.map((k) => (
              <li key={k.id}>
                <button onClick={() => setKid(k)} className="flex w-full items-center gap-3 rounded-xl p-2 text-start hover:bg-slate-50">
                  <Avatar s={k} size={34} />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-ink">{childName(k, t.lang, true)}</span>
                    <span className="block text-xs text-slate-500">
                      {t('grade', { n: k.grade })} · {topicLabel(k.topic, t.lang)}
                    </span>
                  </span>
                  <TierBadge tier={k.membershipTier} />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        (() => {
          const u = getMonthlyUsage(live, toYearMonth(date), idx);
          const parent = s.parents.find((p) => p.id === live.parentId)!;
          const times = startTimes(date, duration).filter((m) => !isPast(date, m, now));
          return (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <Avatar s={live} size={42} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">{childName(live, t.lang, true)}</div>
                  <div className="text-xs text-slate-500">
                    {parentName(parent, t.lang)} · <span dir="ltr">{parent.whatsapp}</span>
                  </div>
                </div>
                <div className="text-end">
                  <div className={cx('text-lg font-bold tabular-nums', u.reached ? 'text-brand' : 'text-ink')} dir="ltr">
                    {u.limit === null ? <InfinityIcon className="inline size-5 text-amber-500" /> : `${u.used}/${u.limit}`}
                  </div>
                  <button onClick={() => setKid(null)} className="text-[11px] font-semibold text-brand">
                    {L('Change', 'تغيير')}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {([30, 60, 90, 120] as LessonDuration[]).map((d) => (
                  <button key={d} onClick={() => setDuration(d)} className={cx('rounded-xl border py-2 text-sm font-semibold', duration === d ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-600')}>
                    {t(`len.${d}`)}
                  </button>
                ))}
              </div>

              <div className="no-scrollbar -mx-1 mt-4 flex gap-2 overflow-x-auto px-1">
                {days.map((d) => (
                  <button key={d} onClick={() => setDate(d)} className={cx('w-14 shrink-0 rounded-xl border py-1.5 text-center', d === date ? 'accent border-ink bg-ink text-white' : 'border-slate-200 text-ink')}>
                    <div className="text-[10px] opacity-70">{formatDate(d, t.lang, { weekday: 'short' })}</div>
                    <div className="font-bold">{Number(d.slice(8))}</div>
                  </button>
                ))}
              </div>

              {u.reached && (
                <p className="mt-4 rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-dark">
                  {L(`10/10 lessons already booked in ${formatMonth(toYearMonth(date), t.lang)}. Pick a day next month or switch the membership to Unlimited in Families.`, `تم حجز 10/10 حصص في ${formatMonth(toYearMonth(date), t.lang)}. اختر يوماً في الشهر القادم أو غيّر العضوية إلى غير محدودة.`)}
                </p>
              )}

              <ul className="mt-4 space-y-1.5">
                {times.length === 0 && <li className="py-6 text-center text-sm text-slate-400">{t('time.none')}</li>}
                {times.map((m) => {
                  const req = { centerId: center, date, startMin: m, durationMin: duration };
                  const c = checkBooking(live, req, idx, now);
                  const st = occupancyStatus(CAPACITY - c.seatsLeft);
                  return (
                    <li key={m} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2">
                      <span className="w-28 text-sm font-semibold text-ink tabular-nums" dir="ltr">
                        {fmtTime(m)} – {fmtTime(m + duration)}
                      </span>
                      <span className="flex-1">
                        <SeatPods booked={CAPACITY - c.seatsLeft} status={st} size="sm" />
                      </span>
                      <button
                        disabled={!c.allowed}
                        onClick={() => {
                          if (bookLesson(live.id, req, 'STAFF').ok) onClose();
                        }}
                        className={cx('w-24 rounded-lg py-1.5 text-xs font-semibold', c.allowed ? 'bg-brand text-white hover:bg-brand-dark' : 'bg-slate-100 text-slate-400')}
                      >
                        {c.allowed ? t('time.book') : c.reason === 'FULL' ? t('time.full') : c.reason === 'MONTHLY_LIMIT_REACHED' ? t('time.locked') : t('time.booked')}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          );
        })()
      )}
    </Drawer>
  );
}
