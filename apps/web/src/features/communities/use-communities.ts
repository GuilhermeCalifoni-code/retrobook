import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  Community,
  PostType,
  CommunityDetail,
  CommunityPrivacy,
  CommunityRole,
  MembershipStatus,
  Page,
  Post,
  PublicUser,
} from '@/types/api';

export interface CommunityFilters {
  q?: string;
  genre?: string;
  tag?: string;
  sort?: 'popular' | 'active' | 'recent';
  mine?: boolean;
}

export function useCommunities(filters: CommunityFilters = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.communities(filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<Community>>('/communities', { ...filters, cursor: pageParam, mine: filters.mine || undefined }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useCommunity(slug: string) {
  return useQuery({
    queryKey: queryKeys.community(slug),
    queryFn: () => api.get<CommunityDetail>(`/communities/${slug}`),
    enabled: Boolean(slug),
  });
}

export type CommunitySort = 'recent' | 'discussed';

export function useCommunityPosts(
  slug: string,
  options: { sort?: CommunitySort; type?: PostType } = {},
  enabled = true,
) {
  const sort = options.sort ?? 'recent';
  return useInfiniteQuery({
    queryKey: queryKeys.communityPosts(slug, `${sort}-${options.type ?? 'all'}`),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Page<Post>>(`/communities/${slug}/posts`, { sort, type: options.type, cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: enabled && Boolean(slug),
  });
}

/** Conversas em alta: ranking por calor, calculado no backend. */
export function useHotDiscussions(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['community-hot', slug],
    queryFn: () => api.get<{ items: Post[] }>(`/communities/${slug}/hot`),
    enabled: enabled && Boolean(slug),
  });
}

/** Saude da comunidade, para quem administra. */
export function useCommunityHealth(slug: string, enabled: boolean) {
  return useQuery({
    queryKey: ['community-health', slug],
    queryFn: () => api.get<import('@/types/api').CommunityHealth>(`/communities/${slug}/health`),
    enabled: enabled && Boolean(slug),
  });
}

export type MemberSort = 'recent' | 'active' | 'alphabetical';

export interface CommunityMemberRow extends PublicUser {
  membershipId: string;
  role: CommunityRole;
  status: MembershipStatus;
  joinedAt: string;
  mutedUntil: string | null;
  isActive: boolean;
}

export function useCommunityMembers(
  slug: string,
  options: { status?: MembershipStatus; q?: string; sort?: MemberSort } = {},
  enabled = true,
) {
  const status = options.status ?? 'ACTIVE';
  return useQuery({
    queryKey: queryKeys.communityMembers(slug, `${status}-${options.sort ?? 'recent'}-${options.q ?? ''}`),
    queryFn: () =>
      api.get<Page<CommunityMemberRow> & { activeToday: number; totalActive: number }>(
        `/communities/${slug}/members`,
        { status, q: options.q, sort: options.sort },
      ),
    enabled: enabled && Boolean(slug),
  });
}

export function useRecommendedCommunities() {
  return useQuery({
    queryKey: queryKeys.recommendedCommunities,
    queryFn: () => api.get<{ items: Community[] }>('/communities/recommended'),
  });
}

export interface CreateCommunityInput {
  name: string;
  tagline?: string;
  description: string;
  genreSlug?: string;
  tags?: string[];
  accentColor?: string;
  privacy: CommunityPrivacy;
  allowMemberPosts?: boolean;
  requireApproval?: boolean;
  rules?: { title: string; description?: string }[];
  bookIds?: string[];
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommunityInput) => api.post<Community>('/communities', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.planUsage });
      void queryClient.invalidateQueries({ queryKey: queryKeys.session });
    },
  });
}

export function useJoinCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.post<{ status: MembershipStatus }>(`/communities/${slug}/join`),
    onSuccess: (_data, slug) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community(slug) });
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
    },
  });
}

export function useLeaveCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.delete(`/communities/${slug}/join`),
    onSuccess: (_data, slug) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.community(slug) });
      void queryClient.invalidateQueries({ queryKey: ['communities'] });
    },
  });
}

export function useModerateMember(slug: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['community-members', slug] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.community(slug) });
  };

  return {
    approve: useMutation({
      mutationFn: (userId: string) => api.post(`/communities/${slug}/members/${userId}/approve`),
      onSuccess: invalidate,
    }),
    reject: useMutation({
      mutationFn: (userId: string) => api.delete(`/communities/${slug}/members/${userId}`),
      onSuccess: invalidate,
    }),
    ban: useMutation({
      mutationFn: (userId: string) => api.post(`/communities/${slug}/members/${userId}/ban`),
      onSuccess: invalidate,
    }),
    mute: useMutation({
      mutationFn: ({ userId, hours }: { userId: string; hours: number }) =>
        api.post(`/communities/${slug}/members/${userId}/mute`, { hours }),
      onSuccess: invalidate,
    }),
    setRole: useMutation({
      mutationFn: ({ userId, role }: { userId: string; role: CommunityRole }) =>
        api.patch(`/communities/${slug}/members/${userId}/role`, { role }),
      onSuccess: invalidate,
    }),
  };
}

export function useUpdateCommunityRules(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rules: { title: string; description?: string }[]) => api.put(`/communities/${slug}/rules`, { rules }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.community(slug) }),
  });
}
