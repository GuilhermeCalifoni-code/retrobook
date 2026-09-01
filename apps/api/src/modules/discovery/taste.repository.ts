import { MembershipStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { emptyProfile, type CompatibilityInput } from '../../shared/compatibility';

/**
 * Carrega o "perfil de gosto" de varios usuarios em 4 queries agregadas,
 * em vez de N queries por usuario. E o insumo do calculo de compatibilidade.
 */
export async function loadTasteProfiles(userIds: string[]): Promise<Map<string, CompatibilityInput>> {
  const map = new Map<string, CompatibilityInput>();
  if (userIds.length === 0) return map;
  for (const id of userIds) map.set(id, emptyProfile());

  const [userBooks, interests, memberships] = await Promise.all([
    prisma.userBook.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        bookId: true,
        rating: true,
        book: {
          select: {
            authors: { select: { authorId: true } },
            genres: { select: { genreId: true } },
          },
        },
      },
    }),
    prisma.userGenre.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, genreId: true },
    }),
    prisma.communityMember.findMany({
      where: { userId: { in: userIds }, status: MembershipStatus.ACTIVE },
      select: { userId: true, communityId: true },
    }),
  ]);

  for (const ub of userBooks) {
    const profile = map.get(ub.userId);
    if (!profile) continue;
    profile.bookIds.add(ub.bookId);
    if (ub.rating != null) profile.ratings.set(ub.bookId, ub.rating);
    for (const a of ub.book.authors) profile.authorIds.add(a.authorId);
    for (const g of ub.book.genres) profile.genreIds.add(g.genreId);
  }
  for (const i of interests) map.get(i.userId)?.genreIds.add(i.genreId);
  for (const m of memberships) map.get(m.userId)?.communityIds.add(m.communityId);

  return map;
}

/**
 * Candidatos a conexao: pessoas que tocam pelo menos um dos meus sinais.
 * Buscamos por livro, genero e comunidade e unimos os ids antes de pontuar,
 * o que evita varrer a base inteira.
 */
export async function findCandidateUserIds(userId: string, limit = 120): Promise<string[]> {
  const [myBooks, myGenres, myCommunities] = await Promise.all([
    prisma.userBook.findMany({ where: { userId }, select: { bookId: true }, take: 200 }),
    prisma.userGenre.findMany({ where: { userId }, select: { genreId: true } }),
    prisma.communityMember.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      select: { communityId: true },
    }),
  ]);

  const bookIds = myBooks.map((b) => b.bookId);
  const genreIds = myGenres.map((g) => g.genreId);
  const communityIds = myCommunities.map((c) => c.communityId);

  const [byBook, byGenre, byCommunity] = await Promise.all([
    bookIds.length
      ? prisma.userBook.findMany({
          where: { bookId: { in: bookIds }, userId: { not: userId } },
          select: { userId: true },
          distinct: ['userId'],
          take: limit,
        })
      : [],
    genreIds.length
      ? prisma.userGenre.findMany({
          where: { genreId: { in: genreIds }, userId: { not: userId } },
          select: { userId: true },
          distinct: ['userId'],
          take: limit,
        })
      : [],
    communityIds.length
      ? prisma.communityMember.findMany({
          where: {
            communityId: { in: communityIds },
            userId: { not: userId },
            status: MembershipStatus.ACTIVE,
          },
          select: { userId: true },
          distinct: ['userId'],
          take: limit,
        })
      : [],
  ]);

  const ids = new Set<string>();
  for (const row of [...byBook, ...byGenre, ...byCommunity]) ids.add(row.userId);

  // Rede vazia (usuario recem-chegado): sugere leitores ativos para nao entregar tela vazia.
  if (ids.size === 0) {
    const fallback = await prisma.user.findMany({
      where: { id: { not: userId }, profile: { visibility: 'PUBLIC' } },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 24,
    });
    for (const u of fallback) ids.add(u.id);
  }

  return Array.from(ids).slice(0, limit);
}
