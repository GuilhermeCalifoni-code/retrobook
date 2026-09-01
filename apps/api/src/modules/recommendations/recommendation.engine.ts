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
import { computeCompatibility } from '../../shared/compatibility';
import { loadTasteProfiles, findCandidateUserIds } from '../discovery/taste.repository';
import {
  plural,
  rank,
  saturate,
  WEIGHTS,
  type Recommendation,
  type RecommendationReason,
} from './recommendation.types';

/**
 * Motor de recomendacao do RetroBook.
 *
 * Centraliza o que antes vivia espalhado em communities, discovery e users.
 * Uma unica leitura do "perfil de gosto" do usuario alimenta livros, pessoas,
 * comunidades e discussoes — o que evita repetir as mesmas consultas caras
 * quatro vezes para montar uma Home.
 *
 * Toda saida carrega `reasons`. Quando nao ha sinal nenhum (usuario novo),
 * o motor devolve resultados populares **rotulados como populares**, em vez de
 * fingir personalizacao.
 */

export interface TasteContext {
  userId: string;
  bookIds: Set<string>;
  finishedBookIds: Set<string>;
  authorIds: Set<string>;
  genreIds: Set<string>;
  communityIds: Set<string>;
  followingIds: Set<string>;
  ratings: Map<string, number>;
  /** Nomes para montar rotulos legiveis sem consultar de novo. */
  genreNames: Map<string, string>;
  authorNames: Map<string, string>;
}

/** Carrega tudo que o motor precisa saber sobre uma pessoa, de uma vez so. */
export async function loadTasteContext(userId: string): Promise<TasteContext> {
  const [userBooks, interests, memberships, following] = await Promise.all([
    prisma.userBook.findMany({
      where: { userId },
      select: {
        bookId: true,
        rating: true,
        status: true,
        book: {
          select: {
            authors: { select: { author: { select: { id: true, name: true } } } },
            genres: { select: { genre: { select: { id: true, name: true } } } },
          },
        },
      },
    }),
    prisma.userGenre.findMany({
      where: { userId },
      select: { genreId: true, genre: { select: { name: true } } },
    }),
    prisma.communityMember.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      select: { communityId: true },
    }),
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
  ]);

  const context: TasteContext = {
    userId,
    bookIds: new Set(),
    finishedBookIds: new Set(),
    authorIds: new Set(),
    genreIds: new Set(),
    communityIds: new Set(memberships.map((m) => m.communityId)),
    followingIds: new Set(following.map((f) => f.followingId)),
    ratings: new Map(),
    genreNames: new Map(),
    authorNames: new Map(),
  };

  for (const entry of userBooks) {
    context.bookIds.add(entry.bookId);
    if (entry.status === ReadingStatus.READ) context.finishedBookIds.add(entry.bookId);
    if (entry.rating != null) context.ratings.set(entry.bookId, entry.rating);
    for (const a of entry.book.authors) {
      context.authorIds.add(a.author.id);
      context.authorNames.set(a.author.id, a.author.name);
    }
    for (const g of entry.book.genres) {
      context.genreIds.add(g.genre.id);
      context.genreNames.set(g.genre.id, g.genre.name);
    }
  }
  for (const interest of interests) {
    context.genreIds.add(interest.genreId);
    context.genreNames.set(interest.genreId, interest.genre.name);
  }

  return context;
}

// ---------------------------------------------------------------------------
// Livros
// ---------------------------------------------------------------------------

