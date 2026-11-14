import { useEffect } from 'react';
import { currentAccount, useAppState } from './state/store.ts';
import { Header } from './components/Header.tsx';
import { Login } from './components/Login.tsx';
import { ParentHome } from './components/ParentHome.tsx';
import { StaffCalendar, StaffFamilies, StaffSettings } from './components/StaffPages.tsx';
import { StaffDashboard } from './components/StaffDashboard.tsx';
import { Assistant } from './components/Assistant.tsx';
import { PitchBar } from './components/PitchBar.tsx';
import { Toasts } from './components/Toasts.tsx';

export default function App() {
  const s = useAppState();
  const acc = currentAccount(s);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = s.ui.lang;
    html.dir = s.ui.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = s.ui.lang === 'ar' ? 'ماثنيزيوم الإمارات — حجز الحصص' : 'Mathnasium UAE — Book a Session';
  }, [s.ui.lang]);

  return (
    <>
      {!acc ? (
        <Login />
      ) : (
        <div className="min-h-screen pb-20">
          <Header />
          <main key={`${acc.id}-${s.ui.staffTab}`}>
            {acc.role === 'PARENT' ? <ParentHome /> : s.ui.staffTab === 'FAMILIES' ? <StaffFamilies /> : s.ui.staffTab === 'SETTINGS' ? <StaffSettings /> : s.ui.staffTab === 'CALENDAR' ? <StaffCalendar /> : <StaffDashboard />}
          </main>
        </div>
      )}
      <Assistant />
      <PitchBar />
      <Toasts />
    </>
  );
}
