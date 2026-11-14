import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useAppState } from '../state/store.ts';
import { cx } from './ui.tsx';

const tone = {
  success: { cls: 'border-emerald-200 bg-white', icon: <CheckCircle2 className="size-5 shrink-0 text-emerald-500" /> },
  error: { cls: 'border-red-200 bg-white', icon: <XCircle className="size-5 shrink-0 text-brand" /> },
  info: { cls: 'border-slate-200 bg-white', icon: <Info className="size-5 shrink-0 text-sky-500" /> },
};

export function Toasts() {
  const { toasts } = useAppState();
  return (
    <div className="pointer-events-none fixed inset-x-4 top-20 z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:end-4 sm:w-96 sm:items-stretch">
      {toasts.map((t) => (
        <div key={t.id} className={cx('anim-pop flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-sm text-ink shadow-lg', tone[t.tone].cls)}>
          {tone[t.tone].icon}
          <span className="leading-snug">{t.text}</span>
        </div>
      ))}
    </div>
  );
}
