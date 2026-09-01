import type { Request, Response } from 'express';
import { z } from 'zod';
import { currentUserId } from '../../middlewares/auth.middleware';
import { parseQuery } from '../../middlewares/validate.middleware';
import * as service from './posts.service';

const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  take: z.coerce.number().min(1).max(30).optional(),
  scope: z.enum(['all', 'following', 'communities']).optional(),
});

export async function feed(req: Request, res: Response) {
  res.json(await service.getFeed(currentUserId(req), parseQuery(req, feedQuerySchema)));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await service.createPost(currentUserId(req), req.body));
}

export async function detail(req: Request, res: Response) {
  res.json(await service.getPostDetail(req.params.id!, req.userId));
}

export async function react(req: Request, res: Response) {
  res.json(await service.togglePostReaction(req.params.id!, currentUserId(req)));
}

export async function save(req: Request, res: Response) {
  res.json(await service.toggleSavePost(req.params.id!, currentUserId(req)));
}

export async function saved(req: Request, res: Response) {
  res.json({ items: await service.listSavedPosts(currentUserId(req)) });
}

export async function comment(req: Request, res: Response) {
  res.status(201).json(await service.createComment(req.params.id!, currentUserId(req), req.body));
}

export async function comments(req: Request, res: Response) {
  res.json({ items: await service.listComments(req.params.id!, req.userId) });
}

export async function reactComment(req: Request, res: Response) {
  res.json(await service.toggleCommentReaction(req.params.commentId!, currentUserId(req)));
}

export async function removeComment(req: Request, res: Response) {
  res.json(await service.removeComment(req.params.commentId!, currentUserId(req)));
}

export async function remove(req: Request, res: Response) {
  res.json(await service.removePost(req.params.id!, currentUserId(req), req.body?.reason));
}

export async function pin(req: Request, res: Response) {
  res.json(await service.setPinned(req.params.id!, currentUserId(req), Boolean(req.body.pinned)));
}

export async function lock(req: Request, res: Response) {
  res.json(await service.setLocked(req.params.id!, currentUserId(req), Boolean(req.body.locked)));
}
