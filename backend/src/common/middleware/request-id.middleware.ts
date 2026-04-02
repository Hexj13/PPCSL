import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9-]{1,128}$/;

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestWithId = req as Request & { requestId?: string };
  const raw = req.headers['x-request-id'];
  const fromHeader =
    typeof raw === 'string' ? raw.trim() : Array.isArray(raw) ? (raw[0]?.trim() ?? '') : '';
  const normalized = fromHeader.slice(0, 128);
  const id = REQUEST_ID_PATTERN.test(normalized) ? normalized : randomUUID();
  requestWithId.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
