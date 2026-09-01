import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Check, MessageCircle, Plus, Star, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Avatar,
  AvatarStack,
  Badge,
  CompatibilityBadge,
  BookCover,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Menu,
  Modal,
  Progress,
  Rating,
  SectionHeader,
  Skeleton,
  SkeletonText,
  Spoiler,
  Textarea,
  useToast,
} from '@/design-system';
import { PageShell } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { BookCard, BookShelf } from '@/features/books/BookCard';
import { CommunityAvatar } from '@/features/communities/CommunityCard';
import { PostCard } from '@/features/posts/PostCard';
import { PostComposer } from '@/features/posts/PostComposer';
import { useAddToLibrary, useBook, useRemoveFromLibrary, useUpdateLibraryEntry, useUpsertReview } from '@/features/books/use-books';
import { useBookPresence } from '@/features/discovery/use-discovery';
import { formatNumber, formatRelative } from '@/lib/format';
import type { ReadingStatus } from '@/types/api';

const STATUS_LABEL: Record<ReadingStatus, string> = {
  WANT_TO_READ: 'Quero ler',
  READING: 'Lendo',
  PAUSED: 'Pausado',
  ABANDONED: 'Abandonei',
  READ: 'Lido',
};

export function BookDetailPage() {
  const { slug = '' } = useParams();
  const { data: book, isLoading, isError, refetch } = useBook(slug);
  const presence = useBookPresence(slug);
  const toast = useToast();

  const addToLibrary = useAddToLibrary();
  const updateEntry = useUpdateLibraryEntry();
  const removeEntry = useRemoveFromLibrary();
  const upsertReview = useUpsertReview();

  const [composerOpen, setComposerOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewSpoiler, setReviewSpoiler] = useState(false);

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex gap-8">
          <Skeleton className="h-72 w-48 rounded-control" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <SkeletonText lines={5} />
          </div>
        </div>
      </PageShell>
    );
  }

  if (isError || !book) {
    return (
      <PageShell>
        <ErrorState title="Nao encontramos esse livro." onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  const entry = book.viewerEntry;
  const authorNames = book.authors.map((a) => a.name).join(', ');

  const setStatus = async (status: ReadingStatus) => {
    if (entry) await updateEntry.mutateAsync({ bookId: book.id, status });
    else await addToLibrary.mutateAsync({ bookId: book.id, status });
    toast.success(`Marcado como "${STATUS_LABEL[status]}".`);
  };

  const submitReview = async () => {
    if (reviewRating === 0 || reviewText.trim().length < 10) return;
    await upsertReview.mutateAsync({
      bookId: book.id,
      rating: reviewRating,
      content: reviewText.trim(),
      containsSpoiler: reviewSpoiler,
    });
    setReviewOpen(false);
    setReviewText('');
    toast.success('Resenha publicada.');
  };

  return (
    <PageShell width="wide">
      <Seo
        title={`${book.title}${authorNames ? `, de ${authorNames}` : ''}`}
        description={book.description ?? `Veja quem esta lendo ${book.title} no RetroBook.`}
        type="article"
        image={book.coverUrl ?? undefined}
      />

      {/* ------------------------------------------------------------- header */}
      <section className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="mx-auto w-40 lg:mx-0 lg:w-full">
          <BookCover title={book.title} author={book.authors[0]?.name} src={book.coverUrl} />

          <div className="mt-4 space-y-2">
            {entry ? (
              <Menu
                align="left"
                items={(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((status) => ({
                  label: STATUS_LABEL[status],
                  icon: entry.status === status ? <Check className="h-4 w-4" /> : undefined,
                  onSelect: () => void setStatus(status),
                }))}
                trigger={({ toggle }) => (
                  <Button variant="secondary" fullWidth onClick={toggle}>
                    {STATUS_LABEL[entry.status]}
                  </Button>
                )}
              />
            ) : (
              <Menu
                align="left"
                items={(Object.keys(STATUS_LABEL) as ReadingStatus[]).map((status) => ({
                  label: STATUS_LABEL[status],
                  onSelect: () => void setStatus(status),
                }))}
                trigger={({ toggle }) => (
                  <Button fullWidth leftIcon={<Plus className="h-4 w-4" />} onClick={toggle}>
                    Adicionar a biblioteca
                  </Button>
                )}
              />
            )}

            <Button variant="outline" fullWidth leftIcon={<MessageCircle className="h-4 w-4" />} onClick={() => setComposerOpen(true)}>
              Iniciar discussao
            </Button>

            {entry && (
              <>
                <Button
                  variant="ghost"
                  fullWidth
                  leftIcon={<Star className="h-4 w-4" />}
                  onClick={() => {
                    setReviewRating(entry.rating ?? 0);
                    setReviewOpen(true);
                  }}
                >
                  {entry.rating ? 'Editar resenha' : 'Escrever resenha'}
                </Button>

                {entry.status === 'READING' && (
                  <div className="rounded-panel border border-line bg-raised/50 p-3">
                    <Progress value={entry.progress} size="md" />
                    <p className="mt-1.5 text-center font-mono text-xs text-muted">
                      {book.pageCount ? `pag. ${entry.currentPage} de ${book.pageCount}` : `${entry.progress}%`}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    await removeEntry.mutateAsync(book.id);
                    toast.success('Removido da sua biblioteca.');
                  }}
                  className="w-full py-1 text-center text-xs text-subtle transition-colors hover:text-danger"
                >
                  Remover da biblioteca
                </button>
              </>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl text-balance">
            {book.title}
          </h1>
          {book.subtitle && <p className="mt-1 font-display text-lg italic text-muted">{book.subtitle}</p>}

          <p className="mt-2 text-muted">
            {book.authors.map((author, index) => (
              <span key={author.id}>
                {index > 0 && ', '}
                <span className="font-medium text-ink">{author.name}</span>
              </span>
            ))}
            {book.publishedYear && <span className="text-subtle"> - {book.publishedYear}</span>}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Rating value={book.ratingsAvg} size="md" />
              <span className="font-mono text-sm text-muted">
                {book.ratingsAvg > 0 ? book.ratingsAvg.toFixed(1) : '—'}
                <span className="text-subtle"> ({formatNumber(book.ratingsCount)})</span>
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Users className="h-4 w-4 text-subtle" aria-hidden />
              {formatNumber(book.readersCount)} {book.readersCount === 1 ? 'leitor' : 'leitores'}
            </span>

            {book.readingCount > 0 && (
              <Badge tone="burgundy" size="md">
                {book.readingCount} {book.readingCount === 1 ? 'pessoa lendo agora' : 'pessoas lendo agora'}
              </Badge>
            )}

            {book.pageCount && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                <BookOpen className="h-4 w-4 text-subtle" aria-hidden />
                {book.pageCount} paginas
              </span>
            )}
          </div>

          {book.genres.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {book.genres.map((genre) => (
                <Link key={genre.id} to={`/explorar?genero=${genre.slug}`}>
                  <Badge tone="outline" size="md">
                    {genre.name}
                  </Badge>
                </Link>
              ))}
            </div>
          )}

          {book.description && (
            <p className="mt-5 max-w-3xl whitespace-pre-line leading-relaxed text-muted text-pretty">
              {book.description}
            </p>
          )}

          {book.ratingsCount > 0 && (
            <div className="mt-6 max-w-xs space-y-1.5">
              {[...book.ratingDistribution].reverse().map((row) => {
                const percent = book.ratingsCount ? (row.count / book.ratingsCount) * 100 : 0;
                return (
                  <div key={row.star} className="flex items-center gap-2">
                    <span className="w-3 font-mono text-xs text-subtle">{row.star}</span>
                    <Star className="h-3 w-3 fill-gold text-gold" aria-hidden />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-line/60">
                      <div className="h-full rounded-pill bg-gold" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-6 text-right font-mono text-xs text-subtle">{row.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- leitores */}
      <section id="leitores" className="mt-12 scroll-mt-24">
        <SectionHeader
          title="Leitores agora"
          subtitle="Ordenados por afinidade com voce — quem tem mais chance de render conversa aparece primeiro."
        />

        {presence.data && presence.data.readingCount > 0 && (
          <Card className="mb-4 flex flex-wrap items-center gap-4 border-burgundy/25 bg-burgundy/[0.04]">
            <AvatarStack people={presence.data.readers} max={5} size="md" />
            <p className="font-display text-lg text-ink text-pretty">
              {presence.data.readingCount}{' '}
              {presence.data.readingCount === 1 ? 'pessoa esta lendo' : 'pessoas estao lendo'} agora
              {presence.data.finishedCount > 0 && (
                <span className="text-muted"> — {presence.data.finishedCount} ja terminaram</span>
              )}
            </p>
          </Card>
        )}

        {presence.isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-panel" />
            ))}
          </div>
        )}

        {presence.data && presence.data.readers.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {presence.data.readers.map((reader) => (
              <Link
                key={reader.id}
                to={`/u/${reader.username}`}
                className="flex items-center gap-3 rounded-panel border border-line bg-surface p-3 transition-colors hover:border-subtle"
              >
                <Avatar name={reader.name} src={reader.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{reader.name}</p>
                  <p className="truncate text-xs text-muted">Lendo — {reader.progress}%</p>
                </div>
                {reader.compatibility != null && reader.compatibility > 0 && (
                  <CompatibilityBadge score={reader.compatibility} />
                )}
              </Link>
            ))}
          </div>
        ) : (
          !presence.isLoading && (
            <EmptyState
              compact
              icon={<Users className="h-5 w-5" />}
              title="Voce pode ser a primeira pessoa."
              description="Marque este livro como leitura atual e apareca para quem comecar depois."
            />
          )
        )}
      </section>

      {/* ------------------------------------------------------ comunidades */}
      {book.communities.length > 0 && (
        <section className="mt-12">
          <SectionHeader title="Comunidades relacionadas" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {book.communities.map((community) => (
              <Link
                key={community.id}
                to={`/c/${community.slug}`}
                className="flex items-center gap-3 rounded-panel border border-line bg-surface p-3.5 transition-colors hover:border-subtle"
              >
                <CommunityAvatar community={community} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{community.name}</p>
                  <p className="truncate text-xs text-muted">{community.membersCount} membros</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------- discussoes */}
      <section className="mt-12">
        <SectionHeader
          title="Discussoes recentes"
          action={
            <Button size="sm" variant="outline" onClick={() => setComposerOpen(true)}>
              Nova discussao
            </Button>
          }
        />
        {book.discussions.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {book.discussions.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            icon={<MessageCircle className="h-5 w-5" />}
            title="Nenhuma conversa sobre este livro ainda."
            description="Comece a primeira. Quem estiver lendo sera avisado."
            action={{ label: 'Iniciar discussao', onClick: () => setComposerOpen(true) }}
          />
        )}
      </section>

      {/* ----------------------------------------------------------- resenhas */}
      <section className="mt-12">
        <SectionHeader
          title="Resenhas"
          action={
            entry && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReviewRating(entry.rating ?? 0);
                  setReviewOpen(true);
                }}
              >
                Escrever a minha
              </Button>
            )
          }
        />
        {book.reviews.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {book.reviews.map((review) => (
              <Card key={review.id}>
                <div className="flex items-start gap-3">
                  {review.author && (
                    <Link to={`/u/${review.author.username}`}>
                      <Avatar name={review.author.name} src={review.author.avatarUrl} size="md" />
                    </Link>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      {review.author && (
                        <Link to={`/u/${review.author.username}`} className="text-sm font-medium text-ink hover:text-burgundy">
                          {review.author.name}
                        </Link>
                      )}
                      <time className="text-xs text-subtle">{formatRelative(review.createdAt)}</time>
                    </div>
                    <Rating value={review.rating} className="mt-1" />
                  </div>
                </div>

                {review.title && <h3 className="mt-3 font-display text-base font-semibold text-ink">{review.title}</h3>}

                <Spoiler active={review.containsSpoiler} className="mt-2">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted text-pretty">{review.content}</p>
                </Spoiler>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            icon={<Star className="h-5 w-5" />}
            title="Ainda sem resenhas."
            description="Depois de terminar, conte o que voce achou."
          />
        )}
      </section>

      {/* ------------------------------------------------- livros semelhantes */}
      {book.similar.length > 0 && (
        <section className="mt-12">
          <SectionHeader title="Livros semelhantes" subtitle="Mesmos generos, outros mundos." />
          <BookShelf>
            {book.similar.map((similar) => (
              <BookCard key={similar.id} book={similar} />
            ))}
          </BookShelf>
        </section>
      )}

      <PostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        book={{ id: book.id, title: book.title, coverUrl: book.coverUrl }}
      />

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={`Sua resenha de ${book.title}`}
        description="Conte o que ficou com voce. Marque como spoiler se contar o final."
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={submitReview}
              loading={upsertReview.isPending}
              disabled={reviewRating === 0 || reviewText.trim().length < 10}
            >
              Publicar resenha
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Sua nota</p>
            <Rating value={reviewRating} onChange={setReviewRating} size="lg" />
          </div>

          <Textarea
            label="Sua resenha"
            placeholder="O que voce achou? O que te marcou?"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            counterMax={5000}
            className="min-h-[10rem]"
          />

          <label className={cn('flex cursor-pointer items-center gap-2.5 text-sm text-muted')}>
            <input
              type="checkbox"
              checked={reviewSpoiler}
              onChange={(e) => setReviewSpoiler(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-[rgb(var(--rb-burgundy))]"
            />
            Minha resenha contem spoiler
          </label>
        </div>
      </Modal>
    </PageShell>
  );
}
