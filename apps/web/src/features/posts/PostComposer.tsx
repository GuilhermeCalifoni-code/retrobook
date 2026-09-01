import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, EyeOff, Hash, Loader2, Quote, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, BookCover, Button, Input, Modal, Select, Switch, Textarea, useToast } from '@/design-system';
import { ApiError } from '@/lib/api-client';
import { useBookSearch } from '@/features/books/use-books';
import { useCommunities } from '@/features/communities/use-communities';
import { useDebounced } from '@/features/discovery/use-discovery';
import { useCreatePost } from './use-posts';
import type { Book, PostType } from '@/types/api';

const TYPES: { value: PostType; label: string; hint: string }[] = [
  { value: 'DISCUSSION', label: 'Discussao', hint: 'Abra uma conversa sobre o livro.' },
  { value: 'THEORY', label: 'Teoria', hint: 'Sua interpretacao sobre o que ainda nao foi dito.' },
  { value: 'QUESTION', label: 'Pergunta', hint: 'Peca opiniao de quem ja leu.' },
  { value: 'REVIEW', label: 'Resenha', hint: 'O que voce achou depois de terminar.' },
  { value: 'QUOTE', label: 'Citacao', hint: 'Um trecho curto que voce quer dividir.' },
];

const QUOTE_MAX = 400;

export interface PostComposerProps {
  open: boolean;
  onClose: () => void;
  /** Pre-seleciona a comunidade quando aberto de dentro de uma. */
  communitySlug?: string;
  book?: Book | { id: string; title: string; coverUrl: string | null };
}

