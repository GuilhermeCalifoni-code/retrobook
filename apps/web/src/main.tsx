import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/design-system';
import { SessionProvider } from '@/features/auth/session-context';
import { DevicePreviewProvider } from '@/features/device-preview';
import { router } from '@/router';
import { DEFAULT_LOCALE, setLocale } from '@/lib/i18n';
import '@/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // 4xx nao se resolve com insistencia; so tentamos de novo em falha de rede.
        const status = (error as { status?: number }).status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

setLocale(DEFAULT_LOCALE);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <DevicePreviewProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </DevicePreviewProvider>
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
);
