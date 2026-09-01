import { CommunityPrivacy, CommunityRole, MembershipStatus, type Prisma } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { buildCursorPage } from '../../common/http';
import { extractTags, slugify, stripHtml, uniqueSlug } from '../../common/text';
import { prisma } from '../../database/prisma';
import {
  bookCardSelect,
  communityCardSelect,
  publicUserSelect,
  serializeBook,
  serializeCommunity,
  serializeUser,
} from '../../shared/selectors';
import { createNotification } from '../notifications/notifications.service';
import { evaluateAchievements } from '../achievements/achievements.service';
import { assertCanCreateCommunity, assertCommunityHasRoom, getUserPlan } from '../subscriptions/plans.service';
import { loadTasteContext, recommendCommunities } from '../recommendations/recommendation.engine';
import { PRODUCT_EVENTS, track } from '../analytics/events.service';
import { computePulse } from './community-pulse.service';
import {
  getActiveMembers,
  getFeaturedBook,
  getFeaturedDiscussion,
  getRecentActivity,
} from './community-activity.service';
import {
  assertCanAdminister,
  canModerate,
  canPost,
  canViewContent,
  getMembership,
  isActiveMember,
  outranks,
  type Membership,
} from './communities.permissions';

export interface CreateCommunityInput {
  name: string;
  tagline?: string;
  description: string;
  genreSlug?: string;
  tags?: string[];
  avatarUrl?: string;
  coverUrl?: string;
  accentColor?: string;
  privacy: CommunityPrivacy;
  requireApproval?: boolean;
  allowMemberPosts?: boolean;
  requirePostApproval?: boolean;
  rules?: { title: string; description?: string }[];
  bookIds?: string[];
}

async function attachTags(communityId: string, tags: string[]) {
  for (const slug of tags) {
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: { usageCount: { increment: 1 } },
      create: { slug, name: slug.replace(/-/g, ' ') },
    });
    await prisma.communityTag.upsert({
      where: { communityId_tagId: { communityId, tagId: tag.id } },
      update: {},
      create: { communityId, tagId: tag.id },
    });
  }
}

export async function createCommunity(userId: string, input: CreateCommunityInput) {
  await assertCanCreateCommunity(userId, input.privacy);

  const slug = await uniqueSlug(input.name, async (candidate) =>
    Boolean(await prisma.community.findUnique({ where: { slug: candidate }, select: { id: true } })),
  );

  const genre = input.genreSlug
    ? await prisma.genre.findUnique({ where: { slug: input.genreSlug }, select: { id: true } })
    : null;

  const community = await prisma.community.create({
    data: {
      slug,
      name: stripHtml(input.name),
      tagline: input.tagline ? stripHtml(input.tagline) : undefined,
      description: stripHtml(input.description),
      genreId: genre?.id,
      avatarUrl: input.avatarUrl,
      coverUrl: input.coverUrl,
      accentColor: input.accentColor,
      privacy: input.privacy,
      requireApproval: input.requireApproval ?? input.privacy === CommunityPrivacy.EXCLUSIVE,
      allowMemberPosts: input.allowMemberPosts ?? true,
      requirePostApproval: input.requirePostApproval ?? false,
      ownerId: userId,
      membersCount: 1,
      members: { create: { userId, role: CommunityRole.OWNER, status: MembershipStatus.ACTIVE } },
      rules: {
        create: (input.rules ?? []).slice(0, 12).map((rule, order) => ({
          order,
          title: stripHtml(rule.title),
          description: rule.description ? stripHtml(rule.description) : undefined,
        })),
      },
      books: input.bookIds?.length ? { create: input.bookIds.slice(0, 12).map((bookId) => ({ bookId })) } : undefined,
    },
    select: communityCardSelect,
  });

  await attachTags(community.id, extractTags(input.tags));
  track({
    name: PRODUCT_EVENTS.COMMUNITY_CREATED,
    userId,
    entityType: 'community',
    entityId: community.id,
    metadata: { privacy: input.privacy },
  });
  await evaluateAchievements(userId);

  return serializeCommunity(community);
}

