import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserType } from '../../users/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Потребна е авторизација');
    }

    if (user.type !== UserType.Admin) {
      throw new ForbiddenException('Достап е забранет. Потребни се администраторски права');
    }

    return true;
  }
}
