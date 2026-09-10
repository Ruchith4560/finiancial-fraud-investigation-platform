from typing import List, Dict
from datetime import datetime, timedelta
from app.schemas.risk import TransactionInput, RuleTriggerOutput

class DeterministicRuleEngine:
    @staticmethod
    def evaluate(transactions: List[TransactionInput]) -> Dict[str, List[RuleTriggerOutput]]:
        """
        Evaluates deterministic financial crime rules across an ordered sequence of transactions.
        Returns a mapping from transactionId to its list of triggered rules.
        """
        results: Dict[str, List[RuleTriggerOutput]] = {tx.transactionId: [] for tx in transactions}

        # Sort transactions chronologically
        sorted_txs = sorted(transactions, key=lambda x: x.timestamp)

        # Track history for velocity & rapid repetition
        sender_timestamps: Dict[str, List[datetime]] = {}
        pair_timestamps: Dict[str, List[datetime]] = {}

        for tx in sorted_txs:
            triggers: List[RuleTriggerOutput] = []
            sender = tx.senderAccountId
            receiver = tx.receiverAccountId
            pair_key = f"{sender}->{receiver}"
            amount = tx.amount
            ts = tx.timestamp

            # 1. Amount Threshold Rule (CTR Mandatory Threshold)
            if amount >= 10000.0:
                triggers.append(RuleTriggerOutput(
                    ruleId="RULE-CTR-THRESHOLD",
                    ruleName="Mandatory Reporting Threshold",
                    description=f"Transaction amount ${amount:,.2f} meets or exceeds the $10,000 Bank Secrecy Act threshold",
                    severity="HIGH",
                    scoreContribution=55.0
                ))
            # 2. Structuring / Smurfing Rule (Just below CTR threshold)
            elif 9000.0 <= amount < 10000.0:
                triggers.append(RuleTriggerOutput(
                    ruleId="RULE-STRUCTURING",
                    ruleName="Potential Structuring / Smurfing",
                    description=f"Transaction amount ${amount:,.2f} is just below the $10,000 threshold, characteristic of intentional structuring",
                    severity="HIGH",
                    scoreContribution=50.0
                ))

            # 3. High Velocity Rule (>= 3 transfers from same sender within 1 hour)
            if sender not in sender_timestamps:
                sender_timestamps[sender] = []
            
            # Keep only timestamps within past 1 hour
            sender_timestamps[sender] = [t for t in sender_timestamps[sender] if ts - t <= timedelta(hours=1)]
            if len(sender_timestamps[sender]) >= 2: # with current tx, count is >= 3
                triggers.append(RuleTriggerOutput(
                    ruleId="RULE-HIGH-VELOCITY",
                    ruleName="Elevated Transfer Velocity",
                    description=f"Account {sender} initiated {len(sender_timestamps[sender]) + 1} transactions within a 1-hour window",
                    severity="MEDIUM",
                    scoreContribution=35.0
                ))
            sender_timestamps[sender].append(ts)

            # 4. Rapid Repetition to Same Counterparty (within 10 minutes)
            if pair_key not in pair_timestamps:
                pair_timestamps[pair_key] = []
            
            recent_pair = [t for t in pair_timestamps[pair_key] if ts - t <= timedelta(minutes=10)]
            if len(recent_pair) >= 1:
                triggers.append(RuleTriggerOutput(
                    ruleId="RULE-RAPID-REPETITION",
                    ruleName="Rapid Succession Transfers",
                    description=f"Repeated transaction between {sender} and {receiver} within 10 minutes",
                    severity="HIGH",
                    scoreContribution=45.0
                ))
            pair_timestamps[pair_key].append(ts)

            # 5. Nocturnal Activity Rule (01:00 to 05:00 UTC with amount > $2,500)
            if 1 <= ts.hour <= 4 and amount > 2500.0:
                triggers.append(RuleTriggerOutput(
                    ruleId="RULE-NOCTURNAL-TRANSFER",
                    ruleName="Off-Hours High-Value Transfer",
                    description=f"Substantial transfer of ${amount:,.2f} initiated during nocturnal off-hours ({ts.strftime('%H:%M')} UTC)",
                    severity="MEDIUM",
                    scoreContribution=25.0
                ))

            results[tx.transactionId] = triggers

        return results