export async function updateCommunity(communityId: string, userId: string, input: Partial<CreateCommunityInput>) {
  await assertCanAdminister(communityId, userId);

  if (input.privacy && input.privacy !== CommunityPrivacy.PUBLIC) {
    const community = await prisma.community.findUniqueOrThrow({
      where: { id: communityId },
      select: { ownerId: true },
    });
    const plan = await getUserPlan(community.ownerId);
    if (!plan.allowPrivateCommunities) {
      throw ApiError.planLimit('Comunidades privadas fazem parte do plano Pro.', { feature: 'private_communities' });
    }
  }

  const data: Prisma.CommunityUpdateInput = {};
  if (input.name) data.name = stripHtml(input.name);
  if (input.tagline !== undefined) data.tagline = input.tagline ? stripHtml(input.tagline) : null;
  if (input.description) data.description = stripHtml(input.description);
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
  if (input.coverUrl !== undefined) data.coverUrl = input.coverUrl;
  if (input.accentColor !== undefined) data.accentColor = input.accentColor;
  if (input.privacy) data.privacy = input.privacy;
  if (input.requireApproval !== undefined) data.requireApproval = input.requireApproval;
  if (input.allowMemberPosts !== undefined) data.allowMemberPosts = input.allowMemberPosts;
  if (input.requirePostApproval !== undefined) data.requirePostApproval = input.requirePostApproval;
  if (input.genreSlug) {
    const genre = await prisma.genre.findUnique({ where: { slug: input.genreSlug }, select: { id: true } });
    if (genre) data.genre = { connect: { id: genre.id } };
  }

  const community = await prisma.community.update({
    where: { id: communityId },
    data,
    select: communityCardSelect,
  });

  if (input.tags) {
    await prisma.communityTag.deleteMany({ where: { communityId } });
    await attachTags(communityId, extractTags(input.tags));
  }

  return serializeCommunity(community);
}

