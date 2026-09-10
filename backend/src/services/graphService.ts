import { Transaction } from '../models/Transaction';
import { PythonClient, SubgraphResponse } from './pythonClient';
import { AppError } from '../middleware/errorHandler';

export interface GraphQueryOptions {
  rootAccountId: string;
  hops?: number;
  maxNodes?: number;
  includeDevices?: boolean;
}

export class GraphService {
  /**
   * Retrieves ego-network subgraph around rootAccountId up to k hops
   */
  static async getSubgraph(options: GraphQueryOptions): Promise<SubgraphResponse> {
    const root = (options.rootAccountId || '').trim();
    if (!root) {
      throw new AppError('rootAccountId is required to extract relationship graph', 400, 'INVALID_ROOT_ACCOUNT');
    }

    const hops = Math.min(Math.max(options.hops || 2, 1), 3);
    const maxNodes = Math.min(Math.max(options.maxNodes || 80, 10), 200);

    // 1. First-hop transactions directly involving rootAccountId
    const hop1Txs = await Transaction.find({
      $or: [{ senderAccountId: root }, { receiverAccountId: root }],
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    if (hop1Txs.length === 0) {
      // Check if root exists anywhere, else return single node graph
      return {
        rootAccountId: root,
        nodes: [
          {
            id: root,
            label: root,
            type: 'ACCOUNT',
            riskScore: 10,
            riskLevel: 'LOW',
            inflow: 0,
            outflow: 0,
            transactionCount: 0,
            isRoot: true,
          },
        ],
        edges: [],
        metrics: {
          totalNodes: 1,
          totalEdges: 0,
          accountCount: 1,
          deviceCount: 0,
          density: 0,
          maxDegree: 0,
          rootAccountId: root,
        },
      };
    }

    let allTxs = [...hop1Txs];

    // 2. If hops >= 2, find 1-hop counterparties and retrieve their transactions
    if (hops >= 2) {
      const counterparties = new Set<string>();
      for (const tx of hop1Txs) {
        if (tx.senderAccountId !== root) counterparties.add(tx.senderAccountId);
        if (tx.receiverAccountId !== root) counterparties.add(tx.receiverAccountId);
      }

      if (counterparties.size > 0) {
        const counterpartiesList = Array.from(counterparties).slice(0, 25);
        const hop2Txs = await Transaction.find({
          $or: [
            { senderAccountId: { $in: counterpartiesList } },
            { receiverAccountId: { $in: counterpartiesList } },
          ],
        })
          .sort({ timestamp: -1 })
          .limit(200)
          .lean();

        const seenTxIds = new Set(allTxs.map((t) => t.transactionId));
        for (const tx of hop2Txs) {
          if (!seenTxIds.has(tx.transactionId)) {
            allTxs.push(tx);
            seenTxIds.add(tx.transactionId);
          }
        }
      }
    }

    // 3. Delegate to Python Intelligence Service or local fallback
    return PythonClient.extractSubgraph(root, allTxs as any, {
      maxHops: hops,
      maxNodes,
      includeDevices: options.includeDevices !== false,
    });
  }
}
