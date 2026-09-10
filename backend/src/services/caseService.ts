import { Case, ICase, CaseStatus, CasePriority, IEvidenceSnapshot } from '../models/Case';
import { Alert } from '../models/Alert';
import { Transaction } from '../models/Transaction';
import { GraphService } from './graphService';
import { PatternService } from './patternService';
import { AppError } from '../middleware/errorHandler';

export interface CreateCaseParams {
  title: string;
  description?: string;
  primaryAccountId: string;
  priority?: CasePriority;
  assignedInvestigatorId?: string;
  assignedInvestigatorName?: string;
  linkedAlertIds?: string[];
  initialNotes?: string;
  userId?: string;
  userName?: string;
}

export interface CaseFilterOptions {
  status?: string;
  priority?: string;
  search?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CaseService {
  /**
   * Creates a formal investigation case and freezes an immutable evidence snapshot
   */
  static async createCase(params: CreateCaseParams): Promise<ICase> {
    const root = (params.primaryAccountId || '').trim();
    if (!root) {
      throw new AppError('primaryAccountId is required to create a case', 400, 'INVALID_ACCOUNT_ID');
    }

    // 1. Generate sequential Case ID: CASE-2026-XXXX
    const year = new Date().getFullYear();
    const caseCount = await Case.countDocuments();
    const caseId = `CASE-${year}-${(caseCount + 1).toString().padStart(4, '0')}`;

    // 2. Fetch live data to freeze into immutable evidence snapshot
    const [txs, alerts, graphData, patternsData] = await Promise.all([
      Transaction.find({
        $or: [{ senderAccountId: root }, { receiverAccountId: root }],
      }).lean(),
      Alert.find({
        $or: [{ primaryAccountId: root }, { relatedAccountIds: root }],
      }).lean(),
      GraphService.getSubgraph({ rootAccountId: root, hops: 2, includeDevices: true }).catch(() => null),
      PatternService.getDetectedPatterns({ accountId: root }).catch(() => ({ patterns: [] })),
    ]);

    const flaggedTxs = txs.filter((t) => t.isFlagged || (t.amount || 0) >= 10000);
    const totalFlaggedVol = flaggedTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

    const recordedRuleNames = Array.from(
      new Set(
        alerts.flatMap((a) => (a.ruleTriggers || []).map((r) => r.ruleName))
      )
    );

    const evidenceSnapshot: IEvidenceSnapshot = {
      frozenAt: new Date(),
      frozenBy: params.userName || params.userId || 'Investigator',
      transactionCount: txs.length,
      totalAmountFlagged: totalFlaggedVol,
      riskFactorsRecorded: recordedRuleNames,
      graphTopologySnapshot: {
        nodes: (graphData?.nodes || []).map((n) => ({ id: n.id, label: n.label, type: n.type })),
        edges: (graphData?.edges || []).map((e) => ({
          source: e.source,
          target: e.target,
          amount: e.amount || 0,
          timestamp: e.timestamp,
        })),
      },
      initialNotes: params.initialNotes,
    };

    // 3. Assemble entity IDs
    const relatedAccounts = new Set<string>();
    const relatedDevices = new Set<string>();
    txs.forEach((t) => {
      if (t.senderAccountId) relatedAccounts.add(t.senderAccountId);
      if (t.receiverAccountId) relatedAccounts.add(t.receiverAccountId);
      if (t.deviceId) relatedDevices.add(t.deviceId);
    });

    const newCase = new Case({
      caseId,
      title: params.title || `Investigation: Collusion Ring ${root}`,
      description: params.description || `Case opened regarding suspicious transaction flows for ${root}`,
      status: 'OPEN' as CaseStatus,
      priority: params.priority || 'HIGH',
      primaryAccountId: root,
      assignedInvestigatorId: params.assignedInvestigatorId,
      assignedInvestigatorName: params.assignedInvestigatorName || 'Unassigned',
      linkedAlertIds: params.linkedAlertIds || alerts.map((a) => a.alertId),
      entityIds: {
        accounts: Array.from(relatedAccounts),
        devices: Array.from(relatedDevices),
      },
      transactionIds: txs.map((t) => t.transactionId),
      detectedPatternIds: patternsData.patterns.map((p) => p.patternId),
      evidenceSnapshot,
      auditEvents: [
        {
          timestamp: new Date(),
          userId: params.userId || 'system',
          userName: params.userName || 'Investigator',
          action: 'CASE_CREATED',
          details: `Formal investigation case initiated for ${root} with frozen snapshot of ${txs.length} transactions and ${alerts.length} alerts.`,
        },
      ],
    });

    await newCase.save();

    // 4. Update linked alerts status to CASE_CREATED
    if (newCase.linkedAlertIds.length > 0) {
      await Alert.updateMany(
        { alertId: { $in: newCase.linkedAlertIds } },
        { $set: { status: 'CASE_CREATED', caseId: newCase.caseId } }
      );
    }

    return newCase;
  }

  /**
   * Paginated case retrieval with status and priority filtering
   */
  static async getCases(options: CaseFilterOptions = {}) {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(Math.max(options.limit || 20, 1), 100);
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

    const query: any = {};

    if (options.status && options.status !== 'ALL') {
      query.status = options.status.toUpperCase();
    }

    if (options.priority && options.priority !== 'ALL') {
      query.priority = options.priority.toUpperCase();
    }

    if (options.assignedTo) {
      query.assignedInvestigatorName = { $regex: options.assignedTo, $options: 'i' };
    }

    if (options.search) {
      const s = options.search.trim();
      query.$or = [
        { caseId: { $regex: s, $options: 'i' } },
        { title: { $regex: s, $options: 'i' } },
        { primaryAccountId: { $regex: s, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [cases, total] = await Promise.all([
      Case.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Case.countDocuments(query),
    ]);

    return {
      cases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieve case details by Case ID
   */
  static async getCaseById(caseId: string): Promise<ICase> {
    const caseDoc = await Case.findOne({
      $or: [{ caseId }, { _id: caseId.match(/^[0-9a-fA-F]{24}$/) ? caseId : null }],
    });

    if (!caseDoc) {
      throw new AppError(`Case '${caseId}' not found`, 404, 'CASE_NOT_FOUND');
    }

    return caseDoc;
  }

  /**
   * Update case workflow status and record audit event
   */
  static async updateStatus(
    caseId: string,
    status: CaseStatus,
    reason: string,
    userId: string = 'system',
    userName: string = 'Investigator'
  ): Promise<ICase> {
    if (!reason || !reason.trim()) {
      throw new AppError('Reason is required for case status transition', 400, 'INVALID_TRANSITION_REASON');
    }

    const caseDoc = await this.getCaseById(caseId);

    const oldStatus = caseDoc.status;
    caseDoc.status = status;

    caseDoc.auditEvents.push({
      timestamp: new Date(),
      userId: userId || 'system',
      userName: userName || 'Investigator',
      action: status === 'ESCALATED' ? 'SAR_ESCALATED' : 'STATUS_UPDATED',
      details: `Status transitioned from ${oldStatus} to ${status}. Reason: ${reason || 'N/A'}`,
    });

    await caseDoc.save();
    return caseDoc;
  }

  /**
   * Assign investigator to case and record audit event
   */
  static async assignInvestigator(
    caseId: string,
    investigatorId: string,
    investigatorName: string,
    userId: string,
    userName: string
  ): Promise<ICase> {
    const caseDoc = await this.getCaseById(caseId);

    const prev = caseDoc.assignedInvestigatorName;
    caseDoc.assignedInvestigatorId = investigatorId;
    caseDoc.assignedInvestigatorName = investigatorName;

    caseDoc.auditEvents.push({
      timestamp: new Date(),
      userId: userId || 'system',
      userName: userName || 'Investigator',
      action: 'CASE_CREATED', // or general update
      details: `Reassigned from ${prev} to ${investigatorName}.`,
    });

    await caseDoc.save();
    return caseDoc;
  }

  /**
   * Add investigator note to audit trail
   */
  static async addNote(
    caseId: string,
    note: string,
    userId: string,
    userName: string
  ): Promise<ICase> {
    const caseDoc = await this.getCaseById(caseId);

    caseDoc.auditEvents.push({
      timestamp: new Date(),
      userId: userId || 'system',
      userName: userName || 'Investigator',
      action: 'NOTE_ADDED',
      details: note,
    });

    await caseDoc.save();
    return caseDoc;
  }

  /**
   * Global Case Status and Priority Counters
   */
  static async getCaseStats() {
    const [statusAgg, priorityAgg, total] = await Promise.all([
      Case.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Case.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Case.countDocuments(),
    ]);

    const statuses: Record<string, number> = {
      NEW: 0,
      OPEN: 0,
      UNDER_REVIEW: 0,
      ESCALATED: 0,
      CLOSED: 0,
    };
    statusAgg.forEach((s) => {
      if (s._id) statuses[s._id] = s.count;
    });

    const priorities: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    priorityAgg.forEach((p) => {
      if (p._id) priorities[p._id] = p.count;
    });

    return {
      totalCases: total,
      statuses,
      priorities,
    };
  }
}
