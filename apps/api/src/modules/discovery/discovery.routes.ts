import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { currentUserId, optionalAuth, requireAuth } from '../../middlewares/auth.middleware';
import { parseQuery } from '../../middlewares/validate.middleware';
import * as service from './discovery.service';

const searchQuerySchema = z.object({ q: z.string().max(120) });
const exploreQuerySchema = z.object({ genre: z.string().optional(), take: z.coerce.number().max(40).optional() });

export const discoveryRouter = Router();

discoveryRouter.get(
  '/search',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { q } = parseQuery(req, searchQuerySchema);
    res.json(await service.globalSearch(q, req.userId));
  }),
);

discoveryRouter.get(
  '/trending',
  optionalAuth,
  asyncHandler(async (req, res) => {
    res.json(await service.getTrending(req.userId));
  }),
);

discoveryRouter.get(
  '/discussions',
  optionalAuth,
  asyncHandler(async (req, res) => {
    res.json({ items: await service.exploreDiscussions(parseQuery(req, exploreQuerySchema)) });
  }),
);

discoveryRouter.get(
  '/home',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await service.getHomeDashboard(currentUserId(req)));
  }),
);

discoveryRouter.get(
  '/books/recommended',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ items: await service.getRecommendedBooks(currentUserId(req)) });
  }),
);
