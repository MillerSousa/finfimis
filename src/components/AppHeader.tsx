import { useApp } from '@/contexts/AppContext';
import { ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react';
import { MONTH_NAMES } from '@/lib/constants';

export default function AppHeader() {
  const { activeProfile, setActiveProfile, currentMonth, currentYear, navigateMonth } = useApp();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="p-1 rounded-md hover:bg-secondary transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[120px] text-center">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
          <button onClick={() => navigateMonth(1)} className="p-1 rounded-md hover:bg-secondary transition-colors">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {activeProfile && (
          <button
            onClick={() => setActiveProfile(null)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: activeProfile.color + '30', color: activeProfile.color }}
            >
              {activeProfile.name.charAt(0)}
            </div>
            <span className="text-xs font-medium text-foreground">{activeProfile.name}</span>
            <ArrowLeftRight className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>
    </header>
  );
}
