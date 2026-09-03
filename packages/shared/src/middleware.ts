import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from './types';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err.stack);
  const response: ApiResponse<null> = {
    success: false,
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  };
  res.status(500).json(response);
}

export function notFoundHandler(_req: Request, res: Response): void {
  const response: ApiResponse<null> = {
    success: false,
    error: 'Not Found',
    timestamp: new Date().toISOString(),
  };
  res.status(404).json(response);
}

export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Content-Type must be application/json',
        timestamp: new Date().toISOString(),
      };
      res.status(415).json(response);
      return;
    }
  }
  next();
}
