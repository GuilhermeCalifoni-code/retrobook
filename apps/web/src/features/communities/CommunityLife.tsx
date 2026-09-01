import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, MessageCircle, Pin, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, AvatarStack, Badge, BookCover, Card, CompatibilityBadge, Progress } from '@/design-system';
import { formatRelative } from '@/lib/format';
import type { ActivityItem, CommunityFeaturedBook, FeaturedDiscussion, ActiveMember } from '@/types/api';

/**
 * As pecas que fazem a comunidade parecer habitada (secoes 6 a 10).
 *
 * O principio que guia todas: **uma conversa boa vale mais que vinte metricas**
 * (secao 56). Por isso nenhuma delas mostra numero sozinho — todo dado vem
 * amarrado a uma pessoa, uma conversa ou um livro em que dá para clicar.
 */

/** Discussao em destaque (secao 6): a porta de entrada da conversa. */
export function FeaturedDiscussionCard({ featured }: { featured: FeaturedDiscussion }) {
  const { post, source } = featured;

  return (
    <Card
      padded={false}
      interactive
      className="overflow-hidden border-burgundy/25 bg-gradient-to-br from-burgundy/[0.06] to-transparent"
    >
      <Link to={`/post/${post.id}`} className="block p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="burgundy" icon={source === 'pinned' ? <Pin className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}>
            {source === 'pinned' ? 'Fixado pela moderacao' : 'Em destaque'}
          </Badge>
          {post.book && <Badge tone="outline">{post.book.title}</Badge>}
        </div>

        <h3 className="font-display text-xl font-semibold leading-snug text-ink text-pretty sm:text-2xl">
          {post.title ?? post.content.slice(0, 80)}
        </h3>

        {post.title && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted text-pretty">{post.content}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-2">
            <Avatar name={post.author.name} src={post.author.avatarUrl} size="sm" />
            <span className="text-sm text-muted">{post.author.name}</span>
          </span>

          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <MessageCircle className="h-4 w-4 text-subtle" aria-hidden />
            {post.commentsCount} {post.commentsCount === 1 ? 'resposta' : 'respostas'}
          </span>

          {'participantsCount' in post && (post as { participantsCount?: number }).participantsCount ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Users className="h-4 w-4 text-subtle" aria-hidden />
              {(post as { participantsCount: number }).participantsCount} pessoas
            </span>
          ) : null}

          <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-burgundy">
            Participar
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </Link>
    </Card>
  );
}

/** Acontecendo agora (secao 7): sinais de que ha gente do outro lado. */
export function RecentActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-ink">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        Acontecendo agora
      </h2>

      <ul className="space-y-3">
        {items.map((item, index) => {
          const body = (
            <>
              {item.actors.length > 0 && (
                <AvatarStack people={item.actors} max={3} size="xs" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-snug text-muted text-pretty">{item.text}</span>
                <time className="mt-0.5 block text-xs text-subtle">{formatRelative(item.at)}</time>
              </span>
            </>
          );

          return (
            <li key={`${item.kind}-${index}`}>
              {item.href ? (
                <Link to={item.href} className="flex items-start gap-2.5 rounded-control p-1 transition-colors hover:bg-raised">
                  {body}
                </Link>
              ) : (
                <div className="flex items-start gap-2.5 p-1">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Pessoas que movimentam a comunidade (secao 9). */
export function ActiveMembersList({ members }: { members: ActiveMember[] }) {
  if (members.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-1 font-display text-base font-semibold text-ink">Quem movimenta este lugar</h2>
      <p className="mb-3 text-xs text-muted">Pelas conversas dos ultimos 30 dias.</p>

      <div className="space-y-2.5">
        {members.map((member) => (
          <Link
            key={member.id}
            to={`/u/${member.username}`}
            className="flex items-center gap-2.5 rounded-control p-1.5 transition-colors hover:bg-raised"
          >
            <Avatar name={member.name} src={member.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{member.name}</span>
              <span className="block text-xs text-muted">
                {member.postsCount > 0 && (
                  <>
                    {member.postsCount} {member.postsCount === 1 ? 'discussao' : 'discussoes'}
                  </>
                )}
                {member.postsCount > 0 && member.commentsCount > 0 && ' · '}
                {member.commentsCount > 0 && (
                  <>
                    {member.commentsCount} {member.commentsCount === 1 ? 'resposta' : 'respostas'}
                  </>
                )}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

/** Livro em destaque (secao 10), com o progresso coletivo da comunidade. */
export function FeaturedBookCard({ book }: { book: CommunityFeaturedBook }) {
  return (
    <Card>
      <h2 className="mb-3 font-display text-base font-semibold text-ink">Lendo por aqui</h2>

      <Link to={`/livro/${book.slug}`} className="group flex gap-3">
        <div className="w-16 shrink-0">
          <BookCover title={book.title} author={book.author ?? undefined} src={book.coverUrl} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-ink group-hover:text-burgundy">
            {book.title}
          </p>
          {book.author && <p className="mt-0.5 truncate text-xs text-muted">{book.author}</p>}

          {book.readingCount > 0 ? (
            <div className="mt-2.5">
              <p className="text-xs text-muted">
                {book.readingCount} {book.readingCount === 1 ? 'pessoa esta lendo' : 'pessoas estao lendo'}
              </p>
              {/* Progresso coletivo: onde a comunidade esta, em media. */}
              <div className="mt-1.5 space-y-1">
                <Progress value={book.collectiveProgress} tone="gold" />
                <p className="font-mono text-label text-subtle">
                  a comunidade esta em {book.collectiveProgress}%
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-subtle">Ninguem esta lendo agora.</p>
          )}

          {book.discussionsCount > 0 && (
            <p className="mt-2 text-xs text-burgundy">
              {book.discussionsCount} {book.discussionsCount === 1 ? 'discussao' : 'discussoes'} sobre ele
            </p>
          )}
        </div>
      </Link>
    </Card>
  );
}

/** "Voce pertence a este lugar" (secao 30). */
export function BelongingCard({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;

  return (
    <div className="rounded-panel border border-gold/30 bg-gold/[0.06] p-3.5">
      <p className="text-sm font-medium text-ink">Voce tem tudo a ver com este lugar</p>
      <ul className="mt-1.5 space-y-1">
        {reasons.map((reason) => (
          <li key={reason} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-1 w-1 shrink-0 rounded-full bg-gold" aria-hidden />
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
