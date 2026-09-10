import networkx as nx
from typing import List
from datetime import timedelta
from app.schemas.patterns import SuspiciousPatternOutput, TimeWindow

class RapidMovementDetector:
    @staticmethod
    def detect(G: nx.MultiDiGraph, max_hours: float = 2.0, min_ratio: float = 0.75, min_amount: float = 5000.0) -> List[SuspiciousPatternOutput]:
        """
        Detects money mule pass-throughs: Account B receives funds from A and quickly transfers >= 75% out to C within 2 hours.
        """
        patterns: List[SuspiciousPatternOutput] = []
        counter = 0

        for mule_node in G.nodes():
            in_edges = G.in_edges(mule_node, data=True)
            out_edges = G.out_edges(mule_node, data=True)

            if not in_edges or not out_edges:
                continue

            for u_in, _, data_in in in_edges:
                amt_in = data_in["amount"]
                time_in = data_in["timestamp"]

                if amt_in < min_amount:
                    continue

                for _, v_out, data_out in out_edges:
                    if v_out == u_in:
                        continue # Exclude immediate bounce back (handled by cycles)

                    amt_out = data_out["amount"]
                    time_out = data_out["timestamp"]

                    # Check temporal sequence
                    if time_out > time_in:
                        diff = time_out - time_in
                        if diff <= timedelta(hours=max_hours):
                            pass_ratio = amt_out / amt_in
                            if pass_ratio >= min_ratio:
                                counter += 1
                                duration_mins = round(diff.total_seconds() / 60.0, 1)

                                patterns.append(SuspiciousPatternOutput(
                                    patternId=f"PAT-RPM-{counter:03d}",
                                    patternType="RAPID_MOVEMENT",
                                    title=f"Rapid Fund Pass-Through via {mule_node}",
                                    severity="CRITICAL" if amt_in >= 20000 else "HIGH",
                                    confidenceScore=round(min(0.85 + (pass_ratio * 0.1), 0.98), 2),
                                    involvedAccounts=[u_in, mule_node, v_out],
                                    involvedDevices=[d for d in [data_in.get("deviceId"), data_out.get("deviceId")] if d],
                                    involvedTransactions=[data_in["transactionId"], data_out["transactionId"]],
                                    timeWindow=TimeWindow(
                                        start=time_in,
                                        end=time_out,
                                        durationHours=round(diff.total_seconds() / 3600.0, 2)
                                    ),
                                    metrics={
                                        "inflowAmount": amt_in,
                                        "outflowAmount": amt_out,
                                        "passThroughRatio": round(pass_ratio * 100, 1),
                                        "velocityMinutes": duration_mins
                                    },
                                    humanExplanation=(
                                        f"Account '{mule_node}' received ${amt_in:,.2f} from '{u_in}' "
                                        f"and transferred ${amt_out:,.2f} ({pass_ratio*100:.1f}%) to '{v_out}' "
                                        f"within {duration_mins} minutes, exhibiting classic layering mule behavior."
                                    ),
                                    evidenceReferences=[
                                        f"TX: {data_in['transactionId']} (${amt_in:,.2f})",
                                        f"TX: {data_out['transactionId']} (${amt_out:,.2f})"
                                    ]
                                ))

        return patterns
