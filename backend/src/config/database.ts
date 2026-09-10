import mongoose from 'mongoose';
import { ENV } from './env';

let mongoServer: any = null;

export async function connectDatabase(): Promise<void> {
  try {
    let connectionUri = ENV.MONGODB_URI;

    if (connectionUri === 'memory') {
      console.log('[Database] Starting in-memory MongoDB server for zero-config local development...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      connectionUri = mongoServer.getUri();
      console.log(`[Database] In-memory MongoDB running at: ${connectionUri}`);
    }

    mongoose.set('strictQuery', true);
    await mongoose.connect(connectionUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[Database] Successfully connected to MongoDB at ${connectionUri.split('@').pop()?.split('?')[0]}`);
  } catch (error) {
    console.error('[Database] MongoDB connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
      console.log('[Database] In-memory MongoDB server stopped.');
    }
  } catch (error) {
    console.error('[Database] Error during disconnect:', error);
  }
}
