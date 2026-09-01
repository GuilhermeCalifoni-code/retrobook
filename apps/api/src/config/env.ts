import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL e obrigatorio'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET precisa de ao menos 16 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET precisa de ao menos 16 caracteres'),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  VERCEL_PREVIEW_PATTERN: z.string().optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  BOOK_PROVIDER: z.enum(['local', 'google']).default('local'),
  GOOGLE_BOOKS_API_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // Falhar cedo e com mensagem legivel e melhor do que subir com config invalida.
  throw new Error(`Configuracao invalida em apps/api/.env:\n${issues}`);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  accessTokenTtl: '15m' as const,
  refreshTokenTtlDays: 30,
};

export type Env = typeof env;

/**
 * Producao nao aceita os segredos de exemplo. Um deploy que sobe com
 * "troque-este-segredo" assina tokens que qualquer pessoa com acesso ao
 * repositorio consegue forjar — falhar no boot e melhor do que servir isso.
 */
if (env.isProd) {
  const weak = [env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET].filter(
    (s) => s.includes('troque-este-segredo') || s.length < 32,
  );
  if (weak.length > 0) {
    throw new Error(
      'JWT_ACCESS_SECRET e JWT_REFRESH_SECRET precisam ser segredos unicos de 32+ caracteres em producao.',
    );
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_ACCESS_SECRET e JWT_REFRESH_SECRET nao podem ser iguais.');
  }
  if (env.WEB_ORIGIN.includes('localhost')) {
    console.warn('[retrobook:api] WEB_ORIGIN aponta para localhost em producao — o CORS vai recusar o site publico.');
  }
}
