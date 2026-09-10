import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/healthRoutes';
import { authRouter } from './routes/authRoutes';
import { transactionRouter } from './routes/transactionRoutes';
import { alertRouter } from './routes/alertRoutes';
import { patternRouter } from './routes/patternRoutes';
import { graphRouter } from './routes/graphRoutes';
import { investigationRouter } from './routes/investigationRoutes';
import { caseRouter } from './routes/caseRoutes';
import { aiRouter } from './routes/aiRoutes';
import { seedDefaultUsers } from './utils/seedUsers';

const app = express();

// Security & utility middleware
app.use(helmet());
app.use(cors({
  origin: [ENV.CLIENT_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(ENV.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Base API Routes
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/transactions', transactionRouter);
app.use('/api/v1/alerts', alertRouter);
app.use('/api/v1/patterns', patternRouter);
app.use('/api/v1/graph', graphRouter);
app.use('/api/v1/investigations', investigationRouter);
app.use('/api/v1/cases', caseRouter);
app.use('/api/v1/ai', aiRouter);

// Centralized error handler
app.use(errorHandler);

let server: any = null;

async function bootstrap() {
  await connectDatabase();
  await seedDefaultUsers();

  server = app.listen(ENV.PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 FraudLens AI Backend running on port ${ENV.PORT}`);
    console.log(`🌐 Environment: ${ENV.NODE_ENV}`);
    console.log(`🩺 Health check: http://localhost:${ENV.PORT}/api/v1/health`);
    console.log(`====================================================`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
    if (server) {
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });
    } else {
      await disconnectDatabase();
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('[Server] Fatal bootstrap error:', err);
    process.exit(1);
  });
}

export default app;
