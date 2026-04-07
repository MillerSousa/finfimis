import { Wallet, CreditCard, Bell, Briefcase, Settings } from 'lucide-react';

const TABS = [
  { id: 'pessoal', label: 'Pessoal', icon: Wallet },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'cobrancas', label: 'Cobranças', icon: Bell },
  { id: 'pj', label: 'PJ', icon: Briefcase },
  { id: 'config', label: 'Config', icon: Settings },
] as const;

export type TabId = typeof TABS[number]['id'];

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border safe-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto py-2">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
