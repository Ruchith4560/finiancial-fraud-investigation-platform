import networkx as nx
from typing import List, Set, Dict
from collections import deque
from app.schemas.risk import TransactionInput
from app.schemas.graph import GraphNode, GraphEdge, GraphMetrics, SubgraphResponse

class SubgraphExtractor:
    @staticmethod
    def extract_ego_network(
        root_account_id: str,
        transactions: List[TransactionInput],
        max_hops: int = 2,
        max_nodes: int = 100,
        include_devices: bool = True
    ) -> SubgraphResponse:
        """
        Extracts a k-hop directed ego-network centered around root_account_id from transactions.
        Includes transaction amounts, temporal edge attributes, and optional shared device nodes.
        """
        # 1. Build adjacency maps for fast BFS traversal
        adj_forward: Dict[str, Set[str]] = {}
        adj_backward: Dict[str, Set[str]] = {}
        all_accounts: Set[str] = set()

        for tx in transactions:
            s, r = tx.senderAccountId, tx.receiverAccountId
            all_accounts.add(s)
            all_accounts.add(r)
            adj_forward.setdefault(s, set()).add(r)
            adj_backward.setdefault(r, set()).add(s)

        # 2. BFS ego expansion from root_account_id
        selected_accounts: Set[str] = set()
        queue = deque([(root_account_id, 0)])
        selected_accounts.add(root_account_id)

        while queue and len(selected_accounts) < max_nodes:
            curr_acc, depth = queue.popleft()
            if depth >= max_hops:
                continue

            # Inbound + Outbound neighbors
            neighbors = adj_forward.get(curr_acc, set()) | adj_backward.get(curr_acc, set())
            for n in sorted(neighbors):
                if n not in selected_accounts:
                    selected_accounts.add(n)
                    queue.append((n, depth + 1))
                    if len(selected_accounts) >= max_nodes:
                        break

        # 3. Filter relevant transactions touching selected accounts
        relevant_txs: List[TransactionInput] = [
            tx for tx in transactions
            if tx.senderAccountId in selected_accounts and tx.receiverAccountId in selected_accounts
        ]

        # If sparse, also include 1-hop edge to outer nodes
        if len(relevant_txs) < 3:
            relevant_txs = [
                tx for tx in transactions
                if tx.senderAccountId in selected_accounts or tx.receiverAccountId in selected_accounts
            ]
            for tx in relevant_txs:
                selected_accounts.add(tx.senderAccountId)
                selected_accounts.add(tx.receiverAccountId)

        # 4. Aggregate node statistics
        inflow_map: Dict[str, float] = {acc: 0.0 for acc in selected_accounts}
        outflow_map: Dict[str, float] = {acc: 0.0 for acc in selected_accounts}
        tx_count_map: Dict[str, int] = {acc: 0.0 for acc in selected_accounts}

        edges: List[GraphEdge] = []
        device_to_accounts: Dict[str, Set[str]] = {}

        for tx in relevant_txs:
            s = tx.senderAccountId
            r = tx.receiverAccountId
            amt = tx.amount

            if s in outflow_map:
                outflow_map[s] += amt
                tx_count_map[s] = tx_count_map.get(s, 0) + 1
            if r in inflow_map:
                inflow_map[r] += amt
                tx_count_map[r] = tx_count_map.get(r, 0) + 1

            is_flagged = amt >= 10000 or (amt >= 9000 and amt < 10000)

            edges.append(GraphEdge(
                id=tx.transactionId,
                source=s,
                target=r,
                type="TRANSACTION",
                amount=amt,
                timestamp=tx.timestamp,
                transactionType=tx.transactionType or "TRANSFER",
                label=f"${amt:,.0f}",
                isFlagged=is_flagged,
                metadata={
                    "deviceId": tx.deviceId,
                    "ipAddress": tx.ipAddress,
                    "timestamp": tx.timestamp.isoformat() if tx.timestamp else None
                }
            ))

            if include_devices and tx.deviceId and tx.deviceId.strip():
                dev_id = tx.deviceId.strip()
                device_to_accounts.setdefault(dev_id, set()).add(s)

        # 5. Build GraphNodes for accounts
        nodes: List[GraphNode] = []
        for acc in selected_accounts:
            in_amt = inflow_map.get(acc, 0.0)
            out_amt = outflow_map.get(acc, 0.0)
            cnt = tx_count_map.get(acc, 0)

            # Compute preliminary risk score based on volume & activity
            score = 10.0
            if (in_amt + out_amt) >= 25000:
                score += 40.0
            elif (in_amt + out_amt) >= 10000:
                score += 25.0

            # High turnover / mule pass-through indicator
            if in_amt > 5000 and out_amt > 5000:
                ratio = min(in_amt, out_amt) / max(in_amt, out_amt)
                if ratio >= 0.7:
                    score += 30.0

            score = min(score, 98.0)
            if score >= 75:
                level = "CRITICAL"
            elif score >= 50:
                level = "HIGH"
            elif score >= 25:
                level = "MEDIUM"
            else:
                level = "LOW"

            nodes.append(GraphNode(
                id=acc,
                label=acc,
                type="ACCOUNT",
                riskScore=round(score, 1),
                riskLevel=level,
                inflow=round(in_amt, 2),
                outflow=round(out_amt, 2),
                transactionCount=cnt,
                isRoot=(acc == root_account_id),
                metadata={
                    "totalVolume": round(in_amt + out_amt, 2),
                    "netFlow": round(in_amt - out_amt, 2)
                }
            ))

        # 6. Add Device nodes & edges if include_devices
        device_count = 0
        if include_devices:
            for dev_id, acc_set in device_to_accounts.items():
                # Only include device nodes that are shared or touch our root
                if len(acc_set) >= 2 or root_account_id in acc_set:
                    device_count += 1
                    nodes.append(GraphNode(
                        id=dev_id,
                        label=dev_id[:16] + ("..." if len(dev_id) > 16 else ""),
                        type="DEVICE",
                        riskScore=85.0 if len(acc_set) >= 3 else (60.0 if len(acc_set) >= 2 else 20.0),
                        riskLevel="CRITICAL" if len(acc_set) >= 3 else ("HIGH" if len(acc_set) >= 2 else "LOW"),
                        inflow=0.0,
                        outflow=0.0,
                        transactionCount=len(acc_set),
                        isRoot=False,
                        metadata={
                            "sharedAccountCount": len(acc_set),
                            "accounts": list(acc_set)
                        }
                    ))

                    for acc in acc_set:
                        if acc in selected_accounts:
                            edges.append(GraphEdge(
                                id=f"EDGE-DEV-{dev_id}-{acc}",
                                source=acc,
                                target=dev_id,
                                type="SHARED_DEVICE",
                                amount=None,
                                timestamp=None,
                                transactionType="DEVICE_LINK",
                                label="Linked Device",
                                isFlagged=len(acc_set) >= 2,
                                metadata={"deviceId": dev_id}
                            ))

        # 7. Compute graph metrics using NetworkX
        nx_g = nx.Graph()
        for n in nodes:
            nx_g.add_node(n.id)
        for e in edges:
            nx_g.add_edge(e.source, e.target)

        density = nx.density(nx_g) if nx_g.number_of_nodes() > 1 else 0.0
        degrees = [deg for _, deg in nx_g.degree()]
        max_deg = max(degrees) if degrees else 0

        metrics = GraphMetrics(
            totalNodes=len(nodes),
            totalEdges=len(edges),
            accountCount=len(selected_accounts),
            deviceCount=device_count,
            density=round(density, 4),
            maxDegree=max_deg,
            rootAccountId=root_account_id
        )

        return SubgraphResponse(
            rootAccountId=root_account_id,
            nodes=nodes,
            edges=edges,
            metrics=metrics
        )
