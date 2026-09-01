import type { Request, Response } from 'express';
import { ReadingStatus } from '@prisma/client';
import { z } from 'zod';
import { currentUserId } from '../../middlewares/auth.middleware';
import { parseQuery } from '../../middlewares/validate.middleware';
import * as service from './library.service';

const listQuerySchema = z.object({ status: z.nativeEnum(ReadingStatus).optional() });

export async function list(req: Request, res: Response) {
  const { status } = parseQuery(req, listQuerySchema);
  res.json(await service.listLibrary(currentUserId(req), status));
}

export async function currentlyReading(req: Request, res: Response) {
  res.json({ items: await service.getCurrentlyReading(currentUserId(req)) });
}

export async function add(req: Request, res: Response) {
  res.status(201).json(await service.addToLibrary(currentUserId(req), req.body));
}

export async function update(req: Request, res: Response) {
  res.json(await service.updateLibraryEntry(currentUserId(req), req.params.bookId!, req.body));
}

export async function remove(req: Request, res: Response) {
  res.json(await service.removeFromLibrary(currentUserId(req), req.params.bookId!));
}

export async function upsertReview(req: Request, res: Response) {
  res.json(await service.upsertReview(currentUserId(req), req.params.bookId!, req.body));
}

export async function deleteReview(req: Request, res: Response) {
  res.json(await service.deleteReview(currentUserId(req), req.params.bookId!));
}
