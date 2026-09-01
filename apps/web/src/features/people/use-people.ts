import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Achievement, Post, Profile, PublicUser, SuggestedPerson } from '@/types/api';

export function useProfile(username: string) {
  return useQuery({
    queryKey: queryKeys.profile(username),
    queryFn: () => api.get<Profile>(`/users/${username}`),
    enabled: Boolean(username),
  });
}

export function useProfilePosts(username: string) {
  return useQuery({
    queryKey: queryKeys.profilePosts(username),
    queryFn: () => api.get<{ items: Post[] }>(`/users/${username}/posts`),
    enabled: Boolean(username),
  });
}

export function useConnections(username: string, kind: 'followers' | 'following', enabled = true) {
  return useQuery({
    queryKey: queryKeys.connections(username, kind),
    queryFn: () => api.get<{ items: PublicUser[] }>(`/users/${username}/${kind}`),
    enabled: enabled && Boolean(username),
  });
}

export function useSuggestedPeople(options: { bookId?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.suggestedPeople(options.bookId),
    queryFn: () => api.get<{ items: SuggestedPerson[] }>('/users/suggested', options),
  });
}

export function useToggleFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ username, following }: { username: string; following: boolean }) =>
      following ? api.delete(`/users/${username}/follow`) : api.post(`/users/${username}/follow`),
    onSuccess: (_data, { username }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile(username) });
      void queryClient.invalidateQueries({ queryKey: ['suggested-people'] });
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.home });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => api.patch('/users/me', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.session }),
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: queryKeys.achievements,
    queryFn: () => api.get<{ items: Achievement[] }>('/users/me/achievements'),
  });
}
