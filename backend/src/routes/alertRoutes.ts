import { Router } from 'express';
import { AlertController } from '../controllers/alertController';
import { requireAuth } from '../middleware/authMiddleware';

export const alertRouter = Router();

// All alert routes are protected
alertRouter.use(requireAuth);

alertRouter.get('/stats', AlertController.getStats);
alertRouter.post('/sync', AlertController.syncAlerts);
alertRouter.get('/', AlertController.getAlerts);
alertRouter.get('/:id', AlertController.getAlertById);
alertRouter.patch('/:id/status', AlertController.updateStatus);
