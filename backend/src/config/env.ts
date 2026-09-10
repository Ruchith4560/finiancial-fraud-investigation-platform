import dotenv from 'dotenv';
dotenv.config();

const rawIntelUrl = process.env.INTELLIGENCE_SERVICE_URL || 'http://localhost:8000';
const normalizedIntelUrl = rawIntelUrl.startsWith('http://') || rawIntelUrl.startsWith('https://')
  ? rawIntelUrl
  : `https://${rawIntelUrl}`;

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'memory',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_key_fraudlens_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  INTELLIGENCE_SERVICE_URL: normalizedIntelUrl,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '*',
};
