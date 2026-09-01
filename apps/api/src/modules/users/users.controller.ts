import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUserId } from '../../middlewares/auth.middleware';
import { parseQuery } from '../../middlewares/validate.middleware';
import { listAchievements } from '../achievements/achievements.service';
import { listUserPosts } from '../posts/posts.service';
import * as service from './users.service';

const searchQuerySchema = z.object({ q: z.string().min(2), limit: z.coerce.number().min(1).max(30).optional() });
const suggestQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(30).optional(),
  bookId: z.string().optional(),
});

export async function getProfile(req: Request, res: Response) {
  const profile = await service.getPublicProfile(req.params.username!, req.userId);
  res.json(profile);
}

export async function getProfilePosts(req: Request, res: Response) {
  res.json({ items: await listUserPosts(req.params.username!, req.userId) });
}

export async function updateMyProfile(req: Request, res: Response) {
  const profile = await service.updateProfile(currentUserId(req), req.body);
  res.json({ profile });
}

export async function follow(req: Request, res: Response) {
  res.json(await service.followUser(currentUserId(req), req.params.username!));
}

export async function unfollow(req: Request, res: Response) {
  res.json(await service.unfollowUser(currentUserId(req), req.params.username!));
}

export async function followers(req: Request, res: Response) {
  res.json({ items: await service.listConnections(req.params.username!, 'followers') });
}

export async function following(req: Request, res: Response) {
  res.json({ items: await service.listConnections(req.params.username!, 'following') });
}

export async function suggested(req: Request, res: Response) {
  const query = parseQuery(req, suggestQuerySchema);
  res.json({ items: await service.getSuggestedPeople(currentUserId(req), query) });
}

export async function search(req: Request, res: Response) {
  const query = parseQuery(req, searchQuerySchema);
  res.json({ items: await service.searchPeople(query.q, req.userId, query.limit) });
}

export async function compatibility(req: Request, res: Response) {
  const viewerId = currentUserId(req);
  const target = await service.getPublicProfile(req.params.username!, viewerId);
  res.json(await service.getCompatibilityBetween(viewerId, target.id));
}

export async function achievements(req: Request, res: Response) {
  res.json({ items: await listAchievements(currentUserId(req)) });
}
