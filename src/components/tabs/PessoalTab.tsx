import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, getCategoryIcon, getPaymentMethodInfo, MONTH_NAMES } from '@/lib/constants';
import { Plus, Copy, Bell, ArrowUpDown, PackageOpen, Edit, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import BottomSheet from '@/components/BottomSheet';
import ExpenseForm from '@/components/ExpenseForm';
import ReceivableForm from '@/components/ReceivableForm';
import SwipeableExpenseItem from '@/components/SwipeableExpenseItem';
import ActionMenu from '@/components/ActionMenu';
import type { Tables } from '@/integrations/supabase/types';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Expense = Tables<'expenses'>;
type Receivable = Tables<'receivables'>;

function SortableExpenseItem({ expense, status, onTogglePaid, onDelete, onEdit }: {
  expense: Expense; status: 'paid' | 'pending' | 'overdue';
  onTogglePaid: (e: Expense) => void; onDelete: (id: string) => void; onEdit: (e: Expense) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: expense.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SwipeableExpenseItem
        expense={expense}
        status={status}
        onTogglePaid={onTogglePaid}
        onDelete={onDelete}
        onEdit={onEdit}
        dragHandleProps={listeners}
      />
    </div>
  );
}

export default function PessoalTab() {
  const { activeProfile, currentMonth, currentYear } = useApp();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showReceivableForm, setShowReceivableForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'manual' | 'due' | 'value' | 'name'>('manual');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showReminder, setShowReminder] = useState<Receivable | null>(null);
  const [reminderText, setReminderText] = useState('');
  const [confirmDeleteReceivable, setConfirmDeleteReceivable] = useState<Receivable | null>(null);
  const hasReplicatedRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => {
    if (activeProfile) loadData();
  }, [activeProfile, currentMonth, currentYear]);

  const loadData = async () => {
    setLoading(true);
    const [expRes, recRes] = await Promise.all([
      supabase.from('expenses').select('*')
        .eq('profile_id', activeProfile!.id)
        .eq('month', currentMonth).eq('year', currentYear)
        .order('sort_order').order('due_day', { ascending: true, nullsFirst: false }),
      supabase.from('receivables').select('*')
        .eq('profile_id', activeProfile!.id)
        .eq('month', currentMonth).eq('year', currentYear),
    ]);
    if (expRes.data) {
      setExpenses(expRes.data);
      // Auto-replicate recurring expenses
      if (expRes.data.length === 0 && !hasReplicatedRef.current) {
        hasReplicatedRef.current = true;
        await replicateRecurring();
      }
    }
    if (recRes.data) setReceivables(recRes.data);
    setLoading(false);
  };

  const replicateRecurring = async () => {
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 1) { prevMonth = 12; prevYear--; }

    const { data: prevExpenses } = await supabase.from('expenses').select('*')
      .eq('profile_id', activeProfile!.id)
      .eq('month', prevMonth).eq('year', prevYear)
      .eq('is_recurring', true);

    if (prevExpenses && prevExpenses.length > 0) {
      const newExpenses = prevExpenses.map(e => ({
        profile_id: e.profile_id, name: e.name, value: e.value,
        due_day: e.due_day, category: e.category, payment_method: e.payment_method,
        card_id: e.card_id, is_recurring: true, is_paid: false,
        notes: e.notes, month: currentMonth, year: currentYear, sort_order: e.sort_order,
      }));
      await supabase.from('expenses').insert(newExpenses);
      toast.success(`${newExpenses.length} despesas recorrentes adicionadas para ${MONTH_NAMES[currentMonth - 1]}`);
      // Reload
      const { data } = await supabase.from('expenses').select('*')
        .eq('profile_id', activeProfile!.id)
        .eq('month', currentMonth).eq('year', currentYear)
        .order('sort_order').order('due_day', { ascending: true, nullsFirst: false });
      if (data) setExpenses(data);
    }
  };

  useEffect(() => { hasReplicatedRef.current = false; }, [currentMonth, currentYear]);

  const today = new Date().getDate();
  const currentMonthNow = new Date().getMonth() + 1;
  const currentYearNow = new Date().getFullYear();
  const isCurrentMonth = currentMonth === currentMonthNow && currentYear === currentYearNow;

  const getStatus = (e: Expense) => {
    if (e.is_paid) return 'paid' as const;
    if (isCurrentMonth && e.due_day && e.due_day < today) return 'overdue' as const;
    return 'pending' as const;
  };

  const filteredExpenses = expenses
    .filter(e => filter === 'all' || getStatus(e) === filter)
    .sort((a, b) => {
      if (sortBy === 'due') return (a.due_day ?? 99) - (b.due_day ?? 99);
      if (sortBy === 'value') return Number(b.value) - Number(a.value);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0; // manual — already sorted by sort_order from DB
    });

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.value), 0);
  const totalPaid = expenses.filter(e => e.is_paid).reduce((s, e) => s + Number(e.value), 0);
  const totalPending = totalExpenses - totalPaid;
  const totalReceivable = receivables.filter(r => !r.is_received).reduce((s, r) => s + Number(r.value || 0), 0);
  const paidPercent = totalExpenses > 0 ? (totalPaid / totalExpenses) * 100 : 0;

  const togglePaid = async (expense: Expense) => {
    await supabase.from('expenses').update({ is_paid: !expense.is_paid }).eq('id', expense.id);
    setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, is_paid: !e.is_paid } : e));
    toast.success(expense.is_paid ? 'Marcado como pendente' : 'Marcado como pago');
  };

  const deleteExpense = async (id: string) => {
    const deleted = expenses.find(e => e.id === id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast('Despesa excluída', {
      action: { label: 'Desfazer', onClick: async () => {
        if (deleted) {
          const { id: _, created_at, ...rest } = deleted;
          await supabase.from('expenses').insert({ ...rest, id: deleted.id });
          loadData();
        }
      }},
      duration: 3000,
    });
    await supabase.from('expenses').delete().eq('id', id);
  };

  const toggleReceived = async (r: Receivable) => {
    await supabase.from('receivables').update({ is_received: !r.is_received }).eq('id', r.id);
    setReceivables(prev => prev.map(x => x.id === r.id ? { ...x, is_received: !x.is_received } : x));
    toast.success(r.is_received ? 'Marcado como aguardando' : 'Marcado como recebido');
  };

  const deleteReceivable = async (id: string) => {
    await supabase.from('receivables').delete().eq('id', id);
    setReceivables(prev => prev.filter(r => r.id !== id));
    toast.success('Recebível excluído');
  };

  const copyPixKey = (r: Receivable) => {
    if (r.pix_key) {
      navigator.clipboard.writeText(r.pix_key);
      toast.success('Chave PIX copiada!');
    } else {
      setEditingReceivable(r);
      setShowReceivableForm(true);
    }
  };

  const openReminder = async (r: Receivable) => {
    let msg = `Oi ${r.person_name}! Você me deve ${formatCurrency(Number(r.value || 0))}`;
    if (r.parcel_current && r.parcel_total) msg += ` (parcela ${r.parcel_current}/${r.parcel_total})`;
    if (r.pix_key) {
      msg += `\nChave PIX: ${r.pix_key}`;
    } else {
      const { data: pixKeys } = await supabase.from('pix_keys').select('*')
        .eq('profile_id', activeProfile!.id).order('is_primary', { ascending: false }).limit(1);
      if (pixKeys?.[0]) msg += `\nChave PIX: ${pixKeys[0].key_value}`;
    }
    msg += `\nQualquer dúvida é só falar! 😊`;
    setReminderText(msg);
    setShowReminder(r);
  };

  const copyReminder = () => {
    navigator.clipboard.writeText(reminderText);
    toast.success('Mensagem copiada!');
    setShowReminder(null);
  };

  const sendReminderWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(reminderText)}`, '_blank');
    setShowReminder(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = expenses.findIndex(e => e.id === active.id);
    const newIndex = expenses.findIndex(e => e.id === over.id);
    const reordered = arrayMove(expenses, oldIndex, newIndex);
    setExpenses(reordered);

    // Save new order
    const updates = reordered.map((e, i) => supabase.from('expenses').update({ sort_order: i }).eq('id', e.id));
    await Promise.all(updates);
  };

  const SORT_OPTIONS = [
    { key: 'manual' as const, label: 'Ordem manual' },
    { key: 'due' as const, label: 'Vencimento' },
    { key: 'value' as const, label: 'Valor (maior)' },
    { key: 'name' as const, label: 'Nome (A–Z)' },
  ];

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Total gastos" value={totalExpenses} variant="default" />
        <SummaryCard label="Total pago" value={totalPaid} variant="success" />
        <SummaryCard label="Total pendente" value={totalPending} variant="warning" />
        <SummaryCard label="A receber" value={totalReceivable} variant="primary" />
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{paidPercent.toFixed(0)}% pago</span>
          <span>{formatCurrency(totalPaid)} / {formatCurrency(totalExpenses)}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${paidPercent}%` }} />
        </div>
      </div>

      {/* Filters + Sort */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto flex-1">
          {([['all', 'Todos'], ['paid', 'Pagos'], ['pending', 'Pendentes'], ['overdue', 'Vencidos']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filter === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <button onClick={() => setShowSortMenu(!showSortMenu)} className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowUpDown className="w-4 h-4" />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-40 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => { setSortBy(opt.key); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors ${sortBy === opt.key ? 'text-primary font-medium' : 'text-foreground'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expenses list with DnD */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Despesas</h3>
        {filteredExpenses.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <PackageOpen className="w-10 h-10" />
            <p className="text-sm">Nenhuma despesa ainda — toque em + para adicionar</p>
          </div>
        )}
        {sortBy === 'manual' ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredExpenses.map(e => e.id)} strategy={verticalListSortingStrategy}>
              {filteredExpenses.map(expense => (
                <SortableExpenseItem
                  key={expense.id}
                  expense={expense}
                  status={getStatus(expense)}
                  onTogglePaid={togglePaid}
                  onDelete={deleteExpense}
                  onEdit={(e) => { setEditingExpense(e); setShowExpenseForm(true); }}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          filteredExpenses.map(expense => (
            <SwipeableExpenseItem
              key={expense.id}
              expense={expense}
              status={getStatus(expense)}
              onTogglePaid={togglePaid}
              onDelete={deleteExpense}
              onEdit={(e) => { setEditingExpense(e); setShowExpenseForm(true); }}
            />
          ))
        )}
      </div>

      {/* Receivables */}
      <div className="space-y-2 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">A Receber</h3>
          <button onClick={() => { setEditingReceivable(null); setShowReceivableForm(true); }} className="text-xs text-primary font-medium">
            + Adicionar
          </button>
        </div>
        {receivables.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
            <PackageOpen className="w-8 h-8" />
            <p className="text-sm">Nenhum recebível ainda</p>
          </div>
        )}
        {receivables.map(r => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border group">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground">{r.person_name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                {r.due_day && <span className="text-xs text-muted-foreground">Dia {r.due_day}</span>}
                {r.parcel_current && r.parcel_total && (
                  <span className="text-xs text-muted-foreground">{r.parcel_current}/{r.parcel_total}</span>
                )}
              </div>
            </div>
            <span className="text-sm font-semibold text-primary">{formatCurrency(Number(r.value || 0))}</span>
            <button onClick={() => toggleReceived(r)} className={`text-xs px-2 py-1 rounded-full ${r.is_received ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
              {r.is_received ? '✅' : '⏳'}
            </button>
            <button onClick={() => copyPixKey(r)} className="p-1.5 rounded hover:bg-secondary" title="Copiar PIX">
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => setShowReminder(r)} className="p-1.5 rounded hover:bg-secondary" title="Lembrar">
              <Bell className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditingExpense(null); setShowExpenseForm(true); }}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Forms */}
      <BottomSheet open={showExpenseForm} onClose={() => { setShowExpenseForm(false); setEditingExpense(null); }} title={editingExpense ? 'Editar Despesa' : 'Nova Despesa'}>
        <ExpenseForm expense={editingExpense} onSaved={() => { setShowExpenseForm(false); setEditingExpense(null); loadData(); }} />
      </BottomSheet>
      <BottomSheet open={showReceivableForm} onClose={() => { setShowReceivableForm(false); setEditingReceivable(null); }} title={editingReceivable ? 'Editar Recebível' : 'Novo Recebível'}>
        <ReceivableForm receivable={editingReceivable} onSaved={() => { setShowReceivableForm(false); setEditingReceivable(null); loadData(); }} />
      </BottomSheet>

      {/* Reminder bottom sheet */}
      <BottomSheet open={!!showReminder} onClose={() => setShowReminder(null)} title={`Lembrar — ${showReminder?.person_name}`}>
        {showReminder && (
          <div className="space-y-3">
            <button onClick={() => generateReminderMessage(showReminder)} className="w-full p-4 rounded-xl bg-secondary text-left hover:bg-secondary/80 transition-colors">
              <p className="font-medium text-foreground">📋 Copiar mensagem</p>
              <p className="text-xs text-muted-foreground mt-1">Gera texto pronto para WhatsApp</p>
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function SummaryCard({ label, value, variant }: { label: string; value: number; variant: 'default' | 'success' | 'warning' | 'primary' }) {
  const colors = { default: 'border-border', success: 'border-success/30', warning: 'border-warning/30', primary: 'border-primary/30' };
  const textColors = { default: 'text-foreground', success: 'text-success', warning: 'text-warning', primary: 'text-primary' };
  return (
    <div className={`p-3 rounded-xl bg-card border ${colors[variant]}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${textColors[variant]}`}>{formatCurrency(value)}</p>
    </div>
  );
}
