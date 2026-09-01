import { ReadingStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "Minha leitura" (secao 31): numeros simples, honestos e derivados de eventos reais. */
export async function getReadingStats(userId: string) {
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [statusCounts, entries, progressEvents, ratingAgg] = await Promise.all([
    prisma.userBook.groupBy({ by: ['status'], where: { userId }, _count: true }),
    prisma.userBook.findMany({
      where: { userId },
      include: {
        book: {
          select: {
            pageCount: true,
            genres: { select: { genre: { select: { id: true, name: true, slug: true } } } },
            authors: { select: { author: { select: { id: true, name: true, slug: true } } } },
          },
        },
      },
    }),
    prisma.readingProgress.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { pagesDelta: true, createdAt: true },
    }),
    prisma.userBook.aggregate({ where: { userId, rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } }),
  ]);

  const counts = {
    WANT_TO_READ: 0,
    READING: 0,
    PAUSED: 0,
    ABANDONED: 0,
    READ: 0,
    ...Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
  } as Record<ReadingStatus, number>;

  // Paginas lidas: soma das paginas dos concluidos + progresso dos em andamento.
  let pagesRead = 0;
  const genreTally = new Map<string, { name: string; slug: string; count: number }>();
  const authorTally = new Map<string, { name: string; slug: string; count: number }>();

  for (const entry of entries) {
    if (entry.status === ReadingStatus.READ) pagesRead += entry.book.pageCount ?? 0;
    else pagesRead += entry.currentPage;

    if (entry.status === ReadingStatus.READ || entry.status === ReadingStatus.READING) {
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
  }

  const months: { label: string; key: string; pages: number; books: number }[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < 12; i += 1) {
    months.push({
      label: MONTH_LABELS[cursor.getMonth()]!,
      key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      pages: 0,
      books: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));

  for (const event of progressEvents) {
    const key = `${event.createdAt.getFullYear()}-${String(event.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) months[idx]!.pages += event.pagesDelta;
  }
  for (const entry of entries) {
    if (entry.status !== ReadingStatus.READ || !entry.finishedAt) continue;
    const key = `${entry.finishedAt.getFullYear()}-${String(entry.finishedAt.getMonth() + 1).padStart(2, '0')}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) months[idx]!.books += 1;
  }

  const topGenres = [...genreTally.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  const topAuthors = [...authorTally.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    counts,
    totalBooks: entries.length,
    pagesRead,
    averageRating: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : null,
    ratedCount: ratingAgg._count.rating,
    topGenre: topGenres[0] ?? null,
    topAuthor: topAuthors[0] ?? null,
    topGenres,
    topAuthors,
    monthly: months,
  };
}
