import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  meta: {
    timestamp: string;
    [key: string]: any;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta: Record<string, any> = {}
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  code = 'BAD_REQUEST',
  details?: any
): void {
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  res.status(statusCode).json(response);
}
