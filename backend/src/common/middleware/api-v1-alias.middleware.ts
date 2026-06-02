import type { NextFunction, Request, Response } from 'express';

export function apiV1AliasMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.url.startsWith('/api/v1/')) {
    req.url = req.url.replace('/api/v1/', '/api/');
  }
  next();
}
