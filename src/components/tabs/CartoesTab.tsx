import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, getPaymentMethodInfo, getCategoryIcon } from '@/lib/constants';
import { CreditCard, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import BottomSheet from '@/components/BottomSheet';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Card = Tables<'cards'>;
type Expense = Tables<'expenses'>;

export default function CartoesTab() {
  const { activeProfile, currentMonth, currentYear } = useApp();
  const [cards, setCards] = useState<Card[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardName, setNewCardName] = useState('');

  useEffect(() => {
    if (activeProfile) loadData();
  }, [activeProfile, currentMonth, currentYear]);

  const loadData = async () => {
    setLoading(true);
    const [cardsRes, expRes] = await Promise.all([
      supabase.from('cards').select('*').eq('profile_id', activeProfile!.id),
      supabase.from('expenses').select('*')
        .eq('profile_id', activeProfile!.id)
        .eq('month', currentMonth).eq('year', currentYear)
        .eq('payment_method', 'credito'),
    ]);
    if (cardsRes.data) setCards(cardsRes.data);
    if (expRes.data) setExpenses(expRes.data);
    setLoading(false);
  };

  const addCard = async () => {
    if (!newCardName || !activeProfile) return;
    await supabase.from('cards').insert({ profile_id: activeProfile.id, name: newCardName });
    toast.success('Cartão adicionado');
    setNewCardName('');
    setShowAddCard(false);
    loadData();
  };

  const totalAll = expenses.reduce((s, e) => s + Number(e.value), 0);

  if (loading) {
    return <div className="space-y-4 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="p-4 rounded-xl bg-card border border-border">
        <p className="text-xs text-muted-foreground">Total faturas</p>
        <p className="text-2xl font-bold text-foreground">{formatCurrency(totalAll)}</p>
      </div>

      {cards.map(card => {
        const cardExpenses = expenses.filter(e => e.card_id === card.id);
        const subtotal = cardExpenses.reduce((s, e) => s + Number(e.value), 0);
        return (
          <div key={card.id} className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">{card.name}</span>
              <span className="ml-auto text-sm font-bold text-primary">{formatCurrency(subtotal)}</span>
            </div>
            {cardExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Nenhuma despesa neste cartão</p>
            ) : (
              <div className="divide-y divide-border">
                {cardExpenses.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-lg">{getCategoryIcon(e.category)}</span>
                    <div className="flex-1">
                      <span className="text-sm text-foreground">{e.name}</span>
                      {e.parcel_current && e.parcel_total && (
                        <span className="text-xs text-muted-foreground ml-2">{e.parcel_current}/{e.parcel_total}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(Number(e.value))}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="px-4 py-2">
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: totalAll > 0 ? `${(subtotal / totalAll) * 100}%` : '0%' }} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Expenses without a card assigned */}
      {(() => {
        const unassigned = expenses.filter(e => !e.card_id);
        if (unassigned.length === 0) return null;
        const subtotal = unassigned.reduce((s, e) => s + Number(e.value), 0);
        return (
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <span className="font-semibold text-muted-foreground">Sem cartão definido</span>
              <span className="ml-auto text-sm font-bold text-muted-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <div className="divide-y divide-border">
              {unassigned.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg">{getCategoryIcon(e.category)}</span>
                  <span className="text-sm text-foreground flex-1">{e.name}</span>
                  <span className="text-sm font-medium text-foreground">{formatCurrency(Number(e.value))}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <button
        onClick={() => setShowAddCard(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      <BottomSheet open={showAddCard} onClose={() => setShowAddCard(false)} title="Novo Cartão">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Nome do cartão *</label>
            <input value={newCardName} onChange={e => setNewCardName(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" placeholder="Ex: Nubank" />
          </div>
          <button onClick={addCard} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold">Adicionar</button>
        </div>
      </BottomSheet>
    </div>
  );
}
