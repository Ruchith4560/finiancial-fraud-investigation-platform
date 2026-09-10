from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from main import app
from app.schemas.risk import TransactionInput, RuleTriggerOutput
from app.schemas.patterns import SuspiciousPatternOutput, TimeWindow
from app.schemas.summary import SummaryRequest
from app.ai.synthesizer import synthesizer

client = TestClient(app)

def create_sample_dossier():
    base_time = datetime(2026, 9, 1, 12, 0, 0)
    txs = [
        TransactionInput(
            transactionId="TX-AI-01",
            senderAccountId="ACC-FEEDER-1",
            receiverAccountId="ACC-HUB-TARGET",
            amount=9500.0,
            timestamp=base_time,
            transactionType="TRANSFER",
            deviceId="DEV-PHX-101",
            ipAddress="192.168.1.50"
        ),
        TransactionInput(
            transactionId="TX-AI-02",
            senderAccountId="ACC-FEEDER-2",
            receiverAccountId="ACC-HUB-TARGET",
            amount=9200.0,
            timestamp=base_time + timedelta(minutes=15),
            transactionType="TRANSFER",
            deviceId="DEV-PHX-101",
            ipAddress="192.168.1.50"
        ),
        TransactionInput(
            transactionId="TX-AI-03",
            senderAccountId="ACC-HUB-TARGET",
            receiverAccountId="ACC-OFFSHORE-9",
            amount=18000.0,
            timestamp=base_time + timedelta(minutes=45),
            transactionType="TRANSFER",
            deviceId="DEV-PHX-101",
            ipAddress="192.168.1.50"
        ),
    ]

    patterns = [
        SuspiciousPatternOutput(
            patternId="PAT-FIN-01",
            patternType="FAN_IN",
            title="Fan-In Smurfing Network",
            severity="HIGH",
            confidenceScore=0.89,
            involvedAccounts=["ACC-HUB-TARGET", "ACC-FEEDER-1", "ACC-FEEDER-2"],
            involvedDevices=["DEV-PHX-101"],
            involvedTransactions=["TX-AI-01", "TX-AI-02"],
            timeWindow=TimeWindow(start=base_time, end=base_time + timedelta(minutes=15), durationHours=0.25),
            metrics={"fanInRatio": 2.0},
            humanExplanation="Multiple distinct deposit originators funneled funds into single hub account within short interval.",
            evidenceReferences=["TX-AI-01", "TX-AI-02"]
        )
    ]

    rules = [
        RuleTriggerOutput(
            ruleId="RULE_RAPID_VELOCITY",
            ruleName="High-Velocity Fund Movement",
            description="Account conducted multiple large transactions within 60 minutes",
            severity="HIGH",
            scoreContribution=35.0
        )
    ]

    return SummaryRequest(
        targetAccountId="ACC-HUB-TARGET",
        caseId="CASE-2026-0088",
        transactions=txs,
        detectedPatterns=patterns,
        riskFactors=rules,
        mlAnomalyScore=0.82,
        investigatorNotes="Subpoena indicates account was opened with unverified digital ID."
    )

def test_forensic_synthesizer_direct():
    req = create_sample_dossier()
    resp = synthesizer.synthesize(req)

    # 1. Verification of Fact vs. Inference separation
    assert len(resp.observedFacts) >= 4
    assert len(resp.systemInferences) >= 2

    # Check observed facts contain exact figures
    vol_fact = next(f for f in resp.observedFacts if f.category == "TRANSACTION_VOLUME")
    assert "$36,700.00" in vol_fact.statement
    assert "3 transactions" in vol_fact.statement

    # Check structuring fact exists for $9k transactions
    str_fact = next((f for f in resp.observedFacts if f.category == "AMOUNT_STRUCTURING"), None)
    assert str_fact is not None
    assert "$18,700.00" in str_fact.statement

    # Check system inferences include typology and ML outlier
    fan_in_inf = next(inf for inf in resp.systemInferences if inf.typology == "FAN_IN")
    assert fan_in_inf.confidenceScore == 0.89
    assert "31 CFR § 1020.320" in fan_in_inf.regulatoryBasis

    ml_inf = next(inf for inf in resp.systemInferences if inf.typology == "ISOLATION_FOREST_OUTLIER")
    assert ml_inf.confidenceScore == 0.82

    # 2. Check 4-part FinCEN SAR narrative structure
    sar = resp.sarNarrative
    assert "PART I: SUBJECT & ACCOUNT IDENTIFICATION" in sar.subjectInformation
    assert "ACC-HUB-TARGET" in sar.subjectInformation
    assert "PART II: SUMMARY OF SUSPICIOUS ACTIVITY" in sar.summaryOfSuspiciousActivity
    assert "PART III: CHRONOLOGICAL BREAKDOWN" in sar.chronologicalNarrative
    assert "TX-AI-01" in sar.chronologicalNarrative
    assert "PART IV: DISPOSITION & RECOMMENDED ACTION" in sar.dispositionAndRecommendations
    assert "FinCEN Form 111" in sar.fullNarrativeText

    # 3. Check recommended actions
    assert len(resp.recommendedActions) >= 3

def test_zero_hallucination_guardrails():
    req = create_sample_dossier()
    resp = synthesizer.synthesize(req)

    full_text = (
        resp.executiveSummary + " " +
        resp.sarNarrative.fullNarrativeText + " " +
        " ".join(f.statement for f in resp.observedFacts) + " " +
        " ".join(i.statement for i in resp.systemInferences)
    ).lower()

    prohibited = ["guilty", "criminal", "stole", "thief", "scammer", "fraudster", "laundered money", "illicit funds"]
    for word in prohibited:
        assert word not in full_text, f"Prohibited accusatory word '{word}' found in generated text!"

def test_summary_api_endpoint():
    req = create_sample_dossier()
    payload = req.dict()
    # Serialize datetime to isoformat
    for tx in payload["transactions"]:
        tx["timestamp"] = tx["timestamp"].isoformat()
    for pat in payload["detectedPatterns"]:
        pat["timeWindow"]["start"] = pat["timeWindow"]["start"].isoformat()
        pat["timeWindow"]["end"] = pat["timeWindow"]["end"].isoformat()

    res = client.post("/api/v1/ai/summary", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["targetAccountId"] == "ACC-HUB-TARGET"
    assert data["caseId"] == "CASE-2026-0088"
    assert data["guardrailStatus"] == "PASSED_ZERO_HALLUCINATION_CHECKS"
    assert len(data["observedFacts"]) >= 4
    assert len(data["systemInferences"]) >= 2
    assert "PART I:" in data["sarNarrative"]["subjectInformation"]
