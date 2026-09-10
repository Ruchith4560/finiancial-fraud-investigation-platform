# ==============================================================================
# FraudLens AI - Frontend Web Application Dockerfile
# Multi-stage build: Vite compilation + Production Nginx delivery
# ==============================================================================

# --- Stage 1: Build static distribution ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:alpine AS runner

# Remove default nginx configurations and boilerplate files
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copy custom Nginx reverse proxy and SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
