import networkx as nx
from typing import List, Tuple
from datetime import timedelta
from app.schemas.patterns import SuspiciousPatternOutput, TimeWindow

class CircularTransferDetector:
    @staticmethod
    def detect(G: nx.MultiDiGraph, min_hops: int = 3, max_hops: int = 5, max_cycle_hours: float = 72.0) -> List[SuspiciousPatternOutput]:
        """
        Detects Circular Transfers / Wash Trading: Directed cycles of length 3 to 5 where funds flow sequentially in temporal order.
        """
        patterns: List[SuspiciousPatternOutput] = []
        # Convert MultiDiGraph to simple DiGraph to find simple cycles
        simple_G = nx.DiGraph(G)
        
        try:
            raw_cycles = list(nx.simple_cycles(simple_G))
        except Exception:
            return []

        # Filter cycles by hop length
        filtered_cycles = [c for c in raw_cycles if min_hops <= len(c) <= max_hops]
        counter = 0

        for cycle in filtered_cycles:
            k = len(cycle)
            # Find the best sequential edge sequence along this cycle
            valid_cycle = CircularTransferDetector._validate_temporal_cycle(G, cycle, max_cycle_hours)
            if valid_cycle:
                counter += 1
                edges, start_t, end_t, avg_amt, ordered_cycle = valid_cycle
                tx_ids = [e["transactionId"] for e in edges]
                devices = list({e.get("deviceId") for e in edges if e.get("deviceId")})
                cycle_path_str = " -> ".join(ordered_cycle + [ordered_cycle[0]])
                duration_hrs = round((end_t - start_t).total_seconds() / 3600.0, 2)

                patterns.append(SuspiciousPatternOutput(
                    patternId=f"PAT-CYC-{counter:03d}",
                    patternType="CIRCULAR_TRANSFER",
                    title=f"{k}-Hop Circular Wash-Trading Ring",
                    severity="CRITICAL",
                    confidenceScore=0.95,
                    involvedAccounts=ordered_cycle,
                    involvedDevices=devices,
                    involvedTransactions=tx_ids,
                    timeWindow=TimeWindow(
                        start=start_t,
                        end=end_t,
                        durationHours=duration_hrs
                    ),
                    metrics={
                        "cycleLength": k,
                        "cyclePath": cycle_path_str,
                        "averageTransferAmount": round(avg_amt, 2),
                        "durationHours": duration_hrs
                    },
                    humanExplanation=(
                        f"Detected a {k}-node circular transaction cycle: {cycle_path_str}. "
                        f"Funds circled back to the originator within {duration_hrs} hours with average volume ${avg_amt:,.2f}, indicating round-tripping or wash trading."
                    ),
                    evidenceReferences=[f"Cycle: {cycle_path_str} in {duration_hrs}h"]
                ))

        return patterns

    @staticmethod
    def _validate_temporal_cycle(G: nx.MultiDiGraph, cycle: List[str], max_cycle_hours: float):
        k = len(cycle)
        # A cycle can begin at any vertex temporally; evaluate all k rotations
        for shift in range(k):
            rotated = cycle[shift:] + cycle[:shift]
            res = CircularTransferDetector._check_single_rotation(G, rotated, max_cycle_hours)
            if res:
                return res
        return None

    @staticmethod
    def _check_single_rotation(G: nx.MultiDiGraph, cycle: List[str], max_cycle_hours: float):
        k = len(cycle)
        edge_candidates = []

        for i in range(k):
            u = cycle[i]
            v = cycle[(i + 1) % k]
            available_edges = [data for u_node, v_node, data in G.out_edges(u, data=True) if v_node == v]
            if not available_edges:
                return None
            edge_candidates.append(available_edges)

        # Look for a valid forward sequence: t_0 < t_1 < ... < t_{k-1}
        for first_e in edge_candidates[0]:
            curr_seq = [first_e]
            curr_time = first_e["timestamp"]
            valid = True

            for step in range(1, k):
                next_edges = [e for e in edge_candidates[step] if e["timestamp"] > curr_time]
                if not next_edges:
                    valid = False
                    break
                best_next = min(next_edges, key=lambda x: x["timestamp"])
                curr_seq.append(best_next)
                curr_time = best_next["timestamp"]

            if valid and len(curr_seq) == k:
                start_t = curr_seq[0]["timestamp"]
                end_t = curr_seq[-1]["timestamp"]
                if (end_t - start_t) <= timedelta(hours=max_cycle_hours):
                    avg_amt = sum(e["amount"] for e in curr_seq) / k
                    return curr_seq, start_t, end_t, avg_amt, cycle

        return None
