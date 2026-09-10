from fastapi import APIRouter
import platform
import sys

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def get_health():
    return {
        "status": "healthy",
        "service": "FraudLens AI Intelligence Engine",
        "version": "1.0.0",
        "python_version": sys.version,
        "platform": platform.platform(),
        "capabilities": [
            "deterministic_rule_engine",
            "isolation_forest_anomaly_scorer",
            "networkx_graph_analytics",
            "suspicious_pattern_detection",
            "grounded_ai_evidence_synthesizer"
        ]
    }
