import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { BookCover, Progress } from '@/design-system';
import type { LibraryEntry } from '@/types/api';

/**
 * Estante digital (secao 26).
 *
 * Os livros ficam apoiados sobre uma prateleira com profundidade — madeira,
 * sombra e um leve desalinho, como numa estante de verdade. E a visualizacao
 * que faz a biblioteca do RetroBook parecer um objeto, nao uma tabela.
 */

/** Desalinho deterministico: o mesmo livro senta sempre do mesmo jeito. */
function tilt(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return ((hash % 5) - 2) * 0.35;
}

function Shelf({ entries }: { entries: LibraryEntry[] }) {
  return (
    <div className="relative">
      <div className="flex items-end gap-3 overflow-x-auto px-1 pb-1 sm:gap-4">
        {entries.map((entry) => (
          <Link
            key={entry.book.id}
            to={`/livro/${entry.book.slug}`}
            className="group relative w-[5.5rem] shrink-0 origin-bottom transition-transform duration-300 ease-editorial hover:-translate-y-2 hover:rotate-0 sm:w-24"
            style={{ transform: `rotate(${tilt(entry.book.id)}deg)` }}
            title={entry.book.title}
          >
            <BookCover
              title={entry.book.title}
              author={entry.book.authors[0]?.name}
              src={entry.book.coverUrl}
              className="shadow-spine"
            />
            {entry.status === 'READING' && entry.progress > 0 && (
              <span className="absolute inset-x-1 bottom-1">
                <Progress value={entry.progress} tone="gold" />
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* A prateleira: tabua + sombra projetada. */}
      <div
        aria-hidden
        className="h-2.5 rounded-control"
        style={{ background: 'linear-gradient(180deg, rgb(var(--rb-line)), rgb(var(--rb-subtle) / 0.55))' }}
      />
      <div
        aria-hidden
        className="mx-2 h-3 rounded-b-xl opacity-40"
        style={{ background: 'linear-gradient(180deg, rgb(var(--rb-subtle) / 0.35), transparent)' }}
      />
    </div>
  );
}

export function Bookshelf({ entries, className }: { entries: LibraryEntry[]; className?: string }) {
  if (entries.length === 0) return null;

  // Quebra em prateleiras de 8 para caber sem rolagem infinita no desktop.
  const shelves: LibraryEntry[][] = [];
  for (let i = 0; i < entries.length; i += 8) shelves.push(entries.slice(i, i + 8));

  return (
    <div className={cn('space-y-7 rounded-card border border-line bg-raised/40 p-4 sm:p-6', className)}>
      {shelves.map((shelf, index) => (
        <Shelf key={index} entries={shelf} />
      ))}
    </div>
  );
}
