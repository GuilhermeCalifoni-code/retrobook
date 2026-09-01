import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, EmptyState, ErrorState, SectionHeader, Skeleton, Stat } from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { BookCard, BookShelf } from '@/features/books/BookCard';
import { CommunityAvatar } from '@/features/communities/CommunityCard';
import { useUniverse } from '@/features/discovery/use-discovery';
import { formatNumber } from '@/lib/format';
import type { UniverseSlice } from '@/types/api';

/**
 * Seu Universo (secoes 5 e 25).
 *
 * A pagina existe para mostrar que o RetroBook entende o gosto de quem usa —
 * e, principalmente, o que ele faz com isso. Por isso a barra de generos vem
 * acompanhada das arestas: quantas pessoas, quantas comunidades, que livros.
 */

/** Tons de vinho a dourado, do gosto dominante ao periferico. */
const SLICE_COLORS = [
  'rgb(var(--rb-burgundy))',
  'rgb(var(--rb-burgundy-soft))',
  'rgb(var(--rb-gold))',
  'rgb(var(--rb-gold-soft))',
  'rgb(var(--rb-success))',
  'rgb(var(--rb-subtle))',
  'rgb(var(--rb-line))',
];

function TasteBar({ slices }: { slices: UniverseSlice[] }) {
  return (
    <div className="space-y-4">
      {/* Barra unica: a proporcao entre gostos vista de relance. */}
      <div className="flex h-3 w-full overflow-hidden rounded-pill" role="img" aria-label="Distribuicao dos seus generos">
        {slices.map((slice, index) => (
          <span
            key={slice.id}
            className="h-full transition-all duration-500 ease-editorial first:rounded-l-pill last:rounded-r-pill"
            style={{ width: `${slice.percent}%`, background: SLICE_COLORS[index % SLICE_COLORS.length] }}
            title={`${slice.name}: ${slice.percent}%`}
          />
        ))}
      </div>

      <ul className="space-y-2.5">
        {slices.map((slice, index) => (
          <li key={slice.id}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              {slice.id === 'outros' ? (
                <span className="text-muted">{slice.name}</span>
              ) : (
                <Link to={`/explorar?genero=${slice.slug}`} className="text-ink hover:text-burgundy">
                  {slice.name}
                </Link>
              )}
              <span className="font-mono text-xs tabular-nums text-subtle">
                {slice.percent}% <span className="text-line">·</span> {slice.count}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-pill bg-line/50">
              <div
                className="h-full rounded-pill transition-[width] duration-700 ease-editorial"
                style={{ width: `${slice.percent}%`, background: SLICE_COLORS[index % SLICE_COLORS.length] }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function UniversePage() {
  const { data, isLoading, isError, refetch } = useUniverse();

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-9 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64 rounded-card" />
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell>
        <ErrorState title="Nao conseguimos montar seu universo." onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  if (data.isEmpty) {
    return (
      <PageShell>
        <Seo title="Seu Universo" noIndex />
        <PageHeader eyebrow="Seu mapa" title="Seu Universo" />
        <EmptyState
          icon={<Compass className="h-5 w-5" />}
          title="Seu universo ainda esta em branco."
          description="Adicione alguns livros e escolha seus generos favoritos. A partir dai conseguimos desenhar o seu mapa — e mostrar quem esta perto dele."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/livros">
                <Button>Adicionar livros</Button>
              </Link>
              <Link to="/explorar">
                <Button variant="outline">Explorar generos</Button>
              </Link>
            </div>
          }
        />
      </PageShell>
    );
  }

  const { summary, connections } = data;

  return (
    <PageShell width="wide">
      <Seo title="Seu Universo" description="O mapa do seu gosto literario no RetroBook." noIndex />

      <PageHeader
        eyebrow="Seu mapa"
        title="Seu Universo"
        description="O retrato do que voce le — e das conexoes que saem dali."
      />

      {/* --------------------------------------------------------- resumo -- */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat boxed label="Livros lidos" value={formatNumber(summary.booksRead)} />
        <Stat boxed label="Lendo agora" value={formatNumber(summary.booksReading)} />
        <Stat boxed label="Autores" value={formatNumber(summary.authors)} />
        <Stat boxed label="Generos" value={formatNumber(summary.genres)} />
        <Stat boxed label="Comunidades" value={formatNumber(summary.communities)} />
        <Stat boxed label="Nota media" value={summary.averageRating ? summary.averageRating.toFixed(1) : '—'} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* ---------------------------------------------------- mapa de gosto */}
        <Card>
          <SectionHeader title="Seus generos" subtitle="A proporcao do que voce le, em ordem." />
          {data.genres.length > 0 ? (
            <TasteBar slices={data.genres} />
          ) : (
            <p className="text-sm text-muted">Adicione livros para desenhar essa distribuicao.</p>
          )}

          {data.authors.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 font-display text-base font-semibold text-ink">Autores mais presentes</h3>
              <div className="flex flex-wrap gap-2">
                {data.authors
                  .filter((a) => a.id !== 'outros')
                  .map((author) => (
                    <Badge key={author.id} tone="outline" size="md">
                      {author.name}
                      <span className="ml-1 font-mono text-label text-subtle">{author.count}</span>
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </Card>

        {/* ------------------------------------------------------- o ciclo -- */}
        <div className="space-y-6">
          <Card className="border-burgundy/25 bg-burgundy/[0.04]">
            <h2 className="font-display text-lg font-semibold text-ink">Para onde seu gosto leva</h2>
            <p className="mt-1 text-sm text-muted text-pretty">
              No RetroBook o livro nao termina na ultima pagina — ele aponta para gente.
            </p>

            <ol className="mt-5 space-y-3">
              <CycleStep
                icon={<BookOpen className="h-4 w-4" />}
                label="Voce le"
                value={`${summary.booksRead + summary.booksReading} livros na sua estante`}
              />
              <CycleStep
                icon={<Users className="h-4 w-4" />}
                label="Outras pessoas leem parecido"
                value={`${formatNumber(connections.kindredReaders)} leitores compartilham seus generos`}
                href="/pessoas"
              />
              <CycleStep
                icon={<Compass className="h-4 w-4" />}
                label="Ha onde conversar"
                value={`${connections.communitiesInYourGenres} comunidades nos seus temas`}
                href="/comunidades"
              />
              <CycleStep
                icon={<Sparkles className="h-4 w-4" />}
                label="E o proximo livro aparece"
                value={`${connections.nextBooks.length} sugestoes esperando`}
                href="/livros"
                last
              />
            </ol>
          </Card>

          {data.communities.length > 0 && (
            <Card>
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Onde voce conversa</h2>
              <div className="space-y-2.5">
                {data.communities.slice(0, 5).map((community) => (
                  <Link
                    key={community.id}
                    to={`/c/${community.slug}`}
                    className="flex items-center gap-2.5 rounded-control p-1.5 transition-colors hover:bg-raised"
                  >
                    <CommunityAvatar community={{ ...community, avatarUrl: null }} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{community.name}</span>
                      <span className="block text-xs text-muted">{community.membersCount} membros</span>
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {connections.nextBooks.length > 0 && (
        <section className="mt-10">
          <SectionHeader
            title="O que vem depois"
            subtitle="Escolhidos a partir dos generos que dominam o seu mapa."
            action={
              <Link to="/livros" className="text-sm font-medium text-burgundy hover:underline">
                Ver catalogo
              </Link>
            }
          />
          <BookShelf>
            {connections.nextBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </BookShelf>
        </section>
      )}
    </PageShell>
  );
}

function CycleStep({
  icon,
  label,
  value,
  href,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  last?: boolean;
}) {
  const body = (
    <>
      <span className="relative flex flex-col items-center">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-burgundy shadow-paper">
          {icon}
        </span>
        {!last && <span className="mt-1 h-4 w-px bg-line" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1 pb-1">
        <span className="block text-xs uppercase tracking-wider text-subtle">{label}</span>
        <span className="block text-sm font-medium text-ink">{value}</span>
      </span>
      {href && <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />}
    </>
  );

  return (
    <li>
      {href ? (
        <Link to={href} className={cn('group flex items-start gap-3 rounded-control transition-colors hover:bg-surface/60')}>
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-3">{body}</div>
      )}
    </li>
  );
}
