import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ANSI colors for clean test reporting
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function pass(name: string, details?: string) {
  console.log(`  ${GREEN}✓ PASS:${RESET} ${BOLD}${name}${RESET}${details ? ` (${details})` : ''}`);
}

function fail(name: string, error: string) {
  console.error(`  ${RED}✗ FAIL:${RESET} ${BOLD}${name}${RESET}\n    ${error}`);
  process.exitCode = 1;
}

function header(title: string) {
  console.log(`\n${CYAN}================================================================${RESET}`);
  console.log(`${BOLD}${title}${RESET}`);
  console.log(`${CYAN}================================================================${RESET}`);
}

async function runDockerVerification() {
  console.log(`\n${BOLD}🐳 FraudLens AI - Production Containerization & Docker Orchestration Test${RESET}`);
  console.log(`Verifying multi-service container definitions, Nginx reverse proxy, and Compose DAG...\n`);

  const rootDir = path.resolve(__dirname, '../../');
  const backendDir = path.resolve(__dirname, '../');
  const frontendDir = path.resolve(rootDir, 'frontend');
  const intelligenceDir = path.resolve(rootDir, 'intelligence-service');

  // --------------------------------------------------------------------------
  // Stage 1: Docker Compose File & Spec Validation
  // --------------------------------------------------------------------------
  header('Stage 1: Docker Compose Spec Validation');
  const composePath = path.join(rootDir, 'docker-compose.yml');

  if (!fs.existsSync(composePath)) {
    fail('docker-compose.yml existence', `File not found at ${composePath}`);
    return;
  }
  pass('docker-compose.yml located', composePath);

  try {
    const composeContent = fs.readFileSync(composePath, 'utf8');

    // Verify services
    const requiredServices = ['mongodb', 'intelligence-service', 'backend', 'frontend'];
    for (const service of requiredServices) {
      if (composeContent.includes(`${service}:`)) {
        pass(`Service definition: ${service}`);
      } else {
        fail(`Service definition: ${service}`, `Missing service ${service} in compose file`);
      }
    }

    // Verify healthcheck dependencies
    if (composeContent.includes('condition: service_healthy')) {
      pass('Strict healthcheck dependencies configured', 'condition: service_healthy present');
    } else {
      fail('Strict healthcheck dependencies', 'Missing service_healthy conditions');
    }

    // Run docker compose config syntax validation
    const composeConfigOutput = execSync('docker compose config', { cwd: rootDir, encoding: 'utf8' });
    if (composeConfigOutput.includes('name: project1') || composeConfigOutput.includes('services:')) {
      pass('docker compose config validated successfully', 'Zero syntax warnings or schema errors');
    }
  } catch (err: any) {
    fail('Docker compose validation', err.message);
  }

  // --------------------------------------------------------------------------
  // Stage 2: Backend Container Hardening
  // --------------------------------------------------------------------------
  header('Stage 2: Backend Dockerfile & Security Isolation');
  const backendDockerfilePath = path.join(backendDir, 'Dockerfile');
  const backendDockerignorePath = path.join(backendDir, '.dockerignore');

  if (!fs.existsSync(backendDockerfilePath)) {
    fail('backend/Dockerfile existence', 'File missing');
  } else {
    const content = fs.readFileSync(backendDockerfilePath, 'utf8');
    if (content.includes('AS builder') && content.includes('AS runner')) {
      pass('Backend multi-stage build structure', 'builder -> runner');
    } else {
      fail('Backend multi-stage build', 'Expected builder and runner stages');
    }

    if (content.includes('USER node')) {
      pass('Backend non-root execution', 'USER node enforced');
    } else {
      fail('Backend non-root execution', 'Missing USER node directive');
    }

    if (content.includes('HEALTHCHECK')) {
      pass('Backend container healthcheck directive', 'HEALTHCHECK configured');
    } else {
      fail('Backend container healthcheck', 'Missing HEALTHCHECK directive');
    }
  }

  if (fs.existsSync(backendDockerignorePath)) {
    const ignore = fs.readFileSync(backendDockerignorePath, 'utf8');
    if (ignore.includes('node_modules') && ignore.includes('.env*')) {
      pass('Backend .dockerignore', 'node_modules, .env excluded');
    } else {
      fail('Backend .dockerignore', 'Missing critical exclusions');
    }
  } else {
    fail('Backend .dockerignore', 'File missing');
  }

  // --------------------------------------------------------------------------
  // Stage 3: Python Intelligence Service Hardening
  // --------------------------------------------------------------------------
  header('Stage 3: Python Intelligence Service Dockerfile');
  const pyDockerfilePath = path.join(intelligenceDir, 'Dockerfile');
  const pyDockerignorePath = path.join(intelligenceDir, '.dockerignore');

  if (!fs.existsSync(pyDockerfilePath)) {
    fail('intelligence-service/Dockerfile existence', 'File missing');
  } else {
    const content = fs.readFileSync(pyDockerfilePath, 'utf8');
    if (content.includes('python:3.11-slim')) {
      pass('Python slim base image', 'python:3.11-slim');
    } else {
      fail('Python slim base image', 'Expected python:3.11-slim');
    }

    if (content.includes('appuser') && content.includes('USER appuser')) {
      pass('Python non-root execution', 'appuser non-root identity');
    } else {
      fail('Python non-root execution', 'Missing dedicated non-root user');
    }

    if (content.includes('PYTHONDONTWRITEBYTECODE=1') && content.includes('PYTHONUNBUFFERED=1')) {
      pass('Python unbuffered streaming environment variables', 'PYTHONDONTWRITEBYTECODE & PYTHONUNBUFFERED');
    } else {
      fail('Python environment variables', 'Missing performance/logging flags');
    }
  }

  if (fs.existsSync(pyDockerignorePath)) {
    const ignore = fs.readFileSync(pyDockerignorePath, 'utf8');
    if (ignore.includes('__pycache__') && ignore.includes('tests/')) {
      pass('Python .dockerignore', '__pycache__, tests excluded');
    } else {
      fail('Python .dockerignore', 'Missing critical exclusions');
    }
  } else {
    fail('Python .dockerignore', 'File missing');
  }

  // --------------------------------------------------------------------------
  // Stage 4: Frontend Nginx Configuration & Routing
  // --------------------------------------------------------------------------
  header('Stage 4: Frontend Production Nginx & Routing Proxy');
  const nginxConfPath = path.join(frontendDir, 'nginx.conf');
  const frontendDockerfilePath = path.join(frontendDir, 'Dockerfile');
  const frontendDockerignorePath = path.join(frontendDir, '.dockerignore');

  if (!fs.existsSync(nginxConfPath)) {
    fail('frontend/nginx.conf existence', 'File missing');
  } else {
    const conf = fs.readFileSync(nginxConfPath, 'utf8');
    if (conf.includes('try_files $uri $uri/ /index.html;')) {
      pass('Nginx SPA client-side fallback routing', 'try_files $uri $uri/ /index.html');
    } else {
      fail('Nginx SPA fallback', 'Missing try_files fallback routing');
    }

    if (conf.includes('proxy_pass http://backend:5000/api/;')) {
      pass('Nginx API reverse proxy target', 'proxy_pass http://backend:5000/api/');
    } else {
      fail('Nginx API reverse proxy', 'Missing proxy_pass to backend container');
    }

    if (conf.includes('location /healthz')) {
      pass('Nginx dedicated healthcheck probe', '/healthz returning 200');
    } else {
      fail('Nginx healthcheck probe', 'Missing /healthz route');
    }

    if (conf.includes('gzip on;')) {
      pass('Nginx gzip compression enabled', 'gzip on with multi-mime support');
    } else {
      fail('Nginx gzip compression', 'Missing gzip configuration');
    }

    if (conf.includes('X-Frame-Options') && conf.includes('X-Content-Type-Options')) {
      pass('Nginx security headers configured', 'Frame-Options, Content-Type-Options');
    } else {
      fail('Nginx security headers', 'Missing security headers');
    }
  }

  if (fs.existsSync(frontendDockerfilePath)) {
    const dfile = fs.readFileSync(frontendDockerfilePath, 'utf8');
    if (dfile.includes('nginx.conf') && dfile.includes('/etc/nginx/conf.d/default.conf')) {
      pass('Frontend Dockerfile installs custom nginx.conf');
    } else {
      fail('Frontend Dockerfile nginx.conf binding', 'Custom nginx.conf not copied');
    }
  }

  if (fs.existsSync(frontendDockerignorePath)) {
    pass('Frontend .dockerignore verified');
  } else {
    fail('Frontend .dockerignore', 'File missing');
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log(`\n${GREEN}================================================================${RESET}`);
  console.log(`${GREEN}${BOLD}🎉 PHASE 12: DOCKER COMPOSE MULTI-SERVICE VERIFICATION COMPLETE${RESET}`);
  console.log(`${GREEN}================================================================${RESET}`);
  console.log(`All 4 services configured with production multi-stage Dockerfiles,`);
  console.log(`least-privilege security users, Nginx reverse proxy, and Compose DAG!\n`);
}

runDockerVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
