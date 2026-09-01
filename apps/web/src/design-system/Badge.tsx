import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'burgundy' | 'gold' | 'success' | 'danger' | 'outline';

const tones: Record<Tone, string> = {
  neutral: 'bg-raised text-muted border-transparent',
  burgundy: 'bg-burgundy/10 text-burgundy border-burgundy/20 dark:bg-burgundy/20',
  gold: 'bg-gold/12 text-gold border-gold/25 dark:bg-gold/18',
  success: 'bg-success/12 text-success border-success/25',
  danger: 'bg-danger/12 text-danger border-danger/25',
  outline: 'bg-transparent text-muted border-line',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: ReactNode;
  size?: 'sm' | 'md';
}

export function Badge({ tone = 'neutral', icon, size = 'sm', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-label' : 'px-2.5 py-1 text-xs',
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </span>
  );
}

/** Selo de compatibilidade literaria — o numero que resume o algoritmo. */
export function CompatibilityBadge({ score, className }: { score: number; className?: string }) {
  const tone = score >= 70 ? 'burgundy' : score >= 40 ? 'gold' : 'neutral';
  return (
    <Badge
      tone={tone}
      className={cn('font-mono tabular-nums', className)}
      title={`${score}% de compatibilidade literaria com voce`}
    >
      {score}% compativel
    </Badge>
  );
}
