import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface RatingProps {
  value: number | null | undefined;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  count?: number;
  className?: string;
}

const sizes = { sm: 'h-3.5 w-3.5', md: 'h-4.5 w-4.5', lg: 'h-6 w-6' };

export function Rating({ value, onChange, size = 'sm', showValue, count, className }: RatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const readOnly = !onChange;
  const display = hover ?? value ?? 0;

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <div
        className="inline-flex items-center gap-0.5"
        role={readOnly ? 'img' : 'radiogroup'}
        aria-label={readOnly ? `Nota ${value ?? 0} de 5` : 'Sua nota'}
        onMouseLeave={() => setHover(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(display);
          const Wrapper = readOnly ? 'span' : 'button';
          return (
            <Wrapper
              key={star}
              {...(readOnly
                ? {}
                : {
                    type: 'button' as const,
                    role: 'radio',
                    'aria-checked': star === value,
                    'aria-label': `${star} ${star === 1 ? 'estrela' : 'estrelas'}`,
                    onClick: () => onChange?.(star),
                    onMouseEnter: () => setHover(star),
                    className: 'transition-transform duration-150 hover:scale-110 active:scale-95',
                  })}
            >
              <Star
                className={cn(
                  sizes[size],
                  size === 'md' && 'h-[18px] w-[18px]',
                  filled ? 'fill-gold text-gold' : 'text-line',
                )}
                aria-hidden
              />
            </Wrapper>
          );
        })}
      </div>
      {showValue && (
        <span className="font-mono text-xs tabular-nums text-muted">
          {value ? value.toFixed(1) : '—'}
          {count !== undefined && count > 0 && <span className="text-subtle"> ({count})</span>}
        </span>
      )}
    </div>
  );
}
