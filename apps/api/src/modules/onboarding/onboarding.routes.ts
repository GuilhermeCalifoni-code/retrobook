import { Router } from 'express';
import { ReadingGoalIntent } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { currentUserId, requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as service from './onboarding.service';

export const onboardingRouter = Router();
onboardingRouter.use(requireAuth);

onboardingRouter.put(
  '/interests',
  validate(
    z.object({
      genreSlugs: z.array(z.string()).max(24),
      customGenres: z.array(z.string().max(30)).max(5).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.json(await service.saveInterests(currentUserId(req), req.body.genreSlugs, req.body.customGenres));
  }),
);

onboardingRouter.put(
  '/books',
  validate(
    z.object({
      reading: z.array(z.string()).max(20).optional(),
      read: z.array(z.string()).max(40).optional(),
      wantToRead: z.array(z.string()).max(40).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    res.json(await service.saveOnboardingBooks(currentUserId(req), req.body));
  }),
);

onboardingRouter.put(
  '/goal',
  validate(z.object({ goal: z.nativeEnum(ReadingGoalIntent) })),
  asyncHandler(async (req, res) => {
    res.json(await service.saveGoal(currentUserId(req), req.body.goal));
  }),
);

onboardingRouter.get(
  '/recommendations',
  asyncHandler(async (req, res) => {
    res.json(await service.getOnboardingRecommendations(currentUserId(req)));
  }),
);

onboardingRouter.post(
  '/complete',
  asyncHandler(async (req, res) => {
    res.json(await service.completeOnboarding(currentUserId(req)));
  }),
);
