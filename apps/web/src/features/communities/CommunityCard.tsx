import { Link } from 'react-router-dom';
import { Lock, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, Button, Card } from '@/design-system';
import type { Community } from '@/types/api';

export function CommunityAvatar({
  community,
  size = 'md',
  className,
}: {
  community: Pick<Community, 'name' | 'avatarUrl' | 'accentColor'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = { sm: 'h-8 w-8 text-sm rounded-control', md: 'h-12 w-12 text-lg rounded-panel', lg: 'h-20 w-20 text-3xl rounded-sheet' };

  if (community.avatarUrl) {
    return (
      <img
        src={community.avatarUrl}
        alt=""
        loading="lazy"
        className={cn('object-cover', sizes[size], className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        // A cor da comunidade e sempre um tom escuro: o creme fixo garante
        // contraste, e o anel da silhueta mesmo quando o tom quase se funde
        // com o fundo escuro.
        'flex shrink-0 items-center justify-center font-display font-semibold text-on-brand ring-1 ring-inset ring-white/15',
        sizes[size],
        className,
      )}
      style={{ background: community.accentColor ?? 'rgb(var(--rb-burgundy))' }}
    >
      {community.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function PrivacyBadge({ privacy }: { privacy: Community['privacy'] }) {
  if (privacy === 'PUBLIC') return null;
  return (
    <Badge tone="outline" icon={privacy === 'PRIVATE' ? <Lock className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}>
      {privacy === 'PRIVATE' ? 'Privada' : 'Por aprovacao'}
    </Badge>
  );
}

export interface CommunityCardProps {
  community: Community;
  onJoin?: (slug: string) => void;
  joining?: boolean;
  compact?: boolean;
}

export function CommunityCard({ community, onJoin, joining, compact }: CommunityCardProps) {
  const membership = community.viewerMembership;
  const isMember = membership?.status === 'ACTIVE';
  const isPending = membership?.status === 'PENDING';

  return (
    <Card padded={false} interactive className="flex h-full flex-col overflow-hidden">
      <div
        className="h-16 w-full"
        aria-hidden
        style={{
          background: community.coverUrl
            ? `url(${community.coverUrl}) center/cover`
            : `linear-gradient(135deg, ${community.accentColor ?? '#7B2E3A'}, ${community.accentColor ?? '#7B2E3A'}22)`,
        }}
      />

      <div className="flex flex-1 flex-col p-4 pt-0">
        <div className="-mt-6 mb-3 flex items-end justify-between gap-3">
          <CommunityAvatar community={community} className="ring-4 ring-[rgb(var(--rb-surface))]" />
          <PrivacyBadge privacy={community.privacy} />
        </div>

        <Link to={`/c/${community.slug}`} className="group">
          <h3 className="font-display text-base font-semibold text-ink group-hover:text-burgundy">
            {community.name}
          </h3>
          {community.tagline && <p className="mt-0.5 text-sm text-muted">{community.tagline}</p>}
        </Link>

        {!compact && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted text-pretty">{community.description}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-subtle">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {community.membersCount} {community.membersCount === 1 ? 'membro' : 'membros'}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            {community.postsCount} {community.postsCount === 1 ? 'discussao' : 'discussoes'}
          </span>
        </div>

        {community.reasons && community.reasons.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {community.reasons.slice(0, 2).map((reason) => (
              <Badge key={reason} tone="gold">
                {reason}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4">
          {isMember ? (
            <Button variant="secondary" size="sm" fullWidth onClick={() => undefined} disabled>
              Participando
            </Button>
          ) : isPending ? (
            <Button variant="outline" size="sm" fullWidth disabled>
              Solicitacao enviada
            </Button>
          ) : onJoin ? (
            <Button size="sm" fullWidth loading={joining} onClick={() => onJoin(community.slug)}>
              {community.privacy === 'PUBLIC' ? 'Entrar na comunidade' : 'Pedir para entrar'}
            </Button>
          ) : (
            <Link
              to={`/c/${community.slug}`}
              className="flex h-9 w-full items-center justify-center rounded-pill border border-line text-sm font-medium text-ink transition-colors hover:bg-raised"
            >
              Ver comunidade
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
