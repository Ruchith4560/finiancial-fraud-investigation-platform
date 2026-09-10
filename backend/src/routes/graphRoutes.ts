import { Router } from 'express';
import { GraphController } from '../controllers/graphController';
import { requireAuth } from '../middleware/authMiddleware';

export const graphRouter = Router();

graphRouter.use(requireAuth);

graphRouter.get('/subgraph', GraphController.getSubgraph);
