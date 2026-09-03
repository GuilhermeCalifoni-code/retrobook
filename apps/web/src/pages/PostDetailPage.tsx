import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CornerDownRight, Flag, Heart, Lock, MessageCircle, MoreHorizontal, Trash2, Users } from 'lucide-react';
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
  useReport,
  useToggleCommentReaction,
} from '@/features/posts/use-posts';
import { formatRelative } from '@/lib/format';
import type { Comment } from '@/types/api';

/**
 * Profundidade visual maxima da conversa.
 *
 * A arvore no banco nao tem limite, e nao deve ter: quem respondeu a quem e
 * uma relacao real que vale preservar. O que nao funciona e traduzir cada
 * nivel em mais um recuo -- em 375px o quarto nivel sobra da tela e o texto
 * vira uma coluna de duas palavras.
 *
 * A partir daqui as respostas param de recuar e passam a dizer a quem
 * respondem com "Respondendo a @fulano". A relacao continua legivel; a escada
 * acaba.
 */
const MAX_VISUAL_DEPTH = 2;

export function PostDetailPage() {
  const { id = '' } = useParams();
  const { data, isLoading, isError, refetch } = usePost(id);
  const { user } = useSession();
  const createComment = useCreateComment(id);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
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

  const { post, comments, participantsCount } = data;
  const totalComments = countComments(comments);

  const submit = async () => {
    const content = draft.trim();
    if (content.length === 0) return;
    setError(null);
    try {
      await createComment.mutateAsync({ content });
      setDraft('');
      toast.success('Comentario publicado.');
    } catch (err) {
      // Falhar em silencio aqui e o pior desfecho: a pessoa escreveu, apertou
      // o botao e nao sabe se publicou. O rascunho fica onde esta.
      setError(err instanceof Error ? err.message : 'Nao conseguimos publicar sua resposta.');
    }
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
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
            <MessageCircle className="h-5 w-5 text-muted" aria-hidden />
            {totalComments === 0
              ? 'Nenhuma resposta ainda'
              : `${totalComments} ${totalComments === 1 ? 'resposta' : 'respostas'}`}
          </h2>

          {/* Quantas vozes, nao quantas mensagens: e o que diz se ha conversa. */}
          {participantsCount > 1 && (
            <span className="inline-flex items-center gap-1.5 text-caption text-muted">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {participantsCount} pessoas
            </span>
          )}
        </div>

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

                {error && (
                  <p role="alert" className="mt-2 text-caption text-danger">
                    {error}
                  </p>
                )}

                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={submit}
                    loading={createComment.isPending}
                    disabled={draft.trim().length === 0}
                  >
                    {error ? 'Tentar novamente' : 'Responder'}
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
                <CommentThread comment={comment} postId={id} depth={0} postAuthorId={post.author.id} />
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
 * Um no da conversa.
 *
 * `depth` e a profundidade real na arvore; `parentName` so aparece quando a
 * profundidade passou do limite visual e o recuo deixou de indicar a quem a
 * pessoa respondeu.
 */
function CommentThread({
  comment,
  postId,
  depth,
  postAuthorId,
  parentName,
}: {
  comment: Comment;
  postId: string;
  depth: number;
  postAuthorId: string;
  parentName?: string;
}) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const { user } = useSession();
  const createComment = useCreateComment(postId);
  const react = useToggleCommentReaction(postId);
  const moderation = usePostModeration();
  const report = useReport();
  const toast = useToast();

  const isMine = user?.id === comment.author.id;
  const isPostAuthor = comment.author.id === postAuthorId;
  const spoiler = comment.viewerSpoiler;
  const indented = depth > 0 && depth <= MAX_VISUAL_DEPTH;

  const submitReply = async () => {
    const content = draft.trim();
    if (content.length === 0) return;
    setError(null);
    try {
      await createComment.mutateAsync({ content, parentId: comment.id });
      setDraft('');
      setReplying(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao conseguimos publicar sua resposta.');
    }
  };

  return (
    <div className={cn(indented && 'border-l-2 border-line pl-4 sm:pl-5')}>
      <article className="flex gap-3">
        <Link to={`/u/${comment.author.username}`} className="shrink-0">
          <Avatar name={comment.author.name} src={comment.author.avatarUrl} size={depth > 0 ? 'sm' : 'md'} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to={`/u/${comment.author.username}`} className="text-sm font-medium text-ink hover:text-burgundy">
              {comment.author.name}
            </Link>

            {/* Quem iniciou a conversa e quem esta lendo a propria resposta:
                os dois papeis que mudam como a frase e lida. */}
            {isPostAuthor && (
              <span className="rounded-pill bg-burgundy/10 px-1.5 py-0.5 text-label font-medium text-burgundy">
                autor
              </span>
            )}
            {isMine && !isPostAuthor && (
              <span className="rounded-pill bg-raised px-1.5 py-0.5 text-label font-medium text-muted">voce</span>
            )}

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
                        label: reported ? 'Denuncia enviada' : 'Denunciar',
                        icon: <Flag className="h-4 w-4" />,
                        disabled: reported,
                        onSelect: () => {
                          report.mutate(
                            { targetType: 'COMMENT', targetId: comment.id, reason: 'other' },
                            {
                              onSuccess: () => {
                                setReported(true);
                                toast.success('Obrigado. Nossa moderacao vai analisar.');
                              },
                              onError: () => toast.error('Nao conseguimos enviar a denuncia.'),
                            },
                          );
                        },
                      },
                    ]
              }
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={`Acoes do comentario de ${comment.author.name}`}
                  className="ml-auto rounded-full p-1 text-subtle transition-colors hover:bg-raised hover:text-ink"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            />
          </div>

          {/* Passou do recuo maximo: o vinculo volta como texto. */}
          {parentName && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-label text-subtle">
              <CornerDownRight className="h-3 w-3" aria-hidden />
              Respondendo a {parentName}
            </p>
          )}

          <Spoiler
            active={spoiler.hidden}
            scope={spoiler.label}
            explanation={spoiler.explanation}
            className="mt-1"
          >
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
                aria-label={comment.viewerHasLiked ? 'Remover curtida' : 'Curtir comentario'}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-pill px-2 py-1 text-xs font-medium transition-colors',
                  comment.viewerHasLiked ? 'text-burgundy' : 'text-subtle hover:bg-raised hover:text-ink',
                )}
              >
                <Heart className={cn('h-3.5 w-3.5', comment.viewerHasLiked && 'fill-burgundy animate-pop')} aria-hidden />
                {comment.likesCount > 0 && <span className="tabular-nums">{comment.likesCount}</span>}
              </button>

              <button
                type="button"
                onClick={() => setReplying((v) => !v)}
                aria-expanded={replying}
                className="rounded-pill px-2 py-1 text-xs font-medium text-subtle transition-colors hover:bg-raised hover:text-ink"
              >
                Responder
              </button>
            </div>
          )}

          {replying && (
            <div className="mt-3">
              {/* Onde a resposta vai parar, dito antes de escrever. */}
              <p className="mb-1.5 inline-flex items-center gap-1 text-label text-muted">
                <CornerDownRight className="h-3 w-3" aria-hidden />
                Respondendo a <span className="font-medium text-ink">@{comment.author.username}</span>
              </p>

              <Textarea
                aria-label={`Responder a ${comment.author.name}`}
                placeholder={`Responder a ${comment.author.name.split(' ')[0]}...`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[4rem]"
              />

              {error && (
                <p role="alert" className="mt-1.5 text-caption text-danger">
                  {error}
                </p>
              )}

              <div className="mt-2 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setReplying(false); setError(null); }}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={submitReply} loading={createComment.isPending} disabled={!draft.trim()}>
                  {error ? 'Tentar novamente' : 'Responder'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </article>

      {comment.replies.length > 0 && (
        <ol
          className={cn(
            'mt-4 space-y-4',
            // Passado o limite, as respostas seguem na mesma coluna.
            depth < MAX_VISUAL_DEPTH ? 'pl-8 sm:pl-11' : 'pl-0',
          )}
        >
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <CommentThread
                comment={reply}
                postId={postId}
                depth={depth + 1}
                postAuthorId={postAuthorId}
                parentName={depth + 1 > MAX_VISUAL_DEPTH ? `@${comment.author.username}` : undefined}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
