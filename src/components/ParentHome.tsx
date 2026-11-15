import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Lock, Timer, CalendarCheck, CalendarDays, CalendarPlus, Check, Clock, Infinity as InfinityIcon, MapPin, MessageCircle, Repeat, X } from 'lucide-react';
import type { Booking, LessonDuration, Student } from '../types/domain.ts';
import {
  addMonths,
  dubaiNow,
  firstBookableDay,
  fmtTime,
  formatDate,
  formatMonth,
  isOpenDay,
  isPast,
  minutesUntil,
  openDaysInMonth,
  startTimes,
  toYearMonth,
} from '../engine/calendar.ts';
import { canParentCancel, checkBooking, getMonthlyUsage, occupancyStatus, type LessonRequest } from '../engine/bookingEngine.ts';
import { CAPACITY } from '../engine/calendar.ts';
import { bookLesson, cancelLesson, childName, currentAccount, googleCalendarLink, joinWaitlist, parentName, requestUpgrade, rescheduleLesson, startReschedule, stopReschedule, ui, useAppState, useIndex, useT, whenLabel, centerFull } from '../state/store.ts';
import { topicLabel } from '../i18n/translations.ts';
import { Hero, Scribble } from './MathField.tsx';
import { HowItWorks, MathPuzzle } from './Extras.tsx';
import { Avatar, Modal, Ring, SeatPods, StarBurst, Stars, Toggle, btn, cx } from './ui.tsx';

const DURATIONS: LessonDuration[] = [30, 60, 90, 120];

type Dialog =
  | { kind: 'confirm'; req: LessonRequest }
  | { kind: 'done'; booking: Booking; moved?: boolean }
  | { kind: 'move'; req: LessonRequest }
  | { kind: 'cancel'; booking: Booking }
  | null;