export function PostComposer({ open, onClose, communitySlug, book: initialBook }: PostComposerProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const createPost = useCreatePost();

  const [type, setType] = useState<PostType>('DISCUSSION');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [quoteText, setQuoteText] = useState('');
  const [quotePage, setQuotePage] = useState('');
  const [spoiler, setSpoiler] = useState(false);
  const [spoilerScope, setSpoilerScope] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [community, setCommunity] = useState(communitySlug ?? '');
  const [book, setBook] = useState<{ id: string; title: string; coverUrl: string | null } | null>(
    initialBook ? { id: initialBook.id, title: initialBook.title, coverUrl: initialBook.coverUrl } : null,
  );
  const [bookQuery, setBookQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const debouncedBookQuery = useDebounced(bookQuery);
  const { data: bookResults, isFetching: searchingBooks } = useBookSearch(debouncedBookQuery, !book);
  const { data: myCommunities } = useCommunities({ mine: true });

  const communityOptions = useMemo(
    () => myCommunities?.pages.flatMap((page) => page.items) ?? [],
    [myCommunities],
  );

  const tags = useMemo(
    () =>
      tagsInput
        .split(/[,\s]+/)
        .map((t) => t.replace(/^#/, '').trim())
        .filter(Boolean)
        .slice(0, 8),
    [tagsInput],
  );

  const isQuote = type === 'QUOTE';
  const canSubmit = content.trim().length >= 2 && (!isQuote || (quoteText.trim().length > 0 && book));

  const reset = () => {
    setType('DISCUSSION');
    setTitle('');
    setContent('');
    setQuoteText('');
    setQuotePage('');
    setSpoiler(false);
    setSpoilerScope('');
    setTagsInput('');
    setBook(initialBook ? { id: initialBook.id, title: initialBook.title, coverUrl: initialBook.coverUrl } : null);
    setBookQuery('');
    setError(null);
  };

  const submit = async () => {
    setError(null);
    try {
      const post = await createPost.mutateAsync({
        type,
        title: title.trim() || undefined,
        content: content.trim(),
        communitySlug: community || undefined,
        bookId: book?.id,
        containsSpoiler: spoiler,
        spoilerScope: spoiler && spoilerScope.trim() ? spoilerScope.trim() : undefined,
        quoteText: isQuote ? quoteText.trim() : undefined,
        quotePage: isQuote && quotePage ? Number(quotePage) : undefined,
        tags,
      });
      toast.success('Sua discussao esta no ar.');
      reset();
      onClose();
      navigate(`/post/${post.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao conseguimos publicar agora. Tente novamente.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova discussao"
      description="Toda conversa fica melhor quando aponta para um livro."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!canSubmit} loading={createPost.isPending}>
            Publicar discussao
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-ink">Que tipo de conversa e essa?</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                aria-pressed={type === option.value}
                className={cn(
                  'rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors',
                  type === option.value
                    ? 'border-burgundy bg-burgundy/10 text-burgundy'
                    : 'border-line bg-surface text-muted hover:text-ink',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{TYPES.find((t) => t.value === type)?.hint}</p>
        </div>

        <Input
          label="Titulo"
          placeholder="Ex.: O que voces acharam do final?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
        />

        {isQuote && (
          <div className="rounded-panel border border-gold/30 bg-gold/8 p-4">
            <Textarea
              label="Trecho citado"
              hint={`Citacoes sao limitadas a ${QUOTE_MAX} caracteres e precisam apontar para o livro de origem.`}
              placeholder="Escreva aqui o trecho, com as palavras exatas do livro."
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              counterMax={QUOTE_MAX}
              className="min-h-[5rem] font-display italic"
            />
            <div className="mt-3 max-w-[10rem]">
              <Input
                label="Pagina"
                type="number"
                min={1}
                placeholder="233"
                value={quotePage}
                onChange={(e) => setQuotePage(e.target.value)}
              />
            </div>
          </div>
        )}

        <Textarea
          label={isQuote ? 'Por que esse trecho?' : 'Conteudo'}
          placeholder={
            isQuote ? 'Conte o que esse trecho significa para voce.' : 'Escreva o que voce quer discutir...'
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          counterMax={10000}
          className="min-h-[9rem]"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Comunidade"
            hint={community ? undefined : 'Sem comunidade, vira uma discussao aberta do livro.'}
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
          >
            <option value="">Discussao aberta</option>
            {communityOptions.map((option) => (
              <option key={option.id} value={option.slug}>
                {option.name}
              </option>
            ))}
          </Select>

          <Input
            label="Tags"
            leftIcon={<Hash className="h-4 w-4" />}
            placeholder="duna, teoria"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            hint={tags.length > 0 ? tags.map((t) => `#${t}`).join(' ') : 'Separe por virgula. Ate 8.'}
          />
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
            <BookOpen className="h-4 w-4 text-muted" aria-hidden />
            Livro relacionado
            {isQuote && <span className="text-burgundy">*</span>}
          </p>

          {book ? (
            <div className="flex items-center gap-3 rounded-panel border border-line bg-raised/50 p-3">
              <BookCover title={book.title} src={book.coverUrl} className="h-14 w-10" flat />
              <span className="flex-1 truncate text-sm font-medium text-ink">{book.title}</span>
              <button
                type="button"
                onClick={() => setBook(null)}
                aria-label="Remover livro"
                className="rounded-full p-1.5 text-muted hover:bg-surface hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                leftIcon={<Search className="h-4 w-4" />}
                placeholder="Buscar livro pelo titulo ou autor..."
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                rightSlot={searchingBooks ? <Loader2 className="h-4 w-4 animate-spin text-subtle" /> : undefined}
              />
              {bookResults && bookResults.items.length > 0 && (
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-panel border border-line p-1">
                  {bookResults.items.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        setBook({ id: result.id, title: result.title, coverUrl: result.coverUrl });
                        setBookQuery('');
                      }}
                      className="flex w-full items-center gap-3 rounded-control p-2 text-left transition-colors hover:bg-raised"
                    >
                      <BookCover title={result.title} src={result.coverUrl} className="h-11 w-8" flat />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{result.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {result.authors.map((a) => a.name).join(', ')}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-panel border border-line bg-raised/40 px-4">
          <Switch
            checked={spoiler}
            onChange={setSpoiler}
            label="Contem spoiler"
            description="O conteudo fica escondido ate a pessoa escolher ver."
          />
          {spoiler && (
            <div className="pb-4">
              <Input
                leftIcon={<EyeOff className="h-4 w-4" />}
                placeholder="Ate onde vai o spoiler? Ex.: ate o capitulo 12"
                value={spoilerScope}
                onChange={(e) => setSpoilerScope(e.target.value)}
                maxLength={80}
              />
            </div>
          )}
        </div>

        {isQuote && (
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
            Compartilhe apenas trechos curtos, sempre com referencia ao livro. Reproduzir capitulos inteiros viola
            direitos autorais e sera removido.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {!community && book && (
          <Badge tone="gold" className="w-fit">
            Esta discussao aparecera para quem esta lendo {book.title}
          </Badge>
        )}
      </div>
    </Modal>
  );
}
