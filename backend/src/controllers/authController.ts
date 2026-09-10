import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { sendSuccess, sendError } from '../utils/response';

const LoginSchema = z.object({
  email: z.string().email('A valid enterprise email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const RegisterSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('A valid email address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2, 'Full name is required'),
  role: z.enum(['admin', 'investigator']).optional(),
});

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 'Validation error', 400, 'VALIDATION_ERROR', parsed.error.format());
        return;
      }

      const result = await AuthService.login(parsed.data);
      sendSuccess(res, {
        token: result.token,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 'Validation error', 400, 'VALIDATION_ERROR', parsed.error.format());
        return;
      }

      const result = await AuthService.register(parsed.data);
      sendSuccess(res, {
        token: result.token,
        user: result.user,
      }, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.userId) {
        sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
        return;
      }

      const user = await AuthService.getProfile(req.user.userId);
      sendSuccess(res, { user });
    } catch (err) {
      next(err);
    }
  }
}