export async function listCommunities(opts: {
  viewerId?: string;
  query?: string;
  genre?: string;
  tag?: string;
  sort?: 'popular' | 'active' | 'recent';
  cursor?: string;
  take?: number;
  onlyMine?: boolean;
}) {
  const take = Math.min(opts.take ?? 18, 40);

  const where: Prisma.CommunityWhereInput = {
    isArchived: false,
    // Comunidades privadas so aparecem na descoberta para quem ja e membro.
    ...(opts.onlyMine && opts.viewerId
      ? { members: { some: { userId: opts.viewerId, status: MembershipStatus.ACTIVE } } }
      : {
          OR: [
            { privacy: { in: [CommunityPrivacy.PUBLIC, CommunityPrivacy.EXCLUSIVE] } },
            ...(opts.viewerId
              ? [{ members: { some: { userId: opts.viewerId, status: MembershipStatus.ACTIVE } } }]
              : []),
          ],
        }),
    ...(opts.query
      ? {
          AND: [
            {
              OR: [
                { name: { contains: opts.query, mode: 'insensitive' as const } },
                { description: { contains: opts.query, mode: 'insensitive' as const } },
                { tagline: { contains: opts.query, mode: 'insensitive' as const } },
              ],
            },
          ],
        }
      : {}),
    ...(opts.genre ? { genre: { slug: opts.genre } } : {}),
    ...(opts.tag ? { tags: { some: { tag: { slug: opts.tag } } } } : {}),
  };

  const orderBy: Prisma.CommunityOrderByWithRelationInput[] =
    opts.sort === 'recent'
      ? [{ createdAt: 'desc' }]
      : opts.sort === 'active'
        ? [{ postsCount: 'desc' }, { membersCount: 'desc' }]
        : [{ membersCount: 'desc' }, { postsCount: 'desc' }];

  const rows = await prisma.community.findMany({
    where,
    select: communityCardSelect,
    orderBy: [...orderBy, { id: 'asc' }],
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const page = buildCursorPage(rows, take);

  const memberships = opts.viewerId
    ? await prisma.communityMember.findMany({
        where: { userId: opts.viewerId, communityId: { in: page.items.map((c) => c.id) } },
        select: { communityId: true, status: true, role: true },
      })
    : [];
  const membershipMap = new Map(memberships.map((m) => [m.communityId, m]));

  return {
    ...page,
    items: page.items.map((c) => ({
      ...serializeCommunity(c),
      viewerMembership: membershipMap.get(c.id) ?? null,
    })),
  };
}

export async function getCommunityDetail(slug: string, viewerId?: string) {
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      genre: true,
      tags: { include: { tag: true } },
      rules: { orderBy: { order: 'asc' } },
      owner: { select: publicUserSelect },
      books: { include: { book: { select: bookCardSelect } }, take: 12 },
    },
  });
  if (!community) throw ApiError.notFound('Comunidade nao encontrada.');

  const membership = await getMembership(community.id, viewerId);
  const visible = canViewContent(community, membership);

  const [moderators, memberSample, similar, pendingRequests, plan] = await Promise.all([
    prisma.communityMember.findMany({
      where: {
        communityId: community.id,
        status: MembershipStatus.ACTIVE,
        role: { in: [CommunityRole.OWNER, CommunityRole.ADMIN, CommunityRole.MODERATOR] },
      },
      include: { user: { select: publicUserSelect } },
      orderBy: { role: 'asc' },
    }),
    visible
      ? prisma.communityMember.findMany({
          where: { communityId: community.id, status: MembershipStatus.ACTIVE },
          include: { user: { select: publicUserSelect } },
          orderBy: { joinedAt: 'desc' },
          take: 12,
        })
      : [],
    // Similares com razao (secao 12): reaproveita o motor em vez de repetir
    // uma heuristica so de genero, que era o que existia aqui antes.
    findSimilarCommunities(community.id, community.genreId, viewerId, 4),
    canModerate(membership)
      ? prisma.communityMember.count({
          where: { communityId: community.id, status: MembershipStatus.PENDING },
        })
      : Promise.resolve(0),
    getUserPlan(community.ownerId),
  ]);

  // Segunda onda: tudo que da vida a pagina (secoes 4 a 10).
  const [pulse, featured, activity, activeMembers, featuredBook, belonging] = await Promise.all([
    computePulse(community.id),
    visible ? getFeaturedDiscussion(community.id, viewerId) : Promise.resolve(null),
    visible ? getRecentActivity(community.id, 5) : Promise.resolve([]),
    visible ? getActiveMembers(community.id, viewerId, 6) : Promise.resolve([]),
    visible ? getFeaturedBook(community.id) : Promise.resolve(null),
    viewerId ? getBelonging(community.id, viewerId) : Promise.resolve(null),
  ]);

  const isFull = community.membersCount >= plan.maxMembersPerCommunity;

  return {
    ...serializeCommunity({ ...community, tags: community.tags }),
    createdAt: community.createdAt,
    owner: serializeUser(community.owner),
    allowMemberPosts: community.allowMemberPosts,
    requireApproval: community.requireApproval,
    rules: community.rules.map((r) => ({ id: r.id, order: r.order, title: r.title, description: r.description })),
    books: community.books.map((b) => serializeBook(b.book)),
    moderators: moderators.map((m) => ({ ...serializeUser(m.user), role: m.role })),
    members: memberSample.map((m) => ({ ...serializeUser(m.user), role: m.role, joinedAt: m.joinedAt })),
    similar,
    pulse,
    featuredDiscussion: featured,
    recentActivity: activity,
    activeMembers,
    featuredBook,
    /** "Voce pertence a este lugar" (secao 30). */
    belonging,
    capacity: {
      membersCount: community.membersCount,
      limit: plan.maxMembersPerCommunity,
      tier: plan.tier,
      // Calculado aqui, nao na tela: a regra de plano e do backend.
      isFull,
    },
    viewer: {
      membership: membership
        ? { role: membership.role, status: membership.status, mutedUntil: membership.mutedUntil }
        : null,
      canViewContent: visible,
      canPost: canPost(membership, community),
      canModerate: canModerate(membership),
      isOwner: membership?.role === CommunityRole.OWNER,
      pendingRequests,
    },
  };
}

