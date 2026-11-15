import { useState } from 'react';
import { GraduationCap, LockKeyhole, User, Users } from 'lucide-react';
import { DEMO_LOGINS } from '../data/seedData.ts';
import { login, useT } from '../state/store.ts';
import { LangToggle } from './Header.tsx';
import { MathField, ProductEquations } from './MathField.tsx';
import { Logo, btn, cx } from './ui.tsx';

export function Login() {
  const t = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const submit = (u = username, p = password) => {
    const ok = login(u, p);
    setError(!ok);
  };

  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col bg-white/85 px-6 py-6 backdrop-blur-sm sm:px-12">
        <div className="flex items-center justify-between">
          <Logo className="h-10 sm:h-12" animate />
          <LangToggle />
        </div>

        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <h1 className="text-3xl font-bold text-ink">{t('login.title')}</h1>
          <p className="mt-2 text-slate-500">{t('login.subtitle')}</p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label className="block">
              <span className="text-sm font-medium text-slate-600">{t('login.username')}</span>
              <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
                <User className="size-4 text-slate-400" />
                <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" dir="ltr" className="w-full bg-transparent py-3 text-sm outline-none" />
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-600">{t('login.password')}</span>
              <span className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
                <LockKeyhole className="size-4 text-slate-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" dir="ltr" className="w-full bg-transparent py-3 text-sm outline-none" />
              </span>
            </label>
            {error && <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-dark">{t('login.error')}</p>}
            <button type="submit" className={cx(btn.primary, 'w-full py-3 text-base')}>
              {t('login.submit')}
            </button>
          </form>
          <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">{t('login.noAccount')}</p>

          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-4">
            <div className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">{t('login.demo')}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => submit(DEMO_LOGINS.parent.username, DEMO_LOGINS.parent.password)} className={btn.outline}>
                <Users className="size-4 text-brand" /> {t('login.demoParent')}
              </button>
              <button onClick={() => submit(DEMO_LOGINS.staff.username, DEMO_LOGINS.staff.password)} className={btn.outline}>
                <GraduationCap className="size-4 text-brand" /> {t('login.demoStaff')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(244,41,65,0.35),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,199,38,0.18),transparent_40%)]" />
        <div className="hero-grid absolute inset-0" />
        <MathField tone="dark" density={1.3} />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <div className="mb-auto pt-6">
            <ProductEquations lang={t.lang} />
          </div>
          <img src={`${import.meta.env.BASE_URL}brand/mathnasium-mark-light.png`} alt="" className="mb-6 h-12 w-auto self-start" />
          <div className="text-4xl leading-tight font-bold">{t('brand.tagline')}</div>
          <p className="mt-3 max-w-md text-white/70">{t('login.method')}</p>
          <div className="mt-8 h-1 w-24 rounded-full bg-brand" />
        </div>
      </div>
    </div>
  );
}
