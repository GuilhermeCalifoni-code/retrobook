import { MembershipStatus, ReadingStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { createNotification } from '../notifications/notifications.service';

/**
 * Catalogo de conquistas (secao 30). Cada uma declara como se mede.
 * Manter a regra aqui, e nao espalhada pelos servicos, evita conquistas
 * "orfas" que ninguem consegue desbloquear.
 */
export const ACHIEVEMENT_CATALOG = [
  {
    code: 'first_read',
    name: 'Primeira Leitura',
    description: 'Terminou seu primeiro livro.',
    icon: 'book-check',
    category: 'reading',
    threshold: 1,
    measure: 'books_read' as const,
  },
  {
    code: 'frequent_reader',
    name: 'Leitor Frequente',
    description: 'Terminou 10 livros.',
    icon: 'library',
    category: 'reading',
    threshold: 10,
    measure: 'books_read' as const,
  },
  {
    code: 'explorer',
    name: 'Explorador',
    description: 'Entrou em 5 comunidades.',
    icon: 'compass',
    category: 'community',
    threshold: 5,
    measure: 'communities' as const,
  },
  {
    code: 'connector',
    name: 'Conector',
    description: 'Encontrou 10 pessoas com interesses em comum.',
    icon: 'users',
    category: 'social',
    threshold: 10,
    measure: 'following' as const,
  },
  {
    code: 'critic',
    name: 'Critico',
    description: 'Publicou sua primeira resenha.',
    icon: 'pen-line',
    category: 'social',
    threshold: 1,
    measure: 'reviews' as const,
  },
  {
    code: 'conversationalist',
    name: 'Boa Conversa',
    description: 'Participou de 25 discussoes.',
    icon: 'message-circle',
    category: 'community',
    threshold: 25,
    measure: 'comments' as const,
  },
  {
    code: 'founder',
    name: 'Anfitriao',
    description: 'Criou sua primeira comunidade.',
    icon: 'sparkles',
    category: 'community',
    threshold: 1,
    measure: 'owned_communities' as const,
  },
] as const;

export type AchievementMeasure = (typeof ACHIEVEMENT_CATALOG)[number]['measure'];

async function measureAll(userId: string): Promise<Record<AchievementMeasure, number>> {
  const [booksRead, communities, following, reviews, comments, owned] = await Promise.all([
    prisma.userBook.count({ where: { userId, status: ReadingStatus.READ } }),
    prisma.communityMember.count({ where: { userId, status: MembershipStatus.ACTIVE } }),
    prisma.follow.count({ where: { followerId: userId } }),
    prisma.review.count({ where: { userId } }),
    prisma.comment.count({ where: { authorId: userId } }),
    prisma.community.count({ where: { ownerId: userId } }),
  ]);
  return {
    books_read: booksRead,
    communities,
    following,
    reviews,
    comments,
    owned_communities: owned,
  };
}

/**
 * Reavaliacao idempotente: chamada depois de acoes relevantes, so grava o que
 * ainda nao existe. Rodar duas vezes nao duplica nem re-notifica.
 */
export async function evaluateAchievements(userId: string) {
  const [measures, achievements, unlocked] = await Promise.all([
    measureAll(userId),
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ]);

  const unlockedSet = new Set(unlocked.map((u) => u.achievementId));
  const byCode = new Map(achievements.map((a) => [a.code, a]));
  const newlyUnlocked: string[] = [];

  for (const def of ACHIEVEMENT_CATALOG) {
    const record = byCode.get(def.code);
    if (!record || unlockedSet.has(record.id)) continue;
    if (measures[def.measure] >= def.threshold) {
      await prisma.userAchievement.create({ data: { userId, achievementId: record.id } });
      newlyUnlocked.push(def.code);
      await createNotification({
        userId,
        type: 'ACHIEVEMENT',
        title: `Conquista desbloqueada: ${def.name}`,
        body: def.description,
        href: '/perfil',
        entityType: 'achievement',
        entityId: record.id,
      });
    }
  }

  return newlyUnlocked;
}

export async function listAchievements(userId: string) {
  const [achievements, unlocked] = await Promise.all([
    prisma.achievement.findMany(),
    prisma.userAchievement.findMany({ where: { userId } }),
  ]);
  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));
  return achievements.map((a) => ({
    code: a.code,
    name: a.name,
    description: a.description,
    icon: a.icon,
    category: a.category,
    threshold: a.threshold,
    unlockedAt: unlockedMap.get(a.id) ?? null,
  }));
}
