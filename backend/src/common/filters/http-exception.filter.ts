import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { I18nService } from '../i18n/i18n.service';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly i18nService: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const locale = this.i18nService.getLocaleFromHeader(request.headers?.['accept-language']);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = this.i18nService.translate('errors.serverError', locale);

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = this.translateMessage(exceptionResponse, locale);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as { message?: string | string[] };
        if (responseObj.message) {
          if (Array.isArray(responseObj.message)) {
            message = responseObj.message
              .map((msg) => this.translateMessage(msg, locale))
              .join('; ');
          } else {
            message = this.translateMessage(responseObj.message, locale);
          }
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error: ${message}`,
        `Path: ${request.url}`,
        `Method: ${request.method}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }

  private translateMessage(message: string, locale: string): string {
    if (message.startsWith('validation.') || message.startsWith('errors.')) {
      return this.i18nService.translate(message, locale);
    }
    return message;
  }
}
