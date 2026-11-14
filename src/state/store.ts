/**
 * App store (useSyncExternalStore) + every action that changes data.
 * Rules live in the pure engine; this layer commits atomically and sends calendar events.
 *
 * Persistence: the demo calendar (~12k lessons) is regenerated deterministically on load,
 * so only the *differences* from it are saved to localStorage.
 */
import { useMemo, useSyncExternalStore } from 'react';
import type {
  Account,
  Booking,
  BookingDenialReason,
  Lang,
  LessonDuration,
  MembershipTier,
  Parent,
  Student,
  SyncConfig,
  SyncEventType,
  SyncLogEntry,
  WaitlistEntry,
  YearMonth,
} from '../types/domain.ts';
import { CENTERS, generateSeed, PERSONA, type SeedData } from '../data/seedData.ts';
import {
  buildIndex,
  canParentCancel,
  commitBooking,
  commitCancel,
  commitReschedule,
  endMin,
  getMonthlyUsage,
  googleEventId,
  type BookingIndex,
  type LessonRequest,
} from '../engine/bookingEngine.ts';
import { dubaiNow, firstBookableDay, fmtTime, formatDate, formatMonth, isoGST, toYearMonth } from '../engine/calendar.ts';
import { DEFAULT_SYNC_CONFIG, dispatch, newEventId, pendingEntry } from '../services/n8nSyncService.ts';
import { reasonKey, topicLabel, translate, whatsappMessage, type TranslationKey, type Vars, type WaTemplate } from '../i18n/translations.ts';

export type StaffTab = 'DASHBOARD' | 'CALENDAR' | 'FAMILIES' | 'SETTINGS';

export interface Toast {
  id: string;
  tone: 'success' | 'error' | 'info';
  text: string;
}

export interface UiState {
  lang: Lang;
  childId: string;
  date: string;
  duration: LessonDuration;
  hideFull: boolean;
  reschedulingId: string | null;
  staffTab: StaffTab;
  staffCenter: string;
  staffMode: 'DAY' | 'WEEK';
  pitchOpen: boolean;
  pitchHidden: boolean;
}

export interface AppState {
  generatedFor: YearMonth;
  parents: Parent[];
  students: Student[];
  accounts: Account[];
  bookings: Booking[];
  waitlist: WaitlistEntry[];
  syncLog: SyncLogEntry[];
  sync: SyncConfig;
  upgradeRequests: string[];
  accountId: string | null;
  ui: UiState;
  toasts: Toast[];
}

const STORAGE_KEY = 'mathnasium-uae-demo-v1';

// ───────────────────────── Initial state & persistence ─────────────────────────

let seedCache: SeedData | null = null;
function seed(): SeedData {
  const now = dubaiNow();
  if (!seedCache || seedCache.generatedFor !== toYearMonth(now.date)) seedCache = generateSeed(now);
  return seedCache;
}

function freshUi(lang: Lang = 'en'): UiState {
  const now = dubaiNow();
  return {
    lang,
    childId: PERSONA.ZAYED,
    date: firstBookableDay(now.date, now),
    duration: 60,
    hideFull: false,
    reschedulingId: null,
    staffTab: 'DASHBOARD',
    staffCenter: 'motor-city',
    staffMode: 'DAY',
    pitchOpen: false,
    pitchHidden: false,
  };
}

function initialState(keep?: { sync?: SyncConfig; lang?: Lang; accountId?: string | null; pitchHidden?: boolean }): AppState {
  const s = seed();
  return {
    generatedFor: s.generatedFor,
    parents: s.parents,
    students: s.students,
    accounts: s.accounts,
    bookings: s.bookings,
    waitlist: s.waitlist,
    syncLog: [],
    sync: keep?.sync ?? DEFAULT_SYNC_CONFIG,
    upgradeRequests: [],
    accountId: keep?.accountId ?? null,
    ui: { ...freshUi(keep?.lang), pitchHidden: keep?.pitchHidden ?? false },
    toasts: [],
  };
}

