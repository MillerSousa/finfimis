import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/lib/constants';
import { Copy, Send, Plus, History, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import BottomSheet from '@/components/BottomSheet';
import type { Tables } from '@/integrations/supabase/types';

type Debtor = Tables<'debtors'>;
type CollectionHistory = Tables<'collection_history'>;

export default function CobrancasTab() {
  const { activeProfile, currentMonth, currentYear } = useApp();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [history, setHistory] = useState<CollectionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReminder, setShowReminder] = useState<Debtor | null>(null);
  const [showHistory, setShowHistory] = useState<Debtor | null>(null);
  const [editing, setEditing] = useState<Debtor | null>(null);
  const [debtorHistory, setDebtorHistory] = useState<CollectionHistory[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [monthlyValue, setMonthlyValue] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [email, setEmail] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [dueDay, setDueDay] = useState('');

  useEffect(() => {
    if (activeProfile) loadData();
  }, [activeProfile, currentMonth, currentYear]);

  const loadData = async () => {
    setLoading(true);
    const [debtorsRes, histRes] = await Promise.all([
      supabase.from('debtors').select('*').eq('profile_id', activeProfile!.id),
      supabase.from('collection_history').select('*').eq('month', currentMonth).eq('year', currentYear),
    ]);
    if (debtorsRes.data) setDebtors(debtorsRes.data);
    if (histRes.data) setHistory(histRes.data);
    setLoading(false);
  };

  const getMonthStatus = (debtorId: string) => {
    return history.find(h => h.debtor_id === debtorId);
  };

  const toggleReceived = async (debtor: Debtor) => {
    const existing = getMonthStatus(debtor.id);
    if (existing) {
      await supabase.from('collection_history').update({ is_received: !existing.is_received }).eq('id', existing.id);
    } else {
      await supabase.from('collection_history').insert({
        debtor_id: debtor.id, month: currentMonth, year: currentYear, is_received: true,
      });
    }
    loadData();
    toast.success('Status atualizado');
  };

  const copyPixKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('Chave PIX copiada!');
  };

  const generateMessage = async (debtor: Debtor) => {
    // Get user's primary PIX key
    const { data: pixKeys } = await supabase.from('pix_keys').select('*')
      .eq('profile_id', activeProfile!.id).order('is_primary', { ascending: false }).limit(1);
    const myPixKey = pixKeys?.[0]?.key_value ?? '[sua chave PIX]';

    const msg = `Oi ${debtor.name}! Tudo bem? Passando para lembrar do pagamento de ${formatCurrency(Number(debtor.monthly_value || 0))}${debtor.description ? ` referente a ${debtor.description}` : ''}. Minha chave PIX é ${myPixKey}. Qualquer dúvida, é só falar! 😊`;
    navigator.clipboard.writeText(msg);
    toast.success('Mensagem copiada!');
    
    // Log reminder
    const existing = getMonthStatus(debtor.id);
    if (existing) {
      await supabase.from('collection_history').update({ reminder_sent_at: new Date().toISOString(), reminder_method: 'copy' }).eq('id', existing.id);
    } else {
      await supabase.from('collection_history').insert({
        debtor_id: debtor.id, month: currentMonth, year: currentYear, reminder_sent_at: new Date().toISOString(), reminder_method: 'copy',
      });
    }
    setShowReminder(null);
    loadData();
  };

  const loadDebtorHistory = async (debtor: Debtor) => {
    const { data } = await supabase.from('collection_history').select('*')
      .eq('debtor_id', debtor.id).order('year', { ascending: false }).order('month', { ascending: false });
    setDebtorHistory(data || []);
    setShowHistory(debtor);
  };

  const resetForm = () => {
    setName(''); setDescription(''); setMonthlyValue(''); setPixKey(''); setEmail(''); setIsRecurring(true); setDueDay('');
    setEditing(null);
  };

  const openEditForm = (debtor: Debtor) => {
    setEditing(debtor);
    setName(debtor.name);
    setDescription(debtor.description || '');
    setMonthlyValue(debtor.monthly_value?.toString() || '');
    setPixKey(debtor.pix_key || '');
    setEmail(debtor.email || '');
    setIsRecurring(debtor.is_recurring ?? true);
    setDueDay(debtor.due_day?.toString() || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !activeProfile) return;
    const data = {
      profile_id: activeProfile.id,
      name, description: description || null,
      monthly_value: monthlyValue ? parseFloat(monthlyValue) : null,
      pix_key: pixKey || null, email: email || null,
      is_recurring: isRecurring, due_day: dueDay ? parseInt(dueDay) : null,
    };

    if (editing) {
      await supabase.from('debtors').update(data).eq('id', editing.id);
      toast.success('Devedor atualizado');
    } else {
      await supabase.from('debtors').insert(data);
      toast.success('Devedor adicionado');
    }
    setShowForm(false);
    resetForm();
    loadData();
  };

  const deleteDebtor = async (id: string) => {
    await supabase.from('debtors').delete().eq('id', id);
    toast.success('Devedor excluído');
    loadData();
  };

  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  if (loading) {
    return <div className="space-y-4 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-3 pb-4">
      {debtors.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum devedor cadastrado</p>}

      {debtors.map(debtor => {
        const status = getMonthStatus(debtor.id);
        const isReceived = status?.is_received;
        return (
          <div key={debtor.id} className="p-4 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{debtor.name}</h3>
                {debtor.description && <p className="text-xs text-muted-foreground">{debtor.description}</p>}
              </div>
              <span className="text-lg font-bold text-primary">{formatCurrency(Number(debtor.monthly_value || 0))}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {debtor.pix_key && (
                <button onClick={() => copyPixKey(debtor.pix_key!)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Copy className="w-3 h-3" /> Copiar PIX
                </button>
              )}
              <button onClick={() => toggleReceived(debtor)} className={`px-2 py-1 rounded-md text-xs ${isReceived ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                {isReceived ? '✅ Recebido' : '⏳ Aguardando'}
              </button>
              {status?.reminder_sent_at && (
                <span className="text-[10px] text-muted-foreground">
                  Lembrete: {new Date(status.reminder_sent_at).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setShowReminder(debtor)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                <Send className="w-3 h-3" /> Enviar lembrete
              </button>
              <button onClick={() => loadDebtorHistory(debtor)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground">
                <History className="w-3 h-3" /> Histórico
              </button>
              <button onClick={() => openEditForm(debtor)} className="p-1.5 rounded hover:bg-secondary"><Edit className="w-4 h-4 text-muted-foreground" /></button>
              <button onClick={() => deleteDebtor(debtor.id)} className="p-1.5 rounded hover:bg-secondary"><Trash2 className="w-4 h-4 text-destructive" /></button>
            </div>
          </div>
        );
      })}

      {/* FAB */}
      <button onClick={() => { resetForm(); setShowForm(true); }} className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40">
        <Plus className="w-6 h-6" />
      </button>

      {/* Add/Edit Debtor Form */}
      <BottomSheet open={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editing ? 'Editar Devedor' : 'Novo Devedor'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" required />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Descrição da dívida</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Valor mensal (R$)</label>
            <input type="number" step="0.01" value={monthlyValue} onChange={e => setMonthlyValue(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Chave PIX</label>
            <input value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Dia de vencimento</label>
            <input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground">Recorrente mensal?</span>
            <button type="button" onClick={() => setIsRecurring(!isRecurring)} className={`w-12 h-6 rounded-full transition-colors ${isRecurring ? 'bg-primary' : 'bg-secondary'}`}>
              <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
            {editing ? 'Atualizar' : 'Adicionar'}
          </button>
        </form>
      </BottomSheet>

      {/* Reminder Modal */}
      <BottomSheet open={!!showReminder} onClose={() => setShowReminder(null)} title="Enviar Lembrete">
        {showReminder && (
          <div className="space-y-3">
            <button onClick={() => generateMessage(showReminder)} className="w-full p-4 rounded-xl bg-secondary text-left hover:bg-secondary/80 transition-colors">
              <p className="font-medium text-foreground">📋 Copiar mensagem</p>
              <p className="text-xs text-muted-foreground mt-1">Gera texto pronto para WhatsApp</p>
            </button>
          </div>
        )}
      </BottomSheet>

      {/* History Modal */}
      <BottomSheet open={!!showHistory} onClose={() => setShowHistory(null)} title={`Histórico — ${showHistory?.name}`}>
        <div className="space-y-2">
          {debtorHistory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum histórico</p>}
          {debtorHistory.map(h => (
            <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <span className="text-sm text-foreground">{MONTHS[h.month - 1]} {h.year}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${h.is_received ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                {h.is_received ? '✅ Recebido' : '⏳ Aguardando'}
              </span>
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
