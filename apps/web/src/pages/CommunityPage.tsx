import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BookOpen,
  Check,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  UserMinus,
  UserPlus,
  Users,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FilterChip,
  Input,
  Menu,
  SegmentedControl,
  Skeleton,
  SkeletonCard,
  Tabs,
  useToast,
} from '@/design-system';
import { PageShell } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { BookCard, BookShelf } from '@/features/books/BookCard';
import { CommunityAvatar, PrivacyBadge } from '@/features/communities/CommunityCard';
import { CommunityPulseBadge } from '@/features/communities/CommunityPulse';
import {
  ActiveMembersList,
  BelongingCard,
  FeaturedBookCard,
  FeaturedDiscussionCard,
  RecentActivityList,
} from '@/features/communities/CommunityLife';
import { CommunityFeed } from '@/features/communities/CommunityFeed';
import { PersonRow, RoleBadge } from '@/features/people/PersonCard';
import { PostComposer } from '@/features/posts/PostComposer';
import { UPGRADE_COPY, UpgradePrompt } from '@/features/subscriptions/UpgradePrompt';
import {
  useCommunity,
  useCommunityMembers,
  useJoinCommunity,
  useLeaveCommunity,
  useModerateMember,
  type MemberSort,
} from '@/features/communities/use-communities';
import { useDebounced } from '@/features/discovery/use-discovery';
import { formatDate, formatNumber } from '@/lib/format';

type Tab = 'discussions' | 'books' | 'members' | 'about';

/**
 * Pagina da comunidade.
 *
 * Hierarquia deliberada (secao 38): identidade -> conversa principal ->
 * atividade -> livros -> pessoas -> regras. O trilho lateral concentra os
 * sinais de vida; o centro fica com a conversa, que e o que importa.
 */
