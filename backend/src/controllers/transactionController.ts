import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { IngestionService } from '../services/ingestionService';
import { Transaction } from '../models/Transaction';
import { sendSuccess, sendError } from '../utils/response';

export class TransactionController {
  /**
   * Multipart CSV upload handler
   */
  static async uploadCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        sendError(res, 'No CSV file uploaded in request', 400, 'FILE_MISSING');
        return;
      }

      const stream = Readable.from(req.file.buffer.toString('utf-8'));
      const filename = req.file.originalname || 'upload.csv';
      const uploadedBy = req.user?.fullName || req.user?.email || 'investigator.anonymous';

      const result = await IngestionService.processCsvStream(stream, filename, uploadedBy);

      sendSuccess(res, {
        batchId: result.batch.batchId,
        filename: result.batch.filename,
        totalProcessed: result.totalProcessed,
        validCount: result.validCount,
        invalidCount: result.invalidCount,
        status: result.batch.status,
        errors: result.errors.slice(0, 50),
      }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * One-click demo dataset seeder
   */
  static async seedDemoData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uploadedBy = req.user?.fullName || 'system.demo';
      const result = await IngestionService.loadDemoDataset(uploadedBy);

      sendSuccess(res, {
        batchId: result.batch.batchId,
        filename: result.batch.filename,
        totalProcessed: result.totalProcessed,
        validCount: result.validCount,
        invalidCount: result.invalidCount,
        status: result.batch.status,
      }, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * List recent ingestion batches
   */
  static async getBatches(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batches = await IngestionService.getBatches(30);
      sendSuccess(res, { batches });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get batch error report
   */
  static async getBatchDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batchId = String(req.params.batchId);
      const batch = await IngestionService.getBatchById(batchId);
      if (!batch) {
        sendError(res, `Batch '${batchId}' not found`, 404, 'BATCH_NOT_FOUND');
        return;
      }
      sendSuccess(res, { batch });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Global transaction statistics
   */
  static async getTransactionStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await Transaction.aggregate([
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalVolume: { $sum: '$amount' },
            flaggedCount: {
              $sum: { $cond: [{ $eq: ['$isFlagged', true] }, 1, 0] },
            },
            criticalCount: {
              $sum: { $cond: [{ $eq: ['$riskLevel', 'CRITICAL'] }, 1, 0] },
            },
            highCount: {
              $sum: { $cond: [{ $eq: ['$riskLevel', 'HIGH'] }, 1, 0] },
            },
            avgAmount: { $avg: '$amount' },
          },
        },
      ]);

      const result = stats[0] || {
        totalTransactions: 0,
        totalVolume: 0,
        flaggedCount: 0,
        criticalCount: 0,
        highCount: 0,
        avgAmount: 0,
      };

      sendSuccess(res, { stats: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Search & filter transactions (Paginated)
   */
  static async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(parseInt(req.query.page as string || '1', 10), 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit as string || '50', 10), 1), 100);
      const search = (req.query.search as string || '').trim();
      const isFlagged = req.query.isFlagged;
      const riskLevel = req.query.riskLevel as string;
      const transactionType = req.query.transactionType as string;
      const minAmount = req.query.minAmount ? parseFloat(req.query.minAmount as string) : null;
      const maxAmount = req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : null;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : null;
      const sortBy = (req.query.sortBy as string || 'timestamp');
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

      const query: any = {};

      if (search) {
        query.$or = [
          { transactionId: { $regex: search, $options: 'i' } },
          { senderAccountId: { $regex: search, $options: 'i' } },
          { receiverAccountId: { $regex: search, $options: 'i' } },
          { deviceId: { $regex: search, $options: 'i' } },
          { ipAddress: { $regex: search, $options: 'i' } },
        ];
      }

      if (isFlagged !== undefined) {
        query.isFlagged = isFlagged === 'true';
      }

      if (riskLevel && riskLevel !== 'ALL') {
        query.riskLevel = riskLevel.toUpperCase();
      }

      if (transactionType && transactionType !== 'ALL') {
        query.transactionType = transactionType.toUpperCase();
      }

      if (minAmount !== null || maxAmount !== null) {
        query.amount = {};
        if (minAmount !== null && !isNaN(minAmount)) query.amount.$gte = minAmount;
        if (maxAmount !== null && !isNaN(maxAmount)) query.amount.$lte = maxAmount;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate && !isNaN(startDate.getTime())) query.timestamp.$gte = startDate;
        if (endDate && !isNaN(endDate.getTime())) query.timestamp.$lte = endDate;
      }

      const skip = (page - 1) * limit;

      const [transactions, total] = await Promise.all([
        Transaction.find(query)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .lean(),
        Transaction.countDocuments(query),
      ]);

      sendSuccess(res, {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get single transaction detail with risk breakdown
   */
  static async getTransactionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const transaction = await Transaction.findOne({
        $or: [{ _id: id }, { transactionId: id }],
      });

      if (!transaction) {
        sendError(res, `Transaction '${id}' not found`, 404, 'TRANSACTION_NOT_FOUND');
        return;
      }

      sendSuccess(res, { transaction });
    } catch (err) {
      next(err);
    }
  }
}
