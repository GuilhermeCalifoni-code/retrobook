import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { ThemePreference } from '@/types/api';

const STORAGE_KEY = 'retrobook.theme';

function resolve(preference: ThemePreference) {
  if (preference === 'SYSTEM') return window.matchMedia('(prefers-color-scheme: dark)').matches;
  return preference === 'DARK';
}

/**
 * Tema claro/escuro. A preferencia vive no localStorage para nao piscar no
 * carregamento e e sincronizada com o perfil quando ha sessao.
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'LIGHT' || stored === 'DARK' || stored === 'SYSTEM' ? stored : 'SYSTEM';
  });

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const dark = resolve(preference);
    document.documentElement.classList.toggle('dark', dark);
    setIsDark(dark);
    localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  useEffect(() => {
    if (preference !== 'SYSTEM') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      document.documentElement.classList.toggle('dark', media.matches);
      setIsDark(media.matches);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const apply = useCallback((next: ThemePreference, persist = true) => {
    setPreference(next);
    if (persist) {
      // Falha silenciosa: visitante sem sessao ainda troca de tema localmente.
      void api.patch('/settings', { theme: next }).catch(() => undefined);
    }
  }, []);

  const toggle = useCallback(() => {
    apply(resolve(preference) ? 'LIGHT' : 'DARK');
  }, [apply, preference]);

  return { preference, isDark, setPreference: apply, toggle };
}
