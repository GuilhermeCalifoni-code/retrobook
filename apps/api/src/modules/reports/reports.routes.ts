import { Router } from 'express';
import { ReportTargetType } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { currentUserId, requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { REPORT_REASONS, createReport } from './reports.service';

export const reportsRouter = Router();

reportsRouter.get(
  '/reasons',
  asyncHandler(async (_req, res) => {
    res.json({ items: REPORT_REASONS });
  }),
);

reportsRouter.post(
  '/',
  requireAuth,
  validate(
    z.object({
      targetType: z.nativeEnum(ReportTargetType),
      targetId: z.string().min(1),
      reason: z.string().min(1),
      details: z.string().max(1000).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createReport(currentUserId(req), req.body));
  }),
);
