"""
FraudLens AI - Root Entry Point for ASGI / Uvicorn Cloud Deployment.
Enables running the Intelligence Service (FastAPI) directly from the repository root:
    uvicorn main:app --host 0.0.0.0 --port $PORT
"""
import os
import sys
import importlib.util

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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=False)
