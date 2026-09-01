import { CommunityPrivacy, MembershipStatus, ReadingStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';
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
import { searchBooks } from '../books/books.service';
import { loadTasteContext, recommendBooks } from '../recommendations/recommendation.engine';

/**
 * Busca global (secao 27): resultados agrupados por tipo, em uma unica chamada.
 * O cliente aplica debounce; aqui limitamos cada grupo para manter a resposta leve.
 */
export async function globalSearch(query: string, viewerId?: string) {
  const q = query.trim();
  if (q.length < 2) return { books: [], people: [], communities: [], discussions: [] };

  const [books, people, communities, discussions] = await Promise.all([
    searchBooks(q, 6),
    prisma.user.findMany({
      where: {
        profile: {
          visibility: 'PUBLIC',
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
          ],
        },
        ...(viewerId ? { id: { not: viewerId } } : {}),
      },
      select: publicUserSelect,
      take: 5,
    }),
    prisma.community.findMany({
      where: {
        isArchived: false,
        privacy: { in: [CommunityPrivacy.PUBLIC, CommunityPrivacy.EXCLUSIVE] },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
        ],
      },
      select: communityCardSelect,
      orderBy: { membersCount: 'desc' },
      take: 5,
    }),
    prisma.post.findMany({
      where: {
        isRemoved: false,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
        AND: [{ OR: [{ communityId: null }, { community: { privacy: CommunityPrivacy.PUBLIC } }] }],
      },
      select: postCardSelect,
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    books,
    people: people.map(serializeUser),
    communities: communities.map(serializeCommunity),
    discussions: discussions.map((p) => serializePost(p)),
  };
}

/** Aba "Em alta" do Explorar: sinal de atividade recente, nao apenas acumulo historico. */
export async function getTrending(viewerId?: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [posts, books, communities] = await Promise.all([
    prisma.post.findMany({
      where: {
        isRemoved: false,
        createdAt: { gte: since },
        OR: [{ communityId: null }, { community: { privacy: CommunityPrivacy.PUBLIC } }],
      },
      select: postCardSelect,
      orderBy: [{ likesCount: 'desc' }, { commentsCount: 'desc' }],
      take: 10,
    }),
    prisma.book.findMany({
      where: { readingCount: { gt: 0 } },
      select: bookCardSelect,
      orderBy: [{ readingCount: 'desc' }, { ratingsAvg: 'desc' }],
      take: 12,
    }),
    prisma.community.findMany({
      where: { privacy: CommunityPrivacy.PUBLIC, isArchived: false },
      select: communityCardSelect,
      orderBy: [{ postsCount: 'desc' }, { membersCount: 'desc' }],
      take: 8,
    }),
  ]);

  return {
    discussions: posts.map((p) => serializePost(p)),
    books: books.map(serializeBook),
    communities: communities.map(serializeCommunity),
  };
}

export async function exploreDiscussions(opts: { genre?: string; take?: number }) {
  const rows = await prisma.post.findMany({
    where: {
      isRemoved: false,
      OR: [{ communityId: null }, { community: { privacy: CommunityPrivacy.PUBLIC } }],
      ...(opts.genre ? { book: { genres: { some: { genre: { slug: opts.genre } } } } } : {}),
    },
    select: postCardSelect,
    orderBy: { createdAt: 'desc' },
    take: Math.min(opts.take ?? 20, 40),
  });
  return rows.map((p) => serializePost(p));
}

// A Home vive em home.service.ts e as recomendacoes em recommendations/.
// Este modulo cuida apenas de busca e das listagens de Explorar.
export { getHomeDashboard, getFriendsActivity } from './home.service';

/**
 * Recomendacao de livros: fachada fina sobre o motor central, mantida para
 * nao quebrar quem ja consome /discovery/books/recommended.
 */
export async function getRecommendedBooks(userId: string, take = 8) {
  const context = await loadTasteContext(userId);
  const results = await recommendBooks(context, take);
  return results.map((entry) => ({ ...entry.item, reason: entry.reasons[0]?.label }));
}
