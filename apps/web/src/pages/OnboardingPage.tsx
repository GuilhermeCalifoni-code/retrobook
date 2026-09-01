import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Check,
  Compass,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, Badge, BookCover, Button, Card, CompatibilityBadge, Input, useToast } from '@/design-system';
import { Logo } from '@/components/brand/Logo';
import { Seo } from '@/components/seo/Seo';
import { api } from '@/lib/api-client';
import { useSession } from '@/features/auth/session-context';
import { useBookSearch, useGenres } from '@/features/books/use-books';
import { useDebounced } from '@/features/discovery/use-discovery';
import { CommunityAvatar } from '@/features/communities/CommunityCard';
import type { Book, Community, ReadingGoal, SuggestedPerson } from '@/types/api';

const GOALS: { value: ReadingGoal; label: string; icon: React.ReactNode }[] = [
  { value: 'DISCOVER_BOOKS', label: 'Quero descobrir livros', icon: <BookMarked className="h-4 w-4" /> },
  { value: 'MEET_PEOPLE', label: 'Quero conhecer pessoas', icon: <Users className="h-4 w-4" /> },
  { value: 'JOIN_COMMUNITIES', label: 'Quero participar de comunidades', icon: <Compass className="h-4 w-4" /> },
  { value: 'DISCUSS_BOOKS', label: 'Quero discutir livros', icon: <MessageCircle className="h-4 w-4" /> },
  { value: 'TRACK_READING', label: 'Quero acompanhar minhas leituras', icon: <BookMarked className="h-4 w-4" /> },
  { value: 'EVERYTHING', label: 'Quero fazer tudo isso', icon: <Sparkles className="h-4 w-4" /> },
];

type BookBucket = 'reading' | 'read' | 'wantToRead';

const BUCKET_STEPS: { key: BookBucket; question: string; hint: string }[] = [
  { key: 'reading', question: 'O que voce esta lendo agora?', hint: 'E por aqui que encontramos quem le junto com voce.' },
  { key: 'read', question: 'O que voce ja leu?', hint: 'Quanto mais livros, melhores as recomendacoes.' },
  { key: 'wantToRead', question: 'O que esta na sua lista?', hint: 'Guardamos para quando bater a vontade.' },
];

const TOTAL_STEPS = 5;

