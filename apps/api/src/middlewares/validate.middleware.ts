import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';

/**
 * Valida e substitui req.body pelo dado ja parseado e tipado.
 * Nenhum controller le entrada crua — tudo passa por um schema.
 */
export function validate<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}

/** Query string validada sob demanda (evita conflito com o body validado). */
export function parseQuery<T extends ZodTypeAny>(req: Request, schema: T): z.infer<T> {
  return schema.parse(req.query);
}

export function body<T>(req: Request): T {
  return req.body as T;
}
