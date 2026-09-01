import { Router } from 'express';
import { ReadingStatus } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { writeLimiter } from '../../middlewares/rate-limit';
import * as controller from './library.controller';
import { getFinishCelebration, shareReadingUpdate } from './reading-update.service';
import { currentUserId } from '../../middlewares/auth.middleware';

const addSchema = z.object({
  bookId: z.string().min(1),
  status: z.nativeEnum(ReadingStatus).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  isFavorite: z.boolean().optional(),
});

const updateSchema = z
  .object({
    status: z.nativeEnum(ReadingStatus).optional(),
    currentChapter: z.number().int().min(0).max(999).optional(),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    isFavorite: z.boolean().optional(),
    currentPage: z.number().int().min(0).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    note: z.string().max(280).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nada para atualizar.');

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  content: z.string().min(10, 'Conte um pouco mais sobre o que voce achou.').max(5000),
  containsSpoiler: z.boolean().optional(),
});

export const libraryRouter = Router();
libraryRouter.use(requireAuth);

libraryRouter.get('/', asyncHandler(controller.list));
libraryRouter.get('/currently-reading', asyncHandler(controller.currentlyReading));
libraryRouter.post('/books', validate(addSchema), asyncHandler(controller.add));
libraryRouter.patch('/books/:bookId', validate(updateSchema), asyncHandler(controller.update));
libraryRouter.delete('/books/:bookId', asyncHandler(controller.remove));
libraryRouter.put('/books/:bookId/review', validate(reviewSchema), asyncHandler(controller.upsertReview));
libraryRouter.delete('/books/:bookId/review', asyncHandler(controller.deleteReview));

/** Compartilhar progresso como atividade social (secao 12). */
libraryRouter.post(
  '/books/:bookId/share-progress',
  writeLimiter,
  validate(
    z.object({
      note: z.string().max(500).optional(),
      finished: z.boolean().optional(),
      communitySlug: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.status(201).json(await shareReadingUpdate(currentUserId(req), { bookId: req.params.bookId!, ...req.body }));
  }),
);

/** O que oferecer no momento em que alguem termina um livro (secao 28). */
libraryRouter.get(
  '/books/:bookId/celebration',
  asyncHandler(async (req, res) => {
    res.json(await getFinishCelebration(currentUserId(req), req.params.bookId!));
  }),
);
