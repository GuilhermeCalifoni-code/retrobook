import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import { Button, EmptyState, ErrorState, Input, SkeletonCard, Tabs } from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { CommunityCard } from '@/features/communities/CommunityCard';
import { useCommunities, useJoinCommunity, useRecommendedCommunities } from '@/features/communities/use-communities';
import { useDebounced } from '@/features/discovery/use-discovery';
import { useSession } from '@/features/auth/session-context';

type Tab = 'discover' | 'mine' | 'recommended';

export function CommunitiesPage() {
  const { isAuthenticated } = useSession();
  const [tab, setTab] = useState<Tab>('discover');
  const [term, setTerm] = useState('');
  const debounced = useDebounced(term);

  const list = useCommunities({
    q: debounced || undefined,
    sort: tab === 'mine' ? 'recent' : 'popular',
    mine: tab === 'mine',
  });
  const recommended = useRecommendedCommunities();
  const join = useJoinCommunity();

  const tabs = [
    { value: 'discover' as const, label: 'Descobrir' },
    ...(isAuthenticated
      ? [
          { value: 'recommended' as const, label: 'Para voce' },
          { value: 'mine' as const, label: 'Minhas comunidades' },
        ]
      : []),
  ];

  const items =
    tab === 'recommended'
      ? (recommended.data?.items ?? [])
      : (list.data?.pages.flatMap((page) => page.items) ?? []);

  const loading = tab === 'recommended' ? recommended.isLoading : list.isLoading;
  const errored = tab === 'recommended' ? recommended.isError : list.isError;

  return (
    <PageShell width="wide">
      <Seo
        title="Comunidades"
        description="Grupos de leitura, clubes e comunidades literarias no RetroBook."
      />

      <PageHeader
        eyebrow="Comunidades"
        title="Descubra seu lugar entre os livros"
        description="Cada comunidade tem tema, regras e moderacao proprias. Entre em uma — ou crie a sua."
        action={
          isAuthenticated && (
            <Link to="/comunidades/nova">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Criar comunidade</Button>
            </Link>
          )
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Tabs items={tabs} value={tab} onChange={setTab} variant="pill" />
        {tab !== 'recommended' && (
          <div className="w-full sm:ml-auto sm:w-72">
            <Input
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Buscar comunidades..."
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              aria-label="Buscar comunidades"
            />
          </div>
        )}
      </div>

      {loading && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {errored && (
        <ErrorState
          title="Nao conseguimos carregar suas comunidades."
          onRetry={() => void (tab === 'recommended' ? recommended.refetch() : list.refetch())}
        />
      )}

      {!loading && !errored && items.length === 0 && (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={
            tab === 'mine'
              ? 'Voce ainda nao participa de nenhuma comunidade.'
              : term
                ? `Nada encontrado para "${term}".`
                : 'Ainda nao ha comunidades por aqui.'
          }
          description={
            tab === 'mine'
              ? 'Entre em uma comunidade existente ou crie a sua — o plano gratuito permite criar a primeira.'
              : 'Que tal criar a primeira comunidade sobre o assunto que voce procura?'
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {tab === 'mine' && (
                <Button onClick={() => setTab('discover')} variant="outline">
                  Descobrir comunidades
                </Button>
              )}
              <Link to="/comunidades/nova">
                <Button>Criar comunidade</Button>
              </Link>
            </div>
          }
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((community) => (
          <CommunityCard
            key={community.id}
            community={community}
            joining={join.isPending && join.variables === community.slug}
            onJoin={isAuthenticated ? (slug) => join.mutate(slug) : undefined}
          />
        ))}
      </div>

      {tab !== 'recommended' && list.hasNextPage && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
            Carregar mais
          </Button>
        </div>
      )}
    </PageShell>
  );
}
