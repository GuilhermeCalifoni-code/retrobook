import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padded?: boolean;
}

export function Card({ interactive, padded = true, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-surface shadow-paper',
        padded && 'p-5',
        interactive &&
          'transition-all duration-200 ease-editorial hover:-translate-y-0.5 hover:border-subtle hover:shadow-lifted',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="font-display text-xl font-semibold text-ink sm:text-display">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted text-pretty">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Faixa fina no topo do card, no tom da comunidade — lembra marcador de livro. */
export function AccentBar({ color, className }: { color?: string | null; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('h-1 w-full rounded-t-card', className)}
      style={{ background: color ?? 'rgb(var(--rb-burgundy))' }}
    />
  );
}
