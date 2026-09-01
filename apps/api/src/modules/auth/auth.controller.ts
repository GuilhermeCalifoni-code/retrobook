import type { Request, Response } from 'express';
import { ApiError } from '../../common/api-error';
import { env } from '../../config/env';
import { prisma } from '../../database/prisma';
import { currentUserId } from '../../middlewares/auth.middleware';
import { getSessionUser } from '../users/users.service';
import * as authService from './auth.service';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  consumeRefreshToken,
  issueRefreshToken,
  setAuthCookies,
  signAccessToken,
} from './token.service';
import type { LoginInput, RegisterInput } from './auth.dto';

async function startSession(req: Request, res: Response, userId: string) {
  const access = signAccessToken(userId);
  const refresh = await issueRefreshToken(userId, {
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  setAuthCookies(res, access, refresh.token);
  await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  return getSessionUser(userId);
}

export async function register(req: Request, res: Response) {
  const input = req.body as RegisterInput;
  const { user, emailVerificationToken } = await authService.registerUser(input);
  const sessionUser = await startSession(req, res, user.id);

  res.status(201).json({
    user: sessionUser,
    // Sem servico de e-mail no MVP: o link volta na resposta em desenvolvimento
    // para que o fluxo de verificacao seja testavel de ponta a ponta.
    ...(env.isProd ? {} : { devEmailVerificationToken: emailVerificationToken }),
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput;
  const user = await authService.verifyCredentials(email, password);
  const sessionUser = await startSession(req, res, user.id);
  res.json({ user: sessionUser });
}

export async function socialLogin(req: Request, res: Response) {
  const user = await authService.findOrCreateSocialUser(req.body);
  const sessionUser = await startSession(req, res, user.id);
  res.json({ user: sessionUser });
}

export async function refresh(req: Request, res: Response) {
  const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('Sessao expirada.');

  const session = await consumeRefreshToken(token);
  if (!session) {
    clearAuthCookies(res);
    throw ApiError.unauthorized('Sessao expirada.');
  }

  const sessionUser = await startSession(req, res, session.userId);
  res.json({ user: sessionUser });
}

export async function logout(req: Request, res: Response) {
  const token = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  if (token) await consumeRefreshToken(token);
  clearAuthCookies(res);
  res.json({ ok: true });
}

export async function me(req: Request, res: Response) {
  res.json({ user: await getSessionUser(currentUserId(req)) });
}

export async function checkUsername(req: Request, res: Response) {
  const username = String(req.query.username ?? '');
  if (!/^[a-z0-9_.]{3,24}$/.test(username)) {
    return res.json({ available: false, reason: 'Use 3 a 24 caracteres: letras minusculas, numeros, ponto ou _.' });
  }
  res.json({ available: await authService.isUsernameAvailable(username) });
}

export async function requestPasswordReset(req: Request, res: Response) {
  const token = await authService.createPasswordReset(req.body.email);
  // Resposta identica exista ou nao a conta — nao entregamos lista de e-mails validos.
  res.json({
    ok: true,
    message: 'Se existir uma conta com esse e-mail, enviamos as instrucoes.',
    ...(env.isProd || !token ? {} : { devResetToken: token }),
  });
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body.token, req.body.password);
  clearAuthCookies(res);
  res.json({ ok: true, message: 'Senha atualizada. Entre novamente.' });
}

export async function verifyEmail(req: Request, res: Response) {
  await authService.confirmEmail(req.body.token);
  res.json({ ok: true });
}

export async function resendVerification(req: Request, res: Response) {
  const userId = currentUserId(req);
  const token = await authService.createEmailVerification(userId);
  res.json({ ok: true, ...(env.isProd ? {} : { devEmailVerificationToken: token }) });
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(currentUserId(req), req.body.currentPassword, req.body.password);
  res.json({ ok: true });
}

export { ACCESS_COOKIE };
