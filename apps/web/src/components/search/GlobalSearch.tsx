import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Loader2, MessageSquare, Search, Users, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, BookCover, Badge } from '@/design-system';
import { useDebounced, useGlobalSearch } from '@/features/discovery/use-discovery';

/**
 * Busca global (secao 27). Resultados agrupados por tipo, com debounce,
 * navegacao por teclado e estados de vazio/carregando explicitos.
 */
export function GlobalSearch({ variant = 'inline' }: { variant?: 'inline' | 'overlay' }) {
  const [open, setOpen] = useState(variant === 'overlay');
  const [term, setTerm] = useState('');
  const debounced = useDebounced(term);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching } = useGlobalSearch(debounced);
  const showPanel = open && term.trim().length >= 2;

  useEffect(() => {
    if (variant !== 'inline') return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [variant]);

  const go = (path: string) => {
    setTerm('');
    setOpen(false);
    inputRef.current?.blur();
    navigate(path);
  };

  const total =
    (data?.books.length ?? 0) + (data?.people.length ?? 0) + (data?.communities.length ?? 0) + (data?.discussions.length ?? 0);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="rb-search-results"
          aria-label="Busque livros, pessoas ou comunidades"
          placeholder="Busque livros, pessoas ou comunidades..."
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-10 w-full rounded-pill border border-line bg-raised/60 pl-10 pr-16 text-sm text-ink placeholder:text-subtle focus:border-burgundy focus:bg-surface focus:outline-none focus:ring-2 focus:ring-burgundy/20"
        />
        {term ? (
          <button
            type="button"
            onClick={() => setTerm('')}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-subtle hover:text-ink"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-label text-subtle lg:block">
            Ctrl K
          </kbd>
        )}
      </div>

      {showPanel && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            id="rb-search-results"
            role="listbox"
            className="absolute left-0 right-0 top-12 z-40 max-h-[70vh] animate-scale-in overflow-y-auto rounded-sheet border border-line bg-surface p-2 shadow-lifted"
          >
            {isFetching && total === 0 && (
              <p className="flex items-center gap-2 px-3 py-6 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Procurando nas estantes...
              </p>
            )}

            {!isFetching && total === 0 && (
              <div className="px-3 py-8 text-center">
                <p className="text-sm font-medium text-ink">Nada encontrado para "{term}".</p>
                <p className="mt-1 text-xs text-muted">Tente o titulo do livro, o nome do autor ou de uma comunidade.</p>
              </div>
            )}

            {data && data.books.length > 0 && (
              <Group title="Livros" icon={<BookOpen className="h-3.5 w-3.5" />}>
                {data.books.map((book) => (
                  <Row key={book.id} onClick={() => go(`/livro/${book.slug}`)}>
                    <BookCover title={book.title} src={book.coverUrl} className="h-11 w-8 shrink-0" flat />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{book.title}</span>
                      <span className="block truncate text-xs text-muted">
                        {book.authors.map((a) => a.name).join(', ') || 'Autoria desconhecida'}
                      </span>
                    </span>
                    {book.readingCount > 0 && (
                      <Badge tone="gold">{book.readingCount} lendo</Badge>
                    )}
                  </Row>
                ))}
              </Group>
            )}

            {data && data.people.length > 0 && (
              <Group title="Pessoas" icon={<Users className="h-3.5 w-3.5" />}>
                {data.people.map((person) => (
                  <Row key={person.id} onClick={() => go(`/u/${person.username}`)}>
                    <Avatar name={person.name} src={person.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{person.name}</span>
                      <span className="block truncate text-xs text-muted">@{person.username}</span>
                    </span>
                  </Row>
                ))}
              </Group>
            )}

            {data && data.communities.length > 0 && (
              <Group title="Comunidades" icon={<Users className="h-3.5 w-3.5" />}>
                {data.communities.map((community) => (
                  <Row key={community.id} onClick={() => go(`/c/${community.slug}`)}>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control font-display text-sm font-semibold text-on-brand ring-1 ring-inset ring-white/15"
                      style={{ background: community.accentColor ?? 'rgb(var(--rb-burgundy))' }}
                      aria-hidden
                    >
                      {community.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{community.name}</span>
                      <span className="block truncate text-xs text-muted">{community.membersCount} membros</span>
                    </span>
                  </Row>
                ))}
              </Group>
            )}

            {data && data.discussions.length > 0 && (
              <Group title="Discussoes" icon={<MessageSquare className="h-3.5 w-3.5" />}>
                {data.discussions.map((post) => (
                  <Row key={post.id} onClick={() => go(`/post/${post.id}`)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {post.title ?? post.content.slice(0, 60)}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {post.community?.name ?? 'Discussao aberta'} - {post.commentsCount} respostas
                      </span>
                    </span>
                  </Row>
                ))}
              </Group>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Group({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1 last:mb-0">
      <p className="flex items-center gap-1.5 px-3 py-2 text-label font-semibold uppercase tracking-wider text-subtle">
        {icon}
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onClick={onClick}
      className={cn('flex w-full items-center gap-3 rounded-panel px-3 py-2 text-left transition-colors hover:bg-raised')}
    >
      {children}
    </button>
  );
}
