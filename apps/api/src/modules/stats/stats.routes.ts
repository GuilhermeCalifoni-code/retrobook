import { Router } from 'express';
import { asyncHandler } from '../../common/http';
import { currentUserId, requireAuth } from '../../middlewares/auth.middleware';
import { getReadingStats } from './stats.service';

export const statsRouter = Router();

statsRouter.get(
  '/reading',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getReadingStats(currentUserId(req)));
  }),
);
