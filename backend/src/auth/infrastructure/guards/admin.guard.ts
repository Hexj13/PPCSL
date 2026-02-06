import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { UserType as UserTypeEnum } from '../../../common/types';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('errors.authorizationRequired');
    }

    if (user.type !== UserTypeEnum.Admin) {
      throw new ForbiddenException('errors.accessDenied');
    }

    return true;
  }
}
