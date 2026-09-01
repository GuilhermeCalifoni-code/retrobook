import { MembershipStatus, ReadingStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { publicUserSelect, serializeBook, serializeUser, bookCardSelect } from '../../shared/selectors';
import { getCurrentlyReading } from '../library/library.service';
import { loadTasteContext, recommendBooks, recommendCommunities, recommendDiscussions, recommendPeople, recommendSerendipity } from '../recommendations/recommendation.engine';

/**
 * Home contextual (secao 3).
 *
 * A pergunta que esta tela responde nao e "o que existe no RetroBook?", e sim
 * **"o que mudou desde a ultima vez que eu vim?"**.
 *
 * Por isso a Home comeca por `signals`: frases curtas, calculadas, que dao
 * motivo para ficar. Cada sinal tem tipo, prioridade e destino — a interface
 * ordena e mostra os melhores, sem precisar saber como foram apurados.
 */

export type SignalKind =
  | 'companions' // gente lendo o mesmo livro
  | 'conversation' // respostas na sua discussao
  | 'community' // atividade onde voce participa
  | 'match' // alguem muito compativel
  | 'recommendation' // livro sugerido
  | 'welcome'; // primeiros passos

export interface HomeSignal {
  kind: SignalKind;
  /** Frase principal, ja pronta e no tom do produto. */
  title: string;
  detail?: string;
  href: string;
  cta: string;
  /** Maior = mais relevante agora. */
  priority: number;
  meta?: Record<string, unknown>;
}

/** Desde quando consideramos algo "novidade" para esta pessoa. */
function lastVisitWindow(lastSeenAt: Date | null): Date {
  const fallback = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  if (!lastSeenAt) return fallback;
  // Nunca menos de 12h: entrar duas vezes no mesmo dia nao deve zerar a Home.
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  return lastSeenAt < twelveHoursAgo ? lastSeenAt : twelveHoursAgo;
}

async function buildSignals(userId: string, lastSeenAt: Date | null): Promise<HomeSignal[]> {
  const since = lastVisitWindow(lastSeenAt);
  const signals: HomeSignal[] = [];

  const [reading, memberships] = await Promise.all([
    prisma.userBook.findMany({
      where: { userId, status: ReadingStatus.READING },
      include: { book: { select: { id: true, slug: true, title: true } } },
      orderBy: { lastReadAt: 'desc' },
      take: 3,
    }),
    prisma.communityMember.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      select: { communityId: true },
    }),
  ]);

  // 1. Voce tem companhia — o coracao do produto.
  // Uma consulta agregada para todos os livros, em vez de um count por livro.
  const companionCounts = reading.length
    ? await prisma.userBook.groupBy({
        by: ['bookId'],
        where: {
          bookId: { in: reading.map((r) => r.book.id) },
          status: ReadingStatus.READING,
          userId: { not: userId },
        },
        _count: { _all: true },
      })
    : [];
  const companionsByBook = new Map(companionCounts.map((c) => [c.bookId, c._count._all]));

  for (const entry of reading) {
    const others = companionsByBook.get(entry.book.id) ?? 0;
    if (others > 0) {
      signals.push({
        kind: 'companions',
        title: `${others === 1 ? 'Mais uma pessoa esta lendo' : `Mais ${others} pessoas estao lendo`} ${entry.book.title}.`,
        detail: 'Vocês estão no mesmo livro agora.',
        href: `/livro/${entry.book.slug}#leitores`,
        cta: 'Ver quem está lendo',
        priority: 90 + Math.min(others, 9),
        meta: { bookId: entry.book.id, others },
      });
    }
  }

  // 2. A conversa continua — respostas novas em discussoes suas.
  const newReplies = await prisma.comment.count({
    where: { post: { authorId: userId }, authorId: { not: userId }, createdAt: { gte: since }, isRemoved: false },
  });
  if (newReplies > 0) {
    const latest = await prisma.comment.findFirst({
      where: { post: { authorId: userId }, authorId: { not: userId }, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      select: { postId: true, post: { select: { title: true } } },
    });
    signals.push({
      kind: 'conversation',
      title: `${newReplies === 1 ? 'Uma nova resposta apareceu' : `${newReplies} novas respostas apareceram`} em uma discussão sua.`,
      detail: latest?.post.title ?? undefined,
      href: latest ? `/post/${latest.postId}` : '/feed',
      cta: 'Continuar a conversa',
      priority: 100,
      meta: { count: newReplies },
    });
  }

  // 3. Suas comunidades andaram.
  if (memberships.length > 0) {
    const communityPosts = await prisma.post.count({
      where: {
        communityId: { in: memberships.map((m) => m.communityId) },
        authorId: { not: userId },
        createdAt: { gte: since },
        isRemoved: false,
      },
    });
    if (communityPosts > 0) {
      signals.push({
        kind: 'community',
        title: `${communityPosts === 1 ? 'Uma discussão nova' : `${communityPosts} discussões novas`} nas suas comunidades.`,
        href: '/feed',
        cta: 'Ver no feed',
        priority: 70,
        meta: { count: communityPosts },
      });
    }
  }

  return signals;
}

