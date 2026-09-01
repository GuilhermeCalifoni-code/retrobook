import { MembershipStatus, ReadingStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { postCardSelect, publicUserSelect, serializePost, serializeUser } from '../../shared/selectors';

/**
 * Vida da comunidade: quem chegou, quem falou, o que esta pegando.
 *
 * Duas regras guiam este arquivo:
 *
 * 1. **Agrupar, nao listar** (secao 7). "Ana, Caio e mais 3 entraram" em vez
 *    de cinco linhas iguais. Um feed de cada acao minima vira ruido.
 * 2. **Relevancia nao e curtida** (secao 8). O ranking usa respostas, pessoas
 *    distintas e recencia — uma conversa de 8 respostas hoje vale mais que
 *    uma de 40 curtidas do mes passado.
 */

export type ActivityKind = 'joined' | 'discussed' | 'replied' | 'finished_book';

export interface ActivityItem {
  kind: ActivityKind;
  /** Frase pronta, no tom do produto. */
  text: string;
  href?: string;
  at: Date;
  actors: { id: string; name: string; username: string; avatarUrl: string | null }[];
  /** Quantos alem dos exibidos. */
  overflow: number;
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

/** "Ana, Caio e mais 3" */
function nameList(actors: { name: string }[], overflow: number): string {
  const names = actors.map((a) => a.name.split(' ')[0]);
  if (names.length === 0) return 'Alguem';
  if (names.length === 1) return overflow > 0 ? `${names[0]} e mais ${overflow}` : names[0]!;
  const head = names.slice(0, 2).join(', ');
  const rest = overflow + (names.length - 2);
  return rest > 0 ? `${head} e mais ${rest}` : `${head} e ${names[names.length - 1]}`;
}

/**
 * Acontecendo agora (secao 7).
 * Janela de 14 dias, agrupada por tipo — nunca mais que um punhado de linhas.
 */
export async function getRecentActivity(communityId: string, limit = 5): Promise<ActivityItem[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [joins, discussions, replies, finished] = await Promise.all([
    prisma.communityMember.findMany({
      where: { communityId, joinedAt: { gte: since }, status: MembershipStatus.ACTIVE },
      include: { user: { select: publicUserSelect } },
      orderBy: { joinedAt: 'desc' },
      take: 12,
    }),
    prisma.post.findMany({
      where: { communityId, createdAt: { gte: since }, isRemoved: false },
      select: { id: true, title: true, content: true, type: true, createdAt: true, author: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
    prisma.comment.findMany({
      where: { post: { communityId }, createdAt: { gte: since }, isRemoved: false },
      select: {
        createdAt: true,
        postId: true,
        author: { select: publicUserSelect },
        post: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
    // Terminar um livro da comunidade e um evento social relevante.
    prisma.userBook.findMany({
      where: {
        status: ReadingStatus.READ,
        finishedAt: { gte: since },
        book: { communities: { some: { communityId } } },
        user: { memberships: { some: { communityId, status: MembershipStatus.ACTIVE } }, profile: { showActivity: true } },
      },
      include: { user: { select: publicUserSelect }, book: { select: { title: true, slug: true } } },
      orderBy: { finishedAt: 'desc' },
      take: 6,
    }),
  ]);

  const items: ActivityItem[] = [];

  // Entradas viram uma linha so.
  if (joins.length > 0) {
    const actors = joins.slice(0, 3).map((j) => serializeUser(j.user));
    const overflow = joins.length - actors.length;
    items.push({
      kind: 'joined',
      text: `${nameList(actors, overflow)} ${plural(joins.length, 'entrou', 'entraram')} na comunidade.`,
      at: joins[0]!.joinedAt,
      actors,
      overflow,
    });
  }

  // Discussoes ficam individuais: cada uma e um convite distinto.
  for (const post of discussions.slice(0, 3)) {
    const verb =
      post.type === 'THEORY'
        ? 'levantou uma teoria'
        : post.type === 'QUESTION'
          ? 'fez uma pergunta'
          : post.type === 'REVIEW'
            ? 'publicou uma resenha'
            : 'abriu uma discussao';
    items.push({
      kind: 'discussed',
      text: `${serializeUser(post.author).name.split(' ')[0]} ${verb}: ${post.title ?? post.content.slice(0, 60)}`,
      href: `/post/${post.id}`,
      at: post.createdAt,
      actors: [serializeUser(post.author)],
      overflow: 0,
    });
  }

  // Respostas agrupadas por discussao.
  const byPost = new Map<string, typeof replies>();
  for (const reply of replies) {
    const list = byPost.get(reply.postId) ?? [];
    list.push(reply);
    byPost.set(reply.postId, list);
  }
  for (const [postId, group] of Array.from(byPost.entries()).slice(0, 2)) {
    const unique = Array.from(new Map(group.map((g) => [g.author.id, g])).values());
    const actors = unique.slice(0, 3).map((g) => serializeUser(g.author));
    const overflow = unique.length - actors.length;
    items.push({
      kind: 'replied',
      text: `${nameList(actors, overflow)} ${plural(unique.length, 'respondeu', 'responderam')} em "${group[0]!.post.title ?? 'uma discussao'}".`,
      href: `/post/${postId}`,
      at: group[0]!.createdAt,
      actors,
      overflow,
    });
  }

  for (const entry of finished.slice(0, 2)) {
    items.push({
      kind: 'finished_book',
      text: `${serializeUser(entry.user).name.split(' ')[0]} terminou ${entry.book.title}.`,
      href: `/livro/${entry.book.slug}`,
      at: entry.finishedAt!,
      actors: [serializeUser(entry.user)],
      overflow: 0,
    });
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

/**
 * Conversas em alta (secao 8).
 *
 * O "calor" combina respostas, pessoas distintas e quao recente foi a ultima
 * interacao. Curtida entra com peso baixo de proposito: ela mede aprovacao,
 * nao conversa — e o RetroBook otimiza para conversa.
 */
export async function getHotDiscussions(communityId: string, viewerId: string | undefined, limit = 3) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const posts = await prisma.post.findMany({
    where: { communityId, isRemoved: false, createdAt: { gte: since } },
    select: {
      ...postCardSelect,
      comments: {
        where: { isRemoved: false },
        select: { authorId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  const scored = posts.map((post) => {
    const participants = new Set(post.comments.map((c) => c.authorId));
    const lastInteraction = post.comments[0]?.createdAt ?? post.createdAt;
    const hoursSinceLast = (Date.now() - lastInteraction.getTime()) / 3_600_000;

    // Decaimento suave: uma conversa de ontem ainda conta bastante.
    const recency = Math.exp(-hoursSinceLast / 72);
    const heat =
      post.commentsCount * 4 + participants.size * 6 + post.likesCount * 0.5;

    return { post, score: heat * (0.35 + 0.65 * recency), participants: participants.size, lastInteraction };
  });

  const top = scored
    .filter((entry) => entry.post.commentsCount > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return top.map((entry) => ({
    ...serializePost(entry.post),
    participantsCount: entry.participants,
    lastInteractionAt: entry.lastInteraction,
  }));
}

/**
 * Discussao em destaque (secao 6).
 * Fixada pelo moderador tem prioridade; sem fixada, a mais quente assume.
 */
export async function getFeaturedDiscussion(communityId: string, viewerId?: string) {
  const pinned = await prisma.post.findFirst({
    where: { communityId, isPinned: true, isRemoved: false },
    select: postCardSelect,
    orderBy: { createdAt: 'desc' },
  });

  if (pinned) {
    return { post: serializePost(pinned), source: 'pinned' as const };
  }

  const [hot] = await getHotDiscussions(communityId, viewerId, 1);
  return hot ? { post: hot, source: 'trending' as const } : null;
}

/**
 * Pessoas que movimentam a comunidade (secao 9).
 * Atividade = discussoes + respostas nas ultimas semanas, nao antiguidade.
 */
export async function getActiveMembers(communityId: string, viewerId: string | undefined, limit = 6) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [posts, comments] = await Promise.all([
    prisma.post.groupBy({
      by: ['authorId'],
      where: { communityId, createdAt: { gte: since }, isRemoved: false },
      _count: { _all: true },
    }),
    prisma.comment.findMany({
      where: { post: { communityId }, createdAt: { gte: since }, isRemoved: false },
      select: { authorId: true },
    }),
  ]);

  const tally = new Map<string, { posts: number; comments: number }>();
  for (const p of posts) tally.set(p.authorId, { posts: p._count._all, comments: 0 });
  for (const c of comments) {
    const current = tally.get(c.authorId) ?? { posts: 0, comments: 0 };
    current.comments += 1;
    tally.set(c.authorId, current);
  }

  const ranked = Array.from(tally.entries())
    .map(([userId, counts]) => ({ userId, ...counts, score: counts.posts * 3 + counts.comments }))
    .filter((entry) => entry.userId !== viewerId)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (ranked.length === 0) return [];

  const [users, memberships] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ranked.map((r) => r.userId) } }, select: publicUserSelect }),
    prisma.communityMember.findMany({
      where: { communityId, userId: { in: ranked.map((r) => r.userId) } },
      select: { userId: true, role: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const roleMap = new Map(memberships.map((m) => [m.userId, m.role]));

  return ranked
    .filter((r) => userMap.has(r.userId))
    .map((r) => ({
      ...serializeUser(userMap.get(r.userId)!),
      role: roleMap.get(r.userId) ?? 'MEMBER',
      postsCount: r.posts,
      commentsCount: r.comments,
    }));
}

/**
 * Livro em destaque (secao 10): o que a comunidade esta lendo de fato.
 * Escolhido por quantos membros estao com ele em maos agora.
 */
export async function getFeaturedBook(communityId: string) {
  const communityBooks = await prisma.communityBook.findMany({
    where: { communityId },
    select: { bookId: true },
  });
  if (communityBooks.length === 0) return null;

  const bookIds = communityBooks.map((b) => b.bookId);

  const readers = await prisma.userBook.groupBy({
    by: ['bookId'],
    where: {
      bookId: { in: bookIds },
      status: ReadingStatus.READING,
      user: { memberships: { some: { communityId, status: MembershipStatus.ACTIVE } } },
    },
    _count: { _all: true },
    orderBy: { _count: { bookId: 'desc' } },
    take: 1,
  });

  const chosenId = readers[0]?.bookId ?? bookIds[0]!;

  const [book, readingCount, avgProgress, discussions] = await Promise.all([
    prisma.book.findUnique({
      where: { id: chosenId },
      select: {
        id: true,
        slug: true,
        title: true,
        coverUrl: true,
        pageCount: true,
        authors: { select: { author: { select: { name: true } } }, orderBy: { order: 'asc' }, take: 1 },
      },
    }),
    prisma.userBook.count({
      where: {
        bookId: chosenId,
        status: ReadingStatus.READING,
        user: { memberships: { some: { communityId, status: MembershipStatus.ACTIVE } } },
      },
    }),
    prisma.userBook.aggregate({
      where: {
        bookId: chosenId,
        status: ReadingStatus.READING,
        user: { memberships: { some: { communityId, status: MembershipStatus.ACTIVE } } },
      },
      _avg: { progress: true },
    }),
    prisma.post.count({ where: { communityId, bookId: chosenId, isRemoved: false } }),
  ]);

  if (!book) return null;

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    coverUrl: book.coverUrl,
    author: book.authors[0]?.author.name ?? null,
    /** Quantos membros estao com este livro em maos agora. */
    readingCount,
    /** Progresso coletivo: onde a comunidade esta, em media. */
    collectiveProgress: Math.round(avgProgress._avg.progress ?? 0),
    discussionsCount: discussions,
  };
}
