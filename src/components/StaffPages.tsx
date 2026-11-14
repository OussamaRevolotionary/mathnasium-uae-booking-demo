import { useMemo, useState } from 'react';
import { CalendarCheck, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, CircleDashed, CircleX, Copy, Lock, MessageCircle, Plus, Search, Send, Trash2, UserPlus, Users } from 'lucide-react';
import type { Booking, ISODate, MembershipTier, SyncLogEntry } from '../types/domain.ts';
import { CENTERS } from '../data/seedData.ts';
import { addDays, dubaiNow, fmtTime, formatDate, formatMonth, hoursOf, isOpenDay, isPast, startOfWeek, toYearMonth } from '../engine/calendar.ts';
import { endMin, getMonthlyUsage, occupancyStatus } from '../engine/bookingEngine.ts';
import { isValidWebhookUrl } from '../services/n8nSyncService.ts';
import { TOPICS, topicLabel } from '../i18n/translations.ts';
import { cancelLesson, childName, clearSyncLog, createFamily, parentName, sendTestEvent, setSync, setTier, ui, useAppState, useIndex, useT, type NewFamily, centerFull } from '../state/store.ts';
import { Avatar, Drawer, SeatPods, TierBadge, btn, cx } from './ui.tsx';

// ───────────────────────── Calendar ─────────────────────────

export function nextOpenDay(d: ISODate, dir: 1 | -1) {
  let x = addDays(d, dir);
  while (!isOpenDay(x)) x = addDays(x, dir);
  return x;
}

export function SyncBadge() {
  const s = useAppState();
  const t = useT();
  const failed = s.syncLog[0]?.status === 'FAILED';
  const live = s.sync.mode === 'LIVE' && isValidWebhookUrl(s.sync.webhookUrl);
  return (
    <button onClick={() => ui.setStaffTab('SETTINGS')} className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold', failed ? 'bg-brand-soft text-brand' : live ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
      <CalendarDays className="size-4" />
      {t('cal.sync')} · {failed ? t('cal.syncError') : live ? t('cal.synced') : t('cal.testMode')}
    </button>
  );
}

