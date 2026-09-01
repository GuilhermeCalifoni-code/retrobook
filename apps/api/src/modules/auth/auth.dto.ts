import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres.')
  .max(128, 'Senha muito longa.')
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), 'Use ao menos uma letra e um numero.');

export const usernameSchema = z
  .string()
  .min(3, 'O nome de usuario precisa de 3 caracteres.')
  .max(24, 'Maximo de 24 caracteres.')
  .regex(/^[a-z0-9_.]+$/, 'Use apenas letras minusculas, numeros, ponto e underline.');

export const registerSchema = z.object({
  name: z.string().min(2, 'Como podemos te chamar?').max(60),
  username: usernameSchema,
  email: z.string().email('E-mail invalido.').toLowerCase(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email('E-mail invalido.').toLowerCase(),
  password: z.string().min(1, 'Informe sua senha.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail invalido.').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10),
});

export const checkUsernameSchema = z.object({
  username: usernameSchema,
});

/** Login social: o cliente entrega a identidade ja verificada pelo provedor. */
export const socialLoginSchema = z.object({
  provider: z.enum(['google', 'apple']),
  providerUserId: z.string().min(1),
  email: z.string().email().toLowerCase(),
  name: z.string().min(1).max(60),
  avatarUrl: z.string().url().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
