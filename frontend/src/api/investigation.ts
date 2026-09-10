import { api, fetchApi } from './client';
import type { InvestigationDossier } from '../types/investigation';

export async function fetchInvestigationDossier(accountId: string): Promise<InvestigationDossier> {
  const params = new URLSearchParams({ accountId });
  return fetchApi<InvestigationDossier>(api.get(`/investigations/dossier?${params.toString()}`));
}
