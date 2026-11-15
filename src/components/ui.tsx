import { useEffect, type ReactNode } from 'react';
import { Infinity as InfinityIcon, Star, X } from 'lucide-react';
import type { MembershipTier, OccupancyStatus, Student } from '../types/domain.ts';
import { CAPACITY } from '../engine/calendar.ts';
import { useAppState, useT } from '../state/store.ts';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

/** The logo as two layers so the red A+ can be "drawn" in like a marker stroke. */
export function Logo({ className = 'h-9', animate, light }: { className?: string; animate?: boolean; light?: boolean }) {
  const dark = useAppState().ui.theme === 'dark' || light;
  return (
    <span className={cx('logo-stack select-none', animate && 'logo-animate', className)} role="img" aria-label="Mathnasium — The Math Learning Center">
      <img src={asset(dark ? 'brand/logo-wordmark-layer-light.png' : 'brand/logo-wordmark-layer.png')} alt="" className="logo-word" draggable={false} />
      <img src={asset('brand/logo-aplus-layer.png')} alt="" className="logo-aplus" draggable={false} />
    </span>
  );
}

export function APlus({ size = 40, pulse }: { size?: number; pulse?: boolean }) {
  return <img src={asset('brand/aplus.png')} alt="" style={{ height: size }} className={cx('w-auto select-none', pulse && 'aplus-pulse')} draggable={false} />;
}

/** Burst of mastery stars — shown when a booking is confirmed. */
export function StarBurst() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0">
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const d = 70 + (i % 3) * 28;
        return (
          <Star
            key={i}
            className="star-burst size-4 fill-mastery text-mastery"
            style={{ '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d * 0.7}px`, '--rot': `${(i % 2 ? 1 : -1) * 160}deg`, animationDelay: `${(i % 4) * 50}ms` } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

/** Monthly counter ring: 7/10, 10/10 or ∞. */
export function Ring({ used, limit, size = 56 }: { used: number; limit: number | null; size?: number }) {
  const stroke = Math.max(4, size / 11);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = limit === null ? 1 : Math.min(1, used / limit);
  const color = limit === null ? '#FFC726' : pct >= 1 ? '#F42941' : pct >= 0.9 ? '#f59e0b' : '#10b981';
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="ring-track" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 800ms ease, stroke 300ms' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-bold text-ink tabular-nums" dir="ltr" style={{ fontSize: size * 0.24 }}>
        {limit === null ? <InfinityIcon className="text-amber-500" style={{ width: size * 0.38, height: size * 0.38 }} /> : `${used}/${limit}`}
      </span>
    </div>
  );
}

const fill: Record<OccupancyStatus, string> = { AVAILABLE: 'bg-emerald-500', FILLING_FAST: 'bg-mastery', FULL: 'bg-brand' };

/** 12 seats drawn as 3 instructor pods of 4. */
export function SeatPods({ booked, status, size = 'md' }: { booked: number; status: OccupancyStatus; size?: 'sm' | 'md' }) {
  return (
    <div className="flex gap-1.5" dir="ltr" aria-label={`${booked}/${CAPACITY}`}>
      {[0, 1, 2].map((pod) => (
        <div key={pod} className="flex flex-1 gap-[3px] rounded-md bg-slate-100 p-[3px]">
          {[0, 1, 2, 3].map((i) => {
            const n = pod * 4 + i;
            return <span key={i} className={cx('flex-1 rounded-sm transition-colors duration-500', size === 'sm' ? 'h-1.5' : 'h-2', n < booked ? cx(fill[status], 'seat-pop') : 'bg-slate-300/70')} style={n < booked ? { animationDelay: `${n * 45}ms` } : undefined} />;
          })}
        </div>
      ))}
    </div>
  );
}

export function Avatar({ s, size = 36 }: { s: Pick<Student, 'firstName' | 'lastName' | 'avatarHue'>; size?: number }) {
  const initials = `${s.firstName[0] ?? ''}${(s.lastName.replace(/^(Al|Bin) /, '')[0] ?? '').toUpperCase()}`;
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `hsl(${s.avatarHue} 45% 45%)` }}
      dir="ltr"
    >
      {initials}
    </span>
  );
}

export function TierBadge({ tier }: { tier: MembershipTier }) {
  const t = useT();
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', tier === 'UNLIMITED' ? 'bg-mastery-soft text-amber-700' : 'bg-slate-100 text-slate-600')}>
      {tier === 'UNLIMITED' && <InfinityIcon className="size-3" />}
      {t(`tier.${tier}`)}
    </span>
  );
}

export function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600" dir="ltr">
      <Star className="size-3.5 fill-mastery text-mastery" />
      {n}
    </span>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2 text-sm text-slate-600">
      <span className={cx('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-slate-300')}>
        <span className={cx('knob absolute top-0.5 size-4 rounded-full bg-white shadow transition-all', checked ? 'start-[18px]' : 'start-0.5')} />
      </span>
      {label}
    </button>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

export function Modal({ onClose, children, width = 'max-w-md' }: { onClose: () => void; children: ReactNode; width?: string }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-end p-0 sm:place-items-center sm:p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cx('anim-pop relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl', width)}>
        <button onClick={onClose} className="absolute end-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
          <X className="size-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function Drawer({ onClose, title, children }: { onClose: () => void; title: ReactNode; children: ReactNode }) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink-900/30" onClick={onClose} />
      <aside className="anim-drawer absolute inset-y-0 end-0 flex w-full max-w-lg flex-col bg-white shadow-2xl">
        <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 flex-1">{title}</div>
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>
        <div className="thin-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}

export const btn = {
  primary: 'btn-shine inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-40',
  ghost: 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100',
  outline: 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-slate-300 hover:bg-slate-50',
};
