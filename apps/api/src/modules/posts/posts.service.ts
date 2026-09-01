import { MembershipStatus, PostType, ReactionType, type Prisma } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { buildCursorPage } from '../../common/http';
import { assertQuoteWithinPolicy, excerpt, extractTags, stripHtml } from '../../common/text';
import { prisma } from '../../database/prisma';
import { postCardSelect, publicUserSelect, serializePost, serializeUser } from '../../shared/selectors';
import { createNotification, createNotificationsBulk } from '../notifications/notifications.service';
import { canModerate, canPost, canViewContent, getMembership } from '../communities/communities.permissions';
import { buildScope, loadReaderProgress, resolveSpoiler } from './spoiler.service';
import { PRODUCT_EVENTS, evaluateMeaningfulConversation, track } from '../analytics/events.service';

export interface CreatePostInput {
  communitySlug?: string;
  bookId?: string;
  type: PostType;
  title?: string;
  content: string;
  containsSpoiler?: boolean;
  /** Alcance estruturado; o rotulo textual e derivado dele. */
  spoilerScopeType?: import('@prisma/client').SpoilerScopeType;
  spoilerScopeValue?: number;
  quoteText?: string;
  quotePage?: number;
  tags?: string[];
  /** Somente em READING_UPDATE. */
  progressPage?: number;
  progressPercent?: number;
  progressChapter?: number;
}

async function attachPostTags(postId: string, tags: string[]) {
  for (const slug of tags) {
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: { usageCount: { increment: 1 } },
      create: { slug, name: slug.replace(/-/g, ' ') },
    });
    await prisma.postTag.upsert({
      where: { postId_tagId: { postId, tagId: tag.id } },
      update: {},
      create: { postId, tagId: tag.id },
    });
  }
}

export async function createPost(authorId: string, input: CreatePostInput) {
  let communityId: string | undefined;
  let communityName: string | undefined;
  let communitySlug: string | undefined;

  if (input.communitySlug) {
    const community = await prisma.community.findUnique({ where: { slug: input.communitySlug } });
    if (!community) throw ApiError.notFound('Comunidade nao encontrada.');
    const membership = await getMembership(community.id, authorId);
    if (!canPost(membership, community)) {
      throw ApiError.forbidden(
        membership?.mutedUntil && membership.mutedUntil > new Date()
          ? 'Voce esta temporariamente silenciado nesta comunidade.'
          : 'Entre na comunidade para publicar por aqui.',
      );
    }
    communityId = community.id;
    communityName = community.name;
    communitySlug = community.slug;
  }

  if (input.bookId) {
    const book = await prisma.book.findUnique({ where: { id: input.bookId }, select: { id: true } });
    if (!book) throw ApiError.notFound('Livro nao encontrado.');
  }

  // Citacoes exigem livro referenciado e respeitam o limite de tamanho.
  let quoteText: string | undefined;
  if (input.type === PostType.QUOTE) {
    if (!input.quoteText) throw ApiError.badRequest('Adicione o trecho que voce quer compartilhar.');
    if (!input.bookId) throw ApiError.badRequest('Toda citacao precisa apontar para o livro de origem.');
    const check = assertQuoteWithinPolicy(input.quoteText);
    if (!check.ok) throw ApiError.badRequest(check.reason);
    quoteText = check.value;
  }

  const post = await prisma.post.create({
    data: {
      authorId,
      communityId,
      bookId: input.bookId,
      type: input.type,
      title: input.title ? stripHtml(input.title) : undefined,
      content: stripHtml(input.content),
      containsSpoiler: input.containsSpoiler ?? false,
      ...buildScope(input),
      quoteText,
      quotePage: input.quotePage,
      progressPage: input.progressPage,
      progressPercent: input.progressPercent,
      progressChapter: input.progressChapter,
    },
    select: postCardSelect,
  });

  track({
    name: PRODUCT_EVENTS.POST_CREATED,
    userId: authorId,
    entityType: 'post',
    entityId: post.id,
    metadata: { type: input.type, hasBook: Boolean(input.bookId), inCommunity: Boolean(communityId) },
  });

  await attachPostTags(post.id, extractTags(input.tags));

  if (communityId) {
    await prisma.community.update({ where: { id: communityId }, data: { postsCount: { increment: 1 } } });

    // Avisa a comunidade — limitado para nao virar spam em comunidades grandes.
    const members = await prisma.communityMember.findMany({
      where: { communityId, status: MembershipStatus.ACTIVE, userId: { not: authorId } },
      select: { userId: true },
      take: 200,
    });
    await createNotificationsBulk(
      members.map((m) => m.userId),
      {
        actorId: authorId,
        type: 'COMMUNITY_POST',
        title: `Nova discussao em ${communityName}`,
        body: excerpt(post.title ?? post.content, 120),
        href: `/post/${post.id}`,
        entityType: 'post',
        entityId: post.id,
      },
    );
  } else if (input.bookId) {
    // Discussao aberta de livro: avisa quem esta lendo o mesmo livro.
    const readers = await prisma.userBook.findMany({
      where: { bookId: input.bookId, status: 'READING', userId: { not: authorId } },
      select: { userId: true },
      take: 100,
    });
    await createNotificationsBulk(
      readers.map((r) => r.userId),
      {
        actorId: authorId,
        type: 'BOOK_MATCH',
        title: 'Uma nova discussao sobre um livro que voce esta lendo',
        body: excerpt(post.title ?? post.content, 120),
        href: `/post/${post.id}`,
        entityType: 'post',
        entityId: post.id,
      },
    );
  }

  void communitySlug;
  return serializePost(post, {
    canModerate: true,
    // Quem escreveu ja sabe o que escreveu.
    spoiler: { hidden: false, label: post.spoilerScope, explanation: null },
  });
}

