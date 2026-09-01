import { ReadingStatus } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { prisma } from '../../database/prisma';
import { bookCardSelect, serializeBook } from '../../shared/selectors';
import { refreshBookAggregates } from '../books/books.service';
import { evaluateAchievements } from '../achievements/achievements.service';
import { PRODUCT_EVENTS, track } from '../analytics/events.service';

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Deriva pagina <-> porcentagem. O usuario informa o que for mais natural para
 * ele (pagina ou %), e a biblioteca mantem os dois campos coerentes.
 */
function deriveProgress(input: { currentPage?: number; progress?: number }, pageCount?: number | null) {
  if (input.currentPage != null && pageCount) {
    const page = Math.max(0, Math.min(pageCount, Math.round(input.currentPage)));
    return { currentPage: page, progress: clampPercent((page / pageCount) * 100) };
  }
  if (input.currentPage != null) return { currentPage: Math.max(0, input.currentPage), progress: input.progress ?? 0 };
  if (input.progress != null) {
    const progress = clampPercent(input.progress);
    return { progress, currentPage: pageCount ? Math.round((progress / 100) * pageCount) : 0 };
  }
  return {};
}

export async function addToLibrary(
  userId: string,
  input: { bookId: string; status?: ReadingStatus; rating?: number; isFavorite?: boolean },
) {
  const book = await prisma.book.findUnique({ where: { id: input.bookId }, select: { id: true, title: true } });
  if (!book) throw ApiError.notFound('Livro nao encontrado.');

  // Livro ja na estante: delega para o update, que sabe tratar a transicao de
  // status (limpar finishedAt ao sair de "lido", por exemplo). Evita que
  // readicionar um livro deixe datas incoerentes para tras.
  const existing = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId, bookId: book.id } },
    select: { id: true },
  });
  if (existing) {
    return updateLibraryEntry(userId, book.id, {
      status: input.status,
      rating: input.rating,
      isFavorite: input.isFavorite,
    });
  }

  const status = input.status ?? ReadingStatus.WANT_TO_READ;
  const now = new Date();

  const entry = await prisma.userBook.create({
    data: {
      userId,
      bookId: book.id,
      status,
      rating: input.rating,
      isFavorite: input.isFavorite ?? false,
      startedAt: status === ReadingStatus.READING || status === ReadingStatus.READ ? now : undefined,
      finishedAt: status === ReadingStatus.READ ? now : undefined,
      lastReadAt: status === ReadingStatus.READING ? now : undefined,
      progress: status === ReadingStatus.READ ? 100 : 0,
    },
    include: { book: { select: bookCardSelect } },
  });

  const total = await prisma.userBook.count({ where: { userId } });
  track({
    name: total === 1 ? PRODUCT_EVENTS.FIRST_BOOK_ADDED : PRODUCT_EVENTS.BOOK_ADDED,
    userId,
    entityType: 'book',
    entityId: book.id,
    metadata: { status },
  });

  await refreshBookAggregates(book.id);
  await evaluateAchievements(userId);
  return serializeEntry(entry);
}

