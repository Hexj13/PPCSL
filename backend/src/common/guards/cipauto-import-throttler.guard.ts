import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class CipautoImportThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request || request.method !== 'POST') return false;

    const url = String(request.originalUrl ?? request.url ?? '');
    if (!url.includes('/api/upload/image') && !url.includes('/api/upload/video/from-url')) {
      return false;
    }

    const expectedSecret = process.env.CIPAUTO_IMPORT_SECRET?.trim();
    if (!expectedSecret) return false;

    const headerValue = request.headers['x-import-secret'];
    const receivedSecret = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (typeof receivedSecret !== 'string' || receivedSecret !== expectedSecret) return false;

    const controllerName = context.getClass()?.name;
    const handlerName = context.getHandler()?.name;
    if (controllerName === 'UploadController' && handlerName === 'uploadImage') {
      return true;
    }
    return controllerName === 'ListingVideoImportController' && handlerName === 'importFromUrl';
  }
}
