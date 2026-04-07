import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, PJ_INCOME_CATEGORIES, PJ_EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/lib/constants';
import { TrendingUp, TrendingDown, DollarSign, Percent, Plus, Trash2, PackageOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import BottomSheet from '@/components/BottomSheet';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type PjEntry = Tables<'pj_entries'>;
type PjGoal = Tables<'pj_goals'>;

const COLORS = ['#3B82F6', '#EC4899', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#EAB308', '#6B7280'];

export default function PjTab() {
  const { activeProfile, currentMonth, currentYear } = useApp();
  const [entries, setEntries] = useState<PjEntry[]>([]);
  const [goal, setGoal] = useState<PjGoal | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalValue, setGoalValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state
  const [desc, setDesc] = useState('');
  const [value, setValue] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [category, setCategory] = useState('');
  const [client, setClient] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');

  useEffect(() => {
    if (activeProfile) loadData();
  }, [activeProfile, currentMonth, currentYear]);

  const loadData = async () => {
    setLoading(true);
    const [entriesRes, goalRes, chartRes] = await Promise.all([
      supabase.from('pj_entries').select('*')
        .eq('profile_id', activeProfile!.id)
        .eq('month', currentMonth).eq('year', currentYear).order('entry_date'),
      supabase.from('pj_goals').select('*')
        .eq('profile_id', activeProfile!.id)
        .eq('month', currentMonth).eq('year', currentYear).limit(1).maybeSingle(),
      supabase.from('pj_entries').select('*')
        .eq('profile_id', activeProfile!.id)
        .gte('month', currentMonth - 5).lte('year', currentYear),
    ]);
    if (entriesRes.data) setEntries(entriesRes.data);
    if (goalRes.data) { setGoal(goalRes.data); setGoalValue(goalRes.data.revenue_goal?.toString() || ''); }

    if (chartRes.data) {
      const months: Record<string, { income: number; expense: number; month: string }> = {};
      const MNAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      for (let i = 5; i >= 0; i--) {
        let m = currentMonth - i;
        let y = currentYear;
        if (m < 1) { m += 12; y--; }
        const key = `${y}-${m}`;
        months[key] = { income: 0, expense: 0, month: `${MNAMES[m - 1]}` };
      }
      chartRes.data.forEach(e => {
        const key = `${e.year}-${e.month}`;
        if (months[key]) {
          if (e.type === 'income') months[key].income += Number(e.value);
          else months[key].expense += Number(e.value);
        }
      });
      setChartData(Object.values(months));
    }
    setLoading(false);
  };

  const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.value), 0);
  const expense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.value), 0);
  const profit = income - expense;
  const margin = income > 0 ? (profit / income) * 100 : 0;

  const expenseByCategory = entries.filter(e => e.type === 'expense').reduce((acc, e) => {
    const cat = e.category || 'Outros';
    acc[cat] = (acc[cat] || 0) + Number(e.value);
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
  const totalExpensePJ = pieData.reduce((s, d) => s + d.value, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc || !value || !activeProfile) return;
    setSaving(true);
    await supabase.from('pj_entries').insert({
      profile_id: activeProfile.id, description: desc, value: parseFloat(value),
      entry_date: entryDate || null, type: formType, category: category || null,
      client: client || null, payment_method: formType === 'expense' ? paymentMethod : null,
      month: currentMonth, year: currentYear,
    });
    toast.success('Lançamento adicionado');
    setSaving(false);
    setShowForm(false);
    setDesc(''); setValue(''); setEntryDate(''); setCategory(''); setClient(''); setPaymentMethod('pix');
    loadData();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from('pj_entries').delete().eq('id', id);
    toast.success('Lançamento excluído');
    loadData();
  };

  const saveGoal = async () => {
    if (!activeProfile) return;
    const val = goalValue ? parseFloat(goalValue) : null;
    if (goal) {
      await supabase.from('pj_goals').update({ revenue_goal: val }).eq('id', goal.id);
    } else {
      await supabase.from('pj_goals').insert({ profile_id: activeProfile.id, month: currentMonth, year: currentYear, revenue_goal: val });
    }
    toast.success('Meta salva');
    setShowGoalForm(false);
    loadData();
  };

  if (loading) {
    return <div className="space-y-4 p-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }

  const goalPercent = goal?.revenue_goal ? Math.min((income / Number(goal.revenue_goal)) * 100, 100) : 0;

  return (
    <div className="space-y-4 pb-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-card border border-success/30">
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-success" /><span className="text-xs text-muted-foreground">Faturamento</span></div>
          <p className="text-lg font-bold text-success">{formatCurrency(income)}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-primary/30">
          <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Lucro líquido</span></div>
          <p className={`text-lg font-bold ${profit >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(profit)}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-destructive/30">
          <div className="flex items-center gap-2"><TrendingDown className="w-4 h-4 text-destructive" /><span className="text-xs text-muted-foreground">Gastos PJ</span></div>
          <p className="text-lg font-bold text-destructive">{formatCurrency(expense)}</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2"><Percent className="w-4 h-4 text-foreground" /><span className="text-xs text-muted-foreground">Margem</span></div>
          <p className="text-lg font-bold text-foreground">{margin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Goal */}
      <div className="p-3 rounded-xl bg-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Meta de faturamento</span>
          <button onClick={() => setShowGoalForm(true)} className="text-xs text-primary">Editar</button>
        </div>
        {goal?.revenue_goal ? (
          <>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-foreground">{goalPercent.toFixed(0)}%</span>
              <span className="text-muted-foreground">{formatCurrency(income)} / {formatCurrency(Number(goal.revenue_goal))}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full transition-all" style={{ width: `${goalPercent}%` }} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma meta definida</p>
        )}
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="p-3 rounded-xl bg-card border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Faturamento vs Gastos</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="month" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(222, 47%, 9%)', border: '1px solid hsl(222, 30%, 18%)', borderRadius: 8, color: 'hsl(210, 40%, 96%)' }} />
              <Bar dataKey="income" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Receita" />
              <Bar dataKey="expense" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pie Chart */}
      <div className="p-3 rounded-xl bg-card border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">Distribuição de gastos PJ</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="45%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(222, 47%, 9%)', border: '1px solid hsl(222, 30%, 18%)', borderRadius: 8, color: 'hsl(210, 40%, 96%)' }}
                formatter={(val: number) => formatCurrency(val)}
              />
              <Legend
                verticalAlign="bottom"
                formatter={(value: string) => {
                  const item = pieData.find(d => d.name === value);
                  const pct = item && totalExpensePJ > 0 ? ((item.value / totalExpensePJ) * 100).toFixed(0) : '0';
                  return `${value} (${pct}%)`;
                }}
                wrapperStyle={{ fontSize: 11, color: 'hsl(215, 20%, 55%)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <PackageOpen className="w-8 h-8" />
            <p className="text-sm">Nenhuma despesa cadastrada ainda</p>
          </div>
        )}
      </div>

      {/* Entries */}
      {['income', 'expense'].map(type => {
        const items = entries.filter(e => e.type === type);
        return (
          <div key={type} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {type === 'income' ? '📈 Receitas' : '📉 Despesas PJ'}
            </h3>
            {items.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <PackageOpen className="w-8 h-8" />
                <p className="text-sm">Nenhum lançamento — toque em + para adicionar</p>
              </div>
            )}
            {items.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border group">
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">{entry.description}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.category && <span className="text-xs text-muted-foreground">{entry.category}</span>}
                    {entry.client && <span className="text-xs text-muted-foreground">• {entry.client}</span>}
                  </div>
                </div>
                <span className={`text-sm font-semibold ${type === 'income' ? 'text-success' : 'text-destructive'}`}>
                  {type === 'income' ? '+' : '-'}{formatCurrency(Number(entry.value))}
                </span>
                <button onClick={() => deleteEntry(entry.id)} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {/* Single FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Form with toggle */}
      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title="Novo Lançamento PJ">
        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl bg-secondary p-1">
            <button
              type="button"
              onClick={() => setFormType('income')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${formType === 'income' ? 'bg-success text-success-foreground' : 'text-muted-foreground'}`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => setFormType('expense')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${formType === 'expense' ? 'bg-destructive text-destructive-foreground' : 'text-muted-foreground'}`}
            >
              Despesa
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Descrição *</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Valor (R$) *</label>
              <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" required />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Data</label>
              <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
                <option value="">Selecionar</option>
                {formType === 'income'
                  ? PJ_INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                  : PJ_EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.label}>{c.label}</option>)
                }
              </select>
            </div>
            {formType === 'income' && (
              <div>
                <label className="text-sm text-muted-foreground">Cliente</label>
                <input value={client} onChange={e => setClient(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
              </div>
            )}
            {formType === 'expense' && (
              <div>
                <label className="text-sm text-muted-foreground">Forma de pagamento</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
                  {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            )}
            <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </form>
        </div>
      </BottomSheet>

      {/* Goal Form */}
      <BottomSheet open={showGoalForm} onClose={() => setShowGoalForm(false)} title="Meta de Faturamento">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Meta mensal (R$)</label>
            <input type="number" step="0.01" value={goalValue} onChange={e => setGoalValue(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
          <button onClick={saveGoal} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold">Salvar</button>
        </div>
      </BottomSheet>
    </div>
  );
}
