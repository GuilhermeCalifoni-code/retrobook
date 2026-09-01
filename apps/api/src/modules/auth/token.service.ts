import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env } from '../../config/env';
import { prisma } from '../../database/prisma';

export const ACCESS_COOKIE = 'rb_access';
export const REFRESH_COOKIE = 'rb_refresh';

export interface AccessPayload {
  sub: string;
}
export interface RefreshPayload {
  sub: string;
  sid: string;
}

export function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId } satisfies AccessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.accessTokenTtl,
  });
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  } catch {
    return null;
  }
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Refresh token e rotativo: cada uso revoga a sessao anterior e cria outra.
 * Guardamos apenas o hash — vazamento do banco nao vira sessao valida.
 */
export async function issueRefreshToken(userId: string, meta: { userAgent?: string; ip?: string }) {
  const raw = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip,
    },
  });
  const token = jwt.sign({ sub: userId, sid: session.id } satisfies RefreshPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.refreshTokenTtlDays}d`,
  });
  return { token, raw, session, expiresAt };
}

export async function consumeRefreshToken(token: string) {
  let payload: RefreshPayload;
  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  } catch {
    return null;
  }
  const session = await prisma.session.findUnique({ where: { id: payload.sid } });
  if (!session || session.revokedAt || session.expiresAt < new Date() || session.userId !== payload.sub) {
    return null;
  }
  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  return session;
}

/**
 * Cookies da sessao.
 *
 * `SameSite` e a unica peca que muda entre os dois desenhos de deploy:
 *
 *  - API e site na mesma origem (padrao, via rewrite da Vercel): `lax` basta e
 *    e mais seguro, porque o cookie nunca acompanha requisicao de outro site.
 *  - API em dominio proprio: o navegador so envia o cookie se ele for
 *    `SameSite=None`, e `None` sem `Secure` e recusado — por isso os dois
 *    andam juntos.
 *
 * Deixar isso em env evita a armadilha classica: `lax` funciona perfeitamente
 * em localhost e falha silenciosamente em producao cross-site, sem erro de
 * CORS, so um 401 inexplicavel.
 */
const baseCookie = {
  httpOnly: true,
  sameSite: env.COOKIE_SAMESITE,
  secure: env.COOKIE_SAMESITE === 'none' ? true : env.isProd,
  path: '/',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookie, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, baseCookie);
  res.clearCookie(REFRESH_COOKIE, baseCookie);
}
