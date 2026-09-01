import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Encaminha rejeicoes de handlers async para o error middleware do Express 4. */
export function asyncHandler<T extends RequestHandler>(handler: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export interface PageMeta {
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export function paginated<T>(items: T[], meta: PageMeta) {
  return { items, ...meta };
}

/**
 * Paginacao por cursor: pedimos take+1 e usamos o excedente apenas para
 * descobrir se ha proxima pagina. O feed nunca carrega tudo de uma vez.
 */
export function buildCursorPage<T extends { id: string }>(rows: T[], take: number) {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  return {
    items,
    hasMore,
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  };
}
