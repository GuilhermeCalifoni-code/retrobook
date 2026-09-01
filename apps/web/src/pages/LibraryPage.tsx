import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookMarked, BarChart3, Heart, LayoutGrid, Library, List, Search } from 'lucide-react';
import { Badge, Button, EmptyState, ErrorState, Menu, Rating, SegmentedControl, SkeletonCard, Tabs } from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { BookRow } from '@/features/books/BookCard';
import { Bookshelf } from '@/features/library/Bookshelf';
import { useLibrary, useUpdateLibraryEntry } from '@/features/books/use-books';
import type { ReadingStatus } from '@/types/api';

const STATUS_LABEL: Record<ReadingStatus, string> = {
  WANT_TO_READ: 'Quero ler',
  READING: 'Lendo',
  PAUSED: 'Pausado',
  ABANDONED: 'Abandonei',
  READ: 'Lido',
};

type Filter = ReadingStatus | 'ALL' | 'FAVORITES';

type ViewMode = 'shelf' | 'list';

export function LibraryPage() {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [view, setView] = useState<ViewMode>('shelf');
  const { data, isLoading, isError, refetch } = useLibrary();
  const update = useUpdateLibraryEntry();

  const items = (data?.items ?? []).filter((entry) => {
    if (filter === 'ALL') return true;
    if (filter === 'FAVORITES') return entry.isFavorite;
    return entry.status === filter;
  });

  const counts = data?.counts;
  const total = data?.items.length ?? 0;

  const tabs = [
    { value: 'ALL' as const, label: 'Tudo', count: total },
    { value: 'READING' as const, label: 'Lendo', count: counts?.READING },
    { value: 'WANT_TO_READ' as const, label: 'Quero ler', count: counts?.WANT_TO_READ },
    { value: 'READ' as const, label: 'Lidos', count: counts?.READ },
    { value: 'FAVORITES' as const, label: 'Favoritos' },
    { value: 'PAUSED' as const, label: 'Pausados', count: counts?.PAUSED },
    { value: 'ABANDONED' as const, label: 'Abandonados', count: counts?.ABANDONED },
  ];

  return (
    <PageShell>
      <Seo title="Minha biblioteca" description="Seus livros, seu progresso e suas notas." noIndex />

      <PageHeader
        eyebrow="Sua estante"
        title="Minha biblioteca"
        description="Tudo que voce esta lendo, ja leu e quer ler — e o ponto de partida de todas as recomendacoes."
        action={
          <div className="flex gap-2">
            <Link to="/minha-leitura">
              <Button variant="outline" size="sm" leftIcon={<BarChart3 className="h-4 w-4" />}>
                Minha leitura
              </Button>
            </Link>
            <Link to="/livros">
              <Button size="sm" leftIcon={<Search className="h-4 w-4" />}>
                Adicionar livro
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tabs items={tabs} value={filter} onChange={setFilter} variant="pill" className="flex-wrap" />

        <SegmentedControl
          className="ml-auto"
          label="Modo de visualizacao"
          compact
          value={view}
          onChange={setView}
          options={[
            { value: 'shelf', label: 'Estante', icon: <Library className="h-4 w-4" /> },
            { value: 'list', label: 'Lista', icon: <List className="h-4 w-4" /> },
          ]}
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isError && <ErrorState title="Nao conseguimos carregar sua biblioteca." onRetry={() => void refetch()} />}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState
          icon={<BookMarked className="h-5 w-5" />}
          title={
            total === 0 ? 'Voce ainda nao adicionou nenhum livro.' : 'Nenhum livro com este filtro.'
          }
          description={
            total === 0
              ? 'Comece pelo livro que esta na sua mesa de cabeceira. E dele que saem suas primeiras conexoes.'
              : 'Experimente outra aba da sua estante.'
          }
          action={
            total === 0 ? (
              <Link to="/livros">
                <Button>Encontrar livros</Button>
              </Link>
            ) : undefined
          }
        />
      )}

      {view === 'shelf' && items.length > 0 && <Bookshelf entries={items} />}

      <div className={view === 'list' ? 'space-y-3' : 'hidden'}>
        {items.map((entry) => (
          <BookRow
            key={entry.book.id}
            book={entry.book}
            trailing={
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Menu
                  items={[
                    ...(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((status) => ({
                      label: STATUS_LABEL[status],
                      onSelect: () => update.mutate({ bookId: entry.book.id, status }),
                    })),
                    {
                      label: entry.isFavorite ? 'Remover dos favoritos' : 'Marcar como favorito',
                      icon: <Heart className="h-4 w-4" />,
                      onSelect: () => update.mutate({ bookId: entry.book.id, isFavorite: !entry.isFavorite }),
                    },
                  ]}
                  trigger={({ toggle }) => (
                    <button
                      type="button"
                      onClick={toggle}
                      className="rounded-pill border border-line px-3 py-1 text-xs font-medium text-muted transition-colors hover:border-subtle hover:text-ink"
                    >
                      {STATUS_LABEL[entry.status]}
                    </button>
                  )}
                />

                {entry.status === 'READING' && (
                  <span className="font-mono text-xs text-subtle">{entry.progress}%</span>
                )}
                {entry.rating && <Rating value={entry.rating} />}
                {entry.isFavorite && <Badge tone="burgundy">Favorito</Badge>}
              </div>
            }
          />
        ))}
      </div>
    </PageShell>
  );
}
