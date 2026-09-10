import { InvestigationService } from './investigationService';
import { PythonClient, PythonSummaryRequest, PythonSummaryResponse } from './pythonClient';
import { Case } from '../models/Case';
import { AppError } from '../middleware/errorHandler';

export class AIService {
  /**
   * Generates a zero-hallucination AI investigation summary and FinCEN SAR narrative
   * from the account's assembled forensic dossier.
   */
  static async generateSummary(
    targetAccountId: string,
    caseId?: string,
    investigatorNotes?: string
  ): Promise<PythonSummaryResponse> {
    const accountId = (targetAccountId || '').trim();
    if (!accountId) {
      throw new AppError('targetAccountId is required for AI summary generation', 400, 'INVALID_ACCOUNT_ID');
    }

    // 1. Fetch complete forensic dossier
    const dossier = await InvestigationService.getDossier(accountId);

    // 2. Format payload for Python Intelligence Service / Synthesizer
    const payload: PythonSummaryRequest = {
      targetAccountId: accountId,
      caseId: caseId?.trim() || undefined,
      investigatorNotes: investigatorNotes?.trim() || undefined,
      transactions: dossier.timeline.map((t) => ({
        transactionId: t.transactionId,
        senderAccountId: t.direction === 'OUTGOING' ? accountId : t.counterparty,
        receiverAccountId: t.direction === 'INCOMING' ? accountId : t.counterparty,
        amount: t.amount,
        timestamp: t.timestamp instanceof Date ? t.timestamp.toISOString() : t.timestamp,
        transactionType: t.transactionType || 'TRANSFER',
        deviceId: t.deviceId,
        ipAddress: t.ipAddress,
      })),
      detectedPatterns: dossier.patterns,
      riskFactors: dossier.whyFlagged.ruleTriggers,
      mlAnomalyScore: dossier.whyFlagged.mlScore,
    };

    // 3. Generate summary via Python service (with local fallback)
    const summary = await PythonClient.generateSummary(payload);

    // 4. If caseId was passed, automatically attach to the Case document and append an audit event
    if (caseId) {
      const caseDoc = await Case.findOne({ caseId: caseId.trim() });
      if (caseDoc) {
        const nextVersion = (caseDoc.aiSummary?.version || 0) + 1;
        caseDoc.aiSummary = {
          content: summary.executiveSummary,
          sarNarrative: summary.sarNarrative.fullNarrativeText,
          observedFacts: summary.observedFacts.map((f) => f.statement),
          systemInferences: summary.systemInferences.map((i) => i.statement),
          recommendedActions: summary.recommendedActions,
          modelUsed: summary.modelUsed,
          generatedAt: new Date(),
          version: nextVersion,
        };

        caseDoc.auditEvents.push({
          timestamp: new Date(),
          userId: 'AI_COPILOT',
          userName: 'FraudLens AI Co-Pilot',
          action: 'NOTE_ADDED',
          details: `Generated and attached AI Forensic Summary & FinCEN SAR Narrative (v${nextVersion}).`,
        });

        await caseDoc.save();
      }
    }

    return summary;
  }

  /**
   * Explicitly attaches a generated summary to a Case.
   */
  static async attachSummaryToCase(
    caseId: string,
    summary: PythonSummaryResponse,
    userId: string = 'ANALYST',
    userName: string = 'Investigator'
  ) {
    const caseDoc = await Case.findOne({ caseId: caseId.trim() });
    if (!caseDoc) {
      throw new AppError(`Case not found: ${caseId}`, 404, 'CASE_NOT_FOUND');
    }

    const nextVersion = (caseDoc.aiSummary?.version || 0) + 1;
    caseDoc.aiSummary = {
      content: summary.executiveSummary,
      sarNarrative: summary.sarNarrative.fullNarrativeText,
      observedFacts: summary.observedFacts.map((f) => f.statement),
      systemInferences: summary.systemInferences.map((i) => i.statement),
      recommendedActions: summary.recommendedActions,
      modelUsed: summary.modelUsed,
      generatedAt: new Date(),
      version: nextVersion,
    };

    caseDoc.auditEvents.push({
      timestamp: new Date(),
      userId,
      userName,
      action: 'NOTE_ADDED',
      details: `Investigator attached AI Investigation Summary (v${nextVersion}) to formal case evidence snapshot.`,
    });

    await caseDoc.save();
    return caseDoc;
  }
}