/**
 * Comunidades semelhantes com razao explicita (secao 12).
 * Cruza genero, livros e sobreposicao de membros — nunca aleatorio.
 */
async function findSimilarCommunities(
  communityId: string,
  genreId: string | null,
  viewerId: string | undefined,
  limit: number,
) {
  const [books, members] = await Promise.all([
    prisma.communityBook.findMany({ where: { communityId }, select: { bookId: true } }),
    prisma.communityMember.findMany({
      where: { communityId, status: MembershipStatus.ACTIVE },
      select: { userId: true },
      take: 100,
    }),
  ]);

  const bookIds = books.map((b) => b.bookId);
  const memberIds = members.map((m) => m.userId);

  const candidates = await prisma.community.findMany({
    where: {
      id: { not: communityId },
      isArchived: false,
      privacy: { in: [CommunityPrivacy.PUBLIC, CommunityPrivacy.EXCLUSIVE] },
      OR: [
        ...(genreId ? [{ genreId }] : []),
        ...(bookIds.length ? [{ books: { some: { bookId: { in: bookIds } } } }] : []),
        ...(memberIds.length
          ? [{ members: { some: { userId: { in: memberIds }, status: MembershipStatus.ACTIVE } } }]
          : []),
      ],
    },
    select: {
      ...communityCardSelect,
      genreId: true,
      books: { where: { bookId: { in: bookIds.length ? bookIds : ['-'] } }, select: { bookId: true } },
      members: {
        where: { userId: { in: memberIds.length ? memberIds : ['-'] }, status: MembershipStatus.ACTIVE },
        select: { userId: true },
      },
    },
    orderBy: { membersCount: 'desc' },
    take: limit * 3,
  });

  return candidates
    .map((candidate) => {
      const sharedBooks = candidate.books.length;
      const sharedMembers = candidate.members.length;
      const sameGenre = Boolean(genreId && candidate.genreId === genreId);

      const reasons: string[] = [];
      if (sharedBooks > 0) {
        reasons.push(`${sharedBooks} ${sharedBooks === 1 ? 'livro em comum' : 'livros em comum'}`);
      }
      if (sharedMembers > 1) {
        reasons.push(`${sharedMembers} membros em comum`);
      }
      if (sameGenre && candidate.genre) {
        reasons.push(`Tambem sobre ${candidate.genre.name}`);
      }

      const score = sharedBooks * 4 + sharedMembers * 2 + (sameGenre ? 3 : 0);
      return { ...serializeCommunity(candidate), reasons, score };
    })
    .filter((c) => c.reasons.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...rest }) => rest);
}

/**
 * "Voce pertence a este lugar" (secao 30).
 * O que este leitor especifico tem em comum com quem ja esta aqui.
 */
