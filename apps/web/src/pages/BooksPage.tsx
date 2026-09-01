import { useState } from 'react';
import { BookOpen, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { EmptyState, ErrorState, FilterChip, Input, SkeletonBookCard } from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { BookCard } from '@/features/books/BookCard';
import { useBooks, useBookSearch, useGenres } from '@/features/books/use-books';
import { useDebounced } from '@/features/discovery/use-discovery';

export function BooksPage() {
  const [term, setTerm] = useState('');
  const [genre, setGenre] = useState<string | undefined>();
  const [sort, setSort] = useState<'popular' | 'rating' | 'recent'>('popular');

  const debounced = useDebounced(term);
  const searching = debounced.trim().length >= 2;

  const { data: genres } = useGenres();
  const catalog = useBooks({ genre, sort });
  const search = useBookSearch(debounced, searching);

  const books = searching ? (search.data?.items ?? []) : (catalog.data?.items ?? []);
  const isLoading = searching ? search.isFetching : catalog.isLoading;

  return (
    <PageShell width="wide">
      <Seo
        title="Livros"
        description="Explore o acervo do RetroBook e descubra quem esta lendo cada titulo."
      />

      <PageHeader
        eyebrow="Acervo"
        title="Livros"
        description="Todo livro aqui e um ponto de encontro: veja quem esta lendo e as conversas em volta."
      />

      <div className="mb-6 space-y-4">
        <div className="max-w-lg">
          <Input
            leftIcon={<Search className="h-4 w-4" />}
            placeholder="Buscar por titulo ou autor..."
            aria-label="Buscar livros"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            rightSlot={search.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-subtle" /> : undefined}
          />
        </div>

        {!searching && (
          <>
            <div className="rb-scroll-x -mx-4 flex gap-2 px-4 pb-1 sm:mx-0 sm:px-0">
              <FilterChip active={!genre} onClick={() => setGenre(undefined)}>
                Todos os generos
              </FilterChip>
              {genres?.items.map((item) => (
                <FilterChip key={item.slug} active={genre === item.slug} onClick={() => setGenre(item.slug)}>
                  {item.name}
                </FilterChip>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: 'popular', label: 'Mais lidos' },
                  { value: 'rating', label: 'Melhor avaliados' },
                  { value: 'recent', label: 'Adicionados recentemente' },
                ] as const
              ).map((option) => (
                <FilterChip
                  key={option.value}
                  tone="soft"
                  active={sort === option.value}
                  onClick={() => setSort(option.value)}
                >
                  {option.label}
                </FilterChip>
              ))}
            </div>
          </>
        )}
      </div>

      {isLoading && books.length === 0 && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonBookCard key={i} />
          ))}
        </div>
      )}

      {catalog.isError && !searching && <ErrorState onRetry={() => void catalog.refetch()} />}

      {!isLoading && books.length === 0 && (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title={searching ? `Nada encontrado para "${term}".` : 'Nenhum livro neste filtro.'}
          description={
            searching
              ? 'Tente o titulo original, o nome do autor ou outra grafia.'
              : 'Experimente outro genero ou limpe os filtros.'
          }
        />
      )}

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {books.map((book) => (
          <BookCard key={book.id} book={book} className="w-full" />
        ))}
      </div>
    </PageShell>
  );
}