async function decorateForViewer(posts: Prisma.PostGetPayload<{ select: typeof postCardSelect }>[], viewerId?: string) {
  if (posts.length === 0) return [];

  // Visitante nao autenticado: sem progresso de leitura, todo spoiler fica coberto.
  if (!viewerId) return posts.map((p) => serializePost(p));

  const ids = posts.map((p) => p.id);
  const communityIds = Array.from(new Set(posts.map((p) => p.community?.id).filter(Boolean))) as string[];

  const [reactions, saves, moderatorOf, profile, progressByBook] = await Promise.all([
    prisma.reaction.findMany({ where: { userId: viewerId, postId: { in: ids } }, select: { postId: true } }),
    prisma.savedPost.findMany({ where: { userId: viewerId, postId: { in: ids } }, select: { postId: true } }),
    communityIds.length
      ? prisma.communityMember.findMany({
          where: {
            userId: viewerId,
            communityId: { in: communityIds },
            status: MembershipStatus.ACTIVE,
            role: { in: ['OWNER', 'ADMIN', 'MODERATOR'] },
          },
          select: { communityId: true },
        })
      : [],
    prisma.profile.findUnique({ where: { userId: viewerId }, select: { spoilerPreference: true } }),
    loadReaderProgress(viewerId, posts.map((p) => p.book?.id)),
  ]);

  const preference = profile?.spoilerPreference ?? 'HIDE_UNREAD';
  const likedSet = new Set(reactions.map((r) => r.postId!));
  const savedSet = new Set(saves.map((s) => s.postId));
  const modSet = new Set(moderatorOf.map((m) => m.communityId));

  return posts.map((p) =>
    serializePost(p, {
      liked: likedSet.has(p.id),
      saved: savedSet.has(p.id),
      canModerate: p.author.id === viewerId || (p.community ? modSet.has(p.community.id) : false),
      // O proprio autor nunca leva spoiler do que ele mesmo escreveu.
      spoiler:
        p.author.id === viewerId
          ? { hidden: false, label: p.spoilerScope, explanation: null }
          : resolveSpoiler(p, preference, p.book ? (progressByBook.get(p.book.id) ?? null) : null),
    }),
  );
}

/**
 * Feed principal (secao 14). Combina, numa unica consulta paginada:
 * comunidades das quais participo, pessoas que sigo e livros da minha estante.
 * Sem essas tres fontes o feed vira um mural vazio para quem acabou de entrar.
 */
