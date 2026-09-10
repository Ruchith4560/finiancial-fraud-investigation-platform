import networkx as nx
from typing import List, Dict, Set
from app.schemas.risk import TransactionInput

class FinancialGraphBuilder:
    @staticmethod
    def build_transaction_graph(transactions: List[TransactionInput]) -> nx.MultiDiGraph:
        """
        Builds a directed multigraph from transactions.
        Nodes: Account IDs
        Edges: Directed financial transfers with temporal and monetary attributes.
        """
        G = nx.MultiDiGraph()

        for tx in transactions:
            sender = tx.senderAccountId
            receiver = tx.receiverAccountId

            if not G.has_node(sender):
                G.add_node(sender, type="account", label=sender)
            if not G.has_node(receiver):
                G.add_node(receiver, type="account", label=receiver)

            G.add_edge(
                sender,
                receiver,
                transactionId=tx.transactionId,
                amount=tx.amount,
                timestamp=tx.timestamp,
                transactionType=tx.transactionType,
                deviceId=tx.deviceId,
                ipAddress=tx.ipAddress
            )

        return G

    @staticmethod
    def build_device_bipartite_mapping(transactions: List[TransactionInput]) -> Dict[str, Set[str]]:
        """
        Extracts device-to-accounts bipartite mapping.
        Returns: { device_id: set(account_ids) }
        """
        device_map: Dict[str, Set[str]] = {}

        for tx in transactions:
            dev = (tx.deviceId or "").strip()
            if dev and dev != "Not Recorded" and dev != "unknown":
                if dev not in device_map:
                    device_map[dev] = set()
                device_map[dev].add(tx.senderAccountId)

        return device_map
