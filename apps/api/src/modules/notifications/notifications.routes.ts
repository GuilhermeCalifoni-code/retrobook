import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { currentUserId, requireAuth } from '../../middlewares/auth.middleware';
import { parseQuery, validate } from '../../middlewares/validate.middleware';
import * as service from './notifications.service';

const listQuerySchema = z.object({
  cursor: z.string().optional(),
  take: z.coerce.number().min(1).max(50).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await service.listNotifications(currentUserId(req), parseQuery(req, listQuerySchema)));
  }),
);

notificationsRouter.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    res.json({ count: await service.unreadCount(currentUserId(req)) });
  }),
);

notificationsRouter.post(
  '/read',
  validate(z.object({ ids: z.array(z.string()).optional() })),
  asyncHandler(async (req, res) => {
    res.json({ unread: await service.markAsRead(currentUserId(req), req.body.ids) });
  }),
);
