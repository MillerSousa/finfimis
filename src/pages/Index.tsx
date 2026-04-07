import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import ProfileSelect from '@/components/ProfileSelect';
import AppHeader from '@/components/AppHeader';
import BottomNav, { TabId } from '@/components/BottomNav';
import PessoalTab from '@/components/tabs/PessoalTab';
import CartoesTab from '@/components/tabs/CartoesTab';
import CobrancasTab from '@/components/tabs/CobrancasTab';
import PjTab from '@/components/tabs/PjTab';
import ConfigTab from '@/components/tabs/ConfigTab';

export default function Index() {
  const { activeProfile } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('pessoal');

  if (!activeProfile) return <ProfileSelect />;

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