async function getBelonging(communityId: string, viewerId: string) {
  const [communityBooks, myBooks, communityGenre, myGenres, sharedCommunities] = await Promise.all([
    prisma.communityBook.findMany({ where: { communityId }, select: { bookId: true } }),
    prisma.userBook.findMany({ where: { userId: viewerId }, select: { bookId: true } }),
    prisma.community.findUnique({ where: { id: communityId }, select: { genreId: true, genre: true } }),
    prisma.userGenre.findMany({ where: { userId: viewerId }, select: { genreId: true } }),
    // Comunidades que compartilho com os membros daqui.
    prisma.communityMember.count({
      where: {
        userId: viewerId,
        status: MembershipStatus.ACTIVE,
        community: {
          id: { not: communityId },
          members: {
            some: {
              status: MembershipStatus.ACTIVE,
              user: { memberships: { some: { communityId, status: MembershipStatus.ACTIVE } } },
            },
          },
        },
      },
    }),
  ]);

  const myBookIds = new Set(myBooks.map((b) => b.bookId));
  const sharedBooks = communityBooks.filter((b) => myBookIds.has(b.bookId)).length;
  const genreMatch = Boolean(
    communityGenre?.genreId && myGenres.some((g) => g.genreId === communityGenre.genreId),
  );

  const reasons: string[] = [];
  if (sharedBooks > 0) {
    reasons.push(`${sharedBooks} ${sharedBooks === 1 ? 'livro da sua estante' : 'livros da sua estante'}`);
  }
  if (genreMatch && communityGenre?.genre) reasons.push(`${communityGenre.genre.name} e um dos seus generos`);
  if (sharedCommunities > 0) {
    reasons.push(`${sharedCommunities} ${sharedCommunities === 1 ? 'comunidade em comum' : 'comunidades em comum'}`);
  }

  return reasons.length > 0 ? { reasons, sharedBooks } : null;
}

export async function joinCommunity(slug: string, userId: string) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw ApiError.notFound('Comunidade nao encontrada.');

  const existing = await getMembership(community.id, userId);
  if (existing?.status === MembershipStatus.BANNED) {
    throw ApiError.forbidden('Voce nao pode entrar nesta comunidade.');
  }
  if (existing?.status === MembershipStatus.ACTIVE) {
    return { status: MembershipStatus.ACTIVE, role: existing.role };
  }
  if (existing?.status === MembershipStatus.PENDING) {
    return { status: MembershipStatus.PENDING, role: existing.role };
  }

  const needsApproval = community.requireApproval || community.privacy !== CommunityPrivacy.PUBLIC;

  if (!needsApproval) {
    await assertCommunityHasRoom(community.id);
    await prisma.$transaction([
      prisma.communityMember.upsert({
        where: { communityId_userId: { communityId: community.id, userId } },
        create: { communityId: community.id, userId, status: MembershipStatus.ACTIVE },
        update: { status: MembershipStatus.ACTIVE },
      }),
      prisma.community.update({ where: { id: community.id }, data: { membersCount: { increment: 1 } } }),
    ]);
    const joined = await prisma.communityMember.count({ where: { userId, status: MembershipStatus.ACTIVE } });
    track({
      name: joined === 1 ? PRODUCT_EVENTS.FIRST_COMMUNITY_JOINED : PRODUCT_EVENTS.COMMUNITY_JOINED,
      userId,
      entityType: 'community',
      entityId: community.id,
    });
    await evaluateAchievements(userId);
    return { status: MembershipStatus.ACTIVE, role: CommunityRole.MEMBER };
  }

  await prisma.communityMember.upsert({
    where: { communityId_userId: { communityId: community.id, userId } },
    create: { communityId: community.id, userId, status: MembershipStatus.PENDING },
    update: { status: MembershipStatus.PENDING },
  });

  const profile = await prisma.profile.findUnique({ where: { userId } });
  await createNotification({
    userId: community.ownerId,
    actorId: userId,
    type: 'COMMUNITY_JOIN_REQUEST',
    title: `${profile?.name ?? 'Alguem'} pediu para entrar em ${community.name}.`,
    href: `/c/${community.slug}/membros`,
    entityType: 'community',
    entityId: community.id,
    preferenceKey: 'notifyCommunities',
  });

  return { status: MembershipStatus.PENDING, role: CommunityRole.MEMBER };
}

