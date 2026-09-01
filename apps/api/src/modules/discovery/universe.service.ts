import { MembershipStatus, ReadingStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { bookCardSelect, publicUserSelect, serializeBook, serializeUser } from '../../shared/selectors';

/**
 * Seu Universo (secoes 5 e 25).
 *
 * Nao e um painel de estatisticas — e o retrato do ecossistema literario da
 * pessoa. A diferenca esta na ultima parte: alem de dizer *o que* ela le,
 * mostramos as **arestas** que saem dali (quem mais le isso, que comunidade
 * discute, que livro vem depois). E o ciclo do produto desenhado como dado:
 *
 *   ler -> encontrar pessoas -> conversar -> descobrir -> ler de novo
 */

export interface UniverseSlice {
  id: string;
  name: string;
  slug: string;
  count: number;
  /** Participacao no total, ja arredondada para exibicao. */
  percent: number;
}

function toSlices(
  tally: Map<string, { name: string; slug: string; count: number }>,
  limit: number,
): { slices: UniverseSlice[]; total: number } {
  const entries = Array.from(tally.entries()).sort((a, b) => b[1].count - a[1].count);
  const total = entries.reduce((sum, [, value]) => sum + value.count, 0);
  if (total === 0) return { slices: [], total: 0 };

  const top = entries.slice(0, limit);
  const restCount = entries.slice(limit).reduce((sum, [, value]) => sum + value.count, 0);

  const slices: UniverseSlice[] = top.map(([id, value]) => ({
    id,
    name: value.name,
    slug: value.slug,
    count: value.count,
    percent: Math.round((value.count / total) * 100),
  }));

  if (restCount > 0) {
    slices.push({
      id: 'outros',
      name: 'Outros',
      slug: 'outros',
      count: restCount,
      percent: Math.round((restCount / total) * 100),
    });
  }

  return { slices, total };
}

export async function getUniverse(userId: string) {
  const [userBooks, interests, memberships] = await Promise.all([
    prisma.userBook.findMany({
      where: { userId, status: { in: [ReadingStatus.READ, ReadingStatus.READING] } },
      select: {
        bookId: true,
        status: true,
        rating: true,
        book: {
          select: {
            id: true,
            title: true,
            slug: true,
            authors: { select: { author: { select: { id: true, name: true, slug: true } } } },
            genres: { select: { genre: { select: { id: true, name: true, slug: true } } } },
          },
        },
      },
    }),
    prisma.userGenre.findMany({
      where: { userId },
      select: { genre: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.communityMember.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      select: { community: { select: { id: true, name: true, slug: true, accentColor: true, membersCount: true } } },
    }),
  ]);

  const genreTally = new Map<string, { name: string; slug: string; count: number }>();
  const authorTally = new Map<string, { name: string; slug: string; count: number }>();

  for (const entry of userBooks) {
    for (const g of entry.book.genres) {
      const current = genreTally.get(g.genre.id) ?? { name: g.genre.name, slug: g.genre.slug, count: 0 };
      current.count += 1;
      genreTally.set(g.genre.id, current);
    }
    for (const a of entry.book.authors) {
      const current = authorTally.get(a.author.id) ?? { name: a.author.name, slug: a.author.slug, count: 0 };
      current.count += 1;
      authorTally.set(a.author.id, current);
    }
  }

  // Interesse declarado no onboarding conta, mesmo sem livro correspondente:
  // e o unico sinal de quem acabou de chegar.
  for (const interest of interests) {
    if (!genreTally.has(interest.genre.id)) {
      genreTally.set(interest.genre.id, { name: interest.genre.name, slug: interest.genre.slug, count: 1 });
    }
  }

  const genres = toSlices(genreTally, 6);
  const authors = toSlices(authorTally, 5);

  const topGenreIds = genres.slices.filter((s) => s.id !== 'outros').map((s) => s.id);

  // As arestas: onde o gosto desta pessoa encosta no de outras.
  const [kindredCount, communitiesInGenre, nextBooks] = await Promise.all([
    topGenreIds.length
      ? prisma.userGenre
          .findMany({
            where: { genreId: { in: topGenreIds }, userId: { not: userId } },
            select: { userId: true },
            distinct: ['userId'],
            take: 500,
          })
          .then((rows) => rows.length)
      : 0,
    topGenreIds.length
      ? prisma.community.count({
          where: { genreId: { in: topGenreIds }, privacy: 'PUBLIC', isArchived: false },
        })
      : 0,
    topGenreIds.length
      ? prisma.book.findMany({
          where: {
            genres: { some: { genreId: { in: topGenreIds } } },
            userBooks: { none: { userId } },
          },
          select: bookCardSelect,
          orderBy: [{ ratingsAvg: 'desc' }, { readersCount: 'desc' }],
          take: 6,
        })
      : [],
  ]);

  const ratings = userBooks.filter((b) => b.rating != null).map((b) => b.rating!);
  const averageRating = ratings.length
    ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
    : null;

  return {
    summary: {
      booksRead: userBooks.filter((b) => b.status === ReadingStatus.READ).length,
      booksReading: userBooks.filter((b) => b.status === ReadingStatus.READING).length,
      authors: authorTally.size,
      genres: genreTally.size,
      communities: memberships.length,
      averageRating,
    },
    genres: genres.slices,
    authors: authors.slices,
    communities: memberships.map((m) => m.community),
    /** O ciclo do produto, com numeros reais desta pessoa. */
    connections: {
      kindredReaders: kindredCount,
      communitiesInYourGenres: communitiesInGenre,
      nextBooks: nextBooks.map(serializeBook),
    },
    isEmpty: genreTally.size === 0 && userBooks.length === 0,
  };
}

/**
 * "Leitores agora" (secao 7): presenca em torno de um livro.
 * Ordena por afinidade, nao por ordem de chegada — quem aparece primeiro e
 * quem tem mais chance de render conversa.
 */
export async function getBookPresence(bookId: string, viewerId?: string, take = 12) {
  const [readingCount, finishedCount, sample] = await Promise.all([
    prisma.userBook.count({ where: { bookId, status: ReadingStatus.READING } }),
    prisma.userBook.count({ where: { bookId, status: ReadingStatus.READ } }),
    prisma.userBook.findMany({
      where: {
        bookId,
        status: ReadingStatus.READING,
        user: { profile: { visibility: 'PUBLIC', showCurrentlyReading: true } },
        ...(viewerId ? { userId: { not: viewerId } } : {}),
      },
      include: { user: { select: publicUserSelect } },
      orderBy: { lastReadAt: 'desc' },
      take: take * 2,
    }),
  ]);

  if (!viewerId || sample.length === 0) {
    return {
      readingCount,
      finishedCount,
      readers: sample.slice(0, take).map((r) => ({ ...serializeUser(r.user), progress: r.progress, compatibility: null })),
    };
  }

  // Ordenacao por afinidade exige o perfil de gosto — carregado em lote.
  const { loadTasteProfiles } = await import('./taste.repository');
  const { computeCompatibility } = await import('../../shared/compatibility');

  const ids = sample.map((s) => s.userId);
  const profiles = await loadTasteProfiles([viewerId, ...ids]);
  const mine = profiles.get(viewerId);

  const readers = sample
    .map((row) => {
      const other = profiles.get(row.userId);
      const score = mine && other ? computeCompatibility(mine, other).score : 0;
      return { ...serializeUser(row.user), progress: row.progress, compatibility: score };
    })
    .sort((a, b) => (b.compatibility ?? 0) - (a.compatibility ?? 0))
    .slice(0, take);

  return { readingCount, finishedCount, readers };
}
