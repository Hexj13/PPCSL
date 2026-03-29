import type { Logger } from '@nestjs/common';

export function logUserEvent(logger: Logger, payload: Record<string, unknown>): void {
  logger.log(JSON.stringify(payload));
}

export function logUserActionFailure(logger: Logger, payload: Record<string, unknown>): void {
  logger.warn(JSON.stringify(payload));
}
