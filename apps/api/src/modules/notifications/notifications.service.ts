import type { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { buildCursorPage } from '../../common/http';
import { serializeUser, publicUserSelect } from '../../shared/selectors';

type PreferenceKey =
  | 'notifyComments'
  | 'notifyFollowers'
  | 'notifyCommunities'
  | 'notifyRecommendations'
  | 'notifyMessages';

interface CreateNotificationInput {
  userId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  entityType?: string;
  entityId?: string;
  /** Respeita as preferencias da secao 51 antes de gravar. */
  preferenceKey?: PreferenceKey;
}

export async function createNotification(input: CreateNotificationInput) {
  if (input.actorId === input.userId) return null; // nao notificamos a propria acao

  if (input.preferenceKey) {
    const profile = await prisma.profile.findUnique({
      where: { userId: input.userId },
      select: { [input.preferenceKey]: true } as Prisma.ProfileSelect,
    });
    if (profile && (profile as Record<string, unknown>)[input.preferenceKey] === false) return null;
  }

  return prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });
}

/** Envia a mesma notificacao para varios destinatarios (ex.: novo post na comunidade). */
export async function createNotificationsBulk(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>) {
  const targets = userIds.filter((id) => id !== input.actorId);
  if (targets.length === 0) return;
  await prisma.notification.createMany({
    data: targets.map((userId) => ({
      userId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
      entityType: input.entityType,
      entityId: input.entityId,
    })),
  });
}

export async function listNotifications(userId: string, opts: { cursor?: string; take?: number; unreadOnly?: boolean }) {
  const take = Math.min(opts.take ?? 20, 50);
  const rows = await prisma.notification.findMany({
    where: { userId, ...(opts.unreadOnly ? { readAt: null } : {}) },
    include: { actor: { select: publicUserSelect } },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const page = buildCursorPage(rows, take);
  return {
    ...page,
    items: page.items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      entityType: n.entityType,
      entityId: n.entityId,
      readAt: n.readAt,
      createdAt: n.createdAt,
      actor: n.actor ? serializeUser(n.actor) : null,
    })),
  };
}

export async function markAsRead(userId: string, ids?: string[]) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
