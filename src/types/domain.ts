/**
 * Mathnasium UAE — lesson booking domain model.
 * All times are Gulf Standard Time (Asia/Dubai, UTC+4). Times of day are minutes since midnight.
 */

export type Lang = 'en' | 'ar';
export type ISODate = string; // YYYY-MM-DD (GST)
export type YearMonth = string; // YYYY-MM  — monthly limits are scoped to this key

export type MembershipTier = 'REGULAR_10' | 'UNLIMITED';
export type LessonDuration = 30 | 60 | 90 | 120;

export interface Center {
  id: string;
  name: string;
  nameAr: string;
}

export interface Parent {
  id: string;
  fullName: string;
  fullNameAr: string;
  whatsapp: string;
  email: string;
  preferredLang: Lang;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr: string;
  lastNameAr: string;
  grade: number;
  membershipTier: MembershipTier;
  parentId: string;
  centerId: string;
  topic: string; // learning-plan topic key, e.g. 'FRACTIONS'
  masteryStars: number;
  avatarHue: number;
}

/** Accounts are created by the center — parents never self-register. */
export interface Account {
  id: string;
  role: 'PARENT' | 'STAFF';
  username: string;
  password: string; // demo only — a real build stores a hash on the server
  parentId?: string;
  displayName: string;
}

export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type CalendarSyncState = 'SYNCED' | 'PENDING' | 'FAILED';

export interface Booking {
  id: string;
  studentId: string;
  centerId: string;
  date: ISODate;
  startMin: number; // e.g. 840 = 14:00
  durationMin: LessonDuration;
  status: BookingStatus;
  source: 'SEED' | 'PARENT' | 'STAFF';
  calendarSync: CalendarSyncState;
  cancelledAtIso?: string;
}

export interface WaitlistEntry {
  id: string;
  studentId: string;
  centerId: string;
  date: ISODate;
  startMin: number;
  durationMin: LessonDuration;
  createdAtIso: string;
}

export type BookingDenialReason =
  | 'CENTER_CLOSED'
  | 'OUTSIDE_OPENING_HOURS'
  | 'IN_PAST'
  | 'BEYOND_BOOKING_WINDOW'
  | 'OVERLAPS_OWN_LESSON'
  | 'MONTHLY_LIMIT_REACHED'
  | 'FULL'
  | 'RESCHEDULE_OTHER_MONTH';

export interface BookingCheck {
  allowed: boolean;
  reason?: BookingDenialReason;
  seatsLeft: number; // free seats across every 30-min block the lesson covers
}

export type OccupancyStatus = 'AVAILABLE' | 'FILLING_FAST' | 'FULL';

export interface MonthlyUsage {
  yearMonth: YearMonth;
  tier: MembershipTier;
  used: number;
  limit: number | null;
  remaining: number | null;
  reached: boolean;
}

// ───────────────────────── Calendar sync (n8n → Google Calendar / WhatsApp) ─────────────────────────

export type SyncEventType =
  | 'LESSON_BOOKED'
  | 'LESSON_CANCELLED'
  | 'LESSON_RESCHEDULED'
  | 'WAITLIST_JOINED'
  | 'CONNECTION_TEST';

export interface SyncPayload {
  eventType: SyncEventType;
  eventId: string;
  dispatchedAtIso: string;
  bookingId: string | null;
  centerBranch: string | null;
  student: { id: string; fullName: string; grade: number; learningPlanTopic: string } | null;
  membershipTier: MembershipTier | null;
  sessionMode: 'IN_CENTER';
  parent: { fullName: string; whatsapp: string; email: string } | null;
  slotIsoGST: string | null;
  slotEndIsoGST: string | null;
  durationMin: number | null;
  previousSlotIsoGST: string | null;
  hourlyOccupancy: string | null; // "10/12"
  monthlyQuotaUsed: string | null; // "10/10" or "7/∞"
  googleCalendarAction: {
    action: 'CREATE_EVENT' | 'UPDATE_EVENT' | 'DELETE_EVENT' | 'NONE';
    eventId: string | null;
    summary: string | null;
    attendees: string[];
  };
  whatsappNotification: { to: string; locale: 'en-US' | 'ar-AE'; message: string } | null;
}

export type SyncMode = 'SIMULATED' | 'LIVE';
export type SyncStatus = 'PENDING' | 'DELIVERED' | 'DELIVERED_OPAQUE' | 'SIMULATED' | 'FAILED';

export interface SyncLogEntry {
  id: string;
  payload: SyncPayload;
  status: SyncStatus;
  mode: SyncMode;
  targetUrl: string | null;
  httpStatus?: number;
  latencyMs?: number;
  error?: string;
}

export interface SyncConfig {
  webhookUrl: string;
  mode: SyncMode;
}
