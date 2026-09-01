import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { OfflineBanner } from '@/design-system';
import { BottomNav } from '@/components/navigation/BottomNav';
import { Sidebar } from '@/components/navigation/Sidebar';
import { TopBar } from '@/components/navigation/TopBar';
import { useSession } from '@/features/auth/session-context';
import { DeviceFrame, useLayoutMode } from '@/features/device-preview';
import { PostComposer } from '@/features/posts/PostComposer';
import { AppLoader } from '@/components/feedback/AppLoader';

/** Detecta perda de conexao para o aviso de offline (secao 40). */
function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

export function AppLayout() {
  const { user, isLoading } = useSession();
  const layout = useLayoutMode();
  const location = useLocation();
  const online = useOnline();
  const [composerOpen, setComposerOpen] = useState(false);

  if (isLoading) return <AppLoader />;
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  // Onboarding e obrigatorio: sem interesses, o produto nao tem o que recomendar.
  if (!user.profile.onboardingCompleted && !location.pathname.startsWith('/boas-vindas')) {
    return <Navigate to="/boas-vindas" replace />;
  }

  const isMobile = layout === 'mobile';

  return (
    <DeviceFrame>
      <div className={cn('flex min-h-dvh bg-canvas rb-paper', isMobile && 'flex-col')}>
        {!isMobile && <Sidebar compact={layout === 'tablet'} onCompose={() => setComposerOpen(true)} />}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar layout={layout} />
          {!online && <OfflineBanner />}

          <main id="conteudo" className="min-w-0 flex-1">
            <Outlet context={{ openComposer: () => setComposerOpen(true) }} />
          </main>

          {isMobile && <BottomNav onCompose={() => setComposerOpen(true)} />}
        </div>
      </div>

      <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} />
    </DeviceFrame>
  );
}

/** Container padrao das paginas internas, com trilho lateral opcional. */
export function PageShell({
  children,
  aside,
  className,
  width = 'default',
}: {
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
  width?: 'default' | 'wide' | 'narrow';
}) {
  const layout = useLayoutMode();
  const showAside = Boolean(aside) && layout === 'desktop';

  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-6 sm:px-6 lg:py-8',
        width === 'wide' ? 'max-w-[86rem]' : width === 'narrow' ? 'max-w-3xl' : 'max-w-[74rem]',
        className,
      )}
    >
      <div className={cn(showAside && 'grid grid-cols-[minmax(0,1fr)_20rem] gap-8')}>
        <div className="min-w-0">{children}</div>
        {showAside && <aside className="space-y-6">{aside}</aside>}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold">{eyebrow}</p>
        )}
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted text-pretty">{description}</p>}
      </div>
      {action}
    </header>
  );
}
