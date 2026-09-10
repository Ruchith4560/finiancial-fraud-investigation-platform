import type { SubgraphResponse } from './graph';
import type { IRuleTrigger } from './index';

export interface TimelineEvent {
  transactionId: string;
  direction: 'INCOMING' | 'OUTGOING';
  counterparty: string;
  amount: number;
  currency: string;
  timestamp: string;
  transactionType: string;
  deviceId?: string;
  ipAddress?: string;
  isFlagged: boolean;
  riskScore: number;
  riskLevel: string;
  riskFactors?: IRuleTrigger[];
}

export interface InvestigationDossierSummary {
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
}

export interface InvestigationDossier {
  targetAccountId: string;
  summary: InvestigationDossierSummary;
  whyFlagged: {
    ruleTriggers: IRuleTrigger[];
    mlScore: number;
    riskScore: number;
    riskLevel: string;
  };
  patterns: {
    patternId: string;
    patternType: string;
    title: string;
    severity: string;
    confidenceScore: number;
    involvedAccounts: string[];
    involvedDevices: string[];
    involvedTransactions: string[];
    timeWindow: {
      start: string;
      end: string;
      durationHours: number;
    };
    metrics: Record<string, any>;
    humanExplanation: string;
    evidenceReferences: string[];
  }[];
  timeline: TimelineEvent[];
  graph: SubgraphResponse;
}
