import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, BookCover, Progress, Rating } from '@/design-system';
import type { Book } from '@/types/api';

export interface BookCardProps {
  book: Book;
  /** Progresso quando o livro esta na estante de quem ve. */
  progress?: number;
  currentPage?: number;
  reason?: string;
  className?: string;
  size?: 'sm' | 'md';
}

/** Card vertical de livro, usado em prateleiras horizontais e grades. */
export function BookCard({ book, progress, currentPage, reason, className, size = 'md' }: BookCardProps) {
  const author = book.authors[0]?.name;

  return (
    <Link
      to={`/livro/${book.slug}`}
      className={cn(
        'group block shrink-0',
        size === 'sm' ? 'w-[7.5rem]' : 'w-[9.5rem]',
        className,
      )}
    >
      <div className="relative transition-transform duration-300 ease-editorial group-hover:-translate-y-1">
        <BookCover title={book.title} author={author} src={book.coverUrl} />
        {book.readingCount > 0 && (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-pill bg-[rgb(20_18_16_/_0.72)] px-1.5 py-0.5 font-mono text-label font-medium text-white backdrop-blur-sm">
            <Users className="h-2.5 w-2.5" aria-hidden />
            {book.readingCount}
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-ink group-hover:text-burgundy">
          {book.title}
        </p>
        {author && <p className="truncate text-xs text-muted">{author}</p>}

        {progress !== undefined ? (
          <div className="space-y-1 pt-0.5">
            <Progress value={progress} />
            <p className="font-mono text-label text-subtle">
              {currentPage !== undefined && book.pageCount
                ? `pag. ${currentPage} de ${book.pageCount}`
                : `${progress}%`}
            </p>
          </div>
        ) : book.ratingsCount > 0 ? (
          <Rating value={book.ratingsAvg} showValue count={book.ratingsCount} />
        ) : null}

        {reason && (
          <Badge tone="gold" className="mt-1 max-w-full">
            <span className="truncate">{reason}</span>
          </Badge>
        )}
      </div>
    </Link>
  );
}

/** Linha horizontal de livro, para listas densas (biblioteca, resultados). */
export function BookRow({ book, trailing }: { book: Book; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-panel border border-line bg-surface p-3 transition-colors hover:border-subtle">
      <Link to={`/livro/${book.slug}`} className="shrink-0">
        <BookCover title={book.title} author={book.authors[0]?.name} src={book.coverUrl} className="w-14" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/livro/${book.slug}`} className="block truncate font-medium text-ink hover:text-burgundy">
          {book.title}
        </Link>
        <p className="truncate text-sm text-muted">{book.authors.map((a) => a.name).join(', ')}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {book.ratingsCount > 0 && <Rating value={book.ratingsAvg} showValue count={book.ratingsCount} />}
          {book.readingCount > 0 && (
            <span className="text-xs text-subtle">{book.readingCount} lendo agora</span>
          )}
        </div>
      </div>
      {trailing}
    </div>
  );
}

/** Prateleira horizontal com rolagem por toque — mesma peca no desktop e no mobile. */
export function BookShelf({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rb-scroll-x -mx-4 flex gap-4 px-4 pb-2 sm:mx-0 sm:px-0', className)}>{children}</div>
  );
}
