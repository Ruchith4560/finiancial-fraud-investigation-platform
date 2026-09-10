from typing import List, Tuple, Dict
from app.schemas.risk import TransactionInput
from app.schemas.patterns import SuspiciousPatternOutput
from app.graph.builder import FinancialGraphBuilder
from app.graph.patterns.rapid_movement import RapidMovementDetector
from app.graph.patterns.fan_in import FanInDetector
from app.graph.patterns.fan_out import FanOutDetector
from app.graph.patterns.circular_transfers import CircularTransferDetector
from app.graph.patterns.shared_identifiers import SharedIdentifierDetector

class SuspiciousPatternEngine:
    @staticmethod
    def detect_all(transactions: List[TransactionInput]) -> Tuple[List[SuspiciousPatternOutput], Dict[str, int]]:
        """
        Executes all 5 Suspicious Pattern Detectors:
        1. Rapid Fund Movement
        2. Fan-In Smurfing
        3. Fan-Out Dispersion
        4. Circular Transfers
        5. Shared Identifier Networks
        """
        G = FinancialGraphBuilder.build_transaction_graph(transactions)
        device_map = FinancialGraphBuilder.build_device_bipartite_mapping(transactions)

        all_patterns: List[SuspiciousPatternOutput] = []

        # 1. Rapid Fund Movement
        p1 = RapidMovementDetector.detect(G)
        all_patterns.extend(p1)

        # 2. Fan-In Smurfing
        p2 = FanInDetector.detect(G)
        all_patterns.extend(p2)

        # 3. Fan-Out Dispersion
        p3 = FanOutDetector.detect(G)
        all_patterns.extend(p3)

        # 4. Circular Transfers
        p4 = CircularTransferDetector.detect(G)
        all_patterns.extend(p4)

        # 5. Shared Identifier Networks
        p5 = SharedIdentifierDetector.detect(transactions, device_map)
        all_patterns.extend(p5)

        # Sort by severity (CRITICAL first, then HIGH, then MEDIUM)
        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
        all_patterns.sort(key=lambda p: (severity_order.get(p.severity, 4), -p.confidenceScore))

        summary: Dict[str, int] = {
            "RAPID_MOVEMENT": len(p1),
            "FAN_IN": len(p2),
            "FAN_OUT": len(p3),
            "CIRCULAR_TRANSFER": len(p4),
            "SHARED_IDENTIFIER": len(p5),
        }

        return all_patterns, summary
