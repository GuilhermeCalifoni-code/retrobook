import { cn } from '@/lib/cn';

export interface ProgressProps {
  value: number;
  label?: string;
  className?: string;
  tone?: 'burgundy' | 'gold' | 'success';
  size?: 'sm' | 'md';
}

const tones = {
  burgundy: 'bg-burgundy',
  gold: 'bg-gold',
  success: 'bg-success',
};

export function Progress({ value, label, className, tone = 'burgundy', size = 'sm' }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn('w-full', className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `Progresso de leitura: ${clamped}%`}
        className={cn('w-full overflow-hidden rounded-pill bg-line/60', size === 'sm' ? 'h-1.5' : 'h-2.5')}
      >
        <div
          className={cn('h-full rounded-pill transition-[width] duration-700 ease-editorial', tones[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
