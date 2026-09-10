import { Router } from 'express';
import { InvestigationController } from '../controllers/investigationController';
import { requireAuth } from '../middleware/authMiddleware';

export const investigationRouter = Router();

investigationRouter.use(requireAuth);

investigationRouter.get('/dossier', InvestigationController.getDossier);
