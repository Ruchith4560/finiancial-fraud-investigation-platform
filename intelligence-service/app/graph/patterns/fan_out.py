import networkx as nx
from typing import List
from datetime import timedelta
from app.schemas.patterns import SuspiciousPatternOutput, TimeWindow

class FanOutDetector:
    @staticmethod
    def detect(G: nx.MultiDiGraph, min_receivers: int = 4, window_hours: float = 24.0, min_total_volume: float = 15000.0) -> List[SuspiciousPatternOutput]:
        """
        Detects Fan-Out dispersion: 1 source account distributing funds across >= 4 distinct destination accounts within a sliding 24-hour window.
        """
        patterns: List[SuspiciousPatternOutput] = []
        counter = 0

        for src_node in G.nodes():
            out_edges = sorted(G.out_edges(src_node, data=True), key=lambda x: x[2]["timestamp"])
            if len(out_edges) < min_receivers:
                continue

            for i in range(len(out_edges)):
                start_time = out_edges[i][2]["timestamp"]
                window_end = start_time + timedelta(hours=window_hours)

                window_edges = [e for e in out_edges[i:] if e[2]["timestamp"] <= window_end]
                unique_receivers = {e[1] for e in window_edges}

                if len(unique_receivers) >= min_receivers:
                    total_vol = sum(e[2]["amount"] for e in window_edges)
                    if total_vol >= min_total_volume:
                        counter += 1
                        tx_ids = [e[2]["transactionId"] for e in window_edges]
                        devices = list({e[2].get("deviceId") for e in window_edges if e[2].get("deviceId")})
                        actual_end = max(e[2]["timestamp"] for e in window_edges)
                        duration_hrs = round((actual_end - start_time).total_seconds() / 3600.0, 2)

                        patterns.append(SuspiciousPatternOutput(
                            patternId=f"PAT-FOUT-{counter:03d}",
                            patternType="FAN_OUT",
                            title=f"Fan-Out Dispersion from {src_node}",
                            severity="CRITICAL" if total_vol >= 40000 else "HIGH",
                            confidenceScore=round(min(0.80 + (len(unique_receivers) * 0.03), 0.96), 2),
                            involvedAccounts=[src_node] + list(unique_receivers),
                            involvedDevices=devices,
                            involvedTransactions=tx_ids,
                            timeWindow=TimeWindow(
                                start=start_time,
                                end=actual_end,
                                durationHours=duration_hrs
                            ),
                            metrics={
                                "uniqueReceiverCount": len(unique_receivers),
                                "totalDispersedVolume": total_vol,
                                "sourceAccount": src_node,
                                "averageTransferAmount": round(total_vol / len(window_edges), 2)
                            },
                            humanExplanation=(
                                f"Account '{src_node}' dispersed ${total_vol:,.2f} across {len(unique_receivers)} "
                                f"destination accounts within {duration_hrs} hours, characteristic of money laundering dispersion."
                            ),
                            evidenceReferences=[f"Dispersed to {len(unique_receivers)} recipients from {src_node}"]
                        ))
                        break

        return patterns
