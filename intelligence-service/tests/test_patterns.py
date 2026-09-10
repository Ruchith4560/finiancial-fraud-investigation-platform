from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from main import app
from app.schemas.risk import TransactionInput
from app.graph.pattern_engine import SuspiciousPatternEngine

client = TestClient(app)

def test_rapid_fund_movement_detector():
    base_time = datetime(2026, 9, 1, 10, 0, 0)
    txs = [
        TransactionInput(
            transactionId="TX-RPM-01",
            senderAccountId="ACC-SENDER-A",
            receiverAccountId="ACC-MULE-B",
            amount=12000.0,
            timestamp=base_time,
            transactionType="TRANSFER",
            deviceId="DEV-001"
        ),
        TransactionInput(
            transactionId="TX-RPM-02",
            senderAccountId="ACC-MULE-B",
            receiverAccountId="ACC-RECIPIENT-C",
            amount=11000.0,
            timestamp=base_time + timedelta(minutes=45),
            transactionType="TRANSFER",
            deviceId="DEV-002"
        ),
    ]

    patterns, summary = SuspiciousPatternEngine.detect_all(txs)
    assert summary["RAPID_MOVEMENT"] >= 1
    rpm = next(p for p in patterns if p.patternType == "RAPID_MOVEMENT")
    assert "ACC-MULE-B" in rpm.involvedAccounts
    assert rpm.metrics["passThroughRatio"] >= 90.0
    assert rpm.metrics["velocityMinutes"] == 45.0

def test_fan_in_smurfing_detector():
    base_time = datetime(2026, 9, 1, 8, 0, 0)
    txs = []
    for i in range(4):
        txs.append(TransactionInput(
            transactionId=f"TX-FIN-{i+1}",
            senderAccountId=f"ACC-SMURF-{i+1}",
            receiverAccountId="ACC-CENTRAL-HUB",
            amount=4500.0,
            timestamp=base_time + timedelta(hours=i*2),
            transactionType="TRANSFER",
            deviceId=f"DEV-FIN-{i+1}"
        ))

    patterns, summary = SuspiciousPatternEngine.detect_all(txs)
    assert summary["FAN_IN"] >= 1
    fin = next(p for p in patterns if p.patternType == "FAN_IN")
    assert fin.metrics["uniqueSenderCount"] == 4
    assert fin.metrics["totalAggregatedVolume"] == 18000.0
    assert fin.metrics["targetAccount"] == "ACC-CENTRAL-HUB"

def test_fan_out_dispersion_detector():
    base_time = datetime(2026, 9, 1, 9, 0, 0)
    txs = []
    for i in range(4):
        txs.append(TransactionInput(
            transactionId=f"TX-FOUT-{i+1}",
            senderAccountId="ACC-MASTER-DISPERSER",
            receiverAccountId=f"ACC-DROP-{i+1}",
            amount=5000.0,
            timestamp=base_time + timedelta(hours=i),
            transactionType="TRANSFER",
            deviceId="DEV-FOUT-001"
        ))

    patterns, summary = SuspiciousPatternEngine.detect_all(txs)
    assert summary["FAN_OUT"] >= 1
    fout = next(p for p in patterns if p.patternType == "FAN_OUT")
    assert fout.metrics["uniqueReceiverCount"] == 4
    assert fout.metrics["totalDispersedVolume"] == 20000.0
    assert fout.metrics["sourceAccount"] == "ACC-MASTER-DISPERSER"

def test_circular_transfer_cycle_detector():
    base_time = datetime(2026, 9, 1, 6, 0, 0)
    txs = [
        TransactionInput(
            transactionId="TX-CYC-01",
            senderAccountId="ACC-RING-1",
            receiverAccountId="ACC-RING-2",
            amount=10000.0,
            timestamp=base_time,
            transactionType="TRANSFER"
        ),
        TransactionInput(
            transactionId="TX-CYC-02",
            senderAccountId="ACC-RING-2",
            receiverAccountId="ACC-RING-3",
            amount=9800.0,
            timestamp=base_time + timedelta(hours=4),
            transactionType="TRANSFER"
        ),
        TransactionInput(
            transactionId="TX-CYC-03",
            senderAccountId="ACC-RING-3",
            receiverAccountId="ACC-RING-1",
            amount=9500.0,
            timestamp=base_time + timedelta(hours=8),
            transactionType="TRANSFER"
        ),
    ]

    patterns, summary = SuspiciousPatternEngine.detect_all(txs)
    assert summary["CIRCULAR_TRANSFER"] >= 1
    cyc = next(p for p in patterns if p.patternType == "CIRCULAR_TRANSFER")
    assert cyc.metrics["cycleLength"] == 3
    assert set(cyc.involvedAccounts) == {"ACC-RING-1", "ACC-RING-2", "ACC-RING-3"}

def test_shared_identifier_device_farm():
    base_time = datetime(2026, 9, 1, 14, 0, 0)
    txs = [
        TransactionInput(
            transactionId="TX-DEV-01",
            senderAccountId="ACC-PUPPET-1",
            receiverAccountId="ACC-EXT-1",
            amount=1500.0,
            timestamp=base_time,
            transactionType="PAYMENT",
            deviceId="HARDWARE-FARM-ID-777"
        ),
        TransactionInput(
            transactionId="TX-DEV-02",
            senderAccountId="ACC-PUPPET-2",
            receiverAccountId="ACC-EXT-2",
            amount=2500.0,
            timestamp=base_time + timedelta(minutes=10),
            transactionType="PAYMENT",
            deviceId="HARDWARE-FARM-ID-777"
        ),
        TransactionInput(
            transactionId="TX-DEV-03",
            senderAccountId="ACC-PUPPET-3",
            receiverAccountId="ACC-EXT-3",
            amount=3200.0,
            timestamp=base_time + timedelta(minutes=25),
            transactionType="PAYMENT",
            deviceId="HARDWARE-FARM-ID-777"
        ),
    ]

    patterns, summary = SuspiciousPatternEngine.detect_all(txs)
    assert summary["SHARED_IDENTIFIER"] >= 1
    dev = next(p for p in patterns if p.patternType == "SHARED_IDENTIFIER")
    assert dev.metrics["sharedDeviceId"] == "HARDWARE-FARM-ID-777"
    assert dev.metrics["uniqueAccountCount"] == 3

def test_pattern_detection_api_endpoint():
    base_time = datetime(2026, 9, 1, 10, 0, 0)
    payload = {
        "transactions": [
            {
                "transactionId": "TX-API-01",
                "senderAccountId": "ACC-API-A",
                "receiverAccountId": "ACC-API-B",
                "amount": 10000.0,
                "timestamp": base_time.isoformat(),
                "transactionType": "TRANSFER",
                "deviceId": "DEV-SHARED-API"
            },
            {
                "transactionId": "TX-API-02",
                "senderAccountId": "ACC-API-B",
                "receiverAccountId": "ACC-API-C",
                "amount": 9500.0,
                "timestamp": (base_time + timedelta(minutes=30)).isoformat(),
                "transactionType": "TRANSFER",
                "deviceId": "DEV-SHARED-API"
            }
        ]
    }

    response = client.post("/api/v1/analyze/patterns", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "totalPatternsDetected" in data
    assert "patterns" in data
    assert "summaryByType" in data
    assert data["totalPatternsDetected"] >= 1
    assert data["summaryByType"]["RAPID_MOVEMENT"] >= 1
    assert data["summaryByType"]["SHARED_IDENTIFIER"] >= 1
