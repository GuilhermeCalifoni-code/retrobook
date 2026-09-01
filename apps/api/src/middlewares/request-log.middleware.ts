import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../common/logger';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Log de request (secao 43).
 *
 * Cada requisicao ganha um id que volta no header `x-request-id`, para ligar
 * o que o usuario viu ao que o servidor registrou. Rotas de saude nao poluem
 * o log, e a URL e registrada sem query string — parametros de busca podem
 * conter o que a pessoa digitou.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) ?? crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  if (req.path === '/health') return next();

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const context = {
      requestId,
      method: req.method,
      path: req.baseUrl + req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.userId,
    };

    if (res.statusCode >= 500) logger.error('request falhou', undefined, context);
    else if (res.statusCode >= 400) logger.warn('request rejeitada', context);
    else if (durationMs > 1000) logger.warn('request lenta', context);
    else logger.debug('request', context);
  });

  next();
}
