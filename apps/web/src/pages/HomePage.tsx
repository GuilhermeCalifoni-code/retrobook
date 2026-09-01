import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, MessageCircle, Users } from 'lucide-react';
import { Avatar, AvatarStack, Badge, Button, Card, EmptyState, ErrorState, SectionHeader, SkeletonBookCard, SkeletonCard } from '@/design-system';
import { PageShell } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { useSession } from '@/features/auth/session-context';
import { useHome } from '@/features/discovery/use-discovery';
import { useJoinCommunity } from '@/features/communities/use-communities';
import { BookCard, BookShelf } from '@/features/books/BookCard';
import { CommunityCard } from '@/features/communities/CommunityCard';
import { PersonCard } from '@/features/people/PersonCard';
import { PostCard } from '@/features/posts/PostCard';
import { ContinueReadingCard } from '@/features/library/ContinueReadingCard';
import { SignalDeck } from '@/features/discovery/SignalCard';
import { greeting, pluralize } from '@/lib/format';

export function HomePage() {
  const { user } = useSession();
  const { data, isLoading, isError, refetch } = useHome();
  const join = useJoinCommunity();
  const { openComposer } = useOutletContext<{ openComposer: () => void }>();

  if (isError) {
    return (
      <PageShell>
        <ErrorState
          title="Nao conseguimos montar sua home."
          description="Pode ter sido uma instabilidade momentanea."
          onRetry={() => void refetch()}
        />
      </PageShell>
    );
  }

  const isNewcomer =
    !isLoading &&
    data &&
    data.currentlyReading.length === 0 &&
    data.communityDiscussions.length === 0 &&
    data.friendsActivity.length === 0;

  return (
    <PageShell
      aside={
        <>
          {data && data.recommendedCommunities.length > 0 && (
            <Card>
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Comunidades para voce</h2>
              <div className="space-y-3">
                {data.recommendedCommunities.slice(0, 3).map((community) => (
                  <Link
                    key={community.id}
                    to={`/c/${community.slug}`}
                    className="flex items-start gap-2.5 rounded-control p-1.5 transition-colors hover:bg-raised"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control font-display text-sm font-semibold text-on-brand ring-1 ring-inset ring-white/15"
                      style={{ background: community.accentColor ?? 'rgb(var(--rb-burgundy))' }}
                      aria-hidden
                    >
                      {community.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{community.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {community.reasons?.[0] ?? `${community.membersCount} membros`}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
              <Link to="/comunidades" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-burgundy hover:underline">
                Ver todas <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Card>
          )}

          {data && data.friendsActivity.length > 0 && (
            <Card>
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Atividade de quem voce segue</h2>
              <ul className="space-y-3.5">
                {data.friendsActivity.map((activity, index) => (
                  <li key={`${activity.user.id}-${activity.book.id}-${index}`} className="flex items-start gap-2.5">
                    <Link to={`/u/${activity.user.username}`}>
                      <Avatar name={activity.user.name} src={activity.user.avatarUrl} size="sm" />
                    </Link>
                    <p className="text-sm leading-snug text-muted">
                      <Link to={`/u/${activity.user.username}`} className="font-medium text-ink hover:text-burgundy">
                        {activity.user.name}
                      </Link>{' '}
                      {activity.status === 'READ' ? 'terminou' : 'esta lendo'}{' '}
                      <Link to={`/livro/${activity.book.slug}`} className="font-medium text-ink hover:text-burgundy">
                        {activity.book.title}
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      }
    >
      <Seo title="Inicio" description="Seu universo literario no RetroBook." noIndex />

      <header className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          {greeting(user?.profile.name ?? 'leitor')}
        </h1>
        <p className="mt-1.5 text-muted">Veja o que esta acontecendo no seu universo literario.</p>
      </header>

      {data && data.signals.length > 0 && (
        <div className="mb-10">
          <SignalDeck signals={data.signals} />
        </div>
      )}

      {isLoading && (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBookCard key={i} />
            ))}
          </div>
        </div>
      )}

      {isNewcomer && (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="Sua estante esta esperando."
          description="Adicione o livro que voce esta lendo agora. E a partir dele que encontramos pessoas, comunidades e conversas para voce."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/livros">
                <Button>Encontrar livros</Button>
              </Link>
              <Link to="/comunidades">
                <Button variant="outline">Explorar comunidades</Button>
              </Link>
            </div>
          }
          className="mb-10"
        />
      )}

      {data && (
        <div className="space-y-10">
          {/* ------------------------------------------------ continuar lendo */}
          {data.currentlyReading.length > 0 && (
            <section>
              <SectionHeader
                title="Continuar lendo"
                action={
                  <Link to="/biblioteca" className="text-sm font-medium text-burgundy hover:underline">
                    Minha biblioteca
                  </Link>
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {data.currentlyReading.map((entry) => (
                  <ContinueReadingCard key={entry.book.id} entry={entry} />
                ))}
              </div>
            </section>
          )}

          {/* ---------------------------------------- pessoas lendo o mesmo -- */}
          {data.readingCompanions.length > 0 && (
            <section>
              <SectionHeader
                title="Pessoas lendo o mesmo que voce"
                subtitle="O livro na sua mao agora tambem esta na mao de outras pessoas."
              />
              <div className="space-y-3">
                {data.readingCompanions.map((companion) => (
                  <Card key={companion.book.id} className="flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-medium text-ink text-pretty">
                        Voce e mais {companion.othersCount}{' '}
                        {companion.othersCount === 1 ? 'pessoa esta lendo' : 'pessoas estao lendo'}{' '}
                        <Link to={`/livro/${companion.book.slug}`} className="text-burgundy hover:underline">
                          {companion.book.title}
                        </Link>
                        .
                      </p>
                      {companion.readers.length > 0 && (
                        <div className="mt-2.5 flex items-center gap-3">
                          <AvatarStack people={companion.readers} />
                          <span className="text-sm text-muted">
                            {companion.readers
                              .slice(0, 2)
                              .map((r) => r.name.split(' ')[0])
                              .join(', ')}
                            {companion.othersCount > 2 && ` e mais ${companion.othersCount - 2}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <Link to={`/livro/${companion.book.slug}#leitores`}>
                      <Button variant="outline" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                        Ver pessoas
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* -------------------------------------------- pessoas compativeis */}
          {data.suggestedPeople.length > 0 && (
            <section>
              <SectionHeader
                title="Leitores compativeis com voce"
                subtitle="Ordenados por livros, autores e generos em comum."
                action={
                  <Link to="/pessoas" className="text-sm font-medium text-burgundy hover:underline">
                    Ver mais
                  </Link>
                }
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.suggestedPeople.slice(0, 3).map((person) => (
                  <PersonCard key={person.id} person={person} />
                ))}
              </div>
            </section>
          )}

          {/* ------------------------------------ discussoes das comunidades -- */}
          <section>
            <SectionHeader
              title="Discussoes das suas comunidades"
              action={
                <Link to="/feed" className="text-sm font-medium text-burgundy hover:underline">
                  Ver feed
                </Link>
              }
            />
            {data.communityDiscussions.length > 0 ? (
              <div className="space-y-4">
                {data.communityDiscussions.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                icon={<MessageCircle className="h-5 w-5" />}
                title="Nenhuma conversa por aqui ainda."
                description="Entre em uma comunidade ou comece a primeira discussao."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" onClick={openComposer}>
                      Comecar uma discussao
                    </Button>
                    <Link to="/comunidades">
                      <Button size="sm" variant="outline">
                        Ver comunidades
                      </Button>
                    </Link>
                  </div>
                }
              />
            )}
          </section>

          {/* ------------------------------------------ comunidades sugeridas */}
          {data.recommendedCommunities.length > 0 && (
            <section>
              <SectionHeader
                title="Comunidades recomendadas"
                subtitle="Baseadas nos seus generos e nos livros da sua estante."
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.recommendedCommunities.map((community) => (
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
          )}

          {/* ----------------------------------------------- livros sugeridos */}
          {data.recommendedBooks.length > 0 && (
            <section>
              <SectionHeader
                title="Livros recomendados"
                subtitle="Escolhidos a partir de quem le o que voce le."
                action={
                  <Link to="/livros" className="text-sm font-medium text-burgundy hover:underline">
                    Ver catalogo
                  </Link>
                }
              />
              <BookShelf>
                {data.recommendedBooks.map((book) => (
                  <BookCard key={book.id} book={book} reason={book.reason} />
                ))}
              </BookShelf>
            </section>
          )}

          {/* ------------------------------------------------ serendipidade */}
          {data.serendipity.length > 0 && (
            <section>
              <SectionHeader
                title="Fora do seu radar"
                subtitle="Leitores com gosto parecido com o seu gostaram destes — em territorio que voce nao procuraria."
              />
              <BookShelf>
                {data.serendipity.map((book) => (
                  <BookCard key={book.id} book={book} reason={book.reason} />
                ))}
              </BookShelf>
            </section>
          )}

          {/* ------------------------------------------ atalhos (so no mobile) */}
          <section className="grid gap-3 sm:grid-cols-3 xl:hidden">
            <QuickLink to="/explorar" icon={<Compass className="h-4 w-4" />} label="Explorar" />
            <QuickLink to="/pessoas" icon={<Users className="h-4 w-4" />} label="Pessoas" />
            <QuickLink
              to="/minha-leitura"
              icon={<BookOpen className="h-4 w-4" />}
              label={pluralize(user?.counters.booksCount ?? 0, 'livro na estante', 'livros na estante')}
            />
          </section>
        </div>
      )}
    </PageShell>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-panel border border-line bg-surface p-3.5 text-sm font-medium text-ink transition-colors hover:border-subtle"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-control bg-burgundy/10 text-burgundy">{icon}</span>
      <span className="truncate">{label}</span>
      <Badge tone="outline" className="ml-auto">
        Ver
      </Badge>
    </Link>
  );
}