export async function updateLibraryEntry(
  userId: string,
  bookId: string,
  input: {
    status?: ReadingStatus;
    rating?: number | null;
    isFavorite?: boolean;
    currentPage?: number;
    currentChapter?: number;
    progress?: number;
    note?: string;
  },
) {
  const existing = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId, bookId } },
    include: { book: { select: { id: true, pageCount: true } } },
  });
  if (!existing) throw ApiError.notFound('Este livro ainda nao esta na sua biblioteca.');

  const derived = deriveProgress(input, existing.book.pageCount);
  const now = new Date();
  const statusChanged = input.status && input.status !== existing.status;

  const data: Parameters<typeof prisma.userBook.update>[0]['data'] = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.rating !== undefined ? { rating: input.rating } : {}),
    ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
    ...(input.currentChapter !== undefined ? { currentChapter: input.currentChapter } : {}),
    ...derived,
  };

  if (statusChanged && input.status === ReadingStatus.READING) {
    data.startedAt = existing.startedAt ?? now;
    data.lastReadAt = now;
    data.finishedAt = null;
  }
  if (statusChanged && input.status === ReadingStatus.READ) {
    data.finishedAt = now;
    data.progress = 100;
    if (existing.book.pageCount) data.currentPage = existing.book.pageCount;
  }
  if (derived.currentPage !== undefined || derived.progress !== undefined) {
    data.lastReadAt = now;
  }

  const entry = await prisma.userBook.update({
    where: { userId_bookId: { userId, bookId } },
    data,
    include: { book: { select: bookCardSelect } },
  });

  // Cada avanco de leitura vira um evento — e o que alimenta as estatisticas.
  if (derived.currentPage !== undefined || derived.progress !== undefined) {
    const pagesDelta = Math.max(0, (derived.currentPage ?? 0) - existing.currentPage);
    await prisma.readingProgress.create({
      data: {
        userBookId: entry.id,
        userId,
        bookId,
        page: entry.currentPage,
        percent: entry.progress,
        pagesDelta,
        note: input.note,
      },
    });
  }

  if (statusChanged && input.status === ReadingStatus.READ) {
    track({
      name: PRODUCT_EVENTS.BOOK_FINISHED,
      userId,
      entityType: 'book',
      entityId: bookId,
      metadata: { pages: existing.book.pageCount ?? null },
    });
  } else if (derived.currentPage !== undefined || derived.progress !== undefined) {
    track({ name: PRODUCT_EVENTS.READING_PROGRESS, userId, entityType: 'book', entityId: bookId });
  }

  await refreshBookAggregates(bookId);
  if (input.status === ReadingStatus.READ) {
    await prisma.profile.update({
      where: { userId },
      data: { booksReadCount: await prisma.userBook.count({ where: { userId, status: ReadingStatus.READ } }) },
    });
  }
  await evaluateAchievements(userId);

  return serializeEntry(entry);
}

export async function removeFromLibrary(userId: string, bookId: string) {
  await prisma.userBook.delete({ where: { userId_bookId: { userId, bookId } } }).catch(() => {
    throw ApiError.notFound('Este livro nao esta na sua biblioteca.');
  });
  await refreshBookAggregates(bookId);
  return { removed: true };
}

export async function listLibrary(userId: string, status?: ReadingStatus) {
  const entries = await prisma.userBook.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: { book: { select: bookCardSelect } },
    orderBy: [{ lastReadAt: 'desc' }, { updatedAt: 'desc' }],
  });

  const counts = await prisma.userBook.groupBy({ by: ['status'], where: { userId }, _count: true });

  return {
    items: entries.map(serializeEntry),
    counts: {
      WANT_TO_READ: 0,
      READING: 0,
      PAUSED: 0,
      ABANDONED: 0,
      READ: 0,
      ...Object.fromEntries(counts.map((c) => [c.status, c._count])),
    } as Record<ReadingStatus, number>,
  };
}

export async function getCurrentlyReading(userId: string, take = 6) {
  const entries = await prisma.userBook.findMany({
    where: { userId, status: ReadingStatus.READING },
    include: { book: { select: bookCardSelect } },
    orderBy: [{ lastReadAt: 'desc' }, { updatedAt: 'desc' }],
    take,
  });
  return entries.map(serializeEntry);
}

type EntryWithBook = { book: Parameters<typeof serializeBook>[0] } & {
  status: ReadingStatus;
  rating: number | null;
  isFavorite: boolean;
  currentPage: number;
  progress: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  lastReadAt: Date | null;
};

function serializeEntry(entry: EntryWithBook) {
  return {
    status: entry.status,
    rating: entry.rating,
    isFavorite: entry.isFavorite,
    currentPage: entry.currentPage,
    progress: entry.progress,
    startedAt: entry.startedAt,
    finishedAt: entry.finishedAt,
    lastReadAt: entry.lastReadAt,
    book: serializeBook(entry.book),
  };
}

// -- Resenhas ---------------------------------------------------------------

export async function upsertReview(
  userId: string,
  bookId: string,
  input: { rating: number; title?: string; content: string; containsSpoiler?: boolean },
) {
  const review = await prisma.review.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, ...input },
    update: input,
  });

  // Resenhar implica ter uma nota: mantemos a biblioteca coerente.
  await prisma.userBook.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, status: ReadingStatus.READ, rating: input.rating, finishedAt: new Date(), progress: 100 },
    update: { rating: input.rating },
  });

  await refreshBookAggregates(bookId);
  await evaluateAchievements(userId);
  return review;
}

export async function deleteReview(userId: string, bookId: string) {
  await prisma.review.delete({ where: { userId_bookId: { userId, bookId } } }).catch(() => {
    throw ApiError.notFound('Resenha nao encontrada.');
  });
  return { removed: true };
}
