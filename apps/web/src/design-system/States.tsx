import type { ReactNode } from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { t } from '@/lib/i18n';

/* ---------------------------------------------------------------------------
   Estados de interface (secao 40): loading, vazio, erro e offline.
   Toda lista do produto usa estes componentes — nao existe "tela perfeita" so.
   --------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rb-skeleton', className)} aria-hidden />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <SkeletonText className="mt-4" />
    </div>
  );
}

export function SkeletonBookCard() {
  return (
    <div className="w-[9.5rem] shrink-0 space-y-2.5">
      <Skeleton className="aspect-[2/3] w-full rounded-control" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void } | ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  const isActionSpec = action && typeof action === 'object' && 'label' in (action as object);
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-raised/40 text-center',
        compact ? 'px-5 py-8' : 'px-6 py-14',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-burgundy shadow-paper">
          {icon}
        </div>
      )}
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted text-pretty">{description}</p>}
      {action && (
        <div className="mt-5">
          {isActionSpec ? (
            <Button size="sm" onClick={(action as { onClick: () => void }).onClick}>
              {(action as { label: string }).label}
            </Button>
          ) : (
            (action as ReactNode)
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  title = t('state.error.title'),
  description = t('state.error.description'),
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center rounded-card border border-danger/25 bg-danger/5 px-6 py-10 text-center',
        className,
      )}
    >
      <AlertTriangle className="mb-3 h-7 w-7 text-danger" aria-hidden />
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted text-pretty">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          {t('action.retry')}
        </Button>
      )}
    </div>
  );
}

export function OfflineBanner() {
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 border-b border-gold/30 bg-gold/12 px-4 py-2.5 text-sm text-ink"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-gold" aria-hidden />
      <span>{t('state.offline')}</span>
    </div>
  );
}
