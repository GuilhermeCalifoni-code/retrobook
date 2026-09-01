import type { Request, Response } from 'express';
import { z } from 'zod';
import { parseQuery } from '../../middlewares/validate.middleware';
import { listBookPosts } from '../posts/posts.service';
import * as service from './books.service';

const listQuerySchema = z.object({
  genre: z.string().optional(),
  sort: z.enum(['popular', 'rating', 'recent']).optional(),
  cursor: z.string().optional(),
  take: z.coerce.number().min(1).max(48).optional(),
});

const searchQuerySchema = z.object({
  q: z.string().min(2, 'Digite ao menos 2 caracteres.'),
  limit: z.coerce.number().min(1).max(24).optional(),
});

export async function list(req: Request, res: Response) {
  res.json(await service.listBooks(parseQuery(req, listQuerySchema)));
}

export async function search(req: Request, res: Response) {
  const { q, limit } = parseQuery(req, searchQuerySchema);
  res.json({ items: await service.searchBooks(q, limit) });
}

export async function detail(req: Request, res: Response) {
  res.json(await service.getBookDetail(req.params.slug!, req.userId));
}

export async function readers(req: Request, res: Response) {
  const bookId = await service.resolveBookId(req.params.slug!);
  res.json(await service.getBookReaders(bookId, req.userId));
}

export async function discussions(req: Request, res: Response) {
  const bookId = await service.resolveBookId(req.params.slug!);
  res.json({ items: await listBookPosts(bookId, req.userId) });
}

export async function genres(_req: Request, res: Response) {
  res.json({ items: await service.listGenres() });
}
