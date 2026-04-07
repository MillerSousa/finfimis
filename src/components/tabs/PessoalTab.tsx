import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, getCategoryIcon, getPaymentMethodInfo } from '@/lib/constants';
import { Check, Clock, AlertTriangle, RefreshCw, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import BottomSheet from '@/components/BottomSheet';
import ExpenseForm from '@/components/ExpenseForm';
import ReceivableForm from '@/components/ReceivableForm';
import type { Tables } from '@/integrations/supabase/types';

type Expense = Tables<'expenses'>;
type Receivable = Tables<'receivables'>;

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
    if (expRes.data) setExpenses(expRes.data);
    if (recRes.data) setReceivables(recRes.data);
    setLoading(false);
  };

  const today = new Date().getDate();
  const currentMonthNow = new Date().getMonth() + 1;
  const currentYearNow = new Date().getFullYear();
  const isCurrentMonth = currentMonth === currentMonthNow && currentYear === currentYearNow;

  const getStatus = (e: Expense) => {
    if (e.is_paid) return 'paid';
    if (isCurrentMonth && e.due_day && e.due_day < today) return 'overdue';
    return 'pending';
  };

  const filteredExpenses = expenses.filter(e => {
    if (filter === 'all') return true;
    return getStatus(e) === filter;
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
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses(prev => prev.filter(e => e.id !== id));
    toast.success('Despesa excluída');
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

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
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

      {/* Expenses list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Despesas</h3>
        {filteredExpenses.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa encontrada</p>
        )}
        {filteredExpenses.map(expense => {
          const status = getStatus(expense);
          const pmInfo = getPaymentMethodInfo(expense.payment_method);
          return (
            <div
              key={expense.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-border/80 transition-colors group"
            >
              <span className="text-xl">{getCategoryIcon(expense.category)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{expense.name}</span>
                  {expense.is_recurring && <RefreshCw className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-foreground ${pmInfo.color}`}>
                    {pmInfo.label}
                  </span>
                  {expense.due_day && <span className="text-xs text-muted-foreground">Dia {expense.due_day}</span>}
                  {expense.parcel_current && expense.parcel_total && (
                    <span className="text-xs text-muted-foreground">{expense.parcel_current}/{expense.parcel_total}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-semibold text-foreground">{formatCurrency(Number(expense.value))}</span>
                <StatusBadge status={status} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => togglePaid(expense)} className="p-1 rounded hover:bg-secondary">
                  <Check className="w-4 h-4 text-success" />
                </button>
                <button onClick={() => { setEditingExpense(expense); setShowExpenseForm(true); }} className="p-1 rounded hover:bg-secondary">
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => deleteExpense(expense.id)} className="p-1 rounded hover:bg-secondary">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          );
        })}
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
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum recebível</p>
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
              {r.is_received ? '✅ Recebido' : '⏳ Aguardando'}
            </button>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditingReceivable(r); setShowReceivableForm(true); }} className="p-1 rounded hover:bg-secondary">
                <Edit className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => deleteReceivable(r.id)} className="p-1 rounded hover:bg-secondary">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
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
    </div>
  );
}

function SummaryCard({ label, value, variant }: { label: string; value: number; variant: 'default' | 'success' | 'warning' | 'primary' }) {
  const colors = {
    default: 'border-border',
    success: 'border-success/30',
    warning: 'border-warning/30',
    primary: 'border-primary/30',
  };
  const textColors = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    primary: 'text-primary',
  };
  return (
    <div className={`p-3 rounded-xl bg-card border ${colors[variant]}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${textColors[variant]}`}>{formatCurrency(value)}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: 'paid' | 'pending' | 'overdue' }) {
  if (status === 'paid') return <span className="flex items-center gap-1 text-[10px] text-success"><Check className="w-3 h-3" />Pago</span>;
  if (status === 'overdue') return <span className="flex items-center gap-1 text-[10px] text-destructive"><AlertTriangle className="w-3 h-3" />Vencido</span>;
  return <span className="flex items-center gap-1 text-[10px] text-warning"><Clock className="w-3 h-3" />Pendente</span>;
}
