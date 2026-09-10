# ==============================================================================
# FraudLens AI - Backend Service Dockerfile
# Multi-stage production container with least-privilege security hardening
# ==============================================================================

# --- Stage 1: Build & Compilation ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# --- Stage 2: Production Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install curl for robust healthcheck probes
RUN apk --no-cache add curl

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

# Security: Enforce non-root execution (UID 1000 built into node alpine)
USER node

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
