import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { Plus } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';

type Profile = Tables<'profiles'>;

export default function ProfileSelect() {
  const { setActiveProfile } = useApp();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) {
      setProfiles(data);
      const savedId = localStorage.getItem('mg-active-profile');
      if (savedId) {
        const saved = data.find(p => p.id === savedId);
        if (saved) { setActiveProfile(saved); return; }
      }
    }
    setLoading(false);
  };

  if (loading && profiles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <Skeleton className="h-12 w-48 mx-auto" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-36 rounded-lg" />
            <Skeleton className="h-36 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">💰 Minha Grana</h1>
          <p className="text-muted-foreground">Quem está usando?</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {profiles.map(profile => (
            <button
              key={profile.id}
              onClick={() => setActiveProfile(profile)}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: profile.color + '20', color: profile.color }}
              >
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-foreground font-medium">{profile.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
