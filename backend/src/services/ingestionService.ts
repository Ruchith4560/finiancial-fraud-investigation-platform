import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { Transaction, ITransaction, RiskLevel } from '../models/Transaction';
import { IngestionBatch, IIngestionBatch, IBatchError } from '../models/IngestionBatch';
import { ValidationService, RawTransactionRow, ValidatedTransaction } from './validationService';
import { generateDemoDataset } from '../utils/demoDataGenerator';

export interface IngestionResult {
  batch: IIngestionBatch;
  totalProcessed: number;
  validCount: number;
  invalidCount: number;
  errors: IBatchError[];
}

export class IngestionService {
  /**
   * Process a stream of CSV data, validate rows, deduplicate, and bulk-insert.
   */
  static async processCsvStream(
    stream: Readable,
    filename: string,
    uploadedBy: string
  ): Promise<IngestionResult> {
    const batchId = `BATCH-${Date.now()}`;
    const batch = new IngestionBatch({
      batchId,
      filename,
      uploadedBy,
      status: 'PROCESSING',
    });
    await batch.save();

    const seenIdsInBatch = new Set<string>();
    const validTransactions: ValidatedTransaction[] = [];
    const errors: IBatchError[] = [];
    let rowIndex = 0;

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on('data', (row: RawTransactionRow) => {
          rowIndex++;
          const result = ValidationService.validateRow(row, rowIndex, seenIdsInBatch);
          if (result.valid && result.data) {
            validTransactions.push(result.data);
          } else {
            errors.push(...result.errors);
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    // Check for existing duplicates in the database
    const candidateIds = validTransactions.map((t) => t.transactionId);
    const existingTransactions = await Transaction.find(
      { transactionId: { $in: candidateIds } },
      { transactionId: 1 }
    ).lean();

    const existingIdSet = new Set(existingTransactions.map((t) => t.transactionId));
    const finalTransactionsToInsert: Partial<ITransaction>[] = [];

    for (const tx of validTransactions) {
      if (existingIdSet.has(tx.transactionId)) {
        errors.push({
          row: 0,
          column: 'transaction_id',
          message: `Transaction ID '${tx.transactionId}' already exists in database records`,
          value: tx.transactionId,
        });
      } else {
        // Initial baseline scoring
        let riskScore = 0;
        let riskLevel: RiskLevel = 'LOW';
        const riskFactors = [];

        if (tx.amount >= 10000) {
          riskScore += 35;
          riskFactors.push({
            ruleId: 'RULE-AMOUNT-THRESHOLD',
            ruleName: 'High Value Transaction',
            description: `Transaction amount $${tx.amount.toLocaleString()} meets or exceeds $10,000 CTR reporting threshold`,
            scoreContribution: 35,
          });
        }

        if (riskScore >= 75) riskLevel = 'CRITICAL';
        else if (riskScore >= 50) riskLevel = 'HIGH';
        else if (riskScore >= 25) riskLevel = 'MEDIUM';

        finalTransactionsToInsert.push({
          ...tx,
          riskScore,
          riskLevel,
          riskFactors,
          isFlagged: riskScore >= 50,
          ingestionBatchId: batch._id,
        });
      }
    }

    // Bulk write valid transactions
    if (finalTransactionsToInsert.length > 0) {
      await Transaction.insertMany(finalTransactionsToInsert, { ordered: false });
    }

    // Update batch record
    batch.totalRecords = rowIndex;
    batch.validRecords = finalTransactionsToInsert.length;
    batch.invalidRecords = errors.length;
    batch.validationErrors = errors.slice(0, 100); // Store up to top 100 errors for review
    batch.status = finalTransactionsToInsert.length > 0 ? 'COMPLETED' : 'FAILED';
    batch.completedAt = new Date();
    await batch.save();

    return {
      batch,
      totalProcessed: rowIndex,
      validCount: finalTransactionsToInsert.length,
      invalidCount: errors.length,
      errors,
    };
  }

  /**
   * One-click seeding of the Enterprise Demo Dataset
   */
  static async loadDemoDataset(uploadedBy = 'system.demo'): Promise<IngestionResult> {
    const batchId = `BATCH-DEMO-${Date.now()}`;
    const batch = new IngestionBatch({
      batchId,
      filename: 'enterprise_mule_syndicate_v1.csv',
      uploadedBy,
      status: 'PROCESSING',
    });
    await batch.save();

    const demoTransactions = generateDemoDataset();
    const transactionsToInsert: Partial<ITransaction>[] = demoTransactions.map((tx) => {
      let riskScore = 15;
      let riskLevel: RiskLevel = 'LOW';
      const riskFactors = [];

      // Flag Rapid movement
      if (tx.senderAccountId === 'ACC-MULE-ALPHA' || tx.receiverAccountId === 'ACC-MULE-ALPHA') {
        riskScore = 92;
        riskLevel = 'CRITICAL';
        riskFactors.push({
          ruleId: 'RULE-RAPID-MOVEMENT',
          ruleName: 'Rapid Fund Pass-through',
          description: 'Pass-through velocity under 30 minutes with >95% balance retention',
          scoreContribution: 60,
        });
      }

      // Flag Fan-In / Fan-Out Hub
      if (tx.senderAccountId === 'ACC-HUB-CENTRAL' || tx.receiverAccountId === 'ACC-HUB-CENTRAL') {
        riskScore = 88;
        riskLevel = 'CRITICAL';
        riskFactors.push({
          ruleId: 'RULE-FAN-IN-OUT',
          ruleName: 'High-Degree Mule Aggregation Hub',
          description: 'Disproportionate in/out degree within 24h window',
          scoreContribution: 55,
        });
      }

      // Flag Circular Ring
      if (tx.senderAccountId.startsWith('ACC-RING-')) {
        riskScore = 85;
        riskLevel = 'HIGH';
        riskFactors.push({
          ruleId: 'RULE-CIRCULAR-TRANSFER',
          ruleName: 'Directed Graph Cycle',
          description: 'Participates in 4-node closed transaction loop',
          scoreContribution: 50,
        });
      }

      // Flag Shared Device Farm
      if (tx.deviceId === 'DEV-EMULATOR-NOX-09') {
        riskScore = 78;
        riskLevel = 'HIGH';
        riskFactors.push({
          ruleId: 'RULE-SHARED-DEVICE',
          ruleName: 'Shared Hardware Fingerprint',
          description: 'Identical emulator fingerprint shared across 4 distinct accounts',
          scoreContribution: 45,
        });
      }

      // Flag CTR threshold
      if (tx.amount >= 9800 && tx.amount < 10000) {
        riskScore += 20;
        riskFactors.push({
          ruleId: 'RULE-STRUCTURING',
          ruleName: 'Potential Structuring / Smurfing',
          description: 'Transaction amount just below the $10,000 mandatory BSA threshold',
          scoreContribution: 20,
        });
      }

      if (riskScore >= 75) riskLevel = 'CRITICAL';
      else if (riskScore >= 50) riskLevel = 'HIGH';
      else if (riskScore >= 25) riskLevel = 'MEDIUM';

      return {
        ...tx,
        riskScore: Math.min(riskScore, 100),
        riskLevel,
        riskFactors,
        isFlagged: riskScore >= 50,
        ingestionBatchId: batch._id,
      };
    });

    // Clean write
    await Transaction.deleteMany({ transactionId: { $regex: /^TX-/ } });
    await Transaction.insertMany(transactionsToInsert, { ordered: false });

    batch.totalRecords = transactionsToInsert.length;
    batch.validRecords = transactionsToInsert.length;
    batch.invalidRecords = 0;
    batch.status = 'COMPLETED';
    batch.completedAt = new Date();
    await batch.save();

    return {
      batch,
      totalProcessed: transactionsToInsert.length,
      validCount: transactionsToInsert.length,
      invalidCount: 0,
      errors: [],
    };
  }

  /**
   * Ingest a batch of pre-validated or programmatically generated transactions directly.
   */
  static async ingestTransactionBatch(
    transactions: ValidatedTransaction[],
    uploadedBy: string = 'system.e2e'
  ): Promise<IngestionResult> {
    const batchId = `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const batch = new IngestionBatch({
      batchId,
      filename: 'direct-batch-stream.json',
      uploadedBy,
      status: 'PROCESSING',
    });
    await batch.save();

    const candidateIds = transactions.map((t) => t.transactionId);
    const existingTransactions = await Transaction.find(
      { transactionId: { $in: candidateIds } },
      { transactionId: 1 }
    ).lean();

    const existingIdSet = new Set(existingTransactions.map((t) => t.transactionId));
    const finalTransactionsToInsert: Partial<ITransaction>[] = [];
    const errors: IBatchError[] = [];

    for (const tx of transactions) {
      if (!tx.transactionId || !tx.senderAccountId || !tx.receiverAccountId || tx.amount <= 0 || tx.senderAccountId === tx.receiverAccountId) {
        errors.push({
          row: 0,
          column: 'transaction',
          message: 'Invalid transaction structure or constraints violated',
          value: JSON.stringify(tx),
        });
        continue;
      }

      if (existingIdSet.has(tx.transactionId)) {
        errors.push({
          row: 0,
          column: 'transaction_id',
          message: `Transaction ID '${tx.transactionId}' already exists in database`,
          value: tx.transactionId,
        });
      } else {
        existingIdSet.add(tx.transactionId);
        finalTransactionsToInsert.push({
          ...tx,
          riskScore: tx.amount >= 10000 ? 55 : 10,
          riskLevel: (tx.amount >= 10000 ? 'HIGH' : 'LOW') as RiskLevel,
          ingestionBatchId: batch._id,
        });
      }
    }

    if (finalTransactionsToInsert.length > 0) {
      await Transaction.insertMany(finalTransactionsToInsert, { ordered: false });
    }

    batch.totalRecords = transactions.length;
    batch.validRecords = finalTransactionsToInsert.length;
    batch.invalidRecords = errors.length;
    batch.validationErrors = errors.slice(0, 50);
    batch.status = finalTransactionsToInsert.length > 0 || errors.length === 0 ? 'COMPLETED' : 'FAILED';
    batch.completedAt = new Date();
    await batch.save();

    return {
      batch,
      totalProcessed: transactions.length,
      validCount: finalTransactionsToInsert.length,
      invalidCount: errors.length,
      errors,
    };
  }

  static async getBatches(limit = 20): Promise<IIngestionBatch[]> {
    return IngestionBatch.find().sort({ createdAt: -1 }).limit(limit);
  }

  static async getBatchById(batchId: string): Promise<IIngestionBatch | null> {
    return IngestionBatch.findOne({ batchId });
  }
}
