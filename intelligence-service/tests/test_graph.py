from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from main import app
from app.schemas.risk import TransactionInput
from app.graph.subgraph import SubgraphExtractor

client = TestClient(app)

def test_ego_network_subgraph_extraction():
    base_time = datetime(2026, 9, 1, 10, 0, 0)
    txs = [
        # Center node: ACC-ROOT
        TransactionInput(
            transactionId="TX-EGO-01",
            senderAccountId="ACC-ROOT",
            receiverAccountId="ACC-PEER-1",
            amount=8000.0,
            timestamp=base_time,
            transactionType="TRANSFER",
            deviceId="DEV-SHARED-101"
        ),
        TransactionInput(
            transactionId="TX-EGO-02",
            senderAccountId="ACC-FEEDER-1",
            receiverAccountId="ACC-ROOT",
            amount=15000.0,
            timestamp=base_time + timedelta(minutes=15),
            transactionType="TRANSFER",
            deviceId="DEV-ROOT-001"
        ),
        TransactionInput(
            transactionId="TX-EGO-03",
            senderAccountId="ACC-PEER-1",
            receiverAccountId="ACC-HOP2-A",
            amount=7500.0,
            timestamp=base_time + timedelta(minutes=30),
            transactionType="TRANSFER",
            deviceId="DEV-SHARED-101"
        ),
        # Unrelated transaction outside 2 hops
        TransactionInput(
            transactionId="TX-EGO-UNRELATED",
            senderAccountId="ACC-ISLAND-X",
            receiverAccountId="ACC-ISLAND-Y",
            amount=500.0,
            timestamp=base_time,
            transactionType="PAYMENT",
            deviceId="DEV-ISLAND-99"
        )
    ]

    res = SubgraphExtractor.extract_ego_network(
        root_account_id="ACC-ROOT",
        transactions=txs,
        max_hops=2,
        max_nodes=50,
        include_devices=True
    )

    assert res.rootAccountId == "ACC-ROOT"
    node_ids = {n.id for n in res.nodes}
    assert "ACC-ROOT" in node_ids
    assert "ACC-PEER-1" in node_ids
    assert "ACC-FEEDER-1" in node_ids
    assert "ACC-HOP2-A" in node_ids
    # Island should not be included
    assert "ACC-ISLAND-X" not in node_ids

    root_node = next(n for n in res.nodes if n.id == "ACC-ROOT")
    assert root_node.isRoot is True
    assert root_node.inflow == 15000.0
    assert root_node.outflow == 8000.0
    assert root_node.riskScore >= 35.0

    # Verify device node for DEV-SHARED-101 (used by both ACC-ROOT and ACC-PEER-1)
    assert "DEV-SHARED-101" in node_ids
    dev_node = next(n for n in res.nodes if n.id == "DEV-SHARED-101")
    assert dev_node.type == "DEVICE"
    assert dev_node.riskLevel in ["HIGH", "CRITICAL"]

    assert res.metrics.totalNodes >= 4
    assert res.metrics.totalEdges >= 3

def test_subgraph_api_endpoint():
    base_time = datetime(2026, 9, 1, 12, 0, 0)
    payload = {
        "rootAccountId": "ACC-API-ROOT",
        "maxHops": 2,
        "maxNodes": 50,
        "includeDevices": True,
        "transactions": [
            {
                "transactionId": "TX-API-G1",
                "senderAccountId": "ACC-API-ROOT",
                "receiverAccountId": "ACC-API-DROP",
                "amount": 12500.0,
                "timestamp": base_time.isoformat(),
                "transactionType": "TRANSFER",
                "deviceId": "DEV-API-77"
            },
            {
                "transactionId": "TX-API-G2",
                "senderAccountId": "ACC-API-FEED",
                "receiverAccountId": "ACC-API-ROOT",
                "amount": 14000.0,
                "timestamp": (base_time - timedelta(hours=1)).isoformat(),
                "transactionType": "TRANSFER",
                "deviceId": "DEV-API-77"
            }
        ]
    }

    response = client.post("/api/v1/graph/subgraph", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["rootAccountId"] == "ACC-API-ROOT"
    assert len(data["nodes"]) >= 3
    assert len(data["edges"]) >= 2
    assert data["metrics"]["totalNodes"] == len(data["nodes"])
    assert data["metrics"]["totalEdges"] == len(data["edges"])
