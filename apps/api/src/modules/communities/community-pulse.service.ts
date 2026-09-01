import { MembershipStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';

/**
 * Community Pulse (secao 4).
 *
 * Responde a pergunta que numero de membros nao responde: **tem gente
 * conversando aqui?**
 *
 * Uma comunidade de 500 membros sem discussao ha um mes esta mais morta que
 * uma de 40 com conversa toda semana. Por isso o pulso ignora o tamanho e olha
 * so para movimento recente — e para o sinal que realmente importa no
 * RetroBook: a proporcao de discussoes que **recebem resposta**.
 *
 * O resultado nunca vira "score" na interface. Vira uma frase: "Ativa hoje".
 */

export type PulseLevel = 'thriving' | 'active' | 'quiet' | 'dormant' | 'new';

export interface CommunityPulse {
  level: PulseLevel;
  /** Frase pronta para o hero: "Ativa hoje", "Conversa parada". */
  label: string;
  /** Detalhe humano, no tom do produto. */
  detail: string;
  /** Sinais brutos — usados pelo painel do dono, nao pelo card. */
  signals: {
    postsLast7d: number;
    commentsLast7d: number;
    activeMembers7d: number;
    newMembers7d: number;
    lastActivityAt: Date | null;
    /** Percentual de discussoes que receberam ao menos uma resposta. */
    replyRate: number;
  };
}

function hoursSince(date: Date | null): number | null {
  if (!date) return null;
  return (Date.now() - date.getTime()) / 3_600_000;
}

function humanizeLastActivity(hours: number | null): string {
  if (hours == null) return 'ainda sem conversas';
  if (hours < 1) return 'agora ha pouco';
  if (hours < 24) return 'hoje';
  if (hours < 48) return 'ontem';
  if (hours < 24 * 7) return `ha ${Math.floor(hours / 24)} dias`;
  if (hours < 24 * 30) return `ha ${Math.floor(hours / (24 * 7))} semanas`;
  return 'ha mais de um mes';
}

/**
 * Calcula o pulso de varias comunidades de uma vez.
 *
 * Feito em lote de proposito: a listagem de comunidades mostraria o pulso de
 * 18 cards, e um calculo por card seriam 90 consultas.
 */
export async function computePulses(communityIds: string[]): Promise<Map<string, CommunityPulse>> {
  const result = new Map<string, CommunityPulse>();
  if (communityIds.length === 0) return result;

  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [posts, comments, newMembers, lastPosts, createdAt, answered] = await Promise.all([
    prisma.post.groupBy({
      by: ['communityId'],
      where: { communityId: { in: communityIds }, createdAt: { gte: week }, isRemoved: false },
      _count: { _all: true },
    }),
    // Comentarios nao tem communityId: agregamos via o post ao qual pertencem.
    prisma.comment.findMany({
      where: {
        post: { communityId: { in: communityIds } },
        createdAt: { gte: week },
        isRemoved: false,
      },
      select: { authorId: true, post: { select: { communityId: true } } },
    }),
    prisma.communityMember.groupBy({
      by: ['communityId'],
      where: { communityId: { in: communityIds }, joinedAt: { gte: week }, status: MembershipStatus.ACTIVE },
      _count: { _all: true },
    }),
    prisma.post.groupBy({
      by: ['communityId'],
      where: { communityId: { in: communityIds }, isRemoved: false },
      _max: { createdAt: true },
    }),
    prisma.community.findMany({
      where: { id: { in: communityIds } },
      select: { id: true, createdAt: true },
    }),
    // Discussoes que receberam ao menos uma resposta — o sinal da secao 47.
    prisma.post.findMany({
      where: { communityId: { in: communityIds }, isRemoved: false },
      select: { communityId: true, commentsCount: true },
    }),
  ]);

  const postsBy = new Map(posts.map((p) => [p.communityId!, p._count._all]));
  const newMembersBy = new Map(newMembers.map((m) => [m.communityId, m._count._all]));
  const lastActivityBy = new Map(lastPosts.map((p) => [p.communityId!, p._max.createdAt]));
  const createdBy = new Map(createdAt.map((c) => [c.id, c.createdAt]));

  const commentsBy = new Map<string, number>();
  const activeMembersBy = new Map<string, Set<string>>();
  for (const comment of comments) {
    const id = comment.post.communityId;
    if (!id) continue;
    commentsBy.set(id, (commentsBy.get(id) ?? 0) + 1);
    const set = activeMembersBy.get(id) ?? new Set<string>();
    set.add(comment.authorId);
    activeMembersBy.set(id, set);
  }

  const replyStats = new Map<string, { total: number; answered: number }>();
  for (const post of answered) {
    const id = post.communityId;
    if (!id) continue;
    const current = replyStats.get(id) ?? { total: 0, answered: 0 };
    current.total += 1;
    if (post.commentsCount > 0) current.answered += 1;
    replyStats.set(id, current);
  }

  for (const id of communityIds) {
    const postsLast7d = postsBy.get(id) ?? 0;
    const commentsLast7d = commentsBy.get(id) ?? 0;
    const activeMembers7d = activeMembersBy.get(id)?.size ?? 0;
    const newMembers7d = newMembersBy.get(id) ?? 0;
    const lastActivityAt = lastActivityBy.get(id) ?? null;
    const stats = replyStats.get(id) ?? { total: 0, answered: 0 };
    const replyRate = stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0;

    const hours = hoursSince(lastActivityAt);
    const ageDays = (Date.now() - (createdBy.get(id)?.getTime() ?? Date.now())) / 86_400_000;
    const movement = postsLast7d + commentsLast7d;

    let level: PulseLevel;
    let label: string;
    let detail: string;

    if (stats.total === 0 && ageDays < 14) {
      level = 'new';
      label = 'Comecando agora';
      detail = 'Esta comunidade ainda esta se formando.';
    } else if (hours != null && hours < 24 && movement >= 3) {
      level = 'thriving';
      label = 'Ativa hoje';
      detail =
        activeMembers7d > 1
          ? `${activeMembers7d} pessoas conversando esta semana.`
          : 'Tem conversa acontecendo agora.';
    } else if (movement >= 2 && hours != null && hours < 24 * 7) {
      level = 'active';
      label = `Ativa ${humanizeLastActivity(hours)}`;
      detail = `${postsLast7d > 0 ? `${postsLast7d} ${postsLast7d === 1 ? 'discussao nova' : 'discussoes novas'}` : 'Respostas novas'} nesta semana.`;
    } else if (hours != null && hours < 24 * 30) {
      level = 'quiet';
      label = `Ultima conversa ${humanizeLastActivity(hours)}`;
      detail = 'O ritmo esta calmo por aqui.';
    } else {
      level = 'dormant';
      label = stats.total === 0 ? 'Ainda sem conversas' : `Parada ${humanizeLastActivity(hours)}`;
      detail = 'Uma boa pergunta pode reacender este lugar.';
    }

    result.set(id, {
      level,
      label,
      detail,
      signals: { postsLast7d, commentsLast7d, activeMembers7d, newMembers7d, lastActivityAt, replyRate },
    });
  }

  return result;
}

export async function computePulse(communityId: string): Promise<CommunityPulse> {
  const map = await computePulses([communityId]);
  return (
    map.get(communityId) ?? {
      level: 'new',
      label: 'Comecando agora',
      detail: 'Esta comunidade ainda esta se formando.',
      signals: {
        postsLast7d: 0,
        commentsLast7d: 0,
        activeMembers7d: 0,
        newMembers7d: 0,
        lastActivityAt: null,
        replyRate: 0,
      },
    }
  );
}

/**
 * Saude da comunidade para quem administra (secao 34).
 * Mesma base do pulso, com o recorte que o dono precisa para decidir.
 */
export async function getCommunityHealth(communityId: string) {
  const pulse = await computePulse(communityId);
  const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const previousMonth = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [postsThisMonth, postsLastMonth, membersThisMonth, membersLastMonth, openReports, firstReplyTimes] =
    await Promise.all([
      prisma.post.count({ where: { communityId, createdAt: { gte: month }, isRemoved: false } }),
      prisma.post.count({
        where: { communityId, createdAt: { gte: previousMonth, lt: month }, isRemoved: false },
      }),
      prisma.communityMember.count({ where: { communityId, joinedAt: { gte: month } } }),
      prisma.communityMember.count({ where: { communityId, joinedAt: { gte: previousMonth, lt: month } } }),
      prisma.report.count({ where: { targetType: 'COMMUNITY', targetId: communityId, status: 'OPEN' } }),
      // Tempo ate a primeira resposta: o quanto uma pergunta fica sozinha.
      prisma.post.findMany({
        where: { communityId, createdAt: { gte: month }, isRemoved: false, commentsCount: { gt: 0 } },
        select: {
          createdAt: true,
          comments: { orderBy: { createdAt: 'asc' }, take: 1, select: { createdAt: true } },
        },
        take: 100,
      }),
    ]);

  const waits = firstReplyTimes
    .map((p) => p.comments[0] && (p.comments[0].createdAt.getTime() - p.createdAt.getTime()) / 3_600_000)
    .filter((v): v is number => typeof v === 'number');
  const medianFirstReplyHours = waits.length
    ? Math.round(waits.sort((a, b) => a - b)[Math.floor(waits.length / 2)]!)
    : null;

  const growth = (current: number, previous: number) =>
    previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);

  return {
    pulse,
    posts: { current: postsThisMonth, previous: postsLastMonth, growthPercent: growth(postsThisMonth, postsLastMonth) },
    members: {
      current: membersThisMonth,
      previous: membersLastMonth,
      growthPercent: growth(membersThisMonth, membersLastMonth),
    },
    /** O sinal principal da secao 47. */
    replyRate: pulse.signals.replyRate,
    medianFirstReplyHours,
    openReports,
  };
}
