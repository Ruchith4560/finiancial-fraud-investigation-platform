import { Request, Response, NextFunction } from 'express';
import { CaseService } from '../services/caseService';

export class CaseController {
  static async createCase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const newCase = await CaseService.createCase({
        ...req.body,
        userId: user?.id || user?._id || 'investigator',
        userName: user?.fullName || user?.username || 'Investigator',
      });

      res.status(201).json({
        success: true,
        data: newCase,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCases(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, priority, search, assignedTo, page, limit, sortBy, sortOrder } = req.query;

      const result = await CaseService.getCases({
        status: status as string | undefined,
        priority: priority as string | undefined,
        search: search as string | undefined,
        assignedTo: assignedTo as string | undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCaseById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const caseDoc = await CaseService.getCaseById(id);

      res.status(200).json({
        success: true,
        data: caseDoc,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { status, reason } = req.body;
      const user = (req as any).user;

      const updated = await CaseService.updateStatus(
        id,
        status,
        reason,
        user?.id || 'investigator',
        user?.fullName || 'Investigator'
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async assignInvestigator(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { investigatorId, investigatorName } = req.body;
      const user = (req as any).user;

      const updated = await CaseService.assignInvestigator(
        id,
        investigatorId,
        investigatorName,
        user?.id || 'investigator',
        user?.fullName || 'Investigator'
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const { note } = req.body;
      const user = (req as any).user;

      const updated = await CaseService.addNote(
        id,
        note,
        user?.id || 'investigator',
        user?.fullName || 'Investigator'
      );

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await CaseService.getCaseStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
}