export async function leaveCommunity(slug: string, userId: string) {
  const community = await prisma.community.findUnique({ where: { slug }, select: { id: true, ownerId: true } });
  if (!community) throw ApiError.notFound('Comunidade nao encontrada.');
  if (community.ownerId === userId) {
    throw ApiError.badRequest('Transfira a comunidade antes de sair — voce e a pessoa responsavel por ela.');
  }

  const membership = await getMembership(community.id, userId);
  if (!membership) return { left: true };

  await prisma.$transaction([
    prisma.communityMember.delete({ where: { communityId_userId: { communityId: community.id, userId } } }),
    ...(membership.status === MembershipStatus.ACTIVE
      ? [prisma.community.update({ where: { id: community.id }, data: { membersCount: { decrement: 1 } } })]
      : []),
  ]);
  return { left: true };
}

export async function listMembers(
  slug: string,
  viewerId: string | undefined,
  opts: {
    status?: MembershipStatus;
    take?: number;
    cursor?: string;
    query?: string;
    sort?: 'recent' | 'active' | 'alphabetical';
  },
) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw ApiError.notFound('Comunidade nao encontrada.');

  const membership = await getMembership(community.id, viewerId);
  if (!canViewContent(community, membership)) throw ApiError.forbidden('Esta comunidade e privada.');

  const status = opts.status ?? MembershipStatus.ACTIVE;
  if (status !== MembershipStatus.ACTIVE && !canModerate(membership)) {
    throw ApiError.forbidden('Apenas moderadores veem solicitacoes.');
  }

  const take = Math.min(opts.take ?? 30, 60);

  const orderBy =
    opts.sort === 'alphabetical'
      ? [{ user: { profile: { name: 'asc' as const } } }]
      : [{ role: 'asc' as const }, { joinedAt: 'desc' as const }];

  const rows = await prisma.communityMember.findMany({
    where: {
      communityId: community.id,
      status,
      ...(opts.query
        ? {
            user: {
              profile: {
                OR: [
                  { name: { contains: opts.query, mode: 'insensitive' as const } },
                  { username: { contains: opts.query, mode: 'insensitive' as const } },
                ],
              },
            },
          }
        : {}),
    },
    include: { user: { select: publicUserSelect } },
    orderBy,
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const page = buildCursorPage(rows, take);

  // "34 ativos hoje" diz muito mais que "2.431 membros" (secao 29).
  const today = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [activeToday, totalActive] = await Promise.all([
    prisma.post
      .findMany({
        where: { communityId: community.id, createdAt: { gte: today }, isRemoved: false },
        select: { authorId: true },
        distinct: ['authorId'],
      })
      .then(async (posts) => {
        const commenters = await prisma.comment.findMany({
          where: { post: { communityId: community.id }, createdAt: { gte: today }, isRemoved: false },
          select: { authorId: true },
          distinct: ['authorId'],
        });
        return new Set([...posts.map((p) => p.authorId), ...commenters.map((c) => c.authorId)]).size;
      }),
    prisma.communityMember.count({ where: { communityId: community.id, status: MembershipStatus.ACTIVE } }),
  ]);

  // Quem participou nos ultimos 30 dias, para marcar os cards.
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recentPosters, recentCommenters] = await Promise.all([
    prisma.post.findMany({
      where: {
        communityId: community.id,
        createdAt: { gte: monthAgo },
        authorId: { in: page.items.map((m) => m.userId) },
      },
      select: { authorId: true },
      distinct: ['authorId'],
    }),
    prisma.comment.findMany({
      where: {
        post: { communityId: community.id },
        createdAt: { gte: monthAgo },
        authorId: { in: page.items.map((m) => m.userId) },
      },
      select: { authorId: true },
      distinct: ['authorId'],
    }),
  ]);
  const activeSet = new Set([...recentPosters.map((p) => p.authorId), ...recentCommenters.map((c) => c.authorId)]);

  let items = page.items.map((m) => ({
    ...serializeUser(m.user),
    membershipId: m.id,
    role: m.role,
    status: m.status,
    mutedUntil: m.mutedUntil,
    joinedAt: m.joinedAt,
    isActive: activeSet.has(m.userId),
  }));

  if (opts.sort === 'active') {
    items = items.sort((a, b) => Number(b.isActive) - Number(a.isActive));
  }

  return { ...page, items, activeToday, totalActive };
}

