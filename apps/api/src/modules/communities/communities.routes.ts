import { Router } from 'express';
import { CommunityPrivacy, CommunityRole } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { optionalAuth, requireAuth } from '../../middlewares/auth.middleware';
import { writeLimiter } from '../../middlewares/rate-limit';
import { validate } from '../../middlewares/validate.middleware';
import * as controller from './communities.controller';

const ruleSchema = z.object({
  title: z.string().min(3, 'Descreva a regra.').max(120),
  description: z.string().max(500).optional(),
});

const createSchema = z.object({
  name: z.string().min(3, 'A comunidade precisa de um nome.').max(60),
  tagline: z.string().max(120).optional(),
  description: z.string().min(20, 'Conte em poucas linhas do que se trata.').max(2000),
  genreSlug: z.string().optional(),
  tags: z.array(z.string().max(24)).max(8).optional(),
  avatarUrl: z.string().url().optional(),
  coverUrl: z.string().url().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  privacy: z.nativeEnum(CommunityPrivacy).default(CommunityPrivacy.PUBLIC),
  requireApproval: z.boolean().optional(),
  allowMemberPosts: z.boolean().optional(),
  requirePostApproval: z.boolean().optional(),
  rules: z.array(ruleSchema).max(12).optional(),
  bookIds: z.array(z.string()).max(12).optional(),
});

const updateSchema = createSchema.partial();

export const communitiesRouter = Router();

communitiesRouter.get('/', optionalAuth, asyncHandler(controller.list));
communitiesRouter.get('/recommended', requireAuth, asyncHandler(controller.recommended));
communitiesRouter.post('/', requireAuth, writeLimiter, validate(createSchema), asyncHandler(controller.create));

communitiesRouter.get('/:slug', optionalAuth, asyncHandler(controller.detail));
communitiesRouter.patch('/:slug', requireAuth, validate(updateSchema), asyncHandler(controller.update));
communitiesRouter.get('/:slug/posts', optionalAuth, asyncHandler(controller.posts));
communitiesRouter.get('/:slug/members', optionalAuth, asyncHandler(controller.members));
communitiesRouter.get('/:slug/analytics', requireAuth, asyncHandler(controller.analytics));
communitiesRouter.get('/:slug/hot', optionalAuth, asyncHandler(controller.hotDiscussions));
communitiesRouter.get('/:slug/health', requireAuth, asyncHandler(controller.health));

communitiesRouter.post('/:slug/join', requireAuth, asyncHandler(controller.join));
communitiesRouter.delete('/:slug/join', requireAuth, asyncHandler(controller.leave));

communitiesRouter.post('/:slug/members/:userId/approve', requireAuth, asyncHandler(controller.approve));
communitiesRouter.delete('/:slug/members/:userId', requireAuth, asyncHandler(controller.reject));
communitiesRouter.patch(
  '/:slug/members/:userId/role',
  requireAuth,
  validate(z.object({ role: z.nativeEnum(CommunityRole) })),
  asyncHandler(controller.setRole),
);
communitiesRouter.post('/:slug/members/:userId/ban', requireAuth, asyncHandler(controller.ban));
communitiesRouter.post(
  '/:slug/members/:userId/mute',
  requireAuth,
  validate(z.object({ hours: z.number().int().min(1).max(720).optional() })),
  asyncHandler(controller.mute),
);

communitiesRouter.put(
  '/:slug/rules',
  requireAuth,
  validate(z.object({ rules: z.array(ruleSchema).max(12) })),
  asyncHandler(controller.replaceRules),
);

communitiesRouter.post(
  '/:slug/books',
  requireAuth,
  validate(z.object({ bookId: z.string().min(1) })),
  asyncHandler(controller.attachBook),
);
communitiesRouter.delete('/:slug/books/:bookId', requireAuth, asyncHandler(controller.detachBook));
