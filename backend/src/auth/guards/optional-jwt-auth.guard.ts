import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = super.canActivate(context);
      if (result instanceof Promise) {
        return await result;
      }
      return result as boolean;
    } catch {
      return true;
    }
  }

  handleRequest<TUser = unknown>(
    err: Error | null,
    user: unknown,
    _info: unknown,
    _context: ExecutionContext,
    _status?: number,
  ): TUser {
    if (err || !user) {
      return null as TUser;
    }
    return user as TUser;
  }
}
