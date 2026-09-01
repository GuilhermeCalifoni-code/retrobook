import rateLimit from 'express-rate-limit';

const message = {
  error: { code: 'rate_limited', message: 'Muitas tentativas. Respire e tente de novo em instantes.' },
};

/** Limite geral da API. */
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

/** Endpoints de credencial sao o alvo obvio de forca bruta. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message,
});

/** Anti-spam de conteudo: posts, comentarios e mensagens. */
export const writeLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});
