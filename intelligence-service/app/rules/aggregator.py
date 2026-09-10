from typing import List, Tuple
from app.schemas.risk import (
    TransactionInput,
    TransactionRiskOutput,
    AlertOutput,
)
from app.rules.deterministic_rules import DeterministicRuleEngine
from app.ml.anomaly_detector import AnomalyDetector

class RiskAggregator:
    @staticmethod
    def analyze(transactions: List[TransactionInput]) -> Tuple[List[TransactionRiskOutput], List[AlertOutput], dict]:
        """
        Layer 3: Combines Layer 1 deterministic rules with Layer 2 ML anomaly scoring.
        Generates scored transactions, explainability triggers, and prioritized alerts.
        """
        # 1. Evaluate Layer 1 Rules
        rule_map = DeterministicRuleEngine.evaluate(transactions)

        # 2. Evaluate Layer 2 ML Anomaly Scores
        ml_detector = AnomalyDetector()
        ml_scores = ml_detector.score(transactions)

        scored_transactions: List[TransactionRiskOutput] = []
        alerts: List[AlertOutput] = []

        alert_id_counter = 1000

        for tx in transactions:
            tx_id = tx.transactionId
            rules = rule_map.get(tx_id, [])
            ml_score = ml_scores.get(tx_id, 0.0)

            # Sum deterministic rule score contributions (up to 80 points)
            deterministic_sum = sum(r.scoreContribution for r in rules)
            rule_component = min(deterministic_sum, 80.0)

            # ML anomaly contribution (up to 20 points)
            ml_component = ml_score * 20.0

            # Composite Risk Score (0 - 100)
            composite_score = round(min(rule_component + ml_component, 100.0), 1)

            # Determine Risk Tier
            if composite_score >= 75.0:
                risk_level = "CRITICAL"
            elif composite_score >= 50.0:
                risk_level = "HIGH"
            elif composite_score >= 25.0:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            is_flagged = composite_score >= 50.0

            scored_tx = TransactionRiskOutput(
                transactionId=tx_id,
                riskScore=composite_score,
                riskLevel=risk_level,
                mlScore=ml_score,
                ruleTriggers=rules,
                isFlagged=is_flagged
            )
            scored_transactions.append(scored_tx)

            # Generate Prioritized Alert if flagged
            if is_flagged:
                alert_id_counter += 1
                alert = AlertOutput(
                    alertId=f"ALT-{alert_id_counter}",
                    transactionId=tx_id,
                    primaryAccountId=tx.senderAccountId,
                    relatedAccountIds=[tx.receiverAccountId],
                    riskScore=composite_score,
                    severity=risk_level,
                    ruleTriggers=rules,
                    mlScore=ml_score,
                    detectedPatterns=[]
                )
                alerts.append(alert)

        # Sort alerts descending by risk score (prioritized triage queue)
        alerts.sort(key=lambda x: x.riskScore, reverse=True)

        summary = {
            "totalAnalyzed": len(transactions),
            "flaggedCount": len(alerts),
            "criticalCount": sum(1 for a in alerts if a.severity == "CRITICAL"),
            "highCount": sum(1 for a in alerts if a.severity == "HIGH"),
            "rulesTriggered": sum(len(tx.ruleTriggers) for tx in scored_transactions)
        }

        return scored_transactions, alerts, summary