// -- Moderacao (secao 21) ----------------------------------------------------

async function loadTargetMembership(communityId: string, targetUserId: string) {
  const target = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId: targetUserId } },
  });
  if (!target) throw ApiError.notFound('Esta pessoa nao faz parte da comunidade.');
  return target;
}

async function requireCommunity(slug: string) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw ApiError.notFound('Comunidade nao encontrada.');
  return community;
}

export async function approveMember(slug: string, actorId: string, targetUserId: string) {
  const community = await requireCommunity(slug);
  const actor = await getMembership(community.id, actorId);
  if (!canModerate(actor)) throw ApiError.forbidden('Apenas moderadores aprovam entradas.');

  await assertCommunityHasRoom(community.id);
  await prisma.$transaction([
    prisma.communityMember.update({
      where: { communityId_userId: { communityId: community.id, userId: targetUserId } },
      data: { status: MembershipStatus.ACTIVE },
    }),
    prisma.community.update({ where: { id: community.id }, data: { membersCount: { increment: 1 } } }),
  ]);

  await createNotification({
    userId: targetUserId,
    actorId,
    type: 'COMMUNITY_JOIN_APPROVED',
    title: `Sua entrada em ${community.name} foi aprovada.`,
    href: `/c/${community.slug}`,
    entityType: 'community',
    entityId: community.id,
    preferenceKey: 'notifyCommunities',
  });
  await evaluateAchievements(targetUserId);
  return { status: MembershipStatus.ACTIVE };
}

export async function rejectMember(slug: string, actorId: string, targetUserId: string) {
  const community = await requireCommunity(slug);
  const actor = await getMembership(community.id, actorId);
  if (!canModerate(actor)) throw ApiError.forbidden('Apenas moderadores recusam entradas.');
  await prisma.communityMember.delete({
    where: { communityId_userId: { communityId: community.id, userId: targetUserId } },
  });
  return { rejected: true };
}

export async function setMemberRole(slug: string, actorId: string, targetUserId: string, role: CommunityRole) {
  const community = await requireCommunity(slug);
  const actor = await getMembership(community.id, actorId);
  if (!actor || actor.role !== CommunityRole.OWNER) {
    throw ApiError.forbidden('Apenas quem criou a comunidade muda papeis.');
  }
  if (role === CommunityRole.OWNER) throw ApiError.badRequest('Use a transferencia de comunidade para isso.');
  const target = await loadTargetMembership(community.id, targetUserId);
  if (target.role === CommunityRole.OWNER) throw ApiError.badRequest('Nao e possivel rebaixar o criador.');

  await prisma.communityMember.update({ where: { id: target.id }, data: { role } });
  return { role };
}

export async function banMember(slug: string, actorId: string, targetUserId: string) {
  const community = await requireCommunity(slug);
  const actor = await getMembership(community.id, actorId);
  if (!canModerate(actor)) throw ApiError.forbidden('Apenas moderadores podem bloquear membros.');
  const target = await loadTargetMembership(community.id, targetUserId);
  if (!outranks(actor, target)) throw ApiError.forbidden('Voce nao pode moderar alguem do mesmo nivel ou acima.');

  await prisma.$transaction([
    prisma.communityMember.update({ where: { id: target.id }, data: { status: MembershipStatus.BANNED } }),
    ...(target.status === MembershipStatus.ACTIVE
      ? [prisma.community.update({ where: { id: community.id }, data: { membersCount: { decrement: 1 } } })]
      : []),
  ]);
  return { status: MembershipStatus.BANNED };
}