export async function getFeed(viewerId: string, opts: { cursor?: string; take?: number; scope?: 'all' | 'following' | 'communities' }) {
  const take = Math.min(opts.take ?? 12, 30);

  const [memberships, following, myBooks] = await Promise.all([
    prisma.communityMember.findMany({
      where: { userId: viewerId, status: MembershipStatus.ACTIVE },
      select: { communityId: true },
    }),
    prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }),
    prisma.userBook.findMany({ where: { userId: viewerId }, select: { bookId: true }, take: 60 }),
  ]);

  const communityIds = memberships.map((m) => m.communityId);
  const followingIds = following.map((f) => f.followingId);
  const bookIds = myBooks.map((b) => b.bookId);

  const sources: Prisma.PostWhereInput[] = [];
  if (opts.scope !== 'following' && communityIds.length) sources.push({ communityId: { in: communityIds } });
  if (opts.scope !== 'communities' && followingIds.length) sources.push({ authorId: { in: followingIds } });
  if (opts.scope === 'all' || !opts.scope) {
    if (bookIds.length) sources.push({ bookId: { in: bookIds }, community: { privacy: 'PUBLIC' } });
    sources.push({ authorId: viewerId });
  }

  const where: Prisma.PostWhereInput = {
    isRemoved: false,
    // Nunca vaza post de comunidade privada da qual nao participo.
    AND: [
      {
        OR: [
          { communityId: null },
          { community: { privacy: { not: 'PRIVATE' } } },
          { communityId: { in: communityIds } },
        ],
      },
      sources.length ? { OR: sources } : {},
    ],
  };

  const rows = await prisma.post.findMany({
    where,
    select: postCardSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const page = buildCursorPage(rows, take);
  return { ...page, items: await decorateForViewer(page.items, viewerId) };
}

export async function listCommunityPosts(
  slug: string,
  viewerId: string | undefined,
  opts: { cursor?: string; take?: number; sort?: 'recent' | 'hot' | 'discussed'; type?: PostType },
) {
  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) throw ApiError.notFound('Comunidade nao encontrada.');

  const membership = await getMembership(community.id, viewerId);
  if (!canViewContent(community, membership)) {
    throw ApiError.forbidden('Esta comunidade e privada. Peca para entrar para ver as discussoes.');
  }

  const take = Math.min(opts.take ?? 12, 30);

  // "Mais discutidas" ordena por conversa, nao por aprovacao (secao 8).
  const orderBy =
    opts.sort === 'discussed'
      ? [{ isPinned: 'desc' as const }, { commentsCount: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ isPinned: 'desc' as const }, { createdAt: 'desc' as const }];

  const rows = await prisma.post.findMany({
    where: {
      communityId: community.id,
      isRemoved: false,
      ...(opts.type ? { type: opts.type } : {}),
    },
    select: postCardSelect,
    orderBy,
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const page = buildCursorPage(rows, take);
  return { ...page, items: await decorateForViewer(page.items, viewerId) };
}

export async function listBookPosts(bookId: string, viewerId: string | undefined, take = 10) {
  const rows = await prisma.post.findMany({
    where: { bookId, isRemoved: false, OR: [{ communityId: null }, { community: { privacy: 'PUBLIC' } }] },
    select: postCardSelect,
    orderBy: { createdAt: 'desc' },
    take,
  });
  return decorateForViewer(rows, viewerId);
}

export async function listUserPosts(username: string, viewerId: string | undefined, take = 10) {
  const user = await prisma.user.findFirst({ where: { profile: { username } }, select: { id: true } });
  if (!user) throw ApiError.notFound('Leitor nao encontrado.');
  const rows = await prisma.post.findMany({
    where: {
      authorId: user.id,
      isRemoved: false,
      OR: [{ communityId: null }, { community: { privacy: 'PUBLIC' } }],
    },
    select: postCardSelect,
    orderBy: { createdAt: 'desc' },
    take,
  });
  return decorateForViewer(rows, viewerId);
}

export async function getPostDetail(postId: string, viewerId?: string) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: postCardSelect });
  if (!post) throw ApiError.notFound('Discussao nao encontrada.');

  if (post.community) {
    const membership = await getMembership(post.community.id, viewerId);
    if (!canViewContent(post.community, membership)) {
      throw ApiError.forbidden('Esta discussao acontece em uma comunidade privada.');
    }
  }

  const [decorated] = await decorateForViewer([post], viewerId);
  const comments = await listComments(postId, viewerId);
  return { post: decorated!, comments };
}

