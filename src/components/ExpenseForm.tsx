import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { CATEGORIES, PAYMENT_METHODS } from '@/lib/constants';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Expense = Tables<'expenses'>;
type Card = Tables<'cards'>;

interface ExpenseFormProps {
  expense: Expense | null;
  onSaved: () => void;
}

export default function ExpenseForm({ expense, onSaved }: ExpenseFormProps) {
  const { activeProfile, currentMonth, currentYear } = useApp();
  const [cards, setCards] = useState<Card[]>([]);
  const [name, setName] = useState(expense?.name ?? '');
  const [value, setValue] = useState(expense?.value?.toString() ?? '');
  const [dueDay, setDueDay] = useState(expense?.due_day?.toString() ?? '');
  const [category, setCategory] = useState(expense?.category ?? '');
  const [paymentMethod, setPaymentMethod] = useState(expense?.payment_method ?? 'pix');
  const [cardId, setCardId] = useState(expense?.card_id ?? '');
  const [parcelCurrent, setParcelCurrent] = useState(expense?.parcel_current?.toString() ?? '');
  const [parcelTotal, setParcelTotal] = useState(expense?.parcel_total?.toString() ?? '');
  const [isRecurring, setIsRecurring] = useState(expense?.is_recurring ?? false);
  const [isPaid, setIsPaid] = useState(expense?.is_paid ?? false);
  const [notes, setNotes] = useState(expense?.notes ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeProfile) {
      supabase.from('cards').select('*').eq('profile_id', activeProfile.id).then(({ data }) => {
        if (data) setCards(data);
      });
    }
  }, [activeProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !value || !activeProfile) return;
    setSaving(true);

    const data = {
      profile_id: activeProfile.id,
      name,
      value: parseFloat(value),
      due_day: dueDay ? parseInt(dueDay) : null,
      category: category || null,
      payment_method: paymentMethod,
      card_id: paymentMethod === 'credito' && cardId ? cardId : null,
      parcel_current: parcelCurrent ? parseInt(parcelCurrent) : null,
      parcel_total: parcelTotal ? parseInt(parcelTotal) : null,
      is_recurring: isRecurring,
      is_paid: isPaid,
      notes: notes || null,
      month: currentMonth,
      year: currentYear,
    };

    if (expense) {
      await supabase.from('expenses').update(data).eq('id', expense.id);
      toast.success('Despesa atualizada');
    } else {
      await supabase.from('expenses').insert(data);
      toast.success('Despesa adicionada');
    }
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground">Nome *</label>
        <input value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" required />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Valor (R$) *</label>
        <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" required />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Dia de vencimento</label>
        <input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Categoria</label>
        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
          <option value="">Selecionar</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Forma de pagamento</label>
        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
          {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      {paymentMethod === 'credito' && (
        <>
          <div>
            <label className="text-sm text-muted-foreground">Cartão</label>
            <select value={cardId} onChange={e => setCardId(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
              <option value="">Selecionar cartão</option>
              {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Parcela atual</label>
              <input type="number" min="1" value={parcelCurrent} onChange={e => setParcelCurrent(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Total de parcelas</label>
              <input type="number" min="1" value={parcelTotal} onChange={e => setParcelTotal(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
            </div>
          </div>
        </>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Recorrente?</span>
        <button type="button" onClick={() => setIsRecurring(!isRecurring)} className={`w-12 h-6 rounded-full transition-colors ${isRecurring ? 'bg-primary' : 'bg-secondary'}`}>
          <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${isRecurring ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">Já foi pago?</span>
        <button type="button" onClick={() => setIsPaid(!isPaid)} className={`w-12 h-6 rounded-full transition-colors ${isPaid ? 'bg-success' : 'bg-secondary'}`}>
          <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${isPaid ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div>
        <label className="text-sm text-muted-foreground">Observações</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" rows={2} />
      </div>
      <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
        {saving ? 'Salvando...' : (expense ? 'Atualizar' : 'Adicionar')}
      </button>
    </form>
  );
}
