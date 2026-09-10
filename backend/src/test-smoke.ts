import { connectDatabase, disconnectDatabase } from './config/database';
import mongoose from 'mongoose';

async function testBackend() {
  console.log('[SmokeTest] Testing database connection...');
  await connectDatabase();
  console.log(`[SmokeTest] MongoDB state: ${mongoose.connection.readyState} (1 = connected)`);
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database did not connect properly');
  }
  await disconnectDatabase();
  console.log('[SmokeTest] Database disconnected cleanly.');
  process.exit(0);
}

testBackend().catch((err) => {
  console.error('[SmokeTest] Error:', err);
  process.exit(1);
});
