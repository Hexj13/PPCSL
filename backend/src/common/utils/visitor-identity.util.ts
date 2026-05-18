import * as crypto from 'crypto';

import type { Request } from 'express';

import { getRequestClientIp } from './request-client-ip.util';

export function buildVisitorHash(req: Request): string {
  const ip = getRequestClientIp(req);
  const uaRaw = req.headers['user-agent'];
  const ua = typeof uaRaw === 'string' ? uaRaw : 'unknown';
  return crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex');
}
