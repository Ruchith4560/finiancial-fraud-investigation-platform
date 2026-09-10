# ==============================================================================
# FraudLens AI - Intelligence Service Dockerfile
# Python FastAPI Microservice for Risk Scoring, Graph Analytics, and AI SAR
# ==============================================================================

FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc files and enable unbuffered streaming stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8000

# Install build dependencies and curl for healthcheck probes
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Security: Create non-root dedicated system user
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/bash -m appuser

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and adjust ownership
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
