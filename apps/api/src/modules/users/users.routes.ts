import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { optionalAuth, requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { usernameSchema } from '../auth/auth.dto';
import * as controller from './users.controller';

const updateProfileSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  username: usernameSchema.optional(),
  bio: z.string().max(280).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  location: z.string().max(80).nullable().optional(),
  website: z.string().url().nullable().optional(),
  pronouns: z.string().max(24).nullable().optional(),
});

export const usersRouter = Router();

usersRouter.get('/search', optionalAuth, asyncHandler(controller.search));
usersRouter.get('/suggested', requireAuth, asyncHandler(controller.suggested));
usersRouter.get('/me/achievements', requireAuth, asyncHandler(controller.achievements));
usersRouter.patch('/me', requireAuth, validate(updateProfileSchema), asyncHandler(controller.updateMyProfile));

usersRouter.get('/:username', optionalAuth, asyncHandler(controller.getProfile));
usersRouter.get('/:username/posts', optionalAuth, asyncHandler(controller.getProfilePosts));
usersRouter.get('/:username/followers', optionalAuth, asyncHandler(controller.followers));
usersRouter.get('/:username/following', optionalAuth, asyncHandler(controller.following));
usersRouter.get('/:username/compatibility', requireAuth, asyncHandler(controller.compatibility));
usersRouter.post('/:username/follow', requireAuth, asyncHandler(controller.follow));
usersRouter.delete('/:username/follow', requireAuth, asyncHandler(controller.unfollow));
