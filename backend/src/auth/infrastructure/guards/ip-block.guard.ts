import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import { IpBlockService } from '../services/ip-block.service';

@Injectable()
export class IpBlockGuard implements CanActivate {
  constructor(private ipBlockService: IpBlockService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = this.ipBlockService.getClientIp(request);
    const { blocked, blockedUntil } = this.ipBlockService.isBlocked(ip);

    if (blocked && blockedUntil) {
      const remainingMinutes = Math.ceil((blockedUntil.getTime() - Date.now()) / (1000 * 60));
      throw new HttpException(
        {
          message: `errors.ipBlockedTooManyAttempts|${remainingMinutes}`,
          blockedUntil: blockedUntil.toISOString(),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
