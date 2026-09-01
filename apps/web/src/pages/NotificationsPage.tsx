import { Link } from 'react-router-dom';
import {
  Award,
  Bell,
  BookOpen,
  Heart,
  MessageCircle,
  MessageSquare,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, Button, Card, EmptyState, ErrorState, SkeletonCard } from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { useMarkNotificationsRead, useNotifications } from '@/features/discovery/use-discovery';
import { formatRelative } from '@/lib/format';
import type { NotificationType } from '@/types/api';

const ICONS: Record<NotificationType, React.ReactNode> = {
  FOLLOW: <UserPlus className="h-4 w-4" />,
  COMMENT: <MessageCircle className="h-4 w-4" />,
  REPLY: <MessageCircle className="h-4 w-4" />,
  REACTION: <Heart className="h-4 w-4" />,
  COMMUNITY_POST: <Users className="h-4 w-4" />,
  COMMUNITY_JOIN_REQUEST: <UserPlus className="h-4 w-4" />,
  COMMUNITY_JOIN_APPROVED: <Users className="h-4 w-4" />,
  BOOK_MATCH: <BookOpen className="h-4 w-4" />,
  COMMUNITY_MATCH: <Sparkles className="h-4 w-4" />,
  ACHIEVEMENT: <Award className="h-4 w-4" />,
  MESSAGE: <MessageSquare className="h-4 w-4" />,
  SYSTEM: <Bell className="h-4 w-4" />,
};

export function NotificationsPage() {
  const { data, isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const unread = data?.items.filter((n) => !n.readAt).length ?? 0;

  return (
    <PageShell width="narrow">
      <Seo title="Notificacoes" noIndex />

      <PageHeader
        title="Notificacoes"
        description="Respostas, novas conexoes e o que acontece nas suas comunidades."
        action={
          unread > 0 && (
            <Button variant="outline" size="sm" loading={markRead.isPending} onClick={() => markRead.mutate(undefined)}>
              Marcar todas como lidas
            </Button>
          )
        }
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {isError && <ErrorState title="Nao conseguimos carregar suas notificacoes." onRetry={() => void refetch()} />}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={<Bell className="h-5 w-5" />}
          title="Nada por aqui ainda."
          description="Quando alguem responder voce, seguir seu perfil ou postar em uma comunidade sua, avisamos."
        />
      )}

      <Card padded={false} className="divide-y divide-line overflow-hidden">
        {data?.items.map((notification) => {
          const content = (
            <div
              className={cn(
                'flex items-start gap-3 px-4 py-3.5 transition-colors sm:px-5',
                !notification.readAt && 'bg-burgundy/[0.045]',
              )}
            >
              {notification.actor ? (
                <Avatar name={notification.actor.name} src={notification.actor.avatarUrl} size="md" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/12 text-gold">
                  {ICONS[notification.type]}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug text-ink text-pretty">{notification.title}</p>
                {notification.body && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted text-pretty">{notification.body}</p>
                )}
                <time className="mt-1 block text-xs text-subtle">{formatRelative(notification.createdAt)}</time>
              </div>

              {!notification.readAt && (
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-burgundy" aria-label="Nao lida" />
              )}
            </div>
          );

          return notification.href ? (
            <Link
              key={notification.id}
              to={notification.href}
              onClick={() => !notification.readAt && markRead.mutate([notification.id])}
              className="block hover:bg-raised/60"
            >
              {content}
            </Link>
          ) : (
            <div key={notification.id}>{content}</div>
          );
        })}
      </Card>
    </PageShell>
  );
}
