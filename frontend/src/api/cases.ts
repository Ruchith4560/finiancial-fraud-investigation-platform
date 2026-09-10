import { api, fetchApi } from './client';
import type { CaseRecord, CaseStatus, CasePriority } from '../types';

export interface CaseFilterParams {
  status?: string;
  priority?: string;
  search?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CaseListResponse {
  cases: CaseRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CaseStatsResponse {
  totalCases: number;
  statuses: Record<string, number>;
  priorities: Record<string, number>;
}

export interface CreateCasePayload {
  title: string;
  description?: string;
  primaryAccountId: string;
  priority?: CasePriority;
  assignedInvestigatorId?: string;
  assignedInvestigatorName?: string;
  linkedAlertIds?: string[];
  initialNotes?: string;
}

export async function fetchCases(params: CaseFilterParams = {}): Promise<CaseListResponse> {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'ALL') query.set('status', params.status);
  if (params.priority && params.priority !== 'ALL') query.set('priority', params.priority);
  if (params.search) query.set('search', params.search);
  if (params.assignedTo) query.set('assignedTo', params.assignedTo);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);

  return fetchApi<CaseListResponse>(api.get(`/cases?${query.toString()}`));
}

export async function fetchCaseById(id: string): Promise<CaseRecord> {
  return fetchApi<CaseRecord>(api.get(`/cases/${id}`));
}

export async function createCase(payload: CreateCasePayload): Promise<CaseRecord> {
  return fetchApi<CaseRecord>(api.post('/cases', payload));
}

export async function updateCaseStatus(id: string, status: CaseStatus, reason?: string): Promise<CaseRecord> {
  return fetchApi<CaseRecord>(api.patch(`/cases/${id}/status`, { status, reason }));
}

export async function assignCaseInvestigator(id: string, investigatorId: string, investigatorName: string): Promise<CaseRecord> {
  return fetchApi<CaseRecord>(api.patch(`/cases/${id}/assign`, { investigatorId, investigatorName }));
}

export async function fetchCaseStats(): Promise<CaseStatsResponse> {
  return fetchApi<CaseStatsResponse>(api.get('/cases/stats'));
}
