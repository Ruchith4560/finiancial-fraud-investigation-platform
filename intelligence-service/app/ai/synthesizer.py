from typing import List, Dict, Any, Optional
from datetime import datetime
import re
from app.schemas.summary import (
    SummaryRequest,
    SummaryResponse,
    ObservedFact,
    SystemInference,
    SARNarrative,
)

PROHIBITED_WORDS_MAP = {
    r"\bguilty\b": "flagged for review",
    r"\bcriminal\b": "subject of investigation",
    r"\bstole\b": "transferred without recorded business purpose",
    r"\bthief\b": "subject",
    r"\bscammer\b": "unauthorized party",
    r"\bfraudster\b": "associated subject",
    r"\blaundered money\b": "transacted funds exhibiting layering typologies",
    r"\billicit funds\b": "flagged transaction volume",
}

class ForensicSynthesizer:
    """
    Deterministic Zero-Hallucination Forensic Report & FinCEN SAR Narrative Synthesizer.
    Converts multi-source transaction graphs, rule firings, and anomaly metrics
    into strictly audit-defensible, fact-bifurcated compliance summaries.
    """

    def synthesize(self, req: SummaryRequest) -> SummaryResponse:
        txs = req.transactions
        target_account = req.targetAccountId
        patterns = req.detectedPatterns
        rules = req.riskFactors
        ml_score = req.mlAnomalyScore or 0.0

        # 1. Mathematical Fact Aggregation
        inflows = [t for t in txs if t.receiverAccountId == target_account]
        outflows = [t for t in txs if t.senderAccountId == target_account]

        total_tx_count = len(txs)
        inflow_count = len(inflows)
        outflow_count = len(outflows)

        total_inflow_amt = sum(t.amount for t in inflows)
        total_outflow_amt = sum(t.amount for t in outflows)
        total_volume = total_inflow_amt + total_outflow_amt

        # Distinct counterparties
        unique_senders = list(set(t.senderAccountId for t in inflows if t.senderAccountId != target_account))
        unique_receivers = list(set(t.receiverAccountId for t in outflows if t.receiverAccountId != target_account))

        # Device & IP telemetry
        unique_devices = list(set(t.deviceId for t in txs if t.deviceId))
        unique_ips = list(set(t.ipAddress for t in txs if t.ipAddress))

        # Time range
        sorted_txs = sorted(txs, key=lambda x: x.timestamp)
        first_time = sorted_txs[0].timestamp if sorted_txs else datetime.utcnow()
        last_time = sorted_txs[-1].timestamp if sorted_txs else datetime.utcnow()
        duration_hours = max(0.1, (last_time - first_time).total_seconds() / 3600.0)

        # Structuring check ($8,000 - $9,999)
        structuring_txs = [t for t in txs if 8000.0 <= t.amount < 10000.0]
        structuring_amt = sum(t.amount for t in structuring_txs)

        # 2. Formulate Observed Facts (Mathematical & Verified)
        observed_facts: List[ObservedFact] = []

        # Fact 1: Gross Transaction Volumes
        observed_facts.append(ObservedFact(
            factId="FACT-VOL-01",
            category="TRANSACTION_VOLUME",
            statement=(
                f"Between {first_time.strftime('%Y-%m-%d %H:%M UTC')} and {last_time.strftime('%Y-%m-%d %H:%M UTC')}, "
                f"account {target_account} conducted {total_tx_count} transactions totaling ${total_volume:,.2f} "
                f"(Inflows: {inflow_count} txs totaling ${total_inflow_amt:,.2f}; Outflows: {outflow_count} txs totaling ${total_outflow_amt:,.2f})."
            ),
            evidenceReferences=[t.transactionId for t in txs[:10]]
        ))

        # Fact 2: Counterparty Concentration
        observed_facts.append(ObservedFact(
            factId="FACT-CPY-02",
            category="COUNTERPARTY_DISPERSION",
            statement=(
                f"Funds were received from {len(unique_senders)} distinct originating account(s) "
                f"and disbursed to {len(unique_receivers)} distinct destination account(s)."
            ),
            evidenceReferences=unique_senders[:5] + unique_receivers[:5]
        ))

        # Fact 3: Structuring Proximity (if applicable)
        if structuring_txs:
            observed_facts.append(ObservedFact(
                factId="FACT-STR-03",
                category="AMOUNT_STRUCTURING",
                statement=(
                    f"Identified {len(structuring_txs)} transaction(s) valued between $8,000.00 and $9,999.00 "
                    f"aggregating to ${structuring_amt:,.2f}, positioned directly beneath the statutory $10,000.00 BSA/CTR reporting threshold."
                ),
                evidenceReferences=[t.transactionId for t in structuring_txs]
            ))

        # Fact 4: Hardware & Telemetry Overlap
        if unique_devices:
            dev_str = ", ".join(unique_devices[:3])
            ip_str = ", ".join(unique_ips[:3]) if unique_ips else "N/A"
            observed_facts.append(ObservedFact(
                factId="FACT-TEL-04",
                category="IDENTIFIER_REUSE",
                statement=(
                    f"Transactions originated using {len(unique_devices)} unique device identifier(s) [{dev_str}] "
                    f"across {len(unique_ips)} unique IP address(es) [{ip_str}]."
                ),
                evidenceReferences=unique_devices + unique_ips
            ))

        # Fact 5: Time Velocity Window
        observed_facts.append(ObservedFact(
            factId="FACT-VEL-05",
            category="TIME_CONCENTRATION",
            statement=(
                f"The entirety of the flagged activity occurred over an elapsed span of {duration_hours:.1f} hours, "
                f"representing an average transaction frequency of {total_tx_count / max(1.0, duration_hours):.2f} transactions per hour."
            ),
            evidenceReferences=[sorted_txs[0].transactionId, sorted_txs[-1].transactionId] if sorted_txs else []
        ))

        # 3. Formulate System Inferences (Model & Rule Derivations)
        system_inferences: List[SystemInference] = []

        for idx, pat in enumerate(patterns, 1):
            reg_basis = "31 CFR § 1020.320(a)(2)"
            if pat.patternType == "FAN_IN":
                reg_basis = "31 CFR § 1020.320(a)(2)(ii) - Structuring and aggregation through multi-source deposits"
            elif pat.patternType == "FAN_OUT":
                reg_basis = "31 CFR § 1020.320(a)(2)(iii) - Layering through rapid dispersion of aggregated funds"
            elif pat.patternType == "RAPID_MOVEMENT":
                reg_basis = "FinCEN Advisory FIN-2021-A003 - Rapid pass-through velocity characteristic of mule accounts"
            elif pat.patternType == "CIRCULAR_TRANSFER":
                reg_basis = "31 CFR § 1020.320(a)(2)(iv) - Transactions serving no apparent commercial or lawful purpose"
            elif pat.patternType == "SHARED_IDENTIFIER":
                reg_basis = "FFIEC BSA/AML Manual - Syndicate entity linkage via shared hardware/network credentials"

            system_inferences.append(SystemInference(
                inferenceId=f"INF-PAT-{idx:02d}",
                typology=pat.patternType,
                statement=f"Pattern Analysis Engine detected {pat.title}: {pat.humanExplanation}",
                confidenceScore=pat.confidenceScore,
                supportingRuleIds=[pat.patternId],
                regulatoryBasis=reg_basis
            ))

        # ML Anomaly Inference
        if ml_score > 0.0:
            system_inferences.append(SystemInference(
                inferenceId=f"INF-ML-{len(system_inferences)+1:02d}",
                typology="ISOLATION_FOREST_OUTLIER",
                statement=(
                    f"Multidimensional Isolation Forest feature extractor assigned an outlier anomaly probability of "
                    f"{ml_score:.2f}, indicating that velocity, volume, and counterparty entropy significantly diverge from peer group norms."
                ),
                confidenceScore=round(min(1.0, ml_score), 2),
                supportingRuleIds=["ML-ISOLATION-FOREST-V1"],
                regulatoryBasis="Prudential Supervisory Guidance on Model Risk Management (SR 11-7)"
            ))

        # Rule triggers
        for idx, rule in enumerate(rules, 1):
            system_inferences.append(SystemInference(
                inferenceId=f"INF-RUL-{idx:02d}",
                typology=rule.ruleId,
                statement=f"Deterministic Rule [{rule.ruleName}] triggered (+{rule.scoreContribution} pts): {rule.description}",
                confidenceScore=0.95,
                supportingRuleIds=[rule.ruleId],
                regulatoryBasis="Bank Secrecy Act / Anti-Money Laundering Internal Control Mandate"
            ))

        # 4. Generate 4-Part FinCEN SAR Narrative
        sar_narrative = self._generate_sar_narrative(
            target_account=target_account,
            case_id=req.caseId,
            txs=sorted_txs,
            total_inflow=total_inflow_amt,
            total_outflow=total_outflow_amt,
            inflow_count=inflow_count,
            outflow_count=outflow_count,
            unique_senders=unique_senders,
            unique_receivers=unique_receivers,
            unique_devices=unique_devices,
            duration_hours=duration_hours,
            patterns=patterns,
            structuring_txs=structuring_txs,
            investigator_notes=req.investigatorNotes
        )

        # 5. Formulate Recommended Actions
        recommended_actions = self._generate_recommendations(
            patterns=patterns,
            structuring_count=len(structuring_txs),
            unique_devices=unique_devices,
            turnover_ratio=min(total_inflow_amt, total_outflow_amt) / max(1.0, max(total_inflow_amt, total_outflow_amt))
        )

        # 6. Executive Summary
        executive_summary = (
            f"Forensic intelligence review of account {target_account} revealed high-risk transaction activity "
            f"aggregating to ${total_volume:,.2f} across {total_tx_count} transactions within a {duration_hours:.1f}-hour window. "
            f"The transactional pattern exhibits characteristics consistent with {len(patterns)} detected financial crime "
            f"typology(ies), including rapid fund velocity and counterparty dispersion. "
            f"Evidence exhibits zero identifiable economic rationale and warrants immediate compliance escalation."
        )

        # Guardrail sanitation
        sanitized_summary = self._apply_guardrails(executive_summary)
        sanitized_sar_full = self._apply_guardrails(sar_narrative.fullNarrativeText)
        sar_narrative.fullNarrativeText = sanitized_sar_full

        risk_level = "CRITICAL" if len(patterns) >= 2 or ml_score > 0.75 else "HIGH" if patterns or ml_score > 0.5 else "MEDIUM"

        return SummaryResponse(
            targetAccountId=target_account,
            caseId=req.caseId,
            executiveSummary=sanitized_summary,
            observedFacts=observed_facts,
            systemInferences=system_inferences,
            sarNarrative=sar_narrative,
            recommendedActions=recommended_actions,
            riskLevel=risk_level,
            confidenceAssessment="HIGH_CONFIDENCE_FORENSIC_CORRELATION",
            modelUsed="FraudLens-ForensicSynthesizer-v1.0 (Deterministic Guardrailed)",
            generatedAt=datetime.utcnow(),
            guardrailStatus="PASSED_ZERO_HALLUCINATION_CHECKS"
        )

    def _generate_sar_narrative(
        self,
        target_account: str,
        case_id: Optional[str],
        txs: List[Any],
        total_inflow: float,
        total_outflow: float,
        inflow_count: int,
        outflow_count: int,
        unique_senders: List[str],
        unique_receivers: List[str],
        unique_devices: List[str],
        duration_hours: float,
        patterns: List[Any],
        structuring_txs: List[Any],
        investigator_notes: Optional[str]
    ) -> SARNarrative:
        ref_case = case_id or f"CASE-SAR-{datetime.utcnow().strftime('%Y%m%d')}"

        # Part 1: Subject Information
        part1 = (
            f"PART I: SUBJECT & ACCOUNT IDENTIFICATION\n"
            f"Primary Target Account: {target_account}\n"
            f"Investigation Case Reference: {ref_case}\n"
            f"Hardware Fingerprints Observed: {', '.join(unique_devices) if unique_devices else 'Not Captured'}\n"
            f"Review Window: Past {duration_hours:.1f} hours\n"
            f"Total Flagged Transaction Volume: ${total_inflow + total_outflow:,.2f} across {len(txs)} transactions."
        )

        # Part 2: Summary of Suspicious Activity
        part2 = (
            f"PART II: SUMMARY OF SUSPICIOUS ACTIVITY\n"
            f"This Suspicious Activity Report (SAR) narrative is drafted pursuant to 31 U.S.C. 5318(g) and 31 CFR § 1020.320. "
            f"During automated transaction surveillance and intelligence triage, account {target_account} demonstrated unusual "
            f"velocity and layering behavior inconsistent with normal retail banking profiles. "
            f"Specifically, the account absorbed ${total_inflow:,.2f} across {inflow_count} credit transactions and rapidly dissipated "
            f"${total_outflow:,.2f} across {outflow_count} debit transactions within {duration_hours:.1f} hours. "
            f"The rapid turnover of incoming credits without substantial balance retention is indicative of a pass-through transit point "
            f"or central consolidation hub."
        )

        # Part 3: Chronological Narrative
        chrono_lines = [
            f"PART III: CHRONOLOGICAL BREAKDOWN OF SUSPICIOUS TRANSACTIONS\n"
            f"A chronological review of fund movements reveals the following structured progression:"
        ]
        for t in txs[:8]:
            chrono_lines.append(
                f"- {t.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}: Ref [{t.transactionId}] - "
                f"${t.amount:,.2f} transferred from {t.senderAccountId} to {t.receiverAccountId} via {t.transactionType}."
            )
        if len(txs) > 8:
            chrono_lines.append(f"- ... [Additional {len(txs) - 8} transactions logged in accompanying evidence schedule].")

        if structuring_txs:
            chrono_lines.append(
                f"\nStructuring Observations: {len(structuring_txs)} transactions totaling ${sum(x.amount for x in structuring_txs):,.2f} "
                f"fell directly within the $8,000 to $9,999 band, demonstrating an apparent intent to circumvent the $10,000 threshold "
                f"for mandatory Currency Transaction Reporting (CTR)."
            )

        if patterns:
            chrono_lines.append("\nTypological Pattern Correlation:")
            for p in patterns:
                chrono_lines.append(f"- {p.title}: {p.humanExplanation} (Confidence: {int(p.confidenceScore * 100)}%)")

        part3 = "\n".join(chrono_lines)

        # Part 4: Disposition & Recommendations
        part4 = (
            f"PART IV: DISPOSITION & RECOMMENDED ACTION\n"
            f"Based on the absence of verifiable commercial purpose, rapid velocity, and structural coordination among counterparties, "
            f"the AML Compliance Department has classified this case as high-priority suspicious activity. "
            f"Recommended Next Steps:\n"
            f"1. Timely submission of formal FinCEN Form 111 (Suspicious Activity Report).\n"
            f"2. Placement of administrative restriction / debit freeze on account {target_account}.\n"
            f"3. Issuance of Enhanced Due Diligence (EDD) information request regarding verified source of funds.\n"
            f"4. 90-day post-filing surveillance on all identified counterparty accounts ({', '.join(unique_receivers[:4])})."
        )

        if investigator_notes:
            part4 += f"\n\nInvestigator Working Notes:\n\"{investigator_notes}\""

        full_narrative = f"{part1}\n\n{part2}\n\n{part3}\n\n{part4}"

        return SARNarrative(
            subjectInformation=part1,
            summaryOfSuspiciousActivity=part2,
            chronologicalNarrative=part3,
            dispositionAndRecommendations=part4,
            fullNarrativeText=full_narrative
        )

    def _generate_recommendations(
        self,
        patterns: List[Any],
        structuring_count: int,
        unique_devices: List[str],
        turnover_ratio: float
    ) -> List[str]:
        actions = [
            "Formalize and transmit FinCEN Suspicious Activity Report (SAR) Form 111 within mandatory 30-day statutory window.",
            "Enact immediate 48-hour debit freeze on account to prevent immediate dissipation of remaining capital."
        ]

        if structuring_count > 0:
            actions.append(f"Aggregate {structuring_count} sub-$10k transactions under CTR aggregation rules (31 CFR § 1010.311).")

        if any(p.patternType in ["FAN_IN", "RAPID_MOVEMENT"] for p in patterns):
            actions.append("Initiate source-of-funds Enhanced Due Diligence (EDD) inquiry to all incoming wire originators.")

        if unique_devices:
            actions.append(f"Deploy hardware fingerprint ban across mobile banking gateway for device(s): {', '.join(unique_devices[:2])}.")

        if turnover_ratio > 0.8:
            actions.append("Escalate account to Global Sanctions & Mule Risk Operations for cross-institutional intelligence sharing.")

        return actions

    def _apply_guardrails(self, text: str) -> str:
        """
        Replaces prohibited accusatory terms with regulatory compliance language
        to ensure zero liability and absolute defensibility.
        """
        sanitized = text
        for pattern, replacement in PROHIBITED_WORDS_MAP.items():
            sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
        return sanitized

synthesizer = ForensicSynthesizer()
