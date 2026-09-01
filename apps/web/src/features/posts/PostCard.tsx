import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Bookmark,
  Flag,
  Heart,
  HelpCircle,
  Lightbulb,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Quote,
  Share2,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Avatar, Badge, BookCover, Menu, Progress, Spoiler, useToast } from '@/design-system';
import { useSession } from '@/features/auth/session-context';
import { formatRelative } from '@/lib/format';
import { usePostModeration, useReport, useToggleSavePost, useTogglePostReaction } from './use-posts';
import type { Post, PostType } from '@/types/api';

/**
 * Cada tipo de conversa tem rotulo, icone e tom proprios — mesma familia
 * visual, leituras diferentes (secao 11).
 */
const TYPE_STYLE: Record<PostType, { label: string; tone: 'neutral' | 'gold' | 'burgundy' | 'success'; icon: ReactNode }> = {
  DISCUSSION: { label: 'Discussao', tone: 'neutral', icon: <MessageCircle className="h-3 w-3" /> },
  THEORY: { label: 'Teoria', tone: 'burgundy', icon: <Lightbulb className="h-3 w-3" /> },
  REVIEW: { label: 'Resenha', tone: 'gold', icon: <Star className="h-3 w-3" /> },
  QUESTION: { label: 'Pergunta', tone: 'neutral', icon: <HelpCircle className="h-3 w-3" /> },
  QUOTE: { label: 'Citacao', tone: 'gold', icon: <Quote className="h-3 w-3" /> },
  RECOMMENDATION: { label: 'Indicacao', tone: 'success', icon: <Sparkles className="h-3 w-3" /> },
  READING_UPDATE: { label: 'Leitura', tone: 'success', icon: <BookOpen className="h-3 w-3" /> },
};

export interface PostCardProps {
  post: Post;
  /** Na pagina da discussao o texto aparece inteiro. */
  expanded?: boolean;
  hideCommunity?: boolean;
}

