import type { Request, Response } from 'express';
import { CommunityRole, MembershipStatus, PostType } from '@prisma/client';
import { z } from 'zod';
import { currentUserId } from '../../middlewares/auth.middleware';
import { parseQuery } from '../../middlewares/validate.middleware';
import { listCommunityPosts } from '../posts/posts.service';
import * as service from './communities.service';
import { getHotDiscussions } from './community-activity.service';
import { getCommunityHealth } from './community-pulse.service';
import { ApiError } from '../../common/api-error';

const listQuerySchema = z.object({
  q: z.string().optional(),
  genre: z.string().optional(),
  tag: z.string().optional(),
  sort: z.enum(['popular', 'active', 'recent']).optional(),
  cursor: z.string().optional(),
  take: z.coerce.number().min(1).max(40).optional(),
  mine: z.coerce.boolean().optional(),
});

const postsQuerySchema = z.object({
  cursor: z.string().optional(),
  take: z.coerce.number().min(1).max(30).optional(),
  sort: z.enum(['recent', 'hot', 'discussed']).optional(),
  type: z.nativeEnum(PostType).optional(),
});

const membersQuerySchema = z.object({
  status: z.nativeEnum(MembershipStatus).optional(),
  cursor: z.string().optional(),
  take: z.coerce.number().min(1).max(60).optional(),
  q: z.string().max(60).optional(),
  sort: z.enum(['recent', 'active', 'alphabetical']).optional(),
});

export async function list(req: Request, res: Response) {
  const query = parseQuery(req, listQuerySchema);
  res.json(
    await service.listCommunities({
      viewerId: req.userId,
      query: query.q,
      genre: query.genre,
      tag: query.tag,
      sort: query.sort,
      cursor: query.cursor,
      take: query.take,
      onlyMine: query.mine,
    }),
  );
}

export async function detail(req: Request, res: Response) {
  res.json(await service.getCommunityDetail(req.params.slug!, req.userId));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await service.createCommunity(currentUserId(req), req.body));
}

export async function update(req: Request, res: Response) {
  const community = await service.getCommunityDetail(req.params.slug!, req.userId);
  res.json(await service.updateCommunity(community.id, currentUserId(req), req.body));
}

export async function posts(req: Request, res: Response) {
  res.json(await listCommunityPosts(req.params.slug!, req.userId, parseQuery(req, postsQuerySchema)));
}

export async function join(req: Request, res: Response) {
  res.json(await service.joinCommunity(req.params.slug!, currentUserId(req)));
}

export async function leave(req: Request, res: Response) {
  res.json(await service.leaveCommunity(req.params.slug!, currentUserId(req)));
}

export async function members(req: Request, res: Response) {
  const query = parseQuery(req, membersQuerySchema);
  res.json(
    await service.listMembers(req.params.slug!, req.userId, {
      status: query.status,
      cursor: query.cursor,
      take: query.take,
      query: query.q,
      sort: query.sort,
    }),
  );
}

export async function approve(req: Request, res: Response) {
  res.json(await service.approveMember(req.params.slug!, currentUserId(req), req.params.userId!));
}

export async function reject(req: Request, res: Response) {
  res.json(await service.rejectMember(req.params.slug!, currentUserId(req), req.params.userId!));
}

export async function setRole(req: Request, res: Response) {
  res.json(
    await service.setMemberRole(
      req.params.slug!,
      currentUserId(req),
      req.params.userId!,
      req.body.role as CommunityRole,
    ),
  );
}

export async function ban(req: Request, res: Response) {
  res.json(await service.banMember(req.params.slug!, currentUserId(req), req.params.userId!));
}

export async function mute(req: Request, res: Response) {
  res.json(await service.muteMember(req.params.slug!, currentUserId(req), req.params.userId!, req.body.hours ?? 24));
}

export async function replaceRules(req: Request, res: Response) {
  res.json({ items: await service.replaceRules(req.params.slug!, currentUserId(req), req.body.rules) });
}

export async function attachBook(req: Request, res: Response) {
  res.json(await service.attachBook(req.params.slug!, currentUserId(req), req.body.bookId));
}

export async function detachBook(req: Request, res: Response) {
  res.json(await service.detachBook(req.params.slug!, currentUserId(req), req.params.bookId!));
}

export async function recommended(req: Request, res: Response) {
  res.json({ items: await service.getRecommendedCommunities(currentUserId(req)) });
}

export async function analytics(req: Request, res: Response) {
  res.json(await service.getCommunityAnalytics(req.params.slug!, currentUserId(req)));
}

/** Conversas em alta (secao 8): ranking por calor, nao por curtidas. */
export async function hotDiscussions(req: Request, res: Response) {
  const community = await service.getCommunityDetail(req.params.slug!, req.userId);
  if (!community.viewer.canViewContent) throw ApiError.forbidden('Esta comunidade e privada.');
  res.json({ items: await getHotDiscussions(community.id, req.userId, 5) });
}

/** Saude da comunidade (secao 34): visivel apenas para quem administra. */
export async function health(req: Request, res: Response) {
  const community = await service.getCommunityDetail(req.params.slug!, req.userId);
  if (!community.viewer.canModerate) throw ApiError.forbidden('Apenas moderadores veem estes numeros.');
  res.json(await getCommunityHealth(community.id));
}
