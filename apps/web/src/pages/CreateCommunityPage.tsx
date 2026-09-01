import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GripVertical,
  Globe,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Badge,
  BookCover,
  Button,
  Card,
  Input,
  Select,
  Switch,
  Textarea,
  useToast,
} from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { ApiError } from '@/lib/api-client';
import { useBookSearch, useGenres } from '@/features/books/use-books';
import { useDebounced, usePlanUsage } from '@/features/discovery/use-discovery';
import { useCreateCommunity } from '@/features/communities/use-communities';
import { CommunityAvatar, PrivacyBadge } from '@/features/communities/CommunityCard';
import { UPGRADE_COPY, UpgradePrompt } from '@/features/subscriptions/UpgradePrompt';
import type { Book, CommunityPrivacy } from '@/types/api';

const ACCENTS = ['#7B2E3A', '#B0822A', '#2E694A', '#4A5C7A', '#6B4423', '#5C4A7A', '#3B3532'];

const PRIVACY_OPTIONS: { value: CommunityPrivacy; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'PUBLIC',
    label: 'Publica',
    description: 'Qualquer pessoa pode entrar e ler as discussoes.',
    icon: <Globe className="h-4 w-4" />,
  },
  {
    value: 'EXCLUSIVE',
    label: 'Por aprovacao',
    description: 'Qualquer pessoa ve a comunidade, mas a entrada passa pela moderacao.',
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    value: 'PRIVATE',
    label: 'Privada',
    description: 'So membros veem o conteudo. Entrada por convite ou solicitacao.',
    icon: <Lock className="h-4 w-4" />,
  },
];

const SUGGESTED_RULES = [
  { title: 'Respeite os outros membros', description: 'Critique a ideia, nunca a pessoa.' },
  { title: 'Nao publique spoilers sem aviso', description: 'Use o marcador de spoiler e diga ate onde ele vai.' },
  { title: 'Discussoes devem permanecer relacionadas ao tema' },
  { title: 'Nao faca spam', description: 'Divulgacao so com autorizacao da moderacao.' },
  { title: 'Nao compartilhe conteudo pirata', description: 'Trechos curtos com referencia sao bem-vindos.' },
];

const STEPS = ['Nome', 'Descricao', 'Categoria', 'Tags', 'Identidade', 'Regras', 'Privacidade', 'Membros', 'Publicar'];

