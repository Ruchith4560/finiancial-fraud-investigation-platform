import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

export const authRouter = Router();

// Public routes
authRouter.post('/login', AuthController.login);

// Protected routes
authRouter.get('/me', requireAuth, AuthController.getMe);

// Admin-only user registration
authRouter.post('/register', requireAuth, requireRole(['admin']), AuthController.register);
