import { Request, Response, NextFunction } from 'express';
import { GraphService } from '../services/graphService';

export class GraphController {
  static async getSubgraph(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId, hops, maxNodes, includeDevices } = req.query;

      const result = await GraphService.getSubgraph({
        rootAccountId: (accountId as string) || '',
        hops: hops ? parseInt(hops as string, 10) : undefined,
        maxNodes: maxNodes ? parseInt(maxNodes as string, 10) : undefined,
        includeDevices: includeDevices !== 'false',
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
