import { Request, Response, NextFunction } from 'express';
import { PatternService } from '../services/patternService';

export class PatternController {
  static async getPatterns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId, patternType, limit } = req.query;

      const result = await PatternService.getDetectedPatterns({
        accountId: accountId as string | undefined,
        patternType: patternType as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
