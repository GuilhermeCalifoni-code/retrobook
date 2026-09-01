import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, EmptyState, ErrorState, FilterChip, SegmentedControl, SkeletonCard } from '@/design-system';
import { PostCard } from '@/features/posts/PostCard';
import { useCommunityPosts, type CommunitySort } from './use-communities';
import type { PostType } from '@/types/api';

/**
 * Feed da comunidade com filtros e ordenacao (secoes 26 a 28).
 *
 * Duas decisoes de produto aqui:
 *
 * - A ordenacao "Mais discutidas" usa **respostas**, nao curtidas. O RetroBook
 *   otimiza para conversa; curtida mede aprovacao.
 * - A preferencia de filtro fica guardada por comunidade. Quem entra no Clube
 *   Duna so para ler teorias nao quer reconfigurar isso toda visita.
 */

const TYPE_FILTERS: { value: PostType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tudo' },
  { value: 'DISCUSSION', label: 'Discussoes' },
  { value: 'THEORY', label: 'Teorias' },
  { value: 'QUESTION', label: 'Perguntas' },
  { value: 'REVIEW', label: 'Resenhas' },
  { value: 'READING_UPDATE', label: 'Leituras' },
];

const SORTS: { value: CommunitySort; label: string }[] = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'discussed', label: 'Mais discutidas' },
];

function storageKey(slug: string) {
  return `retrobook.community.${slug}.feed`;
}

export function CommunityFeed({
  slug,
  canPost,
  onCompose,
  enabled = true,
}: {
  slug: string;
  canPost: boolean;
  onCompose: () => void;
  enabled?: boolean;
}) {
  const [type, setType] = useState<PostType | 'ALL'>('ALL');
  const [sort, setSort] = useState<CommunitySort>('recent');

  // Preferencia lembrada por comunidade (secao 27).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(slug));
      if (!raw) return;
      const saved = JSON.parse(raw) as { type?: PostType | 'ALL'; sort?: CommunitySort };
      if (saved.type) setType(saved.type);
      if (saved.sort) setSort(saved.sort);
    } catch {
      /* preferencia e conveniencia: falha nao pode quebrar o feed */
    }
  }, [slug]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(slug), JSON.stringify({ type, sort }));
    } catch {
      /* modo privado do navegador */
    }
  }, [slug, type, sort]);

  const posts = useCommunityPosts(slug, { sort, type: type === 'ALL' ? undefined : type }, enabled);
  const items = posts.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="rb-scroll-x flex gap-1.5" role="tablist" aria-label="Filtrar por tipo">
          {TYPE_FILTERS.map((filter) => (
            <FilterChip
              key={filter.value}
              tone="soft"
              active={type === filter.value}
              onClick={() => setType(filter.value)}
            >
              {filter.label}
            </FilterChip>
          ))}
        </div>

        <SegmentedControl
          className="ml-auto"
          label="Ordenar discussoes"
          value={sort}
          onChange={setSort}
          options={SORTS}
        />
      </div>

      {posts.isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {posts.isError && <ErrorState onRetry={() => void posts.refetch()} />}

      {!posts.isLoading && !posts.isError && items.length === 0 && (
        <EmptyState
          icon={<MessageCircle className="h-5 w-5" />}
          title={
            type === 'ALL'
              ? 'Toda comunidade comeca com uma primeira conversa.'
              : 'Nada deste tipo por aqui ainda.'
          }
          description={
            type !== 'ALL'
              ? 'Experimente outro filtro.'
              : canPost
                ? 'Abra a primeira discussao. Todo mundo da comunidade sera avisado.'
                : 'Assim que a moderacao publicar, aparece aqui.'
          }
          action={
            type === 'ALL' && canPost ? { label: 'Comecar a primeira', onClick: onCompose } : undefined
          }
        />
      )}

      <div className="space-y-4">
        {items.map((post) => (
          <PostCard key={post.id} post={post} hideCommunity />
        ))}
      </div>

      {posts.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" loading={posts.isFetchingNextPage} onClick={() => void posts.fetchNextPage()}>
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
}
