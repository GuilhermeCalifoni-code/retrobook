import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export interface MenuProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  label?: string;
}

/** Dropdown leve: fecha ao clicar fora, ao rolar e no Escape. */
export function Menu({ trigger, items, align = 'right', label = 'Mais acoes' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            'absolute z-50 mt-2 min-w-[13rem] animate-scale-in overflow-hidden rounded-panel border border-line bg-surface p-1 shadow-lifted',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-50',
                item.tone === 'danger'
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-ink hover:bg-raised',
              )}
            >
              {item.icon && <span className="shrink-0 text-muted">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
