import { NavLink, Link } from 'react-router-dom';
import { PenLine, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/design-system';
import { useSession } from '@/features/auth/session-context';
import { NAV_ITEMS } from './nav-items';

export function Sidebar({ compact, onCompose }: { compact?: boolean; onCompose: () => void }) {
  const { user } = useSession();
  const unread = user?.counters.unreadNotifications ?? 0;

  return (
    <aside
      className={cn(
        'sticky top-0 flex h-dvh shrink-0 flex-col border-r border-line bg-surface/70 backdrop-blur-sm',
        compact ? 'w-[4.75rem] px-2 py-4' : 'w-[16.5rem] px-4 py-5',
      )}
    >
      <Link to="/inicio" className="mb-6 flex items-center px-1.5" aria-label="RetroBook, ir para o inicio">
        <Logo compact={compact} />
      </Link>

      <nav className="flex-1 space-y-0.5" aria-label="Navegacao principal">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={compact ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-panel px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                compact && 'justify-center px-0',
                isActive ? 'bg-burgundy/10 text-burgundy' : 'text-muted hover:bg-raised hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && !compact && (
                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-burgundy" aria-hidden />
                )}
                <span className="relative shrink-0">
                  {item.icon}
                  {item.badgeKey === 'notifications' && unread > 0 && (
                    <span
                      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-burgundy px-1 font-mono text-label font-semibold text-on-brand"
                      aria-label={`${unread} nao lidas`}
                    >
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                {!compact && <span className="truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 pt-3">
        <Button
          onClick={onCompose}
          fullWidth={!compact}
          size={compact ? 'icon' : 'md'}
          leftIcon={<PenLine className="h-4 w-4" />}
          title="Nova discussao"
        >
          {!compact && 'Nova discussao'}
        </Button>

        {!compact && user?.plan?.tier === 'FREE' && (
          <Link
            to="/configuracoes?aba=plano"
            className="flex items-start gap-2.5 rounded-panel border border-gold/30 bg-gold/8 p-3 transition-colors hover:bg-gold/12"
          >
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
            <span className="text-xs leading-relaxed text-muted">
              <span className="block font-medium text-ink">Sua comunidade cresceu?</span>
              O plano Pro libera membros ilimitados.
            </span>
          </Link>
        )}
      </div>
    </aside>
  );
}