export async function muteMember(slug: string, actorId: string, targetUserId: string, hours: number) {
  const community = await requireCommunity(slug);
  const actor = await getMembership(community.id, actorId);
  if (!canModerate(actor)) throw ApiError.forbidden('Apenas moderadores podem silenciar membros.');
  const target = await loadTargetMembership(community.id, targetUserId);
  if (!outranks(actor, target)) throw ApiError.forbidden('Voce nao pode moderar alguem do mesmo nivel ou acima.');

  const mutedUntil = new Date(Date.now() + Math.min(hours, 24 * 30) * 60 * 60 * 1000);
  await prisma.communityMember.update({ where: { id: target.id }, data: { mutedUntil } });
  return { mutedUntil };
}

// -- Regras (secao 20) -------------------------------------------------------

export async function listRules(communityId: string) {
  return prisma.communityRule.findMany({ where: { communityId }, orderBy: { order: 'asc' } });
}

export async function replaceRules(
  slug: string,
  actorId: string,
  rules: { title: string; description?: string }[],
) {
  const community = await requireCommunity(slug);
  await assertCanAdminister(community.id, actorId);

  await prisma.$transaction([
    prisma.communityRule.deleteMany({ where: { communityId: community.id } }),
    prisma.communityRule.createMany({
      data: rules.slice(0, 12).map((rule, order) => ({
        communityId: community.id,
        order,
        title: stripHtml(rule.title),
        description: rule.description ? stripHtml(rule.description) : null,
      })),
    }),
  ]);

  return listRules(community.id);
}

// -- Livros associados -------------------------------------------------------

export async function attachBook(slug: string, actorId: string, bookId: string) {
  const community = await requireCommunity(slug);
  await assertCanAdminister(community.id, actorId);
  await prisma.communityBook.upsert({
    where: { communityId_bookId: { communityId: community.id, bookId } },
    update: {},
    create: { communityId: community.id, bookId },
  });
  return { attached: true };
}

export async function detachBook(slug: string, actorId: string, bookId: string) {
  const community = await requireCommunity(slug);
  await assertCanAdminister(community.id, actorId);
  await prisma.communityBook
    .delete({ where: { communityId_bookId: { communityId: community.id, bookId } } })
    .catch(() => undefined);
  return { detached: true };
}

/** Comunidades sugeridas: fachada sobre o motor central de recomendacao. */
export async function getRecommendedCommunities(userId: string, take = 6) {
  const context = await loadTasteContext(userId);
  const results = await recommendCommunities(context, take);
  return results.map((entry) => ({ ...entry.item, reasons: entry.reasons.map((r) => r.label) }));
}

export async function getCommunityAnalytics(slug: string, actorId: string) {
  const community = await requireCommunity(slug);
  await assertCanAdminister(community.id, actorId);
  const plan = await getUserPlan(community.ownerId);
  if (!plan.allowAnalytics) {
    throw ApiError.planLimit('Analytics de comunidade faz parte do plano Pro.', { feature: 'analytics' });
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [newMembers, posts, comments, topPosters] = await Promise.all([
    prisma.communityMember.count({ where: { communityId: community.id, joinedAt: { gte: since } } }),
    prisma.post.count({ where: { communityId: community.id, createdAt: { gte: since } } }),
    prisma.comment.count({ where: { post: { communityId: community.id }, createdAt: { gte: since } } }),
    prisma.post.groupBy({
      by: ['authorId'],
      where: { communityId: community.id, createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { authorId: 'desc' } },
      take: 5,
    }),
  ]);

  const authors = await prisma.user.findMany({
    where: { id: { in: topPosters.map((t) => t.authorId) } },
    select: publicUserSelect,
  });
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  return {
    period: '30d',
    newMembers,
    posts,
    comments,
    topPosters: topPosters
      .filter((t) => authorMap.has(t.authorId))
      .map((t) => ({ ...serializeUser(authorMap.get(t.authorId)!), posts: t._count })),
  };
}

export type { Membership };
export { getMembership, isActiveMember, canModerate, canPost };
