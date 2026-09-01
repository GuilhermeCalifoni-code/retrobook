import { Router } from 'express';
import { ProfileVisibility, SpoilerPreference, ThemePreference } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { prisma } from '../../database/prisma';
import { currentUserId, requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { getSessionUser } from '../users/users.service';

/**
 * Configuracoes (secoes 50 e 51). Privacidade, aparencia e notificacoes vivem
 * no Profile: uma unica escrita mantem tudo consistente.
 */
const settingsSchema = z
  .object({
    visibility: z.nativeEnum(ProfileVisibility).optional(),
    showLibrary: z.boolean().optional(),
    showCurrentlyReading: z.boolean().optional(),
    showActivity: z.boolean().optional(),
    showCommunities: z.boolean().optional(),
    allowMessages: z.boolean().optional(),
    theme: z.nativeEnum(ThemePreference).optional(),
    spoilerPreference: z.nativeEnum(SpoilerPreference).optional(),
    notifyComments: z.boolean().optional(),
    notifyFollowers: z.boolean().optional(),
    notifyCommunities: z.boolean().optional(),
    notifyRecommendations: z.boolean().optional(),
    notifyMessages: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nada para atualizar.');

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.patch(
  '/',
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    await prisma.profile.update({ where: { userId }, data: req.body });
    res.json({ user: await getSessionUser(userId) });
  }),
);

settingsRouter.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const sessions = await prisma.session.findMany({
      where: { userId: currentUserId(req), revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: sessions });
  }),
);

settingsRouter.delete(
  '/sessions',
  asyncHandler(async (req, res) => {
    await prisma.session.updateMany({
      where: { userId: currentUserId(req), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.json({ ok: true });
  }),
);
