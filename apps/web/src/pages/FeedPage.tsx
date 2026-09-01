import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { Button, EmptyState, ErrorState, SkeletonCard, Tabs } from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { PostCard } from '@/features/posts/PostCard';
import { useFeed, type FeedScope } from '@/features/posts/use-posts';

const TABS = [
  { value: 'all' as const, label: 'Tudo' },
  { value: 'communities' as const, label: 'Minhas comunidades' },
  { value: 'following' as const, label: 'Quem eu sigo' },
];

export function FeedPage() {
  const [scope, setScope] = useState<FeedScope>('all');
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed(scope);
  const { openComposer } = useOutletContext<{ openComposer: () => void }>();

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <PageShell width="narrow">
      <Seo title="Feed" description="As conversas das suas comunidades e das pessoas que voce segue." noIndex />

      <PageHeader
        title="Feed"
        description="O que esta sendo discutido nas suas comunidades, entre quem voce segue e sobre os livros da sua estante."
        action={<Button onClick={openComposer}>Nova discussao</Button>}
      />

      <Tabs items={TABS} value={scope} onChange={setScope} className="mb-6" />

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isError && <ErrorState onRetry={() => void refetch()} />}

      {!isLoading && !isError && posts.length === 0 && (
        <EmptyState
          icon={<MessageCircle className="h-5 w-5" />}
          title="Ainda esta silencioso por aqui."
          description={
            scope === 'following'
              ? 'Voce ainda nao segue ninguem. Encontre leitores parecidos com voce.'
              : 'Entre em uma comunidade ou publique a primeira discussao.'
          }
          action={{ label: 'Comecar uma discussao', onClick: openComposer }}
        />
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" loading={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            Carregar mais
          </Button>
        </div>
      )}
    </PageShell>
  );
}
