import { api, fetchApi } from './client';

export interface ObservedFact {
  factId: string;
  category: string;
  statement: string;
  evidenceReferences: string[];
}

export interface SystemInference {
  inferenceId: string;
  typology: string;
  statement: string;
  confidenceScore: number;
  supportingRuleIds: string[];
  regulatoryBasis: string;
}

export interface SARNarrative {
  subjectInformation: string;
  summaryOfSuspiciousActivity: string;
  chronologicalNarrative: string;
  dispositionAndRecommendations: string;
  fullNarrativeText: string;
}

export interface AISummaryResponse {
  targetAccountId: string;
  caseId?: string;
  executiveSummary: string;
  observedFacts: ObservedFact[];
  systemInferences: SystemInference[];
  sarNarrative: SARNarrative;
  recommendedActions: string[];
  riskLevel: string;
  confidenceAssessment: string;
  modelUsed: string;
  generatedAt: string;
  guardrailStatus: string;
}

export interface GenerateSummaryPayload {
  targetAccountId: string;
  caseId?: string;
  investigatorNotes?: string;
}

export async function generateAISummary(payload: GenerateSummaryPayload): Promise<AISummaryResponse> {
  return fetchApi<AISummaryResponse>(api.post('/ai/summary', payload));
}

export async function attachAISummaryToCase(caseId: string, summary: AISummaryResponse): Promise<any> {
  return fetchApi<any>(api.post(`/ai/cases/${caseId}/attach`, { summary }));
}
