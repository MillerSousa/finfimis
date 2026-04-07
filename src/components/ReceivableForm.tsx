import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Receivable = Tables<'receivables'>;

interface ReceivableFormProps {
  receivable: Receivable | null;
  onSaved: () => void;
}

export default function ReceivableForm({ receivable, onSaved }: ReceivableFormProps) {
  const { activeProfile, currentMonth, currentYear } = useApp();
  const [personName, setPersonName] = useState(receivable?.person_name ?? '');
  const [value, setValue] = useState(receivable?.value?.toString() ?? '');
  const [dueDay, setDueDay] = useState(receivable?.due_day?.toString() ?? '');
  const [parcelCurrent, setParcelCurrent] = useState(receivable?.parcel_current?.toString() ?? '');
  const [parcelTotal, setParcelTotal] = useState(receivable?.parcel_total?.toString() ?? '');
  const [pixKey, setPixKey] = useState(receivable?.pix_key ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !activeProfile) return;
    setSaving(true);

    const data = {
      profile_id: activeProfile.id,
      person_name: personName,
      value: value ? parseFloat(value) : null,
      due_day: dueDay ? parseInt(dueDay) : null,
      parcel_current: parcelCurrent ? parseInt(parcelCurrent) : null,
      parcel_total: parcelTotal ? parseInt(parcelTotal) : null,
      pix_key: pixKey || null,
      month: currentMonth,
      year: currentYear,
    };

    if (receivable) {
      await supabase.from('receivables').update(data).eq('id', receivable.id);
      toast.success('Recebível atualizado');
    } else {
      await supabase.from('receivables').insert(data);
      toast.success('Recebível adicionado');
    }
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground">Nome da pessoa *</label>
        <input value={personName} onChange={e => setPersonName(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" required />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Valor (R$)</label>
        <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Dia esperado</label>
        <input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-muted-foreground">Parcela atual</label>
          <input type="number" min="1" value={parcelCurrent} onChange={e => setParcelCurrent(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">Total parcelas</label>
          <input type="number" min="1" value={parcelTotal} onChange={e => setParcelTotal(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
        </div>
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Chave PIX da pessoa</label>
        <input value={pixKey} onChange={e => setPixKey(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
      </div>
      <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
        {saving ? 'Salvando...' : (receivable ? 'Atualizar' : 'Adicionar')}
      </button>
    </form>
  );
}
