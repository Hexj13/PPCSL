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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.ipBlockService.getClientIp(request);
    const { blocked, blockedUntil } = await this.ipBlockService.isBlocked(ip);

    if (blocked) {
      const remainingMinutes = blockedUntil
        ? Math.ceil((blockedUntil.getTime() - Date.now()) / (1000 * 60))
        : 60;
      throw new HttpException(
        {
          message: `errors.ipBlockedTooManyAttempts|${remainingMinutes}`,
          ...(blockedUntil ? { blockedUntil: blockedUntil.toISOString() } : {}),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
