import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { currentUserId, requireAuth } from '../../middlewares/auth.middleware';
import { writeLimiter } from '../../middlewares/rate-limit';
import { validate } from '../../middlewares/validate.middleware';
import * as service from './messages.service';

const sendSchema = z
  .object({
    body: z.string().max(4000).optional(),
    sharedBookId: z.string().optional(),
    sharedCommunityId: z.string().optional(),
  })
  .refine((v) => Boolean(v.body || v.sharedBookId || v.sharedCommunityId), 'Escreva algo ou compartilhe um livro.');

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

messagesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ items: await service.listConversations(currentUserId(req)) });
  }),
);

messagesRouter.post(
  '/with/:username',
  validate(z.object({}).passthrough()),
  asyncHandler(async (req, res) => {
    res.json(await service.openConversation(currentUserId(req), req.params.username!));
  }),
);

messagesRouter.get(
  '/:conversationId',
  asyncHandler(async (req, res) => {
    res.json(await service.getConversation(req.params.conversationId!, currentUserId(req)));
  }),
);

messagesRouter.post(
  '/:conversationId',
  writeLimiter,
  validate(sendSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await service.sendMessage(req.params.conversationId!, currentUserId(req), req.body));
  }),
);

messagesRouter.post(
  '/block/:username',
  asyncHandler(async (req, res) => {
    res.json(await service.blockUser(currentUserId(req), req.params.username!));
  }),
);

messagesRouter.delete(
  '/block/:username',
  asyncHandler(async (req, res) => {
    res.json(await service.unblockUser(currentUserId(req), req.params.username!));
  }),
);
