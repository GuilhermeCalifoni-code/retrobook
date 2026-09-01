import type { ReactNode } from 'react';
import { Bell, BookMarked, Compass, Home, MessageSquare, Orbit, User, Users } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Aparece na navegacao inferior do mobile (secao 37). */
  primary?: boolean;
  badgeKey?: 'notifications';
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/inicio', label: 'Inicio', icon: <Home className="h-5 w-5" />, primary: true },
  { to: '/explorar', label: 'Explorar', icon: <Compass className="h-5 w-5" />, primary: true },
  { to: '/comunidades', label: 'Comunidades', icon: <Users className="h-5 w-5" />, primary: true },
  { to: '/biblioteca', label: 'Biblioteca', icon: <BookMarked className="h-5 w-5" />, primary: true },
  { to: '/universo', label: 'Seu Universo', icon: <Orbit className="h-5 w-5" /> },
  { to: '/mensagens', label: 'Mensagens', icon: <MessageSquare className="h-5 w-5" /> },
  { to: '/notificacoes', label: 'Notificacoes', icon: <Bell className="h-5 w-5" />, badgeKey: 'notifications' },
  { to: '/perfil', label: 'Perfil', icon: <User className="h-5 w-5" />, primary: true },
];

export const PRIMARY_NAV = NAV_ITEMS.filter((item) => item.primary);
