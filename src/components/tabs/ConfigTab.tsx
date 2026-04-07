import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { PROFILE_COLORS, PIX_KEY_TYPES } from '@/lib/constants';
import { Edit, Trash2, Plus, Copy, Sun, Moon, Bell } from 'lucide-react';
import { toast } from 'sonner';
import BottomSheet from '@/components/BottomSheet';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type PixKey = Tables<'pix_keys'>;

export default function ConfigTab() {
  const { activeProfile, setActiveProfile, theme, toggleTheme } = useApp();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pixKeys, setPixKeys] = useState<PixKey[]>([]);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showPixForm, setShowPixForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editingPix, setEditingPix] = useState<PixKey | null>(null);
  const [saving, setSaving] = useState(false);

  // Profile form
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState('#3B82F6');

  // PIX form
  const [pixType, setPixType] = useState('cpf');
  const [pixValue, setPixValue] = useState('');
  const [pixLabel, setPixLabel] = useState('');
  const [pixIsPrimary, setPixIsPrimary] = useState(false);

  // Notification prefs
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('mg-notif-enabled') === 'true');
  const [notifDueDay, setNotifDueDay] = useState(() => localStorage.getItem('mg-notif-dueday') !== 'false');
  const [notifOverdue, setNotifOverdue] = useState(() => localStorage.getItem('mg-notif-overdue') !== 'false');
  const [notifReminder, setNotifReminder] = useState(() => localStorage.getItem('mg-notif-reminder') !== 'false');

  useEffect(() => {
    loadProfiles();
    if (activeProfile) loadPixKeys();
  }, [activeProfile]);

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at');
    if (data) setProfiles(data);
  };

  const loadPixKeys = async () => {
    if (!activeProfile) return;
    const { data } = await supabase.from('pix_keys').select('*').eq('profile_id', activeProfile.id).order('is_primary', { ascending: false });
    if (data) setPixKeys(data);
  };

  const openProfileForm = (profile?: Profile) => {
    if (profile) { setEditingProfile(profile); setProfileName(profile.name); setProfileColor(profile.color); }
    else { setEditingProfile(null); setProfileName(''); setProfileColor('#3B82F6'); }
    setShowProfileForm(true);
  };

  const saveProfile = async () => {
    if (!profileName) return;
    setSaving(true);
    if (editingProfile) {
      await supabase.from('profiles').update({ name: profileName, color: profileColor }).eq('id', editingProfile.id);
      if (activeProfile?.id === editingProfile.id) setActiveProfile({ ...activeProfile, name: profileName, color: profileColor });
      toast.success('Perfil atualizado');
    } else {
      await supabase.from('profiles').insert({ name: profileName, color: profileColor });
      toast.success('Perfil adicionado');
    }
    setSaving(false);
    setShowProfileForm(false);
    loadProfiles();
  };

  const deleteProfile = async (profile: Profile) => {
    if (profiles.length <= 1) { toast.error('Não é possível excluir o único perfil'); return; }
    if (!confirm(`Excluir perfil "${profile.name}" e todos os dados associados?`)) return;
    await supabase.from('profiles').delete().eq('id', profile.id);
    if (activeProfile?.id === profile.id) setActiveProfile(null);
    toast.success('Perfil excluído');
    loadProfiles();
  };

  const openPixForm = (pix?: PixKey) => {
    if (pix) { setEditingPix(pix); setPixType(pix.type); setPixValue(pix.key_value); setPixLabel(pix.label || ''); setPixIsPrimary(pix.is_primary ?? false); }
    else { setEditingPix(null); setPixType('cpf'); setPixValue(''); setPixLabel(''); setPixIsPrimary(false); }
    setShowPixForm(true);
  };

  const savePix = async () => {
    if (!pixValue || !activeProfile) return;
    setSaving(true);
    if (pixIsPrimary) await supabase.from('pix_keys').update({ is_primary: false }).eq('profile_id', activeProfile.id);
    if (editingPix) {
      await supabase.from('pix_keys').update({ type: pixType, key_value: pixValue, label: pixLabel || null, is_primary: pixIsPrimary }).eq('id', editingPix.id);
      toast.success('Chave PIX atualizada');
    } else {
      await supabase.from('pix_keys').insert({ profile_id: activeProfile.id, type: pixType, key_value: pixValue, label: pixLabel || null, is_primary: pixIsPrimary });
      toast.success('Chave PIX adicionada');
    }
    setSaving(false);
    setShowPixForm(false);
    loadPixKeys();
  };

  const deletePix = async (id: string) => {
    await supabase.from('pix_keys').delete().eq('id', id);
    toast.success('Chave PIX excluída');
    loadPixKeys();
  };

  const copyPixKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Chave PIX copiada!');
  };

  const toggleNotifications = async (val: boolean) => {
    if (val) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast.error('Permissão de notificação negada pelo navegador');
        return;
      }
    }
    setNotifEnabled(val);
    localStorage.setItem('mg-notif-enabled', String(val));
  };

  const setNotifPref = (key: string, setter: (v: boolean) => void, val: boolean) => {
    setter(val);
    localStorage.setItem(key, String(val));
  };

  const exportData = async () => {
    if (!activeProfile) return;
    const m = new Date().getMonth() + 1;
    const y = new Date().getFullYear();
    const [exp, rec, pj] = await Promise.all([
      supabase.from('expenses').select('*').eq('profile_id', activeProfile.id).eq('month', m).eq('year', y),
      supabase.from('receivables').select('*').eq('profile_id', activeProfile.id).eq('month', m).eq('year', y),
      supabase.from('pj_entries').select('*').eq('profile_id', activeProfile.id).eq('month', m).eq('year', y),
    ]);
    const data = { expenses: exp.data, receivables: rec.data, pj_entries: pj.data };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `minha-grana-${activeProfile.name}-${m}-${y}.json`;
    a.click();
    toast.success('Dados exportados');
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Profiles */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Usuários / Perfis</h3>
        {profiles.map(profile => (
          <div key={profile.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: profile.color + '20', color: profile.color }}>
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">{profile.name}</span>
            <button onClick={() => openProfileForm(profile)} className="p-1.5 rounded hover:bg-secondary"><Edit className="w-4 h-4 text-muted-foreground" /></button>
            <button onClick={() => deleteProfile(profile)} className="p-1.5 rounded hover:bg-secondary"><Trash2 className="w-4 h-4 text-destructive" /></button>
          </div>
        ))}
        <button onClick={() => openProfileForm()} className="flex items-center gap-2 text-sm text-primary font-medium">
          <Plus className="w-4 h-4" /> Adicionar usuário
        </button>
      </section>

      {/* PIX Keys */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Minhas Chaves PIX</h3>
        {pixKeys.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma chave cadastrada</p>}
        {pixKeys.map(pix => (
          <div key={pix.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary uppercase font-medium">
                  {PIX_KEY_TYPES.find(t => t.value === pix.type)?.label}
                </span>
                {pix.is_primary && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/20 text-success">Principal</span>}
                {pix.label && <span className="text-xs text-muted-foreground">{pix.label}</span>}
              </div>
              <p className="text-sm text-foreground mt-1 truncate">{pix.key_value}</p>
            </div>
            <button onClick={() => copyPixKey(pix.key_value)} className="p-1.5 rounded hover:bg-secondary"><Copy className="w-4 h-4 text-muted-foreground" /></button>
            <button onClick={() => openPixForm(pix)} className="p-1.5 rounded hover:bg-secondary"><Edit className="w-4 h-4 text-muted-foreground" /></button>
            <button onClick={() => deletePix(pix.id)} className="p-1.5 rounded hover:bg-secondary"><Trash2 className="w-4 h-4 text-destructive" /></button>
          </div>
        ))}
        <button onClick={() => openPixForm()} className="flex items-center gap-2 text-sm text-primary font-medium">
          <Plus className="w-4 h-4" /> Adicionar chave PIX
        </button>
      </section>

      {/* Notifications */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notificações</h3>
        <div className="space-y-1 rounded-xl bg-card border border-border overflow-hidden">
          <NotifToggle label="Ativar notificações push" icon={<Bell className="w-4 h-4 text-foreground" />} value={notifEnabled} onChange={toggleNotifications} />
          <NotifToggle label="Avisar no dia do vencimento" value={notifDueDay} onChange={v => setNotifPref('mg-notif-dueday', setNotifDueDay, v)} disabled={!notifEnabled} />
          <NotifToggle label="Avisar despesas vencidas (2 dias)" value={notifOverdue} onChange={v => setNotifPref('mg-notif-overdue', setNotifOverdue, v)} disabled={!notifEnabled} />
          <NotifToggle label="Lembretes de cobrança" value={notifReminder} onChange={v => setNotifPref('mg-notif-reminder', setNotifReminder, v)} disabled={!notifEnabled} />
        </div>
      </section>

      {/* Appearance */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Aparência</h3>
        <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-foreground" /> : <Sun className="w-4 h-4 text-foreground" />}
            <span className="text-sm text-foreground">Tema {theme === 'dark' ? 'escuro' : 'claro'}</span>
          </div>
          <button onClick={toggleTheme} className={`w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-secondary'}`}>
            <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </section>

      {/* Data */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados</h3>
        <button onClick={exportData} className="w-full p-3 rounded-xl bg-card border border-border text-sm text-foreground text-left hover:bg-secondary/50 transition-colors">
          📥 Exportar dados do mês
        </button>
      </section>

      {/* Profile Form */}
      <BottomSheet open={showProfileForm} onClose={() => setShowProfileForm(false)} title={editingProfile ? 'Editar Perfil' : 'Novo Perfil'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Nome *</label>
            <input value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Cor do avatar</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {PROFILE_COLORS.map(color => (
                <button key={color} onClick={() => setProfileColor(color)}
                  className={`w-10 h-10 rounded-full transition-all ${profileColor === color ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110' : ''}`}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </BottomSheet>

      {/* PIX Form */}
      <BottomSheet open={showPixForm} onClose={() => setShowPixForm(false)} title={editingPix ? 'Editar Chave PIX' : 'Nova Chave PIX'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Tipo *</label>
            <select value={pixType} onChange={e => setPixType(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
              {PIX_KEY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Chave *</label>
            <input value={pixValue} onChange={e => setPixValue(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Label / Apelido</label>
            <input value={pixLabel} onChange={e => setPixLabel(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" placeholder="Ex: Nubank pessoal" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Chave principal?</span>
            <button type="button" onClick={() => setPixIsPrimary(!pixIsPrimary)} className={`w-12 h-6 rounded-full transition-colors ${pixIsPrimary ? 'bg-primary' : 'bg-secondary'}`}>
              <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${pixIsPrimary ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <button onClick={savePix} disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

function NotifToggle({ label, icon, value, onChange, disabled }: {
  label: string; icon?: React.ReactNode; value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-3 ${disabled ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <button
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-secondary'}`}
      >
        <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
