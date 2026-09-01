import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Calendar, Link2, Lock, MapPin, MessageSquare, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CompatibilityBadge,
  EmptyState,
  ErrorState,
  Rating,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  Spoiler,
  Tabs,
  useToast,
} from '@/design-system';
import { PageShell } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { BookCard, BookShelf } from '@/features/books/BookCard';
import { CommunityAvatar } from '@/features/communities/CommunityCard';
import { PersonRow } from '@/features/people/PersonCard';
import { PostCard } from '@/features/posts/PostCard';
import { useSession } from '@/features/auth/session-context';
import { useConnections, useProfile, useProfilePosts, useToggleFollow } from '@/features/people/use-people';
import { useOpenConversation } from '@/features/discovery/use-discovery';
import { formatDate, formatNumber } from '@/lib/format';
import { useNavigate } from 'react-router-dom';

type Tab = 'overview' | 'books' | 'communities' | 'reviews' | 'activity' | 'network';

export function ProfilePage() {
  const params = useParams();
  const { user } = useSession();
  const username = params.username ?? user?.profile.username ?? '';

  const { data: profile, isLoading, isError, refetch } = useProfile(username);
  const { data: posts } = useProfilePosts(username);
  const toggleFollow = useToggleFollow();
  const openConversation = useOpenConversation();
  const navigate = useNavigate();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>('overview');

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-40 w-full rounded-card" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
      </PageShell>
    );
  }

  if (isError || !profile) {
    return (
      <PageShell>
        <ErrorState title="Nao encontramos esse leitor." onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  const startConversation = () => {
    openConversation.mutate(profile.username, {
      onSuccess: (conversation) => navigate(`/mensagens/${conversation.id}`),
      onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao foi possivel abrir a conversa.'),
    });
  };

  const tabs = [
    { value: 'overview' as const, label: 'Visao geral' },
    { value: 'books' as const, label: 'Livros' },
    { value: 'communities' as const, label: 'Comunidades' },
    { value: 'reviews' as const, label: 'Resenhas', count: profile.reviews.length },
    { value: 'activity' as const, label: 'Atividade' },
    { value: 'network' as const, label: 'Rede' },
  ];

  return (
    <PageShell width="wide">
      <Seo
        title={`${profile.name} (@${profile.username})`}
        description={profile.bio ?? `Veja o que ${profile.name} anda lendo no RetroBook.`}
        type="profile"
        noIndex={profile.visibility.restricted}
      />

      {/* ---------------------------------------------------------- cabecalho */}
      <header className="overflow-hidden rounded-card border border-line bg-surface">
        <div
          className="h-28 sm:h-36"
          aria-hidden
          style={{
            background: profile.coverUrl
              ? `url(${profile.coverUrl}) center/cover`
              : 'linear-gradient(120deg, rgb(var(--rb-burgundy)), rgb(var(--rb-gold) / 0.5))',
          }}
        />

        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <Avatar
              name={profile.name}
              src={profile.avatarUrl}
              size="xl"
              className="ring-4 ring-[rgb(var(--rb-surface))]"
            />

            <div className="flex flex-wrap items-center gap-2">
              {profile.isSelf ? (
                <Link to="/configuracoes">
                  <Button variant="outline" leftIcon={<Settings className="h-4 w-4" />}>
                    Editar perfil
                  </Button>
                </Link>
              ) : (
                <>
                  {profile.allowMessages && (
                    <Button
                      variant="outline"
                      leftIcon={<MessageSquare className="h-4 w-4" />}
                      onClick={startConversation}
                      loading={openConversation.isPending}
                    >
                      Mensagem
                    </Button>
                  )}
                  <Button
                    variant={profile.viewerIsFollowing ? 'secondary' : 'primary'}
                    loading={toggleFollow.isPending}
                    onClick={() =>
                      toggleFollow.mutate({ username: profile.username, following: profile.viewerIsFollowing })
                    }
                  >
                    {profile.viewerIsFollowing ? 'Seguindo' : 'Seguir'}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{profile.name}</h1>
              {profile.followsViewer && !profile.isSelf && <Badge tone="outline">Segue voce</Badge>}
              {profile.visibility.restricted && (
                <Badge tone="outline" icon={<Lock className="h-3 w-3" />}>
                  Perfil privado
                </Badge>
              )}
            </div>
            <p className="text-muted">@{profile.username}</p>

            {profile.bio && <p className="mt-3 max-w-2xl leading-relaxed text-muted text-pretty">{profile.bio}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              {profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-subtle" aria-hidden />
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 text-burgundy hover:underline"
                >
                  <Link2 className="h-4 w-4" aria-hidden />
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-subtle" aria-hidden />
                Desde {formatDate(profile.joinedAt)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <button type="button" onClick={() => setTab('network')} className="hover:underline">
                <span className="font-semibold text-ink">{formatNumber(profile.followersCount)}</span>{' '}
                <span className="text-muted">seguidores</span>
              </button>
              <button type="button" onClick={() => setTab('network')} className="hover:underline">
                <span className="font-semibold text-ink">{formatNumber(profile.followingCount)}</span>{' '}
                <span className="text-muted">seguindo</span>
              </button>
              <span>
                <span className="font-semibold text-ink">{formatNumber(profile.stats.READ ?? 0)}</span>{' '}
                <span className="text-muted">livros lidos</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------- interesses em comum ----- */}
      {profile.compatibility && profile.compatibility.score > 0 && (
        <Card className="mt-5 border-burgundy/25 bg-burgundy/[0.04]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-ink">Voces combinam</h2>
                <CompatibilityBadge score={profile.compatibility.score} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {profile.compatibility.reasons.map((r) => r.label).join(' - ') || 'Interesses proximos'}
              </p>
            </div>
          </div>

          {profile.compatibility.sharedBooks.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Livros em comum</p>
              <BookShelf>
                {profile.compatibility.sharedBooks.map((book) => (
                  <BookCard key={book.id} book={book} size="sm" />
                ))}
              </BookShelf>
            </div>
          )}

          {profile.compatibility.sharedCommunities.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Comunidades em comum</p>
              <div className="flex flex-wrap gap-2">
                {profile.compatibility.sharedCommunities.map((community) => (
                  <Link key={community.id} to={`/c/${community.slug}`}>
                    <Badge tone="burgundy" size="md">
                      {community.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* O ponto da secao 8: o numero vira assunto. */}
          {profile.compatibility.conversationStarters.length > 0 && !profile.isSelf && (
            <div className="mt-5 rounded-panel border border-line bg-surface/70 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <MessageSquare className="h-4 w-4 text-burgundy" aria-hidden />
                Voces deveriam conversar sobre
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {profile.compatibility.conversationStarters.map((starter) => (
                  <li key={`${starter.type}-${starter.id}`}>
                    <Link
                      to={starter.type === 'book' ? `/livro/${starter.slug}` : `/c/${starter.slug}`}
                      className="group flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-gold" aria-hidden />
                      <span className="font-medium text-ink group-hover:text-burgundy">{starter.title}</span>
                      <span className="text-xs text-subtle">{starter.hint}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              {profile.allowMessages && (
                <Button size="sm" className="mt-3.5" onClick={startConversation} loading={openConversation.isPending}>
                  Puxar conversa
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      <Tabs items={tabs} value={tab} onChange={setTab} className="mb-6 mt-6" />

      {profile.visibility.restricted && tab !== 'overview' ? (
        <EmptyState
          icon={<Lock className="h-5 w-5" />}
          title="Este perfil e privado."
          description={`Siga ${profile.name} para ver a biblioteca, as comunidades e a atividade.`}
        />
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-10">
              {profile.currentlyReading.length > 0 && (
                <section>
                  <SectionHeader title="Atualmente lendo" />
                  <BookShelf>
                    {profile.currentlyReading.map((book) => (
                      <BookCard key={book.id} book={book} progress={book.progress} currentPage={book.currentPage} />
                    ))}
                  </BookShelf>
                </section>
              )}

              {profile.favorites.length > 0 && (
                <section>
                  <SectionHeader title="Favoritos" />
                  <BookShelf>
                    {profile.favorites.map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </BookShelf>
                </section>
              )}

              {profile.recentlyRead.length > 0 && (
                <section>
                  <SectionHeader title="Li recentemente" />
                  <BookShelf>
                    {profile.recentlyRead.map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                  </BookShelf>
                </section>
              )}

              {profile.interests.length > 0 && (
                <section>
                  <SectionHeader title="Generos favoritos" />
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((genre) => (
                      <Link key={genre.id} to={`/explorar?genero=${genre.slug}`}>
                        <Badge tone="outline" size="md">
                          {genre.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {profile.achievements.length > 0 && (
                <section>
                  <SectionHeader title="Conquistas" />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {profile.achievements.map((achievement) => (
                      <Card key={achievement.code} className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-gold/12 text-gold">
                          <BookOpen className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{achievement.name}</p>
                          <p className="truncate text-xs text-muted">{achievement.description}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {profile.currentlyReading.length === 0 && profile.recentlyRead.length === 0 && (
                <EmptyState
                  icon={<BookOpen className="h-5 w-5" />}
                  title={profile.isSelf ? 'Sua estante esta vazia.' : 'Nenhum livro por aqui ainda.'}
                  description={
                    profile.isSelf
                      ? 'Adicione o que voce esta lendo para aparecer para outras pessoas.'
                      : 'Quando essa pessoa adicionar livros, eles aparecem aqui.'
                  }
                  action={
                    profile.isSelf ? (
                      <Link to="/livros">
                        <Button>Encontrar livros</Button>
                      </Link>
                    ) : undefined
                  }
                />
              )}
            </div>
          )}

          {tab === 'books' && (
            <div className="space-y-8">
              {[
                { title: 'Atualmente lendo', books: profile.currentlyReading },
                { title: 'Favoritos', books: profile.favorites },
                { title: 'Li recentemente', books: profile.recentlyRead },
              ]
                .filter((group) => group.books.length > 0)
                .map((group) => (
                  <section key={group.title}>
                    <SectionHeader title={group.title} />
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
                      {group.books.map((book) => (
                        <BookCard key={book.id} book={book} className="w-full" />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          )}

          {tab === 'communities' && (
            <>
              {profile.communities.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.communities.map((community) => (
                    <Link
                      key={community.id}
                      to={`/c/${community.slug}`}
                      className="flex items-center gap-3 rounded-panel border border-line bg-surface p-4 transition-colors hover:border-subtle"
                    >
                      <CommunityAvatar community={community} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{community.name}</p>
                        <p className="truncate text-xs text-muted">{community.membersCount} membros</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Users className="h-5 w-5" />}
                  title="Nenhuma comunidade publica."
                  description={profile.isSelf ? 'Entre em uma comunidade para ela aparecer aqui.' : undefined}
                />
              )}
            </>
          )}

          {tab === 'reviews' && (
            <>
              {profile.reviews.length > 0 ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {profile.reviews.map((review) => (
                    <Card key={review.id}>
                      {review.book && (
                        <Link to={`/livro/${review.book.slug}`} className="text-sm font-medium text-burgundy hover:underline">
                          {review.book.title}
                        </Link>
                      )}
                      <Rating value={review.rating} className="mt-1.5" />
                      {review.title && <h3 className="mt-2 font-display text-base font-semibold text-ink">{review.title}</h3>}
                      <Spoiler active={review.containsSpoiler} className="mt-2">
                        <p className="text-sm leading-relaxed text-muted text-pretty">{review.content}</p>
                      </Spoiler>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<BookOpen className="h-5 w-5" />} title="Nenhuma resenha publicada ainda." />
              )}
            </>
          )}

          {tab === 'activity' && (
            <>
              {posts && posts.items.length > 0 ? (
                <div className="space-y-4">
                  {posts.items.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<MessageSquare className="h-5 w-5" />}
                  title="Nenhuma discussao publica."
                  description={profile.isSelf ? 'Suas discussoes aparecem aqui.' : undefined}
                />
              )}
            </>
          )}

          {tab === 'network' && <NetworkTab username={profile.username} />}
        </>
      )}
    </PageShell>
  );
}

function NetworkTab({ username }: { username: string }) {
  const [kind, setKind] = useState<'followers' | 'following'>('followers');
  const { data, isLoading } = useConnections(username, kind);

  return (
    <div>
      <SegmentedControl
        className="mb-4"
        label="Rede"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'followers', label: 'Seguidores' },
          { value: 'following', label: 'Seguindo' },
        ]}
      />

      {isLoading && <Skeleton className="h-40 w-full rounded-card" />}

      {data && data.items.length === 0 && (
        <EmptyState
          compact
          icon={<Users className="h-5 w-5" />}
          title={kind === 'followers' ? 'Ainda sem seguidores.' : 'Ainda nao segue ninguem.'}
        />
      )}

      {data && data.items.length > 0 && (
        <Card padded={false} className="divide-y divide-line px-5">
          {data.items.map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
        </Card>
      )}
    </div>
  );
}
