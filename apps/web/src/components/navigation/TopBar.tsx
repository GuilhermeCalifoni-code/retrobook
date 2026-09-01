import { Link, useNavigate } from 'react-router-dom';
import { Bell, BookMarked, LogOut, Moon, Search, Settings, Sun, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, Menu } from '@/design-system';
import { Logo } from '@/components/brand/Logo';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { useSession } from '@/features/auth/session-context';
import { DevicePreviewSwitcher } from '@/features/device-preview';
import { useTheme } from '@/features/theme/use-theme';
import type { LayoutMode } from '@/features/device-preview';

export function TopBar({ layout }: { layout: LayoutMode }) {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const unread = user?.counters.unreadNotifications ?? 0;
  const isMobile = layout === 'mobile';

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6"
      style={{ height: 'var(--rb-header-h)' }}
    >
      {isMobile && (
        <Link to="/inicio" aria-label="RetroBook">
          <Logo compact />
        </Link>
      )}

      <div className={cn('min-w-0 flex-1', isMobile ? 'max-w-none' : 'max-w-xl')}>
        {isMobile ? (
          <button
            type="button"
            onClick={() => navigate('/explorar?buscar=1')}
            className="flex h-9 w-full items-center gap-2 rounded-pill border border-line bg-raised/60 px-3.5 text-sm text-subtle"
          >
            <Search className="h-4 w-4" aria-hidden />
            Buscar no RetroBook
          </button>
        ) : (
          <GlobalSearch />
        )}
      </div>

      {layout === 'desktop' && <DevicePreviewSwitcher className="hidden xl:inline-flex" />}

      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
        className="rounded-full p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        {isDark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
      </button>

      <Link
        to="/notificacoes"
        aria-label={unread > 0 ? `Notificacoes, ${unread} nao lidas` : 'Notificacoes'}
        className="relative rounded-full p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-burgundy px-1 font-mono text-label font-semibold text-on-brand">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Link>

      {user && (
        <Menu
          label="Menu da conta"
          items={[
            { label: 'Meu perfil', icon: <User className="h-4 w-4" />, onSelect: () => navigate('/perfil') },
            { label: 'Minha biblioteca', icon: <BookMarked className="h-4 w-4" />, onSelect: () => navigate('/biblioteca') },
            { label: 'Configuracoes', icon: <Settings className="h-4 w-4" />, onSelect: () => navigate('/configuracoes') },
            {
              label: 'Sair',
              icon: <LogOut className="h-4 w-4" />,
              tone: 'danger',
              onSelect: async () => {
                await logout();
                navigate('/');
              },
            },
          ]}
          trigger={({ toggle: toggleMenu }) => (
            <button type="button" onClick={toggleMenu} aria-label="Abrir menu da conta" className="rounded-full">
              <Avatar name={user.profile.name} src={user.profile.avatarUrl} size="sm" />
            </button>
          )}
        />
      )}
    </header>
  );
}