export async function togglePostReaction(postId: string, userId: string, type: ReactionType = ReactionType.LIKE) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, title: true, content: true },
  });
  if (!post) throw ApiError.notFound('Discussao nao encontrada.');

  const existing = await prisma.reaction.findUnique({ where: { userId_postId: { userId, postId } } });

  if (existing) {
    await prisma.$transaction([
      prisma.reaction.delete({ where: { id: existing.id } }),
      prisma.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } }),
    ]);
    const updated = await prisma.post.findUniqueOrThrow({ where: { id: postId }, select: { likesCount: true } });
    return { liked: false, likesCount: updated.likesCount };
  }

  await prisma.$transaction([
    prisma.reaction.create({ data: { userId, postId, type } }),
    prisma.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } }),
  ]);

  const updated = await prisma.post.findUniqueOrThrow({ where: { id: postId }, select: { likesCount: true } });
  const actor = await prisma.profile.findUnique({ where: { userId } });

  // Notifica em marcos, nao a cada curtida — respeita a atencao do autor.
  if ([1, 5, 15, 50].includes(updated.likesCount)) {
    await createNotification({
      userId: post.authorId,
      actorId: userId,
      type: 'REACTION',
      title:
        updated.likesCount === 1
          ? `${actor?.name ?? 'Alguem'} curtiu sua publicacao.`
          : `Sua publicacao recebeu ${updated.likesCount} curtidas.`,
      href: `/post/${postId}`,
      entityType: 'post',
      entityId: postId,
      preferenceKey: 'notifyComments',
    });
  }

  return { liked: true, likesCount: updated.likesCount };
}

export async function toggleSavePost(postId: string, userId: string) {
  const existing = await prisma.savedPost.findUnique({ where: { userId_postId: { userId, postId } } });
  if (existing) {
    await prisma.savedPost.delete({ where: { userId_postId: { userId, postId } } });
    return { saved: false };
  }
  await prisma.savedPost.create({ data: { userId, postId } });
  return { saved: true };
}

export async function listSavedPosts(userId: string, take = 20) {
  const rows = await prisma.savedPost.findMany({
    where: { userId },
    include: { post: { select: postCardSelect } },
    orderBy: { createdAt: 'desc' },
    take,
  });
  return decorateForViewer(
    rows.map((r) => r.post),
    userId,
  );
}

// -- Comentarios -------------------------------------------------------------

export async function listComments(postId: string, viewerId?: string) {
  const comments = await prisma.comment.findMany({
    where: { postId },
    include: { author: { select: publicUserSelect } },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  const liked = viewerId
    ? await prisma.reaction.findMany({
        where: { userId: viewerId, commentId: { in: comments.map((c) => c.id) } },
        select: { commentId: true },
      })
    : [];
  const likedSet = new Set(liked.map((l) => l.commentId!));

  const serialized = comments.map((c) => ({
    id: c.id,
    parentId: c.parentId,
    content: c.isRemoved ? 'Comentario removido pela moderacao.' : c.content,
    containsSpoiler: c.containsSpoiler,
    isRemoved: c.isRemoved,
    likesCount: c.likesCount,
    createdAt: c.createdAt,
    author: serializeUser(c.author),
    viewerHasLiked: likedSet.has(c.id),
    replies: [] as unknown[],
  }));

  // Monta a arvore: raiz -> respostas. A hierarquia visual do frontend depende disso.
  const byId = new Map(serialized.map((c) => [c.id, c]));
  const roots: typeof serialized = [];
  for (const comment of serialized) {
    if (comment.parentId && byId.has(comment.parentId)) {
      (byId.get(comment.parentId)!.replies as typeof serialized).push(comment);
    } else {
      roots.push(comment);
    }
  }
  return roots;
}

export async function createComment(
  postId: string,
  authorId: string,
  input: { content: string; parentId?: string; containsSpoiler?: boolean },
) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, isLocked: true, communityId: true, community: { select: { privacy: true, allowMemberPosts: true } } },
  });
  if (!post) throw ApiError.notFound('Discussao nao encontrada.');
  if (post.isLocked) throw ApiError.forbidden('Esta discussao foi encerrada por um moderador.');

  if (post.communityId && post.community) {
    const membership = await getMembership(post.communityId, authorId);
    if (!canViewContent(post.community as never, membership)) {
      throw ApiError.forbidden('Entre na comunidade para participar da conversa.');
    }
    if (membership?.mutedUntil && membership.mutedUntil > new Date()) {
      throw ApiError.forbidden('Voce esta temporariamente silenciado nesta comunidade.');
    }
  }

  if (input.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: input.parentId }, select: { postId: true } });
    if (!parent || parent.postId !== postId) throw ApiError.badRequest('Resposta invalida.');
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId,
      parentId: input.parentId,
      content: stripHtml(input.content),
      containsSpoiler: input.containsSpoiler ?? false,
    },
    include: { author: { select: publicUserSelect } },
  });

  await prisma.post.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } } });

  track({
    name: PRODUCT_EVENTS.COMMENT_CREATED,
    userId: authorId,
    entityType: 'post',
    entityId: postId,
    metadata: { isReply: Boolean(input.parentId) },
  });
  // Uma discussao vira "conversa significativa" quando outra pessoa responde.
  await evaluateMeaningfulConversation(postId, authorId);

  const actor = await prisma.profile.findUnique({ where: { userId: authorId } });
  if (input.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: input.parentId }, select: { authorId: true } });
    if (parent) {
      await createNotification({
        userId: parent.authorId,
        actorId: authorId,
        type: 'REPLY',
        title: `${actor?.name ?? 'Alguem'} respondeu ao seu comentario.`,
        body: excerpt(comment.content, 120),
        href: `/post/${postId}`,
        entityType: 'comment',
        entityId: comment.id,
        preferenceKey: 'notifyComments',
      });
    }
  } else {
    await createNotification({
      userId: post.authorId,
      actorId: authorId,
      type: 'COMMENT',
      title: `${actor?.name ?? 'Alguem'} comentou na sua discussao.`,
      body: excerpt(comment.content, 120),
      href: `/post/${postId}`,
      entityType: 'post',
      entityId: postId,
      preferenceKey: 'notifyComments',
    });
  }

  return {
    id: comment.id,
    parentId: comment.parentId,
    content: comment.content,
    containsSpoiler: comment.containsSpoiler,
    isRemoved: false,
    likesCount: 0,
    createdAt: comment.createdAt,
    author: serializeUser(comment.author),
    viewerHasLiked: false,
    replies: [],
  };
}

