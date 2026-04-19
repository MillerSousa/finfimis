import { useState, useRef } from 'react';
import { Check, Trash2, RefreshCw, Edit, Clock, AlertTriangle, X } from 'lucide-react';
import { formatCurrency, getCategoryIcon, getPaymentMethodInfo } from '@/lib/constants';
import ActionMenu from '@/components/ActionMenu';
import type { Tables } from '@/integrations/supabase/types';

type Expense = Tables<'expenses'>;

interface SwipeableExpenseItemProps {
  expense: Expense;
  status: 'paid' | 'pending' | 'overdue';
  onTogglePaid: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
  dragHandleProps?: any;
}

export default function SwipeableExpenseItem({ expense, status, onTogglePaid, onDelete, onEdit, dragHandleProps }: SwipeableExpenseItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const pmInfo = getPaymentMethodInfo(expense.payment_method);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const diff = e.touches[0].clientX - startXRef.current;
    if (diff > 0) { setOffsetX(0); return; }
    setOffsetX(Math.max(diff, -140));
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setOffsetX(prev => prev < -60 ? -140 : 0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      {/* Action buttons behind (only visible while swiping) */}
      {offsetX < 0 && (
        <div className="absolute inset-y-0 right-0 flex">
          <button
            onClick={() => { onTogglePaid(expense); setOffsetX(0); }}
            className="w-[70px] flex items-center justify-center bg-success text-success-foreground"
          >
            <Check className="w-5 h-5" />
          </button>
          <button
            onClick={() => { onDelete(expense.id); setOffsetX(0); }}
            className="w-[70px] flex items-center justify-center bg-destructive text-destructive-foreground"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div
        className="relative flex items-center gap-3 p-3 bg-card rounded-xl transition-transform group"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => offsetX !== 0 && setOffsetX(0)}
      >
        <span className="text-xl cursor-grab active:cursor-grabbing" {...dragHandleProps}>
          {getCategoryIcon(expense.category)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{expense.name}</span>
            {expense.is_recurring && <RefreshCw className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white ${pmInfo.color}`}>
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
        <ActionMenu
          items={[
            {
              label: expense.is_paid ? 'Marcar como Pendente' : 'Marcar como Pago',
              icon: expense.is_paid ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />,
              onClick: () => onTogglePaid(expense),
              variant: 'success',
            },
            { label: 'Editar', icon: <Edit className="w-4 h-4" />, onClick: () => onEdit(expense) },
            { label: 'Excluir', icon: <Trash2 className="w-4 h-4" />, onClick: () => onDelete(expense.id), variant: 'destructive' },
          ]}
          desktopInline={
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onTogglePaid(expense)} className="p-1 rounded hover:bg-secondary" title={expense.is_paid ? 'Marcar pendente' : 'Marcar pago'}>
                {expense.is_paid ? <X className="w-4 h-4 text-warning" /> : <Check className="w-4 h-4 text-success" />}
              </button>
              <button onClick={() => onEdit(expense)} className="p-1 rounded hover:bg-secondary" title="Editar">
                <Edit className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => onDelete(expense.id)} className="p-1 rounded hover:bg-secondary" title="Excluir">
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'paid' | 'pending' | 'overdue' }) {
  if (status === 'paid') return <span className="flex items-center gap-1 text-[10px] text-success"><Check className="w-3 h-3" />Pago</span>;
  if (status === 'overdue') return <span className="flex items-center gap-1 text-[10px] text-destructive"><AlertTriangle className="w-3 h-3" />Vencido</span>;
  return <span className="flex items-center gap-1 text-[10px] text-warning"><Clock className="w-3 h-3" />Pendente</span>;
}
