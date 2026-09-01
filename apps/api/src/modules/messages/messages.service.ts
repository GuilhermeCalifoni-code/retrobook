import { ApiError } from '../../common/api-error';
import { stripHtml } from '../../common/text';
import { prisma } from '../../database/prisma';
import { bookCardSelect, communityCardSelect, publicUserSelect, serializeBook, serializeCommunity, serializeUser } from '../../shared/selectors';
import { createNotification } from '../notifications/notifications.service';

/**
 * Mensagens diretas (secao 29). Escopo deliberadamente enxuto no MVP —
 * conversa 1:1, texto e compartilhamento de livro/comunidade — mas o modelo
 * (Conversation + Participant) ja suporta grupo e leitura por participante.
 */

async function assertCanMessage(senderId: string, recipientId: string) {
  if (senderId === recipientId) throw ApiError.badRequest('Voce nao pode conversar consigo mesmo.');

  const [recipient, block] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: recipientId }, select: { allowMessages: true, name: true } }),
    prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: recipientId, blockedId: senderId },
          { blockerId: senderId, blockedId: recipientId },
        ],
      },
    }),
  ]);

  if (!recipient) throw ApiError.notFound('Leitor nao encontrado.');
  if (block) throw ApiError.forbidden('Nao e possivel enviar mensagens para este perfil.');
  if (!recipient.allowMessages) throw ApiError.forbidden(`${recipient.name} nao esta recebendo mensagens no momento.`);
}

export async function openConversation(userId: string, otherUsername: string) {
  const other = await prisma.user.findFirst({
    where: { profile: { username: otherUsername } },
    select: { id: true },
  });
  if (!other) throw ApiError.notFound('Leitor nao encontrado.');
  await assertCanMessage(userId, other.id);

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: other.id } } }],
    },
    select: { id: true },
  });
  if (existing) return { id: existing.id };

  const conversation = await prisma.conversation.create({
    data: { participants: { create: [{ userId }, { userId: other.id }] } },
  });
  return { id: conversation.id };
}

export async function listConversations(userId: string) {
  const rows = await prisma.conversationParticipant.findMany({
    where: { userId, isArchived: false },
    include: {
      conversation: {
        include: {
          participants: { where: { userId: { not: userId } }, include: { user: { select: publicUserSelect } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: 'desc' } },
    take: 40,
  });

  return rows.map((row) => {
    const last = row.conversation.messages[0];
    const other = row.conversation.participants[0];
    return {
      id: row.conversation.id,
      with: other ? serializeUser(other.user) : null,
      lastMessage: last
        ? { body: last.body, createdAt: last.createdAt, senderId: last.senderId, hasAttachment: Boolean(last.sharedBookId || last.sharedCommunityId) }
        : null,
      lastMessageAt: row.conversation.lastMessageAt,
      unread: Boolean(last && (!row.lastReadAt || last.createdAt > row.lastReadAt) && last.senderId !== userId),
    };
  });
}

export async function getConversation(conversationId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!participant) throw ApiError.forbidden('Esta conversa nao e sua.');

  const [messages, others] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: publicUserSelect },
        sharedBook: { select: bookCardSelect },
        sharedCommunity: { select: communityCardSelect },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    }),
    prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      include: { user: { select: publicUserSelect } },
    }),
  ]);

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  });

  return {
    id: conversationId,
    with: others[0] ? serializeUser(others[0].user) : null,
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      isMine: m.senderId === userId,
      sender: serializeUser(m.sender),
      sharedBook: m.sharedBook ? serializeBook(m.sharedBook) : null,
      sharedCommunity: m.sharedCommunity ? serializeCommunity(m.sharedCommunity) : null,
    })),
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  input: { body?: string; sharedBookId?: string; sharedCommunityId?: string },
) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: senderId } },
  });
  if (!participant) throw ApiError.forbidden('Esta conversa nao e sua.');

  const body = input.body ? stripHtml(input.body) : undefined;
  if (!body && !input.sharedBookId && !input.sharedCommunityId) {
    throw ApiError.badRequest('Escreva algo ou compartilhe um livro.');
  }

  const others = await prisma.conversationParticipant.findMany({
    where: { conversationId, userId: { not: senderId } },
    select: { userId: true },
  });
  for (const other of others) await assertCanMessage(senderId, other.userId);

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId,
        body,
        sharedBookId: input.sharedBookId,
        sharedCommunityId: input.sharedCommunityId,
      },
      include: {
        sender: { select: publicUserSelect },
        sharedBook: { select: bookCardSelect },
        sharedCommunity: { select: communityCardSelect },
      },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ]);

  const profile = await prisma.profile.findUnique({ where: { userId: senderId } });
  for (const other of others) {
    await createNotification({
      userId: other.userId,
      actorId: senderId,
      type: 'MESSAGE',
      title: `${profile?.name ?? 'Alguem'} te enviou uma mensagem.`,
      href: `/mensagens/${conversationId}`,
      entityType: 'conversation',
      entityId: conversationId,
      preferenceKey: 'notifyMessages',
    });
  }

  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt,
    isMine: true,
    sender: serializeUser(message.sender),
    sharedBook: message.sharedBook ? serializeBook(message.sharedBook) : null,
    sharedCommunity: message.sharedCommunity ? serializeCommunity(message.sharedCommunity) : null,
  };
}

export async function blockUser(userId: string, targetUsername: string) {
  const target = await prisma.user.findFirst({
    where: { profile: { username: targetUsername } },
    select: { id: true },
  });
  if (!target) throw ApiError.notFound('Leitor nao encontrado.');
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: userId, blockedId: target.id } },
    update: {},
    create: { blockerId: userId, blockedId: target.id },
  });
  // Bloquear tambem desfaz o vinculo social nos dois sentidos.
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: userId, followingId: target.id },
        { followerId: target.id, followingId: userId },
      ],
    },
  });
  return { blocked: true };
}

export async function unblockUser(userId: string, targetUsername: string) {
  const target = await prisma.user.findFirst({
    where: { profile: { username: targetUsername } },
    select: { id: true },
  });
  if (!target) throw ApiError.notFound('Leitor nao encontrado.');
  await prisma.block
    .delete({ where: { blockerId_blockedId: { blockerId: userId, blockedId: target.id } } })
    .catch(() => undefined);
  return { blocked: false };
}
