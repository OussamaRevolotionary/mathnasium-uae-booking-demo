import { useEffect } from 'react';
import { Crown, GraduationCap, Lock, Presentation, RotateCcw, User, X } from 'lucide-react';
import { PERSONA } from '../data/seedData.ts';
import { getMonthlyUsage } from '../engine/bookingEngine.ts';
import { dubaiNow, toYearMonth } from '../engine/calendar.ts';
import { childName, currentAccount, pitchAs, resetDemo, ui, useAppState, useIndex, useT } from '../state/store.ts';
import { cx } from './ui.tsx';

/** Presenter-only shortcuts. Collapsed by default; Ctrl+Shift+D hides it completely. */
export function PitchBar() {
  const s = useAppState();
  const t = useT();
  const idx = useIndex();
  const ym = toYearMonth(dubaiNow().date);
  const acc = currentAccount(s);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        ui.setPitchHidden(!s.ui.pitchHidden);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [s.ui.pitchHidden]);

  if (s.ui.pitchHidden) return null;

  if (!s.ui.pitchOpen) {
    return (
      <button
        onClick={() => ui.setPitchOpen(true)}
        className="fixed bottom-4 start-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-ink/90 px-3 py-2 text-xs font-semibold text-white/90 shadow-lg backdrop-blur hover:bg-ink"
      >
        <Presentation className="size-4 text-mastery" /> {t('pitch.title')}
      </button>
    );
  }

  const kid = (id: string) => s.students.find((x) => x.id === id)!;
  const items = [
    { key: 'ZAYED' as const, id: PERSONA.ZAYED, icon: <User className="size-4" /> },
    { key: 'MARYAM' as const, id: PERSONA.MARYAM, icon: <Lock className="size-4" /> },
    { key: 'RASHID' as const, id: PERSONA.RASHID, icon: <Crown className="size-4" /> },
  ];

  return (
    <div className="anim-pop fixed bottom-4 start-4 z-40 w-[min(300px,calc(100vw-2rem))] rounded-2xl bg-ink p-3 text-white shadow-2xl">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-mastery">
          <Presentation className="size-4" /> {t('pitch.title')}
        </span>
        <button onClick={() => ui.setPitchOpen(false)} className="rounded p-1 text-white/50 hover:text-white">
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-1">
        {items.map((it) => {
          const k = kid(it.id);
          const u = getMonthlyUsage(k, ym, idx);
          const active = acc?.role === 'PARENT' && s.ui.childId === it.id;
          return (
            <button
              key={it.key}
              onClick={() => pitchAs(it.key)}
              className={cx('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition', active ? 'bg-brand text-white' : 'hover:bg-white/10')}
            >
              {it.icon}
              <span className="flex-1 text-start">{childName(k, t.lang)}</span>
              <span className="text-xs font-bold tabular-nums" dir="ltr">
                {u.limit === null ? '∞' : `${u.used}/${u.limit}`}
              </span>
            </button>
          );
        })}
        <button
          onClick={() => pitchAs('DIRECTOR')}
          className={cx('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition', acc?.role === 'STAFF' ? 'bg-brand text-white' : 'hover:bg-white/10')}
        >
          <GraduationCap className="size-4" /> {t('pitch.director')}
        </button>
      </div>
      <div className="mt-2 flex gap-1 border-t border-white/10 pt-2">
        <button onClick={resetDemo} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-white/80 hover:bg-white/10">
          <RotateCcw className="size-3.5" /> {t('pitch.reset')}
        </button>
        <button onClick={() => ui.setPitchHidden(true)} className="flex flex-1 items-center justify-center rounded-xl py-2 text-[11px] text-white/50 hover:bg-white/10">
          {t('pitch.hide')}
        </button>
      </div>
    </div>
  );
}
