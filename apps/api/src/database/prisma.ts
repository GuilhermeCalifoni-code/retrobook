import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

declare global {
  // Evita multiplas instancias durante o hot-reload do tsx watch.
  // eslint-disable-next-line no-var
  var __retrobookPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__retrobookPrisma ??
  new PrismaClient({
    log: env.isProd ? ['error'] : ['warn', 'error'],
  });

if (!env.isProd) global.__retrobookPrisma = prisma;
