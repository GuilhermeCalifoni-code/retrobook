import { MembershipStatus, ReadingStatus, type Prisma } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { prisma } from '../../database/prisma';
import { bookCardSelect, communityCardSelect, serializeBook, serializeCommunity, serializeUser, publicUserSelect } from '../../shared/selectors';
import { computeCompatibility } from '../../shared/compatibility';
import { loadTasteProfiles } from '../discovery/taste.repository';
import { loadTasteContext, recommendPeople } from '../recommendations/recommendation.engine';
import { createNotification } from '../notifications/notifications.service';
import { PRODUCT_EVENTS, track } from '../analytics/events.service';

export async function getSessionUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      subscription: { include: { plan: true } },
    },
  });
  if (!user || !user.profile) throw ApiError.unauthorized();

  const [unreadNotifications, communitiesCount, booksCount] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.communityMember.count({ where: { userId, status: MembershipStatus.ACTIVE } }),
    prisma.userBook.count({ where: { userId } }),
  ]);

  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.emailVerifiedAt),
    isAdmin: user.isAdmin,
    profile: {
      name: user.profile.name,
      username: user.profile.username,
      bio: user.profile.bio,
      avatarUrl: user.profile.avatarUrl,
      coverUrl: user.profile.coverUrl,
      location: user.profile.location,
      website: user.profile.website,
      pronouns: user.profile.pronouns,
      goal: user.profile.goal,
      onboardingCompleted: user.profile.onboardingCompleted,
      onboardingStep: user.profile.onboardingStep,
      followersCount: user.profile.followersCount,
      followingCount: user.profile.followingCount,
    },
    settings: {
      visibility: user.profile.visibility,
      showLibrary: user.profile.showLibrary,
      showCurrentlyReading: user.profile.showCurrentlyReading,
      showActivity: user.profile.showActivity,
      showCommunities: user.profile.showCommunities,
      allowMessages: user.profile.allowMessages,
      theme: user.profile.theme,
      spoilerPreference: user.profile.spoilerPreference,
      notifyComments: user.profile.notifyComments,
      notifyFollowers: user.profile.notifyFollowers,
      notifyCommunities: user.profile.notifyCommunities,
      notifyRecommendations: user.profile.notifyRecommendations,
      notifyMessages: user.profile.notifyMessages,
    },
    plan: user.subscription
      ? {
          tier: user.subscription.plan.tier,
          name: user.subscription.plan.name,
          status: user.subscription.status,
          maxCommunities: user.subscription.plan.maxCommunities,
          maxMembersPerCommunity: user.subscription.plan.maxMembersPerCommunity,
          allowPrivateCommunities: user.subscription.plan.allowPrivateCommunities,
          allowAnalytics: user.subscription.plan.allowAnalytics,
          advancedModeration: user.subscription.plan.advancedModeration,
        }
      : null,
    counters: { unreadNotifications, communitiesCount, booksCount },
  };
}

export type SessionUser = Awaited<ReturnType<typeof getSessionUser>>;

/** Regras de privacidade da secao 50 aplicadas na leitura de perfil alheio. */
function visibilityFor(profile: { visibility: string; showLibrary: boolean; showCurrentlyReading: boolean; showActivity: boolean; showCommunities: boolean }, isSelf: boolean, isFollower: boolean) {
  const restricted = profile.visibility === 'PRIVATE' && !isSelf && !isFollower;
  return {
    restricted,
    library: isSelf || (!restricted && profile.showLibrary),
    currentlyReading: isSelf || (!restricted && profile.showCurrentlyReading),
    activity: isSelf || (!restricted && profile.showActivity),
    communities: isSelf || (!restricted && profile.showCommunities),
  };
}

