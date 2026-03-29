import type { Request } from 'express';

export const USER_ACTION_FAILURE_LOG_PREFIXES = [
  '/api/auth',
  '/api/users',
  '/api/listings',
  '/api/favorites',
  '/api/saved-filters',
] as const;

export function shouldLogUserActionFailure(path: string, method: string): boolean {
  const normalized = (path.split('?')[0] || path).replace(/\/$/, '') || '/';
  const matchesPrefix = USER_ACTION_FAILURE_LOG_PREFIXES.some(
    (p) => normalized === p || normalized.startsWith(`${p}/`),
  );
  if (!matchesPrefix) {
    return false;
  }
  if (method === 'GET' && normalized === '/api/listings') {
    return false;
  }
  return true;
}

export function buildUserActionFailureContext(
  request: Request,
  httpStatus: number,
  errorKey: string,
): Record<string, unknown> {
  const pathRaw = request.path.split('?')[0] || request.path;
  const pathNorm = pathRaw.replace(/\/$/, '') || '/';
  const params = request.params as Record<string, string | undefined>;
  const user = (request as Request & { user?: { id?: string } }).user;

  const payload: Record<string, unknown> = {
    outcome: 'failure',
    errorKey,
    httpStatus,
    method: request.method,
    path: pathNorm,
  };

  if (user?.id) {
    payload.userId = user.id;
  }

  const idParam = params?.id;
  if (idParam) {
    if (pathNorm.startsWith('/api/listings')) {
      payload.listingId = idParam;
    } else if (pathNorm.startsWith('/api/favorites')) {
      payload.listingId = idParam;
    } else if (pathNorm.startsWith('/api/saved-filters')) {
      payload.savedFilterId = idParam;
    } else if (pathNorm.startsWith('/api/users')) {
      payload.resourceUserId = idParam;
    }
  }

  const userIdParam = params?.userId;
  if (userIdParam && pathNorm.startsWith('/api/listings')) {
    payload.targetUserId = userIdParam;
  }

  return payload;
}
