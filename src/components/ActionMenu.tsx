import { useState, useRef, useEffect, useLayoutEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
 * - Mobile (<768px): botão "⋮" abre um menu dropdown via portal (escapa overflow-hidden),
 *   alinhado à direita do botão, com flip automático para cima se não couber abaixo.
 */
export default function ActionMenu({ items, desktopInline }: ActionMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'bottom' | 'top' } | null>(null);

  // Compute fixed position relative to button (escapes overflow-hidden parents)
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const MENU_W = 200;
    const MENU_H_EST = items.length * 44 + 8;
    const rect = btnRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const spaceBelow = vh - rect.bottom;
    const placement: 'bottom' | 'top' = spaceBelow < MENU_H_EST + 16 ? 'top' : 'bottom';
    let left = rect.right - MENU_W;
    if (left < 8) left = 8;
    if (left + MENU_W > vw - 8) left = vw - 8 - MENU_W;
    const top = placement === 'bottom' ? rect.bottom + 4 : rect.top - MENU_H_EST - 4;
    setPos({ top, left, placement });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onClickOutside);
      document.addEventListener('touchstart', onClickOutside);
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  if (isMobile) {
    return (
      <>
        <button
          ref={btnRef}
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1.5 rounded hover:bg-secondary"
          aria-label="Mais ações"
        >
          <MoreVertical className="w-5 h-5 text-muted-foreground" />
        </button>
        {open && pos && createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: 200 }}
            className="z-[100] bg-card border border-border rounded-xl shadow-2xl py-1 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
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
          </div>,
          document.body
        )}
      </>
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