export async function getPublicProfile(username: string, viewerId?: string) {
  const user = await prisma.user.findFirst({
    where: { profile: { username } },
    include: { profile: true },
  });
  if (!user || !user.profile) throw ApiError.notFound('Nao encontramos esse leitor.');

  const isSelf = viewerId === user.id;
  const [isFollowing, followsViewer] = await Promise.all([
    viewerId
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
        })
      : null,
    viewerId
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: user.id, followingId: viewerId } },
        })
      : null,
  ]);

  const vis = visibilityFor(user.profile, isSelf, Boolean(isFollowing));

  const [currentlyReading, favorites, recentlyRead, communities, reviews, achievements, interests, stats] =
    await Promise.all([
      vis.currentlyReading
        ? prisma.userBook.findMany({
            where: { userId: user.id, status: ReadingStatus.READING },
            include: { book: { select: bookCardSelect } },
            orderBy: { lastReadAt: 'desc' },
            take: 6,
          })
        : [],
      vis.library
        ? prisma.userBook.findMany({
            where: { userId: user.id, isFavorite: true },
            include: { book: { select: bookCardSelect } },
            take: 8,
          })
        : [],
      vis.library
        ? prisma.userBook.findMany({
            where: { userId: user.id, status: ReadingStatus.READ },
            include: { book: { select: bookCardSelect } },
            orderBy: { finishedAt: 'desc' },
            take: 8,
          })
        : [],
      vis.communities
        ? prisma.communityMember.findMany({
            where: { userId: user.id, status: MembershipStatus.ACTIVE, community: { privacy: 'PUBLIC' } },
            include: { community: { select: communityCardSelect } },
            take: 8,
          })
        : [],
      vis.activity
        ? prisma.review.findMany({
            where: { userId: user.id },
            include: { book: { select: bookCardSelect } },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        : [],
      prisma.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
      }),
      prisma.userGenre.findMany({ where: { userId: user.id }, include: { genre: true }, take: 12 }),
      prisma.userBook.groupBy({ by: ['status'], where: { userId: user.id }, _count: true }),
    ]);

  const compatibility = viewerId && !isSelf ? await getCompatibilityBetween(viewerId, user.id) : null;

  return {
    id: user.id,
    name: user.profile.name,
    username: user.profile.username,
    bio: user.profile.bio,
    avatarUrl: user.profile.avatarUrl,
    coverUrl: user.profile.coverUrl,
    location: user.profile.location,
    website: user.profile.website,
    pronouns: user.profile.pronouns,
    joinedAt: user.createdAt,
    isSelf,
    viewerIsFollowing: Boolean(isFollowing),
    followsViewer: Boolean(followsViewer),
    allowMessages: user.profile.allowMessages,
    visibility: { ...vis },
    followersCount: user.profile.followersCount,
    followingCount: user.profile.followingCount,
    stats: Object.fromEntries(stats.map((s) => [s.status, s._count])) as Record<string, number>,
    currentlyReading: currentlyReading.map((ub) => ({
      ...serializeBook(ub.book),
      progress: ub.progress,
      currentPage: ub.currentPage,
    })),
    favorites: favorites.map((ub) => serializeBook(ub.book)),
    recentlyRead: recentlyRead.map((ub) => ({ ...serializeBook(ub.book), rating: ub.rating })),
    communities: communities.map((m) => serializeCommunity(m.community)),
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      content: r.content,
      containsSpoiler: r.containsSpoiler,
      createdAt: r.createdAt,
      book: serializeBook(r.book),
    })),
    achievements: achievements.map((a) => ({
      code: a.achievement.code,
      name: a.achievement.name,
      description: a.achievement.description,
      icon: a.achievement.icon,
      unlockedAt: a.unlockedAt,
    })),
    interests: interests.map((i) => ({ id: i.genre.id, name: i.genre.name, slug: i.genre.slug })),
    compatibility,
  };
}

export async function getCompatibilityBetween(viewerId: string, otherId: string) {
  const profiles = await loadTasteProfiles([viewerId, otherId]);
  const a = profiles.get(viewerId);
  const b = profiles.get(otherId);
  if (!a || !b) return null;
  const result = computeCompatibility(a, b);

  const [books, genres, communities] = await Promise.all([
    result.sharedBookIds.length
      ? prisma.book.findMany({ where: { id: { in: result.sharedBookIds.slice(0, 6) } }, select: bookCardSelect })
      : [],
    result.sharedGenreIds.length
      ? prisma.genre.findMany({ where: { id: { in: result.sharedGenreIds.slice(0, 6) } } })
      : [],
    result.sharedCommunityIds.length
      ? prisma.community.findMany({
          where: { id: { in: result.sharedCommunityIds.slice(0, 4) } },
          select: communityCardSelect,
        })
      : [],
  ]);

  /**
   * "Voces deveriam conversar sobre" (secao 8).
   *
   * O numero sozinho nao gera conversa. Estes sao os assuntos concretos onde
   * as duas estantes se encostam — com prioridade para o que ambos avaliaram
   * bem, porque concordar sobre um livro rende mais que apenas te-lo lido.
   */
  const bothRated = result.sharedBookIds.filter((id) => a.ratings.has(id) && b.ratings.has(id));
  const starters: { type: 'book' | 'community'; id: string; slug: string; title: string; hint: string }[] = [];

  for (const book of books) {
    const mine = a.ratings.get(book.id);
    const theirs = b.ratings.get(book.id);
    const agreed = mine != null && theirs != null && Math.abs(mine - theirs) <= 1;
    starters.push({
      type: 'book',
      id: book.id,
      slug: book.slug,
      title: book.title,
      hint: agreed ? 'Voces deram notas parecidas' : 'Os dois leram',
    });
  }
  for (const community of communities.slice(0, 2)) {
    starters.push({
      type: 'community',
      id: community.id,
      slug: community.slug,
      title: community.name,
      hint: 'Voces participam',
    });
  }

  return {
    score: result.score,
    reasons: result.reasons,
    sharedBooks: books.map(serializeBook),
    sharedGenres: genres.map((g) => ({ id: g.id, name: g.name, slug: g.slug })),
    sharedCommunities: communities.map(serializeCommunity),
    /** Assuntos prontos para puxar conversa, ordenados por potencial. */
    conversationStarters: starters
      .sort((x, y) => (y.hint === 'Voces deram notas parecidas' ? 1 : 0) - (x.hint === 'Voces deram notas parecidas' ? 1 : 0))
      .slice(0, 4),
    agreementCount: bothRated.length,
  };
}

