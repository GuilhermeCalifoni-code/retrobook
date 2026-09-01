import { logger } from '../../common/logger';
import { prisma } from '../../database/prisma';

/**
 * Eventos de produto (secoes 54 e 55).
 *
 * O catalogo e fechado de proposito: um enum de strings soltas vira lixo em
 * tres meses. Cada evento aqui responde a uma pergunta de negocio declarada.
 */
export const PRODUCT_EVENTS = {
  // Ativacao
  ACCOUNT_CREATED: 'account.created',
  ONBOARDING_COMPLETED: 'onboarding.completed',
  FIRST_BOOK_ADDED: 'library.first_book',
  FIRST_COMMUNITY_JOINED: 'community.first_join',

  // Engajamento
  BOOK_ADDED: 'library.book_added',
  BOOK_FINISHED: 'library.book_finished',
  READING_PROGRESS: 'library.progress',
  POST_CREATED: 'post.created',
  COMMENT_CREATED: 'comment.created',
  REACTION_ADDED: 'reaction.added',

  // Social
  USER_FOLLOWED: 'social.followed',
  COMMUNITY_JOINED: 'community.joined',
  COMMUNITY_CREATED: 'community.created',
  MESSAGE_SENT: 'social.message_sent',

  // North Star
  MEANINGFUL_CONVERSATION: 'conversation.meaningful',

  // Monetizacao
  PLAN_LIMIT_HIT: 'plan.limit_hit',
  UPGRADE_VIEWED: 'plan.upgrade_viewed',
} as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

interface TrackInput {
  name: ProductEventName;
  userId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Registrar um evento nunca pode derrubar a acao do usuario: falha em silencio
 * (com log) em vez de propagar. Por isso nao retorna promessa util.
 */
export function track(input: TrackInput): void {
  void prisma.productEvent
    .create({
      data: {
        name: input.name,
        userId: input.userId,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata as never,
      },
    })
    .catch((error) => {
      logger.warn('nao foi possivel registrar evento de produto', { event: input.name, error: String(error) });
    });
}

/**
 * North Star: conversas literarias significativas.
 *
 * Nao contamos posts nem tempo de tela. Uma conversa e significativa quando
 * uma discussao recebe resposta de **outra pessoa** — ou seja, quando o
 * RetroBook cumpriu a promessa de conectar dois leitores em torno de um livro.
 *
 * A checagem roda quando um comentario e criado; o evento so e gravado na
 * primeira vez que aquela discussao vira conversa, para nao inflar a metrica.
 */
export async function evaluateMeaningfulConversation(postId: string, commenterId: string): Promise<boolean> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, bookId: true, communityId: true },
  });
  if (!post || post.authorId === commenterId) return false;

  const already = await prisma.productEvent.findFirst({
    where: { name: PRODUCT_EVENTS.MEANINGFUL_CONVERSATION, entityType: 'post', entityId: postId },
    select: { id: true },
  });
  if (already) return false;

  track({
    name: PRODUCT_EVENTS.MEANINGFUL_CONVERSATION,
    userId: post.authorId,
    entityType: 'post',
    entityId: postId,
    metadata: {
      hasBook: Boolean(post.bookId),
      inCommunity: Boolean(post.communityId),
    },
  });
  return true;
}

function since(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Painel de metricas para o futuro admin (secao 58). */
export async function getProductMetrics(days = 30) {
  const from = since(days);

  const [
    totalUsers,
    newUsers,
    onboarded,
    withBooks,
    inCommunities,
    posts,
    comments,
    meaningful,
    activeCommunities,
    follows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: from } } }),
    prisma.profile.count({ where: { onboardingCompleted: true } }),
    prisma.userBook.groupBy({ by: ['userId'] }).then((rows) => rows.length),
    prisma.communityMember.groupBy({ by: ['userId'], where: { status: 'ACTIVE' } }).then((rows) => rows.length),
    prisma.post.count({ where: { createdAt: { gte: from }, isRemoved: false } }),
    prisma.comment.count({ where: { createdAt: { gte: from }, isRemoved: false } }),
    prisma.productEvent.count({
      where: { name: PRODUCT_EVENTS.MEANINGFUL_CONVERSATION, createdAt: { gte: from } },
    }),
    prisma.community.count({ where: { posts: { some: { createdAt: { gte: from } } } } }),
    prisma.follow.count({ where: { createdAt: { gte: from } } }),
  ]);

  const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

  return {
    period: `${days}d`,
    // Funil de ativacao: onde as pessoas param antes de virar usuarias de verdade.
    activation: {
      accounts: totalUsers,
      onboarded: { count: onboarded, percent: pct(onboarded, totalUsers) },
      withFirstBook: { count: withBooks, percent: pct(withBooks, totalUsers) },
      inCommunity: { count: inCommunities, percent: pct(inCommunities, totalUsers) },
    },
    engagement: { newUsers, posts, comments, follows },
    community: { active: activeCommunities },
    northStar: {
      label: 'Conversas literarias significativas',
      value: meaningful,
      description: 'Discussoes que receberam resposta de outra pessoa.',
    },
  };
}
