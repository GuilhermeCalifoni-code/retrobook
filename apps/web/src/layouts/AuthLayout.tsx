import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookCover } from '@/design-system';
import { Logo } from '@/components/brand/Logo';

const SPINE_BOOKS = [
  { title: 'Duna', author: 'Frank Herbert' },
  { title: 'A Hora da Estrela', author: 'Clarice Lispector' },
  { title: 'O Nome do Vento', author: 'Patrick Rothfuss' },
];

/** Layout das telas de conta: formulario a esquerda, promessa do produto a direita. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,26rem)] xl:grid-cols-[1fr_minmax(0,30rem)]">
      {/* Painel editorial (desktop) */}
      <aside className="relative hidden overflow-hidden bg-burgundy p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #C89B3C 0%, transparent 45%), radial-gradient(circle at 80% 70%, #F7F1E5 0%, transparent 40%)',
          }}
        />

        <Link to="/" className="relative z-10 inline-flex">
          <span className="inline-flex items-center gap-2.5">
            <span className="font-display text-xl font-semibold text-on-brand">
              Retro<span className="text-gold">Book</span>
            </span>
          </span>
        </Link>

        <div className="relative z-10 max-w-md">
          <div className="mb-10 flex gap-4" aria-hidden>
            {SPINE_BOOKS.map((book, index) => (
              <div
                key={book.title}
                className="w-28 shrink-0"
                style={{ transform: `rotate(${index === 1 ? 2 : -2}deg) translateY(${index * 8}px)` }}
              >
                <BookCover title={book.title} author={book.author} />
              </div>
            ))}
          </div>

          <p className="font-display text-3xl font-semibold leading-tight text-on-brand text-balance">
            Talvez exista alguem lendo exatamente o que voce esta lendo.
          </p>
          <p className="mt-4 text-on-brand/75 text-pretty">
            O RetroBook usa a sua estante para encontrar pessoas, comunidades e conversas que fazem sentido para voce.
          </p>
        </div>

        <p className="relative z-10 text-sm text-on-brand/60">
          Leia junto, mesmo estando longe.
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex flex-col justify-center bg-canvas px-5 py-10 rb-paper sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex lg:hidden" aria-label="RetroBook">
            <Logo />
          </Link>

          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted text-pretty">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          {footer && <div className="mt-7 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
