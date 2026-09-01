import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Chip de filtro e controle segmentado.
 *
 * Ambos existiam copiados em sete telas com pequenas variacoes de padding,
 * peso e cor de estado — a maior fonte de inconsistencia visual do produto.
 * Aqui existe uma unica definicao.
 */

export interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  /** `solid` preenche quando ativo; `soft` apenas tinge. */
  tone?: 'solid' | 'soft';
  count?: number;
  icon?: ReactNode;
  className?: string;
}

export function FilterChip({
  active,
  onClick,
  children,
  tone = 'solid',
  count,
  icon,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-pill border px-3.5 py-1.5 text-caption font-medium transition-colors',
        active
          ? tone === 'solid'
            ? 'border-burgundy bg-action text-on-brand'
            : 'border-burgundy bg-burgundy/10 text-burgundy'
          : 'border-line bg-surface text-muted hover:border-subtle hover:text-ink',
        className,
      )}
    >
      {icon}
      {children}
      {count !== undefined && (
        <span className={cn('font-mono text-label', active && tone === 'solid' ? 'opacity-80' : 'text-subtle')}>
          {count}
        </span>
      )}
    </button>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Texto do title/tooltip quando o rotulo estiver oculto no mobile. */
  hint?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** Esconde os rotulos abaixo de sm, deixando so o icone. */
  compact?: boolean;
  className?: string;
}

/** Alternador de poucas opcoes mutuamente exclusivas. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  compact,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5 rounded-pill border border-line bg-surface p-0.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint ?? option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-pill px-2.5 text-caption font-medium transition-colors',
              active ? 'bg-action text-on-brand' : 'text-muted hover:bg-raised hover:text-ink',
            )}
          >
            {option.icon}
            <span className={cn(compact && 'hidden sm:inline')}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Numero em destaque com rotulo (secao 12: metrica pequena nao precisa de card).
 * Por padrao vem sem moldura; `boxed` so quando estiver isolado do contexto.
 */
export function Stat({
  label,
  value,
  hint,
  icon,
  boxed,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  boxed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        boxed && 'rounded-card border border-line bg-surface px-4 py-3.5',
        'text-center',
        className,
      )}
    >
      {icon && <span className="mb-1 inline-flex text-gold">{icon}</span>}
      <p className="font-display text-display font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-caption text-muted">{label}</p>
      {hint && <p className="mt-0.5 text-label text-subtle">{hint}</p>}
    </div>
  );
}
