import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { ENV } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const details = ENV.NODE_ENV === 'development' ? err.details || err.stack : undefined;

  console.error(`[Error] [${code}] ${message}`, err);
  sendError(res, message, statusCode, code, details);
}