export async function recommendBooks(context: TasteContext, limit = 8) {
  const excluded = Array.from(context.bookIds);
  const genreIds = Array.from(context.genreIds);
  const authorIds = Array.from(context.authorIds);

  // Quem le o que eu leio: base da recomendacao por co-ocorrencia.
  const peers = excluded.length
    ? await prisma.userBook.findMany({
        where: { bookId: { in: excluded }, userId: { not: context.userId } },
        select: { userId: true },
        distinct: ['userId'],
        take: 150,
      })
    : [];
  const peerIds = peers.map((p) => p.userId);

  const [peerPicks, byGenre, byAuthor, readingNow] = await Promise.all([
    peerIds.length
      ? prisma.userBook.groupBy({
          by: ['bookId'],
          where: {
            userId: { in: peerIds },
            bookId: excluded.length ? { notIn: excluded } : undefined,
            rating: { gte: 4 },
          },
          _count: true,
          orderBy: { _count: { bookId: 'desc' } },
          take: limit * 3,
        })
      : [],
    genreIds.length
      ? prisma.book.findMany({
          where: {
            id: excluded.length ? { notIn: excluded } : undefined,
            genres: { some: { genreId: { in: genreIds } } },
          },
          select: { ...bookCardSelect, genres: { select: { genreId: true, genre: true } } },
          orderBy: [{ ratingsAvg: 'desc' }, { readersCount: 'desc' }],
          take: limit * 2,
        })
      : [],
    authorIds.length
      ? prisma.book.findMany({
          where: {
            id: excluded.length ? { notIn: excluded } : undefined,
            authors: { some: { authorId: { in: authorIds } } },
          },
          select: { ...bookCardSelect, authors: { select: { authorId: true, author: true }, orderBy: { order: 'asc' } } },
          take: limit,
        })
      : [],
    prisma.book.findMany({
      where: { id: excluded.length ? { notIn: excluded } : undefined, readingCount: { gt: 0 } },
      select: bookCardSelect,
      orderBy: { readingCount: 'desc' },
      take: limit,
    }),
  ]);

  const scored = new Map<string, { raw: number; reasons: RecommendationReason[] }>();
  const bump = (bookId: string, weight: number, reason: RecommendationReason) => {
    const current = scored.get(bookId) ?? { raw: 0, reasons: [] };
    current.raw += weight;
    if (!current.reasons.some((r) => r.kind === reason.kind)) current.reasons.push(reason);
    scored.set(bookId, current);
  };

  for (const pick of peerPicks) {
    bump(pick.bookId, WEIGHTS.peerRating * Math.min(pick._count, 4), {
      kind: 'peer_recommended',
      weight: WEIGHTS.peerRating,
      count: pick._count,
      label: `${plural(pick._count, 'leitor parecido com voce recomenda', 'leitores parecidos com voce recomendam')}`,
    });
  }

  for (const book of byGenre) {
    const match = book.genres.find((g) => context.genreIds.has(g.genreId));
    if (!match) continue;
    bump(book.id, WEIGHTS.genreMatch, {
      kind: 'genre_match',
      weight: WEIGHTS.genreMatch,
      label: `Combina com ${match.genre.name}`,
    });
  }

  for (const book of byAuthor) {
    const match = book.authors.find((a) => context.authorIds.has(a.authorId));
    if (!match) continue;
    bump(book.id, WEIGHTS.authorMatch, {
      kind: 'author_match',
      weight: WEIGHTS.authorMatch,
      label: `De ${match.author.name}, que voce ja leu`,
    });
  }

  for (const book of readingNow) {
    if (book.readingCount < 2) continue;
    bump(book.id, WEIGHTS.readingNow, {
      kind: 'reading_now',
      weight: WEIGHTS.readingNow,
      count: book.readingCount,
      label: `${plural(book.readingCount, 'pessoa lendo agora', 'pessoas lendo agora')}`,
    });
  }

  const ids = Array.from(scored.keys());
  if (ids.length === 0) return fallbackBooks(excluded, limit);

  const books = await prisma.book.findMany({ where: { id: { in: ids } }, select: bookCardSelect });
  const bookMap = new Map(books.map((b) => [b.id, b]));

  const ranked = rank(
    ids
      .filter((id) => bookMap.has(id))
      .map((id) => {
        const entry = scored.get(id)!;
        return { item: serializeBook(bookMap.get(id)!), score: saturate(entry.raw), reasons: entry.reasons };
      }),
    limit,
  );

  return ranked.length ? ranked : fallbackBooks(excluded, limit);
}

