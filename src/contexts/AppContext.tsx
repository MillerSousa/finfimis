import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { User, Session } from '@supabase/supabase-js';
import { useTabSync } from '@/hooks/useTabSync';

type Profile = Tables<'profiles'>;

interface AppContextType {
  user: User | null;
  session: Session | null;
  activeProfile: Profile | null;
  currentMonth: number;
  currentYear: number;
  setMonth: (month: number) => void;
  setYear: (year: number) => void;
  navigateMonth: (direction: -1 | 1) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  signOut: () => Promise<void>;
  authLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const now = new Date();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentMonth, setMonth] = useState(now.getMonth() + 1);
  const [currentYear, setYear] = useState(now.getFullYear());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('mg-theme') as 'dark' | 'light') || 'dark';
  });

  // Corrige bug de aba inativa: refresh de token + reconexão de canais Realtime
  useTabSync();

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('mg-theme', theme);
  }, [theme]);

  // Auth state listener - set up BEFORE getSession
  useEffect(() => {
    let mounted = true;

    // Helper: fetch profile for a user (deferred, nunca awaited dentro do callback de auth)
    const fetchProfile = (userId: string) => {
      supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (mounted) setActiveProfile(data ?? null);
        });
    };

    // Listener: NUNCA usar await/async com supabase aqui dentro (causa deadlock)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setActiveProfile(null);
        } else if (newSession?.user) {
          // Defer com setTimeout 0 para evitar deadlock no auth client
          setTimeout(() => fetchProfile(newSession.user.id), 0);
        }
        setAuthLoading(false);
      }
    );

    // Restaurar sessão existente do storage
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchProfile(existingSession.user.id);
      }
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const navigateMonth = (direction: -1 | 1) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const signOut = async () => {
    await supabase.auth.signOut();
    setActiveProfile(null);
    setUser(null);
    setSession(null);
  };

  return (
    <AppContext.Provider value={{
      user, session, activeProfile,
      currentMonth, currentYear, setMonth, setYear, navigateMonth,
      theme, toggleTheme, signOut, authLoading,
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
