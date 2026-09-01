import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Comment, Page, Post, PostType } from '@/types/api';

export type FeedScope = 'all' | 'following' | 'communities';

export function useFeed(scope: FeedScope = 'all') {
  return useInfiniteQuery({
    queryKey: queryKeys.feed(scope),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.get<Page<Post>>('/posts/feed', { scope, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function usePost(id: string) {
  return useQuery({
    queryKey: queryKeys.post(id),
    queryFn: () => api.get<{ post: Post; comments: Comment[] }>(`/posts/${id}`),
    enabled: Boolean(id),
  });
}

export interface CreatePostInput {
  communitySlug?: string;
  bookId?: string;
  type: PostType;
  title?: string;
  content: string;
  containsSpoiler?: boolean;
  spoilerScope?: string;
  quoteText?: string;
  quotePage?: number;
  tags?: string[];
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) => api.post<Post>('/posts', input),
    onSuccess: (post) => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
      if (post.community) {
        void queryClient.invalidateQueries({ queryKey: ['community-posts', post.community.slug] });
        void queryClient.invalidateQueries({ queryKey: queryKeys.community(post.community.slug) });
      }
      if (post.book) void queryClient.invalidateQueries({ queryKey: queryKeys.book(post.book.slug) });
    },
  });
}

/**
 * Curtida com atualizacao otimista: a interface responde no toque e reverte
 * se o servidor recusar. Curtir precisa parecer instantaneo.
 */
export function useTogglePostReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => api.post<{ liked: boolean; likesCount: number }>(`/posts/${postId}/reaction`),
    onMutate: async (postId) => {
      const patch = (post: Post): Post =>
        post.id === postId
          ? {
              ...post,
              viewerHasLiked: !post.viewerHasLiked,
              likesCount: post.likesCount + (post.viewerHasLiked ? -1 : 1),
            }
          : post;

      // Fotografa apenas as caches que serao alteradas, para poder reverter.
      const snapshots = [
        ...queryClient.getQueriesData<unknown>({ queryKey: ['feed'] }),
        ...queryClient.getQueriesData<unknown>({ queryKey: ['community-posts'] }),
        ...queryClient.getQueriesData<unknown>({ queryKey: queryKeys.post(postId) }),
      ];

      queryClient.setQueriesData<{ pages: Page<Post>[]; pageParams: unknown[] }>({ queryKey: ['feed'] }, (old) =>
        old ? { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.map(patch) })) } : old,
      );
      queryClient.setQueriesData<{ pages: Page<Post>[]; pageParams: unknown[] }>(
        { queryKey: ['community-posts'] },
        (old) => (old ? { ...old, pages: old.pages.map((p) => ({ ...p, items: p.items.map(patch) })) } : old),
      );
      queryClient.setQueryData<{ post: Post; comments: Comment[] }>(queryKeys.post(postId), (old) =>
        old ? { ...old, post: patch(old.post) } : old,
      );

      return { snapshots };
    },
    onError: (_error, _postId, context) => {
      for (const [key, value] of context?.snapshots ?? []) queryClient.setQueryData(key, value);
    },
    onSettled: (_data, _error, postId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
    },
  });
}

export function useToggleSavePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => api.post<{ saved: boolean }>(`/posts/${postId}/save`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.savedPosts });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { content: string; parentId?: string; containsSpoiler?: boolean }) =>
      api.post<Comment>(`/posts/${postId}/comments`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useToggleCommentReaction(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api.post(`/comments/${commentId}/reaction`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) }),
  });
}

export function usePostModeration() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
    void queryClient.invalidateQueries({ queryKey: ['community-posts'] });
    void queryClient.invalidateQueries({ queryKey: ['post'] });
  };

  return {
    remove: useMutation({
      mutationFn: ({ postId, reason }: { postId: string; reason?: string }) =>
        api.delete(`/posts/${postId}`, { reason }),
      onSuccess: invalidate,
    }),
    pin: useMutation({
      mutationFn: ({ postId, pinned }: { postId: string; pinned: boolean }) =>
        api.patch(`/posts/${postId}/pin`, { pinned }),
      onSuccess: invalidate,
    }),
    lock: useMutation({
      mutationFn: ({ postId, locked }: { postId: string; locked: boolean }) =>
        api.patch(`/posts/${postId}/lock`, { locked }),
      onSuccess: invalidate,
    }),
    removeComment: useMutation({
      mutationFn: (commentId: string) => api.delete(`/comments/${commentId}`),
      onSuccess: invalidate,
    }),
  };
}

export function useSavedPosts() {
  return useQuery({
    queryKey: queryKeys.savedPosts,
    queryFn: () => api.get<{ items: Post[] }>('/posts/saved'),
  });
}

export function useReport() {
  return useMutation({
    mutationFn: (input: { targetType: 'POST' | 'COMMENT' | 'USER' | 'COMMUNITY' | 'MESSAGE'; targetId: string; reason: string; details?: string }) =>
      api.post('/reports', input),
  });
}
