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

    const envLocale = process.env.DEFAULT_LOCALE?.toLowerCase();
    const locale = envLocale && ['mk', 'en'].includes(envLocale) ? envLocale : 'mk';

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
      const [key, ...params] = message.split('|');
      let translated = this.i18nService.translate(key, locale);

      if (params.length > 0) {
        if (translated.includes('{max}')) {
          translated = translated.replace(/{max}/g, params[0]);
        }
        if (translated.includes('{error}')) {
          translated = translated.replace('{error}', params[0]);
        }
        if (translated.includes('{brand}')) {
          translated = translated.replace('{brand}', params[0]);
        }
      }

      return translated;
    }
    return message;
  }
}
