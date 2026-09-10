import { Request, Response, NextFunction } from 'express';
import { AlertService } from '../services/alertService';
import { sendSuccess, sendError } from '../utils/response';
import { AlertStatus } from '../models/Alert';

export class AlertController {
  static async getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AlertService.getAlertQueue({
        severity: req.query.severity as string,
        status: req.query.status as string,
        accountId: req.query.accountId as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getAlertById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alertId = String(req.params.id);
      const alert = await AlertService.getAlertById(alertId);
      sendSuccess(res, { alert });
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alertId = String(req.params.id);
      const { status } = req.body;

      if (!status || !['NEW', 'IN_REVIEW', 'CASE_CREATED', 'DISMISSED'].includes(status)) {
        sendError(res, 'Valid status is required: NEW, IN_REVIEW, CASE_CREATED, DISMISSED', 400, 'INVALID_STATUS');
        return;
      }

      const updated = await AlertService.updateStatus(alertId, status as AlertStatus);
      sendSuccess(res, { alert: updated });
    } catch (err) {
      next(err);
    }
  }

  static async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AlertService.getAlertStats();
      sendSuccess(res, { stats });
    } catch (err) {
      next(err);
    }
  }

  static async syncAlerts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AlertService.syncAlerts();
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
