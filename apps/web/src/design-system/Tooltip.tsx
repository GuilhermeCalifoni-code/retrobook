import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

/** Dica curta em hover e foco. Nunca carrega informacao essencial sozinha. */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-50 w-max max-w-[15rem] -translate-x-1/2 animate-fade-in rounded-control border border-line bg-ink px-2.5 py-1.5 text-xs font-medium text-canvas shadow-lifted',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
