import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/node';
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

    const acceptLanguage = request.headers?.['accept-language'];
    const locale = this.i18nService.getLocaleFromHeader(acceptLanguage);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = this.i18nService.translate('errors.serverError', locale);
    let code: string | undefined;
    let errorKey: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorKey = this.getErrorKey(exceptionResponse);
        message = this.translateMessage(exceptionResponse, locale);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as {
          message?: string | string[];
          code?: string;
        };
        if (responseObj.message) {
          if (Array.isArray(responseObj.message)) {
            const firstMsg = responseObj.message[0];
            errorKey = typeof firstMsg === 'string' ? this.getErrorKey(firstMsg) : undefined;
            message = responseObj.message
              .map((msg) => this.translateMessage(msg, locale))
              .join('; ');
          } else {
            errorKey = this.getErrorKey(responseObj.message);
            message = this.translateMessage(responseObj.message, locale);
          }
        }
        code = responseObj.code;
      }
    } else if (exception instanceof Error) {
      const isDbConnectivity = this.isDatabaseConnectivityFailure(exception);
      if (isDbConnectivity) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        errorKey = 'errors.serviceUnavailable';
        message = this.i18nService.translate('errors.serviceUnavailable', locale);
      }

      const logLabel = isDbConnectivity ? '[db_connectivity]' : 'Unhandled exception';
      this.logger.error(
        `${logLabel}: ${exception.message} | ${request.method} ${request.url}`,
        exception.stack,
      );

      Sentry.captureException(exception, {
        tags: {
          httpStatus: status,
          httpMethod: request.method,
          httpPath: request.url,
          errorType: isDbConnectivity ? 'database_connectivity' : 'unhandled',
          errorCategory: isDbConnectivity ? 'database_connectivity' : 'application',
        },
        extra: {
          requestBody: request.body,
          queryParams: request.query,
          params: request.params,
          user: (request as { user?: { id?: string; email?: string } }).user,
        },
      });
    }

    if (status >= 500 && exception instanceof HttpException) {
      this.logger.error(
        `HTTP ${status} Error: ${message}`,
        `Path: ${request.url}`,
        `Method: ${request.method}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      Sentry.captureException(exception, {
        tags: {
          httpStatus: status,
          httpMethod: request.method,
          httpPath: request.url,
        },
        extra: {
          requestBody: request.body,
          queryParams: request.query,
          params: request.params,
          user: (request as { user?: { id?: string; email?: string } }).user,
        },
      });
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      ...(code && { code }),
      ...(errorKey && { errorKey }),
    });
  }

  private getErrorKey(message: string): string | undefined {
    if (
      typeof message !== 'string' ||
      !(message.startsWith('validation.') || message.startsWith('errors.'))
    ) {
      return undefined;
    }
    const [key] = message.split('|');
    return key;
  }

  private translateMessage(message: string, locale: string): string {
    if (message.startsWith('validation.') || message.startsWith('errors.')) {
      const [key, ...params] = message.split('|');
      let translated = this.i18nService.translate(key, locale);

      if (params.length > 0) {
        if (translated.includes('{count}')) {
          translated = translated.replace(/{count}/g, params[0]);
        }
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

  private isDatabaseConnectivityFailure(exception: Error): boolean {
    const message = exception.message.toLowerCase();

    return (
      message.includes('connection terminated due to connection timeout') ||
      message.includes('timeout exceeded when trying to connect') ||
      message.includes('connect etimedout') ||
      message.includes('econnrefused') ||
      message.includes('connect econnrefused')
    );
  }
}
