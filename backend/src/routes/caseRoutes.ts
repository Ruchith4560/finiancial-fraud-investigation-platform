import { Router } from 'express';
import { CaseController } from '../controllers/caseController';
import { requireAuth } from '../middleware/authMiddleware';

export const caseRouter = Router();

caseRouter.use(requireAuth);

caseRouter.get('/stats', CaseController.getStats);
caseRouter.post('/', CaseController.createCase);
caseRouter.get('/', CaseController.getCases);
caseRouter.get('/:id', CaseController.getCaseById);
caseRouter.patch('/:id/status', CaseController.updateStatus);
caseRouter.patch('/:id/assign', CaseController.assignInvestigator);
caseRouter.post('/:id/notes', CaseController.addNote);
