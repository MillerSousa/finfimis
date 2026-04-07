import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface AppContextType {
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile | null) => void;
  currentMonth: number;
  currentYear: number;
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  navigateMonth: (direction: -1 | 1) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const now = new Date();
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
  const [currentMonth, setMonth] = useState(now.getMonth() + 1);
  const [currentYear, setYear] = useState(now.getFullYear());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('mg-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('mg-theme', theme);
  }, [theme]);

  const setActiveProfile = (profile: Profile | null) => {
    setActiveProfileState(profile);
    if (profile) {
      localStorage.setItem('mg-active-profile', profile.id);
    } else {
      localStorage.removeItem('mg-active-profile');
    }
  };

  const navigateMonth = (direction: -1 | 1) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <AppContext.Provider value={{
      activeProfile, setActiveProfile,
      currentMonth, currentYear, setMonth, setYear, navigateMonth,
      theme, toggleTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
