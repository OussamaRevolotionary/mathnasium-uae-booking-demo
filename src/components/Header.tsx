import { CalendarDays, LayoutDashboard, LogOut, MapPin, Settings, Users } from 'lucide-react';
import { CENTERS } from '../data/seedData.ts';
import { currentAccount, logout, ui, useAppState, useT, type StaffTab, centerFull } from '../state/store.ts';
import { Logo, cx } from './ui.tsx';

export function LangToggle() {
  const { ui: u } = useAppState();
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold">
      <button onClick={() => ui.setLang('en')} className={cx('rounded-full px-3 py-1.5 transition', u.lang === 'en' ? 'bg-white text-ink shadow-sm' : 'text-slate-500')}>
        EN
      </button>
      <button onClick={() => ui.setLang('ar')} className={cx('rounded-full px-3 py-1.5 transition', u.lang === 'ar' ? 'bg-white text-ink shadow-sm' : 'text-slate-500')} style={{ fontFamily: 'Tajawal' }}>
        العربية
      </button>
    </div>
  );
}

export function Header() {
  const s = useAppState();
  const t = useT();
  const acc = currentAccount(s);
  const staff = acc?.role === 'STAFF';
  const kidsCenter = s.students.find((x) => x.parentId === acc?.parentId)?.centerId;

  const tabs: { id: StaffTab; label: string; icon: React.ReactNode }[] = [
    { id: 'DASHBOARD', label: t.lang === 'ar' ? 'لوحة المتابعة' : 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
    { id: 'CALENDAR', label: t('staff.calendar'), icon: <CalendarDays className="size-4" /> },
    { id: 'FAMILIES', label: t('staff.families'), icon: <Users className="size-4" /> },
    { id: 'SETTINGS', label: t('staff.settings'), icon: <Settings className="size-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="h-1 bg-brand" />
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <Logo className="h-8 sm:h-10" animate />
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
        <div className="hidden min-w-0 sm:block">
          <div className="text-sm font-semibold text-ink">{staff ? t('brand.staffPortal') : t('brand.parentPortal')}</div>
          {staff ? (
            <label className="flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="size-3 text-brand" />
              <select value={s.ui.staffCenter} onChange={(e) => ui.setStaffCenter(e.target.value)} className="cursor-pointer bg-transparent font-medium text-slate-600 outline-none">
                {CENTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {centerFull(c.id, t.lang)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            kidsCenter && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="size-3 text-brand" /> {centerFull(kidsCenter, t.lang)}
              </div>
            )
          )}
        </div>
        <div className="ms-auto flex items-center gap-2">
          <LangToggle />
          {acc && (
            <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-ink" title={t('nav.logout')}>
              <LogOut className="size-4 rtl:rotate-180" />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          )}
        </div>
      </div>
      {staff && (
        <nav className="mx-auto flex max-w-6xl gap-1 px-4">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => ui.setStaffTab(tb.id)}
              className={cx(
                'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition',
                s.ui.staffTab === tb.id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-ink',
              )}
            >
              {tb.icon}
              {tb.label}
            </button>
          ))}
          <label className="ms-auto flex items-center gap-1 text-xs text-slate-500 sm:hidden">
            <MapPin className="size-3 text-brand" />
            <select value={s.ui.staffCenter} onChange={(e) => ui.setStaffCenter(e.target.value)} className="bg-transparent outline-none">
              {CENTERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {t.lang === 'ar' ? c.nameAr : c.name}
                </option>
              ))}
            </select>
          </label>
        </nav>
      )}
    </header>
  );
}