/** Usuario sem sinal nenhum: mostramos o que e popular, dizendo que e popular. */
async function fallbackBooks(excluded: string[], limit: number): Promise<Recommendation<ReturnType<typeof serializeBook>>[]> {
  const books = await prisma.book.findMany({
    where: { id: excluded.length ? { notIn: excluded } : undefined },
    select: bookCardSelect,
    orderBy: [{ readersCount: 'desc' }, { ratingsAvg: 'desc' }],
    take: limit,
  });
  return books.map((book) => ({
    item: serializeBook(book),
    score: 20,
    reasons: [{ kind: 'popular', weight: WEIGHTS.popular, label: 'Em alta no RetroBook' }],
  }));
}

/**
 * Descoberta serendipita (secao 20).
 *
 * Procura de proposito **fora** dos generos que a pessoa declara: livros bem
 * avaliados por leitores de alta afinidade, em territorio que ela nao pediria.
 * E o "voce provavelmente nao procuraria por isso" — sem virar aleatoriedade,
 * porque o caminho ate ali passa por gente com gosto parecido.
 */
export async function recommendSerendipity(context: TasteContext, limit = 4) {
  const myBooks = Array.from(context.bookIds);
  if (myBooks.length === 0) return [];

  const peers = await prisma.userBook.findMany({
    where: { bookId: { in: myBooks }, userId: { not: context.userId } },
    select: { userId: true },
    distinct: ['userId'],
    take: 60,
  });
  if (peers.length === 0) return [];

  const candidates = await prisma.userBook.findMany({
    where: {
      userId: { in: peers.map((p) => p.userId) },
      bookId: { notIn: myBooks },
      rating: { gte: 5 },
      // O ponto da secao: generos que NAO estao no meu mapa de interesses.
      book: { genres: { none: { genreId: { in: Array.from(context.genreIds) } } } },
    },
    select: { bookId: true, book: { select: { ...bookCardSelect, genres: { select: { genre: true } } } } },
    take: 40,
  });

  const tally = new Map<string, { count: number; book: (typeof candidates)[number]['book'] }>();
  for (const candidate of candidates) {
    const current = tally.get(candidate.bookId) ?? { count: 0, book: candidate.book };
    current.count += 1;
    tally.set(candidate.bookId, current);
  }

  return Array.from(tally.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ count, book }) => ({
      item: serializeBook(book),
      score: saturate(count * WEIGHTS.serendipity),
      reasons: [
        {
          kind: 'serendipity' as const,
          weight: WEIGHTS.serendipity,
          count,
          label: book.genres[0]
            ? `Fora do seu radar, mas leitores como voce amaram — ${book.genres[0].genre.name}`
            : 'Fora do seu radar, mas leitores como voce amaram',
        },
      ],
    }));
}

// ---------------------------------------------------------------------------
// Pessoas
// ---------------------------------------------------------------------------

