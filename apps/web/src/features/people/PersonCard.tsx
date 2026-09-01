import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Avatar, Badge, Button, Card, CompatibilityBadge } from '@/design-system';
import { useToggleFollow } from './use-people';
import type { PublicUser, SuggestedPerson } from '@/types/api';

/**
 * Card de pessoa. O ponto central do produto aparece aqui: nunca mostramos
 * apenas "alguem", e sim *por que* essa pessoa apareceu para voce.
 */
export function PersonCard({ person, compact }: { person: SuggestedPerson; compact?: boolean }) {
  const toggleFollow = useToggleFollow();

  return (
    <Card className={cn('flex h-full flex-col', compact && 'p-4')} interactive>
      <div className="flex items-start gap-3">
        <Link to={`/u/${person.username}`}>
          <Avatar name={person.name} src={person.avatarUrl} size={compact ? 'md' : 'lg'} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/u/${person.username}`} className="block">
            <p className="truncate font-medium text-ink hover:text-burgundy">{person.name}</p>
            <p className="truncate text-xs text-muted">@{person.username}</p>
          </Link>
          {person.compatibility > 0 && <CompatibilityBadge score={person.compatibility} className="mt-1.5" />}
        </div>
      </div>

      {person.bio && !compact && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted text-pretty">{person.bio}</p>
      )}

      {person.reasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {person.reasons.slice(0, 3).map((reason) => (
            <li key={reason.kind} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1 w-1 shrink-0 rounded-full bg-gold" aria-hidden />
              {reason.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4">
        <Button
          variant={person.viewerIsFollowing ? 'secondary' : 'primary'}
          size="sm"
          fullWidth
          loading={toggleFollow.isPending && toggleFollow.variables?.username === person.username}
          onClick={() =>
            toggleFollow.mutate({ username: person.username, following: person.viewerIsFollowing })
          }
        >
          {person.viewerIsFollowing ? 'Seguindo' : 'Seguir'}
        </Button>
      </div>
    </Card>
  );
}

/** Linha compacta de pessoa, para listas de seguidores e membros. */
export function PersonRow({
  person,
  trailing,
  subtitle,
}: {
  person: PublicUser;
  trailing?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Link to={`/u/${person.username}`} className="shrink-0">
        <Avatar name={person.name} src={person.avatarUrl} size="md" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/u/${person.username}`} className="block truncate text-sm font-medium text-ink hover:text-burgundy">
          {person.name}
        </Link>
        <p className="truncate text-xs text-muted">{subtitle ?? `@${person.username}`}</p>
      </div>
      {trailing}
    </div>
  );
}

export function RoleBadge({ role }: { role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER' }) {
  if (role === 'MEMBER') return null;
  const labels = { OWNER: 'Criador', ADMIN: 'Admin', MODERATOR: 'Moderacao', MEMBER: '' };
  return (
    <Badge tone={role === 'OWNER' ? 'burgundy' : 'gold'}>{labels[role]}</Badge>
  );
}
