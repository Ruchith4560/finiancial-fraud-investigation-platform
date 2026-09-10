import { Transaction } from '../models/Transaction';
import { PythonClient, PythonPatternOutput } from './pythonClient';

export interface PatternFilterOptions {
  accountId?: string;
  patternType?: string;
  limit?: number;
}

export class PatternService {
  /**
   * Evaluates transactions in MongoDB against all 5 Graph Suspicious Pattern Detectors.
   * Can optionally filter for patterns involving a specific account.
   */
  static async getDetectedPatterns(options: PatternFilterOptions = {}) {
    const limit = Math.min(Math.max(options.limit || 1000, 10), 5000);
    const transactions = await Transaction.find().sort({ timestamp: -1 }).limit(limit).lean();

    if (transactions.length === 0) {
      return {
        totalPatternsDetected: 0,
        patterns: [],
        summaryByType: {
          RAPID_MOVEMENT: 0,
          FAN_IN: 0,
          FAN_OUT: 0,
          CIRCULAR_TRANSFER: 0,
          SHARED_IDENTIFIER: 0,
        },
      };
    }

    const result = await PythonClient.analyzePatterns(transactions as any);
    let filteredPatterns = result.patterns;

    if (options.accountId) {
      const target = options.accountId.toLowerCase();
      filteredPatterns = filteredPatterns.filter((p) =>
        p.involvedAccounts.some((acc) => acc.toLowerCase().includes(target))
      );
    }

    if (options.patternType && options.patternType !== 'ALL') {
      filteredPatterns = filteredPatterns.filter((p) => p.patternType === options.patternType);
    }

    return {
      totalPatternsDetected: filteredPatterns.length,
      patterns: filteredPatterns,
      summaryByType: result.summaryByType,
    };
  }
}
