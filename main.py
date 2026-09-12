"""
FraudLens AI - Root Entry Point for ASGI / Uvicorn Cloud Deployment.
Enables running the Intelligence Service (FastAPI) directly from the repository root:
    uvicorn main:app --host 0.0.0.0 --port $PORT
"""
import os
import sys
import importlib.util
from fastapi import Request
from fastapi.responses import HTMLResponse, JSONResponse

# 1. Add intelligence-service directory to sys.path so its internal modules (app.*) resolve cleanly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INTELLIGENCE_DIR = os.path.join(BASE_DIR, "intelligence-service")

if INTELLIGENCE_DIR not in sys.path:
    sys.path.insert(0, INTELLIGENCE_DIR)

# 2. Dynamically load app from intelligence-service/main.py to prevent name collision with root main.py
target_main_path = os.path.join(INTELLIGENCE_DIR, "main.py")
spec = importlib.util.spec_from_file_location("intelligence_service_main", target_main_path)
if spec is None or spec.loader is None:
    raise ImportError(f"Could not load intelligence service entrypoint from {target_main_path}")

intelligence_module = importlib.util.module_from_spec(spec)
sys.modules["intelligence_service_main"] = intelligence_module
spec.loader.exec_module(intelligence_module)

# Expose the FastAPI app instance for ASGI servers (uvicorn main:app, gunicorn, etc.)
app = intelligence_module.app

# Replace default JSON "/" route with content-negotiated portal
LANDING_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FraudLens AI &mdash; Intelligence Engine</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #070a12;
      --card-bg: rgba(18, 24, 38, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --accent-cyan: #06b6d4;
      --accent-blue: #3b82f6;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.25), transparent),
        radial-gradient(circle at 10% 80%, rgba(6, 182, 212, 0.12), transparent);
      color: var(--text-main);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.25rem;
    }
    .container {
      width: 100%;
      max-width: 860px;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.875rem;
      border-radius: 9999px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.25);
      width: fit-content;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.9); }
    }
    .header-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(16px);
      border-radius: 1.25rem;
      padding: 2.25rem;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.5);
    }
    .header-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, var(--accent-cyan), var(--accent-blue), #8b5cf6);
    }
    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #ffffff 40%, #93c5fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 1.0625rem;
      line-height: 1.6;
      max-width: 680px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.875rem;
      margin-top: 1.75rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.35rem;
      border-radius: 0.75rem;
      font-size: 0.9375rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #0284c7);
      color: #ffffff;
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-main);
      border: 1px solid var(--card-border);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.09);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.25rem;
    }
    .info-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .info-card h2 {
      font-size: 1.125rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .info-card p, .info-card li {
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.55;
    }
    .info-card ul {
      padding-left: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }
    .pill {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      padding: 0.25rem 0.625rem;
      border-radius: 0.375rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #93c5fd;
    }
    .tip-box {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      font-size: 0.875rem;
      color: #bfdbfe;
      line-height: 1.5;
    }
    .tip-box strong { color: #ffffff; }
    footer {
      text-align: center;
      font-size: 0.8125rem;
      color: #6b7280;
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-card">
      <div class="badge">
        <span class="badge-dot"></span>
        <span>Service Status: Operational</span>
      </div>
      <h1>FraudLens AI &mdash; Intelligence Engine</h1>
      <p class="subtitle">
        High-throughput machine learning microservice for automated risk scoring, NetworkX graph topology analysis, isolation forest anomaly detection, and grounded Suspicious Activity Report (SAR) synthesis.
      </p>
      <div class="actions">
        <a href="/api/v1/docs" class="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
          Interactive Swagger Docs
        </a>
        <a href="/api/v1/health" class="btn btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Health Check API
        </a>
        <a href="/api/v1/openapi.json" class="btn btn-secondary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          OpenAPI Spec (JSON)
        </a>
      </div>
    </div>

    <div class="grid-2">
      <div class="info-card">
        <h2>
          <span>🧠</span> Active Engine Capabilities
        </h2>
        <p>This Python microservice provides the analytical brain for FraudLens AI:</p>
        <div class="pill-row">
          <span class="pill">Isolation Forest ML</span>
          <span class="pill">NetworkX Graph Analytics</span>
          <span class="pill">Deterministic AML Rules</span>
          <span class="pill">SAR Narrative Synthesis</span>
          <span class="pill">Cycles & Smurfing Detection</span>
          <span class="pill">Ego-Network Extraction</span>
        </div>
      </div>

      <div class="info-card">
        <h2>
          <span>🖥️</span> Why am I seeing this page?
        </h2>
        <p>
          This URL is the <strong>Python Intelligence Service</strong> API backend.
          The visual investigator web interface lives in the <code>frontend/</code> directory (built with React 19, Cytoscape.js, and Tailwind CSS).
        </p>
        <div class="tip-box">
          <strong>To view the visual web UI:</strong> Deploy the <code>frontend/</code> as a <em>Static Site</em> or use the included <em>Render Blueprint</em> (<code>render.yaml</code>) to run all 3 services together.
        </div>
      </div>
    </div>

    <footer>
      FraudLens AI &bull; Enterprise Financial Fraud Investigation Platform &bull; Built with FastAPI &amp; React 19
    </footer>
  </div>
</body>
</html>
"""

# Filter out existing root GET route if present
app.router.routes = [r for r in app.router.routes if getattr(r, "path", None) != "/"]

@app.get("/", include_in_schema=False)
async def custom_root_portal(request: Request):
    accept_header = request.headers.get("accept", "")
    if "text/html" in accept_header:
        return HTMLResponse(content=LANDING_HTML)
    return JSONResponse(
        content={
            "service": "FraudLens AI Intelligence Engine",
            "status": "healthy",
            "docs": "/api/v1/docs",
            "health": "/api/v1/health",
            "capabilities": [
                "deterministic_rule_engine",
                "isolation_forest_anomaly_scorer",
                "networkx_graph_analytics",
                "suspicious_pattern_detection",
                "grounded_ai_evidence_synthesizer"
            ]
        }
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=False)