interface Saved {
  generatedFor: YearMonth;
  changedBookings: Booking[]; // new bookings + seed bookings that were cancelled/moved
  extraParents: Parent[];
  extraAccounts: Account[];
  students: Student[] | null; // only when a student was added or changed
  waitlist: WaitlistEntry[];
  syncLog: SyncLogEntry[];
  sync: SyncConfig;
  upgradeRequests: string[];
  accountId: string | null;
  ui: UiState;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const saved = JSON.parse(raw) as Saved;
    if (saved.generatedFor !== toYearMonth(dubaiNow().date)) {
      // New month → fresh demo calendar so personas start again at 9/10 and 10/10.
      return initialState({ sync: saved.sync, lang: saved.ui?.lang, accountId: saved.accountId });
    }
    const base = initialState();
    const changed = new Map(saved.changedBookings.map((b) => [b.id, b]));
    const bookings = base.bookings.map((b) => changed.get(b.id) ?? b);
    const seedIds = new Set(base.bookings.map((b) => b.id));
    for (const b of saved.changedBookings) if (!seedIds.has(b.id)) bookings.push(b);
    return {
      ...base,
      bookings,
      parents: [...base.parents, ...saved.extraParents],
      accounts: [...base.accounts, ...saved.extraAccounts],
      students: saved.students ?? base.students,
      waitlist: saved.waitlist,
      syncLog: saved.syncLog,
      sync: saved.sync,
      upgradeRequests: saved.upgradeRequests,
      accountId: saved.accountId,
      ui: { ...freshUi(), ...saved.ui, reschedulingId: null, pitchOpen: false },
    };
  } catch {
    return initialState();
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      const s = seed();
      const seedMap = new Map(s.bookings.map((b) => [b.id, b]));
      const seedParents = new Set(s.parents.map((p) => p.id));
      const seedAccounts = new Set(s.accounts.map((a) => a.id));
      const saved: Saved = {
        generatedFor: state.generatedFor,
        changedBookings: state.bookings.filter((b) => seedMap.get(b.id) !== b),
        extraParents: state.parents.filter((p) => !seedParents.has(p.id)),
        extraAccounts: state.accounts.filter((a) => !seedAccounts.has(a.id)),
        students: state.students === s.students ? null : state.students,
        waitlist: state.waitlist,
        syncLog: state.syncLog.slice(0, 30),
        sync: state.sync,
        upgradeRequests: state.upgradeRequests,
        accountId: state.accountId,
        ui: state.ui,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* private mode / quota — the demo keeps working in memory */
    }
  }, 300);
}

export const getState = () => state;

