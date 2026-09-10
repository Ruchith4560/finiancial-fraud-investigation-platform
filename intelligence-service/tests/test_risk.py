from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from main import app

client = TestClient(app)

def test_risk_analysis_endpoint():
    base_time = datetime(2026, 9, 1, 12, 0, 0)
    transactions = [
        # Normal low value
        {
            "transactionId": "TX-NORM-01",
            "senderAccountId": "ACC-101",
            "receiverAccountId": "ACC-201",
            "amount": 45.0,
            "timestamp": (base_time).isoformat(),
            "transactionType": "PAYMENT"
        },
        # High value CTR trigger
        {
            "transactionId": "TX-HIGH-01",
            "senderAccountId": "ACC-102",
            "receiverAccountId": "ACC-202",
            "amount": 25000.0,
            "timestamp": (base_time + timedelta(minutes=15)).isoformat(),
            "transactionType": "TRANSFER"
        },
        # Structuring trigger
        {
            "transactionId": "TX-SMURF-01",
            "senderAccountId": "ACC-103",
            "receiverAccountId": "ACC-203",
            "amount": 9850.0,
            "timestamp": (base_time + timedelta(minutes=30)).isoformat(),
            "transactionType": "TRANSFER"
        },
        # Rapid succession to same receiver
        {
            "transactionId": "TX-RAPID-01",
            "senderAccountId": "ACC-104",
            "receiverAccountId": "ACC-204",
            "amount": 4000.0,
            "timestamp": (base_time + timedelta(minutes=45)).isoformat(),
            "transactionType": "TRANSFER"
        },
        {
            "transactionId": "TX-RAPID-02",
            "senderAccountId": "ACC-104",
            "receiverAccountId": "ACC-204",
            "amount": 4200.0,
            "timestamp": (base_time + timedelta(minutes=48)).isoformat(),
            "transactionType": "TRANSFER"
        }
    ]

    response = client.post("/api/v1/analyze/risk", json={"transactions": transactions})
    assert response.status_code == 200
    data = response.json()

    assert "transactions" in data
    assert "alerts" in data
    assert "summary" in data
    assert data["summary"]["totalAnalyzed"] == 5
    assert len(data["alerts"]) >= 2

    # Verify that every alert has explainable rule triggers
    for alert in data["alerts"]:
        assert alert["riskScore"] >= 50.0
        assert len(alert["ruleTriggers"]) > 0
        for trigger in alert["ruleTriggers"]:
            assert trigger["ruleId"]
            assert trigger["ruleName"]
            assert trigger["description"]
            assert trigger["scoreContribution"] > 0