export function CommunityPage() {
  const { slug = '' } = useParams();
  const [tab, setTab] = useState<Tab>('discussions');
  const [composerOpen, setComposerOpen] = useState(false);
  const toast = useToast();

  const { data: community, isLoading, isError, refetch } = useCommunity(slug);
  const join = useJoinCommunity();
  const leave = useLeaveCommunity();

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-44 w-full rounded-card" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <SkeletonCard />
        </div>
      </PageShell>
    );
  }

  if (isError || !community) {
    return (
      <PageShell>
        <ErrorState title="Comunidade nao encontrada." onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  const membership = community.viewer.membership;
  const isMember = membership?.status === 'ACTIVE';
  const isPending = membership?.status === 'PENDING';
  const accent = community.accentColor ?? undefined;
  const canView = community.viewer.canViewContent;
  // Sem discussao nenhuma, quem entrou precisa de direcao — nao de um mural vazio.
  const needsWelcome = isMember && !community.featuredDiscussion;

  const handleJoin = () => {
    join.mutate(slug, {
      onSuccess: (result) => {
        toast.success(
          result.status === 'PENDING'
            ? 'Solicitacao enviada. A moderacao vai analisar.'
            : `Voce entrou em ${community.name}.`,
        );
      },
      onError: (error) => toast.error(error instanceof Error ? error.message : 'Nao conseguimos concluir agora.'),
    });
  };

  const tabs = [
    { value: 'discussions' as const, label: 'Discussoes', count: community.postsCount },
    { value: 'books' as const, label: 'Livros', count: community.books.length },
    { value: 'members' as const, label: 'Membros', count: community.membersCount },
    { value: 'about' as const, label: 'Sobre' },
  ];

  return (
    <PageShell
      width="wide"
      aside={
        <>
          {community.belonging && !isMember && <BelongingCard reasons={community.belonging.reasons} />}
          {canView && community.featuredBook && <FeaturedBookCard book={community.featuredBook} />}
          {canView && community.recentActivity.length > 0 && (
            <RecentActivityList items={community.recentActivity} />
          )}
          {canView && community.activeMembers.length > 0 && (
            <ActiveMembersList members={community.activeMembers} />
          )}

          {community.rules.length > 0 && (
            <Card>
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Combinados daqui</h2>
              <ol className="space-y-3">
                {community.rules.map((rule, index) => (
                  <li key={rule.id} className="flex gap-2.5">
                    <span className="font-mono text-xs text-subtle">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{rule.title}</p>
                      {rule.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">{rule.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {community.moderators.length > 0 && (
            <Card>
              <h2 className="mb-2 font-display text-base font-semibold text-ink">Quem cuida daqui</h2>
              <div className="divide-y divide-line">
                {community.moderators.map((moderator) => (
                  <PersonRow key={moderator.id} person={moderator} trailing={<RoleBadge role={moderator.role} />} />
                ))}
              </div>
            </Card>
          )}

          {community.similar.length > 0 && (
            <Card>
              <h2 className="mb-3 font-display text-base font-semibold text-ink">Voce tambem pode gostar</h2>
              <div className="space-y-3">
                {community.similar.map((similar) => (
                  <Link
                    key={similar.id}
                    to={`/c/${similar.slug}`}
                    className="flex items-start gap-2.5 rounded-control p-1 transition-colors hover:bg-raised"
                  >
                    <CommunityAvatar community={similar} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{similar.name}</span>
                      {/* Nunca recomendamos sem dizer por que (secao 12). */}
                      <span className="block truncate text-xs text-gold">
                        {similar.reasons[0] ?? `${similar.membersCount} membros`}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </>
      }
    >
      <Seo
        title={community.name}
        description={community.tagline ?? community.description}
        image={community.coverUrl ?? undefined}
      />

      {/* --------------------------------------------------- 1. identidade -- */}
      <header className="overflow-hidden rounded-card border border-line bg-surface">
        <div
          className="h-32 w-full sm:h-40"
          aria-hidden
          style={{
            background: community.coverUrl
              ? `url(${community.coverUrl}) center/cover`
              : `linear-gradient(120deg, ${accent ?? '#7B2E3A'}, ${accent ?? '#7B2E3A'}22)`,
          }}
        />

        <div className="-mt-10 flex flex-wrap items-end gap-x-4 gap-y-3 px-5 pb-5 sm:px-6">
            <CommunityAvatar
              community={community}
              size="lg"
              className="order-1 ring-4 ring-[rgb(var(--rb-surface))]"
            />

            <div className="order-3 flex w-full items-center gap-2 [&>*]:flex-1 sm:order-2 sm:ml-auto sm:w-auto sm:[&>*]:flex-none">
              {isMember ? (
                <>
                  {community.viewer.canPost && (
                    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setComposerOpen(true)}>
                      Nova discussao
                    </Button>
                  )}
                  <Menu
                    items={[
                      ...(community.viewer.canModerate
                        ? [
                            {
                              label: `Solicitacoes (${community.viewer.pendingRequests})`,
                              icon: <UserPlus className="h-4 w-4" />,
                              onSelect: () => setTab('members'),
                            },
                          ]
                        : []),
                      {
                        label: 'Sair da comunidade',
                        icon: <UserMinus className="h-4 w-4" />,
                        tone: 'danger' as const,
                        onSelect: () =>
                          leave.mutate(slug, {
                            onSuccess: () => toast.success('Voce saiu da comunidade.'),
                            onError: (error) =>
                              toast.error(error instanceof Error ? error.message : 'Nao foi possivel sair.'),
                          }),
                      },
                    ]}
                    trigger={({ toggle }) => (
                      <Button variant="secondary" onClick={toggle} leftIcon={<Check className="h-4 w-4" />}>
                        Participando
                      </Button>
                    )}
                  />
                </>
              ) : isPending ? (
                <Button variant="outline" disabled>
                  Solicitacao enviada
                </Button>
              ) : (
                <Button
                  onClick={handleJoin}
                  loading={join.isPending}
                  disabled={community.capacity.isFull && community.privacy === 'PUBLIC'}
                >
                  {community.privacy === 'PUBLIC' ? 'Entrar na comunidade' : 'Pedir para entrar'}
                </Button>
              )}
            </div>

          <div className="order-2 w-full sm:order-3 sm:mt-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{community.name}</h1>
              <PrivacyBadge privacy={community.privacy} />
            </div>

            {community.tagline && <p className="mt-1 text-muted text-pretty">{community.tagline}</p>}

            {/* Quantos somos e se tem gente falando — os dois sinais do hero (secao 5). */}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-subtle" aria-hidden />
                {formatNumber(community.membersCount)} {community.membersCount === 1 ? 'membro' : 'membros'}
              </span>
              <CommunityPulseBadge pulse={community.pulse} />
              <span className="text-subtle">Desde {formatDate(community.createdAt)}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {community.genre && <Badge tone="outline">{community.genre.name}</Badge>}
              {community.tags
                .filter((tag) => tag.slug !== community.genre?.slug)
                .slice(0, 4)
                .map((tag) => (
                  <Badge key={tag.slug} tone="outline">
                    #{tag.name}
                  </Badge>
                ))}
            </div>

            {community.capacity.isFull && community.viewer.canModerate && (
              <UpgradePrompt
                variant="inline"
                className="mt-4"
                cta="Conhecer o Pro"
                {...UPGRADE_COPY.communityMembers(community.name, community.capacity.limit)}
              />
            )}
          </div>
        </div>
      </header>

      {/* Boas-vindas e primeira acao (secoes 23 e 24). */}
      {needsWelcome && canView && (
        <Card className="mt-4 border-gold/30 bg-gold/[0.05]">
          <h2 className="font-display text-base font-semibold text-ink">
            Este lugar ainda esta em silencio.
          </h2>
          <p className="mt-1 text-sm text-muted text-pretty">
            {community.viewer.canPost
              ? 'Uma primeira pergunta costuma ser o suficiente para comecar. Apresente-se ou conte o que voce esta lendo.'
              : 'Assim que a moderacao abrir a primeira conversa, ela aparece aqui.'}
          </p>
          {community.viewer.canPost && (
            <Button size="sm" className="mt-3" onClick={() => setComposerOpen(true)}>
              Comecar a conversa
            </Button>
          )}
        </Card>
      )}

      <Tabs items={tabs} value={tab} onChange={setTab} className="mb-6 mt-6" />

      {!canView && tab !== 'about' ? (
        <EmptyState
          icon={<Lock className="h-5 w-5" />}
          title="Esta comunidade e privada."
          description="Peca para entrar e a moderacao vai avaliar seu pedido. As discussoes ficam visiveis depois da aprovacao."
          action={!isPending ? { label: 'Pedir para entrar', onClick: handleJoin } : undefined}
        />
      ) : (
        <>
          {tab === 'discussions' && (
            <div className="space-y-6">
              {/* ------------------------------------ 2. conversa principal -- */}
              {community.featuredDiscussion && (
                <FeaturedDiscussionCard featured={community.featuredDiscussion} />
              )}

              <CommunityFeed
                slug={slug}
                canPost={community.viewer.canPost}
                onCompose={() => setComposerOpen(true)}
                enabled={canView}
              />
            </div>
          )}

          {tab === 'books' && (
            <section>
              {community.books.length > 0 ? (
                <BookShelf className="flex-wrap">
                  {community.books.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </BookShelf>
              ) : (
                <EmptyState
                  icon={<BookOpen className="h-5 w-5" />}
                  title="Nenhum livro associado ainda."
                  description="A moderacao pode associar livros para orientar as discussoes."
                />
              )}
            </section>
          )}

          {tab === 'members' && (
            <MembersTab
              slug={slug}
              canModerate={community.viewer.canModerate}
              pending={community.viewer.pendingRequests}
              totalMembers={community.membersCount}
            />
          )}

          {tab === 'about' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <h2 className="mb-2 font-display text-lg font-semibold text-ink">Sobre</h2>
                <p className="whitespace-pre-line leading-relaxed text-muted text-pretty">{community.description}</p>

                {community.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {community.tags.map((tag) => (
                      <Badge key={tag.slug} tone="outline">
                        #{tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <h2 className="mb-3 font-display text-lg font-semibold text-ink">Como funciona por aqui</h2>
                <dl className="space-y-3 text-sm">
                  <Row label="Privacidade">
                    {community.privacy === 'PUBLIC'
                      ? 'Publica'
                      : community.privacy === 'PRIVATE'
                        ? 'Privada'
                        : 'Por aprovacao'}
                  </Row>
                  <Row label="Quem pode publicar">
                    {community.allowMemberPosts ? 'Todos os membros' : 'Apenas a moderacao'}
                  </Row>
                  <Row label="Entrada">{community.requireApproval ? 'Precisa de aprovacao' : 'Livre'}</Row>
                  <Row label="Conversas respondidas">{community.pulse.signals.replyRate}% das discussoes</Row>
                  <Row label="Criada por">
                    <Link to={`/u/${community.owner.username}`} className="font-medium text-burgundy hover:underline">
                      {community.owner.name}
                    </Link>
                  </Row>
                </dl>
              </Card>
            </div>
          )}
        </>
      )}

      <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} communitySlug={slug} />
    </PageShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

function MembersTab({
  slug,
  canModerate,
  pending,
  totalMembers,
}: {
  slug: string;
  canModerate: boolean;
  pending: number;
  totalMembers: number;
}) {
  const [showPending, setShowPending] = useState(false);
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState<MemberSort>('recent');
  const debounced = useDebounced(term);

  const members = useCommunityMembers(slug, {
    status: showPending ? 'PENDING' : 'ACTIVE',
    q: debounced || undefined,
    sort,
  });
  const moderate = useModerateMember(slug);
  const toast = useToast();

  return (
    <div>
      {/* "34 estiveram ativas hoje" diz muito mais que "2.431 membros" (secao 29). */}
      {!showPending && members.data && (
        <p className="mb-4 text-sm text-muted">
          <span className="font-medium text-ink">{formatNumber(totalMembers)} pessoas</span> por aqui
          {members.data.activeToday > 0 && (
            <>
              {' — '}
              <span className="font-medium text-success">
                {members.data.activeToday} {members.data.activeToday === 1 ? 'esteve' : 'estiveram'} por aqui hoje
              </span>
            </>
          )}
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {canModerate && (
          <div className="flex gap-2">
            <FilterChip tone="soft" active={!showPending} onClick={() => setShowPending(false)}>
              Membros
            </FilterChip>
            <FilterChip tone="soft" active={showPending} onClick={() => setShowPending(true)}>
              Solicitacoes {pending > 0 && <span className="font-mono">({pending})</span>}
            </FilterChip>
          </div>
        )}

        {!showPending && (
          <>
            <div className="w-full sm:ml-auto sm:w-56">
              <Input
                leftIcon={<Search className="h-4 w-4" />}
                placeholder="Buscar pessoa..."
                aria-label="Buscar membros"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <SegmentedControl
              label="Ordenar membros"
              value={sort}
              onChange={setSort}
              options={[
                { value: 'recent', label: 'Recentes' },
                { value: 'active', label: 'Ativos' },
                { value: 'alphabetical', label: 'A-Z' },
              ]}
            />
          </>
        )}
      </div>

      {members.isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {members.isError && <ErrorState onRetry={() => void members.refetch()} />}

      {members.data?.items.length === 0 && (
        <EmptyState
          compact
          icon={<Users className="h-5 w-5" />}
          title={
            showPending
              ? 'Nenhuma solicitacao pendente.'
              : debounced
                ? `Ninguem encontrado para "${debounced}".`
                : 'Ainda sem membros.'
          }
        />
      )}

      {members.data && members.data.items.length > 0 && (
        <Card padded={false} className="divide-y divide-line px-5">
          {members.data.items.map((member) => (
            <PersonRow
              key={member.id}
              person={member}
              subtitle={`@${member.username}`}
              trailing={
                <div className="flex items-center gap-2">
                  {member.isActive && !showPending && <Badge tone="success">Ativo</Badge>}
                  <RoleBadge role={member.role} />
                  {member.mutedUntil && new Date(member.mutedUntil) > new Date() && (
                    <Badge tone="outline" icon={<VolumeX className="h-3 w-3" />}>
                      Silenciado
                    </Badge>
                  )}

                  {showPending && canModerate ? (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        onClick={() =>
                          moderate.approve.mutate(member.id, {
                            onSuccess: () => toast.success(`${member.name} entrou na comunidade.`),
                            onError: (error) =>
                              toast.error(error instanceof Error ? error.message : 'Nao foi possivel aprovar.'),
                          })
                        }
                      >
                        Aprovar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => moderate.reject.mutate(member.id)}>
                        Recusar
                      </Button>
                    </div>
                  ) : canModerate && member.role !== 'OWNER' ? (
                    <Menu
                      items={[
                        {
                          label: 'Tornar moderador(a)',
                          icon: <Shield className="h-4 w-4" />,
                          onSelect: () =>
                            moderate.setRole.mutate(
                              { userId: member.id, role: 'MODERATOR' },
                              { onSuccess: () => toast.success(`${member.name} agora modera aqui.`) },
                            ),
                        },
                        {
                          label: 'Silenciar por 24h',
                          icon: <VolumeX className="h-4 w-4" />,
                          onSelect: () =>
                            moderate.mute.mutate(
                              { userId: member.id, hours: 24 },
                              { onSuccess: () => toast.success(`${member.name} foi silenciado por 24 horas.`) },
                            ),
                        },
                        {
                          label: 'Bloquear da comunidade',
                          icon: <UserMinus className="h-4 w-4" />,
                          tone: 'danger' as const,
                          onSelect: () =>
                            moderate.ban.mutate(member.id, {
                              onSuccess: () => toast.success(`${member.name} foi removido da comunidade.`),
                            }),
                        },
                      ]}
                      trigger={({ toggle }) => (
                        <button
                          type="button"
                          onClick={toggle}
                          aria-label={`Moderar ${member.name}`}
                          className="rounded-full p-1.5 text-subtle hover:bg-raised hover:text-ink"
                        >
                          <MoreHorizontal className="h-4 w-4" aria-hidden />
                        </button>
                      )}
                    />
                  ) : null}
                </div>
              }
            />
          ))}
        </Card>
      )}
    </div>
  );
}
