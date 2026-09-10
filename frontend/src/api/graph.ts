import { api, fetchApi } from './client';
import type { SubgraphResponse } from '../types/graph';

export interface SubgraphQueryOptions {
  hops?: number;
  maxNodes?: number;
  includeDevices?: boolean;
}

export async function fetchSubgraph(accountId: string, options: SubgraphQueryOptions = {}): Promise<SubgraphResponse> {
  const params = new URLSearchParams({
    accountId,
    hops: String(options.hops || 2),
    maxNodes: String(options.maxNodes || 80),
    includeDevices: String(options.includeDevices !== false),
  });

  return fetchApi<SubgraphResponse>(api.get(`/graph/subgraph?${params.toString()}`));
}

export interface PatternItem {
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
}

export interface PatternListResponse {
  totalPatternsDetected: number;
  patterns: PatternItem[];
  summaryByType: Record<string, number>;
}

export async function fetchPatterns(options: { accountId?: string; patternType?: string } = {}): Promise<PatternListResponse> {
  const params = new URLSearchParams();
  if (options.accountId) params.set('accountId', options.accountId);
  if (options.patternType) params.set('patternType', options.patternType);

  return fetchApi<PatternListResponse>(api.get(`/patterns?${params.toString()}`));
}
