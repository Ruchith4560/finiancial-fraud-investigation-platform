import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { requireAuth } from '../middleware/authMiddleware';

export const aiRouter = Router();

aiRouter.use(requireAuth);

aiRouter.post('/summary', AIController.generateSummary);
aiRouter.post('/cases/:id/attach', AIController.attachSummaryToCase);