export async function followUser(followerId: string, targetUsername: string) {
  const target = await prisma.user.findFirst({
    where: { profile: { username: targetUsername } },
    select: { id: true, profile: { select: { name: true, username: true } } },
  });
  if (!target) throw ApiError.notFound('Leitor nao encontrado.');
  if (target.id === followerId) throw ApiError.badRequest('Voce nao pode seguir a si mesmo.');

  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: target.id, blockedId: followerId },
        { blockerId: followerId, blockedId: target.id },
      ],
    },
  });
  if (blocked) throw ApiError.forbidden('Nao e possivel seguir este perfil.');

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: target.id } },
  });
  if (existing) return { following: true };

  await prisma.$transaction([
    prisma.follow.create({ data: { followerId, followingId: target.id } }),
    prisma.profile.update({ where: { userId: target.id }, data: { followersCount: { increment: 1 } } }),
    prisma.profile.update({ where: { userId: followerId }, data: { followingCount: { increment: 1 } } }),
  ]);

  track({ name: PRODUCT_EVENTS.USER_FOLLOWED, userId: followerId, entityType: 'user', entityId: target.id });

  const follower = await prisma.profile.findUnique({ where: { userId: followerId } });
  await createNotification({
    userId: target.id,
    actorId: followerId,
    type: 'FOLLOW',
    title: `${follower?.name ?? 'Alguem'} comecou a seguir voce.`,
    href: `/u/${follower?.username ?? ''}`,
    entityType: 'user',
    entityId: followerId,
    preferenceKey: 'notifyFollowers',
  });

  return { following: true };
}

export async function unfollowUser(followerId: string, targetUsername: string) {
  const target = await prisma.user.findFirst({
    where: { profile: { username: targetUsername } },
    select: { id: true },
  });
  if (!target) throw ApiError.notFound('Leitor nao encontrado.');
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: target.id } },
  });
  if (!existing) return { following: false };

  await prisma.$transaction([
    prisma.follow.delete({ where: { followerId_followingId: { followerId, followingId: target.id } } }),
    prisma.profile.update({ where: { userId: target.id }, data: { followersCount: { decrement: 1 } } }),
    prisma.profile.update({ where: { userId: followerId }, data: { followingCount: { decrement: 1 } } }),
  ]);
  return { following: false };
}

export async function listConnections(username: string, kind: 'followers' | 'following') {
  const user = await prisma.user.findFirst({ where: { profile: { username } }, select: { id: true } });
  if (!user) throw ApiError.notFound('Leitor nao encontrado.');

  const rows =
    kind === 'followers'
      ? await prisma.follow.findMany({
          where: { followingId: user.id },
          include: { follower: { select: publicUserSelect } },
          take: 60,
          orderBy: { createdAt: 'desc' },
        })
      : await prisma.follow.findMany({
          where: { followerId: user.id },
          include: { following: { select: publicUserSelect } },
          take: 60,
          orderBy: { createdAt: 'desc' },
        });

  return rows.map((r) => serializeUser(kind === 'followers' ? (r as any).follower : (r as any).following));
}

/**
 * O coracao do produto: pessoas ordenadas por compatibilidade literaria,
 * com as razoes visiveis para o usuario entender *por que* apareceram.
 */
export async function getSuggestedPeople(viewerId: string, options: { limit?: number; bookId?: string } = {}) {
  const context = await loadTasteContext(viewerId);
  const results = await recommendPeople(context, options.limit ?? 12, options.bookId);
  return results.map((entry) => ({ ...entry.item, reasons: entry.reasons }));
}

export async function updateProfile(
  userId: string,
  data: Prisma.ProfileUpdateInput & { username?: string },
) {
  if (data.username && typeof data.username === 'string') {
    const taken = await prisma.profile.findFirst({
      where: { username: data.username, NOT: { userId } },
      select: { id: true },
    });
    if (taken) throw ApiError.conflict('Esse nome de usuario ja foi escolhido.', 'username_taken');
  }
  const profile = await prisma.profile.update({ where: { userId }, data });
  return profile;
}

export async function searchPeople(query: string, viewerId?: string, limit = 12) {
  const users = await prisma.user.findMany({
    where: {
      profile: {
        visibility: 'PUBLIC',
        OR: [{ name: { contains: query, mode: 'insensitive' } }, { username: { contains: query, mode: 'insensitive' } }],
      },
      ...(viewerId ? { id: { not: viewerId } } : {}),
    },
    select: publicUserSelect,
    take: limit,
  });
  return users.map(serializeUser);
}
