import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Lock, MessageCircle, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Menu,
  Skeleton,
  SkeletonText,
  Spoiler,
  Textarea,
  useToast,
} from '@/design-system';
import { PageShell } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { PostCard } from '@/features/posts/PostCard';
import { useSession } from '@/features/auth/session-context';
import {
  useCreateComment,
  usePost,
  usePostModeration,
  useToggleCommentReaction,
} from '@/features/posts/use-posts';
import { formatRelative } from '@/lib/format';
import type { Comment } from '@/types/api';

export function PostDetailPage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError, refetch } = usePost(id);
  const { user } = useSession();
  const createComment = useCreateComment(id);
  const [draft, setDraft] = useState('');
  const toast = useToast();

  if (isLoading) {
    return (
      <PageShell width="narrow">
        <Skeleton className="mb-4 h-8 w-2/3" />
        <SkeletonText lines={6} />
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell width="narrow">
        <ErrorState title="Discussao nao encontrada." onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  const { post, comments } = data;
  const totalComments = countComments(comments);

  const submit = async () => {
    if (draft.trim().length === 0) return;
    await createComment.mutateAsync({ content: draft.trim() });
    setDraft('');
    toast.success('Comentario publicado.');
  };

  return (
    <PageShell width="narrow">
      <Seo
        title={post.title ?? 'Discussao'}
        description={post.content.slice(0, 160)}
        type="article"
      />

      <Link
        to={post.community ? `/c/${post.community.slug}` : '/feed'}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {post.community ? post.community.name : 'Voltar ao feed'}
      </Link>

      <PostCard post={post} expanded />

      {/* ------------------------------------------------------- comentarios */}
      <section className="mt-8">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-ink">
          <MessageCircle className="h-5 w-5 text-muted" aria-hidden />
          {totalComments === 0 ? 'Nenhuma resposta ainda' : `${totalComments} ${totalComments === 1 ? 'resposta' : 'respostas'}`}
        </h2>

        {post.isLocked ? (
          <Card className="flex items-center gap-3 border-dashed">
            <Lock className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <p className="text-sm text-muted">
              Esta discussao foi encerrada pela moderacao. Nao e possivel responder.
            </p>
          </Card>
        ) : (
          <Card className="mb-6">
            <div className="flex gap-3">
              {user && <Avatar name={user.profile.name} src={user.profile.avatarUrl} size="md" />}
              <div className="min-w-0 flex-1">
                <Textarea
                  aria-label="Escrever resposta"
                  placeholder="Escreva sua resposta..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="min-h-[5rem]"
                  counterMax={4000}
                />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" onClick={submit} loading={createComment.isPending} disabled={draft.trim().length === 0}>
                    Responder
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {comments.length === 0 ? (
          <EmptyState
            compact
            icon={<MessageCircle className="h-5 w-5" />}
            title="Seja a primeira pessoa a responder."
            description="Uma boa pergunta costuma abrir a conversa."
          />
        ) : (
          <ol className="space-y-5">
            {comments.map((comment) => (
              <li key={comment.id}>
                <CommentThread comment={comment} postId={id} depth={0} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </PageShell>
  );
}

function countComments(comments: Comment[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}

/**
 * Hierarquia visual entre comentario e resposta: um filete a esquerda e recuo.
 * Limitamos a profundidade visual a 2 niveis para a conversa nao virar escada.
 */
function CommentThread({ comment, postId, depth }: { comment: Comment; postId: string; depth: number }) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  const { user } = useSession();
  const createComment = useCreateComment(postId);
  const react = useToggleCommentReaction(postId);
  const moderation = usePostModeration();

  const isMine = user?.id === comment.author.id;

  const submitReply = async () => {
    if (draft.trim().length === 0) return;
    await createComment.mutateAsync({ content: draft.trim(), parentId: comment.id });
    setDraft('');
    setReplying(false);
  };

  return (
    <div className={cn(depth > 0 && 'border-l-2 border-line pl-4 sm:pl-5')}>
      <article className="flex gap-3">
        <Link to={`/u/${comment.author.username}`} className="shrink-0">
          <Avatar name={comment.author.name} src={comment.author.avatarUrl} size={depth > 0 ? 'sm' : 'md'} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to={`/u/${comment.author.username}`} className="text-sm font-medium text-ink hover:text-burgundy">
              {comment.author.name}
            </Link>
            <time className="text-xs text-subtle">{formatRelative(comment.createdAt)}</time>

            <Menu
              align="right"
              items={
                isMine
                  ? [
                      {
                        label: 'Remover comentario',
                        icon: <Trash2 className="h-4 w-4" />,
                        tone: 'danger' as const,
                        onSelect: () => moderation.removeComment.mutate(comment.id),
                      },
                    ]
                  : [
                      {
                        label: 'Denunciar',
                        icon: <MoreHorizontal className="h-4 w-4" />,
                        onSelect: () => undefined,
                      },
                    ]
              }
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Acoes do comentario"
                  className="ml-auto rounded-full p-1 text-subtle transition-colors hover:bg-raised hover:text-ink"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            />
          </div>

          <Spoiler active={comment.containsSpoiler} className="mt-1">
            <p
              className={cn(
                'whitespace-pre-line text-sm leading-relaxed text-pretty',
                comment.isRemoved ? 'italic text-subtle' : 'text-muted',
              )}
            >
              {comment.content}
            </p>
          </Spoiler>

          {!comment.isRemoved && (
            <div className="mt-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => react.mutate(comment.id)}
                aria-pressed={comment.viewerHasLiked}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-xs font-medium transition-colors',
                  comment.viewerHasLiked ? 'text-burgundy' : 'text-subtle hover:bg-raised hover:text-ink',
                )}
              >
                <Heart className={cn('h-3.5 w-3.5', comment.viewerHasLiked && 'fill-burgundy animate-pop')} aria-hidden />
                {comment.likesCount > 0 && <span className="tabular-nums">{comment.likesCount}</span>}
              </button>

              {depth < 2 && (
                <button
                  type="button"
                  onClick={() => setReplying((v) => !v)}
                  className="rounded-pill px-2 py-1 text-xs font-medium text-subtle transition-colors hover:bg-raised hover:text-ink"
                >
                  Responder
                </button>
              )}
            </div>
          )}

          {replying && (
            <div className="mt-3">
              <Textarea
                aria-label={`Responder a ${comment.author.name}`}
                placeholder={`Responder a ${comment.author.name.split(' ')[0]}...`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[4rem]"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={submitReply} loading={createComment.isPending} disabled={!draft.trim()}>
                  Responder
                </Button>
              </div>
            </div>
          )}
        </div>
      </article>

      {comment.replies.length > 0 && (
        <ol className="mt-4 space-y-4 pl-8 sm:pl-11">
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <CommentThread comment={reply} postId={postId} depth={depth + 1} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
