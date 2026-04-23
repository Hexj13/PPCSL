import type { Request } from 'express';

export function getRequestClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedForStr =
    typeof forwardedFor === 'string'
      ? forwardedFor
      : Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : undefined;

  const realIp = req.headers['x-real-ip'];
  const realIpStr =
    typeof realIp === 'string' ? realIp : Array.isArray(realIp) ? realIp[0] : undefined;

  return (
    forwardedForStr?.split(',')[0]?.trim() ||
    realIpStr ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}
