import { Router } from 'express';
import { PostType, SpoilerScopeType } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { QUOTE_MAX_CHARS } from '../../common/text';
import { optionalAuth, requireAuth } from '../../middlewares/auth.middleware';
import { writeLimiter } from '../../middlewares/rate-limit';
import { validate } from '../../middlewares/validate.middleware';
import * as controller from './posts.controller';

const createPostSchema = z
  .object({
    communitySlug: z.string().optional(),
    bookId: z.string().optional(),
    type: z.nativeEnum(PostType).default(PostType.DISCUSSION),
    title: z.string().max(140).optional(),
    content: z.string().min(2, 'Escreva sua ideia.').max(10000),
    containsSpoiler: z.boolean().optional(),
    spoilerScopeType: z.nativeEnum(SpoilerScopeType).optional(),
    spoilerScopeValue: z.number().int().min(1).max(9999).optional(),
    quoteText: z.string().max(QUOTE_MAX_CHARS).optional(),
    quotePage: z.number().int().min(1).optional(),
    tags: z.array(z.string().max(24)).max(8).optional(),
  })
  .refine((v) => v.type !== PostType.QUOTE || Boolean(v.quoteText && v.bookId), {
    message: 'Citacoes precisam do trecho e do livro de origem.',
    path: ['quoteText'],
  });

const commentSchema = z.object({
  content: z.string().min(1, 'Escreva algo.').max(4000),
  parentId: z.string().optional(),
  containsSpoiler: z.boolean().optional(),
});

export const postsRouter = Router();

postsRouter.get('/feed', requireAuth, asyncHandler(controller.feed));
postsRouter.get('/saved', requireAuth, asyncHandler(controller.saved));
postsRouter.post('/', requireAuth, writeLimiter, validate(createPostSchema), asyncHandler(controller.create));

postsRouter.get('/:id', optionalAuth, asyncHandler(controller.detail));
postsRouter.post('/:id/reaction', requireAuth, asyncHandler(controller.react));
postsRouter.post('/:id/save', requireAuth, asyncHandler(controller.save));
postsRouter.get('/:id/comments', optionalAuth, asyncHandler(controller.comments));
postsRouter.post('/:id/comments', requireAuth, writeLimiter, validate(commentSchema), asyncHandler(controller.comment));
postsRouter.delete(
  '/:id',
  requireAuth,
  validate(z.object({ reason: z.string().max(200).optional() })),
  asyncHandler(controller.remove),
);
postsRouter.patch('/:id/pin', requireAuth, validate(z.object({ pinned: z.boolean() })), asyncHandler(controller.pin));
postsRouter.patch('/:id/lock', requireAuth, validate(z.object({ locked: z.boolean() })), asyncHandler(controller.lock));

export const commentsRouter = Router();
commentsRouter.post('/:commentId/reaction', requireAuth, asyncHandler(controller.reactComment));
commentsRouter.delete('/:commentId', requireAuth, asyncHandler(controller.removeComment));
