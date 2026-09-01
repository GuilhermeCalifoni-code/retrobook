import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../common/api-error';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, `Rota nao encontrada: ${req.method} ${req.originalUrl}`, 'route_not_found'));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'validation_error',
        message: 'Alguns campos precisam da sua atencao.',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res
        .status(409)
        .json({ error: { code: 'conflict', message: 'Esse registro ja existe.', details: err.meta } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'not_found', message: 'Registro nao encontrado.' } });
    }
  }

  // Erro inesperado: loga completo no servidor, devolve mensagem generica.
  console.error('[retrobook:error]', err);
  return res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Algo deu errado do nosso lado. Tente novamente.',
      ...(env.isProd ? {} : { debug: err instanceof Error ? err.message : String(err) }),
    },
  });
}
