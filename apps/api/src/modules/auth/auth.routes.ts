import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/http';
import { requireAuth } from '../../middlewares/auth.middleware';
import { authLimiter } from '../../middlewares/rate-limit';
import { validate } from '../../middlewares/validate.middleware';
import * as controller from './auth.controller';
import {
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
  socialLoginSchema,
  verifyEmailSchema,
} from './auth.dto';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  password: passwordSchema,
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate(registerSchema), asyncHandler(controller.register));
authRouter.post('/login', authLimiter, validate(loginSchema), asyncHandler(controller.login));
authRouter.post('/social', authLimiter, validate(socialLoginSchema), asyncHandler(controller.socialLogin));
authRouter.post('/refresh', asyncHandler(controller.refresh));
authRouter.post('/logout', asyncHandler(controller.logout));
authRouter.get('/me', requireAuth, asyncHandler(controller.me));
authRouter.get('/username-available', asyncHandler(controller.checkUsername));
authRouter.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(controller.requestPasswordReset),
);
authRouter.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(controller.resetPassword));
authRouter.post('/verify-email', validate(verifyEmailSchema), asyncHandler(controller.verifyEmail));
authRouter.post('/resend-verification', requireAuth, asyncHandler(controller.resendVerification));
authRouter.post(
  '/change-password',
  requireAuth,
  authLimiter,
  validate(changePasswordSchema),
  asyncHandler(controller.changePassword),
);
