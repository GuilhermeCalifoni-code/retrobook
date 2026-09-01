import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  AppNotification,
  Book,
  Community,
  Conversation,
  HomeDashboard,
  Message,
  Page,
  Plan,
  PlanUsage,
  Post,
  ReadingStats,
  SearchResults,
} from '@/types/api';

/** Debounce simples usado na busca global e nos campos de pesquisa. */
export function useDebounced<T>(value: T, delay = 320) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useHome() {
  return useQuery({
    queryKey: queryKeys.home,
    queryFn: () => api.get<HomeDashboard>('/discovery/home'),
  });
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => api.get<SearchResults>('/discovery/search', { q: query }),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useTrending() {
  return useQuery({
    queryKey: queryKeys.trending,
    queryFn: () => api.get<{ discussions: Post[]; books: Book[]; communities: Community[] }>('/discovery/trending'),
  });
}

export function useExploreDiscussions(genre?: string) {
  return useQuery({
    queryKey: queryKeys.exploreDiscussions(genre),
    queryFn: () => api.get<{ items: Post[] }>('/discovery/discussions', { genre }),
  });
}

export function useRecommendedBooks() {
  return useQuery({
    queryKey: ['recommended-books'],
    queryFn: () => api.get<{ items: Book[] }>('/discovery/books/recommended'),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api.get<Page<AppNotification>>('/notifications'),
  });
}

export function useUnreadCount(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    enabled,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => api.post('/notifications/read', { ids }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      void queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
      void queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
  });
}

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => api.get<{ items: Conversation[] }>('/messages'),
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: () => api.get<{ id: string; with: Conversation['with']; messages: Message[] }>(`/messages/${id}`),
    enabled: Boolean(id),
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { body?: string; sharedBookId?: string; sharedCommunityId?: string }) =>
      api.post<Message>(`/messages/${conversationId}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

export function useOpenConversation() {
  return useMutation({
    mutationFn: (username: string) => api.post<{ id: string }>(`/messages/with/${username}`, {}),
  });
}

export function useReadingStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.get<ReadingStats>('/stats/reading'),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: queryKeys.plans,
    queryFn: () => api.get<{ items: Plan[] }>('/subscriptions/plans'),
    staleTime: 60 * 60_000,
  });
}

export function usePlanUsage(enabled = true) {
  return useQuery({
    queryKey: queryKeys.planUsage,
    queryFn: () => api.get<PlanUsage>('/subscriptions/usage'),
    enabled,
  });
}

// -- Evolucao: universo, presenca, serendipidade e conclusao de leitura ------

export function useUniverse() {
  return useQuery({
    queryKey: ['universe'],
    queryFn: () => api.get<import('@/types/api').Universe>('/discovery/universe'),
  });
}

export function useBookPresence(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['book-presence', slug],
    queryFn: () => api.get<import('@/types/api').BookPresence>(`/discovery/books/${slug}/presence`),
    enabled: enabled && Boolean(slug),
  });
}

export function useSerendipity() {
  return useQuery({
    queryKey: ['serendipity'],
    queryFn: () => api.get<{ items: Book[] }>('/discovery/serendipity'),
  });
}

export function useFinishCelebration(bookId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['celebration', bookId],
    queryFn: () => api.get<import('@/types/api').FinishCelebration>(`/library/books/${bookId}/celebration`),
    enabled: enabled && Boolean(bookId),
  });
}

/** Compartilhar progresso de leitura como atividade social. */
export function useShareReadingProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, ...body }: { bookId: string; note?: string; finished?: boolean; communitySlug?: string }) =>
      api.post<Post>(`/library/books/${bookId}/share-progress`, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
    },
  });
}
