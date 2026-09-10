import { Request, Response, NextFunction } from 'express';
import { InvestigationService } from '../services/investigationService';

export class InvestigationController {
  static async getDossier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId } = req.query;

      const dossier = await InvestigationService.getDossier((accountId as string) || '');

      res.status(200).json({
        success: true,
        data: dossier,
      });
    } catch (err) {
      next(err);
    }
  }
}
