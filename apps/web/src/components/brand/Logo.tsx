import { cn } from '@/lib/cn';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden focusable="false">
      <rect width="32" height="32" rx="7" fill="rgb(var(--rb-burgundy))" />
      <path d="M8 7.5h7.2c1.9 0 3.3 1.3 3.3 3.1v14.1c0-1.4-1.2-2.4-2.8-2.4H8V7.5Z" fill="rgb(var(--rb-raised))" />
      <path d="M24 7.5h-5.5c-1.9 0-3.3 1.3-3.3 3.1v14.1c0-1.4 1.2-2.4 2.8-2.4H24V7.5Z" fill="rgb(var(--rb-gold))" />
      <rect x="14.9" y="7.5" width="1.3" height="17.2" fill="rgb(var(--rb-burgundy))" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {!compact && (
        <span className="font-display text-xl font-semibold tracking-tight text-ink">
          Retro<span className="text-burgundy">Book</span>
        </span>
      )}
    </span>
  );
}