export function CreateCommunityPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const createCommunity = useCreateCommunity();
  const { data: genres } = useGenres();
  const { data: usage } = usePlanUsage();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [planBlocked, setPlanBlocked] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [genreSlug, setGenreSlug] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [accentColor, setAccentColor] = useState(ACCENTS[0]!);
  const [rules, setRules] = useState<{ title: string; description?: string }[]>([]);
  const [privacy, setPrivacy] = useState<CommunityPrivacy>('PUBLIC');
  const [allowMemberPosts, setAllowMemberPosts] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookQuery, setBookQuery] = useState('');

  const debouncedQuery = useDebounced(bookQuery);
  const { data: bookResults } = useBookSearch(debouncedQuery);

  const tags = useMemo(
    () =>
      tagsInput
        .split(/[,\s]+/)
        .map((t) => t.replace(/^#/, '').trim())
        .filter(Boolean)
        .slice(0, 8),
    [tagsInput],
  );

  const preview = {
    name: name || 'Nome da comunidade',
    tagline,
    description: description || 'A descricao aparece aqui.',
    avatarUrl: null,
    coverUrl: null,
    accentColor,
    privacy,
    membersCount: 1,
    postsCount: 0,
  };

  const stepValid = [
    name.trim().length >= 3,
    description.trim().length >= 20,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
  ];

  const canCreatePrivate = usage?.allowPrivateCommunities ?? false;
  const atCommunityLimit = usage ? usage.communities.used >= usage.communities.limit : false;

  const addRule = (rule: { title: string; description?: string }) => {
    if (rules.length >= 12) return;
    setRules((prev) => [...prev, rule]);
  };

  const moveRule = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rules.length) return;
    setRules((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  const publish = async () => {
    setError(null);
    setPlanBlocked(null);
    try {
      const community = await createCommunity.mutateAsync({
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        description: description.trim(),
        genreSlug: genreSlug || undefined,
        tags,
        accentColor,
        privacy,
        allowMemberPosts,
        requireApproval,
        rules,
        bookIds: books.map((b) => b.id),
      });
      toast.success('Comunidade criada. Agora e so convidar gente.');
      navigate(`/c/${community.slug}`);
    } catch (err) {
      if (err instanceof ApiError && err.isPlanLimit) setPlanBlocked(err.message);
      else setError(err instanceof ApiError ? err.message : 'Nao conseguimos criar a comunidade agora.');
    }
  };

  return (
    <PageShell width="wide">
      <Seo title="Criar comunidade" description="Crie um espaco para as conversas que voce quer ter." noIndex />

      <PageHeader
        eyebrow={`Etapa ${step + 1} de ${STEPS.length}`}
        title="Crie seu proprio espaco"
        description="Uma comunidade e um lugar com tema, regras e gente. Vamos montar o seu."
      />

      {/* Trilha de etapas */}
      <div className="rb-scroll-x mb-6 flex gap-1.5 pb-1">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => index <= step && setStep(index)}
            disabled={index > step}
            className={cn(
              'shrink-0 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors',
              index === step
                ? 'border-burgundy bg-action text-on-brand'
                : index < step
                  ? 'border-line bg-surface text-muted hover:text-ink'
                  : 'border-line/60 bg-transparent text-subtle',
            )}
          >
            {index < step && <Check className="mr-1 inline h-3 w-3" aria-hidden />}
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Card>
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-ink">Como sua comunidade se chama?</h2>
                <Input
                  label="Nome"
                  required
                  placeholder="Ex.: Universos Fantasticos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  hint="Escolha algo que diga o assunto em poucas palavras."
                />
                <Input
                  label="Frase curta (opcional)"
                  placeholder="Ex.: Mundos, mitologias e teorias."
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  maxLength={120}
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-ink">Do que se trata?</h2>
                <Textarea
                  label="Descricao"
                  required
                  placeholder="Explique o tema, o tom das conversas e quem vai se sentir em casa aqui."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  counterMax={2000}
                  className="min-h-[10rem]"
                  hint="Minimo de 20 caracteres. Essa e a primeira coisa que as pessoas leem."
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-ink">Qual a categoria principal?</h2>
                <Select
                  label="Genero"
                  value={genreSlug}
                  onChange={(e) => setGenreSlug(e.target.value)}
                  hint="Ajuda o RetroBook a recomendar sua comunidade para as pessoas certas."
                >
                  <option value="">Sem categoria definida</option>
                  {genres?.items.map((genre) => (
                    <option key={genre.slug} value={genre.slug}>
                      {genre.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-ink">Adicione algumas tags</h2>
                <Input
                  label="Tags"
                  placeholder="fantasia, worldbuilding, teorias"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  hint="Separe por virgula. Ate 8 tags."
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} tone="outline" size="md">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <h2 className="font-display text-xl font-semibold text-ink">Identidade visual</h2>
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Cor da comunidade</p>
                  <div className="flex flex-wrap gap-2.5">
                    {ACCENTS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={`Usar a cor ${color}`}
                        aria-pressed={accentColor === color}
                        onClick={() => setAccentColor(color)}
                        className={cn(
                          'h-10 w-10 rounded-panel transition-transform',
                          accentColor === color ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-[rgb(var(--rb-surface))]' : 'hover:scale-105',
                        )}
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Livros associados (opcional)</p>
                  <Input
                    leftIcon={<Search className="h-4 w-4" />}
                    placeholder="Buscar livro..."
                    value={bookQuery}
                    onChange={(e) => setBookQuery(e.target.value)}
                  />

                  {bookQuery.trim().length >= 2 && bookResults && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-panel border border-line p-1">
                      {bookResults.items.map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => {
                            if (!books.some((b) => b.id === book.id)) setBooks((prev) => [...prev, book]);
                            setBookQuery('');
                          }}
                          className="flex w-full items-center gap-3 rounded-control p-2 text-left hover:bg-raised"
                        >
                          <BookCover title={book.title} src={book.coverUrl} className="h-11 w-8" flat />
                          <span className="min-w-0 flex-1 truncate text-sm text-ink">{book.title}</span>
                          <Plus className="h-4 w-4 text-subtle" aria-hidden />
                        </button>
                      ))}
                    </div>
                  )}

                  {books.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {books.map((book) => (
                        <span
                          key={book.id}
                          className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-raised px-3 py-1 text-xs text-ink"
                        >
                          {book.title}
                          <button
                            type="button"
                            onClick={() => setBooks((prev) => prev.filter((b) => b.id !== book.id))}
                            aria-label={`Remover ${book.title}`}
                          >
                            <X className="h-3 w-3" aria-hidden />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">Regras da comunidade</h2>
                  <p className="mt-1 text-sm text-muted">
                    Regras claras evitam a maior parte dos conflitos. Voce pode editar depois.
                  </p>
                </div>

                {rules.length > 0 && (
                  <ol className="space-y-2">
                    {rules.map((rule, index) => (
                      <li key={`${rule.title}-${index}`} className="flex items-start gap-2 rounded-panel border border-line bg-raised/40 p-3">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">
                            {index + 1}. {rule.title}
                          </p>
                          {rule.description && <p className="mt-0.5 text-xs text-muted">{rule.description}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveRule(index, -1)}
                            disabled={index === 0}
                            aria-label="Mover para cima"
                            className="rounded p-1 text-subtle hover:text-ink disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRule(index, 1)}
                            disabled={index === rules.length - 1}
                            aria-label="Mover para baixo"
                            className="rounded p-1 text-subtle hover:text-ink disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => setRules((prev) => prev.filter((_, i) => i !== index))}
                            aria-label={`Remover regra ${index + 1}`}
                            className="rounded p-1 text-subtle hover:text-danger"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Sugestoes</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_RULES.filter((s) => !rules.some((r) => r.title === s.title)).map((suggestion) => (
                      <button
                        key={suggestion.title}
                        type="button"
                        onClick={() => addRule(suggestion)}
                        className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:border-burgundy hover:text-burgundy"
                      >
                        <Plus className="h-3 w-3" aria-hidden />
                        {suggestion.title}
                      </button>
                    ))}
                  </div>
                </div>

                <CustomRuleForm onAdd={addRule} />
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-ink">Quem pode entrar?</h2>

                <div className="space-y-3">
                  {PRIVACY_OPTIONS.map((option) => {
                    const locked = option.value !== 'PUBLIC' && !canCreatePrivate;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          setPrivacy(option.value);
                          setRequireApproval(option.value !== 'PUBLIC');
                        }}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-panel border p-4 text-left transition-colors',
                          privacy === option.value ? 'border-burgundy bg-burgundy/8' : 'border-line bg-surface hover:border-subtle',
                          locked && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-control',
                            privacy === option.value ? 'bg-action text-on-brand' : 'bg-raised text-muted',
                          )}
                        >
                          {option.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2 text-sm font-medium text-ink">
                            {option.label}
                            {locked && <Badge tone="gold">Pro</Badge>}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{option.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {!canCreatePrivate && (
                  <UpgradePrompt variant="inline" cta="Conhecer o Pro" {...UPGRADE_COPY.privateCommunity} />
                )}
              </div>
            )}

            {step === 7 && (
              <div className="space-y-2">
                <h2 className="font-display text-xl font-semibold text-ink">Como os membros participam?</h2>

                <div className="divide-y divide-line rounded-panel border border-line px-4">
                  <Switch
                    checked={allowMemberPosts}
                    onChange={setAllowMemberPosts}
                    label="Membros podem criar discussoes"
                    description="Desative para que apenas a moderacao publique."
                  />
                  <Switch
                    checked={requireApproval}
                    onChange={setRequireApproval}
                    label="Aprovar cada entrada"
                    description="Voce recebe uma notificacao a cada pedido."
                    disabled={privacy !== 'PUBLIC' }
                  />
                </div>

                {usage && (
                  <p className="pt-3 text-sm text-muted">
                    Seu plano <span className="font-medium text-ink">{usage.name}</span> permite ate{' '}
                    <span className="font-medium text-ink">{usage.members.limit} membros</span> por comunidade.
                  </p>
                )}
              </div>
            )}

            {step === 8 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold text-ink">Tudo pronto?</h2>
                <p className="text-sm text-muted text-pretty">
                  Confira o resumo ao lado. Depois de criar, voce pode editar nome, regras e configuracoes a qualquer
                  momento.
                </p>

                <dl className="divide-y divide-line rounded-panel border border-line">
                  <SummaryRow label="Nome" value={name} />
                  <SummaryRow label="Categoria" value={genres?.items.find((g) => g.slug === genreSlug)?.name ?? 'Sem categoria'} />
                  <SummaryRow label="Tags" value={tags.length ? tags.map((t) => `#${t}`).join(' ') : 'Nenhuma'} />
                  <SummaryRow label="Regras" value={`${rules.length} regra${rules.length === 1 ? '' : 's'}`} />
                  <SummaryRow
                    label="Privacidade"
                    value={PRIVACY_OPTIONS.find((p) => p.value === privacy)?.label ?? 'Publica'}
                  />
                  <SummaryRow label="Livros" value={books.length ? books.map((b) => b.title).join(', ') : 'Nenhum'} />
                </dl>

                {atCommunityLimit && (
                  <p className="rounded-panel border border-gold/30 bg-gold/8 p-3.5 text-sm text-muted">
                    Voce ja usa {usage?.communities.used} de {usage?.communities.limit} comunidades do seu plano.
                  </p>
                )}

                {planBlocked && (
                  <UpgradePrompt title={UPGRADE_COPY.communityCount.title} description={planBlocked} />
                )}

                {error && (
                  <p role="alert" className="rounded-control bg-danger/10 px-3 py-2.5 text-sm text-danger">
                    {error}
                  </p>
                )}
              </div>
            )}
          </Card>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}
            >
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!stepValid[step]}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Continuar
              </Button>
            ) : (
              <Button onClick={publish} loading={createCommunity.isPending} size="lg">
                Publicar comunidade
              </Button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- preview ao vivo */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Previa</p>
          <Card padded={false} className="overflow-hidden">
            <div
              className="h-16"
              aria-hidden
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}22)` }}
            />
            <div className="p-4 pt-0">
              <div className="-mt-6 mb-3 flex items-end justify-between">
                <CommunityAvatar community={preview} className="ring-4 ring-[rgb(var(--rb-surface))]" />
                <PrivacyBadge privacy={privacy} />
              </div>
              <h3 className="font-display text-base font-semibold text-ink">{preview.name}</h3>
              {tagline && <p className="mt-0.5 text-sm text-muted">{tagline}</p>}
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{preview.description}</p>

              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} tone="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              <p className="mt-3 text-xs text-subtle">1 membro - 0 discussoes</p>
            </div>
          </Card>

          {rules.length > 0 && (
            <Card className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Regras</p>
              <ol className="space-y-1.5 text-sm text-muted">
                {rules.map((rule, index) => (
                  <li key={index}>
                    {index + 1}. {rule.title}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </aside>
      </div>
    </PageShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="max-w-[60%] text-right text-sm font-medium text-ink">{value || '—'}</dd>
    </div>
  );
}

function CustomRuleForm({ onAdd }: { onAdd: (rule: { title: string; description?: string }) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="rounded-panel border border-dashed border-line p-4">
      <p className="mb-3 text-sm font-medium text-ink">Criar uma regra propria</p>
      <div className="space-y-3">
        <Input placeholder="Titulo da regra" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        <Input
          placeholder="Explicacao (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
        />
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          disabled={title.trim().length < 3}
          onClick={() => {
            onAdd({ title: title.trim(), description: description.trim() || undefined });
            setTitle('');
            setDescription('');
          }}
        >
          Adicionar regra
        </Button>
      </div>
    </div>
  );
}