export async function toggleCommentReaction(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { id: true } });
  if (!comment) throw ApiError.notFound('Comentario nao encontrado.');

  const existing = await prisma.reaction.findUnique({ where: { userId_commentId: { userId, commentId } } });
  if (existing) {
    await prisma.$transaction([
      prisma.reaction.delete({ where: { id: existing.id } }),
      prisma.comment.update({ where: { id: commentId }, data: { likesCount: { decrement: 1 } } }),
    ]);
    const updated = await prisma.comment.findUniqueOrThrow({ where: { id: commentId }, select: { likesCount: true } });
    return { liked: false, likesCount: updated.likesCount };
  }

  await prisma.$transaction([
    prisma.reaction.create({ data: { userId, commentId } }),
    prisma.comment.update({ where: { id: commentId }, data: { likesCount: { increment: 1 } } }),
  ]);
  const updated = await prisma.comment.findUniqueOrThrow({ where: { id: commentId }, select: { likesCount: true } });
  return { liked: true, likesCount: updated.likesCount };
}

// -- Moderacao de conteudo ---------------------------------------------------

async function assertCanModeratePost(postId: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, communityId: true },
  });
  if (!post) throw ApiError.notFound('Discussao nao encontrada.');
  if (post.authorId === userId) return post;
  if (!post.communityId) throw ApiError.forbidden('Somente o autor pode alterar esta publicacao.');
  const membership = await getMembership(post.communityId, userId);
  if (!canModerate(membership)) throw ApiError.forbidden('Apenas moderadores podem fazer isso.');
  return post;
}

export async function removePost(postId: string, userId: string, reason?: string) {
  await assertCanModeratePost(postId, userId);
  await prisma.post.update({
    where: { id: postId },
    data: { isRemoved: true, removedById: userId, removedReason: reason },
  });
  return { removed: true };
}

export async function setPinned(postId: string, userId: string, pinned: boolean) {
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { communityId: true } });
  if (!post?.communityId) throw ApiError.badRequest('Somente posts de comunidade podem ser fixados.');
  const membership = await getMembership(post.communityId, userId);
  if (!canModerate(membership)) throw ApiError.forbidden('Apenas moderadores podem fixar discussoes.');
  await prisma.post.update({ where: { id: postId }, data: { isPinned: pinned } });
  return { isPinned: pinned };
}

export async function setLocked(postId: string, userId: string, locked: boolean) {
  await assertCanModeratePost(postId, userId);
  await prisma.post.update({ where: { id: postId }, data: { isLocked: locked } });
  return { isLocked: locked };
}

export async function removeComment(commentId: string, userId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, post: { select: { communityId: true } } },
  });
  if (!comment) throw ApiError.notFound('Comentario nao encontrado.');

  if (comment.authorId !== userId) {
    const communityId = comment.post.communityId;
    const membership = communityId ? await getMembership(communityId, userId) : null;
    if (!canModerate(membership)) throw ApiError.forbidden('Apenas moderadores podem remover comentarios.');
  }

  await prisma.comment.update({ where: { id: commentId }, data: { isRemoved: true } });
  return { removed: true };
}
