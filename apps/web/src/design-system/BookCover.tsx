import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Capa de livro.
 *
 * Quando o provedor externo entrega uma imagem, mostramos a imagem. Quando nao
 * entrega (ou ela falha), geramos uma capa tipografica deterministica a partir
 * do titulo — nada de retangulo cinza. A paleta e derivada do proprio titulo,
 * entao o mesmo livro tem sempre a mesma capa, em qualquer tela.
 */

const PALETTES = [
  { bg: '#7B2E3A', fg: '#F7F1E5', accent: '#C89B3C' },
  { bg: '#243B53', fg: '#F1EDE4', accent: '#C89B3C' },
  { bg: '#2E4A3A', fg: '#F2EFE6', accent: '#D8B36A' },
  { bg: '#4A3A5C', fg: '#F3EFE8', accent: '#C89B3C' },
  { bg: '#6B4423', fg: '#F7F1E5', accent: '#E0C08A' },
  { bg: '#1F1D1A', fg: '#EFE9DC', accent: '#C89B3C' },
  { bg: '#8A3B3B', fg: '#F7F1E5', accent: '#E8CFA0' },
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 33 + value.charCodeAt(i)) >>> 0;
  return h;
}

export interface BookCoverProps {
  title: string;
  author?: string;
  src?: string | null;
  className?: string;
  /** Sem sombra/borda quando embutida em outro card. */
  flat?: boolean;
}

export function BookCover({ title, author, src, className, flat }: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  const palette = useMemo(() => PALETTES[hash(title) % PALETTES.length]!, [title]);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      className={cn(
        'relative aspect-[2/3] w-full overflow-hidden rounded-control',
        !flat && 'shadow-paper ring-1 ring-black/5',
        className,
      )}
      // O tamanho do titulo escala com a largura da capa, nao com a da tela.
      style={{ containerType: 'inline-size' }}
    >
      {showImage ? (
        <img
          src={src!}
          alt={`Capa de ${title}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full flex-col justify-between p-[8%]"
          style={{ background: palette.bg, color: palette.fg }}
          role="img"
          aria-label={`Capa de ${title}${author ? `, de ${author}` : ''}`}
        >
          {/* Filete duplo superior, como em capas de colecao antiga. */}
          <div className="space-y-[3px]" aria-hidden>
            <div className="h-px w-full" style={{ background: palette.accent, opacity: 0.85 }} />
            <div className="h-px w-full" style={{ background: palette.accent, opacity: 0.5 }} />
          </div>

          <div className="flex flex-1 items-center">
            <p
              className="font-display leading-[1.12] text-pretty"
              style={{
                fontSize: 'clamp(0.68rem, 13cqw, 1.5rem)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </p>
          </div>

          <div className="space-y-[6px]" aria-hidden>
            <div className="h-px w-1/3" style={{ background: palette.accent, opacity: 0.7 }} />
            {author && (
              <p
                className="truncate font-sans uppercase"
                style={{ fontSize: 'clamp(0.4rem, 6cqw, 0.65rem)', letterSpacing: '0.1em', opacity: 0.75 }}
              >
                {author}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Brilho da lombada: da volume ao objeto sem precisar de imagem. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[7%]"
        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.28), rgba(255,255,255,0.06) 60%, transparent)' }}
      />
    </div>
  );
}