export function PostCard({ post, expanded, hideCommunity }: PostCardProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useSession();
  const react = useTogglePostReaction();
  const save = useToggleSavePost();
  const moderation = usePostModeration();
  const report = useReport();
  const [reported, setReported] = useState(false);

  // O backend ja comparou o alcance do spoiler com o progresso deste leitor.
  const spoiler = post.viewerSpoiler;

  const share = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: post.title ?? 'RetroBook', url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copiado.');
      }
    } catch {
      /* usuario cancelou o compartilhamento */
    }
  };

  const menuItems = [
    {
      label: post.viewerHasSaved ? 'Remover dos salvos' : 'Salvar discussao',
      icon: <Bookmark className="h-4 w-4" />,
      onSelect: () => save.mutate(post.id),
    },
    { label: 'Compartilhar', icon: <Share2 className="h-4 w-4" />, onSelect: share },
    ...(post.viewerCanModerate
      ? [
          ...(post.community
            ? [
                {
                  label: post.isPinned ? 'Desafixar' : 'Fixar na comunidade',
                  icon: <Pin className="h-4 w-4" />,
                  onSelect: () => moderation.pin.mutate({ postId: post.id, pinned: !post.isPinned }),
                },
              ]
            : []),
          {
            label: post.isLocked ? 'Reabrir discussao' : 'Fechar discussao',
            icon: <Lock className="h-4 w-4" />,
            onSelect: () => moderation.lock.mutate({ postId: post.id, locked: !post.isLocked }),
          },
          {
            label: 'Remover',
            icon: <Trash2 className="h-4 w-4" />,
            tone: 'danger' as const,
            onSelect: () => {
              moderation.remove.mutate({ postId: post.id });
              toast.success('Publicacao removida.');
            },
          },
        ]
      : [
          {
            label: reported ? 'Denuncia enviada' : 'Denunciar',
            icon: <Flag className="h-4 w-4" />,
            disabled: reported,
            onSelect: () => {
              report.mutate(
                { targetType: 'POST', targetId: post.id, reason: 'other' },
                {
                  onSuccess: () => {
                    setReported(true);
                    toast.success('Obrigado. Nossa moderacao vai analisar.');
                  },
                },
              );
            },
          },
        ]),
  ];

  const body = (
    <>
      {post.type === 'READING_UPDATE' && post.progressPercent != null && (
        <div className="my-3 rounded-panel border border-success/25 bg-success/[0.06] px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-ink">
              {post.progressPercent >= 100
                ? 'Terminou a leitura'
                : post.progressChapter
                  ? `Capitulo ${post.progressChapter}`
                  : post.progressPage
                    ? `Pagina ${post.progressPage}`
                    : 'Avancou na leitura'}
            </span>
            <span className="font-mono text-xs tabular-nums text-success">{post.progressPercent}%</span>
          </div>
          <Progress value={post.progressPercent} tone="success" className="mt-2" />
        </div>
      )}

      {post.type === 'QUOTE' && post.quoteText && (
        <figure className="my-3 rounded-panel border-l-[3px] border-gold bg-raised/60 px-4 py-3">
          <Quote className="mb-1.5 h-4 w-4 text-gold" aria-hidden />
          <blockquote className="font-display text-body italic leading-relaxed text-ink">
            {post.quoteText}
          </blockquote>
          {post.book && (
            <figcaption className="mt-2 text-xs text-muted">
              {post.book.title}
              {post.quotePage ? `, p. ${post.quotePage}` : ''}
            </figcaption>
          )}
        </figure>
      )}
      <p
        className={cn(
          'whitespace-pre-line text-body leading-relaxed text-muted text-pretty',
          !expanded && 'line-clamp-5',
        )}
      >
        {post.content}
      </p>
    </>
  );

  return (
    <article
      className={cn(
        'rounded-card border border-line bg-surface p-4 transition-colors sm:p-5',
        post.isPinned && 'border-gold/40 bg-gold/[0.04]',
      )}
    >
      <header className="flex items-start gap-3">
        <Link to={`/u/${post.author.username}`} className="shrink-0">
          <Avatar name={post.author.name} src={post.author.avatarUrl} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
            <Link to={`/u/${post.author.username}`} className="font-medium text-ink hover:text-burgundy">
              {post.author.name}
            </Link>
            {post.community && !hideCommunity && (
              <>
                <span className="text-subtle">em</span>
                <Link
                  to={`/c/${post.community.slug}`}
                  className="font-medium text-burgundy hover:underline"
                  style={post.community.accentColor ? { color: post.community.accentColor } : undefined}
                >
                  {post.community.name}
                </Link>
              </>
            )}
            <span className="text-subtle" aria-hidden>
              -
            </span>
            <time dateTime={post.createdAt} className="text-xs text-subtle">
              {formatRelative(post.createdAt)}
            </time>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone={TYPE_STYLE[post.type].tone} icon={TYPE_STYLE[post.type].icon}>
              {TYPE_STYLE[post.type].label}
            </Badge>
            {post.isPinned && <Badge tone="gold" icon={<Pin className="h-3 w-3" />}>Fixado</Badge>}
            {post.isLocked && <Badge tone="outline" icon={<Lock className="h-3 w-3" />}>Encerrada</Badge>}
            {post.containsSpoiler && (
              <Badge tone="burgundy">{spoiler.label ?? 'Spoiler'}</Badge>
            )}
          </div>
        </div>

        <Menu
          items={menuItems}
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-label="Mais acoes"
              className="-mr-1 rounded-full p-1.5 text-subtle transition-colors hover:bg-raised hover:text-ink"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
          )}
        />
      </header>

      <div className="mt-3">
        {post.title && (
          <Link to={`/post/${post.id}`} className="group">
            <h3 className="font-display text-lg font-semibold leading-snug text-ink group-hover:text-burgundy text-pretty">
              {post.title}
            </h3>
          </Link>
        )}

        <Spoiler
          active={spoiler.hidden}
          scope={spoiler.label ?? post.spoilerScope}
          explanation={spoiler.explanation}
          className="mt-1.5"
        >
          {body}
        </Spoiler>

        {!expanded && post.content.length > 320 && !spoiler.hidden && (
          <Link to={`/post/${post.id}`} className="mt-1 inline-block text-sm font-medium text-burgundy hover:underline">
            Continuar lendo
          </Link>
        )}

        {post.book && (
          <Link
            to={`/livro/${post.book.slug}`}
            className="mt-3 flex items-center gap-3 rounded-panel border border-line bg-raised/40 p-2.5 transition-colors hover:border-subtle"
          >
            <BookCover title={post.book.title} src={post.book.coverUrl} className="h-14 w-10" flat />
            <span className="min-w-0 flex-1">
              <span className="block text-label uppercase tracking-wider text-subtle">Sobre o livro</span>
              <span className="block truncate text-sm font-medium text-ink">{post.book.title}</span>
            </span>
          </Link>
        )}

        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Link key={tag.slug} to={`/explorar?tag=${tag.slug}`}>
                <Badge tone="outline">#{tag.name}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="mt-4 flex items-center gap-1 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => react.mutate(post.id)}
          aria-pressed={post.viewerHasLiked}
          aria-label={post.viewerHasLiked ? 'Remover curtida' : 'Curtir'}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-sm font-medium transition-colors',
            post.viewerHasLiked ? 'text-burgundy' : 'text-muted hover:bg-raised hover:text-ink',
          )}
        >
          <Heart
            className={cn('h-4 w-4', post.viewerHasLiked && 'animate-pop fill-burgundy')}
            aria-hidden
          />
          <span className="tabular-nums">{post.likesCount}</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(`/post/${post.id}`)}
          className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          <span className="tabular-nums">{post.commentsCount}</span>
          <span className="hidden sm:inline">{post.commentsCount === 1 ? 'resposta' : 'respostas'}</span>
        </button>

        <button
          type="button"
          onClick={() => save.mutate(post.id)}
          aria-pressed={post.viewerHasSaved}
          aria-label={post.viewerHasSaved ? 'Remover dos salvos' : 'Salvar'}
          className={cn(
            'ml-auto rounded-pill p-2 transition-colors',
            post.viewerHasSaved ? 'text-gold' : 'text-muted hover:bg-raised hover:text-ink',
          )}
        >
          <Bookmark className={cn('h-4 w-4', post.viewerHasSaved && 'fill-gold')} aria-hidden />
        </button>

        <button
          type="button"
          onClick={share}
          aria-label="Compartilhar"
          className="rounded-pill p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      </footer>
    </article>
  );
}