export async function recommendPeople(context: TasteContext, limit = 8, bookId?: string) {
  const candidateIds = bookId
    ? (
        await prisma.userBook.findMany({
          where: { bookId, userId: { not: context.userId } },
          select: { userId: true },
          take: 120,
        })
      ).map((r) => r.userId)
    : await findCandidateUserIds(context.userId);

  if (candidateIds.length === 0) return [];

  const profiles = await loadTasteProfiles([context.userId, ...candidateIds]);
  const mine = profiles.get(context.userId);
  if (!mine) return [];

  const scored = candidateIds
    .map((id) => {
      const other = profiles.get(id);
      if (!other) return null;
      const result = computeCompatibility(mine, other);
      if (result.score === 0) return null;

      const reasons: RecommendationReason[] = result.reasons.map((reason) => ({
        kind:
          reason.kind === 'books'
            ? ('shared_books' as const)
            : reason.kind === 'authors'
              ? ('shared_authors' as const)
              : reason.kind === 'genres'
                ? ('shared_genres' as const)
                : ('shared_communities' as const),
        weight:
          reason.kind === 'books'
            ? WEIGHTS.sharedBook
            : reason.kind === 'authors'
              ? WEIGHTS.sharedAuthor
              : reason.kind === 'genres'
                ? WEIGHTS.sharedGenre
                : WEIGHTS.sharedCommunity,
        count: reason.count,
        label: reason.label,
      }));

      return { id, score: result.score, reasons, shared: result };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const [users, alreadyFollowing] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: scored.map((s) => s.id) }, profile: { isNot: null } },
      select: publicUserSelect,
    }),
    prisma.follow.findMany({
      where: { followerId: context.userId, followingId: { in: scored.map((s) => s.id) } },
      select: { followingId: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const followingSet = new Set(alreadyFollowing.map((f) => f.followingId));

  return scored
    .filter((s) => userMap.has(s.id))
    .map((s) => ({
      item: {
        ...serializeUser(userMap.get(s.id)!),
        compatibility: s.score,
        viewerIsFollowing: followingSet.has(s.id),
        sharedBookIds: s.shared.sharedBookIds.slice(0, 6),
        sharedCommunityIds: s.shared.sharedCommunityIds.slice(0, 4),
        sharedBooksCount: s.shared.sharedBookIds.length,
        sharedGenresCount: s.shared.sharedGenreIds.length,
        sharedCommunitiesCount: s.shared.sharedCommunityIds.length,
      },
      score: s.score,
      reasons: s.reasons,
    }));
}

// ---------------------------------------------------------------------------
// Comunidades
// ---------------------------------------------------------------------------

export async function recommendCommunities(context: TasteContext, limit = 6) {
  const exclude = Array.from(context.communityIds);
  const genreIds = Array.from(context.genreIds);
  const bookIds = Array.from(context.bookIds);
  const recentSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const communities = await prisma.community.findMany({
    where: {
      id: exclude.length ? { notIn: exclude } : undefined,
      isArchived: false,
      privacy: { in: [CommunityPrivacy.PUBLIC, CommunityPrivacy.EXCLUSIVE] },
    },
    select: {
      ...communityCardSelect,
      genreId: true,
      books: { select: { bookId: true } },
      members: { where: { userId: { in: Array.from(context.followingIds) } }, select: { userId: true } },
      _count: { select: { posts: { where: { createdAt: { gte: recentSince } } } } },
    },
    orderBy: [{ membersCount: 'desc' }],
    take: limit * 4,
  });

  const scored = communities.map((community) => {
    const reasons: RecommendationReason[] = [];
    let raw = 0;

    const sharedBooks = community.books.filter((b) => context.bookIds.has(b.bookId)).length;
    if (sharedBooks > 0) {
      raw += WEIGHTS.sharedBook * sharedBooks;
      reasons.push({
        kind: 'shared_books',
        weight: WEIGHTS.sharedBook,
        count: sharedBooks,
        label: `${plural(sharedBooks, 'livro da sua estante', 'livros da sua estante')} por aqui`,
      });
    }

    if (community.genreId && context.genreIds.has(community.genreId)) {
      raw += WEIGHTS.genreMatch;
      reasons.push({
        kind: 'genre_match',
        weight: WEIGHTS.genreMatch,
        label: `Combina com ${context.genreNames.get(community.genreId) ?? community.genre?.name ?? 'seus interesses'}`,
      });
    }

    // Quem eu sigo ja esta la: sinal social forte.
    if (community.members.length > 0) {
      raw += WEIGHTS.sharedCommunity * community.members.length;
      reasons.push({
        kind: 'shared_communities',
        weight: WEIGHTS.sharedCommunity,
        count: community.members.length,
        label: `${plural(community.members.length, 'pessoa que voce segue participa', 'pessoas que voce segue participam')}`,
      });
    }

    if (community._count.posts >= 3) {
      raw += WEIGHTS.communityActivity;
      reasons.push({
        kind: 'community_activity',
        weight: WEIGHTS.communityActivity,
        count: community._count.posts,
        label: `${plural(community._count.posts, 'discussao nas ultimas semanas', 'discussoes nas ultimas semanas')}`,
      });
    }

    return { item: serializeCommunity(community), score: saturate(raw), reasons };
  });

  const ranked = rank(scored, limit);
  if (ranked.length > 0) return ranked;

  return communities.slice(0, limit).map((community) => ({
    item: serializeCommunity(community),
    score: 20,
    reasons: [{ kind: 'popular' as const, weight: WEIGHTS.popular, label: 'Entre as maiores do RetroBook' }],
  }));
}

// ---------------------------------------------------------------------------
// Discussoes
// ---------------------------------------------------------------------------

export async function recommendDiscussions(context: TasteContext, limit = 6) {
  const bookIds = Array.from(context.bookIds);
  const communityIds = Array.from(context.communityIds);
  const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

  const posts = await prisma.post.findMany({
    where: {
      isRemoved: false,
      authorId: { not: context.userId },
      createdAt: { gte: since },
      OR: [
        ...(bookIds.length ? [{ bookId: { in: bookIds } }] : []),
        ...(communityIds.length ? [{ communityId: { in: communityIds } }] : []),
        ...(context.followingIds.size ? [{ authorId: { in: Array.from(context.followingIds) } }] : []),
      ],
      AND: [{ OR: [{ communityId: null }, { community: { privacy: { not: CommunityPrivacy.PRIVATE } } }, { communityId: { in: communityIds } }] }],
    },
    select: postCardSelect,
    orderBy: [{ commentsCount: 'desc' }, { createdAt: 'desc' }],
    take: limit * 2,
  });

  const scored = posts.map((post) => {
    const reasons: RecommendationReason[] = [];
    let raw = 0;

    if (post.book && context.bookIds.has(post.book.id)) {
      raw += WEIGHTS.sharedBook;
      reasons.push({
        kind: 'shared_books',
        weight: WEIGHTS.sharedBook,
        label: `Sobre ${post.book.title}, da sua estante`,
      });
    }
    if (post.community && context.communityIds.has(post.community.id)) {
      raw += WEIGHTS.sharedCommunity;
      reasons.push({
        kind: 'community_activity',
        weight: WEIGHTS.sharedCommunity,
        label: `Na sua comunidade ${post.community.name}`,
      });
    }
    if (context.followingIds.has(post.author.id)) {
      raw += WEIGHTS.sharedAuthor;
      reasons.push({
        kind: 'shared_communities',
        weight: WEIGHTS.sharedAuthor,
        label: `De ${post.author.profile?.name ?? 'alguem'}, que voce segue`,
      });
    }
    if (post.commentsCount >= 2) {
      raw += WEIGHTS.communityActivity;
      reasons.push({
        kind: 'community_activity',
        weight: WEIGHTS.communityActivity,
        count: post.commentsCount,
        label: `Conversa ativa: ${plural(post.commentsCount, 'resposta', 'respostas')}`,
      });
    }

    return { item: serializePost(post), score: saturate(raw), reasons };
  });

  return rank(scored, limit);
}

// ---------------------------------------------------------------------------
// Fachada
// ---------------------------------------------------------------------------

/** Tudo que a Home precisa, com uma unica leitura do perfil de gosto. */
export async function recommendEverything(userId: string) {
  const context = await loadTasteContext(userId);

  const [books, people, communities, discussions, serendipity] = await Promise.all([
    recommendBooks(context, 8),
    recommendPeople(context, 6),
    recommendCommunities(context, 6),
    recommendDiscussions(context, 5),
    recommendSerendipity(context, 3),
  ]);

  return { context, books, people, communities, discussions, serendipity };
}
