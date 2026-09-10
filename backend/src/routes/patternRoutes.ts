import { Router } from 'express';
import { PatternController } from '../controllers/patternController';
import { requireAuth } from '../middleware/authMiddleware';

export const patternRouter = Router();

patternRouter.use(requireAuth);

patternRouter.get('/', PatternController.getPatterns);
