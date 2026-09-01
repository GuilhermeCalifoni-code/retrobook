import { MembershipStatus, ReadingStatus } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { buildCursorPage } from '../../common/http';
import { slugify, uniqueSlug } from '../../common/text';
import { prisma } from '../../database/prisma';
import { getBookProvider, type ExternalBook } from '../../services/book-provider';
import {
  bookCardSelect,
  communityCardSelect,
  postCardSelect,
  publicUserSelect,
  serializeBook,
  serializeCommunity,
  serializePost,
  serializeUser,
} from '../../shared/selectors';

/**
 * Importa um livro do provedor externo para o acervo local.
 * O catalogo local e o "cache canonico": e nele que penduramos leitores,
 * discussoes e comunidades — o provedor e apenas a fonte dos metadados.
 */
export async function importExternalBook(external: ExternalBook) {
  const existing = await prisma.book.findFirst({
    where: {
      OR: [
        { provider: external.provider, externalId: external.externalId },
        ...(external.isbn13 ? [{ isbn13: external.isbn13 }] : []),
      ],
    },
    select: bookCardSelect,
  });
  if (existing) return existing;

  const slug = await uniqueSlug(external.title, async (candidate) =>
    Boolean(await prisma.book.findUnique({ where: { slug: candidate }, select: { id: true } })),
  );

  const authorIds = await Promise.all(
    external.authors.slice(0, 4).map(async (name) => {
      const authorSlug = slugify(name) || 'autor';
      const author = await prisma.author.upsert({
        where: { slug: authorSlug },
        update: {},
        create: { slug: authorSlug, name },
      });
      return author.id;
    }),
  );

  const genreIds = await Promise.all(
    external.categories.slice(0, 4).map(async (name) => {
      const genreSlug = slugify(name) || 'geral';
      const genre = await prisma.genre.upsert({
        where: { slug: genreSlug },
        update: {},
        create: { slug: genreSlug, name },
      });
      return genre.id;
    }),
  );

  return prisma.book.create({
    data: {
      slug,
      provider: external.provider,
      externalId: external.externalId,
      title: external.title,
      subtitle: external.subtitle ?? undefined,
      description: external.description ?? undefined,
      coverUrl: external.coverUrl ?? undefined,
      pageCount: external.pageCount ?? undefined,
      publishedYear: external.publishedYear ?? undefined,
      publisher: external.publisher ?? undefined,
      language: external.language ?? 'pt-BR',
      isbn13: external.isbn13 ?? undefined,
      isbn10: external.isbn10 ?? undefined,
      authors: { create: authorIds.map((authorId, order) => ({ authorId, order })) },
      genres: { create: genreIds.map((genreId) => ({ genreId })) },
    },
    select: bookCardSelect,
  });
}

/**
 * Busca hibrida: primeiro o acervo local (instantaneo e ja com contadores
 * sociais), completando com o provedor externo quando o resultado for magro.
 */
export async function searchBooks(query: string, limit = 12) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const local = await prisma.book.findMany({
    where: {
      OR: [
        { title: { contains: trimmed, mode: 'insensitive' } },
        { subtitle: { contains: trimmed, mode: 'insensitive' } },
        { authors: { some: { author: { name: { contains: trimmed, mode: 'insensitive' } } } } },
      ],
    },
    select: bookCardSelect,
    orderBy: [{ readersCount: 'desc' }, { ratingsCount: 'desc' }],
    take: limit,
  });

  if (local.length >= Math.min(limit, 6)) return local.map(serializeBook);

  const provider = getBookProvider();
  if (provider.name === 'local') return local.map(serializeBook);

  try {
    const externals = await provider.search({ query: trimmed, limit });
    const imported = [];
    for (const external of externals.slice(0, limit)) {
      imported.push(await importExternalBook(external));
    }
    const seen = new Set(local.map((b) => b.id));
    return [...local, ...imported.filter((b) => !seen.has(b.id))].slice(0, limit).map(serializeBook);
  } catch (error) {
    // Provedor externo indisponivel nao pode derrubar a busca: degradamos para o local.
    console.warn('[retrobook:books] provedor externo indisponivel', error);
    return local.map(serializeBook);
  }
}

