import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Star, TrendingUp } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, SectionHeader, Skeleton, Stat } from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { useReadingStats } from '@/features/discovery/use-discovery';
import { useAchievements } from '@/features/people/use-people';
import { formatNumber } from '@/lib/format';

const STATUS_LABEL = {
  READ: 'Lidos',
  READING: 'Lendo',
  WANT_TO_READ: 'Quero ler',
  PAUSED: 'Pausados',
  ABANDONED: 'Abandonados',
} as const;

export function ReadingStatsPage() {
  const { data, isLoading, isError, refetch } = useReadingStats();
  const { data: achievements } = useAchievements();

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-card" />
          ))}
        </div>
      </PageShell>
    );
  }

  if (isError || !data) {
    return (
      <PageShell>
        <ErrorState title="Nao conseguimos calcular suas estatisticas." onRetry={() => void refetch()} />
      </PageShell>
    );
  }

  const hasData = data.totalBooks > 0;
  const unlocked = achievements?.items.filter((a) => a.unlockedAt) ?? [];

  return (
    <PageShell>
      <Seo title="Minha leitura" description="Suas estatisticas de leitura no RetroBook." noIndex />

      <PageHeader
        eyebrow="Estatisticas"
        title="Minha leitura"
        description="Numeros calculados a partir do que voce realmente registrou — sem estimativa."
      />

      {!hasData ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="Ainda nao ha o que medir."
          description="Adicione livros a sua biblioteca e registre o progresso. Os graficos aparecem sozinhos."
          action={
            <Link to="/livros">
              <Button>Encontrar livros</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-10">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat boxed label="Livros lidos" value={formatNumber(data.counts.READ)} icon={<BookOpen className="h-4 w-4" />} />
            <Stat boxed label="Paginas lidas" value={formatNumber(data.pagesRead)} icon={<TrendingUp className="h-4 w-4" />} />
            <Stat
              boxed
              label="Media das notas"
              value={data.averageRating ? data.averageRating.toFixed(1) : '—'}
              hint={`${data.ratedCount} avaliados`}
              icon={<Star className="h-4 w-4" />}
            />
            <Stat boxed label="Conquistas" value={String(unlocked.length)} icon={<Award className="h-4 w-4" />} />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((status) => (
              <Card key={status} className="text-center">
                <p className="font-display text-2xl font-semibold text-ink">{data.counts[status]}</p>
                <p className="mt-0.5 text-xs text-muted">{STATUS_LABEL[status]}</p>
              </Card>
            ))}
          </section>

          <section>
            <SectionHeader title="Atividade mensal" subtitle="Paginas registradas nos ultimos 12 meses." />
            <Card>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--rb-line))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'rgb(var(--rb-subtle))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'rgb(var(--rb-subtle))' }}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgb(var(--rb-line) / 0.35)' }}
                      contentStyle={{
                        background: 'rgb(var(--rb-surface))',
                        border: '1px solid rgb(var(--rb-line))',
                        borderRadius: 12,
                        fontSize: 12,
                        color: 'rgb(var(--rb-ink))',
                      }}
                      formatter={(value: number) => [`${formatNumber(value)} paginas`, '']}
                      labelFormatter={(label) => `Mes de ${label}`}
                    />
                    <Bar dataKey="pages" radius={[6, 6, 0, 0]}>
                      {data.monthly.map((entry, index) => (
                        <Cell key={entry.key} fill={index === data.monthly.length - 1 ? 'rgb(var(--rb-burgundy))' : 'rgb(var(--rb-gold))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-display text-lg font-semibold text-ink">Generos mais lidos</h2>
              {data.topGenres.length > 0 ? (
                <ul className="space-y-3">
                  {data.topGenres.map((genre) => {
                    const max = data.topGenres[0]?.count ?? 1;
                    return (
                      <li key={genre.slug}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <Link to={`/explorar?genero=${genre.slug}`} className="text-ink hover:text-burgundy">
                            {genre.name}
                          </Link>
                          <span className="font-mono text-xs text-subtle">{genre.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-pill bg-line/60">
                          <div className="h-full rounded-pill bg-burgundy" style={{ width: `${(genre.count / max) * 100}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted">Ainda sem dados suficientes.</p>
              )}
            </Card>

            <Card>
              <h2 className="mb-4 font-display text-lg font-semibold text-ink">Autores mais lidos</h2>
              {data.topAuthors.length > 0 ? (
                <ul className="space-y-2.5">
                  {data.topAuthors.map((author, index) => (
                    <li key={author.slug} className="flex items-center gap-3">
                      <span className="w-5 font-mono text-sm text-subtle">{index + 1}</span>
                      <span className="flex-1 truncate text-sm text-ink">{author.name}</span>
                      <Badge tone="outline">{author.count} {author.count === 1 ? 'livro' : 'livros'}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Ainda sem dados suficientes.</p>
              )}
            </Card>
          </section>

          {achievements && (
            <section>
              <SectionHeader
                title="Conquistas"
                subtitle={`${unlocked.length} de ${achievements.items.length} desbloqueadas.`}
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.items.map((achievement) => {
                  const done = Boolean(achievement.unlockedAt);
                  return (
                    <Card
                      key={achievement.code}
                      className={done ? 'border-gold/35 bg-gold/[0.05]' : 'opacity-70'}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={
                            done
                              ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-gold text-on-gold'
                              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-raised text-subtle'
                          }
                        >
                          <Award className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink">{achievement.name}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted">{achievement.description}</p>
                          {!done && (
                            <p className="mt-1 text-label text-subtle">Ainda nao desbloqueada</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </PageShell>
  );
}
