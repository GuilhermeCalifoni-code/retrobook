import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, PartyPopper, PenLine, Share2, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, BookCover, Button, Modal, Rating, Textarea, useToast } from '@/design-system';
import { useUpsertReview } from '@/features/books/use-books';
import { useFinishCelebration, useShareReadingProgress } from '@/features/discovery/use-discovery';

/**
 * Momento de conclusao de leitura (secao 28).
 *
 * Terminar um livro e o pico emocional da experiencia. Em vez de um toast que
 * some em tres segundos, abrimos um espaco curto que faz tres perguntas — o
 * que achou, quer escrever, quer conversar — e devolve os caminhos possiveis.
 *
 * Todas as acoes sao opcionais: fechar sem fazer nada e um final valido.
 */
export function FinishCelebration({
  bookId,
  open,
  onClose,
}: {
  bookId: string;
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { data, isLoading } = useFinishCelebration(bookId, open);
  const upsertReview = useUpsertReview();
  const shareProgress = useShareReadingProgress();

  const [rating, setRating] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewText, setReviewText] = useState('');

  const submitRating = async (value: number) => {
    setRating(value);
    // A nota sozinha ja e util: gravamos sem exigir texto.
    await upsertReview
      .mutateAsync({ bookId, rating: value, content: 'Sem resenha escrita.', containsSpoiler: false })
      .catch(() => undefined);
  };

  const submitReview = async () => {
    if (reviewText.trim().length < 10 || rating === 0) return;
    await upsertReview.mutateAsync({ bookId, rating, content: reviewText.trim() });
    setReviewOpen(false);
    toast.success('Resenha publicada.');
  };

  const share = async () => {
    try {
      await shareProgress.mutateAsync({ bookId, finished: true });
      toast.success('Sua conclusao foi para o feed.');
    } catch {
      toast.error('Nao conseguimos compartilhar agora.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={undefined}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      {isLoading || !data ? (
        <div className="py-10 text-center text-sm text-muted">Preparando...</div>
      ) : (
        <div className="space-y-6 pb-1">
          {/* ------------------------------------------------- comemoracao */}
          <div className="pt-2 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
              <PartyPopper className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-sm uppercase tracking-[0.16em] text-gold">Voce terminou</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ink text-balance">{data.book.title}</h2>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
              {data.daysReading && <Badge tone="outline">{data.daysReading} dias de leitura</Badge>}
              {data.pagesRead > 0 && <Badge tone="outline">{data.pagesRead} paginas</Badge>}
              <Badge tone="gold">{data.booksReadTotal}o livro do seu ano</Badge>
            </div>
          </div>

          <div className="mx-auto w-24">
            <BookCover title={data.book.title} src={data.book.coverUrl} />
          </div>

          {/* ------------------------------------------------------- a nota */}
          <div className="rounded-panel border border-line bg-raised/40 p-4 text-center">
            <p className="text-sm font-medium text-ink">O que voce achou?</p>
            <div className="mt-2 flex justify-center">
              <Rating value={rating || data.rating} onChange={submitRating} size="lg" />
            </div>
            {(rating > 0 || data.rating) && (
              <p className="mt-2 text-xs text-success">Nota registrada.</p>
            )}
          </div>

          {/* ------------------------------------------------ proximos passos */}
          <div className="grid gap-2.5 sm:grid-cols-3">
            <ActionTile
              icon={<PenLine className="h-4 w-4" />}
              label={data.hasReview ? 'Editar resenha' : 'Escrever resenha'}
              onClick={() => setReviewOpen(true)}
              disabled={rating === 0 && !data.rating}
            />
            <ActionTile icon={<Share2 className="h-4 w-4" />} label="Compartilhar" onClick={share} />
            <ActionTile
              icon={<Users className="h-4 w-4" />}
              label={
                data.companionsFinished > 0
                  ? `${data.companionsFinished} tambem leram`
                  : 'Ver quem leu'
              }
              onClick={() => {
                onClose();
                navigate(`/livro/${data.book.slug}#leitores`);
              }}
            />
          </div>

          {/* ----------------------------------------------- onde conversar */}
          {data.suggestedCommunities.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Onde falar sobre este livro</p>
              <div className="flex flex-wrap gap-2">
                {data.suggestedCommunities.map((community) => (
                  <button
                    key={community.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/c/${community.slug}`);
                    }}
                    className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-burgundy hover:text-burgundy"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: community.accentColor ?? 'rgb(var(--rb-burgundy))' }}
                      aria-hidden
                    />
                    {community.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* -------------------------------------------------- proximo livro */}
          {data.suggestedNextBooks.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
                <BookOpen className="h-4 w-4 text-muted" aria-hidden />
                E o proximo?
              </p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {data.suggestedNextBooks.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/livro/${book.slug}`);
                    }}
                    className="w-16 shrink-0 text-left transition-transform hover:-translate-y-1"
                  >
                    <BookCover title={book.title} src={book.coverUrl} />
                    <span className="mt-1 line-clamp-2 block text-label leading-tight text-muted">{book.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Sua resenha"
        description="O que ficou com voce depois da ultima pagina?"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitReview} loading={upsertReview.isPending} disabled={reviewText.trim().length < 10}>
              Publicar
            </Button>
          </>
        }
      >
        <Textarea
          data-autofocus
          label="Sua resenha"
          placeholder="Escreva livremente."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          counterMax={5000}
          className="min-h-[9rem]"
        />
      </Modal>
    </Modal>
  );
}

function ActionTile({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-panel border border-line bg-surface px-3 py-3.5 text-center text-xs font-medium text-ink transition-colors',
        'hover:border-burgundy hover:text-burgundy disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <span className="text-muted">{icon}</span>
      {label}
    </button>
  );
}