export async function listBooks(opts: {
  genre?: string;
  sort?: 'popular' | 'rating' | 'recent';
  cursor?: string;
  take?: number;
}) {
  const take = Math.min(opts.take ?? 24, 48);
  const orderBy =
    opts.sort === 'rating'
      ? [{ ratingsAvg: 'desc' as const }, { ratingsCount: 'desc' as const }]
      : opts.sort === 'recent'
        ? [{ createdAt: 'desc' as const }]
        : [{ readersCount: 'desc' as const }, { ratingsCount: 'desc' as const }];

  const rows = await prisma.book.findMany({
    where: opts.genre ? { genres: { some: { genre: { slug: opts.genre } } } } : undefined,
    select: bookCardSelect,
    orderBy: [...orderBy, { id: 'asc' }],
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const page = buildCursorPage(rows, take);
  return { ...page, items: page.items.map(serializeBook) };
}

export async function getBookDetail(slugOrId: string, viewerId?: string) {
  const book = await prisma.book.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
    include: {
      authors: { include: { author: true }, orderBy: { order: 'asc' } },
      genres: { include: { genre: true } },
    },
  });
  if (!book) throw ApiError.notFound('Nao encontramos esse livro.');

  const [readers, communities, discussions, reviews, similar, myEntry, ratingStats] = await Promise.all([
    prisma.userBook.findMany({
      where: {
        bookId: book.id,
        status: { in: [ReadingStatus.READING, ReadingStatus.READ] },
        user: { profile: { visibility: 'PUBLIC', showCurrentlyReading: true } },
        ...(viewerId ? { userId: { not: viewerId } } : {}),
      },
      include: { user: { select: publicUserSelect } },
      orderBy: { lastReadAt: 'desc' },
      take: 12,
    }),
    prisma.community.findMany({
      where: { books: { some: { bookId: book.id } }, privacy: 'PUBLIC' },
      select: communityCardSelect,
      orderBy: { membersCount: 'desc' },
      take: 4,
    }),
    prisma.post.findMany({
      where: { bookId: book.id, isRemoved: false },
      select: postCardSelect,
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.review.findMany({
      where: { bookId: book.id },
      include: { user: { select: publicUserSelect } },
      orderBy: [{ likesCount: 'desc' }, { createdAt: 'desc' }],
      take: 6,
    }),
    prisma.book.findMany({
      where: {
        id: { not: book.id },
        genres: { some: { genreId: { in: book.genres.map((g) => g.genreId) } } },
      },
      select: bookCardSelect,
      orderBy: { readersCount: 'desc' },
      take: 6,
    }),
    viewerId
      ? prisma.userBook.findUnique({ where: { userId_bookId: { userId: viewerId, bookId: book.id } } })
      : null,
    prisma.userBook.groupBy({
      by: ['rating'],
      where: { bookId: book.id, rating: { not: null } },
      _count: true,
    }),
  ]);

  const distribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: ratingStats.find((r) => r.rating === star)?._count ?? 0,
  }));

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle,
    description: book.description,
    coverUrl: book.coverUrl,
    pageCount: book.pageCount,
    publishedYear: book.publishedYear,
    publisher: book.publisher,
    language: book.language,
    isbn13: book.isbn13,
    ratingsAvg: Number(book.ratingsAvg.toFixed(2)),
    ratingsCount: book.ratingsCount,
    readersCount: book.readersCount,
    readingCount: book.readingCount,
    authors: book.authors.map((a) => ({ id: a.author.id, name: a.author.name, slug: a.author.slug, bio: a.author.bio })),
    genres: book.genres.map((g) => ({ id: g.genre.id, name: g.genre.name, slug: g.genre.slug })),
    ratingDistribution: distribution,
    readers: readers.map((r) => ({ ...serializeUser(r.user), status: r.status, progress: r.progress })),
    communities: communities.map(serializeCommunity),
    discussions: discussions.map((p) => serializePost(p)),
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      content: r.content,
      containsSpoiler: r.containsSpoiler,
      likesCount: r.likesCount,
      createdAt: r.createdAt,
      author: serializeUser(r.user),
    })),
    similar: similar.map(serializeBook),
    viewerEntry: myEntry
      ? {
          status: myEntry.status,
          rating: myEntry.rating,
          progress: myEntry.progress,
          currentPage: myEntry.currentPage,
          isFavorite: myEntry.isFavorite,
        }
      : null,
  };
}

/** "Voce e mais 38 pessoas estao lendo Duna." */
export async function getBookReaders(bookId: string, viewerId?: string) {
  const [count, sample] = await Promise.all([
    prisma.userBook.count({ where: { bookId, status: ReadingStatus.READING } }),
    prisma.userBook.findMany({
      where: {
        bookId,
        status: ReadingStatus.READING,
        user: { profile: { visibility: 'PUBLIC' } },
        ...(viewerId ? { userId: { not: viewerId } } : {}),
      },
      include: { user: { select: publicUserSelect } },
      take: 8,
    }),
  ]);
  return { count, readers: sample.map((r) => serializeUser(r.user)) };
}

/** Recalcula media e contadores do livro apos mudanca de biblioteca ou nota. */
export async function refreshBookAggregates(bookId: string) {
  const [ratingAgg, readers, reading] = await Promise.all([
    prisma.userBook.aggregate({
      where: { bookId, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.userBook.count({ where: { bookId, status: { in: [ReadingStatus.READING, ReadingStatus.READ] } } }),
    prisma.userBook.count({ where: { bookId, status: ReadingStatus.READING } }),
  ]);

  await prisma.book.update({
    where: { id: bookId },
    data: {
      ratingsAvg: ratingAgg._avg.rating ?? 0,
      ratingsCount: ratingAgg._count.rating,
      readersCount: readers,
      readingCount: reading,
    },
  });
}

export async function listGenres() {
  const genres = await prisma.genre.findMany({
    where: { isCustom: false },
    orderBy: { name: 'asc' },
    include: { _count: { select: { books: true } } },
  });
  return genres.map((g) => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    description: g.description,
    booksCount: g._count.books,
  }));
}

export async function getCommunitiesForBook(bookId: string) {
  const communities = await prisma.community.findMany({
    where: { books: { some: { bookId } }, privacy: { not: 'PRIVATE' } },
    select: communityCardSelect,
    orderBy: { membersCount: 'desc' },
    take: 6,
  });
  return communities.map(serializeCommunity);
}

export async function getMembershipCommunityIds(userId: string) {
  const rows = await prisma.communityMember.findMany({
    where: { userId, status: MembershipStatus.ACTIVE },
    select: { communityId: true },
  });
  return rows.map((r) => r.communityId);
}

/** Resolve slug ou id para o id interno sem carregar o agregado completo. */
export async function resolveBookId(slugOrId: string) {
  const book = await prisma.book.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
    select: { id: true },
  });
  if (!book) throw ApiError.notFound('Livro nao encontrado.');
  return book.id;
}
