import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { SessionUser } from '@/types/api';

interface SessionContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<SessionUser>;
  register: (input: { name: string; username: string; email: string; password: string }) => Promise<SessionUser>;
  logout: () => Promise<void>;
  setUser: (user: SessionUser) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.session,
    queryFn: async () => {
      try {
        const response = await api.get<{ user: SessionUser }>('/auth/me');
        return response.user;
      } catch (error) {
        // Visitante nao autenticado nao e um erro: a landing precisa renderizar.
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const setUser = useCallback(
    (user: SessionUser | null) => {
      queryClient.setQueryData(queryKeys.session, user);
    },
    [queryClient],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      user: data ?? null,
      isLoading,
      isAuthenticated: Boolean(data),
      refresh: async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.session });
      },
      login: async (input) => {
        const response = await api.post<{ user: SessionUser }>('/auth/login', input, { skipRefresh: true });
        setUser(response.user);
        return response.user;
      },
      register: async (input) => {
        const response = await api.post<{ user: SessionUser }>('/auth/register', input, { skipRefresh: true });
        setUser(response.user);
        return response.user;
      },
      logout: async () => {
        await api.post('/auth/logout', undefined, { skipRefresh: true });
        setUser(null);
        queryClient.clear();
      },
      setUser: (user) => setUser(user),
    }),
    [data, isLoading, queryClient, setUser],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession precisa estar dentro de SessionProvider');
  return context;
}

/** Aplica o tema salvo do usuario assim que a sessao carrega. */
export function useSyncTheme() {
  const { user } = useSession();
  useEffect(() => {
    if (!user) return;
    const preference = user.settings.theme;
    localStorage.setItem('retrobook.theme', preference);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = preference === 'DARK' || (preference === 'SYSTEM' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
  }, [user]);
}