export function StaffCalendar() {
  const s = useAppState();
  const t = useT();
  const idx = useIndex();
  const [hour, setHour] = useState<{ date: ISODate; hour: number } | null>(null);
  const center = s.ui.staffCenter;
  const now = dubaiNow();
  const date = isOpenDay(s.ui.date) ? s.ui.date : nextOpenDay(s.ui.date, 1);
  const hours = hoursOf(date);
  const mode = s.ui.staffMode;
  const ym = toYearMonth(date);

  const lessons = idx.dayLessons(center, date).length;
  const full = hours.filter((h) => idx.hourOccupancy(center, date, h) >= 12).length;
  const atLimit = s.students.filter((x) => x.centerId === center && getMonthlyUsage(x, ym, idx).reached).length;

  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i));
  const weekHours = [10, 11, 12, 13, 14, 15, 16, 17, 18];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-ink">{centerFull(center, t.lang)}</h1>
        <SyncBadge />
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm">
            {(['DAY', 'WEEK'] as const).map((m) => (
              <button key={m} onClick={() => ui.setStaffMode(m)} className={cx('rounded-lg px-3 py-1.5 font-semibold', mode === m ? 'bg-white text-ink shadow-sm' : 'text-slate-500')}>
                {m === 'DAY' ? t('cal.day') : t('cal.week')}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
            <button onClick={() => ui.setDate(mode === 'DAY' ? nextOpenDay(date, -1) : addDays(date, -7))} className="p-2 text-slate-500 hover:text-ink">
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </button>
            <span className="min-w-40 text-center text-sm font-semibold text-ink">
              {mode === 'DAY'
                ? formatDate(date, t.lang, { weekday: 'short', day: 'numeric', month: 'long' })
                : `${formatDate(week[0], t.lang, { day: 'numeric', month: 'short' })} – ${formatDate(week[6], t.lang, { day: 'numeric', month: 'short' })}`}
            </span>
            <button onClick={() => ui.setDate(mode === 'DAY' ? nextOpenDay(date, 1) : addDays(date, 7))} className="p-2 text-slate-500 hover:text-ink">
              <ChevronRight className="size-4 rtl:rotate-180" />
            </button>
          </div>
          <button onClick={() => ui.setDate(isOpenDay(now.date) ? now.date : nextOpenDay(now.date, 1))} className={btn.outline}>
            {t('cal.today')}
          </button>
        </div>
      </div>

      {mode === 'DAY' ? (
        <>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label={t('cal.lessons')} value={lessons} icon={<CalendarCheck className="size-4 text-emerald-600" />} />
            <Stat label={t('cal.fullHours')} value={`${full}/${hours.length}`} icon={<Lock className="size-4 text-brand" />} />
            <Stat label={`${t('cal.atLimit')} · ${formatMonth(ym, t.lang)}`} value={atLimit} icon={<Users className="size-4 text-amber-500" />} />
          </div>
          <p className="mt-5 mb-2 text-xs text-slate-400">{t('cal.hint')}</p>
          <div className="space-y-2">
            {hours.map((h) => {
              const occ = idx.hourOccupancy(center, date, h);
              const list = idx.lessonsInHour(center, date, h);
              const st = occupancyStatus(occ);
              const waiting = s.waitlist.filter((w) => w.centerId === center && w.date === date && Math.floor(w.startMin / 60) === h).length;
              return (
                <button
                  key={h}
                  onClick={() => setHour({ date, hour: h })}
                  className={cx('anim-fade-up grid w-full grid-cols-[70px_1fr] items-center gap-4 rounded-2xl border bg-white p-3 text-start shadow-sm transition hover:border-brand/40 hover:shadow-md sm:grid-cols-[90px_220px_1fr_auto]', isPast(date, h * 60 + 59, now) ? 'opacity-60' : '', 'border-slate-200')}
                >
                  <span className="font-semibold text-ink tabular-nums" dir="ltr">
                    {fmtTime(h * 60)}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <SeatPods booked={occ} status={st} />
                    </div>
                    <span className={cx('w-12 text-end text-sm font-bold tabular-nums', st === 'FULL' ? 'text-brand' : st === 'FILLING_FAST' ? 'text-amber-600' : 'text-emerald-600')} dir="ltr">
                      {occ}/12
                    </span>
                  </div>
                  <div className="col-span-2 flex flex-wrap gap-1 sm:col-span-1">
                    {list.slice(0, 9).map((b) => {
                      const k = s.students.find((x) => x.id === b.studentId)!;
                      return (
                        <span key={b.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 ps-0.5 pe-2 text-[11px] text-slate-600">
                          <Avatar s={k} size={18} />
                          {childName(k, t.lang)}
                          {b.durationMin !== 60 && <span className="text-slate-400">· {b.durationMin}′</span>}
                        </span>
                      );
                    })}
                    {list.length > 9 && <span className="px-1 text-[11px] text-slate-400">+{list.length - 9}</span>}
                  </div>
                  {waiting > 0 && (
                    <span className="hidden items-center gap-1 text-xs font-semibold text-[#128C7E] sm:inline-flex">
                      <MessageCircle className="size-3.5" /> {waiting}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="thin-scroll mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid min-w-[720px] gap-1" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
            <div />
            {week.map((d) => (
              <button key={d} onClick={() => isOpenDay(d) && (ui.setDate(d), ui.setStaffMode('DAY'))} className="rounded-lg py-1.5 text-center text-xs font-semibold text-slate-500 hover:bg-slate-50">
                {formatDate(d, t.lang, { weekday: 'short' })}
                <div className="text-sm text-ink">{Number(d.slice(8))}</div>
              </button>
            ))}
            {weekHours.map((h) => (
              <WeekRow key={h} h={h} week={week} center={center} onOpen={setHour} />
            ))}
          </div>
        </div>
      )}

      {hour && <Roster date={hour.date} hour={hour.hour} onClose={() => setHour(null)} />}
    </div>
  );
}

function WeekRow({ h, week, center, onOpen }: { h: number; week: ISODate[]; center: string; onOpen: (x: { date: ISODate; hour: number }) => void }) {
  const idx = useIndex();
  return (
    <>
      <div className="grid place-items-center text-xs font-medium text-slate-400 tabular-nums" dir="ltr">
        {fmtTime(h * 60)}
      </div>
      {week.map((d) => {
        if (!hoursOf(d).includes(h)) return <div key={d} className="rounded-lg bg-slate-50" />;
        const n = idx.hourOccupancy(center, d, h);
        const st = occupancyStatus(n);
        return (
          <button
            key={d}
            onClick={() => onOpen({ date: d, hour: h })}
            className={cx('rounded-lg py-2 text-xs font-bold tabular-nums transition hover:ring-2 hover:ring-ink/20', st === 'FULL' ? 'bg-brand text-white' : st === 'FILLING_FAST' ? 'bg-mastery text-ink' : n >= 5 ? 'bg-emerald-200 text-emerald-900' : 'bg-emerald-50 text-emerald-700')}
            dir="ltr"
          >
            {n}/12
          </button>
        );
      })}
    </>
  );
}

const Stat = ({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      {icon}
      <span className="truncate">{label}</span>
    </div>
    <div className="mt-1 text-2xl font-bold text-ink tabular-nums">{value}</div>
  </div>
);

function SyncIcon({ b }: { b: Booking }) {
  if (b.calendarSync === 'FAILED') return <CircleX className="size-4 text-brand" />;
  if (b.calendarSync === 'PENDING') return <CircleDashed className="size-4 animate-spin text-amber-500" />;
  return <CircleCheck className="size-4 text-emerald-500" />;
}

export function Roster({ date, hour, onClose }: { date: ISODate; hour: number; onClose: () => void }) {
  const s = useAppState();
  const t = useT();
  const idx = useIndex();
  const center = s.ui.staffCenter;
  const list = idx.lessonsInHour(center, date, hour).sort((a, b) => a.startMin - b.startMin);
  const occ = idx.hourOccupancy(center, date, hour);
  const waiting = s.waitlist.filter((w) => w.centerId === center && w.date === date && Math.floor(w.startMin / 60) === hour);
  const ym = toYearMonth(date);

  return (
    <Drawer
      onClose={onClose}
      title={
        <div>
          <div className="text-xs font-semibold text-brand uppercase">{t('roster.title')}</div>
          <div className="text-lg font-bold text-ink">
            {formatDate(date, t.lang, { weekday: 'long', day: 'numeric', month: 'long' })} · <span dir="ltr">{fmtTime(hour * 60)}–{fmtTime(hour * 60 + 60)}</span>
          </div>
        </div>
      }
    >
      <div className="rounded-2xl bg-slate-50 p-3">
        <div className="mb-2 flex justify-between text-xs text-slate-500">
          <span>{t('roster.pods')}</span>
          <span className="font-bold text-ink" dir="ltr">
            {occ}/12
          </span>
        </div>
        <SeatPods booked={occ} status={occupancyStatus(occ)} />
      </div>
      <ul className="mt-4 space-y-2">
        {list.length === 0 && <li className="py-8 text-center text-sm text-slate-400">{t('roster.empty')}</li>}
        {list.map((b) => {
          const k = s.students.find((x) => x.id === b.studentId)!;
          const p = s.parents.find((x) => x.id === k.parentId)!;
          const u = getMonthlyUsage(k, ym, idx);
          return (
            <li key={b.id} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-start gap-3">
                <Avatar s={k} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-ink">{childName(k, t.lang, true)}</span>
                    <TierBadge tier={k.membershipTier} />
                    <span className="text-[11px] text-slate-400" dir="ltr">
                      {u.used}/{u.limit ?? '∞'}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="rounded-md bg-sky-50 px-1.5 py-0.5 font-medium text-sky-700">{topicLabel(k.topic, t.lang)}</span>
                    {t('grade', { n: k.grade })} ·
                    <span dir="ltr" className="tabular-nums">
                      {fmtTime(b.startMin)}–{fmtTime(endMin(b))}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                    <span>
                      {t('roster.parent')}: {parentName(p, t.lang)}
                    </span>
                    <a href={`https://wa.me/${p.whatsapp.replace('+', '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#128C7E] hover:underline" dir="ltr">
                      <MessageCircle className="size-3" /> {p.whatsapp}
                    </a>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <SyncIcon b={b} />
                  <button onClick={() => cancelLesson(b.id, 'STAFF')} className="rounded-lg p-1 text-slate-300 hover:bg-brand-soft hover:text-brand" title={t('roster.cancel')}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {waiting.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#128C7E]">
            <MessageCircle className="size-4" /> {t('roster.waitlist')}
          </div>
          {waiting.map((w) => {
            const k = s.students.find((x) => x.id === w.studentId)!;
            const p = s.parents.find((x) => x.id === k.parentId)!;
            return (
              <div key={w.id} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm">
                <Avatar s={k} size={24} />
                <span className="flex-1">{childName(k, t.lang, true)}</span>
                <span className="text-xs text-slate-500" dir="ltr">
                  {p.whatsapp}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}

// ───────────────────────── Families ─────────────────────────

export function StaffFamilies() {
  const s = useAppState();
  const t = useT();
  const idx = useIndex();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const center = s.ui.staffCenter;
  const ym = toYearMonth(dubaiNow().date);

  const families = useMemo(() => {
    const kids = s.students.filter((k) => k.centerId === center);
    const byParent = new Map<string, typeof kids>();
    for (const k of kids) byParent.set(k.parentId, [...(byParent.get(k.parentId) ?? []), k]);
    const needle = q.trim().toLowerCase();
    return [...byParent.entries()]
      .map(([pid, children]) => ({ parent: s.parents.find((p) => p.id === pid)!, children, account: s.accounts.find((a) => a.parentId === pid) }))
      .filter(({ parent, children }) => !needle || [parent.fullName, parent.fullNameAr, ...children.flatMap((c) => [c.firstName, c.lastName, c.firstNameAr])].some((x) => x.toLowerCase().includes(needle)))
      .sort((a, b) => (a.parent.id === 'par-almansoori' ? -1 : b.parent.id === 'par-almansoori' ? 1 : a.parent.fullName.localeCompare(b.parent.fullName)));
  }, [s.students, s.parents, s.accounts, center, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-ink">{t('staff.families')}</h1>
        <span className="text-sm text-slate-400">{t('fam.count', { n: families.length })}</span>
        <div className="ms-auto flex gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <Search className="size-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('fam.search')} className="w-44 bg-transparent py-2.5 text-sm outline-none sm:w-60" />
          </label>
          <button onClick={() => setAdding(true)} className={btn.primary}>
            <UserPlus className="size-4" /> <span className="hidden sm:inline">{t('fam.add')}</span>
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {families.slice(0, 40).map(({ parent, children, account }) => (
          <div key={parent.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-ink">{parentName(parent, t.lang)}</div>
                <div className="text-xs text-slate-500" dir="ltr">
                  {parent.whatsapp} · {parent.email}
                </div>
              </div>
              {account && (
                <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-500" dir="ltr">
                  {t('fam.login')}: {account.username}
                </span>
              )}
            </div>
            <ul className="mt-3 space-y-2">
              {children.map((k) => {
                const u = getMonthlyUsage(k, ym, idx);
                return (
                  <li key={k.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
                    <Avatar s={k} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">{childName(k, t.lang, true)}</div>
                      <div className="text-[11px] text-slate-500">
                        {t('grade', { n: k.grade })} · {topicLabel(k.topic, t.lang)} · <span dir="ltr">{u.used}/{u.limit ?? '∞'}</span>
                      </div>
                    </div>
                    <select
                      value={k.membershipTier}
                      onChange={(e) => setTier(k.id, e.target.value as MembershipTier)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none"
                    >
                      <option value="REGULAR_10">{t('tier.REGULAR_10')}</option>
                      <option value="UNLIMITED">{t('tier.UNLIMITED')}</option>
                    </select>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {adding && <NewFamilyDrawer onClose={() => setAdding(false)} />}
    </div>
  );
}

function NewFamilyDrawer({ onClose }: { onClose: () => void }) {
  const s = useAppState();
  const t = useT();
  const blankChild = { firstName: '', lastName: '', grade: 5, membershipTier: 'REGULAR_10' as MembershipTier, topic: 'FRACTIONS' };
  const [f, setF] = useState<NewFamily>({
    parentName: '',
    whatsapp: '+971 ',
    email: '',
    username: '',
    password: `Welcome-${Math.floor(1000 + Math.random() * 9000)}`,
    centerId: s.ui.staffCenter,
    children: [blankChild],
  });
  const [err, setErr] = useState('');
  const field = 'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand';
  const valid = f.parentName.trim() && f.username.trim() && f.password && f.children.every((c) => c.firstName.trim());

  return (
    <Drawer onClose={onClose} title={<div className="text-lg font-bold text-ink">{t('fam.newTitle')}</div>}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const r = createFamily(f);
          if (r === 'username') setErr(`${t('fam.username')} ✕`);
          else onClose();
        }}
      >
        <label className="block text-xs font-medium text-slate-500">
          {t('fam.parentName')}
          <input className={field} value={f.parentName} onChange={(e) => setF({ ...f, parentName: e.target.value, username: f.username || '' })} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-slate-500">
            {t('fam.phone')}
            <input className={field} dir="ltr" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            {t('fam.email')}
            <input className={field} dir="ltr" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            {t('fam.username')}
            <input className={field} dir="ltr" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.replace(/\s/g, '').toLowerCase() })} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            {t('fam.password')}
            <input className={field} dir="ltr" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </label>
        </div>
        <label className="block text-xs font-medium text-slate-500">
          {t('staff.center')}
          <select className={field} value={f.centerId} onChange={(e) => setF({ ...f, centerId: e.target.value })}>
            {CENTERS.map((c) => (
              <option key={c.id} value={c.id}>
                {centerFull(c.id, t.lang)}
              </option>
            ))}
          </select>
        </label>

        <div className="pt-2 text-sm font-semibold text-ink">{t('fam.children')}</div>
        {f.children.map((c, i) => {
          const set = (patch: Partial<typeof c>) => setF({ ...f, children: f.children.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={i} className="space-y-2 rounded-2xl bg-slate-50 p-3">
              <div className="grid grid-cols-2 gap-2">
                <input className={field} placeholder={t('fam.firstName')} value={c.firstName} onChange={(e) => set({ firstName: e.target.value })} />
                <input className={field} placeholder={t('fam.lastName')} value={c.lastName} onChange={(e) => set({ lastName: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select className={field} value={c.grade} onChange={(e) => set({ grade: Number(e.target.value) })} aria-label={t('fam.grade')}>
                  {Array.from({ length: 12 }, (_, g) => (
                    <option key={g + 1} value={g + 1}>
                      {t('grade', { n: g + 1 })}
                    </option>
                  ))}
                </select>
                <select className={field} value={c.membershipTier} onChange={(e) => set({ membershipTier: e.target.value as MembershipTier })} aria-label={t('fam.tier')}>
                  <option value="REGULAR_10">{t('tier.REGULAR_10')}</option>
                  <option value="UNLIMITED">{t('tier.UNLIMITED')}</option>
                </select>
                <select className={field} value={c.topic} onChange={(e) => set({ topic: e.target.value })} aria-label={t('fam.topic')}>
                  {Object.keys(TOPICS).map((k) => (
                    <option key={k} value={k}>
                      {topicLabel(k, t.lang)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
        <button type="button" onClick={() => setF({ ...f, children: [...f.children, { ...blankChild, lastName: f.children[0]?.lastName ?? '' }] })} className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
          <Plus className="size-4" /> {t('fam.addChild')}
        </button>
        {err && <p className="text-sm text-brand">{err}</p>}
        <button type="submit" disabled={!valid} className={cx(btn.primary, 'w-full')}>
          {t('fam.create')}
        </button>
      </form>
    </Drawer>
  );
}

// ───────────────────────── Settings ─────────────────────────

export function StaffSettings() {
  const s = useAppState();
  const t = useT();
  const [url, setUrl] = useState(s.sync.webhookUrl);
  const valid = isValidWebhookUrl(url);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold text-ink">{t('staff.settings')}</h1>
      <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <CalendarDays className="size-5 text-sky-600" />
          {t('set.connection')}
        </div>
        <p className="mt-1 text-sm text-slate-500">{t('set.help')}</p>
        <label className="mt-4 block text-xs font-medium text-slate-500">
          {t('set.url')}
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              const v = e.target.value.trim();
              setSync({ webhookUrl: v, mode: isValidWebhookUrl(v) ? s.sync.mode : 'SIMULATED' });
            }}
            dir="ltr"
            placeholder="https://your-n8n.example.com/webhook/mathnasium-booking"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-xs outline-none focus:border-brand"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm">
            <button disabled={!valid} onClick={() => setSync({ mode: 'LIVE' })} className={cx('rounded-lg px-3 py-1.5 font-semibold disabled:opacity-40', s.sync.mode === 'LIVE' ? 'bg-emerald-500 text-white' : 'text-slate-500')}>
              {t('set.live')}
            </button>
            <button onClick={() => setSync({ mode: 'SIMULATED' })} className={cx('rounded-lg px-3 py-1.5 font-semibold', s.sync.mode === 'SIMULATED' ? 'bg-white text-ink shadow-sm' : 'text-slate-500')}>
              {t('set.test')}
            </button>
          </div>
          <button onClick={sendTestEvent} className={cx(btn.outline, 'ms-auto py-2')}>
            <Send className="size-4" /> {t('set.ping')}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">{s.sync.mode === 'SIMULATED' ? t('set.testHelp') : t('set.cors')}</p>
      </section>

      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-ink">{t('set.log')}</span>
          {s.syncLog.length > 0 && (
            <button onClick={clearSyncLog} className="text-xs text-slate-400 hover:text-ink">
              <Trash2 className="inline size-3.5" />
            </button>
          )}
        </div>
        {s.syncLog.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">{t('set.empty')}</div>
        ) : (
          <ul className="space-y-2">
            {s.syncLog.map((e, i) => (
              <LogRow key={e.id} e={e} open={i === 0} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LogRow({ e, open: initial }: { e: SyncLogEntry; open: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(initial);
  const [copied, setCopied] = useState(false);
  const p = e.payload;
  const tone = e.status === 'FAILED' ? 'bg-brand-soft text-brand' : e.status === 'PENDING' ? 'bg-mastery-soft text-amber-700' : e.status === 'SIMULATED' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700';
  const json = JSON.stringify(p, null, 2);
  return (
    <li className="rounded-2xl border border-slate-200 bg-white">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-3 text-start text-sm">
        <span className="font-mono text-xs font-semibold text-ink" dir="ltr">
          {p.eventType}
        </span>
        <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', tone)}>{t(`sync.${e.status}`)}</span>
        <span className="truncate text-xs text-slate-400">{p.student?.fullName}</span>
        <span className="ms-auto text-[11px] text-slate-400 tabular-nums" dir="ltr">
          {new Date(p.dispatchedAtIso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Dubai' })}
        </span>
        <ChevronDown className={cx('size-4 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="relative px-4 pb-4">
          {e.error && <p className="mb-2 rounded-lg bg-brand-soft px-3 py-2 text-xs text-brand-dark">{e.error}</p>}
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(json);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="absolute end-6 top-2 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/20"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? t('set.copied') : t('set.copy')}
          </button>
          <pre dir="ltr" className="thin-scroll max-h-80 overflow-auto rounded-xl bg-ink-900 p-3 text-start font-mono text-[11px] leading-relaxed text-slate-200">
            {json}
          </pre>
        </div>
      )}
    </li>
  );
}
