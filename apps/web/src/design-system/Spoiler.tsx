import { useState, type ReactNode } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SpoilerProps {
  /** Se false, o conteudo aparece direto. */
  active: boolean;
  /** Rotulo do alcance: "Ate o capitulo 12", "Final do livro". */
  scope?: string | null;
  /** Por que esta escondido — vem do backend, ja considerando seu progresso. */
  explanation?: string | null;
  children: ReactNode;
  className?: string;
}

/**
 * Veu de spoiler (secao 14).
 *
 * A decisao de esconder vem do backend, que compara o alcance declarado do
 * spoiler com o progresso real de quem le. Aqui so obedecemos — e explicamos.
 *
 * O conteudo continua no DOM, mas desfocado e inerte; `aria-hidden` evita que
 * um leitor de tela entregue o spoiler antes da pessoa escolher ver.
 */
export function Spoiler({ active, scope, explanation, children, className }: SpoilerProps) {
  const [revealed, setRevealed] = useState(false);

  if (!active) return <div className={className}>{children}</div>;

  return (
    <div className={cn('relative', className)}>
      <div className={cn(!revealed && 'rb-spoiler-veil')} aria-hidden={!revealed}>
        {children}
      </div>

      {!revealed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-control bg-raised/75 px-4 text-center backdrop-blur-[1px]">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-burgundy">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            {scope ?? 'Contem spoiler'}
          </p>

          {/* O microcopy que diferencia o RetroBook: diz quando isso vai abrir. */}
          {explanation && <p className="max-w-xs text-xs leading-relaxed text-muted">{explanation}</p>}

          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-0.5 inline-flex items-center gap-1.5 rounded-pill border border-burgundy/30 bg-surface px-3 py-1.5 text-xs font-medium text-burgundy transition-colors hover:bg-burgundy hover:text-on-brand"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Mostrar mesmo assim
          </button>
        </div>
      )}

      {revealed && (
        <button
          type="button"
          onClick={() => setRevealed(false)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-subtle transition-colors hover:text-muted"
        >
          <EyeOff className="h-3.5 w-3.5" aria-hidden />
          Esconder novamente
        </button>
      )}
    </div>
  );
}