export function OnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refresh } = useSession();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [customGenres, setCustomGenres] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');

  const [bucketIndex, setBucketIndex] = useState(0);
  const [books, setBooks] = useState<Record<BookBucket, Book[]>>({ reading: [], read: [], wantToRead: [] });
  const [bookQuery, setBookQuery] = useState('');

  const [goal, setGoal] = useState<ReadingGoal>('EVERYTHING');
  const [recommendations, setRecommendations] = useState<{
    people: SuggestedPerson[];
    communities: Community[];
    books: Book[];
  } | null>(null);

  const { data: genres, isLoading: loadingGenres } = useGenres();
  const debouncedQuery = useDebounced(bookQuery);
  const { data: bookResults, isFetching: searching } = useBookSearch(debouncedQuery);

  const bucket = BUCKET_STEPS[bucketIndex]!;
  const chosenIds = useMemo(
    () => new Set(Object.values(books).flat().map((b) => b.id)),
    [books],
  );

  const toggleGenre = (slug: string) =>
    setSelectedGenres((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const addCustomGenre = () => {
    const value = customInput.trim();
    if (!value || customGenres.length >= 5) return;
    setCustomGenres((prev) => [...prev, value]);
    setCustomInput('');
  };

  const addBook = (book: Book) => {
    if (chosenIds.has(book.id)) return;
    setBooks((prev) => ({ ...prev, [bucket.key]: [...prev[bucket.key], book] }));
    setBookQuery('');
  };

  const removeBook = (key: BookBucket, id: string) =>
    setBooks((prev) => ({ ...prev, [key]: prev[key].filter((b) => b.id !== id) }));

  const next = async () => {
    setSaving(true);
    setStepError(null);
    try {
      if (step === 1) {
        await api.put('/onboarding/interests', { genreSlugs: selectedGenres, customGenres });
      }
      if (step === 2) {
        // Ainda ha buckets a preencher: avanca dentro da mesma etapa.
        if (bucketIndex < BUCKET_STEPS.length - 1) {
          setBucketIndex((i) => i + 1);
          setBookQuery('');
          setSaving(false);
          return;
        }
        await api.put('/onboarding/books', {
          reading: books.reading.map((b) => b.id),
          read: books.read.map((b) => b.id),
          wantToRead: books.wantToRead.map((b) => b.id),
        });
      }
      if (step === 3) {
        await api.put('/onboarding/goal', { goal });
        setRecommendations(
          await api.get<{ people: SuggestedPerson[]; communities: Community[]; books: Book[] }>(
            '/onboarding/recommendations',
          ),
        );
      }
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    } catch {
      // Alem do toast, deixamos o erro visivel e recuperavel na propria etapa.
      setStepError('Nao conseguimos salvar esta etapa. Verifique sua conexao e tente novamente.');
      toast.error('Nao conseguimos salvar esta etapa.');
    } finally {
      setSaving(false);
    }
  };

  const back = () => {
    if (step === 2 && bucketIndex > 0) {
      setBucketIndex((i) => i - 1);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const finish = async () => {
    setSaving(true);
    try {
      await api.post('/onboarding/complete');
      await refresh();
      navigate('/inicio', { replace: true });
    } catch {
      toast.error('Nao conseguimos finalizar agora.');
    } finally {
      setSaving(false);
    }
  };

  const canAdvance =
    step === 0 ||
    (step === 1 && selectedGenres.length + customGenres.length >= 1) ||
    step === 2 ||
    step === 3 ||
    step === 4;

  return (
    <div className="min-h-dvh bg-canvas rb-paper">
      <Seo title="Boas-vindas" description="Conte o que voce le para o RetroBook encontrar suas pessoas." noIndex />

      <header className="border-b border-line bg-surface/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <span className="font-mono text-xs text-subtle">
            Etapa {step + 1} de {TOTAL_STEPS}
          </span>
        </div>
        <div className="h-1 w-full bg-line/50" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
          <div
            className="h-full bg-burgundy transition-[width] duration-500 ease-editorial"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
        {stepError && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center gap-3 rounded-panel border border-danger/30 bg-danger/8 p-4"
          >
            <p className="min-w-0 flex-1 text-sm text-danger">{stepError}</p>
            <Button size="sm" variant="outline" onClick={() => void next()} loading={saving}>
              Tentar de novo
            </Button>
          </div>
        )}
        {/* ---------------------------------------------------- 1. boas-vindas */}
        {step === 0 && (
          <section className="animate-fade-up text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-sheet bg-burgundy/10 text-burgundy">
              <Sparkles className="h-7 w-7" aria-hidden />
            </div>
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl text-balance">
              Vamos descobrir o que voce gosta de ler.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-muted text-pretty">
              Sao poucas perguntas. Com elas, o RetroBook consegue mostrar pessoas, comunidades e conversas que
              realmente combinam com a sua estante — em vez de um feed generico.
            </p>

            <div className="mx-auto mt-10 grid max-w-lg gap-3 text-left">
              {[
                { icon: <BookMarked className="h-4 w-4" />, text: 'Seus generos favoritos' },
                { icon: <Search className="h-4 w-4" />, text: 'Os livros que voce le e ja leu' },
                { icon: <Users className="h-4 w-4" />, text: 'O que voce quer encontrar por aqui' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 rounded-panel border border-line bg-surface p-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-control bg-gold/12 text-gold">
                    {item.icon}
                  </span>
                  <span className="text-sm text-muted">{item.text}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* -------------------------------------------------------- 2. generos */}
        {step === 1 && (
          <section className="animate-fade-up">
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">O que voce gosta de ler?</h1>
            <p className="mt-2 text-muted">Escolha quantos quiser. Da para mudar depois.</p>

            {loadingGenres ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span key={i} className="rb-skeleton h-9 w-28 rounded-pill" />
                ))}
              </div>
            ) : (
              <div className="mt-8 flex flex-wrap gap-2">
                {genres?.items.map((genre) => {
                  const active = selectedGenres.includes(genre.slug);
                  return (
                    <button
                      key={genre.slug}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleGenre(genre.slug)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-pill border px-4 py-2 text-sm font-medium transition-all duration-200',
                        active
                          ? 'border-burgundy bg-action text-on-brand'
                          : 'border-line bg-surface text-muted hover:border-subtle hover:text-ink',
                      )}
                    >
                      {active && <Check className="h-3.5 w-3.5" aria-hidden />}
                      {genre.name}
                    </button>
                  );
                })}

                {customGenres.map((genre) => (
                  <span
                    key={genre}
                    className="inline-flex items-center gap-1.5 rounded-pill border border-gold bg-gold/12 px-4 py-2 text-sm font-medium text-gold"
                  >
                    {genre}
                    <button
                      type="button"
                      onClick={() => setCustomGenres((prev) => prev.filter((g) => g !== genre))}
                      aria-label={`Remover ${genre}`}
                      className="text-gold/70 hover:text-gold"
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex max-w-md items-end gap-2">
              <Input
                label="Nao encontrou? Adicione o seu"
                placeholder="Ex.: Cordel, Sci-fi militar..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomGenre();
                  }
                }}
                containerClassName="flex-1"
              />
              <Button variant="outline" onClick={addCustomGenre} disabled={!customInput.trim()} leftIcon={<Plus className="h-4 w-4" />}>
                Adicionar
              </Button>
            </div>

            <p className="mt-4 text-sm text-subtle">
              {selectedGenres.length + customGenres.length} selecionado
              {selectedGenres.length + customGenres.length === 1 ? '' : 's'}
            </p>
          </section>
        )}

        {/* --------------------------------------------------------- 3. livros */}
        {step === 2 && (
          <section className="animate-fade-up">
            <div className="mb-1 flex items-center gap-2">
              {BUCKET_STEPS.map((b, i) => (
                <span
                  key={b.key}
                  className={cn('h-1 w-8 rounded-full transition-colors', i <= bucketIndex ? 'bg-gold' : 'bg-line')}
                  aria-hidden
                />
              ))}
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{bucket.question}</h1>
            <p className="mt-2 text-muted">{bucket.hint}</p>

            <div className="mt-6">
              <Input
                leftIcon={<Search className="h-4 w-4" />}
                placeholder="Buscar por titulo ou autor..."
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                rightSlot={searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-subtle" /> : undefined}
              />

              {bookQuery.trim().length >= 2 && (
                <div className="mt-2 max-h-64 overflow-y-auto rounded-panel border border-line bg-surface p-1">
                  {bookResults?.items.length === 0 && !searching && (
                    <p className="px-3 py-6 text-center text-sm text-muted">
                      Nao encontramos "{bookQuery}". Tente outro termo.
                    </p>
                  )}
                  {bookResults?.items.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => addBook(book)}
                      disabled={chosenIds.has(book.id)}
                      className="flex w-full items-center gap-3 rounded-control p-2 text-left transition-colors hover:bg-raised disabled:opacity-40"
                    >
                      <BookCover title={book.title} src={book.coverUrl} className="h-12 w-8" flat />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{book.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {book.authors.map((a) => a.name).join(', ')}
                        </span>
                      </span>
                      {chosenIds.has(book.id) ? (
                        <Check className="h-4 w-4 text-success" aria-hidden />
                      ) : (
                        <Plus className="h-4 w-4 text-subtle" aria-hidden />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {books[bucket.key].length > 0 ? (
              <div className="mt-6">
                <p className="mb-3 text-sm font-medium text-ink">Selecionados</p>
                <div className="flex flex-wrap gap-3">
                  {books[bucket.key].map((book) => (
                    <div key={book.id} className="relative w-24">
                      <BookCover title={book.title} author={book.authors[0]?.name} src={book.coverUrl} />
                      <button
                        type="button"
                        onClick={() => removeBook(bucket.key, book.id)}
                        aria-label={`Remover ${book.title}`}
                        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-canvas shadow-paper"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-8 rounded-panel border border-dashed border-line bg-raised/40 px-4 py-6 text-center text-sm text-muted">
                Nenhum livro por aqui ainda. Voce pode pular esta pergunta.
              </p>
            )}
          </section>
        )}

        {/* -------------------------------------------------------- 4. objetivo */}
        {step === 3 && (
          <section className="animate-fade-up">
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
              O que voce quer encontrar aqui?
            </h1>
            <p className="mt-2 text-muted">Isso ajuda a organizar o que aparece primeiro para voce.</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {GOALS.map((option) => {
                const active = goal === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setGoal(option.value)}
                    className={cn(
                      'flex items-center gap-3 rounded-panel border p-4 text-left transition-all duration-200',
                      active
                        ? 'border-burgundy bg-burgundy/8 shadow-paper'
                        : 'border-line bg-surface hover:border-subtle',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-control',
                        active ? 'bg-action text-on-brand' : 'bg-raised text-muted',
                      )}
                    >
                      {option.icon}
                    </span>
                    <span className={cn('text-sm font-medium', active ? 'text-ink' : 'text-muted')}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* -------------------------------------------------- 5. recomendacoes */}
        {step === 4 && (
          <section className="animate-fade-up">
            <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl text-balance">
              Encontramos algumas pessoas e comunidades que podem interessar a voce.
            </h1>
            <p className="mt-2 text-muted">Tudo isso saiu do que voce acabou de contar.</p>

            {recommendations?.people && recommendations.people.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 font-display text-lg font-semibold text-ink">Pessoas com gosto parecido</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {recommendations.people.slice(0, 4).map((person) => (
                    <Card key={person.id} className="flex items-start gap-3">
                      <Avatar name={person.name} src={person.avatarUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{person.name}</p>
                        <p className="truncate text-xs text-muted">@{person.username}</p>
                        {person.reasons[0] && (
                          <p className="mt-1 text-xs text-gold">{person.reasons[0].label}</p>
                        )}
                      </div>
                      {person.compatibility > 0 && <CompatibilityBadge score={person.compatibility} />}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {recommendations?.communities && recommendations.communities.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 font-display text-lg font-semibold text-ink">Comunidades para voce</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {recommendations.communities.map((community) => (
                    <Card key={community.id} className="flex items-start gap-3">
                      <CommunityAvatar community={community} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{community.name}</p>
                        <p className="line-clamp-2 text-xs text-muted">{community.tagline ?? community.description}</p>
                        {community.reasons?.[0] && (
                          <Badge tone="gold" className="mt-1.5">
                            {community.reasons[0]}
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {recommendations?.books && recommendations.books.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 font-display text-lg font-semibold text-ink">Livros que combinam com voce</h2>
                <div className="rb-scroll-x flex gap-4 pb-2">
                  {recommendations.books.map((book) => (
                    <div key={book.id} className="w-24 shrink-0">
                      <BookCover title={book.title} author={book.authors[0]?.name} src={book.coverUrl} />
                      <p className="mt-1.5 line-clamp-2 text-xs text-muted">{book.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!recommendations?.people.length && !recommendations?.communities.length && (
              <Card className="mt-8 text-center">
                <p className="text-sm text-muted text-pretty">
                  Ainda estamos conhecendo o seu gosto. Assim que voce adicionar mais livros, as sugestoes ficam bem
                  melhores.
                </p>
              </Card>
            )}
          </section>
        )}

        {/* ------------------------------------------------------------ acoes */}
        <div className="mt-12 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={back}
            disabled={step === 0 && bucketIndex === 0}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            {step === 2 && books[bucket.key].length === 0 && (
              <Button variant="ghost" onClick={next} disabled={saving}>
                Pular
              </Button>
            )}

            {step < TOTAL_STEPS - 1 ? (
              <Button onClick={next} loading={saving} disabled={!canAdvance} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Continuar
              </Button>
            ) : (
              <Button onClick={finish} loading={saving} size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Entrar no RetroBook
              </Button>
            )}
          </div>
        </div>

        {user && step === 0 && (
          <p className="mt-6 text-center text-sm text-subtle">
            Ola, {user.profile.name.split(' ')[0]}. Sua conta ja esta criada.
          </p>
        )}
      </main>
    </div>
  );
}
