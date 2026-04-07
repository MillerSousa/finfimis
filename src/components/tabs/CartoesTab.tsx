import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, getCategoryIcon } from '@/lib/constants';
import { CreditCard, Plus, MoreVertical, PackageOpen } from 'lucide-react';
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
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [newCardName, setNewCardName] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [cardMenuId, setCardMenuId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const openEditCard = (card: Card) => {
    setEditingCard(card);
    setNewCardName(card.name);
    setNewCardLimit((card as any).credit_limit?.toString() || '');
    setShowAddCard(true);
    setCardMenuId(null);
  };

  const saveCard = async () => {
    if (!newCardName || !activeProfile) return;
    setSaving(true);
    const data: any = { name: newCardName, credit_limit: newCardLimit ? parseFloat(newCardLimit) : null };
    if (editingCard) {
      await supabase.from('cards').update(data).eq('id', editingCard.id);
      toast.success('Cartão atualizado');
    } else {
      await supabase.from('cards').insert({ ...data, profile_id: activeProfile.id });
      toast.success('Cartão adicionado');
    }
    setSaving(false);
    setNewCardName('');
    setNewCardLimit('');
    setEditingCard(null);
    setShowAddCard(false);
    loadData();
  };

  const deleteCard = async (card: Card) => {
    if (!confirm(`Excluir o cartão "${card.name}"? As despesas serão mantidas sem cartão.`)) return;
    // Move expenses to unassigned
    await supabase.from('expenses').update({ card_id: null }).eq('card_id', card.id);
    await supabase.from('cards').delete().eq('id', card.id);
    toast.success('Cartão excluído');
    setCardMenuId(null);
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

      {cards.length === 0 && expenses.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <CreditCard className="w-10 h-10" />
          <p className="text-sm">Nenhum cartão cadastrado — toque em + para adicionar</p>
        </div>
      )}

      {cards.map(card => {
        const cardExpenses = expenses.filter(e => e.card_id === card.id);
        const subtotal = cardExpenses.reduce((s, e) => s + Number(e.value), 0);
        const limit = (card as any).credit_limit ? Number((card as any).credit_limit) : null;
        const usagePercent = limit ? (subtotal / limit) * 100 : null;
        const barColor = usagePercent !== null
          ? usagePercent > 80 ? 'bg-destructive' : usagePercent > 50 ? 'bg-warning' : 'bg-success'
          : '';

        return (
          <div key={card.id} className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">{card.name}</span>
              <span className="ml-auto text-sm font-bold text-primary">{formatCurrency(subtotal)}</span>
              <div className="relative">
                <button onClick={() => setCardMenuId(cardMenuId === card.id ? null : card.id)} className="p-1 rounded hover:bg-secondary">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
                {cardMenuId === card.id && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setCardMenuId(null)} />
                    <div className="absolute right-0 top-full mt-1 z-40 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
                      <button onClick={() => openEditCard(card)} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary">Editar</button>
                      <button onClick={() => deleteCard(card)} className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary">Excluir</button>
                    </div>
                  </>
                )}
              </div>
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
            {limit !== null && (
              <div className="px-4 py-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{usagePercent!.toFixed(0)}% usado</span>
                  <span>Limite: {formatCurrency(limit)}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(usagePercent!, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Unassigned expenses */}
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
        onClick={() => { setEditingCard(null); setNewCardName(''); setNewCardLimit(''); setShowAddCard(true); }}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      <BottomSheet open={showAddCard} onClose={() => { setShowAddCard(false); setEditingCard(null); }} title={editingCard ? 'Editar Cartão' : 'Novo Cartão'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Nome do cartão *</label>
            <input value={newCardName} onChange={e => setNewCardName(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" placeholder="Ex: Nubank" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Limite (R$)</label>
            <input type="number" step="0.01" value={newCardLimit} onChange={e => setNewCardLimit(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" placeholder="Opcional" />
          </div>
          <button onClick={saveCard} disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {saving ? 'Salvando...' : editingCard ? 'Atualizar' : 'Adicionar'}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
