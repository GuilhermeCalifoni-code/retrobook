import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { currentUserId, optionalAuth, requireAuth } from '../../middlewares/auth.middleware';
import { parseQuery } from '../../middlewares/validate.middleware';
import { resolveBookId } from '../books/books.service';
import { getProductMetrics } from '../analytics/events.service';
import { prisma } from '../../database/prisma';
import { ApiError } from '../../common/api-error';
import { getBookPresence, getUniverse } from './universe.service';
import { loadTasteContext, recommendSerendipity } from '../recommendations/recommendation.engine';

export const universeRouter = Router();

/** Seu Universo: o mapa de gostos e as conexoes que saem dele. */
universeRouter.get(
  '/universe',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getUniverse(currentUserId(req)));
  }),
);

/** Leitores agora (secao 7): presenca em torno de um livro. */
universeRouter.get(
  '/books/:slug/presence',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const bookId = await resolveBookId(req.params.slug!);
    const { take } = parseQuery(req, z.object({ take: z.coerce.number().min(1).max(40).optional() }));
    res.json(await getBookPresence(bookId, req.userId, take));
  }),
);

/** Descoberta serendipita (secao 20): fora do radar, mas com caminho ate voce. */
universeRouter.get(
  '/serendipity',
  requireAuth,
  asyncHandler(async (req, res) => {
    const context = await loadTasteContext(currentUserId(req));
    const results = await recommendSerendipity(context, 6);
    res.json({ items: results.map((entry) => ({ ...entry.item, reason: entry.reasons[0]?.label })) });
  }),
);

/**
 * Metricas de produto (secoes 54 e 55).
 * Restrito a administradores — e a base do futuro painel da secao 58.
 */
universeRouter.get(
  '/metrics',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId(req) },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) throw ApiError.forbidden('Apenas administradores acessam as metricas.');

    const { days } = parseQuery(req, z.object({ days: z.coerce.number().min(1).max(365).optional() }));
    res.json(await getProductMetrics(days ?? 30));
  }),
);
