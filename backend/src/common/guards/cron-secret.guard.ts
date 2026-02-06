import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CronSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = request.headers['x-cron-secret'];
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      throw new ForbiddenException('errors.invalidSecretKey');
    }

    return true;
  }
}
