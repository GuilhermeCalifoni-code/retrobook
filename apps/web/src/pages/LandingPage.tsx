import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookMarked,
  Compass,
  Heart,
  Library,
  MessageCircle,
  Quote,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, BookCover, Button, Card } from '@/design-system';
import { Logo } from '@/components/brand/Logo';
import { Seo } from '@/components/seo/Seo';
import { usePlans } from '@/features/discovery/use-discovery';
import { useTheme } from '@/features/theme/use-theme';
import { formatCurrency } from '@/lib/format';
import { Moon, Sun } from 'lucide-react';

const SHOWCASE_BOOKS = [
  { title: 'Duna', author: 'Frank Herbert', readers: 38 },
  { title: 'O Nome do Vento', author: 'Patrick Rothfuss', readers: 21 },
  { title: 'A Hora da Estrela', author: 'Clarice Lispector', readers: 14 },
  { title: '1984', author: 'George Orwell', readers: 27 },
  { title: 'Cem Anos de Solidao', author: 'Gabriel Garcia Marquez', readers: 12 },
];

const STEPS = [
  {
    icon: <BookMarked className="h-5 w-5" />,
    title: 'Escolha o que voce le',
    text: 'Monte sua estante com o que esta lendo, ja leu e pretende ler.',
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Encontre pessoas parecidas',
    text: 'O RetroBook cruza livros, autores e generos para mostrar quem combina com voce.',
  },
  {
    icon: <Compass className="h-5 w-5" />,
    title: 'Entre em comunidades',
    text: 'Grupos vivos sobre os assuntos que voce ja acompanha — ou crie o seu.',
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: 'Converse e descubra',
    text: 'Teorias, finais, personagens. E a proxima historia aparece pelo caminho.',
  },
];

const FEATURES = [
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Comunidades',
    text: 'Espacos com regras proprias, moderacao e discussoes organizadas por livro.',
  },
  {
    icon: <Library className="h-5 w-5" />,
    title: 'Biblioteca pessoal',
    text: 'Status de leitura, progresso por pagina, notas e favoritos em um lugar so.',
  },
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: 'Discussoes com spoiler protegido',
    text: 'Todo spoiler vem com aviso e alcance declarado. Ninguem estraga o livro de ninguem.',
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Recomendacoes explicaveis',
    text: 'Voce sempre ve por que um livro ou uma pessoa apareceu para voce.',
  },
  {
    icon: <Heart className="h-5 w-5" />,
    title: 'Compatibilidade literaria',
    text: 'Um numero simples que resume o quanto duas estantes conversam entre si.',
  },
];

const SAMPLE_COMMUNITIES = [
  { name: 'Universos Fantasticos', desc: 'Mundos, mitologias e teorias.', members: 6, color: '#7B2E3A' },
  { name: 'Clube Duna', desc: 'Lendo Arrakis, capitulo a capitulo.', members: 6, color: '#B0822A' },
  { name: 'Brasil em Paginas', desc: 'Machado, Clarice, Rosa e quem vem depois.', members: 5, color: '#2E694A' },
  { name: 'Noite Sem Fim', desc: 'Terror, suspense e o que range no corredor.', members: 4, color: '#3B3532' },
];

