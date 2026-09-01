import { NavLink } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PRIMARY_NAV } from './nav-items';

/**
 * Navegacao inferior do mobile. Nao e o desktop reduzido: sao as cinco acoes
 * que uma pessoa realmente faz no celular, com alvo de toque de 44px.
 */
export function BottomNav({ onCompose }: { onCompose: () => void }) {
  return (
    <nav
      aria-label="Navegacao principal"
      className="sticky bottom-0 z-40 flex items-stretch border-t border-line bg-surface/95 backdrop-blur rb-safe-bottom"
      style={{ minHeight: 'var(--rb-bottom-nav-h)' }}
    >
      {PRIMARY_NAV.slice(0, 2).map((item) => (
        <BottomNavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
      ))}

      <div className="flex flex-1 items-center justify-center">
        <button
          type="button"
          onClick={onCompose}
          aria-label="Nova discussao"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-action text-on-brand shadow-lifted transition-transform active:scale-95"
        >
          <Plus className="h-6 w-6" aria-hidden />
        </button>
      </div>

      {PRIMARY_NAV.slice(2, 4).map((item) => (
        <BottomNavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
      ))}
    </nav>
  );
}

function BottomNavLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-label font-medium transition-colors',
          isActive ? 'text-burgundy' : 'text-subtle',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className={cn('transition-transform duration-200', isActive && 'scale-110')}>{icon}</span>
          <span className="truncate px-0.5">{label}</span>
        </>
      )}
    </NavLink>
  );
}
