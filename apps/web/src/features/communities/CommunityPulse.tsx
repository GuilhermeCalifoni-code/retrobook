import { cn } from '@/lib/cn';
import type { CommunityPulse as Pulse, PulseLevel } from '@/types/api';

/**
 * Indicador de vida da comunidade (secao 4).
 *
 * De propósito **não** é um número. Ninguém entra numa comunidade querendo
 * saber que ela tem "pulso 73" — quer saber se tem gente conversando. Por isso
 * o backend manda a frase pronta e aqui só damos a cor e o ponto pulsante.
 */

const STYLE: Record<PulseLevel, { dot: string; text: string; pulse: boolean }> = {
  thriving: { dot: 'bg-success', text: 'text-success', pulse: true },
  active: { dot: 'bg-gold', text: 'text-gold', pulse: false },
  quiet: { dot: 'bg-subtle', text: 'text-muted', pulse: false },
  dormant: { dot: 'bg-line', text: 'text-subtle', pulse: false },
  new: { dot: 'bg-burgundy-soft', text: 'text-burgundy', pulse: false },
};

export function CommunityPulseBadge({
  pulse,
  className,
  showDetail,
}: {
  pulse: Pulse;
  className?: string;
  showDetail?: boolean;
}) {
  const style = STYLE[pulse.level];

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        {style.pulse && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', style.dot)} />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', style.dot)} />
      </span>
      <span className={cn('text-sm font-medium', style.text)}>{pulse.label}</span>
      {showDetail && <span className="text-sm text-muted">· {pulse.detail}</span>}
    </span>
  );
}