export function LandingPage() {
  const { data: plans } = usePlans();
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-dvh bg-canvas rb-paper">
      <Seo
        title="RetroBook — Leia. Encontre. Compartilhe."
        description="Descubra pessoas, comunidades e conversas a partir das historias que voce ama. O RetroBook conecta leitores pelos livros que eles leem."
      />

      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-burgundy focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Pular para o conteudo
      </a>

      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[76rem] items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="RetroBook">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex" aria-label="Secoes">
            <a href="#como-funciona" className="transition-colors hover:text-ink">
              Como funciona
            </a>
            <a href="#comunidades" className="transition-colors hover:text-ink">
              Comunidades
            </a>
            <a href="#recursos" className="transition-colors hover:text-ink">
              Recursos
            </a>
            <a href="#planos" className="transition-colors hover:text-ink">
              Planos
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={isDark ? 'Usar tema claro' : 'Usar tema escuro'}
              className="rounded-full p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
            >
              {isDark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
            </button>
            <Link to="/entrar" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link to="/criar-conta">
              <Button size="sm">Comecar agora</Button>
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo">
        {/* -------------------------------------------------------------- hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-[76rem] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
            <div className="animate-fade-up">
              <Badge tone="gold" size="md" className="mb-5">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                A rede social das comunidades literarias
              </Badge>

              <h1 className="font-display text-display-xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl text-balance">
                Leia. <span className="text-burgundy">Encontre.</span> Compartilhe.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted text-pretty">
                Descubra pessoas, comunidades e conversas a partir das historias que voce ama.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/criar-conta">
                  <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                    Comecar agora
                  </Button>
                </Link>
                <Link to="/comunidades">
                  <Button size="lg" variant="outline">
                    Explorar comunidades
                  </Button>
                </Link>
              </div>

              <p className="mt-6 flex items-center gap-2 text-sm text-subtle">
                <Users className="h-4 w-4" aria-hidden />
                Talvez exista alguem lendo exatamente o que voce esta lendo.
              </p>
            </div>

            {/* Colagem: livros, pessoas e conversa — o produto em uma imagem. */}
            <div className="relative animate-fade-in">
              <div className="rb-scroll-x flex gap-3 pb-4" aria-hidden>
                {SHOWCASE_BOOKS.map((book, index) => (
                  <div
                    key={book.title}
                    className={cn(
                      'w-28 shrink-0 transition-transform duration-500 ease-editorial sm:w-32',
                      index % 2 === 0 ? '-rotate-1' : 'rotate-1 translate-y-3',
                    )}
                  >
                    <BookCover title={book.title} author={book.author} />
                  </div>
                ))}
              </div>

              <Card className="mt-4 max-w-md shadow-lifted">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-burgundy font-medium text-on-brand">
                    A
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">Ana esta lendo Duna</p>
                    <p className="text-xs text-muted">Voce tem 4 livros e 3 generos em comum</p>
                  </div>
                  <Badge tone="burgundy" className="ml-auto font-mono">
                    92%
                  </Badge>
                </div>

                <div className="mt-4 rounded-panel border border-line bg-raised/50 p-3.5">
                  <p className="text-xs uppercase tracking-wider text-subtle">Clube Duna</p>
                  <p className="mt-1 font-display text-body font-medium text-ink">
                    Bloco 3: o deserto como personagem
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">
                    A agua deixa de ser recurso e vira moral. Alguem mais leu assim?
                  </p>
                  <div className="mt-2.5 flex items-center gap-4 text-xs text-subtle">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5" aria-hidden /> 12
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden /> 3 respostas
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- como funciona */}
        <section id="como-funciona" className="border-y border-line bg-surface/60 py-16 lg:py-24">
          <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Como funciona</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl text-balance">
                Do livro ate a conversa, em quatro passos.
              </h2>
            </div>

            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <Card className="h-full">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-panel bg-burgundy/10 text-burgundy">
                        {step.icon}
                      </span>
                      <span className="font-display text-3xl font-semibold text-line" aria-hidden>
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted text-pretty">{step.text}</p>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------- comunidades */}
        <section id="comunidades" className="py-16 lg:py-24">
          <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Comunidades</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl text-balance">
                Descubra seu lugar entre os livros.
              </h2>
              <p className="mt-3 text-muted text-pretty">
                Cada comunidade tem tema, regras e moderacao proprias. Algumas sao abertas, outras nascem entre amigos.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {SAMPLE_COMMUNITIES.map((community) => (
                <Card key={community.name} padded={false} interactive className="overflow-hidden">
                  <div className="h-16" style={{ background: `linear-gradient(135deg, ${community.color}, ${community.color}33)` }} aria-hidden />
                  <div className="p-4 pt-0">
                    <span
                      className="-mt-6 mb-3 flex h-12 w-12 items-center justify-center rounded-panel font-display text-lg font-semibold text-white ring-4 ring-[rgb(var(--rb-surface))]"
                      style={{ background: community.color }}
                      aria-hidden
                    >
                      {community.name.charAt(0)}
                    </span>
                    <h3 className="font-display text-base font-semibold text-ink">{community.name}</h3>
                    <p className="mt-1 text-sm text-muted">{community.desc}</p>
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-subtle">
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      {community.members} membros
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-8">
              <Link to="/comunidades">
                <Button variant="outline" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Ver todas as comunidades
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- recursos */}
        <section id="recursos" className="border-y border-line bg-surface/60 py-16 lg:py-24">
          <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Recursos</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl text-balance">
                Feito para leitores.
              </h2>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-card border border-line bg-canvas p-5">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-panel bg-gold/12 text-gold">
                    {feature.icon}
                  </span>
                  <h3 className="font-display text-lg font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted text-pretty">{feature.text}</p>
                </div>
              ))}

              <div className="flex flex-col justify-center rounded-card border border-burgundy/25 bg-burgundy/[0.06] p-5">
                <Quote className="mb-2 h-5 w-5 text-burgundy" aria-hidden />
                <p className="font-display text-lg italic leading-snug text-ink text-pretty">
                  Seu proximo livro pode apresentar seu proximo amigo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- planos */}
        <section id="planos" className="py-16 lg:py-24">
          <div className="mx-auto max-w-[76rem] px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Planos</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ink sm:text-4xl text-balance">
                Crie seu proprio espaco.
              </h2>
              <p className="mt-3 text-muted text-pretty">
                Comecar e gratuito. Quando a sua comunidade crescer, o Pro cuida do resto.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:max-w-4xl">
              {(plans?.items ?? []).map((plan) => {
                const isPro = plan.tier === 'PRO';
                return (
                  <Card
                    key={plan.tier}
                    className={cn('relative flex flex-col', isPro && 'border-burgundy/40 shadow-lifted')}
                  >
                    {isPro && (
                      <Badge tone="burgundy" className="absolute -top-2.5 left-5">
                        Mais escolhido
                      </Badge>
                    )}
                    <h3 className="font-display text-xl font-semibold text-ink">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted">{plan.tagline}</p>

                    <p className="mt-5 font-display text-3xl font-semibold text-ink">
                      {plan.priceCents === 0 ? 'Gratuito' : formatCurrency(plan.priceCents, plan.currency)}
                      {plan.priceCents > 0 && <span className="text-base font-normal text-muted"> / mes</span>}
                    </p>

                    <ul className="mt-5 space-y-2.5 text-sm text-muted">
                      <PlanFeature>
                        {plan.features.maxCommunities === 1
                          ? '1 comunidade propria'
                          : `Ate ${plan.features.maxCommunities} comunidades`}
                      </PlanFeature>
                      <PlanFeature>
                        {plan.features.maxMembersPerCommunity <= 10
                          ? `Ate ${plan.features.maxMembersPerCommunity} membros por comunidade`
                          : 'Membros sem limite pratico'}
                      </PlanFeature>
                      <PlanFeature>Biblioteca pessoal e discussoes ilimitadas</PlanFeature>
                      {plan.features.allowPrivateCommunities && <PlanFeature>Comunidades privadas e exclusivas</PlanFeature>}
                      {plan.features.advancedModeration && <PlanFeature>Ferramentas avancadas de moderacao</PlanFeature>}
                      {plan.features.allowAnalytics && <PlanFeature>Analytics da comunidade</PlanFeature>}
                      {plan.features.allowCustomBranding && <PlanFeature>Personalizacao visual</PlanFeature>}
                    </ul>

                    <div className="mt-auto pt-6">
                      <Link to="/criar-conta">
                        <Button variant={isPro ? 'primary' : 'outline'} fullWidth>
                          {isPro ? 'Quero o Pro' : 'Comecar gratuitamente'}
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>

            <p className="mt-5 text-xs text-subtle">
              Precos exibidos como referencia do modelo de negocio. Nao ha cobranca ativa nesta versao.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------- cta final */}
        <section className="border-t border-line bg-burgundy py-16 text-center lg:py-20">
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="font-display text-3xl font-semibold text-on-brand sm:text-4xl text-balance">
              Historias aproximam pessoas.
            </h2>
            <p className="mt-3 text-on-brand/80 text-pretty">
              Comece pela sua estante. O resto acontece por conta.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/criar-conta">
                <Button size="lg" variant="gold" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Criar minha conta
                </Button>
              </Link>
              <Link to="/entrar">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-on-brand/40 text-on-brand hover:bg-white/10"
                >
                  Ja tenho conta
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface py-10">
        <div className="mx-auto flex max-w-[76rem] flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row">
          <Logo />
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
            <Link to="/comunidades" className="hover:text-ink">
              Comunidades
            </Link>
            <Link to="/livros" className="hover:text-ink">
              Livros
            </Link>
            <Link to="/entrar" className="hover:text-ink">
              Entrar
            </Link>
            <Link to="/criar-conta" className="hover:text-ink">
              Criar conta
            </Link>
          </nav>
          <p className="text-xs text-subtle">RetroBook — toda historia pode encontrar uma comunidade.</p>
        </div>
      </footer>
    </div>
  );
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
      {children}
    </li>
  );
}
