import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, Flame, MessageCircle, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, EmptyState, ErrorState, FilterChip, SkeletonBookCard, SkeletonCard, Tabs } from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { BookCard } from '@/features/books/BookCard';
import { CommunityCard } from '@/features/communities/CommunityCard';
import { PersonCard } from '@/features/people/PersonCard';
import { PostCard } from '@/features/posts/PostCard';
import { useBooks as useBooksList, useGenres } from '@/features/books/use-books';
import { useExploreDiscussions, useTrending } from '@/features/discovery/use-discovery';
import { useCommunities, useJoinCommunity } from '@/features/communities/use-communities';
import { useSuggestedPeople } from '@/features/people/use-people';
import { useLayoutMode } from '@/features/device-preview';

type Tab = 'trending' | 'books' | 'communities' | 'people' | 'discussions';

const TABS = [
  { value: 'trending' as const, label: 'Em alta', icon: <Flame className="h-3.5 w-3.5" /> },
  { value: 'books' as const, label: 'Livros', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { value: 'communities' as const, label: 'Comunidades', icon: <Users className="h-3.5 w-3.5" /> },
  { value: 'people' as const, label: 'Pessoas', icon: <Users className="h-3.5 w-3.5" /> },
  { value: 'discussions' as const, label: 'Discussoes', icon: <MessageCircle className="h-3.5 w-3.5" /> },
];

export function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('trending');
  const genreFilter = params.get('genero') ?? undefined;
  const layout = useLayoutMode();

  const { data: genres } = useGenres();
  const trending = useTrending();
  const communities = useCommunities({ genre: genreFilter, sort: 'active' });
  const people = useSuggestedPeople({ limit: 12 });
  const discussions = useExploreDiscussions(genreFilter);
  const join = useJoinCommunity();

  const setGenre = (slug?: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set('genero', slug);
    else next.delete('genero');
    setParams(next, { replace: true });
  };

  return (
    <PageShell width="wide">
      <Seo
        title="Explorar"
        description="Descubra livros, comunidades, pessoas e discussoes no RetroBook."
      />

      <PageHeader
        eyebrow="Descoberta"
        title="Explorar"
        description="Encontre sua proxima historia — e as pessoas que ja estao falando dela."
      />

      {layout === 'mobile' && (
        <div className="mb-5">
          <GlobalSearch />
        </div>
      )}

      <Tabs items={TABS} value={tab} onChange={setTab} className="mb-5" />

      {/* Filtro por genero, comum a varias abas */}
      {tab !== 'people' && genres && (
        <div className="rb-scroll-x -mx-4 mb-6 flex gap-2 px-4 pb-1 sm:mx-0 sm:px-0">
          <FilterChip active={!genreFilter} onClick={() => setGenre(undefined)}>
            Todos
          </FilterChip>
          {genres.items.map((genre) => (
            <FilterChip
              key={genre.slug}
              active={genreFilter === genre.slug}
              onClick={() => setGenre(genre.slug)}
            >
              {genre.name}
            </FilterChip>
          ))}
        </div>
      )}

      {tab === 'trending' && (
        <div className="space-y-10">
          {trending.isLoading && (
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBookCard key={i} />
              ))}
            </div>
          )}
          {trending.isError && <ErrorState onRetry={() => void trending.refetch()} />}

          {trending.data && (
            <>
              <section>
                <h2 className="mb-4 font-display text-xl font-semibold text-ink">Livros sendo lidos agora</h2>
                <div className="rb-scroll-x -mx-4 flex gap-4 px-4 pb-2 sm:mx-0 sm:px-0">
                  {trending.data.books.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-4 font-display text-xl font-semibold text-ink">Comunidades mais ativas</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {trending.data.communities.slice(0, 4).map((community) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      compact
                      joining={join.isPending && join.variables === community.slug}
                      onJoin={(slug) => join.mutate(slug)}
                    />
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-4 font-display text-xl font-semibold text-ink">Conversas da semana</h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  {trending.data.discussions.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
                {trending.data.discussions.length === 0 && (
                  <EmptyState
                    compact
                    icon={<MessageCircle className="h-5 w-5" />}
                    title="Semana silenciosa."
                    description="Ainda nao houve discussoes nos ultimos sete dias."
                  />
                )}
              </section>
            </>
          )}
        </div>
      )}

      {tab === 'books' && <ExploreBooks genre={genreFilter} />}

      {tab === 'communities' && (
        <>
          {communities.isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {communities.data?.pages
              .flatMap((page) => page.items)
              .map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  joining={join.isPending && join.variables === community.slug}
                  onJoin={(slug) => join.mutate(slug)}
                />
              ))}
          </div>
        </>
      )}

      {tab === 'people' && (
        <>
          {people.isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
          {people.data?.items.length === 0 && (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="Ainda nao temos sugestoes."
              description="Adicione mais livros a sua estante para encontrarmos leitores parecidos com voce."
              action={
                <Link to="/livros">
                  <Badge tone="burgundy" size="md">
                    Ver catalogo de livros
                  </Badge>
                </Link>
              }
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {people.data?.items.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </>
      )}

      {tab === 'discussions' && (
        <>
          {discussions.isLoading && (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {discussions.data?.items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          {discussions.data?.items.length === 0 && (
            <EmptyState
              icon={<MessageCircle className="h-5 w-5" />}
              title="Nenhuma discussao neste filtro."
              description="Tente outro genero ou volte para Em alta."
            />
          )}
        </>
      )}
    </PageShell>
  );
}

function ExploreBooks({ genre }: { genre?: string }) {
  const [sort, setSort] = useState<'popular' | 'rating' | 'recent'>('popular');
  const { data, isLoading, isError, refetch } = useBooksList({ genre, sort });

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            { value: 'popular', label: 'Mais lidos' },
            { value: 'rating', label: 'Melhor avaliados' },
            { value: 'recent', label: 'Recentes' },
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

      {isLoading && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonBookCard key={i} />
          ))}
        </div>
      )}
      {isError && <ErrorState onRetry={() => void refetch()} />}

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {data?.items.map((book) => (
          <BookCard key={book.id} book={book} className="w-full" />
        ))}
      </div>

      {data?.items.length === 0 && (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="Nenhum livro neste genero ainda."
          description="Use a busca para trazer um livro novo para o acervo."
        />
      )}
    </>
  );
}