export function setState(fn: (s: AppState) => AppState) {
  state = fn(state);
  persist();
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useAppState = () => useSyncExternalStore(subscribe, getState);

export function useIndex(): BookingIndex {
  const bookings = useAppState().bookings;
  return useMemo(() => buildIndex(bookings), [bookings]);
}

export function useT() {
  const lang = useAppState().ui.lang;
  return useMemo(() => Object.assign((k: TranslationKey, v?: Vars) => translate(lang, k, v), { lang }), [lang]);
}

// ───────────────────────── Helpers ─────────────────────────

const tr = (k: TranslationKey, v?: Vars) => translate(state.ui.lang, k, v);
const uid = (p: string) => `${p}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
const setUi = (patch: Partial<UiState>) => setState((s) => ({ ...s, ui: { ...s.ui, ...patch } }));

export const childName = (s: Student, lang: Lang, full = false) =>
  lang === 'ar' ? (full ? `${s.firstNameAr} ${s.lastNameAr}` : s.firstNameAr) : full ? `${s.firstName} ${s.lastName}` : s.firstName;
export const parentName = (p: Parent, lang: Lang) => (lang === 'ar' ? p.fullNameAr : p.fullName);
export const centerName = (id: string, lang: Lang) => {
  const c = CENTERS.find((x) => x.id === id);
  return c ? (lang === 'ar' ? c.nameAr : c.name) : id;
};
export const whenLabel = (date: string, startMin: number, durationMin: number, lang: Lang) =>
  `${formatDate(date, lang, { weekday: 'long', day: 'numeric', month: 'long' })} · ${fmtTime(startMin)}–${fmtTime(startMin + durationMin)}`;

export function toast(text: string, tone: Toast['tone'] = 'success') {
  const id = uid('T');
  setState((s) => ({ ...s, toasts: [...s.toasts.slice(-2), { id, tone, text }] }));
  setTimeout(() => setState((s) => ({ ...s, toasts: s.toasts.filter((x) => x.id !== id) })), 4500);
}

export function currentAccount(s: AppState = state): Account | null {
  return s.accounts.find((a) => a.id === s.accountId) ?? null;
}

/** Google Calendar "add event" link — works without any backend. */
export function googleCalendarLink(b: Booking, student: Student, lang: Lang) {
  const fmt = (min: number) => `${b.date.replace(/-/g, '')}T${fmtTime(min).replace(':', '')}00`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Mathnasium — ${childName(student, lang)}`,
    dates: `${fmt(b.startMin)}/${fmt(endMin(b))}`,
    ctz: 'Asia/Dubai',
    location: `Mathnasium ${centerName(b.centerId, 'en')}, Dubai`,
    details: `${topicLabel(student.topic, lang)}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// ───────────────────────── Calendar sync events ─────────────────────────

function emit(eventType: SyncEventType, booking: Booking | null, student: Student | null, opts: { template?: WaTemplate; previous?: Booking } = {}) {
  const s = getState();
  const lang = s.ui.lang;
  const parent = student ? s.parents.find((p) => p.id === student.parentId) ?? null : null;
  const idx = buildIndex(s.bookings);
  const usage = student && booking ? getMonthlyUsage(student, toYearMonth(booking.date), idx) : null;
  const action = eventType === 'LESSON_BOOKED' ? 'CREATE_EVENT' : eventType === 'LESSON_CANCELLED' ? 'DELETE_EVENT' : eventType === 'LESSON_RESCHEDULED' ? 'UPDATE_EVENT' : 'NONE';
  const when = booking ? whenLabel(booking.date, booking.startMin, booking.durationMin, lang) : '';
  const used = usage ? `${usage.used}/${usage.limit ?? '∞'}` : '';

  const entry = pendingEntry(
    {
      eventType,
      eventId: newEventId(),
      dispatchedAtIso: new Date().toISOString(),
      bookingId: booking?.id ?? null,
      centerBranch: booking ? `Mathnasium ${centerName(booking.centerId, 'en')}` : null,
      student: student && { id: student.id, fullName: `${student.firstName} ${student.lastName}`, grade: student.grade, learningPlanTopic: topicLabel(student.topic, 'en') },
      membershipTier: student?.membershipTier ?? null,
      sessionMode: 'IN_CENTER',
      parent: parent && { fullName: parent.fullName, whatsapp: parent.whatsapp, email: parent.email },
      slotIsoGST: booking ? isoGST(booking.date, booking.startMin) : null,
      slotEndIsoGST: booking ? isoGST(booking.date, endMin(booking)) : null,
      durationMin: booking?.durationMin ?? null,
      previousSlotIsoGST: opts.previous ? isoGST(opts.previous.date, opts.previous.startMin) : null,
      hourlyOccupancy: booking ? `${idx.hourOccupancy(booking.centerId, booking.date, Math.floor(booking.startMin / 60))}/12` : null,
      monthlyQuotaUsed: used || null,
      googleCalendarAction: {
        action,
        eventId: action === 'NONE' || !booking ? null : googleEventId(booking),
        summary: action === 'NONE' || !student ? null : `Mathnasium · ${student.firstName} ${student.lastName} · ${topicLabel(student.topic, 'en')}`,
        attendees: action === 'NONE' || !parent ? [] : [parent.email],
      },
      whatsappNotification:
        opts.template && parent && student && booking
          ? {
              to: parent.whatsapp,
              locale: lang === 'ar' ? 'ar-AE' : 'en-US',
              message: whatsappMessage(lang, opts.template, {
                parent: parentName(parent, lang),
                student: childName(student, lang),
                center: centerName(booking.centerId, lang),
                when,
                used,
              }),
            }
          : null,
    },
    s.sync,
  );
  setState((st) => ({ ...st, syncLog: [entry, ...st.syncLog].slice(0, 40) }));
  void dispatch(entry).then((done) => {
    const failed = done.status === 'FAILED';
    if (failed && currentAccount()?.role === 'STAFF') toast(tr('toast.syncFailed'), 'error');
    setState((st) => ({
      ...st,
      syncLog: st.syncLog.map((e) => (e.id === done.id ? done : e)),
      bookings: booking ? st.bookings.map((b) => (b.id === booking.id ? { ...b, calendarSync: failed ? 'FAILED' : 'SYNCED' } : b)) : st.bookings,
    }));
  });
}

// ───────────────────────── Actions ─────────────────────────

export type Result = { ok: true; booking: Booking } | { ok: false; reason: BookingDenialReason };

export function login(username: string, password: string): boolean {
  const acc = state.accounts.find((a) => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password);
  if (!acc) return false;
  signIn(acc);
  return true;
}

function signIn(acc: Account, childId?: string) {
  const now = dubaiNow();
  const kids = acc.parentId ? state.students.filter((s) => s.parentId === acc.parentId) : [];
  setState((s) => ({
    ...s,
    accountId: acc.id,
    ui: {
      ...s.ui,
      childId: childId ?? kids[0]?.id ?? s.ui.childId,
      date: firstBookableDay(now.date, now),
      reschedulingId: null,
      staffTab: 'DASHBOARD',
      staffCenter: kids[0]?.centerId ?? s.ui.staffCenter,
    },
  }));
}

export const logout = () => setState((s) => ({ ...s, accountId: null, ui: { ...s.ui, reschedulingId: null } }));

export function bookLesson(childId: string, req: LessonRequest, source: Booking['source'] = 'PARENT'): Result {
  const s = getState();
  const student = s.students.find((x) => x.id === childId)!;
  const res = commitBooking(student, req, s.bookings, dubaiNow(), uid('BK'), source);
  if (!res.ok) {
    toast(tr(reasonKey(res.reason)), 'error');
    return res;
  }
  setState((st) => ({ ...st, bookings: res.bookings, waitlist: st.waitlist.filter((w) => !(w.studentId === childId && w.date === req.date && w.startMin === req.startMin)) }));
  toast(tr('toast.booked', { name: childName(student, s.ui.lang), when: whenLabel(req.date, req.startMin, req.durationMin, s.ui.lang) }));
  emit('LESSON_BOOKED', res.booking, student, { template: 'booked' });
  return { ok: true, booking: res.booking };
}

export function cancelLesson(bookingId: string, by: 'PARENT' | 'STAFF' = 'PARENT') {
  const s = getState();
  const b = s.bookings.find((x) => x.id === bookingId);
  if (!b || (by === 'PARENT' && !canParentCancel(b, dubaiNow()))) return;
  const { cancelled, bookings } = commitCancel(bookingId, s.bookings, new Date().toISOString());
  if (!cancelled) return;
  const student = s.students.find((x) => x.id === cancelled.studentId)!;
  setState((st) => ({ ...st, bookings }));
  toast(tr('toast.cancelled', { name: childName(student, s.ui.lang), month: formatMonth(toYearMonth(cancelled.date), s.ui.lang) }), 'info');
  emit('LESSON_CANCELLED', cancelled, student, { template: 'cancelled' });
}

export function startReschedule(bookingId: string) {
  const b = state.bookings.find((x) => x.id === bookingId);
  if (!b) return;
  setUi({ reschedulingId: b.id, childId: b.studentId, date: b.date, duration: b.durationMin });
}

export const stopReschedule = () => setUi({ reschedulingId: null });

export function rescheduleLesson(bookingId: string, req: LessonRequest): Result {
  const s = getState();
  const original = s.bookings.find((x) => x.id === bookingId)!;
  const student = s.students.find((x) => x.id === original.studentId)!;
  const res = commitReschedule(student, original, req, s.bookings, dubaiNow());
  if (!res.ok) {
    toast(tr(reasonKey(res.reason)), 'error');
    return res;
  }
  setState((st) => ({ ...st, bookings: res.bookings, ui: { ...st.ui, reschedulingId: null } }));
  toast(tr('toast.moved', { when: whenLabel(req.date, req.startMin, req.durationMin, s.ui.lang) }));
  emit('LESSON_RESCHEDULED', res.booking, student, { template: 'rescheduled', previous: original });
  return { ok: true, booking: res.booking };
}

export function joinWaitlist(childId: string, req: LessonRequest) {
  const s = getState();
  if (s.waitlist.some((w) => w.studentId === childId && w.date === req.date && w.startMin === req.startMin)) return;
  const student = s.students.find((x) => x.id === childId)!;
  const entry: WaitlistEntry = { id: uid('WL'), studentId: childId, ...req, createdAtIso: new Date().toISOString() };
  setState((st) => ({ ...st, waitlist: [...st.waitlist, entry] }));
  toast(tr('toast.notify'), 'info');
  const pseudo: Booking = { id: entry.id, studentId: childId, ...req, status: 'CONFIRMED', source: 'PARENT', calendarSync: 'SYNCED' };
  emit('WAITLIST_JOINED', pseudo, student, { template: 'waitlist' });
}

export function requestUpgrade(childId: string) {
  if (state.upgradeRequests.includes(childId)) return;
  setState((s) => ({ ...s, upgradeRequests: [...s.upgradeRequests, childId] }));
  toast(tr('toast.upgrade'), 'info');
}

export function setTier(studentId: string, membershipTier: MembershipTier) {
  setState((s) => ({ ...s, students: s.students.map((x) => (x.id === studentId ? { ...x, membershipTier } : x)) }));
}

export interface NewFamily {
  parentName: string;
  whatsapp: string;
  email: string;
  username: string;
  password: string;
  centerId: string;
  children: { firstName: string; lastName: string; grade: number; membershipTier: MembershipTier; topic: string }[];
}

export function createFamily(f: NewFamily): string | null {
  if (state.accounts.some((a) => a.username.toLowerCase() === f.username.trim().toLowerCase())) return 'username';
  const pid = uid('par-');
  const parent: Parent = { id: pid, fullName: f.parentName.trim(), fullNameAr: f.parentName.trim(), whatsapp: f.whatsapp.trim(), email: f.email.trim(), preferredLang: state.ui.lang };
  const kids: Student[] = f.children.map((c, i) => ({
    id: uid(`stu-${i}-`),
    firstName: c.firstName.trim(),
    lastName: c.lastName.trim(),
    firstNameAr: c.firstName.trim(),
    lastNameAr: c.lastName.trim(),
    grade: c.grade,
    membershipTier: c.membershipTier,
    parentId: pid,
    centerId: f.centerId,
    topic: c.topic,
    masteryStars: 0,
    avatarHue: Math.floor(Math.random() * 360),
  }));
  const account: Account = { id: uid('acc-'), role: 'PARENT', username: f.username.trim(), password: f.password, parentId: pid, displayName: parent.fullName };
  setState((s) => ({ ...s, parents: [...s.parents, parent], students: [...s.students, ...kids], accounts: [...s.accounts, account] }));
  toast(tr('toast.accountCreated', { name: parent.fullName }));
  return null;
}

export const setSync = (patch: Partial<SyncConfig>) => setState((s) => ({ ...s, sync: { ...s.sync, ...patch } }));
export const clearSyncLog = () => setState((s) => ({ ...s, syncLog: [] }));
export const sendTestEvent = () => emit('CONNECTION_TEST', null, null);

export function resetDemo() {
  const s = getState();
  seedCache = null;
  state = initialState({ sync: s.sync, lang: s.ui.lang, accountId: s.accountId, pitchHidden: s.ui.pitchHidden });
  state = { ...state, ui: { ...state.ui, childId: s.ui.childId, staffCenter: s.ui.staffCenter, staffTab: s.ui.staffTab } };
  persist();
  listeners.forEach((l) => l());
  toast(tr('toast.reset'), 'info');
}

/** Pitch shortcuts: sign in as the Al Mansoori parent on a given child, or as the director. */
export function pitchAs(target: 'ZAYED' | 'MARYAM' | 'RASHID' | 'DIRECTOR') {
  const role = target === 'DIRECTOR' ? 'STAFF' : 'PARENT';
  const acc = state.accounts.find((a) => a.role === role && (role === 'STAFF' || a.parentId === 'par-almansoori'))!;
  signIn(acc, target === 'DIRECTOR' ? undefined : PERSONA[target]);
  if (target === 'DIRECTOR') setUi({ staffCenter: 'motor-city' });
}

export const ui = {
  setLang: (lang: Lang) => setUi({ lang }),
  setChild: (childId: string) => setUi({ childId, reschedulingId: null }),
  setDate: (date: string) => setUi({ date }),
  setDuration: (duration: LessonDuration) => setUi({ duration }),
  setHideFull: (hideFull: boolean) => setUi({ hideFull }),
  setStaffTab: (staffTab: StaffTab) => setUi({ staffTab }),
  setStaffCenter: (staffCenter: string) => setUi({ staffCenter }),
  setStaffMode: (staffMode: UiState['staffMode']) => setUi({ staffMode }),
  setPitchOpen: (pitchOpen: boolean) => setUi({ pitchOpen }),
  setPitchHidden: (pitchHidden: boolean) => setUi({ pitchHidden }),
};
