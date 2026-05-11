import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class PhoneVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { id?: string; phoneVerified?: boolean } }>();
    const principal = req.user;
    if (!principal?.id) {
      return false;
    }
    if (principal.phoneVerified !== true) {
      throw new ForbiddenException('errors.phoneVerificationRequired');
    }
    return true;
  }
}
