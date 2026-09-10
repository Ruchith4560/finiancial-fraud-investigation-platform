import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import { sendSuccess } from '../utils/response';
import { ENV } from '../config/env';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  let intelligenceStatus = 'unreachable';
  try {
    const aiHealth = await axios.get(`${ENV.INTELLIGENCE_SERVICE_URL}/api/v1/health`, {
      timeout: 2000,
    });
    if (aiHealth.status === 200) {
      intelligenceStatus = 'connected';
    }
  } catch {
    intelligenceStatus = 'offline';
  }

  sendSuccess(res, {
    service: 'FraudLens AI Product Backend',
    status: 'healthy',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      name: mongoose.connection.name || 'default',
    },
    intelligenceService: {
      status: intelligenceStatus,
      endpoint: ENV.INTELLIGENCE_SERVICE_URL,
    },
  });
});