export function ParentHome() {
  const s = useAppState();
  const t = useT();
  const idx = useIndex();
  const [dialog, setDialog] = useState<Dialog>(null);
  const now = dubaiNow();
  const acc = currentAccount(s)!;
  const parent = s.parents.find((p) => p.id === acc.parentId)!;
  const kids = s.students.filter((x) => x.parentId === parent.id);
  const child = kids.find((k) => k.id === s.ui.childId) ?? kids[0];
  const moving = s.ui.reschedulingId ? s.bookings.find((b) => b.id === s.ui.reschedulingId && b.status === 'CONFIRMED') ?? null : null;

  const date = s.ui.date;
  const ym = toYearMonth(date);
  const thisYM = toYearMonth(now.date);
  const nextYM = addMonths(thisYM, 1);
  const usage = getMonthlyUsage(child, ym, idx);
  const duration = moving ? moving.durationMin : s.ui.duration;

  const goMonth = (m: string) => ui.setDate(m === thisYM ? firstBookableDay(now.date, now) : openDaysInMonth(m)[0]);

  // Keep the selected date valid for the selected month.
  useEffect(() => {
    if (moving && toYearMonth(date) !== toYearMonth(moving.date)) ui.setDate(moving.date);
  }, [moving, date]);

  const times = useMemo(() => {
    return startTimes(date, duration)
      .filter((m) => !isPast(date, m, now))
      .map((startMin) => {
        const req: LessonRequest = { centerId: child.centerId, date, startMin, durationMin: duration };
        const check = checkBooking(child, req, idx, now, moving ?? undefined);
        const waiting = s.waitlist.some((w) => w.studentId === child.id && w.date === date && w.startMin === startMin);
        return { req, check, waiting };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, duration, child, idx, moving, s.waitlist]);
  const shown = s.ui.hideFull ? times.filter((x) => x.check.reason !== 'FULL') : times;

  const upcoming = idx
    .byStudent(child.id)
    .filter((b) => !isPast(b.date, b.startMin, now))
    .sort((a, b) => (a.date + fmtTime(a.startMin)).localeCompare(b.date + fmtTime(b.startMin)));

  return (
    <div>
      {/* Greeting + children */}
      <Hero>
      <div className="anim-fade-up">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              {t('parent.hello', { name: '' }).trim()} <Scribble>{parentName(parent, t.lang).split(' ')[0]}</Scribble>
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-white/60">{t('parent.pickChild')}</p>
              <HowItWorks />
            </div>
          </div>
          <NextLesson kids={kids} />
        </div>
        <div className="no-scrollbar -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {kids.map((k) => (
            <ChildCard key={k.id} k={k} ym={ym} selected={k.id === child.id} />
          ))}
        </div>
      </div>

      </Hero>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {moving ? (
            <div className="anim-fade-up flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <Repeat className="mt-0.5 size-5 shrink-0 text-sky-600" />
              <p className="flex-1">{t('resched.banner', { name: childName(child, t.lang), when: whenLabel(moving.date, moving.startMin, moving.durationMin, t.lang), month: formatMonth(toYearMonth(moving.date), t.lang) })}</p>
              <button onClick={stopReschedule} className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                {t('resched.stop')}
              </button>
            </div>
          ) : (
            <Notice child={child} ym={ym} onNext={() => goMonth(addMonths(ym, 1))} />
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            {/* 1. Length */}
            <StepTitle n={1} label={t('step.length')} />
            <div className="mt-3 grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  disabled={!!moving}
                  onClick={() => ui.setDuration(d)}
                  className={cx(
                    'rounded-xl border px-2 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed',
                    duration === d ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-600 hover:border-slate-300 disabled:opacity-40',
                  )}
                >
                  {t(`len.${d}`)}
                </button>
              ))}
            </div>

            {/* 2. Day */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-2">
              <StepTitle n={2} label={t('step.day')} />
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm">
                {[thisYM, nextYM].map((m) => (
                  <button
                    key={m}
                    disabled={!!moving && toYearMonth(moving.date) !== m}
                    onClick={() => goMonth(m)}
                    className={cx('rounded-lg px-3 py-1.5 font-semibold transition disabled:opacity-30', ym === m ? 'bg-white text-ink shadow-sm' : 'text-slate-500')}
                  >
                    {formatMonth(m, t.lang)}
                    {child.membershipTier === 'REGULAR_10' && (
                      <span className={cx('ms-1.5 text-xs', getMonthlyUsage(child, m, idx).reached ? 'text-brand' : 'text-slate-400')} dir="ltr">
                        {getMonthlyUsage(child, m, idx).used}/10
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <DayStrip child={child} duration={duration} ym={ym} />

            {/* 3. Time */}
            <div className="mt-7 flex flex-wrap items-center justify-between gap-2">
              <StepTitle n={3} label={t('step.time')} sub={formatDate(date, t.lang, { weekday: 'long', day: 'numeric', month: 'long' })} />
              <Toggle checked={s.ui.hideFull} onChange={ui.setHideFull} label={t('time.hideFull')} />
            </div>
            <div className="mt-3">
              {!isOpenDay(date) ? (
                <Empty text={t('time.closed')} />
              ) : shown.length === 0 ? (
                <Empty text={t('time.none')} />
              ) : (
                <div key={`${child.id}-${date}-${duration}`} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {shown.map(({ req, check, waiting }, i) => {
                    const booked = CAPACITY - check.seatsLeft;
                    const status = occupancyStatus(booked);
                    const r = check.reason;
                    return (
                      <div
                        key={req.startMin}
                        className={cx('anim-fade-up rounded-2xl border p-3.5 transition', r === 'FULL' ? 'border-slate-200 bg-slate-50' : r ? 'border-slate-200 bg-slate-50/60' : 'border-slate-200 bg-white hover:border-brand/40 hover:shadow-md')}
                        style={{ animationDelay: `${i * 25}ms` }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cx('inline-flex items-center gap-1.5 font-semibold tabular-nums', r && r !== 'OVERLAPS_OWN_LESSON' ? 'text-slate-400' : 'text-ink')} dir="ltr">
                            <Clock className="size-4 text-slate-400" />
                            {fmtTime(req.startMin)} – {fmtTime(req.startMin + req.durationMin)}
                          </span>
                          <span
                            className={cx(
                              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                              status === 'FULL' ? 'bg-brand-soft text-brand' : status === 'FILLING_FAST' ? 'bg-mastery-soft text-amber-700' : 'bg-emerald-50 text-emerald-700',
                            )}
                          >
                            {status === 'FULL' ? t('time.full') : check.seatsLeft === 1 ? t('time.leftOne') : t('time.left', { n: check.seatsLeft })}
                          </span>
                        </div>
                        <div className="mt-2.5">
                          <SeatPods booked={booked} status={status} size="sm" />
                        </div>
                        <div className="mt-3">
                          {check.allowed ? (
                            <button onClick={() => setDialog({ kind: moving ? 'move' : 'confirm', req })} className={cx(btn.primary, 'w-full py-2')}>
                              {moving ? <Repeat className="size-4" /> : <CalendarCheck className="size-4" />}
                              {moving ? t('time.move') : t('time.book')}
                            </button>
                          ) : r === 'FULL' ? (
                            <button
                              disabled={waiting || !!moving}
                              onClick={() => joinWaitlist(child.id, req)}
                              className={cx(btn.outline, 'w-full py-2 text-xs', waiting && 'text-emerald-700')}
                            >
                              {waiting ? <Check className="size-4" /> : <MessageCircle className="size-4 text-[#25D366]" />}
                              {waiting ? t('time.notified') : t('time.notify')}
                            </button>
                          ) : (
                            <div className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2 text-xs font-semibold text-slate-400">
                              {r === 'OVERLAPS_OWN_LESSON' ? <Check className="size-4 text-emerald-500" /> : <X className="size-4" />}
                              {r === 'OVERLAPS_OWN_LESSON' ? t('time.booked') : r === 'MONTHLY_LIMIT_REACHED' ? t('time.locked') : t(`reason.${r!}`)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Upcoming */}
        <div className="h-fit space-y-4 lg:sticky lg:top-24">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar s={child} size={40} />
            <div className="min-w-0">
              <div className="font-semibold text-ink">{t('upcoming.title')}</div>
              <div className="text-xs text-slate-500">
                {childName(child, t.lang)} · {usage.limit === null ? t('child.unlimited', { used: usage.used, month: formatMonth(ym, t.lang) }) : t('child.used', { used: usage.used, limit: usage.limit, month: formatMonth(ym, t.lang) })}
              </div>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {upcoming.length === 0 && <li className="py-4 text-center text-sm text-slate-400">{t('upcoming.none')}</li>}
            {upcoming.slice(0, 8).map((b) => {
              const canChange = canParentCancel(b, now);
              return (
                <li key={b.id} className={cx('rounded-2xl border p-3', moving?.id === b.id ? 'border-sky-300 bg-sky-50' : 'border-slate-100 bg-slate-50/60')}>
                  <button onClick={() => ui.setDate(b.date)} className="flex w-full items-center gap-2 text-start">
                    <CalendarDays className="size-4 shrink-0 text-brand" />
                    <span className="flex-1 text-sm font-medium text-ink">{formatDate(b.date, t.lang, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span className="text-xs text-slate-500 tabular-nums" dir="ltr">
                      {fmtTime(b.startMin)}–{fmtTime(b.startMin + b.durationMin)}
                    </span>
                  </button>
                  {canChange ? (
                    <div className="mt-2 flex gap-1.5">
                      <button onClick={() => startReschedule(b.id)} className="flex-1 rounded-lg bg-white py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:text-ink">
                        {t('upcoming.change')}
                      </button>
                      <button onClick={() => setDialog({ kind: 'cancel', booking: b })} className="flex-1 rounded-lg bg-white py-1.5 text-xs font-semibold text-brand ring-1 ring-slate-200 hover:bg-brand-soft">
                        {t('upcoming.cancel')}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{t('upcoming.tooLate')}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </aside>
        <MathPuzzle />
        </div>
      </div>

      </div>

      <Dialogs dialog={dialog} setDialog={setDialog} child={child} moving={moving} />
    </div>
  );
}

function StepTitle({ n, label, sub }: { n: number; label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="accent grid size-7 place-items-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>
      <span className="font-semibold text-ink">{label}</span>
      {sub && <span className="text-sm text-slate-400">· {sub}</span>}
    </div>
  );
}

const Empty = ({ text }: { text: string }) => <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">{text}</div>;

function ChildCard({ k, ym, selected }: { k: Student; ym: string; selected: boolean }) {
  const t = useT();
  const idx = useIndex();
  const u = getMonthlyUsage(k, ym, idx);
  return (
    <button
      onClick={() => ui.setChild(k.id)}
      className={cx(
        'lift flex min-w-[250px] flex-1 items-center gap-3 rounded-2xl border-2 bg-white p-3.5 text-start',
        selected ? 'border-brand shadow-xl shadow-brand/30' : 'border-transparent opacity-90 shadow-sm hover:opacity-100',
      )}
    >
      <Ring used={u.used} limit={u.limit} size={58} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-ink">{childName(k, t.lang)}</span>
          {selected && <Check className="size-4 text-brand" />}
        </div>
        <div className="text-xs text-slate-500">
          {t('grade', { n: k.grade })} · {topicLabel(k.topic, t.lang)}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className={cx('text-[11px] font-semibold', u.limit === null ? 'text-amber-600' : u.reached ? 'text-brand' : 'text-emerald-600')}>
            {u.limit === null ? t('tier.UNLIMITED') : `${u.used}/${u.limit} · ${formatMonth(ym, t.lang)}`}
          </span>
          <Stars n={k.masteryStars} />
        </div>
      </div>
    </button>
  );
}

function Notice({ child, ym, onNext }: { child: Student; ym: string; onNext: () => void }) {
  const s = useAppState();
  const t = useT();
  const idx = useIndex();
  const u = getMonthlyUsage(child, ym, idx);
  const name = childName(child, t.lang);
  const month = formatMonth(ym, t.lang);
  const next = formatMonth(addMonths(ym, 1), t.lang);
  const canGoNext = addMonths(ym, 1) <= addMonths(toYearMonth(dubaiNow().date), 1);

  if (u.limit === null)
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-mastery-soft px-4 py-3 text-sm text-amber-900">
        <InfinityIcon className="size-5 shrink-0 text-amber-600" /> {t('notice.unlimited', { name })}
      </div>
    );
  if (u.reached)
    return (
      <div key={`${child.id}-${ym}`} className="anim-fade-up rounded-2xl border border-brand/30 bg-brand-soft p-4">
        <div className="flex items-start gap-3">
          <span className="anim-lock grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
            <Lock className="size-5" />
          </span>
          <div className="flex-1">
            <div className="font-semibold text-brand-dark">{t('notice.limitTitle', { month })}</div>
            <p className="mt-1 text-sm text-ink/80">{t('notice.limitBody', { next })}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {canGoNext && (
                <button onClick={onNext} className={btn.primary}>
                  {t('notice.goNext', { next })} <ArrowRight className="size-4 rtl:rotate-180" />
                </button>
              )}
              <button onClick={() => requestUpgrade(child.id)} disabled={s.upgradeRequests.includes(child.id)} className={btn.outline}>
                {s.upgradeRequests.includes(child.id) ? <Check className="size-4 text-emerald-600" /> : <InfinityIcon className="size-4 text-amber-600" />}
                {t('notice.askUpgrade')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div key={`${child.id}-${ym}`} className={cx('flex items-center gap-3 rounded-2xl px-4 py-3 text-sm', u.remaining === 1 ? 'bg-mastery-soft text-amber-900' : 'bg-emerald-50 text-emerald-900', ym > toYearMonth(dubaiNow().date) && u.used === 0 && 'anim-unlock anim-fade-up')}>
      <CalendarCheck className={cx('size-5 shrink-0', u.remaining === 1 ? 'text-amber-600' : 'text-emerald-600')} />
      {u.remaining === 1 ? t('notice.lastOne', { name, month }) : t('notice.left', { name, n: u.remaining ?? 0, month })}
    </div>
  );
}

function DayStrip({ child, duration, ym }: { child: Student; duration: LessonDuration; ym: string }) {
  const s = useAppState();
  const t = useT();
  const idx = useIndex();
  const now = dubaiNow();
  const ref = useRef<HTMLDivElement>(null);
  const days = openDaysInMonth(ym).filter((d) => startTimes(d, duration).some((m) => !isPast(d, m, now)));

  useEffect(() => {
    const strip = ref.current;
    const el = strip?.querySelector<HTMLElement>('[data-on]');
    if (!strip || !el) return;
    const a = strip.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    strip.scrollBy({ left: b.left + b.width / 2 - (a.left + a.width / 2), behavior: 'smooth' });
  }, [s.ui.date, t.lang]);

  return (
    <div ref={ref} className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 py-1">
      {days.map((d) => {
        const on = d === s.ui.date;
        const anyFree = startTimes(d, duration).some((m) => !isPast(d, m, now) && checkBooking(child, { centerId: child.centerId, date: d, startMin: m, durationMin: duration }, idx, now).seatsLeft > 0);
        const mine = idx.byStudent(child.id).some((b) => b.date === d);
        return (
          <button
            key={d}
            data-on={on || undefined}
            onClick={() => ui.setDate(d)}
            className={cx('relative flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2 transition', on ? 'accent border-ink bg-ink text-white' : 'border-slate-200 bg-white text-ink hover:border-slate-300')}
          >
            <span className={cx('text-[11px] font-medium', on ? 'text-white/70' : 'text-slate-400')}>{formatDate(d, t.lang, { weekday: 'short' })}</span>
            <span className="text-lg leading-tight font-bold tabular-nums">{Number(d.slice(8))}</span>
            <span className={cx('mt-0.5 text-[10px] font-semibold', anyFree ? (on ? 'text-emerald-300' : 'text-emerald-600') : on ? 'text-red-300' : 'text-brand')}>
              {anyFree ? '●' : t('day.full')}
            </span>
            {mine && <span className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-brand" />}
          </button>
        );
      })}
    </div>
  );
}

function Dialogs({ dialog, setDialog, child, moving }: { dialog: Dialog; setDialog: (d: Dialog) => void; child: Student; moving: Booking | null }) {
  const s = useAppState();
  const t = useT();
  const idx = useIndex();
  if (!dialog) return null;
  const close = () => setDialog(null);
  const parent = s.parents.find((p) => p.id === child.parentId)!;

  const LessonCard = ({ date, startMin, durationMin }: { date: string; startMin: number; durationMin: number }) => (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <Avatar s={child} size={40} />
        <div>
          <div className="font-semibold text-ink">{childName(child, t.lang, true)}</div>
          <div className="text-xs text-slate-500">{topicLabel(child.topic, t.lang)}</div>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-brand" /> {formatDate(date, t.lang, { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-brand" />
          <span dir="ltr">
            {fmtTime(startMin)} – {fmtTime(startMin + durationMin)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-brand" /> {centerFull(child.centerId, t.lang)}
        </div>
      </div>
    </div>
  );

  if (dialog.kind === 'confirm') {
    const { req } = dialog;
    const u = getMonthlyUsage(child, toYearMonth(req.date), idx);
    return (
      <Modal onClose={close}>
        <h3 className="text-xl font-bold text-ink">{t('confirm.title')}</h3>
        <div className="mt-4">
          <LessonCard {...req} />
        </div>
        <p className="mt-4 text-sm font-medium text-ink">{u.limit === null ? t('confirm.unlimited') : t('confirm.count', { n: u.used + 1, month: formatMonth(toYearMonth(req.date), t.lang) })}</p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <MessageCircle className="size-3.5 text-[#25D366]" /> {t('confirm.whatsapp', { phone: parent.whatsapp })}
        </p>
        <div className="mt-6 flex gap-2">
          <button onClick={close} className={cx(btn.ghost, 'flex-1')}>
            {t('confirm.back')}
          </button>
          <button
            onClick={() => {
              const r = bookLesson(child.id, req);
              setDialog(r.ok ? { kind: 'done', booking: r.booking } : null);
            }}
            className={cx(btn.primary, 'flex-[2]')}
          >
            {t('confirm.btn')}
          </button>
        </div>
      </Modal>
    );
  }

  if (dialog.kind === 'done') {
    const b = dialog.booking;
    return (
      <Modal onClose={close}>
        <div className="relative text-center">
          <StarBurst />
          <div className="anim-check mx-auto grid size-16 place-items-center rounded-full bg-emerald-500 text-white">
            <Check className="size-8" strokeWidth={3} />
          </div>
          <h3 className="mt-4 text-xl font-bold text-ink">{dialog.moved ? (t.lang === 'ar' ? 'تم نقل الحصة!' : 'Lesson moved!') : t('done.title')}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {childName(child, t.lang)} · {whenLabel(b.date, b.startMin, b.durationMin, t.lang)}
          </p>
        </div>
        <div className="mt-6 grid gap-2">
          <a href={googleCalendarLink(b, child, t.lang)} target="_blank" rel="noreferrer" className={btn.outline}>
            <CalendarPlus className="size-4 text-brand" /> {t('done.addGoogle')}
          </a>
          <button onClick={close} className={btn.primary}>
            {t('done.close')}
          </button>
        </div>
      </Modal>
    );
  }

  if (dialog.kind === 'move' && moving) {
    return (
      <Modal onClose={close}>
        <h3 className="text-xl font-bold text-ink">{t('resched.title')}</h3>
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-2xl border border-slate-200 p-3 text-slate-400 line-through">
            <span className="me-2 font-semibold no-underline">{t('resched.from')}</span>
            {whenLabel(moving.date, moving.startMin, moving.durationMin, t.lang)}
          </div>
          <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-3 font-medium text-emerald-900">
            <span className="me-2 font-semibold">{t('resched.to')}</span>
            {whenLabel(dialog.req.date, dialog.req.startMin, dialog.req.durationMin, t.lang)}
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={close} className={cx(btn.ghost, 'flex-1')}>
            {t('confirm.back')}
          </button>
          <button
            onClick={() => {
              const r = rescheduleLesson(moving.id, dialog.req);
              setDialog(r.ok ? { kind: 'done', booking: r.booking, moved: true } : null);
            }}
            className={cx(btn.primary, 'flex-[2]')}
          >
            <Repeat className="size-4" /> {t('resched.btn')}
          </button>
        </div>
      </Modal>
    );
  }

  if (dialog.kind === 'cancel') {
    const b = dialog.booking;
    const month = formatMonth(toYearMonth(b.date), t.lang);
    return (
      <Modal onClose={close}>
        <h3 className="text-xl font-bold text-ink">{t('cancel.title')}</h3>
        <div className="mt-4">
          <LessonCard date={b.date} startMin={b.startMin} durationMin={b.durationMin} />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          {child.membershipTier === 'REGULAR_10' ? t('cancel.body', { name: childName(child, t.lang), month }) : t('cancel.bodyUnlimited')}
        </p>
        <div className="mt-6 grid gap-2">
          <button
            onClick={() => {
              startReschedule(b.id);
              close();
            }}
            className={btn.outline}
          >
            <Repeat className="size-4" /> {t('cancel.reschedule')}
          </button>
          <div className="flex gap-2">
            <button onClick={close} className={cx(btn.ghost, 'flex-1')}>
              {t('cancel.keep')}
            </button>
            <button
              onClick={() => {
                cancelLesson(b.id);
                close();
              }}
              className={cx(btn.primary, 'flex-1')}
            >
              {t('cancel.confirm')}
            </button>
          </div>
        </div>
      </Modal>
    );
  }
  return null;
}

/** The family's very next lesson, with a live countdown. */
function NextLesson({ kids }: { kids: Student[] }) {
  const t = useT();
  const idx = useIndex();
  const [now, setNow] = useState(dubaiNow());
  useEffect(() => {
    const id = setInterval(() => setNow(dubaiNow()), 30_000);
    return () => clearInterval(id);
  }, []);
  const next = kids
    .flatMap((k) => idx.byStudent(k.id).map((b) => ({ b, k })))
    .filter(({ b }) => !isPast(b.date, b.startMin, now))
    .sort((x, y) => (x.b.date + fmtTime(x.b.startMin)).localeCompare(y.b.date + fmtTime(y.b.startMin)))[0];
  if (!next) return null;
  const mins = minutesUntil(next.b.date, next.b.startMin, now);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const ar = t.lang === 'ar';
  const count = d > 0 ? (ar ? `${d} يوم ${h} س` : `${d}d ${h}h`) : h > 0 ? (ar ? `${h} س ${m} د` : `${h}h ${m}m`) : ar ? `${m} د` : `${m} min`;
  return (
    <button onClick={() => (ui.setChild(next.k.id), ui.setDate(next.b.date))} className="float-y flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 text-start text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15">
      <span className="grid size-9 place-items-center rounded-xl bg-white/10">
        <Timer className="size-5 text-mastery" />
      </span>
      <span>
        <span className="block text-[11px] text-white/60">{ar ? 'الحصة القادمة' : 'Next lesson'} · {childName(next.k, t.lang)}</span>
        <span className="block text-sm font-semibold">
          {formatDate(next.b.date, t.lang, { weekday: 'short', day: 'numeric', month: 'short' })} · <span dir="ltr">{fmtTime(next.b.startMin)}</span>
        </span>
      </span>
      <span className="ms-2 rounded-lg bg-brand px-2 py-1 text-xs font-bold tabular-nums" dir="ltr">
        {ar ? 'بعد ' : 'in '}
        {count}
      </span>
    </button>
  );
}
