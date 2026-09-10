import { Alert, IAlert, AlertSeverity, AlertStatus } from '../models/Alert';
import { Transaction, RiskLevel } from '../models/Transaction';
import { PythonClient } from './pythonClient';
import { AppError } from '../middleware/errorHandler';

export interface AlertFilterOptions {
  severity?: string;
  status?: string;
  accountId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class AlertService {
  /**
   * Evaluates transactions via Python Intelligence Service and synchronizes Alert queue in MongoDB.
   */
  static async syncAlerts(limit = 1000): Promise<{ syncedAlerts: number; totalAnalyzed: number }> {
    const transactions = await Transaction.find().sort({ timestamp: -1 }).limit(limit).lean();
    if (transactions.length === 0) {
      return { syncedAlerts: 0, totalAnalyzed: 0 };
    }

    // Call Python service
    const analysis = await PythonClient.analyzeRisk(transactions as any);

    // 1. Bulk update transactions with risk scores & factors
    const txUpdateOps = analysis.transactions.map((st) => ({
      updateOne: {
        filter: { transactionId: st.transactionId },
        update: {
          $set: {
            riskScore: st.riskScore,
            riskLevel: st.riskLevel as RiskLevel,
            riskFactors: st.ruleTriggers,
            isFlagged: st.isFlagged,
          },
        },
      },
    }));

    if (txUpdateOps.length > 0) {
      await Transaction.bulkWrite(txUpdateOps);
    }

    // 2. Upsert Alerts for flagged items
    const alertOps = analysis.alerts.map((alt) => ({
      updateOne: {
        filter: { transactionId: alt.transactionId },
        update: {
          $set: {
            alertId: alt.alertId,
            primaryAccountId: alt.primaryAccountId,
            relatedAccountIds: alt.relatedAccountIds,
            riskScore: alt.riskScore,
            severity: alt.severity as AlertSeverity,
            ruleTriggers: alt.ruleTriggers,
            mlScore: alt.mlScore,
            detectedPatterns: alt.detectedPatterns,
          },
          $setOnInsert: {
            status: 'NEW' as AlertStatus,
          },
        },
        upsert: true,
      },
    }));

    if (alertOps.length > 0) {
      await Alert.bulkWrite(alertOps);
    }

    return {
      syncedAlerts: analysis.alerts.length,
      totalAnalyzed: analysis.transactions.length,
    };
  }

  /**
   * Prioritized Alert Queue with multi-filtering and pagination
   */
  static async getAlertQueue(options: AlertFilterOptions) {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(Math.max(options.limit || 25, 1), 100);
    const sortBy = options.sortBy || 'riskScore';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

    const query: any = {};

    if (options.severity && options.severity !== 'ALL') {
      query.severity = options.severity.toUpperCase();
    }

    if (options.status && options.status !== 'ALL') {
      query.status = options.status.toUpperCase();
    }

    if (options.accountId) {
      query.$or = [
        { primaryAccountId: { $regex: options.accountId, $options: 'i' } },
        { relatedAccountIds: { $regex: options.accountId, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .sort({ [sortBy]: sortOrder, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(query),
    ]);

    // Enhance alerts with linked transaction amounts and timestamps
    const txIds = alerts.map((a) => a.transactionId);
    const linkedTxs = await Transaction.find(
      { transactionId: { $in: txIds } },
      { transactionId: 1, amount: 1, timestamp: 1, transactionType: 1, deviceId: 1 }
    ).lean();

    const txMap = new Map(linkedTxs.map((t) => [t.transactionId, t]));

    const enrichedAlerts = alerts.map((a) => ({
      ...a,
      transaction: txMap.get(a.transactionId) || null,
    }));

    return {
      alerts: enrichedAlerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Single alert detail with counterparty context and explainability
   */
  static async getAlertById(alertId: string): Promise<any> {
    const alert = await Alert.findOne({
      $or: [{ alertId }, { _id: alertId.match(/^[0-9a-fA-F]{24}$/) ? alertId : null }],
    }).lean();

    if (!alert) {
      throw new AppError(`Alert '${alertId}' not found`, 404, 'ALERT_NOT_FOUND');
    }

    const transaction = await Transaction.findOne({ transactionId: alert.transactionId }).lean();

    return {
      ...alert,
      transaction,
    };
  }

  /**
   * Update alert triage status
   */
  static async updateStatus(alertId: string, status: AlertStatus): Promise<IAlert> {
    const alert = await Alert.findOne({
      $or: [{ alertId }, { _id: alertId.match(/^[0-9a-fA-F]{24}$/) ? alertId : null }],
    });

    if (!alert) {
      throw new AppError(`Alert '${alertId}' not found`, 404, 'ALERT_NOT_FOUND');
    }

    alert.status = status;
    await alert.save();
    return alert;
  }

  /**
   * Alert status & severity metrics for triage counters
   */
  static async getAlertStats() {
    const [severityStats, statusStats] = await Promise.all([
      Alert.aggregate([
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
          },
        },
      ]),
      Alert.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const severities: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    severityStats.forEach((s) => {
      if (s._id) severities[s._id] = s.count;
    });

    const statuses: Record<string, number> = { NEW: 0, IN_REVIEW: 0, CASE_CREATED: 0, DISMISSED: 0 };
    statusStats.forEach((s) => {
      if (s._id) statuses[s._id] = s.count;
    });

    const totalAlerts = await Alert.countDocuments();

    return {
      totalAlerts,
      severities,
      statuses,
    };
  }
}
