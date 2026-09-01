import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PlanTier } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { prisma } from '../../database/prisma';
import { hashToken } from './token.service';
import type { RegisterInput } from './auth.dto';

const BCRYPT_ROUNDS = 12;
const EMAIL_VERIFICATION = 'EMAIL_VERIFICATION';
const PASSWORD_RESET = 'PASSWORD_RESET';

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function attachFreePlan(userId: string) {
  const plan = await prisma.plan.findUnique({ where: { tier: PlanTier.FREE } });
  if (!plan) return; // o seed cria os planos; ausencia nao deve travar o cadastro
  await prisma.subscription.create({ data: { userId, planId: plan.id } });
}

function issueToken() {
  const raw = crypto.randomBytes(32).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export async function isUsernameAvailable(username: string) {
  const found = await prisma.profile.findUnique({ where: { username }, select: { id: true } });
  return !found;
}

export async function registerUser(input: RegisterInput) {
  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    prisma.profile.findUnique({ where: { username: input.username }, select: { id: true } }),
  ]);
  if (existingEmail) throw ApiError.conflict('Ja existe uma conta com esse e-mail.', 'email_taken');
  if (existingUsername) throw ApiError.conflict('Esse nome de usuario ja foi escolhido.', 'username_taken');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      profile: { create: { name: input.name, username: input.username } },
    },
  });

  await attachFreePlan(user.id);

  const { raw, hash } = issueToken();
  await prisma.authToken.create({
    data: {
      userId: user.id,
      purpose: EMAIL_VERIFICATION,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return { user, emailVerificationToken: raw };
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Comparacao mesmo sem usuario para nao vazar existencia de conta pelo tempo de resposta.
  const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
  const ok = await bcrypt.compare(password, hash);
  if (!user || !user.passwordHash || !ok) {
    throw ApiError.unauthorized('E-mail ou senha incorretos.');
  }
  return user;
}

export async function createEmailVerification(userId: string) {
  const { raw, hash } = issueToken();
  await prisma.authToken.create({
    data: {
      userId,
      purpose: EMAIL_VERIFICATION,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return raw;
}

export async function confirmEmail(rawToken: string) {
  const token = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!token || token.purpose !== EMAIL_VERIFICATION || token.usedAt || token.expiresAt < new Date()) {
    throw ApiError.badRequest('Este link de verificacao expirou ou ja foi usado.');
  }
  await prisma.$transaction([
    prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: token.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return token.userId;
}

/**
 * Recuperacao de senha. Sempre retorna sucesso na camada HTTP: revelar se o
 * e-mail existe entregaria uma lista de contas validas.
 */
export async function createPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return null;
  const { raw, hash } = issueToken();
  await prisma.authToken.create({
    data: {
      userId: user.id,
      purpose: PASSWORD_RESET,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return raw;
}

export async function resetPassword(rawToken: string, password: string) {
  const token = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!token || token.purpose !== PASSWORD_RESET || token.usedAt || token.expiresAt < new Date()) {
    throw ApiError.badRequest('Este link de recuperacao expirou ou ja foi usado.');
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: token.userId }, data: { passwordHash } }),
    // Trocar a senha derruba todas as sessoes abertas.
    prisma.session.updateMany({
      where: { userId: token.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  return token.userId;
}

export async function findOrCreateSocialUser(input: {
  provider: string;
  providerUserId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}) {
  const existing = await prisma.socialAccount.findUnique({
    where: { provider_providerUserId: { provider: input.provider, providerUserId: input.providerUserId } },
    select: { userId: true },
  });
  if (existing) return prisma.user.findUniqueOrThrow({ where: { id: existing.userId } });

  const byEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (byEmail) {
    await prisma.socialAccount.create({
      data: { userId: byEmail.id, provider: input.provider, providerUserId: input.providerUserId },
    });
    return byEmail;
  }

  const base = input.email.split('@')[0]!.replace(/[^a-z0-9_.]/gi, '').toLowerCase() || 'leitor';
  let username = base.slice(0, 20);
  let n = 0;
  while (!(await isUsernameAvailable(username))) {
    n += 1;
    username = `${base.slice(0, 18)}${n}`;
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      emailVerifiedAt: new Date(),
      profile: { create: { name: input.name, username, avatarUrl: input.avatarUrl } },
      socialLinks: { create: { provider: input.provider, providerUserId: input.providerUserId } },
    },
  });
  await attachFreePlan(user.id);
  return user;
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.passwordHash) throw ApiError.badRequest('Sua conta usa login social e ainda nao tem senha.');
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest('A senha atual nao confere.');
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(nextPassword) } });
}
