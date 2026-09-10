import { Request, Response, NextFunction } from 'express';
import { AIService } from '../services/aiService';

export class AIController {
  static async generateSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { targetAccountId, caseId, investigatorNotes } = req.body;
      const summary = await AIService.generateSummary(targetAccountId, caseId, investigatorNotes);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  static async attachSummaryToCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { summary } = req.body;
      const user = (req as any).user;

      const updatedCase = await AIService.attachSummaryToCase(
        id as string,
        summary,
        user?.id || user?._id || 'ANALYST',
        user?.fullName || user?.username || 'Investigator'
      );

      res.status(200).json({
        success: true,
        data: updatedCase,
      });
    } catch (err) {
      next(err);
    }
  }
}
