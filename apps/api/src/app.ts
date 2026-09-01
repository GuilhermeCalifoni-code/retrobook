import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { apiLimiter } from './middlewares/rate-limit';
import { requestLogger } from './middlewares/request-log.middleware';
import { apiRouter } from './routes';

const allowedOrigins = env.WEB_ORIGIN.split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

/**
 * Origens aceitas pelo CORS.
 *
 * Nunca `*`: a API responde com credenciais, e o navegador recusa `*` junto de
 * `Allow-Credentials` — mais importante, `*` deixaria qualquer site fazer
 * requisicao autenticada em nome do usuario.
 *
 * `VERCEL_PREVIEW_PATTERN` cobre os deploys de preview, que ganham um dominio
 * novo a cada branch e por isso nao podem ser listados um a um. E um regex
 * ancorado, fornecido por quem opera o deploy — nao um curinga aberto.
 */
const previewPattern = env.VERCEL_PREVIEW_PATTERN ? new RegExp(env.VERCEL_PREVIEW_PATTERN) : null;

function corsOrigin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  // Sem Origin = mesma origem, curl ou health check do provedor. Nao e CORS.
  if (!origin) return callback(null, true);
  const clean = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(clean)) return callback(null, true);
  if (previewPattern?.test(clean)) return callback(null, true);
  return callback(null, false);
}

export function createApp() {
  const app = express();

  // Atras de proxy/load balancer o IP real vem no X-Forwarded-For; o rate limit depende disso.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: env.isProd ? undefined : false,
    }),
  );
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestLogger);

  app.use('/api', apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
