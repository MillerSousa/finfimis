import { useState, useRef, useEffect, ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export interface ActionMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'success';
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  /** Inline buttons rendered on hover (desktop). If omitted, falls back to icon-only buttons from items. */
  desktopInline?: ReactNode;
}

/**
 * ActionMenu — comportamento responsivo:
 * - Desktop (>=768px): botões inline aparecem no hover do card pai (group-hover)
 * - Mobile (<768px): botão "⋮" abre um menu dropdown com todas as ações
 */
export default function ActionMenu({ items, desktopInline }: ActionMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
    };
  }, [open]);

  if (isMobile) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
          className="p-1.5 rounded hover:bg-secondary"
          aria-label="Mais ações"
        >
          <MoreVertical className="w-5 h-5 text-muted-foreground" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[180px]">
            {items.map((item, i) => {
              const colorClass =
                item.variant === 'destructive' ? 'text-destructive' :
                item.variant === 'success' ? 'text-success' : 'text-foreground';
              return (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary transition-colors ${colorClass}`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Desktop: inline buttons on hover
  if (desktopInline) return <>{desktopInline}</>;

  return (
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {items.map((item, i) => {
        const colorClass =
          item.variant === 'destructive' ? 'text-destructive' :
          item.variant === 'success' ? 'text-success' : 'text-muted-foreground';
        return (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); item.onClick(); }}
            className="p-1 rounded hover:bg-secondary"
            title={item.label}
          >
            <span className={colorClass}>{item.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
