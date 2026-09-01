import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

export function Tabs<T extends string>({ items, value, onChange, variant = 'underline', className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'rb-scroll-x flex items-center gap-1',
        variant === 'underline' && 'border-b border-line',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative shrink-0 whitespace-nowrap text-sm font-medium transition-colors duration-200',
              variant === 'underline'
                ? cn('px-3.5 py-3', active ? 'text-burgundy' : 'text-muted hover:text-ink')
                : cn(
                    'rounded-pill border px-3.5 py-1.5',
                    active
                      ? 'border-burgundy bg-burgundy/10 text-burgundy'
                      : 'border-line bg-surface text-muted hover:text-ink',
                  ),
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {item.icon}
              {item.label}
              {item.count !== undefined && (
                <span className={cn('font-mono text-label', active ? 'text-burgundy' : 'text-subtle')}>
                  {item.count}
                </span>
              )}
            </span>
            {variant === 'underline' && active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-burgundy" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}
