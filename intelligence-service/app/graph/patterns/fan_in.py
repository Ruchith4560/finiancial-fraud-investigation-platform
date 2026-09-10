import networkx as nx
from typing import List, Dict
from datetime import timedelta
from app.schemas.patterns import SuspiciousPatternOutput, TimeWindow

class FanInDetector:
    @staticmethod
    def detect(G: nx.MultiDiGraph, min_senders: int = 4, window_hours: float = 24.0, min_total_volume: float = 15000.0) -> List[SuspiciousPatternOutput]:
        """
        Detects Fan-In aggregation: >= 4 distinct source accounts sending funds to one centralized destination account within a sliding 24-hour window.
        """
        patterns: List[SuspiciousPatternOutput] = []
        counter = 0

        for dest_node in G.nodes():
            in_edges = sorted(G.in_edges(dest_node, data=True), key=lambda x: x[2]["timestamp"])
            if len(in_edges) < min_senders:
                continue

            # Sliding window over incoming transfers
            for i in range(len(in_edges)):
                start_time = in_edges[i][2]["timestamp"]
                window_end = start_time + timedelta(hours=window_hours)

                window_edges = [e for e in in_edges[i:] if e[2]["timestamp"] <= window_end]
                unique_senders = {e[0] for e in window_edges}

                if len(unique_senders) >= min_senders:
                    total_vol = sum(e[2]["amount"] for e in window_edges)
                    if total_vol >= min_total_volume:
                        counter += 1
                        tx_ids = [e[2]["transactionId"] for e in window_edges]
                        devices = list({e[2].get("deviceId") for e in window_edges if e[2].get("deviceId")})
                        actual_end = max(e[2]["timestamp"] for e in window_edges)
                        duration_hrs = round((actual_end - start_time).total_seconds() / 3600.0, 2)

                        patterns.append(SuspiciousPatternOutput(
                            patternId=f"PAT-FIN-{counter:03d}",
                            patternType="FAN_IN",
                            title=f"Fan-In Aggregation into {dest_node}",
                            severity="CRITICAL" if total_vol >= 40000 else "HIGH",
                            confidenceScore=round(min(0.80 + (len(unique_senders) * 0.03), 0.96), 2),
                            involvedAccounts=list(unique_senders) + [dest_node],
                            involvedDevices=devices,
                            involvedTransactions=tx_ids,
                            timeWindow=TimeWindow(
                                start=start_time,
                                end=actual_end,
                                durationHours=duration_hrs
                            ),
                            metrics={
                                "uniqueSenderCount": len(unique_senders),
                                "totalAggregatedVolume": total_vol,
                                "targetAccount": dest_node,
                                "averageTransferAmount": round(total_vol / len(window_edges), 2)
                            },
                            humanExplanation=(
                                f"Account '{dest_node}' aggregated ${total_vol:,.2f} from {len(unique_senders)} "
                                f"distinct accounts within {duration_hrs} hours, exhibiting deposit structuring / smurfing aggregation."
                            ),
                            evidenceReferences=[f"{len(unique_senders)} feeder accounts aggregated into {dest_node}"]
                        ))
                        # Advance outer loop past this detected cluster
                        break

        return patterns
