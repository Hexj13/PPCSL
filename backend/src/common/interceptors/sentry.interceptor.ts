import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Observable } from 'rxjs';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    const scope = Sentry.getCurrentScope();
    scope.setTag('httpMethod', request.method);
    scope.setTag('httpPath', request.url);
    const body = request.body as { category?: string; tire?: unknown } | undefined;
    if (body && (body.category === 'tire' || (body.tire !== undefined && body.tire !== null))) {
      scope.setTag('listingCategory', 'tire');
    }
    if (request.user) {
      scope.setUser({
        id: request.user.id,
        email: request.user.email,
      });
    }

    return next.handle();
  }
}
