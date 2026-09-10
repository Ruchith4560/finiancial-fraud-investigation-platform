from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "deterministic_rule_engine" in data["capabilities"]
    assert "networkx_graph_analytics" in data["capabilities"]

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "FraudLens AI" in data["message"]
