import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { BookCover, Button, Card, Input, Modal, Progress, useToast } from '@/design-system';
import { useUpdateLibraryEntry } from '@/features/books/use-books';
import { FinishCelebration } from './FinishCelebration';
import { formatRelative } from '@/lib/format';
import type { LibraryEntry } from '@/types/api';

/**
 * Card de "Continuar lendo". O botao nao e decorativo: ele abre o registro de
 * progresso, que e a acao real que a pessoa vem fazer aqui.
 */
export function ContinueReadingCard({ entry }: { entry: LibraryEntry }) {
  const [open, setOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [page, setPage] = useState(String(entry.currentPage || ''));
  const update = useUpdateLibraryEntry();
  const toast = useToast();

  const pageCount = entry.book.pageCount;

  const save = async () => {
    const value = Number(page);
    if (!Number.isFinite(value) || value < 0) return;
    await update.mutateAsync({ bookId: entry.book.id, currentPage: value });
    setOpen(false);
    toast.success('Progresso atualizado.');
  };

  const finish = async () => {
    await update.mutateAsync({ bookId: entry.book.id, status: 'READ' });
    setOpen(false);
    // O fim da leitura merece mais do que um aviso que some.
    setCelebrating(true);
  };

  return (
    <>
      <Card className="flex gap-4">
        <Link to={`/livro/${entry.book.slug}`} className="w-20 shrink-0">
          <BookCover title={entry.book.title} author={entry.book.authors[0]?.name} src={entry.book.coverUrl} />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <Link to={`/livro/${entry.book.slug}`} className="group">
            <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-ink group-hover:text-burgundy">
              {entry.book.title}
            </h3>
          </Link>
          <p className="mt-0.5 truncate text-sm text-muted">{entry.book.authors.map((a) => a.name).join(', ')}</p>

          <div className="mt-3 space-y-1.5">
            <Progress value={entry.progress} size="md" />
            <div className="flex items-center justify-between font-mono text-xs text-subtle">
              <span>
                {pageCount ? `Pagina ${entry.currentPage} de ${pageCount}` : `${entry.progress}% lido`}
              </span>
              <span className="font-semibold text-burgundy">{entry.progress}%</span>
            </div>
          </div>

          {entry.lastReadAt && (
            <p className="mt-1.5 text-xs text-subtle">Ultimo acesso {formatRelative(entry.lastReadAt)}</p>
          )}

          <div className="mt-auto pt-3">
            <Button size="sm" leftIcon={<BookOpen className="h-4 w-4" />} onClick={() => setOpen(true)}>
              Continuar leitura
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={entry.book.title}
        description="Ate onde voce chegou?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={update.isPending}>
              Salvar progresso
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            data-autofocus
            label="Pagina atual"
            type="number"
            min={0}
            max={pageCount ?? undefined}
            value={page}
            onChange={(e) => setPage(e.target.value)}
            hint={pageCount ? `O livro tem ${pageCount} paginas.` : 'Informe a pagina em que voce parou.'}
          />

          {pageCount && Number(page) > 0 && (
            <Progress value={(Number(page) / pageCount) * 100} size="md" />
          )}

          <button
            type="button"
            onClick={finish}
            className="w-full rounded-panel border border-success/30 bg-success/8 px-4 py-3 text-sm font-medium text-success transition-colors hover:bg-success/12"
          >
            Terminei este livro
          </button>
        </div>
      </Modal>

      <FinishCelebration bookId={entry.book.id} open={celebrating} onClose={() => setCelebrating(false)} />
    </>
  );
}
