import { Router } from 'express';
import { asyncHandler } from '../../common/http';
import { currentUserId, requireAuth } from '../../middlewares/auth.middleware';
import { getPlanUsage, listPlans } from './plans.service';

export const subscriptionsRouter = Router();

/** Catalogo publico de planos — alimenta a landing e a pagina de configuracoes. */
subscriptionsRouter.get(
  '/plans',
  asyncHandler(async (_req, res) => {
    res.json({ items: await listPlans() });
  }),
);

subscriptionsRouter.get(
  '/usage',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getPlanUsage(currentUserId(req)));
  }),
);
