import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

export const authRouter = Router();

// Public routes
authRouter.post('/login', AuthController.login);

// Protected routes
authRouter.get('/me', requireAuth, AuthController.getMe);

// User registration (public for onboarding new investigators and admins)
authRouter.post('/register', AuthController.register);
