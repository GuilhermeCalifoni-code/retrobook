import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../common/api-error';
import { ACCESS_COOKIE, verifyAccessToken } from '../modules/auth/token.service';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function readToken(req: Request): string | null {
  const cookie = (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
  if (cookie) return cookie;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Popula req.userId quando houver sessao valida; nunca bloqueia. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) req.userId = payload.sub;
  }
  next();
}

/** Exige sessao valida. Responde 401 para o cliente tentar o refresh. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return next(ApiError.unauthorized());
  req.userId = payload.sub;
  next();
}

export function currentUserId(req: Request): string {
  if (!req.userId) throw ApiError.unauthorized();
  return req.userId;
}
