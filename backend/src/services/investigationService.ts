import { Transaction } from '../models/Transaction';
import { Alert, IRuleTrigger } from '../models/Alert';
import { GraphService } from './graphService';
import { PatternService } from './patternService';
import { SubgraphResponse, PythonPatternOutput } from './pythonClient';
import { AppError } from '../middleware/errorHandler';

export interface TimelineEvent {
  transactionId: string;
  direction: 'INCOMING' | 'OUTGOING';
  counterparty: string;
  amount: number;
  currency: string;
  timestamp: Date;
  transactionType: string;
  deviceId?: string;
  ipAddress?: string;
  isFlagged: boolean;
  riskScore: number;
  riskLevel: string;
  riskFactors?: any[];
}

export interface InvestigationDossier {
  targetAccountId: string;
  summary: {
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    mlAnomalyScore: number;
    totalInflow: number;
    totalOutflow: number;
    netFlow: number;
    transactionCount: number;
    alertCount: number;
    patternCount: number;
    isFlagged: boolean;
  };
  whyFlagged: {
    ruleTriggers: IRuleTrigger[];
    mlScore: number;
    riskScore: number;
    riskLevel: string;
  };
  patterns: PythonPatternOutput[];
  timeline: TimelineEvent[];
  graph: SubgraphResponse;
}

export class InvestigationService {
  /**
   * Assembles a comprehensive forensic investigation dossier for any target account.
   * Merges transaction timeline, why-flagged rules, ML anomaly scores, graph patterns, and ego-network.
   */
  static async getDossier(targetAccountId: string): Promise<InvestigationDossier> {
    const root = (targetAccountId || '').trim();
    if (!root) {
      throw new AppError('targetAccountId is required for dossier assembly', 400, 'INVALID_ACCOUNT_ID');
    }

    // 1. Fetch all transactions involving this account
    const rawTxs = await Transaction.find({
      $or: [{ senderAccountId: root }, { receiverAccountId: root }],
    })
      .sort({ timestamp: -1 })
      .lean();

    // 2. Fetch all alerts for these transactions or this primary account
    const txIds = rawTxs.map((t) => t.transactionId);
    const alerts = await Alert.find({
      $or: [
        { primaryAccountId: root },
        { relatedAccountIds: root },
        { transactionId: { $in: txIds } },
      ],
    }).lean();

    // 3. Concurrently fetch relationship graph and suspicious patterns
    const [graph, patternsData] = await Promise.all([
      GraphService.getSubgraph({ rootAccountId: root, hops: 2, includeDevices: true }),
      PatternService.getDetectedPatterns({ accountId: root, limit: 1000 }),
    ]);

    // 4. Calculate inflow, outflow, and net volumes
    let totalInflow = 0;
    let totalOutflow = 0;
    let maxRiskScore = rawTxs.length === 0 ? 0 : 15;
    let maxMlScore = rawTxs.length === 0 ? 0.0 : 0.05;
    const allRuleTriggersMap = new Map<string, IRuleTrigger>();

    const timeline: TimelineEvent[] = rawTxs.map((tx) => {
      const isOutgoing = tx.senderAccountId === root;
      const amount = tx.amount || 0;

      if (isOutgoing) {
        totalOutflow += amount;
      } else {
        totalInflow += amount;
      }

      if ((tx.riskScore || 0) > maxRiskScore) {
        maxRiskScore = tx.riskScore!;
      }

      if (tx.riskFactors && tx.riskFactors.length > 0) {
        tx.riskFactors.forEach((rf: any) => {
          allRuleTriggersMap.set(rf.ruleId, {
            ruleId: rf.ruleId,
            ruleName: rf.ruleName,
            description: rf.description,
            severity: rf.severity || 'HIGH',
            scoreContribution: rf.scoreContribution || 50,
          });
        });
      }

      return {
        transactionId: tx.transactionId,
        direction: isOutgoing ? 'OUTGOING' : 'INCOMING',
        counterparty: isOutgoing ? tx.receiverAccountId : tx.senderAccountId,
        amount,
        currency: tx.currency || 'USD',
        timestamp: tx.timestamp,
        transactionType: tx.transactionType || 'TRANSFER',
        deviceId: tx.deviceId,
        ipAddress: tx.ipAddress,
        isFlagged: tx.isFlagged || amount >= 10000 || (amount >= 9000 && amount < 10000),
        riskScore: tx.riskScore || (amount >= 10000 ? 65 : 15),
        riskLevel: tx.riskLevel || (amount >= 10000 ? 'HIGH' : 'LOW'),
        riskFactors: tx.riskFactors,
      };
    });

    // Merge alert rule triggers
    alerts.forEach((alt) => {
      if (alt.riskScore > maxRiskScore) {
        maxRiskScore = alt.riskScore;
      }
      if (alt.mlScore && alt.mlScore > maxMlScore) {
        maxMlScore = alt.mlScore;
      }
      if (alt.ruleTriggers) {
        alt.ruleTriggers.forEach((rt) => {
          allRuleTriggersMap.set(rt.ruleId, rt);
        });
      }
    });

    // Determine overall risk tier
    let riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (maxRiskScore >= 75) riskTier = 'CRITICAL';
    else if (maxRiskScore >= 50) riskTier = 'HIGH';
    else if (maxRiskScore >= 25) riskTier = 'MEDIUM';

    return {
      targetAccountId: root,
      summary: {
        riskScore: maxRiskScore,
        riskLevel: riskTier,
        mlAnomalyScore: round(maxMlScore, 2),
        totalInflow: round(totalInflow, 2),
        totalOutflow: round(totalOutflow, 2),
        netFlow: round(totalInflow - totalOutflow, 2),
        transactionCount: rawTxs.length,
        alertCount: alerts.length,
        patternCount: patternsData.patterns.length,
        isFlagged: maxRiskScore >= 50 || alerts.length > 0,
      },
      whyFlagged: {
        ruleTriggers: Array.from(allRuleTriggersMap.values()),
        mlScore: round(maxMlScore, 2),
        riskScore: maxRiskScore,
        riskLevel: riskTier,
      },
      patterns: patternsData.patterns,
      timeline,
      graph,
    };
  }
}

function round(val: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