export async function getHomeDashboard(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { lastSeenAt: true } });

  const context = await loadTasteContext(userId);

  // Duas ondas em vez de oito consultas simultaneas: a Home e o endpoint mais
  // acessado do produto e nao deve saturar o pool de conexoes sozinha.
  const [currentlyReading, signals, people, communities] = await Promise.all([
    getCurrentlyReading(userId, 4),
    buildSignals(userId, user?.lastSeenAt ?? null),
    recommendPeople(context, 6),
    recommendCommunities(context, 4),
  ]);

  const [books, discussions, serendipity, friendsActivity] = await Promise.all([
    recommendBooks(context, 8),
    recommendDiscussions(context, 5),
    recommendSerendipity(context, 3),
    getFriendsActivity(userId, 6),
  ]);

  // Sinal de alta compatibilidade so entra se for realmente alto.
  const topMatch = people[0];
  if (topMatch && topMatch.score >= 70) {
    signals.push({
      kind: 'match',
      title: `Você e ${topMatch.item.name} têm ${topMatch.score}% de compatibilidade literária.`,
      detail: topMatch.reasons.map((r) => r.label).slice(0, 2).join(' · '),
      href: `/u/${topMatch.item.username}`,
      cta: 'Conhecer',
      priority: 80,
    });
  }

  const topBook = books[0];
  if (topBook && topBook.reasons[0]?.kind !== 'popular') {
    signals.push({
      kind: 'recommendation',
      title: `Talvez seja hora de ler ${topBook.item.title}.`,
      detail: topBook.reasons[0]?.label,
      href: `/livro/${topBook.item.slug}`,
      cta: 'Ver livro',
      priority: 50,
    });
  }

  // Quem chegou agora precisa de direcao, nao de vitrine.
  if (signals.length === 0) {
    signals.push({
      kind: 'welcome',
      title: 'Adicione o livro que você está lendo agora.',
      detail: 'É a partir dele que encontramos pessoas, comunidades e conversas para você.',
      href: '/livros',
      cta: 'Encontrar meu livro',
      priority: 10,
    });
  }

  const companionBookIds = currentlyReading.slice(0, 3).map((entry) => entry.book.id);
  const [companionCounts, companionSample] = companionBookIds.length
    ? await Promise.all([
        prisma.userBook.groupBy({
          by: ['bookId'],
          where: { bookId: { in: companionBookIds }, status: ReadingStatus.READING, userId: { not: userId } },
          _count: { _all: true },
        }),
        prisma.userBook.findMany({
          where: {
            bookId: { in: companionBookIds },
            status: ReadingStatus.READING,
            userId: { not: userId },
            user: { profile: { visibility: 'PUBLIC', showCurrentlyReading: true } },
          },
          include: { user: { select: publicUserSelect } },
          take: 30,
        }),
      ])
    : [[], []];

  const countByBook = new Map(companionCounts.map((c) => [c.bookId, c._count._all]));
  const readersByBook = new Map<string, ReturnType<typeof serializeUser>[]>();
  for (const row of companionSample) {
    const list = readersByBook.get(row.bookId) ?? [];
    if (list.length < 5) list.push(serializeUser(row.user));
    readersByBook.set(row.bookId, list);
  }

  const readingCompanions = currentlyReading.slice(0, 3).map((entry) => ({
    book: entry.book,
    othersCount: countByBook.get(entry.book.id) ?? 0,
    readers: readersByBook.get(entry.book.id) ?? [],
  }));

  return {
    signals: signals.sort((a, b) => b.priority - a.priority).slice(0, 4),
    currentlyReading,
    readingCompanions,
    suggestedPeople: people.map((p) => ({ ...p.item, reasons: p.reasons })),
    communityDiscussions: discussions.map((d) => d.item),
    recommendedCommunities: communities.map((c) => ({ ...c.item, reasons: c.reasons.map((r) => r.label) })),
    recommendedBooks: books.map((b) => ({ ...b.item, reason: b.reasons[0]?.label })),
    serendipity: serendipity.map((s) => ({ ...s.item, reason: s.reasons[0]?.label })),
    friendsActivity,
  };
}

/** Atividade de quem eu sigo — o "o que meus amigos andam lendo". */
export async function getFriendsActivity(userId: string, take = 6) {
  const following = await prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } });
  const ids = following.map((f) => f.followingId);
  if (ids.length === 0) return [];

  const entries = await prisma.userBook.findMany({
    where: {
      userId: { in: ids },
      status: { in: [ReadingStatus.READING, ReadingStatus.READ] },
      user: { profile: { showActivity: true } },
    },
    include: { user: { select: publicUserSelect }, book: { select: bookCardSelect } },
    orderBy: { updatedAt: 'desc' },
    take,
  });

  return entries.map((e) => ({
    user: serializeUser(e.user),
    book: serializeBook(e.book),
    status: e.status,
    progress: e.progress,
    rating: e.rating,
    updatedAt: e.updatedAt,
  }));
}
