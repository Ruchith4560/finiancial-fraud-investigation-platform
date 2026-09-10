from typing import List, Dict, Set
from datetime import datetime
from app.schemas.patterns import SuspiciousPatternOutput, TimeWindow
from app.schemas.risk import TransactionInput

class SharedIdentifierDetector:
    @staticmethod
    def detect(transactions: List[TransactionInput], device_map: Dict[str, Set[str]], min_accounts_per_device: int = 2) -> List[SuspiciousPatternOutput]:
        """
        Detects Shared Identifier / Device Farm Networks: >= 2 distinct accounts operating from the exact same hardware fingerprint or IP identifier.
        """
        patterns: List[SuspiciousPatternOutput] = []
        counter = 0

        for device_id, accounts in device_map.items():
            if len(accounts) >= min_accounts_per_device:
                counter += 1
                # Find all transactions involving this device
                device_txs = [tx for tx in transactions if (tx.deviceId or "").strip() == device_id]
                tx_ids = [tx.transactionId for tx in device_txs]
                timestamps = [tx.timestamp for tx in device_txs]

                start_time = min(timestamps) if timestamps else datetime.now()
                end_time = max(timestamps) if timestamps else datetime.now()
                duration_hrs = round(max((end_time - start_time).total_seconds() / 3600.0, 1.0), 2)
                total_vol = sum(tx.amount for tx in device_txs)

                patterns.append(SuspiciousPatternOutput(
                    patternId=f"PAT-DEV-{counter:03d}",
                    patternType="SHARED_IDENTIFIER",
                    title=f"Shared Device Farm: {device_id}",
                    severity="CRITICAL" if len(accounts) >= 4 else "HIGH",
                    confidenceScore=round(min(0.85 + (len(accounts) * 0.03), 0.99), 2),
                    involvedAccounts=list(accounts),
                    involvedDevices=[device_id],
                    involvedTransactions=tx_ids,
                    timeWindow=TimeWindow(
                        start=start_time,
                        end=end_time,
                        durationHours=duration_hrs
                    ),
                    metrics={
                        "sharedDeviceId": device_id,
                        "uniqueAccountCount": len(accounts),
                        "totalDeviceVolume": total_vol,
                        "transactionCount": len(device_txs)
                    },
                    humanExplanation=(
                        f"Hardware device fingerprint '{device_id}' was simultaneously utilized by {len(accounts)} "
                        f"distinct accounts ({', '.join(list(accounts)[:4])}...) to execute ${total_vol:,.2f} in transactions, "
                        f"indicating device spoofing, synthetic identity collusion, or an emulator farm."
                    ),
                    evidenceReferences=[
                        f"Hardware ID: {device_id} shared across {len(accounts)} accounts"
                    ]
                ))

        return patterns
