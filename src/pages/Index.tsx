import { useState, useEffect, useRef } from 'react';
import money3d from '@/assets/money-3d.png';
import { useApp } from '@/contexts/AppContext';
import Login from '@/pages/Login';
import AppHeader from '@/components/AppHeader';
import BottomNav, { TabId } from '@/components/BottomNav';
import PessoalTab from '@/components/tabs/PessoalTab';
import CartoesTab from '@/components/tabs/CartoesTab';
import CobrancasTab from '@/components/tabs/CobrancasTab';
import PjTab from '@/components/tabs/PjTab';
import ConfigTab from '@/components/tabs/ConfigTab';
import { Loader2 } from 'lucide-react';

const VALID_TABS: TabId[] = ['pessoal', 'cartoes', 'cobrancas', 'pj', 'config'];
const ABSENCE_THRESHOLD_MS = 20_000;

function getInitialTab(): TabId {
  const params = new URLSearchParams(window.location.search);
  const t = params.get('tab') as TabId | null;
  return t && VALID_TABS.includes(t) ? t : 'pessoal';
}

export default function Index() {
  const { user, activeProfile, authLoading } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  const hiddenAtRef = useRef<number | null>(null);

  // Keep ?tab= in URL in sync (without reload)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') !== activeTab) {
      params.set('tab', activeTab);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, [activeTab]);

  // Hard refresh when tab regains focus after >20s away
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAtRef.current) {
        const awayMs = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (awayMs > ABSENCE_THRESHOLD_MS) {
          const params = new URLSearchParams(window.location.search);
          params.set('tab', activeTab);
          window.location.replace(`${window.location.pathname}?${params.toString()}`);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [activeTab]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Login />;

  if (!activeProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <img src={money3d} alt="Minha Grana" width={48} height={48} className="mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Minha Grana</h1>
          <p className="text-muted-foreground text-sm">Perfil não encontrado. Contate o administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-lg mx-auto px-4 pt-4 pb-24">
        {activeTab === 'pessoal' && <PessoalTab />}
        {activeTab === 'cartoes' && <CartoesTab />}
        {activeTab === 'cobrancas' && <CobrancasTab />}
        {activeTab === 'pj' && <PjTab />}
        {activeTab === 'config' && <ConfigTab />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
